#!/usr/bin/env node
'use strict';
/**
 * بذور عرض / بروفة الإطلاق — محلات / معارض / مكاتب / عقارات / إعلانات / أسعار سوق.
 *
 *   node scripts/seed-graduation-demo.js           # زرع / تحديث
 *   node scripts/seed-graduation-demo.js --clear   # حذف سجلات التخرج فقط (+ إزالة أسعار الغذاء/المحروقات المزروعة إن وُسمت)
 *
 * كل سجل يحمل graduationDemo:true — بيانات وهمية للبروفة فقط.
 * امسحها قبل الإطلاق الحقيقي، ثم أدخل بيانات التجار الحقيقيين ~15 يوماً قبل الانطلاق.
 * لا تشغّل هذا السكربت في الإنتاج الحقيقي دون RIZQ_ALLOW_GRADUATION_SEED=1.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FIXTURE = path.join(ROOT, 'fixtures', 'graduation-demo.json');
const clear = process.argv.includes('--clear');

const store = require('../db/platformStore');
const repos = require('../db/repos');

/** أسعار سوق وهمية تقريبية (MRU) — للواجهة فقط، تُمسح عند --clear */
const DEMO_FOOD_PRICES = [
  { icon: '🍚', name: 'أرز بسمتي (كغ)', price: 280, unit: 'كغ', trend: 'flat' },
  { icon: '🥖', name: 'خبز فرنسي', price: 20, unit: 'رغيف', trend: 'flat' },
  { icon: '🛢️', name: 'زيت طبخ (لتر)', price: 450, unit: 'لتر', trend: 'up' },
  { icon: '🍬', name: 'سكر (كغ)', price: 220, unit: 'كغ', trend: 'flat' },
  { icon: '🥛', name: 'حليب سائل (لتر)', price: 180, unit: 'لتر', trend: 'down' },
  { icon: '🧅', name: 'بصل (كغ)', price: 150, unit: 'كغ', trend: 'up' },
  { icon: '🥔', name: 'بطاطس (كغ)', price: 160, unit: 'كغ', trend: 'flat' },
  { icon: '🍅', name: 'طماطم (كغ)', price: 200, unit: 'كغ', trend: 'up' },
  { icon: '🫘', name: 'فاصوليا بيضاء (كغ)', price: 320, unit: 'كغ', trend: 'flat' },
  { icon: '🥩', name: 'لحم ضأن (كغ)', price: 1800, unit: 'كغ', trend: 'up' },
];

const DEMO_FUEL_PRICES = [
  { icon: '⛽', name: 'بنزين سوبر', price: 46, unit: 'لتر', trend: 'flat' },
  { icon: '🛢️', name: 'مازوت / ديزل', price: 48, unit: 'لتر', trend: 'flat' },
  { icon: '🧴', name: 'غاز طبخ (قارورة 12كغ)', price: 1800, unit: 'قارورة', trend: 'up' },
  { icon: '🚗', name: 'زيت محرك 5W-30', price: 950, unit: 'لتر', trend: 'flat' },
];

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

function seedMarketPrices() {
  const current = repos.getSiteConfig() || {};
  const prev = (current.prices && typeof current.prices === 'object') ? current.prices : {};
  const next = Object.assign({}, current, {
    prices: {
      food: DEMO_FOOD_PRICES.map((x) => Object.assign({}, x)),
      fuel: DEMO_FUEL_PRICES.map((x) => Object.assign({}, x)),
      currencies: Array.isArray(prev.currencies) ? prev.currencies : [],
      currenciesUpdatedAt: prev.currenciesUpdatedAt || undefined,
      updatedAt: new Date().toISOString(),
      graduationDemoPrices: true,
    },
  });
  repos.saveSiteConfig(next);
  return {
    food: DEMO_FOOD_PRICES.length,
    fuel: DEMO_FUEL_PRICES.length,
    currenciesKept: Array.isArray(prev.currencies) ? prev.currencies.length : 0,
  };
}

function clearMarketPricesIfDemo() {
  const current = repos.getSiteConfig() || {};
  const prices = current.prices;
  if (!prices || !prices.graduationDemoPrices) {
    return { clearedPrices: false };
  }
  const next = Object.assign({}, current, {
    prices: {
      food: [],
      fuel: [],
      currencies: Array.isArray(prices.currencies) ? prices.currencies : [],
      currenciesUpdatedAt: prices.currenciesUpdatedAt || undefined,
      updatedAt: new Date().toISOString(),
    },
  });
  delete next.prices.graduationDemoPrices;
  repos.saveSiteConfig(next);
  return { clearedPrices: true };
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
  const priceResult = clearMarketPricesIfDemo();
  return { accountsRemoved: accRemoved, adsRemoved: adRemoved, ...priceResult };
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
      fictional: true,
      status: 'approved',
      suspended: false,
      approvedAt: row.approvedAt || approvedAt,
      createdAt: row.createdAt || approvedAt,
      updatedAt: now,
      accessToken: row.accessToken || ('grad_' + crypto.randomBytes(12).toString('hex')),
      verifiedPlusExpiresAt: row.verifiedPlus
        ? new Date(Date.now() + 180 * 86400000).toISOString()
        : undefined,
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
      emoji: '📦',
    }, row, {
      graduationDemo: true,
      demoSource: 'graduation',
      fictional: true,
      status: 'active',
      approvedAt: row.approvedAt || createdAt,
      createdAt: row.createdAt || createdAt,
      updatedAt: now,
      sellerName: (fixture.accounts.find((a) => a.id === row.accountId) || {}).name || '',
    });
    store.upsertAd(ad);
    adsUpserted++;
  });

  const prices = seedMarketPrices();

  return {
    accountsUpserted,
    adsUpserted,
    stores: fixture.accounts.filter((a) => a.type === 'store').length,
    corps: fixture.accounts.filter((a) => a.type === 'corp').length,
    offices: fixture.accounts.filter((a) => a.type === 'office').length,
    estateOffices: fixture.accounts.filter((a) => a.type === 'office' && /real|عقار|estate/i.test(String(a.activityId || a.activity || ''))).length,
    ads: fixture.ads.length,
    prices,
    note: 'FICTIONAL seed — wipe with --clear before real launch',
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
