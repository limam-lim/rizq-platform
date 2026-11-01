-- إنشاء دور الحارس (postgres أو CREATEROLE)
-- الاستخدام (إلزامي تمرير كلمة السر):
--   sudo -u postgres psql -d rizq \
--     -v sentinel_password='YOUR_STRONG_PASSWORD' \
--     -f /opt/rizq/deploy/hetzner/sentinel-role.sql
--
-- يرفض السكربت كلمة سر فارغة أو CHANGE_ME*.

\set ON_ERROR_STOP on

DO $check$
DECLARE
  pw text := trim(BOTH FROM :'sentinel_password');
BEGIN
  IF pw IS NULL OR pw = '' OR pw ~* '^CHANGE_ME' OR lower(pw) = 'sentinel_change_me' THEN
    RAISE EXCEPTION 'sentinel_password required via -v sentinel_password=... (non-empty, not CHANGE_ME)';
  END IF;
END
$check$;

DO $role$
DECLARE
  pw text := trim(BOTH FROM :'sentinel_password');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rizq_sentinel') THEN
    EXECUTE format(
      'CREATE ROLE rizq_sentinel LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT',
      pw
    );
  ELSE
    EXECUTE format(
      'ALTER ROLE rizq_sentinel WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE',
      pw
    );
  END IF;
END
$role$;

GRANT CONNECT ON DATABASE rizq TO rizq_sentinel;
GRANT USAGE ON SCHEMA public TO rizq_sentinel;

-- لا SELECT على الجداول الخام الحساسة
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
