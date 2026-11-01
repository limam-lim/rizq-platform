# تثبيت رزق على Hetzner — من الصفر حتى الإطلاق

## 0) المتطلبات

- Ubuntu 22.04+ (CX31 ≈ 8GB / 4 vCPU موصى)
- نطاق `rizq.mr` و`www` يشير إلى Cloudflare → البروكسي البرتقالي
- وصول SSH للمخدم

## 1) مستخدم النظام

```bash
sudo adduser --system --group --home /opt/rizq rizq
sudo mkdir -p /opt/rizq /var/log/caddy
sudo chown -R rizq:rizq /opt/rizq
```

## 2) Postgres + Node 22

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib curl gnupg gzip ufw
# Node 22 عبر NodeSource أو nvm — ثم:
node -v   # >= 22
```

أنشئ دور وقاعدة:

```bash
sudo -u postgres createuser -P rizq
sudo -u postgres createdb -O rizq rizq
```

فعّل الضبط: انسخ `postgres-tuning.conf` و`include` من `postgresql.conf` ثم أعد تشغيل Postgres.

## 3) استنساخ المشروع

```bash
sudo -u rizq git clone <REPO_URL> /opt/rizq
cd /opt/rizq/rizq-backend
sudo -u rizq cp ../deploy/hetzner/.env.production.example .env
# حرّر .env: DATABASE_URL، الأسرار، TRUST_CLOUDFLARE=1
sudo -u rizq npm ci --omit=dev
sudo -u rizq npm run migrate
```

## 4) systemd

```bash
sudo cp /opt/rizq/deploy/hetzner/rizq.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rizq
curl -fsS http://127.0.0.1:3000/health
```

## 5) Caddy

```bash
# ثبّت Caddy الرسمي ثم:
sudo cp /opt/rizq/deploy/hetzner/Caddyfile /etc/caddy/Caddyfile
# عيّن CADDY_ACME_EMAIL إن لزم
sudo systemctl enable --now caddy
```

## 6) جدار ناري (Cloudflare فقط لـ 80/443)

```bash
sudo chmod +x /opt/rizq/deploy/hetzner/ufw-cloudflare.sh
sudo /opt/rizq/deploy/hetzner/ufw-cloudflare.sh
```

## 7) نسخ احتياطي يومي

```bash
# أنشئ مفتاح age أو عبارة gpg في .env (BACKUP_AGE_RECIPIENT أو BACKUP_GPG_PASSPHRASE)
sudo chmod +x /opt/rizq/scripts/backup-db.sh /opt/rizq/scripts/restore-db.sh
sudo crontab -u rizq -e
# 15 2 * * * /opt/rizq/scripts/backup-db.sh >> /opt/rizq/backups/db/cron.log 2>&1
```

استرجاع تجريبي:

```bash
TARGET_DATABASE_URL=postgres://rizq:…@127.0.0.1:5432/rizq_test_restore \
  /opt/rizq/scripts/restore-db.sh
```

## 8) Cloudflare

- SSL/TLS: Full (strict)
- Proxied DNS لـ `@` و`www`
- تأكد `TRUST_CLOUDFLARE=1` في `.env`

## 9) تحقق الإطلاق

1. `https://rizq.mr/health`
2. تصفح إعلان + تسجيل
3. لوحة الأدمن + 2FA
4. نسخة احتياطية ناجحة في `/opt/rizq/backups/db/daily/`

## 10) الحارس (Sentinel) — عملية مراقبة مستقلة

الحارس وكيل قراءة فقط: لا يعدّل بيانات المستخدمين ولا يوافق على دفع/إعلان ولا ينشر.
الفعل الوحيد المسموح: إيقاظ مهمة مجدولة عبر قائمة بيضاء.

```bash
# 1) كلمة سر دور Postgres (أضفها قبل الترحيل)
# في rizq-backend/.env:
# SENTINEL_DB_PASSWORD=…قوية…
# SENTINEL_WAKE_SECRET=…(أو نفس BACKEND_SHARED_SECRET)…
# SENTINEL_TELEGRAM_CHAT_ID=…معرف محادثة المالك…
# SENTINEL_DAILY_TOKEN_BUDGET=50000
# SENTINEL_DOMAIN_EXPIRY=2027-01-01   # اختياري
# SENTINEL_LISTEN_PORT=3017

# أنشئ الدور كـ postgres (مطلوب CREATEROLE)، ثم حدّث كلمة السر:
sudo -u postgres psql -d rizq -c "CREATE ROLE rizq_sentinel LOGIN PASSWORD '…' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;"
# أو حرّر CHANGE_ME في deploy/hetzner/sentinel-role.sql ثم:
# sudo -u postgres psql -d rizq -f /opt/rizq/deploy/hetzner/sentinel-role.sql

cd /opt/rizq/rizq-backend
sudo -u rizq npm run migrate   # جداول sentinel_* + GRANT للدور إن وُجد

# 2) تبعيات خدمة الحارس
cd /opt/rizq/services/sentinel
sudo -u rizq npm ci --omit=dev
# اختياري للرحلات: sudo -u rizq npx playwright install chromium

# 3) حساب منصة موسوم للحارس (رحلات الدخول) — يُستثنى من الإحصاءات والقوائم
# أنشئ حساباً ببريد sentinel@… وضع isSentinel:true في data عبر SQL أو لوحة داخلية

# 4) systemd مستقل عن rizq.service
sudo cp /opt/rizq/deploy/hetzner/rizq-sentinel.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rizq-sentinel
curl -fsS http://127.0.0.1:3017/health

# 5) لوحة الأدمن → تبويب «الحارس» (سوبر فقط): الحالة، آخر 50 حدثاً، التقارير، الاقتراحات
```

التقارير اليومية/الأسبوعية: 08:30 بتوقيت `Europe/Madrid` عبر تيليغرام إلى `SENTINEL_TELEGRAM_CHAT_ID` فقط.

## 11) ملاحظات أمان

- `DEV_JSON_DUMPS=0` في الإنتاج
- لا تفتح Postgres على الإنترنت
- قيّد منفذ 22 بـ IP إداري عند الإمكان بعد استقرار الوصول
- دور `rizq_sentinel`: SELECT فقط على جداول المنصة؛ INSERT/UPDATE على `sentinel_*` فقط
