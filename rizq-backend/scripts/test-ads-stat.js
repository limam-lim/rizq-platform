#!/usr/bin/env node
/**
 * خانة الإعلانات في بطاقة الإحصاءات:
 * - تقريب تسويقي (+1,200)
 * - تحت الحد الأدنى → مجاني / النشر الأساسي
 * - DEMO_MODE=true → رقم الديمو
 * - مع JS معطّل: الخانات الأربع غير فارغة في الوضعين
 */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const {
  formatRoundedAds,
  resolveAdsStatPresentation,
  injectAdsStat,
  DEMO_DEFAULT_ADS,
  freeAdsCopy,
} = require('../lib/adsStat');
const { getCategoryStats, injectCategoryStats } = require('../lib/categoryStats');
const { injectDemoMode } = require('../lib/demoMode');

let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) {
    pass += 1;
    console.log('  ✓ ' + name);
  } else {
    fail += 1;
    console.log('  ✗ ' + name + (detail ? ' — ' + detail : ''));
  }
}

ok('formatRoundedAds(1247) → +1,200', formatRoundedAds(1247) === '+1,200');
ok('formatRoundedAds(50) → +50', formatRoundedAds(50) === '+50');
ok('formatRoundedAds(250) → +250', formatRoundedAds(250) === '+250');

const realFew = [
  { id: 'A1', status: 'active', accountId: 'acc_real' },
  { id: 'A2', status: 'active', accountId: 'acc_demo_1' },
];

const demoPres = resolveAdsStatPresentation({
  ads: realFew,
  minActiveAdsToShow: 50,
  siteAdsCount: 0,
  demoMode: true,
  lang: 'ar',
});
ok('DEMO_MODE=true → number mode', demoPres.mode === 'number');
ok('DEMO_MODE=true uses demo/default count',
  demoPres.raw === DEMO_DEFAULT_ADS || demoPres.raw === 2,
  'raw=' + demoPres.raw);
ok('DEMO_MODE display is rounded with +',
  /^\+\d/.test(demoPres.display),
  demoPres.display);

const demoSite = resolveAdsStatPresentation({
  ads: [],
  minActiveAdsToShow: 50,
  siteAdsCount: 1234,
  demoMode: true,
  lang: 'ar',
});
ok('DEMO_MODE prefers site.adsCount',
  demoSite.raw === 1234 && demoSite.display === '+1,200',
  demoSite.display);

const freePres = resolveAdsStatPresentation({
  ads: realFew,
  minActiveAdsToShow: 50,
  siteAdsCount: 0,
  demoMode: false,
  lang: 'ar',
});
ok('below floor + DEMO off → free mode', freePres.mode === 'free');
ok('free AR num/lbl',
  freePres.display === 'مجاني' && freePres.label === 'النشر الأساسي');

const freeFr = resolveAdsStatPresentation({
  ads: realFew,
  minActiveAdsToShow: 50,
  demoMode: false,
  lang: 'fr',
});
ok('free FR copy',
  freeFr.display === 'Gratuit' && freeFr.label === 'publication de base');

const many = [];
for (let i = 0; i < 120; i++) many.push({ id: 'R' + i, status: 'active', accountId: 'acc_x' });
const livePres = resolveAdsStatPresentation({
  ads: many,
  minActiveAdsToShow: 50,
  demoMode: false,
  lang: 'ar',
});
ok('above floor → number mode', livePres.mode === 'number' && livePres.raw === 120);
ok('above floor rounded', livePres.display === '+120');

const landingPath = path.join(__dirname, '..', '..', 'rizq_landing_v8.html');
const landing = fs.readFileSync(landingPath, 'utf8');
ok('landing marks ads for server inject',
  /data-rizq-stat="ads"/.test(landing));

function cellTexts(html) {
  const keys = ['ads', 'cats', 'subs', 'wilayas'];
  const out = {};
  keys.forEach((k) => {
    const re = new RegExp(
      'data-stat="' + k + '"[\\s\\S]*?class="h-stat-num"[^>]*>([^<]*)</span>[\\s\\S]*?class="h-stat-lbl"[^>]*>([^<]*)</span>',
      'i'
    );
    const m = html.match(re);
    out[k] = m
      ? { num: String(m[1]).trim(), lbl: String(m[2]).trim() }
      : { num: '', lbl: '' };
  });
  return out;
}

function buildHtml(demoMode, lang) {
  let html = landing;
  html = injectDemoMode(html, demoMode);
  html = injectCategoryStats(html, getCategoryStats());
  const pres = resolveAdsStatPresentation({
    ads: demoMode ? [] : realFew,
    minActiveAdsToShow: 50,
    siteAdsCount: demoMode ? 1200 : 0,
    demoMode,
    lang,
  });
  html = injectAdsStat(html, pres);
  return { html, pres };
}

const demoBuilt = buildHtml(true, 'ar');
const freeBuilt = buildHtml(false, 'ar');
const demoCells = cellTexts(demoBuilt.html);
const freeCells = cellTexts(freeBuilt.html);

ok('inject DEMO writes rounded ads',
  demoCells.ads.num === '+1,200',
  demoCells.ads.num);
ok('inject free writes مجاني',
  freeCells.ads.num === 'مجاني' && freeCells.ads.lbl === 'النشر الأساسي',
  JSON.stringify(freeCells.ads));

['ads', 'cats', 'subs', 'wilayas'].forEach((k) => {
  ok('DEMO inject cell ' + k + ' non-empty',
    !!(demoCells[k].num && demoCells[k].lbl),
    JSON.stringify(demoCells[k]));
  ok('free inject cell ' + k + ' non-empty',
    !!(freeCells[k].num && freeCells[k].lbl),
    JSON.stringify(freeCells[k]));
});

const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
ok('sendRizqHtmlFile calls injectAdsStat',
  /injectAdsStat\(/.test(serverSrc) && /buildAdsStatPresentation\(/.test(serverSrc));
ok('platform-stats exposes adsMode/adsDisplay',
  /adsMode:/.test(serverSrc) && /adsDisplay:/.test(serverSrc));

async function serveOnce(html) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(html);
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        base: 'http://127.0.0.1:' + port,
        stop: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

async function noscriptCheck(label, html) {
  let playwright;
  try {
    playwright = require('playwright');
  } catch (e) {
    ok(label + ' (skipped — no playwright)', true);
    return;
  }
  const srv = await serveOnce(html);
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.goto(srv.base + '/', { waitUntil: 'commit', timeout: 30000 });
    const vals = await page.evaluate(() => {
      function read(stat) {
        const cell = document.querySelector('#platform-stats [data-stat="' + stat + '"]');
        if (!cell) return { num: '', lbl: '' };
        const num = cell.querySelector('.h-stat-num');
        const lbl = cell.querySelector('.h-stat-lbl');
        const cs = window.getComputedStyle ? getComputedStyle(cell) : null;
        return {
          num: num ? String(num.textContent || '').trim() : '',
          lbl: lbl ? String(lbl.textContent || '').trim() : '',
          hidden: !!(cell.hidden || (cs && (cs.display === 'none' || cs.visibility === 'hidden'))),
        };
      }
      return {
        ads: read('ads'),
        cats: read('cats'),
        subs: read('subs'),
        wilayas: read('wilayas'),
      };
    });
    ['ads', 'cats', 'subs', 'wilayas'].forEach((k) => {
      ok(label + ': ' + k + ' non-empty (JS off)',
        !!(vals[k].num && vals[k].lbl) && !vals[k].hidden,
        JSON.stringify(vals[k]));
    });
  } finally {
    await browser.close();
    await srv.stop();
  }
}

(async () => {
  await noscriptCheck('DEMO_MODE=true', demoBuilt.html);
  await noscriptCheck('DEMO_MODE=false (free floor)', freeBuilt.html);

  const copy = freeAdsCopy('ar');
  ok('combined AR string available', copy.combined.indexOf('مجاني') !== -1);

  console.log(fail
    ? ('\nads-stat: FAILED ' + fail + ' / ' + (pass + fail))
    : ('\nads-stat: ALL OK / ' + pass));
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
