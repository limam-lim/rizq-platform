var isAr = true;

// ── Fallback shim: this page does NOT load rizq_i18n.js/rizq_i18n_data.js,
//    but toggleLang() below calls RizqI18n.t2(ar, fr) in several places.
//    Without this shim, every language toggle threw an uncaught
//    "RizqI18n is not defined" ReferenceError and silently aborted the
//    rest of toggleLang() (pricing cards, register/login modal text, etc.
//    never re-translated). This shim reuses the page's own isAr state so
//    behavior matches exactly what RizqI18n.t2() would have returned. ──
if (typeof RizqI18n === 'undefined') {
  var RizqI18n = {
    t2: function(ar, fr) { return isAr ? ar : fr; },
    getLang: function() { return isAr ? 'ar' : 'fr'; },
    stripLeakedDirs: function() {
      var keep = '.logo,.rizq-hdr-brand,.logo-text,.phone-num,#rizq-chat-window,.rw-input,[href^="tel:"],input[type="tel"],.btn-lang-primary,#rizq-lang-btn,#nav-lang-btn,#rizq-desk-lang-btn,.rizq-reg-chrome-lang,#lang-btn';
      document.querySelectorAll('nav, .nav-center, .nav-dropdown-li, .nav-dropdown-menu, .rizq-hdr-row2, .rizq-hdr-more-menu, .modal-overlay, .modal-box, #qcat-portal, #cat-inline-panel, .rzq-sheet, .why-grid, footer, .hero-pills').forEach(function(el) {
        if (el.closest && el.closest(keep)) return;
        if (el.hasAttribute('dir')) el.removeAttribute('dir');
        if (el.style && el.style.direction) el.style.direction = '';
      });
    },
    paintPrimaryLangBtn: function(btn, langOverride) {
      if (!btn) return;
      var lang = (langOverride === 'fr' || langOverride === 'ar') ? langOverride : (isAr ? 'ar' : 'fr');
      if (!btn.classList.contains('btn-lang') && !btn.classList.contains('rizq-reg-chrome-lang')) btn.classList.add('btn-lang');
      if (!btn.classList.contains('rizq-reg-chrome-lang')) btn.classList.add('btn-lang-primary');
      btn.setAttribute('dir', 'ltr');
      btn.innerHTML = '<span class="lang-fr" dir="ltr">FR</span><span class="lang-sep" aria-hidden="true"> | </span><span class="lang-ar" dir="ltr">AR</span>';
      btn.setAttribute('aria-label', 'FR | AR');
      btn.setAttribute('data-active-lang', lang);
      var frEl = btn.querySelector('.lang-fr');
      var arEl = btn.querySelector('.lang-ar');
      if (frEl) {
        frEl.classList.toggle('is-active-lang', lang === 'fr');
        frEl.style.color = lang === 'fr' ? '#C9A84C' : '#ffffff';
        frEl.style.opacity = lang === 'fr' ? '1' : '0.9';
      }
      if (arEl) {
        arEl.classList.toggle('is-active-lang', lang === 'ar');
        arEl.style.color = lang === 'ar' ? '#C9A84C' : '#ffffff';
        arEl.style.opacity = lang === 'ar' ? '1' : '0.9';
      }
    },
    paintAllLangButtons: function(langOverride) {
      var lang = (langOverride === 'fr' || langOverride === 'ar') ? langOverride : (isAr ? 'ar' : 'fr');
      document.querySelectorAll('.btn-lang, .btn-lang-primary, .rizq-reg-chrome-lang, #lang-btn, #nav-lang-btn, #rizq-lang-btn, #rizq-desk-lang-btn').forEach(function(btn) {
        RizqI18n.paintPrimaryLangBtn(btn, lang);
      });
    },
    isPrimaryLangBtn: function() { return true; }
  };
}

// ── CURSOR — native OS cursor (custom orb removed)

// ── NAVBAR SCROLL — يُدار عبر rizq_landing_ux.js (scrolled + nav-compact)

// ── FADE-IN OBSERVER ──
const obs=new IntersectionObserver((entries)=>{
  entries.forEach((e,i)=>{if(e.isIntersecting)setTimeout(()=>e.target.classList.add('visible'),i*60)});
},{threshold:0.05,rootMargin:'300px 0px 300px 0px'});
document.querySelectorAll('.fade-in').forEach(el=>obs.observe(el));
document.querySelectorAll('.fade-in').forEach(el=>el.classList.add('visible'));

// ── COUNTER ANIMATION — يُدار الآن عبر rizq_landing_ux.js (count-up عند الظهور)
// احتفظنا بالدالة للتوافق إن استُدعيت من مكان آخر
function animateCount(el,target){
  if(el.dataset.counted==='1')return;
  el.dataset.counted='1';
  let n=0,step=Math.ceil(target/80);
  const t=setInterval(()=>{n=Math.min(n+step,target);el.textContent=n.toLocaleString('en-US');if(n>=target)clearInterval(t)},20);
}
