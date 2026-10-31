/**
 * launchMode.js — وضع الإطلاق التدريجي لمنصة رزق
 *
 * مصدر الفترة المجانية (لوحة التحكم):
 *   site-config.launchDate + site-config.freeDays (افتراضي 90)
 *   freeUntil = launchDate + freeDays  (محسوب، لا يُدخَل يدوياً)
 * احتياطي: RIZQ_LAUNCH_FREE_UNTIL عند فراغ launchDate
 *
 * RIZQ_OPEN_SECTIONS=stores,estate,individual
 */
'use strict';

const MS_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_FREE_DAYS = 90;
const PAID_GRACE_DAYS = 60;
/** مدة الباقة التجريبية الموحّدة (أيام) — مطابقة للكتالوجات */
const TRIAL_DURATION_DAYS = 10;
/** مهلة المطالبة بالتجربة بعد نهاية الفترة المجانية */
const TRIAL_CLAIM_WINDOW_DAYS = 7;

const SECTION_ALIASES = {
  stores: 'store',
  store: 'store',
  shops: 'store',
  offices: 'office',
  office: 'office',
  showrooms: 'corp',
  corp: 'corp',
  company: 'corp',
  estate: 'estate',
  realestate: 'estate',
  immobilier: 'estate',
  individual: 'individual',
  individuals: 'individual',
  private: 'individual',
  tenders: 'tenders',
  tender: 'tenders',
  investments: 'investments',
  investment: 'investments',
  videoads: 'videoAds',
  video: 'videoAds',
  ads: 'videoAds',
};

const ALL_MODULE_KEYS = [
  'individual', 'store', 'office', 'corp', 'estate', 'tenders', 'investments', 'videoAds',
];

const PAID_ACCOUNT_TYPES = new Set(['store', 'office', 'corp', 'estate']);

/** اختبارات فقط */
let _testOverride = undefined;

function parseOpenSections(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const out = Object.create(null);
  ALL_MODULE_KEYS.forEach((k) => { out[k] = false; });
  text.split(/[,;\s]+/).forEach((part) => {
    const key = SECTION_ALIASES[String(part || '').trim().toLowerCase()];
    if (key) out[key] = true;
  });
  return out;
}

function parseYmd(raw) {
  const s = String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00.000Z');
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

/** @deprecated alias — تواريخ YYYY-MM-DD */
function parseFreeUntil(raw) {
  return parseYmd(raw);
}

function addDaysYmd(ymd, days) {
  const base = parseYmd(ymd);
  if (!base) return null;
  const n = Number(days);
  if (!Number.isFinite(n)) return null;
  const d = new Date(base + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + Math.round(n));
  return d.toISOString().slice(0, 10);
}

function freeUntilEndMs(until) {
  const s = parseYmd(until);
  if (!s) return null;
  return new Date(s + 'T23:59:59.999Z').getTime();
}

function normalizeFreeDays(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_FREE_DAYS;
  return Math.min(3650, Math.round(n));
}

async function readSiteConfigSafe() {
  try {
    const repos = require('../db/repos');
    return (await repos.getSiteConfig()) || {};
  } catch (e) {
    return {};
  }
}

function normalizeMinActiveAdsToShow(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(1000000, Math.floor(n));
}

function _settingsFromParts(launchDate, freeDays, freeUntil, source, minActiveAdsToShow) {
  return {
    launchDate,
    freeDays,
    freeUntil,
    source,
    maintenanceDryRun: !launchDate,
    minActiveAdsToShow: normalizeMinActiveAdsToShow(
      minActiveAdsToShow != null ? minActiveAdsToShow : 0
    ),
  };
}

/**
 * إعدادات الإطلاق المحسوبة لحظياً من site-config.
 * launchDate فارغ ⇒ maintenanceDryRun=true و freeUntil من البيئة إن وُجدت.
 */
async function getLaunchSettings() {
  if (_testOverride && typeof _testOverride === 'object') {
    const launchDate = parseYmd(_testOverride.launchDate);
    const freeDays = normalizeFreeDays(
      _testOverride.freeDays != null ? _testOverride.freeDays : DEFAULT_FREE_DAYS
    );
    const minActiveAdsToShow = normalizeMinActiveAdsToShow(_testOverride.minActiveAdsToShow);
    let freeUntil = null;
    let source = 'none';
    if (launchDate) {
      freeUntil = addDaysYmd(launchDate, freeDays);
      source = 'site-config';
    } else if (_testOverride.freeUntil != null) {
      freeUntil = parseYmd(_testOverride.freeUntil);
      source = freeUntil ? 'test' : 'none';
    } else {
      freeUntil = parseYmd(process.env.RIZQ_LAUNCH_FREE_UNTIL);
      source = freeUntil ? 'env' : 'none';
    }
    return _settingsFromParts(launchDate, freeDays, freeUntil, source, minActiveAdsToShow);
  }

  const cfg = await readSiteConfigSafe();
  const launchDate = parseYmd(cfg.launchDate);
  const freeDays = normalizeFreeDays(
    cfg.freeDays != null && cfg.freeDays !== '' ? cfg.freeDays : DEFAULT_FREE_DAYS
  );
  const minActiveAdsToShow = normalizeMinActiveAdsToShow(cfg.minActiveAdsToShow);
  let freeUntil = null;
  let source = 'none';
  if (launchDate) {
    freeUntil = addDaysYmd(launchDate, freeDays);
    source = 'site-config';
  } else {
    freeUntil = parseYmd(process.env.RIZQ_LAUNCH_FREE_UNTIL);
    source = freeUntil ? 'env' : 'none';
  }
  return _settingsFromParts(launchDate, freeDays, freeUntil, source, minActiveAdsToShow);
}

async function getLaunchFreeUntil() {
  return (await getLaunchSettings()).freeUntil;
}

async function isMaintenanceDryRun() {
  return (await getLaunchSettings()).maintenanceDryRun === true;
}

function setLaunchSettingsForTests(value) {
  _testOverride = value;
}

function getEnvOpenSectionFlags() {
  return parseOpenSections(process.env.RIZQ_OPEN_SECTIONS);
}

async function isLaunchFreePeriodActive(nowMs) {
  const until = await getLaunchFreeUntil();
  if (!until) return false;
  const end = freeUntilEndMs(until);
  if (end == null) return false;
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  return now <= end;
}

async function daysRemaining(nowMs) {
  const end = freeUntilEndMs(await getLaunchFreeUntil());
  if (end == null) return null;
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  if (now > end) return 0;
  return Math.ceil((end - now) / MS_DAY);
}

function getFoundingDiscountPercent() {
  const n = Number(process.env.RIZQ_FOUNDING_DISCOUNT_PERCENT);
  if (Number.isFinite(n) && n >= 0 && n <= 90) return Math.round(n);
  return 40;
}

function isOpenModule(flags, moduleKey) {
  const key = SECTION_ALIASES[String(moduleKey || '').toLowerCase()] || moduleKey;
  if (!key) return true;
  if (!flags || typeof flags !== 'object') return true;
  if (!Object.prototype.hasOwnProperty.call(flags, key)) return true;
  return flags[key] !== false;
}

/**
 * الباقة التجريبية تظهر فقط بعد انتهاء الفترة المجانية (ووجود launchDate)،
 * وخلال مهلة المطالبة (7 أيام من freeUntil).
 */
async function isTrialOfferVisible(nowMs) {
  const settings = await getLaunchSettings();
  if (!settings.launchDate) return false;
  if (await isLaunchFreePeriodActive(nowMs)) return false;
  const freeEnd = freeUntilEndMs(settings.freeUntil);
  if (freeEnd == null) return false;
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  return now <= freeEnd + TRIAL_CLAIM_WINDOW_DAYS * MS_DAY;
}

async function publicLaunchConfig(moduleFlags, nowMs) {
  const settings = await getLaunchSettings();
  const freeActive = await isLaunchFreePeriodActive(nowMs);
  const open = [];
  const closed = [];
  const flags = moduleFlags || {};
  ALL_MODULE_KEYS.forEach((k) => {
    if (flags[k] === false) closed.push(k);
    else open.push(k);
  });
  return {
    launchDate: settings.launchDate || null,
    freeDays: settings.freeDays,
    freeUntil: settings.freeUntil || null,
    freePeriodActive: freeActive,
    daysRemaining: await daysRemaining(nowMs),
    maintenanceDryRun: settings.maintenanceDryRun,
    source: settings.source,
    openSections: open,
    closedSections: closed,
    foundingDiscountPercent: getFoundingDiscountPercent(),
    paidGraceDays: PAID_GRACE_DAYS,
    trialOfferVisible: await isTrialOfferVisible(nowMs),
    trialDurationDays: TRIAL_DURATION_DAYS,
    trialClaimWindowDays: TRIAL_CLAIM_WINDOW_DAYS,
    minActiveAdsToShow: settings.minActiveAdsToShow != null
      ? settings.minActiveAdsToShow
      : 0,
  };
}

async function shouldMarkFoundingPartner(accountType, createdAtIso) {
  if (!(await isLaunchFreePeriodActive(createdAtIso ? Date.parse(createdAtIso) : Date.now()))) return false;
  const t = String(accountType || '').toLowerCase();
  return t === 'store' || t === 'estate';
}

function hasConcretePeriodEnd(pkgRecord) {
  if (!pkgRecord || pkgRecord.periodEnd == null || pkgRecord.periodEnd === '') return false;
  const endMs = new Date(pkgRecord.periodEnd).getTime();
  return !Number.isNaN(endMs);
}

/**
 * protectedUntil لحظي — لا يُخزَّن على الإعلان.
 * PAID_ACCOUNT_TYPES:
 *   periodEnd محدد ⇒ periodEnd + 60 يوماً
 *   غير ذلك ⇒ freeUntil + 60 يوماً
 * لا Infinity ولا حساب من «الآن».
 * @returns {number|null} epoch ms or null (غير محمي)
 */
async function getProtectedUntilMs(account, pkgRecord, nowMs) {
  void nowMs;
  const type = account && account.type;
  const freeEnd = freeUntilEndMs(await getLaunchFreeUntil());
  const graceMs = PAID_GRACE_DAYS * MS_DAY;

  if (type && PAID_ACCOUNT_TYPES.has(type)) {
    if (hasConcretePeriodEnd(pkgRecord)) {
      return new Date(pkgRecord.periodEnd).getTime() + graceMs;
    }
    if (freeEnd != null) return freeEnd + graceMs;
    return null;
  }

  /* باقة مدفوعة لغير الأنواع الأربعة (مثل فيديو فردي) إن وُجد periodEnd */
  if (hasConcretePeriodEnd(pkgRecord)) {
    const pkgName = String((pkgRecord && pkgRecord.pkgName) || '');
    const priced = Number(pkgRecord.price) > 0
      || (Array.isArray(pkgRecord.invoices) && pkgRecord.invoices.some((i) => Number(i.price) > 0));
    const namedPaid = /(ماسية|diamond|video|فيديو|rizq\s*ads)/i.test(pkgName);
    if (priced || namedPaid) {
      return new Date(pkgRecord.periodEnd).getTime() + graceMs;
    }
  }
  return null;
}

async function isUnderProtection(nowMs, account, pkgRecord) {
  const until = await getProtectedUntilMs(account, pkgRecord, nowMs);
  if (until == null) return false;
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  return now < until;
}

module.exports = {
  MS_DAY,
  DEFAULT_FREE_DAYS,
  PAID_GRACE_DAYS,
  TRIAL_DURATION_DAYS,
  TRIAL_CLAIM_WINDOW_DAYS,
  PAID_ACCOUNT_TYPES,
  ALL_MODULE_KEYS,
  SECTION_ALIASES,
  parseOpenSections,
  parseYmd,
  parseFreeUntil,
  addDaysYmd,
  freeUntilEndMs,
  normalizeFreeDays,
  normalizeMinActiveAdsToShow,
  getLaunchSettings,
  getLaunchFreeUntil,
  isMaintenanceDryRun,
  setLaunchSettingsForTests,
  getEnvOpenSectionFlags,
  isLaunchFreePeriodActive,
  daysRemaining,
  getFoundingDiscountPercent,
  isOpenModule,
  isTrialOfferVisible,
  publicLaunchConfig,
  shouldMarkFoundingPartner,
  hasConcretePeriodEnd,
  getProtectedUntilMs,
  isUnderProtection,
};
