#!/usr/bin/env node
'use strict';
/**
 * قارن offsetHeight لكل section[id] بين baseline (main) والفرع الحالي.
 * Usage: node qa/home-commerce-1/measure-section-heights.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const BASELINE_DIR = path.join(__dirname, '.baseline-main');
const WIDTHS = [390, 768, 1440];
const LANGS = ['ar', 'fr'];

function loadPlaywright() {
  for (const c of [
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(ROOT, 'qa/refactor-landing-1/node_modules/playwright'),
    path.join(ROOT, 'qa/cls-1/node_modules/playwright'),
    'playwright',
  ]) {
    try { return require(c); } catch (e) { /* */ }
  }
  throw new Error('playwright missing');
}

function ensureBaseline() {
  fs.rmSync(BASELINE_DIR, { recursive: true, force: true });
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  // نسخة كاملة من main للملفات الثابتة المستخدمة في الرئيسية
  const files = spawnSync('git', ['ls-tree', '-r', '--name-only', 'origin/main'], {
    cwd: ROOT, encoding: 'utf8'
  }).stdout.split('\n').filter(Boolean);
  const keep = files.filter((f) =>
    /\.(html|css|js|svg|woff2|png|jpg|jpeg|webp|json)$/i.test(f)
    && !f.startsWith('rizq-backend/')
    && !f.startsWith('node_modules/')
    && !f.startsWith('qa/')
    && !f.startsWith('deploy/')
  );
  for (const f of keep) {
    const out = path.join(BASELINE_DIR, f);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const buf = spawnSync('git', ['show', 'origin/main:' + f], { cwd: ROOT, encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 });
    if (buf.status === 0 && buf.stdout) fs.writeFileSync(out, buf.stdout);
  }
  // assets dirs if present
  for (const d of ['rizq-assets', 'vendor', 'help-images']) {
    const src = path.join(ROOT, d);
    if (fs.existsSync(src)) {
      spawnSync('cp', ['-a', src, path.join(BASELINE_DIR, d)]);
    }
  }
}

function startStatic(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/') url = '/rizq_landing_v8.html';
      const file = path.join(root, url.replace(/^\//, ''));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('no'); return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = {
        '.html': 'text/html;charset=utf-8', '.js': 'application/javascript', '.css': 'text/css',
        '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
        '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2',
      };
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function measure(page, lang) {
  await page.addInitScript((l) => {
    try { localStorage.setItem('rizq_lang', l); } catch (e) {}
    try {
      localStorage.setItem('rizq_launch_cache_v1', JSON.stringify({
        launchDate: null, freeDays: 90, freeUntil: null, minActiveAdsToShow: 0, savedAt: Date.now()
      }));
    } catch (e2) {}
  }, lang);
  await page.goto('http://127.0.0.1:' + page._rizqPort + '/rizq_landing_v8.html', {
    waitUntil: 'networkidle', timeout: 90000
  }).catch(() => {});
  await page.waitForTimeout(1800);
  return page.evaluate(() => {
    const sections = {};
    document.querySelectorAll('section[id], #hero, #hero-listings, #rizq-styles, #rizq-showroom-models, #rizq-vid-strip, #rvid-section, #categories, #listings, #virtual-stores, #virtual-showrooms, #virtual-estate, #rizq-estate-models, #virtual-offices, #prices, #pricing').forEach((el) => {
      const id = el.id;
      if (!id) return;
      sections[id] = {
        offsetHeight: el.offsetHeight,
        scrollHeight: el.scrollHeight,
        tag: el.tagName.toLowerCase(),
      };
    });
    return {
      sections,
      pageHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    };
  });
}

async function measureCls(page) {
  return page.evaluate(() => new Promise((resolve) => {
    let cls = 0;
    try {
      const po = new PerformanceObserver((list) => {
        list.getEntries().forEach((e) => { if (!e.hadRecentInput) cls += e.value; });
      });
      po.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => { try { po.disconnect(); } catch (e) {} resolve(Number(cls.toFixed(4))); }, 2200);
    } catch (e) { resolve(0); }
  }));
}

(async () => {
  console.log('Preparing main baseline tree…');
  ensureBaseline();
  const { chromium } = loadPlaywright();
  const baseSrv = await startStatic(BASELINE_DIR);
  const branchSrv = await startStatic(ROOT);
  const basePort = baseSrv.address().port;
  const branchPort = branchSrv.address().port;
  const browser = await chromium.launch({ headless: true });
  const report = { widths: {}, cls: {} };

  for (const w of WIDTHS) {
    report.widths[w] = {};
    for (const lang of LANGS) {
      const basePage = await browser.newPage({ viewport: { width: w, height: 900 } });
      basePage._rizqPort = basePort;
      const branchPage = await browser.newPage({ viewport: { width: w, height: 900 } });
      branchPage._rizqPort = branchPort;

      const base = await measure(basePage, lang);
      const branch = await measure(branchPage, lang);

      // CLS cold on branch
      await branchPage.reload({ waitUntil: 'networkidle' }).catch(() => {});
      const clsCold = await measureCls(branchPage);
      await branchPage.reload({ waitUntil: 'networkidle' }).catch(() => {});
      const clsWarm = await measureCls(branchPage);

      const ids = Array.from(new Set([...Object.keys(base.sections), ...Object.keys(branch.sections)])).sort();
      const rows = ids.map((id) => {
        const b = base.sections[id] ? base.sections[id].offsetHeight : null;
        const n = branch.sections[id] ? branch.sections[id].offsetHeight : null;
        const diff = (b != null && n != null) ? (n - b) : null;
        return { id, main: b, branch: n, diff, ok: diff == null ? null : Math.abs(diff) <= 2 };
      });
      const pageDiff = branch.pageHeight - base.pageHeight;
      report.widths[w][lang] = {
        pageHeight: { main: base.pageHeight, branch: branch.pageHeight, diff: pageDiff, ok: Math.abs(pageDiff) <= 5 },
        sections: rows,
        failing: rows.filter((r) => r.ok === false),
      };
      report.cls[w + '_' + lang] = { cold: clsCold, warm: clsWarm, ok: clsCold < 0.05 && clsWarm < 0.05 };

      await basePage.close();
      await branchPage.close();
      console.log('done', w, lang, 'pageDiff', pageDiff, 'failing', rows.filter((r) => r.ok === false).length, 'cls', clsCold, clsWarm);
    }
  }

  await browser.close();
  baseSrv.close();
  branchSrv.close();

  const out = path.join(__dirname, 'height-compare.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  fs.writeFileSync('/opt/cursor/artifacts/height-compare.json', JSON.stringify(report, null, 2));
  console.log('wrote', out);

  // summary table for 390/1440 ar
  for (const w of [390, 1440]) {
    const block = report.widths[w].ar;
    console.log('\n=== width', w, 'ar page', block.pageHeight, '===');
    block.sections.filter((r) => r.main != null || r.branch != null).forEach((r) => {
      if (r.diff != null && Math.abs(r.diff) > 2) {
        console.log(r.id, 'main', r.main, 'branch', r.branch, 'diff', r.diff);
      }
    });
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
