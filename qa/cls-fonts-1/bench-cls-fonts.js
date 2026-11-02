'use strict';
/**
 * Benchmark CLS (3 cold + 3 warm) × (390/768/1440) × (ar/fr)
 * across Landing, Browse, Products, Store — with local Cairo enabled.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'qa/cls-fonts-1');
fs.mkdirSync(OUT, { recursive: true });

function median(arr) {
  const a = (arr || []).slice().sort((x, y) => x - y);
  if (!a.length) return 0;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function loadPlaywright() {
  try {
    return require(path.join(ROOT, 'qa/journeys/node_modules/playwright'));
  } catch (_) {
    return require('playwright');
  }
}

function startRoot() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/') url = '/rizq_landing_v8.html';
      const file = path.join(ROOT, url.replace(/^\//, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('missing');
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2',
        '.jpg': 'image/jpeg',
        '.webp': 'image/webp'
      };
      res.writeHead(200, {
        'content-type': types[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
        'access-control-allow-origin': '*'
      });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const PAGES = [
  { id: 'landing', path: '/rizq_landing_v8.html' },
  { id: 'browse', path: '/rizq_browse.html' },
  { id: 'products', path: '/rizq_products.html' },
  { id: 'store', path: '/rizq_store.html' }
];
const WIDTHS = [390, 768, 1440];
const LANGS = ['ar', 'fr'];
const SAMPLES = 3;

async function sampleCls(browser, port, pagePath, lang, width, kind) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  try {
    await page.addInitScript((lng) => {
      try {
        localStorage.setItem('rizq_lang', lng);
        localStorage.setItem('rizq_terms_accepted', '1');
        document.documentElement.lang = lng;
        document.documentElement.dir = lng === 'fr' ? 'ltr' : 'rtl';
        if (lng === 'fr') document.documentElement.classList.add('rizq-lang-fr');
      } catch (_) {}
      window.__rizqClsScore = 0;
      try {
        const po = new PerformanceObserver((list) => {
          list.getEntries().forEach((e) => {
            if (!e.hadRecentInput) window.__rizqClsScore += e.value;
          });
        });
        po.observe({ type: 'layout-shift', buffered: true });
      } catch (_) {}
    }, lang);
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (/\/api\//.test(url)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, ads: [], items: [], accounts: [], products: [], config: { enabled: false } })
        });
      }
      return route.continue();
    });
    const url = 'http://127.0.0.1:' + port + pagePath;
    if (kind === 'warm') {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(2200);
    const fontsOk = await page.evaluate(async () => {
      try {
        await document.fonts.ready;
        const faces = [...document.fonts].filter((f) => /cairo/i.test(f.family));
        return {
          ready: true,
          cairoFaces: faces.length,
          loaded: faces.filter((f) => f.status === 'loaded').length
        };
      } catch (e) {
        return { ready: false, err: String(e) };
      }
    });
    const cls = await page.evaluate(() => Number((window.__rizqClsScore || 0).toFixed(4)));
    let heights = null;
    if (pagePath.includes('landing')) {
      heights = await page.evaluate(() => {
        const sections = {};
        document.querySelectorAll('section[id], #hero, #hero-listings').forEach((el) => {
          if (el.id) sections[el.id] = el.offsetHeight;
        });
        return {
          sections,
          pageHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
          pad: getComputedStyle(document.body).paddingTop
        };
      });
    }
    return { cls, fontsOk, heights };
  } finally {
    await page.close();
  }
}

(async () => {
  const { chromium } = loadPlaywright();
  const srv = await startRoot();
  const browser = await chromium.launch({ headless: true });
  const report = { at: new Date().toISOString(), targetMedian: 0.05, table: {}, ok: true };
  try {
    for (const pg of PAGES) {
      report.table[pg.id] = {};
      for (const width of WIDTHS) {
        report.table[pg.id][width] = {};
        for (const lang of LANGS) {
          const cold = [];
          const warm = [];
          let fontsOk = null;
          let heights = null;
          for (let i = 0; i < SAMPLES; i++) {
            const r = await sampleCls(browser, srv.port, pg.path, lang, width, 'cold');
            cold.push(r.cls);
            fontsOk = r.fontsOk;
            heights = r.heights || heights;
          }
          for (let i = 0; i < SAMPLES; i++) {
            const r = await sampleCls(browser, srv.port, pg.path, lang, width, 'warm');
            warm.push(r.cls);
          }
          const coldMed = Number(median(cold).toFixed(4));
          const warmMed = Number(median(warm).toFixed(4));
          const cellOk = coldMed < 0.05 && warmMed < 0.05;
          if (!cellOk) report.ok = false;
          report.table[pg.id][width][lang] = {
            cold,
            warm,
            coldMedian: coldMed,
            warmMedian: warmMed,
            ok: cellOk,
            fontsOk,
            heights
          };
          console.log(
            '[cls-fonts]',
            pg.id,
            width,
            lang,
            'cold',
            coldMed,
            'warm',
            warmMed,
            cellOk ? 'ok' : 'FAIL',
            fontsOk && fontsOk.loaded
          );
        }
      }
    }
  } finally {
    await browser.close();
    srv.server.close();
  }
  const outPath = path.join(OUT, 'cls-fonts-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('wrote', outPath, 'ok=', report.ok);
  process.exit(report.ok ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
