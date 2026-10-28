#!/usr/bin/env node
'use strict';
/**
 * Focused retake: market_pulse + office only.
 * - Fresh browser context per (base, lang) so rizq_lang cannot stick across shots
 * - Seed language BEFORE first document via evaluateOnNewDocument
 * - Assert visible language before screenshot
 * - Office: networkidle + 2s + wait for images; do NOT blank hero <img>
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const sharp = require('sharp');

const OLD = process.env.OLD_BASE || 'http://127.0.0.1:3001';
const NEW = process.env.NEW_BASE || 'http://127.0.0.1:3000';
const OUT = '/opt/cursor/artifacts/retake-pulse-office';
const QA = '/workspace/qa/visual-diff';
const REPORT = '/opt/cursor/artifacts/retake-pulse-office-report.json';

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(QA, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LIGHT_MASK = `
*{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}
.rizq-live-dot,.live-dot,[class*="pulse"]:not(.mp-trend),[class*="ticker"],[class*="marquee"],
[data-ticker],.civic-ticker,.rizq-civic-ticker,video,iframe,canvas{visibility:hidden!important}
`;

async function seedLang(page, lang) {
  await page.evaluateOnNewDocument((l) => {
    try {
      localStorage.setItem('rizq_lang', l);
      localStorage.setItem('lang', l);
    } catch (e) {}
  }, lang);
}

async function waitImages(page, timeoutMs) {
  await page.evaluate(async (ms) => {
    const deadline = Date.now() + ms;
    const imgs = Array.from(document.images || []);
    await Promise.all(imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, Math.max(0, deadline - Date.now()));
      });
    }));
  }, timeoutMs);
}

function expectPulseLang(info, lang) {
  const ar = /[\u0600-\u06FF]/.test(info.title || '');
  const fr = /Pouls|Denrées|Récent|Marché/i.test((info.title || '') + (info.sub || ''));
  if (lang === 'ar') return ar && !fr && info.htmlLang === 'ar' && info.ls === 'ar';
  return fr && !ar && info.htmlLang === 'fr' && info.ls === 'fr';
}

async function shotPulse(browser, base, tag, lang, size) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await seedLang(page, lang);
  await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: 1 });
  // about:blank first so init script binds before first origin document
  await page.goto('about:blank');
  await page.goto(`${base}/rizq_market_pulse.html?lang=${lang}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate((l) => {
    try {
      localStorage.setItem('rizq_lang', l);
      localStorage.setItem('lang', l);
      if (window.RizqI18n && typeof RizqI18n.apply === 'function') RizqI18n.apply(l);
      document.documentElement.lang = l;
      document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
      document.dispatchEvent(new CustomEvent('rizq:langchange', { bubbles: true, detail: { lang: l } }));
    } catch (e) {}
  }, lang);
  await sleep(400);
  const info = await page.evaluate(() => ({
    title: (document.getElementById('mp-title') || {}).innerText || '',
    sub: ((document.getElementById('mp-sub') || {}).innerText || '').slice(0, 100),
    htmlLang: document.documentElement.lang,
    ls: localStorage.getItem('rizq_lang'),
    i18n: window.RizqI18n && RizqI18n.getLang && RizqI18n.getLang(),
  }));
  const ok = expectPulseLang(info, lang);
  if (!ok) {
    // one hard reload with storage already set
    await page.reload({ waitUntil: 'networkidle2', timeout: 90000 });
    await page.evaluate((l) => {
      if (window.RizqI18n && typeof RizqI18n.apply === 'function') RizqI18n.apply(l);
      document.dispatchEvent(new CustomEvent('rizq:langchange', { bubbles: true, detail: { lang: l } }));
    }, lang);
    await sleep(400);
  }
  const info2 = await page.evaluate(() => ({
    title: (document.getElementById('mp-title') || {}).innerText || '',
    sub: ((document.getElementById('mp-sub') || {}).innerText || '').slice(0, 100),
    htmlLang: document.documentElement.lang,
    ls: localStorage.getItem('rizq_lang'),
    i18n: window.RizqI18n && RizqI18n.getLang && RizqI18n.getLang(),
  }));
  await page.evaluate((css) => {
    const s = document.createElement('style');
    s.id = 'parity-light-mask';
    s.textContent = css;
    document.documentElement.appendChild(s);
    window.scrollTo(0, 0);
  }, LIGHT_MASK);
  await sleep(300);
  const name = `rizq_market_pulse__${lang}__${size.label}.png`;
  const file = path.join(OUT, `${tag}__${name}`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  return { page: name, tag, lang, size: size.label, ok: expectPulseLang(info2, lang), info: info2, file };
}

async function shotOffice(browser, base, tag, lang, size) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await seedLang(page, lang);
  await page.setViewport({ width: size.w, height: size.h, deviceScaleFactor: 1 });
  // Block auto-scroll to service desk so hero stays in view for fair compare
  await page.evaluateOnNewDocument(() => {
    const stop = function () { /* blocked for parity shot */ };
    window.scrollTo = stop;
    window.scroll = stop;
    Element.prototype.scrollIntoView = stop;
  });
  await page.goto('about:blank');
  await page.goto(`${base}/rizq_office.html?lang=${lang}`, { waitUntil: 'networkidle2', timeout: 90000 });
  await page.evaluate((l) => {
    try {
      localStorage.setItem('rizq_lang', l);
      localStorage.setItem('lang', l);
      if (window.RizqI18n && typeof RizqI18n.apply === 'function') RizqI18n.apply(l);
      document.documentElement.lang = l;
      document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
      document.dispatchEvent(new CustomEvent('rizq:langchange', { bubbles: true, detail: { lang: l } }));
    } catch (e) {}
  }, lang);
  // Required: networkidle already done + 2s + images
  await sleep(2000);
  await waitImages(page, 8000);
  // Restore scrollTo only to pin top, then freeze again
  await page.evaluate(() => {
    try {
      document.querySelectorAll('.promo-overlay.active').forEach((el) => el.classList.remove('active'));
      document.querySelectorAll('.disc-modal').forEach((el) => { el.style.display = 'none'; });
    } catch (e) {}
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  });
  await sleep(300);
  await page.evaluate((css) => {
    const s = document.createElement('style');
    s.id = 'parity-light-mask';
    s.textContent = css;
    document.documentElement.appendChild(s);
  }, LIGHT_MASK);
  // Wait until hero photo is painted in the top viewport
  await page.waitForFunction(() => {
    const photo = document.querySelector('.office-hero .hero-photo img');
    const hero = document.querySelector('.office-hero');
    if (!photo || !hero) return false;
    const pr = photo.getBoundingClientRect();
    return photo.complete && photo.naturalWidth > 0 && window.scrollY < 8 && pr.top < 200 && pr.height > 80;
  }, { timeout: 10000 }).catch(() => {});
  const media = await page.evaluate(() => {
    const hero = document.querySelector('.office-hero');
    const photo = document.querySelector('.office-hero .hero-photo img');
    const hr = hero ? hero.getBoundingClientRect() : null;
    const pr = photo ? photo.getBoundingClientRect() : null;
    const share = document.getElementById('act-share-btn');
    return {
      scrollY: window.scrollY,
      heroHasPhoto: !!(hero && hero.classList.contains('has-hero-photo')),
      photoSrc: photo && (photo.currentSrc || photo.src || '').slice(0, 140),
      photoNatural: photo ? [photo.naturalWidth, photo.naturalHeight] : null,
      heroTop: hr && Math.round(hr.top),
      heroHeight: hr && Math.round(hr.height),
      photoVisible: !!(pr && pr.height > 40 && pr.top < window.innerHeight && pr.bottom > 0),
      shareVisible: !!(share && share.getBoundingClientRect().height > 0 && share.getBoundingClientRect().top < window.innerHeight),
      title: ((document.querySelector('.office-name, h1') || {}).innerText || '').slice(0, 80),
    };
  });
  const name = `rizq_office__${lang}__${size.label}.png`;
  const file = path.join(OUT, `${tag}__${name}`);
  await page.screenshot({ path: file, fullPage: false });
  await context.close();
  return { page: name, tag, lang, size: size.label, media, file };
}

async function sideBySide(oldPath, newPath, outPath) {
  const maxW = 420;
  const left = await sharp(oldPath).resize({ width: maxW, withoutEnlargement: true }).png().toBuffer();
  const right = await sharp(newPath).resize({ width: maxW, withoutEnlargement: true }).png().toBuffer();
  const ml = await sharp(left).metadata();
  const mr = await sharp(right).metadata();
  const h = Math.max(ml.height, mr.height);
  await sharp({
    create: { width: ml.width + mr.width + 12, height: h, channels: 3, background: { r: 20, g: 24, b: 36 } },
  }).composite([
    { input: left, left: 0, top: 0 },
    { input: right, left: ml.width + 12, top: 0 },
  ]).png().toFile(outPath);
}

async function highlightDiff(oldPath, newPath, outPath) {
  const [ia, ib] = await Promise.all([
    sharp(oldPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(newPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  const { width, height, channels } = ia.info;
  const A = ia.data; const B = ib.data;
  const diff = Buffer.alloc(A.length);
  let changed = 0;
  for (let i = 0; i < A.length; i += channels) {
    let d = false;
    for (let c = 0; c < 3; c++) if (Math.abs(A[i + c] - B[i + c]) > 8) d = true;
    if (d) {
      changed++;
      diff[i] = 255; diff[i + 1] = 0; diff[i + 2] = 180; diff[i + 3] = 255;
    } else {
      diff[i] = Math.floor(B[i] * 0.4);
      diff[i + 1] = Math.floor(B[i + 1] * 0.4);
      diff[i + 2] = Math.floor(B[i + 2] * 0.4);
      diff[i + 3] = 255;
    }
  }
  const pct = +(100 * changed / (width * height)).toFixed(4);
  await sharp(diff, { raw: { width, height, channels } })
    .resize({ width: 420, withoutEnlargement: true })
    .png().toFile(outPath);
  return pct;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const sizes = [{ w: 390, h: 844, label: '390' }];
  const results = [];

  for (const lang of ['ar', 'fr']) {
    for (const sz of sizes) {
      results.push(await shotPulse(browser, OLD, 'old', lang, sz));
      results.push(await shotPulse(browser, NEW, 'new', lang, sz));
    }
  }
  for (const lang of ['ar']) {
    for (const sz of sizes) {
      results.push(await shotOffice(browser, OLD, 'old', lang, sz));
      results.push(await shotOffice(browser, NEW, 'new', lang, sz));
    }
  }
  await browser.close();

  const pairs = [
    'rizq_market_pulse__ar__390.png',
    'rizq_market_pulse__fr__390.png',
    'rizq_office__ar__390.png',
  ];
  const compare = [];
  for (const name of pairs) {
    const oldP = path.join(OUT, 'old__' + name);
    const newP = path.join(OUT, 'new__' + name);
    const side = path.join(OUT, 'side__' + name);
    const diff = path.join(OUT, 'diff__' + name);
    await sideBySide(oldP, newP, side);
    const pct = await highlightDiff(oldP, newP, diff);
    // copy into qa/ for report update
    await sharp(oldP).resize({ width: 480, withoutEnlargement: true }).png()
      .toFile(path.join(QA, name.replace('.png', '__old.png')));
    await sharp(newP).resize({ width: 480, withoutEnlargement: true }).png()
      .toFile(path.join(QA, name.replace('.png', '__new.png')));
    await sharp(diff).resize({ width: 480, withoutEnlargement: true }).png()
      .toFile(path.join(QA, name.replace('.png', '__diff.png')));
    // also publish full retake shots for chat
    fs.copyFileSync(side, path.join('/opt/cursor/artifacts', 'side__' + name));
    compare.push({ name, pct, side, diff, oldP, newP });
    console.log('COMPARE', name, pct + '%');
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    results,
    compare,
    pulseLangOk: results.filter((r) => r.page && r.page.indexOf('market_pulse') >= 0).every((r) => r.ok),
  };
  fs.writeFileSync(REPORT, JSON.stringify(summary, null, 2));
  console.log('\nPULSE_LANG_OK', summary.pulseLangOk);
  console.log('Wrote', REPORT);
  process.exitCode = summary.pulseLangOk ? 0 : 2;
})().catch((e) => { console.error(e); process.exit(1); });
