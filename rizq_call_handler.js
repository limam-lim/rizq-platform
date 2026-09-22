/**
 * rizq_call_handler.js  v3.0 — ForwardedFrom Architecture
 * ══════════════════════════════════════════════════════════
 * معالج المكالمات الهاتفية — مدير رزق الذكي
 *
 * ┌─────────────────────────────────────────────────┐
 * │  الآلية الحقيقية:                              │
 * │  1. المشترك يُفعّل الوكيل من لوحته             │
 * │  2. يضبط هاتفه: "تحويل عند عدم الرد"          │
 * │     → رقم Twilio الواحد لرزق                  │
 * │  3. عميل يتصل بالمشترك → لم يرد → يحوّل        │
 * │  4. Twilio يُرسل: ForwardedFrom = رقم المشترك  │
 * │  5. الوكيل يرد بشخصية المشترك                 │
 * │  6. اضغط 0 → تحويل فوري للمشترك               │
 * └─────────────────────────────────────────────────┘
 *
 * متغيرات .env:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   TWILIO_SID=AC...
 *   TWILIO_TOKEN=...
 *   RIZQ_TWILIO_NUMBER=+1XXXXXXXXXX   (الرقم الواحد لرزق)
 *   RIZQ_ADMIN_PHONE=+222XXXXXXXX     (للطوارئ)
 *   RIZQ_BACKEND_URL=https://...       (رابط rizq-backend — للتحقق الحقيقي
 *                                        من الباقة الماسية، انظر أدناه)
 *   BACKEND_SHARED_SECRET=...          (يجب أن يطابق حرفياً نفس القيمة
 *                                        المضبوطة في .env الخاص بـ rizq-
 *                                        backend/server.js — سرّان مختلفان
 *                                        لعمليتين منفصلتين لن يتحققا أبداً)
 * ══════════════════════════════════════════════════════════════
 * إصلاح جوهري 27/07/2026 — بوابة الباقة الماسية الحقيقية:
 * كان أي "وكيل مشترك" مسجَّل في لوحة الأدمن (حتى لو أُدخل يدوياً بلا أي
 * حساب حقيقي وراءه) يرد بالكامل بشخصية المنشأة على كل مكالمة — بلا أي
 * تحقق فعلي من أن صاحبه يملك فعلاً باقة "ماسية" نشطة. الآن نتحقق دورياً
 * (كل 15 دقيقة) من rizq-backend عبر accountId المرتبط بكل مشترك (حقل جديد
 * في لوحة الأدمن)، ونمنع الرد الشخصي فوراً لأي مشترك بلا باقة ماسية فعّالة
 * فعلاً من طرف الخادم — لا يمكن تزويرها من المتصفح. المشتركون القدامى الذين
 * سُجِّلوا قبل هذا الإصلاح بلا accountId يُعتبرون غير موثّقين تلقائياً حتى
 * تُعاد ربطهم من لوحة الأدمن.
 * ══════════════════════════════════════════════════════════
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const bodyParser = require('body-parser');
const twilio     = require('twilio');
const axios      = require('axios');
const {
  askSubscriberAgent,
  getSubscriberProfile,
  resolveSubscriberProfile,
  phonesEquivalent,
  getAllSubscriberProfiles,
  loadDemoSubscribers,
  setupSubscriberAPI,
} = require('./rizq_subscriber_agent');
const { askAgent } = require('./rizq_agent_brain');
const { getAdvancedModel } = require('./rizq-backend/config/anthropic');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function isProdEnv() {
  return process.env.NODE_ENV === 'production' || process.env.RIZQ_ENV === 'production';
}

/**
 * التحقق من توقيع Twilio — يمنع تزوير ForwardedFrom / CallSid وخلط المشتركين.
 * في الإنتاج: إلزامي. في التطوير: يُتخطّى فقط إن غاب TWILIO_TOKEN.
 */
function requireTwilioSignature(req, res, next) {
  const authToken = process.env.TWILIO_TOKEN || process.env.TWILIO_AUTH_TOKEN || '';
  if (!authToken) {
    if (isProdEnv()) {
      console.error('❌ TWILIO_TOKEN مفقود — رفض webhook المكالمات');
      return res.status(503).type('text/plain').send('Twilio auth not configured');
    }
    return next();
  }
  const signature = req.headers['x-twilio-signature'] || '';
  const webhookBase = (process.env.TWILIO_WEBHOOK_BASE_URL || '').replace(/\/$/, '');
  const url = webhookBase
    ? webhookBase + req.originalUrl
    : `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body && typeof req.body === 'object' ? req.body : {};
  let valid = false;
  try {
    valid = twilio.validateRequest(authToken, signature, url, params);
  } catch (e) {
    valid = false;
  }
  if (!valid) {
    console.warn('❌ توقيع Twilio غير صالح — رفض الطلب (عزل المكالمات)');
    return res.status(403).type('text/plain').send('Forbidden');
  }
  return next();
}

// ── رقم رزق الواحد + رقم الطوارئ ────────────────────────
const RIZQ_NUMBER  = process.env.RIZQ_TWILIO_NUMBER || '+1XXXXXXXXXX';
const ADMIN_PHONE  = process.env.RIZQ_ADMIN_PHONE   || '';

// ── حالة تفعيل الوكلاء (subscriberPhone → true/false) ──
// يُحدَّث من API عند ضغط زر التفعيل في لوحة المشترك
const agentStatus = new Map();

// ── سجل المكالمات ────────────────────────────────────────
const callLog = [];

// ── جلسات المحادثة (callSid → {history, subscriberPhone}) ──
const callSessions = new Map();

// تحميل المشتركين التجريبيين (لا يطغى على مشتركين حقيقيين محفوظين على القرص)
loadDemoSubscribers();

// ══════════════════════════════════════════════════════════
//  بوابة الباقة الماسية الحقيقية (من طرف الخادم) — انظر تعليق أعلى الملف
// ══════════════════════════════════════════════════════════
// ذاكرة محلية: subscriberPhone → true/false (هل يملك فعلاً باقة ماسية نشطة؟)
// تُحدَّث دورياً بدل استدعاء الخادم عند كل مكالمة واردة (تجنّب أي بطء أو
// نقطة فشل جديدة على مسار Twilio webhook الحسّاس للوقت).
const diamondStatus = new Map();
const RIZQ_BACKEND_URL      = process.env.RIZQ_BACKEND_URL || '';
const BACKEND_SHARED_SECRET = process.env.BACKEND_SHARED_SECRET || '';
const DIAMOND_REFRESH_MS    = 15 * 60 * 1000; // كل 15 دقيقة

async function _refreshDiamondStatuses() {
  if (!RIZQ_BACKEND_URL || !BACKEND_SHARED_SECRET) {
    // لا رابط خادم مضبوط بعد — لا نمنح أي مشترك صفة "ماسي موثّق" افتراضياً
    // (فشل آمن: بلا تحقق حقيقي = بلا شخصنة، وليس العكس).
    return;
  }
  try {
    const profiles = getAllSubscriberProfiles();
    const withAccount = profiles.filter((p) => p.accountId);
    if (!withAccount.length) return;
    const resp = await axios.post(
      RIZQ_BACKEND_URL.replace(/\/$/, '') + '/api/account-package/diamond-status-batch',
      { accountIds: withAccount.map((p) => p.accountId) },
      { headers: { 'x-rizq-secret': BACKEND_SHARED_SECRET }, timeout: 10000 }
    );
    const statuses = (resp.data && resp.data.statuses) || {};
    withAccount.forEach((p) => {
      diamondStatus.set(p.subscriberId, !!statuses[p.accountId]);
    });
    console.log(`💎 تحديث حالة الباقة الماسية: ${withAccount.length} مشترك مفحوص`);
  } catch (e) {
    console.error('⚠️ فشل تحديث حالة الباقة الماسية من rizq-backend:', e.message);
    // لا نغيّر diamondStatus عند فشل الشبكة — نُبقي آخر حالة معروفة بدل قطع
    // الخدمة فوراً عن مشتركين حقيقيين بسبب انقطاع مؤقت.
  }
}
_refreshDiamondStatuses();
setInterval(_refreshDiamondStatuses, DIAMOND_REFRESH_MS);

// هل هذا الرقم (subscriberPhone) يملك فعلاً باقة ماسية موثّقة من الخادم؟
function isVerifiedDiamondSubscriber(subscriberPhone) {
  if (!subscriberPhone) return false;
  if (diamondStatus.get(subscriberPhone) === true) return true;
  // جرّب المفتاح الكانوني إن وُجد تطابق بعد التطبيع
  const resolved = resolveSubscriberProfile(subscriberPhone);
  if (resolved && diamondStatus.get(resolved.subscriberId) === true) return true;
  return false;
}

/** هل وكيل هذا الرقم مفعّل؟ (افتراضياً مفعّل إن لم يُوقف صراحة) */
function isAgentToggledOn(subscriberPhone) {
  if (!subscriberPhone) return false;
  if (agentStatus.get(subscriberPhone) === false) return false;
  const resolved = resolveSubscriberProfile(subscriberPhone);
  if (resolved && agentStatus.get(resolved.subscriberId) === false) return false;
  return true;
}

/**
 * عزل المكالمة: ForwardedFrom → مشترك واحد + ماسي موثّق + مفعّل.
 * أي فشل → null → مسار مدير رزق العام.
 */
function resolveActiveCallTenant(forwardedFrom) {
  if (!forwardedFrom) return null;
  const resolved = resolveSubscriberProfile(forwardedFrom);
  if (!resolved) return null;
  const { subscriberId, profile } = resolved;
  if (!isAgentToggledOn(subscriberId)) return null;
  if (!isVerifiedDiamondSubscriber(subscriberId)) return null;
  return { subscriberId, profile };
}

// تفعيل API تسجيل/جلب المشتركين (كان موجوداً في rizq_subscriber_agent.js
// لكن لم يُستدعَ من أي سيرفر فعلياً — فتبقى /api/subscriber/register معطّلة
// ولوحة الأدمن بلا أي وجهة حقيقية ترسل إليها)
setupSubscriberAPI(app);

// ══════════════════════════════════════════════════════════
//  مساعد: بناء TwiML صوتي
// ══════════════════════════════════════════════════════════
function twiSay(text, opts = {}) {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ language: 'ar-SA', voice: 'Polly.Zeina', ...opts }, text);
  return twiml;
}

function twiGather(text, action, digits = '1', timeout = 10) {
  const twiml  = new twilio.twiml.VoiceResponse();
  const gather = twiml.gather({ numDigits: digits, action, timeout, language: 'ar-SA' });
  gather.say({ language: 'ar-SA', voice: 'Polly.Zeina' }, text);
  // لو لم يضغط شيئاً
  twiml.redirect(action + '?Digits=timeout');
  return twiml;
}

// ══════════════════════════════════════════════════════════
//  WEBHOOK الرئيسي: مكالمة واردة
//  Twilio يُرسل:
//    From          = رقم المتصل (العميل)
//    To            = رقم رزق Twilio
//    ForwardedFrom = رقم المشترك الأصلي (المفتاح!)
// ══════════════════════════════════════════════════════════
app.post('/api/call', requireTwilioSignature, (req, res) => {
  const caller        = req.body.From          || '';
  const callSid       = req.body.CallSid       || '';
  const forwardedFrom = req.body.ForwardedFrom || ''; // رقم المشترك

  console.log(`\n📞 مكالمة جديدة:`);
  console.log(`   من    : ${caller}`);
  console.log(`   تحوّلت من: ${forwardedFrom || '(لا تحويل — مكالمة مباشرة)'}`);
  console.log(`   SID   : ${callSid}`);

  // ── عزل صارم: ForwardedFrom فقط → مشترك واحد أو مسار المنصة ──
  const tenant = resolveActiveCallTenant(forwardedFrom);
  const looseMatch = forwardedFrom ? resolveSubscriberProfile(forwardedFrom) : null;
  const isToggledOn = forwardedFrom ? isAgentToggledOn(forwardedFrom) : false;
  const isDiamondVerified = forwardedFrom ? isVerifiedDiamondSubscriber(forwardedFrom) : false;

  callLog.unshift({
    sid          : callSid,
    caller       : caller,
    subscriberNum: tenant ? tenant.subscriberId : (forwardedFrom || ''),
    subscriberName: tenant?.profile?.businessName || '(مكالمة مباشرة / منصة رزق)',
    time         : new Date().toLocaleString('ar-MA-u-nu-latn'),
    status       : tenant
      ? 'agent_answered'
      : (looseMatch && isToggledOn && !isDiamondVerified)
        ? 'blocked_not_diamond'
        : 'direct_rizq',
    digit        : null,
    reply        : null
  });

  // الجلسة تربط CallSid بالمعرّف الكانوني فقط عند تفعيل المستأجر
  callSessions.set(callSid, {
    history: [],
    subscriberPhone: tenant ? tenant.subscriberId : '',
    tenantActive: !!tenant,
    mode: tenant ? 'subscriber' : 'platform',
  });

  const twiml = new twilio.twiml.VoiceResponse();

  if (tenant) {
    const profile = tenant.profile;
    const businessName = profile.businessName;
    const greeting = _buildSubscriberGreeting(profile);

    const gather = twiml.gather({
      numDigits : '1',
      action    : '/api/call/subscriber-input',
      timeout   : 12,
      language  : 'ar-SA'
    });
    gather.say({ language: 'ar-SA', voice: 'Polly.Zeina' }, greeting);
    twiml.redirect('/api/call/subscriber-input?Digits=timeout');
    console.log(`🎭 وكيل "${businessName}" [${tenant.subscriberId}] يرد...`);
  } else {
    // لا تطابق / غير ماسي / موقوف / بلا ForwardedFrom → مدير رزق العام
    const gather = twiml.gather({
      numDigits: '1',
      action   : '/api/call/rizq-input',
      timeout  : 8,
      language : 'ar-SA'
    });
    gather.say({ language: 'ar-SA', voice: 'Polly.Zeina' },
      'السلام عليكم، مرحباً بكم في منصة رزق. ' +
      'اضغط 1 للتسجيل. اضغط 2 للدعم التقني. اضغط 3 للشراكات. اضغط 4 للتحدث مع الإدارة.'
    );
    twiml.say({ language: 'ar-SA', voice: 'Polly.Zeina' },
      'شكراً لاتصالكم. نراكم على rizq.mr'
    );
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// ── مساعد: بناء تحية المشترك حسب نوع نشاطه ─────────────
function _buildSubscriberGreeting(profile) {
  const name  = profile.ownerName || profile.businessName;
  const now   = new Date();
  const hour  = now.getHours();
  const ws    = profile.workHours?.start || 8;
  const we    = profile.workHours?.end   || 18;
  const inWork = hour >= ws && hour < we;

  const offHoursNote = inWork
    ? `الأستاذ ${name} مشغول حالياً`
    : `مكتبنا مغلق الآن ويعمل من ${ws}:00 إلى ${we}:00`;

  const greetings = {
    law_office : `السلام عليكم، ${profile.businessName}. ${offHoursNote}. اضغط 1 لتحديد موعد. اضغط 0 للتحدث مع الأستاذ مباشرة.`,
    store      : `أهلاً وسهلاً في ${profile.businessName}! ${offHoursNote}. اضغط 1 للاستفسار عن منتج. اضغط 0 لتحويل مكالمتك للمسؤول.`,
    medical    : `السلام عليكم، ${profile.businessName}. ${offHoursNote}. اضغط 1 لحجز موعد. اضغط 0 للتواصل المباشر.`,
    real_estate: `السلام عليكم، ${profile.businessName}. ${offHoursNote}. اضغط 1 للاستفسار. اضغط 0 للتواصل المباشر.`,
    restaurant : `أهلاً في ${profile.businessName}! ${offHoursNote}. اضغط 1 للحجز أو الطلب. اضغط 0 للتحدث معنا.`,
    corp       : `السلام عليكم، ${profile.businessName}. ${offHoursNote}. اضغط 1 للاستفسار. اضغط 0 لتحويل مكالمتك.`
  };

  return greetings[profile.businessType] ||
    `السلام عليكم، ${profile.businessName}. ${offHoursNote}. اضغط 1 للمساعدة. اضغط 0 للتحويل المباشر.`;
}

// ══════════════════════════════════════════════════════════
//  مدخلات الزائر لوكيل المشترك — هنا يعمل Claude
// ══════════════════════════════════════════════════════════
app.post('/api/call/subscriber-input', requireTwilioSignature, async (req, res) => {
  const digit     = req.body.Digits || req.query.Digits || 'timeout';
  const callSid   = req.body.CallSid || '';
  const caller    = req.body.From || '';
  const session   = callSessions.get(callSid) || { history: [], subscriberPhone: '', tenantActive: false };
  const logEntry  = callLog.find(l => l.sid === callSid);

  if(logEntry) logEntry.digit = digit;

  const twiml = new twilio.twiml.VoiceResponse();

  // إعادة التحقق من العزل في كل خطوة (لا نعتمد على الجلسة وحدها)
  const forwardedNow = req.body.ForwardedFrom || '';
  if (forwardedNow && session.subscriberPhone && !phonesEquivalent(forwardedNow, session.subscriberPhone)) {
    console.warn(`⚠️ عزل مكالمة: ForwardedFrom (${forwardedNow}) ≠ جلسة (${session.subscriberPhone})`);
    twiml.redirect('/api/call/rizq-input?Digits=timeout');
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  const tenant = resolveActiveCallTenant(session.subscriberPhone || forwardedNow);
  if (!tenant) {
    console.warn('⚠️ subscriber-input بلا مستأجر نشط — تحويل لمسار المنصة');
    twiml.redirect('/api/call/rizq-input?Digits=' + encodeURIComponent(digit === 'timeout' ? 'timeout' : digit));
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  const profile = tenant.profile;
  session.subscriberPhone = tenant.subscriberId;
  session.tenantActive = true;

  // ── 0 = تحويل فوري للمشترك الموثّق فقط ────────────────
  if(digit === '0') {
    const subscriberRealNumber = tenant.subscriberId;
    console.log(`🔄 تحويل → ${subscriberRealNumber}`);
    twiml.say({ language: 'ar-SA', voice: 'Polly.Zeina' },
      `جاري تحويل مكالمتكم. يرجى الانتظار لحظة.`
    );
    twiml.dial(subscriberRealNumber);
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  const intentMap = {
    '1'      : 'المتصل يريد مساعدة. رحّب به وساعده حسب تخصص المنشأة.',
    '2'      : 'المتصل يريد موعداً أو استفساراً إضافياً.',
    'timeout': 'لم يضغط المتصل شيئاً. رحّب به واعرض مساعدتك.'
  };
  const userMessage = intentMap[digit] || `المتصل ضغط "${digit}". ساعده حسب تخصص المنشأة.`;

  let claudeReply = `شكراً لاتصالكم بـ${profile.businessName}. سنتواصل معكم قريباً.`;

  try {
    const result = await askSubscriberAgent({
      subscriberId: tenant.subscriberId,
      channel     : 'call',
      message     : userMessage,
      context     : { sender: caller, name: caller, history: session.history }
    });

    // إن سقط العزل داخل askSubscriberAgent → لا ننطق رد المنصة تحت هوية التاجر
    if (!result.isolation || result.isolation.mode !== 'tenant') {
      console.warn('⚠️ رد خارج وضع المستأجر — رسالة محايدة للمنشأة');
      claudeReply = `شكراً لاتصالكم بـ${profile.businessName}. سنتواصل معكم قريباً.`;
    } else if (result.business && result.business !== profile.businessName) {
      console.warn('⚠️ رفض رد عابر للمستأجرين');
      claudeReply = `شكراً لاتصالكم بـ${profile.businessName}. سنتواصل معكم قريباً.`;
    } else {
      claudeReply = result.text;
    }
    session.history.push({ role: 'user',      content: userMessage  });
    session.history.push({ role: 'assistant', content: claudeReply });
    callSessions.set(callSid, session);

    if(logEntry) logEntry.reply = claudeReply.substring(0, 120);
    console.log(`🧠 Claude [${profile.businessName}]: ${claudeReply.substring(0,60)}...`);

  } catch(err) {
    console.error('❌ Claude error:', err.message);
  }

  const gather = twiml.gather({
    numDigits: '1',
    action   : '/api/call/subscriber-input',
    timeout  : 10,
    language : 'ar-SA'
  });
  gather.say({ language: 'ar-SA', voice: 'Polly.Zeina' },
    claudeReply + ' ... اضغط 0 للتحويل للمسؤول. أو أخبرني بأي شيء آخر.'
  );
  twiml.say({ language: 'ar-SA', voice: 'Polly.Zeina' },
    `شكراً لاتصالكم بـ${profile.businessName}. مع السلامة.`
  );

  res.type('text/xml');
  res.send(twiml.toString());
});

// ══════════════════════════════════════════════════════════
//  مدخلات المتصل المباشر برزق
// ══════════════════════════════════════════════════════════
app.post('/api/call/rizq-input', requireTwilioSignature, async (req, res) => {
  const digit   = req.body.Digits || '';
  const callSid = req.body.CallSid || '';
  const caller  = req.body.From || '';
  const session = callSessions.get(callSid) || { history: [] };
  const logEntry = callLog.find(l => l.sid === callSid);

  if(logEntry) logEntry.digit = digit;

  // تحويل للإدارة
  if(digit === '4' && ADMIN_PHONE) {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ language: 'ar-SA', voice: 'Polly.Zeina' }, 'جاري التحويل للإدارة.');
    twiml.dial(ADMIN_PHONE);
    res.type('text/xml');
    return res.send(twiml.toString());
  }

  const intentMap = {
    '1': 'المتصل يريد التسجيل في منصة رزق.',
    '2': 'المتصل يطلب دعماً تقنياً.',
    '3': 'المتصل مهتم بشراكة تجارية مع رزق.'
  };
  const userMessage = intentMap[digit] || `المتصل ضغط "${digit}". ردّ بشكل مناسب.`;

  let claudeReply = 'شكراً لاتصالكم بمنصة رزق. سنتواصل معكم قريباً.';

  try {
    const result = await askAgent({
      channel: 'call',
      message: userMessage,
      context: { sender: caller, name: caller, history: session.history }
    });
    claudeReply = result.text;
    if(logEntry) logEntry.reply = claudeReply.substring(0, 100);
  } catch(e) { console.error('❌', e.message); }

  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say({ language: 'ar-SA', voice: 'Polly.Zeina' },
    claudeReply + ' ... شكراً لاتصالكم. نراكم على rizq.mr'
  );
  res.type('text/xml');
  res.send(twiml.toString());
});

const { requireSatelliteSecret, timingSafeEqualStr } = require('./rizq-backend/lib/satelliteAuth');

// ══════════════════════════════════════════════════════════
//  API: تفعيل / إيقاف الوكيل (من لوحة المشترك)
//  POST /api/agent/toggle
//  { subscriberPhone, active: true|false, secret: 'xxx' }
// ══════════════════════════════════════════════════════════
app.post('/api/agent/toggle', (req, res) => {
  const { subscriberPhone, active, secret } = req.body || {};
  const expectedSecret = process.env.RIZQ_API_SECRET || '';
  const headerSecret = req.header('x-rizq-secret') || '';
  const got = headerSecret || secret || '';
  if (!expectedSecret || !got || !timingSafeEqualStr(got, expectedSecret)) {
    return res.status(403).json({ ok: false, error: 'غير مصرّح' });
  }

  if(!subscriberPhone) return res.status(400).json({ ok: false, error: 'subscriberPhone مطلوب' });

  const resolved = resolveSubscriberProfile(subscriberPhone);
  const canonical = resolved ? resolved.subscriberId : subscriberPhone;
  agentStatus.set(canonical, !!active);
  if (canonical !== subscriberPhone) agentStatus.set(subscriberPhone, !!active);
  const profile = resolved ? resolved.profile : getSubscriberProfile(subscriberPhone);

  console.log(`${active ? '🟢' : '🔴'} وكيل "${profile?.businessName || canonical}": ${active ? 'مفعّل' : 'موقوف'}`);

  res.json({
    ok        : true,
    phone     : canonical,
    active    : !!active,
    business  : profile?.businessName || null,
    twilioNum : RIZQ_NUMBER,
    message   : active
      ? `✅ الوكيل مفعّل. أضف تحويل المكالمات على هاتفك إلى: ${RIZQ_NUMBER}`
      : '⛔ الوكيل موقوف. المكالمات ستصل إليك مباشرة.'
  });
});

// ── API: حالة وكيل مشترك ────────────────────────────────
app.get('/api/agent/status/:phone', requireSatelliteSecret, (req, res) => {
  const phone   = req.params.phone;
  const resolved = resolveSubscriberProfile(phone);
  const canonical = resolved ? resolved.subscriberId : phone;
  const profile = resolved ? resolved.profile : getSubscriberProfile(phone);
  const active  = isAgentToggledOn(canonical);
  res.json({
    phone: canonical,
    active,
    business : profile?.businessName || null,
    twilioNum: RIZQ_NUMBER
  });
});

// ── API: سجل المكالمات ───────────────────────────────────
app.get('/api/call-log', requireSatelliteSecret, (req, res) => {
  res.json({ calls: callLog.slice(0, 50), total: callLog.length });
});

// ── API: سجل مكالمات مشترك بعينه ────────────────────────
app.get('/api/call-log/:phone', requireSatelliteSecret, (req, res) => {
  const phone = req.params.phone;
  const calls = callLog.filter(c => c.subscriberNum === phone);
  res.json({ calls: calls.slice(0, 50), total: calls.length });
});

// ── صفحة الحالة (سرّ الأقمار فقط — لا تكشف أرقاماً/سجلات للعامة) ─
app.get('/', requireSatelliteSecret, (req, res) => {
  const activeCount = Array.from(agentStatus.values()).filter(Boolean).length;
  res.send(`
    <html dir="rtl"><body style="font-family:Arial;padding:40px;background:#f0f4fa">
    <h1>📞 مدير رزق الذكي v3 — نظام التحويل الذكي</h1>
    <table style="border-collapse:collapse;width:100%;max-width:500px">
      <tr><td style="padding:8px;font-weight:bold">الخادم</td><td>✅ يعمل على المنفذ ${PORT}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">رقم Twilio</td><td><code>${RIZQ_NUMBER}</code></td></tr>
      <tr><td style="padding:8px;font-weight:bold">وكلاء نشطون</td><td>${activeCount}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">مكالمات مسجّلة</td><td>${callLog.length}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">Claude Model</td><td>${getAdvancedModel()}</td></tr>
      <tr><td style="padding:8px;font-weight:bold">API Key</td><td>${process.env.ANTHROPIC_API_KEY ? '✅ موجود' : '❌ مفقود'}</td></tr>
    </table>
    <hr>
    <h3>آخر 5 مكالمات:</h3>
    <pre>${JSON.stringify(callLog.slice(0,5), null, 2)}</pre>
    </body></html>
  `);
});

app.listen(PORT, () => {
  console.log(`\n📞 رزق Call Handler v3 — المنفذ: ${PORT}`);
  console.log(`   رقم Twilio الموحّد: ${RIZQ_NUMBER}`);
  console.log(`   Webhook → Twilio: https://YOUR-DOMAIN/api/call`);
  console.log(`   المشتركون يُحوّلون مكالماتهم إلى هذا الرقم`);
  console.log(`   العقل: ${getAdvancedModel()}\n`);
});
