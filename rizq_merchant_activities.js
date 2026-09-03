/**
 * rizq_merchant_activities.js
 * © Rizq ADMINIA SARL — Scalable merchant activity catalog per account/package type
 * Node: require('./rizq_merchant_activities')
 * Browser: window.RizqMerchantActivities
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RizqMerchantActivities = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global, function () {
  'use strict';

  /** @typedef {{ id: string, nameAr: string, nameFr: string, icon?: string, accountTypes: string[], packageIds?: string[]|null, sectorId: string }} Activity */

  var SECTORS = {
    store: [
      { id: 'automotive', nameAr: 'سيارات ومركبات', nameFr: 'Automobile & véhicules' },
      { id: 'electronics', nameAr: 'إلكترونيات وتقنية', nameFr: 'Électronique & tech' },
      { id: 'home', nameAr: 'أثاث وديكور منزلي', nameFr: 'Meubles & décoration' },
      { id: 'construction', nameAr: 'بناء ومواد', nameFr: 'Construction & matériaux' },
      { id: 'jewelry', nameAr: 'ذهب ومجوهرات', nameFr: 'Or & bijoux' },
      { id: 'fashion', nameAr: 'أزياء وموضة', nameFr: 'Mode & vêtements' },
      { id: 'food', nameAr: 'أغذية ومطاعم', nameFr: 'Alimentation & restauration' },
      { id: 'equipment', nameAr: 'معدات وتجارة', nameFr: 'Équipements & commerce' },
      { id: 'agriculture', nameAr: 'ماشية وزراعة', nameFr: 'Bétail & agriculture' },
      { id: 'services_retail', nameAr: 'خدمات تجارية', nameFr: 'Services commerciaux' },
    ],
    office: [
      { id: 'legal', nameAr: 'قانون وعدالة', nameFr: 'Droit & justice' },
      { id: 'admin', nameAr: 'إدارة وخدمات حكومية', nameFr: 'Administration & services publics' },
      { id: 'consular', nameAr: 'خدمات قنصلية ووثائق', nameFr: 'Services consulaires & documents' },
      { id: 'insurance', nameAr: 'تأمين ومالية', nameFr: 'Assurance & finance' },
      { id: 'engineering', nameAr: 'هندسة وتقنية', nameFr: 'Ingénierie & technique' },
      { id: 'realestate', nameAr: 'عقارات وتصميم', nameFr: 'Immobilier & design' },
      { id: 'consulting', nameAr: 'استشارات وإدارة', nameFr: 'Conseil & gestion' },
      { id: 'health', nameAr: 'صحة وطب', nameFr: 'Santé & médecine' },
      { id: 'education', nameAr: 'تعليم وتدريب', nameFr: 'Éducation & formation' },
      { id: 'travel', nameAr: 'سفر وسياحة', nameFr: 'Voyage & tourisme' },
      { id: 'it', nameAr: 'تقنية معلومات', nameFr: 'Informatique & digital' },
      { id: 'general_office', nameAr: 'استقبال وخدمات عامة', nameFr: 'Accueil & services généraux' },
    ],
    corp: [
      { id: 'showroom', nameAr: 'معارض وبيع', nameFr: 'Showrooms & vente' },
      { id: 'industrial', nameAr: 'صناعة وتجارة', nameFr: 'Industrie & commerce' },
      { id: 'hospitality', nameAr: 'ضيافة وفندقة', nameFr: 'Hôtellerie & hospitality' },
      { id: 'logistics', nameAr: 'لوجistics ونقل', nameFr: 'Logistique & transport' },
      { id: 'enterprise_services', nameAr: 'خدمات مؤسسية', nameFr: 'Services entreprise' },
      { id: 'import_export', nameAr: 'استيراد وتصدير', nameFr: 'Import & export' },
    ],
  };

  /** Expandable flat catalog — add entries without UI code changes */
  var ACTIVITIES = [
    // ── STORE / retail ──
    { id: 'st_cars_new', sectorId: 'automotive', accountTypes: ['store', 'corp'], nameAr: 'بيع سيارات جديدة', nameFr: 'Vente de voitures neuves', icon: '🚗' },
    { id: 'st_cars_used', sectorId: 'automotive', accountTypes: ['store', 'corp'], nameAr: 'بيع سيارات مستعملة', nameFr: 'Vente de voitures d\'occasion', icon: '🚙' },
    { id: 'st_motorcycles', sectorId: 'automotive', accountTypes: ['store'], nameAr: 'دراجات نارية', nameFr: 'Motos & scooters', icon: '🏍️' },
    { id: 'st_spare_parts', sectorId: 'automotive', accountTypes: ['store'], nameAr: 'قطع غيار سيارات', nameFr: 'Pièces détachées auto', icon: '🔧' },
    { id: 'st_tires', sectorId: 'automotive', accountTypes: ['store'], nameAr: 'إطارات وبطاريات', nameFr: 'Pneus & batteries', icon: '🛞' },
    { id: 'st_phones', sectorId: 'electronics', accountTypes: ['store'], nameAr: 'هواتف ذكية', nameFr: 'Smartphones', icon: '📱' },
    { id: 'st_computers', sectorId: 'electronics', accountTypes: ['store'], nameAr: 'حاسوب ولابتوب', nameFr: 'Ordinateurs & laptops', icon: '💻' },
    { id: 'st_tv_audio', sectorId: 'electronics', accountTypes: ['store'], nameAr: 'شاشات وصوتيات', nameFr: 'Écrans & audio', icon: '📺' },
    { id: 'st_appliances', sectorId: 'electronics', accountTypes: ['store'], nameAr: 'أجهزة منزلية', nameFr: 'Électroménager', icon: '🔌' },
    { id: 'st_accessories', sectorId: 'electronics', accountTypes: ['store'], nameAr: 'إكسسوارات إلكترونية', nameFr: 'Accessoires électroniques', icon: '🎧' },
    { id: 'st_furniture', sectorId: 'home', accountTypes: ['store'], nameAr: 'أثاث منزلي', nameFr: 'Meubles maison', icon: '🛋️' },
    { id: 'st_decor', sectorId: 'home', accountTypes: ['store'], nameAr: 'ديكور وإضاءة', nameFr: 'Déco & éclairage', icon: '💡' },
    { id: 'st_curtains', sectorId: 'home', accountTypes: ['store'], nameAr: 'ستائر وسجاد', nameFr: 'Rideaux & tapis', icon: '🪟' },
    { id: 'st_kitchen', sectorId: 'home', accountTypes: ['store'], nameAr: 'أدوات مطبخ', nameFr: 'Ustensiles de cuisine', icon: '🍳' },
    { id: 'st_cement', sectorId: 'construction', accountTypes: ['store'], nameAr: 'أسمنت وحديد', nameFr: 'Ciment & fer', icon: '🧱' },
    { id: 'st_tiles', sectorId: 'construction', accountTypes: ['store'], nameAr: 'سيراميك وبلاط', nameFr: 'Carrelage & céramique', icon: '🔲' },
    { id: 'st_plumbing', sectorId: 'construction', accountTypes: ['store'], nameAr: 'سباكة وكهرباء', nameFr: 'Plomberie & électricité', icon: '🔩' },
    { id: 'st_paint', sectorId: 'construction', accountTypes: ['store'], nameAr: 'دهانات وعزل', nameFr: 'Peintures & isolation', icon: '🎨' },
    { id: 'st_tools', sectorId: 'construction', accountTypes: ['store'], nameAr: 'أدوات بناء', nameFr: 'Outils de construction', icon: '🛠️' },
    { id: 'st_gold_retail', sectorId: 'jewelry', accountTypes: ['store'], nameAr: 'بيع ذهب بالتجزئة', nameFr: 'Vente d\'or au détail', icon: '💎' },
    { id: 'st_jewelry', sectorId: 'jewelry', accountTypes: ['store'], nameAr: 'مجوهرات واكسسوارات', nameFr: 'Bijoux & accessoires', icon: '💍' },
    { id: 'st_clothing', sectorId: 'fashion', accountTypes: ['store'], nameAr: 'ملابس وأحذية', nameFr: 'Vêtements & chaussures', icon: '👗' },
    { id: 'st_perfume', sectorId: 'fashion', accountTypes: ['store'], nameAr: 'عطور ومستحضرات', nameFr: 'Parfums & cosmétiques', icon: '🧴' },
    { id: 'st_grocery', sectorId: 'food', accountTypes: ['store'], nameAr: 'بقالة وتموين', nameFr: 'Épicerie & alimentation', icon: '🛒' },
    { id: 'st_restaurant', sectorId: 'food', accountTypes: ['store'], nameAr: 'مطعم أو كافيه', nameFr: 'Restaurant ou café', icon: '🍽️' },
    { id: 'st_machinery', sectorId: 'equipment', accountTypes: ['store'], nameAr: 'معدات ومكائن', nameFr: 'Machines & équipements', icon: '⚙️' },
    { id: 'st_wholesale', sectorId: 'equipment', accountTypes: ['store'], nameAr: 'بيع بالجملة', nameFr: 'Vente en gros', icon: '📦' },
    { id: 'st_livestock', sectorId: 'agriculture', accountTypes: ['store'], nameAr: 'ماشية ودواجن', nameFr: 'Bétail & volaille', icon: '🐄' },
    { id: 'st_feed', sectorId: 'agriculture', accountTypes: ['store'], nameAr: 'أعلاف ومستلزمات زراعية', nameFr: 'Aliments & fournitures agricoles', icon: '🌾' },
    { id: 'st_repair', sectorId: 'services_retail', accountTypes: ['store'], nameAr: 'صيانة وإصلاح', nameFr: 'Maintenance & réparation', icon: '🔧' },
    { id: 'st_other', sectorId: 'services_retail', accountTypes: ['store'], nameAr: 'نشاط تجاري آخر', nameFr: 'Autre activité commerciale', icon: '🏷️' },

    // ── OFFICE / professional ──
    { id: 'of_law', sectorId: 'legal', accountTypes: ['office'], nameAr: 'مكتب محاماة', nameFr: 'Cabinet d\'avocats', icon: '⚖️' },
    { id: 'of_notary', sectorId: 'legal', accountTypes: ['office'], nameAr: 'موثق / كاتب عدل', nameFr: 'Notaire', icon: '📜' },
    { id: 'of_legal_consult', sectorId: 'legal', accountTypes: ['office'], nameAr: 'استشارات قانونية', nameFr: 'Conseil juridique', icon: '📋' },
    { id: 'of_arbitration', sectorId: 'legal', accountTypes: ['office'], nameAr: 'تحكيم وتسوية نزاعات', nameFr: 'Arbitrage & médiation', icon: '🤝' },
    { id: 'of_admin_services', sectorId: 'admin', accountTypes: ['office'], nameAr: 'خدمات إدارية', nameFr: 'Services administratifs', icon: '🏛️' },
    { id: 'of_gov_docs', sectorId: 'admin', accountTypes: ['office'], nameAr: 'إنجاز معاملات رسمية', nameFr: 'Démarches administratives', icon: '📑' },
    { id: 'of_translation_official', sectorId: 'admin', accountTypes: ['office'], nameAr: 'ترجمة معتمدة', nameFr: 'Traduction certifiée', icon: '🌐' },
    { id: 'of_consular', sectorId: 'consular', accountTypes: ['office'], nameAr: 'خدمات قنصلية', nameFr: 'Services consulaires', icon: '🛂' },
    { id: 'of_visa_travel_docs', sectorId: 'consular', accountTypes: ['office'], nameAr: 'تأشيرات ووثائق سفر', nameFr: 'Visas & documents de voyage', icon: '✈️' },
    { id: 'of_passport_services', sectorId: 'consular', accountTypes: ['office'], nameAr: 'خدمات جوازات', nameFr: 'Services passeports', icon: '📘' },
    { id: 'of_insurance_auto', sectorId: 'insurance', accountTypes: ['office'], nameAr: 'تأمين مركبات', nameFr: 'Assurance véhicules', icon: '🛡️' },
    { id: 'of_insurance_health', sectorId: 'insurance', accountTypes: ['office'], nameAr: 'تأمين صحي', nameFr: 'Assurance santé', icon: '🏥' },
    { id: 'of_insurance_business', sectorId: 'insurance', accountTypes: ['office'], nameAr: 'تأمين أعمال ومؤسسات', nameFr: 'Assurance entreprises', icon: '🏢' },
    { id: 'of_brokerage', sectorId: 'insurance', accountTypes: ['office'], nameAr: 'وساطة تأمين', nameFr: 'Courtage en assurance', icon: '💼' },
    { id: 'of_accounting', sectorId: 'insurance', accountTypes: ['office'], nameAr: 'محاسبة ومراجعة', nameFr: 'Comptabilité & audit', icon: '🧮' },
    { id: 'of_banking_agent', sectorId: 'insurance', accountTypes: ['office'], nameAr: 'وكالة بنكية / تحويلات', nameFr: 'Agence bancaire / transferts', icon: '🏦' },
    { id: 'of_civil_engineering', sectorId: 'engineering', accountTypes: ['office'], nameAr: 'هندسة مدنية', nameFr: 'Génie civil', icon: '🏗️' },
    { id: 'of_electrical_engineering', sectorId: 'engineering', accountTypes: ['office'], nameAr: 'هندسة كهربائية', nameFr: 'Génie électrique', icon: '⚡' },
    { id: 'of_mechanical_engineering', sectorId: 'engineering', accountTypes: ['office'], nameAr: 'هندسة ميكانيكية', nameFr: 'Génie mécanique', icon: '⚙️' },
    { id: 'of_software_engineering', sectorId: 'engineering', accountTypes: ['office'], nameAr: 'هندسة برمجيات', nameFr: 'Ingénierie logicielle', icon: '👨‍💻' },
    { id: 'of_surveying', sectorId: 'engineering', accountTypes: ['office'], nameAr: 'مساحة و топographie', nameFr: 'Topographie & arpentage', icon: '📐' },
    { id: 'of_architecture', sectorId: 'realestate', accountTypes: ['office'], nameAr: 'تصميم معماري', nameFr: 'Architecture & design', icon: '📐' },
    { id: 'of_interior_design', sectorId: 'realestate', accountTypes: ['office'], nameAr: 'تصميم داخلي وديكور', nameFr: 'Design intérieur', icon: '🖼️' },
    { id: 'of_realestate_agency', sectorId: 'realestate', accountTypes: ['office'], nameAr: 'وساطة عقارية', nameFr: 'Agence immobilière', icon: '🏠' },
    { id: 'of_property_mgmt', sectorId: 'realestate', accountTypes: ['office'], nameAr: 'إدارة عقارات', nameFr: 'Gestion immobilière', icon: '🔑' },
    { id: 'of_valuation', sectorId: 'realestate', accountTypes: ['office'], nameAr: 'تقييم عقاري', nameFr: 'Évaluation immobilière', icon: '📊' },
    { id: 'of_business_consult', sectorId: 'consulting', accountTypes: ['office'], nameAr: 'استشارات أعمال', nameFr: 'Conseil en affaires', icon: '💡' },
    { id: 'of_hr_recruitment', sectorId: 'consulting', accountTypes: ['office'], nameAr: 'موارد بشرية وتوظيف', nameFr: 'RH & recrutement', icon: '👥' },
    { id: 'of_marketing', sectorId: 'consulting', accountTypes: ['office'], nameAr: 'تسويق وإعلان', nameFr: 'Marketing & publicité', icon: '📣' },
    { id: 'of_management', sectorId: 'consulting', accountTypes: ['office'], nameAr: 'إدارة ومؤسسات', nameFr: 'Gestion & institutions', icon: '📈' },
    { id: 'of_clinic', sectorId: 'health', accountTypes: ['office'], nameAr: 'عيادة طبية', nameFr: 'Clinique médicale', icon: '🩺' },
    { id: 'of_dental', sectorId: 'health', accountTypes: ['office'], nameAr: 'عيادة أسنان', nameFr: 'Cabinet dentaire', icon: '🦷' },
    { id: 'of_pharmacy', sectorId: 'health', accountTypes: ['office'], nameAr: 'صيدلية', nameFr: 'Pharmacie', icon: '💊' },
    { id: 'of_lab', sectorId: 'health', accountTypes: ['office'], nameAr: 'مختبر تحاليل', nameFr: 'Laboratoire d\'analyses', icon: '🔬' },
    { id: 'of_training_center', sectorId: 'education', accountTypes: ['office'], nameAr: 'مركز تدريب', nameFr: 'Centre de formation', icon: '🎓' },
    { id: 'of_tutoring', sectorId: 'education', accountTypes: ['office'], nameAr: 'دروس خصوصية', nameFr: 'Cours particuliers', icon: '📖' },
    { id: 'of_language', sectorId: 'education', accountTypes: ['office'], nameAr: 'تعليم لغات', nameFr: 'Enseignement des langues', icon: '🗣️' },
    { id: 'of_travel_agency', sectorId: 'travel', accountTypes: ['office'], nameAr: 'وكالة سفريات', nameFr: 'Agence de voyages', icon: '🌍' },
    { id: 'of_tourism', sectorId: 'travel', accountTypes: ['office'], nameAr: 'سياحة وبرامج', nameFr: 'Tourisme & programmes', icon: '🏖️' },
    { id: 'of_hajj_umrah', sectorId: 'travel', accountTypes: ['office'], nameAr: 'حج وعمرة', nameFr: 'Hajj & Omra', icon: '🕋' },
    { id: 'of_it_support', sectorId: 'it', accountTypes: ['office'], nameAr: 'دعم تقني وشبكات', nameFr: 'Support IT & réseaux', icon: '🖥️' },
    { id: 'of_web_dev', sectorId: 'it', accountTypes: ['office'], nameAr: 'تطوير مواقع وتطبيقات', nameFr: 'Développement web & apps', icon: '💻' },
    { id: 'of_cybersecurity', sectorId: 'it', accountTypes: ['office'], nameAr: 'أمن معلومات', nameFr: 'Cybersécurité', icon: '🔒' },
    { id: 'of_reception', sectorId: 'general_office', accountTypes: ['office'], nameAr: 'مكتب استقبال عام', nameFr: 'Accueil général', icon: '🛎️' },
    { id: 'of_coworking', sectorId: 'general_office', accountTypes: ['office'], nameAr: 'مساحة عمل مشتركة', nameFr: 'Espace de coworking', icon: '🏢' },
    { id: 'of_other', sectorId: 'general_office', accountTypes: ['office'], nameAr: 'نشاط مهني آخر', nameFr: 'Autre activité professionnelle', icon: '🏷️' },

    // ── CORP / enterprise ──
    { id: 'cp_auto_showroom', sectorId: 'showroom', accountTypes: ['corp'], nameAr: 'معرض سيارات', nameFr: 'Showroom automobile', icon: '🚗' },
    { id: 'cp_electronics_showroom', sectorId: 'showroom', accountTypes: ['corp'], nameAr: 'معرض إلكترونيات', nameFr: 'Showroom électronique', icon: '📱' },
    { id: 'cp_furniture_showroom', sectorId: 'showroom', accountTypes: ['corp'], nameAr: 'معرض أثاث', nameFr: 'Showroom meubles', icon: '🛋️' },
    { id: 'cp_jewelry_showroom', sectorId: 'showroom', accountTypes: ['corp'], nameAr: 'معرض مجوهرات', nameFr: 'Showroom bijoux', icon: '💎' },
    { id: 'cp_building_materials', sectorId: 'showroom', accountTypes: ['corp'], nameAr: 'معرض مواد بناء', nameFr: 'Showroom matériaux', icon: '🏗️' },
    { id: 'cp_commercial_complex', sectorId: 'showroom', accountTypes: ['corp'], nameAr: 'مجمع تجاري', nameFr: 'Centre commercial', icon: '🏬' },
    { id: 'cp_industrial', sectorId: 'industrial', accountTypes: ['corp'], nameAr: 'شركة صناعية', nameFr: 'Entreprise industrielle', icon: '🏭' },
    { id: 'cp_manufacturing', sectorId: 'industrial', accountTypes: ['corp'], nameAr: 'تصنيع وإنتاج', nameFr: 'Fabrication & production', icon: '⚙️' },
    { id: 'cp_wholesale_corp', sectorId: 'industrial', accountTypes: ['corp'], nameAr: 'توزيع بالجملة', nameFr: 'Distribution en gros', icon: '📦' },
    { id: 'cp_hotel', sectorId: 'hospitality', accountTypes: ['corp'], nameAr: 'فندق أو ضيافة', nameFr: 'Hôtel ou hébergement', icon: '🏨' },
    { id: 'cp_restaurant_chain', sectorId: 'hospitality', accountTypes: ['corp'], nameAr: 'سلسلة مطاعم', nameFr: 'Chaîne de restaurants', icon: '🍽️' },
    { id: 'cp_event_venue', sectorId: 'hospitality', accountTypes: ['corp'], nameAr: 'قاعة مناسبات', nameFr: 'Salle d\'événements', icon: '🎪' },
    { id: 'cp_logistics', sectorId: 'logistics', accountTypes: ['corp'], nameAr: 'شركة لوجistics', nameFr: 'Entreprise logistique', icon: '🚚' },
    { id: 'cp_shipping', sectorId: 'logistics', accountTypes: ['corp'], nameAr: 'شحن ونقل', nameFr: 'Transport & fret', icon: '📦' },
    { id: 'cp_import_export', sectorId: 'import_export', accountTypes: ['corp'], nameAr: 'استيراد وتصدير', nameFr: 'Import & export', icon: '🌐' },
    { id: 'cp_trading', sectorId: 'import_export', accountTypes: ['corp'], nameAr: 'تجارة دولية', nameFr: 'Commerce international', icon: '🤝' },
    { id: 'cp_consulting_corp', sectorId: 'enterprise_services', accountTypes: ['corp'], nameAr: 'استشارات مؤسسية', nameFr: 'Conseil entreprise', icon: '💼' },
    { id: 'cp_facility_mgmt', sectorId: 'enterprise_services', accountTypes: ['corp'], nameAr: 'إدارة مرافق', nameFr: 'Gestion d\'installations', icon: '🏢' },
    { id: 'cp_security', sectorId: 'enterprise_services', accountTypes: ['corp'], nameAr: 'أمن وحراسة', nameFr: 'Sécurité & gardiennage', icon: '🛡️' },
    { id: 'cp_other', sectorId: 'enterprise_services', accountTypes: ['corp'], nameAr: 'نشاط مؤسسي آخر', nameFr: 'Autre activité entreprise', icon: '🏷️' },
  ];

  /** Optional per-package narrowing (empty = all activities for account type) */
  var PACKAGE_ACTIVITY_OVERRIDES = {
    'st-trial': null,
    'of-trial': null,
    'cp-trial': null,
  };

  function normType(t) {
    var x = String(t || '').toLowerCase();
    if (x === 'shop') return 'store';
    return x;
  }

  function resolveLang(lang) {
    return lang === 'fr' ? 'fr' : 'ar';
  }

  function label(activity, lang) {
    return resolveLang(lang) === 'fr' ? activity.nameFr : activity.nameAr;
  }

  function sectorLabel(sector, lang) {
    if (!sector) return '';
    return resolveLang(lang) === 'fr' ? sector.nameFr : sector.nameAr;
  }

  function getSectors(accountType, lang) {
    var t = normType(accountType);
    return (SECTORS[t] || []).map(function (s) {
      return { id: s.id, name: sectorLabel(s, lang) };
    });
  }

  function listForAccountType(accountType, lang) {
    var t = normType(accountType);
    return ACTIVITIES.filter(function (a) {
      return a.accountTypes.indexOf(t) !== -1;
    }).map(function (a) {
      return {
        id: a.id,
        key: a.id,
        name: label(a, lang),
        nameAr: a.nameAr,
        nameFr: a.nameFr,
        icon: a.icon || '',
        sectorId: a.sectorId,
        accountTypes: a.accountTypes.slice(),
      };
    });
  }

  function resolvePackageId(pkg) {
    if (!pkg) return null;
    if (typeof pkg === 'string') return pkg;
    return pkg.id || pkg.packageId || pkg.pkgId || null;
  }

  function listForPackage(accountType, packageRef, lang) {
    var t = normType(accountType);
    var pkgId = resolvePackageId(packageRef);
    var base = ACTIVITIES.filter(function (a) {
      if (a.accountTypes.indexOf(t) === -1) return false;
      if (Array.isArray(a.packageIds) && a.packageIds.length) {
        return pkgId && a.packageIds.indexOf(pkgId) !== -1;
      }
      return true;
    });
    if (pkgId && PACKAGE_ACTIVITY_OVERRIDES[pkgId] && Array.isArray(PACKAGE_ACTIVITY_OVERRIDES[pkgId])) {
      var allowed = PACKAGE_ACTIVITY_OVERRIDES[pkgId];
      base = base.filter(function (a) { return allowed.indexOf(a.id) !== -1; });
    }
    return base.map(function (a) {
      return {
        id: a.id,
        key: a.id,
        name: label(a, lang),
        nameAr: a.nameAr,
        nameFr: a.nameFr,
        icon: a.icon || '',
        sectorId: a.sectorId,
      };
    });
  }

  function findById(id) {
    return ACTIVITIES.find(function (a) { return a.id === id; }) || null;
  }

  function isAllowed(activityId, accountType, packageRef) {
    if (!activityId) return false;
    var list = listForPackage(accountType, packageRef);
    return list.some(function (a) { return a.id === activityId; });
  }

  function legacyCategoryFromActivity(activityId) {
    var a = findById(activityId);
    if (!a) return 'أخرى';
    var map = {
      automotive: 'سيارات',
      electronics: 'إلكترونيات',
      home: 'أثاث',
      construction: 'بناء',
      jewelry: 'ذهب',
      equipment: 'معدات',
      showroom: 'سيارات',
      industrial: 'معدات',
    };
    return map[a.sectorId] || 'أخرى';
  }

  var LEGACY_DIR_LABELS = {
    'سيارات': { ar: '🚗 سيارات', fr: '🚗 Voitures' },
    'إلكترونيات': { ar: '📱 إلكترونيات', fr: '📱 Électronique' },
    'أثاث': { ar: '🛋️ أثاث ومفروشات', fr: '🛋️ Meubles & ameublement' },
    'معدات': { ar: '⚙️ معدات ومكائن', fr: '⚙️ Équipements & machines' },
    'بناء': { ar: '🏗️ مواد بناء', fr: '🏗️ Matériaux de construction' },
    'ذهب': { ar: '💎 مجوهرات', fr: '💎 Bijoux' },
    'أخرى': { ar: '🏷️ أخرى', fr: '🏷️ Autre' },
  };

  function listDirectoryFilterCategories() {
    var seen = {};
    ACTIVITIES.forEach(function (a) {
      seen[legacyCategoryFromActivity(a.id)] = true;
    });
    var order = ['سيارات', 'إلكترونيات', 'أثاث', 'معدات', 'بناء', 'ذهب', 'أخرى'];
    var out = order.filter(function (c) { return seen[c]; });
    Object.keys(seen).forEach(function (c) {
      if (out.indexOf(c) === -1) out.push(c);
    });
    return out;
  }

  function legacyCategoryLabel(cat, lang) {
    var l = LEGACY_DIR_LABELS[cat];
    if (!l) {
      return (resolveLang(lang) === 'fr' ? '🏷️ ' : '🏷️ ') + String(cat || (resolveLang(lang) === 'fr' ? 'Autre' : 'أخرى'));
    }
    return resolveLang(lang) === 'fr' ? l.fr : l.ar;
  }

  function displayName(activityId, lang) {
    var a = findById(activityId);
    return a ? label(a, lang) : String(activityId || '');
  }

  function groupActivities(activities, accountType, lang) {
    var t = normType(accountType);
    var sectors = SECTORS[t] || [];
    var bySector = {};
    activities.forEach(function (a) {
      if (!bySector[a.sectorId]) bySector[a.sectorId] = [];
      bySector[a.sectorId].push(a);
    });
    return sectors.filter(function (s) { return bySector[s.id] && bySector[s.id].length; }).map(function (s) {
      return {
        id: s.id,
        name: sectorLabel(s, lang),
        activities: bySector[s.id],
      };
    });
  }

  function renderSelect(selectEl, opts) {
    if (!selectEl) return;
    opts = opts || {};
    var accountType = normType(opts.accountType);
    var activities = listForPackage(accountType, opts.packageId || opts.package, opts.lang);
    if (!activities.length) {
      activities = listForAccountType(accountType, opts.lang);
    }
    var groups = groupActivities(activities, accountType, opts.lang);
    var isFr = resolveLang(opts.lang) === 'fr';
    var prev = opts.selected || selectEl.value || '';
    var html = '<option value="">' + (isFr ? '— Choisissez votre activité —' : '— اختر نشاطك التجاري —') + '</option>';
    groups.forEach(function (g) {
      html += '<optgroup label="' + escapeHtml(g.name) + '">';
      g.activities.forEach(function (a) {
        var text = (a.icon ? a.icon + ' ' : '') + a.name;
        html += '<option value="' + escapeHtml(a.id) + '"' + (a.id === prev ? ' selected' : '') + '>' + escapeHtml(text) + '</option>';
      });
      html += '</optgroup>';
    });
    selectEl.innerHTML = html;
    if (prev && activities.some(function (a) { return a.id === prev; })) {
      selectEl.value = prev;
    }
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function loadExtraFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return [];
      var raw = localStorage.getItem('rizq_merchant_activities_extra');
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function mergeExtraActivities() {
    loadExtraFromStorage().forEach(function (ex) {
      if (!ex || !ex.id || !ex.accountTypes) return;
      if (ACTIVITIES.some(function (a) { return a.id === ex.id; })) return;
      ACTIVITIES.push({
        id: String(ex.id),
        sectorId: ex.sectorId || 'services_retail',
        accountTypes: ex.accountTypes,
        packageIds: ex.packageIds || null,
        nameAr: ex.nameAr || ex.name || ex.id,
        nameFr: ex.nameFr || ex.nameAr || ex.name || ex.id,
        icon: ex.icon || '🆕',
      });
    });
  }

  mergeExtraActivities();

  return {
    SECTORS: SECTORS,
    ACTIVITIES: ACTIVITIES,
    listForAccountType: listForAccountType,
    listForPackage: listForPackage,
    findById: findById,
    isAllowed: isAllowed,
    legacyCategoryFromActivity: legacyCategoryFromActivity,
    legacyCategoryLabel: legacyCategoryLabel,
    listDirectoryFilterCategories: listDirectoryFilterCategories,
    LEGACY_DIR_LABELS: LEGACY_DIR_LABELS,
    displayName: displayName,
    renderSelect: renderSelect,
    groupActivities: groupActivities,
    getSectors: getSectors,
  };
});
