# تقرير الاختبار الميداني الأخير — Go-Live Check
**التاريخ:** 13 أغسطس 2026  
**المنصة:** رزق (Rizq) — rizq-backend + Web Widget

---

## ملخص تنفيذي

| المحور | النتيجة | التفاصيل |
|--------|---------|----------|
| اختبارات آلية سابقة | ✅ 100% | 27/27 + 4/4 + 7/7 |
| `node --check server.js` | ✅ | بدون أخطاء Syntax |
| أدوات الويدجت (حتمية) | ✅ 10/10 | 5 إعلانات + بحث + بائع + سياق |
| Fallback محلي (7s) | ✅ | RizqManager + سياق الإعلان |
| المشرف Server-Side | ✅ 4/4 | رفض خمر/احتيال/روابط + قبول نظيف |
| Claude API حي | ⏸️ معلّق | `ANTHROPIC_API_KEY` غير موجود في `.env` |

**الحالة:** جاهز للإطلاق تقنياً بعد إضافة مفتاح Claude وتشغيل `--live` مرة واحدة.

---

## 1. ما تم تنفيذه في هذه الجولة

### أ) Middleware المشرف على `POST /api/ads`
- ملف جديد: `rizq-backend/services/moderatorServer.js`
- يعيد استخدام **`rizq_moderator_agent.js`** بالكامل (نفس قواعد R01–R14 + H01–H08)
- يرفض المحتوى المحظور بـ **HTTP 422** قبل `writeAds()`
- يمرّر قرار `review_human` ويحفظ الإعلان كـ `pending` (كما كان)
- مُربوط في `server.js`:

```javascript
app.post('/api/ads', adsPublishLimiter, moderatorAdMiddleware, (req, res) => { ... });
```

**أمثلة مرفوضة:**
- `بيع خمر` → `reject` (R02)
- `تحويل مسبق + دفع أولاً + western union` → `reject` (R06)
- `https://spam.com` في الوصف → `reject` (R14)

### ب) سكربت الاختبار الميداني
- ملف: `rizq-backend/scripts/live-widget-test.js`

```bash
cd rizq-backend
node scripts/live-widget-test.js --seed      # أدوات + fallback + moderator
node scripts/live-widget-test.js --seed --live   # + Claude حي (يتطلب المفتاح)
```

---

## 2. نتائج التشغيل (13/08/2026)

### Deterministic Tools — ✅ 10/10
| الاختبار | النتيجة |
|----------|---------|
| 5× `get_ad_details` | أسعار صحيحة (185000, 45000, 320000, 25000, 28000) |
| `search_ads` (آيفون) | 1 نتيجة |
| `get_seller_profile` | متجر النجمة |
| `get_seller_reputation` | trust=82 |
| `resolvePageContextFacts` | ads=1 |

> **ملاحظة:** `ads.json` كان فارغاً محلياً — زُرعت 5 إعلانات تجريبية بـ `--seed`. في الإنتاج، استبدلها ببياناتك الحقيقية أو انسخ `ads.json` من السيرفر.

### Local Fallback (مسار 7 ثوانٍ) — ✅
- `RizqManager.processMessage` يعمل بدون API
- سؤال «كم سعر هذا الإعلان؟» مع `pageContext.ad` يُرجع السعر من الإعلان المفتوح
- سؤال «طرق الدفع» يُرجع FAQ Bankily/Sedad

### Server Moderator — ✅ 4/4
| حالة | القرار |
|------|--------|
| إعلان نظيف (ثلاجة LG) | `review_human` أو `approve` |
| بيع خمر | `reject` |
| مؤشرات احتيال مزدوجة | `reject` |
| رابط خارجي | `reject` |

### Claude API حي — ⏸️ لم يُنفَّذ
```
ANTHROPIC_API_KEY غير موجود في rizq-backend/.env
```

---

## 3. خطوة واحدة قبل الإطلاق 100%

1. افتح `rizq-backend/.env` وأضف:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
   (من [console.anthropic.com](https://console.anthropic.com/settings/keys))

2. انسخ `data/ads.json` الحقيقي من بيئة الإنتاج (أو احذف العينات التجريبية).

3. شغّل الاختبار الحي:
   ```bash
   cd rizq-backend
   node scripts/live-widget-test.js --live
   ```
   المتوقع: 3 استعلامات Claude مع `toolsUsed > 0` و `grounded=true`.

4. (اختياري) اختبار يدوي سريع على الويدجت:
   - افتح `rizq_browse.html?id=RZQ-2026-10001`
   - اسأل: «كم السعر؟» — يجب أن يرد Claude أو Fallback خلال ≤7s

---

## 4. قائمة التحقق Go-Live

- [x] Function calling حتمي (6 أدوات)
- [x] Fallback محلي عند timeout 7s
- [x] `validateReply()` ضد تخمين الأسعار
- [x] تذاكر الدعم في `support-tickets.json`
- [x] `/api/agent/toggle` على rizq-backend
- [x] **Moderator server-side على POST /api/ads** ← جديد
- [ ] Claude API حي على 3–5 إعلانات حقيقية ← يحتاج المفتاح
- [ ] استعادة تعليقات server.js العربية من OneDrive (تشوه encoding)

---

## 5. الملفات الجديدة/المعدّلة

| الملف | التغيير |
|-------|---------|
| `rizq-backend/services/moderatorServer.js` | **جديد** — middleware المشرف |
| `rizq-backend/scripts/live-widget-test.js` | **جديد** — اختبار Go-Live |
| `rizq-backend/server.js` | ربط `moderatorAdMiddleware` على POST /api/ads |
| `rizq-backend/data/ads.json` | 5 إعلانات تجريبية (بعد --seed) |
| `rizq-backend/data/accounts.json` | 3 حسابات تجريبية (بعد --seed) |

---

**الخلاصة:** المنصة محصّنة تقنياً. بعد إضافة `ANTHROPIC_API_KEY` وتشغيل `--live` بنجاح، يمكن الإطلاق بثقة كاملة.
