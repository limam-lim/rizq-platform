#!/usr/bin/env node
/** Tests: launchFreeUntil from site-config wins over env */
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

try {
  launchMode.setLaunchFreeUntilForTests(undefined);
  // Without site-config key in test override path: use env via getLaunchFreeUntil
  // Force env path by clearing test override and mocking — use test override for determinism
  launchMode.setLaunchFreeUntilForTests(undefined);

  // Admin date wins
  launchMode.setLaunchFreeUntilForTests('2027-03-15');
  check('admin freeUntil wins', launchMode.getLaunchFreeUntil() === '2027-03-15');
  check('free period active with future admin date', launchMode.isLaunchFreePeriodActive(Date.parse('2026-10-25T12:00:00Z')));

  // Empty admin = off (not env fallback when override is '')
  launchMode.setLaunchFreeUntilForTests('');
  check('empty admin clears freeUntil', launchMode.getLaunchFreeUntil() === null);
  check('empty admin disables free period', !launchMode.isLaunchFreePeriodActive(Date.parse('2026-10-25T12:00:00Z')));

  // parse helpers
  check('parseFreeUntil valid', launchMode.parseFreeUntil('2026-11-01') === '2026-11-01');
  check('parseFreeUntil invalid', launchMode.parseFreeUntil('not-a-date') === null);
  check('freeUntilEndMs', launchMode.freeUntilEndMs('2026-11-01') === Date.parse('2026-11-01T23:59:59.999Z'));

  const pub = launchMode.publicLaunchConfig({ store: true, estate: true, individual: true });
  launchMode.setLaunchFreeUntilForTests('2027-01-01');
  const pub2 = launchMode.publicLaunchConfig({ store: true });
  check('publicLaunchConfig exposes freeUntil', pub2.freeUntil === '2027-01-01' && pub2.freePeriodActive === true);
  check('publicLaunchConfig shape', Array.isArray(pub.openSections));
} finally {
  launchMode.setLaunchFreeUntilForTests(undefined);
  if (prevEnv === undefined) delete process.env.RIZQ_LAUNCH_FREE_UNTIL;
  else process.env.RIZQ_LAUNCH_FREE_UNTIL = prevEnv;
}

console.log('\n' + passed + '/' + total + ' checks passed\n');
process.exit(passed === total ? 0 : 1);
