/**
 * rizq_site_banner.js — شريط الإشعار العلوي من إعدادات الموقع (site.banner*)
 * يُحمَّل على الصفحات العامة ويقرأ /api/site-config (وليس localStorage فقط).
 * يُثبَّت فوق النافبار الثابت حتى لا يُغطّى، ويدفع المحتوى للأسفل.
 */
(function (global) {
  'use strict';

  var BAR_ID = 'rizq-announce-bar';
  var STYLE_ID = 'rizq-announce-bar-style';
  var ROOT_CLASS = 'rizq-has-announce';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      'html.' + ROOT_CLASS + ' #' + BAR_ID + '{',
      '  position:fixed;top:0;left:0;right:0;z-index:100050;',
      '  background:linear-gradient(90deg,#C9A84C,#e8c96a);',
      '  color:#0f2347;font-size:13px;font-weight:700;text-align:center;',
      '  padding:10px 16px;line-height:1.5;',
      '  box-shadow:0 2px 10px rgba(15,35,65,.18);',
      '  font-family:Cairo,Tahoma,sans-serif;',
      '}',
      'html.' + ROOT_CLASS + '{--rizq-announce-h:42px}',
      'html.' + ROOT_CLASS + ' body{padding-top:var(--rizq-announce-h)!important}',
      'html.' + ROOT_CLASS + ' nav:not(.rizq-hdr-row2):not(.hero-biz-nav):not(.section-jump-bar):not(.mobile-bottom-nav):not(.rizq-reg-footer):not(.rizq-reg-chrome),',
      'html.' + ROOT_CLASS + ' nav.topnav,',
      'html.' + ROOT_CLASS + ' .topnav{',
      '  top:var(--rizq-announce-h)!important',
      '}',
      /* العناصر المثبتة تحت النافبار فقط تحتاج إزاحة إضافية */
      'html.' + ROOT_CLASS + ' #rizq-ads-preview-banner{',
      '  top:calc(70px + var(--rizq-announce-h))!important',
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

  function fetchAndApply() {
    var local = fromLocal();
    if (local.bannerActive && local.bannerText) applyBanner(local);

    var base = backendBase();
    if (!base) {
      /* قد يُحمَّل الملف قبل rizq_backend_config — أعد المحاولة بعد تهيئة الصفحة */
      setTimeout(function () {
        var b2 = backendBase();
        if (!b2) {
          applyBanner(local);
          return;
        }
        fetch(b2 + '/api/site-config')
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            var site = data && data.ok && data.config && data.config.site;
            if (site) applyBanner(site);
            else applyBanner(local);
          })
          .catch(function () { applyBanner(local); });
      }, 50);
      return;
    }

    fetch(base + '/api/site-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var site = data && data.ok && data.config && data.config.site;
        if (site) applyBanner(site);
        else applyBanner(local);
      })
      .catch(function () {
        applyBanner(local);
      });
  }

  global.RizqSiteBanner = { apply: applyBanner, fetchAndApply: fetchAndApply };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndApply);
  } else {
    fetchAndApply();
  }
})(window);
