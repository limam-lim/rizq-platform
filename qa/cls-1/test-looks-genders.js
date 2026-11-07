#!/usr/bin/env node
/**
 * يقفل إطلالات متعددة الأجناس:
 * - ديمو ≥4 محلات/جنس مربوطة بمفتاح صريح _styDemoLooksAllowed / RizqDemo.inventoryAllowed
 * - وضعان: demo=1 (حقن) و launchDate مضبوط بدون demo (لا حقن)
 * - بلاطات الإطلالة الأربع من 4 محلات مختلفة عند توفّر البيانات
 * - إخفاء التبويبات الفارغة + تناوب عادل
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const landing = fs.readFileSync(path.join(ROOT, 'rizq_landing_v8.html'), 'utf8');
const guideJs = fs.readFileSync(path.join(ROOT, 'rizq_home_guide.js'), 'utf8');

let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) {
    pass += 1;
    console.log('  ✓ ' + name);
  } else {
    fail += 1;
    console.log('  ✗ ' + name + (detail ? ' — ' + String(detail).slice(0, 220) : ''));
  }
}

ok('demo stores: ≥4 shops per gender id prefix',
  /demo_fashion_men_a/.test(landing) && /demo_fashion_men_d/.test(landing)
  && /demo_fashion_women_a/.test(landing) && /demo_fashion_women_d/.test(landing)
  && /demo_fashion_boys_a/.test(landing) && /demo_fashion_boys_d/.test(landing)
  && /demo_fashion_girls_a/.test(landing) && /demo_fashion_girls_d/.test(landing));

ok('explicit demo gate helper _styDemoLooksAllowed (no soft fallback)',
  /function _styDemoLooksAllowed/.test(landing)
  && /if\(_styDemoLooksAllowed\(\)\)/.test(landing)
  && !/: !\(window\.RIZQ_LAUNCH && RIZQ_LAUNCH\.launchDate\);/.test(
    landing.slice(landing.indexOf('function _styDemoLooksAllowed'), landing.indexOf('function _styDemoLooksAllowed') + 800)
  ));

ok('per-gender store-count backfill (≥4 stores)',
  /_styCountStoresForGender/.test(landing)
  && /بذرة تجريبية لكل جنس ناقص/.test(landing));

ok('look companions prefer different stores',
  /فضّل محلات مختلفة/.test(landing)
  && /otherStores\.concat\(sameStore\)/.test(landing));

ok('sync + fair gender rotation helpers',
  /function _stySyncGenderTabs/.test(landing)
  && /function _styNextFairGender/.test(landing)
  && /_styNextFairGender\(_rizqStyleGender\)/.test(landing));

ok('guide cycles fair gender on pane rotate',
  /_styNextFairGender/.test(guideJs)
  && /pane === 'styles' && !fromUser/.test(guideJs));

ok('empty copy via i18n keys',
  /sty-empty/.test(landing) && /sty-empty-cta/.test(landing)
  && /packEm\['sty-empty'\]/.test(landing));

(async function runtime() {
  let chromium;
  const pwCandidates = [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    path.join(ROOT, 'qa/cls-1/node_modules/playwright'),
    '/workspace/qa/ui-logic-1/node_modules/playwright',
    '/workspace/qa/cls-1/node_modules/playwright',
    'playwright',
  ];
  let pwErr = null;
  for (let pi = 0; pi < pwCandidates.length; pi++) {
    try {
      chromium = require(pwCandidates[pi]).chromium;
      pwErr = null;
      break;
    } catch (ePw) { pwErr = ePw; }
  }
  if (!chromium) {
    ok('playwright available for runtime gender check', false, pwErr && pwErr.message);
    finish();
    return;
  }

  const server = http.createServer((req, res) => {
    let url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === '/' || url.endsWith('.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(landing);
      return;
    }
    const file = path.join(ROOT, url.replace(/^\//, ''));
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('no'); return;
    }
    const ext = path.extname(file).toLowerCase();
    const types = {
      '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png',
      '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
    };
    res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });

  async function openMode(mode) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.addInitScript((m) => {
      localStorage.setItem('rizq_lang', 'ar');
      window.__RIZQ_SITE_CONFIG_READY = true;
      window.__RIZQ_LAUNCH_FROM_CACHE = true;
      window.RIZQ_LAUNCH = window.RIZQ_LAUNCH || {};
      if (m === 'off') {
        window.RIZQ_LAUNCH.launchDate = '2026-01-01';
      } else {
        window.RIZQ_LAUNCH.launchDate = '';
      }
      /* كتالوج نساء فقط من API — في وضع التشغيل يجب أن تبقى أجناس الديمو */
      window.__rizqHomeCatalog = {
        styles: Array.from({ length: 12 }).map((_, i) => ({
          id: 'api-w-' + i,
          name: 'ملحفة تجريبية ' + i,
          nameFr: 'Melhfa demo ' + i,
          price: 30000 + i,
          cat: 'أزياء',
          gender: 'women',
          accountId: 'acc_api_women',
          seller: { id: 'acc_api_women', name: 'API Women Only', type: 'store' },
          images: ['rizq-assets/demo-fashion/demo-melhafa-street-dark.webp'],
        })),
      };
    }, mode);
    const q = mode === 'on' ? '?demo=1' : '';
    await page.goto(origin + '/rizq_landing_v8.html' + q, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2200);
    return { ctx, page };
  }

  /* —— وضع التشغيل: ?demo=1 —— */
  {
    const { ctx, page } = await openMode('on');
    const result = await page.evaluate(() => {
      const allowed = (typeof _styDemoLooksAllowed === 'function') ? _styDemoLooksAllowed() : null;
      const avail = (typeof _styGendersWithLooks === 'function') ? _styGendersWithLooks(3) : [];
      const pool = (typeof _styPool === 'function') ? _styPool() : [];
      const by = { men: 0, women: 0, boys: 0, girls: 0 };
      const storesBy = { men: new Set(), women: new Set(), boys: new Set(), girls: new Set() };
      const demoIds = [];
      pool.forEach((a) => {
        const g = (typeof _styDetectGender === 'function') ? _styDetectGender(a) : a.gender;
        if (by[g] != null) {
          by[g] += 1;
          if (a.storeId) storesBy[g].add(String(a.storeId));
        }
        if (a && String(a.storeId || '').indexOf('demo_fashion_') === 0) demoIds.push(String(a.storeId));
      });
      const gendersWithCards = [];
      ['men', 'women', 'boys', 'girls'].forEach((g) => {
        try {
          if (typeof buildStyleIdeas === 'function') buildStyleIdeas(true, 'rizq-guide-rail-styles', g);
        } catch (e) {}
        const rail = document.getElementById('rizq-guide-rail-styles');
        const n = rail ? rail.querySelectorAll('.rizq-style-card, .rizq-look-card').length : 0;
        if (n > 0) gendersWithCards.push(g);
      });
      /* 4 بلاطات من 4 محلات مختلفة — أفضل بطاقة في السكة */
      let fourStoreLook = false;
      let storeIds = [];
      try {
        if (typeof buildStyleIdeas === 'function') buildStyleIdeas(true, 'rizq-guide-rail-styles', 'men');
        const rail = document.getElementById('rizq-guide-rail-styles');
        const cards = rail ? [...rail.querySelectorAll('.rizq-style-card, .rizq-look-card')] : [];
        let best = [];
        cards.forEach((card) => {
          const hrefs = [...card.querySelectorAll('.rizq-style-mosaic a[href*="rizq_store"]')].map((a) => a.getAttribute('href') || '');
          const ids = [...new Set(hrefs.map((h) => {
            const m = /[?&]id=([^&]+)/.exec(h);
            return m ? decodeURIComponent(m[1]) : '';
          }).filter(Boolean))];
          if (ids.length > best.length) best = ids;
        });
        storeIds = best;
        fourStoreLook = storeIds.length >= 4;
      } catch (e2) {}
      return {
        allowed,
        avail,
        by,
        storesBy: {
          men: storesBy.men.size,
          women: storesBy.women.size,
          boys: storesBy.boys.size,
          girls: storesBy.girls.size,
        },
        demoStoreCount: new Set(demoIds).size,
        gendersWithCards,
        fourStoreLook,
        storeIds,
      };
    });

    ok('mode ON (?demo=1): _styDemoLooksAllowed true', result.allowed === true);
    ok('mode ON: pool has ≥2 genders with products',
      Object.keys(result.by).filter((g) => result.by[g] >= 3).length >= 2,
      JSON.stringify(result.by));
    ok('mode ON: runtime shows cards for more than one gender',
      result.gendersWithCards.length >= 2,
      JSON.stringify(result.gendersWithCards));
    ok('mode ON: men pool spans ≥4 demo stores',
      result.storesBy.men >= 4,
      JSON.stringify(result.storesBy));
    ok('mode ON: look mosaic uses 4 distinct store ids',
      result.fourStoreLook,
      'storeIds=' + JSON.stringify(result.storeIds));
    await ctx.close();
  }

  /* —— وضع الإيقاف: launchDate مضبوط، بلا ?demo=1 —— */
  {
    const { ctx, page } = await openMode('off');
    const result = await page.evaluate(() => {
      const allowed = (typeof _styDemoLooksAllowed === 'function') ? _styDemoLooksAllowed() : null;
      const pool = (typeof _styPool === 'function') ? _styPool() : [];
      const demoIds = pool
        .filter((a) => a && String(a.storeId || '').indexOf('demo_fashion_') === 0)
        .map((a) => String(a.storeId));
      const by = { men: 0, women: 0, boys: 0, girls: 0 };
      pool.forEach((a) => {
        const g = (typeof _styDetectGender === 'function') ? _styDetectGender(a) : a.gender;
        if (by[g] != null) by[g] += 1;
      });
      return {
        allowed,
        demoStoreCount: new Set(demoIds).size,
        by,
        poolLen: pool.length,
      };
    });

    ok('mode OFF (launchDate, no ?demo=1): _styDemoLooksAllowed false', result.allowed === false);
    ok('mode OFF: no demo_fashion_* stores injected',
      result.demoStoreCount === 0,
      'demoStoreCount=' + result.demoStoreCount + ' by=' + JSON.stringify(result.by));
    await ctx.close();
  }

  await browser.close();
  server.close();
  finish();
})().catch((e) => {
  ok('runtime gender check ran', false, e && e.message);
  finish();
});

function finish() {
  console.log(fail
    ? ('\nlooks-genders: FAILED ' + fail + ' / ' + (pass + fail))
    : ('\nlooks-genders: ALL OK / ' + pass));
  process.exit(fail ? 1 : 0);
}
