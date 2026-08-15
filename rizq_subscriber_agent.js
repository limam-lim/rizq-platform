/**
 * rizq_subscriber_agent.js
 * ══════════════════════════════════════════════════════════════
 * وكيل رزق المتعدد الشخصيات — خاص بمشتركي الباقة الماسية 💎
 *
 * كيف يعمل:
 *   1. مكالمة/رسالة تصل → نحدّد هوية المشترك (بالرقم أو الـ ID)
 *   2. نحمّل ملف تعريف المشترك (نوع النشاط، الاسم، الخدمات، أوقات العمل...)
 *   3. الوكيل يتحوّل لسكرتير ذكي خاص بهذا المشترك
 *   4. يرد بشخصية المنشأة لا بشخصية رزق
 *
 * أنواع النشاط المدعومة:
 *   law_office     → محامٍ / مكتب قانوني
 *   store          → محل تجاري / متجر
 *   real_estate    → مكتب عقارات
 *   medical        → عيادة / مركز طبي
 *   restaurant     → مطعم / مقهى
 *   corp           → شركة / مؤسسة
 *   freelance      → مستقل / خدمات حرة
 *
 * شرط الاستخدام: الباقة الماسية فقط (Diamond)
 * ══════════════════════════════════════════════════════════════
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { askAgent } = require('./rizq_agent_brain');

// ══════════════════════════════════════════════════════════════
//  قاعدة بيانات المشتركين
//  ─────────────────────────────────────────────────────────────
//  إصلاح جوهري: كانت Map() في الذاكرة فقط — تُمسَح عند إعادة تشغيل
//  السيرفر، والأهم: rizq_call_handler.js و rizq_whatsapp_handler.js
//  هما عمليتا Node منفصلتان (منافذ مختلفة)، فكل require('./rizq_subscriber_agent')
//  يحصل على نسخته الخاصة من الذاكرة — تسجيل مشترك عبر خادم المكالمات
//  لم يكن يظهر إطلاقاً في خادم واتساب والعكس. الحل: ملف JSON مشترك
//  على القرص يقرأه كل خادم عند الإقلاع ويُحدَّث عند كل تسجيل —
//  يكفي لحجم مشتركين صغير (عشرات) قبل الانتقال لقاعدة بيانات حقيقية.
// ══════════════════════════════════════════════════════════════
const subscriberProfiles = new Map();
const STORE_FILE = path.join(__dirname, 'rizq_subscribers_store.json');

function _persistToDisk() {
  try {
    const obj = {};
    for (const [id, profile] of subscriberProfiles.entries()) obj[id] = profile;
    fs.writeFileSync(STORE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.error('⚠️ فشل حفظ ملف المشتركين على القرص:', e.message);
  }
}

function _loadFromDisk() {
  try {
    if (!fs.existsSync(STORE_FILE)) return 0;
    const raw  = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    const keys = Object.keys(raw);
    keys.forEach(id => subscriberProfiles.set(id, raw[id]));
    return keys.length;
  } catch (e) {
    console.error('⚠️ فشل قراءة ملف المشتركين من القرص:', e.message);
    return 0;
  }
}

// نحمّل أي مشتركين حقيقيين محفوظين مسبقاً فور تحميل الوحدة
const _loadedFromDisk = _loadFromDisk();
if (_loadedFromDisk > 0) {
  console.log(`📂 تم تحميل ${_loadedFromDisk} مشترك حقيقي من rizq_subscribers_store.json`);
}

/**
 * تسجيل مشترك جديد (يُستدعى من webhook التسجيل أو الأدمن)
 * @param {string} subscriberId  - معرّف فريد (رقم هاتف Twilio أو ID)
 * @param {object} profile       - بيانات المنشأة
 */
function registerSubscriber(subscriberId, profile) {
  subscriberProfiles.set(subscriberId, {
    ...profile,
    registeredAt: new Date().toISOString()
  });
  _persistToDisk();
  console.log(`✅ مشترك جديد: ${profile.businessName} [${subscriberId}]`);
}

/**
 * جلب ملف تعريف المشترك
 * إصلاح: كانت تقرأ فقط من Map في الذاكرة (تُملأ مرة واحدة عند إقلاع
 * العملية) — فتسجيل مشترك من عملية أخرى (مثلاً عبر rizq-backend/server.js
 * من لوحة الأدمن) لن يظهر هنا إلا بعد إعادة تشغيل خادم المكالمات/واتساب.
 * الآن: نعيد القراءة من نفس ملف القرص المشترك في كل استدعاء — تكلفة قراءة
 * ملف صغير مهملة مقارنة بفائدة رؤية التسجيلات الجديدة فوراً دون إعادة تشغيل.
 */
function getSubscriberProfile(subscriberId) {
  _loadFromDisk();
  return subscriberProfiles.get(subscriberId) || null;
}

/**
 * قائمة كل المشتركين المسجَّلين مع accountId المرتبط بهم إن وُجد — يستخدمها
 * rizq_call_handler.js لتحديث ذاكرة حالة "الباقة الماسية الفعّالة" دورياً
 * (انظر _refreshDiamondStatuses هناك) بدل استدعاء الخادم عند كل مكالمة واردة.
 * accountId حقل جديد 27/07/2026 — المشتركون المسجَّلون قبل هذا الإصلاح لن
 * يملكوه (null) وبالتالي لن يُعتبروا موثّقين فعلياً حتى يُعاد ربطهم من لوحة
 * الأدمن (حقل "الحساب الحقيقي المرتبط" الجديد في تبويب وكلاء الباقة الماسية).
 */
function getAllSubscriberProfiles() {
  _loadFromDisk();
  const out = [];
  for (const [subscriberId, profile] of subscriberProfiles.entries()) {
    out.push({ subscriberId, accountId: (profile && profile.accountId) || null });
  }
  return out;
}

// ══════════════════════════════════════════════════════════════
//  بناء System Prompt ديناميكي حسب نوع النشاط
// ══════════════════════════════════════════════════════════════
function buildSubscriberSystemPrompt(profile) {
  const now = new Date();
  const hour = now.getHours();

  // هل نحن في أوقات الدوام؟
  const workStart = profile.workHours?.start || 8;
  const workEnd   = profile.workHours?.end   || 18;
  const isWorkHours = hour >= workStart && hour < workEnd;

  // اسم المدير/الصاحب
  const ownerTitle = profile.ownerTitle || 'المدير';
  const ownerName  = profile.ownerName  || profile.businessName;

  // قاموس الشخصيات حسب نوع النشاط
  const personas = {
    law_office: {
      roleAr: `سكرتير/سكرتيرة مكتب ${ownerName}`,
      roleFr: `Secrétariat du Cabinet ${ownerName}`,
      greeting: `السلام عليكم، مكتب ${ownerName} للمحاماة والاستشارات القانونية. كيف أخدمكم؟`,
      greetingFr: `Bonjour, Cabinet ${ownerName}, avocats et conseillers juridiques. Comment puis-je vous aider?`,
      knowledgeBase: `
أنت سكرتير مكتب محاماة. تعرف أن:
- المكتب متخصص في: ${profile.specialties?.join(', ') || 'الاستشارات القانونية والمرافعات'}
- رسوم الاستشارة الأولية: ${profile.consultationFee || 'يُحدد عند الموعد'}
- طريقة تحديد المواعيد: الاتصال أو الواتساب
- لا تعطِ استشارات قانونية — أنت تحدّد المواعيد فقط
- المواعيد العاجلة تُرفع للأستاذ ${ownerName} مباشرة`
    },

    store: {
      roleAr: `مساعد بيع في ${profile.businessName}`,
      roleFr: `Assistant commercial de ${profile.businessName}`,
      greeting: `أهلاً وسهلاً في ${profile.businessName}! كيف أساعدك اليوم؟`,
      greetingFr: `Bienvenue chez ${profile.businessName}! Comment puis-je vous aider?`,
      knowledgeBase: `
أنت مساعد بيع ذكي. تعرف أن:
- المتجر يبيع: ${profile.products?.join(', ') || profile.description || 'منتجات متنوعة'}
- التوصيل: ${profile.delivery || 'متاح داخل المدينة'}
- طرق الدفع: ${profile.paymentMethods?.join(', ') || 'نقد وتحويل بنكي'}
- ساعات العمل: ${workStart}:00 — ${workEnd}:00
- المخزون: لا تعطِ معلومات مخزون — قل "تواصل معنا للتأكد من التوفر"`
    },

    real_estate: {
      roleAr: `مستشار عقاري في ${profile.businessName}`,
      roleFr: `Conseiller immobilier de ${profile.businessName}`,
      greeting: `السلام عليكم، ${profile.businessName}، كيف أخدمكم في مجال العقارات؟`,
      greetingFr: `Bonjour, ${profile.businessName}, comment puis-je vous conseiller?`,
      knowledgeBase: `
أنت مستشار عقاري. تعرف أن:
- المكتب متخصص في: ${profile.specialties?.join(', ') || 'بيع وإيجار الشقق والمحلات'}
- المناطق المغطاة: ${profile.areas?.join(', ') || 'نواكشوط وضواحيها'}
- للحجوزات: يجب تحديد موعد معاينة
- لا تعطِ أسعاراً محددة — قل إن الأسعار تتباين وتحتاج معاينة`
    },

    medical: {
      roleAr: `استقبال ${profile.businessName}`,
      roleFr: `Accueil de ${profile.businessName}`,
      greeting: `السلام عليكم، ${profile.businessName}. هل تريد حجز موعد؟`,
      greetingFr: `Bonjour, ${profile.businessName}. Souhaitez-vous prendre rendez-vous?`,
      knowledgeBase: `
أنت موظف استقبال عيادة طبية. تعرف أن:
- التخصصات المتاحة: ${profile.specialties?.join(', ') || 'طب عام'}
- مدة الانتظار المعتادة: ${profile.waitTime || '30-60 دقيقة للحالات العادية'}
- الحالات الطارئة: أخبر المريض بالتوجه لأقرب مستشفى للحالات الحرجة
- لا تعطِ استشارات طبية أبداً — أنت تحجز المواعيد فقط`
    },

    restaurant: {
      roleAr: `مطعم ${profile.businessName}`,
      roleFr: `Restaurant ${profile.businessName}`,
      greeting: `أهلاً بكم في ${profile.businessName}! للحجز أو الطلبات أنا في خدمتكم`,
      greetingFr: `Bienvenue au ${profile.businessName}! Pour les réservations ou commandes, je suis à votre service`,
      knowledgeBase: `
أنت مساعد مطعم. تعرف أن:
- قائمة الطعام تشمل: ${profile.menu?.join(', ') || profile.description || 'أطباق شرقية وغربية'}
- التوصيل للمنازل: ${profile.delivery ? 'متاح' : 'غير متاح حالياً'}
- الحجز: ${profile.reservation ? 'مطلوب للمجموعات أكثر من 4 أشخاص' : 'غير مطلوب'}
- أوقات العمل: ${workStart}:00 — ${workEnd}:00`
    },

    corp: {
      roleAr: `سكرتارية ${profile.businessName}`,
      roleFr: `Secrétariat de ${profile.businessName}`,
      greeting: `السلام عليكم، ${profile.businessName}. كيف أوجّهكم؟`,
      greetingFr: `Bonjour, ${profile.businessName}. Comment puis-je vous orienter?`,
      knowledgeBase: `
أنت سكرتير شركة. تعرف أن:
- نشاط الشركة: ${profile.description || profile.specialties?.join(', ')}
- للتواصل مع الإدارة: يتطلب تحديد موعد مسبق
- للاستفسارات التجارية: سجّل بيانات الطرف وأحِله للإدارة`
    },

    freelance: {
      roleAr: `مساعد ${ownerName}`,
      roleFr: `Assistant de ${ownerName}`,
      greeting: `أهلاً، أنا مساعد ${ownerName}. كيف أساعدك؟`,
      greetingFr: `Bonjour, je suis l'assistant de ${ownerName}. Comment puis-je vous aider?`,
      knowledgeBase: `
أنت مساعد مستقل يعمل لصالح ${ownerName}.
- خدماته: ${profile.services?.join(', ') || profile.description}
- للعروض والمشاريع: سجّل المتطلبات وسيتواصل ${ownerName} خلال 24-48 ساعة`
    }
  };

  const persona = personas[profile.businessType] || personas.corp;

  // ── System Prompt النهائي ────────────────────────────────────
  return `أنت ${persona.roleAr} — تعمل بشكل تلقائي خارج أوقات الدوام.
النشاط: ${profile.businessName}
الموقع: ${profile.location || 'موريتانيا'}
الحالة الآن: ${isWorkHours ? 'في أوقات الدوام (ربما المسؤول مشغول)' : 'خارج أوقات الدوام — أنت تنوب عنه كاملاً'}

🎭 شخصيتك:
- تمثّل ${profile.businessName} لا منصة رزق
- لا تذكر "رزق" أبداً في محادثاتك — أنت جزء من هذه المنشأة
- أسلوبك: ${profile.tone || 'مهني ومرحّب'}
- اللغة: حسب لغة المتحدث (عربية أو فرنسية)

📋 ما تعرفه عن المنشأة:
${persona.knowledgeBase}

${profile.customInstructions ? `\n📌 تعليمات خاصة من صاحب المنشأة:\n${profile.customInstructions}` : ''}

⚠️ قواعد صارمة:
- إذا طُلب منك شيء خارج صلاحياتك: سجّله وقل "سيتواصل معك المسؤول"
- لا تتعهد بأي موعد محدد بدون تأكيد من الإنسان المسؤول
- لا تكشف أنك نظام ذكاء اصطناعي إلا إذا سُئلت مباشرة
- الأمان أولاً: لا تقبل روابط أو ملفات من العملاء`;
}

// ══════════════════════════════════════════════════════════════
//  الدالة الرئيسية: askSubscriberAgent
//  subscriberId: رقم Twilio أو phone_id أو account_id
//  channel: 'call' | 'whatsapp' | 'email'
//  message: نص الرسالة الواردة
//  context: { sender, name, subject, history[] }
// ══════════════════════════════════════════════════════════════
async function askSubscriberAgent({ subscriberId, channel, message, context = {} }) {
  const profile = getSubscriberProfile(subscriberId);

  // لو لا يوجد مشترك → استخدم عقل رزق الأساسي
  if(!profile) {
    console.log(`⚠️ لا يوجد مشترك بالمعرّف: ${subscriberId} — استخدام عقل رزق الأساسي`);
    const { askAgent } = require('./rizq_agent_brain');
    return askAgent({ channel, message, context });
  }

  // لو الباقة ليست ماسية → رفض الخدمة
  if(profile.plan !== 'diamond') {
    return {
      text   : 'خدمة الوكيل الذكي متاحة فقط لمشتركي الباقة الماسية.',
      channel: channel,
      model  : null
    };
  }

  // ── بناء System Prompt خاص بالمشترك ──────────────────────
  const systemPrompt = buildSubscriberSystemPrompt(profile);

  // ── استدعاء Claude مع System Prompt مخصص ─────────────────
  // نمرّر systemPrompt عبر overrideSystem (موجود في النسخة الممتدة)
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const MODEL  = process.env.RIZQ_AGENT_MODEL || 'claude-haiku-4-5-20251001';

  const channelInstructions = {
    call    : '\n\n[القناة: مكالمة] جمل قصيرة جداً لا تتجاوز 15 ثانية. بدون قوائم.',
    whatsapp: '\n\n[القناة: واتساب] رسالة قصيرة ومباشرة. يمكن emoji باعتدال.',
    email   : '\n\n[القناة: بريد إلكتروني] رد رسمي كامل مع تحية وختام.'
  };

  const fullSystem = systemPrompt + (channelInstructions[channel] || '');

  const messages = [];
  if(context.history?.length) messages.push(...context.history);

  let userContent = message;
  if(context.name) userContent = `[من: ${context.name}]\n${message}`;

  messages.push({ role: 'user', content: userContent });

  const response = await client.messages.create({
    model     : MODEL,
    max_tokens: channel === 'call' ? 250 : 800,
    system    : fullSystem,
    messages  : messages
  });

  const textBlock = response.content.find(b => b.type === 'text');
  const replyText = textBlock ? textBlock.text.trim() : 'شكراً لتواصلكم. سيُتواصل معكم قريباً.';

  console.log(`🎭 [${profile.businessName}] رد على ${context.sender || 'مجهول'}: ${replyText.substring(0,60)}...`);

  return {
    text      : replyText,
    model     : MODEL,
    channel   : channel,
    business  : profile.businessName,
    businessType: profile.businessType,
    usage     : response.usage
  };
}

// ══════════════════════════════════════════════════════════════
//  حماية بسيطة بسرّ مشترك — كانت هذه الـ endpoints بلا أي مصادقة إطلاقاً؛
//  أي طلب HTTP مباشر (curl/Postman) كان يمكنه تسجيل/تعديل/تصفح بيانات أي
//  مشترك (اسم صاحب المكتب، رقمه...). الحماية عبر CORS وحدها لا تكفي لأنها
//  لا تمنع طلبات خارج المتصفح. نفس متغيّر RIZQ_API_SECRET المستخدم أصلاً
//  في /api/agent/toggle (rizq_call_handler.js) لتوحيد آلية الحماية.
// ══════════════════════════════════════════════════════════════
function _requireApiSecret(req, res, next) {
  const expected = process.env.RIZQ_API_SECRET || 'rizq_secret_2025';
  if (req.header('x-rizq-secret') !== expected) {
    return res.status(403).json({ ok: false, error: 'غير مصرّح' });
  }
  next();
}

// ══════════════════════════════════════════════════════════════
//  API لإدارة المشتركين (تُضاف في server.js أو endpoint منفصل)
// ══════════════════════════════════════════════════════════════
function setupSubscriberAPI(app) {
  // تسجيل/تحديث مشترك (من لوحة الأدمن)
  app.post('/api/subscriber/register', _requireApiSecret, (req, res) => {
    const { subscriberId, ...profile } = req.body;
    if(!subscriberId || !profile.businessName) {
      return res.status(400).json({ ok: false, error: 'subscriberId + businessName مطلوبان' });
    }
    registerSubscriber(subscriberId, profile);
    res.json({ ok: true, message: `✅ تم تسجيل ${profile.businessName}` });
  });

  // جلب ملف مشترك
  app.get('/api/subscriber/:id', _requireApiSecret, (req, res) => {
    const profile = getSubscriberProfile(req.params.id);
    if(!profile) return res.status(404).json({ ok: false, error: 'مشترك غير موجود' });
    res.json({ ok: true, profile });
  });

  // قائمة كل المشتركين (للأدمن فقط)
  app.get('/api/subscribers', _requireApiSecret, (req, res) => {
    const list = Array.from(subscriberProfiles.entries()).map(([id, p]) => ({
      id,
      name: p.businessName,
      type: p.businessType,
      plan: p.plan
    }));
    res.json({ ok: true, count: list.length, subscribers: list });
  });
}

// ══════════════════════════════════════════════════════════════
//  بيانات تجريبية (للاختبار قبل السيرفر)
//  إصلاح: كانت تُستدعى دون شرط عند كل إقلاع سيرفر — لو أُعيد تشغيل الخادم
//  بعد أن سجّل الأدمن مشتركاً حقيقياً بنفس المعرّف (نادر لكن ممكن)، كانت
//  البيانات التجريبية ستكتب فوقه. الآن: تُضاف فقط إن لم يوجد المعرّف أصلاً.
// ══════════════════════════════════════════════════════════════
function _registerDemoIfMissing(id, profile) {
  if (subscriberProfiles.has(id)) return;
  registerSubscriber(id, profile);
}

function loadDemoSubscribers() {
  // محامٍ موريتاني — باقة ماسية
  _registerDemoIfMissing('+222111001', {
    plan        : 'diamond',
    businessType: 'law_office',
    businessName: 'مكتب الأستاذ محمد للمحاماة',
    ownerName   : 'محمد ولد إبراهيم',
    ownerTitle  : 'الأستاذ المحامي',
    location    : 'نواكشوط — حي التوجنين',
    specialties : ['قانون الأسرة', 'العقارات', 'الشركات التجارية'],
    consultationFee: '5000 MRU للجلسة الأولى',
    workHours   : { start: 8, end: 17 },
    tone        : 'رسمي ومطمئن',
    customInstructions: 'في حالات الطوارئ القانونية أعطِ رقم الهاتف الشخصي: +222333444'
  });

  // محل ملابس — باقة ماسية
  _registerDemoIfMissing('+222111002', {
    plan        : 'diamond',
    businessType: 'store',
    businessName: 'متجر رغد للأزياء',
    ownerName   : 'فاطمة ولد سيدي',
    location    : 'نواكشوط — السوق الحضاري',
    products    : ['ملابس نسائية', 'عبايات', 'أزياء تقليدية', 'إكسسوارات'],
    delivery    : 'متاح خلال نواكشوط — 24 ساعة',
    paymentMethods: ['نقد', 'بنكيلي', 'مصرف موريتانيا الإسلامي'],
    workHours   : { start: 9, end: 21 },
    tone        : 'ودود وأنيق'
  });

  // عيادة طبية — باقة ماسية
  _registerDemoIfMissing('+222111003', {
    plan        : 'diamond',
    businessType: 'medical',
    businessName: 'عيادة النور الطبية',
    ownerName   : 'د. أحمد ولد محمد',
    location    : 'نواكشوط — كيبه',
    specialties : ['طب الأطفال', 'طب عام'],
    waitTime    : '20-40 دقيقة',
    workHours   : { start: 8, end: 20 },
    tone        : 'هادئ ومطمئن',
    customInstructions: 'للحالات الطارئة: وجّه للمستعجلات في المستشفى الوطني'
  });

  console.log('🎭 تم تحميل 3 مشتركين تجريبيين (محامٍ + متجر + عيادة)');
}

// ── التصدير ─────────────────────────────────────────────────
module.exports = {
  registerSubscriber,
  getSubscriberProfile,
  getAllSubscriberProfiles,
  askSubscriberAgent,
  setupSubscriberAPI,
  loadDemoSubscribers
};

// ── اختبار مباشر ────────────────────────────────────────────
if(require.main === module) {
  require('dotenv').config();
  loadDemoSubscribers();

  console.log('\n🧪 اختبار الشخصيات المتعددة...\n');

  const tests = [
    {
      subscriberId: '+222111001',
      channel: 'whatsapp',
      message: 'السلام عليكم، عندي قضية طلاق أريد استشارة',
      context: { name: 'أمينة' }
    },
    {
      subscriberId: '+222111002',
      channel: 'whatsapp',
      message: 'هل عندكم عبايات للعيد؟ وكم أسعارها؟',
      context: { name: 'خديجة' }
    },
    {
      subscriberId: '+222111003',
      channel: 'call',
      message: 'أريد موعد لطفلي عنده حمى',
      context: { name: 'والد مريض' }
    }
  ];

  async function runTests() {
    for(const test of tests) {
      const profile = require('./rizq_subscriber_agent').getSubscriberProfile(test.subscriberId);
      console.log(`\n📍 اختبار: ${profile?.businessName || test.subscriberId}`);
      console.log(`   السؤال: ${test.message}`);

      try {
        const result = await askSubscriberAgent(test);
        console.log(`   الرد: ${result.text}`);
      } catch(e) {
        console.error(`   ❌ خطأ: ${e.message}`);
      }
    }
  }

  runTests();
}
