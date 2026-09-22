/* ════════════════════════════════════════════════════════════════
   rizq_footer_toggle.js — طيّ أعمدة الفوتر افتراضياً على كل الصفحات
   ────────────────────────────────────────────────────────────────
   طلب Limam: الفوتر (خمسة أعمدة مثل الصفحة الرئيسية) طويل على
   الشاشات الصغيرة. زر نقر واحد يطوي/يفتح أعمدة الروابط (.footer-grid)
   مع الإبقاء على شريط الحقوق (.footer-bottom) ظاهراً دائماً.

   مهم: لا نحوّل الفوتر إلى «حبوب» مضغوطة (LIENS RAPIDES pills) —
   الشكل الموحّد = نفس شبكة الصفحة الرئيسية (شعار + روابط + أقسام
   + مساعدة + تواصل). التسجيل/البوابة تستدعي setOpen(true) لإظهاره.

   ملف مشترك:
     <script src="rizq_footer_toggle.js" defer></script>
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
      + 'footer.rzq-ft-compact{padding-top:14px!important;transition:padding-top .35s ease}'
      + 'html body footer,html body footer.rizq-footer{'
      + 'background:linear-gradient(180deg,#0D1B2A,#071020)!important;'
      + 'background-blend-mode:normal!important}'
      + 'html body footer .footer-desc,html body footer .footer-links a,'
      + 'html body footer .footer-copy,html body footer .logo-sub{'
      + 'color:rgba(255,255,255,.82)!important}'
      + 'html body footer .footer-links a:hover{color:#C9A84C!important}'
      + 'html body footer .footer-links li a{white-space:nowrap}'
      /* شبكة الصفحة الرئيسية دائماً — لا نمط الحبوب المضغوط */
      + 'footer.rizq-footer .footer-grid{display:grid!important;'
      + 'grid-template-columns:2fr 1fr 1fr 1fr 1.2fr!important;gap:28px!important;'
      + 'max-width:1200px!important;margin:0 auto!important;text-align:start!important}'
      + 'footer.rizq-footer .footer-grid > div{display:block!important}'
      + 'footer.rizq-footer .rzq-ft-pill-wrap{display:none!important}'
      + '@media (max-width:900px){footer.rizq-footer .footer-grid{'
      + 'grid-template-columns:1fr 1fr 1fr!important;gap:22px!important}}'
      + '@media (max-width:600px){footer.rizq-footer .footer-grid{'
      + 'grid-template-columns:1fr!important;gap:20px!important}}';
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

  /** أزل آثار التحويل القديم إلى حبوب إن وُجدت من جلسة سابقة / كاش */
  function restoreFullFooterLayout(footerEl, grid) {
    if (!footerEl || !grid) return;
    footerEl.classList.remove('rzq-ft-compact-layout');
    footerEl.removeAttribute('data-rzq-ft-compacted');
    var pills = grid.querySelectorAll('.rzq-ft-pill-wrap');
    for (var i = 0; i < pills.length; i++) {
      try { pills[i].parentNode.removeChild(pills[i]); } catch (e) {}
    }
    var cols = grid.children;
    for (var k = 0; k < cols.length; k++) {
      cols[k].style.display = '';
      var ul = cols[k].querySelector('.footer-links');
      if (ul) {
        ul.style.display = '';
        ul.classList.remove('rzq-ft-contact-grid');
      }
    }
  }

  function init() {
    var grid = document.querySelector('.footer-grid');
    if (!grid || grid.closest('.rzq-ft-collapse-wrap')) return;

    injectStyle();

    var footerEl = grid.closest('footer');
    try { restoreFullFooterLayout(footerEl, grid); } catch (eRestore) { /* ignore */ }
    shrinkFooterBottom(footerEl);

    var wrap = document.createElement('div');
    wrap.className = 'rzq-ft-collapse-wrap';
    grid.parentNode.insertBefore(wrap, grid);
    wrap.appendChild(grid);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rzq-ft-toggle-btn';
    btn.setAttribute('aria-expanded', 'false');
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
      wrap.classList.toggle('rzq-ft-open', open);
      wrap.style.maxHeight = open ? (Math.max(wrap.scrollHeight, 520) + 'px') : '0px';
      wrap.style.overflow = open ? 'visible' : 'hidden';
      if (footerEl) footerEl.classList.toggle('rzq-ft-compact', !open);
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      open = !open;
      render();
    });
    window.addEventListener('resize', function () {
      if (open) wrap.style.maxHeight = Math.max(wrap.scrollHeight, 520) + 'px';
    }, { passive: true });
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
      ? ('Rizq — le marché quotidien de Mauritanie : achetez, vendez et gérez depuis une seule plateforme — ' + st.n + ' catégories, +' + st.m + ' sous-catégories.')
      : ('رزق — سوق موريتانيا اليومي: تسوّق، بع، وأدر عملك من منصة واحدة — ' + st.n + ' قسماً و' + st.m + '+ فرعاً.');
    document.querySelectorAll('#rzq-ft-desc, footer .footer-desc, [data-t="ft-desc"]').forEach(function (el) {
      el.textContent = desc;
    });
    var why2 = document.querySelector('[data-t="why2-title"]');
    if (why2) {
      why2.textContent = fr
        ? 'Tout ce que vous cherchez… bien rangé'
        : 'كل ما تريده… منظّماً';
    }
    var why2desc = document.querySelector('[data-t="why2-desc"]');
    if (why2desc) {
      why2desc.textContent = fr
        ? ("De l'immobilier aux chameaux, de la daraa aux engins — " + st.n + ' catégories et +' + st.m + ' sous-catégories pour découvrir et acheter plus vite.')
        : ('من العقارات إلى الإبل، من الدراعة إلى الحفارات — ' + st.n + ' قسماً و' + st.m + '+ فرعاً تجعل الاكتشاف ممتعاً والشراء أسرع.');
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
    window._rzqApplyFooterStats = applyFooterStats;
  }

  function boot() {
    injectStyle();
    init();
    hookFooterStats();
    setTimeout(hookFooterStats, 80);
    setTimeout(hookFooterStats, 400);
  }

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
      var wrap = document.querySelector('.rzq-ft-collapse-wrap');
      var btn = document.querySelector('.rzq-ft-toggle-btn');
      var footerEl = document.querySelector('footer.rizq-footer, body > footer');
      if (!wrap) return;
      var open = !!next;
      wrap.classList.toggle('rzq-ft-open', open);
      wrap.style.maxHeight = open ? (Math.max(wrap.scrollHeight, 520) + 'px') : '0px';
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
