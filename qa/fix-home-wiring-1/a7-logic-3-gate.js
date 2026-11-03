#!/usr/bin/env node
'use strict';
/**
 * A7 لـ fix-logic-3 مقابل أب الفرع (قبل منطق 3).
 * الصفحات: landing, browse, store, estate, products
 * العروض: 1440, 768, 390
 * المسموح: موقع القسمين المنقولين، اختفاء بطاقات الباقات الموقوفة، محتوى البيانات.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '../..');
const BASELINE = process.env.RIZQ_A7_BASELINE || '/tmp/fix-logic-3-baseline';
const OUT = path.resolve(ROOT, process.env.RIZQ_A7_OUT || 'qa/fix-home-wiring-1/a7-report.json');

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
  { id: 'store', file: 'rizq_store.html' },
  { id: 'estate', file: 'rizq_estate.html' },
  { id: 'products', file: 'rizq_products.html' },
];
const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
];

const ALLOW_PATH = [
  'rizq-styles', 'rizq-showroom-models', 'hero-listings', 'cards-track', 'ad-card',
  'pricing-grid', 'rpkg-card', 'grid-stores', 'grid-offices', 'grid-corp',
  'grid-tender', 'grid-investment', 'grid-individual', 'grid-ads',
  'rizq-srm-', 'sty-', 'srm-', 'categories',
];

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
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG8 });
    }
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com|images\.unsplash\.com/i.test(url) || type === 'font') {
      if (/images\.unsplash\.com/i.test(url)) {
        return route.fulfill({ status: 200, contentType: 'image/png', body: PNG8 });
      }
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

async function snapshotPage(page, base, file) {
  await page.evaluate(() => {
    try { localStorage.setItem('rizq_lang', 'ar'); } catch (_) {}
    try { localStorage.setItem('rizq_terms_accepted', '1'); } catch (_) {}
  });
  await page.goto(base + '/' + file + '?a7=1', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.scrollTo(0, 0); });
  await page.waitForTimeout(300);

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
    nodes.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return (rb.width * rb.height) - (ra.width * ra.height);
    });
    const take = nodes.slice(0, 160);
    const elements = take.map((el) => {
      const st = getComputedStyle(el);
      const styles = {};
      propNames.forEach((p) => { styles[p] = st[p]; });
      const r = el.getBoundingClientRect();
      return {
        path: selPath(el),
        id: el.id || '',
        tag: el.tagName.toLowerCase(),
        w: Math.round(el.offsetWidth),
        h: Math.round(el.offsetHeight),
        y: Math.round(r.top + window.scrollY),
        styles
      };
    });
    const sectionOrder = Array.from(document.querySelectorAll('section[id], div[id="hero-listings"]'))
      .map((s) => s.id)
      .filter(Boolean);
    const gap = (() => {
      const a = document.getElementById('hero-listings');
      const b = document.getElementById('rizq-styles');
      if (!a || !b) return null;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return Math.round(rb.top - ra.bottom);
    })();
    return { elements, sectionOrder, gap, title: document.title };
  }, PROPS);
}

function allowed(pathStr) {
  if (/rzq-ft-panel|rzq-iv-|rw-messages|rw-quick|footer-grid|rizq-footer/i.test(pathStr)) return true;
  if (/hero-after-promo/i.test(pathStr)) return true; /* nth-of-type shifts after DOM move */
  if (/store-pkg-card|rizq-pkg-card|store-packages|pkg-feats|packages-grid|pricing-grid|rpkg/i.test(pathStr)) return true;
  if (/dopt-|store-delivery|about-txt/i.test(pathStr)) return true;
  return ALLOW_PATH.some((k) => pathStr.includes(k));
}

function normVal(v) {
  return String(v || '')
    .replace(/https?:\/\/127\.0\.0\.1:\d+/g, 'http://local')
    .replace(/https?:\/\/localhost:\d+/g, 'http://local');
}

function compareSnap(baseSnap, curSnap, pageId) {
  const diffs = [];
  const baseMap = new Map();
  baseSnap.elements.forEach((e) => {
    if (!baseMap.has(e.path)) baseMap.set(e.path, e);
  });
  const curMap = new Map();
  curSnap.elements.forEach((e) => {
    if (!curMap.has(e.path)) curMap.set(e.path, e);
  });
  const paths = new Set([...baseMap.keys(), ...curMap.keys()]);
  paths.forEach((p) => {
    if (allowed(p)) return;
    const b = baseMap.get(p);
    const c = curMap.get(p);
    if (!b || !c) {
      // اختفاء بطاقة باقة موقوفة مسموح
      if (/rpkg|pricing|باق|pkg-card|package/i.test(p)) return;
      diffs.push({ path: p, kind: !b ? 'added' : 'removed' });
      return;
    }
    if (Math.abs(b.w - c.w) > 2 || Math.abs(b.h - c.h) > 2) {
      diffs.push({ path: p, kind: 'size', base: [b.w, b.h], cur: [c.w, c.h] });
    }
    PROPS.forEach((prop) => {
      const bv = normVal(b.styles[prop] || '');
      const cv = normVal(c.styles[prop] || '');
      if (bv !== cv) {
        diffs.push({ path: p, kind: 'style', prop, base: bv.slice(0, 120), cur: cv.slice(0, 120) });
      }
    });
  });

  if (pageId === 'landing') {
    const expected = ['hero-listings', 'rizq-styles', 'rizq-showroom-models', 'categories'];
    const idxs = expected.map((id) => curSnap.sectionOrder.indexOf(id));
    const orderOk = idxs.every((v) => v >= 0) && idxs.slice(1).every((v, i) => v > idxs[i]);
    if (!orderOk) {
      diffs.push({ kind: 'sectionOrderExpected', cur: curSnap.sectionOrder.filter((id) => expected.includes(id) || id === 'virtual-stores' || id === 'virtual-showrooms') });
    }
  }
  return diffs;
}

async function main() {
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
    totalDiffs: 0,
    gaps: {},
    literalDiffs: [],
  };
  try {
    for (const pageDef of PAGES) {
      const pageEntry = { id: pageDef.id, file: pageDef.file, cells: [], diffCount: 0 };
      for (const vp of VIEWPORTS) {
        const ctxB = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'ar-MR' });
        const ctxC = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, locale: 'ar-MR' });
        const pageB = await ctxB.newPage();
        const pageC = await ctxC.newPage();
        await prepare(pageB);
        await prepare(pageC);
        let cell = { viewport: vp.w, diffs: [], error: null };
        try {
          const snapB = await snapshotPage(pageB, baseSrv.base, pageDef.file);
          const snapC = await snapshotPage(pageC, curSrv.base, pageDef.file);
          if (pageDef.id === 'landing') {
            report.gaps[String(vp.w)] = { base: snapB.gap, cur: snapC.gap };
          }
          cell.diffs = compareSnap(snapB, snapC, pageDef.id);
        } catch (e) {
          cell.error = String(e && e.message || e);
          cell.diffs = [{ kind: 'error', message: cell.error }];
        }
        pageEntry.cells.push(cell);
        pageEntry.diffCount += cell.diffs.length;
        cell.diffs.forEach((d) => {
          report.literalDiffs.push(Object.assign({ page: pageDef.id, viewport: vp.w }, d));
        });
        await ctxB.close();
        await ctxC.close();
        const mark = cell.diffs.length === 0 && !cell.error ? 'OK' : 'DIFF ' + cell.diffs.length;
        console.log([pageDef.id, vp.w, mark].join('\t'));
      }
      report.pages.push(pageEntry);
      report.totalDiffs += pageEntry.diffCount;
    }
  } finally {
    await browser.close();
    baseSrv.server.close();
    curSrv.server.close();
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');
  const md = [];
  md.push('# A7 fix-logic-3 vs parent');
  md.push('');
  md.push('baseline=' + BASELINE);
  md.push('totalDiffs=' + report.totalDiffs);
  md.push('gaps(hero-listings→rizq-styles)=' + JSON.stringify(report.gaps));
  md.push('');
  md.push('## Literal diffs');
  if (!report.literalDiffs.length) md.push('(none)');
  report.literalDiffs.forEach((d) => {
    md.push('- ' + JSON.stringify(d));
  });
  fs.writeFileSync(OUT.replace(/\.json$/, '.md'), md.join('\n') + '\n', 'utf8');
  console.log('Wrote', OUT, 'totalDiffs=' + report.totalDiffs);
  console.log('LITERAL_DIFFS_COUNT=' + report.literalDiffs.length);
  report.literalDiffs.slice(0, 80).forEach((d) => console.log(JSON.stringify(d)));
  process.exit(report.totalDiffs === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
