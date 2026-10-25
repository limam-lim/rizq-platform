/**
 * /api/privacy — تصدير وحذف بيانات المشتري (GDPR / rizq_legal)
 */
'use strict';

const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const Buyer = require('../models/buyer');
const Order = require('../models/order');
const Passkey = require('../models/passkey');
const Push = require('../models/pushSubscription');
const Notify = require('../services/notificationService');
const { db } = require('../db');
const { asyncHandler, sendError } = require('../middleware/errors');
const { extractBuyerCredentials } = require('../middleware/buyerAuth');
const { clearBuyerSessionCookie } = require('../lib/buyerCookie');

const router = express.Router();

const privacyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'محاولات كثيرة', code: 'RATE_LIMIT' },
});

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

function logPrivacy(userKind, userId, action, payload) {
  try {
    db.prepare(`
      INSERT INTO privacy_requests (id, user_kind, user_id, action, status, payload_json, created_at)
      VALUES (?, ?, ?, ?, 'done', ?, ?)
    `).run(
      'prv_' + crypto.randomBytes(6).toString('hex'),
      userKind,
      userId,
      action,
      JSON.stringify(payload || {}).slice(0, 50000),
      new Date().toISOString()
    );
  } catch (e) {}
}

/** GET /export — تحميل بياناتي */
router.get('/export', privacyLimiter, asyncHandler(async (req, res) => {
  const buyer = requireBuyer(req, res);
  if (!buyer) return;

  const orders = Order.exportBuyerData(buyer.id);
  const passkeys = typeof Passkey.listByUser === 'function'
    ? Passkey.listByUser('buyer', buyer.id)
    : [];
  const pushSubs = Push.listByUser('buyer', buyer.id);
  const alerts = typeof Notify.listInApp === 'function'
    ? Notify.listInApp('buyer', buyer.id, { limit: 50 })
    : [];

  const payload = {
    exportedAt: new Date().toISOString(),
    platform: 'رزق',
    legal: 'rizq_legal.html#s3',
    buyer: Buyer.publicBuyer(buyer),
    orders: orders.orders || [],
    passkeys: (passkeys || []).map((p) => ({
      id: p.id,
      deviceName: p.device_name || p.deviceName || '',
      createdAt: p.created_at || p.createdAt || '',
    })),
    pushSubscriptions: pushSubs,
    inAppAlerts: alerts,
  };

  logPrivacy('buyer', buyer.id, 'export', { orderCount: (orders.orders || []).length });

  res.set('Content-Disposition', 'attachment; filename="rizq-data-export.json"');
  res.json({ ok: true, data: payload });
}));

/** POST /erase — حذف حسابي */
router.post('/erase', privacyLimiter, asyncHandler(async (req, res) => {
  const buyer = requireBuyer(req, res);
  if (!buyer) return;

  const confirm = String((req.body || {}).confirm || '').trim();
  if (confirm !== 'DELETE' && confirm !== 'حذف') {
    return sendError(res, 400, 'أدخل تأكيد الحذف: DELETE أو حذف', 'CONFIRM_REQUIRED');
  }

  // تجميد أي طلبات مفتوحة غير مكتملة/ملغاة — لا نحذف السجلات المالية
  try {
    const open = Order.listByBuyer(buyer.id, { limit: 100 });
    open.forEach((o) => {
      if (o && (o.status === 'new' || o.status === 'accepted' || o.status === 'out_for_delivery')) {
        try {
          Order.updateStatus(o.id, 'cancelled', {
            actorKind: 'buyer',
            actorId: buyer.id,
            note: 'إلغاء تلقائي عند حذف الحساب',
          });
        } catch (e) {}
      }
    });
  } catch (e2) {}

  Order.anonymizeBuyerOrders(buyer.id);

  try {
    const subs = Push.listByUser('buyer', buyer.id);
    subs.forEach((s) => {
      try { Push.removeEndpoint(s.endpoint); } catch (e3) {}
    });
  } catch (e4) {}

  try {
    if (typeof Passkey.deleteAllForUser === 'function') {
      Passkey.deleteAllForUser('buyer', buyer.id);
    } else if (typeof Passkey.removeAllForUser === 'function') {
      Passkey.removeAllForUser('buyer', buyer.id);
    } else {
      db.prepare("DELETE FROM user_passkeys WHERE user_kind = 'buyer' AND user_id = ?").run(buyer.id);
    }
  } catch (e5) {}

  const erased = Buyer.eraseAccount(buyer.id);
  if (!erased) {
    return sendError(res, 500, 'تعذّر حذف الحساب', 'ERASE_FAILED');
  }

  logPrivacy('buyer', buyer.id, 'erase', { ok: true });
  try { clearBuyerSessionCookie(res); } catch (e6) {}

  res.json({
    ok: true,
    message: 'تم حذف حسابك وبياناتك الشخصية. سجلات الطلبات المالية مجهّلة وفق القانون.',
  });
}));

/** GET /alerts — تنبيهات داخل التطبيق */
router.get('/alerts', privacyLimiter, asyncHandler(async (req, res) => {
  const buyer = requireBuyer(req, res);
  if (!buyer) return;
  const alerts = Notify.listInApp('buyer', buyer.id, {
    limit: Number(req.query.limit) || 30,
  });
  res.json({ ok: true, alerts });
}));

module.exports = router;
