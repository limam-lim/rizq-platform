#!/usr/bin/env node
/**
 * Copy SQLite rizq.db → PostgreSQL (idempotent UPSERTs).
 *
 * Usage:
 *   node scripts/migrate-sqlite-to-postgres.js
 *   node scripts/migrate-sqlite-to-postgres.js --db /path/to/rizq.db
 *
 * Requires DATABASE_URL and applied migrations (npm run migrate).
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const dbMod = require('../db');
const sql = require('../db/sql');

function argVal(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  return process.argv[i + 1] || null;
}

function tableExists(sqlite, name) {
  const row = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
  ).get(name);
  return !!row;
}

function countSqlite(sqlite, table) {
  if (!tableExists(sqlite, table)) return 0;
  return Number(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n) || 0;
}

async function countPg(table) {
  const row = await sql.queryOne(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return Number(row && row.n) || 0;
}

function parseJsonCol(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

async function migrateBuyers(sqlite) {
  if (!tableExists(sqlite, 'buyers')) return 0;
  const rows = sqlite.prepare('SELECT * FROM buyers').all();
  let n = 0;
  for (const r of rows) {
    await sql.execute(
      `INSERT INTO buyers (id, name, phone, email, token, created_at, last_login_at,
        phone_intl, whatsapp, pass_hash, email_lc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email,
         token = EXCLUDED.token, created_at = EXCLUDED.created_at,
         last_login_at = EXCLUDED.last_login_at, phone_intl = EXCLUDED.phone_intl,
         whatsapp = EXCLUDED.whatsapp, pass_hash = EXCLUDED.pass_hash,
         email_lc = EXCLUDED.email_lc, updated_at_ts = NOW()`,
      [
        r.id, r.name, r.phone, r.email || '', r.token, r.created_at, r.last_login_at,
        r.phone_intl || '', r.whatsapp || '', r.pass_hash || null, r.email_lc || '',
      ]
    );
    n++;
  }
  return n;
}

async function migrateWishlist(sqlite) {
  if (!tableExists(sqlite, 'wishlist_items')) return 0;
  const rows = sqlite.prepare('SELECT * FROM wishlist_items').all();
  let n = 0;
  for (const r of rows) {
    await sql.execute(
      `INSERT INTO wishlist_items (buyer_id, item_id, added_at)
       VALUES (?, ?, ?)
       ON CONFLICT (buyer_id, item_id) DO UPDATE SET added_at = EXCLUDED.added_at`,
      [r.buyer_id, r.item_id, r.added_at]
    );
    n++;
  }
  return n;
}

async function migrateCorp(sqlite) {
  if (!tableExists(sqlite, 'corp_api_integrations')) return 0;
  const rows = sqlite.prepare('SELECT * FROM corp_api_integrations').all();
  let n = 0;
  for (const r of rows) {
    await sql.execute(
      `INSERT INTO corp_api_integrations (
         company_id, api_key_hash, api_key_prefix, api_status,
         allowed_origin_ip, last_used_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (company_id) DO UPDATE SET
         api_key_hash = EXCLUDED.api_key_hash,
         api_key_prefix = EXCLUDED.api_key_prefix,
         api_status = EXCLUDED.api_status,
         allowed_origin_ip = EXCLUDED.allowed_origin_ip,
         last_used_at = EXCLUDED.last_used_at,
         updated_at = EXCLUDED.updated_at,
         updated_at_ts = NOW()`,
      [
        r.company_id, r.api_key_hash, r.api_key_prefix, r.api_status || 'active',
        r.allowed_origin_ip || null, r.last_used_at || null, r.created_at, r.updated_at,
      ]
    );
    n++;
  }
  return n;
}

async function migrateJsonbEntity(sqlite, table, cols, buildParams) {
  if (!tableExists(sqlite, table)) return 0;
  const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
  let n = 0;
  for (const r of rows) {
    await buildParams(r);
    n++;
  }
  return n;
}

async function migrateAccounts(sqlite) {
  return migrateJsonbEntity(sqlite, 'accounts', null, async (r) => {
    const data = typeof r.data === 'string' ? r.data : JSON.stringify(parseJsonCol(r.data) || {});
    await sql.execute(
      `INSERT INTO accounts (id, type, email, status, nni, suspended, data, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?)
       ON CONFLICT (id) DO UPDATE SET
         type = EXCLUDED.type, email = EXCLUDED.email, status = EXCLUDED.status,
         nni = EXCLUDED.nni, suspended = EXCLUDED.suspended, data = EXCLUDED.data,
         updated_at = EXCLUDED.updated_at, updated_at_ts = NOW()`,
      [r.id, r.type || '', r.email || '', r.status || 'pending', r.nni || '', r.suspended || 0, data, r.updated_at]
    );
  });
}

async function migrateAds(sqlite) {
  return migrateJsonbEntity(sqlite, 'ads', null, async (r) => {
    const data = typeof r.data === 'string' ? r.data : JSON.stringify(parseJsonCol(r.data) || {});
    await sql.execute(
      `INSERT INTO ads (id, account_id, status, category, data, updated_at)
       VALUES (?, ?, ?, ?, ?::jsonb, ?)
       ON CONFLICT (id) DO UPDATE SET
         account_id = EXCLUDED.account_id, status = EXCLUDED.status,
         category = EXCLUDED.category, data = EXCLUDED.data,
         updated_at = EXCLUDED.updated_at, updated_at_ts = NOW()`,
      [r.id, r.account_id || '', r.status || 'pending', r.category || '', data, r.updated_at]
    );
  });
}

async function migrateCatalog(sqlite) {
  return migrateJsonbEntity(sqlite, 'catalog_items', null, async (r) => {
    const data = typeof r.data === 'string' ? r.data : JSON.stringify(parseJsonCol(r.data) || {});
    await sql.execute(
      `INSERT INTO catalog_items (id, account_id, status, data, updated_at)
       VALUES (?, ?, ?, ?::jsonb, ?)
       ON CONFLICT (id) DO UPDATE SET
         account_id = EXCLUDED.account_id, status = EXCLUDED.status,
         data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, updated_at_ts = NOW()`,
      [r.id, r.account_id || '', r.status || 'pending_review', data, r.updated_at]
    );
  });
}

async function migrateTenders(sqlite) {
  return migrateJsonbEntity(sqlite, 'tenders', null, async (r) => {
    const data = typeof r.data === 'string' ? r.data : JSON.stringify(parseJsonCol(r.data) || {});
    await sql.execute(
      `INSERT INTO tenders (id, account_id, status, data, updated_at)
       VALUES (?, ?, ?, ?::jsonb, ?)
       ON CONFLICT (id) DO UPDATE SET
         account_id = EXCLUDED.account_id, status = EXCLUDED.status,
         data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, updated_at_ts = NOW()`,
      [r.id, r.account_id || '', r.status || 'pending_review', data, r.updated_at]
    );
  });
}

async function migrateDocuments(sqlite) {
  if (!tableExists(sqlite, 'documents')) return 0;
  const rows = sqlite.prepare('SELECT * FROM documents').all();
  let n = 0;
  for (const r of rows) {
    const data = typeof r.data === 'string' ? r.data : JSON.stringify(parseJsonCol(r.data) || {});
    await sql.execute(
      `INSERT INTO documents (collection, id, data, updated_at)
       VALUES (?, ?, ?::jsonb, ?)
       ON CONFLICT (collection, id) DO UPDATE SET
         data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, updated_at_ts = NOW()`,
      [r.collection, r.id, data, r.updated_at]
    );
    n++;
  }
  return n;
}

async function migrateAdminSessions(sqlite) {
  if (!tableExists(sqlite, 'admin_sessions')) return 0;
  const rows = sqlite.prepare('SELECT * FROM admin_sessions').all();
  let n = 0;
  for (const r of rows) {
    const data = typeof r.data === 'string' ? r.data : JSON.stringify(parseJsonCol(r.data) || {});
    await sql.execute(
      `INSERT INTO admin_sessions (token, data, expires_at)
       VALUES (?, ?::jsonb, ?)
       ON CONFLICT (token) DO UPDATE SET
         data = EXCLUDED.data, expires_at = EXCLUDED.expires_at, updated_at_ts = NOW()`,
      [r.token, data, Number(r.expires_at) || 0]
    );
    n++;
  }
  return n;
}

async function main() {
  const dbPath = argVal('--db') || dbMod.DB_FILE;
  if (!fs.existsSync(dbPath)) {
    console.error('[migrate-sqlite-to-pg] SQLite file not found:', dbPath);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('[migrate-sqlite-to-pg] DATABASE_URL required');
    process.exit(1);
  }

  console.log('[migrate-sqlite-to-pg] source:', dbPath);
  await dbMod.ready();

  const sqlite = new DatabaseSync(dbPath, { readOnly: true });
  const tables = [
    'buyers', 'wishlist_items', 'corp_api_integrations',
    'accounts', 'ads', 'catalog_items', 'tenders',
    'documents', 'admin_sessions',
  ];

  const before = {};
  for (const t of tables) before[t] = { sqlite: countSqlite(sqlite, t), pg: await countPg(t) };

  const written = {
    buyers: await migrateBuyers(sqlite),
    wishlist_items: await migrateWishlist(sqlite),
    corp_api_integrations: await migrateCorp(sqlite),
    accounts: await migrateAccounts(sqlite),
    ads: await migrateAds(sqlite),
    catalog_items: await migrateCatalog(sqlite),
    tenders: await migrateTenders(sqlite),
    documents: await migrateDocuments(sqlite),
    admin_sessions: await migrateAdminSessions(sqlite),
  };

  console.log('\n=== Row-count comparison ===');
  console.log(
    'table'.padEnd(28),
    'sqlite'.padStart(8),
    'pg_before'.padStart(10),
    'written'.padStart(8),
    'pg_after'.padStart(10),
    'status'
  );
  let ok = true;
  for (const t of tables) {
    const pgAfter = await countPg(t);
    // Idempotent migrate: PG may already hold extra rows; require pg >= sqlite
    // and that we attempted to write every sqlite row.
    const covered = pgAfter >= before[t].sqlite && written[t] >= before[t].sqlite;
    const status = covered ? 'OK' : 'DIFF';
    if (status !== 'OK') ok = false;
    console.log(
      t.padEnd(28),
      String(before[t].sqlite).padStart(8),
      String(before[t].pg).padStart(10),
      String(written[t]).padStart(8),
      String(pgAfter).padStart(10),
      status
    );
  }

  try { sqlite.close(); } catch (e) { /* ignore */ }
  await dbMod.close();
  if (!ok) {
    console.error('\n[migrate-sqlite-to-pg] row-count check failed');
    process.exitCode = 1;
  } else {
    console.log('\n[migrate-sqlite-to-pg] done (idempotent; pg_after >= sqlite per table)');
  }
}

main().catch((e) => {
  console.error('[migrate-sqlite-to-pg] failed:', e);
  process.exit(1);
});
