/**
 * Rizq Guide — live strip + full filters from section builders.
 * No cloneNode. Auto-rotate every 30s. Guide filters independent of originals.
 * UI copy comes from LANG / RizqI18n only (no hardcoded AR/FR UI strings).
 */
(function (global) {
  'use strict';

  var PANES = ['styles', 'showrooms', 'estate', 'offices'];
  var ROTATE_MS = 30000;
  var TOPIC_KEYS = {
    styles: 'guide-topic-styles',
    showrooms: 'guide-topic-showrooms',
    estate: 'guide-topic-estate',
    offices: 'guide-topic-offices'
  };

  var _pane = 'styles';
  var _timer = null;
  var _paused = false;
  var _avail = { styles: true, showrooms: false, estate: true, offices: false };
  var _maxH = 0;
  var _loaded = { styles: false, showrooms: false, estate: false, offices: false };
  var _guideGender = 'men';
  var _guideSrmCat = 'cars';
  var _guideEstCat = 'all';

  function $(id) { return document.getElementById(id); }

  function isFr() {
    try {
      if (typeof global.isAr !== 'undefined') return !global.isAr;
      if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') {
        return global.RizqI18n.getLang() === 'fr';
      }
      return (localStorage.getItem('rizq_lang') || 'ar') === 'fr';
    } catch (e) {
      return false;
    }
  }

  function t(key) {
    if (!key) return '';
    try {
      if (global.RizqI18n && typeof global.RizqI18n.t === 'function') {
        var via = global.RizqI18n.t(key);
        if (via) return via;
      }
    } catch (eT) { /* */ }
    var lang = isFr() ? 'fr' : 'ar';
    var pack = (global.LANG && global.LANG[lang]) || {};
    return pack[key] || '';
  }

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
    if (key === 'corp' || key === 'office') return false;
    return true;
  }

  function updateLiveLabel(pane) {
    var topicKey = TOPIC_KEYS[pane] || TOPIC_KEYS.styles;
    var topic = t(topicKey);
    var topicEl = $('rizq-guide-topic');
    var subEl = $('rizq-guide-live-sub');
    var liveTxt = document.querySelector('#rizq-guide-live .live-capsule-txt');
    if (liveTxt) {
      liveTxt.setAttribute('data-t', 'guide-live');
      liveTxt.textContent = t('guide-live');
    }
    if (topicEl) {
      topicEl.setAttribute('data-t', topicKey);
      topicEl.textContent = topic;
    }
    if (subEl) {
      var inWord = t('guide-in');
      subEl.innerHTML = '<span data-t="guide-in">' + String(inWord).replace(/</g, '&lt;') +
        '</span> <strong class="rizq-guide-topic" id="rizq-guide-topic" data-t="' + topicKey + '">' +
        String(topic).replace(/</g, '&lt;') + '</strong>';
    }
  }

  function syncTabVisibility() {
    var map = {
      styles: true,
      showrooms: moduleOpen('corp'),
      estate: moduleOpen('estate'),
      offices: moduleOpen('office')
    };
    PANES.forEach(function (p) {
      var btn = document.querySelector('.rizq-guide-tabs [data-guide-pane="' + p + '"]');
      if (!btn) return;
      var open = map[p];
      var show;
      if (p === 'styles' || p === 'estate') {
        show = open;
      } else {
        show = open && (_avail[p] || !_loaded[p]);
        if (_loaded[p] && !_avail[p]) show = false;
        if (!open) show = false;
      }
      btn.hidden = !show;
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
    document.querySelectorAll('.rizq-guide-pane[data-guide-pane-body]').forEach(function (el) {
      el.hidden = el.getAttribute('data-guide-pane-body') !== pane;
    });
  }

  function paneHasCards(pane) {
    if (pane === 'offices') {
      var go = $('rizq-guide-disc-office');
      return !!(go && go.querySelector('.rzq-disc-card, .rzq-disc-strip .rzq-disc-card'));
    }
    var rail = $('rizq-guide-rail-' + pane);
    if (!rail) return false;
    if (rail.classList.contains('is-empty')) return false;
    return !!rail.querySelector('.rizq-style-card, .rizq-est-card, .rizq-style-tile, .rizq-est-hero');
  }

  function fillBrand(pane) {
    try {
      if (pane === 'styles' && typeof global._fillLandingBrandStrip === 'function') {
        var stylesAria = t('guide-brand-styles-aria');
        global._fillLandingBrandStrip('rizq-guide-styles-brand-strip', 'أزياء', stylesAria, stylesAria);
      } else if (pane === 'showrooms' && typeof global._fillLandingBrandStrip === 'function') {
        var cat = _guideSrmCat || 'cars';
        var brandCat = typeof global._landingBrandCatForSrm === 'function'
          ? global._landingBrandCatForSrm(cat)
          : (cat === 'electronics' ? 'إلكترونيات' : 'سيارات');
        var srmAria = t('guide-brand-srm-aria');
        global._fillLandingBrandStrip('rizq-guide-srm-brand-strip', brandCat, srmAria, srmAria);
      }
    } catch (eB) { /* */ }
  }

  function fillPane(pane) {
    try {
      if (pane === 'styles' && typeof global.buildStyleIdeas === 'function') {
        global.buildStyleIdeas(false, 'rizq-guide-rail-styles', _guideGender);
      } else if (pane === 'showrooms' && typeof global.buildShowroomModels === 'function') {
        global.buildShowroomModels(false, 'rizq-guide-rail-showrooms', _guideSrmCat);
      } else if (pane === 'estate' && typeof global.buildEstateModels === 'function') {
        global.buildEstateModels(false, 'rizq-guide-rail-estate', _guideEstCat);
      } else if (pane === 'offices') {
        if (typeof global.RizqDiscRenderStrip === 'function') {
          global.RizqDiscRenderStrip('rizq-guide-disc-office', 'office');
        } else if (typeof global.renderStrip === 'function') {
          global.renderStrip('rizq-guide-disc-office', 'office');
        }
      }
    } catch (eFill) { /* */ }
    fillBrand(pane);
    _loaded[pane] = true;
    _avail[pane] = paneHasCards(pane);
  }

  function showPane(pane, fromUser) {
    var list = visiblePanes();
    if (list.indexOf(pane) < 0) pane = list[0] || 'styles';
    _pane = pane;
    setActiveTab(pane);
    updateLiveLabel(pane);
    fillPane(pane);

    syncTabVisibility();
    requestAnimationFrame(function () {
      lockStageHeight();
      var rail = $('rizq-guide-rail-' + pane);
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

  function setGuideGender(gender) {
    if (!gender) gender = 'men';
    _guideGender = gender;
    document.querySelectorAll('#rizq-guide-sty-tabs [data-guide-sty-gender]').forEach(function (btn) {
      var on = btn.getAttribute('data-guide-sty-gender') === gender;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (_pane === 'styles') fillPane('styles');
    pauseRotate();
  }

  function setGuideSrmCat(cat) {
    if (!cat) cat = 'cars';
    _guideSrmCat = cat;
    document.querySelectorAll('#rizq-guide-srm-tabs [data-guide-srm-cat]').forEach(function (btn) {
      var on = btn.getAttribute('data-guide-srm-cat') === cat;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (_pane === 'showrooms') fillPane('showrooms');
    pauseRotate();
  }

  function setGuideEstCat(cat) {
    if (!cat) cat = 'all';
    _guideEstCat = cat;
    document.querySelectorAll('#rizq-guide-est-tabs [data-guide-est-cat]').forEach(function (btn) {
      var on = btn.getAttribute('data-guide-est-cat') === cat;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (_pane === 'estate') fillPane('estate');
    pauseRotate();
  }

  function bindFilters() {
    document.querySelectorAll('#rizq-guide-sty-tabs [data-guide-sty-gender]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setGuideGender(btn.getAttribute('data-guide-sty-gender') || 'men');
      });
    });
    document.querySelectorAll('#rizq-guide-srm-tabs [data-guide-srm-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setGuideSrmCat(btn.getAttribute('data-guide-srm-cat') || 'cars');
      });
    });
    document.querySelectorAll('#rizq-guide-est-tabs [data-guide-est-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setGuideEstCat(btn.getAttribute('data-guide-est-cat') || 'all');
      });
    });
    var reshuffle = $('rizq-guide-styles-reshuffle');
    if (reshuffle) {
      reshuffle.addEventListener('click', function () {
        try { global.buildStyleIdeas(true, 'rizq-guide-rail-styles', _guideGender); } catch (e) { /* */ }
        _avail.styles = paneHasCards('styles');
        pauseRotate();
      });
    }
    var srmReshuffle = $('rizq-guide-srm-reshuffle');
    if (srmReshuffle) {
      srmReshuffle.addEventListener('click', function () {
        try { global.buildShowroomModels(true, 'rizq-guide-rail-showrooms', _guideSrmCat); } catch (e) { /* */ }
        _avail.showrooms = paneHasCards('showrooms');
        pauseRotate();
      });
    }
  }

  function refreshLang() {
    updateLiveLabel(_pane);
    /* أعد بناء بطاقات الدليل بلغة الصفحة — لا تترك HTML عربياً بعد FR */
    fillPane(_pane);
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

    bindFilters();

    ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(function (ev) {
      root.addEventListener(ev, function () { pauseRotate(); }, { passive: true });
    });

    document.addEventListener('rizq:langchange', function () {
      refreshLang();
    });

    syncTabVisibility();
    showPane('styles', false);

    var retries = [400, 1200, 2500, 4500];
    retries.forEach(function (ms) {
      setTimeout(function () {
        /* لا نعيد fillPane إن وُجدت بطاقات — تجنّب CLS من إعادة البناء المتكررة */
        if (!paneHasCards(_pane)) fillPane(_pane);
        else if (!_paused) lockStageHeight();
        syncTabVisibility();
        updateLiveLabel(_pane);
        fillBrand(_pane);
      }, ms);
    });
  }

  global.RizqGuideNotify = notify;
  global.RizqGuideShow = showPane;
  global.RizqGuideHasCards = paneHasCards;
  global.RizqGuideActiveHasCards = function () { return paneHasCards(_pane); };
  global.RizqGuideRefreshLang = refreshLang;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})(typeof window !== 'undefined' ? window : this);
