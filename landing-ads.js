// ── LIVE AD CARDS — enriched with full detail ──
const ADS=[
  {id:101,emoji:'🏠',bg:'linear-gradient(135deg,#1B3A6B,#0f2347)',cat:'🏠 عقارات',catKey:'عقارات',title:'شقة 3 غرف للكراء — نواكشوط',titleFR:'Appartement 3 pièces à louer — Nouakchott',desc:'تشطيب عالي الجودة، تكييف مركزي، حراسة 24/7، موقف سيارات، إطلالة بانورامية على المدينة.',descFR:'Finition haut de gamme, climatisation centrale, sécurité 24/7, parking, vue panoramique sur la ville.',price:'150,000 MRU/شهر',priceFR:'150,000 MRU/mois',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',pin:true,tags:['3 غرف','مفروشة','طابق 4','مصعد'],tagsFR:['3 pièces','Meublé','4ème étage','Ascenseur'],seller:'محمد الأمين',sellerFR:'Mohamed El Amine',sellerMeta:'★★★★★ — بائع موثّق منذ 2023',sellerMetaFR:'★★★★★ — Vendeur vérifié depuis 2023',sellerEmoji:'🏠',status:'✅ موثّق',statusFR:'✅ Vérifié'},
  {id:102,emoji:'🚗',bg:'linear-gradient(135deg,#234d8f,#1B3A6B)',cat:'🚗 سيارات',catKey:'سيارات',title:'Toyota Hilux 2022 بحالة ممتازة',titleFR:'Toyota Hilux 2022 en excellent état',desc:'سيارة ديزل 4WD، ممشى 45,000 كم فقط، بدون حوادث، صيانة دورية كاملة في الوكيل المعتمد.',descFR:'Véhicule diesel 4x4, seulement 45 000 km, sans accident, entretien régulier complet chez le concessionnaire agréé.',price:'8,000,000 MRU',loc:'📍 نواذيبو',locFR:'📍 Nouadhibou',tags:['2022','ديزل','4WD','45K كم'],tagsFR:['2022','Diesel','4x4','45K km'],seller:'عبد الله محمد',sellerFR:'Abdallah Mohamed',sellerMeta:'★★★★☆ — تاجر معتمد',sellerMetaFR:'★★★★☆ — Commerçant agréé',sellerEmoji:'🚗',status:'✅ موثّق',statusFR:'✅ Vérifié'},
  {id:123,emoji:'🚗',bg:'linear-gradient(135deg,#1B3A6B,#0f2347)',cat:'🚗 سيارات — سيارات للبيع',catKey:'سيارات',title:'تويوتا كامري 2021 — سيدان عائلية',titleFR:'Toyota Camry 2021 — berline familiale',desc:'كامري سيدان بحالة ممتازة، بنزين، صيانة دورية، مناسبة للعائلة.',descFR:'Camry berline en excellent état, essence, entretien régulier, idéale famille.',price:'4,200,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['سيدان','2021','كامري','عائلي'],tagsFR:['Berline','2021','Camry','Familiale'],seller:'وكالة النجمة',sellerFR:'Agence Najma',sellerMeta:'★★★★★ — موثّق',sellerMetaFR:'★★★★★ — Vérifié',sellerEmoji:'🚗',status:'✅ موثّق',statusFR:'✅ Vérifié'},
  {id:124,emoji:'🚙',bg:'linear-gradient(135deg,#0f2347,#234d8f)',cat:'🚗 سيارات — سيارات للبيع',catKey:'سيارات',title:'هيونداي توسان 2022 — SUV',titleFR:'Hyundai Tucson 2022 — SUV',desc:'SUV مريح للطريق الطويل، تكييف، شاشة، حالة وكالة.',descFR:'SUV confortable longue route, clim, écran, état concessionnaire.',price:'5,800,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['SUV','2022','توسان','عائلي'],tagsFR:['SUV','2022','Tucson','Familial'],seller:'أوتو موريتانيا',sellerFR:'Auto Mauritanie',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',sellerEmoji:'🚙',status:'✅ موثّق',statusFR:'✅ Vérifié'},
  {id:103,emoji:'📱',bg:'linear-gradient(135deg,#0f2347,#234d8f)',cat:'📱 إلكترونيات',catKey:'إلكترونيات',title:'iPhone 15 Pro Max 256GB جديد',titleFR:'iPhone 15 Pro Max 256 Go neuf',desc:'جديد لم يُستعمل، مشتراة من دبي، مع ضمان عالمي سنة كاملة، الكرتون والملحقات الأصلية.',descFR:'Neuf jamais utilisé, acheté à Dubaï, garantie internationale d\'un an, boîte et accessoires d\'origine.',price:'380,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['256GB','جديد','ضمان 1 سنة','iPhone 15'],tagsFR:['256 Go','Neuf','Garantie 1 an','iPhone 15'],seller:'عيشة باه',sellerFR:'Aicha Bah',sellerMeta:'★★★★★ — بائعة موثّقة',sellerMetaFR:'★★★★★ — Vendeuse vérifiée',sellerEmoji:'📱',status:'✅ موثّق',statusFR:'✅ Vérifié'},
  {id:104,emoji:'🐪',bg:'linear-gradient(135deg,#162235,#1B3A6B)',cat:'🐄 ماشية',catKey:'ماشية',title:'إبل للبيع — 5 رؤوس أصيلة',titleFR:'Chameaux à vendre — 5 têtes pur-sang',desc:'إبل أصيلة من منطقة أدرار، بصحة ممتازة وشهادة بيطرية، مستعدة للتسليم الفوري.',descFR:'Chameaux pur-sang de la région d\'Adrar, en excellente santé avec certificat vétérinaire, prêts à livrer immédiatement.',price:'1,200,000 MRU',loc:'📍 أدرار',locFR:'📍 Adrar',tags:['5 رؤوس','أصيلة','شهادة بيطرية','أدرار'],tagsFR:['5 têtes','Pur-sang','Certificat vétérinaire','Adrar'],seller:'احمد ولد يحيى',sellerFR:'Ahmed Ould Yahya',sellerMeta:'★★★★☆ — مربّي معتمد',sellerMetaFR:'★★★★☆ — Éleveur agréé',sellerEmoji:'🐪',status:'⏳ قيد المراجعة',statusFR:'⏳ En cours de vérification'},
  {id:105,emoji:'🚛',bg:'linear-gradient(135deg,#0f2347,#162235)',cat:'🚛 شاحنات',catKey:'شاحنات',title:'شاحنة مرسيدس Actros 2020',titleFR:'Camion Mercedes Actros 2020',desc:'شاحنة نقل ثقيل، محرك 500 حصان، جاهزة للعمل الفوري، وثائق كاملة وسجل صيانة متكامل.',descFR:'Camion de transport lourd, moteur 500 chevaux, prêt à l\'emploi immédiat, documents complets et carnet d\'entretien intégral.',price:'18,000,000 MRU',loc:'📍 نواذيبو',locFR:'📍 Nouadhibou',tags:['2020','500 HP','Actros','صيانة كاملة'],tagsFR:['2020','500 ch','Actros','Entretien complet'],seller:'شركة النقل الموريتانية',sellerFR:'Société de Transport Mauritanienne',sellerMeta:'★★★★★ — شركة موثّقة',sellerMetaFR:'★★★★★ — Entreprise vérifiée',sellerEmoji:'🏢',status:'🏢 شركة موثّقة',statusFR:'🏢 Entreprise vérifiée'},
  {id:106,emoji:'🏠',bg:'linear-gradient(135deg,#234d8f,#0f2347)',cat:'🏠 عقارات',catKey:'عقارات',title:'أرض للبيع — نواذيبو',titleFR:'Terrain à vendre — Nouadhibou',desc:'أرض سكنية في موقع استراتيجي، قريبة من الميناء، مساحة 600 متر، وثائق قانونية كاملة.',descFR:'Terrain résidentiel idéalement situé, proche du port, superficie de 600 m², documents légaux complets.',price:'4,500,000 MRU',loc:'📍 نواذيبو',locFR:'📍 Nouadhibou',tags:['600 م²','سكني','وثائق كاملة','قرب الميناء'],tagsFR:['600 m²','Résidentiel','Documents complets','Proche du port'],seller:'سيدي محمد',sellerFR:'Sidi Mohamed',sellerMeta:'★★★★☆ — بائع موثّق',sellerMetaFR:'★★★★☆ — Vendeur vérifié',sellerEmoji:'🏠',status:'✅ موثّق',statusFR:'✅ Vérifié'},
  {id:107,emoji:'👗',bg:'linear-gradient(135deg,#1B3A6B,#162235)',cat:'👗 أزياء',catKey:'أزياء',title:'دراعة موريتانية فاخرة مطرزة',titleFR:'Daraa mauritanienne de luxe brodée',desc:'دراعة رجالية من أفضل أقمشة الجاكار المستورد، تطريز يدوي أصيل، مقاسات متعددة.',descFR:'Daraa pour homme dans le meilleur tissu jacquard importé, broderie artisanale authentique, plusieurs tailles disponibles.',price:'45,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['جاكار','تطريز يدوي','فاخر','مقاسات متعددة'],tagsFR:['Jacquard','Broderie artisanale','Luxe','Plusieurs tailles'],seller:'مرتضى حبيب',sellerFR:'Mortada Habib',sellerMeta:'★★★★★ — خياط محترف',sellerMetaFR:'★★★★★ — Tailleur professionnel',sellerEmoji:'👗',status:'✅ موثّق',statusFR:'✅ Vérifié'},
  {id:111,emoji:'🧕',bg:'linear-gradient(135deg,#6b2d4a,#3d1a2c)',cat:'👗 أزياء',catKey:'أزياء',title:'ملحفة حريرية فاخرة — نقش تقليدي',titleFR:'Melhfa en soie de luxe — motif traditionnel',desc:'ملحفة نسائية من الحرير الناعم، ألوان زاهية ونقش موريتاني أصيل، مثالية للمناسبات.',descFR:'Melhfa femme en soie douce, couleurs vives et motif mauritanien authentique, idéale pour les occasions.',price:'38,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['حرير','نسائي','نقش تقليدي','مناسبات'],tagsFR:['Soie','Femme','Motif traditionnel','Occasions'],seller:'ورشة الأناقة',sellerFR:'Atelier Élégance',sellerMeta:'★★★★★ — خياطة موثّقة',sellerMetaFR:'★★★★★ — Couturière vérifiée',sellerEmoji:'🧕',status:'✅ موثّق',statusFR:'✅ Vérifié'},
  {id:112,emoji:'💍',bg:'linear-gradient(135deg,#7a4a00,#3a2200)',cat:'🪙 ذهب ومجوهرات',catKey:'ذهب',title:'أسورة ذهب عيار 21 — تصميم نسائي',titleFR:'Bracelet or 21 carats — design femme',desc:'أسورة ذهب نسائية عيار 21، وزن 12 غرام، تصميم أنيق مع شهادة أصالة.',descFR:'Bracelet femme en or 21 carats, 12g, design élégant avec certificat d\'authenticité.',price:'110,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['21 عيار','نسائي','12 غرام','شهادة'],tagsFR:['21 carats','Femme','12g','Certificat'],seller:'ورشة الذهب الموريتانية',sellerFR:'Atelier Or Mauritanien',sellerMeta:'★★★★★ — موثّق',sellerMetaFR:'★★★★★ — Vérifié',sellerEmoji:'💍',status:'✅ موثّق',statusFR:'✅ Vérifié'},
  {id:108,emoji:'🔧',bg:'linear-gradient(135deg,#162235,#234d8f)',cat:'🔧 خدمات',catKey:'خدمات',title:'مهندس كهرباء — خدمة منزلية',titleFR:'Ingénieur électricien — service à domicile',desc:'خبرة 10 سنوات في الكهرباء المنزلية والصناعية، شبكات شمسية، تمديدات وصيانة فورية.',descFR:'10 ans d\'expérience en électricité domestique et industrielle, installations solaires, câblage et maintenance rapide.',price:'تواصل للسعر',priceFR:'Contacter pour le prix',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['كهرباء','طاقة شمسية','10 سنوات خبرة','متاح 24/7'],tagsFR:['Électricité','Énergie solaire','10 ans d\'expérience','Disponible 24/7'],seller:'سليمان بكار',sellerFR:'Souleymane Bakar',sellerMeta:'★★★★☆ — حرفي موثّق',sellerMetaFR:'★★★★☆ — Artisan vérifié',sellerEmoji:'🔧',status:'✅ موثّق',statusFR:'✅ Vérifié'},
  {id:109,emoji:'🐄',bg:'linear-gradient(135deg,#0f2347,#1B3A6B)',cat:'🐄 ماشية',catKey:'ماشية',title:'بقر للبيع — 8 رؤوس بصحة جيدة',titleFR:'Vaches à vendre — 8 têtes en bonne santé',desc:'أبقار لحم وحلوب، محصّنة ضد الأمراض، شهادات بيطرية، جاهزة للتسليم في ترارزة.',descFR:'Vaches à viande et laitières, vaccinées, certificats vétérinaires, prêtes à livrer à Trarza.',price:'960,000 MRU',loc:'📍 ترارزة',locFR:'📍 Trarza',tags:['8 رؤوس','لحم وحلوب','محصّنة','ترارزة'],tagsFR:['8 têtes','Viande & lait','Vaccinées','Trarza'],seller:'محفوظ بربر',sellerFR:'Mahfoudh Berbar',sellerMeta:'★★★☆☆ — مزارع',sellerMetaFR:'★★★☆☆ — Agriculteur',sellerEmoji:'🐄',status:'⏳ قيد المراجعة',statusFR:'⏳ En cours de vérification'},
  {id:110,emoji:'🧱',bg:'linear-gradient(135deg,#1B3A6B,#0f2347)',cat:'🧱 بناء',catKey:'بناء',title:'ألواح شمسية 300W — مستعملة',titleFR:'Panneaux solaires 300W — occasion',desc:'10 ألواح شمسية 300W بحالة جيدة، استُعملت 2 سنة فقط، مع متحكم شحن MPPT 40A.',descFR:'10 panneaux solaires 300W en bon état, utilisés seulement 2 ans, avec régulateur de charge MPPT 40A.',price:'85,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['300W','10 ألواح','MPPT 40A','2 سنوات'],tagsFR:['300W','10 panneaux','MPPT 40A','2 ans'],seller:'تقنيات الطاقة',sellerFR:'Technologies de l\'Énergie',sellerMeta:'★★★★☆ — شركة موثّقة',sellerMetaFR:'★★★★☆ — Entreprise vérifiée',sellerEmoji:'🏢',status:'✅ موثّق',statusFR:'✅ Vérifié'},
];

// Full FEATURED ADS data for openAdModal
const FEATURED_ADS=[
  {id:201,emoji:'🏠',bg:'linear-gradient(135deg,#1B3A6B,#0f2347)',cat:'🏠 منازل وعقارات — شقق للكراء',catKey:'عقارات',title:'شقة فاخرة 3 غرف — نواكشوط الغربية',titleFR:'Appartement de luxe 3 pièces — Nouakchott Ouest',desc:'تشطيب عالي الجودة، إطلالة بانورامية على المدينة، تكييف مركزي في كل الغرف، حراسة 24/7، موقف سيارات خاص. قريبة من المراكز التجارية الكبرى ومحطات النقل.',descFR:'Finition haut de gamme, vue panoramique sur la ville, climatisation centrale dans toutes les pièces, sécurité 24/7, parking privé. Proche des grands centres commerciaux et des stations de transport.',price:'150,000 MRU/شهر',priceFR:'150,000 MRU/mois',loc:'📍 نواكشوط الغربية',locFR:'📍 Nouakchott Ouest',tags:['3 غرف','مفروشة جزئياً','طابق 4','مصعد','موقف سيارات','تكييف مركزي'],tagsFR:['3 pièces','Partiellement meublé','4ème étage','Ascenseur','Parking','Climatisation centrale'],seller:'محمد الأمين',sellerFR:'Mohamed El Amine',sellerEmoji:'🏠',sellerMeta:'★★★★★ بائع موثّق منذ 2023',sellerMetaFR:'★★★★★ Vendeur vérifié depuis 2023',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:true},
  {id:202,emoji:'🚛',bg:'linear-gradient(135deg,#234d8f,#1B3A6B)',cat:'🚛 شاحنات ومعدات — للبيع',catKey:'شاحنات',title:'حفارة Caterpillar 320D — بحالة ممتازة',titleFR:'Pelleteuse Caterpillar 320D — excellent état',desc:'ساعات عمل منخفضة جداً (3200 ساعة فقط)، جاهزة للتسليم الفوري مع ضمان ستة أشهر على قطع الغيار الرئيسية. مستوردة مباشرة، وثائق الجمارك والتسجيل متوفرة.',descFR:'Très peu d\'heures d\'utilisation (3200 heures seulement), prête à livrer immédiatement avec garantie de six mois sur les pièces principales. Importée directement, documents de douane et d\'immatriculation disponibles.',price:'35,000,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['3200 ساعة','ضمان 6 أشهر','وثائق كاملة','Caterpillar'],tagsFR:['3200 heures','Garantie 6 mois','Documents complets','Caterpillar'],seller:'شركة المعدات الموريتانية',sellerFR:'Société d\'Équipements Mauritanienne',sellerEmoji:'🏢',sellerMeta:'★★★★☆ شركة موثّقة',sellerMetaFR:'★★★★☆ Entreprise vérifiée',status:'🏢 شركة موثّقة',statusFR:'🏢 Entreprise vérifiée',pin:false},
  {id:203,emoji:'🐪',bg:'linear-gradient(135deg,#0f2347,#162235)',cat:'🐄 ماشية وحيوانات — إبل',catKey:'ماشية',title:'إبل للبيع — 10 رؤوس أصيلة من أدرار',titleFR:'Chameaux à vendre — 10 têtes pur-sang d\'Adrar',desc:'من منطقة أدرار الشهيرة بجودة إبلها الأصيلة. أصيلة وبصحة ممتازة، مستعدة للفحص البيطري في أي وقت. السعر 240,000 MRU للرأس الواحد أو تفاوض على الجملة.',descFR:'De la région d\'Adrar, réputée pour la qualité de ses chameaux pur-sang. En excellente santé, prêts pour un contrôle vétérinaire à tout moment. Prix : 240 000 MRU par tête, ou négociable en gros.',price:'2,400,000 MRU',loc:'📍 أدرار',locFR:'📍 Adrar',tags:['10 رؤوس','أصيلة','أدرار','قابل للتفاوض'],tagsFR:['10 têtes','Pur-sang','Adrar','Négociable'],seller:'احمد ولد أمبارك',sellerFR:'Ahmed Ould Embarek',sellerEmoji:'🐪',sellerMeta:'★★★☆☆ مربّي',sellerMetaFR:'★★★☆☆ Éleveur',status:'⏳ قيد المراجعة',statusFR:'⏳ En cours de vérification',pin:false},
  {id:204,emoji:'🥇',bg:'linear-gradient(135deg,#3a2200,#7a4a00)',cat:'🪙 ذهب ومجوهرات — ذهب للبيع',catKey:'ذهب',title:'ذهب عيار 21 — 50 غرام — جمالية نادرة',titleFR:'Or 21 carats — 50g — pièce rare',desc:'ذهب أصيل عيار 21 بالوثائق. فصلة من الذهب السوداني الأصيل، حلقات وأساور بتشكيلة حصرية. الوزن: 50 غرام صافي.',descFR:'Or authentique 21 carats avec documents. Parure en or soudanais, bracelets et bagues collection exclusive. Poids : 50g net.',price:'450,000 MRU',priceFR:'450,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['21 عيار','50 غرام','وثائق','سوداني'],tagsFR:['21 carats','50g','Documents','Soudanais'],seller:'ورشة الذهب الموريتانية',sellerFR:'Atelier Or Mauritanien',sellerEmoji:'🥇',sellerMeta:'★★★★★ موثّق',sellerMetaFR:'★★★★★ Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:true},
  {id:205,emoji:'📱',bg:'linear-gradient(135deg,#0d1b2e,#1a3a5c)',cat:'📱 إلكترونيات — هواتف ذكية',catKey:'إلكترونيات',title:'iPhone 15 Pro Max 256GB — كالجديد',titleFR:'iPhone 15 Pro Max 256 Go — comme neuf',desc:'هاتف بحالة ممتازة، لا خدوش، بكل ملحقاته الأصلية وعلبته. ضمان Apple Care متبقي 8 أشهر.',descFR:'Appareil en parfait état, sans rayures, avec tous les accessoires d\'origine et la boîte. Apple Care encore valable 8 mois.',price:'180,000 MRU',priceFR:'180,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['256GB','كالجديد','ضمان','أصلي'],tagsFR:['256 Go','Comme neuf','Garantie','Authentique'],seller:'تقني موبايل',sellerFR:'Tech Mobile MR',sellerEmoji:'📱',sellerMeta:'★★★★☆ موثّق',sellerMetaFR:'★★★★☆ Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:206,emoji:'🏡',bg:'linear-gradient(135deg,#0b1e35,#1e3d6a)',cat:'🏠 منازل وعقارات — منازل للبيع',catKey:'عقارات',title:'فيلا راقية — 5 غرف — كيفة',titleFR:'Villa de standing — 5 chambres — Kiffa',desc:'فيلا فاخرة في حي راقي، 5 غرف نوم، صالتان، حديقة خاصة، ملحق خادمة. بناء حديث 2022. وثائق عقارية سليمة.',descFR:'Villa luxueuse dans un quartier résidentiel calme, 5 chambres, 2 salons, jardin privé, dépendance. Construction 2022. Documents en règle.',price:'4,800,000 MRU',priceFR:'4,800,000 MRU',loc:'📍 كيفة',locFR:'📍 Kiffa',tags:['5 غرف','حديقة','2022','وثائق'],tagsFR:['5 chambres','Jardin','2022','Documents'],seller:'عمار الأمين',sellerFR:'Ammar El Amine',sellerEmoji:'🏡',sellerMeta:'★★★★★ موثّق',sellerMetaFR:'★★★★★ Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:207,emoji:'🚗',bg:'linear-gradient(135deg,#0e1d2e,#1d3a5e)',cat:'🚗 سيارات — سيارات للبيع',catKey:'سيارات',title:'Toyota Land Cruiser 2020 — خليجي',titleFR:'Toyota Land Cruiser 2020 — Import Golfe',desc:'لاندكروزر 2020 خليجي أصيل، مسافة 48,000 كم. لون أبيض لؤلؤي، تجهيز فل كامل، فتحة سقف. الوثائق الجمركية والتسجيل متوفرة.',descFR:'Land Cruiser 2020 import Golfe authentique, 48 000 km. Blanc nacré, full options, toit ouvrant. Documents douane et immatriculation disponibles.',price:'9,500,000 MRU',priceFR:'9,500,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['48,000 km','خليجي','فل كامل','2020'],tagsFR:['48 000 km','Import Golfe','Full options','2020'],seller:'وكالة السيارات الأولى',sellerFR:'Première Auto MR',sellerEmoji:'🚗',sellerMeta:'★★★★★ موثّق',sellerMetaFR:'★★★★★ Vérifié',status:'🏢 شركة موثّقة',statusFR:'🏢 Entreprise vérifiée',pin:true},
  {id:208,emoji:'🌍',bg:'linear-gradient(135deg,#163012,#2a5a20)',cat:'🏠 منازل وعقارات — أراضي',catKey:'عقارات',title:'أرض سكنية — 600 م² — نواذيبو',titleFR:'Terrain résidentiel — 600 m² — Nouadhibou',desc:'أرض سكنية في موقع استراتيجي قرب المنطقة الاقتصادية. وثيقة ملكية نظيفة، مسوّرة، جاهزة للبناء فوراً.',descFR:'Terrain résidentiel bien situé près de la zone économique. Titre foncier clair, clôturé, prêt à construire immédiatement.',price:'2,200,000 MRU',priceFR:'2,200,000 MRU',loc:'📍 نواذيبو',locFR:'📍 Nouadhibou',tags:['600م²','موقع استراتيجي','وثيقة نظيفة','مسوّرة'],tagsFR:['600m²','Emplacement stratégique','Titre clair','Clôturé'],seller:'الوطنية للعقار',sellerFR:'Nationale Immobilier',sellerEmoji:'🌍',sellerMeta:'★★★★☆ موثّق',sellerMetaFR:'★★★★☆ Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:209,emoji:'🐄',bg:'linear-gradient(135deg,#1a1000,#3d2800)',cat:'🐄 ماشية — بقر للبيع',catKey:'ماشية',title:'بقر حلوب — 8 رؤوس — ترارزة',titleFR:'Vaches laitières — 8 têtes — Trarza',desc:'أبقار حلوب صافية الأصل، إنتاج يومي 15-20 لتر للرأس. مع شهادة صحية بيطرية حديثة. السعر قابل للتفاوض على الجملة.',descFR:'Vaches laitières de race pure, production journalière 15-20L par tête. Avec certificat sanitaire vétérinaire récent. Prix négociable en gros.',price:'960,000 MRU',priceFR:'960,000 MRU',loc:'📍 ترارزة',locFR:'📍 Trarza',tags:['8 رؤوس','حلوب','شهادة بيطرية','قابل للتفاوض'],tagsFR:['8 têtes','Laitière','Certificat vétérinaire','Négociable'],seller:'مزرعة البركة',sellerFR:'Ferme Al Baraka',sellerEmoji:'🐄',sellerMeta:'★★★☆☆ مربّي',sellerMetaFR:'★★★☆☆ Éleveur',status:'⏳ قيد المراجعة',statusFR:'⏳ En cours de vérification',pin:false},
  {id:210,emoji:'🌿',bg:'linear-gradient(135deg,#0d1e12,#1a3d22)',cat:'🔧 خدمات — تصميم وبرمجة',catKey:'خدمات',title:'تصميم مواقع ومتاجر إلكترونية احترافية',titleFR:'Création de sites web et boutiques en ligne professionnels',desc:'متخصص في تصميم مواقع الشركات والمتاجر الإلكترونية. تسليم في 7 أيام، لوحة تحكم سهلة، دعم تقني 30 يوماً.',descFR:'Spécialiste en création de sites vitrines et boutiques e-commerce. Livraison en 7 jours, panneau d\'administration facile, support technique 30 jours.',price:'85,000 MRU',priceFR:'85,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['تسليم 7 أيام','دعم تقني','متجر إلكتروني','موثّق'],tagsFR:['Livraison 7 jours','Support technique','Boutique en ligne','Vérifié'],seller:'محمد ليمام | ADMINIA',sellerFR:'Mohamed Limam | ADMINIA',sellerEmoji:'💻',sellerMeta:'★★★★★ موثّق',sellerMetaFR:'★★★★★ Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:true},
  /* منتجات أناقة لإطلالات رزق — بلاطة لكل منتج عند النقر */
  {id:211,emoji:'👔',bg:'linear-gradient(135deg,#1B3A6B,#0f2347)',cat:'👗 أزياء — دراعة رجالية',catKey:'أزياء',subcat:'دراعة رجالية',gender:'men',title:'دراعة موريتانية فاخرة مطرزة — أزرق سماوي',titleFR:'Daraa mauritanienne brodée — bleu ciel',desc:'دراعة رجالية من قماش فاخر بتطريز يدوي على الصدر، مناسبة للمناسبات والخروج. صورة تجريبية: شارع موريتاني.',descFR:'Daraa homme en tissu premium, broderie artisanale poitrine. Visuel démo : rue mauritanienne.',price:'45,000 MRU',priceFR:'45,000 MRU',loc:'📍 نواكشوط — السوق الكبير',locFR:'📍 Nouakchott — Grand marché',tags:['دراعة','رجالي','تطريز','شارع'],tagsFR:['Daraa','Homme','Broderie','Rue'],seller:'مرتضى حبيب',sellerFR:'Mortada Habib',sellerEmoji:'👔',sellerMeta:'★★★★★ — خياط محترف',sellerMetaFR:'★★★★★ — Tailleur',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:true},
  {id:212,emoji:'⌚',bg:'linear-gradient(135deg,#162235,#1B3A6B)',cat:'👗 أزياء — إكسسوارات',catKey:'أزياء',subcat:'ملابس رجالية',gender:'men',title:'ساعة رجالية كلاسيكية — ستيل',titleFR:'Montre homme classique — acier',desc:'ساعة يد رجالية أنيقة، مقاومة للماء، سوار ستيل قابل للتعديل.',descFR:'Montre homme élégante, étanche, bracelet acier ajustable.',price:'28,000 MRU',priceFR:'28,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['ساعة','رجالي','ستيل','إكسسوار'],tagsFR:['Montre','Homme','Acier','Accessoire'],seller:'ساعة الوقت',sellerFR:'L\'Heure MR',sellerEmoji:'⌚',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:213,emoji:'👟',bg:'linear-gradient(135deg,#0f2347,#234d8f)',cat:'👗 أزياء — أحذية',catKey:'أزياء',subcat:'ملابس رجالية',gender:'men',title:'حذاء رياضي رجالي — مقاس 43',titleFR:'Baskets homme — pointure 43',desc:'حذاء رياضي مريح للمشي اليومي، خفيف ومقاوم، لون أسود/أبيض.',descFR:'Baskets confortables pour le quotidien, légères, noir/blanc.',price:'12,500 MRU',priceFR:'12,500 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['حذاء','رياضي','رجالي','43'],tagsFR:['Chaussure','Sport','Homme','43'],seller:'ستيب موريتانيا',sellerFR:'Step Mauritanie',sellerEmoji:'👟',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:214,emoji:'🩴',bg:'linear-gradient(135deg,#1a2d4d,#0a1324)',cat:'👗 أزياء — أحذية',catKey:'أزياء',subcat:'ملابس رجالية',gender:'men',title:'صندل رجالي جلد — صناعة محلية',titleFR:'Sandale homme scuir — fabrication locale',desc:'صندل جلد طبيعي، مريح للصيف، مقاسات من 40 إلى 45.',descFR:'Sandale en cuir naturel, confort été, pointures 40 à 45.',price:'6,500 MRU',priceFR:'6,500 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['صندل','جلد','رجالي','محلي'],tagsFR:['Sandale','Cuir','Homme','Local'],seller:'سوق الجلد',sellerFR:'Marché du Cuir',sellerEmoji:'🩴',sellerMeta:'★★★☆☆ — حرفي',sellerMetaFR:'★★★☆☆ — Artisan',status:'⏳ قيد المراجعة',statusFR:'⏳ En cours',pin:false},
  {id:215,emoji:'📿',bg:'linear-gradient(135deg,#3a2200,#7a4a00)',cat:'🪙 ذهب ومجوهرات — إكسسوار',catKey:'ذهب',subcat:'ملابس رجالية',gender:'men',title:'سبحة كهرمان رجالية فاخرة',titleFR:'Chapelet ambre homme — luxe',desc:'سبحة كهرمان طبيعي، 33 حبة، مناسبة للإهداء والمناسبات.',descFR:'Chapelet en ambre naturel, 33 grains, idéal cadeau.',price:'18,000 MRU',priceFR:'18,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['سبحة','كهرمان','رجالي','إكسسوار'],tagsFR:['Chapelet','Ambre','Homme','Accessoire'],seller:'ورشة الكنوز',sellerFR:'Atelier Trésors',sellerEmoji:'📿',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:216,emoji:'🧕',bg:'linear-gradient(135deg,#6b2d4a,#3d1a2c)',cat:'👗 أزياء — ملحفة نسائية',catKey:'أزياء',subcat:'ملحفة نسائية',gender:'women',title:'ملحفة حريرية فاخرة — زمرد وذهب',titleFR:'Melhfa soie de luxe — émeraude et or',desc:'ملحفة نسائية حرير ناعم بألوان زاهية. صورة تجريبية: شارع موريتاني بإضاءة نهارية.',descFR:'Melhfa femme en soie, couleurs vives. Visuel démo : rue mauritanienne en journée.',price:'38,000 MRU',priceFR:'38,000 MRU',loc:'📍 نواكشوط — تفرغ زينة',locFR:'📍 Nouakchott — Tevragh Zeina',tags:['ملحفة','حرير','نسائي','شارع'],tagsFR:['Melhfa','Soie','Femme','Rue'],seller:'ورشة الأناقة',sellerFR:'Atelier Élégance',sellerEmoji:'🧕',sellerMeta:'★★★★★ — موثّق',sellerMetaFR:'★★★★★ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:true},
  {id:231,emoji:'🧕',bg:'linear-gradient(135deg,#7a3a1a,#3a1a10)',cat:'👗 أزياء — ملحفة نسائية',catKey:'أزياء',subcat:'ملحفة نسائية',gender:'women',title:'ملحفة نقش تقليدي — تراكوتا',titleFR:'Melhfa motif traditionnel — terracotta',desc:'ملحفة بنقش موريتاني أصيل بألوان ترابية. صورة تجريبية داخل محل أقمشة تقليدي.',descFR:'Melhfa à motif mauritanien, tons terre. Visuel démo : boutique de tissus traditionnelle.',price:'42,000 MRU',priceFR:'42,000 MRU',loc:'📍 نواكشوط — محل الأقمشة',locFR:'📍 Nouakchott — boutique tissus',tags:['ملحفة','تقليدي','محل','نسائي'],tagsFR:['Melhfa','Traditionnel','Boutique','Femme'],seller:'دار الملحفة',sellerFR:'Maison Melhfa',sellerEmoji:'🧕',sellerMeta:'★★★★★ — موثّق',sellerMetaFR:'★★★★★ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:true},
  {id:232,emoji:'👔',bg:'linear-gradient(135deg,#0f2347,#1B3A6B)',cat:'👗 أزياء — دراعة رجالية',catKey:'أزياء',subcat:'دراعة رجالية',gender:'men',title:'دراعة كحلي مطرزة — محل رجالي',titleFR:'Daraa marine brodée — boutique homme',desc:'دراعة كحلي فاخرة بتطريز فضي وذهبي. صورة تجريبية داخل محل ألبسة رجالية موريتاني.',descFR:'Daraa marine premium, broderie argent/or. Visuel démo : boutique homme mauritanienne.',price:'52,000 MRU',priceFR:'52,000 MRU',loc:'📍 نواكشوط — محل الدراعات',locFR:'📍 Nouakchott — boutique Daraa',tags:['دراعة','كحلي','محل','رجالي'],tagsFR:['Daraa','Marine','Boutique','Homme'],seller:'خياطة الأصالة',sellerFR:'Couture Aṣāla',sellerEmoji:'👔',sellerMeta:'★★★★★ — خياط',sellerMetaFR:'★★★★★ — Tailleur',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:true},
  {id:233,emoji:'🧕',bg:'linear-gradient(135deg,#5a3a5a,#2a1a30)',cat:'👗 أزياء — ملحفة نسائية',catKey:'أزياء',subcat:'ملحفة نسائية',gender:'women',title:'ملحفة ليلكية وبورغندي — سهرة',titleFR:'Melhfa lilas & bordeaux — soirée',desc:'ملحفة ثنائية اللون للمناسبات مع حقيبة وإكسسوارات ذهبية. صورة تجريبية: شارع سكني مساءً.',descFR:'Melhfa bicolore pour soirées, sac et bijoux. Visuel démo : rue résidentielle le soir.',price:'55,000 MRU',priceFR:'55,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['ملحفة','سهرة','نسائي','أنيق'],tagsFR:['Melhfa','Soirée','Femme','Élégant'],seller:'بوتيك لمسة',sellerFR:'Boutique Touche',sellerEmoji:'🧕',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:234,emoji:'👔',bg:'linear-gradient(135deg,#234d8f,#0f2347)',cat:'👗 أزياء — دراعة رجالية',catKey:'أزياء',subcat:'دراعة رجالية',gender:'men',title:'دراعة سماوية بتطريز ذهبي — جلسة محل',titleFR:'Daraa ciel broderie or — en boutique',desc:'دراعة أنيقة مع قميص أبيض وساعة ذهبية. صورة تجريبية داخل محل تقليدي.',descFR:'Daraa élégante, polo blanc et montre. Visuel démo en boutique traditionnelle.',price:'48,000 MRU',priceFR:'48,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['دراعة','ذهبي','محل','رجالي'],tagsFR:['Daraa','Or','Boutique','Homme'],seller:'الأناقة الرجالية',sellerFR:'Élégance Homme',sellerEmoji:'👔',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:217,emoji:'💍',bg:'linear-gradient(135deg,#7a4a00,#3a2200)',cat:'🪙 ذهب ومجوهرات',catKey:'ذهب',subcat:'مجوهرات وذهب',gender:'women',title:'أسورة ذهب عيار 21 — تصميم نسائي',titleFR:'Bracelet or 21 carats — design femme',desc:'أسورة ذهب نسائية عيار 21، وزن 12 غرام، مع شهادة أصالة.',descFR:'Bracelet femme or 21 carats, 12g, certificat d\'authenticité.',price:'110,000 MRU',priceFR:'110,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['أسورة','ذهب','نسائي','21 عيار'],tagsFR:['Bracelet','Or','Femme','21 carats'],seller:'ورشة الذهب الموريتانية',sellerFR:'Atelier Or Mauritanien',sellerEmoji:'💍',sellerMeta:'★★★★★ — موثّق',sellerMetaFR:'★★★★★ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:219,emoji:'📿',bg:'linear-gradient(135deg,#5a3a10,#2a1a00)',cat:'🪙 ذهب ومجوهرات',catKey:'ذهب',subcat:'مجوهرات وذهب',gender:'women',title:'عقد لؤلؤ فاخر — تصميم نسائي',titleFR:'Collier perles — design femme',desc:'عقد لؤلؤ أنيق للمناسبات، تصميم نسائي راقٍ.',descFR:'Collier de perles élégant pour occasions, design femme.',price:'450,000 MRU',priceFR:'450,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['لؤلؤ','عقد','نسائي','ذهب'],tagsFR:['Perles','Collier','Femme','Or'],seller:'ورشة الذهب الموريتانية',sellerFR:'Atelier Or Mauritanien',sellerEmoji:'📿',sellerMeta:'★★★★★ — موثّق',sellerMetaFR:'★★★★★ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:218,emoji:'👜',bg:'linear-gradient(135deg,#4a1942,#1B3A6B)',cat:'👗 أزياء — حقائب',catKey:'أزياء',subcat:'أحذية وحقائب',title:'حقيبة نسائية أنيقة — جلد صناعي',titleFR:'Sac femme élégant — simili cuir',desc:'حقيبة يومية عملية، جيوب داخلية، ألوان متعددة.',descFR:'Sac quotidien pratique, poches intérieures, plusieurs couleurs.',price:'9,800 MRU',priceFR:'9,800 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['حقيبة','نسائي','يومي','أنيق'],tagsFR:['Sac','Femme','Quotidien','Élégant'],seller:'بوتيك لمسة',sellerFR:'Boutique Touche',sellerEmoji:'👜',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  /* إطلالات أولاد — منتجات حقيقية التصنيف (لا خلط مع رجالي/نسائي) */
  {id:241,emoji:'👦',bg:'linear-gradient(135deg,#1B3A6B,#234d8f)',cat:'👗 أزياء — ملابس أطفال ورضع',catKey:'أزياء',subcat:'ملابس أطفال ورضع',gender:'boys',title:'طقم أولاد يومي — قميص وبنطلون',titleFR:'Ensemble garçon quotidien — chemise & pantalon',desc:'طقم ملابس أولاد مريح للمدرسة واللعب، مقاسات 4–12 سنة.',descFR:'Ensemble garçon confortable pour école et jeux, tailles 4–12 ans.',price:'8,500 MRU',priceFR:'8,500 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['أولاد','قميص','مدرسة','أطفال'],tagsFR:['Garçon','Chemise','École','Enfant'],seller:'عالم الأطفال',sellerFR:'Monde Enfants',sellerEmoji:'👦',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:true},
  {id:242,emoji:'👟',bg:'linear-gradient(135deg,#0f2347,#1B3A6B)',cat:'👗 أزياء — ملابس أطفال ورضع',catKey:'أزياء',subcat:'ملابس أطفال ورضع',gender:'boys',title:'حذاء رياضي للأولاد — مقاس 32',titleFR:'Baskets garçon — pointure 32',desc:'حذاء رياضي خفيف للأولاد، مناسب للمدرسة والرياضة.',descFR:'Baskets légères pour garçons, école et sport.',price:'5,200 MRU',priceFR:'5,200 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['أولاد','حذاء','رياضي','أطفال'],tagsFR:['Garçon','Chaussure','Sport','Enfant'],seller:'ستيب كيدز',sellerFR:'Step Kids',sellerEmoji:'👟',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:243,emoji:'🎒',bg:'linear-gradient(135deg,#162235,#234d8f)',cat:'👗 أزياء — ملابس أطفال ورضع',catKey:'أزياء',subcat:'ملابس أطفال ورضع',gender:'boys',title:'حقيبة مدرسية للأولاد — مقاومة',titleFR:'Cartable garçon — résistant',desc:'حقيبة ظهر مدرسية للأولاد مع جيوب متعددة.',descFR:'Sac à dos scolaire garçon avec plusieurs poches.',price:'4,800 MRU',priceFR:'4,800 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['أولاد','مدرسة','حقيبة','أطفال'],tagsFR:['Garçon','École','Sac','Enfant'],seller:'عالم الأطفال',sellerFR:'Monde Enfants',sellerEmoji:'🎒',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:244,emoji:'🧢',bg:'linear-gradient(135deg,#1a2d4d,#0f2347)',cat:'👗 أزياء — ملابس أطفال ورضع',catKey:'أزياء',subcat:'ملابس أطفال ورضع',gender:'boys',title:'قبعة وكاب أولاد — صيفي',titleFR:'Casquette garçon — été',desc:'كاب خفيف للأولاد لحماية من الشمس.',descFR:'Casquette légère garçon anti-soleil.',price:'1,900 MRU',priceFR:'1,900 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['أولاد','قبعة','صيفي','أطفال'],tagsFR:['Garçon','Casquette','Été','Enfant'],seller:'كيدز ستايل',sellerFR:'Kids Style',sellerEmoji:'🧢',sellerMeta:'★★★☆☆',sellerMetaFR:'★★★☆☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  /* إطلالات بنات */
  {id:245,emoji:'👧',bg:'linear-gradient(135deg,#6b2d4a,#3d1a2c)',cat:'👗 أزياء — ملابس أطفال ورضع',catKey:'أزياء',subcat:'ملابس أطفال ورضع',gender:'girls',title:'فستان يومي للبنات — قطن ناعم',titleFR:'Robe fille quotidienne — coton doux',desc:'فستان بنات مريح للمدرسة والمنزل، مقاسات 4–12 سنة.',descFR:'Robe fille confortable école/maison, tailles 4–12 ans.',price:'7,800 MRU',priceFR:'7,800 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['بنات','فستان','قطن','أطفال'],tagsFR:['Fille','Robe','Coton','Enfant'],seller:'زهرة البنات',sellerFR:'Fleur Filles',sellerEmoji:'👧',sellerMeta:'★★★★★ — موثّق',sellerMetaFR:'★★★★★ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:true},
  {id:246,emoji:'👟',bg:'linear-gradient(135deg,#5a3a5a,#2a1a30)',cat:'👗 أزياء — ملابس أطفال ورضع',catKey:'أزياء',subcat:'ملابس أطفال ورضع',gender:'girls',title:'حذاء أنيق للبنات — مقاس 30',titleFR:'Chaussures fille élégantes — pointure 30',desc:'حذاء بنات مريح للمدرسة والمناسبات الخفيفة.',descFR:'Chaussures fille confortables école et sorties.',price:'4,600 MRU',priceFR:'4,600 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['بنات','حذاء','أنيق','أطفال'],tagsFR:['Fille','Chaussure','Élégant','Enfant'],seller:'زهرة البنات',sellerFR:'Fleur Filles',sellerEmoji:'👟',sellerMeta:'★★★★☆ — موثّق',sellerMetaFR:'★★★★☆ — Vérifié',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:247,emoji:'🎀',bg:'linear-gradient(135deg,#7a3a5a,#3a1a30)',cat:'👗 أزياء — ملابس أطفال ورضع',catKey:'أزياء',subcat:'ملابس أطفال ورضع',gender:'girls',title:'طقم إكسسوارات بنات — فيونكات',titleFR:'Accessoires fille — nœuds',desc:'طقم فيونكات وأكسسوارات شعر للبنات.',descFR:'Lot de nœuds et accessoires cheveux pour filles.',price:'2,400 MRU',priceFR:'2,400 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['بنات','فيونكة','إكسسوار','أطفال'],tagsFR:['Fille','Nœud','Accessoire','Enfant'],seller:'كيدز ستايل',sellerFR:'Kids Style',sellerEmoji:'🎀',sellerMeta:'★★★★☆',sellerMetaFR:'★★★★☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:248,emoji:'👒',bg:'linear-gradient(135deg,#4a1942,#1B3A6B)',cat:'👗 أزياء — ملابس أطفال ورضع',catKey:'أزياء',subcat:'ملابس أطفال ورضع',gender:'girls',title:'قبعة صيفية للبنات',titleFR:'Chapeau d\'été fille',desc:'قبعة خفيفة للبنات للخروج في الشمس.',descFR:'Chapeau léger fille pour le soleil.',price:'2,100 MRU',priceFR:'2,100 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['بنات','قبعة','صيفي','أطفال'],tagsFR:['Fille','Chapeau','Été','Enfant'],seller:'زهرة البنات',sellerFR:'Fleur Filles',sellerEmoji:'👒',sellerMeta:'★★★☆☆',sellerMetaFR:'★★★☆☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  /* كتالوج موزاييك المعارض/الأناقة — معرّفات عالية لتفادي التعارض مع إعلانات API */
  {id:220,emoji:'🚗',bg:'linear-gradient(135deg,#234d8f,#1B3A6B)',cat:'🚗 سيارات — سيارات للبيع',catKey:'سيارات',title:'Toyota Hilux 2022 بحالة ممتازة',titleFR:'Toyota Hilux 2022 excellent état',desc:'ديزل 4WD، ممشى منخفض، صيانة وكيل.',descFR:'Diesel 4x4, faible kilométrage, entretien concessionnaire.',price:'8,000,000 MRU',priceFR:'8,000,000 MRU',loc:'📍 نواذيبو',locFR:'📍 Nouadhibou',tags:['Hilux','ديزل','4WD'],tagsFR:['Hilux','Diesel','4x4'],seller:'عبد الله محمد',sellerFR:'Abdallah Mohamed',sellerEmoji:'🚗',sellerMeta:'★★★★☆',sellerMetaFR:'★★★★☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:221,emoji:'🚗',bg:'linear-gradient(135deg,#1B3A6B,#0f2347)',cat:'🚗 سيارات — سيارات للبيع',catKey:'سيارات',title:'تويوتا كامري 2021 — سيدان عائلية',titleFR:'Toyota Camry 2021 — berline',desc:'سيدان عائلية مريحة بحالة ممتازة.',descFR:'Berline familiale confortable.',price:'4,200,000 MRU',priceFR:'4,200,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['سيدان','كامري','2021'],tagsFR:['Berline','Camry','2021'],seller:'وكالة النجمة',sellerFR:'Agence Najma',sellerEmoji:'🚗',sellerMeta:'★★★★★',sellerMetaFR:'★★★★★',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:222,emoji:'🚙',bg:'linear-gradient(135deg,#0f2347,#234d8f)',cat:'🚗 سيارات — سيارات للبيع',catKey:'سيارات',title:'هيونداي توسان 2022 — SUV',titleFR:'Hyundai Tucson 2022 — SUV',desc:'SUV مريح للطريق الطويل.',descFR:'SUV confortable longue route.',price:'5,800,000 MRU',priceFR:'5,800,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['SUV','توسان','2022'],tagsFR:['SUV','Tucson','2022'],seller:'أوتو موريتانيا',sellerFR:'Auto Mauritanie',sellerEmoji:'🚙',sellerMeta:'★★★★☆',sellerMetaFR:'★★★★☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:223,emoji:'🔑',bg:'linear-gradient(135deg,#162235,#1B3A6B)',cat:'🚗 سيارات — قطع غيار',catKey:'سيارات',title:'طقم مفاتيح وريموت تويوتا أصلي',titleFR:'Jeu de clés Toyota d\'origine',desc:'ريموت ومفتاح أصلي مناسب لعدة موديلات.',descFR:'Clé et télécommande d\'origine.',price:'45,000 MRU',priceFR:'45,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['مفاتيح','قطع','تويوتا'],tagsFR:['Clés','Pièces','Toyota'],seller:'قطع الغيار السريعة',sellerFR:'Pièces Express',sellerEmoji:'🔑',sellerMeta:'★★★★☆',sellerMetaFR:'★★★★☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:224,emoji:'🛞',bg:'linear-gradient(135deg,#0a1628,#1B3A6B)',cat:'🚗 سيارات — قطع غيار',catKey:'سيارات',title:'إطارات SUV 265/65R17 — طقم 4',titleFR:'Pneus SUV 265/65R17 — lot de 4',desc:'إطارات جديدة للطرق الطويلة والصحراوية.',descFR:'Pneus neufs longue route / désert.',price:'180,000 MRU',priceFR:'180,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['إطارات','SUV','4'],tagsFR:['Pneus','SUV','4'],seller:'إطارات الصحراء',sellerFR:'Pneus Sahara',sellerEmoji:'🛞',sellerMeta:'★★★★☆',sellerMetaFR:'★★★★☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:225,emoji:'💻',bg:'linear-gradient(135deg,#0f2347,#234d8f)',cat:'📱 إلكترونيات — لابتوب وحاسوب',catKey:'إلكترونيات',title:'لابتوب Dell 15" — Core i7',titleFR:'Laptop Dell 15" — Core i7',desc:'لابتوب للعمل والدراسة، 16GB RAM، SSD 512.',descFR:'Laptop travail/études, 16 Go, SSD 512.',price:'95,000 MRU',priceFR:'95,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['لابتوب','i7','SSD'],tagsFR:['Laptop','i7','SSD'],seller:'تك موريتانيا',sellerFR:'Tech MR',sellerEmoji:'💻',sellerMeta:'★★★★☆',sellerMetaFR:'★★★★☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:226,emoji:'📺',bg:'linear-gradient(135deg,#1B3A6B,#0a1628)',cat:'📱 إلكترونيات — شاشات وتلفزيون',catKey:'إلكترونيات',title:'تلفزيون Samsung 55" Smart 4K',titleFR:'TV Samsung 55" Smart 4K',desc:'شاشة ذكية 4K مع تطبيقات مدمجة.',descFR:'TV Smart 4K avec apps.',price:'120,000 MRU',priceFR:'120,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['TV','55','4K'],tagsFR:['TV','55','4K'],seller:'إلكترو بلس',sellerFR:'Électro Plus',sellerEmoji:'📺',sellerMeta:'★★★★★',sellerMetaFR:'★★★★★',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:227,emoji:'🎧',bg:'linear-gradient(135deg,#162235,#234d8f)',cat:'📱 إلكترونيات — إكسسوارات',catKey:'إلكترونيات',title:'سماعات لاسلكية عازلة للضجيج',titleFR:'Écouteurs sans fil ANC',desc:'بطارية طويلة وعزل ضجيج.',descFR:'Autonomie longue, réduction de bruit.',price:'14,500 MRU',priceFR:'14,500 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['سماعات','لاسلكي'],tagsFR:['Écouteurs','Sans fil'],seller:'صوت تك',sellerFR:'Audio Tech',sellerEmoji:'🎧',sellerMeta:'★★★★☆',sellerMetaFR:'★★★★☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:228,emoji:'🛋️',bg:'linear-gradient(135deg,#3a2a1a,#1B3A6B)',cat:'🪑 أثاث — صالون',catKey:'أثاث',title:'كنب صالون زاوية — قماش فاخر',titleFR:'Canapé d\'angle — tissu premium',desc:'صالون واسع ومريح لعائلة كبيرة.',descFR:'Salon spacieux pour famille.',price:'185,000 MRU',priceFR:'185,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['كنب','صالون','زاوية'],tagsFR:['Canapé','Salon','Angle'],seller:'مفروشات البيت',sellerFR:'Maison Meubles',sellerEmoji:'🛋️',sellerMeta:'★★★★☆',sellerMetaFR:'★★★★☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:229,emoji:'🛏️',bg:'linear-gradient(135deg,#2a1a3a,#1B3A6B)',cat:'🪑 أثاث — غرف نوم',catKey:'أثاث',title:'غرفة نوم كاملة — خشب طبيعي',titleFR:'Chambre complète — bois naturel',desc:'سرير + خزانة + طاولتا جانب.',descFR:'Lit + armoire + 2 tables de nuit.',price:'240,000 MRU',priceFR:'240,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['سرير','خزانة','خشب'],tagsFR:['Lit','Armoire','Bois'],seller:'أثاث الأناقة',sellerFR:'Élégance Meubles',sellerEmoji:'🛏️',sellerMeta:'★★★★★',sellerMetaFR:'★★★★★',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false},
  {id:230,emoji:'🪑',bg:'linear-gradient(135deg,#1a2a3a,#0f2347)',cat:'🪑 أثاث — مكاتب',catKey:'أثاث',title:'مكتب عمل خشبي مع أدراج',titleFR:'Bureau en bois avec tiroirs',desc:'مكتب عملي للدراسة والعمل من المنزل.',descFR:'Bureau pratique télétravail.',price:'55,000 MRU',priceFR:'55,000 MRU',loc:'📍 نواكشوط',locFR:'📍 Nouakchott',tags:['مكتب','خشب','أدراج'],tagsFR:['Bureau','Bois','Tiroirs'],seller:'مكتب بلس',sellerFR:'Bureau Plus',sellerEmoji:'🪑',sellerMeta:'★★★★☆',sellerMetaFR:'★★★★☆',status:'✅ موثّق',statusFR:'✅ Vérifié',pin:false}
];

// ── رسالة واتساب التواصل — تُقيَّم وقت الضغط حسب اللغة الحالية ──
function waContactMsg(){
  return isAr ? 'مرحباً، رأيت إعلانك على رزق وأريد الاستفسار' : 'Bonjour, j\'ai vu votre annonce sur Rizq et je voudrais me renseigner';
}

// ── ترجمة كاملة لبيانات الإعلان حسب اللغة الحالية ──
function trAd(a){
  if(!a || isAr) return a;
  return {
    ...a,
    cat: a.catKey ? ((a.cat||'').split(' ')[0]+' '+(QCAT_KEYS_FR[a.catKey]||a.catKey)) : a.cat,
    title: a.titleFR || a.title,
    desc: a.descFR || a.desc,
    loc: a.locFR || a.loc,
    price: a.priceFR || a.price,
    tags: a.tagsFR || a.tags,
    seller: a.sellerFR || a.seller,
    sellerMeta: a.sellerMetaFR || a.sellerMeta,
    status: a.statusFR || a.status,
  };
}

/** محرّك شريط انسيابي كالماء — rAF مشترك + بكسل فرعي + إيقاف خارج الشاشة (بلا تقطيع) */
var _rzqMarquees = [];
var _rzqMarqueeRaf = 0;
var _rzqMarqueeLast = 0;
var _rzqMarqueeIo = null;
try{
  window._rzqMarquees = _rzqMarquees;
  window._rzqMarqueeTick = _rzqMarqueeTick;
  window._rzqEnsureMarqueeLoop = _rzqEnsureMarqueeLoop;
}catch(eGlob){}
function _rzqIsRtl(){
  return (document.documentElement.getAttribute('dir') || 'rtl') !== 'ltr';
}
function _rzqMarqueeMeasureHalf(el){
  if(!el) return 0;
  var kids = el.children;
  var n = kids ? kids.length : 0;
  if(n >= 2 && (n % 2 === 0)){
    var mid = kids[n / 2];
    /* المسارات direction:ltr — offsetLeft لمنتصف النسخة الثانية = عرض نصف الدورة بدقة */
    var half = mid && typeof mid.offsetLeft === 'number' ? mid.offsetLeft : 0;
    if(half > 20) return half;
  }
  var w = el.scrollWidth || 0;
  return w > 40 ? w / 2 : 0;
}
function _rzqMarqueeAnyActive(){
  if(document.hidden) return false;
  for(var i = 0; i < _rzqMarquees.length; i++){
    var s = _rzqMarquees[i];
    if(s && s.el && s.el.isConnected && !s.paused && !s.hoverPaused && !s.userPaused && !s.offscreen && s.half > 1) return true;
  }
  return false;
}
function _rzqMarqueeTick(now){
  if(!_rzqMarqueeLast) _rzqMarqueeLast = now;
  var dt = Math.min(0.032, Math.max(0, (now - _rzqMarqueeLast) / 1000));
  _rzqMarqueeLast = now;
  if(dt > 0){
    for(var i = 0; i < _rzqMarquees.length; i++){
      var state = _rzqMarquees[i];
      if(!state || !state.el || !state.el.isConnected) continue;
      if(state.paused || state.hoverPaused || state.userPaused || state.offscreen || state.half <= 1) continue;
      var spd = Math.abs(Number(state.pxPerSec) || 0) * (state.dir < 0 ? -1 : 1);
      state.pos += spd * dt;
      if(state.pos >= state.half) state.pos -= state.half;
      if(state.pos < 0) state.pos += state.half;
      state.apply();
    }
  }
  if(!_rzqMarqueeAnyActive()){
    _rzqMarqueeRaf = 0;
    _rzqMarqueeLast = 0;
    return;
  }
  _rzqMarqueeRaf = requestAnimationFrame(_rzqMarqueeTick);
}
function _rzqEnsureMarqueeLoop(){
  if(_rzqMarqueeRaf || !_rzqMarqueeAnyActive()) return;
  _rzqMarqueeLast = 0;
  var tickFn = (typeof window !== 'undefined' && typeof window._rzqMarqueeTick === 'function')
    ? window._rzqMarqueeTick
    : _rzqMarqueeTick;
  _rzqMarqueeRaf = requestAnimationFrame(tickFn);
}
try{
  window._rzqMarquees = _rzqMarquees;
  window._rzqMarqueeTick = _rzqMarqueeTick;
  window._rzqEnsureMarqueeLoop = _rzqEnsureMarqueeLoop;
}catch(eGlob2){}
function _rzqEnsureMarqueeIo(){
  if(_rzqMarqueeIo || typeof IntersectionObserver === 'undefined') return _rzqMarqueeIo;
  _rzqMarqueeIo = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      var target = en.target;
      var st = target && target._rzqMarquee;
      if(!st && target && target.querySelector){
        var inner = target.querySelector('.ticker-inner, .cards-track, .price-ticker-inner, .rizq-styles-rail');
        st = inner && inner._rzqMarquee;
      }
      if(!st) return;
      st.offscreen = !en.isIntersecting;
      st.applyPlayState();
    });
  }, {root:null, rootMargin:'120px 0px', threshold:0});
  return _rzqMarqueeIo;
}
function _rzqMarqueeBoostWrap(el){
  if(!el) return null;
  return el.closest('.cards-track-wrap, .ticker-wrap, .price-ticker-wrap, .rizq-styles-track-wrap, .rizq-styles-rail-wrap, .rizq-srm-rail-wrap, .rzq-disc-strip') || el.parentElement;
}
function _rzqBindMarqueePointerBoost(state){
  if(!state || !state.el || state._boostBound) return;
  var wrap = _rzqMarqueeBoostWrap(state.el);
  if(!wrap) return;
  state._boostBound = true;
  state.basePx = state.pxPerSec;
  state.boost = 0;
  var lastX = null;
  var lastT = 0;
  var decayTimer = 0;
  function resetBoost(){
    state.boost = 0;
    state.pxPerSec = state.basePx || state.pxPerSec;
  }
  function applyBoost(raw){
    var boost = Math.max(0, Math.min(220, raw));
    state.boost = boost;
    state.pxPerSec = (state.basePx || 56) + boost;
    _rzqEnsureMarqueeLoop();
    if(decayTimer) clearTimeout(decayTimer);
    decayTimer = setTimeout(resetBoost, 900);
  }
  function onPointerSample(ev){
    /* أثناء الإيقاف (مرور المؤشر) لا تسريع — العجلة/السحب للإرجاع فقط */
    if(state.paused || state.hoverPaused || state.userPaused) return;
    var t = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if(lastX != null){
      var dx = ev.clientX - lastX;
      var dt = Math.max(8, t - lastT);
      var mousePxSec = Math.abs(dx) / dt * 1000;
      applyBoost(mousePxSec * 0.42);
    }
    lastX = ev.clientX;
    lastT = t;
  }
  wrap.addEventListener('pointermove', onPointerSample, {passive:true});
  wrap.addEventListener('touchmove', function(ev){
    if(!ev.touches || !ev.touches[0]) return;
    onPointerSample(ev.touches[0]);
  }, {passive:true});
  wrap.addEventListener('pointerleave', function(){
    lastX = null;
  }, {passive:true});
  wrap.addEventListener('pointerup', function(){ lastX = null; }, {passive:true});
  wrap.addEventListener('touchend', function(){ lastX = null; }, {passive:true});
  wrap.addEventListener('wheel', function(ev){
    if(state.paused || state.hoverPaused || state.userPaused) return;
    var dx = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
    if(!dx) return;
    applyBoost(Math.min(220, Math.abs(dx) * 2.4));
  }, {passive:true});
  try{ wrap.style.touchAction = wrap.style.touchAction || 'pan-y'; }catch(eT){}
}
function bindRafMarquee(el, opts){
  if(!el || el.classList.contains('is-empty')) return null;
  opts = opts || {};
  if(el._rzqMarquee){
    if(opts.pxPerSec){
      el._rzqMarquee.basePx = opts.pxPerSec;
      el._rzqMarquee.pxPerSec = opts.pxPerSec + (el._rzqMarquee.boost || 0);
    }
    el._rzqMarquee.remeasure();
    _rzqBindMarqueePointerBoost(el._rzqMarquee);
    try{
      if(window.RizqMarqueeKit && typeof RizqMarqueeKit.enhanceRafState === 'function'){
        RizqMarqueeKit.enhanceRafState(el._rzqMarquee);
      }
    }catch(eKit){}
    _rzqEnsureMarqueeLoop();
    return el._rzqMarquee;
  }
  var state = {
    el: el,
    pos: 0,
    half: 0,
    paused: false,
    offscreen: false,
    pxPerSec: opts.pxPerSec || 56,
    basePx: opts.pxPerSec || 56,
    boost: 0,
    raf: 1,
    rtl: _rzqIsRtl(),
    applyPlayState: function(){
      var stop = !!(state.paused || state.hoverPaused || state.userPaused || state.offscreen || document.hidden || state.half <= 1);
      el.classList.toggle('is-mq-paused', stop);
      if(!stop) _rzqEnsureMarqueeLoop();
    },
    remeasure: function(){
      try{
        el.style.setProperty('animation', 'none', 'important');
        el.style.setProperty('animation-name', 'none', 'important');
      }catch(eAnim){ el.style.animation = 'none'; }
      /* احترم direction على العنصر نفسه (مثلاً شريط الأسعار LTR) بدل فرض اتجاه الصفحة */
      var nextRtl = _rzqIsRtl();
      try{
        if(getComputedStyle(el).direction === 'ltr') nextRtl = false;
      }catch(eDir){}
      if(state.rtl !== nextRtl){
        state.rtl = nextRtl;
        state.pos = 0;
      }
      /* قياس بلا إزاحة — احفظ الموضع ثم أعده بعد القياس */
      var saved = state.pos;
      el.style.transform = 'translate3d(0,0,0)';
      void el.offsetWidth;
      state.half = _rzqMarqueeMeasureHalf(el);
      if(state.half > 1 && saved >= state.half) saved = saved % state.half;
      state.pos = state.half > 1 ? saved : 0;
      state.apply();
      state.applyPlayState();
    },
    apply: function(){
      if(state.half <= 0){
        el.style.transform = 'translate3d(0px,0,0)';
        return;
      }
      /* عربي RTL: من -half نحو 0 · فرنسي LTR: من 0 نحو -half — بكسل فرعي سلس */
      var x = state.rtl ? (-state.half + state.pos) : (-state.pos);
      el.style.transform = 'translate3d(' + x.toFixed(3) + 'px,0,0)';
    },
    setPaused: function(on){
      state.paused = !!on;
      state.applyPlayState();
    },
    destroy: function(){
      var idx = _rzqMarquees.indexOf(state);
      if(idx >= 0) _rzqMarquees.splice(idx, 1);
      if(_rzqMarqueeIo){
        try{ _rzqMarqueeIo.unobserve(el); }catch(eU){}
        try{
          var root = _rzqMarqueeBoostWrap(el);
          if(root) _rzqMarqueeIo.unobserve(root);
        }catch(eU2){}
      }
      el._rzqMarquee = null;
      el.classList.remove('is-mq-paused');
    }
  };
  el._rzqMarquee = state;
  _rzqMarquees.push(state);
  try{ window._rzqMarquees = _rzqMarquees; }catch(eW){}
  var io = _rzqEnsureMarqueeIo();
  if(io){
    try{
      var root = _rzqMarqueeBoostWrap(el) || el.parentElement || el;
      io.observe(root);
    }catch(eIo){ try{ io.observe(el); }catch(e2){} }
  }
  _rzqBindMarqueePointerBoost(state);
  try{
    if(window.RizqMarqueeKit && typeof RizqMarqueeKit.enhanceRafState === 'function'){
      RizqMarqueeKit.enhanceRafState(state);
    }
  }catch(eKit2){}
  state.remeasure();
  _rzqEnsureMarqueeLoop();
  return state;
}
function syncMarqueeShift(el){
  if(!el) return;
  bindRafMarquee(el);
  if(el._rzqMarquee) el._rzqMarquee.remeasure();
  _rzqEnsureMarqueeLoop();
}
function syncAllMarquees(){
  [
    {el: document.getElementById('cards-track'), px: 56},
    {el: document.getElementById('ticker'), px: 62},
    {el: document.getElementById('price-ticker'), px: 52},
    {el: document.getElementById('rizq-styles-rail'), px: 52},
    {el: document.getElementById('rizq-srm-rail'), px: 52},
    {el: document.getElementById('rizq-est-rail'), px: 42}
  ].forEach(function(cfg){
    if(!cfg.el || cfg.el.classList.contains('is-empty')) return;
    bindRafMarquee(cfg.el, {pxPerSec: cfg.px});
    if(cfg.el._rzqMarquee) cfg.el._rzqMarquee.remeasure();
  });
  try{ if(window.RizqMarqueeKit) RizqMarqueeKit.enhanceAllRaf(); }catch(eKit3){}
  _rzqEnsureMarqueeLoop();
}
function liveListingsLabelHtml(fr){
  return fr
    ? '<span class="live-capsule"><span class="live-capsule-light" aria-hidden="true"></span><strong class="live-capsule-txt">Récent</strong></span><span class="live-label-sub" data-t="promo-strip-sub">Dernières annonces sur Rizq — offres qui impressionnent</span>'
    : '<span class="live-capsule"><span class="live-capsule-light" aria-hidden="true"></span><strong class="live-capsule-txt">أحدث</strong></span><span class="live-label-sub" data-t="promo-strip-sub">الإعلانات على رزق — عروض تخطف الأنظار</span>';
}
function paintLiveListingsLabel(){
  var el = document.querySelector('.listings-label > span');
  if(!el) return;
  var fr = false;
  try{
    if(typeof isAr !== 'undefined') fr = !isAr;
    else fr = (localStorage.getItem('rizq_lang') || 'ar') === 'fr';
  }catch(e){}
  el.innerHTML = liveListingsLabelHtml(fr);
}
paintLiveListingsLabel();

function _adHasPublicTitle(a){
  if(!a) return false;
  var t=String(a.title||'').trim();
  var tFr=String(a.titleFr||a.titleFR||'').trim();
  if(!t && !tFr) return false;
  if(t==='(بدون عنوان)' || t==='(Sans titre)') return false;
  if(tFr==='(بدون عنوان)' || tFr==='(Sans titre)') return false;
  return true;
}

function buildCards(){
  const track=document.getElementById('cards-track');
  if(!track) return;
  var demoOk = (window.RizqDemo && typeof RizqDemo.inventoryAllowed === 'function')
    ? RizqDemo.inventoryAllowed()
    : !(window.RIZQ_LAUNCH && RIZQ_LAUNCH.launchDate);
  /* إن بقي ADS فارغاً بعد hydrate مبكر (قبل site-config) — ازرع FEATURED عند السماح */
  if(typeof ADS !== 'undefined' && !ADS.length && demoOk && typeof FEATURED_ADS !== 'undefined' && FEATURED_ADS.length){
    FEATURED_ADS.forEach(function(a){ if(a && _adHasPublicTitle(a)) ADS.push(a); });
    if(typeof refreshAllAdsIndex === 'function'){
      try{ refreshAllAdsIndex(); }catch(eIdx){}
    }
  }
  if(window.RizqAdCards && typeof RizqAdCards.seedDemoGalleries === 'function'){
    try{ RizqAdCards.seedDemoGalleries(ADS); RizqAdCards.seedDemoGalleries(FEATURED_ADS); }catch(eSeed){}
  }
  track.innerHTML='';
  var source = (typeof ADS !== 'undefined' ? ADS : []).filter(_adHasPublicTitle);
  if(!source.length){
    track.innerHTML='';
    var heroSecEmpty=document.getElementById('hero-listings');
    if(heroSecEmpty) heroSecEmpty.style.display='none';
    return;
  }
  var heroSec=document.getElementById('hero-listings');
  if(heroSec) heroSec.style.display='';
  function _escCard(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  /* خفّف DOM الشريط الحي: 12 بطاقة×2 يكفي للماركي السلس بدل عشرات البطاقات الثقيلة */
  var livePool = source.slice(0, 12);
  const all=[...livePool,...livePool];
  all.forEach((a,idx)=>{
    const realIdx = idx % livePool.length;
    const c=document.createElement('div');
    c.className='ad-card';
    const d = trAd(a);
    const media = (window.RizqAdCards && typeof RizqAdCards.mediaHtml === 'function')
      ? RizqAdCards.mediaHtml(a, { fr: !isAr, price: d.price, pin: !!d.pin, emoji: d.emoji, bg: d.bg, title: d.title })
      : ('<div class="ad-card-img" style="background:'+_escCard(d.bg||'')+'">'+_adPhotoHtml(a,d,130)+'</div>');
    const actions = (window.RizqAdCards && typeof RizqAdCards.actionsHtml === 'function')
      ? RizqAdCards.actionsHtml(a, { fr: !isAr })
      : '';
    const brandSlot = (window.RizqAdCards && typeof RizqAdCards.brandSlotHtml === 'function')
      ? RizqAdCards.brandSlotHtml(a, { fr: !isAr, size: 18 })
      : '<div class="rzq-ad-brand-slot is-empty" aria-hidden="true"></div>';
    c.innerHTML=`
      ${media}
      <div class="ad-card-body">
        <div class="ad-cat">${_escCard(d.cat)}</div>
        <div class="ad-title">${_escCard(d.title)}</div>
        ${brandSlot}
        <div class="ad-footer">
          <span class="ad-loc">${_escCard(d.loc)}</span>
        </div>
        ${actions}
      </div>`;
    c.addEventListener('click',function(ev){
      if(ev.target && ev.target.closest && ev.target.closest('.rzq-adx-nav,.rzq-adx-fav,.rzq-adx-wa,.rzq-adx-tel,.rzq-adx-actions')) return;
      openCarouselAdById(a.id);
    });
    track.appendChild(c);
  });
  if(window.RizqAdCards && typeof RizqAdCards.bindAll === 'function') RizqAdCards.bindAll(track);
  requestAnimationFrame(function(){
    bindRafMarquee(track, {pxPerSec:56});
    requestAnimationFrame(function(){ syncMarqueeShift(track); });
  });
}
/* لا ترسم DEMO قبل معرفة launchDate (كاش أو site-config) — أبقِ الهيكل العظمي */
function _rizqMaybePaintDemoInventory(){
  try {
    if(!(window.RizqDemo && typeof RizqDemo.inventoryAllowed === 'function' && RizqDemo.inventoryAllowed())) return;
    /* بعد جاهزية launch: إن فرّغ hydrateLiveAds المبكر ADS قبل demoOk — أعد البذر */
    if(typeof ADS !== 'undefined' && !ADS.length && typeof FEATURED_ADS !== 'undefined' && FEATURED_ADS.length){
      FEATURED_ADS.forEach(function(a){
        if(a && (typeof _adHasPublicTitle !== 'function' || _adHasPublicTitle(a))) ADS.push(a);
      });
      if(typeof refreshAllAdsIndex === 'function'){
        try{ refreshAllAdsIndex(); }catch(eIdx2){}
      }
    }
    if(typeof buildCards === 'function') buildCards();
    if(typeof buildLandingAds === 'function') buildLandingAds(true);
  } catch(ePaint) {}
}
_rizqMaybePaintDemoInventory();
document.addEventListener('rizq:launch', function(){ _rizqMaybePaintDemoInventory(); });
window.addEventListener('load', function(){ setTimeout(syncAllMarquees, 160); });
window.addEventListener('resize', function(){
  if(syncAllMarquees._t) clearTimeout(syncAllMarquees._t);
  syncAllMarquees._t = setTimeout(syncAllMarquees, 180);
});
document.addEventListener('visibilitychange', function(){
  _rzqMarqueeLast = 0;
  if(!document.hidden){
    /* أعد الحلقة فقط — بلا إعادة قياس فورية تسبب تقطيعاً */
    _rzqMarquees.forEach(function(st){ if(st && st.applyPlayState) st.applyPlayState(); });
    _rzqEnsureMarqueeLoop();
  }
});

function buildFeaturedCards(){
  /* توافق خلفي — قسم الإعلانات المميزة */
  buildLandingAds(false);
}

var LANDING_ADS_MAX = 1000;
/* واجهة المميزة: بطاقات أصغر — المميّز ثابت في المقدّمة حسب مدة الباقة */
var LANDING_ADS_WINDOW = 18;
var _landingAdsCat = 'all';

function _isLandingFeatured(a){
  if(!a) return false;
  var until = a.pinUntil || a.boostUntil || a.featuredUntil || a.pin_until || a.boost_until;
  if(until){
    var t = Date.parse(until);
    if(!isNaN(t)) return t > Date.now();
  }
  return !!(a.pin || a.boosted || a.featured);
}
function _landingAdsPool(){
  var seen = {};
  var out = [];
  function add(list){
    (list || []).forEach(function(a){
      if(!a || a.id == null) return;
      if(typeof _adHasPublicTitle === 'function' && !_adHasPublicTitle(a)) return;
      var id = String(a.id);
      if(seen[id]) return;
      seen[id] = 1;
      out.push(a);
    });
  }
  var demoOk = (window.RizqDemo && typeof RizqDemo.inventoryAllowed === 'function')
    ? RizqDemo.inventoryAllowed()
    : !(window.RIZQ_LAUNCH && RIZQ_LAUNCH.launchDate);
  if(demoOk && typeof FEATURED_ADS !== 'undefined') add(FEATURED_ADS);
  if(typeof ADS !== 'undefined') add(ADS);
  if(typeof ALL_ADS_DATA !== 'undefined') add(ALL_ADS_DATA);
  if(out.length > LANDING_ADS_MAX) out = out.slice(0, LANDING_ADS_MAX);
  return out;
}
function _landingAdsFiltered(){
  var pool = _landingAdsPool();
  var cat = _landingAdsCat || 'all';
  var list = cat === 'all' ? pool.slice() : pool.filter(function(a){
    var k = String(a.catKey || a.cat || '');
    return k.indexOf(cat) >= 0 || cat.indexOf(k) >= 0;
  });
  /* المميزة أولاً وتثبت في الواجهة طوال مدة الباقة */
  list.sort(function(a, b){
    var fa = _isLandingFeatured(a) ? 1 : 0;
    var fb = _isLandingFeatured(b) ? 1 : 0;
    return fb - fa;
  });
  return list;
}
function filterLandingAds(cat, btn){
  _landingAdsCat = cat || 'all';
  document.querySelectorAll('.landing-ads-filter').forEach(function(b){
    var on = b.getAttribute('data-lad-cat') === _landingAdsCat;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  buildLandingAds(false);
}
function loadMoreLandingAds(){
  /* أُلغي من الواجهة — الكل عبر صفحة الإعلانات */
  try { window.location.href = 'rizq_browse.html'; } catch (e) {}
}
function _landingAdCardHtml(a, fr){
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  var d = typeof trAd === 'function' ? trAd(a) : a;
  var idAttr = esc(String(a.id));
  var title = esc(d.title || '');
  var cat = esc(d.cat || '');
  var rawPrice = String(d.price == null ? '' : d.price).trim();
  if(!rawPrice) rawPrice = fr ? 'Prix à la demande' : 'السعر عند التواصل';
  var price = esc(rawPrice);
  var loc = esc(d.loc || '');
  var pin = _isLandingFeatured(a) || !!d.pin || !!a.boosted;
  var idJs = String(a.id).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  var openFn = 'openAdById(\'' + idJs + '\')';
  var media = (window.RizqAdCards && typeof RizqAdCards.mediaHtml === 'function')
    ? RizqAdCards.mediaHtml(a, { fr: !!fr, price: rawPrice, pin: pin, emoji: d.emoji, bg: d.bg, title: d.title })
    : ('<div class="l-img" style="background:' + esc(d.bg || 'linear-gradient(145deg,#111d2e,#1B3A6B)') + '">' + (typeof _adPhotoHtml === 'function' ? _adPhotoHtml(a, d, 96) : ('<span>' + esc(d.emoji || '📦') + '</span>')) + '</div>');
  var actions = (window.RizqAdCards && typeof RizqAdCards.actionsHtml === 'function')
    ? RizqAdCards.actionsHtml(a, { fr: !!fr })
    : '';
  var brandSlot = (window.RizqAdCards && typeof RizqAdCards.brandSlotHtml === 'function')
    ? RizqAdCards.brandSlotHtml(a, { fr: !!fr, size: 18 })
    : '<div class="rzq-ad-brand-slot is-empty" aria-hidden="true"></div>';
  return ''
    + '<div class="listing-card' + (pin ? ' pin' : '') + ' fade-in" role="listitem" data-ad-id="' + idAttr + '" data-featured="' + (pin ? '1' : '0') + '" onclick="if(event.target.closest && event.target.closest(\'.rzq-adx-nav,.rzq-adx-fav,.rzq-adx-wa,.rzq-adx-tel,.rzq-adx-actions\')) return; ' + openFn + '">'
    + media
    + '<div class="l-body">'
    +   '<p class="l-cat">' + cat + '</p>'
    +   '<h3 class="l-title">' + title + '</h3>'
    +   brandSlot
    +   '<span class="l-loc">' + loc + '</span>'
    +   actions
    + '</div></div>';
}
function buildLandingAds(resetVisible){
  var grid = document.getElementById('landing-ads-grid') || document.querySelector('#listings .listings-grid');
  if(!grid) return;
  var fr = typeof isAr !== 'undefined' && !isAr;
  var filtered = _landingAdsFiltered();
  var featuredCount = 0;
  for(var i = 0; i < filtered.length; i++){ if(_isLandingFeatured(filtered[i])) featuredCount++; }
  var items = filtered.slice(0, LANDING_ADS_WINDOW);
  var shownFeat = 0;
  for(var j = 0; j < items.length; j++){ if(_isLandingFeatured(items[j])) shownFeat++; }

  var countEl = document.getElementById('landing-ads-count');
  if(countEl){
    if(!filtered.length){
      countEl.textContent = fr ? 'Aucune annonce pour le moment' : 'لا توجد إعلانات بعد';
    } else {
      countEl.textContent = fr
        ? (shownFeat + ' offre' + (shownFeat > 1 ? 's' : '') + ' vedette' + (shownFeat > 1 ? 's' : '') + ' · le meilleur du marché maintenant')
        : (shownFeat + ' عروض مميزة · أفضل ما في السوق الآن');
    }
  }

  if(!items.length){
    if(window.RizqUx && typeof RizqUx.emptyStateHtml === 'function'){
      grid.innerHTML = RizqUx.emptyStateHtml({
        title: fr ? 'Aucune annonce dans cette catégorie' : 'لا توجد إعلانات في هذا القسم',
        primaryHref: 'rizq_post.html'
      });
    } else {
      grid.innerHTML = '<p class="rzq-empty" style="grid-column:1/-1;text-align:center;color:#6a7a8a;padding:32px 16px;font-size:14px">'
        + (fr ? 'Aucune annonce dans cette catégorie.' : 'لا توجد إعلانات في هذا القسم.') + '</p>';
    }
  } else {
    grid.innerHTML = items.map(function(a){ return _landingAdCardHtml(a, fr); }).join('');
    if(window.RizqAdCards && typeof RizqAdCards.bindAll === 'function') RizqAdCards.bindAll(grid);
  }

  var more = document.getElementById('landing-ads-more');
  if(more){ more.innerHTML = ''; more.hidden = true; }
}
/* buildLandingAds: يُستدعى عبر _rizqMaybePaintDemoInventory / hydrateLiveAds فقط */
