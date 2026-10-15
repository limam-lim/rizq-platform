/**
 * rizq_dyn_filters.js — فلاتر ديناميكية حسب القسم والفرع
 * مستوحاة من أفضل ممارسات Avito / Milanuncios / Amazon:
 * كل قسم له ملف فلتر خاص، والفلاتر الفرعية تظهر فقط عند اختيار الفرع المناسب.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var YEAR_MAX = new Date().getFullYear() + 1;
  var YEAR_MIN = 1990;

  function chip(id, labelAr, labelFr, name, options, whenSubcat) {
    var f = {
      id: id,
      type: 'chips',
      labelAr: labelAr,
      labelFr: labelFr,
      name: name,
      options: options
    };
    if (whenSubcat) f.whenSubcat = whenSubcat;
    return f;
  }

  function numRange(id, labelAr, labelFr, minKey, maxKey, unitAr, unitFr, whenSubcat) {
    var f = {
      id: id,
      type: 'num-range',
      labelAr: labelAr,
      labelFr: labelFr,
      minKey: minKey,
      maxKey: maxKey,
      minPhAr: 'من',
      maxPhAr: 'إلى',
      minPhFr: 'De',
      maxPhFr: 'À',
      unitAr: unitAr,
      unitFr: unitFr
    };
    if (whenSubcat) f.whenSubcat = whenSubcat;
    return f;
  }

  /** ملفات فلتر لكل عائلة أقسام */
  var PROFILES = {
    سيارات: {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        {
          id: 'year',
          type: 'year-range',
          labelAr: 'سنة التصنيع',
          labelFr: 'Année de fabrication'
        },
        numRange('km', 'الكيلومترات', 'Kilométrage', 'kmMin', 'kmMax', 'كم', 'km'),
        chip('gearbox', 'علبة التروس', 'Boîte de vitesses', 'rgear', [
          { v: 'auto', ar: 'أوتوماتيك', fr: 'Automatique' },
          { v: 'manual', ar: 'يدوي', fr: 'Manuelle' }
        ]),
        chip('fuel', 'الوقود', 'Carburant', 'rfuel', [
          { v: 'petrol', ar: 'بنزين', fr: 'Essence' },
          { v: 'diesel', ar: 'ديزل', fr: 'Diesel' },
          { v: 'hybrid', ar: 'هجين', fr: 'Hybride' },
          { v: 'electric', ar: 'كهربائي', fr: 'Électrique' }
        ]),
        chip('bodyType', 'نوع الهيكل', 'Carrosserie', 'rbody', [
          { v: 'sedan', ar: 'سيدان', fr: 'Berline' },
          { v: 'suv', ar: 'دفع رباعي / SUV', fr: 'SUV / 4x4' },
          { v: 'hatch', ar: 'هاتشباك', fr: 'Citadine' },
          { v: 'pickup', ar: 'بيك أب', fr: 'Pick-up' },
          { v: 'van', ar: 'فان', fr: 'Fourgon' }
        ], /سيارات للبيع|سيارات للكراء|سيارات كهربائية|هجين/),
        chip('bikeCc', 'سعة المحرك', 'Cylindrée', 'rbikecc', [
          { v: '0-125', ar: 'حتى 125 سم³', fr: 'Jusqu\'à 125 cm³' },
          { v: '125-250', ar: '125 — 250', fr: '125 — 250' },
          { v: '250-500', ar: '250 — 500', fr: '250 — 500' },
          { v: '500-9999', ar: 'أكثر من 500', fr: 'Plus de 500' }
        ], /دراجات نارية|سكوتر/)
      ]
    },
    شاحنات: {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        {
          id: 'year',
          type: 'year-range',
          labelAr: 'سنة التصنيع',
          labelFr: 'Année de fabrication'
        },
        chip('payload', 'الحمولة', 'Charge utile', 'rpayload', [
          { v: '0-5', ar: 'حتى 5 طن', fr: 'Jusqu\'à 5 t' },
          { v: '5-15', ar: '5 — 15 طن', fr: '5 — 15 t' },
          { v: '15-30', ar: '15 — 30 طن', fr: '15 — 30 t' },
          { v: '30-999', ar: 'أكثر من 30 طن', fr: 'Plus de 30 t' }
        ], /شاحنات|حافلات|مقطورات|صهاريج/),
        numRange('hours', 'ساعات العمل (معدات)', 'Heures de service', 'hoursMin', 'hoursMax', 'ساعة', 'h', /معدات|زراعية|بناء/)
      ]
    },
    إلكترونيات: {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        chip('variant', 'الفئة / الإصدار', 'Variante', 'rvariant', [
          { v: 'base', ar: 'عادي', fr: 'Standard' },
          { v: 'plus', ar: 'بلس', fr: 'Plus' },
          { v: 'pro', ar: 'برو', fr: 'Pro' },
          { v: 'pro-max', ar: 'برو ماكس', fr: 'Pro Max' },
          { v: 'ultra', ar: 'ألترا', fr: 'Ultra' }
        ], /هواتف|تابلت|ساعات ذكية/),
        chip('storage', 'سعة التخزين', 'Stockage', 'rstorage', [
          { v: '64', ar: '64 GB', fr: '64 Go' },
          { v: '128', ar: '128 GB', fr: '128 Go' },
          { v: '256', ar: '256 GB', fr: '256 Go' },
          { v: '512', ar: '512 GB', fr: '512 Go' },
          { v: '1024', ar: '1 TB', fr: '1 To' }
        ], /هواتف|تابلت|لابتوب|حاسوب|ساعات ذكية/),
        chip('ram', 'الذاكرة RAM', 'Mémoire RAM', 'rram', [
          { v: '4', ar: '4 GB', fr: '4 Go' },
          { v: '8', ar: '8 GB', fr: '8 Go' },
          { v: '16', ar: '16 GB', fr: '16 Go' },
          { v: '32', ar: '32 GB+', fr: '32 Go+' }
        ], /لابتوب|حاسوب/),
        chip('screenSize', 'حجم الشاشة', 'Taille d\'écran', 'rscreen', [
          { v: '32', ar: '32 بوصة', fr: '32"' },
          { v: '43', ar: '43 بوصة', fr: '43"' },
          { v: '55', ar: '55 بوصة', fr: '55"' },
          { v: '65', ar: '65 بوصة', fr: '65"' },
          { v: '75', ar: '75+ بوصة', fr: '75"+' }
        ], /شاشات|تلفزيون/),
        chip('cameraType', 'نوع الكاميرا', 'Type de caméra', 'rcam', [
          { v: 'dslr', ar: 'DSLR', fr: 'Reflex' },
          { v: 'mirrorless', ar: 'بدون مرآة', fr: 'Hybride' },
          { v: 'action', ar: 'أكشن', fr: 'Action' },
          { v: 'drone', ar: 'درون', fr: 'Drone' },
          { v: 'security', ar: 'مراقبة', fr: 'Surveillance' }
        ], /كاميرات|درونز/),
        chip('networkType', 'نوع الشبكة', 'Réseau', 'rnet', [
          { v: 'router', ar: 'راوتر', fr: 'Routeur' },
          { v: 'mesh', ar: 'مش', fr: 'Mesh' },
          { v: 'switch', ar: 'سويتش', fr: 'Switch' },
          { v: 'modem', ar: 'مودم', fr: 'Modem' }
        ], /شبكات|راوتر/),
        chip('audioType', 'نوع الصوت', 'Audio', 'raudio', [
          { v: 'headphones', ar: 'سماعات رأس', fr: 'Casque' },
          { v: 'earbuds', ar: 'أذن', fr: 'Écouteurs' },
          { v: 'speaker', ar: 'سماعة', fr: 'Enceinte' },
          { v: 'soundbar', ar: 'ساوند بار', fr: 'Barre de son' }
        ], /سماعات|صوتيات/)
      ]
    },
    'معدات-منزل': {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        chip('fridgeType', 'نوع الجهاز', 'Type', 'rfridge', [
          { v: 'fridge', ar: 'ثلاجة', fr: 'Réfrigérateur' },
          { v: 'freezer', ar: 'فريزر', fr: 'Congélateur' },
          { v: 'combi', ar: 'كومبي', fr: 'Combiné' },
          { v: 'side', ar: 'بابين متقابلين', fr: 'Side-by-side' }
        ], /ثلاجات|مجمدات/),
        chip('capacityL', 'السعة (لتر)', 'Capacité (L)', 'rcapl', [
          { v: '0-200', ar: 'حتى 200 لتر', fr: 'Jusqu\'à 200 L' },
          { v: '200-300', ar: '200 — 300 لتر', fr: '200 — 300 L' },
          { v: '300-400', ar: '300 — 400 لتر', fr: '300 — 400 L' },
          { v: '400-9999', ar: 'أكثر من 400 لتر', fr: 'Plus de 400 L' }
        ], /ثلاجات|مجمدات/),
        chip('fridgeFeat', 'ميزة التبريد', 'Technologie', 'rfridgef', [
          { v: 'nofrost', ar: 'No Frost', fr: 'No Frost' },
          { v: 'inverter', ar: 'إنفرتر', fr: 'Inverter' },
          { v: 'manual', ar: 'عادي', fr: 'Standard' }
        ], /ثلاجات|مجمدات/),
        chip('washerType', 'نوع الغسالة', 'Type de lave-linge', 'rwash', [
          { v: 'washer', ar: 'غسالة', fr: 'Lave-linge' },
          { v: 'dryer', ar: 'مجفف', fr: 'Sèche-linge' },
          { v: 'combo', ar: 'غسالة مجففة', fr: 'Lave-linge séchant' },
          { v: 'front', ar: 'فتحة أمامية', fr: 'Hublot' },
          { v: 'top', ar: 'فتحة علوية', fr: 'Ouverture dessus' }
        ], /غسالات|مجففات/),
        chip('washLoad', 'سعة الغسيل', 'Capacité de lavage', 'rload', [
          { v: '0-6', ar: 'حتى 6 كغ', fr: 'Jusqu\'à 6 kg' },
          { v: '6-8', ar: '6 — 8 كغ', fr: '6 — 8 kg' },
          { v: '8-10', ar: '8 — 10 كغ', fr: '8 — 10 kg' },
          { v: '10-99', ar: 'أكثر من 10 كغ', fr: 'Plus de 10 kg' }
        ], /غسالات|مجففات/),
        chip('acType', 'نوع المكيف', 'Type de climatiseur', 'rac', [
          { v: 'split', ar: 'سبليت', fr: 'Split' },
          { v: 'window', ar: 'شباك', fr: 'Fenêtre' },
          { v: 'portable', ar: 'محمول', fr: 'Mobile' },
          { v: 'central', ar: 'مركزي', fr: 'Central' }
        ], /مكيفات|تبريد/),
        chip('acPower', 'قوة التبريد', 'Puissance froide', 'racp', [
          { v: '1', ar: '1 طن / 12000', fr: '1 T / 12000' },
          { v: '1.5', ar: '1.5 طن / 18000', fr: '1,5 T / 18000' },
          { v: '2', ar: '2 طن / 24000', fr: '2 T / 24000' },
          { v: '2.5', ar: '2.5 طن فأكثر', fr: '2,5 T+' }
        ], /مكيفات|تبريد/),
        chip('cookFuel', 'مصدر الطاقة', 'Énergie', 'rcook', [
          { v: 'gas', ar: 'غاز', fr: 'Gaz' },
          { v: 'electric', ar: 'كهرباء', fr: 'Électricité' },
          { v: 'mixed', ar: 'مختلط', fr: 'Mixte' }
        ], /أفران|طباخات|سخانات/),
        chip('cookType', 'نوع الطباخ', 'Type de cuisson', 'rcookt', [
          { v: 'oven', ar: 'فرن', fr: 'Four' },
          { v: 'cooktop', ar: 'موقد', fr: 'Plaque' },
          { v: 'stove', ar: 'طباخ كامل', fr: 'Cuisinière' },
          { v: 'microwave', ar: 'مايكروويف', fr: 'Micro-ondes' },
          { v: 'airfryer', ar: 'قلاية هوائية', fr: 'Air fryer' }
        ], /أفران|طباخات|أجهزة مطبخ|محضرات/),
        chip('heaterCap', 'سعة السخان', 'Capacité chauffe-eau', 'rheater', [
          { v: '0-50', ar: 'حتى 50 لتر', fr: 'Jusqu\'à 50 L' },
          { v: '50-80', ar: '50 — 80 لتر', fr: '50 — 80 L' },
          { v: '80-100', ar: '80 — 100 لتر', fr: '80 — 100 L' },
          { v: '100-999', ar: 'أكثر من 100 لتر', fr: 'Plus de 100 L' }
        ], /سخانات/),
        chip('kitchenType', 'نوع جهاز المطبخ', 'Petit électroménager', 'rkitchen', [
          { v: 'blender', ar: 'خلاط', fr: 'Mixeur' },
          { v: 'mixer', ar: 'عجان', fr: 'Batteur' },
          { v: 'processor', ar: 'محضّر طعام', fr: 'Robot' },
          { v: 'coffee', ar: 'قهوة', fr: 'Café' },
          { v: 'kettle', ar: 'غلاية', fr: 'Bouilloire' },
          { v: 'airfryer', ar: 'قلاية هوائية', fr: 'Air fryer' }
        ], /محضرات|أجهزة مطبخ صغيرة/),
        chip('ironType', 'نوع المكواة', 'Type de fer', 'riron', [
          { v: 'steam', ar: 'بخار', fr: 'Vapeur' },
          { v: 'dry', ar: 'جافة', fr: 'Sec' },
          { v: 'station', ar: 'محطة بخار', fr: 'Centrale vapeur' },
          { v: 'garment', ar: 'كوي عمودي', fr: 'Défroisseur' }
        ], /مكواة|بخار/),
        chip('vacType', 'نوع المكنسة', 'Type d\'aspirateur', 'rvac', [
          { v: 'upright', ar: 'عمودية', fr: 'Balai' },
          { v: 'canister', ar: 'أسطوانية', fr: 'Traîneau' },
          { v: 'robot', ar: 'روبوت', fr: 'Robot' },
          { v: 'handheld', ar: 'يدوية', fr: 'À main' },
          { v: 'wet', ar: 'غسيل وشفط', fr: 'Eau et poussière' }
        ], /مكانس|غسيل/),
        chip('vacPower', 'التغذية', 'Alimentation', 'rvacp', [
          { v: 'corded', ar: 'بسلك', fr: 'Filaire' },
          { v: 'cordless', ar: 'بدون سلك', fr: 'Sans fil' }
        ], /مكانس|غسيل/),
        chip('waterType', 'نوع الترشيح', 'Filtration', 'rwater', [
          { v: 'ro', ar: 'تحلية RO', fr: 'Osmose inverse' },
          { v: 'uv', ar: 'أشعة UV', fr: 'UV' },
          { v: 'carbon', ar: 'كربون', fr: 'Charbon' },
          { v: 'dispenser', ar: 'موزع مياه', fr: 'Fontaine' },
          { v: 'stages', ar: '7 مراحل', fr: '7 étapes' }
        ], /مياه|ترشيح/),
        chip('careType', 'نوع العناية', 'Soin personnel', 'rcare', [
          { v: 'dryer', ar: 'مجفف شعر', fr: 'Sèche-cheveux' },
          { v: 'straightener', ar: 'مملس', fr: 'Lisseur' },
          { v: 'curler', ar: 'مكواة تجعيد', fr: 'Boucleur' },
          { v: 'trimmer', ar: 'ماكينة حلاقة', fr: 'Tondeuse' },
          { v: 'epilator', ar: 'مزيل شعر', fr: 'Épilateur' }
        ], /مجففات شعر|عناية/),
        chip('partsKind', 'نوع القطعة', 'Type de pièce', 'rparts', [
          { v: 'motor', ar: 'محرك', fr: 'Moteur' },
          { v: 'board', ar: 'لوحة إلكترونية', fr: 'Carte' },
          { v: 'seal', ar: 'مطاط / مانع تسرب', fr: 'Joint' },
          { v: 'filter', ar: 'فلتر', fr: 'Filtre' },
          { v: 'other', ar: 'أخرى', fr: 'Autre' }
        ], /قطع غيار أجهزة/),
        chip('serviceKind', 'نوع الخدمة', 'Type de service', 'rsvc', [
          { v: 'install', ar: 'تركيب', fr: 'Installation' },
          { v: 'repair', ar: 'إصلاح', fr: 'Réparation' },
          { v: 'maintain', ar: 'صيانة دورية', fr: 'Entretien' },
          { v: 'gas', ar: 'تعبئة غاز', fr: 'Recharge gaz' }
        ], /تركيب وصيانة أجهزة/)
      ]
    },
    أثاث: {
      brand: true,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        chip('furnMaterial', 'المادة', 'Matériau', 'rfmat', [
          { v: 'wood', ar: 'خشب', fr: 'Bois' },
          { v: 'mdf', ar: 'MDF', fr: 'MDF' },
          { v: 'metal', ar: 'معدن', fr: 'Métal' },
          { v: 'fabric', ar: 'قماش', fr: 'Tissu' },
          { v: 'leather', ar: 'جلد', fr: 'Cuir' },
          { v: 'glass', ar: 'زجاج', fr: 'Verre' }
        ]),
        chip('furnStyle', 'الأسلوب', 'Style', 'rfstyle', [
          { v: 'modern', ar: 'عصري', fr: 'Moderne' },
          { v: 'classic', ar: 'كلاسيكي', fr: 'Classique' },
          { v: 'traditional', ar: 'تقليدي', fr: 'Traditionnel' },
          { v: 'office', ar: 'مكتبي', fr: 'Bureau' }
        ]),
        chip('mattressSize', 'مقاس المرتبة', 'Taille matelas', 'rmatt', [
          { v: 'single', ar: 'فردي', fr: 'Simple' },
          { v: 'double', ar: 'مزدوج', fr: 'Double' },
          { v: 'queen', ar: 'كوين', fr: 'Queen' },
          { v: 'king', ar: 'كينغ', fr: 'King' }
        ], /مراتب|مفروشات|غرف نوم/)
      ]
    },
    بناء: {
      brand: false,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        chip('buildUnit', 'وحدة البيع', 'Unité', 'rbunit', [
          { v: 'ton', ar: 'بالطن', fr: 'À la tonne' },
          { v: 'bag', ar: 'بالكيس', fr: 'Au sac' },
          { v: 'piece', ar: 'بالقطعة', fr: 'À la pièce' },
          { v: 'meter', ar: 'بالمتر', fr: 'Au mètre' },
          { v: 'set', ar: 'طقم', fr: 'Lot' }
        ]),
        chip('buildUse', 'الاستخدام', 'Usage', 'rbuse', [
          { v: 'structure', ar: 'هيكل', fr: 'Structure' },
          { v: 'finish', ar: 'تشطيب', fr: 'Finition' },
          { v: 'plumbing', ar: 'سباكة', fr: 'Plomberie' },
          { v: 'electric', ar: 'كهرباء', fr: 'Électricité' },
          { v: 'tools', ar: 'أدوات', fr: 'Outillage' }
        ])
      ]
    },
    طاقة: {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        chip('energyKind', 'نوع النظام', 'Type d\'énergie', 'renergy', [
          { v: 'solar', ar: 'شمسي', fr: 'Solaire' },
          { v: 'generator', ar: 'مولد', fr: 'Groupe' },
          { v: 'ups', ar: 'UPS / احتياط', fr: 'UPS / secours' },
          { v: 'inverter', ar: 'انفرتر', fr: 'Onduleur' },
          { v: 'kit', ar: 'نظام جاهز', fr: 'Kit complet' }
        ]),
        chip('panelWatt', 'قدرة اللوح', 'Puissance panneau', 'rpanel', [
          { v: '0-200', ar: 'حتى 200 واط', fr: 'Jusqu\'à 200 W' },
          { v: '200-400', ar: '200 — 400 واط', fr: '200 — 400 W' },
          { v: '400-550', ar: '400 — 550 واط', fr: '400 — 550 W' },
          { v: '550-9999', ar: 'أكثر من 550 واط', fr: 'Plus de 550 W' }
        ], /ألواح شمسية/),
        chip('batteryAh', 'سعة البطارية', 'Capacité batterie', 'rbatt', [
          { v: '0-100', ar: 'حتى 100 Ah', fr: 'Jusqu\'à 100 Ah' },
          { v: '100-200', ar: '100 — 200 Ah', fr: '100 — 200 Ah' },
          { v: '200-400', ar: '200 — 400 Ah', fr: '200 — 400 Ah' },
          { v: '400-9999', ar: 'أكثر من 400 Ah', fr: 'Plus de 400 Ah' }
        ], /بطاريات/),
        chip('genKva', 'قدرة المولد', 'Puissance groupe', 'rgen', [
          { v: '0-5', ar: 'حتى 5 kVA', fr: 'Jusqu\'à 5 kVA' },
          { v: '5-15', ar: '5 — 15 kVA', fr: '5 — 15 kVA' },
          { v: '15-30', ar: '15 — 30 kVA', fr: '15 — 30 kVA' },
          { v: '30-999', ar: 'أكثر من 30 kVA', fr: 'Plus de 30 kVA' }
        ], /مولدات/),
        chip('inverterKw', 'قدرة الانفرتر', 'Puissance onduleur', 'rinv', [
          { v: '0-1', ar: 'حتى 1 كيلوواط', fr: 'Jusqu\'à 1 kW' },
          { v: '1-3', ar: '1 — 3 كيلوواط', fr: '1 — 3 kW' },
          { v: '3-5', ar: '3 — 5 كيلوواط', fr: '3 — 5 kW' },
          { v: '5-999', ar: 'أكثر من 5 كيلوواط', fr: 'Plus de 5 kW' }
        ], /انفرترات|محولات/)
      ]
    },
    'مكائن-صناعية': {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        {
          id: 'year',
          type: 'year-range',
          labelAr: 'سنة التصنيع',
          labelFr: 'Année de fabrication'
        },
        chip('machineKind', 'نوع المعدة', 'Type de machine', 'rmach', [
          { v: 'bakery', ar: 'مخابز', fr: 'Boulangerie' },
          { v: 'cold', ar: 'تبريد', fr: 'Froid' },
          { v: 'pack', ar: 'تعبئة', fr: 'Emballage' },
          { v: 'laundry', ar: 'غسيل صناعي', fr: 'Blanchisserie' },
          { v: 'workshop', ar: 'ورش', fr: 'Atelier' }
        ]),
        numRange('hours', 'ساعات العمل', 'Heures de service', 'hoursMin', 'hoursMax', 'ساعة', 'h')
      ]
    },
    تأمين: {
      brand: false,
      model: false,
      rooms: false,
      condition: false,
      fields: [
        chip('insureKind', 'نوع التأمين', 'Type d\'assurance', 'rins', [
          { v: 'third', ar: 'طرف ثالث', fr: 'Tiers' },
          { v: 'full', ar: 'شامل', fr: 'Tous risques' },
          { v: 'fleet', ar: 'أسطول', fr: 'Flotte' },
          { v: 'renewal', ar: 'تجديد', fr: 'Renouvellement' }
        ]),
        chip('insureVehicle', 'نوع المركبة', 'Véhicule couvert', 'rinsv', [
          { v: 'car', ar: 'سيارة خاصة', fr: 'Voiture' },
          { v: 'truck', ar: 'شاحنة', fr: 'Camion' },
          { v: 'moto', ar: 'دراجة', fr: 'Moto' },
          { v: 'heavy', ar: 'معدات ثقيلة', fr: 'Engin' }
        ])
      ]
    },
    أزياء: {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        chip('size', 'المقاس', 'Taille', 'rsize', [
          { v: 'xs', ar: 'XS', fr: 'XS' },
          { v: 's', ar: 'S', fr: 'S' },
          { v: 'm', ar: 'M', fr: 'M' },
          { v: 'l', ar: 'L', fr: 'L' },
          { v: 'xl', ar: 'XL', fr: 'XL' },
          { v: 'xxl', ar: 'XXL', fr: 'XXL' },
          { v: '3xl', ar: '3XL', fr: '3XL' },
          { v: '4xl', ar: '4XL', fr: '4XL' },
          { v: '40', ar: '40', fr: '40' },
          { v: '41', ar: '41', fr: '41' },
          { v: '42', ar: '42', fr: '42' },
          { v: '43', ar: '43', fr: '43' },
          { v: '44', ar: '44', fr: '44' },
          { v: '45', ar: '45', fr: '45' },
          { v: '46', ar: '46', fr: '46' },
          { v: '47', ar: '47', fr: '47' },
          { v: '48', ar: '48', fr: '48' },
          { v: '49', ar: '49', fr: '49' },
          { v: '50', ar: '50', fr: '50' }
        ]),
        chip('gender', 'الفئة', 'Genre', 'rgender', [
          { v: 'men', ar: 'رجالي', fr: 'Homme' },
          { v: 'women', ar: 'نسائي', fr: 'Femme' },
          { v: 'kids', ar: 'أطفال', fr: 'Enfant' },
          { v: 'unisex', ar: 'للجنسين', fr: 'Unisexe' }
        ]),
        chip('clothType', 'نوع القطعة', 'Type de vêtement', 'rcloth', [
          { v: 'traditional', ar: 'تقليدي', fr: 'Traditionnel' },
          { v: 'casual', ar: 'يومي', fr: 'Casual' },
          { v: 'formal', ar: 'رسمي', fr: 'Formel' },
          { v: 'sport', ar: 'رياضي', fr: 'Sport' },
          { v: 'shoes', ar: 'أحذية', fr: 'Chaussures' },
          { v: 'bag', ar: 'حقائب', fr: 'Sacs' }
        ])
      ]
    },
    ذهب: {
      brand: true,
      model: false,
      rooms: false,
      condition: false,
      fields: [
        chip('karat', 'العيار', 'Titre', 'rkarat', [
          { v: '24', ar: 'عيار 24', fr: '24 carats' },
          { v: '22', ar: 'عيار 22', fr: '22 carats' },
          { v: '21', ar: 'عيار 21', fr: '21 carats' },
          { v: '18', ar: 'عيار 18', fr: '18 carats' }
        ]),
        numRange('weight', 'الوزن (غرام)', 'Poids (g)', 'weightMin', 'weightMax', 'غ', 'g'),
        chip('jewelType', 'نوع القطعة', 'Type de bijou', 'rjewel', [
          { v: 'bracelet', ar: 'سوار', fr: 'Bracelet' },
          { v: 'ring', ar: 'خاتم', fr: 'Bague' },
          { v: 'necklace', ar: 'عقد', fr: 'Collier' },
          { v: 'earring', ar: 'أقراط', fr: 'Boucles' },
          { v: 'set', ar: 'طقم', fr: 'Parure' },
          { v: 'bar', ar: 'سبيكة', fr: 'Lingot' }
        ], /أساور|خواتم|عقود|أقراط|طقم|سبائك|مجوهرات|حلي|لبس العروس|خاتم/)
      ]
    },
    عقارات: {
      brand: false,
      model: false,
      rooms: true,
      condition: false,
      fields: [
        chip('furnish', 'التأثيث', 'Ameublement', 'rfurnish', [
          { v: 'furnished', ar: 'مفروش', fr: 'Meublé' },
          { v: 'semi', ar: 'نصف مفروش', fr: 'Semi-meublé' },
          { v: 'empty', ar: 'فارغ', fr: 'Vide' }
        ]),
        numRange('area', 'المساحة (م²)', 'Surface (m²)', 'areaMin', 'areaMax', 'م²', 'm²'),
        chip('dealType', 'نوع الصفقة', 'Type d\'offre', 'rdeal', [
          { v: 'sale', ar: 'بيع', fr: 'Vente' },
          { v: 'rent', ar: 'كراء', fr: 'Location' },
          { v: 'daily', ar: 'يومي / سياحي', fr: 'Journalier' },
          { v: 'invest', ar: 'استثمار', fr: 'Investissement' }
        ])
      ]
    },
    أغذية: {
      brand: false,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        chip('foodForm', 'الشكل', 'Forme', 'rfoodform', [
          { v: 'fresh', ar: 'طازج', fr: 'Frais' },
          { v: 'canned', ar: 'معلب', fr: 'En conserve' },
          { v: 'frozen', ar: 'مجمّد', fr: 'Surgelé' },
          { v: 'dry', ar: 'جاف', fr: 'Sec' }
        ]),
        chip('foodUnit', 'وحدة البيع', 'Unité', 'rfoodunit', [
          { v: 'kg', ar: 'بالكيلو', fr: 'Au kg' },
          { v: 'piece', ar: 'بالقطعة', fr: 'À la pièce' },
          { v: 'pack', ar: 'عبوة', fr: 'Paquet' },
          { v: 'box', ar: 'صندوق', fr: 'Caisse' }
        ])
      ]
    },
    ماشية: {
      brand: false,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        numRange('livestockCount', 'العدد', 'Quantité', 'countMin', 'countMax', 'رأس', 'têtes', /إبل|بقر|غنم|ماعز|دواجن/),
        chip('animalSex', 'الجنس', 'Sexe', 'ranimal', [
          { v: 'male', ar: 'ذكر', fr: 'Mâle' },
          { v: 'female', ar: 'أنثى', fr: 'Femelle' },
          { v: 'mixed', ar: 'مختلط', fr: 'Mixte' }
        ], /إبل|بقر|غنم|ماعز|دواجن/),
        chip('vetKind', 'نوع الخدمة البيطرية', 'Service vétérinaire', 'rvet', [
          { v: 'clinic', ar: 'عيادة', fr: 'Clinique' },
          { v: 'meds', ar: 'أدوية', fr: 'Médicaments' },
          { v: 'vaccine', ar: 'تطعيم', fr: 'Vaccination' },
          { v: 'feed', ar: 'أعلاف', fr: 'Aliments' }
        ], /بيطر|أعلاف|تطعيم|أدوية/)
      ]
    },
    صحة: {
      brand: true,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        chip('healthKind', 'النوع', 'Type', 'rhealth', [
          { v: 'meds', ar: 'أدوية / مكملات', fr: 'Médicaments' },
          { v: 'device', ar: 'جهاز طبي', fr: 'Appareil médical' },
          { v: 'beauty', ar: 'تجميل وعناية', fr: 'Beauté' },
          { v: 'natural', ar: 'طبيعي / أعشاب', fr: 'Naturel' },
          { v: 'clinic', ar: 'عيادة / صيدلية', fr: 'Clinique / pharmacie' }
        ]),
        chip('beautyKind', 'منتج العناية', 'Soin', 'rbeauty', [
          { v: 'perfume', ar: 'عطر', fr: 'Parfum' },
          { v: 'cream', ar: 'كريم', fr: 'Crème' },
          { v: 'hair', ar: 'شعر', fr: 'Cheveux' },
          { v: 'device', ar: 'جهاز عناية', fr: 'Appareil soin' },
          { v: 'optics', ar: 'نظارات', fr: 'Optique' }
        ], /عطور|عناية|تجميل|نظارات|أجهزة عناية/)
      ]
    },
    رحلات: {
      brand: false,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        chip('tripKind', 'نوع العرض', 'Type d\'offre', 'rtrip', [
          { v: 'tour', ar: 'رحلة منظمة', fr: 'Circuit' },
          { v: 'hotel', ar: 'فندق', fr: 'Hôtel' },
          { v: 'ticket', ar: 'تذكرة', fr: 'Billet' },
          { v: 'visa', ar: 'تأشيرة', fr: 'Visa' },
          { v: 'gear', ar: 'مستلزمات سفر', fr: 'Équipement' },
          { v: 'rentcar', ar: 'تأجير سيارة', fr: 'Location voiture' }
        ]),
        chip('tripDuration', 'المدة', 'Durée', 'rdur', [
          { v: '1', ar: 'يوم واحد', fr: '1 jour' },
          { v: '2-3', ar: '2 — 3 أيام', fr: '2 — 3 jours' },
          { v: '4-7', ar: '4 — 7 أيام', fr: '4 — 7 jours' },
          { v: '8-999', ar: 'أكثر من أسبوع', fr: 'Plus d\'une semaine' }
        ], /عروض|رحلات|سياحة|حجز/)
      ]
    },
    خدمات: {
      brand: false,
      model: false,
      rooms: false,
      condition: false,
      fields: [
        chip('serviceArea', 'نطاق الخدمة', 'Zone de service', 'rsarea', [
          { v: 'home', ar: 'منزلي', fr: 'Domicile' },
          { v: 'shop', ar: 'في المحل', fr: 'En atelier' },
          { v: 'remote', ar: 'عن بُعد', fr: 'À distance' },
          { v: 'onsite', ar: 'في الموقع', fr: 'Sur site' }
        ]),
        chip('serviceUrgency', 'الاستعجال', 'Urgence', 'rsurg', [
          { v: 'same', ar: 'نفس اليوم', fr: 'Jour même' },
          { v: 'week', ar: 'خلال أسبوع', fr: 'Sous une semaine' },
          { v: 'flex', ar: 'مرن', fr: 'Flexible' }
        ])
      ]
    },
    وظائف: {
      brand: false,
      model: false,
      rooms: false,
      condition: false,
      fields: [
        chip('jobType', 'نوع العقد', 'Type de contrat', 'rjob', [
          { v: 'full', ar: 'دوام كامل', fr: 'Temps plein' },
          { v: 'part', ar: 'جزئي', fr: 'Temps partiel' },
          { v: 'freelance', ar: 'حر', fr: 'Freelance' },
          { v: 'intern', ar: 'تدريب', fr: 'Stage' },
          { v: 'seek', ar: 'أبحث عن عمل', fr: 'Je cherche' }
        ]),
        chip('jobExp', 'الخبرة', 'Expérience', 'rjexp', [
          { v: '0-1', ar: 'مبتدئ', fr: 'Débutant' },
          { v: '1-3', ar: '1 — 3 سنوات', fr: '1 — 3 ans' },
          { v: '3-5', ar: '3 — 5 سنوات', fr: '3 — 5 ans' },
          { v: '5-99', ar: 'أكثر من 5', fr: 'Plus de 5 ans' }
        ])
      ]
    },
    تجارة: {
      brand: false,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        chip('tradeKind', 'نوع العرض', 'Type d\'offre', 'rtrade', [
          { v: 'wholesale', ar: 'جملة', fr: 'Gros' },
          { v: 'retail', ar: 'تجزئة', fr: 'Détail' },
          { v: 'import', ar: 'استيراد / تصدير', fr: 'Import / export' },
          { v: 'equip', ar: 'معدات', fr: 'Équipement' },
          { v: 'invest', ar: 'شراكة / استثمار', fr: 'Partenariat' }
        ]),
        chip('tradeUnit', 'وحدة البيع', 'Unité', 'rtradeu', [
          { v: 'piece', ar: 'قطعة', fr: 'Pièce' },
          { v: 'carton', ar: 'كرتون', fr: 'Carton' },
          { v: 'pallet', ar: 'طبلية', fr: 'Palette' },
          { v: 'container', ar: 'حاوية', fr: 'Conteneur' }
        ])
      ]
    },
    رياضة: {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        chip('sportKind', 'النوع', 'Type', 'rsport', [
          { v: 'gear', ar: 'معدات', fr: 'Équipement' },
          { v: 'bike', ar: 'دراجة', fr: 'Vélo' },
          { v: 'fitness', ar: 'لياقة', fr: 'Fitness' },
          { v: 'games', ar: 'ألعاب فيديو', fr: 'Jeux vidéo' },
          { v: 'music', ar: 'موسيقى', fr: 'Musique' },
          { v: 'hobby', ar: 'هوايات', fr: 'Loisirs' }
        ]),
        chip('bikeSize', 'مقاس الدراجة', 'Taille vélo', 'rbikes', [
          { v: 's', ar: 'صغير', fr: 'S' },
          { v: 'm', ar: 'وسط', fr: 'M' },
          { v: 'l', ar: 'كبير', fr: 'L' },
          { v: 'xl', ar: 'كبير جداً', fr: 'XL' }
        ], /دراجات/)
      ]
    },
    تعليم: {
      brand: false,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        chip('eduKind', 'النوع', 'Type', 'redu', [
          { v: 'book', ar: 'كتب', fr: 'Livres' },
          { v: 'supplies', ar: 'أدوات مدرسية', fr: 'Fournitures' },
          { v: 'course', ar: 'دورة / تدريب', fr: 'Formation' },
          { v: 'online', ar: 'أونلاين', fr: 'En ligne' },
          { v: 'lang', ar: 'لغات', fr: 'Langues' }
        ]),
        chip('eduLevel', 'المستوى', 'Niveau', 'redul', [
          { v: 'primary', ar: 'ابتدائي', fr: 'Primaire' },
          { v: 'middle', ar: 'إعدادي', fr: 'Collège' },
          { v: 'high', ar: 'ثانوي', fr: 'Lycée' },
          { v: 'uni', ar: 'جامعي', fr: 'Université' },
          { v: 'pro', ar: 'مهني', fr: 'Professionnel' }
        ], /كتب|دورات|دروس|لغات/)
      ]
    },
    فنون: {
      brand: false,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        chip('artKind', 'النوع', 'Type', 'rart', [
          { v: 'painting', ar: 'لوحة / خط', fr: 'Tableau / calligraphie' },
          { v: 'photo', ar: 'تصوير', fr: 'Photo' },
          { v: 'craft', ar: 'حرف يدوية', fr: 'Artisanat' },
          { v: 'textile', ar: 'نسيج', fr: 'Textile' },
          { v: 'pottery', ar: 'فخار', fr: 'Poterie' },
          { v: 'leather', ar: 'جلد', fr: 'Cuir' }
        ])
      ]
    }
  };

  var ALIAS = {
    'ذهب ومجوهرات': 'ذهب',
    'أغذية ومطاعم': 'أغذية',
    'ماشية ودواجن': 'ماشية',
    'ماشية ودواجن وبيطرة': 'ماشية',
    'معدات المنازل': 'معدات-منزل',
    'أجهزة منزلية': 'معدات-منزل',
    'أجهزة مطبخ': 'معدات-منزل',
    'هواتف وإلكترونيات': 'إلكترونيات',
    'أثاث وديكور': 'أثاث',
    'بناء ومقاولات': 'بناء',
    'طاقة ومستلزمات': 'طاقة',
    'طاقة شمسية ومستلزمات': 'طاقة',
    'مكائن ومعدات صناعية': 'مكائن-صناعية',
    'وكالات تأمين المركبات': 'تأمين',
    'صحة وجمال': 'صحة',
    'رحلات وسفر': 'رحلات',
    'خدمات ومهن': 'خدمات',
    'وظائف وفرص عمل': 'وظائف',
    'تجارة وصناعة': 'تجارة',
    'رياضة وهوايات': 'رياضة',
    'تعليم وثقافة': 'تعليم',
    'فنون وحرف يدوية': 'فنون',
    'منازل وعقارات': 'عقارات',
    'سيارات وقطع غيار': 'سيارات',
    'شاحنات ومعدات ثقيلة': 'شاحنات',
    'موضة وأزياء': 'أزياء'
  };

  function profileFor(catKey) {
    var key = String(catKey || '').trim();
    if (!key) return null;
    if (PROFILES[key]) return PROFILES[key];
    if (ALIAS[key] && PROFILES[ALIAS[key]]) return PROFILES[ALIAS[key]];
    if (typeof global.RizqCategories !== 'undefined' && typeof global.RizqCategories.normalize === 'function') {
      var n = global.RizqCategories.normalize(key);
      if (PROFILES[n]) return PROFILES[n];
      if (ALIAS[n] && PROFILES[ALIAS[n]]) return PROFILES[ALIAS[n]];
    }
    return null;
  }

  function fieldVisible(field, subcat) {
    if (!field.whenSubcat) return true;
    return field.whenSubcat.test(String(subcat || ''));
  }

  function renderField(field, fr, state) {
    state = state || {};
    if (field.type === 'year-range') {
      var yFrom = state.yearFrom || '';
      var yTo = state.yearTo || '';
      var opts = [];
      for (var y = YEAR_MAX; y >= YEAR_MIN; y--) {
        opts.push('<option value="' + y + '">' + y + '</option>');
      }
      return '<div class="filter-section rzq-dyn-field" data-dyn-id="year">'
        + '<div class="filter-title"><span>' + esc(fr ? field.labelFr : field.labelAr) + '</span>'
        + '<button type="button" class="rzq-dyn-clear" data-clear="year">' + (fr ? 'Effacer' : 'مسح') + '</button></div>'
        + '<div class="rzq-dyn-range-row">'
        + '<select class="wilaya-select" id="dyn-year-from" data-dyn="yearFrom" aria-label="' + (fr ? 'From year' : 'من سنة') + '">'
        + '<option value="">' + (fr ? 'De' : 'من') + '</option>' + opts.join('') + '</select>'
        + '<span class="price-sep">—</span>'
        + '<select class="wilaya-select" id="dyn-year-to" data-dyn="yearTo" aria-label="' + (fr ? 'To year' : 'إلى سنة') + '">'
        + '<option value="">' + (fr ? 'À' : 'إلى') + '</option>' + opts.join('') + '</select>'
        + '</div></div>';
    }
    if (field.type === 'num-range') {
      return '<div class="filter-section rzq-dyn-field" data-dyn-id="' + esc(field.id) + '">'
        + '<div class="filter-title"><span>' + esc(fr ? field.labelFr : field.labelAr) + '</span>'
        + '<button type="button" class="rzq-dyn-clear" data-clear="' + esc(field.id) + '">' + (fr ? 'Effacer' : 'مسح') + '</button></div>'
        + '<div class="rzq-dyn-range-row">'
        + '<input type="number" class="price-input" id="dyn-' + esc(field.minKey) + '" data-dyn="' + esc(field.minKey) + '" placeholder="' + esc(fr ? field.minPhFr : field.minPhAr) + '" min="0"/>'
        + '<span class="price-sep">—</span>'
        + '<input type="number" class="price-input" id="dyn-' + esc(field.maxKey) + '" data-dyn="' + esc(field.maxKey) + '" placeholder="' + esc(fr ? field.maxPhFr : field.maxPhAr) + '" min="0"/>'
        + '</div>'
        + '<div class="rzq-dyn-unit">' + esc(fr ? field.unitFr : field.unitAr) + '</div>'
        + '</div>';
    }
    if (field.type === 'chips') {
      var chips = (field.options || []).map(function (o) {
        return '<label class="filter-option rzq-dyn-chip"><input type="radio" name="' + esc(field.name) + '" value="' + esc(o.v) + '" class="filter-cb" data-dyn-chip="' + esc(field.id) + '"/>'
          + '<span class="filter-label">' + esc(fr ? o.fr : o.ar) + '</span></label>';
      }).join('');
      return '<div class="filter-section rzq-dyn-field" data-dyn-id="' + esc(field.id) + '">'
        + '<div class="filter-title"><span>' + esc(fr ? field.labelFr : field.labelAr) + '</span>'
        + '<button type="button" class="rzq-dyn-clear" data-clear="' + esc(field.id) + '">' + (fr ? 'Effacer' : 'مسح') + '</button></div>'
        + '<div class="chips rzq-dyn-chips">' + chips + '</div></div>';
    }
    return '';
  }

  function render(catKey, fr, opts) {
    opts = opts || {};
    var profile = profileFor(catKey);
    var mount = opts.mount || document.getElementById('dyn-filters-mount');
    if (!mount) return profile;
    if (!profile || !profile.fields || !profile.fields.length) {
      mount.innerHTML = '';
      mount.hidden = true;
      return profile;
    }
    var subcat = opts.subcat || '';
    var html = profile.fields
      .filter(function (f) { return fieldVisible(f, subcat); })
      .map(function (f) { return renderField(f, !!fr, opts.state || {}); })
      .join('');
    mount.innerHTML = html;
    mount.hidden = !html;
    bind(mount, opts.onChange);
    return profile;
  }

  function bind(mount, onChange) {
    if (!mount) return;
    function fire() {
      if (typeof onChange === 'function') onChange(readState(mount));
      else if (typeof global.applyFilters === 'function') global.applyFilters();
    }
    mount.querySelectorAll('[data-dyn], [data-dyn-chip]').forEach(function (el) {
      el.addEventListener('change', fire);
      if (el.tagName === 'INPUT' && el.type === 'number') {
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') fire();
        });
      }
    });
    mount.querySelectorAll('.rzq-dyn-clear').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-clear');
        var section = mount.querySelector('[data-dyn-id="' + id + '"]');
        if (!section) return;
        section.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
        section.querySelectorAll('input[type="number"], select').forEach(function (i) { i.value = ''; });
        fire();
      });
    });
  }

  function readState(root) {
    root = root || document.getElementById('dyn-filters-mount');
    var st = {};
    if (!root) return st;
    root.querySelectorAll('[data-dyn]').forEach(function (el) {
      var k = el.getAttribute('data-dyn');
      var v = el.value;
      if (v !== '' && v != null) st[k] = v;
    });
    root.querySelectorAll('input[data-dyn-chip]:checked').forEach(function (el) {
      st[el.getAttribute('data-dyn-chip')] = el.value;
    });
    return st;
  }

  function clearAll() {
    var root = document.getElementById('dyn-filters-mount');
    if (!root) return;
    root.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
    root.querySelectorAll('input[type="number"], select').forEach(function (i) { i.value = ''; });
  }

  function adYear(ad) {
    if (!ad) return 0;
    if (ad.year) return parseInt(ad.year, 10) || 0;
    var m = String(ad.title || '').match(/\b(19|20)\d{2}\b/);
    return m ? parseInt(m[0], 10) : 0;
  }

  function adKm(ad) {
    if (!ad) return null;
    if (ad.mileageKm != null) return Number(ad.mileageKm);
    if (ad.km != null) return Number(ad.km);
    var m = String(ad.desc || '').replace(/,/g, '').match(/(\d+)\s*كم/);
    if (m) return parseInt(m[1], 10);
    m = String(ad.descFr || ad.desc || '').replace(/\s/g, '').match(/(\d+)\s*km/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function adBlob(ad) {
    return [ad.title, ad.desc, ad.titleFr, ad.descFr, ad.subcat, ad.modelName, ad.modelNameFr]
      .map(function (x) { return String(x || ''); })
      .join(' ')
      .toLowerCase();
  }

  function matchChipMap(stateVal, blob, map, explicit) {
    if (!stateVal) return true;
    if (explicit != null && String(explicit).toLowerCase() === String(stateVal).toLowerCase()) return true;
    var re = map[stateVal];
    if (!re) return true;
    return re.test(blob);
  }

  function parseNumberFromBlob(blob, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      var m = blob.match(patterns[i]);
      if (m) return parseFloat(m[1]);
    }
    return null;
  }

  function inRangeChip(value, chipVal) {
    if (value == null || !chipVal) return false;
    var parts = String(chipVal).split('-');
    var a = parseFloat(parts[0]);
    var b = parseFloat(parts[1]);
    if (isNaN(a) || isNaN(b)) return false;
    return value >= a && value <= b;
  }

  function matches(ad, state, catKey) {
    state = state || {};
    if (!ad) return false;
    var blob = adBlob(ad);
    var y = adYear(ad);
    if (state.yearFrom && y && y < parseInt(state.yearFrom, 10)) return false;
    if (state.yearTo && y && y > parseInt(state.yearTo, 10)) return false;
    if ((state.yearFrom || state.yearTo) && !y) return false;

    var km = adKm(ad);
    if (state.kmMin && (km == null || km < parseInt(state.kmMin, 10))) return false;
    if (state.kmMax && (km == null || km > parseInt(state.kmMax, 10))) return false;

    if (state.gearbox) {
      var g = String(ad.gearbox || ad.transmission || '').toLowerCase();
      if (state.gearbox === 'auto') {
        if (!(g === 'auto' || g === 'automatic' || /أوتو|اتومات|automat/.test(blob))) return false;
      } else if (state.gearbox === 'manual') {
        if (!(g === 'manual' || /يدوي|manuelle|manual/.test(blob))) return false;
      }
    }

    if (state.fuel) {
      var fuel = String(ad.fuel || '').toLowerCase();
      var fuelMap = {
        petrol: /بنزين|essence|petrol|gasoline/,
        diesel: /ديزل|diesel/,
        hybrid: /هجين|hybrid/,
        electric: /كهرب|electric|év|ev\b/
      };
      if (fuelMap[state.fuel] && !fuelMap[state.fuel].test(blob) && fuel !== state.fuel) return false;
    }

    if (state.bodyType) {
      var bodyMap = {
        sedan: /سيدان|berline|sedan/,
        suv: /دفع رباعي|suv|4x4|tout.?terrain/,
        hatch: /هاتش|citadine|hatch/,
        pickup: /بيك.?أب|pick.?up|pickup/,
        van: /فان|fourgon|van/
      };
      if (!matchChipMap(state.bodyType, blob, bodyMap, ad.bodyType)) return false;
    }

    if (state.bikeCc) {
      var cc = ad.engineCc != null ? Number(ad.engineCc) : parseNumberFromBlob(blob, [/(\d+)\s*سم/, /(\d+)\s*cm/i, /(\d+)\s*cc/i]);
      if (cc == null || !inRangeChip(cc, state.bikeCc)) return false;
    }

    if (state.payload) {
      var tons = ad.payloadTons != null ? Number(ad.payloadTons) : null;
      if (tons == null) {
        var pm = blob.match(/(\d+)\s*طن/);
        tons = pm ? parseFloat(pm[1]) : null;
      }
      if (tons == null || !inRangeChip(tons, state.payload)) return false;
    }

    if (state.hoursMin || state.hoursMax) {
      var hours = ad.hoursWorked != null ? Number(ad.hoursWorked) : null;
      if (hours == null) {
        var hm = blob.match(/(\d+)\s*ساعة/);
        hours = hm ? parseInt(hm[1], 10) : null;
      }
      if (hours == null) return false;
      if (state.hoursMin && hours < parseInt(state.hoursMin, 10)) return false;
      if (state.hoursMax && hours > parseInt(state.hoursMax, 10)) return false;
    }

    if (state.variant) {
      var v = String(ad.phoneVariant || ad.variant || '').toLowerCase();
      var vblob = blob + ' ' + v;
      if (state.variant === 'pro-max') {
        if (!/pro\s*max|برو\s*ماكس/.test(vblob)) return false;
      } else if (state.variant === 'pro') {
        if (!/(\bpro\b|برو)/.test(vblob) || /pro\s*max|برو\s*ماكس/.test(vblob)) return false;
      } else if (state.variant === 'plus') {
        if (!/\bplus\b|بلس/.test(vblob)) return false;
      } else if (state.variant === 'ultra') {
        if (!/\bultra\b|ألترا|الترا/.test(vblob)) return false;
      } else if (state.variant === 'base') {
        if (/pro\s*max|برو\s*ماكس|\bpro\b|برو|\bplus\b|بلس|\bultra\b|ألترا/.test(vblob)) return false;
      } else if (v && v !== state.variant) {
        return false;
      }
    }

    if (state.storage) {
      var st = String(ad.storageGb || ad.storage || '');
      var sblob = blob + ' ' + st;
      if (state.storage === '1024') {
        if (!/1\s*t|1024/i.test(sblob)) return false;
      } else if (!(new RegExp(state.storage + '\\s*g', 'i').test(sblob) || st === state.storage)) {
        return false;
      }
    }

    if (state.ram) {
      var ram = ad.ramGb != null ? String(ad.ramGb) : '';
      var rblob = blob + ' ' + ram;
      if (!(new RegExp(state.ram + '\\s*g', 'i').test(rblob) || ram === state.ram)) return false;
    }

    if (state.screenSize) {
      var scr = ad.screenInches != null ? String(ad.screenInches) : '';
      var scblob = blob + ' ' + scr;
      if (state.screenSize === '75') {
        if (!/(75|77|85|86)\s*("|بوصة|pouce|inch)/i.test(scblob) && scr !== '75') return false;
      } else if (!(new RegExp(state.screenSize + '\\s*("|بوصة|pouce|inch)', 'i').test(scblob) || scr === state.screenSize)) {
        return false;
      }
    }

    if (state.cameraType) {
      var camMap = {
        dslr: /dslr|عاكسة|reflex/,
        mirrorless: /mirrorless|بدون مرآة|hybride/,
        action: /أكشن|action|gopro/,
        drone: /درون|drone/,
        security: /مراقبة|surveillance|كاميرا أمن/
      };
      if (!matchChipMap(state.cameraType, blob, camMap, ad.cameraType)) return false;
    }

    if (state.networkType) {
      var netMap = {
        router: /راوتر|routeur|router|wifi/,
        mesh: /مش|mesh/,
        switch: /سويتش|switch/,
        modem: /مودم|modem/
      };
      if (!matchChipMap(state.networkType, blob, netMap, ad.networkType)) return false;
    }

    if (state.audioType) {
      var audMap = {
        headphones: /سماعات رأس|casque|headphones/,
        earbuds: /أذن|écouteurs|earbuds|airpods/,
        speaker: /سماعة|enceinte|speaker/,
        soundbar: /ساوند|sound.?bar|barre de son/
      };
      if (!matchChipMap(state.audioType, blob, audMap, ad.audioType)) return false;
    }

    /* —— معدات منزل —— */
    if (state.fridgeType) {
      var frMap = {
        fridge: /ثلاجة|réfrig|fridge/,
        freezer: /فريزر|مجمد|congel|freezer/,
        combi: /كومبي|combiné|combi/,
        side: /بابين متقابل|side.?by.?side|américain/
      };
      if (!matchChipMap(state.fridgeType, blob, frMap, ad.fridgeType)) return false;
    }
    if (state.capacityL) {
      var liters = ad.capacityL != null ? Number(ad.capacityL) : parseNumberFromBlob(blob, [/(\d+)\s*لتر/, /(\d+)\s*l\b/i, /(\d+)\s*litre/i]);
      if (liters == null || !inRangeChip(liters, state.capacityL)) return false;
    }
    if (state.fridgeFeat) {
      var ffMap = {
        nofrost: /no\s*frost|نوفروست|بدون صقيع/,
        inverter: /إنفرتر|انفرتر|inverter/,
        manual: /عادي|standard|manual.?defrost/
      };
      if (!matchChipMap(state.fridgeFeat, blob, ffMap, ad.fridgeFeat)) return false;
    }
    if (state.washerType) {
      var wMap = {
        washer: /غسالة|lave.?linge|washing/,
        dryer: /مجفف(?! شعر)|sèche.?linge|dryer/,
        combo: /غسالة مجفف|séchant|washer.?dryer/,
        front: /أمامية|hublot|front.?load/,
        top: /علوية|ouverture dessus|top.?load/
      };
      if (!matchChipMap(state.washerType, blob, wMap, ad.washerType)) return false;
    }
    if (state.washLoad) {
      var load = ad.washKg != null ? Number(ad.washKg) : parseNumberFromBlob(blob, [/(\d+(?:\.\d+)?)\s*كغ/, /(\d+(?:\.\d+)?)\s*kg/i]);
      if (load == null || !inRangeChip(load, state.washLoad)) return false;
    }
    if (state.acType) {
      var acMap = {
        split: /سبليت|split/,
        window: /شباك|fenêtre|window/,
        portable: /محمول|mobile|portable/,
        central: /مركزي|central/
      };
      if (!matchChipMap(state.acType, blob, acMap, ad.acType)) return false;
    }
    if (state.acPower) {
      var tonsAc = ad.acTons != null ? Number(ad.acTons) : null;
      if (tonsAc == null) {
        var btu = parseNumberFromBlob(blob, [/(\d+)\s*btu/i, /(\d+)\s*وحدة/]);
        if (btu != null) tonsAc = btu / 12000;
        else tonsAc = parseNumberFromBlob(blob, [/(\d+(?:\.\d+)?)\s*طن/, /(\d+(?:\.\d+)?)\s*ton/i]);
      }
      if (tonsAc == null) return false;
      var want = parseFloat(state.acPower);
      if (Math.abs(tonsAc - want) > 0.35 && !(state.acPower === '2.5' && tonsAc >= 2.4)) return false;
    }
    if (state.cookFuel) {
      var cfMap = {
        gas: /غاز|gaz|gas/,
        electric: /كهرب|électri|electric/,
        mixed: /مختلط|mixte|mixed|غاز.?وكهرب/
      };
      if (!matchChipMap(state.cookFuel, blob, cfMap, ad.cookFuel)) return false;
    }
    if (state.cookType) {
      var ctMap = {
        oven: /فرن|four|oven/,
        cooktop: /موقد|plaque|cooktop|طاولة طبخ/,
        stove: /طباخ|cuisinière|stove/,
        microwave: /مايكرو|micro.?ondes|microwave/,
        airfryer: /قلاية هوائية|air\s*fryer|friteuse/
      };
      if (!matchChipMap(state.cookType, blob, ctMap, ad.cookType)) return false;
    }
    if (state.heaterCap) {
      var hL = ad.heaterL != null ? Number(ad.heaterL) : parseNumberFromBlob(blob, [/(\d+)\s*لتر/, /(\d+)\s*l\b/i]);
      if (hL == null || !inRangeChip(hL, state.heaterCap)) return false;
    }
    if (state.kitchenType) {
      var ktMap = {
        blender: /خلاط|mixeur|blender/,
        mixer: /عجان|batteur|pétrin|mixer/,
        processor: /محضّر|محضر|robot|processor/,
        coffee: /قهوة|café|coffee|nespresso/,
        kettle: /غلاية|bouilloire|kettle/,
        airfryer: /قلاية هوائية|air\s*fryer/
      };
      if (!matchChipMap(state.kitchenType, blob, ktMap, ad.kitchenType)) return false;
    }
    if (state.ironType) {
      var irMap = {
        steam: /بخار|vapeur|steam/,
        dry: /جافة|sec|dry/,
        station: /محطة بخار|centrale|station/,
        garment: /عمودي|défroisseur|garment/
      };
      if (!matchChipMap(state.ironType, blob, irMap, ad.ironType)) return false;
    }
    if (state.vacType) {
      var vtMap = {
        upright: /عمود|balai|upright|stick/,
        canister: /أسطوان|traîneau|canister|cylinder/,
        robot: /روبوت|robot|roborock|conga/,
        handheld: /يدوي|à main|handheld/,
        wet: /غسيل وشفط|eau et poussière|wet/
      };
      if (!matchChipMap(state.vacType, blob, vtMap, ad.vacType)) return false;
    }
    if (state.vacPower) {
      var vpMap = {
        corded: /بسلك|filaire|corded|سلكي/,
        cordless: /بدون سلك|sans fil|cordless|لاسلكي/
      };
      if (!matchChipMap(state.vacPower, blob, vpMap, ad.vacPower)) return false;
    }
    if (state.waterType) {
      var wtMap = {
        ro: /تحلية|osmose|ro\b|100\s*gpd/,
        uv: /uv|أشعة/,
        carbon: /كربون|charbon|carbon/,
        dispenser: /موزع|fontaine|dispenser/,
        stages: /7\s*مراحل|7\s*étapes|7.?stage/
      };
      if (!matchChipMap(state.waterType, blob, wtMap, ad.waterType)) return false;
    }
    if (state.careType) {
      var careMap = {
        dryer: /مجفف شعر|sèche.?cheveux|hair.?dryer/,
        straightener: /مملس|lisseur|straightener/,
        curler: /تجعيد|boucleur|curler/,
        trimmer: /حلاقة|tondeuse|trimmer/,
        epilator: /مزيل شعر|épilat/
      };
      if (!matchChipMap(state.careType, blob, careMap, ad.careType)) return false;
    }
    if (state.partsKind) {
      var pkMap = {
        motor: /محرك|moteur|motor|compressor/,
        board: /لوحة|carte|board|pcb/,
        seal: /مطاط|مانع|joint|seal|gasket/,
        filter: /فلتر|filtre|filter/,
        other: /.*/
      };
      if (state.partsKind !== 'other' && !matchChipMap(state.partsKind, blob, pkMap, ad.partsKind)) return false;
    }
    if (state.serviceKind) {
      var skMap = {
        install: /تركيب|installation|install/,
        repair: /إصلاح|réparation|repair/,
        maintain: /صيانة|entretien|maintenance/,
        gas: /غاز|gaz|recharge/
      };
      if (!matchChipMap(state.serviceKind, blob, skMap, ad.serviceKind)) return false;
    }

    /* —— أثاث / بناء / طاقة / أخرى —— */
    if (state.furnMaterial) {
      var fmMap = {
        wood: /خشب|bois|wood/,
        mdf: /mdf/,
        metal: /معدن|métal|metal|حديد/,
        fabric: /قماش|tissu|fabric/,
        leather: /جلد|cuir|leather/,
        glass: /زجاج|verre|glass/
      };
      if (!matchChipMap(state.furnMaterial, blob, fmMap, ad.furnMaterial)) return false;
    }
    if (state.furnStyle) {
      var fsMap = {
        modern: /عصري|moderne|modern/,
        classic: /كلاسيكي|classique|classic/,
        traditional: /تقليدي|traditionnel/,
        office: /مكتبي|bureau|office/
      };
      if (!matchChipMap(state.furnStyle, blob, fsMap, ad.furnStyle)) return false;
    }
    if (state.mattressSize) {
      var msMap = {
        single: /فردي|simple|single|90/,
        double: /مزدوج|double|140/,
        queen: /كوين|queen|160/,
        king: /كينغ|king|180|200/
      };
      if (!matchChipMap(state.mattressSize, blob, msMap, ad.mattressSize)) return false;
    }
    if (state.buildUnit) {
      var buMap = {
        ton: /طن|tonne|ton/,
        bag: /كيس|sac|bag/,
        piece: /قطعة|pièce|piece/,
        meter: /متر|mètre|meter|م\b/,
        set: /طقم|lot|set/
      };
      if (!matchChipMap(state.buildUnit, blob, buMap, ad.buildUnit)) return false;
    }
    if (state.buildUse) {
      var busMap = {
        structure: /هيكل|structure|أسمنت|حديد/,
        finish: /تشطيب|finition|دهان|سيراميك/,
        plumbing: /سباكة|plomberie/,
        electric: /كهرباء|électricité/,
        tools: /أدوات|outils|tools/
      };
      if (!matchChipMap(state.buildUse, blob, busMap, ad.buildUse)) return false;
    }
    if (state.energyKind) {
      var ekMap = {
        solar: /شمسي|solaire|solar|لوح/,
        generator: /مولد|groupe|generator/,
        ups: /ups|احتياط|secours/,
        inverter: /انفرتر|إنفرتر|onduleur|inverter/,
        kit: /نظام جاهز|kit|طقم طاقة/
      };
      if (!matchChipMap(state.energyKind, blob, ekMap, ad.energyKind)) return false;
    }
    if (state.panelWatt) {
      var pw = ad.panelWatt != null ? Number(ad.panelWatt) : parseNumberFromBlob(blob, [/(\d+)\s*واط/, /(\d+)\s*w\b/i]);
      if (pw == null || !inRangeChip(pw, state.panelWatt)) return false;
    }
    if (state.batteryAh) {
      var ah = ad.batteryAh != null ? Number(ad.batteryAh) : parseNumberFromBlob(blob, [/(\d+)\s*ah/i, /(\d+)\s*أمبير/]);
      if (ah == null || !inRangeChip(ah, state.batteryAh)) return false;
    }
    if (state.genKva) {
      var kva = ad.genKva != null ? Number(ad.genKva) : parseNumberFromBlob(blob, [/(\d+(?:\.\d+)?)\s*kva/i, /(\d+(?:\.\d+)?)\s*كيلو/]);
      if (kva == null || !inRangeChip(kva, state.genKva)) return false;
    }
    if (state.inverterKw) {
      var ikw = ad.inverterKw != null ? Number(ad.inverterKw) : parseNumberFromBlob(blob, [/(\d+(?:\.\d+)?)\s*كيلوواط/, /(\d+(?:\.\d+)?)\s*kw/i]);
      if (ikw == null || !inRangeChip(ikw, state.inverterKw)) return false;
    }
    if (state.machineKind) {
      var mkMap = {
        bakery: /مخبز|boulangerie|عجان|خبز/,
        cold: /تبريد|ثلج|froid|غرفة تبريد|فريزر تجاري/,
        pack: /تعبئة|emballage|باركود|ميزان/,
        laundry: /غسيل صناعي|blanchisserie|مغاسل|سجاد/,
        workshop: /ورش|atelier|خياطة صناعية|طباعة/
      };
      if (!matchChipMap(state.machineKind, blob, mkMap, ad.machineKind)) return false;
    }
    if (state.insureKind) {
      var ikMap = {
        third: /طرف ثالث|tiers/,
        full: /شامل|tous risques|full/,
        fleet: /أسطول|flotte|fleet/,
        renewal: /تجديد|renouvel/
      };
      if (!matchChipMap(state.insureKind, blob, ikMap, ad.insureKind)) return false;
    }
    if (state.insureVehicle) {
      var ivMap = {
        car: /سيارة|voiture|particulier/,
        truck: /شاحنة|camion/,
        moto: /دراجة|moto/,
        heavy: /معدات ثقيلة|engin|آلات/
      };
      if (!matchChipMap(state.insureVehicle, blob, ivMap, ad.insureVehicle)) return false;
    }

    if (state.size) {
      var sz = String(ad.size || '').toLowerCase();
      var szblob = blob + ' ' + sz;
      if (sz !== state.size && szblob.indexOf(String(state.size).toLowerCase()) < 0
        && !new RegExp('مقاس\\s*' + state.size + '|pointure\\s*' + state.size + '|taille\\s*' + state.size, 'i').test(szblob)) {
        return false;
      }
    }

    if (state.gender) {
      var gen = String(ad.gender || '').toLowerCase();
      var gMap = {
        men: /رجالي|homme|men|male/,
        women: /نسائي|femme|women|woman/,
        kids: /أطفال|enfant|kids|child/,
        unisex: /للجنسين|unisex/
      };
      if (gMap[state.gender] && !gMap[state.gender].test(blob + ' ' + gen) && gen !== state.gender) return false;
    }
    if (state.clothType) {
      var clMap = {
        traditional: /تقليدي|دراعة|ملحفة|traditionnel/,
        casual: /يومي|casual/,
        formal: /رسمي|formel|formal/,
        sport: /رياضي|sport/,
        shoes: /أحذية|chaussures|shoes/,
        bag: /حقائب|sacs|bags/
      };
      if (!matchChipMap(state.clothType, blob, clMap, ad.clothType)) return false;
    }

    if (state.karat) {
      var kblob = blob + ' ' + String(ad.karat || '');
      if (!(new RegExp('عيار\\s*' + state.karat + '|' + state.karat + '\\s*carat', 'i').test(kblob)
        || String(ad.karat) === state.karat)) return false;
    }

    if (state.weightMin || state.weightMax) {
      var w = ad.weightGrams != null ? Number(ad.weightGrams) : null;
      if (w == null) {
        var wm = blob.match(/(\d+)\s*غ/);
        w = wm ? parseFloat(wm[1]) : null;
      }
      if (w == null) return false;
      if (state.weightMin && w < parseFloat(state.weightMin)) return false;
      if (state.weightMax && w > parseFloat(state.weightMax)) return false;
    }
    if (state.jewelType) {
      var jMap = {
        bracelet: /سوار|bracelet|خلاخيل/,
        ring: /خاتم|bague|ring/,
        necklace: /عقد|collier|قلادة/,
        earring: /أقراط|boucles|حلق/,
        set: /طقم|parure|set/,
        bar: /سبيكة|lingot|bar/
      };
      if (!matchChipMap(state.jewelType, blob, jMap, ad.jewelType)) return false;
    }

    if (state.furnish) {
      var fMap = {
        furnished: /مفروش|meublé|furnished/,
        semi: /نصف مفروش|semi/,
        empty: /فارغ|vide|empty|غير مفروش/
      };
      if (fMap[state.furnish] && !fMap[state.furnish].test(blob)) return false;
    }
    if (state.areaMin || state.areaMax) {
      var area = ad.areaM2 != null ? Number(ad.areaM2) : parseNumberFromBlob(blob, [/(\d+)\s*م²/, /(\d+)\s*m²/i, /(\d+)\s*متر/]);
      if (area == null) return false;
      if (state.areaMin && area < parseFloat(state.areaMin)) return false;
      if (state.areaMax && area > parseFloat(state.areaMax)) return false;
    }
    if (state.dealType) {
      var dMap = {
        sale: /للبيع|à vendre|vente|بيع/,
        rent: /للكراء|location|كراء|إيجار/,
        daily: /يومي|journalier|سياحي/,
        invest: /استثمار|investissement/
      };
      if (!matchChipMap(state.dealType, blob, dMap, ad.dealType)) return false;
    }

    if (state.foodForm) {
      var ff = String(ad.foodForm || '').toLowerCase();
      var ffMap = {
        fresh: /طازج|frais|fresh/,
        canned: /معلب|conserve|canned/,
        frozen: /مجمّد|مجمد|surgel|frozen/,
        dry: /جاف|sec|dry/
      };
      if (ffMap[state.foodForm] && !ffMap[state.foodForm].test(blob + ' ' + ff) && ff !== state.foodForm) return false;
    }

    if (state.foodUnit) {
      var fu = String(ad.foodUnit || '').toLowerCase();
      var fuMap = {
        kg: /كيلو|kg|كغ/,
        piece: /قطعة|pièce|piece/,
        pack: /عبوة|paquet|pack/,
        box: /صندوق|caisse|box/
      };
      if (fuMap[state.foodUnit] && !fuMap[state.foodUnit].test(blob + ' ' + fu) && fu !== state.foodUnit) return false;
    }

    if (state.countMin || state.countMax) {
      var cnt = ad.headCount != null ? Number(ad.headCount) : null;
      if (cnt == null) {
        var cm = blob.match(/(\d+)\s*(رأس|رؤوس)/);
        cnt = cm ? parseInt(cm[1], 10) : null;
      }
      if (cnt == null) return false;
      if (state.countMin && cnt < parseInt(state.countMin, 10)) return false;
      if (state.countMax && cnt > parseInt(state.countMax, 10)) return false;
    }
    if (state.animalSex) {
      var asMap = {
        male: /ذكر|mâle|male/,
        female: /أنثى|femelle|female/,
        mixed: /مختلط|mixte|mixed/
      };
      if (!matchChipMap(state.animalSex, blob, asMap, ad.animalSex)) return false;
    }
    if (state.vetKind) {
      var vkMap = {
        clinic: /عيادة|clinique/,
        meds: /أدوية|médicament/,
        vaccine: /تطعيم|vaccin/,
        feed: /أعلاف|aliments|feed/
      };
      if (!matchChipMap(state.vetKind, blob, vkMap, ad.vetKind)) return false;
    }
    if (state.healthKind) {
      var hkMap = {
        meds: /أدوية|مكملات|médicament/,
        device: /جهاز طبي|médical|device/,
        beauty: /تجميل|beauté|beauty/,
        natural: /طبيعي|أعشاب|naturel/,
        clinic: /عيادة|صيدلية|clinique|pharmacie/
      };
      if (!matchChipMap(state.healthKind, blob, hkMap, ad.healthKind)) return false;
    }
    if (state.beautyKind) {
      var bkMap = {
        perfume: /عطر|parfum/,
        cream: /كريم|crème/,
        hair: /شعر|cheveux|hair/,
        device: /جهاز عناية|appareil soin/,
        optics: /نظارات|optique|lunettes/
      };
      if (!matchChipMap(state.beautyKind, blob, bkMap, ad.beautyKind)) return false;
    }
    if (state.tripKind) {
      var tkMap = {
        tour: /رحلة|circuit|tour/,
        hotel: /فندق|hôtel|hotel/,
        ticket: /تذكرة|billet|ticket/,
        visa: /تأشيرة|visa/,
        gear: /مستلزمات|équipement|حقيبة|تخييم/,
        rentcar: /تأجير سيارة|location voiture/
      };
      if (!matchChipMap(state.tripKind, blob, tkMap, ad.tripKind)) return false;
    }
    if (state.tripDuration) {
      var days = ad.tripDays != null ? Number(ad.tripDays) : parseNumberFromBlob(blob, [/(\d+)\s*يوم/, /(\d+)\s*jours?/i]);
      if (days == null) {
        if (state.tripDuration === '1' && !/يوم واحد|1\s*jour/.test(blob)) return false;
        else if (state.tripDuration !== '1') return false;
      } else if (!inRangeChip(days, state.tripDuration === '1' ? '1-1' : state.tripDuration)) {
        return false;
      }
    }
    if (state.serviceArea) {
      var saMap = {
        home: /منزلي|domicile|home/,
        shop: /في المحل|atelier|shop/,
        remote: /عن بُعد|عن بعد|à distance|remote/,
        onsite: /في الموقع|sur site|onsite/
      };
      if (!matchChipMap(state.serviceArea, blob, saMap, ad.serviceArea)) return false;
    }
    if (state.serviceUrgency) {
      var suMap = {
        same: /نفس اليوم|jour même|urgent/,
        week: /خلال أسبوع|sous une semaine/,
        flex: /مرن|flexible/
      };
      if (!matchChipMap(state.serviceUrgency, blob, suMap, ad.serviceUrgency)) return false;
    }
    if (state.jobType) {
      var jtMap = {
        full: /دوام كامل|temps plein|full.?time/,
        part: /جزئي|temps partiel|part.?time/,
        freelance: /حر|freelance|فريلانس/,
        intern: /تدريب|stage|intern/,
        seek: /أبحث عن عمل|je cherche/
      };
      if (!matchChipMap(state.jobType, blob, jtMap, ad.jobType)) return false;
    }
    if (state.jobExp) {
      var exp = ad.yearsExp != null ? Number(ad.yearsExp) : parseNumberFromBlob(blob, [/(\d+)\s*سنة/, /(\d+)\s*ans?/i]);
      if (exp == null) {
        if (state.jobExp === '0-1' && !/مبتدئ|débutant/.test(blob)) return false;
        else if (state.jobExp !== '0-1') return false;
      } else if (!inRangeChip(exp, state.jobExp)) {
        return false;
      }
    }
    if (state.tradeKind) {
      var trMap = {
        wholesale: /جملة|gros|wholesale/,
        retail: /تجزئة|détail|retail/,
        import: /استيراد|تصدير|import|export/,
        equip: /معدات|équipement/,
        invest: /شراكة|استثمار|partenariat/
      };
      if (!matchChipMap(state.tradeKind, blob, trMap, ad.tradeKind)) return false;
    }
    if (state.tradeUnit) {
      var tuMap = {
        piece: /قطعة|pièce/,
        carton: /كرتون|carton/,
        pallet: /طبلية|palette/,
        container: /حاوية|conteneur|container/
      };
      if (!matchChipMap(state.tradeUnit, blob, tuMap, ad.tradeUnit)) return false;
    }
    if (state.sportKind) {
      var spMap = {
        gear: /معدات|équipement/,
        bike: /دراجة|vélo|bike/,
        fitness: /لياقة|fitness|صالة/,
        games: /ألعاب فيديو|jeux vidéo|playstation|xbox/,
        music: /موسيقى|musique|آلة/,
        hobby: /هوايات|loisirs|تحف/
      };
      if (!matchChipMap(state.sportKind, blob, spMap, ad.sportKind)) return false;
    }
    if (state.bikeSize) {
      var bsMap = {
        s: /\b(s|صغير|small)\b/,
        m: /\b(m|وسط|medium)\b/,
        l: /\b(l|كبير|large)\b/,
        xl: /\b(xl|كبير جدا)\b/
      };
      if (!matchChipMap(state.bikeSize, blob, bsMap, ad.bikeSize)) return false;
    }
    if (state.eduKind) {
      var edMap = {
        book: /كتب|livres|book/,
        supplies: /أدوات مدرسية|fournitures|قرطاسية/,
        course: /دورة|تدريب|formation/,
        online: /أونلاين|en ligne|online/,
        lang: /لغات|langues|ترجمة/
      };
      if (!matchChipMap(state.eduKind, blob, edMap, ad.eduKind)) return false;
    }
    if (state.eduLevel) {
      var elMap = {
        primary: /ابتدائي|primaire/,
        middle: /إعدادي|collège/,
        high: /ثانوي|lycée/,
        uni: /جامعي|université/,
        pro: /مهني|professionnel/
      };
      if (!matchChipMap(state.eduLevel, blob, elMap, ad.eduLevel)) return false;
    }
    if (state.artKind) {
      var arMap = {
        painting: /لوحة|خط|tableau|calligraphie/,
        photo: /تصوير|photo/,
        craft: /حرف|artisanat/,
        textile: /نسيج|textile|خياطة/,
        pottery: /فخار|poterie|خزف/,
        leather: /جلد|cuir|دباغة/
      };
      if (!matchChipMap(state.artKind, blob, arMap, ad.artKind)) return false;
    }

    return true;
  }

  function syncVisibility(catKey) {
    var profile = profileFor(catKey);
    var brandSec = document.getElementById('brand-filter-section');
    var roomsSec = document.getElementById('rooms-filter-section');
    var condSec = document.getElementById('condition-filter-section');
    var modelSel = document.getElementById('model-select');
    var brandSel = document.getElementById('brand-select');

    if (!catKey) {
      if (brandSec) brandSec.style.display = 'none';
      if (roomsSec) roomsSec.style.display = 'none';
      var mount = document.getElementById('dyn-filters-mount');
      if (mount) { mount.innerHTML = ''; mount.hidden = true; }
      return null;
    }

    if (brandSec) {
      var showBrand = !!(profile && profile.brand);
      if (showBrand && global.RizqBrands && typeof global.RizqBrands.forCategory === 'function') {
        showBrand = global.RizqBrands.forCategory(catKey).length > 0;
      }
      brandSec.style.display = showBrand ? '' : 'none';
    }
    if (modelSel) {
      var showModel = !!(profile && profile.model);
      modelSel.style.display = showModel ? '' : 'none';
      if (brandSel && showModel) {
        /* model already toggled by brand fill */
      }
    }
    if (roomsSec) {
      roomsSec.style.display = (profile && profile.rooms) ? '' : 'none';
    }
    if (condSec && profile && profile.condition === false) {
      condSec.style.display = 'none';
    } else if (condSec && profile && profile.condition !== false) {
      condSec.style.display = '';
    }
    return profile;
  }

  global.RizqDynFilters = {
    profiles: PROFILES,
    profileFor: profileFor,
    render: render,
    readState: readState,
    clearAll: clearAll,
    matches: matches,
    syncVisibility: syncVisibility,
    fieldVisible: fieldVisible,
    adYear: adYear,
    adKm: adKm
  };
})(typeof window !== 'undefined' ? window : this);
