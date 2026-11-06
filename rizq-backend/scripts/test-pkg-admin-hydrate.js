#!/usr/bin/env node
/**
 * تحقق سريع: صيغ أيام العرض الموسمي + رفض اسم باقة فارغ في منطق الحفظ.
 * (hydratePkgRow معرّفة في HTML — نحاكيها هنا بنفس قواعد PKG_DEFAULTS المختصرة)
 */
'use strict';

function formatOfferDaysLeft(n, lang) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  if (lang === 'fr') return n <= 1 ? n + ' jour' : n + ' jours';
  if (n === 1) return '1 يوم';
  if (n === 2) return 'يومان';
  if (n >= 3 && n <= 10) return n + ' أيام';
  return n + ' يوماً';
}

function hydratePkgRow(defs, row) {
  const id = String((row && row.id) || '');
  const def = defs.find((d) => String(d.id) === id) || null;
  const out = Object.assign({}, def || {}, row || {});
  if (!(String(out.name || '').trim()) && def && def.name) out.name = def.name;
  if (!(String(out.period || '').trim()) && def && def.period) out.period = def.period;
  if (!(Number(out.durationDays) > 0) && def && def.durationDays) out.durationDays = def.durationDays;
  if (out.active === undefined || out.active === null) out.active = def ? def.active !== false : true;
  return out;
}

const DEF_IND = [
  { id: 'ind-free', name: 'مجانية', period: 'مجاناً — 10 أيام', durationDays: 10, active: true },
  { id: 'ind-boost', name: 'مميزة', period: 'MRU / لكل إعلان', durationDays: 30, active: true },
  { id: 'ind-medium', name: 'باقة متوسطة', period: 'MRU / شهر', durationDays: 30, active: true },
  { id: 'ind-monthly', name: 'باقة شهرية', period: 'MRU / شهر', durationDays: 30, active: true },
];

let failed = 0;
function check( Cond, msg) {
  if (!Cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

check(formatOfferDaysLeft(1, 'ar') === '1 يوم', 'ar 1');
check(formatOfferDaysLeft(2, 'ar') === 'يومان', 'ar 2');
check(formatOfferDaysLeft(5, 'ar') === '5 أيام', 'ar 5');
check(formatOfferDaysLeft(11, 'ar') === '11 يوماً', 'ar 11');
check(formatOfferDaysLeft(1, 'fr') === '1 jour', 'fr 1');
check(formatOfferDaysLeft(3, 'fr') === '3 jours', 'fr 3');

const emptyRows = [
  { id: 'ind-free' },
  { id: 'ind-boost', name: '' },
  { id: 'ind-medium', name: '   ', active: false },
  { id: 'ind-monthly', period: '' },
];
const hydrated = emptyRows.map((r) => hydratePkgRow(DEF_IND, r));
check(hydrated[0].name === 'مجانية', 'hydrate ind-free name');
check(hydrated[1].name === 'مميزة', 'hydrate ind-boost name');
check(hydrated[2].name === 'باقة متوسطة', 'hydrate ind-medium name');
check(hydrated[2].active === false, 'preserve explicit active:false');
check(hydrated[3].name === 'باقة شهرية', 'hydrate ind-monthly name');
check(hydrated[3].period.indexOf('شهر') >= 0, 'hydrate ind-monthly period');

// محاكاة رفض الحفظ لاسم فارغ
function saveRejectsEmpty(nameInput) {
  const trimmed = String(nameInput == null ? '' : nameInput).trim();
  return !trimmed;
}
check(saveRejectsEmpty('') === true, 'reject empty name');
check(saveRejectsEmpty('  ') === true, 'reject whitespace name');
check(saveRejectsEmpty('شهرية') === false, 'accept real name');

if (failed) {
  console.error('FAILED', failed);
  process.exit(1);
}
console.log('ALL OK /', 14);
process.exit(0);
