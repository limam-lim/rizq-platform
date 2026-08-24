/**
 * rizq_packages_config.js
 * المصدر الموحّد لأسعار ومزايا باقات رزق — يقرأه الوكلاء والأدوات فقط من هنا.
 *
 * المصدر المعتمد: PKG_DEFAULTS في rizq_admin.html (كتالوج الأدمن).
 * إن وُجدت نسخة حيّة من الأدمن (site-config.json أو localStorage) تُفضَّل عليها.
 *
 * الاستخدام:
 *   Node:    const Pkg = require('./rizq_packages_config');
 *   متصفح:  <script src="rizq_packages_config.js"></script>  → window.RizqPackagesConfig
 *
 * إضافة قسم تجاري: أضف الكتالوج في CATALOGS — initCatalogRegistry يربط LS_KEYS و accType تلقائياً.
 */
'use strict';

var PUBLIC_CATALOG = 'general';

var LS_KEYS = {
  general: 'rizq_packages',
  individual: 'rizq_individual_packages',
  office: 'rizq_office_packages',
  store: 'rizq_store_packages',
  corp: 'rizq_corp_packages',
  video: 'rizq_video_packages',
  tender: 'rizq_tender_packages',
  verified_plus: 'rizq_verified_plus_packages'
};

var NAMES = {
  trial:     { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
  basic:     { ar: 'أساسي', fr: 'Basique', en: 'Basic', es: 'Básico', hs: 'أساسي' },
  pro:       { ar: 'Pro', fr: 'Pro', en: 'Pro', es: 'Pro', hs: 'Pro' },
  yearly:    { ar: 'سنوي', fr: 'Annuel', en: 'Yearly', es: 'Anual', hs: 'سنوي' },
  diamond:   { ar: 'الماسية الأساسية 💎', fr: 'Diamant Standard 💎', en: 'Diamond Standard 💎', es: 'Diamante Standard 💎', hs: 'الماسية الأساسية 💎' },
  diamond_standard: { ar: 'الماسية الأساسية 💎', fr: 'Diamant Standard 💎', en: 'Diamond Standard 💎', es: 'Diamante Standard 💎', hs: 'الماسية الأساسية 💎' },
  diamond_pro: { ar: 'الماسية المتقدمة 💎 Pro', fr: 'Diamant Pro 💎', en: 'Diamond Pro 💎', es: 'Diamante Pro 💎', hs: 'الماسية المتقدمة 💎 Pro' },
  'ind-free':    { ar: 'مجانية', fr: 'Gratuit', en: 'Free', es: 'Gratis', hs: 'مجانية' },
  'ind-boost':   { ar: 'مميزة', fr: 'Mise en avant', en: 'Boost', es: 'Destacado', hs: 'مميزة' },
  'ind-monthly': { ar: 'باقة شهرية', fr: 'Mensuel', en: 'Monthly', es: 'Mensual', hs: 'باقة شهرية' },
  'st-trial': { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
  'st-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'st-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'st-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'st-diam-std': { ar: 'الماسية الأساسية 💎', fr: 'Diamant Standard 💎', en: 'Diamond Standard 💎', es: 'Diamante Standard 💎', hs: 'الماسية الأساسية 💎' },
  'st-diam-pro': { ar: 'الماسية المتقدمة 💎 Pro', fr: 'Diamant Pro 💎', en: 'Diamond Pro 💎', es: 'Diamante Pro 💎', hs: 'الماسية المتقدمة 💎 Pro' },
  'st-diam':  { ar: 'الماسية الأساسية 💎', fr: 'Diamant Standard 💎', en: 'Diamond Standard 💎', es: 'Diamante Standard 💎', hs: 'الماسية الأساسية 💎' },
  'cp-trial': { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
  'cp-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'cp-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'cp-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'cp-diam-std': { ar: 'الماسية الأساسية 💎', fr: 'Diamant Standard 💎', en: 'Diamond Standard 💎', es: 'Diamante Standard 💎', hs: 'الماسية الأساسية 💎' },
  'cp-diam-pro': { ar: 'الماسية المتقدمة 💎 Pro', fr: 'Diamant Pro 💎', en: 'Diamond Pro 💎', es: 'Diamante Pro 💎', hs: 'الماسية المتقدمة 💎 Pro' },
  'cp-diam':  { ar: 'الماسية المتقدمة 💎 Pro', fr: 'Diamant Pro 💎', en: 'Diamond Pro 💎', es: 'Diamante Pro 💎', hs: 'الماسية المتقدمة 💎 Pro' },
  'of-trial': { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
  'of-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'of-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'of-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'of-diam-std': { ar: 'الماسية الأساسية 💎', fr: 'Diamant Standard 💎', en: 'Diamond Standard 💎', es: 'Diamante Standard 💎', hs: 'الماسية الأساسية 💎' },
  'of-diam-pro': { ar: 'الماسية المتقدمة 💎 Pro', fr: 'Diamant Pro 💎', en: 'Diamond Pro 💎', es: 'Diamante Pro 💎', hs: 'الماسية المتقدمة 💎 Pro' },
  'of-diam':  { ar: 'الماسية الأساسية 💎', fr: 'Diamant Standard 💎', en: 'Diamond Standard 💎', es: 'Diamante Standard 💎', hs: 'الماسية الأساسية 💎' },
  'vid-basic':    { ar: 'أساسي (فيديو)', fr: 'Basique (vidéo)', en: 'Basic (video)', es: 'Básico (video)', hs: 'أساسي (فيديو)' },
  'vid-pro':      { ar: 'احترافي (فيديو)', fr: 'Pro (vidéo)', en: 'Pro (video)', es: 'Pro (video)', hs: 'احترافي (فيديو)' },
  'vid-business': { ar: 'أعمال ومعارض', fr: 'Business & showrooms', en: 'Business & showrooms', es: 'Negocios y showrooms', hs: 'أعمال ومعارض' },
  'tnd-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'tnd-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'tnd-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'vp-year':   { ar: 'موثّق⁺ سنوية', fr: 'Vérifié⁺ annuel', en: 'Verified+ yearly', es: 'Verificado⁺ anual', hs: 'موثّق⁺ سنوية' }
};

var DIAMOND_STANDARD_FEATURES = [
  '🤖 نائب ذكي حصري باسم منشأتك',
  '💬 ويدجت الموقع + واتساب (محادثات نصية)',
  '🛡️ هوية خاصة ومخصصة بالكامل',
  '📊 لوحة متابعة وتحليل الأداء لحظياً',
  '⚡ 2,000 محادثة نصية شهرياً',
];

var DIAMOND_PRO_FEATURES = [
  '🤖 نائب ذكي متقدم حصري باسم منشأتك',
  '💬 ويدجت الموقع + واتساب + مكالمات صوتية تفاعلية',
  '🛡️ هوية مخصصة كاملة ودعم تقني بأولوية',
  '📊 لوحة متابعة وتحليل الأداء لحظياً',
  '⚡ 4,000 محادثة نصية + 300 دقيقة صوتية شهرياً',
];

var DIAMOND_STANDARD_FEATURES_FR = [
  '🤖 Adjoint intelligent exclusif au nom de votre établissement',
  '💬 Widget site + WhatsApp (conversations texte)',
  '🛡️ Identité privée entièrement personnalisée',
  '📊 Tableau de bord et analyse de performance en temps réel',
  '⚡ 2 000 conversations texte / mois',
];

var DIAMOND_PRO_FEATURES_FR = [
  '🤖 Adjoint intelligent avancé exclusif au nom de votre établissement',
  '💬 Widget site + WhatsApp + appels vocaux interactifs',
  '🛡️ Identité personnalisée complète et support technique prioritaire',
  '📊 Tableau de bord et analyse de performance en temps réel',
  '⚡ 4 000 conversations texte + 300 min voix / mois',
];

var DIAMOND_FEATURES = DIAMOND_STANDARD_FEATURES;

var DIAMOND_FEATURES_FR = DIAMOND_STANDARD_FEATURES_FR;

var DIAMOND_MARKETING = {
  name: {
    ar: 'الماسية 💎 (النائب الذكي الشامل)',
    fr: 'Diamant 💎 (Adjoint intelligent complet)',
    en: 'Diamond 💎 (Full smart deputy)',
    es: 'Diamante 💎 (Adjunto inteligente)',
    hs: 'الماسية 💎 (النائب الذكي الشامل)'
  },
  description: {
    ar: 'وكيل أعمال متكامل يدير متجرك أو مؤسستك بدقة بشرية فائقة وعلى مدار 24 ساعة.',
    fr: 'Un adjoint commercial intégré qui gère votre boutique ou institution avec une précision humaine, 24h/24.',
    en: 'A complete business deputy that runs your store or firm with human-level care, 24/7.',
    es: 'Un adjunto comercial integral que gestiona su negocio con precisión humana, 24h.',
    hs: 'وكيل أعمال متكامل يدير متجرك أو مؤسستك بدقة بشرية فائقة وعلى مدار 24 ساعة.'
  },
  featuredBadge: {
    ar: 'الأكثر اختياراً للشركات',
    fr: 'Le plus choisi par les entreprises',
    en: 'Most chosen by companies',
    es: 'El más elegido por empresas',
    hs: 'الأكثر اختياراً للشركات'
  },
  roi: {
    ar: 'وفر راتب موظف استقبال — مقابل 5,000 أوقية شهرياً فقط.',
    fr: 'Économisez le salaire d\'un agent d\'accueil — pour seulement 5 000 MRU par mois.',
    en: 'Save a receptionist salary — for only 5,000 MRU per month.',
    es: 'Ahorre el sueldo de un recepcionista — por solo 5.000 MRU al mes.',
    hs: 'وفر راتب موظف استقبال — مقابل 5,000 أوقية شهرياً فقط.'
  },
  features: DIAMOND_FEATURES,
  featuresFr: DIAMOND_FEATURES_FR
};

function _diamondStandardFields(price) {
  return {
    diamondTier: 'diamond_standard',
    audioAccess: false,
    quotaMessages: 2000,
    quotaMinutes: 0,
    aiModel: 'claude-3-5-sonnet',
    name: 'الماسية الأساسية 💎',
    description: 'موظف استقبال واستفسارات آلي 24/7.',
    featured: true,
    featuredBadge: 'الأكثر اختياراً',
    roi: 'وفر موظف استقبال — من 5,000 أوقية/شهر',
    features: DIAMOND_STANDARD_FEATURES.slice(),
    price: price != null ? price : 5000,
    durationDays: 30,
    discountPct: 5,
  };
}

function _diamondProFields(price) {
  return {
    diamondTier: 'diamond_pro',
    audioAccess: true,
    quotaMessages: 4000,
    quotaMinutes: 300,
    aiModel: 'claude-3-5-sonnet',
    name: 'الماسية المتقدمة 💎 Pro',
    description: 'منظومة إدارة المبيعات وخدمة العملاء الشاملة.',
    featured: true,
    featuredBadge: 'Enterprise',
    roi: 'حل متكامل للمؤسسات — من 10,000 أوقية/شهر',
    features: DIAMOND_PRO_FEATURES.slice(),
    price: price != null ? price : 10000,
    durationDays: 30,
    discountPct: 5,
  };
}

function _diamondCatalogFields() {
  return _diamondStandardFields(5000);
}

var PERIODS = {
  ar: { freeDays: 'مجاناً — {n} أيام', month: 'MRU / شهر', year: 'MRU / سنة', quarter: 'MRU / 3 أشهر', perAd: 'MRU / لكل إعلان' },
  fr: { freeDays: 'Gratuit — {n} jours', month: 'MRU / mois', year: 'MRU / an', quarter: 'MRU / 3 mois', perAd: 'MRU / annonce' },
  en: { freeDays: 'Free — {n} days', month: 'MRU / month', year: 'MRU / year', quarter: 'MRU / 3 months', perAd: 'MRU / ad' },
  es: { freeDays: 'Gratis — {n} días', month: 'MRU / mes', year: 'MRU / año', quarter: 'MRU / 3 meses', perAd: 'MRU / anuncio' },
  hs: { freeDays: 'مجاناً — {n} أيام', month: 'MRU / شهر', year: 'MRU / سنة', quarter: 'MRU / 3 أشهر', perAd: 'MRU / لكل إعلان' }
};

/** الكتالوجات المعتمدة — مطابقة PKG_DEFAULTS في لوحة الأدمن */
var CATALOGS = {
  general: [
    { id: 'trial',   price: 0,     durationDays: 3,   discountPct: 0, features: ['10 منتجات', 'شارة محل', 'تواصل مباشر'] },
    { id: 'basic',   price: 1500,  durationDays: 30,  discountPct: 2, features: ['30 منتج', 'شارة مميّز برزق', 'إحصائيات'] },
    { id: 'pro',     price: 4000,  durationDays: 30,  discountPct: 3, features: ['منتجات غير محدودة', 'أولوية في نتائج البحث', 'دعم مخصص'] },
    { id: 'yearly',  price: 30000, durationDays: 365, discountPct: 3, features: ['كل مزايا Pro', 'خصم 37% عن السعر الشهري', 'فوترة سنوية واحدة'] },
    Object.assign({ id: 'diamond_standard', price: 5000, durationDays: 30, discountPct: 5 }, _diamondStandardFields(5000)),
    Object.assign({ id: 'diamond_pro', price: 10000, durationDays: 30, discountPct: 5 }, _diamondProFields(10000))
  ],
  individual: [
    { id: 'ind-free',    price: 0,    durationDays: 7,  discountPct: 0, features: ['إعلان واحد نشط', 'حتى 5 صور للإعلان', 'ظهور في نتائج البحث العادية'] },
    { id: 'ind-boost',   price: 500,  durationDays: 3,  discountPct: 0, features: ['تثبيت أعلى النتائج لمدة 3 أيام', 'حتى 5 صور للإعلان', 'شارة إعلان مميز'] },
    { id: 'ind-monthly', price: 2000, durationDays: 30, discountPct: 2, features: ['حتى 10 إعلانات نشطة', 'حتى 5 صور لكل إعلان', 'تجديد تلقائي للإعلانات'] }
  ],
  store: [
    { id: 'st-trial', price: 0,     durationDays: 3,   discountPct: 0, features: ['وصول كامل للمنصة', 'استعراض المنتجات', 'دعم فني أساسي'] },
    { id: 'st-month', price: 2000,  durationDays: 30,  discountPct: 2, features: ['شارة محل مميّز برزق', 'عرض 50 منتج', 'إحصائيات شهرية', 'دعم بالأولوية'] },
    { id: 'st-quart', price: 5500,  durationDays: 90,  discountPct: 3, features: ['كل مزايا الشهرية', 'توفير 15% عن الشهري', 'عرض 200 منتج', 'مدير حساب مخصص'] },
    { id: 'st-year',  price: 15000, durationDays: 365, discountPct: 3, features: ['كل مزايا الربعية', 'توفير 35% عن الشهري', 'منتجات غير محدودة', 'دعم VIP 24/7', 'تقارير سنوية'] },
    Object.assign({ id: 'st-diam-std', price: 5000, durationDays: 30, discountPct: 5 }, _diamondStandardFields(5000)),
    Object.assign({ id: 'st-diam-pro', price: 10000, durationDays: 30, discountPct: 5 }, _diamondProFields(10000))
  ],
  office: [
    { id: 'of-trial', price: 0,     durationDays: 3,   discountPct: 0, features: ['عرض الخدمات', 'صفحة المكتب', 'طلبات تواصل', 'دعم فني أساسي'] },
    { id: 'of-month', price: 3500,  durationDays: 30,  discountPct: 2, features: ['جميع المزايا', 'شارة موثّق', 'إحصائيات', 'فيديو تعريفي مشمول', 'دعم بالأولوية'] },
    { id: 'of-quart', price: 9000,  durationDays: 90,  discountPct: 3, features: ['توفير 14%', 'جميع المزايا', 'فيديو تعريفي مشمول', 'مدير حساب مخصص'] },
    { id: 'of-year',  price: 28000, durationDays: 365, discountPct: 3, features: ['توفير 33%', 'أفضل قيمة', 'فيديو مشمول + 1 إضافي مجاني', 'أولوية الدعم'] },
    Object.assign({ id: 'of-diam-std', price: 5000, durationDays: 30, discountPct: 5 }, _diamondStandardFields(5000)),
    Object.assign({ id: 'of-diam-pro', price: 10000, durationDays: 30, discountPct: 5 }, _diamondProFields(10000))
  ],
  corp: [
    { id: 'cp-trial', price: 0,     durationDays: 3,   discountPct: 0, features: ['وصول كامل للمنصة', 'استعراض الإعلانات', 'دعم فني أساسي'] },
    { id: 'cp-month', price: 3500,  durationDays: 30,  discountPct: 2, features: ['شارة شركة مميّزة برزق', 'عرض 30 إعلان', 'إحصائيات شهرية', 'دعم بالأولوية'] },
    { id: 'cp-quart', price: 9000,  durationDays: 90,  discountPct: 3, features: ['كل مزايا الشهرية', 'توفير 15% عن الشهري', 'إعلانات غير محدودة', 'مدير حساب'] },
    { id: 'cp-year',  price: 25000, durationDays: 365, discountPct: 3, features: ['كل مزايا الربعية', 'توفير 35% عن الشهري', 'ميزات VIP حصرية', 'دعم 24/7', 'تقارير سنوية شاملة'] },
    Object.assign({ id: 'cp-diam-std', price: 5000, durationDays: 30, discountPct: 5 }, _diamondStandardFields(5000)),
    Object.assign({ id: 'cp-diam-pro', price: 10000, durationDays: 30, discountPct: 5 }, _diamondProFields(10000))
  ],
  video: [
    { id: 'vid-basic',    price: 5000,  durationDays: 30, discountPct: 0, features: ['فيديو إعلاني واحد (حتى 30 ثانية)', 'ظهور في قسم الإعلانات المرئية', 'إحصائيات مشاهدات أساسية'] },
    { id: 'vid-pro',      price: 12000, durationDays: 30, discountPct: 0, features: ['حتى 3 فيديوهات إعلانية', 'أولوية ظهور في النتائج', 'شارة محتوى مميّز برزق', 'دعم تحرير أساسي'] },
    { id: 'vid-business', price: 25000, durationDays: 30, discountPct: 0, features: ['فيديوهات غير محدودة', 'ظهور في القسم المميز بالصفحة الرئيسية', 'تقارير أداء تفصيلية', 'مدير حساب مخصص'] }
  ],
  tender: [
    { id: 'tnd-month', price: 2500,  durationDays: 30,  discountPct: 0, features: ['نشر مناقصات غير محدود', 'تقديم عروض على مناقصات الآخرين', 'استقبال عروض موردين حقيقيين مباشرة', 'بدون أي فترة تجربة مجانية'] },
    { id: 'tnd-quart', price: 6300,  durationDays: 90,  discountPct: 0, features: ['كل مزايا الشهرية', 'توفير 16% عن الشهري', 'أولوية ظهور عروضك للموردين', 'دعم بالأولوية'] },
    { id: 'tnd-year',  price: 19000, durationDays: 365, discountPct: 0, features: ['كل مزايا الربعية', 'توفير 37% عن الشهري', 'فوترة سنوية واحدة فقط', 'دعم VIP لغرفة المناقصات'] }
  ],
  verified_plus: [
    { id: 'vp-year', price: 5000, durationDays: 365, discountPct: 0, features: ['شارة موثّق⁺ الرسمية بشعار رزق', 'أعلى درجة ثقة — تحقق هوية مُعزَّز', 'تبرز فوق شارة التوثيق المجانية', 'صالحة لمدة سنة كاملة'] }
  ]
};

/** سجل موحّد: يربط مفتاح الكتالوج ↔ localStorage ↔ نوع الحساب (accType) */
var CATALOG_REGISTRY = {};

function defaultLsKeyForCatalog(catalogKey) {
  if (catalogKey === 'general') return 'rizq_packages';
  return 'rizq_' + catalogKey + '_packages';
}

/**
 * registerCatalogMapping — عند إضافة قسم في CATALOGS، استدعِ هذه الدالة (أو rely على initCatalogRegistry).
 * meta: { lsKey?, accType?, label? }
 */
function registerCatalogMapping(catalogKey, meta) {
  meta = meta || {};
  var prev = CATALOG_REGISTRY[catalogKey] || {};
  var entry = Object.assign({}, prev, meta, { catalogKey: catalogKey });
  entry.lsKey = entry.lsKey || defaultLsKeyForCatalog(catalogKey);
  entry.accType = entry.accType || catalogKey;
  CATALOG_REGISTRY[catalogKey] = entry;
  LS_KEYS[catalogKey] = entry.lsKey;
  return entry;
}

function initCatalogRegistry() {
  Object.keys(CATALOGS).forEach(function (k) {
    registerCatalogMapping(k, CATALOG_REGISTRY[k] || {});
  });
}

function getCatalogRegistry(catalogKey) {
  if (catalogKey) return CATALOG_REGISTRY[catalogKey] ? Object.assign({}, CATALOG_REGISTRY[catalogKey]) : null;
  var out = {};
  Object.keys(CATALOG_REGISTRY).forEach(function (k) {
    out[k] = Object.assign({}, CATALOG_REGISTRY[k]);
  });
  return out;
}

function getLsMap() {
  var map = {};
  Object.keys(CATALOG_REGISTRY).forEach(function (k) {
    map[k] = CATALOG_REGISTRY[k].lsKey;
  });
  return map;
}

function getTypeToCatalog() {
  var map = {};
  Object.keys(CATALOG_REGISTRY).forEach(function (k) {
    map[CATALOG_REGISTRY[k].accType] = k;
  });
  return map;
}

function getAccTypeToLsKey() {
  var map = {};
  Object.keys(CATALOG_REGISTRY).forEach(function (k) {
    map[CATALOG_REGISTRY[k].accType] = CATALOG_REGISTRY[k].lsKey;
  });
  return map;
}

function getCatalogLsKey(catalogKey) {
  if (CATALOG_REGISTRY[catalogKey]) return CATALOG_REGISTRY[catalogKey].lsKey;
  return LS_KEYS[catalogKey] || defaultLsKeyForCatalog(catalogKey || PUBLIC_CATALOG);
}

initCatalogRegistry();

function _normLang(lang) {
  var l = String(lang || 'ar').toLowerCase();
  if (l === 'fr' || l === 'en' || l === 'es' || l === 'hs') return l;
  return 'ar';
}

function _clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function _readSiteConfigCatalog(catalogKey) {
  if (typeof require !== 'function') return null;
  try {
    var fs = require('fs');
    var path = require('path');
    var candidates = [
      path.join(__dirname, 'rizq-backend', 'data', 'site-config.json'),
      path.join(__dirname, 'data', 'site-config.json')
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (!fs.existsSync(candidates[i])) continue;
      var cfg = JSON.parse(fs.readFileSync(candidates[i], 'utf8'));
      var list = cfg && cfg.packages && cfg.packages[catalogKey];
      if (Array.isArray(list) && list.length) return list;
    }
  } catch (e) { /* ignore */ }
  return null;
}

function _readBrowserCatalog(catalogKey) {
  if (typeof localStorage === 'undefined') return null;
  var key = LS_KEYS[catalogKey];
  if (!key) return null;
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    var list = JSON.parse(raw);
    if (Array.isArray(list) && list.length) return list;
  } catch (e) { /* ignore */ }
  return null;
}

function _defaultsFor(catalogKey) {
  return _clone(CATALOGS[catalogKey] || CATALOGS[PUBLIC_CATALOG]);
}

function isDiamondPackage(pkg) {
  if (!pkg) return false;
  if (pkg.diamond || pkg.isDiamond) return true;
  if (pkg.diamondTier === 'diamond_standard' || pkg.diamondTier === 'diamond_pro') return true;
  var blob = [pkg.id, pkg.name, pkg.name_fr, pkg.cta, pkg.cta_fr].filter(Boolean).join(' ');
  return /(ماس|diamond|diamant)/i.test(blob);
}

function resolveDiamondTierFromPkg(pkg) {
  if (!pkg) return null;
  if (pkg.diamondTier === 'diamond_pro' || pkg.diamondTier === 'pro') return 'diamond_pro';
  if (pkg.diamondTier === 'diamond_standard' || pkg.diamondTier === 'standard') return 'diamond_standard';
  var id = String(pkg.id || '').toLowerCase();
  if (/pro|diam-pro/.test(id)) return 'diamond_pro';
  if (isDiamondPackage(pkg)) return 'diamond_standard';
  return null;
}

function _pickCopy(map, lang) {
  lang = _normLang(lang);
  if (!map) return '';
  if (typeof map === 'string') return map;
  return map[lang] || map.ar || '';
}

function _diamondTierFields(tier, price) {
  return tier === 'diamond_pro' ? _diamondProFields(price) : _diamondStandardFields(price);
}

function diamondCopy(lang, tier, price) {
  lang = _normLang(lang);
  var isPro = tier === 'diamond_pro';
  var base = _diamondTierFields(isPro ? 'diamond_pro' : 'diamond_standard', price);
  var nameMap = isPro ? NAMES.diamond_pro : NAMES.diamond_standard;
  return {
    name: lang === 'fr' ? (nameMap.fr || base.name) : base.name,
    description: base.description,
    featuredBadge: base.featuredBadge,
    roi: base.roi,
    features: lang === 'fr'
      ? (isPro ? DIAMOND_PRO_FEATURES_FR.slice() : DIAMOND_STANDARD_FEATURES_FR.slice())
      : base.features.slice()
  };
}

function _durationLabel(pkg, lang) {
  lang = _normLang(lang);
  var days = Number((pkg && pkg.durationDays) || 30);
  if (days >= 360) return lang === 'fr' ? '12 mois' : '12 شهر';
  if (days >= 80) return lang === 'fr' ? '3 mois' : '3 أشهر';
  if (days <= 7) return lang === 'fr' ? (days + ' jours') : (days + ' أيام');
  return lang === 'fr' ? 'mois' : 'شهر';
}

function _hasArabic(text) {
  return /[\u0600-\u06FF]/.test(String(text || ''));
}

function _nameMapFor(pkg) {
  var id = pkg && pkg.id;
  if (id && NAMES[id]) return { id: id, map: NAMES[id] };
  var raw = String((pkg && pkg.name) || '').replace(/💎\s*/g, '').trim();
  if (!raw) return null;
  for (var key in NAMES) {
    if (!Object.prototype.hasOwnProperty.call(NAMES, key)) continue;
    var map = NAMES[key];
    if (map.ar === raw || map.fr === raw) return { id: key, map: map };
  }
  return null;
}

function _defaultCta(pkg, lang) {
  lang = _normLang(lang);
  if (!Number((pkg && pkg.price) || 0)) {
    return lang === 'fr' ? 'Commencer gratuitement' : 'ابدأ مجاناً';
  }
  if (pkg && pkg.id && /-month$/.test(String(pkg.id))) {
    return lang === 'fr' ? "S'abonner maintenant" : 'اشترك الآن';
  }
  return lang === 'fr' ? "S'abonner" : 'اشترك';
}

function _applyStandardNames(out, lang) {
  var hit = _nameMapFor(out);
  if (!hit) return out;
  if (!out.id) out.id = hit.id;
  out.name_ar = hit.map.ar;
  out.name_fr = hit.map.fr || out.name_fr || hit.map.ar;
  out.name = lang === 'fr' ? (out.name_fr || hit.map.fr || hit.map.ar) : (out.name_ar || hit.map.ar);
  return out;
}

function enrichForDisplay(pkg, lang) {
  lang = _normLang(lang);
  var out = Object.assign({}, pkg || {});
  if (!isDiamondPackage(out)) {
    _applyStandardNames(out, lang);
    out.name = localizedName(out, lang);
    out.name_fr = localizedName(out, 'fr');
    out.name_ar = localizedName(out, 'ar');
    out.duration = out.duration || _durationLabel(out, lang);
    out.period = periodLabel(out, lang);
    out.period_fr = periodLabel(out, 'fr');
    out.features = Array.isArray(out.features) ? out.features.slice() : [];
    if (Array.isArray(out.features_fr) && out.features_fr.length) {
      out.features_fr = out.features_fr.slice();
    } else {
      out.features_fr = [];
    }
    out.cta_fr = out.cta_fr || _defaultCta(out, 'fr');
    out.cta = lang === 'fr' ? out.cta_fr : (out.cta || _defaultCta(out, 'ar'));
    return out;
  }
  var tier = resolveDiamondTierFromPkg(out) || 'diamond_standard';
  var isPro = tier === 'diamond_pro';
  var copy = diamondCopy(lang, tier, out.price);
  var copyFr = diamondCopy('fr', tier, out.price);
  out.diamondTier = tier;
  out.audioAccess = isPro;
  out.name = copy.name;
  out.name_ar = isPro ? NAMES.diamond_pro.ar : NAMES.diamond_standard.ar;
  out.name_fr = copyFr.name;
  out.description = copy.description;
  out.description_fr = copyFr.description;
  out.featuredBadge = copy.featuredBadge;
  out.featuredBadge_fr = copyFr.featuredBadge;
  out.roi = copy.roi;
  out.roi_fr = copyFr.roi;
  out.features = copy.features;
  out.features_fr = copyFr.features;
  out.diamond = true;
  out.isDiamond = true;
  out.featured = true;
  out.duration = _durationLabel(out, lang);
  out.period = periodLabel({ price: out.price, durationDays: out.durationDays || 30 }, lang);
  out.period_fr = periodLabel({ price: out.price, durationDays: out.durationDays || 30 }, 'fr');
  out.cta = lang === 'fr'
    ? (isPro ? 'Choisir Diamant Pro' : 'Choisir Diamant Standard')
    : (isPro ? 'اشترك في الماسية Pro' : 'اشترك في الماسية الأساسية');
  out.cta_fr = isPro ? 'Choisir Diamant Pro' : 'Choisir Diamant Standard';
  return out;
}

function _mergeLive(defaults, live) {
  if (!Array.isArray(live) || !live.length) return defaults;
  var byId = {};
  defaults.forEach(function (p) { byId[p.id] = p; });
  return live.filter(function (p) { return p && p.active !== false; }).map(function (livePkg) {
    var base = (livePkg.id && byId[livePkg.id]) ? byId[livePkg.id] : {};
    var diamond = isDiamondPackage(livePkg) || isDiamondPackage(base);
    var pkgId = String(livePkg.id || base.id || '');
    var nameHit = pkgId && NAMES[pkgId] ? NAMES[pkgId] : null;
    var tier = resolveDiamondTierFromPkg(livePkg) || resolveDiamondTierFromPkg(base);
    var tierFields = diamond ? _diamondTierFields(tier || 'diamond_standard', livePkg.price != null ? livePkg.price : base.price) : null;
    return {
      id: pkgId,
      price: livePkg.price != null ? Number(livePkg.price) : (base.price || 0),
      durationDays: livePkg.durationDays != null ? Number(livePkg.durationDays) : (base.durationDays || 30),
      discountPct: livePkg.discountPct != null ? Number(livePkg.discountPct) : (base.discountPct || 0),
      diamondTier: tier || base.diamondTier,
      audioAccess: diamond ? tier === 'diamond_pro' : base.audioAccess,
      features: diamond
        ? (base.features || tierFields.features).slice()
        : (Array.isArray(livePkg.features) && livePkg.features.length ? livePkg.features.slice() : (base.features || [])),
      features_fr: diamond
        ? ((base.features_fr && base.features_fr.length) ? base.features_fr.slice() : (tier === 'diamond_pro' ? DIAMOND_PRO_FEATURES_FR : DIAMOND_STANDARD_FEATURES_FR).slice())
        : (Array.isArray(livePkg.features_fr) && livePkg.features_fr.length ? livePkg.features_fr.slice() : (base.features_fr || [])),
      name: diamond
        ? (base.name || tierFields.name)
        : (livePkg.name || base.name || (nameHit && nameHit.ar) || ''),
      name_fr: diamond
        ? (base.name_fr || (tier === 'diamond_pro' ? NAMES.diamond_pro.fr : NAMES.diamond_standard.fr))
        : (livePkg.name_fr || base.name_fr || (nameHit && nameHit.fr) || ''),
      description: diamond ? (base.description || tierFields.description) : (livePkg.description || base.description || ''),
      description_fr: diamond ? (base.description_fr || tierFields.description) : (livePkg.description_fr || base.description_fr || ''),
      featured: diamond ? true : !!livePkg.featured,
      featuredBadge: diamond ? (base.featuredBadge || tierFields.featuredBadge) : (livePkg.featuredBadge || ''),
      featuredBadge_fr: diamond ? (base.featuredBadge_fr || tierFields.featuredBadge) : (livePkg.featuredBadge_fr || base.featuredBadge_fr || ''),
      roi: diamond ? (base.roi || tierFields.roi) : (livePkg.roi || ''),
      roi_fr: diamond ? (base.roi_fr || tierFields.roi) : (livePkg.roi_fr || base.roi_fr || ''),
      period: livePkg.period || base.period || '',
      cta: livePkg.cta || base.cta || '',
      cta_fr: livePkg.cta_fr || base.cta_fr || ''
    };
  });
}

function getCatalog(catalogKey, lang) {
  var key = catalogKey || PUBLIC_CATALOG;
  var defaults = _defaultsFor(key);
  var live = _readSiteConfigCatalog(key) || _readBrowserCatalog(key);
  return _mergeLive(defaults, live).map(function (p) {
    return enrichForDisplay(p, lang || 'ar');
  });
}

function getDiamondPackage(lang) {
  var merged = getCatalog(PUBLIC_CATALOG, lang);
  var std = merged.filter(function (p) { return p.id === 'diamond_standard'; })[0];
  return enrichForDisplay(std || Object.assign({ id: 'diamond_standard' }, _diamondStandardFields(5000)), lang);
}

function _diamondDefaultsForCatalog(catalogKey) {
  return _defaultsFor(catalogKey || PUBLIC_CATALOG).filter(isDiamondPackage);
}

function withDiamond(list, lang, catalogKey) {
  lang = _normLang(lang);
  catalogKey = catalogKey || PUBLIC_CATALOG;
  var out = (list || []).map(function (p) { return enrichForDisplay(p, lang); });
  _diamondDefaultsForCatalog(catalogKey).forEach(function (def) {
    var tier = resolveDiamondTierFromPkg(def);
    if (!tier) return;
    var exists = out.some(function (p) {
      return resolveDiamondTierFromPkg(p) === tier;
    });
    if (!exists) {
      out.push(enrichForDisplay(Object.assign({}, def), lang));
    }
  });
  return out;
}

function getPublicPackages() {
  return getCatalog(PUBLIC_CATALOG);
}

function localizedName(pkg, lang) {
  lang = _normLang(lang);
  if (isDiamondPackage(pkg)) {
    var tier = resolveDiamondTierFromPkg(pkg) || 'diamond_standard';
    return diamondCopy(lang, tier, pkg.price).name;
  }
  var hit = _nameMapFor(pkg);
  if (hit && hit.map[lang]) return hit.map[lang];
  if (hit && lang === 'fr' && hit.map.fr) return hit.map.fr;
  var raw = pkg.name ? String(pkg.name).replace(/💎\s*/g, '').trim() : '';
  if (lang === 'fr' && _hasArabic(raw)) {
    if (pkg.name_fr && !_hasArabic(pkg.name_fr)) return String(pkg.name_fr);
    return raw;
  }
  if (raw && raw !== String(pkg.id || '') && !/^[a-z]{2,}-[a-z0-9-]+$/i.test(raw)) return raw;
  if (hit && hit.map.ar) return hit.map.ar;
  return raw || (pkg && pkg.id) || '';
}

function periodLabel(pkg, lang) {
  lang = _normLang(lang);
  var t = PERIODS[lang] || PERIODS.ar;
  if (pkg.period && !/^MRU\s*\//i.test(String(pkg.period))) {
    if (lang === 'fr' && _hasArabic(pkg.period)) {
      // Arabic period from admin/localStorage — recompute FR label from durationDays
    } else {
      return pkg.period;
    }
  }
  if (!pkg.price) return t.freeDays.replace('{n}', String(pkg.durationDays || 3));
  if (pkg.durationDays >= 360) return t.year;
  if (pkg.durationDays >= 80) return t.quarter;
  if (pkg.durationDays <= 7 && pkg.id && String(pkg.id).indexOf('boost') !== -1) return t.perAd;
  return t.month;
}

function priceLabel(pkg, lang) {
  lang = _normLang(lang);
  if (!pkg.price) {
    return { ar: 'مجاني', fr: 'Gratuit', en: 'Free', es: 'Gratis', hs: 'مجاني' }[lang] || 'مجاني';
  }
  var n = Number(pkg.price);
  var formatted = String(n);
  return formatted + ' ' + periodLabel(pkg, lang);
}

function formatPackage(pkg, lang) {
  lang = _normLang(lang);
  var display = enrichForDisplay(pkg, lang);
  return {
    id: display.id,
    name: localizedName(display, lang),
    name_fr: localizedName(display, 'fr'),
    description: display.description || '',
    description_fr: display.description_fr || '',
    diamond: isDiamondPackage(display),
    isDiamond: isDiamondPackage(display),
    featured: !!display.featured || isDiamondPackage(display),
    featuredBadge: display.featuredBadge || '',
    featuredBadge_fr: display.featuredBadge_fr || '',
    roi: display.roi || '',
    roi_fr: display.roi_fr || '',
    price: display.price,
    priceLabel: priceLabel(display, lang),
    period: periodLabel(display, lang),
    period_fr: periodLabel(display, 'fr'),
    durationDays: display.durationDays,
    duration: display.durationDays + (lang === 'fr' ? ' j' : lang === 'en' ? ' days' : lang === 'es' ? ' días' : ' يوم'),
    features: display.features || [],
    features_fr: display.features_fr || [],
    cta: display.cta || _defaultCta(display, lang),
    cta_fr: display.cta_fr || _defaultCta(display, 'fr'),
    discountPct: display.discountPct || 0
  };
}

function getPackagesForTool(lang, catalogKey) {
  return getCatalog(catalogKey || PUBLIC_CATALOG, lang).map(function (p) {
    return formatPackage(p, lang);
  });
}

function buildPublicSummary(lang) {
  lang = _normLang(lang);
  var pkgs = getPackagesForTool(lang);
  var header = {
    ar: 'لدينا ' + pkgs.length + ' باقات:',
    hs: 'عندنا ' + pkgs.length + ' باقات:',
    fr: 'Nous avons ' + pkgs.length + ' forfaits:',
    en: 'We have ' + pkgs.length + ' plans:',
    es: 'Tenemos ' + pkgs.length + ' planes:'
  }[lang];
  var lines = pkgs.map(function (p) {
    return '• ' + p.name + ' — ' + p.priceLabel;
  });
  var footer = {
    ar: 'أيهم يناسبك؟',
    hs: 'أيهم يناسبك؟',
    fr: 'Lequel vous convient?',
    en: 'Which one suits you?',
    es: '¿Cuál le conviene?'
  }[lang];
  return header + '\n\n' + lines.join('\n') + '\n\n' + footer;
}

function buildPublicOverview(lang) {
  lang = _normLang(lang);
  var pkgs = getPackagesForTool(lang);
  var title = lang === 'fr'
    ? 'Forfaits Rizq — choisissez celui qui vous convient:'
    : (lang === 'en' ? 'Rizq plans — pick what fits you:' : 'باقات رزق — اختر ما يناسبك:');
  var blocks = pkgs.map(function (p) {
    var feats = (p.features || []).map(function (f) { return '• ' + f; }).join('\n');
    return p.name + ' — ' + p.priceLabel + (feats ? ':\n' + feats : '');
  });
  return title + '\n\n' + blocks.join('\n\n');
}

function buildDiamondTiersPromptBlock() {
  return (
    '=== تعليمات إجابة الوكيل الذكي للباقات الماسية (ثابت — لا ترتجل) ===\n' +
    'عندما يسأل العميل عن الفرق بين الباقتين الماسيتين، اعتمد حصراً على البيانات التالية:\n\n' +
    'الباقة الماسية الأساسية (5,000 أوقية/شهر):\n' +
    '- الوصف: موظف استقبال واستفسارات آلي 24/7.\n' +
    '- المزايا: نائب ذكي حصري باسم منشأتك | ويدجت الموقع + واتساب (محادثات نصية) | هوية خاصة ومخصصة بالكامل | لوحة متابعة وتحليل الأداء لحظياً | 2,000 محادثة نصية شهرياً.\n' +
    '- **نصي فقط — بدون مكالمات صوتية.**\n\n' +
    'الباقة الماسية المتقدمة — Pro (10,000 أوقية/شهر):\n' +
    '- الوصف: منظومة إدارة المبيعات وخدمة العملاء الشاملة.\n' +
    '- المزايا: نائب ذكي متقدم حصري باسم منشأتك | ويدجت الموقع + واتساب + مكالمات صوتية تفاعلية | هوية مخصصة كاملة ودعم تقني بأولوية | لوحة متابعة وتحليل الأداء لحظياً | 4,000 محادثة نصية + 300 دقيقة صوتية شهرياً.\n' +
    '- **تشتمل حتماً على المكالمات الصوتية التفاعلية — ليست نصية فقط.**\n\n' +
    'قواعد صارمة للرد:\n' +
    '- يمنع ذكر: "قابل للتعديل من الأدمن"، "للمحلات الصغيرة"، "للفنادق والشركات الكبرى"، أو "حل ذكاء اصطناعي".\n' +
    '- يمنع منعاً باتاً نفي وجود المكالمات الصوتية في الماسية Pro.\n' +
    '- يمنع وصف الماسية Pro بأنه "نصي فقط".\n' +
    '- يمنع قول إن الماسية الأساسية تدعم المكالمات الصوتية.\n' +
    '- الفارق الرئيسي: المكالمات الصوتية التفاعلية (حصرية لـ Pro).\n' +
    '- **إلزامي:** عند ذكر الماسية، اشرح **المستويين كاملين** (أساسية ثم Pro) — لا تتوقف عند الأولى.\n' +
    '- **إلزامي:** أنهِ دائماً بجدول المقارنة أدناه أو بنقطتين واضحتين (أساسية vs Pro).\n' +
    '- **إلزامي:** لا تترك ** أو قوائم ناقصة — أكمل الجملة حتى النهاية.\n' +
    '- **إلزامي:** لا تستخدم رموز Unicode للاتجاه (⁦ ⁩) — اكتب الأرقام plain: 5000، 10000، 24/7.\n\n' +
    '| المستوى | السعر | القنوات | صوت |\n' +
    '| الماسية الأساسية | 5,000 MRU/شهر | ويدجت + واتساب | نصي فقط |\n' +
    '| الماسية Pro | 10,000 MRU/شهر | ويدجت + واتساب + مكالمات | نص + صوت تفاعلي (300 د/شهر) |'
  );
}

function buildPackagesPromptBlock() {
  var pkgs = getPackagesForTool('ar');
  var lines = pkgs.map(function (p) {
    return '- ' + p.name + ': ' + p.priceLabel + (p.features.length ? ' — ' + p.features.join('، ') : '');
  });
  return (
    '📦 الباقات المتاحة (المصدر الرسمي الوحيد — لا تخترع أسعاراً أخرى):\n' +
    lines.join('\n') +
    '\n\n' + buildDiamondTiersPromptBlock() +
    '\n\nالنائب الذكي VIP حصري بالباقة الماسية. أقصى خصم على خدمات المنصة: 5% (ماسي).'
  );
}

function buildDiscountSummary(lang) {
  lang = _normLang(lang);
  var pkgs = getPackagesForTool(lang).filter(function (p) { return p.discountPct > 0; });
  var intro = {
    ar: '🏷️ الخصومات في رزق (على خدمات المنصة فقط — ليس على أسعار الإعلانات بين البائع والمشتري):',
    fr: '🏷️ Réductions sur Rizq (services de la plateforme uniquement — pas les prix des annonces):',
    en: '🏷️ Rizq discounts (platform services only — not listing prices):',
    es: '🏷️ Descuentos Rizq (solo servicios de la plataforma):',
    hs: '🏷️ الخصومات في رزق (على خدمات المنصة فقط):'
  }[lang];
  var lines = pkgs.map(function (p) {
    var cap = p.discountPct === 5
      ? (lang === 'fr' ? ' (maximum absolu)' : lang === 'en' ? ' (absolute max)' : ' (الحد الأقصى المطلق)')
      : '';
    return '• ' + p.name + ': ' + (lang === 'fr' || lang === 'en' || lang === 'es' ? 'up to ' : 'حتى ') + p.discountPct + '%' + cap;
  });
  return intro + '\n' + lines.join('\n');
}

function maxDiscountPct() {
  var max = 0;
  getPublicPackages().forEach(function (p) {
    if ((p.discountPct || 0) > max) max = p.discountPct;
  });
  return max;
}

function buildMaxDiscountLine(lang) {
  lang = _normLang(lang);
  var pct = maxDiscountPct();
  var dia = localizedName({ id: 'diamond' }, lang);
  if (lang === 'fr') return 'La réduction maximale sur les services de la plateforme est de ' + pct + '% avec le forfait ' + dia + ' — sans exception.';
  if (lang === 'en') return 'The maximum discount on platform services is ' + pct + '% with the ' + dia + ' plan — no exceptions.';
  if (lang === 'es') return 'La reducción máxima en servicios de la plataforma es del ' + pct + '% con el plan ' + dia + ' — sin excepción.';
  return 'أقصى خصم متاح على خدمات المنصة هو ' + pct + '% وفق الباقة ' + dia + ' — لا استثناءات.';
}

function buildVipDeputyText(lang) {
  lang = _normLang(lang);
  var std = diamondCopy(lang, 'diamond_standard', 5000);
  var pro = diamondCopy(lang, 'diamond_pro', 10000);
  function block(copy, price) {
    return copy.name + ' — ' + price + ' MRU\n' + copy.description + '\n' + copy.features.map(function (f) { return '• ' + f; }).join('\n');
  }
  return block(std, '5,000') + '\n\n' + block(pro, '10,000');
}

var API = {
  PUBLIC_CATALOG: PUBLIC_CATALOG,
  CATALOGS: CATALOGS,
  LS_KEYS: LS_KEYS,
  CATALOG_REGISTRY: CATALOG_REGISTRY,
  registerCatalogMapping: registerCatalogMapping,
  initCatalogRegistry: initCatalogRegistry,
  getCatalogRegistry: getCatalogRegistry,
  getLsMap: getLsMap,
  getTypeToCatalog: getTypeToCatalog,
  getAccTypeToLsKey: getAccTypeToLsKey,
  getCatalogLsKey: getCatalogLsKey,
  getCatalog: getCatalog,
  getPublicPackages: getPublicPackages,
  getPackagesForTool: getPackagesForTool,
  formatPackage: formatPackage,
  localizedName: localizedName,
  priceLabel: priceLabel,
  buildPublicSummary: buildPublicSummary,
  buildPublicOverview: buildPublicOverview,
  buildPackagesPromptBlock: buildPackagesPromptBlock,
  buildDiamondTiersPromptBlock: buildDiamondTiersPromptBlock,
  buildDiscountSummary: buildDiscountSummary,
  buildMaxDiscountLine: buildMaxDiscountLine,
  buildVipDeputyText: buildVipDeputyText,
  maxDiscountPct: maxDiscountPct,
  isDiamondPackage: isDiamondPackage,
  resolveDiamondTierFromPkg: resolveDiamondTierFromPkg,
  diamondCopy: diamondCopy,
  enrichForDisplay: enrichForDisplay,
  getDiamondPackage: getDiamondPackage,
  withDiamond: withDiamond,
  DIAMOND_MARKETING: DIAMOND_MARKETING
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
if (typeof globalThis !== 'undefined') {
  globalThis.RizqPackagesConfig = API;
} else if (typeof window !== 'undefined') {
  window.RizqPackagesConfig = API;
}
