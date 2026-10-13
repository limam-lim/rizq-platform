#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const brandsSrc = fs.readFileSync(path.join(__dirname, '..', 'rizq_brands_catalog.js'), 'utf8');
const dynSrc = fs.readFileSync(path.join(__dirname, '..', 'rizq_dyn_filters.js'), 'utf8');
const sandbox = { window: {}, console, document: { getElementById: () => null } };
sandbox.window = sandbox;
vm.runInNewContext(brandsSrc, sandbox);
vm.runInNewContext(dynSrc, sandbox);
const D = sandbox.RizqDynFilters;
assert(D, 'RizqDynFilters export');

assert(D.profileFor('سيارات'), 'cars profile');
assert(D.profileFor('شاحنات'), 'trucks profile');
assert(D.profileFor('إلكترونيات'), 'electronics profile');
assert(D.profileFor('أغذية'), 'food profile');
assert(D.profileFor('عقارات'), 'realty profile');
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

const browse = fs.readFileSync(path.join(__dirname, '..', 'rizq_browse.html'), 'utf8');
assert(browse.includes('rizq_dyn_filters.js'), 'browse loads dyn filters');
assert(browse.includes('dyn-filters-mount'), 'browse has dyn mount');
assert(!browse.includes('الشعار فوق · اختصار الاسم تحت'), 'no technical brand heading');

console.log('test-dyn-filters: OK');
