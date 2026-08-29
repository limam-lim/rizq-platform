/**
 * rizq_packages_config.js
 * © Rizq ADMINIA SARL — Proprietary & Confidential
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
  'ind-medium':  { ar: 'باقة متوسطة', fr: 'Forfait intermédiaire', en: 'Medium bundle', es: 'Paquete medio', hs: 'باقة متوسطة' },
  'ind-monthly': { ar: 'باقة شهرية', fr: 'Mensuel', en: 'Monthly', es: 'Mensual', hs: 'باقة شهرية' },
  'st-trial': { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
  'st-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'st-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'st-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'st-diam-std': { ar: 'الماسية الأساسية للمحلات', fr: 'Diamant Standard boutique', en: 'Store Diamond Standard', es: 'Diamante Standard tienda', hs: 'الماسية الأساسية للمحلات' },
  'st-diam-pro': { ar: 'الماسية Pro للمحلات', fr: 'Diamant Pro boutique', en: 'Store Diamond Pro', es: 'Diamante Pro tienda', hs: 'الماسية Pro للمحلات' },
  'st-diam':  { ar: 'الماسية الأساسية للمحلات', fr: 'Diamant Standard boutique', en: 'Store Diamond Standard', es: 'Diamante Standard tienda', hs: 'الماسية الأساسية للمحلات' },
  'cp-trial': { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
  'cp-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'cp-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'cp-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'cp-diam-std': { ar: 'الماسية الأساسية للشركات', fr: 'Diamant Standard entreprise', en: 'Corp Diamond Standard', es: 'Diamante Standard empresa', hs: 'الماسية الأساسية للشركات' },
  'cp-diam-pro': { ar: 'الماسية Pro للشركات', fr: 'Diamant Pro entreprise', en: 'Corp Diamond Pro', es: 'Diamante Pro empresa', hs: 'الماسية Pro للشركات' },
  'cp-diam':  { ar: 'الماسية الأساسية للشركات', fr: 'Diamant Standard entreprise', en: 'Corp Diamond Standard', es: 'Diamante Standard empresa', hs: 'الماسية الأساسية للشركات' },
  'of-trial': { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
  'of-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'of-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'of-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'of-diam-std': { ar: 'الماسية الأساسية للمكاتب', fr: 'Diamant Standard bureau', en: 'Office Diamond Standard', es: 'Diamante Standard oficina', hs: 'الماسية الأساسية للمكاتب' },
  'of-diam-pro': { ar: 'الماسية Pro للمكاتب', fr: 'Diamant Pro bureau', en: 'Office Diamond Pro', es: 'Diamante Pro oficina', hs: 'الماسية Pro للمكاتب' },
  'of-diam':  { ar: 'الماسية الأساسية للمكاتب', fr: 'Diamant Standard bureau', en: 'Office Diamond Standard', es: 'Diamante Standard oficina', hs: 'الماسية الأساسية للمكاتب' },
  'vid-single':   { ar: 'إعلان فيديو واحد', fr: 'Vidéo unique', en: 'Single Video Ad', es: 'Vídeo único', hs: 'إعلان فيديو واحد' },
  'vid-basic':    { ar: 'أساسي فيديو', fr: 'Basique vidéo', en: 'Basic Video', es: 'Vídeo básico', hs: 'أساسي فيديو' },
  'vid-pro':      { ar: 'احترافي فيديو', fr: 'Pro vidéo', en: 'Pro Video', es: 'Vídeo Pro', hs: 'احترافي فيديو' },
  'vid-business': { ar: 'أعمال ومعارض', fr: 'Entreprises & galeries', en: 'Corporate Media', es: 'Empresas y showrooms', hs: 'أعمال ومعارض' },
  'tnd-trial': { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
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

var STORE_DIAMOND_STD_FEATURES = [
  'منتجات غير محدودة للمتجر',
  'نائب ذكي نصي للمحل (موقع + واتساب)',
  '1,500 محادثة نصية شهرياً',
  'لوحة متابعة وتحليل الأداء لحظياً',
];

var STORE_DIAMOND_STD_FEATURES_FR = [
  'Produits illimités pour la boutique',
  'Adjoint intelligent texte (site + WhatsApp)',
  '1 500 conversations texte / mois',
  'Tableau de bord et analyse en temps réel',
];

var STORE_DIAMOND_PRO_FEATURES = [
  'منتجات غير محدودة للمتجر',
  'نائب ذكي تفاعلي للمحل (نصي + صوتي)',
  '2,500 محادثة نصية + 150 دقيقة صوتية شهرياً',
  'ويدجت الموقع + واتساب + مكالمات آليّة',
  'لوحة متابعة وتحليل الأداء لحظياً',
];

var STORE_DIAMOND_PRO_FEATURES_FR = [
  'Produits illimités pour la boutique',
  'Adjoint interactif (texte + voix)',
  '2 500 conversations texte + 150 min voix / mois',
  'Widget site + WhatsApp + appels automatiques',
  'Tableau de bord et analyse en temps réel',
];

function _storeDiamondStandardFields() {
  return {
    diamondTier: 'diamond_standard',
    audioAccess: false,
    quotaMessages: 1500,
    quotaMinutes: 0,
    aiModel: 'claude-3-5-sonnet',
    name: 'الماسية الأساسية للمحلات',
    name_ar: 'الماسية الأساسية للمحلات',
    description: 'نائب ذكي نصي للمحل — ويدجت الموقع + الواتساب.',
    description_fr: 'Adjoint intelligent texte pour boutique — widget site + WhatsApp.',
    featured: true,
    featuredBadge: 'الأكثر اختياراً للمحلات',
    featuredBadge_fr: 'Le plus choisi pour les boutiques',
    roi: 'من 3,500 أوقية/شهر',
    roi_fr: 'Dès 3 500 MRU/mois',
    features: STORE_DIAMOND_STD_FEATURES.slice(),
    features_fr: STORE_DIAMOND_STD_FEATURES_FR.slice(),
    price: 3500,
    durationDays: 30,
    discountPct: 5,
    maxCatalogItems: Infinity,
    diamond: true,
    isDiamond: true,
  };
}

function _storeDiamondProFields() {
  return {
    diamondTier: 'diamond_pro',
    audioAccess: true,
    quotaMessages: 2500,
    quotaMinutes: 150,
    aiModel: 'claude-3-5-sonnet',
    name: 'الماسية Pro للمحلات',
    name_ar: 'الماسية Pro للمحلات',
    description: 'نائب ذكي تفاعلي للمحل — نصي + صوتي + مكالمات آلية.',
    description_fr: 'Adjoint interactif boutique — texte + voix + appels automatiques.',
    featured: true,
    featuredBadge: 'Enterprise',
    featuredBadge_fr: 'Enterprise',
    roi: 'من 6,000 أوقية/شهر',
    roi_fr: 'Dès 6 000 MRU/mois',
    features: STORE_DIAMOND_PRO_FEATURES.slice(),
    features_fr: STORE_DIAMOND_PRO_FEATURES_FR.slice(),
    price: 6000,
    durationDays: 30,
    discountPct: 5,
    maxCatalogItems: Infinity,
    diamond: true,
    isDiamond: true,
  };
}

var OFFICE_DIAMOND_STD_FEATURES = [
  'موظف استقبال واستفسارات 24/7 (نصي)',
  'تنظيم طلبات الخدمات والمواعيد',
  '2,000 محادثة نصية شهرياً',
  'ويدجت الموقع + واتساب',
];

var OFFICE_DIAMOND_STD_FEATURES_FR = [
  'Agent d\'accueil et réponses 24h/24 (texte)',
  'Organisation des demandes de services et rendez-vous',
  '2 000 conversations texte / mois',
  'Widget site + WhatsApp',
];

var OFFICE_DIAMOND_PRO_FEATURES = [
  'موظف استقبال آلي مخصص (نصي + صوتي)',
  'رد آلي على الاتصالات',
  'إدارة المواعيد والاستشارات مع نموذج طلبات متقدم',
  '3,500 محادثة نصية + 200 دقيقة صوتية شهرياً',
];

var OFFICE_DIAMOND_PRO_FEATURES_FR = [
  'Agent d\'accueil automatique dédié (texte + voix)',
  'Réponse automatique aux appels',
  'Gestion des rendez-vous et consultations avec formulaire avancé',
  '3 500 conversations texte + 200 min voix / mois',
];

function _officeDiamondStandardFields() {
  return {
    diamondTier: 'diamond_standard',
    audioAccess: false,
    quotaMessages: 2000,
    quotaMinutes: 0,
    aiModel: 'claude-3-5-sonnet',
    name: 'الماسية الأساسية للمكاتب',
    name_ar: 'الماسية الأساسية للمكاتب',
    description: 'موظف استقبال واستفسارات نصي — الموقع + الواتساب.',
    description_fr: 'Agent d\'accueil texte — site + WhatsApp.',
    featured: true,
    featuredBadge: 'الأكثر اختياراً للمكاتب',
    featuredBadge_fr: 'Le plus choisi pour les bureaux',
    roi: 'من 4,000 أوقية/شهر',
    roi_fr: 'Dès 4 000 MRU/mois',
    features: OFFICE_DIAMOND_STD_FEATURES.slice(),
    features_fr: OFFICE_DIAMOND_STD_FEATURES_FR.slice(),
    price: 4000,
    durationDays: 30,
    discountPct: 5,
    maxCatalogItems: Infinity,
    diamond: true,
    isDiamond: true,
  };
}

function _officeDiamondProFields() {
  return {
    diamondTier: 'diamond_pro',
    audioAccess: true,
    quotaMessages: 3500,
    quotaMinutes: 200,
    aiModel: 'claude-3-5-sonnet',
    name: 'الماسية Pro للمكاتب',
    name_ar: 'الماسية Pro للمكاتب',
    description: 'موظف استقبال آلي — نصي + صوتي + مكالمات تفاعلية.',
    description_fr: 'Agent d\'accueil automatique — texte + voix + appels interactifs.',
    featured: true,
    featuredBadge: 'Enterprise',
    featuredBadge_fr: 'Enterprise',
    roi: 'من 7,500 أوقية/شهر',
    roi_fr: 'Dès 7 500 MRU/mois',
    features: OFFICE_DIAMOND_PRO_FEATURES.slice(),
    features_fr: OFFICE_DIAMOND_PRO_FEATURES_FR.slice(),
    price: 7500,
    durationDays: 30,
    discountPct: 5,
    maxCatalogItems: Infinity,
    diamond: true,
    isDiamond: true,
  };
}

var CORP_DIAMOND_STD_FEATURES = [
  'نائب ذكي نصي للشركة (موقع + واتساب)',
  '4,000 محادثة نصية شهرياً',
  'لوحة متابعة وتحليل الأداء لحظياً',
  'هوية مخصصة باسم شركتك',
];

var CORP_DIAMOND_STD_FEATURES_FR = [
  'Adjoint intelligent texte pour entreprise (site + WhatsApp)',
  '4 000 conversations texte / mois',
  'Tableau de bord et analyse en temps réel',
  'Identité personnalisée au nom de votre entreprise',
];

var CORP_DIAMOND_PRO_FEATURES = [
  'نائب ذكي تفاعلي للشركة (نصي + صوتي)',
  '7,000 محادثة نصية + 600 دقيقة صوتية شهرياً',
  'ويدجت الموقع + واتساب + مكالمات تفاعلية',
  'تكامل API / ERP',
  'لوحة متابعة وتحليل الأداء لحظياً',
];

var CORP_DIAMOND_PRO_FEATURES_FR = [
  'Adjoint interactif entreprise (texte + voix)',
  '7 000 conversations texte + 600 min voix / mois',
  'Widget site + WhatsApp + appels interactifs',
  'Intégration API / ERP',
  'Tableau de bord et analyse en temps réel',
];

function _corpDiamondStandardFields() {
  return {
    diamondTier: 'diamond_standard',
    audioAccess: false,
    quotaMessages: 4000,
    quotaMinutes: 0,
    aiModel: 'claude-3-5-sonnet',
    name: 'الماسية الأساسية للشركات',
    name_ar: 'الماسية الأساسية للشركات',
    description: 'نائب ذكي نصي للشركة — الموقع + الواتساب.',
    description_fr: 'Adjoint intelligent texte entreprise — site + WhatsApp.',
    featured: true,
    featuredBadge: 'الأكثر اختياراً للشركات',
    featuredBadge_fr: 'Le plus choisi pour les entreprises',
    roi: 'من 6,000 أوقية/شهر',
    roi_fr: 'Dès 6 000 MRU/mois',
    features: CORP_DIAMOND_STD_FEATURES.slice(),
    features_fr: CORP_DIAMOND_STD_FEATURES_FR.slice(),
    price: 6000,
    durationDays: 30,
    discountPct: 5,
    maxCatalogItems: Infinity,
    diamond: true,
    isDiamond: true,
  };
}

function _corpDiamondProFields() {
  return {
    diamondTier: 'diamond_pro',
    audioAccess: true,
    quotaMessages: 7000,
    quotaMinutes: 600,
    aiModel: 'claude-3-5-sonnet',
    name: 'الماسية Pro للشركات',
    name_ar: 'الماسية Pro للشركات',
    description: 'نائب ذكي تفاعلي — نصي + صوتي + تكامل API/ERP.',
    description_fr: 'Adjoint interactif — texte + voix + intégration API/ERP.',
    featured: true,
    featuredBadge: 'Enterprise',
    featuredBadge_fr: 'Enterprise',
    roi: 'من 15,000 أوقية/شهر',
    roi_fr: 'Dès 15 000 MRU/mois',
    features: CORP_DIAMOND_PRO_FEATURES.slice(),
    features_fr: CORP_DIAMOND_PRO_FEATURES_FR.slice(),
    price: 15000,
    durationDays: 30,
    discountPct: 5,
    maxCatalogItems: Infinity,
    diamond: true,
    isDiamond: true,
  };
}

function _isSegmentDiamond(pkg) {
  return /^(st|of|cp)-diam-(std|pro)$/.test(String(pkg && pkg.id || ''));
}

var FEATURE_FR = {
  'وصول كامل للمنصة': 'Accès complet à la plateforme',
  'استعراض الإعلانات': 'Parcourir les annonces',
  'دعم فني أساسي': 'Support technique de base',
  'شارة شركة مميّزة برزق': 'Badge entreprise premium Rizq',
  'عرض 30 إعلان': '30 annonces affichées',
  'إحصائيات شهرية': 'Statistiques mensuelles',
  'دعم بالأولوية': 'Support prioritaire',
  'كل مزايا الشهرية': 'Tous les avantages mensuels',
  'توفير 15% عن الشهري': 'Économisez 15% vs mensuel',
  'إعلانات غير محدودة': 'Annonces illimitées',
  'مدير حساب': 'Gestionnaire de compte',
  'كل مزايا الربعية': 'Tous les avantages trimestriels',
  'توفير 35% عن الشهري': 'Économisez 35% vs mensuel',
  'ميزات VIP حصرية': 'Avantages VIP exclusifs',
  'دعم 24/7': 'Support 24/7',
  'تقارير سنوية شاملة': 'Rapports annuels complets',
  'تصفّح وتصفية المناقصات المنشورة': 'Parcourir et filtrer les appels d\'offres',
  'بيانات التواصل مخفية/ضبابية': 'Coordonnées masquées / floutées',
  'تقديم العروض مقفول': 'Dépôt d\'offres verrouillé',
  'كشف بيانات تواصل صاحب المناقصة': 'Coordonnées de l\'émetteur révélées',
  'تقديم عروض غير محدود': 'Dépôt d\'offres illimité',
  'نشر مناقصات': 'Publier des appels d\'offres',
  'توفير 10% عن الشهري': 'Économisez 10% vs mensuel',
  'أولوية ظهور عروضك لأصحاب المناقصات': 'Priorité de vos offres auprès des émetteurs',
  'توفير 25% عن الشهري': 'Économisez 25% vs mensuel',
  'دعم VIP': 'Support VIP',
  'تنبيهات فورية SMS/واتساب للمناقصات الجديدة': 'Alertes SMS/WhatsApp pour les nouveaux appels d\'offres',
  'حتى 3 فيديوهات إعلانية ترويجية شهرياً (عرض منتجات متعددة)': 'Jusqu\'à 3 vidéos pub / mois (plusieurs produits)',
  'ظهور في قسم الإعلانات بالصفحة الرئيسية': 'Section publicitaire page d\'accueil',
  'إحصائيات أداء أساسية آلية': 'Statistiques de performance automatiques',
  'حتى 10 فيديوهات إعلانية ترويجية شهرياً': 'Jusqu\'à 10 vidéos pub / mois',
  'أولوية الترتيب في نتائج البحث': 'Priorité dans les résultats de recherche',
  'شارة «محتوى مميّز برزق» الموثّقة': 'Badge « contenu mis en avant Rizq »',
  'فيديوهات وعروض غير محدودة': 'Vidéos et campagnes illimitées',
  'ظهور مميز في القسم الرئيسي بالصفحة الرئيسية': 'Mise en avant sur la page d\'accueil',
  'تقارير تحليل أداء آلية مفصّلة': 'Rapports de performance détaillés',
  'دعم VIP ذو أولوية + شارة VIP موثّقة': 'Support VIP prioritaire + badge VIP',
  'شارة موثّق⁺ الرسمية بشعار رزق': 'Badge Vérifié⁺ officiel Rizq',
  'أعلى درجة ثقة — تحقق هوية مُعزَّز': 'Niveau de confiance maximal — identité renforcée',
  'تبرز فوق شارة التوثيق المجانية': 'Au-dessus du badge de vérification gratuit',
  'صالحة لمدة سنة كاملة': 'Valable une année complète',
  '10 منتجات': '10 produits',
  'شارة محل': 'Badge boutique',
  'تواصل مباشر': 'Contact direct',
  '30 منتج': '30 produits',
  'شارة مميّز برزق': 'Badge premium Rizq',
  'إحصائيات': 'Statistiques',
  'منتجات غير محدودة': 'Produits illimités',
  'أولوية في نتائج البحث': 'Priorité dans les résultats',
  'دعم مخصص': 'Support dédié',
  'كل مزايا Pro': 'Tous les avantages Pro',
  'خصم 37% عن السعر الشهري': '37% de réduction vs mensuel',
  'فوترة سنوية واحدة': 'Une seule facture annuelle'
};

function translateFeatureList(list, lang) {
  if (!Array.isArray(list)) return [];
  if (_normLang(lang) !== 'fr') return list.slice();
  return list.map(function (f) { return FEATURE_FR[f] || f; });
}

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
    { id: 'ind-free',    price: 0,    durationDays: 10, discountPct: 0, features: ['إعلان واحد نشط', 'حتى 5 صور للإعلان', 'ظهور في نتائج البحث العادية'] },
    { id: 'ind-boost',   price: 300,  durationDays: 30, boostDays: 3, discountPct: 0, period: 'MRU / لكل إعلان', features: ['تثبيت أعلى النتائج لمدة 3 أيام', 'حتى 5 صور للإعلان', 'شارة إعلان مميز'] },
    { id: 'ind-medium',  price: 1000, durationDays: 30, discountPct: 0, features: ['حتى 5 إعلانات نشطة شهرياً', 'حتى 5 صور لكل إعلان', 'إمكانيات الإدارة والتعديل طوال الشهر'],
      features_fr: ['Jusqu\'à 5 annonces actives par mois', 'Jusqu\'à 5 photos par annonce', 'Gestion et modification pendant tout le mois'] },
    { id: 'ind-monthly', price: 2000, durationDays: 30, discountPct: 2, highlight: true, features: ['حتى 10 إعلانات نشطة شهرياً', 'حتى 5 صور لكل إعلان', 'تجديد تلقائي للإعلانات'],
      features_fr: ['Jusqu\'à 10 annonces actives par mois', 'Jusqu\'à 5 photos par annonce', 'Renouvellement automatique des annonces'] }
  ],
  store: [
    { id: 'st-trial', price: 0, durationDays: 10, maxCatalogItems: 10, discountPct: 0, features: ['وصول كامل للمنصة', 'عرض 10 منتجات', 'دعم فني أساسي'],
      features_fr: ['Accès complet à la plateforme', '10 produits affichés', 'Support technique de base'] },
    { id: 'st-month', price: 2000, durationDays: 30, maxCatalogItems: 100, discountPct: 2, features: ['شارة محل مميّز برزق', 'عرض 100 منتج', 'إحصائيات شهرية', 'دعم بالأولوية'],
      features_fr: ['Badge boutique premium Rizq', '100 produits affichés', 'Statistiques mensuelles', 'Support prioritaire'] },
    { id: 'st-quart', price: 5500, durationDays: 90, maxCatalogItems: 500, discountPct: 3, features: ['كل مزايا الشهرية', 'توفير 15% عن الشهري', 'عرض 500 منتج', 'مدير حساب مخصص'],
      features_fr: ['Tous les avantages mensuels', '15% d\'économie vs mensuel', '500 produits affichés', 'Gestionnaire de compte dédié'] },
    { id: 'st-year', price: 15000, durationDays: 365, maxCatalogItems: Infinity, discountPct: 3, features: ['كل مزايا الربعية', 'توفير 35% عن الشهري', 'منتجات غير محدودة', 'دعم VIP 24/7', 'تقارير سنوية'],
      features_fr: ['Tous les avantages trimestriels', '35% d\'économie vs mensuel', 'Produits illimités', 'Support VIP 24/7', 'Rapports annuels'] },
    Object.assign({ id: 'st-diam-std' }, _storeDiamondStandardFields()),
    Object.assign({ id: 'st-diam-pro' }, _storeDiamondProFields())
  ],
  office: [
    { id: 'of-trial', price: 0, durationDays: 10, maxCatalogItems: 3, discountPct: 0,
      features: ['عرض حتى 3 خدمات نشطة', 'صفحة المكتب', 'طلبات تواصل'],
      features_fr: ['Jusqu\'à 3 services actifs', 'Page du bureau', 'Demandes de contact'] },
    { id: 'of-month', price: 3500, durationDays: 30, discountPct: 2, highlight: true,
      features: ['شارة مكتب موثوق', 'نظام حجز المواعيد', 'فيديو تعريفي مشمول'],
      features_fr: ['Badge bureau vérifié', 'Système de prise de rendez-vous', 'Vidéo de présentation incluse'] },
    { id: 'of-quart', price: 9000, durationDays: 90, maxCatalogItems: Infinity, discountPct: 3,
      features: ['توفير 14%', 'عرض خدمات غير محدود', 'مدير حساب مخصص'],
      features_fr: ['Économisez 14%', 'Services illimités', 'Gestionnaire de compte dédié'] },
    { id: 'of-year', price: 28000, durationDays: 365, maxCatalogItems: Infinity, discountPct: 3,
      features: ['توفير 33%', 'فيديو تعريفي مشمول + 1 إضافي مجاناً', 'أولوية الدعم'],
      features_fr: ['Économisez 33%', 'Vidéo incluse + 1 gratuite supplémentaire', 'Support prioritaire'] },
    Object.assign({ id: 'of-diam-std' }, _officeDiamondStandardFields()),
    Object.assign({ id: 'of-diam-pro' }, _officeDiamondProFields())
  ],
  corp: [
    { id: 'cp-trial', price: 0,     durationDays: 3,   discountPct: 0, features: ['وصول كامل للمنصة', 'استعراض الإعلانات', 'دعم فني أساسي'] },
    { id: 'cp-month', price: 3500,  durationDays: 30,  discountPct: 2, features: ['شارة شركة مميّزة برزق', 'عرض 30 إعلان', 'إحصائيات شهرية', 'دعم بالأولوية'] },
    { id: 'cp-quart', price: 9000,  durationDays: 90,  discountPct: 3, features: ['كل مزايا الشهرية', 'توفير 15% عن الشهري', 'إعلانات غير محدودة', 'مدير حساب'] },
    { id: 'cp-year',  price: 25000, durationDays: 365, discountPct: 3, features: ['كل مزايا الربعية', 'توفير 35% عن الشهري', 'ميزات VIP حصرية', 'دعم 24/7', 'تقارير سنوية شاملة'] },
    Object.assign({ id: 'cp-diam-std' }, _corpDiamondStandardFields()),
    Object.assign({ id: 'cp-diam-pro' }, _corpDiamondProFields())
  ],
  video: [
    { id: 'vid-single',   price: 1500,  durationDays: 10, discountPct: 0, maxVideosPerMonth: 1, payPerAd: true, period: 'MRU / إعلان · 10 أيام', period_fr: 'MRU / annonce · 10 jours', features: ['فيديو إعلاني واحد لمدة 10 أيام', 'ظهور في قسم الإعلانات بالصفحة الرئيسية', 'دفع لكل إعلان — بلا اشتراك شهري'], features_fr: ['Une vidéo publicitaire pendant 10 jours', 'Section publicitaire page d\'accueil', 'Paiement par annonce — sans abonnement mensuel'], cta_fr: 'Acheter une annonce vidéo' },
    { id: 'vid-basic',    price: 5000,  durationDays: 30, discountPct: 0, maxVideosPerMonth: 3, features: ['حتى 3 فيديوهات إعلانية ترويجية شهرياً (عرض منتجات متعددة)', 'ظهور في قسم الإعلانات بالصفحة الرئيسية', 'إحصائيات أداء أساسية آلية'] },
    { id: 'vid-pro',      price: 12000, durationDays: 30, discountPct: 0, maxVideosPerMonth: 10, features: ['حتى 10 فيديوهات إعلانية ترويجية شهرياً', 'أولوية الترتيب في نتائج البحث', 'شارة «محتوى مميّز برزق» الموثّقة'] },
    { id: 'vid-business', price: 25000, durationDays: 30, discountPct: 0, maxVideosPerMonth: Infinity, features: ['فيديوهات وعروض غير محدودة', 'ظهور مميز في القسم الرئيسي بالصفحة الرئيسية', 'تقارير تحليل أداء آلية مفصّلة', 'دعم VIP ذو أولوية + شارة VIP موثّقة'] }
  ],
  tender: [
    { id: 'tnd-trial', price: 0,     durationDays: 10,  discountPct: 0, features: ['تصفّح وتصفية المناقصات المنشورة', 'بيانات التواصل مخفية/ضبابية', 'تقديم العروض مقفول'] },
    { id: 'tnd-month', price: 5000,  durationDays: 30,  discountPct: 0, features: ['كشف بيانات تواصل صاحب المناقصة', 'تقديم عروض غير محدود', 'نشر مناقصات'] },
    { id: 'tnd-quart', price: 13500, durationDays: 90,  discountPct: 10, features: ['كل مزايا الشهرية', 'توفير 10% عن الشهري', 'أولوية ظهور عروضك لأصحاب المناقصات'] },
    { id: 'tnd-year',  price: 45000, durationDays: 365, discountPct: 25, features: ['كل مزايا الربعية', 'توفير 25% عن الشهري', 'دعم VIP', 'تنبيهات فورية SMS/واتساب للمناقصات الجديدة'] }
  ],
  verified_plus: [
    { id: 'vp-year', price: 5000, durationDays: 365, discountPct: 0, features: ['شارة موثّق⁺ الرسمية بشعار رزق', 'أعلى درجة ثقة — تحقق هوية مُعزَّز', 'تبرز فوق شارة التوثيق المجانية', 'صالحة لمدة سنة كاملة'] }
  ]
};

// aliases — نفس باقات الفيديو (Rizq ADS / Media)
CATALOGS.ads = CATALOGS.video;
CATALOGS.media = CATALOGS.video;

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
    var meta = CATALOG_REGISTRY[k] || {};
    if ((k === 'ads' || k === 'media') && !meta.lsKey) {
      meta = Object.assign({}, meta, { lsKey: 'rizq_video_packages', accType: 'video' });
    }
    registerCatalogMapping(k, meta);
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
  if (/diam-pro|diamond[_-]?pro/.test(id)) return 'diamond_pro';
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
  var id = String((pkg && pkg.id) || '');
  if (days >= 360) return lang === 'fr' ? '12 mois' : '12 شهر';
  if (days >= 80) return lang === 'fr' ? '3 mois' : '3 أشهر';
  if (days >= 30 && (id.indexOf('-month') !== -1 || id === 'ind-medium' || id === 'ind-monthly' || id.indexOf('-quart') !== -1)) {
    return lang === 'fr' ? 'mois' : 'شهر';
  }
  if (days <= 31) return lang === 'fr' ? (days + ' jours') : (days + (days === 10 ? ' أيام' : ' يوماً'));
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
      out.features_fr = translateFeatureList(out.features_fr, 'fr');
    } else {
      out.features_fr = translateFeatureList(out.features, 'fr');
    }
    out.cta_fr = out.cta_fr || _defaultCta(out, 'fr');
    out.cta = lang === 'fr' ? out.cta_fr : (out.cta || _defaultCta(out, 'ar'));
    return out;
  }
  if (_isSegmentDiamond(out)) {
    var segTier = resolveDiamondTierFromPkg(out) || 'diamond_standard';
    var segPro = segTier === 'diamond_pro';
    var segName = NAMES[out.id] || {};
    out.diamondTier = segTier;
    out.audioAccess = segPro;
    out.name = lang === 'fr' ? (out.name_fr || segName.fr || segName.ar || out.name) : (out.name_ar || segName.ar || out.name);
    out.name_fr = out.name_fr || segName.fr || segName.ar || out.name;
    out.name_ar = out.name_ar || segName.ar || out.name;
    out.features = Array.isArray(out.features) && out.features.length ? out.features.slice() : [];
    out.features_fr = Array.isArray(out.features_fr) && out.features_fr.length ? out.features_fr.slice() : [];
    out.diamond = true;
    out.isDiamond = true;
    out.featured = true;
    out.duration = out.duration || _durationLabel(out, lang);
    out.period = periodLabel({ price: out.price, durationDays: out.durationDays || 30 }, lang);
    out.period_fr = periodLabel({ price: out.price, durationDays: out.durationDays || 30 }, 'fr');
    out.cta = lang === 'fr'
      ? (out.cta_fr || (segPro ? 'Choisir Diamant Pro' : 'Choisir Diamant Standard'))
      : (out.cta || (segPro ? 'اشترك في الماسية Pro' : 'اشترك في الماسية الأساسية'));
    out.cta_fr = out.cta_fr || (segPro ? 'Choisir Diamant Pro' : 'Choisir Diamant Standard');
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

/** Bump when code defaults change — triggers localStorage re-seed on next page load */
var CATALOG_SYNC_REVISION = '2026-08-27-vid-single';
var CATALOG_SYNC_LS_KEY = 'rizq_catalog_sync_revision';
var STALE_PKG_FEATURE_MARKERS = [
  'فيديو إعلاني واحد',
  'مدير حساب مخصص',
  'دعم تحرير أساسي',
  'محتوى مرئي موثّق',
  '16% عن الشهري',
  'إحصائيات مشاهdات أساسية',
  'إحصائيات مشاهدات أساسية'
];
var STALE_TENDER_PRICES = { 'tnd-month': 2500, 'tnd-quart': 6300, 'tnd-year': 19000 };

function _stampCatalogRev(pkg) {
  var out = Object.assign({}, pkg);
  out._catalogRev = CATALOG_SYNC_REVISION;
  return out;
}

function _pkgNeedsDefaultRefresh(livePkg, base) {
  if (!base || !base.id) return false;
  if (livePkg._catalogRev === CATALOG_SYNC_REVISION) return false;
  if (base.price != null && Number(livePkg.price) !== Number(base.price)) return true;
  if (STALE_TENDER_PRICES[base.id] != null && Number(livePkg.price) === STALE_TENDER_PRICES[base.id]) return true;
  if (/^vid-/.test(base.id) && base.maxVideosPerMonth != null) {
    var liveMax = livePkg.maxVideosPerMonth;
    if (liveMax == null || Number(liveMax) !== Number(base.maxVideosPerMonth)) return true;
  }
  var featStr = (Array.isArray(livePkg.features) ? livePkg.features : []).join(' ');
  for (var i = 0; i < STALE_PKG_FEATURE_MARKERS.length; i++) {
    if (featStr.indexOf(STALE_PKG_FEATURE_MARKERS[i]) !== -1) return true;
  }
  return false;
}

function _mergeLive(defaults, live) {
  if (!Array.isArray(defaults) || !defaults.length) return [];
  if (!Array.isArray(live) || !live.length) {
    return defaults.map(function (p) { return _stampCatalogRev(p); });
  }
  var byId = {};
  defaults.forEach(function (p) { byId[p.id] = p; });
  var seenIds = {};
  var merged = live.filter(function (p) { return p && p.active !== false; }).map(function (livePkg) {
    var base = (livePkg.id && byId[livePkg.id]) ? byId[livePkg.id] : {};
    if (livePkg.id) seenIds[livePkg.id] = true;
    var refresh = _pkgNeedsDefaultRefresh(livePkg, base);
    var diamond = isDiamondPackage(livePkg) || isDiamondPackage(base);
    var pkgId = String(livePkg.id || base.id || '');
    var nameHit = pkgId && NAMES[pkgId] ? NAMES[pkgId] : null;
    var tier = resolveDiamondTierFromPkg(livePkg) || resolveDiamondTierFromPkg(base);
    var tierFields = diamond ? _diamondTierFields(tier || 'diamond_standard', livePkg.price != null ? livePkg.price : base.price) : null;
    return _stampCatalogRev({
      id: pkgId,
      price: refresh && base.price != null ? Number(base.price) : (livePkg.price != null ? Number(livePkg.price) : (base.price || 0)),
      durationDays: livePkg.durationDays != null ? Number(livePkg.durationDays) : (base.durationDays || 30),
      maxCatalogItems: refresh && base.maxCatalogItems != null ? base.maxCatalogItems : (livePkg.maxCatalogItems != null ? livePkg.maxCatalogItems : base.maxCatalogItems),
      maxVideosPerMonth: refresh && base.maxVideosPerMonth != null ? base.maxVideosPerMonth : (livePkg.maxVideosPerMonth != null ? livePkg.maxVideosPerMonth : base.maxVideosPerMonth),
      boostDays: livePkg.boostDays != null ? Number(livePkg.boostDays) : (base.boostDays || 0),
      discountPct: livePkg.discountPct != null ? Number(livePkg.discountPct) : (base.discountPct || 0),
      diamondTier: tier || base.diamondTier,
      audioAccess: diamond ? tier === 'diamond_pro' : base.audioAccess,
      features: diamond
        ? (base.features || tierFields.features).slice()
        : (refresh ? (base.features || []).slice() : (Array.isArray(livePkg.features) && livePkg.features.length ? livePkg.features.slice() : (base.features || []))),
      features_fr: diamond
        ? ((base.features_fr && base.features_fr.length) ? base.features_fr.slice() : (tier === 'diamond_pro' ? DIAMOND_PRO_FEATURES_FR : DIAMOND_STANDARD_FEATURES_FR).slice())
        : (refresh ? (base.features_fr || []).slice() : (Array.isArray(livePkg.features_fr) && livePkg.features_fr.length ? livePkg.features_fr.slice() : (base.features_fr || []))),
      name: diamond
        ? (base.name || tierFields.name)
        : (refresh ? (base.name || (nameHit && nameHit.ar) || livePkg.name || '') : (livePkg.name || base.name || (nameHit && nameHit.ar) || '')),
      name_fr: diamond
        ? (base.name_fr || (tier === 'diamond_pro' ? NAMES.diamond_pro.fr : NAMES.diamond_standard.fr))
        : (refresh ? (base.name_fr || (nameHit && nameHit.fr) || livePkg.name_fr || '') : (livePkg.name_fr || base.name_fr || (nameHit && nameHit.fr) || '')),
      description: diamond ? (base.description || tierFields.description) : (livePkg.description || base.description || ''),
      description_fr: diamond ? (base.description_fr || tierFields.description) : (livePkg.description_fr || base.description_fr || ''),
      featured: diamond ? true : !!(livePkg.featured || base.highlight),
      highlight: !!(livePkg.highlight || base.highlight),
      featuredBadge: diamond ? (base.featuredBadge || tierFields.featuredBadge) : (livePkg.featuredBadge || ''),
      featuredBadge_fr: diamond ? (base.featuredBadge_fr || tierFields.featuredBadge) : (livePkg.featuredBadge_fr || base.featuredBadge_fr || ''),
      roi: diamond ? (base.roi || tierFields.roi) : (livePkg.roi || ''),
      roi_fr: diamond ? (base.roi_fr || tierFields.roi) : (livePkg.roi_fr || base.roi_fr || ''),
      period: livePkg.period || base.period || '',
      cta: livePkg.cta || base.cta || '',
      cta_fr: livePkg.cta_fr || base.cta_fr || '',
      active: livePkg.active !== false
    });
  });
  defaults.forEach(function (base) {
    if (base.id && !seenIds[base.id] && base.active !== false) {
      merged.push(_stampCatalogRev(base));
    }
  });
  return merged;
}

function ensureCatalogStorageFresh(force) {
  if (typeof localStorage === 'undefined') return false;
  var storedRev = localStorage.getItem(CATALOG_SYNC_LS_KEY);
  if (!force && storedRev === CATALOG_SYNC_REVISION) return false;
  Object.keys(CATALOGS).forEach(function (catalogKey) {
    if (catalogKey === 'ads' || catalogKey === 'media') return;
    var lsKey = getCatalogLsKey(catalogKey);
    if (!lsKey) return;
    var merged = _mergeLive(_defaultsFor(catalogKey), _readBrowserCatalog(catalogKey) || []);
    try {
      localStorage.setItem(lsKey, JSON.stringify(merged));
    } catch (e) { /* ignore quota */ }
  });
  try {
    localStorage.setItem(CATALOG_SYNC_LS_KEY, CATALOG_SYNC_REVISION);
  } catch (e) { /* ignore */ }
  return true;
}

var _catalogFreshChecked = false;
var _remoteCatalogCache = {};
var _lastCatalogSyncMs = 0;
var _catalogSyncPromise = null;
var CATALOG_SYNC_TTL_MS = 45000;

function _resolveBackendBase() {
  var base = '';
  if (typeof globalThis !== 'undefined' && typeof globalThis.RIZQ_BACKEND_BASE === 'string' && globalThis.RIZQ_BACKEND_BASE) {
    base = globalThis.RIZQ_BACKEND_BASE;
  } else if (typeof window !== 'undefined' && typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE) {
    base = window.RIZQ_BACKEND_BASE;
  }
  if (!base && typeof location !== 'undefined' && /^https?:/.test(location.protocol || '')) {
    base = location.origin;
  }
  return String(base || '').replace(/\/$/, '');
}

function _applyRemoteCatalogPackages(pkgs) {
  if (!pkgs || typeof pkgs !== 'object') return false;
  var now = Date.now();
  var applied = false;
  Object.keys(pkgs).forEach(function (catalogKey) {
    var list = pkgs[catalogKey];
    if (!Array.isArray(list) || !list.length) return;
    _remoteCatalogCache[catalogKey] = { fetchedAt: now, packages: list.slice() };
    if (typeof localStorage !== 'undefined') {
      var lsKey = getCatalogLsKey(catalogKey);
      if (lsKey) {
        try { localStorage.setItem(lsKey, JSON.stringify(list)); } catch (e) { /* ignore quota */ }
      }
    }
    applied = true;
  });
  if (applied) {
    _lastCatalogSyncMs = now;
    try {
      localStorage.setItem(CATALOG_SYNC_LS_KEY, CATALOG_SYNC_REVISION);
    } catch (e) { /* ignore */ }
    if (typeof document !== 'undefined' && typeof CustomEvent === 'function') {
      try {
        document.dispatchEvent(new CustomEvent('rizq:catalogsync', { detail: { fetchedAt: now } }));
      } catch (eEv) { /* ignore */ }
    }
  }
  return applied;
}

/** مزامنة الباقات من GET /api/site-config — للويدجت وأي صفحة بلا rizq_packages_ui */
function syncCatalogFromBackend(opts) {
  opts = opts || {};
  var force = !!opts.force;
  if (typeof fetch === 'undefined') {
    return Promise.resolve(false);
  }
  var base = _resolveBackendBase();
  if (!base) return Promise.resolve(false);
  var now = Date.now();
  if (!force && _catalogSyncPromise) return _catalogSyncPromise;
  if (!force && _lastCatalogSyncMs && (now - _lastCatalogSyncMs) < CATALOG_SYNC_TTL_MS) {
    return Promise.resolve(true);
  }
  _catalogSyncPromise = fetch(base + '/api/site-config')
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      var pkgs = data && data.ok && data.config && data.config.packages;
      return _applyRemoteCatalogPackages(pkgs);
    })
    .catch(function () { return false; })
    .finally(function () { _catalogSyncPromise = null; });
  return _catalogSyncPromise;
}

function getCatalog(catalogKey, lang) {
  if (!_catalogFreshChecked && typeof localStorage !== 'undefined') {
    _catalogFreshChecked = true;
    ensureCatalogStorageFresh();
  }
  var key = catalogKey || PUBLIC_CATALOG;
  var defaults = _defaultsFor(key);
  var live = null;
  if (_remoteCatalogCache[key] && Array.isArray(_remoteCatalogCache[key].packages) && _remoteCatalogCache[key].packages.length) {
    live = _remoteCatalogCache[key].packages;
  }
  if (!live) live = _readSiteConfigCatalog(key) || _readBrowserCatalog(key);
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

function catalogPackageLabel(id, lang) {
  lang = _normLang(lang);
  var hit = id && NAMES[id] ? NAMES[id] : null;
  if (!hit) return '';
  return hit[lang] || hit.ar || hit.fr || '';
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
  var rawFr = pkg.name_fr ? String(pkg.name_fr).trim() : '';
  if (typeof global.RizqLocale !== 'undefined') {
    return global.RizqLocale.pickBilingual({ ar: raw, fr: rawFr, lang: lang }).text;
  }
  if (lang === 'fr') {
    if (rawFr && !_hasArabic(rawFr)) return rawFr;
    if (hit && hit.map.fr) return hit.map.fr;
    if (raw && !_hasArabic(raw)) return raw;
    return (hit && hit.map.fr) || rawFr || raw;
  }
  if (lang === 'ar') {
    if (raw && !isBlank(raw)) return raw;
    if (rawFr && !_hasArabic(rawFr)) return rawFr;
  }
  if (raw && raw !== String(pkg.id || '') && !/^[a-z]{2,}-[a-z0-9-]+$/i.test(raw)) return raw;
  if (hit && hit.map.ar) return hit.map.ar;
  return raw || rawFr || (pkg && pkg.id) || '';
}

function isBlank(s) { return !String(s == null ? '' : s).trim(); }

var PERIODS = {
  ar: { freeDays: '{n} أيام', month: 'شهرياً', quarter: '3 أشهر', year: 'سنوياً', perAd: 'لكل إعلان' },
  fr: { freeDays: '{n} jours', month: 'par mois', quarter: '3 mois', year: 'par an', perAd: 'par annonce' },
  en: { freeDays: '{n} days', month: 'per month', quarter: '3 months', year: 'per year', perAd: 'per listing' },
  es: { freeDays: '{n} días', month: 'por mes', quarter: '3 meses', year: 'por año', perAd: 'por anuncio' },
  hs: { freeDays: '{n} أيام', month: 'شهرياً', quarter: '3 أشهر', year: 'سنوياً', perAd: 'لكل إعلان' }
};

function periodLabel(pkg, lang) {
  lang = _normLang(lang);
  pkg = pkg || {};
  var t = (PERIODS && (PERIODS[lang] || PERIODS.ar)) || { freeDays: '{n}', month: '', quarter: '', year: '', perAd: '' };
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
  if (pkg.id && String(pkg.id).indexOf('boost') !== -1) return t.perAd;
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
    return p.name + ' — ' + p.priceLabel;
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
    var feats = (p.features || []).map(function (f) { return f; }).join('\n');
    return p.name + ' — ' + p.priceLabel + (feats ? ':\n' + feats : '');
  });
  return title + '\n\n' + blocks.join('\n\n');
}

function buildDiamondTiersPromptBlock(lang) {
  return (
    '=== DIAMOND TIERS — LIVE DATA ONLY ===\n' +
    'When user asks about Diamond / الماسية / Pro vs Standard:\n' +
    '- Call get_packages_info with lang AND catalog (store|office|corp) when user mentions محل/متجر, مكتب, or شركة.\n' +
    '- Explain BOTH tiers from tool results for THAT catalog only — never quote store prices for office questions.\n' +
    '- Key difference: Pro includes interactive voice calls; Standard is text-only.\n' +
    '- Never quote 5000 or 10000 unless those exact values appear in get_packages_info for that catalog.\n' +
    '- Finish with a plain-text comparison (name — price — channels — voice yes/no).\n'
  );
}

function buildLiveCatalogPolicyBlock() {
  return (
    '=== LIVE CATALOG POLICY (MANDATORY — NO STATIC PRICES) ===\n' +
    'You are STRICTLY FORBIDDEN from guessing or recalling package prices from memory or training data.\n' +
    'For ANY question about packages, pricing, subscriptions, features, Diamond tiers, or "how much":\n' +
    '1. You MUST call get_packages_info FIRST before stating any price, plan name, or feature list.\n' +
    '2. Pass catalog=store when user says محل/متجر; catalog=office for مكتب/للمكاتب; catalog=corp for شركة.\n' +
    '3. Quote ONLY prices returned by get_packages_info for the matched catalog (Western digits 0-9, plain text).\n' +
    '4. Catalogs differ (general, store, office, corp) — NEVER mix or fallback store prices when office/corp was asked.\n' +
    '5. If live tool data is missing in context, say you are fetching official data — NEVER invent MRU amounts.\n'
  );
}

function buildPackagesPromptBlock() {
  return buildLiveCatalogPolicyBlock();
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
    return p.name + ': ' + (lang === 'fr' || lang === 'en' || lang === 'es' ? 'up to ' : 'حتى ') + p.discountPct + '%' + cap;
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
  var pkgs = getCatalog(PUBLIC_CATALOG, lang);
  var stdPkg = pkgs.filter(function (p) { return p.id === 'diamond_standard'; })[0];
  var proPkg = pkgs.filter(function (p) { return p.id === 'diamond_pro'; })[0];
  var stdPrice = stdPkg ? stdPkg.price : 5000;
  var proPrice = proPkg ? proPkg.price : 10000;
  var std = diamondCopy(lang, 'diamond_standard', stdPrice);
  var pro = diamondCopy(lang, 'diamond_pro', proPrice);
  function block(copy, pkg) {
    var label = pkg ? priceLabel(pkg, lang) : String(copy.price || '') + ' MRU';
    return copy.name + ' — ' + label + '\n' + copy.description + '\n' + copy.features.map(function (f) { return f; }).join('\n');
  }
  return block(std, stdPkg) + '\n\n' + block(pro, proPkg);
}

var API = {
  PUBLIC_CATALOG: PUBLIC_CATALOG,
  CATALOGS: CATALOGS,
  CATALOG_SYNC_REVISION: CATALOG_SYNC_REVISION,
  ensureCatalogStorageFresh: ensureCatalogStorageFresh,
  syncCatalogFromBackend: syncCatalogFromBackend,
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
  catalogPackageLabel: catalogPackageLabel,
  priceLabel: priceLabel,
  buildPublicSummary: buildPublicSummary,
  buildPublicOverview: buildPublicOverview,
  buildLiveCatalogPolicyBlock: buildLiveCatalogPolicyBlock,
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
if (typeof localStorage !== 'undefined') {
  try { ensureCatalogStorageFresh(); } catch (e) { /* ignore */ }
}
