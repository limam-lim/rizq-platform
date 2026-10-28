#!/usr/bin/env node
'use strict';
/**
 * Fair visual compare: both LIVE servers, same fixture, animations disabled, dynamics masked.
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const sharp = require('sharp');

const OLD = process.env.OLD_BASE || 'http://127.0.0.1:3001';
const NEW = process.env.NEW_BASE || 'http://127.0.0.1:3000';
const OUT_OLD = '/opt/cursor/artifacts/visual-parity-old';
const OUT_NEW = '/opt/cursor/artifacts/visual-parity-new';
const REPORT = '/opt/cursor/artifacts/visual-parity-report.json';
const THRESHOLD = 0.5;

fs.mkdirSync(OUT_OLD, { recursive: true });
fs.mkdirSync(OUT_NEW, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = [
  'rizq_landing_v8.html', 'rizq_browse.html', 'rizq_store.html', 'rizq_office.html', 'rizq_corp.html',
  'rizq_estate.html', 'rizq_estate_agencies.html', 'rizq_showroom.html', 'rizq_directory.html',
  'rizq_products.html', 'rizq_post.html', 'rizq_register.html', 'rizq_search.html', 'rizq_help.html',
  'rizq_legal.html', 'rizq_about.html', 'rizq_cart.html', 'rizq_favorites.html', 'rizq_profile.html',
  'rizq_tenders.html', 'rizq_investments.html', 'rizq_market_pulse.html', 'rizq_ads_info.html',
  'rizq_platform.html', 'rizq_dashboard.html', 'rizq_dashboard_store.html', 'rizq_dashboard_office.html',
  'rizq_dashboard_corp.html', 'rizq_dashboard_estate.html', 'rizq_listing.html',
  'rizq_showroom_directory.html', 'rizq_estate_directory.html', 'rizq_tenders_directory.html',
  'rizq_investments_directory.html', 'index.html', 'rizq_real_estate_register.html',
];
const LANGS = ['ar', 'fr'];
const SIZES = [{ w: 390, h: 844, label: '390' }, { w: 1440, h: 900, label: '1440' }];

const MASK_CSS = `
*{animation:none!important;transition:none!important;caret-color:transparent!important}
.rizq-live-dot,.live-dot,[class*="pulse"],[class*="ticker"],[class*="marquee"],
[class*="carousel"] img,[class*="ad-card"] img,[class*="card"] img,img,
[data-ticker],.civic-ticker,.rizq-civic-ticker,
video,iframe,canvas{visibility:hidden!important}
[class*="clock"],[class*="countdown"],time{visibility:hidden!important}
/* neutralize external image layout flicker */
img{opacity:0!important}
`;

async function shoot(browser, base, outDir) {
  const page = await browser.newPage();
  const manifest = [];
  for (const file of PAGES) {
    for (const lang of LANGS) {
      for (const sz of SIZES) {
        const name = `${file.replace(/\.html$/, '')}__${lang}__${sz.label}.png`;
        const outPath = path.join(outDir, name);
        try {
          await page.setViewport({ width: sz.w, height: sz.h, deviceScaleFactor: 1 });
          await page.goto(`${base}/${file}?lang=${lang}`, { waitUntil: 'networkidle2', timeout: 60000 });
          await page.evaluate((l, css) => {
            try {
              localStorage.setItem('rizq_lang', l);
              localStorage.setItem('lang', l);
              document.documentElement.lang = l;
              document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
            } catch (e) {}
            const s = document.createElement('style');
            s.textContent = css;
            document.documentElement.appendChild(s);
            // freeze time-ish text nodes that look like clocks HH:MM
            document.querySelectorAll('*').forEach((el) => {
              if (el.children.length === 0 && /\b\d{1,2}:\d{2}(:\d{2})?\b/.test(el.textContent || '')) {
                el.style.visibility = 'hidden';
              }
            });
          }, lang, MASK_CSS);
          await sleep(300);
          await page.screenshot({ path: outPath, fullPage: false });
          manifest.push({ name, ok: true });
          process.stdout.write('.');
        } catch (e) {
          manifest.push({ name, ok: false, error: String(e.message || e) });
          process.stdout.write('x');
        }
      }
    }
  }
  await page.close();
  return manifest;
}

async function pixelPct(aPath, bPath) {
  const [ia, ib] = await Promise.all([
    sharp(aPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(bPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (ia.info.width !== ib.info.width || ia.info.height !== ib.info.height) {
    return { pct: 100, sizeMismatch: true };
  }
  const A = ia.data; const B = ib.data;
  let diff = 0;
  for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) diff++;
  return { pct: +(100 * diff / A.length).toFixed(4) };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
  console.log('\nOLD shots');
  const mOld = await shoot(browser, OLD, OUT_OLD);
  console.log('\nNEW shots');
  const mNew = await shoot(browser, NEW, OUT_NEW);
  await browser.close();

  const names = mNew.filter((m) => m.ok).map((m) => m.name);
  const rows = [];
  for (const name of names) {
    const a = path.join(OUT_OLD, name);
    const b = path.join(OUT_NEW, name);
    if (!fs.existsSync(a)) { rows.push({ name, pct: 100, missingOld: true }); continue; }
    const r = await pixelPct(a, b);
    rows.push({ name, ...r });
  }
  rows.sort((a, b) => b.pct - a.pct);
  const above = rows.filter((r) => r.pct > THRESHOLD);
  const report = {
    threshold: THRESHOLD,
    compared: rows.length,
    within: rows.filter((r) => r.pct <= THRESHOLD).length,
    above: above.length,
    aboveList: above,
    top: rows.slice(0, 25),
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log('\nCOMPARED', report.compared, 'within', report.within, 'above', report.above);
  if (above.length) {
    console.log('ABOVE 0.5%:');
    above.slice(0, 40).forEach((r) => console.log(' ', r.pct + '%', r.name));
  }
  process.exitCode = above.length ? 2 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
