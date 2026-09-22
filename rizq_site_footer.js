/**
 * rizq_site_footer.js — فوتر المنصة الموحّد (نفس الصفحة الرئيسية)
 * ─────────────────────────────────────────────────────────────
 * يحقن footer.rizq-footer (روابط سريعة + أبرز الأقسام + مساعدة + أرقام)
 * في أي صفحة زائر أو داشبورد لا يملك فوتراً كاملاً (.footer-grid).
 * يتخطّى الصفحات التي لديها الفوتر مسبقاً، ويستبدل الفوترات الناقصة.
 */
(function () {
  'use strict';
  if (window.__rizqSiteFooterInit) return;
  window.__rizqSiteFooterInit = true;

  function pathName() {
    try {
      return (location.pathname || '').split('/').pop() || '';
    } catch (e) {
      return '';
    }
  }

  function shouldSkip() {
    var p = pathName().toLowerCase();
    return /^(rizq_chat_widget|rizq_admin|chat_widget)(\.html)?$/.test(p);
  }

  function hasCompleteFooter() {
    return !!document.querySelector('footer .footer-grid, footer.rizq-footer .footer-grid');
  }

  function findMount() {
    return (
      document.querySelector('#main-content') ||
      document.querySelector('.main-content') ||
      document.querySelector('.main') ||
      document.body
    );
  }

  function removeIncompleteFooters() {
    var list = document.querySelectorAll('footer');
    for (var i = 0; i < list.length; i++) {
      var ft = list[i];
      if (ft.closest('#rag-overlay') || ft.closest('.disc-modal') || ft.closest('#modal')) continue;
      if (ft.id === 'rizq-site-footer') continue;
      if (!ft.querySelector('.footer-grid')) {
        try { ft.parentNode.removeChild(ft); } catch (e) {}
      }
    }
  }

  function injectCss() {
    if (document.getElementById('rzq-site-footer-css')) return;
    var css = ''
      + 'footer.rizq-footer{background:linear-gradient(180deg,#0d1b2e,#071020)!important;'
      + 'border-top:1px solid rgba(201,168,76,.1)!important;padding:48px 5% 0!important;'
      + 'color:rgba(255,255,255,.72)!important;margin:0!important;width:100%;box-sizing:border-box;'
      + 'position:relative;z-index:4}'
      + 'footer.rizq-footer .footer-grid{display:grid!important;'
      + 'grid-template-columns:2fr 1fr 1fr 1fr 1.2fr!important;gap:28px!important;'
      + 'max-width:1200px!important;margin:0 auto!important;padding-bottom:40px!important}'
      + 'footer.rizq-footer .footer-col-title{font-size:12px!important;font-weight:800!important;'
      + 'color:#C9A84C!important;letter-spacing:1.5px!important;text-transform:uppercase!important;'
      + 'margin:0 0 14px!important;font-family:Georgia,serif!important}'
      + 'footer.rizq-footer .footer-desc{font-size:13px!important;color:rgba(255,255,255,.85)!important;'
      + 'line-height:1.85!important;margin-top:12px!important;max-width:280px!important}'
      + 'footer.rizq-footer .footer-links{list-style:none!important;display:flex!important;'
      + 'flex-direction:column!important;padding:0!important;margin:0!important;gap:6px}'
      + 'footer.rizq-footer .footer-links li a{font-size:13px!important;color:#e0e0e0!important;'
      + 'text-decoration:none!important}'
      + 'footer.rizq-footer .footer-links li a:hover{color:#C9A84C!important}'
      + 'footer.rizq-footer .footer-bottom{border-top:1px solid rgba(255,255,255,.05)!important;'
      + 'padding:18px 0!important;max-width:1200px!important;margin:0 auto!important;'
      + 'display:flex!important;justify-content:space-between!important;align-items:center!important;'
      + 'flex-wrap:wrap!important;gap:10px!important}'
      + 'footer.rizq-footer .footer-copy{font-size:12px!important;color:rgba(255,255,255,.82)!important;margin:0}'
      + 'footer.rizq-footer .telecom-tag{display:inline-block;background:rgba(201,168,76,.14);'
      + 'border:1px solid rgba(201,168,76,.4);color:rgba(201,168,76,.95);font-size:10px;'
      + 'padding:4px 10px;border-radius:20px;font-weight:700}'
      + 'body.rizq-dash footer.rizq-footer,body.rizq-dash .main > footer.rizq-footer,'
      + 'body.rizq-dash .main-content > footer.rizq-footer{margin-top:auto}'
      + '@media(max-width:900px){footer.rizq-footer .footer-grid{grid-template-columns:1fr 1fr 1fr!important}}'
      + '@media(max-width:600px){footer.rizq-footer .footer-grid{grid-template-columns:1fr!important;'
      + 'gap:22px!important}footer.rizq-footer{padding:36px 4% 0!important}}';
    var style = document.createElement('style');
    style.id = 'rzq-site-footer-css';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function footerHtml() {
    return ''
      + '<footer class="rizq-footer" id="rizq-site-footer" data-rizq-injected="1">'
      + '  <div class="footer-grid">'
      + '    <div>'
      + '      <a href="rizq_landing_v8.html" class="logo" style="margin-bottom:14px;display:inline-flex;gap:10px;direction:ltr;align-items:center;height:42px">'
      + '        <img class="logo-mark-img" src="rizq-mark-512.png?v=9.6" width="42" height="42" alt="رزق"/>'
      + '        <div class="logo-text"><span class="logo-ar">رزق</span><span class="logo-sub">RIZQ PLATFORM</span></div>'
      + '      </a>'
      + '      <p class="footer-desc" data-t="ft-desc">رزق — سوق موريتانيا اليومي: تسوّق، بع، وأدر عملك من منصة واحدة.</p>'
      + '      <div style="display:flex;align-items:center;gap:6px;margin-top:16px;flex-wrap:wrap">'
      + '        <span data-t="ft-net-label" style="color:rgba(255,255,255,.8);font-size:11px">شبكات مدعومة:</span>'
      + '        <span class="telecom-tag">Mauritel</span><span class="telecom-tag">Mattel</span><span class="telecom-tag">Chinguitel</span>'
      + '      </div>'
      + '    </div>'
      + '    <div>'
      + '      <h4 class="footer-col-title" data-t="ft-quick">روابط سريعة</h4>'
      + '      <ul class="footer-links">'
      + '        <li><a href="rizq_landing_v8.html" data-t="ft-q1">الرئيسية</a></li>'
      + '        <li><a href="rizq_browse.html" data-t="ft-q2">تصفّح الإعلانات</a></li>'
      + '        <li><a href="rizq_post.html" data-t="ft-q3">انشر إعلانك</a></li>'
      + '        <li><a href="rizq_landing_v8.html#pricing" data-t="ft-q4">الأسعار</a></li>'
      + '        <li><a href="rizq_landing_v8.html#about" data-t="ft-q5">من نحن</a></li>'
      + '      </ul>'
      + '    </div>'
      + '    <div>'
      + '      <h4 class="footer-col-title" data-t="ft-topcats">أبرز الأقسام</h4>'
      + '      <ul class="footer-links">'
      + '        <li><a href="rizq_browse.html?cat=%D8%B9%D9%82%D8%A7%D8%B1%D8%A7%D8%AA" data-t="ft-tc1">🏠 منازل وعقارات</a></li>'
      + '        <li><a href="rizq_browse.html?cat=%D8%B3%D9%8A%D8%A7%D8%B1%D8%A7%D8%AA" data-t="ft-tc2">🚗 سيارات وقطع غيار</a></li>'
      + '        <li><a href="rizq_browse.html?cat=%D8%B4%D8%A7%D8%AD%D9%86%D8%A7%D8%AA" data-t="ft-tc3">🚛 شاحنات ومعدات</a></li>'
      + '        <li><a href="rizq_browse.html?cat=%D8%A5%D9%84%D9%83%D8%AA%D8%B1%D9%88%D9%86%D9%8A%D8%A7%D8%AA" data-t="ft-tc4">📱 هواتف وإلكترونيات</a></li>'
      + '        <li><a href="rizq_browse.html?cat=%D9%85%D8%A7%D8%B4%D9%8A%D8%A9" data-t="ft-tc5">🐄 ماشية وحيوانات</a></li>'
      + '      </ul>'
      + '    </div>'
      + '    <div>'
      + '      <h4 class="footer-col-title rizq-help-title" data-t="ft-help">المساعدة</h4>'
      + '      <ul class="footer-links">'
      + '        <li><a href="rizq_help.html" data-t="ft-h1">مركز المساعدة</a></li>'
      + '        <li><a href="rizq_legal.html#s3" data-t="ft-h2">سياسة الخصوصية</a></li>'
      + '        <li><a href="rizq_legal.html#s2" data-t="ft-h3">شروط الاستخدام</a></li>'
      + '        <li><a href="rizq_legal.html#s10" data-t="ft-h4">الإبلاغ عن إعلان</a></li>'
      + '        <li><a href="rizq_legal.html#s10" data-t="ft-h5">تواصل معنا</a></li>'
      + '      </ul>'
      + '    </div>'
      + '    <div>'
      + '      <h4 class="footer-col-title" data-t="ft-contact">تواصل معنا</h4>'
      + '      <ul class="footer-links footer-contact-list" style="gap:12px">'
      + '        <li class="footer-contact-row">📱 <strong class="carrier-name" style="color:#C9A84C">Mauritel:</strong> <a href="tel:+22244882212" dir="ltr" style="color:rgba(255,255,255,.75);text-decoration:none;direction:ltr;unicode-bidi:isolate">+222 44 88 22 12</a></li>'
      + '        <li class="footer-contact-row">📱 <strong class="carrier-name" style="color:#C9A84C">Mattel:</strong> <a href="tel:+22236485784" dir="ltr" style="color:rgba(255,255,255,.75);text-decoration:none;direction:ltr;unicode-bidi:isolate">+222 36 48 57 84</a></li>'
      + '        <li class="footer-contact-row">📱 <strong class="carrier-name" style="color:#C9A84C">Chinguitel:</strong> <a href="tel:+22222708338" dir="ltr" style="color:rgba(255,255,255,.75);text-decoration:none;direction:ltr;unicode-bidi:isolate">+222 22 70 83 38</a></li>'
      + '        <li class="footer-contact-row">📧 <a href="mailto:direction@rizq.mr" style="color:rgba(255,255,255,.75);text-decoration:none">direction@rizq.mr</a></li>'
      + '      </ul>'
      + '    </div>'
      + '  </div>'
      + '  <div class="footer-bottom">'
      + '    <p class="footer-copy" data-t="ft-copy">© 2026 رزق | Rizq — جميع الحقوق محفوظة 🇲🇷</p>'
      + '    <div class="adminia-ft" style="display:flex;align-items:center;gap:12px;padding:10px 20px;background:rgba(255,255,255,0.03);border:1px solid rgba(201,168,76,0.16);border-radius:12px">'
      + '      <div style="width:34px;height:34px;border-radius:9px;border:1.5px solid rgba(201,168,76,0.5);background:#0d0a04;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px;font-weight:700;color:#C9A84C;letter-spacing:2px;font-family:sans-serif">AML</div>'
      + '      <div>'
      + '        <div style="font-size:13px;font-weight:700;color:#fff;letter-spacing:2px;font-family:Georgia,serif;line-height:1">ADMINIA <span style="color:#C9A84C">SARL</span></div>'
      + '        <div style="font-size:8px;color:rgba(255,255,255,0.3);letter-spacing:1.5px;margin-top:3px">POWERED BY <span style="color:rgba(201,168,76,0.6);font-weight:700">M. LIMAM</span></div>'
      + '      </div>'
      + '    </div>'
      + '    <p class="footer-copy" data-t="ft-sig" style="display:flex;align-items:center;gap:4px"><span>بتوقيع</span><span style="color:#C9A84C">✍️</span><strong style="font-weight:600">ADMINIA SARL — Powered by M. LIMAM</strong></p>'
      + '  </div>'
      + '</footer>';
  }

  function ensureToggle() {
    try {
      if (typeof window.RizqFooterToggleRefresh === 'function') {
        window.RizqFooterToggleRefresh();
        return;
      }
    } catch (e) {}
    if (document.querySelector('script[src*="rizq_footer_toggle.js"]')) return;
    var s = document.createElement('script');
    s.src = 'rizq_footer_toggle.js?v=20';
    s.defer = true;
    document.head.appendChild(s);
  }

  function boot() {
    if (shouldSkip()) return;
    if (hasCompleteFooter()) {
      ensureToggle();
      return;
    }
    removeIncompleteFooters();
    if (hasCompleteFooter()) {
      ensureToggle();
      return;
    }
    injectCss();
    var mount = findMount();
    if (!mount) return;
    mount.insertAdjacentHTML('beforeend', footerHtml());
    ensureToggle();
    try {
      if (typeof window._rzqApplyFooterStats === 'function') window._rzqApplyFooterStats();
    } catch (e2) {}
  }

  window.RizqEnsureSiteFooter = boot;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
