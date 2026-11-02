#!/usr/bin/env node
'use strict';
/**
 * Smoke: graduation seed upserts public-visible accounts/ads/catalog (not acc_demo).
 */
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const backendRoot = path.join(__dirname, '..', 'rizq-backend');
const seedScript = path.join(backendRoot, 'scripts', 'seed-graduation-demo.js');

function parseJsonBlob(text) {
  const s = String(text || '');
  /* قد يطبع repos.js سطراً JSON قبل نتيجة البذرة — خذ آخر كائن فيه "ok" */
  let lastGood = null;
  let searchFrom = 0;
  while (searchFrom < s.length) {
    const okAt = s.indexOf('"ok"', searchFrom);
    if (okAt < 0) break;
    const start = s.lastIndexOf('{', okAt);
    if (start < 0) {
      searchFrom = okAt + 1;
      continue;
    }
    for (let end = s.indexOf('}', okAt); end >= 0; end = s.indexOf('}', end + 1)) {
      try {
        const obj = JSON.parse(s.slice(start, end + 1));
        if (obj && Object.prototype.hasOwnProperty.call(obj, 'ok')) lastGood = obj;
      } catch (_) { /* keep scanning */ }
    }
    searchFrom = okAt + 1;
  }
  if (!lastGood) throw new Error('no JSON in output: ' + s.slice(0, 200));
  return lastGood;
}

function run(args) {
  const r = spawnSync(process.execPath, [seedScript].concat(args || []), {
    cwd: backendRoot,
    encoding: 'utf8',
    env: Object.assign({}, process.env, {
      NODE_ENV: 'development',
      NODE_NO_WARNINGS: '1'
    })
  });
  if (r.status !== 0) {
    throw new Error('seed failed: ' + (r.stderr || r.stdout || r.status));
  }
  return parseJsonBlob(r.stdout);
}

async function main() {
  const seeded = run([]);
  assert.strictEqual(seeded.ok, true);
  assert(seeded.accountsUpserted >= 10, 'expected many accounts');
  assert(seeded.adsUpserted >= 10, 'expected many ads');
  assert(seeded.catalogUpserted >= 8, 'expected graduation catalog products');
  assert.strictEqual(seeded.catalog, seeded.catalogUpserted);

  const store = require(path.join(backendRoot, 'db', 'platformStore'));
  const accounts = ((await store.readAccounts()) || []).filter((a) => a.graduationDemo && a.status === 'approved');
  const ads = ((await store.readAds()) || []).filter((a) => a.graduationDemo && a.status === 'active');

  assert(accounts.some((a) => a.type === 'store' && a.name.indexOf('الشنقيط') >= 0));
  assert(accounts.some((a) => a.type === 'corp' && /أمل/.test(a.name)));
  assert(accounts.some((a) => a.type === 'office' && /أطوار/.test(a.name)));
  assert(accounts.every((a) => !String(a.id).startsWith('acc_demo')), 'must not use acc_demo prefix');
  assert(accounts.every((a) => a.thumb && a.tagline && a.city), 'public card fields');
  assert(ads.some((a) => Array.isArray(a.images) && a.images.length >= 2), 'multi-image ads');
  assert(ads.some((a) => a.negotiable === true) && ads.some((a) => a.negotiable === false), 'price modes');
  assert(ads.some((a) => a.installments === true), 'installment edge case');
  assert(ads.every((a) => !/^RZQ-2026-1000\d$/i.test(a.id)), 'avoid filtered demo ad ids');

  // Public filter parity with accountsManage / ads routes
  const publicAcc = accounts.filter((a) => !a.suspended && !String(a.id).startsWith('acc_demo'));
  const publicAds = ads.filter((a) => !String(a.accountId).startsWith('acc_demo') && !/^RZQ-2026-1000\d$/i.test(a.id));
  assert(publicAcc.length === accounts.length);
  assert(publicAds.length === ads.length);

  const catalog = ((await store.readCatalog()) || []).filter((c) => c && c.graduationDemo);
  assert(catalog.length >= 8, 'seeded graduation catalog items');
  assert(catalog.every((c) => String(c.accountId || '').startsWith('acc_grad_')), 'catalog owned by graduation accounts');
  assert(catalog.some((c) => c.accountId === 'acc_grad_store_03' && /أرز|خضروات|زيت|سكر|شاي|حليب|تمر|دقيق/.test(c.name || '')),
    'سوق الأمل food catalog present');

  const cleared = run(['--clear']);
  assert.strictEqual(cleared.ok, true);
  assert(cleared.accountsRemoved >= 10);
  assert((cleared.catalogRemoved || 0) >= 8, 'clear removes graduation catalog');
  const left = ((await store.readAccounts()) || []).filter((a) => a.graduationDemo);
  assert.strictEqual(left.length, 0, 'clear removes graduation accounts');
  const leftCat = ((await store.readCatalog()) || []).filter((c) => c && (c.graduationDemo || String(c.accountId || '').startsWith('acc_grad_')));
  assert.strictEqual(leftCat.length, 0, 'clear removes graduation catalog items');

  // Re-seed for local demos after test
  run([]);

  console.log('OK: graduation seed smoke passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
