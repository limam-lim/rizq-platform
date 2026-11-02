'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.join(__dirname, '../..');
const BASELINE_DIR = path.join(__dirname, '.baseline-main');

function loadPlaywright() {
  return require(path.join(ROOT, 'qa/journeys/node_modules/playwright'));
}

function startStatic(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/') url = '/rizq_landing_v8.html';
      const file = path.join(root, url.replace(/^\//, ''));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('no'); return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = {
        '.html': 'text/html;charset=utf-8', '.js': 'application/javascript', '.css': 'text/css',
        '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
        '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2',
      };
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
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
        list.getEntries().forEach((e) => { if (!e.hadRecentInput) cls += e.value; });
      });
      po.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => {
        try { po.disconnect(); } catch (e) { /* */ }
        resolve(Number(cls.toFixed(4)));
      }, 2200);
    } catch (e) { resolve(0); }
  }));
}

async function prepareClsPage(page, lang) {
  await page.addInitScript((l) => {
    try { localStorage.setItem('rizq_lang', l); } catch (e) { /* */ }
    try {
      localStorage.setItem('rizq_launch_cache_v1', JSON.stringify({
        launchDate: null, freeDays: 90, freeUntil: null, minActiveAdsToShow: 0, savedAt: Date.now()
      }));
    } catch (e2) { /* */ }
    try {
      document.documentElement.lang = l;
      document.documentElement.dir = l === 'fr' ? 'ltr' : 'rtl';
      if (l === 'fr') document.documentElement.classList.add('rizq-lang-fr');
    } catch (e3) { /* */ }
    try {
      const st = document.createElement('style');
      st.id = 'rizq-cls-gate-freeze';
      st.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
      (document.head || document.documentElement).appendChild(st);
    } catch (e4) { /* */ }
  }, lang);
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const type = route.request().resourceType();
    if (/fonts\.googleapis|fonts\.gstatic/i.test(url) || type === 'font') {
      return route.abort();
    }
    return route.continue();
  });
}

async function measure(page, lang, port) {
  await prepareClsPage(page, lang);
  await page.goto('http://127.0.0.1:' + port + '/rizq_landing_v8.html', {
    waitUntil: 'networkidle', timeout: 90000
  }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const st = document.createElement('style');
    st.textContent = '*{content-visibility:visible!important;contain-intrinsic-size:auto!important}';
    document.head.appendChild(st);
    const els = Array.from(document.querySelectorAll('section[id], #hero, #hero-listings'));
    for (const el of els) {
      el.scrollIntoView({ block: 'center' });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
  const heights = await page.evaluate(() => {
    const sections = {};
    document.querySelectorAll('section[id], #hero, #hero-listings').forEach((el) => {
      if (!el.id) return;
      sections[el.id] = el.offsetHeight;
    });
    const hero = document.getElementById('hero');
    return {
      sections,
      pageHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      heroTop: hero ? Math.round(hero.getBoundingClientRect().top) : null,
      bodyPad: getComputedStyle(document.body).paddingTop,
      hdrH: (document.getElementById('rizq-mock-hdr') || {}).offsetHeight || null,
      hc: (document.querySelector('.hero-content') || {}).offsetHeight || null,
      pills: (document.getElementById('hero-pills-nav') || {}).offsetHeight || null,
      listings: (document.getElementById('hero-listings') || {}).offsetHeight || null,
    };
  });
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  const clsCold = await measureCls(page);
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  const clsWarm = await measureCls(page);
  return Object.assign({}, heights, { clsCold, clsWarm });
}

(async () => {
  const { chromium } = loadPlaywright();
  const baseSrv = await startStatic(BASELINE_DIR);
  const branchSrv = await startStatic(ROOT);
  const browser = await chromium.launch({ headless: true });
  const report = {};
  for (const w of [390, 768, 1440]) {
    report[w] = {};
    for (const lang of ['ar', 'fr']) {
      const bp = await browser.newPage({ viewport: { width: w, height: 900 } });
      const np = await browser.newPage({ viewport: { width: w, height: 900 } });
      const base = await measure(bp, lang, baseSrv.address().port);
      const branch = await measure(np, lang, branchSrv.address().port);
      const ids = Object.keys(Object.assign({}, base.sections, branch.sections)).sort();
      const rows = ids.map((id) => {
        const b = base.sections[id] || 0;
        const n = branch.sections[id] || 0;
        const diff = n - b;
        return { id, main: b, branch: n, diff, ok: Math.abs(diff) <= 2 };
      }).filter((r) => r.main || r.branch);
      const pageDiff = branch.pageHeight - base.pageHeight;
      report[w][lang] = {
        page: { main: base.pageHeight, branch: branch.pageHeight, diff: pageDiff, ok: Math.abs(pageDiff) <= 5 },
        cls: { cold: branch.clsCold, warm: branch.clsWarm, ok: branch.clsCold < 0.05 && branch.clsWarm < 0.05 },
        meta: {
          heroTop: { main: base.heroTop, branch: branch.heroTop },
          hdrH: { main: base.hdrH, branch: branch.hdrH },
          hc: { main: base.hc, branch: branch.hc },
          pills: { main: base.pills, branch: branch.pills },
          listings: { main: base.listings, branch: branch.listings },
        },
        failing: rows.filter((r) => !r.ok),
        rows,
      };
      console.log(
        w, lang,
        'pageDiff', pageDiff,
        'fails', rows.filter((r) => !r.ok).map((r) => r.id + ':' + r.diff).join(',') || 'none',
        'cls', branch.clsCold, branch.clsWarm,
        'heroTop', base.heroTop, '->', branch.heroTop,
        'hdr', base.hdrH, '->', branch.hdrH,
        'hc', base.hc, '->', branch.hc,
        'pills', base.pills, '->', branch.pills,
        'hl', base.listings, '->', branch.listings
      );
      await bp.close();
      await np.close();
    }
  }
  await browser.close();
  baseSrv.close();
  branchSrv.close();
  const out = path.join(__dirname, 'height-natural-after.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  fs.writeFileSync('/opt/cursor/artifacts/height-natural-after.json', JSON.stringify(report, null, 2));
  console.log('wrote', out);
})().catch((e) => { console.error(e); process.exit(1); });
