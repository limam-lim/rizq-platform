# SENTINEL-1 — الحارس

فرع: `feat-sentinel-1` (من `main`)  
الترميز: UTF-8 / LF  
قاعدة الاختبار: `rizq_test` فقط  
لا دمج ولا PR حتى مراجعة المالك.

## المبدأ الأمني

| مسموح | ممنوع |
|--------|--------|
| SELECT على `sentinel_v_*` فقط (id/type/status/تواريخ — بلا `data`) | SELECT على `accounts` / `documents` / `buyers` الخام |
| INSERT/UPDATE على `sentinel_events` / `sentinel_reports` / `sentinel_suggestions` | تعديل ملفات/كود، موافقة دفع أو إعلان، نشر |
| إيقاظ من `127.0.0.1`/`::1` + `SENTINEL_WAKE_SECRET` (timing-safe) | إيقاظ خارجي أو سر مشترك عام كـ fallback |

دور Postgres: `rizq_sentinel` — عبر `sentinel-role.sql -v sentinel_password=…` (لا CHANGE_ME).  
عملية مستقلة: `services/sentinel/` + `deploy/hetzner/rizq-sentinel.service`.  
Caddy يرد 404 على `/api/internal/sentinel/wake` من الخارج.

## البنية

```
services/sentinel/
  index.js              # جداول زمنية + جسر HTTP محلي :3017
  lib/
    config.js           # بيئة + قائمة بيضاء للإيقاظ
    db.js               # Pool بدور rizq_sentinel
    store.js            # أحداث/تقارير/اقتراحات
    health.js           # كل 5 دقائق
    activity.js         # كل 15 دقيقة
    journeys.js         # كل ساعة (Playwright اختياري)
    agents.js           # إشراف + إيقاظ متأخر
    wake.js             # استدعاء /api/internal/sentinel/wake
    alerts.js           # حرج + كتم 30د + عودة
    telegram.js         # أوامر المالك فقط
    claude.js           # /ask + اقتراحات يومية بميزانية توكن
    redact.js           # إخفاء هاتف/بريد
rizq-backend/
  migrations/1793557700000_sentinel-role-and-tables.js
  routes/sentinelAdmin.js
  lib/sentinelAccount.js
```

واجهة الأدمن: تبويب **الحارس** (`data-admin-perm="*"`) — الحالة، آخر 50 حدثاً، التقارير، موافقة/رفض الاقتراحات (بلا تطبيق تلقائي).

## الجداول الزمنية

| مهمة | تكرار |
|------|--------|
| صحة (/health، صفحات، API، 5xx، قرص/ذاكرة/CPU، نسخة، SSL، دومين) | 5 دقائق |
| نشاط تجميعي | 15 دقيقة |
| رحلات Playwright (قراءة فقط) | كل ساعة |
| تقرير يومي + تحليل ذكي | 08:30 Europe/Madrid |
| تقرير أسبوعي | الاثنين 08:30 Europe/Madrid |

## القائمة البيضاء للإيقاظ

`lifecycle`, `quota_guard`, `marketing`, `moderator`, `ops_housekeeping`, `maintenance_daily`, `maintenance_weekly`, `investment_ops`, `currency_rates`

## تيليغرام

- يرد فقط على `SENTINEL_TELEGRAM_CHAT_ID`
- أوامر: `/status` `/today` `/week` `/agents` `/pending` `/ask <سؤال>`
- `/ask` من بيانات مجمّعة فقط (بلا SQL مباشر)
- رسائل `telegramAdmin` تمر عبر جسر الحارس (`SENTINEL_TELEGRAM_BRIDGE=1`) للتجميع؛ الحرج فوري

## الاختبارات

```bash
cd rizq-backend
SENTINEL_DB_PASSWORD=… npm run test:sentinel
# ≡ node scripts/run-with-test-db.js scripts/test-sentinel-1.js
```

يغطي:

1. SELECT على الـ views فقط؛ رفض SELECT `data`/`passHash` من الجداول الأصلية؛ رفض UPDATE/DELETE  
2. تنبيه حرج → كتم → رسالة عودة (خادم / قرص / نسخة)  
3. رفض إيقاظ خارج القائمة البيضاء  
4. إيقاظ: IP خارجي → 403؛ سر خاطئ → 401؛ بلا `SENTINEL_WAKE_SECRET` → 503  
5. تجاهل `/ask` من `chat_id` غريب  
6. حساب `isSentinel` مستثنى من القوائم العامة  
7. إخفاء الهاتف والبريد (`2224****67` ونمط البريد)

## تفعيل الإنتاج

راجع قسم «الحارس» في `deploy/hetzner/INSTALL.md`.
