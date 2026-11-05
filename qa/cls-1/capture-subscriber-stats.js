#!/usr/bin/env node
/**
 * لقطات لوحة المشترك — إحصاءات الظهور/النقر/التواصل عند 412 و1440.
 * usage: node capture-subscriber-stats.js [before|after] [outDir]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
function loadPlaywright() {
  const candidates = [
    path.join(__dirname, 'node_modules/playwright'),
    path.join(__dirname, '..', 'ui-logic-1', 'node_modules/playwright'),
    path.join(__dirname, '..', 'journeys', 'node_modules/playwright'),
    'playwright',
  ];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* */ }
  }
  throw new Error('playwright not found');
}
const { chromium } = loadPlaywright();

const ROOT = path.join(__dirname, '..', '..');
const mode = process.argv[2] === 'before' ? 'before' : 'after';
const outDir = process.argv[3] || path.join('/opt/cursor/artifacts', 'stats-' + mode);
fs.mkdirSync(outDir, { recursive: true });

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/') url = '/rizq_dashboard_store.html';
      const file = path.join(ROOT, url.replace(/^\//, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('no'); return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = {
        '.html': 'text/html;charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.woff2': 'font/woff2',
      };
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ base: 'http://127.0.0.1:' + server.address().port, stop: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

async function shot(page, name) {
  const file = path.join(outDir, name + '.png');
  await page.evaluate(() => {
    const a = document.getElementById('advanced-stats');
    if (a) a.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(500);
  /* لقطة عنصرين معاً عبر غلاف مؤقت */
  const handle = await page.evaluateHandle(() => {
    const a = document.getElementById('advanced-stats');
    const c = document.getElementById('contact-stats-card');
    if (!a) return document.body;
    const wrap = document.createElement('div');
    wrap.id = '__stats-shot-wrap';
    wrap.style.cssText = 'background:#f8faff;padding:12px;display:flex;flex-direction:column;gap:12px';
    const aClone = a.cloneNode(true);
    const cClone = c ? c.cloneNode(true) : null;
    wrap.appendChild(aClone);
    if (cClone) wrap.appendChild(cClone);
    document.body.appendChild(wrap);
    return wrap;
  });
  try {
    const el = handle.asElement();
    if (el) await el.screenshot({ path: file });
    else await page.screenshot({ path: file });
  } finally {
    await page.evaluate(() => {
      const w = document.getElementById('__stats-shot-wrap');
      if (w) w.remove();
    });
  }
  console.log('wrote', file);
}

(async () => {
  const srv = await startServer();
  const browser = await chromium.launch({ headless: true });
  for (const vp of [
    { w: 412, h: 900, tag: '412' },
    { w: 1440, h: 900, tag: '1440' },
  ]) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.addInitScript(() => {
      window.__RIZQ_STATS_SHOT__ = 1;
    });
    await page.goto(srv.base + '/rizq_dashboard_store.html?demo=1&id=demo_store', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(1500);
    /* أظهر لوحة الإحصاءات حتى لو كانت مقفلة لباقة مجانية في الديمو */
    await page.evaluate(() => {
      const adv = document.getElementById('advanced-stats');
      const contact = document.getElementById('contact-stats-card');
      [adv, contact].forEach((el) => {
        if (!el) return;
        el.style.display = 'block';
        el.style.visibility = 'visible';
        el.style.opacity = '1';
        el.removeAttribute('hidden');
        el.classList.remove('feature-locked', 'is-locked', 'locked');
      });
      if (window.RizqSub) {
        window.RizqSub.fetchVisitStats = function () {
          return Promise.resolve({
            total: 420,
            monthTotal: 86,
            weekTotal: 22,
            last30: Array.from({ length: 30 }, (_, i) => ({ date: 'd' + i, count: (i % 7) + 1 })),
            bySource: { direct: 40, whatsapp: 20, facebook: 15, google: 8, other: 3 },
            impressions: { total: 310, weekTotal: 48, monthTotal: 190, last30: [], bySurface: { home: 120, guide: 70, store: 0, other: 0 } },
            clicks: { total: 55, weekTotal: 12, monthTotal: 41, last30: [], bySurface: { home: 30, guide: 11, store: 0, other: 0 } },
          });
        };
        window.RizqSub.fetchContactStats = function () {
          return Promise.resolve({
            total: 18,
            weekTotal: 5,
            monthTotal: 14,
            last30: Array.from({ length: 30 }, (_, i) => ({ date: 'd' + i, count: i % 3 })),
            byType: { call: 6, whatsapp: 7, email: 1 },
            topAds: [{ adId: 'ad-demo', total: 4 }],
          });
        };
      }
      try {
        if (typeof renderAdvancedStats === 'function') renderAdvancedStats();
        if (typeof renderContactStats === 'function') renderContactStats();
      } catch (e) { /* */ }
    });
    await page.waitForTimeout(800);
    await shot(page, 'store-stats-' + mode + '-' + vp.tag);
    await page.close();
  }
  await browser.close();
  await srv.stop();
  console.log('done', mode, outDir);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
