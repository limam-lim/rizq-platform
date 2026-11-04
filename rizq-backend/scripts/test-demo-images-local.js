#!/usr/bin/env node
/**
 * بوابة: مصادر الديمو في الرئيسية/الكتالوج محلية — بلا unsplash/picsum.
 * npm run test:demo-images-local
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const EXT = new Set(['.js', '.html', '.json']);
const URL_RE = /https:\/\/(?:images\.unsplash\.com|picsum\.photos)[^"'\\\s)]+/g;
const SKIP = ['.git/', 'node_modules/', '.baseline-main/', 'backups/', 'demo-media/'];

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra != null ? String(extra).slice(0, 200) : ''); }
}

function allowed(rel) {
  const p = rel.replace(/\\/g, '/');
  if (SKIP.some((s) => p.includes(s))) return false;
  return p.startsWith('rizq_')
    || p.startsWith('rizq-backend/fixtures/')
    || p === 'scripts/test-hero-cover.js';
}

const hits = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === 'backups') continue;
    const abs = path.join(dir, ent.name);
    const rel = path.relative(ROOT, abs);
    if (ent.isDirectory()) {
      if (rel.includes('.baseline-main')) continue;
      walk(abs);
      continue;
    }
    if (!EXT.has(path.extname(ent.name))) continue;
    if (!allowed(rel)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    const m = text.match(URL_RE);
    if (m && m.length) hits.push({ rel: rel, n: m.length, sample: m[0] });
  }
}

walk(ROOT);

ok('no unsplash/picsum in product demo sources', hits.length === 0,
  hits.slice(0, 5).map((h) => h.rel + ':' + h.n).join(', '));

const demoDir = path.join(ROOT, 'demo-media');
const svgs = fs.existsSync(demoDir)
  ? fs.readdirSync(demoDir).filter((f) => f.endsWith('.svg'))
  : [];
ok('demo-media has SVG placeholders (≥50)', svgs.length >= 50, 'count=' + svgs.length);

const landing = fs.readFileSync(path.join(ROOT, 'rizq_landing_v8.html'), 'utf8');
ok('landing references /demo-media/', /\/demo-media\/[A-Za-z0-9._-]+\.svg/.test(landing));
ok('landing has zero unsplash/picsum', !/unsplash\.com|picsum\.photos/.test(landing));

const cards = fs.readFileSync(path.join(ROOT, 'rizq_ad_cards.js'), 'utf8');
ok('ad_cards has zero unsplash/picsum', !/unsplash\.com|picsum\.photos/.test(cards));

console.log('\ndemo-images-local: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
