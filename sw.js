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

var CACHE_NAME = 'rizq-cache-v13.3';
var CORE_ASSETS = [
  'rizq-theme.css',
  'rizq_header.css',
  'rizq_header.js',
  'rizq_agent.js',
  'rizq_dynamic_nav.js',
  'rizq_manager_agent_config.js',
  'rizq_widget_embed.js',
  'rizq_i18n.js',
  'rizq_i18n_data.js',
  'favicon-192.png',
  'favicon-32.png',
  'favicon-16.png',
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  if (req.method !== 'GET') return; // لا نتدخل في POST/PUT/DELETE

  var url = new URL(req.url);

  // نداءات الـ API (تسجيل، دخول، بيانات حيّة) — تمر مباشرة، بلا كاش أبداً
  if (url.pathname.indexOf('/api/') !== -1) return;

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

  // صفحات HTML وبقية الملفات: network-first مع fallback للكاش عند انقطاع النت
  event.respondWith(
    fetch(req)
      .then(function (res) {
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        return res;
      })
      .catch(function () {
        return caches.match(req);
      })
  );
});
