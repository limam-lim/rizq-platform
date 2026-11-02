# FIXES-HOME-COMMERCE-1

Branch: `fix-home-commerce-1` (من `main` بعد دمج محلي لـ `refactor-landing-1`)  
منطق وترتيب أقسام فقط — بلا إعادة تصميم. UTF-8 / LF. **لا PR حتى المراجعة.**

## 1) ترتيب الرئيسية

الترتيب في `rizq_landing_v8.html`:

1. الواجهة (`#hero`)
2. شريط أحدث الإعلانات (`#hero-listings`)
3. أفكار الأنماط (`#rizq-styles`)
4. نماذج المعارض (`#rizq-showroom-models`)
5. إعلان الفيديو + شريط الفيديو (`hero-after-promo` / `#rizq-vid-strip` / `#rvid-section`)
6. باقي الأقسام بترتيبها السابق (`#categories` → `#listings` → …)

روابط القفز في `#section-jump-bar` حُدّثت لتشمل `#hero-listings` و`#rizq-styles` و`#rizq-showroom-models`.

### CLS (`qa/cls-1/test-cls-reload.js`)

كل القيم &lt; 0.05 بعد إعادة الترتيب:

| عرض | صفحة | cold | warm |
|-----|------|------|------|
| 390 | landing | 0.0056 | 0.0055 |
| 768 | landing | 0.0039 | 0.0039 |
| 1440 | landing | 0.0016 | 0.0054 |
| … | browse/products/store | كلها ≤ 0.0496 | … |

تحقق إضافي: `qa/home-commerce-1/verify-home.js` → CLS 1440 cold = **0.0051**.

## 2) مصادر الأقسام من الخادم

`GET /api/catalog/home?section=styles|showrooms|stores&cat=&limit=`

- منتجات `status=active` فقط من حسابات `approved` وغير معلّقة
- كاش داخل الذاكرة **60 ثانية** + `Cache-Control: public, max-age=60`
- فهارس: ترحيل `1793630000000_catalog-home-indexes`
- بوابة التواصل (`contactsLocked`) كما في صفحات المحلات
- التجريبي قبل `launchDate` يبقى عبر `RizqDemo.inventoryAllowed()` على العميل

| قسم | مصدر | ملاحظات |
|-----|------|---------|
| أفكار الأنماط | `section=styles` | حد أقصى **4** منتجات لكل محل؛ أُلغي مسح `localStorage` / `_styCollectStoreStyleItems` كمصدر |
| نماذج المعارض | `section=showrooms&cat=` | **طلب واحد** بدل N+1 (`/api/accounts/public` + catalog لكل معرض) |
| شريط أحدث | `section=stores` + `/api/ads` | انظر §3 |

ملفات العميل: `landing-styles.js`, `landing-showrooms.js`, `landing-qcat.js`.

## 3) منتجات محلات غير الأزياء في شريط أحدث الإعلانات

- دمج خادمي `section=stores` مع الإعلانات في `hydrateLiveAds`
- شارة `.rzq-adx-badge`: «جديد من &lt;اسم المحل&gt;»
- النقر → `rizq_store.html?id=…&product=…` (فتح المنتج)
- حدود خادمية: منتجان لكل محل خلال 24 ساعة؛ معتمدة فقط؛ أولوية باقة ماسية (`isDiamondActive`)
- حد العميل: منتجات المحلات ≤ **ثلث** الشريط

## 4) رصيد تبديل الباقة (`subRequestActivation.js`)

- `credit = (oldPrice ÷ oldDays) × remainingDays`
- يُخصم من سعر الباقة الجديدة عند `POST /api/sub-requests` — **لا يُرد نقداً**
- إن `credit > newPrice` → تمديد المدة بـ `(credit − newPrice) / newPrice × newDays`
- معاينة: `GET /api/sub-requests/package-credit`
- يظهر الحساب في نموذج الدفع (`#pay-credit-box`) ولوحة الأدمن (`renderSubRequests`)
- يُسجَّل في `packageHistory` + `lastPackageCredit`

اختبارات: `npm run test:package-credit` — ترقية، تخفيض+تمديد، انتهاء، طلبان متزامنان (نفس id).

## 5) عدّاد «إعلان نشط»

`minActiveAdsToShow` الافتراضي = **50** عندما يكون الحقل غير مضبوط  
(`launchMode.DEFAULT_MIN_ACTIVE_ADS_TO_SHOW`، و`rizq_backend_config.js`).

## 6) أوامر npm للاختبارات غير المربوطة

في `rizq-backend/package.json`:

- `test:fix-agents-1` / `test:fix-agents-2`
- `test:ui-logic-1`
- `test:ops-1`
- `test:caddy-security`
- `test:sentinel-1` (مرادف لـ `test:sentinel`)
- `test:home-catalog` / `test:package-credit` (جديد)

## اختبارات على `rizq_test`

| أمر | النتيجة |
|-----|---------|
| `test:home-catalog` | ALL OK / 18 |
| `test:package-credit` | ALL OK / 18 |
| `test:package-period` | 21 passed |
| `test:launch-demo` / `test:a1-launch` | ALL OK |
| `test:fix-agents-1/2`, `test:ui-logic-1`, `test:ops-1`, `test:caddy-security`, `test:sentinel-1` | passed |
| `test:packages-core/b14`, `test:async-regressions`, `test:contact-scrub`, `test:browse` | passed |

### متصفح / طلبات الرئيسية

`node qa/home-commerce-1/verify-home.js` (بعد `launchDate` في الكاش):

| مقياس | قبل (متوقع) | بعد |
|-------|-------------|-----|
| طلبات كتالوج المعارض | 1 + N لكل معرض | **1** (`section=showrooms`) |
| أفكار الأنماط | localStorage | **1** (`section=styles`) |
| منتجات المحلات للشريط | — | **1** (`section=stores`) |
| `/api/catalog?accountId=` | متعدد | **0** |

لقطات: `/opt/cursor/artifacts/home-commerce-*.png`  
تقرير: `/opt/cursor/artifacts/home-commerce-verify.json`
