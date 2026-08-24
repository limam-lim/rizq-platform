/**
 * rizq_whatsapp_handler.js  v1.0 — Claude-Powered
 * ══════════════════════════════════════════════════════
 * معالج واتساب بيزنس — مدير رزق الذكي
 * العقل: Claude API (عبر rizq_agent_brain.js)
 * القناة: Meta WhatsApp Cloud API
 *
 * التشغيل:
 *   npm install express body-parser axios @anthropic-ai/sdk dotenv
 *   node rizq_whatsapp_handler.js
 *
 * الإعداد في Meta Developer Console:
 *   1. App → WhatsApp → Configuration
 *   2. Webhook URL: https://YOUR-DOMAIN/api/whatsapp
 *   3. Verify Token: نفس WHATSAPP_VERIFY_TOKEN في .env
 *   4. Webhook Fields: ✅ messages
 *
 * متغيرات .env المطلوبة:
 *   WHATSAPP_TOKEN=EAA...       (من Meta App → WhatsApp → Access Token)
 *   WHATSAPP_PHONE_ID=1234...   (Phone Number ID في Meta Console)
 *   WHATSAPP_VERIFY_TOKEN=rizq_secret_2025
 *   ANTHROPIC_API_KEY=sk-ant-...
 * ══════════════════════════════════════════════════════
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const bodyParser = require('body-parser');
const axios      = require('axios');
const { askAgent } = require('./rizq_agent_brain');
const { askSubscriberAgent, loadDemoSubscribers, setupSubscriberAPI } = require('./rizq_subscriber_agent');
const { getAdvancedModel } = require('./rizq-backend/config/anthropic');

// تحميل المشتركين (يُستبدل بـ DB عند الإنتاج) — تُقرأ أولاً من
// rizq_subscribers_store.json (نفس الملف الذي يقرأه خادم المكالمات)
loadDemoSubscribers();

const app  = express();
const PORT = process.env.WA_PORT || 3002;

app.use(bodyParser.json());

// نفس API التسجيل المتاحة في خادم المكالمات — الآن كلا الخادمين يتشاركان
// نفس ملف rizq_subscribers_store.json فمشترك يُسجَّل من أي منهما يظهر للآخر
setupSubscriberAPI(app);

// ── Config ───────────────────────────────────────────────
const WA_CONFIG = {
  TOKEN      : process.env.WHATSAPP_TOKEN       || '',
  PHONE_ID   : process.env.WHATSAPP_PHONE_ID    || '',
  VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || 'rizq_secret_2025',
  API_VERSION: 'v20.0',

  // رسالة ترحيب تلقائية لأول رسالة
  WELCOME_TRIGGER: ['السلام', 'مرحبا', 'hello', 'bonjour', 'salut', 'hi', 'salam']
};

// ── سجل المحادثات (واتساب) ──────────────────────────────
const waLog = [];

// ── سجل جلسات المحادثة (للسياق متعدد الرسائل) ───────────
const sessions = new Map(); // phone → { history: [], lastSeen: Date }

const MAX_HISTORY  = 10; // آخر 10 رسائل لكل مستخدم
const SESSION_TTL  = 60 * 60 * 1000; // ساعة واحدة

// ── مساعد: إرسال رسالة واتساب ───────────────────────────
async function sendWhatsAppMessage(to, text) {
  if(!WA_CONFIG.TOKEN || !WA_CONFIG.PHONE_ID) {
    console.warn('⚠️ WHATSAPP_TOKEN أو WHATSAPP_PHONE_ID غير موجود في .env');
    return { ok: false, error: 'Config missing' };
  }

  const url = `https://graph.facebook.com/${WA_CONFIG.API_VERSION}/${WA_CONFIG.PHONE_ID}/messages`;

  try {
    const resp = await axios.post(url, {
      messaging_product: 'whatsapp',
      to               : to,
      type             : 'text',
      text             : { body: text }
    }, {
      headers: {
        'Authorization': `Bearer ${WA_CONFIG.TOKEN}`,
        'Content-Type' : 'application/json'
      }
    });

    console.log(`✅ WhatsApp أُرسلت إلى ${to}: ${text.substring(0, 50)}...`);
    return { ok: true, messageId: resp.data?.messages?.[0]?.id };

  } catch(err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error(`❌ فشل إرسال WhatsApp إلى ${to}: ${errMsg}`);
    return { ok: false, error: errMsg };
  }
}

// ── مساعد: تنظيف السجل القديم ─────────────────────────
function pruneOldSessions() {
  const now = Date.now();
  for(const [phone, session] of sessions.entries()) {
    if(now - session.lastSeen > SESSION_TTL) {
      sessions.delete(phone);
    }
  }
}

// ══════════════════════════════════════════════════════════
//  GET /api/whatsapp — التحقق من الـ Webhook (Meta Handshake)
// ══════════════════════════════════════════════════════════
app.get('/api/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if(mode === 'subscribe' && token === WA_CONFIG.VERIFY_TOKEN) {
    console.log('✅ Meta Webhook تم التحقق بنجاح');
    return res.status(200).send(challenge);
  }

  console.warn('❌ فشل التحقق من Webhook Meta');
  res.sendStatus(403);
});

// ══════════════════════════════════════════════════════════
//  POST /api/whatsapp — استقبال الرسائل الواردة
// ══════════════════════════════════════════════════════════
app.post('/api/whatsapp', async (req, res) => {
  // رد فوري بـ 200 لـ Meta (لا تنتظر المعالجة)
  res.sendStatus(200);

  try {
    const body = req.body;

    // تأكد أن هذا WhatsApp Business
    if(body.object !== 'whatsapp_business_account') return;

    const entry    = body.entry?.[0];
    const changes  = entry?.changes?.[0];
    const value    = changes?.value;
    const messages = value?.messages;

    if(!messages || messages.length === 0) return;

    const msg     = messages[0];
    const from    = msg.from;             // رقم المرسل
    const msgType = msg.type;             // text / image / audio / ...
    const msgId   = msg.id;

    // نتعامل فقط مع النصوص الآن
    if(msgType !== 'text') {
      await sendWhatsAppMessage(from,
        '🤖 مدير رزق الذكي يتعامل حالياً مع النصوص فقط. ' +
        'أرسل رسالتك نصاً وسأرد عليك فوراً.'
      );
      return;
    }

    const userText = msg.text?.body?.trim() || '';
    if(!userText) return;

    // استخرج الاسم من contacts إن وُجد
    const contacts  = value?.contacts || [];
    const senderName = contacts[0]?.profile?.name || from;

    console.log(`📱 واتساب من ${senderName} (${from}): ${userText.substring(0, 60)}`);

    // ── جلسة المحادثة ─────────────────────────────────
    pruneOldSessions();

    if(!sessions.has(from)) {
      sessions.set(from, { history: [], lastSeen: Date.now() });
    }
    const session = sessions.get(from);
    session.lastSeen = Date.now();

    // ── تحديد هوية المشترك (رقم واتساب المُستلَم إليه) ────
    // في Meta API: value.metadata.phone_number_id أو display_phone_number
    const receivingPhoneId = value?.metadata?.phone_number_id || WA_CONFIG.PHONE_ID;
    const receivingPhone   = value?.metadata?.display_phone_number || '';

    // ── اطلب من Claude رداً (بشخصية المشترك إن كان ماسية) ──
    let replyText = 'شكراً لرسالتكم. سأرد عليكم قريباً إن شاء الله.';

    try {
      const result = await askSubscriberAgent({
        subscriberId: receivingPhone || receivingPhoneId,
        channel: 'whatsapp',
        message: userText,
        context: {
          sender : from,
          name   : senderName,
          history: session.history.slice(-MAX_HISTORY)
        }
      });

      replyText = result.text;

      // حدّث تاريخ الجلسة
      session.history.push({ role: 'user',      content: userText  });
      session.history.push({ role: 'assistant', content: replyText });

      // اقطع التاريخ إن طال
      if(session.history.length > MAX_HISTORY * 2) {
        session.history = session.history.slice(-MAX_HISTORY * 2);
      }

      console.log(`🧠 Claude: ${replyText.substring(0, 80)}...`);

    } catch(err) {
      console.error('❌ Claude error:', err.message);
      replyText = '⚠️ عذراً، حدثت مشكلة مؤقتة. يرجى إعادة المحاولة أو التواصل عبر direction@rizq.mr';
    }

    // ── أرسل الرد ─────────────────────────────────────
    await sendWhatsAppMessage(from, replyText);

    // سجّل المحادثة
    waLog.unshift({
      from   : from,
      name   : senderName,
      msg    : userText.substring(0, 100),
      reply  : replyText.substring(0, 100),
      time   : new Date().toLocaleString('ar-MA-u-nu-latn'),
      ai     : true
    });

  } catch(globalErr) {
    console.error('❌ خطأ غير متوقع في معالج واتساب:', globalErr.message);
  }
});

// ══════════════════════════════════════════════════════════
//  API: سجل محادثات واتساب للأدمن
// ══════════════════════════════════════════════════════════
app.get('/api/whatsapp-log', (req, res) => {
  res.json({ messages: waLog.slice(0, 50) });
});

// ── API: إرسال رسالة يدوية من الأدمن ─────────────────────
app.post('/api/whatsapp/send', async (req, res) => {
  const { to, text } = req.body;
  if(!to || !text) return res.status(400).json({ ok: false, error: 'to + text مطلوبان' });
  const result = await sendWhatsAppMessage(to, text);
  res.json(result);
});

// ── API: الحالة ──────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    status         : 'running',
    port           : PORT,
    messages_total : waLog.length,
    active_sessions: sessions.size,
    claude_model   : getAdvancedModel(),
    api_key_set    : !!(process.env.ANTHROPIC_API_KEY),
    wa_token_set   : !!(WA_CONFIG.TOKEN),
    wa_phone_id_set: !!(WA_CONFIG.PHONE_ID)
  });
});

// ── صفحة الحالة HTML ─────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`
    <html dir="rtl"><body style="font-family:Arial;padding:40px;background:#f0f4fa">
    <h1>📱 مدير رزق الذكي v1 — خادم واتساب</h1>
    <p>✅ الخادم يعمل على المنفذ <strong>${PORT}</strong></p>
    <p>🧠 العقل: <strong>${getAdvancedModel()}</strong></p>
    <p>🔑 Anthropic Key: <strong>${process.env.ANTHROPIC_API_KEY ? '✅' : '❌ مفقود'}</strong></p>
    <p>📲 WhatsApp Token: <strong>${WA_CONFIG.TOKEN ? '✅' : '❌ مفقود'}</strong></p>
    <p>📊 رسائل مسجّلة: <strong>${waLog.length}</strong></p>
    <p>👥 جلسات نشطة: <strong>${sessions.size}</strong></p>
    <p>🌐 Webhook: <code>POST /api/whatsapp</code></p>
    <hr>
    <pre>${JSON.stringify(waLog.slice(0, 3), null, 2)}</pre>
    </body></html>
  `);
});

app.listen(PORT, () => {
  console.log(`\n📱 رزق WhatsApp Handler v1 (Claude-Powered) — المنفذ: ${PORT}`);
  console.log(`   Webhook → Meta: https://YOUR-DOMAIN/api/whatsapp`);
  console.log(`   Verify Token: ${WA_CONFIG.VERIFY_TOKEN}`);
  console.log(`   Anthropic Key: ${process.env.ANTHROPIC_API_KEY ? '✅ موجود' : '❌ مفقود في .env'}`);
  console.log(`   WA Token: ${WA_CONFIG.TOKEN ? '✅ موجود' : '❌ مفقود في .env'}\n`);
});
