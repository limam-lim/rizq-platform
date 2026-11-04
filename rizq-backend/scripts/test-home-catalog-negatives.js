#!/usr/bin/env node
/**
 * حالات سلبية — البند 3:
 * - categoryIlike لا يطابق name
 * - findByAlias لا ينسب Mini/Premium/Camion/Mixeur لشاومي
 */
'use strict';

const path = require('path');
const vm = require('vm');
const fs = require('fs');

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

function loadRizqBrands() {
  const code = fs.readFileSync(path.join(__dirname, '../../rizq_brands_catalog.js'), 'utf8');
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.RizqBrands;
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-home-catalog-negatives: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }

  const platformStore = require('../db/platformStore');
  const { buildHomeCatalog, clearHomeCatalogCache, matchesShowroomCat } = require('../services/homeCatalog');
  const RizqBrands = loadRizqBrands();

  console.log('— findByAlias word-boundary —');
  const negatives = ['Mini Cooper', 'Premium', 'Camion', 'Mixeur', 'mini', 'CAMION', 'mixeur blender'];
  negatives.forEach((t) => {
    const hit = RizqBrands.findByAlias(t);
    ok('no xiaomi for "' + t + '"', !hit || hit.id !== 'xiaomi', hit && hit.id);
  });
  ok('xiaomi exact', !!(RizqBrands.findByAlias('Xiaomi') && RizqBrands.findByAlias('Xiaomi').id === 'xiaomi'));
  ok('شاومي exact', !!(RizqBrands.findByAlias('هاتف شاومي جديد') && RizqBrands.findByAlias('هاتف شاومي جديد').id === 'xiaomi'));
  ok('redmi word', !!(RizqBrands.findByAlias('Redmi Note 12') && RizqBrands.findByAlias('Redmi Note 12').id === 'xiaomi'));

  console.log('— categoryIlike ignores name —');
  const stamp = Date.now();
  const storeId = 'acc_neg_store_' + stamp;
  const corpId = 'acc_neg_corp_' + stamp;
  await platformStore.upsertAccount({
    id: storeId, type: 'store', status: 'approved', suspended: 0,
    name: 'Neg Fashion', activityId: 'st_clothing', activity: 'ملابس',
  });
  await platformStore.upsertAccount({
    id: corpId, type: 'corp', status: 'approved', suspended: 0,
    name: 'Neg Motors', activity: 'سيارات',
  });

  const menInNameOnly = {
    id: 'CAT-NEG-' + stamp + '-MENNAME',
    accountId: storeId, kind: 'product', status: 'active',
    name: 'حقيبة سفر للرجال — جلد',
    brandId: 'guess', brandName: 'جيس',
    price: 9000,
    cat: 'إكسسوارات', category: 'إكسسوارات', categoryId: 'accessories',
    createdAt: new Date().toISOString(),
  };
  const menRealCat = {
    id: 'CAT-NEG-' + stamp + '-MENCAT',
    accountId: storeId, kind: 'product', status: 'active',
    name: 'قميص قطني',
    price: 5000,
    cat: 'أزياء رجالية', category: 'أزياء رجالية', categoryId: 'men-fashion',
    createdAt: new Date(Date.now() - 1000).toISOString(),
  };
  const carNamedFurniture = {
    id: 'CAT-NEG-' + stamp + '-CARNAME',
    accountId: corpId, kind: 'product', status: 'active',
    name: 'طاولة بجانب السيارة في الصالة',
    price: 40000,
    cat: 'أثاث', category: 'أثاث', categoryId: 'furniture',
    createdAt: new Date().toISOString(),
  };
  const realCar = {
    id: 'CAT-NEG-' + stamp + '-CAR',
    accountId: corpId, kind: 'product', status: 'active',
    name: 'تويوتا كورولا',
    brandId: 'toyota',
    price: 4500000,
    cat: 'سيارات', category: 'سيارات', categoryId: 'cars',
    createdAt: new Date(Date.now() - 500).toISOString(),
  };
  for (const it of [menInNameOnly, menRealCat, carNamedFurniture, realCar]) {
    await platformStore.upsertCatalogItem(it);
  }

  const joinMen = await platformStore.queryHomeCatalogJoin({
    accountTypes: ['store', 'shop', 'boutique'],
    categoryIlike: 'رجال',
    limit: 120,
  });
  const menIds = (joinMen.rows || []).map((r) => r.item && r.item.id);
  ok('name-only رجال excluded from categoryIlike', !menIds.includes(menInNameOnly.id), menIds);
  ok('real رجال category included', menIds.includes(menRealCat.id), menIds);

  const joinCars = await platformStore.queryHomeCatalogJoin({
    accountTypes: ['corp', 'company', 'showroom'],
    categoryIlike: 'سيارات',
    limit: 120,
  });
  const carIds = (joinCars.rows || []).map((r) => r.item && r.item.id);
  ok('furniture with سيارة in name excluded', !carIds.includes(carNamedFurniture.id), carIds);
  ok('real car category included', carIds.includes(realCar.id), carIds);

  if (typeof matchesShowroomCat === 'function') {
    ok('matchesShowroomCat furniture≠cars', !matchesShowroomCat(carNamedFurniture, 'cars'));
    ok('matchesShowroomCat real car', matchesShowroomCat(realCar, 'cars'));
  }

  clearHomeCatalogCache();
  async function caps(list) { return list; }
  async function gate() { return { contactsUnlocked: true, contactsLocked: false }; }
  const deps = {
    queryHomeCatalogJoin: platformStore.queryHomeCatalogJoin,
    applyPublicCatalogCaps: caps,
    resolveContactGate: gate,
    isDiamondActive: async () => false,
  };
  const srm = await buildHomeCatalog({ section: 'showrooms', cat: 'cars', limit: 48 }, deps);
  const srmIds = ((srm && srm.items) || []).map((it) => it.id);
  ok('home showrooms cars excludes name-only', !srmIds.includes(carNamedFurniture.id), srmIds);

  console.log(fail ? ('FAIL ' + fail + ' / pass ' + pass) : ('ALL OK / ' + pass));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
