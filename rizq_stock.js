/**
 * rizq_stock.js — عرض واستقطاع مخزون المحلات/المعارض
 * قواعد العرض للزائر:
 *   > 5  → «موجود في الاستوك» (بدون رقم)
 *   1–5  → «متبقي N فقط»
 *   0    → «نفذ من المخزون»
 * مخزون المقاسات (اختياري): product.sizeStock = { S: 20, M: 10, … }
 *   — المجموع = stock الظاهر؛ عند البيع يُنقص القياس المختار ثم يُحدَّث المجموع.
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

  /** تطبيع خريطة مخزون المقاسات: { "S": 20, "M": 10 } */
  function normalizeSizeStock(raw) {
    if (!raw) return null;
    var obj = raw;
    if (typeof raw === 'string') {
      try { obj = JSON.parse(raw); } catch (e) { return null; }
    }
    if (typeof obj !== 'object' || Array.isArray(obj)) return null;
    var out = {};
    var keys = Object.keys(obj);
    var has = false;
    for (var i = 0; i < keys.length; i++) {
      var k = String(keys[i] || '').trim();
      if (!k) continue;
      var n = parseStock(obj[keys[i]]);
      if (n == null) n = 0;
      out[k] = n;
      has = true;
    }
    return has ? out : null;
  }

  function sumSizeStock(map) {
    map = normalizeSizeStock(map);
    if (!map) return null;
    var t = 0;
    Object.keys(map).forEach(function (k) { t += map[k] || 0; });
    return t;
  }

  /** كمية متبقية لقياس/خيار واحد */
  function sizeQty(product, sizeValue) {
    if (!product) return null;
    var map = normalizeSizeStock(product.sizeStock);
    if (!map) return null;
    var key = String(sizeValue == null ? '' : sizeValue).trim();
    if (!key) return null;
    if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
    /* تطابق مرن: S vs s، أو "مقاس 45" vs "45" */
    var lower = key.toLowerCase();
    var found = null;
    Object.keys(map).forEach(function (k) {
      if (found != null) return;
      if (String(k).toLowerCase() === lower) found = map[k];
      else if (String(k).replace(/^[^\d]*/, '') === key.replace(/^[^\d]*/, '') && /\d/.test(key)) found = map[k];
    });
    return found;
  }

  function hasSizeStock(product) {
    return !!normalizeSizeStock(product && product.sizeStock);
  }

  /** تسمية مخزون حسب القياس المختار (إن وُجد) وإلا المخزون الإجمالي */
  function buyerLabelForSelection(product, selected, fr) {
    if (fr == null) fr = langIsFr();
    if (!product) return null;
    var map = normalizeSizeStock(product.sizeStock);
    if (map && selected && typeof selected === 'object') {
      var sizeVal = selected.size || selected.weight || selected.volume || selected.storage || selected.option
        || selected[Object.keys(selected)[0]];
      if (sizeVal != null && String(sizeVal).trim() !== '') {
        var q = sizeQty(product, sizeVal);
        if (q != null) {
          var lab = buyerLabel(q, fr);
          if (lab && lab.level === 'low') {
            lab.text = fr
              ? ('Taille ' + sizeVal + ' : il reste ' + q)
              : (sizeVal + ' متبقي ' + q);
          } else if (lab && lab.level === 'out') {
            lab.text = fr
              ? ('Taille ' + sizeVal + ' : rupture')
              : (sizeVal + ' — نفذ');
          } else if (lab && lab.level === 'in') {
            lab.text = fr
              ? ('Taille ' + sizeVal + ' : en stock')
              : (sizeVal + ' — موجود في الاستوك');
          }
          return lab;
        }
      }
    }
    var total = map ? sumSizeStock(map) : parseStock(product.stock);
    return buyerLabel(total, fr);
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

  /** نص مختصر لبطاقات الشبكة — النص الطويل يغطي صورة المنتج على الهاتف */
  function buyerBadgeShort(raw, fr) {
    if (fr == null) fr = langIsFr();
    var n = parseStock(raw);
    if (n == null) return null;
    if (n <= 0) return { text: fr ? 'Épuisé' : 'نفد', level: 'out', qty: 0 };
    if (n <= LOW) return { text: fr ? ('×' + n) : ('متبقي ' + n), level: 'low', qty: n };
    return { text: fr ? 'En stock' : 'متوفر', level: 'in', qty: n };
  }

  /** شارة HTML مختصرة لبطاقات المنتجات */
  function buyerBadgeHtml(raw, fr) {
    var info = buyerBadgeShort(raw, fr);
    if (!info) return '';
    var bg = info.level === 'out'
      ? 'background:#9aa;color:#fff'
      : info.level === 'low'
        ? 'background:rgba(217,119,6,.92);color:#fff'
        : 'background:rgba(22,163,74,.9);color:#fff';
    return '<span class="rizq-stock-badge product-tag" data-stock-level="' + info.level + '" style="' + bg + '">'
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

  function stripCartLineId(raw) {
    var id = String(raw || '');
    id = id.replace(/__v_.*$/, '');
    id = id.replace(/^store-prod-/, '').replace(/^showroom-/, '');
    if (id.charAt(0) === 'B') id = id.slice(1);
    return id;
  }

  function matchIndex(products, item) {
    if (!products.length || !item) return -1;
    // فضّل productId النظيف ثم strip من id السلة (store-prod- / showroom- / __v_)
    var preferred = String(item.productId || '').trim();
    var id = preferred || stripCartLineId(item.id);
    var rawLine = String(item.id || '');
    // store-prod-N → فهرس 1-based من واجهة المحل (legacy)
    var m = rawLine.match(/^store-prod-(\d+)(?:__v_.*)?$/);
    if (m) {
      var idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < products.length) return idx;
    }
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (!p) continue;
      if (String(p.id) === id || String(p._id) === id || String(p.sku) === id) return i;
      if (preferred && (String(p.id) === preferred || String(p._id) === preferred)) return i;
      if (rawLine && (String(p.id) === rawLine || String(p._id) === rawLine)) return i;
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
    var map = normalizeSizeStock(product.sizeStock);
    if (map) body.sizeStock = map;
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

  function selectedSizeFromItem(item) {
    if (!item) return '';
    if (item.selected && typeof item.selected === 'object') {
      return item.selected.size || item.selected.weight || item.selected.volume
        || item.selected.storage || item.selected.option
        || item.selected[Object.keys(item.selected)[0]] || '';
    }
    if (item.variantLabel) {
      var m = String(item.variantLabel).match(/:\s*([^·|]+)/);
      if (m) return m[1].trim();
    }
    return '';
  }

  /**
   * استقطاع كمية من مخزون محل/معرض بعد طلب/بيع.
   * إن وُجد sizeStock والقياس المختار — يُنقص ذلك القياس ثم يُحدَّث المجموع.
   * @returns {{ok:boolean, left:number|null, sizeLeft:number|null}}
   */
  function decrement(accountId, item, qty, kind) {
    kind = kind || 'store';
    qty = Math.max(1, parseInt(qty, 10) || 1);
    if (!accountId) return { ok: false, left: null, sizeLeft: null };
    var products = readProducts(accountId, kind);
    var idx = matchIndex(products, item);
    if (idx < 0) return { ok: false, left: null, sizeLeft: null };
    var p = products[idx];
    var map = normalizeSizeStock(p.sizeStock);
    var sizeKey = selectedSizeFromItem(item);
    var sizeLeft = null;

    if (map && sizeKey) {
      var resolved = null;
      var lower = String(sizeKey).toLowerCase();
      Object.keys(map).forEach(function (k) {
        if (resolved) return;
        if (String(k) === String(sizeKey) || String(k).toLowerCase() === lower) resolved = k;
      });
      if (!resolved) resolved = sizeKey;
      if (!Object.prototype.hasOwnProperty.call(map, resolved)) map[resolved] = 0;
      map[resolved] = Math.max(0, (map[resolved] || 0) - qty);
      sizeLeft = map[resolved];
      p.sizeStock = map;
      var nextSum = sumSizeStock(map);
      p.stock = nextSum;
      p.sold = (Number(p.sold) || 0) + qty;
      if (nextSum <= 0) p.status = 'out';
      else if (nextSum <= LOW) p.status = 'limited';
      else if (p.status === 'out' || p.status === 'limited') p.status = 'available';
      products[idx] = p;
      writeProducts(accountId, kind, products);
      patchCatalogStock(accountId, p, nextSum);
      return { ok: true, left: nextSum, sizeLeft: sizeLeft };
    }

    var cur = parseStock(p.stock);
    if (cur == null) return { ok: false, left: null, sizeLeft: null };
    var next = Math.max(0, cur - qty);
    p.stock = next;
    p.sold = (Number(p.sold) || 0) + qty;
    if (next <= 0) p.status = 'out';
    else if (next <= LOW) p.status = 'limited';
    else if (p.status === 'out' || p.status === 'limited') p.status = 'available';
    products[idx] = p;
    writeProducts(accountId, kind, products);
    patchCatalogStock(accountId, p, next);
    return { ok: true, left: next, sizeLeft: null };
  }

  /** يبني sizeStock من قائمة مقاسات + كميات؛ يعيد أيضاً المجموع */
  function buildSizeStock(pairs) {
    var map = {};
    var has = false;
    (pairs || []).forEach(function (row) {
      var k = String((row && row.size) || '').trim();
      if (!k) return;
      var n = parseStock(row.qty);
      if (n == null) n = 0;
      map[k] = n;
      has = true;
    });
    if (!has) return { sizeStock: null, stock: null };
    return { sizeStock: map, stock: sumSizeStock(map) };
  }

  /** استقطاع لكل عناصر سلة مرتبطة بمحل */
  function decrementCartItems(cartItems) {
    if (!Array.isArray(cartItems)) return [];
    var results = [];
    cartItems.forEach(function (c) {
      var accountId = c.storeId || c.accountId || '';
      if (!accountId) return;
      var mod = String(c.module || c.kind || '').toLowerCase();
      var kind = (mod === 'corp' || mod === 'showroom') ? 'corp' : 'store';
      var r = decrement(accountId, c, c.qty || 1, kind);
      results.push({ id: c.id, accountId: accountId, ok: r.ok, left: r.left });
    });
    return results;
  }

  global.RizqStock = {
    LOW: LOW,
    parse: parseStock,
    buyerLabel: buyerLabel,
    buyerLabelForSelection: buyerLabelForSelection,
    buyerBadgeShort: buyerBadgeShort,
    buyerBadgeHtml: buyerBadgeHtml,
    normalizeSizeStock: normalizeSizeStock,
    sumSizeStock: sumSizeStock,
    sizeQty: sizeQty,
    hasSizeStock: hasSizeStock,
    buildSizeStock: buildSizeStock,
    selectedSizeFromItem: selectedSizeFromItem,
    decrement: decrement,
    decrementCartItems: decrementCartItems
  };
})(typeof window !== 'undefined' ? window : this);
