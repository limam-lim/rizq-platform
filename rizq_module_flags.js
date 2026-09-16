/**
 * rizq_module_flags.js — إخفاء أقسام ما قبل الإطلاق + «قريباً» + حماية الروابط
 */
(function (global) {
  'use strict';

  var _lastFlags = null;
  var _guardBound = false;
  var _csSelectedSection = '';

  var HREF_MODULE = {
    'rizq_store.html': 'store',
    'rizq_office.html': 'office',
    'rizq_showroom.html': 'corp',
    'rizq_corp.html': 'corp',
    'rizq_tenders.html': 'tenders',
    'rizq_ads_info.html': 'videoAds'
  };

  var CS_SECTIONS = [
    { key: 'office', icon: '📒', ar: 'المكاتب', fr: 'Bureaux' },
    { key: 'corp', icon: '🏢', ar: 'الشركات والمعارض', fr: 'Entreprises & showrooms' },
    { key: 'tenders', icon: '📋', ar: 'غرفة المناقصات', fr: 'Salle des appels d\'offres' },
    { key: 'videoAds', icon: '🎬', ar: 'فيديوهات Rizq ADS', fr: 'Vidéos Rizq ADS' }
  ];

  function defaultFlags() {
    return { individual: true, store: true, office: false, corp: false, tenders: false, videoAds: false };
  }

  function lang() {
    try {
      if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') return global.RizqI18n.getLang();
      return localStorage.getItem('rizq_lang') || 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t(ar, fr) {
    return lang() === 'fr' ? fr : ar;
  }

  function pageKey() {
    try {
      return (location.pathname || '').split('/').pop().toLowerCase().replace(/\.html$/, '');
    } catch (e) {
      return '';
    }
  }

  function moduleKeyFromHref(href) {
    if (!href || href.charAt(0) === '#') return null;
    var path = href.split('?')[0].split('#')[0];
    var file = path.split('/').pop().toLowerCase();
    if (!file) return null;
    if (HREF_MODULE[file]) return HREF_MODULE[file];
    if (!/\.html$/.test(file)) return HREF_MODULE[file + '.html'] || null;
    return null;
  }

  function sectionLabel(key) {
    var s = CS_SECTIONS.filter(function (x) { return x.key === key; })[0];
    if (s) return t(s.ar, s.fr);
    var map = {
      store: t('المحلات', 'Boutiques'),
      office: t('المكاتب', 'Bureaux'),
      corp: t('معارض الشو روم', 'Showrooms'),
      tenders: t('غرفة المناقصات', 'Appels d\'offres'),
      videoAds: t('Rizq ADS', 'Rizq ADS')
    };
    return map[key] || key;
  }

  function refreshComingSoonModalLang() {
    var desc = document.getElementById('cs-modal-desc');
    var input = document.getElementById('cs-modal-input');
    var submit = document.getElementById('cs-modal-submit');
    var cancel = document.getElementById('cs-modal-cancel');
    if (desc) {
      desc.textContent = t(
        'هذا القسم قيد الإطلاق — أدخل رقم هاتفك أو بريدك لنعلمك فور التفعيل.',
        'Cette section arrive bientôt — laissez votre contact pour être prévenu.'
      );
    }
    if (input) input.placeholder = t('+222 ... أو example@email.com', '+222 ... ou example@email.com');
    if (submit) submit.textContent = '✅ ' + t('أعلمني', 'Prévenez-moi');
    if (cancel) cancel.textContent = t('إغلاق', 'Fermer');
  }

  function ensureComingSoonModal() {
    if (document.getElementById('cs-modal-overlay')) {
      refreshComingSoonModalLang();
      return;
    }
    var modal = document.createElement('div');
    modal.id = 'cs-modal-overlay';
    modal.className = 'cs-modal-overlay';
    modal.innerHTML = '<div class="cs-modal-box">'
      + '<div class="cs-modal-title" id="cs-modal-title"></div>'
      + '<div class="cs-modal-desc" id="cs-modal-desc"></div>'
      + '<input type="text" id="cs-modal-input" class="cs-modal-input">'
      + '<button type="button" class="cs-modal-submit" id="cs-modal-submit"></button>'
      + '<button type="button" class="cs-modal-cancel" id="cs-modal-cancel"></button>'
      + '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeComingSoonModal();
    });
    document.getElementById('cs-modal-submit').addEventListener('click', submitComingSoonInterest);
    document.getElementById('cs-modal-cancel').addEventListener('click', closeComingSoonModal);
    refreshComingSoonModalLang();
  }

  function openComingSoonModal(key, label) {
    _csSelectedSection = key || '';
    ensureComingSoonModal();
    var overlay = document.getElementById('cs-modal-overlay');
    var title = document.getElementById('cs-modal-title');
    if (title) title.textContent = '🔔 ' + (label || sectionLabel(key));
    var input = document.getElementById('cs-modal-input');
    if (input) input.value = '';
    if (overlay) {
      overlay.classList.add('active');
      overlay.style.display = 'flex';
      overlay.style.pointerEvents = 'auto';
    }
  }

  function closeComingSoonModal() {
    var overlay = document.getElementById('cs-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.display = '';
      overlay.style.pointerEvents = '';
    }
  }

  function submitComingSoonInterest() {
    var input = document.getElementById('cs-modal-input');
    var contact = input ? input.value.trim() : '';
    if (!contact || contact.length < 6) {
      alert(t('الرجاء إدخال رقم هاتف أو بريد إلكتروني صالح', 'Veuillez saisir un téléphone ou e-mail valide'));
      return;
    }
    if (!global.RIZQ_BACKEND_BASE) {
      closeComingSoonModal();
      notifySoonSaved();
      return;
    }
    fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/section-interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: _csSelectedSection, contact: contact })
    }).then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        closeComingSoonModal();
        if (data && data.ok) notifySoonSaved();
      }).catch(function () {
        closeComingSoonModal();
      });
  }

  function notifySoonSaved() {
    var msg = t('✅ سجّلنا اهتمامك — سنعلمك فور التفعيل', '✅ Intérêt enregistré — nous vous préviendrons à l\'ouverture');
    if (typeof global.showToast === 'function') global.showToast(msg);
    else alert(msg);
  }

  function showComingSoonNotice(key) {
    var s = CS_SECTIONS.filter(function (x) { return x.key === key; })[0];
    var label = (s ? s.icon + ' ' : '🔜 ') + sectionLabel(key);
    var toastMsg = t('قريباً: ', 'Bientôt : ') + sectionLabel(key);
    if (typeof global.showToast === 'function') global.showToast(toastMsg, 'info');
    openComingSoonModal(key, label);
  }

  function hideComingSoonStrip(strip) {
    if (!strip) return;
    strip.innerHTML = '';
    strip.style.display = 'none';
    strip.style.background = 'none';
    strip.style.minHeight = '0';
    strip.style.padding = '0';
    strip.style.margin = '0';
    strip.setAttribute('hidden', '');
    strip.setAttribute('aria-hidden', 'true');
  }

  function renderComingSoonStrip(flags) {
    var strip = document.getElementById('coming-soon-strip');
    if (!strip) return;
    var closed = CS_SECTIONS.filter(function (s) { return flags[s.key] === false; });
    if (!closed.length) {
      hideComingSoonStrip(strip);
      return;
    }
    strip.removeAttribute('hidden');
    strip.removeAttribute('aria-hidden');
    var isFr = lang() === 'fr';
    var html = '<div class="cs-strip">'
      + '<div class="cs-strip-title">' + t('🔜 قريباً على رزق — أخبرنا بما يهمّك', '🔜 Bientôt sur Rizq — dites-nous ce qui vous intéresse') + '</div>'
      + closed.map(function (s) {
        return '<div class="cs-item"><span class="cs-item-label">' + s.icon + ' ' + t(s.ar, s.fr) + '</span>'
          + '<span class="cs-item-soon">' + t('قريباً', 'Bientôt') + '</span>'
          + '<button type="button" class="cs-item-btn" data-cs-key="' + s.key + '" data-cs-label="' + t(s.ar, s.fr).replace(/"/g, '&quot;') + '">'
          + t('أعلمني عند التفعيل', 'Prévenez-moi') + '</button></div>';
      }).join('')
      + '</div>';
    strip.innerHTML = html;
    strip.style.display = 'block';
    strip.setAttribute('dir', isFr ? 'ltr' : 'rtl');
    strip.querySelectorAll('.cs-item-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openComingSoonModal(btn.getAttribute('data-cs-key'), btn.getAttribute('data-cs-label'));
      });
    });
    ensureComingSoonModal();
  }

  function tagModuleLinks() {
    Object.keys(HREF_MODULE).forEach(function (file) {
      var key = HREF_MODULE[file];
      document.querySelectorAll('a[href="' + file + '"], a[href*="' + file + '"]').forEach(function (a) {
        if (!a.getAttribute('data-rizq-module')) a.setAttribute('data-rizq-module', key);
      });
    });
    document.querySelectorAll('.hero-biz-btn[href]').forEach(function (a) {
      var key = moduleKeyFromHref(a.getAttribute('href'));
      if (key) a.setAttribute('data-rizq-module', key);
    });
  }

  function isModuleClosed(flags, key) {
    if (global.RizqDynamicNav && typeof global.RizqDynamicNav.moduleOpen === 'function') {
      return !global.RizqDynamicNav.moduleOpen(flags, key);
    }
    if (key === 'store') return false;
    return flags[key] === false;
  }

  function applyHeroAndSectionHides(flags) {
    tagModuleLinks();
    Object.keys(HREF_MODULE).forEach(function (file) {
      var key = HREF_MODULE[file];
      if (!isModuleClosed(flags, key)) return;
      document.querySelectorAll('[data-rizq-module="' + key + '"], a[href="' + file + '"]').forEach(function (el) {
        var link = el.tagName === 'A' ? el : el.querySelector('a[href]');
        var target = el.classList && el.classList.contains('hero-biz-btn') ? el : (link || el);
        if (target.classList && target.classList.contains('hero-biz-btn')) {
          target.style.display = 'none';
        }
      });
    });
    var SECTION_MAP = { store: 'virtual-stores', office: 'virtual-offices', corp: 'virtual-showrooms', tenders: 'virtual-tenders' };
    Object.keys(SECTION_MAP).forEach(function (key) {
      if (flags[key] !== false) return;
      var sec = document.getElementById(SECTION_MAP[key]);
      if (sec) sec.style.display = 'none';
    });
    if (flags.store === false && flags.office === false && flags.corp === false) {
      document.querySelectorAll('.hero-biz-nav').forEach(function (el) { el.style.display = 'none'; });
    }
    if (flags.individual === false) {
      var tp = document.getElementById('type-private');
      if (tp) tp.style.display = 'none';
    }
    ['store', 'office', 'corp'].forEach(function (k) {
      if (flags[k] !== false) return;
      var id = k === 'store' ? 'biz-store' : k === 'office' ? 'biz-office' : 'biz-corp';
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    if (flags.store === false && flags.office === false && flags.corp === false) {
      var tc = document.getElementById('type-company');
      if (tc) tc.style.display = 'none';
    }
  }

  function guardCurrentPage(flags) {
    var pk = pageKey();
    var pageMod = HREF_MODULE[pk + '.html'] || null;
    if (!pageMod || !isModuleClosed(flags, pageMod)) return;
    setTimeout(function () { showComingSoonNotice(pageMod); }, 350);
  }

  function bindModuleGuard(flags) {
    if (_guardBound) return;
    _guardBound = true;
    document.addEventListener('click', function (e) {
      var activeFlags = _lastFlags || flags || defaultFlags();
      var a = e.target.closest('a[href], button[data-rizq-module]');
      if (!a) return;
      var key = a.getAttribute('data-rizq-module') || moduleKeyFromHref(a.getAttribute('href'));
      if (!key || !isModuleClosed(activeFlags, key)) return;
      e.preventDefault();
      e.stopPropagation();
      showComingSoonNotice(key);
    }, true);
  }

  function apply(flags) {
    flags = flags && typeof flags === 'object' ? flags : defaultFlags();
    _lastFlags = flags;
    if (global.RizqDynamicNav && typeof global.RizqDynamicNav.apply === 'function') {
      global.RizqDynamicNav.apply(flags);
    } else {
      var NAV_HREF = { store: 'rizq_store.html', office: 'rizq_office.html', corp: 'rizq_showroom.html', tenders: 'rizq_tenders.html' };
      Object.keys(NAV_HREF).forEach(function (key) {
        if (key === 'store') return;
        if (flags[key] !== false) return;
        document.querySelectorAll('a[href="' + NAV_HREF[key] + '"]').forEach(function (a) {
          var li = a.closest('li');
          if (li) li.style.display = 'none'; else a.style.display = 'none';
        });
      });
    }
    applyHeroAndSectionHides(flags);
    renderComingSoonStrip(flags);
    guardCurrentPage(flags);
    bindModuleGuard(flags);
  }

  function fetchAndApply() {
    if (!global.RIZQ_BACKEND_BASE) {
      apply(defaultFlags());
      return;
    }
    fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/site-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var flags = (data && data.ok && data.config && data.config.moduleFlags) || defaultFlags();
        apply(flags);
      })
      .catch(function () {
        apply(defaultFlags());
      });
  }

  global.openComingSoonModal = openComingSoonModal;
  global.closeComingSoonModal = closeComingSoonModal;
  global.submitComingSoonInterest = submitComingSoonInterest;
  global.renderComingSoonStrip = renderComingSoonStrip;
  global.showComingSoonNotice = showComingSoonNotice;

  global.RizqModuleFlags = {
    apply: apply,
    fetchAndApply: fetchAndApply,
    reapply: function () {
      if (_lastFlags) apply(_lastFlags);
      else fetchAndApply();
    },
    defaultFlags: defaultFlags,
    moduleKeyFromHref: moduleKeyFromHref
  };

  document.addEventListener('rizq:langchange', function () {
    if (_lastFlags) renderComingSoonStrip(_lastFlags);
    else refreshComingSoonModalLang();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndApply);
  } else {
    fetchAndApply();
  }
})(window);
