/**
 * rizq_site_banner.js — شريط الإشعار العلوي من إعدادات الموقع (site.banner*)
 * يُحمَّل على الصفحات العامة ويقرأ /api/site-config (وليس localStorage فقط).
 * يُثبَّت فوق النافبار الثابت ويدفع #nav / #rizq-desk-nav للأسفل.
 */
(function (global) {
  'use strict';

  var BAR_ID = 'rizq-announce-bar';
  var STYLE_ID = 'rizq-announce-bar-style';
  var ROOT_CLASS = 'rizq-has-announce';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      'html.' + ROOT_CLASS + '{--rizq-announce-h:42px}',
      'html.' + ROOT_CLASS + ' #' + BAR_ID + '{',
      '  position:fixed!important;top:0!important;left:0!important;right:0!important;',
      '  z-index:100050!important;',
      '  background:linear-gradient(90deg,#C9A84C,#e8c96a)!important;',
      '  color:#0f2347!important;font-size:13px!important;font-weight:700!important;',
      '  text-align:center!important;padding:10px 16px!important;line-height:1.5!important;',
      '  box-shadow:0 2px 10px rgba(15,35,65,.18)!important;',
      '  font-family:Cairo,Tahoma,sans-serif!important;display:block!important;',
      '}',
      'html.' + ROOT_CLASS + ' body{padding-top:calc(var(--rizq-header-h,70px) + var(--rizq-announce-h) + var(--rizq-ticker-h,0px))!important}',
      /* النافبار يستخدم inset:0 — يجب إعادة ضبط inset مع top */
      'html.' + ROOT_CLASS + ' #nav,',
      'html.' + ROOT_CLASS + ' #rizq-desk-nav,',
      'html.' + ROOT_CLASS + ' nav.topnav,',
      'html.' + ROOT_CLASS + ' .topnav{',
      '  top:var(--rizq-announce-h)!important;',
      '  inset:var(--rizq-announce-h) 0 auto 0!important',
      '}',
      'html.' + ROOT_CLASS + ' .ticker-wrap:not(.is-empty){',
      '  top:calc(var(--rizq-header-h,70px) + var(--rizq-announce-h))!important',
      '}',
      'html.' + ROOT_CLASS + ' .section-jump-bar{',
      '  top:calc(var(--rizq-header-h,70px) + var(--rizq-announce-h) + var(--rizq-ticker-h,0px))!important',
      '}',
      'html.' + ROOT_CLASS + ' #rizq-ads-preview-banner{',
      '  top:calc(var(--rizq-header-h,70px) + var(--rizq-announce-h))!important',
      '}'
    ].join('');
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function measureAndApplyHeight(bar) {
    if (!bar) return;
    var h = Math.max(36, Math.round(bar.getBoundingClientRect().height || 42));
    try {
      document.documentElement.style.setProperty('--rizq-announce-h', h + 'px');
    } catch (e) {}
  }

  function applyBanner(cfg) {
    var existing = document.getElementById(BAR_ID);
    if (existing) existing.remove();
    try {
      document.documentElement.classList.remove(ROOT_CLASS);
      document.documentElement.style.removeProperty('--rizq-announce-h');
    } catch (e) {}

    if (!cfg || !cfg.bannerActive) return;
    var text = String(cfg.bannerText || '').trim();
    if (!text) return;

    ensureStyle();
    var bar = document.createElement('div');
    bar.id = BAR_ID;
    bar.setAttribute('role', 'status');
    bar.textContent = text;
    var body = document.body;
    if (!body) return;
    body.insertBefore(bar, body.firstChild);
    document.documentElement.classList.add(ROOT_CLASS);
    measureAndApplyHeight(bar);
    if (typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(function () { measureAndApplyHeight(bar); });
    }

    try {
      localStorage.setItem('rizq_site_config', JSON.stringify(Object.assign(
        {},
        JSON.parse(localStorage.getItem('rizq_site_config') || '{}') || {},
        {
          bannerActive: !!cfg.bannerActive,
          bannerText: text,
          sitename: cfg.sitename,
          tagline: cfg.tagline
        }
      )));
    } catch (e) {}
  }

  function fromLocal() {
    try {
      return JSON.parse(localStorage.getItem('rizq_site_config') || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function backendBase() {
    try {
      return String(global.RIZQ_BACKEND_BASE || '').replace(/\/$/, '');
    } catch (e) {
      return '';
    }
  }

  function fetchFromBase(base, local) {
    fetch(base + '/api/site-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var site = data && data.ok && data.config && data.config.site;
        if (site) applyBanner(site);
        else applyBanner(local);
      })
      .catch(function () { applyBanner(local); });
  }

  function fetchAndApply() {
    var local = fromLocal();
    if (local.bannerActive && local.bannerText) applyBanner(local);

    var base = backendBase();
    if (!base) {
      setTimeout(function () {
        var b2 = backendBase();
        if (!b2) {
          applyBanner(local);
          return;
        }
        fetchFromBase(b2, local);
      }, 50);
      return;
    }
    fetchFromBase(base, local);
  }

  global.RizqSiteBanner = { apply: applyBanner, fetchAndApply: fetchAndApply };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndApply);
  } else {
    fetchAndApply();
  }
})(window);
