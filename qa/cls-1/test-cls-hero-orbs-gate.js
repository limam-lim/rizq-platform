#!/usr/bin/env node
/**
 * بوابة CLS لـ hero-orb* — 60 تشغيلاً، صفر قفزات > 0.05 من .hero-orb*
 * يركّز على العروض التي ظهرت فيها القفزة النادرة: 390-fr و 768-ar (30 لكلٍ).
 *
 * تشغيل: node qa/cls-1/test-cls-hero-orbs-gate.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const OUT = path.join(__dirname, 'cls-hero-orbs-gate-report.json');
const THRESHOLD = 0.05;
const OBSERVE_MS = 8000;
const PAGE = '/rizq_landing_v8.html';
const COMBOS = [
  { w: 390, lang: 'fr', h: 844, runs: 30 },
  { w: 768, lang: 'ar', h: 900, runs: 30 },
];

function loadPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
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
      if (url === '/') url = PAGE;
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
      };
      res.writeHead(200, {
        'content-type': types[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function measureOrbShifts(page, waitMs) {
  return page.evaluate((ms) => new Promise((resolve) => {
    const hits = [];
    try {
      const po = new PerformanceObserver((list) => {
        list.getEntries().forEach((e) => {
          if (e.hadRecentInput || !(e.value > 0.05)) return;
          const orbSources = [];
          try {
            (e.sources || []).forEach((s) => {
              const n = s.node;
              if (!n || n.nodeType !== 1) return;
              const cls = String(n.className || '');
              if (!/\bhero-orb\d?\b/.test(cls) && !(n.id || '').startsWith('hero-orb')) return;
              orbSources.push({
                sel: (n.id ? '#' + n.id : '') + '.' + cls.trim().split(/\s+/).slice(0, 3).join('.'),
                prevY: s.previousRect ? s.previousRect.y : null,
                curY: s.currentRect ? s.currentRect.y : null,
              });
            });
          } catch (err) { /* */ }
          if (orbSources.length) {
            hits.push({ t: Number(e.startTime.toFixed(1)), v: Number(e.value.toFixed(4)), sources: orbSources });
          }
        });
      });
      po.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => {
        try { po.disconnect(); } catch (e) { /* */ }
        resolve(hits);
      }, ms);
    } catch (e) {
      resolve([{ error: String(e && e.message || e) }]);
    }
  }), waitMs);
}

async function main() {
  const { chromium } = loadPlaywright();
  const server = await startStatic();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const report = { threshold: THRESHOLD, observeMs: OBSERVE_MS, combos: {}, failures: [], ok: true };

  for (const combo of COMBOS) {
    const key = combo.w + '-' + combo.lang;
    console.log('\n— ' + key + ' × ' + combo.runs + ' —');
    report.combos[key] = { runs: combo.runs, orbHits: 0, samples: [] };
    for (let i = 0; i < combo.runs; i++) {
      const ctx = await browser.newContext({
        viewport: { width: combo.w, height: combo.h },
        locale: combo.lang === 'fr' ? 'fr-FR' : 'ar',
      });
      const page = await ctx.newPage();
      await page.addInitScript((l) => {
        try {
          localStorage.clear();
          sessionStorage.clear();
          localStorage.setItem('rizq_lang', l);
        } catch (e) { /* */ }
      }, combo.lang);
      await page.route(/fonts\.googleapis|fonts\.gstatic/i, (r) => r.abort());
      await page.goto(
        base + PAGE + (combo.lang === 'fr' ? '?lang=fr' : ''),
        { waitUntil: 'domcontentloaded', timeout: 90000 }
      );
      const hits = await measureOrbShifts(page, OBSERVE_MS);
      await ctx.close();
      const bad = hits.filter((h) => h.v > THRESHOLD);
      report.combos[key].samples.push(bad.length ? bad[0].v : 0);
      if (bad.length) {
        report.combos[key].orbHits += 1;
        report.failures.push({ key, run: i + 1, hits: bad });
        report.ok = false;
        console.log('FAIL ' + key + ' run=' + (i + 1) + ' orb CLS', JSON.stringify(bad));
      } else {
        console.log('OK   ' + key + ' run=' + (i + 1));
      }
    }
  }

  await browser.close();
  server.close();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log('\n════════ hero-orb CLS gate ════════');
  Object.keys(report.combos).forEach((k) => {
    const c = report.combos[k];
    console.log((c.orbHits ? 'FAIL' : 'OK  ') + ' ' + k + '  orbHits=' + c.orbHits + '/' + c.runs);
  });
  console.log('REPORT ok=' + report.ok + ' written ' + OUT);
  console.log(report.ok
    ? 'ALL OK — zero hero-orb* shifts > ' + THRESHOLD + ' across 60 runs'
    : 'FAILED — ' + report.failures.length + ' run(s) with hero-orb* CLS > ' + THRESHOLD);
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
