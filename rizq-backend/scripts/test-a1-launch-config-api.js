#!/usr/bin/env node
/** A1: launch-config save rules (past confirm + audit) via repos + launchMode */
'use strict';

const repos = require('../db/repos');
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

function saveLaunch(body) {
  const current = repos.getSiteConfig() || {};
  const prevDate = launchMode.parseYmd(current.launchDate) || '';
  const prevDays = launchMode.normalizeFreeDays(
    current.freeDays != null && current.freeDays !== '' ? current.freeDays : launchMode.DEFAULT_FREE_DAYS
  );
  let nextDate = prevDate;
  if (Object.prototype.hasOwnProperty.call(body, 'launchDate')) {
    if (body.launchDate === null || body.launchDate === '') nextDate = '';
    else nextDate = launchMode.parseYmd(body.launchDate) || '';
  }
  let nextDays = prevDays;
  if (Object.prototype.hasOwnProperty.call(body, 'freeDays')) {
    nextDays = launchMode.normalizeFreeDays(body.freeDays);
  }
  const nextUntil = nextDate ? launchMode.addDaysYmd(nextDate, nextDays) : null;
  const endMs = nextUntil ? launchMode.freeUntilEndMs(nextUntil) : null;
  const inPast = !!(endMs != null && endMs < Date.now());
  if (inPast && body.confirmPast !== true) {
    return { status: 409, error: 'needs_confirm_past', freeUntil: nextUntil };
  }
  const next = Object.assign({}, current, { launchDate: nextDate, freeDays: nextDays });
  delete next.launchFreeUntil;
  const list = Array.isArray(next.launchAudit) ? next.launchAudit.slice() : [];
  list.unshift({
    at: new Date().toISOString(),
    by: 'test-super',
    old: { launchDate: prevDate || null, freeDays: prevDays },
    new: { launchDate: nextDate || null, freeDays: nextDays, freeUntil: nextUntil },
  });
  next.launchAudit = list.slice(0, 80);
  repos.saveSiteConfig(next);
  return { status: 200, ok: true, launch: launchMode.publicLaunchConfig({}), stored: { launchDate: nextDate, freeDays: nextDays }, audit: next.launchAudit };
}

const snap = Object.assign({}, repos.getSiteConfig() || {});

try {
  // clear first
  let r = saveLaunch({ launchDate: '', freeDays: 90 });
  check('clear launchDate ok', r.status === 200 && r.launch.maintenanceDryRun === true);

  r = saveLaunch({ launchDate: '2020-01-01', freeDays: 30 });
  check('past freeUntil needs confirm', r.status === 409 && r.error === 'needs_confirm_past');

  r = saveLaunch({ launchDate: '2020-01-01', freeDays: 30, confirmPast: true });
  check('past with confirm saves', r.status === 200 && r.stored.launchDate === '2020-01-01');
  check('audit written', Array.isArray(r.audit) && r.audit[0] && r.audit[0].by === 'test-super');

  r = saveLaunch({ launchDate: '2026-10-01', freeDays: 90 });
  check('future launch computes freeUntil', r.status === 200 && r.launch.freeUntil === '2026-12-30');
  check('not dry-run', r.launch.maintenanceDryRun === false);
  check('daysRemaining present', r.launch.daysRemaining != null);
} finally {
  // restore previous site-config snapshot fields we care about
  const cur = repos.getSiteConfig() || {};
  const restored = Object.assign({}, cur, {
    launchDate: snap.launchDate || '',
    freeDays: snap.freeDays != null ? snap.freeDays : 90,
    launchAudit: snap.launchAudit || [],
  });
  if (!snap.launchFreeUntil) delete restored.launchFreeUntil;
  repos.saveSiteConfig(restored);
}

console.log('\n' + passed + '/' + total + ' checks passed\n');
process.exit(passed === total ? 0 : 1);
