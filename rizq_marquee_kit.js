/**
 * rizq_marquee_kit.js — تحكم موحّد لكل الأشرطة المتحركة بلا أزرار ظاهرة
 * - مرور المؤشر: إيقاف
 * - عجلة / سحب: إرجاع أو تقديم لمشاهدة ما فات
 * - حركة سريعة أو عجلة أثناء التشغيل: تسريع مؤقت
 * يُطبَّق تلقائياً على كل أشرطة rAF + اكتشاف + شريط فيديو التمرير
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'rizq-marquee-kit-css';
  var WRAP_SEL = [
    '.cards-track-wrap',
    '.ticker-wrap',
    '.price-ticker-wrap',
    '.rizq-styles-track-wrap',
    '.rizq-styles-rail-wrap',
    '.rizq-srm-rail-wrap',
    '.rzq-disc-strip',
    '.rizq-vid-strip',
    '#rizq-styles-rail',
    '#rizq-srm-rail',
    '#rizq-est-rail'
  ].join(',');

  var INNER_SEL = [
    '.cards-track',
    '.ticker-inner',
    '.price-ticker-inner',
    '.rizq-styles-rail',
    '.rzq-disc-track',
    '.rizq-vid-strip-track'
  ].join(',');

  function injectCSS() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.ticker-wrap,.price-ticker-wrap,.cards-track-wrap,',
      '.rizq-styles-rail-wrap,.rizq-srm-rail-wrap,.rizq-styles-track-wrap,',
      '.rzq-disc-strip,.rizq-vid-strip{position:relative}',
      '.is-mq-hover-paused{cursor:grab}',
      '.is-mq-hover-paused:active{cursor:grabbing}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function findWrap(el) {
    if (!el) return null;
    return el.closest(WRAP_SEL) || el.parentElement;
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

      wrap.addEventListener('wheel', function (ev) {
        var dx = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
        if (!dx || state.half <= 1) return;
        state.dir = dx > 0 ? 1 : -1;
        if (state.hoverPaused || state.userPaused || state.paused) {
          state.pos += Math.abs(dx) * 0.45;
          if (state.pos >= state.half) state.pos -= state.half;
          if (state.pos < 0) state.pos += state.half;
          if (typeof state.apply === 'function') state.apply();
        } else {
          api.speedUp();
        }
      }, { passive: true });

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
      togglePause: function () {
        ctl.userPaused = !ctl.userPaused;
        markHover(strip, ctl.hoverPaused || ctl.userPaused);
      },
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

  /**
   * أشرطة التمرير (فيديو وغيرها) — عجلة/سحب للإزاحة؛ تمرير تلقائي فقط إن data-mq-auto="1"
   */
  function isTouchUi() {
    try {
      return !!(
        window.matchMedia('(hover: none)').matches ||
        window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(max-width: 768px)').matches
      );
    } catch (e) {
      return 'ontouchstart' in global;
    }
  }

  function enhanceScrollTrack(track) {
    if (!track || track._kitScrollBound) return track;
    track._kitScrollBound = true;
    injectCSS();
    var wrap = findWrap(track) || track;
    var hover = false;
    var dragX = null;
    var touching = false;
    /* هاتف/لمس: بلا تمرير تلقائي — كان يصارع scroll-snap فيرتجف ويلامس الحواف */
    var wantAuto = !isTouchUi() && (
      track.getAttribute('data-mq-auto') === '1'
      || (wrap && wrap.getAttribute && wrap.getAttribute('data-mq-auto') === '1')
    );
    var autoDir = 1;
    var autoPx = 36;
    var lastTs = 0;

    function step(ts) {
      if (!track.isConnected || !wantAuto) return;
      if (!lastTs) lastTs = ts;
      var dt = Math.min(48, ts - lastTs);
      lastTs = ts;
      if (!hover && !touching && !document.hidden && track.scrollWidth > track.clientWidth + 8) {
        track.scrollLeft += autoDir * autoPx * (dt / 1000);
        var max = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= max - 1) autoDir = -1;
        if (track.scrollLeft <= 1) autoDir = 1;
      }
      requestAnimationFrame(step);
    }

    wrap.addEventListener('pointerenter', function () {
      hover = true;
      markHover(wrap, true);
    }, { passive: true });
    wrap.addEventListener('pointerleave', function () {
      hover = false;
      dragX = null;
      markHover(wrap, false);
    }, { passive: true });
    wrap.addEventListener('wheel', function (ev) {
      var dx = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
      if (!dx) return;
      track.scrollLeft += dx * (hover ? 1 : 1.6);
      autoDir = dx > 0 ? 1 : -1;
      if (!hover && wantAuto) {
        autoPx = Math.min(140, 36 + Math.abs(dx));
        clearTimeout(wrap._mqFastT);
        wrap._mqFastT = setTimeout(function () { autoPx = 36; }, 1400);
      }
    }, { passive: true });
    wrap.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      touching = true;
      dragX = ev.clientX;
    }, { passive: true });
    wrap.addEventListener('pointerup', function () { dragX = null; touching = false; }, { passive: true });
    wrap.addEventListener('pointercancel', function () { dragX = null; touching = false; }, { passive: true });
    wrap.addEventListener('pointermove', function (ev) {
      if (dragX == null) return;
      var dx = ev.clientX - dragX;
      dragX = ev.clientX;
      if (dx) {
        track.scrollLeft -= dx;
        autoDir = dx < 0 ? 1 : -1;
      }
    }, { passive: true });

    if (wantAuto) requestAnimationFrame(step);
    return track;
  }

  function enhanceAllRaf() {
    var list = global._rzqMarquees;
    if (!Array.isArray(list)) return;
    list.forEach(function (st) { enhanceRafState(st); });
  }

  function enhanceAllDisc() {
    try {
      document.querySelectorAll('.rzq-disc-strip').forEach(function (strip) {
        if (strip._kitBound) return;
        if (strip._rzqScrollBound && strip._kitCtl) {
          enhanceDiscStrip(strip, strip._kitCtl);
          return;
        }
        /* إن وُجدت حالة داخلية من initAutoScroll عبر ctl مخزّن */
        if (strip._kitApi) return;
      });
    } catch (e) {}
  }

  function enhanceAllScroll() {
    try {
      document.querySelectorAll('.rizq-vid-strip-track').forEach(enhanceScrollTrack);
    } catch (e) {}
  }

  function enhanceEverything() {
    injectCSS();
    patchTickOnce();
    enhanceAllRaf();
    enhanceAllDisc();
    enhanceAllScroll();
    /* اربط أي شريط rAF ظهر بعد التحميل */
    try {
      document.querySelectorAll(INNER_SEL).forEach(function (el) {
        if (el._rzqMarquee) enhanceRafState(el._rzqMarquee);
      });
    } catch (e2) {}
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

  function observeDom() {
    if (typeof MutationObserver === 'undefined' || !document.documentElement) return;
    var mo = new MutationObserver(function () {
      enhanceEverything();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  global.RizqMarqueeKit = {
    enhanceRafState: enhanceRafState,
    enhanceDiscStrip: enhanceDiscStrip,
    enhanceScrollTrack: enhanceScrollTrack,
    enhanceAllRaf: enhanceAllRaf,
    enhanceEverything: enhanceEverything,
    injectCSS: injectCSS
  };

  function boot() {
    enhanceEverything();
    observeDom();
    var n = 0;
    var t = setInterval(function () {
      enhanceEverything();
      n++;
      if (n > 40) clearInterval(t);
    }, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : this);
