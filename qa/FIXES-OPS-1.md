# FIXES-OPS-1

Branch: `fix-ops-1` (من `main`)

منطق وتشغيل فقط — بلا تصميم. UTF-8 / LF. اختبارات على `rizq_test`.

## 1) نسخ احتياطي Postgres

- `scripts/backup-db.sh`: `pg_dump` → gzip → تشفير بـ **age** (`BACKUP_AGE_RECIPIENT`) أو **gpg** (`BACKUP_GPG_RECIPIENT` / `BACKUP_GPG_PASSPHRASE`). المفتاح من البيئة فقط.
- احتفاظ: 14 يومية + 8 أسبوعية تحت `BACKUP_DB_DIR` (افتراضي `backups/db/`).
- رفع اختياري عبر `rclone` إن وُجد `RCLONE_REMOTE`.
- تحميل `.env` آمناً (بدون توسيع `$` داخل قيم مثل bcrypt).
- `scripts/restore-db.sh`: فك تشفير → استرجاع إلى `TARGET_DATABASE_URL` (مثلاً `rizq_test_restore`) وطباعة أعداد الجداول.

## 2) إيقاف نسخ JSON الكاملة في الإنتاج

- `docStore.backupJson` و `platformStore.backupJson` لا يكتبان إلا إذا `DEV_JSON_DUMPS=1`.

## 3) ترقيم وفلترة في SQL

- `platformStore.queryPublicAds` / `queryPublicAccounts`: `limit` + `offset`، فلترة فئة/ولاية/بحث داخل SQL.
- المسارات: `/api/ads` و `/api/accounts/public` — توافق مع الواجهة (حدود أعلى عند الحاجة لصفحات تعرض قوائم كاملة).
- ترحيل آمن: `1762272000000_ads-accounts-list-indexes` (`CREATE INDEX IF NOT EXISTS` + `pg_trgm`).

معيار 5000 إعلان (`test-ops-1`): تحميل كامل في الذاكرة ~24ms مقابل صفحة SQL مفلترة ~6ms.

## 4) مهلات خارجية

- `rizq-backend/lib/externalHttp.js`: افتراضي **15 ثانية**، إعادة محاولة محدودة (افتراضي 1).
- قابل للضبط: `EXTERNAL_HTTP_TIMEOUT_MS` / `EXTERNAL_HTTP_MAX_RETRIES` أو حسب الخدمة (`ANTHROPIC_*`, `TELEGRAM_*`, `FACEBOOK_*`, `SMTP_*`, `IMAGES_*`).
- موصول إلى: Claude، فيسبوك، تيليغرام، SMTP، جلب صور/HTTP عام.

## 5) عُدّة النشر `deploy/hetzner/`

| ملف | الغرض |
|-----|--------|
| `Caddyfile` | قائمة بيضاء للملفات العامة، تمرير `/api` و `/uploads` إلى Node، منع `.env` والمجلدات الداخلية، رؤوس أمان، `rizq.mr` + `www` |
| `rizq.service` | systemd بمستخدم غير root، `Restart=always`، حدود موارد |
| `postgres-tuning.conf` | ضبط لخادم ~8GB / 4 أنوية |
| `ufw-cloudflare.sh` | 80/443 من نطاقات Cloudflare الرسمية فقط، 22 مفتوح |
| `.env.production.example` | كل المتغيرات (`TRUST_CLOUDFLARE=1`, `ADMIN_2FA_KEY`, …) بلا قيم سرية |
| `INSTALL.md` | خطوات تثبيت مرقّمة من الصفر حتى الإطلاق |

## اختبارات

```bash
cd rizq-backend && node scripts/run-with-test-db.js scripts/test-ops-1.js
```

| فحص | نتيجة |
|------|--------|
| JSON dumps gated | pass |
| timeout 15s + abort | pass |
| SQL filters + 5000-ad bench | pass (mem≈24ms → sql≈6ms) |
| backup → restore `rizq_test_restore` + مقارنة counts | pass |
| ملفات `deploy/hetzner/` موجودة | pass |
