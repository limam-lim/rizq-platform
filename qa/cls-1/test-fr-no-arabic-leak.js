#!/usr/bin/env node
/**
 * FR mode Arabic leak gate — full visible body + alt/aria-label/title/placeholder.
 *
 * Pages: home, ad (listing), store, office, showroom, estate.
 * Allowlist ONLY:
 *   - Brand mark «رزق» / logo lockup
 *   - User/demo inventory content (ads, style tiles, estate listings, product cards…)
 * Anything else with Arabic codepoints → fail.
 *
 * node qa/cls-1/test-fr-no-arabic-leak.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const vm = require('vm');

const ROOT = path.join(__dirname, '../..');
const AR_RE = /[\u0600-\u06FF]/

const PAGES = [
  { key: 'home', path: '/rizq_landing_v8.html?lang=fr' },
  { key: 'ad', path: '/rizq_listing.html?lang=fr' },
  { key: 'store', path: '/rizq_store.html?demo=1&lang=fr' },
  { key: 'office', path: '/rizq_office.html?demo=1&lang=fr' },
  { key: 'showroom', path: '/rizq_showroom.html?demo=1&lang=fr' },
  { key: 'estate', path: '/rizq_estate.html?demo=1&lang=fr' },
];

/** Explicit allowlist — brand + user-authored / demo inventory only. */
const ALLOW = {
  brandExact: ['رزق', 'رزق / RIZQ PLATFORM', 'RIZQ PLATFORM'],
  brandSel: [
    '.logo-ar',
    '.rmh-brand-ar',
    '.logo-mark-img',
    'img.logo-mark-img',
    '#rmh-brand .logo-ar',
    '#hero-hl',
    '.why-bg-text',
    '#cta-bg-brand',
    '[data-allow-ar="brand"]',
  ].join(','),
  userContentSel: [
    '[data-user-content]',
    '[data-allow-ar="user"]',
    '.ad-card', '.ad-card *',
    '#cards-track .ad-card', '#cards-track .ad-card *',
    '#listings .ad-card', '#listings .ad-card *',
    '.rizq-style-card', '.rizq-style-card *',
    '.rizq-style-tile', '.rizq-style-tile *',
    '.rizq-style-name', '.rizq-style-meta', '.rizq-style-badge', '.rizq-style-tile-store',
    '.rizq-est-card', '.rizq-est-card *',
    '.rizq-style-tile', '.rzq-disc-card', '.rzq-disc-card *',
    '.ad-cat', '.ad-title', '.ad-price', '.price-unit',
    '.listing-title', '.store-name', '.product-card', '.product-card *',
    '[data-ad-id]', '[data-ad-id] *',
    '.amd-ad-title', '.lc-title',
    '#price-ticker .ticker-item', '#price-ticker .ticker-item *',
    '#ticker-wrap:not(.is-invite) .ticker-item', '#ticker-wrap:not(.is-invite) .ticker-item *',
    '.est-card', '.est-card *', '.est-listing', '.est-listing *',
    '#est-list .est-card', '#est-list .est-card *',
    '#est-hero', '#est-hero *',
    '[data-agency-name]',
    '.est-spec', '.est-spec *', '.est-chip', '.est-chip *',
    '.rzq-brand-tile', '.rzq-brand-tile *', '.rzq-brand-strip', '.rzq-brand-strip *',
    '.rzq-brand-strip-head-label',
  ].join(','),
};

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
    console.log('  ✗ ' + label + (detail != null ? ' — ' + String(detail).slice(0, 360) : ''));
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
  const civicJs = fs.readFileSync(path.join(ROOT, 'rizq_civic_ticker.js'), 'utf8');
  const i18nData = fs.readFileSync(path.join(ROOT, 'rizq_i18n_data.js'), 'utf8');
  const i18nJs = fs.readFileSync(path.join(ROOT, 'rizq_i18n.js'), 'utf8');

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
  ok('ticker FR pickText uses textFr only (hide if missing)',
    /lang === 'fr'[\s\S]{0,160}textFr/.test(civicJs)
    && !/lang === 'fr'\) return item\.textFr \|\| item\.textAr/.test(civicJs)
    && !/lang === 'fr'\) return item\.textFr \|\| item\.text \|/.test(civicJs));
  ok('applyLandingLang has section() + console.error per section',
    /function section\(name, fn\)/.test(landing)
    && /\[applyLandingLang\] section failed:/.test(landing)
    && /isAr = !!toAr/.test(landing));
  ok('RizqI18n paints data-t-aria', /data-t-aria/.test(i18nJs) && /setAttribute\('aria-label'/.test(i18nJs));

  const ctx = { window: {} };
  vm.runInNewContext(i18nData + '\nthis.AR=window.RIZQ_I18N_AR;this.FR=window.RIZQ_I18N_FR;', ctx);
  const need = [
    'guide-live', 'guide-in', 'guide-styles', 'guide-showrooms', 'guide-estate', 'guide-offices',
    'guide-topic-styles', 'promo-strip-sub', 'guide-aria', 'hero-listings-aria',
    'sty-reshuffle-aria', 'ticker-invite-msg', 'hbiz-spaces-aria', 'desk-aria', 'adminia-about-title',
  ];
  const missing = need.filter((k) => !(ctx.AR.common && ctx.AR.common[k]) || !(ctx.FR.common && ctx.FR.common[k]));
  ok('i18n_data common has guide/chrome keys AR+FR', missing.length === 0, missing.join(','));

  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });

  const scanFn = ({ userContentSel, brandSel, brandExact }) => {
    const AR = /[\u0600-\u06FF]/
    const brandSet = new Set(brandExact || []);
    const hits = [];

    function closedOverlay(el) {
      const ov = el.closest(
        '.modal,#all-ads-modal,#rizq-reg-overlay,#forgot-modal,.rizq-models-overlay,'
        + '#disc-modal,#report-modal,[role="dialog"],#est-modal,#rw-sheet,.reg-shell,'
        + '#register-modal,#forgot-panel,#est-lightbox'
      );
      if (!ov) return false;
      const open = ov.classList.contains('open') || ov.classList.contains('is-open')
        || ov.classList.contains('active') || ov.getAttribute('aria-hidden') === 'false';
      if (open) return false;
      const st = window.getComputedStyle(ov);
      const r = ov.getBoundingClientRect();
      return st.display === 'none' || st.visibility === 'hidden' || r.width < 2 || r.height < 2;
    }

    function present(el) {
      if (!el || el.nodeType !== 1) return false;
      if (el.tagName === 'OPTION') return false; /* not visible until select opens */
      if (el.closest('script, style, noscript, template')) return false;
      if (el.closest('[hidden], [aria-hidden="true"], [inert], dialog:not([open])')) return false;
      if (closedOverlay(el)) return false;
      try {
        const st = window.getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
      } catch (e) { return false; }
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      return true;
    }

    function allowed(el, text) {
      const t = String(text || '').replace(/\s+/g, ' ').trim();
      if (!t) return true;
      if (brandSet.has(t) || /^رزق$/.test(t)) return true;
      if (/^رزق\s*[|/]?\s*RIZQ/i.test(t)) return true;
      if (/©\s*\d{4}\s*رزق\s*[|/]\s*Rizq/i.test(t)) return true;
      if (el.closest && el.closest(brandSel)) {
        if (/رزق/.test(t) && !/[ء-ي]{3,}/.test(t.replace(/رزق/g, ''))) return true;
      }
      if (el.closest && el.closest(userContentSel)) return true;
      return false;
    }

    function pushHit(kind, el, sample) {
      const sel = el.id
        ? '#' + el.id
        : (el.className && String(el.className).trim()
          ? el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.')
          : el.tagName.toLowerCase());
      hits.push({
        kind: kind,
        sel: sel.slice(0, 80),
        sample: String(sample || '').replace(/\s+/g, ' ').trim().slice(0, 100),
      });
    }

    const all = document.body ? document.body.querySelectorAll('*') : [];
    all.forEach((el) => {
      if (!present(el)) return;

      let ownText = '';
      if (!el.children || el.children.length === 0) {
        ownText = String(el.innerText || el.textContent || '');
      } else {
        for (let i = 0; i < el.childNodes.length; i++) {
          const n = el.childNodes[i];
          if (n.nodeType === 3) ownText += n.nodeValue || '';
        }
      }
      ownText = ownText.replace(/\s+/g, ' ').trim();
      if (ownText && AR.test(ownText) && !allowed(el, ownText)) pushHit('text', el, ownText);

      ['alt', 'aria-label', 'title', 'placeholder'].forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const v = el.getAttribute(attr) || '';
        if (AR.test(v) && !allowed(el, v)) pushHit(attr, el, v);
      });
    });

    return {
      htmlLang: document.documentElement.lang,
      isAr: typeof isAr === 'undefined' ? null : !!isAr,
      hitCount: hits.length,
      hits: hits.slice(0, 25),
    };
  };

  for (const pg of PAGES) {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      locale: 'fr-FR',
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      try { localStorage.setItem('rizq_lang', 'fr'); } catch (e) { /* */ }
      try { document.cookie = 'rizq_lang=fr;path=/;max-age=31536000'; } catch (e2) { /* */ }
    });
    let navOk = true;
    try {
      const resp = await page.goto(origin + pg.path, { waitUntil: 'domcontentloaded', timeout: 90000 });
      navOk = !!(resp && resp.ok());
    } catch (eNav) {
      navOk = false;
      ok(pg.key + ' navigates', false, eNav.message);
      await context.close();
      continue;
    }
    ok(pg.key + ' navigates', navOk, pg.path);
    await page.waitForTimeout(pg.key === 'home' ? 4500 : 2800);
    try {
      await page.evaluate(() => {
        if (typeof applyLandingLang === 'function') applyLandingLang(false);
        else if (window.RizqI18n && typeof window.RizqI18n.apply === 'function') window.RizqI18n.apply('fr');
        if (typeof window.RizqGuideRefreshLang === 'function') window.RizqGuideRefreshLang();
        if (window.RizqCivicTicker && typeof window.RizqCivicTicker.refreshLang === 'function') {
          window.RizqCivicTicker.refreshLang();
        }
        if (typeof window.__rizqApplyMockLang === 'function') window.__rizqApplyMockLang();
        document.dispatchEvent(new CustomEvent('rizq:langchange', { bubbles: true, detail: { lang: 'fr' } }));
      });
    } catch (eApply) { /* */ }
    await page.waitForTimeout(700);

    const leak = await page.evaluate(scanFn, {
      userContentSel: ALLOW.userContentSel,
      brandSel: ALLOW.brandSel,
      brandExact: ALLOW.brandExact,
    });

    ok(pg.key + ' document.lang=fr', leak.htmlLang === 'fr' || String(leak.htmlLang || '').indexOf('fr') === 0,
      leak.htmlLang);
    if (pg.key === 'home') {
      ok(pg.key + ' isAr=false', leak.isAr === false, String(leak.isAr));
    }
    ok(pg.key + ' no Arabic outside allowlist (text/alt/aria/title/placeholder)',
      leak.hitCount === 0,
      leak.hitCount + ' hits: ' + JSON.stringify(leak.hits));

    await context.close();
  }

  await browser.close();
  await new Promise((r) => server.close(r));

  const failed = ok.fail || 0;
  console.log('\nfr-no-arabic-leak: ' + (ok.pass || 0) + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
