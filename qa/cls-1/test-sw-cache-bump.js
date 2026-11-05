#!/usr/bin/env node
/**
 * زائر بـ SW/كاش قديم → زيارة تالية تحصل على ASSET_V الجديد دون مسح يدوي،
 * ودون boot مزدوج للهيدر.
 *
 * تشغيل: node qa/cls-1/test-sw-cache-bump.js
 *
 * ملاحظة: على 127.0.0.1 يعطّل rizq_pwa.js تسجيل SW؛ الاختبار يعيد كتابة
 * isLocal=false في الرد فقط داخل هذا الهارنس (لا يغيّر الملف على القرص).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const OLD_ASSET = '31.20';
const OLD_CACHE = 'rizq-cache-v' + OLD_ASSET;

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
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

function rewriteAssetVersion(src, fromV, toV) {
  return src
    .split("ASSET_V = '" + fromV + "'").join("ASSET_V = '" + toV + "'")
    .split("SW_CACHE = 'rizq-cache-v" + fromV + "'").join("SW_CACHE = 'rizq-cache-v" + toV + "'")
    .split("CACHE_NAME = 'rizq-cache-v" + fromV + "'").join("CACHE_NAME = 'rizq-cache-v" + toV + "'")
    .split('?v=' + fromV).join('?v=' + toV)
    .split('rizq-cache-v' + fromV).join('rizq-cache-v' + toV);
}

/** فرض تسجيل SW في هارنس الاختبار رغم 127.0.0.1 */
function forceSwRegistration(src) {
  return src
    .replace(
      /var isLocal = !host \|\| host === 'localhost' \|\| host === '127\.0\.0\.1';/,
      "var isLocal = false; /* test-sw-cache-bump harness */"
    )
    .replace(
      /var isLocal=!host\|\|host==='localhost'\|\|host==='127\.0\.0\.1';/,
      'var isLocal=false;'
    );
}

function startStatic(state) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const raw = req.url || '/';
      let url = decodeURIComponent(raw.split('?')[0]);
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
      let body = fs.readFileSync(file);
      const base = path.basename(url);
      if (base === 'rizq_pwa.js' || base === 'sw.js') {
        let text = body.toString('utf8');
        if (state.phase === 'old') {
          text = rewriteAssetVersion(text, state.assetV, OLD_ASSET);
        }
        if (base === 'rizq_pwa.js') {
          text = forceSwRegistration(text);
        }
        body = Buffer.from(text, 'utf8');
      }
      res.writeHead(200, {
        'content-type': types[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
        'service-worker-allowed': '/',
      });
      res.end(body);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

(async () => {
  const pwaSrc = fs.readFileSync(path.join(ROOT, 'rizq_pwa.js'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const assetM = pwaSrc.match(/ASSET_V\s*=\s*'([^']+)'/);
  const mockM = pwaSrc.match(/MOCK_HDR_V\s*=\s*'([^']+)'/);
  const cacheM = pwaSrc.match(/SW_CACHE\s*=\s*'([^']+)'/);
  const swCacheM = swSrc.match(/CACHE_NAME\s*=\s*'([^']+)'/);
  const assetV = assetM && assetM[1];
  const mockHdrV = mockM && mockM[1];
  const swCache = cacheM && cacheM[1];
  const swName = swCacheM && swCacheM[1];

  ok('ASSET_V present', !!assetV, assetV);
  ok('MOCK_HDR_V present', !!mockHdrV, mockHdrV);
  ok('SW_CACHE matches sw CACHE_NAME', swCache === swName, { swCache, swName });
  ok('SW register uses ASSET_V query', /SW_URL\s*=\s*'sw\.js\?v='\s*\+\s*ASSET_V/.test(pwaSrc)
    || pwaSrc.includes("SW_URL = 'sw.js?v=' + ASSET_V"));
  ok('activate deletes other caches', /k !== CACHE_NAME/.test(swSrc) && /caches\.delete/.test(swSrc));
  ok('skipWaiting + clients.claim', /skipWaiting/.test(swSrc) && /clients\.claim/.test(swSrc));
  ok('message SKIP_WAITING handler', /SKIP_WAITING/.test(swSrc));
  ok('html/css/js network-first (no stale layout)',
    /\(html\|css\|js\)/.test(swSrc) || /html\|css\|js/.test(swSrc));

  const state = { phase: 'old', assetV: assetV };
  const { chromium } = loadPlaywright();
  const server = await startStatic(state);
  const port = server.address().port;
  const origin = 'http://127.0.0.1:' + port;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'allow',
  });

  /* —— زيارة 1: SW بالإصدار السابق —— */
  const page = await context.newPage();
  await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'load', timeout: 90000 });

  /* انتظر controller */
  let visit1 = null;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(400);
    visit1 = await page.evaluate(async (want) => {
      if (!('serviceWorker' in navigator)) {
        return { noSw: true };
      }
      const regs = await navigator.serviceWorker.getRegistrations();
      const ctrl = navigator.serviceWorker.controller;
      const keys = (await caches.keys()).filter((k) => /^rizq-cache-v/.test(k));
      return {
        regCount: regs.length,
        controllerUrl: ctrl ? ctrl.scriptURL : null,
        keys,
        waiting: !!(regs[0] && regs[0].waiting),
        active: regs[0] && regs[0].active ? regs[0].active.scriptURL : null,
        wantOld: want.oldAsset,
      };
    }, { oldAsset: OLD_ASSET });
    if (visit1.noSw) break;
    if (visit1.controllerUrl || visit1.active) break;
  }

  ok('serviceWorker API available', !(visit1 && visit1.noSw), visit1);
  ok('SW registered on first visit (old)', visit1 && visit1.regCount >= 1, visit1);

  /* فعّل waiting إن وُجد ثم ازرع كاشاً قديماً إضافياً */
  await page.evaluate(async (want) => {
    const regs = await navigator.serviceWorker.getRegistrations();
    const reg = regs[0];
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      await new Promise((r) => setTimeout(r, 500));
    }
    await caches.open('rizq-cache-v22.1');
    const c = await caches.open(want.oldCache);
    await c.put(want.origin + '/__stale_marker__', new Response('old'));
  }, { oldCache: OLD_CACHE, origin: origin });
  await page.waitForTimeout(800);

  visit1 = await page.evaluate(async (want) => {
    const regs = await navigator.serviceWorker.getRegistrations();
    const ctrl = navigator.serviceWorker.controller;
    const keys = (await caches.keys()).filter((k) => /^rizq-cache-v/.test(k));
    return {
      regCount: regs.length,
      controllerUrl: ctrl ? ctrl.scriptURL : null,
      active: regs[0] && regs[0].active ? regs[0].active.scriptURL : null,
      keys,
      hdrs: document.querySelectorAll('#rizq-mock-hdr').length,
      themeHref: (document.querySelector('link[href*="rizq-theme.css"]') || {}).href || '',
      wantOld: want.oldAsset,
    };
  }, { oldAsset: OLD_ASSET });

  const oldScript = visit1.controllerUrl || visit1.active || '';
  ok('old SW script active (v=' + OLD_ASSET + ')',
    oldScript.indexOf('v=' + OLD_ASSET) !== -1, oldScript);
  ok('old / stale caches present after visit 1',
    (visit1.keys || []).some((k) => k === OLD_CACHE || k === 'rizq-cache-v22.1'),
    visit1.keys);

  /* —— زيارة 2: الأصول الجديدة بدون مسح يدوي —— */
  state.phase = 'new';
  await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(1500);

  let upgraded = null;
  for (let i = 0; i < 45; i++) {
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(function () {});
      await page.waitForTimeout(900);
      upgraded = await page.evaluate(async (want) => {
        const keys = (await caches.keys()).filter((k) => /^rizq-cache-v/.test(k));
        const regs = await navigator.serviceWorker.getRegistrations();
        const ctrl = navigator.serviceWorker.controller;
        try {
          if (regs[0]) {
            if (regs[0].waiting) regs[0].waiting.postMessage({ type: 'SKIP_WAITING' });
            if (regs[0].update) await regs[0].update();
          }
        } catch (eU) { /* */ }
        const mockScripts = Array.from(document.querySelectorAll('script[src*="rizq_header_mockup_trial.js"]'))
          .map((s) => s.getAttribute('src'));
        const themeHref = (document.querySelector('link[href*="rizq-theme.css"]') || {}).href || '';
        const pwaHint = (document.querySelector('script[src*="rizq_pwa.js"]') || {}).src || '';
        return {
          keys,
          staleLeft: keys.filter((k) => k !== want.swCache),
          controllerUrl: ctrl ? ctrl.scriptURL : null,
          active: regs[0] && regs[0].active ? regs[0].active.scriptURL : null,
          themeHref,
          pwaHint,
          mockScripts,
          hdrs: document.querySelectorAll('#rizq-mock-hdr').length,
          reloaded: (() => { try { return sessionStorage.getItem('rizq_sw_reloaded'); } catch (e) { return null; } })(),
        };
      }, { assetV: assetV, swCache: swCache });
    } catch (eNav) {
      /* controllerchange → location.reload() يدمّر السياق — انتظر وأعد المحاولة */
      await page.waitForTimeout(1000);
      continue;
    }

    const scriptUrl = upgraded.controllerUrl || upgraded.active || '';
    const ctrlOk = scriptUrl.indexOf('v=' + assetV) !== -1;
    const themeOk = new RegExp('v=' + assetV.replace(/\./g, '\\.')).test(upgraded.themeHref || '');
    const staleOk = (upgraded.staleLeft || []).every((k) => k === swCache);
    if (ctrlOk && (themeOk || i > 12) && (staleOk || i > 18)) break;
  }

  const finalScript = (upgraded && (upgraded.controllerUrl || upgraded.active)) || '';
  ok('new SW controlling after next visit (v=' + assetV + ')',
    finalScript.indexOf('v=' + assetV) !== -1, finalScript);
  ok('injected theme.css carries current ASSET_V (no manual clear)',
    !!(upgraded && new RegExp('v=' + assetV.replace(/\./g, '\\.')).test(upgraded.themeHref || '')),
    upgraded && upgraded.themeHref);
  ok('stale rizq-cache-* purged after upgrade',
    !!(upgraded && (upgraded.staleLeft || []).every((k) => k === swCache)),
    upgraded && { keys: upgraded.keys, staleLeft: upgraded.staleLeft });
  ok('single mock header after upgrade', upgraded && upgraded.hdrs === 1, upgraded && upgraded.hdrs);
  ok('mockup script src carries current MOCK_HDR_V',
    !!(mockHdrV && upgraded && (upgraded.mockScripts || []).some((s) =>
      new RegExp('v=' + mockHdrV.replace(/\./g, '\\.')).test(s || ''))),
    { mockHdrV, mockScripts: upgraded && upgraded.mockScripts });

  /* مسار localhost الافتراضي: مسح الكاش من العميل بدون فرض SW */
  const plainServer = await new Promise((resolve) => {
    const s = http.createServer((req, res) => {
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
      res.writeHead(200, {
        'content-type': types[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      fs.createReadStream(file).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
  const local = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'allow',
  });
  const lp = await local.newPage();
  const localOrigin = 'http://127.0.0.1:' + plainServer.address().port;
  await lp.goto(localOrigin + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await lp.evaluate(async () => {
    await caches.open('rizq-cache-v22.1');
    await caches.open('rizq-cache-v31.20');
    await caches.open('rizq-cache-v31.24');
  });
  await lp.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await lp.waitForTimeout(1200);
  const afterLocal = await lp.evaluate(async (want) => {
    const keys = (await caches.keys()).filter((k) => /^rizq-cache-v/.test(k));
    return {
      keys,
      stale: keys.filter((k) => k !== want),
      hdrs: document.querySelectorAll('#rizq-mock-hdr').length,
    };
  }, swCache);
  ok('localhost client purged stale caches', afterLocal.stale.length === 0, afterLocal.keys);
  ok('localhost single mock header', afterLocal.hdrs === 1, afterLocal.hdrs);

  const activateSim = await lp.evaluate(async (CACHE_NAME) => {
    await caches.open('rizq-cache-v31.20');
    await caches.open('rizq-cache-v31.24');
    await caches.open(CACHE_NAME);
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    );
    const left = await caches.keys();
    return { left: left.filter((k) => /^rizq-cache-v/.test(k)), CACHE_NAME };
  }, swName);
  ok('activate strategy leaves only current CACHE_NAME',
    activateSim.left.length === 1 && activateSim.left[0] === swName, activateSim);

  await local.close();
  plainServer.close();
  await browser.close();
  server.close();

  const fail = ok.fail || 0;
  const pass = ok.pass || 0;
  console.log('\n' + (fail ? 'FAILED ' + fail : 'ALL OK') + ' / ' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
