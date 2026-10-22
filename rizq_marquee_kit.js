/**
 * rizq_marquee_kit.js — تحكم موحّد للأشرطة المتحركة بلا أزرار ظاهرة
 * - مرور المؤشر: إيقاف
 * - عجلة / سحب: إرجاع أو تقديم لمشاهدة ما فات
 * - حركة سريعة أو عجلة أثناء التشغيل: تسريع مؤقت
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'rizq-marquee-kit-css';

  function injectCSS() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.ticker-wrap,.price-ticker-wrap,.cards-track-wrap,',
      '.rizq-styles-rail-wrap,.rizq-srm-rail-wrap,.rizq-styles-track-wrap,',
      '.rzq-disc-strip{position:relative}',
      '.ticker-wrap.is-mq-hover-paused,',
      '.price-ticker-wrap.is-mq-hover-paused,',
      '.cards-track-wrap.is-mq-hover-paused,',
      '.rizq-styles-rail-wrap.is-mq-hover-paused,',
      '.rizq-srm-rail-wrap.is-mq-hover-paused,',
      '.rizq-styles-track-wrap.is-mq-hover-paused,',
      '.rzq-disc-strip.is-mq-hover-paused{cursor:grab}',
      '.ticker-wrap.is-mq-hover-paused:active,',
      '.price-ticker-wrap.is-mq-hover-paused:active,',
      '.cards-track-wrap.is-mq-hover-paused:active,',
      '.rzq-disc-strip.is-mq-hover-paused:active{cursor:grabbing}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function findWrap(el) {
    if (!el) return null;
    return el.closest(
      '.cards-track-wrap, .ticker-wrap, .price-ticker-wrap, .rizq-styles-track-wrap, .rizq-styles-rail-wrap, .rizq-srm-rail-wrap, .rzq-disc-strip'
    ) || el.parentElement;
  }

  function markHover(wrap, on) {
    if (!wrap || !wrap.classList) return;
    wrap.classList.toggle('is-mq-hover-paused', !!on);
  }

  function enhanceRafState(state) {
    if (!state || !state.el || state._kitBound) return state;
    state._kitBound = true;
    injectCSS();
    if (typeof state.dir !== 'number') state.dir = 1;
    state.hoverPaused = false;
    state.userPaused = false;

    var wrap = findWrap(state.el);
    var origApplyPlay = state.applyPlayState;
    state.applyPlayState = function () {
      if (typeof origApplyPlay === 'function') origApplyPlay.call(state);
      else {
        var stop = !!(
          state.paused || state.userPaused || state.hoverPaused ||
          state.offscreen || document.hidden || state.half <= 1
        );
        state.el.classList.toggle('is-mq-paused', stop);
        if (!stop && typeof global._rzqEnsureMarqueeLoop === 'function') {
          global._rzqEnsureMarqueeLoop();
        }
      }
      markHover(wrap, state.hoverPaused);
    };

    var api = {
      reverse: function () {
        state.dir = state.dir < 0 ? 1 : -1;
        if (typeof global._rzqEnsureMarqueeLoop === 'function') global._rzqEnsureMarqueeLoop();
      },
      togglePause: function () {
        state.userPaused = !state.userPaused;
        state.applyPlayState();
      },
      speedUp: function () {
        state.userPaused = false;
        state.hoverPaused = false;
        state.basePx = state.basePx || Math.abs(Number(state.pxPerSec) || 56);
        state.boost = Math.min(220, (state.boost || 0) + 120);
        state.pxPerSec = state.basePx + state.boost;
        state.applyPlayState();
        if (typeof global._rzqEnsureMarqueeLoop === 'function') global._rzqEnsureMarqueeLoop();
        clearTimeout(api._fastT);
        api._fastT = setTimeout(function () {
          state.boost = 0;
          state.pxPerSec = state.basePx || 56;
        }, 1600);
      },
      isPaused: function () {
        return !!(state.userPaused || state.hoverPaused || state.paused);
      },
      getDir: function () { return state.dir < 0 ? -1 : 1; }
    };
    state._kitApi = api;

    if (wrap && !state._hoverBound) {
      state._hoverBound = true;
      var dragX = null;

      wrap.addEventListener('pointerenter', function () {
        if (state.userPaused) return;
        state.hoverPaused = true;
        state.applyPlayState();
      }, { passive: true });

      wrap.addEventListener('pointerleave', function () {
        state.hoverPaused = false;
        dragX = null;
        state.applyPlayState();
        if (typeof global._rzqEnsureMarqueeLoop === 'function') global._rzqEnsureMarqueeLoop();
      }, { passive: true });

      /* عجلة: إيقاف → إزاحة؛ تشغيل → تسريع + اتجاه */
      wrap.addEventListener('wheel', function (ev) {
        var dx = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
        if (!dx || state.half <= 1) return;
        state.dir = dx > 0 ? 1 : -1;
        if (state.hoverPaused || state.userPaused || state.paused) {
          state.pos += Math.abs(dx) * 0.45;
          if (state.pos >= state.half) state.pos -= state.half;
          if (state.pos < 0) state.pos += state.half;
          if (typeof state.apply === 'function') state.apply();
        } else if (typeof api.speedUp === 'function') {
          api.speedUp();
        }
      }, { passive: true });

      /* سحب أثناء الإيقاف لإرجاع الشريط */
      wrap.addEventListener('pointerdown', function (ev) {
        if (!(state.hoverPaused || state.userPaused || state.paused)) return;
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        dragX = ev.clientX;
      }, { passive: true });

      wrap.addEventListener('pointerup', function () { dragX = null; }, { passive: true });
      wrap.addEventListener('pointercancel', function () { dragX = null; }, { passive: true });

      wrap.addEventListener('pointermove', function (ev) {
        if (dragX == null) return;
        if (!(state.hoverPaused || state.userPaused || state.paused)) return;
        if (state.half <= 1) return;
        var dx = ev.clientX - dragX;
        dragX = ev.clientX;
        if (!dx) return;
        state.dir = dx < 0 ? 1 : -1;
        state.pos += Math.abs(dx) * 0.55;
        if (state.pos >= state.half) state.pos -= state.half;
        if (state.pos < 0) state.pos += state.half;
        if (typeof state.apply === 'function') state.apply();
      }, { passive: true });
    }

    state.applyPlayState();
    return state;
  }

  function enhanceDiscStrip(strip, ctl) {
    if (!strip || !ctl || strip._kitBound) return ctl;
    strip._kitBound = true;
    injectCSS();
    if (typeof ctl.dir !== 'number') ctl.dir = 1;
    ctl.hoverPaused = false;
    ctl.userPaused = false;

    var api = {
      reverse: function () { ctl.dir = ctl.dir < 0 ? 1 : -1; },
      togglePause: function () { ctl.userPaused = !ctl.userPaused; markHover(strip, ctl.hoverPaused); },
      speedUp: function () {
        ctl.userPaused = false;
        ctl.hoverPaused = false;
        ctl.boostPx = Math.min(220, (ctl.boostPx || 0) + 120);
        markHover(strip, false);
        clearTimeout(api._fastT);
        api._fastT = setTimeout(function () { ctl.boostPx = 0; }, 1600);
      },
      isPaused: function () { return !!(ctl.userPaused || ctl.hoverPaused); },
      getDir: function () { return ctl.dir < 0 ? -1 : 1; }
    };
    strip._kitApi = api;

    strip.addEventListener('pointerenter', function () {
      if (ctl.userPaused) return;
      ctl.hoverPaused = true;
      markHover(strip, true);
    }, { passive: true });
    strip.addEventListener('pointerleave', function () {
      ctl.hoverPaused = false;
      markHover(strip, false);
    }, { passive: true });

    return api;
  }

  function enhanceAllRaf() {
    var list = global._rzqMarquees;
    if (!Array.isArray(list)) return;
    list.forEach(function (st) { enhanceRafState(st); });
  }

  function patchTickOnce() {
    if (global._rzqMarqueeKitTickPatched) return;
    if (typeof global._rzqMarqueeTick !== 'function') return;
    global._rzqMarqueeKitTickPatched = true;
    var orig = global._rzqMarqueeTick;
    global._rzqMarqueeTick = function (now) {
      var list = global._rzqMarquees;
      if (Array.isArray(list)) {
        for (var i = 0; i < list.length; i++) {
          var st = list[i];
          if (!st || st._kitPxWrapped) continue;
          if (typeof st.dir !== 'number') st.dir = 1;
          st._kitPxWrapped = true;
          var initial = Math.abs(Number(st.pxPerSec) || Number(st.basePx) || 56);
          st._kitRawPx = initial;
          try {
            Object.defineProperty(st, 'pxPerSec', {
              configurable: true,
              enumerable: true,
              get: function () {
                var base = this._kitRawPx;
                if (typeof base !== 'number' || !isFinite(base)) base = Math.abs(Number(this.basePx) || 56);
                return Math.abs(base) * (this.dir < 0 ? -1 : 1);
              },
              set: function (v) {
                this._kitRawPx = Math.abs(Number(v) || 0);
              }
            });
          } catch (eDef) {
            st._kitPxWrapped = false;
          }
        }
      }
      return orig.apply(this, arguments);
    };
  }

  global.RizqMarqueeKit = {
    enhanceRafState: enhanceRafState,
    enhanceDiscStrip: enhanceDiscStrip,
    enhanceAllRaf: enhanceAllRaf,
    injectCSS: injectCSS
  };

  function boot() {
    injectCSS();
    patchTickOnce();
    enhanceAllRaf();
    var n = 0;
    var t = setInterval(function () {
      patchTickOnce();
      enhanceAllRaf();
      n++;
      if (n > 20) clearInterval(t);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
