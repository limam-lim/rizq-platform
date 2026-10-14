/**
 * Wishlist — معرّفات إعلانات/منتجات محفوظة لكل مشترٍ
 */
const { db } = require('../db');

const MAX_ITEMS = 500;

function normalizeIds(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  raw.forEach((x) => {
    const id = String(x).trim().slice(0, 80);
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  });
  return out.slice(0, MAX_ITEMS);
}

function listIds(buyerId) {
  return db.prepare(`
    SELECT item_id FROM wishlist_items
    WHERE buyer_id = ?
    ORDER BY added_at DESC
  `).all(buyerId).map((r) => r.item_id);
}

function replaceAll(buyerId, ids) {
  const clean = normalizeIds(ids);
  const tx = db.transaction((bid, items) => {
    db.prepare('DELETE FROM wishlist_items WHERE buyer_id = ?').run(bid);
    const ins = db.prepare(`
      INSERT INTO wishlist_items (buyer_id, item_id, added_at) VALUES (?, ?, ?)
    `);
    const now = new Date().toISOString();
    items.forEach((itemId) => ins.run(bid, itemId, now));
  });
  tx(buyerId, clean);
  return clean;
}

function mergeIds(buyerId, ids) {
  const incoming = normalizeIds(ids);
  const existing = new Set(listIds(buyerId));
  const now = new Date().toISOString();
  const ins = db.prepare(`
    INSERT OR IGNORE INTO wishlist_items (buyer_id, item_id, added_at) VALUES (?, ?, ?)
  `);
  incoming.forEach((itemId) => {
    if (!existing.has(itemId)) {
      ins.run(buyerId, itemId, now);
      existing.add(itemId);
    }
  });
  return listIds(buyerId);
}

function addItem(buyerId, itemId) {
  const id = String(itemId).trim().slice(0, 80);
  if (!id) {
    const err = new Error('item_id مطلوب');
    err.status = 400;
    err.code = 'ITEM_REQUIRED';
    throw err;
  }
  db.prepare(`
    INSERT OR REPLACE INTO wishlist_items (buyer_id, item_id, added_at) VALUES (?, ?, ?)
  `).run(buyerId, id, new Date().toISOString());
  return listIds(buyerId);
}

function removeItem(buyerId, itemId) {
  db.prepare('DELETE FROM wishlist_items WHERE buyer_id = ? AND item_id = ?').run(
    buyerId, String(itemId).trim().slice(0, 80)
  );
  return listIds(buyerId);
}

module.exports = {
  MAX_ITEMS,
  normalizeIds,
  listIds,
  replaceAll,
  mergeIds,
  addItem,
  removeItem,
};
