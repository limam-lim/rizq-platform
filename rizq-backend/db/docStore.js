/**
 * Document store — async PostgreSQL (pg.Pool).
 * All createCollection methods return Promises.
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

async function runInTransaction(fn) {
  return sql.withTransaction(fn);
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

  async function get(id) {
    const key = String(id || '');
    if (!key) return null;
    const row = await sql.queryOne(
      'SELECT data FROM documents WHERE collection = ? AND id = ?',
      [name, key]
    );
    return row ? safeParse(row.data, null) : null;
  }

  async function list() {
    const rows = await sql.query(
      'SELECT data FROM documents WHERE collection = ?',
      [name]
    );
    return rows.map((r) => safeParse(r.data, null)).filter((x) => x != null);
  }

  async function listEntries() {
    const rows = await sql.query(
      'SELECT id, data FROM documents WHERE collection = ?',
      [name]
    );
    return rows
      .map((r) => ({ id: r.id, data: safeParse(r.data, null) }))
      .filter((e) => e.data != null);
  }

  async function asMap() {
    const out = {};
    const entries = await listEntries();
    entries.forEach((e) => { out[e.id] = e.data; });
    return out;
  }

  async function count() {
    const row = await sql.queryOne(
      'SELECT COUNT(*)::int AS n FROM documents WHERE collection = ?',
      [name]
    );
    return Number(row && row.n) || 0;
  }

  async function writeBackup() {
    if (!backupFile) return;
    try {
      const entries = await listEntries();
      const payload = onBackup ? onBackup(entries) : await list();
      backupJson(backupFile, payload);
    } catch (e) {
      console.warn('[doc-store] backup build failed:', name, e && e.message);
    }
  }

  async function upsert(id, data, opts) {
    const key = String(id || '');
    if (!key) return null;
    const now = new Date().toISOString();
    await sql.execute(
      `INSERT INTO documents (collection, id, data, updated_at)
       VALUES (?, ?, ?::jsonb, ?)
       ON CONFLICT (collection, id) DO UPDATE SET
         data = EXCLUDED.data,
         updated_at = EXCLUDED.updated_at,
         updated_at_ts = NOW()`,
      [name, key, encodeData(data), now]
    );
    if (!(opts && opts.skipBackup)) await writeBackup();
    return data;
  }

  async function insertIfAbsent(id, data, opts) {
    const key = String(id || '');
    if (!key) return { inserted: false, data: null };
    const now = new Date().toISOString();
    const r = await sql.execute(
      `INSERT INTO documents (collection, id, data, updated_at)
       VALUES (?, ?, ?::jsonb, ?)
       ON CONFLICT (collection, id) DO NOTHING`,
      [name, key, encodeData(data), now]
    );
    if (r.changes > 0) {
      if (!(opts && opts.skipBackup)) await writeBackup();
      return { inserted: true, data };
    }
    return { inserted: false, data: await get(key) };
  }

  async function remove(id, opts) {
    const key = String(id || '');
    if (!key) return false;
    const r = await sql.execute(
      'DELETE FROM documents WHERE collection = ? AND id = ?',
      [name, key]
    );
    if (r.changes && !(opts && opts.skipBackup)) await writeBackup();
    return r.changes > 0;
  }

  async function upsertMany(entries) {
    await runInTransaction(async (tx) => {
      for (const e of entries || []) {
        if (!e || e.id == null) continue;
        await tx.execute(
          `INSERT INTO documents (collection, id, data, updated_at)
           VALUES (?, ?, ?::jsonb, ?)
           ON CONFLICT (collection, id) DO UPDATE SET
             data = EXCLUDED.data,
             updated_at = EXCLUDED.updated_at,
             updated_at_ts = NOW()`,
          [name, String(e.id), encodeData(e.data), new Date().toISOString()]
        );
      }
    });
    await writeBackup();
  }

  async function replaceAll(entries) {
    await runInTransaction(async (tx) => {
      await tx.execute('DELETE FROM documents WHERE collection = ?', [name]);
      for (const e of entries || []) {
        if (!e || e.id == null) continue;
        await tx.execute(
          `INSERT INTO documents (collection, id, data, updated_at)
           VALUES (?, ?, ?::jsonb, ?)`,
          [name, String(e.id), encodeData(e.data), new Date().toISOString()]
        );
      }
    });
    await writeBackup();
  }

  async function migrateFromArray(fileOrData, idField) {
    if ((await count()) > 0) return 0;
    const field = idField || 'id';
    const listData = typeof fileOrData === 'string'
      ? readLegacyJson(fileOrData, [])
      : (Array.isArray(fileOrData) ? fileOrData : []);
    if (!Array.isArray(listData) || !listData.length) return 0;
    let n = 0;
    await runInTransaction(async (tx) => {
      for (let i = 0; i < listData.length; i++) {
        const item = listData[i];
        if (!item || typeof item !== 'object') continue;
        const id = String(item[field] != null ? item[field] : ('auto_' + i));
        await tx.execute(
          `INSERT INTO documents (collection, id, data, updated_at)
           VALUES (?, ?, ?::jsonb, ?)
           ON CONFLICT (collection, id) DO NOTHING`,
          [name, id, encodeData(item), String(item.updatedAt || item.createdAt || new Date().toISOString())]
        );
        n++;
      }
    });
    if (n) console.log('[doc-store] migrated ' + n + ' row(s) → ' + name);
    return n;
  }

  async function migrateFromMap(fileOrData) {
    if ((await count()) > 0) return 0;
    const map = typeof fileOrData === 'string'
      ? readLegacyJson(fileOrData, {})
      : (fileOrData && typeof fileOrData === 'object' ? fileOrData : {});
    const keys = Object.keys(map || {});
    if (!keys.length) return 0;
    let n = 0;
    await runInTransaction(async (tx) => {
      for (const key of keys) {
        await tx.execute(
          `INSERT INTO documents (collection, id, data, updated_at)
           VALUES (?, ?, ?::jsonb, ?)
           ON CONFLICT (collection, id) DO NOTHING`,
          [name, String(key), encodeData(map[key]), new Date().toISOString()]
        );
        n++;
      }
    });
    if (n) console.log('[doc-store] migrated ' + n + ' map key(s) → ' + name);
    return n;
  }

  async function migrateSingleton(fileOrData, singletonId) {
    const sid = singletonId || '_root';
    if (await get(sid)) return 0;
    const obj = typeof fileOrData === 'string'
      ? readLegacyJson(fileOrData, null)
      : fileOrData;
    if (!obj || typeof obj !== 'object') return 0;
    await upsert(sid, obj);
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
    insertIfAbsent,
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
