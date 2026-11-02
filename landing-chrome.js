// ── MOBILE NAV DRAWER ──
function toggleMobileNav(){
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-drawer-overlay');
  const btn = document.getElementById('nav-hamburger');
  if(!drawer || !overlay) return;
  const opening = !drawer.classList.contains('open');
  drawer.classList.toggle('open', opening);
  overlay.classList.toggle('open', opening);
  if(btn) btn.classList.toggle('open', opening);
  document.body.style.overflow = opening ? 'hidden' : '';
}
function closeMobileNav(){
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('mobile-drawer-overlay');
  const btn = document.getElementById('nav-hamburger');
  if(drawer) drawer.classList.remove('open');
  if(overlay) overlay.classList.remove('open');
  if(btn) btn.classList.remove('open');
  const regModal = document.getElementById('modal');
  if (!regModal || !regModal.classList.contains('open')) {
    document.body.style.overflow = '';
  }
}
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeMobileNav(); });

// ── MODAL ──
// ── MODAL STATE ──
let acctType=''; // 'private' | 'company'
let natType='';  // 'mr' | 'int'
let bizType='';  // 'store' | 'office' | 'corp'
let stFile=null,ofFile1=null,ofFile2=null,crFile1=null,crFile2=null,crFile3=null,indFile=null;
let phoneBackPanel='';

const ALL_PANELS=['p-login','p-forgot','p-type','p-nat-type','p-biz-type','p-individual-form','p-store-form','p-office-form','p-corp-form','p-company','p-phone','p-id-upload','p-pkg-payment','p-ok'];

/* ── إصلاح قائمة "الباقات ▾" في النافبار: كانت تعتمد على :hover فقط فتختفي
   أثناء تحريك الماوس نحوها قبل الوصول (فجوة بين الزر والقائمة). الآن تُفتح
   بالنقر (class="open") وتبقى ظاهرة حتى يضغط المستخدم خارجها. ── */
/* إصلاح 23/07: القائمة أصبحت position:fixed (تفلت من قصّ .nav-center overflow) —
   هذا يعني موضعها لم يعد يُحسب تلقائياً نسبة لزر التفعيل، فيجب حسابه يدوياً هنا
   عبر getBoundingClientRect() في كل مرة تُفتح فيها، وأيضاً عند تغيير حجم النافذة. */
function ensureLandingMoreBackdrop(){
  var bd=document.getElementById('rizq-more-backdrop');
  if(bd) return bd;
  bd=document.createElement('div');
  bd.id='rizq-more-backdrop';
  bd.className='rizq-more-backdrop';
  bd.setAttribute('aria-hidden','true');
  bd.addEventListener('click',function(){ closeNavDropdowns(); });
  document.body.appendChild(bd);
  return bd;
}
function isLandingPhoneMore(){
  try{
    return window.matchMedia('(max-width:768px)').matches
      || window.matchMedia('(orientation:landscape) and (max-height:500px)').matches;
  }catch(eP){ return false; }
}
function positionNavDropdown(li){
  if(!li) return;
  var menu=li.querySelector('.nav-dropdown-menu')||document.querySelector('.nav-dropdown-menu[data-rizq-more-for="'+(li.id||'nav-more-li')+'"]');
  if(!menu) return;
  if(isLandingPhoneMore()){
    if(window.RizqModuleFlags && typeof window.RizqModuleFlags.reapply==='function') window.RizqModuleFlags.reapply();
    menu=li.querySelector('.nav-dropdown-menu')||document.querySelector('.nav-dropdown-menu[data-rizq-more-for="'+(li.id||'nav-more-li')+'"]');
    if(!menu) return;
    if(menu.parentNode!==document.body){
      menu.__rizqMoreHome=li;
      menu.setAttribute('data-rizq-more-for',li.id||'nav-more-li');
      document.body.appendChild(menu);
    }
    var phoneNodes=li.querySelectorAll('#nav-more-mobile-btn,.nav-phone-more-only,.nav-dropdown-trigger,.nav-link-btn');
    var phoneTrig=null,pi,pr;
    for(pi=0;pi<phoneNodes.length;pi++){
      pr=phoneNodes[pi].getBoundingClientRect();
      if(pr.width>1 && pr.height>1){ phoneTrig=phoneNodes[pi]; break; }
    }
    var navEl=document.getElementById('nav');
    var phoneRect=phoneTrig?phoneTrig.getBoundingClientRect():(navEl?navEl.getBoundingClientRect():{left:12,width:48,bottom:116});
    var navBottom=navEl?Math.round(navEl.getBoundingClientRect().bottom):0;
    var panelTop=Math.max(Math.round((phoneTrig?phoneRect.bottom:(navEl?navEl.getBoundingClientRect().bottom:112))+4), navBottom+4);
    var phoneMenuW=Math.min(176, Math.max(156, Math.min(window.innerWidth-24, 176)));
    var phoneLeft=Math.round(phoneRect.left+phoneRect.width/2-phoneMenuW/2);
    phoneLeft=Math.max(8, Math.min(phoneLeft, window.innerWidth-phoneMenuW-8));
    li.classList.add('open');
    menu.classList.add('rizq-more-menu-open','rizq-phone-more-panel');
    menu.style.cssText='position:fixed!important;top:'+panelTop+'px!important;left:'+phoneLeft+'px!important;right:auto!important;bottom:auto!important;transform:none!important;width:'+phoneMenuW+'px!important;min-width:'+phoneMenuW+'px!important;max-width:'+phoneMenuW+'px!important;max-height:min(calc(100vh - '+(panelTop+12)+'px),380px)!important;overflow-x:hidden!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;z-index:10052!important;display:flex!important;flex-direction:column!important;padding:6px!important;border-radius:12px!important;';
    var bd=ensureLandingMoreBackdrop();
    bd.classList.add('open');
    bd.setAttribute('aria-hidden','false');
    document.body.classList.add('rizq-more-open');
    var btn=document.getElementById('nav-more-mobile-btn');
    if(btn) btn.setAttribute('aria-expanded','true');
    return;
  }
  if(menu.parentNode!==li && menu.parentNode!==document.body) li.appendChild(menu);
  /* سطح المكتب/تابلت: القائمة تخرج من .nav-center (overflow يقصّها) → body + fixed.
     لا تستخدم زر الهاتف المخفي (#nav-more-mobile-btn) لحساب الموضع — يأتي أولاً في DOM
     وgetBoundingClientRect() يعطي 0 فيُثبَّت القائمة أعلى اليسار. */
  var nodes=li.querySelectorAll('.nav-dropdown-trigger,.nav-desktop-more-only,#rizq-desk-more,#nav-more-mobile-btn,.nav-phone-more-only,.nav-link-btn');
  var trigger=null,i,r;
  for(i=0;i<nodes.length;i++){
    r=nodes[i].getBoundingClientRect();
    if(r.width>1 && r.height>1){ trigger=nodes[i]; break; }
  }
  if(!trigger) trigger=li.querySelector('.nav-dropdown-trigger,.nav-desktop-more-only')||li;
  var rect=trigger.getBoundingClientRect();
  if(!(rect.width>1 && rect.height>1)){
    var navRow=document.getElementById('nav')||li;
    rect=navRow.getBoundingClientRect();
  }
  if(menu.parentNode!==document.body){
    menu.__rizqMoreHome=li;
    menu.setAttribute('data-rizq-more-for',li.id||'nav-more-li');
    document.body.appendChild(menu);
  }
  li.classList.add('open');
  menu.classList.add('rizq-more-menu-open','rizq-phone-more-panel');
  var navBar=document.getElementById('nav')||document.getElementById('rizq-desk-nav');
  var navBottom=navBar?Math.round(navBar.getBoundingClientRect().bottom):0;
  /* تداخل مع الزر حتى لا تُغلق القائمة عند تحريك الماوس نحو العناصر */
  var top=Math.max(Math.round(rect.bottom-8), navBottom-2);
  /* ضيّقة ومتمركزة تحت زر المزيد — لا تغطي شعار «رزق» في الوسط */
  var menuW=Math.min(176, Math.max(156, Math.min(window.innerWidth-24, 176)));
  var centerX=Math.round(rect.left+rect.width/2);
  var left=Math.max(8, Math.min(centerX-Math.round(menuW/2), window.innerWidth-menuW-8));
  menu.style.cssText='position:fixed!important;top:'+top+'px!important;left:'+left+'px!important;right:auto!important;bottom:auto!important;transform:none!important;width:'+menuW+'px!important;min-width:'+menuW+'px!important;max-width:'+menuW+'px!important;max-height:min(calc(100vh - '+(top+12)+'px),420px)!important;overflow-y:auto!important;overflow-x:hidden!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;z-index:10052!important;display:flex!important;flex-direction:column!important;background:rgba(15,23,42,.96)!important;border:1px solid rgba(201,168,76,.42)!important;border-radius:12px!important;padding:14px 6px 6px!important;box-shadow:0 16px 40px rgba(0,0,0,.55)!important;';
}
function closeNavDropdowns(){
  document.querySelectorAll('.nav-dropdown-li.open').forEach(function(o){
    o.classList.remove('open');
    var m=o.querySelector('.nav-dropdown-menu');
    if(!m) m=document.querySelector('.nav-dropdown-menu[data-rizq-more-for="'+(o.id||'nav-more-li')+'"]');
    if(m && m.__rizqMoreHome && m.parentNode!==m.__rizqMoreHome) m.__rizqMoreHome.appendChild(m);
    else if(m && m.parentNode!==o && m.parentNode===document.body) o.appendChild(m);
    if(m){
      m.classList.remove('rizq-more-menu-open','rizq-phone-more-panel');
      m.style.cssText='';
    }
  });
  var bd=document.getElementById('rizq-more-backdrop');
  if(bd){
    bd.classList.remove('open');
    bd.setAttribute('aria-hidden','true');
  }
  document.body.classList.remove('rizq-more-open');
  var moreBtn=document.getElementById('nav-more-mobile-btn');
  if(moreBtn) moreBtn.setAttribute('aria-expanded','false');
}
function toggleNavDropdown(e,el){
  if(e){
    e.preventDefault();
    if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    e.stopPropagation();
  }
  var li=el && el.closest ? el.closest('.nav-dropdown-li') : null;
  if(!li) return;
  var wasOpen=li.classList.contains('open')||!!document.querySelector('.rizq-phone-more-panel.rizq-more-menu-open');
  closeNavDropdowns();
  if(!wasOpen){
    var positioner=(typeof window.positionNavDropdown==='function')?window.positionNavDropdown:positionNavDropdown;
    positioner(li);
  }
}
window.toggleNavDropdown=toggleNavDropdown;
window.positionNavDropdown=positionNavDropdown;
window.closeNavDropdowns=closeNavDropdowns;
(function bindDesktopMoreHover(){
  var li=document.querySelector('#nav .nav-dropdown-li');
  if(!li || li.getAttribute('data-rizq-more-hover')==='1') return;
  li.setAttribute('data-rizq-more-hover','1');
  function isDesk(){ try{ return window.matchMedia('(min-width:769px) and (min-height:501px)').matches; }catch(e){ return true; } }
  function menuEl(){
    return li.querySelector('.nav-dropdown-menu')
      || document.querySelector('.nav-dropdown-menu[data-rizq-more-for="'+(li.id||'nav-more-li')+'"]')
      || document.querySelector('.nav-dropdown-menu.rizq-more-menu-open');
  }
  var leaveTimer=null;
  function scheduleClose(){
    clearTimeout(leaveTimer);
    leaveTimer=setTimeout(function(){
      if(!isDesk()) return;
      var m=menuEl();
      if(li.matches(':hover') || (m && m.matches(':hover'))) return;
      closeNavDropdowns();
    },140);
  }
  function cancelClose(){ clearTimeout(leaveTimer); }
  function keepOpen(){
    cancelClose();
    var positioner=(typeof window.positionNavDropdown==='function')?window.positionNavDropdown:positionNavDropdown;
    positioner(li);
    var m=menuEl();
    if(m && !m.getAttribute('data-rizq-more-stay')){
      m.setAttribute('data-rizq-more-stay','1');
      /* القائمة على body — ابقَ مفتوحة داخلها واختفِ عند المغادرة */
      m.addEventListener('mouseenter',function(){ if(isDesk()){ cancelClose(); keepOpen(); } });
      m.addEventListener('mouseleave',function(){ if(isDesk()) scheduleClose(); });
      m.addEventListener('click',function(e){ e.stopPropagation(); });
    }
  }
  /* سطح المكتب: افتح عند المرور واختفِ تلقائياً عند مغادرة الزر/القائمة */
  li.addEventListener('mouseenter',function(){
    if(!isDesk()) return;
    keepOpen();
  });
  li.addEventListener('mouseleave',function(){
    if(!isDesk()) return;
    scheduleClose();
  });
  var trigger=li.querySelector('.nav-dropdown-trigger,.nav-desktop-more-only');
  if(trigger){
    /* أزل onclick المضمّن لتجنّب فتح+إغلاق مزدوج مع المستمع */
    trigger.removeAttribute('onclick');
    trigger.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      if(!isDesk()){
        toggleNavDropdown(e, trigger);
        return;
      }
      if(li.classList.contains('open')||document.querySelector('.nav-dropdown-menu.rizq-more-menu-open')){
        closeNavDropdowns();
      } else {
        keepOpen();
      }
    });
  }
})();
document.addEventListener('click',function(e){
  if(e.target.closest('#rizq-more-backdrop')) return;
  if(!e.target.closest('.nav-dropdown-li') && !e.target.closest('.nav-dropdown-menu') && !e.target.closest('#nav-more-mobile-btn')){
    closeNavDropdowns();
  }
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape') closeNavDropdowns();
});

function syncModalAuthTabs(mode){
  const tabs=document.getElementById('modal-auth-tabs');
  if(!tabs) return;
  const show=mode==='login'||mode==='register';
  tabs.style.display=show?'flex':'none';
  const lt=document.getElementById('modal-tab-login');
  const rt=document.getElementById('modal-tab-register');
  if(lt){
    lt.classList.toggle('active',mode==='login');
    lt.setAttribute('aria-selected',mode==='login'?'true':'false');
  }
  if(rt){
    rt.classList.toggle('active',mode==='register');
    rt.setAttribute('aria-selected',mode==='register'?'true':'false');
  }
}

function rizqIsRegPageMode(){
  try{
    var p=new URLSearchParams(window.location.search);
    return p.get('regPage')==='1' || document.documentElement.classList.contains('rizq-reg-page');
  }catch(e){ return document.documentElement.classList.contains('rizq-reg-page'); }
}

function rizqIsPhoneViewport(){
  try { return window.matchMedia('(max-width: 768px)').matches; } catch (e) { return false; }
}

function rizqApplyRegMobileScroll(){
  if (!document.body.classList.contains('rizq-reg-open')) return;
  if (!rizqIsPhoneViewport()) return;
  document.documentElement.classList.add('rizq-reg-page');
  document.body.style.overflow = 'auto';
  document.body.style.overflowY = 'auto';
  document.body.style.overflowX = 'hidden';
}

function rizqMountAccountBars(modal){
  if(!modal) return;
  var chrome=document.getElementById('rizq-reg-chrome');
  var fakeFooter=document.getElementById('rizq-reg-footer');
  if(chrome && chrome.parentNode!==modal) modal.insertBefore(chrome, modal.firstChild);
  /* الشريط السفلي الموحد للمنصة (footer.rizq-footer) — لا نستخدم شريط الأيقونات القديمة */
  if(fakeFooter){
    fakeFooter.setAttribute('hidden','');
    fakeFooter.setAttribute('aria-hidden','true');
    fakeFooter.style.display='none';
  }
  if(chrome){
    chrome.style.visibility='visible';
    chrome.style.opacity='1';
    chrome.style.pointerEvents='auto';
    chrome.style.display='flex';
    chrome.style.position='fixed';
    chrome.style.top='0';
    chrome.style.left='0';
    chrome.style.right='0';
    chrome.style.width='100%';
    chrome.style.zIndex='10050';
    chrome.style.transform='none';
  }
  try{
    var siteFooter=document.querySelector('footer.rizq-footer') || document.querySelector('body > footer');
    var isPhone=rizqIsPhoneViewport();
    if(siteFooter){
      siteFooter.classList.add('rizq-footer');
      if(isPhone){
        siteFooter.style.display='none';
        siteFooter.style.visibility='hidden';
        siteFooter.style.pointerEvents='none';
      } else {
        siteFooter.style.display='block';
        siteFooter.style.visibility='visible';
        siteFooter.style.pointerEvents='auto';
        siteFooter.style.position='relative';
        siteFooter.style.zIndex='4';
        siteFooter.style.order='2';
      }
    }
    if (!isPhone && window.RizqFooterToggle && typeof window.RizqFooterToggle.setOpen === 'function') {
      window.RizqFooterToggle.setOpen(true);
    }
  }catch(e){}
}

function rizqOpenRegister(ev){
  if(ev){
    ev.preventDefault();
    if(ev.stopPropagation) ev.stopPropagation();
    if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  }
  closeMobileNav();
  setTimeout(function(){ openModal('register'); }, 60);
}
window.rizqOpenRegister = rizqOpenRegister;

function openModal(mode){
  const modal=document.getElementById('modal');
  if(!modal) return;
  window._rizqModalOpenedAt=Date.now();
  modal.classList.add('open');
  modal.style.display='flex';
  modal.style.pointerEvents='auto';
  /* أثناء التسجيل/الدخول: لا ترفع z-index فوق فوتر المنصة (الأقسام/المساعدة/الشعار) */
  if(mode==='register' || mode==='login' || mode==='forgot'){
    modal.style.zIndex='4';
  } else {
    modal.style.zIndex='';
  }
  if(mode==='register'){
    try { document.documentElement.classList.add('rizq-reg-page'); } catch (eDesk) {}
    modal.classList.add('reg-wizard-mode');
    modal.classList.add('reg-wizard-arming');
    modal.classList.remove('auth-login-mode');
    document.body.classList.add('rizq-reg-open');
    clearTimeout(window._rizqRegArmTimer);
    window._rizqRegArmTimer=setTimeout(function(){
      modal.classList.remove('reg-wizard-arming');
    }, 900);
    rizqMountAccountBars(modal);
    try{
      var u=new URL(window.location.href);
      if(u.searchParams.get('openRegister')!=='1'){
        u.searchParams.set('openRegister','1');
        history.replaceState(null,'',u.pathname+u.search+u.hash);
      }
    }catch(eUrl){}
  } else {
    /* login / forgot — شاشة فاتحة واضحة */
    modal.classList.add('reg-wizard-mode');
    modal.classList.add('auth-login-mode');
    modal.classList.remove('reg-wizard-arming');
    document.body.classList.add('rizq-reg-open');
    try { document.documentElement.classList.add('rizq-reg-page'); } catch (ePhone) {}
    rizqMountAccountBars(modal);
  }
  if(mode==='register' || mode==='login' || mode==='forgot'){
    if(rizqIsPhoneViewport()){
      rizqApplyRegMobileScroll();
    } else {
      document.body.style.overflow='hidden';
    }
  } else {
    document.body.style.overflow='hidden';
  }
  ALL_PANELS.forEach(p=>{const el=document.getElementById(p);if(el)el.style.display='none';});
  const dots=document.getElementById('sdots');
  const prog=document.getElementById('reg-progress');
  if(mode==='login'){
    document.getElementById('p-login').style.display='block';
    if(dots) dots.style.display='none';
    if(prog){ prog.style.display='none'; prog.setAttribute('aria-hidden','true'); }
    syncModalAuthTabs('login');
  } else if(mode==='forgot'){
    document.getElementById('p-forgot').style.display='block';
    if(dots) dots.style.display='none';
    if(prog){ prog.style.display='none'; prog.setAttribute('aria-hidden','true'); }
    syncModalAuthTabs('login');
    resetForgotUi();
  } else {
    acctType=''; natType=''; bizType='';
    document.getElementById('p-type').style.display='block';
    if(dots) dots.style.display='flex';
    if(prog){ prog.style.display=''; prog.setAttribute('aria-hidden','false'); }
    setDot(0,5);
    syncModalAuthTabs('register');
  }
}

/** رجوع من شاشة الحساب/التسجيل → الصفحة السابقة (لا الرئيسية دائماً) */
function rizqAuthGoBack(e){
  if(e){
    try{ e.preventDefault(); e.stopPropagation(); }catch(_e){}
  }
  var modal=document.getElementById('modal');
  var inAuth=modal && (modal.classList.contains('reg-wizard-mode') || modal.classList.contains('auth-login-mode') || modal.classList.contains('open'));
  if(inAuth && !rizqIsRegPageMode()){
    closeModal(true);
    return false;
  }
  try{
    var stored='';
    try{ stored=sessionStorage.getItem('rizq_after_auth_href')||''; }catch(_s){}
    if(stored && stored !== (location.pathname+location.search+(location.hash||'')) && !/openRegister=1|regPage=1/.test(stored)){
      try{ sessionStorage.removeItem('rizq_after_auth_href'); }catch(_c){}
      location.href=stored;
      return false;
    }
  }catch(_a){}
  if(window.history && history.length > 1){
    history.back();
    return false;
  }
  location.href='rizq_landing_v8.html';
  return false;
}
window.rizqAuthGoBack = rizqAuthGoBack;

function closeModal(force){
  const modal=document.getElementById('modal');
  if(modal && modal.classList.contains('reg-wizard-mode') && !force && Date.now()-(window._rizqModalOpenedAt||0)<900){
    return;
  }
  /* في وضع صفحة الحساب: نُنظّف الحالة فقط — الرجوع للصفحة السابقة عبر rizqAuthGoBack
     حتى لا نقطع إعادة التوجيه بعد تسجيل الدخول الناجح. */
  if(window.RizqTermsGate && typeof RizqTermsGate.resetSession==='function') RizqTermsGate.resetSession();
  if(modal){
    modal.classList.remove('reg-wizard-mode');
    modal.classList.remove('reg-wizard-arming');
    modal.classList.remove('auth-login-mode');
    modal.classList.remove('open');
    modal.style.display='none';
    modal.style.zIndex='';
  }
  document.body.classList.remove('rizq-reg-open');
  document.documentElement.classList.remove('rizq-reg-page');
  document.body.style.overflow='';
  document.body.style.overflowY='';
  document.body.style.overflowX='';
  try{
    var siteFooter=document.querySelector('footer.rizq-footer') || document.querySelector('body > footer');
    if(siteFooter){
      siteFooter.style.display='';
      siteFooter.style.visibility='';
      siteFooter.style.pointerEvents='';
      siteFooter.style.position='';
      siteFooter.style.zIndex='';
      siteFooter.style.order='';
    }
  }catch(eFtReset){}
  try{
    var u=new URL(window.location.href);
    if(u.searchParams.has('openRegister')){
      u.searchParams.delete('openRegister');
      history.replaceState(null,'',u.pathname+u.search+u.hash);
    }
  }catch(eUrl2){}
}
document.getElementById('modal').addEventListener('click',function(e){
  const modal=document.getElementById('modal');
  if(e.target!==modal) return;
  if(modal.classList.contains('reg-wizard-mode')) return;
  if(Date.now()-(window._rizqModalOpenedAt||0)<450) return;
  closeModal(true);
});

(function initAuthModalFromUrl(){
  var openedRegister=false;
  var openedLogin=false;
  function tryOpen(){
    try{
      var p=new URLSearchParams(window.location.search);
      if(p.get('openRegister')==='1' && !openedRegister && typeof openModal==='function'){
        var preTypeEarly=p.get('preType')||p.get('type')||'';
        var preBizEarly=p.get('preBiz')||p.get('biz')||'';
        var preActivityEarly=p.get('preActivity')||p.get('activity')||'';
        /* روابط قديمة (مكتب+وساطة عقارية) → مسار سوق العقارات المستقل */
        if(preTypeEarly==='estate' || preBizEarly==='estate' || preActivityEarly==='of_realestate_agency' || /^es_/.test(preActivityEarly)){
          openedRegister=true;
          location.replace('rizq_real_estate_register.html');
          return;
        }
        openedRegister=true;
        if(p.get('regPage')!=='1'){
          document.documentElement.classList.add('rizq-reg-page');
          try{
            var u=new URL(window.location.href);
            u.searchParams.set('regPage','1');
            history.replaceState(null,'',u.pathname+u.search+u.hash);
          }catch(eR){}
        }
        openModal('register');
        var preType=preTypeEarly;
        var preBiz=preBizEarly;
        var preActivity=preActivityEarly;
        if(preActivity){
          try { window._rizqPreActivity = String(preActivity).slice(0, 80); } catch(ePA) {}
        }
        if(preType){
          setTimeout(function(){
            if(typeof selectType==='function') selectType(preType);
            if(typeof goFromType==='function') goFromType();
            if(preBiz) setTimeout(function(){
              if(typeof selectBizType==='function') selectBizType(preBiz);
              if(window._rizqPreActivity && typeof applyPreActivitySelect==='function'){
                setTimeout(function(){ applyPreActivitySelect(preBiz); }, 120);
              }
            }, 250);
          }, 220);
        }
      } else if(p.get('openLogin')==='1' && !openedLogin && typeof openModal==='function'){
        openedLogin=true;
        openModal('login');
      }
    }catch(e){}
  }
  function schedule(){ setTimeout(tryOpen, 200); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', schedule);
  else schedule();
  window.addEventListener('load', function(){ setTimeout(tryOpen, 80); });
})();

function showPanel(id,dot,total){
  ALL_PANELS.forEach(p=>{const el=document.getElementById(p);if(el)el.style.display='none';});
  document.getElementById(id).style.display='block';
  if(id==='p-login' || id==='p-forgot') syncModalAuthTabs('login');
  else if(id==='p-type') syncModalAuthTabs('register');
  else syncModalAuthTabs('');
  if(dot!==undefined)setDot(dot,total||3);
}

function setDot(active,total){
  const dots=document.getElementById('sdots');
  dots.style.display='flex';
  for(let i=1;i<=4;i++){
    const d=document.getElementById('sd'+i);
    const l=document.getElementById('sl'+i);
    if(!d)continue;
    if(i<=total){
      d.style.display='block';
      d.className='sdot'+(i<active+1?' done':i===active+1?' active':'');
    } else { d.style.display='none'; }
    if(l) l.style.display=i<total?'block':'none';
  }
  var prog=document.getElementById('reg-progress');
  if(prog){
    for(var j=1;j<=4;j++){
      var rs=document.getElementById('rstep-'+j);
      if(!rs) continue;
      rs.style.display=(j<=total)?'flex':'none';
      rs.className='reg-step'+(j<active+1?' done':j===active+1?' active':'');
    }
  }
}

// نوع الحساب
function openRegisterAs(type, biz, activityId){
  /* سوق العقارات = مسار مستقل (ليس مكتب of_realestate) */
  var t = String(type || '');
  var b = String(biz || '');
  var act = String(activityId || '');
  if(t==='estate' || b==='estate' || act==='of_realestate_agency' || /^es_/.test(act)){
    location.href='rizq_real_estate_register.html';
    return;
  }
  var q='./?openRegister=1&regPage=1';
  if(type) q+='&preType='+encodeURIComponent(type);
  if(biz) q+='&preBiz='+encodeURIComponent(biz);
  if(activityId){
    q+='&preActivity='+encodeURIComponent(activityId);
    try { window._rizqPreActivity = String(activityId).slice(0, 80); } catch(eA) {}
  }
  location.href=q;
}
window.openRegisterAs=openRegisterAs;

/** يضبط قائمة النشاط بعد فتح نموذج المكتب/المحل/المعرض من بوابة تخصص */
function applyPreActivitySelect(accountType){
  var act = '';
  try { act = String(window._rizqPreActivity || '').trim(); } catch(e) { act = ''; }
  if(!act) return;
  var map = { store: 'st-cat', office: 'of-cat', corp: 'cr-cat' };
  var t = accountType || bizType || 'office';
  var el = document.getElementById(map[t] || 'of-cat');
  if(!el) return;
  if(typeof renderRegActivitySelects === 'function'){
    renderRegActivitySelects(t, null);
  }
  try {
    el.value = act;
    if(el.value !== act){
      // إن لم يكن الخيار موجوداً بعد، أعد الرسم مع selected صريح
      if(window.RizqMerchantActivities){
        RizqMerchantActivities.renderSelect(el, {
          accountType: t,
          packageId: null,
          lang: (typeof _regLang === 'function' ? _regLang() : 'ar'),
          selected: act,
        });
        if(window.RizqActivitySelect) RizqActivitySelect.enhance(el);
      }
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } catch(e2) {}
}
window.applyPreActivitySelect=applyPreActivitySelect;

function selectBizType(t){
  bizType=t;
  ['store','office','corp'].forEach(x=>{
    const card=document.getElementById('biz-'+x);
    const chk=document.getElementById('chk-biz-'+x);
    if(x===t){
      card.style.borderColor='rgba(201,168,76,.6)';
      card.style.background='rgba(201,168,76,.08)';
      chk.style.background='var(--gold)';
      chk.style.borderColor='var(--gold)';
    } else {
      card.style.borderColor='rgba(255,255,255,.1)';
      card.style.background='rgba(255,255,255,.04)';
      chk.style.background='';
      chk.style.borderColor='rgba(255,255,255,.2)';
    }
  });
}

function goFromBizType(){
  if(!bizType){alert(isAr?'يرجى اختيار نوع المؤسسة':'Veuillez choisir le type d\'établissement');return;}
  renderRegActivitySelects(bizType);
  if(bizType==='store') showPanel('p-store-form',2,4);
  else if(bizType==='office') showPanel('p-office-form',2,4);
  else showPanel('p-corp-form',2,4);
}

function _regLang(){
  return (window.RizqI18n && RizqI18n.getLang() === 'fr') ? 'fr' : 'ar';
}

function renderRegActivitySelects(accountType, packageRef){
  if(!window.RizqMerchantActivities) return;
  var lang = _regLang();
  var map = { store: 'st-cat', office: 'of-cat', corp: 'cr-cat' };
  Object.keys(map).forEach(function(t){
    var el = document.getElementById(map[t]);
    if(!el) return;
    if(accountType && t !== accountType) return;
    var pref = '';
    try {
      if(window._rizqPreActivity && (!accountType || accountType === t)) pref = String(window._rizqPreActivity);
    } catch(ePref) {}
    RizqMerchantActivities.renderSelect(el, {
      accountType: t,
      packageId: packageRef || null,
      lang: lang,
      selected: pref || el.value || '',
    });
  });
  var ppEl = document.getElementById('pp-activity-select');
  if(ppEl && accountType){
    var prefPp = '';
    try { if(window._rizqPreActivity) prefPp = String(window._rizqPreActivity); } catch(ePp) {}
    RizqMerchantActivities.renderSelect(ppEl, {
      accountType: accountType,
      packageId: packageRef || null,
      lang: lang,
      selected: prefPp || ppEl.value || '',
    });
  }
  if(window.RizqActivitySelect){
    Object.keys(map).forEach(function(t){
      if(accountType && t !== accountType) return;
      var el = document.getElementById(map[t]);
      if(el) RizqActivitySelect.enhance(el);
    });
    if(ppEl && accountType) RizqActivitySelect.enhance(ppEl);
  }
}

function ppRenderActivitiesForSelectedPkg(){
  if(!window.RizqMerchantActivities || !_ppSelectedPkg) return;
  var accountType = (_ppPendingData && _ppPendingData.type) || bizType || 'store';
  var pkg = _ppPkgCatalog && _ppPkgCatalog[_ppSelectedPkg.idx];
  var pkgId = pkg && (pkg.id || pkg.packageId) ? (pkg.id || pkg.packageId) : null;
  renderRegActivitySelects(accountType, pkgId);
  var formMap = { store: 'st-cat', office: 'of-cat', corp: 'cr-cat' };
  var formSel = document.getElementById(formMap[accountType]);
  var ppSel = document.getElementById('pp-activity-select');
  if(formSel && formSel.value && ppSel){
    ppSel.value = formSel.value;
  }
}

function _setRegUploadFile(varName,file){
  switch(varName){
    case 'stFile': stFile=file; break;
    case 'ofFile1': ofFile1=file; break;
    case 'ofFile2': ofFile2=file; break;
    case 'crFile1': crFile1=file; break;
    case 'crFile2': crFile2=file; break;
    case 'crFile3': crFile3=file; break;
    case 'indFile': indFile=file; break;
    default: window[varName]=file;
  }
}

function handleUpload(inputId,zoneId,varName){
  const file=document.getElementById(inputId).files[0];
  if(!file) return;
  // إصلاح 13/08/2026: لم يكن هناك أي تحقق من حجم الملف هنا رغم أن كل صناديق
  // الرفع (محل/مكتب/شركة) تعرض نصاً صريحاً "حجم أقصى 5MB" — ملف أكبر كان
  // يُقبَل بصمت في الواجهة، ثم عند تحويله لاحقاً إلى base64 (submitStoreReg/
  // submitOfficeReg/submitCorpReg) قد يتجاوز الحد المسموح به في الخادم.
  if(file.size>5*1024*1024){
    alert(isAr?'حجم الملف يجب أن لا يتجاوز 5MB':'La taille du fichier ne doit pas dépasser 5 Mo');
    document.getElementById(inputId).value='';
    return;
  }
  // إصلاح 02/09/2026: كان يُعيَّن window.indFile بينما التحقق يقرأ let indFile —
  // فيظهر ✅ للمستخدم لكن submitIndividualReg يرفض بـ "يرجى رفع صورة البطاقة".
  _setRegUploadFile(varName,file);
  const zone=document.getElementById(zoneId);
  const isImg=file.type&&file.type.indexOf('image/')===0;
  const thumb=isImg
    ? '<img src="'+URL.createObjectURL(file)+'" alt="" style="width:100%;max-height:130px;object-fit:contain;border-radius:8px;margin-bottom:8px;border:1px solid rgba(74,222,128,.35);background:rgba(0,0,0,.15)"/>'
    : '<div style="font-size:28px;margin-bottom:6px">📄</div>';
  zone.innerHTML=thumb
    +'<div style="font-size:18px;margin-bottom:4px">✅</div>'
    +'<p style="color:#4ade80;font-size:12px;font-weight:700">'+escapeHtml(file.name)+'</p>'
    +'<p style="color:var(--text-muted);font-size:10px">'+Math.round(file.size/1024)+' KB · '+(isAr?'تم الرفع بنجاح':'Téléchargé avec succès')+'</p>';
  zone.style.borderColor='rgba(74,222,128,.5)';
  zone.style.background='rgba(74,222,128,.05)';
}

// ── تحويل ملف مرفوع (File) إلى base64 — Promise بدل callback مباشر حتى
// يمكن استخدامه بسهولة (await/then) داخل submitStoreReg/submitOfficeReg/
// submitCorpReg قبل المتابعة لخطوة الدفع. ──
function _fileToBase64(file){
  return new Promise(function(resolve,reject){
    if(!file){ resolve(null); return; }
    const reader=new FileReader();
    reader.onload=function(e){ resolve(e.target.result); };
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}
// رقم التعريف الوطني (NNI) الموريتاني — أرقام فقط، بين 6 و15 رقماً (لا
// صيغة رسمية موحّدة موثّقة للتحقق الصارم؛ تحقق معقول يمنع القيم الفارغة/
// العشوائية دون رفض أرقام حقيقية بالخطأ).
const NNI_RE=/^\d{6,15}$/;

// ── برنامج الإحالة (جيب صاحبك واربح) — يلتقط ?ref=ACC_xxx من رابط الإحالة
// الذي يشاركه أي مشترك من داشبورده، ويحفظه محلياً حتى لحظة إتمام التسجيل
// (قد يمر الزائر بعدة صفحات/خطوات في المعالج قبل أن يصل لـ saveAccountPending).
// نتحقق من الصيغة هنا أيضاً لمنع تخزين أي قيمة عشوائية من عنوان الرابط.
(function(){
  try{
    var refParam = new URLSearchParams(location.search).get('ref');
    if(refParam && /^ACC_\d{10,20}$/.test(refParam)){
      localStorage.setItem('rizq_referred_by', refParam);
    }
  }catch(e){}
})();

var RIZQ_TERMS_VERSION = 'v1.0-2026-06-22';

function _genDashToken(){
  /* تطوير بلا خادم فقط — يُفضَّل crypto.getRandomValues */
  try{
    if(window.crypto && crypto.getRandomValues){
      var buf=new Uint8Array(24);
      crypto.getRandomValues(buf);
      var hex=Array.prototype.map.call(buf,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
      return 'TK_'+hex.toUpperCase();
    }
  }catch(e){}
  return '';
}

function _normalizeIntlPhone(raw){
  var s=String(raw||'').trim();
  if(!s) return '';
  var digits=s.replace(/[^\d+]/g,'');
  if(digits.indexOf('00')===0) digits='+'+digits.slice(2);
  if(digits.indexOf('+')!==0){
    digits=digits.replace(/\D/g,'');
    if(digits.length>=8) digits='+'+digits;
    else return '';
  }
  var num=digits.replace(/\D/g,'');
  return (num.length>=8 && num.length<=15) ? ('+'+num) : '';
}

function syncIndWhatsapp(){
  var same=document.getElementById('ind-wa-same');
  var wa=document.getElementById('ind-whatsapp');
  if(!same||!wa) return;
  if(same.checked){
    var mr=(document.getElementById('ind-phone-mr').value||'').replace(/\D/g,'');
    var intl=_normalizeIntlPhone(document.getElementById('ind-phone-intl').value);
    if(/^(2[0-9]|3[0-9]|4[0-9])\d{6}$/.test(mr)) wa.value='+222'+mr;
    else if(intl) wa.value=intl;
    wa.disabled=true;
  } else {
    wa.disabled=false;
  }
}

function _purgeLocalIdImage(accId){
  try{
    var accs=JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
    var rec=accs.find(function(a){ return a.id===accId; });
    if(rec){
      delete rec.id_image;
      delete rec.idImage;
      rec.id_verified=true;
      rec.id_verified_at=new Date().toISOString();
      localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs));
    }
  }catch(e){}
}

function _autoApproveAccount(data){
  var t=data.type||'';
  var policy=window.RizqVerificationPolicy;
  if(!policy || !policy.canAutoApprove(t)) {
    if(policy && policy.requiresActivityAndId(t)){
      data.id_status=data.id_status||policy.pendingStatusFor(t);
      data.activityDocRequired=true;
    }
    return;
  }
  /* بلا خادم فقط: تفعيل محلي للتطوير. مع الخادم: المصدر هو الرد بعد OTP */
  if(!window.RIZQ_BACKEND_BASE){
    data.status='approved';
    data.approvedAt=new Date().toISOString();
    var localTok = data.token || _genDashToken();
    if(!localTok) return; /* لا تفعيل بلا توكن آمن */
    data.token=localTok;
    data.dashToken=data.dashToken||data.token;
    data.autoVerified=true;
    if(t==='individual') data.id_status=data.id_status||'auto_archived';
    else data.id_status=data.id_status||'trial_active';
    if(policy && policy.isIdOnlyTier(t) && data.nni){
      data.id_verified=true;
      data.id_verified_at=new Date().toISOString();
    }
    try{
      localStorage.setItem('rizq_active_session', JSON.stringify({
        id: data.id, token: data.token, type: t, name: data.name||data.owner||data.manager||''
      }));
    }catch(e){}
  }
}

function saveAccountPending(data){
  const accounts=JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
  data.id='ACC_'+Date.now();
  data.referredBy = localStorage.getItem('rizq_referred_by') || '';
  data.status='pending';
  data.id_status = data.id_status || 'suspended_pending_id';
  data.submittedAt=new Date().toISOString();
  data.legal_consent = {
    agreed: true,
    termsVersion: RIZQ_TERMS_VERSION,
    agreedAt: new Date().toISOString(),
    ip: 'غير مسجَّل — لا يوجد خادم لتسجيل عنوان IP في النسخة الحالية (ثابتة/بلا باك إند)'
  };
  _autoApproveAccount(data);
  accounts.push(data);
  localStorage.setItem('rizq_pending_accounts',JSON.stringify(accounts));
  // store last account id for ID upload step
  localStorage.setItem('rizq_last_acc_id', data.id);
  // dedicated consent log for audit (separate from account record, never purged by cleanup)
  try{
    const log=JSON.parse(localStorage.getItem('rizq_consent_log')||'[]');
    log.push({accountId:data.id, name:data.name||data.owner||data.manager||'', termsVersion:RIZQ_TERMS_VERSION, agreedAt:data.legal_consent.agreedAt, ip:data.legal_consent.ip});
    localStorage.setItem('rizq_consent_log',JSON.stringify(log));
  }catch(e){}
  return _syncAccountToBackend(data).then(function(result){
    var pol=window.RizqVerificationPolicy;
    if(data.autoVerified && pol && pol.isIdOnlyTier(data.type)){
      _purgeLocalIdImage(data.id);
    }
    return result;
  });
}

function _rollbackLocalAccount(accId){
  try{
    var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
    accs = accs.filter(function(a){ return a.id !== accId; });
    localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs));
  }catch(e){}
  try{
    if(localStorage.getItem('rizq_last_acc_id') === accId) localStorage.removeItem('rizq_last_acc_id');
  }catch(e){}
  try{
    var log = JSON.parse(localStorage.getItem('rizq_consent_log')||'[]');
    log = log.filter(function(e){ return e.accountId !== accId; });
    localStorage.setItem('rizq_consent_log', JSON.stringify(log));
  }catch(e){}
}

function nniRejectMessage(data){
  return isAr
    ? ((data && data.error) || 'رقم الهوية (NNI) مستخدم بالفعل لحساب آخر')
    : ((data && data.error_fr) || 'Ce numéro d\'identité (NNI) est déjà associé à un autre compte');
}

function checkNniAvailable(nni){
  if(!window.RIZQ_BACKEND_BASE || !nni) return Promise.resolve(true);
  return fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/nni-available?nni=' + encodeURIComponent(nni))
    .then(function(res){
      return res.json().then(function(data){ return { res: res, data: data }; }).catch(function(){ return { res: res, data: null }; });
    })
    .then(function(out){
      var data = out.data;
      if(data && (data.code === 'nni_duplicate' || data.code === 'nni_invalid' || data.available === false)){
        alert(nniRejectMessage(data));
        return false;
      }
      return true;
    })
    .catch(function(){ return true; });
}

// ── إصلاح جوهري: كان التسجيل محلياً 100% في localStorage — لا يرى الأدمن
// طلب أي مشترك جديد إلا إن فتح نفس المتصفح الذي سجّل منه بالضبط (لن يحدث
// هذا أبداً في نشر حقيقي متعدد الأجهزة). الآن، إن أشار rizq_backend_config.js
// إلى خادم فعلي منشور، نرسل نسخة من الطلب إلى /api/accounts (عام، بلا سرّ)
// بنفس معرّف الحساب المحلي — فيراه الأدمن من أي جهاز عبر GET /api/accounts/admin
// (مُفعَّل بالفعل في rizq_admin.html). فشل الشبكة أو عدم نشر الخادم بعد لا
// يكسر التسجيل المحلي إطلاقاً — يستمر العمل تماماً كما كان قبل هذا التعديل.
function _syncAccountFailMessage(httpStatus, data){
  var code = String((data && data.code) || '');
  var err = String((data && (data.error || data.message)) || '');
  if(httpStatus === 429){
    return isAr ? 'ضغط مؤقت، أعد المحاولة بعد دقيقة' : 'Charge temporaire, réessayez dans une minute';
  }
  if(httpStatus === 409 && (
    code === 'email_in_use' || code === 'email_duplicate' || /email/i.test(code)
    || /email|بريد|déjà|already/i.test(err)
  )){
    return isAr ? 'البريد مسجّل مسبقاً، سجّل الدخول' : 'Cet e-mail est déjà enregistré, connectez-vous';
  }
  return isAr ? 'تعذّر إتمام التسجيل، أعد المحاولة' : 'Impossible de finaliser l\'inscription, réessayez';
}

function _reenablePkgSubmitBtn(){
  try{
    var btn = document.querySelector('#p-pkg-payment button.m-btn-main, #p-pkg-payment .m-btn-main, button[onclick*="ppFinalSubmit"]');
    if(btn){ btn.disabled = false; }
  }catch(e){}
}

function _syncAccountToBackend(acc){
  if(!window.RIZQ_BACKEND_BASE) return Promise.resolve({ ok: true, localOnly: true });
  return fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({
      id: acc.id,
      type: acc.type || '',
      name: acc.name || acc.owner || acc.manager || '',
      phone: acc.phone || '',
      phoneIntl: acc.phoneIntl || acc.phone_intl || '',
      whatsapp: acc.whatsapp || '',
      email: acc.email || '',
      // ضروري لـ seller-login بعد التسجيل — يُهشَّر على الخادم فوراً ولا يُعاد في الرد
      password: acc.password || '',
      dashToken: acc.dashToken || acc.token || '',
      city: acc.city || '',
      category: acc.category || '',
      activityId: acc.activityId || '',
      activity: acc.activity || '',
      packageId: acc.packageId || acc.package_id || '',
      referredBy: acc.referredBy || '',
      // إصلاح 13/08/2026: nni/id_image/license_image كانت تُجمَع بالواجهة (محل/
      // مكتب/شركة) لكن لا تُرسَل هنا إطلاقاً — تبقى حبيسة localStorage فقط
      // فتصبح شارة "موثّق" غير قابلة للتحقق من أي جهاز آخر غير جهاز التسجيل.
      nni: acc.nni || '',
      foreignId: acc.foreignId || '',
      nationality: acc.nationality || '',
      nationalityCountry: acc.nationalityCountry || '',
      idImage: acc.id_image || '',
      licenseImage: acc.license_image || '',
      activityImage2: acc.activity_image2 || acc.activityImage2 || '',
      // كلمة المرور تُشفَّر على الخادم فقط (bcrypt) — لا تُعاد في الرد
      password: acc.password || ''
    })
  }).then(function(res){
    return res.json().then(function(data){ return { res: res, data: data }; }).catch(function(){ return { res: res, data: null }; });
  }).then(function(out){
    var res = out.res;
    var data = out.data;
    if(data && (data.code === 'nni_duplicate' || data.code === 'nni_invalid' || data.code === 'nni_unavailable')){
      _rollbackLocalAccount(acc.id);
      return { ok: false, blocked: true, code: data.code, message: nniRejectMessage(data) };
    }
    // كان الخطأ يُعامل كنجاح (ok:true) رغم 429/409/5xx — الحساب يبقى محلياً فقط
    // ولا يصل للأدمن. عند ضبط الخادم: أي فشل HTTP أو رد ناقص → تراجع محلي.
    if(!res.ok){
      _rollbackLocalAccount(acc.id);
      return {
        ok: false,
        blocked: true,
        code: (data && data.code) || ('http_' + res.status),
        status: res.status,
        message: _syncAccountFailMessage(res.status, data)
      };
    }
    if(!data || !data.ok || !data.accessToken){
      _rollbackLocalAccount(acc.id);
      return {
        ok: false,
        blocked: true,
        code: (data && data.code) || 'sync_incomplete',
        status: res.status,
        message: _syncAccountFailMessage(res.status || 500, data)
      };
    }
    // نخزّن توكن الوصول الخاص بالحساب محلياً — سيُستخدم لاحقاً من داشبورد
    // المشترك نفسه للاستعلام عن حالة الموافقة الحقيقية عبر GET /api/accounts/mine/:id
    // ونزامن status/dashToken من الخادم حتى يطابق التوجيه لوحة النوع الصحيح.
    try{
      var accs2 = JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
      var rec = accs2.find(function(a){ return a.id===acc.id; });
      if(rec){
        rec.backendAccessToken = data.accessToken;
        delete rec.password;
        if(data.dashToken){
          rec.token = data.dashToken;
          rec.dashToken = data.dashToken;
        }
        if(data.status) rec.status = data.status;
        if(data.type) rec.type = data.type;
        if(data.autoApproved){
          rec.autoVerified = true;
          rec.approvedAt = rec.approvedAt || new Date().toISOString();
        } else if(data.status === 'pending'){
          rec.status = 'pending';
          rec.autoVerified = false;
        }
        localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs2));
        acc.backendAccessToken = data.accessToken;
        delete acc.password;
        if(data.dashToken){ acc.token = data.dashToken; acc.dashToken = data.dashToken; }
        if(data.status) acc.status = data.status;
        if(window.RizqAccount && typeof window.RizqAccount.setActiveSession === 'function' && acc.status === 'approved' && acc.token){
          window.RizqAccount.setActiveSession(acc);
        }
      }
    }catch(e){}
    return {
      ok: true,
      autoApproved: !!data.autoApproved,
      status: data.status,
      type: data.type,
      otpRequired: !!data.otpRequired,
      accessToken: data.accessToken,
      id: data.id || acc.id,
    };
  }).catch(function(){
    // شبكة معطّلة والخادم مضبوط — لا تُعرض شاشة النجاح ولا يُترك حساب محلي يتيم
    _rollbackLocalAccount(acc.id);
    return {
      ok: false,
      blocked: true,
      code: 'network',
      message: isAr ? 'تعذّر إتمام التسجيل، أعد المحاولة' : 'Impossible de finaliser l\'inscription, réessayez'
    };
  });
}

/** بعد التسجيل: إن بقي الحساب معلّقاً بانتظار OTP — أرسل الرمز وفعّل فوراً حتى يدخل الزبون */
function _completeEmailOtpActivation(acc, syncResult){
  if(!window.RIZQ_BACKEND_BASE || !acc || !acc.email) return Promise.resolve({ ok: false });
  var base = window.RIZQ_BACKEND_BASE.replace(/\/$/,'');
  var accessToken = (syncResult && syncResult.accessToken) || acc.backendAccessToken || '';
  var accountId = (syncResult && syncResult.id) || acc.id;
  if(!accessToken || !accountId) return Promise.resolve({ ok: false });

  return fetch(base + '/api/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: 'buyer',
      email: acc.email,
      name: acc.name || acc.owner || '',
      phoneMr: String(acc.phone || '').replace(/\D/g, '').slice(-8),
      phoneIntl: acc.phoneIntl || '',
      whatsapp: acc.whatsapp || ''
    })
  }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, data: j }; }); })
  .then(function(sendRes){
    if(!sendRes.ok || !sendRes.data || !sendRes.data.ok){
      return { ok: false, message: (sendRes.data && sendRes.data.message) || (isAr?'تعذّر إرسال رمز التفعيل':'Échec envoi du code') };
    }
    var hint = sendRes.data.devHint ? (isAr?('\n\nرمز التطوير: '+sendRes.data.devHint):('\n\nCode dev: '+sendRes.data.devHint)) : '';
    var code = window.prompt(
      (isAr?'أدخل رمز التفعيل المرسل إلى بريدك (6 أرقام) لتفعيل الدخول فوراً:':'Entrez le code à 6 chiffres envoyé à votre e-mail :') + hint,
      sendRes.data.devHint || ''
    );
    if(!code || String(code).replace(/\D/g,'').length !== 6){
      return { ok: false, message: isAr?'لم يُدخل رمز التفعيل — يمكنك تفعيله لاحقاً من صفحة الدخول':'Code manquant — activez plus tard depuis la connexion' };
    }
    return fetch(base + '/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'buyer', email: acc.email, code: String(code).replace(/\D/g,'').slice(0,6) })
    }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, data: j }; }); })
    .then(function(verRes){
      if(!verRes.ok || !verRes.data || !verRes.data.ok){
        return { ok: false, message: (verRes.data && verRes.data.message) || (isAr?'رمز غير صحيح':'Code incorrect') };
      }
      return fetch(base + '/api/accounts/activate-by-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-account-token': accessToken },
        body: JSON.stringify({ id: accountId, accessToken: accessToken })
      }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, data: j }; }); })
      .then(function(actRes){
        if(!actRes.ok || !actRes.data || !actRes.data.ok || !actRes.data.account){
          return { ok: false, message: (actRes.data && actRes.data.error) || (isAr?'تعذّر التفعيل':'Activation impossible') };
        }
        var a = actRes.data.account;
        acc.status = 'approved';
        acc.autoVerified = true;
        acc.token = a.dashToken || a.token;
        acc.dashToken = a.dashToken || a.token;
        acc.backendAccessToken = a.accessToken || accessToken;
        try{
          var list = JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
          var idx = list.findIndex(function(x){ return x.id === acc.id; });
          if(idx >= 0){
            list[idx].status = 'approved';
            list[idx].token = acc.token;
            list[idx].dashToken = acc.dashToken;
            list[idx].backendAccessToken = acc.backendAccessToken;
            list[idx].autoVerified = true;
            delete list[idx].password;
            localStorage.setItem('rizq_pending_accounts', JSON.stringify(list));
          }
          if(window.RizqAccount && typeof window.RizqAccount.setActiveSession === 'function'){
            window.RizqAccount.setActiveSession(acc);
          }
        }catch(e){}
        return { ok: true, activated: true };
      });
    });
  }).catch(function(){
    return { ok: false, message: isAr?'تعذّر الاتصال بالخادم':'Connexion impossible' };
  });
}
// ID upload handlers
var _idCardB64 = null;
function previewIdCard(input){
  if(!input.files||!input.files[0])return;
  const f=input.files[0];
  if(f.size>5*1024*1024){alert(isAr?'حجم الصورة يجب أن لا يتجاوز 5MB':'La taille de l\'image ne doit pas dépasser 5 Mo');return;}
  const reader=new FileReader();
  reader.onload=function(e){
    _idCardB64=e.target.result;
    document.getElementById('id-card-img').src=_idCardB64;
    document.getElementById('id-card-preview').style.display='block';
    document.getElementById('id-upload-zone').style.display='none';
  };
  reader.readAsDataURL(f);
}
function clearIdCard(){
  _idCardB64=null;
  document.getElementById('f-id-card').value='';
  document.getElementById('id-card-preview').style.display='none';
  document.getElementById('id-upload-zone').style.display='block';
}
function submitIdUpload(){
  if(!_idCardB64){alert(isAr?'يرجى رفع صورة البطاقة الوطنية':'Veuillez télécharger une photo de la carte d\'identité nationale');return;}
  // Save ID image against last account
  var accId=localStorage.getItem('rizq_last_acc_id');
  if(accId){
    var accounts=JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
    var acc=accounts.find(function(a){return a.id===accId;});
    if(acc){
      acc.id_status='pending_review';
      acc.id_image=_idCardB64;
      acc.id_submitted_at=new Date().toISOString();
      localStorage.setItem('rizq_pending_accounts',JSON.stringify(accounts));
      // إصلاح 13/08/2026: خطوة رفع صورة الهوية للحساب الفردي تأتي بعد
      // saveAccountPending() (وبالتالي بعد المزامنة الأولى مع الخادم) —
      // كانت الصورة تُحفَظ محلياً هنا فقط ولا تصل الخادم أبداً حتى لو نجحت
      // المزامنة الأولى. الآن، إن كان لدينا accessToken حقيقي من تلك
      // المزامنة الأولى، نُرسِل الصورة مباشرة عبر PATCH — فشل الشبكة أو
      // عدم وجود توكن بعد لا يكسر التسجيل المحلي (نفس فلسفة _syncAccountToBackend).
      if(window.RIZQ_BACKEND_BASE && acc.backendAccessToken){
        var patchBody = { idImage: _idCardB64 };
        if(acc.nni) patchBody.nni = acc.nni;
        fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/mine/' + encodeURIComponent(accId), {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json', 'x-account-token': acc.backendAccessToken },
          body: JSON.stringify(patchBody)
        }).then(function(res){
          return res.json().then(function(data){ return { res: res, data: data }; }).catch(function(){ return { res: res, data: null }; });
        }).then(function(out){
          var data = out.data;
          if(data && (data.code === 'nni_duplicate' || data.code === 'nni_invalid' || data.code === 'nni_locked')){
            alert(nniRejectMessage(data));
          }
        }).catch(function(){ /* صامت — نفس فلسفة _syncAccountToBackend */ });
      }
    }
  }
  ALL_PANELS.forEach(function(p){var el=document.getElementById(p);if(el)el.style.display='none';});
  document.getElementById('p-ok').style.display='block';
  document.getElementById('sdots').style.display='none';
}
function skipIdUpload(){
  ALL_PANELS.forEach(function(p){var el=document.getElementById(p);if(el)el.style.display='none';});
  document.getElementById('p-ok').style.display='block';
  document.getElementById('sdots').style.display='none';
}
