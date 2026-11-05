#!/usr/bin/env node
/**
 * هيدر الهاتف على CPU بطيء: captureNavSlots تراكمي + إعادة sync عند DOMContentLoaded.
 * يحاكي شريطاً جزئياً (5 عناصر) ثم اكتمال الـ12، ويتأكد أن #rmh-nav-top يمتلئ.
 *
 * node qa/cls-1/test-slow-phone-nav-capture.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
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
        '.svg': 'application/svg+xml',
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
  const src = fs.readFileSync(path.join(ROOT, 'rizq_header_mockup_trial.js'), 'utf8');
  ok('captureNavSlots is cumulative (no early return on __rmhNavSlots)',
    /function captureNavSlots\(bottomNav\)\s*\{[\s\S]*?if \(!__rmhNavSlots\) __rmhNavSlots = \[\];/.test(src)
    && !/function captureNavSlots\(bottomNav\)\s*\{\s*if \(__rmhNavSlots \|\| !bottomNav\) return;/.test(src));
  ok('DOMContentLoaded re-syncs phone nav split',
    /__rizqSyncPhoneNavSplit\s*=\s*syncPhoneNavSplit/.test(src)
    && /DOMContentLoaded[\s\S]{0,120}syncPhoneNavSplit\(\)/.test(src));

  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  /* ثبّت isPhone عبر matchMedia */
  await page.addInitScript(() => {
    const orig = window.matchMedia.bind(window);
    window.matchMedia = function (q) {
      if (String(q).indexOf('max-width:768') >= 0) {
        return { matches: true, media: q, addListener: function () {}, removeListener: function () {},
          addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () { return false; } };
      }
      if (String(q).indexOf('min-width:1025') >= 0) {
        return { matches: false, media: q, addListener: function () {}, removeListener: function () {},
          addEventListener: function () {}, removeEventListener: function () {}, dispatchEvent: function () { return false; } };
      }
      return orig(q);
    };
  });

  await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('#rizq-mock-hdr nav.rmh-nav', { timeout: 30000 });
  await page.waitForTimeout(800);

  const snap = await page.evaluate(() => {
    const top = document.getElementById('rmh-nav-top');
    const bottom = document.querySelector('#rizq-mock-hdr nav.rmh-nav:not(.rmh-nav-top)');
    function keys(nav) {
      if (!nav) return [];
      return Array.prototype.map.call(nav.children, function (el) {
        return el.getAttribute('data-rmh')
          || (el.classList && el.classList.contains('rmh-more-wrap') ? 'more' : '');
      }).filter(Boolean);
    }
    const topKeys = keys(top);
    const bottomKeys = keys(bottom);
    return {
      hasTop: !!top,
      topCount: top ? top.children.length : 0,
      bottomCount: bottom ? bottom.children.length : 0,
      topH: top ? Math.round(top.getBoundingClientRect().height) : 0,
      topKeys: topKeys,
      bottomKeys: bottomKeys,
      split: document.body.classList.contains('rmh-phone-nav-split'),
      /* محاكاة سباق التحليل: أعد كل العناصر لـ bottom، احذف النصف الثاني،
         sync (التقاط جزئي)، ثم أعد العناصر المحذوفة وsync مجدداً */
      race: (function () {
        if (typeof window.__rizqSyncPhoneNavSplit !== 'function' || !bottom) return null;
        if (top) while (top.firstChild) bottom.appendChild(top.firstChild);
        var kids = Array.prototype.slice.call(bottom.children);
        var delayed = kids.slice(5);
        delayed.forEach(function (el) { el.parentNode && el.parentNode.removeChild(el); });
        window.__rizqSyncPhoneNavSplit();
        var midTop = top ? top.children.length : 0;
        var midBottom = bottom.children.length;
        delayed.forEach(function (el) { bottom.appendChild(el); });
        window.__rizqSyncPhoneNavSplit();
        return {
          midTop: midTop,
          midBottom: midBottom,
          finalTop: top ? top.children.length : 0,
          finalBottom: bottom.children.length,
          finalTopKeys: keys(top),
          finalBottomKeys: keys(bottom),
        };
      })(),
    };
  });

  ok('phone nav split active', snap.split);
  ok('#rmh-nav-top present with items', snap.hasTop && snap.topCount >= 4, snap);
  ok('#rmh-nav-top height ≥ 50px (not empty 44)', snap.topH >= 50, { topH: snap.topH });
  ok('bottom thumb dock has home/ads/stores',
    snap.bottomKeys.indexOf('home') >= 0 && snap.bottomKeys.indexOf('ads') >= 0, snap.bottomKeys);
  ok('top strip has pulse/post/more (not all stuck in bottom)',
    (snap.topKeys.indexOf('pulse') >= 0 || snap.topKeys.indexOf('post') >= 0)
    && snap.topKeys.indexOf('more') >= 0, snap.topKeys);
  if (snap.race) {
    ok('partial capture then late children: top gains slots after 2nd sync',
      snap.race.finalTop >= 4
      && (snap.race.finalTop >= snap.race.midTop)
      && snap.race.finalTopKeys.indexOf('more') >= 0, snap.race);
  }

  await browser.close();
  await new Promise((r) => server.close(r));
  const fail = ok.fail || 0;
  console.log(fail ? ('\nFAILED ' + fail + ' / ' + (ok.pass + fail)) : ('\nALL OK / ' + ok.pass));
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
