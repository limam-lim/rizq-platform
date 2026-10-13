#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'rizq_brands_catalog.js'), 'utf8');
const sandbox = { window: {}, console };
sandbox.window = sandbox;
vm.runInNewContext(src, sandbox);
const B = sandbox.RizqBrands || sandbox.window.RizqBrands;
assert(B, 'RizqBrands must export');

const all = B.list();
assert(all.length >= 70, 'expected a rich brand catalog, got ' + all.length);
assert(B.getById('toyota'), 'toyota');
assert(B.getById('mercedes'), 'mercedes');
assert(B.getById('honda'), 'honda');
assert(B.getById('nike'), 'nike');
assert(B.getById('adidas'), 'adidas');
assert(B.getById('mango'), 'mango');
assert(B.getById('ray-ban'), 'ray-ban');
assert(B.getById('huawei'), 'huawei');
assert(B.getById('ikea'), 'ikea');
assert(B.getById('rolex'), 'rolex');

const cars = B.forCategory('سيارات');
assert(cars.some((b) => b.id === 'toyota'));
assert(cars.every((b) => (b.categories || []).includes('سيارات')));

const fashion = B.forCategory('أزياء');
assert(fashion.some((b) => b.id === 'nike'));
assert(fashion.some((b) => b.id === 'ray-ban'));

const models = B.modelsOf('mercedes');
assert(models.some((m) => m.id === 'c-class'), 'Mercedes C-Class model');
assert(B.getModel('toyota', 'camry'));

assert(B.searchMatch(B.getById('toyota'), 'تويوتا'));
assert(B.searchMatch(B.getById('toyota'), 'toyota'));
assert.strictEqual(B.findByAlias('مرسيدس').id, 'mercedes');
assert.strictEqual(B.findByAlias('Nike').id, 'nike');

const chip = B.chipHtml('adidas', { fr: false, modelId: 'ultraboost' });
assert(chip.indexOf('أديداس') >= 0 || chip.indexOf('ألترابوست') >= 0);
assert(chip.indexOf('data:image/svg+xml') >= 0, 'logo data uri');

const logoName = B.logoNameHtml('toyota', { fr: false, modelId: 'camry' });
assert(logoName.indexOf('تويوتا') >= 0, 'logoName has brand name');
assert(logoName.indexOf('rzq-brand-logo-name-img') >= 0, 'logoName has logo img');
assert(logoName.indexOf('data:image/svg+xml') >= 0, 'logoName logo uri');

const strip = B.stripHtml('أزياء', false, { heading: 'تسوّق حسب الماركة' });
assert(strip.indexOf('تسوّق حسب الماركة') >= 0, 'strip heading');
assert(strip.indexOf('rzq-brand-strip-logo') >= 0, 'strip logo wrap');
assert(strip.indexOf('rzq-brand-strip-name') >= 0, 'strip brand name');
assert(strip.indexOf('data-brand-id="nike"') >= 0, 'strip includes nike');

const postHtml = fs.readFileSync(path.join(__dirname, '..', 'rizq_post.html'), 'utf8');
assert(postHtml.includes('rizq_brands_catalog.js'));
assert(postHtml.includes('ad-brand') && postHtml.includes('ad-model'));
assert(postHtml.includes('brandId'));

const browseHtml = fs.readFileSync(path.join(__dirname, '..', 'rizq_browse.html'), 'utf8');
assert(browseHtml.includes('rizq_brands_catalog.js'));
assert(browseHtml.includes('brand-select'));
assert(browseHtml.includes('brandBlob') || browseHtml.includes('brandName'));
assert(browseHtml.includes("brandId:'toyota'") || browseHtml.includes('brandId:\'toyota\''));

const adsJs = fs.readFileSync(path.join(__dirname, '..', 'rizq-backend/routes/ads.js'), 'utf8');
assert(adsJs.includes('brandId'));
assert(adsJs.includes('modelId'));
assert(adsJs.includes('a.brandName'));

console.log('OK: brands catalog + post/browse/backend wiring smoke passed');
