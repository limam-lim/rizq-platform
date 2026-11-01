# FIXES-UI-LOGIC-1

Branch: `fix-ui-logic-1` (من `main`)

منطق ونصوص فقط — بلا تغيير تصميم/ألوان/تخطيط عام. UTF-8 / LF. لا PR ولا دمج.

## البنود

| # | الإصلاح | الملفات |
|---|---------|---------|
| 1 | شارة «السعر عند التواصل» فقط إن كان السعر فارغاً أو مقفلاً؛ `hidePrice` لبطاقات المنتجات (انحدار fix-browse-1) | `rizq_ad_cards.js`, `rizq_store_commerce.js`, `rizq_products.html`, `rizq_store.html` |
| 2 | `direction@rizq.mr` → `contact@rizq.mr`؛ قابل للتعديل من إعدادات الموقع (`site.email`) | صفحات/خدمات + `rizq_site_footer.js` + لوحة الأدمن |
| 3 | سلة: إخفاء زر اللغة اليتيم / ترتيب الشريط ثم المسار؛ ترجمة «Mode de livraison» عبر `data-t="delivery-title"` | `rizq_cart.html` |
| 4 | إخفاء FR\|AR العائم عند وجود زر اللغة في الشريط | `rizq_products.html`, `rizq_cart.html` |
| 5 | إزاحة فقاعة المساعد عن شريط الفلاتر (موضع فقط) | `rizq_products.html` |
| 6 | فيديو التاجر → وإلا ترويج المنصة من site-config → وإلا لا شيء؛ حذف يوتيوب/TINTEL التجريبي | `rizq_store_commerce.js`, واجهات المحل/المعرض/المكتب، `rizq_dashboard_store_app.js` |
| 7 | باقات المنصة: للمالك ظاهرة؛ للزائر زر «افتح محلك/معرضك/مكتبك» يفتح القسم | `rizq_subscription_permissions.js` + store/showroom/office |
| 8 | نتيجة «إعداد المخطط» تملأ حقول الإيداع + زر «متابعة الإيداع» | `rizq_investment_agent.js` |
| 9 | تنبيه «سجّل دخولك» + تعطيل الإرسال للزائر غير المسجّل | `rizq_investments.html`, `rizq_tenders.html` |
| 10 | آراء العرض موسومة `demo:true` وتختفي عند ضبط `launchDate` (`RizqDemo.inventoryAllowed`) | `rizq_estate.html` + اختبار |

## اختبارات

```bash
cd rizq-backend && node scripts/run-with-test-db.js scripts/test-ui-logic-1.js
cd rizq-backend && node scripts/run-with-test-db.js scripts/test-browse-infinite-and-cards.js
```

| فحص | نتيجة |
|------|--------|
| `test-ui-logic-1` (سعر، بريد، سلة، فيديو، باقات، استثمار، دخول، آراء) | pass |
| `test-browse-infinite-and-cards` (توافق شارة السعر الفارغ) | pass |

## لقطات

قبل/بعد على 1440 و 375 لكل صفحة معدّلة في `qa/ui-logic-1/` (محلية، لا تُدفع — انظر `.gitignore`).

```bash
node qa/ui-logic-1/capture-screens.js before
node qa/ui-logic-1/capture-screens.js after
```
