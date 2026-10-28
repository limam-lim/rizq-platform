/**
 * Initial PostgreSQL schema matching SQLite tables.
 * TEXT ISO timestamps kept for API compatibility; TIMESTAMPTZ columns added where sensible.
 */
'use strict';

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.createTable('buyers', {
    id: { type: 'text', primaryKey: true },
    name: { type: 'text', notNull: true },
    phone: { type: 'text', notNull: true, unique: true },
    email: { type: 'text', notNull: true, default: '' },
    token: { type: 'text', notNull: true },
    created_at: { type: 'text', notNull: true },
    last_login_at: { type: 'text', notNull: true },
    phone_intl: { type: 'text', notNull: true, default: '' },
    whatsapp: { type: 'text', notNull: true, default: '' },
    pass_hash: { type: 'text' },
    email_lc: { type: 'text', notNull: true, default: '' },
    created_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.createIndex('buyers', 'phone', { name: 'idx_buyers_phone' });
  pgm.createIndex('buyers', 'token', { name: 'idx_buyers_token' });
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_buyers_email_lc ON buyers(email_lc) WHERE email_lc <> ''`);

  pgm.createTable('wishlist_items', {
    buyer_id: {
      type: 'text',
      notNull: true,
      references: 'buyers',
      onDelete: 'CASCADE',
    },
    item_id: { type: 'text', notNull: true },
    added_at: { type: 'text', notNull: true },
    created_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
  }, {
    constraints: { primaryKey: ['buyer_id', 'item_id'] },
  });
  pgm.createIndex('wishlist_items', 'buyer_id', { name: 'idx_wishlist_buyer' });

  pgm.createTable('corp_api_integrations', {
    company_id: { type: 'text', primaryKey: true },
    api_key_hash: { type: 'text', notNull: true },
    api_key_prefix: { type: 'text', notNull: true },
    api_status: { type: 'text', notNull: true, default: 'active' },
    allowed_origin_ip: { type: 'text' },
    last_used_at: { type: 'text' },
    created_at: { type: 'text', notNull: true },
    updated_at: { type: 'text', notNull: true },
    created_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.sql(`ALTER TABLE corp_api_integrations ADD CONSTRAINT corp_api_integrations_api_status_check CHECK (api_status IN ('active', 'suspended'))`);
  pgm.createIndex('corp_api_integrations', 'api_key_prefix', { name: 'idx_corp_api_prefix' });
  pgm.createIndex('corp_api_integrations', 'api_status', { name: 'idx_corp_api_status' });

  pgm.createTable('accounts', {
    id: { type: 'text', primaryKey: true },
    type: { type: 'text', notNull: true, default: '' },
    email: { type: 'text', notNull: true, default: '' },
    status: { type: 'text', notNull: true, default: 'pending' },
    nni: { type: 'text', notNull: true, default: '' },
    suspended: { type: 'integer', notNull: true, default: 0 },
    data: { type: 'jsonb', notNull: true },
    updated_at: { type: 'text', notNull: true },
    created_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.createIndex('accounts', 'email', { name: 'idx_accounts_email' });
  pgm.createIndex('accounts', 'status', { name: 'idx_accounts_status' });
  pgm.createIndex('accounts', 'type', { name: 'idx_accounts_type' });
  pgm.createIndex('accounts', 'nni', { name: 'idx_accounts_nni' });

  pgm.createTable('ads', {
    id: { type: 'text', primaryKey: true },
    account_id: { type: 'text', notNull: true, default: '' },
    status: { type: 'text', notNull: true, default: 'pending' },
    category: { type: 'text', notNull: true, default: '' },
    data: { type: 'jsonb', notNull: true },
    updated_at: { type: 'text', notNull: true },
    created_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.createIndex('ads', 'account_id', { name: 'idx_ads_account' });
  pgm.createIndex('ads', 'status', { name: 'idx_ads_status' });
  pgm.createIndex('ads', 'category', { name: 'idx_ads_category' });

  pgm.createTable('catalog_items', {
    id: { type: 'text', primaryKey: true },
    account_id: { type: 'text', notNull: true, default: '' },
    status: { type: 'text', notNull: true, default: 'pending_review' },
    data: { type: 'jsonb', notNull: true },
    updated_at: { type: 'text', notNull: true },
    created_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.createIndex('catalog_items', 'account_id', { name: 'idx_catalog_account' });
  pgm.createIndex('catalog_items', 'status', { name: 'idx_catalog_status' });

  pgm.createTable('tenders', {
    id: { type: 'text', primaryKey: true },
    account_id: { type: 'text', notNull: true, default: '' },
    status: { type: 'text', notNull: true, default: 'pending_review' },
    data: { type: 'jsonb', notNull: true },
    updated_at: { type: 'text', notNull: true },
    created_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.createIndex('tenders', 'account_id', { name: 'idx_tenders_account' });
  pgm.createIndex('tenders', 'status', { name: 'idx_tenders_status' });

  pgm.createTable('documents', {
    collection: { type: 'text', notNull: true },
    id: { type: 'text', notNull: true },
    data: { type: 'jsonb', notNull: true },
    updated_at: { type: 'text', notNull: true },
    created_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
  }, {
    constraints: { primaryKey: ['collection', 'id'] },
  });
  pgm.createIndex('documents', 'collection', { name: 'idx_documents_collection' });

  pgm.createTable('admin_sessions', {
    token: { type: 'text', primaryKey: true },
    data: { type: 'jsonb', notNull: true },
    expires_at: { type: 'bigint', notNull: true },
    created_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at_ts: { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.createIndex('admin_sessions', 'expires_at', { name: 'idx_admin_sessions_exp' });
};

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.dropTable('admin_sessions', { ifExists: true, cascade: true });
  pgm.dropTable('documents', { ifExists: true, cascade: true });
  pgm.dropTable('tenders', { ifExists: true, cascade: true });
  pgm.dropTable('catalog_items', { ifExists: true, cascade: true });
  pgm.dropTable('ads', { ifExists: true, cascade: true });
  pgm.dropTable('accounts', { ifExists: true, cascade: true });
  pgm.dropTable('corp_api_integrations', { ifExists: true, cascade: true });
  pgm.dropTable('wishlist_items', { ifExists: true, cascade: true });
  pgm.dropTable('buyers', { ifExists: true, cascade: true });
};
