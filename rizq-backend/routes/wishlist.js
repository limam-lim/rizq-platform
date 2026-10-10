/**
 * /api/wishlist — مزامنة مفضلة المشتري (SQLite أو PostgreSQL)
 */
const express = require('express');
const { createLimiter } = require('../lib/rateLimitRedis');
const Wishlist = require('../models/wishlist');
const { asyncHandler } = require('../middleware/errors');
const { requireBuyerAuth } = require('../middleware/buyerAuth');

const router = express.Router();

const wishlistLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'عدد كبير جداً من الطلبات', code: 'RATE_LIMIT' },
});

router.use(wishlistLimiter);
router.use(requireBuyerAuth);

router.get('/', asyncHandler(async (req, res) => {
  const ids = Wishlist.listIds(req.buyer.id);
  res.json({ ok: true, ids, count: ids.length });
}));

router.put('/', asyncHandler(async (req, res) => {
  const ids = Wishlist.replaceAll(req.buyer.id, (req.body || {}).ids);
  res.json({ ok: true, ids, count: ids.length });
}));

router.post('/sync', asyncHandler(async (req, res) => {
  const ids = Wishlist.mergeIds(req.buyer.id, (req.body || {}).ids);
  res.json({ ok: true, ids, count: ids.length, merged: true });
}));

router.post('/:itemId', asyncHandler(async (req, res) => {
  const ids = Wishlist.addItem(req.buyer.id, req.params.itemId);
  res.status(201).json({ ok: true, ids, count: ids.length });
}));

router.delete('/:itemId', asyncHandler(async (req, res) => {
  const ids = Wishlist.removeItem(req.buyer.id, req.params.itemId);
  res.json({ ok: true, ids, count: ids.length });
}));

module.exports = router;
