/**
 * Ad Lifecycle — 30d active → archive → 30d archive → purge media
 * Paid participants (diamond / store|office|corp / video): 60d grace after subscription end.
 */
const fs = require('fs');
const path = require('path');

const MS_DAY = 24 * 60 * 60 * 1000;
const ACTIVE_LIFECYCLE_MS = 30 * MS_DAY;
const ARCHIVE_RETENTION_MS = 30 * MS_DAY;
const PAID_GRACE_MS = 60 * MS_DAY;

const PAID_ACCOUNT_TYPES = new Set(['store', 'office', 'corp']);
const DIAMOND_PKG_RE = /(ماسية|diamond)/i;
const VIDEO_ADS_PKG_RE = /(video|فيديو|rizq\s*ads|إعلان.*فيديو)/i;

const AUDIT_FILE = 'maintenance-audit.json';
const MAX_AUDIT_ENTRIES = 120;

function isPaidParticipant(account, pkgRecord) {
  if (account && PAID_ACCOUNT_TYPES.has(account.type)) return true;
  if (!pkgRecord) return false;
  const pkgName = pkgRecord.pkgName || '';
  if (DIAMOND_PKG_RE.test(pkgName) || VIDEO_ADS_PKG_RE.test(pkgName)) return true;
  if (Number(pkgRecord.price) > 0) return true;
  if (Array.isArray(pkgRecord.invoices) && pkgRecord.invoices.some((i) => Number(i.price) > 0)) return true;
  return false;
}

/** Last instant before lifecycle may archive/delete (paid grace). null = not protected. */
function getPaidGraceDeadlineMs(account, pkgRecord) {
  if (!isPaidParticipant(account, pkgRecord)) return null;
  if (account && PAID_ACCOUNT_TYPES.has(account.type) && !pkgRecord) {
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
  const deadline = getPaidGraceDeadlineMs(account, pkgRecord);
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

function dirSizeBytes(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  for (const name of fs.readdirSync(dirPath)) {
    const fp = path.join(dirPath, name);
    try {
      const st = fs.statSync(fp);
      if (st.isFile()) total += st.size;
    } catch (e) { /* ignore */ }
  }
  return total;
}

function purgeAdMedia(adId, uploadsDir) {
  const dir = path.join(uploadsDir, adId);
  const bytesBefore = dirSizeBytes(dir);
  if (!fs.existsSync(dir)) return 0;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    throw new Error('purge_failed:' + adId + ':' + e.message);
  }
  return bytesBefore;
}

function readAuditLog(dataDir) {
  const file = path.join(dataDir, AUDIT_FILE);
  try {
    const list = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function appendAuditEntry(dataDir, entry) {
  const file = path.join(dataDir, AUDIT_FILE);
  const list = readAuditLog(dataDir);
  list.unshift(entry);
  if (list.length > MAX_AUDIT_ENTRIES) list.length = MAX_AUDIT_ENTRIES;
  fs.writeFileSync(file, JSON.stringify(list, null, 2), 'utf8');
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
  isPaidParticipant,
  getPaidGraceDeadlineMs,
  isUnderPaidGrace,
  runAdLifecycleMaintenance,
  readAuditLog,
  purgeAdMedia,
};
