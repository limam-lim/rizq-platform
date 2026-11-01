/**
 * فهارس تصفح الإعلانات/الحسابات العامة — CREATE INDEX IF NOT EXISTS (آمن للإعادة)
 */
'use strict';

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_ads_status_category ON ads (status, category);
    CREATE INDEX IF NOT EXISTS idx_ads_status_updated ON ads (status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ads_data_wilaya ON ads ((data->>'wilaya'));
    CREATE INDEX IF NOT EXISTS idx_ads_data_created ON ads ((data->>'createdAt') DESC NULLS LAST);
    CREATE INDEX IF NOT EXISTS idx_ads_data_title_trgm ON ads USING gin ((lower(COALESCE(data->>'title',''))) gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_accounts_status_type ON accounts (status, type) WHERE suspended = 0;
    CREATE INDEX IF NOT EXISTS idx_accounts_data_city ON accounts ((data->>'city'));
    CREATE INDEX IF NOT EXISTS idx_accounts_data_name_trgm ON accounts USING gin ((lower(COALESCE(data->>'name',''))) gin_trgm_ops);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_ads_status_category;
    DROP INDEX IF EXISTS idx_ads_status_updated;
    DROP INDEX IF EXISTS idx_ads_data_wilaya;
    DROP INDEX IF EXISTS idx_ads_data_created;
    DROP INDEX IF EXISTS idx_ads_data_title_trgm;
    DROP INDEX IF EXISTS idx_accounts_status_type;
    DROP INDEX IF EXISTS idx_accounts_data_city;
    DROP INDEX IF EXISTS idx_accounts_data_name_trgm;
  `);
};
