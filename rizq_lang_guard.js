/**
 * rizq_lang_guard.js — حارس اللغة على مستوى المنصة كلها
 * ─────────────────────────────────────────────────────────
 * الحل «خارج عنق الزجاجة»: بدل ملاحقة كل صفحة، نضع طبقة واحدة تفعل ثلاثة أشياء:
 *  1) CSS قاتل فوري: يخفي .ar-only / .fr-only / [data-lang] حسب html[lang]
 *  2) ناقل لغة موحّد: يفرض rizq_lang + html[lang|dir] + body.rizq-lang-*
 *  3) MutationObserver: أي HTML يُحقَن لاحقاً يُعاد ترجمته / إخفاء اللغة الخطأ
 *
 * يُحمَّل بعد rizq_i18n.js إن وُجد، ويعمل وحده (CSS) حتى على الصفحات بلا قاموس.
 */
(function (global) {
  'use strict';
  if (global.__rizqLangGuard) return;
  global.__rizqLangGuard = true;

  var STORAGE_KEY = 'rizq_lang';
  var OBSERVE_DEBOUNCE_MS = 60;
  var _timer = null;
  var _observer = null;
  var _scrubbing = false;

  function readLang() {
    try {
      if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') {
        var g = global.RizqI18n.getLang();
        if (g === 'fr' || g === 'ar') return g;
      }
    } catch (e0) {}
    try {
      var ls = localStorage.getItem(STORAGE_KEY);
      if (ls === 'fr' || ls === 'ar') return ls;
    } catch (e1) {}
    var hl = document.documentElement && document.documentElement.getAttribute('lang');
    return hl === 'fr' ? 'fr' : 'ar';
  }

  function writeLang(lang) {
    lang = lang === 'fr' ? 'fr' : 'ar';
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    var root = document.documentElement;
    root.setAttribute('lang', lang);
    root.lang = lang;
    root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    if (document.body) {
      document.body.classList.toggle('rizq-lang-ar', lang === 'ar');
      document.body.classList.toggle('rizq-lang-fr', lang === 'fr');
      document.body.setAttribute('data-rizq-lang', lang);
    }
    return lang;
  }

  function injectCss() {
    if (document.getElementById('rizq-lang-guard-css')) return;
    var css = [
      /* ── قفل ثنائي اللغة: لا يظهر إلا لسان html[lang] ── */
      'html[lang="fr"] .ar-only,html[lang="fr"] .lang-ar,html[lang="fr"] [data-lang="ar"],html[lang="fr"] [lang="ar"]:not(html):not([data-user-content]):not([data-bilingual-ok]){display:none!important}',
      'html[lang="ar"] .fr-only,html[lang="ar"] .lang-fr,html[lang="ar"] [data-lang="fr"],html[lang="ar"] [lang="fr"]:not(html):not([data-user-content]):not([data-bilingual-ok]){display:none!important}',
      'html[lang="ar"] .ar-only,html[lang="ar"] .lang-ar,html[lang="ar"] [data-lang="ar"]{display:revert}',
      'html[lang="fr"] .fr-only,html[lang="fr"] .lang-fr,html[lang="fr"] [data-lang="fr"]{display:revert}',
      /* أزرار اللغة: استثناء أقوى من html[lang] .lang-ar/.lang-fr حتى يظهر FR | AR دائماً */
      'html[lang="fr"] .btn-lang .lang-fr,html[lang="fr"] .btn-lang .lang-ar,html[lang="fr"] .btn-lang .lang-sep,',
      'html[lang="ar"] .btn-lang .lang-fr,html[lang="ar"] .btn-lang .lang-ar,html[lang="ar"] .btn-lang .lang-sep,',
      'html[lang="fr"] .btn-lang-primary .lang-fr,html[lang="fr"] .btn-lang-primary .lang-ar,html[lang="fr"] .btn-lang-primary .lang-sep,',
      'html[lang="ar"] .btn-lang-primary .lang-fr,html[lang="ar"] .btn-lang-primary .lang-ar,html[lang="ar"] .btn-lang-primary .lang-sep,',
      'html[lang="fr"] #lang-btn .lang-fr,html[lang="fr"] #lang-btn .lang-ar,html[lang="fr"] #lang-btn .lang-sep,',
      'html[lang="ar"] #lang-btn .lang-fr,html[lang="ar"] #lang-btn .lang-ar,html[lang="ar"] #lang-btn .lang-sep,',
      'html[lang="fr"] #rizq-lang-btn .lang-fr,html[lang="fr"] #rizq-lang-btn .lang-ar,html[lang="fr"] #rizq-lang-btn .lang-sep,',
      'html[lang="ar"] #rizq-lang-btn .lang-fr,html[lang="ar"] #rizq-lang-btn .lang-ar,html[lang="ar"] #rizq-lang-btn .lang-sep,',
      'html[lang="fr"] #nav-lang-btn .lang-fr,html[lang="fr"] #nav-lang-btn .lang-ar,html[lang="fr"] #nav-lang-btn .lang-sep,',
      'html[lang="ar"] #nav-lang-btn .lang-fr,html[lang="ar"] #nav-lang-btn .lang-ar,html[lang="ar"] #nav-lang-btn .lang-sep,',
      'html[lang="fr"] #store-lang-btn .lang-fr,html[lang="fr"] #store-lang-btn .lang-ar,html[lang="fr"] #store-lang-btn .lang-sep,',
      'html[lang="ar"] #store-lang-btn .lang-fr,html[lang="ar"] #store-lang-btn .lang-ar,html[lang="ar"] #store-lang-btn .lang-sep,',
      'html[lang="fr"] #office-lang-btn .lang-fr,html[lang="fr"] #office-lang-btn .lang-ar,html[lang="fr"] #office-lang-btn .lang-sep,',
      'html[lang="ar"] #office-lang-btn .lang-fr,html[lang="ar"] #office-lang-btn .lang-ar,html[lang="ar"] #office-lang-btn .lang-sep{display:inline!important}',
      /* عناصر وُسمت كمسرّبة حتى تُترجم */
      '[data-rizq-lang-leak="1"]{visibility:hidden!important}',
      'html.rizq-lang-guard-ready [data-rizq-lang-leak="1"]{visibility:hidden!important}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'rizq-lang-guard-css';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function hasArabic(s) {
    return /[\u0600-\u06FF]/.test(String(s || ''));
  }
  function hasLatin(s) {
    return /[A-Za-zÀ-ÿ]/.test(String(s || ''));
  }

  /** شريط واجهة فقط — لا نلمس محتوى الإعلانات/الرسائل */
  var CHROME_SEL = [
    'nav', 'header', 'footer',
    '.rizq-hdr-row2', '.rizq-hdr-more-menu', '.mobile-bottom-nav',
    '.filter-panel', '.filter-section', '.filter-title', '.filter-label',
    '.modal-overlay', '.modal-box', '.rizq-terms-box',
    '#rag-overlay', '.rag-modal', '.rag-label', '.rag-title', '.rag-sub',
    '.btn-apply', '.btn-reset', '.chip',
    '.rizq-reg-chrome', '.rizq-reg-trust-card'
  ].join(',');

  function isChrome(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest('[data-user-content],[data-ad-body],[data-chat-msg],.ad-card,.listing-card,.rc-card,.result-card')) {
      return false;
    }
    return !!(el.closest(CHROME_SEL));
  }

  /**
   * تنظيف عناوين مزدوجة شائعة: «إغلاق / Fermer» → لغة واحدة حسب html[lang].
   * لا نخفي نصوصاً عربية وحيدة (قد تكون بلا ترجمة بعد) حتى لا تفرغ الواجهة.
   */
  function quarantineChromeLeaks(root) {
    var lang = readLang();
    root = root || document;
    var nodes = root.querySelectorAll
      ? root.querySelectorAll('button, a, label, span, p, h1, h2, h3, h4, li, [title]')
      : [];
    nodes.forEach(function (el) {
      if (!isChrome(el)) return;
      if (el.closest('#rizq-lang-btn,.btn-lang,.btn-lang-primary')) return;
      if (el.classList.contains('ar-only') || el.classList.contains('fr-only')) return;

      var title = el.getAttribute('title');
      if (title && hasArabic(title) && hasLatin(title) && /\s\/\s/.test(title)) {
        var tParts = title.split(/\s\/\s/);
        if (tParts.length === 2) {
          el.setAttribute('title', lang === 'fr' ? tParts[1].trim() : tParts[0].trim());
        }
      }

      if (el.children && el.children.length > 0) return;
      var txt = (el.textContent || '').trim();
      if (!txt || txt.length > 60) return;
      if (!(hasArabic(txt) && hasLatin(txt) && /\s\/\s/.test(txt))) return;
      var parts = txt.split(/\s\/\s/);
      if (parts.length !== 2) return;
      el.textContent = lang === 'fr' ? parts[1].trim() : parts[0].trim();
    });
  }

  function retranslate(root) {
    if (_scrubbing) return;
    _scrubbing = true;
    try {
      writeLang(readLang());
      if (global.RizqI18n) {
        if (typeof global.RizqI18n.applyStaticDom === 'function') {
          global.RizqI18n.applyStaticDom(root || document);
        } else if (typeof global.RizqI18n.apply === 'function' && !(root && root !== document)) {
          /* لا نعيد apply الكامل على كل طفرة — فقط DOM ثابت */
        }
      }
      quarantineChromeLeaks(root || document);
    } finally {
      _scrubbing = false;
    }
  }

  function scheduleRetranslate(root) {
    if (_timer) clearTimeout(_timer);
    _timer = setTimeout(function () {
      _timer = null;
      retranslate(root || document);
    }, OBSERVE_DEBOUNCE_MS);
  }

  function startObserver() {
    if (_observer || !document.body) return;
    _observer = new MutationObserver(function (mutations) {
      if (_scrubbing) return;
      var needs = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
          needs = true;
          break;
        }
        if (m.type === 'attributes' && (m.attributeName === 'data-t' || m.attributeName === 'data-t-fr' || m.attributeName === 'data-fr')) {
          needs = true;
          break;
        }
      }
      if (needs) scheduleRetranslate(document);
    });
    _observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-t','data-t-fr','data-fr','data-ar','data-ph','data-ph-fr','data-lang','class']
    });
  }

  function onLangEvent() {
    writeLang(readLang());
    scheduleRetranslate(document);
  }

  function boot() {
    injectCss();
    writeLang(readLang());
    document.documentElement.classList.add('rizq-lang-guard-ready');
    retranslate(document);
    startObserver();

    document.addEventListener('rizq:langchange', onLangEvent);

    try {
      global.addEventListener('storage', function (e) {
        if (e && e.key === STORAGE_KEY) onLangEvent();
      });
    } catch (eStor) {}

    /* إن وُجد RizqI18n لاحقاً — أعد التطبيق */
    var tries = 0;
    var wait = setInterval(function () {
      tries++;
      if (global.RizqI18n && typeof global.RizqI18n.applyStaticDom === 'function') {
        retranslate(document);
        clearInterval(wait);
      } else if (tries > 40) {
        clearInterval(wait);
      }
    }, 100);
  }

  global.RizqLangGuard = {
    refresh: function (root) { retranslate(root || document); },
    getLang: readLang,
    sync: function (lang) {
      if (lang) writeLang(lang);
      else writeLang(readLang());
      scheduleRetranslate(document);
    },
    quarantine: quarantineChromeLeaks
  };

  if (document.readyState === 'loading') {
    injectCss();
    writeLang(readLang());
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
