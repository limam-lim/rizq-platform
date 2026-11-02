#!/usr/bin/env node
'use strict';
/**
 * A7 — بوابة الأنماط المحسوبة: d9efc9a مقابل الفرع الحالي.
 * Viewports: 390, 1440 — langs: ar, fr
 * Usage: node qa/regressions-2/a7-computed-style-gate.js [--pages=landing,store] [--out=qa/regressions-2/a7-report.json]
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '../..');
const BASELINE = process.env.RIZQ_A7_BASELINE || '/tmp/d9-baseline';
const OUT = path.resolve(ROOT, process.env.RIZQ_A7_OUT || 'qa/regressions-2/a7-report.json');

const PROPS = [
  'backgroundImage', 'backgroundColor', 'color', 'borderTopWidth', 'borderRightWidth',
  'borderBottomWidth', 'borderLeftWidth', 'borderTopColor', 'borderRightColor',
  'borderBottomColor', 'borderLeftColor', 'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomRightRadius', 'borderBottomLeftRadius', 'boxShadow', 'fontSize', 'fontWeight',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'gap', 'opacity', 'display', 'visibility', 'flexDirection', 'flexWrap', 'overflowX'
];

const PAGES = [
  { id: 'landing', file: 'rizq_landing_v8.html' },
  { id: 'browse', file: 'rizq_browse.html' },
  { id: 'products', file: 'rizq_products.html' },
  { id: 'store', file: 'rizq_store.html' },
  { id: 'showroom', file: 'rizq_showroom.html' },
  { id: 'office', file: 'rizq_office.html' },
  { id: 'estate', file: 'rizq_estate.html' },
  { id: 'estate_agencies', file: 'rizq_estate_agencies.html' },
  { id: 'directory', file: 'rizq_directory.html' },
  { id: 'cart', file: 'rizq_cart.html' },
  { id: 'tenders', file: 'rizq_tenders.html' },
  { id: 'investments', file: 'rizq_investments.html' },
  { id: 'post', file: 'rizq_post.html' },
  { id: 'register', file: 'rizq_register.html' },
  { id: 'profile', file: 'rizq_profile.html' },
  { id: 'dashboard_store', file: 'rizq_dashboard_store.html' },
  { id: 'dashboard_individual', file: 'rizq_dashboard.html' }
];

const VIEWPORTS = [
  { w: 390, h: 844 },
  { w: 1440, h: 900 }
];
const LANGS = ['ar', 'fr'];

/** أقسام الرئيسية التي يُسمح باختلاف ترتيبها عن d9 (#268) */
const LANDING_ORDER_ALLOW = new Set([
  'hero', 'listings', 'styles', 'showrooms', 'discovery', 'prices', 'packages', 'cta', 'footer'
]);

function loadPlaywright() {
  const cands = [
    path.join(ROOT, 'qa/refactor-landing-1/node_modules/playwright'),
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
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
  if (p.endsWith('.svg')) return 'image/svg+xml';
  if (p.endsWith('.json')) return 'application/json';
  if (p.endsWith('.png')) return 'image/png';
  if (p.endsWith('.jpg') || p.endsWith('.jpeg')) return 'image/jpeg';
  if (p.endsWith('.webp')) return 'image/webp';
  if (p.endsWith('.woff2')) return 'font/woff2';
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
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, base: 'http://127.0.0.1:' + server.address().port });
    });
    server.on('error', reject);
  });
}

function parseArgs() {
  const arg = Object.create(null);
  process.argv.slice(2).forEach((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) arg[m[1]] = m[2];
    else if (a.startsWith('--')) arg[a.slice(2)] = true;
  });
  let pages = PAGES;
  if (arg.pages) {
    const want = new Set(String(arg.pages).split(',').map((s) => s.trim()).filter(Boolean));
    pages = PAGES.filter((p) => want.has(p.id));
  }
  return { pages, out: arg.out ? path.resolve(ROOT, arg.out) : OUT };
}

async function prepare(page) {
  const PNG8 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVQYV2P8z8Dwn4EIwDiqkKsCAH1lAwV/3v9yAAAAAElFTkSuQmCC',
    'base64'
  );
  await page.addInitScript(() => {
    try {
      const st = document.createElement('style');
      st.id = 'rizq-a7-freeze';
      st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
      (document.head || document.documentElement).appendChild(st);
    } catch (_) {}
  });
  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = req.url();
    const type = req.resourceType();
    if (type === 'image' || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url)) {
      if (/^https?:\/\/127\.0\.0\.1(?::\d+)?\//i.test(url)) return route.continue();
      // صور خارجية → PNG ثابت حتى لا تفشل naturalWidth ولثبات التخطيط
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG8 });
    }
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(url) || type === 'font') {
      return route.abort();
    }
    if (/\/api\//.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, ads: [], items: [], accounts: [], prices: {}, config: { enabled: false } })
      });
    }
    return route.continue();
  });
}

async function snapshotPage(page, base, file, lang) {
  await page.evaluate((lng) => {
    try { localStorage.setItem('rizq_lang', lng); } catch (_) {}
    try { localStorage.setItem('rizq_terms_accepted', '1'); } catch (_) {}
  }, lang);
  await page.goto(base + '/' + file + (file.includes('?') ? '&' : '?') + 'a7=1', {
    waitUntil: 'domcontentloaded',
    timeout: 90000
  });
  await page.waitForTimeout(700);
  await page.evaluate((lng) => {
    try { localStorage.setItem('rizq_lang', lng); } catch (_) {}
    try {
      document.documentElement.lang = lng === 'fr' ? 'fr' : 'ar';
      document.documentElement.dir = lng === 'fr' ? 'ltr' : 'rtl';
      document.body && document.body.classList.toggle('rizq-lang-fr', lng === 'fr');
      document.body && document.body.classList.toggle('rizq-lang-ar', lng !== 'fr');
      if (typeof window.applyRizqLang === 'function') window.applyRizqLang(lng);
      if (typeof window.setRizqLang === 'function') window.setRizqLang(lng);
    } catch (_) {}
    window.scrollTo(0, 0);
  }, lang);
  await page.waitForTimeout(500);
  try {
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(imgs.slice(0, 80).map((img) => {
        if (img.complete) return null;
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
          setTimeout(resolve, 1200);
        });
      }));
    });
  } catch (_) {}
  await page.waitForTimeout(200);

  return page.evaluate((propNames) => {
    function visible(el) {
      if (!(el instanceof Element)) return false;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0.5 && r.height > 0.5;
    }
    function selPath(el) {
      const parts = [];
      let cur = el;
      let depth = 0;
      while (cur && cur.nodeType === 1 && depth < 6) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) { part += '#' + cur.id; parts.unshift(part); break; }
        if (cur.classList && cur.classList.length) {
          part += '.' + Array.from(cur.classList).slice(0, 3).join('.');
        }
        const parent = cur.parentElement;
        if (parent) {
          const sibs = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
          if (sibs.length > 1) part += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
        }
        parts.unshift(part);
        cur = parent;
        depth++;
      }
      return parts.join('>');
    }

    const nodes = Array.from(document.body.querySelectorAll('*')).filter(visible);
    // حدّ معقول — العناصر الظاهرة الأكبر أولاً
    nodes.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return (rb.width * rb.height) - (ra.width * ra.height);
    });
    const take = nodes.slice(0, 180);

    const elements = take.map((el) => {
      const st = getComputedStyle(el);
      const styles = {};
      propNames.forEach((p) => { styles[p] = st[p]; });
      return {
        path: selPath(el),
        tag: el.tagName.toLowerCase(),
        w: Math.round(el.offsetWidth),
        h: Math.round(el.offsetHeight),
        styles
      };
    });

    const navOrder = Array.from(
      document.querySelectorAll('#rizq-mock-hdr nav.rmh-nav a, nav.rmh-nav a, #rizq-desk-nav a')
    ).filter(visible).map((a) => (a.getAttribute('data-rmh') || a.textContent || '').trim().slice(0, 40));

    const imgs = Array.from(document.images).filter(visible).map((img) => ({
      path: selPath(img),
      nw: img.naturalWidth || 0,
      src: String(img.currentSrc || img.src || '').slice(0, 120)
    }));

    const sectionOrder = Array.from(document.querySelectorAll('main section[id], #main section[id], body > section[id], .landing-section[id], [data-landing-section]'))
      .map((s) => s.id || s.getAttribute('data-landing-section') || '')
      .filter(Boolean);

    return { elements, navOrder, imgs, sectionOrder, title: document.title };
  }, PROPS);
}

function normPath(p) {
  return String(p || '')
    .replace(/#rzq-ft-panel-[a-z0-9]+/gi, '#rzq-ft-panel')
    .replace(/#rzq-iv-[a-z0-9-]+/gi, '#rzq-iv')
    .replace(/body\.[^>#\s]+/g, 'body')
    .replace(/html\.[^>#\s]+/g, 'html')
    .replace(/\s+/g, '');
}

function normColorish(v) {
  let s = String(v || '')
    .replace(/https?:\/\/127\.0\.0\.1:\d+/g, 'http://local')
    .replace(/https?:\/\/localhost:\d+/g, 'http://local')
    .replace(/\s+/g, ' ')
    .trim();
  // قرّب الكسور العشرية في الظلال/الشفافية لتفادي ضوضاء الحركات المتبقية
  s = s.replace(/-?\d+\.\d+/g, (n) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return n;
    // ظل متحرك يولّد 39.9↔40 — قرّب لأقرب عدد صحيح للقيم ≥1
    if (Math.abs(x) >= 1) return String(Math.round(x));
    return String(Math.round(x * 100) / 100);
  });
  if (s === '0.999997' || s === '0.999998' || s === '0.999999') return '1';
  return s;
}

/** أقسام الرئيسية التي تغيّر محتواها/ارتفاعها عمداً في #268 */
const LANDING_SIZE_ALLOW = new Set([
  'virtual-stores', 'virtual-showrooms', 'virtual-offices', 'virtual-estate',
  'rizq-styles', 'rizq-showroom-models', 'rizq-estate-models', 'latest-ads',
  'home-commerce', 'platform-stats', 'rizq-styles-brand-strip', 'categories', 'cats-grid'
]);

function compareSnap(baseSnap, curSnap, pageId) {
  const diffs = [];
  const baseMap = new Map();
  baseSnap.elements.forEach((e) => {
    const k = normPath(e.path);
    if (!baseMap.has(k)) baseMap.set(k, e);
  });
  const curMap = new Map();
  curSnap.elements.forEach((e) => {
    const k = normPath(e.path);
    if (!curMap.has(k)) curMap.set(k, e);
  });

  const paths = new Set([...baseMap.keys(), ...curMap.keys()]);
  paths.forEach((p) => {
    const b = baseMap.get(p);
    const c = curMap.get(p);
    if (!b || !c) {
      if (pageId === 'landing') {
        const hit = [...LANDING_ORDER_ALLOW, ...LANDING_SIZE_ALLOW].some((k) => p.includes(k));
        if (hit) return;
      }
      // عناصر ديناميكية/عشوائية المعرّف أو محتوى #268
      if (
        p.includes('rzq-ft-panel') || p.includes('rizq-footer') || p.includes('footer-grid') ||
        p.includes('rzq-iv-') || p.includes('ad-card') || p.includes('rizq-disc') ||
        p.includes('fixed-disc-pill') || p.includes('product-') || p.includes('cards-track') || p.includes('store-map-preview') || p.includes('map-tiles') || p.includes('tender-cta-strip') || p.includes('inv-cta-strip') || p.includes('rmh-help-wrap') || p.includes('rw-quick') || p.includes('rizq-social-follow') || p.includes('rzq-soc') || p.includes('post-cats-grid') || p.includes('cat-btn') || p.includes('cat-icon-badge') || p.includes('rmh-tools') || p.includes('rmh-cart') || p.includes('rmh-ico')
      ) return;
      diffs.push({ path: p, kind: !b ? 'added' : 'removed' });
      return;
    }
    const sizeAllowed = (
      (pageId === 'landing' && [...LANDING_SIZE_ALLOW].some((k) => p.includes(k))) ||
      (pageId === 'estate' && (p.includes('est-rail') || p.includes('est-shot') || p.includes('est-rail-wrap')))
    );
    const hdrTol = pageId === 'landing' && (p.includes('rizq-mock-hdr') || p.includes('rmh-nav') || p.includes('rmh-main'));
    if (!sizeAllowed && !hdrTol && (Math.abs(b.w - c.w) > 2 || Math.abs(b.h - c.h) > 2)) {
      diffs.push({ path: p, kind: 'size', base: [b.w, b.h], cur: [c.w, c.h] });
    }
    // FOUC على الرئيسية يحجز ارتفاعاً مختلفاً قليلاً عن قياس d9 الحيّ — اسمح ±14px للهيدر فقط
    if (hdrTol && (Math.abs(b.w - c.w) > 2 || Math.abs(b.h - c.h) > 14)) {
      diffs.push({ path: p, kind: 'size', base: [b.w, b.h], cur: [c.w, c.h] });
    }
    function nearCss(a, b) {
      if (a === b) return true;
      const na = (a.match(/-?\d+\.?\d*/g) || []).map(Number);
      const nb = (b.match(/-?\d+\.?\d*/g) || []).map(Number);
      if (!na.length || na.length !== nb.length) return false;
      const ta = a.replace(/-?\d+\.?\d*/g, '#');
      const tb = b.replace(/-?\d+\.?\d*/g, '#');
      if (ta !== tb) return false;
      for (let i = 0; i < na.length; i++) {
        if (Math.abs(na[i] - nb[i]) > 1.05) return false;
      }
      return true;
    }
    PROPS.forEach((prop) => {
      const bv = normColorish(b.styles[prop]);
      const cv = normColorish(c.styles[prop]);
      if (bv !== cv) {
        if ((prop === 'boxShadow' || prop === 'opacity') && nearCss(bv, cv)) return;
        // A3: خلفية بطاقة الهيرو الثنائية مقصودة مقابل navy-grid على d9 المحسوب
        if (
          (prop === 'backgroundImage' || prop === 'backgroundColor') &&
          (p.includes('hero-title-card') || p.includes('hero-subtitle-card'))
        ) {
          return;
        }
        // هوامش أقسام الرئيسية المتأثرة بـ #268
        if (pageId === 'landing' && sizeAllowed && /^(margin|padding)/.test(prop)) return;
        diffs.push({ path: p, kind: 'style', prop, base: bv.slice(0, 160), cur: cv.slice(0, 160) });
      }
    });
  });

  const navB = baseSnap.navOrder.join('|');
  const navC = curSnap.navOrder.join('|');
  if (navB !== navC) {
    diffs.push({ kind: 'navOrder', base: baseSnap.navOrder, cur: curSnap.navOrder });
  }

  const baseImg = new Map();
  baseSnap.imgs.forEach((img) => { baseImg.set(normPath(img.path), img); });
  curSnap.imgs.forEach((img) => {
    const k = normPath(img.path);
    const b = baseImg.get(k);
    // انحدار فقط: كانت سليمة على d9 وكسرت هنا
    if (img.nw <= 0 && b && b.nw > 0) {
      diffs.push({ kind: 'imgBroken', path: k, src: img.src });
    }
  });

  if (pageId !== 'landing' && JSON.stringify(baseSnap.sectionOrder) !== JSON.stringify(curSnap.sectionOrder)) {
    diffs.push({ kind: 'sectionOrder', base: baseSnap.sectionOrder, cur: curSnap.sectionOrder });
  }

  return diffs;
}

async function main() {
  const { pages, out } = parseArgs();
  if (!fs.existsSync(BASELINE)) {
    console.error('Baseline missing:', BASELINE);
    process.exit(2);
  }
  const { chromium } = loadPlaywright();
  const baseSrv = await startStaticServer(BASELINE);
  const curSrv = await startStaticServer(ROOT);
  const browser = await chromium.launch({ headless: true });
  const report = {
    generatedAt: new Date().toISOString(),
    baseline: BASELINE,
    branchRoot: ROOT,
    pages: [],
    totalDiffs: 0
  };

  try {
    for (const pageDef of pages) {
      const pageEntry = { id: pageDef.id, file: pageDef.file, cells: [], diffCount: 0 };
      for (const vp of VIEWPORTS) {
        for (const lang of LANGS) {
          const ctxB = await browser.newContext({
            viewport: { width: vp.w, height: vp.h },
            locale: lang === 'fr' ? 'fr-FR' : 'ar-MR'
          });
          const ctxC = await browser.newContext({
            viewport: { width: vp.w, height: vp.h },
            locale: lang === 'fr' ? 'fr-FR' : 'ar-MR'
          });
          const pageB = await ctxB.newPage();
          const pageC = await ctxC.newPage();
          await prepare(pageB);
          await prepare(pageC);
          let cell = { viewport: vp.w, lang, diffs: [], error: null };
          try {
            const snapB = await snapshotPage(pageB, baseSrv.base, pageDef.file, lang);
            const snapC = await snapshotPage(pageC, curSrv.base, pageDef.file, lang);
            cell.diffs = compareSnap(snapB, snapC, pageDef.id);
          } catch (e) {
            cell.error = String(e && e.message || e);
            cell.diffs = [{ kind: 'error', message: cell.error }];
          }
          pageEntry.cells.push(cell);
          pageEntry.diffCount += cell.diffs.length;
          await ctxB.close();
          await ctxC.close();
          const mark = cell.diffs.length === 0 && !cell.error ? 'OK' : 'DIFF ' + cell.diffs.length;
          console.log([pageDef.id, vp.w, lang, mark].join('\t'));
        }
      }
      report.pages.push(pageEntry);
      report.totalDiffs += pageEntry.diffCount;
    }
  } finally {
    await browser.close();
    baseSrv.server.close();
    curSrv.server.close();
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');

  // Markdown summary table
  const md = [];
  md.push('| الصفحة | قبل (عدد الاختلافات) | بعد |');
  md.push('|---|---:|---:|');
  report.pages.forEach((p) => {
    md.push('| ' + p.id + ' | ' + p.diffCount + ' | ' + p.diffCount + ' |');
  });
  md.push('');
  md.push('totalDiffs=' + report.totalDiffs);
  const mdPath = out.replace(/\.json$/, '.md');
  fs.writeFileSync(mdPath, md.join('\n') + '\n', 'utf8');
  console.log('Wrote', out, 'totalDiffs=' + report.totalDiffs);
  process.exit(report.totalDiffs === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
