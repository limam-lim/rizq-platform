/**
 * rizq-backend/services/entitlements.js
 * ══════════════════════════════════════════════════════════════════
 * © Rizq ADMINIA SARL — Proprietary & Confidential
 * مصدر الحقيقة لصلاحيات الباقات على الخادم — Feature Gate + Limits
 * يطابق مصفوفة صفحة الهبوط: مجاني / Pro / Business (+ فئات المحل/المكتب/الشركة)
 * ══════════════════════════════════════════════════════════════════
 */
const { getAccountRecord } = require('../rizq_package_lifecycle_agent');
const {
  resolveDiamondTier,
  isTrialPackage,
  resolveQuotaLimitsForAccount,
  findCatalogPackage,
} = require('./catalogConfig');

/** @typedef {'free'|'pro'|'business'|'diamond_standard'|'diamond_pro'|'store_trial'|...} PlanType */

const AI_PAID_FEATURES = [
  'ai_agent_full', 'widget_channel', 'whatsapp_channel', 'calls_channel',
  'auto_reply_calls', 'vip_manager', 'quota_dashboard',
];
const PRO_ONLY_FEATURES = ['calls_channel', 'auto_reply_calls'];

const ACTIVE_STATUSES = ['active', 'expiring_soon'];
const BLOCKED_STATUSES = ['suspended', 'expired'];
const PENDING_STATUSES = ['pending', 'pending_payment', 'awaiting_payment'];

function isPaymentConfirmed(rec) {
  if (!rec) return false;
  if (rec.paymentConfirmed === true || rec.paidAt) return true;
  if (rec.paymentConfirmed === false) return false;
  // سجلات قديمة قبل حقل paymentConfirmed — تُعتبر موثّقة إذا فُعّلت من الأدمن
  return rec.activatedBy === 'admin' && ACTIVE_STATUSES.includes(rec.status);
}

function getSubscriptionStatus(rec) {
  if (!rec) return 'no_subscription';
  if (PENDING_STATUSES.includes(rec.status)) return 'pending';
  if (!isPaymentConfirmed(rec) && rec.status !== 'suspended' && rec.status !== 'expired') {
    return 'pending';
  }
  if (rec.status === 'suspended') return 'suspended';
  const endMs = rec.periodEnd ? new Date(rec.periodEnd).getTime() : NaN;
  if (!rec.periodEnd || Number.isNaN(endMs)) {
    return rec.status === 'expired' ? 'expired' : 'no_subscription';
  }
  const now = Date.now();
  if (endMs <= now) {
    return rec.status === 'suspended' ? 'suspended' : 'expired';
  }
  if (rec.status === 'expiring_soon') return 'expiring_soon';
  if (rec.status === 'expired') return 'expired';
  if (ACTIVE_STATUSES.includes(rec.status)) return 'active';
  return 'no_subscription';
}
const INDIVIDUAL_PLANS = {
  free: {
    planType: 'free',
    maxActiveAds: 1,
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
    maxActiveAds: 10,
    maxPhotosPerItem: 5,
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
  medium: {
    planType: 'medium',
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
  store_trial: { planType: 'store_trial', maxCatalogItems: 10, maxPhotosPerItem: 5, videoMaxSec: 0, videoMaxMb: 0, videoWatermark: true, features: ['dashboard_access'] },
  store_monthly: { planType: 'store_monthly', maxCatalogItems: 100, maxPhotosPerItem: 8, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['intro_video', 'analytics', 'extra_photos'] },
  store_quarterly: { planType: 'store_quarterly', maxCatalogItems: 500, maxPhotosPerItem: 8, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge'] },
  store_yearly: { planType: 'store_yearly', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge'] },
  store_diamond: { planType: 'store_diamond', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge', 'ai_agent_full', 'widget_channel', 'whatsapp_channel', 'quota_dashboard'], diamondTier: 'diamond_standard', audioAccess: false, quotaMessages: 1500, quotaMinutes: 0 },
  store_diamond_pro: { planType: 'store_diamond_pro', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge', 'ai_agent_full', 'widget_channel', 'whatsapp_channel', 'calls_channel', 'auto_reply_calls', 'quota_dashboard'], diamondTier: 'diamond_pro', audioAccess: true, quotaMessages: 2500, quotaMinutes: 150 },
};

const DIAMOND_STANDARD_PLAN = {
  planType: 'diamond_standard',
  maxCatalogItems: Infinity,
  maxPhotosPerItem: 10,
  videoMaxSec: 90,
  videoMaxMb: 50,
  videoWatermark: false,
  diamondTier: 'diamond_standard',
  audioAccess: false,
  features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge', 'vip_manager', 'ai_agent_full', 'widget_channel', 'whatsapp_channel', 'quota_dashboard'],
};

const DIAMOND_PRO_PLAN = {
  planType: 'diamond_pro',
  maxCatalogItems: Infinity,
  maxPhotosPerItem: 10,
  videoMaxSec: 90,
  videoMaxMb: 50,
  videoWatermark: false,
  diamondTier: 'diamond_pro',
  audioAccess: true,
  features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge', 'vip_manager', 'ai_agent_full', 'widget_channel', 'whatsapp_channel', 'calls_channel', 'auto_reply_calls', 'quota_dashboard'],
};

const OFFICE_PLANS = {
  office_trial: { planType: 'office_trial', maxCatalogItems: 3, maxPhotosPerItem: 5, videoMaxSec: 0, videoMaxMb: 0, videoWatermark: true, features: ['dashboard_access'] },
  office_monthly: { planType: 'office_monthly', maxCatalogItems: Infinity, maxPhotosPerItem: 8, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['intro_video', 'analytics', 'verified_badge', 'appointment_booking'] },
  office_quarterly: { planType: 'office_quarterly', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'account_manager'] },
  office_yearly: { planType: 'office_yearly', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'priority_listing', 'vip_badge'] },
  office_diamond: { planType: 'office_diamond', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge', 'ai_agent_full', 'widget_channel', 'whatsapp_channel', 'quota_dashboard'], diamondTier: 'diamond_standard', audioAccess: false, quotaMessages: 2000, quotaMinutes: 0 },
  office_diamond_pro: { planType: 'office_diamond_pro', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge', 'ai_agent_full', 'widget_channel', 'whatsapp_channel', 'calls_channel', 'auto_reply_calls', 'quota_dashboard'], diamondTier: 'diamond_pro', audioAccess: true, quotaMessages: 3500, quotaMinutes: 200 },
  office_basic: { planType: 'office_basic', maxCatalogItems: 5, maxPhotosPerItem: 5, videoMaxSec: 30, videoMaxMb: 20, videoWatermark: true, features: ['dashboard_access'] },
  office_pro: { planType: 'office_pro', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 60, videoMaxMb: 40, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing'] },
};

const CORP_PLANS = {
  corp_trial: { planType: 'corp_trial', maxCatalogItems: Infinity, maxPhotosPerItem: 5, videoMaxSec: 30, videoMaxMb: 20, videoWatermark: true, features: ['dashboard_access'] },
  corp_monthly: { planType: 'corp_monthly', maxCatalogItems: 30, maxPhotosPerItem: 8, videoMaxSec: 60, videoMaxMb: 40, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics'] },
  corp_quarterly: { planType: 'corp_quarterly', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 60, videoMaxMb: 40, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'priority_listing'] },
  corp_yearly: { planType: 'corp_yearly', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 60, videoMaxMb: 40, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'priority_listing', 'vip_badge'] },
  corp_diamond: { planType: 'corp_diamond', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge', 'ai_agent_full', 'widget_channel', 'whatsapp_channel', 'quota_dashboard'], diamondTier: 'diamond_standard', audioAccess: false, quotaMessages: 4000, quotaMinutes: 0 },
  corp_diamond_pro: { planType: 'corp_diamond_pro', maxCatalogItems: Infinity, maxPhotosPerItem: 10, videoMaxSec: 90, videoMaxMb: 50, videoWatermark: false, features: ['unlimited_products', 'intro_video', 'analytics', 'extra_photos', 'priority_listing', 'vip_badge', 'ai_agent_full', 'widget_channel', 'whatsapp_channel', 'calls_channel', 'auto_reply_calls', 'quota_dashboard', 'api_erp_integration'], diamondTier: 'diamond_pro', audioAccess: true, quotaMessages: 7000, quotaMinutes: 600 },
};

const FREE_FALLBACK = INDIVIDUAL_PLANS.free;

/** باقات Rizq ADS / الفيديو الإعلاني — تقارير آلية + دعم VIP (بلا مدير حساب يدوي) */
const MEDIA_PLANS = {
  media_single: {
    planType: 'media_single',
    maxVideosPerMonth: 1,
    payPerAd: true,
    validityDays: 10,
    placement: 'homepage_ads',
    heroPlacement: false,
    prioritySearch: false,
    featuredBadge: false,
    basicStats: true,
    automatedReports: false,
    vipSupport: false,
    vipBadge: false,
    features: ['homepage_ads_section', 'basic_performance_stats', 'pay_per_ad'],
  },
  media_basic: {
    planType: 'media_basic',
    maxVideosPerMonth: 3,
    placement: 'homepage_ads',
    heroPlacement: false,
    prioritySearch: false,
    featuredBadge: false,
    basicStats: true,
    automatedReports: false,
    vipSupport: false,
    vipBadge: false,
    features: ['homepage_ads_section', 'basic_performance_stats'],
  },
  media_pro: {
    planType: 'media_pro',
    maxVideosPerMonth: 10,
    placement: 'homepage_ads',
    heroPlacement: false,
    prioritySearch: true,
    featuredBadge: true,
    basicStats: true,
    automatedReports: false,
    vipSupport: false,
    vipBadge: false,
    features: ['homepage_ads_section', 'basic_performance_stats', 'priority_search', 'featured_content_badge'],
  },
  media_corporate: {
    planType: 'media_corporate',
    maxVideosPerMonth: Infinity,
    placement: 'homepage_hero',
    heroPlacement: true,
    prioritySearch: true,
    featuredBadge: true,
    basicStats: true,
    automatedReports: true,
    vipSupport: true,
    vipBadge: true,
    features: ['unlimited_videos', 'homepage_hero', 'automated_analytics_reports', 'priority_vip_support', 'vip_badge'],
  },
};

function mapMediaPackageToPlanType(rec) {
  if (!rec) return null;
  const id = String(rec.packageId || rec.pkgId || '').toLowerCase();
  const name = String(rec.pkgName || '').toLowerCase();
  if (id === 'vid-single' || /إعلان فيديو واحد|single.*ad|par annonce|pay.?per/i.test(name)) return 'media_single';
  if (id === 'vid-business' || /أعمال|معارض|corporate|business|showroom/.test(name)) return 'media_corporate';
  if (id === 'vid-pro' || /احتراف|pro vid|pro video/.test(name)) return 'media_pro';
  if (id === 'vid-basic' || /أساس|basic|basique/.test(name)) return 'media_basic';
  if (/فيديو|video|rizq ads|إعلان.*فيديو/.test(name)) return 'media_basic';
  return null;
}

/**
 * صلاحيات Rizq ADS / الفيديو الإعلاني لحساب (من سجل الباقة النشط).
 */
function getMediaEntitlements(accountId, accountRecordOverride) {
  const rec = accountRecordOverride || getAccountRecord(accountId);
  const planType = mapMediaPackageToPlanType(rec);
  if (!rec || !planType) {
    return {
      accountId,
      planType: null,
      subscribed: false,
      subscriptionStatus: 'no_subscription',
      maxVideosPerMonth: 0,
      canUploadVideo: false,
    };
  }
  const subscriptionStatus = getSubscriptionStatus(rec);
  const isActive = ACTIVE_STATUSES.includes(subscriptionStatus) || subscriptionStatus === 'active';
  const plan = MEDIA_PLANS[planType] || MEDIA_PLANS.media_basic;
  const isPaidActive = isActive && isPaymentConfirmed(rec);

  return {
    accountId,
    planType: isPaidActive ? planType : null,
    pkgName: rec.pkgName,
    packageId: rec.packageId || rec.pkgId || null,
    subscribed: isPaidActive,
    subscriptionStatus: isActive ? subscriptionStatus : 'no_subscription',
    periodEnd: rec.periodEnd || null,
    maxVideosPerMonth: isPaidActive ? plan.maxVideosPerMonth : 0,
    payPerAd: isPaidActive && !!plan.payPerAd,
    validityDays: isPaidActive ? (plan.validityDays || null) : null,
    canUploadVideo: isPaidActive,
    placement: isPaidActive ? plan.placement : null,
    heroPlacement: isPaidActive && !!plan.heroPlacement,
    prioritySearch: isPaidActive && !!plan.prioritySearch,
    featuredBadge: isPaidActive && !!plan.featuredBadge,
    basicStats: isPaidActive && !!plan.basicStats,
    automatedReports: isPaidActive && !!plan.automatedReports,
    vipSupport: isPaidActive && !!plan.vipSupport,
    vipBadge: isPaidActive && !!plan.vipBadge,
    features: isPaidActive ? (plan.features || []) : [],
  };
}

/** باقات غرفة المناقصات — حماية بيانات التواصل + تقديم العروض */
const TENDER_PLANS = {
  tender_trial: {
    planType: 'tender_trial',
    canViewTenders: true,
    canUnlockContacts: false,
    canSubmitProposals: false,
    canPostTenders: false,
    priorityPlacement: false,
    tenderAlerts: false,
    vipSupport: false,
    features: ['view_tenders', 'filter_tenders'],
  },
  tender_monthly: {
    planType: 'tender_monthly',
    canViewTenders: true,
    canUnlockContacts: true,
    canSubmitProposals: true,
    canPostTenders: true,
    priorityPlacement: false,
    tenderAlerts: false,
    vipSupport: false,
    features: ['view_tenders', 'unlock_contacts', 'submit_proposals', 'post_tenders'],
  },
  tender_quarterly: {
    planType: 'tender_quarterly',
    canViewTenders: true,
    canUnlockContacts: true,
    canSubmitProposals: true,
    canPostTenders: true,
    priorityPlacement: true,
    tenderAlerts: false,
    vipSupport: false,
    features: ['view_tenders', 'unlock_contacts', 'submit_proposals', 'post_tenders', 'priority_placement'],
  },
  tender_yearly: {
    planType: 'tender_yearly',
    canViewTenders: true,
    canUnlockContacts: true,
    canSubmitProposals: true,
    canPostTenders: true,
    priorityPlacement: true,
    tenderAlerts: true,
    vipSupport: true,
    features: ['view_tenders', 'unlock_contacts', 'submit_proposals', 'post_tenders', 'priority_placement', 'tender_alerts', 'vip_support'],
  },
};

const TENDER_PUBLIC_ACCESS = {
  planType: 'tender_public',
  subscriptionStatus: 'no_subscription',
  canViewTenders: true,
  canUnlockContacts: false,
  canSubmitProposals: false,
  canPostTenders: false,
  priorityPlacement: false,
  tenderAlerts: false,
  vipSupport: false,
  isTrial: false,
  subscribed: false,
};

function mapTenderPackageToPlanType(rec) {
  if (!rec) return 'tender_public';
  const isTrial = !!(rec.isTrial || isTrialPackage(rec.pkgName, rec.price));
  const id = String(rec.packageId || rec.pkgId || '').toLowerCase();
  const name = String(rec.pkgName || '').toLowerCase();
  if (isTrial || id === 'tnd-trial' || /تجريب|trial|مجان/.test(name)) return 'tender_trial';
  if (id === 'tnd-quart' || /ربع|quarter|trimest/.test(name)) return 'tender_quarterly';
  if (id === 'tnd-year' || /سنو|year|annu/.test(name)) return 'tender_yearly';
  if (id === 'tnd-month' || /شهر|month|mensuel/.test(name)) return 'tender_monthly';
  if (/مناقص|tender|appel/.test(name)) return 'tender_monthly';
  return 'tender_monthly';
}

/**
 * صلاحيات غرفة المناقصات لحساب (أو زائر بلا حساب).
 * التصفح متاح للجميع؛ كشف التواصل وتقديم العروض للمشتركين المدفوعين فقط.
 */
function getTenderEntitlements(accountId) {
  const rec = accountId ? getAccountRecord(String(accountId) + '::tender') : null;
  if (!rec) {
    return Object.assign({ accountId: accountId || null }, TENDER_PUBLIC_ACCESS);
  }
  const subscriptionStatus = getSubscriptionStatus(rec);
  const isActive = ACTIVE_STATUSES.includes(subscriptionStatus) || subscriptionStatus === 'active';
  const planType = mapTenderPackageToPlanType(rec);
  const plan = TENDER_PLANS[planType] || TENDER_PLANS.tender_trial;
  const isTrial = !!(rec.isTrial || planType === 'tender_trial' || isTrialPackage(rec.pkgName, rec.price));
  const isPaidActive = isActive && !isTrial && isPaymentConfirmed(rec);

  return {
    accountId,
    planType: isActive ? planType : 'tender_public',
    subscriptionStatus: isActive ? subscriptionStatus : 'no_subscription',
    pkgName: rec.pkgName,
    packageId: rec.packageId || rec.pkgId || null,
    isTrial: isActive && isTrial,
    subscribed: isActive,
    periodEnd: rec.periodEnd || null,
    canViewTenders: true,
    canUnlockContacts: isPaidActive && !!plan.canUnlockContacts,
    canSubmitProposals: isPaidActive && !!plan.canSubmitProposals,
    canPostTenders: isPaidActive && !!plan.canPostTenders,
    priorityPlacement: isPaidActive && !!plan.priorityPlacement,
    tenderAlerts: isPaidActive && !!plan.tenderAlerts,
    vipSupport: isPaidActive && !!plan.vipSupport,
    features: isPaidActive ? (plan.features || []) : (isActive && isTrial ? TENDER_PLANS.tender_trial.features : []),
  };
}

function resolveTenderPlanFromRef(ref) {
  const pkg = findCatalogPackage(ref);
  const pkgName = typeof ref === 'string' ? ref : String((ref && ref.pkgName) || (ref && ref.name) || '');
  const price = pkg ? pkg.price : (ref && ref.price);
  const pseudo = {
    pkgName: (pkg && pkg.name) || pkgName,
    packageId: (pkg && pkg.id) || (ref && ref.packageId) || null,
    price,
    isTrial: isTrialPackage((pkg && pkg.name) || pkgName, price),
  };
  return mapTenderPackageToPlanType(pseudo);
}

/** خريطة packageId القياسية → planType (المصدر الأساسي) */
const PACKAGE_ID_TO_PLAN = {
  'ind-free': 'free',
  'ind-boost': 'free',
  'ind-medium': 'medium',
  'ind-monthly': 'pro',
  'st-trial': 'store_trial',
  'st-month': 'store_monthly',
  'st-quart': 'store_quarterly',
  'st-year': 'store_yearly',
  'st-diam-std': 'store_diamond',
  'st-diam-pro': 'store_diamond_pro',
  'of-trial': 'office_trial',
  'of-month': 'office_monthly',
  'of-quart': 'office_quarterly',
  'of-year': 'office_yearly',
  'of-diam-std': 'office_diamond',
  'of-diam-pro': 'office_diamond_pro',
  'cp-trial': 'corp_trial',
  'cp-month': 'corp_monthly',
  'cp-quart': 'corp_quarterly',
  'cp-year': 'corp_yearly',
  'cp-diam-std': 'corp_diamond',
  'cp-diam-pro': 'corp_diamond_pro',
};

function mapPackageIdToPlanType(packageId, accountType) {
  const id = String(packageId || '').toLowerCase();
  if (!id) return null;
  if (PACKAGE_ID_TO_PLAN[id]) return PACKAGE_ID_TO_PLAN[id];
  if (/^st-diam-pro$/.test(id)) return 'store_diamond_pro';
  if (/^st-diam/.test(id)) return 'store_diamond';
  if (/^of-diam-pro$/.test(id)) return 'office_diamond_pro';
  if (/^of-diam/.test(id)) return 'office_diamond';
  if (/^cp-diam-pro$/.test(id)) return 'corp_diamond_pro';
  if (/^cp-diam/.test(id)) return 'corp_diamond';
  if (/^tnd-/.test(id)) return mapTenderPackageToPlanType({ packageId: id });
  if (/^vid-/.test(id)) return mapMediaPackageToPlanType({ packageId: id });
  const type = String(accountType || 'individual').toLowerCase();
  if (type === 'store' || type === 'shop') return 'store_monthly';
  if (type === 'office') return 'office_monthly';
  if (type === 'corp') return 'corp_monthly';
  return null;
}

/** خريطة أسماء الباقات العربية/الإنجليزية → planType (احتياط فقط عند غياب packageId) */
function mapPackageNameToPlanType(pkgName, accountType, packageId) {
  const fromId = mapPackageIdToPlanType(packageId || pkgName, accountType);
  if (fromId) return fromId;

  const name = String(pkgName || '').replace(/💎\s*/g, '').trim().toLowerCase();
  const type = String(accountType || 'individual').toLowerCase();

  if (/^(pro|باقة\s*pro)$/.test(name) || name === 'pro') return type === 'individual' ? 'pro' : null;
  if (/business|🏢|أعمال/.test(name)) return type === 'individual' ? 'business' : null;

  if (/diamond_pro|diam-pro|_pro\b/.test(name) && /ماس|diamond|diamant/.test(name)) return 'diamond_pro';
  if (/diamond_standard|diam-std|diamond_std/.test(name)) return 'diamond_standard';

  if (type === 'store' || type === 'shop') {
    if (/تجريب|trial|مجان/.test(name)) return 'store_trial';
    if (/ماس|diamond/.test(name)) {
      if (/pro|pro للمحلات|متقدم.*pro/i.test(name)) return 'store_diamond_pro';
      return 'store_diamond';
    }
    if (/سنو|year|annual/.test(name)) return 'store_yearly';
    if (/ربع|quarter/.test(name)) return 'store_quarterly';
    if (/شهر|month/.test(name)) return 'store_monthly';
    return 'store_monthly';
  }
  if (type === 'office') {
    if (/تجريب|trial|مجان/.test(name)) return 'office_trial';
    if (/ماس|diamond|diamant/.test(name)) {
      if (/pro|pro للمكاتب|متقدم.*pro/i.test(name)) return 'office_diamond_pro';
      return 'office_diamond';
    }
    if (/سنو|year|annual/.test(name)) return 'office_yearly';
    if (/ربع|quarter/.test(name)) return 'office_quarterly';
    if (/شهر|month/.test(name)) return 'office_monthly';
    if (/احتراف|premium/.test(name)) return 'office_pro';
    if (/أساس|basic/.test(name)) return 'office_basic';
    if (/تأمين|insurance/.test(name)) return 'office_pro';
    return 'office_monthly';
  }
  if (type === 'corp') {
    if (/تجريب|trial/.test(name)) return 'corp_trial';
    if (/ماس|diamond/.test(name)) {
      if (/pro|pro للشركات|متقدم.*pro/i.test(name)) return 'corp_diamond_pro';
      return 'corp_diamond';
    }
    if (/سنو|year/.test(name)) return 'corp_yearly';
    if (/ربع|quarter/.test(name)) return 'corp_quarterly';
    if (/شهر|month/.test(name)) return 'corp_monthly';
    return 'corp_monthly';
  }

  // individual (افتراضي)
  if (/مجان|free/.test(name)) return 'free';
  if (/متوسط|medium|broker/.test(name)) return 'medium';
  if (/pro/.test(name) || name === 'باقة شهرية' || name === 'شهرية') return 'pro';
  if (/business/.test(name)) return 'business';
  return 'free';
}

function resolvePlanDefinition(planType, accountType) {
  const t = String(accountType || 'individual').toLowerCase();
  if (planType === 'diamond_standard') return DIAMOND_STANDARD_PLAN;
  if (planType === 'diamond_pro') return DIAMOND_PRO_PLAN;
  if (INDIVIDUAL_PLANS[planType]) return INDIVIDUAL_PLANS[planType];
  if (STORE_PLANS[planType]) return STORE_PLANS[planType];
  if (OFFICE_PLANS[planType]) return OFFICE_PLANS[planType];
  if (CORP_PLANS[planType]) return CORP_PLANS[planType];
  if (t === 'store') return STORE_PLANS.store_trial;
  if (t === 'office') return OFFICE_PLANS.office_basic;
  if (t === 'corp') return CORP_PLANS.corp_trial;
  return FREE_FALLBACK;
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
    planType = mapPackageIdToPlanType(rec.packageId || rec.pkgId, type)
      || mapPackageNameToPlanType(rec.pkgName, type, rec.packageId || rec.pkgId);
  } else if (rec && (subscriptionStatus === 'expired' || subscriptionStatus === 'suspended' || subscriptionStatus === 'pending')) {
    planType = 'free';
  }

  const plan = resolvePlanDefinition(planType, type);
  const isPaidActive = ACTIVE_STATUSES.includes(subscriptionStatus);
  const isTrial = !!(rec && (rec.isTrial || isTrialPackage(rec.pkgName, rec.price)));
  const aiPaidActive = isPaidActive && !isTrial && isPaymentConfirmed(rec);

  let features = isPaidActive ? (plan.features || []) : FREE_FALLBACK.features;
  if (isTrial) {
    features = features.filter((f) => !AI_PAID_FEATURES.includes(f));
  }
  if (aiPaidActive && (planType === 'diamond_standard' || plan.diamondTier === 'diamond_standard')) {
    features = features.filter((f) => !PRO_ONLY_FEATURES.includes(f));
  }
  if (!aiPaidActive) {
    features = features.filter((f) => !AI_PAID_FEATURES.includes(f));
  }

  const quotaLimits = aiPaidActive ? resolveQuotaLimitsForAccount(rec) : null;

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
    features,
    diamondTier: plan.diamondTier || (planType === 'diamond_pro' ? 'diamond_pro' : planType === 'diamond_standard' ? 'diamond_standard' : null),
    audioAccess: aiPaidActive && !!(plan.audioAccess || planType === 'diamond_pro'),
    isTrial,
    quotaLimits,
    flags: {
      privateStore: isPaidActive && !!plan.privateStore,
      priorityListing: isPaidActive && !!plan.priorityListing,
      weeklyBoost: isPaidActive && !!plan.weeklyBoost,
      advancedAnalytics: isPaidActive && !!plan.advancedAnalytics,
      accountManager: isPaidActive && !!plan.accountManager,
      aiAgent: aiPaidActive && features.includes('ai_agent_full'),
      widgetChannel: aiPaidActive && features.includes('widget_channel'),
      whatsappChannel: aiPaidActive && features.includes('whatsapp_channel'),
      callsChannel: aiPaidActive && features.includes('calls_channel'),
      quotaDashboard: aiPaidActive && features.includes('quota_dashboard'),
      canExposeContacts: isPaidActive && !isTrial && !!(rec && isPaymentConfirmed(rec)),
      canUnlockContacts: isPaidActive && !isTrial && !!(rec && isPaymentConfirmed(rec)),
    },
  };
}

function isAiEligible(entitlements) {
  return !!(entitlements && entitlements.flags && entitlements.flags.aiAgent);
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
  if (entitlements.subscriptionStatus === 'pending') {
    throw entitlementError('payment_pending', 'باقتك قيد انتظار تأكيد الدفع — لا يمكن استخدام الميزات قبل الموافقة على الوصل');
  }
  if (entitlements.subscriptionStatus === 'expired') {
    throw entitlementError('subscription_expired', 'انتهت مدة باقتك — جدّد الاشتراك لاستعادة الميزات');
  }
  if (entitlements.subscriptionStatus === 'suspended') {
    throw entitlementError('subscription_suspended', 'تم إيقاف اشتراكك — جدّد الباقة لاستعادة الميزات');
  }
  if (entitlements.subscriptionStatus === 'no_subscription') {
    throw entitlementError('no_subscription', 'لا توجد باقة نشطة — اشترك للوصول لهذه الميزة');
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
  if (entitlements.isTrial && AI_PAID_FEATURES.includes(featureName)) {
    throw entitlementError('ai_not_in_trial', 'خدمات الذكاء الاصطناعي والوكيل الماسي غير متاحة في الباقات التجريبية — يتطلب اشتراكاً مدفوعاً ومؤكداً');
  }
  if (!hasFeature(entitlements, featureName)) {
    throw entitlementError('feature_not_in_plan', `الميزة "${featureName}" غير مشمولة في باقتك الحالية`);
  }
}

function assertCallsChannel(entitlements) {
  assertFeature(entitlements, 'calls_channel');
  if (!entitlements.audioAccess) {
    throw entitlementError('audio_not_in_plan', 'المكالمات الصوتية متاحة في الباقة الماسية المتقدمة (Pro) فقط — قم بالترقية');
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
  OFFICE_PLANS,
  CORP_PLANS,
  TENDER_PLANS,
  TENDER_PUBLIC_ACCESS,
  MEDIA_PLANS,
  mapMediaPackageToPlanType,
  getMediaEntitlements,
  mapTenderPackageToPlanType,
  getTenderEntitlements,
  resolveTenderPlanFromRef,
  DIAMOND_STANDARD_PLAN,
  DIAMOND_PRO_PLAN,
  AI_PAID_FEATURES,
  PRO_ONLY_FEATURES,
  ACTIVE_STATUSES,
  PENDING_STATUSES,
  mapPackageIdToPlanType,
  mapPackageNameToPlanType,
  getEntitlements,
  getSubscriptionStatus,
  isPaymentConfirmed,
  isAiEligible,
  hasFeature,
  assertSubscriptionActive,
  assertCanPostAd,
  assertCanAddCatalogItem,
  assertPhotoCount,
  assertVideoPolicy,
  assertFeature,
  assertCallsChannel,
  buildDowngradePatch,
  entitlementError,
};
