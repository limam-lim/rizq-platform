# تقرير المرحلة 3 — تكامل قاعدة البيانات ومسارات API
**التاريخ:** 13 أغسطس 2026  
**الحالة:** مكتملة ومختبرة محلياً

---

## 1. ملخص تنفيذي

تم استبدال تخزين المشترين في `buyers.json` بطبقة **SQLite** حقيقية، مع مسارات API موحّدة للمصادقة والمفضلة، ومعالجة أخطاء HTTP موحّدة. الواجهة الأمامية (`rizq_auth_gate.js`) تستخدم الآن `/api/auth` وتزامن `rizq_wishlist` مع الخادم.

---

## 2. قاعدة البيانات

| العنصر | التفاصيل |
|--------|----------|
| **المحرك** | SQLite عبر `node:sqlite` (مدمج في Node 22+) — **بدون** `better-sqlite3` |
| **الملف** | `rizq-backend/data/rizq.db` |
| **الترحيل** | استيراد تلقائي من `data/buyers.json` عند أول تشغيل إذا كان جدول `buyers` فارغاً |

### الجداول

**`buyers`**
- `id`, `name`, `phone` (UNIQUE), `email`, `token`, `created_at`, `last_login_at`

**`wishlist_items`**
- `buyer_id` + `item_id` (PK مركّب), `added_at`, FK → `buyers(id)` ON DELETE CASCADE

### الملفات

```
rizq-backend/db/index.js
rizq-backend/models/buyer.js
rizq-backend/models/wishlist.js
```

---

## 3. مسارات API

### `/api/auth`

| Method | Path | Auth | HTTP | الوصف |
|--------|------|------|------|--------|
| POST | `/register` | لا | 201/200 | تسجيل = دخول (name + phone + email?) |
| POST | `/login` | لا | 200/404 | دخول برقم الهاتف فقط |
| GET | `/me` | query id&token | 200/401 | التحقق من الجلسة |
| POST | `/logout` | Bearer | 200 | توافق مستقبلي (stateless) |

### `/api/wishlist`

| Method | Path | Auth | HTTP | الوصف |
|--------|------|------|------|--------|
| GET | `/` | Bearer + X-Buyer-Id | 200 | قائمة معرّفات المفضلة |
| PUT | `/` | Bearer | 200 | استبدال كامل `{ ids: [...] }` |
| POST | `/sync` | Bearer | 200 | دمج مع القائمة المحلية |
| POST | `/:itemId` | Bearer | 201 | إضافة عنصر |
| DELETE | `/:itemId` | Bearer | 200 | حذف عنصر |

**مصادقة المشتري:** `Authorization: Bearer <token>` + `X-Buyer-Id: <id>` (أو query `id` & `token` لـ `/me`).

### توافق رجعي (deprecated)

- `POST /api/buyers/register` → نفس منطق `BuyerModel.registerOrLogin`
- `GET /api/buyers/me` → نفس منطق `BuyerModel.findByIdAndToken`

---

## 4. معالجة الأخطاء

**شكل الاستجابة:** `{ ok: false, error: "...", code?: "..." }`

| Code | HTTP | الحالة |
|------|------|--------|
| `NAME_REQUIRED` | 400 | اسم فارغ |
| `INVALID_PHONE` | 400 | هاتف موريتاني غير صالح |
| `PHONE_REQUIRED` | 400 | login بدون phone |
| `AUTH_REQUIRED` | 400/401 | id/token ناقص |
| `UNAUTHORIZED` | 401 | جلسة غير صالحة |
| `NOT_FOUND` | 404 | مسار أو حساب غير موجود |
| `RATE_LIMIT` | 429 | تجاوز حد المحاولات |
| `CORS_DENIED` | 403 | أصل غير مسموح |

**Middleware:** `middleware/errors.js` — `asyncHandler`, `globalErrorHandler`, `notFoundHandler`

---

## 5. تحديثات الواجهة الأمامية

**`rizq_auth_gate.js`**
- `POST /api/auth/register` بدلاً من `/api/buyers/register`
- `GET /api/auth/me` للتحقق الصامت
- بعد التسجيل: `POST /api/wishlist/sync` مع `rizq_wishlist` المحلي
- عند التحقق: `GET /api/wishlist` ودمج مع localStorage
- حدث `rizq_wishlist` لتحديث UI

---

## 6. اختبارات محلية

**Script:** `rizq-backend/scripts/test-phase3-lite.js`

```
OK register 201
OK me 200
OK bad phone 400
OK sync 200
OK get wl
OK no auth 401
OK 404

ALL PASSED (7/7)
```

**تشغيل:**
```bash
cd rizq-backend
node scripts/test-phase3-lite.js
```

---

## 7. ملاحظات النشر

1. **Node.js:** يتطلب **Node 22+** (لـ `node:sqlite`). الإصدار المحلي: v24.16.0 ✓
2. **`better-sqlite3`:** أُزيل من `package.json` — فشل البناء على Windows/Node 24 بدون Python؛ `node:sqlite` بديل أخف بدون native deps
3. **`node_modules`:** إن فشل `server.js` الكامل (مثلاً JSON تالف في `tr46`)، نفّذ:
   ```bash
   rm -rf node_modules
   npm install
   ```
4. **النسخ الاحتياطي:** احفظ `data/rizq.db` دورياً على السيرفر
5. **CORS:** من المرحلة 2 — `ALLOWED_ORIGIN` يدعم أصولاً متعددة مفصولة بفاصلة

---

## 8. الملفات المعدّلة/المضافة

| ملف | نوع |
|-----|-----|
| `rizq-backend/db/index.js` | جديد |
| `rizq-backend/models/buyer.js` | جديد |
| `rizq-backend/models/wishlist.js` | جديد |
| `rizq-backend/middleware/errors.js` | جديد |
| `rizq-backend/middleware/buyerAuth.js` | جديد |
| `rizq-backend/routes/auth.js` | جديد |
| `rizq-backend/routes/wishlist.js` | جديد |
| `rizq-backend/server.js` | معدّل — routers + legacy + error handlers |
| `rizq-backend/scripts/test-phase3-lite.js` | جديد |
| `rizq_auth_gate.js` | معدّل — auth + wishlist sync |

---

## 9. الخطوة التالية المقترحة (المرحلة 4)

- مزامنة المفضلة من صفحات `rizq_landing_v8` / `rizq_products` مباشرة عند toggle (ليس فقط عبر auth gate)
- OTP SMS حقيقي عند توفر بوابة المزوّد
- نسخ احتياطي تلقائي لـ `rizq.db`
