// ══════════════════════════════════════════════
// MAIN TOGGLE FUNCTION
// ══════════════════════════════════════════════
function applyLandingLang(toAr) {
  isAr = !!toAr;
  const lang = isAr ? 'ar' : 'fr';
  try { localStorage.setItem('rizq_lang', lang); } catch(e) {}
  mergeSubFrFromConfig();
  const t = LANG[lang] || LANG.ar || {};
  if (!t || typeof t !== 'object') return;

  // Direction & lang
  document.documentElement.lang = lang;
  document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
  if (document.body) {
    document.body.classList.toggle('rizq-lang-ar', isAr);
    document.body.classList.toggle('rizq-lang-fr', !isAr);
  }
  document.title = isAr ? 'رزق | Rizq — سوق موريتانيا الإلكتروني' : 'Rizq — Le marché électronique mauritanien';
  try { RizqI18n.stripLeakedDirs(); } catch (eD) {}
  if (window.RizqI18n && typeof window.RizqI18n.paintAllLangButtons === 'function') {
    window.RizqI18n.paintAllLangButtons();
  } else {
    document.querySelectorAll('.btn-lang, .btn-lang-primary, .rizq-reg-chrome-lang, #nav-lang-btn, #rizq-lang-btn, #rizq-desk-lang-btn').forEach(function(b) {
      if (window.RizqI18n && typeof window.RizqI18n.paintPrimaryLangBtn === 'function') {
        window.RizqI18n.paintPrimaryLangBtn(b);
      }
    });
  }
  // ملاحظة: شارة الإشعار القانوني (nav-disclaimer-txt / fixed-disc-pill) لم تعد
  // تُحدَّث هنا يدوياً — localStorage.setItem('rizq_lang',...) أعلاه يُشغّل
  // تلقائياً تصحيح rizq_disclaimer.js المشترك، وهو يراعي أيضاً نص الأدمن
  // المخصص (كان هذا التحديث اليدوي هنا يمحوه عند كل تبديل لغة قبل هذا الإصلاح).

  // Nav-center follows the root dir (no leftover RTL when French is active)
  const navCenter = document.querySelector('.nav-center');
  if(navCenter) navCenter.style.direction = '';

  // ── Generic reversible translator: any element/input tagged with
  //    data-t-fr (or data-ph-fr for placeholders) gets swapped AR<->FR.
  //    Original Arabic is cached on first run so switching back to AR
  //    always restores the exact original markup (fixes non-reversibility).
  document.querySelectorAll('[data-t-fr]').forEach(el => {
    if (!el.hasAttribute('data-t-ar')) {
      var cur = el.innerHTML;
      // Don't cache French as Arabic when first load is FR.
      if (!isAr && cur && !/[\u0600-\u06FF]/.test(cur) && /[A-Za-zÀ-ÿ]/.test(cur)) { /* skip */ }
      else el.setAttribute('data-t-ar', cur);
    }
    if (el.hasAttribute('data-t-ar') || isAr) {
      el.innerHTML = isAr ? (el.getAttribute('data-t-ar') || el.innerHTML) : el.getAttribute('data-t-fr');
    } else if (!isAr) {
      el.innerHTML = el.getAttribute('data-t-fr');
    }
  });
  document.querySelectorAll('[data-ph-fr]').forEach(el => {
    if (!el.hasAttribute('data-ph-ar')) {
      var ph = el.placeholder || '';
      if (!isAr && ph && !/[\u0600-\u06FF]/.test(ph) && /[A-Za-zÀ-ÿ]/.test(ph)) { /* skip */ }
      else el.setAttribute('data-ph-ar', ph);
    }
    var phAr = el.getAttribute('data-ph-ar');
    el.placeholder = isAr ? (phAr != null ? phAr : el.placeholder) : el.getAttribute('data-ph-fr');
  });

  // /* early pricing lang sync */ — قبل ترجمة النوافذ حتى لا يوقفها أي خطأ لاحق
  try {
    var _ptabLabelsEarly = document.querySelectorAll('#pricing .ptab-lbl, .pricing-tabs .ptab-lbl');
    var _ptabAR = ['الأفراد','المحلات التجارية','المكاتب الافتراضية','الشركات والمعارض','غرفة المناقصة','غرفة الاستثمارات','الإعلانات'];
    var _ptabFR = ['Particuliers','Boutiques','Bureaux virtuels','Entreprises & showrooms','Appels d\'offres','Investissements','Annonces'];
    _ptabLabelsEarly.forEach(function(el,i){ if(_ptabAR[i]) el.textContent = isAr ? _ptabAR[i] : _ptabFR[i]; });
    if (typeof renderPricingSection === 'function') renderPricingSection();
  } catch (eEarlyPkg) { console.warn('early pricing lang sync failed', eEarlyPkg); }


  // Navbar + mobile drawer Login / Register buttons
  document.querySelectorAll('.btn-login').forEach(b => b.textContent = isAr ? 'دخول' : 'Connexion');
  document.querySelectorAll('.btn-register').forEach(b => b.textContent = isAr ? '📱 حساب جديد' : '📱 S\'inscrire');

  // Rizq ADS nav link
  const rAdsLink = document.querySelector('a[href="rizq_ads_info.html"]');
  if (rAdsLink) rAdsLink.innerHTML = isAr ? '📹 Rizq ADS' : '📹 Rizq ADS';

  // Apply data-t translations (data-t-mobile على الشاشات اللمسية/الضيقة)
  document.querySelectorAll('[data-t]').forEach(el => {
    let key = el.dataset.t;
    const mobKey = el.getAttribute('data-t-mobile');
    if (mobKey) {
      let tap = false;
      try {
        tap = window.matchMedia('(pointer: coarse), (hover: none), (max-width: 699px)').matches;
      } catch (eMob) { tap = window.innerWidth < 700; }
      if (tap && t[mobKey]) key = mobKey;
    }
    if (!t[key]) return;
    if (el.tagName === 'INPUT') el.placeholder = t[key];
    else if (el.querySelector('.cat-card, .cats-grid, .qcat')) return;
    else el.innerHTML = t[key];
  });

  var accBtn = document.querySelector('.nav-account-btn');
  if (accBtn) accBtn.setAttribute('aria-label', isAr ? 'حسابي' : 'Compte');
  var stIn = document.getElementById('nav-sticky-search-input');
  if (stIn) {
    stIn.placeholder = isAr ? 'البحث في رزق...' : 'Rechercher sur Rizq...';
    stIn.setAttribute('aria-label', isAr ? 'البحث في رزق' : 'Rechercher sur Rizq');
  }
  var stSearchBtn = document.querySelector('#nav-sticky-tools .nav-sticky-search-wrap button');
  if (stSearchBtn) stSearchBtn.setAttribute('aria-label', isAr ? 'بحث' : 'Rechercher');
  /* زر ونافذة البحث — كانت تبقى عربية في الواجهة الفرنسية */
  var searchLaunch = document.getElementById('nav-search-launch');
  if (searchLaunch) {
    var slLbl = isAr ? 'بحث' : 'Recherche';
    var slTitle = isAr ? 'ابحث في رزق' : 'Rechercher sur Rizq';
    searchLaunch.setAttribute('aria-label', slLbl);
    searchLaunch.setAttribute('title', slTitle);
  }
  var theaterInput = document.getElementById('rizq-theater-search-input');
  if (theaterInput) {
    theaterInput.placeholder = isAr ? 'عقارات، سيارات، ذهب…' : 'Immobilier, voitures, or…';
    theaterInput.setAttribute('aria-label', isAr ? 'ابحث في رزق' : 'Rechercher sur Rizq');
  }
  var theaterClose = document.querySelector('#rizq-search-panel [data-rizq-close-search]');
  if (theaterClose) theaterClose.setAttribute('aria-label', isAr ? 'إغلاق' : 'Fermer');
  var theaterCats = {
    ar: ['🏠 عقارات','🚗 سيارات','🪙 ذهب','📱 إلكترونيات','⚡ طاقة','✈️ رحلات','📑 مناقصات','📈 استثمار'],
    fr: ['🏠 Immobilier','🚗 Voitures','🪙 Or','📱 Électronique','⚡ Énergie','✈️ Voyages','📑 Appels d\'offres','📈 Investissement']
  };
  var catLabels = isAr ? theaterCats.ar : theaterCats.fr;
  document.querySelectorAll('#rizq-search-panel .rizq-search-cat').forEach(function(a, i){
    if (catLabels[i]) a.textContent = catLabels[i];
  });
  var jumpBar = document.getElementById('section-jump-bar');
  if (jumpBar) jumpBar.setAttribute('aria-label', isAr ? 'قفز سريع' : 'Navigation rapide');
  if (jumpBar) {
    var jumpMap = isAr
      ? {'#listings':'الإعلانات','#rzq-disc-store':'المحلات','#rzq-disc-corp':'المعارض والمصانع','post':'+ نشر','#rzq-disc-office':'المكاتب','rizq_tenders_directory.html':'المناقصات','rizq_investments_directory.html':'الاستثمارات'}
      : {'#listings':'Annonces','#rzq-disc-store':'Boutiques','#rzq-disc-corp':'Showrooms & usines','post':'+ Publier','#rzq-disc-office':'Bureaux','rizq_tenders_directory.html':'A-doffres','rizq_investments_directory.html':'Investissements'};
    jumpBar.querySelectorAll('a[data-jump]').forEach(function(a){
      var k = a.getAttribute('data-jump');
      if (jumpMap[k]) a.textContent = jumpMap[k];
    });
  }
  var mbnLabels = document.querySelectorAll('#mobile-bottom-nav .mbn-label');
  var mbnAR = ['الرئيسية','الأقسام','نشر','استثمار','المزيد'];
  var mbnFR = ['Accueil','Catégories','Publier','Investir','Plus'];
  mbnLabels.forEach(function(el, i){ if (mbnAR[i]) el.textContent = isAr ? mbnAR[i] : mbnFR[i]; });
  var hubs = document.querySelector('.cta-hubs');
  if (hubs) hubs.setAttribute('aria-label', isAr ? 'أقسام رزق للأعمال' : 'Espaces professionnels Rizq');
  var backTop = document.getElementById('back-to-top');
  if (backTop) {
    var upLbl = isAr ? 'العودة للأعلى' : 'Retour en haut';
    backTop.setAttribute('aria-label', upLbl);
    backTop.title = upLbl;
  }
  var mbn = document.getElementById('mobile-bottom-nav');
  if (mbn) mbn.setAttribute('aria-label', isAr ? 'تنقل سفلي' : 'Navigation mobile');

  // عنوان البطل يتبع اللغة — شعار الشريط (.logo-ar) يبقى «رزق» عربياً دائماً
  const hl = document.querySelector('#hero-hl');
  if (hl) {
    hl.textContent = isAr ? 'رزق' : 'Rizq';
    hl.style.direction = isAr ? 'rtl' : 'ltr';
    hl.style.unicodeBidi = 'isolate';
  }
  document.querySelectorAll('.logo-ar').forEach(function(el) {
    el.textContent = 'رزق';
    el.style.direction = 'rtl';
    el.style.unicodeBidi = 'isolate';
  });
  var whyBg = document.querySelector('.why-bg-text');
  if (whyBg) whyBg.textContent = isAr ? 'رزق' : 'Rizq';
  var ctaBgBrand = document.getElementById('cta-bg-brand');
  if (ctaBgBrand) ctaBgBrand.textContent = isAr ? 'رزق' : 'Rizq';

  // Hero subtitles (primary tagline + secondary local-flavor line)
  const heroSubPrimary = document.querySelector('#hero-sub-primary');
  if (heroSubPrimary) heroSubPrimary.textContent = isAr
    ? 'خيارك الأول لفتح آفاق جديدة لأعمالك'
    : 'Votre premier choix pour de nouveaux horizons';

  const heroSubSecondary = document.querySelector('#hero-sub-secondary');
  if (heroSubSecondary) heroSubSecondary.textContent = isAr
    ? 'حيث يلتقي كل الموريتانيين'
    : 'Là où tous les Mauritaniens se retrouvent';

  // Cat-name & qcat-name: نفس قياسات CSS للعربية والفرنسية (لا تصغير FR)
  document.querySelectorAll('.cat-name, .qcat-name').forEach(el => {
    el.style.fontSize = '';
  });

  // Hero pills (Sell · Buy · Stand out) — أزرار روابط داخل الشريط
  const pills = document.querySelectorAll('.hero-pill');
  const pillsAR = ['بيع','اشتر','تميّز'];
  const pillsFR = ['Vendre','Acheter','Briller'];
  const pillsAriaAR = ['بيع — انشر إعلانك','اشتر — تصفّح الإعلانات','تميّز — باقات التمييز'];
  const pillsAriaFR = ['Vendre — publier une annonce','Acheter — parcourir les annonces','Briller — forfaits premium'];
  pills.forEach((el,i)=>{
    el.textContent = isAr ? (pillsAR[i]||el.textContent) : (pillsFR[i]||el.textContent);
    if (pillsAriaAR[i]) el.setAttribute('aria-label', isAr ? pillsAriaAR[i] : pillsAriaFR[i]);
  });
  const pillsNav = document.getElementById('hero-pills-nav');
  if (pillsNav) pillsNav.setAttribute('aria-label', isAr ? 'بيع · اشتر · تميّز' : 'Vendre · Acheter · Briller');

  // Hero tagline — يُترجَم عبر data-t على الأجزاء (lead / one-place)

  // Hero featured-video placeholder slot (shown when no admin video is configured)
  const vidBadge = document.querySelector('.hero-vid-badge');
  if(vidBadge) vidBadge.textContent = isAr ? '🎬 مساحة إعلانية واحدة في الرئيسية · Rizq ADS' : '🎬 Un seul espace pub sur l’accueil · Rizq ADS';
  const vidPhLive = document.querySelector('.hero-vid-ph-live');
  if(vidPhLive) vidPhLive.innerHTML = '<div class="hero-vid-ph-live-dot"></div>' + (isAr ? 'LIVE · RIZQ ADS' : 'LIVE · RIZQ ADS');
  const vidPhExcl = document.querySelector('.hero-vid-ph-excl');
  if(vidPhExcl) vidPhExcl.textContent = isAr ? '⭐ مساحة إعلانية حصرية' : '⭐ Espace publicitaire exclusif';
  const vidPhStatLbls = document.querySelectorAll('.hero-vid-ph-stat-lbl');
  const statLblsAR = ['زائر / يوم','الخانة الأولى','مشاهدة مضمونة'];
  const statLblsFR = ['Visiteurs / jour','1ʳᵉ place','Vue garantie'];
  vidPhStatLbls.forEach((el,i)=>{ el.textContent = isAr ? (statLblsAR[i]||el.textContent) : (statLblsFR[i]||el.textContent); });
  const vidPhH1 = document.querySelector('.hero-vid-ph-h1');
  if(vidPhH1) vidPhH1.innerHTML = isAr ? 'إعلانك هنا<em>أمام كل زائر</em>' : 'Votre annonce ici<em>devant chaque visiteur</em>';
  const vidPhSub = document.querySelector('.hero-vid-ph-sub');
  if(vidPhSub) vidPhSub.textContent = isAr ? 'موريتانيا · Rizq ADS' : 'Mauritanie · Rizq ADS';
  const vidPhCta = document.querySelector('.hero-vid-ph-cta');
  if(vidPhCta) vidPhCta.textContent = isAr ? '📢 احجز هذه المساحة' : '📢 Réservez cet espace';
  const vidPhUrgency = document.querySelector('.hero-vid-ph-urgency');
  if(vidPhUrgency) vidPhUrgency.textContent = isAr ? '⚡ مساحة واحدة فقط · متاحة الآن' : '⚡ Un seul espace disponible · Réservez maintenant';
  const vidCtaLinks = document.querySelectorAll('.hero-vid-cta-link');
  const vidCtaLinksAR = ['📢 احجز مساحتك الإعلانية','تعرف على Rizq ADS'];
  const vidCtaLinksFR = ['📢 Réservez votre espace publicitaire','Découvrez Rizq ADS'];
  vidCtaLinks.forEach((el,i)=>{ el.textContent = isAr ? (vidCtaLinksAR[i]||el.textContent) : (vidCtaLinksFR[i]||el.textContent); });

  // Search category dropdown
  const catSel = document.getElementById('hero-search-cat-select') || document.querySelector('.search-cat-select');
  if (typeof rebuildSearchCatSelect === 'function') rebuildSearchCatSelect();

  // Section tags — fix Arabic too (were showing English)
  const featuredTag = document.querySelector('#listings .section-tag');
  if(featuredTag) featuredTag.textContent = isAr ? 'كل الإعلانات' : 'Toutes les annonces';
  const catsTag = document.querySelector('#categories .section-tag');
  if(catsTag) catsTag.textContent = isAr ? 'جميع الأقسام' : 'Toutes les Catégories';
  const whyTag = document.querySelector('.why-section .section-tag');
  if(whyTag) whyTag.innerHTML = isAr ? 'لماذا <span>رزق</span>؟' : 'Pourquoi <span>Rizq</span>?';
  const priceTag = document.querySelector('.pricing-section .section-tag');
  if(priceTag) priceTag.textContent = isAr ? 'خطط الاشتراك' : 'Nos Offres';
  const pulseTag = document.querySelector('#prices .section-tag');
  if(pulseTag) pulseTag.textContent = isAr ? '📊 نبضة السوق · Rizq Market Pulse' : '📊 Rizq Market Pulse';
  const pulseLive = document.getElementById('pulse-live-lbl');
  if(pulseLive) pulseLive.textContent = isAr ? 'أحدث' : 'Récent';
  const pulseTitle = document.getElementById('pulse-brand-title');
  if(pulseTitle) pulseTitle.innerHTML = isAr ? 'نبضة السوق <span>اليوم</span>' : 'Le Pouls du Marché <span>aujourd\'hui</span>';
  const pulseSub = document.getElementById('pulse-brand-sub');
  if(pulseSub) pulseSub.textContent = isAr
    ? 'أسعار المواد الغذائية الأساسية · المحروقات · العملات — بوضوح قبل أن تشتري أو تبيع'
    : 'Produits alimentaires de base · carburants · devises — clairement avant d\'acheter ou de vendre';
  const pulseEn = document.getElementById('pulse-brand-en');
  if(pulseEn) pulseEn.textContent = 'Rizq Market Pulse';
  const storesTag = document.querySelector('#virtual-stores .section-tag');
  if(storesTag) storesTag.innerHTML = isAr ? 'محلات <span>رزق</span>' : 'Boutiques <span>Rizq</span>';
  const officesTag = document.querySelector('#virtual-offices .section-tag');
  if(officesTag) officesTag.innerHTML = isAr ? 'مكاتب <span>رزق</span>' : 'Bureaux <span>Rizq</span>';
  const showroomsTag = document.querySelector('#virtual-showrooms .section-tag');
  if(showroomsTag) showroomsTag.innerHTML = isAr ? 'معارض <span>رزق</span>' : 'Showrooms <span>Rizq</span>';
  const estateTag = document.querySelector('#virtual-estate .section-tag');
  if(estateTag) estateTag.innerHTML = isAr ? 'سوق العقارات <span>رزق</span>' : 'Marché immobilier <span>Rizq</span>';
  const estateModelsTag = document.querySelector('#rizq-estate-models .section-tag');
  if(estateModelsTag) estateModelsTag.innerHTML = isAr ? 'سوق العقارات <span>رزق</span>' : 'Marché immobilier <span>Rizq</span>';
  const tendersTag = null; /* section moved to directory */
  if(tendersTag) tendersTag.innerHTML = isAr ? 'مناقصات <span>رزق</span>' : 'Appels d\'offres <span>Rizq</span>';
  const investmentsTag = null; /* section moved to directory */
  if(investmentsTag) investmentsTag.innerHTML = isAr ? 'استثمارات <span>رزق</span>' : 'Investissements <span>Rizq</span>';
  const liveTag = document.querySelector('#rizq-live-activity .section-tag');
  if(liveTag) liveTag.innerHTML = isAr ? 'نشط على <span>رزق</span>' : 'Actif sur <span>Rizq</span>';
  const allAdsTag = document.querySelector('#all-ads-modal .section-tag');
  if(allAdsTag) allAdsTag.textContent = isAr ? 'كل الإعلانات' : 'Toutes les annonces';
  const stylesTag = document.querySelector('#rizq-styles .section-tag');
  if(stylesTag) stylesTag.textContent = isAr ? 'أفكار الأنماط' : 'Idées de style';
  var styReshuffle = document.getElementById('rizq-styles-reshuffle');
  if(styReshuffle) styReshuffle.setAttribute('aria-label', isAr ? 'اقتراحات جديدة' : 'Nouvelles suggestions');
  const srmTag = document.querySelector('#rizq-showroom-models .section-tag');
  if(srmTag) srmTag.textContent = isAr ? 'نماذج المعارض' : 'Modèles showroom';
  var srmReshuffle = document.getElementById('rizq-srm-reshuffle');
  if(srmReshuffle) srmReshuffle.setAttribute('aria-label', isAr ? 'نماذج جديدة' : 'Nouveaux modèles');

  // Footer carrier labels (brand names — Latin transliteration in FR)
  const carrierFR = ['Mauritel:','Mattel:','Chinguitel:'];
  const carrierAR = ['موريتل:','ماتيل:','شينقيتل:'];
  document.querySelectorAll('.carrier-name').forEach((el,i) => {
    el.textContent = isAr ? (carrierAR[i] || el.textContent) : (carrierFR[i] || el.textContent);
  });

  // Category names — built-in cards only (use data-ar, not DOM index)
  document.querySelectorAll('.cat-card:not([data-extra="1"]):not([data-suggest="1"]) .cat-name').forEach(function(el) {
    var ar = el.getAttribute('data-ar') || el.textContent.trim();
    if (!el.hasAttribute('data-ar')) el.setAttribute('data-ar', ar);
    var ai = CAT_NAMES.ar.indexOf(ar);
    if (ai < 0 && typeof RizqCategories !== 'undefined') {
      var cat = RizqCategories.getByKey(el.closest('.cat-card') && el.closest('.cat-card').getAttribute('data-cat-key'));
      if (cat) { ar = cat.nameAr; el.setAttribute('data-ar', ar); ai = CAT_NAMES.ar.indexOf(ar); }
    }
    el.textContent = isAr ? ar : (ai >= 0 ? CAT_NAMES.fr[ai] : ar);
  });

  // Quick cat names — match each label to its data-t key (not DOM index; gold qc8 is mid-row)
  document.querySelectorAll('.qcat-name').forEach(function(el) {
    var key = el.getAttribute('data-t');
    if (key && t[key]) el.textContent = t[key];
  });

  // Cat hint text
  const hint = isAr ? '▾ اضغط لعرض الفروع' : '▾ Voir les sous-catégories';
  document.querySelectorAll('.cat-hint').forEach(el => el.textContent = hint);

  // Store FR subs for portal use
  window._subFR = isAr ? null : SUB_FR;

  // Body font
  document.body.style.fontFamily = "'Cairo', sans-serif";

  // Section tags handled above

  // Live label — كبسولة مباشر بضوء أحمر
  if(typeof paintLiveListingsLabel === 'function') paintLiveListingsLabel();
  else {
    const liveLabel = document.querySelector('.listings-label > span');
    if(liveLabel) liveLabel.innerHTML = liveListingsLabelHtml(!isAr);
  }
  /* أعد قياس الشرائط بعد تبديل dir — اتجاه عربي ≠ فرنسي */
  if(typeof syncAllMarquees === 'function') setTimeout(syncAllMarquees, 40);

  // Stats bar "مجاني"
  const freeStat = document.querySelector('#platform-stats [data-stat="free"] .h-stat-num');
  if(freeStat) freeStat.textContent = isAr ? 'مجاني' : 'Gratuit';

  // CTA section tagline
  const ctaTag = document.querySelector('.cta-section .section-tag');
  if(ctaTag) ctaTag.textContent = isAr ? 'انضم إلى رزق' : 'Rejoindre Rizq';

  // Rebuild carousel with translated button text
  const track = document.getElementById('cards-track');
  if(track) { track.innerHTML=''; buildCards(); if(typeof renderPrices==='function') renderPrices(); }
  if(typeof buildFeaturedCards==='function') buildFeaturedCards();
  if(typeof buildStyleIdeas==='function') buildStyleIdeas(false);
  if(typeof buildShowroomModels==='function') buildShowroomModels(false);
  if(typeof buildEstateModels==='function') buildEstateModels(false);
  if(typeof refreshLandingBrandStrips==='function') refreshLandingBrandStrips();
  // إصلاح حقيقي: شريط أسعار السوق المتحرك (#price-ticker) كان يُترجم في لوحة الأسعار
  // الثابتة فقط (renderPrices) دون إعادة بنائه في شكله المتحرك — يبقى عربياً بعد التبديل
  if(typeof renderPriceTicker==='function') renderPriceTicker();

try { /* remaining-static-i18n */
  // ── Translate all remaining static text blocks — unified RizqI18n.t2() ──
  // Pop tag
  const popTag = document.querySelector('.pop-tag');
  if(popTag) popTag.textContent = RizqI18n.t2('⭐ الأكثر شعبية','⭐ Le plus populaire');

  // Modal logo (always Arabic letter)
  document.querySelectorAll('.modal-logo').forEach(function (el) {
    el.innerHTML = '<img class="logo-mark-img" src="rizq-mark.svg" width="84" height="84" alt="رزق"/>';
  });

  // Login panel
  const liSub = document.querySelector('#p-login .modal-auth-sub');
  if(liSub) liSub.textContent = RizqI18n.t2('أهلاً بعودتك إلى رزق 🎉','Bon retour sur Rizq 🎉');
  const liEmLbl = document.querySelector('label[for="li-em"], label[data-t="li-email-lbl"]');
  if(liEmLbl) liEmLbl.textContent = RizqI18n.t2('البريد الإلكتروني','Adresse e-mail');
  const liPwLbl = document.querySelector('label[for="li-pw"], label[data-t="li-pw-lbl"]');
  if(liPwLbl) liPwLbl.textContent = RizqI18n.t2('كلمة المرور','Mot de passe');
  const liEm = document.getElementById('li-em');
  if(liEm) liEm.placeholder = RizqI18n.t2('name@email.com','name@email.com');
  const liPw = document.getElementById('li-pw');
  if(liPw) liPw.placeholder = '••••••••';
  const fgEmLbl = document.querySelector('label[for="fg-em"]');
  if(fgEmLbl) fgEmLbl.textContent = RizqI18n.t2('البريد الإلكتروني','Adresse e-mail');
  const liForgot = document.getElementById('li-forgot-link') || document.querySelector('#p-login a');
  if(liForgot) liForgot.textContent = RizqI18n.t2('نسيت كلمة المرور؟','Mot de passe oublié?');
  const liBtn = document.querySelector('#p-login .m-btn-main');
  if(liBtn) liBtn.textContent = RizqI18n.t2('دخول ←','Connexion →');
  const authTabLogin = document.getElementById('modal-tab-login');
  if(authTabLogin) authTabLogin.textContent = RizqI18n.t2('دخول','Connexion');
  const authTabRegister = document.getElementById('modal-tab-register');
  if(authTabRegister) authTabRegister.textContent = RizqI18n.t2('حساب جديد','Nouveau compte');
  const authHeading = document.querySelector('#p-login .modal-auth-heading');
  if(authHeading) authHeading.textContent = RizqI18n.t2('تسجيل الدخول','Connexion');
  const authNoAcc = document.querySelector('#p-login [data-t="auth-no-account"]');
  if(authNoAcc) authNoAcc.textContent = RizqI18n.t2('ليس لديك حساب؟','Pas encore de compte ?');
  const authCreate = document.querySelector('#p-login [data-t="auth-create-free"]');
  if(authCreate) authCreate.textContent = RizqI18n.t2('أنشئ حسابك مجاناً','Créez votre compte gratuitement');

  // Register type panel
  const typeTitle = document.querySelector('#p-type h3');
  if(typeTitle) typeTitle.textContent = RizqI18n.t2('إنشاء حساب جديد','Créer un compte');
  const typeSub = document.querySelector('#p-type p');
  if(typeSub) typeSub.textContent = RizqI18n.t2('كيف تريد الانضمام إلى رزق؟','Comment souhaitez-vous rejoindre Rizq?');
  const typePrivName = document.querySelector('#type-private div:nth-child(2) div:first-child');
  if(typePrivName) typePrivName.textContent = RizqI18n.t2('حساب شخصي','Compte personnel');
  const typeCompName = document.querySelector('#type-company div:nth-child(2) div:first-child');
  if(typeCompName) typeCompName.textContent = RizqI18n.t2('شركة أو مؤسسة','Entreprise ou société');
  const typeNextBtn = document.querySelector('#p-type .m-btn-main');
  if(typeNextBtn) typeNextBtn.textContent = RizqI18n.t2('التالي ←','Suivant →');
  const typeBackBtn = document.querySelector('#p-type .m-link-btn');
  if(typeBackBtn) typeBackBtn.textContent = RizqI18n.t2('← العودة إلى تسجيل الدخول','← Retour à la connexion');

  // Success panel
  const okTitle = document.querySelector('#p-ok h3');
  if(okTitle) okTitle.textContent = RizqI18n.t2('مرحباً بك في رزق!','Bienvenue sur Rizq!');
  const okDesc = document.querySelector('#p-ok p');
  if(okDesc) okDesc.innerHTML = RizqI18n.t2(
    'تم إنشاء حسابك بنجاح.<br/>انشر إعلانك الأول الآن — مجاناً.',
    'Votre compte a été créé avec succès.<br/>Publiez votre première annonce maintenant — gratuitement.'
  );
  const okBtn = document.querySelector('#p-ok .m-btn-main');
  if(okBtn) {
    okBtn.textContent = RizqI18n.t2('🚀 انشر إعلانك الأول','🚀 Publier ma première annonce');
    okBtn.onclick = function(){ closeModal(); goToPost(); };
  }

  // Pricing plan names
  const pNames = document.querySelectorAll('.p-name');
  const pNamesAR = ['🆓 مجاني','🚀 Pro','🏢 Business'];
  const pNamesFR = ['🆓 Gratuit','🚀 Pro','🏢 Business'];
  pNames.forEach((el,i)=>{ if(pNamesAR[i]) el.textContent = isAr ? pNamesAR[i] : pNamesFR[i]; });

  // Pricing periods & features (FR-only override — AR is HTML default)
  if (!isAr) {
    const pPeriods = document.querySelectorAll('.p-period');
    const pPeriodsFR = ['Pour toujours — sans carte','Par mois — résiliez à tout moment','Par mois — pour entreprises'];
    pPeriods.forEach((el,i)=>{ if(pPeriodsFR[i]) el.textContent=pPeriodsFR[i]; });
    const allFeatures = document.querySelectorAll('.p-features');
    const fFR=[
      ['5 annonces actives / mois','5 photos par annonce','Contact direct','Recherche & navigation complète','Support basique'],
      ['Annonces illimitées','10 photos par annonce','Badge vendeur vérifié ✅','Boost gratuit hebdomadaire','Statistiques des annonces','Priorité dans la recherche','Support dédié 24/7'],
      ['Tout ce que Pro inclut','Bannière sur la page d\'accueil','Tableau de bord entreprise','Statistiques avancées','Marque vérifiée','Gestionnaire de compte dédié','Facture officielle']
    ];
    allFeatures.forEach((ul,i)=>{
      if(!fFR[i]) return;
      [...ul.querySelectorAll('li')].forEach((li,j)=>{ if(fFR[i][j]) li.textContent=fFR[i][j]; });
    });
    const pBtns = document.querySelectorAll('.btn-p');
    const pBtnsFR = ['Commencer gratuitement','Démarrer Pro maintenant','Contactez-nous'];
    pBtns.forEach((btn,i)=>{ if(pBtnsFR[i]) btn.textContent=pBtnsFR[i]; });
    // Stats bar last label (FR only)
    const statLast = document.querySelector('.h-stat:last-child .h-stat-lbl');
    if(statLast) statLast.textContent = 'Publication de base';
  }

  // CTA title: نفس مقياس CSS للعربية والفرنسية
  const ctaTitle = document.querySelector('.cta-title');
  if(ctaTitle) ctaTitle.style.fontSize = '';

  // Pricing tabs labels
  const ptabLabels = document.querySelectorAll('#pricing .ptab-lbl');
  const ptabAR = ['الأفراد','المحلات التجارية','المكاتب الافتراضية','الشركات والمعارض','غرفة المناقصة','غرفة الاستثمارات','الإعلانات'];
  const ptabFR = ['Particuliers','Boutiques','Bureaux virtuels','Entreprises & showrooms','Appels d\'offres','Investissements','Annonces'];
  ptabLabels.forEach((el,i)=>{ if(ptabAR[i]) el.textContent = isAr ? ptabAR[i] : ptabFR[i]; });

  // Navbar dropdown — same order as mobile (stores → about)
  const navDdHeader = document.querySelector('.nav-dd-header');
  if(navDdHeader) navDdHeader.textContent = RizqI18n.t2('اختر باقتك','Choisissez votre offre');
  const navDdCta = document.querySelector('.nav-dd-cta');
  if(navDdCta) navDdCta.textContent = RizqI18n.t2('اشترك الآن ←',"S'abonner maintenant →");

  // All-ads section title
  const allAdsTitle = document.getElementById('all-ads-title');
  if(allAdsTitle) allAdsTitle.innerHTML = RizqI18n.t2('كل <span>الإعلانات</span>','Toutes les <span>annonces</span>');

  // Civic ticker (public-service) — not ad titles; live ads stay in «مباشر»
  if(typeof renderTickerFromAds==='function') renderTickerFromAds();

  // Virtual Offices section: translated via data-t="vo-*" + LANG (same as vs-/vsh-)

  // Chat widget — unified
  const rzqInp = document.getElementById('rzq-inp');
  if(rzqInp) rzqInp.placeholder = RizqI18n.t2('اكتب رسالتك...','Écrivez votre message...');
  const rzqNm = document.querySelector('.rzq-nm');
  if(rzqNm) rzqNm.textContent = RizqI18n.t2('مدير رزق الذكي','Gestionnaire Rizq IA');
  const rzqSt = document.querySelector('.rzq-st span:last-child');
  if(rzqSt) rzqSt.textContent = RizqI18n.t2('متاح الآن','Disponible maintenant');
  document.querySelectorAll('.rzq-qb').forEach(btn => {
    const mapAR = {'Publier':'نشر إعلان','Abonnements':'الاشتراكات','Vérification':'التوثيق','Paiement':'الدفع','Réclamation':'شكوى'};
    const mapFR = {'نشر إعلان':'Publier','الاشتراكات':'Abonnements','التوثيق':'Vérification','الدفع':'Paiement','شكوى':'Réclamation'};
    const m = isAr ? mapAR : mapFR;
    if(m[btn.textContent]) btn.textContent = m[btn.textContent];
  });

  document.querySelectorAll('[data-rizq-fav-wrap]').forEach(function(el) {
    var lbl = isAr ? 'المفضلة' : 'Favoris';
    el.setAttribute('title', lbl);
    if (!el.querySelector('[data-rizq-fav-count]') || el.querySelector('[data-rizq-fav-count]').hidden) {
      el.setAttribute('aria-label', lbl);
    }
  });

  // Hidden modal / portal strings (not covered by data-t-fr)
  var qpBrowse = document.querySelector('#qcat-portal .qp-btn.browse');
  if (qpBrowse) qpBrowse.textContent = isAr ? '🔍 تصفح' : '🔍 Parcourir';
  var qpPost = document.querySelector('#qcat-portal .qp-btn.post');
  if (qpPost) qpPost.textContent = isAr ? '➕ أضف إعلان' : '➕ Publier une annonce';
  var amdFavTxt = document.getElementById('amd-btn-fav-txt');
  if (amdFavTxt) amdFavTxt.textContent = isAr ? 'أضف للمفضلة' : 'Ajouter aux favoris';
  var amdShareTxt = document.getElementById('amd-btn-share-txt');
  if (amdShareTxt) amdShareTxt.textContent = isAr ? 'مشاركة' : 'Partager';
  var amdAskTitle = document.getElementById('amd-ask-title');
  if (amdAskTitle) amdAskTitle.textContent = isAr ? '💬 اسأل عن هذا الإعلان' : '💬 Posez une question sur cette annonce';
  var amdAskInput = document.getElementById('amd-ask-input');
  if (amdAskInput && amdAskInput.hasAttribute('data-ph-fr')) {
    amdAskInput.placeholder = isAr ? amdAskInput.getAttribute('data-ph-ar') || 'اكتب سؤالك للبائع...' : amdAskInput.getAttribute('data-ph-fr');
  }
  var amdAskSend = document.getElementById('amd-ask-send-txt');
  if (amdAskSend) amdAskSend.textContent = isAr ? 'إرسال' : 'Envoyer';
  var pkgCta = document.getElementById('pkg-modal-cta');
  if (pkgCta && pkgCta.style.display !== 'none') {
    var ctaTxt = (pkgCta.textContent || '').trim();
    if (/اشترك|abonn|subscribe|s'abonner/i.test(ctaTxt)) {
      pkgCta.textContent = isAr ? 'اشترك الآن ←' : "S'abonner maintenant →";
    }
  }
  document.querySelectorAll('.merchant-activity-select option[value=""]').forEach(function(opt) {
    opt.textContent = isAr ? '— اختر نشاط المحل —' : '— Choisir l\'activité —';
  });

  // Refresh qcat inline panel if open
  if (activeQcat && typeof openQcatPortal === 'function') openQcatPortal(activeQcat);

  // Translate listing hover buttons
  document.querySelectorAll('.lc-hover-btn-open').forEach(b => {
    b.textContent = isAr ? '📋 عرض كامل' : '📋 Voir tout';
  });

  // "View all" button
  const viewAllBtn = document.querySelector('[data-t="view-all"]');
  if(viewAllBtn) viewAllBtn.textContent = isAr ? 'عرض الكل في نافذة ←' : 'Tout voir en fenêtre →';
  const browseFullBtn = document.querySelector('[data-t="browse-full"]');
  if(browseFullBtn) browseFullBtn.textContent = isAr ? '📂 عرض كل الإعلانات ←' : '📂 Voir toutes les annonces →';
  if(typeof buildLandingAds === 'function') buildLandingAds(false);

  // Featured listing hover copy — only translate nodes that exist from live data
  document.querySelectorAll('.lc-hover-btn-open').forEach(b=>b.textContent = isAr ? '📋 عرض الإعلان' : '📋 Voir tout');

  try { applyFullTranslation(lang); } catch (eTr) {}
  try { if (typeof renderExtraCategories === 'function') renderExtraCategories(); } catch (eEx) {}
  try { translateCatTaxonomy(!isAr); } catch (eTx) {}
  
  } catch (eRemI18n) { console.warn('remaining static i18n failed', eRemI18n); }

  try { if (typeof renderPricingSection === 'function') renderPricingSection(); } catch (ePr) {}
  try { if (typeof renderSuggestCard === 'function') renderSuggestCard(); } catch (eSg) {}
  try { if (typeof refreshCatStatsText === 'function') refreshCatStatsText(); } catch (eSt) {}
  document.querySelectorAll('.rzq-empty, #listings .listings-grid > p').forEach(function(el){
    var tx = (el.textContent || '').trim();
    if (/إعلانات مميزة|featured listings|annonce en vedette/i.test(tx)) {
      el.textContent = isAr ? 'لا توجد إعلانات مميزة بعد.' : 'Aucune annonce en vedette pour le moment.';
    }
  });

  document.dispatchEvent(new CustomEvent('rizq:langchange', { bubbles: true, detail: { lang: lang } }));
  try {
    if (window.RizqLangGuard && typeof window.RizqLangGuard.sync === 'function') {
      window.RizqLangGuard.sync(lang);
    }
  } catch (eG) {}
}

var _langBusy = false;
function toggleLang() {
  if (_langBusy) return;
  _langBusy = true;
  try { applyLandingLang(!isAr); }
  catch (eLang) { console.error('toggleLang failed', eLang); }
  finally {
    // Unlock on next frame — was 400ms and felt like a delayed language switch.
    requestAnimationFrame(function () { _langBusy = false; });
  }
}
window.toggleLang = toggleLang;
window.applyLandingLang = applyLandingLang;

document.addEventListener('click', function (e) {
  var btn = e.target.closest && e.target.closest('#nav-lang-btn, #rizq-lang-btn');
  if (!btn) return;
  e.preventDefault();
  toggleLang();
}, true);

// ── مزامنة اللغة عند فتح الصفحة مع اختيار المستخدم السابق في أي صفحة من الموقع ──
// (نفس مفتاح rizq_lang الذي يستعمله rizq_i18n.js في الصفحات المهاجَرة بالفعل)
(function syncLandingLangOnLoad() {
  var saved;
  try { saved = localStorage.getItem('rizq_lang'); } catch (e) { saved = null; }
  var run = function () {
    applyLandingLang(saved === 'fr' ? false : true);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  // Do not re-apply on window "load" — that caused a second delayed FR pass and mixed text.
  if (window.RizqI18n) {
    window.RizqI18n.toggle = toggleLang;
    window.RizqI18n.apply = function (lang) { applyLandingLang(lang !== 'fr'); };
    window.RizqI18n.getLang = function () { return isAr ? 'ar' : 'fr'; };
  }
})();

// ══════════════════════════════════════════════
// TRADUCTION COMPLÈTE FR — كل النصوص الثابتة
// ══════════════════════════════════════════════
const TR = {
  ar: {
    // Sub-modal (category action popup)
    'sm-browse-title': 'تصفح الإعلانات',
    'sm-browse-sub':   'اعرض كل الإعلانات في هذا الفرع',
    'sm-post-title':   'انشر إعلاناً هنا',
    'sm-post-sub':     'أضف منتجك في هذا الفرع',
    'sm-close':        '✕ إغلاق',
    // Ad modal buttons
    'amd-call':        '📞 اتصال',
    'amd-msg':         '💬 واتساب',
    // Auth modal — login
    'auth-tab-login':  'دخول',
    'auth-tab-register':'حساب جديد',
    'auth-login-heading': 'تسجيل الدخول',
    'auth-no-account': 'ليس لديك حساب؟',
    'auth-create-free':'أنشئ حسابك مجاناً',
    'li-sub':          'أهلاً بعودتك إلى رزق 🎉',
    'li-email-lbl':    'البريد الإلكتروني',
    'li-pw-lbl':       'كلمة المرور',
    'li-email-ph':     'name@email.com',
    'li-pw-ph':        '••••••••',
    'li-forgot':       'نسيت كلمة المرور؟',
    'li-btn':          'دخول ←',
    'li-divider':      'أو',
    'li-new':          'إنشاء حساب جديد مجاناً',
    // Auth — type
    'type-title':      'إنشاء حساب نشر',
    'type-sub':        'للنشر والإدارة فقط — حساب التصفح والشراء من «حسابي».',
    'type-priv-title': 'حساب خاص (بائع)',
    'type-priv-sub':   'للأفراد — انشر إعلاناتك بسهولة',
    'type-estate-title': 'سوق العقارات',
    'type-estate-sub':   'وكالة · مطور · مالك — لوحة عقارات مستقلة مثل المحل والمكتب',
    'type-co-title':   'شركة أو مؤسسة',
    'type-co-sub':     'محل · مكتب · معرض/مصنع — حساب موثّق',
    'type-next':       'التالي ←',
    'type-back':       '← عودة لتسجيل الدخول',
    // Auth — nationality
    'nat-title':       'حساب خاص',
    'nat-sub':         'خطوة 1 — ما جنسيتك؟',
    'nat-mr-title':    'موريتاني',
    'nat-mr-sub':      'بطاقة الهوية الوطنية مطلوبة',
    'nat-int-title':   'غير موريتاني',
    'nat-int-sub':     'جواز سفر أو بطاقة إقامة / جنسية مطلوبة',
    'nat-next':        'التالي ←',
    'nat-back':        '← عودة',
    // Auth — private MR
    'pmr-title':       'بياناتك الشخصية',
    'pmr-sub':         'خطوة 2 — حساب خاص / موريتاني 🇲🇷',
    'pmr-name-ph':     'الاسم الكامل',
    'pmr-email-ph':    'البريد الإلكتروني',
    'pmr-city-ph':     'المدينة التي تسكن فيها',
    'pmr-pw-ph':       'كلمة المرور (8 أحرف+)',
    'pmr-pw2-ph':      'تأكيد كلمة المرور',
    'pmr-id-label':    '📋 البطاقة الوطنية الموريتانية',
    'pmr-id-hint':     'تُحذف بعد التوثيق — يُحتفظ برقم NNI فقط',
    'pmr-upload-txt':  'انقر لرفع صورة البطاقة',
    'pmr-upload-hint': 'JPG / PNG — واضحة وكاملة',
    'pmr-uploaded':    '✅ تم الرفع',
    'pmr-next':        'التالي — تحقق الهاتف ←',
    'pmr-back':        '← عودة',
    // Auth — private INT
    'pint-title':      'بياناتك الشخصية',
    'pint-sub':        'خطوة 2 — حساب خاص / غير موريتاني 🌍',
    'pint-name-ph':    'الاسم الكامل',
    'pint-email-ph':   'البريد الإلكتروني',
    'pint-city-ph':    'المدينة التي تقطن فيها',
    'pint-pw-ph':      'كلمة المرور (8 أحرف+)',
    'pint-pw2-ph':     'تأكيد كلمة المرور',
    'pint-foreign-id-ph': 'رقم جواز السفر / بطاقة الإقامة *',
    'pint-nat-country-ph': 'الجنسية (الدولة) *',
    'pint-id-label':   '🌍 وثيقة إثبات الهوية',
    'pint-id-hint':    'جواز سفر أو بطاقة إقامة/هوية — تُحذف بعد التوثيق ويُحتفظ بالرقم فقط',
    'pint-upload-txt': 'انقر لرفع وثيقة الهوية',
    'pint-upload-hint':'JPG / PNG — واضحة وكاملة',
    'pint-uploaded':   '✅ تم الرفع',
    'pint-next':       'التالي — تحقق الهاتف ←',
    'pint-back':       '← عودة',
    // Auth — company
    'co-title':        'بيانات الشركة',
    'co-sub':          'خطوة 1 — شركة أو مؤسسة 🏢',
    'co-name-ph':      'اسم الشركة / المؤسسة',
    'co-ninea-ph':     'رقم NINEA',
    'co-email-ph':     'البريد الإلكتروني الرسمي',
    'co-city-ph':      'المدينة',
    'co-pw-ph':        'كلمة المرور (8 أحرف+)',
    'co-pw2-ph':       'تأكيد كلمة المرور',
    'co-id-label':     '🏢 وثيقة إثبات هوية الشركة',
    'co-id-hint':      'السجل التجاري أو رخصة النشاط',
    'co-upload-txt':   'انقر لرفع وثيقة الشركة',
    'co-upload-hint':  'JPG / PNG / PDF',
    'co-uploaded':     '✅ تم الرفع',
    'co-next':         'التالي — تحقق الهاتف ←',
    'co-back':         '← عودة',
    // Auth — phone
    'ph-title':        'تحقق الهاتف',
    'ph-sub':          'الخطوة الأخيرة',
    'ph-note':         'الرقم يجب أن يكون مسجلاً باسمك',
    'ph-ph':           'XX XX XX XX',
    'ph-otp-label':    'أدخل رمز التحقق (6 أرقام)',
    'ph-resend':       'إعادة الإرسال بعد',
    'ph-send':         '📲 إرسال رمز التحقق',
    'ph-verify':       '✅ تأكيد وإنشاء الحساب',
    'ph-back':         '← عودة',
    // Auth — success
    'ok-title':        'مرحباً بك في رزق!',
    'ok-sub':          'تم إنشاء حسابك وتفعيله بنجاح.\nيمكنك الآن تصفح الإعلانات والتواصل والنشر.',
    'ok-review-title': 'حسابك قيد المراجعة',
    'ok-review-sub':   'وثيقتك تُراجع خلال 24 ساعة',
    'ok-f1': 'تصفح جميع الإعلانات',
    'ok-f2': 'التواصل مع البائعين',
    'ok-f3': 'نشر إعلاناتك — تظهر بعلامة ⏳',
    'ok-f4': 'بعد المراجعة → شارة "موثّق ✅"',
    'ok-badge-title':  'نظام الشارات في رزق',
    'ok-b1-lbl': '⏳ قيد المراجعة', 'ok-b1-txt': 'حساب جديد — وثيقته تُراجع',
    'ok-b2-lbl': '✅ موثّق',           'ok-b2-txt': 'وثيقته مراجَعة ومقبولة',
    'ok-b3-lbl': '🏢 شركة موثّقة',   'ok-b3-txt': 'مسجلة رسمياً بـ NINEA',
    'ok-b4-lbl': '⭐ بائع مميز',      'ok-b4-txt': 'Pro + موثّق + تقييم عالٍ',
    'ok-sms':          '🔔 ستتلقى رسالة SMS عند اكتمال مراجعة وثيقتك',
    'ok-btn':          '🚀 ابدأ التصفح والنشر',
    // Ticker
    'ticker-live':     '🔴 مباشر',
    'ticker-sub':      'أحدث الإعلانات المنشورة — تتحدث تلقائياً',
  },
  fr: {
    'sm-browse-title': 'Parcourir les annonces',
    'sm-browse-sub':   'Voir toutes les annonces de cette sous-catégorie',
    'sm-post-title':   'Publier une annonce ici',
    'sm-post-sub':     'Ajoutez votre produit dans cette sous-catégorie',
    'sm-close':        '✕ Fermer',
    'amd-call':        '📞 Appeler',
    'amd-msg':         '💬 WhatsApp',
    'auth-tab-login':  'Connexion',
    'auth-tab-register':'Nouveau compte',
    'auth-login-heading': 'Connexion',
    'auth-no-account': 'Pas encore de compte ?',
    'auth-create-free':'Créez votre compte gratuitement',
    'li-sub':          'Bienvenue de retour sur Rizq 🎉',
    'li-email-lbl':    'Adresse e-mail',
    'li-pw-lbl':       'Mot de passe',
    'li-email-ph':     'name@email.com',
    'li-pw-ph':        '••••••••',
    'li-forgot':       'Mot de passe oublié ?',
    'li-btn':          'Se connecter →',
    'li-divider':      'ou',
    'li-new':          'Créer un compte gratuitement',
    'type-title':      'Créer un compte de publication',
    'type-sub':        'Publication et gestion uniquement — navigation/achat via « Mon compte ».',
    'type-priv-title': 'Compte privé (vendeur)',
    'type-priv-sub':   'Pour les particuliers — publiez vos annonces',
    'type-estate-title': 'Marché immobilier',
    'type-estate-sub':   'Agence · promoteur · propriétaire — tableau immobilier dédié',
    'type-co-title':   'Entreprise ou organisation',
    'type-co-sub':     'Boutique · bureau · showroom — compte vérifié',
    'type-next':       'Suivant →',
    'type-back':       '← Retour à la connexion',
    'nat-title':       'Compte particulier',
    'nat-sub':         'Étape 1 — Quelle est votre nationalité ?',
    'nat-mr-title':    'Mauritanien(ne)',
    'nat-mr-sub':      'Carte nationale d\'identité requise',
    'nat-int-title':   'Non-mauritanien(ne)',
    'nat-int-sub':     'Passeport ou carte de séjour / nationalité requis',
    'nat-next':        'Suivant →',
    'nat-back':        '← Retour',
    'pmr-title':       'Vos informations personnelles',
    'pmr-sub':         'Étape 2 — Compte particulier / Mauritanien 🇲🇷',
    'pmr-name-ph':     'Nom complet',
    'pmr-email-ph':    'Adresse e-mail',
    'pmr-city-ph':     'Ville de résidence',
    'pmr-pw-ph':       'Mot de passe (8 caractères min.)',
    'pmr-pw2-ph':      'Confirmer le mot de passe',
    'pmr-id-label':    '📋 Carte nationale mauritanienne',
    'pmr-id-hint':     'Supprimée après vérification — seul le NNI est conservé',
    'pmr-upload-txt':  'Cliquez pour télécharger la carte',
    'pmr-upload-hint': 'JPG / PNG — claire et complète',
    'pmr-uploaded':    '✅ Téléchargé',
    'pmr-next':        'Suivant — Vérification tél. →',
    'pmr-back':        '← Retour',
    'pint-title':      'Vos informations personnelles',
    'pint-sub':        'Étape 2 — Compte particulier / Non-mauritanien 🌍',
    'pint-name-ph':    'Nom complet',
    'pint-email-ph':   'Adresse e-mail',
    'pint-city-ph':    'Ville de résidence',
    'pint-pw-ph':      'Mot de passe (8 caractères min.)',
    'pint-pw2-ph':     'Confirmer le mot de passe',
    'pint-foreign-id-ph': 'N° passeport / carte de séjour *',
    'pint-nat-country-ph': 'Nationalité (pays) *',
    'pint-id-label':   '🌍 Pièce d\'identité',
    'pint-id-hint':    'Passeport ou carte de séjour — photo effacée après contrôle ; seul le numéro est conservé',
    'pint-upload-txt': 'Cliquez pour télécharger le document',
    'pint-upload-hint':'JPG / PNG — claire et complète',
    'pint-uploaded':   '✅ Téléchargé',
    'pint-next':       'Suivant — Vérification tél. →',
    'pint-back':       '← Retour',
    'co-title':        'Informations sur l\'entreprise',
    'co-sub':          'Étape 1 — Entreprise ou organisation 🏢',
    'co-name-ph':      'Nom de l\'entreprise / organisation',
    'co-ninea-ph':     'Numéro NINEA',
    'co-email-ph':     'E-mail officiel',
    'co-city-ph':      'Ville',
    'co-pw-ph':        'Mot de passe (8 caractères min.)',
    'co-pw2-ph':       'Confirmer le mot de passe',
    'co-id-label':     '🏢 Document justificatif de l\'entreprise',
    'co-id-hint':      'Registre de commerce ou licence d\'activité',
    'co-upload-txt':   'Cliquez pour télécharger le document',
    'co-upload-hint':  'JPG / PNG / PDF',
    'co-uploaded':     '✅ Téléchargé',
    'co-next':         'Suivant — Vérification tél. →',
    'co-back':         '← Retour',
    'ph-title':        'Vérification téléphonique',
    'ph-sub':          'Dernière étape',
    'ph-note':         'Le numéro doit être enregistré à votre nom',
    'ph-ph':           'XX XX XX XX',
    'ph-otp-label':    'Entrez le code de vérification (6 chiffres)',
    'ph-resend':       'Renvoyer dans',
    'ph-send':         '📲 Envoyer le code',
    'ph-verify':       '✅ Confirmer et créer le compte',
    'ph-back':         '← Retour',
    'ok-title':        'Bienvenue sur Rizq !',
    'ok-sub':          'Votre compte a été créé avec succès.\nVous pouvez maintenant parcourir, contacter et publier.',
    'ok-review-title': 'Compte en cours de vérification',
    'ok-review-sub':   'Votre document sera examiné sous 24 heures',
    'ok-f1': 'Parcourir toutes les annonces',
    'ok-f2': 'Contacter les vendeurs',
    'ok-f3': 'Publier vos annonces — apparaissent avec ⏳',
    'ok-f4': 'Après vérification → badge "Vérifié ✅"',
    'ok-badge-title':  'Système de badges Rizq',
    'ok-b1-lbl': '⏳ En vérification', 'ok-b1-txt': 'Nouveau compte — document en cours d\'examen',
    'ok-b2-lbl': '✅ Vérifié',          'ok-b2-txt': 'Document examiné et approuvé',
    'ok-b3-lbl': '🏢 Entreprise vérifiée','ok-b3-txt': 'Enregistrée officiellement avec NINEA',
    'ok-b4-lbl': '⭐ Vendeur premium',  'ok-b4-txt': 'Pro + vérifié + note élevée',
    'ok-sms':          '🔔 Vous recevrez un SMS à la fin de la vérification',
    'ok-btn':          '🚀 Commencer à parcourir et publier',
    'ticker-live':     '🔴 En direct',
    'ticker-sub':      'Dernières annonces publiées — mise à jour automatique',
  }
};

function applyFullTranslation(lang) {
  const t = TR[lang];
  const fr = lang === 'fr';
  const dir = fr ? 'ltr' : 'rtl';

  // ── Sub-modal (category action popup) ──
  const smBrowseTitle = document.querySelector('#sub-modal .sm-btn.browse div:first-child');
  const smBrowseSub   = document.querySelector('#sub-modal .sm-btn.browse div:last-child');
  const smPostTitle   = document.querySelector('#sub-modal .sm-btn.post div:first-child');
  const smPostSub     = document.querySelector('#sub-modal .sm-btn.post div:last-child');
  const smClose       = document.querySelector('#sub-modal .sm-close');
  // Sub-modal buttons are inline text — use text content approach
  const smBrowseBtn = document.querySelector('#sub-modal button.browse > div > div:first-child');
  if(smBrowseBtn) smBrowseBtn.textContent = t['sm-browse-title'];
  const smBrowseBtnSub = document.querySelector('#sub-modal button.browse > div > div:last-child');
  if(smBrowseBtnSub) smBrowseBtnSub.textContent = t['sm-browse-sub'];
  const smPostBtn = document.querySelector('#sub-modal button.post > div > div:first-child');
  if(smPostBtn) smPostBtn.textContent = t['sm-post-title'];
  const smPostBtnSub = document.querySelector('#sub-modal button.post > div > div:last-child');
  if(smPostBtnSub) smPostBtnSub.textContent = t['sm-post-sub'];
  if(smClose) smClose.textContent = t['sm-close'];
  // Also handle the hardcoded text in sub-modal (outside .sm-btn class)
  const subModalBtns = document.querySelectorAll('#sub-modal button:not(.sm-close)');
  subModalBtns.forEach(btn => {
    const titleDiv = btn.querySelector('div > div:first-child');
    const subDiv = btn.querySelector('div > div:last-child');
    if(btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('browseSubCat')) {
      if(titleDiv) titleDiv.textContent = t['sm-browse-title'];
      if(subDiv) subDiv.textContent = t['sm-browse-sub'];
    }
    if(btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('postInSubCat')) {
      if(titleDiv) titleDiv.textContent = t['sm-post-title'];
      if(subDiv) subDiv.textContent = t['sm-post-sub'];
    }
  });
  const subCloseBtns = document.querySelectorAll('#sub-modal button');
  subCloseBtns.forEach(b => {
    if(b.getAttribute('onclick') && b.getAttribute('onclick').includes('closeSubModal') && !b.classList.contains('sm-btn')) {
      b.textContent = t['sm-close'];
    }
  });

  // ── Ad modal action buttons ──
  const amdCall = document.querySelector('.amd-btn-call');
  const amdMsg  = document.querySelector('.amd-btn-msg');
  if(amdCall) amdCall.textContent = t['amd-call'];
  if(amdMsg)  amdMsg.textContent  = t['amd-msg'];

  // ── LOGIN panel ──
  const q = id => document.querySelector(id);
  const qAll = sel => document.querySelectorAll(sel);

  const liSub   = q('#p-login .modal-auth-sub');
  const liEmail = q('#li-em');
  const liPw    = q('#li-pw');
  const liForgot= q('#li-forgot-link') || q('#p-login a');
  const liBtn   = q('#p-login .m-btn-main');
  const authTabLogin = q('#modal-tab-login');
  const authTabRegister = q('#modal-tab-register');
  const authNoAcc = q('#p-login [data-t="auth-no-account"]');
  const authCreate = q('#p-login [data-t="auth-create-free"]');
  if(liSub)    liSub.textContent    = t['li-sub'];
  const liEmLblI18n = q('label[for="li-em"]');
  const liPwLblI18n = q('label[for="li-pw"]');
  if(liEmLblI18n) liEmLblI18n.textContent = t['li-email-lbl'] || 'البريد الإلكتروني';
  if(liPwLblI18n) liPwLblI18n.textContent = t['li-pw-lbl'] || 'كلمة المرور';
  /* placeholder قصير — التسمية فوق الحقل هي النص الكامل */
  if(liEmail)  liEmail.placeholder  = t['li-email-ph'] || 'name@email.com';
  if(liPw)     liPw.placeholder     = t['li-pw-ph'] || '••••••••';
  if(liForgot) liForgot.textContent = t['li-forgot'];
  if(liBtn)    liBtn.textContent    = t['li-btn'];
  if(authTabLogin) authTabLogin.textContent = t['auth-tab-login'];
  if(authTabRegister) authTabRegister.textContent = t['auth-tab-register'];
  const authHeading = q('#p-login .modal-auth-heading');
  if(authHeading && t['auth-login-heading']) authHeading.textContent = t['auth-login-heading'];
  if(authNoAcc) authNoAcc.textContent = t['auth-no-account'];
  if(authCreate) authCreate.textContent = t['auth-create-free'];

  // ── TYPE panel ──
  const typeTitle   = q('#p-type h3');
  const typeSub     = q('#p-type > p');
  const typePrivT   = q('#type-private > div:nth-child(2) > div:first-child');
  const typePrivS   = q('#type-private > div:nth-child(2) > div:last-child');
  const typeEstT    = q('#type-estate > div:nth-child(2) > div:first-child');
  const typeEstS    = q('#type-estate > div:nth-child(2) > div:last-child');
  const typeCoT     = q('#type-company > div:nth-child(2) > div:first-child');
  const typeCoS     = q('#type-company > div:nth-child(2) > div:last-child');
  const typeNext    = q('#p-type .m-btn-main');
  const typeBack    = q('#p-type .m-link-btn');
  if(typeTitle) typeTitle.textContent = t['type-title'];
  if(typeSub)   typeSub.textContent   = t['type-sub'];
  if(typePrivT) typePrivT.textContent  = t['type-priv-title'];
  if(typePrivS) typePrivS.textContent  = t['type-priv-sub'];
  if(typeEstT)  typeEstT.textContent   = t['type-estate-title'];
  if(typeEstS)  typeEstS.textContent   = t['type-estate-sub'];
  if(typeCoT)   typeCoT.textContent    = t['type-co-title'];
  if(typeCoS)   typeCoS.textContent    = t['type-co-sub'];
  if(typeNext)  typeNext.textContent   = t['type-next'];
  if(typeBack)  typeBack.textContent   = t['type-back'];

  // ── COMPANY panel ──
  const coTitle  = q('#p-company h3');
  const coSub    = q('#p-company > p');
  const coName   = q('#co-name');
  const coNinea  = q('#co-ninea');
  const coEmail  = q('#co-email');
  const coCity   = q('#co-city');
  const coPw     = q('#co-pw');
  const coPw2    = q('#co-pw2');
  const coNext   = q('#p-company .m-btn-main');
  const coBack   = q('#p-company .m-link-btn');
  if(coTitle) coTitle.textContent = t['co-title'];
  if(coSub)   coSub.textContent   = t['co-sub'];
  if(coName)  coName.placeholder  = t['co-name-ph'];
  if(coNinea) coNinea.placeholder = t['co-ninea-ph'];
  if(coEmail) coEmail.placeholder = t['co-email-ph'];
  if(coCity)  coCity.placeholder  = t['co-city-ph'];
  if(coPw)    coPw.placeholder    = t['co-pw-ph'];
  if(coPw2)   coPw2.placeholder   = t['co-pw2-ph'];
  if(coNext)  coNext.textContent  = t['co-next'];
  if(coBack)  coBack.textContent  = t['co-back'];
  const coBox = q('#p-company div[style*="rgba(201,168,76"]');
  if(coBox) {
    const lbl = coBox.querySelector('p:first-child'); if(lbl) lbl.textContent = t['co-id-label'];
    const hint2= coBox.querySelector('p:nth-child(2)'); if(hint2) hint2.textContent = t['co-id-hint'];
    const utxt = coBox.querySelector('#uz-co p:first-of-type'); if(utxt) utxt.textContent = t['co-upload-txt'];
    const uhint= coBox.querySelector('#uz-co p:last-of-type'); if(uhint) uhint.textContent = t['co-upload-hint'];
    const uled = coBox.querySelector('#prev-co div'); if(uled) uled.textContent = t['co-uploaded'];
  }

  // ── PHONE panels (both #p-phone) ──
  qAll('#p-phone, [id="p-phone"]').forEach(panel => {
    const phTitle  = panel.querySelector('h3');
    const phSub    = panel.querySelector('#phone-step-label') || panel.querySelector('p:nth-child(2)');
    const phNote   = panel.querySelector('.ph-note') || panel.querySelector('p[style*="201,168,76"]');
    const phInput  = panel.querySelector('.ph-input');
    const phOtpLbl = panel.querySelector('#otp-wrap p:first-child');
    const phResend = panel.querySelector('#otp-wrap p:last-child');
    const phSend   = panel.querySelector('#btn-send');
    const phVerify = panel.querySelector('#btn-verify');
    const phBack   = panel.querySelector('#phone-back-btn') || panel.querySelector('.m-link-btn');
    if(phTitle)  phTitle.textContent = t['ph-title'];
    if(phSub)    phSub.textContent   = t['ph-sub'];
    if(phNote)   phNote.textContent  = t['ph-note'];
    if(phInput)  phInput.placeholder = t['ph-ph'];
    if(phOtpLbl) phOtpLbl.textContent= t['ph-otp-label'];
    if(phResend){
      var cdEl = phResend.querySelector('#cd');
      var secs = cdEl ? cdEl.textContent : '60';
      phResend.innerHTML = t['ph-resend'] + ' <span id="cd">' + secs + '</span>s';
    }
    if(phSend)   phSend.textContent  = t['ph-send'];
    if(phVerify) phVerify.textContent= t['ph-verify'];
    if(phBack)   phBack.textContent  = t['ph-back'];
  });

  // ── SUCCESS panels (both #p-ok) ──
  qAll('[id="p-ok"]').forEach(panel => {
    const okTitle = panel.querySelector('h3');
    const okSub   = panel.querySelector('p:first-of-type');
    const okBtn   = panel.querySelector('.m-btn-main');
    const reviewT = panel.querySelector('div[style*="36px"] div:first-child');
    const reviewS = panel.querySelector('div[style*="36px"] div:last-child');
    if(okTitle) okTitle.textContent = t['ok-title'];
    if(okBtn)   okBtn.textContent   = t['ok-btn'];
    if(okSub && !okSub.innerHTML.includes('<br')) okSub.textContent = fr ? 'Votre compte a été créé avec succès. Publiez votre première annonce gratuitement.' : '\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628\u0643 \u0628\u0646\u062C\u0627\u062D.\n\u0627\u0646\u0634\u0631 \u0625\u0639\u0644\u0627\u0646\u0643 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0622\u0646 \u2014 \u0645\u062C\u0627\u0646\u064B\u0627.';
    if(reviewT) reviewT.textContent = t['ok-review-title'];
    if(reviewS) reviewS.textContent = t['ok-review-sub'];
    // Feature list items
    const feats = panel.querySelectorAll('div[style*="flex-direction:column"] > div');
    const fKeys = ['ok-f1','ok-f2','ok-f3','ok-f4'];
    feats.forEach((el,i) => {
      if(fKeys[i]) {
        const txt = el.querySelector('span:last-child') || el;
        if(el.children.length > 1) el.lastElementChild.textContent = t[fKeys[i]];
      }
    });
    // Badge system title
    const badgeTitle = panel.querySelector('div[style*="rgba(255,255,255,.03)"] p');
    if(badgeTitle) badgeTitle.textContent = t['ok-badge-title'];
    // Badge labels
    const badgeRows = panel.querySelectorAll('div[style*="rgba(255,255,255,.03)"] > div > div');
    const bKeys = [['ok-b1-lbl','ok-b1-txt'],['ok-b2-lbl','ok-b2-txt'],['ok-b3-lbl','ok-b3-txt'],['ok-b4-lbl','ok-b4-txt']];
    badgeRows.forEach((row,i) => {
      if(!bKeys[i]) return;
      const lbl = row.querySelector('span:first-child');
      const txt = row.querySelector('span:last-child');
      if(lbl) lbl.textContent = t[bKeys[i][0]];
      if(txt) txt.textContent = t[bKeys[i][1]];
    });
    // SMS note
    const smsNote = panel.querySelector('div[style*="11px"]');
    if(smsNote && smsNote.textContent.includes('SMS')) smsNote.textContent = t['ok-sms'];
  });

  // ── Pricing section ──
  const pricingSection = document.querySelector('.pricing-section');
  if(pricingSection) {
    const pCards = pricingSection.querySelectorAll('.p-card');
    const pricingFR = [
      { name:'🆓 Gratuit', period:'Pour toujours — sans carte',
        feats:['5 annonces actives / mois','5 photos par annonce','Contact direct','Recherche et navigation complètes','Assistance de base'],
        btn:'Commencer gratuitement' },
      { name:'🚀 Pro', period:'Mensuel — annulez à tout moment', popular:'⭐ Le plus populaire',
        feats:['Annonces illimitées','10 photos par annonce','Badge vendeur vérifié ✅','Boost gratuit hebdomadaire','Statistiques des annonces','Priorité dans la recherche','Support dédié 24/7'],
        btn:'Démarrer Pro maintenant' },
      { name:'🏢 Business', period:'Mensuel — pour les entreprises et commerçants',
        feats:['Tous les avantages Pro','Bannière sur la page d\'accueil','Tableau de bord entreprise','Statistiques avancées','Marque vérifiée','Gestionnaire de compte dédié','Facture officielle'],
        btn:'Contactez-nous' }
    ];
    const pricingAR = [
      { name:'🆓 مجاني', period:'للأبد — بدون بطاقة',
        feats:['5 إعلانات نشطة / شهر','5 صور لكل إعلان','تواصل مباشر','بحث وتصفّح كامل','دعم أساسي'],
        btn:'ابدأ مجاناً' },
      { name:'🚀 Pro', period:'شهرياً — ألغِ في أي وقت', popular:'⭐ الأكثر شعبية',
        feats:['إعلانات غير محدودة','10 صور لكل إعلان','شارة بائع موثّق ✅','Boost مجاني أسبوعي','إحصائيات الإعلانات','أولوية في البحث','دعم مخصص 24/7'],
        btn:'ابدأ Pro الآن' },
      { name:'🏢 Business', period:'شهرياً — للشركات والتجار',
        feats:['كل مزايا Pro','بانر إعلاني في الرئيسية','لوحة تحكم الشركة','إحصائيات متقدمة','علامة تجارية موثّقة','مدير حساب مخصص','فاتورة رسمية'],
        btn:'تواصل معنا' }
    ];
    const pData = fr ? pricingFR : pricingAR;
    pCards.forEach((card,i) => {
      if(!pData[i]) return;
      const d = pData[i];
      const nameEl   = card.querySelector('.p-name');
      const periodEl = card.querySelector('.p-period');
      const btnEl    = card.querySelector('.btn-p');
      const popEl    = card.querySelector('.pop-tag');
      if(nameEl)   nameEl.textContent   = d.name;
      if(periodEl) periodEl.textContent = d.period;
      if(btnEl)    btnEl.textContent    = d.btn;
      if(popEl && d.popular) popEl.textContent = d.popular;
      const liItems = card.querySelectorAll('.p-features li');
      liItems.forEach((li,j) => { if(d.feats[j]) li.textContent = d.feats[j]; });
    });
  }

  // ── Why section (section visible in screenshot) ──
  const whySec = document.querySelector('.why-section');
  if(whySec) {
    const whyCards = whySec.querySelectorAll('.why-card');
    // إصلاح: كان عنوان هذه البطاقة "16 catégories et +120 sous-catégories" نصاً ثابتاً مكتوباً هنا مباشرة،
    // فكان يطغى على القيمة الحقيقية المحسوبة ديناميكياً من DOM (دالة refreshCatStatsText بالأسفل) في كل
    // مرة يتم فيها تبديل اللغة. الحل: حساب n/m هنا أيضاً من نفس المصدر الحقيقي الوحيد (.cats-grid).
    const __catsGridWhy = document.querySelector('.cats-grid');
    const __catN = __catsGridWhy ? __catsGridWhy.querySelectorAll('.cat-card').length : 16;
    const __catM = __catsGridWhy ? __catsGridWhy.querySelectorAll('.cat-card .drop-link').length : 120;
    const whyDataFR = [
      { title:'Une confiance digne du marché mauritanien', desc:"Rizq, un marché sérieux pour acheter et vendre — clarté dans les échanges, sérénité dans l'expérience, et un marché qui relie vendeurs et acheteurs." },
      { title:'Un marché pour chaque besoin', desc:"De l'immobilier aux chameaux, de la daraa aux engins — tout ce que vous cherchez au même endroit." },
      { title:"Publiez en moins d'une minute", desc:"Photographiez, fixez le prix, publiez — votre annonce atteint des acheteurs déjà actifs sur Rizq." }
    ];
    const whyDataAR = [
      { title:'ثقة تليق بسوق موريتانيا', desc:'رزق سوق جادّ للبيع والشراء — وضوح في التعامل، طمأنينة في التجربة، وسوق واحد يجمعك بالمشترين والبائعين.' },
      { title:'سوق يغطي كل حاجة', desc:'من العقارات إلى الإبل، من الدراعة إلى الحفارات — كل ما تبحث عنه في مكان واحد.' },
      { title:'انشر في أقل من دقيقة', desc:'صوّر، ضع السعر، انشر — إعلانك يصل لمشترين يبحثون الآن على رزق.' }
    ];
    const wData = fr ? whyDataFR : whyDataAR;
    whyCards.forEach((card,i) => {
      if(!wData[i]) return;
      const tEl = card.querySelector('.why-title');
      const dEl = card.querySelector('.why-desc');
      if(tEl) tEl.textContent = wData[i].title;
      if(dEl) dEl.textContent = wData[i].desc;
    });
  }

  // ── Footer networks label ──
  // (الإصلاح القديم هنا كان selector هشاً يطابق حرف "R" بالشعار بدل وسم الشبكات،
  //  فلا يُترجم أبداً — الآن يُترجم تلقائياً عبر data-t="ft-net-label" في حلقة [data-t] أعلاه)
  // ── Footer "تواصل معنا" column title (no data-t) ──
  document.querySelectorAll('.footer-col-title').forEach(h4 => {
    if(!h4.dataset.t) h4.textContent = fr ? 'Contactez-nous' : 'تواصل معنا';
  });

  // ── Footer links (quick links + top cats + help) ──
  const ftLinks = document.querySelectorAll('.footer-links');
  const ftQuickFR = ['Accueil','Annuaire Rizq','Annuaire immobilier','Parcourir les annonces','Publier une annonce','Pouls du marché','À propos','Pourquoi Rizq','Société propriétaire'];
  const ftQuickAR = ['الرئيسية','دليل رزق','دليل سوق العقارات','تصفّح الإعلانات','انشر إعلانك','نبضة السوق','من نحن','لماذا رزق','الشركة المالكة'];
  const ftCatsFR  = ['🏠 Immobilier','🚗 Voitures & pièces','🚛 Camions & engins','📱 Téléphones & électronique','🐄 Bétail & animaux'];
  const ftCatsAR  = ['🏠 منازل وعقارات','🚗 سيارات وقطع غيار','🚛 شاحنات ومعدات','📱 هواتف وإلكترونيات','🐄 ماشية وحيوانات'];
  const ftHelpFR  = ['Centre d\'aide','Politique de confidentialité','Conditions d\'utilisation','Signaler une annonce','Contactez-nous'];
  const ftHelpAR  = ['مركز المساعدة','سياسة الخصوصية','شروط الاستخدام','الإبلاغ عن إعلان','تواصل معنا'];
  const ftSources = fr ? [ftQuickFR, ftCatsFR, ftHelpFR] : [ftQuickAR, ftCatsAR, ftHelpAR];
  ftLinks.forEach((ul,i) => {
    if(!ftSources[i]) return;
    ul.querySelectorAll('a').forEach((a,j) => { if(ftSources[i][j]) a.textContent = ftSources[i][j]; });
  });

  // ── Ticker items (scroll bar at top of hero) ──
  const tickerItems = document.querySelectorAll('.ticker-item strong');
  // These are price/product names, keep as-is (numbers and brands are universal)

  // ── Stats bar ──
  const statNums = document.querySelectorAll('.hero-stats-bar .h-stat-num');
  const lastStat = statNums[statNums.length-1];
  if(lastStat && lastStat.hasAttribute('data-count-text')) lastStat.textContent = fr ? 'Gratuit' : 'مجاني';

  // ── Ticker label — كبسولة مباشر ──
  if(typeof paintLiveListingsLabel === 'function') paintLiveListingsLabel();
  else {
    const tickerSpan = document.querySelector('.listings-label > span');
    if(tickerSpan) tickerSpan.innerHTML = liveListingsLabelHtml(fr);
  }
  if(typeof syncAllMarquees === 'function') setTimeout(syncAllMarquees, 40);

  // ── Modal direction ──
  const modalBox2 = document.querySelector('.modal-box');
  if(modalBox2) { modalBox2.style.direction = dir; modalBox2.style.textAlign = fr ? 'left' : 'right'; }
  const subModal2 = document.getElementById('sub-modal');
  if(subModal2) { subModal2.style.direction = dir; subModal2.style.textAlign = fr ? 'left' : 'right'; }
  const adModalBox2 = document.getElementById('ad-modal-box');
  if(adModalBox2) adModalBox2.style.direction = dir;
}

function tp(id){const e=document.getElementById(id);e.type=e.type==='password'?'text':'password';}
