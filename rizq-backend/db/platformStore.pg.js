/**
 * Platform store — PostgreSQL sync facade (accounts/ads/catalog/tenders).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('./engine');
const sql = require('./sql');
const { scrubSecretsForBackup } = require('../lib/scrubSecrets');

const DATA_DIR = engine.DATA_DIR;

function safeParse(raw, fallback) {
  if (raw == null) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    const v = JSON.parse(raw);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function encodeData(data) {
  return typeof data === 'string' ? data : JSON.stringify(data);
}

function readLegacyJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const v = JSON.parse(fs.readFileSync(file, 'utf8'));
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

function backupJson(file, data) {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const safe = scrubSecretsForBackup(data);
    fs.writeFileSync(file, JSON.stringify(safe, null, 2), 'utf8');
  } catch (e) {
    console.warn('[platform-store.pg] backup failed:', file, e.message);
  }
}

function runInTransaction(fn) {
  return sql.withTransactionSync(fn);
}

function accountRow(acc) {
  const id = String(acc && acc.id || '');
  if (!id) return null;
  return {
    id,
    type: String(acc.type || '').slice(0, 30),
    email: String(acc.email || '').trim().toLowerCase().slice(0, 120),
    status: String(acc.status || 'pending').slice(0, 40),
    nni: String(acc.nni || '').replace(/\D/g, '').slice(0, 20),
    suspended: acc.suspended ? 1 : 0,
    data: encodeData(acc),
    updated_at: String(acc.updatedAt || new Date().toISOString()),
  };
}

function adRow(ad) {
  const id = String(ad && ad.id || '');
  if (!id) return null;
  return {
    id,
    account_id: String(ad.accountId || '').slice(0, 60),
    status: String(ad.status || 'pending').slice(0, 40),
    category: String(ad.category || '').slice(0, 60),
    data: encodeData(ad),
    updated_at: String(ad.updatedAt || new Date().toISOString()),
  };
}

function catalogRow(item) {
  const id = String(item && item.id || '');
  if (!id) return null;
  return {
    id,
    account_id: String(item.accountId || '').slice(0, 60),
    status: String(item.status || 'pending_review').slice(0, 40),
    data: encodeData(item),
    updated_at: String(item.updatedAt || new Date().toISOString()),
  };
}

function tenderRow(t) {
  const id = String(t && t.id || '');
  if (!id) return null;
  return {
    id,
    account_id: String(t.accountId || '').slice(0, 60),
    status: String(t.status || 'pending_review').slice(0, 40),
    data: encodeData(t),
    updated_at: String(t.updatedAt || new Date().toISOString()),
  };
}

function upsertAccountSql(row, tx) {
  const q = tx || sql;
  const exec = tx ? tx.execute.bind(tx) : sql.executeSync.bind(sql);
  exec(
    `INSERT INTO accounts (id, type, email, status, nni, suspended, data, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?)
     ON CONFLICT (id) DO UPDATE SET
       type = EXCLUDED.type, email = EXCLUDED.email, status = EXCLUDED.status,
       nni = EXCLUDED.nni, suspended = EXCLUDED.suspended, data = EXCLUDED.data,
       updated_at = EXCLUDED.updated_at`,
    [row.id, row.type, row.email, row.status, row.nni, row.suspended, row.data, row.updated_at]
  );
}

function upsertAdSql(row, tx) {
  const exec = tx ? tx.execute.bind(tx) : sql.executeSync.bind(sql);
  exec(
    `INSERT INTO ads (id, account_id, status, category, data, updated_at)
     VALUES (?, ?, ?, ?, ?::jsonb, ?)
     ON CONFLICT (id) DO UPDATE SET
       account_id = EXCLUDED.account_id, status = EXCLUDED.status,
       category = EXCLUDED.category, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
    [row.id, row.account_id, row.status, row.category, row.data, row.updated_at]
  );
}

function upsertCatalogSql(row, tx) {
  const exec = tx ? tx.execute.bind(tx) : sql.executeSync.bind(sql);
  exec(
    `INSERT INTO catalog_items (id, account_id, status, data, updated_at)
     VALUES (?, ?, ?, ?::jsonb, ?)
     ON CONFLICT (id) DO UPDATE SET
       account_id = EXCLUDED.account_id, status = EXCLUDED.status,
       data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
    [row.id, row.account_id, row.status, row.data, row.updated_at]
  );
}

function upsertTenderSql(row, tx) {
  const exec = tx ? tx.execute.bind(tx) : sql.executeSync.bind(sql);
  exec(
    `INSERT INTO tenders (id, account_id, status, data, updated_at)
     VALUES (?, ?, ?, ?::jsonb, ?)
     ON CONFLICT (id) DO UPDATE SET
       account_id = EXCLUDED.account_id, status = EXCLUDED.status,
       data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
    [row.id, row.account_id, row.status, row.data, row.updated_at]
  );
}

function migrateAccountsFromJson() {
  const n = Number((sql.queryOneSync('SELECT COUNT(*)::int AS n FROM accounts') || {}).n) || 0;
  if (n > 0) return 0;
  const list = readLegacyJson(path.join(DATA_DIR, 'accounts.json'), []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  runInTransaction((tx) => {
    list.forEach((acc) => {
      const row = accountRow(acc);
      if (!row) return;
      upsertAccountSql(row, tx);
      migrated++;
    });
  });
  if (migrated) console.log('[platform-store.pg] migrated ' + migrated + ' account(s)');
  return migrated;
}

function readAccounts() {
  return sql.querySync('SELECT data FROM accounts').map((r) => safeParse(r.data, null)).filter(Boolean);
}

function writeAccounts(list) {
  const rows = Array.isArray(list) ? list : [];
  runInTransaction((tx) => {
    tx.execute('DELETE FROM accounts');
    rows.forEach((acc) => {
      const row = accountRow(acc);
      if (row) upsertAccountSql(row, tx);
    });
  });
  backupJson(path.join(DATA_DIR, 'accounts.json'), rows);
  return rows;
}

function getAccountById(id) {
  const r = sql.queryOneSync('SELECT data FROM accounts WHERE id = ?', [String(id || '')]);
  return r ? safeParse(r.data, null) : null;
}

function getAccountByEmail(email) {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return null;
  const r = sql.queryOneSync(
    "SELECT data FROM accounts WHERE lower(email) = lower(?) AND email != '' LIMIT 1",
    [em]
  );
  return r ? safeParse(r.data, null) : null;
}

function upsertAccount(acc) {
  const row = accountRow(acc);
  if (!row) return null;
  upsertAccountSql(row);
  try { backupJson(path.join(DATA_DIR, 'accounts.json'), readAccounts()); } catch (e) { /* ignore */ }
  return acc;
}

function deleteAccount(id) {
  const r = sql.executeSync('DELETE FROM accounts WHERE id = ?', [String(id || '')]);
  if (r.changes) backupJson(path.join(DATA_DIR, 'accounts.json'), readAccounts());
  return r.changes > 0;
}

function migrateAdsFromJson() {
  const n = Number((sql.queryOneSync('SELECT COUNT(*)::int AS n FROM ads') || {}).n) || 0;
  if (n > 0) return 0;
  const list = readLegacyJson(path.join(DATA_DIR, 'ads.json'), []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  runInTransaction((tx) => {
    list.forEach((ad) => {
      const row = adRow(ad);
      if (!row) return;
      upsertAdSql(row, tx);
      migrated++;
    });
  });
  if (migrated) console.log('[platform-store.pg] migrated ' + migrated + ' ad(s)');
  return migrated;
}

function readAds() {
  return sql.querySync('SELECT data FROM ads').map((r) => safeParse(r.data, null)).filter(Boolean);
}

function writeAds(list) {
  const rows = Array.isArray(list) ? list : [];
  runInTransaction((tx) => {
    tx.execute('DELETE FROM ads');
    rows.forEach((ad) => {
      const row = adRow(ad);
      if (row) upsertAdSql(row, tx);
    });
  });
  backupJson(path.join(DATA_DIR, 'ads.json'), rows);
  return rows;
}

function getAdById(id) {
  const r = sql.queryOneSync('SELECT data FROM ads WHERE id = ?', [String(id || '')]);
  return r ? safeParse(r.data, null) : null;
}

function upsertAd(ad) {
  const row = adRow(ad);
  if (!row) return null;
  upsertAdSql(row);
  try { backupJson(path.join(DATA_DIR, 'ads.json'), readAds()); } catch (e) { /* ignore */ }
  return ad;
}

function deleteAd(id) {
  const r = sql.executeSync('DELETE FROM ads WHERE id = ?', [String(id || '')]);
  if (r.changes) backupJson(path.join(DATA_DIR, 'ads.json'), readAds());
  return r.changes > 0;
}

function migrateCatalogFromJson() {
  const n = Number((sql.queryOneSync('SELECT COUNT(*)::int AS n FROM catalog_items') || {}).n) || 0;
  if (n > 0) return 0;
  const list = readLegacyJson(path.join(DATA_DIR, 'catalog.json'), []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  runInTransaction((tx) => {
    list.forEach((item) => {
      const row = catalogRow(item);
      if (!row) return;
      upsertCatalogSql(row, tx);
      migrated++;
    });
  });
  if (migrated) console.log('[platform-store.pg] migrated ' + migrated + ' catalog item(s)');
  return migrated;
}

function readCatalog() {
  return sql.querySync('SELECT data FROM catalog_items').map((r) => safeParse(r.data, null)).filter(Boolean);
}

function writeCatalog(list) {
  const rows = Array.isArray(list) ? list : [];
  runInTransaction((tx) => {
    tx.execute('DELETE FROM catalog_items');
    rows.forEach((item) => {
      const row = catalogRow(item);
      if (row) upsertCatalogSql(row, tx);
    });
  });
  backupJson(path.join(DATA_DIR, 'catalog.json'), rows);
  return rows;
}

function upsertCatalogItem(item) {
  const row = catalogRow(item);
  if (!row) return null;
  upsertCatalogSql(row);
  try { backupJson(path.join(DATA_DIR, 'catalog.json'), readCatalog()); } catch (e) { /* ignore */ }
  return item;
}

function deleteCatalogItem(id) {
  const r = sql.executeSync('DELETE FROM catalog_items WHERE id = ?', [String(id || '')]);
  if (r.changes) backupJson(path.join(DATA_DIR, 'catalog.json'), readCatalog());
  return r.changes > 0;
}

function migrateTendersFromJson() {
  const n = Number((sql.queryOneSync('SELECT COUNT(*)::int AS n FROM tenders') || {}).n) || 0;
  if (n > 0) return 0;
  const list = readLegacyJson(path.join(DATA_DIR, 'tenders.json'), []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  runInTransaction((tx) => {
    list.forEach((t) => {
      const row = tenderRow(t);
      if (!row) return;
      upsertTenderSql(row, tx);
      migrated++;
    });
  });
  if (migrated) console.log('[platform-store.pg] migrated ' + migrated + ' tender(s)');
  return migrated;
}

function readTendersStore() {
  return sql.querySync('SELECT data FROM tenders').map((r) => safeParse(r.data, null)).filter(Boolean);
}

function writeTendersStore(list) {
  const rows = Array.isArray(list) ? list : [];
  runInTransaction((tx) => {
    tx.execute('DELETE FROM tenders');
    rows.forEach((t) => {
      const row = tenderRow(t);
      if (row) upsertTenderSql(row, tx);
    });
  });
  backupJson(path.join(DATA_DIR, 'tenders.json'), rows);
  return rows;
}

function upsertTender(t) {
  const row = tenderRow(t);
  if (!row) return null;
  upsertTenderSql(row);
  try { backupJson(path.join(DATA_DIR, 'tenders.json'), readTendersStore()); } catch (e) { /* ignore */ }
  return t;
}

function deleteTender(id) {
  const r = sql.executeSync('DELETE FROM tenders WHERE id = ?', [String(id || '')]);
  if (r.changes) backupJson(path.join(DATA_DIR, 'tenders.json'), readTendersStore());
  return r.changes > 0;
}

function migrateAllPlatformStores() {
  return {
    accounts: migrateAccountsFromJson(),
    ads: migrateAdsFromJson(),
    catalog: migrateCatalogFromJson(),
    tenders: migrateTendersFromJson(),
  };
}

migrateAllPlatformStores();

module.exports = {
  readAccounts, writeAccounts, getAccountById, getAccountByEmail, upsertAccount, deleteAccount,
  readAds, writeAds, getAdById, upsertAd, deleteAd,
  readCatalog, writeCatalog, upsertCatalogItem, deleteCatalogItem,
  readTenders: readTendersStore, writeTenders: writeTendersStore, upsertTender, deleteTender,
  migrateAllPlatformStores, DATA_DIR,
};
