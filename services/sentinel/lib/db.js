/**
 * اتصال Postgres بدور rizq_sentinel فقط.
 */
'use strict';

const { Pool } = require('pg');
const { cfg } = require('./config');

let pool = null;

function getPool() {
  if (pool) return pool;
  const c = cfg();
  if (!c.databaseUrl) {
    throw new Error('SENTINEL_DATABASE_URL or DATABASE_URL+SENTINEL_DB_PASSWORD required');
  }
  pool = new Pool({
    connectionString: c.databaseUrl,
    max: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  return pool;
}

async function query(text, params) {
  const p = getPool();
  return p.query(text, params || []);
}

async function queryOne(text, params) {
  const r = await query(text, params);
  return r.rows[0] || null;
}

async function close() {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
  }
}

module.exports = { getPool, query, queryOne, close };
