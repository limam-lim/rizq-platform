#!/usr/bin/env node
/** لقطات إصلاح مراجعة الباقات + العرض الموسمي عند 412 و1440 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

function loadPlaywright() {
  const candidates = [
    path.join(__dirname, 'node_modules/playwright'),
    path.join(__dirname, '..', 'ui-logic-1', 'node_modules/playwright'),
    path.join(__dirname, '..', 'journeys', 'node_modules/playwright'),
    'playwright',
  ];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* */ }
  }
  throw new Error('playwright not found');
}
const { chromium } = loadPlaywright();

const ROOT = path.join(__dirname, '..', '..');
const outDir = process.argv[2] || '/opt/cursor/artifacts';
fs.mkdirSync(outDir, { recursive: true });

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      const file = path.join(ROOT, url.replace(/^\//, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('no'); return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = {
        '.html': 'text/html;charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.woff2': 'font/woff2',
      };
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ base: 'http://127.0.0.1:' + server.address().port, stop: () => new Promise((r) => server.close(() => r())) });
    });
  });
}

async function shotVisible(page, selector, file) {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.style.display = 'block';
    el.style.visibility = 'visible';
    el.style.opacity = '1';
    el.hidden = false;
    el.scrollIntoView({ block: 'start' });
  }, selector);
  await page.waitForTimeout(400);
  const box = await page.$eval(selector, (el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height, t: r.top, visible: !!(r.width && r.height) };
  }).catch(() => null);
  if (box && box.visible && box.h > 40) {
    await page.locator(selector).screenshot({ path: file, timeout: 15000 }).catch(async () => {
      await page.screenshot({ path: file, fullPage: true });
    });
  } else {
    await page.screenshot({ path: file, fullPage: true });
  }
  console.log('wrote', file, box);
}

(async () => {
  const srv = await startServer();
  const browser = await chromium.launch({ headless: true });

  for (const vp of [
    { w: 412, h: 920, tag: '412' },
    { w: 1440, h: 900, tag: '1440' },
  ]) {
    /* Admin packages */
    const admin = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await admin.addInitScript(() => {
      localStorage.setItem('rizq_individual_packages', JSON.stringify([
        { id: 'ind-free', price: 0, active: true },
        { id: 'ind-boost', price: 300, name: '', active: true },
        { id: 'ind-medium', price: 1000, name: '   ', period: '', active: true },
        { id: 'ind-monthly', price: 2000, active: true },
      ]));
    });
    await admin.goto(srv.base + '/rizq_cp_panel.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await admin.waitForTimeout(600);
    await admin.evaluate(() => {
      const ls = document.getElementById('login-screen');
      if (ls) ls.style.display = 'none';
      document.querySelectorAll('.panel').forEach((p) => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      const panel = document.getElementById('panel-packages');
      if (panel) {
        panel.classList.add('active');
        panel.style.display = 'block';
        panel.style.visibility = 'visible';
      }
      const main = document.querySelector('.main') || document.querySelector('main') || document.getElementById('main-content');
      if (main) { main.style.display = 'block'; main.style.visibility = 'visible'; }
      if (typeof switchPkgCat === 'function') switchPkgCat('individual');
      else if (typeof renderPackages === 'function') renderPackages();
    });
    await admin.waitForTimeout(700);
    const names = await admin.evaluate(() =>
      Array.from(document.querySelectorAll('#packages-grid .pkg-name-input')).map((i) => i.value)
    );
    console.log('admin names', vp.tag, names);
    await shotVisible(admin, '#packages-grid', path.join(outDir, 'review-admin-pkgs-' + vp.tag + '.png'));
    await admin.close();

    /* Store subscription */
    const store = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    store.on('pageerror', (e) => console.log('PAGEERR', e.message));
    await store.goto(srv.base + '/rizq_dashboard_store.html?demo=1&id=demo_store', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await store.waitForTimeout(1800);
    const forced = await store.evaluate(() => {
      window.getSubInfo = function () {
        return { daysLeft: 0, isTrial: false, isExpired: true, isExpiringSoon: false, pct: 0, pkgName: '' };
      };
      document.querySelectorAll('.panel').forEach((p) => {
        p.classList.remove('active');
        p.style.display = 'none';
      });
      const panel = document.getElementById('panel-subscription');
      if (panel) {
        panel.classList.add('active');
        panel.style.display = 'block';
        panel.style.visibility = 'visible';
      }
      if (typeof renderSubscriptionPanel === 'function') renderSubscriptionPanel();
      window.__rizqSeasonalOffer = {
        titleAr: 'عرض الربيع',
        percent: 30,
        daysLeft: 5,
        packageIds: ['st-month', 'st-year'],
      };
      const mount = document.getElementById('seasonal-offer-card');
      if (mount && window.RizqSub) {
        const names2 = RizqSub.resolvePackageDisplayNames(['st-month', 'st-year'], 'ar');
        const daysTxt = RizqSub.formatOfferDaysLeft(5, 'ar');
        mount.style.display = 'block';
        mount.textContent = '';
        const card = document.createElement('div');
        card.style.cssText = 'background:linear-gradient(135deg,#0f2347,#1B3A6B);color:#fff;border-radius:14px;padding:16px 18px;margin-bottom:12px';
        const h = document.createElement('div');
        h.style.cssText = 'font-size:15px;font-weight:800;margin-bottom:6px';
        h.textContent = 'عرض الربيع';
        const p = document.createElement('div');
        p.style.cssText = 'font-size:13px;opacity:.92';
        p.textContent = 'خصم 30% · ينتهي بعد ' + daysTxt;
        const meta = document.createElement('div');
        meta.style.cssText = 'font-size:11px;opacity:.75;margin-top:8px';
        meta.textContent = 'الباقات: ' + names2.join(' · ');
        card.appendChild(h); card.appendChild(p); card.appendChild(meta);
        mount.appendChild(card);
      }
      if (typeof renderPackagesDisplay === 'function') renderPackagesDisplay();
      const list = (window.RizqPackagesConfig && RizqPackagesConfig.getCatalog)
        ? RizqPackagesConfig.getCatalog('store', 'ar') : [];
      if (window.RizqSub && RizqSub.applySeasonalStrikethrough) {
        RizqSub.applySeasonalStrikethrough(document.getElementById('packages-display'), list);
      }
      const subText = (document.getElementById('sub-card-wrap') || {}).innerText || '';
      return {
        hasRender: typeof renderPackagesDisplay === 'function',
        cards: document.querySelectorAll('#packages-display .rpkg-card').length,
        ended: (subText.match(/انتهى الاشتراك/g) || []).length,
        current: ((document.getElementById('packages-display') || {}).innerText || '').indexOf('الباقة الحالية') >= 0,
        strike: Array.from(document.querySelectorAll('#packages-display .pkg-price')).map((e) => e.innerText).slice(0, 3),
        pkgNames: window.RizqSub ? RizqSub.resolvePackageDisplayNames(['st-month', 'st-year'], 'ar') : [],
        days: window.RizqSub ? RizqSub.formatOfferDaysLeft(5, 'ar') : '',
      };
    });
    console.log('store', vp.tag, forced);
    await shotVisible(store, '#panel-subscription', path.join(outDir, 'review-store-sub-' + vp.tag + '.png'));
    await store.close();
  }

  await browser.close();
  await srv.stop();
  console.log('done');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
