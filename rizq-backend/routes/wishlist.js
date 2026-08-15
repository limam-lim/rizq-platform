/**
 * /api/wishlist — مزامنة مفضلة المشتري مع SQLite
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const Wishlist = require('../models/wishlist');
const { asyncHandler, sendError } = require('../middleware/errors');
const { requireBuyerAuth } = require('../middleware/buyerAuth');

const router = express.Router();

const wishlistLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'عدد كبير جداً من الطلبات', code: 'RATE_LIMIT' },
});

router.use(wishlistLimiter);
router.use(requireBuyerAuth);

/** GET /api/wishlist — قائمة معرّفات المفضلة */
router.get('/', asyncHandler(async (req, res) => {
  const ids = Wishlist.listIds(req.buyer.id);
  res.json({ ok: true, ids, count: ids.length });
}));

/** PUT /api/wishlist — استبدال كامل { ids: [...] } */
router.put('/', asyncHandler(async (req, res) => {
  const ids = Wishlist.replaceAll(req.buyer.id, (req.body || {}).ids);
  res.json({ ok: true, ids, count: ids.length });
}));

/** POST /api/wishlist/sync — دمج مع القائمة المحلية { ids: [...] } */
router.post('/sync', asyncHandler(async (req, res) => {
  const ids = Wishlist.mergeIds(req.buyer.id, (req.body || {}).ids);
  res.json({ ok: true, ids, count: ids.length, merged: true });
}));

/** POST /api/wishlist/:itemId — إضافة عنصر */
router.post('/:itemId', asyncHandler(async (req, res) => {
  const ids = Wishlist.addItem(req.buyer.id, req.params.itemId);
  res.status(201).json({ ok: true, ids, count: ids.length });
}));

/** DELETE /api/wishlist/:itemId — حذف عنصر */
router.delete('/:itemId', asyncHandler(async (req, res) => {
  const ids = Wishlist.removeItem(req.buyer.id, req.params.itemId);
  res.json({ ok: true, ids, count: ids.length });
}));

module.exports = router;
