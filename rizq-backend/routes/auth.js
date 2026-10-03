/**
 * /api/auth — تسجيل/دخول المشتري السريع (Guest Gate)
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const Buyer = require('../models/buyer');
const { consumeBuyerVerificationByEmail } = require('../services/otpService');
const { asyncHandler, sendError } = require('../middleware/errors');
const { extractBuyerCredentials, requireBuyerAuth } = require('../middleware/buyerAuth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'عدد كبير جداً من المحاولات — حاول مرة أخرى بعد قليل', code: 'RATE_LIMIT' },
});

/** POST /api/auth/register — تسجيل = دخول بعد OTP بالبريد */
router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  if (!email) return sendError(res, 400, 'البريد الإلكتروني مطلوب', 'EMAIL_REQUIRED');
  const ver = consumeBuyerVerificationByEmail(email);
  if (!ver.ok) return sendError(res, 403, ver.message, ver.error);
  const result = Buyer.registerOrLogin(body);
  res.status(result.created ? 201 : 200).json({
    ok: true,
    buyer: result.buyer,
    token: result.token,
    created: result.created,
  });
}));

/** GET /api/auth/preview — لا يكشف وجود الحساب (تخفيف تعداد البريد/الهاتف) */
router.get('/preview', authLimiter, asyncHandler(async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (email && Buyer.EMAIL_RE.test(email)) {
    // لا نستعلم قاعدة البيانات — نفس الرد دائماً
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
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, buyer: result.buyer, token: result.token });
  } catch (err) {
    const status = err.status || 401;
    return sendError(res, status, err.message || 'بيانات الدخول غير صحيحة', err.code || 'INVALID');
  }
}));

/** GET /api/auth/me — التحقق من الجلسة */
router.get('/me', asyncHandler(async (req, res) => {
  const { id, token } = extractBuyerCredentials(req);
  if (!id || !token) return sendError(res, 400, 'id و token مطلوبان', 'AUTH_REQUIRED');
  const row = Buyer.findByIdAndToken(id, token);
  if (!row) return sendError(res, 401, 'unauthorized', 'UNAUTHORIZED');
  res.json({ ok: true, buyer: Buyer.publicBuyer(row) });
}));

/** POST /api/auth/logout — للتوافق المستقبلي */
router.post('/logout', requireBuyerAuth, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
