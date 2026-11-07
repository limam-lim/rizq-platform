#!/usr/bin/env node
/**
 * يقفل متطلبات #303: إخفاء نصوص اللغة فقط (لا body/opacity)،
 * fallback 1.5s، و<noscript> يلغي الإخفاء.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const landing = fs.readFileSync(path.join(ROOT, 'rizq_landing_v8.html'), 'utf8');

let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) {
    pass += 1;
    console.log('  ✓ ' + name);
  } else {
    fail += 1;
    console.log('  ✗ ' + name + (detail ? ' — ' + String(detail).slice(0, 160) : ''));
  }
}

ok('rizq-lang-booting class applied before paint',
  /html\.classList\.add\('rizq-lang-booting'\)/.test(landing));

ok('1500ms fallback clears booting → ready',
  /setTimeout\(function\s*\(\)\s*\{[\s\S]*rizq-lang-booting[\s\S]*rizq-lang-ready[\s\S]*\},\s*1500\)/.test(landing)
  || (/1500/.test(landing) && /rizq-lang-ready/.test(landing)
    && /rizq-lang-text-reveal/.test(landing)));

ok('CSS hides language texts via visibility (not body opacity)',
  /html\.rizq-lang-booting\s+:is\(/.test(landing)
  && /visibility:\s*hidden/.test(landing)
  && !/html\.rizq-lang-booting\s+body\s*\{\s*opacity\s*:\s*0/.test(landing));

ok('no whole-page body opacity hide while booting',
  !/html\.rizq-lang-booting\s+body\s*\{[^}]*opacity\s*:\s*0/.test(landing));

ok('CSS animation fallback reveals texts at 1.5s',
  /animation:\s*rizq-lang-text-reveal[^;]*1\.5s/.test(landing)
  || /rizq-lang-text-reveal\s+\.01s\s+linear\s+1\.5s/.test(landing));

ok('<noscript> cancels lang-text hide',
  /<noscript>[\s\S]*rizq-lang-boot-noscript[\s\S]*visibility:\s*visible!important/.test(landing));

ok('ticker min-width:100% retained (FR CLS)',
  /#ticker\.ticker-inner[\s\S]*min-width:\s*100%!important/.test(landing)
  || /\.ticker-inner\{min-width:100%!important/.test(landing));

console.log(fail
  ? ('\nlang-boot-guard: FAILED ' + fail + ' / ' + (pass + fail))
  : ('\nlang-boot-guard: ALL OK / ' + pass));
process.exit(fail ? 1 : 0);
