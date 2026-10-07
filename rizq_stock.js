/**
 * rizq_stock.js — عرض واستقطاع مخزون المحلات/المعارض
 * قواعد العرض للزائر:
 *   > 5  → «موجود في الاستوك» (بدون رقم)
 *   1–5  → «متبقي N فقط»
 *   0    → «نفذ من المخزون»
 */
(function (global) {
  'use strict';

  var LOW = 5;

  function langIsFr() {
    try {
      if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') {
        return global.RizqI18n.getLang() === 'fr';
      }
      return (localStorage.getItem('rizq_lang') || 'ar') === 'fr';
    } catch (e) {
      return false;
    }
  }

  function parseStock(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === '') return null;
    var n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
  }

  /** تسمية للمشتري */
  function buyerLabel(raw, fr) {
    if (fr == null) fr = langIsFr();
    var n = parseStock(raw);
    if (n == null) return null;
    if (n <= 0) return { text: fr ? 'Rupture de stock' : 'نفذ من المخزون', level: 'out', qty: 0 };
    if (n <= LOW) return { text: fr ? ('Il ne reste que ' + n) : ('متبقي ' + n + ' فقط'), level: 'low', qty: n };
    return { text: fr ? 'Disponible en stock' : 'موجود في الاستوك', level: 'in', qty: n };
  }

  /** شارة HTML مختصرة لبطاقات المنتجات */
  function buyerBadgeHtml(raw, fr) {
    var info = buyerLabel(raw, fr);
    if (!info) return '';
    var bg = info.level === 'out'
      ? 'background:#9aa;color:#fff'
      : info.level === 'low'
        ? 'background:rgba(217,119,6,.92);color:#fff'
        : 'background:rgba(22,163,74,.9);color:#fff';
    return '<span class="rizq-stock-badge product-tag" style="' + bg + ';font-size:10px;font-weight:800;padding:3px 8px;border-radius:8px">'
      + (info.level === 'out' ? '❌ ' : info.level === 'low' ? '⚡ ' : '📦 ')
      + info.text
      + '</span>';
  }

  function storageKey(accountId, kind) {
    if (kind === 'corp' || kind === 'showroom') return 'rizq_corp_prods_' + accountId;
    return 'store_products_' + accountId;
  }

  function readProducts(accountId, kind) {
    try {
      var arr = JSON.parse(localStorage.getItem(storageKey(accountId, kind)) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeProducts(accountId, kind, arr) {
    try {
      localStorage.setItem(storageKey(accountId, kind), JSON.stringify(arr));
      return true;
    } catch (e) {
      return false;
    }
  }

  function matchIndex(products, item) {
    if (!products.length || !item) return -1;
    var id = String(item.id || item.productId || '');
    // store-prod-N → فهرس 1-based من واجهة المحل
    var m = id.match(/^store-prod-(\d+)$/);
    if (m) {
      var idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < products.length) return idx;
    }
    // بطاقات مدمجة من API: id = "B" + catalogId
    var bare = id.charAt(0) === 'B' ? id.slice(1) : id;
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (!p) continue;
      if (String(p.id) === id || String(p._id) === id || String(p.sku) === id) return i;
      if (bare && (String(p.id) === bare || String(p._id) === bare)) return i;
    }
    if (item.name) {
      for (var j = 0; j < products.length; j++) {
        if (products[j] && products[j].name === item.name) return j;
      }
    }
    return -1;
  }

  function patchCatalogStock(accountId, product, newStock) {
    if (!global.RIZQ_BACKEND_BASE || !product || !product.id) return;
    var base = String(global.RIZQ_BACKEND_BASE).replace(/\/$/, '');
    var body = { stock: String(newStock) };
    if (product.status === 'out' || newStock <= 0) body.status = 'out';
    else if (newStock <= LOW) body.status = 'limited';
    else body.status = 'available';
    try {
      fetch(base + '/api/catalog/' + encodeURIComponent(product.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      }).catch(function () {});
    } catch (e) {}
  }

  /**
   * استقطاع كمية من مخزون محل/معرض بعد طلب/بيع.
   * @returns {{ok:boolean, left:number|null}}
   */
  function decrement(accountId, item, qty, kind) {
    kind = kind || 'store';
    qty = Math.max(1, parseInt(qty, 10) || 1);
    if (!accountId) return { ok: false, left: null };
    var products = readProducts(accountId, kind);
    var idx = matchIndex(products, item);
    if (idx < 0) return { ok: false, left: null };
    var p = products[idx];
    var cur = parseStock(p.stock);
    if (cur == null) return { ok: false, left: null };
    var next = Math.max(0, cur - qty);
    p.stock = next;
    p.sold = (Number(p.sold) || 0) + qty;
    if (next <= 0) p.status = 'out';
    else if (next <= LOW) p.status = 'limited';
    else if (p.status === 'out' || p.status === 'limited') p.status = 'available';
    products[idx] = p;
    writeProducts(accountId, kind, products);
    patchCatalogStock(accountId, p, next);
    return { ok: true, left: next };
  }

  /** استقطاع لكل عناصر سلة مرتبطة بمحل */
  function decrementCartItems(cartItems) {
    if (!Array.isArray(cartItems)) return [];
    var results = [];
    cartItems.forEach(function (c) {
      var accountId = c.storeId || c.accountId || '';
      if (!accountId) return;
      var kind = c.kind === 'corp' || c.kind === 'showroom' ? 'corp' : 'store';
      var r = decrement(accountId, c, c.qty || 1, kind);
      results.push({ id: c.id, accountId: accountId, ok: r.ok, left: r.left });
    });
    return results;
  }

  global.RizqStock = {
    LOW: LOW,
    parse: parseStock,
    buyerLabel: buyerLabel,
    buyerBadgeHtml: buyerBadgeHtml,
    decrement: decrement,
    decrementCartItems: decrementCartItems
  };
})(typeof window !== 'undefined' ? window : this);
