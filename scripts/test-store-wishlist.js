#!/usr/bin/env node
/**
 * Smoke test for store wishlist helpers (string ids, toggle, panel open).
 * Extracts logic patterns without a browser.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const storeHtml = fs.readFileSync(path.join(__dirname, '..', 'rizq_store.html'), 'utf8');
const headerJs = fs.readFileSync(path.join(__dirname, '..', 'rizq_header.js'), 'utf8');
const commerceJs = fs.readFileSync(path.join(__dirname, '..', 'rizq_store_commerce.js'), 'utf8');

assert(
  !/function commerceToolbarHtml\(\)\s*\{\s*if \(isStorePage\(\)\) \{\s*return '';/.test(headerJs),
  'header must not early-return empty toolbar on store pages'
);
assert(headerJs.includes('rizq-hdr-store-wish'), 'header must include store wish button');
assert(storeHtml.includes('class="wish-btn"'), 'store cards must include wish-btn');
assert(storeHtml.includes('_wishAuthToggle'), 'store must expose auth-gated wish toggle');
assert(/function\s+_qvEsc\s*\(/.test(storeHtml), 'store must define _qvEsc for wishlist panel HTML escape');
assert(storeHtml.includes('#wish-panel-overlay.disc-overlay{z-index:11050'), 'wish panel must sit above header');
assert(headerJs.includes('commerceToolbarHtml()'), 'desk fav must reuse commerce toolbar on store pages');
assert(commerceJs.includes('wishFromDetail: wishFromDetail'), 'commerce must export wishFromDetail');

// Logic twin of toggleWish / string-id compare
function makeStore() {
  const mem = {};
  const key = 'rizq_wishlist_demo_store';
  function get() {
    try { return JSON.parse(mem[key] || '[]'); } catch (e) { return []; }
  }
  function save(list) { mem[key] = JSON.stringify(list); }
  function toggle(id, name, price, emoji) {
    const list = get();
    const sid = String(id == null ? '' : id);
    if (!sid) return false;
    const idx = list.findIndex((p) => String(p.id) === sid);
    let added;
    if (idx > -1) { list.splice(idx, 1); added = false; }
    else { list.push({ id: sid, name, price, emoji }); added = true; }
    save(list);
    return added;
  }
  return { get, toggle, mem, key };
}

const s = makeStore();
assert.strictEqual(s.toggle('P1', 'دراعة', '45000 MRU', '👔'), true);
assert.strictEqual(s.get().length, 1);
assert.strictEqual(s.get()[0].id, 'P1');
assert.strictEqual(s.toggle('P1', 'دراعة', '45000 MRU', '👔'), false);
assert.strictEqual(s.get().length, 0);
assert.strictEqual(s.toggle(2, 'ساعة', '1', '⌚'), true);
assert.ok(s.get().some((p) => String(p.id) === '2'));
assert.strictEqual(s.toggle('2', 'ساعة', '1', '⌚'), false);

console.log('OK: store wishlist smoke tests passed');
