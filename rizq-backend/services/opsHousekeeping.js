/**
 * المرحلة (ب): تذكير التجديد · تنظيفات · تقرير أسبوعي
 * يحترم protectedUntil و dry-run (launchDate فارغ).
 */
'use strict';

const launchMode = require('../config/launchMode');
const objectStorage = require('../lib/objectStorage');
const repos = require('../db/repos');

const MS_DAY = 24 * 60 * 60 * 1000;
const FREE_AD_ACTIVE_MS = 30 * MS_DAY;
const REMIND_BEFORE_MS = 3 * MS_DAY;
const SOLD_MEDIA_AFTER_MS = 7 * MS_DAY;
const DRAFT_AFTER_MS = 14 * MS_DAY;
const UNVERIFIED_AFTER_MS = 90 * MS_DAY;
const UNVERIFIED_WARN_GRACE_MS = 7 * MS_DAY;

function adActiveSinceMs(ad) {
  const raw = ad && (ad.publishedAt || ad.approvedAt || ad.createdAt);
  if (!raw) return NaN;
  return new Date(raw).getTime();
}

function pushNotification(accountId, note) {
  if (!accountId) return null;
  const id = 'ntf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const rec = Object.assign({
    id,
    accountId: String(accountId),
    at: new Date().toISOString(),
    read: false,
  }, note || {});
  repos.accountNotifications.upsert(id, rec);
  return rec;
}

async function sendEmailSafe(to, subject, html) {
  if (!to || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { ok: false, skipped: true, reason: 'email_not_configured' };
  }
  try {
    const nodemailer = require('nodemailer');
    const mailer = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await mailer.sendMail({
      from: process.env.EMAIL_FROM || '"رزق Rizq" <direction@rizq.mr>',
      to, subject, html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function purgeMediaBounded(adId) {
  const safeId = String(adId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return 0;
  const result = objectStorage.deletePrefixSync('ads/' + safeId + '/');
  if (!result.ok && !result.skipped) throw new Error(result.error || 'purge_failed');
  return Number(result.bytesFreed) || 0;
}

/**
 * ب1 — تذكير قبل 3 أيام من انتهاء الإعلان المجاني (30 يوماً)
 */
async function runRenewalReminders(deps) {
  const {
    readAds, writeAds, readAccounts, getAccountRecord, nowMs = Date.now(),
  } = deps;
  const dryRun = launchMode.isMaintenanceDryRun();
  const summary = {
    reminded: 0, wouldRemind: 0, emailed: 0, skippedProtected: 0, dryRun, errors: [],
  };
  const accounts = readAccounts() || [];
  const byId = {};
  accounts.forEach((a) => { byId[a.id] = a; });
  const list = readAds() || [];
  let changed = false;

  for (let i = 0; i < list.length; i++) {
    const ad = list[i];
    if (!ad || ad.status !== 'active') continue;
    const account = ad.accountId ? byId[ad.accountId] : null;
    const pkg = ad.accountId && getAccountRecord ? getAccountRecord(ad.accountId) : null;
    if (launchMode.isUnderProtection(nowMs, account, pkg)) {
      summary.skippedProtected++;
      continue;
    }
    const since = adActiveSinceMs(ad);
    if (Number.isNaN(since)) continue;
    const endMs = since + FREE_AD_ACTIVE_MS;
    const left = endMs - nowMs;
    if (left <= 0 || left > REMIND_BEFORE_MS) continue;
    if (ad.renewalReminderSentAt) {
      const sent = new Date(ad.renewalReminderSentAt).getTime();
      if (!Number.isNaN(sent) && nowMs - sent < 20 * 60 * 60 * 1000) continue;
    }
    const days = Math.max(1, Math.ceil(left / MS_DAY));
    const title = 'تذكير تجديد الإعلان';
    const body = `إعلانك «${String(ad.title || ad.id).slice(0, 80)}» ينتهي خلال ${days} ${days === 1 ? 'يوم' : 'أيام'}. جدّده ليبقي ظاهراً.`;

    if (dryRun) {
      summary.wouldRemind++;
      continue;
    }
    pushNotification(ad.accountId, {
      type: 'ad_renewal_reminder',
      title,
      body,
      meta: { adId: ad.id, daysLeft: days },
    });
    if (account && account.email) {
      const mail = await sendEmailSafe(
        account.email,
        'رزق — تذكير بقرب انتهاء إعلانك',
        `<p dir="rtl">${body}</p>`
      );
      if (mail.ok) summary.emailed++;
    }
    ad.renewalReminderSentAt = new Date(nowMs).toISOString();
    list[i] = ad;
    changed = true;
    summary.reminded++;
  }
  if (changed) writeAds(list);
  return summary;
}

/**
 * ب2 — تنظيفات: مباع 7ي · مسودات 14ي · بلا تحقق 90ي (تنبيه ثم حذف)
 */
async function runCleanups(deps) {
  const {
    readAds, writeAds, readAccounts, writeAccounts, getAccountRecord, nowMs = Date.now(),
  } = deps;
  const dryRun = launchMode.isMaintenanceDryRun();
  const summary = {
    dryRun,
    soldPurged: 0, wouldSoldPurge: 0, bytesFreed: 0,
    draftsRemoved: 0, wouldDraftsRemove: 0,
    unverifiedWarned: 0, wouldUnverifiedWarn: 0,
    unverifiedDeleted: 0, wouldUnverifiedDelete: 0,
    skippedProtected: 0,
    errors: [],
  };

  const accounts = readAccounts() || [];
  const byId = {};
  accounts.forEach((a) => { byId[a.id] = a; });
  const list = readAds() || [];
  let adsChanged = false;
  let accountsChanged = false;

  for (let i = 0; i < list.length; i++) {
    const ad = list[i];
    if (!ad || !ad.id) continue;
    const account = ad.accountId ? byId[ad.accountId] : null;
    const pkg = ad.accountId && getAccountRecord ? getAccountRecord(ad.accountId) : null;
    const protectedGrace = launchMode.isUnderProtection(nowMs, account, pkg);

    // مباع — حذف وسائط بعد 7 أيام
    if (ad.status === 'sold') {
      if (protectedGrace) { summary.skippedProtected++; continue; }
      const soldAt = new Date(ad.soldAt || ad.updatedAt || ad.createdAt || 0).getTime();
      if (Number.isNaN(soldAt) || nowMs - soldAt < SOLD_MEDIA_AFTER_MS) continue;
      if (Array.isArray(ad.images) && ad.images.length === 0 && ad.mediaPurgedAt) continue;
      if (dryRun) {
        summary.wouldSoldPurge++;
        continue;
      }
      try {
        summary.bytesFreed += purgeMediaBounded(ad.id);
        ad.images = [];
        ad.mediaPurgedAt = new Date(nowMs).toISOString();
        ad.updatedAt = ad.mediaPurgedAt;
        list[i] = ad;
        adsChanged = true;
        summary.soldPurged++;
      } catch (e) {
        summary.errors.push({ adId: ad.id, phase: 'sold_purge', message: e.message });
      }
      continue;
    }

    // مسودات / قيد الانتظار القديمة
    if (ad.status === 'draft' || ad.status === 'pending') {
      if (protectedGrace) { summary.skippedProtected++; continue; }
      const created = new Date(ad.createdAt || ad.updatedAt || 0).getTime();
      if (Number.isNaN(created) || nowMs - created < DRAFT_AFTER_MS) continue;
      if (dryRun) {
        summary.wouldDraftsRemove++;
        continue;
      }
      try {
        summary.bytesFreed += purgeMediaBounded(ad.id);
      } catch (e) { /* ignore media errors on draft */ }
      ad.status = 'removed';
      ad.images = [];
      ad.removedReason = 'draft_expired';
      ad.updatedAt = new Date(nowMs).toISOString();
      list[i] = ad;
      adsChanged = true;
      summary.draftsRemoved++;
    }
  }

  // حسابات بلا تحقق 90 يوماً
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    if (!acc || !acc.id) continue;
    const st = String(acc.status || '');
    if (!['pending', 'pending_review', 'unverified'].includes(st)) continue;
    const created = new Date(acc.createdAt || 0).getTime();
    if (Number.isNaN(created) || nowMs - created < UNVERIFIED_AFTER_MS) continue;

    if (!acc.unverifiedWarnAt) {
      if (dryRun) {
        summary.wouldUnverifiedWarn++;
        continue;
      }
      acc.unverifiedWarnAt = new Date(nowMs).toISOString();
      pushNotification(acc.id, {
        type: 'unverified_warning',
        title: 'تحذير: حساب بلا تحقق',
        body: 'لم يُستكمل التحقق من حسابك منذ أكثر من 90 يوماً. أكمل التحقق خلال 7 أيام وإلا سيُحذف الحساب.',
      });
      if (acc.email) {
        await sendEmailSafe(
          acc.email,
          'رزق — تحذير قبل حذف الحساب',
          '<p dir="rtl">لم يُستكمل التحقق من حسابك. أكمل التحقق خلال 7 أيام وإلا سيُحذف.</p>'
        );
      }
      accounts[i] = acc;
      accountsChanged = true;
      summary.unverifiedWarned++;
      continue;
    }

    const warnedAt = new Date(acc.unverifiedWarnAt).getTime();
    if (Number.isNaN(warnedAt) || nowMs - warnedAt < UNVERIFIED_WARN_GRACE_MS) continue;
    if (dryRun) {
      summary.wouldUnverifiedDelete++;
      continue;
    }
    // احذف إعلانات الحساب أولاً
    for (let j = 0; j < list.length; j++) {
      if (list[j] && list[j].accountId === acc.id) {
        try { purgeMediaBounded(list[j].id); } catch (e) { /* ignore */ }
        list[j].status = 'removed';
        list[j].images = [];
        list[j].removedReason = 'account_unverified_deleted';
        adsChanged = true;
      }
    }
    accounts.splice(i, 1);
    i--;
    accountsChanged = true;
    summary.unverifiedDeleted++;
  }

  if (adsChanged) writeAds(list);
  if (accountsChanged && typeof writeAccounts === 'function') writeAccounts(accounts);
  return summary;
}

/**
 * ب4 — تقرير أسبوعي للسوبر أدمن
 */
function buildWeeklyReport(parts) {
  const {
    lifecycle = {}, reminders = {}, cleanups = {}, nowMs = Date.now(),
  } = parts;
  const dryRun = launchMode.isMaintenanceDryRun();
  const settings = launchMode.getLaunchSettings();
  let uploadsBytes = 0;
  try {
    const fs = require('fs');
    const path = require('path');
    const root = objectStorage.LOCAL_ROOT;
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const name of fs.readdirSync(dir)) {
        const fp = path.join(dir, name);
        try {
          const st = fs.statSync(fp);
          if (st.isDirectory()) walk(fp);
          else uploadsBytes += st.size;
        } catch (e) { /* ignore */ }
      }
    }
    walk(root);
  } catch (e) { /* ignore */ }

  const mem = process.memoryUsage();
  const report = {
    id: 'ops_' + new Date(nowMs).toISOString().slice(0, 10),
    at: new Date(nowMs).toISOString(),
    dryRun,
    launch: {
      launchDate: settings.launchDate,
      freeDays: settings.freeDays,
      freeUntil: settings.freeUntil,
      maintenanceDryRun: settings.maintenanceDryRun,
    },
    storage: {
      uploadsBytes,
      uploadsMB: Math.round(uploadsBytes / (1024 * 1024) * 10) / 10,
      bytesFreedThisRun: Number(lifecycle.bytesFreed || 0) + Number(cleanups.bytesFreed || 0),
      wouldFreeBytes: 0,
    },
    lifecycle: {
      archived: lifecycle.archived || 0,
      mediaPurged: lifecycle.mediaPurged || 0,
      wouldArchive: lifecycle.wouldArchive || 0,
      wouldPurge: lifecycle.wouldPurge || 0,
      skippedPaidGrace: lifecycle.skippedPaidGrace || 0,
    },
    reminders: {
      reminded: reminders.reminded || 0,
      wouldRemind: reminders.wouldRemind || 0,
      emailed: reminders.emailed || 0,
    },
    cleanups: {
      soldPurged: cleanups.soldPurged || 0,
      wouldSoldPurge: cleanups.wouldSoldPurge || 0,
      draftsRemoved: cleanups.draftsRemoved || 0,
      wouldDraftsRemove: cleanups.wouldDraftsRemove || 0,
      unverifiedWarned: cleanups.unverifiedWarned || 0,
      wouldUnverifiedWarn: cleanups.wouldUnverifiedWarn || 0,
      unverifiedDeleted: cleanups.unverifiedDeleted || 0,
      wouldUnverifiedDelete: cleanups.wouldUnverifiedDelete || 0,
    },
    health: {
      uptimeSec: Math.round(process.uptime()),
      rssMB: Math.round(mem.rss / (1024 * 1024)),
      heapUsedMB: Math.round(mem.heapUsed / (1024 * 1024)),
      node: process.version,
    },
  };
  repos.weeklyOpsReports.upsert(report.id, report);
  return report;
}

async function runOpsHousekeepingPass(deps) {
  const trigger = deps.trigger || 'manual';
  const nowMs = deps.nowMs || Date.now();
  const { runAdLifecycleMaintenance } = require('./adLifecycle');
  const lifecycle = runAdLifecycleMaintenance(Object.assign({}, deps, { nowMs, trigger }));
  const reminders = await runRenewalReminders(Object.assign({}, deps, { nowMs }));
  const cleanups = await runCleanups(Object.assign({}, deps, { nowMs }));
  let weekly = null;
  const dow = new Date(nowMs).getUTCDay(); // 0=Sun
  const forceWeekly = deps.forceWeekly === true;
  if (forceWeekly || dow === 0 || trigger === 'weekly') {
    weekly = buildWeeklyReport({ lifecycle, reminders, cleanups, nowMs });
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || process.env.OPS_REPORT_EMAIL;
    if (adminEmail && !lifecycle.dryRun) {
      await sendEmailSafe(
        adminEmail,
        'رزق — تقرير العمليات الأسبوعي',
        `<pre dir="ltr">${JSON.stringify(weekly, null, 2)}</pre>`
      );
    }
  }
  return { lifecycle, reminders, cleanups, weekly, dryRun: launchMode.isMaintenanceDryRun() };
}

function listAccountNotifications(accountId, limit) {
  const all = repos.accountNotifications.list() || [];
  return all
    .filter((n) => n && n.accountId === String(accountId))
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    .slice(0, limit || 50);
}

function listWeeklyReports(limit) {
  return (repos.weeklyOpsReports.list() || [])
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
    .slice(0, limit || 12);
}

module.exports = {
  MS_DAY,
  FREE_AD_ACTIVE_MS,
  REMIND_BEFORE_MS,
  SOLD_MEDIA_AFTER_MS,
  DRAFT_AFTER_MS,
  UNVERIFIED_AFTER_MS,
  runRenewalReminders,
  runCleanups,
  buildWeeklyReport,
  runOpsHousekeepingPass,
  listAccountNotifications,
  listWeeklyReports,
  pushNotification,
};
