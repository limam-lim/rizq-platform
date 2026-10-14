#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const brandsSrc = fs.readFileSync(path.join(__dirname, '..', 'rizq_brands_catalog.js'), 'utf8');
const dynSrc = fs.readFileSync(path.join(__dirname, '..', 'rizq_dyn_filters.js'), 'utf8');
const catSrc = fs.readFileSync(path.join(__dirname, '..', 'rizq_categories_config.js'), 'utf8');
const sandbox = { window: {}, console, document: { getElementById: () => null } };
sandbox.window = sandbox;
vm.runInNewContext(brandsSrc, sandbox);
vm.runInNewContext(catSrc, sandbox);
vm.runInNewContext(dynSrc, sandbox);
const D = sandbox.RizqDynFilters;
assert(D, 'RizqDynFilters export');

const REQUIRED_PROFILES = [
  'سيارات', 'شاحنات', 'إلكترونيات', 'معدات-منزل', 'أثاث', 'بناء', 'طاقة',
  'مكائن-صناعية', 'تأمين', 'أزياء', 'ذهب', 'عقارات', 'أغذية', 'ماشية',
  'صحة', 'رحلات', 'خدمات', 'وظائف', 'تجارة', 'رياضة', 'تعليم', 'فنون'
];
REQUIRED_PROFILES.forEach(function (k) {
  assert(D.profileFor(k), 'profile missing: ' + k);
});

/* critical bug: appliances must NOT inherit phone filters */
const appl = D.profileFor('معدات-منزل');
assert(appl, 'home appliances profile');
assert.notStrictEqual(D.profileFor('معدات-منزل'), D.profileFor('إلكترونيات'), 'appliances ≠ electronics');
const applFieldIds = (appl.fields || []).map(function (f) { return f.id; });
assert(applFieldIds.indexOf('variant') < 0, 'no phone variant on appliances');
assert(applFieldIds.indexOf('storage') < 0, 'no GB storage on appliances');
assert(applFieldIds.indexOf('fridgeType') >= 0, 'fridge type present');
assert(applFieldIds.indexOf('washLoad') >= 0, 'wash load present');
assert(applFieldIds.indexOf('acPower') >= 0, 'AC power present');

assert.strictEqual(D.profileFor('أجهزة منزلية'), appl, 'alias أجهزة منزلية → معدات-منزل');
assert.strictEqual(D.profileFor('معدات المنازل'), appl, 'alias معدات المنازل → معدات-منزل');

/* electronics phone filters gated to phone/tablet/watch subs */
const elec = D.profileFor('إلكترونيات');
const variant = (elec.fields || []).find(function (f) { return f.id === 'variant'; });
const storage = (elec.fields || []).find(function (f) { return f.id === 'storage'; });
assert(variant && variant.whenSubcat, 'variant gated');
assert(storage && storage.whenSubcat, 'storage gated');
assert(D.fieldVisible(variant, 'هواتف ذكية'), 'variant visible for phones');
assert(!D.fieldVisible(variant, 'لابتوب وحاسوب'), 'variant hidden for laptops');
assert(!D.fieldVisible(variant, 'أجهزة مطبخ صغيرة'), 'variant hidden for kitchen appliances');
assert(D.fieldVisible(storage, 'هواتف ذكية'), 'storage for phones');
assert(D.fieldVisible(storage, 'لابتوب وحاسوب'), 'storage for laptops');

const fridgeCap = (appl.fields || []).find(function (f) { return f.id === 'capacityL'; });
assert(D.fieldVisible(fridgeCap, 'ثلاجات ومجمدات'), 'capacity for fridges');
assert(!D.fieldVisible(fridgeCap, 'مكانس وغسيل'), 'capacity hidden for vacuums');
const vacType = (appl.fields || []).find(function (f) { return f.id === 'vacType'; });
assert(D.fieldVisible(vacType, 'مكانس وغسيل'), 'vac type for vacuums');
assert(!D.fieldVisible(vacType, 'ثلاجات ومجمدات'), 'vac type hidden for fridges');

assert.strictEqual(D.profileFor(''), null);

const car = {
  title: 'تويوتا كامري 2021', year: 2021, mileageKm: 65000,
  gearbox: 'auto', fuel: 'petrol', brandId: 'toyota'
};
assert(D.matches(car, { yearFrom: '2020', yearTo: '2022' }));
assert(!D.matches(car, { yearFrom: '2022' }));
assert(D.matches(car, { gearbox: 'auto' }));
assert(!D.matches(car, { gearbox: 'manual' }));
assert(D.matches(car, { kmMax: '70000' }));
assert(!D.matches(car, { kmMax: '10000' }));

const phone = { title: 'آيفون 15 برو ماكس', phoneVariant: 'pro-max', storageGb: 256 };
assert(D.matches(phone, { variant: 'pro-max' }));
assert(!D.matches(phone, { variant: 'pro' }));
assert(D.matches(phone, { storage: '256' }));

const dig = { title: 'حفارة', hoursWorked: 3200, subcat: 'معدات بناء' };
assert(D.matches(dig, { hoursMax: '5000' }));
assert(!D.matches(dig, { hoursMax: '1000' }));

const fridge = { title: 'ثلاجة سامسونج 350 لتر No Frost', capacityL: 350, fridgeFeat: 'nofrost' };
assert(D.matches(fridge, { capacityL: '300-400' }));
assert(!D.matches(fridge, { capacityL: '0-200' }));
assert(D.matches(fridge, { fridgeFeat: 'nofrost' }));

const washer = { title: 'غسالة LG 8 كغ فتحة أمامية', washKg: 8 };
assert(D.matches(washer, { washLoad: '6-8' }));
assert(!D.matches(washer, { washLoad: '0-6' }));

const ac = { title: 'مكيف سبليت 1.5 طن', acTons: 1.5, acType: 'split' };
assert(D.matches(ac, { acPower: '1.5' }));
assert(D.matches(ac, { acType: 'split' }));
assert(!D.matches(ac, { acType: 'window' }));

const vac = { title: 'مكنسة روبوت بدون سلك', vacType: 'robot', vacPower: 'cordless' };
assert(D.matches(vac, { vacType: 'robot' }));
assert(D.matches(vac, { vacPower: 'cordless' }));

const panel = { title: 'لوح شمسي 450 واط', panelWatt: 450 };
assert(D.matches(panel, { panelWatt: '400-550' }));
assert(!D.matches(panel, { panelWatt: '0-200' }));

const brands = sandbox.RizqBrands;
assert(brands.forCategory('معدات-منزل').length > 0, 'appliance brands linked');
assert(brands.forCategory('معدات-منزل').some(function (b) { return b.id === 'bosch'; }), 'bosch for appliances');
assert(brands.forCategory('معدات-منزل').some(function (b) { return b.id === 'samsung'; }), 'samsung dual-tagged');
assert(brands.getById('daikin'), 'daikin brand');
assert(brands.getById('midea'), 'midea brand');

const browse = fs.readFileSync(path.join(__dirname, '..', 'rizq_browse.html'), 'utf8');
assert(browse.includes('rizq_dyn_filters.js'), 'browse loads dyn filters');
assert(browse.includes('dyn-filters-mount'), 'browse has dyn mount');
assert(browse.includes("'معدات-منزل':["), 'browse has home appliances subcats');
assert(!browse.includes("'إلكترونيات':['هواتف ذكية','لابتوب وحاسوب','شاشات وتلفزيون','أجهزة منزلية'"),
  'electronics no longer lists أجهزة منزلية');
assert(!browse.includes('الشعار فوق · اختصار الاسم تحت'), 'no technical brand heading');

console.log('test-dyn-filters: OK');
