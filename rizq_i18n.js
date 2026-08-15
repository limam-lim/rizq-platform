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

  function dict() {
    if (global.RIZQ_I18N_AR && global.RIZQ_I18N_FR) {
      return { ar: global.RIZQ_I18N_AR, fr: global.RIZQ_I18N_FR };
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
  function _t(key, ns) {
    var D = dict();
    var primary = D[state.lang] || D.ar;
    var val = lookup(primary, ns, key);
    if (val == null) val = lookup(D.ar, ns, key); // عودة للعربية إن كان المفتاح ناقصاً في الفرنسية
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

  function applyLang(lang) {
    state.lang = lang === 'fr' ? 'fr' : 'ar';
    saveLang(state.lang);
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    if (document.body) {
      document.body.classList.toggle('rizq-lang-ar', state.lang === 'ar');
      document.body.classList.toggle('rizq-lang-fr', state.lang === 'fr');
    }
    document.querySelectorAll('.btn-lang').forEach(function (btn) {
      btn.textContent = state.lang === 'ar' ? 'FR' : 'AR';
      btn.setAttribute('aria-label', state.lang === 'ar' ? 'Passer au français' : 'التبديل إلى العربية');
    });
    applyStaticDom(document);
    applyDocumentTitle();
    document.dispatchEvent(new CustomEvent('rizq:langchange', { detail: { lang: state.lang } }));
  }

  function toggle() {
    applyLang(state.lang === 'ar' ? 'fr' : 'ar');
  }

  function init() {
    applyLang(state.lang);
    // تفويض النقر: أي زر بصنف btn-lang في أي صفحة يعمل تلقائياً دون onclick يدوي
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.btn-lang');
      if (btn) toggle();
    });
  }

  global.RizqI18n = {
    t: _t,
    t2: _t2,
    apply: applyLang,
    toggle: toggle,
    init: init,
    getLang: function () { return state.lang; },
    applyStaticDom: applyStaticDom
  };

  // توافق رجعي: أي onclick="toggleLangPage()" قديم متبقٍ في صفحة لم تُهاجَر بعد يستمر بالعمل
  global.toggleLangPage = toggle;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
