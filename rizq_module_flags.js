/**
 * rizq_module_flags.js — إخفاء أقسام ما قبل الإطلاق (محلات/مكاتب/…) على كل الصفحات
 */
(function (global) {
  'use strict';

  var NAV_HREF = {
    store: 'rizq_store.html',
    office: 'rizq_office.html',
    corp: 'rizq_showroom.html',
    tenders: 'rizq_tenders.html'
  };
  var HDR_KEY = { store: 'stores', office: 'offices', corp: 'showrooms', tenders: 'tenders' };
  var SECTION_MAP = {
    store: 'virtual-stores',
    office: 'virtual-offices',
    corp: 'virtual-showrooms',
    tenders: 'virtual-tenders'
  };

  function hideLink(a) {
    if (!a) return;
    var li = a.closest('li');
    var item = a.closest('.nav-dd-item');
    if (li && li.closest('.nav-more-menu, .rizq-hdr-more-menu, .mobile-drawer, .nav-center')) {
      li.style.display = 'none';
    } else if (item) {
      item.style.display = 'none';
    } else {
      a.style.display = 'none';
    }
  }

  var _lastFlags = null;

  function apply(flags) {
    if (!flags || typeof flags !== 'object') return;
    _lastFlags = flags;

    Object.keys(NAV_HREF).forEach(function (key) {
      if (flags[key] !== false) return;
      var href = NAV_HREF[key];
      document.querySelectorAll('a[href="' + href + '"], a[href="' + href + '#"]').forEach(hideLink);
      var hdr = HDR_KEY[key];
      if (hdr) {
        document.querySelectorAll('[data-hdr="' + hdr + '"]').forEach(function (el) {
          hideLink(el.closest('a') || el.closest('li') || el);
        });
      }
    });

    Object.keys(SECTION_MAP).forEach(function (key) {
      if (flags[key] !== false) return;
      var sec = document.getElementById(SECTION_MAP[key]);
      if (sec) sec.style.display = 'none';
    });

    if (flags.store === false && flags.office === false && flags.corp === false) {
      document.querySelectorAll('.hero-biz-nav').forEach(function (el) {
        el.style.display = 'none';
      });
    }

    /* قبل الإطلاق: إخفاء «المزيد» طالما المحلات والمكاتب مغلقتان */
    if (flags.store === false && flags.office === false) {
      ['#nav-more-li', '#rizq-desk-more-li', '#rizq-hdr-more-wrap'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) el.style.display = 'none';
      });
    }
  }

  function fetchAndApply() {
    if (!global.RIZQ_BACKEND_BASE) return;
    fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/site-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var flags = data && data.ok && data.config && data.config.moduleFlags;
        apply(flags);
      })
      .catch(function () { /* offline — defaults from server not available */ });
  }

  global.RizqModuleFlags = { apply: apply, fetchAndApply: fetchAndApply, reapply: function () {
    if (_lastFlags) apply(_lastFlags);
    else fetchAndApply();
  } };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndApply);
  } else {
    fetchAndApply();
  }
})(window);
