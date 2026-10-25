/**
 * /api/orders — دورة حياة الطلبات
 */
'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const Order = require('../models/order');
const Buyer = require('../models/buyer');
const { asyncHandler, sendError } = require('../middleware/errors');
const { extractBuyerCredentials } = require('../middleware/buyerAuth');
const {
  extractAccountToken,
  extractDashToken,
  tokenMatchesAccount,
  isAccountActive,
} = require('../middleware/accountAuth');
const Notify = require('../services/notificationService');

const router = express.Router();

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'محاولات كثيرة', code: 'RATE_LIMIT' },
});

let _deps = { readAccounts: () => [], requireAdminPermission: null };

function configureOrderRoutes(deps) {
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

function buyerProfileFromRow(row, order) {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    phoneIntl: row.phone_intl,
    whatsapp: row.whatsapp,
    name: row.name,
    lang: 'ar',
  };
}

async function fireBuyerNotify(order, status) {
  try {
    const row = Buyer.findById(order.buyerId);
    await Notify.notifyBuyerOrderStatus(order, status, row ? buyerProfileFromRow(row, order) : null);
  } catch (e) {
    console.warn('[orders/notify]', e.message);
  }
}

/** POST / — إنشاء طلب */
router.post('/', orderLimiter, asyncHandler(async (req, res) => {
  const buyer = requireBuyer(req, res);
  if (!buyer) return;
  const body = req.body || {};
  try {
    const order = Order.createOrder({
      buyerId: buyer.id,
      sellerId: body.sellerId || body.storeId || body.accountId,
      sellerType: body.sellerType || 'store',
      items: body.items || body.cart || [],
      paymentMethod: body.paymentMethod || 'cod',
      paymentReference: body.paymentReference || body.payment_reference || '',
      paymentReceipt: body.paymentReceipt || body.receipt || '',
      deliveryFee: body.deliveryFee,
      discount: body.discount,
      currency: body.currency || 'MRU',
      deliveryType: body.deliveryType || 'delivery',
      delivery: body.delivery || {
        name: body.name,
        phone: body.phone,
        wilaya: body.wilaya || body.city,
        district: body.district,
        address: body.address,
        notes: body.notes || body.deliveryNotes,
      },
      buyerNote: body.buyerNote || body.note || '',
      driverNotes: body.driverNotes || '',
    });
    res.status(201).json({ ok: true, order });
    fireBuyerNotify(order, 'new');
  } catch (err) {
    return sendError(res, err.status || 400, err.message || 'تعذّر إنشاء الطلب', err.code || 'CREATE_FAILED');
  }
}));

/** GET /buyer */
router.get('/buyer', orderLimiter, asyncHandler(async (req, res) => {
  const buyer = requireBuyer(req, res);
  if (!buyer) return;
  const orders = Order.listByBuyer(buyer.id, {
    limit: Number(req.query.limit) || 40,
    offset: Number(req.query.offset) || 0,
  });
  res.json({ ok: true, orders });
}));

/** GET /seller?sellerId= */
router.get('/seller', orderLimiter, asyncHandler(async (req, res) => {
  const sellerId = String(req.query.sellerId || req.query.accountId || '').trim();
  if (!sellerId) return sendError(res, 400, 'sellerId مطلوب', 'MISSING_SELLER');
  const acc = requireSeller(req, res, sellerId);
  if (!acc) return;
  const orders = Order.listBySeller(sellerId, {
    status: req.query.status || '',
    limit: Number(req.query.limit) || 50,
    offset: Number(req.query.offset) || 0,
  });
  res.json({ ok: true, orders });
}));

/** GET /metrics/seller?sellerId= */
router.get('/metrics/seller', orderLimiter, asyncHandler(async (req, res) => {
  const sellerId = String(req.query.sellerId || '').trim();
  if (!sellerId) return sendError(res, 400, 'sellerId مطلوب', 'MISSING_SELLER');
  const acc = requireSeller(req, res, sellerId);
  if (!acc) return;
  res.json({ ok: true, metrics: Order.sellerMetrics(sellerId) });
}));

/** GET /metrics/admin */
router.get('/metrics/admin', orderLimiter, asyncHandler(async (req, res) => {
  if (typeof _deps.requireAdminPermission === 'function') {
    // يُحمى عبر mount بطبقة الأدمن إن وُجدت — هنا فحص بسيط للجلسة الإدارية عبر header
  }
  const adminToken = String(req.header('x-admin-token') || req.header('x-rizq-admin') || '').trim();
  if (!adminToken && process.env.NODE_ENV === 'production') {
    return sendError(res, 401, 'صلاحية إدارية مطلوبة', 'ADMIN_REQUIRED');
  }
  res.json({ ok: true, metrics: Order.adminMetrics() });
}));

/** GET /admin/disputed */
router.get('/admin/disputed', orderLimiter, asyncHandler(async (req, res) => {
  const orders = Order.listDisputed({
    limit: Number(req.query.limit) || 50,
    offset: Number(req.query.offset) || 0,
  });
  res.json({ ok: true, orders });
}));

/** GET /:id */
router.get('/:id', orderLimiter, asyncHandler(async (req, res) => {
  const order = Order.getById(req.params.id);
  if (!order) return sendError(res, 404, 'الطلب غير موجود', 'NOT_FOUND');
  const buyer = (() => {
    const { id, token } = extractBuyerCredentials(req);
    if (!id || !token) return null;
    return Buyer.findByIdAndToken(id, token);
  })();
  const sellerOk = (() => {
    try { return !!requireSeller(req, { status() { return this; }, json() {} }, order.sellerId); } catch (e) { return false; }
  })();
  // إعادة فحص البائع بشكل صحيح
  let sellerAllowed = false;
  try {
    const accList = _deps.readAccounts() || [];
    const acc = accList.find((a) => a && a.id === order.sellerId);
    const token = extractAccountToken(req) || extractDashToken(req);
    sellerAllowed = !!(acc && token && tokenMatchesAccount(acc, token));
  } catch (e2) {}
  if ((!buyer || buyer.id !== order.buyerId) && !sellerAllowed) {
    return sendError(res, 403, 'غير مصرّح', 'FORBIDDEN');
  }
  res.json({ ok: true, order });
}));

/** PATCH /:id/status */
router.patch('/:id/status', orderLimiter, asyncHandler(async (req, res) => {
  const order = Order.getById(req.params.id);
  if (!order) return sendError(res, 404, 'الطلب غير موجود', 'NOT_FOUND');
  const body = req.body || {};
  const toStatus = String(body.status || '').trim();

  let actorKind = 'seller';
  let actorId = order.sellerId;
  const buyer = (() => {
    const { id, token } = extractBuyerCredentials(req);
    if (!id || !token) return null;
    return Buyer.findByIdAndToken(id, token);
  })();

  let sellerAllowed = false;
  try {
    const accList = _deps.readAccounts() || [];
    const acc = accList.find((a) => a && a.id === order.sellerId);
    const token = extractAccountToken(req) || extractDashToken(req);
    sellerAllowed = !!(acc && token && tokenMatchesAccount(acc, token));
  } catch (e) {}

  if (sellerAllowed) {
    actorKind = 'seller';
    actorId = order.sellerId;
  } else if (buyer && buyer.id === order.buyerId && (toStatus === 'cancelled' || toStatus === 'disputed')) {
    actorKind = 'buyer';
    actorId = buyer.id;
  } else {
    return sendError(res, 403, 'غير مصرّح بتغيير الحالة', 'FORBIDDEN');
  }

  try {
    const updated = Order.updateStatus(order.id, toStatus, {
      actorKind,
      actorId,
      note: body.note || body.reason || '',
      driverNotes: body.driverNotes,
    });
    res.json({ ok: true, order: updated });
    if (updated.buyerId) fireBuyerNotify(updated, updated.status);
  } catch (err) {
    return sendError(res, err.status || 400, err.message, err.code || 'STATUS_FAILED');
  }
}));

/** POST /:id/payment-review — اعتماد/رفض مرجع الدفع */
router.post('/:id/payment-review', orderLimiter, asyncHandler(async (req, res) => {
  const order = Order.getById(req.params.id);
  if (!order) return sendError(res, 404, 'الطلب غير موجود', 'NOT_FOUND');
  const acc = requireSeller(req, res, order.sellerId);
  if (!acc) return;
  try {
    const updated = Order.setPaymentReview(order.id, String((req.body || {}).decision || ''), {
      actorId: order.sellerId,
      note: (req.body || {}).note || '',
    });
    res.json({ ok: true, order: updated });
  } catch (err) {
    return sendError(res, err.status || 400, err.message, err.code);
  }
}));

/** POST /:id/cancel */
router.post('/:id/cancel', orderLimiter, asyncHandler(async (req, res) => {
  const order = Order.getById(req.params.id);
  if (!order) return sendError(res, 404, 'الطلب غير موجود', 'NOT_FOUND');
  const buyer = (() => {
    const { id, token } = extractBuyerCredentials(req);
    if (!id || !token) return null;
    return Buyer.findByIdAndToken(id, token);
  })();
  let sellerAllowed = false;
  try {
    const accList = _deps.readAccounts() || [];
    const acc = accList.find((a) => a && a.id === order.sellerId);
    const token = extractAccountToken(req) || extractDashToken(req);
    sellerAllowed = !!(acc && token && tokenMatchesAccount(acc, token));
  } catch (e) {}
  if ((!buyer || buyer.id !== order.buyerId) && !sellerAllowed) {
    return sendError(res, 403, 'غير مصرّح', 'FORBIDDEN');
  }
  try {
    const updated = Order.updateStatus(order.id, 'cancelled', {
      actorKind: sellerAllowed ? 'seller' : 'buyer',
      actorId: sellerAllowed ? order.sellerId : (buyer && buyer.id),
      note: (req.body || {}).reason || (req.body || {}).note || 'إلغاء الطلب',
    });
    res.json({ ok: true, order: updated });
    fireBuyerNotify(updated, 'cancelled');
  } catch (err) {
    return sendError(res, err.status || 400, err.message, err.code);
  }
}));

/** POST /:id/dispute */
router.post('/:id/dispute', orderLimiter, asyncHandler(async (req, res) => {
  const order = Order.getById(req.params.id);
  if (!order) return sendError(res, 404, 'الطلب غير موجود', 'NOT_FOUND');
  const buyer = requireBuyer(req, res);
  if (!buyer) return;
  if (buyer.id !== order.buyerId) return sendError(res, 403, 'غير مصرّح', 'FORBIDDEN');
  try {
    const updated = Order.updateStatus(order.id, 'disputed', {
      actorKind: 'buyer',
      actorId: buyer.id,
      note: (req.body || {}).reason || (req.body || {}).note || 'مشكلة في الطلب',
    });
    res.json({ ok: true, order: updated });
    fireBuyerNotify(updated, 'disputed');
  } catch (err) {
    return sendError(res, err.status || 400, err.message, err.code);
  }
}));

/** POST /:id/resolve — أدمن */
router.post('/:id/resolve', orderLimiter, asyncHandler(async (req, res) => {
  try {
    const updated = Order.resolveDispute(req.params.id, {
      resolution: (req.body || {}).resolution || '',
      nextStatus: (req.body || {}).nextStatus || 'cancelled',
      actorId: 'admin',
    });
    res.json({ ok: true, order: updated });
    fireBuyerNotify(updated, updated.status);
  } catch (err) {
    return sendError(res, err.status || 400, err.message, err.code);
  }
}));

module.exports = router;
module.exports.configureOrderRoutes = configureOrderRoutes;
