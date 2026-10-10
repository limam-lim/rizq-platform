/**
 * Document store — PostgreSQL sync facade (Pool + parameterized SQL).
 * API matches docStore.sqlite for zero call-site changes.
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

function runInTransaction(fn) {
  return sql.withTransactionSync(fn);
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
    const safe = scrubSecretsForBackup(data);
    fs.writeFileSync(tmp, JSON.stringify(safe, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  } catch (e) {
    console.warn('[doc-store.pg] backup failed:', file, e && e.message);
  }
}

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
    const row = sql.queryOneSync(
      'SELECT data FROM documents WHERE collection = ? AND id = ?',
      [name, key]
    );
    return row ? safeParse(row.data, null) : null;
  }

  function list() {
    return sql.querySync('SELECT data FROM documents WHERE collection = ?', [name])
      .map((r) => safeParse(r.data, null))
      .filter((x) => x != null);
  }

  function listEntries() {
    return sql.querySync('SELECT id, data FROM documents WHERE collection = ?', [name])
      .map((r) => ({ id: r.id, data: safeParse(r.data, null) }))
      .filter((e) => e.data != null);
  }

  function asMap() {
    const out = {};
    listEntries().forEach((e) => { out[e.id] = e.data; });
    return out;
  }

  function count() {
    const row = sql.queryOneSync(
      'SELECT COUNT(*)::int AS n FROM documents WHERE collection = ?',
      [name]
    );
    return Number(row && row.n) || 0;
  }

  function writeBackup() {
    if (!backupFile) return;
    try {
      const payload = onBackup ? onBackup(listEntries()) : list();
      backupJson(backupFile, payload);
    } catch (e) {
      console.warn('[doc-store.pg] backup build failed:', name, e && e.message);
    }
  }

  function upsert(id, data, opts) {
    const key = String(id || '');
    if (!key) return null;
    const now = new Date().toISOString();
    sql.executeSync(
      `INSERT INTO documents (collection, id, data, updated_at)
       VALUES (?, ?, ?::jsonb, ?)
       ON CONFLICT (collection, id) DO UPDATE SET
         data = EXCLUDED.data,
         updated_at = EXCLUDED.updated_at`,
      [name, key, encodeData(data), now]
    );
    if (!(opts && opts.skipBackup)) writeBackup();
    return data;
  }

  function insertIfAbsent(id, data, opts) {
    const key = String(id || '');
    if (!key) return { inserted: false, data: null };
    const now = new Date().toISOString();
    const r = sql.executeSync(
      `INSERT INTO documents (collection, id, data, updated_at)
       VALUES (?, ?, ?::jsonb, ?)
       ON CONFLICT (collection, id) DO NOTHING`,
      [name, key, encodeData(data), now]
    );
    if (r.changes > 0) {
      if (!(opts && opts.skipBackup)) writeBackup();
      return { inserted: true, data };
    }
    return { inserted: false, data: get(key) };
  }

  function remove(id, opts) {
    const key = String(id || '');
    if (!key) return false;
    const r = sql.executeSync(
      'DELETE FROM documents WHERE collection = ? AND id = ?',
      [name, key]
    );
    if (r.changes && !(opts && opts.skipBackup)) writeBackup();
    return r.changes > 0;
  }

  function upsertMany(entries) {
    runInTransaction((tx) => {
      (entries || []).forEach((e) => {
        if (!e || e.id == null) return;
        tx.execute(
          `INSERT INTO documents (collection, id, data, updated_at)
           VALUES (?, ?, ?::jsonb, ?)
           ON CONFLICT (collection, id) DO UPDATE SET
             data = EXCLUDED.data,
             updated_at = EXCLUDED.updated_at`,
          [name, String(e.id), encodeData(e.data), new Date().toISOString()]
        );
      });
    });
    writeBackup();
  }

  function replaceAll(entries) {
    runInTransaction((tx) => {
      tx.execute('DELETE FROM documents WHERE collection = ?', [name]);
      (entries || []).forEach((e) => {
        if (!e || e.id == null) return;
        tx.execute(
          `INSERT INTO documents (collection, id, data, updated_at)
           VALUES (?, ?, ?::jsonb, ?)`,
          [name, String(e.id), encodeData(e.data), new Date().toISOString()]
        );
      });
    });
    writeBackup();
  }

  function migrateFromArray(fileOrData, idField) {
    if (count() > 0) return 0;
    const field = idField || 'id';
    const listData = typeof fileOrData === 'string'
      ? readLegacyJson(fileOrData, [])
      : (Array.isArray(fileOrData) ? fileOrData : []);
    if (!Array.isArray(listData) || !listData.length) return 0;
    let n = 0;
    runInTransaction((tx) => {
      listData.forEach((item, i) => {
        if (!item || typeof item !== 'object') return;
        const id = String(item[field] != null ? item[field] : ('auto_' + i));
        tx.execute(
          `INSERT INTO documents (collection, id, data, updated_at)
           VALUES (?, ?, ?::jsonb, ?)
           ON CONFLICT (collection, id) DO NOTHING`,
          [name, id, encodeData(item), String(item.updatedAt || item.createdAt || new Date().toISOString())]
        );
        n++;
      });
    });
    if (n) console.log('[doc-store.pg] migrated ' + n + ' row(s) → ' + name);
    return n;
  }

  function migrateFromMap(fileOrData) {
    if (count() > 0) return 0;
    const map = typeof fileOrData === 'string'
      ? readLegacyJson(fileOrData, {})
      : (fileOrData && typeof fileOrData === 'object' ? fileOrData : {});
    const keys = Object.keys(map || {});
    if (!keys.length) return 0;
    let n = 0;
    runInTransaction((tx) => {
      keys.forEach((key) => {
        tx.execute(
          `INSERT INTO documents (collection, id, data, updated_at)
           VALUES (?, ?, ?::jsonb, ?)
           ON CONFLICT (collection, id) DO NOTHING`,
          [name, String(key), encodeData(map[key]), new Date().toISOString()]
        );
        n++;
      });
    });
    if (n) console.log('[doc-store.pg] migrated ' + n + ' map key(s) → ' + name);
    return n;
  }

  function migrateSingleton(fileOrData, singletonId) {
    const sid = singletonId || '_root';
    if (get(sid)) return 0;
    const obj = typeof fileOrData === 'string'
      ? readLegacyJson(fileOrData, null)
      : fileOrData;
    if (!obj || typeof obj !== 'object') return 0;
    upsert(sid, obj);
    console.log('[doc-store.pg] migrated singleton → ' + name);
    return 1;
  }

  return {
    name, get, list, listEntries, asMap, count, upsert, insertIfAbsent,
    remove, upsertMany, replaceAll, migrateFromArray, migrateFromMap,
    migrateSingleton, writeBackup,
  };
}

module.exports = {
  createCollection,
  runInTransaction,
  readLegacyJson,
  backupJson,
  DATA_DIR,
};
