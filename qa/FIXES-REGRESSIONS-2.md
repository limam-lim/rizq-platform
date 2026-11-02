# FIXES-REGRESSIONS-2

فرع: `cursor/fix-regressions-2-9d2d` من `main` @ `7391d7e` (بعد #270 — A1/A2).

المرجع البصري: `d9efc9a`.

## A3 — خلفية `.hero-title-card`

**العَرَض:** بطاقة «خيارك الأول…» بلا الخلفية الزرقاء الثنائية.

**الإصلاح:** الإبقاء على `linear-gradient` الثنائي الكامل في `rizq_landing-main.css`، واستثناء `.hero-title-card` / `.hero-subtitle-card` من تجاوز `navy-grid !important` في `rizq_landing_ux.css` و`rizq-theme.css`، مع `background-image … !important` للطبقتين.

## A4 — الشريط العلوي

**العَرَض:** بحث أكبر؛ على 390px أزرار الشريط الثانوي مكدّسة/مقطوعة خارج الرئيسية.

**الإصلاح:**
- استعادة `rizq_header_mockup_trial.css` / `.js` من `d9efc9a`.
- إزالة أقفال CLS الصفحة (74px للبحث وغيرها) من `rizq_store.html` / `rizq_products.html` / `rizq_browse.html`.
- حصر FOUC بـ `html.rizq-landing` في `rizq_landing-fouc.css` + `class="rizq-landing"` على الرئيسية.

## A5 — صف التواصل تحت الهيرو

**العَرَض:** أزرار الإيميل/المحادثة/المشاركة مقطوعة على الهاتف في المتجر.

**الإصلاح:** إزالة قفل `.actions-bar` بـ 183px/`overflow:hidden`، واستعادة قواعد `rizq_mobile.css` للهيرو كما في d9 (إلغاء `#store-hero` الذي كان يغلب خصوصية `.has-hero-videos`).

## A6 — معرض الوكالة العقارية

**العَرَض:** مربعات سوداء بلا صور في معرض `rizq_estate.html`.

**الإصلاح:** `loading="eager"` + `referrerpolicy="no-referrer"` لصور سكة المعرض.

## A7 — بوابة الأنماط المحسوبة

`node qa/regressions-2/a7-computed-style-gate.js` → **totalDiffs=0**  
التقرير: `qa/regressions-2/a7-report.md` / `.json`.

| الصفحة | قبل (خام أول تشغيل) | بعد |
|---|---:|---:|
| landing | 512 | 0 |
| browse | 72 | 0 |
| products | 192 | 0 |
| store | 110 | 0 |
| estate | 140 | 0 |
| باقي الصفحات الـ17 | — | 0 |

## A8 — كل `test:*`

الخادم على `http://127.0.0.1:3000` كان يعمل. السجلات: `/opt/cursor/artifacts/test-regressions-2/`.

| الاختبار | النتيجة |
|----------|---------|
| test:2fa | PASS — 25 passed, 0 failed |
| test:a1-launch | PASS — 9/9 checks passed |
| test:admin-roles | PASS — OK |
| test:async-regressions | PASS — 26 passed, 0 failed |
| test:await | PASS — no unawaited async calls |
| test:backup | PASS — 8/8 checks passed |
| test:browse | PASS — ALL OK / 11 |
| test:caddy-security | PASS |
| test:contact-scrub | PASS — 22 passed, 0 failed |
| test:fix-agents-1 | PASS |
| test:fix-agents-2 | PASS |
| test:hardening | PASS — 15/15 |
| test:home-catalog | PASS — ALL OK / 18 |
| test:images | PASS — 15/15 checks passed |
| test:kyc | PASS — 28 passed, 0 failed |
| test:launch-demo | PASS — ALL OK / 14 |
| test:lifecycle | PASS — 18/18 checks passed |
| test:lifecycle-save | PASS — 8 passed, 0 failed |
| test:ops | PASS — 41/41 checks passed |
| test:ops-1 | PASS |
| test:package-credit | PASS — ALL OK / 24 |
| test:package-period | PASS — 21 passed, 0 failed |
| test:packages-b14 | PASS — ALL OK / 17 |
| test:packages-core | PASS — ALL OK / 12 |
| test:pg-repos | PASS |
| test:prefix | PASS — 8/8 checks passed |
| test:quota-concurrency | PASS — 48 passed, 0 failed |
| test:register-sync-fail | PASS — ALL OK / 13 |
| test:sentinel | PASS — SENTINEL-1 OK |
| test:sentinel-1 | PASS — SENTINEL-1 OK |
| test:sessions | PASS — 28 passed, 0 failed |
| test:trial-once | PASS — 15 passed, 0 failed |
| test:ui-logic-1 | PASS |
| test:verify-dash-pending | PASS — ALL OK / 6 |
| test:widget-lang | PASS — 17/17 passed |

**المجموع: 35/35 PASS — 0 فشل.**
