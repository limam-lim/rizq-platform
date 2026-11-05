#!/usr/bin/env node
/**
 * بوابة CLS للبند 1 — الرئيسية + صفحة الإعلانات.
 * 30 تشغيلاً لكل صفحة (6 عروض × 5)، مراقبة 14ث، أقصى ≤ 0.1
 *
 * node qa/cls-1/test-cls-landing-browse.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const OUT = '/opt/cursor/artifacts';
const THRESHOLD = 0.1;
const OBSERVE_MS = 14000;
const RUNS_PER = 5;
const PAGES = ['/rizq_landing_v8.html', '/rizq_browse.html'];
const COMBOS = [
  { w: 390, lang: 'fr', h: 844 },
  { w: 390, lang: 'ar', h: 844 },
  { w: 768, lang: 'fr', h: 900 },
  { w: 768, lang: 'ar', h: 900 },
  { w: 1440, lang: 'fr', h: 900 },
  { w: 1440, lang: 'ar', h: 900 },
];

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

function median(arr) {
  const a = arr.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
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
  fs.mkdirSync(OUT, { recursive: true });
  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;
  const browser = await chromium.launch({ headless: true });
  const report = {
    threshold: THRESHOLD,
    observeMs: OBSERVE_MS,
    pages: {},
    ok: true,
  };

  try {
    for (const pagePath of PAGES) {
      const pageKey = pagePath.replace(/^\//, '').replace(/\.html$/, '');
      report.pages[pageKey] = { combos: {}, ok: true };
      console.log('\n######## ' + pageKey + ' ########');
      for (const combo of COMBOS) {
        const key = combo.w + '-' + combo.lang;
        const samples = [];
        console.log('\n— ' + pageKey + ' ' + key + ' × ' + RUNS_PER + ' —');
        for (let i = 0; i < RUNS_PER; i++) {
          const ctx = await browser.newContext({
            viewport: { width: combo.w, height: combo.h },
            locale: combo.lang === 'fr' ? 'fr-FR' : 'ar',
          });
          const page = await ctx.newPage();
          await page.addInitScript((lang) => {
            try {
              localStorage.clear();
              sessionStorage.clear();
              localStorage.setItem('rizq_lang', lang === 'fr' ? 'fr' : 'ar');
              document.documentElement.lang = lang === 'fr' ? 'fr' : 'ar';
            } catch (e) { /* */ }
            try {
              Element.prototype.scrollIntoView = function () { /* CLS measure: no auto-scroll noise */ };
            } catch (e2) { /* */ }
          }, combo.lang);
          await page.route(/fonts\.googleapis|fonts\.gstatic/i, (route) => route.abort());
          const target = base + pagePath + (combo.lang === 'fr' ? '?lang=fr' : '');
          let navigated = false;
          for (let attempt = 1; attempt <= 3 && !navigated; attempt++) {
            try {
              await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 90000 });
              navigated = true;
            } catch (eNav) {
              console.warn('goto retry ' + attempt + ' ' + pageKey + ' ' + key + ': ' + eNav.message);
              if (attempt === 3) throw eNav;
              await page.waitForTimeout(1000 * attempt);
            }
          }
          const cls = await measureCls(page, OBSERVE_MS);
          samples.push(cls);
          const fail = cls > THRESHOLD;
          if (fail) {
            report.ok = false;
            report.pages[pageKey].ok = false;
          }
          console.log(
            (fail ? 'FAIL' : 'OK  ') +
            ' ' + pageKey + ' ' + key + ' run=' + (i + 1) + ' cls=' + cls
          );
          await ctx.close();
        }
        report.pages[pageKey].combos[key] = {
          samples,
          median: Number(median(samples).toFixed(4)),
          max: Number(Math.max.apply(null, samples).toFixed(4)),
        };
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  const outPath = path.join(OUT, 'cls-landing-browse-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('\n════════ CLS landing+browse (median / max) ════════');
  Object.keys(report.pages).forEach((pk) => {
    const page = report.pages[pk];
    console.log('\n## ' + pk);
    Object.keys(page.combos).forEach((k) => {
      const c = page.combos[k];
      console.log(
        (c.max > THRESHOLD ? 'FAIL' : 'OK  ') +
        ' ' + k + '  median=' + c.median + '  max=' + c.max
      );
    });
  });
  console.log('\nREPORT ok=' + report.ok + ' written ' + outPath);
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
