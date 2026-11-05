/**
 * rizq_engagement_beacon.js — إشارات ظهور/نقر للمحلات (رئيسية + دليل رزق)
 * بلا واجهة؛ يرسل للخادم /api/track-engagement مع منع تضخيم هناك.
 */
(function (global) {
  'use strict';
  if (global.__rizqEngagementBeacon) return;
  global.__rizqEngagementBeacon = 1;

  var SEEN = Object.create(null);

  function backendBase() {
    try {
      if (global.RIZQ_BACKEND_BASE) return String(global.RIZQ_BACKEND_BASE).replace(/\/$/, '');
    } catch (e) { /* */ }
    return '';
  }

  function post(kind, accountId, surface) {
    var id = String(accountId || '').trim();
    if (!id || id.indexOf('demo') === 0) return;
    var key = kind + '|' + id + '|' + String(surface || 'home');
    if (SEEN[key]) return;
    SEEN[key] = 1;
    var base = backendBase();
    if (!base) return;
    var body = JSON.stringify({
      accountId: id.slice(0, 40),
      kind: kind,
      surface: surface || 'home',
    });
    try {
      if (global.navigator && typeof global.navigator.sendBeacon === 'function') {
        var blob = new Blob([body], { type: 'application/json' });
        global.navigator.sendBeacon(base + '/api/track-engagement', blob);
        return;
      }
    } catch (eB) { /* */ }
    try {
      fetch(base + '/api/track-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        credentials: 'omit',
        keepalive: true,
      }).catch(function () {});
    } catch (eF) { /* */ }
  }

  function accountIdFromEl(el) {
    if (!el || !el.getAttribute) return '';
    return (
      el.getAttribute('data-account-id')
      || el.getAttribute('data-store-id')
      || el.getAttribute('data-rizq-account')
      || ''
    );
  }

  function observeImpressions(root, surface) {
    var scope = root || document;
    if (!scope || !scope.querySelectorAll) return;
    var nodes = scope.querySelectorAll('[data-account-id], [data-store-id], [data-rizq-account]');
    if (!nodes.length || typeof IntersectionObserver !== 'function') {
      Array.prototype.forEach.call(nodes, function (el) {
        var id = accountIdFromEl(el);
        if (id) post('impression', id, surface);
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = accountIdFromEl(en.target);
        if (id) post('impression', id, surface);
        try { io.unobserve(en.target); } catch (eU) { /* */ }
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(nodes, function (el) { io.observe(el); });
  }

  function bindClicks(root, surface) {
    var scope = root || document;
    if (!scope || !scope.addEventListener) return;
    scope.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var el = t.closest('[data-account-id], [data-store-id], [data-rizq-account], a[href*="rizq_store.html"]');
      if (!el) return;
      var id = accountIdFromEl(el);
      if (!id && el.getAttribute) {
        var href = el.getAttribute('href') || '';
        var m = href.match(/[?&]id=([^&]+)/);
        if (m) id = decodeURIComponent(m[1]);
      }
      if (id) post('click', id, surface);
    }, true);
  }

  function bootSurface(sel, surface) {
    var root = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!root) return;
    observeImpressions(root, surface);
    bindClicks(root, surface);
  }

  function boot() {
    bootSurface('#listings, #hero-listings, .listings-section', 'home');
    bootSurface('#rizq-guide, #rizq-styles, #virtual-stores', 'guide');
  }

  global.RizqEngagement = {
    impression: function (accountId, surface) { post('impression', accountId, surface); },
    click: function (accountId, surface) { post('click', accountId, surface); },
    boot: boot,
    observe: observeImpressions,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 800); });
  } else {
    setTimeout(boot, 800);
  }
})(typeof window !== 'undefined' ? window : this);
