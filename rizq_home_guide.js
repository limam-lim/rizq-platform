/**
 * دليل رزق — شريط أزرار تحت أحدث الإعلانات.
 * يعيد استخدام buildStyleIdeas / buildShowroomModels / buildEstateModels / renderStrip
 * بلا cloneNode. تبديل تلقائي كل 30 ثانية ما لم يلمس الزائر أو يفعّل تقليل الحركة.
 */
(function (global) {
  'use strict';

  var PANES = ['styles', 'showrooms', 'estate', 'offices'];
  var ROTATE_MS = 30000;
  var _pane = 'styles';
  var _timer = null;
  var _paused = false;
  var _avail = { styles: true, showrooms: false, estate: true, offices: false };
  var _maxH = 0;
  var _loaded = { styles: false, showrooms: false, estate: false, offices: false };

  function $(id) { return document.getElementById(id); }

  function reducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {
      return false;
    }
  }

  function moduleOpen(key) {
    try {
      var btn = document.querySelector('.hero-biz-btn[data-rizq-module="' + key + '"]');
      if (btn) {
        if (btn.classList.contains('rizq-module-soon') || btn.getAttribute('aria-disabled') === 'true') return false;
        if (btn.hasAttribute('hidden')) return false;
        return true;
      }
      var nav = document.querySelector('[data-rizq-module="' + key + '"]');
      if (nav && nav.classList.contains('rizq-module-soon')) return false;
    } catch (e) { /* */ }
    /* افتراضي الإطلاق: المعارض والمكاتب مغلقة */
    if (key === 'corp' || key === 'office') return false;
    return true;
  }

  function syncTabVisibility() {
    var map = {
      styles: true,
      showrooms: moduleOpen('corp'),
      estate: moduleOpen('estate'),
      offices: moduleOpen('office')
    };
    PANES.forEach(function (p) {
      var btn = $('guide-tab-' + (p === 'showrooms' ? 'showrooms' : p === 'offices' ? 'offices' : p === 'estate' ? 'estate' : 'styles'));
      if (!btn) return;
      var open = map[p];
      var filled = _avail[p] !== false;
      var show = open && (p === 'styles' || p === 'estate' || filled || !_loaded[p]);
      if (p === 'showrooms' || p === 'offices') {
        show = open && (_avail[p] || !_loaded[p]);
        if (_loaded[p] && !_avail[p]) show = false;
        if (!open) show = false;
      }
      btn.hidden = !show;
      if (!show && btn.classList.contains('is-active')) {
        /* سينتقل showPane لأول تبويب ظاهر */
      }
    });
  }

  function visiblePanes() {
    syncTabVisibility();
    return PANES.filter(function (p) {
      var btn = document.querySelector('.rizq-guide-tabs [data-guide-pane="' + p + '"]');
      return btn && !btn.hidden;
    });
  }

  function lockStageHeight() {
    var stage = $('rizq-guide-stage');
    if (!stage) return;
    var h = Math.ceil(stage.getBoundingClientRect().height || 0);
    if (h > _maxH) {
      _maxH = h;
      try {
        stage.style.setProperty('--rizq-guide-stage-h', _maxH + 'px');
        stage.style.minHeight = _maxH + 'px';
      } catch (e) { /* */ }
    }
  }

  function setActiveTab(pane) {
    document.querySelectorAll('.rizq-guide-tabs [data-guide-pane]').forEach(function (btn) {
      var on = btn.getAttribute('data-guide-pane') === pane;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var root = $('rizq-guide');
    if (root) root.setAttribute('data-guide-pane', pane);
  }

  function showPane(pane, fromUser) {
    var list = visiblePanes();
    if (list.indexOf(pane) < 0) pane = list[0] || 'styles';
    _pane = pane;
    setActiveTab(pane);

    var stylesWrap = $('rizq-guide-styles-wrap');
    var officeWrap = $('rizq-guide-office-wrap');
    if (pane === 'offices') {
      if (stylesWrap) stylesWrap.hidden = true;
      if (officeWrap) officeWrap.hidden = false;
      if (typeof global.RizqDiscRenderStrip === 'function') {
        try { global.RizqDiscRenderStrip('rizq-guide-disc-office', 'office'); } catch (eO) { /* */ }
      }
      var go = $('rizq-guide-disc-office');
      _loaded.offices = true;
      _avail.offices = !!(go && go.innerHTML && go.innerHTML.replace(/\s/g, '').length > 40);
    } else {
      if (stylesWrap) stylesWrap.hidden = false;
      if (officeWrap) officeWrap.hidden = true;
      try {
        if (pane === 'styles' && typeof global.buildStyleIdeas === 'function') {
          global.buildStyleIdeas(false, 'rizq-guide-rail');
        } else if (pane === 'showrooms' && typeof global.buildShowroomModels === 'function') {
          global.buildShowroomModels(false, 'rizq-guide-rail');
        } else if (pane === 'estate' && typeof global.buildEstateModels === 'function') {
          global.buildEstateModels(false, 'rizq-guide-rail');
        }
      } catch (eB) { /* */ }
      _loaded[pane] = true;
      var rail = $('rizq-guide-rail');
      _avail[pane] = !!(rail && !rail.classList.contains('is-empty') && rail.querySelector('.rizq-style-card, .rizq-est-card'));
    }

    syncTabVisibility();
    requestAnimationFrame(function () {
      lockStageHeight();
      var rail = $('rizq-guide-rail');
      if (rail && typeof global.syncMarqueeShift === 'function' && pane !== 'offices') {
        try { global.syncMarqueeShift(rail); } catch (eS) { /* */ }
      }
    });

    if (fromUser) pauseRotate();
    else scheduleRotate();
  }

  function nextPane() {
    var list = visiblePanes();
    if (list.length < 2) return;
    var i = list.indexOf(_pane);
    showPane(list[(i + 1) % list.length], false);
  }

  function scheduleRotate() {
    clearTimeout(_timer);
    _timer = null;
    if (_paused || reducedMotion()) return;
    var list = visiblePanes();
    if (list.length < 2) return;
    _timer = setTimeout(function () {
      if (_paused || reducedMotion()) return;
      nextPane();
    }, ROTATE_MS);
  }

  function pauseRotate() {
    _paused = true;
    clearTimeout(_timer);
    _timer = null;
  }

  function notify(pane, hasContent) {
    if (!pane) return;
    _avail[pane] = !!hasContent;
    _loaded[pane] = true;
    syncTabVisibility();
    var list = visiblePanes();
    if (list.indexOf(_pane) < 0 && list.length) showPane(list[0], false);
  }

  function bind() {
    var root = $('rizq-guide');
    if (!root || root.getAttribute('data-guide-bound') === '1') return;
    root.setAttribute('data-guide-bound', '1');

    document.querySelectorAll('.rizq-guide-tabs [data-guide-pane]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showPane(btn.getAttribute('data-guide-pane') || 'styles', true);
      });
    });

    ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) {
      root.addEventListener(ev, function () { pauseRotate(); }, { passive: true });
    });

    syncTabVisibility();
    showPane('styles', false);

    /* إعادة ملء بعد اكتمال هيدرات الكتالوج */
    setTimeout(function () {
      if (!_paused) showPane(_pane, false);
    }, 1800);
  }

  global.RizqGuideNotify = notify;
  global.RizqGuideShow = showPane;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})(typeof window !== 'undefined' ? window : this);
