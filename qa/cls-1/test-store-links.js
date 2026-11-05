#!/usr/bin/env node
/**
 * e2e: روابط المحلات من شريط الاكتشاف (#virtual-stores) ومن بطاقات الأنماط
 * تفتح rizq_store.html الصحيح (id أو demo).
 *
 * تشغيل: BASE_URL=http://127.0.0.1:3000 node qa/cls-1/test-store-links.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const BASE = process.env.BASE_URL || '';

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    path.join(__dirname, 'node_modules/playwright'),
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
      };
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function ok(label, cond, detail) {
  if (cond) console.log('  ✓ ' + label);
  else {
    console.log('  ✗ ' + label + (detail != null ? ' — ' + JSON.stringify(detail) : ''));
    ok.fail = (ok.fail || 0) + 1;
  }
  ok.pass = (ok.pass || 0) + (cond ? 1 : 0);
}

(async () => {
  const { chromium } = loadPlaywright();
  let server = null;
  let origin = BASE;
  if (!origin) {
    server = await startStatic();
    origin = 'http://127.0.0.1:' + server.address().port;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    try { localStorage.setItem('rizq_lang', 'ar'); } catch (e) {}
  });

  await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const a = document.querySelector(
      '#virtual-stores a.rzq-disc-card[href*="rizq_store.html"], #rzq-disc-store a[href*="rizq_store.html"]'
    );
    return !!a;
  }, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(800);

  /* —— شريط اكتشاف المحلات —— */
  await page.evaluate(() => {
    const el = document.getElementById('virtual-stores');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(800);

  const strip = await page.evaluate(() => {
    const root = document.getElementById('virtual-stores');
    if (!root) return { href: '', count: 0 };
    const cards = Array.from(root.querySelectorAll('a.rzq-disc-card[href*="rizq_store.html"]'));
    return {
      count: cards.length,
      href: cards[0] ? cards[0].getAttribute('href') : '',
      ids: cards.slice(0, 5).map((a) => a.getAttribute('href')),
    };
  });

  ok('stores strip has rizq_store.html cards', strip.count > 0, strip);
  ok('strip href is rizq_store.html with id|demo',
    /rizq_store\.html\?(id|demo)=/.test(strip.href || ''), strip.href);

  if (/rizq_store\.html/i.test(strip.href || '')) {
    const before = page.url();
    const navPromise = page.waitForURL(/rizq_store\.html/i, { timeout: 15000 }).catch(() => null);
    await page.evaluate(() => {
      const a = document.querySelector('#virtual-stores a.rzq-disc-card[href*="rizq_store.html"]');
      if (a) a.click();
    });
    await navPromise;
    await page.waitForTimeout(600);
    const after = page.url();
    ok('strip click opens rizq_store.html', /rizq_store\.html/i.test(after) && after !== before, after);
    ok('strip URL keeps store id|demo', /[?&](id|demo)=/.test(after), after);
    /* تطابق المعرّف المنقور */
    const wantId = (strip.href.match(/[?&]id=([^&]+)/) || [])[1];
    if (wantId) {
      ok('strip opens same store id', after.indexOf('id=' + decodeURIComponent(wantId)) >= 0
        || after.indexOf('id=' + wantId) >= 0, { wantId, after });
    }
  }

  /* عودة للرئيسية للأنماط */
  await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    const el = document.getElementById('rizq-styles');
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(1200);

  const styleHref = await page.evaluate(() => {
    const rail = document.getElementById('rizq-styles-rail') || document.querySelector('#rizq-styles');
    if (!rail) return '';
    const cta = rail.querySelector('a.rizq-style-cta[href*="rizq_store"], a[href*="rizq_store.html"]');
    if (cta) return cta.getAttribute('href') || '';
    const tile = rail.querySelector('a.rizq-style-tile[href*="rizq_store.html"]');
    return tile ? (tile.getAttribute('href') || '') : '';
  });

  ok('styles rail exposes rizq_store.html href', /rizq_store\.html/i.test(styleHref || ''), styleHref);

  if (/rizq_store\.html/i.test(styleHref || '')) {
    const navPromise = page.waitForURL(/rizq_store\.html/i, { timeout: 15000 }).catch(() => null);
    const clicked = await page.evaluate(() => {
      const rail = document.getElementById('rizq-styles-rail') || document.querySelector('#rizq-styles');
      const a = rail && rail.querySelector('a.rizq-style-cta[href*="rizq_store"], a[href*="rizq_store.html"]');
      if (!a) return false;
      a.click();
      return true;
    });
    ok('styles CTA click dispatched', clicked);
    await navPromise;
    await page.waitForTimeout(600);
    const after = page.url();
    ok('styles click opens rizq_store.html', /rizq_store\.html/i.test(after), after);
    ok('styles store URL has id or demo', /[?&](id|demo)=/.test(after), after);
  }

  await browser.close();
  if (server) server.close();

  const fail = ok.fail || 0;
  const pass = ok.pass || 0;
  console.log('\n' + (fail ? 'FAILED ' + fail : 'ALL OK') + ' / ' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
