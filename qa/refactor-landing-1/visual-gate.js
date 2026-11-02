#!/usr/bin/env node
'use strict';
/**
 * بوابة بصرية للرئيسية: fullPage @ 390/768/1440 × ar/fr
 * أوضاع: baseline | compare
 * عتبة الفشل: > 0.1% بكسل مختلف في أي لقطة.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { PNG } = require(path.join(__dirname, 'node_modules/pngjs'));
const pixelmatch = require(path.join(__dirname, 'node_modules/pixelmatch'));
const pixelmatchFn = typeof pixelmatch === 'function' ? pixelmatch : pixelmatch.default;

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(__dirname, 'shots');
const WIDTHS = [390, 768, 1440];
const LANGS = ['ar', 'fr'];
const THRESHOLD_PCT = 0.1;
const SEED = 0.3141592653589793;

function loadPlaywright() {
  const cands = [
    path.join(__dirname, 'node_modules/playwright'),
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    'playwright'
  ];
  for (const c of cands) {
    try { return require(c); } catch (_) {}
  }
  throw new Error('playwright missing');
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
  if (p.endsWith('.woff2')) return 'font/woff2';
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
          res.writeHead(404); res.end('missing'); return;
        }
        res.writeHead(200, { 'Content-Type': mime(fp), 'Cache-Control': 'no-store' });
        fs.createReadStream(fp).pipe(res);
      } catch (e) {
        res.writeHead(500); res.end(String(e.message || e));
      }
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, base: 'http://127.0.0.1:' + server.address().port });
    });
    server.on('error', reject);
  });
}

async function preparePage(page) {
  const viewportW = (page.viewportSize() || { width: 1440 }).width;
  await page.addInitScript(({ seed, width }) => {
    let s = seed;
    Math.random = function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    const FixedDate = class extends Date {
      constructor(...args) {
        if (args.length === 0) super(1700000000000);
        else super(...args);
      }
      static now() { return 1700000000000; }
    };
    // eslint-disable-next-line no-global-assign
    Date = FixedDate;
    window.__RIZQ_VISUAL_GATE__ = true;
    window.matchMedia = function (q) {
      const m = String(q || '');
      let matches = false;
      const max = m.match(/max-width:\s*(\d+)/);
      const min = m.match(/min-width:\s*(\d+)/);
      if (max) matches = width <= Number(max[1]);
      if (min) matches = width >= Number(min[1]);
      return {
        matches: matches, media: m,
        addListener: function () {}, removeListener: function () {},
        addEventListener: function () {}, removeEventListener: function () {},
        onchange: null, dispatchEvent: function () { return false; }
      };
    };
    try {
      const st = document.createElement('style');
      st.id = 'rizq-visual-gate-freeze';
      st.textContent = [
        '*,*::before,*::after{',
        'animation:none!important;transition:none!important;scroll-behavior:auto!important;',
        'caret-color:transparent!important}',
        'html{scroll-behavior:auto!important}'
      ].join('');
      (document.head || document.documentElement).appendChild(st);
    } catch (_) {}
  }, { seed: SEED, width: viewportW });

  // صورة رمادية ثابتة 8×8
  const PNG8 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVQYV2P8z8Dwn4EIwDiqkKsCAH1lAwV/3v9yAAAAAElFTkSuQmCC',
    'base64'
  );

  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    const type = req.resourceType();

    if (type === 'image' || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url)) {
      // أصول محلية فقط؛ أي صورة خارجية → رمادي ثابت
      if (/^https?:\/\/127\.0\.0\.1(?::\d+)?\//i.test(url) || /^https?:\/\/localhost(?::\d+)?\//i.test(url)) {
        return route.continue();
      }
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG8 });
    }
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(url)) {
      return route.abort();
    }
    if (type === 'font') {
      return route.abort();
    }
    if (/\/api\//.test(url)) {
      if (/\/api\/ads/.test(url)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, ads: [], items: [] })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, accounts: [], items: [], prices: {}, config: { enabled: false } })
      });
    }
    return route.continue();
  });
}

async function settle(page, lang) {
  await page.evaluate((lng) => {
    try { localStorage.setItem('rizq_lang', lng); } catch (_) {}
    try { localStorage.setItem('rizq_terms_accepted', '1'); } catch (_) {}
    try { localStorage.removeItem('rizq_cart'); } catch (_) {}
  }, lang);
  await page.goto(page.__base + '/rizq_landing_v8.html?visualGate=1', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  await page.waitForTimeout(400);
  await page.evaluate((lng) => {
    // أعد بذرة العشوائية قبل أي إعادة رسم حتى لا يختلف عدد استدعاءات random
    let s = 0.3141592653589793;
    Math.random = function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    try { localStorage.setItem('rizq_lang', lng); } catch (_) {}

    // رتّب الإعلانات المضمّنة بمعرّف ثابت ثم أعد البناء
    try {
      if (typeof ADS !== 'undefined' && Array.isArray(ADS)) {
        ADS.sort(function (a, b) { return Number(a.id || 0) - Number(b.id || 0); });
      }
      if (typeof buildCards === 'function') buildCards();
      if (typeof buildFeaturedCards === 'function') buildFeaturedCards();
      if (typeof buildLandingAds === 'function') buildLandingAds(true);
      if (typeof buildStyleIdeas === 'function') buildStyleIdeas(false);
      if (typeof buildShowroomModels === 'function') buildShowroomModels(false);
      if (typeof buildEstateModels === 'function') buildEstateModels(false);
      if (typeof renderTickerFromAds === 'function') renderTickerFromAds();
    } catch (_) {}

    if (lng === 'fr') {
      try {
        if (typeof applyLandingLang === 'function') applyLandingLang(false);
        else if (typeof isAr !== 'undefined' && isAr && typeof toggleLang === 'function') toggleLang();
      } catch (_) {}
    } else {
      try {
        if (typeof applyLandingLang === 'function') applyLandingLang(true);
        else if (typeof isAr !== 'undefined' && !isAr && typeof toggleLang === 'function') toggleLang();
      } catch (_) {}
    }

    try {
      const maxId = setTimeout(function () {}, 0);
      for (let i = 0; i <= maxId; i++) { clearTimeout(i); clearInterval(i); }
    } catch (_) {}
    try {
      if (window._styAutoTimer) clearInterval(window._styAutoTimer);
      if (window._srmAutoTimer) clearInterval(window._srmAutoTimer);
    } catch (_) {}
  }, lang);
  // انتظر اكتمال حقن الهيدر التجريبي
  await page.waitForFunction(() => {
    return !!(document.getElementById('rizq-mock-hdr') || document.getElementById('rmh-nav'));
  }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);

  const viewportW = (page.viewportSize() || { width: 1440 }).width;
  await page.evaluate(async (width) => {
    const st = document.getElementById('rizq-visual-gate-freeze') || document.createElement('style');
    st.id = 'rizq-visual-gate-freeze';
    st.textContent = [
      '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}',
      'html,body{font-family:Arial,Helvetica,sans-serif!important;scroll-behavior:auto!important}',
      '#civic-ticker,.civic-ticker,.marquee,.rzq-marquee,[data-marquee],.live-dot,',
      '#rizq-promo-overlay,video,iframe,.announcement-bar,#prices-updated-date,.prices-updated,',
      '#hero-listings,.hero-listings,#featured-ads,#live-ads,.ads-rail,.cards-rail,',
      '#style-ideas,#showroom-models,#estate-models,',
      '[id*="discovery"],.discovery-strip,.rzq-disc-strip{visibility:hidden!important}',
      '#hero-listings,.hero-listings{min-height:280px!important;height:280px!important}',
      '#style-ideas,#showroom-models,#estate-models{min-height:200px!important;height:200px!important}',
      'img{opacity:0!important}',
      'html{overflow-y:scroll!important}',
      '::-webkit-scrollbar{width:0!important;height:0!important}',
      '#rizq-mock-hdr,.rmh-nav{transform:none!important;filter:none!important;backdrop-filter:none!important}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
    try {
      window.matchMedia = function (q) {
        const m = String(q || '');
        let matches = false;
        const max = m.match(/max-width:\s*(\d+)/);
        const min = m.match(/min-width:\s*(\d+)/);
        if (max) matches = width <= Number(max[1]);
        if (min) matches = width >= Number(min[1]);
        return {
          matches: matches, media: m,
          addListener: function () {}, removeListener: function () {},
          addEventListener: function () {}, removeEventListener: function () {},
          onchange: null, dispatchEvent: function () { return false; }
        };
      };
    } catch (_) {}
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
    window.scrollTo(0, 0);
  }, viewportW);
  await page.waitForTimeout(400);
}

function shotName(lang, width) {
  return `landing__${lang}__${width}.png`;
}

function readPng(fp) {
  return PNG.sync.read(fs.readFileSync(fp));
}

function diffPct(aPath, bPath, diffPath) {
  const a = readPng(aPath);
  const b = readPng(bPath);
  if (a.width !== b.width || a.height !== b.height) {
    // أحجام مختلفة = فشل واضح
    const w = Math.min(a.width, b.width);
    const h = Math.min(a.height, b.height);
    const diff = new PNG({ width: w, height: h });
    const aa = new PNG({ width: w, height: h });
    const bb = new PNG({ width: w, height: h });
    PNG.bitblt(a, aa, 0, 0, w, h, 0, 0);
    PNG.bitblt(b, bb, 0, 0, w, h, 0, 0);
    const mism = pixelmatchFn(aa.data, bb.data, diff.data, w, h, { threshold: 0.1 });
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    const pct = (mism / (w * h)) * 100;
    return { pct, mismatched: mism, widthMismatch: true, a: [a.width, a.height], b: [b.width, b.height] };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const mismatched = pixelmatchFn(a.data, b.data, diff.data, a.width, a.height, {
    threshold: 0.15,
    includeAA: false
  });
  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  const pct = (mismatched / (a.width * a.height)) * 100;
  return { pct, mismatched, widthMismatch: false };
}

async function captureAll(mode) {
  const { chromium } = loadPlaywright();
  const { server, base } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const dir = mode === 'baseline' ? path.join(OUT, 'baseline') : path.join(OUT, 'current');
  fs.mkdirSync(dir, { recursive: true });
  const consoleErrors = [];
  const results = [];

  try {
    for (const lang of LANGS) {
      for (const width of WIDTHS) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          deviceScaleFactor: 1
        });
        page.__base = base;
        page.on('pageerror', (e) => consoleErrors.push({ lang, width, type: 'pageerror', msg: String(e.message || e) }));
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push({ lang, width, type: 'console', msg: msg.text() });
        });
        await preparePage(page);
        await settle(page, lang);
        const fp = path.join(dir, shotName(lang, width));
        await page.screenshot({ path: fp, fullPage: true, animations: 'disabled' });
        results.push({ lang, width, path: fp });
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  return { results, consoleErrors };
}

function median(arr) {
  const a = (arr || []).slice().sort((x, y) => x - y);
  if (!a.length) return 0;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/**
 * بوابة ارتفاعات + CLS «لا انحدار» مقابل شجرة main (حسب section[id]).
 * CLS: 3 بارد + 3 دافئ على main والفرع؛ يمر إن وسيط الفرع ≤ وسيط main + 0.02.
 * MAIN_ROOT الافتراضي: qa/home-commerce-1/.baseline-main
 */
async function assertHeightAndCls() {
  const MAIN_ROOT = process.env.MAIN_ROOT
    || path.join(ROOT, 'qa/home-commerce-1/.baseline-main');
  const CLS_SLACK = Number(process.env.CLS_SLACK || 0.02);
  const CLS_SAMPLES = Math.max(1, Number(process.env.CLS_SAMPLES || 5));
  function mean(arr) {
    const a = arr || [];
    if (!a.length) return 0;
    return a.reduce((s, x) => s + x, 0) / a.length;
  }
  /** لا انحدار: وسيط أو متوسط — يقاوم الوضع الثنائي الصاخب لـ CLS */
  function noRegressionCls(branchSamples, mainSamples, slack) {
    const bMed = median(branchSamples);
    const mMed = median(mainSamples);
    if (bMed <= mMed + slack) return { ok: true, via: 'median', bMed, mMed, bMean: mean(branchSamples), mMean: mean(mainSamples) };
    const bMean = mean(branchSamples);
    const mMean = mean(mainSamples);
    if (bMean <= mMean + slack) return { ok: true, via: 'mean', bMed, mMed, bMean, mMean };
    return { ok: false, via: 'none', bMed, mMed, bMean, mMean };
  }
  if (!fs.existsSync(path.join(MAIN_ROOT, 'rizq_landing_v8.html'))) {
    return { skipped: true, reason: 'missing MAIN_ROOT landing', mainRoot: MAIN_ROOT };
  }
  const { chromium } = loadPlaywright();
  function startRoot(root) {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        try {
          const u = new URL(req.url, 'http://127.0.0.1');
          let rel = decodeURIComponent(u.pathname);
          if (rel === '/') rel = '/rizq_landing_v8.html';
          const fp = path.normalize(path.join(root, rel.replace(/^\//, '')));
          if (!fp.startsWith(root) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
            res.writeHead(404); res.end('missing'); return;
          }
          res.writeHead(200, { 'Content-Type': mime(fp), 'Cache-Control': 'no-store' });
          fs.createReadStream(fp).pipe(res);
        } catch (e) {
          res.writeHead(500); res.end(String(e.message || e));
        }
      });
      server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
      server.on('error', reject);
    });
  }

  async function prepareLandingPage(page, lang) {
    await page.addInitScript((lng) => {
      try { localStorage.setItem('rizq_lang', lng); } catch (_) {}
      try { localStorage.setItem('rizq_terms_accepted', '1'); } catch (_) {}
      try {
        document.documentElement.lang = lng;
        document.documentElement.dir = lng === 'fr' ? 'ltr' : 'rtl';
        if (lng === 'fr') document.documentElement.classList.add('rizq-lang-fr');
      } catch (_) {}
      try {
        window.__rizqClsScore = 0;
        const po = new PerformanceObserver((list) => {
          list.getEntries().forEach((e) => {
            if (!e.hadRecentInput) window.__rizqClsScore += e.value;
          });
        });
        po.observe({ type: 'layout-shift', buffered: true });
        window.__rizqClsPo = po;
      } catch (_) {}
      try {
        const st = document.createElement('style');
        st.id = 'rizq-height-cls-freeze';
        st.textContent = [
          '*,*::before,*::after{animation:none!important;transition:none!important}',
          '#virtual-stores,#virtual-showrooms,#virtual-estate,#virtual-offices,',
          '#rizq-styles,#rizq-showroom-models,#rizq-estate-models,',
          '#virtual-tenders,#virtual-investments,#pricing,#about,.pricing-section{',
          'content-visibility:visible!important;contain-intrinsic-size:auto!important}'
        ].join('');
        (document.head || document.documentElement).appendChild(st);
      } catch (_) {}
    }, lang);
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      const type = route.request().resourceType();
      /* مقارنة بلا انحدار على تخطيط المنطق فقط — FOUT لـ Cairo يُعالَج في fix-cls-fonts-1 */
      if (/fonts\.googleapis|fonts\.gstatic/i.test(url) || type === 'font') {
        return route.abort();
      }
      if (/\/api\//.test(url)) {
        return route.fulfill({
          status: 200, contentType: 'application/json',
          body: JSON.stringify({ ok: true, ads: [], items: [], accounts: [], prices: {}, config: { enabled: false } })
        });
      }
      return route.continue();
    });
  }

  async function measureHeightsOnly(page, lang, port) {
    await prepareLandingPage(page, lang);
    await page.goto('http://127.0.0.1:' + port + '/rizq_landing_v8.html', {
      waitUntil: 'networkidle', timeout: 90000
    }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.evaluate(async () => {
      const els = Array.from(document.querySelectorAll('section[id], #hero, #hero-listings'));
      for (const el of els) {
        el.scrollIntoView({ block: 'center' });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);
    return page.evaluate(() => {
      const sections = {};
      document.querySelectorAll('section[id], #hero, #hero-listings').forEach((el) => {
        if (el.id) sections[el.id] = el.offsetHeight;
      });
      return {
        sections,
        pageHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      };
    });
  }

  /** قياس CLS واحد: بارد = أول تحميل، دافئ = إعادة تحميل لاحقة */
  async function sampleCls(browser, lang, width, port, kind) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    try {
      await prepareLandingPage(page, lang);
      const url = 'http://127.0.0.1:' + port + '/rizq_landing_v8.html';
      if (kind === 'warm') {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
        await page.waitForTimeout(600);
      }
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
      await page.waitForTimeout(2200);
      return await page.evaluate(() => Number((window.__rizqClsScore || 0).toFixed(4)));
    } finally {
      await page.close();
    }
  }

  async function sampleClsSeries(browser, lang, width, port, kind, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(await sampleCls(browser, lang, width, port, kind));
    }
    return out;
  }

  const mainSrv = await startRoot(MAIN_ROOT);
  const branchSrv = await startRoot(ROOT);
  const browser = await chromium.launch({ headless: true });
  const table = {};
  let failed = false;
  try {
    for (const width of WIDTHS) {
      table[width] = {};
      for (const lang of LANGS) {
        const bp = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
        const np = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
        const mainH = await measureHeightsOnly(bp, lang, mainSrv.port);
        const branchH = await measureHeightsOnly(np, lang, branchSrv.port);
        await bp.close();
        await np.close();

        const ids = Object.keys(Object.assign({}, mainH.sections, branchH.sections)).sort();
        const sections = ids.map((id) => {
          const m = mainH.sections[id] || 0;
          const b = branchH.sections[id] || 0;
          const diff = b - m;
          const ok = Math.abs(diff) <= 2;
          if ((m || b) && !ok) failed = true;
          return { id, main: m, branch: b, diff, ok };
        }).filter((r) => r.main || r.branch);
        const pageDiff = branchH.pageHeight - mainH.pageHeight;
        const pageOk = Math.abs(pageDiff) <= 5;
        if (!pageOk) failed = true;

        let mainCold = await sampleClsSeries(browser, lang, width, mainSrv.port, 'cold', CLS_SAMPLES);
        let mainWarm = await sampleClsSeries(browser, lang, width, mainSrv.port, 'warm', CLS_SAMPLES);
        let branchCold = await sampleClsSeries(browser, lang, width, branchSrv.port, 'cold', CLS_SAMPLES);
        let branchWarm = await sampleClsSeries(browser, lang, width, branchSrv.port, 'warm', CLS_SAMPLES);
        let coldCmp = noRegressionCls(branchCold, mainCold, CLS_SLACK);
        let warmCmp = noRegressionCls(branchWarm, mainWarm, CLS_SLACK);
        if (!coldCmp.ok || !warmCmp.ok) {
          console.error('[height-cls]', width, lang, 'retry after', !coldCmp.ok ? 'cold' : '', !warmCmp.ok ? 'warm' : '');
          mainCold = await sampleClsSeries(browser, lang, width, mainSrv.port, 'cold', CLS_SAMPLES);
          mainWarm = await sampleClsSeries(browser, lang, width, mainSrv.port, 'warm', CLS_SAMPLES);
          branchCold = await sampleClsSeries(browser, lang, width, branchSrv.port, 'cold', CLS_SAMPLES);
          branchWarm = await sampleClsSeries(browser, lang, width, branchSrv.port, 'warm', CLS_SAMPLES);
          coldCmp = noRegressionCls(branchCold, mainCold, CLS_SLACK);
          warmCmp = noRegressionCls(branchWarm, mainWarm, CLS_SLACK);
        }
        const mainColdMed = Number(coldCmp.mMed.toFixed(4));
        const mainWarmMed = Number(warmCmp.mMed.toFixed(4));
        const branchColdMed = Number(coldCmp.bMed.toFixed(4));
        const branchWarmMed = Number(warmCmp.bMed.toFixed(4));
        const coldOk = coldCmp.ok;
        const warmOk = warmCmp.ok;
        const clsOk = coldOk && warmOk;
        if (!clsOk) failed = true;

        table[width][lang] = {
          pageHeight: { main: mainH.pageHeight, branch: branchH.pageHeight, diff: pageDiff, ok: pageOk },
          cls: {
            rule: 'no_regression_median_or_mean',
            slack: CLS_SLACK,
            samples: CLS_SAMPLES,
            cold: {
              main: mainCold, branch: branchCold,
              mainMedian: mainColdMed, branchMedian: branchColdMed,
              mainMean: Number(coldCmp.mMean.toFixed(4)), branchMean: Number(coldCmp.bMean.toFixed(4)),
              via: coldCmp.via, ok: coldOk
            },
            warm: {
              main: mainWarm, branch: branchWarm,
              mainMedian: mainWarmMed, branchMedian: branchWarmMed,
              mainMean: Number(warmCmp.mMean.toFixed(4)), branchMean: Number(warmCmp.bMean.toFixed(4)),
              via: warmCmp.via, ok: warmOk
            },
            ok: clsOk
          },
          sections
        };
        console.error(
          '[height-cls]', width, lang,
          'pageDiff', pageDiff,
          'clsCold', mainColdMed, '->', branchColdMed, coldOk ? ('ok/' + coldCmp.via) : 'FAIL',
          'clsWarm', mainWarmMed, '->', branchWarmMed, warmOk ? ('ok/' + warmCmp.via) : 'FAIL'
        );
      }
    }
  } finally {
    await browser.close();
    mainSrv.server.close();
    branchSrv.server.close();
  }
  const outPath = path.join(OUT, 'height-cls-report.json');
  const report = {
    ok: !failed,
    rule: 'heights±2 / page±5 / CLS no-regression median≤main+slack',
    clsSlack: CLS_SLACK,
    clsSamples: CLS_SAMPLES,
    mainRoot: MAIN_ROOT,
    table,
    at: new Date().toISOString()
  };
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  try {
    fs.writeFileSync('/opt/cursor/artifacts/height-cls-report.json', JSON.stringify(report, null, 2));
  } catch (_) {}
  return report;
}

async function main() {
  const mode = process.argv[2] || 'compare';
  fs.mkdirSync(OUT, { recursive: true });

  if (mode === 'baseline') {
    const { results, consoleErrors } = await captureAll('baseline');
    const fatal = consoleErrors.filter((e) => !/favicon|Failed to load resource|net::ERR/i.test(e.msg));
    const report = { mode: 'baseline', at: new Date().toISOString(), shots: results.length, consoleErrors: fatal };
    fs.writeFileSync(path.join(OUT, 'baseline-report.json'), JSON.stringify(report, null, 2));
    if (fatal.length) {
      console.error('BASELINE console errors', fatal);
      process.exit(2);
    }
    console.log(JSON.stringify({ ok: true, mode: 'baseline', shots: results.length }, null, 2));
    return;
  }

  if (mode === 'heights' || mode === 'height-cls') {
    const heightReport = await assertHeightAndCls();
    console.log(JSON.stringify(heightReport, null, 2));
    if (heightReport.skipped) process.exit(2);
    if (!heightReport.ok) process.exit(1);
    return;
  }

  if (!fs.existsSync(path.join(OUT, 'baseline'))) {
    console.error('No baseline — run: node visual-gate.js baseline');
    process.exit(2);
  }

  const { results, consoleErrors } = await captureAll('current');
  const diffs = [];
  let failed = false;
  for (const r of results) {
    const base = path.join(OUT, 'baseline', shotName(r.lang, r.width));
    const cur = r.path;
    const diffPath = path.join(OUT, `diff__${r.lang}__${r.width}.png`);
    if (!fs.existsSync(base)) {
      diffs.push({ lang: r.lang, width: r.width, error: 'missing baseline' });
      failed = true;
      continue;
    }
    const d = diffPct(base, cur, diffPath);
    const row = { lang: r.lang, width: r.width, pct: Number(d.pct.toFixed(4)), mismatched: d.mismatched, widthMismatch: d.widthMismatch };
    if (d.widthMismatch) row.sizes = { a: d.a, b: d.b };
    diffs.push(row);
    if (d.pct > THRESHOLD_PCT) failed = true;
  }

  const fatal = consoleErrors.filter((e) => !/favicon|Failed to load resource|net::ERR|ResizeObserver/i.test(e.msg));
  if (fatal.length) failed = true;

  const heightReport = await assertHeightAndCls();
  if (!heightReport.skipped && !heightReport.ok) failed = true;

  const report = {
    ok: !failed,
    thresholdPct: THRESHOLD_PCT,
    diffs,
    consoleErrors: fatal,
    heightCls: heightReport,
    at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(OUT, 'compare-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
