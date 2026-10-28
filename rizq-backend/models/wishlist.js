/**
 * Wishlist — async PostgreSQL
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

async function listIds(buyerId) {
  const rows = await sql.query(
    `SELECT item_id FROM wishlist_items
     WHERE buyer_id = ?
     ORDER BY added_at DESC`,
    [buyerId]
  );
  return rows.map((r) => r.item_id);
}

async function replaceAll(buyerId, ids) {
  const clean = normalizeIds(ids);
  await sql.withTransaction(async (tx) => {
    await tx.execute('DELETE FROM wishlist_items WHERE buyer_id = ?', [buyerId]);
    const now = new Date().toISOString();
    for (const itemId of clean) {
      await tx.execute(
        `INSERT INTO wishlist_items (buyer_id, item_id, added_at) VALUES (?, ?, ?)
         ON CONFLICT (buyer_id, item_id) DO UPDATE SET added_at = EXCLUDED.added_at`,
        [buyerId, itemId, now]
      );
    }
  });
  return clean;
}

async function mergeIds(buyerId, ids) {
  const incoming = normalizeIds(ids);
  const existing = new Set(await listIds(buyerId));
  const now = new Date().toISOString();
  for (const itemId of incoming) {
    if (!existing.has(itemId)) {
      await sql.execute(
        `INSERT INTO wishlist_items (buyer_id, item_id, added_at) VALUES (?, ?, ?)
         ON CONFLICT (buyer_id, item_id) DO NOTHING`,
        [buyerId, itemId, now]
      );
      existing.add(itemId);
    }
  }
  return listIds(buyerId);
}

async function addItem(buyerId, itemId) {
  const id = String(itemId).trim().slice(0, 80);
  if (!id) {
    const err = new Error('item_id مطلوب');
    err.status = 400;
    err.code = 'ITEM_REQUIRED';
    throw err;
  }
  const now = new Date().toISOString();
  await sql.execute(
    `INSERT INTO wishlist_items (buyer_id, item_id, added_at) VALUES (?, ?, ?)
     ON CONFLICT (buyer_id, item_id) DO UPDATE SET added_at = EXCLUDED.added_at`,
    [buyerId, id, now]
  );
  return listIds(buyerId);
}

async function removeItem(buyerId, itemId) {
  await sql.execute(
    'DELETE FROM wishlist_items WHERE buyer_id = ? AND item_id = ?',
    [buyerId, String(itemId).trim().slice(0, 80)]
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
