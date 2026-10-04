#!/usr/bin/env node
/**
 * Offline manager agent — Hassaniya must not reply «ما فهمتها» for common phrases.
 * Run: node rizq-backend/scripts/test-offline-hassaniya.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

global.localStorage = {
  _d: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};
global.window = global;
global.location = { pathname: '/' };

const file = path.join(__dirname, '..', '..', 'rizq_manager_agent_config.js');
const mod = new Module(file, module);
mod.filename = file;
mod.paths = Module._nodeModulePaths(path.dirname(file));
mod._compile(fs.readFileSync(file, 'utf8'), file);
const api = mod.exports;
const pm = api && api.processMessage;
if (typeof pm !== 'function') {
  console.error('RizqManager.processMessage not found');
  process.exit(1);
}

const cases = [
  ['شنهو تبي؟', 'hs', /ما فهمت/i],
  ['أهلين، شحّال الباقة؟', 'hs', /ما فهمت/i],
  ['كيفاش ننشر إعلان؟', 'hs', /ما فهمت|أهلين! 😊 شنهو تبي\؟$/i],
  ['كيفاه ننشر إعلان', 'hs', /ما فهمت/i],
  ['شحّال الباقة', 'hs', /ما فهمت/i],
  ['نبي ننشر إعلان', 'hs', /ما فهمت/i],
];

let ok = 0;
cases.forEach(([msg, expectLang, badRe]) => {
  const r = pm(msg, { uiLang: 'ar' });
  const langOk = r.lang === expectLang;
  const noMiss = !badRe.test(String(r.reply || ''));
  const pass = langOk && noMiss;
  console.log(
    (pass ? 'OK' : 'FAIL') +
    '  lang=' + r.lang +
    ' msg="' + msg + '" → ' + String(r.reply || '').slice(0, 70).replace(/\n/g, ' | ')
  );
  if (pass) ok++;
});

console.log('\n' + ok + '/' + cases.length + ' passed');
process.exit(ok === cases.length ? 0 : 1);
