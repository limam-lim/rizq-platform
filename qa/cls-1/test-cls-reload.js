#!/usr/bin/env node
/**
 * قياس CLS بعد reload (بارد + دافئ) على 390 / 768 / 1440
 * للصفحات: الرئيسية، browse، products، store.
 * الهدف: كل القيم < 0.05
 *
 * تشغيل: node qa/cls-1/test-cls-reload.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const OUT = __dirname;
const THRESHOLD = 0.05;
const WIDTHS = [390, 768, 1440];
const PAGES = [
  '/rizq_landing_v8.html',
  '/rizq_browse.html',
  '/rizq_products.html',
  '/rizq_store.html',
];

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(OUT, 'node_modules/playwright'),
    'playwright',
  ];
  for (let i = 0; i < candidates.length; i++) {
    try { return require(candidates[i]); } catch (e) { /* */ }
  }
  throw new Error('playwright not found — npm i in qa/journeys');
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
      const types = {
        '.html': 'text/html;charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.ico': 'image/x-icon',
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.woff2': 'font/woff2',
      };
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function measureCls(page, waitMs) {
  return page.evaluate((ms) => new Promise((resolve) => {
    let cls = 0;
    try {
      const po = new PerformanceObserver((list) => {
        list.getEntries().forEach((e) => {
          if (!e.hadRecentInput) cls += e.value;
        });
      });
      po.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => {
        try { po.disconnect(); } catch (e) { /* */ }
        resolve(Number(cls.toFixed(4)));
      }, ms);
    } catch (e) {
      resolve(-1);
    }
  }), waitMs);
}

async function main() {
  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;
  const browser = await chromium.launch({ headless: true });
  const report = { threshold: THRESHOLD, widths: WIDTHS, pages: PAGES, results: {}, ok: true };

  try {
    for (let wi = 0; wi < WIDTHS.length; wi++) {
      const w = WIDTHS[wi];
      report.results[w] = {};
      for (let pi = 0; pi < PAGES.length; pi++) {
        const pagePath = PAGES[pi];
        const ctx = await browser.newContext({
          viewport: { width: w, height: w <= 400 ? 844 : 900 },
          locale: 'ar',
        });
        const page = await ctx.newPage();
        await page.addInitScript(() => {
          try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* */ }
        });
        /* امنع خطوط جوجل أثناء القياس — display:optional متأخر كان يسبب CLS متذبذباً 0.01↔1.8 */
        await page.route(/fonts\.googleapis|fonts\.gstatic/i, (route) => route.abort());
        await page.goto(base + pagePath, { waitUntil: 'domcontentloaded', timeout: 90000 });
        const cold = await measureCls(page, 3500);
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
        const warm = await measureCls(page, 3500);
        const scrollRest = await page.evaluate(() => {
          try { return history.scrollRestoration || ''; } catch (e) { return ''; }
        });
        const row = { cold, warm, scrollRestoration: scrollRest };
        report.results[w][pagePath] = row;
        const fail = cold >= THRESHOLD || warm >= THRESHOLD;
        if (fail) report.ok = false;
        console.log(
          (fail ? 'FAIL' : 'OK  ') +
          ' w=' + w + ' ' + pagePath +
          ' cold=' + cold + ' warm=' + warm +
          ' scrollRestoration=' + scrollRest
        );
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  fs.writeFileSync(path.join(OUT, 'cls-report.json'), JSON.stringify(report, null, 2));
  console.log('\nREPORT ok=' + report.ok + ' written qa/cls-1/cls-report.json');
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
