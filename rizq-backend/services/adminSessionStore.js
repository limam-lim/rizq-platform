/**
 * جلسات الأدمن — SQLite بدل Map في الذاكرة فقط.
 * يبقى واجهة Map-like متوافقة مع adminAuth / adminCore.
 */
'use strict';

const { db } = require('../db');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_sessions (
    token      TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_admin_sessions_exp ON admin_sessions(expires_at);
`);

function rowToSess(row) {
  if (!row) return undefined;
  try {
    const data = JSON.parse(row.data);
    if (!data || typeof data !== 'object') return undefined;
    data.expiresAt = Number(row.expires_at) || data.expiresAt;
    return data;
  } catch (e) {
    return undefined;
  }
}

function createAdminSessionStore() {
  const api = {
    get(token) {
      if (!token) return undefined;
      const row = db.prepare('SELECT token, data, expires_at FROM admin_sessions WHERE token = ?').get(String(token));
      const sess = rowToSess(row);
      if (!sess) return undefined;
      if (sess.expiresAt && sess.expiresAt < Date.now()) {
        api.delete(token);
        return undefined;
      }
      return sess;
    },
    set(token, sess) {
      if (!token || !sess) return api;
      const expiresAt = Number(sess.expiresAt) || (Date.now() + 12 * 60 * 60 * 1000);
      db.prepare(
        'INSERT INTO admin_sessions (token, data, expires_at) VALUES (?, ?, ?) '
        + 'ON CONFLICT(token) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at'
      ).run(String(token), JSON.stringify(sess), expiresAt);
      return api;
    },
    delete(token) {
      if (!token) return false;
      const info = db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(String(token));
      return info.changes > 0;
    },
    clear() {
      db.prepare('DELETE FROM admin_sessions').run();
    },
    /** توافق for...of مع Map: [token, sess] */
    [Symbol.iterator]() {
      const rows = db.prepare('SELECT token, data, expires_at FROM admin_sessions').all();
      const entries = [];
      for (const row of rows) {
        const sess = rowToSess(row);
        if (sess) entries.push([row.token, sess]);
      }
      return entries[Symbol.iterator]();
    },
    forEach(fn) {
      for (const [tok, sess] of api) fn(sess, tok, api);
    },
    get size() {
      const row = db.prepare('SELECT COUNT(*) AS n FROM admin_sessions').get();
      return row ? Number(row.n) || 0 : 0;
    },
  };
  return api;
}

module.exports = { createAdminSessionStore };
