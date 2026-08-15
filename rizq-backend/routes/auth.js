/**
 * /api/auth — تسجيل/دخول المشتري السريع (Guest Gate)
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const Buyer = require('../models/buyer');
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

/** POST /api/auth/register — تسجيل = دخول (name + phone + email?) */
router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const result = Buyer.registerOrLogin(req.body || {});
  res.status(result.created ? 201 : 200).json({
    ok: true,
    buyer: result.buyer,
    token: result.token,
    created: result.created,
  });
}));

/** POST /api/auth/login — دخول برقم الهاتف فقط */
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const phone = (req.body || {}).phone;
  if (!phone) return sendError(res, 400, 'رقم الهاتف مطلوب', 'PHONE_REQUIRED');
  const result = Buyer.loginByPhone(phone);
  res.json({ ok: true, buyer: result.buyer, token: result.token });
}));

/** GET /api/auth/me — التحقق من الجلسة */
router.get('/me', asyncHandler(async (req, res) => {
  const { id, token } = extractBuyerCredentials(req);
  if (!id || !token) return sendError(res, 400, 'id و token مطلوبان', 'AUTH_REQUIRED');
  const row = Buyer.findByIdAndToken(id, token);
  if (!row) return sendError(res, 401, 'unauthorized', 'UNAUTHORIZED');
  res.json({ ok: true, buyer: Buyer.publicBuyer(row) });
}));

/** POST /api/auth/logout — للتوافق المستقبلي (التوكن stateless حالياً) */
router.post('/logout', requireBuyerAuth, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
