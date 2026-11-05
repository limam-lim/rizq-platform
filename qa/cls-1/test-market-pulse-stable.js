#!/usr/bin/env node
/**
 * نبضة السوق: نفس الصفحة × 10 زيارات على 412 — الطول وعدد الصفوف ثابتان
 * (بدون سباق خطوط/تمرير يُظهر أحياناً 8 صفوف وأحياناً 12).
 *
 * تشغيل: node qa/cls-1/test-market-pulse-stable.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const RUNS = 10;
const VIEWPORT = { width: 412, height: 915 };

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    'playwright',
  ];
  for (let i = 0; i < candidates.length; i++) {
    try { return require(candidates[i]); } catch (e) { /* */ }
  }
  throw new Error('playwright not found');
}

function ok(label, cond, detail) {
  if (cond) console.log('  ✓ ' + label);
  else {
    console.log('  ✗ ' + label + (detail != null ? ' — ' + JSON.stringify(detail) : ''));
    ok.fail = (ok.fail || 0) + 1;
  }
  ok.pass = (ok.pass || 0) + (cond ? 1 : 0);
}

function startStatic() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/') url = '/rizq_market_pulse.html';
      const file = path.join(ROOT, url.replace(/^\//, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
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
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  ok('rizq_market_pulse.html present', fs.existsSync(path.join(ROOT, 'rizq_market_pulse.html')));
  const html = fs.readFileSync(path.join(ROOT, 'rizq_market_pulse.html'), 'utf8');
  ok('uses local Cairo (no Google Fonts link)', !/fonts\.googleapis\.com/.test(html) && /fonts\/cairo\.css/.test(html));
  ok('PER_PAGE is 12 (full food board on first paint)', /var PER_PAGE\s*=\s*12/.test(html));
  ok('auto-more gated on user gesture', /_mpAllowAutoMore/.test(html));

  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });

  const samples = [];
  for (let i = 0; i < RUNS; i++) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      locale: 'ar-MR',
    });
    await context.addInitScript(() => {
      try { localStorage.clear(); } catch (e) { /* */ }
      try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e2) { /* */ }
    });
    const page = await context.newPage();
    await page.goto(origin + '/rizq_market_pulse.html', { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(900);
    const snap = await page.evaluate(() => {
      const rows = document.querySelectorAll('#mp-tbody tr.mp-row').length;
      const infinite = (document.getElementById('mp-infinite') || {}).textContent || '';
      const h1 = document.getElementById('mp-title');
      const h1Size = h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0;
      const name = document.querySelector('.mp-name');
      const nameSize = name ? parseFloat(getComputedStyle(name).fontSize) : 0;
      return {
        rows,
        infinite: String(infinite).replace(/\s+/g, ' ').trim(),
        scrollHeight: document.documentElement.scrollHeight,
        h1Size,
        nameSize,
      };
    });
    samples.push(snap);
    await context.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  const heights = samples.map((s) => s.scrollHeight);
  const rows = samples.map((s) => s.rows);
  const h1s = samples.map((s) => s.h1Size);
  const names = samples.map((s) => s.nameSize);
  const uniqH = Array.from(new Set(heights));
  const uniqR = Array.from(new Set(rows));

  ok('every visit shows 12 food rows', rows.every((n) => n === 12), rows);
  ok('no truncated «عرض 8 من 12» banner', samples.every((s) => !/عرض\s*8\s*من/.test(s.infinite)), samples.map((s) => s.infinite));
  ok('scrollHeight identical across ' + RUNS + ' visits', uniqH.length === 1, { heights: uniqH, all: heights });
  ok('h1 font-size stable', Array.from(new Set(h1s.map((n) => Math.round(n)))).length === 1, h1s);
  ok('row name font-size stable', Array.from(new Set(names.map((n) => Math.round(n)))).length === 1, names);
  ok('row count identical', uniqR.length === 1 && uniqR[0] === 12, rows);

  const fail = ok.fail || 0;
  console.log(fail ? ('\nFAILED ' + fail + ' / ' + (ok.pass + fail)) : ('\nALL OK / ' + ok.pass));
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
