#!/usr/bin/env node
'use strict';
/**
 * بذور عرض مشروع التخرج — محلات / معارض / مكاتب / إعلانات موريتانية واقعية.
 *
 *   node scripts/seed-graduation-demo.js           # زرع / تحديث
 *   node scripts/seed-graduation-demo.js --clear   # حذف سجلات التخرج فقط
 *
 * كل سجل يحمل graduationDemo:true ولا يستخدم بادئة acc_demo (تُستبعد من الـ API العام).
 * لا تشغّل هذا السكربت في الإنتاج الحقيقي.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FIXTURE = path.join(ROOT, 'fixtures', 'graduation-demo.json');
const clear = process.argv.includes('--clear');

const store = require('../db/platformStore');

function loadFixture() {
  const raw = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  if (!raw || !Array.isArray(raw.accounts) || !Array.isArray(raw.ads)) {
    throw new Error('Invalid graduation-demo.json');
  }
  return raw;
}

function isGradId(id) {
  const s = String(id || '');
  return s.indexOf('acc_grad_') === 0 || /^RZQ-2026-33\d{3}$/i.test(s);
}

function clearGraduation() {
  const accounts = store.readAccounts();
  const ads = store.readAds();
  let accRemoved = 0;
  let adRemoved = 0;
  accounts.forEach((a) => {
    if (a && (a.graduationDemo || isGradId(a.id))) {
      if (store.deleteAccount(a.id)) accRemoved++;
    }
  });
  ads.forEach((ad) => {
    if (ad && (ad.graduationDemo || isGradId(ad.id) || String(ad.accountId || '').indexOf('acc_grad_') === 0)) {
      if (store.deleteAd(ad.id)) adRemoved++;
    }
  });
  return { accountsRemoved: accRemoved, adsRemoved: adRemoved };
}

function seed() {
  const fixture = loadFixture();
  const now = new Date().toISOString();
  let accountsUpserted = 0;
  let adsUpserted = 0;

  fixture.accounts.forEach((row, idx) => {
    const approvedAt = new Date(Date.now() - (idx + 1) * 3 * 3600000).toISOString();
    const acc = Object.assign({}, row, {
      graduationDemo: true,
      demoSource: 'graduation',
      status: 'approved',
      suspended: false,
      approvedAt: row.approvedAt || approvedAt,
      createdAt: row.createdAt || approvedAt,
      updatedAt: now,
      accessToken: row.accessToken || ('grad_' + crypto.randomBytes(12).toString('hex')),
      verifiedPlusExpiresAt: row.verifiedPlus
        ? new Date(Date.now() + 180 * 86400000).toISOString()
        : undefined
    });
    store.upsertAccount(acc);
    accountsUpserted++;
  });

  fixture.ads.forEach((row, idx) => {
    const createdAt = new Date(Date.now() - (idx + 1) * 2 * 3600000).toISOString();
    const ad = Object.assign({
      views: 40 + idx * 7,
      contacts: 2 + (idx % 5),
      images: [],
      emoji: '📦'
    }, row, {
      graduationDemo: true,
      demoSource: 'graduation',
      status: 'active',
      approvedAt: row.approvedAt || createdAt,
      createdAt: row.createdAt || createdAt,
      updatedAt: now,
      sellerName: (fixture.accounts.find((a) => a.id === row.accountId) || {}).name || ''
    });
    store.upsertAd(ad);
    adsUpserted++;
  });

  return {
    accountsUpserted,
    adsUpserted,
    stores: fixture.accounts.filter((a) => a.type === 'store').length,
    corps: fixture.accounts.filter((a) => a.type === 'corp').length,
    offices: fixture.accounts.filter((a) => a.type === 'office').length,
    ads: fixture.ads.length
  };
}

function main() {
  if (process.env.NODE_ENV === 'production' && process.env.RIZQ_ALLOW_GRADUATION_SEED !== '1') {
    console.error('Refusing to seed/clear graduation demo while NODE_ENV=production (set RIZQ_ALLOW_GRADUATION_SEED=1 to override).');
    process.exit(2);
  }
  if (clear) {
    const result = clearGraduation();
    console.log(JSON.stringify({ ok: true, action: 'clear', ...result }, null, 2));
    return;
  }
  const result = seed();
  console.log(JSON.stringify({ ok: true, action: 'seed', ...result }, null, 2));
}

main();
