#!/usr/bin/env node
/**
 * لقطات قبل/بعد لصفحة الإعلانات على rizq_test — لا تُدفع مع الفرع.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');
const { Client } = require(path.join(__dirname, '../../rizq-backend/node_modules/pg'));

const ROOT = path.join(__dirname, '../..');
const BACKEND = path.join(ROOT, 'rizq-backend');
const OUT = __dirname;
const PORT = 4567;

function loadEnv() {
  const raw = fs.readFileSync(path.join(BACKEND, '.env'), 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i < 1) return;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!Object.prototype.hasOwnProperty.call(process.env, k)) process.env[k] = v;
  });
}

function withDb(url, name) {
  const u = new URL(url);
  u.pathname = '/' + name;
  return u.toString();
}

async function waitUp(port) {
  for (let i = 0; i < 100; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get({ host: '127.0.0.1', port, path: '/api/otp/config', timeout: 1500 }, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('t')); });
      });
      return true;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return false;
}

async function resetAndMigrate(testUrl) {
  const c = new Client({ connectionString: testUrl });
  await c.connect();
  await c.query('DROP SCHEMA IF EXISTS public CASCADE');
  await c.query('CREATE SCHEMA public');
  await c.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');
  await c.end();
  const mig = spawnSync(process.execPath, [
    '-r', 'dotenv/config',
    path.join(BACKEND, 'node_modules/node-pg-migrate/bin/node-pg-migrate.js'),
    'up', '-m', 'migrations', '--database-url-var', 'DATABASE_URL',
  ], { cwd: BACKEND, env: Object.assign({}, process.env, { DATABASE_URL: testUrl }), encoding: 'utf8' });
  if (mig.status !== 0) throw new Error('migrate failed: ' + (mig.stderr || mig.stdout || '').slice(-500));
}

async function seedAds(testUrl, n) {
  const c = new Client({ connectionString: testUrl });
  await c.connect();
  const now = Date.now();
  await c.query(
    `INSERT INTO accounts (id, data, updated_at)
     VALUES ('ACC_BRW_SEED', $1::jsonb, NOW()::text)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [JSON.stringify({
      id: 'ACC_BRW_SEED', type: 'individual', name: 'Browse Seed',
      email: 'brw_seed@test.mr', phone: '44119988', status: 'approved', suspended: false,
      createdAt: new Date().toISOString(),
    })]
  ).catch(async () => {
    // accounts may use different shape — try data-only via repos later
  });

  // Prefer platformStore upsert via child require
  await c.end();

  process.env.DATABASE_URL = testUrl;
  process.env.DB_DRIVER = 'postgres';
  // clear require cache for db
  Object.keys(require.cache).forEach((k) => {
    if (k.includes('/rizq-backend/db') || k.includes('/rizq-backend/config')) delete require.cache[k];
  });
  const platformStore = require(path.join(BACKEND, 'db/platformStore'));
  const repos = require(path.join(BACKEND, 'db/repos'));
  await repos.accounts.upsert({
    id: 'ACC_BRW_SEED', type: 'individual', name: 'Browse Seed',
    email: 'brw_seed@test.mr', phone: '44119988', status: 'approved', suspended: false,
    createdAt: new Date().toISOString(),
  });
  const ads = [];
  for (let i = 1; i <= n; i++) {
    const id = 'BRW_' + String(i).padStart(4, '0');
    const noTitle = (i % 19 === 0);
    const noPrice = (i % 13 === 0);
    ads.push({
      id,
      accountId: 'ACC_BRW_SEED',
      title: noTitle ? '' : ('إعلان تصفح ' + i + ' — نواكشوط'),
      desc: 'وصف اختبار ' + i,
      category: 'إلكترونيات',
      wilaya: 'نواكشوط',
      price: noPrice ? '' : String(1500 * i),
      status: 'active',
      images: [],
      createdAt: new Date(now - i * 60000).toISOString(),
    });
  }
  await platformStore.writeAds(ads);
  return ads.length;
}

async function main() {
  loadEnv();
  const testUrl = withDb(process.env.DATABASE_URL, 'rizq_test');
  // ensure DB exists
  {
    const admin = new Client({ connectionString: withDb(process.env.DATABASE_URL, 'postgres') });
    await admin.connect();
    const r = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', ['rizq_test']);
    if (!r.rowCount) await admin.query('CREATE DATABASE rizq_test OWNER CURRENT_USER');
    await admin.end();
  }

  console.log('reset+migrate rizq_test…');
  await resetAndMigrate(testUrl);
  console.log('seed 100 ads…');
  await seedAds(testUrl, 100);

  const child = spawn(process.execPath, ['server.js'], {
    cwd: BACKEND,
    env: Object.assign({}, process.env, {
      DATABASE_URL: testUrl,
      DB_DRIVER: 'postgres',
      PORT: String(PORT),
      HOST: '127.0.0.1',
      OTP_DEV_HINT: 'true',
      NODE_ENV: 'test',
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  if (!(await waitUp(PORT))) {
    console.error(logs.slice(-1000));
    process.exit(1);
  }

  // verify API
  const apiAds = await fetch('http://127.0.0.1:' + PORT + '/api/ads?limit=200').then((r) => r.json());
  console.log('api ads total=', apiAds.total, 'sample titles empty=', (apiAds.ads || []).filter((a) => !a.title).length);

  let chromium;
  const candidates = [
    path.join(OUT, 'node_modules/playwright'),
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(ROOT, 'qa/cursor-audit/node_modules/playwright'),
    'playwright',
  ];
  for (const c of candidates) {
    try { chromium = require(c).chromium; break; } catch (e) { /* */ }
  }
  if (!chromium) throw new Error('playwright not found');

  const browser = await chromium.launch({ headless: true });
  fs.mkdirSync(OUT, { recursive: true });
  const meta = [];

  async function capture(name, width, injectBefore) {
    const context = await browser.newContext({
      viewport: { width, height: width <= 400 ? 812 : 900 },
      locale: 'ar',
    });
    const page = await context.newPage();
    const consoleErrs = [];
    page.on('pageerror', (e) => consoleErrs.push(String(e.message || e)));
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrs.push(msg.text()); });
    await page.goto('http://127.0.0.1:' + PORT + '/rizq_browse.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1800);
    if (injectBefore) {
      await page.evaluate(() => {
        window.loadMoreAds = function () {
          if (window._infiniteLoading) return false;
          if (visibleCount >= filtered.length) return false;
          window._infiniteLoading = true;
          const body = document.getElementById('result-list-body');
          const prevTop = body ? body.scrollTop : 0;
          visibleCount = Math.min(visibleCount + PER_PAGE, filtered.length);
          renderResultList();
          if (body) body.scrollTop = prevTop;
          setTimeout(function () { window._infiniteLoading = false; }, 120);
          return true;
        };
      });
    }
    await page.evaluate(async () => {
      const body = document.getElementById('result-list-body');
      if (!body) return;
      body._rizqUserScrolled = true;
      for (let i = 0; i < 8; i++) {
        body.scrollTop = body.scrollHeight;
        if (typeof loadMoreAds === 'function') loadMoreAds();
        await new Promise((r) => setTimeout(r, 180));
      }
    });
    await page.waitForTimeout(400);
    const scrollMeta = await page.evaluate(() => {
      const body = document.getElementById('result-list-body');
      return {
        scrollTop: body ? Math.round(body.scrollTop) : -1,
        cards: body ? body.querySelectorAll('.rc').length : 0,
        filtered: typeof filtered !== 'undefined' ? filtered.length : -1,
        status: ((document.getElementById('rl-infinite') || {}).textContent || '').trim().slice(0, 80),
      };
    });
    const file = path.join(OUT, name + '.png');
    await page.screenshot({ path: file, fullPage: false });
    await context.close();
    const row = { name, file, consoleErrs, scrollMeta };
    meta.push(row);
    console.log(name, scrollMeta, 'errs=', consoleErrs.length);
    return row;
  }

  await capture('before-desktop-1440', 1440, true);
  await capture('before-mobile-375', 375, true);
  await capture('after-desktop-1440', 1440, false);
  await capture('after-mobile-375', 375, false);
  await capture('after-desktop-100ads', 1440, false);
  await capture('after-mobile-100ads', 375, false);

  // landing mobile
  {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'ar' });
    const page = await context.newPage();
    const consoleErrs = [];
    page.on('pageerror', (e) => consoleErrs.push(String(e.message || e)));
    await page.addInitScript(() => {
      try { localStorage.removeItem('rizq_launch_cache_v1'); } catch (e) {}
    });
    await page.goto('http://127.0.0.1:' + PORT + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2800);
    const hero = await page.$('#hero-listings');
    if (hero) await hero.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const scrollMeta = await page.evaluate(() => {
      const el = document.getElementById('hero-listings');
      const track = document.getElementById('cards-track');
      return {
        display: el ? getComputedStyle(el).display : 'missing',
        cards: track ? track.querySelectorAll('.ad-card').length : 0,
        adsLen: typeof ADS !== 'undefined' ? ADS.length : -1,
      };
    });
    const file = path.join(OUT, 'after-landing-mobile-375.png');
    await page.screenshot({ path: file, fullPage: false });
    meta.push({ name: 'after-landing-mobile-375', file, consoleErrs, scrollMeta });
    console.log('landing-mobile', scrollMeta, 'errs=', consoleErrs.length);
    await context.close();
  }

  await browser.close();
  try { child.kill('SIGTERM'); } catch (e) {}
  fs.writeFileSync(path.join(OUT, 'capture-meta.json'), JSON.stringify(meta, null, 2));
  // cleanup seed from rizq_test
  try {
    const c = new Client({ connectionString: testUrl });
    await c.connect();
    await c.query('DROP SCHEMA IF EXISTS public CASCADE');
    await c.query('CREATE SCHEMA public');
    await c.end();
  } catch (e) { /* */ }
  console.log('done →', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
