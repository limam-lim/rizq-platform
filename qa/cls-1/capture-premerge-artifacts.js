#!/usr/bin/env node
/**
 * لقطات قبل/بعد البصرية + عيّنة fadeUp (opacity/transform)
 * 390/1440 × ar/fr — العناصر 2/4/5/6/7/8
 *
 * OUT=/opt/cursor/artifacts/fix-ui-cls/premerge node qa/cls-1/capture-premerge-artifacts.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const OUT = process.env.OUT || path.join('/opt/cursor/artifacts/fix-ui-cls/premerge');
const BASE = process.env.BASE_URL || '';

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
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const VIEWPORTS = [
  { w: 390, h: 844 },
  { w: 1440, h: 900 },
];
const LANGS = ['ar', 'fr'];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.join(OUT, 'fadeup'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'visuals'), { recursive: true });

  const { chromium } = loadPlaywright();
  let server = null;
  let origin = BASE;
  if (!origin) {
    server = await startStatic();
    origin = 'http://127.0.0.1:' + server.address().port;
  }
  /* استخدم خادم التطبيق إن وُجد لبيانات أغنى */
  if (!BASE) {
    try {
      const live = await new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:3000/rizq_landing_v8.html', (res) => {
          res.resume();
          resolve(res.statusCode === 200 ? 'http://127.0.0.1:3000' : null);
        });
        req.on('error', () => resolve(null));
        req.setTimeout(800, () => { try { req.destroy(); } catch (e) {} resolve(null); });
      });
      if (live) origin = live;
    } catch (e) { /* */ }
  }

  const browser = await chromium.launch({ headless: true });
  const manifest = { origin, shots: [], fadeUp: null, ticker: null };

  for (const lang of LANGS) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        locale: lang === 'fr' ? 'fr-FR' : 'ar-MR',
      });
      const page = await context.newPage();
      await page.addInitScript((L) => {
        try {
          localStorage.setItem('rizq_lang', L);
          document.cookie = 'rizq_lang=' + L + ';path=/;max-age=31536000';
          /* تيكر فارغ لإظهار الدعوة */
          localStorage.setItem('rizq_civic_ticker_v1', '[]');
        } catch (e) {}
      }, lang);

      await page.goto(origin + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForTimeout(1800);

      const tag = lang + '_' + vp.w;

      /* —— fadeUp: لقطتان أثناء الحركة (مبكر + بعد اكتمال) —— */
      if (lang === 'ar' && vp.w === 1440) {
        await page.reload({ waitUntil: 'commit', timeout: 60000 });
        await page.waitForTimeout(120);
        const earlyPath = path.join(OUT, 'fadeup', 'fadeup-early-1440-ar.png');
        await page.screenshot({ path: earlyPath, fullPage: false });
        const mid = await page.evaluate(() => {
          const el = document.querySelector('.hero-eyebrow, .hero-headline, .hero-brand-row');
          if (!el) return null;
          const cs = getComputedStyle(el);
          return {
            opacity: cs.opacity,
            transform: cs.transform,
            animationName: cs.animationName,
            animationDuration: cs.animationDuration,
          };
        });
        await page.waitForTimeout(1000);
        const latePath = path.join(OUT, 'fadeup', 'fadeup-settled-1440-ar.png');
        await page.screenshot({ path: latePath, fullPage: false });
        const late = await page.evaluate(() => {
          const el = document.querySelector('.hero-eyebrow, .hero-headline, .hero-brand-row');
          if (!el) return null;
          const cs = getComputedStyle(el);
          return { opacity: cs.opacity, transform: cs.transform, animationName: cs.animationName };
        });
        manifest.fadeUp = { early: mid, late, earlyPath, latePath };
        fs.writeFileSync(path.join(OUT, 'fadeup', 'fadeup-metrics.json'), JSON.stringify(manifest.fadeUp, null, 2));
      }

      /* تيكر الدعوة */
      if (lang === 'ar' && vp.w === 390) {
        const tickerInfo = await page.evaluate(() => {
          const w = document.getElementById('ticker-wrap');
          if (!w) return null;
          return {
            classes: w.className,
            text: (w.innerText || '').trim().slice(0, 120),
            height: Math.round(w.getBoundingClientRect().height),
            display: getComputedStyle(w).display,
          };
        });
        const tPath = path.join(OUT, 'visuals', 'ticker-invite-390-ar.png');
        await page.locator('#rizq-mock-hdr').screenshot({ path: tPath }).catch(async () => {
          await page.screenshot({ path: tPath, clip: { x: 0, y: 0, width: 390, height: 220 } });
        });
        manifest.ticker = Object.assign({ path: tPath }, tickerInfo || {});
      }

      /* لقطة فوق الطية */
      const heroPath = path.join(OUT, 'visuals', 'hero_' + tag + '.png');
      await page.screenshot({ path: heroPath, fullPage: false });
      manifest.shots.push({ kind: 'hero', lang, w: vp.w, path: heroPath });

      /* 2 placeholders — أنماط / شبكة إن وُجدت صور مكسورة نُظهر البلاطة */
      await page.evaluate(() => {
        const el = document.getElementById('rizq-styles') || document.getElementById('hero-listings');
        if (el) el.scrollIntoView({ block: 'start' });
      });
      await page.waitForTimeout(600);
      const stylesPath = path.join(OUT, 'visuals', 'styles_' + tag + '.png');
      await page.screenshot({ path: stylesPath, fullPage: false });
      manifest.shots.push({ kind: 'styles-2-8', lang, w: vp.w, path: stylesPath });

      /* 4 FAB clearance — أسفل شريط البطاقات */
      const fabPath = path.join(OUT, 'visuals', 'fab-clearance_' + tag + '.png');
      await page.evaluate(() => {
        const el = document.getElementById('hero-listings') || document.querySelector('.cards-track-wrap');
        if (el) el.scrollIntoView({ block: 'end' });
        window.scrollBy(0, 40);
      });
      await page.waitForTimeout(400);
      await page.screenshot({ path: fabPath, fullPage: false });
      manifest.shots.push({ kind: 'fab-4', lang, w: vp.w, path: fabPath });

      /* 5 scroll-margin targets */
      for (const id of ['rizq-styles', 'rizq-showroom-models']) {
        const exists = await page.evaluate((i) => !!document.getElementById(i), id);
        if (!exists) continue;
        await page.evaluate((i) => {
          location.hash = i;
          const el = document.getElementById(i);
          if (el) el.scrollIntoView();
        }, id);
        await page.waitForTimeout(350);
        const p = path.join(OUT, 'visuals', 'scroll-' + id + '_' + tag + '.png');
        await page.screenshot({ path: p, fullPage: false });
        manifest.shots.push({ kind: 'scroll-5', id, lang, w: vp.w, path: p });
      }

      /* 6 bidi price / CTA — تكبير بطاقة نمط */
      const card = page.locator('.rizq-style-card').first();
      if (await card.count()) {
        const bidiPath = path.join(OUT, 'visuals', 'bidi-cta_' + tag + '.png');
        await card.screenshot({ path: bidiPath }).catch(() => {});
        manifest.shots.push({ kind: 'bidi-6', lang, w: vp.w, path: bidiPath });
      }

      await context.close();
    }
  }

  /* انسخ لقطات visual-diff القديمة كـ "قبل" إن وُجدت */
  const vd = path.join(ROOT, 'qa/visual-diff');
  const beforeDir = path.join(OUT, 'before');
  fs.mkdirSync(beforeDir, { recursive: true });
  if (fs.existsSync(vd)) {
    for (const lang of LANGS) {
      for (const w of [390, 1440]) {
        const old = path.join(vd, 'rizq_landing_v8__' + lang + '__' + w + '__old.png');
        const neu = path.join(vd, 'rizq_landing_v8__' + lang + '__' + w + '__new.png');
        if (fs.existsSync(old)) {
          const dest = path.join(beforeDir, 'landing_' + lang + '_' + w + '_old.png');
          fs.copyFileSync(old, dest);
          manifest.shots.push({ kind: 'before-baseline', lang, w, path: dest });
        }
        if (fs.existsSync(neu)) {
          const dest = path.join(beforeDir, 'landing_' + lang + '_' + w + '_prev-new.png');
          fs.copyFileSync(neu, dest);
        }
      }
    }
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Wrote', OUT, 'shots=', manifest.shots.length);
  await browser.close();
  if (server) server.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
