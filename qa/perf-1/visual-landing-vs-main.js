#!/usr/bin/env node
/**
 * مقارنة لقطات الرئيسية vs main @ 3680ff0
 * 390/768/1024/1440 × ar/fr — فشل إن تجاوز الفرق 0.1% من البكسلات.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const OUT = path.join('/opt/cursor/artifacts/perf/visual');
const WIDTHS = [390, 768, 1024, 1440];
const LANGS = ['ar', 'fr'];
const THRESHOLD = 0.001; // 0.1%

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    path.join(ROOT, 'qa/cls-1/node_modules/playwright'),
  ];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* */ }
  }
  throw new Error('playwright missing');
}

function loadPixelmatch() {
  const candidates = [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/pixelmatch'),
    path.join(ROOT, 'qa/cls-1/node_modules/pixelmatch'),
  ];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* */ }
  }
  throw new Error('pixelmatch missing');
}

function loadPNG() {
  const candidates = [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/pngjs'),
    path.join(ROOT, 'qa/cls-1/node_modules/pngjs'),
  ];
  for (const c of candidates) {
    try { return require(c).PNG; } catch (e) { /* */ }
  }
  throw new Error('pngjs missing');
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
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
      };
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({
        base: 'http://127.0.0.1:' + server.address().port,
        stop: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

async function capture(browser, base, label) {
  const dir = path.join(OUT, label);
  fs.mkdirSync(dir, { recursive: true });
  for (const w of WIDTHS) {
    for (const lang of LANGS) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: w, height: Math.round(w * 1.35) });
      await page.addInitScript((lng) => {
        try { localStorage.setItem('rizq_lang', lng); } catch (e) {}
        try { document.cookie = 'rizq_lang=' + lng + ';path=/'; } catch (e2) {}
      }, lang);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(base + '/rizq_landing_v8.html?lang=' + lang, { waitUntil: 'domcontentloaded', timeout: 90000 });
      /* انتظر اكتمال الشريط الحي والفوتر المؤجّل */
      await page.waitForFunction(() => {
        const track = document.getElementById('cards-track');
        const live = track && track.querySelector('.ad-card img, .rzq-adx-slide img, .ad-card-img');
        const ph = document.getElementById('rizq-footer-placeholder');
        return !!live && !ph;
      }, { timeout: 45000 }).catch(() => {});
      await page.waitForTimeout(2500);
      /* إخفاء عناصر متحركة غير حتمية */
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
      const file = path.join(dir, w + '-' + lang + '.png');
      await page.screenshot({ path: file, fullPage: false });
      await page.close();
      console.log('shot', label, w, lang);
    }
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const mainRoot = path.join('/tmp', 'rizq-main-visual-' + process.pid);
  fs.mkdirSync(mainRoot, { recursive: true });
  /* استخراج ملفات main اللازمة للتصوير */
  const needed = spawnSync('git', ['ls-tree', '-r', '--name-only', '3680ff0'], { cwd: ROOT, encoding: 'utf8' });
  if (needed.status !== 0) throw new Error('git ls-tree failed');
  const files = needed.stdout.split('\n').filter((f) => f && !f.startsWith('rizq-backend/') && !f.startsWith('qa/') && !f.startsWith('.'));
  /* نسخ سريع عبر git archive لملفات الواجهة الشائعة */
  const archive = spawnSync('git', ['archive', '3680ff0'], { cwd: ROOT, encoding: 'buffer', maxBuffer: 200 * 1024 * 1024 });
  if (archive.status !== 0) throw new Error('git archive failed');
  const tarPath = path.join(mainRoot, 'tree.tar');
  fs.writeFileSync(tarPath, archive.stdout);
  spawnSync('tar', ['-xf', tarPath, '-C', mainRoot], { encoding: 'utf8' });
  fs.unlinkSync(tarPath);

  const { chromium } = loadPlaywright();
  const pixelmatch = loadPixelmatch();
  const PNG = loadPNG();

  const curSrv = await startStatic(ROOT);
  const mainSrv = await startStatic(mainRoot);
  const browser = await chromium.launch({ headless: true });
  try {
    await capture(browser, mainSrv.base, 'main');
    await capture(browser, curSrv.base, 'branch');
  } finally {
    await browser.close();
    await curSrv.stop();
    await mainSrv.stop();
  }

  let worst = 0;
  const report = [];
  for (const w of WIDTHS) {
    for (const lang of LANGS) {
      const a = PNG.sync.read(fs.readFileSync(path.join(OUT, 'main', w + '-' + lang + '.png')));
      const b = PNG.sync.read(fs.readFileSync(path.join(OUT, 'branch', w + '-' + lang + '.png')));
      const { width, height } = a;
      if (b.width !== width || b.height !== height) {
        report.push({ w, lang, error: 'size mismatch', a: [a.width, a.height], b: [b.width, b.height] });
        worst = 1;
        continue;
      }
      const diff = new PNG({ width, height });
      const n = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.1 });
      const ratio = n / (width * height);
      worst = Math.max(worst, ratio);
      const diffPath = path.join(OUT, 'diff-' + w + '-' + lang + '.png');
      fs.writeFileSync(diffPath, PNG.sync.write(diff));
      report.push({ w, lang, diffPixels: n, ratio: Number(ratio.toFixed(6)), ok: ratio <= THRESHOLD });
      console.log(w, lang, 'ratio=', ratio.toFixed(6), ratio <= THRESHOLD ? 'OK' : 'FAIL');
    }
  }
  const outJson = { threshold: THRESHOLD, worst, report };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(outJson, null, 2));
  console.log('\nworst=', worst, worst <= THRESHOLD ? 'ALL OK' : 'FAILED');
  process.exit(worst <= THRESHOLD ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
