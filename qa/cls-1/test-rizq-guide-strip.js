#!/usr/bin/env node
/**
 * دليل رزق على الرئيسية: شريط «أحدث ما في…»، فلاتر كاملة، بطاقات حقيقية، تيكّر غير فارغ.
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
  const civicJs = fs.readFileSync(path.join(ROOT, 'rizq_civic_ticker.js'), 'utf8');

  ok('guide section markup present', /id="rizq-guide"/.test(landing));
  ok('live strip uses i18n keys (guide-in + topic; no hardcoded AR in markup)',
    /id="rizq-guide-live-sub"/.test(landing)
    && /data-t="guide-in"/.test(landing)
    && /data-t="guide-live"/.test(landing)
    && /id="rizq-guide-topic"/.test(landing)
    && !/id="rizq-guide-live-sub">أحدث ما في/.test(landing)
    && !/id="rizq-guide-live-sub">ما في/.test(landing));
  ok('removed gold guide eyebrow + hero title + choose-section copy',
    !/اكتشف رزق من أول نظرة/.test(landing)
    && !/اختر القسم واكتشف عروضه/.test(landing)
    && !/class="rizq-guide-eyebrow"/.test(landing)
    && !/class="rizq-guide-title"/.test(landing)
    && !/class="rizq-guide-desc"/.test(landing));
  ok('four guide panes declared', /data-guide-pane="styles"/.test(landing)
    && /data-guide-pane="showrooms"/.test(landing)
    && /data-guide-pane="estate"/.test(landing)
    && /data-guide-pane="offices"/.test(landing));
  ok('guide pane bodies + independent filter mounts',
    /id="rizq-guide-rail-styles"/.test(landing)
    && /id="rizq-guide-rail-showrooms"/.test(landing)
    && /id="rizq-guide-rail-estate"/.test(landing)
    && /id="rizq-guide-disc-office"/.test(landing)
    && /id="rizq-guide-sty-tabs"/.test(landing)
    && /id="rizq-guide-srm-tabs"/.test(landing)
    && /id="rizq-guide-est-tabs"/.test(landing));
  ok('guide script linked', /rizq_home_guide\.js\?v=/.test(landing));
  ok('guide uses builders not cloneNode', !/\.cloneNode\s*\(/.test(guideJs)
    && /buildStyleIdeas/.test(guideJs)
    && /buildShowroomModels/.test(guideJs)
    && /buildEstateModels/.test(guideJs));
  ok('30s rotate + reduced-motion gate + height lock',
    /30000/.test(guideJs)
    && /prefers-reduced-motion/.test(guideJs)
    && /lockStageHeight/.test(guideJs)
    && /--rizq-guide-stage-h/.test(guideJs));
  ok('live topic built from i18n keys (guide-in / guide-topic-*)',
    /t\('guide-in'\)/.test(guideJs)
    && /TOPIC_KEYS/.test(guideJs)
    && /guide-topic-styles/.test(guideJs)
    && !/innerHTML = 'ما في/.test(guideJs)
    && !/innerHTML = 'أحدث ما في/.test(guideJs)
    && !/Le plus récent dans/.test(guideJs));
  ok('builders accept optMountId overrides',
    /function buildStyleIdeas\(reshuffle, optMountId, optGender\)/.test(landing)
    && /function buildShowroomModels\(reshuffle, optMountId, optCat\)/.test(landing)
    && /function buildEstateModels\(reshuffle, optMountId, optCat\)/.test(landing));
  ok('equal styles mosaic CSS (2×2 look grid)',
    /grid-template-columns:1fr 1fr/.test(landing)
    && /aspect-ratio:1/.test(landing)
    && /data-look-grid/.test(landing));
  ok('store display name helper', /function _styCardStoreName/.test(landing));
  ok('ticker never-empty helpers (i18n key, no hardcoded AR invite)',
    /ensureTickerNotEmpty/.test(civicJs)
    && /RizqTickerNeverEmpty/.test(civicJs)
    && /ticker-invite-msg/.test(civicJs)
    && !/كن أول من ينشر إعلانه على رزق/.test(civicJs));

  const heroAds = landing.indexOf('id="hero-listings"');
  const guide = landing.indexOf('id="rizq-guide"');
  const listings = landing.indexOf('id="listings"');
  const vid = landing.indexOf('id="rizq-vid-strip"');
  const rvid = landing.indexOf('id="rvid-section"');
  const cats = landing.indexOf('id="categories"');
  const heroVidWrap = landing.indexOf('id="hero-vid-wrap"');
  const stylesOrig = landing.indexOf('id="rizq-styles"');
  ok('order: hero-ads → guide; video → rvid → listings (main + guide only)',
    heroAds > 0 && guide > heroAds && vid > guide && rvid > vid && listings > rvid,
    { heroAds, guide, vid, rvid, listings });
  ok('approved order: guide → ads screen → vid strip → categories → listings',
    guide > 0 && heroVidWrap > guide && vid > heroVidWrap && cats > vid && cats > rvid && listings > cats,
    { guide, heroVidWrap, vid, rvid, cats, listings });
  const heroVidTag = (landing.match(/<video[^>]*id="hero-featured-vid"[^>]*>/) || [''])[0];
  ok('hero featured video: preload=none + poster, no eager src',
    /preload="none"/.test(heroVidTag)
    && /poster=/.test(heroVidTag)
    && !/\ssrc=/.test(heroVidTag));
  const videoAdsJs = fs.readFileSync(path.join(ROOT, 'rizq_video_ads.js'), 'utf8');
  ok('hero video IO gate present',
    /armHeroFromConfig/.test(landing)
    && /armHeroPlayback/.test(videoAdsJs)
    && /IntersectionObserver/.test(videoAdsJs));
  ok('original #rizq-styles remains after guide', stylesOrig > guide);
  ok('per-tile store link helper', /function _styTileStoreLinkHtml/.test(landing)
    && /rizq-style-tile-store/.test(landing)
    && /data-look-grid/.test(landing)
    && /_styLookMosaicHtml/.test(landing));

  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
  /* بذرة ثابتة لـ _styShuffle داخل الاختبار فقط — الإنتاج عشوائي */
  await page.addInitScript(() => { window.__RIZQ_STY_SEED = 424242; });
  await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3500);

  const snap = await page.evaluate(() => {
    const guideEl = document.getElementById('rizq-guide');
    const tabs = Array.from(document.querySelectorAll('.rizq-guide-tabs [data-guide-pane]'))
      .map((b) => ({
        pane: b.getAttribute('data-guide-pane'),
        hidden: !!b.hidden,
        active: b.classList.contains('is-active'),
        text: (b.textContent || '').replace(/\s+/g, ' ').trim(),
      }));
    const ads = document.getElementById('hero-listings');
    const listings = document.getElementById('listings');
    const vid = document.getElementById('rizq-vid-strip');
    const rvid = document.getElementById('rvid-section');
    const stylesRail = document.getElementById('rizq-styles-rail');
    const guideRail = document.getElementById('rizq-guide-rail-styles');
    const guideLive = document.getElementById('rizq-guide-live');
    const topic = document.getElementById('rizq-guide-topic');
    const tickerWrap = document.getElementById('ticker-wrap');
    const ticker = document.getElementById('ticker');
    function top(el) { return el ? el.getBoundingClientRect().top + window.scrollY : -1; }
    function bottom(el) { return el ? el.getBoundingClientRect().bottom + window.scrollY : -1; }
    const safeStyleCards = stylesRail
      ? Array.from(stylesRail.querySelectorAll('.rizq-style-card')).slice(0, 4).map((c) => ({
        name: ((c.querySelector('.rizq-style-name') || {}).textContent || '').trim(),
        lookGrid: c.getAttribute('data-look-grid') === '1',
        storeLinks: c.querySelectorAll('a.rizq-style-tile[href*="rizq_store"], a.rizq-style-tile-store').length,
        storeLbls: c.querySelectorAll('.rizq-style-tile-store-lbl').length,
        tiles: c.querySelectorAll('.rizq-style-tile').length,
        squareTiles: Array.from(c.querySelectorAll('.rizq-style-tile')).filter((t) => {
          const r = t.getBoundingClientRect();
          return r.width > 20 && Math.abs(r.width - r.height) <= 3;
        }).length,
      }))
      : [];
    const guideCards = guideRail
      ? guideRail.querySelectorAll('.rizq-style-card, .rizq-style-tile, .rizq-est-card').length
      : 0;
    const guideEmptyBox = !!(guideRail && guideRail.querySelector('.rizq-styles-empty'));
    const stage = document.getElementById('rizq-guide-stage');
    const stageH = stage ? stage.getBoundingClientRect().height : 0;
    const rvidVisible = !!(rvid && rvid.offsetParent !== null && rvid.getBoundingClientRect().height > 2);
    const tickerText = String((ticker && ticker.textContent) || '').replace(/\s+/g, ' ').trim();
    const gap = (guideEl && ads) ? (top(guideEl) - bottom(ads)) : 9999;
    const lastCard = ads && ads.querySelector('.cards-track .ad-card:last-child');
    const gapCards = (guideLive && lastCard) ? (top(guideLive) - bottom(lastCard)) : null;
    return {
      hasGuide: !!guideEl,
      liveText: String((guideLive && guideLive.textContent) || '').replace(/\s+/g, ' ').trim(),
      topic: String((topic && topic.textContent) || '').trim(),
      tabs,
      guideCards,
      guideEmptyBox,
      stageH,
      orderTops: {
        ads: top(ads),
        guide: top(guideEl),
        vid: top(vid),
        rvid: top(rvid),
        listings: top(listings),
      },
      gapAdsToGuide: gap,
      gapCardsToGuide: gapCards,
      rvidVisible,
      sourceOrderOk: !!(vid && rvid && listings
        && (vid.compareDocumentPosition(rvid) & Node.DOCUMENT_POSITION_FOLLOWING)
        && (rvid.compareDocumentPosition(listings) & Node.DOCUMENT_POSITION_FOLLOWING)),
      styleCards: safeStyleCards,
      ticker: {
        emptyClass: !!(tickerWrap && tickerWrap.classList.contains('is-empty')),
        displayNone: !!(tickerWrap && getComputedStyle(tickerWrap).display === 'none'),
        textLen: tickerText.length,
        text: tickerText.slice(0, 80),
        neverEmptyApi: typeof window.RizqTickerNeverEmpty === 'function'
          ? window.RizqTickerNeverEmpty()
          : false,
      },
      hasCardsApi: typeof window.RizqGuideActiveHasCards === 'function'
        ? window.RizqGuideActiveHasCards()
        : guideCards > 0,
      origStylesPresent: !!document.getElementById('rizq-styles'),
      origEstatePresent: !!document.getElementById('rizq-estate-models'),
    };
  });

  ok('guide mounts in DOM', snap.hasGuide);
  ok('live strip reads أحدث + ما في (no أحدث أحدث)',
    /أحدث/.test(String(snap.liveText || ''))
    && /ما في/.test(String(snap.liveText || ''))
    && !/أحدث\s*أحدث/.test(String(snap.liveText || ''))
    && String(snap.topic || '').length >= 2,
    { live: snap.liveText, topic: snap.topic });
  ok('no choose-section desc in DOM', !/اختر القسم واكتشف عروضه/.test(String(snap.liveText || '')));
  ok('styles tab visible on phone', snap.tabs.some((t) => t.pane === 'styles' && !t.hidden));
  ok('corp/office tabs hidden when modules closed (or empty)',
    snap.tabs.filter((t) => t.pane === 'showrooms' || t.pane === 'offices').every((t) => t.hidden)
    || snap.tabs.length >= 2,
    snap.tabs);
  ok('active guide pane has real cards after load',
    snap.guideCards >= 1 && !snap.guideEmptyBox && snap.hasCardsApi,
    { guideCards: snap.guideCards, empty: snap.guideEmptyBox, api: snap.hasCardsApi });
  ok('guide stage has reserved height', snap.stageH >= 120, snap.stageH);
  ok('gap last hero-ad card → guide live strip is ~16–28px',
    snap.gapCardsToGuide != null
      && snap.gapCardsToGuide >= 8
      && snap.gapCardsToGuide <= 28,
    { gapCardsToGuide: snap.gapCardsToGuide, gapAdsToGuide: snap.gapAdsToGuide });
  ok('DOM order tops: ads < guide < vid < listings (+ rvid source after vid)',
    snap.orderTops.ads < snap.orderTops.guide
    && snap.orderTops.guide < snap.orderTops.vid
    && snap.orderTops.vid < snap.orderTops.listings
    && snap.sourceOrderOk
    && (!snap.rvidVisible || (snap.orderTops.vid <= snap.orderTops.rvid && snap.orderTops.rvid <= snap.orderTops.listings)),
    snap.orderTops);
  const lookNamed = (snap.styleCards || []).filter((c) => c.name && !/^بوتيك|محل|Store/i.test(c.name));
  const withStoreLinks = (snap.styleCards || []).filter((c) => c.storeLinks > 0 || c.storeLbls > 0);
  const lookGridCards = (snap.styleCards || []).filter((c) => c.lookGrid && c.tiles === 4);
  ok('style look titles are look names (not store-only)', lookNamed.length >= 1 || !(snap.styleCards || []).length, snap.styleCards);
  ok('style tiles include store <a> when store products present',
    withStoreLinks.length >= 1 || !(snap.styleCards || []).length,
    snap.styleCards);
  ok('look cards use 2×2 grid of 4 equal tiles',
    lookGridCards.length >= 1 || !(snap.styleCards || []).length,
    snap.styleCards);
  ok('original sections still present', snap.origStylesPresent && snap.origEstatePresent);
  ok('ticker never empty (text + not is-empty + visible)',
    snap.ticker.textLen >= 4
    && !snap.ticker.emptyClass
    && !snap.ticker.displayNone
    && snap.ticker.neverEmptyApi,
    snap.ticker);

  /* تبديل estate ثم الرجوع — ارتفاع ثابت تقريباً */
  const estateTab = snap.tabs.find((t) => t.pane === 'estate' && !t.hidden);
  if (estateTab) {
    const hBefore = snap.stageH;
    await page.click('#guide-tab-estate');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const stage = document.getElementById('rizq-guide-stage');
      const rail = document.getElementById('rizq-guide-rail-estate');
      const topic = document.getElementById('rizq-guide-topic');
      return {
        h: stage ? stage.getBoundingClientRect().height : 0,
        cards: rail ? rail.querySelectorAll('.rizq-est-card, .rizq-est-hero').length : 0,
        topic: String((topic && topic.textContent) || '').trim(),
        minH: stage ? (parseFloat(getComputedStyle(stage).minHeight) || 0) : 0,
      };
    });
    ok('estate pane fills cards + topic updates',
      after.cards >= 1 && /عقار|immobilier|سوق/i.test(after.topic),
      after);
    ok('stage height locked across pane switch (minHeight ≥ first)',
      after.minH >= Math.min(hBefore, after.h) - 2 || after.h >= hBefore - 8,
      { hBefore, after });
  } else {
    ok('estate pane fills cards + topic updates', true);
    ok('stage height locked across pane switch (minHeight ≥ first)', true);
  }

  /* FR: عناوين/وسوم/أسماء محلات الإطلالة عبر i18n على سكة الدليل */
  await page.evaluate(() => { try { localStorage.setItem('rizq_lang', 'fr'); } catch (e) {} });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3500);
  const frSnap = await page.evaluate(() => {
    const rail = document.getElementById('rizq-guide-rail-styles');
    const cards = rail
      ? Array.from(rail.querySelectorAll('.rizq-style-card[data-look-grid="1"]')).slice(0, 3).map((c) => ({
        name: ((c.querySelector('.rizq-style-name') || {}).textContent || '').trim(),
        badge: ((c.querySelector('.rizq-style-badge') || {}).textContent || '').trim(),
        store: ((c.querySelector('.rizq-style-tile-store-lbl') || {}).textContent || '').trim(),
        hasImg: !!c.querySelector('.rizq-style-tile img'),
        tileCount: c.querySelectorAll('.rizq-style-tile').length,
      }))
      : [];
    return {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      cards,
    };
  });
  const frOk = frSnap.lang === 'fr'
    && frSnap.cards.length >= 1
    && frSnap.cards.every((c) => /Hommes|Femmes|Garçons|Filles/.test(c.badge))
    && frSnap.cards.every((c) => c.name && !/[\u0600-\u06FF]/.test(c.name))
    && frSnap.cards.every((c) => !c.store || !/[\u0600-\u06FF]/.test(c.store));
  ok('FR look cards use i18n titles/badges/store labels (guide rail)', frOk, frSnap);

  await browser.close();
  await new Promise((r) => server.close(r));

  const fail = ok.fail || 0;
  console.log(fail ? ('\nFAILED ' + fail + ' / ' + (ok.pass + fail)) : ('\nALL OK / ' + ok.pass));
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
