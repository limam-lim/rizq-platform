'use strict';
/** Remove duplicate agent/widget scripts when rizq_pwa.js already loads them lazily */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const STRIP = [
  /<script[^>]*src="rizq_agent\.js[^"]*"[^>]*><\/script>\s*/gi,
  /<script[^>]*src="rizq_manager_agent_config\.js[^"]*"[^>]*><\/script>\s*/gi,
  /<script[^>]*src="rizq_widget_embed\.js[^"]*"[^>]*><\/script>\s*/gi,
  /<script[^>]*src="rizq_navbar\.js[^"]*"[^>]*><\/script>\s*/gi,
];

const files = fs.readdirSync(ROOT).filter(function (f) { return f.endsWith('.html'); });
let n = 0;
files.forEach(function (f) {
  const p = path.join(ROOT, f);
  let html = fs.readFileSync(p, 'utf8');
  if (!html.includes('rizq_pwa.js')) return;
  const orig = html;
  STRIP.forEach(function (re) { html = html.replace(re, ''); });
  if (html !== orig) {
    fs.writeFileSync(p, html, 'utf8');
    n += 1;
    console.log('stripped', f);
  }
});
console.log('Done:', n, 'files');
