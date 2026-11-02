// ══════════════════════════════════════════════
// TRANSLATION DICTIONARY
// ══════════════════════════════════════════════
const LANG = {
  ar: {
    'qc0':'عقارات','qc1':'سيارات','qc2':'شاحنات','qc3':'إلكترونيات','qc4':'أزياء','qc5':'صحة وجمال','qc6':'وظائف','qc7':'ماشية','qc8':'ذهب',
    'qc-home':'معدات منزل','qc-energy':'طاقة','qc-travel':'رحلات',
    'f-all':'الكل','f-re':'عقارات','f-car':'سيارات','f-live':'ماشية','f-elec':'إلكترونيات','f-truck':'شاحنات','f-srv':'خدمات','f-fashion':'موضة',
    'nav-cats': 'الأقسام', 'nav-ads': 'الإعلانات', 'nav-prices': 'الأسعار', 'nav-about': 'من نحن',
    'nav-account': 'حسابي', 'nav-post': 'نشر', 'nav-packs': 'الباقات', 'nav-assistant': '✨ رزق ذكي', 'nav-investments': 'الاستثمارات', 'nav-home': 'الرئيسية', 'nav-fav-lbl': 'المفضلة',
    'hero-pill-sell': 'بيع', 'hero-pill-buy': 'اشتر', 'hero-pill-feat': 'تميّز',
    'hero-ai-smart': '✨ رزق ذكي — مساعدك على المنصة',
    'about-intro': '<strong style="color:var(--royal);font-size:1.05em">رزق</strong> — سوق موريتانيا الإلكتروني للإعلانات والأعمال. من الإعلان الفردي إلى المحلات والمعارض والمكاتب، وصولاً إلى غرفة المناقصات وغرفة الاستثمارات — فضاء ثقة طوّرته <strong style="color:var(--royal)"><a href="rizq_about.html" style="color:inherit;text-decoration:underline;text-underline-offset:3px">ADMINIA SARL</a></strong> ليجمع البائع والمشتري في كل الولايات. <em style="color:var(--gold-dk);font-style:normal;font-weight:700">كل ما تحتاجه… في مكان واحد، بأمان ووضوح.</em>',
    'nav-stores': 'المحلات', 'nav-offices': 'المكاتب', 'nav-showrooms': 'المعارض والمصانع', 'nav-tenders': 'المناقصات', 'nav-more': 'المزيد ▾', 'nav-legal-dd': 'المادة القانونية', 'nav-legal-mobile': '⚖️ الإشعار القانوني', 'nav-packages': 'الباقات',
    'dd-stores': 'المحلات', 'dd-offices': 'المكاتب', 'dd-rizqads': 'Rizq ADS', 'dd-ads': 'الإعلانات', 'dd-tenders': 'المناقصات', 'dd-packs': 'الباقات', 'dd-legal': 'المادة القانونية', 'dd-about': 'من نحن', 'dd-why': 'لماذا رزق', 'dd-company': 'الشركة المالكة',
    'vsh-title': 'معرضك على <span>رزق</span>: كتالوج فاخر ومشترون جادّون',
    'vsh-desc': 'سيارات وإلكترونيات وأثاث ومعدات تصل لمشترين جادّين يبحثون الآن.',
    'vsh-btn1': 'امتلك واجهة كتالوج معرضك الإلكتروني',
    'vsh-btn1-sub': 'اشترك الآن. عرضك يصل حيث يبحث الجادّون.',
    'vsh-card1-title': 'عرض يبيع قبل الرسالة', 'vsh-card1-desc': 'صور وأسعار تُقنع المشتري من أول نظرة قبل أن يراسلك.',
    'vsh-card2-title': 'تواصل بثقة عبر رزق', 'vsh-card2-desc': 'مشترون جادّون يصلون إليك مع خصوصية محمية دائماً.',
    'vsh-card3-title': 'شارة معرض موثّق', 'vsh-card3-desc': 'شارة رسمية على رزق تظهر على عروضك وتعزّز ثقة المشترين.',
    've-title': 'عقارك على <span>رزق</span>: واجهة واضحة ومشترون يبحثون الآن',
    've-desc': 'شقق ومنازل وأراضي ومحلات — اعرض عقارك حيث يبحث الجادّون في موريتانيا.',
    've-btn1': 'امتلك واجهتك العقارية على رزق',
    've-btn1-sub': 'اشترك الآن. عقارك يصل لمن يبحث بجدية.',
    've-card1-title': 'عرض يُقنع من أول نظرة', 've-card1-desc': 'صور ومساحة وسعر وموقع واضح — المشتري يفهم عرضك قبل أن يراسلك.',
    've-card2-title': 'وصول لمن يبحث عن عقار', 've-card2-desc': 'طلبة كراء ومشترون ومستأجرون يصلون إليك عبر بحث العقارات على رزق.',
    've-card3-title': 'ثقة ووضوح في التعامل', 've-card3-desc': 'تواصل مباشر عبر المنصة مع خصوصية محمية وشارات تساعد على بناء الثقة.',
    've-live': 'أحدث',
    've-live-sub': 'العقارات على رزق — عروض تليق بالجادّين',
    'browse-estate': 'عرض سوق كل العقارات ←',
    'est-title': 'أحدث عقارات على <span>رزق</span>',
    'est-desc': 'شقق وفلل وأراضي ومحلات — اعرض عقارك حيث يبحث الجادّون في موريتانيا بصور واسعة تليق ببوابة عقارية فخمة',
    'est-open-portal': '🏛 افتح النموذج الفاخر',
    'est-all': 'الكل', 'est-apt': 'شقق', 'est-villa': 'فلل', 'est-land': 'أراضي', 'est-shop': 'محلات',
    's-prices-title': 'نبضة السوق — <span style="background:linear-gradient(135deg,var(--gold),var(--gold-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">أسعار اليوم بوضوح</span>',
    's-prices-desc': 'أسعار اليوم في موريتانيا — قرار أوضح قبل أن تشتري أو تبيع',
    'prices-live': 'أحدث · آخر تحديث:',
    'prices-tab-food': '🍚 مواد غذائية', 'prices-tab-fuel': '⛽ محروقات', 'prices-tab-currencies': '💱 عملات',
    'prices-note': 'الأسعار تقريبية · عيّنة من نبضة السوق',
    'prices-browse-full': '📈 نبضة السوق — عرض كل الأسعار ←',
    'cta-badge1': 'انضم الآن', 'cta-badge2': 'أفراد · محلات · عقارات · وأكثر', 'cta-btn3': '🏢 افتح مساحتك على رزق',
    'cta-btn4': '📑 المناقصات',
    'cta-hubs-label': 'اختر مساحتك على رزق',
    'cta-hub-stores': 'المحلات', 'cta-hub-offices': 'المكاتب', 'cta-hub-showrooms': 'المعارض والمصانع', 'cta-hub-tenders': 'المناقصات', 'cta-hub-investments': 'الاستثمارات',
    'cta-hub-hint-stores': 'بيع وتسوّق يومي', 'cta-hub-hint-offices': 'خدمات مهنية', 'cta-hub-hint-showrooms': 'عروض راقية', 'cta-hub-hint-tenders': 'فرص أعمال', 'cta-hub-hint-investments': 'نمو مدروس',
    'cta-chip1': '✓ التسجيل مجاني', 'cta-chip2': '✓ منصة تنمو مع طموحك', 'cta-chip3': '✓ ثقة وأمان من أول خطوة',
    'cta-trust1': 'ثقة', 'cta-trust2': 'أمان', 'cta-trust3': 'شفافية',
    'vs-title': 'افتح محلك على <span>رزق</span> بواجهة كاملة لعملائك',
    'vs-desc': 'واجهتك باسمك: منتجاتك وثقة زبائنك في مكان يليق بمحلك.',
    'vs-btn1': 'امتلك واجهة محلك الإلكترونية',
    'vs-btn1-sub': 'اشترك الآن — سوقك الإلكتروني يبدأ من هنا.',
    'vs-card1-title': 'واجهة احترافية لمحلك', 'vs-card1-desc': 'شعار واسم تجاري وموقع واضح يبني ثقة الزبون من أول زيارة.',
    'vs-card2-title': 'كتالوج منظم بالصور', 'vs-card2-desc': 'منتجات بأسعار وصور واضحة يتصفّحها الزبون بسهولة قبل التواصل.',
    'vs-card3-title': 'نمو يُرى كل يوم', 'vs-card3-desc': 'زبائن أكثر وطلبات أوضح. محلك يكبر بثقة على رزق.',
    'vo-title': 'مكتبك الاحترافي على <span>رزق</span> يصل لطالبي الخدمة كل يوم',
    'vo-desc': 'حضور مهني يومي يجلب طلبات جديدة بثقة ممن يبحثون عن خدمتك.',
    'vo-cat1': 'وكالات التأمين', 'vo-cat2': 'الإجراءات الإدارية', 'vo-cat3': 'المكاتب العقارية',
    'vo-cat4': 'المحامون والموثقون', 'vo-cat5': 'الخدمات الإدارية', 'vo-cat6': 'استشارات أعمال',
    'vo-cat1-hint': 'أمّن ما يهمّك', 'vo-cat2-hint': 'معاملات بلا عناء', 'vo-cat3-hint': 'عقارك بأيدٍ أمينة',
    'vo-cat4-hint': 'حقك محفوظ', 'vo-cat5-hint': 'إنجاز يُنجَز', 'vo-cat6-hint': 'قرارات أوضح لنموك',
    'vo-spec-enter': 'ادخل تخصصك',
    'vo-feat1-title': 'حضور دائم على المنصة', 'vo-feat1-desc': 'مكتبك مفتوح على رزق طوال الوقت. يستكشفه الزبائن وتتلقى طلباتهم في أي وقت.',
    'vo-feat2-title': 'تواصل مباشر وسهل', 'vo-feat2-desc': 'واتساب وإيميل وهاتف: الزبون يصل إليك بنقرة واحدة.',
    'vo-feat3-title': 'شارة مكتب موثّق', 'vo-feat3-desc': 'شارة ذهبية على رزق تمنح عملاءك ثقة فورية في خدماتك.',
    'vo-feat4-title': 'خدماتك معروضة بوضوح', 'vo-feat4-desc': 'قائمة مرتّبة بما تقدّمه. يختار الزبون ما يناسبه ويتواصل مباشرة.',
    'vo-btn1': 'امتلك واجهتك المهنية الإلكترونية',
    'vo-btn1-sub': 'اشترك الآن — حضورك المهني لا يتوقف.',
    'vt-title': 'غرفة المناقصات على <span>رزق</span>',
    'vi-title': 'غرفة الاستثمارات على <span>رزق</span>',
    'vt-btn': '✨ امتلك مقعدك في غرفة المناقصات',
    'vt-btn-sub': 'اشترك الآن وافتح غرفة المناقصات',
    'vi-btn': '✨ امتلك حضورك في غرفة الاستثمارات',
    'vi-btn-sub': 'اشترك الآن وابدأ مسار النمو',
    'hero-badge': 'السوق الإلكتروني الموريتاني',
    'search-ph': 'البحث في رزق...',
    'nav-search-lbl': 'بحث',
    'search-theater-pill': 'ابحث في رزق…',
    'search-theater-heading': 'ابحث في رزق',
    'search-theater-go': 'بحث',
    'search-theater-hint': 'Esc للإغلاق · اكتب ثم Entrée',
    'search-theater-ph': 'عقارات، سيارات، ذهب…',
    'search-theater-close': 'إغلاق',
    'hbiz-stores': 'المحلات',
    'hbiz-offices': 'المكاتب',
    'hbiz-showrooms': 'المعارض والمصانع',
    'hbiz-estate': 'سوق العقارات',
    'hbiz-tenders': 'المناقصات',
    'hbiz-investments': 'الاستثمارات',
    'hbiz-pick': 'شاهد النماذج على رزق',
    'hbiz-kicker': 'منصة موريتانية للأعمال',
    'hero-tagline-lead': 'متجرك الافتراضي · مكتبك المهني · إعلانك المؤسسي',
    'hero-one-place': ' — كل شيء في مكان واحد',
    'hbiz-pick-sub': 'من محلك إلى استثمارك — حضورك المهني يبدأ من هنا',
    'hbiz-trust': 'Rizq ADS: مساحة واحدة في الرئيسية · أمام كل زائر · حضور يليق بعلامتك',
    'hbiz-browse': 'ابحث أو تصفّح الأقسام',
    'hbiz-browse-sub': 'عقارات، سيارات، ذهب… ابدأ من هنا خلال ثوانٍ',
    'promo-strip-sub': 'الإعلانات على رزق — عروض تخطف الأنظار',
    'hero-tagline': 'متجرك الافتراضي · مكتبك المهني · إعلانك المؤسسي — كل شيء في مكان واحد',
    'hbiz-stores-hint': 'بيع أقوى كل يوم', 'vs-own-site': 'موقعك الخاص على الإنترنت — بدون تكلفة موقع', 'id-privacy-notice': '🔒 صورة بطاقتك تُحذف نهائياً بعد التوثيق — نحتفظ برقمها فقط',
    'hbiz-offices-hint': 'عملاء يبحثون عنك',
    'hbiz-showrooms-hint': 'عرض يلفت الأنظار',
    'hbiz-estate-hint': 'عقارك يصل للجادّين',
    'hbiz-tenders-hint': 'فرص أعمال حقيقية',
    'hbiz-investments-hint': 'شراكات تنمو معك',
    'hbiz-inv-badge': 'جديد',
    'hbiz-tender-badge': 'جديد',
    'hbiz-estate-badge': 'جديد',
    'hbiz-new': 'جديد',
    'hbiz-cta': 'احجز مساحتك الإعلانية الآن — إعلانك حيث يبدأ الجميع',
    'vstrip-title': 'اكتشف العروض الجديدة بالفيديو',
    'vstrip-tier': 'شريط الفيديو',
    'vstrip-hint': 'مرّر الماوس للتشغيل', 'vstrip-hint-tap': 'اضغط لتشغيل الصوت 🔊',
    'stat-ads': 'إعلان نشط', 'stat-cats': 'قسماً رئيسياً', 'stat-subs': 'فرعاً متخصصاً', 'stat-wilayas': 'ولاية موريتانية', 'stat-free': 'النشر الأساسي',
    's-cats-title': 'كل ما تحتاجه في <span>مكان واحد</span>',
    's-cats-desc': 'من الدراعة إلى السيارة — كل ما يبحث عنه الموريتاني في مكان واحد',
    's-lst-tag': 'مختارات السوق',
    's-lst-title': 'أبرز العروض على <span>رزق</span>',
    's-lst-desc': 'فرص منتقاة تليق بذوقك — اكتشف أفضل ما يعرضه السوق الآن',
    'view-all': 'عرض الكل في نافذة ←',
    'browse-full': 'عرض كل الإعلانات ←',
    'browse-stores': 'عرض كل المحلات ←',
    'browse-showrooms': 'عرض كل المعارض والمصانع ←',
    'browse-offices': 'عرض كل المكاتب ←',
    'f-fashion': 'موضة',
    's-why-title': 'لماذا يثق الناس بـ<span>رزق؟</span>',
    's-why-desc': 'سوق موريتاني يثق به الناس — بيع، تسوّق، وأنمِ عملك بوضوح وطمأنينة',
    'why1-title': 'ثقة تليق بسوق موريتانيا',
    'why1-desc': 'رزق سوق جادّ للبيع والشراء — وضوح في التعامل، طمأنينة في التجربة، وسوق واحد يجمعك بالمشترين والبائعين.',
    'why2-title': 'سوق يغطي كل حاجة',
    'why2-desc': 'من العقارات إلى الإبل، من الدراعة إلى الحفارات — كل ما تبحث عنه في مكان واحد.',
    'why3-title': 'انشر في أقل من دقيقة',
    'why3-desc': 'صوّر، ضع السعر، انشر — إعلانك يصل لمشترين يبحثون الآن على رزق.',
    's-price-title': 'خطط <span>شفافة وبسيطة</span>',
    's-price-desc': 'ابدأ مجاناً وطوّر تجربتك متى شئت',
    'cta-title': 'جاهز تبدأ على رزق؟<br/><span>بيع، تسوّق، وأدر عملك من منصة واحدة</span>',
    'cta-desc': 'سجّل مجاناً وانشر إعلانك الأول اليوم — وافتح مساحتك التجارية على رزق متى شئت.',
    'cta-btn1': '🚀 سجّل الآن — مجاناً', 'cta-btn2': '📲 التطبيق قريباً', 'cta-btn-invest': '📈 الاستثمارات',
    'cta-note': '&nbsp;ابدأ الآن — بلا رسوم خفية',
    'ft-quick': 'روابط سريعة', 'ft-topcats': 'أبرز الأقسام', 'ft-help': 'المساعدة',
    'ft-q1':'الرئيسية','ft-q2':'تصفّح الإعلانات','ft-q3':'انشر إعلانك','ft-q4':'نبضة السوق','ft-q-dir':'دليل رزق','ft-q-estate-dir':'دليل سوق العقارات','ft-q5b':'من نحن','ft-q5c':'لماذا رزق','ft-q5':'الشركة المالكة',
    'ft-tc1':'🏠 منازل وعقارات','ft-tc2':'🚗 سيارات وقطع غيار','ft-tc3':'🚛 شاحنات ومعدات','ft-tc4':'📱 هواتف وإلكترونيات','ft-tc5':'🐄 ماشية وحيوانات',
    'ft-h1':'مركز المساعدة','ft-h2':'سياسة الخصوصية','ft-h3':'شروط الاستخدام','ft-h4':'الإبلاغ عن إعلان','ft-h5':'تواصل معنا',
    'ft-desc': 'سوق موريتانيا الإلكتروني للإعلانات والأعمال: محلات، معارض، مناقصات، واستثمارات.',
    'ft-net-label': 'على رزق:',
    'ft-trust1': 'ثقة', 'ft-trust2': 'أمان', 'ft-trust3': 'شفافية',
    'ft-contact': 'تواصل معنا',
    'ft-copy': '© 2026 رزق | Rizq — جميع الحقوق محفوظة 🇲🇷',
    'ft-sig': '<span>بتوقيع</span><span style="color:var(--gold)">✍️</span><strong style="font-weight:600">ADMINIA SARL — Powered by M. LIMAM</strong>',
    's-cats-tag': 'كل الأقسام',
    's-price-tag': 'خطط الأسعار',
    'sty-tag': 'أفكار الأنماط',
    'sty-title': 'إطلالات تليق بك على <span>رزق</span>',
    'sty-desc': 'موضة وإكسسوارات من محلات الملابس على المنصة — رجال، نساء، أولاد وبنات.',
    'sty-reshuffle': '🔀 إطلالات جديدة',
    'sty-men': 'رجال',
    'sty-women': 'نساء',
    'sty-boys': 'أولاد',
    'sty-girls': 'بنات',
    'sty-cta': 'تسوّق الإطلالة',
    'sty-from-view': 'من مشاهدتك',
    'srm-title': 'من قلب المعارض على <span>رزق</span>',
    'srm-desc': 'سيارات، أثاث، إلكترونيات ومعدات — عروض تليق بمعرض يليق بك',
    'srm-reshuffle': '🔀 عروض جديدة',
    'srm-cars': 'سيارات',
    'srm-electronics': 'إلكترونيات',
    'srm-furniture': 'أثاث ومفروشات',
    'srm-equipment': 'معدات ومكائن',
    'srm-building': 'مواد بناء',
    'srm-jewelry': 'مجوهرات',
    'srm-cta': 'تصفّح النموذج',
  },
  fr: {
    'nav-cats': 'Catégories', 'nav-ads': 'Annonces', 'nav-prices': 'Tarifs', 'nav-about': 'À propos',
    'nav-account': 'Compte', 'nav-post': 'Publier', 'nav-packs': 'Forfaits', 'nav-assistant': '✨ Rizq IA', 'nav-investments': 'Investissements', 'nav-home': 'Accueil', 'nav-fav-lbl': 'Favoris',
    'hero-pill-sell': 'Vendre', 'hero-pill-buy': 'Acheter', 'hero-pill-feat': 'Briller',
    'hero-ai-smart': '✨ Rizq IA — votre assistant',
    'about-intro': '<strong style="color:var(--royal);font-size:1.05em">Rizq</strong> — le marché électronique mauritanien des annonces et des affaires. De l\'annonce individuelle aux boutiques, showrooms et bureaux, jusqu\'à la salle des appels d\'offres et la salle des investissements — un espace de confiance développé par <strong style="color:var(--royal)"><a href="rizq_about.html" style="color:inherit;text-decoration:underline;text-underline-offset:3px">ADMINIA SARL</a></strong> qui réunit vendeurs et acheteurs dans toutes les wilayas. <em style="color:var(--gold-dk);font-style:normal;font-weight:700">Tout ce qu\'il vous faut… au même endroit, en sécurité et en clarté.</em>',
    'nav-stores': 'Boutiques', 'nav-offices': 'Bureaux', 'nav-showrooms': 'Showrooms & usines', 'nav-tenders': 'A-doffres', 'nav-more': 'Plus ▾', 'nav-legal-dd': 'Mentions légales', 'nav-legal-mobile': '⚖️ Avis légal', 'nav-packages': 'Forfaits',
    'dd-stores': 'Boutiques', 'dd-offices': 'Bureaux', 'dd-rizqads': 'Rizq ADS', 'dd-ads': 'Annonces', 'dd-tenders': 'Appels d\'offres', 'dd-packs': 'Forfaits', 'dd-legal': 'Mentions légales', 'dd-about': 'À propos', 'dd-why': 'Pourquoi Rizq', 'dd-company': 'Société propriétaire',
    'vsh-title': 'Votre showroom sur <span>Rizq</span> : catalogue premium et acheteurs sérieux',
    'vsh-desc': 'Voitures, électronique, meubles et équipements pour des acheteurs sérieux, dès maintenant.',
    'vsh-btn1': 'Possédez la vitrine catalogue de votre showroom',
    'vsh-btn1-sub': 'Abonnez-vous — votre offre atteint les acheteurs sérieux.',
    'vsh-card1-title': 'Une offre qui convainc avant le message', 'vsh-card1-desc': 'Photos et prix qui séduisent au premier regard, avant même qu\'on vous contacte.',
    'vsh-card2-title': 'Contactez en confiance via Rizq', 'vsh-card2-desc': 'Des acheteurs sérieux vous rejoignent, avec une confidentialité toujours protégée.',
    'vsh-card3-title': 'Badge Showroom vérifié', 'vsh-card3-desc': 'Un badge officiel sur Rizq visible sur vos offres pour renforcer la confiance.',
    've-title': 'Votre bien sur <span>Rizq</span> : vitrine claire et acheteurs actifs',
    've-desc': 'Appartements, maisons, terrains et locaux — présentez votre bien là où cherchent les acheteurs sérieux en Mauritanie.',
    've-btn1': 'Possédez votre vitrine immobilière sur Rizq',
    've-btn1-sub': 'Abonnez-vous — votre bien atteint ceux qui cherchent vraiment.',
    've-card1-title': 'Une offre convaincante au premier regard', 've-card1-desc': 'Photos, surface, prix et emplacement clairs — l\'acheteur comprend avant de vous écrire.',
    've-card2-title': 'Atteignez qui cherche un bien', 've-card2-desc': 'Locataires et acheteurs vous rejoignent via la recherche immobilière sur Rizq.',
    've-card3-title': 'Confiance et clarté', 've-card3-desc': 'Contact direct via la plateforme, confidentialité protégée et badges de confiance.',
    've-live': 'Récent',
    've-live-sub': 'Dernières offres immobilières sur Rizq — des offres pour acheteurs sérieux',
    'browse-estate': 'Voir tout le marché immobilier →',
    'est-title': 'Derniers biens sur <span>Rizq</span>',
    'est-desc': 'Appartements, villas, terrains et locaux — présentez votre bien là où cherchent les acheteurs sérieux, en grandes images',
    'est-open-portal': '🏛 Ouvrir le modèle premium',
    'est-all': 'Tout', 'est-apt': 'Appartements', 'est-villa': 'Villas', 'est-land': 'Terrains', 'est-shop': 'Locaux',
    's-prices-title': 'Le Pouls du Marché — <span style="background:linear-gradient(135deg,var(--gold),var(--gold-light));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">les prix du jour, clairement</span>',
    's-prices-desc': 'Les prix du jour en Mauritanie — décidez plus clairement avant d\'acheter ou de vendre',
    'prices-live': 'Récent · Dernière mise à jour :',
    'prices-tab-food': '🍚 Denrées alimentaires', 'prices-tab-fuel': '⛽ Carburants', 'prices-tab-currencies': '💱 Devises',
    'prices-note': 'Prix indicatifs · aperçu du pouls du marché',
    'prices-browse-full': '📈 Pouls du marché — tous les prix →',
    'cta-badge1': 'Rejoignez-nous', 'cta-badge2': 'Particuliers · Boutiques · Immobilier · et plus', 'cta-btn3': '🏢 Ouvrir mon espace sur Rizq',
    'cta-btn4': '📑 Appels d\'offres',
    'cta-hubs-label': 'Choisissez votre espace sur Rizq',
    'cta-hub-stores': 'Boutiques', 'cta-hub-offices': 'Bureaux', 'cta-hub-showrooms': 'Showrooms & usines', 'cta-hub-tenders': 'Appels d\'offres', 'cta-hub-investments': 'Investissements',
    'cta-hub-hint-stores': 'Vente au quotidien', 'cta-hub-hint-offices': 'Services pro', 'cta-hub-hint-showrooms': 'Offres premium', 'cta-hub-hint-tenders': 'Opportunités', 'cta-hub-hint-investments': 'Croissance',
    'cta-chip1': '✓ Inscription gratuite', 'cta-chip2': '✓ Une plateforme à la hauteur de votre ambition', 'cta-chip3': '✓ Confiance et sécurité dès le départ',
    'cta-trust1': 'Confiance', 'cta-trust2': 'Sécurité', 'cta-trust3': 'Transparence',
    'vs-title': 'Ouvrez votre boutique sur <span>Rizq</span> avec une vitrine complète pour vos clients',
    'vs-desc': 'Votre vitrine à votre nom : produits et confiance clients dans un espace digne de votre boutique.',
    'vs-btn1': 'Possédez la vitrine électronique de votre boutique',
    'vs-btn1-sub': 'Abonnez-vous — votre marché électronique commence ici.',
    'vs-card1-title': 'Une vitrine professionnelle', 'vs-card1-desc': 'Logo, nom commercial et emplacement clairs pour inspirer confiance dès la première visite.',
    'vs-card2-title': 'Catalogue photo organisé', 'vs-card2-desc': 'Produits avec prix et photos clairs que le client consulte facilement avant de vous contacter.',
    'vs-card3-title': 'Une croissance visible chaque jour', 'vs-card3-desc': 'Plus de clients et des demandes plus claires. Votre boutique grandit sur Rizq.',
    'vo-title': 'Votre bureau pro sur <span>Rizq</span> atteint ceux qui cherchent un service',
    'vo-desc': 'Une présence pro quotidienne qui attire de nouvelles demandes de ceux qui cherchent votre service.',
    'vo-cat1': "Agences d'assurance", 'vo-cat2': 'Démarches admin.', 'vo-cat3': 'Agences immobilières',
    'vo-cat4': 'Avocats & notaires', 'vo-cat5': 'Services admin.', 'vo-cat6': 'Conseil aux entreprises',
    'vo-cat1-hint': 'Protégez l\'essentiel', 'vo-cat2-hint': 'Des démarches sans stress', 'vo-cat3-hint': 'Votre bien entre de bonnes mains',
    'vo-cat4-hint': 'Vos droits protégés', 'vo-cat5-hint': 'L\'essentiel, accompli', 'vo-cat6-hint': 'Des décisions plus claires',
    'vo-spec-enter': 'Entrez votre spécialité',
    'vo-feat1-title': 'Une présence permanente', 'vo-feat1-desc': 'Votre bureau reste ouvert sur Rizq. Les clients explorent et vous envoient leurs demandes à tout moment.',
    'vo-feat2-title': 'Contact direct et simple', 'vo-feat2-desc': 'WhatsApp, e-mail et téléphone : le client vous joint en un clic.',
    'vo-feat3-title': 'Badge Bureau certifié', 'vo-feat3-desc': 'Un badge or sur Rizq qui inspire immédiatement confiance à vos clients.',
    'vo-feat4-title': 'Vos services bien présentés', 'vo-feat4-desc': 'Une liste claire de ce que vous offrez. Le client choisit et vous contacte directement.',
    'vo-btn1': 'Possédez votre vitrine professionnelle en ligne',
    'vo-btn1-sub': 'Abonnez-vous — votre présence pro ne s\'arrête pas.',
    'vt-title': 'La salle des appels d\'offres sur <span>Rizq</span>',
    'vi-title': 'La salle des investissements sur <span>Rizq</span>',
    'vt-btn': '✨ Réservez votre place dans la salle des appels d\'offres',
    'vt-btn-sub': 'Abonnez-vous et ouvrez la salle des appels d\'offres',
    'vi-btn': '✨ Affirmez votre présence dans la salle des investissements',
    'vi-btn-sub': 'Abonnez-vous et démarrez votre trajectoire de croissance',
    'hero-badge': 'Le marché en ligne mauritanien',
    'search-ph': 'Rechercher sur Rizq...',
    'nav-search-lbl': 'Recherche',
    'search-theater-pill': 'Rechercher sur Rizq…',
    'search-theater-heading': 'Rechercher sur Rizq',
    'search-theater-go': 'Rechercher',
    'search-theater-hint': 'Échap pour fermer · Entrée pour lancer',
    'search-theater-ph': 'Immobilier, voitures, or…',
    'search-theater-close': 'Fermer',
    'hbiz-stores': 'Boutiques',
    'hbiz-offices': 'Bureaux',
    'hbiz-showrooms': 'Showrooms & usines',
    'hbiz-estate': 'Marché immobilier',
    'hbiz-tenders': 'Appels d\'offres',
    'hbiz-investments': 'Investissements',
    'hbiz-pick': 'Découvrez les modèles sur Rizq',
    'hbiz-kicker': 'Plateforme mauritanienne pour les affaires',
    'hero-tagline-lead': 'Boutique virtuelle · Bureau pro · Pub institutionnelle',
    'hero-one-place': ' — tout en un seul endroit',
    'hbiz-pick-sub': 'De votre boutique à votre investissement — votre présence pro commence ici',
    'hbiz-trust': 'Rizq ADS : un espace unique sur l\'accueil · face à chaque visiteur · une présence digne de votre marque',
    'hbiz-browse': 'Recherchez ou parcourez les catégories',
    'hbiz-browse-sub': 'Immobilier, voitures, or… commencez en quelques secondes',
    'promo-strip-sub': 'Dernières annonces sur Rizq — offres qui impressionnent',
    'hero-tagline': 'Boutique virtuelle · Bureau pro · Pub institutionnelle — tout en un seul endroit',
    'hbiz-stores-hint': 'Vendez plus fort chaque jour', 'vs-own-site': 'Votre site sur internet — sans coût de site', 'id-privacy-notice': '🔒 La photo de votre pièce est définitivement supprimée après vérification — seul le numéro est conservé',
    'hbiz-offices-hint': 'Des clients vous cherchent',
    'hbiz-showrooms-hint': 'Une vitrine qui attire',
    'hbiz-estate-hint': 'Votre bien atteint les acheteurs sérieux',
    'hbiz-tenders-hint': 'De vraies opportunités',
    'hbiz-investments-hint': 'Des partenariats qui grandissent',
    'hbiz-inv-badge': 'Nouveau',
    'hbiz-tender-badge': 'Nouveau',
    'hbiz-estate-badge': 'Nouveau',
    'hbiz-new': 'Nouveau',
    'hbiz-cta': 'Réservez votre espace pub maintenant — votre annonce là où tout commence',
    'vstrip-title': 'Découvrez les nouvelles offres en vidéo',
    'vstrip-tier': 'Bandeau vidéo',
    'vstrip-hint': 'Survolez pour lire', 'vstrip-hint-tap': 'Appuyez pour activer le son 🔊',
    'stat-ads': 'annonces actives', 'stat-cats': 'catégories', 'stat-subs': 'sous-catégories', 'stat-wilayas': 'wilayas', 'stat-free': 'Publication de base',
    's-cats-title': 'Tout ce dont vous avez besoin en <span>un seul endroit</span>',
    's-cats-desc': 'De la daraa à la voiture — tout ce que cherche le Mauritanien, au même endroit',
    's-lst-tag': 'Sélection du marché',
    's-lst-title': 'Les meilleures offres sur <span>Rizq</span>',
    's-lst-desc': 'Des opportunités choisies pour vous — découvrez le meilleur du marché maintenant',
    'view-all': 'Tout voir en fenêtre →',
    'browse-full': 'Voir toutes les annonces →',
    'browse-stores': 'Voir toutes les boutiques →',
    'browse-showrooms': 'Voir tous les showrooms & usines →',
    'browse-offices': 'Voir tous les bureaux →',
    'f-fashion': 'Mode',
    's-why-title': 'Pourquoi faire confiance à <span>Rizq?</span>',
    's-why-desc': 'Un marché mauritanien de confiance — vendez, achetez et développez votre activité en toute sérénité',
    'why1-title': 'Une confiance digne du marché mauritanien',
    'why1-desc': 'Rizq, un marché sérieux pour acheter et vendre — clarté dans les échanges, sérénité dans l\'expérience, et un marché qui relie vendeurs et acheteurs.',
    'why2-title': 'Un marché pour chaque besoin',
    'why2-desc': 'De l\'immobilier aux chameaux, de la daraa aux engins — tout ce que vous cherchez au même endroit.',
    'why3-title': 'Publiez en moins d\'une minute',
    'why3-desc': 'Photographiez, fixez le prix, publiez — votre annonce atteint des acheteurs déjà actifs sur Rizq.',
    's-price-title': 'Offres <span>simples et transparentes</span>',
    's-price-desc': 'Commencez gratuitement, évoluez quand vous voulez',
    'cta-title': 'Prêt à commencer sur Rizq?<br/><span>Vendez, achetez et gérez depuis une seule plateforme</span>',
    'cta-desc': 'Inscrivez-vous gratuitement et publiez votre première annonce — puis ouvrez votre espace pro sur Rizq quand vous voulez.',
    'cta-btn1': '🚀 S\'inscrire — Gratuit', 'cta-btn2': '📲 L\'app bientôt', 'cta-btn-invest': '📈 Investissements',
    'cta-note': '&nbsp;Commencez maintenant — sans frais cachés',
    'ft-quick': 'Liens rapides', 'ft-topcats': 'Meilleures catégories', 'ft-help': 'Aide',
    'ft-q1':'Accueil','ft-q2':'Parcourir les annonces','ft-q3':'Publier une annonce','ft-q4':'Pouls du marché','ft-q-dir':'Annuaire Rizq','ft-q-estate-dir':'Annuaire immobilier','ft-q5b':'À propos','ft-q5c':'Pourquoi Rizq','ft-q5':'Société propriétaire',
    'ft-tc1':'🏠 Immobilier','ft-tc2':'🚗 Voitures & pièces','ft-tc3':'🚛 Camions & engins','ft-tc4':'📱 Téléphones & électronique','ft-tc5':'🐄 Bétail & animaux',
    'ft-h1':'Centre d\'aide','ft-h2':'Politique de confidentialité','ft-h3':'Conditions d\'utilisation','ft-h4':'Signaler une annonce','ft-h5':'Contactez-nous',
    'ft-desc': 'Le marché électronique mauritanien des annonces et des affaires : boutiques, showrooms, appels d\'offres et investissements.',
    'ft-net-label': 'Sur Rizq :',
    'ft-trust1': 'Confiance', 'ft-trust2': 'Sécurité', 'ft-trust3': 'Transparence',
    'ft-contact': 'Contactez-nous',
    'ft-copy': '© 2026 Rizq — Tous droits réservés 🇲🇷',
    'ft-sig': '<span>Signé par</span><span style="color:var(--gold)">✍️</span><strong style="font-weight:600">ADMINIA SARL — Powered by M. LIMAM</strong>',
    's-cats-tag': 'Toutes les catégories',
    's-price-tag': 'Offres tarifaires',
    'sty-tag': 'Idées de style',
    'sty-title': 'Des looks dignes de vous sur <span>Rizq</span>',
    'sty-desc': 'Mode et accessoires issus des boutiques vêtements sur Rizq — hommes, femmes, garçons et filles.',
    'sty-reshuffle': '🔀 Nouveaux looks',
    'sty-men': 'Hommes',
    'sty-women': 'Femmes',
    'sty-boys': 'Garçons',
    'sty-girls': 'Filles',
    'sty-cta': 'Voir le look',
    'sty-from-view': 'Vu récemment',
    'srm-title': 'Au cœur des showrooms sur <span>Rizq</span>',
    'srm-desc': 'Voitures, meubles, électronique et équipements — des offres dignes de votre prochain showroom',
    'srm-reshuffle': '🔀 Nouvelles offres',
    'srm-cars': 'Voitures',
    'srm-electronics': 'Électronique',
    'srm-furniture': 'Meubles & ameublement',
    'srm-equipment': 'Équipements & machines',
    'srm-building': 'Matériaux de construction',
    'srm-jewelry': 'Bijoux',
    'srm-cta': 'Voir le modèle',
    'qc0':'Immobilier','qc1':'Voitures','qc2':'Camions','qc3':'Électronique','qc4':'Mode','qc5':'Santé','qc6':'Emplois','qc7':'Bétail','qc8':'Or',
    'qc-home':'Électroménager','qc-energy':'Énergie','qc-travel':'Voyages',
    'f-all':'Tout','f-re':'Immobilier','f-car':'Voitures','f-live':'Bétail','f-elec':'Électronique','f-truck':'Camions','f-srv':'Services','f-fashion':'Mode',
  }
};

// Category names
var _catNamesInit = (typeof RizqCategories !== 'undefined') ? RizqCategories.catNamesArrays() : {
  ar: ['منازل وعقارات','سيارات وقطع غيار','وكالات تأمين المركبات','شاحنات ومعدات ثقيلة','هواتف وإلكترونيات','موضة وأزياء','ذهب ومجوهرات','صحة وجمال','وظائف وفرص عمل','خدمات ومهن','أثاث وديكور','بناء ومقاولات','تجارة وصناعة','رياضة وهوايات','تعليم وثقافة','أغذية ومطاعم','فنون وحرف يدوية','ماشية ودواجن وبيطرة'],
  fr: ['Immobilier','Voitures & pièces',"Agences d'assurance véhicules",'Camions & engins','Téléphones & électronique','Mode & vêtements','Or & bijoux','Santé & beauté','Emplois','Services & métiers','Meubles & décor','Construction','Commerce & industrie','Sports & loisirs','Éducation & culture','Alimentation','Arts & artisanat','Bétail, volaille & vétérinaire']
};
const CAT_NAMES = _catNamesInit;
/* كان الاستدعاء هنا يسبق تنفيذ rizq_categories_config.js (defer) فيبقى
   #builtin-cats-mount فارغاً ولا تظهر إلا بطاقة «اقترح قسماً» — إصلاح السباق. */
function _rizqBootCategoryGrid() {
  try {
    if (typeof RizqCategories !== 'undefined' && typeof RizqCategories.catNamesArrays === 'function') {
      var names = RizqCategories.catNamesArrays();
      if (names && names.ar && names.ar.length) {
        CAT_NAMES.ar = names.ar;
        CAT_NAMES.fr = names.fr || CAT_NAMES.fr;
      }
    }
  } catch (eBootNames) { /* ignore */ }
  try { if (typeof mergeSubFrFromConfig === 'function') mergeSubFrFromConfig(); } catch (eMerge) { /* ignore */ }
  _rizqInitBuiltinCategories();
  try { if (typeof renderExtraCategories === 'function') renderExtraCategories(); } catch (eEx) { /* ignore */ }
  try { if (typeof renderSuggestCard === 'function') renderSuggestCard(); } catch (eSug) { /* ignore */ }
  try { if (typeof refreshCatStatsText === 'function') refreshCatStatsText(); } catch (eSt) { /* ignore */ }
  /* بطاقات الأقسام تُبنى بالعربية دائماً — أعد تطبيق الترجمة إن كانت FR
     محفوظة، حتى لا تبقى الفروع عربية بعد سباق DOMContentLoaded. */
  try {
    var bootLang = 'ar';
    try { bootLang = localStorage.getItem('rizq_lang') || 'ar'; } catch (eL) {}
    if (bootLang === 'fr' && typeof translateCatTaxonomy === 'function') {
      translateCatTaxonomy(true);
    }
  } catch (eTxBoot) { /* ignore */ }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _rizqBootCategoryGrid);
} else {
  setTimeout(_rizqBootCategoryGrid, 0);
}

const QCAT_NAMES = {
  ar: ['عقارات','سيارات','شاحنات','إلكترونيات','أزياء','ذهب','صحة وجمال','وظائف','ماشية'],
  fr: ['Immobilier','Voitures','Camions','Électronique','Mode','Or','Santé & beauté','Emplois','Bétail']
};

// Subcategory translations for dropdown
const SUB_FR = {
  'شقق للبيع':'Appartements à vendre','منازل وفيلات':'Maisons & villas','أراضي':'Terrains','محلات تجارية':'Locaux commerciaux','مكاتب ومستودعات':'Bureaux & entrepôts','غرف للكراء':'Chambres à louer','شقق للكراء':'Appartements à louer','منازل للكراء':'Maisons à louer','محلات للكراء':'Locaux à louer','إيجار يومي / سياحي':'Location journalière / touristique',
  'سيارات للبيع':'Voitures à vendre','سيارات للكراء':'Voitures à louer','سيارات كهربائية وهجينة':'Voitures électriques et hybrides','دراجات نارية':'Motos & scooters','قطع غيار':'Pièces détachées','إطارات وبطاريات':'Pneus & batteries','زيوت ومستلزمات':'Huiles & accessoires','تجهيز وتزيين':'Équipement & tuning',
  'شاحنات للبيع':'Camions à vendre','شاحنات للكراء':'Camions à louer','حافلات وباصات':'Bus & autocars','مقطورات وصهاريج':'Remorques & citernes','معدات بناء للبيع':'Engins de chantier à vendre','معدات بناء للكراء':'Engins de chantier à louer','معدات زراعية':'Matériel agricole','قطع غيار ثقيلة':'Pièces poids lourds',
  'هواتف ذكية':'Smartphones','لابتوب وحاسوب':'Laptops & ordinateurs','شاشات وتلفزيون':'Écrans & télévisions','أجهزة منزلية':'Électroménager','كاميرات ودرونز':'Caméras & drones','سماعات وصوتيات':'Casques & audio','شواحن وإكسسوارات':'Chargeurs & accessoires',
  'دراعة رجالية':'Daraa homme','ملحفة نسائية':'Melhfa femme','طرح وأغطية رأس':'Voiles & couvre-chefs','ملابس رجالية':'Vêtements homme','ملابس نسائية وأطفال':'Vêtements femme & enfant','أحذية وحقائب':'Chaussures & sacs','مجوهرات وذهب':'Bijoux & or','عطور ومستحضرات':'Parfums & cosmétiques',
  'أدوية ومكملات':'Médicaments & compléments','أجهزة طبية':'Matériel médical','مستحضرات طبيعية':'Produits naturels','عطور ومنتجات عناية':'Parfums & soins','أجهزة عناية شخصية':'Appareils de soin',
  'إدارة وتسويق':'Administration & marketing','هندسة وتقنية':'Ingénierie & technique','صحة وطب':'Santé & médecine','تعليم وتدريب':'Enseignement & formation','نقل وسياقة':'Transport & conduite','أبحث عن عمل':'Je cherche du travail','فريلانس وعمل حر':'Freelance','تدريب وتربص':'Stage & formation',
  'نقل وشحن':'Transport & livraison','تنظيف ومكافحة حشرات':'Nettoyage & désinsectisation','بناء ودهان وسباكة':'Bâtiment & plomberie','صيانة وإصلاح':'Maintenance & réparation','دروس خصوصية':'Cours particuliers','تصميم وبرمجة':'Design & programmation','تصوير وإعلام':'Photo & médias','حلاقة وتجميل':'Coiffure & beauté',
  'أثاث غرف نوم':'Meubles chambre','أثاث صالون':'Meubles salon','أثاث مطبخ':'Meubles cuisine','أثاث حمام':'Meubles salle de bain','أثاث مكتبي وأطفال':'Meubles bureau & enfants','ستائر وسجاد':'Rideaux & tapis','إضاءة وديكور':'Éclairage & décoration','أجهزة مطبخ':'Appareils de cuisine',
  'أسمنت وحديد':'Ciment & fer','طوب وسيراميك':'Briques & céramique','أخشاب وأبواب':'Bois & portes','سباكة وكهرباء':'Plomberie & électricité','دهانات وعزل مائي':'Peintures & étanchéité','ألواح شمسية':'Panneaux solaires','أدوات بناء':'Outils de construction',
  'معدات تجارية':'Équipements commerciaux','بضائع بالجملة':'Marchandises en gros','استيراد وتصدير':'Import & export','معدات صناعية':'Équipements industriels','شراكات تجارية':'Partenariats','فرص استثمارية':'Opportunités d\'investissement',
  'معدات رياضية':'Équipements sportifs','دراجات هوائية':'Vélos','صيد وغوص':'Pêche & plongée','ألعاب فيديو':'Jeux vidéo','موسيقى وآلات':'Musique & instruments','هوايات وتحف':'Loisirs & antiquités',
  'كتب مدرسية وجامعية':'Livres scolaires & universitaires','كتب دينية وعامة':'Livres religieux & généraux','أدوات مدرسية':'Fournitures scolaires','دورات تدريبية':'Formations','قرطاسية ومكتبية':'Papeterie',
  'تمر وحبوب وأرز':'Dattes, céréales & riz','لحوم وأسماك':'Viandes & poissons','خضروات وفواكه':'Légumes & fruits','ألبان ومنتجات':'Produits laitiers','حلويات ومخبوزات':'Pâtisseries & boulangerie','مشروبات وعصائر':'Boissons & jus','مطاعم وكافيهات':'Restaurants & cafés',
  'لوحات وخط عربي':'Tableaux & calligraphie','تصوير فوتوغرافي':'Photographie','صناعة تقليدية':'Artisanat traditionnel','مجوهرات يدوية':'Bijoux artisanaux','نسيج وخياطة يدوية':'Tissage & couture',
  'إبل':'Chameaux','بقر':'Bovins','غنم وماعز':'Ovins & caprins','لبن طازج (ناقة وبقرة)':'Lait frais (chamelle & vache)','بيض طازج':'Œufs frais','أعلاف ومستلزمات':'Aliments & accessoires','دواجن وطيور':'Volailles & oiseaux','بيض دواجن':'Œufs de volaille',
  // Group titles
  'للبيع':'À vendre','للكراء':'À louer','سيارات':'Voitures','ملحقات':'Accessoires','مركبات':'Véhicules','معدات':'Équipements','أجهزة':'Appareils','ملابس تقليدية 🇲🇷':'Vêtements traditionnels 🇲🇷','ملابس وإكسسوارات':'Vêtements & accessoires','صحة':'Santé','جمال':'Beauté','وظائف متاحة':'Emplois disponibles','أخرى':'Autres','خدمات منزلية':'Services à domicile','خدمات متخصصة':'Services spécialisés','أثاث':'Meubles','ديكور':'Décoration','مواد بناء':'Matériaux de construction','تجهيزات':'Équipements','تجارة':'Commerce','استثمار':'Investissement','رياضة':'Sport','ترفيه':'Loisirs','كتب':'Livres','مواد غذائية':'Produits alimentaires','مطاعم':'Restaurants','فنون':'Arts','حرف موريتانية':'Artisanat mauritanien','ماشية':'Bétail','دواجن وأخرى':'Volailles & autres','منتجات حيوانية':'Produits animaux','دواجن':'Volailles',
  // Gold category — group titles
  '🥇 ذهب للبيع':'🥇 Or à vendre',
  '💎 مجوهرات نسائية':'💎 Bijoux femme',
  '👑 مجوهرات تقليدية 🇲🇷':'👑 Bijoux traditionnels 🇲🇷',
  '📊 ذهب استثمار وخدمات':'📊 Or investissement & services',
  '💍 فضة وأحجار':'💍 Argent & pierres',
  // Gold category — subcategories
  'ذهب عيار 24 — خالص':'Or 24 carats — pur',
  'ذهب عيار 22':'Or 22 carats',
  'ذهب عيار 21':'Or 21 carats',
  'ذهب عيار 18':'Or 18 carats',
  'ذهب خردة وقطع':'Or de récupération & pièces',
  'سبائك ذهبية':'Lingots d\'or',
  'أساور وخلاخيل':'Bracelets & chevillières',
  'خواتم وحلقات':'Bagues & anneaux',
  'عقود وقلادات':'Colliers & pendentifs',
  'أقراط وحلق':'Boucles d\'oreilles',
  'طقم مجوهرات كامل':'Parure complète',
  'خاتم موريتاني تقليدي':'Bague mauritanienne traditionnelle',
  'لبس العروس':'Parure de mariée',
  'حلي فضية':'Bijoux en argent',
  'مجوهرات يدوية':'Bijoux artisanaux',
  'ذهب للمهر والزواج':'Or pour dot & mariage',
  'شراء بالوزن (غرام / مثقال)':'Achat au poids (gramme / mithqal)',
  'تقييم وتثمين الذهب':'Évaluation & expertise de l\'or',
  'إعادة صياغة وتصنيع':'Refonte & fabrication',
  'صائغ — خدمة تصميم':'Bijoutier — service sur mesure',
  'مجوهرات فضية':'Bijoux en argent',
  'أحجار كريمة':'Pierres précieuses',
  'ألماس وزمرد':'Diamants & émeraudes',
  'بيطرة':'Vétérinaire',
  'عيادات بيطرية':'Cliniques vétérinaires',
  'أدوية وعلاجات حيوانات':'Médicaments & traitements vétérinaires',
  'تطعيمات وفحوصات':'Vaccinations & examens',
  'مستلزمات ومعدات بيطرية':'Fournitures & équipements vétérinaires',
  'أدوية بيطرية':'Médicaments vétérinaires',
  'أنواع التأمين':"Types d'assurance",
  'خدمات الوكالات':'Services des agences',
  'تأمين سيارات خاصة':'Assurance voitures particulières',
  'تأمين شاحنات ونقل':'Assurance camions & transport',
  'تأمين آلات ومعدات ثقيلة':'Assurance engins & équipements lourds',
  'تأمين دراجات نارية':'Assurance motos',
  'تجديد رخص وتأمين':'Renouvellement permis & assurance',
  'تقييم أضرار وحوادث':'Expertise dommages & accidents',
  'استشارات ووساطة تأمين':'Conseil & courtage en assurance'
};
/* rizq_categories_config.js محمّل بـ defer فيُنفَّذ بعد السكربت المضمّن —
   لذلك يجب دمج SUB_FR/GROUP_FR عند الاستعمال وليس عند التحليل. */
function mergeSubFrFromConfig() {
  try {
    if (typeof RizqCategories === 'undefined') return;
    if (RizqCategories.SUB_FR) Object.assign(SUB_FR, RizqCategories.SUB_FR);
    if (RizqCategories.GROUP_FR) Object.assign(SUB_FR, RizqCategories.GROUP_FR);
  } catch (eMergeSub) { /* ignore */ }
  window._subFR = SUB_FR;
}
mergeSubFrFromConfig();
window._subFR = SUB_FR;

function translateCatTaxonomy(toFr) {
  mergeSubFrFromConfig();
  document.querySelectorAll('.drop-link, .drop-group-title').forEach(function(el) {
    if (el.closest('[data-extra="1"], [data-suggest="1"]')) return;
    var current = (el.textContent || '').trim();
    if (!el.hasAttribute('data-ar')) {
      var arKey = current;
      if (toFr && !SUB_FR[current]) {
        Object.keys(SUB_FR).some(function(k){ if (SUB_FR[k] === current) { arKey = k; return true; } return false; });
      }
      el.setAttribute('data-ar', arKey);
    }
    var ar = el.getAttribute('data-ar');
    el.textContent = toFr ? (SUB_FR[ar] || ar) : ar;
  });
  document.querySelectorAll('.cat-card:not([data-extra="1"]):not([data-suggest="1"]) .cat-name').forEach(function(el) {
    var current = (el.textContent || '').trim();
    if (!el.hasAttribute('data-ar')) {
      var arKey = current;
      var fi = CAT_NAMES.fr.indexOf(current);
      if (fi >= 0) arKey = CAT_NAMES.ar[fi];
      el.setAttribute('data-ar', arKey);
    }
    var ar = el.getAttribute('data-ar');
    var ai = CAT_NAMES.ar.indexOf(ar);
    el.textContent = toFr ? (ai >= 0 ? CAT_NAMES.fr[ai] : ar) : ar;
  });
}
