/**
 * /api/auth/passkey — تسجيل ودخول Passkeys (مشتري + بائع)
 */
'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const Buyer = require('../models/buyer');
const Passkey = require('../models/passkey');
const WebAuthn = require('../services/webauthnService');
const { asyncHandler, sendError } = require('../middleware/errors');
const { extractBuyerCredentials, requireBuyerAuth } = require('../middleware/buyerAuth');
const {
  setBuyerSessionCookie,
} = require('../lib/buyerCookie');
const {
  isProdEnv,
  extractAccountToken,
  extractDashToken,
  tokenMatchesAccount,
  isAccountActive,
} = require('../middleware/accountAuth');

const router = express.Router();

const passkeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'محاولات كثيرة — حاول لاحقاً', code: 'RATE_LIMIT' },
});

function normalizeKind(raw) {
  const k = String(raw || '').trim().toLowerCase();
  if (k === 'buyer' || k === 'seller' || k === 'any') return k;
  return '';
}

/** يُحقَن من server.js لوصول accounts.json */
let _deps = {
  readAccounts: () => [],
  writeAccounts: () => {},
  genDashToken: () => 'TK_' + crypto.randomBytes(16).toString('hex'),
  genAccessToken: null,
  stripToken: (a) => a,
};

function configurePasskeyRoutes(deps) {
  if (deps && typeof deps === 'object') {
    _deps = Object.assign({}, _deps, deps);
  }
}

function findSellerByEmail(email) {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return null;
  const list = _deps.readAccounts() || [];
  return list.find((a) => String(a.email || '').trim().toLowerCase() === em) || null;
}

function findSellerById(id) {
  const list = _deps.readAccounts() || [];
  return list.find((a) => a && a.id === id) || null;
}

function requireSellerOwner(req, accountId) {
  const acc = findSellerById(accountId);
  if (!acc || !isAccountActive(acc)) return null;
  const token = extractAccountToken(req) || extractDashToken(req);
  if (!token || !tokenMatchesAccount(acc, token)) return null;
  return acc;
}

function issueBuyerSession(row) {
  const token = Buyer.genBuyerToken ? Buyer.genBuyerToken() : crypto.randomBytes(20).toString('hex');
  const now = new Date().toISOString();
  try {
    require('../db').db.prepare(
      'UPDATE buyers SET token = ?, last_login_at = ? WHERE id = ?'
    ).run(token, now, row.id);
  } catch (e) {
    /* keep old token if update fails */
  }
  const fresh = Buyer.findById(row.id) || row;
  return { buyer: Buyer.publicBuyer(fresh), token: fresh.token || token };
}

function sellerSessionPayload(acc) {
  const list = _deps.readAccounts();
  const idx = list.findIndex((a) => a.id === acc.id);
  let row = acc;
  if (!row.dashToken && typeof _deps.genDashToken === 'function') {
    row = Object.assign({}, row, { dashToken: _deps.genDashToken() });
    if (idx >= 0) {
      list[idx].dashToken = row.dashToken;
      _deps.writeAccounts(list);
    }
  }
  const {
    accessToken, passHash: _ph, dashToken, idImage, licenseImage, id_image,
    activityImage2, activity_image2, receiptImage, password, ...safeFields
  } = row;
  return Object.assign({}, safeFields, {
    accessToken,
    dashToken,
    token: dashToken,
  });
}

function attachBuyer(res, session) {
  setBuyerSessionCookie(res, session.buyer.id, session.token);
  res.set('Cache-Control', 'no-store');
  const payload = {
    ok: true,
    kind: 'buyer',
    buyer: session.buyer,
    cookieAuth: true,
  };
  if (!isProdEnv()) payload.token = session.token;
  return payload;
}

/** POST /register-options — يتطلب جلسة مشترٍ أو بائع */
router.post('/register-options', passkeyLimiter, asyncHandler(async (req, res) => {
  const kind = normalizeKind((req.body || {}).kind) || 'buyer';
  if (kind !== 'buyer' && kind !== 'seller') {
    return sendError(res, 400, 'kind يجب أن يكون buyer أو seller', 'INVALID_KIND');
  }

  if (kind === 'buyer') {
    const { id, token } = extractBuyerCredentials(req);
    if (!id || !token) return sendError(res, 401, 'سجّل الدخول أولاً لتفعيل Passkey', 'AUTH_REQUIRED');
    const row = Buyer.findByIdAndToken(id, token);
    if (!row) return sendError(res, 401, 'جلسة غير صالحة', 'UNAUTHORIZED');
    const { options } = await WebAuthn.buildRegistrationOptions({
      kind: 'buyer',
      userId: row.id,
      userName: row.email || row.phone || row.id,
      displayName: row.name || row.email || 'مشتري رزق',
      req,
    });
    return res.json({ ok: true, kind: 'buyer', options });
  }

  const accountId = String((req.body || {}).accountId || '').trim();
  if (!accountId) return sendError(res, 400, 'accountId مطلوب', 'MISSING_ACCOUNT');
  const acc = requireSellerOwner(req, accountId);
  if (!acc) return sendError(res, 401, 'جلسة البائع غير صالحة', 'UNAUTHORIZED');
  const { options } = await WebAuthn.buildRegistrationOptions({
    kind: 'seller',
    userId: acc.id,
    userName: acc.email || acc.id,
    displayName: acc.name || acc.owner || acc.manager || 'بائع رزق',
    req,
  });
  return res.json({ ok: true, kind: 'seller', options });
}));

/** POST /verify-registration */
router.post('/verify-registration', passkeyLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const kind = normalizeKind(body.kind) || 'buyer';
  const response = body.response || body.credential || body;
  const friendlyName = String(body.friendlyName || body.name || '').slice(0, 80);

  let userId = '';
  if (kind === 'buyer') {
    const { id, token } = extractBuyerCredentials(req);
    if (!id || !token) return sendError(res, 401, 'جلسة مطلوبة', 'AUTH_REQUIRED');
    const row = Buyer.findByIdAndToken(id, token);
    if (!row) return sendError(res, 401, 'جلسة غير صالحة', 'UNAUTHORIZED');
    userId = row.id;
  } else if (kind === 'seller') {
    const accountId = String(body.accountId || '').trim();
    const acc = requireSellerOwner(req, accountId);
    if (!acc) return sendError(res, 401, 'جلسة البائع غير صالحة', 'UNAUTHORIZED');
    userId = acc.id;
  } else {
    return sendError(res, 400, 'kind غير صالح', 'INVALID_KIND');
  }

  try {
    const result = await WebAuthn.verifyRegistration({
      kind,
      userId,
      response,
      friendlyName,
      req,
    });
    res.set('Cache-Control', 'no-store');
    return res.status(201).json({
      ok: true,
      kind,
      passkey: result.passkey,
      count: Passkey.countByUser(kind, userId),
    });
  } catch (err) {
    return sendError(res, err.status || 400, err.message || 'فشل التسجيل', err.code || 'REGISTER_FAILED');
  }
}));

/** POST /login-options */
router.post('/login-options', passkeyLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  let kind = normalizeKind(body.kind) || 'any';
  const email = String(body.email || '').trim().toLowerCase();

  if (email && (kind === 'seller' || kind === 'any')) {
    const acc = findSellerByEmail(email);
    if (acc && isAccountActive(acc) && Passkey.countByUser('seller', acc.id) > 0) {
      const { options } = await WebAuthn.buildLoginOptionsForUser({
        kind: 'seller',
        userId: acc.id,
        req,
      });
      return res.json({ ok: true, kind: 'seller', options });
    }
  }

  if (email && (kind === 'buyer' || kind === 'any')) {
    const buyer = Buyer.findByEmail(email);
    if (buyer && Passkey.countByUser('buyer', buyer.id) > 0) {
      const { options } = await WebAuthn.buildLoginOptionsForUser({
        kind: 'buyer',
        userId: buyer.id,
        req,
      });
      return res.json({ ok: true, kind: 'buyer', options });
    }
  }

  // Discoverable credentials (بدون بريد) — يعمل إن كان المفتاح resident
  const { options } = await WebAuthn.buildLoginOptions({ kind, email: '', req });
  return res.json({ ok: true, kind: kind === 'any' ? 'any' : kind, options, discoverable: true });
}));

/** POST /verify-login */
router.post('/verify-login', passkeyLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const response = body.response || body.credential || body;
  try {
    const result = await WebAuthn.verifyLogin({ response, req });
    if (result.userKind === 'buyer') {
      const row = Buyer.findById(result.userId);
      if (!row) return sendError(res, 401, 'حساب المشتري غير موجود', 'USER_NOT_FOUND');
      const session = issueBuyerSession(row);
      return res.json(attachBuyer(res, session));
    }
    if (result.userKind === 'seller') {
      const acc = findSellerById(result.userId);
      if (!acc || !isAccountActive(acc)) {
        return sendError(res, 403, 'حساب البائع غير متاح', 'SELLER_INACTIVE');
      }
      res.set('Cache-Control', 'no-store');
      return res.json({
        ok: true,
        kind: 'seller',
        account: sellerSessionPayload(acc),
      });
    }
    return sendError(res, 400, 'نوع مستخدم غير معروف', 'UNKNOWN_KIND');
  } catch (err) {
    return sendError(res, err.status || 401, err.message || 'فشل الدخول', err.code || 'LOGIN_FAILED');
  }
}));

/** GET /list — قائمة مفاتيح الجلسة الحالية */
router.get('/list', passkeyLimiter, asyncHandler(async (req, res) => {
  const kind = normalizeKind(req.query.kind) || 'buyer';
  if (kind === 'buyer') {
    const { id, token } = extractBuyerCredentials(req);
    if (!id || !token) return sendError(res, 401, 'جلسة مطلوبة', 'AUTH_REQUIRED');
    const row = Buyer.findByIdAndToken(id, token);
    if (!row) return sendError(res, 401, 'جلسة غير صالحة', 'UNAUTHORIZED');
    return res.json({ ok: true, kind: 'buyer', passkeys: Passkey.listByUser('buyer', row.id) });
  }
  const accountId = String(req.query.accountId || '').trim();
  const acc = requireSellerOwner(req, accountId);
  if (!acc) return sendError(res, 401, 'جلسة البائع غير صالحة', 'UNAUTHORIZED');
  return res.json({ ok: true, kind: 'seller', passkeys: Passkey.listByUser('seller', acc.id) });
}));

/** DELETE /:id */
router.delete('/:id', passkeyLimiter, asyncHandler(async (req, res) => {
  const pkId = String(req.params.id || '').trim();
  const kind = normalizeKind((req.body || {}).kind || req.query.kind) || 'buyer';
  if (kind === 'buyer') {
    const { id, token } = extractBuyerCredentials(req);
    if (!id || !token) return sendError(res, 401, 'جلسة مطلوبة', 'AUTH_REQUIRED');
    const row = Buyer.findByIdAndToken(id, token);
    if (!row) return sendError(res, 401, 'جلسة غير صالحة', 'UNAUTHORIZED');
    const ok = Passkey.removeById(pkId, 'buyer', row.id);
    if (!ok) return sendError(res, 404, 'المفتاح غير موجود', 'NOT_FOUND');
    return res.json({ ok: true });
  }
  const accountId = String((req.body || {}).accountId || req.query.accountId || '').trim();
  const acc = requireSellerOwner(req, accountId);
  if (!acc) return sendError(res, 401, 'جلسة البائع غير صالحة', 'UNAUTHORIZED');
  const ok = Passkey.removeById(pkId, 'seller', acc.id);
  if (!ok) return sendError(res, 404, 'المفتاح غير موجود', 'NOT_FOUND');
  return res.json({ ok: true });
}));

/** هل الجهاز يدعم / حالة عامة */
router.get('/config', (req, res) => {
  const rp = WebAuthn.resolveRp(req);
  res.json({
    ok: true,
    passkeys: true,
    rpID: rp.rpID,
    rpName: rp.rpName,
  });
});

module.exports = router;
module.exports.configurePasskeyRoutes = configurePasskeyRoutes;
