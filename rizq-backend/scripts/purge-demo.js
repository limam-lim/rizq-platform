#!/usr/bin/env node
'use strict';
/**
 * حذف محتوى الديمو الموسوم بـ is_demo / graduationDemo.
 *
 *   node scripts/purge-demo.js           # dry-run — يعرض ما سيُحذف فقط
 *   node scripts/purge-demo.js --confirm # حذف فعلي + وسائط عبر objectStorage
 *
 * لا تشغّل --confirm أثناء عرض التخرج.
 */
const path = require('path');

const confirm = process.argv.includes('--confirm');
const store = require('../db/platformStore');
const objectStorage = require('../lib/objectStorage');

function isDemoRec(rec) {
  if (!rec) return false;
  const id = String(rec.id || '');
  const acc = String(rec.accountId || '');
  return rec.is_demo === true
    || rec.isDemo === true
    || rec.graduationDemo === true
    || id.indexOf('acc_grad_') === 0
    || id.indexOf('acc_demo') === 0
    || acc.indexOf('acc_grad_') === 0
    || acc.indexOf('acc_demo') === 0
    || /^RZQ-2026-33\d{3}$/i.test(id)
    || /^RZQ-2026-1000\d/i.test(id);
}

function purgeMediaForAd(adId) {
  const safeId = String(adId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return { ok: false, bytesFreed: 0, error: 'empty_id' };
  return objectStorage.deletePrefixSync('ads/' + safeId + '/');
}

function plan() {
  const accounts = (store.readAccounts() || []).filter(isDemoRec);
  const ads = (store.readAds() || []).filter(isDemoRec);
  let catalog = [];
  try {
    catalog = (store.readCatalog() || []).filter(isDemoRec);
  } catch (e) { catalog = []; }
  return { accounts, ads, catalog };
}

function main() {
  const { accounts, ads, catalog } = plan();
  const summary = {
    mode: confirm ? 'confirm' : 'dry-run',
    accounts: accounts.length,
    ads: ads.length,
    catalog: catalog.length,
    mediaPrefixes: ads.map((a) => 'ads/' + a.id + '/'),
    accountIds: accounts.map((a) => a.id),
    adIds: ads.map((a) => a.id),
  };

  console.log('══ purge-demo (' + summary.mode + ') ══');
  console.log('accounts:', summary.accounts);
  console.log('ads:', summary.ads);
  console.log('catalog:', summary.catalog);
  console.log('media prefixes:', summary.mediaPrefixes.length);

  if (!confirm) {
    console.log('\nDry-run only — nothing deleted.');
    console.log('Re-run with --confirm to delete (includes media via objectStorage).');
    console.log(JSON.stringify({ ok: true, ...summary, deleted: false }, null, 2));
    return;
  }

  let bytesFreed = 0;
  const mediaErrors = [];
  ads.forEach((ad) => {
    try {
      const r = purgeMediaForAd(ad.id);
      bytesFreed += Number(r.bytesFreed) || 0;
      if (!r.ok && !r.skipped) mediaErrors.push({ adId: ad.id, error: r.error });
    } catch (e) {
      mediaErrors.push({ adId: ad.id, error: e.message });
    }
    store.deleteAd(ad.id);
  });
  catalog.forEach((item) => {
    try { store.deleteCatalogItem(item.id); } catch (e) { /* ignore */ }
  });
  accounts.forEach((a) => {
    store.deleteAccount(a.id);
  });

  // نظّف وسوم أسعار الديمو من site-config إن وُجدت (لا تمس الباقي)
  try {
    const repos = require('../db/repos');
    const cfg = repos.getSiteConfig() || {};
    if (cfg.prices && (cfg.prices.is_demo || cfg.prices.graduationDemoPrices)) {
      delete cfg.prices.is_demo;
      delete cfg.prices.isDemo;
      delete cfg.prices.graduationDemoPrices;
      repos.saveSiteConfig(cfg);
      summary.pricesFlagsCleared = true;
    }
  } catch (e) { /* ignore */ }

  console.log('\nDeleted.');
  console.log(JSON.stringify({
    ok: true,
    ...summary,
    deleted: true,
    bytesFreed,
    mediaErrors,
  }, null, 2));
}

main();
