#!/usr/bin/env node
/**
 * بوابة: مصادر الديمو محلية فوتوغرافية (WebP) تحت rizq-assets/demo-* —
 * بلا unsplash/picsum في مصادر المنتج، وبلا SVG مولَّدة في demo-media.
 * npm run test:demo-images-local
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const EXT = new Set(['.js', '.html', '.json']);
const URL_RE = /https:\/\/(?:images\.unsplash\.com|picsum\.photos)[^"'\\\s)]+/g;
const SKIP = ['.git/', 'node_modules/', '.baseline-main/', 'backups/', 'demo-media/', 'scripts/build-real-demo-photos.py'];
const MAX_WEBP = 120 * 1024;

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra != null ? String(extra).slice(0, 220) : ''); }
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
      if (rel.includes('.baseline-main') || rel === 'demo-media') continue;
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

const demoMedia = path.join(ROOT, 'demo-media');
const leftoverSvg = fs.existsSync(demoMedia)
  ? fs.readdirSync(demoMedia).filter((f) => f.endsWith('.svg'))
  : [];
ok('demo-media has zero generated SVGs', leftoverSvg.length === 0, 'count=' + leftoverSvg.length);

const gen = path.join(ROOT, 'scripts', 'gen-local-demo-media.py');
ok('SVG generator script removed', !fs.existsSync(gen));

const assetsRoot = path.join(ROOT, 'rizq-assets');
const demoDirs = fs.existsSync(assetsRoot)
  ? fs.readdirSync(assetsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('demo-'))
      .map((d) => d.name)
  : [];
ok('rizq-assets has demo-* sections', demoDirs.length >= 5, 'dirs=' + demoDirs.join(','));

const webps = [];
const overs = [];
const missingCredits = [];
for (const dir of demoDirs) {
  const abs = path.join(assetsRoot, dir);
  if (!fs.existsSync(path.join(abs, 'CREDITS.md'))) missingCredits.push(dir);
  for (const f of fs.readdirSync(abs)) {
    if (!f.endsWith('.webp')) continue;
    const fp = path.join(abs, f);
    const sz = fs.statSync(fp).size;
    webps.push(fp);
    if (sz > MAX_WEBP) overs.push(path.relative(ROOT, fp) + '=' + sz);
  }
}
const mediums = webps.filter((fp) => !/\.(thumb|full)\.webp$/i.test(fp));
ok('demo medium WebP count ≥ 50', mediums.length >= 50, 'count=' + mediums.length);
ok('every demo WebP ≤ 120KB', overs.length === 0, overs.slice(0, 5).join(', '));

const missingVariants = [];
for (const fp of webps) {
  const base = fp.replace(/\.webp$/i, '');
  if (/\.(thumb|full)$/i.test(base)) continue;
  if (!fs.existsSync(base + '.thumb.webp')) missingVariants.push(path.relative(ROOT, base + '.thumb.webp'));
  if (!fs.existsSync(base + '.full.webp')) missingVariants.push(path.relative(ROOT, base + '.full.webp'));
}
ok('each medium WebP has .thumb.webp + .full.webp', missingVariants.length === 0, missingVariants.slice(0, 5).join(', '));

ok('each demo-* has CREDITS.md', missingCredits.length === 0, missingCredits.join(','));

const svgRefs = [];
function walkSvgRefs(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === 'backups' || ent.name === 'demo-media') continue;
    const abs = path.join(dir, ent.name);
    const rel = path.relative(ROOT, abs);
    if (ent.isDirectory()) { walkSvgRefs(abs); continue; }
    if (!EXT.has(path.extname(ent.name))) continue;
    if (!allowed(rel)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    if (/\/?demo-media\/[A-Za-z0-9._-]+\.svg/.test(text)) svgRefs.push(rel);
  }
}
walkSvgRefs(ROOT);
ok('no /demo-media/*.svg refs in product sources', svgRefs.length === 0, svgRefs.slice(0, 5).join(', '));

const landing = fs.readFileSync(path.join(ROOT, 'rizq_landing_v8.html'), 'utf8');
ok('landing references rizq-assets/demo-', /rizq-assets\/demo-[a-z-]+\//.test(landing));
ok('landing has zero unsplash/picsum', !/unsplash\.com|picsum\.photos/.test(landing));

const cards = fs.readFileSync(path.join(ROOT, 'rizq_ad_cards.js'), 'utf8');
ok('ad_cards has zero unsplash/picsum', !/unsplash\.com|picsum\.photos/.test(cards));
ok('ad_cards fashion paths are .webp', /demo-fashion\/demo-melhafa-street-dark\.webp/.test(cards));

console.log('\ndemo-images-local: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
