#!/usr/bin/env node
/** Estate packages: same activation/entitlement model as store/office */
'use strict';

const assert = require('assert');
const {
  ESTATE_PLANS,
  mapPackageIdToPlanType,
  mapPackageNameToPlanType,
} = require('../services/entitlements');
const { findCatalogPackage, DEFAULT_ESTATE_PACKAGES } = require('../services/catalogConfig');
const { isPaidParticipant, getPaidGraceDeadlineMs } = require('../services/adLifecycle');

let failed = 0;
function ok(name, pass, detail) {
  console.log((pass ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''));
  if (!pass) failed += 1;
}

ok('ESTATE_PLANS exported', !!ESTATE_PLANS && !!ESTATE_PLANS.estate_monthly);
ok('DEFAULT_ESTATE_PACKAGES has 6 tiers', Array.isArray(DEFAULT_ESTATE_PACKAGES) && DEFAULT_ESTATE_PACKAGES.length === 6);

const ids = [
  ['es-trial', 'estate_trial', 3],
  ['es-month', 'estate_monthly', 25],
  ['es-quart', 'estate_quarterly', 80],
  ['es-year', 'estate_yearly', 200],
  ['es-diam-std', 'estate_diamond', Infinity],
  ['es-diam-pro', 'estate_diamond_pro', Infinity],
];

ids.forEach(([id, plan, maxItems]) => {
  const mapped = mapPackageIdToPlanType(id, 'estate');
  ok(id + ' → ' + plan, mapped === plan, mapped);
  const def = ESTATE_PLANS[plan];
  ok(id + ' maxCatalogItems=' + maxItems, def && def.maxCatalogItems === maxItems, def && def.maxCatalogItems);
});

ok(
  'name fallback شهرية عقارات',
  mapPackageNameToPlanType('شهرية عقارات', 'estate') === 'estate_monthly'
);
ok(
  'unknown es-* id with estate type falls back to estate_monthly',
  mapPackageIdToPlanType('es-custom', 'estate') === 'estate_monthly'
);
ok(
  'office type still maps of-month to office_monthly',
  mapPackageIdToPlanType('of-month', 'office') === 'office_monthly'
);

const cat = findCatalogPackage({ id: 'es-month', category: 'estate' });
ok('findCatalogPackage es-month', !!(cat && cat.id === 'es-month'), cat && cat.id);

ok('estate is paid participant', isPaidParticipant({ type: 'estate' }, null) === true);
ok(
  'estate without pkg → Infinity grace (same as store)',
  getPaidGraceDeadlineMs({ type: 'estate' }, null) === Infinity
);

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nAll estate package parity checks passed');
