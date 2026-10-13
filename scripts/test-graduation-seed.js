#!/usr/bin/env node
'use strict';
/**
 * Smoke: graduation seed upserts public-visible accounts/ads (not acc_demo).
 */
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const backendRoot = path.join(__dirname, '..', 'rizq-backend');
const seedScript = path.join(backendRoot, 'scripts', 'seed-graduation-demo.js');

function parseJsonBlob(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON in output: ' + s.slice(0, 200));
  return JSON.parse(s.slice(start, end + 1));
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

const seeded = run([]);
assert.strictEqual(seeded.ok, true);
assert(seeded.accountsUpserted >= 10, 'expected many accounts');
assert(seeded.adsUpserted >= 10, 'expected many ads');

const store = require(path.join(backendRoot, 'db', 'platformStore'));
const accounts = store.readAccounts().filter((a) => a.graduationDemo && a.status === 'approved');
const ads = store.readAds().filter((a) => a.graduationDemo && a.status === 'active');

assert(accounts.some((a) => a.type === 'store' && a.name.indexOf('الشنقيط') >= 0));
assert(accounts.some((a) => a.type === 'corp' && /أمل/.test(a.name)));
assert(accounts.some((a) => a.type === 'office' && /أطوار/.test(a.name)));
assert(accounts.every((a) => !String(a.id).startsWith('acc_demo')), 'must not use acc_demo prefix');
assert(accounts.every((a) => a.thumb && a.tagline && a.city), 'public card fields');
assert(accounts.every((a) => String(a.thumb).indexOf('picsum.photos') < 0), 'no random picsum thumbs');
assert(accounts.every((a) => /unsplash\.com|rizq-assets\//.test(String(a.thumb))), 'thematic thumbs');
assert(ads.every((a) => (a.images||[]).every((u) => String(u).indexOf('picsum.photos') < 0)), 'no picsum ad images');
assert(ads.some((a) => Array.isArray(a.images) && a.images.length >= 2), 'multi-image ads');
assert(ads.some((a) => a.negotiable === true) && ads.some((a) => a.negotiable === false), 'price modes');
assert(ads.some((a) => a.installments === true), 'installment edge case');
assert(ads.every((a) => !/^RZQ-2026-1000\d$/i.test(a.id)), 'avoid filtered demo ad ids');

// Public filter parity with accountsManage / ads routes
const publicAcc = accounts.filter((a) => !a.suspended && !String(a.id).startsWith('acc_demo'));
const publicAds = ads.filter((a) => !String(a.accountId).startsWith('acc_demo') && !/^RZQ-2026-1000\d$/i.test(a.id));
assert(publicAcc.length === accounts.length);
assert(publicAds.length === ads.length);

const cleared = run(['--clear']);
assert.strictEqual(cleared.ok, true);
assert(cleared.accountsRemoved >= 10);
const left = store.readAccounts().filter((a) => a.graduationDemo);
assert.strictEqual(left.length, 0, 'clear removes graduation accounts');

// Re-seed for local demos after test
run([]);

console.log('OK: graduation seed smoke passed');
