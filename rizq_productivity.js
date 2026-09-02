/**
 * rizq_productivity.js — تحسينات إنتاجية خفية (بدون تغيير الهوية البصرية)
 * بحث أسرع، تذكّر الفلاتر، مسودة نشر، prefetch، اختصارات لوحة المفاتيح
 */
(function (global) {
  'use strict';

  var RECENT_SEARCH_KEY = 'rizq_recent_searches';
  var BROWSE_FILTERS_KEY = 'rizq_browse_filters';
  var POST_DRAFT_KEY = 'rizq_post_draft';
  var MAX_RECENT = 8;

  function lang() {
    try {
      return (global.RizqI18n && global.RizqI18n.getLang && global.RizqI18n.getLang() === 'fr') || localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar';
    } catch (e) { return 'ar'; }
  }
  function t(ar, fr) { return lang() === 'fr' ? fr : ar; }

  function saveData(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function loadData(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || 'null');
      return v == null ? fallback : v;
    } catch (e2) { return fallback; }
  }

  /* ── بحثات أخيرة ── */
  function rememberSearch(q) {
    q = String(q || '').trim();
    if (!q || q.length < 2) return;
    var list = loadData(RECENT_SEARCH_KEY, []);
    list = list.filter(function (x) { return x !== q; });
    list.unshift(q);
    if (list.length > MAX_RECENT) list.length = MAX_RECENT;
    saveData(RECENT_SEARCH_KEY, list);
  }

  function recentSearches() {
    return loadData(RECENT_SEARCH_KEY, []);
  }

  function bindSearchMemory() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing) return;
      var el = e.target;
      if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
      var id = el.id || '';
      var ph = (el.getAttribute('placeholder') || '').toLowerCase();
      if (/search|بحث|recherche/i.test(id + ' ' + ph + ' ' + (el.className || ''))) {
        rememberSearch(el.value);
      }
    }, true);

    if (typeof global.doSearch === 'function' && !global.doSearch._rizqProd) {
      var origSearch = global.doSearch;
      global.doSearch = function () {
        var inp = document.getElementById('nav-search-input') || document.querySelector('[data-rizq-search]');
        if (inp) rememberSearch(inp.value);
        return origSearch.apply(this, arguments);
      };
      global.doSearch._rizqProd = true;
    }
    if (typeof global.doMainSearch === 'function' && !global.doMainSearch._rizqProd) {
      var origMain = global.doMainSearch;
      global.doMainSearch = function () {
        var inp = document.getElementById('hero-search') || document.querySelector('.hero-search input');
        if (inp) rememberSearch(inp.value);
        return origMain.apply(this, arguments);
      };
      global.doMainSearch._rizqProd = true;
    }
  }

  function injectRecentSearchHints() {
    document.querySelectorAll('#nav-search-input, #hero-search, [data-rizq-search]').forEach(function (inp) {
      if (inp._rizqRecentBound) return;
      inp._rizqRecentBound = true;
      var box;
      inp.addEventListener('focus', function () {
        var recent = recentSearches();
        if (!recent.length || (inp.value || '').trim().length > 0) return;
        if (!box) {
          box = document.createElement('div');
          box.className = 'rizq-sugg-box search-suggestions';
          box.style.display = 'none';
          var wrap = inp.closest('.nav-sticky-search-wrap, .nav-search, .search-bar, .rizq-sugg-host') || inp.parentElement;
          if (wrap) {
            if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
            wrap.appendChild(box);
          }
        }
        box.innerHTML = '<div class="sugg-item sugg-empty" style="cursor:default;font-size:11px;opacity:.75">' +
          (t('بحثت مؤخراً:', 'Recherches récentes :')) + '</div>' +
          recent.slice(0, 5).map(function (q) {
            return '<div class="sugg-item" role="option" data-q="' + q.replace(/"/g, '&quot;') + '">' +
              '<span class="sugg-icon">🕐</span><span class="sugg-title">' + q + '</span></div>';
          }).join('');
        box.style.display = 'block';
        box.querySelectorAll('.sugg-item[data-q]').forEach(function (item) {
          item.addEventListener('mousedown', function (ev) {
            ev.preventDefault();
            inp.value = item.getAttribute('data-q') || '';
            box.style.display = 'none';
            if (typeof global.doSearch === 'function') global.doSearch();
            else if (typeof global.doMainSearch === 'function') global.doMainSearch();
            else inp.form && inp.form.submit();
          });
        });
      });
      inp.addEventListener('blur', function () {
        if (box) setTimeout(function () { box.style.display = 'none'; }, 160);
      });
    });
  }

  /* ── فلاتر التصفح ── */
  function saveBrowseFilters() {
    if (!/browse\.html/i.test(location.pathname || '')) return;
    var catR = document.querySelector('input[name="rcat"]:checked');
    var priceR = document.querySelector('input[name="rprice"]:checked');
    var condR = document.querySelector('input[name="rcond"]:checked');
    saveData(BROWSE_FILTERS_KEY, {
      wilaya: (document.getElementById('wilaya-select') || {}).value || '',
      sort: (document.getElementById('sort-select') || {}).value || '',
      navCat: (document.getElementById('nav-cat-select') || {}).value || '',
      cat: catR ? catR.value : '',
      price: priceR ? priceR.value : '',
      cond: condR ? condR.value : '',
      verified: !!(document.getElementById('cb-verified') && document.getElementById('cb-verified').checked),
      pinned: !!(document.getElementById('cb-pinned') && document.getElementById('cb-pinned').checked)
    });
  }

  function restoreBrowseFilters() {
    if (!/browse\.html/i.test(location.pathname || '')) return;
    var saved = loadData(BROWSE_FILTERS_KEY, null);
    if (!saved || location.search) return;
    function setVal(id, v) { var el = document.getElementById(id); if (el && v) el.value = v; }
    function checkRadio(name, v) {
      if (!v) return;
      var r = document.querySelector('input[name="' + name + '"][value="' + v + '"]');
      if (r) r.checked = true;
    }
    setVal('wilaya-select', saved.wilaya);
    setVal('sort-select', saved.sort);
    setVal('nav-cat-select', saved.navCat);
    checkRadio('rcat', saved.cat);
    checkRadio('rprice', saved.price);
    checkRadio('rcond', saved.cond);
    var cv = document.getElementById('cb-verified');
    var cp = document.getElementById('cb-pinned');
    if (cv) cv.checked = !!saved.verified;
    if (cp) cp.checked = !!saved.pinned;
    if (typeof global.applyFilters === 'function') global.applyFilters();
  }

  function wrapApplyFilters() {
    if (typeof global.applyFilters !== 'function' || global.applyFilters._rizqProd) return;
    var orig = global.applyFilters;
    global.applyFilters = function () {
      var r = orig.apply(this, arguments);
      saveBrowseFilters();
      return r;
    };
    global.applyFilters._rizqProd = true;
  }

  /* ── مسودة نشر إعلان ── */
  function bindPostDraft() {
    if (!/post\.html/i.test(location.pathname || '')) return;
    var fields = ['ad-title', 'ad-desc', 'ad-title-fr', 'ad-desc-fr', 'ad-price', 'ad-loc'];
    var draft = loadData(POST_DRAFT_KEY, null);
    if (draft && draft.savedAt && (Date.now() - draft.savedAt) < 7 * 86400000) {
      fields.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && draft[id] && !el.value) el.value = draft[id];
      });
      if (draft.ad-title || draft['ad-desc']) {
        var toast = global.RizqUx && global.RizqUx.showToast ? global.RizqUx.showToast : global.showToast;
        if (typeof toast === 'function') {
          setTimeout(function () {
            toast(t('📝 استُعيدت مسودة إعلانك', '📝 Brouillon d\'annonce restauré'));
          }, 600);
        }
      }
    }
    var saveDraft = function () {
      var d = { savedAt: Date.now() };
      fields.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.value) d[id] = el.value;
      });
      if (d['ad-title'] || d['ad-desc']) saveData(POST_DRAFT_KEY, d);
    };
    fields.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () {
        clearTimeout(el._rizqDraftT);
        el._rizqDraftT = setTimeout(saveDraft, 800);
      });
    });
    document.addEventListener('rizq:ad-published', function () {
      try { localStorage.removeItem(POST_DRAFT_KEY); } catch (e) {}
    });
  }

  /* ── Prefetch + preconnect ── */
  function shouldPrefetch() {
    try {
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (c && (c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g')) return false;
    } catch (e) {}
    return true;
  }

  var prefetched = {};
  function prefetchUrl(href) {
    if (!shouldPrefetch() || !href || prefetched[href]) return;
    if (!/^rizq_|\.html/.test(href)) return;
    prefetched[href] = true;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }

  function bindPrefetch() {
    var targets = ['rizq_browse.html', 'rizq_post.html', 'rizq_search.html', 'rizq_listing.html'];
    document.addEventListener('mouseover', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      targets.forEach(function (p) {
        if ((a.getAttribute('href') || '').indexOf(p) >= 0) prefetchUrl(a.href);
      });
    }, { passive: true });
    if (shouldPrefetch()) {
      requestIdleCallback ? requestIdleCallback(function () {
        prefetchUrl('rizq_browse.html');
      }) : setTimeout(function () { prefetchUrl('rizq_browse.html'); }, 3000);
    }
    try {
      var base = global.RIZQ_BACKEND_BASE;
      if (base) {
        var origin = base.replace(/\/$/, '');
        if (!document.querySelector('link[rel="preconnect"][href="' + origin + '"]')) {
          var pc = document.createElement('link');
          pc.rel = 'preconnect';
          pc.href = origin;
          pc.crossOrigin = 'anonymous';
          document.head.appendChild(pc);
        }
      }
    } catch (e2) {}
  }

  /* ── اختصار / للبحث ── */
  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      e.preventDefault();
      var inp = document.getElementById('nav-search-input') || document.getElementById('hero-search') || document.querySelector('[data-rizq-search]');
      if (inp) { inp.focus(); inp.select && inp.select(); }
    });
  }

  function boot() {
    bindSearchMemory();
    injectRecentSearchHints();
    wrapApplyFilters();
    setTimeout(restoreBrowseFilters, 400);
    bindPostDraft();
    bindPrefetch();
    bindKeyboardShortcuts();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.RizqProductivity = {
    rememberSearch: rememberSearch,
    recentSearches: recentSearches,
    saveBrowseFilters: saveBrowseFilters,
    restoreBrowseFilters: restoreBrowseFilters,
    clearPostDraft: function () { try { localStorage.removeItem(POST_DRAFT_KEY); } catch (e) {} }
  };
})(typeof window !== 'undefined' ? window : this);
