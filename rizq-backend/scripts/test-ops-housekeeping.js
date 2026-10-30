#!/usr/bin/env node
/** B1–B4: renewal reminders, cleanups, uploadLimits, weekly report (+ dry-run) */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), override: true });

const fs = require('fs');
const path = require('path');
const launchMode = require('../config/launchMode');
const uploadLimits = require('../services/uploadLimits');
const db = require('../db');
const repos = require('../db/repos');
const {
  MS_DAY,
  FREE_AD_ACTIVE_MS,
  REMIND_BEFORE_MS,
  runRenewalReminders,
  runCleanups,
  buildWeeklyReport,
  runOpsHousekeepingPass,
  setSendEmailImplForTests,
} = require('../services/opsHousekeeping');
const {
  DEFAULT_CRON,
  DEFAULT_WEEKLY_CRON,
  DEFAULT_TZ,
} = require('../services/maintenanceScheduler');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(ROOT, 'data', '__ops_hk_test__');
const ADS_UP = path.join(ROOT, 'uploads', 'ads');

function ok(name, pass, detail) {
  console.log((pass ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''));
  return pass;
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function touchMedia(adId) {
  const dir = path.join(ADS_UP, adId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '0.webp'), 'ops-media-' + adId);
}

async function cleanup() {
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  ['AD_REM', 'AD_SOLD', 'AD_DRAFT', 'AD_PROT'].forEach((id) => {
    try { fs.rmSync(path.join(ADS_UP, id), { recursive: true, force: true }); } catch (e) { /* ignore */ }
  });
  launchMode.setLaunchSettingsForTests(undefined);
  // wipe test notifications/reports by id prefix
  try {
    for (const n of ((await repos.accountNotifications.list()) || [])) {
      if (n && String(n.meta && n.meta.adId || '').startsWith('AD_')) {
        await repos.accountNotifications.remove(n.id);
      }
      if (n && n.type === 'unverified_warning' && String(n.accountId || '').startsWith('acc_uv_')) {
        await repos.accountNotifications.remove(n.id);
      }
    }
  } catch (e) { /* ignore */ }
  try {
    for (const r of ((await repos.weeklyOpsReports.list()) || [])) {
      if (r && String(r.id || '').startsWith('ops_')) await repos.weeklyOpsReports.remove(r.id);
    }
  } catch (e) { /* ignore */ }
}

function makeDeps(nowMs, ads, accounts, pkgs) {
  writeJson(path.join(TMP, 'ads.json'), ads);
  writeJson(path.join(TMP, 'accounts.json'), accounts);
  writeJson(path.join(TMP, 'account-packages.json'), pkgs || {});
  return {
    readAds: () => JSON.parse(fs.readFileSync(path.join(TMP, 'ads.json'), 'utf8')),
    writeAds: (list) => writeJson(path.join(TMP, 'ads.json'), list),
    readAccounts: () => JSON.parse(fs.readFileSync(path.join(TMP, 'accounts.json'), 'utf8')),
    writeAccounts: (list) => writeJson(path.join(TMP, 'accounts.json'), list),
    getAccountRecord: (id) => {
      const store = JSON.parse(fs.readFileSync(path.join(TMP, 'account-packages.json'), 'utf8'));
      return store[id] || null;
    },
    adsUploadsDir: ADS_UP,
    dataDir: TMP,
    nowMs,
    trigger: 'test',
  };
}

async function run() {
  await db.ready();
  await cleanup();
  let passed = 0;
  let total = 0;
  function check(name, pass, detail) {
    total++;
    if (ok(name, pass, detail)) passed++;
  }

  // ── B3 uploadLimits ──────────────────────────────────────
  const defaults = uploadLimits.getUploadLimitsConfig({});
  check('B3 individual 5 photos', defaults.individual.maxPhotosPerAd === 5);
  check('B3 store 8 photos', defaults.store.maxPhotosPerAd === 8);
  check('B3 estate 10 photos', defaults.estate.maxPhotosPerAd === 10);
  check('B3 corp 4MB', defaults.corp.maxImageBytes === 4 * 1024 * 1024);
  const custom = uploadLimits.getUploadLimitsConfig({
    uploadLimits: { store: { maxPhotosPerAd: 12, maxImageBytes: 5 * 1024 * 1024 } },
  });
  check('B3 site-config override store', custom.store.maxPhotosPerAd === 12);
  check('B3 clamp max 30', uploadLimits.sanitizeTypeLimits({ maxPhotosPerAd: 99 }, defaults.default).maxPhotosPerAd === 30);

  const now = Date.parse('2026-10-25T12:00:00.000Z');

  // ── dry-run (launchDate empty) ───────────────────────────
  launchMode.setLaunchSettingsForTests({ launchDate: '', freeDays: 90 });
  check('dry-run active', (await launchMode.isMaintenanceDryRun()) === true);

  const sinceRem = new Date(now - (FREE_AD_ACTIVE_MS - 2 * MS_DAY)).toISOString(); // ~2d left
  const soldAt = new Date(now - 8 * MS_DAY).toISOString();
  const draftAt = new Date(now - 15 * MS_DAY).toISOString();
  const uvCreated = new Date(now - 91 * MS_DAY).toISOString();

  const adsDry = [
    {
      id: 'AD_REM', accountId: 'acc_ind', status: 'active', title: 'تذكير',
      publishedAt: sinceRem, createdAt: sinceRem, images: ['/uploads/ads/AD_REM/0.webp'],
    },
    {
      id: 'AD_SOLD', accountId: 'acc_ind', status: 'sold', title: 'مباع',
      soldAt, createdAt: soldAt, images: ['/uploads/ads/AD_SOLD/0.webp'],
    },
    {
      id: 'AD_DRAFT', accountId: 'acc_ind', status: 'draft', title: 'مسودة',
      createdAt: draftAt, images: [],
    },
  ];
  const accountsDry = [
    { id: 'acc_ind', type: 'individual', email: 'ind@test.local', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'acc_uv_1', type: 'individual', email: 'uv@test.local', status: 'pending', createdAt: uvCreated },
  ];
  touchMedia('AD_REM');
  touchMedia('AD_SOLD');

  let deps = makeDeps(now, adsDry, accountsDry, {});
  const remDry = await runRenewalReminders(deps);
  check('B1 dry-run wouldRemind', remDry.dryRun === true && remDry.wouldRemind >= 1, JSON.stringify(remDry));
  check('B1 dry-run no notify write', remDry.reminded === 0);

  const cleanDry = await runCleanups(deps);
  check('B2 dry-run wouldSold', cleanDry.wouldSoldPurge >= 1);
  check('B2 dry-run wouldDraft', cleanDry.wouldDraftsRemove >= 1);
  check('B2 dry-run wouldUnverifiedWarn', cleanDry.wouldUnverifiedWarn >= 1);
  check('B2 dry-run media still present', fs.existsSync(path.join(ADS_UP, 'AD_SOLD', '0.webp')));

  // ── real run with launchDate set (no dry-run) ────────────
  launchMode.setLaunchSettingsForTests({ launchDate: '2026-10-01', freeDays: 90 });
  check('not dry-run', (await launchMode.isMaintenanceDryRun()) === false);

  // protect store account from cleanup
  const adsLive = [
    {
      id: 'AD_REM', accountId: 'acc_ind', status: 'active', title: 'تذكير حي',
      publishedAt: sinceRem, createdAt: sinceRem, images: [],
    },
    {
      id: 'AD_SOLD', accountId: 'acc_ind', status: 'sold', title: 'مباع حي',
      soldAt, createdAt: soldAt, images: ['/uploads/ads/AD_SOLD/0.webp'],
    },
    {
      id: 'AD_DRAFT', accountId: 'acc_ind', status: 'draft', title: 'مسودة حية',
      createdAt: draftAt, images: [],
    },
    {
      id: 'AD_PROT', accountId: 'acc_store', status: 'sold', title: 'محمي',
      soldAt, createdAt: soldAt, images: ['/uploads/ads/AD_PROT/0.webp'],
    },
  ];
  const accountsLive = [
    { id: 'acc_ind', type: 'individual', email: 'ind@test.local', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'acc_store', type: 'store', email: 'store@test.local', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'acc_uv_1', type: 'individual', email: 'uv@test.local', status: 'pending', createdAt: uvCreated },
  ];
  touchMedia('AD_SOLD');
  touchMedia('AD_PROT');
  deps = makeDeps(now, adsLive, accountsLive, {});

  const emailsSent = [];
  setSendEmailImplForTests(async (to, subject, html) => {
    emailsSent.push({ to, subject, html: String(html || '').slice(0, 200) });
    return { ok: true };
  });

  const rem = await runRenewalReminders(deps);
  check('B1 reminded', rem.reminded >= 1, JSON.stringify(rem));
  const notes = ((await repos.accountNotifications.list()) || []).filter((n) => n.accountId === 'acc_ind' && n.type === 'ad_renewal_reminder');
  check('B1 notification stored', notes.length >= 1);
  check('B1 notified count', rem.notified >= 1);
  check('B1 email attempted', rem.emailAttempted >= 1);
  check('B1 emailed', rem.emailed >= 1 && emailsSent.some((e) => e.to === 'ind@test.local'));
  check('B1 email subject', emailsSent.some((e) => /تذكير|انتهاء/.test(e.subject)));
  const adRem = (await deps.readAds()).find((a) => a.id === 'AD_REM');
  check(
    'B1 both channels recorded',
    !!(adRem && adRem.renewalReminderChannels && adRem.renewalReminderChannels.notification && adRem.renewalReminderChannels.email)
  );
  setSendEmailImplForTests(null);

  const clean = await runCleanups(deps);
  check('B2 sold purged', clean.soldPurged >= 1, JSON.stringify(clean));
  check('B2 sold media gone', !fs.existsSync(path.join(ADS_UP, 'AD_SOLD')));
  check('B2 protected store skipped', clean.skippedProtected >= 1 && fs.existsSync(path.join(ADS_UP, 'AD_PROT', '0.webp')));
  check('B2 draft removed', clean.draftsRemoved >= 1);
  check('B2 unverified warned', clean.unverifiedWarned >= 1);

  // second cleanup after warn grace → delete
  const accAfter = await deps.readAccounts();
  const uv = accAfter.find((a) => a.id === 'acc_uv_1');
  check('B2 warnAt set', !!(uv && uv.unverifiedWarnAt));
  if (uv) {
    uv.unverifiedWarnAt = new Date(now - 8 * MS_DAY).toISOString();
    await deps.writeAccounts(accAfter);
  }
  const clean2 = await runCleanups(deps);
  check('B2 unverified deleted', clean2.unverifiedDeleted >= 1, JSON.stringify(clean2));
  check('B2 account gone', !(await deps.readAccounts()).some((a) => a.id === 'acc_uv_1'));

  // ── B4 weekly report ─────────────────────────────────────
  const report = await buildWeeklyReport({
    lifecycle: { archived: 1, mediaPurged: 1, bytesFreed: 100 },
    reminders: rem,
    cleanups: clean,
    nowMs: now,
  });
  check('B4 report id', !!report.id && report.id.startsWith('ops_'));
  check('B4 has health', report.health && report.health.rssMB > 0);
  check('B4 has storage', typeof report.storage.uploadsBytes === 'number');
  check('B4 persisted', ((await repos.weeklyOpsReports.get(report.id)) || {}).id === report.id);

  // daily cron must NOT emit weekly even on Monday morning
  const mondayMs = Date.parse('2026-10-26T03:00:00.000Z'); // Monday
  const dailyPass = await runOpsHousekeepingPass(Object.assign({}, deps, {
    trigger: 'cron',
    nowMs: mondayMs,
  }));
  check('B4 daily cron skips weekly', dailyPass.weekly == null, 'trigger=' + dailyPass.trigger);

  // Monday 04:00 weekly job — report only
  const weeklyPass = await runOpsHousekeepingPass(Object.assign({}, deps, {
    trigger: 'weekly',
    weeklyOnly: true,
    nowMs: Date.parse('2026-10-26T04:00:00.000Z'),
  }));
  check('B4 weekly trigger builds report', !!(weeklyPass.weekly && weeklyPass.weekly.id));

  // forceWeekly still works for admin manual run
  const pass = await runOpsHousekeepingPass(Object.assign({}, deps, { forceWeekly: true, trigger: 'test' }));
  check('B4 pass weekly', !!(pass.weekly && pass.weekly.id));
  check('B4 pass has parts', !!(pass.lifecycle && pass.reminders && pass.cleanups));

  check('scheduler daily 03:00', DEFAULT_CRON === '0 3 * * *');
  check('scheduler weekly Mon 04:00', DEFAULT_WEEKLY_CRON === '0 4 * * 1');
  check('scheduler tz Nouakchott', DEFAULT_TZ === 'Africa/Nouakchott');

  // window edge: reminder only within 3 days
  check('REMIND window 3d', REMIND_BEFORE_MS === 3 * MS_DAY);

  await cleanup();
  console.log('\n' + passed + '/' + total + ' checks passed\n');
  process.exit(passed === total ? 0 : 1);
}

run().catch(async (e) => {
  console.error(e);
  try { await cleanup(); } catch (e2) { /* ignore */ }
  process.exit(1);
});
