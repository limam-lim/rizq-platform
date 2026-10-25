/**
 * launchMode.js — وضع الإطلاق التدريجي لمنصة رزق
 * مصدر freeUntil: site-config.launchFreeUntil (لوحة التحكم) ثم
 * RIZQ_LAUNCH_FREE_UNTIL=YYYY-MM-DD (بيئة) إن لم يُضبط من الداشبورد.
 * RIZQ_OPEN_SECTIONS=stores,estate,individual
 */
'use strict';

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

/** اختبارات فقط — تجاوز قراءة site-config/env */
let _freeUntilTestOverride = undefined;

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

function parseFreeUntil(raw) {
  const s = String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T23:59:59.999Z');
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

function freeUntilEndMs(until) {
  const s = parseFreeUntil(until);
  if (!s) return null;
  return new Date(s + 'T23:59:59.999Z').getTime();
}

/**
 * الداشبورد يفوز: إن وُجد مفتاح launchFreeUntil في site-config يُعتمد
 * (حتى لو فارغاً = إيقاف الفترة). وإلا يُقرأ من البيئة.
 */
function getLaunchFreeUntil() {
  if (_freeUntilTestOverride !== undefined) {
    return parseFreeUntil(_freeUntilTestOverride);
  }
  try {
    const repos = require('../db/repos');
    const cfg = repos.getSiteConfig() || {};
    if (Object.prototype.hasOwnProperty.call(cfg, 'launchFreeUntil')) {
      return parseFreeUntil(cfg.launchFreeUntil);
    }
  } catch (e) { /* ignore — بيئة اختبار بلا repos */ }
  return parseFreeUntil(process.env.RIZQ_LAUNCH_FREE_UNTIL);
}

function setLaunchFreeUntilForTests(value) {
  _freeUntilTestOverride = value;
}

function getEnvOpenSectionFlags() {
  return parseOpenSections(process.env.RIZQ_OPEN_SECTIONS);
}

function isLaunchFreePeriodActive(nowMs) {
  const until = getLaunchFreeUntil();
  if (!until) return false;
  const end = freeUntilEndMs(until);
  if (end == null) return false;
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  return now <= end;
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

function publicLaunchConfig(moduleFlags) {
  const freeUntil = getLaunchFreeUntil();
  const freeActive = isLaunchFreePeriodActive();
  const open = [];
  const closed = [];
  const flags = moduleFlags || {};
  ALL_MODULE_KEYS.forEach((k) => {
    if (flags[k] === false) closed.push(k);
    else open.push(k);
  });
  return {
    freeUntil: freeUntil || null,
    freePeriodActive: freeActive,
    openSections: open,
    closedSections: closed,
    foundingDiscountPercent: getFoundingDiscountPercent(),
  };
}

function shouldMarkFoundingPartner(accountType, createdAtIso) {
  if (!isLaunchFreePeriodActive(createdAtIso ? Date.parse(createdAtIso) : Date.now())) return false;
  const t = String(accountType || '').toLowerCase();
  return t === 'store' || t === 'estate';
}

module.exports = {
  ALL_MODULE_KEYS,
  SECTION_ALIASES,
  parseOpenSections,
  parseFreeUntil,
  freeUntilEndMs,
  getLaunchFreeUntil,
  setLaunchFreeUntilForTests,
  getEnvOpenSectionFlags,
  isLaunchFreePeriodActive,
  getFoundingDiscountPercent,
  isOpenModule,
  publicLaunchConfig,
  shouldMarkFoundingPartner,
};
