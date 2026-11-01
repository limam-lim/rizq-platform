# FIXES-BROWSE-1

Branch: `fix-browse-1` (`cursor/fix-browse-1-691e`)

| البند | الملفات | الاختبار | النتيجة |
|------|---------|----------|---------|
| أ) عزل الاختبارات على `rizq_test` | `rizq-backend/scripts/run-with-test-db.js`, `assert-rizq-test-db.js`, `_spawnHttpTestServer.js`, `package.json` (جذر + backend)، `server.js` (حفظ `DATABASE_URL`/`DB_DRIVER`/`TRUST_PROXY`)، اختبارات HTTP ذات spawn | كل `npm run test:*`؛ رفض إن لم تكن القاعدة `rizq_test` | pass |
| ب) تمرير لانهائي بلا قفز للأعلى | `rizq_browse.html`: `loadMoreAds` يلحق فقط؛ `applyFilters({soft})` يحافظ على `visibleCount`/التمرير و**يتخطّى إعادة `innerHTML`** إن تطابقت بطاقات الظاهرة؛ مستمع `window.scroll` + `IntersectionObserver(root:null)` على الهاتف | روبوت `qa/browse-1/test-scroll-cls.js`: 6 و 100 إعلان × 1440 و 375 × 3 تمريرات + محاكاة soft عند الأسفل — `suddenDrop=false`؛ كونسول 0؛ بلا تلويث `rizq_audit` | pass |
| ج) أحدث الإعلانات على الهاتف | `rizq_landing_v8.html` يزرع `FEATURED` في `ADS` عند السماح؛ `rizq_backend_config.js` نفس الأصل محلياً | لقطة هاتف + روبوت | pass |
| د) سعر/عنوان فارغ | `rizq_ad_cards.js` + تصفية العنوان في browse/landing | `test:browse` | pass |
| هـ) F5 بلا قفز/فراغ + CLS | الرئيسية: `history.scrollRestoration='manual'` + تثبيت أعلى الصفحة بلا هاش؛ `min-height` على `#hero-listings` / `.categories-after-promo` فقط. التصفح: `scrollRestoration='manual'` + `min-height` على `#result-list-body` | Playwright CLS بعد F5 | انظر الأرقام |

## CLS (Cumulative Layout Shift) — بعد F5

| الصفحة | قبل (تحميل أول / اهتزاز المحتوى قبل التثبيت) | بعد (إعادة تحميل مع الإصلاح) |
|--------|-----------------------------------------------|------------------------------|
| الرئيسية `rizq_landing_v8.html` | **0.6033** | **0.0470** (< 0.1) |
| التصفح `rizq_browse.html` | **0.0028** | **0.0022** (< 0.1) |

المصدر: `qa/browse-1/scroll-cls-report.json` (محلي، لا يُدفع). إعادة القياس: 2026-11-01.

## جذر قفزة التصفح

1. `_rizqMergeBackendAds` / `syncDemoWithLaunch` كانا يستدعيان `applyFilters()` فيصفّران `visibleCount=PER_PAGE` ويعيدان `innerHTML` → القفز للأعلى.
2. حتى مع `soft`، `renderResultList()` كان يعيد كتابة القائمة كاملة فيُصفّر التمرير قبل استعادة الموضع — الآن يُتخطّى الرسم الكامل عند تطابق معرّفات البطاقات الظاهرة، مع استعادة التمرير عبر `rAF`.
3. على الهاتف التمرير على **النافذة** بينما المراقب كان مربوطاً بـ `#result-list-body` فقط.

## عزل الاختبار عن المعاينة

- روبوت التمرير/CLS يزرع عبر SQL مباشر على `rizq_test` فقط (بدون `platformStore.writeAds` حتى لا يُكتب `data/ads.json`).
- لقطة/استعادة لـ `data/ads.json` و `accounts.json`؛ بعد التشغيل يتحقق أن `rizq_audit` بلا `BRW_*`.
- معاينة المنفذ 3000 على `rizq_audit` مع `/api/ads` فارغ و`launchDate=null`.

## ملاحظات

- معاينة المنفذ **3000** على هذا الفرع (ليس main).
- لا دمج حتى تأكيدك اليدوي على المعاينة.
- لقطات/تقارير `qa/browse-1/*.{png,json}` محلية فقط (`.gitignore`).
- إعادة روبوت التمرير/CLS: `node qa/browse-1/test-scroll-cls.js`.
