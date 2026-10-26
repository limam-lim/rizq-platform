# رزق — تعليمات بدء الجلسة (بعد إغلاق graduation-demo-v2)

*آخر تحديث: 2026-10-26 (Europe/Madrid) — الكود مجمّد حتى عرض التخرج.*

## نقطة الانطلاق
- الوسم: `graduation-demo-v2` على طرف `main` بعد دمج PR الإغلاق.
- الوسم القديم `graduation-demo` **لا يُحرَّك**.
- `launchDate` يبقى **فارغاً** (dry-run للصيانة) — لا تملأه قبل الإطلاق الحقيقي.
- محتوى التخرج موسوم `is_demo` + `graduationDemo` (seed عبر `npm run seed:graduation` داخل `rizq-backend`).

## ما أُنجز في جلسة الإغلاق (مُجمَّد)
1. **هاتف:** كبسولتا الهيدر العلوية/السفلية داخل الإطار؛ «المعارض والمصانع» سطر واحد؛ هامش «سوق العقارات».
2. **تابلت:** كبسولة الأقسام في الوسط مثل الكمبيوتر.
3. **كمبيوتر:** فراغ البحث↔الكبسولة ~12–16px؛ إزالة الكبسولة الزرقاء الشاردة في `rizq_post.html`.
4. **الباقة التجريبية:** مخفية أثناء الفترة المجانية أو `launchDate` فارغ؛ تظهر بعدها (10 أيام موحّدة، تجربة واحدة لكل هوية، مهلة مطالبة 7 أيام) — `launchMode.isTrialOfferVisible` + فلتر `rizq_packages_ui.js` + حراسة `syncAccountPackage`.
5. **صفحات النماذج:** صور حقيقية بدل إيموجي حيث وُجدت؛ SINTEL كفيديو إضافي للداشبورد؛ معرض/خبرة/عداد تقييمات الوكالة؛ إزالة مبدّل لغة مكرر في `rizq_store.html`.
6. **المشترك الحقيقي:** `syncRealStoreOptionalSections` يخفي الأقسام الفارغة بلا قيم افتراضية.
7. **نص «المعارض والمصانع»** بلا مسافة زائدة في الملفات؛ صور «إبل للبيع» عبر picsum (بدل Unsplash 404).
8. **أزرار المعارض/المكاتب** في الرئيسية مطابقة لأزرار المحلات (`rizq-dual-cta`) بروابط صحيحة.
9. **بوابات:** `launch:check` 9/9 (وضع تخرج: demo موسوم مطلوب)، `test:links` OK، smoke/isolation/backend suites خضراء.

## المرحلة ج — المتبقي بعد عرض التخرج (لا تنفَّذ قبل العرض)
| بند | ملاحظة |
|-----|--------|
| **HLS** | بث فيديو تكيّفي (بدل MP4 progressive فقط) للترويج/الداشبورد |
| **قناة واتساب للتذكير** | تذكير انتهاء التجربة/الاشتراك عبر واتساب تشغيلي (غير مسار الدفع) |
| **Redis** | كاش/طوابير للجلسات والحدود بدل الاعتماد الكلي على الملفات/SQLite |

## أوامر تحقق سريعة
```bash
cd rizq-backend && npm run seed:graduation && npm run launch:check
cd .. && npm run test:links && npm run test:smoke
cd rizq-backend && node scripts/test-launch-free-until.js
```

## قيود التجميد
- لا تغيير في التصميم العام، الوكلاء، منطق الدفع والتسجيل، أو تعبئة `launchDate`.
- قبل الإطلاق الحقيقي: `npm run purge:demo:confirm` ثم تأكد أن `launch:check` يقول `is_demo remaining is 0`.

## مراجع
- سياق أطول: `RIZQ_SESSION_CONTEXT.md`
- إعداد الإطلاق: `rizq-backend/config/launchMode.js`
- واجهة الباقات: `rizq_packages_ui.js`
- الهيدر الموحّد: `rizq_header.js` + `rizq_header_mockup_trial.{js,css}`
