# FIXES-PACKAGES-2

Branch: `fix-packages-2`

| البند | الملفات | الاختبار | النتيجة |
|------|---------|----------|---------|
| B6 نفس/باقة مختلفة | `services/subRequestActivation.js` (`computeActivationPeriod`), `rizq_package_lifecycle_agent.js` (`packageHistory`) | `npm run test:packages-core` | pass |
| B8 حصة ذرّية + شحن لا يُصفَّر | `rizq_quota_guard_agent.js` | `test:packages-core` (20 متزامن = +20) | pass |
| B3 حفظ سجل بسجل | `rizq_package_lifecycle_agent.js` (`_save` / `_saveOne`) | `test:packages-core` | pass |
| TRIAL مرة واحدة/حساب+فئة | `server.js` POST `/api/sub-requests`, lifecycle `syncAccountPackage` | `test:packages-core` | pass |
| B14 افتراضيات st/of/cp/tnd/inv/vid | `services/catalogConfig.js` | `npm run test:packages-b14` | pass |
| RECEIPT sha256 | `services/receiptStorage.js`, `server.js` | `test:packages-b14` | pass |
| B16 حد كتالوج عام + تسريب ردود | `routes/catalog.js`, `routes/messages.js`, `inquiryAutoReply.js` | `test:packages-b14` | pass |

## قرار B6 (للمراجعة)

- **نفس `packageId`:** إن كان `periodEnd` في المستقبل → نهاية جديدة = القديم + مدة الباقة؛ وإلا من اليوم + المدة.
- **`packageId` مختلف:** البداية من لحظة التفعيل بأيام الباقة الجديدة فقط (بدون ترحيل أيام القديمة). تُسجَّل الباقة القديمة في `packageHistory` على سجل الحساب.

## مصادر أسعار B14

من `rizq_packages_config.js` → `CATALOGS` (ومطابقة `PKG_DEFAULTS` في لوحة الأدمن):  
store 0/2000/5500/15000 (+ ماسية 3500/6000)، office 0/3500/9000/28000، corp 0/3500/9000/25000، tender/investment 0/5000/13500/45000، video 1500/5000/12000/25000.  
لا تغيير لأسعار الواجهة الظاهرة.
