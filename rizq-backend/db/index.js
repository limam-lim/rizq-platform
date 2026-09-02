/**
 * rizq-backend/db — SQLite (ملف واحد في data/rizq.db)
 * يستخدم node:sqlite المدمج في Node 22+ — بدون تبعيات native
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'rizq.db');
const LEGACY_BUYERS = path.join(DATA_DIR, 'buyers.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS buyers (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    phone         TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL DEFAULT '',
    token         TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    last_login_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_buyers_phone ON buyers(phone);
  CREATE INDEX IF NOT EXISTS idx_buyers_token ON buyers(token);

  CREATE TABLE IF NOT EXISTS wishlist_items (
    buyer_id  TEXT NOT NULL,
    item_id   TEXT NOT NULL,
    added_at  TEXT NOT NULL,
    PRIMARY KEY (buyer_id, item_id),
    FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_wishlist_buyer ON wishlist_items(buyer_id);

  CREATE TABLE IF NOT EXISTS corp_api_integrations (
    company_id        TEXT PRIMARY KEY,
    api_key_hash      TEXT NOT NULL,
    api_key_prefix    TEXT NOT NULL,
    api_status        TEXT NOT NULL DEFAULT 'active'
                      CHECK (api_status IN ('active', 'suspended')),
    allowed_origin_ip TEXT,
    last_used_at      TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_corp_api_prefix ON corp_api_integrations(api_key_prefix);
  CREATE INDEX IF NOT EXISTS idx_corp_api_status ON corp_api_integrations(api_status);
`);

function migrateLegacyBuyersJson() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM buyers').get().n;
  if (count > 0 || !fs.existsSync(LEGACY_BUYERS)) return 0;
  let list;
  try { list = JSON.parse(fs.readFileSync(LEGACY_BUYERS, 'utf8')); } catch (e) { return 0; }
  if (!Array.isArray(list) || !list.length) return 0;
  const ins = db.prepare(`
    INSERT OR IGNORE INTO buyers (id, name, phone, email, token, created_at, last_login_at)
    VALUES (@id, @name, @phone, @email, @token, @created_at, @last_login_at)
  `);
  let n = 0;
  const tx = db.transaction((rows) => {
    rows.forEach((b) => {
      if (!b || !b.id || !b.phone || !b.token) return;
      const r = ins.run({
        id: String(b.id),
        name: String(b.name || '').slice(0, 120),
        phone: String(b.phone).replace(/\D/g, '').slice(-8),
        email: String(b.email || '').slice(0, 120),
        token: String(b.token),
        created_at: b.createdAt || b.created_at || new Date().toISOString(),
        last_login_at: b.lastLoginAt || b.last_login_at || new Date().toISOString(),
      });
      if (r.changes) n++;
    });
  });
  tx(list);
  if (n) console.log('[rizq-db] migrated ' + n + ' buyer(s) from buyers.json');
  return n;
}

migrateLegacyBuyersJson();

function migrateBuyerColumns() {
  try {
    const cols = db.prepare('PRAGMA table_info(buyers)').all();
    const names = cols.map((c) => c.name);
    if (!names.includes('phone_intl')) {
      db.exec("ALTER TABLE buyers ADD COLUMN phone_intl TEXT NOT NULL DEFAULT ''");
    }
    if (!names.includes('whatsapp')) {
      db.exec("ALTER TABLE buyers ADD COLUMN whatsapp TEXT NOT NULL DEFAULT ''");
    }
  } catch (e) {
    console.warn('[rizq-db] buyer column migration:', e.message);
  }
}
migrateBuyerColumns();

module.exports = { db, DB_FILE, DATA_DIR };
