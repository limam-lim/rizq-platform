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
 * يُكتشف تلقائياً: localhost → :3000 ، أي نطاق آخر → Render API
 * ═══════════════════════════════════════════════════════════════════
 */
(function () {
  if (window.RIZQ_BACKEND_BASE) return;
  var host = '';
  try { host = window.location.hostname || ''; } catch (e) {}
  var isLocal = !host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  // rizq-backend.onrender.com = مشروع قديم (Jobs API) — ليس خادم منصة رزق.
  // الخادم الصحيح يُنشأ من render.yaml باسم rizq-platform-api
  window.RIZQ_BACKEND_BASE = isLocal ? 'http://localhost:3000' : 'https://rizq-platform-api.onrender.com';
})();
