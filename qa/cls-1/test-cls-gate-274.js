#!/usr/bin/env node
/**
 * بوابة CLS لـ #274 — 30 تشغيلاً (6 عروض × 5)، سياق جديد لكل تشغيل، مراقبة 14ث.
 * العروض: 390-ar, 390-fr, 768-ar, 768-fr, 1440-ar, 1440-fr
 * المعيار: أقصى قيمة ≤ 0.1
 *
 * تشغيل: node qa/cls-1/test-cls-gate-274.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const OUT = __dirname;
const THRESHOLD = 0.1;
const OBSERVE_MS = 14000;
const RUNS_PER = 5;
const PAGE = '/rizq_landing_v8.html';
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
    path.join(OUT, 'node_modules/playwright'),
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
      if (url === '/') url = PAGE;
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
  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;
  const browser = await chromium.launch({ headless: true });
  const report = {
    threshold: THRESHOLD,
    observeMs: OBSERVE_MS,
    page: PAGE,
    combos: {},
    ok: true,
  };

  try {
    for (const combo of COMBOS) {
      const key = combo.w + '-' + combo.lang;
      const samples = [];
      console.log('\n— ' + key + ' × ' + RUNS_PER + ' —');
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
            if (lang === 'fr') {
              localStorage.setItem('rizq_lang', 'fr');
              document.documentElement.lang = 'fr';
            } else {
              localStorage.setItem('rizq_lang', 'ar');
              document.documentElement.lang = 'ar';
            }
          } catch (e) { /* */ }
        }, combo.lang);
        await page.route(/fonts\.googleapis|fonts\.gstatic/i, (route) => route.abort());
        await page.goto(base + PAGE + (combo.lang === 'fr' ? '?lang=fr' : ''), {
          waitUntil: 'domcontentloaded',
          timeout: 90000,
        });
        const cls = await measureCls(page, OBSERVE_MS);
        samples.push(cls);
        const fail = cls > THRESHOLD;
        if (fail) report.ok = false;
        console.log(
          (fail ? 'FAIL' : 'OK  ') +
          ' ' + key + ' run=' + (i + 1) + ' cls=' + cls
        );
        await ctx.close();
      }
      report.combos[key] = {
        samples,
        median: Number(median(samples).toFixed(4)),
        max: Number(Math.max.apply(null, samples).toFixed(4)),
      };
    }
  } finally {
    await browser.close();
    server.close();
  }

  const outPath = path.join(OUT, 'cls-gate-274-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('\n════════ CLS gate summary (median / max) ════════');
  Object.keys(report.combos).forEach((k) => {
    const c = report.combos[k];
    console.log(
      (c.max > THRESHOLD ? 'FAIL' : 'OK  ') +
      ' ' + k + '  median=' + c.median + '  max=' + c.max
    );
  });
  console.log('\nREPORT ok=' + report.ok + ' written ' + outPath);
  console.log(report.ok
    ? 'ALL OK — max ≤ ' + THRESHOLD + ' across ' + (COMBOS.length * RUNS_PER) + ' runs'
    : 'FAILED — some max > ' + THRESHOLD);
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
