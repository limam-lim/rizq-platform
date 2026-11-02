# FIXES-CLS-1 — ثبات التخطيط (CLS)

فرع: `fix-cls-1` (من `main`)  
هدف القياس: كل قيمة cold/warm على 390 / 768 / 1440 لـ الرئيسية، browse، products، store **&lt; 0.05**  
أداة القياس: `qa/cls-1/test-cls-reload.js` (Playwright + PerformanceObserver، خطوط Google مُجهَضة)

لا إعادة تصميم — أقفال ارتفاع/هامش/overflow، وإصلاحات حقن الهيدر، وتثبيت الهوامش الحرجة فقط.

## قبل (baseline — `qa/cls-1/cls-baseline.json`)

| عرض | صفحة | cold | warm |
|-----|------|------|------|
| 390 | landing | 0.3894 | 0.3613 |
| 390 | browse | 0.0330 | 0.0674 |
| 390 | products | 0.0293 | 0.0130 |
| 390 | store | 0.1474 | 0.1305 |
| 768 | landing | 0.5612 | 0.1810 |
| 768 | browse | 0.0166 | 0.0629 |
| 768 | products | 0.0289 | 0.0024 |
| 768 | store | 0.0904 | 0.0802 |
| 1440 | landing | 0.1324 | 0.1645 |
| 1440 | browse | 0.0055 | 0.0223 |
| 1440 | products | 0.4324 | 0.0417 |
| 1440 | store | 0.1078 | 0.1012 |

## بعد (آخر تشغيل ناجح لـ `test-cls-reload.js` — `qa/cls-1/cls-report.json`)

| عرض | صفحة | cold | warm |
|-----|------|------|------|
| 390 | landing | 0.0001 | 0.0001 |
| 390 | browse | 0.0016 | 0.0017 |
| 390 | products | 0.0077 | 0.0077 |
| 390 | store | 0.0135 | 0.0135 |
| 768 | landing | 0.0000 | 0.0000 |
| 768 | browse | 0.0012 | 0.0013 |
| 768 | products | 0.0056 | 0.0056 |
| 768 | store | 0.0190 | 0.0190 |
| 1440 | landing | 0.0160 | 0.0038 |
| 1440 | browse | 0.0266 | 0.0266 |
| 1440 | products | 0.0281 | 0.0281 |
| 1440 | store | 0.0496 | 0.0496 |

`ok=true` في هذا التشغيل (كل القيم &lt; 0.05).

## ما تغيّر (ملخص)

- FOUC / أقفال ارتفاع: `#rmh-nav`، `#hero-pills-nav`، `#hero-listings`، `#hero-tagline`، `.hero-subtitle-card`، `.hero-content`، `#rizq-mock-hdr`، بحث الهاتف/المكتب، غلاف محل.
- إصلاح حلقة لا نهائية في `replaceChildren` (`rizq_civic_ticker.js` / `rizq_categories_config.js`) كانت ترمي `Invalid array length` وتُربك التخطيط.
- إخفاء `.topnav` المحلي من أول إطار على store/products.
- حقن مبكر متزامن لـ `rizq_header_mockup_trial.js` + قفل شبكة الهاتف/المكتب حسب `isPhone()`.
- تثبيت `bottom` لزر فلاتر browse فوق الشريط السفلي.
- `history.scrollRestoration='manual'` حيث ينقص.

## متبقٍ / مخاطر (لـ `refactor-landing-1`)

- **وميض دافئ متذبذب** على بعض إعادات التحميل (خصوصاً 768 للمنتجات/الرئيسية): رُصدت قفزات CLS دافئة &gt; 0.05 في تشغيلات متكررة خارج السكربت الرسمي، مرتبطة بتسابق شبكة الهاتف↔المكتب داخل الهيدر المحقون وإظهار العناصر بعد الكاش.
- `#rmh-search-form` ما زال يظهر أحياناً في مصادر الـ Layout Shift بارتفاعات «شبحية» رغم قفل CSS على 74/34.
- `store` @1440 قريب من العتبة (~0.0496).
- لم يُدمَج هذا الفرع بطلب المستخدم؛ المتبقي يُعالَج ضمن تنظيف الرئيسية.

## ملفات القياس

- `qa/cls-1/cls-baseline.json` — قبل
- `qa/cls-1/cls-report.json` — بعد
- `qa/cls-1/test-cls-reload.js` / `dig-cls.js`
