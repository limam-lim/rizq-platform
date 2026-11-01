# رزق — إصلاحات تقوية الوكلاء (المرحلة 2)

**الفرع:** `fix-agents-1`  
**الأساس:** `main` @ `96b91a1`  
**المرجع:** `qa/agents/AGENTS-AUDIT-1.md` (`audit-agents-1`)  
**التاريخ:** 2026-11-01 (Europe/Madrid)  
**النطاق:** منطق + أمان + نبرة فقط — بلا تغيير تصميم بصري. UTF-8 / LF.  
**قاعدة الاختبار:** `rizq_test` عبر `scripts/run-with-test-db.js`

---

## أ) بنود الأمان — ما نُفّذ

| البند | الملفات | الاختبار | النتيجة |
|-------|---------|----------|---------|
| **A1** سكرتير بعد تحقق خادمي `ai_agent_full`؛ هاتف/واتساب من بوابة التواصل فقط؛ لا localStorage للباقة | `rizq_secretary_agent.js`؛ `server.js` (`GET /api/agent/public-eligibility/:id` عبر `repos.accounts.getById`)؛ `inquiryAutoReply.js` (`buildProfileFromAccount` + `contactGate`) | `test-fix-agents-1.js` — A1* | ✅ بوابة خادم؛ صف واحد `getById`؛ فشل/غياب = لا ويدجت |
| **A2** fallback الويدجت بلا هاتف/واتساب/سعر؛ رسالة مشغولة عند التعطل | `rizq_chat_widget.html`؛ `rizq_widget_embed.js` (رسائل الخطأ + offline) | A2* + محاكاة `processMessage` | ✅ «الخدمة مشغولة…» بلا بيانات |
| **A3** `hasFeature` لمزايا AI يعتمد شارات الخادم إلزامياً | `rizq_subscription_engine.js` (`serverAiFeatures` من `/api/entitlements`) | A3* | ✅ غياب الشارات = رفض |
| **A4** حارس الحظر: api key / أسرار / system prompt / رقم مقفل / ماسية مجاناً (حس/ع/فر/إن) | `rizq_agent.js`؛ يُستدعى من `widgetChat.js` | A4* (15 مسباراً) | ✅ كل المسبارات تُحجب |
| **A5** `estate` في enum الأداة + أسعار 4000/4500/8500 | `widgetAgentTools.js`؛ `packageCatalogLive.js` | A5* | ✅ 4000 / 4500 / 8500 من الكتالوج الحي |
| **A6** تجاهل `systemInstruction` من العميل؛ قائمة بيضاء داخلية فقط | `widgetChat.js`؛ `server.js` (حذف الحقل قبل المعالجة) | A6* | ✅ لا مسار يثق بعلم العميل |
| **A7** `agentTier` من الخادم بعد `assertAiAgentAccess` فقط | `server.js`؛ `widgetChat.js`؛ `rizq_agent.js`؛ `rizq_widget_embed.js` | A7* | ✅ لا استنتاج من `businessName` |
| **A8** إخفاء كتالوج `general` (5000/10000) عن أدوات AI | `packageCatalogLive.js` (`AI_CATALOG_KEYS`) | A8* | ✅ `general` فارغ في مسار AI |
| **A10** تنبيه لوحة الأدمن + سجل عند `requireHumanApproval=false` | `marketingAgent.js`؛ `routes/marketing.js`؛ `rizq_cp_panel.html` | A10* | ✅ تحذير + `approvalAuditLog` |

> البند **A9** غير وارد في قائمة التنفيذ المطلوبة لهذه المرحلة.

---

## ب) النبرة «كالبشر»

طُبّقت مبادئ القسم 5 في `rizq_agent.js` (`buildToneBlock`) و`widgetChat.js` (برومبت المنصة):

- رد بلغة المستخدم (حسانية ↔ فرنسية ↔ فصحى / مزيج مفهوم)
- ممنوع أسماء ملفات / API / endpoint — «قسم المناقصات» والأزرار الظاهرة فقط
- جمل قصيرة؛ سؤال توضيحي واحد عند الغموض
- جواب السؤال أولاً (خصوصاً الأسعار) — بلا تحية عامة مكان السعر
- تصعيد لطيف للدعم عند الجهل / المالي / الشكوى
- الأسعار من الأداة الحية فقط

---

## ج) الاختبار

```bash
node rizq-backend/scripts/run-with-test-db.js rizq-backend/scripts/test-fix-agents-1.js
```

**النتيجة:** كل اختبارات الوحدة نجحت (A1–A8، A10، B).

**محادثات Claude الحية (8×3):**  
`ANTHROPIC_API_KEY` **غير موجود / فارغ** في بيئة الاختبار → لم تُنفَّذ المحادثات الحية (حد 150). لم يُطبع أي مفتاح في السجلات أو التقارير أو الـ commits.

---

## متوسطات المعايير — قبل / بعد

المصدر قبل: `AGENTS-AUDIT-1.md` (محاكاة بدون Claude حي في أغلب العيّنات).

| العائلة | الدقة | الإنسانية | اللهجة | الإيجاز | الأمان | الإحالة | ملاحظة بعد الإصلاح |
|---------|------|-----------|--------|---------|--------|---------|---------------------|
| widget+packages | **قبل 3.50** → بعد: وحدات ✅ (لا عيّنة حية) | 3.22 → — | 3.81 → — | 5.00 → — | 4.06 → حارس+كتالوج ✅ | 4.14 → — | هدف ≥4 معلّق على مفتاح Claude |
| widget | **قبل 3.38** → — | 3.17 → — | 3.79 → — | 5.00 → — | 4.06 → ✅ | 3.94 → — | نفس القيد |
| widget+secretary (خداع) | **قبل 3.17** → بوابة خادم ✅ | 3.17 → — | 3.92 → — | 5.00 → — | 4.33 → أنماط حظر موسّعة ✅ | 3.83 → — | انتحال الماسية مغلق |
| marketing | كود فقط | — | — | — | موافقة بشرية + سجل ✅ | — | تحذير أدمن عند التعطيل |

**خلاصة القياس:** إصلاحات الأمان والنبرة مثبتة باختبارات وحدة على `rizq_test`. إعادة تقييم المعايير الستة (≥4) تتطلب `ANTHROPIC_API_KEY` في بيئة الاختبار لتشغيل الشخصيات الثماني × 3.

---

## أوامر التحقق السريع

```bash
# وحدات المرحلة 2
node rizq-backend/scripts/run-with-test-db.js rizq-backend/scripts/test-fix-agents-1.js

# أسعار العقارات الحية
node -e "console.log(require('./rizq-backend/services/packageCatalogLive').getLivePackagesForAI('ar',{catalog:'estate'}).packages.map(p=>p.price))"
```
