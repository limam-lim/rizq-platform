/**
 * Dual DB engine — SQLite (dev/default) or PostgreSQL (production).
 * DB_DRIVER=sqlite|postgres|pg
 *
 * Postgres uses pg.Pool (async, non-blocking). SQLite keeps node:sqlite
 * DatabaseSync for local/dev compatibility; store APIs are async wrappers.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'rizq.db');

function resolveDriver() {
  const raw = String(process.env.DB_DRIVER || process.env.DATABASE_DRIVER || 'sqlite').trim().toLowerCase();
  if (raw === 'postgres' || raw === 'pg' || raw === 'postgresql') return 'postgres';
  return 'sqlite';
}

const DRIVER = resolveDriver();
const isPostgres = DRIVER === 'postgres';

let _sqlite = null;
let _pool = null;
let _ready = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function buildPgPoolConfig() {
  const connectionString = String(process.env.DATABASE_URL || '').trim();
  const max = Math.max(2, Math.min(50, Number(process.env.PG_POOL_MAX) || 20));
  const idleTimeoutMillis = Math.max(1000, Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000);
  const connectionTimeoutMillis = Math.max(1000, Number(process.env.PG_CONNECT_TIMEOUT_MS) || 10000);
  const cfg = {
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    allowExitOnIdle: false,
  };
  if (connectionString) {
    cfg.connectionString = connectionString;
  } else {
    cfg.host = process.env.PGHOST || process.env.POSTGRES_HOST || '127.0.0.1';
    cfg.port = Number(process.env.PGPORT || process.env.POSTGRES_PORT || 5432);
    cfg.database = process.env.PGDATABASE || process.env.POSTGRES_DB || 'rizq';
    cfg.user = process.env.PGUSER || process.env.POSTGRES_USER || 'rizq';
    cfg.password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '';
  }
  if (process.env.PGSSL === 'true' || process.env.PGSSLMODE === 'require') {
    cfg.ssl = { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' };
  }
  return cfg;
}

async function initPostgres() {
  const { Pool } = require('pg');
  const pool = new Pool(buildPgPoolConfig());
  pool.on('error', (err) => {
    console.error('[db-engine] postgres pool error:', err && err.message);
  });
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    const schemaPath = path.join(__dirname, 'schema.postgres.sql');
    const ddl = fs.readFileSync(schemaPath, 'utf8');
    await client.query(ddl);
  } finally {
    client.release();
  }
  _pool = pool;
  console.log('[db-engine] PostgreSQL pool ready (max=' + (pool.options && pool.options.max) + ')');
  return pool;
}

function initSqlite() {
  ensureDataDir();
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(DB_FILE);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  _sqlite = db;
  console.log('[db-engine] SQLite ready → ' + DB_FILE);
  return db;
}

function ready() {
  if (_ready) return _ready;
  _ready = (async () => {
    if (isPostgres) {
      await initPostgres();
    } else {
      initSqlite();
    }
    return { driver: DRIVER, isPostgres };
  })();
  return _ready;
}

function getSqlite() {
  if (!_sqlite) initSqlite();
  return _sqlite;
}

function getPool() {
  if (!_pool) throw new Error('[db-engine] postgres pool not ready — call await db.ready() first');
  return _pool;
}

async function close() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
  if (_sqlite) {
    try { _sqlite.close(); } catch (e) { /* ignore */ }
    _sqlite = null;
  }
  _ready = null;
}

module.exports = {
  DRIVER,
  isPostgres,
  DATA_DIR,
  DB_FILE,
  ready,
  close,
  getSqlite,
  getPool,
  resolveDriver,
  buildPgPoolConfig,
};
