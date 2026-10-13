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
assert(chip.indexOf('https://') >= 0 || chip.indexOf('data:image/svg+xml') >= 0, 'chip has logo src');
assert(chip.indexOf('data-fallback') >= 0 || chip.indexOf('data:image/svg+xml') >= 0, 'chip has fallback');

const logoName = B.logoNameHtml('toyota', { fr: false, modelId: 'camry' });
assert(logoName.indexOf('تويوتا') >= 0, 'logoName has brand name');
assert(logoName.indexOf('rzq-brand-logo-name-img') >= 0, 'logoName has logo img');
assert(logoName.indexOf('carlogos.org') >= 0, 'toyota uses real carlogos asset');

const strip = B.stripHtml('أزياء', false, { heading: 'تسوّق حسب الماركة' });
assert(strip.indexOf('تسوّق حسب الماركة') >= 0, 'strip heading');
assert(strip.indexOf('rzq-brand-tile-logo') >= 0, 'strip logo tile');
assert(strip.indexOf('rzq-brand-tile-name') >= 0 || strip.indexOf('rzq-brand-tile-abbr') >= 0, 'strip name under logo');
assert(strip.indexOf('نايك') >= 0 || strip.indexOf('Nike') >= 0, 'strip shows brand name');
assert(strip.indexOf('data-brand-id="nike"') >= 0, 'strip includes nike');
assert(strip.indexOf('simple-icons') >= 0 || strip.indexOf('favicon') >= 0, 'fashion uses real remote logos');

const fl = B.filterListHtml('سيارات', false, { activeId: 'toyota', letter: 'T' });
assert(fl.indexOf('rzq-brand-tile') >= 0, 'filter brand tiles');
assert(fl.indexOf('rzq-brand-letter-btn') >= 0, 'filter letter buttons');
assert(fl.indexOf('تويوتا') >= 0 || fl.indexOf('data-brand-id="toyota"') >= 0, 'filter has toyota name/id');
assert(fl.indexOf('rzq-brand-tile-logo') >= 0, 'filter tile logo');
assert(fl.indexOf('carlogos.org') >= 0, 'filter uses real car logos');
assert(fl.indexOf('الشعار فوق') < 0, 'no technical heading for visitors');

assert(String(B.logoUrl(B.getById('toyota'))).indexOf('carlogos.org') >= 0, 'logoUrl toyota');
assert(String(B.logoUrl(B.getById('nike'))).indexOf('https://') === 0, 'logoUrl nike remote');
assert(src.indexOf('function symbolInner') < 0, 'no fake lookalike symbolInner');
const bmwFallback = B.logoSvg(B.getById('bmw'), 72);
assert(bmwFallback.indexOf('<text') >= 0, 'fallback monogram uses letter text');
assert(bmwFallback.indexOf('#1C69D4') >= 0 || bmwFallback.indexOf('B') >= 0, 'bmw monogram uses brand color/letter');
const dynSrc = fs.readFileSync(path.join(__dirname, '..', 'rizq_dyn_filters.js'), 'utf8');
assert(dynSrc.indexOf('سنة التصنيع') >= 0, 'dyn filters year');
assert(dynSrc.indexOf('علبة التروس') >= 0, 'dyn filters gearbox');
assert(dynSrc.indexOf('ساعات العمل') >= 0, 'dyn filters hours');
assert(dynSrc.indexOf('برو ماكس') >= 0, 'dyn filters phone variant');

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
assert(adsJs.includes('brandLogo'));

assert.strictEqual(B.CUSTOM_BRAND_ID, '__custom__');
assert(B.isCustomBrandId('__custom__'));
assert(!B.isCustomBrandId('toyota'));
const customPrev = B.brandFormPreviewHtml({
  brandId: B.CUSTOM_BRAND_ID,
  customName: 'تقنية الأمل',
  customLogo: 'data:image/png;base64,abc',
  fr: false
});
assert(customPrev.indexOf('تقنية الأمل') >= 0, 'custom brand preview name');
assert(customPrev.indexOf('data:image/png') >= 0, 'custom brand preview logo');
const itemHtml = B.itemBrandHtml({ brandName: 'معرض الأمل', brandLogo: 'https://example.com/logo.png' }, { fr: false });
assert(itemHtml.indexOf('معرض الأمل') >= 0, 'itemBrandHtml custom name');
assert(itemHtml.indexOf('example.com/logo.png') >= 0, 'itemBrandHtml custom logo');

const storeDash = fs.readFileSync(path.join(__dirname, '..', 'rizq_dashboard_store.html'), 'utf8');
assert(storeDash.includes('prod-brand-custom-name'));
assert(storeDash.includes('prod-brand-logo-file'));
assert(storeDash.includes('brandLogo'));
assert(storeDash.includes('isCustomBrandId'));
const corpDash = fs.readFileSync(path.join(__dirname, '..', 'rizq_dashboard_corp.html'), 'utf8');
assert(corpDash.includes('pr-brand-custom-name'));
assert(corpDash.includes('pr-brand-logo-file'));
assert(corpDash.includes('brandLogo'));
assert(postHtml.includes('ad-brand-custom-name'));
assert(postHtml.includes('ad-brand-logo-file'));
assert(postHtml.includes('brandLogo'));

const catalogJs = fs.readFileSync(path.join(__dirname, '..', 'rizq-backend/routes/catalog.js'), 'utf8');
assert(catalogJs.includes('brandLogo'));
assert(catalogJs.includes("id + '-brand'") || catalogJs.includes('id + "-brand"'));

console.log('OK: brands catalog + post/browse/backend wiring smoke passed');
