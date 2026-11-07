#!/usr/bin/env node
/**
 * يقفل إطلالات متعددة الأجناس تحت حكم الخادم DEMO_MODE / __RIZQ_DEMO_MODE:
 * - DEMO_MODE=true: حقن بلا ?demo=1، ≥4 محلات/جنس، موزاييك 4 store ids
 * - DEMO_MODE=false + ?demo=1: صفر ديمو (يُتجاهل الرابط)
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { injectDemoMode } = require('../../rizq-backend/lib/demoMode');

const ROOT = path.join(__dirname, '..', '..');
const landingSrc = fs.readFileSync(path.join(ROOT, 'rizq_landing_v8.html'), 'utf8');
const guideJs = fs.readFileSync(path.join(ROOT, 'rizq_home_guide.js'), 'utf8');
const backendCfg = fs.readFileSync(path.join(ROOT, 'rizq_backend_config.js'), 'utf8');

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
  /demo_fashion_men_a/.test(landingSrc) && /demo_fashion_men_d/.test(landingSrc)
  && /demo_fashion_women_a/.test(landingSrc) && /demo_fashion_women_d/.test(landingSrc)
  && /demo_fashion_boys_a/.test(landingSrc) && /demo_fashion_boys_d/.test(landingSrc)
  && /demo_fashion_girls_a/.test(landingSrc) && /demo_fashion_girls_d/.test(landingSrc));

ok('looks gate reads __RIZQ_DEMO_MODE (server flag)',
  /function _styDemoLooksAllowed/.test(landingSrc)
  && /__RIZQ_DEMO_MODE !== true/.test(landingSrc));

ok('RizqDemo.inventoryAllowed obeys __RIZQ_DEMO_MODE only (ignores ?demo=1 when off)',
  /_rizqServerDemoMode/.test(backendCfg)
  && /__RIZQ_DEMO_MODE === true/.test(backendCfg)
  && !/\?demo=1[\s\S]{0,80}return true/.test(
    backendCfg.slice(backendCfg.indexOf('RizqDemo'), backendCfg.indexOf('RizqDemo') + 1200)
  ));

ok('Express lib injectDemoMode + DEMO_MODE env helper exist',
  fs.existsSync(path.join(ROOT, 'rizq-backend/lib/demoMode.js')));

ok('per-gender store-count backfill (≥4 stores)',
  /_styCountStoresForGender/.test(landingSrc)
  && /بذرة تجريبية لكل جنس ناقص/.test(landingSrc));

ok('look companions prefer different stores',
  /فضّل محلات مختلفة/.test(landingSrc)
  && /otherStores\.concat\(sameStore\)/.test(landingSrc));

ok('sync + fair gender rotation helpers',
  /function _stySyncGenderTabs/.test(landingSrc)
  && /function _styNextFairGender/.test(landingSrc)
  && /_styNextFairGender\(_rizqStyleGender\)/.test(landingSrc));

ok('guide cycles fair gender on pane rotate',
  /_styNextFairGender/.test(guideJs)
  && /pane === 'styles' && !fromUser/.test(guideJs));

ok('empty copy via i18n keys',
  /sty-empty/.test(landingSrc) && /sty-empty-cta/.test(landingSrc)
  && /packEm\['sty-empty'\]/.test(landingSrc));

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

  function makeServer(demoMode) {
    const html = injectDemoMode(landingSrc, demoMode);
    return new Promise((resolve) => {
      const server = http.createServer((req, res) => {
        let url = decodeURIComponent((req.url || '/').split('?')[0]);
        if (url === '/' || url.endsWith('.html')) {
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          res.end(html);
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
      server.listen(0, '127.0.0.1', () => {
        resolve({ server, origin: 'http://127.0.0.1:' + server.address().port });
      });
    });
  }

  const browser = await chromium.launch({ headless: true });

  /* —— DEMO_MODE=true، بلا ?demo=1 —— */
  {
    const { server, origin } = await makeServer(true);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      localStorage.setItem('rizq_lang', 'ar');
      window.__RIZQ_SITE_CONFIG_READY = true;
      window.__RIZQ_LAUNCH_FROM_CACHE = true;
      window.RIZQ_LAUNCH = { launchDate: '' };
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
    });
    await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2200);
    const result = await page.evaluate(() => {
      const flag = window.__RIZQ_DEMO_MODE;
      const allowed = (typeof _styDemoLooksAllowed === 'function') ? _styDemoLooksAllowed() : null;
      const inv = (window.RizqDemo && RizqDemo.inventoryAllowed) ? RizqDemo.inventoryAllowed() : null;
      const pool = (typeof _styPool === 'function') ? _styPool() : [];
      const by = { men: 0, women: 0, boys: 0, girls: 0 };
      const storesBy = { men: new Set(), women: new Set(), boys: new Set(), girls: new Set() };
      pool.forEach((a) => {
        const g = (typeof _styDetectGender === 'function') ? _styDetectGender(a) : a.gender;
        if (by[g] != null) {
          by[g] += 1;
          if (a.storeId) storesBy[g].add(String(a.storeId));
        }
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
      } catch (e2) {}
      return {
        flag, allowed, inv, by,
        storesBy: {
          men: storesBy.men.size, women: storesBy.women.size,
          boys: storesBy.boys.size, girls: storesBy.girls.size,
        },
        gendersWithCards, storeIds,
        fourStoreLook: storeIds.length >= 4,
      };
    });
    ok('DEMO_MODE=true: __RIZQ_DEMO_MODE frozen true', result.flag === true);
    ok('DEMO_MODE=true (no ?demo=1): looks + inventory allowed',
      result.allowed === true && result.inv === true);
    ok('DEMO_MODE=true: ≥2 genders with products',
      Object.keys(result.by).filter((g) => result.by[g] >= 3).length >= 2,
      JSON.stringify(result.by));
    ok('DEMO_MODE=true: cards for more than one gender',
      result.gendersWithCards.length >= 2,
      JSON.stringify(result.gendersWithCards));
    ok('DEMO_MODE=true: men pool ≥4 stores',
      result.storesBy.men >= 4, JSON.stringify(result.storesBy));
    ok('DEMO_MODE=true: mosaic 4 distinct store ids',
      result.fourStoreLook, 'storeIds=' + JSON.stringify(result.storeIds));
    await page.close();
    await new Promise((r) => server.close(r));
  }

  /* —— DEMO_MODE=false + ?demo=1 → صفر ديمو —— */
  {
    const { server, origin } = await makeServer(false);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => {
      localStorage.setItem('rizq_lang', 'ar');
      window.__RIZQ_SITE_CONFIG_READY = true;
      window.__RIZQ_LAUNCH_FROM_CACHE = true;
      window.RIZQ_LAUNCH = { launchDate: '' };
      window.__rizqHomeCatalog = { styles: [] };
    });
    await page.goto(origin + '/rizq_landing_v8.html?demo=1', {
      waitUntil: 'domcontentloaded', timeout: 90000,
    });
    await page.waitForTimeout(1800);
    const result = await page.evaluate(() => {
      const flag = window.__RIZQ_DEMO_MODE;
      const allowed = (typeof _styDemoLooksAllowed === 'function') ? _styDemoLooksAllowed() : null;
      const inv = (window.RizqDemo && RizqDemo.inventoryAllowed) ? RizqDemo.inventoryAllowed() : null;
      const pool = (typeof _styPool === 'function') ? _styPool() : [];
      const demoIds = pool
        .filter((a) => a && String(a.storeId || '').indexOf('demo_fashion_') === 0)
        .map((a) => String(a.storeId));
      /* محاولة عبث من الـ console لا تتجاوز العلم غير القابل للكتابة */
      let tamperBlocked = false;
      try {
        window.__RIZQ_DEMO_MODE = true;
        tamperBlocked = window.__RIZQ_DEMO_MODE === false;
      } catch (eT) {
        tamperBlocked = window.__RIZQ_DEMO_MODE === false;
      }
      return {
        flag, allowed, inv,
        demoStoreCount: new Set(demoIds).size,
        tamperBlocked,
        search: String(location.search || ''),
      };
    });
    ok('DEMO_MODE=false: __RIZQ_DEMO_MODE is false', result.flag === false);
    ok('DEMO_MODE=false + ?demo=1: looks NOT allowed', result.allowed === false);
    ok('DEMO_MODE=false + ?demo=1: RizqDemo.inventoryAllowed false', result.inv === false);
    ok('DEMO_MODE=false + ?demo=1: zero demo_fashion_* stores',
      result.demoStoreCount === 0, 'count=' + result.demoStoreCount);
    ok('DEMO_MODE=false: console cannot flip __RIZQ_DEMO_MODE', result.tamperBlocked === true);
    await page.close();
    await new Promise((r) => server.close(r));
  }

  await browser.close();
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
