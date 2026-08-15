/* ════════════════════════════════════════════════════════════════
   rizq_footer_toggle.js — طيّ أعمدة الفوتر افتراضياً على كل الصفحات
   ────────────────────────────────────────────────────────────────
   طلب Limam (2026-08-11): الفوتر (خصوصاً بخمسة أعمدة) طويل جداً على
   الشاشات الصغيرة و"يغطي الصفحة كاملة" عند التمرير لأسفل. الحل المتفق
   عليه بعد نقاش (hover لا يعمل على الجوال — الغالبية العظمى من الزوار):
   زر نقر/لمس واحد يعمل بنفس الطريقة على كل الأجهزة، بدل تمييز حاسوب/
   جوال. أعمدة الروابط (.footer-grid) مطوية افتراضياً، شريط الحقوق
   والتوقيع (.footer-bottom) يبقى ظاهراً دائماً كما هو.

   ملف واحد مشترك بدل تكرار نفس الشيفرة CSS/JS في 15 صفحة عامة — يكفي
   سطر واحد فقط في كل صفحة:
     <script src="rizq_footer_toggle.js" defer></script>
   لا حاجة لأي تعديل آخر في HTML/CSS لكل صفحة؛ يبحث تلقائياً عن أول
   .footer-grid في الصفحة ويحقنه بالكامل. صفحات بلا .footer-grid
   (كالداشبوردات) — لا يفعل شيئاً (fail-safe صامت).
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function lang() {
    try {
      if (typeof window._rizqLang === 'function') return window._rizqLang();
      if (window.RizqI18n && typeof window.RizqI18n.getLang === 'function') return window.RizqI18n.getLang();
    } catch (e) {}
    var htmlLang = document.documentElement.getAttribute('lang');
    return htmlLang === 'fr' ? 'fr' : 'ar';
  }

  function injectStyle() {
    if (document.getElementById('rzq-ft-toggle-css')) return;
    var css = ''
      + '.rzq-ft-toggle-btn{display:flex;align-items:center;justify-content:center;gap:5px;'
      + 'margin:0 auto 9px;padding:4px 13px;background:rgba(201,168,76,.08);'
      + 'border:1px solid rgba(201,168,76,.32);border-radius:100px;color:#C9A84C;'
      + 'font-size:10.5px;font-weight:700;cursor:pointer;transition:all .25s ease;'
      + 'font-family:inherit;width:max-content;max-width:90%;text-align:center;'
      + 'position:relative;z-index:1}'
      + '.rzq-ft-toggle-btn:hover{background:rgba(201,168,76,.16);border-color:#C9A84C}'
      + '.rzq-ft-toggle-btn .rzq-ft-chev{display:inline-block;font-size:8.5px;transition:transform .3s ease}'
      + '.rzq-ft-toggle-btn[aria-expanded="true"] .rzq-ft-chev{transform:rotate(180deg)}'
      + '.rzq-ft-collapse-wrap{max-height:0;overflow:hidden;transition:max-height .4s ease}'
      + '@media (prefers-reduced-motion: reduce){.rzq-ft-collapse-wrap{transition:none}}'
      // الفوتر الأصلي في كل صفحة يُعرَّف بحشوة علوية سخية (padding-top) لأنها
      // صُمِّمت لاستيعاب أعمدة الروابط الطويلة أسفلها. الآن بعد الطيّ الافتراضي
      // يظهر هذا الفراغ فارغاً وغير جذّاب — نقلّصه فقط في الحالة المطوية
      // (rzq-ft-compact) عبر !important لتجاوز أي padding!important محدَّد
      // مسبقاً لكل صفحة على حدة، ونعيده تلقائياً للحجم الأصلي عند الفتح.
      + 'footer.rzq-ft-compact{padding-top:14px!important;transition:padding-top .35s ease}';
    var style = document.createElement('style');
    style.id = 'rzq-ft-toggle-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function label(open) {
    var fr = lang() === 'fr';
    if (fr) return open ? 'Masquer les liens' : 'Liens et catégories';
    return open ? 'إخفاء الروابط' : 'روابط وأقسام';
  }

  // تصغير شريط الحقوق/التوقيع (.footer-bottom) — طلب Limam بعد معاينة
  // الشكل المطوي: "شريط الحقوق والشعار صغّر حجمه قليلاً، هذا يعطيه جاذبية
  // أكثر". هذا الشريط يبقى ظاهراً دائماً (خارج نطاق الطيّ)، فتصغيره دائم
  // وغير مرتبط بحالة فتح/إغلاق الأقسام. العناصر مُنسَّقة عبر inline style
  // في كل صفحة (لا صنف مخصص للشارة) — بدل مطاردة كل صفحة بتعديل يدوي،
  // نستهدفها هنا برمجياً عبر بصمة بنيتها الثابتة (نفس التصميم في كل مكان)
  // ونضبط القيم مباشرة عبر JS، فتُطبَّق فوراً دون أي صراع أولوية CSS.
  function shrinkFooterBottom(scope) {
    var fb = (scope || document).querySelector('.footer-bottom');
    if (!fb || fb.dataset.rzqSlim) return;
    fb.dataset.rzqSlim = '1';
    fb.style.padding = '12px 0';
    fb.style.gap = '8px';
    fb.querySelectorAll('.footer-copy').forEach(function (p) { p.style.fontSize = '10.5px'; });
    var icon = fb.querySelector('[style*="34px"]');
    if (icon) {
      icon.style.width = '26px';
      icon.style.height = '26px';
      icon.style.fontSize = '7px';
      var box = icon.parentElement;
      if (box) { box.style.padding = '6px 14px'; box.style.gap = '9px'; }
      var textWrap = icon.nextElementSibling;
      if (textWrap && textWrap.children.length >= 2) {
        textWrap.children[0].style.fontSize = '11px';
        textWrap.children[1].style.fontSize = '7px';
      }
    }
  }

  function init() {
    var grid = document.querySelector('.footer-grid');
    if (!grid || grid.closest('.rzq-ft-collapse-wrap')) return; // لا فوتر بهذا النمط، أو حُقن مسبقاً

    injectStyle();

    var footerEl = grid.closest('footer'); // قبل أي نقل DOM — closest() يعمل من مكانه الأصلي
    shrinkFooterBottom(footerEl);

    // لفّ .footer-grid بغلاف قابل للطي دون المساس بأي display/grid خاص به
    // (بعض الصفحات تُعرّف display:grid!important على .footer-grid نفسها —
    // اللف بغلاف خارجي يتجاوز أي تعارض تخصيص CSS بدل محاولة كسره).
    var wrap = document.createElement('div');
    wrap.className = 'rzq-ft-collapse-wrap';
    grid.parentNode.insertBefore(wrap, grid);
    wrap.appendChild(grid);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rzq-ft-toggle-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', '');
    var idAttr = 'rzq-ft-panel-' + Math.random().toString(36).slice(2, 8);
    wrap.id = idAttr;
    btn.setAttribute('aria-controls', idAttr);
    btn.innerHTML = '<span class="rzq-ft-txt">' + label(false) + '</span><span class="rzq-ft-chev">▾</span>';
    wrap.parentNode.insertBefore(btn, wrap);

    var open = false;
    function render() {
      btn.setAttribute('aria-expanded', String(open));
      var txt = btn.querySelector('.rzq-ft-txt');
      if (txt) txt.textContent = label(open);
      wrap.style.maxHeight = open ? wrap.scrollHeight + 'px' : '0';
      if (footerEl) footerEl.classList.toggle('rzq-ft-compact', !open);
    }
    btn.addEventListener('click', function () {
      open = !open;
      render();
    });
    // إعادة حساب الارتفاع عند تغيير حجم النافذة (مثلاً تدوير الجوال) حتى لا
    // يُقطَع المحتوى إن كانت القيمة المحسوبة سابقاً أصغر من الحقيقية الجديدة
    window.addEventListener('resize', function () {
      if (open) wrap.style.maxHeight = wrap.scrollHeight + 'px';
    }, { passive: true });
    // تحديث نص الزر عند تبديل اللغة (rizq_i18n.js يُصدر هذا الحدث)
    document.addEventListener('rizq:langchange', function () {
      var txt = btn.querySelector('.rzq-ft-txt');
      if (txt) txt.textContent = label(open);
    });

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
