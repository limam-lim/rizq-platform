#!/usr/bin/env node
/**
 * روبوت: تمرير حتى النهاية ×3 (1440 و 375) مع 6 و 100 إعلان على rizq_test،
 * وقياس CLS للرئيسية وصفحة التصفح قبل/بعد.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');
const { Client } = require(path.join(__dirname, '../../rizq-backend/node_modules/pg'));

const ROOT = path.join(__dirname, '../..');
const BACKEND = path.join(ROOT, 'rizq-backend');
const PORT = 4577;
const OUT = __dirname;

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
          res.resume(); resolve();
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
  if (mig.status !== 0) throw new Error('migrate failed');
}
function assertTestDb(url) {
  const name = new URL(url).pathname.replace(/^\//, '').split('/')[0];
  if (name !== 'rizq_test') {
    throw new Error('REFUSE: seed/test must use rizq_test, got ' + name);
  }
}

function snapshotSharedJson() {
  const files = ['ads.json', 'accounts.json'];
  const out = {};
  files.forEach((name) => {
    const p = path.join(BACKEND, 'data', name);
    out[name] = fs.existsSync(p) ? fs.readFileSync(p) : null;
  });
  return out;
}

function restoreSharedJson(snap) {
  Object.keys(snap || {}).forEach((name) => {
    const p = path.join(BACKEND, 'data', name);
    if (snap[name] == null) {
      try { fs.unlinkSync(p); } catch (e) { /* ignore */ }
      return;
    }
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, snap[name]);
  });
}

/** زرع مباشر في rizq_test عبر SQL — بدون platformStore.writeAds حتى لا يلوّث data/ads.json → rizq_audit */
async function seedAds(testUrl, n) {
  assertTestDb(testUrl);
  const c = new Client({ connectionString: testUrl });
  await c.connect();
  const now = Date.now();
  const account = {
    id: 'ACC_BRW_SEED', type: 'individual', name: 'Browse Seed',
    email: 'brw_seed@test.mr', phone: '44119988', status: 'approved', suspended: false,
    createdAt: new Date().toISOString(),
  };
  await c.query(
    `INSERT INTO accounts (id, type, email, status, nni, suspended, data, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
    [account.id, account.type, account.email, account.status, '', 0, JSON.stringify(account), account.createdAt]
  );
  for (let i = 1; i <= n; i++) {
    const ad = {
      id: 'BRW_' + String(i).padStart(4, '0'),
      accountId: 'ACC_BRW_SEED',
      title: 'إعلان تصفح ' + i + ' — نواكشوط',
      desc: 'وصف ' + i,
      category: 'إلكترونيات',
      cat: 'إلكترونيات',
      wilaya: 'نواكشوط',
      price: String(1500 * i),
      priceNum: 1500 * i,
      status: 'active',
      images: [],
      createdAt: new Date(now - i * 60000).toISOString(),
    };
    await c.query(
      `INSERT INTO ads (id, account_id, status, category, data, updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
      [ad.id, ad.accountId, ad.status, ad.category, JSON.stringify(ad), ad.createdAt]
    );
  }
  await c.end();
}

async function measureCls(page) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      let cls = 0;
      try {
        const po = new PerformanceObserver((list) => {
          list.getEntries().forEach((e) => {
            if (!e.hadRecentInput) cls += e.value;
          });
        });
        po.observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => {
          try { po.disconnect(); } catch (e) {}
          resolve(Number(cls.toFixed(4)));
        }, 2500);
      } catch (e) {
        resolve(-1);
      }
    });
  });
}

async function scrollStress(page, label) {
  const samples = [];
  let suddenDrop = false;
  await page.waitForTimeout(1200);
  // mark user scrolled
  await page.evaluate(() => {
    const body = document.getElementById('result-list-body');
    if (body) body._rizqUserScrolled = true;
  });

  for (let pass = 1; pass <= 3; pass++) {
    let lastY = await page.evaluate(() => {
      const body = document.getElementById('result-list-body');
      const win = window.scrollY || window.pageYOffset || 0;
      const useWin = !body || body.scrollHeight <= body.clientHeight + 4;
      return useWin ? win : body.scrollTop;
    });
    for (let step = 0; step < 40; step++) {
      await page.evaluate(() => {
        const body = document.getElementById('result-list-body');
        const useWin = !body || body.scrollHeight <= body.clientHeight + 4;
        if (useWin) {
          window.scrollBy(0, Math.max(400, Math.floor(window.innerHeight * 0.85)));
        } else {
          body.scrollTop = Math.min(body.scrollHeight, body.scrollTop + Math.max(280, Math.floor(body.clientHeight * 0.85)));
        }
        if (typeof loadMoreAds === 'function') {
          try { loadMoreAds(); } catch (e) {}
        }
      });
      await page.waitForTimeout(120);
      const y = await page.evaluate(() => {
        const body = document.getElementById('result-list-body');
        const win = window.scrollY || window.pageYOffset || 0;
        const useWin = !body || body.scrollHeight <= body.clientHeight + 4;
        return useWin ? win : body.scrollTop;
      });
      samples.push({ pass, step, y });
      // قفزة مفاجئة للأعلى: انخفاض كبير بينما ما زلنا نحو النهاية
      if (lastY > 200 && y < lastY - 180 && y < 80) {
        suddenDrop = true;
      }
      lastY = y;
      const atEnd = await page.evaluate(() => {
        const body = document.getElementById('result-list-body');
        const useWin = !body || body.scrollHeight <= body.clientHeight + 4;
        if (typeof visibleCount !== 'undefined' && typeof filtered !== 'undefined' && visibleCount >= filtered.length) {
          if (useWin) {
            const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight || 0);
            return (window.scrollY + window.innerHeight) >= docH - 40;
          }
          return body.scrollTop + body.clientHeight >= body.scrollHeight - 40;
        }
        return false;
      });
      if (atEnd && step > 2) break;
    }
    // pause between passes at bottom — وحاكِ دمج الخادم/rizq:launch (soft) أثناء البقاء في الأسفل
    await page.evaluate(() => {
      if (typeof applyFilters === 'function') {
        try { applyFilters({ soft: true, skipUrl: true }); } catch (e) {}
      }
    });
    await page.waitForTimeout(350);
    const yAfterSoft = await page.evaluate(() => {
      const body = document.getElementById('result-list-body');
      const win = window.scrollY || window.pageYOffset || 0;
      const useWin = !body || body.scrollHeight <= body.clientHeight + 4;
      return useWin ? win : body.scrollTop;
    });
    samples.push({ pass, step: 'afterSoft', y: yAfterSoft });
    if (lastY > 200 && yAfterSoft < lastY - 180 && yAfterSoft < 80) {
      suddenDrop = true;
    }
    lastY = yAfterSoft;
  }

  const meta = await page.evaluate(() => {
    const body = document.getElementById('result-list-body');
    return {
      cards: body ? body.querySelectorAll('.rc').length : 0,
      visibleCount: typeof visibleCount !== 'undefined' ? visibleCount : -1,
      filtered: typeof filtered !== 'undefined' ? filtered.length : -1,
      scrollTop: body ? body.scrollTop : -1,
      winY: window.scrollY || 0,
      status: ((document.getElementById('rl-infinite') || {}).textContent || '').trim().slice(0, 90),
    };
  });
  return { label, suddenDrop, samplesTail: samples.slice(-6), meta };
}

async function main() {
  loadEnv();
  const testUrl = withDb(process.env.DATABASE_URL, 'rizq_test');
  assertTestDb(testUrl);
  const sharedSnap = snapshotSharedJson();
  {
    const admin = new Client({ connectionString: withDb(process.env.DATABASE_URL, 'postgres') });
    await admin.connect();
    const r = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', ['rizq_test']);
    if (!r.rowCount) await admin.query('CREATE DATABASE rizq_test OWNER CURRENT_USER');
    await admin.end();
  }

  const report = { scroll: [], cls: {} };
  let chromium;
  try {
    chromium = require(path.join(OUT, 'node_modules/playwright')).chromium;
  } catch (e) {
    chromium = require(path.join(ROOT, 'qa/journeys/node_modules/playwright')).chromium;
  }

  async function withServer(adCount, fn) {
    await resetAndMigrate(testUrl);
    await seedAds(testUrl, adCount);
    restoreSharedJson(sharedSnap); // لا تترك data/*.json ملوّثة بعد الزرع
    const child = spawn(process.execPath, ['server.js'], {
      cwd: BACKEND,
      env: Object.assign({}, process.env, {
        DATABASE_URL: testUrl, DB_DRIVER: 'postgres',
        PORT: String(PORT), HOST: '127.0.0.1', NODE_ENV: 'test', OTP_DEV_HINT: 'true', TRUST_PROXY: '1',
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let logs = '';
    child.stdout.on('data', (d) => { logs += d; });
    child.stderr.on('data', (d) => { logs += d; });
    if (!(await waitUp(PORT))) {
      console.error(logs.slice(-800));
      throw new Error('server up failed');
    }
    try {
      await fn();
    } finally {
      try { child.kill('SIGTERM'); } catch (e) {}
      await new Promise((r) => setTimeout(r, 400));
      restoreSharedJson(sharedSnap);
    }
  }

  try {
    const browser = await chromium.launch({ headless: true });

    for (const n of [6, 100]) {
      await withServer(n, async () => {
        for (const width of [1440, 375]) {
          const context = await browser.newContext({
            viewport: { width, height: width <= 400 ? 812 : 900 },
            locale: 'ar',
          });
          const page = await context.newPage();
          const errs = [];
          page.on('pageerror', (e) => errs.push(String(e.message || e)));
          await page.goto('http://127.0.0.1:' + PORT + '/rizq_browse.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
          const result = await scrollStress(page, 'ads' + n + '-w' + width);
          result.consoleErrs = errs.length;
          report.scroll.push(result);
          console.log(JSON.stringify(result));
          await context.close();
        }
      });
    }

    // CLS: landing + browse (reload)
    await withServer(30, async () => {
      for (const [name, url] of [
        ['landing', '/rizq_landing_v8.html'],
        ['browse', '/rizq_browse.html'],
      ]) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' });
        const page = await context.newPage();
        await page.addInitScript(() => {
          try { localStorage.removeItem('rizq_launch_cache_v1'); } catch (e) {}
        });
        await page.goto('http://127.0.0.1:' + PORT + url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const cls1 = await measureCls(page);
        await page.reload({ waitUntil: 'domcontentloaded' });
        const cls2 = await measureCls(page);
        const yAfter = await page.evaluate(() => window.scrollY || 0);
        report.cls[name] = { firstLoad: cls1, afterReload: cls2, scrollYAfterReload: yAfter };
        console.log('CLS', name, report.cls[name]);
        await context.close();
      }
    });

    await browser.close();
  } finally {
    restoreSharedJson(sharedSnap);
    try {
      const c = new Client({ connectionString: testUrl });
      await c.connect();
      await c.query('DROP SCHEMA IF EXISTS public CASCADE');
      await c.query('CREATE SCHEMA public');
      await c.end();
    } catch (e) {}
    // تأكيد عدم تلويث rizq_audit
    try {
      const auditUrl = withDb(process.env.DATABASE_URL, 'rizq_audit');
      const ac = new Client({ connectionString: auditUrl });
      await ac.connect();
      const brw = await ac.query("SELECT count(*)::int AS n FROM ads WHERE id LIKE 'BRW_%'");
      await ac.end();
      report.auditBrwAfter = brw.rows[0].n;
      if (brw.rows[0].n > 0) throw new Error('POLLUTED rizq_audit with BRW_ ads: ' + brw.rows[0].n);
    } catch (e) {
      if (String(e.message || e).includes('POLLUTED')) throw e;
    }
  }

  const scrollFail = report.scroll.filter((r) => r.suddenDrop);
  const clsFail = Object.values(report.cls).some((c) => c.afterReload >= 0.1);
  report.ok = scrollFail.length === 0 && !clsFail;
  fs.writeFileSync(path.join(OUT, 'scroll-cls-report.json'), JSON.stringify(report, null, 2));
  console.log('\nREPORT ok=', report.ok, 'scrollFails=', scrollFail.length, 'auditBrw=', report.auditBrwAfter);
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
