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
  diamond:   { ar: 'الماسية 💎 (النائب الذكي الشامل)', fr: 'Diamant 💎 (Adjoint intelligent complet)', en: 'Diamond 💎 (Full smart deputy)', es: 'Diamante 💎 (Adjunto inteligente)', hs: 'الماسية 💎 (النائب الذكي الشامل)' },
  'ind-free':    { ar: 'مجانية', fr: 'Gratuit', en: 'Free', es: 'Gratis', hs: 'مجانية' },
  'ind-boost':   { ar: 'مميزة', fr: 'Mise en avant', en: 'Boost', es: 'Destacado', hs: 'مميزة' },
  'ind-monthly': { ar: 'باقة شهرية', fr: 'Mensuel', en: 'Monthly', es: 'Mensual', hs: 'باقة شهرية' },
  'st-trial': { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
  'st-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'st-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'st-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'st-diam':  { ar: 'الماسية 💎 (النائب الذكي الشامل)', fr: 'Diamant 💎 (Adjoint intelligent complet)', en: 'Diamond 💎 (Full smart deputy)', es: 'Diamante 💎 (Adjunto inteligente)', hs: 'الماسية 💎 (النائب الذكي الشامل)' },
  'cp-trial': { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
  'cp-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'cp-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'cp-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'cp-diam':  { ar: 'الماسية 💎 (النائب الذكي الشامل)', fr: 'Diamant 💎 (Adjoint intelligent complet)', en: 'Diamond 💎 (Full smart deputy)', es: 'Diamante 💎 (Adjunto inteligente)', hs: 'الماسية 💎 (النائب الذكي الشامل)' },
  'of-trial': { ar: 'تجريبية', fr: 'Essai', en: 'Trial', es: 'Prueba', hs: 'تجريبية' },
  'of-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'of-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'of-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'of-diam':  { ar: 'الماسية 💎 (النائب الذكي الشامل)', fr: 'Diamant 💎 (Adjoint intelligent complet)', en: 'Diamond 💎 (Full smart deputy)', es: 'Diamante 💎 (Adjunto inteligente)', hs: 'الماسية 💎 (النائب الذكي الشامل)' },
  'vid-basic':    { ar: 'أساسي (فيديو)', fr: 'Basique (vidéo)', en: 'Basic (video)', es: 'Básico (video)', hs: 'أساسي (فيديو)' },
  'vid-pro':      { ar: 'احترافي (فيديو)', fr: 'Pro (vidéo)', en: 'Pro (video)', es: 'Pro (video)', hs: 'احترافي (فيديو)' },
  'vid-business': { ar: 'أعمال ومعارض', fr: 'Business & showrooms', en: 'Business & showrooms', es: 'Negocios y showrooms', hs: 'أعمال ومعارض' },
  'tnd-month': { ar: 'شهرية', fr: 'Mensuelle', en: 'Monthly', es: 'Mensual', hs: 'شهرية' },
  'tnd-quart': { ar: 'ربعية', fr: 'Trimestrielle', en: 'Quarterly', es: 'Trimestral', hs: 'ربعية' },
  'tnd-year':  { ar: 'سنوية', fr: 'Annuelle', en: 'Yearly', es: 'Anual', hs: 'سنوية' },
  'vp-year':   { ar: 'موثّق⁺ سنوية', fr: 'Vérifié⁺ annuel', en: 'Verified+ yearly', es: 'Verificado⁺ anual', hs: 'موثّق⁺ سنوية' }
};

var DIAMOND_FEATURES = [
  '🤖 نائب ذكي حصري يتحدث باسم منشأتك وبكفاءة بشرية فائقة.',
  '🎙️ استجابة صوتية ونصية فورية عبر الواتساب، الويدجت، والمكالمات.',
  '🛡️ استقلالية وهوية خاصة كاملة دون إظهار أي إشارة لمنصة رزق.',
  '📊 لوحة متابعة وتحليل لحظية لجميع المحادثات والمبيعات.',
  '⚡ حزمة الاستخدام العادل: 120 دقيقة مكالمات + 500 محادثة متقدمة شهرياً.'
];

var DIAMOND_FEATURES_FR = [
  '🤖 Un adjoint exclusif qui parle au nom de votre établissement, avec une précision humaine.',
  '🎙️ Réponse vocale et écrite immédiate via WhatsApp, le chat du site et les appels.',
  '🛡️ Identité indépendante complète — sans aucune mention de la plateforme Rizq.',
  '📊 Suivi en temps réel de toutes les conversations et des ventes.',
  '⚡ Usage équitable : 120 minutes d\'appels + 500 conversations avancées par mois.'
];

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

function _diamondCatalogFields() {
  return {
    name: DIAMOND_MARKETING.name.ar,
    description: DIAMOND_MARKETING.description.ar,
    featured: true,
    featuredBadge: DIAMOND_MARKETING.featuredBadge.ar,
    roi: DIAMOND_MARKETING.roi.ar,
    features: DIAMOND_FEATURES.slice()
  };
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
    Object.assign({ id: 'diamond', price: 5000, durationDays: 30, discountPct: 5 }, _diamondCatalogFields())
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
    Object.assign({ id: 'st-diam', price: 3500, durationDays: 30, discountPct: 5 }, _diamondCatalogFields())
  ],
  office: [
    { id: 'of-trial', price: 0,     durationDays: 3,   discountPct: 0, features: ['عرض الخدمات', 'صفحة المكتب', 'طلبات تواصل', 'دعم فني أساسي'] },
    { id: 'of-month', price: 3500,  durationDays: 30,  discountPct: 2, features: ['جميع المزايا', 'شارة موثّق', 'إحصائيات', 'فيديو تعريفي مشمول', 'دعم بالأولوية'] },
    { id: 'of-quart', price: 9000,  durationDays: 90,  discountPct: 3, features: ['توفير 14%', 'جميع المزايا', 'فيديو تعريفي مشمول', 'مدير حساب مخصص'] },
    { id: 'of-year',  price: 28000, durationDays: 365, discountPct: 3, features: ['توفير 33%', 'أفضل قيمة', 'فيديو مشمول + 1 إضافي مجاني', 'أولوية الدعم'] },
    Object.assign({ id: 'of-diam', price: 5000, durationDays: 30, discountPct: 5 }, _diamondCatalogFields())
  ],
  corp: [
    { id: 'cp-trial', price: 0,     durationDays: 3,   discountPct: 0, features: ['وصول كامل للمنصة', 'استعراض الإعلانات', 'دعم فني أساسي'] },
    { id: 'cp-month', price: 3500,  durationDays: 30,  discountPct: 2, features: ['شارة شركة مميّزة برزق', 'عرض 30 إعلان', 'إحصائيات شهرية', 'دعم بالأولوية'] },
    { id: 'cp-quart', price: 9000,  durationDays: 90,  discountPct: 3, features: ['كل مزايا الشهرية', 'توفير 15% عن الشهري', 'إعلانات غير محدودة', 'مدير حساب'] },
    { id: 'cp-year',  price: 25000, durationDays: 365, discountPct: 3, features: ['كل مزايا الربعية', 'توفير 35% عن الشهري', 'ميزات VIP حصرية', 'دعم 24/7', 'تقارير سنوية شاملة'] },
    Object.assign({ id: 'cp-diam', price: 6000, durationDays: 30, discountPct: 5 }, _diamondCatalogFields())
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
  var blob = [pkg.id, pkg.name, pkg.name_fr, pkg.cta, pkg.cta_fr].filter(Boolean).join(' ');
  return /(ماس|diamond|diamant)/i.test(blob);
}

function _pickCopy(map, lang) {
  lang = _normLang(lang);
  if (!map) return '';
  if (typeof map === 'string') return map;
  return map[lang] || map.ar || '';
}

function diamondCopy(lang) {
  lang = _normLang(lang);
  return {
    name: _pickCopy(DIAMOND_MARKETING.name, lang),
    description: _pickCopy(DIAMOND_MARKETING.description, lang),
    featuredBadge: _pickCopy(DIAMOND_MARKETING.featuredBadge, lang),
    roi: _pickCopy(DIAMOND_MARKETING.roi, lang),
    features: lang === 'fr' ? DIAMOND_FEATURES_FR.slice() : DIAMOND_FEATURES.slice()
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

function enrichForDisplay(pkg, lang) {
  var out = Object.assign({}, pkg || {});
  if (!isDiamondPackage(out)) {
    if (!out.name) out.name = localizedName(out, lang);
    if (!out.duration) out.duration = _durationLabel(out, lang);
    if (!out.period) out.period = periodLabel(out, lang);
    return out;
  }
  var copy = diamondCopy(lang);
  out.name = copy.name;
  out.name_fr = DIAMOND_MARKETING.name.fr;
  out.description = copy.description;
  out.description_fr = DIAMOND_MARKETING.description.fr;
  out.featuredBadge = copy.featuredBadge;
  out.featuredBadge_fr = DIAMOND_MARKETING.featuredBadge.fr;
  out.roi = copy.roi;
  out.roi_fr = DIAMOND_MARKETING.roi.fr;
  out.features = copy.features;
  out.features_fr = DIAMOND_FEATURES_FR.slice();
  out.diamond = true;
  out.isDiamond = true;
  out.featured = true;
  out.duration = _durationLabel(out, lang);
  out.period = periodLabel({ price: out.price, durationDays: out.durationDays || 30 }, lang);
  out.period_fr = periodLabel({ price: out.price, durationDays: out.durationDays || 30 }, 'fr');
  out.cta = lang === 'fr' ? 'Choisir le Diamant' : 'اشترك في الماسية';
  out.cta_fr = 'Choisir le Diamant';
  return out;
}

function _mergeLive(defaults, live) {
  if (!Array.isArray(live) || !live.length) return defaults;
  var byId = {};
  defaults.forEach(function (p) { byId[p.id] = p; });
  return live.filter(function (p) { return p && p.active !== false; }).map(function (livePkg) {
    var base = (livePkg.id && byId[livePkg.id]) ? byId[livePkg.id] : {};
    var diamond = isDiamondPackage(livePkg) || isDiamondPackage(base);
    return {
      id: String(livePkg.id || base.id || ''),
      price: livePkg.price != null ? Number(livePkg.price) : (base.price || 0),
      durationDays: livePkg.durationDays != null ? Number(livePkg.durationDays) : (base.durationDays || 30),
      discountPct: livePkg.discountPct != null ? Number(livePkg.discountPct) : (base.discountPct || 0),
      features: diamond
        ? (base.features || DIAMOND_FEATURES).slice()
        : (Array.isArray(livePkg.features) && livePkg.features.length ? livePkg.features.slice() : (base.features || [])),
      name: diamond ? (base.name || DIAMOND_MARKETING.name.ar) : (livePkg.name || base.name || ''),
      description: diamond ? (base.description || DIAMOND_MARKETING.description.ar) : (livePkg.description || base.description || ''),
      featured: diamond ? true : !!livePkg.featured,
      featuredBadge: diamond ? (base.featuredBadge || DIAMOND_MARKETING.featuredBadge.ar) : (livePkg.featuredBadge || ''),
      roi: diamond ? (base.roi || DIAMOND_MARKETING.roi.ar) : (livePkg.roi || ''),
      period: livePkg.period || base.period || ''
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
  var merged = getCatalog(PUBLIC_CATALOG);
  var dia = merged.filter(function (p) { return p.id === 'diamond' || isDiamondPackage(p); })[0];
  return enrichForDisplay(dia || Object.assign({ id: 'diamond', price: 5000, durationDays: 30 }, _diamondCatalogFields()), lang);
}

function withDiamond(list, lang) {
  var out = (list || []).map(function (p) { return enrichForDisplay(p, lang); });
  if (out.some(isDiamondPackage)) return out;
  out.push(getDiamondPackage(lang));
  return out;
}

function getPublicPackages() {
  return getCatalog(PUBLIC_CATALOG);
}

function localizedName(pkg, lang) {
  lang = _normLang(lang);
  if (isDiamondPackage(pkg)) return diamondCopy(lang).name;
  var map = NAMES[pkg.id];
  if (map && map[lang]) return map[lang];
  var raw = pkg.name ? String(pkg.name).replace(/💎\s*/g, '').trim() : '';
  if (raw && raw !== String(pkg.id || '') && !/^[a-z]{2,}-[a-z0-9-]+$/i.test(raw)) return raw;
  if (map && map.ar) return map.ar;
  return raw || pkg.id || '';
}

function periodLabel(pkg, lang) {
  lang = _normLang(lang);
  var t = PERIODS[lang] || PERIODS.ar;
  if (pkg.period && !/^MRU\s*\//i.test(String(pkg.period))) return pkg.period;
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
    description: display.description || '',
    diamond: isDiamondPackage(display),
    isDiamond: isDiamondPackage(display),
    featured: !!display.featured || isDiamondPackage(display),
    featuredBadge: display.featuredBadge || '',
    roi: display.roi || '',
    price: display.price,
    priceLabel: priceLabel(display, lang),
    period: periodLabel(display, lang),
    durationDays: display.durationDays,
    duration: display.durationDays + (lang === 'fr' ? ' j' : lang === 'en' ? ' days' : lang === 'es' ? ' días' : ' يوم'),
    features: display.features || [],
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

function buildPackagesPromptBlock() {
  var pkgs = getPackagesForTool('ar');
  var lines = pkgs.map(function (p) {
    return '- ' + p.name + ': ' + p.priceLabel + (p.features.length ? ' — ' + p.features.join('، ') : '');
  });
  return (
    '📦 الباقات المتاحة (المصدر الرسمي الوحيد — لا تخترع أسعاراً أخرى):\n' +
    lines.join('\n') +
    '\nالنائب الذكي VIP حصري بالباقة الماسية. أقصى خصم على خدمات المنصة: 5% (ماسي).'
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
  var copy = diamondCopy(lang);
  return copy.name + '\n' + copy.description + '\n' + copy.features.map(function (f) { return '• ' + f; }).join('\n');
}

var API = {
  PUBLIC_CATALOG: PUBLIC_CATALOG,
  CATALOGS: CATALOGS,
  LS_KEYS: LS_KEYS,
  getCatalog: getCatalog,
  getPublicPackages: getPublicPackages,
  getPackagesForTool: getPackagesForTool,
  formatPackage: formatPackage,
  localizedName: localizedName,
  priceLabel: priceLabel,
  buildPublicSummary: buildPublicSummary,
  buildPublicOverview: buildPublicOverview,
  buildPackagesPromptBlock: buildPackagesPromptBlock,
  buildDiscountSummary: buildDiscountSummary,
  buildMaxDiscountLine: buildMaxDiscountLine,
  buildVipDeputyText: buildVipDeputyText,
  maxDiscountPct: maxDiscountPct,
  isDiamondPackage: isDiamondPackage,
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
