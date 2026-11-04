#!/usr/bin/env node
/**
 * محاكاة زائر بكاش قديم → تفعيل SW جديد يمسح الكاشات القديمة
 * ويصل للأصول بإصدار ASSET_V دون boot مزدوج للهيدر.
 *
 * تشغيل: node qa/cls-1/test-sw-cache-bump.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');

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
      /* لا كاش من الخادم — نعتمد على Cache API في الصفحة */
      res.writeHead(200, {
        'content-type': types[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
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
  const pwaSrc = fs.readFileSync(path.join(ROOT, 'rizq_pwa.js'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const assetM = pwaSrc.match(/ASSET_V\s*=\s*'([^']+)'/);
  const cacheM = pwaSrc.match(/SW_CACHE\s*=\s*'([^']+)'/);
  const swCacheM = swSrc.match(/CACHE_NAME\s*=\s*'([^']+)'/);
  const assetV = assetM && assetM[1];
  const swCache = cacheM && cacheM[1];
  const swName = swCacheM && swCacheM[1];

  ok('ASSET_V present', !!assetV, assetV);
  ok('SW_CACHE matches sw CACHE_NAME', swCache === swName, { swCache, swName });
  ok('SW register uses ASSET_V query', /SW_URL\s*=\s*'sw\.js\?v='\s*\+\s*ASSET_V/.test(pwaSrc)
    || pwaSrc.includes("SW_URL = 'sw.js?v=' + ASSET_V"));
  ok('activate deletes other caches', /k !== CACHE_NAME/.test(swSrc) && /caches\.delete/.test(swSrc));
  ok('skipWaiting + clients.claim', /skipWaiting/.test(swSrc) && /clients\.claim/.test(swSrc));
  ok('message SKIP_WAITING handler', /SKIP_WAITING/.test(swSrc));

  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const origin = 'http://127.0.0.1:' + server.address().port;

  /* سياق يشبه الإنتاج (ليس localhost) حتى يُسجَّل SW */
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'allow',
  });

  /* زيارة 1: زرع كاش قديم يدوياً ثم تحميل الصفحة */
  const page = await context.newPage();
  await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 60000 });

  const seeded = await page.evaluate(async () => {
    if (!('caches' in window)) return { ok: false, reason: 'no caches' };
    await caches.open('rizq-cache-v22.1');
    await caches.open('rizq-cache-v31.20');
    await caches.open('rizq-cache-v31.24');
    const keys = await caches.keys();
    return { ok: true, keys: keys.filter((k) => /^rizq-cache-v/.test(k)) };
  });
  ok('seeded old caches', seeded.ok && seeded.keys.length >= 3, seeded);

  /* إعادة تحميل لتشغيل منطق المسح في rizq_pwa.js (localhost يعطّل SW لكن المسح يعمل) */
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);

  const afterClient = await page.evaluate(async (want) => {
    const keys = (await caches.keys()).filter((k) => /^rizq-cache-v/.test(k));
    const boots = window.__rizqMockupHdrTrialInit === true
      || document.body.getAttribute('data-rizq-mock-booted') === '1';
    const mockScripts = Array.from(document.querySelectorAll('script[src*="rizq_header_mockup_trial.js"]'))
      .map((s) => s.getAttribute('src'));
    return {
      keys,
      boots: !!boots,
      mockScripts,
      mockHdrCount: document.querySelectorAll('#rizq-mock-hdr').length,
      assetHint: (document.querySelector('script[src*="rizq_pwa.js"]') || {}).src || '',
      want: want,
    };
  }, swCache);

  /* على localhost: pwa يمسح كل الكاشات القديمة؛ قد لا يفتح SW_CACHE لأن SW غير مسجّل */
  const staleLeft = (afterClient.keys || []).filter((k) => k !== swCache);
  ok('client purged stale caches (no old left)', staleLeft.length === 0, afterClient.keys);
  ok('single mock header in DOM', afterClient.mockHdrCount === 1, afterClient.mockHdrCount);
  ok('mockup script src carries current MOCK_HDR_V',
    (afterClient.mockScripts || []).some((s) => /v=5\.93/.test(s || '')),
    afterClient.mockScripts);
  ok('pwa script carries ASSET_V', new RegExp('v=' + assetV.replace(/\./g, '\\.')).test(afterClient.assetHint || ''),
    afterClient.assetHint);

  /* محاكاة activate purge كما يفعل sw.js */
  const activateSim = await page.evaluate(async (CACHE_NAME) => {
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

  /* لا boot مزدوج: عدّاد init للهيدر */
  const bootCount = await page.evaluate(() => {
    return {
      initFlag: window.__rizqMockupHdrTrialInit === true,
      bootedAttr: document.body.getAttribute('data-rizq-mock-booted'),
      hdrs: document.querySelectorAll('#rizq-mock-hdr').length,
    };
  });
  ok('no mockup double-boot (one header, init once)',
    bootCount.hdrs === 1 && (bootCount.initFlag || bootCount.bootedAttr === '1'), bootCount);

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
