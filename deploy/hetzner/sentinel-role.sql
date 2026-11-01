-- إنشاء دور الحارس (يُنفَّذ كـ postgres أو مستخدم بـ CREATEROLE)
-- الاستخدام:
--   sudo -u postgres psql -d rizq -v pass="'YOUR_PASSWORD'" -f deploy/hetzner/sentinel-role.sql
-- أو عيّن كلمة السر يدوياً أدناه.

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rizq_sentinel') THEN
    CREATE ROLE rizq_sentinel LOGIN PASSWORD 'CHANGE_ME_SENTINEL' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

GRANT CONNECT ON DATABASE rizq TO rizq_sentinel;
GRANT USAGE ON SCHEMA public TO rizq_sentinel;
GRANT SELECT ON TABLE accounts, ads, catalog_items, tenders, documents, buyers, wishlist_items TO rizq_sentinel;
GRANT SELECT, INSERT, UPDATE ON TABLE sentinel_events, sentinel_reports, sentinel_suggestions TO rizq_sentinel;
