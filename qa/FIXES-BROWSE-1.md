# FIXES-BROWSE-1

Branch: `fix-browse-1` (`cursor/fix-browse-1-691e`)

| البند | الملفات | الاختبار | النتيجة |
|------|---------|----------|---------|
| أ) عزل الاختبارات على `rizq_test` | `rizq-backend/scripts/run-with-test-db.js`, `assert-rizq-test-db.js`, `_spawnHttpTestServer.js`, `rizq-backend/package.json` (`test:*` عبر الغلاف)، `package.json` (الجذر)، `server.js` (حفظ `DATABASE_URL`/`DB_DRIVER`/`TRUST_PROXY`)، اختبارات HTTP التي كانت تضرب :3000 (`packages-core`/`b14`/`verify-dash-pending`) + `test-sessions-concurrency` (`TRUST_PROXY=1`) | كل `npm run test:*` في `rizq-backend`؛ رفض صريح إذا `DATABASE_URL` ≠ `rizq_test` | pass (حزمة كاملة؛ sessions 28/28) |
| ب) تمرير لانهائي بدون قفز | `rizq_browse.html` (`loadMoreAds` يلحق الدفعة بـ `insertAdjacentHTML` بدل `renderResultList` كامل؛ تحديث `#rl-infinite` فقط) | `test:browse` + لقطات `qa/browse-1/` (كمبيوتر 1440 / هاتف 375، ~100 إعلان على `rizq_test`) | pass — كونسول بلا أخطاء؛ التمرير يبقى في الأسفل على سطح المكتب |
| ج) أحدث الإعلانات على الهاتف | `rizq_landing_v8.html` (`buildCards` + `_rizqMaybePaintDemoInventory` يزرعان `FEATURED_ADS` في `ADS` عند الفراغ وبعد `rizq:launch`)؛ `rizq_backend_config.js` (نفس الأصل محلياً إن لم يكن منفذ static منفصل) | لقطة `after-landing-mobile-375.png` — `#hero-listings` `display:block` وبطاقات ظاهرة؛ كونسول 0 أخطاء | pass |
| د) سعر/عنوان فارغ | `rizq_ad_cards.js` (شارة السعر دائماً؛ الفارغ → «السعر عند التواصل»)؛ `rizq_browse.html` (`adHasPublicTitle` + تصفية القوائم؛ سعر افتراضي عند التواصل)؛ `rizq_landing_v8.html` (نفس التصفية في المجمعات) | `test:browse` (وحدة `mediaHtml` AR/FR) | pass |

## ملاحظات

- **جزء 1 (بلا فرع):** نُظّفت بقايا `AD_C_*` من `rizq_audit` سابقاً؛ `launchDate` بقي `null`؛ `/api/ads` على المعاينة → `[]` (الإعلانات الأصلية المضمّنة تظهر عبر DEMO عند السماح).
- **ممنوع** تشغيل اختبارات على `rizq_audit` — الغلاف يفرّغ `rizq_test` قبل/بعد ويضبط `DATABASE_URL`.
- لقطات `qa/browse-1/*.png` محلية فقط (مدرجة في `.gitignore` — لا تُدفع).
- إعادة اللقطات: `node qa/browse-1/capture-screens.js` (يتطلّب Playwright في `qa/browse-1`).
