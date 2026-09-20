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
      + 'html body footer .footer-links li a{white-space:nowrap}'
      /* نمط شريط المحادثة (rag-legal): روابط سريعة كحبوب + تواصل مضغوط */
      + 'footer.rizq-footer .rzq-ft-pill-wrap{display:flex;flex-wrap:wrap;align-items:center;'
      + 'justify-content:center;gap:6px;margin:0 0 10px}'
      + 'footer.rizq-footer .rzq-ft-pill-wrap a{color:#e8c96a!important;font-size:11.5px!important;'
      + 'font-weight:800!important;text-decoration:none!important;padding:6px 10px!important;'
      + 'border-radius:8px!important;background:rgba(255,255,255,.06)!important;'
      + 'border:1px solid rgba(201,168,76,.28)!important;display:inline-flex!important;'
      + 'align-items:center;line-height:1.15;white-space:nowrap}'
      + 'footer.rizq-footer .rzq-ft-pill-wrap a:hover{background:rgba(201,168,76,.16)!important;'
      + 'border-color:rgba(201,168,76,.55)!important;color:#fff!important}'
      + 'footer.rizq-footer .rzq-ft-contact-grid{display:grid;grid-template-columns:1fr 1fr;'
      + 'gap:4px 10px;font-size:11.5px;line-height:1.35;max-width:420px;margin:0 auto}'
      + 'footer.rizq-footer .rzq-ft-contact-grid > li:last-child{grid-column:1/-1;text-align:center}'
      + 'footer.rizq-footer.rzq-ft-compact-layout .footer-grid{'
      + 'grid-template-columns:1fr!important;gap:14px!important;text-align:center}'
      + 'footer.rizq-footer.rzq-ft-compact-layout .footer-grid > div:first-child{display:none}'
      + 'footer.rizq-footer.rzq-ft-compact-layout .footer-col-title{margin-bottom:8px!important;'
      + 'font-size:10.5px!important;letter-spacing:.4px!important}'
      + '@media (max-width:600px){footer.rizq-footer .rzq-ft-contact-grid{grid-template-columns:1fr;'
      + 'justify-items:center}}';
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

  function compactFooterLikeAuthGate(footerEl, grid) {
    if (!footerEl || !grid || footerEl.getAttribute('data-rzq-ft-compacted') === '1') return;
    footerEl.setAttribute('data-rzq-ft-compacted', '1');
    footerEl.classList.add('rzq-ft-compact-layout');

    var quickCol = null;
    var contactCol = null;
    var cols = grid.children;
    for (var i = 0; i < cols.length; i++) {
      var title = cols[i].querySelector('.footer-col-title, h4');
      var t = title ? (title.getAttribute('data-t') || '') : '';
      var txt = title ? (title.textContent || '') : '';
      if (t === 'ft-quick' || /روابط سريعة|Liens rapides/i.test(txt)) quickCol = cols[i];
      if (t === 'ft-contact' || /تواصل معنا|Contact/i.test(txt)) contactCol = cols[i];
    }
    if (quickCol) {
      var links = quickCol.querySelectorAll('.footer-links a');
      if (links.length) {
        var pill = document.createElement('div');
        pill.className = 'rzq-ft-pill-wrap';
        var want = [
          { re: /رئيسية|Accueil|Home/i, href: 'rizq_landing_v8.html', ar: 'الرئيسية', fr: 'Accueil' },
          { re: /تصف|Browse|Annonces/i, href: 'rizq_browse.html', ar: 'تصفّح', fr: 'Parcourir' },
          { re: /مساعدة|Help|aide/i, href: 'rizq_help.html', ar: 'المساعدة', fr: 'Aide' },
          { re: /شروط|Conditions|Terms/i, href: 'rizq_legal.html#s2', ar: 'الشروط', fr: 'Conditions' },
          { re: /خصوص|Privacy|Confidential/i, href: 'rizq_legal.html#s3', ar: 'الخصوصية', fr: 'Confidentialité' }
        ];
        var fr = lang() === 'fr';
        want.forEach(function (w) {
          var found = null;
          for (var j = 0; j < links.length; j++) {
            if (w.re.test(links[j].textContent || '') || (links[j].getAttribute('href') || '').indexOf(w.href.split('#')[0]) !== -1) {
              found = links[j];
              break;
            }
          }
          var a = document.createElement('a');
          a.href = found ? found.getAttribute('href') : w.href;
          a.textContent = fr ? w.fr : w.ar;
          if ((a.href || '').indexOf('rizq_legal') !== -1) {
            a.target = '_blank';
            a.rel = 'noopener';
          }
          pill.appendChild(a);
        });
        var ul = quickCol.querySelector('.footer-links');
        if (ul) ul.style.display = 'none';
        quickCol.appendChild(pill);
      }
    }
    if (contactCol) {
      var cul = contactCol.querySelector('.footer-links');
      if (cul) cul.classList.add('rzq-ft-contact-grid');
    }
    /* أخفِ أعمدة «أبرز الأقسام» و«المساعدة» — الروابط السريعة تغطيها */
    for (var k = 0; k < cols.length; k++) {
      if (cols[k] === quickCol || cols[k] === contactCol) continue;
      var ht = cols[k].querySelector('.footer-col-title, h4');
      var hd = ht ? (ht.getAttribute('data-t') || '') : '';
      if (hd === 'ft-topcats' || hd === 'ft-help' || hd === 'ft-desc') {
        cols[k].style.display = 'none';
      } else if (ht && /أبرز الأقسام|المساعدة|Catégories|Aide/i.test(ht.textContent || '')) {
        cols[k].style.display = 'none';
      }
    }
  }

  function init() {
    var grid = document.querySelector('.footer-grid');
    if (!grid || grid.closest('.rzq-ft-collapse-wrap')) return; // لا فوتر بهذا النمط، أو حُقن مسبقاً

    injectStyle();

    var footerEl = grid.closest('footer'); // قبل أي نقل DOM — closest() يعمل من مكانه الأصلي
    try { compactFooterLikeAuthGate(footerEl, grid); } catch (eCompact) { /* ignore */ }
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

    var open = false;
    var api = {
      setOpen: function (next) {
        open = !!next;
        render();
      },
      isOpen: function () { return open; },
      toggle: function () {
        open = !open;
        render();
      }
    };
    function render() {
      btn.setAttribute('aria-expanded', String(open));
      var txt = btn.querySelector('.rzq-ft-txt');
      if (txt) txt.textContent = label(open);
      /* استخدم صنفاً بدل !important خارجي حتى يعمل الإخفاء دائماً */
      wrap.classList.toggle('rzq-ft-open', open);
      wrap.style.maxHeight = open ? (Math.max(wrap.scrollHeight, 400) + 'px') : '0px';
      wrap.style.overflow = open ? 'visible' : 'hidden';
      if (footerEl) footerEl.classList.toggle('rzq-ft-compact', !open);
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      open = !open;
      render();
    });
    // إعادة حساب الارتفاع عند تغيير حجم النافذة (مثلاً تدوير الجوال) حتى لا
    // يُقطَع المحتوى إن كانت القيمة المحسوبة سابقاً أصغر من الحقيقية الجديدة
    window.addEventListener('resize', function () {
      if (open) wrap.style.maxHeight = Math.max(wrap.scrollHeight, 400) + 'px';
    }, { passive: true });
    // تحديث نص الزر عند تبديل اللغة (rizq_i18n.js يُصدر هذا الحدث)
    document.addEventListener('rizq:langchange', function () {
      var txt = btn.querySelector('.rzq-ft-txt');
      if (txt) txt.textContent = label(open);
    });

    window.__rizqFooterToggleApi = api;
    render();
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
    init();
    hookFooterStats();
    setTimeout(hookFooterStats, 80);
    setTimeout(hookFooterStats, 400);
  }

  /* يُستدعى بعد حقن الفوتر الموحّد ديناميكياً (rizq_site_footer.js) */
  window.RizqFooterToggleRefresh = function () {
    try {
      injectStyle();
      init();
      hookFooterStats();
    } catch (e) {}
  };

  window.RizqFooterToggle = {
    setOpen: function (next) {
      try {
        if (window.__rizqFooterToggleApi && typeof window.__rizqFooterToggleApi.setOpen === 'function') {
          window.__rizqFooterToggleApi.setOpen(!!next);
          return;
        }
      } catch (e) {}
      /* احتياطي قبل اكتمال init */
      var wrap = document.querySelector('.rzq-ft-collapse-wrap');
      var btn = document.querySelector('.rzq-ft-toggle-btn');
      var footerEl = document.querySelector('footer.rizq-footer, body > footer');
      if (!wrap) return;
      var open = !!next;
      wrap.classList.toggle('rzq-ft-open', open);
      wrap.style.maxHeight = open ? (Math.max(wrap.scrollHeight, 400) + 'px') : '0px';
      wrap.style.overflow = open ? 'visible' : 'hidden';
      if (btn) {
        btn.setAttribute('aria-expanded', String(open));
        var txt = btn.querySelector('.rzq-ft-txt');
        if (txt) txt.textContent = label(open);
      }
      if (footerEl) footerEl.classList.toggle('rzq-ft-compact', !open);
    },
    isOpen: function () {
      try {
        if (window.__rizqFooterToggleApi) return !!window.__rizqFooterToggleApi.isOpen();
      } catch (e2) {}
      var btn = document.querySelector('.rzq-ft-toggle-btn');
      return !!(btn && btn.getAttribute('aria-expanded') === 'true');
    }
  };

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
