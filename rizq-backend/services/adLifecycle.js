/**
 * Ad Lifecycle — 30d active → archive → 30d archive → purge media
 * Paid participants (diamond / store|office|corp|estate / video): 60d grace after subscription end.
 * Launch free period (site-config / env): store+estate with null periodEnd stay active until freeUntil.
 */
const launchMode = require('../config/launchMode');
const objectStorage = require('../lib/objectStorage');
const repos = require('../db/repos');

const MS_DAY = 24 * 60 * 60 * 1000;
const ACTIVE_LIFECYCLE_MS = 30 * MS_DAY;
const ARCHIVE_RETENTION_MS = 30 * MS_DAY;
const PAID_GRACE_MS = 60 * MS_DAY;

const PAID_ACCOUNT_TYPES = new Set(['store', 'office', 'corp', 'estate']);
/** أنواع الإطلاق المجاني: بلا periodEnd = محمية حتى freeUntil فقط (لا Infinity) */
const LAUNCH_FREE_TYPES = new Set(['store', 'estate']);
const DIAMOND_PKG_RE = /(ماسية|diamond)/i;
const VIDEO_ADS_PKG_RE = /(video|فيديو|rizq\s*ads|إعلان.*فيديو)/i;

const MAX_AUDIT_ENTRIES = 120;

function hasConcretePeriodEnd(pkgRecord) {
  if (!pkgRecord || pkgRecord.periodEnd == null || pkgRecord.periodEnd === '') return false;
  const endMs = new Date(pkgRecord.periodEnd).getTime();
  return !Number.isNaN(endMs);
}

function isPaidParticipant(account, pkgRecord) {
  if (account && PAID_ACCOUNT_TYPES.has(account.type)) return true;
  if (!pkgRecord) return false;
  const pkgName = pkgRecord.pkgName || '';
  if (DIAMOND_PKG_RE.test(pkgName) || VIDEO_ADS_PKG_RE.test(pkgName)) return true;
  if (Number(pkgRecord.price) > 0) return true;
  if (Array.isArray(pkgRecord.invoices) && pkgRecord.invoices.some((i) => Number(i.price) > 0)) return true;
  return false;
}

/**
 * Last instant before lifecycle may archive/delete.
 * null = not protected.
 */
function getPaidGraceDeadlineMs(account, pkgRecord, nowMs) {
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  const type = account && account.type;

  // قاعدة الإطلاق: store/estate بلا periodEnd ملموس → حتى نهاية freeUntil فقط
  if (type && LAUNCH_FREE_TYPES.has(type) && !hasConcretePeriodEnd(pkgRecord)) {
    if (launchMode.isLaunchFreePeriodActive(now)) {
      const end = launchMode.freeUntilEndMs(launchMode.getLaunchFreeUntil());
      if (end != null) return end;
    }
    // انتهت المجانية ولا اشتراك بتاريخ نهاية → بلا حماية أبدية
    return null;
  }

  if (!isPaidParticipant(account, pkgRecord)) return null;

  if (account && PAID_ACCOUNT_TYPES.has(account.type) && !pkgRecord) {
    // office/corp بلا سجل باقة: حماية مستمرة (سلوك سابق)
    return Infinity;
  }
  if (pkgRecord && pkgRecord.periodEnd) {
    const endMs = new Date(pkgRecord.periodEnd).getTime();
    if (!Number.isNaN(endMs)) return endMs + PAID_GRACE_MS;
  }
  if (pkgRecord && pkgRecord.suspendedAt) {
    const suspMs = new Date(pkgRecord.suspendedAt).getTime();
    if (!Number.isNaN(suspMs)) return suspMs + PAID_GRACE_MS;
  }
  return Date.now() + PAID_GRACE_MS;
}

function isUnderPaidGrace(nowMs, account, pkgRecord) {
  const deadline = getPaidGraceDeadlineMs(account, pkgRecord, nowMs);
  if (deadline === null) return false;
  if (deadline === Infinity) return true;
  return nowMs < deadline;
}

function adActiveSinceMs(ad) {
  const raw = ad.publishedAt || ad.approvedAt || ad.createdAt;
  if (!raw) return NaN;
  return new Date(raw).getTime();
}

function adArchivedSinceMs(ad) {
  const raw = ad.archivedAt;
  if (!raw) return NaN;
  return new Date(raw).getTime();
}

/**
 * حذف وسائط الإعلان عبر objectStorage فقط (لا مسارات قرص مباشرة).
 * @returns {number} bytes freed
 */
function purgeAdMedia(adId, _uploadsDir) {
  const safeId = String(adId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return 0;
  const result = objectStorage.deletePrefixSync('ads/' + safeId);
  if (!result.ok && !result.skipped) {
    throw new Error('purge_failed:' + safeId + ':' + (result.error || 'unknown'));
  }
  return Number(result.bytesFreed) || 0;
}

function readAuditLog(_dataDir) {
  return repos.maintenanceAudit.list();
}

function appendAuditEntry(_dataDir, entry) {
  const id = (entry && entry.id) || ('aud_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));
  const rec = Object.assign({ id }, entry || {});
  repos.maintenanceAudit.upsert(id, rec);
  const all = repos.maintenanceAudit.list();
  if (all.length > MAX_AUDIT_ENTRIES) {
    all
      .sort((a, b) => String(b.at || b.createdAt || '').localeCompare(String(a.at || a.createdAt || '')))
      .slice(MAX_AUDIT_ENTRIES)
      .forEach((e) => repos.maintenanceAudit.remove(String(e.id)));
  }
}

/**
 * Run one maintenance pass.
 * @param {object} deps
 * @param {function} deps.readAds
 * @param {function} deps.writeAds
 * @param {function} deps.readAccounts
 * @param {function} deps.getAccountRecord — (accountId) => pkg record|null
 * @param {string} deps.adsUploadsDir
 * @param {string} deps.dataDir
 * @param {number} [deps.nowMs]
 * @param {string} [deps.trigger]
 */
function runAdLifecycleMaintenance(deps) {
  const {
    readAds,
    writeAds,
    readAccounts,
    getAccountRecord,
    adsUploadsDir,
    dataDir,
    nowMs = Date.now(),
    trigger = 'manual',
  } = deps;

  const accounts = readAccounts();
  const accountById = {};
  accounts.forEach((a) => { accountById[a.id] = a; });

  const list = readAds();
  let changed = false;
  const summary = {
    runAt: new Date(nowMs).toISOString(),
    trigger,
    archived: 0,
    mediaPurged: 0,
    bytesFreed: 0,
    skippedPaidGrace: 0,
    freeUntil: launchMode.getLaunchFreeUntil() || null,
    freePeriodActive: launchMode.isLaunchFreePeriodActive(nowMs),
    errors: [],
  };

  for (let i = 0; i < list.length; i++) {
    const ad = list[i];
    if (!ad || !ad.id) continue;

    const account = ad.accountId ? accountById[ad.accountId] : null;
    const pkgRecord = ad.accountId && getAccountRecord ? getAccountRecord(ad.accountId) : null;
    const protectedGrace = isUnderPaidGrace(nowMs, account, pkgRecord);

    if (ad.status === 'active') {
      if (protectedGrace) {
        summary.skippedPaidGrace++;
        continue;
      }
      const since = adActiveSinceMs(ad);
      if (Number.isNaN(since)) continue;
      if (nowMs - since >= ACTIVE_LIFECYCLE_MS) {
        ad.status = 'archived';
        ad.archivedAt = new Date(nowMs).toISOString();
        ad.updatedAt = ad.archivedAt;
        list[i] = ad;
        changed = true;
        summary.archived++;
      }
      continue;
    }

    if (ad.status === 'archived') {
      if (protectedGrace) {
        summary.skippedPaidGrace++;
        continue;
      }
      const since = adArchivedSinceMs(ad);
      if (Number.isNaN(since)) {
        ad.archivedAt = ad.archivedAt || new Date(nowMs).toISOString();
        list[i] = ad;
        changed = true;
        continue;
      }
      if (nowMs - since >= ARCHIVE_RETENTION_MS) {
        try {
          summary.bytesFreed += purgeAdMedia(ad.id, adsUploadsDir);
          ad.images = [];
          ad.status = 'removed';
          ad.mediaPurgedAt = new Date(nowMs).toISOString();
          ad.updatedAt = ad.mediaPurgedAt;
          list[i] = ad;
          changed = true;
          summary.mediaPurged++;
        } catch (e) {
          summary.errors.push({ adId: ad.id, phase: 'purge', message: e.message });
        }
      }
    }
  }

  if (changed) writeAds(list);
  appendAuditEntry(dataDir, summary);
  return summary;
}

module.exports = {
  MS_DAY,
  ACTIVE_LIFECYCLE_MS,
  ARCHIVE_RETENTION_MS,
  PAID_GRACE_MS,
  PAID_ACCOUNT_TYPES,
  LAUNCH_FREE_TYPES,
  isPaidParticipant,
  getPaidGraceDeadlineMs,
  isUnderPaidGrace,
  runAdLifecycleMaintenance,
  readAuditLog,
  purgeAdMedia,
};
