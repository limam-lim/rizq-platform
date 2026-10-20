#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const showroom = read('rizq_showroom.html');
assert(showroom.includes('rizq_reviews_engine.js'), 'showroom must load reviews engine');
assert(showroom.includes('_rizqShowroomSubmitReview'), 'showroom must expose submit handler');
assert(showroom.includes('أضف تقييمك') || showroom.includes('Laisser un avis'), 'showroom form copy present');

const store = read('rizq_store.html');
assert(store.includes("id === 'demo_store'"), 'store resolve must accept demo_store');
assert(store.includes('_rizqStoreSubmitReview'), 'store submit handler');

const office = read('rizq_office.html');
assert(office.includes("id === 'demo_law'"), 'office resolve must accept demo_law');
assert(office.includes('_rizqOfficeSubmitReview'), 'office submit handler');

const corp = read('rizq_corp.html');
assert(corp.includes("demo-corp-001"), 'corp demo id fallback');
assert(corp.includes('_corpSubmitReview'), 'corp submit handler');

const estate = read('rizq_estate.html');
assert(estate.includes('rizq_reviews_engine.js'), 'estate loads reviews engine');
assert(estate.includes('_rizqEstateSubmitReview'), 'estate submit handler');

// Engine unit: add + stats + duplicate guard
const engineSrc = read('rizq_reviews_engine.js');
const storeMap = new Map();
const sandbox = {
  window: {},
  localStorage: {
    getItem(k){ return storeMap.has(k) ? storeMap.get(k) : null; },
    setItem(k,v){ storeMap.set(k, String(v)); },
    removeItem(k){ storeMap.delete(k); }
  }
};
sandbox.global = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(engineSrc, sandbox);
const R = sandbox.RizqReviews || sandbox.window.RizqReviews;
assert(R, 'RizqReviews exported');
const r1 = R.addReview('demo-corp-001', { rating: 5, comment: 'ممتاز', reviewerName: 'محمد' });
assert.strictEqual(r1.ok, true, 'first review ok');
const stats = R.getStats('demo-corp-001');
assert.strictEqual(stats.count, 1);
assert.strictEqual(stats.average, 5);
const r2 = R.addReview('demo-corp-001', { rating: 4, comment: ' thrice', reviewerName: 'سارا' });
assert.strictEqual(r2.ok, false);
assert.strictEqual(r2.error, 'already_reviewed');
const bad = R.addReview('demo-corp-001', { rating: 0 });
assert.strictEqual(bad.ok, false);

console.log('test-public-reviews: OK');
