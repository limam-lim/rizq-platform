/**
 * rizq_landing_ux.js — Sticky nav, section jump, back-to-top, stats count-up
 */
(function () {
  'use strict';

  /* ── تثبيت أفقي خفيف — عند التحميل فقط ── */
  function lockPageX() {
    document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;
    if (window.scrollX) window.scrollTo(0, window.scrollY || 0);
  }
  lockPageX();
  window.addEventListener('load', lockPageX);
  window.addEventListener('resize', lockPageX, { passive: true });

  /* Hero entrance — visible polish on first paint */
  function markHeroEnter() {
    var hc = document.querySelector('.hero-content');
    if (hc) hc.classList.add('rizq-hero-enter');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markHeroEnter);
  } else {
    markHeroEnter();
  }

  /* Pricing skeletons early — prevent empty-grid flash before packages render */
  function paintPricingSkels() {
    try {
      document.querySelectorAll('.pricing-grid[data-rizq-pkg-skel="1"]').forEach(function (el) {
        if (el.children.length) return;
        if (window.RizqPackagesUI && typeof RizqPackagesUI.pkgSkeletonHtml === 'function') {
          el.innerHTML = RizqPackagesUI.pkgSkeletonHtml(4);
          return;
        }
        var sk = '';
        for (var i = 0; i < 4; i++) {
          sk += '<div class="rpkg-card rizq-skel-card" style="border-radius:18px;padding:28px 18px;border:1.5px solid rgba(201,168,76,.2);background:linear-gradient(160deg,#0a1628,#122040);min-height:160px" aria-hidden="true"></div>';
        }
        el.innerHTML = sk;
      });
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintPricingSkels);
  } else {
    paintPricingSkels();
  }

  function lang() {
    try {
      return localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t(ar, fr) {
    return lang() === 'fr' ? fr : ar;
  }

  /* ── Sticky compact nav + back-to-top + section jump ── */
  var nav = document.getElementById('nav');
  var backBtn = document.getElementById('back-to-top');
  var jumpBar = document.getElementById('section-jump-bar');
  var stickyInput = document.getElementById('nav-sticky-search-input');
  var SCROLL_COMPACT = 120;
  var SCROLL_TOP = 300;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (nav) nav.classList.toggle('nav-compact', y > SCROLL_COMPACT);
    if (nav) nav.classList.toggle('scrolled', y > 30);
    if (backBtn) backBtn.classList.toggle('visible', y > SCROLL_TOP);
    if (jumpBar) jumpBar.classList.toggle('visible', y > SCROLL_TOP);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (backBtn) {
    backBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.doNavStickySearch = function () {
    var q = stickyInput ? stickyInput.value.trim() : '';
    var hero = document.getElementById('hero-search');
    if (hero) hero.value = q;
    if (typeof window.doMainSearch === 'function') window.doMainSearch();
    else if (q) window.location.href = 'rizq_search.html?q=' + encodeURIComponent(q);
  };

  if (stickyInput) {
    stickyInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.doNavStickySearch();
      }
    });
    function bindStickySugg() {
      if (!window.RizqUx || typeof window.RizqUx.attachSearchSuggestions !== 'function') return false;
      window.RizqUx.attachSearchSuggestions({
        input: stickyInput,
        getAds: function () { return window.ADS || []; },
        onPickExpr: 'doNavStickySearch()'
      });
      return true;
    }
    if (!bindStickySugg()) {
      var _suggTries = 0;
      var _suggTimer = setInterval(function () {
        _suggTries++;
        if (bindStickySugg() || _suggTries > 40) clearInterval(_suggTimer);
      }, 150);
    }
  }

  /* ── فتح ويدجت المساعد — scroll سلس ثم open() ── */
  function openRizqWidget() {
    var toggle = document.getElementById('rizq-chat-toggle');
    if (!toggle) return;

    function doOpen() {
      if (window.RizqWidget && typeof window.RizqWidget.open === 'function') {
        window.RizqWidget.open();
      } else if (window.RizqWidget && typeof window.RizqWidget.toggle === 'function') {
        window.RizqWidget.toggle();
      }
    }

    var rect = toggle.getBoundingClientRect();
    var inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (!inView) {
      var targetY = window.scrollY + rect.top - window.innerHeight * 0.55;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      setTimeout(doOpen, 480);
    } else {
      doOpen();
    }
  }

  window.openRizqWidget = openRizqWidget;
  window.toggleRizqWidget = function () {
    if (window.RizqWidget && typeof window.RizqWidget.toggle === 'function') {
      window.RizqWidget.toggle();
    } else {
      openRizqWidget();
    }
  };

  /* ── Section jump: highlight active ── */
  var jumpLinks = jumpBar ? jumpBar.querySelectorAll('[data-jump]') : [];
  var jumpSections = [];
  jumpLinks.forEach(function (a) {
    var id = a.getAttribute('data-jump');
    if (id && id.charAt(0) === '#') {
      var el = document.querySelector(id);
      if (el) jumpSections.push({ id: id, el: el, link: a });
    }
  });

  function bindAssistantBtn(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openRizqWidget();
    });
  }
  bindAssistantBtn('jump-assistant');
  bindAssistantBtn('mbn-assistant');
  bindAssistantBtn('nav-assistant-btn');
  bindAssistantBtn('rizq-hdr-assistant');
  bindAssistantBtn('drawer-assistant-btn');

  function updateJumpActive() {
    var y = window.scrollY + 140;
    var current = null;
    jumpSections.forEach(function (s) {
      if (s.el.offsetTop <= y) current = s;
    });
    jumpLinks.forEach(function (a) { a.classList.remove('active'); });
    if (current && current.link) current.link.classList.add('active');
  }
  window.addEventListener('scroll', updateJumpActive, { passive: true });

  /* ── Mobile bottom nav ── */
  var bottomNav = document.getElementById('mobile-bottom-nav');
  if (bottomNav) {
    document.body.classList.add('landing-ux-mobile');
    bottomNav.querySelectorAll('[data-jump]').forEach(function (el) {
      el.addEventListener('click', function () {
        bottomNav.querySelectorAll('a,button').forEach(function (x) { x.classList.remove('active'); });
        el.classList.add('active');
      });
    });
    var mbnMore = document.getElementById('mbn-more');
    if (mbnMore) {
      mbnMore.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.toggleMobileNav === 'function') window.toggleMobileNav();
      });
    }
  }

  var navMoreMobile = document.getElementById('nav-more-mobile-btn');
  if (navMoreMobile && !navMoreMobile.getAttribute('data-rizq-more-bound')) {
    navMoreMobile.setAttribute('data-rizq-more-bound', '1');
    navMoreMobile.addEventListener('click', function (e) {
      if (typeof window.toggleNavDropdown === 'function') {
        window.toggleNavDropdown(e, navMoreMobile);
      }
    }, true);
  }

  /* ── Enhanced count-up (all numeric stats on scroll) ── */
  function animateCountEl(el) {
    if (el.dataset.counted === '1') return;
    var raw = el.getAttribute('data-target');
    if (!raw && el.textContent) {
      var m = String(el.textContent).match(/(\d+)/);
      if (m) raw = m[1];
    }
    var target = parseInt(raw, 10);
    if (!target || isNaN(target)) return;
    el.dataset.counted = '1';
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    var start = 0;
    var dur = 1400;
    var t0 = performance.now();
    function frame(now) {
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(start + (target - start) * eased);
      el.textContent = prefix + val.toLocaleString('en-US') + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  var statsBar = document.querySelector('.hero-stats-bar');
  if (statsBar) {
    document.querySelectorAll('.hero-stats-bar .h-stat-num').forEach(function (el) {
      var txt = el.textContent.trim();
      if (!el.getAttribute('data-target')) {
        var m = txt.match(/(\d+)/);
        if (m) {
          el.setAttribute('data-target', m[1]);
          if (txt.indexOf('+') >= 0) el.setAttribute('data-suffix', '+');
        }
      }
    });
    var statsObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.querySelectorAll('.h-stat-num[data-target]').forEach(animateCountEl);
          statsObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    statsObs.observe(statsBar);
  }

  /* ── i18n labels for UX chrome ── */
  function applyUxLang() {
    var fr = lang() === 'fr';
    if (stickyInput) {
      stickyInput.placeholder = fr ? 'Rechercher sur Rizq...' : 'البحث في رزق...';
    }
    if (backBtn) backBtn.setAttribute('aria-label', fr ? 'Retour en haut' : 'العودة للأعلى');
    var jumpLabels = {
      '#categories': fr ? 'Sections' : 'الأقسام',
      '#hero-listings': fr ? 'Annonces' : 'الإعلانات',
      '#pricing': fr ? 'Forfaits' : 'الباقات',
      '#jump-assistant': fr ? '✨ Rizq IA' : '✨ رزق ذكي'
    };
    Object.keys(jumpLabels).forEach(function (sel) {
      var el = sel === '#jump-assistant'
        ? document.getElementById('jump-assistant')
        : document.querySelector('[data-jump="' + sel + '"]');
      if (el) el.textContent = jumpLabels[sel];
    });
    if (bottomNav) {
      var mbn = {
        'mbn-home': fr ? 'Accueil' : 'الرئيسية',
        'mbn-cats': fr ? 'Sections' : 'الأقسام',
        'mbn-post': fr ? 'Publier' : 'نشر',
        'mbn-assistant': fr ? '✨ Rizq IA' : '✨ رزق ذكي',
        'mbn-more': fr ? 'Plus' : 'المزيد'
      };
      Object.keys(mbn).forEach(function (id) {
        var node = document.getElementById(id);
        if (!node) return;
        var lbl = node.querySelector('.mbn-label');
        if (lbl) lbl.textContent = mbn[id];
      });
    }
    var postBtn = document.getElementById('nav-sticky-post');
    if (postBtn) postBtn.textContent = fr ? '+ Publier' : '+ نشر';

    var heroSearch = document.getElementById('hero-search');
    if (heroSearch && heroSearch.dataset.t === 'search-ph') {
      heroSearch.placeholder = fr ? 'Rechercher sur Rizq...' : 'البحث في رزق...';
    }
    var liveWrap = document.querySelector('#hero-listings .listings-label > span');
    if (liveWrap) {
      liveWrap.innerHTML = '<span class="live-pulse-dot" aria-hidden="true"></span><strong>🔴 '
        + (fr ? 'Live' : 'مباشر') + '</strong> '
        + (fr
          ? 'Dernières annonces publiées — mise à jour automatique'
          : 'أحدث الإعلانات المنشورة — تتحدث تلقائياً');
    }

    var hamburger = document.getElementById('nav-hamburger');
    if (hamburger) {
      hamburger.setAttribute('aria-label', fr ? 'Menu' : 'القائمة');
      hamburger.setAttribute('title', fr ? 'Menu' : 'القائمة');
    }
    var drawerClose = document.querySelector('.mobile-drawer-close');
    if (drawerClose) drawerClose.setAttribute('aria-label', fr ? 'Fermer' : 'إغلاق');
    var drawerAccount = document.querySelector('#mobile-drawer ul li:first-child button');
    if (drawerAccount) drawerAccount.textContent = fr ? 'Mon compte' : 'حسابي';
    var drawerPost = document.querySelector('#mobile-drawer ul a[href="rizq_post.html"]');
    if (drawerPost) drawerPost.textContent = fr ? 'Publier (+)' : 'نشر (+)';
    var drawerAssistant = document.getElementById('drawer-assistant-btn');
    if (drawerAssistant) drawerAssistant.textContent = fr ? '✨ Rizq IA' : '✨ رزق ذكي';
  }

  document.addEventListener('rizq:langchange', applyUxLang);
  applyUxLang();

  /* ── ربط روابط الأقسام الفرعية (كانت href="#") بتصفّح الإعلانات ── */
  document.querySelectorAll('.drop-link[href="#"]').forEach(function (a) {
    var card = a.closest('.cat-card');
    var catNameEl = card ? card.querySelector('.cat-name') : null;
    var catName = (card && card.getAttribute('data-cat-ar'))
      || (catNameEl && catNameEl.getAttribute('data-ar'))
      || (catNameEl ? catNameEl.textContent.trim() : '');
    var sub = a.getAttribute('data-ar') || a.textContent.trim();
    if (catName) {
      a.href = 'rizq_browse.html?cat=' + encodeURIComponent(catName) + '&sub=' + encodeURIComponent(sub);
    } else {
      a.href = 'rizq_browse.html?q=' + encodeURIComponent(sub);
    }
    a.removeAttribute('onclick');
  });

  /* ── Mobile bottom sheets for category / quick-cat menus ── */
  function isMobileUx() {
    if (window.RizqViewport && typeof window.RizqViewport.isPhone === 'function') {
      return window.RizqViewport.isPhone();
    }
    return window.matchMedia('(max-width:768px)').matches
      || window.matchMedia('(orientation:landscape) and (max-height:520px)').matches;
  }

  function closeRizqSheet() {
    var bd = document.getElementById('rzq-sheet-backdrop');
    var sh = document.getElementById('rzq-sheet');
    if (bd) bd.classList.remove('open');
    if (sh) sh.classList.remove('open');
    document.body.style.overflow = '';
  }

  function ensureRizqSheet() {
    if (document.getElementById('rzq-sheet')) return;
    var bd = document.createElement('div');
    bd.id = 'rzq-sheet-backdrop';
    bd.className = 'rzq-sheet-backdrop';
    bd.addEventListener('click', closeRizqSheet);
    var sheet = document.createElement('div');
    sheet.id = 'rzq-sheet';
    sheet.className = 'rzq-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.innerHTML = '<div class="rzq-sheet-handle"></div>'
      + '<div class="rzq-sheet-head"><div class="rzq-sheet-title" id="rzq-sheet-title"></div>'
      + '<button type="button" class="rzq-sheet-close" id="rzq-sheet-close" aria-label="Close">✕</button></div>'
      + '<div class="rzq-sheet-body" id="rzq-sheet-body"></div>';
    document.body.appendChild(bd);
    document.body.appendChild(sheet);
    document.getElementById('rzq-sheet-close').addEventListener('click', closeRizqSheet);
  }

  function openRizqSheet(titleHtml, bodyHtml) {
    ensureRizqSheet();
    var sheet = document.getElementById('rzq-sheet');
    document.getElementById('rzq-sheet-title').innerHTML = titleHtml || '';
    document.getElementById('rzq-sheet-body').innerHTML = bodyHtml || '';
    if (sheet) sheet.classList.toggle('rzq-sheet--compact', isMobileUx());
    document.getElementById('rzq-sheet-backdrop').classList.add('open');
    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  /* ── Soft close helper for category / quick-cat inline panels ── */
  window.rizqAnimatePanelClose = function (panel, afterHide) {
    if (!panel) {
      if (typeof afterHide === 'function') afterHide();
      return;
    }
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (eR) {}
    var isOpen = panel.style.display === 'block' || panel.classList.contains('visible');
    function finish() {
      if (panel.classList.contains('visible')) {
        /* Re-opened during close animation — do not hide or run cleanup */
        panel.classList.remove('closing');
        return;
      }
      panel.style.display = 'none';
      panel.classList.remove('visible', 'closing', 'pinned');
      if (typeof afterHide === 'function') afterHide();
    }
    if (reduce || !isOpen) {
      panel.classList.remove('visible', 'closing');
      panel.style.display = 'none';
      if (typeof afterHide === 'function') afterHide();
      return;
    }
    panel.classList.remove('visible');
    panel.classList.add('closing');
    var done = false;
    function once() {
      if (done) return;
      done = true;
      finish();
    }
    panel.addEventListener('animationend', once, { once: true });
    setTimeout(once, 260);
  };

  /* openInlineExpand على الجوال يستخدم #cat-inline-panel inline (مثل سطح المكتب) */

  if (typeof window.closeInlineExpand === 'function') {
    var _closeIE = window.closeInlineExpand;
    window.closeInlineExpand = function (force) {
      _closeIE(force);
      if (isMobileUx()) closeRizqSheet();
    };
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeRizqSheet();
      if (typeof window.closeQcatPortal === 'function') window.closeQcatPortal(true);
    }
  });
})();
