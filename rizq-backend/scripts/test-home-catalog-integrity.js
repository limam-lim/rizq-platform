#!/usr/bin/env node
/**
 * يثبت أن JOIN /api/catalog/home يحافظ على brandId/category/price لكل منتج
 * كما في سجله الأصلي (لا خلط حقول بين الصفوف).
 */
'use strict';

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-home-catalog-integrity: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }

  const platformStore = require('../db/platformStore');
  const { buildHomeCatalog, clearHomeCatalogCache } = require('../services/homeCatalog');

  const stamp = Date.now();
  const fashionId = 'acc_int_fash_' + stamp;
  const corpId = 'acc_int_corp_' + stamp;

  await platformStore.upsertAccount({
    id: fashionId, type: 'store', status: 'approved', suspended: 0,
    name: 'Integrity Fashion', activityId: 'st_clothing', activity: 'ملابس',
  });
  await platformStore.upsertAccount({
    id: corpId, type: 'corp', status: 'approved', suspended: 0,
    name: 'Integrity Motors', activity: 'سيارات',
  });

  const seeds = [
    {
      id: 'CAT-INT-' + stamp + '-A', accountId: fashionId, kind: 'product', status: 'active',
      name: 'جاكيت صوف', brandId: 'zara', brandName: 'زارا', brandNameFr: 'Zara',
      price: 22000, cat: 'أزياء', category: 'أزياء', categoryId: 'fashion',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'CAT-INT-' + stamp + '-B', accountId: fashionId, kind: 'product', status: 'active',
      name: 'ساعة كاسيو', brandId: 'casio', brandName: 'كاسيو', brandNameFr: 'Casio',
      price: 28000, cat: 'إكسسوارات', category: 'إكسسوارات', categoryId: 'accessories',
      createdAt: new Date(Date.now() - 1000).toISOString(),
    },
    {
      id: 'CAT-INT-' + stamp + '-C', accountId: corpId, kind: 'product', status: 'active',
      name: 'تويوتا كورولا', brandId: 'toyota', brandName: 'تويوتا', brandNameFr: 'Toyota',
      price: 4500000, cat: 'سيارات', category: 'سيارات', categoryId: 'cars',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'CAT-INT-' + stamp + '-D', accountId: corpId, kind: 'product', status: 'active',
      name: 'إطارات SUV', brandId: '', brandName: '', price: 68000,
      cat: 'سيارات', category: 'سيارات', categoryId: 'cars',
      createdAt: new Date(Date.now() - 500).toISOString(),
    },
  ];
  for (const it of seeds) await platformStore.upsertCatalogItem(it);

  const byId = Object.fromEntries(seeds.map((s) => [s.id, s]));

  clearHomeCatalogCache();
  async function caps(list) { return list; }
  async function gate() { return { contactsUnlocked: true, contactsLocked: false }; }
  async function diamond() { return false; }
  const deps = {
    queryHomeCatalogJoin: platformStore.queryHomeCatalogJoin,
    applyPublicCatalogCaps: caps,
    resolveContactGate: gate,
    isDiamondActive: diamond,
  };

  const styles = await buildHomeCatalog({ section: 'styles', limit: 48 }, deps);
  const showrooms = await buildHomeCatalog({ section: 'showrooms', cat: 'cars', limit: 48 }, deps);

  const joined = []
    .concat((styles && styles.items) || [], (showrooms && showrooms.items) || [])
    .filter((it) => it && byId[it.id]);

  ok('found seeded items via home catalog', joined.length >= 3, { n: joined.length });

  for (const it of joined) {
    const src = byId[it.id];
    ok(it.id + ' brandId', String(it.brandId || '') === String(src.brandId || ''), { got: it.brandId, want: src.brandId });
    ok(it.id + ' brandName', String(it.brandName || '') === String(src.brandName || ''), { got: it.brandName, want: src.brandName });
    ok(it.id + ' price', Number(it.price) === Number(src.price), { got: it.price, want: src.price });
    const catGot = String(it.cat || it.category || '');
    const catWant = String(src.cat || src.category || '');
    ok(it.id + ' category', catGot === catWant || catGot.indexOf(catWant) >= 0, { got: catGot, want: catWant });
  }

  /* تأكد أن جاكيت زارا لم يُنسَب لكاسيو */
  const jacket = joined.find((it) => it.id === seeds[0].id);
  if (jacket) {
    ok('jacket not casio', String(jacket.brandId) === 'zara' && Number(jacket.price) === 22000);
  }

  console.log(fail ? ('FAIL ' + fail + ' / pass ' + pass) : ('ALL OK / ' + pass));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
