/**
 * rizq_pwa.js
 * Manifest + service worker + shared mobile CSS + brand splash.
 */
(function () {
  'use strict';

  var ASSET_V = '19.7';

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

  function showBootBanner(msg, isError) {
    if (document.getElementById('rizq-boot-banner')) return;
    var el = document.createElement('div');
    el.id = 'rizq-boot-banner';
    el.setAttribute('role', 'alert');
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px 16px;font:600 14px/1.45 Cairo,Segoe UI,sans-serif;text-align:center;'
      + (isError ? 'background:#7f1d1d;color:#fff;' : 'background:#1e3a5f;color:#fef3c7;');
    el.textContent = msg;
    (document.body || document.documentElement).appendChild(el);
  }

  try {
    if (location.protocol === 'file:') {
      showBootBanner('⚠️ لا تفتح الملف مباشرة — شغّل start-rizq.bat ثم افتح http://localhost:3000/', true);
    }
    try {
      var bootLang = localStorage.getItem('rizq_lang') || 'ar';
      document.documentElement.lang = bootLang === 'fr' ? 'fr' : 'ar';
      document.documentElement.setAttribute('dir', bootLang === 'fr' ? 'ltr' : 'rtl');
    } catch (eBoot) {}
    if (!/dashboard|admin\.html|chat_widget/i.test(location.pathname || '')) {
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
    if (!document.querySelector('script[src*="rizq_account_route.js"]')) {
      appendScript('rizq_account_route.js?v=' + ASSET_V, { async: false });
    }
    if (!document.querySelector('script[src*="rizq_header.js"]')) {
      appendScript('rizq_header.js?v=' + ASSET_V, { async: false });
    }
    /* فوتر المنصة الموحّد — زوار + داشبوردات المشتركين */
    if (!document.querySelector('script[src*="rizq_site_footer.js"]')) {
      appendScript('rizq_site_footer.js?v=' + ASSET_V, { defer: true });
    }
    if (!document.querySelector('script[src*="rizq_footer_toggle.js"]')) {
      appendScript('rizq_footer_toggle.js?v=' + ASSET_V, { defer: true });
    }
    if (!document.querySelector('script[src*="rizq_module_flags.js"]')) {
      appendScript('rizq_dynamic_nav.js?v=' + ASSET_V, { defer: true });
      appendScript('rizq_module_flags.js?v=' + ASSET_V, { defer: true });
    }
    if (isPublicShell() && !document.querySelector('script[src*="rizq_packages_ui.js"]')) {
      appendScript('rizq_packages_ui.js?v=' + ASSET_V, { defer: true });
    }
    if (!document.querySelector('link[rel="stylesheet"][href*="rizq_mobile.css"]')) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'rizq_mobile.css?v=' + ASSET_V;
      document.head.appendChild(css);
    }
    /* Assistant stack is heavy (~500KB+) — load on demand, not on every page boot */
    function loadAssistantStack(force) {
      if (window.__rizqAssistantLoaded) return;
      window.__rizqAssistantLoaded = true;
      appendScript('rizq_packages_config.js?v=' + ASSET_V, { defer: true });
      appendScript('rizq_agent.js?v=' + ASSET_V, { defer: true });
      appendScript('rizq_manager_agent_config.js?v=' + ASSET_V, { defer: true });
      appendScript('rizq_widget_embed.js?v=' + ASSET_V, { defer: true });
    }
    window.RizqLoadAssistant = loadAssistantStack;

    if (isPublicShell()) {
      appendScript('rizq_productivity.js?v=' + ASSET_V, { defer: true });
      var assistantSel = '#rizq-desk-assistant,#rizq-hdr-assistant,#nav-assistant-btn,#jump-assistant,#mbn-assistant,#rizq-chat-toggle';
      document.addEventListener('click', function (e) {
        if (e.target.closest(assistantSel)) loadAssistantStack(true);
      }, true);
      if ('requestIdleCallback' in window) {
        requestIdleCallback(function () { loadAssistantStack(false); }, { timeout: 12000 });
      } else {
        setTimeout(function () { loadAssistantStack(false); }, 8000);
      }
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

  /** Help / مساعدة → always open the public help center (دليل المساعد). */
  function goRizqHelp(e) {
    if (e) {
      try { e.preventDefault(); } catch (e0) {}
      try { e.stopPropagation(); } catch (e1) {}
    }
    try { location.assign('rizq_help.html'); } catch (e2) { location.href = 'rizq_help.html'; }
    return false;
  }
  window.goRizqHelp = goRizqHelp;

  function bindHelpRoutes() {
    var titleSel = [
      '#rzq-ft-help',
      '#ft-help',
      'h4[data-t="ft-help"]',
      'h4[data-t="footer-col-help"]',
      'h4[data-t-fr="AIDE"]',
      'h4[data-t-fr="Aide"]',
      '.rizq-help-title'
    ].join(',');
    document.querySelectorAll(titleSel).forEach(function (el) {
      if (el.getAttribute('data-rizq-help-bound')) return;
      el.setAttribute('data-rizq-help-bound', '1');
      el.style.cursor = 'pointer';
      el.setAttribute('role', 'link');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', goRizqHelp);
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          goRizqHelp(ev);
        }
      });
    });
    document.querySelectorAll('a[href="rizq_help.html"], a[href="./rizq_help.html"], a[href="/rizq_help.html"]').forEach(function (a) {
      if (a.getAttribute('data-rizq-help-bound')) return;
      a.setAttribute('data-rizq-help-bound', '1');
      a.addEventListener('click', function (ev) {
        goRizqHelp(ev);
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindHelpRoutes);
  else bindHelpRoutes();
  window.addEventListener('load', function () { setTimeout(bindHelpRoutes, 80); });

  window.RizqViewport = { isPhone: isPhoneViewport };

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

  if ('caches' in window) {
    try {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) {
          if (/^rizq-cache-v(1[0-3]|14\.)/.test(k)) caches.delete(k);
        });
      });
    } catch (eCache) {}
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      var host = location.hostname || '';
      var isLocal = !host || host === 'localhost' || host === '127.0.0.1';
      if (isLocal) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          regs.forEach(function (r) { r.unregister(); });
        }).catch(function () {});
        return;
      }
      navigator.serviceWorker.register('sw.js?v=19.6').catch(function (err) {
        console.warn('Rizq PWA: تعذّر تسجيل service worker', err);
      });
    });
  }
})();
