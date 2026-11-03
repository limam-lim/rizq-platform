/**
 * rizq_categories_config.js — مصدر واحد لأقسام المنصة (ترتيب + أيقونات + فروع + مجموعات)
 * يُستخدم في: نشر الإعلان، الصفحة الرئيسية، التصفح، والأدمن.
 */
(function (global) {
  'use strict';

  var GROUP_FR = {
    'للبيع': 'À vendre', 'للكراء': 'À louer', 'تجهيز وسكن': 'Ameublement & prêt à habiter',
    'أجهزة كبرى': 'Gros électroménager', 'مطبخ وتحضير': 'Cuisine & préparation', 'تنظيف ومياه': 'Nettoyage & eau', 'صيانة أجهزة': 'Maintenance & pièces',
    'أثاث': 'Meubles', 'ديكور ومفروشات': 'Décoration & textiles',
    'مواد بناء': 'Matériaux de construction', 'تجهيزات': 'Équipements',
    'ألواح ومكونات': 'Panneaux & composants', 'مستلزمات وتوصيل': 'Accessoires & câblage',
    'أنظمة جاهزة': 'Kits complets', 'خدمات وتركيب': 'Installation & services',
    'طاقة شمسية': 'Énergie solaire', 'مولدات وطاقة احتياطية': 'Groupes & secours',
    'مستلزمات كهربائية': 'Accessoires électriques',
    'سيارات': 'Voitures', 'ملحقات': 'Accessoires',
    'أنواع التأمين': "Types d'assurance", 'خدمات الوكالات': 'Services des agences',
    'مركبات': 'Véhicules', 'معدات ثقيلة': 'Engins lourds',
    'أجهزة': 'Appareils', 'ملحقات تقنية': 'Accessoires tech',
    'ملابس تقليدية 🇲🇷': 'Vêtements traditionnels 🇲🇷', 'ملابس وإكسسوارات': 'Vêtements & accessoires',
    '🥇 ذهب للبيع': '🥇 Or à vendre', '💎 مجوهرات نسائية': '💎 Bijoux femme',
    '👑 مجوهرات تقليدية 🇲🇷': '👑 Bijoux traditionnels 🇲🇷', '📊 ذهب استثمار وخدمات': '📊 Or investissement & services',
    '💍 فضة وأحجار': '💍 Argent & pierres',
    'صحة': 'Santé', 'جمال': 'Beauté',
    'حجوزات وعروض': 'Réservations & offres', 'مستلزمات السفر': 'Équipement de voyage', 'نقل ووثائق': 'Transport & documents',
    'وظائف متاحة': 'Emplois disponibles', 'أخرى': 'Autres',
    'خدمات منزلية': 'Services à domicile', 'خدمات متخصصة': 'Services spécialisés',
    'تجارة': 'Commerce', 'استثمار': 'Investissement',
    'رياضة': 'Sport', 'ترفيه': 'Loisirs',
    'كتب': 'Livres', 'تعليم': 'Éducation',
    'مواد غذائية': 'Produits alimentaires', 'مطاعم': 'Restaurants',
    'فنون': 'Arts', 'حرف موريتانية': 'Artisanat mauritanien',
    'ماشية': 'Bétail', 'منتجات حيوانية': 'Produits animaux', 'دواجن': 'Volailles', 'بيطرة': 'Vétérinaire',
    'مخابز ومعامل غذائية': 'Boulangeries & agroalimentaire', 'تبريد وثلج': 'Froid & glace',
    'تعبئة وتغليف': 'Emballage & conditionnement', 'غسيل وتنظيف صناعي': 'Blanchisserie & nettoyage pro',
    'مكائن استعمال يومي': 'Machines usage quotidien', 'صيانة وقطع غيار': 'Maintenance & pièces'
  };

  var SUB_FR = {
    'شقق للبيع': 'Appartements à vendre', 'منازل وفيلات': 'Maisons & villas', 'أراضي': 'Terrains',
    'محلات تجارية': 'Locaux commerciaux', 'مكاتب ومستودعات': 'Bureaux & entrepôts', 'عمارات وسكنات': 'Immeubles & résidences',
    'غرف للكراء': 'Chambres à louer', 'شقق للكراء': 'Appartements à louer', 'منازل للكراء': 'Maisons à louer',
    'محلات للكراء': 'Locaux à louer', 'إيجار يومي / سياحي': 'Location journalière / touristique',
    'مفروش بالكامل': 'Entièrement meublé', 'نصف مفروش': 'Semi-meublé', 'عقار مع أثاث': 'Bien avec mobilier', 'سكن جاهز للاستعمال': 'Logement prêt à habiter',
    'ثلاجات ومجمدات': 'Réfrigérateurs & congélateurs', 'غسالات ومجففات': 'Lave-linge & sèche-linge',
    'مكيفات وتبريد': 'Climatisation & refroidissement', 'أفران وطباخات': 'Fours & cuisinières',
    'محضرات طعام': 'Robots & préparation', 'أجهزة مطبخ صغيرة': 'Petit électroménager cuisine',
    'مكانس وغسيل': 'Aspirateurs & lavage', 'مياه وترشيح': 'Eau & filtration',
    'قطع غيار أجهزة': 'Pièces détachées', 'تركيب وصيانة أجهزة': 'Installation & maintenance',
    'أثاث غرف نوم': 'Meubles chambre', 'أثاث صالون': 'Meubles salon', 'أثاث مطبخ': 'Meubles cuisine',
    'أثاث حمام': 'Meubles salle de bain', 'أثاث مكتبي وأطفال': 'Meubles bureau & enfants',
    'ستائر وسجاد': 'Rideaux & tapis', 'إضاءة وديكور': 'Éclairage & décoration', 'مراتب ومفروشات': 'Matelas & literie', 'ديكور خارجي وحدائق': 'Décoration extérieure & jardin',
    'أسمنت وحديد': 'Ciment & fer', 'طوب وسيراميك': 'Briques & céramique', 'أخشاب وأبواب': 'Bois & portes',
    'سباكة وكهرباء': 'Plomberie & électricité', 'دهانات وعزل مائي': 'Peintures & étanchéité', 'أدوات بناء': 'Outils de construction',
    'ألواح شمسية': 'Panneaux solaires', 'انفرترات ومحولات': 'Onduleurs & convertisseurs',
    'بطاريات تخزين': 'Batteries de stockage', 'منظمات شحن شمسية': 'Régulateurs de charge solaires',
    'مولدات كهربائية': 'Groupes électrogènes', 'مولدات وطاقة منزلية': 'Groupes & énergie maison',
    'بطاريات UPS واحتياط': 'Batteries UPS & secours', 'محولات جهد وطاقة': 'Convertisseurs de tension',
    'كابلات وموصلات طاقة': 'Câbles & connecteurs énergie', 'هياكل تثبيت وقواعد': 'Structures & supports de fixation',
    'فيش وقواطع كهربائية': 'Prises & disjoncteurs', 'محولات طاقة للسيارات': 'Convertisseurs auto 12V/220V',
    'أنظمة منزلية متكاملة': 'Kits solaires domestiques complets', 'مضخات مياه شمسية': 'Pompes à eau solaires',
    'إنارة شمسية': 'Éclairage solaire', 'طقم طاقة متنقل': 'Kit énergie portable',
    'تركيب وصيانة طاقة': 'Installation & maintenance énergie', 'استشارة ودراسة طاقة': 'Étude & conseil en énergie',
    'سيارات للبيع': 'Voitures à vendre', 'سيارات للكراء': 'Voitures à louer', 'سيارات كهربائية وهجينة': 'Voitures électriques et hybrides',
    'دراجات نارية': 'Motos & scooters', 'قطع غيار': 'Pièces détachées', 'إطارات وبطاريات': 'Pneus & batteries',
    'زيوت ومستلزمات': 'Huiles & accessoires', 'تجهيز وتزيين': 'Équipement & tuning',
    'تأمين سيارات خاصة': 'Assurance voitures particulières', 'تأمين شاحنات ونقل': 'Assurance camions & transport',
    'تأمين آلات ومعدات ثقيلة': 'Assurance engins & équipements lourds', 'تأمين دراجات نارية': 'Assurance motos',
    'تجديد رخص وتأمين': 'Renouvellement permis & assurance', 'تقييم أضرار وحوادث': 'Expertise dommages & accidents',
    'استشارات ووساطة تأمين': 'Conseil & courtage en assurance',
    'شاحنات للبيع': 'Camions à vendre', 'شاحنات للكراء': 'Camions à louer', 'حافلات وباصات': 'Bus & autocars',
    'مقطورات وصهاريج': 'Remorques & citernes', 'معدات بناء للبيع': 'Engins de chantier à vendre',
    'معدات بناء للكراء': 'Engins de chantier à louer', 'معدات زراعية': 'Matériel agricole', 'قطع غيار ثقيلة': 'Pièces poids lourds',
    'هواتف ذكية': 'Smartphones', 'لابتوب وحاسوب': 'Laptops & ordinateurs', 'شاشات وتلفزيون': 'Écrans & télévisions',
    'تابلت وأجهزة لوحية': 'Tablettes', 'ساعات ذكية': 'Montres connectées', 'شبكات وراوتر': 'Réseaux & routeurs',
    'كاميرات ودرونز': 'Caméras & drones', 'سماعات وصوتيات': 'Casques & audio', 'شواحن وإكسسوارات': 'Chargeurs & accessoires',
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
    'عروض سياحية': 'Offres touristiques', 'حجز فنادق': 'Réservation hôtels', 'رحلات منظمة': 'Voyages organisés',
    'حقائب سفر': 'Bagages & valises', 'معدات تخييم': 'Équipement camping', 'مستلزمات رحلات': 'Accessoires de voyage',
    'أدوات مطبخ للرحلات': 'Ustensiles cuisine voyage', 'مفروشات وتجهيزات تخييم': 'Literie & équipement camping',
    'تذاكر طيران': 'Billets d\'avion', 'تأشيرات ووثائق سفر': 'Visas & documents', 'تأمين سفر': 'Assurance voyage',
    'إدارة وتسويق': 'Administration & marketing', 'هندسة وتقنية': 'Ingénierie & technique', 'صحة وطب': 'Santé & médecine',
    'تعليم وتدريب': 'Enseignement & formation', 'نقل وسياقة': 'Transport & conduite', 'أبحث عن عمل': 'Je cherche du travail',
    'فريلانس وعمل حر': 'Freelance', 'تدريب وتربص': 'Stage & formation',
    'نقل وشحن': 'Transport & livraison', 'تنظيف ومكافحة حشرات': 'Nettoyage & désinsectisation',
    'بناء ودهان وسباكة': 'Bâtiment & plomberie', 'صيانة وإصلاح': 'Maintenance & réparation',
    'دروس خصوصية': 'Cours particuliers', 'تصميم وبرمجة': 'Design & programmation', 'تصوير وإعلام': 'Photo & médias',
    'حلاقة وتجميل': 'Coiffure & beauté',
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
    'تطعيمات وفحوصات': 'Vaccinations & examens', 'مستلزمات ومعدات بيطرية': 'Fournitures & équipements vétérinaires',
    'قبوعات ومخازن': 'Caves & entrepôts', 'عقارات قيد الإنشاء': 'Projets immobiliers neufs', 'استثمار عقاري': 'Investissement immobilier',
    'سخانات مياه': 'Chauffe-eau', 'مكواة وبخار': 'Fers & vapeur', 'مجففات شعر وأجهزة عناية': 'Sèche-cheveux & soins',
    'خزائن ودواليب': 'Armoires & placards', 'مرايا وإكسسوارات أثاث': 'Miroirs & accessoires meubles',
    'عزل حراري وصوتي': 'Isolation thermique & phonique', 'أدوات يدوية وكهربائية': 'Outils manuels & électriques',
    'أفران مخابز صناعية': 'Fours de boulangerie industriels', 'عجانات وخلاطات صناعية': 'Pétrins & batteurs industriels',
    'مكائن تشكيل خبز ومعجنات': 'Machines à pain & pâtisserie', 'معدات حلويات وتجهيزات مخبز': 'Équipements pâtisserie & boulangerie',
    'مكائن صنع ثلج': 'Machines à glace', 'ثلاجات عرض صناعية': 'Vitrines réfrigérées pro', 'غرف تبريد وتجميد': 'Chambres froides & congélation',
    'فريزرات تجارية': 'Congélateurs commerciaux', 'مكائن تعبئة وتغليف': 'Machines d\'emballage', 'سيلانة وتغليف حراري': 'Thermoscellage',
    'طابعات باركود وملصقات': 'Imprimantes codes-barres & étiquettes', 'موازين وبسكولات تجارية': 'Balances & bascules commerciales',
    'مغاسل صناعية كبيرة': 'Lave-linge industriels', 'مكائن تنظيف جاف': 'Pressing & nettoyage à sec', 'معدات تعقيم وتنظيف': 'Équipements désinfection',
    'مكائن غسيل سجاد': 'Machines à tapis', 'ماكينات خياطة صناعية': 'Machines à coudre industrielles',
    'معدات حلاقة وتجميل احترافية': 'Équipements coiffure & beauté pro', 'مكائن طباعة ونسخ': 'Imprimantes & photocopieurs pro',
    'معدات ورش ومصانع صغيرة': 'Équipements ateliers & petites usines', 'قطع غيار مكائن صناعية': 'Pièces détachées machines',
    'تركيب وصيانة مكائن': 'Installation & maintenance machines', 'استشارات ومشاريع معدات': 'Conseil & projets équipements',
    'دراجات هوائية كهربائية': 'Vélos électriques', 'سكوتر ودراجات صغيرة': 'Scooters & petites motos',
    'عطور رجالية': 'Parfums homme', 'ملابس أطفال ورضع': 'Vêtements bébé & enfant', 'أزياء رياضية': 'Vêtements sport',
    'مستلزمات أمومة': 'Articles maternité & puériculture', 'نظارات وعدسات': 'Lunettes & lentilles',
    'صيدليات ومستودعات أدوية': 'Pharmacies & dépôts pharma', 'عيادات ومراكز طبية': 'Cliniques & centres médicaux',
    'مستحضرات حلال وتجميل': 'Cosmétiques halal & beauté', 'أعشاب وطب تقليدي': 'Plantes & médecine traditionnelle',
    'رحلات داخلية': 'Voyages nationaux', 'سياحة صحراوية وبحرية': 'Tourisme désert & côtier',
    'تأجير سيارات وسياحة': 'Location voitures & tourisme', 'معدات تصوير سفر': 'Matériel photo voyage',
    'بقالة وتموين': 'Épiceries & approvisionnement', 'توابل وبهارات': 'Épices & condiments', 'زيوت وسمن': 'Huiles & beurre clarifié',
    'أعلاف وبذور': 'Aliments & semences animales', 'أدوية بيطرية': 'Médicaments vétérinaires', 'مستلزمات تربية': 'Fournitures d\'élevage',
    'كهرباء وسباكة منزلية': 'Électricité & plomberie domicile', 'تكييف وتبريد منزلي': 'Climatisation & froid maison',
    'نجارة وألمنيوم': 'Menuiserie & aluminium', 'حدادة ولحام': 'Ferronnerie & soudure',
    'تسويق رقمي': 'Marketing digital', 'محاسبة وإدارة': 'Comptabilité & gestion', 'قانون واستشارات': 'Droit & conseil',
    'بضائع استهلاكية': 'Biens de consommation', 'مواد أولية': 'Matières premières', 'تجارة جملة وتجزئة': 'Gros & détail',
    'كرة قدم ورياضات جماعية': 'Football & sports collectifs', 'لياقة بدنية وصالات': 'Fitness & salles de sport',
    'صيد بري وبحري': 'Chasse & pêche', 'ألعاب أطفال': 'Jeux enfants', 'آلات موسيقية': 'Instruments de musique',
    'دروس أونلاين': 'Cours en ligne', 'لغات وترجمة': 'Langues & traduction', 'مكتبات وقرطاسية': 'Librairies & papeterie',
    'فخار وخزف': 'Poterie & céramique art', 'جلد ودباغة': 'Cuir & tannage', 'حفر وتطريز تقليدي': 'Gravure & broderie traditionnelle'
  };

  function flatSubcats(cat) {
    if (cat.groups && cat.groups.length) {
      var out = [];
      cat.groups.forEach(function (g) { (g.subs || []).forEach(function (s) { out.push(s); }); });
      return out;
    }
    return (cat.subcats || []).slice();
  }

  /** 22 قسماً — ترتيب منطقي: منزل → طاقة → صناعة → مركبات → حياة يومية */
  var BUILTIN = [
    { key: 'عقارات', nameAr: 'منازل وعقارات', nameFr: 'Immobilier', icon: '🏠', gold: false,
      groups: [
        { title: 'للبيع', subs: ['شقق للبيع', 'منازل وفيلات', 'أراضي', 'محلات تجارية', 'مكاتب ومستودعات', 'عمارات وسكنات'] },
        { title: 'للكراء', subs: ['غرف للكراء', 'شقق للكراء', 'منازل للكراء', 'محلات للكراء', 'إيجار يومي / سياحي', 'قبوعات ومخازن'] },
        { title: 'تجهيز وسكن', subs: ['مفروش بالكامل', 'نصف مفروش', 'عقار مع أثاث', 'سكن جاهز للاستعمال', 'عقارات قيد الإنشاء', 'استثمار عقاري'] }
      ] },
    { key: 'معدات-منزل', nameAr: 'معدات المنازل', nameFr: 'Électroménager & maison', icon: '🔌', gold: false,
      groups: [
        { title: 'أجهزة كبرى', subs: ['ثلاجات ومجمدات', 'غسالات ومجففات', 'مكيفات وتبريد', 'أفران وطباخات', 'سخانات مياه'] },
        { title: 'مطبخ وتحضير', subs: ['محضرات طعام', 'أجهزة مطبخ صغيرة', 'مكواة وبخار'] },
        { title: 'تنظيف ومياه', subs: ['مكانس وغسيل', 'مياه وترشيح', 'مجففات شعر وأجهزة عناية'] },
        { title: 'صيانة أجهزة', subs: ['قطع غيار أجهزة', 'تركيب وصيانة أجهزة'] }
      ] },
    { key: 'أثاث', nameAr: 'أثاث وديكور', nameFr: 'Meubles & décor', icon: '🛋️', gold: false,
      groups: [
        { title: 'أثاث', subs: ['أثاث غرف نوم', 'أثاث صالون', 'أثاث مطبخ', 'أثاث حمام', 'أثاث مكتبي وأطفال', 'خزائن ودواليب'] },
        { title: 'ديكور ومفروشات', subs: ['ستائر وسجاد', 'إضاءة وديكور', 'مراتب ومفروشات', 'ديكور خارجي وحدائق', 'مرايا وإكسسوارات أثاث'] }
      ] },
    { key: 'بناء', nameAr: 'بناء ومقاولات', nameFr: 'Construction', icon: '🧱', gold: false,
      groups: [
        { title: 'مواد بناء', subs: ['أسمنت وحديد', 'طوب وسيراميك', 'أخشاب وأبواب', 'عزل حراري وصوتي'] },
        { title: 'تجهيزات', subs: ['سباكة وكهرباء', 'دهانات وعزل مائي', 'أدوات بناء', 'أدوات يدوية وكهربائية'] }
      ] },
    { key: 'طاقة', nameAr: 'طاقة ومستلزمات', nameFr: 'Énergie & accessoires', icon: '⚡', gold: false,
      groups: [
        { title: 'طاقة شمسية', subs: ['ألواح شمسية', 'انفرترات ومحولات', 'منظمات شحن شمسية', 'بطاريات تخزين'] },
        { title: 'مولدات وطاقة احتياطية', subs: ['مولدات كهربائية', 'مولدات وطاقة منزلية', 'بطاريات UPS واحتياط', 'محولات جهد وطاقة'] },
        { title: 'مستلزمات كهربائية', subs: ['كابلات وموصلات طاقة', 'هياكل تثبيت وقواعد', 'فيش وقواطع كهربائية', 'محولات طاقة للسيارات'] },
        { title: 'أنظمة جاهزة', subs: ['أنظمة منزلية متكاملة', 'مضخات مياه شمسية', 'إنارة شمسية', 'طقم طاقة متنقل'] },
        { title: 'خدمات وتركيب', subs: ['تركيب وصيانة طاقة', 'استشارة ودراسة طاقة'] }
      ] },
    { key: 'مكائن-صناعية', nameAr: 'مكائن ومعدات صناعية', nameFr: 'Machines & équipements industriels', icon: '⚙️', gold: false,
      groups: [
        { title: 'مخابز ومعامل غذائية', subs: ['أفران مخابز صناعية', 'عجانات وخلاطات صناعية', 'مكائن تشكيل خبز ومعجنات', 'معدات حلويات وتجهيزات مخبز'] },
        { title: 'تبريد وثلج', subs: ['مكائن صنع ثلج', 'ثلاجات عرض صناعية', 'غرف تبريد وتجميد', 'فريزرات تجارية'] },
        { title: 'تعبئة وتغليف', subs: ['مكائن تعبئة وتغليف', 'سيلانة وتغليف حراري', 'طابعات باركود وملصقات', 'موازين وبسكولات تجارية'] },
        { title: 'غسيل وتنظيف صناعي', subs: ['مغاسل صناعية كبيرة', 'مكائن تنظيف جاف', 'معدات تعقيم وتنظيف', 'مكائن غسيل سجاد'] },
        { title: 'مكائن استعمال يومي', subs: ['ماكينات خياطة صناعية', 'معدات حلاقة وتجميل احترافية', 'مكائن طباعة ونسخ', 'معدات ورش ومصانع صغيرة'] },
        { title: 'صيانة وقطع غيار', subs: ['قطع غيار مكائن صناعية', 'تركيب وصيانة مكائن', 'استشارات ومشاريع معدات'] }
      ] },
    { key: 'سيارات', nameAr: 'سيارات وقطع غيار', nameFr: 'Voitures & pièces', icon: '🚗', gold: false,
      groups: [
        { title: 'سيارات', subs: ['سيارات للبيع', 'سيارات للكراء', 'سيارات كهربائية وهجينة', 'دراجات نارية', 'دراجات هوائية كهربائية', 'سكوتر ودراجات صغيرة'] },
        { title: 'ملحقات', subs: ['قطع غيار', 'إطارات وبطاريات', 'زيوت ومستلزمات', 'تجهيز وتزيين'] }
      ] },
    { key: 'تأمين', nameAr: 'وكالات تأمين المركبات', nameFr: "Agences d'assurance véhicules", icon: '🛡️', gold: false,
      groups: [
        { title: 'أنواع التأمين', subs: ['تأمين سيارات خاصة', 'تأمين شاحنات ونقل', 'تأمين آلات ومعدات ثقيلة', 'تأمين دراجات نارية'] },
        { title: 'خدمات الوكالات', subs: ['تجديد رخص وتأمين', 'تقييم أضرار وحوادث', 'استشارات ووساطة تأمين'] }
      ] },
    { key: 'شاحنات', nameAr: 'شاحنات ومعدات ثقيلة', nameFr: 'Camions & engins', icon: '🚛', gold: false,
      groups: [
        { title: 'مركبات', subs: ['شاحنات للبيع', 'شاحنات للكراء', 'حافلات وباصات', 'مقطورات وصهاريج'] },
        { title: 'معدات ثقيلة', subs: ['معدات بناء للبيع', 'معدات بناء للكراء', 'معدات زراعية', 'قطع غيار ثقيلة'] }
      ] },
    { key: 'إلكترونيات', nameAr: 'هواتف وإلكترونيات', nameFr: 'Téléphones & électronique', icon: '📱', gold: false,
      groups: [
        { title: 'أجهزة', subs: ['هواتف ذكية', 'لابتوب وحاسوب', 'شاشات وتلفزيون', 'تابلت وأجهزة لوحية', 'ساعات ذكية'] },
        { title: 'ملحقات تقنية', subs: ['شبكات وراوتر', 'كاميرات ودرونز', 'سماعات وصوتيات', 'شواحن وإكسسوارات'] }
      ] },
    { key: 'أزياء', nameAr: 'موضة وأزياء', nameFr: 'Mode & vêtements', icon: '👗', gold: false,
      groups: [
        { title: 'ملابس تقليدية 🇲🇷', subs: ['دراعة رجالية', 'ملحفة نسائية', 'طرح وأغطية رأس'] },
        { title: 'ملابس وإكسسوارات', subs: ['ملابس رجالية', 'ملابس نسائية وأطفال', 'ملابس أطفال ورضع', 'أحذية وحقائب', 'مجوهرات وذهب', 'عطور ومستحضرات', 'عطور رجالية', 'أزياء رياضية', 'مستلزمات أمومة'] }
      ] },
    { key: 'ذهب', nameAr: 'ذهب ومجوهرات', nameFr: 'Or & bijoux', icon: '💰', gold: true,
      groups: [
        { title: '🥇 ذهب للبيع', subs: ['ذهب عيار 24 — خالص', 'ذهب عيار 22', 'ذهب عيار 21', 'ذهب عيار 18', 'ذهب خردة وقطع', 'سبائك ذهبية'] },
        { title: '💎 مجوهرات نسائية', subs: ['أساور وخلاخيل', 'خواتم وحلقات', 'عقود وقلادات', 'أقراط وحلق', 'طقم مجوهرات كامل'] },
        { title: '👑 مجوهرات تقليدية 🇲🇷', subs: ['خاتم موريتاني تقليدي', 'لبس العروس', 'حلي فضية', 'مجوهرات يدوية'] },
        { title: '📊 ذهب استثمار وخدمات', subs: ['ذهب للمهر والزواج', 'شراء بالوزن (غرام / مثقال)', 'تقييم وتثمين الذهب', 'إعادة صياغة وتصنيع', 'صائغ — خدمة تصميم'] },
        { title: '💍 فضة وأحجار', subs: ['مجوهرات فضية', 'أحجار كريمة', 'ألماس وزمرد'] }
      ] },
    { key: 'صحة', nameAr: 'صحة وجمال', nameFr: 'Santé & beauté', icon: '🌿', gold: false,
      groups: [
        { title: 'صحة', subs: ['أدوية ومكملات', 'أجهزة طبية', 'صيدليات ومستودعات أدوية', 'عيادات ومراكز طبية', 'أعشاب وطب تقليدي'] },
        { title: 'جمال', subs: ['مستحضرات طبيعية', 'عطور ومنتجات عناية', 'أجهزة عناية شخصية', 'مستحضرات حلال وتجميل', 'نظارات وعدسات'] }
      ] },
    { key: 'رحلات', nameAr: 'رحلات وسفر', nameFr: 'Voyages & tourisme', icon: '✈️', gold: false,
      groups: [
        { title: 'حجوزات وعروض', subs: ['عروض سياحية', 'حجز فنادق', 'رحلات منظمة', 'رحلات داخلية', 'سياحة صحراوية وبحرية'] },
        { title: 'مستلزمات السفر', subs: ['حقائب سفر', 'معدات تخييم', 'مستلزمات رحلات', 'أدوات مطبخ للرحلات', 'مفروشات وتجهيزات تخييم', 'معدات تصوير سفر'] },
        { title: 'نقل ووثائق', subs: ['تذاكر طيران', 'تأشيرات ووثائق سفر', 'تأمين سفر', 'تأجير سيارات وسياحة'] }
      ] },
    { key: 'أغذية', nameAr: 'أغذية ومطاعم', nameFr: 'Alimentation', icon: '🍽️', gold: false,
      groups: [
        { title: 'مواد غذائية', subs: ['تمر وحبوب وأرز', 'لحوم وأسماك', 'خضروات وفواكه', 'ألبان ومنتجات', 'بقالة وتموين', 'توابل وبهارات', 'زيوت وسمن'] },
        { title: 'مطاعم', subs: ['حلويات ومخبوزات', 'مشروبات وعصائر', 'مطاعم وكافيهات'] }
      ] },
    { key: 'ماشية', nameAr: 'ماشية ودواجن وبيطرة', nameFr: 'Bétail, volaille & vétérinaire', icon: '🐄', gold: false,
      groups: [
        { title: 'ماشية', subs: ['إبل', 'بقر', 'غنم وماعز'] },
        { title: 'منتجات حيوانية', subs: ['لبن طازج (ناقة وبقرة)', 'بيض طازج', 'أعلاف ومستلزمات', 'أعلاف وبذور'] },
        { title: 'دواجن', subs: ['دواجن وطيور', 'بيض دواجن'] },
        { title: 'بيطرة', subs: ['عيادات بيطرية', 'أدوية وعلاجات حيوانات', 'أدوية بيطرية', 'تطعيمات وفحوصات', 'مستلزمات ومعدات بيطرية', 'مستلزمات تربية'] }
      ] },
    { key: 'خدمات', nameAr: 'خدمات ومهن', nameFr: 'Services & métiers', icon: '🔧', gold: false,
      groups: [
        { title: 'خدمات منزلية', subs: ['نقل وشحن', 'تنظيف ومكافحة حشرات', 'بناء ودهان وسباكة', 'صيانة وإصلاح', 'كهرباء وسباكة منزلية', 'تكييف وتبريد منزلي'] },
        { title: 'خدمات متخصصة', subs: ['دروس خصوصية', 'تصميم وبرمجة', 'تصوير وإعلام', 'حلاقة وتجميل', 'نجارة وألمنيوم', 'حدادة ولحام'] }
      ] },
    { key: 'وظائف', nameAr: 'وظائف وفرص عمل', nameFr: 'Emplois', icon: '💼', gold: false,
      groups: [
        { title: 'وظائف متاحة', subs: ['إدارة وتسويق', 'هندسة وتقنية', 'صحة وطب', 'تعليم وتدريب', 'نقل وسياقة', 'تسويق رقمي', 'محاسبة وإدارة', 'قانون واستشارات'] },
        { title: 'أخرى', subs: ['أبحث عن عمل', 'فريلانس وعمل حر', 'تدريب وتربص'] }
      ] },
    { key: 'تجارة', nameAr: 'تجارة وصناعة', nameFr: 'Commerce & industrie', icon: '🏭', gold: false,
      groups: [
        { title: 'تجارة', subs: ['بضائع بالجملة', 'استيراد وتصدير', 'بضائع استهلاكية', 'مواد أولية', 'تجارة جملة وتجزئة', 'معدات تجارية'] },
        { title: 'استثمار', subs: ['شراكات تجارية', 'فرص استثمارية'] }
      ] },
    { key: 'رياضة', nameAr: 'رياضة وهوايات', nameFr: 'Sports & loisirs', icon: '⚽', gold: false,
      groups: [
        { title: 'رياضة', subs: ['معدات رياضية', 'دراجات هوائية', 'صيد وغوص', 'كرة قدم ورياضات جماعية', 'لياقة بدنية وصالات', 'صيد بري وبحري'] },
        { title: 'ترفيه', subs: ['ألعاب فيديو', 'موسيقى وآلات', 'آلات موسيقية', 'ألعاب أطفال', 'هوايات وتحف'] }
      ] },
    { key: 'تعليم', nameAr: 'تعليم وثقافة', nameFr: 'Éducation & culture', icon: '📚', gold: false,
      groups: [
        { title: 'كتب', subs: ['كتب مدرسية وجامعية', 'كتب دينية وعامة', 'مكتبات وقرطاسية'] },
        { title: 'تعليم', subs: ['أدوات مدرسية', 'دورات تدريبية', 'قرطاسية ومكتبية', 'دروس أونلاين', 'لغات وترجمة'] }
      ] },
    { key: 'فنون', nameAr: 'فنون وحرف يدوية', nameFr: 'Arts & artisanat', icon: '🎨', gold: false,
      groups: [
        { title: 'فنون', subs: ['لوحات وخط عربي', 'تصوير فوتوغرافي'] },
        { title: 'حرف موريتانية', subs: ['صناعة تقليدية', 'مجوهرات يدوية', 'نسيج وخياطة يدوية', 'فخار وخزف', 'جلد ودباغة', 'حفر وتطريز تقليدي'] }
      ] }
  ];

  BUILTIN.forEach(function (c) { c.subcats = flatSubcats(c); });

  var ALIAS = {
    'ماشية ودواجن': 'ماشية',
    'معدات المنازل': 'معدات-منزل',
    'رحلات وسفر': 'رحلات',
    'طاقة ومستلزمات': 'طاقة',
    'طاقة شمسية ومستلزمات': 'طاقة',
    'طاقة-شمسية': 'طاقة',
    'ألواح شمسية': 'طاقة',
    'انفرترات ومحولات': 'طاقة',
    'مولدات كهربائية': 'طاقة',
    'مكائن ومعدات صناعية': 'مكائن-صناعية',
    'مكائن-صناعية': 'مكائن-صناعية',
    'أجهزة منزلية': 'معدات-منزل',
    'أجهزة مطبخ': 'معدات-منزل'
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

  function translateGroupTitle(title, lang) {
    if (lang !== 'fr') return title;
    return GROUP_FR[title] || title;
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

  function buildCatDropHtml(cat) {
    var groups = cat.groups;
    if (!groups || !groups.length) {
      var subs = cat.subcats || [];
      if (!subs.length) return '';
      return '<div class="cat-drop"><div class="drop-group"><div class="drop-group-title">أقسام فرعية</div>'
        + subs.map(function (s) { return '<a class="drop-link" href="#">' + s + '</a>'; }).join('')
        + '</div></div>';
    }
    return '<div class="cat-drop">' + groups.map(function (g) {
      return '<div class="drop-group"><div class="drop-group-title">' + g.title + '</div>'
        + (g.subs || []).map(function (s) { return '<a class="drop-link" href="#">' + s + '</a>'; }).join('')
        + '</div>';
    }).join('') + '</div>';
  }

  function buildCatCardHtml(cat) {
    var goldCls = cat.gold ? ' cat-gold' : '';
    var iconStyle = cat.gold
      ? ' style="background:linear-gradient(135deg,#b8860b,#FFD700);border-color:rgba(255,215,0,.4)"'
      : '';
    return '<div class="cat-card fade-in' + goldCls + '" style="position:relative;cursor:pointer" data-cat-key="' + cat.key + '" data-cat-ar="' + cat.nameAr + '">'
      + '<div class="cat-icon-box"' + iconStyle + '>' + cat.icon + '</div>'
      + '<span class="cat-name" data-ar="' + cat.nameAr + '">' + cat.nameAr + '</span>'
      + '<span class="cat-count">—</span>'
      + buildCatDropHtml(cat)
      + '</div>';
  }

  function renderBuiltinGrid(grid) {
    if (!grid) return;
    var mount = grid.querySelector('#builtin-cats-mount');
    if (!mount) return;
    var html = BUILTIN.map(buildCatCardHtml).join('');
    mount.insertAdjacentHTML('beforebegin', html);
    mount.remove();
  }

  function catNamesArrays() {
    return {
      ar: BUILTIN.map(function (c) { return c.nameAr; }),
      fr: BUILTIN.map(function (c) { return c.nameFr; })
    };
  }

  function qcatData() {
    var out = {};
    BUILTIN.forEach(function (c) {
      out[c.key] = { icon: c.icon, subs: (c.subcats || []).slice(0, 8) };
    });
    out['ذهب ومجوهرات'] = out['ذهب'];
    out['صحة وجمال'] = out['صحة'];
    out['معدات-منزل'] = out['معدات-منزل'] || { icon: '🔌', subs: ['ثلاجات ومجمدات', 'غسالات ومجففات', 'مكيفات وتبريد', 'محضرات طعام'] };
    return out;
  }

  function qcatToCatCard() {
    var out = {};
    BUILTIN.forEach(function (c) { out[c.key] = c.nameAr; });
    out['ذهب ومجوهرات'] = 'ذهب ومجوهرات';
    out['صحة وجمال'] = 'صحة وجمال';
    out['معدات-منزل'] = 'معدات المنازل';
    out['طاقة'] = 'طاقة ومستلزمات';
    out['رحلات'] = 'رحلات وسفر';
    out['مكائن-صناعية'] = 'مكائن ومعدات صناعية';
    return out;
  }

  function qcatKeysFr() {
    var out = {};
    BUILTIN.forEach(function (c) {
      out[c.key] = c.nameFr;
      out[c.nameAr] = c.nameFr;
    });
    out['ذهب ومجوهرات'] = out['ذهب'];
    out['صحة وجمال'] = out['صحة'];
    out['عقارات'] = out['عقارات'] || 'Immobilier';
    return out;
  }

  function qcatDataFr() {
    var out = {};
    BUILTIN.forEach(function (c) {
      out[c.key] = { icon: c.icon, subs: translateSubcats(c.subcats || [], 'fr') };
    });
    out['ذهب ومجوهرات'] = out['ذهب'];
    out['صحة وجمال'] = out['صحة'];
    return out;
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
        groups: c.groups || null,
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
    SUB_FR: SUB_FR,
    GROUP_FR: GROUP_FR,
    normalize: normalize,
    list: list,
    getByKey: getByKey,
    subcatsFor: subcatsFor,
    translateSubcats: translateSubcats,
    translateGroupTitle: translateGroupTitle,
    buildCatCardHtml: buildCatCardHtml,
    renderBuiltinGrid: renderBuiltinGrid,
    catNamesArrays: catNamesArrays,
    qcatData: qcatData,
    qcatDataFr: qcatDataFr,
    qcatKeysFr: qcatKeysFr,
    qcatToCatCard: qcatToCatCard,
    flatSubcats: flatSubcats
  };
})(typeof window !== 'undefined' ? window : global);
