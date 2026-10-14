/**
 * rizq-backend/db — Dual driver entry
 * DB_DRIVER=sqlite (default) | postgres|pg
 */
'use strict';

const engine = require('./engine');

if (engine.isPostgres) {
  const fs = require('fs');
  const sql = require('./sql');
  const DATA_DIR = engine.DATA_DIR;
  const DB_FILE = engine.DB_FILE;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  async function initSchema() {
    await engine.ready();
    try {
      await sql.execScript(`
        ALTER TABLE buyers ADD COLUMN IF NOT EXISTS phone_intl TEXT NOT NULL DEFAULT '';
        ALTER TABLE buyers ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT '';
        ALTER TABLE buyers ADD COLUMN IF NOT EXISTS pass_hash TEXT;
        ALTER TABLE buyers ADD COLUMN IF NOT EXISTS email_lc TEXT NOT NULL DEFAULT '';
      `);
    } catch (e) {
      console.warn('[rizq-db] pg buyer columns:', e.message);
    }
    console.log('[rizq-db] PostgreSQL driver active');
  }

  const ready = initSchema();

  module.exports = {
    get db() {
      throw new Error('[rizq-db] sync DatabaseSync handle is SQLite-only — models use db/sql under postgres');
    },
    DB_FILE,
    DATA_DIR,
    ready,
    close: () => engine.close(),
    DRIVER: engine.DRIVER,
    isPostgres: true,
    sql,
    engine,
  };
} else {
  const sqlite = require('./index.sqlite');
  module.exports = Object.assign({}, sqlite, {
    ready: Promise.resolve({ driver: 'sqlite', isPostgres: false }),
    close: async () => {
      try { if (sqlite.db && typeof sqlite.db.close === 'function') sqlite.db.close(); } catch (e) { /* ignore */ }
    },
    DRIVER: 'sqlite',
    isPostgres: false,
    sql: require('./sql'),
    engine,
  });
}
