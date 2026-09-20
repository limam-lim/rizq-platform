/**
 * Document store — طبقة تخزين موحّدة فوق SQLite.
 * كل مجموعة (collection) = كيان منطقي. العمليات ذرّية فقط.
 * ملفات JSON إن وُجدت = نسخ احتياطي / ترحيل لمرة واحدة — ليست مصدر تشغيل.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { db, DATA_DIR } = require('./index');

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    collection TEXT NOT NULL,
    id         TEXT NOT NULL,
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (collection, id)
  );
  CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);
`);

const stmtGet = db.prepare(
  'SELECT data FROM documents WHERE collection = ? AND id = ?'
);
const stmtList = db.prepare(
  'SELECT id, data FROM documents WHERE collection = ?'
);
const stmtUpsert = db.prepare(`
  INSERT INTO documents (collection, id, data, updated_at)
  VALUES (@collection, @id, @data, @updated_at)
  ON CONFLICT(collection, id) DO UPDATE SET
    data = excluded.data,
    updated_at = excluded.updated_at
`);
const stmtRemove = db.prepare(
  'DELETE FROM documents WHERE collection = ? AND id = ?'
);
const stmtClear = db.prepare(
  'DELETE FROM documents WHERE collection = ?'
);
const stmtCount = db.prepare(
  'SELECT COUNT(*) AS n FROM documents WHERE collection = ?'
);

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw);
    return v == null ? fallback : v;
  } catch (e) {
    return fallback;
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
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  } catch (e) {
    console.warn('[doc-store] backup failed:', file, e && e.message);
  }
}

/**
 * @param {string} collection
 * @param {{ backupFile?: string, onBackup?: (rows: any[]) => any }} [opts]
 */
function createCollection(collection, opts) {
  const name = String(collection || '').trim();
  if (!name) throw new Error('collection name required');
  const backupFile = opts && opts.backupFile
    ? (path.isAbsolute(opts.backupFile) ? opts.backupFile : path.join(DATA_DIR, opts.backupFile))
    : null;
  const onBackup = opts && typeof opts.onBackup === 'function' ? opts.onBackup : null;

  function get(id) {
    const key = String(id || '');
    if (!key) return null;
    const row = stmtGet.get(name, key);
    return row ? safeParse(row.data, null) : null;
  }

  function list() {
    return stmtList.all(name).map((r) => safeParse(r.data, null)).filter((x) => x != null);
  }

  function listEntries() {
    return stmtList.all(name).map((r) => ({
      id: r.id,
      data: safeParse(r.data, null),
    })).filter((e) => e.data != null);
  }

  function asMap() {
    const out = {};
    stmtList.all(name).forEach((r) => {
      const data = safeParse(r.data, null);
      if (data != null) out[r.id] = data;
    });
    return out;
  }

  function count() {
    return stmtCount.get(name).n;
  }

  function writeBackup() {
    if (!backupFile) return;
    try {
      const payload = onBackup ? onBackup(listEntries()) : list();
      backupJson(backupFile, payload);
    } catch (e) {
      console.warn('[doc-store] backup build failed:', name, e && e.message);
    }
  }

  function upsert(id, data, opts) {
    const key = String(id || '');
    if (!key) return null;
    const now = new Date().toISOString();
    stmtUpsert.run({
      collection: name,
      id: key,
      data: JSON.stringify(data),
      updated_at: now,
    });
    if (!(opts && opts.skipBackup)) writeBackup();
    return data;
  }

  function remove(id, opts) {
    const key = String(id || '');
    if (!key) return false;
    const r = stmtRemove.run(name, key);
    if (r.changes && !(opts && opts.skipBackup)) writeBackup();
    return r.changes > 0;
  }

  function upsertMany(entries) {
    runInTransaction(() => {
      (entries || []).forEach((e) => {
        if (!e || e.id == null) return;
        stmtUpsert.run({
          collection: name,
          id: String(e.id),
          data: JSON.stringify(e.data),
          updated_at: new Date().toISOString(),
        });
      });
    });
    writeBackup();
  }

  /** استبدال مجموعة كاملة داخل معاملة واحدة (ترحيل/تنظيف داخلي فقط — ليس لمسارات API) */
  function replaceAll(entries) {
    runInTransaction(() => {
      stmtClear.run(name);
      (entries || []).forEach((e) => {
        if (!e || e.id == null) return;
        stmtUpsert.run({
          collection: name,
          id: String(e.id),
          data: JSON.stringify(e.data),
          updated_at: new Date().toISOString(),
        });
      });
    });
    writeBackup();
  }

  /** ترحيل لمرة واحدة فقط — لا يُستدعى من مسارات API */
  function migrateFromArray(fileOrData, idField) {
    if (count() > 0) return 0;
    const field = idField || 'id';
    const listData = typeof fileOrData === 'string'
      ? readLegacyJson(fileOrData, [])
      : (Array.isArray(fileOrData) ? fileOrData : []);
    if (!Array.isArray(listData) || !listData.length) return 0;
    let n = 0;
    runInTransaction(() => {
      listData.forEach((item, i) => {
        if (!item || typeof item !== 'object') return;
        const id = String(item[field] != null ? item[field] : ('auto_' + i));
        stmtUpsert.run({
          collection: name,
          id,
          data: JSON.stringify(item),
          updated_at: String(item.updatedAt || item.createdAt || new Date().toISOString()),
        });
        n++;
      });
    });
    if (n) console.log('[doc-store] migrated ' + n + ' row(s) → ' + name);
    return n;
  }

  /** ترحيل خريطة { key: value } */
  function migrateFromMap(fileOrData) {
    if (count() > 0) return 0;
    const map = typeof fileOrData === 'string'
      ? readLegacyJson(fileOrData, {})
      : (fileOrData && typeof fileOrData === 'object' ? fileOrData : {});
    const keys = Object.keys(map || {});
    if (!keys.length) return 0;
    let n = 0;
    runInTransaction(() => {
      keys.forEach((key) => {
        stmtUpsert.run({
          collection: name,
          id: String(key),
          data: JSON.stringify(map[key]),
          updated_at: new Date().toISOString(),
        });
        n++;
      });
    });
    if (n) console.log('[doc-store] migrated ' + n + ' map key(s) → ' + name);
    return n;
  }

  /** ترحيل كائن وحيد (مثل site-config) */
  function migrateSingleton(fileOrData, singletonId) {
    const sid = singletonId || '_root';
    if (get(sid)) return 0;
    const obj = typeof fileOrData === 'string'
      ? readLegacyJson(fileOrData, null)
      : fileOrData;
    if (!obj || typeof obj !== 'object') return 0;
    upsert(sid, obj);
    console.log('[doc-store] migrated singleton → ' + name);
    return 1;
  }

  return {
    name,
    get,
    list,
    listEntries,
    asMap,
    count,
    upsert,
    remove,
    upsertMany,
    replaceAll,
    migrateFromArray,
    migrateFromMap,
    migrateSingleton,
    writeBackup,
  };
}

module.exports = {
  createCollection,
  runInTransaction,
  readLegacyJson,
  backupJson,
  DATA_DIR,
};
