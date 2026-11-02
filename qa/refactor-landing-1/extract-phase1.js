#!/usr/bin/env node
'use strict';
/**
 * Phase 1: extract embedded <style> → rizq_landing.css and inline <script> → section JS files.
 * Preserves execution order (blocking script tags at original positions; no new defer).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const HTML_PATH = path.join(ROOT, 'rizq_landing_v8.html');

function ensureLfUtf8(s) {
  return String(s).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Absolute 1-based line ranges inside the mega <script> (inclusive). */
const MAIN_SECTIONS = [
  { file: 'landing-core.js', start: 7195, end: 7267 },
  { file: 'landing-ads.js', start: 7268, end: 7900 },
  { file: 'landing-styles.js', start: 7901, end: 9233 },
  { file: 'landing-showrooms.js', start: 9234, end: 9626 },
  { file: 'landing-estate.js', start: 9627, end: 9809 },
  { file: 'landing-qcat.js', start: 9810, end: 10796 },
  { file: 'landing-hero.js', start: 10797, end: 11132 },
  { file: 'landing-categories.js', start: 11133, end: 11628 },
  { file: 'landing-i18n.js', start: 11629, end: 12790 },
  { file: 'landing-chrome.js', start: 12791, end: 14030 },
  { file: 'landing-register.js', start: 14031, end: 14946 },
  { file: 'landing-prices.js', start: 14947, end: 16105 }
];

function writeJs(name, body) {
  const out = ensureLfUtf8(body.replace(/^\n+/, '').replace(/\n+$/, '\n'));
  if (!out.trim()) throw new Error('empty js: ' + name);
  if (out.lstrip && out.lstrip().startsWith('<')) throw new Error('html in js: ' + name);
  if (/^\s*</.test(out)) throw new Error('html in js: ' + name);
  fs.writeFileSync(path.join(ROOT, name), out, 'utf8');
}

function main() {
  const orig = ensureLfUtf8(fs.readFileSync(HTML_PATH, 'utf8'));
  const origLines = orig.split('\n');
  let html = orig;

  // ── CSS: all style bodies in order → rizq_landing.css ──
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  const cssParts = [];
  let sm;
  while ((sm = styleRe.exec(orig))) {
    const attrs = (sm[0].match(/^<style\b([^>]*)>/i) || [])[1] || '';
    const id = (attrs.match(/\bid=["']([^"']+)/) || [])[1] || ('block-' + (cssParts.length + 1));
    cssParts.push('/* === extracted from <style' + attrs + '> (' + id + ') === */\n' + sm[1].trim() + '\n');
  }
  if (cssParts.length < 4) throw new Error('expected >=4 style blocks, got ' + cssParts.length);
  const cssOut = ensureLfUtf8(cssParts.join('\n'));
  fs.writeFileSync(path.join(ROOT, 'rizq_landing.css'), cssOut, 'utf8');

  html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  if (!/<link rel="stylesheet" href="rizq_header_mockup_trial\.css[^"]*"\s*\/?>/.test(html)) {
    throw new Error('header mockup css link not found');
  }
  html = html.replace(
    /(<link rel="stylesheet" href="rizq_header_mockup_trial\.css[^"]*"\s*\/?>)/,
    '$1\n<link rel="stylesheet" href="rizq_landing.css?v=1.0"/>'
  );

  // ── Mega script sections from original line map ──
  for (const sec of MAIN_SECTIONS) {
    const body = origLines.slice(sec.start - 1, sec.end).join('\n') + '\n';
    writeJs(sec.file, body);
  }
  const mainTags = MAIN_SECTIONS.map((s) => '<script src="' + s.file + '?v=1.0"></script>').join('\n');

  // ── Named small scripts via unique regex on current html ──
  const small = [
    {
      file: 'landing-scroll-boot.js',
      re: /<script>\s*\/\* منع استعادة موضع التمرير[\s\S]*?<\/script>/
    },
    {
      file: 'landing-url-boot.js',
      re: /<script>\s*\(function \(\) \{\s*try \{\s*var p = new URLSearchParams\(window\.location\.search\);[\s\S]*?<\/script>/
    },
    {
      file: 'landing-navclass-boot.js',
      re: /<script>\s*document\.documentElement\.classList\.add\('rizq-app-nav'\);[\s\S]*?<\/script>/
    },
    {
      file: 'landing-lang-boot.js',
      re: /<script>\s*\(function\(\)\{\s*try \{\s*var savedLang = localStorage\.getItem\('rizq_lang'\);[\s\S]*?<\/script>/
    },
    {
      file: 'landing-ads-preview.js',
      re: /<script>\s*\(function\(\)\{\s*\/\* شريط معاينة داخلي فقط[\s\S]*?<\/script>/
    },
    {
      file: 'landing-pkg-modal.js',
      re: /<script>\s*var _pkgModalOrigin = '';[\s\S]*?<\/script>/
    },
    {
      file: 'landing-promo.js',
      re: /<script>\s*function openRizqPromo\(\)\{document\.getElementById\('rizq-promo-overlay'\)[\s\S]*?<\/script>/
    },
    {
      file: 'landing-visitor-video.js',
      re: /<script>\s*\/\/ ══ الفيديو الإعلاني للزوار[\s\S]*?<\/script>/
    },
    {
      file: 'landing-trial-bar.js',
      re: /<script>\s*\/\* شريط الفترة المجانية[\s\S]*?<\/script>/
    },
    {
      file: 'landing-legal-notice.js',
      re: /<script>\s*\/\* إشعار قانوني: لا يُفتح تلقائياً[\s\S]*?<\/script>/
    },
    {
      file: 'landing-discovery.js',
      re: /<script>\s*\(function\(\)\{\s*var DISCOVERY_MIN_READY_ACCOUNTS = 1;[\s\S]*?<\/script>/
    }
  ];

  for (const item of small) {
    const m = html.match(item.re);
    if (!m) throw new Error('pattern not found: ' + item.file);
    const inner = m[0].replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '');
    writeJs(item.file, inner);
    html = html.replace(item.re, '<script src="' + item.file + '?v=1.0"></script>');
  }

  // prices-date: inline script nested inside a span on one line
  const pricesRe = /(<b id="prices-updated-date">[^<]*<\/b>)<script>(\(function\(\)\{try\{var el=document\.getElementById\('prices-updated-date'\)[\s\S]*?\}\)\(\);)<\/script>/;
  const pm = html.match(pricesRe);
  if (!pm) throw new Error('prices-date inline script not found');
  writeJs('landing-prices-date.js', pm[2] + '\n');
  html = html.replace(pricesRe, '$1<script src="landing-prices-date.js?v=1.0"></script>');

  // Mega script last (largest)
  const megaRe = /<script>\s*var isAr = true;[\s\S]*?<\/script>/;
  if (!megaRe.test(html)) throw new Error('mega landing script not found');
  html = html.replace(megaRe, mainTags);

  // leftover inline scripts?
  const leftover = [];
  const scrRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let xm;
  while ((xm = scrRe.exec(html))) {
    if (/\bsrc\s*=/.test(xm[1] || '')) continue;
    const body = (xm[2] || '').trim();
    if (body.length > 40) leftover.push(body.slice(0, 70) + ' (' + body.length + ')');
  }
  if (leftover.length) throw new Error('leftover inline scripts: ' + JSON.stringify(leftover));

  html = ensureLfUtf8(html);
  fs.writeFileSync(HTML_PATH, html, 'utf8');

  const stats = {
    cssBytes: Buffer.byteLength(cssOut),
    cssImportant: (cssOut.match(/!important/g) || []).length,
    htmlBytes: Buffer.byteLength(html),
    htmlLines: html.split('\n').length,
    files: MAIN_SECTIONS.map((s) => s.file).concat(small.map((s) => s.file)).concat(['landing-prices-date.js'])
  };
  fs.writeFileSync(path.join(__dirname, 'phase1-extract-stats.json'), JSON.stringify(stats, null, 2));
  console.log(JSON.stringify({ ok: true, stats }, null, 2));
}

main();
