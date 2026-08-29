/**
 * rizq_header.js — unified two-tier header for every public Rizq page.
 */
(function () {
  'use strict';
  var global = window;
  if (window.__rizqHeaderInit) return;
  window.__rizqHeaderInit = true;

  /* Always FR left / Arabic right inside the pill (ignore page dir). */
  function langBtnHtml() {
    return '<span class="lang-fr" dir="ltr">FR</span>' +
      '<span class="lang-sep" aria-hidden="true"> / </span>' +
      '<span class="lang-ar" dir="rtl">العربية</span>';
  }

  function paintLangBtn(btn) {
    if (!btn) return;
    if (window.RizqI18n && typeof window.RizqI18n.paintPrimaryLangBtn === 'function') {
      window.RizqI18n.paintPrimaryLangBtn(btn);
      return;
    }
    btn.setAttribute('dir', 'ltr');
    btn.innerHTML = langBtnHtml();
    btn.setAttribute('aria-label', 'FR / العربية');
  }

  function pathName() {
    try {
      return (location.pathname || '').split('/').pop() || '';
    } catch (e) {
      return '';
    }
  }

  /* Page key without .html — some servers serve clean URLs (rizq_browse
     instead of rizq_browse.html), so compare both forms. */
  function pageKey() {
    return pathName().toLowerCase().replace(/\.html$/, '');
  }

  function isDashShell() {
    var p = pathName().toLowerCase();
    return /chat_widget/.test(p);
  }

  function isLanding() {
    var k = pageKey();
    return !k || k === 'rizq_landing_v8' || k === 'index';
  }

  function catsHref() {
    return isLanding() ? '#categories' : 'rizq_browse.html';
  }

  function adsHref() {
    return isLanding() ? '#listings' : 'rizq_browse.html';
  }

  function packagesHref() {
    return 'rizq_landing_v8.html#pricing';
  }

  function aboutHref() {
    return 'rizq_landing_v8.html#about';
  }

  function desktopMoreMenuHtml() {
    return '' +
      '<a href="' + packagesHref() + '" class="nav-dd-item" role="menuitem"><span class="nav-dd-icon">💎</span><div><strong data-hdr="packs">' + t2('الباقات', 'Forfaits') + '</strong></div></a>' +
      '<a href="rizq_legal.html" class="nav-dd-item" role="menuitem"><span class="nav-dd-icon">⚖️</span><div><strong data-hdr="legal">' + t2('المواد القانونية', 'Mentions légales') + '</strong></div></a>' +
      '<a href="' + aboutHref() + '" class="nav-dd-item" role="menuitem"><span class="nav-dd-icon">ℹ️</span><div><strong data-hdr="about">' + t2('من نحن', 'À propos') + '</strong></div></a>';
  }

  function mobileMoreMenuHtml() {
    function item(href, hdr, ico, ar, fr) {
      var label = t2(ar, fr);
      return '<a href="' + href + '" class="nav-dd-item rizq-more-mobile-item" role="menuitem" data-hdr="' + hdr + '">' +
        '<span class="nav-dd-icon">' + ico + '</span><div><strong data-hdr="' + hdr + '">' + label + '</strong></div></a>';
    }
    return '' +
      item('rizq_store.html', 'stores', '🏪', 'المحلات', 'Boutiques') +
      item('rizq_office.html', 'offices', '💼', 'المكاتب', 'Bureaux') +
      item('rizq_showroom.html', 'showrooms', '🏬', 'المعارض', 'Showrooms') +
      item(adsHref(), 'ads', '📢', 'الإعلانات', 'Annonces') +
      item('rizq_tenders.html', 'tenders', '📋', 'غرفة المناقصات', 'Appels d\'offres') +
      item(packagesHref(), 'packs', '💎', 'الباقات', 'Forfaits') +
      item('rizq_legal.html', 'legal', '⚖️', 'المواد القانونية', 'Mentions légales') +
      item(aboutHref(), 'about', 'ℹ️', 'من نحن', 'À propos');
  }

  function positionMobileMoreMenu() {
    var wrap = document.getElementById('rizq-hdr-more-wrap');
    var menu = document.getElementById('rizq-hdr-more-menu');
    var btn = document.getElementById('rizq-hdr-more');
    if (!wrap || !menu || !btn || !wrap.classList.contains('open')) return;
    if (!isMobileNav()) {
      restoreMobileMoreMenu(wrap, menu);
      return;
    }

    var anchor = btn.getBoundingClientRect();
    var vw = window.innerWidth;
    var margin = 8;
    var menuW = Math.min(340, vw - margin * 2);
    var gap = 4;
    var top = anchor.bottom + gap;
    var left;

    if (anchor.left + anchor.width / 2 < vw / 2) {
      left = anchor.left;
    } else {
      left = anchor.right - menuW;
    }
    left = Math.max(margin, Math.min(left, vw - menuW - margin));

    menu.classList.add('is-positioned');
    menu.style.cssText = ''
      + 'position:fixed!important;'
      + 'display:flex!important;flex-direction:column!important;'
      + 'visibility:visible!important;'
      + 'box-sizing:border-box!important;'
      + 'top:' + top + 'px!important;'
      + 'left:' + left + 'px!important;'
      + 'right:auto!important;'
      + 'bottom:auto!important;'
      + 'width:' + menuW + 'px!important;'
      + 'min-width:' + menuW + 'px!important;'
      + 'max-width:' + menuW + 'px!important;'
      + 'max-height:min(58vh,420px)!important;'
      + 'overflow:visible!important;'
      + 'overflow-y:auto!important;'
      + '-webkit-overflow-scrolling:touch!important;'
      + 'transform:none!important;'
      + 'z-index:10049!important;'
      + 'direction:inherit!important;';
  }

  function restoreMobileMoreMenu(wrap, menu) {
    if (!menu) return;
    menu.classList.remove('is-positioned', 'is-portaled');
    menu.style.cssText = '';
    if (menu.parentNode === document.body && menu.__rizqMoreHome) {
      menu.__rizqMoreHome.appendChild(menu);
    }
  }

  function closeMobileMoreMenu() {
    var wrap = document.getElementById('rizq-hdr-more-wrap');
    var menu = document.getElementById('rizq-hdr-more-menu');
    var btn = document.getElementById('rizq-hdr-more');
    if (wrap) wrap.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (menu) restoreMobileMoreMenu(wrap, menu);
  }

  function scheduleNavRefresh() {
    function run() {
      if (window.RizqModuleFlags && typeof window.RizqModuleFlags.reapply === 'function') {
        window.RizqModuleFlags.reapply();
        return;
      }
      if (window.RizqDynamicNav && typeof window.RizqDynamicNav.apply === 'function') {
        window.RizqDynamicNav.apply(null);
        return;
      }
      setTimeout(run, 80);
    }
    run();
  }

  function currentLang() {
    try {
      if (window.RizqI18n && typeof window.RizqI18n.getLang === 'function') {
        return window.RizqI18n.getLang();
      }
      return localStorage.getItem('rizq_lang') || 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t2(ar, fr) {
    return currentLang() === 'fr' ? fr : ar;
  }

  function headerHtml() {
    return '' +
      '<header id="rizq-app-header" role="banner">' +
        '<div class="rizq-hdr-row1">' +
          '<div class="rizq-hdr-start">' +
            '<button type="button" class="rizq-hdr-back" id="rizq-hdr-back" aria-label="' + t2('رجوع', 'Retour') + '" title="' + t2('رجوع', 'Retour') + '">←</button>' +
            '<button type="button" class="rizq-hdr-account" id="rizq-hdr-account" aria-label="حسابي" title="حسابي">👤</button>' +
            '<button type="button" class="btn-lang btn-lang-primary" id="rizq-lang-btn" dir="ltr" aria-label="FR / العربية">' + langBtnHtml() + '</button>' +
          '</div>' +
          '<a class="rizq-hdr-brand logo" href="rizq_landing_v8.html" aria-label="رزق">' +
            '<img class="rizq-hdr-brand-mark logo-mark-img" src="rizq-mark-512.png?v=10.3" width="42" height="42" alt=""/>' +
            '<div class="logo-text"><span class="logo-ar rizq-hdr-brand-ar">رزق</span><span class="logo-sub rizq-hdr-brand-sub">RIZQ PLATFORM</span></div>' +
          '</a>' +
        '</div>' +
        '<nav class="rizq-hdr-row2" aria-label="التنقل الرئيسي">' +
          '<a class="rizq-hdr-item" id="rizq-hdr-home" href="rizq_landing_v8.html" data-nav-order="1">' +
            '<span class="rizq-hdr-ico">🏠</span><span class="rizq-hdr-lbl" data-hdr="home">الرئيسية</span>' +
          '</a>' +
          '<a class="rizq-hdr-item" id="rizq-hdr-cats" href="' + catsHref() + '" data-nav-order="2">' +
            '<span class="rizq-hdr-ico">📂</span><span class="rizq-hdr-lbl" data-hdr="cats">الأقسام</span>' +
          '</a>' +
          '<a class="rizq-hdr-post" id="rizq-hdr-post" href="rizq_post.html" aria-label="نشر" title="نشر" data-nav-order="3">' +
            '<span class="rizq-hdr-post-plus">+</span>' +
            '<span class="rizq-hdr-lbl rizq-hdr-post-lbl" data-hdr="post">نشر (+)</span>' +
          '</a>' +
          '<a class="rizq-hdr-item rizq-nav-module" href="rizq_store.html" data-rizq-module="store" data-nav-order="4">' +
            '<span class="rizq-hdr-ico">🏪</span><span class="rizq-hdr-lbl" data-hdr="stores">المحلات</span>' +
          '</a>' +
          '<button type="button" class="rizq-hdr-item" id="rizq-hdr-assistant" data-nav-order="8">' +
            '<span class="rizq-hdr-ico">✨</span><span class="rizq-hdr-lbl" data-hdr="ai">رزق ذكي</span>' +
          '</button>' +
          '<div class="rizq-hdr-more-wrap" id="rizq-hdr-more-wrap" data-nav-order="9">' +
            '<button type="button" class="rizq-hdr-item" id="rizq-hdr-more" aria-haspopup="true" aria-expanded="false">' +
              '<span class="rizq-hdr-ico">⋯</span><span class="rizq-hdr-lbl" data-hdr="more">المزيد</span>' +
            '</button>' +
            '<div class="rizq-hdr-more-menu" id="rizq-hdr-more-menu" role="menu" data-rizq-more-variant="mobile">' + mobileMoreMenuHtml() + '</div>' +
          '</div>' +
        '</nav>' +
      '</header>';
  }

  var HDR_I18N_KEYS = {
    home: ['hdr-home', 'nav-home'],
    cats: ['hdr-cats', 'nav-cats'],
    post: ['hdr-post', 'nav-post'],
    ai: ['hdr-ai', 'nav-assistant'],
    more: ['hdr-more', 'nav-more'],
    stores: ['hdr-stores', 'dd-stores', 'nav-stores'],
    offices: ['hdr-offices', 'dd-offices', 'nav-offices'],
    showrooms: ['hdr-showrooms', 'dd-showrooms', 'nav-showrooms'],
    rizqads: ['dd-rizqads'],
    ads: ['hdr-ads', 'dd-ads'],
    tenders: ['hdr-tenders', 'dd-tenders'],
    packs: ['hdr-packs', 'dd-packs'],
    legal: ['hdr-legal', 'dd-legal'],
    about: ['hdr-about', 'dd-about'],
    account: ['hdr-account', 'nav-account']
  };

  function rizqT(keys) {
    if (!window.RizqI18n || typeof window.RizqI18n.t !== 'function') return '';
    for (var i = 0; i < keys.length; i++) {
      var v = window.RizqI18n.t(keys[i]);
      if (v) return v;
    }
    return '';
  }

  function hdrText(key, el) {
    if (key === 'rizqads') {
      var adsLabel = rizqT(HDR_I18N_KEYS.rizqads) || 'Rizq ADS';
      return adsLabel.indexOf('📹') >= 0 ? adsLabel : '📹 ' + adsLabel;
    }
    if (key === 'ai') {
      if (el && el.closest('#rizq-desk-nav')) {
        return rizqT(['nav-assistant']) || t2('✨ رزق ذكي', '✨ Rizq IA');
      }
      return rizqT(['hdr-ai', 'nav-assistant']) || t2('✨ رزق ذكي', '✨ Rizq IA');
    }
    if (key === 'more' && el && (el.id === 'rizq-desk-more' || el.closest('#rizq-desk-more-li'))) {
      return rizqT(['hdr-more-dd', 'nav-more']) || t2('المزيد ▾', 'Plus ▾');
    }
    var keys = HDR_I18N_KEYS[key] || ['hdr-' + key];
    var fromI18n = rizqT(keys);
    if (fromI18n) return fromI18n;
    var fallback = {
      home: t2('الرئيسية', 'Accueil'),
      cats: t2('الأقسام', 'Catégories'),
      post: t2('نشر (+)', 'Publier (+)'),
      ai: t2('✨ رزق ذكي', '✨ Rizq IA'),
      more: t2('المزيد', 'Plus'),
      stores: t2('المحلات', 'Boutiques'),
      offices: t2('المكاتب', 'Bureaux'),
      showrooms: t2('المعارض', 'Showrooms'),
      ads: t2('الإعلانات', 'Annonces'),
      tenders: t2('غرفة المناقصات', 'Appels d\'offres'),
      packs: t2('الباقات', 'Forfaits'),
      legal: t2('المواد القانونية', 'Mentions légales'),
      about: t2('من نحن', 'À propos'),
      account: t2('حسابي', 'Compte')
    };
    return fallback[key] || '';
  }

  function ensureLangListener() {
    if (window.__rizqHeaderLangBound) return;
    window.__rizqHeaderLangBound = true;
    document.addEventListener('rizq:langchange', applyLabels);
  }

  function applyLabels() {
    document.querySelectorAll(
      '#rizq-app-header [data-hdr], #rizq-desk-nav [data-hdr], #nav [data-hdr]'
    ).forEach(function (el) {
      var k = el.getAttribute('data-hdr');
      var text = hdrText(k, el);
      if (text) el.textContent = text;
    });
    if (window.RizqI18n && typeof window.RizqI18n.applyStaticDom === 'function') {
      var nav = document.getElementById('nav');
      if (nav) window.RizqI18n.applyStaticDom(nav);
    }
    var acc = document.getElementById('rizq-hdr-account');
    if (acc) {
      acc.setAttribute('aria-label', t2('حسابي', 'Compte'));
      acc.setAttribute('title', t2('حسابي', 'Compte'));
    }
    paintLangBtn(document.getElementById('rizq-lang-btn'));
    paintLangBtn(document.getElementById('rizq-desk-lang-btn'));
    paintLangBtn(document.getElementById('nav-lang-btn'));
    var pill = document.getElementById('fixed-disc-pill');
    if (pill) {
      pill.textContent = t2('⚖️ رزق وسيط إلكتروني — عاين قبل الدفع', '⚖️ Rizq — inspectez avant paiement');
    }
    var row2 = document.querySelector('#rizq-app-header .rizq-hdr-row2');
    if (row2) row2.style.direction = currentLang() === 'fr' ? 'ltr' : 'rtl';
    applyNavMenuOrder();
  }

  /* Map current URL → nav section key (data-hdr). */
  var PAGE_TO_NAV = {
    '': 'home',
    index: 'home',
    rizq_landing_v8: 'home',
    rizq_browse: 'cats',
    rizq_search: 'cats',
    rizq_post: 'post',
    rizq_store: 'stores',
    rizq_products: 'stores',
    rizq_cart: 'stores',
    rizq_office: 'offices',
    rizq_showroom: 'showrooms',
    rizq_showroom_directory: 'showrooms',
    rizq_corp: 'showrooms',
    rizq_tenders: 'tenders',
    rizq_legal: 'legal',
    rizq_ads_info: 'ads'
  };

  var HASH_TO_NAV = {
    categories: 'cats',
    category: 'cats',
    listings: 'ads',
    pricing: 'packs',
    packages: 'packs',
    about: 'about'
  };

  /* Keys under «Plus» on phone (modules + packs/legal/about) — also light More trigger. */
  var MORE_SECTION_KEYS = {
    packs: 1, legal: 1, about: 1, ads: 1,
    offices: 1, showrooms: 1, tenders: 1, stores: 1, rizqads: 1
  };

  var DATA_T_TO_NAV = {
    'nav-home': 'home',
    'nav-cats': 'cats',
    'nav-post': 'post',
    'nav-stores': 'stores',
    'nav-offices': 'offices',
    'nav-showrooms': 'showrooms',
    'nav-tenders': 'tenders',
    'nav-assistant': 'ai',
    'nav-more': 'more',
    'dd-stores': 'stores',
    'dd-offices': 'offices',
    'dd-showrooms': 'showrooms',
    'dd-tenders': 'tenders',
    'dd-ads': 'ads',
    'dd-packs': 'packs',
    'dd-legal': 'legal',
    'dd-about': 'about',
    'dd-rizqads': 'rizqads'
  };

  function hashKey() {
    try {
      return (location.hash || '').replace(/^#/, '').split(/[/?&]/)[0].toLowerCase();
    } catch (e) {
      return '';
    }
  }

  function resolveActiveNavKey() {
    var k = pageKey();
    var h = hashKey();
    if (isLanding()) {
      if (h && HASH_TO_NAV[h]) return HASH_TO_NAV[h];
      return 'home';
    }
    if (PAGE_TO_NAV[k]) return PAGE_TO_NAV[k];
    if (h && HASH_TO_NAV[h]) return HASH_TO_NAV[h];
    return '';
  }

  function navItemKey(el) {
    if (!el || el.nodeType !== 1) return '';
    var hdr = el.getAttribute('data-hdr');
    if (hdr) return hdr;
    var t = el.getAttribute('data-t');
    if (t && DATA_T_TO_NAV[t]) return DATA_T_TO_NAV[t];
    var mod = el.getAttribute('data-rizq-module');
    if (mod === 'store') return 'stores';
    if (mod === 'office') return 'offices';
    if (mod === 'corp') return 'showrooms';
    if (mod === 'tenders') return 'tenders';
    var child = el.querySelector('[data-hdr], [data-t]');
    if (child) {
      hdr = child.getAttribute('data-hdr');
      if (hdr) return hdr;
      t = child.getAttribute('data-t');
      if (t && DATA_T_TO_NAV[t]) return DATA_T_TO_NAV[t];
    }
    if (el.id === 'rizq-hdr-home' || el.id === 'rizq-desk-brand') return 'home';
    if (el.id === 'rizq-hdr-cats') return 'cats';
    if (el.id === 'rizq-hdr-post') return 'post';
    if (el.id === 'rizq-hdr-more' || el.id === 'rizq-desk-more' || el.id === 'nav-more-mobile-btn') return 'more';
    return '';
  }

  function markActive() {
    var active = resolveActiveNavKey();
    document.querySelectorAll(
      '#rizq-app-header .is-active, #rizq-desk-nav .is-active, #nav .is-active,' +
      '.nav-dropdown-menu .is-active, .rizq-hdr-more-menu .is-active, #mobile-drawer-list .is-active'
    ).forEach(function (el) {
      el.classList.remove('is-active');
      el.removeAttribute('aria-current');
    });

    if (!active) return;

    var highlightMorePhone = !!(MORE_SECTION_KEYS[active] && isMobileNav());
    var highlightMoreDesk = active === 'packs' || active === 'legal' || active === 'about' || active === 'ads';

    var selectors = [
      '#rizq-app-header .rizq-hdr-item',
      '#rizq-app-header .rizq-hdr-post',
      '#rizq-app-header .rizq-hdr-more-menu a',
      '#rizq-desk-nav .nav-center a',
      '#rizq-desk-nav .nav-center .nav-link-btn',
      '#rizq-desk-nav .nav-dropdown-menu a',
      '#nav .nav-center a',
      '#nav .nav-center .nav-link-btn',
      '#nav .nav-dropdown-menu a',
      '.nav-dropdown-menu.rizq-more-menu-open a',
      '#mobile-drawer-list a'
    ];

    document.querySelectorAll(selectors.join(',')).forEach(function (el) {
      var key = navItemKey(el);
      if (!key) return;
      var match = key === active;
      if (!match && key === 'more' && (highlightMorePhone || highlightMoreDesk)) match = true;
      if (!match) return;
      el.classList.add('is-active');
      if (el.tagName === 'A' || el.tagName === 'BUTTON') {
        el.setAttribute('aria-current', key === active ? 'page' : 'true');
      }
    });

    document.querySelectorAll(
      '#rizq-app-header [data-rizq-module], #rizq-desk-nav [data-rizq-module], #nav [data-rizq-module]'
    ).forEach(function (modEl) {
      var key = navItemKey(modEl);
      if (key !== active) return;
      var target = modEl.matches('a, button') ? modEl : modEl.querySelector('a, button') || modEl;
      target.classList.add('is-active');
      if (target.tagName === 'A' || target.tagName === 'BUTTON') {
        target.setAttribute('aria-current', 'page');
      }
    });
  }

  function openAccount() {
    if (typeof window.openModal === 'function') {
      window.openModal('login');
      return;
    }
    location.href = 'rizq_dashboard.html';
  }

  function openAssistant() {
    if (typeof window.openRizqWidget === 'function') {
      window.openRizqWidget();
      return;
    }
    var toggle = document.getElementById('rizq-chat-toggle');
    if (toggle) {
      toggle.click();
      return;
    }
    var tries = 0;
    var iv = setInterval(function () {
      tries += 1;
      var t = document.getElementById('rizq-chat-toggle');
      if (t) { t.click(); clearInterval(iv); }
      if (tries > 20) clearInterval(iv);
    }, 150);
  }

  function toggleLang() {
    if (typeof window.applyLandingLang === 'function') {
      window.applyLandingLang(!window.isAr);
    } else if (window.RizqI18n && typeof window.RizqI18n.toggle === 'function') {
      window.RizqI18n.toggle();
    } else if (typeof window.toggleLang === 'function') {
      window.toggleLang();
    } else {
      var next = currentLang() === 'ar' ? 'fr' : 'ar';
      try { localStorage.setItem('rizq_lang', next); } catch (e) {}
      try {
        document.dispatchEvent(new CustomEvent('rizq:langchange', { bubbles: true, detail: { lang: next } }));
      } catch (eEv) {}
    }
    var lang = currentLang();
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    if (window.RizqI18n && typeof window.RizqI18n.stripLeakedDirs === 'function') {
      try { window.RizqI18n.stripLeakedDirs(); } catch (eS) {}
    }
    applyLabels();
  }

  function goBackMobile() {
    try {
      if (window.history.length > 1 && document.referrer) {
        window.history.back();
        return;
      }
    } catch (eB) {}
    location.href = 'rizq_landing_v8.html';
  }

  function updateMobileBackButton() {
    var back = document.getElementById('rizq-hdr-back');
    if (!back) return;
    back.style.display = isMobileNav() ? 'inline-flex' : 'none';
  }

  function bind() {
    var back = document.getElementById('rizq-hdr-back');
    if (back && !back.getAttribute('data-rizq-bound')) {
      back.setAttribute('data-rizq-bound', '1');
      back.addEventListener('click', function (e) {
        e.preventDefault();
        goBackMobile();
      });
    }
    updateMobileBackButton();
    var lang = document.getElementById('rizq-lang-btn');
    if (lang && !lang.getAttribute('data-rizq-bound')) {
      lang.setAttribute('data-rizq-bound', '1');
      lang.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggleLang();
      }, true);
    }
    var acc = document.getElementById('rizq-hdr-account');
    if (acc && !acc.getAttribute('data-rizq-bound')) {
      acc.setAttribute('data-rizq-bound', '1');
      acc.addEventListener('click', openAccount);
    }
    var ai = document.getElementById('rizq-hdr-assistant');
    if (ai && !ai.getAttribute('data-rizq-bound')) {
      ai.setAttribute('data-rizq-bound', '1');
      ai.addEventListener('click', openAssistant);
    }
    var moreBtn = document.getElementById('rizq-hdr-more');
    var wrap = document.getElementById('rizq-hdr-more-wrap');
    var menu = document.getElementById('rizq-hdr-more-menu');
    if (moreBtn && wrap && !moreBtn.getAttribute('data-rizq-bound')) {
      moreBtn.setAttribute('data-rizq-bound', '1');
      moreBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var willOpen = !wrap.classList.contains('open');
        closeMobileMoreMenu();
        if (willOpen) {
          if (menu) menu.style.visibility = 'hidden';
          wrap.classList.add('open');
          moreBtn.setAttribute('aria-expanded', 'true');
          positionMobileMoreMenu();
          requestAnimationFrame(positionMobileMoreMenu);
        }
      });
      if (menu) {
        menu.addEventListener('click', function (e) {
          e.stopPropagation();
          if (e.target.closest('a[href]')) closeMobileMoreMenu();
        });
      }
      if (!global.__rizqMoreMenuPosBound) {
        global.__rizqMoreMenuPosBound = true;
        global.addEventListener('resize', positionMobileMoreMenu);
        global.addEventListener('scroll', positionMobileMoreMenu, { passive: true });
      }
      document.addEventListener('click', function (e) {
        if (e.target.closest('#rizq-hdr-more-wrap') || e.target.closest('#rizq-hdr-more-menu')) return;
        closeMobileMoreMenu();
      });
    }
    ensureLangListener();
    applyLabels();
    markActive();
    updateMobileBackButton();
  }

  function ensureActiveNavListeners() {
    if (window.__rizqNavActiveBound) return;
    window.__rizqNavActiveBound = true;
    window.addEventListener('hashchange', markActive);
    document.addEventListener('rizq:langchange', function () {
      setTimeout(markActive, 0);
    });
  }

  function unifyDashLangPills() {
    document.documentElement.classList.add('rizq-dash-nav');
    document.querySelectorAll('.btn-lang, .btn-lang-store, .rizq-lang-btn').forEach(function (btn) {
      btn.classList.add('btn-lang-primary');
      paintLangBtn(btn);
    });
  }

  function isMobileNav() {
    if (global.RizqViewport && typeof global.RizqViewport.isPhone === 'function') {
      return global.RizqViewport.isPhone();
    }
    try {
      return window.matchMedia('(max-width: 768px)').matches
        || window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
    } catch (e) {
      return false;
    }
  }

  function removeHeader() {
    var hdr = document.getElementById('rizq-app-header');
    if (hdr && hdr.parentNode) hdr.parentNode.removeChild(hdr);
  }

  function deskNavHtml() {
    return '' +
      '<nav id="rizq-desk-nav" aria-label="التنقل الرئيسي">' +
        '<div class="nav-start">' +
          '<button type="button" class="nav-account-btn" id="rizq-desk-account" aria-label="حسابي">' +
            '<span class="nav-account-ico" aria-hidden="true">👤</span>' +
            '<span data-hdr="account">' + t2('حسابي', 'Compte') + '</span>' +
          '</button>' +
          '<button type="button" class="btn-lang btn-lang-primary" id="rizq-desk-lang-btn" dir="ltr" aria-label="FR / العربية">' + langBtnHtml() + '</button>' +
        '</div>' +
        '<ul class="nav-center">' +
          '<li data-nav-order="1"><a href="rizq_landing_v8.html" data-hdr="home">' + t2('الرئيسية', 'Accueil') + '</a></li>' +
          '<li data-nav-order="2"><a href="' + catsHref() + '" data-hdr="cats">' + t2('الأقسام', 'Catégories') + '</a></li>' +
          '<li data-nav-order="3"><a href="rizq_post.html" class="nav-post-plus" data-hdr="post">' + t2('نشر (+)', 'Publier (+)') + '</a></li>' +
          '<li class="rizq-nav-module" data-rizq-module="store" data-nav-order="4"><a href="rizq_store.html" data-hdr="stores">' + t2('المحلات', 'Boutiques') + '</a></li>' +
          '<li data-nav-order="8"><button type="button" class="nav-link-btn" id="rizq-desk-assistant" data-hdr="ai">' + t2('✨ رزق ذكي', '✨ Rizq IA') + '</button></li>' +
          '<li class="nav-dropdown-li" id="rizq-desk-more-li" data-nav-order="9">' +
            '<a href="#" class="nav-dropdown-trigger" id="rizq-desk-more" data-hdr="more">' + t2('المزيد ▾', 'Plus ▾') + '</a>' +
            '<div class="nav-dropdown-menu nav-more-menu" role="menu" data-rizq-more-variant="desktop">' + desktopMoreMenuHtml() + '</div>' +
          '</li>' +
        '</ul>' +
        '<a href="rizq_landing_v8.html" class="logo" id="rizq-desk-brand" aria-label="رزق">' +
          '<img class="logo-mark-img" src="rizq-mark-512.png?v=10.3" width="42" height="42" alt=""/>' +
          '<div class="logo-text"><span class="logo-ar">رزق</span><span class="logo-sub">RIZQ PLATFORM</span></div>' +
        '</a>' +
      '</nav>';
  }

  function moreMenuFor(li) {
    if (!li) return null;
    var key = li.id || 'landing-more';
    return li.querySelector('.nav-dropdown-menu') ||
      document.querySelector('.nav-dropdown-menu[data-rizq-more-for="' + key + '"]');
  }

  function closeMoreDropdowns() {
    if (isLanding() && isMobileNav() && typeof window.closeNavDropdowns === 'function') {
      window.closeNavDropdowns();
      return;
    }
    document.querySelectorAll('.nav-dropdown-li.open').forEach(function (o) {
      o.classList.remove('open');
      restoreMoreMenu(o);
    });
    document.querySelectorAll('.nav-dropdown-menu.rizq-more-menu-open').forEach(function (m) {
      m.classList.remove('rizq-more-menu-open', 'rizq-phone-more-panel', 'is-positioned');
      m.style.display = '';
      m.style.visibility = '';
      m.style.opacity = '';
      m.style.pointerEvents = '';
    });
  }

  function restoreMoreMenu(li) {
    if (!li) return null;
    var menu = moreMenuFor(li);
    if (!menu) return null;
    if (menu.parentNode !== li) li.appendChild(menu);
    menu.classList.remove('rizq-more-menu-open', 'rizq-phone-more-panel', 'is-positioned');
    menu.style.position = '';
    menu.style.left = '';
    menu.style.top = '';
    menu.style.right = '';
    menu.style.bottom = '';
    menu.style.inset = '';
    menu.style.display = '';
    menu.style.visibility = '';
    menu.style.opacity = '';
    menu.style.transform = '';
    menu.style.pointerEvents = '';
    menu.style.maxHeight = '';
    menu.style.width = '';
    menu.style.zIndex = '';
    return menu;
  }

  /* Landing inline script defines positionNavDropdown before this file loads via PWA. */
  var landingPositionNavDropdown = typeof window.positionNavDropdown === 'function'
    ? window.positionNavDropdown
    : null;

  function positionLandingMobileMore(li) {
    if (!li) return;
    if (window.RizqModuleFlags && typeof window.RizqModuleFlags.reapply === 'function') {
      window.RizqModuleFlags.reapply();
    }
    if (landingPositionNavDropdown) {
      landingPositionNavDropdown(li);
      return;
    }
    var menu = moreMenuFor(li);
    if (!menu) return;
    restoreMoreMenu(li);
    li.classList.add('open');
    var nav = document.getElementById('nav');
    var top = 116;
    if (nav) top = Math.round(nav.getBoundingClientRect().bottom + 4);
    if (menu.parentNode !== document.body) {
      menu.__rizqMoreHome = li;
      menu.setAttribute('data-rizq-more-for', li.id || 'nav-more-li');
      document.body.appendChild(menu);
    }
    menu.classList.add('rizq-more-menu-open', 'rizq-phone-more-panel');
    menu.style.cssText = ''
      + 'position:fixed!important;top:' + top + 'px!important;'
      + 'left:10px!important;right:10px!important;bottom:auto!important;'
      + 'transform:none!important;width:auto!important;'
      + 'max-height:min(calc(100vh - ' + (top + 12) + 'px),520px)!important;'
      + 'overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;'
      + 'opacity:1!important;visibility:visible!important;pointer-events:auto!important;'
      + 'z-index:10052!important;display:block!important;';
  }

  function positionMoreDropdown(li) {
    if (!li) return;
    if (isLanding() && isMobileNav() && li.id === 'nav-more-li') {
      positionLandingMobileMore(li);
      return;
    }
    restoreMoreMenu(li);
    li.classList.add('open');
  }

  function bindLandingMobileMore() {
    /* Click handled by rizq_landing_ux.js → toggleNavDropdown (single path, no double-toggle). */
  }

  window.positionNavDropdown = positionMoreDropdown;
  window.rizqCloseMoreMenus = closeMoreDropdowns;

  function bindDeskNav() {
    var lang = document.getElementById('rizq-desk-lang-btn');
    if (lang && !lang.getAttribute('data-rizq-bound')) {
      lang.setAttribute('data-rizq-bound', '1');
      lang.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggleLang();
        paintLangBtn(lang);
      }, true);
    }
    var acc = document.getElementById('rizq-desk-account');
    if (acc && !acc.getAttribute('data-rizq-bound')) {
      acc.setAttribute('data-rizq-bound', '1');
      acc.addEventListener('click', openAccount);
    }
    var ai = document.getElementById('rizq-desk-assistant');
    if (ai && !ai.getAttribute('data-rizq-bound')) {
      ai.setAttribute('data-rizq-bound', '1');
      ai.addEventListener('click', openAssistant);
    }
    var more = document.getElementById('rizq-desk-more');
    var li = document.getElementById('rizq-desk-more-li');
    if (more && li && !more.getAttribute('data-rizq-bound')) {
      more.setAttribute('data-rizq-bound', '1');
      restoreMoreMenu(li);
      var closeT = null;
      function isDesk() {
        try { return window.matchMedia('(min-width:769px) and (min-height:501px)').matches; } catch (eH) { return true; }
      }
      function keepOpen() {
        clearTimeout(closeT);
        positionMoreDropdown(li);
      }
      function scheduleClose() {
        clearTimeout(closeT);
        closeT = setTimeout(closeMoreDropdowns, 120);
      }
      more.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var willOpen = !li.classList.contains('open');
        closeMoreDropdowns();
        if (willOpen) positionMoreDropdown(li);
      });
      li.addEventListener('mouseenter', function () {
        if (!isDesk()) return;
        keepOpen();
      });
      li.addEventListener('mouseleave', function () {
        if (!isDesk()) return;
        scheduleClose();
      });
      document.addEventListener('click', function (e) {
        if (e.target.closest('.nav-dropdown-li') || e.target.closest('.nav-dropdown-menu')) return;
        closeMoreDropdowns();
      });
    }
  }

  function ensureMediatorPill() {
    initDiscSidebar();
  }

  function isDiscSidebarHidden() {
    try { return localStorage.getItem('rizq_sidebar_hidden') === 'true'; } catch (e) { return false; }
  }

  function hideDiscSidebarPermanent() {
    try { localStorage.setItem('rizq_sidebar_hidden', 'true'); } catch (e) {}
    document.body.classList.add('rizq-disc-sidebar-dismissed');
    var sidebar = document.getElementById('rizq-disc-sidebar');
    var edge = document.getElementById('rizq-disc-edge');
    if (sidebar) {
      sidebar.classList.remove('rizq-disc-visible');
      sidebar.style.display = 'none';
    }
    if (edge) edge.style.display = 'none';
  }

  function showDiscSidebar() {
    var sidebar = document.getElementById('rizq-disc-sidebar');
    if (!sidebar || isDiscSidebarHidden()) return;
    sidebar.classList.add('rizq-disc-visible');
  }

  function hideDiscSidebar() {
    var sidebar = document.getElementById('rizq-disc-sidebar');
    if (!sidebar) return;
    sidebar.classList.remove('rizq-disc-visible');
  }

  function initDiscSidebar() {
    if (isDiscSidebarHidden()) {
      document.body.classList.add('rizq-disc-sidebar-dismissed');
      return;
    }

    var isMobile = false;
    try { isMobile = window.matchMedia('(max-width: 768px)').matches; } catch (e) {}
    if (isMobile) return;

    var edge = document.getElementById('rizq-disc-edge');
    if (!edge) {
      edge = document.createElement('div');
      edge.id = 'rizq-disc-edge';
      edge.setAttribute('aria-hidden', 'true');
      document.body.appendChild(edge);
    }

    var sidebar = document.getElementById('rizq-disc-sidebar');
    if (!sidebar) {
      sidebar = document.createElement('div');
      sidebar.id = 'rizq-disc-sidebar';
      sidebar.className = 'rizq-disc-sidebar';
      sidebar.setAttribute('role', 'complementary');
      sidebar.setAttribute('aria-label', t2('إشعار قانوني', 'Avis juridique'));

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'rizq-disc-close';
      closeBtn.setAttribute('aria-label', t2('إغلاق', 'Fermer'));
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        hideDiscSidebarPermanent();
      });
      sidebar.appendChild(closeBtn);
      document.body.appendChild(sidebar);
    }

    var pill = document.getElementById('fixed-disc-pill');
    if (!pill) {
      pill = document.createElement('button');
      pill.type = 'button';
      pill.id = 'fixed-disc-pill';
      pill.className = 'fixed-disc-pill';
      pill.textContent = t2('⚖️ رزق وسيط إلكتروني — عاين قبل الدفع', '⚖️ Rizq — inspectez avant paiement');
      sidebar.appendChild(pill);
    } else if (pill.parentNode !== sidebar) {
      sidebar.appendChild(pill);
    }

    pill.style.cursor = 'pointer';
    pill.style.pointerEvents = 'auto';
    if (!pill.getAttribute('data-rizq-bound')) {
      pill.setAttribute('data-rizq-bound', '1');
      pill.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.openDisc === 'function') window.openDisc();
      });
    }

    var hideTimer = null;
    function scheduleHide() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(hideDiscSidebar, 420);
    }
    function cancelHide() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }

    if (!edge.getAttribute('data-rizq-bound')) {
      edge.setAttribute('data-rizq-bound', '1');
      edge.addEventListener('mouseenter', function () {
        cancelHide();
        showDiscSidebar();
      });
      edge.addEventListener('mousemove', function () {
        cancelHide();
        showDiscSidebar();
      });
    }

    if (!sidebar.getAttribute('data-rizq-bound')) {
      sidebar.setAttribute('data-rizq-bound', '1');
      sidebar.addEventListener('mouseenter', cancelHide);
      sidebar.addEventListener('mouseleave', scheduleHide);
    }
  }

  function applyNavMenuOrder() {
    var dir = currentLang() === 'fr' ? 'ltr' : 'rtl';
    var row2 = document.querySelector('#rizq-app-header .rizq-hdr-row2');
    if (row2) row2.style.direction = dir;
    var deskCenter = document.querySelector('#rizq-desk-nav .nav-center');
    if (deskCenter) deskCenter.style.direction = dir;
    var landingCenter = document.querySelector('#nav .nav-center');
    if (landingCenter) landingCenter.style.direction = dir;
    document.querySelectorAll(
      '#nav .nav-center > li, #rizq-desk-nav .nav-center > li, #rizq-app-header .rizq-hdr-row2 > *'
    ).forEach(function (el) {
      var o = el.getAttribute('data-nav-order');
      if (o) el.style.order = o;
    });
    document.querySelectorAll('#nav .nav-center > li, #rizq-desk-nav .nav-center > li').forEach(function (li, i) {
      if (!li.getAttribute('data-nav-order')) li.setAttribute('data-nav-order', String(i + 1));
    });
  }

  /** R sidebar (.fixed-rizq-logo) — right edge hover reveal only; not the AI assistant */
  function initRLogoSidebar() {
    if (window.__rizqRLogoInit) return;

    var logos = document.querySelectorAll('.fixed-rizq-logo');
    if (!logos.length) return;

    var isMobile = false;
    try { isMobile = window.matchMedia('(max-width: 768px)').matches; } catch (e) {}
    if (isMobile) return;

    window.__rizqRLogoInit = true;

    var edge = document.getElementById('rizq-rlogo-edge');
    if (!edge) {
      edge = document.createElement('div');
      edge.id = 'rizq-rlogo-edge';
      edge.setAttribute('aria-hidden', 'true');
      document.body.appendChild(edge);
    }

    var hideTimer = null;

    function visibleLogos() {
      return Array.prototype.filter.call(logos, function (el) {
        return el.style.display !== 'none' && el.offsetParent !== null;
      });
    }

    function show() {
      visibleLogos().forEach(function (el) { el.classList.add('rzq-rlogo-visible'); });
    }

    function hide() {
      logos.forEach(function (el) { el.classList.remove('rzq-rlogo-visible'); });
    }

    function cancelHide() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    }

    function scheduleHide() {
      cancelHide();
      hideTimer = setTimeout(hide, 520);
    }

    function nearRightEdge(clientX) {
      return clientX >= window.innerWidth - 28;
    }

    if (!edge.getAttribute('data-rizq-bound')) {
      edge.setAttribute('data-rizq-bound', '1');
      edge.addEventListener('mouseenter', function () { cancelHide(); show(); });
      edge.addEventListener('mousemove', function () { cancelHide(); show(); });
      edge.addEventListener('mouseleave', scheduleHide);
    }

    logos.forEach(function (logo) {
      if (logo.getAttribute('data-rlogo-bound')) return;
      logo.setAttribute('data-rlogo-bound', '1');
      logo.addEventListener('mouseenter', function () { cancelHide(); show(); });
      logo.addEventListener('mouseleave', scheduleHide);
    });

    if (!document.body.getAttribute('data-rlogo-mouse-bound')) {
      document.body.setAttribute('data-rlogo-mouse-bound', '1');
      document.addEventListener('mousemove', function (e) {
        if (nearRightEdge(e.clientX)) { cancelHide(); show(); }
      });
    }
  }

  function removeDeskNav() {
    var n = document.getElementById('rizq-desk-nav');
    if (n && n.parentNode) n.parentNode.removeChild(n);
    document.documentElement.classList.remove('has-rizq-desk-nav');
  }

  function isDashPage() {
    var p = pathName().toLowerCase();
    return /dashboard|admin\.html|chat_widget/.test(p);
  }

  function inject() {
    if (isDashShell()) {
      unifyDashLangPills();
      return;
    }
    document.documentElement.classList.add('rizq-app-nav');
    ensureActiveNavListeners();
    if (!isMobileNav()) {
      removeHeader();
      if (!isLanding() && !isDashPage() && !document.getElementById('rizq-desk-nav')) {
        document.body.insertAdjacentHTML('afterbegin', deskNavHtml());
        document.documentElement.classList.add('has-rizq-desk-nav');
        bindDeskNav();
        ensureLangListener();
        applyLabels();
      }
      if (!isDashPage()) {
        ensureMediatorPill();
        ensureLangListener();
        applyLabels();
        initRLogoSidebar();
      }
      if (window.RizqModuleFlags && typeof window.RizqModuleFlags.reapply === 'function') {
        window.RizqModuleFlags.reapply();
      } else {
        scheduleNavRefresh();
      }
      markActive();
      return;
    }
    removeDeskNav();
    if (isLanding()) {
      removeHeader();
      if (document.body) document.body.classList.add('landing-ux-mobile');
      bindLandingMobileMore();
      ensureLangListener();
      applyLabels();
      if (window.RizqModuleFlags && typeof window.RizqModuleFlags.reapply === 'function') {
        window.RizqModuleFlags.reapply();
      } else {
        scheduleNavRefresh();
      }
      markActive();
      return;
    }
    if (!document.getElementById('rizq-app-header')) {
      var host = document.body;
      if (!host) return;
      host.insertAdjacentHTML('afterbegin', headerHtml());
    }
    bind();
    ensureLangListener();
    ensureMediatorPill();
    initRLogoSidebar();
    applyLabels();
    if (window.RizqModuleFlags && typeof window.RizqModuleFlags.reapply === 'function') {
      window.RizqModuleFlags.reapply();
    } else {
      scheduleNavRefresh();
    }
    markActive();
  }

  window.RizqHeader = {
    applyLabels: applyLabels,
    applyNavMenuOrder: applyNavMenuOrder,
    inject: inject,
    markActive: markActive,
    resolveActiveNavKey: resolveActiveNavKey,
    positionMobileMoreMenu: positionMobileMoreMenu,
    closeMobileMoreMenu: closeMobileMoreMenu
  };

  if (document.body) inject();
  else document.addEventListener('DOMContentLoaded', inject);
  window.addEventListener('load', function () {
    if (isMobileNav() && !document.getElementById('rizq-app-header') && document.body) inject();
  });
  try {
    var mq = window.matchMedia('(max-width: 768px)');
    var mqLand = window.matchMedia('(orientation: landscape) and (max-height: 520px)');
    if (mq.addEventListener) {
      mq.addEventListener('change', inject);
      mqLand.addEventListener('change', inject);
    } else if (mq.addListener) {
      mq.addListener(inject);
      mqLand.addListener(inject);
    }
    window.addEventListener('orientationchange', function () {
      window.setTimeout(inject, 150);
    });
  } catch (e2) {}
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMoreDropdowns();
  });
  ensureLangListener();
})();
