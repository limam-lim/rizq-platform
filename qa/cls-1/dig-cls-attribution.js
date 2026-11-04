#!/usr/bin/env node
/** One-shot CLS attribution dig for a viewport/lang. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.join(__dirname, '../..');
function loadPlaywright() {
  for (const c of [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    'playwright',
  ]) {
    try { return require(c); } catch (e) { /* */ }
  }
  throw new Error('no pw');
}
function startStatic() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/') url = '/rizq_landing_v8.html';
      const file = path.join(ROOT, url.replace(/^\//, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('no'); return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = { '.html': 'text/html;charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.webp': 'image/webp' };
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}
(async () => {
  const w = Number(process.env.W || 1440);
  const lang = process.env.LANG_UI || 'fr';
  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: w, height: w <= 400 ? 844 : 900 },
    locale: lang === 'fr' ? 'fr-FR' : 'ar',
  });
  const page = await ctx.newPage();
  await page.addInitScript((l) => {
    try {
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem('rizq_lang', l);
    } catch (e) { /* */ }
  }, lang);
  await page.route(/fonts\.googleapis|fonts\.gstatic/i, (r) => r.abort());
  await page.goto(base + '/rizq_landing_v8.html' + (lang === 'fr' ? '?lang=fr' : ''), { waitUntil: 'domcontentloaded', timeout: 90000 });
  const dig = await page.evaluate((ms) => new Promise((resolve) => {
    const shifts = [];
    const po = new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => {
        if (e.hadRecentInput) return;
        const sources = [];
        try {
          (e.sources || []).forEach((s) => {
            const node = s.node;
            let sel = '?';
            if (node && node.nodeType === 1) {
              sel = (node.id ? '#' + node.id : '') +
                (node.className && String(node.className).trim()
                  ? '.' + String(node.className).trim().split(/\s+/).slice(0, 3).join('.')
                  : '') +
                (node.tagName ? node.tagName.toLowerCase() : '');
            }
            sources.push({
              sel: sel.slice(0, 120),
              prev: s.previousRect ? { x: s.previousRect.x, y: s.previousRect.y, w: s.previousRect.width, h: s.previousRect.height } : null,
              cur: s.currentRect ? { x: s.currentRect.x, y: s.currentRect.y, w: s.currentRect.width, h: s.currentRect.height } : null,
            });
          });
        } catch (err) { /* */ }
        shifts.push({
          t: Number(e.startTime.toFixed(1)),
          v: Number(e.value.toFixed(4)),
          sources,
          hdr: document.body.style.getPropertyValue('--rizq-mock-hdr-h'),
          locked: window.__rmhHdrLockedH || null,
          phone: document.body.classList.contains('rmh-phone-nav-split'),
        });
      });
    });
    po.observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => {
      po.disconnect();
      resolve({
        total: shifts.reduce((a, b) => a + b.v, 0),
        shifts,
        locked: window.__rmhHdrLockedH || null,
        hdrVar: document.body.style.getPropertyValue('--rizq-mock-hdr-h'),
      });
    }, ms);
  }), 14000);
  console.log(JSON.stringify(dig, null, 2));
  fs.writeFileSync('/opt/cursor/artifacts/cls-attribution.json', JSON.stringify(dig, null, 2));
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
