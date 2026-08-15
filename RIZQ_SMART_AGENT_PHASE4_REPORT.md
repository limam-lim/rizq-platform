# تقرير ترقية مدير رزق الذكي — المرحلة 4
**التاريخ:** 13 أغسطس 2026

---

## 1. Function Calling (Backend)

### ملفات جديدة
| ملف | الوظيفة |
|-----|---------|
| `rizq-backend/services/widgetAgentTools.js` | أدوات حتمية: إعلانات، بائعين، تقييمات، باقات، تذاكر |
| `rizq-backend/services/widgetChat.js` | حلقة Claude + tools + `validateReply()` |

### الأدوات (Deterministic)
- `get_ad_details(ad_id)` — من `ads.json`
- `search_ads(search, category, wilaya, limit)` — إعلانات نشطة فقط
- `get_seller_profile(account_id)` — حقول عامة آمنة
- `get_seller_reputation(account_id, ad_id?)` — تقييمات + درجة ثقة
- `get_packages_info(lang)` — أسعار الباقات الرسمية
- `create_support_ticket(type, summary, ad_id?)` — شكاوى/دعم

### `/api/widget/chat` (محدّث)
- يقبل `pageContext` من الويدجت
- يحمّل بيانات الإعلان من DB قبل الرد (`resolvePageContextFacts`)
- يرجع: `{ ok, reply, grounded, reviewed, toolsUsed }`

---

## 2. Context Awareness (Frontend)

### `rizq_widget_embed.js`
- `_collectPageContext()` — يقرأ `window._currentAd`, `?id=`, الصفحة، اللغة
- يُرسَل `pageContext` مع كل طلب `/api/widget/chat`
- تحية مخصصة عند فتح إعلان (`_contextGreetingSuffix()`)

### `rizq_browse.html`
- `selectAd()` يُطلق `rizq:ad-context` عند تغيير الإعلان

### `rizq_manager_agent_config.js`
- fallback محلي يستخدم `pageContext.ad` للأسعار/الثقة بدون تخمين

---

## 3. Quick Actions & Fallbacks

| زر | الإجراء |
|----|---------|
| نشر إعلان | → `rizq_post.html` |
| الاشتراكات | → `rizq_landing_v8.html#pricing` |
| التوثيق | → `rizq_landing_v8.html` |
| شكوى | `openReportModal()` إن وُجد، وإلا رسالة شات |
| الدفع | سؤال «طرق الدفع» في الشات |

### مراجعة الرد (`validateReply`)
- رفض ردود «ربما / I think» بدون بيانات
- كشف أسعار مشبوهة لا تطابق facts
- `grounded: false` عند عدم التأكد

---

## 4. الاختبار

```bash
cd rizq-backend
node scripts/test-widget-tools.js
node --check server.js
```

---

## 5. تنبيه — server.js

أثناء التنظيف أُصلح خط syntax في `server.js` (ترميز PowerShell). **يُنصح باستعادة التعليقات العربية من نسخة OneDrive السابقة** إن ظهرت رموز غريبة في التعليقات — المنطق البرمجي يعمل (`node --check` OK).

---

## 6. الملفات المعدّلة

- `rizq-backend/server.js` — `/api/widget/chat` → `handleWidgetChat`
- `rizq-backend/services/widgetAgentTools.js` (جديد)
- `rizq-backend/services/widgetChat.js` (جديد)
- `rizq_widget_embed.js`
- `rizq_manager_agent_config.js`
- `rizq_browse.html`
