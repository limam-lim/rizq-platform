#!/usr/bin/env node
/**
 * إطلاق شهري فقط: ربعية/سنوية active:false (عدا vp-year)،
 * الكتالوج العام يخفيها، طلب الاشتراك → 409، تفعيل الأدمن يعيدها،
 * الاشتراك القائم يحتفظ بمزاياه، ونصوص الوكيل بلا ربعية/سنوية.
 */
'use strict';

const fs = require('fs');
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (e) { /* optional */ }
const { spawnHttpTestServer } = require('./_spawnHttpTestServer');

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

const INACTIVE_IDS = [
  'st-quart', 'st-year', 'of-quart', 'of-year', 'cp-quart', 'cp-year',
  'es-quart', 'es-year', 'tnd-quart', 'tnd-year', 'inv-quart', 'inv-year', 'yearly',
];
const MONTHLY_IDS = [
  'st-month', 'st-diam-std', 'st-diam-pro', 'st-trial',
  'of-month', 'of-diam-std', 'of-diam-pro', 'of-trial',
  'cp-month', 'cp-diam-std', 'cp-diam-pro', 'cp-trial',
  'es-month', 'es-diam-std', 'es-diam-pro', 'es-trial',
  'ind-free', 'ind-boost', 'ind-medium', 'ind-monthly',
  'tnd-month', 'tnd-trial', 'inv-month', 'inv-trial',
];

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-monthly-only: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }

  console.log('\n=== monthly-only packages ===\n');

  const {
    findCatalogPackage,
    getAllCatalogPackages,
    DEFAULT_STORE_PACKAGES,
    DEFAULT_OFFICE_PACKAGES,
    DEFAULT_CORP_PACKAGES,
    DEFAULT_ESTATE_PACKAGES,
    DEFAULT_TENDER_PACKAGES,
    DEFAULT_INVESTMENT_PACKAGES,
    DEFAULT_GENERAL_PACKAGES,
    DEFAULT_INDIVIDUAL_PACKAGES,
  } = require('../services/catalogConfig');
  const repos = require('../db/repos');

  const defaults = []
    .concat(DEFAULT_STORE_PACKAGES || [])
    .concat(DEFAULT_OFFICE_PACKAGES || [])
    .concat(DEFAULT_CORP_PACKAGES || [])
    .concat(DEFAULT_ESTATE_PACKAGES || [])
    .concat(DEFAULT_TENDER_PACKAGES || [])
    .concat(DEFAULT_INVESTMENT_PACKAGES || [])
    .concat(DEFAULT_GENERAL_PACKAGES || [])
    .concat(DEFAULT_INDIVIDUAL_PACKAGES || []);

  for (const id of INACTIVE_IDS) {
    const row = defaults.find((p) => p && p.id === id);
    ok('default ' + id + ' active:false', !!(row && row.active === false), row);
  }
  for (const id of MONTHLY_IDS) {
    const row = defaults.find((p) => p && p.id === id);
    ok('default ' + id + ' active:true', !!(row && row.active !== false), row);
  }

  const pkgCfgPath = path.join(__dirname, '../../rizq_packages_config.js');
  const pkgCfg = require(pkgCfgPath);
  const storeLive = pkgCfg.getCatalog('store', 'ar');
  ok('packages_config store omits st-quart', !storeLive.some((p) => p.id === 'st-quart'));
  ok('packages_config store omits st-year', !storeLive.some((p) => p.id === 'st-year'));
  ok('packages_config store keeps st-month', storeLive.some((p) => p.id === 'st-month'));
  const vpLive = pkgCfg.getCatalog('verified_plus', 'ar');
  ok('vp-year still offered', vpLive.some((p) => p.id === 'vp-year'));

  const publicAll = await getAllCatalogPackages();
  for (const id of INACTIVE_IDS) {
    ok('public catalog omits ' + id, !publicAll.some((p) => p.id === id));
  }
  ok('public catalog has st-month', publicAll.some((p) => p.id === 'st-month'));
  ok('public catalog has st-diam-pro', publicAll.some((p) => p.id === 'st-diam-pro'));
  ok('public catalog has ind-monthly', publicAll.some((p) => p.id === 'ind-monthly'));

  const inactiveHit = await findCatalogPackage('st-quart');
  ok('findCatalogPackage resolves inactive st-quart',
    inactiveHit && inactiveHit.active === false && Number(inactiveHit.price) === 5500, inactiveHit);

  const widgetEmbed = fs.readFileSync(path.join(__dirname, '../../rizq_widget_embed.js'), 'utf8');
  const chatSrc = fs.readFileSync(path.join(__dirname, '../services/widgetChat.js'), 'utf8');
  const policySrc = fs.readFileSync(pkgCfgPath, 'utf8');
  ok('widget embed fallback omits ربع سنوية', !/ربع سنوية/.test(widgetEmbed));
  ok('widgetChat has MONTHLY ONLY guard', /MONTHLY ONLY AT LAUNCH/.test(chatSrc));
  ok('packages policy has MONTHLY ONLY guard', /MONTHLY ONLY AT LAUNCH/.test(policySrc));
  ok('widget FR fallback omits trimestriel list', !/Forfaits Rizq : essai, mensuel, trimestriel/.test(widgetEmbed));

  const stamp = Date.now();
  const accountId = 'acc_monthly_' + stamp;
  const token = 'tok_monthly_' + stamp;
  await repos.accounts.upsert({
    id: accountId,
    type: 'store',
    status: 'approved',
    suspended: false,
    name: 'محل اختبار شهري',
    phone: '4' + String(stamp).slice(-7),
    email: 'monthly_' + stamp + '@test.local',
    accessToken: token,
    accessTokenExpiresAt: new Date(stamp + 86400000).toISOString(),
    createdAt: new Date(stamp).toISOString(),
  });

  let httpServer = null;
  try {
    httpServer = await spawnHttpTestServer();
    ok('spawned HTTP test server', true, 'port=' + httpServer.port);
  } catch (eSpawn) {
    ok('spawned HTTP test server', false, String(eSpawn && eSpawn.message || eSpawn));
    console.log('\nFAILED ' + fail + ' / ' + (pass + fail));
    process.exit(1);
  }

  const BASE = httpServer.base;
  async function call(body) {
    const r = await fetch(BASE + '/api/sub-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-account-token': token },
      body: JSON.stringify(body),
    });
    return { s: r.status, d: await r.json().catch(() => null) };
  }

  try {
    const inactive = await call({
      accountId,
      account: 'محل اختبار شهري',
      pkg: 'st-quart',
      packageId: 'st-quart',
      category: 'package',
    });
    ok('inactive package → 409', inactive.s === 409, inactive);
    ok('409 Arabic message', inactive.d && /غير متاحة حالياً/.test(String(inactive.d.message || '')), inactive.d);
    ok('409 French message present', inactive.d && /pas disponible/i.test(String(inactive.d.message_fr || '')), inactive.d);

    const cfg = (await repos.getSiteConfig()) || {};
    const packages = Object.assign({}, cfg.packages || {});
    const storePkgs = (Array.isArray(packages.store) ? packages.store : (DEFAULT_STORE_PACKAGES || []))
      .map((p) => Object.assign({}, p));
    const idx = storePkgs.findIndex((p) => p && p.id === 'st-quart');
    const baseQuart = (DEFAULT_STORE_PACKAGES || []).find((p) => p.id === 'st-quart') || {
      id: 'st-quart', name: 'ربعية', price: 5500, durationDays: 90,
    };
    if (idx >= 0) storePkgs[idx] = Object.assign({}, storePkgs[idx], { active: true, price: 5500 });
    else storePkgs.push(Object.assign({}, baseQuart, { active: true }));
    packages.store = storePkgs;
    await repos.saveSiteConfig(Object.assign({}, cfg, { packages }));

    const publicAfter = await getAllCatalogPackages();
    ok('admin enable restores st-quart in public catalog',
      publicAfter.some((p) => p.id === 'st-quart' && p.active !== false));

    const activeReq = await call({
      accountId,
      account: 'محل اختبار شهري',
      pkg: 'st-quart',
      packageId: 'st-quart',
      category: 'package',
    });
    ok('after admin enable, sub-request not 409', activeReq.s !== 409, activeReq);

    const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
    const existing = await repos.accounts.getById(accountId);
    await repos.accounts.upsert(Object.assign({}, existing || {}, {
      id: accountId,
      packageId: 'st-year',
      pkgName: 'سنوية',
      plan: 'سنوية',
      subscriptionStatus: 'active',
      periodEnd,
    }));
    const acc = await repos.accounts.getById(accountId);
    ok('existing yearly keeps packageId', acc && acc.packageId === 'st-year', acc && acc.packageId);
    ok('existing yearly keeps periodEnd', acc && String(acc.periodEnd) === periodEnd, acc && acc.periodEnd);
  } finally {
    if (httpServer && typeof httpServer.stop === 'function') await httpServer.stop();
  }

  console.log('\n' + (fail ? 'FAILED ' + fail : 'ALL OK') + ' / ' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
