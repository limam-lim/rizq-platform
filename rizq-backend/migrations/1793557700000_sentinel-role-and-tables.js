/**
 * الحارس (Sentinel) — جداول خاصة + views بأقل صلاحية.
 * لا يُمنح SELECT على accounts / documents / buyers (ولا جداول المنصة الخام).
 * إنشاء الدور عبر deploy/hetzner/sentinel-role.sql (postgres + -v sentinel_password).
 */
'use strict';

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS sentinel_events (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT '',
      severity TEXT NOT NULL DEFAULT 'info',
      source TEXT NOT NULL DEFAULT 'sentinel',
      summary TEXT NOT NULL DEFAULT '',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sentinel_events_created ON sentinel_events (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sentinel_events_kind ON sentinel_events (kind);

    CREATE TABLE IF NOT EXISTS sentinel_reports (
      id TEXT PRIMARY KEY,
      report_type TEXT NOT NULL DEFAULT 'daily',
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sentinel_reports_created ON sentinel_reports (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sentinel_reports_type ON sentinel_reports (report_type);

    CREATE TABLE IF NOT EXISTS sentinel_suggestions (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'knowledge',
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      impact_rank INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'pending_owner',
      source TEXT NOT NULL DEFAULT 'claude',
      meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      reviewed_by TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sentinel_suggestions_status ON sentinel_suggestions (status, created_at DESC);
  `);

  // Views — بلا data / hash / tokens / هاتف / بريد / هوية
  pgm.sql(`
    CREATE OR REPLACE VIEW sentinel_v_accounts AS
    SELECT
      id,
      type,
      status,
      suspended,
      COALESCE(NULLIF(data->>'createdAt',''), updated_at) AS created_at,
      updated_at
    FROM accounts
    WHERE COALESCE(data->>'isSentinel','') IS DISTINCT FROM 'true';

    CREATE OR REPLACE VIEW sentinel_v_ads AS
    SELECT
      id,
      category AS type,
      status,
      0::integer AS suspended,
      COALESCE(NULLIF(data->>'createdAt',''), updated_at) AS created_at,
      updated_at
    FROM ads;

    CREATE OR REPLACE VIEW sentinel_v_catalog AS
    SELECT
      id,
      ''::text AS type,
      status,
      0::integer AS suspended,
      COALESCE(NULLIF(data->>'createdAt',''), updated_at) AS created_at,
      updated_at
    FROM catalog_items;

    CREATE OR REPLACE VIEW sentinel_v_tenders AS
    SELECT
      id,
      ''::text AS type,
      status,
      0::integer AS suspended,
      COALESCE(NULLIF(data->>'createdAt',''), updated_at) AS created_at,
      updated_at
    FROM tenders;

    CREATE OR REPLACE VIEW sentinel_v_requests AS
    SELECT
      id,
      collection,
      COALESCE(data->>'status', '') AS status,
      COALESCE(NULLIF(data->>'createdAt',''), updated_at) AS created_at,
      updated_at,
      COALESCE(
        NULLIF(data->>'finishedAt',''),
        NULLIF(data->>'at',''),
        NULLIF(data->>'statusAt',''),
        updated_at
      ) AS status_at
    FROM documents;
  `);

  pgm.sql(`
    DO $g$
    DECLARE
      dbname text := current_database();
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rizq_sentinel') THEN
        BEGIN
          EXECUTE format('GRANT CONNECT ON DATABASE %I TO rizq_sentinel', dbname);
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'CONNECT grant skipped: %', SQLERRM;
        END;
        GRANT USAGE ON SCHEMA public TO rizq_sentinel;

        -- إلغاء أي منح سابق على الجداول الخام
        REVOKE ALL ON TABLE accounts, ads, catalog_items, tenders, documents, buyers, wishlist_items FROM rizq_sentinel;

        GRANT SELECT ON
          sentinel_v_accounts,
          sentinel_v_ads,
          sentinel_v_catalog,
          sentinel_v_tenders,
          sentinel_v_requests
        TO rizq_sentinel;

        GRANT SELECT, INSERT, UPDATE ON TABLE
          sentinel_events, sentinel_reports, sentinel_suggestions
        TO rizq_sentinel;
      ELSE
        RAISE NOTICE 'rizq_sentinel role missing — tables/views created; run deploy/hetzner/sentinel-role.sql';
      END IF;
    END
    $g$;
  `);
};

/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.down = (pgm) => {
  pgm.sql(`
    DO $d$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rizq_sentinel') THEN
        REVOKE ALL ON TABLE sentinel_events, sentinel_reports, sentinel_suggestions FROM rizq_sentinel;
        REVOKE ALL ON
          sentinel_v_accounts, sentinel_v_ads, sentinel_v_catalog,
          sentinel_v_tenders, sentinel_v_requests
        FROM rizq_sentinel;
      END IF;
    END
    $d$;
    DROP VIEW IF EXISTS sentinel_v_requests;
    DROP VIEW IF EXISTS sentinel_v_tenders;
    DROP VIEW IF EXISTS sentinel_v_catalog;
    DROP VIEW IF EXISTS sentinel_v_ads;
    DROP VIEW IF EXISTS sentinel_v_accounts;
    DROP TABLE IF EXISTS sentinel_suggestions;
    DROP TABLE IF EXISTS sentinel_reports;
    DROP TABLE IF EXISTS sentinel_events;
  `);
};
