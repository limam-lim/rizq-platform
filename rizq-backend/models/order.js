/**
 * طلبات السوق — دورة حياة كاملة
 */
'use strict';

const crypto = require('crypto');
const { db } = require('../db');

const STATUSES = ['new', 'accepted', 'out_for_delivery', 'completed', 'cancelled', 'disputed'];
const TRANSITIONS = {
  new: ['accepted', 'cancelled', 'disputed'],
  accepted: ['out_for_delivery', 'cancelled', 'disputed', 'completed'],
  out_for_delivery: ['completed', 'disputed', 'cancelled'],
  completed: ['disputed'],
  cancelled: [],
  disputed: ['accepted', 'cancelled', 'completed'],
};

function genId(prefix) {
  return prefix + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
}

function genOrderNumber() {
  const n = Date.now().toString().slice(-8);
  const r = crypto.randomBytes(2).toString('hex').toUpperCase();
  return 'RZQ-' + n + r;
}

function parseJson(raw, fallback) {
  try {
    const v = JSON.parse(raw || '');
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderNumber: row.order_number,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    sellerType: row.seller_type,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentReference: row.payment_reference,
    paymentReceipt: row.payment_receipt ? '[stored]' : '',
    paymentReceiptStored: !!row.payment_receipt,
    paymentStatus: row.payment_status,
    payoutFrozen: !!row.payout_frozen,
    currency: row.currency,
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    discount: row.discount,
    total: row.total,
    deliveryType: row.delivery_type,
    delivery: {
      name: row.delivery_name,
      phone: row.delivery_phone,
      wilaya: row.delivery_wilaya,
      district: row.delivery_district,
      address: row.delivery_address,
      notes: row.delivery_notes,
    },
    driverNotes: row.driver_notes,
    buyerNote: row.buyer_note,
    disputeReason: row.dispute_reason,
    cancelReason: row.cancel_reason,
    adminResolution: row.admin_resolution,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acceptedAt: row.accepted_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    disputedAt: row.disputed_at,
  };
}

function listItems(orderId) {
  return db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId).map((it) => ({
    id: it.id,
    productId: it.product_id,
    title: it.title,
    qty: it.qty,
    unitPrice: it.unit_price,
    lineTotal: it.line_total,
    meta: parseJson(it.meta_json, {}),
  }));
}

function listHistory(orderId) {
  return db.prepare(
    'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC'
  ).all(orderId).map((h) => ({
    id: h.id,
    fromStatus: h.from_status,
    toStatus: h.to_status,
    actorKind: h.actor_kind,
    actorId: h.actor_id,
    note: h.note,
    createdAt: h.created_at,
  }));
}

function getById(id, { includeReceipt = false } = {}) {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!row) return null;
  const order = mapOrder(row);
  if (includeReceipt) order.paymentReceiptRaw = row.payment_receipt || '';
  order.items = listItems(row.id);
  order.history = listHistory(row.id);
  return order;
}

function getByNumber(orderNumber) {
  const row = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);
  return row ? getById(row.id) : null;
}

function appendHistory(orderId, fromStatus, toStatus, actorKind, actorId, note) {
  db.prepare(`
    INSERT INTO order_status_history (id, order_id, from_status, to_status, actor_kind, actor_id, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    genId('osh_'),
    orderId,
    fromStatus || '',
    toStatus,
    actorKind || 'system',
    actorId || '',
    String(note || '').slice(0, 500),
    new Date().toISOString()
  );
}

function createOrder(payload) {
  const id = genId('ord_');
  const orderNumber = genOrderNumber();
  const now = new Date().toISOString();
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) {
    const err = new Error('السلة فارغة');
    err.status = 400;
    err.code = 'EMPTY_CART';
    throw err;
  }
  if (!payload.buyerId || !payload.sellerId) {
    const err = new Error('المشتري والبائع مطلوبان');
    err.status = 400;
    err.code = 'MISSING_PARTIES';
    throw err;
  }

  let subtotal = 0;
  const normalizedItems = items.map((it) => {
    const qty = Math.max(1, Math.min(999, Number(it.qty) || 1));
    const unit = Math.max(0, Number(it.unitPrice != null ? it.unitPrice : it.price) || 0);
    const line = Math.round(qty * unit * 100) / 100;
    subtotal += line;
    return {
      id: genId('oi_'),
      productId: String(it.productId || it.id || '').slice(0, 80),
      title: String(it.title || it.name || 'منتج').slice(0, 200),
      qty,
      unitPrice: unit,
      lineTotal: line,
      meta: it.meta || {},
    };
  });
  subtotal = Math.round(subtotal * 100) / 100;
  const deliveryFee = Math.max(0, Number(payload.deliveryFee) || 0);
  const discount = Math.max(0, Number(payload.discount) || 0);
  const total = Math.max(0, Math.round((subtotal + deliveryFee - discount) * 100) / 100);

  const paymentMethod = String(payload.paymentMethod || 'cod').toLowerCase();
  const isDigital = paymentMethod !== 'cod';
  const paymentReference = String(payload.paymentReference || '').trim().slice(0, 120);
  const paymentReceipt = String(payload.paymentReceipt || '').slice(0, 2_000_000);
  if (isDigital && !paymentReference && !paymentReceipt) {
    const err = new Error('مرجع التحويل أو صورة الوصل مطلوبة للدفع الرقمي');
    err.status = 400;
    err.code = 'PAYMENT_REF_REQUIRED';
    throw err;
  }

  const delivery = payload.delivery || {};
  const status = 'new';
  const paymentStatus = isDigital ? 'awaiting_review' : 'cod';

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, order_number, buyer_id, seller_id, seller_type, status,
      payment_method, payment_reference, payment_receipt, payment_status, payout_frozen,
      currency, subtotal, delivery_fee, discount, total,
      delivery_type, delivery_name, delivery_phone, delivery_wilaya, delivery_district,
      delivery_address, delivery_notes, driver_notes, buyer_note,
      dispute_reason, cancel_reason, admin_resolution,
      created_at, updated_at
    ) VALUES (
      ?,?,?,?,?,?,
      ?,?,?,?,?,
      ?,?,?,?,?,
      ?,?,?,?,?,
      ?,?,?,?,
      '','','',
      ?,?
    )
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, title, qty, unit_price, line_total, meta_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    insertOrder.run(
      id,
      orderNumber,
      String(payload.buyerId),
      String(payload.sellerId),
      String(payload.sellerType || 'store').slice(0, 40),
      status,
      paymentMethod.slice(0, 40),
      paymentReference,
      paymentReceipt,
      paymentStatus,
      0,
      String(payload.currency || 'MRU').slice(0, 8),
      subtotal,
      deliveryFee,
      discount,
      total,
      String(payload.deliveryType || 'delivery').slice(0, 20),
      String(delivery.name || '').slice(0, 120),
      String(delivery.phone || '').slice(0, 40),
      String(delivery.wilaya || delivery.city || '').slice(0, 80),
      String(delivery.district || '').slice(0, 80),
      String(delivery.address || '').slice(0, 300),
      String(delivery.notes || '').slice(0, 400),
      String(payload.driverNotes || '').slice(0, 400),
      String(payload.buyerNote || '').slice(0, 400),
      now,
      now
    );
    normalizedItems.forEach((it) => {
      insertItem.run(
        it.id, id, it.productId, it.title, it.qty, it.unitPrice, it.lineTotal,
        JSON.stringify(it.meta || {})
      );
    });
    appendHistory(id, '', status, 'buyer', payload.buyerId, 'تم إنشاء الطلب');
    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (e2) {}
    throw e;
  }
  return getById(id);
}

function listByBuyer(buyerId, { limit = 50, offset = 0 } = {}) {
  const rows = db.prepare(
    'SELECT id FROM orders WHERE buyer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(String(buyerId), Math.min(100, limit), Math.max(0, offset));
  return rows.map((r) => getById(r.id)).filter(Boolean);
}

function listBySeller(sellerId, { status, limit = 50, offset = 0 } = {}) {
  let rows;
  if (status) {
    rows = db.prepare(
      'SELECT id FROM orders WHERE seller_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(String(sellerId), String(status), Math.min(100, limit), Math.max(0, offset));
  } else {
    rows = db.prepare(
      'SELECT id FROM orders WHERE seller_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(String(sellerId), Math.min(100, limit), Math.max(0, offset));
  }
  return rows.map((r) => getById(r.id)).filter(Boolean);
}

function listDisputed({ limit = 50, offset = 0 } = {}) {
  const rows = db.prepare(
    "SELECT id FROM orders WHERE status = 'disputed' ORDER BY disputed_at DESC, created_at DESC LIMIT ? OFFSET ?"
  ).all(Math.min(100, limit), Math.max(0, offset));
  return rows.map((r) => getById(r.id)).filter(Boolean);
}

function canTransition(from, to) {
  return !!(TRANSITIONS[from] && TRANSITIONS[from].includes(to));
}

function updateStatus(orderId, toStatus, { actorKind, actorId, note, driverNotes } = {}) {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!row) {
    const err = new Error('الطلب غير موجود');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const from = row.status;
  const to = String(toStatus || '');
  if (!STATUSES.includes(to)) {
    const err = new Error('حالة غير صالحة');
    err.status = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }
  if (from === to) return getById(orderId);
  if (!canTransition(from, to) && actorKind !== 'admin') {
    const err = new Error('لا يمكن الانتقال من «' + from + '» إلى «' + to + '»');
    err.status = 400;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
  const now = new Date().toISOString();
  const fields = { status: to, updated_at: now };
  if (to === 'accepted') fields.accepted_at = now;
  if (to === 'completed') fields.completed_at = now;
  if (to === 'cancelled') fields.cancelled_at = now;
  if (to === 'disputed') {
    fields.disputed_at = now;
    fields.payout_frozen = 1;
  }
  if (to === 'completed' || to === 'cancelled') {
    if (from === 'disputed' && actorKind === 'admin') fields.payout_frozen = to === 'completed' ? 0 : 1;
  }
  if (driverNotes != null) fields.driver_notes = String(driverNotes).slice(0, 400);
  if (note && to === 'cancelled') fields.cancel_reason = String(note).slice(0, 400);
  if (note && to === 'disputed') fields.dispute_reason = String(note).slice(0, 400);

  const sets = Object.keys(fields).map((k) => k + ' = ?').join(', ');
  const vals = Object.keys(fields).map((k) => fields[k]);
  vals.push(orderId);
  db.prepare('UPDATE orders SET ' + sets + ' WHERE id = ?').run(...vals);
  appendHistory(orderId, from, to, actorKind || 'system', actorId || '', note || '');
  return getById(orderId);
}

function setPaymentReview(orderId, decision, { actorId, note } = {}) {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!row) {
    const err = new Error('الطلب غير موجود');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const ok = decision === 'approved' || decision === 'rejected';
  if (!ok) {
    const err = new Error('قرار الدفع غير صالح');
    err.status = 400;
    err.code = 'INVALID_DECISION';
    throw err;
  }
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?'
  ).run(decision, now, orderId);
  appendHistory(
    orderId,
    row.status,
    row.status,
    'seller',
    actorId || '',
    (decision === 'approved' ? 'اعتماد مرجع الدفع' : 'رفض مرجع الدفع') + (note ? ': ' + note : '')
  );
  return getById(orderId);
}

function resolveDispute(orderId, { resolution, nextStatus, actorId } = {}) {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!row) {
    const err = new Error('الطلب غير موجود');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (row.status !== 'disputed') {
    const err = new Error('الطلب ليس قيد النزاع');
    err.status = 400;
    err.code = 'NOT_DISPUTED';
    throw err;
  }
  const to = nextStatus || 'cancelled';
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE orders SET admin_resolution = ?, payout_frozen = ?, updated_at = ? WHERE id = ?'
  ).run(String(resolution || '').slice(0, 500), to === 'completed' ? 0 : 1, now, orderId);
  return updateStatus(orderId, to, {
    actorKind: 'admin',
    actorId: actorId || 'admin',
    note: resolution || 'قرار الإدارة',
  });
}

function sellerMetrics(sellerId) {
  const sid = String(sellerId);
  const today = new Date().toISOString().slice(0, 10);
  const dayRows = db.prepare(
    "SELECT status, total, created_at FROM orders WHERE seller_id = ? AND created_at >= ?"
  ).all(sid, today + 'T00:00:00.000Z');
  const all = db.prepare(
    'SELECT status, COUNT(*) AS n, COALESCE(SUM(total),0) AS revenue FROM orders WHERE seller_id = ? GROUP BY status'
  ).all(sid);
  const byStatus = {};
  let lifetime = 0;
  all.forEach((r) => {
    byStatus[r.status] = { count: r.n, revenue: r.revenue };
    lifetime += r.n;
  });
  const completed = (byStatus.completed && byStatus.completed.count) || 0;
  const cancelled = (byStatus.cancelled && byStatus.cancelled.count) || 0;
  const disputed = (byStatus.disputed && byStatus.disputed.count) || 0;
  const closed = completed + cancelled + disputed;
  const fulfillmentRate = closed ? Math.round((completed / closed) * 1000) / 10 : 0;
  const todayOrders = dayRows.length;
  const todayRevenue = dayRows.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const acceptedWithTimes = db.prepare(
    "SELECT created_at, accepted_at FROM orders WHERE seller_id = ? AND accepted_at IS NOT NULL ORDER BY accepted_at DESC LIMIT 50"
  ).all(sid);
  let avgResponseMs = null;
  if (acceptedWithTimes.length) {
    const sum = acceptedWithTimes.reduce((s, r) => {
      const a = Date.parse(r.accepted_at);
      const c = Date.parse(r.created_at);
      return s + (Number.isFinite(a - c) ? (a - c) : 0);
    }, 0);
    avgResponseMs = Math.round(sum / acceptedWithTimes.length);
  }
  return {
    todayOrders,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    fulfillmentRate,
    avgResponseMs,
    lifetimeOrders: lifetime,
    byStatus,
  };
}

function adminMetrics() {
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = db.prepare(
    "SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS revenue FROM orders WHERE created_at >= ?"
  ).get(today + 'T00:00:00.000Z');
  const disputed = db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'disputed'").get();
  const byStatus = db.prepare(
    'SELECT status, COUNT(*) AS n FROM orders GROUP BY status'
  ).all();
  return {
    todayOrders: todayCount.n,
    todayRevenue: todayCount.revenue,
    disputedOpen: disputed.n,
    byStatus: byStatus.reduce((acc, r) => { acc[r.status] = r.n; return acc; }, {}),
  };
}

function exportBuyerData(buyerId) {
  return {
    orders: listByBuyer(buyerId, { limit: 200 }),
  };
}

/**
 * لقطة نسخ احتياطي صريحة للطلبات (بدون صور وصل كاملة لتفادي تضخّم الأرشيف).
 * ملف rizq.db داخل data/ يبقى المصدر الكامل بما فيه payment_receipt.
 */
function exportBackupSnapshot({ limit = 5000 } = {}) {
  const lim = Math.max(1, Math.min(20000, Number(limit) || 5000));
  const rows = db.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT ?'
  ).all(lim);
  const orders = rows.map((row) => {
    const o = mapOrder(row);
    o.items = listItems(row.id);
    o.history = listHistory(row.id);
    o.paymentReceiptBytes = row.payment_receipt ? Buffer.byteLength(String(row.payment_receipt), 'utf8') : 0;
    return o;
  });
  const countRow = db.prepare('SELECT COUNT(*) AS n FROM orders').get();
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    totalOrders: countRow ? countRow.n : orders.length,
    exported: orders.length,
    note: 'Full payment receipts remain in data/rizq.db; this JSON is an operational index.',
    orders,
  };
}

function anonymizeBuyerOrders(buyerId) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE orders SET
      delivery_name = 'محذوف',
      delivery_phone = '',
      delivery_address = '',
      delivery_notes = '',
      buyer_note = '',
      payment_reference = '',
      payment_receipt = '',
      updated_at = ?
    WHERE buyer_id = ?
  `).run(now, String(buyerId));
}

module.exports = {
  STATUSES,
  TRANSITIONS,
  createOrder,
  getById,
  getByNumber,
  listByBuyer,
  listBySeller,
  listDisputed,
  updateStatus,
  setPaymentReview,
  resolveDispute,
  sellerMetrics,
  adminMetrics,
  exportBuyerData,
  exportBackupSnapshot,
  anonymizeBuyerOrders,
  canTransition,
};
