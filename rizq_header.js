/**
 * rizq_header.js — unified two-tier header for every public Rizq page.
 */
(function () {
  'use strict';
  if (window.__rizqHeaderInit) return;
  window.__rizqHeaderInit = true;

  var LANG_LABEL = 'FR / العربية';

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
            '<button type="button" class="rizq-hdr-account" id="rizq-hdr-account" aria-label="حسابي" title="حسابي">👤</button>' +
            '<button type="button" class="btn-lang btn-lang-primary" id="rizq-lang-btn" aria-label="' + LANG_LABEL + '">' + LANG_LABEL + '</button>' +
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
          '<button type="button" class="rizq-hdr-item" id="rizq-hdr-assistant" data-nav-order="4">' +
            '<span class="rizq-hdr-ico">✨</span><span class="rizq-hdr-lbl" data-hdr="ai">رزق ذكي</span>' +
          '</button>' +
          '<div class="rizq-hdr-more-wrap" id="rizq-hdr-more-wrap" data-nav-order="5">' +
            '<button type="button" class="rizq-hdr-item" id="rizq-hdr-more" aria-haspopup="true" aria-expanded="false">' +
              '<span class="rizq-hdr-ico">⋯</span><span class="rizq-hdr-lbl" data-hdr="more">المزيد</span>' +
            '</button>' +
            '<div class="rizq-hdr-more-menu" id="rizq-hdr-more-menu" role="menu">' +
              '<a href="rizq_store.html" role="menuitem" data-hdr="stores">المحلات</a>' +
              '<a href="rizq_office.html" role="menuitem" data-hdr="offices">المكاتب</a>' +
              '<a href="rizq_ads_info.html" role="menuitem" data-hdr="rizqads">📹 Rizq ADS</a>' +
              '<a href="' + adsHref() + '" role="menuitem" data-hdr="ads">الإعلانات</a>' +
              '<a href="rizq_tenders.html" role="menuitem" data-hdr="tenders">المناقصات</a>' +
              '<a href="' + packagesHref() + '" role="menuitem" data-hdr="packs">الباقات</a>' +
              '<a href="rizq_legal.html" role="menuitem" data-hdr="legal">المادة القانونية</a>' +
              '<a href="' + aboutHref() + '" role="menuitem" data-hdr="about">من نحن</a>' +
            '</div>' +
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
    stores: ['hdr-stores', 'dd-stores'],
    offices: ['hdr-offices', 'dd-offices'],
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
      ads: t2('الإعلانات', 'Annonces'),
      tenders: t2('المناقصات', 'Appels d\'offres'),
      packs: t2('الباقات', 'Forfaits'),
      legal: t2('المادة القانونية', 'Mentions légales'),
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
    var lang = document.getElementById('rizq-lang-btn');
    if (lang) {
      lang.textContent = LANG_LABEL;
      lang.setAttribute('aria-label', LANG_LABEL);
    }
    var deskLang = document.getElementById('rizq-desk-lang-btn');
    if (deskLang) {
      deskLang.textContent = LANG_LABEL;
      deskLang.setAttribute('aria-label', LANG_LABEL);
    }
    var pill = document.getElementById('fixed-disc-pill');
    if (pill) {
      pill.textContent = t2('⚖️ رزق وسيط إلكتروني — عاين قبل الدفع', '⚖️ Rizq — inspectez avant paiement');
    }
    var row2 = document.querySelector('#rizq-app-header .rizq-hdr-row2');
    if (row2) row2.style.direction = currentLang() === 'fr' ? 'ltr' : 'rtl';
    applyNavMenuOrder();
  }

  function markActive() {
    var k = pageKey();
    var home = document.getElementById('rizq-hdr-home');
    var cats = document.getElementById('rizq-hdr-cats');
    var post = document.getElementById('rizq-hdr-post');
    if (home && (isLanding() || k === '')) home.classList.add('is-active');
    if (cats && (k === 'rizq_browse' || k === 'rizq_search')) cats.classList.add('is-active');
    if (post && k === 'rizq_post') post.style.boxShadow = '0 0 0 3px rgba(232,201,106,.35)';
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
    }
    var lang = currentLang();
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    if (window.RizqI18n && typeof window.RizqI18n.stripLeakedDirs === 'function') {
      try { window.RizqI18n.stripLeakedDirs(); } catch (eS) {}
    }
    applyLabels();
  }

  function bind() {
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
        var open = wrap.classList.toggle('open');
        moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      if (menu) {
        menu.addEventListener('click', function (e) { e.stopPropagation(); });
      }
      document.addEventListener('click', function () {
        wrap.classList.remove('open');
        moreBtn.setAttribute('aria-expanded', 'false');
      });
    }
    ensureLangListener();
    applyLabels();
    markActive();
  }

  function unifyDashLangPills() {
    document.documentElement.classList.add('rizq-dash-nav');
    document.querySelectorAll('.btn-lang, .btn-lang-store, .rizq-lang-btn').forEach(function (btn) {
      btn.classList.add('btn-lang-primary');
      btn.textContent = LANG_LABEL;
      btn.setAttribute('aria-label', LANG_LABEL);
    });
  }

  function isMobileNav() {
    try {
      return window.matchMedia('(max-width: 768px)').matches;
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
          '<button type="button" class="btn-lang btn-lang-primary" id="rizq-desk-lang-btn" aria-label="FR / العربية">FR / العربية</button>' +
        '</div>' +
        '<ul class="nav-center">' +
          '<li data-nav-order="1"><a href="rizq_landing_v8.html" data-hdr="home">' + t2('الرئيسية', 'Accueil') + '</a></li>' +
          '<li data-nav-order="2"><a href="' + catsHref() + '" data-hdr="cats">' + t2('الأقسام', 'Catégories') + '</a></li>' +
          '<li data-nav-order="3"><a href="rizq_post.html" class="nav-post-plus" data-hdr="post">' + t2('نشر (+)', 'Publier (+)') + '</a></li>' +
          '<li data-nav-order="4"><button type="button" class="nav-link-btn" id="rizq-desk-assistant" data-hdr="ai">' + t2('✨ رزق ذكي', '✨ Rizq IA') + '</button></li>' +
          '<li class="nav-dropdown-li" id="rizq-desk-more-li" data-nav-order="5">' +
            '<a href="#" class="nav-dropdown-trigger" id="rizq-desk-more" data-hdr="more">' + t2('المزيد ▾', 'Plus ▾') + '</a>' +
            '<div class="nav-dropdown-menu nav-more-menu" role="menu">' +
              '<a href="rizq_store.html" class="nav-dd-item" role="menuitem"><span class="nav-dd-icon">🏪</span><div><strong data-hdr="stores">المحلات</strong></div></a>' +
              '<a href="rizq_office.html" class="nav-dd-item" role="menuitem"><span class="nav-dd-icon">💼</span><div><strong data-hdr="offices">المكاتب</strong></div></a>' +
              '<a href="rizq_ads_info.html" class="nav-dd-item nav-dd-ads" role="menuitem"><span class="nav-dd-icon">📹</span><div><strong data-hdr="rizqads">Rizq ADS</strong></div></a>' +
              '<a href="' + adsHref() + '" class="nav-dd-item" role="menuitem"><span class="nav-dd-icon">📢</span><div><strong data-hdr="ads">الإعلانات</strong></div></a>' +
              '<a href="rizq_tenders.html" class="nav-dd-item" role="menuitem"><span class="nav-dd-icon">📋</span><div><strong data-hdr="tenders">المناقصات</strong></div></a>' +
              '<a href="' + packagesHref() + '" class="nav-dd-item" role="menuitem"><span class="nav-dd-icon">💎</span><div><strong data-hdr="packs">الباقات</strong></div></a>' +
              '<a href="rizq_legal.html" class="nav-dd-item" role="menuitem"><span class="nav-dd-icon">⚖️</span><div><strong data-hdr="legal">المادة القانونية</strong></div></a>' +
              '<a href="' + aboutHref() + '" class="nav-dd-item" role="menuitem"><span class="nav-dd-icon">ℹ️</span><div><strong data-hdr="about">من نحن</strong></div></a>' +
            '</div>' +
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
    document.querySelectorAll('.nav-dropdown-li.open').forEach(function (o) {
      o.classList.remove('open');
      restoreMoreMenu(o);
    });
    document.querySelectorAll('.nav-dropdown-menu.rizq-more-menu-open').forEach(function (m) {
      m.classList.remove('rizq-more-menu-open');
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
    menu.classList.remove('rizq-more-menu-open');
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
    return menu;
  }

  function positionMoreDropdown(li) {
    if (!li) return;
    restoreMoreMenu(li);
    li.classList.add('open');
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
        lang.textContent = LANG_LABEL;
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
        try { return window.matchMedia('(min-width:769px)').matches; } catch (eH) { return true; }
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
      }
      return;
    }
    removeDeskNav();
    if (!document.getElementById('rizq-app-header')) {
      var host = document.body;
      if (!host) return;
      host.insertAdjacentHTML('afterbegin', headerHtml());
    }
    bind();
    ensureLangListener();
    ensureMediatorPill();
    initRLogoSidebar();
    if (window.RizqModuleFlags && typeof window.RizqModuleFlags.reapply === 'function') {
      window.RizqModuleFlags.reapply();
    }
  }

  if (document.body) inject();
  else document.addEventListener('DOMContentLoaded', inject);
  try {
    var mq = window.matchMedia('(max-width: 768px)');
    if (mq.addEventListener) mq.addEventListener('change', inject);
    else if (mq.addListener) mq.addListener(inject);
  } catch (e2) {}
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMoreDropdowns();
  });
  ensureLangListener();
})();
