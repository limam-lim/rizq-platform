# REFACTOR-LANDING-1

Branch: `refactor-landing-1` (من `main`)  
قاعدة: إعادة هيكلة فقط — بوابة بصرية Playwright + pixelmatch (عتبة **0.1%**) بعد كل مرحلة. UTF-8 / LF. لا PR حتى المراجعة.

أداة البوابة: `qa/refactor-landing-1/visual-gate.js`  
`node qa/refactor-landing-1/visual-gate.js baseline|compare`  
لقطات: 390 / 768 / 1440 × ar / fr، fullPage، حركة/مؤقتات/عشوائية مثبّتة، صور خارجية ملغاة.

## المقاييس — الحجم والأسطر و`!important`

| المرحلة | `rizq_landing_v8.html` بايت | أسطر | `!important` (HTML+CSS المضمّن/المستخرج) | ملاحظة |
|---------|------------------------------|------|------------------------------------------|--------|
| قبل | 1 079 330 | 17 462 | **1124** | 4×`<style>`، 13 سكربت مضمّن، 52 وسم script |
| بعد 1 — فصل | 183 924 | 2 047 | **1080** (3 HTML + 1077 CSS) | `rizq_landing.css` + أجزاء cascade + `landing-*.js` |
| بعد 2 — دمج | ~184 k | 2 047 | **1061** | 24 دمج محدِّد؛ إسقاط `!important` من fouc + ads-preview فقط |
| بعد 3 — ميت | بدون حذف آمن | — | — | انظر أدناه |
| بعد 4 — CLS | 184 108 | 2 049 | **1276** (أقفال ارتفاع CLS تضيف `!important` عمداً) | أقفال من `fix-cls-1` دون دمجه |

`#hero-listings`: بقي ~20 مقطعاً بعد الدمج (أغلبها داخل media/محددات مختلفة — ليست نسخاً مطابقة).

## البوابة البصرية (pixelmatch)

بعد كل مرحلة ناجحة: **max diff ≤ 0.1%** على كل اللقطات الست، وكونسول بلا أخطاء صفحة.

| نقطة | النتيجة |
|------|---------|
| بعد المرحلة 1 (مقابل أصل `main`) | pass (max ≈ 0.0985%) |
| بعد المرحلة 2 | pass |
| بعد المرحلة 4 (شكل نهائي مستقر + أقفال CLS) | pass مقابل خط أساس ما بعد CLS (max ≈ 0.045%) |

**0 فرق مرئي معنوي** ضمن عتبة 0.1% بعد التثبيت الحتمي للقطات.

## CLS (الهدف &lt; 0.05) — `qa/cls-1/test-cls-reload.js`

| عرض | صفحة | cold | warm |
|-----|------|------|------|
| 390 | landing | 0.0056 | 0.0055 |
| 390 | browse | 0.0016 | 0.0017 |
| 390 | products | 0.0077 | 0.0077 |
| 390 | store | 0.0135 | 0.0135 |
| 768 | landing | 0.0039 | 0.0039 |
| 768 | browse | 0.0012 | 0.0393 |
| 768 | products | 0.0056 | 0.0056 |
| 768 | store | 0.0190 | 0.0190 |
| 1440 | landing | 0.0180 | 0.0054 |
| 1440 | browse | 0.0266 | 0.0266 |
| 1440 | products | 0.0281 | 0.0281 |
| 1440 | store | 0.0495 | 0.0496 |

`ok=true` — كل القيم &lt; 0.05.  
مرجع التشخيص: `qa/FIXES-CLS-1.md` (من فرع `fix-cls-1`، منسوخ للمرجعية دون دمج ذلك الفرع).

## زمن التحميل (محاكاة 4G تقريباً: 1.6 Mbps / 150 ms)

| | DOMContentLoaded | استقرار ~1.5s |
|--|------------------|---------------|
| قبل (HTML موحّد من `main`) | 23 736 ms | 25 237 ms |
| بعد (مفصّل + CLS) | 18 693 ms | 20 194 ms |

المصدر: `qa/refactor-landing-1/load-timing-4g.json`.

## المراحل — ماذا تغيّر

### 1) فصل بلا تعديل
- CSS → `rizq_landing.css` + أجزاء بنفس ترتيب التحميل الأصلي:  
  `rizq_landing-fouc.css` → أوراق المكوّنات → `rizq_landing-mobile-critical.css` + `rizq_landing-main.css` → `rizq_landing-ads-preview.css`
- JS مضمّن → `landing-*.js` (core/ads/styles/showrooms/estate/qcat/hero/categories/i18n/chrome/register/prices + boots)
- CSP في `server.js` / Caddyfile: `script-src`/`style-src 'self'` كافٍ — بلا تعديل

### 2) دمج المكرر
- `qa/refactor-landing-1/phase2-dedupe-css.js`: دمج محدِّدات متطابقة داخل كل وعاء `@media`
- إسقاط `!important` حيث البوابة بقيت خضراء (fouc، ads-preview)؛ `mobile-critical` رُفض وأُعيد

### 3) الكود الميت
- تغطية Chrome عبر Playwright: `qa/refactor-landing-1/phase3-coverage.js`
- **لا حذف**: وحدات `landing-*.js` كلها مربوطة من HTML؛ نطاقات CSS غير المغطاة تتداخل مع مسارات تفاعل/`@media`. سجل: `phase3-deadcode.json`

### 4) CLS
- أقفال من `fix-cls-1` على FOUC/mobile-critical، وتأجيل خطوط Google، وتحديث  
  `rizq_header_mockup_trial.{js,css}`، `rizq_civic_ticker.js`، `rizq_categories_config.js` (بلا تفريغ `#categories`)، `rizq_mobile.css`، `rizq_header.js`، وثبات browse/products/store

## اختبار الحزمة

`npm run test:smoke` على `rizq_test`: **SMOKE PASSED**

## ملاحظات للمراجع

- معاينة هذا الفرع فقط — لا دمج حتى تأكيدك.
- لقطات البوابة محلية تحت `qa/refactor-landing-1/shots/` (gitignore).
- `store` @1440 قريب من العتبة (~0.0496).
