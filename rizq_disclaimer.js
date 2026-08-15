/**
 * rizq_disclaimer.js
 * منطق شريط/نافذة "الإشعار القانوني" — موحّد في ملف واحد يُستدعى من كل صفحات
 * المنصة (الزوار + الداشبوردات) بدل تكراره يدوياً في كل ملف على حدة.
 *
 * ── لماذا هذا الملف موجود ──
 * قبل هذا الملف، كان نفس منطق الإشعار القانوني (~110 سطر) منسوخاً يدوياً في
 * 15 ملف HTML مختلف. النتيجة توثقت عملياً: كل نسخة انحرفت قليلاً عن الأخرى
 * (بعضها فقد جملة كاملة عن المسؤولية القانونية، بعضها لم يُطبّق نص الأدمن
 * المخصص إطلاقاً، بعضها لم يكن يُحدّث الشارة عند تبديل اللغة على الإطلاق —
 * rizq_browse.html و rizq_store.html لم يكن فيهما أي مزامنة لغة للشارة أصلاً).
 * وأي إصلاح مستقبلي كان يعني تكراره يدوياً 15 مرة، مع خطر نسيان نسخة واحدة
 * على الأقل — وهذا بالضبط ما حصل أكثر من مرة هذه الجلسة.
 *
 * الاستخدام: أضف ببساطة بعد rizq_backend_config.js:
 *   <script src="rizq_backend_config.js"></script>
 *   <script src="rizq_disclaimer.js"></script>
 * ويجب أن تحتوي الصفحة على عناصر الواجهة المعتادة (اختيارية، كل واحد منها
 * يُفحص بأمان قبل الاستخدام): .disc-modal, #disc-title, #disc-sub,
 * #disc-h1..#disc-h5, #disc-p1..#disc-p5, #disc-footer-main, #disc-close-lbl,
 * #discOverlay, #nav-disclaimer-txt, #fixed-disc-pill (onclick="openDisc()").
 *
 * أي صفحة تحتاج سلوكاً إضافياً عند تبديل اللغة (مثل rizq_post.html التي كانت
 * تستدعي window._rzqApplyFt() في تصحيحها الخاص) يمكنها ببساطة تعريف
 * window._rzqApplyFt = function(){...} قبل أو بعد هذا الملف — هذا الملف
 * يستدعيها تلقائياً إن وُجدت، دون الحاجة لتكرار منطق الإشعار نفسه.
 */
(function (global) {
  'use strict';

  // ── النص القانوني الكامل (النسخة الموحَّدة المعتمدة — كانت متطابقة أصلاً في
  // 10 من أصل 15 ملفاً؛ النسخ الأخرى (profile/dashboard/dashboard_store كانت
  // مختصرة قليلاً، وdashboard_office/corp كانتا مختصرتين بشكل أكبر) تُوحَّد
  // الآن جميعها على هذا النص الكامل بدل الانحراف التدريجي بين الملفات) ──
  var _DISC = {
    ar: {
      title: '⚖️ إشعار قانوني هام', sub: 'منصة رزق — موريتانيا',
      h1: '📢 رزق وسيط نشر إلكتروني فقط',
      p1: 'رزق منصة إلكترونية مخصصة لنشر الإعلانات التجارية فقط.', p1b: 'ليست طرفاً في أي عقد أو معاملة تجارية',
      p1s: ' تجري بين البائع والمشتري، ولا تتحمل أي مسؤولية قانونية أو مالية عن أي نزاع ينشأ بين الأطراف.',
      h2: '🤝 مسؤولية الأطراف المتعاقدة',
      p2: 'جميع الاتفاقيات والمدفوعات والتسليمات تتم ', p2b: 'مباشرة بين البائع والمشتري',
      p2s: '. رزق لا تضمن جودة المنتجات أو الخدمات المعروضة، ولا تتحمل مسؤولية عدم التسليم أو التلاعب في الأسعار. كما لا تضمن رزق دقة أو جدّية عروض الأسعار المقدَّمة عبر ميزة "المناقصات"، ولا تتدخل بأي شكل في اختيار الفائز بينها — القرار يبقى بالكامل بين ناشر المناقصة ومقدّمي العروض.',
      h3: '🔍 تحذير المشتري — عاين قبل الدفع',
      p3: 'يُنصح بشدة ', p3b: 'بمعاينة البضاعة والتحقق منها قبل أي دفع',
      p3s: '. رزق غير مسؤولة عن أي خسارة مالية ناجمة عن الدفع المسبق دون تحقق مسبق.',
      h4: '🗑️ حق حذف المحتوى المخالف',
      p4: 'تحتفظ رزق بالحق الكامل في ', p4b: 'حذف أي إعلان', p4m: ' يخالف القانون الموريتاني أو سياسة المنصة، ', p4c: 'دون إخطار مسبق وبدون أي التزام بالتعويض', p4s: '.',
      h5: '🔒 البيانات الشخصية والخصوصية',
      p5: 'البيانات المُدخلة في المنصة تُستخدم ', p5b: 'فقط لأغراض التواصل والنشر',
      p5s: '. لا تُباع ولا تُشارك مع أطراف ثالثة دون موافقة صريحة.',
      footer: 'باستخدامك لمنصة رزق، فإنك تقرّ بقراءة هذا الإشعار والموافقة الضمنية على جميع بنوده.',
      close: 'فهمت — أغلق', nav: '⚖️ رزق وسيط نشر إلكتروني فقط — عاين قبل الدفع'
    },
    fr: {
      title: '⚖️ Avis Juridique Important', sub: 'Plateforme Rizq — Mauritanie',
      h1: '📢 Rizq est uniquement un diffuseur électronique',
      p1: 'Rizq est une plateforme dédiée à la publication d\'annonces commerciales uniquement.', p1b: 'Elle n\'est partie à aucun contrat ou transaction commerciale',
      p1s: ' entre vendeur et acheteur, et ne saurait être tenue responsable de tout litige survenant entre les parties.',
      h2: '🤝 Responsabilité des parties contractantes',
      p2: 'Tous les accords, paiements et livraisons se font ', p2b: 'directement entre le vendeur et l\'acheteur',
      p2s: '. Rizq ne garantit pas la qualité des produits ou services et n\'est pas responsable des non-livraisons ou manquements. Rizq ne garantit pas non plus l\'exactitude ou le sérieux des offres soumises via la fonctionnalité « Appels d\'offres », et n\'intervient en aucune façon dans le choix du gagnant — cette décision relève exclusivement de l\'auteur de l\'appel d\'offres et des soumissionnaires.',
      h3: '🔍 Avertissement acheteur — Vérifiez avant paiement',
      p3: 'Il est ', p3b: 'fortement conseillé de vérifier la marchandise avant tout paiement',
      p3s: '. Rizq décline toute responsabilité pour les pertes financières résultant d\'un paiement anticipé sans vérification.',
      h4: '🗑️ Droit de suppression de contenu',
      p4: 'Rizq se réserve le droit de ', p4b: 'supprimer toute annonce', p4m: ' violant les bonnes mœurs, la loi mauritanienne ou la politique de la plateforme, ', p4c: 'sans préavis et sans obligation d\'indemnisation', p4s: '.',
      h5: '🔒 Données personnelles et confidentialité',
      p5: 'Les données saisies sur la plateforme sont utilisées ', p5b: 'uniquement à des fins de communication et de publication',
      p5s: '. Elles ne sont ni vendues ni partagées avec des tiers sans consentement explicite.',
      footer: 'En utilisant la plateforme Rizq, vous reconnaissez avoir lu cet avis et y consentir implicitement.',
      close: 'Compris — Fermer', nav: '⚖️ Rizq = diffuseur uniquement — vérifiez avant paiement'
    }
  };

  function _discLang() {
    try { return localStorage.getItem('rizq_lang') || 'ar'; } catch (e) { return 'ar'; }
  }

  function _discGetCustom(lang) {
    try {
      var ar = localStorage.getItem('rizq_disc_nav_ar');
      var fr = localStorage.getItem('rizq_disc_nav_fr');
      if (lang === 'fr' && fr) return fr;
      if (lang === 'ar' && ar) return ar;
    } catch (e) {}
    return null;
  }

  // ── إصلاح ضمن التوحيد: _discApply كانت في كل نسخة تكتب نص الإشعار الافتراضي
  // فقط على شارة الملاحة، ثم يعتمد كل ملف على منطق منفصل (أحياناً غائب) لإعادة
  // تطبيق نص الأدمن المخصص فوقه. الآن _discApply نفسها تتحقق من النص المخصص
  // دائماً، فتبديل اللغة أو أي استدعاء لاحق لا يفقد أبداً تخصيص الأدمن. ──
  function _discApply(l) {
    var d = _DISC[l] || _DISC.ar;
    var modal = document.querySelector('.disc-modal');
    if (modal) { modal.setAttribute('dir', l === 'fr' ? 'ltr' : 'rtl'); modal.style.direction = l === 'fr' ? 'ltr' : 'rtl'; }
    var s = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    var h = function (id, t) { var e = document.getElementById(id); if (e) e.innerHTML = t; };
    s('disc-title', d.title); s('disc-sub', d.sub);
    s('disc-h1', d.h1); s('disc-h2', d.h2); s('disc-h3', d.h3); s('disc-h4', d.h4); s('disc-h5', d.h5);
    h('disc-p1', d.p1 + '<strong style="color:#E8C96A">' + d.p1b + '</strong>' + d.p1s);
    h('disc-p2', d.p2 + '<strong style="color:#E8C96A">' + d.p2b + '</strong>' + d.p2s);
    h('disc-p3', d.p3 + '<strong style="color:#E8C96A">' + d.p3b + '</strong>' + d.p3s);
    h('disc-p4', d.p4 + '<strong style="color:#E8C96A">' + d.p4b + '</strong>' + d.p4m + '<strong style="color:#E8C96A">' + d.p4c + '</strong>' + d.p4s);
    h('disc-p5', d.p5 + '<strong style="color:#E8C96A">' + d.p5b + '</strong>' + d.p5s);
    s('disc-footer-main', d.footer); s('disc-close-lbl', d.close);

    var navText = _discGetCustom(l) || d.nav;
    var nd = document.getElementById('nav-disclaimer-txt'); if (nd) nd.textContent = navText;
    var fp = document.getElementById('fixed-disc-pill');
    if (fp) {
      if (fp.getAttribute('data-disc-short') === '1') {
        fp.textContent = '⚖️';
        fp.title = navText;
      } else {
        fp.textContent = navText;
      }
    }

    // خطاف اختياري لصفحات تحتاج إعادة رسم عنصر آخر عند تغيّر اللغة (مثل تذييل
    // rizq_post.html) — يُستدعى فقط إن كانت الصفحة قد عرّفته بنفسها.
    if (typeof global._rzqApplyFt === 'function') { try { global._rzqApplyFt(); } catch (e) {} }
  }

  function openDisc() {
    var l = _discLang();
    _discApply(l);
    var ov = document.getElementById('discOverlay'); if (ov) ov.classList.add('open');
  }
  function closeDisc() {
    var ov = document.getElementById('discOverlay'); if (ov) ov.classList.remove('open');
  }

  // ── إصلاح جوهري: نص التنبيه القانوني المخصَّص من الأدمن كان محلياً 100% في
  // بعض الصفحات ولا يظهر لأي زائر على جهاز آخر. نطبّق النسخة المحلية المخزَّنة
  // فوراً (عبر _discApply أعلاه)، ثم نجلب آخر نسخة من الخادم إن كان متاحاً.
  function _syncDisclaimerFromBackend() {
    if (!global.RIZQ_BACKEND_BASE) return;
    fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/site-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var dn = data && data.ok && data.config && data.config.discNav;
        if (!dn) return;
        if (dn.ar) localStorage.setItem('rizq_disc_nav_ar', dn.ar);
        if (dn.fr) localStorage.setItem('rizq_disc_nav_fr', dn.fr);
        _discApply(_discLang());
      }).catch(function () {});
  }

  // ── تعريض الدوال عالمياً — الصفحات تستدعيها كـ onclick="openDisc()" أو
  // تتحقق من وجودها عبر typeof _discApply==='function' في أكواد أخرى ──
  global._discLang = _discLang;
  global._discGetCustom = _discGetCustom;
  global._discApply = _discApply;
  global.openDisc = openDisc;
  global.closeDisc = closeDisc;

  function _init() {
    _discApply(_discLang());
    _syncDisclaimerFromBackend();
    // تصحيح واحد موحَّد بدل نسخة منفصلة (بأسماء متغيرات مختلفة: _origSet،
    // _origSet2، _o، _o2) في كل ملف — يُطبَّق مرة واحدة فقط حتى لو حُمِّل هذا
    // الملف أكثر من مرة بالخطأ في نفس الصفحة.
    if (!global.__rzqDiscPatched) {
      global.__rzqDiscPatched = true;
      try {
        var _origSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
          _origSet.call(this, k, v);
          if (k === 'rizq_lang') _discApply(v === 'fr' ? 'fr' : 'ar');
        };
      } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
}(typeof window !== 'undefined' ? window : this));
