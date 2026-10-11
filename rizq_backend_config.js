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
  var isPreview = h.endsWith('.cursorusercontent.com')
    || h.endsWith('.gitpod.io')
    || h.endsWith('.loca.lt')
    || h.endsWith('.localtunnel.me')
    || h.endsWith('.serveousercontent.com')
    || h.endsWith('.trycloudflare.com')
    || /\.github\.io$/i.test(h);
  var isLocal = !h || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local') || isPreview;
  window.RIZQ_IS_LOCAL = isLocal;
  // rizq-backend.onrender.com = مشروع قديم (Jobs API) — ليس خادم منصة رزق.
  // الخادم الصحيح يُنشأ من render.yaml باسم rizq-platform-api
  /* Local API is always rizq-backend on :3000 (static + /api same port).
     Do not use location.host — dev.ps1 may serve HTML on :5500 while API is :3000.
     Cursor / Gitpod previews serve HTML+API on the same forwarded origin. */
  if (isPreview) {
    try {
      window.RIZQ_BACKEND_BASE = String(window.location.origin || '').replace(/\/$/, '');
    } catch (e2) {
      window.RIZQ_BACKEND_BASE = '';
    }
  } else if (isLocal) {
    window.RIZQ_BACKEND_BASE = 'http://' + (host || 'localhost') + ':3000';
  } else {
    window.RIZQ_BACKEND_BASE = 'https://rizq-platform-api.onrender.com';
  }
  /* إشارات أمان للعميل: demo dashboards فقط محلياً/معاينة */
  window.RIZQ_PUBLIC_CONFIG = Object.assign({}, window.RIZQ_PUBLIC_CONFIG || {}, {
    production: !isLocal,
    demoDashboardAllowed: !!isLocal,
  });
  if (!isLocal) window.__RIZQ_ALLOW_DEMO_DASH = false;

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
      return Promise.resolve(null);
    }
    var init = opts.cache === 'no-store' ? { cache: 'no-store' } : undefined;
    _siteConfigPromise = fetch(base + '/api/site-config', init)
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .catch(function () { return null; });
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
})();
