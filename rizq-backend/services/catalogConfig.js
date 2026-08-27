/**
 * catalogConfig.js — مصدر الحقيقة الديناميكي (site-config.json) مع defaults
 * الأسعار والسعات والميزات تُقرأ من لوحة الأدمن؛ الكود يحمل افتراضات فقط.
 */
const fs = require('fs');
const path = require('path');

const SITE_CONFIG_FILE = path.join(__dirname, '..', 'data', 'site-config.json');

/** افتراضيات باقات الأفراد — تُستخدم عند غياب site-config.json */
const DEFAULT_INDIVIDUAL_PACKAGES = [
  { id: 'ind-free', name: 'مجانية', price: 0, durationDays: 10, active: true },
  { id: 'ind-boost', name: 'مميزة', price: 300, durationDays: 30, boostDays: 3, active: true },
  { id: 'ind-medium', name: 'باقة متوسطة', price: 1000, durationDays: 30, active: true },
  { id: 'ind-monthly', name: 'باقة شهرية', price: 2000, durationDays: 30, active: true },
];

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

function readSiteConfigRaw() {
  try {
    return JSON.parse(fs.readFileSync(SITE_CONFIG_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function getQuotaConfig() {
  const cfg = readSiteConfigRaw();
  const live = (cfg.quotaConfig && typeof cfg.quotaConfig === 'object') ? cfg.quotaConfig : {};
  return {
    diamond_standard: Object.assign({}, DEFAULT_QUOTA_CONFIG.diamond_standard, live.diamond_standard || {}),
    diamond_pro: Object.assign({}, DEFAULT_QUOTA_CONFIG.diamond_pro, live.diamond_pro || {}),
  };
}

function getTopupConfig() {
  const cfg = readSiteConfigRaw();
  const live = (cfg.quotaTopups && typeof cfg.quotaTopups === 'object') ? cfg.quotaTopups : {};
  return {
    text: Object.assign({}, DEFAULT_TOPUP_CONFIG.text, live.text || {}),
    voice: Object.assign({}, DEFAULT_TOPUP_CONFIG.voice, live.voice || {}),
  };
}

function getAllCatalogPackages() {
  const cfg = readSiteConfigRaw();
  const pkgs = (cfg.packages && typeof cfg.packages === 'object') ? cfg.packages : {};
  const out = [];
  Object.keys(pkgs).forEach((cat) => {
    if (!Array.isArray(pkgs[cat])) return;
    pkgs[cat].forEach((p) => {
      if (p && p.active !== false) out.push(Object.assign({ _catalog: cat }, p));
    });
  });
  if (!out.length) {
    DEFAULT_INDIVIDUAL_PACKAGES.forEach((p) => {
      out.push(Object.assign({ _catalog: 'individual' }, p));
    });
  }
  return out;
}

function resolvePackageBoostDays(ref) {
  const pkg = findCatalogPackage(ref);
  if (pkg && pkg.boostDays) return Math.max(1, Number(pkg.boostDays) || 3);
  if (pkg && pkg.id && String(pkg.id).indexOf('boost') !== -1) return 3;
  const name = typeof ref === 'string' ? ref : String((ref && ref.pkgName) || (ref && ref.name) || '');
  if (/مميز|boost|mise en avant/i.test(name)) return 3;
  return null;
}

function findCatalogPackage(ref) {
  if (!ref) return null;
  const id = typeof ref === 'string' ? ref : String(ref.id || ref.packageId || '');
  const name = typeof ref === 'object' ? String(ref.pkgName || ref.name || '').trim() : '';
  const all = getAllCatalogPackages();
  if (id) {
    const hit = all.find((p) => String(p.id) === id);
    if (hit) return hit;
  }
  if (name) {
    const norm = name.replace(/💎\s*/g, '').trim();
    const hit = all.find((p) => String(p.name || '').replace(/💎\s*/g, '').trim() === norm);
    if (hit) return hit;
  }
  return null;
}

function resolveDiamondTier(ref) {
  const pkg = typeof ref === 'object' && ref !== null && !ref.pkgName && !ref.name && !ref.id
    ? null
    : findCatalogPackage(ref) || (typeof ref === 'object' ? ref : null);

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

function isDiamondPackageRef(ref) {
  return !!resolveDiamondTier(ref);
}

function getTierQuotaLimits(tierKey, pkgOverride) {
  const tier = tierKey || 'diamond_standard';
  const cfg = getQuotaConfig();
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

function resolveQuotaLimitsForAccount(rec) {
  if (!rec) {
    return getTierQuotaLimits('diamond_standard');
  }
  const tier = resolveDiamondTier({
    id: rec.packageId || rec.pkgId,
    pkgName: rec.pkgName,
    planType: rec.planType,
    diamondTier: rec.diamondTier,
  }) || 'diamond_standard';
  const pkg = findCatalogPackage(rec.packageId || rec.pkgId || rec.pkgName);
  return getTierQuotaLimits(tier, pkg);
}

function isTrialPackage(pkgName, price) {
  const name = String(pkgName || '');
  return /trial|تجريب|مجان|free/i.test(name) && Number(price || 0) === 0;
}

module.exports = {
  SITE_CONFIG_FILE,
  DEFAULT_QUOTA_CONFIG,
  DEFAULT_TOPUP_CONFIG,
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
