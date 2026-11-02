/**
 * فهارس كتالوج الرئيسية — status + account_id + createdAt
 */
'use strict';

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_catalog_status_account
      ON catalog_items (status, account_id);
    CREATE INDEX IF NOT EXISTS idx_catalog_status_created
      ON catalog_items (status, (data->>'createdAt') DESC NULLS LAST);
    CREATE INDEX IF NOT EXISTS idx_catalog_account_status_created
      ON catalog_items (account_id, status, (data->>'createdAt') DESC NULLS LAST);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_catalog_status_account;
    DROP INDEX IF EXISTS idx_catalog_status_created;
    DROP INDEX IF EXISTS idx_catalog_account_status_created;
  `);
};
