/**
 * /api/push — اشتراكات Web Push (مشتري / بائع)
 */
'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const Push = require('../models/pushSubscription');
const Buyer = require('../models/buyer');
const { asyncHandler, sendError } = require('../middleware/errors');
const { extractBuyerCredentials } = require('../middleware/buyerAuth');
const {
  extractAccountToken,
  extractDashToken,
  tokenMatchesAccount,
  isAccountActive,
} = require('../middleware/accountAuth');

const router = express.Router();

const pushLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'محاولات كثيرة', code: 'RATE_LIMIT' },
});

let _deps = { readAccounts: () => [] };

function configurePushRoutes(deps) {
  if (deps) _deps = Object.assign({}, _deps, deps);
}

function requireBuyer(req, res) {
  const { id, token } = extractBuyerCredentials(req);
  if (!id || !token) {
    sendError(res, 401, 'جلسة المشتري مطلوبة', 'AUTH_REQUIRED');
    return null;
  }
  const row = Buyer.findByIdAndToken(id, token);
  if (!row) {
    sendError(res, 401, 'جلسة غير صالحة', 'UNAUTHORIZED');
    return null;
  }
  return row;
}

function requireSeller(req, res, sellerId) {
  const accList = _deps.readAccounts() || [];
  const acc = accList.find((a) => a && a.id === sellerId);
  if (!acc || !isAccountActive(acc)) {
    sendError(res, 401, 'حساب البائع غير متاح', 'SELLER_INACTIVE');
    return null;
  }
  const token = extractAccountToken(req) || extractDashToken(req);
  if (!token || !tokenMatchesAccount(acc, token)) {
    sendError(res, 401, 'توكن البائع غير صالح', 'UNAUTHORIZED');
    return null;
  }
  return acc;
}

/** GET /vapid-public-key */
router.get('/vapid-public-key', pushLimiter, (req, res) => {
  const key = Push.getPublicKey();
  if (!key) {
    return res.status(503).json({ ok: false, error: 'إشعارات الدفع غير مفعّلة', code: 'VAPID_MISSING' });
  }
  res.json({ ok: true, publicKey: key });
});

/** POST /subscribe */
router.post('/subscribe', pushLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const kind = String(body.userKind || body.kind || 'buyer').toLowerCase();
  let userId = '';

  if (kind === 'buyer') {
    const buyer = requireBuyer(req, res);
    if (!buyer) return;
    userId = buyer.id;
  } else if (kind === 'seller') {
    userId = String(body.userId || body.sellerId || body.accountId || '').trim();
    if (!userId) return sendError(res, 400, 'معرف البائع مطلوب', 'MISSING_SELLER');
    const acc = requireSeller(req, res, userId);
    if (!acc) return;
  } else {
    return sendError(res, 400, 'نوع المستخدم غير صالح', 'INVALID_KIND');
  }

  try {
    const id = Push.upsert({
      userKind: kind,
      userId,
      subscription: body.subscription || body,
      userAgent: req.get('user-agent') || '',
    });
    res.json({ ok: true, id });
  } catch (err) {
    return sendError(res, err.status || 400, err.message, err.code || 'SUBSCRIBE_FAILED');
  }
}));

/** POST /unsubscribe */
router.post('/unsubscribe', pushLimiter, asyncHandler(async (req, res) => {
  const endpoint = String((req.body || {}).endpoint || '').trim();
  if (!endpoint) return sendError(res, 400, 'endpoint مطلوب', 'MISSING_ENDPOINT');
  Push.removeEndpoint(endpoint);
  res.json({ ok: true });
}));

/** GET /mine — قائمة اشتراكات المستخدم الحالي */
router.get('/mine', pushLimiter, asyncHandler(async (req, res) => {
  const kind = String(req.query.kind || 'buyer').toLowerCase();
  if (kind === 'buyer') {
    const buyer = requireBuyer(req, res);
    if (!buyer) return;
    return res.json({ ok: true, subscriptions: Push.listByUser('buyer', buyer.id) });
  }
  const sellerId = String(req.query.sellerId || req.query.accountId || '').trim();
  if (!sellerId) return sendError(res, 400, 'sellerId مطلوب', 'MISSING_SELLER');
  const acc = requireSeller(req, res, sellerId);
  if (!acc) return;
  res.json({ ok: true, subscriptions: Push.listByUser('seller', sellerId) });
}));

module.exports = router;
module.exports.configurePushRoutes = configurePushRoutes;
