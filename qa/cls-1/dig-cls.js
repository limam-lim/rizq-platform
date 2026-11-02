#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.join(__dirname, '../..');

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(__dirname, 'node_modules/playwright'),
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
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
      };
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function dig(page, waitMs) {
  return page.evaluate((ms) => new Promise((resolve) => {
    const shifts = [];
    let cls = 0;
    const po = new PerformanceObserver((list) => {
      list.getEntries().forEach((e) => {
        if (e.hadRecentInput) return;
        cls += e.value;
        const srcs = (e.sources || []).map((s) => {
          const n = s.node;
          let sel = '?';
          if (n && n.nodeType === 1) {
            sel = (n.id ? '#' + n.id : '') +
              (n.className && typeof n.className === 'string'
                ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.')
                : '') || n.tagName;
          }
          const r0 = s.previousRect || {};
          const r1 = s.currentRect || {};
          return {
            sel: String(sel).slice(0, 80),
            v: Number(e.value.toFixed(4)),
            h0: Number((r0.height || 0).toFixed(1)),
            h1: Number((r1.height || 0).toFixed(1)),
            y0: Number((r0.y || 0).toFixed(1)),
            y1: Number((r1.y || 0).toFixed(1)),
            w0: Number((r0.width || 0).toFixed(1)),
            w1: Number((r1.width || 0).toFixed(1)),
          };
        });
        if (srcs.length) shifts.push(...srcs);
        else shifts.push({ sel: '(no-source)', v: Number(e.value.toFixed(4)) });
      });
    });
    po.observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => {
      try { po.disconnect(); } catch (e) { /* */ }
      const metrics = {};
      const ids = [
        'rizq-mock-hdr', 'ticker-wrap', 'hero-listings', 'categories',
        'store-hero', 'hero', 'hero-geo',
      ];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        metrics[id] = {
          h: Number(r.height.toFixed(1)),
          y: Number(r.y.toFixed(1)),
          top: Number(r.top.toFixed(1)),
        };
      });
      const nav = document.querySelector('nav.rmh-nav');
      if (nav) {
        const r = nav.getBoundingClientRect();
        metrics['nav.rmh-nav'] = { h: Number(r.height.toFixed(1)), y: Number(r.y.toFixed(1)) };
      }
      const ab = document.querySelector('.actions-bar');
      if (ab) {
        const r = ab.getBoundingClientRect();
        metrics['.actions-bar'] = { h: Number(r.height.toFixed(1)), y: Number(r.y.toFixed(1)) };
      }
      const cs = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      metrics.css = {
        headerH: cs.getPropertyValue('--rizq-header-h').trim(),
        mockHdrH: cs.getPropertyValue('--rizq-mock-hdr-h').trim(),
        tickerH: cs.getPropertyValue('--rizq-ticker-h').trim(),
        bodyPadTop: body.paddingTop,
        bodyPadBottom: body.paddingBottom,
      };
      shifts.sort((a, b) => (b.v || 0) - (a.v || 0));
      resolve({ cls: Number(cls.toFixed(4)), shifts: shifts.slice(0, 25), metrics });
    }, ms);
  }), waitMs);
}

async function main() {
  const pages = process.argv.slice(2);
  const targets = pages.length ? pages : [
    '/rizq_landing_v8.html',
    '/rizq_store.html',
    '/rizq_products.html',
  ];
  const widths = [390, 768, 1440];
  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;
  const browser = await chromium.launch({ headless: true });
  const out = {};
  try {
    for (const w of widths) {
      out[w] = {};
      for (const pagePath of targets) {
        const ctx = await browser.newContext({
          viewport: { width: w, height: w <= 400 ? 844 : 900 },
          locale: 'ar',
        });
        const page = await ctx.newPage();
        await page.addInitScript(() => {
          try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* */ }
        });
        await page.goto(base + pagePath, { waitUntil: 'domcontentloaded', timeout: 90000 });
        const cold = await dig(page, 4000);
        out[w][pagePath] = cold;
        console.log('\n=== w=' + w + ' ' + pagePath + ' CLS=' + cold.cls);
        console.log('css', JSON.stringify(cold.metrics.css));
        console.log('box', JSON.stringify(cold.metrics));
        cold.shifts.slice(0, 12).forEach((s) => {
          console.log(
            '  shift v=' + s.v +
            ' ' + s.sel +
            ' h ' + s.h0 + '→' + s.h1 +
            ' y ' + s.y0 + '→' + s.y1
          );
        });
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  fs.writeFileSync(path.join(__dirname, 'cls-dig.json'), JSON.stringify(out, null, 2));
  console.log('\nwritten qa/cls-1/cls-dig.json');
}

main().catch((e) => { console.error(e); process.exit(1); });
