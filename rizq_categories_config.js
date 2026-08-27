/**
 * rizq_categories_config.js — مصدر واحد لأقسام المنصة (ترتيب + أيقونات + فروع)
 * يطابق شبكة الأقسام في index.html / rizq_landing_v8.html
 */
(function (global) {
  'use strict';

  var SUB_FR = {
    'شقق للبيع': 'Appartements à vendre', 'منازل وفيلات': 'Maisons & villas', 'أراضي': 'Terrains',
    'محلات تجارية': 'Locaux commerciaux', 'مكاتب ومستودعات': 'Bureaux & entrepôts',
    'غرف للكراء': 'Chambres à louer', 'شقق للكراء': 'Appartements à louer', 'منازل للكراء': 'Maisons à louer',
    'محلات للكراء': 'Locaux à louer', 'إيجار يومي / سياحي': 'Location journalière / touristique',
    'سيارات للبيع': 'Voitures à vendre', 'سيارات للكراء': 'Voitures à louer', 'دراجات نارية': 'Motos & scooters',
    'قطع غيار': 'Pièces détachées', 'إطارات وبطاريات': 'Pneus & batteries', 'زيوت ومستلزمات': 'Huiles & accessoires',
    'تجهيز وتزيين': 'Équipement & tuning',
    'تأمين سيارات خاصة': 'Assurance voitures particulières', 'تأمين شاحنات ونقل': 'Assurance camions & transport',
    'تأمين آلات ومعدات ثقيلة': 'Assurance engins & équipements lourds', 'تأمين دراجات نارية': 'Assurance motos',
    'تجديد رخص وتأمين': 'Renouvellement permis & assurance', 'تقييم أضرار وحوادث': 'Expertise dommages & accidents',
    'استشارات ووساطة تأمين': 'Conseil & courtage en assurance',
    'شاحنات للبيع': 'Camions à vendre', 'شاحنات للكراء': 'Camions à louer', 'حافلات وباصات': 'Bus & autocars',
    'مقطورات وصهاريج': 'Remorques & citernes', 'معدات بناء للبيع': 'Engins de chantier à vendre',
    'معدات بناء للكراء': 'Engins de chantier à louer', 'معدات زراعية': 'Matériel agricole', 'قطع غيار ثقيلة': 'Pièces poids lourds',
    'هواتف ذكية': 'Smartphones', 'لابتوب وحاسوب': 'Laptops & ordinateurs', 'شاشات وتلفزيون': 'Écrans & télévisions',
    'أجهزة منزلية': 'Électroménager', 'كاميرات ودرونز': 'Caméras & drones', 'سماعات وصوتيات': 'Casques & audio',
    'شواحن وإكسسوارات': 'Chargeurs & accessoires',
    'دراعة رجالية': 'Daraa homme', 'ملحفة نسائية': 'Melhfa femme', 'طرح وأغطية رأس': 'Voiles & couvre-chefs',
    'ملابس رجالية': 'Vêtements homme', 'ملابس نسائية وأطفال': 'Vêtements femme & enfant',
    'أحذية وحقائب': 'Chaussures & sacs', 'مجوهرات وذهب': 'Bijoux & or', 'عطور ومستحضرات': 'Parfums & cosmétiques',
    'ذهب عيار 24 — خالص': 'Or 24 carats — pur', 'ذهب عيار 22': 'Or 22 carats', 'ذهب عيار 21': 'Or 21 carats',
    'ذهب عيار 18': 'Or 18 carats', 'ذهب خردة وقطع': 'Or de récupération & pièces', 'سبائك ذهبية': 'Lingots d\'or',
    'أساور وخلاخيل': 'Bracelets & chevillières', 'خواتم وحلقات': 'Bagues & anneaux', 'عقود وقلادات': 'Colliers & pendentifs',
    'أقراط وحلق': 'Boucles d\'oreilles', 'طقم مجوهرات كامل': 'Parure complète', 'خاتم موريتاني تقليدي': 'Bague mauritanienne traditionnelle',
    'لبس العروس': 'Parure de mariée', 'حلي فضية': 'Bijoux en argent', 'مجوهرات يدوية': 'Bijoux artisanaux',
    'ذهب للمهر والزواج': 'Or pour dot & mariage', 'شراء بالوزن (غرام / مثقال)': 'Achat au poids (gramme / mithqal)',
    'تقييم وتثمين الذهب': 'Évaluation & expertise de l\'or', 'إعادة صياغة وتصنيع': 'Refonte & fabrication',
    'صائغ — خدمة تصميم': 'Bijoutier — service sur mesure', 'مجوهرات فضية': 'Bijoux en argent',
    'أحجار كريمة': 'Pierres précieuses', 'ألماس وزمرد': 'Diamants & émeraudes',
    'أدوية ومكملات': 'Médicaments & compléments', 'أجهزة طبية': 'Matériel médical',
    'مستحضرات طبيعية': 'Produits naturels', 'عطور ومنتجات عناية': 'Parfums & soins', 'أجهزة عناية شخصية': 'Appareils de soin',
    'إدارة وتسويق': 'Administration & marketing', 'هندسة وتقنية': 'Ingénierie & technique', 'صحة وطب': 'Santé & médecine',
    'تعليم وتدريب': 'Enseignement & formation', 'نقل وسياقة': 'Transport & conduite', 'أبحث عن عمل': 'Je cherche du travail',
    'فريلانس وعمل حر': 'Freelance', 'تدريب وتربص': 'Stage & formation',
    'نقل وشحن': 'Transport & livraison', 'تنظيف ومكافحة حشرات': 'Nettoyage & désinsectisation',
    'بناء ودهان وسباكة': 'Bâtiment & plomberie', 'صيانة وإصلاح': 'Maintenance & réparation',
    'دروس خصوصية': 'Cours particuliers', 'تصميم وبرمجة': 'Design & programmation', 'تصوير وإعلام': 'Photo & médias',
    'حلاقة وتجميل': 'Coiffure & beauté',
    'أثاث غرف نوم': 'Meubles chambre', 'أثاث صالون': 'Meubles salon', 'أثاث مطبخ': 'Meubles cuisine',
    'أثاث حمام': 'Meubles salle de bain', 'أثاث مكتبي وأطفال': 'Meubles bureau & enfants',
    'ستائر وسجاد': 'Rideaux & tapis', 'إضاءة وديكور': 'Éclairage & décoration', 'أجهزة مطبخ': 'Appareils de cuisine',
    'أسمنت وحديد': 'Ciment & fer', 'طوب وسيراميك': 'Briques & céramique', 'أخشاب وأبواب': 'Bois & portes',
    'سباكة وكهرباء': 'Plomberie & électricité', 'دهانات وعزل مائي': 'Peintures & étanchéité',
    'ألواح شمسية': 'Panneaux solaires', 'أدوات بناء': 'Outils de construction',
    'معدات تجارية': 'Équipements commerciaux', 'بضائع بالجملة': 'Marchandises en gros',
    'استيراد وتصدير': 'Import & export', 'معدات صناعية': 'Équipements industriels',
    'شراكات تجارية': 'Partenariats', 'فرص استثمارية': 'Opportunités d\'investissement',
    'معدات رياضية': 'Équipements sportifs', 'دراجات هوائية': 'Vélos', 'صيد وغوص': 'Pêche & plongée',
    'ألعاب فيديو': 'Jeux vidéo', 'موسيقى وآلات': 'Musique & instruments', 'هوايات وتحف': 'Loisirs & antiquités',
    'كتب مدرسية وجامعية': 'Livres scolaires & universitaires', 'كتب دينية وعامة': 'Livres religieux & généraux',
    'أدوات مدرسية': 'Fournitures scolaires', 'دورات تدريبية': 'Formations', 'قرطاسية ومكتبية': 'Papeterie',
    'تمر وحبوب وأرز': 'Dattes, céréales & riz', 'لحوم وأسماك': 'Viandes & poissons', 'خضروات وفواكه': 'Légumes & fruits',
    'ألبان ومنتجات': 'Produits laitiers', 'حلويات ومخبوزات': 'Pâtisseries & boulangerie',
    'مشروبات وعصائر': 'Boissons & jus', 'مطاعم وكافيهات': 'Restaurants & cafés',
    'لوحات وخط عربي': 'Tableaux & calligraphie', 'تصوير فوتوغرافي': 'Photographie',
    'صناعة تقليدية': 'Artisanat traditionnel', 'نسيج وخياطة يدوية': 'Tissage & couture',
    'إبل': 'Chameaux', 'بقر': 'Bovins', 'غنم وماعز': 'Ovins & caprins',
    'لبن طازج (ناقة وبقرة)': 'Lait frais (chamelle & vache)', 'بيض طازج': 'Œufs frais',
    'أعلاف ومستلزمات': 'Aliments & accessoires', 'دواجن وطيور': 'Volailles & oiseaux', 'بيض دواجن': 'Œufs de volaille',
    'عيادات بيطرية': 'Cliniques vétérinaires', 'أدوية وعلاجات حيوانات': 'Médicaments & traitements vétérinaires',
    'تطعيمات وفحوصات': 'Vaccinations & examens', 'مستلزمات ومعدات بيطرية': 'Fournitures & équipements vétérinaires'
  };

  /** ترتيب وأيقونات index.html — 18 قسماً */
  var BUILTIN = [
    { key: 'عقارات', nameAr: 'منازل وعقارات', nameFr: 'Immobilier', icon: '🏠', gold: false,
      subcats: ['شقق للبيع', 'منازل وفيلات', 'أراضي', 'محلات تجارية', 'مكاتب ومستودعات', 'غرف للكراء', 'شقق للكراء', 'منازل للكراء', 'محلات للكراء', 'إيجار يومي / سياحي'] },
    { key: 'سيارات', nameAr: 'سيارات وقطع غيار', nameFr: 'Voitures & pièces', icon: '🚗', gold: false,
      subcats: ['سيارات للبيع', 'سيارات للكراء', 'دراجات نارية', 'قطع غيار', 'إطارات وبطاريات', 'زيوت ومستلزمات', 'تجهيز وتزيين'] },
    { key: 'تأمين', nameAr: 'وكالات تأمين المركبات', nameFr: "Agences d'assurance véhicules", icon: '🛡️', gold: false,
      subcats: ['تأمين سيارات خاصة', 'تأمين شاحنات ونقل', 'تأمين آلات ومعدات ثقيلة', 'تأمين دراجات نارية', 'تجديد رخص وتأمين', 'تقييم أضرار وحوادث', 'استشارات ووساطة تأمين'] },
    { key: 'شاحنات', nameAr: 'شاحنات ومعدات ثقيلة', nameFr: 'Camions & engins', icon: '🚛', gold: false,
      subcats: ['شاحنات للبيع', 'شاحنات للكراء', 'حافلات وباصات', 'مقطورات وصهاريج', 'معدات بناء للبيع', 'معدات بناء للكراء', 'معدات زراعية', 'قطع غيار ثقيلة'] },
    { key: 'إلكترونيات', nameAr: 'هواتف وإلكترونيات', nameFr: 'Téléphones & électronique', icon: '📱', gold: false,
      subcats: ['هواتف ذكية', 'لابتوب وحاسوب', 'شاشات وتلفزيون', 'أجهزة منزلية', 'كاميرات ودرونز', 'سماعات وصوتيات', 'شواحن وإكسسوارات'] },
    { key: 'أزياء', nameAr: 'موضة وأزياء', nameFr: 'Mode & vêtements', icon: '👗', gold: false,
      subcats: ['دراعة رجالية', 'ملحفة نسائية', 'طرح وأغطية رأس', 'ملابس رجالية', 'ملابس نسائية وأطفال', 'أحذية وحقائب', 'مجوهرات وذهب', 'عطور ومستحضرات'] },
    { key: 'ذهب', nameAr: 'ذهب ومجوهرات', nameFr: 'Or & bijoux', icon: '💰', gold: true,
      subcats: ['ذهب عيار 24 — خالص', 'ذهب عيار 22', 'ذهب عيار 21', 'ذهب عيار 18', 'أساور وخلاخيل', 'خواتم وحلقات', 'عقود وقلادات', 'لبس العروس', 'ذهب للمهر والزواج', 'تقييم وتثمين الذهب'] },
    { key: 'صحة', nameAr: 'صحة وجمال', nameFr: 'Santé & beauté', icon: '🌿', gold: false,
      subcats: ['أدوية ومكملات', 'أجهزة طبية', 'مستحضرات طبيعية', 'عطور ومنتجات عناية', 'أجهزة عناية شخصية'] },
    { key: 'وظائف', nameAr: 'وظائف وفرص عمل', nameFr: 'Emplois', icon: '💼', gold: false,
      subcats: ['إدارة وتسويق', 'هندسة وتقنية', 'صحة وطب', 'تعليم وتدريب', 'نقل وسياقة', 'أبحث عن عمل', 'فريلانس وعمل حر', 'تدريب وتربص'] },
    { key: 'خدمات', nameAr: 'خدمات ومهن', nameFr: 'Services & métiers', icon: '🔧', gold: false,
      subcats: ['نقل وشحن', 'تنظيف ومكافحة حشرات', 'بناء ودهان وسباكة', 'صيانة وإصلاح', 'دروس خصوصية', 'تصميم وبرمجة', 'تصوير وإعلام', 'حلاقة وتجميل'] },
    { key: 'أثاث', nameAr: 'أثاث وديكور', nameFr: 'Meubles & décor', icon: '🛋️', gold: false,
      subcats: ['أثاث غرف نوم', 'أثاث صالون', 'أثاث مطبخ', 'أثاث حمام', 'أثاث مكتبي وأطفال', 'ستائر وسجاد', 'إضاءة وديكور', 'أجهزة مطبخ'] },
    { key: 'بناء', nameAr: 'بناء ومقاولات', nameFr: 'Construction', icon: '🧱', gold: false,
      subcats: ['أسمنت وحديد', 'طوب وسيراميك', 'أخشاب وأبواب', 'سباكة وكهرباء', 'دهانات وعزل مائي', 'ألواح شمسية', 'أدوات بناء'] },
    { key: 'تجارة', nameAr: 'تجارة وصناعة', nameFr: 'Commerce & industrie', icon: '🏭', gold: false,
      subcats: ['معدات تجارية', 'بضائع بالجملة', 'استيراد وتصدير', 'معدات صناعية', 'شراكات تجارية', 'فرص استثمارية'] },
    { key: 'رياضة', nameAr: 'رياضة وهوايات', nameFr: 'Sports & loisirs', icon: '⚽', gold: false,
      subcats: ['معدات رياضية', 'دراجات هوائية', 'صيد وغوص', 'ألعاب فيديو', 'موسيقى وآلات', 'هوايات وتحف'] },
    { key: 'تعليم', nameAr: 'تعليم وثقافة', nameFr: 'Éducation & culture', icon: '📚', gold: false,
      subcats: ['كتب مدرسية وجامعية', 'كتب دينية وعامة', 'أدوات مدرسية', 'دورات تدريبية', 'قرطاسية ومكتبية'] },
    { key: 'أغذية', nameAr: 'أغذية ومطاعم', nameFr: 'Alimentation', icon: '🍽️', gold: false,
      subcats: ['تمر وحبوب وأرز', 'لحوم وأسماك', 'خضروات وفواكه', 'ألبان ومنتجات', 'حلويات ومخبوزات', 'مشروبات وعصائر', 'مطاعم وكافيهات'] },
    { key: 'فنون', nameAr: 'فنون وحرف يدوية', nameFr: 'Arts & artisanat', icon: '🎨', gold: false,
      subcats: ['لوحات وخط عربي', 'تصوير فوتوغرافي', 'صناعة تقليدية', 'مجوهرات يدوية', 'نسيج وخياطة يدوية'] },
    { key: 'ماشية', nameAr: 'ماشية ودواجن وبيطرة', nameFr: 'Bétail, volaille & vétérinaire', icon: '🐄', gold: false,
      subcats: ['إبل', 'بقر', 'غنم وماعز', 'لبن طازج (ناقة وبقرة)', 'بيض طازج', 'أعلاف ومستلزمات', 'دواجن وطيور', 'بيض دواجن', 'عيادات بيطرية', 'أدوية وعلاجات حيوانات', 'تطعيمات وفحوصات', 'مستلزمات ومعدات بيطرية'] }
  ];

  var ALIAS = {
    'ماشية ودواجن': 'ماشية'
  };
  BUILTIN.forEach(function (c) {
    ALIAS[c.nameAr] = c.key;
    ALIAS[c.nameFr] = c.key;
    ALIAS[c.key] = c.key;
  });

  function translateSubcats(subcats, lang) {
    if (lang !== 'fr') return subcats.slice();
    return subcats.map(function (s) { return SUB_FR[s] || s; });
  }

  function loadExtra() {
    try {
      var raw = localStorage.getItem('rizq_extra_categories');
      if (raw) {
        var p = JSON.parse(raw);
        if (Array.isArray(p)) return p;
      }
    } catch (e) { /* ignore */ }
    return [];
  }

  function getByKey(key) {
    if (!key) return null;
    var norm = normalize(key);
    var b = null;
    for (var i = 0; i < BUILTIN.length; i++) {
      if (BUILTIN[i].key === norm) { b = BUILTIN[i]; break; }
    }
    if (b) return b;
    var extra = loadExtra();
    for (var j = 0; j < extra.length; j++) {
      if (extra[j] && extra[j].name === key) {
        return {
          key: extra[j].name,
          nameAr: extra[j].name,
          nameFr: extra[j].name_fr || extra[j].name,
          icon: extra[j].icon || '🆕',
          gold: false,
          subcats: extra[j].subs || [],
          extra: true
        };
      }
    }
    return null;
  }

  function normalize(raw) {
    if (!raw) return '';
    return ALIAS[raw] || raw;
  }

  /** قائمة العرض (مدمج + إضافي من الأدمن) */
  function list(lang) {
    var fr = lang === 'fr';
    var pickAdmin = (typeof global.RizqLocale !== 'undefined')
      ? function (item, arKey, frKey) { return global.RizqLocale.adminLabelPick(item, lang, arKey, frKey); }
      : null;
    var out = BUILTIN.map(function (c) {
      var labelPick = pickAdmin
        ? pickAdmin({ name: c.nameAr, name_fr: c.nameFr }, 'name', 'name_fr')
        : { text: fr ? c.nameFr : c.nameAr, isFallback: false, sourceLang: fr ? 'fr' : 'ar' };
      return {
        key: c.key,
        name: labelPick.text,
        nameAr: c.nameAr,
        nameFr: c.nameFr,
        icon: c.icon,
        gold: !!c.gold,
        subcats: c.subcats,
        subcatsDisplay: translateSubcats(c.subcats, fr ? 'fr' : 'ar'),
        langFallback: !!labelPick.isFallback
      };
    });
    loadExtra().forEach(function (ex) {
      if (!ex || !ex.name) return;
      var labelPick = pickAdmin
        ? pickAdmin(ex, 'name', 'name_fr')
        : { text: fr ? (ex.name_fr || ex.name) : ex.name, isFallback: fr && !ex.name_fr, sourceLang: fr && !ex.name_fr ? 'ar' : (fr ? 'fr' : 'ar') };
      var subsPick = (typeof global.RizqLocale !== 'undefined')
        ? global.RizqLocale.adminListPick(ex, lang, 'subs', 'subs_fr')
        : { items: fr && ex.subs_fr && ex.subs_fr.length ? ex.subs_fr.slice() : (ex.subs || []).slice(), isFallback: fr && !(ex.subs_fr && ex.subs_fr.length), sourceLang: null };
      var subs = ex.subs || [];
      out.push({
        key: ex.name,
        name: labelPick.text,
        nameAr: ex.name,
        nameFr: ex.name_fr || ex.name,
        icon: ex.icon || '🆕',
        gold: false,
        subcats: subs,
        subcatsDisplay: subsPick.items.length ? subsPick.items : (fr ? translateSubcats(subs, 'fr') : subs.slice()),
        extra: true,
        langFallback: !!labelPick.isFallback || !!subsPick.isFallback
      });
    });
    return out;
  }

  function subcatsFor(key, lang) {
    var c = getByKey(key);
    if (!c) return { keys: [], labels: [] };
    var keys = c.subcats || [];
    if (c.extra && lang === 'fr') {
      try {
        var ex = loadExtra().find(function (e) { return e && e.name === key; });
        if (ex && ex.subs_fr && ex.subs_fr.length) {
          return { keys: keys, labels: ex.subs_fr.slice() };
        }
      } catch (e) { /* ignore */ }
    }
    return { keys: keys, labels: translateSubcats(keys, lang) };
  }

  global.RizqCategories = {
    BUILTIN: BUILTIN,
    ALIAS: ALIAS,
    normalize: normalize,
    list: list,
    getByKey: getByKey,
    subcatsFor: subcatsFor,
    translateSubcats: translateSubcats
  };
})(typeof window !== 'undefined' ? window : global);
