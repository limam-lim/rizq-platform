# مدير تسويق رزق

وكيل إداري لتوليد حملات ترويجية (مسودة → موافقة → جدولة/نشر فيسبوك) من لوحة التحكم.

## ماذا يفعل؟

- يولّد نصوصاً لأنواع حملات متعددة (توعية، جذب تجار/مشترين، باقات، مواسم، إعادة تفعيل…).
- يجهّز متغيرات للقنوات: فيسبوك، إنستغرام، واتساب، تيليغرام، SMS، بريد، إعلان داخل المنصة.
- يفرض موافقة بشرية قبل النشر.
- ينشر آلياً على **صفحة فيسبوك** عبر Graph API عند ضبط التوكن.
- باقي القنوات تبقى مسودات للنسخ اليدوي (مرحلة لاحقة).

## الإعداد (الخادم)

في `rizq-backend/.env` أو جذر المشروع:

```bash
ANTHROPIC_API_KEY=sk-ant-...
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_token
# اختياري
FACEBOOK_API_VERSION=v21.0
```

بدون توكن فيسبوك يبقى التوليد والمراجعة يعملان؛ زر النشر يعيد خطأ توضيحياً.

## الاستخدام من لوحة الأدمن

1. افتح لوحة التحكم → **الوكلاء الذكيون → مدير التسويق**.
2. اختر نوع الحملة والقناة واللغة واكتب موجزاً قصيراً.
3. اضغط **توليد مسودة** — راجع النص وعدّله إن لزم.
4. **موافقة** ثم **نشر الآن**، أو جدولة بتاريخ لاحق.
5. أو استخدم **موافقة ونشر** لخطوة واحدة.

صلاحية اللوحة: `marketing` (مضمّنة لـ super / admin / moderator).

## واجهة API (أدمن)

| Method | Path | وصف |
|--------|------|-----|
| GET | `/api/admin/marketing/status` | حالة الربط + أنواع الحملات |
| PATCH | `/api/admin/marketing/settings` | تفعيل / حد المسودات / الموافقة البشرية |
| GET | `/api/admin/marketing/campaigns` | قائمة الحملات |
| POST | `/api/admin/marketing/campaigns/generate` | توليد مسودة |
| PATCH | `/api/admin/marketing/campaigns/:id` | تعديل النص |
| POST | `/api/admin/marketing/campaigns/:id/approve` | موافقة / جدولة |
| POST | `/api/admin/marketing/campaigns/:id/reject` | رفض |
| POST | `/api/admin/marketing/campaigns/:id/publish` | نشر فيسبوك |

المصادقة: رأس `x-admin-token` من جلسة الأدمن.

## الملفات

- `rizq_marketing_agent_config.js` — صوت العلامة وأنواع الحملات ومعايير الجودة
- `rizq-backend/services/marketingAgent.js` — المنطق
- `rizq-backend/routes/marketing.js` — المسارات
- لوحة الواجهة داخل `rizq_cp_panel.html` (panel-marketing)
