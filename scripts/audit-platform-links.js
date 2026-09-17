/**
 * فحص روابط المنصة — ملفات + anchors + HTTP
 * node scripts/audit-platform-links.js [baseUrl]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');

function htmlFiles() {
  return fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
}

function hasAnchor(html, id) {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('id=["\']' + esc + '["\']').test(html);
}

function collectLinks() {
  const broken = [];
  const hashMissing = [];
  const seen = new Set();

  htmlFiles().forEach((file) => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const re = /href\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
      const href = m[1].trim();
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')
        || href.startsWith('http') || href.startsWith('javascript:') || href === '#') continue;
      const key = file + ' → ' + href;
      if (seen.has(key)) continue;
      seen.add(key);

      if (href.startsWith('#')) {
        const id = href.slice(1).split('?')[0];
        if (id && !hasAnchor(html, id)) hashMissing.push(key);
        continue;
      }

      const [filePartRaw, hashPart] = href.split('#');
      const filePart = filePartRaw.split('?')[0];
      if (!filePart || !filePart.endsWith('.html')) continue;
      const targetPath = path.join(ROOT, filePart.replace(/^\.\//, ''));
      if (!fs.existsSync(targetPath)) {
        broken.push(key);
        continue;
      }
      if (hashPart) {
        const id = hashPart.split('?')[0];
        const targetHtml = fs.readFileSync(targetPath, 'utf8');
        if (id && !hasAnchor(targetHtml, id)) hashMissing.push(key);
      }
    }
  });

  return { broken: [...new Set(broken)], hashMissing: [...new Set(hashMissing)], seen: [...seen] };
}

async function httpCheck(url) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    return r.status;
  } catch (e) {
    return 0;
  }
}

async function main() {
  console.log('\n=== Rizq Platform Link Audit ===');
  console.log('Base:', BASE, '\n');

  const { broken, hashMissing, seen } = collectLinks();
  let httpFail = [];

  const urls = new Set();
  seen.forEach((key) => {
    const href = key.split(' → ')[1];
    if (href.startsWith('#')) {
      urls.add(BASE + '/rizq_landing_v8.html' + href);
      return;
    }
    const filePart = href.split('#')[0].split('?')[0];
    urls.add(BASE + '/' + filePart.replace(/^\.\//, '') + (href.includes('#') ? '#' + href.split('#')[1] : '') + (href.includes('?') && !href.includes('#') ? '?' + href.split('?')[1] : href.includes('?') ? '?' + href.split('?').pop() : ''));
  });

  // Normalize unique page URLs from hrefs
  const pageUrls = new Set();
  seen.forEach((key) => {
    let href = key.split(' → ')[1];
    if (href.startsWith('#')) href = 'rizq_landing_v8.html' + href;
    if (!href.endsWith('.html') && !href.includes('.html')) return;
    const base = href.startsWith('http') ? href : BASE + '/' + href.replace(/^\.\//, '');
    pageUrls.add(base.split('#')[0].split('?')[0] + (href.includes('#') ? '#' + href.split('#')[1].split('?')[0] : '') + (href.includes('?') ? '?' + href.split('?')[1].split('#')[0] : ''));
  });

  for (const u of [...pageUrls].sort()) {
    const code = await httpCheck(u.split('#')[0].split('?')[0]);
    if (code !== 200) httpFail.push(u + ' → HTTP ' + code);
  }

  broken.forEach((x) => console.log('FAIL file', x));
  hashMissing.forEach((x) => console.log('FAIL anchor', x));
  httpFail.forEach((x) => console.log('FAIL http', x));

  const fails = broken.length + hashMissing.length + httpFail.length;
  console.log('\nSummary: broken files=' + broken.length + ', missing anchors=' + hashMissing.length + ', http fail=' + httpFail.length);
  console.log(fails ? 'AUDIT FAILED' : 'ALL LINKS OK');
  process.exit(fails ? 1 : 0);
}

main();
