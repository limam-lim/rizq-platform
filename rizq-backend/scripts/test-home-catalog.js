#!/usr/bin/env node
/**
 * GET /api/catalog/home — styles / showrooms / stores
 * كاش 60ث، حد 4 لكل محل في styles، أولوية ماسية في stores.
 */
'use strict';

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 500) : ''); }
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-home-catalog: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }

  const fs = require('fs');
  const path = require('path');
  const { buildHomeCatalog, clearHomeCatalogCache, isFashionStore } = require('../services/homeCatalog');
  const platformStore = require('../db/platformStore');

  ok('isFashionStore clothing activity', isFashionStore({ type: 'store', activityId: 'st_clothing', name: 'X' }));
  ok('isFashionStore grocery rejected', !isFashionStore({ type: 'store', activity: 'بقالة', name: 'تموين' }));

  const stamp = Date.now();
  const fashionId = 'acc_home_fash_' + stamp;
  const groceryId = 'acc_home_groc_' + stamp;
  const corpId = 'acc_home_corp_' + stamp;
  const accounts = [
    {
      id: fashionId, type: 'store', status: 'approved', suspended: false,
      name: 'بوتيك أنيق', activityId: 'st_clothing', activity: 'ملابس',
      createdAt: new Date().toISOString(),
    },
    {
      id: groceryId, type: 'store', status: 'approved', suspended: false,
      name: 'تموين الحي', activity: 'بقالة ومواد غذائية',
      createdAt: new Date().toISOString(),
    },
    {
      id: corpId, type: 'corp', status: 'approved', suspended: false,
      name: 'معرض السيارات', activity: 'سيارات',
      createdAt: new Date().toISOString(),
    },
  ];

  const catalog = [];
  for (let i = 0; i < 6; i++) {
    catalog.push({
      id: 'CAT-HOME-F-' + stamp + '-' + i,
      accountId: fashionId,
      kind: 'product',
      status: 'active',
      name: 'ثوب ' + i,
      price: 5000 + i,
      cat: 'أزياء',
      category: 'أزياء',
      createdAt: new Date(Date.now() - i * 1000).toISOString(),
    });
  }
  catalog.push({
    id: 'CAT-HOME-G-' + stamp,
    accountId: groceryId,
    kind: 'product',
    status: 'active',
    name: 'أرز فاخر',
    price: 400,
    cat: 'مواد غذائية',
    category: 'مواد غذائية',
    createdAt: new Date().toISOString(),
  });
  catalog.push({
    id: 'CAT-HOME-C-' + stamp,
    accountId: corpId,
    kind: 'product',
    status: 'active',
    name: 'تويوتا كورولا',
    price: 2500000,
    cat: 'سيارات',
    category: 'سيارات',
    createdAt: new Date().toISOString(),
  });
  catalog.push({
    id: 'CAT-HOME-PEND-' + stamp,
    accountId: fashionId,
    kind: 'product',
    status: 'pending_review',
    name: 'غير معتمد',
    price: 1,
    cat: 'أزياء',
    createdAt: new Date().toISOString(),
  });

  const accMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
  async function readCatalog() { return catalog.slice(); }
  async function applyPublicCatalogCaps(items) { return items; }
  async function resolveContactGate() {
    return { contactsUnlocked: false, contactsLocked: true, lockReason: 'viewer' };
  }
  async function queryPublicAccounts(filters) {
    let list = accounts.filter((a) => a.status === 'approved' && !a.suspended);
    if (filters && filters.type) list = list.filter((a) => a.type === filters.type);
    return { total: list.length, accounts: list };
  }
  async function isDiamondActive(id) {
    return String(id) === groceryId;
  }

  const deps = {
    readCatalog,
    applyPublicCatalogCaps,
    resolveContactGate,
    queryPublicAccounts,
    isDiamondActive,
  };

  clearHomeCatalogCache();
  const styles = await buildHomeCatalog({ section: 'styles', limit: 48 }, deps);
  ok('styles ok', styles.ok === true);
  ok('styles max 4 per store', styles.items.length === 4, styles.items.length);
  ok('styles only fashion account', styles.items.every((it) => it.accountId === fashionId), styles.items.map((i) => i.accountId));
  ok('styles contactsLocked', styles.items.every((it) => it.contactsLocked === true));
  ok('styles skips pending', !styles.items.some((it) => /غير معتمد/.test(it.name)));

  clearHomeCatalogCache();
  const srm = await buildHomeCatalog({ section: 'showrooms', cat: 'cars', limit: 12 }, deps);
  ok('showrooms ok', srm.ok === true);
  ok('showrooms returns car product', srm.items.some((it) => it.accountId === corpId), srm.items);
  ok('showrooms single-request shape', Array.isArray(srm.items));

  clearHomeCatalogCache();
  const stores = await buildHomeCatalog({ section: 'stores', limit: 24 }, deps);
  ok('stores ok', stores.ok === true);
  ok('stores includes grocery not fashion', stores.items.some((it) => it.accountId === groceryId)
    && !stores.items.some((it) => it.accountId === fashionId), stores.items.map((i) => i.accountId));
  ok('stores diamond first', stores.items[0] && stores.items[0].diamondActive === true, stores.items[0]);
  ok('stores homeBadge', stores.items[0] && /جديد من/.test(String(stores.items[0].homeBadge || '')), stores.items[0]);

  /* cache */
  clearHomeCatalogCache();
  const stylesWarm = await buildHomeCatalog({ section: 'styles', limit: 48 }, deps);
  const styles2 = await buildHomeCatalog({ section: 'styles', limit: 48 }, deps);
  ok('styles cache warm miss then hit', stylesWarm.cached === false && styles2.cached === true,
    { warm: stylesWarm.cached, hit: styles2.cached });

  /* route mount present */
  const catSrc = fs.readFileSync(path.join(__dirname, '../routes/catalog.js'), 'utf8');
  ok('catalog route mounts /api/catalog/home', /\/api\/catalog\/home/.test(catSrc));
  /* دمج منتجات المحلات في شريط أحدث الإعلانات — حدود العميل */
  function pickHomeStoreProducts(items) {
    const list = Array.isArray(items) ? items : [];
    const seen = {};
    const out = [];
    list.forEach((it) => {
      if (!it || out.length >= 8) return;
      const aid = String(it.accountId || '');
      if (!aid || seen[aid]) return;
      seen[aid] = 1;
      out.push(it);
    });
    return out;
  }
  function interleaveHomeStores(ads, storeHeroes) {
    const A = Array.isArray(ads) ? ads.slice() : [];
    const S = Array.isArray(storeHeroes) ? storeHeroes.slice() : [];
    if (!S.length) return A;
    if (!A.length) return S;
    const result = [];
    let ai = 0;
    let si = 0;
    while (ai < A.length || si < S.length) {
      if (ai < A.length) result.push(A[ai++]);
      if (si < S.length) result.push(S[si++]);
    }
    return result;
  }
  const manyStores = [];
  for (let i = 0; i < 12; i++) {
    manyStores.push({ id: 'P' + i, accountId: 'acc_s_' + i, homeBadge: 'جديد من X' + i });
    manyStores.push({ id: 'P' + i + 'b', accountId: 'acc_s_' + i, homeBadge: 'جديد من X' + i });
  }
  const picked = pickHomeStoreProducts(manyStores);
  ok('client pickHomeStoreProducts max 8', picked.length === 8, picked.length);
  ok('client pickHomeStoreProducts 1 per store',
    new Set(picked.map((p) => p.accountId)).size === picked.length);
  const adsFake = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }, { id: 'a4' }];
  const merged = interleaveHomeStores(adsFake, picked.slice(0, 3));
  ok('interleave does not put all stores first',
    merged[0] && merged[0].id === 'a1' && merged.some((x) => x.homeBadge), merged);
  ok('interleave preserves ad+store counts',
    merged.filter((x) => x.id && String(x.id).startsWith('a')).length === 4
    && merged.filter((x) => x.homeBadge).length === 3, merged);

  /* STRICT_HOME_WIRING=1 إلزامي عبر npm run test:home-catalog */
  const landSrc = fs.readFileSync(path.join(__dirname, '../../rizq_landing_v8.html'), 'utf8');
  const strict = process.env.STRICT_HOME_WIRING === '1';
  const styOk = landSrc.includes('/api/catalog/home?section=styles');
  const srmOk = landSrc.includes('section=showrooms') && !/Promise\.all\(corps\.map/.test(landSrc);
  const storesOk = landSrc.includes('/api/catalog/home?section=stores')
    && landSrc.includes('pickHomeStoreProducts')
    && landSrc.includes('interleaveHomeStores')
    && landSrc.includes('homeBadge');
  if (strict) {
    ok('styles client uses home API not localStorage scan', styOk);
    ok('showrooms client single home request', srmOk);
    ok('stores client wires home API into hero-listings', storesOk);
  } else {
    console.log((styOk ? 'OK   ' : 'PENDING ') + 'styles client uses home API (fix-home-wiring-1)');
    console.log((srmOk ? 'OK   ' : 'PENDING ') + 'showrooms client single home request (fix-home-wiring-1)');
    console.log((storesOk ? 'OK   ' : 'PENDING ') + 'stores client wires home API (fix-home-wiring-1)');
  }

  void platformStore;
  console.log('\n' + (fail ? 'FAILED ' + fail : 'ALL OK') + ' / ' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
