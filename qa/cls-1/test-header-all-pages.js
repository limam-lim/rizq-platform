#!/usr/bin/env node
/**
 * بوابة الهيدر الموحّد على كل الصفحات العامة (لا الرئيسية فقط).
 * - #rizq-mock-hdr موجود مع .rmh-tools / .rmh-search / .rmh-nav داخل الشاشة (أفقياً وعمودياً)
 * - توحيد بصري: .rmh-main لكل صفحة ≈ الرئيسية الحالية عند نفس العرض
 * - مقارنة بصرية مع مرجع 229ae84 (.rmh-main على نفس الصفحة أو landing)
 *
 * npm run test:header-all-pages
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const os = require('os');

const ROOT = path.join(__dirname, '../..');
const OUT = path.join('/opt/cursor/artifacts', 'header-all-pages');
/* مرجع بصري كما طلب المستخدم — آخر دمج تصميم قبل كسر e348824 */
const REF_COMMIT = '229ae84';
const WIDTHS = [360, 412, 768, 1440];
const PAGES = [
  'rizq_landing_v8.html',
  'rizq_browse.html',
  'rizq_store.html',
  'rizq_showroom.html',
  'rizq_estate.html',
  'rizq_office.html',
  'rizq_cart.html',
  'rizq_favorites.html',
  'rizq_market_pulse.html',
];
/* وحدة الصفحات مع الرئيسية الحالية — سماحية AA/خطوط بين صفحات تحمّل Cairo بشكل مختلف */
const UNITY_MAX_DIFF_RATIO = 0.035;
const UNITY_MAX_ABS_DIFF = 1200;
/*
 * انحراف معروف عن 229ae84 بسبب إصلاحات FOUC/CLS اللاحقة على main
 * (ارتفاع التيكر ~28 بدل ~19، إلخ) — لا تراجع بصري مقصود في هذا الـ PR.
 */
const REF_MAX_DIFF_RATIO = 0.07;
const REF_MAX_ABS_DIFF = 4500;
const BOX_EPS = 2;

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra != null ? String(extra).slice(0, 260) : ''); }
}

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(__dirname, 'node_modules/playwright'),
    'playwright',
  ];
  for (let i = 0; i < candidates.length; i++) {
    try { return require(candidates[i]); } catch (e) { /* */ }
  }
  throw new Error('playwright not found');
}

function startStatic(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/') url = '/rizq_landing_v8.html';
      const file = path.join(rootDir, url.replace(/^\//, ''));
      if (!file.startsWith(rootDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('no'); return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = {
        '.html': 'text/html;charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.jpg': 'image/jpeg',
        '.json': 'application/json',
        '.woff2': 'font/woff2',
        '.webp': 'image/webp',
      };
      res.writeHead(200, {
        'content-type': types[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        base: 'http://127.0.0.1:' + server.address().port,
        stop: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

function ensureRefWorktree() {
  const dir = path.join(os.tmpdir(), 'rizq-header-all-ref-' + REF_COMMIT.slice(0, 7));
  if (fs.existsSync(path.join(dir, 'rizq_landing_v8.html'))) return dir;
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* */ }
  const r = spawnSync('git', ['worktree', 'add', '--detach', dir, REF_COMMIT], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    throw new Error('git worktree add failed: ' + (r.stderr || r.stdout || ''));
  }
  return dir;
}

async function settleHeader(page) {
  /* صفحات مثل office تستدعي scrollIntoView عند الإقلاع — تثبّت أعلى الصفحة للّقطة */
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => { try { window.scrollTo(0, 0); } catch (e) { /* */ } });
    await page.waitForTimeout(80);
  }
  await page.waitForFunction(() => {
    try { window.scrollTo(0, 0); } catch (eS) { /* */ }
    const hdrs = document.querySelectorAll('#rizq-mock-hdr');
    if (!hdrs.length) return false;
    let hdr = null;
    for (let i = 0; i < hdrs.length; i++) {
      if (hdrs[i].querySelector('nav.rmh-nav') && hdrs[i].querySelector(':scope > .rmh-main')) {
        hdr = hdrs[i];
        break;
      }
    }
    if (!hdr) return false;
    const cs = getComputedStyle(hdr);
    const main = hdr.querySelector(':scope > .rmh-main');
    const r = main.getBoundingClientRect();
    const tools = hdr.querySelector('.rmh-tools');
    const search = hdr.querySelector('.rmh-search');
    if (!tools || !search) return false;
    const tr = tools.getBoundingClientRect();
    const sr = search.getBoundingClientRect();
    const searchBg = getComputedStyle(search).backgroundColor || '';
    const searchIsLight = /rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/.test(searchBg)
      || /rgba\(\s*255\s*,\s*255\s*,\s*255/.test(searchBg);
    return cs.position === 'fixed'
      && (window.scrollY || 0) < 2
      && r.y >= 0 && r.y < 120 && r.height > 40
      && tr.height > 8 && sr.height > 8
      && tr.y >= 0 && sr.y >= 0
      && searchIsLight;
  }, { timeout: 25000 });
  try {
    await page.evaluate(() => (document.fonts && document.fonts.ready) || Promise.resolve());
  } catch (eFont) { /* */ }
  await page.evaluate(() => {
    try { window.scrollTo(0, 0); } catch (e2) { /* */ }
    /* طبقات opacity:0 بعرض الشاشة تفسد أحياناً لقطة clip على Chromium */
    ['promo-overlay', 'rizq-chat-window'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
      }
    });
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { try { window.scrollTo(0, 0); } catch (e3) { /* */ } });
}

async function captureHeader(page, width, outPath) {
  await page.setViewportSize({ width: width, height: Math.max(720, 900) });
  await settleHeader(page);

  const metrics = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hdrs = document.querySelectorAll('#rizq-mock-hdr');
    let hdr = null;
    for (let i = 0; i < hdrs.length; i++) {
      if (hdrs[i].querySelector('nav.rmh-nav') && hdrs[i].querySelector(':scope > .rmh-main')) {
        hdr = hdrs[i];
        break;
      }
    }
    function box(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.x, y: r.y, w: r.width, h: r.height,
        right: r.right, bottom: r.bottom,
        visible: r.width > 0 && r.height > 0,
      };
    }
    return {
      vw,
      vh,
      hdrCount: hdrs.length,
      hasHdr: !!hdr,
      hasNav: !!(hdr && hdr.querySelector('nav.rmh-nav')),
      tools: box(hdr && hdr.querySelector('.rmh-tools')),
      search: box(hdr && hdr.querySelector('.rmh-search')),
      nav: box(hdr && hdr.querySelector('nav.rmh-nav')),
      main: box(hdr && hdr.querySelector(':scope > .rmh-main')),
      bodyPadTop: parseFloat(getComputedStyle(document.body).paddingTop) || 0,
      scrollY: window.scrollY || 0,
    };
  });

  if (metrics.main && metrics.main.y >= 0) {
    const clip = {
      x: 0,
      y: Math.max(0, Math.floor(metrics.main.y)),
      width: width,
      height: Math.max(1, Math.ceil(metrics.main.h) + 2),
    };
    await page.screenshot({ path: outPath, clip: clip });
  }
  return metrics;
}

function inViewport(box, vw, vh) {
  if (!box || !box.visible) return false;
  const eps = 1.5;
  return box.x >= -eps
    && box.right <= vw + eps
    && box.y >= -eps
    && box.bottom <= vh + eps;
}

function pixelDiff(PNG, pixelmatch, pathA, pathB, diffOut) {
  if (!fs.existsSync(pathA) || !fs.existsSync(pathB)) {
    return { ok: false, diffCount: Number.MAX_SAFE_INTEGER, totalPx: 1, ratio: 1, reason: 'missing' };
  }
  const imgA = PNG.sync.read(fs.readFileSync(pathA));
  const imgB = PNG.sync.read(fs.readFileSync(pathB));
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    return {
      ok: false,
      diffCount: Number.MAX_SAFE_INTEGER,
      totalPx: 1,
      ratio: 1,
      reason: 'size ' + imgA.width + 'x' + imgA.height + ' vs ' + imgB.width + 'x' + imgB.height,
    };
  }
  const { width, height } = imgA;
  const diff = new PNG({ width, height });
  const diffCount = pixelmatch(imgA.data, imgB.data, diff.data, width, height, {
    threshold: 0.15,
    includeAA: false,
  });
  const totalPx = width * height;
  if (diffOut) fs.writeFileSync(diffOut, PNG.sync.write(diff));
  return { ok: true, diffCount, totalPx, ratio: totalPx ? diffCount / totalPx : 1 };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.join(OUT, 'ref'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'cur'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'unity'), { recursive: true });

  const { chromium } = loadPlaywright();
  let pixelmatch = null;
  let PNG = null;
  try { pixelmatch = require(path.join(__dirname, 'node_modules/pixelmatch')); }
  catch (e) { try { pixelmatch = require('pixelmatch'); } catch (e2) { /* */ } }
  try { PNG = require(path.join(__dirname, 'node_modules/pngjs')).PNG; }
  catch (e3) { try { PNG = require('pngjs').PNG; } catch (e4) { /* */ } }
  if (!pixelmatch || !PNG) {
    console.error('pixelmatch+pngjs required in qa/cls-1');
    process.exit(2);
  }

  const curSrv = await startStatic(ROOT);
  let refDir = null;
  let refSrv = null;
  try {
    refDir = ensureRefWorktree();
    refSrv = await startStatic(refDir);
  } catch (eRef) {
    console.warn('[header-all-pages] ref worktree unavailable:', eRef.message);
  }

  const browser = await chromium.launch({ headless: true });
  const landingCurByWidth = {};
  try {
    /* أولاً: التقط الرئيسية كمرجع وحدة لكل عرض */
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: Math.max(720, 900) },
        locale: 'ar-MR',
      });
      const page = await ctx.newPage();
      await page.addInitScript(() => {
        try { localStorage.setItem('rizq_lang', 'ar'); } catch (e) { /* */ }
        try {
          Element.prototype.scrollIntoView = function () { /* test: keep header in frame */ };
        } catch (eScroll) { /* */ }
      });
      await page.goto(curSrv.base + '/rizq_landing_v8.html', {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      const landingPath = path.join(OUT, 'unity', 'landing-' + w + '.png');
      const lm = await captureHeader(page, w, landingPath);
      landingCurByWidth[w] = { path: landingPath, metrics: lm };
      ok('landing-' + w + ' single #rizq-mock-hdr', lm.hdrCount === 1, 'hdrCount=' + lm.hdrCount);
      await ctx.close();
    }

    for (const pageName of PAGES) {
      for (const w of WIDTHS) {
        const tag = pageName.replace(/\.html$/, '') + '-' + w;
        const ctx = await browser.newContext({
          viewport: { width: w, height: Math.max(720, 900) },
          locale: 'ar-MR',
        });
        const page = await ctx.newPage();
        await page.addInitScript(() => {
          try { localStorage.setItem('rizq_lang', 'ar'); } catch (e) { /* */ }
          try {
            Element.prototype.scrollIntoView = function () { /* test: keep header in frame */ };
          } catch (eScroll) { /* */ }
        });
        await page.goto(curSrv.base + '/' + pageName, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const curPath = path.join(OUT, 'cur', tag + '.png');
        let metrics;
        try {
          metrics = await captureHeader(page, w, curPath);
        } catch (eCap) {
          ok(tag + ' header boots', false, eCap.message);
          await ctx.close();
          continue;
        }

        ok(tag + ' #rizq-mock-hdr present', metrics.hasHdr);
        ok(tag + ' single header', metrics.hdrCount === 1, 'hdrCount=' + metrics.hdrCount);
        ok(tag + ' nav.rmh-nav present', metrics.hasNav);
        ok(tag + ' tools in viewport',
          metrics.tools && inViewport(metrics.tools, metrics.vw, metrics.vh), metrics.tools);
        ok(tag + ' search in viewport',
          metrics.search && inViewport(metrics.search, metrics.vw, metrics.vh), metrics.search);
        ok(tag + ' nav in viewport',
          metrics.nav && inViewport(metrics.nav, metrics.vw, metrics.vh), metrics.nav);

        /* وحدة مع الرئيسية الحالية */
        if (pageName !== 'rizq_landing_v8.html' && landingCurByWidth[w]) {
          const u = pixelDiff(
            PNG, pixelmatch,
            landingCurByWidth[w].path,
            curPath,
            path.join(OUT, 'unity', 'diff-' + tag + '.png')
          );
          const unityOk = u.ok && (u.diffCount <= UNITY_MAX_ABS_DIFF || u.ratio <= UNITY_MAX_DIFF_RATIO);
          ok(tag + ' visual ≈ current landing (.rmh-main)', unityOk,
            'diff=' + u.diffCount + ' / ' + u.totalPx + ' ratio=' + u.ratio.toFixed(5)
            + (u.reason ? ' ' + u.reason : ''));
        }

        /* المرجع التاريخي 229ae84 */
        if (refSrv) {
          const refPageName = fs.existsSync(path.join(refDir, pageName))
            ? pageName
            : 'rizq_landing_v8.html';
          const refCtx = await browser.newContext({
            viewport: { width: w, height: Math.max(720, 900) },
            locale: 'ar-MR',
          });
          const refPage = await refCtx.newPage();
          await refPage.addInitScript(() => {
            try { localStorage.setItem('rizq_lang', 'ar'); } catch (e) { /* */ }
            try {
              Element.prototype.scrollIntoView = function () { /* test: keep header in frame */ };
            } catch (eScroll) { /* */ }
          });
          await refPage.goto(refSrv.base + '/' + refPageName, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
          });
          const refPath = path.join(OUT, 'ref', tag + '.png');
          try {
            await captureHeader(refPage, w, refPath);
          } catch (eRefCap) {
            ok(tag + ' visual ≈ ' + REF_COMMIT, false, eRefCap.message);
            await refCtx.close();
            await ctx.close();
            continue;
          }
          await refCtx.close();

          const d = pixelDiff(
            PNG, pixelmatch,
            refPath,
            curPath,
            path.join(OUT, 'diff-' + tag + '.png')
          );
          const visualOk = d.ok && (d.diffCount <= REF_MAX_ABS_DIFF || d.ratio <= REF_MAX_DIFF_RATIO);
          ok(tag + ' visual ≈ ' + REF_COMMIT + ' (.rmh-main)', visualOk,
            'diff=' + d.diffCount + ' / ' + d.totalPx + ' ratio=' + d.ratio.toFixed(5)
            + (refPageName !== pageName ? ' (ref=' + refPageName + ')' : '')
            + (d.reason ? ' ' + d.reason : ''));
        }

        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    await curSrv.stop();
    if (refSrv) await refSrv.stop();
  }

  const report = {
    pass, fail, out: OUT, ref: REF_COMMIT, widths: WIDTHS, pages: PAGES,
    unityMaxRatio: UNITY_MAX_DIFF_RATIO, refMaxRatio: REF_MAX_DIFF_RATIO,
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\nheader-all-pages: ' + pass + ' passed, ' + fail + ' failed');
  console.log('artifacts:', OUT);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
