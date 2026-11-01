/**
 * Platform store — async PostgreSQL (accounts / ads / catalog / tenders).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./index');
const sql = require('./sql');
const { scrubSecretsForBackup } = require('../lib/scrubSecrets');

/* ══ كتابة آمنة متزامنة (diff-write) ═══════════════════════════════════════
 * كانت write*(list) تمسح الجدول كله ثم تعيد كتابة القائمة: طلبان متزامنان
 * (دخولان، إعلانان، تسجيلان) يمحو أحدهما عمل الآخر — وقد يُحذف حساب جديد.
 * الآن: كل كائن مقروء يحمل بصمته + مجموعة المعرّفات التي رآها القارئ.
 *   - يُكتب فقط ما تغيّر فعلاً عن ما قُرئ (أو الجديد).
 *   - يُحذف فقط ما رآه هذا القارئ ثم أزاله عمداً من القائمة.
 *   - ما أضافه غيره بعد القراءة لا يُمس أبداً.
 */
const _readMeta = new WeakMap(); // object → { enc, seen:Set<id> }
const _arraySeen = new WeakMap(); // array  → Set<id> (للقوائم التي أصبحت فارغة)

/** مصفوفة تحمل أثر القراءة عبر filter/slice/concat (حذف آخر عنصر يبقى مفهوماً) */
class TrackedArray extends Array {
  static get [Symbol.species]() { return Array; }
  filter(...a) { const r = TrackedArray.from(super.filter(...a)); _arraySeen.set(r, _arraySeen.get(this)); return r; }
  slice(...a) { const r = TrackedArray.from(super.slice(...a)); _arraySeen.set(r, _arraySeen.get(this)); return r; }
  concat(...a) { const r = TrackedArray.from(super.concat(...a)); _arraySeen.set(r, _arraySeen.get(this)); return r; }
}

function trackRead(input, idOf) {
  const list = input instanceof TrackedArray ? input : TrackedArray.from(input);
  const seen = new Set();
  list.forEach((o) => { const id = idOf(o); if (id) seen.add(id); });
  list.forEach((o) => { if (o && typeof o === 'object') _readMeta.set(o, { enc: JSON.stringify(o), seen }); });
  _arraySeen.set(list, seen);
  return list;
}

async function diffWrite(table, list, rowFn, upsertFn, idOf) {
  const rows = Array.isArray(list) ? list : [];
  const keep = new Set();
  const seen = new Set();
  let tracked = false;
  const arrSeen = _arraySeen.get(list);
  if (arrSeen) { tracked = true; arrSeen.forEach((id) => seen.add(id)); }
  rows.forEach((o) => {
    const id = idOf(o);
    if (id) keep.add(id);
    const m = o && typeof o === 'object' ? _readMeta.get(o) : null;
    if (m) { tracked = true; m.seen.forEach((x) => seen.add(x)); }
  });
  let written = 0;
  await sql.withTransaction(async (tx) => {
    if (tracked) {
      const toDelete = [...seen].filter((id) => !keep.has(id));
      for (const id of toDelete) await tx.execute('DELETE FROM ' + table + ' WHERE id = ?', [id]);
    } else if (rows.length === 0) {
      // قائمة بلا أي أثر قراءة: لا نعرف ما رآه الكاتب — لا نحذف شيئاً (الأمان قبل كل شيء)
      console.warn('[platform-store] ' + table + ': untracked empty write ignored (no rows deleted)');
    }
    for (const o of rows) {
      const m = o && typeof o === 'object' ? _readMeta.get(o) : null;
      const enc = JSON.stringify(o);
      if (m && m.enc === enc) continue; // لم يتغيّر — لا نكتب فوق نسخة أحدث لدى غيرنا
      const row = rowFn(o);
      if (row) { await upsertFn(row, tx); written++; }
    }
  });
  // بعد الكتابة: القائمة نفسها تصبح "مقروءة" بحالتها الجديدة (لكتابات لاحقة بنفس الكائنات)
  trackRead(rows, idOf);
  return written;
}

const _idOf = (o) => String((o && o.id) || '');

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

function jsonDumpsEnabled() {
  return String(process.env.DEV_JSON_DUMPS || '') === '1';
}

function backupJson(file, data) {
  // في الإنتاج: لا نسخ JSON كاملة عند كل كتابة — فقط مع DEV_JSON_DUMPS=1
  if (!jsonDumpsEnabled()) return;
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
  return trackRead(rows.map((r) => safeParse(r.data, null)).filter(Boolean), _idOf);
}

async function writeAccounts(list) {
  const rows = Array.isArray(list) ? list : [];
  await diffWrite('accounts', rows, accountRow, upsertAccountSql, _idOf);
  backupJson(path.join(DATA_DIR, 'accounts.json'), rows);
  return rows;
}

/**
 * تحديث ذرّي لحساب واحد بقفل صف (SELECT … FOR UPDATE): جهازان لنفس الحساب
 * يدخلان معاً لا يمحو أحدهما جلسة الآخر. fn(acc) تعدّل الكائن وتعيد قيمة اختيارية.
 * يعيد { acc, result } أو null إن لم يوجد الحساب.
 */
async function updateAccount(id, fn) {
  const key = String(id || '');
  if (!key) return null;
  return sql.withTransaction(async (tx) => {
    const rows = await tx.query('SELECT data FROM accounts WHERE id = ? FOR UPDATE', [key]);
    const acc = rows && rows[0] ? safeParse(rows[0].data, null) : null;
    if (!acc) return null;
    const result = await fn(acc);
    if (result === false) return { acc, result };
    const row = accountRow(acc);
    if (row) await upsertAccountSql(row, tx);
    return { acc, result };
  });
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

/**
 * بحث حسابات بنفس مفتاح الهاتف (آخر 8 أرقام) عبر SQL على data jsonb —
 * بدل تحميل كل الحسابات في الذاكرة.
 * @param {string[]} keys
 * @param {string} [excludeId]
 * @returns {Promise<object[]>}
 */
async function findAccountsByPhoneKeys(keys, excludeId) {
  const ks = [...new Set(
    (Array.isArray(keys) ? keys : [])
      .map((k) => String(k || '').replace(/\D/g, '').slice(-8))
      .filter((k) => k.length >= 6 && k.length <= 15)
  )];
  if (!ks.length) return [];
  const excl = String(excludeId || '');
  /* \D في نمط PostgreSQL — داخل سلسلة JS نكتب \\D */
  const digitsOf = (field) =>
    "right(regexp_replace(COALESCE(" + field + ", ''), '\\D', '', 'g'), 8)";
  const phoneExpr = digitsOf("data->>'phone'");
  const intlExpr = digitsOf("data->>'phoneIntl'");
  const waExpr = digitsOf("data->>'whatsapp'");
  const params = [excl];
  const parts = [];
  ks.forEach((k) => {
    params.push(k, k, k);
    parts.push('(' + phoneExpr + ' = ? OR ' + intlExpr + ' = ? OR ' + waExpr + ' = ?)');
  });
  const rows = await sql.query(
    'SELECT data FROM accounts WHERE id <> ? AND (' + parts.join(' OR ') + ') LIMIT 50',
    params
  );
  return (rows || []).map((r) => safeParse(r.data, null)).filter(Boolean);
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
  return trackRead(rows.map((r) => safeParse(r.data, null)).filter(Boolean), _idOf);
}

async function writeAds(list) {
  const rows = Array.isArray(list) ? list : [];
  await diffWrite('ads', rows, adRow, upsertAdSql, _idOf);
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
  return trackRead(rows.map((r) => safeParse(r.data, null)).filter(Boolean), _idOf);
}

async function writeCatalog(list) {
  const rows = Array.isArray(list) ? list : [];
  await diffWrite('catalog_items', rows, catalogRow, upsertCatalogSql, _idOf);
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
  return trackRead(rows.map((r) => safeParse(r.data, null)).filter(Boolean), _idOf);
}

async function writeTendersStore(list) {
  const rows = Array.isArray(list) ? list : [];
  await diffWrite('tenders', rows, tenderRow, upsertTenderSql, _idOf);
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

function safeParseRow(row) {
  if (!row) return null;
  if (row.data != null && typeof row.data === 'object') return row.data;
  try {
    return JSON.parse(row.data);
  } catch (e) {
    return null;
  }
}

/**
 * تصفح إعلانات عامة بفلترة وترقيم داخل SQL (لا تحميل القائمة كاملة).
 * @returns {{ total: number, ads: object[] }}
 */
async function queryPublicAds(filters) {
  filters = filters || {};
  const where = [
    "status = 'active'",
    "account_id NOT LIKE 'acc_demo%'",
    "id !~* '^RZQ-2026-1000[0-9]$'",
    "account_id NOT IN (SELECT id FROM accounts WHERE COALESCE(data->>'isSentinel','') = 'true')",
  ];
  const params = [];
  function push(val) {
    params.push(val);
    return '?';
  }

  if (filters.category) {
    where.push('category = ' + push(String(filters.category).slice(0, 60)));
  }
  if (filters.subcat) {
    where.push("data->>'subcat' = " + push(String(filters.subcat).slice(0, 80)));
  }
  if (filters.wilaya) {
    where.push("data->>'wilaya' = " + push(String(filters.wilaya).slice(0, 80)));
  }
  if (filters.accountId) {
    where.push('account_id = ' + push(String(filters.accountId).slice(0, 60)));
  }
  if (filters.brandId) {
    where.push("data->>'brandId' = " + push(String(filters.brandId).slice(0, 80)));
  }
  if (filters.modelId) {
    where.push("data->>'modelId' = " + push(String(filters.modelId).slice(0, 80)));
  }
  if (filters.search) {
    const s = '%' + String(filters.search).toLowerCase().slice(0, 120) + '%';
    where.push(
      "(lower(COALESCE(data->>'title','')) LIKE " + push(s)
      + " OR lower(COALESCE(data->>'desc','')) LIKE " + push(s)
      + " OR lower(COALESCE(data->>'titleFr','')) LIKE " + push(s)
      + " OR lower(COALESCE(data->>'descFr','')) LIKE " + push(s)
      + " OR lower(COALESCE(data->>'brandName','')) LIKE " + push(s)
      + " OR lower(COALESCE(data->>'modelName','')) LIKE " + push(s)
      + ')'
    );
  }

  const whereSql = where.join(' AND ');
  const countRow = await sql.queryOne('SELECT COUNT(*)::int AS n FROM ads WHERE ' + whereSql, params);
  const total = Number(countRow && countRow.n) || 0;

  const limit = Math.max(1, Math.min(2000, Number(filters.limit) || 60));
  const offset = Math.max(0, Number(filters.offset) || 0);
  const rows = await sql.query(
    'SELECT data FROM ads WHERE ' + whereSql
    + " ORDER BY COALESCE(NULLIF(data->>'createdAt',''), updated_at) DESC"
    + ' LIMIT ' + push(limit) + ' OFFSET ' + push(offset),
    params
  );
  const ads = (rows || []).map(safeParseRow).filter(Boolean);
  return { total, ads };
}

/**
 * حسابات عامة بفلترة وترقيم اختياري داخل SQL.
 * بلا limit → كل المطابقين (توافق الواجهة الحالية).
 */
async function queryPublicAccounts(filters) {
  filters = filters || {};
  const where = [
    "status = 'approved'",
    'suspended = 0',
    "id NOT LIKE 'acc_demo%'",
    "(COALESCE(data->>'isSentinel','') IS DISTINCT FROM 'true')",
  ];
  const params = [];
  function push(val) {
    params.push(val);
    return '?';
  }
  if (filters.type) {
    where.push('type = ' + push(String(filters.type).slice(0, 30)));
  }
  if (filters.city || filters.wilaya) {
    const city = String(filters.city || filters.wilaya).slice(0, 80);
    where.push("(data->>'city' = " + push(city) + " OR data->>'wilaya' = " + push(city) + ')');
  }
  if (filters.search) {
    const s = '%' + String(filters.search).toLowerCase().slice(0, 120) + '%';
    where.push(
      "(lower(COALESCE(data->>'name','')) LIKE " + push(s)
      + " OR lower(COALESCE(data->>'desc','')) LIKE " + push(s)
      + " OR lower(COALESCE(data->>'activity','')) LIKE " + push(s)
      + ')'
    );
  }
  const whereSql = where.join(' AND ');
  const countRow = await sql.queryOne('SELECT COUNT(*)::int AS n FROM accounts WHERE ' + whereSql, params);
  const total = Number(countRow && countRow.n) || 0;

  let sqlText = 'SELECT data FROM accounts WHERE ' + whereSql
    + " ORDER BY COALESCE(NULLIF(data->>'createdAt',''), updated_at) DESC";
  if (filters.limit != null && filters.limit !== '') {
    const limit = Math.max(1, Math.min(2000, Number(filters.limit) || 60));
    const offset = Math.max(0, Number(filters.offset) || 0);
    sqlText += ' LIMIT ' + push(limit) + ' OFFSET ' + push(offset);
  }
  const rows = await sql.query(sqlText, params);
  const accounts = (rows || []).map(safeParseRow).filter(Boolean);
  return { total, accounts };
}

module.exports = {
  readAccounts,
  writeAccounts,
  getAccountById,
  getAccountByEmail,
  findAccountsByPhoneKeys,
  upsertAccount,
  updateAccount,
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
  queryPublicAds,
  queryPublicAccounts,
  DATA_DIR,
};
