/**
 * catalogConfig.js — مصدر الحقيقة الديناميكي (site-config عبر repos) مع defaults
 * الأسعار والسعات والميزات تُقرأ من لوحة الأدمن؛ الكود يحمل افتراضات فقط.
 */
const repos = require('../db/repos');

/** افتراضيات باقات الأفراد — تُستخدم عند غياب الإعداد */
const DEFAULT_INDIVIDUAL_PACKAGES = [
  { id: 'ind-free', name: 'مجانية', price: 0, durationDays: 10, active: true },
  { id: 'ind-boost', name: 'مميزة', price: 300, durationDays: 30, boostDays: 3, active: true },
  { id: 'ind-medium', name: 'باقة متوسطة', price: 1000, durationDays: 30, active: true },
  { id: 'ind-monthly', name: 'باقة شهرية', price: 2000, durationDays: 30, active: true },
];

/**
 * افتراضيات باقات المحلات/المكاتب/المعارض/المناقصات/الاستثمار/الفيديو —
 * مصدر الأسعار والحدود: rizq_packages_config.js CATALOGS (+ PKG_DEFAULTS في لوحة الأدمن).
 * لا تغيّر أسعاراً ظاهرة في الواجهة؛ تُستخدم فقط عندما لا تكون محفوظة في site-config.
 */
const DEFAULT_STORE_PACKAGES = [
  { id: 'st-trial', name: 'تجريبية', price: 0, durationDays: 10, maxCatalogItems: 10, active: true },
  { id: 'st-month', name: 'شهرية', price: 2000, durationDays: 30, maxCatalogItems: 100, active: true },
  { id: 'st-quart', name: 'ربعية', price: 5500, durationDays: 90, maxCatalogItems: 500, active: true },
  { id: 'st-year', name: 'سنوية', price: 15000, durationDays: 365, maxCatalogItems: null, active: true },
  { id: 'st-diam-std', name: 'الماسية الأساسية', price: 3500, durationDays: 30, maxCatalogItems: null, diamondTier: 'diamond_standard', active: true },
  { id: 'st-diam-pro', name: 'الماسية Pro', price: 6000, durationDays: 30, maxCatalogItems: null, diamondTier: 'diamond_pro', active: true },
];
const DEFAULT_OFFICE_PACKAGES = [
  { id: 'of-trial', name: 'تجريبية', price: 0, durationDays: 10, maxCatalogItems: 3, active: true },
  { id: 'of-month', name: 'شهرية', price: 3500, durationDays: 30, maxCatalogItems: null, active: true },
  { id: 'of-quart', name: 'ربعية', price: 9000, durationDays: 90, maxCatalogItems: null, active: true },
  { id: 'of-year', name: 'سنوية', price: 28000, durationDays: 365, maxCatalogItems: null, active: true },
  { id: 'of-diam-std', name: 'الماسية الأساسية', price: 4000, durationDays: 30, maxCatalogItems: null, diamondTier: 'diamond_standard', active: true },
  { id: 'of-diam-pro', name: 'الماسية Pro', price: 7500, durationDays: 30, maxCatalogItems: null, diamondTier: 'diamond_pro', active: true },
];
const DEFAULT_CORP_PACKAGES = [
  { id: 'cp-trial', name: 'تجريبية', price: 0, durationDays: 10, active: true },
  { id: 'cp-month', name: 'شهرية', price: 3500, durationDays: 30, maxCatalogItems: 30, active: true },
  { id: 'cp-quart', name: 'ربعية', price: 9000, durationDays: 90, maxCatalogItems: null, active: true },
  { id: 'cp-year', name: 'سنوية', price: 25000, durationDays: 365, maxCatalogItems: null, active: true },
  { id: 'cp-diam-std', name: 'الماسية الأساسية', price: 6000, durationDays: 30, maxCatalogItems: null, diamondTier: 'diamond_standard', active: true },
  { id: 'cp-diam-pro', name: 'الماسية Pro', price: 15000, durationDays: 30, maxCatalogItems: null, diamondTier: 'diamond_pro', active: true },
];
const DEFAULT_TENDER_PACKAGES = [
  { id: 'tnd-trial', name: 'تجريبية', price: 0, durationDays: 10, active: true },
  { id: 'tnd-month', name: 'شهرية', price: 5000, durationDays: 30, active: true },
  { id: 'tnd-quart', name: 'ربعية', price: 13500, durationDays: 90, active: true },
  { id: 'tnd-year', name: 'سنوية', price: 45000, durationDays: 365, active: true },
];
const DEFAULT_INVESTMENT_PACKAGES = [
  { id: 'inv-trial', name: 'تجريبية', price: 0, durationDays: 10, active: true },
  { id: 'inv-month', name: 'شهرية', price: 5000, durationDays: 30, active: true },
  { id: 'inv-quart', name: 'ربعية', price: 13500, durationDays: 90, active: true },
  { id: 'inv-year', name: 'سنوية', price: 45000, durationDays: 365, active: true },
];
const DEFAULT_VIDEO_PACKAGES = [
  { id: 'vid-single', name: 'إعلان فيديو واحد', price: 1500, durationDays: 10, maxVideosPerMonth: 1, payPerAd: true, active: true },
  { id: 'vid-basic', name: 'أساسية', price: 5000, durationDays: 30, maxVideosPerMonth: 3, active: true },
  { id: 'vid-pro', name: 'احترافية', price: 12000, durationDays: 30, maxVideosPerMonth: 10, active: true },
  { id: 'vid-business', name: 'أعمال', price: 25000, durationDays: 30, maxVideosPerMonth: null, active: true },
];

const DEFAULT_CATALOG_BY_KEY = {
  individual: DEFAULT_INDIVIDUAL_PACKAGES,
  store: DEFAULT_STORE_PACKAGES,
  office: DEFAULT_OFFICE_PACKAGES,
  corp: DEFAULT_CORP_PACKAGES,
  tender: DEFAULT_TENDER_PACKAGES,
  investment: DEFAULT_INVESTMENT_PACKAGES,
  video: DEFAULT_VIDEO_PACKAGES,
  ads: DEFAULT_VIDEO_PACKAGES,
  media: DEFAULT_VIDEO_PACKAGES,
};

const DEFAULT_QUOTA_CONFIG = {
  diamond_standard: {
    messages: 2000,
    minutes: 0,
    model: 'claude-sonnet-4-5-20250929',
    label_ar: 'ماسية أساسية',
  },
  diamond_pro: {
    messages: 4000,
    minutes: 300,
    model: 'claude-sonnet-4-5-20250929',
    label_ar: 'ماسية متقدمة',
  },
};

const DEFAULT_TOPUP_CONFIG = {
  text: {
    conversations: 1000,
    priceMru: 2000,
    label_ar: 'شحن نصي — 1,000 محادثة',
  },
  voice: {
    minutes: 100,
    priceMru: 1500,
    label_ar: 'شحن صوتي — 100 دقيقة',
  },
};

const DIAMOND_TIER_IDS = {
  standard: ['diamond_standard', 'st-diam-std', 'of-diam-std', 'cp-diam-std', 'diamond', 'st-diam', 'of-diam'],
  pro: ['diamond_pro', 'st-diam-pro', 'of-diam-pro', 'cp-diam-pro', 'cp-diam'],
};

async function readSiteConfigRaw() {
  try {
    return await repos.getSiteConfig() || {};
  } catch (e) {
    return {};
  }
}

async function getQuotaConfig() {
  const cfg = await readSiteConfigRaw();
  const live = (cfg.quotaConfig && typeof cfg.quotaConfig === 'object') ? cfg.quotaConfig : {};
  return {
    diamond_standard: Object.assign({}, DEFAULT_QUOTA_CONFIG.diamond_standard, live.diamond_standard || {}),
    diamond_pro: Object.assign({}, DEFAULT_QUOTA_CONFIG.diamond_pro, live.diamond_pro || {}),
  };
}

async function getTopupConfig() {
  const cfg = await readSiteConfigRaw();
  const live = (cfg.quotaTopups && typeof cfg.quotaTopups === 'object') ? cfg.quotaTopups : {};
  return {
    text: Object.assign({}, DEFAULT_TOPUP_CONFIG.text, live.text || {}),
    voice: Object.assign({}, DEFAULT_TOPUP_CONFIG.voice, live.voice || {}),
  };
}

async function getAllCatalogPackages() {
  const cfg = await readSiteConfigRaw();
  const pkgs = (cfg.packages && typeof cfg.packages === 'object') ? cfg.packages : {};
  const byCat = Object.create(null);

  // 1) ابدأ بالافتراضيات لكل كتالوج معروف
  Object.keys(DEFAULT_CATALOG_BY_KEY).forEach((cat) => {
    byCat[cat] = (DEFAULT_CATALOG_BY_KEY[cat] || []).map((p) => Object.assign({ _catalog: cat }, p));
  });

  // 2) ادمج site-config فوق الافتراضيات حسب id (أو أضف إن غاب)
  Object.keys(pkgs).forEach((cat) => {
    if (!Array.isArray(pkgs[cat])) return;
    if (!byCat[cat]) byCat[cat] = [];
    pkgs[cat].forEach((p) => {
      if (!p || p.active === false) return;
      const row = Object.assign({ _catalog: cat }, p);
      const id = String(p.id || '');
      if (!id) {
        byCat[cat].push(row);
        return;
      }
      const idx = byCat[cat].findIndex((x) => String(x.id) === id);
      if (idx >= 0) byCat[cat][idx] = Object.assign({}, byCat[cat][idx], row);
      else byCat[cat].push(row);
    });
  });

  const out = [];
  Object.keys(byCat).forEach((cat) => {
    byCat[cat].forEach((p) => {
      if (p && p.active !== false) out.push(p);
    });
  });
  return out;
}

async function resolvePackageBoostDays(ref) {
  const pkg = await findCatalogPackage(ref);
  if (pkg && pkg.boostDays) return Math.max(1, Number(pkg.boostDays) || 3);
  if (pkg && pkg.id && String(pkg.id).indexOf('boost') !== -1) return 3;
  const name = typeof ref === 'string' ? ref : String((ref && ref.pkgName) || (ref && ref.name) || '');
  if (/مميز|boost|mise en avant/i.test(name)) return 3;
  return null;
}

async function findCatalogPackage(ref) {
  if (!ref) return null;
  const id = typeof ref === 'string' ? ref : String(ref.id || ref.packageId || '');
  const name = typeof ref === 'object' ? String(ref.pkgName || ref.name || '').trim() : '';
  const category = typeof ref === 'object' ? String(ref.category || ref._catalog || '').trim() : '';
  const all = await getAllCatalogPackages();
  const inCat = category
    ? all.filter((p) => String(p._catalog || '') === category)
    : all;
  const pool = inCat.length ? inCat : all;
  if (id) {
    const hit = pool.find((p) => String(p.id) === id)
      || all.find((p) => String(p.id) === id);
    if (hit) return hit;
  }
  if (name) {
    const norm = name.replace(/💎\s*/g, '').trim();
    const hit = pool.find((p) => String(p.name || '').replace(/💎\s*/g, '').trim() === norm)
      || all.find((p) => String(p.name || '').replace(/💎\s*/g, '').trim() === norm);
    if (hit) return hit;
  }
  return null;
}

async function resolveDiamondTier(ref) {
  const pkg = typeof ref === 'object' && ref !== null && !ref.pkgName && !ref.name && !ref.id
    ? null
    : (await findCatalogPackage(ref)) || (typeof ref === 'object' ? ref : null);

  const id = String((pkg && pkg.id) || (typeof ref === 'string' ? ref : ref && ref.id) || ref && ref.planType || '').toLowerCase();
  const explicit = String((pkg && pkg.diamondTier) || (ref && ref.diamondTier) || '').toLowerCase();
  if (explicit === 'pro' || explicit === 'diamond_pro') return 'diamond_pro';
  if (explicit === 'standard' || explicit === 'diamond_standard') return 'diamond_standard';

  if (DIAMOND_TIER_IDS.pro.some((x) => id === x || id.endsWith(x))) return 'diamond_pro';
  if (DIAMOND_TIER_IDS.standard.some((x) => id === x || id.endsWith(x))) return 'diamond_standard';

  const blob = [
    id,
    pkg && pkg.name,
    ref && ref.pkgName,
    ref && ref.name,
    ref && ref.planType,
  ].filter(Boolean).join(' ');

  if (!/(ماس|diamond|diamant)/i.test(blob)) return null;
  if (/\b(pro|متقدم|advanced|premium)\b/i.test(blob) && !/\b(standard|أساس|basic)\b/i.test(blob)) {
    return 'diamond_pro';
  }
  return 'diamond_standard';
}

async function isDiamondPackageRef(ref) {
  return !!(await resolveDiamondTier(ref));
}

async function getTierQuotaLimits(tierKey, pkgOverride) {
  const tier = tierKey || 'diamond_standard';
  const cfg = await getQuotaConfig();
  const base = cfg[tier] || cfg.diamond_standard;
  const pkg = pkgOverride || null;
  return {
    tier,
    messages: Math.max(0, Number(pkg && pkg.quotaMessages != null ? pkg.quotaMessages : base.messages) || 0),
    minutes: Math.max(0, Number(pkg && pkg.quotaMinutes != null ? pkg.quotaMinutes : base.minutes) || 0),
    model: String((pkg && pkg.aiModel) || base.model || 'claude-sonnet-4-5-20250929'),
    audioAccess: tier === 'diamond_pro' || !!(pkg && pkg.audioAccess === true),
  };
}

async function resolveQuotaLimitsForAccount(rec) {
  if (!rec) {
    return getTierQuotaLimits('diamond_standard');
  }
  // resolveDiamondTier is async (catalog lookup) — always await it.
  const tier = (await resolveDiamondTier({
    id: rec.packageId || rec.pkgId,
    pkgName: rec.pkgName,
    planType: rec.planType,
    diamondTier: rec.diamondTier,
  })) || 'diamond_standard';
  const pkg = await findCatalogPackage(rec.packageId || rec.pkgId || rec.pkgName);
  return getTierQuotaLimits(tier, pkg);
}

function isTrialPackage(pkgName, price) {
  const name = String(pkgName || '');
  return /trial|تجريب|مجان|free/i.test(name) && Number(price || 0) === 0;
}

module.exports = {
  DEFAULT_QUOTA_CONFIG,
  DEFAULT_TOPUP_CONFIG,
  DEFAULT_INDIVIDUAL_PACKAGES,
  DEFAULT_STORE_PACKAGES,
  DEFAULT_OFFICE_PACKAGES,
  DEFAULT_CORP_PACKAGES,
  DEFAULT_TENDER_PACKAGES,
  DEFAULT_INVESTMENT_PACKAGES,
  DEFAULT_VIDEO_PACKAGES,
  DEFAULT_CATALOG_BY_KEY,
  readSiteConfigRaw,
  getQuotaConfig,
  getTopupConfig,
  getAllCatalogPackages,
  findCatalogPackage,
  resolveDiamondTier,
  isDiamondPackageRef,
  getTierQuotaLimits,
  resolvePackageBoostDays,
  resolveQuotaLimitsForAccount,
  isTrialPackage,
};
