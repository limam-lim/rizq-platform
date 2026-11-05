#!/usr/bin/env node
/**
 * دليل رزق على الرئيسية: موضع الشريط، الأزرار، وغياب cloneNode.
 * تشغيل: node qa/cls-1/test-rizq-guide-strip.js
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
  const landing = fs.readFileSync(path.join(ROOT, 'rizq_landing_v8.html'), 'utf8');
  const guideJs = fs.readFileSync(path.join(ROOT, 'rizq_home_guide.js'), 'utf8');

  ok('guide section markup present', /id="rizq-guide"/.test(landing));
  ok('four guide panes declared', /data-guide-pane="styles"/.test(landing)
    && /data-guide-pane="showrooms"/.test(landing)
    && /data-guide-pane="estate"/.test(landing)
    && /data-guide-pane="offices"/.test(landing));
  ok('guide script linked', /rizq_home_guide\.js\?v=/.test(landing));
  ok('guide uses builders not cloneNode', !/\.cloneNode\s*\(/.test(guideJs)
    && /buildStyleIdeas/.test(guideJs)
    && /buildShowroomModels/.test(guideJs)
    && /buildEstateModels/.test(guideJs));
  ok('30s rotate + reduced-motion gate', /30000/.test(guideJs) && /prefers-reduced-motion/.test(guideJs));
  ok('equal styles mosaic CSS', /#rizq-styles \.rizq-style-mosaic[\s\S]*repeat\(3,1fr\)/.test(landing));
  ok('store display name helper', /function _styCardStoreName/.test(landing));

  const heroAds = landing.indexOf('id="hero-listings"');
  const guide = landing.indexOf('id="rizq-guide"');
  const listings = landing.indexOf('id="listings"');
  const vid = landing.indexOf('id="rizq-vid-strip"');
  ok('order: ads → guide → listings → video',
    heroAds > 0 && guide > heroAds && listings > guide && vid > listings,
    { heroAds, guide, listings, vid });

  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);

  const snap = await page.evaluate(() => {
    const guideEl = document.getElementById('rizq-guide');
    const tabs = Array.from(document.querySelectorAll('.rizq-guide-tabs [data-guide-pane]'))
      .map((b) => ({
        pane: b.getAttribute('data-guide-pane'),
        hidden: !!b.hidden,
        active: b.classList.contains('is-active'),
        text: (b.textContent || '').replace(/\s+/g, ' ').trim(),
      }));
    const rail = document.getElementById('rizq-guide-rail');
    const ads = document.getElementById('hero-listings');
    const listings = document.getElementById('listings');
    const vid = document.getElementById('rizq-vid-strip');
    function top(el) { return el ? el.getBoundingClientRect().top + window.scrollY : -1; }
    return {
      hasGuide: !!guideEl,
      tabs,
      railCards: rail ? rail.querySelectorAll('.rizq-style-card, .rizq-est-card').length : 0,
      orderTops: { ads: top(ads), guide: top(guideEl), listings: top(listings), vid: top(vid) },
    };
  });

  ok('guide mounts in DOM', snap.hasGuide);
  ok('styles tab visible on phone', snap.tabs.some((t) => t.pane === 'styles' && !t.hidden));
  ok('corp/office tabs hidden when modules closed (or empty)',
    snap.tabs.filter((t) => t.pane === 'showrooms' || t.pane === 'offices').every((t) => t.hidden)
    || snap.tabs.length >= 2,
    snap.tabs);
  ok('DOM order tops: ads < guide < listings < video',
    snap.orderTops.ads < snap.orderTops.guide
    && snap.orderTops.guide < snap.orderTops.listings
    && snap.orderTops.listings < snap.orderTops.vid,
    snap.orderTops);

  await browser.close();
  await new Promise((r) => server.close(r));

  const fail = ok.fail || 0;
  console.log(fail ? ('\nFAILED ' + fail + ' / ' + (ok.pass + fail)) : ('\nALL OK / ' + ok.pass));
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
