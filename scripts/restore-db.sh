#!/usr/bin/env bash
# استرجاع نسخة مشفّرة إلى قاعدة مؤقتة والتحقق منها.
# الاستخدام:
#   TARGET_DATABASE_URL=postgres://…/rizq_test_restore \
#   ./scripts/restore-db.sh [path/to/backup.sql.gz.enc]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

load_dotenv() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  local line key val
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
    key="${BASH_REMATCH[1]}"
    val="${BASH_REMATCH[2]}"
    if [[ "$val" =~ ^\"(.*)\"$ ]]; then val="${BASH_REMATCH[1]}"; fi
    if [[ "$val" =~ ^\'(.*)\'$ ]]; then val="${BASH_REMATCH[1]}"; fi
    if [[ -n "${!key+x}" ]]; then continue; fi
    export "$key=$val"
  done < "$f"
}
load_dotenv "$ROOT/rizq-backend/.env"

ENC_FILE="${1:-}"
if [[ -z "$ENC_FILE" ]]; then
  ENC_FILE="$(ls -1t "$ROOT"/backups/db/daily/rizq-*.sql.gz.enc 2>/dev/null | head -1 || true)"
fi
: "${ENC_FILE:?encrypted backup file required}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL required (e.g. …/rizq_test_restore)}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
DEC="$TMP/dump.sql.gz"
SQL="$TMP/dump.sql"

decrypt_file() {
  local src="$1" dest="$2"
  if command -v age >/dev/null 2>&1 && [[ -n "${BACKUP_AGE_IDENTITY:-${AGE_IDENTITY_FILE:-}}" ]]; then
    local idf="${BACKUP_AGE_IDENTITY:-$AGE_IDENTITY_FILE}"
    age -d -i "$idf" -o "$dest" "$src"
    return
  fi
  if command -v gpg >/dev/null 2>&1; then
    if [[ -n "${BACKUP_GPG_PASSPHRASE:-${BACKUP_ENCRYPTION_PASSPHRASE:-}}" ]]; then
      local pass="${BACKUP_GPG_PASSPHRASE:-$BACKUP_ENCRYPTION_PASSPHRASE}"
      gpg --batch --yes --pinentry-mode loopback --passphrase "$pass" -o "$dest" -d "$src"
      return
    fi
    gpg --batch --yes -o "$dest" -d "$src"
    return
  fi
  echo "[restore-db] ERROR: need age identity or gpg to decrypt" >&2
  exit 1
}

echo "[restore-db] decrypt $ENC_FILE"
decrypt_file "$ENC_FILE" "$DEC"
gunzip -c "$DEC" > "$SQL"

# إنشاء القاعدة إن لزم (يتصل بقاعدة postgres الإدارية)
ADMIN_URL="${POSTGRES_ADMIN_URL:-}"
if [[ -z "$ADMIN_URL" ]]; then
  ADMIN_URL="$(node -e "
    const u=new URL(process.env.TARGET_DATABASE_URL);
    u.pathname='/postgres';
    process.stdout.write(u.toString());
  ")"
fi
DB_NAME="$(node -e "process.stdout.write(new URL(process.env.TARGET_DATABASE_URL).pathname.replace(/^\//,'').split('?')[0])")"

echo "[restore-db] ensuring database $DB_NAME"
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
  || psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\""

echo "[restore-db] wiping + restoring into $TARGET_DATABASE_URL"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL" >/dev/null

echo "[restore-db] counts:"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -At -c "
SELECT 'ads='||(SELECT COUNT(*) FROM ads)
 ||' accounts='||(SELECT COUNT(*) FROM accounts)
 ||' documents='||(SELECT COUNT(*) FROM documents);
" || psql "$TARGET_DATABASE_URL" -At -c "SELECT 'tables_ok';"

echo "[restore-db] ok"
