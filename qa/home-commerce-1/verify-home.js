#!/usr/bin/env node
/**
 * تحقق رئيسية fix-home-commerce-1:
 * - ترتيب الأقسام
 * - طلبات /api/catalog/home (styles/showrooms/stores) بدل N+1
 * - CLS < 0.05
 * - محتوى الأقسام الثلاثة بعد launchDate (مع seed تخرج إن وُجد)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const ART = '/opt/cursor/artifacts';

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(ROOT, 'qa/cls-1/node_modules/playwright'),
    'playwright',
  ];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* */ }
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
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.woff2': 'font/woff2',
      };
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function measureCls(page) {
  return page.evaluate(() => new Promise((resolve) => {
    let cls = 0;
    try {
      const po = new PerformanceObserver((list) => {
        list.getEntries().forEach((e) => {
          if (!e.hadRecentInput) cls += e.value;
        });
      });
      po.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => {
        try { po.disconnect(); } catch (e) { /* */ }
        resolve(Number(cls.toFixed(4)));
      }, 2500);
    } catch (e) {
      resolve(0);
    }
  }));
}

function waitPort(port, ms) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryOnce = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 1000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > ms) reject(new Error('backend timeout'));
        else setTimeout(tryOnce, 400);
      });
    };
    tryOnce();
  });
}

(async () => {
  fs.mkdirSync(ART, { recursive: true });
  const results = { ok: true, checks: [], requests: {}, cls: {}, order: [] };

  // static for HTML order + CLS without backend dependency
  const staticSrv = await startStatic();
  const staticPort = staticSrv.address().port;
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1) section order from DOM
  {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${staticPort}/rizq_landing_v8.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const order = await page.evaluate(() => {
      const ids = ['hero', 'hero-listings', 'rizq-styles', 'rizq-showroom-models', 'rizq-vid-strip', 'rvid-section', 'categories', 'listings'];
      return ids.map((id) => {
        const el = document.getElementById(id);
        return { id, top: el ? el.getBoundingClientRect().top + window.scrollY : -1 };
      }).filter((x) => x.top >= 0).sort((a, b) => a.top - b.top).map((x) => x.id);
    });
    results.order = order;
    const want = ['hero', 'hero-listings', 'rizq-styles', 'rizq-showroom-models', 'rizq-vid-strip'];
    let idx = 0;
    let orderOk = true;
    for (const id of want) {
      const at = order.indexOf(id);
      if (at < idx) { orderOk = false; break; }
      idx = at;
    }
    results.checks.push({ name: 'section_order', pass: orderOk, order });
    await page.screenshot({ path: path.join(ART, 'home-commerce-order.png'), fullPage: false });
    await page.close();
  }

  // 2) CLS cold 1440 landing
  {
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${staticPort}/rizq_landing_v8.html`, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(500);
    const cls = await measureCls(page);
    results.cls['1440_cold'] = cls;
    results.checks.push({ name: 'cls_1440_cold_lt_0.05', pass: cls < 0.05, cls });
    await page.close();
  }

  // 3) with backend — request counts
  let backend = null;
  const apiPort = 38765;
  try {
    const env = Object.assign({}, process.env, {
      PORT: String(apiPort),
      HOST: '127.0.0.1',
      NODE_ENV: 'test',
    });
    backend = spawn('node', ['scripts/run-with-test-db.js', 'server.js'], {
      cwd: path.join(ROOT, 'rizq-backend'),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let bootLog = '';
    backend.stdout.on('data', (d) => { bootLog += d.toString(); });
    backend.stderr.on('data', (d) => { bootLog += d.toString(); });
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('backend boot timeout\n' + bootLog.slice(-1200))), 60000);
      const onData = (d) => {
        const s = d.toString();
        if (s.includes('running on http://') || /127\.0\.0\.1:38765/.test(s)) {
          clearTimeout(t);
          resolve();
        }
      };
      backend.stdout.on('data', onData);
      backend.stderr.on('data', onData);
    });
    await waitPort(apiPort, 20000).catch(() => {});

    // seed graduation into test db (best-effort)
    try {
      await new Promise((resolve) => {
        const seed = spawn('node', ['scripts/run-with-test-db.js', 'scripts/seed-graduation-demo.js'], {
          cwd: path.join(ROOT, 'rizq-backend'),
          env: process.env,
          stdio: 'inherit',
        });
        seed.on('exit', () => resolve());
      });
    } catch (eSeed) { /* optional */ }

    const page = await context.newPage();
    const reqs = [];
    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('/api/')) reqs.push(u);
    });
    await page.addInitScript((port) => {
      window.RIZQ_BACKEND_BASE = 'http://127.0.0.1:' + port;
      try {
        localStorage.setItem('rizq_launch_cache_v1', JSON.stringify({
          launchDate: '2025-01-01',
          freeDays: 90,
          freeUntil: '2025-04-01',
          minActiveAdsToShow: 50,
          savedAt: Date.now(),
        }));
      } catch (e) { /* */ }
    }, apiPort);

    await page.goto(`http://127.0.0.1:${staticPort}/rizq_landing_v8.html`, {
      waitUntil: 'networkidle',
      timeout: 90000,
    }).catch(() => {});
    await page.waitForTimeout(3500);

    const homeReqs = reqs.filter((u) => u.includes('/api/catalog/home'));
    const catalogByAcc = reqs.filter((u) => /\/api\/catalog\?accountId=/.test(u));
    const adsReqs = reqs.filter((u) => u.includes('/api/ads'));
    results.requests = {
      home: homeReqs.length,
      homeUrls: homeReqs.slice(0, 10),
      catalogByAccount: catalogByAcc.length,
      ads: adsReqs.length,
      totalApi: reqs.length,
    };
    results.checks.push({
      name: 'home_api_used',
      pass: homeReqs.length >= 2,
      home: homeReqs.length,
    });
    results.checks.push({
      name: 'no_showroom_n_plus_one',
      pass: catalogByAcc.length === 0,
      catalogByAccount: catalogByAcc.length,
    });

    const sectionState = await page.evaluate(() => {
      function countCards(sel) {
        const el = document.querySelector(sel);
        if (!el) return 0;
        return el.querySelectorAll('.rizq-style-card, .ad-card, [role="listitem"]').length;
      }
      return {
        styles: countCards('#rizq-styles-rail'),
        showrooms: countCards('#rizq-srm-rail'),
        heroCards: countCards('#cards-track'),
        stylesEmpty: !!(document.querySelector('#rizq-styles-rail.is-empty') || document.querySelector('#rizq-styles-rail .rizq-styles-empty')),
        showroomsEmpty: !!(document.querySelector('#rizq-srm-rail.is-empty') || document.querySelector('#rizq-srm-rail .rizq-styles-empty')),
        storeBadges: Array.from(document.querySelectorAll('#cards-track .rzq-adx-badge')).map((b) => b.textContent).slice(0, 8),
      };
    });
    results.sections = sectionState;
    results.checks.push({
      name: 'styles_or_demo_rail',
      pass: sectionState.styles > 0 || sectionState.stylesEmpty,
      sectionState,
    });
    results.checks.push({
      name: 'showrooms_or_empty_msg',
      pass: sectionState.showrooms > 0 || sectionState.showroomsEmpty,
      sectionState,
    });

    await page.screenshot({ path: path.join(ART, 'home-commerce-live.png'), fullPage: false });
    // scroll to styles
    await page.evaluate(() => {
      const el = document.getElementById('rizq-styles');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ART, 'home-commerce-styles.png'), fullPage: false });
    await page.evaluate(() => {
      const el = document.getElementById('rizq-showroom-models');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ART, 'home-commerce-showrooms.png'), fullPage: false });
    await page.close();
  } catch (eApi) {
    results.checks.push({ name: 'backend_verify', pass: false, error: String(eApi && eApi.message || eApi) });
  } finally {
    if (backend) {
      try { backend.kill('SIGTERM'); } catch (e) { /* */ }
    }
  }

  await browser.close();
  staticSrv.close();

  results.ok = results.checks.every((c) => c.pass);
  const outPath = path.join(ART, 'home-commerce-verify.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  process.exit(results.ok ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
