/**
 * rizq_pwa.js
 * Manifest + service worker + shared mobile CSS + brand splash.
 */
(function () {
  'use strict';

  var ASSET_V = '17.5';

  if (typeof window.showToast !== 'function') {
    window.showToast = function (msg, type) {
      var el = document.getElementById('rizq-toast-global');
      if (!el) {
        el = document.createElement('div');
        el.id = 'rizq-toast-global';
        document.body.appendChild(el);
      }
      el.textContent = msg || '';
      el.className = 'show' + (type ? ' toast-' + type : '');
      clearTimeout(el._rizqToastT);
      el._rizqToastT = setTimeout(function () { el.className = ''; }, type === 'success' ? 2800 : 3200);
    };
  }

  /** Render navy/gold skeleton cards into a container (listing / store grids). */
  window.rizqSkeletonHtml = function (count) {
    count = Math.max(1, Math.min(count || 6, 12));
    var i, html = '<div class="rizq-skel-grid" role="status" aria-busy="true">';
    for (i = 0; i < count; i++) {
      html += '<div class="rizq-skel-card">'
        + '<div class="rizq-skel rizq-skel-media"></div>'
        + '<div class="rizq-skel rizq-skel-line mid"></div>'
        + '<div class="rizq-skel rizq-skel-line short"></div>'
        + '</div>';
    }
    return html + '</div>';
  };
  window.rizqShowSkeleton = function (el, count) {
    if (!el) return;
    el.innerHTML = window.rizqSkeletonHtml(count);
  };

  function isPublicShell() {
    var p = (location.pathname || '').toLowerCase();
    return !/dashboard|admin\.html|chat_widget/.test(p);
  }

  function appendScript(src, opts) {
    opts = opts || {};
    if (document.querySelector('script[src*="' + src.split('?')[0] + '"]')) return;
    var s = document.createElement('script');
    s.src = src;
    if (opts.defer) s.defer = true;
    if (opts.async === false) s.async = false;
    document.head.appendChild(s);
  }

  var SPLASH_MARK =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">' +
    '<rect width="512" height="512" rx="108" fill="#0f172a"/>' +
    '<text x="236" y="355" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-size="268" font-weight="700" fill="#C9A84C">R</text>' +
    '<text x="372" y="368" text-anchor="middle" font-family="Georgia,\'Times New Roman\',serif" font-size="168" font-weight="700" fill="#C9A84C">,</text>' +
    '</svg>';

  try {
    try {
      var bootLang = localStorage.getItem('rizq_lang') || 'ar';
      document.documentElement.lang = bootLang === 'fr' ? 'fr' : 'ar';
      document.documentElement.setAttribute('dir', bootLang === 'fr' ? 'ltr' : 'rtl');
    } catch (eBoot) {}
    if (!/chat_widget/i.test(location.pathname || '')) {
      document.documentElement.classList.add('rizq-app-nav');
    }
    if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Cairo"]')) {
      var fontLink = document.createElement('link');
      fontLink.rel = 'stylesheet';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap';
      document.head.appendChild(fontLink);
    }
    if (!document.querySelector('link[rel="stylesheet"][href*="rizq-theme.css"]')) {
      var themeCss = document.createElement('link');
      themeCss.rel = 'stylesheet';
      themeCss.href = 'rizq-theme.css?v=' + ASSET_V;
      document.head.appendChild(themeCss);
    }
    if (!document.querySelector('link[rel="stylesheet"][href*="rizq_header.css"]')) {
      var hdrCss = document.createElement('link');
      hdrCss.rel = 'stylesheet';
      hdrCss.href = 'rizq_header.css?v=' + ASSET_V;
      document.head.appendChild(hdrCss);
    }
    if (!document.querySelector('script[src*="rizq_header.js"]')) {
      appendScript('rizq_header.js?v=' + ASSET_V, { async: false });
    }
    if (!document.querySelector('script[src*="rizq_module_flags.js"]')) {
      appendScript('rizq_dynamic_nav.js?v=' + ASSET_V, { defer: true });
      appendScript('rizq_module_flags.js?v=' + ASSET_V, { defer: true });
    }
    if (isPublicShell() && !document.querySelector('script[src*="rizq_packages_config.js"]')) {
      appendScript('rizq_packages_config.js?v=' + ASSET_V, { defer: true });
      appendScript('rizq_packages_ui.js?v=' + ASSET_V, { defer: true });
    }
    if (!document.querySelector('link[rel="stylesheet"][href*="rizq_mobile.css"]')) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'rizq_mobile.css?v=' + ASSET_V;
      document.head.appendChild(css);
    }
    if (isPublicShell()) {
      appendScript('rizq_agent.js?v=' + ASSET_V, { defer: true });
      appendScript('rizq_manager_agent_config.js?v=' + ASSET_V, { defer: true });
      appendScript('rizq_widget_embed.js?v=' + ASSET_V, { defer: true });
    }
    if (!document.querySelector('link[rel="manifest"]')) {
      var link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.json';
      document.head.appendChild(link);
    }
    var theme = document.querySelector('meta[name="theme-color"]');
    if (!theme) {
      theme = document.createElement('meta');
      theme.name = 'theme-color';
      document.head.appendChild(theme);
    }
    theme.content = '#0d1b2a';
  } catch (e) { /* keep page usable */ }

  function isPhoneViewport() {
    try {
      if (window.matchMedia('(max-width:768px)').matches) return true;
      if (window.matchMedia('(orientation:landscape) and (max-height:520px)').matches) return true;
      return false;
    } catch (eV) {
      return window.innerWidth <= 768 || (window.innerHeight <= 520 && window.innerWidth > window.innerHeight);
    }
  }

  global.RizqViewport = { isPhone: isPhoneViewport };

  function onViewportChange() {
    try { window.dispatchEvent(new Event('resize')); } catch (eR) {}
    try {
      if (window.RizqHeader && typeof window.RizqHeader.inject === 'function') {
        window.RizqHeader.inject();
      }
    } catch (eH) {}
  }
  window.addEventListener('orientationchange', function () {
    window.setTimeout(onViewportChange, 150);
  });

  function isStandalone() {
    try {
      return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    } catch (e) {
      return false;
    }
  }

  function shouldSplash() {
    try {
      if (sessionStorage.getItem('rizq_splash_shown') === '1') return false;
    } catch (e) {}
    if (isStandalone()) return true;
    try {
      return window.matchMedia('(max-width:768px)').matches;
    } catch (e2) {
      return false;
    }
  }

  function hideSplash(el) {
    if (!el) return;
    el.classList.add('is-done');
    setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 480);
    try { sessionStorage.setItem('rizq_splash_shown', '1'); } catch (e) {}
  }

  function mountSplash() {
    var el = document.getElementById('rizq-splash');
    if (!shouldSplash()) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'rizq-splash';
      el.className = 'rizq-splash';
      el.innerHTML = '<div class="rizq-splash-mark">' + SPLASH_MARK + '</div>'
        + '<div class="rizq-splash-brand">رزق / RIZQ PLATFORM</div>';
      (document.body || document.documentElement).appendChild(el);
    }
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      hideSplash(el);
    }
    window.setTimeout(finish, 1400);
    window.addEventListener('load', function () { window.setTimeout(finish, 400); });
  }

  if (document.body) mountSplash();
  else document.addEventListener('DOMContentLoaded', mountSplash);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('Rizq PWA: تعذّر تسجيل service worker', err);
      });
    });
  }
})();
