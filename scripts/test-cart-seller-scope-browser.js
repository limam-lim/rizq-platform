#!/usr/bin/env node
'use strict';
/**
 * Browser smoke: mixed store+showroom bag must not leak across scoped cart pages.
 */
const assert = require('assert');
const path = require('path');

async function main() {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    try {
      playwright = require('/tmp/node_modules/playwright');
    } catch (e2) {
      console.error('playwright not found');
      process.exit(2);
    }
  }

  const base = process.env.RIZQ_BASE || 'http://127.0.0.1:8765';
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage();

  const mixed = [
    {
      id: 'store-prod-demo1',
      name: 'منتج المحل',
      nameF: 'Produit magasin',
      price: 1000,
      qty: 2,
      emoji: '👕',
      storeId: 'demo_store',
      accountId: 'demo_store',
      storeName: 'متجر النور',
      module: 'store'
    },
    {
      id: 'showroom-item-1',
      name: 'عرض المعرض',
      nameF: 'Article showroom',
      price: 50000,
      qty: 1,
      emoji: '🚗',
      storeId: 'demo-corp-001',
      accountId: 'demo-corp-001',
      storeName: 'معرض الريادة',
      module: 'showroom'
    }
  ];

  await page.goto(base + '/rizq_cart.html?id=demo-corp-001&module=showroom', { waitUntil: 'domcontentloaded' });
  await page.evaluate((items) => {
    localStorage.setItem('rizq_cart', JSON.stringify(items));
  }, mixed);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  const showroomVisible = await page.evaluate(() => {
    const names = Array.from(document.querySelectorAll('.cart-item-name')).map((el) => el.textContent.trim());
    const empty = document.getElementById('empty-cart');
    const content = document.getElementById('cart-content');
    return {
      names,
      emptyDisplay: empty ? empty.style.display : null,
      contentDisplay: content ? content.style.display : null,
      count: (document.getElementById('nav-cart-count') || {}).textContent || ''
    };
  });

  assert.deepStrictEqual(showroomVisible.names, ['عرض المعرض'], 'showroom cart must show only showroom line');
  assert.strictEqual(showroomVisible.count, '1');
  assert.notStrictEqual(showroomVisible.contentDisplay, 'none');

  await page.goto(base + '/rizq_cart.html?id=demo_store', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const storeVisible = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.cart-item-name')).map((el) => el.textContent.trim());
  });
  assert.deepStrictEqual(storeVisible, ['منتج المحل'], 'store cart must show only store line');

  // bag still has both
  const bag = await page.evaluate(() => JSON.parse(localStorage.getItem('rizq_cart') || '[]'));
  assert.strictEqual(bag.length, 2, 'full bag must keep both sellers');

  await browser.close();
  console.log('OK: browser seller-scope cart isolation passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
