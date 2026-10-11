/**
 * rizq_store_topics.js — موضوعات المحل (فلاتر ديناميكية)
 * شكل الموضوع: { id, nameAr, nameFr, order, active }
 */
(function (global) {
  'use strict';
  var MAX = 30;
  var NAME_MAX = 80;

  function genId() {
    return 't_' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36);
  }

  function cleanName(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  }

  function normalizeOne(raw, i) {
    if (!raw || typeof raw !== 'object') return null;
    var nameAr = cleanName(raw.nameAr || raw.name_ar || raw.ar || raw.name || raw.cat || '');
    var nameFr = cleanName(raw.nameFr || raw.name_fr || raw.fr || '');
    if (!nameAr && !nameFr) return null;
    if (!nameAr) nameAr = nameFr;
    if (!nameFr) nameFr = nameAr;
    var id = String(raw.id || '').trim();
    if (!id || id.length > 48) id = genId();
    var order = Number(raw.order);
    if (!Number.isFinite(order)) order = i;
    return {
      id: id,
      nameAr: nameAr,
      nameFr: nameFr,
      order: Math.max(0, Math.min(999, Math.floor(order))),
      active: raw.active !== false && raw.active !== 0 && raw.active !== '0'
    };
  }

  function normalizeList(raw) {
    var arr = Array.isArray(raw) ? raw : [];
    var out = [];
    var seen = {};
    arr.forEach(function (item, i) {
      var t = normalizeOne(item, i);
      if (!t || seen[t.id]) return;
      seen[t.id] = true;
      out.push(t);
    });
    out.sort(function (a, b) { return a.order - b.order || a.nameAr.localeCompare(b.nameAr, 'ar'); });
    return out.slice(0, MAX);
  }

  function label(topic, fr) {
    if (!topic) return '';
    return fr ? (topic.nameFr || topic.nameAr || '') : (topic.nameAr || topic.nameFr || '');
  }

  function activeOrdered(list) {
    return normalizeList(list).filter(function (t) { return t.active; });
  }

  function findById(list, id) {
    if (!id) return null;
    var sid = String(id);
    var all = normalizeList(list);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === sid) return all[i];
    }
    return null;
  }

  function findByName(list, name) {
    var n = cleanName(name);
    if (!n) return null;
    var all = normalizeList(list);
    for (var i = 0; i < all.length; i++) {
      if (all[i].nameAr === n || all[i].nameFr === n) return all[i];
    }
    return null;
  }

  function matchProduct(topic, product) {
    if (!topic || !product) return false;
    if (product.topicId && String(product.topicId) === String(topic.id)) return true;
    var c = cleanName(product.cat);
    if (c && (c === topic.nameAr || c === topic.nameFr)) return true;
    return false;
  }

  /** موضوعات ظاهرة للمشتري: مفعّلة ولها منتج واحد على الأقل */
  function buyerTopics(storeTopics, products, fr) {
    var topics = activeOrdered(storeTopics);
    var prods = Array.isArray(products) ? products : [];
    var out = [];
    topics.forEach(function (t) {
      var count = 0;
      for (var i = 0; i < prods.length; i++) {
        if (matchProduct(t, prods[i])) count++;
      }
      if (!count) return;
      out.push({
        id: t.id,
        nameAr: t.nameAr,
        nameFr: t.nameFr,
        order: t.order,
        active: true,
        count: count,
        label: label(t, !!fr)
      });
    });
    // توافق قديم: منتجات بفئة نصية بلا موضوع مطابق
    if (!topics.length && prods.length) {
      var seen = {};
      prods.forEach(function (p) {
        var c = cleanName(p.cat);
        if (!c || seen[c]) return;
        seen[c] = true;
        var n = 0;
        prods.forEach(function (x) { if (cleanName(x.cat) === c) n++; });
        out.push({
          id: 'legacy:' + c,
          nameAr: c,
          nameFr: c,
          order: out.length,
          active: true,
          count: n,
          label: c,
          legacy: true
        });
      });
    }
    return out;
  }

  /** استنتاج قائمة موضوعات من فئات المنتجات الحالية (مرة واحدة عند الفراغ) */
  function seedFromProducts(products) {
    var seen = {};
    var out = [];
    (products || []).forEach(function (p) {
      var c = cleanName(p.cat);
      if (!c || seen[c]) return;
      seen[c] = true;
      out.push({ id: genId(), nameAr: c, nameFr: c, order: out.length, active: true });
    });
    return out.slice(0, MAX);
  }

  function resolveProductTopic(storeTopics, product) {
    if (!product) return null;
    if (product.topicId) {
      var byId = findById(storeTopics, product.topicId);
      if (byId) return byId;
    }
    return findByName(storeTopics, product.cat);
  }

  global.RizqStoreTopics = {
    MAX: MAX,
    NAME_MAX: NAME_MAX,
    genId: genId,
    normalizeList: normalizeList,
    label: label,
    activeOrdered: activeOrdered,
    findById: findById,
    findByName: findByName,
    matchProduct: matchProduct,
    buyerTopics: buyerTopics,
    seedFromProducts: seedFromProducts,
    resolveProductTopic: resolveProductTopic
  };
})(typeof window !== 'undefined' ? window : globalThis);
