/**
 * Build a tiny SQLite fixture for migrate-sqlite-to-postgres tests.
 * Output: fixtures/sqlite-migration-fixture.db
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const out = path.join(__dirname, '..', 'fixtures', 'sqlite-migration-fixture.db');
const dir = path.dirname(out);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (fs.existsSync(out)) fs.unlinkSync(out);

const db = new DatabaseSync(out);
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
  CREATE TABLE buyers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL DEFAULT '',
    token TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT NOT NULL,
    phone_intl TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    pass_hash TEXT,
    email_lc TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE wishlist_items (
    buyer_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    added_at TEXT NOT NULL,
    PRIMARY KEY (buyer_id, item_id),
    FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE
  );
  CREATE TABLE corp_api_integrations (
    company_id TEXT PRIMARY KEY,
    api_key_hash TEXT NOT NULL,
    api_key_prefix TEXT NOT NULL,
    api_status TEXT NOT NULL DEFAULT 'active',
    allowed_origin_ip TEXT,
    last_used_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    nni TEXT NOT NULL DEFAULT '',
    suspended INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE ads (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    category TEXT NOT NULL DEFAULT '',
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE catalog_items (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending_review',
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE tenders (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending_review',
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE documents (
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (collection, id)
  );
  CREATE TABLE admin_sessions (
    token TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
`);

const now = new Date().toISOString();
db.prepare(`
  INSERT INTO buyers (id, name, phone, email, token, created_at, last_login_at, phone_intl, whatsapp, email_lc)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('buy_fix1', 'Fixture Buyer', '22123456', 'buyer@fixture.test', 'tok_fixture_1', now, now, '+22222123456', '+22222123456', 'buyer@fixture.test');

db.prepare(`INSERT INTO wishlist_items (buyer_id, item_id, added_at) VALUES (?, ?, ?)`)
  .run('buy_fix1', 'ad_fixture_1', now);

db.prepare(`
  INSERT INTO corp_api_integrations (company_id, api_key_hash, api_key_prefix, api_status, created_at, updated_at)
  VALUES (?, ?, ?, 'active', ?, ?)
`).run('acc_fix1', 'hash_fixture', 'fx01', now, now);

const acc = { id: 'acc_fix1', type: 'store', email: 'store@fixture.test', status: 'active', nni: '1234567890', suspended: false, updatedAt: now };
db.prepare(`
  INSERT INTO accounts (id, type, email, status, nni, suspended, data, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(acc.id, acc.type, acc.email, acc.status, acc.nni, 0, JSON.stringify(acc), now);

const ad = { id: 'ad_fixture_1', accountId: 'acc_fix1', status: 'live', category: 'fashion', title: 'Fixture Ad', updatedAt: now };
db.prepare(`
  INSERT INTO ads (id, account_id, status, category, data, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(ad.id, ad.accountId, ad.status, ad.category, JSON.stringify(ad), now);

const cat = { id: 'cat_fixture_1', accountId: 'acc_fix1', status: 'approved', title: 'Fixture Catalog', updatedAt: now };
db.prepare(`
  INSERT INTO catalog_items (id, account_id, status, data, updated_at)
  VALUES (?, ?, ?, ?, ?)
`).run(cat.id, cat.accountId, cat.status, JSON.stringify(cat), now);

const tender = { id: 'tnd_fixture_1', accountId: 'acc_fix1', status: 'open', title: 'Fixture Tender', updatedAt: now };
db.prepare(`
  INSERT INTO tenders (id, account_id, status, data, updated_at)
  VALUES (?, ?, ?, ?, ?)
`).run(tender.id, tender.accountId, tender.status, JSON.stringify(tender), now);

db.prepare(`
  INSERT INTO documents (collection, id, data, updated_at) VALUES (?, ?, ?, ?)
`).run('site_config', '_root', JSON.stringify({ brand: 'Rizq Fixture' }), now);

db.prepare(`
  INSERT INTO admin_sessions (token, data, expires_at) VALUES (?, ?, ?)
`).run('admin_tok_fixture', JSON.stringify({ user: 'owner', expiresAt: Date.now() + 3600000 }), Date.now() + 3600000);

db.close();
console.log('[fixture] wrote', out);
