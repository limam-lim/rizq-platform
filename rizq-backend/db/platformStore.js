/**
 * تخزين المنصة على SQLite — حسابات + إعلانات (+ كتالوج/مناقصات)
 * المصدر التشغيلي على الخادم؛ يرحّل تلقائياً من ملفات JSON القديمة.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { db, DATA_DIR } = require('./index');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'pending',
    nni        TEXT NOT NULL DEFAULT '',
    suspended  INTEGER NOT NULL DEFAULT 0,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
  CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
  CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
  CREATE INDEX IF NOT EXISTS idx_accounts_nni ON accounts(nni);

  CREATE TABLE IF NOT EXISTS ads (
    id         TEXT PRIMARY KEY,
    account_id TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'pending',
    category   TEXT NOT NULL DEFAULT '',
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ads_account ON ads(account_id);
  CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
  CREATE INDEX IF NOT EXISTS idx_ads_category ON ads(category);

  CREATE TABLE IF NOT EXISTS catalog_items (
    id         TEXT PRIMARY KEY,
    account_id TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'pending_review',
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_catalog_account ON catalog_items(account_id);
  CREATE INDEX IF NOT EXISTS idx_catalog_status ON catalog_items(status);

  CREATE TABLE IF NOT EXISTS tenders (
    id         TEXT PRIMARY KEY,
    account_id TEXT NOT NULL DEFAULT '',
    status     TEXT NOT NULL DEFAULT 'pending_review',
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tenders_account ON tenders(account_id);
  CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
`);

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
  }
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
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('[platform-store] backup json failed:', file, e.message);
  }
}


function runInTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (e2) { /* ignore */ }
    throw e;
  }
}

/* ── Accounts ─────────────────────────────────────────────── */

const stmtAccountCount = db.prepare('SELECT COUNT(*) AS n FROM accounts');
const stmtAccountAll = db.prepare('SELECT data FROM accounts');
const stmtAccountById = db.prepare('SELECT data FROM accounts WHERE id = ?');
const stmtAccountByEmail = db.prepare(
  "SELECT data FROM accounts WHERE lower(email) = lower(?) AND email != '' LIMIT 1"
);
const stmtAccountUpsert = db.prepare(`
  INSERT INTO accounts (id, type, email, status, nni, suspended, data, updated_at)
  VALUES (@id, @type, @email, @status, @nni, @suspended, @data, @updated_at)
  ON CONFLICT(id) DO UPDATE SET
    type=excluded.type,
    email=excluded.email,
    status=excluded.status,
    nni=excluded.nni,
    suspended=excluded.suspended,
    data=excluded.data,
    updated_at=excluded.updated_at
`);
const stmtAccountClear = db.prepare('DELETE FROM accounts');

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
    data: JSON.stringify(acc),
    updated_at: String(acc.updatedAt || new Date().toISOString()),
  };
}

function migrateAccountsFromJson() {
  const n = stmtAccountCount.get().n;
  if (n > 0) return 0;
  const file = path.join(DATA_DIR, 'accounts.json');
  const list = readLegacyJson(file, []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  runInTransaction(() => {
    list.forEach((acc) => {
      const row = accountRow(acc);
      if (!row) return;
      stmtAccountUpsert.run(row);
      migrated++;
    });
  });
  if (migrated) console.log('[platform-store] migrated ' + migrated + ' account(s) from accounts.json');
  return migrated;
}

function readAccounts() {
  return stmtAccountAll.all().map((r) => safeParse(r.data, null)).filter(Boolean);
}

function writeAccounts(list) {
  const rows = Array.isArray(list) ? list : [];
  runInTransaction(() => {
    stmtAccountClear.run();
    rows.forEach((acc) => {
      const row = accountRow(acc);
      if (row) stmtAccountUpsert.run(row);
    });
  });
  backupJson(path.join(DATA_DIR, 'accounts.json'), rows);
  return rows;
}

function getAccountById(id) {
  const r = stmtAccountById.get(String(id || ''));
  return r ? safeParse(r.data, null) : null;
}

function getAccountByEmail(email) {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return null;
  const r = stmtAccountByEmail.get(em);
  return r ? safeParse(r.data, null) : null;
}

function upsertAccount(acc) {
  const row = accountRow(acc);
  if (!row) return null;
  stmtAccountUpsert.run(row);
  return acc;
}

/* ── Ads ──────────────────────────────────────────────────── */

const stmtAdsCount = db.prepare('SELECT COUNT(*) AS n FROM ads');
const stmtAdsAll = db.prepare('SELECT data FROM ads');
const stmtAdById = db.prepare('SELECT data FROM ads WHERE id = ?');
const stmtAdsUpsert = db.prepare(`
  INSERT INTO ads (id, account_id, status, category, data, updated_at)
  VALUES (@id, @account_id, @status, @category, @data, @updated_at)
  ON CONFLICT(id) DO UPDATE SET
    account_id=excluded.account_id,
    status=excluded.status,
    category=excluded.category,
    data=excluded.data,
    updated_at=excluded.updated_at
`);
const stmtAdsClear = db.prepare('DELETE FROM ads');

function adRow(ad) {
  const id = String(ad && ad.id || '');
  if (!id) return null;
  return {
    id,
    account_id: String(ad.accountId || '').slice(0, 60),
    status: String(ad.status || 'pending').slice(0, 40),
    category: String(ad.category || '').slice(0, 60),
    data: JSON.stringify(ad),
    updated_at: String(ad.updatedAt || new Date().toISOString()),
  };
}

function migrateAdsFromJson() {
  const n = stmtAdsCount.get().n;
  if (n > 0) return 0;
  const file = path.join(DATA_DIR, 'ads.json');
  const list = readLegacyJson(file, []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  runInTransaction(() => {
    list.forEach((ad) => {
      const row = adRow(ad);
      if (!row) return;
      stmtAdsUpsert.run(row);
      migrated++;
    });
  });
  if (migrated) console.log('[platform-store] migrated ' + migrated + ' ad(s) from ads.json');
  return migrated;
}

function readAds() {
  return stmtAdsAll.all().map((r) => safeParse(r.data, null)).filter(Boolean);
}

function writeAds(list) {
  const rows = Array.isArray(list) ? list : [];
  runInTransaction(() => {
    stmtAdsClear.run();
    rows.forEach((ad) => {
      const row = adRow(ad);
      if (row) stmtAdsUpsert.run(row);
    });
  });
  backupJson(path.join(DATA_DIR, 'ads.json'), rows);
  return rows;
}

function getAdById(id) {
  const r = stmtAdById.get(String(id || ''));
  return r ? safeParse(r.data, null) : null;
}

/* ── Catalog ──────────────────────────────────────────────── */

const stmtCatalogCount = db.prepare('SELECT COUNT(*) AS n FROM catalog_items');
const stmtCatalogAll = db.prepare('SELECT data FROM catalog_items');
const stmtCatalogUpsert = db.prepare(`
  INSERT INTO catalog_items (id, account_id, status, data, updated_at)
  VALUES (@id, @account_id, @status, @data, @updated_at)
  ON CONFLICT(id) DO UPDATE SET
    account_id=excluded.account_id,
    status=excluded.status,
    data=excluded.data,
    updated_at=excluded.updated_at
`);
const stmtCatalogClear = db.prepare('DELETE FROM catalog_items');

function catalogRow(item) {
  const id = String(item && item.id || '');
  if (!id) return null;
  return {
    id,
    account_id: String(item.accountId || '').slice(0, 60),
    status: String(item.status || 'pending_review').slice(0, 40),
    data: JSON.stringify(item),
    updated_at: String(item.updatedAt || new Date().toISOString()),
  };
}

function migrateCatalogFromJson() {
  const n = stmtCatalogCount.get().n;
  if (n > 0) return 0;
  const file = path.join(DATA_DIR, 'catalog.json');
  const list = readLegacyJson(file, []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  runInTransaction(() => {
    list.forEach((item) => {
      const row = catalogRow(item);
      if (!row) return;
      stmtCatalogUpsert.run(row);
      migrated++;
    });
  });
  if (migrated) console.log('[platform-store] migrated ' + migrated + ' catalog item(s) from catalog.json');
  return migrated;
}

function readCatalog() {
  return stmtCatalogAll.all().map((r) => safeParse(r.data, null)).filter(Boolean);
}

function writeCatalog(list) {
  const rows = Array.isArray(list) ? list : [];
  runInTransaction(() => {
    stmtCatalogClear.run();
    rows.forEach((item) => {
      const row = catalogRow(item);
      if (row) stmtCatalogUpsert.run(row);
    });
  });
  backupJson(path.join(DATA_DIR, 'catalog.json'), rows);
  return rows;
}

/* ── Tenders ──────────────────────────────────────────────── */

const stmtTendersCount = db.prepare('SELECT COUNT(*) AS n FROM tenders');
const stmtTendersAll = db.prepare('SELECT data FROM tenders');
const stmtTendersUpsert = db.prepare(`
  INSERT INTO tenders (id, account_id, status, data, updated_at)
  VALUES (@id, @account_id, @status, @data, @updated_at)
  ON CONFLICT(id) DO UPDATE SET
    account_id=excluded.account_id,
    status=excluded.status,
    data=excluded.data,
    updated_at=excluded.updated_at
`);
const stmtTendersClear = db.prepare('DELETE FROM tenders');

function tenderRow(t) {
  const id = String(t && t.id || '');
  if (!id) return null;
  return {
    id,
    account_id: String(t.accountId || '').slice(0, 60),
    status: String(t.status || 'pending_review').slice(0, 40),
    data: JSON.stringify(t),
    updated_at: String(t.updatedAt || new Date().toISOString()),
  };
}

function migrateTendersFromJson() {
  const n = stmtTendersCount.get().n;
  if (n > 0) return 0;
  const file = path.join(DATA_DIR, 'tenders.json');
  const list = readLegacyJson(file, []);
  if (!Array.isArray(list) || !list.length) return 0;
  let migrated = 0;
  runInTransaction(() => {
    list.forEach((t) => {
      const row = tenderRow(t);
      if (!row) return;
      stmtTendersUpsert.run(row);
      migrated++;
    });
  });
  if (migrated) console.log('[platform-store] migrated ' + migrated + ' tender(s) from tenders.json');
  return migrated;
}

function readTendersStore() {
  return stmtTendersAll.all().map((r) => safeParse(r.data, null)).filter(Boolean);
}

function writeTendersStore(list) {
  const rows = Array.isArray(list) ? list : [];
  runInTransaction(() => {
    stmtTendersClear.run();
    rows.forEach((t) => {
      const row = tenderRow(t);
      if (row) stmtTendersUpsert.run(row);
    });
  });
  backupJson(path.join(DATA_DIR, 'tenders.json'), rows);
  return rows;
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
  readAccounts,
  writeAccounts,
  getAccountById,
  getAccountByEmail,
  upsertAccount,
  readAds,
  writeAds,
  getAdById,
  readCatalog,
  writeCatalog,
  readTenders: readTendersStore,
  writeTenders: writeTendersStore,
  migrateAllPlatformStores,
  DATA_DIR,
};
