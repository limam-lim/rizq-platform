# FIXES-PACKAGES-2

Branch: `fix-packages-2`

| البند | الملفات | الاختبار | النتيجة |
|------|---------|----------|---------|
| B6 نفس/باقة مختلفة | `services/subRequestActivation.js` (`computeActivationPeriod`, مدة بالمعرّف أولاً)، `rizq_package_lifecycle_agent.js` (`priorPackageOf` / `packageHistory` / `prePending`) | `test:packages-core` + `test:package-period` (21) | pass |
| B8 حصة ذرّية + شحن لا يُصفَّر | `rizq_quota_guard_agent.js`, `db/quotaStore.js` (صف لكل مشترك + رصيد `paidMessages` منفصل) | `test:quota-concurrency` (48) + `test:packages-core` | pass |
| B3 حفظ سجل بسجل + CAS | `rizq_package_lifecycle_agent.js` (`_save` يكتب المتغيّر فقط؛ `updateIfUnchanged` أثناء الفحص)، `db/docStore.js` | `test:packages-core` + `test:lifecycle-save` (8) | pass |
| TRIAL مرة واحدة/حساب+فئة | `server.js` POST `/api/sub-requests`، lifecycle `syncAccountPackage` + `trialClaims.insertIfAbsent`؛ رفض الطلب لا يمسح مطالبة مستخدمة | `test:packages-core` + `test:trial-once` (15) | pass |
| B14 افتراضيات st/of/cp/tnd/inv/vid | `services/catalogConfig.js` | `test:packages-b14` | pass |
| RECEIPT sha256 | `services/receiptStorage.js`, `server.js` | `test:packages-b14` | pass |
| B16 حد كتالوج عام + تسريب ردود | `routes/catalog.js`, `routes/messages.js`, `inquiryAutoReply.js` | `test:packages-b14` | pass |

## قرار B6 (للمراجعة)

- **نفس الباقة وما زالت نشطة** (ليست منتهية/معلّقة/ملغاة): نهاية جديدة = `periodEnd` الحالي + مدة الباقة.
- **نفس الباقة منتهية/معلّقة أو باقة مختلفة:** البداية من لحظة التفعيل بأيام الباقة الجديدة فقط (بدون ترحيل أيام القديمة). تُسجَّل الباقة القديمة في `packageHistory`.
- طلب معلّق لا يخفي الباقة السابقة (`prePending`).
- مدة الباقة تُحلّ بالمعرّف أولاً (أسماء مثل «سنوية» مشتركة ولا تكفي وحدها).

## مصادر أسعار B14

من `rizq_packages_config.js` → `CATALOGS` (ومطابقة `PKG_DEFAULTS` في لوحة الأدمن):  
store 0/2000/5500/15000 (+ ماسية 3500/6000)، office 0/3500/9000/28000، corp 0/3500/9000/25000، tender/investment 0/5000/13500/45000، video 1500/5000/12000/25000.  
لا تغيير لأسعار الواجهة الظاهرة.
