#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const headerJs = fs.readFileSync(path.join(__dirname, '..', 'rizq_header.js'), 'utf8');
const storeHtml = fs.readFileSync(path.join(__dirname, '..', 'rizq_store.html'), 'utf8');

assert(
  !/function commerceToolbarHtml\(\)\s*\{\s*if \(isStorePage\(\)\) \{\s*return '';/.test(headerJs),
  'header must not hide commerce tools on store pages'
);
assert(headerJs.includes('rizq-hdr-cart'), 'header must include cart control');
assert(headerJs.includes('rizq-hdr-cart-lbl'), 'cart control must show visible السلة/Panier label');
assert(headerJs.includes('commerceToolbarHtml()'), 'desk tools must reuse commerce toolbar');
assert(storeHtml.includes('store-name-el'), 'addToCartStore must read store-name-el');
assert(storeHtml.includes('_rizqWireStoreCartLinks'), 'store must rewire cart links after header inject');
assert(storeHtml.includes("lineId = 'store-prod-' + id") || storeHtml.includes("var lineId = 'store-prod-' + id"), 'cart line ids must stay store-prod-*');

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

console.log('OK: store cart smoke tests passed');
