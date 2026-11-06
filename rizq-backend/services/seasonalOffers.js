/**
 * العروض الموسمية — خصم منصة يقرّره المدير فقط.
 * قواعد: لا تداخل زمني، شهر مخفّض واحد لكل مشترك/عرض، العبرة بتاريخ الدفع،
 * لا أثر رجعي، السعر من المتصفح يُتجاهل، الرصيد على المبلغ المدفوع فعلاً.
 */
'use strict';

const crypto = require('crypto');
const repos = require('../db/repos');

const COLLECTION_ID = 'seasonal_offers_state';
const MAX_TITLE = 120;

function _emptyState() {
  return { offers: [], redemptions: {}, updatedAt: null };
}

async function _load() {
  try {
    const cfg = await repos.getSiteConfig();
    if (cfg && cfg.seasonalOffers && Array.isArray(cfg.seasonalOffers.offers)) {
      return {
        offers: cfg.seasonalOffers.offers.slice(),
        redemptions: cfg.seasonalOffers.redemptions && typeof cfg.seasonalOffers.redemptions === 'object'
          ? cfg.seasonalOffers.redemptions
          : {},
        updatedAt: cfg.seasonalOffers.updatedAt || null,
      };
    }
  } catch (e) { /* */ }
  return _emptyState();
}

async function _save(state) {
  const next = {
    offers: Array.isArray(state.offers) ? state.offers : [],
    redemptions: state.redemptions && typeof state.redemptions === 'object' ? state.redemptions : {},
    updatedAt: new Date().toISOString(),
  };
  const cfg = (await repos.getSiteConfig()) || {};
  cfg.seasonalOffers = next;
  await repos.saveSiteConfig(cfg);
  return next;
}

function _escTitle(s) {
  return String(s || '')
    .replace(/[<>&"'`]/g, '')
    .replace(/[\u0000-\u001f]/g, '')
    .slice(0, MAX_TITLE)
    .trim();
}

function _parseMs(iso) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function normalizeOfferInput(body, existingId) {
  const b = body || {};
  const titleAr = _escTitle(b.titleAr || b.title_ar || b.title);
  const titleFr = _escTitle(b.titleFr || b.title_fr || b.titleFr || b.title);
  const percent = Math.round(Number(b.percent != null ? b.percent : b.discountPercent) || 0);
  const startAt = String(b.startAt || b.start || '').slice(0, 40);
  const endAt = String(b.endAt || b.end || '').slice(0, 40);
  let packageIds = b.packageIds || b.packages || [];
  if (typeof packageIds === 'string') {
    packageIds = packageIds.split(/[\s,]+/).filter(Boolean);
  }
  packageIds = Array.from(new Set((packageIds || []).map((id) => String(id || '').slice(0, 60)).filter(Boolean)));

  if (!titleAr && !titleFr) return { ok: false, error: 'title_required' };
  if (!(percent >= 1 && percent <= 90)) return { ok: false, error: 'percent_range', message: 'النسبة بين 1 و 90' };
  const sMs = _parseMs(startAt);
  const eMs = _parseMs(endAt);
  if (!Number.isFinite(sMs) || !Number.isFinite(eMs) || eMs <= sMs) {
    return { ok: false, error: 'invalid_dates' };
  }
  if (!packageIds.length) return { ok: false, error: 'packages_required' };

  return {
    ok: true,
    offer: {
      id: existingId || ('offer_' + Date.now().toString(36) + '_' + crypto.randomBytes(2).toString('hex')),
      titleAr: titleAr || titleFr,
      titleFr: titleFr || titleAr,
      percent,
      startAt: new Date(sMs).toISOString(),
      endAt: new Date(eMs).toISOString(),
      packageIds,
      createdAt: null,
      published: b.published !== false,
      previewOnly: !!b.previewOnly,
    },
  };
}

function offersOverlap(a, b) {
  const a0 = _parseMs(a.startAt);
  const a1 = _parseMs(a.endAt);
  const b0 = _parseMs(b.startAt);
  const b1 = _parseMs(b.endAt);
  if (![a0, a1, b0, b1].every(Number.isFinite)) return false;
  return a0 < b1 && b0 < a1;
}

function isOfferLive(offer, atMs) {
  if (!offer || offer.published === false || offer.previewOnly) return false;
  const t = atMs != null ? atMs : Date.now();
  const s = _parseMs(offer.startAt);
  const e = _parseMs(offer.endAt);
  return Number.isFinite(s) && Number.isFinite(e) && t >= s && t <= e;
}

function offerIncludesPackage(offer, packageId, pkgName) {
  if (!offer || !Array.isArray(offer.packageIds)) return false;
  const id = String(packageId || '').toLowerCase();
  const name = String(pkgName || '').toLowerCase();
  return offer.packageIds.some((p) => {
    const x = String(p || '').toLowerCase();
    return (id && x === id) || (name && x === name);
  });
}

async function listOffers() {
  const state = await _load();
  return state.offers.slice().sort((a, b) => String(b.startAt).localeCompare(String(a.startAt)));
}

async function getOffer(id) {
  const state = await _load();
  return state.offers.find((o) => o && o.id === id) || null;
}

async function upsertOffer(body, opts) {
  opts = opts || {};
  const state = await _load();
  const existingId = opts.id || body.id || null;
  const existing = existingId ? state.offers.find((o) => o.id === existingId) : null;
  const norm = normalizeOfferInput(body, existing ? existing.id : null);
  if (!norm.ok) return norm;

  const offer = norm.offer;
  offer.createdAt = existing ? existing.createdAt : new Date().toISOString();
  offer.updatedAt = new Date().toISOString();
  if (existing) {
    offer.stats = existing.stats || { redemptions: 0, revenue: 0 };
  } else {
    offer.stats = { redemptions: 0, revenue: 0 };
  }

  const conflict = state.offers.find((o) => {
    if (!o || (existing && o.id === existing.id)) return false;
    if (o.published === false) return false;
    return offersOverlap(o, offer);
  });
  if (conflict) {
    return {
      ok: false,
      error: 'overlap',
      message: 'لا يُسمح بعرضين متداخلين في الزمن',
      conflictId: conflict.id,
    };
  }

  if (existing) {
    state.offers = state.offers.map((o) => (o.id === existing.id ? offer : o));
  } else {
    state.offers.push(offer);
  }
  await _save(state);
  return { ok: true, offer };
}

async function archiveOffer(id) {
  const state = await _load();
  const idx = state.offers.findIndex((o) => o && o.id === id);
  if (idx < 0) return { ok: false, error: 'not_found' };
  state.offers[idx] = Object.assign({}, state.offers[idx], {
    published: false,
    archivedAt: new Date().toISOString(),
  });
  await _save(state);
  return { ok: true, offer: state.offers[idx] };
}

function hasRedeemed(state, offerId, accountId) {
  const bag = state.redemptions && state.redemptions[offerId];
  return !!(bag && bag[String(accountId)]);
}

/**
 * سعر الباقة بعد العرض الموسمي — يتجاهل أي سعر من المتصفح.
 * @returns {{ listPrice, price, offer, discounted, alreadyRedeemed }}
 */
async function _isPackageActive(packageId, pkgName) {
  try {
    const { findCatalogPackage } = require('./catalogConfig');
    const hit = await findCatalogPackage(packageId || pkgName, { includeInactive: true });
    if (!hit) {
      /* إن لم نجد الصف في الكتالوج لا نمنع الخصم لباقات مخصّصة غير معروفة */
      return true;
    }
    return hit.active !== false;
  } catch (e) {
    return true;
  }
}

async function resolveOfferPrice(opts) {
  opts = opts || {};
  const listPrice = Math.max(0, Number(opts.listPrice) || 0);
  const packageId = opts.packageId || null;
  const pkgName = opts.pkgName || null;
  const accountId = opts.accountId ? String(opts.accountId) : '';
  /* العبرة بتاريخ الدفع / تقديم الطلب — لا أثر رجعي */
  const payMs = opts.paymentAt != null ? _parseMs(opts.paymentAt) : Date.now();
  const atMs = Number.isFinite(payMs) ? payMs : Date.now();

  /* لا خصم على باقة معطّلة في الكتالوج */
  if (!(await _isPackageActive(packageId, pkgName))) {
    return { listPrice, price: listPrice, offer: null, discounted: false, alreadyRedeemed: false, inactivePackage: true };
  }

  const state = await _load();
  const live = state.offers.filter((o) => isOfferLive(o, atMs) && offerIncludesPackage(o, packageId, pkgName));
  if (!live.length) {
    return { listPrice, price: listPrice, offer: null, discounted: false, alreadyRedeemed: false };
  }
  /* لا تداخل — نأخذ الأحدث بدايةً إن وُجد خطأ بيانات */
  live.sort((a, b) => _parseMs(b.startAt) - _parseMs(a.startAt));
  const offer = live[0];
  const redeemed = accountId ? hasRedeemed(state, offer.id, accountId) : false;
  if (redeemed) {
    return { listPrice, price: listPrice, offer, discounted: false, alreadyRedeemed: true };
  }
  const price = Math.round(listPrice * (1 - Number(offer.percent) / 100) * 100) / 100;
  return {
    listPrice,
    price: Math.max(0, price),
    offer: {
      id: offer.id,
      titleAr: offer.titleAr,
      titleFr: offer.titleFr,
      percent: offer.percent,
      startAt: offer.startAt,
      endAt: offer.endAt,
      packageIds: offer.packageIds,
    },
    discounted: price < listPrice,
    alreadyRedeemed: false,
  };
}

async function recordRedemption(opts) {
  opts = opts || {};
  const offerId = String(opts.offerId || '');
  const accountId = String(opts.accountId || '');
  if (!offerId || !accountId) return { ok: false, error: 'missing_ids' };
  const state = await _load();
  if (hasRedeemed(state, offerId, accountId)) {
    return { ok: true, already: true };
  }
  if (!state.redemptions[offerId]) state.redemptions[offerId] = {};
  state.redemptions[offerId][accountId] = {
    at: new Date().toISOString(),
    requestId: opts.requestId || null,
    paidPrice: Number(opts.paidPrice) || 0,
    listPrice: Number(opts.listPrice) || 0,
  };
  const offer = state.offers.find((o) => o && o.id === offerId);
  if (offer) {
    offer.stats = offer.stats || { redemptions: 0, revenue: 0 };
    offer.stats.redemptions = (Number(offer.stats.redemptions) || 0) + 1;
    offer.stats.revenue = Math.round(((Number(offer.stats.revenue) || 0) + (Number(opts.paidPrice) || 0)) * 100) / 100;
  }
  await _save(state);
  return { ok: true, already: false };
}

async function _filterActivePackageIds(ids) {
  const out = [];
  for (const raw of ids || []) {
    const id = String(raw || '').trim();
    if (!id) continue;
    if (await _isPackageActive(id, id)) out.push(id);
  }
  return out;
}

/** عرض نشط الآن لبطاقة المشترك (نص فقط — XSS-safe titles) */
async function getPublicActiveOffer(atMs) {
  const state = await _load();
  const t = atMs != null ? atMs : Date.now();
  const live = state.offers.filter((o) => isOfferLive(o, t));
  if (!live.length) return null;
  live.sort((a, b) => _parseMs(b.startAt) - _parseMs(a.startAt));
  const o = live[0];
  const daysLeft = Math.max(0, Math.ceil((_parseMs(o.endAt) - t) / 86400000));
  const packageIds = await _filterActivePackageIds(o.packageIds);
  if (!packageIds.length) return null;
  return {
    id: o.id,
    titleAr: _escTitle(o.titleAr),
    titleFr: _escTitle(o.titleFr),
    percent: o.percent,
    startAt: o.startAt,
    endAt: o.endAt,
    packageIds,
    daysLeft,
  };
}

async function offerHistory() {
  const state = await _load();
  const now = Date.now();
  return state.offers
    .slice()
    .sort((a, b) => String(b.endAt).localeCompare(String(a.endAt)))
    .map((o) => ({
      id: o.id,
      titleAr: _escTitle(o.titleAr),
      titleFr: _escTitle(o.titleFr),
      percent: o.percent,
      startAt: o.startAt,
      endAt: o.endAt,
      packageIds: o.packageIds,
      published: o.published !== false,
      archivedAt: o.archivedAt || null,
      status: !o.published || o.archivedAt
        ? 'archived'
        : (now < _parseMs(o.startAt) ? 'scheduled' : (now > _parseMs(o.endAt) ? 'ended' : 'active')),
      stats: o.stats || { redemptions: 0, revenue: 0 },
      redemptionCount: Object.keys((state.redemptions && state.redemptions[o.id]) || {}).length,
    }));
}

module.exports = {
  listOffers,
  getOffer,
  upsertOffer,
  archiveOffer,
  resolveOfferPrice,
  recordRedemption,
  getPublicActiveOffer,
  offerHistory,
  isOfferLive,
  offersOverlap,
  normalizeOfferInput,
  _escTitle,
  COLLECTION_ID,
};
