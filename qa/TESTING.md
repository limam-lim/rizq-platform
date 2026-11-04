# اختبارات رزق — آلة نظيفة

## المتطلبات

- Node.js ≥ 18
- Postgres مع قاعدة `rizq_test` (يُنشئها `run-with-test-db.js` تلقائياً إن وُجدت صلاحية)
- ملف `rizq-backend/.env` من `.env.example` (أو يضبط `test:all` قيماً افتراضية آمنة محلياً)

## الأمر الواحد

```bash
cd rizq-backend
npm install
npm run test:all
```

`npm run test:all` يقوم بما يلي على آلة نظيفة:

1. **كلمة سر بوابة الأدمن** — إن نقص `ADMIN_PANEL_GATE_KEY` يضع قيمة اختبار محلية (ليست للإنتاج).
2. **`SENTINEL_DB_PASSWORD`** — إن نقص يضع `sentinel_test_pass_9d2d` محلياً (ليست للإنتاج).
3. **Playwright** — إن لم يوجد، يثبّته في `qa/ui-logic-1` ثم `npx playwright install chromium` (مسار موحّد لـ `test:register-sync-fail` وغيره).
4. **خادم ستاتيكي** — يفتح منفذاً عشوائياً على `127.0.0.1` ويصدّر `BASE_URL` / `STATIC_BASE_URL` / `JOURNEY_BASE` / `RIZQ_BASE`.
5. يشغّل كل سكربتات `npm run test:*` في `rizq-backend` (ما عدا `test:all`).
6. يشغّل اختبارات الواجهة في `qa/cls-1/` (روابط المتاجر + SW cache).
7. ينظّف `rizq-backend/uploads/catalog/CAT-<timestamp>-*` بعد الانتهاء (يُبقي `CAT_PROMO_*`).

## اختبارات محورية لهذا الفرع (#274)

```bash
npm run test:home-catalog          # STRICT_HOME_WIRING=1 → 23/23
npm run test:monthly-only
npm run test:asset-versions        # ?v= موحّد لـ rizq_header.js = ASSET_V
npm run test:founding-no-discount  # شريك مؤسس يدفع السعر الكامل
```

## ملاحظات

- `rizq-backend/uploads/` و`qa/screens/` في `.gitignore` — لا تُرفع لقطات/مرفقات تشغيل.
- لا تعتمد على كاش قديم للـ SW: `ASSET_V` في `rizq_pwa.js` يجب أن يطابق `CACHE_NAME` في `sw.js`.
- اختبارات البوابة/الأدمن تقرأ `ADMIN_PANEL_GATE_KEY` من البيئة؛ لا تضع أسراراً حقيقية في أوامر CI العلنية.
