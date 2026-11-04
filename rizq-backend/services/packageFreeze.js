/**
 * تجميد الباقة المنتهية — فلترة لا حذف.
 * الخادم مصدر الحقيقة: الظهور / الكتابة / التواصل / الأرشفة بعد 90 يوماً.
 */
'use strict';

const { getAccountRecord, isPackageAccessActive } = require('../rizq_package_lifecycle_agent');
const { getSubscriptionStatus, entitlementError } = require('./entitlements');

const ARCHIVE_AFTER_DAYS = 90;
const MS_DAY = 24 * 60 * 60 * 1000;

const MSG_RENEW_AR = 'جدّد باقتك';
const MSG_UNAVAILABLE_AR = 'غير متاح للتواصل حالياً';
const MSG_INVENTORY_AR = 'المخزون غير مؤكد';

function _recStatus(rec) {
  return getSubscriptionStatus(rec || null);
}

function daysSinceExpired(rec) {
  if (!rec) return 0;
  const raw = rec.expiredAt || rec.periodEnd;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (Date.now() - t) / MS_DAY);
}

/** باقة منتهية لكن لم تُؤرشف بعد (الصفحة ظاهرة مجمّدة) */
function isPackageFrozen(rec) {
  if (!rec) return false;
  if (rec.archivedAt) return false;
  const st = _recStatus(rec);
  if (st === 'expired' || st === 'suspended') {
    return daysSinceExpired(rec) < ARCHIVE_AFTER_DAYS;
  }
  return false;
}

/** أرشفة بعد 90 يوماً من الانتهاء — 404 لطيفة بالرابط */
function isPackageArchived(rec) {
  if (!rec) return false;
  if (rec.archivedAt) return true;
  const st = _recStatus(rec);
  if (st === 'expired' || st === 'suspended') {
    return daysSinceExpired(rec) >= ARCHIVE_AFTER_DAYS;
  }
  return false;
}

/**
 * يظهر في الإطلالات / الدليل / البحث / شريط الإعلانات.
 * بلا سجل باقة: يبقى ظاهراً (توافق الحسابات القديمة/التجارب).
 * المجمّد/المؤرشف/المنتهي/الموقوف: يُفلتر (لا يُحذف).
 */
function isPackageListable(rec) {
  if (!rec) return true;
  if (isPackageArchived(rec) || isPackageFrozen(rec)) return false;
  const st = _recStatus(rec);
  if (st === 'expired' || st === 'suspended') return false;
  return true;
}

async function getPackageRecord(accountId) {
  const id = String(accountId || '').split('::')[0];
  if (!id) return null;
  try {
    return await getAccountRecord(id);
  } catch (e) {
    return null;
  }
}

async function resolveFreezeState(accountId) {
  const rec = await getPackageRecord(accountId);
  if (!rec) {
    return {
      accountId: accountId || null,
      subscriptionStatus: 'no_subscription',
      listable: false,
      frozen: false,
      archived: false,
      packageFrozen: false,
      packageArchived: false,
      canWrite: false,
      canExposeContacts: false,
      canStartChat: false,
      inventoryUnconfirmed: false,
      renewCta: false,
      shareDisabled: true,
      messageAr: MSG_RENEW_AR,
      unavailableAr: MSG_UNAVAILABLE_AR,
    };
  }
  const archived = isPackageArchived(rec);
  const frozen = !archived && isPackageFrozen(rec);
  const listable = isPackageListable(rec);
  const active = listable;
  return {
    accountId: String(accountId),
    subscriptionStatus: _recStatus(rec),
    listable,
    frozen,
    archived,
    packageFrozen: frozen,
    packageArchived: archived,
    canWrite: active,
    canExposeContacts: active,
    canStartChat: active,
    inventoryUnconfirmed: frozen,
    renewCta: frozen || archived,
    shareDisabled: frozen || archived || !active,
    inventoryBadgeAr: frozen ? MSG_INVENTORY_AR : null,
    messageAr: MSG_RENEW_AR,
    unavailableAr: MSG_UNAVAILABLE_AR,
    expiredAt: rec.expiredAt || null,
    archivedAt: rec.archivedAt || null,
    periodEnd: rec.periodEnd || null,
  };
}

function packageExpiredError(message) {
  return entitlementError('package_expired', message || MSG_RENEW_AR);
}

/** رفض كتابة كتالوج / محادثة جديدة لحساب مجمّد أو منتهٍ */
async function assertPackageAllowsWrite(accountId) {
  const state = await resolveFreezeState(accountId);
  if (state.archived) {
    const err = packageExpiredError(MSG_RENEW_AR);
    err.details = Object.assign({}, err.details, { archived: true });
    throw err;
  }
  if (!state.canWrite) {
    throw packageExpiredError(MSG_RENEW_AR);
  }
  return state;
}

async function assertPackageAllowsNewChat(accountId) {
  const state = await resolveFreezeState(accountId);
  if (!state.canStartChat) {
    const err = entitlementError('package_expired', MSG_UNAVAILABLE_AR);
    err.details = { frozen: !!state.frozen, archived: !!state.archived, readOnly: true };
    throw err;
  }
  return state;
}

/**
 * معاينة رابط (Open Graph / Twitter).
 * - عند التجميد/الأرشفة: وصف «غير متاح للتواصل» بلا أي وسيلة اتصال.
 * - عند الباقة النشطة: وصف من بيانات المحل، وما زال بلا هاتف/بريد في الـ OG.
 */
function buildFrozenOgMeta(acc, state) {
  const name = String((acc && (acc.name || acc.nameFr)) || 'رزق').slice(0, 120);
  const image = (acc && (acc.cover || acc.thumb || acc.image)) || null;
  const frozen = !!(state && (state.packageFrozen || state.packageArchived));
  const activeDesc = String(
    (acc && (acc.tagline || acc.desc || acc.activity || acc.name)) || name
  ).slice(0, 200);
  const desc = frozen
    ? ((state && state.unavailableAr) || MSG_UNAVAILABLE_AR)
    : activeDesc;
  return {
    ok: true,
    packageFrozen: !!(state && state.packageFrozen),
    packageArchived: !!(state && state.packageArchived),
    title: name,
    description: desc,
    ogTitle: name,
    ogDescription: desc,
    ogImage: image,
    twitterCard: 'summary_large_image',
    twitterTitle: name,
    twitterDescription: desc,
    twitterImage: image,
    phone: null,
    email: null,
    whatsapp: null,
  };
}

function clearHomeCatalogCacheSafe() {
  try {
    const { clearHomeCatalogCache } = require('./homeCatalog');
    clearHomeCatalogCache();
  } catch (e) { /* optional during boot */ }
}

/**
 * إطلالة متعددة القطع: إن وُجدت قطعة من محل منتهٍ تُستبدل بمحل فعّال
 * من نفس الفئة؛ إن تعذّر الاستبدال تُخفى الإطلالة كاملة (null).
 * @param {Array<{accountId:string,cat?:string,category?:string}>} pieces
 * @param {{ replacements?: Array, isListable?: (id:string)=>Promise<boolean> }} opts
 * @returns {Promise<Array|null>}
 */
async function sanitizeLookPieces(pieces, opts) {
  opts = opts || {};
  const list = Array.isArray(pieces) ? pieces.slice() : [];
  if (!list.length) return null;
  const replacements = Array.isArray(opts.replacements) ? opts.replacements : [];
  const check = typeof opts.isListable === 'function'
    ? opts.isListable
    : async (id) => {
      const pkg = await getPackageRecord(id);
      return isPackageListable(pkg);
    };
  const used = new Set();
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const piece = list[i];
    if (!piece) continue;
    const aid = String(piece.accountId || '');
    let ok = false;
    try { ok = aid ? !!(await check(aid)) : false; } catch (e) { ok = false; }
    if (ok) {
      out.push(piece);
      used.add(aid);
      continue;
    }
    const cat = String(piece.cat || piece.category || '').trim().toLowerCase();
    const alt = replacements.find((r) => {
      if (!r || !r.accountId) return false;
      const rid = String(r.accountId);
      if (used.has(rid) || rid === aid) return false;
      const rcat = String(r.cat || r.category || '').trim().toLowerCase();
      if (cat && rcat && rcat !== cat) return false;
      return true;
    });
    if (!alt) return null;
    let altOk = false;
    try { altOk = !!(await check(String(alt.accountId))); } catch (e2) { altOk = false; }
    if (!altOk) return null;
    out.push(Object.assign({}, piece, alt, { replacedFrom: aid || null }));
    used.add(String(alt.accountId));
  }
  return out.length ? out : null;
}

/** كاش قائمة الحسابات القابلة للظهور — لتقليل استعلامات الإعلانات */
async function filterListableAccountIds(accountIds) {
  const ids = Array.from(new Set((accountIds || []).map((id) => String(id || '').split('::')[0]).filter(Boolean)));
  const out = new Set();
  await Promise.all(ids.map(async (id) => {
    try {
      const pkg = await getPackageRecord(id);
      if (isPackageListable(pkg)) out.add(id);
    } catch (e) { /* skip */ }
  }));
  return out;
}

module.exports = {
  ARCHIVE_AFTER_DAYS,
  MSG_RENEW_AR,
  MSG_UNAVAILABLE_AR,
  MSG_INVENTORY_AR,
  daysSinceExpired,
  isPackageFrozen,
  isPackageArchived,
  isPackageListable,
  getPackageRecord,
  resolveFreezeState,
  assertPackageAllowsWrite,
  assertPackageAllowsNewChat,
  packageExpiredError,
  buildFrozenOgMeta,
  clearHomeCatalogCacheSafe,
  sanitizeLookPieces,
  filterListableAccountIds,
  isPackageAccessActive,
};
