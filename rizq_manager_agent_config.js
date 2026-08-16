/**
 * rizq_manager_agent_config.js  — v2.0
 * مدير رزق الذكي — قاعدة المعرفة الشاملة + محرك المحادثة
 * يعرف كل كبيرة وصغيرة عن المنصة
 */
'use strict';

// ═══════════════════════════════════════════════════════════════
// BLOCK 1 — IDENTITY
// ═══════════════════════════════════════════════════════════════
var RIZQ_IDENTITY = {
  name_ar: 'مدير رزق', name_fr: 'Directeur Rizq', name_en: 'Rizq Manager',
  platform: 'رزق — منصة التجارة الإلكترونية الموريتانية',
  website:  'rizq.mr',
  email:    'direction@rizq.mr',
  greeting: {
    ar: 'وعليكم السلام! أهلاً وسهلاً 😊\nكيف أقدر أساعدك اليوم؟',
    fr: 'Wa alaykum assalam! Bienvenue 😊\nComment puis-je vous aider?',
    hs: 'وعليكم السلام! مرحبا بيك 😊\nكيفاش نعاونك؟',
    en: 'Welcome to Rizq! 😊\nHow can I help you today?'
  }
};

// ═══════════════════════════════════════════════════════════════
// BLOCK 2 — PLATFORM OVERVIEW (ما هي رزق؟)
// ═══════════════════════════════════════════════════════════════
var PLATFORM_OVERVIEW = {
  what_is_ar:
    '🛒 رزق هي منصة التجارة الإلكترونية الأولى في موريتانيا.\n\nتتيح لك:\n• شراء وبيع أي منتج أو خدمة\n• فتح متجر إلكتروني احترافي\n• تقديم خدماتك عبر مكتب افتراضي\n• نشر إعلانات مؤسسية (Rizq ADS)\n\nالمنصة متاحة للأفراد والمحلات والشركات والمكاتب المهنية.',
  who_can_use_ar:
    '👥 من يمكنه استخدام رزق؟\n\n• أفراد — يبيعون ويشترون منتجات\n• أصحاب المحلات — يفتحون متجراً افتراضياً\n• مقدمو الخدمات — محامون، مهندسون، أطباء، معلمون...\n• الشركات والمعارض — يعلنون عبر Rizq ADS',
  languages_ar: 'المنصة تدعم العربية والفرنسية وتتعامل مع الحسانية.',
  what_is_fr:
    '🛒 Rizq est la première plateforme de commerce électronique en Mauritanie.\n\nElle vous permet de:\n• Acheter et vendre tout produit ou service\n• Ouvrir une boutique en ligne professionnelle\n• Proposer vos services via un bureau virtuel\n• Publier des annonces institutionnelles (Rizq ADS)\n\nDisponible pour les particuliers, commerçants, entreprises et professionnels.',
  who_can_use_fr:
    '👥 Qui peut utiliser Rizq?\n\n• Particuliers — vendent et achètent des produits\n• Commerçants — ouvrent une boutique virtuelle\n• Prestataires — avocats, ingénieurs, médecins, enseignants...\n• Entreprises et exposants — annoncent via Rizq ADS'
};

// ═══════════════════════════════════════════════════════════════
// BLOCK 3 — REGISTRATION GUIDE (كيف تسجّل؟)
// ═══════════════════════════════════════════════════════════════
var REGISTRATION_GUIDE = {
  overview_ar:
    '📝 التسجيل في رزق سهل وسريع:\n\n1️⃣ اضغط "سجّل مجاناً" في الصفحة الرئيسية\n2️⃣ اختر نوع حسابك (راجع الخيارات أدناه)\n3️⃣ أدخل بياناتك الأساسية\n4️⃣ تحقق برقم هاتفك (OTP)\n5️⃣ ارفع صورة الهوية الوطنية للتوثيق\n6️⃣ حسابك جاهز! ✅',
  overview_fr:
    '📝 L\'inscription sur Rizq est simple et rapide:\n\n1️⃣ Cliquez sur "S\'inscrire gratuitement" sur la page d\'accueil\n2️⃣ Choisissez votre type de compte (voir les options ci-dessous)\n3️⃣ Entrez vos informations de base\n4️⃣ Vérifiez votre numéro de téléphone (OTP)\n5️⃣ Téléversez une photo de votre pièce d\'identité\n6️⃣ Votre compte est prêt! ✅',

  account_types: {
    private_mr: {
      name_ar: 'فرد موريتاني', name_fr: 'Particulier mauritanien',
      when_ar: 'إذا كنت موريتاني الجنسية وتريد البيع أو الشراء كفرد',
      when_fr: 'Si vous êtes de nationalité mauritanienne et souhaitez vendre ou acheter en tant que particulier',
      fields_ar: 'الاسم الكامل، رقم الهاتف، الولاية',
      fields_fr: 'Nom complet, numéro de téléphone, wilaya',
      features_ar: 'نشر إعلانات، تواصل مع البائعين، تقييم الصفقات',
      features_fr: 'Publier des annonces, contacter les vendeurs, évaluer les transactions'
    },
    private_int: {
      name_ar: 'مقيم أجنبي', name_fr: 'Résident étranger',
      when_ar: 'إذا كنت مقيماً في موريتانيا وغير موريتاني',
      when_fr: 'Si vous résidez en Mauritanie et n\'êtes pas de nationalité mauritanienne',
      fields_ar: 'الاسم، رقم الهاتف، جنسيتك، رقم الإقامة',
      fields_fr: 'Nom, numéro de téléphone, nationalité, numéro de résidence',
      features_ar: 'نفس مزايا الفرد الموريتاني',
      features_fr: 'Mêmes avantages que le particulier mauritanien'
    },
    store: {
      name_ar: 'متجر افتراضي (محل تجاري)', name_fr: 'Boutique virtuelle (commerce)',
      when_ar: 'إذا كنت صاحب محل وتريد عرض منتجاتك إلكترونياً',
      when_fr: 'Si vous êtes commerçant et souhaitez présenter vos produits en ligne',
      fields_ar: 'اسم المحل، القطاع التجاري، الولاية، رقم السجل التجاري (اختياري)',
      fields_fr: 'Nom du commerce, secteur d\'activité, wilaya, numéro de registre de commerce (facultatif)',
      features_ar: 'داشبورد إدارة المنتجات، إحصائيات، شارة "محل موثّق"',
      features_fr: 'Tableau de bord de gestion des produits, statistiques, badge "commerce vérifié"',
      dashboard: 'rizq_dashboard_store.html'
    },
    office: {
      name_ar: 'مكتب افتراضي (مقدم خدمة)', name_fr: 'Bureau virtuel (prestataire de services)',
      when_ar: 'إذا كنت محامياً، مهندساً، طبيباً، معلماً، أو تقدم خدمة مهنية',
      when_fr: 'Si vous êtes avocat, ingénieur, médecin, enseignant, ou tout autre prestataire de services professionnels',
      fields_ar: 'اسم المكتب، نوع الخدمة، المؤهلات، الولاية',
      fields_fr: 'Nom du bureau, type de service, qualifications, wilaya',
      features_ar: 'صفحة مكتب احترافية، جدول الخدمات، استقبال الاستفسارات',
      features_fr: 'Page professionnelle, grille des services, réception des demandes',
      dashboard: 'rizq_dashboard_office.html'
    },
    corp: {
      name_ar: 'شركة / مؤسسة (Rizq ADS)', name_fr: 'Entreprise / institution (Rizq ADS)',
      when_ar: 'إذا كنت تمثل شركة كبيرة، معرضاً تجارياً، أو مؤسسة',
      when_fr: 'Si vous représentez une grande entreprise, un salon commercial, ou une institution',
      fields_ar: 'اسم الشركة، القطاع، رقم السجل التجاري، شخص الاتصال',
      fields_fr: 'Nom de l\'entreprise, secteur, numéro de registre de commerce, personne à contacter',
      features_ar: 'لوحة إعلانات مؤسسية، تحليلات متقدمة، إدارة منتجات متعددة',
      features_fr: 'Panneau d\'annonces institutionnelles, analyses avancées, gestion multi-produits',
      dashboard: 'rizq_dashboard_corp.html'
    }
  },

  otp_ar: '📱 رمز التحقق OTP:\n• يُرسَل إلى رقم هاتفك عبر SMS\n• صالح 5 دقائق فقط\n• لم يصلك؟ انتظر دقيقة ثم اضغط "إعادة الإرسال"\n• تأكد أن رقمك موريتاني ويبدأ بـ +222',
  otp_fr: '📱 Code de vérification OTP:\n• Envoyé par SMS à votre numéro\n• Valide seulement 5 minutes\n• Pas reçu? Attendez une minute puis cliquez sur "Renvoyer"\n• Vérifiez que votre numéro est mauritanien et commence par +222',

  id_verification_ar: '🪪 توثيق الهوية:\n• بعد التسجيل سيُطلب منك رفع صورة بطاقتك الوطنية\n• الصورة يجب أن تكون واضحة وغير مقطوعة\n• تستغرق المراجعة حتى 24 ساعة\n• بعد القبول: شارة "موثّق" تظهر على حسابك\n• يمكنك تخطي هذه الخطوة مؤقتاً لكن الحساب سيكون مُعلَّق حتى التوثيق',
  id_verification_fr: '🪪 Vérification d\'identité:\n• Après l\'inscription, on vous demandera de téléverser une photo de votre carte d\'identité nationale\n• La photo doit être claire et non coupée\n• La vérification prend jusqu\'à 24 heures\n• Une fois acceptée: le badge "vérifié" apparaît sur votre compte\n• Vous pouvez passer cette étape temporairement, mais le compte restera suspendu jusqu\'à vérification',

  after_register_ar: '✅ بعد التسجيل:\n• ستجد نفسك في لوحة التحكم الخاصة بنوع حسابك\n• يمكنك فوراً تصفح المنصة والتواصل مع البائعين\n• لنشر إعلان: انتظر موافقة التوثيق أولاً',
  after_register_fr: '✅ Après l\'inscription:\n• Vous accédez directement au tableau de bord de votre type de compte\n• Vous pouvez immédiatement parcourir la plateforme et contacter les vendeurs\n• Pour publier une annonce: attendez d\'abord la validation de votre vérification'
};

// ═══════════════════════════════════════════════════════════════
// BLOCK 4 — HOW TO BUY (كيف تشتري؟)
// ═══════════════════════════════════════════════════════════════
var BUYING_GUIDE = {
  steps_ar:
    '🛍️ كيف تشتري من رزق؟\n\n1️⃣ ابحث عن المنتج في شريط البحث أو تصفح الفئات\n2️⃣ افتح صفحة الإعلان وشاهد الصور والتفاصيل\n3️⃣ تحقق من شارة البائع (موثّق أفضل)\n4️⃣ تواصل مع البائع مباشرة عبر رقم هاتفه أو رسالة في المنصة\n5️⃣ اتفقا على طريقة الدفع والتوصيل\n6️⃣ بعد استلام المنتج: قيّم البائع لمساعدة المشترين الآخرين ⭐',
  steps_fr:
    '🛍️ Comment acheter sur Rizq?\n\n1️⃣ Cherchez le produit dans la barre de recherche ou parcourez les catégories\n2️⃣ Ouvrez l\'annonce et regardez les photos et détails\n3️⃣ Vérifiez le badge du vendeur (vérifié c\'est mieux)\n4️⃣ Contactez le vendeur directement par téléphone ou message sur la plateforme\n5️⃣ Mettez-vous d\'accord sur le paiement et la livraison\n6️⃣ Après réception: évaluez le vendeur pour aider les autres acheteurs ⭐',
  tips_ar:
    '💡 نصائح للشراء الآمن:\n• فضّل البائعين الموثّقين (شارة ✅)\n• لا تدفع مسبقاً لبائع غير موثّق\n• التقِ في مكان عام عند التسليم\n• احتفظ بسجل المحادثات\n• أبلغ عن أي إعلان مشبوه',
  tips_fr:
    '💡 Conseils pour un achat sûr:\n• Préférez les vendeurs vérifiés (badge ✅)\n• Ne payez pas d\'avance un vendeur non vérifié\n• Rencontrez-vous dans un lieu public pour la remise\n• Gardez un historique des conversations\n• Signalez toute annonce suspecte',
  search_ar:
    '🔍 البحث في رزق:\n• ابحث بالاسم، الفئة، أو المدينة\n• استخدم الفلاتر: السعر، الحالة (جديد/مستعمل)، الولاية\n• 16 فئة متاحة: سيارات، عقارات، إلكترونيات، ملابس، أغذية، حيوانات، أثاث، خدمات، صحة، تعليم، رياضة، بناء، زراعة، كتب، هدايا، أخرى',
  search_fr:
    '🔍 Rechercher sur Rizq:\n• Cherchez par nom, catégorie ou ville\n• Utilisez les filtres: prix, état (neuf/occasion), wilaya\n• 16 catégories disponibles: voitures, immobilier, électronique, vêtements, alimentation, animaux, meubles, services, santé, éducation, sport, construction, agriculture, livres, cadeaux, autres'
};

// ═══════════════════════════════════════════════════════════════
// BLOCK 5 — HOW TO SELL / POST AD (كيف تبيع؟)
// ═══════════════════════════════════════════════════════════════
var SELLING_GUIDE = {
  steps_ar:
    '📋 كيف تنشر إعلاناً؟\n\n1️⃣ سجّل الدخول لحسابك\n2️⃣ اضغط "نشر إعلان" في القائمة\n3️⃣ اختر الفئة المناسبة من 16 فئة\n4️⃣ أضف صوراً واضحة (حتى 5 صور) — الصور بإضاءة طبيعية تُضاعف المشاهدات\n5️⃣ اكتب عنواناً جذاباً ووصفاً دقيقاً وصادقاً\n6️⃣ حدد السعر بالأوقية الموريتانية MRU (أو اكتب "للتفاوض")\n7️⃣ أضف طريقة التواصل\n8️⃣ اضغط "نشر" — سيُراجَع الإعلان تلقائياً خلال ثوانٍ',
  steps_fr:
    '📋 Comment publier une annonce?\n\n1️⃣ Connectez-vous à votre compte\n2️⃣ Cliquez sur "Publier une annonce" dans le menu\n3️⃣ Choisissez la catégorie parmi les 16 disponibles\n4️⃣ Ajoutez des photos claires (jusqu\'à 5) — la lumière naturelle double les vues\n5️⃣ Rédigez un titre accrocheur et une description précise et honnête\n6️⃣ Fixez le prix en ouguiya mauritanienne MRU (ou indiquez "à négocier")\n7️⃣ Ajoutez un moyen de contact\n8️⃣ Cliquez sur "Publier" — l\'annonce sera vérifiée automatiquement en quelques secondes',

  moderation_ar:
    '🔍 مراجعة الإعلانات:\n• نظام ذكي يفحص الإعلان تلقائياً\n• الإعلانات الواضحة تُنشَر فوراً ✅\n• الإعلانات التي تحتاج مراجعة تذهب للفريق (خلال 24 ساعة)\n• الإعلانات المخالفة تُرفض مع شرح السبب\n\nممنوع نشر: الكحول، المخدرات، الأسلحة، الاحتيال، المحتوى الفاضح',
  moderation_fr:
    '🔍 Vérification des annonces:\n• Un système intelligent examine chaque annonce automatiquement\n• Les annonces claires sont publiées immédiatement ✅\n• Les annonces nécessitant une revue passent à l\'équipe (sous 24 heures)\n• Les annonces non conformes sont refusées avec une explication\n\nInterdit de publier: alcool, drogues, armes, fraude, contenu obscène',

  tips_ar:
    '💡 نصائح للبيع السريع:\n• الصور الواضحة = 3× مشاهدات\n• العنوان الدقيق يجلب مشترين جادين\n• السعر العادل يُسرّع البيع\n• الرد السريع على الاستفسارات يبني ثقة المشتري\n• حساب موثّق يظهر أولاً في نتائج البحث',
  tips_fr:
    '💡 Conseils pour vendre rapidement:\n• Des photos claires = 3× plus de vues\n• Un titre précis attire des acheteurs sérieux\n• Un prix juste accélère la vente\n• Répondre vite aux demandes crée la confiance\n• Un compte vérifié apparaît en premier dans les résultats',

  forbidden_ar:
    '🚫 الممنوع نشره:\n• المواد الكحولية\n• الأسلحة والذخيرة\n• المخدرات والمواد الممنوعة\n• منتجات مزوّرة أو مسروقة\n• إعلانات بمعلومات مضللة\n• المحتوى الفاضح\n• بيع الحيوانات البرية المحمية\n• الخدمات المالية غير المرخصة',
  forbidden_fr:
    '🚫 Interdit de publier:\n• Boissons alcoolisées\n• Armes et munitions\n• Drogues et substances interdites\n• Produits contrefaits ou volés\n• Annonces avec informations trompeuses\n• Contenu obscène\n• Vente d\'animaux sauvages protégés\n• Services financiers non agréés'
};

// ═══════════════════════════════════════════════════════════════
// BLOCK 6 — SUBSCRIPTIONS (الباقات)
// ═══════════════════════════════════════════════════════════════
function _pkgCfg() {
  if (typeof require === 'function') {
    try { return require('./rizq_packages_config'); } catch (e) {}
  }
  if (typeof window !== 'undefined' && window.RizqPackagesConfig) return window.RizqPackagesConfig;
  if (typeof globalThis !== 'undefined' && globalThis.RizqPackagesConfig) return globalThis.RizqPackagesConfig;
  return null;
}

var SUBSCRIPTIONS_GUIDE = {
  overview_ar: '',
  overview_fr: '',

  how_to_upgrade_ar:
    '⬆️ كيف أرقّي باقتي؟\n1. سجّل الدخول → الملف الشخصي\n2. اضغط "ترقية الباقة"\n3. اختر الخطة المناسبة\n4. ادفع عبر Bankily أو Sedad\n5. التفعيل فوري بعد تأكيد الدفع ✅',
  how_to_upgrade_fr:
    '⬆️ Comment mettre à niveau mon forfait?\n1. Connectez-vous → Profil\n2. Cliquez sur "Mettre à niveau le forfait"\n3. Choisissez le plan qui vous convient\n4. Payez via Bankily ou Sedad\n5. Activation immédiate après confirmation du paiement ✅',

  vip_deputy_ar: '',
  vip_deputy_fr: '',

  max_discount_ar: '',
  max_discount_fr: ''
};

(function _fillSubscriptionsFromCanonicalPackages() {
  var cfg = _pkgCfg();
  if (!cfg) return;
  SUBSCRIPTIONS_GUIDE.overview_ar = cfg.buildPublicOverview('ar');
  SUBSCRIPTIONS_GUIDE.overview_fr = cfg.buildPublicOverview('fr');
  SUBSCRIPTIONS_GUIDE.vip_deputy_ar = cfg.buildVipDeputyText('ar');
  SUBSCRIPTIONS_GUIDE.vip_deputy_fr = cfg.buildVipDeputyText('fr');
  SUBSCRIPTIONS_GUIDE.max_discount_ar = cfg.buildMaxDiscountLine('ar');
  SUBSCRIPTIONS_GUIDE.max_discount_fr = cfg.buildMaxDiscountLine('fr');
})();

// ═══════════════════════════════════════════════════════════════
// BLOCK 7 — PAYMENT METHODS (طرق الدفع)
// ═══════════════════════════════════════════════════════════════
var PAYMENT_GUIDE = {
  overview_ar:
    '💳 طرق الدفع في رزق:\n\n🔷 Bankily:\n• افتح تطبيق Bankily\n• اختر "دفع" أو "بيماه"\n• أدخل رمز البنك الخاص برزق\n• أكّد بكلمة السر\n\n🟩 Sedad:\n• اختر Sedad عند الدفع في المنصة\n• أدخل رقم حسابك\n• أكّد العملية برمز OTP\n\n💵 الدفع النقدي:\n• عند الاتفاق المباشر بين البائع والمشتري\n• المنصة لا تتدخل في صفقات الدفع النقدي',
  overview_fr:
    '💳 Moyens de paiement sur Rizq:\n\n🔷 Bankily:\n• Ouvrez l\'application Bankily\n• Choisissez "Payer" ou "Bimah"\n• Entrez le code bancaire de Rizq\n• Confirmez avec votre mot de passe\n\n🟩 Sedad:\n• Choisissez Sedad lors du paiement sur la plateforme\n• Entrez votre numéro de compte\n• Confirmez l\'opération avec le code OTP\n\n💵 Paiement en espèces:\n• Lors d\'un accord direct entre vendeur et acheteur\n• La plateforme n\'intervient pas dans les paiements en espèces',

  bank_codes_ar:
    '🏦 رموز الدفع البنكي:\n• تجدها في لوحة تحكم المشترك تحت "طرق الدفع"\n• انسخ الرمز وانتقل لتطبيق بنكك\n• اختر دفع/بيماه وأدخل الرمز\n• احتفظ برقم العملية كإثبات',
  bank_codes_fr:
    '🏦 Codes de paiement bancaire:\n• Disponibles dans votre tableau de bord sous "Moyens de paiement"\n• Copiez le code et allez sur l\'application de votre banque\n• Choisissez payer/bimah et entrez le code\n• Conservez le numéro de transaction comme preuve',

  currency_ar: 'العملة: الأوقية الموريتانية الجديدة (MRU)\nالسعر الإرشادي: 1 دولار ≈ 37 MRU',
  currency_fr: 'Devise: Ouguiya mauritanienne nouvelle (MRU)\nTaux indicatif: 1 dollar ≈ 37 MRU'
};

// ═══════════════════════════════════════════════════════════════
// BLOCK 8 — DASHBOARDS (لوحات التحكم)
// ═══════════════════════════════════════════════════════════════
var DASHBOARDS_GUIDE = {
  store_ar:
    '🏪 داشبورد المتجر الافتراضي:\n• إدارة المنتجات (إضافة/تعديل/حذف)\n• تتبع الاستفسارات والطلبات\n• إحصائيات المشاهدات والتفاعل\n• رمز QR خاص بمتجرك للمشاركة\n• إدارة طرق الدفع\n• نظام مراجعة تلقائي للمنتجات قبل النشر',
  store_fr:
    '🏪 Tableau de bord de la boutique virtuelle:\n• Gestion des produits (ajout/modification/suppression)\n• Suivi des demandes et commandes\n• Statistiques des vues et interactions\n• Code QR dédié à votre boutique à partager\n• Gestion des moyens de paiement\n• Système de vérification automatique des produits avant publication',

  office_ar:
    '💼 داشبورد المكتب الافتراضي:\n• عرض الخدمات المهنية مع الأسعار\n• استقبال وإدارة الاستفسارات\n• ملف مهني كامل (مؤهلات، خبرات، شهادات)\n• تقييمات العملاء\n• جدول الخدمات المتاحة',
  office_fr:
    '💼 Tableau de bord du bureau virtuel:\n• Présentation des services professionnels avec les prix\n• Réception et gestion des demandes\n• Profil professionnel complet (qualifications, expériences, certificats)\n• Avis des clients\n• Grille des services disponibles',

  corp_ar:
    '🏢 داشبورد Rizq ADS (شركات):\n• إعلانات مؤسسية متعددة\n• إدارة كتالوج المنتجات\n• تحليلات متقدمة للأداء\n• إدارة الاستفسارات التجارية\n• تصدير رمز QR',
  corp_fr:
    '🏢 Tableau de bord Rizq ADS (entreprises):\n• Annonces institutionnelles multiples\n• Gestion du catalogue de produits\n• Analyses avancées de performance\n• Gestion des demandes commerciales\n• Export du code QR',

  how_to_access_ar:
    '🔐 الوصول للوحة التحكم:\n• سجّل الدخول → ستُحوَّل تلقائياً للوحتك\n• أو اضغط على اسمك في الأعلى → "لوحة التحكم"',
  how_to_access_fr:
    '🔐 Accéder au tableau de bord:\n• Connectez-vous → vous serez redirigé automatiquement vers votre tableau\n• Ou cliquez sur votre nom en haut → "Tableau de bord"'
};

// ═══════════════════════════════════════════════════════════════
// BLOCK 9 — TRUST & VERIFICATION (الثقة والتوثيق)
// ═══════════════════════════════════════════════════════════════
var TRUST_GUIDE = {
  levels_ar:
    '🛡️ مستويات الثقة في رزق:\n\n👤 جديد غير موثّق (30 نقطة):\nيمكنه التصفح، محدود في النشر\n\n✅ موثّق بالهوية (60 نقطة):\nشارة "موثّق"، يمكنه النشر الكامل\n\n🏪 موثّق تجارياً (75 نقطة):\nشارة "موثّق+"، ظهور مُحسَّن\n\n⭐ بائع موثوق (90+ نقطة):\nشارة "موثوق ممتاز"، أولوية قصوى في البحث',
  levels_fr:
    '🛡️ Niveaux de confiance sur Rizq:\n\n👤 Nouveau non vérifié (30 points):\nPeut naviguer, publication limitée\n\n✅ Vérifié par identité (60 points):\nBadge "vérifié", publication complète\n\n🏪 Vérifié commercialement (75 points):\nBadge "vérifié+", visibilité améliorée\n\n⭐ Vendeur de confiance (90+ points):\nBadge "confiance excellente", priorité maximale dans la recherche',

  how_to_verify_ar: REGISTRATION_GUIDE.id_verification_ar,
  how_to_verify_fr: REGISTRATION_GUIDE.id_verification_fr,

  report_ar:
    '🚩 الإبلاغ عن إعلان مشبوه:\n• افتح الإعلان\n• اضغط "إبلاغ"\n• اختر السبب\n• فريق المراقبة يراجعه خلال 24 ساعة',
  report_fr:
    '🚩 Signaler une annonce suspecte:\n• Ouvrez l\'annonce\n• Cliquez sur "Signaler"\n• Choisissez la raison\n• L\'équipe de modération l\'examine sous 24 heures'
};

// ═══════════════════════════════════════════════════════════════
// BLOCK 10 — PLATFORM SECTIONS (أقسام المنصة)
// ═══════════════════════════════════════════════════════════════
var SECTIONS_GUIDE = {
  categories_ar:
    '📂 الفئات الـ16 في رزق:\n1. السيارات والمركبات\n2. العقارات\n3. الإلكترونيات والتقنية\n4. الملابس والأزياء\n5. الأغذية والمواد الغذائية\n6. الحيوانات والمواشي والدواجن\n7. الأثاث والمفروشات\n8. الخدمات المهنية\n9. الصحة والجمال\n10. التعليم والتدريب\n11. الرياضة والترفيه\n12. البناء والمواد\n13. الزراعة والبستنة\n14. الكتب والمستلزمات\n15. الهدايا والمناسبات\n16. أخرى',
  categories_fr:
    '📂 Les 16 catégories sur Rizq:\n1. Voitures et véhicules\n2. Immobilier\n3. Électronique et technologie\n4. Vêtements et mode\n5. Alimentation\n6. Animaux et bétail\n7. Meubles et ameublement\n8. Services professionnels\n9. Santé et beauté\n10. Éducation et formation\n11. Sport et loisirs\n12. Construction et matériaux\n13. Agriculture et jardinage\n14. Livres et fournitures\n15. Cadeaux et occasions\n16. Autres',

  prices_board_ar:
    '📊 لوحة أسعار السوق:\n• تجد في الصفحة الرئيسية لوحة أسعار اليوم\n• تشمل: أسعار المواد الغذائية الأساسية، المحروقات\n• تُحدَّث بانتظام\n• مرجع للبائعين والمشترين',
  prices_board_fr:
    '📊 Tableau des prix du marché:\n• Disponible sur la page d\'accueil\n• Comprend: prix des produits alimentaires de base, carburants\n• Mis à jour régulièrement\n• Référence pour vendeurs et acheteurs',

  legal_ar:
    '⚖️ الصفحة القانونية:\n• شروط الاستخدام\n• سياسة المحتوى (R01-R14)\n• سياسة التحقق من الهوية\n• سياسة الإعلانات\n• قوانين موريتانية سارية',
  legal_fr:
    '⚖️ Page juridique:\n• Conditions d\'utilisation\n• Politique de contenu (R01-R14)\n• Politique de vérification d\'identité\n• Politique des annonces\n• Lois mauritaniennes en vigueur'
};

// ═══════════════════════════════════════════════════════════════
// BLOCK 11 — FAQ (أسئلة شائعة)
// ═══════════════════════════════════════════════════════════════
var FAQ = [
  {
    q: ['كيف أسجل','كيف اسجل','تسجيل','انشاء حساب','إنشاء حساب','حساب جديد','register','inscription','comment creer'],
    a: { ar: REGISTRATION_GUIDE.overview_ar, fr: REGISTRATION_GUIDE.overview_fr }
  },
  {
    q: ['أنواع الحسابات','نوع الحساب','الفرق بين','ما الفرق','أي حساب','متجر مكتب شركة'],
    a: {
      ar: '🧭 أنواع الحسابات في رزق:\n\n👤 فرد موريتاني — للأفراد الذين يبيعون ويشترون\n👤 مقيم أجنبي — نفس صلاحيات الفرد\n🏪 متجر افتراضي — لأصحاب المحلات\n💼 مكتب افتراضي — لمقدمي الخدمات المهنية\n🏢 Rizq ADS — للشركات والمعارض الكبيرة\n\nاختر ما يناسب نشاطك!',
      fr: '🧭 Types de comptes sur Rizq:\n\n👤 Particulier mauritanien — pour ceux qui vendent et achètent\n👤 Résident étranger — mêmes droits que le particulier\n🏪 Boutique virtuelle — pour les commerçants\n💼 Bureau virtuel — pour les prestataires de services professionnels\n🏢 Rizq ADS — pour les entreprises et grands salons\n\nChoisissez ce qui correspond à votre activité!'
    }
  },
  {
    q: ['كيف أنشر إعلان','كيف انشر','نشر إعلان','نشر اعلان','بيع','post ad','publier annonce','publier une annonce'],
    a: { ar: SELLING_GUIDE.steps_ar, fr: SELLING_GUIDE.steps_fr }
  },
  {
    q: ['كيف أشتري','كيف اشتري','شراء','البحث عن منتج','acheter','buy'],
    a: { ar: BUYING_GUIDE.steps_ar, fr: BUYING_GUIDE.steps_fr }
  },
  {
    // ملاحظة (إصلاح #81): لا نضع SUBSCRIPTIONS_GUIDE.overview هنا مباشرة —
    // هذا النص ثابت وقديم وقد لا يطابق الباقات الحقيقية الحالية المحفوظة في
    // rizq_packages. نستخدم رمزاً خاصاً يُستبدَل لحظة الرد بنتيجة
    // _getPackagesSummary() الحيّة (انظر processMessage أسفل) ليطابق دائماً
    // البيانات الفعلية بدل نص مكتوب يدوياً — والدالة نفسها ثنائية اللغة أصلاً.
    q: ['الباقات','الاشتراكات','اشتراك','تجريبية','أساسي','ناسي','pro','ترقية','diamond','abonnement','prix','فضي','ذهبي','ماسي'],
    a: '__DYNAMIC_PACKAGES_SUMMARY__'
  },
  {
    q: ['كيف أدفع','طرق الدفع','bankily','sedad','دفع','بيماه','payment','paiement'],
    a: { ar: PAYMENT_GUIDE.overview_ar, fr: PAYMENT_GUIDE.overview_fr }
  },
  {
    q: ['توثيق الهوية','توثيق','هوية','بطاقة وطنية','verification','identité'],
    a: { ar: REGISTRATION_GUIDE.id_verification_ar, fr: REGISTRATION_GUIDE.id_verification_fr }
  },
  {
    q: ['لوحة التحكم','داشبورد','dashboard','tableau de bord'],
    a: {
      ar: DASHBOARDS_GUIDE.how_to_access_ar + '\n\n' + DASHBOARDS_GUIDE.store_ar,
      fr: DASHBOARDS_GUIDE.how_to_access_fr + '\n\n' + DASHBOARDS_GUIDE.store_fr
    }
  },
  {
    q: ['متجر افتراضي','محل إلكتروني','محل','boutique','magasin'],
    a: {
      ar: '🏪 المتجر الافتراضي في رزق:\n' + DASHBOARDS_GUIDE.store_ar + '\n\n' + REGISTRATION_GUIDE.account_types.store.when_ar + '\nللتسجيل: اختر "متجر افتراضي" عند التسجيل.',
      fr: '🏪 La boutique virtuelle sur Rizq:\n' + DASHBOARDS_GUIDE.store_fr + '\n\n' + REGISTRATION_GUIDE.account_types.store.when_fr + '\nPour vous inscrire: choisissez "Boutique virtuelle" lors de l\'inscription.'
    }
  },
  {
    q: ['مكتب افتراضي','خدمات مهنية','محامي','مهندس','طبيب','bureau','service professionnel'],
    a: {
      ar: '💼 المكتب الافتراضي في رزق:\n' + DASHBOARDS_GUIDE.office_ar + '\n\nمناسب لـ: المحامين، المهندسين، الأطباء، المعلمين، المستشارين...\nللتسجيل: اختر "مكتب افتراضي" عند التسجيل.',
      fr: '💼 Le bureau virtuel sur Rizq:\n' + DASHBOARDS_GUIDE.office_fr + '\n\nAdapté pour: avocats, ingénieurs, médecins, enseignants, consultants...\nPour vous inscrire: choisissez "Bureau virtuel" lors de l\'inscription.'
    }
  },
  {
    q: ['rizq ads','شركة','مؤسسة','معرض','إعلان مؤسسي','entreprise','corporate'],
    a: {
      ar: '🏢 Rizq ADS للمؤسسات:\n' + DASHBOARDS_GUIDE.corp_ar + '\n\nمناسب لـ: الشركات الكبيرة، وكالات السيارات، المعارض، المجمعات التجارية.\nللتسجيل: اختر "شركة" عند التسجيل.',
      fr: '🏢 Rizq ADS pour les institutions:\n' + DASHBOARDS_GUIDE.corp_fr + '\n\nAdapté pour: grandes entreprises, concessionnaires automobiles, salons, centres commerciaux.\nPour vous inscrire: choisissez "Entreprise" lors de l\'inscription.'
    }
  },
  {
    q: ['النائب الذكي','vip','diamond vip','مدير حساب'],
    a: { ar: SUBSCRIPTIONS_GUIDE.vip_deputy_ar, fr: SUBSCRIPTIONS_GUIDE.vip_deputy_fr }
  },
  {
    q: ['الفئات','الأقسام','ما هي الأقسام','كم قسم','16 قسم','catégories'],
    a: { ar: SECTIONS_GUIDE.categories_ar, fr: SECTIONS_GUIDE.categories_fr }
  },
  {
    q: ['أسعار اليوم','أسعار السوق','سعر البنزين','سعر الأرز','prix marché'],
    a: { ar: SECTIONS_GUIDE.prices_board_ar, fr: SECTIONS_GUIDE.prices_board_fr }
  },
  {
    q: ['ممنوع','محظور','لا يُسمح','مخالفة','interdit','forbidden'],
    a: { ar: SELLING_GUIDE.forbidden_ar, fr: SELLING_GUIDE.forbidden_fr }
  },
  {
    q: ['الإبلاغ','بلّغ','بلاغ','شكوى على إعلان','signaler','report'],
    a: { ar: TRUST_GUIDE.report_ar, fr: TRUST_GUIDE.report_fr }
  },
  {
    q: ['درجة الثقة','موثوق','شارة','badge','confiance'],
    a: { ar: TRUST_GUIDE.levels_ar, fr: TRUST_GUIDE.levels_fr }
  },
  {
    q: ['otp','رمز التحقق','رمز لم يصل','لم يصلني رمز'],
    a: { ar: REGISTRATION_GUIDE.otp_ar, fr: REGISTRATION_GUIDE.otp_fr }
  },
  {
    q: ['ما هي رزق','عن رزق','about rizq','qu est ce que rizq','عرفني','عرّفني','تعريف','شنو رزق','شنو هي رزق','كيف تعمل','كيف تشتغل','اخبرني','معلومات عن','نبذة','ما رزق','مارزق','c est quoi rizq','kesako rizq'],
    a: { ar: PLATFORM_OVERVIEW.what_is_ar, fr: PLATFORM_OVERVIEW.what_is_fr }
  },
  {
    q: ['من يستخدم','لمن رزق','يمكنني','مناسب لي','لمن هي','مناسبة','هل يمكن','هل ينفع','لأي'],
    a: { ar: PLATFORM_OVERVIEW.who_can_use_ar, fr: PLATFORM_OVERVIEW.who_can_use_fr }
  },
  {
    q: ['رمز الدفع','كود البنك','bank code','رمز البنك'],
    a: { ar: PAYMENT_GUIDE.bank_codes_ar, fr: PAYMENT_GUIDE.bank_codes_fr }
  },
  {
    q: ['بعد التسجيل','ماذا بعد','الخطوة التالية','next step'],
    a: { ar: REGISTRATION_GUIDE.after_register_ar, fr: REGISTRATION_GUIDE.after_register_fr }
  },
  {
    q: ['الشروط','القانون','Legal','سياسة','terms','conditions'],
    a: {
      ar: SECTIONS_GUIDE.legal_ar + '\nيمكنك قراءة الشروط الكاملة في صفحة "الشروط والأحكام" من القائمة.',
      fr: SECTIONS_GUIDE.legal_fr + '\nVous pouvez lire les conditions complètes dans la page "Conditions d\'utilisation" du menu.'
    }
  },
  {
    q: ['تواصل','اتصال','للاتصال','دعم','مساعدة','ارقام الهواتف','ارقام هواتف','ارقام','هواتف','رقم الهاتف','رقم هاتف','تلفون','هاتفكم','واتساب','whatsapp','contact','support','aide','téléphone','telephone','numero','numéro','phone number','call us'],
    a: {
      // إصلاح: رقم الهاتف (يبدأ بـ +) داخل نص عربي RTL ينعكس بصرياً بخوارزمية
      // Unicode Bidi الافتراضية (يظهر معكوساً "12 22 88 44 222+" بدل الترتيب
      // الطبيعي كما في الفرنسية). الحل: إحاطة كل رقم بعلامات عزل اتجاه Unicode
      // (LRI...PDI) تفرض LTR على الرقم فقط دون التأثير على بقية الجملة — تعمل
      // حتى كنص خام (الويدجت يعرض هذا النص مُهرَّباً عبر _esc()، فلا يمكن
      // استخدام <span dir="ltr">).
      ar: '📞 التواصل مع فريق رزق:\n\n📱 موريتل: ⁦+222 44 88 22 12⁩\n📱 ماتيل: ⁦+222 36 48 57 84⁩\n📱 شينقيتل: ⁦+222 22 70 83 38⁩\n\n📧 البريد: direction@rizq.mr\n🌐 الموقع: rizq.mr\n\n⏰ أوقات العمل: السبت–الخميس، 8ص–8م بتوقيت نواكشوط\n\nأو تابع معي — أستطيع حل معظم المشاكل مباشرة! 😊',
      fr: '📞 Contacter l\'équipe Rizq:\n\n📱 Mauritel: ⁦+222 44 88 22 12⁩\n📱 Mattel: ⁦+222 36 48 57 84⁩\n📱 Chinguitel: ⁦+222 22 70 83 38⁩\n\n📧 Email: direction@rizq.mr\n🌐 Site: rizq.mr\n\n⏰ Horaires: samedi–jeudi, 8h–20h (heure de Nouakchott)\n\nOu continuez avec moi — je peux résoudre la plupart des problèmes directement! 😊'
    }
  },
  {
    q: ['خصم','discount','réduction','تخفيض'],
    a: '__DYNAMIC_DISCOUNTS_SUMMARY__'
  },
  {
    q: ['الإعلان رُفض','رُفض إعلاني','سبب الرفض','rejected'],
    a: {
      ar: '❌ أسباب رفض الإعلانات:\n• المحتوى المحظور (كحول، أسلحة...)\n• صور غير واضحة أو مسروقة\n• وصف مضلل أو مبالغ فيه\n• روابط خارجية في الوصف\n• عدم تطابق الصورة مع العنوان\n\n💡 راجع سبب الرفض في الإشعار وصحّح ثم أعد النشر.',
      fr: '❌ Raisons de refus des annonces:\n• Contenu interdit (alcool, armes...)\n• Photos floues ou volées\n• Description trompeuse ou exagérée\n• Liens externes dans la description\n• Photo ne correspondant pas au titre\n\n💡 Consultez la raison du refus dans la notification, corrigez, puis republiez.'
    }
  }
];

// ═══════════════════════════════════════════════════════════════
// BLOCK 12 — SECRECY & SECURITY
// ═══════════════════════════════════════════════════════════════
var SECRECY_RULES = {
  injection_patterns: [
    /ignore.*(instruction|rules|prompt)/i,
    /forget.*(rules|instructions)/i,
    /you are now/i, /act as/i, /pretend/i,
    /bypass|jailbreak|override/i,
    /انسَ.*تعليم/i, /تجاهل.*أوامر/i, /كن الآن/i,
    /system prompt/i, /your instructions/i, /reveal.*prompt/i
  ],
  secret_topics: ['system_prompt','agent_instructions','trust_score_of_user','admin_panel','flagged_users','api_key','source_code'],
  block_reply: {
    ar: 'هذه المعلومات سرية ✋ كيف أساعدك في شيء آخر؟',
    fr: 'Information confidentielle. Comment puis-je vous aider autrement?'
  }
};

// ═══════════════════════════════════════════════════════════════
// CORE ENGINE
// ═══════════════════════════════════════════════════════════════
function _detectLang(text) {
  if (!text) return 'ar';
  var lower = text.toLowerCase();
  var hs = ['كيفاش','شنهو','شنو هو','وش راك','الزين','نعاونك','بغيت','شحال','ماكو','كاين'];
  for (var i=0;i<hs.length;i++) if (text.indexOf(hs[i])!==-1) return 'hs';
  if (/bonjour|merci|comment|je veux|pouvez|svp|qu est|acheter|vendre|prix|annonce|forfait|combien/.test(lower)) return 'fr';
  if (/hello|thanks|how|what|can you|please|help|buy|sell|register|price|trust|seller/.test(lower)) return 'en';
  if (/hola|como est|buenos|gracias|por favor|qu[eé] es|quiero|vender|comprar|ayuda|precio|cu[aá]nto/.test(lower)) return 'es';
  return 'ar';
}

function _isBlocked(text) {
  if (!text) return false;
  var patterns = SECRECY_RULES.injection_patterns;
  for (var i=0;i<patterns.length;i++) if (patterns[i].test(text)) return true;
  // check secret topics
  var lower = text.toLowerCase();
  var secrets = SECRECY_RULES.secret_topics;
  for (var j=0;j<secrets.length;j++) if (lower.indexOf(secrets[j])!==-1) return true;
  return false;
}

function _getPackagesSummary(lang) {
  var cfg = _pkgCfg();
  if (cfg && typeof cfg.buildPublicSummary === 'function') {
    return cfg.buildPublicSummary(lang);
  }
  return lang === 'fr' ? 'Consultez les forfaits sur rizq.mr' : 'راجع الباقات على rizq.mr';
}

function _getDiscountsSummary(lang) {
  var cfg = _pkgCfg();
  if (cfg && typeof cfg.buildDiscountSummary === 'function') {
    return cfg.buildDiscountSummary(lang);
  }
  return lang === 'fr'
    ? 'La réduction maximale sur les services de la plateforme est de 5%.'
    : 'أقصى خصم على خدمات المنصة هو 5%.';
}
function _norm(s) {
  return s.toLowerCase()
    .replace(/[\u064B-\u0652]/g,'')
    .replace(/[\u0623\u0625\u0622]/g,'\u0627')
    .replace(/\u0629/g,'\u0647');
}
// يحوّل a سواء كان نصاً (قديم/رمز خاص) أو كائناً ثنائي اللغة {ar,fr} إلى النص
// المناسب للغة lang — هذا هو الإصلاح الجذري لمشكلة "رد بالعربية على سؤال بالفرنسية".
function _resolveFAQAnswer(a, lang) {
  if (a && typeof a === 'object') {
    return (lang === 'fr' ? a.fr : a.ar) || a.ar || a.fr || '';
  }
  return a;
}

function _matchFAQ(text, lang) {
  if (!text) return null;
  var lower = _norm(text);
  var words = lower.split(/\s+/).filter(function(w){return w.length>2;});
  for (var i=0;i<FAQ.length;i++) {
    var entry = FAQ[i];
    for (var j=0;j<entry.q.length;j++) {
      var kw = _norm(entry.q[j]);
      // exact substring match
      if (lower.indexOf(kw) !== -1) return _resolveFAQAnswer(entry.a, lang);
      // word-based match: all significant words of keyword found in text
      var kwWords = kw.split(/\s+/).filter(function(w){return w.length>2;});
      if (kwWords.length >= 1) {
        var allFound = kwWords.every(function(kw2){
          return words.some(function(w){ return w.indexOf(kw2)!==-1 || kw2.indexOf(w)!==-1; });
        });
        if (allFound) return _resolveFAQAnswer(entry.a, lang);
      }
    }
  }
  return null;
}

function _isFarewell(text) {
  var lower = text.toLowerCase();
  return /وداع|مع السلام|شكرا|شكراً|au revoir|merci|goodbye|thanks|bye/.test(lower);
}

function processMessage(userMessage, context) {
  context = context || {};
  var text  = (userMessage || '').trim();
  var lower = text.toLowerCase().replace(/[\u064B-\u0652]/g,'').replace(/[\u0623\u0625\u0622]/g,'\u0627').replace(/\u0629/g,'\u0647');
  // كشف اللغة: من النص أولاً، ثم من إعداد الواجهة كاحتياطي
  var lang = (context.lang && ['ar', 'hs', 'fr', 'en', 'es'].indexOf(String(context.lang)) !== -1)
    ? String(context.lang)
    : _detectLang(text);
  if (lang === 'ar' && /^[\d\s?.!،,]+$/.test(text) && (context.uiLang || context.lang)) {
    lang = context.uiLang || context.lang;
  }

  if (_isBlocked(text)) {
    _escalateToHuman(text, lang, context, 'blocked');
    return { reply: lang==='fr' ? 'D\u00E9sol\u00E9, je ne peux pas r\u00E9pondre \u00E0 cela. Puis-je vous aider autrement?' : '\u0622\u0633\u0641\u060C \u0645\u0627 \u0623\u0642\u062F\u0631 \u0623\u062C\u0627\u0648\u0628 \u0639\u0644\u0649 \u0647\u0630\u0627. \u0641\u064A \u0634\u064A\u0621 \u0622\u062E\u0631 \u0623\u0633\u0627\u0639\u062F\u0643\u061F', lang: lang };
  }

  var pageAd = context.pageContext && context.pageContext.ad;
  if (pageAd && pageAd.id) {
    var adTitle = lang === 'fr' ? (pageAd.titleFr || pageAd.title) : (pageAd.title || pageAd.titleFr);
    if (/\u0633\u0639\u0631|price|prix|ثمن|combien|كم/.test(lower) && pageAd.price) {
      return {
        reply: lang === 'fr'
          ? 'Prix affiché pour «' + adTitle + '»: ' + pageAd.price + ' (données de l\'annonce ouverte).'
          : 'السعر المعروض لـ«' + adTitle + '»: ' + pageAd.price + ' (من بيانات الإعلان المفتوح).',
        lang: lang, grounded: true
      };
    }
    if (/\u0645\u0648\u062B\u0648\u0642|ثقة|trust|fiabl/.test(lower)) {
      var trust = pageAd.seller_trust_score != null ? pageAd.seller_trust_score : (pageAd.verified ? 85 : 60);
      return {
        reply: lang === 'fr'
          ? 'Score de confiance: ' + trust + '/100. Préférez les vendeurs vérifiés (badge ✅).'
          : 'درجة الثقة: ' + trust + '/100. يُفضّل البائعون الموثّقون (شارة ✅).',
        lang: lang, grounded: true
      };
    }
  }

  var socialGreet = /^(\u0643\u064A\u0641 \u0627\u0644\u062D\u0627\u0644|\u0643\u064A\u0641\u0643|\u0643\u064A\u0641 \u062D\u0627\u0644\u0643|\u0643\u064A\u0641\u0627\u0634|\u0634\u0644\u0648\u0646\u0643|\u0643\u064A\u0641 \u0627\u0644\u0627\u062D\u0648\u0627\u0644)/.test(lower);
    var isSalam = /\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064A\u0643\u0645|\u0633\u0644\u0627\u0645\u0648 \u0639\u0644\u064A\u0643\u0645/.test(lower);
  var isMorning = /^\u0635\u0628\u0627\u062D/.test(lower);
  var isEvening = /^\u0645\u0633\u0627\u0621/.test(lower);
  var directGreet = isSalam||isMorning||isEvening||/^(\u0647\u0644\u0627|\u0633\u0644\u0627\u0645|\u0645\u0631\u062D\u0628|\u0627\u0647\u0644\u0627|\u0645\u0631\u062D\u0628\u0627|hi |hi$|hello|hey|hola|buenos|bonjour|bonsoir|salut|ciao)/.test(lower);
  var isBye = /\u0634\u0643\u0631\u0627|\u0645\u0634\u0643\u0648\u0631|\u064A\u0639\u0637\u064A\u0643|\u0645\u0639 \u0627\u0644\u0633\u0644\u0627\u0645|\u0648\u062F\u0627\u0639|thanks|merci|gracias|bye/.test(lower);

  if (socialGreet) {
    return { reply: {
      ar: '\u0628\u062E\u064A\u0631 \u0648\u0627\u0644\u062D\u0645\u062F \u0644\u0644\u0647! \uD83D\uDE0A \u0648\u0623\u0646\u062A\u061F\n\u0643\u064A\u0641 \u0623\u0642\u062F\u0631 \u0623\u062E\u062F\u0645\u0643 \u0627\u0644\u064A\u0648\u0645\u061F',
      hs: '\u0644\u0628\u0627\u0633 \u0648\u0627\u0644\u062D\u0645\u062F \u0644\u0644\u0647! \uD83D\uDE0A \u0648\u0623\u0646\u062A\u061F\n\u0634\u0646\u0648 \u062A\u0628\u063A\u064A\u061F',
      fr: 'Je vais bien, merci! \uD83D\uDE0A Et vous?\nComment puis-je vous aider?',
      en: 'Doing well, thanks! \uD83D\uDE0A And you?\nHow can I help today?'
    }[lang] || '\u0628\u062E\u064A\u0631! \u0643\u064A\u0641 \u0623\u0633\u0627\u0639\u062F\u0643\u061F', lang: lang };
  }

  if (directGreet) {
    var dR;
    if (isSalam) dR = '\u0648\u0639\u0644\u064A\u0643\u0645 \u0627\u0644\u0633\u0644\u0627\u0645 \u0648\u0631\u062D\u0645\u0629 \u0627\u0644\u0644\u0647! \uD83D\uDE0A \u0623\u0647\u0644\u0627\u064B \u0628\u0643 \u0641\u064A \u0631\u0632\u0642. \u0634\u0648 \u0623\u0642\u062F\u0631 \u0623\u0633\u0627\u0639\u062F\u0643\u061F';
    else if (isMorning) dR = {ar:'\u0635\u0628\u0627\u062D \u0627\u0644\u0646\u0648\u0631! \u2600\uFE0F \u0634\u0648 \u0623\u062E\u062F\u0645\u0643 \u0647\u0630\u0627 \u0627\u0644\u0635\u0628\u0627\u062D\u061F',fr:'Bonjour! \u2600\uFE0F Comment puis-je vous aider?',en:'Good morning! \u2600\uFE0F How can I help?'}[lang]||'\u0635\u0628\u0627\u062D \u0627\u0644\u0646\u0648\u0631!';
    else if (isEvening) dR = {ar:'\u0645\u0633\u0627\u0621 \u0627\u0644\u0646\u0648\u0631! \uD83C\uDF19 \u0634\u0648 \u0623\u0642\u062F\u0631 \u0623\u0641\u064A\u062F\u0643\u061F',fr:'Bonsoir! \uD83C\uDF19 Comment puis-je vous aider?',en:'Good evening! \uD83C\uDF19 How can I help?'}[lang]||'\u0645\u0633\u0627\u0621 \u0627\u0644\u0646\u0648\u0631!';
    else dR = {ar:'\u0623\u0647\u0644\u064B\u0627! \uD83D\uDE0A \u0643\u064A\u0641 \u0623\u0633\u0627\u0639\u062F\u0643 \u0641\u064A \u0631\u0632\u0642\u061F',hs:'\u0645\u0631\u062D\u0628\u0627! \uD83D\uDE0A \u0634\u0646\u0648 \u062A\u0628\u063A\u064A\u061F',fr:'Bonjour! \uD83D\uDE0A Comment puis-je vous aider?',en:'Hey! \uD83D\uDE0A How can I help you today?',es:'\u00A1Hola! \uD83D\uDE0A \u00BFEn qu\u00E9 puedo ayudarte?'}[lang]||'\u0623\u0647\u0644\u064B\u0627! \uD83D\uDE0A';
    return { reply: dR, lang: lang };
  }

  if (isBye) {
    return { reply: {
      ar: '\u0628\u0643\u0644 \u0633\u0631\u0648\u0631! \uD83C\uDF1F \u0631\u0632\u0642 \u0641\u064A \u062E\u062F\u0645\u062A\u0643 \u062F\u0627\u0626\u0645\u064B\u0627.',
      hs: '\u0627\u0644\u0644\u0647 \u064A\u062E\u0644\u064A\u0643! \uD83C\uDF1F \u0631\u0632\u0642 \u0645\u0639\u0627\u0643.',
      fr: 'Avec plaisir! \uD83C\uDF1F A bientot!',
      en: 'My pleasure! \uD83C\uDF1F See you soon!'
    }[lang] || '\u0628\u0643\u0644 \u0633\u0631\u0648\u0631! \uD83C\uDF1F', lang: lang };
  }

  // About platform
  if (/\u0639\u0631\u0641\u0646\u064A|\u062A\u0639\u0631\u064A\u0641|\u0634\u0646\u0648.*\u0631\u0632\u0642|\u0645\u0627.*\u0647\u064A.*\u0631\u0632\u0642|\u0643\u064A\u0641.*\u062A\u0639\u0645\u0644|\u0643\u064A\u0641.*\u062A\u0634\u062A\u063A\u0644|\u0627\u062E\u0628\u0631\u0646\u064A|\u0645\u0639\u0644\u0648\u0645\u0627\u062A.*\u0639\u0646|\u0646\u0628\u0630\u0629|introduce|qu.est.*rizq|c.est.*quoi/.test(lower)) {
    return { reply: lang==='fr' ? PLATFORM_OVERVIEW.what_is_fr : PLATFORM_OVERVIEW.what_is_ar, lang: lang };
  }

  var faqMatch = _matchFAQ(text, lang);
  if (faqMatch) {
    // رمز الباقات الديناميكي — إصلاح إضافي مكتشف أثناء هذا التصحيح: كان يُعاد
    // حرفياً كنص "__DYNAMIC_PACKAGES_SUMMARY__" دون استبدال فعلي.
    if (faqMatch === '__DYNAMIC_PACKAGES_SUMMARY__') {
      return { reply: _getPackagesSummary(lang), lang: lang };
    }
    if (faqMatch === '__DYNAMIC_DISCOUNTS_SUMMARY__') {
      return { reply: _getDiscountsSummary(lang), lang: lang };
    }
    return { reply: faqMatch, lang: lang };
  }

  if (/\u062A\u0633\u062C\u064A\u0644|\u0627\u0634\u062A\u0631\u0643|register|signup|inscrire/.test(lower)) {
    return { reply: lang==='fr' ? 'L\'inscription est simple! \uD83D\uDE0A\nSeulement 2 minutes.\n\nD\'abord \u2014 quel type de compte?\n\uD83E\uDDD1 Particulier (achat et vente)\n\uD83C\uDFEA Boutique (pour les commer\u00E7ants)\n\uD83D\uDCBB Bureau virtuel (pour les services)\n\uD83C\uDFE2 Entreprise (pour les institutions)' : '\u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0633\u0647\u0644 \u062C\u062F\u064B\u0627! \uD83D\uDE0A\n\u062A\u062D\u062A\u0627\u062C \u062F\u0642\u064A\u0642\u062A\u064A\u0646 \u0641\u0642\u0637.\n\n\u0623\u0648\u0644\u0627\u064B \u2014 \u0645\u0627 \u0646\u0648\u0639 \u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0630\u064A \u062A\u0631\u064A\u062F\u0647\u061F\n\uD83E\uDDD1 \u0641\u0631\u062F (\u0644\u0644\u0628\u064A\u0639 \u0648\u0627\u0644\u0634\u0631\u0627\u0621)\n\uD83C\uDFEA \u0645\u062A\u062C\u0631 (\u0644\u0623\u0635\u062D\u0627\u0628 \u0627\u0644\u0645\u062D\u0644\u0627\u062A)\n\uD83D\uDCBB \u0645\u0643\u062A\u0628 \u0627\u0641\u062A\u0631\u0627\u0636\u064A (\u0644\u0644\u062E\u062F\u0645\u0627\u062A)\n\uD83C\uDFE2 \u0634\u0631\u0643\u0629 (\u0644\u0644\u0645\u0624\u0633\u0633\u0627\u062A)', lang: lang };
  }

  if (/\u0646\u0634\u0631|\u0625\u0639\u0644\u0627\u0646|\u0628\u064A\u0639|publier|sell|vender/.test(lower)) {
    return { reply: lang==='fr' ? 'Super! \uD83C\uDF89\n\nQue souhaitez-vous vendre? Dites-moi le produit et le prix, je vous aide \u00E0 r\u00E9diger une annonce qui attire les acheteurs.' : '\u0631\u0627\u0626\u0639! \uD83C\uDF89\n\n\u0645\u0627 \u0627\u0644\u0630\u064A \u062A\u0631\u064A\u062F \u0628\u064A\u0639\u0647\u061F \u0623\u062E\u0628\u0631\u0646\u064A \u0628\u0627\u0644\u0645\u0646\u062A\u062C \u0648\u0627\u0644\u0633\u0639\u0631 \u0648\u0633\u0623\u0633\u0627\u0639\u062F\u0643 \u062A\u0643\u062A\u0628 \u0648\u0635\u0641\u064B\u0627 \u064A\u062C\u0630\u0628 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0646.', lang: lang };
  }

  if (/\u0627\u0634\u062A\u0631\u064A|\u0634\u0631\u0627\u0621|acheter|buy/.test(lower)) {
    return { reply: lang==='fr' ? 'Avec plaisir! \uD83D\uDE0A\nQue recherchez-vous exactement?' : '\u064A\u0633\u0639\u062F\u0646\u064A \u0623\u0633\u0627\u0639\u062F\u0643! \uD83D\uDE0A\n\u0645\u0627\u0630\u0627 \u062A\u0628\u062D\u062B \u0639\u0646\u0647 \u062A\u062D\u062F\u064A\u062F\u064B\u0627\u061F', lang: lang };
  }

  if (/\u0628\u0627\u0642\u0629|\u0627\u0634\u062A\u0631\u0627\u0643|\u0645\u0627\u0633\u064A|\u0630\u0647\u0628\u064A|\u0641\u0636\u064A|abonnement|plan|subscri/.test(lower)) {
    return { reply: _getPackagesSummary(lang), lang: lang };
  }

  if (/\u062F\u0641\u0639|bankily|sedad|payment|paiement/.test(lower)) {
    return { reply: lang==='fr' ? 'Nous acceptons 3 moyens de paiement:\n\uD83D\uDCB3 Bankily\n\uD83D\uDFE2 Sedad\n\uD83D\uDCB5 Esp\u00E8ces avec le vendeur\n\nLequel pr\u00E9f\u00E9rez-vous?' : '\u0646\u0642\u0628\u0644 \u0627\u0644\u062F\u0641\u0639 \u0628\u062B\u0644\u0627\u062B \u0637\u0631\u0642:\n\uD83D\uDCB3 Bankily\n\uD83D\uDFE2 Sedad\n\uD83D\uDCB5 \u0646\u0642\u062F\u064B\u0627 \u0645\u0639 \u0627\u0644\u0628\u0627\u0626\u0639\n\n\u0623\u064A \u0637\u0631\u064A\u0642\u0629 \u062A\u0631\u064A\u062F\u061F', lang: lang };
  }

  if (/\u0634\u0643\u0648\u0649|\u0645\u0634\u0643\u0644\u0629|\u0627\u062D\u062A\u064A\u0627\u0644|probleme|fraud/.test(lower)) {
    _escalateToHuman(text, lang, context, 'urgent_fraud');
    return { reply: lang==='fr' ? 'D\u00E9sol\u00E9 pour ce probl\u00E8me! \uD83D\uDE14\nDonnez-moi le num\u00E9ro de l\'annonce et ce qui s\'est pass\u00E9.\nNotre \u00E9quipe r\u00E9pond dans les 24 heures.' : '\u0622\u0633\u0641 \u0639\u0644\u0649 \u0645\u0627 \u0648\u0627\u062C\u0647\u062A\u0647! \uD83D\uDE14\n\u0623\u062E\u0628\u0631\u0646\u064A \u0628\u0631\u0642\u0645 \u0627\u0644\u0625\u0639\u0644\u0627\u0646 \u0648\u0645\u0627 \u062D\u062F\u062B \u0628\u0627\u0644\u0636\u0628\u0637.\n\u0641\u0631\u064A\u0642\u0646\u0627 \u064A\u0631\u062F \u062E\u0644\u0627\u0644 24 \u0633\u0627\u0639\u0629.', lang: lang };
  }

  // Location / address
  if (/\u0645\u0648\u0642\u0639|\u0639\u0646\u0648\u0627\u0646|\u0641\u064A\u0646|\u0648\u064A\u0646|\u0623\u064A\u0646|location|adresse|donde/.test(lower)) {
    var locR = _matchFAQ("\u0639\u0646\u0648\u0627\u0646 \u0631\u0632\u0642", lang) || '{\u0644\u0644\u062A\u0648\u0627\u0635\u0644: direction@rizq.mr \u0623\u0648 rizq.mr}';
    return { reply: lang==='fr' ? '\uD83D\uDCCD Rizq est une plateforme en ligne. Contactez-nous: direction@rizq.mr' : '\uD83D\uDCCD \u0631\u0632\u0642 \u0645\u0646\u0635\u0629 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629. \u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627: direction@rizq.mr', lang: lang };
  }

  // Trust / verification
  if (/\u062A\u0648\u062B\u064A\u0642|\u0645\u0648\u062B\u0648\u0642|\u0634\u0627\u0631\u0629|\u0646\u0642\u0627\u0637|confiance|trust|verified/.test(lower)) {
    var trustEntry = _matchFAQ("\u0645\u0633\u062A\u0648\u064A\u0627\u062A \u0627\u0644\u062B\u0642\u0629", lang);
    return { reply: trustEntry || (lang==='fr' ? '\u2705 Nous avons 4 niveaux de confiance. Commencez par ajouter une photo d\'identit\u00E9 pour devenir v\u00E9rifi\u00E9 et publier vos annonces.' : '\u2705 \u0644\u062F\u064A\u0646\u0627 4 \u0645\u0633\u062A\u0648\u064A\u0627\u062A \u062B\u0642\u0629. \u0623\u0628\u062F\u0623 \u0628\u0631\u0641\u0639 \u0635\u0648\u0631\u0629 \u0647\u0648\u064A\u062A\u0643 \u0644\u062A\u0635\u0628\u062D \u0645\u0648\u062B\u0651\u0642\u064B\u0627 \u0648\u062A\u0646\u0634\u0631 \u0625\u0639\u0644\u0627\u0646\u0627\u062A\u0643.'), lang: lang };
  }

  // Categories / sections
  if (/\u0641\u0626\u0629|\u0642\u0633\u0645|\u0623\u0642\u0633\u0627\u0645|\u0645\u0646\u062A\u062C|cat[eé]gorie|section/.test(lower)) {
    var catEntry = _matchFAQ("\u0627\u0644\u0641\u0626\u0627\u062A", lang);
    return { reply: catEntry || (lang==='fr' ? '\uD83D\uDCC2 Nous avons 16 cat\u00E9gories: voitures, immobilier, \u00E9lectronique, v\u00EAtements, alimentation, services et plus. Sur quelle cat\u00E9gorie?' : '\uD83D\uDCC2 \u0644\u062F\u064A\u0646\u0627 16 \u0641\u0626\u0629: \u0633\u064A\u0627\u0631\u0627\u062A\u060C \u0639\u0642\u0627\u0631\u0627\u062A\u060C \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A\u060C \u0645\u0644\u0627\u0628\u0633\u060C \u0623\u063A\u0630\u064A\u0629\u060C \u062E\u062F\u0645\u0627\u062A \u0648\u063A\u064A\u0631\u0647\u0627. \u0639\u0646 \u0623\u064A \u0641\u0626\u0629 \u062A\u0633\u0623\u0644\u061F'), lang: lang };
  }

  // How to post ad
  if (/\u0643\u064A\u0641.*\u0646\u0634\u0631|\u062E\u0637\u0648\u0627\u062A|\u0637\u0631\u064A\u0642\u0629|\u0648\u0635\u0641|comment.*publier|how.*post/.test(lower)) {
    var postEntry = _matchFAQ("\u0643\u064A\u0641 \u062A\u0646\u0634\u0631", lang);
    return { reply: postEntry || (lang==='fr' ? '\uD83D\uDE0A Pour publier: Inscrivez-vous \u2192 Choisissez une cat\u00E9gorie \u2192 Ajoutez photos + description + prix \u2192 Envoyez. \u00CAtes-vous d\u00E9j\u00E0 inscrit?' : '\uD83D\uDE0A \u0644\u0646\u0634\u0631 \u0625\u0639\u0644\u0627\u0646: \u0633\u062C\u0651\u0644 → \u0627\u062E\u062A\u0631 \u0641\u0626\u0629 → \u0623\u0636\u0641 \u0635\u0648\u0631 + \u0648\u0635\u0641 + \u0633\u0639\u0631 → \u0623\u0631\u0633\u0644. \u0647\u0644 \u0633\u062C\u0651\u0644\u062A \u0628\u0639\u062F\u061F'), lang: lang };
  }

  // Forgot password / login issue
  if (/\u0646\u0633\u064A\u062A|\u0643\u0644\u0645\u0629 \u0633\u0631|\u062F\u062E\u0648\u0644|\u062A\u0633\u062C\u064A\u0644 \u062F\u062E\u0648\u0644|oubli|forgot|password|login/.test(lower)) {
    return { reply: lang==='fr' ? '\uD83D\uDD11 Cliquez sur "Mot de passe oubli\u00E9" sur la page de connexion.\nVous recevrez un message sur votre t\u00E9l\u00E9phone pour r\u00E9initialiser.' : '\uD83D\uDD11 \u0627\u0636\u063A\u0637 "\u0646\u0633\u064A\u062A \u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0631" \u0641\u064A \u0635\u0641\u062D\u0629 \u0627\u0644\u062F\u062E\u0648\u0644.\n\u0633\u062A\u0635\u0644\u0643 \u0631\u0633\u0627\u0644\u0629 \u0639\u0644\u0649 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641\u0643 \u0644\u0625\u0639\u0627\u062F\u0629 \u0627\u0644\u062A\u0639\u064A\u064A\u0646.', lang: lang };
  }

  if (context.tier === 'diamond' && /\u062A\u0642\u0631\u064A\u0631|\u062A\u062D\u0644\u064A\u0644|report|analyse/.test(lower)) {
    _escalateToHuman(text, lang, context, 'urgent_vip');
    return { reply: lang==='fr' ? '\uD83D\uDC8E VIP! Votre gestionnaire de compte vous contactera dans 2 minutes.' : '\uD83D\uDC8E VIP! \u0645\u062F\u064A\u0631 \u062D\u0633\u0627\u0628\u0643 \u0633\u064A\u062A\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u062E\u0644\u0627\u0644 \u062F\u0642\u064A\u0642\u062A\u064A\u0646.', lang: lang, vip: true };
  }

  // Language switch
  if (/espa[n\u00f1]ol|habla espa|speak english|parle fran|\u062A\u0643\u0644\u0645 \u0639\u0631\u0628\u064A/.test(lower)) {
    var ls={ar:'\u0628\u0643\u0644 \u0633\u0631\u0648\u0631! \u0627\u0643\u062A\u0628 \u0633\u0624\u0627\u0644\u0643 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629.',es:'\u00A1Claro! \uD83D\uDE0A \u00BFEn qu\u00E9 puedo ayudarte?',fr:'Bien s\u00FBr! \uD83D\uDE0A Comment puis-je vous aider?',en:'Of course! \uD83D\uDE0A What would you like to know?'};
    return { reply: ls[lang]||ls.ar, lang: lang };
  }
  var cf = {ar:'\u0645\u0627 \u0641\u0647\u0645\u062A \uD83D\uDE0A \u0645\u0645\u0643\u0646 \u062A\u0648\u0636\u062D\u061F',es:'No entend\u00ED \uD83D\uDE0A \u00BFPuedes explicar m\u00E1s?',fr:'Je n ai pas compris \uD83D\uDE0A Pouvez-vous pr\u00E9ciser?',en:'Didn\'t catch that \uD83D\uDE0A Could you clarify?',hs:'\u0645\u0627 \u0641\u0647\u0645\u062A\u0634 \uD83D\uDE0A \u0648\u0636\u062D \u0644\u064A.'};
  _logMissedQuestion(userMessage, lang, context);
  return { reply: cf[lang]||cf.ar, lang: lang };
}

// \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0627\u0644\u062A\u064A \u0644\u0645 \u064A\u0641\u0647\u0645\u0647\u0627 \u0627\u0644\u0648\u0643\u064A\u0644 \u2014 \u062A\u064F\u0639\u0631\u0636 \u0644\u0644\u0623\u062F\u0645\u064A\u0646 \u0644\u062A\u062D\u0633\u064A\u0646 \u0627\u0644\u0631\u062F\u0648\u062F \u0644\u0627\u062D\u0642\u0627\u064B
// type: 'missed' (\u0627\u0641\u062A\u0631\u0627\u0636\u064A) \u0623\u0648 'urgent' (\u064A\u062D\u062A\u0627\u062C \u0631\u062F \u0628\u0634\u0631\u064A \u0641\u0639\u0644\u064A \u0644\u0627 \u062F\u0631\u062F\u0622\u0644\u064A)
function _logMissedQuestion(text, lang, context, type){
  try {
    var KEY = 'rizq_missed_questions';
    var list = JSON.parse(localStorage.getItem(KEY) || '[]');
    list.unshift({
      text: String(text || '').slice(0, 300),
      lang: lang || 'ar',
      tier: (context && context.tier) || '',
      type: type || 'missed',
      page: (typeof location !== 'undefined' ? location.pathname : ''),
      at: new Date().toISOString()
    });
    if (list.length > 200) list = list.slice(0, 200);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {}
}

// \u062A\u0635\u0639\u064A\u062F \u0641\u0639\u0644\u064A \u0644\u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0628\u0634\u0631\u064A\u0629 \u2014 \u0643\u0627\u0646\u062A \u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0648\u0643\u064A\u0644 (\u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0644\u060C VIP\u060C \u0627\u0644\u0645\u062D\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u0638\u0648\u0631) \u062A\u062F\u0651\u0639\u064A \u0623\u0646\u0647\u0627
// \u0633\u062A\u0635\u0639\u0651\u062F \u0644\u0644\u0625\u062F\u0627\u0631\u0629 \u062F\u0648\u0646 \u0623\u064A \u062A\u0633\u062C\u064A\u0644 \u0641\u0639\u0644\u064A \u2014 \u0647\u0630\u0647 \u0627\u0644\u062F\u0627\u0644\u0629 \u062A\u0633\u062C\u0651\u0644 \u0641\u0639\u0644\u0627\u064B \u0641\u064A \u0646\u0641\u0633 \u0642\u0627\u0626\u0645\u0629 \u0644\u0648\u062D\u0629 \u0627\u0644\u0623\u062F\u0645\u0646
function _escalateToHuman(text, lang, context, reasonType){
  _logMissedQuestion(text, lang, context, reasonType || 'urgent');
}

// ═══════════════════════════════════════════════════════════════
// LOAD ADMIN OVERRIDES FROM localStorage (set via rizq_admin.html)
// ═══════════════════════════════════════════════════════════════
function _applyManagerConfigOverrides(cfg){
  try {
    if(!cfg) return;
    if(cfg.greeting_ar) RIZQ_IDENTITY.greeting.ar = cfg.greeting_ar;
    if(cfg.greeting_fr) RIZQ_IDENTITY.greeting.fr = cfg.greeting_fr;
    if(cfg.greeting_hs) RIZQ_IDENTITY.greeting.hs = cfg.greeting_hs;
    if(cfg.name_ar)     RIZQ_IDENTITY.name_ar = cfg.name_ar;
    if(cfg.name)        RIZQ_IDENTITY.name_ar = cfg.name;
    if(cfg.email)       RIZQ_IDENTITY.email   = cfg.email;
    if(cfg.custom_faqs && cfg.custom_faqs.length > 0){
      cfg.custom_faqs.forEach(function(faq){
        if(!faq.keywords || !faq.answer) return;
        var kws = faq.keywords.split(',').map(function(k){return k.trim().toLowerCase();}).filter(Boolean);
        // إصلاح (اكتُشف أثناء تصحيح مشكلة اللغة): كان يُدفَع بمفاتيح
        // keywords_ar/answer_ar التي لا تقرأها _matchFAQ إطلاقاً (تقرأ فقط
        // q/a) — فكانت أي إضافة FAQ من لوحة التحكم تُحفَظ لكن لا تُطابَق أبداً.
        if(kws.length) FAQ.push({ q: kws, a: { ar: faq.answer, fr: faq.answer } });
      });
    }
    if(cfg.block_reply && SECRECY_RULES){
      SECRECY_RULES.block_reply = {ar: cfg.block_reply, fr: cfg.block_reply, hs: cfg.block_reply};
    }
  } catch(e) {}
}

(function(){
  try {
    var ov = typeof localStorage !== 'undefined' ? localStorage.getItem('rizq_manager_config') : null;
    if(ov) _applyManagerConfigOverrides(JSON.parse(ov));
  } catch(e) {}

  // ── إصلاح جوهري: إعدادات وكيل رزق الذكي (الاسم/الترحيب/الأسئلة الشائعة/
  // القيود) كانت rizq_manager_config محلية 100% — أي تخصيص يضبطه الأدمن من
  // جهازه لا يظهر أبداً في الوكيل الذي يراه زائر على جهاز آخر. نطبّق النسخة
  // المحلية فوراً أعلاه (بلا تأخير)، ثم نجلب آخر نسخة من الخادم إن توفّر
  // (قد تكون أحدث من جهاز أدمن آخر) ونعيد تطبيقها فوق ما سبق.
  try {
    if (typeof window !== 'undefined' && window.RIZQ_BACKEND_BASE) {
      fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/site-config')
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          var cfg = data && data.ok && data.config && data.config.managerConfig;
          if (!cfg) return;
          try { localStorage.setItem('rizq_manager_config', JSON.stringify(cfg)); } catch (e) {}
          _applyManagerConfigOverrides(cfg);
        }).catch(function () {});
    }
  } catch (e) {}
})();

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
(function(root){
  var API = {
    processMessage: processMessage,
    detectLanguage: _detectLang,
    FAQ: FAQ,
    IDENTITY: RIZQ_IDENTITY,
    SUBSCRIPTIONS: SUBSCRIPTIONS_GUIDE,
    PAYMENTS: PAYMENT_GUIDE,
    REGISTRATION: REGISTRATION_GUIDE,
    PLATFORM: PLATFORM_OVERVIEW
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  else { root.RizqManager = API; }
})(typeof window !== 'undefined' ? window : global);
