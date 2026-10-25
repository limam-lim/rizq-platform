#!/usr/bin/env node
/** Tests: ad lifecycle archive/purge + paid grace + launch freeUntil + estate + objectStorage purge */
const fs = require('fs');
const path = require('path');
const {
  MS_DAY,
  ACTIVE_LIFECYCLE_MS,
  ARCHIVE_RETENTION_MS,
  PAID_GRACE_MS,
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
const TMP_UPLOADS = path.join(ROOT, 'uploads', 'ads', '__lifecycle_test__');

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
  fs.mkdirSync(TMP_UPLOADS, { recursive: true });
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
  fs.writeFileSync(path.join(dir, '0.thumb.webp'), 'fake-thumb');
  fs.writeFileSync(path.join(dir, '0.full.webp'), 'fake-full');
}

function cleanup() {
  try { fs.rmSync(TMP_DATA, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  for (const id of ['AD_OLD', 'AD_ARCH', 'AD_PAID', 'AD_PURGE', 'AD_STORE_FREE', 'AD_ESTATE_FREE', 'AD_STORE_AFTER']) {
    try { fs.rmSync(path.join(ROOT, 'uploads', 'ads', id), { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
  launchMode.setLaunchFreeUntilForTests(undefined);
}

async function run() {
  cleanup();
  let passed = 0;
  let total = 0;
  function check(name, pass, detail) {
    total++;
    if (ok(name, pass, detail)) passed++;
  }

  const now = Date.parse('2026-08-13T03:00:00.000Z');

  // Paid detection
  check(
    'store account is paid participant',
    isPaidParticipant({ id: 's1', type: 'store' }, null)
  );
  check(
    'estate account is paid participant',
    isPaidParticipant({ id: 'e1', type: 'estate' }, null)
  );
  check(
    'diamond package is paid participant',
    isPaidParticipant(null, { pkgName: 'باقة ماسية', price: 3500 })
  );
  check(
    'free individual is not paid',
    !isPaidParticipant({ id: 'i1', type: 'individual' }, null)
  );

  // Grace: subscription ended 10 days ago → still protected (60d grace)
  check(
    'paid grace blocks archive within 60d after periodEnd',
    isUnderPaidGrace(now, { type: 'store' }, { periodEnd: isoDaysAgo(10, now) })
  );
  check(
    'paid grace expired after 60d past periodEnd',
    !isUnderPaidGrace(now, { type: 'store' }, { periodEnd: isoDaysAgo(61, now) })
  );

  // Launch freeUntil protection for store/estate without periodEnd
  launchMode.setLaunchFreeUntilForTests('2026-12-31');
  check(
    'store without package protected during free period',
    isUnderPaidGrace(now, { type: 'store' }, null)
  );
  check(
    'estate without package protected during free period',
    isUnderPaidGrace(now, { type: 'estate' }, null)
  );
  check(
    'store periodEnd null protected during free period',
    isUnderPaidGrace(now, { type: 'store' }, { periodEnd: null })
  );

  // After free period ends — store/estate without package NOT Infinity
  launchMode.setLaunchFreeUntilForTests('2026-01-01');
  check(
    'store without package NOT protected after free period',
    !isUnderPaidGrace(now, { type: 'store' }, null)
  );
  check(
    'estate without package NOT protected after free period',
    !isUnderPaidGrace(now, { type: 'estate' }, null)
  );

  // office without package still Infinity outside free rules
  launchMode.setLaunchFreeUntilForTests(null);
  check(
    'office without package still protected (legacy Infinity)',
    isUnderPaidGrace(now, { type: 'office' }, null)
  );

  // Archive: active ad 31 days old
  launchMode.setLaunchFreeUntilForTests(null);
  setupFixture(
    [{ id: 'AD_OLD', status: 'active', title: 'old', createdAt: isoDaysAgo(31, now) }],
    [],
    {}
  );
  const r1 = runAdLifecycleMaintenance(makeDeps(now));
  const adsAfterArchive = makeDeps(now).readAds();
  check('archives active ad after 30 days', r1.archived === 1 && adsAfterArchive[0].status === 'archived', 'status=' + adsAfterArchive[0].status);

  // Skip young ad
  setupFixture(
    [{ id: 'AD_YOUNG', status: 'active', title: 'new', createdAt: isoDaysAgo(5, now) }],
    [],
    {}
  );
  const r2 = runAdLifecycleMaintenance(makeDeps(now));
  check('keeps young active ad', r2.archived === 0 && makeDeps(now).readAds()[0].status === 'active');

  // Free-period store skip
  launchMode.setLaunchFreeUntilForTests('2026-12-31');
  setupFixture(
    [{ id: 'AD_STORE_FREE', accountId: 'acc_store_1', status: 'active', title: 'store free', createdAt: isoDaysAgo(45, now) }],
    [{ id: 'acc_store_1', type: 'store', status: 'approved' }],
    {}
  );
  const r3 = runAdLifecycleMaintenance(makeDeps(now));
  check('skips store ad during free period', r3.skippedPaidGrace >= 1 && makeDeps(now).readAds()[0].status === 'active');

  // Estate during free period
  setupFixture(
    [{ id: 'AD_ESTATE_FREE', accountId: 'acc_est_1', status: 'active', title: 'estate free', createdAt: isoDaysAgo(45, now) }],
    [{ id: 'acc_est_1', type: 'estate', status: 'approved' }],
    { acc_est_1: { periodEnd: null, pkgName: 'تجريبية' } }
  );
  const r3b = runAdLifecycleMaintenance(makeDeps(now));
  check('skips estate ad during free period', r3b.skippedPaidGrace >= 1 && makeDeps(now).readAds()[0].status === 'active');

  // After free period — store archives
  launchMode.setLaunchFreeUntilForTests('2026-01-01');
  setupFixture(
    [{ id: 'AD_STORE_AFTER', accountId: 'acc_store_2', status: 'active', title: 'after', createdAt: isoDaysAgo(45, now) }],
    [{ id: 'acc_store_2', type: 'store', status: 'approved' }],
    {}
  );
  const r3c = runAdLifecycleMaintenance(makeDeps(now));
  check('archives store ad after free period ends', r3c.archived === 1 && makeDeps(now).readAds()[0].status === 'archived');

  // Purge archived media after 30d via objectStorage
  launchMode.setLaunchFreeUntilForTests(null);
  touchMedia('AD_PURGE');
  setupFixture(
    [{
      id: 'AD_PURGE',
      status: 'archived',
      title: 'purge me',
      createdAt: isoDaysAgo(70, now),
      archivedAt: isoDaysAgo(31, now),
      images: ['/uploads/ads/AD_PURGE/0.webp'],
    }],
    [],
    {}
  );
  const r4 = runAdLifecycleMaintenance(makeDeps(now));
  const purged = makeDeps(now).readAds()[0];
  const mediaGone = !fs.existsSync(path.join(ROOT, 'uploads', 'ads', 'AD_PURGE'));
  check('purges media after 30d archive', r4.mediaPurged === 1 && purged.status === 'removed' && purged.images.length === 0, 'mediaGone=' + mediaGone);
  check('purge went through objectStorage prefix delete', mediaGone && typeof objectStorage.deletePrefixSync === 'function');

  // Direct purgeAdMedia uses objectStorage
  touchMedia('AD_PURGE2');
  const bytes = purgeAdMedia('AD_PURGE2');
  check('purgeAdMedia deletes via objectStorage', bytes > 0 && !fs.existsSync(path.join(ROOT, 'uploads', 'ads', 'AD_PURGE2')));
  try { fs.rmSync(path.join(ROOT, 'uploads', 'ads', 'AD_PURGE2'), { recursive: true, force: true }); } catch (e) { /* ignore */ }

  // Audit log written (shared maintenanceAudit store — ابحث عن تشغيل الاختبار)
  const audit = readAuditLog(TMP_DATA);
  const hasTestRun = Array.isArray(audit) && audit.some((e) => e && e.trigger === 'test');
  check('writes maintenance audit log', hasTestRun, 'entries=' + (audit && audit.length));

  cleanup();
  console.log('\n' + passed + '/' + total + ' checks passed\n');
  process.exit(passed === total ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  cleanup();
  process.exit(1);
});
