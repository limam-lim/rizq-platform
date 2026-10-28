#!/usr/bin/env node
/** Tests: A1 protectedUntil + dry-run + purge via objectStorage */
const fs = require('fs');
const path = require('path');
const {
  MS_DAY,
  isPaidParticipant,
  isUnderPaidGrace,
  runAdLifecycleMaintenance,
  readAuditLog,
  purgeAdMedia,
} = require('../services/adLifecycle');
const launchMode = require('../config/launchMode');
const objectStorage = require('../lib/objectStorage');

const ROOT = path.join(__dirname, '..');
const TMP_DATA = path.join(ROOT, 'data', '__lifecycle_test__');

function ok(name, pass, detail) {
  console.log((pass ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''));
  return pass;
}

function isoDaysAgo(days, fromMs) {
  return new Date((fromMs || Date.now()) - days * MS_DAY).toISOString();
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function setupFixture(ads, accounts, pkgStore) {
  fs.mkdirSync(TMP_DATA, { recursive: true });
  writeJson(path.join(TMP_DATA, 'ads.json'), ads);
  writeJson(path.join(TMP_DATA, 'accounts.json'), accounts);
  writeJson(path.join(TMP_DATA, 'account-packages.json'), pkgStore || {});
}

function makeDeps(nowMs) {
  return {
    readAds: () => JSON.parse(fs.readFileSync(path.join(TMP_DATA, 'ads.json'), 'utf8')),
    writeAds: (list) => writeJson(path.join(TMP_DATA, 'ads.json'), list),
    readAccounts: () => JSON.parse(fs.readFileSync(path.join(TMP_DATA, 'accounts.json'), 'utf8')),
    getAccountRecord: (id) => {
      const store = JSON.parse(fs.readFileSync(path.join(TMP_DATA, 'account-packages.json'), 'utf8'));
      return store[id] || null;
    },
    adsUploadsDir: path.join(ROOT, 'uploads', 'ads'),
    dataDir: TMP_DATA,
    nowMs,
    trigger: 'test',
  };
}

function touchMedia(adId) {
  const dir = path.join(ROOT, 'uploads', 'ads', adId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '0.webp'), 'fake-webp-bytes-for-test');
}

function cleanup() {
  try { fs.rmSync(TMP_DATA, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  for (const id of ['AD_OLD', 'AD_PURGE', 'AD_STORE_FREE', 'AD_ESTATE_FREE', 'AD_DRY', 'AD_PURGE2', 'AD_OFFICE']) {
    try { fs.rmSync(path.join(ROOT, 'uploads', 'ads', id), { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
  launchMode.setLaunchSettingsForTests(undefined);
}

async function run() {
  cleanup();
  let passed = 0;
  let total = 0;
  function check(name, pass, detail) {
    total++;
    if (ok(name, pass, detail)) passed++;
  }

  const now = Date.parse('2026-10-25T12:00:00.000Z');

  check('store is paid type', isPaidParticipant({ type: 'store' }, null));
  check('estate is paid type', isPaidParticipant({ type: 'estate' }, null));
  check('individual not paid type', !isPaidParticipant({ type: 'individual' }, null));

  // With launchDate set — freeUntil+60 protects store/estate/office without periodEnd
  launchMode.setLaunchSettingsForTests({ launchDate: '2026-10-01', freeDays: 90 });
  check('store protected via freeUntil+60', await isUnderPaidGrace(now, { type: 'store' }, null));
  check('estate protected via freeUntil+60', await isUnderPaidGrace(now, { type: 'estate' }, { periodEnd: null }));
  check('office protected via freeUntil+60 (no Infinity)', await isUnderPaidGrace(now, { type: 'office' }, null));

  const periodEnd = '2026-11-01T00:00:00.000Z';
  check(
    'periodEnd+60 still protects',
    await isUnderPaidGrace(now, { type: 'store' }, { periodEnd })
  );
  check(
    'periodEnd+60 expired after grace',
    !(await isUnderPaidGrace(
      Date.parse(periodEnd) + 61 * MS_DAY,
      { type: 'store' },
      { periodEnd }
    ))
  );

  // Dry-run when launchDate empty
  launchMode.setLaunchSettingsForTests({ launchDate: '', freeDays: 90, freeUntil: null });
  process.env.RIZQ_LAUNCH_FREE_UNTIL = '';
  setupFixture(
    [{ id: 'AD_DRY', status: 'active', title: 'dry', createdAt: isoDaysAgo(45, now) }],
    [],
    {}
  );
  const rDry = await runAdLifecycleMaintenance(makeDeps(now));
  const afterDry = makeDeps(now).readAds()[0];
  check('dry-run does not archive', rDry.dryRun === true && afterDry.status === 'active' && rDry.wouldArchive >= 1, 'would=' + rDry.wouldArchive);
  check('dry-run archived count 0', rDry.archived === 0);

  // Real archive when launchDate set and unprotected individual
  launchMode.setLaunchSettingsForTests({ launchDate: '2026-10-01', freeDays: 90 });
  setupFixture(
    [{ id: 'AD_OLD', status: 'active', title: 'old', createdAt: isoDaysAgo(45, now) }],
    [],
    {}
  );
  const r1 = await runAdLifecycleMaintenance(makeDeps(now));
  check('archives unprotected ad', r1.archived === 1 && makeDeps(now).readAds()[0].status === 'archived');

  // Store during free+grace skipped
  setupFixture(
    [{ id: 'AD_STORE_FREE', accountId: 's1', status: 'active', title: 's', createdAt: isoDaysAgo(45, now) }],
    [{ id: 's1', type: 'store' }],
    {}
  );
  const r2 = await runAdLifecycleMaintenance(makeDeps(now));
  check('skips store under freeUntil+60', r2.skippedPaidGrace >= 1 && makeDeps(now).readAds()[0].status === 'active');

  // Estate same
  setupFixture(
    [{ id: 'AD_ESTATE_FREE', accountId: 'e1', status: 'active', title: 'e', createdAt: isoDaysAgo(45, now) }],
    [{ id: 'e1', type: 'estate' }],
    { e1: { periodEnd: null } }
  );
  const r3 = await runAdLifecycleMaintenance(makeDeps(now));
  check('skips estate under freeUntil+60', r3.skippedPaidGrace >= 1 && makeDeps(now).readAds()[0].status === 'active');

  // After freeUntil+60 — store archives
  const afterGrace = launchMode.freeUntilEndMs(await launchMode.getLaunchFreeUntil()) + 61 * MS_DAY;
  setupFixture(
    [{ id: 'AD_STORE_FREE', accountId: 's2', status: 'active', title: 'late', createdAt: isoDaysAgo(45, afterGrace) }],
    [{ id: 's2', type: 'store' }],
    {}
  );
  const r4 = await runAdLifecycleMaintenance(makeDeps(afterGrace));
  check('archives store after freeUntil+60', r4.archived === 1 && makeDeps(afterGrace).readAds()[0].status === 'archived');

  // Purge via objectStorage
  touchMedia('AD_PURGE');
  setupFixture(
    [{
      id: 'AD_PURGE',
      status: 'archived',
      createdAt: isoDaysAgo(70, now),
      archivedAt: isoDaysAgo(31, now),
      images: ['/uploads/ads/AD_PURGE/0.webp'],
    }],
    [],
    {}
  );
  const r5 = await runAdLifecycleMaintenance(makeDeps(now));
  const purged = makeDeps(now).readAds()[0];
  check('purges media via objectStorage', r5.mediaPurged === 1 && purged.status === 'removed' && !fs.existsSync(path.join(ROOT, 'uploads', 'ads', 'AD_PURGE')));
  check('deletePrefix available', typeof objectStorage.deletePrefixSync === 'function');

  touchMedia('AD_PURGE2');
  check('purgeAdMedia works', purgeAdMedia('AD_PURGE2') > 0);

  const audit = await readAuditLog(TMP_DATA);
  check('audit has test runs', Array.isArray(audit) && audit.some((e) => e && e.trigger === 'test'));

  cleanup();
  console.log('\n' + passed + '/' + total + ' checks passed\n');
  process.exit(passed === total ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  cleanup();
  process.exit(1);
});
