#!/usr/bin/env node
/**
 * FR mode must not show Arabic UI chrome from recent Guide / live-strip work.
 * Fails if Arabic codepoints appear in Guide/hero-label/ticker-invite (or their aria).
 *
 * node qa/cls-1/test-fr-no-arabic-leak.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');

const ROOT = path.join(__dirname, '../..');
const AR_RE = /[\u0600-\u06FF]/;

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
    console.log('  ✗ ' + label + (detail != null ? ' — ' + String(detail).slice(0, 280) : ''));
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

function stripComments(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

(async () => {
  const landing = fs.readFileSync(path.join(ROOT, 'rizq_landing_v8.html'), 'utf8');
  const guideJs = fs.readFileSync(path.join(ROOT, 'rizq_home_guide.js'), 'utf8');
  const i18nData = fs.readFileSync(path.join(ROOT, 'rizq_i18n_data.js'), 'utf8');

  const heroChunk = (landing.split('id="hero-listings"')[1] || '').split('id="cards-track"')[0] || '';
  const guideChunk = (landing.split('id="rizq-guide"')[1] || '').split('id="rizq-guide-stage"')[0] || '';
  const guideChrome = stripComments(heroChunk + guideChunk)
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  ok('guide/hero chrome HTML has no Arabic literals', !AR_RE.test(guideChrome),
    (guideChrome.match(AR_RE) || []).slice(0, 8).join(''));

  ok('guide JS has no hardcoded أحدث/ما في UI literals',
    !/textContent\s*=\s*fr\s*\?\s*'Récent'\s*:\s*'أحدث'/.test(guideJs)
    && !/innerHTML\s*=\s*'ما في/.test(guideJs)
    && /guide-live|guide-in|guide-topic-styles/.test(guideJs));

  const ctx = { window: {} };
  vm.runInNewContext(i18nData + '\nthis.AR=window.RIZQ_I18N_AR;this.FR=window.RIZQ_I18N_FR;', ctx);
  const need = [
    'guide-live', 'guide-in', 'guide-styles', 'guide-showrooms', 'guide-estate', 'guide-offices',
    'guide-topic-styles', 'promo-strip-sub', 'guide-aria', 'hero-listings-aria',
    'sty-reshuffle-aria', 'ticker-invite-msg',
  ];
  const missing = need.filter((k) => !(ctx.AR.common && ctx.AR.common[k]) || !(ctx.FR.common && ctx.FR.common[k]));
  ok('i18n_data common has guide keys AR+FR', missing.length === 0, missing.join(','));
  const frArabic = need.filter((k) => AR_RE.test((ctx.FR.common && ctx.FR.common[k]) || ''));
  ok('i18n_data FR guide values have no Arabic', frArabic.length === 0, frArabic.join(','));

  ok('LANG.fr in landing includes guide-live',
    /'guide-live':\s*'Récent'/.test(landing) && /'guide-in':\s*'dans'/.test(landing));

  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 412, height: 915 },
    locale: 'fr-FR',
  });
  await page.addInitScript(() => {
    try { localStorage.setItem('rizq_lang', 'fr'); } catch (e) { /* */ }
    try { document.cookie = 'rizq_lang=fr;path=/;max-age=31536000'; } catch (e2) { /* */ }
  });
  await page.goto(origin + '/rizq_landing_v8.html?lang=fr', {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  await page.waitForTimeout(4500);
  try {
    await page.evaluate(() => {
      if (typeof applyLandingLang === 'function') applyLandingLang(false);
      if (typeof window.RizqGuideRefreshLang === 'function') window.RizqGuideRefreshLang();
    });
  } catch (eApply) { /* */ }
  await page.waitForTimeout(800);

  const leak = await page.evaluate(() => {
    const AR = /[\u0600-\u06FF]/;
    const sels = [
      '#hero-listings .listings-label',
      '#rizq-guide .rizq-guide-live',
      '#rizq-guide .rizq-guide-tabs',
      '#rizq-guide-styles-reshuffle',
      '#rizq-guide-srm-reshuffle',
      '#rizq-guide-sty-tabs',
      '#rizq-guide-srm-tabs',
      '#rizq-guide-est-tabs',
      '#ticker-wrap.is-invite .ticker-invite',
    ];
    const hits = [];
    sels.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        const text = String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
        const aria = el.getAttribute('aria-label') || '';
        if (AR.test(text)) hits.push({ sel: sel, kind: 'text', sample: text.slice(0, 120) });
        if (AR.test(aria)) hits.push({ sel: sel, kind: 'aria', sample: aria.slice(0, 120) });
      });
    });
    /* Chrome-only shell: recent Guide / live-strip / ticker-invite UI */
    const chromeRoot = document.createElement('div');
    sels.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        chromeRoot.appendChild(el.cloneNode(true));
      });
    });
    const shell = String(chromeRoot.innerText || '').replace(/\s+/g, ' ').trim();
    const shellHit = AR.test(shell);
    return {
      hits: hits.slice(0, 12),
      shellArabic: shellHit,
      shellSample: shellHit ? (shell.match(/[\u0600-\u06FF][^]{0,60}/) || [''])[0] : '',
      shellText: shell.slice(0, 160),
      guideLive: ((document.querySelector('#rizq-guide-live') || {}).innerText || '').trim(),
      heroLive: ((document.querySelector('#hero-listings .listings-label') || {}).innerText || '').trim(),
      htmlLang: document.documentElement.lang,
      isAr: typeof isAr === 'undefined' ? null : isAr,
    };
  });

  ok('document lang is fr', leak.htmlLang === 'fr', leak.htmlLang);
  ok('isAr flag is false in FR', leak.isAr === false, String(leak.isAr));
  ok('guide live strip shows French (Récent/dans)', /R[ée]cent/i.test(leak.guideLive) && /dans/i.test(leak.guideLive),
    leak.guideLive);
  ok('guide live strip text has no Arabic', !AR_RE.test(leak.guideLive), leak.guideLive);
  ok('hero listings label has no Arabic', !AR_RE.test(leak.heroLive), leak.heroLive);
  ok('hero listings label shows French', /R[ée]cent|Dernières/i.test(leak.heroLive), leak.heroLive);
  ok('targeted chrome selectors have no Arabic text/aria', leak.hits.length === 0,
    JSON.stringify(leak.hits));
  ok('FR chrome shell (guide/hero-label/ticker-invite) has no Arabic', !leak.shellArabic, leak.shellSample);

  await browser.close();
  await new Promise((r) => server.close(r));

  const failed = ok.fail || 0;
  console.log('\nfr-no-arabic-leak: ' + (ok.pass || 0) + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
