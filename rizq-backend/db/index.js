/**
 * rizq-backend/db — PostgreSQL (async) entry.
 * isPostgres=true always for this code path. Migrations via npm run migrate
 * (or RUN_MIGRATIONS_ON_BOOT=1 during ready()).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const poolMod = require('./pool');
const sql = require('./sql');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'rizq.db'); // legacy path for migrate-sqlite-to-postgres

const DRIVER = 'postgres';
const isPostgres = true;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function assertPostgresDriver() {
  const raw = String(process.env.DB_DRIVER || process.env.DATABASE_DRIVER || 'postgres').trim().toLowerCase();
  if (raw && raw !== 'postgres' && raw !== 'pg' && raw !== 'postgresql') {
    console.warn('[rizq-db] DB_DRIVER=' + raw + ' ignored — this build is postgres-only (async)');
  }
  if (!String(process.env.DATABASE_URL || '').trim()) {
    throw new Error(
      '[rizq-db] DATABASE_URL missing — required when DB_DRIVER=postgres (crash at boot)'
    );
  }
}

// Crash at boot / first require when postgres driver has no URL.
assertPostgresDriver();

async function runMigrationsIfConfigured() {
  const flag = String(process.env.RUN_MIGRATIONS_ON_BOOT || '').trim();
  if (flag !== '1' && flag.toLowerCase() !== 'true') return;
  const { spawn } = require('child_process');
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(__dirname, '..', 'node_modules', 'node-pg-migrate', 'bin', 'node-pg-migrate.js'),
        'up',
        '-m',
        path.join(__dirname, '..', 'migrations'),
        '--database-url-var',
        'DATABASE_URL',
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: process.env,
        stdio: 'inherit',
      }
    );
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('[rizq-db] migrate on boot failed exit=' + code));
    });
    child.on('error', reject);
  });
}

let _ready = null;

function ready() {
  if (_ready) return _ready;
  _ready = (async () => {
    assertPostgresDriver();
    await poolMod.ready();
    await runMigrationsIfConfigured();
    console.log('[rizq-db] PostgreSQL driver active (async)');
    return { driver: DRIVER, isPostgres: true };
  })();
  return _ready;
}

function getPool() {
  return poolMod.getPool();
}

async function close() {
  await poolMod.close();
  _ready = null;
}

module.exports = {
  ready,
  getPool,
  close,
  DATA_DIR,
  DB_FILE,
  DRIVER,
  isPostgres,
  sql,
  pool: poolMod,
  /** Sync DatabaseSync is SQLite-only — removed in postgres-v2 */
  get db() {
    throw new Error('[rizq-db] sync db handle removed — use await sql.query / models async API');
  },
};
