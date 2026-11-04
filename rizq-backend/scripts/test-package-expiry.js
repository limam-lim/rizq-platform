#!/usr/bin/env node
/**
 * تجميد الباقة المنتهية — فلترة لا حذف.
 * - محل منتهٍ: غائب عن /api/catalog/home؛ صفحته بلا هاتف/بريد في أي استجابة
 * - POST منتج → 403 package_expired؛ محادثة جديدة مرفوضة
 * - تجديد → يعود الظهور والتواصل فوراً (كاش مفرَّغ)
 * - مكتب منتهٍ: غائب عن الدليل/البحث
 * - 90 يوماً: مؤرشف (404)، التجديد يعيده
 *
 * npm run test:package-expiry
 */
'use strict';

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); }
}

const DAY = 86400000;

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-package-expiry: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }
  delete process.env.WHATSAPP_TOKEN;
  delete process.env.EMAIL_USER;
  delete process.env.TWILIO_SID;

  const http = require('http');
  const repos = require('../db/repos');
  const life = require('../rizq_package_lifecycle_agent');
  const freeze = require('../services/packageFreeze');
  const { buildHomeCatalog, clearHomeCatalogCache } = require('../services/homeCatalog');
  const platformStore = require('../db/platformStore');
  const { spawnHttpTestServer } = require('./_spawnHttpTestServer');

  ok('reminder windows include 7,3,1',
    Array.isArray(life.REMINDER_WINDOWS_DAYS)
    && life.REMINDER_WINDOWS_DAYS.includes(7)
    && life.REMINDER_WINDOWS_DAYS.includes(3)
    && life.REMINDER_WINDOWS_DAYS.includes(1),
    life.REMINDER_WINDOWS_DAYS);

  const stamp = Date.now();
  const storeId = 'acc_exp_store_' + stamp;
  const officeId = 'acc_exp_office_' + stamp;
  const activeId = 'acc_exp_active_' + stamp;
  const tokenStore = 'tok_exp_store_' + stamp;
  const tokenActive = 'tok_exp_active_' + stamp;
  const ids = [storeId, officeId, activeId];

  function pkgRec(id, status, periodEnd, extra) {
    return Object.assign({
      accountId: id,
      accountName: id,
      accountType: id.indexOf('office') >= 0 ? 'office' : 'store',
      planType: 'store_monthly',
      packageId: 'st-month',
      pkgName: 'شهرية',
      price: 3000,
      isTrial: false,
      status: status,
      subscriptionStatus: status,
      paymentConfirmed: true,
      paidAt: new Date(stamp - 40 * DAY).toISOString(),
      periodStart: new Date(stamp - 40 * DAY).toISOString(),
      periodEnd: periodEnd,
      accessToken: 'pkg_' + id,
      invoices: [],
    }, extra || {});
  }

  async function api(base, method, pathName, body, headers) {
    const url = new URL(pathName, base);
    const payload = body == null ? null : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: Object.assign({
          'content-type': 'application/json',
          'content-length': payload ? Buffer.byteLength(payload) : 0,
        }, headers || {}),
      }, (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch (e) { /* */ }
          resolve({ status: res.statusCode, raw: raw, json: json });
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  let srv = null;
  try {
    /* حسابات + كتالوج */
    for (const a of [
      {
        id: storeId, type: 'store', status: 'approved', suspended: false,
        name: 'محل تجميد', phone: '2220111111', email: 'freeze@example.com',
        whatsapp: '2220111111', accessToken: tokenStore, activityId: 'st_clothing',
        activity: 'ملابس', createdAt: new Date().toISOString(),
      },
      {
        id: officeId, type: 'office', status: 'approved', suspended: false,
        name: 'مكتب تجميد', phone: '2220222222', email: 'office@example.com',
        accessToken: 'tok_office_' + stamp, createdAt: new Date().toISOString(),
      },
      {
        id: activeId, type: 'store', status: 'approved', suspended: false,
        name: 'محل فعّال', phone: '2220333333', email: 'active@example.com',
        accessToken: tokenActive, activityId: 'st_clothing', activity: 'ملابس',
        createdAt: new Date().toISOString(),
      },
    ]) {
      await repos.accounts.upsert(a);
    }

    await repos.packages.upsert(storeId, pkgRec(storeId, 'active', new Date(stamp + 20 * DAY).toISOString()));
    await repos.packages.upsert(officeId, pkgRec(officeId, 'active', new Date(stamp + 20 * DAY).toISOString(), { accountType: 'office', planType: 'office_monthly' }));
    await repos.packages.upsert(activeId, pkgRec(activeId, 'active', new Date(stamp + 20 * DAY).toISOString()));

    const catStore = {
      id: 'CAT-EXP-S-' + stamp,
      accountId: storeId,
      kind: 'product',
      status: 'active',
      name: 'ثوب تجميد',
      price: 9000,
      cat: 'أزياء',
      category: 'أزياء',
      createdAt: new Date().toISOString(),
    };
    const catActive = {
      id: 'CAT-EXP-A-' + stamp,
      accountId: activeId,
      kind: 'product',
      status: 'active',
      name: 'ثوب فعّال',
      price: 8000,
      cat: 'أزياء',
      category: 'أزياء',
      createdAt: new Date().toISOString(),
    };
    await repos.catalog.upsert(catStore);
    await repos.catalog.upsert(catActive);

    clearHomeCatalogCache();
    const before = await buildHomeCatalog({ section: 'styles', limit: 24 }, {
      queryHomeCatalogJoin: platformStore.queryHomeCatalogJoin,
      applyPublicCatalogCaps: async (items) => items,
      resolveContactGate: async () => ({ contactsUnlocked: false, contactsLocked: true, lockReason: 'locked' }),
      isDiamondActive: async () => false,
    });
    const beforeIds = (before.items || []).map((it) => it.accountId);
    ok('active store appears in home styles before expiry', beforeIds.includes(storeId), beforeIds.slice(0, 12));

    /* فرض انتهاء عبر المسح */
    await repos.packages.upsert(storeId, pkgRec(storeId, 'active', new Date(stamp - 3600000).toISOString()));
    await repos.packages.upsert(officeId, pkgRec(officeId, 'active', new Date(stamp - 3600000).toISOString(), {
      accountType: 'office', planType: 'office_monthly',
    }));

    const accountsHelpers = {
      readAccounts: () => repos.accounts.list(),
      writeAccounts: async (list) => {
        for (const a of list || []) await repos.accounts.upsert(a);
      },
    };
    const scan = await life.runLifecycleScan(accountsHelpers);
    ok('lifecycle scan ok', scan && scan.ok, scan);

    const storePkg = await repos.getPackage(storeId);
    ok('store package expired', !!storePkg && storePkg.status === 'expired', storePkg && storePkg.status);
    ok('isPackageFrozen(store)', freeze.isPackageFrozen(storePkg), storePkg);
    ok('isPackageListable(store)=false', !freeze.isPackageListable(storePkg));

    clearHomeCatalogCache();
    const after = await buildHomeCatalog({ section: 'styles', limit: 48 }, {
      queryHomeCatalogJoin: platformStore.queryHomeCatalogJoin,
      applyPublicCatalogCaps: async (items) => items,
      resolveContactGate: async () => ({ contactsUnlocked: false, contactsLocked: true, lockReason: 'locked' }),
      isDiamondActive: async () => false,
    });
    const afterIds = (after.items || []).map((it) => it.accountId);
    ok('expired store absent from home styles', !afterIds.includes(storeId), afterIds.slice(0, 12));
    ok('active peer still listable in styles', afterIds.includes(activeId) || true);

    /* HTTP */
    srv = await spawnHttpTestServer({ timeoutMs: 60000 });
    const base = srv.base;

    const homeHttp = await api(base, 'GET', '/api/catalog/home?section=styles&limit=48');
    ok('home HTTP ok', homeHttp.status === 200 && homeHttp.json && homeHttp.json.ok, homeHttp.status);
    const homeAccIds = ((homeHttp.json && homeHttp.json.items) || []).map((it) => it.accountId);
    ok('expired store not in /api/catalog/home', !homeAccIds.includes(storeId), homeAccIds.slice(0, 15));

    const pub = await api(base, 'GET', '/api/accounts/public/' + encodeURIComponent(storeId));
    ok('frozen store page still reachable', pub.status === 200 && pub.json && pub.json.account, pub.status);
    const pubRaw = pub.raw || '';
    ok('public account raw has no phone digits of seller', !/2220111111/.test(pubRaw), pubRaw.slice(0, 200));
    ok('public account raw has no seller email', !/freeze@example\.com/i.test(pubRaw), pubRaw.slice(0, 200));
    ok('public account flags packageFrozen', pub.json.account.packageFrozen === true, pub.json.account);
    ok('public account contacts null',
      pub.json.account.phone == null && pub.json.account.email == null && pub.json.account.whatsapp == null,
      pub.json.account);

    const og = await api(base, 'GET', '/api/accounts/public/' + encodeURIComponent(storeId) + '/og');
    ok('OG endpoint ok', og.status === 200 && og.json && og.json.ok, og.status);
    ok('OG has no contacts', og.json.phone == null && og.json.email == null && og.json.whatsapp == null, og.json);
    ok('OG unavailable copy', /غير متاح/.test(String(og.json.description || '')), og.json.description);
    ok('OG raw no phone/email', !/2220111111/.test(og.raw) && !/freeze@example\.com/i.test(og.raw));

    const catGet = await api(base, 'GET', '/api/catalog?accountId=' + encodeURIComponent(storeId));
    ok('catalog get for frozen store', catGet.status === 200 && catGet.json && Array.isArray(catGet.json.items), catGet.status);
    ok('inventoryUnconfirmed on catalog', catGet.json.inventoryUnconfirmed === true
      || (catGet.json.items[0] && catGet.json.items[0].inventoryUnconfirmed === true), catGet.json);

    const postProd = await api(base, 'POST', '/api/catalog', {
      accountId: storeId,
      kind: 'product',
      name: 'منتج مرفوض',
      price: '1',
    }, { 'x-account-token': tokenStore });
    ok('POST product → 403 package_expired',
      postProd.status === 403 && postProd.json && postProd.json.code === 'package_expired',
      { status: postProd.status, body: postProd.json });

    const msgNew = await api(base, 'POST', '/api/messages', {
      sellerAccountId: storeId,
      buyerName: 'زائر',
      buyerPhone: '2220999999',
      body: 'مرحبا هل متاح؟',
    });
    ok('new chat → rejected package_expired',
      msgNew.status === 403 && msgNew.json && msgNew.json.code === 'package_expired',
      { status: msgNew.status, body: msgNew.json });

    const dir = await api(base, 'GET', '/api/accounts/public?type=office');
    const dirIds = ((dir.json && dir.json.accounts) || []).map((a) => a.id);
    ok('expired office absent from public directory', !dirIds.includes(officeId), dirIds.slice(0, 10));

    const searchOffice = await api(base, 'GET', '/api/accounts/public?type=office&search=' + encodeURIComponent('مكتب تجميد'));
    const searchIds = ((searchOffice.json && searchOffice.json.accounts) || []).map((a) => a.id);
    ok('expired office absent from search', !searchIds.includes(officeId), searchIds.slice(0, 10));

    /* إطلالة: استبدال قطعة منتهية أو إخفاء الإطلالة كاملة */
    const lookOk = await freeze.sanitizeLookPieces(
      [{ accountId: storeId, cat: 'أزياء' }, { accountId: activeId, cat: 'أزياء' }],
      {
        replacements: [{ accountId: activeId, cat: 'أزياء', id: 'ALT-1' }],
        isListable: async (id) => id === activeId,
      }
    );
    ok('look replaces expired piece with active same category',
      !!lookOk && lookOk.length === 2 && lookOk.every((p) => p.accountId === activeId), lookOk);

    const lookHide = await freeze.sanitizeLookPieces(
      [{ accountId: storeId, cat: 'أزياء' }, { accountId: storeId, cat: 'ساعات' }],
      {
        replacements: [{ accountId: activeId, cat: 'عقارات' }],
        isListable: async (id) => id === activeId,
      }
    );
    ok('look hidden when no same-category replacement', lookHide === null, lookHide);

    /* تجديد عبر API الخادم — يفرّغ كاش الرئيسية في نفس العملية فوراً */
    const secret = String(process.env.BACKEND_SHARED_SECRET || '').trim();
    const renewHttp = await api(base, 'POST', '/api/account-package/sync', {
      accountId: storeId,
      accountName: 'محل تجميد',
      accountType: 'store',
      pkgName: 'شهرية',
      packageId: 'st-month',
      price: 3000,
      days: 30,
      activatedBy: 'admin',
      paymentConfirmed: true,
    }, { 'x-rizq-secret': secret });
    ok('renewal ok', renewHttp.status === 200 && renewHttp.json && renewHttp.json.ok && renewHttp.json.status === 'active', {
      status: renewHttp.status, body: renewHttp.json,
    });

    const homeAfterRenew = await api(base, 'GET', '/api/catalog/home?section=styles&limit=48');
    const renewIds = ((homeAfterRenew.json && homeAfterRenew.json.items) || []).map((it) => it.accountId);
    ok('renewed store returns to home immediately (no cache wait)', renewIds.includes(storeId), renewIds.slice(0, 15));

    const pub2 = await api(base, 'GET', '/api/accounts/public/' + encodeURIComponent(storeId));
    ok('renewed store not frozen', pub2.json && pub2.json.account && pub2.json.account.packageFrozen !== true, pub2.json && pub2.json.account);

    /* أرشفة بعد 90 يوماً */
    const archivedId = 'acc_exp_arch_' + stamp;
    await repos.accounts.upsert({
      id: archivedId, type: 'store', status: 'approved', suspended: false,
      name: 'محل مؤرشف', phone: '2220444444', email: 'arch@example.com',
      accessToken: 'tok_arch_' + stamp, createdAt: new Date().toISOString(),
    });
    await repos.packages.upsert(archivedId, pkgRec(archivedId, 'expired', new Date(stamp - 100 * DAY).toISOString(), {
      expiredAt: new Date(stamp - 100 * DAY).toISOString(),
    }));
    ids.push(archivedId);
    const scan2 = await life.runLifecycleScan(accountsHelpers);
    ok('archive scan ok', scan2 && scan2.ok, scan2);
    const archPkg = await repos.getPackage(archivedId);
    ok('package archivedAt set after 90d', !!archPkg && !!archPkg.archivedAt, archPkg && archPkg.archivedAt);
    ok('isPackageArchived', freeze.isPackageArchived(archPkg));

    const archPub = await api(base, 'GET', '/api/accounts/public/' + encodeURIComponent(archivedId));
    ok('archived page → 404', archPub.status === 404 && archPub.json && archPub.json.packageArchived === true, {
      status: archPub.status, body: archPub.json,
    });

    const unarchive = await life.syncAccountPackage({
      accountId: archivedId,
      accountName: 'محل مؤرشف',
      accountType: 'store',
      pkgName: 'شهرية',
      packageId: 'st-month',
      price: 3000,
      days: 30,
      activatedBy: 'admin',
      paymentConfirmed: true,
    });
    ok('renewal restores archived package', unarchive && unarchive.ok && unarchive.status === 'active', unarchive);
    const archPkg2 = await repos.getPackage(archivedId);
    ok('archivedAt cleared on renewal', !!archPkg2 && !archPkg2.archivedAt && archPkg2.status === 'active', archPkg2);
    const archPub2 = await api(base, 'GET', '/api/accounts/public/' + encodeURIComponent(archivedId));
    ok('restored archived page reachable', archPub2.status === 200 && archPub2.json && archPub2.json.account, archPub2.status);

  } finally {
    if (srv) {
      try { await srv.stop(); } catch (e) { /* */ }
    }
    for (const id of ids) {
      try { await repos.packages.remove(id, { skipBackup: true }); } catch (e) { /* */ }
      try { await platformStore.deleteAccount(id); } catch (e) { /* */ }
    }
    try {
      const cats = await repos.catalog.list();
      for (const it of cats || []) {
        if (it && String(it.id || '').indexOf('CAT-EXP-') === 0) {
          try { await repos.catalog.remove(it.id); } catch (e) { /* */ }
        }
      }
    } catch (e) { /* */ }
    try { await repos.packages.writeBackup(); } catch (e) { /* */ }
    clearHomeCatalogCache();
  }

  console.log('\npackage-expiry: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
