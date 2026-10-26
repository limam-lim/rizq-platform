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
assert(store.includes('auth_required'), 'store shows auth_required error');

const office = read('rizq_office.html');
assert(office.includes("id === 'demo_law'"), 'office resolve must accept demo_law');
assert(office.includes('_rizqOfficeSubmitReview'), 'office submit handler');

const corp = read('rizq_corp.html');
assert(corp.includes("demo-corp-001"), 'corp demo id fallback');
assert(corp.includes('_corpSubmitReview'), 'corp submit handler');

const estate = read('rizq_estate.html');
assert(estate.includes('rizq_reviews_engine.js'), 'estate loads reviews engine');
assert(estate.includes('_rizqEstateSubmitReview'), 'estate submit handler');

const engineSrc = read('rizq_reviews_engine.js');
assert(engineSrc.includes('API source of truth') || engineSrc.includes('/api/reviews'), 'engine is API-backed');
assert(engineSrc.includes('auth_required'), 'engine requires auth');
assert(engineSrc.includes('scrubFakeReviewMeta'), 'engine scrubs fake demo counts');

const storeMap = new Map();
let fetchCalls = 0;
const sandbox = {
  console,
  localStorage: {
    getItem(k){ return storeMap.has(k) ? storeMap.get(k) : null; },
    setItem(k,v){ storeMap.set(k, String(v)); },
    removeItem(k){ storeMap.delete(k); }
  },
  RIZQ_BACKEND_BASE: 'http://reviews.test',
  fetch: function (url, opts) {
    fetchCalls++;
    const body = JSON.parse(opts.body || '{}');
    return Promise.resolve({
      status: 200,
      json: function () {
        return Promise.resolve({
          ok: true,
          review: {
            id: 'RV-test',
            rating: body.rating,
            comment: body.comment,
            reviewerName: body.reviewerName,
            createdAt: new Date().toISOString()
          }
        });
      }
    });
  }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.localStorage.setItem('rizq_buyer_session', JSON.stringify({
  id: 'buy_test_1',
  token: 'abcdefghijklmnopqrst',
  name: 'محمد'
}));
vm.runInNewContext(engineSrc, sandbox);
const R = sandbox.RizqReviews;
assert(R, 'RizqReviews exported');

return Promise.resolve()
  .then(function () {
    return R.addReview('demo-corp-001', { rating: 5, comment: 'ممتاز', reviewerName: 'محمد' });
  })
  .then(function (r1) {
    assert.strictEqual(r1.ok, true, 'first review ok');
    assert.ok(fetchCalls >= 1, 'posted to API');
    const stats = R.getStats('demo-corp-001');
    assert.strictEqual(stats.count, 1);
    assert.strictEqual(stats.average, 5);
    return R.addReview('demo-corp-001', { rating: 4, comment: ' thrice', reviewerName: 'سارا' });
  })
  .then(function (r2) {
    assert.strictEqual(r2.ok, false);
    assert.strictEqual(r2.error, 'already_reviewed');
    return R.addReview('demo-corp-001', { rating: 0 });
  })
  .then(function (bad) {
    assert.strictEqual(bad.ok, false);
    assert.strictEqual(bad.error, 'invalid_rating');
    const scrubbed = R.scrubFakeReviewMeta('★★★★★ (48 تقييم) — بائع موثّق');
    assert.ok(!/\d+\s*تقييم/.test(scrubbed), 'fake counts scrubbed');
    assert.ok(scrubbed.indexOf('موثّق') >= 0, 'badge text kept');
    console.log('test-public-reviews: OK');
  })
  .catch(function (err) {
    console.error(err);
    process.exit(1);
  });
