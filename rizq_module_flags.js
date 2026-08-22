/**
 * rizq_module_flags.js — إخفاء أقسام ما قبل الإطلاق + تنقل ديناميكي
 */
(function (global) {
  'use strict';

  var _lastFlags = null;

  function apply(flags) {
    if (!flags || typeof flags !== 'object') return;
    _lastFlags = flags;
    if (global.RizqDynamicNav && typeof global.RizqDynamicNav.apply === 'function') {
      global.RizqDynamicNav.apply(flags);
      return;
    }
    /* fallback if dynamic nav not loaded yet */
    var NAV_HREF = { store: 'rizq_store.html', office: 'rizq_office.html', corp: 'rizq_showroom.html', tenders: 'rizq_tenders.html' };
    Object.keys(NAV_HREF).forEach(function (key) {
      if (flags[key] !== false) return;
      document.querySelectorAll('a[href="' + NAV_HREF[key] + '"]').forEach(function (a) {
        var li = a.closest('li');
        if (li) li.style.display = 'none'; else a.style.display = 'none';
      });
    });
  }

  function fetchAndApply() {
    if (!global.RIZQ_BACKEND_BASE) return;
    fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/site-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var flags = data && data.ok && data.config && data.config.moduleFlags;
        apply(flags);
      })
      .catch(function () { /* offline */ });
  }

  global.RizqModuleFlags = {
    apply: apply,
    fetchAndApply: fetchAndApply,
    reapply: function () {
      if (_lastFlags) apply(_lastFlags);
      else fetchAndApply();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndApply);
  } else {
    fetchAndApply();
  }
})(window);
