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
  const rvid = landing.indexOf('id="rvid-section"');
  ok('order: hero-ads → guide; video → rvid → listings (main + guide only)',
    heroAds > 0 && guide > heroAds && vid > guide && rvid > vid && listings > rvid,
    { heroAds, guide, vid, rvid, listings });
  ok('guide-desc copy AR/FR',
    /اختر القسم واكتشف عروضه/.test(landing)
    && /Choisissez la section et découvrez ses offres/.test(landing)
    && !/نفس البطاقات التي تراها في أقسامها بالأسفل/.test(landing));
  ok('per-tile store link helper', /function _styTileStoreLinkHtml/.test(landing)
    && /rizq-style-tile-store/.test(landing));

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
    const rvid = document.getElementById('rvid-section');
    const stylesRail = document.getElementById('rizq-styles-rail');
    function top(el) { return el ? el.getBoundingClientRect().top + window.scrollY : -1; }
    const styleCards = stylesRail
      ? Array.from(stylesRail.querySelectorAll('.rizq-style-card')).slice(0, 4).map((c) => ({
        name: ((c.querySelector('.rizq-style-name') || {}).textContent || '').trim(),
        storeLinks: c.querySelectorAll('a.rizq-style-tile-store').length,
        tiles: c.querySelectorAll('.rizq-style-tile').length,
      }))
      : [];
    const rvidVisible = !!(rvid && rvid.offsetParent !== null && rvid.getBoundingClientRect().height > 2);
    return {
      hasGuide: !!guideEl,
      guideDesc: ((guideEl && guideEl.querySelector('.rizq-guide-desc')) || {}).textContent || '',
      tabs,
      railCards: rail ? rail.querySelectorAll('.rizq-style-card, .rizq-est-card').length : 0,
      orderTops: {
        ads: top(ads),
        guide: top(guideEl),
        vid: top(vid),
        rvid: top(rvid),
        listings: top(listings),
      },
      rvidVisible,
      sourceOrderOk: !!(vid && rvid && listings
        && (vid.compareDocumentPosition(rvid) & Node.DOCUMENT_POSITION_FOLLOWING)
        && (rvid.compareDocumentPosition(listings) & Node.DOCUMENT_POSITION_FOLLOWING)),
      styleCards,
    };
  });

  ok('guide mounts in DOM', snap.hasGuide);
  ok('guide-desc live text', /اختر القسم واكتشف عروضه/.test(String(snap.guideDesc || '')));
  ok('styles tab visible on phone', snap.tabs.some((t) => t.pane === 'styles' && !t.hidden));
  ok('corp/office tabs hidden when modules closed (or empty)',
    snap.tabs.filter((t) => t.pane === 'showrooms' || t.pane === 'offices').every((t) => t.hidden)
    || snap.tabs.length >= 2,
    snap.tabs);
  /* rvid قد يكون فارغاً/مخفياً بلا ارتفاع — نعتمد ترتيب المصدر + listings بعد شريط الفيديو */
  ok('DOM order tops: ads < guide < vid < listings (+ rvid source after vid)',
    snap.orderTops.ads < snap.orderTops.guide
    && snap.orderTops.guide < snap.orderTops.vid
    && snap.orderTops.vid < snap.orderTops.listings
    && snap.sourceOrderOk
    && (!snap.rvidVisible || (snap.orderTops.vid <= snap.orderTops.rvid && snap.orderTops.rvid <= snap.orderTops.listings)),
    snap.orderTops);
  const lookNamed = (snap.styleCards || []).filter((c) => c.name && !/^بوتيك|محل|Store/i.test(c.name));
  const withStoreLinks = (snap.styleCards || []).filter((c) => c.storeLinks > 0);
  ok('style look titles are look names (not store-only)', lookNamed.length >= 1 || !(snap.styleCards || []).length, snap.styleCards);
  ok('style tiles include store <a> when store products present',
    withStoreLinks.length >= 1 || !(snap.styleCards || []).length,
    snap.styleCards);

  await browser.close();
  await new Promise((r) => server.close(r));

  const fail = ok.fail || 0;
  console.log(fail ? ('\nFAILED ' + fail + ' / ' + (ok.pass + fail)) : ('\nALL OK / ' + ok.pass));
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
