/**
 * pg.Pool from DATABASE_URL — validate at boot when DB_DRIVER=postgres.
 * NO sync-over-async. Callers must await ready() before getPool().
 */
'use strict';

const { Pool } = require('pg');

let _pool = null;
let _ready = null;

function requireDatabaseUrl() {
  const url = String(process.env.DATABASE_URL || '').trim();
  if (!url) {
    throw new Error(
      '[db/pool] DATABASE_URL is required when DB_DRIVER=postgres — set it in .env (no default password)'
    );
  }
  return url;
}

function buildPoolConfig() {
  const connectionString = requireDatabaseUrl();
  const max = Math.max(2, Math.min(50, Number(process.env.PG_POOL_MAX) || 20));
  const idleTimeoutMillis = Math.max(1000, Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000);
  const connectionTimeoutMillis = Math.max(1000, Number(process.env.PG_CONNECT_TIMEOUT_MS) || 10000);
  const cfg = {
    connectionString,
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    allowExitOnIdle: false,
  };
  if (process.env.PGSSL === 'true' || process.env.PGSSLMODE === 'require') {
    cfg.ssl = { rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false' };
  }
  return cfg;
}

function getPool() {
  if (!_pool) {
    throw new Error('[db/pool] pool not ready — await require("./pool").ready() first');
  }
  return _pool;
}

function ready() {
  if (_ready) return _ready;
  _ready = (async () => {
    const cfg = buildPoolConfig();
    const pool = new Pool(cfg);
    pool.on('error', (err) => {
      console.error('[db/pool] unexpected error:', err && err.message);
    });
    const client = await pool.connect();
    try {
      await client.query('SELECT 1 AS ok');
    } finally {
      client.release();
    }
    _pool = pool;
    const safe = String(cfg.connectionString).replace(/:[^:@/]+@/, ':****@');
    console.log('[db/pool] ready max=' + cfg.max + ' url=' + safe);
    return pool;
  })();
  return _ready;
}

async function close() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
  _ready = null;
}

module.exports = {
  ready,
  getPool,
  close,
  buildPoolConfig,
  requireDatabaseUrl,
};
