# FIXES-REGRESSIONS-1

فرع: `cursor/fix-regressions-1-9d2d` من `main` @ `6c2f8b1`.

## 1) انحدار مالي — تمديد نفس الباقة

**العَرَض:** `test:package-period` → `same package while active: extends from current end` بفشل لأن `before === after`.

**السبب:** بعد #268 كان مسار التفعيل يتخطّى أي طلب لنفس `packageId` وهي فعّالة (`skippedDuplicate`) — بما في ذلك التجديد المشروع.

**الإصلاح** في `rizq-backend/services/subRequestActivation.js`:
- تجديد نفس الباقة وهي فعّالة → `computeActivationPeriod` يمدّ من `periodEnd` الحالي.
- رصيد التبديل فقط عند `packageId` مختلف (`resolveSwitchCreditForAccount` / `computePackageCredit`).
- التخطّي يبقى فقط لطلب تبديل متزامن وصل بعد اكتمال التبديل على الهدف (`packageCredit.applicable` على الطلب أو `packageHistory[0].endedAt` خلال ~15ث).

**اختبارات:** `test:package-credit` يغطي الأربع معاً (نفس فعّالة، نفس منتهية، تبديل برصيد، طلبان متزامنان) + `test:package-period`.

## 2) test:register-sync-fail

بعد تفكيك اللاندينغ انتقلت الدوال إلى `landing-chrome.js` و`landing-register.js`. حُدّث `scripts/test-register-sync-fail.js` ليقرأ هذه الملفات. **لم يُغيَّر منطق التسجيل.**

## 3) نتائج كل `test:*` (حرفي — exit 0 لكلها)

الخادم على `http://127.0.0.1:3000` كان يعمل أثناء الاختبارات التي تحتاج HTTP.

| الاختبار | النتيجة | مخرج حرفي |
|----------|---------|-----------|
| test:2fa | PASS | 25 passed, 0 failed |
| test:a1-launch | PASS | 9/9 checks passed |
| test:admin-roles | PASS | admin-roles tests: OK (super, admin, commercial, finance, moderator, support) |
| test:async-regressions | PASS | 26 passed, 0 failed |
| test:await | PASS | ✓ no unawaited async calls (122 server files scanned) |
| test:backup | PASS | 8/8 checks passed |
| test:browse | PASS | ALL OK / 11 |
| test:caddy-security | PASS | All caddy security tests passed. |
| test:contact-scrub | PASS | 22 passed, 0 failed |
| test:fix-agents-1 | PASS | All fix-agents-1 unit tests passed. |
| test:fix-agents-2 | PASS | All fix-agents-2 unit tests passed. |
| test:hardening | PASS | ALL PROD HARDENING UNIT TESTS PASSED |
| test:home-catalog | PASS | ALL OK / 18 |
| test:images | PASS | 15/15 checks passed |
| test:kyc | PASS | 28 passed, 0 failed |
| test:launch-demo | PASS | ALL OK / 14 |
| test:lifecycle | PASS | 18/18 checks passed |
| test:lifecycle-save | PASS | 8 passed, 0 failed |
| test:ops | PASS | 41/41 checks passed |
| test:ops-1 | PASS | All ops-1 tests passed. |
| test:package-credit | PASS | ALL OK / 24 |
| test:package-period | PASS | package period & history: 21 passed, 0 failed |
| test:packages-b14 | PASS | ALL OK / 17 |
| test:packages-core | PASS | ALL OK / 12 |
| test:pg-repos | PASS | [test-pg-repos] ALL PASSED |
| test:prefix | PASS | 8/8 checks passed |
| test:quota-concurrency | PASS | 48 passed, 0 failed |
| test:register-sync-fail | PASS | ALL OK / 13 |
| test:sentinel | PASS | SENTINEL-1 OK |
| test:sentinel-1 | PASS | SENTINEL-1 OK |
| test:sessions | PASS | 28 passed, 0 failed |
| test:trial-once | PASS | 15 passed, 0 failed |
| test:ui-logic-1 | PASS | All ui-logic-1 tests passed. |
| test:verify-dash-pending | PASS | ALL OK / 6 |
| test:widget-lang | PASS | 17/17 passed |

**المجموع: 35/35 PASS — 0 فشل.**

سجلات كاملة تحت `/opt/cursor/artifacts/test-regressions/`.
