#!/usr/bin/env node
'use strict';
/** قبل/بعد: أنماط + معارض + بطل المعرض — 1440 و 390 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '../..');
const BASELINE = process.env.RIZQ_A7_BASELINE || '/tmp/fix-logic-3-baseline';
const OUT = path.resolve(ROOT, 'qa/screens/fix-home-wiring-1');

function loadPlaywright() {
  const cands = [
    path.join(ROOT, 'qa/refactor-landing-1/node_modules/playwright'),
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    'playwright'
  ];
  for (const c of cands) {
    try { return require(c); } catch (_) {}
  }
  throw new Error('playwright missing');
}

function mime(p) {
  if (p.endsWith('.html')) return 'text/html; charset=utf-8';
  if (p.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (p.endsWith('.css')) return 'text/css; charset=utf-8';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        let rel = decodeURIComponent(u.pathname);
        if (rel === '/') rel = '/rizq_landing_v8.html';
        const fp = path.normalize(path.join(rootDir, rel.replace(/^\//, '')));
        if (!fp.startsWith(rootDir) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
          res.writeHead(404); res.end('missing'); return;
        }
        res.writeHead(200, { 'Content-Type': mime(fp), 'Cache-Control': 'no-store' });
        fs.createReadStream(fp).pipe(res);
      } catch (e) {
        res.writeHead(500); res.end(String(e.message || e));
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, base: 'http://127.0.0.1:' + server.address().port }));
    server.on('error', reject);
  });
}

async function prepare(page) {
  const PNG8 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVQYV2P8z8Dwn4EIwDiqkKsCAH1lAwV/3v9yAAAAAElFTkSuQmCC',
    'base64'
  );
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const type = route.request().resourceType();
    if (type === 'image' || /images\.unsplash\.com/i.test(url)) {
      if (/^https?:\/\/127\.0\.0\.1(?::\d+)?\//i.test(url) && !/unsplash/i.test(url)) return route.continue();
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG8 });
    }
    if (/fonts\.googleapis|fonts\.gstatic/i.test(url) || type === 'font') return route.abort();
    if (/\/api\//.test(url)) {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, ads: [], items: [], accounts: [] })
      });
    }
    return route.continue();
  });
}

async function shot(page, base, label, vp) {
  await page.setViewportSize({ width: vp, height: vp === 390 ? 844 : 900 });
  await page.goto(base + '/rizq_landing_v8.html?a7=1', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(900);
  const targets = [
    { id: 'rizq-styles', name: 'styles' },
    { id: 'rizq-showroom-models', name: 'showroom-models' },
    { id: 'virtual-showrooms', name: 'showroom-hero' },
  ];
  for (const t of targets) {
    const el = await page.$('#' + t.id);
    if (!el) {
      console.log('MISSING', t.id, label, vp);
      continue;
    }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const file = path.join(OUT, label + '-' + t.name + '-' + vp + '.png');
    await el.screenshot({ path: file });
    console.log('wrote', file);
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { chromium } = loadPlaywright();
  const baseSrv = await startStaticServer(BASELINE);
  const curSrv = await startStaticServer(ROOT);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of [1440, 390]) {
      const ctxB = await browser.newContext({ viewport: { width: vp, height: 900 } });
      const ctxC = await browser.newContext({ viewport: { width: vp, height: 900 } });
      const pageB = await ctxB.newPage();
      const pageC = await ctxC.newPage();
      await prepare(pageB);
      await prepare(pageC);
      await shot(pageB, baseSrv.base, 'before', vp);
      await shot(pageC, curSrv.base, 'after', vp);
      await ctxB.close();
      await ctxC.close();
    }
  } finally {
    await browser.close();
    baseSrv.server.close();
    curSrv.server.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
