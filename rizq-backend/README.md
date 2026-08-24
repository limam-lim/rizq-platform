# rizq-backend

خادم خلفي صغير لمنصة رزق. الغرض الوحيد حالياً: تحليل صورة وصل الدفع عبر Claude Vision
دون كشف مفتاح Claude API في كود الواجهة الأمامية الثابت (HTML/JS).

## لماذا هذا ضروري؟

منصة رزق حالياً 100% ثابتة (static HTML + localStorage، بلا خادم). أي مفتاح API يوضع
في ملف `.js` يصل إليه المتصفح يصبح مرئياً لكل زائر عبر "عرض المصدر" — يمكن سرقته
واستخدامه على حسابك مجاناً. هذا الخادم يحل المشكلة: المفتاح يبقى في متغير بيئة على
السيرفر فقط، والواجهة الأمامية تتصل بـ endpoint عام (`/api/verify-receipt`) لا يحمل أي سر حساس.

## التشغيل محلياً

```bash
cd rizq-backend
npm install
cp .env.example .env
# عدّل .env: ضع ANTHROPIC_API_KEY الحقيقي، ALLOWED_ORIGIN، BACKEND_SHARED_SECRET
npm start
```

## النشر (اختر واحداً — كلها تدعم متغيرات البيئة بأمان)

- **Render.com**: أنشئ "Web Service" جديد من نفس مستودع git، اضبط متغيرات البيئة من
  لوحة Render (لا من الكود)، Build command: `npm install`, Start command: `npm start`.
- **Railway.app**: مشابه لـ Render، نشر بضغطة من git.
- **Vercel** (إن أردت Serverless بدل سيرفر دائم): يتطلب تحويل `server.js` إلى دالة
  واحدة داخل `api/verify-receipt.js` بصيغة Vercel Functions — بنية مختلفة قليلاً، أخبرني إذا قررت هذا المسار وسأحوّلها لك.

بعد النشر، ستحصل على رابط مثل `https://rizq-backend.onrender.com`. ضعه في لوحة الأدمين
(تبويب وكيل الباقات → "رابط خادم الذكاء") بدون أي `/` في النهاية.

## ربط الواجهة الأمامية

`rizq_subscription_engine.js` يحتوي دالة `RizqSub.verifyReceiptWithAI(reqId)` — تعمل
تلقائياً إذا كان `backendUrl` مضبوطاً في إعدادات الوكيل، وإلا تتجاهل بصمت (لا كسر لأي شيء
إذا لم يُنشر الخادم بعد). الإرسال يتضمن `x-rizq-secret` في الهيدر، يجب أن يطابق
`BACKEND_SHARED_SECRET` في `.env`.

## بوت Telegram للأدمن (إشعار + تفعيل فوري)

عند ضبط المتغيرات التالية في `.env`، يُرسَل إشعار فوري للأدمن عند كل `POST /api/sub-requests`
(بعد تحليل الوصل عبر Claude Vision)، مع أزرار **تفعيل** / **رفض** مباشرة في Telegram:

```env
TELEGRAM_BOT_TOKEN=123456:ABC...        # من @BotFather
TELEGRAM_ADMIN_CHAT_ID=-1001234567890   # معرّف محادثة الأدمن (شخصي أو مجموعة)
PUBLIC_BASE_URL=https://your-domain.com # لرابط webhook
# اختياري:
TELEGRAM_WEBHOOK_SECRET=random_secret   # يُتحقق منه في مسار webhook
```

**تسجيل webhook** (مرة واحدة بعد النشر):

```bash
curl -X POST https://your-domain.com/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -H "x-rizq-secret: YOUR_BACKEND_SHARED_SECRET" \
  -d '{"publicBaseUrl":"https://your-domain.com"}'
```

عند النقر على **✅ تفعيل الاشتراك**، ينفّذ الخادم `syncAccountPackage` مباشرة ويُرسل
تأكيداً للزبون عبر واتساب/بريد — دون فتح `rizq_admin.html`.

### التطوير المحلي (Polling — بدون نطاق عام)

```env
TELEGRAM_USE_POLLING=true
```

```bash
npm run telegram:poll
# أو: npm start  (مع TELEGRAM_USE_POLLING=true في .env)
```

### الإنتاج (Webhook — بعد ربط rizq.mr)

```bash
PUBLIC_BASE_URL=https://rizq.mr npm run telegram:webhook
# أو: node scripts/setup-telegram-webhook.js https://rizq.mr
```

ثم عطّل `TELEGRAM_USE_POLLING` (أو اضبطه `false`).

## حدود مهمة يجب أن تعرفها

- هذا تحليل **احتمالي** (plausibility) من نموذج رؤية — يقرأ التاريخ/المبلغ ويعلّق على
  وضوح الصورة، لكنه **لا يتصل بأي بنك حقيقي ولا يثبت أن الدفع تم فعلاً**. القرار النهائي
  دوماً للأدمين (أنت).
- إثبات الدفع الحقيقي 100% يحتاج تكامل مباشر مع البنك (API بنكي، أو إشعار SMS/إيميل
  آلي من البنك يُقرأ ويُطابَق) — هذا غير متاح حالياً لأغلب البنوك الموريتانية بشكل عام،
  وعليك التحقق من البنك المحدد الذي تتعامل معه إن أردت السير بهذا الاتجاه مستقبلاً.

## Composio — ملاحظة صادقة

Composio منصة لربط الوكلاء بخدمات خارجية (Gmail, Slack, WhatsApp Business, إلخ) عبر
SDK يعمل **على الخادم فقط** (نفس قاعدة "لا مفاتيح في الواجهة"). لم أُضِف تكاملاً فعلياً
هنا لأن: (1) لا يوجد دليل على وجود موصل بنكي موريتاني جاهز في كتالوج Composio وقت كتابة
هذا — يجب أن تتحقق من كتالوجهم بنفسك عند الجاهزية بدل أن أفترض شيئاً غير مؤكد، و(2) أي
موصل واتساب بزنس يتطلب موافقة Meta وعملية تحقق تجارية مسبقة (نفس التعقيد الذي اتفقنا
على تجنبه سابقاً). إذا قررت المتابعة، الخطوة الصحيحة: تثبيت `composio-core` هنا في
`rizq-backend` (لا في الواجهة)، وربطه بـ endpoint جديد مثل `/api/composio/*`.
