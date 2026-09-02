/**
 * currencyRates.js — جلب أسعار العملات مقابل MRU (Frankfurter + fallback)
 */
'use strict';

const DEFAULT_CURRENCIES = [
  { code: 'USD', icon: '🇺🇸', name: 'دولار أمريكي', name_fr: 'Dollar américain', divisor: 1, enabled: true, adjustPct: 0, manual: false },
  { code: 'EUR', icon: '🇪🇺', name: 'يورو', name_fr: 'Euro', divisor: 1, enabled: true, adjustPct: 0, manual: false },
  { code: 'MAD', icon: '🇲🇦', name: 'درهم مغربي', name_fr: 'Dirham marocain', divisor: 100, enabled: true, adjustPct: 0, manual: false },
  { code: 'DZD', icon: '🇩🇿', name: 'دينار جزائري', name_fr: 'Dinar algérien', divisor: 100, enabled: true, adjustPct: 0, manual: false },
  { code: 'TND', icon: '🇹🇳', name: 'دينار تونسي', name_fr: 'Dinar tunisien', divisor: 100, enabled: true, adjustPct: 0, manual: false },
  { code: 'SAR', icon: '🇸🇦', name: 'ريال سعودي', name_fr: 'Riyal saoudien', divisor: 1, enabled: true, adjustPct: 0, manual: false },
  { code: 'AED', icon: '🇦🇪', name: 'درهم إماراتي', name_fr: 'Dirham émirati', divisor: 1, enabled: true, adjustPct: 0, manual: false },
  { code: 'XOF', icon: '🌍', name: 'فرنك غرب أفريقي', name_fr: 'Franc CFA (UEMOA)', divisor: 100, enabled: true, adjustPct: 0, manual: false },
  { code: 'TRY', icon: '🇹🇷', name: 'ليرة تركية', name_fr: 'Livre turque', divisor: 1, enabled: true, adjustPct: 0, manual: false },
  { code: 'CNY', icon: '🇨🇳', name: 'يوان صيني', name_fr: 'Yuan chinois', divisor: 1, enabled: true, adjustPct: 0, manual: false },
  { code: 'AOA', icon: '🇦🇴', name: 'كوانزا أنغولي', name_fr: 'Kwanza angolais', divisor: 100, enabled: true, adjustPct: 0, manual: false },
];

const FRANKFURTER = 'https://api.frankfurter.dev/v2/latest';
const FAWAZ_CDN = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';

function roundRate(n) {
  const v = Number(n);
  if (!isFinite(v) || v <= 0) return 0;
  return Math.round(v * 100) / 100;
}

function computeTrend(prev, next) {
  if (!prev || !next) return 'flat';
  const p = Number(prev);
  const n = Number(next);
  if (!isFinite(p) || !isFinite(n)) return 'flat';
  const diff = n - p;
  if (Math.abs(diff) < 0.005) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

function displayPrice(ratePerUnit, divisor, adjustPct) {
  const base = Number(ratePerUnit) || 0;
  const div = Math.max(1, Number(divisor) || 1);
  const adj = Number(adjustPct) || 0;
  return roundRate(base * div * (1 + adj / 100));
}

function buildUnit(code, divisor) {
  const div = Math.max(1, Number(divisor) || 1);
  return div === 1 ? ('1 ' + String(code || '').toUpperCase()) : (div + ' ' + String(code || '').toUpperCase());
}

async function fetchFrankfurter(code) {
  const c = String(code || '').toUpperCase();
  const url = FRANKFURTER + '?from=' + encodeURIComponent(c) + '&to=MRU';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('frankfurter_' + res.status);
  const data = await res.json();
  const rate = data && data.rates && data.rates.MRU;
  if (!rate || !isFinite(Number(rate))) throw new Error('frankfurter_no_mru');
  return roundRate(rate);
}

async function fetchFawaz(code) {
  const c = String(code || '').toLowerCase();
  const url = FAWAZ_CDN + '/' + encodeURIComponent(c) + '.json';
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('fawaz_' + res.status);
  const data = await res.json();
  const rate = data && data[c] && data[c].mru;
  if (!rate || !isFinite(Number(rate))) throw new Error('fawaz_no_mru');
  return roundRate(rate);
}

async function fetchRateForCode(code) {
  try {
    return await fetchFrankfurter(code);
  } catch (_e1) {
    return fetchFawaz(code);
  }
}

function mergeCurrencyConfig(existingList) {
  const byCode = {};
  (Array.isArray(existingList) ? existingList : []).forEach((it) => {
    if (it && it.code) byCode[String(it.code).toUpperCase()] = it;
  });
  return DEFAULT_CURRENCIES.map((def) => {
    const prev = byCode[def.code] || {};
    return Object.assign({}, def, prev, { code: def.code });
  });
}

function sanitizeCurrencyItem(it) {
  const code = String(it.code || '').toUpperCase().slice(0, 6);
  if (!code) return null;
  const divisor = Math.max(1, Math.min(10000, Number(it.divisor) || 1));
  const adjustPct = Math.max(-50, Math.min(50, Number(it.adjustPct) || 0));
  const ratePerUnit = roundRate(it.ratePerUnit || (it.price && divisor ? Number(it.price) / divisor : 0));
  const price = displayPrice(ratePerUnit, divisor, adjustPct);
  return {
    code,
    icon: String(it.icon || '💱').slice(0, 8),
    name: String(it.name || code).slice(0, 80),
    name_fr: String(it.name_fr || it.name || code).slice(0, 80),
    divisor,
    enabled: it.enabled !== false,
    manual: !!it.manual,
    adjustPct,
    ratePerUnit,
    price,
    unit: buildUnit(code, divisor),
    trend: ['up', 'down', 'flat'].includes(it.trend) ? it.trend : 'flat',
    apiRate: roundRate(it.apiRate || 0) || null,
    updatedAt: it.updatedAt || null,
  };
}

function sanitizeCurrencyList(list) {
  return (Array.isArray(list) ? list : [])
    .map(sanitizeCurrencyItem)
    .filter(Boolean)
    .slice(0, 24);
}

async function refreshCurrencyRates(existingList, options) {
  const opts = options || {};
  const onlyEnabled = opts.onlyEnabled !== false;
  const merged = mergeCurrencyConfig(existingList);
  const out = [];
  const errors = [];
  const now = new Date().toISOString();

  for (const row of merged) {
    const item = sanitizeCurrencyItem(row) || row;
    if (onlyEnabled && !item.enabled) {
      out.push(item);
      continue;
    }
    if (item.manual && item.ratePerUnit > 0) {
      item.price = displayPrice(item.ratePerUnit, item.divisor, item.adjustPct);
      item.unit = buildUnit(item.code, item.divisor);
      item.updatedAt = now;
      out.push(item);
      continue;
    }

    try {
      const apiRate = await fetchRateForCode(item.code);
      const prev = item.ratePerUnit || item.apiRate || 0;
      item.apiRate = apiRate;
      item.ratePerUnit = apiRate;
      item.price = displayPrice(apiRate, item.divisor, item.adjustPct);
      item.unit = buildUnit(item.code, item.divisor);
      item.trend = computeTrend(prev, apiRate);
      item.updatedAt = now;
      item.manual = false;
      out.push(item);
    } catch (err) {
      errors.push({ code: item.code, error: err && err.message ? err.message : 'fetch_failed' });
      if (item.ratePerUnit > 0) {
        item.price = displayPrice(item.ratePerUnit, item.divisor, item.adjustPct);
        item.unit = buildUnit(item.code, item.divisor);
        out.push(item);
      }
    }
  }

  return { currencies: sanitizeCurrencyList(out), errors, updatedAt: now };
}

function currencyToPriceBoardItem(it) {
  const c = sanitizeCurrencyItem(it);
  if (!c || !c.enabled) return null;
  return {
    cat: 'currencies',
    code: c.code,
    icon: c.icon,
    name: c.name,
    name_fr: c.name_fr,
    price: c.price,
    unit: c.unit + ' = MRU',
    unit_fr: c.unit + ' = MRU',
    trend: c.trend,
    divisor: c.divisor,
    ratePerUnit: c.ratePerUnit,
    updatedAt: c.updatedAt,
  };
}

module.exports = {
  DEFAULT_CURRENCIES,
  mergeCurrencyConfig,
  sanitizeCurrencyList,
  sanitizeCurrencyItem,
  refreshCurrencyRates,
  currencyToPriceBoardItem,
  displayPrice,
  buildUnit,
};
