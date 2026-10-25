/**
 * اختبار حجز/استرجاع مخزون الطلبات
 */
'use strict';

const assert = require('assert');
const OrderStock = require('../services/orderStock');

function ok(c, m) { assert.ok(c, m); console.log('  ✓', m); }

function makeCatalog() {
  return [
    { id: 'p_limited', accountId: 'store_a', name: 'قميص', stock: '5', sold: 0, status: 'active' },
    { id: 'p_sized', accountId: 'store_a', name: 'حذاء', stock: '3', sizeStock: { M: 2, L: 1 }, sold: 0, status: 'active' },
    { id: 'p_unlimited', accountId: 'store_a', name: 'خدمة', stock: '', sold: 0, status: 'active' },
  ];
}

let catalog = makeCatalog();
const deps = {
  readCatalog: () => catalog,
  writeCatalog: (list) => { catalog = list; },
};

console.log('\n=== order stock reserve/restore ===\n');

let r = OrderStock.reserveForOrder({
  sellerId: 'store_a',
  items: [{ productId: 'p_limited', qty: 2 }],
}, deps);
ok(r.reserved.length === 1 && catalog[0].stock === '3', 'reserve decreases stock 5→3');
ok(Number(catalog[0].sold) === 2, 'sold increases');

let threw = false;
try {
  OrderStock.reserveForOrder({
    sellerId: 'store_a',
    items: [{ productId: 'p_limited', qty: 10 }],
  }, deps);
} catch (e) {
  threw = e.code === 'OUT_OF_STOCK';
}
ok(threw, 'OUT_OF_STOCK when insufficient');
ok(catalog[0].stock === '3', 'failed reserve does not change stock');

r = OrderStock.reserveForOrder({
  sellerId: 'store_a',
  items: [{ productId: 'p_sized', qty: 1, meta: { selected: { size: 'M' } } }],
}, deps);
ok(catalog[1].sizeStock.M === 1 && catalog[1].stock === '2', 'size stock M 2→1, sum 3→2');

r = OrderStock.reserveForOrder({
  sellerId: 'store_a',
  items: [{ productId: 'p_unlimited', qty: 5 }],
}, deps);
ok(r.reserved[0].skipped === true, 'empty stock string skips reservation');

r = OrderStock.reserveForOrder({
  sellerId: 'store_a',
  items: [{ productId: 'local_only_item', qty: 1 }],
}, deps);
ok(r.skipped.length === 1 && r.skipped[0].reason === 'not_in_catalog', 'missing catalog item skipped');

OrderStock.restoreForOrder({
  sellerId: 'store_a',
  items: [{ productId: 'p_limited', qty: 2 }],
}, deps);
ok(catalog[0].stock === '5', 'restore returns stock 3→5');

ok(OrderStock.cleanProductId('store-prod-abc__v_red') === 'abc', 'cleanProductId strips prefixes');

console.log('\nAll order-stock checks passed.\n');
