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
    try {
      var saved = localStorage.getItem('rizq_lang');
      if (saved === 'fr' || saved === 'ar') return saved;
    } catch (e2) {}
    var htmlLang = document.documentElement.getAttribute('lang');
    return htmlLang === 'fr' ? 'fr' : 'ar';
  }

  function injectStyle() {
    var css = ''
      + '.rzq-ft-adminia-stack{display:flex;flex-direction:column;align-items:center;'
      + 'justify-content:flex-start;gap:8px;flex:0 0 auto;margin:0}'
      + '.rzq-ft-toggle-row{display:flex;justify-content:center;align-items:center;'
      + 'width:auto;max-width:100%;margin:0;padding:0;position:relative;z-index:2}'
      + '.rzq-ft-toggle-btn{display:flex;align-items:center;justify-content:center;gap:5px;'
      + 'margin:0;padding:5px 16px;background:rgba(201,168,76,.08);'
      + 'border:1px solid rgba(201,168,76,.32);border-radius:100px;color:#C9A84C;'
      + 'font-size:10.5px;font-weight:700;cursor:pointer;transition:all .25s ease;'
      + 'font-family:inherit;width:max-content;max-width:100%;text-align:center;'
      + 'position:relative;z-index:2}'
      + '.rzq-ft-toggle-btn:hover{background:rgba(201,168,76,.16);border-color:#C9A84C}'
      + '.rzq-ft-toggle-btn .rzq-ft-chev{display:inline-block;font-size:8.5px;transition:transform .3s ease}'
      + '.rzq-ft-toggle-btn[aria-expanded="true"] .rzq-ft-chev{transform:rotate(180deg)}'
      + '.rzq-ft-collapse-wrap{max-height:0;overflow:hidden;transition:max-height .4s ease}'
      + '.rzq-ft-collapse-wrap.rzq-ft-open{overflow:visible}'
      + '@media (prefers-reduced-motion: reduce){.rzq-ft-collapse-wrap{transition:none}}'
      // الفوتر الأصلي في كل صفحة يُعرَّف بحشوة علوية سخية (padding-top) لأنها
      // صُمِّمت لاستيعاب أعمدة الروابط الطويلة أسفلها. الآن بعد الطيّ الافتراضي
      // يظهر هذا الفراغ فارغاً وغير جذّاب — نقلّصه فقط في الحالة المطوية
      // (rzq-ft-compact) عبر !important لتجاوز أي padding!important محدَّد
      // مسبقاً لكل صفحة على حدة، ونعيده تلقائياً للحجم الأصلي عند الفتح.
      + 'footer.rzq-ft-compact{padding-top:14px!important;transition:padding-top .35s ease}'
      + 'html body footer,html body footer.rizq-footer{'
      + 'background:linear-gradient(180deg,#0D1B2A,#071020)!important;'
      + 'background-blend-mode:normal!important}'
      + 'html body footer .footer-desc,html body footer .footer-links a,'
      + 'html body footer .footer-copy,html body footer .logo-sub{'
      + 'color:rgba(255,255,255,.82)!important}'
      + 'html body footer .footer-links a:hover{color:#C9A84C!important}'
      + 'html body footer .footer-links li a{white-space:nowrap}';
    var style = document.getElementById('rzq-ft-toggle-css');
    if (!style) {
      style = document.createElement('style');
      style.id = 'rzq-ft-toggle-css';
      (document.body || document.head).appendChild(style);
    }
    style.textContent = css;
  }

  function findAdminiaBadge(fb) {
    if (!fb) return null;
    var named = fb.querySelector('.adminia-ft, .adminia-footer-logo');
    if (named) return named;
    var kids = fb.children;
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k.classList && (k.classList.contains('footer-copy') || k.classList.contains('rzq-ft-toggle-row') || k.classList.contains('rzq-ft-adminia-stack'))) continue;
      if ((k.textContent || '').indexOf('ADMINIA') !== -1) return k;
    }
    return null;
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
    btn.innerHTML = '<span class="rzq-ft-txt">' + label(false) + '</span><span class="rzq-ft-chev">▴</span>';
    var row = document.createElement('div');
    row.className = 'rzq-ft-toggle-row';
    row.appendChild(btn);
    var fb = footerEl && footerEl.querySelector('.footer-bottom');
    var badge = findAdminiaBadge(fb);
    if (badge && badge.parentNode) {
      var stack = document.createElement('div');
      stack.className = 'rzq-ft-adminia-stack';
      badge.parentNode.insertBefore(stack, badge);
      stack.appendChild(row);
      stack.appendChild(badge);
    } else if (fb && fb.parentNode) {
      fb.parentNode.insertBefore(row, fb);
    } else {
      wrap.parentNode.insertBefore(row, wrap.nextSibling);
    }

    var open = true;
    try {
      var savedOpen = localStorage.getItem('rzq_ft_open');
      if (savedOpen === '0') open = false;
      else if (savedOpen === '1') open = true;
    } catch (eOpen) {}
    function render() {
      btn.setAttribute('aria-expanded', String(open));
      var txt = btn.querySelector('.rzq-ft-txt');
      if (txt) txt.textContent = label(open);
      wrap.classList.toggle('rzq-ft-open', open);
      if (open) {
        wrap.style.maxHeight = 'none';
        wrap.style.overflow = 'visible';
      } else {
        wrap.style.maxHeight = '0';
        wrap.style.overflow = 'hidden';
      }
      if (footerEl) footerEl.classList.toggle('rzq-ft-compact', !open);
    }
    btn.addEventListener('click', function () {
      open = !open;
      try { localStorage.setItem('rzq_ft_open', open ? '1' : '0'); } catch (eSave) {}
      render();
    });
    // إعادة حساب الارتفاع عند تغيير حجم النافذة (مثلاً تدوير الجوال) حتى لا
    // يُقطَع المحتوى إن كانت القيمة المحسوبة سابقاً أصغر من الحقيقية الجديدة
    window.addEventListener('resize', function () {
      if (open) {
        wrap.style.maxHeight = 'none';
        wrap.style.overflow = 'visible';
      }
    }, { passive: true });
    // تحديث نص الزر عند تبديل اللغة (rizq_i18n.js يُصدر هذا الحدث)
    document.addEventListener('rizq:langchange', function () {
      var txt = btn.querySelector('.rzq-ft-txt');
      if (txt) txt.textContent = label(open);
    });

    render();
    applyFooterLinks(footerEl || document);
  }

  function catStats() {
    var grid = document.querySelector('.cats-grid');
    var extraN = 0;
    try {
      var extra = JSON.parse(localStorage.getItem('rizq_extra_categories') || '[]');
      if (Array.isArray(extra)) extraN = extra.filter(function (c) { return c && c.name; }).length;
    } catch (e3) {}
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem('rizq_cat_stats') || 'null'); } catch (e2) {}
    if (grid) {
      var n = grid.querySelectorAll('.cat-card:not([data-suggest="1"])').length;
      var m = grid.querySelectorAll('.cat-card:not([data-suggest="1"]) .drop-link').length;
      if (n) {
        var payload = { n: n, m: m };
        try { localStorage.setItem('rizq_cat_stats', JSON.stringify(payload)); } catch (e) {}
        return payload;
      }
    }
    if (saved && saved.n) {
      saved.n = Math.max(saved.n, 18 + extraN);
      return saved;
    }
    return { n: 18 + extraN, m: 135 };
  }

  function applyFooterStats() {
    var st = catStats();
    var fr = lang() === 'fr';
    var desc = fr
      ? ('La première plateforme d\'annonces classées en Mauritanie. ' + st.n + ' catégories, +' + st.m + ' sous-catégories.')
      : ('منصة الإعلانات المبوبة الأولى في موريتانيا. ' + st.n + ' قسماً، ' + st.m + '+ فرعاً، ملايين الفرص.');
    document.querySelectorAll('#rzq-ft-desc, footer .footer-desc, [data-t="ft-desc"]').forEach(function (el) {
      el.textContent = desc;
    });
    var why2 = document.querySelector('[data-t="why2-title"]');
    if (why2) {
      why2.textContent = fr
        ? (st.n + ' catégories et +' + st.m + ' sous-catégories')
        : (st.n + ' قسماً و' + st.m + '+ فرعاً');
    }
  }

  var FOOTER_HREF = {
    'ft-q1': 'rizq_landing_v8.html', 'rzq-ft-l1': 'rizq_landing_v8.html',
    'ft-q2': 'rizq_browse.html', 'rzq-ft-l2': 'rizq_browse.html',
    'ft-q3': 'rizq_post.html', 'rzq-ft-l3': 'rizq_post.html',
    'ft-q4': 'rizq_landing_v8.html#pricing', 'rzq-ft-l4': 'rizq_landing_v8.html#pricing',
    'ft-q5': 'rizq_landing_v8.html#about', 'rzq-ft-l5': 'rizq_landing_v8.html#about',
    'ft-h1': 'rizq_help.html', 'footer-help1': 'rizq_help.html', 'rzq-ft-h1': 'rizq_help.html',
    'ft-h2': 'rizq_legal.html#s3', 'footer-help2': 'rizq_legal.html#s3', 'rzq-ft-h2': 'rizq_legal.html#s3',
    'ft-h3': 'rizq_legal.html#s2', 'footer-help3': 'rizq_legal.html#s2', 'rzq-ft-h3': 'rizq_legal.html#s2',
    'ft-h4': 'rizq_legal.html#s10', 'footer-help4': 'rizq_legal.html#s10', 'rzq-ft-h4': 'rizq_legal.html#s10',
    'ft-h5': 'rizq_legal.html#s10', 'footer-col-contact': 'rizq_legal.html#s10', 'rzq-ft-h5': 'rizq_legal.html#s10',
    'ft-tc1': 'rizq_browse.html?cat=%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA', 'rzq-ft-c1': 'rizq_browse.html?cat=%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA',
    'ft-tc2': 'rizq_browse.html?cat=%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA', 'rzq-ft-c2': 'rizq_browse.html?cat=%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA',
    'ft-tc3': 'rizq_browse.html?cat=%D8%B4%D8%A7%D8%AD%D9%86%D8%A7%D8%AA', 'rzq-ft-c3': 'rizq_browse.html?cat=%D8%B4%D8%A7%D8%AD%D9%86%D8%A7%D8%AA',
    'ft-tc4': 'rizq_browse.html?cat=%D8%A5%D9%84%D9%83%D8%AA%D8%B1%D9%88%D9%86%D9%8A%D8%A7%D8%AA', 'rzq-ft-c4': 'rizq_browse.html?cat=%D8%A5%D9%84%D9%83%D8%AA%D8%B1%D9%88%D9%86%D9%8A%D8%A7%D8%AA',
    'ft-tc5': 'rizq_browse.html?cat=%D9%85%D8%A7%D8%B4%D9%8A%D8%A9', 'rzq-ft-c5': 'rizq_browse.html?cat=%D9%85%D8%A7%D8%B4%D9%8A%D8%A9'
  };
  var FOOTER_CAT_ORDER = [
    'rizq_browse.html?cat=%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA',
    'rizq_browse.html?cat=%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA',
    'rizq_browse.html?cat=%D8%B4%D8%A7%D8%AD%D9%86%D8%A7%D8%AA',
    'rizq_browse.html?cat=%D8%A5%D9%84%D9%83%D8%AA%D8%B1%D9%88%D9%86%D9%8A%D8%A7%D8%AA',
    'rizq_browse.html?cat=%D9%85%D8%A7%D8%B4%D9%8A%D8%A9'
  ];

  function applyFooterLinks(scope) {
    var root = scope || document;
    var footer = root.querySelector('footer');
    if (!footer) return;
    footer.querySelectorAll('a[data-t], a[id^="rzq-ft-"], a[id^="ft-"]').forEach(function (a) {
      var key = a.getAttribute('data-t') || a.id;
      if (key && FOOTER_HREF[key]) a.setAttribute('href', FOOTER_HREF[key]);
    });
    footer.querySelectorAll('.footer-col-title').forEach(function (h4) {
      var label = (h4.textContent || '') + ' ' + (h4.getAttribute('data-t') || '') + ' ' + (h4.id || '');
      if (!/topcats|tcats|Meilleures|أبرز|catégories/i.test(label)) return;
      var ul = h4.nextElementSibling;
      if (!ul || !ul.classList.contains('footer-links')) return;
      var links = ul.querySelectorAll('a[href*="rizq_browse"]');
      links.forEach(function (a, i) {
        if (FOOTER_CAT_ORDER[i]) a.setAttribute('href', FOOTER_CAT_ORDER[i]);
      });
    });
  }

  function hookFooterStats() {
    applyFooterStats();
    var prev = window._rzqApplyFt;
    if (prev && prev._rizqDyn) return;
    window._rzqApplyFt = function () {
      if (typeof prev === 'function') prev();
      applyFooterStats();
    };
    window._rzqApplyFt._rizqDyn = true;
    window._rizqApplyFooterStats = applyFooterStats;
  }

  function boot() {
    injectStyle();
    applyFooterLinks();
    init();
    hookFooterStats();
    setTimeout(function () { applyFooterLinks(); hookFooterStats(); }, 80);
    setTimeout(function () { applyFooterLinks(); hookFooterStats(); }, 400);
  }

  document.addEventListener('rizq:langchange', function () {
    applyFooterStats();
  });
  window.addEventListener('storage', function (e) {
    if (e.key === 'rizq_extra_categories' || e.key === 'rizq_cat_stats' || e.key === 'rizq_lang') {
      applyFooterStats();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
