/**
 * /api/auth — تسجيل/دخول المشتري السريع (Guest Gate)
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const Buyer = require('../models/buyer');
const { consumeBuyerVerificationByEmail } = require('../services/otpService');
const { asyncHandler, sendError } = require('../middleware/errors');
const { extractBuyerCredentials, requireBuyerAuth } = require('../middleware/buyerAuth');
const {
  setBuyerSessionCookie,
  clearBuyerSessionCookie,
} = require('../lib/buyerCookie');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'عدد كبير جداً من المحاولات — حاول مرة أخرى بعد قليل', code: 'RATE_LIMIT' },
});

function attachBuyerSession(res, result) {
  if (!result || !result.buyer || !result.token) return;
  setBuyerSessionCookie(res, result.buyer.id, result.token);
  res.set('Cache-Control', 'no-store');
}

/** POST /api/auth/register — تسجيل = دخول بعد OTP بالبريد */
router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return sendError(res, 400, 'البريد الإلكتروني مطلوب', 'EMAIL_REQUIRED');
  const ver = consumeBuyerVerificationByEmail(email);
  if (!ver.ok) return sendError(res, 403, ver.message, ver.error);
  const result = Buyer.registerOrLogin(body);
  attachBuyerSession(res, result);
  // لا نُرجع التوكن في JSON بالإنتاج — الكوكي HttpOnly يكفي
  const payload = {
    ok: true,
    buyer: result.buyer,
    created: result.created,
    cookieAuth: true,
  };
  if (!require('../middleware/accountAuth').isProdEnv()) {
    payload.token = result.token;
  }
  res.status(result.created ? 201 : 200).json(payload);
}));

/** GET /api/auth/preview — لا يكشف وجود الحساب (تخفيف تعداد البريد/الهاتف) */
router.get('/preview', authLimiter, asyncHandler(async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (email && Buyer.EMAIL_RE.test(email)) {
    return res.json({ ok: true, exists: null, check: 'accepted' });
  }
  const phone = Buyer.normalizePhone(req.query.phone);
  if (!Buyer.MR_PHONE_RE.test(phone)) {
    return res.json({ ok: true, exists: null, check: 'invalid' });
  }
  return res.json({ ok: true, exists: null, check: 'accepted' });
}));

/** POST /api/auth/login — دخول المشتري بالبريد وكلمة المرور (بعد تفعيل OTP مرة واحدة) */
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) {
    return sendError(res, 400, 'البريد وكلمة المرور مطلوبان', 'MISSING_CREDENTIALS');
  }
  try {
    const result = await Buyer.loginByEmailPassword(email, password);
    attachBuyerSession(res, result);
    const payload = {
      ok: true,
      buyer: result.buyer,
      cookieAuth: true,
    };
    if (!require('../middleware/accountAuth').isProdEnv()) {
      payload.token = result.token;
    }
    res.json(payload);
  } catch (err) {
    const status = err.status || 401;
    return sendError(res, status, err.message || 'بيانات الدخول غير صحيحة', err.code || 'INVALID');
  }
}));

/** GET /api/auth/me — التحقق من الجلسة (كوكي أو رأس) */
router.get('/me', asyncHandler(async (req, res) => {
  const { id, token } = extractBuyerCredentials(req);
  if (!id || !token) return sendError(res, 401, 'جلسة مطلوبة', 'AUTH_REQUIRED');
  const row = Buyer.findByIdAndToken(id, token);
  if (!row) {
    clearBuyerSessionCookie(res);
    return sendError(res, 401, 'unauthorized', 'UNAUTHORIZED');
  }
  // جدّد الكوكي إن وصلت المصادقة بالرأس فقط (ترحيل من localStorage)
  setBuyerSessionCookie(res, row.id, row.token);
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, buyer: Buyer.publicBuyer(row), cookieAuth: true });
}));

/** POST /api/auth/logout — إبطال الكوكي وتدوير التوكن */
router.post('/logout', (req, res) => {
  const { id, token } = extractBuyerCredentials(req);
  if (id && token) {
    const row = Buyer.findByIdAndToken(id, token);
    if (row) {
      try {
        const crypto = require('crypto');
        const next = crypto.randomBytes(20).toString('hex');
        const now = new Date().toISOString();
        require('../db').db.prepare('UPDATE buyers SET token = ?, last_login_at = ? WHERE id = ?')
          .run(next, now, row.id);
      } catch (eRot) {}
    }
  }
  clearBuyerSessionCookie(res);
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true });
});

module.exports = router;
