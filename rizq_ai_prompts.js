/**
 * rizq_ai_prompts.js — محرك الـ Prompts الديناميكي
 * RIZQ Platform — ADMINIA SARL
 * -------------------------------------------------------
 * يبني system prompt مخصص لكل محل/مكتب/معرض تلقائياً
 * من بيانات صاحب النشاط المحفوظة في قاعدة البيانات
 * -------------------------------------------------------
 * الاستخدام:
 *   const prompt = RizqPrompts.build(businessProfile);
 *   → يُرسل هذا الـ prompt مع كل محادثة لـ Claude API
 */

'use strict';

// ═══════════════════════════════════════════════════════
// 1. قوالب شخصية الوكيل حسب نوع النشاط التجاري
// ═══════════════════════════════════════════════════════

const AGENT_PERSONAS = {

  women_store: {
    ar: 'مساعد ذكي متخصص في المحلات النسائية',
    personality: 'ودود، محترم، يتفهم احتياجات المرأة، يقترح بدائل عند عدم توفر المنتج',
    tone: 'دافئ ومؤدب',
    expertise: ['الملابس النسائية', 'العبايات والحجابات', 'العطور', 'المستحضرات', 'الإكسسوارات']
  },

  car_showroom: {
    ar: 'مساعد ذكي متخصص في معارض السيارات',
    personality: 'احترافي، دقيق في المعلومات التقنية، يحجز مواعيد المعاينة',
    tone: 'رسمي ومهني',
    expertise: ['مواصفات السيارات', 'الأسعار والتفاوض', 'التمويل', 'الضمان', 'الصيانة']
  },

  virtual_office: {
    ar: 'مساعد ذكي للمكتب الافتراضي',
    personality: 'منظم، يشرح الخدمات بوضوح، يُنجز الطلبات بسرعة',
    tone: 'مهني ومنظم',
    expertise: ['خدمات التوثيق', 'الترجمة', 'العنوان التجاري', 'تلقي البريد', 'الاجتماعات']
  },

  restaurant: {
    ar: 'مساعد ذكي للمطعم',
    personality: 'مرحب، يصف الأطباق بشهية، يأخذ الطلبات ويحجز الطاولات',
    tone: 'ودود ومبهج',
    expertise: ['قائمة الطعام', 'المكونات والحساسيات', 'التوصيل', 'الحجز', 'العروض']
  },

  clinic: {
    ar: 'مساعد ذكي للعيادة الطبية',
    personality: 'هادئ، محترم، يُدير المواعيد ويجيب على الأسئلة العامة فقط (لا تشخيص طبي)',
    tone: 'مطمئن ومهني',
    expertise: ['حجز المواعيد', 'التخصصات المتاحة', 'ساعات العمل', 'التأمين', 'الموقع']
  },

  general_store: {
    ar: 'مساعد ذكي للمحل التجاري',
    personality: 'مفيد، يجيب على الأسئلة بدقة، يوجه الزبون للمنتج المناسب',
    tone: 'ودود ومباشر',
    expertise: ['المنتجات والأسعار', 'التوفر', 'التوصيل', 'سياسة الإرجاع']
  },

  insurance_office: {
    ar: 'مساعد ذكي لوكالة التأمين',
    personality: 'موثوق، يشرح التغطيات بوضوح، يُحسب عروض الأسعار',
    tone: 'رسمي وموثوق',
    expertise: ['تأمين السيارات', 'الشاحنات', 'الآلات الثقيلة', 'الوثائق المطلوبة', 'التعويضات']
  },

  law_office: {
    ar: 'مساعد قانوني ذكي',
    personality: 'محترف، دقيق، يُدير المواعيد ويجيب على الاستفسارات القانونية العامة (لا استشارة قانونية ملزمة)',
    tone: 'رسمي ومهني',
    expertise: ['حجز المواعيد', 'أنواع القضايا المقبولة', 'الوثائق المطلوبة', 'الأتعاب التقديرية', 'آجال التقاضي']
  },

  hotel: {
    ar: 'موظف استقبال ذكي للفندق',
    personality: 'مضياف، دافئ، سريع الاستجابة، يُتمم الحجوزات ويقترح الخدمات',
    tone: 'ودود وراقٍ',
    expertise: ['حجز الغرف', 'الأسعار والعروض', 'خدمات الفندق', 'وصول/مغادرة', 'الاستفسارات السياحية']
  },

  accounting_office: {
    ar: 'مساعد ذكي لمكتب المحاسبة',
    personality: 'دقيق، موثوق، يشرح الخدمات المحاسبية ويُدير المواعيد',
    tone: 'رسمي ودقيق',
    expertise: ['إعداد الحسابات', 'الإقرارات الضريبية', 'التدقيق', 'الرواتب', 'السجل التجاري']
  },

  real_estate: {
    ar: 'مساعد ذكي للعقارات',
    personality: 'خبير، يصف العقارات بدقة، يُنجز الجولات الافتراضية والمواعيد',
    tone: 'احترافي وودود',
    expertise: ['عقارات للبيع', 'عقارات للإيجار', 'تقدير القيمة', 'المعاينة', 'التوثيق']
  },

  pharmacy: {
    ar: 'مساعد ذكي للصيدلية',
    personality: 'هادئ، يُجيب على الاستفسارات الدوائية العامة فقط، يُحيل للصيدلاني عند الحاجة',
    tone: 'مطمئن ومهني',
    expertise: ['توفر الأدوية', 'ساعات العمل', 'التوصيل', 'الأسعار التقديرية']
  },

  company: {
    ar: 'سكرتير ذكي للشركة / المؤسسة',
    personality: 'منظم، رسمي، يوجّه الطلبات ويحجز مواعيد مع الإدارة',
    tone: 'رسمي ومهني',
    expertise: ['توجيه الاستفسارات', 'حجز المواعيد', 'الخدمات المؤسسية', 'التواصل مع الإدارة']
  },

  academy: {
    ar: 'مساعد ذكي للأكاديمية / مركز التدريب',
    personality: 'محفّز، يشرح البرامج والدورات، يسجّل الاهتمام ويحجز المقاعد',
    tone: 'ودود ومحفّز',
    expertise: ['الدورات والبرامج', 'الأسعار والمنح', 'جدول الحصص', 'التسجيل', 'الشهادات']
  },

  freelance: {
    ar: 'مساعد ذكي للمستقل / مقدّم الخدمات',
    personality: 'مرن، يجمع متطلبات المشاريع ويوعد بمتابعة من صاحب النشاط',
    tone: 'ودود ومهني',
    expertise: ['الخدمات المتاحة', 'العروض', 'المواعيد', 'نطاق العمل']
  },

  default: {
    ar: 'مساعد ذكي لخدمة العملاء',
    personality: 'مفيد ومؤدب، يجيب على الأسئلة ويوجه الزبون',
    tone: 'ودود',
    expertise: ['معلومات عامة', 'خدمة العملاء']
  }
};

// ═══════════════════════════════════════════════════════
// 2. كشف نوع النشاط تلقائياً من نص النشاط
// ═══════════════════════════════════════════════════════

function detectPersona(activityText) {
  var t = (activityText || '').toLowerCase()
    .replace(/[ً-ْ]/g,'')           // حذف التشكيل
    .replace(/[أإآ]/g,'ا') // توحيد الألف
    .replace(/ة/g,'ه');              // ة → ه

  // ── مكتب محاماة ──
  if (/محام|محاماه|قانون|قضايا|محكمه|تقاضي/.test(t))   return 'law_office';
  // ── فندق / ضيافة ──
  if (/فندق|ضيافه|نزل|اقامه|حجوزات غرف|استقبال فندق/.test(t)) return 'hotel';
  // ── عيادة / صحة ──
  if (/عياده|طبيب|دكتور|مستشفى|صحه|طب/.test(t))         return 'clinic';
  // ── صيدلية ──
  if (/صيدليه|صيدلاني|دواء|ادويه/.test(t))               return 'pharmacy';
  // ── محاسبة ──
  if (/محاسبه|محاسب|ضريبه|تدقيق|رواتب|حسابات/.test(t))  return 'accounting_office';
  // ── عقارات ──
  if (/عقار|شقق|بيع وايجار|ايجار وبيع|عمارات/.test(t))  return 'real_estate';
  // ── سيارات ──
  if (/سيارات|معرض سيارات|بيع سيارات|شاحنات/.test(t))   return 'car_showroom';
  // ── مطعم ──
  if (/مطعم|مطبخ|وجبات|اكل|طعام|كافيه|كافيتيريا/.test(t)) return 'restaurant';
  // ── محل نسائي ──
  if (/عبايات|ملابس نسائيه|حجاب|ازياء نسائيه/.test(t))  return 'women_store';
  // ── تأمين ──
  if (/تامين|وكاله تامين/.test(t))                       return 'insurance_office';
  // ── مكتب خدمات عامة (افتراضي) ──
  if (/مكتب|خدمات|ترجمه|توثيق|استشاره/.test(t))         return 'virtual_office';
  // ── أكاديمية / تدريب ──
  if (/اكاديم|أكاديم|تدريب|دورات|تعليم|مدرسه|مدرسة|formation|cours/.test(t)) return 'academy';
  // ── شركة / مؤسسة ──
  if (/شركه|شركة|مؤسسه|مؤسسة|corp|entreprise|societe/.test(t)) return 'company';
  // ── مستقل ──
  if (/مستقل|freelance|خدمات حره|prestataire/.test(t)) return 'freelance';
  // ── محل عام ──
  if (/محل|متجر|بقاله|سوبرماركت|store|boutique/.test(t)) return 'general_store';
  return 'default';
}

/** توحيد businessType القديم مع مفاتيح الشخصيات */
var LEGACY_TYPE_MAP = {
  medical: 'clinic',
  store: 'general_store',
  corp: 'company',
  office: 'virtual_office',
};

/**
 * يحدّد personaKey من profile — لا يُرجع corp أبداً كافتراضي
 * @param {object} profile
 * @returns {string}
 */
function resolveBusinessType(profile) {
  profile = profile || {};
  var raw = String(profile.businessType || profile.personaKey || '').trim();
  if (raw && LEGACY_TYPE_MAP[raw]) raw = LEGACY_TYPE_MAP[raw];
  if (raw && AGENT_PERSONAS[raw]) return raw;
  var activityText = [
    profile.activity,
    profile.businessType,
    profile.description,
    profile.businessName,
    profile.persona && profile.persona.key,
  ].filter(Boolean).join(' ');
  var detected = detectPersona(activityText);
  return AGENT_PERSONAS[detected] ? detected : 'default';
}

function getPersonaDef(personaKey) {
  return AGENT_PERSONAS[personaKey] || AGENT_PERSONAS.default;
}

// ═══════════════════════════════════════════════════════
// 3. قواعد سلوك ثابتة لجميع الوكلاء
// ═══════════════════════════════════════════════════════

const COMMERCIAL_LOYALTY_RULES = `
## 🛡️ الولاء التجاري والحياد — إلزامي (Commercial Loyalty — NON-NEGOTIABLE)
1. **الحصرية التامة:** أنت تمثّل "${'{BUSINESS_NAME}'}" فقط — ممنوع ذكر أو ترويج أو ترشيح أي منافس أو شركة أو فندق أو عيادة أو مكتب آخر.
2. **أسئلة المنافسين:** إذا سُئلت عن منافس، أجب بدبلوماسية (مثلاً: «نحن نركّز على تقديم أفضل تجربة لدينا») ثم أعد المحادثة فوراً لمزايا وخدمات "${'{BUSINESS_NAME}'}".
3. **نبرة القطاع:** التزم بنبرة "${'{PERSONA_TONE}'}" المناسبة لقطاع "${'{PERSONA_LABEL}'}" — مطمئنة للصحة، راقية للضيافة، رسمية للقانون والمحاسبة، ودودة للتجزئة.
4. **حدود التخصص:** لا تقدّم استشارات طبية/قانونية/مالية ملزمة — حوّلها إلى **موعد رسمي** مع المختص في المنشأة.
5. **لا معلومات عن منشآت أخرى:** لا تشارك بيانات أو أسعار أو توصيات لأي كيان غير "${'{BUSINESS_NAME}'}".
`;

const CORE_RULES = `
## قواعد السلوك الأساسية (لا تخرج عنها أبداً):
1. رد دائماً بنفس لغة المستخدم (عربية، حسانية، فرنسية، إنجليزية، إسبانية) — كشف تلقائي من رسالته، لا من لغة الصفحة فقط
2. افهم الطلبات المختصرة والعامية في سياق النشاط (كم، prix، price، شنو، كيفاش...)
3. لا تشارك معلومات خاصة بمنشآت أخرى
4. إذا لم تعرف الإجابة قل: "سأتحقق وأعود إليك" ثم أعطِ رقم التواصل
5. لا تعطِ وعوداً لا تستطيع الوفاء بها
6. عند الطلب أو الشراء، اجمع: الاسم + رقم الهاتف + التفاصيل
7. إذا كان الزبون غاضباً: أعتذر أولاً ثم حل المشكلة
8. لا تُفصح عن أنك AI إلا إذا سُئلت مباشرة — ولا تذكر أبداً أسماء نماذج أو مزوّدين تقنيين (Sonnet, Claude, Anthropic…)؛ استخدم «النائب الذكي» فقط
9. الردود مختصرة وواضحة — لا إطالة غير ضرورية
10. عند انتهاء المحادثة: "شكراً لتواصلك مع [اسم المنشأة] 🌟"
`;

function buildCommercialLoyaltyBlock(profile) {
  var biz = (profile && profile.businessName) ? String(profile.businessName) : 'هذه المنشأة';
  var personaKey = resolveBusinessType(profile);
  var persona = getPersonaDef(personaKey);
  return COMMERCIAL_LOYALTY_RULES
    .replace(/\{BUSINESS_NAME\}/g, biz)
    .replace('{PERSONA_TONE}', persona.tone || 'مهنية')
    .replace('{PERSONA_LABEL}', persona.ar || 'خدمة العملاء');
}

function buildDynamicKnowledgeBlock(profile, formatFn) {
  if (!profile || !profile.dynamicKnowledge) return '';
  if (typeof formatFn === 'function') return formatFn(profile.dynamicKnowledge);
  var dk = profile.dynamicKnowledge;
  if (typeof dk === 'string') return '\n## بيانات محدّثة\n' + dk.slice(0, 48000) + '\n';
  if (dk.text) {
    return '\n## 📊 بيانات تشغيلية محدّثة\n' + String(dk.text).slice(0, 48000) + '\n';
  }
  return '';
}

function buildCustomInstructionsBlock(profile) {
  var parts = [];
  if (profile.customInstructions) parts.push(String(profile.customInstructions));
  if (profile.specialInstructions) parts.push(String(profile.specialInstructions));
  if (!parts.length) return '';
  return '\n## 📌 تعليمات خاصة من صاحب المنشأة:\n' + parts.join('\n\n') + '\n';
}

// ═══════════════════════════════════════════════════════
// 3. بناء معلومات المنتجات والخدمات
// ═══════════════════════════════════════════════════════

function buildProductsSection(products) {
  if (!products || products.length === 0) return '';
  return `
## المنتجات/الخدمات المتاحة:
${products.map(p => `- ${p.name}: ${p.price} MRU${p.available === false ? ' (غير متوفر حالياً)' : ''}${p.desc ? ` — ${p.desc}` : ''}`).join('\n')}
`;
}

function buildFAQSection(faqs) {
  if (!faqs || faqs.length === 0) return '';
  return `
## أسئلة شائعة وإجاباتها:
${faqs.map(f => `س: ${f.q}\nج: ${f.a}`).join('\n\n')}
`;
}

function buildPoliciesSection(policies) {
  if (!policies) return '';
  const lines = [];
  if (policies.return)    lines.push(`- سياسة الإرجاع: ${policies.return}`);
  if (policies.delivery)  lines.push(`- التوصيل: ${policies.delivery}`);
  if (policies.payment)   lines.push(`- طرق الدفع: ${policies.payment}`);
  if (policies.warranty)  lines.push(`- الضمان: ${policies.warranty}`);
  if (lines.length === 0) return '';
  return `\n## السياسات:\n${lines.join('\n')}\n`;
}

function buildChannelsSection(channels) {
  if (!channels) return '';
  const lines = [];
  if (channels.phone)     lines.push(`- هاتف: ${channels.phone}`);
  if (channels.whatsapp)  lines.push(`- واتساب: ${channels.whatsapp}`);
  if (channels.email)     lines.push(`- إيميل: ${channels.email}`);
  if (channels.location)  lines.push(`- الموقع: ${channels.location}`);
  if (lines.length === 0) return '';
  return `\n## قنوات التواصل:\n${lines.join('\n')}\n`;
}

// ═══════════════════════════════════════════════════════
// 4. الدالة الرئيسية — بناء الـ System Prompt الكامل
// ═══════════════════════════════════════════════════════

function buildSystemPrompt(profile, opts) {
  opts = opts || {};
  profile = profile || {};
  var personaKey = resolveBusinessType(profile);
  var persona = getPersonaDef(personaKey);
  profile.businessType = personaKey;

  var agentTitle = (profile.persona && profile.persona.agentTitle)
    || profile.agentTitle
    || profile.agentName
    || ('مساعد ' + (profile.businessName || ''));

  var header = '# هويتك\n' +
    'أنت "' + agentTitle + '"، ' + persona.ar + ' يعمل لدى "' + (profile.businessName || 'المنشأة') + '".\n' +
    'نبرتك: ' + persona.tone + '\n' +
    'شخصيتك: ' + persona.personality + '\n' +
    'خبراتك: ' + (persona.expertise || []).join('، ') + '\n';

  var businessInfo = '\n# معلومات النشاط التجاري\n' +
    '- الاسم: ' + (profile.businessName || '') + '\n' +
    '- النوع: ' + persona.ar + ' (' + personaKey + ')\n' +
    '- الولاية/المنطقة: ' + (profile.wilaya || profile.city || 'موريتانيا') + '\n' +
    '- الحي: ' + (profile.neighborhood || profile.address || '') + '\n' +
    '- ساعات العمل: ' + (profile.workingHours || 'يومياً 8 صباحاً — 10 مساءً') + '\n' +
    '- رسالة الترحيب: "' + (profile.greeting || 'أهلاً وسهلاً! كيف أقدر أساعدك؟') + '"\n';

  if (opts.channelOnly && opts.channelOnly !== 'widget') {
    header += '\n- تمثّل "' + (profile.businessName || 'المنشأة') + '" حصرياً — لا تذكر "رزق" أو أي منصة أخرى في محادثاتك.\n';
  }

  var products = buildProductsSection(profile.products || profile.services);
  var faqs = buildFAQSection(profile.faqs);
  var policies = buildPoliciesSection(profile.policies);
  var channels = buildChannelsSection(profile.channels);
  var dynamicBlock = buildDynamicKnowledgeBlock(profile, opts.formatDynamicKnowledge);
  var customBlock = buildCustomInstructionsBlock(profile);
  var loyalty = buildCommercialLoyaltyBlock(profile);

  return [header, businessInfo, products, faqs, policies, channels, dynamicBlock, customBlock, loyalty, CORE_RULES]
    .filter(Boolean).join('\n');
}

/**
 * System Prompt موحّد لمسارات الصوت/واتساب (بدون ذكر رزق)
 */
function buildChannelSystemPrompt(profile, opts) {
  opts = Object.assign({ channelOnly: true }, opts || {});
  var base = buildSystemPrompt(profile, opts);
  var workStart = (profile.workHours && profile.workHours.start) || 8;
  var workEnd = (profile.workHours && profile.workHours.end) || 18;
  var hour = new Date().getHours();
  var isWorkHours = hour >= workStart && hour < workEnd;
  var channelSuffix = {
    call: '\n\n[القناة: مكالمة] جمل قصيرة جداً (≤15 ثانية). بدون قوائم.',
    whatsapp: '\n\n[القناة: واتساب] رسالة قصيرة ومباشرة. emoji باعتدال.',
    email: '\n\n[القناة: بريد] رد رسمي كامل مع تحية وختام.',
  };
  var ch = opts.channel || '';
  return base +
    '\n\n## الحالة التشغيلية\n' +
    '- الحالة الآن: ' + (isWorkHours ? 'داخل أوقات الدوام' : 'خارج الدوام — أنت تنوب عن الفريق') + '\n' +
    '- لا تتعهد بموعد محدد بدون تأكيد بشري\n' +
    (channelSuffix[ch] || '');
}

// ═══════════════════════════════════════════════════════
// 5. نماذج بيانات تجريبية (تُستبدل ببيانات قاعدة البيانات)
// ═══════════════════════════════════════════════════════

const DEMO_PROFILES = {};

// ═══════════════════════════════════════════════════════
// 6. ربط البيانات الحية من localStorage
// ═══════════════════════════════════════════════════════

function loadBusinessProfile(businessId) {
  try {
    var stored = localStorage.getItem('rizq_business_' + businessId);
    if (stored) return JSON.parse(stored);
  } catch(e) {}
  return DEMO_PROFILES[businessId] || null;
}

function saveBusinessProfile(businessId, profile) {
  try {
    localStorage.setItem('rizq_business_' + businessId, JSON.stringify(profile));
    return true;
  } catch(e) { return false; }
}

// ═══════════════════════════════════════════════════════
// 7. API الرئيسي للاستخدام الخارجي
// ═══════════════════════════════════════════════════════

var RizqPrompts = {
  build: function(profile, opts) { return buildSystemPrompt(profile, opts); },
  buildChannel: function(profile, opts) { return buildChannelSystemPrompt(profile, opts); },
  buildById: function(businessId) {
    var profile = loadBusinessProfile(businessId);
    if (!profile) profile = { businessName: 'Rizq', businessType: 'default', agentName: 'مساعد رزق' };
    return buildSystemPrompt(profile);
  },
  buildCommercialLoyaltyBlock: buildCommercialLoyaltyBlock,
  buildDynamicKnowledgeBlock: buildDynamicKnowledgeBlock,
  resolveBusinessType: resolveBusinessType,
  getPersonaDef: getPersonaDef,
  getBusinessTypes: function() {
    return Object.keys(AGENT_PERSONAS).filter(function(k){ return k !== 'default'; }).map(function(k){
      return { id: k, label: AGENT_PERSONAS[k].ar };
    });
  },
  getEmptyProfile: function(businessType) {
    return {
      businessName: '', agentName: '', businessType: businessType || 'general_store',
      wilaya: '', neighborhood: '',
      workingHours: 'يومياً 8ص - 10م',
      greeting: 'أهلاً وسهلاً! كيف أقدر أساعدك؟',
      products: [], faqs: [],
      policies: { return: '', delivery: '', payment: '', warranty: '' },
      channels: { phone: '', whatsapp: '', email: '', location: '' },
      specialInstructions: '',
      customInstructions: '',
      dynamicKnowledge: null,
    };
  },
  detectPersona: detectPersona,
  personas: AGENT_PERSONAS,
  LEGACY_TYPE_MAP: LEGACY_TYPE_MAP,
  demos: DEMO_PROFILES,
  load: loadBusinessProfile,
  save: saveBusinessProfile
};

// ═══════════════════════════════════════════════════════
// 8. تصدير
// ═══════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RizqPrompts;
  module.exports.buildSystemPrompt = buildSystemPrompt;
  module.exports.buildChannelSystemPrompt = buildChannelSystemPrompt;
  module.exports.resolveBusinessType = resolveBusinessType;
  module.exports.buildCommercialLoyaltyBlock = buildCommercialLoyaltyBlock;
} else {
  window.RizqPrompts = RizqPrompts;
}
