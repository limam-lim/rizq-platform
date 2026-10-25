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
  db.exec('BEGIN');
  try {
    list.forEach((b) => {
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
    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch (e2) {}
    throw e;
  }
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
    if (!names.includes('pass_hash')) {
      db.exec('ALTER TABLE buyers ADD COLUMN pass_hash TEXT');
    }
    if (!names.includes('email_lc')) {
      db.exec("ALTER TABLE buyers ADD COLUMN email_lc TEXT NOT NULL DEFAULT ''");
      db.exec("UPDATE buyers SET email_lc = lower(trim(email)) WHERE email_lc = '' AND email != ''");
      try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_buyers_email_lc ON buyers(email_lc) WHERE email_lc != \'\''); } catch (eIdx) { /* optional */ }
    }
  } catch (e) {
    console.warn('[rizq-db] buyer column migration:', e.message);
  }
}
migrateBuyerColumns();

db.exec(`
  CREATE TABLE IF NOT EXISTS user_passkeys (
    id              TEXT PRIMARY KEY,
    user_kind       TEXT NOT NULL CHECK (user_kind IN ('buyer', 'seller')),
    user_id         TEXT NOT NULL,
    credential_id   TEXT NOT NULL UNIQUE,
    public_key      TEXT NOT NULL,
    counter         INTEGER NOT NULL DEFAULT 0,
    transports      TEXT NOT NULL DEFAULT '[]',
    device_type     TEXT NOT NULL DEFAULT '',
    backed_up       INTEGER NOT NULL DEFAULT 0,
    friendly_name   TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL,
    last_used_at    TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_passkeys_user ON user_passkeys(user_kind, user_id);
  CREATE INDEX IF NOT EXISTS idx_passkeys_cred ON user_passkeys(credential_id);

  CREATE TABLE IF NOT EXISTS webauthn_challenges (
    id          TEXT PRIMARY KEY,
    user_kind   TEXT,
    user_id     TEXT,
    challenge   TEXT NOT NULL,
    purpose     TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_webauthn_chal_exp ON webauthn_challenges(expires_at);

  CREATE TABLE IF NOT EXISTS orders (
    id                  TEXT PRIMARY KEY,
    order_number        TEXT NOT NULL UNIQUE,
    buyer_id            TEXT NOT NULL,
    seller_id           TEXT NOT NULL,
    seller_type         TEXT NOT NULL DEFAULT 'store',
    status              TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','accepted','out_for_delivery','completed','cancelled','disputed')),
    payment_method      TEXT NOT NULL DEFAULT 'cod',
    payment_reference   TEXT NOT NULL DEFAULT '',
    payment_receipt     TEXT NOT NULL DEFAULT '',
    payment_status      TEXT NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN ('pending','awaiting_review','approved','rejected','cod')),
    payout_frozen       INTEGER NOT NULL DEFAULT 0,
    currency            TEXT NOT NULL DEFAULT 'MRU',
    subtotal            REAL NOT NULL DEFAULT 0,
    delivery_fee        REAL NOT NULL DEFAULT 0,
    discount            REAL NOT NULL DEFAULT 0,
    total               REAL NOT NULL DEFAULT 0,
    delivery_type       TEXT NOT NULL DEFAULT 'delivery',
    delivery_name       TEXT NOT NULL DEFAULT '',
    delivery_phone      TEXT NOT NULL DEFAULT '',
    delivery_wilaya     TEXT NOT NULL DEFAULT '',
    delivery_district   TEXT NOT NULL DEFAULT '',
    delivery_address    TEXT NOT NULL DEFAULT '',
    delivery_notes      TEXT NOT NULL DEFAULT '',
    driver_notes        TEXT NOT NULL DEFAULT '',
    buyer_note          TEXT NOT NULL DEFAULT '',
    dispute_reason      TEXT NOT NULL DEFAULT '',
    cancel_reason       TEXT NOT NULL DEFAULT '',
    admin_resolution    TEXT NOT NULL DEFAULT '',
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    accepted_at         TEXT,
    completed_at        TEXT,
    cancelled_at        TEXT,
    disputed_at         TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id, status, created_at);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

  CREATE TABLE IF NOT EXISTS order_items (
    id          TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL,
    product_id  TEXT NOT NULL DEFAULT '',
    title       TEXT NOT NULL DEFAULT '',
    qty         INTEGER NOT NULL DEFAULT 1,
    unit_price  REAL NOT NULL DEFAULT 0,
    line_total  REAL NOT NULL DEFAULT 0,
    meta_json   TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

  CREATE TABLE IF NOT EXISTS order_status_history (
    id          TEXT PRIMARY KEY,
    order_id    TEXT NOT NULL,
    from_status TEXT NOT NULL DEFAULT '',
    to_status   TEXT NOT NULL,
    actor_kind  TEXT NOT NULL DEFAULT 'system',
    actor_id    TEXT NOT NULL DEFAULT '',
    note        TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_order_hist_order ON order_status_history(order_id, created_at);

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          TEXT PRIMARY KEY,
    user_kind   TEXT NOT NULL CHECK (user_kind IN ('buyer','seller')),
    user_id     TEXT NOT NULL,
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    user_agent  TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    last_used_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_kind, user_id);

  CREATE TABLE IF NOT EXISTS privacy_requests (
    id          TEXT PRIMARY KEY,
    user_kind   TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('export','erase')),
    status      TEXT NOT NULL DEFAULT 'done',
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_privacy_user ON privacy_requests(user_kind, user_id);
`);

module.exports = { db, DB_FILE, DATA_DIR };
