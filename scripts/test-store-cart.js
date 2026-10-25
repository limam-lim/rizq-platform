#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const headerJs = fs.readFileSync(path.join(__dirname, '..', 'rizq_header.js'), 'utf8');
const storeHtml = fs.readFileSync(path.join(__dirname, '..', 'rizq_store.html'), 'utf8');
const commerceJs = fs.readFileSync(path.join(__dirname, '..', 'rizq_store_commerce.js'), 'utf8');

assert(
  !/function commerceToolbarHtml\(\)\s*\{\s*if \(isStorePage\(\)\) \{\s*return '';/.test(headerJs),
  'header must not hide commerce tools on store pages'
);
assert(headerJs.includes('rizq-hdr-cart'), 'header must include cart control');
assert(headerJs.includes('rizq-hdr-cart-lbl'), 'cart control must show visible السلة/Panier label');
assert(headerJs.includes('commerceToolbarHtml()'), 'desk tools must reuse commerce toolbar');
assert(storeHtml.includes('store-name-el'), 'addToCartStore must read store-name-el');
assert(storeHtml.includes('_rizqWireStoreCartLinks'), 'store must rewire cart links after header inject');
assert(
  storeHtml.includes("baseId = 'store-prod-' + id") || storeHtml.includes("lineId = 'store-prod-' + id") || storeHtml.includes("var lineId = 'store-prod-' + id"),
  'cart line ids must stay store-prod-*'
);
assert(
  commerceJs.includes("parts[parts.length - 1]") || commerceJs.includes('parts.length - 1'),
  'withStoreId must use filename leaf (not full pathname) for GitHub Pages'
);
assert(
  !/return u\.pathname\.replace\(\/\\^\//.test(commerceJs),
  'withStoreId must not strip only leading slash from full pathname'
);

// Logic twin of withStoreId — GitHub project pages base path must not duplicate
function withStoreIdTwin(href, storeId, pageUrl) {
  if (!storeId) return href;
  const u = new URL(href, pageUrl);
  u.searchParams.set('id', storeId);
  const parts = String(u.pathname || '').split('/').filter(Boolean);
  const file = parts.length ? parts[parts.length - 1] : '';
  return file + u.search + u.hash;
}
const pagesStore = 'https://limam-lim.github.io/rizq-platform/rizq_store.html';
const cartHref = withStoreIdTwin('rizq_cart.html', 'demo_store', pagesStore);
assert.strictEqual(cartHref, 'rizq_cart.html?id=demo_store');
assert.strictEqual(
  new URL(cartHref, pagesStore).href,
  'https://limam-lim.github.io/rizq-platform/rizq_cart.html?id=demo_store'
);
assert.ok(!cartHref.startsWith('rizq-platform/'), 'cart href must not prefix project folder');
const rootStore = 'https://rizq.mr/rizq_store.html';
assert.strictEqual(
  withStoreIdTwin('rizq_products.html', 's1', rootStore),
  'rizq_products.html?id=s1'
);

// Logic twin of addToCartStore
function add(catalog, cart, id, sid, sname) {
  id = String(id == null ? '' : id);
  const p = catalog[id];
  if (!p) return { ok: false, cart };
  const lineId = 'store-prod-' + id;
  const ex = cart.find((c) => String(c.id) === lineId);
  if (ex) ex.qty = (Number(ex.qty) || 0) + 1;
  else {
    cart.push({
      id: lineId,
      name: p.name,
      nameF: p.nameF,
      price: Number(p.price) || 0,
      qty: 1,
      emoji: p.emoji || '📦',
      storeId: sid,
      accountId: sid,
      storeName: sname,
    });
  }
  return { ok: true, cart };
}

const catalog = { P1: { name: 'دراعة', nameF: 'Boubou', price: 45000, emoji: '👔' } };
let cart = [];
let r = add(catalog, cart, 'P1', 'demo_store', 'محل النور');
assert.strictEqual(r.ok, true);
assert.strictEqual(cart.length, 1);
assert.strictEqual(cart[0].storeId, 'demo_store');
r = add(catalog, cart, 'P1', 'demo_store', 'محل النور');
assert.strictEqual(cart[0].qty, 2);
r = add(catalog, cart, 'NOPE', 'demo_store', 'محل النور');
assert.strictEqual(r.ok, false);

// Logic twin of RizqStoreCommerce.cartLinesForSeller / cartQtyForSeller
function cartLinesForSeller(items, sellerId) {
  const list = Array.isArray(items) ? items : [];
  if (!sellerId) return list.slice();
  const sid = String(sellerId);
  return list.filter((c) => String((c && (c.storeId || c.accountId)) || '') === sid);
}
function cartQtyForSeller(items, sellerId) {
  return cartLinesForSeller(items, sellerId).reduce((s, c) => s + (Number(c.qty) || 0), 0);
}

const mixed = [
  { id: 'store-prod-1', storeId: 'demo_store', qty: 2, module: 'store' },
  { id: 'showroom-car-9', storeId: 'demo-corp-001', accountId: 'demo-corp-001', qty: 1, module: 'showroom' },
  { id: 'store-prod-2', storeId: 'other_store', qty: 3, module: 'store' }
];
assert.strictEqual(cartLinesForSeller(mixed, 'demo-corp-001').length, 1);
assert.strictEqual(cartLinesForSeller(mixed, 'demo-corp-001')[0].id, 'showroom-car-9');
assert.strictEqual(cartQtyForSeller(mixed, 'demo_store'), 2);
assert.strictEqual(cartQtyForSeller(mixed, 'other_store'), 3);
assert.strictEqual(cartLinesForSeller(mixed, '').length, 3, 'no seller id => general visitor cart');

assert(commerceJs.includes('cartLinesForSeller'), 'commerce must export seller cart filter');
assert(commerceJs.includes('cartQtyForSeller'), 'commerce must export seller cart qty');
const cartHtml = fs.readFileSync(path.join(__dirname, '..', 'rizq_cart.html'), 'utf8');
assert(cartHtml.includes('function activeCart'), 'cart page must scope visible lines');
assert(cartHtml.includes('_cartScopeSellerId'), 'cart page must read seller scope from URL');
assert(cartHtml.includes('deliveryFee: Number(deliveryFee)'), 'checkout must send deliveryFee to /api/orders');
assert(cartHtml.includes('discount: discountAmt'), 'checkout must send promo discount to /api/orders');
assert(!/واتساب فقط، بلا تخزين خادم/.test(cartHtml), 'stale WhatsApp-only cart comment must be removed');
const productsHtml = fs.readFileSync(path.join(__dirname, '..', 'rizq_products.html'), 'utf8');
assert(
  productsHtml.includes("baseId = 'store-prod-' + String(id)") || productsHtml.includes("'store-prod-' + String(id)"),
  'products page must use store-prod-* line ids like the store page'
);
assert(productsHtml.includes("module: 'store'"), 'products addToCart must set module:store');
const stockJs = fs.readFileSync(path.join(__dirname, '..', 'rizq_stock.js'), 'utf8');
assert(stockJs.includes('c.module || c.kind'), 'stock decrement must honor cart module for showroom/corp');
assert(stockJs.includes('function stripCartLineId'), 'stock match must strip cart line prefixes');
const showroomHtml = fs.readFileSync(path.join(__dirname, '..', 'rizq_showroom.html'), 'utf8');
assert(showroomHtml.includes('cartQtyForSeller') || showroomHtml.includes('cartLinesForSeller') || showroomHtml.includes("c.storeId || c.accountId"), 'showroom badge must count only its seller');
assert(showroomHtml.includes('module=showroom'), 'showroom cart links must pass module=showroom');

console.log('OK: store cart smoke tests passed');
