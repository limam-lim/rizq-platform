/**
 * Wishlist — PostgreSQL sync
 */
'use strict';

const sql = require('../db/sql');
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
  return sql.querySync(
    'SELECT item_id FROM wishlist_items WHERE buyer_id = ? ORDER BY added_at DESC',
    [buyerId]
  ).map((r) => r.item_id);
}

function replaceAll(buyerId, ids) {
  const clean = normalizeIds(ids);
  sql.withTransactionSync((tx) => {
    tx.execute('DELETE FROM wishlist_items WHERE buyer_id = ?', [buyerId]);
    const now = new Date().toISOString();
    clean.forEach((itemId) => {
      tx.execute(
        `INSERT INTO wishlist_items (buyer_id, item_id, added_at) VALUES (?, ?, ?)
         ON CONFLICT (buyer_id, item_id) DO UPDATE SET added_at = EXCLUDED.added_at`,
        [buyerId, itemId, now]
      );
    });
  });
  return clean;
}

function mergeIds(buyerId, ids) {
  const incoming = normalizeIds(ids);
  const existing = new Set(listIds(buyerId));
  const now = new Date().toISOString();
  incoming.forEach((itemId) => {
    if (existing.has(itemId)) return;
    sql.executeSync(
      `INSERT INTO wishlist_items (buyer_id, item_id, added_at) VALUES (?, ?, ?)
       ON CONFLICT (buyer_id, item_id) DO NOTHING`,
      [buyerId, itemId, now]
    );
    existing.add(itemId);
  });
  return listIds(buyerId);
}

function addItem(buyerId, itemId) {
  const id = String(itemId).trim().slice(0, 80);
  if (!id) {
    const err = new Error('item_id مطلوب');
    err.status = 400; err.code = 'ITEM_REQUIRED'; throw err;
  }
  sql.executeSync(
    `INSERT INTO wishlist_items (buyer_id, item_id, added_at) VALUES (?, ?, ?)
     ON CONFLICT (buyer_id, item_id) DO UPDATE SET added_at = EXCLUDED.added_at`,
    [buyerId, id, new Date().toISOString()]
  );
  return listIds(buyerId);
}

function removeItem(buyerId, itemId) {
  sql.executeSync(
    'DELETE FROM wishlist_items WHERE buyer_id = ? AND item_id = ?',
    [buyerId, String(itemId).trim().slice(0, 80)]
  );
  return listIds(buyerId);
}

module.exports = {
  MAX_ITEMS, normalizeIds, listIds, replaceAll, mergeIds, addItem, removeItem,
};
