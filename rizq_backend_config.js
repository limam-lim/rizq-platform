/**
 * rizq_backend_config.js
 * ═══════════════════════════════════════════════════════════════════
 * مصدر الحقيقة الوحيد لعنوان خادم rizq-backend على كل الصفحات العامة —
 * كانت هذه القيمة مكرَّرة يدوياً (نسخ/لصق) داخل 5 ملفات مختلفة
 * (rizq_ads_panel.html, rizq_landing_v8.html, rizq_legal.html,
 * rizq_office.html, rizq_store.html) وناقصة تماماً من ملف سادس
 * (rizq_corp.html) رغم أنه يستدعي rizq_widget_embed.js أيضاً — أي أن
 * صفحة الشركة العامة كانت ستبقى بلا وكيل ذكي حقيقي للأبد بصمت، ولو
 * عدَّل أحد الرابط في الملفات الخمسة الأخرى بعد الرفع للاستضافة، كان
 * سينسى هذا الملف حتماً لأنه لا يملك حتى السطر المطلوب تعديله.
 *
 * الاستخدام بعد رفع rizq-backend فعلياً على استضافة حقيقية:
 * غيّر القيمة أدناه مرة واحدة فقط هنا — تنعكس تلقائياً على كل الصفحات
 * التي تحمّل هذا الملف. يجب أن يطابق عنوان API الحقيقي (نفس الخادم الذي
 * يضبط ALLOWED_ORIGIN في rizq-backend/.env لاسم نطاق الواجهة).
 *
 * إنتاج: https://rizq.mr  |  تطوير محلي: http://localhost:3000
 * يُكتشف تلقائياً: localhost / معاينة Cursor → نفس الأصل ، غير ذلك → Render API
 * ═══════════════════════════════════════════════════════════════════
 */
(function () {
  if (window.RIZQ_BACKEND_BASE) return;
  var host = '';
  try { host = window.location.hostname || ''; } catch (e) {}
  var h = String(host || '').toLowerCase();
  var isTunnelPreview = h.endsWith('.cursorusercontent.com')
    || h.endsWith('.gitpod.io')
    || h.endsWith('.loca.lt')
    || h.endsWith('.localtunnel.me')
    || h.endsWith('.serveousercontent.com')
    || h.endsWith('.trycloudflare.com');
  /* GitHub Pages = واجهة ثابتة فقط — لا API على نفس الأصل */
  var isGitHubPages = /\.github\.io$/i.test(h);
  var isLocal = !h || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || isTunnelPreview;
  window.RIZQ_IS_LOCAL = isLocal && !isGitHubPages;
  // rizq-backend.onrender.com = مشروع قديم (Jobs API) — ليس خادم منصة رزق.
  // الخادم الصحيح يُنشأ من render.yaml باسم rizq-platform-api
  /* Local API is always rizq-backend on :3000 (static + /api same port).
     Do not use location.host — dev.ps1 may serve HTML on :5500 while API is :3000.
     Cursor / Gitpod previews serve HTML+API on the same forwarded origin.
     github.io → Render API حتى تُحمَّل نبضة السوق والإعلانات. */
  if (isGitHubPages) {
    window.RIZQ_BACKEND_BASE = 'https://rizq-platform-api.onrender.com';
  } else if (isTunnelPreview) {
    try {
      window.RIZQ_BACKEND_BASE = String(window.location.origin || '').replace(/\/$/, '');
    } catch (e2) {
      window.RIZQ_BACKEND_BASE = '';
    }
  } else if (isLocal) {
    window.RIZQ_BACKEND_BASE = 'http://' + (host || 'localhost') + ':3000';
  } else {
    // الإنتاج (rizq.mr على Hetzner): الواجهة والـAPI على نفس النطاق خلف Caddy
    try {
      window.RIZQ_BACKEND_BASE = String(window.location.origin || '').replace(/\/$/, '');
    } catch (e3) {
      window.RIZQ_BACKEND_BASE = '';
    }
  }
  /* إشارات أمان للعميل: demo dashboards فقط محلياً/معاينة */
  window.RIZQ_PUBLIC_CONFIG = Object.assign({}, window.RIZQ_PUBLIC_CONFIG || {}, {
    production: !isLocal,
    demoDashboardAllowed: !!isLocal,
  });
  /* يُحدَّث من /api/site-config.launch بعد التحميل؛ يُستعاد فوراً من localStorage لتجنّب رمشة DEMO */
  var _LAUNCH_CACHE_KEY = 'rizq_launch_cache_v1';
  var _launchDefaults = {
    launchDate: null,
    freeDays: 90,
    freeUntil: null,
    freePeriodActive: false,
    daysRemaining: null,
    maintenanceDryRun: true,
    openSections: null,
    foundingDiscountPercent: 40,
    minActiveAdsToShow: 0,
  };
  window.RIZQ_LAUNCH = window.RIZQ_LAUNCH || Object.assign({}, _launchDefaults);
  window.__RIZQ_LAUNCH_FROM_CACHE = false;
  window.__RIZQ_SITE_CONFIG_READY = false;
  try {
    var _cachedLaunch = null;
    try { _cachedLaunch = JSON.parse(localStorage.getItem(_LAUNCH_CACHE_KEY) || 'null'); } catch (eC0) { _cachedLaunch = null; }
    if (_cachedLaunch && typeof _cachedLaunch === 'object') {
      window.__RIZQ_LAUNCH_FROM_CACHE = true;
      window.RIZQ_LAUNCH = Object.assign({}, window.RIZQ_LAUNCH, {
        launchDate: _cachedLaunch.launchDate != null && _cachedLaunch.launchDate !== '' ? _cachedLaunch.launchDate : null,
        freeDays: _cachedLaunch.freeDays != null ? _cachedLaunch.freeDays : window.RIZQ_LAUNCH.freeDays,
        freeUntil: _cachedLaunch.freeUntil != null ? _cachedLaunch.freeUntil : window.RIZQ_LAUNCH.freeUntil,
        minActiveAdsToShow: Number(_cachedLaunch.minActiveAdsToShow) >= 0
          ? Number(_cachedLaunch.minActiveAdsToShow)
          : 0,
      });
    }
  } catch (eBootCache) {}
  if (!isLocal) window.__RIZQ_ALLOW_DEMO_DASH = false;

  function _persistLaunchCache(launch) {
    try {
      if (!launch || typeof launch !== 'object') return;
      localStorage.setItem(_LAUNCH_CACHE_KEY, JSON.stringify({
        launchDate: launch.launchDate || null,
        freeDays: launch.freeDays != null ? launch.freeDays : 90,
        freeUntil: launch.freeUntil || null,
        minActiveAdsToShow: Number(launch.minActiveAdsToShow) >= 0 ? Number(launch.minActiveAdsToShow) : 0,
        savedAt: Date.now(),
      }));
    } catch (ePersist) {}
  }

  /* كاش طلبات عامة مشتركة — يمنع تكرار /api/site-config و /api/accounts/public عند فتح المحل/المكتب */
  var _siteConfigPromise = null;
  var _publicAccountsByKey = Object.create(null);

  function _apiBase() {
    try { return String(window.RIZQ_BACKEND_BASE || '').replace(/\/$/, ''); }
    catch (e3) { return ''; }
  }

  window.RizqApi = window.RizqApi || {};
  window.RizqApi.siteConfig = function (opts) {
    opts = opts || {};
    if (_siteConfigPromise && !opts.force) return _siteConfigPromise;
    var base = _apiBase();
    if (!base || typeof fetch === 'undefined') {
      window.__RIZQ_SITE_CONFIG_READY = true;
      return Promise.resolve(null);
    }
    var init = opts.cache === 'no-store' ? { cache: 'no-store' } : undefined;
    _siteConfigPromise = fetch(base + '/api/site-config', init)
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (data) {
        try {
          var launch = data && data.config && data.config.launch;
          window.__RIZQ_SITE_CONFIG_READY = true;
          if (launch) {
            window.RIZQ_LAUNCH = Object.assign({}, window.RIZQ_LAUNCH || {}, launch);
            if (launch.minActiveAdsToShow == null) {
              window.RIZQ_LAUNCH.minActiveAdsToShow = Number(window.RIZQ_LAUNCH.minActiveAdsToShow) || 0;
            }
            _persistLaunchCache(window.RIZQ_LAUNCH);
            try {
              document.dispatchEvent(new CustomEvent('rizq:launch', { detail: window.RIZQ_LAUNCH }));
            } catch (eEv) {}
          }
        } catch (eLaunch) {
          window.__RIZQ_SITE_CONFIG_READY = true;
        }
        return data;
      })
      .catch(function () {
        window.__RIZQ_SITE_CONFIG_READY = true;
        return null;
      });
    return _siteConfigPromise;
  };
  window.RizqApi.publicAccounts = function (headers) {
    var base = _apiBase();
    if (!base || typeof fetch === 'undefined') return Promise.resolve(null);
    var key = 'default';
    try {
      if (headers && typeof headers === 'object') key = JSON.stringify(headers);
    } catch (e4) { key = 'default'; }
    if (_publicAccountsByKey[key]) return _publicAccountsByKey[key];
    _publicAccountsByKey[key] = fetch(base + '/api/accounts/public', headers ? { headers: headers } : undefined)
      .then(function (r) {
        if (!r || !r.ok) return null;
        return r.json();
      })
      .catch(function () { return null; });
    return _publicAccountsByKey[key];
  };
  window.RizqApi.invalidatePublicAccounts = function () {
    _publicAccountsByKey = Object.create(null);
  };

  /**
   * مخزون DEMO_ADS / نوافذ العرض التجريبية:
   * - يظهر ما دام launchDate فارغاً في site-config
   * - يختفي تلقائياً عند ضبط تاريخ الإطلاق
   * - بلا كاش وبدون رد site-config بعد: يُمنع العرض لتجنّب الرمشة بعد الإطلاق
   * - ?demo=1 يُبقي الظهور للاختبار فقط حتى بعد الإطلاق
   */
  window.RizqDemo = window.RizqDemo || {};
  window.RizqDemo.inventoryAllowed = function () {
    try {
      if (/[?&]demo=1(?:&|$)/.test(String(window.location && window.location.search || ''))) {
        return true;
      }
    } catch (eDemoQ) {}
    try {
      if (!window.__RIZQ_LAUNCH_FROM_CACHE && !window.__RIZQ_SITE_CONFIG_READY) {
        return false;
      }
      var ld = window.RIZQ_LAUNCH && window.RIZQ_LAUNCH.launchDate;
      return !ld;
    } catch (eDemoL) {
      return false;
    }
  };
  window.RizqDemo.minActiveAdsToShow = function () {
    try {
      var n = Number(window.RIZQ_LAUNCH && window.RIZQ_LAUNCH.minActiveAdsToShow);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
    } catch (eMin) {
      return 0;
    }
  };
  /* جلب مبكّر لـ launchDate حتى تتكيّف الصفحات قبل الرسم النهائي */
  try {
    if (typeof window.RizqApi.siteConfig === 'function') {
      window.RizqApi.siteConfig();
    }
  } catch (eBootCfg) {}
})();
