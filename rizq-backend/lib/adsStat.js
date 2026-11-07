'use strict';
/**
 * خانة «إعلان نشط» في #platform-stats:
 * - يكتبها Express في HTML عند الطلب (مقرّبة مثل +1,200)
 * - تحت الحد الأدنى القابل للضبط → «مجاني / النشر الأساسي»
 * - DEMO_MODE=true → رقم الديمو (site.adsCount أو عدّ يشمل الديمو)
 */
const launchMode = require('../config/launchMode');
const { isDemoModeEnabled } = require('./demoMode');

const DEMO_DEFAULT_ADS = 1200;

function isDemoAd(ad) {
  if (!ad) return true;
  if (String(ad.accountId || '').startsWith('acc_demo')) return true;
  if (/^RZQ-2026-1000\d$/i.test(String(ad.id || ''))) return true;
  return false;
}

function countActiveAds(ads, includeDemo) {
  const list = Array.isArray(ads) ? ads : [];
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a || a.status !== 'active') continue;
    if (!includeDemo && isDemoAd(a)) continue;
    n += 1;
  }
  return n;
}

/** تقريب تسويقي: +1,200 */
function formatRoundedAds(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  let r = v;
  if (v >= 1000) r = Math.floor(v / 100) * 100;
  else if (v >= 100) r = Math.floor(v / 10) * 10;
  return '+' + r.toLocaleString('en-US');
}

function freeAdsCopy(lang) {
  if (lang === 'fr') {
    return { num: 'Gratuit', lbl: 'publication de base', combined: 'Gratuit – publication de base' };
  }
  return { num: 'مجاني', lbl: 'النشر الأساسي', combined: 'مجاني – النشر الأساسي' };
}

function adsLabelCopy(lang) {
  if (lang === 'fr') return 'annonces actives';
  return 'إعلان نشط';
}

/**
 * @param {object} opts
 * @param {Array} opts.ads
 * @param {number} [opts.minActiveAdsToShow]
 * @param {number} [opts.siteAdsCount]
 * @param {boolean} [opts.demoMode]
 * @param {string} [opts.lang]
 */
function resolveAdsStatPresentation(opts) {
  const o = opts || {};
  const demoMode = o.demoMode != null ? !!o.demoMode : isDemoModeEnabled();
  const lang = o.lang === 'fr' ? 'fr' : 'ar';
  const minShow = launchMode.normalizeMinActiveAdsToShow(o.minActiveAdsToShow);
  const real = countActiveAds(o.ads, false);
  const withDemo = countActiveAds(o.ads, true);
  const siteCount = Math.max(0, Math.floor(Number(o.siteAdsCount) || 0));

  if (demoMode) {
    let n = siteCount > 0 ? siteCount : withDemo;
    if (n <= 0) n = DEMO_DEFAULT_ADS;
    return {
      mode: 'number',
      raw: n,
      display: formatRoundedAds(n),
      label: adsLabelCopy(lang),
      minShow,
      demoMode: true,
      lang,
    };
  }

  if (minShow > 0 && real < minShow) {
    const copy = freeAdsCopy(lang);
    return {
      mode: 'free',
      raw: real,
      display: copy.num,
      label: copy.lbl,
      combined: copy.combined,
      minShow,
      demoMode: false,
      lang,
    };
  }

  return {
    mode: 'number',
    raw: real,
    display: formatRoundedAds(real),
    label: adsLabelCopy(lang),
    minShow,
    demoMode: false,
    lang,
  };
}

async function buildAdsStatPresentation(deps) {
  const d = deps || {};
  const readAds = d.readAds;
  const getLaunchSettings = d.getLaunchSettings || (() => launchMode.getLaunchSettings());
  const getSiteConfig = d.getSiteConfig;
  const demoMode = d.demoMode != null ? !!d.demoMode : isDemoModeEnabled();
  const lang = d.lang === 'fr' ? 'fr' : 'ar';

  const ads = typeof readAds === 'function' ? await readAds() : [];
  const launch = await getLaunchSettings();
  let siteAdsCount = 0;
  if (typeof getSiteConfig === 'function') {
    try {
      const cfg = (await getSiteConfig()) || {};
      siteAdsCount = Number(cfg.site && cfg.site.adsCount) || 0;
    } catch (e) { /* */ }
  }

  return resolveAdsStatPresentation({
    ads,
    minActiveAdsToShow: launch && launch.minActiveAdsToShow,
    siteAdsCount,
    demoMode,
    lang,
  });
}

/**
 * يحقن خانة الإعلانات في HTML (data-rizq-stat="ads" أو data-stat="ads").
 */
function injectAdsStat(html, presentation) {
  if (typeof html !== 'string' || !html) return html;
  const p = presentation || resolveAdsStatPresentation({});
  const mode = p.mode === 'free' ? 'free' : 'number';
  const display = String(p.display != null ? p.display : (mode === 'free' ? freeAdsCopy(p.lang).num : '+0'));
  const label = String(p.label != null ? p.label : (mode === 'free' ? freeAdsCopy(p.lang).lbl : adsLabelCopy(p.lang)));
  const raw = Math.max(0, Math.floor(Number(p.raw) || 0));
  const target = mode === 'free' ? '0' : String(raw);
  const lblKey = mode === 'free' ? 'stat-free' : 'stat-ads';

  let out = html;

  const reNum = /(<span\b[^>]*class="[^"]*\bh-stat-num\b[^"]*"[^>]*data-live="adsActive"[^>]*)>([^<]*)(<\/span>)/i;
  const reNumMarked = /(<span\b[^>]*data-rizq-stat="ads"[^>]*)>([^<]*)(<\/span>)/i;

  function patchNum(open, close) {
    let o = open
      .replace(/\sdata-target="[^"]*"/i, '')
      .replace(/\sdata-rizq-stat="[^"]*"/i, '')
      .replace(/\sdata-rizq-ads-mode="[^"]*"/i, '')
      .replace(/\sdata-count-text="[^"]*"/i, '')
      .replace(/\sdata-suffix="[^"]*"/i, '');
    o += ' data-rizq-stat="ads" data-rizq-ads-mode="' + mode + '" data-target="' + target + '"';
    if (mode === 'free') o += ' data-count-text="1"';
    return o + '>' + display + close;
  }

  if (reNumMarked.test(out)) {
    out = out.replace(reNumMarked, function (_m, open, _old, close) {
      return patchNum(open, close);
    });
  } else if (reNum.test(out)) {
    out = out.replace(reNum, function (_m, open, _old, close) {
      return patchNum(open, close);
    });
  }

  const reLbl = /(<div\b[^>]*data-stat="ads"[^>]*>[\s\S]*?<span\b[^>]*class="[^"]*\bh-stat-lbl\b[^"]*")([^>]*)>([^<]*)(<\/span>)/i;
  if (reLbl.test(out)) {
    out = out.replace(reLbl, function (_m, open, attrs, _old, close) {
      let a = String(attrs || '')
        .replace(/\sdata-t="[^"]*"/i, '');
      a += ' data-t="' + lblKey + '"';
      return open + a + '>' + label + close;
    });
  }

  /* أبقِ خانة free المخفية متزامنة للترجمة */
  const reFreeNum = /(<div\b[^>]*data-stat="free"[^>]*>\s*<span\b[^>]*class="[^"]*\bh-stat-num\b[^"]*"[^>]*)>([^<]*)(<\/span>)/i;
  if (reFreeNum.test(out)) {
    const copy = freeAdsCopy(p.lang);
    out = out.replace(reFreeNum, '$1>' + copy.num + '$3');
  }
  const reFreeLbl = /(<div\b[^>]*data-stat="free"[^>]*>[\s\S]*?<span\b[^>]*class="[^"]*\bh-stat-lbl\b[^"]*"[^>]*)>([^<]*)(<\/span>)/i;
  if (reFreeLbl.test(out)) {
    const copy = freeAdsCopy(p.lang);
    out = out.replace(reFreeLbl, '$1>' + copy.lbl + '$3');
  }

  return out;
}

module.exports = {
  DEMO_DEFAULT_ADS,
  isDemoAd,
  countActiveAds,
  formatRoundedAds,
  freeAdsCopy,
  adsLabelCopy,
  resolveAdsStatPresentation,
  buildAdsStatPresentation,
  injectAdsStat,
};
