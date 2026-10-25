/**
 * GET /api/search/unified?q=...
 * بحث موحّد خفيف عبر الإعلانات والمنتجات والحسابات
 */
'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { asyncHandler } = require('../middleware/errors');

const router = express.Router();
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'طلبات بحث كثيرة', code: 'RATE_LIMIT' },
});

let _deps = {
  readAds: () => [],
  readAccounts: () => [],
  listCatalog: () => [],
};

function configureSearchRoutes(deps) {
  if (deps) _deps = Object.assign({}, _deps, deps);
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

function scoreText(q, parts) {
  const hay = norm(parts.filter(Boolean).join(' '));
  if (!hay) return 0;
  if (hay.indexOf(q) >= 0) return 10 + Math.min(5, q.length);
  const tokens = q.split(/\s+/).filter(Boolean);
  let s = 0;
  tokens.forEach((t) => { if (hay.indexOf(t) >= 0) s += 3; });
  return s;
}

function cardFromAd(ad, score) {
  return {
    type: 'ad',
    id: ad.id,
    title: ad.title || ad.titleAr || ad.name || 'إعلان',
    subtitle: ad.city || ad.wilaya || ad.category || '',
    price: ad.price || ad.amount || '',
    currency: ad.currency || 'MRU',
    thumb: ad.thumb || ad.image || (Array.isArray(ad.images) ? ad.images[0] : '') || '',
    href: 'rizq_browse.html?id=' + encodeURIComponent(ad.id),
    score,
  };
}

function cardFromProduct(p, score) {
  const sellerId = p.accountId || p.storeId || p.sellerId || '';
  return {
    type: 'product',
    id: p.id,
    title: p.title || p.name || 'منتج',
    subtitle: p.storeName || p.category || '',
    price: p.price || p.salePrice || '',
    currency: p.currency || 'MRU',
    thumb: p.thumb || p.image || '',
    href: sellerId
      ? ('rizq_store.html?id=' + encodeURIComponent(sellerId) + '&product=' + encodeURIComponent(p.id))
      : 'rizq_products.html',
    score,
  };
}

function cardFromAccount(a, score) {
  const type = a.type || 'store';
  const page = ({
    store: 'rizq_store.html',
    office: 'rizq_office.html',
    corp: 'rizq_corp.html',
    estate: 'rizq_estate.html',
    individual: 'rizq_profile.html',
  })[type] || 'rizq_directory.html';
  return {
    type: type === 'estate' ? 'estate' : (type === 'office' || type === 'corp' ? 'service' : 'store'),
    id: a.id,
    title: a.name || a.owner || a.manager || 'حساب',
    subtitle: a.city || a.category || a.tagline || type,
    price: '',
    currency: '',
    thumb: a.thumb || a.cover || '',
    href: page + '?id=' + encodeURIComponent(a.id),
    score,
  };
}

router.get('/unified', limiter, asyncHandler(async (req, res) => {
  const qRaw = String(req.query.q || req.query.query || '').trim();
  const q = norm(qRaw);
  const limit = Math.min(40, Math.max(5, Number(req.query.limit) || 24));
  if (!q || q.length < 2) {
    return res.json({ ok: true, q: qRaw, results: [], hint: 'أدخل كلمتين على الأقل' });
  }

  const results = [];
  const ads = (typeof _deps.readAds === 'function' ? _deps.readAds() : []) || [];
  ads.forEach((ad) => {
    if (!ad || ad.status === 'rejected' || ad.hidden) return;
    const s = scoreText(q, [ad.title, ad.titleAr, ad.titleFr, ad.desc, ad.description, ad.city, ad.category, ad.brand]);
    if (s > 0) results.push(cardFromAd(ad, s));
  });

  const catalog = (typeof _deps.listCatalog === 'function' ? _deps.listCatalog() : []) || [];
  catalog.forEach((p) => {
    if (!p) return;
    const s = scoreText(q, [p.title, p.name, p.desc, p.description, p.category, p.brand, p.storeName]);
    if (s > 0) results.push(cardFromProduct(p, s));
  });

  const accounts = ((typeof _deps.readAccounts === 'function' ? _deps.readAccounts() : []) || [])
    .filter((a) => a && a.status === 'approved' && !a.suspended);
  accounts.forEach((a) => {
    const s = scoreText(q, [a.name, a.owner, a.manager, a.desc, a.tagline, a.city, a.category, a.type]);
    if (s > 0) results.push(cardFromAccount(a, s));
  });

  results.sort((a, b) => b.score - a.score);
  res.set('Cache-Control', 'public, max-age=30');
  res.json({
    ok: true,
    q: qRaw,
    count: Math.min(limit, results.length),
    results: results.slice(0, limit),
  });
}));

module.exports = router;
module.exports.configureSearchRoutes = configureSearchRoutes;
