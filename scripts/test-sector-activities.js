#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const cat = require(path.join(__dirname, '..', 'rizq_merchant_activities.js'));

const electronicsId = cat.sectorActivityId('store', 'electronics');
assert.strictEqual(electronicsId, 'sec_store_electronics');

const electronics = cat.findById(electronicsId);
assert.ok(electronics, 'sector electronics activity must exist');
assert.strictEqual(electronics.nameAr, 'إلكترونيات وتقنية');
assert.strictEqual(electronics.sectorId, 'electronics');
assert.ok(electronics.isSector, 'must flag isSector');

assert.ok(cat.isAllowed(electronicsId, 'store'), 'sector activity allowed for store');
assert.ok(cat.isAllowed('st_phones', 'store'), 'leaf phones still allowed');
assert.ok(cat.isAllowed('st_computers', 'store'), 'leaf computers still allowed');
assert.strictEqual(cat.legacyCategoryFromActivity(electronicsId), 'إلكترونيات');

const storeList = cat.listForAccountType('store', 'ar');
const secCount = storeList.filter((a) => a.isSector).length;
assert.ok(secCount >= 8, 'store should expose multiple selectable sectors, got ' + secCount);

const groups = cat.groupActivities(storeList, 'store', 'ar');
const elecGroup = groups.find((g) => g.id === 'electronics');
assert.ok(elecGroup, 'electronics group exists');
assert.ok(elecGroup.activities[0].isSector, 'sector option first in electronics group');
assert.strictEqual(elecGroup.activities[0].id, electronicsId);
assert.ok(elecGroup.activities.some((a) => a.id === 'st_phones'), 'phones under electronics');
assert.ok(elecGroup.activities.some((a) => a.id === 'st_computers'), 'computers under electronics');

// renderSelect puts sector option with data-sector-activity
const { JSDOM } = (() => {
  try { return require('jsdom'); } catch (e) { return {}; }
})();
if (JSDOM) {
  const dom = new JSDOM('<select id="s"></select>');
  const el = dom.window.document.getElementById('s');
  cat.renderSelect(el, { accountType: 'store', lang: 'ar' });
  const opt = el.querySelector('option[value="sec_store_electronics"]');
  assert.ok(opt, 'renderSelect includes sector option');
  assert.strictEqual(opt.getAttribute('data-sector-activity'), '1');
} else {
  // Lightweight HTML check without jsdom
  let html = '';
  const fake = {
    value: '',
    get innerHTML() { return html; },
    set innerHTML(v) { html = v; },
  };
  cat.renderSelect(fake, { accountType: 'store', lang: 'ar' });
  assert.ok(html.includes('value="sec_store_electronics"'), 'HTML includes sector option');
  assert.ok(html.includes('data-sector-activity="1"'), 'HTML marks sector option');
  assert.ok(html.includes('هواتف ذكية'), 'HTML still includes leaf phones');
}

const selectJs = fs.readFileSync(path.join(__dirname, '..', 'rizq_activity_select.js'), 'utf8');
assert.ok(selectJs.includes('is-sector'), 'custom select styles sector options as selectable');
assert.ok(selectJs.includes('firstSector'), 'custom select skips non-clickable group when sector option present');

console.log('OK: selectable sector activities (' + secCount + ' store sectors)');
