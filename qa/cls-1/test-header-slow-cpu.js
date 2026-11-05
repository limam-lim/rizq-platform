#!/usr/bin/env node
/**
 * هيدر الهاتف على CPU بطيء (×4): 20 تحميلاً — الرئيسية + browse على 360 و412.
 * الشرط: #rmh-nav-top فيه 6 عناصر، ارتفاع الشريط العلوي ≈55px، ولا عناصر خارج الشاشة.
 *
 * npm run test:header-slow-cpu
 * node qa/cls-1/test-header-slow-cpu.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const LOADS = 5; /* 5 × 2 صفحات × 2 عروض = 20 */
const WIDTHS = [360, 412];
const PAGES = [
  { path: '/rizq_landing_v8.html', label: 'landing' },
  { path: '/rizq_browse.html', label: 'browse' },
];
const TOP_COUNT = 6;
/* سليم ≈55 (360) / ≈57 (412)؛ المعطوب الفارغ ≈44 */
const TOP_H_MIN = 50;
const TOP_H_MAX = 62;

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

async function measureNav(page) {
  return page.evaluate(() => {
    const top = document.getElementById('rmh-nav-top');
    const bottom = document.querySelector('#rizq-mock-hdr nav.rmh-nav:not(.rmh-nav-top)');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    function offscreen(el) {
      if (!el || el.hidden) return false;
      try {
        const st = window.getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden') return false;
      } catch (e) { /* */ }
      const r = el.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) return false;
      return r.right < -1 || r.left > vw + 1 || r.bottom < -1 || r.top > vh + 1;
    }
    const navEls = [];
    if (top) Array.prototype.push.apply(navEls, top.querySelectorAll('a, button, .rmh-more-wrap'));
    if (bottom) Array.prototype.push.apply(navEls, bottom.querySelectorAll('a, button, .rmh-more-wrap'));
    const off = navEls.filter(offscreen).map((el) => ({
      key: el.getAttribute('data-rmh') || String(el.className || '').slice(0, 40),
      x: Math.round(el.getBoundingClientRect().left),
      y: Math.round(el.getBoundingClientRect().top),
    }));
    return {
      topCount: top ? top.children.length : 0,
      topH: top ? Math.round(top.getBoundingClientRect().height) : 0,
      split: document.body.classList.contains('rmh-phone-nav-split'),
      offscreen: off,
    };
  });
}

(async () => {
  const src = fs.readFileSync(path.join(ROOT, 'rizq_header_mockup_trial.js'), 'utf8');
  ok('captureNavSlots cumulative',
    /if \(!__rmhNavSlots\) __rmhNavSlots = \[\];/.test(src)
    && !/function captureNavSlots\(bottomNav\)\s*\{\s*if \(__rmhNavSlots \|\| !bottomNav\) return;/.test(src));
  ok('DOMContentLoaded re-sync',
    /__rizqSyncPhoneNavSplit\s*=\s*syncPhoneNavSplit[\s\S]{0,200}DOMContentLoaded[\s\S]{0,120}syncPhoneNavSplit\(\)/.test(src));

  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });

  let loadN = 0;
  for (let pi = 0; pi < PAGES.length; pi++) {
    for (let wi = 0; wi < WIDTHS.length; wi++) {
      const pageSpec = PAGES[pi];
      const w = WIDTHS[wi];
      for (let n = 0; n < LOADS; n++) {
        loadN += 1;
        const tag = pageSpec.label + '-' + w + '#' + (n + 1);
        const context = await browser.newContext({
          viewport: { width: w, height: 800 },
          isMobile: true,
          hasTouch: true,
          locale: 'ar',
        });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

        await page.goto(origin + pageSpec.path, {
          waitUntil: 'domcontentloaded',
          timeout: 120000,
        });
        await page.waitForFunction(() => {
          const top = document.getElementById('rmh-nav-top');
          return !!(top && top.children.length >= 4);
        }, { timeout: 60000 }).catch(() => {});
        await page.waitForTimeout(500);

        const snap = await measureNav(page);
        ok(tag + ' split on', snap.split, snap);
        ok(tag + ' #rmh-nav-top count === ' + TOP_COUNT,
          snap.topCount === TOP_COUNT, { topCount: snap.topCount });
        ok(tag + ' top nav height ≈ 55px',
          snap.topH >= TOP_H_MIN && snap.topH <= TOP_H_MAX, { topH: snap.topH });
        ok(tag + ' no nav items off-screen',
          snap.offscreen.length === 0, snap.offscreen);

        await context.close();
      }
    }
  }

  ok('ran 20 loads', loadN === 20, { loadN: loadN });

  await browser.close();
  await new Promise((r) => server.close(r));

  const fail = ok.fail || 0;
  const total = (ok.pass || 0) + fail;
  console.log(fail ? ('\nFAILED ' + fail + ' / ' + total) : ('\nALL OK / ' + (ok.pass || 0)));
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
