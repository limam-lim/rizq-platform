# RIZQ — تقرير تدقيق شامل لمنع التراجع (Regression Audit)
**التاريخ:** 2026-08-13  
**النطاق:** مجلد المشروع بالكامل (22 HTML · 28 JS · `rizq-backend/`)  
**التركيز:** `rizq_auth_gate.js` والصفحات المرتبطة + الوظائف المستقرة سابقاً

---

## 1. الملخص التنفيذي

| المؤشر | النتيجة |
|--------|---------|
| أخطاء syntax في JS | **0** |
| أخطاء syntax في كتل `<script>` داخل HTML | **0** |
| توازن وسوم `<div>` | **100%** (22/22 ملف) |
| مراجع `<script src>` مكسورة | **0** |
| تعارض auth_gate (استخدام بدون تحميل السكربت) | **0** |
| **حالة المنظومة العامة** | **مستقرة — لا كسر وظيفي مكتشَف** |
| **فجوات تغطية auth_gate** | **7 صفحات عامة لم تُدمَج بعد** |
| **مخاطر تراجع محتملة** | **3 متوسطة · 2 منخفضة** (تفاصيل §6) |

**الخلاصة:** التكامل الحالي لـ `rizq_auth_gate.js` في الصفحات الثلاث (`browse` / `listing` / `store`) سليم برمجياً ولا يتعارض مع الأنظمة الأخرى. الخطر الرئيسي ليس «كسراً» بل **عدم اتساق التغطية** — زائر يمكنه التواصل من صفحات أخرى دون تسجيل، بينما الصفحات المحدّثة تطلبه.

---

## 2. خريطة العلاقات — `rizq_auth_gate.js`

```
┌─────────────────────────────────────────────────────────────────┐
│  rizq_backend_config.js  →  window.RIZQ_BACKEND_BASE            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  rizq_auth_gate.js (IIFE — window.RizqAuthGate)                 │
│  · localStorage: rizq_buyer_session {id, name, phone, token}    │
│  · rizqRequireAuth(fn, reasonKey)  — إجراءات محمية               │
│  · rizqGateLink(el, ev, reasonKey) — روابط tel:/wa.me جاهزة   │
│  · verifySessionSilently() → GET /api/buyers/me                  │
│  · submitForm() → POST /api/buyers/register                      │
└───────────────┬─────────────────────────────┬───────────────────┘
                │                             │
    ┌───────────▼──────────┐      ┌───────────▼──────────────────┐
    │  rizq_browse.html    │      │  rizq-backend/server.js       │
    │  rizq_listing.html   │      │  · POST /api/buyers/register  │
    │  rizq_store.html     │      │  · GET  /api/buyers/me        │
    └──────────────────────┘      │  · buyers.json (DATA_DIR)     │
                                  └───────────────────────────────┘

  أنظمة منفصلة تماماً (لا تتداخل):
  · حسابات التجار/المكاتب → dashToken / accounts.json
  · RizqSub / rizq_subscription_engine.js → باقات المشتركين
  · RizqMessenger → مراسلة البائع (sellerAccountId)
```

### 2.1 الصفحات المدمَجة (✅ مكتملة)

| الصفحة | تحميل السكربت | backend_config | الإجراءات المحمية |
|--------|---------------|----------------|-------------------|
| `rizq_browse.html` | `<head>` + `defer` | `<head>` (قبل auth_gate) | كشف رقم · اتصال · واتساب · رسالة · مفضلة (detail panel) |
| `rizq_listing.html` | `<head>` + `defer` | `<head>` (قبل auth_gate) | كشف رقم · اتصال · واتساب · رسالة · مفضلة |
| `rizq_store.html` | `<head>` + `defer` | `<footer>` (سطر ~1816) | tel/wa links · مراسلة · كشف هاتف/إيميل · مفضلة منتجات |

**ملاحظة ترتيب التحميل في `rizq_store.html`:**  
`rizq_auth_gate.js` في `<head>` بـ `defer`، و`rizq_backend_config.js` في أسفل الصفحة. هذا **آمن** لأن سكربتات `defer` تُنفَّذ بعد اكتمال parsing — و`backend_config` يُنفَّذ أثناء parsing قبلها. لا خطر تراجع هنا.

### 2.2 الصفحات غير المدمَجة (⚠️ فجوة تغطية — ليست كسراً)

| الصفحة | إجراءات تواصل/مفضلة مفتوحة للزائر |
|--------|-----------------------------------|
| `rizq_landing_v8.html` | `callSeller()` · `waSeller()` · `toggleFavoriteAd()` في modal الإعلان |
| `rizq_office.html` | روابط `tel:` / `wa.me` مباشرة · `openChat()` |
| `rizq_corp.html` | روابط `tel:` / `wa.me` مباشرة · `openChat()` |
| `rizq_search.html` | `toggleFav()` بدون بوابة |
| `rizq_products.html` | `toggleFav()` · رابط WhatsApp مباشر في بطاقة المنتج |
| `rizq_showroom.html` | (محتوى ديناميكي — لا auth_gate) |
| `rizq_profile.html` | (لا auth_gate — مراجعة يدوية: تواصل محدود) |

---

## 3. فحص `rizq_auth_gate.js` — سلوك واستقرار

### 3.1 ما يعمل بشكل صحيح ✅

1. **حماية idempotent:** `if (window.RizqAuthGate) return` — لا تكرار عند حقن مزدوج.
2. **تسجيل = دخول:** رقم الهاتف معرّف فريد؛ الخادم يُعيد نفس التوكن لرقم موجود.
3. **تنفيذ الفعل بعد النجاح:** `_pendingAction` يُنفَّذ تلقائياً؛ يُلغى عند إغلاق النافذة يدوياً.
4. **`gateLink`:** يمنع `preventDefault` للزائر غير المسجَّل ثم يتابع `href` بعد التسجيل.
5. **Fallback محلي:** إذا `RIZQ_BACKEND_BASE` غير مضبوط — جلسة `local_*` بدون كسر الصفحة.
6. **تحقق صامت:** `verifySessionSilently()` — 401 فقط يُنظّف الجلسة؛ انقطاع الشبكة لا يُبطل الجلسة.
7. **i18n:** يقرأ `lang` من `<html lang>` · `_rizqLang()` · `RizqI18n.getLang()` · `localStorage rizq_lang`.
8. **تحقق الهاتف:** نفس regex موريتاني في الواجهة والخادم: `/^(2\|3\|4)\d{7}$/` (8 أرقام).

### 3.2 API الخادم (`rizq-backend/server.js`)

| Endpoint | الحماية | الحالة |
|----------|---------|--------|
| `POST /api/buyers/register` | rate limit 15/15min | ✅ متطابق مع الواجهة |
| `GET /api/buyers/me` | id + token query | ✅ متطابق |

**تخزين:** `rizq-backend/data/buyers.json` (يُنشأ عند أول تسجيل).

### 3.3 قيود معروفة (by design — ليست أخطاء)

- **لا OTP/SMS حقيقي** — قرار صريح (13/08/2026).
- **جلسة المشتري ≠ جلسة التاجر** — `rizq_buyer_session` منفصل عن `dashToken`.
- **المفضلة لا تُزامَن مع الخادم** — تبقى في `localStorage` محلياً حتى بعد التسجيل.

---

## 4. الوظائف المستقرة — تحقق عدم التعارض

### 4.1 محرك الاشتراكات (`rizq_subscription_engine.js`)

- `RizqSub.checkPostLimit` · `getBadges` · `isAdBoosted` — **لا تعارض** مع auth_gate.
- الصفحات الثلاث المدمَجة تحمّل `rizq_subscription_engine.js` **قبل** auth_gate ✅
- شارات verified/premium تُحسب من حساب **البائع** (`accountId`) وليس المشتري.

### 4.2 الترجمة (`rizq_i18n.js` + `rizq_i18n_data.js`)

- auth_gate يستخدم قاموساً **داخلياً** (`DICT.ar/fr`) — لا يعتمد على RizqI18n للنصوص الأساسية.
- **لا تعارض** مع namespaces الداشبوردات الموحّدة (تحديث 2026-08-06).

### 4.3 المراسلة (`rizq_messenger.js`)

- `rizq_listing.html`: `openChat()` يمرّر `sellerAccountId` من `window._currentAd` ✅
- `rizq_browse.html`: دردشة محلية (`#chat-overlay`) — **لا RizqMessenger**؛ سلوك مختلف لكن مستقر.
- auth_gate يحمي **فتح** المراسلة فقط؛ لا يغيّر منطق الإرسال.

### 4.4 المفضلة (Wishlist) — ⚠️ ازدواجية قديمة (ليست من auth_gate)

| المفتاح | أين يُستخدم |
|---------|-------------|
| `rizq_wishlist` | browse · listing · search · dashboard · landing (عرض) |
| `rizq_favs` | landing modal (`toggleFavoriteAd` — بالعنوان لا بالـ id) |
| `rizq_wishlist_<storeId>` | store.html (مفضلة منتجات المحل) |

**خطر تراجع UX:** مفضلة في landing لا تظهر في browse/listing والعكس. **موجود قبل auth_gate** — يستحق توحيداً مستقلاً.

### 4.5 الداشبوردات والأدمن

- مصادقة `dashToken` / `accounts` — **مسار منفصل** عن buyers.
- توحيد RizqI18n على 5 داشبوردات (2026-08-06) — **لم يُمس** في auth_gate.
- إصلاح `isAr` ReferenceError في dashboard — **لا علاقة** ببوابة المشتري.

### 4.6 CORS (`rizq-backend/server.js`)

```javascript
// ALLOWED_ORIGIN من .env — إذا فارغاً يُسمَح بلا Origin header
if (!origin || origin === ALLOWED_ORIGIN) return cb(null, true);
```

**⚠️ للإنتاج:** يجب ضبط `ALLOWED_ORIGIN=https://your-domain.com` وإلا فشل `fetch('/api/buyers/register')` من المتصفح → alert «تعذّر الاتصال بالخادم».  
**لا يؤثر على التصفح الحر** — فقط على التسجيل الفعلي.

---

## 5. نتائج الفحص الآلي (2026-08-13)

```
HTML files scanned : 22
JS  files scanned  : 28 (+ rizq-backend/server.js)
Syntax errors      : 0
Div imbalance      : 0
Missing script refs  : 0
Auth gate conflicts: 0
```

**ملاحظة:** ملف `rizq_health_check.js` مذكور في `RIZQ_SESSION_CONTEXT.md` كأداة فحص معتمدة **لكنه غير موجود** في المجلد حالياً. يُوصى بإعادة إنشائه أو تحديث التوثيق.

---

## 6. مخاطر التراجع والتحسينات المطلوبة

### 🔴 أولوية عالية (اتساق المنتج — ليس كسراً حالياً)

| # | المشكلة | التأثير | الإجراء المقترح |
|---|---------|---------|-----------------|
| H1 | **تغطية auth_gate جزئية** | زائر يتجاوز التسجيل من landing/office/corp/search/products | إضافة `<script src="rizq_auth_gate.js" defer>` + لف الإجراءات بنفس نمط browse/listing/store |
| H2 | **CORS في الإنتاج** | التسجيل يفشل صامتاً (alert شبكة) | ضبط `ALLOWED_ORIGIN` + `RIZQ_BACKEND_BASE` في `rizq_backend_config.js` |

### 🟡 أولوية متوسطة

| # | المشكلة | التأثير | الإجراء المقترح |
|---|---------|---------|-----------------|
| M1 | **ازدواجية المفضلة** (`rizq_wishlist` vs `rizq_favs`) | مفضلة landing ≠ browse | توحيد على `rizq_wishlist` بالـ ad id |
| M2 | **browse vs listing — دردشة مختلفة** | browse محلي؛ listing يستخدم RizqMessenger | توحيد على RizqMessenger في browse (تحسين UX) |
| M3 | **store.html — backend_config في footer** | يعمل لكن نمط غير متسق | نقل `rizq_backend_config.js` إلى `<head>` قبل auth_gate (مثل browse) |

### 🟢 أولوية منخفضة / مستقبلية

| # | المشكلة | الإجراء |
|---|---------|---------|
| L1 | لا OTP SMS | مهمة منفصلة + مزوّد SMS |
| L2 | `rizq_health_check.js` مفقود | إعادة بناء سكربت الفحص الآلي |
| L3 | مزامنة مفضلة المشتري مع الخادم | API `POST /api/buyers/favorites` (اختياري) |

---

## 7. قائمة تحقق Regression — قبل أي deploy

- [ ] `node --check rizq_auth_gate.js` — بدون أخطاء
- [ ] الصفحات الثلاث: كشف رقم → نافذة تسجيل → تنفيذ تلقائي بعد النجاح
- [ ] `rizqRequireAuth` يُنفَّذ فوراً للمستخدم المسجَّل (بدون نافذة)
- [ ] `rizqGateLink` — tel/wa لا تُفتح قبل التسجيل
- [ ] إغلاق النافذة يدوياً **لا** ينفّذ الفعل المعلَّق
- [ ] `POST /api/buyers/register` + `GET /api/buyers/me` من نفس Origin المسموح
- [ ] الداشبوردات + نشر إعلان + باقات — **Regression smoke test** (مسار التاجر لم يُمس)
- [ ] `RizqSub.getBadges` / `isAdBoosted` — شارات لا تزال تظهر في browse/listing/store

---

## 8. خطة عمل مقترحة (بدون كسر الوظائف الحالية)

### المرحلة 1 — اتساق auth_gate (أقل مخاطرة)
1. `rizq_landing_v8.html`: تحميل auth_gate + لف `callSeller` / `waSeller` / `toggleFavoriteAd` / `askSeller`
2. `rizq_search.html` + `rizq_products.html`: لف `toggleFav` فقط
3. `rizq_office.html` + `rizq_corp.html`: `rizqGateLink` على روابط tel/wa + `rizqRequireAuth` على `openChat`

### المرحلة 2 — توحيد البنية
1. نقل `backend_config` في store إلى `<head>`
2. توحيد `rizq_favs` → `rizq_wishlist` في landing

### المرحلة 3 — إنتاج
1. ضبط `.env`: `ALLOWED_ORIGIN`, `BACKEND_SHARED_SECRET`
2. تحديث `RIZQ_BACKEND_BASE` مرة واحدة في `rizq_backend_config.js`

---

## 9. الحكم النهائي

| المحور | الحكم |
|--------|-------|
| **استقرار الكود الحالي** | ✅ مستقر — صفر أخطاء syntax/structure |
| **auth_gate في الصفحات الثلاث** | ✅ متكامل وصحيح |
| **عدم كسر وظائف سابقة** | ✅ لا تعارض مع RizqSub / i18n / dashToken / Messenger |
| **اكتمال متطلب Limam (13/08)** | ⚠️ **جزئي** — 3/10+ صفحات تواصل عامة |
| **جاهزية إنتاج التسجيل** | ⚠️ يتطلب CORS + URL خادم حقيقي |

---

*أُعدَّ هذا التقرير آلياً + مراجعة يدوية للعلاقات بين الملفات. للجلسات القادمة: راجع §7 قبل أي deploy، و§8 للتحسينات ذات الأولوية.*
