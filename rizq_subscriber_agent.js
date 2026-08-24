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
const RizqPrompts = require('./rizq_ai_prompts');
const { formatDynamicKnowledgeForPrompt } = require('./rizq-backend/services/dynamicKnowledge');

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
  _loadFromDisk();
  const existing = subscriberProfiles.get(subscriberId) || null;
  subscriberProfiles.set(subscriberId, Object.assign({}, existing || {}, profile, {
    registeredAt: (existing && existing.registeredAt) || new Date().toISOString(),
    dynamicKnowledge: profile.dynamicKnowledge !== undefined
      ? profile.dynamicKnowledge
      : (existing && existing.dynamicKnowledge) || null,
  }));
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

/** البحث عن مشترك بمعرّف الحساب — للعزل ورفع الملفات من الداشبورد */
function getSubscriberProfileByAccountId(accountId) {
  if (!accountId) return null;
  _loadFromDisk();
  for (const [subscriberId, profile] of subscriberProfiles.entries()) {
    if (profile && profile.accountId === accountId) {
      return { subscriberId, profile };
    }
  }
  return null;
}

/**
 * تحديث dynamicKnowledge لمشترك محدد — معزول بـ subscriberId
 */
function updateDynamicKnowledge(subscriberId, dynamicKnowledge) {
  _loadFromDisk();
  const profile = subscriberProfiles.get(subscriberId);
  if (!profile) return false;
  subscriberProfiles.set(subscriberId, Object.assign({}, profile, {
    dynamicKnowledge,
    dynamicKnowledgeUpdatedAt: new Date().toISOString(),
  }));
  _persistToDisk();
  return true;
}

/**
 * ربط حساب داشبورد بملف مشترك (هاتف أو accountId) — يُستخدم عند رفع المعرفة
 */
function resolveSubscriberIdForAccount(acc) {
  if (!acc) return null;
  _loadFromDisk();
  const byAcc = getSubscriberProfileByAccountId(acc.id);
  if (byAcc) return byAcc.subscriberId;
  const phone = String(acc.phone || acc.whatsapp || '').replace(/\D/g, '');
  if (phone && subscriberProfiles.has(phone)) return phone;
  if (phone) return phone.slice(-12);
  return String(acc.id || '').slice(0, 40);
}

function upsertSubscriberKnowledgeFromAccount(acc, dynamicKnowledge) {
  return upsertSubscriberProfileFromAccount(acc, { dynamicKnowledge });
}

function upsertSubscriberInstructionsFromAccount(acc, customInstructions) {
  return upsertSubscriberProfileFromAccount(acc, {
    customInstructions: String(customInstructions || '').trim().slice(0, 4000),
  });
}

function upsertSubscriberProfileFromAccount(acc, patch) {
  const subscriberId = resolveSubscriberIdForAccount(acc);
  if (!subscriberId) return { ok: false, error: 'no_subscriber_id' };
  _loadFromDisk();
  const existing = subscriberProfiles.get(subscriberId) || {};
  const merged = Object.assign({}, existing, acc, patch || {});
  const personaKey = RizqPrompts.resolveBusinessType(Object.assign({}, merged, {
    businessName: acc.name || existing.businessName,
    activity: acc.activity || acc.desc || existing.activity,
    businessType: (patch && patch.businessType) || existing.businessType || acc.type,
  }));
  registerSubscriber(subscriberId, Object.assign({}, existing, {
    accountId: acc.id,
    businessName: acc.name || existing.businessName || 'المنشأة',
    businessType: personaKey,
    plan: 'diamond',
    tier: 'diamond',
    activity: acc.activity || acc.desc || existing.activity || '',
  }, patch || {}));
  return { ok: true, subscriberId };
}

// ══════════════════════════════════════════════════════════════
//  بناء System Prompt — محرك موحّد (rizq_ai_prompts.js)
// ══════════════════════════════════════════════════════════════
function buildSubscriberSystemPrompt(profile, channel) {
  const normalized = Object.assign({}, profile, {
    businessType: RizqPrompts.resolveBusinessType(profile),
    products: profile.products || (Array.isArray(profile.menu) ? profile.menu.map(function (m) {
      return typeof m === 'string' ? { name: m } : m;
    }) : undefined),
    workingHours: profile.workingHours || (
      profile.workHours
        ? ((profile.workHours.start || 8) + ':00 — ' + (profile.workHours.end || 18) + ':00')
        : undefined
    ),
    channels: profile.channels || {
      phone: profile.phone || '',
      whatsapp: profile.whatsapp || profile.phone || '',
      email: profile.email || '',
      location: profile.location || [profile.city, profile.address].filter(Boolean).join(' — '),
    },
  });
  return RizqPrompts.buildChannel(normalized, {
    channel: channel || '',
    formatDynamicKnowledge: formatDynamicKnowledgeForPrompt,
  });
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

  const {
    getAdvancedModel,
    isDiamondProfile,
    createCachedMessage,
  } = require('./rizq-backend/config/anthropic');

  // لو الباقة ليست ماسية → رفض الخدمة (الوكيل المتخصص للماسي فقط)
  if (!isDiamondProfile(profile)) {
    return {
      text   : 'خدمة الوكيل الذكي متاحة فقط لمشتركي الباقة الماسية.',
      channel: channel,
      model  : null
    };
  }

  if (profile.accountId) {
    try {
      const { isDiamondActive } = require('./rizq-backend/rizq_package_lifecycle_agent');
      if (!isDiamondActive(profile.accountId)) {
        return {
          text: 'انتهت باقتك الماسية أو لم يُؤكَّد الدفع بعد — جدّد الاشتراك لاستعادة الوكيل الذكي.',
          channel,
          model: null,
        };
      }
    } catch (e) { /* optional if lifecycle module unavailable */ }
  }

  // ── بناء System Prompt خاص بالمشترك ──────────────────────
  const systemPrompt = buildSubscriberSystemPrompt(profile, channel);

  const Anthropic = require('@anthropic-ai/sdk');
  const { assertQuotaAvailable, recordUsage, isQuotaBlocked } = require('./rizq_quota_guard_agent');

  if (isQuotaBlocked(subscriberId, profile.accountId, channel)) {
    return {
      text: 'انتهت حصة الباقة الماسية لهذا الشهر. اشترِ شحناً إضافياً من لوحة التحكم أو جدّد الباقة.',
      channel,
      model: null,
      quotaBlocked: true,
    };
  }

  try {
    assertQuotaAvailable({
      subscriberId,
      accountId: profile.accountId || '',
      channel,
      diamondTier: profile.diamondTier,
    });
  } catch (qBlock) {
    return {
      text: qBlock.message || 'انتهت حصة الباقة الماسية — اشترِ شحناً إضافياً.',
      channel,
      model: null,
      quotaBlocked: true,
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const MODEL = getAdvancedModel();

  const channelInstructions = {
    call    : '',
    whatsapp: '',
    email   : '',
  };

  const fullSystem = systemPrompt + (channelInstructions[channel] || '');

  const messages = [];
  if(context.history?.length) messages.push(...context.history);

  let userContent = message;
  if(context.name) userContent = `[من: ${context.name}]\n${message}`;

  messages.push({ role: 'user', content: userContent });

  const created = await createCachedMessage(client, {
    model     : MODEL,
    max_tokens: channel === 'call' ? 250 : 800,
    system    : fullSystem,
    messages  : messages
  });
  const response = created.response;

  const textBlock = response.content.find(b => b.type === 'text');
  const replyText = textBlock ? textBlock.text.trim() : 'شكراً لتواصلكم. سيُتواصل معكم قريباً.';

  console.log(`🎭 [${profile.businessName}] رد على ${context.sender || 'مجهول'}: ${replyText.substring(0,60)}...`);

  let quota = null;
  try {
    quota = await recordUsage({
      subscriberId,
      accountId: profile.accountId || '',
      businessName: profile.businessName,
      phone: subscriberId,
      channel,
      model: created.model,
      usage: response.usage,
      replyText,
    });
  } catch (qErr) {
    console.warn('[quota-guard] record failed:', qErr && qErr.message);
  }

  return {
    text      : replyText,
    model     : created.model,
    fallback  : false,
    quotaBlocked: false,
    quotaPct  : quota ? quota.pct : null,
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

function loadDemoSubscribers() { /* mock subscribers removed — register real accounts via API */ }

// ── التصدير ─────────────────────────────────────────────────
module.exports = {
  registerSubscriber,
  getSubscriberProfile,
  getSubscriberProfileByAccountId,
  getAllSubscriberProfiles,
  updateDynamicKnowledge,
  resolveSubscriberIdForAccount,
  upsertSubscriberKnowledgeFromAccount,
  upsertSubscriberInstructionsFromAccount,
  upsertSubscriberProfileFromAccount,
  buildSubscriberSystemPrompt,
  askSubscriberAgent,
  setupSubscriberAPI,
  loadDemoSubscribers
};

// CLI tests removed — register real subscribers via API
