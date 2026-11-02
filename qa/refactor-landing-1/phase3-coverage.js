#!/usr/bin/env node
'use strict';
/**
 * Phase 3: CSS/JS coverage across viewports + langs + basic interactions.
 * Writes unused candidates; deletion is applied only after repo-wide search.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(__dirname, 'coverage');
const WIDTHS = [390, 768, 1440];
const LANGS = ['ar', 'fr'];

function loadPlaywright() {
  return require(path.join(__dirname, 'node_modules/playwright'));
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, 'http://127.0.0.1');
        let rel = decodeURIComponent(u.pathname);
        if (rel === '/') rel = '/rizq_landing_v8.html';
        const fp = path.normalize(path.join(ROOT, rel.replace(/^\//, '')));
        if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
          res.writeHead(404); res.end('x'); return;
        }
        res.writeHead(200); fs.createReadStream(fp).pipe(res);
      } catch (e) {
        res.writeHead(500); res.end(String(e));
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, base: 'http://127.0.0.1:' + server.address().port }));
    server.on('error', reject);
  });
}

async function interact(page) {
  const clicks = [
    'button, a, [role="tab"], .cat-card, .nav-link, .rmh-link',
  ];
  try {
    // tabs / category cards
    const cats = page.locator('.cat-card, [data-cat], .qcat-item, .style-tab, .srm-tab');
    const n = Math.min(await cats.count(), 4);
    for (let i = 0; i < n; i++) {
      await cats.nth(i).click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(150);
    }
    // search focus
    const search = page.locator('input[type="search"], #hero-search, input[placeholder*="بحث"], input[placeholder*="Cherch"]').first();
    if (await search.count()) {
      await search.click({ timeout: 1000 }).catch(() => {});
      await search.fill('سيارة').catch(() => {});
    }
    // open a modal if possible
    await page.locator('[onclick*="openModal"], [onclick*="openPkg"], .open-login, #nav-login').first()
      .click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape').catch(() => {});
    // mobile menu
    await page.locator('#nav-hamburger, .nav-hamburger, [aria-label*="menu"]').first()
      .click({ timeout: 800 }).catch(() => {});
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape').catch(() => {});
  } catch (_) {}
}

async function main() {
  const { chromium } = loadPlaywright();
  const { server, base } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  fs.mkdirSync(OUT, { recursive: true });

  const cssUnused = new Map(); // url -> Set of ranges or text
  const jsUnused = new Map();
  const cssUsed = new Map();
  const jsUsed = new Map();

  try {
    for (const lang of LANGS) {
      for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.coverage.startCSSCoverage({ resetOnNavigation: true });
        await page.coverage.startJSCoverage({ resetOnNavigation: true });
        await page.addInitScript((lng) => {
          try { localStorage.setItem('rizq_lang', lng); localStorage.setItem('rizq_terms_accepted', '1'); } catch (_) {}
        }, lang);
        await page.goto(base + '/rizq_landing_v8.html?visualGate=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(600);
        if (lang === 'fr') {
          await page.evaluate(() => {
            try { if (typeof applyLandingLang === 'function') applyLandingLang(false); } catch (_) {}
          });
        }
        await interact(page);
        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(300);
        const css = await page.coverage.stopCSSCoverage();
        const js = await page.coverage.stopJSCoverage();
        css.forEach((entry) => {
          if (!/rizq_landing/.test(entry.url) && !/landing-/.test(entry.url)) return;
          const key = entry.url.replace(/^https?:\/\/[^/]+/, '');
          const used = cssUsed.get(key) || new Set();
          (entry.ranges || []).forEach((r) => {
            for (let i = r.start; i < r.end; i++) used.add(i);
          });
          cssUsed.set(key, used);
          cssUnused.set(key, entry.text || '');
        });
        js.forEach((entry) => {
          if (!/landing-/.test(entry.url)) return;
          const key = entry.url.replace(/^https?:\/\/[^/]+/, '');
          const used = jsUsed.get(key) || new Set();
          (entry.ranges || []).forEach((r) => {
            for (let i = r.start; i < r.end; i++) used.add(i);
          });
          jsUsed.set(key, used);
          jsUnused.set(key, entry.text || '');
        });
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  function unusedPercent(text, usedSet) {
    if (!text) return 0;
    let unused = 0;
    for (let i = 0; i < text.length; i++) if (!usedSet.has(i)) unused++;
    return (unused / text.length) * 100;
  }

  const report = { css: [], js: [] };
  for (const [url, text] of cssUnused) {
    const used = cssUsed.get(url) || new Set();
    report.css.push({ url, bytes: text.length, unusedPct: +unusedPercent(text, used).toFixed(2) });
  }
  for (const [url, text] of jsUnused) {
    const used = jsUsed.get(url) || new Set();
    report.js.push({ url, bytes: text.length, unusedPct: +unusedPercent(text, used).toFixed(2) });
  }
  report.css.sort((a, b) => b.unusedPct - a.unusedPct);
  report.js.sort((a, b) => b.unusedPct - a.unusedPct);
  fs.writeFileSync(path.join(OUT, 'coverage-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, css: report.css.slice(0, 8), js: report.js.slice(0, 8) }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
