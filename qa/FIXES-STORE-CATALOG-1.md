# FIXES-STORE-CATALOG-1

Branch: `fix-store-catalog-1`

| البند | الملفات | الاختبار | النتيجة |
|------|---------|----------|---------|
| أ) منع سقوط محل الدليل على كتالوج محل النور | `rizq_store.html`, `rizq_products.html`, `rizq_store_commerce.js`, `rizq_showroom.html`, `rizq_office.html` | Playwright ownership | pass |
| ب) كتالوج غذائي لـ سوق الأمل + محلات الدليل | `rizq_graduation_demo_catalog.js`, `graduation-demo.json`, `seed-graduation-demo.js` | seed smoke + Playwright | pass |
| ج) فراغ بدل كتالوج افتراضي عند غياب المنتجات | شبكة المحل `products-empty` / منتجات `no-results` | حساب بلا كتالوج | pass |
| د) وسم عرض + purge | `is_demo` / `graduationDemo` / `demoSource=graduation` | `seed --clear` / `purge:demo` | pass |

## السبب الجذري

1. روابط «كل المنتجات» من واجهة المحل كانت تُفتح أحياناً بلا `?id=` عند مسار مبكر قبل `wireStoreLinks`.
2. `rizq_products.html` كانت تعرض كتالوج محل النور عند غياب/فراغ المعرّف أو `demo=1`.
3. `acc_grad_store_03` (سوق الأمل للأغذية) لم يكن له منتجات في الـ fixture، فظهر كتالوج أزياء/عطور افتراضي.

## الإصلاح

- حساب له `id` حقيقي: **ممنوع** كتالوج محل النور أو أي حساب آخر.
- إن وُجدت منتجات للحساب → تُعرض (محلياً / API / كتالوج عرض التخرج المضمّن لنفس `accountId`).
- إن لم توجد → حالة الفراغ الموجودة في الصفحة.
- كتالوج محل النور التجريبي فقط لـ `demo_store` / بوابة الترويج / صفحة بلا id نموذجية.
- 8 منتجات غذائية لـ `acc_grad_store_03` + كتالوجات نشاط لكل محلات الدليل الستة.
- حراسة مماثلة لمعرض/مكتب: لا استبدال حساب حقيقي بنموذج العرض.

## إعادة الاختبار

```bash
node qa/store-catalog-1/test-store-catalog-ownership.js
node rizq-backend/scripts/run-with-test-db.js scripts/test-graduation-seed.js
```

## ملاحظات

- منطق فقط — بلا إعادة تصميم واجهة.
- UTF-8 و LF.
- لا PR حتى المراجعة اليدوية.
