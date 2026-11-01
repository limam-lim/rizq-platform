/**
 * الحارس (Sentinel) — جداول خاصة + منح صلاحيات لدور rizq_sentinel إن وُجد.
 * إنشاء الدور نفسه يتطلب CREATEROLE (غالباً عبر postgres في INSTALL).
 * كلمة السر من SENTINEL_DB_PASSWORD عند توفّر صلاحية الإنشاء.
 * آمن للإعادة: IF NOT EXISTS / EXCEPTION handlers.
 */
'use strict';

function escapeLiteral(value) {
  return String(value).replace(/'/g, "''");
}

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

  const pass = String(process.env.SENTINEL_DB_PASSWORD || process.env.RIZQ_SENTINEL_PASSWORD || '').trim();
  const lit = escapeLiteral(pass || 'sentinel_change_me');

  // محاولة إنشاء/تحديث الدور — تُتخطّى بهدوء إن لم تتوفر CREATEROLE
  pgm.sql(`
    DO $sentinel$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rizq_sentinel') THEN
        BEGIN
          CREATE ROLE rizq_sentinel LOGIN PASSWORD '${lit}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
        EXCEPTION WHEN insufficient_privilege THEN
          RAISE NOTICE 'rizq_sentinel: CREATE ROLE skipped (need CREATEROLE) — run deploy/hetzner/sentinel-role.sql as postgres';
        END;
      ELSIF '${lit}' <> 'sentinel_change_me' THEN
        BEGIN
          ALTER ROLE rizq_sentinel WITH LOGIN PASSWORD '${lit}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
        EXCEPTION WHEN insufficient_privilege THEN
          RAISE NOTICE 'rizq_sentinel: ALTER PASSWORD skipped (insufficient privilege)';
        END;
      END IF;
    END
    $sentinel$;
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
        GRANT SELECT ON TABLE accounts, ads, catalog_items, tenders, documents, buyers, wishlist_items TO rizq_sentinel;
        GRANT SELECT, INSERT, UPDATE ON TABLE sentinel_events, sentinel_reports, sentinel_suggestions TO rizq_sentinel;
      ELSE
        RAISE NOTICE 'rizq_sentinel role missing — tables created; grant after creating the role';
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
        REVOKE ALL ON TABLE accounts, ads, catalog_items, tenders, documents, buyers, wishlist_items FROM rizq_sentinel;
      END IF;
    END
    $d$;
    DROP TABLE IF EXISTS sentinel_suggestions;
    DROP TABLE IF EXISTS sentinel_reports;
    DROP TABLE IF EXISTS sentinel_events;
  `);
};
