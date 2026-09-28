# خزنة المفاتيح (Super Admin)

صفحة في لوحة الأدمن لإدخال أسرار التشغيل بدون الدخول لـ Render في كل مرة.

## أين؟

**الوكلاء الذكيون → خزنة المفاتيح** (تظهر للسوبر أدمن فقط — صلاحية `*`)

## الخانات الجاهزة

- Claude / Anthropic
- Twilio (SID، Auth Token، أرقام، Webhook)
- فيسبوك (Page ID + Token)
- تيليغرام
- إمكانية إضافة مفتاح مخصص باسم `UPPER_SNAKE_CASE`

## الأمان

- التخزين مشفّر AES-256-GCM في SQLite
- مفتاح التشفير مشتق من `SECRETS_VAULT_KEY` أو `BACKEND_SHARED_SECRET`
- الواجهة تعرض قناعاً فقط (`sk-ant-…xxxx`)
- الحقل الفارغ عند الحفظ = الإبقاء على القيمة الحالية
- `__CLEAR__` لمسح مفتاح من الخزنة
- لا تُحفظ الأسرار في `site-config` العام ولا في `localStorage`

## API

| Method | Path | من؟ |
|--------|------|-----|
| GET | `/api/admin/secrets-vault` | Super فقط |
| PUT | `/api/admin/secrets-vault` | Super فقط |

بعد الحفظ تُطبَّق القيم على `process.env` وتُزامَن إلى `rizq-backend/.env` إن أمكن.
