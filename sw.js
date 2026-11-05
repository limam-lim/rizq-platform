/**
 * sw.js — Service Worker لمنصة رزق (PWA)
 * ═══════════════════════════════════════════════════════
 * الهدف: تخزين الأصول الثابتة مؤقتاً (CSS، محرك اللغة، الأيقونات)
 * لتحميل أسرع عند الزيارات المتكررة، وعمل جزئي بلا إنترنت
 * (مفيد جداً مع جودة الإنترنت المتذبذبة في موريتانيا).
 *
 * القواعد:
 *  - لا نتدخل أبداً في طلبات POST أو نداءات /api/ — يجب أن تبقى حيّة دائماً
 *  - الصور/CSS: cache-first (سرعة) مع تحديث الكاش في الخلفية
 *  - صفحات HTML: network-first مع fallback للكاش (لتفادي تجمّد محتوى قديم)
 * ═══════════════════════════════════════════════════════
 */
'use strict';

/* يطابق ASSET_V / SW_CACHE في rizq_pwa.js — ارفع الاثنين معاً عند كل إصدار */
var CACHE_NAME = 'rizq-cache-v31.35';
var CORE_ASSETS = [
  'rizq-theme.css?v=31.35',
  'rizq_header.css?v=31.35',
  'rizq_header_mockup_trial.css?v=5.99',
  'rizq_account_route.js?v=31.35',
  'rizq_header.js?v=31.35',
  'rizq_header_mockup_trial.js?v=5.99',
  'rizq_agent.js?v=31.35',
  'rizq_dynamic_nav.js?v=31.35',
  'rizq_manager_agent_config.js?v=31.35',
  'rizq_widget_embed.js?v=31.35',
  'rizq_home_guide.js?v=31.35',
  'rizq_productivity.js?v=31.35',
  'rizq_i18n.js?v=31.35',
  'rizq_i18n_data.js?v=31.35',
  'favicon-192.png',
  'favicon-32.png',
  'favicon-16.png',
  'rizq-mark.svg',
  'rizq-mark-512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS).catch(function () {
        /* تجاهل فشل تحميل ملف واحد فلا يوقف التثبيت كله */
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (k) { return k !== CACHE_NAME; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function (event) {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  if (req.method !== 'GET') return; // لا نتدخل في POST/PUT/DELETE

  var url = new URL(req.url);

  // نداءات الـ API (تسجيل، دخول، بيانات حيّة) — تمر مباشرة، بلا كاش أبداً
  if (url.pathname.indexOf('/api/') !== -1) return;

  /* HTML/CSS/JS always from network — never serve stale layout scripts */
  if (/\.(html|css|js)(\?|$)/i.test(url.pathname)) {
    event.respondWith(
      fetch(req).catch(function () { return caches.match(req); })
    );
    return;
  }

  var isStaticAsset = /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname);

  if (isStaticAsset) {
    // cache-first: يرجع من الكاش فوراً، ويحدّث الكاش في الخلفية
    event.respondWith(
      caches.match(req).then(function (cached) {
        var network = fetch(req)
          .then(function (res) {
            var clone = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
            return res;
          })
          .catch(function () { return cached; });
        return cached || network;
      })
    );
    return;
  }

  event.respondWith(
    fetch(req).catch(function () { return caches.match(req); })
  );
});
