-- Rizq platform — PostgreSQL schema (production)
-- Parameterized app queries only; this file is DDL bootstrap.

CREATE TABLE IF NOT EXISTS buyers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL DEFAULT '',
  token         TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  last_login_at TEXT NOT NULL,
  phone_intl    TEXT NOT NULL DEFAULT '',
  whatsapp      TEXT NOT NULL DEFAULT '',
  pass_hash     TEXT,
  email_lc      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_buyers_phone ON buyers(phone);
CREATE INDEX IF NOT EXISTS idx_buyers_token ON buyers(token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_buyers_email_lc ON buyers(email_lc) WHERE email_lc <> '';

CREATE TABLE IF NOT EXISTS wishlist_items (
  buyer_id  TEXT NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  item_id   TEXT NOT NULL,
  added_at  TEXT NOT NULL,
  PRIMARY KEY (buyer_id, item_id)
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

CREATE TABLE IF NOT EXISTS accounts (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'pending',
  nni        TEXT NOT NULL DEFAULT '',
  suspended  INTEGER NOT NULL DEFAULT 0,
  data       JSONB NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_nni ON accounts(nni);

CREATE TABLE IF NOT EXISTS ads (
  id         TEXT PRIMARY KEY,
  account_id TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'pending',
  category   TEXT NOT NULL DEFAULT '',
  data       JSONB NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ads_account ON ads(account_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_category ON ads(category);

CREATE TABLE IF NOT EXISTS catalog_items (
  id         TEXT PRIMARY KEY,
  account_id TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'pending_review',
  data       JSONB NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_catalog_account ON catalog_items(account_id);
CREATE INDEX IF NOT EXISTS idx_catalog_status ON catalog_items(status);

CREATE TABLE IF NOT EXISTS tenders (
  id         TEXT PRIMARY KEY,
  account_id TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'pending_review',
  data       JSONB NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tenders_account ON tenders(account_id);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);

CREATE TABLE IF NOT EXISTS documents (
  collection TEXT NOT NULL,
  id         TEXT NOT NULL,
  data       JSONB NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);
