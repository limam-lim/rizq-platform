/**
 * rizq_email_handler.js  v2.0 — Claude-Powered
 * ══════════════════════════════════════════════════════
 * معالج البريد الإلكتروني — مدير رزق الذكي
 * العقل: Claude API (عبر rizq_agent_brain.js)
 *
 * التشغيل:
 *   npm install express nodemailer body-parser @anthropic-ai/sdk dotenv
 *   node rizq_email_handler.js
 *
 * يعمل بطريقتين:
 *   1. Webhook: POST من SendGrid/Mailgun عند وصول إيميل جديد
 *   2. IMAP Polling: راجع docs للإعداد
 * ══════════════════════════════════════════════════════
 * ⚠️ فجوة معمارية موثَّقة صراحة (27/07/2026) — وليست مجرد "بوابة غير مفعّلة":
 * ميزة "auto_reply_email" المُعلَنة حصرياً للباقة الماسية (TIER_FEATURES في
 * rizq_subscription_engine.js) تفترض رداً تلقائياً شخصياً باسم كل منشأة
 * مشتركة على بريدها الإلكتروني الخاص. هذا الملف لا يفعل ذلك إطلاقاً — هو
 * فقط يرد تلقائياً على البريد الوارد لصندوق دعم رزق العام نفسه
 * (direction@rizq.mr)، بلا أي مفهوم "مشترك" أو "باقة" على الإطلاق.
 * لا يمكن "إصلاح" هذا بمجرد إضافة تحقق من الباقة (كما فعلنا في rizq_call_
 * handler.js وrizq_widget_embed.js) لأن الميزة نفسها غير مبنية بعد: تتطلب
 * جمع بيانات اعتماد بريد إلكتروني حقيقية لكل مشترك (IMAP/SMTP أو OAuth)
 * — بيانات لا يُطلب من أي تاجر إدخالها في أي مكان بمنصة رزق حالياً. هذا
 * يحتاج مشروعاً مستقلاً (نموذج ربط بريد المشترك + مراقبة صندوقه) قبل أن
 * تصبح الميزة حقيقية، وليس مجرد فحص باقة إضافي. أُبلغ Limam بهذا صراحة.
 * ══════════════════════════════════════════════════════
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const { askAgent } = require('./rizq_agent_brain');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ── Config ───────────────────────────────────────────────
const CONFIG = {
  SMTP: {
    host  : process.env.SMTP_HOST || 'smtp.gmail.com',
    port  : parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'direction@rizq.mr',
      pass: process.env.EMAIL_PASS || ''
    }
  },
  FROM     : '"رزق — ADMINIA SARL" <direction@rizq.mr>',
  SIGNATURE: `

---
مع خالص التحية،
فريق رزق — ADMINIA SARL
direction@rizq.mr | rizq.mr
+222 44 88 22 12`
};

// ── Transporter ──────────────────────────────────────────
const transporter = nodemailer.createTransport(CONFIG.SMTP);

// ── سجل الإيميلات ────────────────────────────────────────
const emailLog = [];

// ── تصنيف سريع بالـ regex (للسجل فقط — الرد يولده Claude) ──
function classifyEmail(subject, body) {
  const text = (subject + ' ' + body).toLowerCase();
  if (/شراك|تعاون|partner|collabor|b2b|وكال/.test(text))         return 'partner';
  if (/مشكل|خطأ|error|bug|دعم|support|لا يعمل/.test(text))       return 'support';
  if (/اشترك|باقة|سعر|price|abonnement|subscription/.test(text)) return 'subscription';
  if (/بلاغ|إبلاغ|report|مخالف|احتيال|fraud/.test(text))         return 'report';
  return 'inquiry';
}

// ══════════════════════════════════════════════════════════
//  الدالة الرئيسية: توليد الرد بكلود وإرساله
// ══════════════════════════════════════════════════════════
async function processAndReply(senderEmail, senderName, subject, emailBody) {
  const ticketId   = 'RZQ-' + Date.now().toString(36).toUpperCase();
  const emailType  = classifyEmail(subject, emailBody);

  console.log(`📧 معالجة إيميل من ${senderEmail} [${emailType}] — #${ticketId}`);

  // ── بناء رسالة كاملة السياق لكلود ─────────────────────
  const contextMessage =
    `إيميل وارد إلى منصة رزق:\n` +
    `- المُرسِل: ${senderName} (${senderEmail})\n` +
    `- الموضوع: ${subject}\n` +
    `- التصنيف المبدئي: ${emailType}\n` +
    `- رقم التذكرة (استخدمه في ردّك إن كان مناسباً): ${ticketId}\n\n` +
    `محتوى الإيميل:\n${emailBody}\n\n` +
    `اكتب رداً مهنياً كاملاً بالعربية يتضمن: تحية، جسم الرد، تذكرة إن لزم. ` +
    `لا تضع توقيعاً — سيُضاف تلقائياً.`;

  let replyBody = '';
  let replySubject = `Re: ${subject}`;

  try {
    const result = await askAgent({
      channel: 'email',
      message: contextMessage,
      context: {
        sender : senderEmail,
        name   : senderName,
        subject: subject
      }
    });

    replyBody = result.text;
    console.log(`🧠 Claude ولّد رد (${result.usage?.output_tokens} tokens)`);

  } catch(err) {
    console.error('❌ فشل Claude:', err.message);
    // رد احتياطي آمن
    replyBody = `السلام عليكم ${senderName}،\n\n` +
      `شكراً لتواصلكم مع منصة رزق. لقد استلمنا رسالتكم برقم مرجعي ${ticketId}.\n` +
      `سيتواصل معكم فريقنا خلال 24 ساعة عمل.`;
  }

  // ── إرسال الرد ──────────────────────────────────────────
  const fullBody = replyBody + CONFIG.SIGNATURE;

  try {
    await transporter.sendMail({
      from   : CONFIG.FROM,
      to     : senderEmail,
      subject: replySubject,
      text   : fullBody
    });

    const logEntry = {
      id      : ticketId,
      from    : senderEmail,
      name    : senderName,
      subject : subject,
      type    : emailType,
      replied : true,
      ai_reply: true,
      time    : new Date().toLocaleString('ar-MA-u-nu-latn')
    };
    emailLog.unshift(logEntry);

    console.log(`✅ رد أُرسل إلى ${senderEmail} (#${ticketId})`);
    return { ok: true, ticketId, type: emailType, ai_reply: true };

  } catch(sendErr) {
    console.error('❌ فشل إرسال الإيميل:', sendErr.message);
    return { ok: false, error: sendErr.message, ticketId };
  }
}

// ══════════════════════════════════════════════════════════
//  Webhook: استقبال إيميل جديد (SendGrid / Mailgun)
// ══════════════════════════════════════════════════════════
app.post('/api/email/inbound', async (req, res) => {
  const from    = req.body.from    || req.body.sender || '';
  const subject = req.body.subject || '(بدون موضوع)';
  const body    = req.body.text    || req.body.body   || '';

  // استخراج الاسم والإيميل
  const nameMatch  = from.match(/^([^<]+)</);
  const senderName = nameMatch ? nameMatch[1].trim() : from.split('@')[0];
  const emailMatch = from.match(/<(.+)>/);
  const senderEmail = emailMatch ? emailMatch[1] : from;

  const result = await processAndReply(senderEmail, senderName, subject, body);
  res.json(result);
});

// ══════════════════════════════════════════════════════════
//  API: جلب سجل الإيميلات للأدمن
// ══════════════════════════════════════════════════════════
app.get('/api/email-log', (req, res) => {
  res.json({ emails: emailLog.slice(0, 50) });
});

// ── API: إرسال رد يدوي من الأدمن (بدون كلود) ────────────
app.post('/api/email/manual-reply', async (req, res) => {
  const { to, subject, body } = req.body;
  if(!to || !body) return res.status(400).json({ ok: false, error: 'to + body مطلوبان' });
  try {
    await transporter.sendMail({
      from   : CONFIG.FROM,
      to,
      subject: subject || 'رد من رزق',
      text   : body + CONFIG.SIGNATURE
    });
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── API: رد يدوي بكلود (يولّد الرد ويرسله) ──────────────
app.post('/api/email/ai-reply', async (req, res) => {
  const { to, name, subject, body } = req.body;
  if(!to || !subject) return res.status(400).json({ ok: false, error: 'to + subject مطلوبان' });
  const result = await processAndReply(to, name || to.split('@')[0], subject, body || '');
  res.json(result);
});

// ── API: الحالة ──────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    status      : 'running',
    port        : PORT,
    emails_total: emailLog.length,
    claude_model: process.env.RIZQ_AGENT_MODEL || 'claude-haiku-4-5-20251001',
    api_key_set : !!(process.env.ANTHROPIC_API_KEY)
  });
});

// ── صفحة الحالة ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`
    <html dir="rtl"><body style="font-family:Arial;padding:40px;background:#f0f4fa">
    <h1>📧 مدير رزق الذكي v2 — خادم البريد</h1>
    <p>✅ الخادم يعمل على المنفذ <strong>${PORT}</strong></p>
    <p>🧠 العقل: <strong>${process.env.RIZQ_AGENT_MODEL || 'claude-haiku-4-5-20251001'}</strong></p>
    <p>🔑 API Key: <strong>${process.env.ANTHROPIC_API_KEY ? '✅ موجود' : '❌ مفقود'}</strong></p>
    <p>📊 إيميلات معالجة: <strong>${emailLog.length}</strong></p>
    <hr>
    <pre>${JSON.stringify(emailLog.slice(0, 3), null, 2)}</pre>
    </body></html>
  `);
});

app.listen(PORT, () => {
  console.log(`\n📧 رزق Email Handler v2 (Claude-Powered) — المنفذ: ${PORT}`);
  console.log(`   Inbound Webhook: POST /api/email/inbound`);
  console.log(`   SendGrid: Settings → Inbound Parse → https://YOUR-DOMAIN/api/email/inbound`);
  console.log(`   API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ موجود' : '❌ ANTHROPIC_API_KEY مفقود في .env'}\n`);
});
