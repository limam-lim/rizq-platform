/**
 * rizq-backend/services/entitlements.js
 * ══════════════════════════════════════════════════════════════════
 * مصدر الحقيقة لصلاحيات الباقات على الخادم — Feature Gate + Limits
 * يطابق مصفوفة صفحة الهبوط: مجاني / Pro / Business (+ فئات المحل/المكتب/الشركة)
 * ══════════════════════════════════════════════════════════════════
 */
const { getAccountRecord } = require('../rizq_package_lifecycle_agent');

/** @typedef {'free'|'pro'|'business'|'store_trial'|'store_monthly'|'store_quarterly'|'store_yearly'|'store_diamond'|'office_basic'|'office_pro'|'corp_trial'|'corp_monthly'|'corp_diamond'} PlanType */

const ACTIVE_STATUSES = ['active', 'expiring_soon'];
const BLOCKED_STATUSES = ['suspended', 'expired'];

/** مصفوفة الأفراد — مطابقة لصفحة الهبوط (DEF_IND) */
const INDIVIDUAL_PLANS = {
  free: {
    planType: 'free',
    maxActiveAds: 5,
    maxPhotosPerItem: 5,
    videoMaxSec: 30,
    videoMaxMb: 20,
    videoWatermark: true,
    privateStore: false,
    priorityListing: false,
    weeklyBoost: false,
    advancedAnalytics: false,
    accountManager: false,
    features: ['basic_profile', 'view_listings', 'basic_contact', 'dashboard_access', 'verified_badge', 'keep_old_ads'],
  },
  pro: {
    planType: 'pro',
    maxActiveAds: Infinity,
    maxPhotosPerItem: 10,
    videoMaxSec: 60,
    videoMaxMb: 40,
    videoWatermark: false,
    privateStore: false,
    priorityListing: true,
    weeklyBoost: true,
    advancedAnalytics: false,
    accountManager: false,
    features: ['basic_profile', 'view_listings', 'basic_contact', 'dashboard_access', 'verified_badge', 'keep_old_ads',
      'unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'weekly_boost'],
  },
  business: {
    planType: 'business',
    maxActiveAds: Infinity,
    maxPhotosPerItem: 10,
    videoMaxSec: 60,
    videoMaxMb: 40,
    videoWatermark: false,
    privateStore: true,
    priorityListing: true,
    weeklyBoost: true,
    advancedAnalytics: true,
    accountManager: true,
    features: ['basic_profile', 'view_listings', 'basic_contact', 'dashboard_access', 'verified_badge', 'keep_old_ads',
      'unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'weekly_boost',
      'private_store', 'advanced_analytics', 'account_manager'],
  },
};

/** حدود المحلات — مطابقة PKG_DEFAULTS + POST_LIMITS */
const STORE_PLANS = {
  store_trial: { planType: 'store_trial', maxCatalogItems: Infinity, maxPhotosPerItem: 5, videoMaxSec: 0, videoMaxMb: 0, videoWatermark: true, features: ['dashboard_access'] },
  store_monthly: { planType: 'store_monthly', maxCatalogItems: 50, maxPhotosPerItem: 8, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos'] },
  store_quarterly: { planType: 'store_quarterly', maxCatalogItems: 200, maxPhotosPerItem: 8, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge'] },
  store_yearly: { planType: 'store_yearly', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge'] },
  store_diamond: { planType: 'store_diamond', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge', 'auto_reply_calls', 'vip_manager', 'ai_agent_full'] },
};

const OFFICE_PLANS = {
  office_basic: { planType: 'office_basic', maxCatalogItems: 5, maxPhotosPerItem: 5, videoMaxSec: 30, videoMaxMb: 20, videoWatermark: true, features: ['dashboard_access'] },
  office_pro: { planType: 'office_pro', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 60, videoMaxMb: 40, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing'] },
};

const CORP_PLANS = {
  corp_trial: { planType: 'corp_trial', maxCatalogItems: Infinity, maxPhotosPerItem: 5, videoMaxSec: 30, videoMaxMb: 20, videoWatermark: true, features: ['dashboard_access'] },
  corp_monthly: { planType: 'corp_monthly', maxCatalogItems: 30, maxPhotosPerItem: 8, videoMaxSec: 60, videoMaxMb: 40, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics'] },
  corp_quarterly: { planType: 'corp_quarterly', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 60, videoMaxMb: 40, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'priority_listing'] },
  corp_yearly: { planType: 'corp_yearly', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 60, videoMaxMb: 40, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'priority_listing', 'vip_badge'] },
  corp_diamond: { planType: 'corp_diamond', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge', 'auto_reply_calls', 'vip_manager', 'ai_agent_full'] },
};

const FREE_FALLBACK = INDIVIDUAL_PLANS.free;

/** خريطة أسماء الباقات العربية/الإنجليزية → planType */
function mapPackageNameToPlanType(pkgName, accountType) {
  const name = String(pkgName || '').replace(/💎\s*/g, '').trim().toLowerCase();
  const type = String(accountType || 'individual').toLowerCase();

  if (/^(pro|باقة\s*pro)$/.test(name) || name === 'pro') return type === 'individual' ? 'pro' : null;
  if (/business|🏢|أعمال/.test(name)) return type === 'individual' ? 'business' : null;

  if (type === 'store' || type === 'shop') {
    if (/تجريب|trial|مجان/.test(name)) return 'store_trial';
    if (/ماس|diamond/.test(name)) return 'store_diamond';
    if (/سنو|year|annual/.test(name)) return 'store_yearly';
    if (/ربع|quarter/.test(name)) return 'store_quarterly';
    if (/شهر|month/.test(name)) return 'store_monthly';
    return 'store_monthly';
  }
  if (type === 'office') {
    if (/احتراف|pro|premium/.test(name)) return 'office_pro';
    if (/أساس|basic/.test(name)) return 'office_basic';
    if (/تأمين|insurance/.test(name)) return 'office_pro';
    return 'office_basic';
  }
  if (type === 'corp') {
    if (/تجريب|trial/.test(name)) return 'corp_trial';
    if (/ماس|diamond/.test(name)) return 'corp_diamond';
    if (/سنو|year/.test(name)) return 'corp_yearly';
    if (/ربع|quarter/.test(name)) return 'corp_quarterly';
    if (/شهر|month/.test(name)) return 'corp_monthly';
    return 'corp_monthly';
  }

  // individual (افتراضي)
  if (/مجان|free/.test(name)) return 'free';
  if (/pro/.test(name) || name === 'باقة شهرية' || name === 'شهرية') return 'pro';
  if (/business/.test(name)) return 'business';
  return 'free';
}

function resolvePlanDefinition(planType, accountType) {
  const t = String(accountType || 'individual').toLowerCase();
  if (INDIVIDUAL_PLANS[planType]) return INDIVIDUAL_PLANS[planType];
  if (STORE_PLANS[planType]) return STORE_PLANS[planType];
  if (OFFICE_PLANS[planType]) return OFFICE_PLANS[planType];
  if (CORP_PLANS[planType]) return CORP_PLANS[planType];
  if (t === 'store') return STORE_PLANS.store_trial;
  if (t === 'office') return OFFICE_PLANS.office_basic;
  if (t === 'corp') return CORP_PLANS.corp_trial;
  return FREE_FALLBACK;
}

function getSubscriptionStatus(rec) {
  if (!rec || !rec.periodEnd) return 'no_subscription';
  if (rec.status === 'suspended') return 'suspended';
  const endMs = new Date(rec.periodEnd).getTime();
  if (Number.isNaN(endMs)) return 'no_subscription';
  const now = Date.now();
  if (endMs < now) {
    return rec.status === 'suspended' ? 'suspended' : 'expired';
  }
  if (rec.status === 'expiring_soon') return 'expiring_soon';
  if (rec.status === 'expired') return 'expired';
  return 'active';
}

/**
 * @param {string} accountId
 * @param {string} [accountType='individual']
 * @param {object} [accountRecordOverride]
 */
function getEntitlements(accountId, accountType, accountRecordOverride) {
  const rec = accountRecordOverride || getAccountRecord(accountId);
  const subscriptionStatus = getSubscriptionStatus(rec);
  const type = rec && rec.accountType ? rec.accountType : accountType;

  let planType = 'free';
  if (rec && rec.planType && ACTIVE_STATUSES.includes(subscriptionStatus)) {
    planType = rec.planType;
  } else if (rec && ACTIVE_STATUSES.includes(subscriptionStatus)) {
    planType = mapPackageNameToPlanType(rec.pkgName, type);
  } else if (rec && subscriptionStatus === 'expired') {
    planType = 'free';
  } else if (rec && subscriptionStatus === 'suspended') {
    planType = 'free';
  }

  const plan = resolvePlanDefinition(planType, type);
  const isPaidActive = ACTIVE_STATUSES.includes(subscriptionStatus);

  return {
    accountId,
    accountType: type,
    planType: isPaidActive ? plan.planType : 'free',
    subscriptionStatus,
    pkgName: rec ? rec.pkgName : null,
    startDate: rec ? rec.periodStart : null,
    endDate: rec ? rec.periodEnd : null,
    limits: {
      maxActiveAds: plan.maxActiveAds != null ? plan.maxActiveAds : (plan.maxCatalogItems != null ? plan.maxCatalogItems : 5),
      maxCatalogItems: plan.maxCatalogItems != null ? plan.maxCatalogItems : (plan.maxActiveAds != null ? plan.maxActiveAds : 5),
      maxPhotosPerItem: plan.maxPhotosPerItem || 5,
      videoMaxSec: plan.videoMaxSec != null ? plan.videoMaxSec : 30,
      videoMaxMb: plan.videoMaxMb != null ? plan.videoMaxMb : 20,
      videoWatermark: !!plan.videoWatermark,
    },
    features: isPaidActive ? (plan.features || []) : FREE_FALLBACK.features,
    flags: {
      privateStore: isPaidActive && !!plan.privateStore,
      priorityListing: isPaidActive && !!plan.priorityListing,
      weeklyBoost: isPaidActive && !!plan.weeklyBoost,
      advancedAnalytics: isPaidActive && !!plan.advancedAnalytics,
      accountManager: isPaidActive && !!plan.accountManager,
      aiAgent: isPaidActive && (plan.features || []).includes('ai_agent_full'),
    },
  };
}

function hasFeature(entitlements, featureName) {
  return !!(entitlements && Array.isArray(entitlements.features) && entitlements.features.includes(featureName));
}

function entitlementError(code, message, extra) {
  const err = new Error(message || code);
  err.status = 403;
  err.code = code;
  err.details = extra || {};
  return err;
}

function assertSubscriptionActive(entitlements) {
  if (!entitlements) throw entitlementError('no_entitlements', 'لا يوجد سجل اشتراك');
  if (entitlements.subscriptionStatus === 'suspended') {
    throw entitlementError('subscription_suspended', 'تم إيقاف اشتراكك — جدّد الباقة لاستعادة الميزات');
  }
}

function assertCanPostAd(entitlements, currentActiveCount) {
  assertSubscriptionActive(entitlements);
  if (entitlements.subscriptionStatus === 'expired' || entitlements.planType === 'free') {
    const limit = entitlements.limits.maxActiveAds;
    if (limit !== Infinity && currentActiveCount >= limit) {
      throw entitlementError('ad_limit_reached', `وصلت لحد ${limit} إعلانات نشطة في باقتك المجانية`, { limit, used: currentActiveCount });
    }
  } else {
    const limit = entitlements.limits.maxActiveAds;
    if (limit !== Infinity && currentActiveCount >= limit) {
      throw entitlementError('ad_limit_reached', `وصلت لحد ${limit} إعلان نشط في باقتك`, { limit, used: currentActiveCount });
    }
  }
}

function assertCanAddCatalogItem(entitlements, currentActiveCount) {
  assertSubscriptionActive(entitlements);
  const limit = entitlements.limits.maxCatalogItems;
  if (limit !== Infinity && currentActiveCount >= limit) {
    throw entitlementError('catalog_limit_reached', `وصلت لحد ${limit} منتج/خدمة في باقتك`, { limit, used: currentActiveCount });
  }
}

function assertPhotoCount(entitlements, count) {
  assertSubscriptionActive(entitlements);
  const max = entitlements.limits.maxPhotosPerItem || 5;
  if (count > max) {
    throw entitlementError('photo_limit_exceeded', `باقتك تسمح بـ ${max} صور كحد أقصى — حاولت رفع ${count}`, { max, requested: count });
  }
}

function assertVideoPolicy(entitlements, opts) {
  assertSubscriptionActive(entitlements);
  const { durationSec, sizeMb, wantsNoWatermark } = opts || {};
  if (wantsNoWatermark && entitlements.limits.videoWatermark) {
    throw entitlementError('video_watermark_required', 'الفيديو بدون علامة مائية متاح في باقة Pro أو أعلى');
  }
  if (durationSec != null && durationSec > entitlements.limits.videoMaxSec) {
    throw entitlementError('video_duration_exceeded', `مدة الفيديو تتجاوز ${entitlements.limits.videoMaxSec} ثانية المسموحة في باقتك`);
  }
  if (sizeMb != null && sizeMb > entitlements.limits.videoMaxMb) {
    throw entitlementError('video_size_exceeded', `حجم الفيديو يتجاوز ${entitlements.limits.videoMaxMb}MB المسموحة في باقتك`);
  }
}

function assertFeature(entitlements, featureName) {
  assertSubscriptionActive(entitlements);
  if (!hasFeature(entitlements, featureName)) {
    throw entitlementError('feature_not_in_plan', `الميزة "${featureName}" غير مشمولة في باقتك الحالية`);
  }
}

/** تُستدعى عند انتهاء/إيقاف الاشتراك — إرجاع حقول التخفيض */
function buildDowngradePatch() {
  return {
    planType: 'free',
    subscriptionStatus: 'expired',
    downgradedAt: new Date().toISOString(),
  };
}

module.exports = {
  INDIVIDUAL_PLANS,
  STORE_PLANS,
  mapPackageNameToPlanType,
  getEntitlements,
  getSubscriptionStatus,
  hasFeature,
  assertSubscriptionActive,
  assertCanPostAd,
  assertCanAddCatalogItem,
  assertPhotoCount,
  assertVideoPolicy,
  assertFeature,
  buildDowngradePatch,
  entitlementError,
};
