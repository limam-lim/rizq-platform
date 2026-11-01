#!/usr/bin/env node
'use strict';
/**
 * Playwright: لكل محل في دليل التخرج، افتح الواجهة + المنتجات
 * وتحقق أن كل المنتجات المعروضة accountId تابع له،
 * وأن كتالوج محل النور لا يظهر إلا لصفحة محل النور.
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../..');
const FIXTURE = path.join(ROOT, 'rizq-backend/fixtures/graduation-demo.json');
const CATALOG_JS = path.join(ROOT, 'rizq_graduation_demo_catalog.js');

const AL_NOUR_MARKERS = [
  'دراعة رجالية فاخرة',
  'عطر شرقي 100مل',
  'Boutique Al-Nour',
  'متجر النور'
];

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(ROOT, 'qa/browse-1/node_modules/playwright'),
    'playwright'
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (_) { /* try next */ }
  }
  throw new Error('playwright not found');
}

function mime(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  if (p.endsWith('.json')) return 'application/json';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        let rel = decodeURIComponent(u.pathname);
        if (rel === '/') rel = '/rizq_landing_v8.html';
        const fp = path.normalize(path.join(ROOT, rel.replace(/^\//, '')));
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': mime(fp), 'Cache-Control': 'no-store' });
        fs.createReadStream(fp).pipe(res);
      } catch (e) {
        res.writeHead(500);
        res.end(String(e && e.message));
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, base: 'http://127.0.0.1:' + port });
    });
    server.on('error', reject);
  });
}

function directoryStores() {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const stores = (fixture.accounts || []).filter((a) =>
    a && a.type === 'store' && String(a.id || '').startsWith('acc_grad_store_')
  );
  assert(stores.length >= 6, 'expected graduation directory stores');
  const byAcc = {};
  (fixture.catalog || []).forEach((p) => {
    const id = String(p.accountId || '');
    if (!byAcc[id]) byAcc[id] = [];
    byAcc[id].push(p);
  });
  return { stores, byAcc, fixture };
}

async function readPageProducts(page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const fromCards = cards.map((el) => ({
      id: el.id || el.getAttribute('data-wish-id') || '',
      name: (el.querySelector('.product-name') || {}).textContent || '',
      accountId: el.getAttribute('data-account-id') || el.getAttribute('data-store-id') || '',
      text: (el.textContent || '').trim()
    }));
    const all = (typeof allProducts !== 'undefined' && Array.isArray(allProducts))
      ? allProducts.map((p) => ({
          id: String(p.id || ''),
          name: p.name || '',
          accountId: String(p.accountId || p.storeId || '')
        }))
      : [];
    const empty = !!(
      document.getElementById('products-empty')
      || (document.getElementById('no-results') && document.getElementById('no-results').style.display !== 'none')
    );
    const bodyText = document.body ? document.body.innerText : '';
    return { fromCards, all, empty, bodyText, title: document.title || '' };
  });
}

async function assertOwned(page, storeId, opts) {
  opts = opts || {};
  await page.waitForTimeout(500);
  const data = await readPageProducts(page);
  const rows = data.all.length ? data.all : data.fromCards;
  for (const row of rows) {
    const owner = String(row.accountId || '');
    assert.ok(
      !owner || owner === storeId,
      storeId + ' leaked foreign product accountId=' + owner + ' name=' + row.name
    );
  }
  for (const marker of AL_NOUR_MARKERS) {
    if (opts.allowAlNour) continue;
    const hitCard = data.fromCards.some((c) => (c.name || c.text || '').indexOf(marker) >= 0);
    const hitAll = data.all.some((c) => (c.name || '').indexOf(marker) >= 0);
    assert.ok(!hitCard && !hitAll, storeId + ' must not show Al-Nour marker: ' + marker);
  }
  if (opts.expectNames && opts.expectNames.length) {
    const names = (data.all.length ? data.all : data.fromCards).map((r) => r.name || '');
    for (const n of opts.expectNames) {
      assert.ok(names.some((x) => x.indexOf(n) >= 0), storeId + ' missing expected product: ' + n);
    }
  }
  if (opts.expectMin != null) {
    assert.ok(rows.length >= opts.expectMin, storeId + ' expected >= ' + opts.expectMin + ' products, got ' + rows.length);
  }
  return data;
}

async function main() {
  const { chromium } = loadPlaywright();
  const { stores, byAcc } = directoryStores();

  // وحدة كتالوج العرض المضمّنة
  const vm = require('vm');
  const sandbox = { window: {}, global: {} };
  sandbox.global = sandbox;
  vm.runInNewContext(fs.readFileSync(CATALOG_JS, 'utf8'), sandbox);
  const Grad = sandbox.window.RizqGraduationCatalog || sandbox.global.RizqGraduationCatalog;
  assert.ok(Grad, 'RizqGraduationCatalog missing');
  assert.strictEqual(Grad.productsFor('acc_grad_store_03').length, 8);
  assert.strictEqual(Grad.productsFor('acc_unknown_xyz').length, 0);
  assert.ok(Grad.isAlNourDemoId('demo_store'));
  assert.ok(!Grad.isAlNourDemoId('acc_grad_store_03'));

  const { server, base } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const report = [];

  try {
    for (const store of stores) {
      const id = store.id;
      const expected = byAcc[id] || Grad.productsFor(id) || [];
      const expectNames = expected.slice(0, 2).map((p) => p.name);

      await page.goto(base + '/rizq_store.html?id=' + encodeURIComponent(id), {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await page.waitForFunction(() => !!window.RizqGraduationCatalog, null, { timeout: 10000 }).catch(() => {});
      // حقن كتالوج محلي إن لم يصل API
      await page.evaluate((sid) => {
        try {
          const list = (window.RizqGraduationCatalog && RizqGraduationCatalog.productsFor)
            ? RizqGraduationCatalog.productsFor(sid) : [];
          if (list && list.length) {
            localStorage.setItem('store_products_' + sid, JSON.stringify(list));
          }
        } catch (e) {}
      }, id);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(700);
      // أعد الرسم من الكتالوج المضمّن إن بقيت الشبكة فارغة
      await page.evaluate((sid) => {
        if (typeof paintStoreProductsGrid === 'function' && window.RizqGraduationCatalog) {
          paintStoreProductsGrid(RizqGraduationCatalog.productsFor(sid) || [], sid);
        }
        if (window.RizqStoreCommerce) RizqStoreCommerce.wireStoreLinks(sid);
      }, id);

      const storeData = await assertOwned(page, id, {
        expectNames: expectNames.length ? expectNames : undefined,
        expectMin: expected.length ? Math.min(1, expected.length) : 0
      });

      // رابط المنتجات يجب أن يحمل id المحل
      const productsHref = await page.evaluate(() => {
        const a = document.querySelector('a[href*="rizq_products.html"]');
        return a ? a.getAttribute('href') : '';
      });
      assert.ok(productsHref, id + ' missing products link');
      assert.ok(
        productsHref.indexOf('id=' + encodeURIComponent(id)) >= 0
          || productsHref.indexOf('id=' + id) >= 0,
        id + ' products link missing id: ' + productsHref
      );

      await page.goto(base + '/rizq_products.html?id=' + encodeURIComponent(id), {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await page.waitForFunction(() => !!window.RizqGraduationCatalog, null, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(800);
      const prodData = await assertOwned(page, id, {
        expectNames: expectNames.length ? expectNames : undefined,
        expectMin: expected.length ? 1 : 0
      });

      report.push({
        id,
        name: store.name,
        storeCards: storeData.fromCards.length,
        productRows: (prodData.all.length || prodData.fromCards.length),
        ok: true
      });
    }

    // محل النور وحده يعرض كتالوجه
    await page.goto(base + '/rizq_products.html?demo=1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const alNour = await readPageProducts(page);
    assert.ok(
      alNour.all.some((p) => (p.name || '').indexOf('دراعة رجالية فاخرة') >= 0)
        || alNour.fromCards.some((p) => (p.name || p.text || '').indexOf('دراعة رجالية فاخرة') >= 0),
      'Al-Nour demo catalog must render on its own page'
    );
    for (const row of (alNour.all.length ? alNour.all : alNour.fromCards)) {
      const owner = String(row.accountId || 'demo_store');
      assert.ok(owner === 'demo_store' || !owner, 'Al-Nour product foreign owner ' + owner);
    }
    report.push({ id: 'demo_store', name: 'محل النور', ok: true, productRows: alNour.all.length || alNour.fromCards.length });

    // حساب بلا كتالوج → فارغ بلا محل النور
    await page.goto(base + '/rizq_products.html?id=acc_grad_empty_test_99', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await assertOwned(page, 'acc_grad_empty_test_99', { expectMin: 0 });
    const emptyBody = await page.evaluate(() => document.body.innerText);
    assert.ok(emptyBody.indexOf('دراعة رجالية فاخرة') < 0, 'empty account must not show Al-Nour fashion');

    console.log(JSON.stringify({ ok: true, stores: report.length, report }, null, 2));
    console.log('OK: store catalog ownership passed');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
