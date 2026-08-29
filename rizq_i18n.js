/* ════════════════════════════════════════════════════════════════
   RIZQ I18N ENGINE — نظام الترجمة الموحّد لكل صفحات منصة رزق
   ────────────────────────────────────────────────────────────────
   يعمل بدون أي اعتماد على سيرفر: يقرأ القاموس من المتغيّرات العامة
   window.RIZQ_I18N_AR / window.RIZQ_I18N_FR التي يحمّلها ملف
   rizq_i18n_data.js (يجب وضعه في <script> قبل هذا الملف في كل صفحة).
   النسخة "الرسمية" القابلة للقراءة/التصدير من نفس المحتوى موجودة في
   ar.json و fr.json — لأي استخدام مستقبلي (أداة ترجمة، باك إند...).

   الاستخدام في كل صفحة:
     <script src="rizq_i18n_data.js"></script>
     <script src="rizq_i18n.js"></script>
     ... ضع data-t="key" على أي عنصر، و data-t-ns="namespace" على
     أب مشترك (مثل <body data-t-ns="dashboard">) أو على عنصر بعينه.
     زر تبديل اللغة: أي عنصر بصنف class="btn-lang" يعمل تلقائياً —
     لا حاجة لـ onclick يدوي ولا لتكرار الكود في كل صفحة.
   ════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function getSavedLang() {
    try { return localStorage.getItem('rizq_lang') || 'ar'; }
    catch (e) { return 'ar'; }
  }
  function saveLang(lang) {
    try { localStorage.setItem('rizq_lang', lang); } catch (e) {}
  }

  var state = { lang: getSavedLang() };

  /** rizq_browse.html — keys not yet in rizq_i18n_data.js common/browse namespace */
  var BROWSE_I18N = {
    ar: {
      'nav-post': '➕ انشر إعلان',
      'nav-account': 'حسابي',
      'nav-home': 'الرئيسية',
      'all-cats': 'كل الأقسام',
      'filter-title': 'تصفية النتائج',
      'filter-cat': 'القسم',
      'filter-wilaya': 'الولاية',
      'filter-price': 'السعر (MRU)',
      'filter-rooms': 'عدد الغرف',
      'filter-opts': 'خيارات أخرى',
      'btn-clear-mini': 'مسح',
      'btn-apply': 'تطبيق الفلاتر',
      'btn-reset': 'مسح الكل',
      'all-wilayas': 'كل الولايات',
      'f-verified': 'موثّق فقط',
      'f-pinned': 'مميّز فقط',
      'result-count-label': 'إعلان',
      'sort-default': 'الأحدث',
      'sort-price-asc': 'السعر: الأقل',
      'sort-price-desc': 'السعر: الأعلى',
      'sort-pin': 'المميّزة أولاً',
      'tab-list': '📋 النتائج',
      'tab-detail': '📄 التفاصيل',
      'empty-detail-h': 'اختر إعلاناً للاطلاع على تفاصيله',
      'empty-detail-p': 'انقر على أي إعلان في القائمة لعرض التفاصيل الكاملة هنا',
      'chat-seller-lbl': 'البائع',
      'chat-online': '● متصل الآن',
      'cs1': 'هل ما زال متاحاً؟',
      'cs2': 'ما هو أقل سعر؟',
      'cs3': 'هل يمكن الزيارة؟',
      'chat-ph': 'اكتب رسالة...',
      'chat-send': 'إرسال',
      'chat-continue-wa': 'متابعة المحادثة على واتساب',
      'price-r1': 'أقل من 50,000',
      'price-r2': '50,000 — 150,000',
      'price-r3': '150,000 — 500,000',
      'price-r4': 'أكثر من 500,000',
      'save-ad': '♡ حفظ',
      'share-ad': '↗ مشاركة',
      'nav-search-ph': 'ابحث في رزق...',
      'dp-phone-hint': '👆 انقر لإظهار الرقم',
      'dp-phone-shown': '📞 انقر للاتصال',
      'dp-call': '📞 اتصال الآن',
      'dp-whatsapp': 'واتساب',
      'dp-msg': '✉️ مراسلة البائع',
      'dp-save': '♡ حفظ',
      'dp-share': '↗ مشاركة',
      'dp-print': '🖨️ طباعة',
      'dp-report': '🚨 الإبلاغ عن هذا الإعلان',
      'dp-safety': '⚠️ نصائح الأمان',
      'dp-read-more': '▾ قراءة المزيد',
      'dp-read-less': '▴ إخفاء',
      'dp-map-link': '🗺️ فتح في OpenStreetMap',
      'dp-similar': '🔍 إعلانات مشابهة',
      'dp-specs': '📋 المواصفات',
      'dp-tags': '🏷️ الوسوم',
      'dp-location': '📍 الموقع',
      'dp-desc': '📝 الوصف',
      'dp-seller-verified': '✅ بائع موثّق',
      'dp-featured': '⭐ إعلان مميّز',
      'stat-ads': 'إعلاناً',
      'stat-cats': 'قسماً',
      'stat-wilayas': 'ولاية',
      'room-studio': 'استوديو',
      'mobile-filter': '🎛️ الفلاتر',
      'sc-apts-rent': 'شقق للكراء',
      'sc-houses-rent': 'منازل للكراء',
      'sc-apts-sale': 'شقق للبيع',
      'sc-land': 'أراضي',
      'cat-immo': '🏠 عقارات',
      'cat-cars': '🚗 سيارات',
      'cat-elec': '📱 إلكترونيات',
      'cat-gold': '💰 ذهب',
      'cat-live': '🐪 ماشية',
      'cat-serv': '🔧 خدمات',
      'browse-ads': 'تصفح الإعلانات',
      'promo-browse': 'تصفح الإعلانات',
      'promo-title': 'انضم إلى <span>رزق</span> اليوم',
      'promo-sub': 'المنصة الأولى للإعلانات المجانية في موريتانيا — ابدأ في ثوانٍ',
      'promo-post': '➕ انشر إعلانك مجاناً',
      'price-min': 'الأدنى',
      'price-max': 'الأقصى',
      'no-subs': 'لا توجد فروع',
      'nav-cats': 'الأقسام',
      'nav-assistant': '✨ رزق ذكي',
      'hero-ai-smart': '✨ رزق ذكي — مساعدك على المنصة',
      'nav-more': 'المزيد ▾',
      'dd-stores': 'المحلات',
      'dd-offices': 'المكاتب',
      'dd-rizqads': 'Rizq ADS',
      'dd-ads': 'الإعلانات',
      'dd-tenders': 'المناقصات',
      'dd-packs': 'الباقات',
      'dd-legal': 'المادة القانونية',
      'dd-about': 'من نحن',
      'hdr-home': 'الرئيسية',
      'hdr-cats': 'الأقسام',
      'hdr-post': 'نشر (+)',
      'hdr-ai': '✨ رزق ذكي',
      'hdr-more': 'المزيد',
      'hdr-more-dd': 'المزيد ▾',
      'hdr-stores': 'المحلات',
      'hdr-offices': 'المكاتب',
      'hdr-ads': 'الإعلانات',
      'hdr-tenders': 'المناقصات',
      'hdr-packs': 'الباقات',
      'hdr-legal': 'المادة القانونية',
      'hdr-about': 'من نحن',
      'hdr-account': 'حسابي'
    },
    fr: {
      'nav-post': '➕ Publier une annonce',
      'nav-account': 'Mon compte',
      'nav-home': 'Accueil',
      'all-cats': 'Toutes catégories',
      'filter-title': 'Filtrer les résultats',
      'filter-cat': 'Catégorie',
      'filter-wilaya': 'Wilaya',
      'filter-price': 'Prix (MRU)',
      'filter-rooms': 'Nb. de chambres',
      'filter-opts': 'Autres options',
      'btn-clear-mini': 'Effacer',
      'btn-apply': 'Appliquer',
      'btn-reset': 'Tout effacer',
      'all-wilayas': 'Toutes les wilayas',
      'f-verified': 'Vérifiés seulement',
      'f-pinned': 'En vedette seulement',
      'result-count-label': 'annonce(s)',
      'sort-default': 'Plus récentes',
      'sort-price-asc': 'Prix: croissant',
      'sort-price-desc': 'Prix: décroissant',
      'sort-pin': 'En vedette d\'abord',
      'tab-list': '📋 Résultats',
      'tab-detail': '📄 Détails',
      'empty-detail-h': 'Sélectionnez une annonce',
      'empty-detail-p': 'Cliquez sur une annonce pour voir ses détails ici',
      'chat-seller-lbl': 'Le vendeur',
      'chat-online': '● En ligne',
      'cs1': 'Est-ce encore disponible?',
      'cs2': 'Quel est le prix minimum?',
      'cs3': 'Puis-je visiter?',
      'chat-ph': 'Écrire un message...',
      'chat-send': 'Envoyer',
      'chat-continue-wa': 'Continuer sur WhatsApp',
      'price-r1': 'Moins de 50 000',
      'price-r2': '50 000 — 150 000',
      'price-r3': '150 000 — 500 000',
      'price-r4': 'Plus de 500 000',
      'save-ad': '♡ Sauvegarder',
      'share-ad': '↗ Partager',
      'nav-search-ph': 'Rechercher sur Rizq...',
      'dp-phone-hint': '👆 Cliquez pour afficher',
      'dp-phone-shown': '📞 Cliquez pour appeler',
      'dp-call': '📞 Appeler maintenant',
      'dp-whatsapp': 'WhatsApp',
      'dp-msg': '✉️ Messagerie Rizq',
      'dp-save': '♡ Sauvegarder',
      'dp-share': '↗ Partager',
      'dp-print': '🖨️ Imprimer',
      'dp-report': '🚨 Signaler cette annonce',
      'dp-safety': '⚠️ Conseils de sécurité',
      'dp-read-more': '▾ Lire la suite',
      'dp-read-less': '▴ Réduire',
      'dp-map-link': '🗺️ Ouvrir dans OpenStreetMap',
      'dp-similar': '🔍 Annonces similaires',
      'dp-specs': '📋 Caractéristiques',
      'dp-tags': '🏷️ Tags',
      'dp-location': '📍 Localisation',
      'dp-desc': '📝 Description',
      'dp-seller-verified': '✅ Vendeur vérifié',
      'dp-featured': '⭐ Annonce en vedette',
      'stat-ads': 'annonces',
      'stat-cats': 'catégories',
      'stat-wilayas': 'wilayas',
      'room-studio': 'Studio',
      'mobile-filter': '🎛️ Filtres',
      'sc-apts-rent': 'Appartements à louer',
      'sc-houses-rent': 'Maisons à louer',
      'sc-apts-sale': 'Appartements à vendre',
      'sc-land': 'Terrains',
      'cat-immo': '🏠 Immobilier',
      'cat-cars': '🚗 Voitures',
      'cat-elec': '📱 Électronique',
      'cat-gold': '💰 Or & Bijoux',
      'cat-live': '🐪 Bétail',
      'cat-serv': '🔧 Services',
      'browse-ads': 'Parcourir les annonces',
      'promo-browse': 'Parcourir',
      'promo-title': 'Rejoignez <span>Rizq</span> aujourd\'hui',
      'promo-sub': 'La 1ère plateforme d\'annonces gratuites en Mauritanie — Commencez en secondes',
      'promo-post': '➕ Publiez votre annonce gratuitement',
      'price-min': 'Min',
      'price-max': 'Max',
      'no-subs': 'Aucune sous-catégorie',
      'nav-cats': 'Catégories',
      'nav-assistant': '✨ Rizq IA',
      'hero-ai-smart': '✨ Rizq IA — votre assistant',
      'nav-more': 'Plus ▾',
      'dd-stores': 'Boutiques',
      'dd-offices': 'Bureaux',
      'dd-rizqads': 'Rizq ADS',
      'dd-ads': 'Annonces',
      'dd-tenders': 'Appels d\'offres',
      'dd-packs': 'Forfaits',
      'dd-legal': 'Mentions légales',
      'dd-about': 'À propos',
      'hdr-home': 'Accueil',
      'hdr-cats': 'Catégories',
      'hdr-post': 'Publier (+)',
      'hdr-ai': '✨ Rizq IA',
      'hdr-more': 'Plus',
      'hdr-more-dd': 'Plus ▾',
      'hdr-stores': 'Boutiques',
      'hdr-offices': 'Bureaux',
      'hdr-ads': 'Annonces',
      'hdr-tenders': 'Appels d\'offres',
      'hdr-packs': 'Forfaits',
      'hdr-legal': 'Mentions légales',
      'hdr-about': 'À propos',
      'hdr-account': 'Compte'
    }
  };

  function mergeBrowseTable(table, lang) {
    if (!table) return table;
    var patch = BROWSE_I18N[lang] || {};
    var out = {};
    var ns;
    for (ns in table) {
      if (Object.prototype.hasOwnProperty.call(table, ns)) out[ns] = table[ns];
    }
    if (!out.common) out.common = {};
    for (ns in patch) {
      if (Object.prototype.hasOwnProperty.call(patch, ns)) out.common[ns] = patch[ns];
    }
    out.browse = Object.assign({}, out.browse || {}, patch);
    return out;
  }

  /* Apply lang/dir immediately so later pages do not flash the wrong direction. */
  (function bootRootDir() {
    try {
      document.documentElement.lang = state.lang;
      document.documentElement.setAttribute('dir', state.lang === 'ar' ? 'rtl' : 'ltr');
    } catch (e) {}
  })();

  function dict() {
    if (global.RIZQ_I18N_AR && global.RIZQ_I18N_FR) {
      return {
        ar: mergeBrowseTable(global.RIZQ_I18N_AR, 'ar'),
        fr: mergeBrowseTable(global.RIZQ_I18N_FR, 'fr')
      };
    }
    if (global.console) {
      console.warn('[RizqI18n] rizq_i18n_data.js غير محمَّل — تأكد من ترتيب <script> في هذه الصفحة.');
    }
    return { ar: {}, fr: {} };
  }

  function lookup(table, ns, key) {
    if (!table) return null;
    if (ns && table[ns] && table[ns][key] != null) return table[ns][key];
    if (table.common && table.common[key] != null) return table.common[key];
    return null;
  }

  // _t('key')                -> يبحث في common فقط (أو في ns المحدد بـ data-t-ns على body)
  // _t('key', 'dashboard')   -> يبحث في قسم dashboard ثم common كحل احتياطي
  function _hasArabic(s) {
    return /[\u0600-\u06FF]/.test(String(s || ''));
  }

  function _t(key, ns) {
    var D = dict();
    var primary = D[state.lang] || D.ar;
    var val = lookup(primary, ns, key);
    // لا نُرجع العربية كاحتياطي في الواجهة الفرنسية — هذا كان مصدر تسرب i18n
    if (val == null && state.lang !== 'fr') {
      val = lookup(D.ar, ns, key);
    }
    if (state.lang === 'fr' && val && _hasArabic(val)) return '';
    return val || '';
  }

  // اختصار شائع داخل دوال render*() : _t2('نص عربي', 'texte français')
  function _t2(ar, fr) {
    return state.lang === 'fr' ? fr : ar;
  }

  function pageNs() {
    return document.body && document.body.getAttribute('data-t-ns');
  }

  /** جسر data-t-fr / data-ph-fr — فصل تام بين العربية والفرنسية */
  function applyLegacyBridge(root) {
    root = root || document;
    var isFr = state.lang === 'fr';
    root.querySelectorAll('[data-t-fr]').forEach(function (el) {
      if (!el.hasAttribute('data-t-ar')) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.setAttribute('data-t-ar', el.value || el.placeholder || '');
        } else {
          el.setAttribute('data-t-ar', el.innerHTML);
        }
      }
      var val = isFr ? el.getAttribute('data-t-fr') : el.getAttribute('data-t-ar');
      if (val == null) return;
      if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.hasAttribute('data-ph-fr') && !el.hasAttribute('data-ph')) {
        el.placeholder = val;
      } else if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
        el.innerHTML = val;
      }
    });
    root.querySelectorAll('[data-ph-fr]').forEach(function (el) {
      if (!el.hasAttribute('data-ph-ar')) el.setAttribute('data-ph-ar', el.placeholder || '');
      el.placeholder = isFr ? el.getAttribute('data-ph-fr') : el.getAttribute('data-ph-ar');
    });
    root.querySelectorAll('option[data-t-fr]').forEach(function (el) {
      if (!el.hasAttribute('data-t-ar')) el.setAttribute('data-t-ar', el.textContent);
      el.textContent = isFr ? el.getAttribute('data-t-fr') : el.getAttribute('data-t-ar');
    });
  }

  function applyDocumentTitle() {
    var titleEl = document.querySelector('title');
    if (!titleEl) return;
    if (!titleEl.hasAttribute('data-t-ar')) {
      var arFromBody = document.body && document.body.getAttribute('data-t-title-ar');
      if (arFromBody) titleEl.setAttribute('data-t-ar', arFromBody);
      else titleEl.setAttribute('data-t-ar', titleEl.textContent);
    }
    var ar = titleEl.getAttribute('data-t-ar');
    var fr = titleEl.getAttribute('data-t-fr') || (document.body && document.body.getAttribute('data-t-title-fr'));
    if (fr) document.title = state.lang === 'fr' ? fr : ar;
  }

  function applyStaticDom(root) {
    root = root || document;
    var defaultNs = pageNs();
    root.querySelectorAll('[data-t]').forEach(function (el) {
      var key = el.getAttribute('data-t');
      var ns = el.getAttribute('data-t-ns') || defaultNs;
      var val = _t(key, ns);
      if (!val) return;
      if (state.lang === 'fr' && _hasArabic(val)) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
      else if (el.tagName === 'OPTION') el.textContent = val;
      else el.innerHTML = val;
    });
    root.querySelectorAll('[data-ph]').forEach(function (el) {
      var key = el.getAttribute('data-ph');
      var ns = el.getAttribute('data-t-ns') || defaultNs;
      var val = _t(key, ns);
      if (val) el.placeholder = val;
    });
    root.querySelectorAll('[data-t-title]').forEach(function (el) {
      var key = el.getAttribute('data-t-title');
      var ns = el.getAttribute('data-t-ns') || defaultNs;
      var val = _t(key, ns);
      if (val) el.title = val;
    });
    applyLegacyBridge(root);
  }

  function applyRootDir(lang) {
    var l = lang === 'fr' ? 'fr' : 'ar';
    var root = document.documentElement;
    root.lang = l;
    root.setAttribute('lang', l);
    root.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    if (document.body) {
      document.body.classList.toggle('rizq-lang-ar', l === 'ar');
      document.body.classList.toggle('rizq-lang-fr', l === 'fr');
    }
  }

  /** Drop leftover dir= on chrome that would leak RTL into FR (and vice versa).
      Keep phone numbers, tel links, the logo lockup, and the chat window. */
  function stripLeakedDirs() {
    var keep = '.logo,.rizq-hdr-brand,.logo-text,.phone-num,#rizq-chat-window,.rw-input,[href^="tel:"],input[type="tel"],.btn-lang-primary,#rizq-lang-btn,#nav-lang-btn,#rizq-desk-lang-btn';
    document.querySelectorAll('nav, .nav-center, .nav-dropdown-li, .nav-dropdown-menu, .rizq-hdr-row2, .rizq-hdr-more-menu, .modal-overlay, .modal-box, #qcat-portal, #cat-inline-panel, .rzq-sheet, .why-grid, footer, .hero-pills').forEach(function (el) {
      if (el.closest && el.closest(keep)) return;
      if (el.hasAttribute('dir')) el.removeAttribute('dir');
      if (el.style && el.style.direction) el.style.direction = '';
    });
  }

  /* Primary lang pill: compact [ FR | AR ] — LTR inside button so RTL pages do not flip. */
  var PRIMARY_LANG_BTN_HTML =
    '<span class="lang-fr" dir="ltr">FR</span>' +
    '<span class="lang-sep" aria-hidden="true"> | </span>' +
    '<span class="lang-ar" dir="ltr">AR</span>';

  function isPrimaryLangBtn(btn) {
    return !!(btn && (
      btn.classList.contains('btn-lang-primary') ||
      btn.id === 'rizq-lang-btn' ||
      btn.id === 'rizq-desk-lang-btn' ||
      btn.id === 'nav-lang-btn'
    ));
  }

  function paintPrimaryLangBtn(btn) {
    if (!btn) return;
    btn.setAttribute('dir', 'ltr');
    btn.innerHTML = PRIMARY_LANG_BTN_HTML;
    btn.setAttribute('aria-label', 'FR | AR');
  }

  function applyLang(lang) {
    state.lang = lang === 'fr' ? 'fr' : 'ar';
    saveLang(state.lang);
    applyRootDir(state.lang);
    stripLeakedDirs();
    document.querySelectorAll('.btn-lang').forEach(function (btn) {
      if (isPrimaryLangBtn(btn)) {
        paintPrimaryLangBtn(btn);
        return;
      }
      btn.textContent = state.lang === 'ar' ? 'FR' : 'AR';
      btn.setAttribute('aria-label', state.lang === 'ar' ? 'Passer au français' : 'التبديل إلى العربية');
    });
    applyStaticDom(document);
    applyDocumentTitle();
    document.dispatchEvent(new CustomEvent('rizq:langchange', { bubbles: true, detail: { lang: state.lang } }));
  }

  function toggle() {
    applyLang(state.lang === 'ar' ? 'fr' : 'ar');
  }

  function init() {
    applyLang(state.lang);
    // تفويض النقر: أي زر بصنف btn-lang في أي صفحة يعمل تلقائياً دون onclick يدوي
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.btn-lang');
      if (!btn) return;
      if (btn.id === 'rizq-lang-btn') return;
      toggle();
    });
  }

  global.RizqI18n = {
    t: _t,
    t2: _t2,
    apply: applyLang,
    toggle: toggle,
    init: init,
    getLang: function () { return state.lang; },
    applyStaticDom: applyStaticDom,
    applyRootDir: applyRootDir,
    stripLeakedDirs: stripLeakedDirs,
    paintPrimaryLangBtn: paintPrimaryLangBtn,
    isPrimaryLangBtn: isPrimaryLangBtn
  };

  // توافق رجعي: أي onclick="toggleLangPage()" قديم متبقٍ في صفحة لم تُهاجَر بعد يستمر بالعمل
  global.toggleLangPage = toggle;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
