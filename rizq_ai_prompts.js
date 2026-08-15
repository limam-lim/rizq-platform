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
  // ── محل عام ──
  if (/محل|متجر|بقاله|سوبرماركت/.test(t))               return 'general_store';
  return 'default';
}

// ═══════════════════════════════════════════════════════
// 3. قواعد سلوك ثابتة لجميع الوكلاء
// ═══════════════════════════════════════════════════════

const CORE_RULES = `
## قواعد السلوك الأساسية (لا تخرج عنها أبداً):
1. رد دائماً بنفس لغة المستخدم (عربية، حسانية، فرنسية، إنجليزية، إسبانية) — كشف تلقائي من رسالته، لا من لغة الصفحة فقط
2. افهم الطلبات المختصرة والعامية في سياق رزق (كم، prix، price، شنو، كيفاش...)
3. لا تشارك معلومات خاصة بمحلات أخرى
4. إذا لم تعرف الإجابة قل: "سأتحقق وأعود إليك" ثم أعطِ رقم التواصل
5. لا تعطِ وعوداً لا تستطيع الوفاء بها
6. عند الطلب أو الشراء، اجمع: الاسم + رقم الهاتف + التفاصيل
7. إذا كان الزبون غاضباً: أعتذر أولاً ثم حل المشكلة
8. لا تُفصح عن أنك AI إلا إذا سُئلت مباشرة
9. الردود مختصرة وواضحة — لا إطالة غير ضرورية
10. عند انتهاء المحادثة: "شكراً لتواصلك مع [اسم المحل] 🌟"
`;

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

function buildSystemPrompt(profile) {
  const persona = AGENT_PERSONAS[profile.businessType] || AGENT_PERSONAS.default;

  const header = `# هويتك
أنت "${profile.agentName || 'مساعد ' + profile.businessName}"، ${persona.ar} يعمل لدى "${profile.businessName}".
نبرتك: ${persona.tone}
شخصيتك: ${persona.personality}
`;

  const businessInfo = `
# معلومات النشاط التجاري
- الاسم: ${profile.businessName}
- النوع: ${persona.ar}
- الولاية/المنطقة: ${profile.wilaya || 'نواكشوط'}
- الحي: ${profile.neighborhood || ''}
- ساعات العمل: ${profile.workingHours || 'يومياً 8 صباحاً — 10 مساءً'}
- رسالة الترحيب: "${profile.greeting || 'أهلاً وسهلاً! كيف أقدر أساعدك؟'}"
`;

  const products   = buildProductsSection(profile.products);
  const faqs       = buildFAQSection(profile.faqs);
  const policies   = buildPoliciesSection(profile.policies);
  const channels   = buildChannelsSection(profile.channels);

  const specialInstructions = profile.specialInstructions
    ? `\n## تعليمات خاصة من صاحب النشاط:\n${profile.specialInstructions}\n`
    : '';

  return [header, businessInfo, products, faqs, policies, channels, specialInstructions, CORE_RULES]
    .filter(Boolean).join('\n');
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
  build: function(profile) { return buildSystemPrompt(profile); },
  buildById: function(businessId) {
    var profile = loadBusinessProfile(businessId);
    if (!profile) profile = { businessName: 'Rizq', businessType: 'default', agentName: 'مساعد رزق' };
    return buildSystemPrompt(profile);
  },
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
      specialInstructions: ''
    };
  },
  detectPersona: detectPersona,
  personas: AGENT_PERSONAS,
  demos: DEMO_PROFILES,
  load: loadBusinessProfile,
  save: saveBusinessProfile
};

// ═══════════════════════════════════════════════════════
// 8. تصدير
// ═══════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RizqPrompts;
} else {
  window.RizqPrompts = RizqPrompts;
}
