#!/usr/bin/env node
/**
 * قياس أداء الرئيسية — نفس ظروف المستخدم:
 * viewport 1024×1366، CPU ×4، شبكة 4G (60ms RTT، 9 Mbps).
 * يكتب JSON إلى /opt/cursor/artifacts/perf/ أو --out=
 *
 * node qa/perf-1/measure-landing-perf.js [--runs=5] [--label=stepN] [--out=path]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const PAGE = '/rizq_landing_v8.html';
const RUNS = Math.max(1, Number((process.argv.find((a) => a.startsWith('--runs=')) || '--runs=5').split('=')[1]) || 5);
const LABEL = (process.argv.find((a) => a.startsWith('--label=')) || '--label=measure').split('=')[1];
const OUT = (process.argv.find((a) => a.startsWith('--out=')) || '').split('=')[1]
  || path.join('/opt/cursor/artifacts/perf', LABEL + '.json');

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    path.join(ROOT, 'qa/cls-1/node_modules/playwright'),
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
        '.mp4': 'video/mp4',
      };
      res.writeHead(200, {
        'content-type': types[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
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

function median(arr) {
  const a = arr.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function analyzeHtml() {
  const html = fs.readFileSync(path.join(ROOT, 'rizq_landing_v8.html'), 'utf8');
  const srcs = [...html.matchAll(/<script[^>]*\bsrc=["']([^"']+)/gi)].map((m) => m[1].split('?')[0]);
  const counts = {};
  srcs.forEach((s) => { counts[s] = (counts[s] || 0) + 1; });
  const dupes = Object.entries(counts).filter(([, c]) => c > 1).map(([s, c]) => ({ src: s, count: c }));
  const blocking = [...html.matchAll(/<script(?![^>]*(?:\bdefer\b|\basync\b))[^>]*\bsrc=/gi)];
  const cssHrefs = [...html.matchAll(/<link[^>]*\bhref=["']([^"']+)/gi)].map((m) => m[1].split('?')[0]);
  const cssCounts = {};
  cssHrefs.forEach((s) => { cssCounts[s] = (cssCounts[s] || 0) + 1; });
  const cssDupes = Object.entries(cssCounts).filter(([, c]) => c > 1).map(([s, c]) => ({ href: s, count: c }));
  return {
    htmlBytes: Buffer.byteLength(html),
    externalScripts: srcs.length,
    blockingScripts: blocking.length,
    scriptDupes: dupes,
    cssDupes,
  };
}

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const staticAnalysis = analyzeHtml();
  const srv = await startStatic();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const samples = [];

  try {
    for (let i = 0; i < RUNS; i++) {
      const ctx = await browser.newContext({
        viewport: { width: 1024, height: 1366 },
        locale: 'ar-MR',
      });
      const page = await ctx.newPage();
      const client = await ctx.newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 60,
        downloadThroughput: (9 * 1024 * 1024) / 8,
        uploadThroughput: (1.5 * 1024 * 1024) / 8,
        connectionType: 'cellular4g',
      });
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

      await page.addInitScript(() => {
        try { localStorage.setItem('rizq_lang', 'ar'); } catch (e) { /* */ }
        window.__rizqPerf = { firstListingImg: null };
        function mark() {
          if (window.__rizqPerf.firstListingImg != null) return;
          const img = document.querySelector('#hero-listings img, #cards-track img');
          if (!img) return;
          const src = img.currentSrc || img.src || '';
          if (!src) return;
          try {
            const entries = performance.getEntriesByName(src);
            if (entries && entries[0] && entries[0].startTime != null) {
              window.__rizqPerf.firstListingImg = entries[0].startTime;
              return;
            }
          } catch (e) { /* */ }
          window.__rizqPerf.firstListingImg = performance.now();
        }
        const mo = new MutationObserver(mark);
        mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
        document.addEventListener('DOMContentLoaded', mark);
        document.addEventListener('readystatechange', mark);
        const iv = setInterval(function () {
          mark();
          if (window.__rizqPerf.firstListingImg != null) clearInterval(iv);
        }, 50);
        setTimeout(function () { clearInterval(iv); }, 30000);
      });

      const t0 = Date.now();
      const gotoPromise = page.goto(srv.base + PAGE, { waitUntil: 'domcontentloaded', timeout: 120000 });
      let firstImg = null;
      const pollDeadline = Date.now() + 30000;
      while (Date.now() < pollDeadline) {
        try {
          firstImg = await page.evaluate(() => {
            if (window.__rizqPerf && window.__rizqPerf.firstListingImg != null) {
              return window.__rizqPerf.firstListingImg;
            }
            const img = document.querySelector('#hero-listings img, #cards-track img');
            if (!img) return null;
            const src = img.currentSrc || img.src || '';
            if (!src) return null;
            try {
              const entries = performance.getEntriesByName(src);
              if (entries && entries[0]) return entries[0].startTime || entries[0].responseEnd || performance.now();
            } catch (e) { /* */ }
            return performance.now();
          });
        } catch (eEval) {
          firstImg = null;
        }
        if (firstImg != null) break;
        await page.waitForTimeout(50);
      }
      await gotoPromise;
      const dclWall = Date.now() - t0;
      if (firstImg == null) {
        firstImg = await page.evaluate(() => {
          if (window.__rizqPerf && window.__rizqPerf.firstListingImg != null) return window.__rizqPerf.firstListingImg;
          const img = document.querySelector('#hero-listings img, #cards-track img');
          if (!img) return null;
          const src = img.currentSrc || img.src || '';
          try {
            const entries = performance.getEntriesByName(src);
            if (entries && entries[0]) return entries[0].startTime || entries[0].responseEnd || performance.now();
          } catch (e) { /* */ }
          return img ? performance.now() : null;
        });
      }

      const nav = await page.evaluate(() => {
        const n = performance.getEntriesByType('navigation')[0];
        return n ? {
          domContentLoaded: n.domContentLoadedEventEnd,
          load: n.loadEventEnd,
          responseEnd: n.responseEnd,
          transferSize: n.transferSize,
        } : null;
      });

      samples.push({
        run: i + 1,
        dclWallMs: dclWall,
        firstListingImgMs: firstImg,
        nav,
      });
      console.log('run', i + 1,
        'DCL(wall)=', dclWall + 'ms',
        'firstImg=', firstImg != null ? Math.round(firstImg) + 'ms' : 'null',
        'navDCL=', nav && Math.round(nav.domContentLoaded));
      await ctx.close();
    }
  } finally {
    await browser.close();
    await srv.stop();
  }

  const dcls = samples.map((s) => s.dclWallMs);
  const imgs = samples.map((s) => s.firstListingImgMs).filter((x) => x != null);
  const report = {
    label: LABEL,
    at: new Date().toISOString(),
    conditions: { viewport: '1024x1366', cpuThrottle: 4, network: '4G 60ms 9Mbps' },
    static: staticAnalysis,
    runs: samples,
    median: {
      dclWallMs: median(dcls),
      firstListingImgMs: imgs.length ? median(imgs) : null,
    },
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log('\n[' + LABEL + '] median DCL=', report.median.dclWallMs,
    'firstImg=', report.median.firstListingImgMs,
    'htmlKB=', Math.round(staticAnalysis.htmlBytes / 1024),
    'dupes=', staticAnalysis.scriptDupes.length,
    'blocking=', staticAnalysis.blockingScripts);
  console.log('wrote', OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
