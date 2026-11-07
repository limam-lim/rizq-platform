'use strict';
/**
 * ذاكرة مؤقتة لأرقام بطاقة الإحصاءات (إعلانات نشطة + أقسام/فروع).
 * TTL افتراضي 90ث ضمن 60–120ث — يُبطَل عند writeAds (نشر/تفعيل/انتهاء).
 */
const launchMode = require('../config/launchMode');
const { countActiveAds } = require('./adsStat');

const MIN_TTL_MS = 60 * 1000;
const MAX_TTL_MS = 120 * 1000;
const DEFAULT_TTL_MS = 90 * 1000;

let _adsSnap = null; /* { at, real, withDemo, siteAdsCount, minShow } */
let _catSnap = null; /* { at, stats } */
let _readsAds = 0;
let _readsCats = 0;

function resolveTtlMs() {
  const raw = Number(process.env.PLATFORM_STATS_CACHE_TTL_MS);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.min(MAX_TTL_MS, Math.max(MIN_TTL_MS, Math.floor(raw)));
  }
  return DEFAULT_TTL_MS;
}

function invalidateAdsStatsCache() {
  _adsSnap = null;
}

function invalidateCategoryStatsCache() {
  _catSnap = null;
}

function invalidatePlatformStatsCache() {
  invalidateAdsStatsCache();
  invalidateCategoryStatsCache();
}

/**
 * لقطة عدّ الإعلانات + إعدادات العرض — بلا الاحتفاظ بمصفوفة الإعلانات كاملة.
 */
async function getAdsCountSnapshot(deps) {
  const d = deps || {};
  const ttl = resolveTtlMs();
  const now = Date.now();
  if (_adsSnap && (now - _adsSnap.at) < ttl) {
    return Object.assign({ cacheHit: true, ttlMs: ttl }, _adsSnap);
  }

  _readsAds += 1;
  const ads = typeof d.readAds === 'function' ? await d.readAds() : [];
  const real = countActiveAds(ads, false);
  const withDemo = countActiveAds(ads, true);

  let siteAdsCount = 0;
  if (typeof d.getSiteConfig === 'function') {
    try {
      const cfg = (await d.getSiteConfig()) || {};
      siteAdsCount = Math.max(0, Math.floor(Number(cfg.site && cfg.site.adsCount) || 0));
    } catch (e) { /* */ }
  }

  let minShow = launchMode.normalizeMinActiveAdsToShow(null);
  try {
    const getLaunch = d.getLaunchSettings || (() => launchMode.getLaunchSettings());
    const launch = await getLaunch();
    minShow = launchMode.normalizeMinActiveAdsToShow(launch && launch.minActiveAdsToShow);
  } catch (eL) { /* keep default */ }

  _adsSnap = {
    at: now,
    real,
    withDemo,
    siteAdsCount,
    minShow,
  };
  return Object.assign({ cacheHit: false, ttlMs: ttl }, _adsSnap);
}

function getCachedCategoryStats(getCategoryStatsFn) {
  const ttl = resolveTtlMs();
  const now = Date.now();
  if (_catSnap && (now - _catSnap.at) < ttl && _catSnap.stats) {
    return Object.assign({ cacheHit: true }, _catSnap.stats);
  }
  _readsCats += 1;
  const stats = typeof getCategoryStatsFn === 'function' ? getCategoryStatsFn() : null;
  if (!stats) return stats;
  _catSnap = { at: now, stats };
  return Object.assign({ cacheHit: false }, stats);
}

/** اختبارات فقط */
function _resetPlatformStatsCacheForTests() {
  _adsSnap = null;
  _catSnap = null;
  _readsAds = 0;
  _readsCats = 0;
}

function _cacheDebugForTests() {
  return {
    ttlMs: resolveTtlMs(),
    adsAt: _adsSnap ? _adsSnap.at : 0,
    catAt: _catSnap ? _catSnap.at : 0,
    readsAds: _readsAds,
    readsCats: _readsCats,
    hasAds: !!_adsSnap,
    hasCats: !!_catSnap,
  };
}

module.exports = {
  MIN_TTL_MS,
  MAX_TTL_MS,
  DEFAULT_TTL_MS,
  resolveTtlMs,
  invalidateAdsStatsCache,
  invalidateCategoryStatsCache,
  invalidatePlatformStatsCache,
  getAdsCountSnapshot,
  getCachedCategoryStats,
  _resetPlatformStatsCacheForTests,
  _cacheDebugForTests,
};
