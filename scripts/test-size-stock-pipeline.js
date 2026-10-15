#!/usr/bin/env node
'use strict';
/**
 * Regression: sizeStock + variants must survive store/showroom paint → quickview paths.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const stockSrc = fs.readFileSync(path.join(root, 'rizq_stock.js'), 'utf8');
const sandbox = {
  window: {},
  console,
  document: {
    addEventListener: function () {},
    getElementById: function () { return null; },
    createElement: function () { return { style: {}, classList: { add: function () {}, remove: function () {}, toggle: function () {} }, setAttribute: function () {}, appendChild: function () {} }; },
    body: { appendChild: function () {}, style: {} },
    head: { appendChild: function () {} },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  },
  localStorage: { getItem: function () { return null; }, setItem: function () {} }
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.runInNewContext(stockSrc, sandbox);
assert(sandbox.RizqStock, 'RizqStock export');

const p = {
  id: 'P1',
  name: 'دراعة رجالية',
  cat: 'أزياء',
  variants: 'S, M, L, XL, XXL, 3XL, 4XL',
  sizeStock: { S: 8, M: 12, L: 0, XL: 10, XXL: 5, '3XL': 3, '4XL': 2 },
  stock: 40
};
assert.strictEqual(sandbox.RizqStock.sizeQty(p, '3XL'), 3);
assert.strictEqual(sandbox.RizqStock.sizeQty(p, 'L'), 0);
assert.ok(sandbox.RizqStock.hasSizeStock(p));
const lab = sandbox.RizqStock.buyerLabelForSelection(p, { size: 'L' }, false);
assert.ok(lab && lab.level === 'out', 'L should be out of stock');

const storeHtml = fs.readFileSync(path.join(root, 'rizq_store.html'), 'utf8');
assert(storeHtml.includes('sizeStock: feat.sizeStock || extra.sizeStock'), 'openQuickView keeps sizeStock');
assert(storeHtml.includes('sizeStock: (p.sizeStock && typeof p.sizeStock === \'object\') ? p.sizeStock : null'), 'paintStoreProductsGrid keeps sizeStock');
assert(storeHtml.includes('variants: p.variants || \'\''), 'catalog merge keeps variants');

const showroomHtml = fs.readFileSync(path.join(root, 'rizq_showroom.html'), 'utf8');
assert(showroomHtml.includes('sizeStock: (p.sizeStock && typeof p.sizeStock === \'object\') ? p.sizeStock : null'), 'showroom API map keeps sizeStock');
assert(showroomHtml.includes('variants: item.variants || \'\''), 'showroom detail keeps variants');

const corpHtml = fs.readFileSync(path.join(root, 'rizq_corp.html'), 'utf8');
assert(corpHtml.includes('sizeStock: (p.sizeStock && typeof p.sizeStock === \'object\') ? p.sizeStock : null'), 'corp local map keeps sizeStock');

const ft = fs.readFileSync(path.join(root, 'rizq_footer_toggle.js'), 'utf8');
assert(ft.includes('flex-direction:column!important'), 'footer toggle centers on phone');
assert(ft.includes('align-items:center!important'), 'footer stack centered');

const officeHtml = fs.readFileSync(path.join(root, 'rizq_office.html'), 'utf8');
assert(officeHtml.includes('.office-desk-actions #rf-doc-upload'), 'office upload full-width row');
assert(officeHtml.includes('padding-bottom:calc(128px') || officeHtml.includes('padding-bottom:calc(72px'), 'office sticky CTA clearance');

const commerceSrc = fs.readFileSync(path.join(root, 'rizq_store_commerce.js'), 'utf8');
assert(!/onclick="RizqStoreCommerce\.selectVariant\(\s*"\s*\+\s*JSON\.stringify/.test(commerceSrc)
  && !commerceSrc.includes('onclick="RizqStoreCommerce.selectVariant(\' + JSON.stringify'),
  'must not use broken double-quoted onclick+JSON.stringify for size chips');
assert(commerceSrc.includes("closest('button.rzq-pd-vopt')") || commerceSrc.includes('closest("button.rzq-pd-vopt")'),
  'size chips use click delegation');

console.log('test-size-stock-pipeline: OK');
