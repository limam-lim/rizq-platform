/* ═══════════════════════════════════════════════════════════════════
   rizq_civic_ticker.js  v1.0
   شريط الخدمة العامة تحت كبسولة الهيدر (طارئ / تنبيه / توعية / مناسبة)
   ───────────────────────────────────────────────────────────────────
   يملأ #ticker-wrap — منفصل تماماً عن شريط «مباشر» (أحدث الإعلانات).
   يُدار من لوحة السوبر أدمن: الإشعارات → شريط الخدمة العامة.
   مصدر البيانات: /api/site-config → config.civicTicker
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'rizq_civic_ticker';
  var STYLE_ID = 'rizq-civic-ticker-css';
  var POLL_MS = 15000;

  var FALLBACK = [
    {
      id: 'civic_fb_emergency',
      textAr: 'أرقام الطوارئ: إطفاء ١٨ · إسعاف ١٧ · شرطة ١٧',
      textFr: 'Urgences: Pompiers 18 · SAMU 17 · Police 17',
      color: '#ef4444',
      priority: 'urgent',
      link: '',
      active: true,
      order: 0
    },
    {
      id: 'civic_fb_aware',
      textAr: 'تنويه خدمة عامة — تحقق من المصادر الرسمية قبل إعادة النشر',
      textFr: 'Service public — vérifiez les sources officielles avant de republier',
      color: '#C9A84C',
      priority: 'normal',
      link: '',
      active: true,
      order: 1
    },
    {
      id: 'civic_fb_fest',
      textAr: 'مناسبات وطنية ومجتمعية — تابع الإعلانات الرسمية على رزق',
      textFr: 'Fêtes nationales et communautaires — suivez les avis officiels sur Rizq',
      color: '#7dd3fc',
      priority: 'normal',
      link: '',
      active: true,
      order: 2
    }
  ];

  function getLang() {
    if (global.RizqI18n && typeof RizqI18n.getLang === 'function') return RizqI18n.getLang();
    try { return localStorage.getItem('rizq_lang') || 'ar'; } catch (e) { return 'ar'; }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function safeUrl(u) {
    if (!u) return '';
    var s = String(u).trim();
    if (!s) return '';
    if (s.charAt(0) === '/' || s.charAt(0) === '#' || s.indexOf('./') === 0) {
      if (/[\s<>"']/.test(s) || /javascript:/i.test(s)) return '';
      return s;
    }
    try {
      var p = new URL(s);
      if (p.protocol !== 'http:' && p.protocol !== 'https:') return '';
      return s;
    } catch (e) { return ''; }
  }

  function isUrgent(item) {
    if (!item) return false;
    if (item.priority === 'urgent' || item.priority === 'high') return true;
    var c = String(item.color || '').toLowerCase();
    return c === '#ef4444' || c === '#dc2626' || c === '#b91c1c' || c === 'red' || c === 'urgent';
  }

  function normalizeColor(c) {
    var raw = String(c || '').trim();
    if (!raw || raw === 'default' || raw === 'gold') return '#C9A84C';
    if (raw === 'urgent' || raw === 'red') return '#ef4444';
    if (raw === 'navy') return '#7dd3fc';
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) {
      if (raw.length === 4) {
        return '#' + raw[1] + raw[1] + raw[2] + raw[2] + raw[3] + raw[3];
      }
      return raw;
    }
    return '#C9A84C';
  }

  function pickText(item) {
    var lang = getLang();
    if (lang === 'fr') return item.textFr || item.textAr || '';
    return item.textAr || item.textFr || '';
  }

  function injectCSS() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '/* شريط خدمة عامة — أبطأ من مباشر الإعلانات */',
      '#ticker-wrap.civic-ticker-wrap .ticker-inner{',
      '  --rzq-mq-dur:62s;',
      '  animation-duration:var(--rzq-mq-dur,62s)!important',
      '}',
      '#ticker-wrap.civic-ticker-wrap.ticker-has-urgent{',
      '  background:linear-gradient(90deg,#3b0a0a,#7f1d1d,#3b0a0a)!important;',
      '  border-top-color:rgba(239,68,68,.45)!important;',
      '  border-bottom-color:rgba(239,68,68,.45)!important',
      '}',
      '#ticker-wrap.civic-ticker-wrap .ticker-item{',
      '  color:rgba(255,255,255,.88)',
      '}',
      '#ticker-wrap.civic-ticker-wrap .ticker-item.is-urgent{',
      '  color:#fecaca;font-weight:600',
      '}',
      '#ticker-wrap.civic-ticker-wrap .ticker-item a{',
      '  color:inherit;text-decoration:underline;text-underline-offset:2px',
      '}',
      '#ticker-wrap.civic-ticker-wrap .ticker-dot{',
      '  opacity:.95',
      '}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function backendBase() {
    if (typeof global.RIZQ_BACKEND_BASE === 'string' && global.RIZQ_BACKEND_BASE) {
      return global.RIZQ_BACKEND_BASE.replace(/\/$/, '');
    }
    if (/^https?:/.test(location.protocol || '')) return location.origin;
    return '';
  }

  function fromCache() {
    try {
      var list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function sortedActive(list) {
    return (list || []).filter(function (a) {
      return a && a.active !== false && String(pickText(a) || '').trim();
    }).slice().sort(function (a, b) {
      var ao = Number(a.order); if (!Number.isFinite(ao)) ao = 0;
      var bo = Number(b.order); if (!Number.isFinite(bo)) bo = 0;
      if (ao !== bo) return ao - bo;
      return (isUrgent(b) ? 1 : 0) - (isUrgent(a) ? 1 : 0);
    });
  }

  function buildItemHtml(item) {
    var text = pickText(item);
    if (!text) return '';
    var color = normalizeColor(item.color);
    var urgent = isUrgent(item);
    var href = safeUrl(item.link);
    var body = esc(text);
    if (href) {
      body = '<a href="' + esc(href) + '" rel="noopener">' + body + '</a>';
    }
    return '<div class="ticker-item' + (urgent ? ' is-urgent' : '') + '">'
      + '<div class="ticker-dot" style="background:' + esc(color) + '"></div>'
      + '<span style="color:' + esc(color) + '">' + body + '</span>'
      + '</div>';
  }

  function render(list) {
    injectCSS();
    var wrap = document.getElementById('ticker-wrap');
    var inner = document.getElementById('ticker');
    if (!wrap || !inner) return;

    var active = sortedActive(list);
    if (!active.length) active = FALLBACK.slice();

    var html = active.map(buildItemHtml).filter(Boolean).join('');
    if (!html) {
      wrap.classList.add('is-empty');
      return;
    }

    inner.innerHTML = html + html;
    wrap.classList.remove('is-empty');
    wrap.classList.add('civic-ticker-wrap');
    wrap.setAttribute('role', 'marquee');
    wrap.setAttribute('aria-label', getLang() === 'fr'
      ? 'Annonces de service public'
      : 'إعلانات خدمة عامة');

    wrap.classList.toggle('ticker-has-urgent', active.some(isUrgent));

    try {
      var th = Math.max(36, Math.round(wrap.getBoundingClientRect().height || 42));
      document.documentElement.style.setProperty('--rizq-ticker-h', th + 'px');
    } catch (e) {}

    if (typeof global.syncMarqueeShift === 'function' && typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(function () {
        global.syncMarqueeShift(inner);
        global.requestAnimationFrame(function () { global.syncMarqueeShift(inner); });
      });
    }
  }

  function applyList(list) {
    var safe = Array.isArray(list) ? list : [];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(safe)); } catch (e) {}
    render(safe);
  }

  function fetchRemote() {
    var base = backendBase();
    if (!base || typeof fetch === 'undefined') return Promise.resolve(null);
    return fetch(base + '/api/site-config', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !data.config) return null;
        return Array.isArray(data.config.civicTicker) ? data.config.civicTicker : null;
      })
      .catch(function () { return null; });
  }

  var _pollTimer = null;
  var _lastSig = '';

  function sig(list) {
    try { return JSON.stringify(list || []); } catch (e) { return ''; }
  }

  function init() {
    var cached = fromCache();
    render(cached.length ? cached : FALLBACK);

    fetchRemote().then(function (remote) {
      if (remote) {
        _lastSig = sig(remote);
        applyList(remote);
      } else if (!cached.length) {
        applyList([]);
      }
    });

    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(function () {
      fetchRemote().then(function (remote) {
        if (!remote) return;
        var next = sig(remote);
        if (next === _lastSig) return;
        _lastSig = next;
        applyList(remote);
      });
    }, POLL_MS);
  }

  global.RizqCivicTicker = {
    STORAGE_KEY: STORAGE_KEY,
    FALLBACK: FALLBACK,
    render: render,
    apply: applyList,
    reload: init,
    getAll: fromCache,
    saveAll: function (list) {
      applyList(Array.isArray(list) ? list : []);
    }
  };

  // توافق: نداءات قديمة كانت تملأ الشريط من عناوين الإعلانات التجارية
  global.renderTickerFromAds = function () {
    if (!document.getElementById('ticker-wrap') || !document.getElementById('ticker')) return;
    var cached = fromCache();
    render(cached.length ? cached : FALLBACK);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
