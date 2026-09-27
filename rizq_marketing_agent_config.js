/**
 * rizq_marketing_agent_config.js
 * ═══════════════════════════════════════════════════════════════
 * إعدادات مدير تسويق رزق — صوت العلامة، أنواع الحملات، القنوات،
 * ومعايير الجودة الإبداعية. يُستورد من الخادم (والواجهة للقراءة فقط).
 *
 * لا يضمّ أسراراً — توكنات فيسبوك وغيرها في .env الخادم فقط.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

/** هوية المنصة التسويقية */
const BRAND = {
  nameAr: 'رزق',
  nameFr: 'Rizq',
  legalName: 'Rizq-ADMINIA SARL',
  taglineAr: 'منصتك الرقمية للأعمال في موريتانيا',
  taglineFr: 'Votre plateforme digitale pour le commerce en Mauritanie',
  market: 'Mauritania',
  defaultLang: 'ar',
  supportedLangs: ['ar', 'fr', 'en'],
  siteUrl: 'https://rizq.mr',
  registerUrl: 'https://rizq.mr/rizq_register.html',
  tone: [
    'احترافي وودود — بلا مبالغة ولا وعود كاذبة',
    'محلي موريتاني — يحترم الحسانية والعربية الفصحى والفرنسية',
    'يركّز على فائدة التاجر والزبون لا على الضجيج',
    'واضح ومباشر — جملة افتتاح قوية ثم فائدة ثم دعوة لإجراء',
  ],
  mustMention: ['رزق', 'منصة'],
  forbidden: [
    'ضمان أرباح',
    'ثراء سريع',
    'بدون جهد',
    '100% مجاني للأبد',
    'أفضل من الجميع',
    'spam',
    'انقر هنا فوراً!!!',
  ],
  hashtags: {
    ar: ['#رزق', '#موريتانيا', '#أعمالي', '#تجارة'],
    fr: ['#Rizq', '#Mauritanie', '#Business', '#Digital'],
    en: ['#Rizq', '#Mauritania', '#Business', '#Digital'],
  },
};

/**
 * أنواع الحملات — «لكل شيء» تسويقياً داخل المنصة
 * key → وصف موجّه للمولّد + قنوات مقترحة
 */
const CAMPAIGN_TYPES = {
  platform_awareness: {
    labelAr: 'توعية بالمنصة',
    labelFr: 'Notoriété plateforme',
    goal: 'تعريف الجمهور برزق وما تقدّمه',
    channels: ['facebook', 'instagram', 'telegram'],
  },
  merchant_acquisition: {
    labelAr: 'جذب التجار والمتاجر',
    labelFr: 'Acquisition marchands',
    goal: 'حثّ أصحاب المحلات/المكاتب/الشركات على التسجيل',
    channels: ['facebook', 'whatsapp', 'sms'],
  },
  buyer_acquisition: {
    labelAr: 'جذب المشترين',
    labelFr: 'Acquisition acheteurs',
    goal: 'حثّ الزوار على التصفح والشراء عبر رزق',
    channels: ['facebook', 'instagram', 'site_announcement'],
  },
  feature_highlight: {
    labelAr: 'إبراز ميزة',
    labelFr: 'Mise en avant fonctionnalité',
    goal: 'شرح ميزة (مناقصات، ماسية، ويدجت، فيديو إعلاني…)',
    channels: ['facebook', 'telegram', 'email'],
  },
  package_promo: {
    labelAr: 'ترويج باقة',
    labelFr: 'Promo forfait',
    goal: 'دفع الاشتراك في باقة معيّنة دون وعود مضلّلة',
    channels: ['facebook', 'whatsapp', 'sms', 'email'],
  },
  seasonal: {
    labelAr: 'موسمي / مناسبة',
    labelFr: 'Saisonnier / événement',
    goal: 'ربط رزق بمناسبة محلية أو موسم تجاري',
    channels: ['facebook', 'instagram', 'site_announcement'],
  },
  reengagement: {
    labelAr: 'إعادة تفعيل',
    labelFr: 'Réactivation',
    goal: 'إعادة حسابات/زوار خاملين بلطف',
    channels: ['whatsapp', 'sms', 'email'],
  },
  announcement: {
    labelAr: 'إعلان رسمي',
    labelFr: 'Annonce officielle',
    goal: 'خبر من الإدارة (تحديث، سياسة، صيانة)',
    channels: ['facebook', 'telegram', 'site_announcement', 'email'],
  },
  content_series: {
    labelAr: 'سلسلة محتوى',
    labelFr: 'Série de contenu',
    goal: 'نصيحة تجارية قصيرة تبني ثقة وتربط برزق',
    channels: ['facebook', 'instagram', 'telegram'],
  },
};

/** قنوات المخرجات — النشر الآلي حالياً لفيسبوك؛ الباقي مسودات جاهزة للنسخ */
const CHANNELS = {
  facebook: {
    labelAr: 'فيسبوك (نشر صفحة)',
    publishable: true,
    maxChars: 2000,
    preferLink: true,
  },
  instagram: {
    labelAr: 'إنستغرام (نص فقط — يدوي)',
    publishable: false,
    maxChars: 2200,
    preferLink: false,
  },
  whatsapp: {
    labelAr: 'واتساب بثّ (مسودة)',
    publishable: false,
    maxChars: 900,
    preferLink: true,
  },
  telegram: {
    labelAr: 'تيليغرام (مسودة)',
    publishable: false,
    maxChars: 1500,
    preferLink: true,
  },
  sms: {
    labelAr: 'SMS (مسودة قصيرة)',
    publishable: false,
    maxChars: 160,
    preferLink: false,
  },
  email: {
    labelAr: 'بريد (عنوان + جسم)',
    publishable: false,
    maxChars: 4000,
    preferLink: true,
  },
  site_announcement: {
    labelAr: 'إعلان داخل المنصة (مسودة)',
    publishable: false,
    maxChars: 280,
    preferLink: true,
  },
};

/** معايير الجودة الإبداعية — تُطبَّق قبل وضع المسودة في قائمة المراجعة */
const QUALITY_RULES = {
  minBodyChars: 40,
  maxExclamationMarks: 2,
  maxEmojiRatio: 0.08,
  requireCta: true,
  requireBrandMention: true,
  banAllCapsWordsLongerThan: 4,
  scoreWeights: {
    lengthOk: 15,
    hasCta: 20,
    brandMention: 20,
    noForbidden: 25,
    noSpamPunctuation: 10,
    hashtagBalance: 10,
  },
  passScore: 70,
};

/** حالات الحملة */
const STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'scheduled',
  'publishing',
  'published',
  'rejected',
  'failed',
  'cancelled',
];

/** إعدادات تشغيل افتراضية (قابلة للتجاوز من إعدادات الأدمن المخزّنة) */
const RUNTIME_DEFAULTS = {
  enabled: true,
  requireHumanApproval: true,
  defaultChannel: 'facebook',
  defaultLang: 'ar',
  maxDraftsPerDay: 30,
  schedulePollSeconds: 60,
  facebookApiVersion: 'v21.0',
  linkFallback: BRAND.siteUrl,
};

function listCampaignTypes() {
  return Object.keys(CAMPAIGN_TYPES).map((key) => ({
    key,
    labelAr: CAMPAIGN_TYPES[key].labelAr,
    labelFr: CAMPAIGN_TYPES[key].labelFr,
    goal: CAMPAIGN_TYPES[key].goal,
    channels: CAMPAIGN_TYPES[key].channels.slice(),
  }));
}

function listChannels() {
  return Object.keys(CHANNELS).map((key) => ({
    key,
    labelAr: CHANNELS[key].labelAr,
    publishable: !!CHANNELS[key].publishable,
    maxChars: CHANNELS[key].maxChars,
  }));
}

module.exports = {
  BRAND,
  CAMPAIGN_TYPES,
  CHANNELS,
  QUALITY_RULES,
  STATUSES,
  RUNTIME_DEFAULTS,
  listCampaignTypes,
  listChannels,
};
