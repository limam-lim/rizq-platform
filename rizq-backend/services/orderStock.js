/**
 * حجز/استرجاع مخزون الكتالوج عند إنشاء/إلغاء الطلب
 * إن لم يوجد المنتج في الكتالوج الخادم نتخطّاه (منتجات محلية فقط).
 * الحجز ذرّي عبر قفل ملف + إعادة قراءة داخل القسم الحرج.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const LOCK_FILE = path.join(__dirname, '..', 'data', '.order-stock.lock');
const LOCK_STALE_MS = 30_000;
const LOCK_MAX_ATTEMPTS = 50;
const LOCK_WAIT_MS = 20;

function parseStock(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.floor(n));
}

function cleanProductId(raw) {
  let id = String(raw || '').trim();
  id = id.replace(/__v_.*$/, '');
  id = id.replace(/^store-prod-/, '').replace(/^showroom-/, '');
  if (id.charAt(0) === 'B') id = id.slice(1);
  return id;
}

function selectedSize(meta) {
  if (!meta || typeof meta !== 'object') return '';
  const sel = meta.selected;
  if (sel && typeof sel === 'object') {
    return String(
      sel.size || sel.weight || sel.volume || sel.storage || sel.option
      || sel[Object.keys(sel)[0]] || ''
    ).trim();
  }
  if (meta.variantLabel) {
    const m = String(meta.variantLabel).match(/:\s*([^·|]+)/);
    if (m) return m[1].trim();
  }
  return '';
}

function findIndex(list, productId, sellerId) {
  const pid = String(productId);
  let idx = list.findIndex((it) => it && String(it.id) === pid
    && (!sellerId || String(it.accountId || it.storeId || '') === String(sellerId)));
  if (idx >= 0) return idx;
  return list.findIndex((it) => it && String(it.id) === pid);
}

function applyDelta(item, qty, sizeKey, direction) {
  const delta = direction === 'restore' ? qty : -qty;
  const map = (item.sizeStock && typeof item.sizeStock === 'object' && !Array.isArray(item.sizeStock))
    ? Object.assign({}, item.sizeStock)
    : null;

  if (map && sizeKey) {
    let resolved = null;
    const lower = sizeKey.toLowerCase();
    Object.keys(map).forEach((k) => {
      if (resolved) return;
      if (String(k) === sizeKey || String(k).toLowerCase() === lower) resolved = k;
    });
    if (!resolved) resolved = sizeKey;
    const curSize = parseStock(map[resolved]);
    const nextSize = Math.max(0, (curSize == null ? 0 : curSize) + delta);
    if (direction !== 'restore' && (curSize == null ? 0 : curSize) < qty) {
      const err = new Error('المخزون غير كافٍ للمقاس «' + sizeKey + '»');
      err.status = 409;
      err.code = 'OUT_OF_STOCK';
      err.productId = item.id;
      throw err;
    }
    map[resolved] = nextSize;
    item.sizeStock = map;
    const sum = Object.keys(map).reduce((s, k) => s + (parseStock(map[k]) || 0), 0);
    item.stock = String(sum);
    item.sold = Math.max(0, (Number(item.sold) || 0) - delta);
    if (sum <= 0) item.status = item.status === 'removed' ? item.status : 'inactive';
    return { left: sum, sizeLeft: nextSize };
  }

  const cur = parseStock(item.stock);
  if (cur == null) {
    // مخزون غير محدود / غير مضبوط — لا نحجز
    return { left: null, sizeLeft: null, skipped: true };
  }
  if (direction !== 'restore' && cur < qty) {
    const err = new Error('المخزون غير كافٍ لـ «' + (item.name || item.id) + '»');
    err.status = 409;
    err.code = 'OUT_OF_STOCK';
    err.productId = item.id;
    err.available = cur;
    throw err;
  }
  const next = Math.max(0, cur + delta);
  item.stock = String(next);
  item.sold = Math.max(0, (Number(item.sold) || 0) - delta);
  return { left: next, sizeLeft: null };
}

function sleepSync(ms) {
  try {
    const sab = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(sab), 0, 0, ms);
  } catch (e) {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* spin */ }
  }
}

/**
 * قفل حصري عبر ملف (wx) مع مهلة وإزالة القفل الميت.
 * يضمن تسلسل read→modify→write بين طلبات متزامنة / عمليات متعددة.
 */
function withCatalogStockLock(fn) {
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  let fd = null;
  for (let attempt = 0; attempt < LOCK_MAX_ATTEMPTS; attempt += 1) {
    try {
      fd = fs.openSync(LOCK_FILE, 'wx');
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      try {
        const st = fs.statSync(LOCK_FILE);
        if (Date.now() - st.mtimeMs > LOCK_STALE_MS) {
          fs.unlinkSync(LOCK_FILE);
          continue;
        }
      } catch (statErr) {
        /* ignore */
      }
      sleepSync(LOCK_WAIT_MS);
    }
  }
  if (fd == null) {
    const err = new Error('تعذّر قفل مخزون الكتالوج — أعد المحاولة');
    err.status = 503;
    err.code = 'STOCK_LOCK_BUSY';
    throw err;
  }
  try {
    return fn();
  } finally {
    try { fs.closeSync(fd); } catch (e) { /* ignore */ }
    try { fs.unlinkSync(LOCK_FILE); } catch (e) { /* ignore */ }
  }
}

/**
 * @returns {{ reserved: Array, skipped: Array }}
 */
function reserveForOrder({ sellerId, items }, { readCatalog, writeCatalog }) {
  if (typeof readCatalog !== 'function' || typeof writeCatalog !== 'function') {
    return { reserved: [], skipped: items || [], detail: 'catalog_unavailable' };
  }

  return withCatalogStockLock(() => {
    const list = (readCatalog() || []).slice();
    const reserved = [];
    const skipped = [];
    const lines = Array.isArray(items) ? items : [];

    // مرحلة تحقق ثم تطبيق — تفادي حجز جزئي
    const plan = [];
    lines.forEach((it) => {
      const productId = cleanProductId(it.productId || it.id);
      const qty = Math.max(1, Math.min(999, Number(it.qty) || 1));
      if (!productId) {
        skipped.push({ reason: 'no_id', item: it });
        return;
      }
      const idx = findIndex(list, productId, sellerId);
      if (idx < 0) {
        skipped.push({ reason: 'not_in_catalog', productId, qty });
        return;
      }
      plan.push({ idx, qty, sizeKey: selectedSize(it.meta), productId });
    });

    // تحقّق مسبق دون كتابة
    plan.forEach((p) => {
      const probe = Object.assign({}, list[p.idx]);
      if (probe.sizeStock && typeof probe.sizeStock === 'object') {
        probe.sizeStock = Object.assign({}, probe.sizeStock);
      }
      applyDelta(probe, p.qty, p.sizeKey, 'reserve');
    });

    plan.forEach((p) => {
      const item = Object.assign({}, list[p.idx]);
      if (item.sizeStock && typeof item.sizeStock === 'object') {
        item.sizeStock = Object.assign({}, item.sizeStock);
      }
      const result = applyDelta(item, p.qty, p.sizeKey, 'reserve');
      item.updatedAt = new Date().toISOString();
      list[p.idx] = item;
      reserved.push({
        productId: p.productId,
        qty: p.qty,
        sizeKey: p.sizeKey || '',
        left: result.left,
        skipped: !!result.skipped,
      });
    });

    if (reserved.some((r) => !r.skipped)) {
      writeCatalog(list);
    }
    return { reserved, skipped };
  });
}

function restoreForOrder(order, { readCatalog, writeCatalog }) {
  if (!order || !Array.isArray(order.items) || !order.items.length) {
    return { restored: [] };
  }
  if (typeof readCatalog !== 'function' || typeof writeCatalog !== 'function') {
    return { restored: [], detail: 'catalog_unavailable' };
  }
  return withCatalogStockLock(() => {
    const list = (readCatalog() || []).slice();
    const restored = [];
    order.items.forEach((it) => {
      const productId = cleanProductId(it.productId || it.id);
      const qty = Math.max(1, Number(it.qty) || 1);
      const idx = findIndex(list, productId, order.sellerId);
      if (idx < 0) return;
      const item = Object.assign({}, list[idx]);
      if (item.sizeStock && typeof item.sizeStock === 'object') {
        item.sizeStock = Object.assign({}, item.sizeStock);
      }
      const result = applyDelta(item, qty, selectedSize(it.meta), 'restore');
      item.updatedAt = new Date().toISOString();
      list[idx] = item;
      restored.push({ productId, qty, left: result.left });
    });
    if (restored.length) writeCatalog(list);
    return { restored };
  });
}

module.exports = {
  parseStock,
  cleanProductId,
  withCatalogStockLock,
  reserveForOrder,
  restoreForOrder,
};
