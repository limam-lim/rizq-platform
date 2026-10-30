#!/usr/bin/env node
'use strict';
/**
 * حذف محتوى الديمو من قاعدة البيانات قبل الإطلاق بالبيانات الحقيقية.
 *
 *   node scripts/purge-demo.js           # dry-run — يعرض ما سيُحذف فقط
 *   node scripts/purge-demo.js --confirm # حذف فعلي + وسائط عبر objectStorage
 *
 * ما يُعتبر ديمو:
 *   - أي سجل موسوم is_demo / isDemo / graduationDemo، أو بمعرّفات الديمو المعروفة
 *     (acc_grad_* / acc_demo* / RZQ-2026-33xxx / RZQ-2026-1000x).
 *   - كل ما يخص حساب ديمو أو إعلان ديمو في بقية المجموعات: الكتالوج، المناقصات،
 *     الاستثمارات، الرسائل، التقييمات، طلبات الاشتراك، الباقات، الحصص، العملاء
 *     المحتملون، الزيارات، النقرات، الإشعارات، الترويج...
 *
 * لا يمس: فريق الإدارة، الأسرار، إعدادات الموقع (إلا وسوم أسعار الديمو)، سجلات
 * التدقيق، 2FA، OTP. الإعلانات/المحلات التجريبية المضمَّنة في صفحات الواجهة
 * تختفي تلقائياً عند ضبط تاريخ الإطلاق (launchDate) من لوحة الأدمن.
 *
 * لا تشغّل --confirm أثناء عرض التخرج.
 */

const confirm = process.argv.includes('--confirm');
const store = require('../db/platformStore');
const repos = require('../db/repos');
const objectStorage = require('../lib/objectStorage');

function isDemoRec(rec) {
  if (!rec || typeof rec !== 'object') return false;
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

// حقول تشير إلى حساب أو إعلان داخل السجلات المرتبطة
const ACCOUNT_REF_FIELDS = ['accountId', 'sellerAccountId', 'buyerAccountId', 'ownerId', 'ownerAccountId',
  'storeId', 'merchantId', 'investorAccountId', 'fromAccountId', 'toAccountId', 'targetAccountId'];
const AD_REF_FIELDS = ['adId', 'listingId', 'targetAdId', 'itemId'];

// مجموعات مرتبطة بالمستخدمين/المحتوى — تُفحص بحثاً عن بقايا الديمو
const RELATED_COLLECTIONS = [
  'packages', 'subRequests', 'adBoosts', 'messages', 'guestThreadSecrets', 'reviews', 'leads',
  'supportTickets', 'reports', 'deactivationRequests', 'adsRequests', 'investments', 'investmentEvents',
  'visits', 'contactClicks', 'businessHours', 'corpTeam', 'sectionInterest', 'contactFomo',
  'subscribers', 'serviceRequests', 'accountNotifications',
];

function refersTo(entryId, data, accIds, adIds) {
  if (accIds.has(String(entryId)) || adIds.has(String(entryId))) return true;
  if (isDemoRec(data)) return true;
  if (!data || typeof data !== 'object') return false;
  if (ACCOUNT_REF_FIELDS.some((f) => data[f] != null && accIds.has(String(data[f])))) return true;
  if (AD_REF_FIELDS.some((f) => data[f] != null && adIds.has(String(data[f])))) return true;
  if (Array.isArray(data.participants) && data.participants.some((p) => accIds.has(String(p && (p.id || p.accountId || p))))) return true;
  return false;
}

async function plan() {
  const accounts = ((await store.readAccounts()) || []).filter(isDemoRec);
  const accIds = new Set(accounts.map((a) => String(a.id)));
  const byDemoAcc = (r) => isDemoRec(r) || (r && accIds.has(String(r.accountId || '')));
  const ads = ((await store.readAds()) || []).filter(byDemoAcc);
  const adIds = new Set(ads.map((a) => String(a.id)));
  const catalog = ((await store.readCatalog()) || []).filter(byDemoAcc);
  const tenders = ((await store.readTenders()) || []).filter(byDemoAcc);

  const related = {};
  for (const name of RELATED_COLLECTIONS) {
    const coll = repos[name];
    if (!coll || typeof coll.listEntries !== 'function') continue;
    const entries = await coll.listEntries();
    const hits = entries.filter((e) => refersTo(e.id, e.data, accIds, adIds)).map((e) => e.id);
    if (hits.length) related[name] = hits;
  }
  return { accounts, ads, catalog, tenders, related };
}

function purgeMediaPrefix(prefix, id) {
  const safeId = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return { ok: false, bytesFreed: 0, error: 'empty_id' };
  return objectStorage.deletePrefixSync(prefix + safeId + '/');
}

async function main() {
  const p = await plan();
  const relatedCounts = {};
  Object.keys(p.related).forEach((k) => { relatedCounts[k] = p.related[k].length; });
  const summary = {
    mode: confirm ? 'confirm' : 'dry-run',
    accounts: p.accounts.length,
    ads: p.ads.length,
    catalog: p.catalog.length,
    tenders: p.tenders.length,
    related: relatedCounts,
    accountIds: p.accounts.map((a) => a.id),
    adIds: p.ads.map((a) => a.id),
  };

  console.log('══ purge-demo (' + summary.mode + ') ══');
  console.log(JSON.stringify(summary, null, 2));

  if (!confirm) {
    console.log('\nDry-run only — nothing deleted. Re-run with --confirm to delete (includes media).');
    console.log('Reminder: set the launch date in the admin panel to hide the built-in demo listings on public pages.');
    return;
  }

  let bytesFreed = 0;
  const errors = [];
  const media = (prefix, id) => {
    try {
      const r = purgeMediaPrefix(prefix, id);
      bytesFreed += Number(r.bytesFreed) || 0;
      if (!r.ok && !r.skipped) errors.push({ media: prefix + id, error: r.error });
    } catch (e) { errors.push({ media: prefix + id, error: e.message }); }
  };
  const del = async (label, fn) => {
    try { await fn(); } catch (e) { errors.push({ item: label, error: e.message }); }
  };

  for (const ad of p.ads) { media('ads/', ad.id); await del('ad:' + ad.id, () => store.deleteAd(ad.id)); }
  for (const it of p.catalog) { media('catalog/', it.id); await del('catalog:' + it.id, () => store.deleteCatalogItem(it.id)); }
  for (const t of p.tenders) { media('tenders/', t.id); await del('tender:' + t.id, () => store.deleteTender(t.id)); }
  for (const name of Object.keys(p.related)) {
    for (const id of p.related[name]) await del(name + ':' + id, () => repos[name].remove(id));
  }
  for (const a of p.accounts) await del('account:' + a.id, () => store.deleteAccount(a.id));

  // وسوم أسعار الديمو في site-config فقط (لا يمس بقية الإعدادات)
  try {
    const cfg = (await repos.getSiteConfig()) || {};
    if (cfg.prices && (cfg.prices.is_demo || cfg.prices.isDemo || cfg.prices.graduationDemoPrices)) {
      delete cfg.prices.is_demo;
      delete cfg.prices.isDemo;
      delete cfg.prices.graduationDemoPrices;
      await repos.saveSiteConfig(cfg);
      summary.pricesFlagsCleared = true;
    }
  } catch (e) { errors.push({ item: 'site-config', error: e.message }); }

  // تحقق: لا يبقى شيء
  const after = await plan();
  const left = after.accounts.length + after.ads.length + after.catalog.length + after.tenders.length
    + Object.values(after.related).reduce((n, l) => n + l.length, 0);

  console.log(JSON.stringify({ ok: errors.length === 0 && left === 0, deleted: true, bytesFreed, remaining: left, errors }, null, 2));
  console.log('Reminder: set the launch date in the admin panel to hide the built-in demo listings on public pages.');
  if (errors.length || left) process.exitCode = 1;
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => {
    try { require('../db/pool').end && require('../db/pool').end(); } catch (e) { /* ignore */ }
    setTimeout(() => process.exit(process.exitCode || 0), 200);
  });
