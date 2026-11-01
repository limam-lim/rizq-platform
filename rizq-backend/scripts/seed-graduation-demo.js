#!/usr/bin/env node
'use strict';
/**
 * بذور عرض مشروع التخرج — محلات / معارض / مكاتب / إعلانات موريتانية واقعية.
 *
 *   node scripts/seed-graduation-demo.js           # زرع / تحديث
 *   node scripts/seed-graduation-demo.js --clear   # حذف سجلات التخرج فقط
 *
 * كل سجل يحمل is_demo:true + graduationDemo:true
 * ولا يستخدم بادئة acc_demo (تُستبعد من الـ API العام).
 * لا تشغّل هذا السكربت في الإنتاج الحقيقي.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FIXTURE = path.join(ROOT, 'fixtures', 'graduation-demo.json');
const clear = process.argv.includes('--clear');

const db = require('../db');
const store = require('../db/platformStore');

function loadFixture() {
  const raw = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  if (!raw || !Array.isArray(raw.accounts) || !Array.isArray(raw.ads)) {
    throw new Error('Invalid graduation-demo.json');
  }
  if (!Array.isArray(raw.catalog)) raw.catalog = [];
  return raw;
}

function isGradId(id) {
  const s = String(id || '');
  return s.indexOf('acc_grad_') === 0 || /^RZQ-2026-33\d{3}$/i.test(s);
}

function isDemoRecord(rec) {
  if (!rec) return false;
  return rec.is_demo === true
    || rec.isDemo === true
    || rec.graduationDemo === true
    || isGradId(rec.id)
    || String(rec.accountId || '').indexOf('acc_grad_') === 0
    || String(rec.id || '').indexOf('acc_demo') === 0;
}

async function clearGraduation() {
  const accounts = (await store.readAccounts()) || [];
  const ads = (await store.readAds()) || [];
  const catalog = (await store.readCatalog()) || [];
  let accRemoved = 0;
  let adRemoved = 0;
  let catalogRemoved = 0;
  const accIds = new Set();
  for (const a of accounts) {
    if (a && isDemoRecord(a)) {
      accIds.add(String(a.id));
      if (await store.deleteAccount(a.id)) accRemoved++;
    }
  }
  for (const ad of ads) {
    if (ad && isDemoRecord(ad)) {
      if (await store.deleteAd(ad.id)) adRemoved++;
    }
  }
  for (const it of catalog) {
    if (!it) continue;
    if (isDemoRecord(it) || accIds.has(String(it.accountId || ''))) {
      if (await store.deleteCatalogItem(it.id)) catalogRemoved++;
    }
  }
  return { accountsRemoved: accRemoved, adsRemoved: adRemoved, catalogRemoved };
}

async function seed() {
  const fixture = loadFixture();
  const now = new Date().toISOString();
  let accountsUpserted = 0;
  let adsUpserted = 0;

  for (let idx = 0; idx < fixture.accounts.length; idx++) {
    const row = fixture.accounts[idx];
    const approvedAt = new Date(Date.now() - (idx + 1) * 3 * 3600000).toISOString();
    const acc = Object.assign({}, row, {
      is_demo: true,
      isDemo: true,
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
    await store.upsertAccount(acc);
    accountsUpserted++;
  }

  for (let idx = 0; idx < fixture.ads.length; idx++) {
    const row = fixture.ads[idx];
    const createdAt = new Date(Date.now() - (idx + 1) * 2 * 3600000).toISOString();
    const ad = Object.assign({
      views: 40 + idx * 7,
      contacts: 2 + (idx % 5),
      images: [],
      emoji: '📦'
    }, row, {
      is_demo: true,
      isDemo: true,
      graduationDemo: true,
      demoSource: 'graduation',
      status: 'active',
      approvedAt: row.approvedAt || createdAt,
      createdAt: row.createdAt || createdAt,
      updatedAt: now,
      sellerName: (fixture.accounts.find((a) => a.id === row.accountId) || {}).name || ''
    });
    await store.upsertAd(ad);
    adsUpserted++;
  }

  let catalogUpserted = 0;
  for (let idx = 0; idx < fixture.catalog.length; idx++) {
    const row = fixture.catalog[idx];
    const createdAt = new Date(Date.now() - (idx + 1) * 1800000).toISOString();
    const item = Object.assign({
      kind: 'product',
      images: [],
      emoji: '📦',
    }, row, {
      is_demo: true,
      isDemo: true,
      graduationDemo: true,
      demoSource: 'graduation',
      status: 'active',
      createdAt: row.createdAt || createdAt,
      updatedAt: now,
      accountId: row.accountId,
      storeId: row.accountId,
    });
    await store.upsertCatalogItem(item);
    catalogUpserted++;
  }

  // وسّم أسعار نبضة السوق التجريبية إن وُجدت
  try {
    const repos = require('../db/repos');
    const cfg = (await repos.getSiteConfig()) || {};
    if (cfg.prices && typeof cfg.prices === 'object') {
      cfg.prices = Object.assign({}, cfg.prices, {
        is_demo: true,
        isDemo: true,
        graduationDemoPrices: true,
      });
      await repos.saveSiteConfig(cfg);
    }
  } catch (e) { /* ignore */ }

  // ضمان is_demo على أي سجل تخرج قديم خارج الـ fixture
  let backfilled = 0;
  const accounts = (await store.readAccounts()) || [];
  for (const a of accounts) {
    if (!a || !isDemoRecord(a)) continue;
    if (a.is_demo === true && a.isDemo === true && a.graduationDemo === true) continue;
    await store.upsertAccount(Object.assign({}, a, {
      is_demo: true,
      isDemo: true,
      graduationDemo: true,
      demoSource: a.demoSource || 'graduation',
      updatedAt: now,
    }));
    backfilled++;
  }
  const ads = (await store.readAds()) || [];
  for (const ad of ads) {
    if (!ad || !isDemoRecord(ad)) continue;
    if (ad.is_demo === true && ad.isDemo === true && ad.graduationDemo === true) continue;
    await store.upsertAd(Object.assign({}, ad, {
      is_demo: true,
      isDemo: true,
      graduationDemo: true,
      demoSource: ad.demoSource || 'graduation',
      updatedAt: now,
    }));
    backfilled++;
  }

  return {
    accountsUpserted,
    adsUpserted,
    catalogUpserted,
    backfilled,
    stores: fixture.accounts.filter((a) => a.type === 'store').length,
    corps: fixture.accounts.filter((a) => a.type === 'corp').length,
    offices: fixture.accounts.filter((a) => a.type === 'office').length,
    ads: fixture.ads.length,
    catalog: fixture.catalog.length,
    flagged: { is_demo: true, graduationDemo: true },
  };
}

async function main() {
  await db.ready();
  if (process.env.NODE_ENV === 'production' && process.env.RIZQ_ALLOW_GRADUATION_SEED !== '1') {
    console.error('Refusing to seed/clear graduation demo while NODE_ENV=production (set RIZQ_ALLOW_GRADUATION_SEED=1 to override).');
    process.exit(2);
  }
  if (clear) {
    const result = await clearGraduation();
    console.log(JSON.stringify({ ok: true, action: 'clear', ...result }, null, 2));
    return;
  }
  const result = await seed();
  console.log(JSON.stringify({ ok: true, action: 'seed', ...result }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
