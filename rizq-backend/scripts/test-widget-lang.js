#!/usr/bin/env node
const { detectUserLanguage, normalizeUiLang } = require('../services/widgetLang');

const cases = [
  ['كم سعر هذا؟', 'fr', 'ar'],
  ['Quel est le prix?', 'ar', 'fr'],
  ['How much is this ad?', 'ar', 'en'],
  ['¿Cuánto cuesta?', 'ar', 'es'],
  ['كيفاش ننشر إعلان؟', 'ar', 'hs'],
  ['', 'fr', 'fr'],
  ['???', 'en', 'en'],
  ['5000 MRU', 'fr', 'en'],
];

let ok = 0;
cases.forEach(([msg, ui, expected]) => {
  const got = detectUserLanguage(msg, ui);
  const pass = got === expected;
  console.log((pass ? 'OK' : 'FAIL') + '  ui=' + ui + ' msg="' + msg + '" → ' + got + (pass ? '' : ' (expected ' + expected + ')'));
  if (pass) ok++;
});

console.log('\n' + ok + '/' + cases.length + ' passed');
console.log('normalizeUiLang(fr):', normalizeUiLang('fr') === 'fr' ? 'OK' : 'FAIL');
process.exit(ok === cases.length ? 0 : 1);
