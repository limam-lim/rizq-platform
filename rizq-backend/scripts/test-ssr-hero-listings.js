#!/usr/bin/env node
/**
 * يقفل حقن SSR لـ #hero-listings: تهريب XSS، 4–6 بطاقات، حفظ الهيكل، وعدم مسح JS.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ssr = require('../lib/ssrHeroListings');

let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) {
    pass += 1;
    console.log('  ✓ ' + name);
  } else {
    fail += 1;
    console.log('  ✗ ' + name + (detail ? ' — ' + String(detail).slice(0, 200) : ''));
  }
}

(async function main() {
  ok('esc escapes XSS payload',
    ssr.esc('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;'
    && ssr.esc('"\'') === '&quot;&#39;');

  const landingPath = path.join(ROOT, 'rizq_landing_v8.html');
  const landing = fs.readFileSync(landingPath, 'utf8');
  ok('landing buildCards preserves SSR cards',
    /data-rizq-ssr-hero/.test(landing)
    && /_bindSsrHeroCards/.test(landing)
    && /querySelector\('\.ad-card\[data-rizq-ssr-hero="1"\]'\)/.test(landing));
  ok('hydrateLiveAds does not skeleton-wipe SSR',
    /!track\.querySelector\('\.ad-card\[data-rizq-ssr-hero="1"\]'\)/.test(landing));
  ok('rebuild-dynamic keeps SSR when lang matches',
    /data-rizq-ssr-lang/.test(landing)
    && /ssrLang === pageLang/.test(landing));

  const cards = await ssr.pickHeroAds({ lang: 'ar', count: 6 });
  ok('pickHeroAds returns 4–6 cards',
    cards.length >= ssr.SSR_COUNT_MIN && cards.length <= ssr.SSR_COUNT_MAX,
    'len=' + cards.length);

  const evil = {
    id: '"><script>alert(1)</script>',
    title: '<b>XSS</b>',
    cat: '<img src=x onerror=alert(1)>',
    loc: 'javascript:alert(1)',
    price: '1" onload="alert(1)',
    emoji: '🏠',
    bg: 'red',
    image: 'javascript:alert(1)',
  };
  const evilHtml = ssr.renderTrackHtml([
    Object.assign({}, ssr.DEMO_SEED[0], evil, { image: 'rizq-assets/demo-fashion/demo-daraa-street-dark.webp' }),
  ]);
  ok('rendered card escapes title/cat/id',
    !evilHtml.includes('<script>')
    && !evilHtml.includes('<b>XSS</b>')
    && evilHtml.includes('&lt;b&gt;XSS&lt;/b&gt;')
    && evilHtml.includes('&quot;&gt;&lt;script&gt;'));
  ok('javascript: image rejected (no src=javascript)',
    !/src=["']javascript:/i.test(ssr.renderTrackHtml([Object.assign({}, ssr.DEMO_SEED[0], { image: 'javascript:alert(1)' })])));

  const injected = await ssr.injectHeroListingsHtml(landing, { lang: 'ar', count: 6 });
  ok('inject replaces cards-track skeleton with SSR cards',
    /data-rizq-ssr-seeded="\d+"/.test(injected)
    && (injected.match(/data-rizq-ssr-hero="1"/g) || []).length >= 4);
  ok('inject adds preload for first image',
    /rel="preload"[^>]*as="image"/.test(injected));
  ok('first SSR img is eager+high',
    /data-rizq-ssr-hero="1"[\s\S]*?loading="eager"[\s\S]*?fetchpriority="high"/.test(injected)
    || /loading="eager" fetchpriority="high"/.test(injected));

  /* ارتفاع مطابق للهيكل: media 140px + min-width 200px */
  ok('SSR card height matches skeleton media 140px',
    /height:140px/.test(injected) && /min-width:200px/.test(injected));

  /* server.js يحقن عبر sendRizqHtmlFile */
  const server = fs.readFileSync(path.join(ROOT, 'rizq-backend', 'server.js'), 'utf8');
  ok('server sendRizqHtmlFile calls injectHeroListingsHtml',
    /injectHeroListingsHtml/.test(server)
    && /rizq_landing_v8\.html/.test(server));

  console.log(fail
    ? ('\nssr-hero-listings: FAILED ' + fail + ' / ' + (pass + fail))
    : ('\nssr-hero-listings: ALL OK / ' + pass));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
