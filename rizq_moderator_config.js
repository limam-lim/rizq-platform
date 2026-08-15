/**
 * rizq_moderator_config.js
 * رزق المراقب — Rizq Auto-Moderator Configuration
 * Version: 1.0.0
 * 
 * عقل المراقب الآلي: تعريفات المخالفات، الفئات، قرارات JSON، معاملات الثقة
 */

'use strict';

/* ══════════════════════════════════════════════
   1. VIOLATION CODES — R01–R14 (رفض فوري)
══════════════════════════════════════════════ */
const VIOLATION_CODES = {

  R01: {
    code: 'R01',
    name_ar: 'محتوى جنسي أو إيحائي',
    name_fr: 'Contenu sexuel ou suggestif',
    scope: ['text', 'image', 'video'],
    decision: 'reject',
    severity: 'critical',
    notify_user: true,
    notify_admin: false,
    message_ar: 'تم رفض إعلانك لاحتوائه على محتوى مخالف لسياسة الاحتشام.',
    message_fr: 'Votre annonce a été refusée car elle contient du contenu inapproprié.',
  },

  R02: {
    code: 'R02',
    name_ar: 'كحول أو مخدرات أو مواد مسكرة',
    name_fr: 'Alcool, drogues ou stupéfiants',
    scope: ['text', 'image'],
    decision: 'reject',
    severity: 'critical',
    notify_user: true,
    notify_admin: false,
    message_ar: 'تم رفض إعلانك لاحتوائه على محتوى ممنوع قانونياً.',
    message_fr: 'Votre annonce a été refusée car elle contient du contenu illégal.',
  },

  R03: {
    code: 'R03',
    name_ar: 'أسلحة أو ذخيرة أو متفجرات',
    name_fr: 'Armes, munitions ou explosifs',
    scope: ['text', 'image'],
    decision: 'reject',
    severity: 'critical',
    notify_user: true,
    notify_admin: true,
    message_ar: 'تم رفض إعلانك. الأسلحة والذخيرة مقيدة قانونياً.',
    message_fr: 'Annonce refusée. Les armes et munitions sont légalement restreintes.',
  },

  R04: {
    code: 'R04',
    name_ar: 'قمار أو يانصيب أو مخططات هرمية',
    name_fr: 'Jeux de hasard, loteries ou schémas pyramidaux',
    scope: ['text'],
    decision: 'reject',
    severity: 'high',
    notify_user: true,
    notify_admin: false,
    message_ar: 'تم رفض إعلانك لمخالفته سياسة المنصة (R04).',
    message_fr: 'Annonce refusée pour violation de la politique (R04).',
  },

  R05: {
    code: 'R05',
    name_ar: 'وثائق مزورة أو هويات أو جوازات سفر',
    name_fr: 'Documents falsifiés, identités ou passeports',
    scope: ['text', 'image'],
    decision: 'reject',
    severity: 'critical',
    notify_user: true,
    notify_admin: true,
    message_ar: 'تم رفض إعلانك وإحالته للمراجعة الأمنية.',
    message_fr: 'Annonce refusée et transmise à la sécurité.',
  },

  R06: {
    code: 'R06',
    name_ar: 'احتيال واضح (سعر مريب + طلب تحويل مسبق)',
    name_fr: 'Fraude manifeste',
    scope: ['text'],
    decision: 'reject',
    severity: 'high',
    notify_user: true,
    notify_admin: true,
    message_ar: 'تم رفض إعلانك لاحتمال احتواء مؤشرات احتيالية.',
    message_fr: 'Annonce refusée pour indicateurs potentiels de fraude.',
  },

  R07: {
    code: 'R07',
    name_ar: 'خطاب كراهية أو تحريض أو عنف',
    name_fr: 'Discours haineux, incitation ou violence',
    scope: ['text', 'image', 'video'],
    decision: 'reject',
    severity: 'critical',
    notify_user: true,
    notify_admin: true,
    message_ar: 'تم رفض إعلانك لاحتوائه على محتوى مخالف للقانون الموريتاني.',
    message_fr: 'Annonce refusée pour contenu contraire à la loi mauritanienne.',
  },

  R08: {
    code: 'R08',
    name_ar: 'اتجار بالبشر أو أعضاء بشرية',
    name_fr: 'Traite des êtres humains ou organes humains',
    scope: ['text'],
    decision: 'reject',
    severity: 'critical',
    notify_user: false,
    notify_admin: true,
    message_ar: 'تم رفض إعلانك.',
    message_fr: 'Annonce refusée.',
  },

  R09: {
    code: 'R09',
    name_ar: 'منتجات مقلدة مع ادعاء أنها أصلية للخداع',
    name_fr: 'Contrefaçon présentée comme authentique',
    scope: ['text', 'image'],
    decision: 'reject',
    severity: 'medium',
    notify_user: true,
    notify_admin: false,
    message_ar: 'تم رفض إعلانك لادعاء أصالة منتج مقلد.',
    message_fr: 'Annonce refusée pour fausse déclaration d\'authenticité.',
  },

  R10: {
    code: 'R10',
    name_ar: 'بيانات شخصية لطرف ثالث بدون موافقة',
    name_fr: 'Données personnelles de tiers sans consentement',
    scope: ['text', 'image'],
    decision: 'reject',
    severity: 'high',
    notify_user: true,
    notify_admin: false,
    message_ar: 'تم رفض إعلانك لاحتوائه على بيانات أشخاص آخرين.',
    message_fr: 'Annonce refusée pour données de tiers sans consentement.',
  },

  R11: {
    code: 'R11',
    name_ar: 'حيوانات محمية أو مهددة بالانقراض',
    name_fr: 'Animaux protégés ou en voie d\'extinction',
    scope: ['text', 'image'],
    decision: 'reject',
    severity: 'high',
    notify_user: true,
    notify_admin: true,
    message_ar: 'تم رفض إعلانك. بيع هذا النوع من الحيوانات محظور قانونياً.',
    message_fr: 'Annonce refusée. La vente de cette espèce est légalement interdite.',
  },

  R12: {
    code: 'R12',
    name_ar: 'أدوية تتطلب وصفة طبية أو مواد خاضعة للرقابة',
    name_fr: 'Médicaments sur ordonnance ou substances contrôlées',
    scope: ['text', 'image'],
    decision: 'reject',
    severity: 'high',
    notify_user: true,
    notify_admin: false,
    message_ar: 'تم رفض إعلانك. بيع هذا النوع من الأدوية يتطلب ترخيصاً.',
    message_fr: 'Annonce refusée. La vente de ces médicaments nécessite une licence.',
  },

  R13: {
    code: 'R13',
    name_ar: 'صور ملابس داخلية على أجساد أو مكشوفة',
    name_fr: 'Images de lingerie sur corps ou nudité',
    scope: ['image'],
    decision: 'reject',
    severity: 'medium',
    notify_user: true,
    notify_admin: false,
    message_ar: 'تم رفض إعلانك لمخالفته معايير الاحتشام. يمكن عرض المنتج بدون نموذج.',
    message_fr: 'Annonce refusée. Vous pouvez présenter le produit sans modèle.',
  },

  R14: {
    code: 'R14',
    name_ar: 'روابط خارجية (URLs) في نص الإعلان',
    name_fr: 'Liens externes (URLs) dans le texte',
    scope: ['text'],
    decision: 'reject',
    severity: 'low',
    notify_user: true,
    notify_admin: false,
    message_ar: 'تم رفض إعلانك. يُمنع إدراج روابط خارجية في نص الإعلان.',
    message_fr: 'Annonce refusée. Les liens externes ne sont pas autorisés dans le texte.',
  },

};

/* ══════════════════════════════════════════════
   2. HUMAN REVIEW CODES — H01–H08
══════════════════════════════════════════════ */
const HUMAN_REVIEW_CODES = {

  H01: {
    code: 'H01',
    name_ar: 'حالة قانونية غامضة',
    name_fr: 'Situation juridique ambiguë',
    priority: 'normal',
    sla_hours: 24,
    message_ar: 'إعلانك قيد المراجعة. سيُنشر خلال 24 ساعة بعد اكتمالها.',
    message_fr: 'Votre annonce est en cours de révision (24h).',
  },

  H02: {
    code: 'H02',
    name_ar: 'عقار بمبلغ ضخم مع وثائق غير واضحة',
    name_fr: 'Immobilier de grande valeur avec documents suspects',
    priority: 'high',
    sla_hours: 12,
    message_ar: 'إعلانك قيد المراجعة. سيُنشر خلال 12 ساعة.',
    message_fr: 'Votre annonce est en cours de révision (12h).',
  },

  H03: {
    code: 'H03',
    name_ar: 'دواء أو مكمل غذائي غير واضح التصنيف',
    name_fr: 'Médicament ou complément de classification incertaine',
    priority: 'normal',
    sla_hours: 24,
    message_ar: 'إعلانك قيد المراجعة الطبية. سيُنشر خلال 24 ساعة.',
    message_fr: 'Votre annonce est en cours de révision médicale (24h).',
  },

  H04: {
    code: 'H04',
    name_ar: 'حيوان حي يصعب تحديد وضعه القانوني',
    name_fr: 'Animal vivant dont le statut est incertain',
    priority: 'normal',
    sla_hours: 24,
    message_ar: 'إعلانك قيد المراجعة. سيُنشر خلال 24 ساعة.',
    message_fr: 'Votre annonce est en cours de révision (24h).',
  },

  H05: {
    code: 'H05',
    name_ar: 'مركبة بسعر أقل بكثير من السوق (شبهة سرقة)',
    name_fr: 'Véhicule à prix anormalement bas (suspicion de vol)',
    priority: 'urgent',
    sla_hours: 6,
    message_ar: 'إعلانك قيد المراجعة العاجلة. سيُنشر خلال 6 ساعات إن اكتملت الوثائق.',
    message_fr: 'Votre annonce est en révision urgente (6h).',
  },

  H06: {
    code: 'H06',
    name_ar: 'محتوى ديني أو سياسي حساس',
    name_fr: 'Contenu religieux ou politique sensible',
    priority: 'high',
    sla_hours: 12,
    message_ar: 'إعلانك قيد المراجعة. سيُنشر خلال 12 ساعة.',
    message_fr: 'Votre annonce est en cours de révision (12h).',
  },

  H07: {
    code: 'H07',
    name_ar: 'صور منخفضة الجودة أو غير مطابقة للوصف',
    name_fr: 'Photos de mauvaise qualité ou incohérentes',
    priority: 'low',
    sla_hours: 48,
    message_ar: 'إعلانك قيد المراجعة. يُنصح برفع صور أوضح لتسريع النشر.',
    message_fr: 'Votre annonce est en révision. Des photos plus claires accéléreront la publication.',
  },

  H08: {
    code: 'H08',
    name_ar: 'إعلان توظيف بشروط مريبة',
    name_fr: 'Offre d\'emploi aux conditions suspectes',
    priority: 'high',
    sla_hours: 12,
    message_ar: 'إعلانك قيد المراجعة. سيُنشر خلال 12 ساعة.',
    message_fr: 'Votre annonce est en cours de révision (12h).',
  },

};

/* ══════════════════════════════════════════════
   3. AD CATEGORIES — 16 فئة
══════════════════════════════════════════════ */
const AD_CATEGORIES = [
  { id: 'vehicles',       name_ar: 'سيارات ومركبات',              name_fr: 'Véhicules' },
  { id: 'real_estate',    name_ar: 'عقارات',                      name_fr: 'Immobilier' },
  { id: 'electronics',    name_ar: 'إلكترونيات وتقنية',           name_fr: 'Électronique' },
  { id: 'fashion',        name_ar: 'ملابس وأزياء',                name_fr: 'Mode et vêtements' },
  { id: 'home',           name_ar: 'أثاث ومنزل',                  name_fr: 'Maison et meubles' },
  { id: 'jobs',           name_ar: 'وظائف وخدمات',                name_fr: 'Emploi et services' },
  { id: 'livestock',      name_ar: 'ماشية ودواجن وبيطرة',         name_fr: 'Bétail et vétérinaire' },
  { id: 'food',           name_ar: 'مواد غذائية',                 name_fr: 'Alimentation' },
  { id: 'construction',   name_ar: 'مواد البناء',                 name_fr: 'Matériaux de construction' },
  { id: 'education',      name_ar: 'تعليم وتدريب',               name_fr: 'Éducation' },
  { id: 'health',         name_ar: 'صحة وتجميل',                 name_fr: 'Santé et beauté' },
  { id: 'sports',         name_ar: 'رياضة وترفيه',               name_fr: 'Sport et loisirs' },
  { id: 'kids',           name_ar: 'أطفال ومستلزمات',            name_fr: 'Enfants et accessoires' },
  { id: 'agriculture',    name_ar: 'زراعة ومعدات',               name_fr: 'Agriculture et équipements' },
  { id: 'insurance',      name_ar: 'وكالات تأمين',               name_fr: 'Assurances' },
  { id: 'other',          name_ar: 'أخرى',                       name_fr: 'Autres' },
];

/* ══════════════════════════════════════════════
   4. JSON OUTPUT SCHEMA — مخرجات المراقب
══════════════════════════════════════════════ */

/**
 * buildDecision(type, codes, adId, reason)
 * يُنشئ كائن القرار الموحّد بصيغة JSON
 * 
 * @param {'approve'|'reject'|'review_human'} type
 * @param {string[]} codes   - مصفوفة رموز المخالفات (R01..R14, H01..H08)
 * @param {string|number} adId
 * @param {string} [reason]  - سبب اختياري
 * @returns {object}
 */
function buildDecision(type, codes, adId, reason) {
  const ts = Date.now();
  const readableCodes = codes.map(c => {
    const v = VIOLATION_CODES[c] || HUMAN_REVIEW_CODES[c];
    return v ? { code: c, name_ar: v.name_ar, name_fr: v.name_fr } : { code: c };
  });

  const decision = {
    schema_version: '1.0',
    ad_id: adId,
    timestamp: ts,
    decision: type,
    codes: readableCodes,
    reason: reason || null,
    notify_user: false,
    notify_admin: false,
    message_ar: '',
    message_fr: '',
    sla_hours: null,
  };

  if (type === 'approve') {
    decision.message_ar = 'تم نشر إعلانك بنجاح.';
    decision.message_fr = 'Votre annonce a été publiée avec succès.';
  } else if (type === 'reject') {
    const primary = VIOLATION_CODES[codes[0]];
    if (primary) {
      decision.notify_user = primary.notify_user;
      decision.notify_admin = primary.notify_admin;
      decision.message_ar = primary.message_ar;
      decision.message_fr = primary.message_fr;
    }
  } else if (type === 'review_human') {
    const primary = HUMAN_REVIEW_CODES[codes[0]];
    if (primary) {
      decision.sla_hours = primary.sla_hours;
      decision.priority = primary.priority;
      decision.message_ar = primary.message_ar;
      decision.message_fr = primary.message_fr;
    }
    decision.notify_user = true;
  }

  return decision;
}

/* ══════════════════════════════════════════════
   5. TRUST SCORE — درجة الثقة
══════════════════════════════════════════════ */
const TRUST_CONFIG = {
  // حساب جديد غير محقق
  new_unverified:     { base_score: 30,  max_daily_ads: 2,  requires_review: true  },
  // حساب محقق بالهوية
  id_verified:        { base_score: 60,  max_daily_ads: 10, requires_review: false },
  // حساب تجاري (محل/مكتب/شركة)
  business_verified:  { base_score: 75,  max_daily_ads: 50, requires_review: false },
  // مشرف موثوق
  trusted_seller:     { base_score: 90,  max_daily_ads: 100,requires_review: false },
};

// عوامل تعديل النتيجة
const TRUST_MODIFIERS = {
  ad_rejected:        -10,  // كل رفض يخفض النتيجة
  ad_reported_valid:  -15,  // إبلاغ صحيح من مستخدم
  ad_approved:        +2,   // كل نشر ناجح يرفع النتيجة
  account_age_30d:    +5,   // حساب عمره أكثر من 30 يوم
  positive_review:    +3,   // تقييم إيجابي
};

// حدود العقوبات
const TRUST_THRESHOLDS = {
  suspend_account:    10,   // تعليق الحساب
  restrict_posting:   30,   // تقييد النشر (مراجعة يدوية لكل إعلان)
  warn_user:          45,   // تحذير تلقائي
  normal:             60,   // وضع طبيعي
};

/* ══════════════════════════════════════════════
   6. TEXT PATTERNS — كلمات وأنماط الكشف
══════════════════════════════════════════════ */
const DETECTION_PATTERNS = {

  // R02 — كحول
  alcohol: [
    /\bكحول\b/i, /\bبيرة\b/i, /\bخمر\b/i, /\bويسكي\b/i, /\bفودكا\b/i,
    /\balcohol\b/i, /\bbeer\b/i, /\bwhisky\b/i, /\bwine\b/i, /\bbière\b/i,
  ],

  // R03 — أسلحة
  weapons: [
    /\bبندقية\b/i, /\bمسدس\b/i, /\bسلاح\b/i, /\bذخيرة\b/i, /\bرصاص\b/i,
    /\bgun\b/i, /\bpistol\b/i, /\brifle\b/i, /\bweapon\b/i, /\barme\b/i,
  ],

  // R04 — قمار
  gambling: [
    /\bقمار\b/i, /\bيانصيب\b/i, /\bرهان\b/i, /\bكازينو\b/i,
    /\bgambling\b/i, /\bcasino\b/i, /\bloterie\b/i, /\bjeu.{0,5}hasard\b/i,
  ],

  // R06 — احتيال (مؤشرات)
  fraud_indicators: [
    /تحويل مسبق/i, /دفع أولاً/i, /ارسل المبلغ/i, /تأمين استلام/i,
    /virement.{0,10}avant/i, /paiement.{0,10}advance/i,
    /western.?union/i, /moneygram/i,
  ],

  // R14 — روابط خارجية
  external_urls: [
    /https?:\/\//i,
    /www\.[a-z0-9-]+\.[a-z]{2,}/i,
    /(?:bit\.ly|t\.co|tinyurl)/i,
  ],

  // كلمات احتياطية تستدعي مراجعة بشرية
  flagged_for_review: [
    /\bوثيقة\b/i, /\bرخصة\b/i, /\bترخيص\b/i, /\bأصلي مضمون\b/i,
    /\bمن الخارج\b/i, /\bدون فاتورة\b/i,
  ],

};

/* ══════════════════════════════════════════════
   7. QUICK CHECK FUNCTION (client-side pre-filter)
══════════════════════════════════════════════ */

/**
 * quickTextCheck(text, adId)
 * فحص سريع على جانب العميل قبل إرسال الإعلان
 * يعيد قرار JSON أو null إذا كان النص سليماً
 */
function quickTextCheck(text, adId) {

  // R14 — روابط
  for (const p of DETECTION_PATTERNS.external_urls) {
    if (p.test(text)) return buildDecision('reject', ['R14'], adId);
  }

  // R02 — كحول
  for (const p of DETECTION_PATTERNS.alcohol) {
    if (p.test(text)) return buildDecision('reject', ['R02'], adId);
  }

  // R03 — أسلحة
  for (const p of DETECTION_PATTERNS.weapons) {
    if (p.test(text)) return buildDecision('reject', ['R03'], adId);
  }

  // R04 — قمار
  for (const p of DETECTION_PATTERNS.gambling) {
    if (p.test(text)) return buildDecision('reject', ['R04'], adId);
  }

  // R06 — مؤشرات احتيال
  let fraudCount = 0;
  for (const p of DETECTION_PATTERNS.fraud_indicators) {
    if (p.test(text)) fraudCount++;
  }
  if (fraudCount >= 2) return buildDecision('reject', ['R06'], adId);

  // مراجعة بشرية — كلمات محايدة لكن مريبة
  for (const p of DETECTION_PATTERNS.flagged_for_review) {
    if (p.test(text)) return buildDecision('review_human', ['H01'], adId);
  }

  // سليم
  return null;
}

/* ══════════════════════════════════════════════
   8. EXPORT
══════════════════════════════════════════════ */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VIOLATION_CODES,
    HUMAN_REVIEW_CODES,
    AD_CATEGORIES,
    TRUST_CONFIG,
    TRUST_MODIFIERS,
    TRUST_THRESHOLDS,
    DETECTION_PATTERNS,
    buildDecision,
    quickTextCheck,
  };
} else {
  // browser global
  window.RizqModerator = {
    VIOLATION_CODES,
    HUMAN_REVIEW_CODES,
    AD_CATEGORIES,
    TRUST_CONFIG,
    TRUST_MODIFIERS,
    TRUST_THRESHOLDS,
    DETECTION_PATTERNS,
    buildDecision,
    quickTextCheck,
  };
}
