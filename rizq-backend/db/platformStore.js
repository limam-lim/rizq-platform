/**
 * Platform store — async PostgreSQL (accounts / ads / catalog / tenders).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./index');
const sql = require('./sql');
const { scrubSecretsForBackup } = require('../lib/scrubSecrets');

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
    console.warn('[platform-store] backup json failed:', file, e.message);
  }
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

async function upsertAccountSql(row, tx) {
  const exec = tx ? tx.execute.bind(tx) : sql.execute.bind(sql);
  await exec(
    `INSERT INTO accounts (id, type, email, status, nni, suspended, data, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?)
     ON CONFLICT (id) DO UPDATE SET
       type = EXCLUDED.type, email = EXCLUDED.email, status = EXCLUDED.status,
       nni = EXCLUDED.nni, suspended = EXCLUDED.suspended, data = EXCLUDED.data,
       updated_at = EXCLUDED.updated_at, updated_at_ts = NOW()`,
    [row.id, row.type, row.email, row.status, row.nni, row.suspended, row.data, row.updated_at]
  );
}

async function upsertAdSql(row, tx) {
  const exec = tx ? tx.execute.bind(tx) : sql.execute.bind(sql);
  await exec(
    `INSERT INTO ads (id, account_id, status, category, data, updated_at)
     VALUES (?, ?, ?, ?, ?::jsonb, ?)
     ON CONFLICT (id) DO UPDATE SET
       account_id = EXCLUDED.account_id, status = EXCLUDED.status,
       category = EXCLUDED.category, data = EXCLUDED.data,
       updated_at = EXCLUDED.updated_at, updated_at_ts = NOW()`,
    [row.id, row.account_id, row.status, row.category, row.data, row.updated_at]
  );
}

async function upsertCatalogSql(row, tx) {
  const exec = tx ? tx.execute.bind(tx) : sql.execute.bind(sql);
  await exec(
    `INSERT INTO catalog_items (id, account_id, status, data, updated_at)
     VALUES (?, ?, ?, ?::jsonb, ?)
     ON CONFLICT (id) DO UPDATE SET
       account_id = EXCLUDED.account_id, status = EXCLUDED.status,
       data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, updated_at_ts = NOW()`,
    [row.id, row.account_id, row.status, row.data, row.updated_at]
  );
}

async function upsertTenderSql(row, tx) {
  const exec = tx ? tx.execute.bind(tx) : sql.execute.bind(sql);
  await exec(
    `INSERT INTO tenders (id, account_id, status, data, updated_at)
     VALUES (?, ?, ?, ?::jsonb, ?)
     ON CONFLICT (id) DO UPDATE SET
       account_id = EXCLUDED.account_id, status = EXCLUDED.status,
       data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, updated_at_ts = NOW()`,
    [row.id, row.account_id, row.status, row.data, row.updated_at]
  );
}

async function migrateAccountsFromJson() {
  const n = Number((await sql.queryOne('SELECT COUNT(*)::int AS n FROM accounts') || {}).n) || 0;
  if (n > 0) return 0;
  const list = readLegacyJson(path.join(DATA_DIR, 'accounts.json'), []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  await sql.withTransaction(async (tx) => {
    for (const acc of list) {
      const row = accountRow(acc);
      if (!row) continue;
      await upsertAccountSql(row, tx);
      migrated++;
    }
  });
  if (migrated) console.log('[platform-store] migrated ' + migrated + ' account(s) from accounts.json');
  return migrated;
}

async function readAccounts() {
  const rows = await sql.query('SELECT data FROM accounts');
  return rows.map((r) => safeParse(r.data, null)).filter(Boolean);
}

async function writeAccounts(list) {
  const rows = Array.isArray(list) ? list : [];
  await sql.withTransaction(async (tx) => {
    await tx.execute('DELETE FROM accounts');
    for (const acc of rows) {
      const row = accountRow(acc);
      if (row) await upsertAccountSql(row, tx);
    }
  });
  backupJson(path.join(DATA_DIR, 'accounts.json'), rows);
  return rows;
}

async function getAccountById(id) {
  const r = await sql.queryOne('SELECT data FROM accounts WHERE id = ?', [String(id || '')]);
  return r ? safeParse(r.data, null) : null;
}

async function getAccountByEmail(email) {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return null;
  const r = await sql.queryOne(
    "SELECT data FROM accounts WHERE lower(email) = lower(?) AND email != '' LIMIT 1",
    [em]
  );
  return r ? safeParse(r.data, null) : null;
}

async function upsertAccount(acc) {
  const row = accountRow(acc);
  if (!row) return null;
  await upsertAccountSql(row);
  try { backupJson(path.join(DATA_DIR, 'accounts.json'), await readAccounts()); } catch (e) { /* ignore */ }
  return acc;
}

async function deleteAccount(id) {
  const r = await sql.execute('DELETE FROM accounts WHERE id = ?', [String(id || '')]);
  if (r.changes) backupJson(path.join(DATA_DIR, 'accounts.json'), await readAccounts());
  return r.changes > 0;
}

async function migrateAdsFromJson() {
  const n = Number((await sql.queryOne('SELECT COUNT(*)::int AS n FROM ads') || {}).n) || 0;
  if (n > 0) return 0;
  const list = readLegacyJson(path.join(DATA_DIR, 'ads.json'), []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  await sql.withTransaction(async (tx) => {
    for (const ad of list) {
      const row = adRow(ad);
      if (!row) continue;
      await upsertAdSql(row, tx);
      migrated++;
    }
  });
  if (migrated) console.log('[platform-store] migrated ' + migrated + ' ad(s) from ads.json');
  return migrated;
}

async function readAds() {
  const rows = await sql.query('SELECT data FROM ads');
  return rows.map((r) => safeParse(r.data, null)).filter(Boolean);
}

async function writeAds(list) {
  const rows = Array.isArray(list) ? list : [];
  await sql.withTransaction(async (tx) => {
    await tx.execute('DELETE FROM ads');
    for (const ad of rows) {
      const row = adRow(ad);
      if (row) await upsertAdSql(row, tx);
    }
  });
  backupJson(path.join(DATA_DIR, 'ads.json'), rows);
  return rows;
}

async function getAdById(id) {
  const r = await sql.queryOne('SELECT data FROM ads WHERE id = ?', [String(id || '')]);
  return r ? safeParse(r.data, null) : null;
}

async function upsertAd(ad) {
  const row = adRow(ad);
  if (!row) return null;
  await upsertAdSql(row);
  try { backupJson(path.join(DATA_DIR, 'ads.json'), await readAds()); } catch (e) { /* ignore */ }
  return ad;
}

async function deleteAd(id) {
  const r = await sql.execute('DELETE FROM ads WHERE id = ?', [String(id || '')]);
  if (r.changes) backupJson(path.join(DATA_DIR, 'ads.json'), await readAds());
  return r.changes > 0;
}

async function migrateCatalogFromJson() {
  const n = Number((await sql.queryOne('SELECT COUNT(*)::int AS n FROM catalog_items') || {}).n) || 0;
  if (n > 0) return 0;
  const list = readLegacyJson(path.join(DATA_DIR, 'catalog.json'), []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  await sql.withTransaction(async (tx) => {
    for (const item of list) {
      const row = catalogRow(item);
      if (!row) continue;
      await upsertCatalogSql(row, tx);
      migrated++;
    }
  });
  if (migrated) console.log('[platform-store] migrated ' + migrated + ' catalog item(s) from catalog.json');
  return migrated;
}

async function readCatalog() {
  const rows = await sql.query('SELECT data FROM catalog_items');
  return rows.map((r) => safeParse(r.data, null)).filter(Boolean);
}

async function writeCatalog(list) {
  const rows = Array.isArray(list) ? list : [];
  await sql.withTransaction(async (tx) => {
    await tx.execute('DELETE FROM catalog_items');
    for (const item of rows) {
      const row = catalogRow(item);
      if (row) await upsertCatalogSql(row, tx);
    }
  });
  backupJson(path.join(DATA_DIR, 'catalog.json'), rows);
  return rows;
}

async function upsertCatalogItem(item) {
  const row = catalogRow(item);
  if (!row) return null;
  await upsertCatalogSql(row);
  try { backupJson(path.join(DATA_DIR, 'catalog.json'), await readCatalog()); } catch (e) { /* ignore */ }
  return item;
}

async function deleteCatalogItem(id) {
  const r = await sql.execute('DELETE FROM catalog_items WHERE id = ?', [String(id || '')]);
  if (r.changes) backupJson(path.join(DATA_DIR, 'catalog.json'), await readCatalog());
  return r.changes > 0;
}

async function migrateTendersFromJson() {
  const n = Number((await sql.queryOne('SELECT COUNT(*)::int AS n FROM tenders') || {}).n) || 0;
  if (n > 0) return 0;
  const list = readLegacyJson(path.join(DATA_DIR, 'tenders.json'), []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  await sql.withTransaction(async (tx) => {
    for (const t of list) {
      const row = tenderRow(t);
      if (!row) continue;
      await upsertTenderSql(row, tx);
      migrated++;
    }
  });
  if (migrated) console.log('[platform-store] migrated ' + migrated + ' tender(s) from tenders.json');
  return migrated;
}

async function readTendersStore() {
  const rows = await sql.query('SELECT data FROM tenders');
  return rows.map((r) => safeParse(r.data, null)).filter(Boolean);
}

async function writeTendersStore(list) {
  const rows = Array.isArray(list) ? list : [];
  await sql.withTransaction(async (tx) => {
    await tx.execute('DELETE FROM tenders');
    for (const t of rows) {
      const row = tenderRow(t);
      if (row) await upsertTenderSql(row, tx);
    }
  });
  backupJson(path.join(DATA_DIR, 'tenders.json'), rows);
  return rows;
}

async function upsertTender(t) {
  const row = tenderRow(t);
  if (!row) return null;
  await upsertTenderSql(row);
  try { backupJson(path.join(DATA_DIR, 'tenders.json'), await readTendersStore()); } catch (e) { /* ignore */ }
  return t;
}

async function deleteTender(id) {
  const r = await sql.execute('DELETE FROM tenders WHERE id = ?', [String(id || '')]);
  if (r.changes) backupJson(path.join(DATA_DIR, 'tenders.json'), await readTendersStore());
  return r.changes > 0;
}

async function migrateAllPlatformStores() {
  return {
    accounts: await migrateAccountsFromJson(),
    ads: await migrateAdsFromJson(),
    catalog: await migrateCatalogFromJson(),
    tenders: await migrateTendersFromJson(),
  };
}

module.exports = {
  readAccounts,
  writeAccounts,
  getAccountById,
  getAccountByEmail,
  upsertAccount,
  deleteAccount,
  readAds,
  writeAds,
  getAdById,
  upsertAd,
  deleteAd,
  readCatalog,
  writeCatalog,
  upsertCatalogItem,
  deleteCatalogItem,
  readTenders: readTendersStore,
  writeTenders: writeTendersStore,
  upsertTender,
  deleteTender,
  migrateAllPlatformStores,
  DATA_DIR,
};
