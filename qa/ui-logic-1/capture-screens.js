/**
 * لقطات قبل/بعد لصفحات fix-ui-logic-1 — لا تُدفع.
 * الاستخدام: node capture-screens.js before|after
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = __dirname;
const TAG = process.argv[2] === 'after' ? 'after' : 'before';
const BASE = process.env.RIZQ_BASE || 'http://127.0.0.1:3000';
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '375', width: 375, height: 812 },
];

const PAGES = [
  { id: 'products', path: '/rizq_products.html?demo=1', wait: '#products-grid, .product-card, .filters-sidebar' },
  { id: 'cart', path: '/rizq_cart.html?demo=1', wait: '.breadcrumb, #main-wrap, #cart-general-hub' },
  { id: 'store', path: '/rizq_store.html?demo=1', wait: '#store-hero, #store-packages, .hero-video-mount' },
  { id: 'showroom', path: '/rizq_showroom.html?demo=1', wait: '#pkg-section, .hero-video-mount, body' },
  { id: 'office', path: '/rizq_office.html?demo=1', wait: '#office-packages, body' },
  { id: 'investments', path: '/rizq_investments.html', wait: '#inv-agent-form, #inv-submit-form' },
  { id: 'tenders', path: '/rizq_tenders.html', wait: '#td-submit-form, #td-submit, body' },
  { id: 'estate', path: '/rizq_estate.html?demo=1', wait: '#est-reviews, body' },
];

async function shot(page, vp, pageId) {
  const file = path.join(OUT, `${pageId}__${vp.name}__${TAG}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log('wrote', path.basename(file));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: 'ar-MR',
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String(e && e.message || e)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    for (const p of PAGES) {
      const url = BASE + p.path;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(1200);
        try { await page.waitForSelector(p.wait, { timeout: 8000 }); } catch (e) { /* */ }
        await page.waitForTimeout(600);
        await shot(page, vp, p.id);
      } catch (e) {
        console.error('FAIL', p.id, vp.name, e.message);
        errors.push(p.id + ' ' + vp.name + ': ' + e.message);
      }
    }
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, `console-${TAG}.json`), JSON.stringify({ tag: TAG, errors }, null, 2));
  console.log('done', TAG, 'errors=', errors.length);
  if (errors.length) process.exitCode = 0; // لا تفشل اللقطات بسبب ضوضاء شبكة
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
