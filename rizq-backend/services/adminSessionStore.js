/**
 * Admin sessions — async Map-like API over PostgreSQL.
 * get / set / delete / clear / entries / size are all async.
 */
'use strict';

const sql = require('../db/sql');

function rowToSess(row) {
  if (!row) return undefined;
  try {
    const data = typeof row.data === 'object' ? row.data : JSON.parse(row.data);
    if (!data || typeof data !== 'object') return undefined;
    data.expiresAt = Number(row.expires_at) || data.expiresAt;
    return data;
  } catch (e) {
    return undefined;
  }
}

function createAdminSessionStore() {
  const api = {
    async get(token) {
      if (!token) return undefined;
      const row = await sql.queryOne(
        'SELECT token, data, expires_at FROM admin_sessions WHERE token = ?',
        [String(token)]
      );
      const sess = rowToSess(row);
      if (!sess) return undefined;
      if (sess.expiresAt && sess.expiresAt < Date.now()) {
        await api.delete(token);
        return undefined;
      }
      return sess;
    },
    async set(token, sess) {
      if (!token || !sess) return api;
      const expiresAt = Number(sess.expiresAt) || (Date.now() + 12 * 60 * 60 * 1000);
      await sql.execute(
        `INSERT INTO admin_sessions (token, data, expires_at) VALUES (?, ?::jsonb, ?)
         ON CONFLICT (token) DO UPDATE SET
           data = EXCLUDED.data,
           expires_at = EXCLUDED.expires_at,
           updated_at_ts = NOW()`,
        [String(token), JSON.stringify(sess), expiresAt]
      );
      return api;
    },
    async delete(token) {
      if (!token) return false;
      const info = await sql.execute(
        'DELETE FROM admin_sessions WHERE token = ?',
        [String(token)]
      );
      return info.changes > 0;
    },
    async clear() {
      await sql.execute('DELETE FROM admin_sessions');
    },
    async entries() {
      const rows = await sql.query('SELECT token, data, expires_at FROM admin_sessions');
      const out = [];
      for (const row of rows) {
        const sess = rowToSess(row);
        if (sess) out.push([row.token, sess]);
      }
      return out;
    },
    async forEach(fn) {
      const entries = await api.entries();
      for (const [tok, sess] of entries) {
        await fn(sess, tok, api);
      }
    },
    async size() {
      const row = await sql.queryOne('SELECT COUNT(*)::int AS n FROM admin_sessions');
      return row ? Number(row.n) || 0 : 0;
    },
  };
  return api;
}

module.exports = { createAdminSessionStore };
