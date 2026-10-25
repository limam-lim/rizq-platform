/**
 * اختبار دورة حياة الطلبات + بحث + خصوصية + Push مفاتيح
 * تشغيل: node scripts/test-orders-ops-api.js
 */
'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.RIZQ_ENV = process.env.RIZQ_ENV || 'test';

const assert = require('assert');
const path = require('path');

// تأكد أن db يُحمَّل من مجلد البيانات الافتراضي
const Order = require('../models/order');
const Buyer = require('../models/buyer');
const Push = require('../models/pushSubscription');
const Notify = require('../services/notificationService');

function ok(cond, msg) {
  assert.ok(cond, msg);
  console.log('  ✓', msg);
}

async function main() {
  console.log('\n=== Rizq Orders / Ops API smoke ===\n');

  const stamp = String(Date.now()).slice(-6);
  const phone = '44' + stamp.slice(0, 6);
  const reg = Buyer.registerOrLogin({
    name: 'مختبر الطلبات تجريبي',
    email: 'ops-test-' + stamp + '@rizq.test',
    phone: phone,
    whatsapp: '+222' + phone,
    password: 'testpass1',
  });
  ok(reg && reg.buyer && reg.token, 'buyer registered');

  const order = Order.createOrder({
    buyerId: reg.buyer.id,
    sellerId: 'store_test_ops_001',
    sellerType: 'store',
    items: [{ productId: 'p1', title: 'منتج اختبار', qty: 2, unitPrice: 1500 }],
    paymentMethod: 'bankily',
    paymentReference: 'BK-' + Date.now(),
    delivery: {
      name: reg.buyer.name,
      phone: reg.buyer.phone,
      wilaya: 'نواكشوط',
      district: 'تفرغ زينة',
      address: 'شارع الاختبار 12',
      notes: 'اتصل قبل الوصول',
    },
    currency: 'MRU',
  });
  ok(order && order.id && order.status === 'new', 'order created as new');
  ok(order.orderNumber && order.orderNumber.indexOf('RZQ-') === 0, 'order number RZQ-*');
  ok(order.paymentStatus === 'awaiting_review', 'digital payment awaiting review');
  ok(order.items && order.items.length === 1 && order.total === 3000, 'items + total');

  let accepted = Order.updateStatus(order.id, 'accepted', {
    actorKind: 'seller',
    actorId: 'store_test_ops_001',
    note: 'قبول',
  });
  ok(accepted.status === 'accepted', 'transition new → accepted');

  let out = Order.updateStatus(order.id, 'out_for_delivery', {
    actorKind: 'seller',
    actorId: 'store_test_ops_001',
    driverNotes: 'المندوب أحمد',
  });
  ok(out.status === 'out_for_delivery' && out.driverNotes.indexOf('أحمد') >= 0, 'out_for_delivery + driver notes');

  let done = Order.updateStatus(order.id, 'completed', {
    actorKind: 'seller',
    actorId: 'store_test_ops_001',
  });
  ok(done.status === 'completed', 'completed');

  let disputed = Order.updateStatus(order.id, 'disputed', {
    actorKind: 'buyer',
    actorId: reg.buyer.id,
    note: 'المنتج تالف',
  });
  ok(disputed.status === 'disputed' && disputed.payoutFrozen === true, 'disputed freezes payout');

  let resolved = Order.resolveDispute(order.id, {
    resolution: 'استرجاع جزئي',
    nextStatus: 'cancelled',
    actorId: 'admin',
  });
  ok(resolved.status === 'cancelled', 'admin resolved → cancelled');

  const metrics = Order.sellerMetrics('store_test_ops_001');
  ok(metrics && typeof metrics.fulfillmentRate === 'number', 'seller metrics');

  const adminM = Order.adminMetrics();
  ok(adminM && typeof adminM.todayOrders === 'number', 'admin metrics');

  const notify = await Notify.notifyBuyerOrderStatus(
    Order.getById(order.id),
    'cancelled',
    { id: reg.buyer.id, email: reg.buyer.email, phone: reg.buyer.phone, lang: 'ar' }
  );
  ok(notify && notify.ok && notify.body, 'notification logged (in_app fallback)');

  const pub = Push.getPublicKey();
  ok(!!pub, 'vapid public key available in non-prod');

  const exported = Order.exportBuyerData(reg.buyer.id);
  ok(exported.orders && exported.orders.length >= 1, 'buyer data export includes orders');

  Order.anonymizeBuyerOrders(reg.buyer.id);
  const after = Order.getById(order.id);
  ok(after.delivery.name === 'محذوف' && !after.paymentReference, 'anonymize buyer PII on orders');

  const erased = Buyer.eraseAccount(reg.buyer.id);
  ok(erased, 'buyer account erased');
  const gone = Buyer.findById(reg.buyer.id);
  ok(gone && gone.name === 'حساب محذوف' && !gone.token, 'buyer row anonymized');

  // انتقال غير صالح
  let threw = false;
  try {
    const o2 = Order.createOrder({
      buyerId: reg.buyer.id,
      sellerId: 'store_test_ops_001',
      items: [{ title: 'x', qty: 1, unitPrice: 10 }],
      paymentMethod: 'cod',
      delivery: { name: 'a', phone: '1' },
    });
    Order.updateStatus(o2.id, 'completed', { actorKind: 'seller', actorId: 'store_test_ops_001' });
  } catch (e) {
    threw = e.code === 'INVALID_TRANSITION';
  }
  ok(threw, 'invalid transition blocked');

  // دفع رقمي بلا مرجع
  let payFail = false;
  try {
    Order.createOrder({
      buyerId: reg.buyer.id,
      sellerId: 's2',
      items: [{ title: 'y', qty: 1, unitPrice: 1 }],
      paymentMethod: 'sedad',
      delivery: {},
    });
  } catch (e2) {
    payFail = e2.code === 'PAYMENT_REF_REQUIRED';
  }
  ok(payFail, 'digital payment requires reference');

  console.log('\nAll ops smoke checks passed.\n');
}

main().catch((e) => {
  console.error('\nFAILED:', e);
  process.exit(1);
});
