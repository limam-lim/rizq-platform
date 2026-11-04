/**
 * كتالوج الرئيسية — GET /api/catalog/home
 * أقسام: styles | showrooms | stores
 * منتجات معتمدة فقط من حساب فعّال وغير معلّق، مع كاش 60 ثانية.
 */
'use strict';

const FASHION_ACTIVITY_IDS = new Set([
  'st_clothing', 'st_menswear', 'st_womenswear', 'st_kidswear',
  'st_shoes', 'st_traditional', 'st_perfume', 'ind_fashion',
]);

const SRM_CAT_FILTERS = {
  cars: {
    allow: /سيارات|voiture|\bauto\b|sedan|suv|4x4|camionnette|moto/i,
    block: /عقارات|شقق|أراضي|أثاث|إلكترون|ذهب|ماشية|خدمات|أزياء|appartement|terrain/i,
  },
  electronics: {
    allow: /إلكترون|هواتف|لابتوب|تلفزيون|جوال|iphone|samsung|laptop|\btv\b|électronique|electronique/i,
    block: /عقارات|سيارات|شاحن(?:ات)?\b|أثاث|ذهب|ماشية|appartement|voiture/i,
  },
  furniture: {
    allow: /أثاث|مفروشات|كنب|سرير|طاولة|خزانة|meuble|canapé|sofa|armoire/i,
    block: /عقارات|سيارات|إلكترون|ذهب|ماشية|شاحن/i,
  },
  equipment: {
    allow: /معدات|مكائن|آلات|حفارة|مولد|équipement|equipement|\bmachine\b|\bengin\b|générateur|generateur|caterpillar/i,
    block: /عقارات|شقق|أزياء|ذهب|ماشية|إلكترون.*هاتف/i,
  },
  building: {
    allow: /بناء|إسمنت|حديد|طوب|مواد\s*بناء|ciment|fer\b|construction|matériau|materiau|ألواح\s*شمسي/i,
    block: /عقارات|شقق|سيارات|أزياء|ذهب/i,
  },
  jewelry: {
    allow: /ذهب|مجوهرات|خاتم|سوار|عقد|عيار|bijou|\bgold\b|joaill/i,
    block: /عقارات|سيارات|إلكترون|أثاث|ماشية|شاحن/i,
  },
};

const HOME_CACHE_TTL_MS = 60 * 1000;
const _cache = new Map();

function _cacheKey(section, cat, limit) {
  return String(section || '') + '|' + String(cat || '') + '|' + String(limit || '');
}

function _getCached(key) {
  const hit = _cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > HOME_CACHE_TTL_MS) {
    _cache.delete(key);
    return null;
  }
  return hit.payload;
}

function _setCached(key, payload) {
  _cache.set(key, { at: Date.now(), payload });
  if (_cache.size > 64) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
}

function clearHomeCatalogCache() {
  _cache.clear();
}

function accountBlob(acc) {
  if (!acc) return '';
  return [acc.name, acc.nameF, acc.nameFr, acc.activity, acc.category, acc.cat,
    acc.tagline, acc.desc, acc.businessType, acc.activityId]
    .filter(Boolean).join(' ');
}

function isFashionStore(acc) {
  if (!acc) return false;
  const typ = String(acc.type || '').toLowerCase();
  if (typ && typ !== 'store' && typ !== 'shop' && typ !== 'boutique') return false;
  const aid = String(acc.activityId || '');
  if (FASHION_ACTIVITY_IDS.has(aid)) return true;
  const blob = accountBlob(acc);
  if (/سيارة|عقارات|مكتب|مناقصة|إلكترون|بقالة|مواد غذائية|صيدلية|auto|immobilier|bureau|épicerie|pharmacie/i.test(blob)
    && !/أزياء|ملابس|موضة|fashion|mode|vêtement/i.test(blob)) {
    return false;
  }
  if (/أزياء|ملابس|موضة|دراعة|ملحفة|أحذية|إكسسوار|عطور|أطفال|خياط|بوتيك|fashion|mode|vêtement|boutique|habillement|chaussure|parfum|enfant|kids|couture/i.test(blob)) {
    return true;
  }
  return false;
}

function isShowroomAccount(acc) {
  const t = String((acc && acc.type) || '').toLowerCase();
  return t === 'corp' || t === 'showroom' || t === 'company';
}

function isStoreAccount(acc) {
  const t = String((acc && acc.type) || '').toLowerCase();
  return t === 'store' || t === 'shop' || t === 'boutique';
}

function itemCatBlob(it) {
  /* حقول التصنيف فقط — لا name/title (تجنّب دخول تصنيف بالاسم النصي) */
  return [
    it && it.categoryId, it && it.category, it && it.categoryKey, it && it.cat,
    it && it.subcat, it && it.subCategoryId,
  ].filter(Boolean).join(' ');
}

function matchesShowroomCat(it, cat) {
  const meta = SRM_CAT_FILTERS[cat] || SRM_CAT_FILTERS.cars;
  const head = [
    it && it.categoryId, it && it.category, it && it.categoryKey, it && it.cat,
  ].filter(Boolean).join(' ').trim();
  if (!head) return false;
  if (meta.block && meta.block.test(head)) return false;
  if (cat === 'cars') {
    const titleBlob = [it && it.name, it && it.title, it && it.subcat].filter(Boolean).join(' ');
    if (/شقة|فيلا|أرض|بنتهاوس|appartement|villa|\bterrain\b|penthouse/i.test(titleBlob)) return false;
  }
  return !!(meta.allow && meta.allow.test(head + ' ' + itemCatBlob(it)));
}

function looksLikeFashionProduct(it) {
  const blob = itemCatBlob(it);
  return /أزياء|ملابس|موضة|دراعة|ملحفة|أحذية|إكسسوار|عطور|fashion|mode|vêtement|chaussure|parfum|enfant|kids/i.test(blob);
}

function slimSeller(acc, diamond) {
  if (!acc) return null;
  return {
    id: acc.id,
    name: String(acc.name || '').slice(0, 120),
    type: String(acc.type || '').slice(0, 24),
    city: String(acc.city || acc.wilaya || '').slice(0, 80),
    activityId: String(acc.activityId || '').slice(0, 64),
    activity: String(acc.activity || '').slice(0, 120),
    diamondActive: !!diamond,
    badges: {
      verified: !!(acc.verified || acc.nniVerified || acc.id_verified),
      verifiedPlus: !!acc.verifiedPlus,
      trusted: !!acc.trusted,
    },
  };
}

function toPublicCatalogGated(item, gate, seller, extra) {
  if (!item) return null;
  const unlocked = !!(gate && gate.contactsUnlocked);
  const out = {
    id: item.id,
    accountId: item.accountId,
    kind: item.kind,
    name: item.name || item.title || '',
    nameFr: item.nameFr || item.nameF || '',
    title: item.name || item.title || '',
    price: item.price,
    cat: item.cat || item.category || item.categoryKey || '',
    categoryId: item.categoryId || item.category || item.categoryKey || '',
    category: item.category || item.categoryId || item.categoryKey || '',
    subcat: item.subcat || item.subCategoryId || '',
    emoji: item.emoji || '',
    image: item.image || null,
    images: Array.isArray(item.images) ? item.images.slice(0, 6) : (item.image ? [item.image] : []),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    status: 'active',
    gender: item.gender || '',
    brandId: item.brandId || '',
    brandName: item.brandName || '',
    brandNameFr: item.brandNameFr || '',
    contactsLocked: !unlocked,
    seller: slimSeller(seller, extra && extra.diamondActive),
    sellerContext: item.sellerContext || null,
    homeBadge: (extra && extra.homeBadge) || null,
    diamondActive: !!(extra && extra.diamondActive),
    href: (extra && extra.href) || null,
  };
  if (!unlocked) {
    out.desc = null;
    out.descFr = null;
  } else {
    out.desc = item.desc || null;
    out.descFr = item.descFr || null;
  }
  return out;
}

/**
 * @param {object} opts
 * @param {string} opts.section styles|showrooms|stores
 * @param {string} [opts.cat]
 * @param {number} [opts.limit]
 * @param {string|null} [opts.viewerId]
 * @param {object} deps
 */
async function buildHomeCatalog(opts, deps) {
  const section = String((opts && opts.section) || '').toLowerCase();
  if (section !== 'styles' && section !== 'showrooms' && section !== 'stores') {
    const err = new Error('invalid_section');
    err.status = 400;
    throw err;
  }
  const cat = String((opts && opts.cat) || '').trim().toLowerCase();
  const limit = Math.max(1, Math.min(48, Number(opts && opts.limit) || 12));
  const cacheKey = _cacheKey(section, cat, limit);
  const cached = _getCached(cacheKey);
  if (cached) {
    return Object.assign({ cached: true }, cached);
  }

  const {
    queryHomeCatalogJoin,
    applyPublicCatalogCaps,
    resolveContactGate,
    isDiamondActive,
    /* توافق الاختبارات القديمة التي تمرّر readCatalog/queryPublicAccounts */
    readCatalog,
    queryPublicAccounts,
  } = deps;

  let joined = [];
  if (typeof queryHomeCatalogJoin === 'function') {
    const oversample = Math.max(limit * 20, 120);
    if (section === 'styles' || section === 'stores') {
      const q = await queryHomeCatalogJoin({
        accountTypes: ['store', 'shop', 'boutique'],
        limit: oversample,
        createdAfterMs: section === 'stores' ? (Date.now() - 24 * 3600 * 1000) : null,
      });
      joined = q.rows || [];
    } else {
      const q = await queryHomeCatalogJoin({
        accountTypes: ['corp', 'company', 'showroom'],
        limit: oversample,
        categoryIlike: cat || 'سيارات',
      });
      joined = q.rows || [];
    }
  } else {
    /* مسار اختبار/توافق: بدون SQL JOIN */
    let accounts = [];
    if (section === 'styles' || section === 'stores') {
      const { accounts: stores } = await queryPublicAccounts({ type: 'store', limit: 2000 });
      accounts = (stores || []).filter(isStoreAccount);
    } else {
      const corp = await queryPublicAccounts({ type: 'corp', limit: 2000 });
      const company = await queryPublicAccounts({ type: 'company', limit: 2000 });
      const showroom = await queryPublicAccounts({ type: 'showroom', limit: 2000 });
      const seen = {};
      accounts = []
        .concat(corp.accounts || [], company.accounts || [], showroom.accounts || [])
        .filter((a) => {
          if (!a || !a.id || seen[a.id]) return false;
          seen[a.id] = 1;
          return isShowroomAccount(a);
        });
    }
    const accByIdTmp = new Map();
    accounts.forEach((a) => { if (a && a.id) accByIdTmp.set(String(a.id), a); });
    let listTmp = (await readCatalog()).filter((it) => it && it.status === 'active' && it.kind === 'product');
    listTmp = listTmp.filter((it) => accByIdTmp.has(String(it.accountId || '')));
    joined = listTmp.map((it) => ({ item: it, account: accByIdTmp.get(String(it.accountId || '')) }));
  }

  const accById = new Map();
  joined.forEach((row) => {
    if (row && row.account && row.account.id) accById.set(String(row.account.id), row.account);
  });

  /* تجميد الباقة: لا إظهار حسابات منتهية/مؤرشفة في إطلالات الرئيسية (فلترة لا حذف) */
  const listableIds = new Set();
  try {
    const { getPackageRecord, isPackageListable } = require('./packageFreeze');
    const ids = Array.from(accById.keys());
    await Promise.all(ids.map(async (id) => {
      try {
        const pkg = await getPackageRecord(id);
        /* بلا سجل باقة: لا يظهر في الإطلالات المدفوعة (يتوافق مع فلترة المنتهية) */
        if (pkg && isPackageListable(pkg)) listableIds.add(id);
      } catch (eL) { /* skip */ }
    }));
  } catch (eFreeze) {
    /* إن تعذّر التحميل — لا نكسر الرئيسية: نُبقي السلوك السابق */
    accById.forEach((_v, id) => listableIds.add(id));
  }

  joined = joined.filter((row) => {
    const id = row && row.account && row.account.id ? String(row.account.id) : '';
    return id && listableIds.has(id);
  });
  accById.clear();
  joined.forEach((row) => {
    if (row && row.account && row.account.id) accById.set(String(row.account.id), row.account);
  });
  const accounts = Array.from(accById.values());

  let list = joined.map((row) => row.item).filter(Boolean);
  list = await applyPublicCatalogCaps(list);

  const diamondCache = new Map();
  async function diamondOf(accountId) {
    const id = String(accountId || '');
    if (!id) return false;
    if (diamondCache.has(id)) return diamondCache.get(id);
    let ok = false;
    try {
      ok = !!(typeof isDiamondActive === 'function' && await isDiamondActive(id));
    } catch (e) { ok = false; }
    diamondCache.set(id, ok);
    return ok;
  }

  const gateCache = new Map();
  async function gateOf(accountId, typeHint) {
    const id = String(accountId || '');
    if (gateCache.has(id)) return gateCache.get(id);
    let gate = { contactsUnlocked: false, contactsLocked: true, lockReason: 'locked' };
    try {
      if (typeof resolveContactGate === 'function') {
        gate = await resolveContactGate(opts.viewerId || null, id, typeHint || 'store', typeHint);
      }
    } catch (eG) { /* keep locked */ }
    gateCache.set(id, gate);
    return gate;
  }

  let items = [];

  if (section === 'styles') {
    const fashionAccs = accounts.filter(isFashionStore);
    const fashionIds = new Set(fashionAccs.map((a) => String(a.id)));
    const perStore = new Map();
    const sorted = list
      .filter((it) => {
        const aid = String(it.accountId || '');
        if (!fashionIds.has(aid)) {
          /* منتج أزياء من محل غير مُصنَّف موضة صراحةً — اقبله إن بدا أزياء */
          const acc = accById.get(aid);
          if (!acc || !isStoreAccount(acc)) return false;
          return looksLikeFashionProduct(it);
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    for (const it of sorted) {
      const aid = String(it.accountId || '');
      const n = perStore.get(aid) || 0;
      if (n >= 4) continue;
      perStore.set(aid, n + 1);
      const seller = accById.get(aid);
      const gate = await gateOf(aid, seller && seller.type);
      const diamond = await diamondOf(aid);
      items.push(toPublicCatalogGated(it, gate, seller, {
        diamondActive: diamond,
        href: 'rizq_store.html?id=' + encodeURIComponent(aid) + '&product=' + encodeURIComponent(it.id),
      }));
      if (items.length >= limit) break;
    }
  } else if (section === 'showrooms') {
    const srmCat = SRM_CAT_FILTERS[cat] ? cat : 'cars';
    const sorted = list
      .filter((it) => matchesShowroomCat(it, srmCat))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    for (const it of sorted) {
      const aid = String(it.accountId || '');
      const seller = accById.get(aid);
      const gate = await gateOf(aid, seller && seller.type);
      const diamond = await diamondOf(aid);
      items.push(toPublicCatalogGated(it, gate, seller, {
        diamondActive: diamond,
        href: 'rizq_showroom.html?id=' + encodeURIComponent(aid),
      }));
      if (items.length >= limit) break;
    }
  } else {
    /* stores — غير الأزياء، منتجان لكل محل خلال 24 ساعة، أولوية ماسية */
    const cutoff = Date.now() - 24 * 3600 * 1000;
    const perStore = new Map();
    const candidates = [];
    for (const it of list) {
      const aid = String(it.accountId || '');
      const seller = accById.get(aid);
      if (!seller || !isStoreAccount(seller)) continue;
      if (isFashionStore(seller) || looksLikeFashionProduct(it)) continue;
      const created = new Date(it.createdAt || 0).getTime();
      if (!Number.isFinite(created) || created < cutoff) continue;
      const n = perStore.get(aid) || 0;
      if (n >= 2) continue;
      perStore.set(aid, n + 1);
      const diamond = await diamondOf(aid);
      candidates.push({ it, seller, diamond, created });
    }
    candidates.sort((a, b) => {
      if (a.diamond !== b.diamond) return a.diamond ? -1 : 1;
      return b.created - a.created;
    });
    for (const row of candidates) {
      const aid = String(row.it.accountId || '');
      const gate = await gateOf(aid, row.seller && row.seller.type);
      const storeName = String(row.seller.name || '').slice(0, 40);
      items.push(toPublicCatalogGated(row.it, gate, row.seller, {
        diamondActive: row.diamond,
        homeBadge: storeName ? ('جديد من ' + storeName) : 'جديد',
        href: 'rizq_store.html?id=' + encodeURIComponent(aid) + '&product=' + encodeURIComponent(row.it.id),
      }));
      if (items.length >= limit) break;
    }
  }

  const payload = {
    ok: true,
    section,
    cat: section === 'showrooms' ? (SRM_CAT_FILTERS[cat] ? cat : 'cars') : (cat || null),
    limit,
    items,
    total: items.length,
  };
  _setCached(cacheKey, payload);
  return Object.assign({ cached: false }, payload);
}

module.exports = {
  buildHomeCatalog,
  clearHomeCatalogCache,
  isFashionStore,
  matchesShowroomCat,
  HOME_CACHE_TTL_MS,
};
