/**
 * rizq_marquee_kit.js — ميزات موحّدة لكل الأشرطة المتحركة
 * 1) تسريع  2) إرجاع للخلف  3) إيقاف عند مرور المؤشر
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'rizq-marquee-kit-css';
  var CTRL_CLASS = 'rzq-mq-ctrls';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function isFr() {
    try {
      if (global.RizqI18n && typeof RizqI18n.getLang === 'function') {
        return RizqI18n.getLang() === 'fr';
      }
      return (localStorage.getItem('rizq_lang') || 'ar') === 'fr';
    } catch (e) {
      return false;
    }
  }

  function injectCSS() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '.' + CTRL_CLASS + '{',
      '  position:absolute;inset-inline-end:8px;top:50%;transform:translateY(-50%);',
      '  z-index:6;display:flex;align-items:center;gap:4px;',
      '  opacity:0;pointer-events:none;transition:opacity .18s ease',
      '}',
      '.ticker-wrap:hover .' + CTRL_CLASS + ',',
      '.price-ticker-wrap:hover .' + CTRL_CLASS + ',',
      '.cards-track-wrap:hover .' + CTRL_CLASS + ',',
      '.rizq-styles-rail-wrap:hover .' + CTRL_CLASS + ',',
      '.rizq-srm-rail-wrap:hover .' + CTRL_CLASS + ',',
      '.rizq-styles-track-wrap:hover .' + CTRL_CLASS + ',',
      '.rzq-disc-strip:hover .' + CTRL_CLASS + ',',
      '.ticker-wrap:focus-within .' + CTRL_CLASS + ',',
      '.price-ticker-wrap:focus-within .' + CTRL_CLASS + ',',
      '.cards-track-wrap:focus-within .' + CTRL_CLASS + ',',
      '.rzq-disc-strip:focus-within .' + CTRL_CLASS + '{',
      '  opacity:1;pointer-events:auto',
      '}',
      '.' + CTRL_CLASS + ' button{',
      '  width:28px;height:28px;border-radius:8px;border:1px solid rgba(201,168,76,.45);',
      '  background:rgba(6,17,28,.78);color:#E8C96A;font-size:12px;font-weight:800;',
      '  cursor:pointer;line-height:1;display:inline-flex;align-items:center;justify-content:center;',
      '  font-family:inherit;padding:0;backdrop-filter:blur(6px)',
      '}',
      '.' + CTRL_CLASS + ' button:hover{background:rgba(201,168,76,.22);border-color:rgba(232,201,106,.7)}',
      '.' + CTRL_CLASS + ' button.is-on{background:rgba(201,168,76,.35);color:#0D1B2A;border-color:#E8C96A}',
      '.ticker-wrap,.price-ticker-wrap,.cards-track-wrap,',
      '.rizq-styles-rail-wrap,.rizq-srm-rail-wrap,.rizq-styles-track-wrap{position:relative}',
      '.rzq-disc-strip{position:relative}',
      '@media(max-width:700px){',
      '  .' + CTRL_CLASS + '{inset-inline-end:4px}',
      '  .' + CTRL_CLASS + ' button{width:26px;height:26px;font-size:11px}',
      '}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function findWrap(el) {
    if (!el) return null;
    return el.closest(
      '.cards-track-wrap, .ticker-wrap, .price-ticker-wrap, .rizq-styles-track-wrap, .rizq-styles-rail-wrap, .rizq-srm-rail-wrap, .rzq-disc-strip'
    ) || el.parentElement;
  }

  function ensureControls(wrap, api) {
    if (!wrap || !api) return null;
    injectCSS();
    var existing = wrap.querySelector('.' + CTRL_CLASS);
    if (existing) {
      existing._rzqMqApi = api;
      return existing;
    }
    var fr = isFr();
    var box = document.createElement('div');
    box.className = CTRL_CLASS;
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', fr ? 'Contrôles du bandeau' : 'تحكم الشريط');
    function mkBtn(kind, label, title) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-mq', kind);
      b.setAttribute('title', title);
      b.setAttribute('aria-label', label);
      b.textContent = kind === 'rev' ? '«' : kind === 'pause' ? '❚❚' : '»';
      box.appendChild(b);
      return b;
    }
    mkBtn('rev', fr ? 'Reculer' : 'رجوع', fr ? 'Reculer / sens inverse' : 'رجوع / عكس الاتجاه');
    mkBtn('pause', fr ? 'Pause' : 'إيقاف', fr ? 'Pause' : 'إيقاف');
    mkBtn('fast', fr ? 'Accélérer' : 'تسريع', fr ? 'Accélérer' : 'تسريع');
    box._rzqMqApi = api;
    box.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('button[data-mq]') : null;
      if (!btn || !box._rzqMqApi) return;
      e.preventDefault();
      e.stopPropagation();
      var a = box._rzqMqApi;
      var kind = btn.getAttribute('data-mq');
      if (kind === 'rev' && typeof a.reverse === 'function') a.reverse();
      if (kind === 'pause' && typeof a.togglePause === 'function') a.togglePause();
      if (kind === 'fast' && typeof a.speedUp === 'function') a.speedUp();
      syncCtrlUi(box, a);
    });
    wrap.appendChild(box);
    syncCtrlUi(box, api);
    return box;
  }

  function syncCtrlUi(box, api) {
    if (!box || !api) return;
    var pauseBtn = box.querySelector('[data-mq="pause"]');
    var revBtn = box.querySelector('[data-mq="rev"]');
    var fr = isFr();
    if (pauseBtn) {
      var paused = !!api.isPaused && api.isPaused();
      pauseBtn.textContent = paused ? '▶' : '❚❚';
      pauseBtn.classList.toggle('is-on', paused);
      pauseBtn.title = paused
        ? (fr ? 'Reprendre' : 'تشغيل')
        : (fr ? 'Pause' : 'إيقاف');
    }
    if (revBtn && api.getDir) {
      revBtn.classList.toggle('is-on', api.getDir() < 0);
    }
  }

  /**
   * يعزّز حالة bindRafMarquee: اتجاه + إيقاف عند المرور + أزرار
   */
  function enhanceRafState(state) {
    if (!state || !state.el || state._kitBound) return state;
    state._kitBound = true;
    if (typeof state.dir !== 'number') state.dir = 1;
    state.hoverPaused = false;
    state.userPaused = false;

    var wrap = findWrap(state.el);
    var origApplyPlay = state.applyPlayState;
    state.applyPlayState = function () {
      state.paused = !!(state.userPaused || state.hoverPaused);
      if (typeof origApplyPlay === 'function') origApplyPlay.call(state);
      else {
        var stop = !!(state.paused || state.offscreen || document.hidden || state.half <= 1);
        state.el.classList.toggle('is-mq-paused', stop);
      }
      if (wrap) {
        var box = wrap.querySelector('.' + CTRL_CLASS);
        if (box) syncCtrlUi(box, api);
      }
    };

    /* اتجاه الحركة يُطبَّق عبر إشارة pxPerSec */
    if (!state._kitDirHooked) {
      state._kitDirHooked = true;
      Object.defineProperty(state, 'signedPx', {
        get: function () {
          return (Number(state.pxPerSec) || 0) * (state.dir < 0 ? -1 : 1);
        }
      });
    }

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
        state.basePx = state.basePx || state.pxPerSec || 56;
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
      isPaused: function () { return !!(state.userPaused || state.hoverPaused || state.paused); },
      getDir: function () { return state.dir < 0 ? -1 : 1; }
    };

    if (wrap) {
      ensureControls(wrap, api);
      if (!state._hoverBound) {
        state._hoverBound = true;
        wrap.addEventListener('pointerenter', function () {
          if (state.userPaused) return;
          state.hoverPaused = true;
          state.applyPlayState();
        }, { passive: true });
        wrap.addEventListener('pointerleave', function () {
          state.hoverPaused = false;
          state.applyPlayState();
        }, { passive: true });
        /* عجلة: أمام/خلف حتى أثناء الإيقاف */
        wrap.addEventListener('wheel', function (ev) {
          var dx = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
          if (!dx || state.half <= 1) return;
          if (dx > 0) state.dir = 1;
          else state.dir = -1;
          state.pos += Math.abs(dx) * 0.45;
          if (state.pos >= state.half) state.pos -= state.half;
          if (state.pos < 0) state.pos += state.half;
          if (typeof state.apply === 'function') state.apply();
        }, { passive: true });
      }
    }

    state.applyPlayState();
    return state;
  }

  /**
   * يعزّز شريط اكتشاف (initAutoScroll) بنفس الميزات عبر كائن تحكم محلي
   */
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
        syncCtrlUi(strip.querySelector('.' + CTRL_CLASS), api);
      },
      speedUp: function () {
        ctl.userPaused = false;
        ctl.hoverPaused = false;
        ctl.boostPx = Math.min(220, (ctl.boostPx || 0) + 120);
        clearTimeout(api._fastT);
        api._fastT = setTimeout(function () { ctl.boostPx = 0; }, 1600);
        syncCtrlUi(strip.querySelector('.' + CTRL_CLASS), api);
      },
      isPaused: function () { return !!(ctl.userPaused || ctl.hoverPaused); },
      getDir: function () { return ctl.dir < 0 ? -1 : 1; }
    };

    ensureControls(strip, api);
    strip.addEventListener('pointerenter', function () {
      if (ctl.userPaused) return;
      ctl.hoverPaused = true;
      syncCtrlUi(strip.querySelector('.' + CTRL_CLASS), api);
    }, { passive: true });
    strip.addEventListener('pointerleave', function () {
      ctl.hoverPaused = false;
      syncCtrlUi(strip.querySelector('.' + CTRL_CLASS), api);
    }, { passive: true });

    return api;
  }

  function enhanceAllRaf() {
    var list = global._rzqMarquees;
    if (!Array.isArray(list)) return;
    list.forEach(function (st) { enhanceRafState(st); });
  }

  global.RizqMarqueeKit = {
    enhanceRafState: enhanceRafState,
    enhanceDiscStrip: enhanceDiscStrip,
    enhanceAllRaf: enhanceAllRaf,
    injectCSS: injectCSS
  };

  /* رقّع حركة rAF لتأخذ الاتجاه (dir) بالحسبان */
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
                var n = Math.abs(Number(v) || 0);
                this._kitRawPx = n;
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

  function boot() {
    injectCSS();
    patchTickOnce();
    enhanceAllRaf();
    /* إعادة المحاولة لأن bindRafMarquee قد يتأخر */
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
