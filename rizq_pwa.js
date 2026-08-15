/**
 * rizq_pwa.js
 * ═══════════════════════════════════════════════════════
 * تفعيل خاصية PWA (تطبيق ويب تقدّمي) لمنصة رزق — يعمل شبه تطبيق حقيقي:
 * يُنصَّب على الشاشة الرئيسية للهاتف، ويعمل جزئياً بلا إنترنت.
 *
 * الاستخدام: <script src="rizq_pwa.js" defer></script> في كل صفحة
 *
 * يقوم بـ:
 *  1. حقن <link rel="manifest"> و meta theme-color في <head>
 *     (بدل تعديل كل ملف HTML يدوياً لإضافة الوسوم الثابتة)
 *  2. تسجيل Service Worker (sw.js) لتفعيل التخزين المؤقت
 * ═══════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  try {
    if (!document.querySelector('link[rel="manifest"]')) {
      var link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.json';
      document.head.appendChild(link);
    }
    if (!document.querySelector('meta[name="theme-color"]')) {
      var meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#1B3A6B';
      document.head.appendChild(meta);
    }
  } catch (e) { /* لا نكسر الصفحة إن فشل الحقن */ }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('Rizq PWA: تعذّر تسجيل service worker', err);
      });
    });
  }
})();
