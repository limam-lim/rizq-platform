/**
 * packageCatalogLive.js — قراءة حية للأسعار والباقات (site-config + defaults)
 * مصدر موحّد للوكيل الذكي، Leads، وإشعارات Telegram.
 */
'use strict';

const {
  getPackagesForTool,
  getCatalog,
  priceLabel,
  localizedName,
} = require('../../rizq_packages_config');

const CATALOG_KEYS = ['general', 'store', 'office', 'corp', 'individual'];

function normRef(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/💎/g, '')
    .replace(/[\s_\-/]+/g, '');
}

const SHORT_EXACT_IDS = new Set(['pro', 'basic', 'trial', 'year', 'free', 'month', 'st', 'of', 'cp']);

function packageMatchesRef(pkg, ref) {
  if (!pkg || !ref) return false;
  const r = normRef(ref);
  if (!r) return false;
  const id = normRef(pkg.id);
  const name = normRef(pkg.name);
  if (id && SHORT_EXACT_IDS.has(id)) {
    return id === r || r === id + 'mru' || r.endsWith(id) && r.length <= id.length + 4;
  }
  if (id && id === r) return true;
  if (name && name === r) return true;
  if (id && r.length >= 5 && id.includes(r)) return true;
  if (id && id.length >= 5 && r.includes(id)) return true;
  if (name && name.length > 4 && (name.includes(r) || r.includes(name))) return true;
  return false;
}

const DIAMOND_STD_IDS = ['diamond_standard', 'st-diam-std', 'of-diam-std', 'cp-diam-std', 'diamond', 'st-diam', 'of-diam'];
const DIAMOND_PRO_IDS = ['diamond_pro', 'st-diam-pro', 'of-diam-pro', 'cp-diam-pro', 'cp-diam'];

function inferCatalogFromRef(refStr) {
  const r = String(refStr || '');
  if (/للمكاتب|المكاتب|للمكتب|المكتب|(?:^|\s)مكاتب|(?:^|\s)مكتب(?:\s|$|[؟?.!،,])|office|bureau|professionnel|of-diam/i.test(r)) return 'office';
  if (/للمحلات|المحلات|للمحل|المحل|للمتجر|المتجر|(?:^|\s)محل(?:\s|$|[؟?.!،,])|(?:^|\s)متجر|boutique|store|tienda|st-diam/i.test(r)) return 'store';
  if (/للشركات|الشركات|(?:^|\s)شركة|(?:^|\s)مؤسسة|corp|entreprise|enterprise|cp-diam/i.test(r)) return 'corp';
  if (/(?:^|\s)(?:فرد|individual|annonce|classified)/i.test(r)) return 'individual';
  if (/of-pro|of-year|of-qtr|of-month/i.test(r)) return 'office';
  if (/st-pro|st-year|st-qtr|st-month/i.test(r)) return 'store';
  if (/cp-pro|cp-year|cp-qtr|cp-month/i.test(r)) return 'corp';
  return null;
}

function normalizeCatalogKey(raw) {
  const key = String(raw || '').trim().toLowerCase();
  if (!key) return null;
  if (key === 'stores' || key === 'shop' || key === 'shops') return 'store';
  if (key === 'offices' || key === 'bureau') return 'office';
  if (key === 'corporate' || key === 'company' || key === 'companies') return 'corp';
  if (CATALOG_KEYS.includes(key)) return key;
  return null;
}

function inferCatalogFromMessage(text, meta) {
  meta = meta || {};
  const hint = inferCatalogHint(meta, text);
  if (hint) return hint;
  const pageContext = meta.pageContext || {};
  const page = String(pageContext.page || pageContext.path || pageContext.url || '');
  if (/office|مكتب|bureau/i.test(page)) return 'office';
  if (/store|محل|boutique|dashboard_store/i.test(page)) return 'store';
  if (/corp|company|شركة|dashboard_corp/i.test(page)) return 'corp';
  return null;
}

function inferCatalogHint(meta, packageRef) {
  if (meta && meta.catalogHint) return normalizeCatalogKey(meta.catalogHint);
  const pageContext = (meta && meta.pageContext) || {};
  const page = String(pageContext.page || pageContext.path || pageContext.url || '');
  if (/store|محل|boutique|dashboard_store/i.test(page)) return 'store';
  if (/office|مكتب|bureau|dashboard_office/i.test(page)) return 'office';
  if (/corp|company|شركة|dashboard_corp/i.test(page)) return 'corp';
  if (pageContext.accountType) {
    const t = normalizeCatalogKey(pageContext.accountType);
    if (t) return t;
  }
  if (pageContext.store && pageContext.store.name) return 'store';
  return inferCatalogFromRef(packageRef);
}

function findInCatalogByRef(ref, catalogKey, lang) {
  const pkgs = getPackagesForTool(lang, catalogKey);
  const hit = pkgs.find((p) => packageMatchesRef(p, ref));
  return hit ? Object.assign({}, hit, { catalog: catalogKey }) : null;
}

const DIAMOND_LOOKUP_ORDER = ['store', 'office', 'corp', 'general', 'individual'];

function findDiamondByTier(tier, lang, preferredCatalog, strictOnly) {
  const ids = tier === 'diamond_pro' ? DIAMOND_PRO_IDS : DIAMOND_STD_IDS;
  if (strictOnly && preferredCatalog) {
    const pkgs = getPackagesForTool(lang, preferredCatalog);
    const hit = pkgs.find((p) => ids.includes(String(p.id)));
    return hit ? Object.assign({}, hit, { catalog: preferredCatalog }) : null;
  }
  const order = preferredCatalog
    ? [preferredCatalog].concat(DIAMOND_LOOKUP_ORDER.filter((c) => c !== preferredCatalog))
    : DIAMOND_LOOKUP_ORDER.slice();
  for (let i = 0; i < order.length; i += 1) {
    const cat = order[i];
    const pkgs = getPackagesForTool(lang, cat);
    const hit = pkgs.find((p) => ids.includes(String(p.id)));
    if (hit) return Object.assign({}, hit, { catalog: cat });
  }
  return null;
}

function findInAllCatalogs(ref, lang, preferredCatalog) {
  let best = null;
  let bestScore = 0;
  const r = normRef(ref);
  for (let i = 0; i < CATALOG_KEYS.length; i += 1) {
    const cat = CATALOG_KEYS[i];
    const pkgs = getPackagesForTool(lang, cat);
    pkgs.forEach((p) => {
      if (!packageMatchesRef(p, ref)) return;
      const nameScore = normRef(p.name).length;
      const idScore = normRef(p.id).length;
      const exactBonus = (normRef(p.name) === r || normRef(p.id) === r) ? 1000 : 0;
      const catalogBonus = (preferredCatalog && cat === preferredCatalog) ? 5000 : 0;
      const score = exactBonus + catalogBonus + nameScore + idScore;
      if (score > bestScore) {
        bestScore = score;
        best = Object.assign({}, p, { catalog: cat });
      }
    });
  }
  return best;
}

function resolveLivePackageQuote(packageRef, lang, opts) {
  lang = String(lang || 'ar').toLowerCase();
  opts = opts || {};
  const refStr = typeof packageRef === 'string'
    ? packageRef
    : String(
      (packageRef && (packageRef.packageId || packageRef.id || packageRef.package || packageRef.pkgName || packageRef.name)) || ''
    ).trim();

  if (!refStr) return null;

  const catalogHint = normalizeCatalogKey(opts.catalogHint || opts.catalog) || inferCatalogFromRef(refStr);
  const strictCatalog = !!catalogHint;

  if (strictCatalog) {
    let hit = findInCatalogByRef(refStr, catalogHint, lang);
    if (hit) return quoteFromHit(hit, catalogHint);

    if (/pro|متقد|advanced|premium/i.test(refStr) && /(?:ماس|diamond|diamant)/i.test(refStr)) {
      hit = findDiamondByTier('diamond_pro', lang, catalogHint, true);
      if (hit) return quoteFromHit(hit, catalogHint);
    }
    if (/(?:ماس|diamond|diamant)/i.test(refStr) && !/pro|متقد|advanced|premium/i.test(refStr)) {
      hit = findDiamondByTier('diamond_standard', lang, catalogHint, true);
      if (hit) return quoteFromHit(hit, catalogHint);
    }
    if (/pro|متقد|advanced|premium/i.test(refStr)) {
      hit = findDiamondByTier('diamond_pro', lang, catalogHint, true);
      if (hit) return quoteFromHit(hit, catalogHint);
    }
    if (/(?:ماس|diamond|diamant|أساس|standard|باق)/i.test(refStr)) {
      hit = findDiamondByTier('diamond_standard', lang, catalogHint, true);
      if (hit) return quoteFromHit(hit, catalogHint);
    }
    return null;
  }

  let hit = findInAllCatalogs(refStr, lang, catalogHint);
  if (hit) return quoteFromHit(hit, hit.catalog);

  if (catalogHint) {
    hit = findInCatalogByRef(refStr, catalogHint, lang);
    if (hit) return quoteFromHit(hit, catalogHint);
  }

  if (/pro|متقد|advanced|premium/i.test(refStr) && /(?:ماس|diamond|diamant)/i.test(refStr)) {
    hit = findDiamondByTier('diamond_pro', lang, catalogHint);
    if (hit) return quoteFromHit(hit, hit.catalog);
  }
  if (/(?:ماس|diamond|diamant)/i.test(refStr) && !/pro|متقد|advanced|premium/i.test(refStr)) {
    hit = findDiamondByTier('diamond_standard', lang, catalogHint);
    if (hit) return quoteFromHit(hit, hit.catalog);
  }

  if (!hit && /pro|متقد|advanced|premium/i.test(refStr)) {
    hit = findDiamondByTier('diamond_pro', lang, catalogHint);
  } else if (!hit && /(?:ماس|diamond|diamant|أساس|standard)/i.test(refStr)) {
    hit = findDiamondByTier('diamond_standard', lang, catalogHint);
  }

  if (!hit) return null;
  return quoteFromHit(hit, hit.catalog || catalogHint || 'general');
}

function quoteFromHit(hit, catalog) {
  return {
    id: hit.id,
    catalog: catalog || 'general',
    name: hit.name,
    price: Number(hit.price) || 0,
    priceLabel: hit.priceLabel || String(hit.price) + ' MRU',
    features: hit.features || [],
    discountPct: hit.discountPct || 0,
    source: 'live_catalog',
    fetchedAt: new Date().toISOString(),
  };
}

function getLivePackagesForAI(lang, opts) {
  lang = String(lang || 'ar').toLowerCase();
  opts = opts || {};
  const catalog = normalizeCatalogKey(opts.catalog || opts.catalogHint);
  const catalogs = {};
  const packages = [];

  if (catalog) {
    const list = getPackagesForTool(lang, catalog);
    catalogs[catalog] = list;
    list.forEach((p) => {
      packages.push(Object.assign({}, p, { catalog }));
    });
    return {
      ok: true,
      source: 'live_catalog',
      strictCategory: true,
      catalog,
      catalogResolved: catalog,
      fetchedAt: new Date().toISOString(),
      catalogs,
      packages,
      instruction: 'Quote ONLY prices from this catalog — do not mix store/office/corp prices.',
    };
  }

  CATALOG_KEYS.forEach((cat) => {
    const list = getPackagesForTool(lang, cat);
    catalogs[cat] = list;
    list.forEach((p) => {
      packages.push(Object.assign({}, p, { catalog: cat }));
    });
  });
  return {
    ok: true,
    source: 'live_catalog',
    strictCategory: false,
    catalog: null,
    fetchedAt: new Date().toISOString(),
    catalogs,
    packages,
    instruction: 'Pass catalog=store|office|corp when user specifies business type — never guess category prices.',
  };
}

function getDiamondTierPackages(lang, catalogHint) {
  lang = String(lang || 'ar').toLowerCase();
  const hint = normalizeCatalogKey(catalogHint) || null;
  const strict = !!hint;
  const stdHit = findDiamondByTier('diamond_standard', lang, hint, strict);
  const proHit = findDiamondByTier('diamond_pro', lang, hint, strict);
  const pkgs = getCatalog(hint || 'store', lang);
  return {
    std: stdHit || pkgs.find((p) => /diam.*std|diamond_standard|st-diam-std|of-diam-std|cp-diam-std/i.test(String(p.id || ''))) || null,
    pro: proHit || pkgs.find((p) => /diam.*pro|diamond_pro|st-diam-pro|of-diam-pro|cp-diam-pro/i.test(String(p.id || ''))) || null,
    catalogHint: hint || (stdHit && stdHit.catalog) || (proHit && proHit.catalog) || null,
  };
}

function collectLivePackagePrices(lang, catalogHint) {
  lang = String(lang || 'ar').toLowerCase();
  const digits = new Set();
  const catalogs = catalogHint ? [catalogHint] : DIAMOND_LOOKUP_ORDER;
  catalogs.forEach((cat) => {
    getPackagesForTool(lang, cat).forEach((p) => {
      if (p && p.price != null) digits.add(String(Number(p.price)));
    });
  });
  return digits;
}

function replyUsesUnknownPackagePrice(reply, lang, catalogHint, userMessage) {
  const hint = catalogHint
    || inferCatalogFromMessage(userMessage, {})
    || inferCatalogFromRef(userMessage)
    || null;
  const allowed = collectLivePackagePrices(lang, hint);
  if (!allowed.size) return false;
  const mentions = String(reply || '').match(/\d{3,6}/g) || [];
  return mentions.some((m) => {
    if (m.length < 3) return false;
    if (allowed.has(m)) return false;
    if (m === '222' || m === '2026' || m === '2025') return false;
    return /(?:MRU|أوقية|ouguiya|سعر|price|prix|باق|forfait|package|ماس|diamond)/i.test(String(reply || ''));
  });
}

function isDiamondPricingQuery(message) {
  return /(?:ماس|diamond|diamant|\bpro\b|standard|أساس|متقد)/i.test(String(message || ''));
}

/** رد نصّي مركّز — الماسية Standard + Pro لفئة واحدة فقط */
function buildCategoryDiamondChatSummary(lang, catalogHint) {
  lang = String(lang || 'ar').toLowerCase();
  const cat = normalizeCatalogKey(catalogHint);
  if (!cat) return buildLivePackagesChatSummary(lang, {});

  const tiers = getDiamondTierPackages(lang, cat);
  const std = tiers.std;
  const pro = tiers.pro;
  const catLabels = {
    ar: { store: 'المحلات', office: 'المكاتب', corp: 'الشركات', general: 'عام', individual: 'الأفراد' },
    fr: { store: 'boutiques', office: 'bureaux', corp: 'entreprises', general: 'général', individual: 'particuliers' },
    en: { store: 'stores', office: 'offices', corp: 'companies', general: 'general', individual: 'individuals' },
    es: { store: 'tiendas', office: 'oficinas', corp: 'empresas', general: 'general', individual: 'particulares' },
  };
  const labels = catLabels[lang] || catLabels.ar;
  const catLabel = labels[cat] || cat;

  const lines = [];
  if (std) lines.push(localizedName(std, lang) + ' — ' + priceLabel(std, lang) + ' — نصي فقط');
  if (pro) lines.push(localizedName(pro, lang) + ' — ' + priceLabel(pro, lang) + ' — نص + صوت تفاعلي');

  const headers = {
    ar: '🌟 باقات الماسية لـ' + catLabel + ' (أسعار حية من الكتالوج):',
    fr: '🌟 Forfaits Diamant — ' + catLabel + ' (prix actuels) :',
    en: '🌟 Diamond plans — ' + catLabel + ' (live catalog):',
    es: '🌟 Planes Diamante — ' + catLabel + ' (precios actuales):',
  };
  const footers = {
    ar: 'أيّ مستوى يناسب نشاطك؟',
    fr: 'Quel niveau vous convient ?',
    en: 'Which tier fits your business?',
    es: '¿Qué nivel le conviene?',
  };
  return (headers[lang] || headers.ar) + '\n\n' + lines.join('\n') + '\n\n' + (footers[lang] || footers.ar);
}

function buildDiamondCompletionFooter(lang, catalogHint) {
  lang = String(lang || 'ar').toLowerCase();
  const tiers = getDiamondTierPackages(lang, catalogHint);
  const std = tiers.std;
  const pro = tiers.pro;
  if (!std || !pro) return '';

  const stdLabel = priceLabel(std, lang);
  const proLabel = priceLabel(pro, lang);
  const proName = localizedName(pro, lang);
  const stdName = localizedName(std, lang);

  const footers = {
    ar: '\n\n' + proName + ' (' + proLabel + '): نائب ذكي متقدم + ويدجت + واتساب + مكالمات صوتية تفاعلية.\n\n'
      + 'مقارنة سريعة:\n'
      + stdName + ' — ' + stdLabel + ' — نصي فقط\n'
      + proName + ' — ' + proLabel + ' — نص + صوت تفاعلي',
    fr: '\n\n' + proName + ' (' + proLabel + ') : adjoint avance + widget + WhatsApp + appels vocaux interactifs.\n\n'
      + 'Comparaison :\n'
      + stdName + ' — ' + stdLabel + ' — texte seul\n'
      + proName + ' — ' + proLabel + ' — texte + voix',
    en: '\n\n' + proName + ' (' + proLabel + '): advanced agent + widget + WhatsApp + interactive voice calls.\n\n'
      + 'Quick comparison:\n'
      + stdName + ' — ' + stdLabel + ' — text only\n'
      + proName + ' — ' + proLabel + ' — text + voice',
    es: '\n\n' + proName + ' (' + proLabel + '): agente avanzado + widget + WhatsApp + llamadas de voz interactivas.\n\n'
      + 'Comparacion:\n'
      + stdName + ' — ' + stdLabel + ' — solo texto\n'
      + proName + ' — ' + proLabel + ' — texto + voz',
  };
  return footers[lang] || footers.ar;
}

function formatPriceForTelegram(quote) {
  if (!quote) return '—';
  if (quote.priceLabel) return quote.priceLabel;
  if (quote.price === 0) return 'مجاني';
  return String(quote.price) + ' MRU';
}

/** ملخص نصّي للباقات بأسعار حية — للردود الثابتة / offline في الويدجت */
function buildLivePackagesChatSummary(lang, opts) {
  opts = opts || {};
  lang = String(lang || 'ar').toLowerCase();
  const catalogHint = opts.catalogHint;
  const catalogs = catalogHint ? [catalogHint] : ['general', 'store', 'office', 'corp'];
  const seen = new Set();
  const lines = [];
  catalogs.forEach((cat) => {
    getPackagesForTool(lang, cat).forEach((p) => {
      if (!p || !p.id || seen.has(p.id)) return;
      seen.add(p.id);
      lines.push(p.name + ' — ' + p.priceLabel);
    });
  });
  const header = {
    ar: '🌟 باقات رزق (أسعار حية):',
    hs: '🌟 باقات رزق (أسعار حية):',
    fr: '🌟 Forfaits Rizq (prix actuels) :',
    en: '🌟 Rizq plans (live prices):',
    es: '🌟 Planes Rizq (precios actuales):',
  };
  const footer = {
    ar: 'أيّ باقة تناسبك أكثر؟',
    hs: 'أيهم يناسبك؟',
    fr: 'Lequel vous convient ?',
    en: 'Which one suits you?',
    es: '¿Cuál le conviene?',
  };
  return (header[lang] || header.ar) + '\n\n' + lines.join('\n') + '\n\n' + (footer[lang] || footer.ar);
}

module.exports = {
  CATALOG_KEYS,
  DIAMOND_LOOKUP_ORDER,
  normalizeCatalogKey,
  resolveLivePackageQuote,
  inferCatalogFromRef,
  inferCatalogFromMessage,
  inferCatalogHint,
  getLivePackagesForAI,
  getDiamondTierPackages,
  collectLivePackagePrices,
  replyUsesUnknownPackagePrice,
  buildDiamondCompletionFooter,
  buildLivePackagesChatSummary,
  buildCategoryDiamondChatSummary,
  isDiamondPricingQuery,
  formatPriceForTelegram,
};
