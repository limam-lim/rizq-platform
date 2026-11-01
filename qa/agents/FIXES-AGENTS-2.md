# رزق — إصلاحات تقوية الوكلاء (المرحلة 3)

**الفرع:** `fix-agents-2`  
**الأساس:** `main` @ `0b94daa` (بعد دمج PR #262 / `fix-agents-1`)  
**المرجع:** `qa/agents/AUDIT-WIDGET-SUBSCRIBER.md`  
**التاريخ:** 2026-11-01 (Europe/Madrid)  
**النطاق:** منطق + أمان فقط — بلا تصميم. UTF-8 / LF. **لا PR ولا دمج.**  
**قاعدة الاختبار:** `rizq_test`

---

## ما أُغلق سابقاً في `517bdd0` (لا إعادة عمل)

| البند | الحالة |
|-------|--------|
| **A-H1** نص عميل في system + Diamond مجاناً | ✅ مُغلق (profile=null، agentTier خادم، حذف systemInstruction) |
| **A-H3** استحقاق/شخصية من المتصفح | ✅ مُغلق جزئياً كافياً (`_resolveAgentTier`→general؛ الخادم يفرض) |

---

## HIGH التي أُصلحت في هذه المرحلة

### B-H1 — اختطاف رقم المشترك

**الهجوم:** يغيّر المهاجم هاتف حسابه إلى رقم الضحية عبر `PATCH /api/accounts/mine`؛ `upsertSubscriberProfileFromAccount` يطابق باللاحقة ويعيد كتابة `accountId`/`businessName` في ملف الوكيل → مكالمات/واتساب الضحية تخدم المهاجم.  
**الإصلاح:** فرادة رقم بين الحسابات (409 `phone_in_use`)؛ upsert يرفض إن وُجد `accountId` لغير المالك؛ ربط جديد بمعرّف الحساب لا بلاحقة هاتف غريبة؛ لا مزامنة وكيل بلا `isDiamondActive`؛ `askSubscriberAgent` fail-closed بلا `accountId` أو عند فشل التحقق.  
**اختبار يثبت الفشل:** `test-fix-agents-2.js` — stub ماسية للمهاجم + نفس رقم الضحية → `phone_in_use`؛ ملف الضحية دون تغيير `accountId`/`businessName`.

**الملفات:** `rizq_subscriber_agent.js`، `rizq-backend/routes/accountsManage.js`

---

### A-H5 — spam مسارات الـ leads العامة (+ تحقق + منع تكرار)

**الهجوم:** `POST /api/widget/lead` و`/api/leads` بلا مصادقة تسمح بإغراق تيليغرام الأدمن بطلبات وهمية وبمعدل مساوٍ لمحادثة الويدجت (30/15د).  
**الإصلاح:** `widgetLeadLimiter` (5/15د)؛ honeypot `website`/`hp_field`؛ `requireVerifiedFields` (اسم ≥2 + واتساب 8–15 رقماً)؛ throttle هاتف (3/ساعة) وIP (5/15د) قبل تيليغرام؛ dedupe القائم ساعة واحدة يبقى.  
**اختبار:** تحقق الحقول يرفض الاسم/الرقم القصير؛ أول lead ينجح؛ التكرار يُعلَّم duplicate/throttle؛ وجود `widgetLeadLimiter` في `server.js`.

**الملفات:** `rizq-backend/server.js`، `rizq-backend/services/leadEscalation.js`

---

### A-H4 — leads زبون التاجر تُحوَّل لإدارة رزق

**الهجوم:** على صفحة تاجر ماسي، رقم زبون يُلتقط بـ`maybeAutoNotifyLead` فيُنشأ lead اشتراك رزق ويُستبدل الرد بتأكيد تفعيل المنصة.  
**الإصلاح:** تخطّي auto-lead عند `merchantMode`/`agentTier=diamond`+`accountId`؛ `createLeadAndNotify` يرفض `merchantMode:true`.  
**اختبار:** `merchantMode` → `code=merchant_mode`؛ `maybeAutoNotifyLead(..., merchantMode:true)` → `null`.

**الملفات:** `widgetChat.js`، `leadEscalation.js`

---

### A-H2 — تجاوز لفّ المدخلات + تزوير التاريخ

**الهجوم:** رسالة مستخدم تتضمّن `<<<END_UNTRUSTED_INPUT>>>` تجعل `isAlreadyWrapped` يتخطّى اللفّ؛ وأدوار `assistant` في `history` من العميل تصل للنموذج بلا لفّ.  
**الإصلاح:** تعطيل علامات اللفّ داخل النص دائماً ثم اللفّ مجدداً (لا تخطّي)؛ `widgetChat` يقبل أدوار `user` فقط من تاريخ العميل.  
**اختبار:** نص هجومي يُلف مرة واحدة بعد تحييد العلامات؛ نص «ملفوف مسبقاً» يُعاد لفه؛ مصدر الويدجت يسقط `assistant`/`agent`.

**الملفات:** `rizq-backend/services/llmGateway.js`، `rizq-backend/services/widgetChat.js`

---

## CRITICAL

لا بنود CRITICAL في التقرير المرجعي.

---

## الاختبار

```bash
node rizq-backend/scripts/run-with-test-db.js rizq-backend/scripts/test-fix-agents-2.js
```

**النتيجة:** كل التأكيدات نجحت على `rizq_test`.

**التقرير المحفوظ:** `qa/agents/AUDIT-WIDGET-SUBSCRIBER.md` (نص فقط من تدقيق الويدجت+المشترك).
