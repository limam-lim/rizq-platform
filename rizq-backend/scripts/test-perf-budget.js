#!/usr/bin/env node
/**
 * بوابة أداء الرئيسية — تفشل إذا:
 *  - حجم rizq_landing_v8.html > 150 KB
 *  - سكربت/CSS مكرّر في الصفحة
 *  - سكربت خارجي حاجب (بلا defer/async) غير موثّق في قائمة السماح
 *
 * تشغيل: npm run test:perf-budget
 * لا يحتاج قاعدة بيانات.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const LANDING = path.join(ROOT, 'rizq_landing_v8.html');
const MAX_HTML_BYTES = 150 * 1024;

/**
 * سكربتات خارجية حاجبة مسموحة (موثّقة) — حالياً لا يُسمح بأي src بلا defer/async.
 * يبقى التزامن للـ inline فقط (lang/dir، حجز الهيدر) كما في تعليق PERF sync في HTML.
 */
const ALLOWED_BLOCKING_SRC = new Set([]);

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log('  ✓', name);
  } else {
    fail += 1;
    console.log('  ✗', name, extra !== undefined ? String(extra).slice(0, 500) : '');
  }
}

if (!fs.existsSync(LANDING)) {
  console.error('missing', LANDING);
  process.exit(1);
}

const html = fs.readFileSync(LANDING);
const htmlStr = html.toString('utf8');
const htmlBytes = html.length;

ok(
  'landing HTML ≤ 150KB',
  htmlBytes <= MAX_HTML_BYTES,
  htmlBytes + ' bytes (max ' + MAX_HTML_BYTES + ')'
);

ok(
  'PERF sync documentation present',
  /PERF sync \(allowed/.test(htmlStr),
  'missing <!-- PERF sync (allowed...) --> comment'
);

const scriptSrcs = [...htmlStr.matchAll(/<script\b([^>]*)>/gi)].map((m) => {
  const attrs = m[1] || '';
  const srcM = attrs.match(/\bsrc=["']([^"']+)["']/i);
  if (!srcM) return null;
  const src = srcM[1];
  const defer = /\bdefer\b/i.test(attrs);
  const async = /\basync\b/i.test(attrs);
  return { src, base: src.split('?')[0], defer, async, tag: m[0].slice(0, 160) };
}).filter(Boolean);

const cssHrefs = [...htmlStr.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["']/gi)]
  .concat([...htmlStr.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']stylesheet["']/gi)])
  .map((m) => m[1].split('?')[0]);

const scriptCounts = {};
scriptSrcs.forEach((s) => {
  scriptCounts[s.base] = (scriptCounts[s.base] || 0) + 1;
});
const scriptDupes = Object.entries(scriptCounts).filter(([, c]) => c > 1);

const cssCounts = {};
cssHrefs.forEach((h) => {
  cssCounts[h] = (cssCounts[h] || 0) + 1;
});
const cssDupes = Object.entries(cssCounts).filter(([, c]) => c > 1);

ok('zero duplicate external scripts', scriptDupes.length === 0, JSON.stringify(scriptDupes));
ok('zero duplicate stylesheets', cssDupes.length === 0, JSON.stringify(cssDupes));

const blocking = scriptSrcs.filter((s) => !s.defer && !s.async);
const undocumented = blocking.filter((s) => !ALLOWED_BLOCKING_SRC.has(s.base));
ok(
  'zero undocumented blocking external scripts',
  undocumented.length === 0,
  undocumented.map((s) => s.src).join(', ')
);

/* ملفات كانت تُحمَّل مرتين تاريخياً — تأكد أنها تظهر مرة واحدة كحد أقصى في HTML */
const historicallyDuped = [
  'rizq_packages_config.js',
  'rizq_packages_ui.js',
  'rizq_merchant_activities.js',
  'rizq_activity_select.js',
  'rizq_backend_config.js',
  'rizq_phone_utils.js',
  'rizq_verification_policy.js',
  'rizq_contact_gate.js',
  'fonts/cairo.css',
  'cairo.css',
];
historicallyDuped.forEach((base) => {
  const n = scriptCounts[base] || cssCounts[base] || cssCounts['fonts/' + base] || 0;
  ok(base + ' not duplicated in landing HTML', n <= 1, 'count=' + n);
});

console.log('\nhtmlBytes=', htmlBytes, 'scripts=', scriptSrcs.length, 'blocking=', blocking.length);
console.log(fail ? '\nFAILED ' + fail + ' / ' + (pass + fail) : '\nALL OK / ' + pass);
process.exit(fail ? 1 : 0);
