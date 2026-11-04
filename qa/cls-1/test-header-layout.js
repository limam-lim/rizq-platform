#!/usr/bin/env node
/**
 * بوابة تخطيط هيدر الهاتف/التابلت/الكمبيوتر.
 * - هندسة: .rmh-tools و .rmh-search داخل الشاشة على 360/390/412/768/1440
 * - بصري: لقطة الهيدر ≈ مرجع c422e70 (فرق بكسل ≈ 0)
 *
 * npm run test:header-layout
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');
const os = require('os');

const ROOT = path.join(__dirname, '../..');
const OUT = path.join('/opt/cursor/artifacts', 'header-layout');
const REF_COMMIT = 'c422e70';
const WIDTHS = [360, 390, 412, 768, 1440];
const LANGS = ['ar', 'fr'];
/* سماحية بكسلات AA على شريط .rmh-main فقط (بلا تيكر/ناف) */
const MAX_DIFF_RATIO = 0.006;
const MAX_ABS_DIFF = 250;
const BOX_EPS = 1.5;

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra != null ? String(extra).slice(0, 240) : ''); }
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
  const dir = path.join(os.tmpdir(), 'rizq-header-ref-' + REF_COMMIT.slice(0, 7));
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

async function measureHeader(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    function box(sel) {
      const el = document.querySelector(sel);
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
      brand: box('#rizq-mock-hdr .rmh-brand, .rmh-brand'),
      tools: box('#rizq-mock-hdr .rmh-tools, .rmh-tools'),
      search: box('#rizq-mock-hdr .rmh-search, .rmh-search'),
      main: box('#rizq-mock-hdr .rmh-main, .rmh-main'),
    };
  });
}

function inViewport(box, vw) {
  if (!box || !box.visible) return false;
  const eps = 1.5;
  return box.x >= -eps && box.right <= vw + eps;
}

function boxesClose(a, b, eps) {
  if (!a || !b) return false;
  return Math.abs(a.x - b.x) <= eps
    && Math.abs(a.y - b.y) <= eps
    && Math.abs(a.w - b.w) <= eps
    && Math.abs(a.h - b.h) <= eps;
}

async function captureMainStrip(browser, base, width, lang, outPath) {
  const ctx = await browser.newContext({
    viewport: { width: width, height: Math.max(720, 900) },
    locale: lang === 'fr' ? 'fr-FR' : 'ar-MR',
  });
  const page = await ctx.newPage();
  await page.addInitScript((l) => {
    try { localStorage.setItem('rizq_lang', l); } catch (e) { /* */ }
    try {
      document.cookie = 'rizq_lang=' + l + ';path=/;max-age=31536000';
    } catch (e2) { /* */ }
  }, lang);
  await page.goto(base + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#rizq-mock-hdr .rmh-main, .rmh-main', { timeout: 20000 });
  await page.waitForTimeout(1400);
  const metrics = await measureHeader(page);
  if (!metrics.main) {
    await ctx.close();
    throw new Error('rmh-main missing at ' + width + '-' + lang);
  }
  const clip = {
    x: 0,
    y: Math.max(0, Math.floor(metrics.main.y)),
    width: width,
    height: Math.max(1, Math.ceil(metrics.main.h) + 2),
  };
  await page.screenshot({ path: outPath, clip: clip });
  await ctx.close();
  return metrics;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.join(OUT, 'ref'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'cur'), { recursive: true });

  const { chromium } = loadPlaywright();
  let pixelmatch = null;
  let PNG = null;
  try {
    pixelmatch = require(path.join(__dirname, 'node_modules/pixelmatch'));
  } catch (e) {
    try { pixelmatch = require('pixelmatch'); } catch (e2) { /* */ }
  }
  try {
    PNG = require(path.join(__dirname, 'node_modules/pngjs')).PNG;
  } catch (e3) {
    try { PNG = require('pngjs').PNG; } catch (e4) { /* */ }
  }
  if (!pixelmatch || !PNG) {
    console.error('pixelmatch+pngjs required in qa/cls-1 (npm i pixelmatch pngjs)');
    process.exit(2);
  }

  const curSrv = await startStatic(ROOT);
  let refDir = null;
  let refSrv = null;
  try {
    refDir = ensureRefWorktree();
    refSrv = await startStatic(refDir);
  } catch (eRef) {
    console.warn('[header-layout] ref worktree unavailable:', eRef.message);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const lang of LANGS) {
      for (const w of WIDTHS) {
        const curPath = path.join(OUT, 'cur', w + '-' + lang + '.png');
        const metrics = await captureMainStrip(browser, curSrv.base, w, lang, curPath);
        const tag = w + '-' + lang;
        ok(tag + ' tools in viewport',
          metrics.tools && inViewport(metrics.tools, metrics.vw),
          metrics.tools);
        ok(tag + ' search in viewport',
          metrics.search && inViewport(metrics.search, metrics.vw),
          metrics.search);

        if (refSrv) {
          const refPath = path.join(OUT, 'ref', w + '-' + lang + '.png');
          const refMetrics = await captureMainStrip(browser, refSrv.base, w, lang, refPath);
          ok(tag + ' boxes ≈ c422e70',
            boxesClose(metrics.brand, refMetrics.brand, BOX_EPS)
            && boxesClose(metrics.tools, refMetrics.tools, BOX_EPS)
            && boxesClose(metrics.search, refMetrics.search, BOX_EPS)
            && boxesClose(metrics.main, refMetrics.main, BOX_EPS),
            { cur: metrics, ref: refMetrics });

          const curBuf = fs.readFileSync(curPath);
          const refBuf = fs.readFileSync(refPath);
          const imgA = PNG.sync.read(refBuf);
          const imgB = PNG.sync.read(curBuf);
          let diffCount = Number.MAX_SAFE_INTEGER;
          let totalPx = 1;
          if (imgA.width === imgB.width && imgA.height === imgB.height) {
            const { width, height } = imgA;
            const diff = new PNG({ width, height });
            diffCount = pixelmatch(imgA.data, imgB.data, diff.data, width, height, {
              threshold: 0.1,
              includeAA: true,
            });
            totalPx = width * height;
            fs.writeFileSync(path.join(OUT, 'diff-' + tag + '.png'), PNG.sync.write(diff));
          }
          const ratio = totalPx ? diffCount / totalPx : 1;
          const visualOk = diffCount <= MAX_ABS_DIFF || ratio <= MAX_DIFF_RATIO;
          ok(tag + ' visual ≈ c422e70 (.rmh-main)', visualOk,
            'diff=' + diffCount + ' / ' + totalPx + ' ratio=' + ratio.toFixed(5));
        }
      }
    }
  } finally {
    await browser.close();
    await curSrv.stop();
    if (refSrv) await refSrv.stop();
  }

  const report = { pass, fail, out: OUT, ref: REF_COMMIT, widths: WIDTHS, langs: LANGS };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\nheader-layout: ' + pass + ' passed, ' + fail + ' failed');
  console.log('artifacts:', OUT);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
