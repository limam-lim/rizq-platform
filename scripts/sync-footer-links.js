/**
 * مزامنة روابط الفوتر في كل صفحات HTML العامة
 * node scripts/sync-footer-links.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const CAT = [
  ['rzq-ft-c1', 'rizq_browse.html?cat=%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA'],
  ['rzq-ft-c2', 'rizq_browse.html?cat=%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA'],
  ['rzq-ft-c3', 'rizq_browse.html?cat=%D8%B4%D8%A7%D8%AD%D9%86%D8%A7%D8%AA'],
  ['rzq-ft-c4', 'rizq_browse.html?cat=%D8%A5%D9%84%D9%83%D8%AA%D8%B1%D9%88%D9%86%D9%8A%D8%A7%D8%AA'],
  ['rzq-ft-c5', 'rizq_browse.html?cat=%D9%85%D8%A7%D8%B4%D9%8A%D8%A9'],
];

const HELP = [
  ['ft-h1', 'footer-help1', 'rzq-ft-h1', 'ft-h1', 'rizq_help.html'],
  ['ft-h3', 'footer-help3', 'rzq-ft-h3', 'ft-h3', 'rizq_legal.html#s2'],
  ['ft-h5', 'footer-col-contact', 'rzq-ft-h5', 'ft-h5', 'rizq_legal.html#s10'],
];

function patchFile(file) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let changed = false;

  CAT.forEach(([id, href]) => {
    const re = new RegExp('(<a\\s+href=")[^"]*("\\s+[^>]*\\bid="' + id + '")', 'g');
    const next = html.replace(re, '$1' + href + '$2');
    if (next !== html) { html = next; changed = true; }
  });

  // أقسام بدون id — أول 5 روابط browse داخل footer-grid بعد عنوان الأقسام
  const catBlockRe = /(<h4[^>]*(?:ft-topcats|topcats|rzq-ft-topcats)[^>]*>[\s\S]*?<ul class="footer-links">)([\s\S]*?)(<\/ul>)/gi;
  html = html.replace(catBlockRe, (m, head, body, tail) => {
    let i = 0;
    const nb = body.replace(/href="rizq_browse\.html(?:\?[^"]*)?"/g, (href) => {
      if (i >= CAT.length) return href;
      const target = CAT[i][1];
      i += 1;
      changed = true;
      return 'href="' + target + '"';
    });
    return head + nb + tail;
  });

  HELP.forEach((keys) => {
    const href = keys[keys.length - 1];
    keys.slice(0, -1).forEach((key) => {
      const re1 = new RegExp('(<a\\s+href=")rizq_legal\\.html(?:#[^"]*)?("\\s+[^>]*\\b(?:data-t|id)="' + key + '")', 'g');
      const re2 = new RegExp('(<a\\s+href=")rizq_legal\\.html(?:#[^"]*)?("\\s+[^>]*\\bid="' + key + '")', 'g');
      [re1, re2].forEach((re) => {
        const next = html.replace(re, '$1' + href + '$2');
        if (next !== html) { html = next; changed = true; }
      });
    });
  });

  // landing ft-h1/h3/h5 inline footer
  const inline = [
    ['data-t="ft-h1"', 'rizq_help.html'],
    ['data-t="ft-h3"', 'rizq_legal.html#s2'],
    ['data-t="ft-h5"', 'rizq_legal.html#s10'],
  ];
  inline.forEach(([attr, href]) => {
    const re = new RegExp('(<a\\s+href=")rizq_legal\\.html(?:#[^"]*)?("\\s+' + attr + ')', 'g');
    const next = html.replace(re, '$1' + href + '$2');
    if (next !== html) { html = next; changed = true; }
  });

  // من نحن على الصفحة الرئيسية — رابط مطلق يعمل من أي مكان
  const aboutRe = /(<a\s+href=")#about("\s+data-t="ft-q5")/g;
  const aboutNext = html.replace(aboutRe, '$1rizq_landing_v8.html#about$2');
  if (aboutNext !== html) { html = aboutNext; changed = true; }

  if (changed) fs.writeFileSync(path.join(ROOT, file), html, 'utf8');
  return changed;
}

const files = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
let n = 0;
files.forEach((f) => { if (patchFile(f)) { n += 1; console.log('patched', f); } });
console.log('Done:', n, 'files updated');
