#!/usr/bin/env bash
# نسخ احتياطي لقاعدة Postgres: pg_dump مضغوط + مشفّر (age أو gpg).
# المفتاح من البيئة فقط — لا يُكتب في الكود.
# احتفاظ: 14 يومية + 8 أسبوعية. رفع اختياري عبر rclone.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# تحميل .env بلا توسيع $ داخل القيم (مثل هاش bcrypt $2a$…)
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
    # لا تُلغِ متغيرات ممرَّرة من البيئة (مثل DATABASE_URL للاختبار)
    if [[ -n "${!key+x}" ]]; then continue; fi
    export "$key=$val"
  done < "$f"
}
load_dotenv "$ROOT/rizq-backend/.env"

: "${DATABASE_URL:?DATABASE_URL required}"
BACKUP_ROOT="${BACKUP_DB_DIR:-$ROOT/backups/db}"
DAILY_DIR="$BACKUP_ROOT/daily"
WEEKLY_DIR="$BACKUP_ROOT/weekly"
KEEP_DAILY="${BACKUP_KEEP_DAILY:-14}"
KEEP_WEEKLY="${BACKUP_KEEP_WEEKLY:-8}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DAY="$(date -u +%Y%m%d)"
WEEK="$(date -u +%G-W%V)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"

RAW="$TMP/rizq-${STAMP}.sql.gz"
echo "[backup-db] dumping…"
pg_dump --no-owner --no-acl --format=plain "$DATABASE_URL" | gzip -9 > "$RAW"

encrypt_file() {
  local src="$1" dest="$2"
  if command -v age >/dev/null 2>&1 && [[ -n "${BACKUP_AGE_RECIPIENT:-${AGE_RECIPIENT:-}}" ]]; then
    local recip="${BACKUP_AGE_RECIPIENT:-$AGE_RECIPIENT}"
    age -r "$recip" -o "$dest" "$src"
    echo "age:$recip"
    return
  fi
  if command -v gpg >/dev/null 2>&1; then
    if [[ -n "${BACKUP_GPG_RECIPIENT:-}" ]]; then
      gpg --batch --yes --trust-model always -o "$dest" -e -r "$BACKUP_GPG_RECIPIENT" "$src"
      echo "gpg-recipient:$BACKUP_GPG_RECIPIENT"
      return
    fi
    if [[ -n "${BACKUP_GPG_PASSPHRASE:-${BACKUP_ENCRYPTION_PASSPHRASE:-}}" ]]; then
      local pass="${BACKUP_GPG_PASSPHRASE:-$BACKUP_ENCRYPTION_PASSPHRASE}"
      gpg --batch --yes --pinentry-mode loopback --passphrase "$pass" \
        -o "$dest" -c --cipher-algo AES256 "$src"
      echo "gpg-symmetric"
      return
    fi
  fi
  echo "[backup-db] ERROR: need age recipient (BACKUP_AGE_RECIPIENT) or gpg (BACKUP_GPG_RECIPIENT / BACKUP_GPG_PASSPHRASE)" >&2
  exit 1
}

OUT_DAILY="$DAILY_DIR/rizq-${DAY}.sql.gz.enc"
MODE="$(encrypt_file "$RAW" "$OUT_DAILY")"
echo "[backup-db] wrote $OUT_DAILY ($MODE)"

# أسبوعي: أول نسخ من الأسبوع أو تحديثه
OUT_WEEKLY="$WEEKLY_DIR/rizq-${WEEK}.sql.gz.enc"
cp -f "$OUT_DAILY" "$OUT_WEEKLY"
echo "[backup-db] weekly snapshot $OUT_WEEKLY"

# احتفاظ
prune() {
  local dir="$1" keep="$2"
  mapfile -t files < <(ls -1t "$dir"/rizq-*.sql.gz.enc 2>/dev/null || true)
  local i=0
  for f in "${files[@]:-}"; do
    i=$((i + 1))
    if [[ $i -gt $keep ]]; then
      rm -f "$f"
      echo "[backup-db] pruned $f"
    fi
  done
}
prune "$DAILY_DIR" "$KEEP_DAILY"
prune "$WEEKLY_DIR" "$KEEP_WEEKLY"

# رفع اختياري
if [[ -n "${RCLONE_REMOTE:-}" ]] && command -v rclone >/dev/null 2>&1; then
  echo "[backup-db] rclone sync → $RCLONE_REMOTE"
  rclone copy "$DAILY_DIR" "$RCLONE_REMOTE/daily" --quiet
  rclone copy "$WEEKLY_DIR" "$RCLONE_REMOTE/weekly" --quiet
fi

echo "[backup-db] ok path=$OUT_DAILY"
echo "$OUT_DAILY"
