#!/usr/bin/env node
/**
 * يقفل إطلالات متعددة الأجناس: ديمو ≥2 محلات/جنس، بذرة لكل جنس ناقص،
 * إخفاء التبويبات الفارغة، وتناوب عادل — وتحقق Playwright من ظهور أكثر من نوع.
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
    console.log('  ✗ ' + name + (detail ? ' — ' + String(detail).slice(0, 180) : ''));
  }
}

ok('demo stores: ≥2 shops per gender id prefix',
  /demo_fashion_men_a/.test(landing) && /demo_fashion_men_b/.test(landing)
  && /demo_fashion_women_a/.test(landing) && /demo_fashion_women_b/.test(landing)
  && /demo_fashion_boys_a/.test(landing) && /demo_fashion_boys_b/.test(landing)
  && /demo_fashion_girls_a/.test(landing) && /demo_fashion_girls_b/.test(landing));

ok('per-gender demo backfill (not global out.length < 9 for styles)',
  /_styCountGender/.test(landing)
  && /بذرة تجريبية لكل جنس ناقص/.test(landing)
  && !/styDemoOk && out\.length < 9/.test(landing));

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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    localStorage.setItem('rizq_lang', 'ar');
    /* محاكاة كتالوج نساء فقط من API — يجب أن تبقى أجناس الديمو الأخرى */
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
  await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2800);

  const result = await page.evaluate(() => {
    const avail = (typeof _styGendersWithLooks === 'function') ? _styGendersWithLooks(3) : [];
    const pool = (typeof _styPool === 'function') ? _styPool() : [];
    const by = { men: 0, women: 0, boys: 0, girls: 0 };
    pool.forEach((a) => {
      const g = (typeof _styDetectGender === 'function') ? _styDetectGender(a) : a.gender;
      if (by[g] != null) by[g] += 1;
    });
    const tabs = [...document.querySelectorAll('#rizq-guide-sty-tabs [data-guide-sty-gender]')].map((b) => ({
      g: b.getAttribute('data-guide-sty-gender'),
      hidden: !!b.hidden,
    }));
    const gendersWithCards = [];
    ['men', 'women', 'boys', 'girls'].forEach((g) => {
      try {
        if (typeof buildStyleIdeas === 'function') buildStyleIdeas(true, 'rizq-guide-rail-styles', g);
      } catch (e) {}
      const rail = document.getElementById('rizq-guide-rail-styles');
      const n = rail ? rail.querySelectorAll('.rizq-style-card, .rizq-look-card').length : 0;
      if (n > 0) gendersWithCards.push(g);
    });
    /* تنوع محلات داخل إطلالة رجال */
    let multiStoreLook = false;
    try {
      if (typeof buildStyleIdeas === 'function') buildStyleIdeas(true, 'rizq-guide-rail-styles', 'men');
      const rail = document.getElementById('rizq-guide-rail-styles');
      const card = rail && rail.querySelector('.rizq-style-card, .rizq-look-card');
      if (card) {
        const hrefs = [...card.querySelectorAll('a[href*="rizq_store"]')].map((a) => a.getAttribute('href') || '');
        const ids = new Set(hrefs.map((h) => {
          const m = /[?&]id=([^&]+)/.exec(h);
          return m ? decodeURIComponent(m[1]) : '';
        }).filter(Boolean));
        multiStoreLook = ids.size >= 2;
      }
    } catch (e2) {}
    return { avail, by, tabs, gendersWithCards, multiStoreLook };
  });

  ok('pool has ≥2 genders with products (women-heavy API + demo backfill)',
    Object.keys(result.by).filter((g) => result.by[g] >= 3).length >= 2,
    JSON.stringify(result.by));
  ok('runtime shows cards for more than one gender',
    result.gendersWithCards.length >= 2,
    JSON.stringify(result.gendersWithCards));
  ok('_styGendersWithLooks returns multiple genders',
    result.avail.length >= 2,
    JSON.stringify(result.avail));
  ok('empty gender tabs hidden when unavailable OR all four visible when seeded',
    result.tabs.every((t) => (result.avail.indexOf(t.g) >= 0 ? !t.hidden : t.hidden)
      || result.avail.length === 4),
    JSON.stringify({ tabs: result.tabs, avail: result.avail }));
  ok('look mosaic prefers multiple store ids when available',
    result.multiStoreLook,
    'multiStoreLook=' + result.multiStoreLook);

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
