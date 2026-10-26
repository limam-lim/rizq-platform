#!/usr/bin/env node
/** Tests: launchDate + freeDays → freeUntil; env fallback; dry-run; protectedUntil */
'use strict';

const launchMode = require('../config/launchMode');

function ok(name, pass, detail) {
  console.log((pass ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''));
  return pass;
}

let passed = 0;
let total = 0;
function check(name, pass, detail) {
  total++;
  if (ok(name, pass, detail)) passed++;
}

const prevEnv = process.env.RIZQ_LAUNCH_FREE_UNTIL;
process.env.RIZQ_LAUNCH_FREE_UNTIL = '2026-12-31';
const now = Date.parse('2026-10-25T12:00:00.000Z');

try {
  // launchDate + freeDays
  launchMode.setLaunchSettingsForTests({ launchDate: '2026-10-01', freeDays: 90 });
  const s1 = launchMode.getLaunchSettings();
  check('freeUntil = launchDate + 90', s1.freeUntil === '2026-12-30', s1.freeUntil);
  check('source site-config', s1.source === 'site-config');
  check('not dry-run when launchDate set', s1.maintenanceDryRun === false);
  check('free period active', launchMode.isLaunchFreePeriodActive(now) === true);

  // empty launchDate → dry-run + env fallback
  launchMode.setLaunchSettingsForTests({ launchDate: '', freeDays: 90 });
  const s2 = launchMode.getLaunchSettings();
  check('dry-run when launchDate empty', s2.maintenanceDryRun === true);
  check('env fallback freeUntil', s2.freeUntil === '2026-12-31', s2.freeUntil);
  check('source env', s2.source === 'env');

  // protectedUntil rules
  launchMode.setLaunchSettingsForTests({ launchDate: '2026-10-01', freeDays: 90 });
  const freeEnd = launchMode.freeUntilEndMs('2026-12-30');
  const grace = 60 * launchMode.MS_DAY;

  const pStore = launchMode.getProtectedUntilMs({ type: 'store' }, null, now);
  check('store without periodEnd → freeUntil+60', pStore === freeEnd + grace, String(pStore));

  const pEstate = launchMode.getProtectedUntilMs({ type: 'estate' }, { periodEnd: null }, now);
  check('estate periodEnd null → freeUntil+60', pEstate === freeEnd + grace);

  const periodEnd = '2026-11-15T00:00:00.000Z';
  const pPaid = launchMode.getProtectedUntilMs({ type: 'store' }, { periodEnd }, now);
  check('store with periodEnd → periodEnd+60', pPaid === Date.parse(periodEnd) + grace);

  const pOffice = launchMode.getProtectedUntilMs({ type: 'office' }, null, now);
  check('office without package → freeUntil+60 (no Infinity)', pOffice === freeEnd + grace);
  check('no Infinity', pOffice !== Infinity && pStore !== Infinity);

  // after freeUntil+60 elapsed → not protected
  const after = freeEnd + grace + 1000;
  check('not protected after freeUntil+60', launchMode.isUnderProtection(after, { type: 'store' }, null) === false);

  const pub = launchMode.publicLaunchConfig({ store: true }, now);
  check('public has launchDate/freeDays/daysRemaining', !!(pub.launchDate && pub.freeDays === 90 && pub.daysRemaining != null));
  check('public maintenanceDryRun false', pub.maintenanceDryRun === false);

  check('addDaysYmd', launchMode.addDaysYmd('2026-01-01', 10) === '2026-01-11');
  check('normalizeFreeDays default', launchMode.normalizeFreeDays(undefined) === 90);
} finally {
  launchMode.setLaunchSettingsForTests(undefined);
  if (prevEnv === undefined) delete process.env.RIZQ_LAUNCH_FREE_UNTIL;
  else process.env.RIZQ_LAUNCH_FREE_UNTIL = prevEnv;
}

console.log('\n' + passed + '/' + total + ' checks passed\n');
process.exit(passed === total ? 0 : 1);
