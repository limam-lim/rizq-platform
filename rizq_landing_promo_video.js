/* extracted */

// ══ الفيديو الإعلاني للزوار — يقرأ إعدادات حقيقية من rizq-backend (لا بيانات وهمية) ══

function closeRvidPopup(){ document.getElementById('rvid-overlay').classList.remove('active'); }

(function initRvidPromoVideo(){
  if (!window.RIZQ_BACKEND_BASE) return; // تدهور سلس — لا أعطال إن لم يُضبط الخادم
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/site-config')
    .then(function(res){ return res.json(); })
    .then(function(data){
      var pv = (data && data.config && data.config.promoVideo) || {};
      if (!pv.url) return; // لا فيديو محفوظ فعلياً — لا نعرض شيئاً

      // ── ① Hero Featured Video (الموضع الأول — فيديو المُعلِن المدفوع) ──
      if (pv.heroActive) {
        var wrap = document.getElementById('hero-vid-wrap');
        var vid  = document.getElementById('hero-featured-vid');
        var ph   = document.getElementById('hero-vid-ph');
        if (wrap && vid) {
          var heroSrc = String(pv.heroUrl || pv.url || '');
          /* clean-light stub قصير (~9ث) كان يعطّل الترويج — استخدم الملف الكامل */
          if (!heroSrc || /rizq-platform-promo-clean-light\.mp4(\?|#|$)/i.test(heroSrc)) {
            heroSrc = 'rizq-assets/promo/rizq-platform-promo-light.mp4';
          }
          /* بدون / أولية — وإلا يفشل على GitHub Pages تحت /rizq-platform/ */
          if (/^\/rizq-assets\//i.test(heroSrc)) heroSrc = heroSrc.replace(/^\//, '');
          vid.src = heroSrc;
          vid.play().catch(function(){});
          wrap.style.display = '';
          if (ph) ph.style.display = 'none';
          /* بيانات المعلن تحت الإطار فقط — بلا كتابات على مساحة الإعلان */
          if (pv.heroAdvertiser) {
            var advBar = document.getElementById('hero-vid-adv-bar');
            var advName = document.getElementById('hero-vid-adv-name');
            var advLoc  = document.getElementById('hero-vid-adv-loc');
            if (advName) advName.textContent = pv.heroAdvertiser;
            if (advLoc) advLoc.textContent = pv.heroAdvertiserLoc || '';
            if (advBar) advBar.style.display = 'block';
          }
          if (pv.heroViews) {
            var vb = document.getElementById('hero-vid-views');
            if (vb) { vb.textContent = '👁 ' + pv.heroViews + ' مشاهدة/يوم'; vb.style.display = 'block'; }
          }
        }
      }

      // ── ② Section Promo Video (الفيديو الترويجي للمنصة — بعد الـ hero) ──
      if (pv.sectionActive) {
        var sectionSrc = String(pv.url || '');
        if (!sectionSrc || /rizq-platform-promo-clean-light\.mp4(\?|#|$)/i.test(sectionSrc)) {
          sectionSrc = 'rizq-assets/promo/rizq-platform-promo-light.mp4';
        }
        if (/^\/rizq-assets\//i.test(sectionSrc)) sectionSrc = sectionSrc.replace(/^\//, '');
        document.getElementById('rvid-section-video').src = sectionSrc;
        document.getElementById('rvid-section-title').textContent = pv.title || '';
        document.getElementById('rvid-section-sub').textContent = pv.subtitle || '';
        document.getElementById('rvid-section').classList.add('active');
      }

      // ── ③ Popup Promo Video (نافذة منبثقة بعد تأخير) ──
      if (pv.popupActive && !sessionStorage.getItem('rizq_promo_video_shown')) {
        var delay = (Number(pv.delay) || 3) * 1000;
        setTimeout(function(){
          var popSrc = String(pv.url || '');
          if (!popSrc || /rizq-platform-promo-clean-light\.mp4(\?|#|$)/i.test(popSrc)) {
            popSrc = 'rizq-assets/promo/rizq-platform-promo-light.mp4';
          }
          if (/^\/rizq-assets\//i.test(popSrc)) popSrc = popSrc.replace(/^\//, '');
          document.getElementById('rvid-popup-video').src = popSrc;
          document.getElementById('rvid-popup-title').textContent = pv.title || '';
          document.getElementById('rvid-popup-sub').textContent = pv.subtitle || '';
          document.getElementById('rvid-overlay').classList.add('active');
          sessionStorage.setItem('rizq_promo_video_shown', '1');
        }, delay);
      }
    })
    .catch(function(){ /* الخادم غير متاح حالياً — لا نعرض شيئاً، بدون كسر الصفحة */ });
})();

// ── إصلاح جوهري: نافذة معاينة الباقات (قبل التسجيل) كانت تقرأ كتالوجات
// الأسعار من localStorage فقط — أي زائر جديد على جهاز لم يفتح فيه الأدمن
// لوحة التحكم من قبل يرى الأسعار الافتراضية القديمة بدل ما ضبطه الأدمن
// فعلياً. نجلبها هنا من الخادم (rizq_backend_config.js) قبل فتح أي معاينة.
(function syncPackageCatalogsOnLoad(){
  function applyPkgs(pkgs) {
    if (!pkgs || typeof pkgs !== 'object') return;
    if (Array.isArray(pkgs.general))    localStorage.setItem('rizq_packages', JSON.stringify(pkgs.general));
    if (Array.isArray(pkgs.individual)) localStorage.setItem('rizq_individual_packages', JSON.stringify(pkgs.individual));
    if (Array.isArray(pkgs.office))     localStorage.setItem('rizq_office_packages', JSON.stringify(pkgs.office));
    if (Array.isArray(pkgs.store))      localStorage.setItem('rizq_store_packages', JSON.stringify(pkgs.store));
    if (Array.isArray(pkgs.corp))       localStorage.setItem('rizq_corp_packages', JSON.stringify(pkgs.corp));
    if (Array.isArray(pkgs.video))      localStorage.setItem('rizq_video_packages', JSON.stringify(pkgs.video));
    if (Array.isArray(pkgs.tender))     localStorage.setItem('rizq_tender_packages', JSON.stringify(pkgs.tender));
    if (Array.isArray(pkgs.investment)) localStorage.setItem('rizq_investment_packages', JSON.stringify(pkgs.investment));
    if (Array.isArray(pkgs.verified_plus)) localStorage.setItem('rizq_verified_plus_packages', JSON.stringify(pkgs.verified_plus));
    if (typeof renderPricingSection === 'function') renderPricingSection();
  }
  function fetchSiteConfigExtras() {
    if (!window.RIZQ_BACKEND_BASE) return;
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/site-config')
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(data){
        if (!data || !data.ok || !data.config) return;
        applyPkgs(data.config.packages);
        if (Array.isArray(data.config.bankCodes)) {
          localStorage.setItem('rizq_bank_codes', JSON.stringify(data.config.bankCodes));
          if (typeof ppRenderPayMethods === 'function') ppRenderPayMethods();
        }
        var cfg = data.config || {};
        if (cfg.prices && (cfg.prices.food || cfg.prices.fuel || cfg.prices.currencies)) {
          localStorage.setItem('rizq_prices', JSON.stringify(cfg.prices));
          if (typeof loadPrices === 'function') loadPrices();
        }
        if (Array.isArray(cfg.extraCategories)) {
          localStorage.setItem('rizq_extra_categories', JSON.stringify(cfg.extraCategories));
          if (typeof renderExtraCategories === 'function') renderExtraCategories();
        }
      }).catch(function(){});
  }
  if (window.RizqPackagesUI && typeof RizqPackagesUI.syncAllFromBackend === 'function') {
    RizqPackagesUI.syncAllFromBackend(function () {
      if (typeof renderPricingSection === 'function') renderPricingSection();
      /* كان المسار القديم يتوقف هنا فلا تُحمَّل أسعار نبضة السوق */
      fetchSiteConfigExtras();
    });
    return;
  }
  fetchSiteConfigExtras();
})();

// ── الإطلاق التدريجي: moduleFlags عبر RizqModuleFlags + RizqDynamicNav ──
(function applyModuleFlagsLanding(){
  if (window.RizqModuleFlags && typeof window.RizqModuleFlags.fetchAndApply === 'function') {
    window.RizqModuleFlags.fetchAndApply();
    return;
  }
  if (!window.RIZQ_BACKEND_BASE) return;
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/site-config')
    .then(function(res){ return res.ok ? res.json() : null; })
    .then(function(data){
      var flags = data && data.ok && data.config && data.config.moduleFlags;
      if (!flags || typeof flags !== 'object') return;
      if (window.RizqDynamicNav) window.RizqDynamicNav.apply(flags);
      if (flags.individual === false) { var tp = document.getElementById('type-private'); if (tp) tp.style.display = 'none'; }
      if (flags.estate === false)     { var te = document.getElementById('type-estate');  if (te) te.style.display = 'none'; }
      if (flags.store === false)      { var bs = document.getElementById('biz-store');    if (bs) bs.style.display = 'none'; }
      if (flags.office === false)     { var bo = document.getElementById('biz-office');   if (bo) bo.style.display = 'none'; }
      if (flags.corp === false)       { var bc = document.getElementById('biz-corp');     if (bc) bc.style.display = 'none'; }
      if (flags.store === false && flags.office === false && flags.corp === false) {
        var tc = document.getElementById('type-company'); if (tc) tc.style.display = 'none';
      }
      renderComingSoonStrip(flags);
    })
    .catch(function(){});
})();


// ── Hero Video Placeholder: حبيبات ذهبية عائمة ──
(function spawnParticles(){
  var ph=document.getElementById('hero-vid-ph');
  if(!ph)return;
  function make(){
    var p=document.createElement('div');
    p.className='hero-vid-ph-particle';
    var size=(Math.random()*3+1.5).toFixed(1);
    p.style.cssText='width:'+size+'px;height:'+size+'px;left:'+(Math.random()*100)+'%;bottom:-10px;opacity:'+(Math.random()*.6+.2)+';animation-duration:'+(Math.random()*8+6)+'s;animation-delay:'+(Math.random()*5)+'s';
    ph.appendChild(p);
    setTimeout(function(){p.remove();},14000);
  }
  for(var i=0;i<12;i++) setTimeout(make,i*400);
  setInterval(make,1200);
})();

// ── Hero Featured Video: تحكم الصوت + شاشة كاملة ──
function toggleHeroVidSound(){
  var vid = document.getElementById('hero-featured-vid');
  var btn = document.getElementById('hero-vid-sound-btn');
  if (!vid || !vid.src || vid.src === window.location.href) return;
  vid.muted = !vid.muted;
  if (btn) btn.textContent = vid.muted ? '🔇' : '🔊';
}
function toggleHeroVidFullscreen(){
  var inner = document.getElementById('hero-vid-inner') || document.querySelector('.hero-vid-inner');
  if (!inner) return;
  var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  try {
    if (fsEl) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } else if (inner.requestFullscreen) {
      inner.requestFullscreen();
    } else if (inner.webkitRequestFullscreen) {
      inner.webkitRequestFullscreen();
    } else {
      /* fallback: وسّع الإطار داخل الصفحة */
      var wrap = document.getElementById('hero-vid-wrap');
      if (wrap) wrap.classList.toggle('hero-vid-page-full');
    }
  } catch (eFs) { /* ignore */ }
  var btn = document.getElementById('hero-vid-fs-btn');
  if (btn) {
    var nowFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    btn.textContent = nowFs ? '✕' : '⛶';
    btn.title = nowFs ? 'خروج من الشاشة الكاملة' : 'شاشة كاملة';
  }
}
document.addEventListener('fullscreenchange', function(){
  var btn = document.getElementById('hero-vid-fs-btn');
  if (!btn) return;
  var nowFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  btn.textContent = nowFs ? '✕' : '⛶';
  btn.title = nowFs ? 'خروج من الشاشة الكاملة' : 'شاشة كاملة';
});
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeRvidPopup(); });
