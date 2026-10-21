/* Token hardening: accessToken never persisted to localStorage — use RizqDash */
if (window.RizqDash && RizqDash.purgeSensitiveTokensFromStorage) { try { RizqDash.purgeSensitiveTokensFromStorage(); RizqDash.stripUrlToken(); } catch (ePurge) {} }
/* extracted from rizq_dashboard_store.html — do not edit HTML for logic */
(function(){try{if(/[?&]embed=1(?:&|$)/.test(location.search))document.documentElement.classList.add('rizq-dash-embed');}catch(e){}})();
;
if(window.RizqAccount)RizqAccount.bootstrapDashboard();
;
(function trySSC(){if(typeof renderServicesShowcase==='function')renderServicesShowcase();else setTimeout(trySSC,60);})()
;
(function(){try{if(typeof renderRizqPayment==='function')renderRizqPayment("bank-payment-widget");}catch(e){}})()
;

// ══ TOKEN VERIFICATION ══
const params = new URLSearchParams(window.location.search);
var SESSION_ID = '';
var SESSION_TOKEN = '';
const IS_DEMO = params.get('demo') === '1';
(function rizqHydrateDashSession(){
  if(IS_DEMO) return;
  if(window.RizqAccount && typeof window.RizqAccount.recoverSessionParams === 'function'){
    var rec = window.RizqAccount.recoverSessionParams('store');
    if(rec){ SESSION_ID = rec.id || ''; SESSION_TOKEN = rec.token || ''; return; }
  }
  SESSION_ID = params.get('id') || '';
  SESSION_TOKEN = params.get('token') || '';
  if(SESSION_ID && !SESSION_TOKEN && window.RizqAccount && typeof window.RizqAccount.readDashToken === 'function'){
    SESSION_TOKEN = window.RizqAccount.readDashToken(SESSION_ID);
  }
})();


const DEMO_ACCOUNT = {
  id: "demo",
  name: "محل النجمة — بيانات ترويجية",
  phone: "44 00 11 22",
  email: "demo-store@rizq.mr",
  wilaya: "نواكشوط",
  type: "store",
  status: "approved",
  desc: "واجهة محل تجريبية للترويج فقط — ليست بيانات حقيقية",
  plan: "سنوية",
  planName: "سنوية",
  /* نفس الروابط التي تظهر في واجهة المحل التجريبية — واضحة وقابلة للمعاينة هنا */
  promo_video: "rizq-assets/promo/rizq-dashboard-store-demo-light.mp4",
  promo_video_extra: "https://www.youtube.com/watch?v=eRsGyueVLvQ",
  serviceDesk: {
    enabled: true,
    formTitle: 'طلب خدمة — محل النجمة',
    formHint: 'بياناتك سرية. يمكنك رفع بيان الدفع (صورة أو PDF) مباشرة على المنصة.',
    docsChannel: 'whatsapp'
  }
};

const DEMO_PRODUCTS = [
  { id:"DP1", name:"دراعة رجالية فاخرة", price:45000, cat:"أزياء", emoji:"👔", status:"available", stock:12, sold:48, unit:"قطعة", desc:"" },
  { id:"DP2", name:"عطر شرقي 100مل", price:18000, cat:"عطور", emoji:"🧴", status:"available", stock:30, sold:120, unit:"قطعة", desc:"" },
  { id:"DP3", name:"حذاء رياضي رجالي", price:22000, cat:"أحذية", emoji:"👟", status:"limited", stock:4, sold:65, unit:"زوج", desc:"" },
  { id:"DP4", name:"ساعة كلاسيكية", price:35000, cat:"إكسسوارات", emoji:"⌚", status:"available", stock:8, sold:33, unit:"قطعة", desc:"" }
];

const DEMO_MESSAGES = [
  { id:"DM1", from:"زائر تجريبي", text:"هل يتوفر مقاس XL؟ (بيانات ترويجية)", date:new Date().toISOString(), read:false },
  { id:"DM2", from:"عميل تجريبي", text:"ممكن التوصيل لنواذيبو؟ (بيانات ترويجية)", date:new Date().toISOString(), read:true }
];

function verifyAccess(){
  if(IS_DEMO) return DEMO_ACCOUNT;
  if(!SESSION_ID || !SESSION_TOKEN) return false;
  const accs = JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
  return accs.find(a=>a.id===SESSION_ID && a.token===SESSION_TOKEN && a.status==='approved' && a.type==='store') || null;
}

// ── إصلاح جوهري: عند فتح المالك رابط الداشبورد من جهازه الخاص (وليس نفس
// متصفح الأدمن الذي وافق عليه)، لا يوجد محلياً أي سجل لهذا الحساب — كانت
// الصفحة تعرض "تم رفض الوصول" رغم أن الحساب مُفعَّل فعلياً على الخادم. الآن،
// إن تعذّر العثور على سجل محلي، نحاول التحقق من الخادم (rizq_backend_config.js
// + /api/accounts/verify-dash) قبل الرفض النهائي، ونخزّن النتيجة محلياً حتى
// تعمل الجلسات التالية على هذا الجهاز بلا حاجة متكررة للشبكة.
function verifyAccessRemote(){
  return new Promise(function(resolve){
    if(!window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN){ resolve(null); return; }
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/verify-dash/' + encodeURIComponent(SESSION_ID), { method:'POST', headers:{'Content-Type':'application/json','x-dash-token':SESSION_TOKEN}, body:JSON.stringify({dashToken:SESSION_TOKEN}) })
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(data){
        if(!data || !data.ok || !data.account || data.account.type!=='store'){ resolve(null); return; }
        var acc = Object.assign({ token: SESSION_TOKEN, status:'approved' }, data.account);
        try{
          var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
          if(!accs.some(function(a){return a.id===acc.id;})) { accs.push(acc); localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs)); }
        }catch(e){}
        resolve(acc);
      }).catch(function(){ resolve(null); });
  });
}

function showAccessDenied(){
  document.getElementById('access-denied').style.display='flex';
  document.getElementById('sidebar').style.display='none';
  document.querySelector('.main').style.display='none';
}

// ══ إصلاح جوهري (نفس علّة rizq_dashboard.html بتاريخ 2026-08-05) ══
// SESSION_TOKEN هنا هو dashToken (من رابط الداشبورد ?token=) — مختلف
// تماماً عن accessToken الحقيقي الذي يتطلبه verifyAccountOwner() بالخادم
// لكل فعل كتابة حقيقي (منتجات، ساعات عمل، ملف تجاري، مناقصات، رسائل...).
// كل نداءات x-account-token بهذا الملف كانت ترسل SESSION_TOKEN مباشرة —
// تفشل بـ401 من الخادم بصمت. الحل: window.REAL_ACCESS_TOKEN يُحل من
// مصدرين — (أ) rizq_pending_accounts[].accessToken أو .backendAccessToken
// المحفوظ محلياً (accessToken تُدمَج تلقائياً هنا عبر verifyAccessRemote
// أعلاه التي تدمج data.account كاملاً؛ backendAccessToken هو نفس الحقل
// الذي يستخدمه rizq_landing_v8.html._syncAccountToBackend عند التسجيل
// من نفس الجهاز) — (ب) وإلا POST /api/accounts/exchange-dash-token/:id.

window.REAL_ACCESS_TOKEN = null;
function _resolveRealAccessToken(acc){
  if (window.RizqDash && typeof RizqDash.resolveAccessToken === 'function') {
    var dash = (typeof SESSION_TOKEN !== 'undefined' && SESSION_TOKEN) || (acc && (acc.token || acc.dashToken)) || '';
    return RizqDash.resolveAccessToken(acc, dash).then(function(tok){
      window.REAL_ACCESS_TOKEN = tok || null;
      if (tok && typeof SESSION_TOKEN !== 'undefined') {
        try {
          var nd = sessionStorage.getItem('rizq_dash_token_' + (acc && acc.id)) || '';
          if (nd) SESSION_TOKEN = nd;
        } catch (e) {}
      }
      return window.REAL_ACCESS_TOKEN;
    });
  }
  return Promise.resolve(null);
}

function initSubscriptionLifecycle(accId, accType) {
  if(!accId || typeof RizqSub === 'undefined') return;

  RizqSub.runLifecycleCheck(accId, {

    onActive: function(sub) {
      // اشتراك نشط — لا شيء مرئي
      _applyFeatureGates(sub);
    },

    onTrial: function(sub) {
      _applyFeatureGates(sub);
      _showSubBanner({
        icon:'🎁', color:'#0891b2',
        title:_t2('أنت في الفترة التجريبية المجانية','Vous êtes en période d\'essai gratuite'),
        msg: _t2('تنتهي خلال <strong>'+sub.daysLeft+'</strong> يوم — اشترك الآن لتحتفظ بمزاياك','Elle expire dans <strong>'+sub.daysLeft+'</strong> jour(s) — abonnez-vous maintenant'),
        cta:_t2('🚀 اشترك الآن','🚀 S\'abonner maintenant'), ctaFn:'_openRenewalPanel()'
      });
    },

    onExpiringReminder: function(sub) {
      _applyFeatureGates(sub);
      _showSubBanner({
        icon:'⚠️', color:'#d97706',
        title:_t2('باقتك تنتهي '+(sub.daysLeft<=0?'اليوم':'غداً')+'!','Votre forfait expire '+(sub.daysLeft<=0?'aujourd\'hui':'demain')+'!'),
        msg: _t2('جدّد باقة <strong>'+sub.pkg+'</strong> الآن حتى لا تفقد مزاياك','Renouvelez le forfait <strong>'+sub.pkg+'</strong> maintenant pour ne pas perdre vos avantages'),
        cta:_t2('🔄 جدّد الآن','🔄 Renouveler maintenant'), ctaFn:'_openRenewalPanel()',
        urgent: true
      });
    },

    onExpired: function(sub) {
      _applyFeatureGates(sub);
      window._rizqDashReadOnly = true;
      var upgradeAr = 'انتهت الفترة المجانية. يرجى الاشتراك في إحدى الباقات لتتمكن من إضافة إعلانات جديدة وتفعيل زر الاتصال للزبائن';
      var upgradeFr = 'La période d’essai est terminée. Veuillez souscrire à une offre pour publier de nouvelles annonces et activer le bouton d’appel pour vos clients.';
      _showSubBanner({
        icon:'🔒', color:'#dc2626',
        title:_t2('انتهت الفترة المجانية / الاشتراك','Essai ou abonnement terminé'),
        msg:_t2(upgradeAr, upgradeFr),
        cta:_t2('♻️ اشترك الآن','♻️ Souscrire maintenant'), ctaFn:'_openRenewalPanel()',
        persistent: true
      });
      _showExpiredOverlay(sub);
      _applyDashboardReadOnly();
    },

    onNoSubscription: function(sub) {
      _showSubBanner({
        icon:'📦', color:'#1B3A6B',
        title:_t2('لا يوجد اشتراك نشط','Aucun abonnement actif'),
        msg: _t2('اختر باقة لتفعيل جميع مزايا حسابك على رزق','Choisissez un forfait pour activer tous les avantages de votre compte Rizq'),
        cta:_t2('📦 اختر باقة','📦 Choisir un forfait'), ctaFn:'_openRenewalPanel()'
      });
    }
  });
}

function _showSubBanner(opts) {
  var old = document.getElementById('rizq-sub-banner');
  if(old) old.remove();
  var banner = document.createElement('div');
  banner.id = 'rizq-sub-banner';
  var urgent = opts.urgent ? 'animation:pulse 1.5s infinite;' : '';
  banner.style.cssText = 'position:relative;z-index:2;width:100%;margin:0 0 16px;padding:14px 18px;border-radius:14px;background:#fff;'
    +'box-shadow:0 2px 14px rgba(15,35,65,.1);border-right:5px solid '+opts.color+';'
    +'display:flex;align-items:center;gap:12px;flex-wrap:wrap;'+urgent;
  banner.innerHTML =
    '<span style="font-size:26px;flex-shrink:0">'+opts.icon+'</span>'
    +'<div style="flex:1">'
    +'<div style="font-size:13px;font-weight:700;color:#1B3A6B;margin-bottom:2px">'+opts.title+'</div>'
    +'<div style="font-size:11.5px;color:#2C3A4F;line-height:1.5">'+opts.msg+'</div>'
    +'</div>'
    +'<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">'
    +'<button onclick="'+opts.ctaFn+'" style="white-space:nowrap;padding:8px 14px;background:'+opts.color+';color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">'+opts.cta+'</button>'
    +(opts.persistent?'':'<button onclick="document.getElementById(\"rizq-sub-banner\").remove()" style="font-size:10px;color:#9ca3af;background:none;border:none;cursor:pointer">'+_t2('تذكيرني لاحقاً','Me rappeler plus tard')+'</button>')
    +'</div>';
  var slot = document.getElementById('rizq-sub-slot') || document.querySelector('.content');
  if(slot) slot.insertBefore(banner, slot.firstChild);
  else document.body.appendChild(banner);
  // أضف animation pulse إذا urgent
  if(opts.urgent && !document.getElementById('sub-pulse-style')) {
    var st = document.createElement('style');
    st.id = 'sub-pulse-style';
    st.textContent = '@keyframes pulse{0%,100%{box-shadow:0 8px 32px rgba(217,119,6,.2)}50%{box-shadow:0 8px 40px rgba(217,119,6,.5)}}';
    document.head.appendChild(st);
  }
}

function _showExpiredOverlay(sub) {
  var upgradeAr = 'انتهت الفترة المجانية. يرجى الاشتراك في إحدى الباقات لتتمكن من إضافة إعلانات جديدة وتفعيل زر الاتصال للزبائن';
  var upgradeFr = 'La période d’essai est terminée. Veuillez souscrire à une offre pour publier de nouvelles annonces et activer le bouton d’appel pour vos clients.';
  var paidSections = ['panel-video','panel-auto-reply','panel-vip','panel-analytics-adv','panel-products','add-product-form'];
  paidSections.forEach(function(id){
    var el = document.getElementById(id);
    if(!el) return;
    if(el.querySelector('.rizq-expired-lock')) return;
    var lock = document.createElement('div');
    lock.className = 'rizq-expired-lock';
    lock.style.cssText = 'position:absolute;inset:0;background:rgba(255,255,255,.9);backdrop-filter:blur(3px);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:inherit;gap:10px;padding:18px;text-align:center';
    lock.innerHTML = '<div style="font-size:36px">🔒</div><div style="font-size:14px;font-weight:800;color:#1B3A6B;max-width:36ch;line-height:1.65">'+_t2(upgradeAr, upgradeFr)+'</div><button type="button" onclick="_openRenewalPanel()" style="margin-top:4px;padding:10px 20px;background:#1B3A6B;color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">♻️ '+_t2('اشترك الآن','Souscrire maintenant')+'</button>';
    el.style.position = 'relative';
    el.appendChild(lock);
  });
}

function _applyDashboardReadOnly() {
  window._rizqDashReadOnly = true;
  var form = document.getElementById('add-product-form') || document.getElementById('add-product-body');
  if (window.RizqSubscriptionPermissions && form) {
    var perms = useSubscriptionPermissions(typeof SESSION_ID !== 'undefined' ? SESSION_ID : '', { isDemo: !!window.IS_DEMO });
    if (!perms.isDashboardWritable) {
      RizqSubscriptionPermissions.disableFormsAndShowUpgradeBanner(form, perms);
    }
  }
  document.querySelectorAll('[data-t="qa-add-product"], #btn-toggle-add-product, [data-t="add-product-title"]').forEach(function(el){
    var btn = el.closest('button,a,.qa-card') || el;
    btn.style.opacity = '0.55';
    btn.style.pointerEvents = 'none';
    btn.setAttribute('aria-disabled', 'true');
    btn.title = _t2('انتهت الفترة المجانية — اشترك للإضافة','Essai terminé — souscrivez pour ajouter');
  });
}

function _applyFeatureGates(sub) {
  // أخفِ أزرار الميزات المدفوعة إذا لم تكن في الباقة
  // ملاحظة 27/07/2026: أُزيلت 'auto_reply_email' من هنا — كانت تستهدف
  // عناصر DOM غير موجودة أصلاً في الصفحة (#btn-email-reply/.feat-auto-email)
  // ولا ميزة حقيقية وراءها (انظر تعليق TIER_FEATURES في rizq_subscription_engine.js).
  var gateMap = {
    'auto_reply_calls' : ['#btn-auto-reply','#auto-reply-section','.feat-auto-call'],
    'vip_manager'      : ['.feat-vip','.vip-section'],
    'analytics'        : ['.feat-analytics','#advanced-stats'],
    'verified_badge'   : ['.feat-verified'],
  };
  Object.keys(gateMap).forEach(function(feat){
    var hasFeat = sub.features.indexOf(feat) !== -1;
    gateMap[feat].forEach(function(sel){
      var els = document.querySelectorAll(sel);
      els.forEach(function(el){
        if(!hasFeat) {
          el.style.opacity = '0.4';
          el.style.pointerEvents = 'none';
          el.title = _t2('يتطلب ترقية الباقة','Mise à niveau requise');
        } else {
          el.style.opacity = '';
          el.style.pointerEvents = '';
          el.title = '';
        }
      });
    });
  });
}

function _openRenewalPanel() {
  // انقل إلى تاب الاشتراك
  var subItem = document.querySelector('.sb-item[onclick*="subscription"]');
  if(subItem) { subItem.click(); return; }
  // أو فتح modal التجديد مباشرة
  var panel = document.getElementById('panel-subscription') || document.getElementById('renewal-section');
  if(panel) { panel.scrollIntoView({behavior:'smooth'}); }
}

// ══ Package Activation Loader ══
function loadActivatedPackage(acc) {
  if(!acc || !acc.id) return acc;
  try {
    var acctStore = JSON.parse(localStorage.getItem('rizq_accounts') || '{}');
    var activated = acctStore[acc.id];
    if(activated && activated.package) {
      // Merge package info
      acc.plan = activated.package;
      acc.planName = activated.package;
      acc.pkg_status = activated.pkg_status || 'active';
      acc.activatedAt = activated.activatedAt;
      // Compute expiry based on package type
      if(!acc.trial_ends || activated.pkg_status === 'active') {
        var base = new Date(activated.activatedAt || Date.now());
        var pkg = String(activated.package);
        if(pkg.indexOf('سنوي')!==-1) base.setFullYear(base.getFullYear()+1);
        else if(pkg.indexOf('ربع')!==-1) base.setMonth(base.getMonth()+3);
        else if(pkg.indexOf('شهر')!==-1) base.setMonth(base.getMonth()+1);
        else if(pkg.indexOf('تجريب')!==-1||pkg.indexOf('مجان')!==-1) base.setDate(base.getDate()+3);
        else base.setMonth(base.getMonth()+1); // default monthly
        acc.trial_ends = base.toISOString();
      }
      // Show activation banner if activated within last 24h
      var activatedMs = activated.activatedAt ? Date.now()-new Date(activated.activatedAt).getTime() : Infinity;
      if(activatedMs < 86400000) {
        setTimeout(function(){
          var isDia = pkg.indexOf('ماسي')!==-1;
          var bg = isDia?'linear-gradient(135deg,#7c3aed,#a855f7)':'linear-gradient(135deg,var(--royal,#1B3A6B),#234d8f)';
          var banner = document.createElement('div');
          banner.style.cssText='position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:9999;padding:14px 24px;border-radius:14px;color:#fff;font-size:14px;font-weight:700;box-shadow:0 8px 30px rgba(0,0,0,.3);text-align:center;animation:fadeUp .4s ease;background:'+bg;
          banner.innerHTML = (isDia?'💎':'✅')+_t2(' تم تفعيل باقتك: ',' Votre forfait activé : ')+'<strong>'+pkg+'</strong>'+_t2(' — مرحباً!',' — Bienvenue !')+'<br/><span style="font-size:11px;opacity:.8;font-weight:400">'+_t2('يمكنك الآن الاستفادة من جميع مزايا باقتك','Profitez dès maintenant de tous les avantages')+'</span>';
          document.body.appendChild(banner);
          setTimeout(function(){banner.remove();},6000);
        }, 800);
      }
    }
  } catch(e) { console.warn('loadActivatedPackage error:',e); }
  // فحص دوري لانتقال حالة الباقة (نشط ← قريب الانتهاء ← منتهٍ) + تنبيهات/قفل المزايا الجاهزة عبر محرك RizqSub
  if(!IS_DEMO && typeof initSubscriptionLifecycle === 'function'){ initSubscriptionLifecycle(acc.id, 'store'); }
  return acc;
}

// ══ INIT ══
function init(){
  if(IS_DEMO){ _initWithAccount(DEMO_ACCOUNT); return; }
  if(!SESSION_ID || !SESSION_TOKEN){ showAccessDenied(); return; }
  // دائماً تحقق من الخادم — لا تثق بـ localStorage وحده
  verifyAccessRemote().then(function(remoteAcc){
    if(remoteAcc) _initWithAccount(remoteAcc); else showAccessDenied();
  });
}

function _initWithAccount(acc){
  STORE = loadActivatedPackage(acc);
  // جلسة عامة موحَّدة يقرأها rizq_tenders.html — ميزة المناقصات الجديدة
  if(!IS_DEMO){ try{ localStorage.setItem('rizq_active_session', JSON.stringify({id: acc.id, token: SESSION_TOKEN, type:'store', name: acc.name||''})); }catch(e){} }

  // Load stored data (demo uses preset data)
  products = IS_DEMO ? DEMO_PRODUCTS : JSON.parse(localStorage.getItem('store_products_'+SESSION_ID)||'[]');
  storePhotos = IS_DEMO ? [] : JSON.parse(localStorage.getItem('store_photos_'+SESSION_ID)||'[]');
  // إصلاح جوهري: _rizqMergeCatalogFromBackend تحتاج accessToken الحقيقي
  // (وليس dashToken) لينجح فعلياً مع verifyAccountOwner() بالخادم — تُستدعى
  // الآن بعد حل window.REAL_ACCESS_TOKEN بدل التوازي معه.
  if(!IS_DEMO) _resolveRealAccessToken(acc).then(function(){
    _rizqMergeCatalogFromBackend();
    _rizqMergeServiceRequests();
    if(typeof applyStoreInventoryPresets==='function') applyStoreInventoryPresets();
    if(typeof RizqAccountPayments !== 'undefined' && acc.id){
      RizqAccountPayments.syncFromBackend(acc.id, window.REAL_ACCESS_TOKEN || SESSION_TOKEN).then(function(methods){
        if(Array.isArray(methods) && typeof renderMyPayments === 'function') renderMyPayments();
      });
    }
  });
  if(typeof applyStoreInventoryPresets==='function') applyStoreInventoryPresets();

  // Fill sidebar
  document.getElementById('sb-store-name').textContent = STORE.name || _t2('محلي','Ma boutique');
  var _wbn=document.getElementById('wb-name');if(_wbn)_wbn.textContent=acc.name||_t2('محل الأمانة للإلكترونيات','Ma Boutique');
  var _wpb=document.getElementById('wb-plan-badge');if(_wpb)_wpb.textContent=_t2('💎 باقة ','💎 Forfait ')+(acc.planName||acc.plan||_t2('تجريبي','Essai'));
  var _wsub=document.getElementById('wb-sub');if(_wsub)_wsub.textContent=(acc.activity||acc.type||_t2('متجر','Commerce'))+' · '+(acc.city||'موريتانيا');
  updateSubBadge();
  try{
    if(Array.isArray(acc.storeTopics)) STORE.storeTopics = acc.storeTopics;
    else if(Array.isArray(STORE.storeTopics)) { /* keep */ }
    else STORE.storeTopics = [];
  }catch(eTop){ STORE.storeTopics = []; }
  renderStoreTopicsUI();

  // Render initial panel
  showPanel('overview', document.querySelector('.sb-item'));
  renderHoursTable();
  if(!IS_DEMO) _rizqMergeHoursFromBackend();
  fillProfileForm();
  renderSubscriptionPanel();
  if(typeof RizqInvoice!=='undefined') renderMyInvoices();
  renderPackagesDisplay();
  renderVideoPackagesDisplay();
  if(!IS_DEMO) _rizqRenderAdsStatus(acc);
  // غرفة الطلبات — هوية + صندوق الوارد
  _rizqMergeServiceRequests();
  loadStoreServiceDeskForm();
  var serviceUnread = (Array.isArray(window._rizqStoreServiceRequests))
    ? window._rizqStoreServiceRequests.filter(function(r){ return r.status === 'new'; }).length : 0;
  var rb = document.getElementById('req-badge');
  if(rb && serviceUnread > 0){ rb.textContent = serviceUnread; rb.style.display = ''; }
  // Welcome banner
  var wbn=document.getElementById('wb-name'); var wbs=document.getElementById('wb-sub');
  if(wbn) wbn.textContent=acc.name||_t2('محلي','Ma boutique');
  var wpb=document.getElementById('wb-plan-badge');if(wpb)wpb.textContent=_t2('💎 باقة ','💎 Forfait ')+(acc.planName||acc.plan||_t2('تجريبي','Essai'));
  if(wbs) wbs.textContent=(acc.storeType||_t2('محل تجاري','Commerce'))+' · '+(acc.city||_t2('موريتانيا','Mauritanie'))+_t2(' · باقة ',' · Forfait ')+(acc.planName||acc.plan||_t2('تجريبي','Essai'));
  if(window.RizqAccount && typeof RizqAccount.initShareLinkInput==='function'){
    RizqAccount.initShareLinkInput('share-link-input', acc);
  }
  if(window.RizqStatusSummary && typeof RizqStatusSummary.render==='function'){
    RizqStatusSummary.render({ items: products, itemType: 'catalog' });
  }
  if(!IS_DEMO && window.RizqSellerOnboarding && typeof RizqSellerOnboarding.maybeShow==='function'){
    RizqSellerOnboarding.maybeShow({
      account: acc,
      accountType: 'store',
      isDemo: IS_DEMO,
      contentCount: products.length,
      onShare: function(){ if(typeof openShareModal==='function') openShareModal(); }
    });
  }
}

// ══ PANELS ══
const TITLES = {
  overview:'📊 نظرة عامة', requests:'📩 طلبات التواصل', messages:'💬 الرسائل',
  products:'📦 منتجاتي', profile:'🏪 معلومات المحل',
  hours:'🕐 ساعات العمل', photos:'📸 صور المحل',
  subscription:'💳 اشتراكي', settings:'⚙️ الإعدادات',
  mypayments:'🏦 طرق الدفع', agents:'🤖 الوكلاء الذكيون',
  tenders:'📋 المناقصات', referral:'🎁 إحالة الأصدقاء',
  verifiedplus:'🛡️ شارة موثّق⁺'
};
const TITLES_FR = {
  overview:'📊 Vue d\'ensemble', requests:'📩 Demandes de contact', messages:'💬 Messages',
  products:'📦 Mes produits', profile:'🏪 Infos boutique',
  hours:'🕐 Horaires', photos:'📸 Photos boutique',
  subscription:'💳 Mon abonnement', settings:'⚙️ Paramètres',
  mypayments:'🏦 Moyens de paiement', agents:'🤖 Agents IA',
  tenders:'📋 Appels d\'offres', referral:'🎁 Parrainage',
  verifiedplus:'🛡️ Badge Vérifié+'
};

function showPanel(id, el){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  const p = document.getElementById('panel-'+id);
  if(p) p.classList.add('active');
  document.querySelectorAll('.sb-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  const title = document.getElementById('topbar-title');
  if(title){
    var titleMap = (typeof _storeLang!=='undefined' && _storeLang==='fr') ? TITLES_FR : TITLES;
    title.textContent = titleMap[id]||'';
  }
  if(id==='overview') renderOverview();
  if(id==='products'){ renderStoreTopicsUI(); renderProducts(); }
  if(id==='messages') renderMessages();
  if(id==='requests'){ _rizqMergeServiceRequests(); loadStoreServiceDeskForm(); renderStoreServiceRequests(); }
  if(id==='photos') renderPhotos();
  if(id==='subscription'){ renderSubscriptionPanel(); renderPackagesDisplay(); renderVideoPackagesDisplay(); }
  if(id==='mypayments'){renderRizqPayment('rzq-pay-section');if(typeof renderMyPayments==='function')renderMyPayments();}
  if(id==='agents') renderAgents();
  if(id==='tenders'){ renderTenderSubStatus(); renderMyTenders(); }
  if(id==='referral'){ renderReferralPanel(); }
  if(id==='verifiedplus'){ renderVerifiedPlusPanel(); }
}

// ── برنامج الإحالة (جيب صاحبك واربح) ────────────────────────────────
function renderReferralPanel(){
  var linkInput = document.getElementById('referral-link-input');
  var statsEl = document.getElementById('referral-stats');
  if(!linkInput) return;
  linkInput.value = SESSION_ID ? (location.origin + '/rizq_landing_v8.html?ref=' + encodeURIComponent(SESSION_ID)) : '';
  if(!statsEl) return;
  if(!window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN){
    statsEl.innerHTML = '<p style="color:var(--text-muted);font-size:12px">'+_t2('الإحصائيات تظهر بعد ربط الحساب بخادم حقيقي','Les statistiques s\'affichent une fois le compte connecté à un serveur réel')+'</p>';
    return;
  }
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/mine/' + encodeURIComponent(SESSION_ID) + '/referrals', {
    headers: { 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) }
  }).then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
    if(!data || !data.ok) return;
    statsEl.innerHTML =
      '<div style="margin-bottom:6px">👥 <b>'+data.count+'</b> '+_t2('صديق انضم فعلاً كمشترك مدفوع','ami(s) devenu(s) abonné(s) payant(s)')+'</div>'+
      '<div>🎁 <b>'+data.bonusDaysTotal+'</b> '+_t2('يوماً مجانياً مكتسباً','jours gratuits gagnés')+'</div>';
  }).catch(function(){});
}

/* ── شارة "موثّق⁺" (Verified+) — مهمة #232: سعر الباقة من كتالوج الأدمين
   إن وُجد، وإلا سعر افتراضي يطابق PKG_DEFAULTS.verified_plus في rizq_admin.html.
   الحالة الحيّة (فعّالة/غير فعّالة) تُقرأ من acc.verifiedPlus مباشرة عبر
   GET /api/accounts/mine/:id — نفس الحقل المستخدَم في RizqSub.getBadges. ── */

function renderVerifiedPlusPanel(){
  var fr = (typeof _storeLang!=='undefined' && _storeLang==='fr');
  var el = document.getElementById('vplus-status');
  if(!el) return;
  if(!window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN){
    el.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">'+_t2('متاح فقط لحساب حقيقي مسجَّل دخوله','Disponible uniquement sur un compte réel connecté')+'</p>';
    return;
  }
  el.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">'+_t2('جارٍ التحقق من الحالة…','Vérification en cours…')+'</p>';
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/mine/' + encodeURIComponent(SESSION_ID), {
    headers: { 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) }
  }).then(function(res){ return res.ok ? res.json() : null; })
    .then(function(data){
      var acc = data && data.ok ? data.account : null;
      var active = !!(acc && acc.verifiedPlus && acc.verifiedPlusExpiresAt && new Date(acc.verifiedPlusExpiresAt) > new Date());
      if(active){
        var endsTxt = '';
        try{ endsTxt = new Date(acc.verifiedPlusExpiresAt).toLocaleDateString(fr?'fr-FR':'ar-MR-u-nu-latn'); }catch(e){}
        el.innerHTML = '<div style="background:#ecfdf5;border:1.5px solid #6ee7b7;border-radius:12px;padding:14px;font-size:12.5px;color:#065f46;display:flex;align-items:center;gap:10px">'
          + '<span style="font-size:24px">🛡️</span>'
          + '<span>✅ '+(fr?('Votre badge « Vérifié+ » est actif jusqu\'au '+escapeHtml(endsTxt)) : ('شارة "موثّق⁺" فعّالة لديك حتى '+escapeHtml(endsTxt)))+'</span>'
          + '</div>';
        return;
      }
      var FEATS_AR = {'سنوية':['شارة "موثّق⁺" الرسمية بشعار رزق','أعلى درجة ثقة لدى الزبائن','تحقق هوية مُعزَّز من فريق رزق','صالحة لسنة كاملة']};
      var FEATS_FR = {'سنوية':['Badge officiel « Vérifié+ » avec logo Rizq','Confiance maximale auprès des clients','Vérification d\'identité renforcée par Rizq','Valable un an complet']};
      var FEATS = fr ? FEATS_FR : FEATS_AR;
      var ICONS = {'سنوية':'🛡️'};
      var lockMsg = fr
        ? 'Obtenez le badge « Vérifié+ » — vérification d\'identité renforcée par l\'équipe Rizq.'
        : 'احصل على شارة "موثّق⁺" — تحقق هوية مُعزَّز من فريق رزق.';
      var cardsHtml = (typeof RizqSub !== 'undefined' && typeof RizqSub.renderPackageCardsHTML === 'function')
        ? RizqSub.renderPackageCardsHTML(_verifiedPlusPkgList(), FEATS, ICONS, (fr?'fr':'ar'), 'verified_plus').grid
        : '';
      el.innerHTML = '<div style="background:#f8faff;border:1.5px solid #e0e8ff;border-radius:12px;padding:14px;font-size:12.5px;color:#1B3A6B">🛡️ ' + lockMsg + '</div>'
        + '<div style="margin-top:14px">' + cardsHtml + '</div>';
    }).catch(function(){
      el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">'+_t2('تعذّر التحقق من الحالة','Impossible de vérifier le statut')+'</p>';
    });
}

/* ── سعر باقة المناقصة المعروض للتاجر — من كتالوج الأدمين إن وُجد، وإلا
   سعر افتراضي يطابق PKG_DEFAULTS.tender في rizq_admin.html. ── */

/* ── حالة اشتراك باقة المناقصة (لا فترة تجربة إطلاقاً — تصحيح Limam
   23/07/2026): تُعرض قبل قائمة "مناقصاتي" مباشرة. توسيع 24/07/2026: 3
   مستويات (شهرية/ربعية/سنوية) تُعرض كبطاقات عبر نفس مكوّن
   RizqSub.renderPackageCardsHTML المستخدَم لبقية الباقات، بدل زر سعر واحد
   ثابت — كل بطاقة تفتح نافذة الدفع (openPayModal/submitPayment) بفئة
   category:'tender' عند الحاجة للاشتراك. ── */
function renderTenderSubStatus(){
  var fr = (typeof _storeLang!=='undefined' && _storeLang==='fr');
  var el = document.getElementById('tender-sub-status');
  if(!el) return;
  if(IS_DEMO || !window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN){ el.innerHTML=''; return; }
  el.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">'+(fr?'Vérification de l\'abonnement…':'جارٍ التحقق من الاشتراك…')+'</p>';
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/tenders/package/status/' + encodeURIComponent(SESSION_ID), {
    headers: { 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) }
  }).then(function(res){ return res.ok ? res.json() : null; })
    .then(function(data){
      if(data && data.ok && data.subscribed){
        var endsTxt = '';
        try{ endsTxt = new Date((data.record && data.record.periodEnd) || '').toLocaleDateString(fr?'fr-FR':'ar-MR-u-nu-latn'); }catch(e){}
        if(data.isTrial && !data.contactsUnlocked){
          el.innerHTML = '<div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#92400e">'
            + '🔍 '+(fr?('Essai actif jusqu\'au '+escapeHtml(endsTxt)+' — consultation uniquement (contacts masqués, soumission verrouillée).') : ('باقتك التجريبية فعّالة حتى '+escapeHtml(endsTxt)+' — للتصفّح فقط (التواصل مخفي والعروض مقفولة).'))
            + '</div>';
          return;
        }
        el.innerHTML = '<div style="background:#ecfdf5;border:1.5px solid #6ee7b7;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#065f46">'
          + '✅ '+(fr?('Abonnement Appels d\'offres actif — contacts débloqués — jusqu\'au '+escapeHtml(endsTxt)) : ('اشتراك المناقصة فعّال — بيانات التواصل مكشوفة — حتى '+escapeHtml(endsTxt)))
          + '</div>';
        return;
      }
      var FEATS_AR = {'تجريبية':['تصفّح وتصفية المناقصات','بيانات التواصل مخفية','تقديم العروض مقفول'],'شهرية':['كشف بيانات التواصل','تقديم عروض غير محدود','نشر مناقصات'],'ربعية':['كل مزايا الشهرية','توفير 10%','أولوية ظهور العروض'],'سنوية':['كل مزايا الربعية','توفير 25%','تنبيهات SMS/واتساب']};
      var FEATS_FR = {'تجريبية':['Consultation et filtrage','Contacts masqués','Soumission verrouillée'],'شهرية':['Contacts débloqués','Offres illimitées','Publication d\'appels d\'offres'],'ربعية':['Tous les avantages mensuels','10% d\'économie','Priorité des offres'],'سنوية':['Tous les avantages trimestriels','25% d\'économie','Alertes SMS/WhatsApp']};
      var FEATS = fr ? FEATS_FR : FEATS_AR;
      var ICONS = {'تجريبية':'🔍','شهرية':'📋','ربعية':'📊','سنوية':'🏆'};
      var lockMsg = fr
        ? 'Abonnez-vous à la formule Appels d\'offres (mensuelle ou plus) pour débloquer les contacts et soumettre des offres. L\'essai permet la consultation uniquement.'
        : 'اشترك في باقة المناقصة (شهرية فأعلى) لكشف بيانات التواصل وتقديم العروض — الباقة التجريبية للتصفّح فقط.';
      var cardsHtml = (typeof RizqSub !== 'undefined' && typeof RizqSub.renderPackageCardsHTML === 'function')
        ? RizqSub.renderPackageCardsHTML(_tenderPkgList(), FEATS, ICONS, (typeof _storeLang!=='undefined'?_storeLang:'ar'), 'tender').grid
        : '';
      el.innerHTML = '<div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:12px;padding:14px;font-size:12.5px;color:#92400e">🔒 ' + lockMsg + '</div>'
        + '<div style="margin-top:14px">' + cardsHtml + '</div>';
    }).catch(function(){
      el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">'+(fr?'Impossible de vérifier l\'abonnement' : 'تعذّر التحقق من حالة الاشتراك')+'</p>';
    });
}

/* ══ غرفة المناقصات — مناقصاتي المنشورة + العروض المقدَّمة عليها ══ */
function renderMyTenders(){
  var fr = (typeof _storeLang!=='undefined' && _storeLang==='fr');
  var el = document.getElementById('tenders-mine-list');
  if(!el) return;
  if(IS_DEMO || !window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN){
    el.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">'+(fr?'Disponible uniquement sur un compte réel connecté.':'متاح فقط لحساب حقيقي مسجَّل دخوله.')+'</p>';
    return;
  }
  el.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">'+(fr?'Chargement…':'جاري التحميل…')+'</p>';
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/tenders/mine?accountId=' + encodeURIComponent(SESSION_ID), {
    headers: { 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) }
  }).then(function(res){ return res.ok ? res.json() : null; })
    .then(function(data){
      var list = (data && data.ok && Array.isArray(data.tenders)) ? data.tenders : [];
      if(!list.length){
        el.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">'+(fr?'Vous n\'avez publié aucun appel d\'offres pour le moment.':'لم تنشر أي مناقصة بعد.')+'</p>';
        return;
      }
      el.innerHTML = list.map(function(t){
        var bids = Array.isArray(t.bids) ? t.bids : [];
        var bidsHtml = bids.length
          ? bids.map(function(b){
              return '<div style="padding:8px 10px;background:#f7f9fc;border-radius:8px;margin-top:6px;font-size:12px">'
                + '<strong>'+escapeHtml(b.bidderName)+'</strong> — '+Number(b.price).toLocaleString()+' MRU'
                + (b.deliveryDays ? (' · '+(fr?b.deliveryDays+' j':b.deliveryDays+' يوم')) : '')
                + (b.notes ? ('<br><span style="color:var(--text-muted)">'+escapeHtml(b.notes)+'</span>') : '')
                + '</div>';
            }).join('')
          : '<p style="font-size:11.5px;color:#94a3b8;margin-top:4px">'+(fr?'Aucune offre pour le moment':'لا عروض بعد')+'</p>';
        return '<div class="card" style="margin-bottom:14px">'
          + '<div style="font-weight:800;font-size:14px;color:#16263d;display:flex;align-items:center;flex-wrap:wrap;gap:6px"><span>'+escapeHtml(t.title)+'</span>'+_tenderStatusBadgeOwner(t, fr)+'</div>'
          + (t.status==='rejected' && t.rejectReason ? '<div style="font-size:11.5px;color:#b91c1c;margin:6px 0">'+escapeHtml(t.rejectReason)+'</div>' : '')
          + '<div style="font-size:11.5px;color:var(--text-muted);margin:4px 0 8px">'+(fr?bids.length+' offre(s) reçue(s)':bids.length+' عرض مُقدَّم')+'</div>'
          + bidsHtml
          + '</div>';
      }).join('');
    }).catch(function(){
      el.innerHTML = '<p style="font-size:12.5px;color:var(--text-muted)">'+(fr?'Erreur de connexion au serveur':'خطأ في الاتصال بالخادم')+'</p>';
    });
}

// ══ OVERVIEW ══
function renderOverview(){
  const msgs = IS_DEMO ? DEMO_MESSAGES : JSON.parse(localStorage.getItem('store_messages_'+SESSION_ID)||'[]');
  const unread = msgs.filter(m=>!m.read).length;

  // Stats
  // إصلاح: بطاقة "زيارات هذا الأسبوع" كانت Math.random()*500+100 — رقم عشوائي
  // مختلف كل مرة يُفتح فيها الداشبورد، بلا أي علاقة بزيارة حقيقية واحدة، مع
  // نسبة نمو "+12%" ثابتة مزيَّفة دائماً. الآن تبدأ بـ"…" ثم renderRealVisits()
  // تملأها برقم حقيقي من الخادم (RizqSub.fetchVisitStats)، أو رسالة صادقة
  // "غير متاح بعد" إن لم يُرفع الخادم.
  document.getElementById('overview-stats').innerHTML = [
    {icon:'👁',val:'…',id:'ov-stat-visits',label:_t2('زيارات هذا الأسبوع','Visites cette semaine'),change:'',up:true,accent:'#1B3A6B'},
    {icon:'📦',val:products.length,label:_t2('منتجات معروضة','Produits affichés'),change:products.length>0?_t2('نشط','Actif'):_t2('أضف منتجاً','Ajouter un produit'),up:products.length>0,accent:'#C9A84C'},
    {icon:'💬',val:msgs.length,label:_t2('رسائل الزبائن','Messages clients'),change:unread>0?unread+_t2(' غير مقروء',' non lu(s)'):_t2('لا جديد','Rien de nouveau'),up:unread>0,accent:'#10b981'},
    {icon:'⭐',val:'…',id:'ov-stat-rating',label:_t2('تقييم المحل','Note de la boutique'),change:_t2('جارٍ التحميل...','Chargement...'),id2:'ov-stat-rating-change',up:true,accent:'#f59e0b'},
  ].map(s=>`
    <div class="stat-card" style="--accent:${s.accent}">
      <div class="stat-icon" style="font-size:22px">${s.icon}</div>
      <div class="stat-val"${s.id?` id="${s.id}"`:''}>${s.val}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-change ${s.up?'up':''}"${s.id2?` id="${s.id2}"`:(s.id?` id="${s.id}-change"`:'')}>${s.change}</div>
    </div>`).join('');
  var nc=document.getElementById('notif-count');
  if(nc){if(unread>0){nc.textContent=unread;nc.style.display='flex';}else nc.style.display='none';}
  // إصلاح جوهري 29/07/2026: كان تقييم "4.8" ثابتاً مزيَّفاً دائماً بلا أي
  // علاقة بتقييمات حقيقية. الآن يُجلب من /api/reviews (نفس targetId
  // المستخدَم أصلاً في نظام المراسلة rizq_messenger.js — SESSION_ID).
  function _paintStoreRating(avg, count){
    var vEl = document.getElementById('ov-stat-rating'); var cEl = document.getElementById('ov-stat-rating-change');
    var hNum = document.getElementById('hero-rating-num'); var hCnt = document.getElementById('hero-rating-count');
    var hStars = document.getElementById('hero-rating-stars');
    if(!count){
      if(vEl) vEl.textContent='—';
      if(cEl) cEl.textContent=_t2('لا تقييمات بعد','Aucun avis pour le moment');
      if(hNum) hNum.textContent='—';
      if(hCnt) hCnt.textContent=_t2('لا تقييمات بعد','Aucun avis');
      if(hStars) hStars.textContent='☆☆☆☆☆';
      return;
    }
    if(vEl) vEl.textContent=avg;
    if(cEl) cEl.textContent=count+_t2(' تقييم(ات)',' avis');
    if(hNum) hNum.textContent=avg;
    if(hCnt) hCnt.textContent=count+_t2(' تقييم',' avis');
    if(hStars){
      var full=Math.round(Number(avg)||0); if(full<0)full=0; if(full>5)full=5;
      hStars.textContent='★★★★★'.slice(0,full)+'☆☆☆☆☆'.slice(0,5-full);
    }
  }
  if(IS_DEMO){ _paintStoreRating(null, 0); }
  else if(typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE && SESSION_ID){
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '')+'/api/reviews/'+encodeURIComponent(SESSION_ID)+'/stats')
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if(!data || !data.count){ _paintStoreRating(null, 0); return; }
        _paintStoreRating(data.average, data.count);
      }).catch(function(){ _paintStoreRating(null, 0); });
  } else {
    _paintStoreRating(null, 0);
  }
  renderRealVisits();
  renderAdvancedStats();

  // Recent messages
  const recentMsgs = msgs.slice(-3).reverse();
  document.getElementById('recent-messages').innerHTML = recentMsgs.length
    ? recentMsgs.map(m=>`
      <div class="msg-item">
        <div class="msg-avatar">${m.name?m.name[0].toUpperCase():_t2('ز','C')}</div>
        <div class="msg-body">
          <div class="msg-name">${escapeHtml(m.name||_t2('زبون','Client'))}</div>
          <div class="msg-text">${escapeHtml(m.text||'')}</div>
          <div class="msg-time">${m.time||''}</div>
        </div>
        ${!m.read?'<div class="msg-unread"></div>':''}
      </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:13px;padding:12px 0">'+_t2('لا توجد رسائل بعد','Aucun message pour le moment')+'</p>';

  // Sub overview
  renderSubOverview();

  // Checklist
  renderChecklist();
}

// إصلاح: يجلب رقم الزيارات الحقيقي (RizqSub.fetchVisitStats → rizq_visit_tracker.js
// على الخادم) بدل Math.random() السابق. last7/prev7 محسوبة من last30 الحقيقية
// لعرض نسبة تغيّر حقيقية بدل "+12%" الثابتة، أو إخفاء الشارة إن لا بيانات كافية.
function renderRealVisits(){
  var elV=document.getElementById('ov-stat-visits'), elC=document.getElementById('ov-stat-visits-change');
  if(!elV) return;
  var accId=(typeof STORE!=='undefined'&&STORE&&STORE.id)||'';
  if(typeof RizqSub==='undefined' || !accId){ elV.textContent=_t2('غير متاح','N/D'); if(elC) elC.textContent=''; return; }
  RizqSub.fetchVisitStats(accId).then(function(stats){
    if(!stats){ elV.textContent=_t2('غير متاح بعد','Pas encore dispo'); if(elC) elC.textContent=''; return; }
    var days=stats.last30||[];
    var last7=days.slice(-7).reduce(function(s,d){return s+d.count;},0);
    var prev7=days.slice(-14,-7).reduce(function(s,d){return s+d.count;},0);
    elV.textContent=last7.toLocaleString();
    if(elC){
      if(prev7>0){
        var pct=Math.round(((last7-prev7)/prev7)*100);
        elC.textContent=(pct>=0?'+':'')+pct+'%';
        elC.className='stat-change '+(pct>=0?'up':'');
      } else { elC.textContent=''; }
    }
  });
}

// ── إحصائيات متقدّمة (منحنى 30 يوماً + مصادر الزيارات) — ميزة حصرية للباقات
// المدفوعة، تُقفَل تلقائياً بعنصر #advanced-stats عبر _applyFeatureGates
// الموجودة أصلاً في هذا الملف (كانت مُعرَّفة بلا أي عنصر DOM فعلي تحكمه) ──
function renderAdvancedStats(){
  var accId=(typeof STORE!=='undefined'&&STORE&&STORE.id)||'';
  var chartEl=document.getElementById('adv-stats-chart');
  var srcEl=document.getElementById('adv-stats-sources');
  var totalEl=document.getElementById('adv-stat-total'), monthEl=document.getElementById('adv-stat-month');
  if(!chartEl) return;
  if(typeof RizqSub==='undefined' || !accId){
    chartEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">'+_t2('الإحصائيات تحتاج ربط الحساب بخادم حقيقي','Les statistiques nécessitent un compte connecté à un serveur réel')+'</div>';
    return;
  }
  RizqSub.fetchVisitStats(accId).then(function(stats){
    if(!stats){
      chartEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">'+_t2('لا تتوفر بيانات كافية بعد','Pas assez de données pour le moment')+'</div>';
      if(srcEl) srcEl.innerHTML='';
      return;
    }
    if(totalEl) totalEl.textContent=stats.total.toLocaleString();
    if(monthEl) monthEl.textContent=stats.monthTotal.toLocaleString();

    var days=stats.last30||[];
    var max=Math.max(1, Math.max.apply(null, days.map(function(d){return d.count;})));
    chartEl.innerHTML='<div style="display:flex;align-items:flex-end;gap:2px;height:100%">'+days.map(function(d){
      var h=Math.round((d.count/max)*100);
      return '<div title="'+d.date+': '+d.count+'" style="flex:1;height:'+Math.max(h,2)+'%;background:linear-gradient(180deg,#C9A84C,#e8c96a);border-radius:2px 2px 0 0;min-width:2px"></div>';
    }).join('')+'</div>';

    var srcLabels={direct:_t2('مباشر','Direct'),whatsapp:'WhatsApp',facebook:'Facebook/Instagram',google:'Google',other:_t2('أخرى','Autres')};
    var src=stats.bySource||{}; var srcTotal=Object.keys(src).reduce(function(s,k){return s+(src[k]||0);},0);
    if(srcEl){
      if(!srcTotal){ srcEl.innerHTML='<div style="text-align:center;padding:10px;color:var(--text-muted);font-size:12px">'+_t2('لا بيانات مصادر بعد','Pas encore de données de source')+'</div>'; }
      else {
        srcEl.innerHTML=Object.keys(srcLabels).map(function(k){
          var v=src[k]||0, pct=srcTotal?Math.round((v/srcTotal)*100):0;
          return '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><span>'+srcLabels[k]+'</span><span style="font-weight:700">'+pct+'%</span></div><div style="height:5px;background:rgba(27,58,107,.08);border-radius:3px"><div style="height:100%;width:'+pct+'%;background:#1B3A6B;border-radius:3px"></div></div></div>';
        }).join('');
      }
    }
  });
}

function renderSubOverview(){
  const el = document.getElementById('overview-sub');
  if(!el||!STORE) return;
  const info = getSubInfo();
  const daysLeft = info.daysLeft;
  const isTrial = info.isTrial;
  const pct = info.pct;
  const color = daysLeft<=1?'#ef4444':daysLeft<=3?'#f59e0b':'#10b981';
  const planLabel = isTrial ? _t2('🎁 فترة تجريبية مجانية','🎁 Période d\'essai gratuite')
    : (info.isExpired ? _t2('❌ انتهى الاشتراك','❌ Abonnement expiré')
    : ('📦 '+escapeHtml(info.pkgName || STORE.plan || _t2('باقة نشطة','Forfait actif'))));
  el.innerHTML = `
    <div style="background:linear-gradient(135deg,var(--royal),var(--royal-light));border-radius:14px;padding:18px;color:#fff">
      <div style="font-size:14px;font-weight:700;margin-bottom:4px">${planLabel}</div>
      <div style="font-size:12px;opacity:.7;margin-bottom:12px">${daysLeft>0?_t2(`ينتهي خلال ${daysLeft} يوم${daysLeft===1?'':'أيام'}`,`Se termine dans ${daysLeft} jour${daysLeft===1?'':'s'}`):_t2('انتهى الاشتراك','Abonnement expiré')}</div>
      <div style="height:5px;background:rgba(255,255,255,.2);border-radius:3px;margin-bottom:6px">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width .8s"></div>
      </div>
      ${daysLeft<=2?`<div style="margin-top:10px"><button class="btn btn-gold btn-sm" onclick="showPanel('subscription',null)">${_t2('🔄 جدّد الآن','🔄 Renouveler maintenant')}</button></div>`:''}
    </div>`;
}

function renderChecklist(){
  const items = [
    {done:!!(STORE.name),label:_t2('إضافة اسم المحل','Ajouter le nom de la boutique'),action:"showPanel('profile',null)"},
    {done:!!(STORE.phone),label:_t2('إضافة رقم الواتساب','Ajouter le numéro WhatsApp'),action:"showPanel('profile',null)"},
    {done:products.length>0,label:_t2('إضافة أول منتج','Ajouter votre premier produit'),action:"showPanel('products',null)"},
    {done:storePhotos.length>0,label:_t2('رفع صور المحل','Téléverser des photos de la boutique'),action:"showPanel('photos',null)"},
    {done:!!(STORE.desc),label:_t2('كتابة وصف المحل','Rédiger la description de la boutique'),action:"showPanel('profile',null)"},
  ];
  const done = items.filter(i=>i.done).length;
  const pct = Math.round((done/items.length)*100);
  const el = document.getElementById('checklist-items');
  if(done===items.length){ document.getElementById('onboarding-checklist').style.display='none'; return; }
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="flex:1;height:7px;background:rgba(27,58,107,.08);border-radius:4px">
        <div style="height:100%;width:${pct}%;background:var(--gold);border-radius:4px;transition:width .8s"></div>
      </div>
      <span style="font-size:13px;font-weight:700;color:var(--navy)">${done}/${items.length}</span>
    </div>` +
    items.map(i=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(27,58,107,.05);cursor:${i.done?'default':'pointer'}" onclick="${i.done?'':i.action}">
      <div style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;${i.done?'background:#10b981;color:#fff':'background:rgba(27,58,107,.08);color:var(--text-muted)'}">
        ${i.done?'✓':'○'}
      </div>
      <span style="font-size:13.5px;color:${i.done?'var(--text-muted)':'var(--navy)'};${i.done?'text-decoration:line-through':''}">${i.label}</span>
      ${!i.done?'<span style="margin-right:auto;font-size:11px;color:var(--royal)">'+_t2('← ابدأ','← Commencer')+'</span>':''}
    </div>`).join('');
}

// ══ PRODUCTS ══
function _storeInventoryPreset(){
  try{
    var act = (typeof STORE!=='undefined' && STORE && STORE.activityId) ? STORE.activityId : '';
    if(typeof RizqMerchantActivities!=='undefined' && RizqMerchantActivities.inventoryPresetForActivity){
      return RizqMerchantActivities.inventoryPresetForActivity(act);
    }
  }catch(e){}
  return null;
}
function applyStoreInventoryPresets(){
  var preset = _storeInventoryPreset();
  if(!preset) return;
  var fr = (typeof _storeDashLang==='function' ? _storeDashLang() : 'ar') === 'fr';
  var variants = document.getElementById('prod-variants');
  var unit = document.getElementById('prod-unit');
  var sku = document.getElementById('prod-sku');
  if(variants){
    variants.placeholder = fr ? preset.variantsPhFr : preset.variantsPhAr;
    variants.setAttribute('data-ph-fr', preset.variantsPhFr);
  }
  if(unit && !unit.value){
    unit.placeholder = fr ? preset.unitDefaultFr : preset.unitDefault;
    unit.setAttribute('data-ph-fr', preset.unitDefaultFr);
  }
  if(sku){
    sku.placeholder = fr ? preset.skuHintFr : preset.skuHintAr;
    sku.setAttribute('data-ph-fr', preset.skuHintFr);
  }
}

function fillProdApparelSizes(){
  var el = document.getElementById('prod-variants');
  if(!el) return;
  el.value = 'XS, S, M, L, XL, XXL, 3XL, 4XL';
  if(typeof rebuildProdSizeStockUI === 'function') rebuildProdSizeStockUI({});
  if(typeof showToast === 'function') showToast(_t2('✅ تم تعبئة المقاسات حتى 4XL','✅ Tailles jusqu\'à 4XL'));
}
function fillProdShoeSizes(){
  var el = document.getElementById('prod-variants');
  if(!el) return;
  el.value = '36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50';
  if(typeof rebuildProdSizeStockUI === 'function') rebuildProdSizeStockUI({});
  if(typeof showToast === 'function') showToast(_t2('✅ تم تعبئة مقاسات الأحذية حتى 50 (يشمل 45 و46 و47)','✅ Pointures jusqu\'à 50 (incl. 45, 46, 47)'));
}

/* مخزون لكل قياس — يُبنى من حقل المقاسات */
function _parseVariantTokens(raw){
  var s = String(raw == null ? '' : raw).trim();
  if(!s) return [];
  /* "مقاس: S, M · لون: أبيض" → خذ جزء المقاس إن وُجد، وإلا كل الرموز */
  if(/[:：]/.test(s) && /مقاس|size|taille|وزن|weight|حجم|volume/i.test(s)){
    var chunk = s.split(/[·•|]+/).find(function(c){ return /مقاس|size|taille|وزن|weight|حجم|volume/i.test(c); }) || s;
    var parts = chunk.split(/[:：]/);
    s = parts.length > 1 ? parts.slice(1).join(':') : chunk;
  }
  return s.split(/[,،|/·•]+/).map(function(x){ return x.trim(); }).filter(Boolean)
    .filter(function(x){ return !/^(مقاس|size|taille|لون|color|وزن|weight)$/i.test(x); });
}
function _readProdSizeStockDraft(){
  return window.__rzqProdSizeStock && typeof window.__rzqProdSizeStock === 'object'
    ? window.__rzqProdSizeStock : {};
}
function rebuildProdSizeStockUI(prefMap){
  var wrap = document.getElementById('prod-size-stock-wrap');
  var host = document.getElementById('prod-size-stock');
  var sumEl = document.getElementById('prod-size-stock-sum');
  var variantsEl = document.getElementById('prod-variants');
  if(!wrap || !host) return;
  var tokens = _parseVariantTokens(variantsEl && variantsEl.value);
  if(prefMap && typeof prefMap === 'object'){
    window.__rzqProdSizeStock = Object.assign({}, _readProdSizeStockDraft(), prefMap);
  }
  /* احتفظ بالقيم الحالية في الحقول قبل إعادة البناء */
  host.querySelectorAll('[data-size-key]').forEach(function(inp){
    var k = inp.getAttribute('data-size-key');
    var n = parseInt(inp.value, 10);
    if(!window.__rzqProdSizeStock) window.__rzqProdSizeStock = {};
    window.__rzqProdSizeStock[k] = isNaN(n) ? 0 : Math.max(0, n);
  });
  if(!tokens.length){
    wrap.style.display = 'none';
    host.innerHTML = '';
    if(sumEl) sumEl.textContent = '';
    return;
  }
  wrap.style.display = '';
  var draft = _readProdSizeStockDraft();
  var fr = (typeof _storeDashLang==='function' ? _storeDashLang() : 'ar') === 'fr';
  host.innerHTML = tokens.map(function(tok){
    var val = Object.prototype.hasOwnProperty.call(draft, tok) ? draft[tok] : '';
    return '<label style="display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid rgba(27,58,107,.14);border-radius:10px;background:#fff;min-width:110px">'
      + '<span style="font-weight:800;color:#1B3A6B;min-width:36px;text-align:center">' + String(tok).replace(/</g,'&lt;') + '</span>'
      + '<input type="number" min="0" step="1" data-size-key="' + String(tok).replace(/"/g,'&quot;') + '" value="' + (val === '' ? '' : val) + '"'
      + ' placeholder="0" oninput="onProdSizeStockInput()" style="width:64px;padding:6px 8px;border:1px solid rgba(27,58,107,.2);border-radius:8px;font:inherit;font-weight:700;text-align:center"/>'
      + '<span style="font-size:11px;color:#64748b">' + (fr ? 'pcs' : 'قطعة') + '</span></label>';
  }).join('');
  onProdSizeStockInput();
}
function onProdSizeStockInput(){
  var host = document.getElementById('prod-size-stock');
  var sumEl = document.getElementById('prod-size-stock-sum');
  var stockEl = document.getElementById('prod-stock');
  if(!host) return;
  var draft = {};
  var total = 0;
  var hasAny = false;
  host.querySelectorAll('[data-size-key]').forEach(function(inp){
    var k = inp.getAttribute('data-size-key');
    var n = parseInt(inp.value, 10);
    if(isNaN(n) || n < 0) n = 0;
    draft[k] = n;
    total += n;
    if(String(inp.value).trim() !== '') hasAny = true;
  });
  window.__rzqProdSizeStock = draft;
  if(sumEl){
    var fr = (typeof _storeDashLang==='function' ? _storeDashLang() : 'ar') === 'fr';
    sumEl.textContent = hasAny
      ? (fr ? ('Total stock = ' + total) : ('مجموع الاستوك = ' + total))
      : '';
  }
  if(stockEl && hasAny) stockEl.value = String(total);
}
function collectProdSizeStock(){
  onProdSizeStockInput();
  var draft = _readProdSizeStockDraft();
  var tokens = _parseVariantTokens((document.getElementById('prod-variants')||{}).value);
  if(!tokens.length) return null;
  var map = {};
  var filled = false;
  tokens.forEach(function(tok){
    var n = Object.prototype.hasOwnProperty.call(draft, tok) ? parseInt(draft[tok], 10) : 0;
    if(isNaN(n) || n < 0) n = 0;
    map[tok] = n;
    if(n > 0) filled = true;
  });
  /* إن لم يُدخل البائع أي كمية — لا نفرض sizeStock */
  var anyTyped = tokens.some(function(tok){
    return Object.prototype.hasOwnProperty.call(draft, tok) && String(draft[tok]).trim() !== '';
  });
  if(!anyTyped && !filled) return null;
  return map;
}
function updateInventorySummary(){
  var wrap = document.getElementById('inventory-summary');
  if(!wrap) return;
  if(!products.length){ wrap.style.display='none'; return; }
  var LOW = 5;
  var low=0, out=0, units=0;
  products.forEach(function(p){
    var n = parseInt(p.stock, 10);
    if(p.status==='out' || (!isNaN(n) && n<=0)) out++;
    else if(!isNaN(n) && n>0 && n<=LOW) low++;
    if(!isNaN(n) && n>0) units += n;
  });
  var elT = document.getElementById('inv-sum-total');
  var elL = document.getElementById('inv-sum-low');
  var elO = document.getElementById('inv-sum-out');
  var elU = document.getElementById('inv-sum-units');
  if(elT) elT.textContent = _t2('📦 '+products.length+' صنف','📦 '+products.length+' article(s)');
  if(elL) elL.textContent = low ? _t2('⚠️ '+low+' كمية منخفضة','⚠️ '+low+' stock bas') : '';
  if(elO) elO.textContent = out ? _t2('❌ '+out+' نفذ','❌ '+out+' rupture') : '';
  if(elU) elU.textContent = units ? _t2('إجمالي الوحدات: '+units,'Unités totales : '+units) : '';
  wrap.style.display = 'block';
}
function renderProducts(){
  const cnt = document.getElementById('products-count');
  if(cnt) cnt.textContent = products.length + _t2(' منتج',' produit(s)');
  updateInventorySummary();
  const grid = document.getElementById('products-grid');
  if(!products.length){
    grid.innerHTML='<div style="text-align:center;padding:48px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">📦</div><p style="font-size:15px;font-weight:600">'+_t2('لا توجد منتجات بعد','Aucun produit pour le moment')+'</p><p style="font-size:13px;margin-top:6px">'+_t2('أضف أول منتج الآن','Ajoutez votre premier produit maintenant')+'</p></div>';
    return;
  }
  const STATUS = {available:_t2('✅ متوفر','✅ Disponible'),limited:_t2('⚠️ كمية محدودة','⚠️ Quantité limitée'),out:_t2('❌ نفذ','❌ Épuisé')};
  const STATUS_COLOR = {available:'#10b981',limited:'#f59e0b',out:'#ef4444'};
  const LOW_STOCK_THRESHOLD = 5;
  grid.innerHTML = products.map((p,i)=>{
    const stockNum = parseInt(p.stock);
    const hasStock = !isNaN(stockNum);
    let badgeHtml;
    if(p.status==='out' || (hasStock && stockNum<=0)){
      badgeHtml = `<div class="product-stock" style="color:#ef4444;font-weight:700">${_t2('❌ نفذت الكمية','❌ Stock épuisé')}</div>`;
    } else if(hasStock && stockNum>0 && stockNum<=LOW_STOCK_THRESHOLD){
      badgeHtml = `<div class="product-stock" style="color:#fff;background:#dc2626;display:inline-block;padding:2px 9px;border-radius:7px;font-weight:700;font-size:11.5px;animation:pulse 1.6s infinite">${_t2(`⚡ متبقي ${stockNum} فقط!`,`⚡ Plus que ${stockNum} en stock !`)}</div>`;
    } else if(p.status==='limited'){
      badgeHtml = `<div class="product-stock" style="color:${STATUS_COLOR.limited}">${STATUS.limited}</div>`;
    } else {
      badgeHtml = `<div class="product-stock" style="color:${STATUS_COLOR.available}">${STATUS.available}${hasStock?` · 📦 ${stockNum}`:''}${p.unit?` ${escapeHtml(p.unit)}`:''}</div>`;
    }
    const soldHtml = (p.sold && Number(p.sold)>0) ? `<div style="font-size:11px;color:#92400e;font-weight:600;margin-top:3px">${_t2(`🔥 تم بيع ${Number(p.sold).toLocaleString()}+ قطعة`,`🔥 ${Number(p.sold).toLocaleString()}+ unités vendues`)}</div>` : '';
    var sizeStockLine = '';
    if(p.sizeStock && typeof p.sizeStock === 'object'){
      sizeStockLine = Object.keys(p.sizeStock).map(function(k){
        var q = p.sizeStock[k];
        var mark = (parseInt(q,10)||0) <= 0 ? ' <span style="text-decoration:line-through;opacity:.55">'+escapeHtml(k)+'</span>' : (escapeHtml(k)+':'+q);
        return mark;
      }).join(' · ');
    }
    const variantsHtml = (p.variants || sizeStockLine)
      ? `<div style="font-size:11px;color:#2C3A4F;margin-top:3px">📏 ${escapeHtml(p.variants||'')}${sizeStockLine ? (p.variants ? ' — ' : '') + sizeStockLine : ''}</div>`
      : '';
    const skuHtml = p.sku ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">SKU: ${escapeHtml(p.sku)}</div>` : '';
    return `
    <div class="product-card">
      <div class="product-img">${p.imgData?`<img src="${p.imgData}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"/>`:p.emoji||'📦'}</div>
      <div class="product-body">
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-price">${Number(p.price||0).toLocaleString()} MRU</div>
        ${badgeHtml}
        ${skuHtml}
        ${soldHtml}
        ${variantsHtml}
      </div>
      <div class="product-actions">
        <button class="btn btn-outline btn-sm" onclick="editProduct(${i})" style="flex:1">${_t2('✏️ تعديل','✏️ Modifier')}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${i})">🗑️</button>
      </div>
    </div>`;
  }).join('');
  if(window.RizqStatusSummary && typeof RizqStatusSummary.render==='function'){
    RizqStatusSummary.render({ items: products, itemType: 'catalog' });
  }
}

let _formOpen = true;
function toggleAddForm(){
  const body = document.getElementById('add-product-body');
  const btn = document.getElementById('toggle-form-btn');
  _formOpen = !_formOpen;
  body.style.display = _formOpen ? 'block' : 'none';
  btn.textContent = _formOpen ? _t2('تصغير ↑','Réduire ↑') : _t2('إضافة منتج ↓','Ajouter un produit ↓');
}
function openAddProduct(){
  if(window._rizqDashReadOnly){
    alert(_t2('انتهت الفترة المجانية. يرجى الاشتراك في إحدى الباقات لتتمكن من إضافة إعلانات جديدة وتفعيل زر الاتصال للزبائن','La période d’essai est terminée. Veuillez souscrire à une offre pour publier de nouvelles annonces et activer le bouton d’appel pour vos clients.'));
    if(typeof _openRenewalPanel==='function') _openRenewalPanel();
    return;
  }
  var sb = document.querySelector('.sb-item[onclick*="products"]');
  showPanel('products', sb);
  _formOpen = true;
  var body = document.getElementById('add-product-body');
  if(body) body.style.display = 'block';
  var btn = document.getElementById('toggle-form-btn');
  if(btn) btn.textContent = _t2('تصغير ↑','Réduire ↑');
  var anchor = document.getElementById('panel-products');
  if(anchor) anchor.scrollIntoView({ behavior:'smooth', block:'start' });
}

function clearProductForm(){
  ['prod-name','prod-price','prod-desc','prod-stock','prod-variants','prod-sold','prod-sku','prod-unit'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  try{
    if(window.RizqBrands){
      RizqBrands.fillBrandSelect(document.getElementById('prod-brand'), '', false, '');
      RizqBrands.fillModelSelect(document.getElementById('prod-model'), '', false, '');
    }
  }catch(eBrandClr){}
  fillProductTopicSelect('');
  document.getElementById('prod-status').value='available';
  const zone = document.getElementById('prod-upload-zone');
  zone.style.display='';
  zone.classList.remove('has-file');
  window._prodImages = [];
  renderProdImagesGrid();
  window._prodImgData = null;
  window._editingIdx = null;
  window.__rzqProdSizeStock = {};
  if(typeof rebuildProdSizeStockUI==='function') rebuildProdSizeStockUI({});
  if(typeof applyStoreInventoryPresets==='function') applyStoreInventoryPresets();
}

// معرض صور المنتج (حتى 6 صور) — يحل محل الصورة الواحدة السابقة لدعم
// "تصفّح المنتج من كل الزوايا" في نافذة العرض السريع بصفحة المتجر.
function renderProdImagesGrid(){
  const grid = document.getElementById('prod-images-grid');
  if(!grid) return;
  const imgs = window._prodImages || [];
  grid.innerHTML = imgs.map((src,i)=>`
    <div style="position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1;box-shadow:0 2px 8px rgba(0,0,0,.1)">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover"/>
      <button type="button" onclick="deleteProdImage(${i})" style="position:absolute;top:4px;left:4px;background:rgba(239,68,68,.9);color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">×</button>
      ${i===0?'<span style="position:absolute;bottom:4px;right:4px;background:rgba(201,168,76,.92);color:#0D1B2A;font-size:9px;font-weight:800;padding:2px 6px;border-radius:6px">'+_t2('الأساسية','Principale')+'</span>':''}
    </div>`).join('');
  const zone = document.getElementById('prod-upload-zone');
  if(zone) zone.style.display = imgs.length >= 6 ? 'none' : '';
}
function deleteProdImage(i){
  (window._prodImages||[]).splice(i,1);
  renderProdImagesGrid();
}
function previewProductImg(input){
  const files = Array.from(input.files||[]); if(!files.length) return;
  window._prodImages = window._prodImages || [];
  const room = Math.max(0, 6 - window._prodImages.length);
  if(!room){ showToast(_t2('وصلت للحد الأقصى: 6 صور لكل منتج','Limite atteinte : 6 photos par produit'),'error'); return; }
  const toLoad = files.slice(0, room);
  let loaded = 0;
  toLoad.forEach(file=>{
    const reader = new FileReader();
    reader.onload = e=>{
      window._prodImages.push(e.target.result);
      loaded++;
      if(loaded===toLoad.length) renderProdImagesGrid();
    };
    reader.readAsDataURL(file);
  });
  input.value = ''; // يسمح باختيار نفس الملف مجدداً لاحقاً إن حُذف
}

// ══════════════════════════════════════════════════════════════════
// مزامنة حقيقية مع rizq-backend (/api/catalog) — إصلاح جوهري 29/07/2026
// كانت منتجات المتجر localStorage فقط بمتصفح صاحب المحل — لا تظهر أبداً
// لأي زائر من جهاز آخر. المزامنة هنا فشلها صامت تماماً (fire-and-forget)
// إن لم يُنشَر الخادم بعد أو انقطعت الشبكة — لا تُغيّر أي سلوك سابق.
// ══════════════════════════════════════════════════════════════════
function _rizqSyncCatalogItem(prod){
  try{
    if(typeof window.RIZQ_BACKEND_BASE !== 'string' || !window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN) return;
    var base = window.RIZQ_BACKEND_BASE.replace(/\/$/, '');
    var body = {
      accountId: SESSION_ID, kind:'product', name: prod.name, price: prod.price, cat: prod.cat,
      topicId: prod.topicId || '',
      brandId: prod.brandId || '', brandName: prod.brandName || '', brandNameFr: prod.brandNameFr || '',
      modelId: prod.modelId || '', modelName: prod.modelName || '', modelNameFr: prod.modelNameFr || '',
      desc: prod.desc, stock: prod.stock, variants: prod.variants, sizeStock: prod.sizeStock || null,
      sku: prod.sku||'', unit: prod.unit||'', sold: prod.sold,
      status: prod.status==='pending_review' ? 'pending_review' : (prod.status==='inactive'?'inactive':'active'),
      images: (prod.imgDataArr && prod.imgDataArr.length) ? prod.imgDataArr : (prod.imgData ? [prod.imgData] : [])
    };
    if(prod._backendId){
      fetch(base+'/api/catalog/'+encodeURIComponent(prod._backendId), {
        method:'PATCH', headers:{'Content-Type':'application/json','x-account-token':(window.REAL_ACCESS_TOKEN || SESSION_TOKEN)}, body: JSON.stringify(body)
      }).catch(function(){});
    } else {
      fetch(base+'/api/catalog', {
        method:'POST', headers:{'Content-Type':'application/json','x-account-token':(window.REAL_ACCESS_TOKEN || SESSION_TOKEN)}, body: JSON.stringify(body)
      }).then(function(r){ return r.ok ? r.json() : null; })
        .then(function(data){
          if(data && data.item && data.item.id){
            prod._backendId = data.item.id;
            localStorage.setItem('store_products_'+SESSION_ID, JSON.stringify(products));
          }
        }).catch(function(){});
    }
  }catch(e){}
}
function _rizqDeleteCatalogItem(prod){
  try{
    if(!prod || !prod._backendId || typeof window.RIZQ_BACKEND_BASE !== 'string' || !window.RIZQ_BACKEND_BASE || !SESSION_TOKEN) return;
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '')+'/api/catalog/'+encodeURIComponent(prod._backendId), {
      method:'DELETE', headers:{'x-account-token':(window.REAL_ACCESS_TOKEN || SESSION_TOKEN)}
    }).catch(function(){});
  }catch(e){}
}
// جلب منتجات هذا الحساب من كل الأجهزة عند التحميل، ودمج أي منتج غير
// موجود محلياً (بمطابقة _backendId لتفادي التكرار).
function _rizqMergeCatalogFromBackend(){
  try{
    if(typeof window.RIZQ_BACKEND_BASE !== 'string' || !window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN) return;
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '')+'/api/catalog/mine?accountId='+encodeURIComponent(SESSION_ID)+'&kind=product', {
      headers:{'x-account-token':(window.REAL_ACCESS_TOKEN || SESSION_TOKEN)}
    }).then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if(!data || !Array.isArray(data.items) || !data.items.length) return;
        var existingBackendIds = {};
        products.forEach(function(p){ if(p._backendId) existingBackendIds[p._backendId]=true; });
        var toAdd = data.items.filter(function(it){ return !existingBackendIds[it.id]; }).map(function(it){
          return { id:'LP-'+it.id, _backendId: it.id, name: it.name, price: it.price, cat: it.cat, topicId: it.topicId||'', desc: it.desc,
            stock: it.stock, variants: it.variants, sizeStock: it.sizeStock || null, sku: it.sku||'', unit: it.unit||'', sold: it.sold||0, status: it.status, imgData: it.image||null,
            imgDataArr: Array.isArray(it.images) && it.images.length ? it.images : (it.image?[it.image]:[]),
            emoji: it.emoji||'📦', addedAt: it.createdAt };
        });
        if(!toAdd.length) return;
        products = products.concat(toAdd);
        localStorage.setItem('store_products_'+SESSION_ID, JSON.stringify(products));
        if(typeof renderProductsList === 'function') renderProductsList();
      }).catch(function(){});
  }catch(e){}
}

/* ══ موضوعات المحل (فلاتر ديناميكية) ══ */
function _storeTopicsList(){
  if(!STORE) STORE = {};
  if(!Array.isArray(STORE.storeTopics)) STORE.storeTopics = [];
  if(window.RizqStoreTopics) STORE.storeTopics = RizqStoreTopics.normalizeList(STORE.storeTopics);
  return STORE.storeTopics;
}
function _ensureStoreTopicsSeeded(){
  var list = _storeTopicsList();
  if(list.length) return list;
  if(window.RizqStoreTopics && products && products.length){
    STORE.storeTopics = RizqStoreTopics.seedFromProducts(products);
  }
  return _storeTopicsList();
}
function renderStoreTopicsUI(){
  var box = document.getElementById('store-topics-list');
  if(!box) return;
  var fr = _storeDashLang() === 'fr';
  var list = _ensureStoreTopicsSeeded();
  if(!list.length){
    box.innerHTML = '<div style="padding:14px;border:1px dashed #d5deea;border-radius:10px;color:var(--text-muted);font-size:13px;text-align:center">'
      + (fr ? 'Aucun thème — ajoutez vos catégories ci-dessous.' : 'لا موضوعات بعد — أضف تصنيفات محلك بالأسفل.')
      + '</div>';
  } else {
    box.innerHTML = list.map(function(t, i){
      return '<div class="hours-row" style="grid-template-columns:1fr 1fr auto auto auto;gap:8px;align-items:center;padding:8px;border:1px solid #e8edf5;border-radius:10px;background:#fafcff" data-topic-i="'+i+'">'
        + '<input class="form-input" style="padding:7px 10px;font-size:12.5px" value="'+String(t.nameAr||'').replace(/"/g,'&quot;')+'" onchange="updateStoreTopicField('+i+',\'nameAr\',this.value)" placeholder="عربي"/>'
        + '<input class="form-input" style="padding:7px 10px;font-size:12.5px" value="'+String(t.nameFr||'').replace(/"/g,'&quot;')+'" onchange="updateStoreTopicField('+i+',\'nameFr\',this.value)" placeholder="FR" dir="ltr"/>'
        + '<label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer">'
        + '<input type="checkbox" '+(t.active?'checked':'')+' onchange="updateStoreTopicField('+i+',\'active\',this.checked)"/>'
        + '<span>'+(fr?'Actif':'مفعّل')+'</span></label>'
        + '<div style="display:flex;gap:4px">'
        + '<button type="button" class="btn btn-outline btn-sm" style="padding:4px 8px" onclick="moveStoreTopic('+i+',-1)" title="↑">↑</button>'
        + '<button type="button" class="btn btn-outline btn-sm" style="padding:4px 8px" onclick="moveStoreTopic('+i+',1)" title="↓">↓</button>'
        + '</div>'
        + '<button type="button" class="btn btn-outline btn-sm" style="padding:4px 8px;color:#b91c1c" onclick="removeStoreTopic('+i+')" title="'+(fr?'Supprimer':'حذف')+'">✕</button>'
        + '</div>';
    }).join('');
  }
  fillProductTopicSelect();
}
function updateStoreTopicField(i, key, val){
  var list = _storeTopicsList();
  if(!list[i]) return;
  if(key === 'active') list[i].active = !!val;
  else list[i][key] = String(val||'').trim().slice(0,80);
  STORE.storeTopics = window.RizqStoreTopics ? RizqStoreTopics.normalizeList(list) : list;
  fillProductTopicSelect();
}
function addStoreTopic(){
  var arEl = document.getElementById('topic-name-ar');
  var frEl = document.getElementById('topic-name-fr');
  var ar = (arEl && arEl.value || '').trim();
  var fr = (frEl && frEl.value || '').trim();
  if(!ar && !fr){ showToast(_t2('أدخل اسم الموضوع','Saisissez un nom de thème'),'error'); return; }
  var list = _storeTopicsList();
  if(list.length >= (window.RizqStoreTopics ? RizqStoreTopics.MAX : 30)){
    showToast(_t2('وصلت للحد الأقصى من الموضوعات','Limite de thèmes atteinte'),'error'); return;
  }
  list.push({
    id: window.RizqStoreTopics ? RizqStoreTopics.genId() : ('t_'+Date.now()),
    nameAr: ar || fr, nameFr: fr || ar, order: list.length, active: true
  });
  STORE.storeTopics = window.RizqStoreTopics ? RizqStoreTopics.normalizeList(list) : list;
  if(arEl) arEl.value = '';
  if(frEl) frEl.value = '';
  renderStoreTopicsUI();
}
function removeStoreTopic(i){
  var list = _storeTopicsList();
  if(!list[i]) return;
  if(!confirm(_t2('حذف هذا الموضوع؟ المنتجات المرتبطة تبقى لكن الفلتر يختفي إن لم يُستبدل.','Supprimer ce thème ? Les produits restent, mais le filtre disparaît s\'il n\'est pas remplacé.'))) return;
  list.splice(i,1);
  list.forEach(function(t,n){ t.order = n; });
  STORE.storeTopics = window.RizqStoreTopics ? RizqStoreTopics.normalizeList(list) : list;
  renderStoreTopicsUI();
}
function moveStoreTopic(i, dir){
  var list = _storeTopicsList();
  var j = i + dir;
  if(j < 0 || j >= list.length) return;
  var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
  list.forEach(function(t,n){ t.order = n; });
  STORE.storeTopics = list;
  renderStoreTopicsUI();
}
function saveStoreTopics(){
  var list = _storeTopicsList();
  STORE.storeTopics = window.RizqStoreTopics ? RizqStoreTopics.normalizeList(list) : list;
  try{
    var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
    var idx = accs.findIndex(function(a){ return a.id === SESSION_ID; });
    if(idx !== -1){
      accs[idx].storeTopics = STORE.storeTopics;
      localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs));
      STORE = accs[idx];
    }
  }catch(e){}
  _syncProfileToBackend(STORE);
  renderStoreTopicsUI();
  showToast(_t2('تم حفظ موضوعات المحل ✅','Thèmes de la boutique enregistrés ✅'),'success');
}
function fillProductTopicSelect(selectedId){
  var sel = document.getElementById('prod-cat');
  if(!sel) return;
  var fr = _storeDashLang() === 'fr';
  var list = _storeTopicsList().filter(function(t){ return t.active; });
  var cur = selectedId != null ? String(selectedId) : String(sel.value || '');
  var html = '<option value="">'+(fr?'— Choisir un thème —':'— اختر موضوعاً —')+'</option>';
  list.forEach(function(t){
    var lab = fr ? (t.nameFr||t.nameAr) : (t.nameAr||t.nameFr);
    html += '<option value="'+String(t.id).replace(/"/g,'&quot;')+'"'+(cur===String(t.id)?' selected':'')+'>'+lab.replace(/</g,'&lt;')+'</option>';
  });
  sel.innerHTML = html;
  if(cur) sel.value = cur;
}

function saveProduct(){
  if(window._rizqDashReadOnly){
    alert(_t2('انتهت الفترة المجانية. يرجى الاشتراك في إحدى الباقات لتتمكن من إضافة إعلانات جديدة وتفعيل زر الاتصال للزبائن','La période d’essai est terminée. Veuillez souscrire pour publier de nouvelles annonces.'));
    if(typeof _openRenewalPanel==='function') _openRenewalPanel();
    return;
  }
  // ── فحص حد المنتجات: الحد الشهري المجاني (منتهي) + الحد العددي الدقيق
  // لمستوى الباقة النشطة (50 شهرية / 200 ربعية / غير محدود سنوية-ماسية)
  // — تصحيح 25/07/2026: كان يُستخدم canPostNewAd() وحدها فتُمنح "غير محدود"
  // لأي باقة نشطة أياً كان مستواها، بعكس ما تَعِد به PKG_DEFAULTS فعلياً.
  // الفحص العددي يُطبَّق فقط عند إضافة منتج جديد، لا عند تعديل منتج موجود.
  if(typeof RizqSub !== 'undefined' && SESSION_ID){
    var _curCount = window._editingIdx==null ? (products?products.length:0) : -1; // -1 = تعديل، لا يُحتسب
    var _pc = (window._editingIdx==null)
      ? RizqSub.checkPostLimit(SESSION_ID, 'store', _curCount)
      : RizqSub.canPostNewAd(SESSION_ID);
    if(!_pc.allowed){
      var _msg = _pc.reason==='tier_limit_reached'
        ? _t2('⚠️ وصلت لحد '+_pc.limit+' منتج المسموح به في باقتك الحالية. أوقِف منتجاً قديماً أو رقِّ لباقة أعلى لعرض المزيد.', '⚠️ Vous avez atteint la limite de '+_pc.limit+' produits de votre forfait actuel. Désactivez un ancien produit ou passez à un forfait supérieur.')
        : (_pc.msg || _t2('وصلت للحد الشهري (3 إعلانات). جدّد اشتراكك لنشر المزيد.','Vous avez atteint la limite mensuelle (3 annonces). Renouvelez votre abonnement pour en publier plus.'));
      showToast(_msg,'error');
      _openRenewalPanel(); return;
    }
    if(_pc.reason === 'free_monthly')
      showToast(_t2('متبقي لك '+_pc.remaining+' إعلان(ات) هذا الشهر ☝️','Il vous reste '+_pc.remaining+' annonce(s) ce mois-ci ☝️'),'info');
  }
  const name = document.getElementById('prod-name').value.trim();
  const price = document.getElementById('prod-price').value;
  if(!name||!price){showToast(_t2('يرجى إدخال الاسم والسعر','Veuillez saisir le nom et le prix'),'error');return;}
  const adData = {
    id: 'STR-' + Date.now(),
    title: name,
    desc: document.getElementById('prod-desc') ? document.getElementById('prod-desc').value.trim() : '',
    price: price,
    category: 'store',
    images: [],
    seller: typeof accData !== 'undefined' ? (accData.name||_t2('محل','Boutique')) : _t2('محل','Boutique'),
    seller_trust_score: 70,
  };
  function doSave(data){
    var _editing = window._editingIdx!=null ? products[window._editingIdx] : null;
    var topicId = document.getElementById('prod-cat') ? document.getElementById('prod-cat').value.trim() : '';
    var topic = (window.RizqStoreTopics && topicId)
      ? RizqStoreTopics.findById(_storeTopicsList(), topicId)
      : null;
    var activeTopics = _storeTopicsList().filter(function(t){ return t.active; });
    if(activeTopics.length && !topic){
      showToast(_t2('اختر موضوعاً من قائمة محلك أو أضف موضوعاً أولاً','Choisissez un thème de votre boutique ou ajoutez-en un d\'abord'),'error');
      return;
    }
    var catName = topic ? topic.nameAr : (_editing && _editing.cat ? _editing.cat : '');
    var sizeStockMap = (typeof collectProdSizeStock==='function' ? collectProdSizeStock() : null);
    if(sizeStockMap && window.RizqStock && typeof RizqStock.sumSizeStock==='function'){
      var sumSs = RizqStock.sumSizeStock(sizeStockMap);
      var stockElSync = document.getElementById('prod-stock');
      if(stockElSync && sumSs != null) stockElSync.value = String(sumSs);
    }
    const prod = {
      // إصلاح جوهري 29/07/2026: معرّف ثابت لكل منتج (كان الاعتماد فقط على
      // ترتيب المصفوفة/index، هش وغير كافٍ للمزامنة مع الخادم الحقيقي) —
      // يُبقي على _backendId من المنتج القديم عند التعديل حتى يستمر ربطه
      // بنفس سجل rizq-backend بدل إنشاء سجل مكرَّر.
      id: _editing ? (_editing.id || ('LP-'+Date.now())) : ('LP-'+Date.now()+'-'+Math.floor(Math.random()*10000)),
      _backendId: _editing ? (_editing._backendId||null) : null,
      name, price,
      topicId: topic ? topic.id : (topicId || (_editing && _editing.topicId) || ''),
      cat: catName || (topic ? topic.nameAr : ''),
      desc: document.getElementById('prod-desc') ? document.getElementById('prod-desc').value.trim() : '',
      stock: document.getElementById('prod-stock') ? document.getElementById('prod-stock').value : '',
      variants: document.getElementById('prod-variants') ? document.getElementById('prod-variants').value.trim() : '',
      sizeStock: sizeStockMap,
      sku: document.getElementById('prod-sku') ? document.getElementById('prod-sku').value.trim().slice(0,64) : '',
      unit: document.getElementById('prod-unit') ? document.getElementById('prod-unit').value.trim().slice(0,40) : '',
      sold: document.getElementById('prod-sold') ? (parseInt(document.getElementById('prod-sold').value)||0) : 0,
      /* بدون باقة نشطة: لا نشر للسوق العام — يبقى قيد المراجعة / مسودة */
      status: (window._rizqDashReadOnly
        ? 'pending_review'
        : (data._status || (document.getElementById('prod-status') ? document.getElementById('prod-status').value : 'active'))),
      brandId: (document.getElementById('prod-brand')||{}).value || '',
      modelId: (document.getElementById('prod-model')||{}).value || '',
      brandName: '',
      brandNameFr: '',
      modelName: '',
      modelNameFr: '',
      // imgDataArr: مصفوفة الصور (حتى 6) — imgData تبقى محدَّثة بالصورة
      // الأولى فقط لتوافق أي كود قديم ما زال يقرأ prod.imgData مباشرة.
      imgDataArr: (window._prodImages||[]).slice(),
      imgData: (window._prodImages && window._prodImages[0]) || null,
      emoji: '📦',
      addedAt: new Date().toISOString()
    };
    if(window.RizqBrands && prod.brandId){
      var _b = RizqBrands.getById(prod.brandId);
      prod.brandName = RizqBrands.displayName(_b, false);
      prod.brandNameFr = RizqBrands.displayName(_b, true);
      if(prod.modelId){
        var _m = RizqBrands.getModel(prod.brandId, prod.modelId);
        prod.modelName = RizqBrands.modelName(_m, false);
        prod.modelNameFr = RizqBrands.modelName(_m, true);
      }
    }
    if(window._editingIdx!=null){ products[window._editingIdx]=prod; }
    else {
      products.push(prod);
      // سجّل الإعلان الجديد في العداد الشهري
      if(typeof RizqSub !== 'undefined' && SESSION_ID && window._editingIdx==null){
        var _subSt = RizqSub.checkSubscription(SESSION_ID);
        if(_subSt.status==='expired'||_subSt.status==='no_subscription') RizqSub.recordAdPost(SESSION_ID);
      }
    }
    if(!IS_DEMO) localStorage.setItem('store_products_'+SESSION_ID, JSON.stringify(products));
    if(!IS_DEMO) _rizqSyncCatalogItem(prod);
    if(typeof clearProductForm === 'function') clearProductForm();
    if(typeof renderProductsList === 'function') renderProductsList();
    showToast(prod.status==='pending_review' ? _t2('⏳ المنتج قيد المراجعة','⏳ Produit en cours de vérification') : _t2('✅ تم حفظ المنتج','✅ Produit enregistré'));
  }
  if(typeof RizqAgent !== 'undefined'){
    const feedbackEl = document.getElementById('store-mod-feedback');
    RizqAgent.handleSubmit(adData, {
      feedbackEl, 
      onApprove: (d) => doSave(d),
      onReject:  () => {},
      onReview:  (r,d) => doSave(d),
    });
  } else { doSave(adData); }
}

function onStoreBrandChange(){
  var brandId = (document.getElementById('prod-brand')||{}).value || '';
  if(window.RizqBrands){
    RizqBrands.fillModelSelect(document.getElementById('prod-model'), brandId, false, '');
  }
}

function editProduct(i){
  const p = products[i];
  window._editingIdx = i;
  document.getElementById('prod-name').value = p.name||'';
  document.getElementById('prod-price').value = p.price||'';
  var topicSel = (window.RizqStoreTopics)
    ? (RizqStoreTopics.resolveProductTopic(_storeTopicsList(), p) || null)
    : null;
  fillProductTopicSelect(topicSel ? topicSel.id : (p.topicId || ''));
  document.getElementById('prod-desc').value = p.desc||'';
  document.getElementById('prod-stock').value = p.stock||'';
  document.getElementById('prod-variants').value = p.variants||'';
  var skuEl = document.getElementById('prod-sku'); if(skuEl) skuEl.value = p.sku||'';
  var unitEl = document.getElementById('prod-unit'); if(unitEl) unitEl.value = p.unit||'';
  document.getElementById('prod-sold').value = p.sold||'';
  document.getElementById('prod-status').value = p.status||'available';
  try{
    if(window.RizqBrands){
      RizqBrands.fillBrandSelect(document.getElementById('prod-brand'), '', false, p.brandId||'');
      RizqBrands.fillModelSelect(document.getElementById('prod-model'), p.brandId||'', false, p.modelId||'');
    }
  }catch(eEdBrand){}
  window._prodImgData = p.imgData||null;
  window._prodImages = (p.imgDataArr && p.imgDataArr.length) ? p.imgDataArr.slice() : (p.imgData ? [p.imgData] : []);
  renderProdImagesGrid();
  window.__rzqProdSizeStock = (p.sizeStock && typeof p.sizeStock === 'object') ? Object.assign({}, p.sizeStock) : {};
  if(typeof rebuildProdSizeStockUI==='function') rebuildProdSizeStockUI(window.__rzqProdSizeStock);
  if(typeof applyStoreInventoryPresets==='function') applyStoreInventoryPresets();
  openAddProduct();
}

function deleteProduct(i){
  if(!confirm(_t2('هل تريد حذف هذا المنتج؟','Voulez-vous supprimer ce produit ?'))) return;
  if(!IS_DEMO) _rizqDeleteCatalogItem(products[i]);
  products.splice(i,1);
  localStorage.setItem('store_products_'+SESSION_ID, JSON.stringify(products));
  renderProducts();
  showToast(_t2('تم حذف المنتج','Produit supprimé'),'error');
}

// ══ PROFILE ══
window._pThumbData = null;
window._pCoverData = null;
function _storeDashLang(){ return (window.RizqI18n && RizqI18n.getLang() === 'fr') ? 'fr' : 'ar'; }
function renderStoreDashboardActivities(acc){
  if(!window.RizqMerchantActivities) return;
  var pkgId = acc && (acc.packageId || acc.package_id) ? (acc.packageId || acc.package_id) : null;
  var el = document.getElementById('p-cat');
  if(!el) return;
  RizqMerchantActivities.renderSelect(el, { accountType: 'store', packageId: pkgId, lang: _storeDashLang(), selected: (acc && acc.activityId) || '' });
  if(acc && acc.activityId) el.value = acc.activityId;
}
function onStoreActivityChange(){
  if(typeof applyStoreInventoryPresets==='function') applyStoreInventoryPresets();
}
function _syncPromoVideoExtraUI(acc){
  var wrap = document.getElementById('p-promo-video-extra-wrap');
  var badge = document.getElementById('p-promo-video-extra-badge');
  var hint = document.getElementById('p-promo-video-extra-hint');
  if(!wrap) return;
  acc = acc || STORE || {};
  var slots = (window.RizqStoreCommerce && typeof RizqStoreCommerce.introVideoSlots === 'function')
    ? RizqStoreCommerce.introVideoSlots(acc)
    : null;
  if(!slots){
    var plan = String(acc.planName || acc.plan || acc.package || '');
    var trial = /تجريب|trial|essai/i.test(plan);
    var yearly = /سنو|year|annuel/i.test(plan);
    slots = trial ? { max: 0, extraFree: 0 } : { max: 2, extraFree: yearly ? 1 : 0 };
  }
  var fr = _storeDashLang() === 'fr';
  var show = (slots.max || 0) >= 2;
  wrap.style.display = show ? '' : 'none';
  if(badge){
    badge.textContent = slots.extraFree
      ? (fr ? 'Inclus (Annuel)' : 'مشمول مجاناً (سنوية)')
      : (fr ? 'Supplément +500 MRU' : 'إضافي +500 أوقية');
    badge.style.background = slots.extraFree ? '#f0fdf4' : '#fff7ed';
    badge.style.color = slots.extraFree ? '#166534' : '#9a3412';
  }
  if(hint){
    hint.textContent = slots.extraFree
      ? (fr ? 'Votre forfait annuel inclut une 2ᵉ vidéo gratuite — elle apparaît à côté de la vidéo de présentation.' : 'باقتك السنوية تشمل فيديو إضافياً مجانياً — يظهر بجانب الفيديو التعريفي في واجهة المحل.')
      : (fr ? 'Certaines formules incluent une vidéo supplémentaire (+500 MRU hors annuel). Deux URLs différentes = deux lecteurs sur la vitrine.' : 'بعض الباقات تسمح بفيديو إضافي (+500 أوقية خارج السنوية). رابطان مختلفان = مقطعان في واجهة المحل.');
  }
}
function _mountDashVideoPreview(hostId, url, titleAr, titleFr){
  var host = document.getElementById(hostId);
  if(!host) return;
  var link = String(url || '').trim();
  if(!link || !window.RizqIntroVideo){
    host.style.display = 'none';
    host.innerHTML = '';
    return;
  }
  var fr = _storeDashLang && _storeDashLang() === 'fr';
  host.innerHTML = '';
  var ok = RizqIntroVideo.mount(host, link, {
    accountType: 'store',
    poster: (RizqIntroVideo.demoDashboardPoster && RizqIntroVideo.demoDashboardPoster('store')) || '',
    title: fr ? titleFr : titleAr,
    linkLabel: fr ? 'Ouvrir la source ↗' : 'فتح المصدر ↗',
    playLabel: fr ? 'Lire l’aperçu' : 'تشغيل المعاينة',
    mutedLabel: fr ? 'Activer le son' : 'تفعيل الصوت',
    unmutedLabel: fr ? 'Son activé' : 'الصوت مفعّل'
  });
  host.style.display = ok ? 'block' : 'none';
  if(!ok) host.innerHTML = '<div style="padding:12px;color:#fca5a5;font-size:12px;font-weight:700">'
    + (fr ? 'Lien non pris en charge — utilisez YouTube ou Facebook.' : 'رابط غير مدعوم — استخدم YouTube أو Facebook.')
    + '</div>';
}
function previewDashPromoVideo(){
  var el = document.getElementById('p-promo-video');
  _mountDashVideoPreview('p-promo-video-preview', el && el.value, '🎬 معاينة الفيديو التعريفي', '🎬 Aperçu vidéo de présentation');
}
function previewDashPromoVideoExtra(){
  var el = document.getElementById('p-promo-video-extra');
  _mountDashVideoPreview('p-promo-video-extra-preview', el && el.value, '🎬 معاينة الفيديو الإضافي', '🎬 Aperçu vidéo supplémentaire');
}

function fillProfileForm(){
  if(!STORE) return;
  renderStoreDashboardActivities(STORE);
  document.getElementById('p-store-name').value = STORE.name||'';
  document.getElementById('p-phone').value = STORE.phone||'';
  document.getElementById('p-email').value = STORE.email||'';
  document.getElementById('p-city').value = STORE.city||'';
  var pCatEl = document.getElementById('p-cat');
  if(pCatEl && STORE.activityId) pCatEl.value = STORE.activityId;
  else if(pCatEl && STORE.category && !STORE.activityId) pCatEl.value = STORE.category;
  document.getElementById('p-address').value = STORE.address||'';
  document.getElementById('p-desc').value = STORE.desc||'';
  var pvEl = document.getElementById('p-promo-video'); if(pvEl) pvEl.value = STORE.promo_video||'';
  var pvEx = document.getElementById('p-promo-video-extra'); if(pvEx) pvEx.value = STORE.promo_video_extra||'';
  try{ _syncPromoVideoExtraUI(STORE); }catch(ePv){}
  try{ previewDashPromoVideo(); previewDashPromoVideoExtra(); }catch(ePrev){}
  try{
    if(window.RizqLiveShowcase) RizqLiveShowcase.bindDashboard('#rzq-live-showcase-slot', STORE);
  }catch(eLive){}
  document.getElementById('p-whatsapp').value = STORE.whatsapp||'';
  document.getElementById('p-facebook').value = STORE.facebook||'';
  var tlEl = document.getElementById('p-tagline'); if(tlEl){ tlEl.value = STORE.tagline||''; updateTaglineCount(); }
  window._pThumbData = STORE.thumb || null;
  if(window._pThumbData){
    var inner = document.getElementById('p-thumb-inner');
    if(inner) inner.innerHTML = '<img src="'+window._pThumbData+'" style="max-height:100px;border-radius:8px;object-fit:cover"/><p style="font-size:11px;color:#10b981;margin-top:6px;font-weight:600">✅ '+_t2('صورة محفوظة — انقر للتغيير','Image enregistrée — cliquez pour changer')+'</p>';
  }
  window._pCoverData = STORE.cover || null;
  paintHeroCoverPreview();
  applySbThumb();
}
function applySbThumb(){
  if(!window.RizqProfilePhoto) return;
  var photo = window._pThumbData || (STORE && STORE.thumb) || '';
  var name = (STORE && STORE.name) || '';
  RizqProfilePhoto.paint(document.getElementById('sb-av'), { photo: photo, name: name });
}

function updateTaglineCount(){
  var el = document.getElementById('p-tagline'); var c = document.getElementById('p-tagline-count');
  if(el && c) c.textContent = (el.value||'').length + '/50';
}

function previewStripThumb(input){
  var file = input.files[0]; if(!file) return;
  var reader = new FileReader();
  reader.onload = function(e){
    var img = new Image();
    img.onload = function(){
      var maxW = 480;
      var scale = Math.min(1, maxW/img.width);
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width*scale);
      canvas.height = Math.round(img.height*scale);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      window._pThumbData = canvas.toDataURL('image/jpeg', 0.82);
      var inner = document.getElementById('p-thumb-inner');
      if(inner) inner.innerHTML = '<img src="'+window._pThumbData+'" style="max-height:100px;border-radius:8px;object-fit:cover"/><p style="font-size:11px;color:#10b981;margin-top:6px;font-weight:600">✅ '+escapeHtml(file.name)+'</p>';
      applySbThumb();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function paintHeroCoverPreview(){
  var inner = document.getElementById('p-cover-inner');
  var clr = document.getElementById('p-cover-clear');
  if(!inner) return;
  if(window._pCoverData){
    inner.innerHTML = '<img src="'+window._pCoverData+'" style="width:100%;max-height:140px;border-radius:8px;object-fit:cover;display:block"/><p style="font-size:11px;color:#10b981;margin-top:6px;font-weight:600">✅ '+_t2('غلاف محفوظ — انقر للتغيير','Couverture enregistrée — cliquez pour changer')+'</p>';
    if(clr) clr.style.display = '';
  } else {
    inner.innerHTML = '<div style="font-size:26px;margin-bottom:4px">🏞️</div><p style="font-size:12px;font-weight:600;color:var(--navy)">'+_t2('انقر لرفع غلاف المحل','Cliquez pour ajouter la couverture')+'</p><p style="font-size:10px;color:#94a3b8;margin-top:2px">'+_t2('يفضّل صورة أفقية عريضة — JPG / PNG','Préférez une image horizontale — JPG / PNG')+'</p>';
    if(clr) clr.style.display = 'none';
  }
}
function previewHeroCover(input){
  var file = input.files[0]; if(!file) return;
  var reader = new FileReader();
  reader.onload = function(e){
    var img = new Image();
    img.onload = function(){
      var maxW = 1400;
      var scale = Math.min(1, maxW/img.width);
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width*scale);
      canvas.height = Math.round(img.height*scale);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      window._pCoverData = canvas.toDataURL('image/jpeg', 0.78);
      paintHeroCoverPreview();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function clearHeroCover(){
  window._pCoverData = '';
  var inp = document.getElementById('p-cover-input');
  if(inp) inp.value = '';
  paintHeroCoverPreview();
}

function saveProfile(){
  const accs = JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
  const idx = accs.findIndex(a=>a.id===SESSION_ID);
  if(idx===-1){showToast(_t2('خطأ في حفظ البيانات','Erreur lors de l\'enregistrement des données'),'error');return;}
  accs[idx].name = document.getElementById('p-store-name').value.trim();
  var phoneRaw = document.getElementById('p-phone').value.trim();
  var phones = (window.RizqPhone && RizqPhone.resolveMerchantPhone(phoneRaw)) || null;
  if(!phones){showToast(_t2('رقم هاتف غير صالح — موريتاني 8 أرقام (2/3/4) أو دولي +…','Numéro invalide — MR 8 chiffres (2/3/4) ou international +…'),'error');return;}
  accs[idx].phone = phones.phone || phones.whatsapp;
  accs[idx].phoneIntl = phones.phoneIntl || '';
  accs[idx].email = document.getElementById('p-email').value.trim();
  accs[idx].city = document.getElementById('p-city').value.trim();
  var _pCatEl = document.getElementById('p-cat');
  if(_pCatEl && _pCatEl.value){
    accs[idx].activityId = _pCatEl.value;
    accs[idx].activity = window.RizqMerchantActivities ? RizqMerchantActivities.displayName(_pCatEl.value, _storeDashLang()) : _pCatEl.options[_pCatEl.selectedIndex].text;
    accs[idx].category = window.RizqMerchantActivities ? RizqMerchantActivities.legacyCategoryFromActivity(_pCatEl.value) : _pCatEl.value;
  }
  accs[idx].address = document.getElementById('p-address').value.trim();
  accs[idx].desc = document.getElementById('p-desc').value.trim();
  accs[idx].promo_video = (document.getElementById('p-promo-video')||{}).value?.trim()||'';
  accs[idx].promo_video_extra = (document.getElementById('p-promo-video-extra')||{}).value?.trim()||'';
  STORE.promo_video = accs[idx].promo_video;
  STORE.promo_video_extra = accs[idx].promo_video_extra;
  var waManual = document.getElementById('p-whatsapp').value.trim();
  if(waManual && /^https?:\/\/(wa\.me|api\.whatsapp\.com)/i.test(waManual)){
    accs[idx].whatsapp = waManual.slice(0, 60);
  } else if(waManual && window.RizqPhone && RizqPhone.normalizeIntlPhone(waManual)){
    accs[idx].whatsapp = RizqPhone.normalizeIntlPhone(waManual);
  } else {
    accs[idx].whatsapp = phones.whatsapp;
  }
  accs[idx].facebook = document.getElementById('p-facebook').value.trim();
  accs[idx].tagline = (document.getElementById('p-tagline')||{}).value?.trim().slice(0,50) || '';
  if(window._pThumbData) accs[idx].thumb = window._pThumbData;
  if(window._pCoverData !== null && window._pCoverData !== undefined) accs[idx].cover = window._pCoverData || '';
  localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs));
  STORE = accs[idx];
  document.getElementById('sb-store-name').textContent = STORE.name||_t2('محلي','Ma boutique');
  _syncProfileToBackend(STORE);
  showToast(_t2('تم حفظ معلومات المحل ✅','Informations de la boutique enregistrées ✅'),'success');
}

/* إصلاح جوهري: saveProfile() كانت تكتب فقط إلى localStorage — أي تعديل يجريه
   التاجر من لوحته (المدينة، الوصف، الفئة، الصورة...) لم يكن يصل أبداً للخادم،
   فيبقى ظاهراً بشكل قديم/خاطئ في دليل المعارض rizq_showroom_directory.html
   وصفحة معرضه rizq_showroom.html العامة (المصدر: GET /api/accounts/public).
   الآن نُرسل نفس الحقول عبر PATCH /api/accounts/mine/:id بعد كل حفظ محلي. */
function _syncProfileToBackend(acc){
  if(!window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN) return;
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/mine/' + encodeURIComponent(SESSION_ID), {
    method: 'PATCH',
    headers: { 'Content-Type':'application/json', 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) },
    body: JSON.stringify({
      name: acc.name||'', phone: acc.phone||'', phoneIntl: acc.phoneIntl||'', email: acc.email||'', city: acc.city||'',
      category: acc.category||'', activityId: acc.activityId||'', activity: acc.activity||'',
      address: acc.address||'', desc: acc.desc||'',
      promo_video: acc.promo_video||'', promo_video_extra: acc.promo_video_extra||'', whatsapp: acc.whatsapp||'', facebook: acc.facebook||'',
      tagline: acc.tagline||'', thumb: acc.thumb||'', cover: acc.cover||'',
      storeTopics: Array.isArray(acc.storeTopics) ? acc.storeTopics : []
    })
  }).catch(function(){ /* فشل صامت — البيانات محفوظة محلياً على الأقل */ });
}

// ══ HOURS ══
// ── إصلاح جوهري 29/07/2026: جلب ساعات العمل الحقيقية من rizq-backend عند
// التحميل — كانت محبوسة في متصفح واحد فقط، فلا يراها زائر من جهاز آخر
// حتى بعد أن تُعرَض على الصفحة العامة (rizq_store.html) لاحقاً.
function _rizqMergeHoursFromBackend(){
  try{
    if(typeof window.RIZQ_BACKEND_BASE !== 'string' || !window.RIZQ_BACKEND_BASE || !SESSION_ID) return;
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '')+'/api/business-hours/'+encodeURIComponent(SESSION_ID))
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if(!data || !Array.isArray(data.hours) || !data.hours.length) return;
        localStorage.setItem('store_hours_'+SESSION_ID, JSON.stringify(data.hours));
        renderHoursTable();
      }).catch(function(){});
  }catch(e){}
}
function renderHoursTable(){
  const saved = JSON.parse(localStorage.getItem('store_hours_'+SESSION_ID)||'null') || DEFAULT_HOURS;
  const el = document.getElementById('hours-table');
  if(!el) return;
  el.innerHTML = saved.map((h,i)=>`
    <div class="hours-row">
      <div class="hours-day">${(function(){var idx=DAYS_AR.indexOf(h.day);return idx>=0&&_storeLang==='fr'?DAYS_FR[idx]:h.day;})()}</div>
      <input class="form-input" style="padding:7px 10px;font-size:12.5px" type="time" id="hr-from-${i}" value="${h.from}" ${!h.open?'disabled':''}/>
      <input class="form-input" style="padding:7px 10px;font-size:12.5px" type="time" id="hr-to-${i}" value="${h.to}" ${!h.open?'disabled':''}/>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
        <input type="checkbox" id="hr-open-${i}" ${h.open?'checked':''} onchange="toggleDay(${i})" style="width:16px;height:16px;cursor:pointer"/>
        <span style="color:var(--text-muted)">${_t2('مفتوح','Ouvert')}</span>
      </label>
    </div>`).join('');
}

function toggleDay(i){
  const open = document.getElementById('hr-open-'+i).checked;
  document.getElementById('hr-from-'+i).disabled = !open;
  document.getElementById('hr-to-'+i).disabled = !open;
}

function saveHours(){
  const hours = DEFAULT_HOURS.map((_,i)=>({
    day: DAYS_AR[i],
    open: document.getElementById('hr-open-'+i).checked,
    from: document.getElementById('hr-from-'+i).value,
    to: document.getElementById('hr-to-'+i).value
  }));
  localStorage.setItem('store_hours_'+SESSION_ID, JSON.stringify(hours));
  try{
    if(typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE && SESSION_ID && SESSION_TOKEN){
      fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '')+'/api/business-hours', {
        method:'POST', headers:{'Content-Type':'application/json','x-account-token':(window.REAL_ACCESS_TOKEN || SESSION_TOKEN)},
        body: JSON.stringify({ accountId: SESSION_ID, hours: hours })
      }).catch(function(){});
    }
  }catch(e){}
  showToast(_t2('تم حفظ ساعات العمل ✅','Horaires enregistrés ✅'),'success');
}

// ══ PHOTOS ══
function addPhotos(input){
  const files = Array.from(input.files);
  let loaded = 0;
  files.forEach(file=>{
    const reader = new FileReader();
    reader.onload = e=>{
      storePhotos.push({src:e.target.result, name:file.name});
      loaded++;
      if(loaded===files.length){
        localStorage.setItem('store_photos_'+SESSION_ID, JSON.stringify(storePhotos));
        renderPhotos();
        showToast(_t2(`تم رفع ${loaded} صورة ✅`,`${loaded} photo(s) téléchargée(s) ✅`),'success');
      }
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotos(){
  const grid = document.getElementById('photos-grid');
  if(!grid) return;
  if(!storePhotos.length){
    grid.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1"><div style="font-size:40px;margin-bottom:10px">📷</div><p>'+_t2('لا توجد صور بعد — أضف صوراً لمحلك','Aucune photo pour le moment — ajoutez des photos de votre boutique')+'</p></div>';
    return;
  }
  grid.innerHTML = storePhotos.map((p,i)=>`
    <div style="position:relative;border-radius:12px;overflow:hidden;aspect-ratio:1;box-shadow:0 2px 10px rgba(0,0,0,.1)">
      <img src="${p.src}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover"/>
      <button onclick="deletePhoto(${i})" style="position:absolute;top:6px;left:6px;background:rgba(239,68,68,.9);color:#fff;border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">×</button>
    </div>`).join('');
}

function deletePhoto(i){
  // إصلاح: لم يكن هناك تأكيد قبل الحذف (بعكس deleteProduct المجاورة) — حذف فوري بلا رجعة بضغطة واحدة
  if(!confirm(_t2('هل تريد حذف هذه الصورة؟','Voulez-vous supprimer cette photo ?'))) return;
  storePhotos.splice(i,1);
  localStorage.setItem('store_photos_'+SESSION_ID, JSON.stringify(storePhotos));
  renderPhotos();
}

// ══ SUBSCRIPTION ══
function getSubInfo(){
  if(typeof RizqSub !== 'undefined' && typeof SESSION_ID !== 'undefined' && SESSION_ID){
    const sub = RizqSub.checkSubscription(SESSION_ID);
    if(sub.status !== 'no_subscription'){
      const isExpired = sub.status==='expired';
      const isTrial = sub.status==='trial' || sub.status==='trial_expiring';
      const isExpiringSoon = sub.status==='expiring_soon' || sub.status==='trial_expiring';
      const totalDays = (sub.acc && sub.acc.pkg_days) ? sub.acc.pkg_days : (isTrial?3:30);
      const pkgName = (sub.acc && (sub.acc.pkg_name || sub.acc.package || sub.acc.plan)) || '';
      return {daysLeft:sub.daysLeft, isTrial, isExpired, isExpiringSoon, pct: Math.max(0,Math.min(100,(sub.daysLeft/Math.max(1,totalDays))*100)), pkgName};
    }
  }
  const trialEnd = new Date(STORE.trial_ends||Date.now());
  const now = new Date();
  const daysLeft = Math.max(0,Math.ceil((trialEnd-now)/86400000));
  const isTrial = !STORE.plan;
  const isExpired = daysLeft===0;
  const totalDays = isTrial ? 3 : 30;
  return {daysLeft, isTrial, isExpired, isExpiringSoon: !isTrial && !isExpired && daysLeft<=5, pct: Math.max(0,Math.min(100,(daysLeft/totalDays)*100)), pkgName:STORE.plan||''};
}

function renderSubscriptionPanel(){
  const info = getSubInfo();
  const {daysLeft,isTrial,isExpired,isExpiringSoon} = info;
  const wrap = document.getElementById('sub-card-wrap');
  const renewal = document.getElementById('renewal-section');
  if(!wrap) return;
  const bgClass = isExpired?'expired':isTrial?'trial':'active-plan';
  const statusText = isExpired?_t2('❌ انتهى الاشتراك','❌ Abonnement expiré'):isTrial?_t2('🎁 فترة تجريبية مجانية','🎁 Période d\'essai gratuite'):_t2('✅ اشتراك نشط','✅ Abonnement actif');
  const reminderBanner = (isExpiringSoon||isExpired) ? `
    <div class="sub-card ${isExpired?'expired':'trial'}" style="margin-top:12px;text-align:center">
      <div style="font-size:13px;font-weight:700">${isExpired?_t2('⛔ انتهى اشتراكك — جدد الآن لاستعادة كل المزايا','⛔ Votre abonnement a expiré — renouvelez maintenant pour retrouver tous les avantages'):_t2(`⚠️ اشتراكك سينتهي بعد ${daysLeft} أيام — جدد الآن لتجنب توقف الخدمة`,`⚠️ Votre abonnement expire dans ${daysLeft} jours — renouvelez maintenant pour éviter toute interruption`)}</div>
      <div style="margin-top:10px">
        <button class="btn btn-gold btn-sm" onclick="document.getElementById('packages-display').scrollIntoView({behavior:'smooth'})">${_t2('🔄 تجديد الباقة الآن','🔄 Renouveler maintenant')}</button>
      </div>
    </div>` : '';
  wrap.innerHTML=`
    <div class="sub-card ${bgClass}">
      <div style="position:absolute;top:20px;left:20px;opacity:.08;font-size:80px">💳</div>
      <div class="sub-plan-name">${statusText}</div>
      <div class="sub-expires">${isExpired?_t2('انتهى الاشتراك — جدّد الآن','Abonnement expiré — renouvelez maintenant'):isTrial?_t2(`الفترة التجريبية تنتهي خلال ${daysLeft} يوم`,`La période d'essai se termine dans ${daysLeft} jour(s)`):_t2(`ينتهي خلال ${daysLeft} يوماً`,`Expire dans ${daysLeft} jour(s)`)}</div>
      ${!isExpired?`<div class="sub-progress"><div class="sub-progress-bar" style="width:${info.pct}%"></div></div><div class="sub-days-left">${_t2(`${daysLeft} يوم متبقٍ`,`${daysLeft} jour(s) restant(s)`)}</div>`:''}
      <div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-gold btn-sm" onclick="document.getElementById('packages-display').scrollIntoView({behavior:'smooth'})">${_t2('🔄 عرض الباقات','🔄 Voir les forfaits')}</button>
      </div>
    </div>${reminderBanner}`;
  // التجديد الحقيقي الوحيد: packages-display → openPayModal → submitPayment
  // (RizqSub.submitSubscriptionRequest). قسم renewal-section كان localStorage فقط.
  if(renewal) renewal.style.display = 'none';
}

function renderMyInvoices(){
  var wrap = document.getElementById('my-invoices-wrap');
  if(!wrap) return;
  var accounts0 = JSON.parse(localStorage.getItem('rizq_accounts')||'{}');
  var hasServerToken = !!(accounts0[SESSION_ID] && accounts0[SESSION_ID].server_token);
  if(typeof RizqSub === 'undefined' || typeof RizqSub.fetchInvoices !== 'function'){
    // تراجع أخير في حال لم يُحمَّل محرك الاشتراكات إطلاقاً
    if(typeof RizqInvoice === 'undefined'){ wrap.innerHTML=''; return; }
    _paintInvoices(RizqInvoice.getInvoicesForAccount(SESSION_ID) || [], true);
    return;
  }
  wrap.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">'+_t2('🧾 فواتيري','🧾 Mes factures')+'</div></div>'
    + '<p style="color:var(--text-muted,#6b7280);font-size:12.5px;padding:6px 0">'+_t2('جارٍ التحميل...','Chargement...')+'</p></div>';
  RizqSub.fetchInvoices(SESSION_ID).then(function(invs){ _paintInvoices(invs||[], !hasServerToken); }).catch(function(){ _paintInvoices([], !hasServerToken); });
}

function _paintInvoices(invs, isLocalSource){
  var wrap = document.getElementById('my-invoices-wrap');
  if(!wrap) return;
  if(!invs.length){
    wrap.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">'+_t2('🧾 فواتيري','🧾 Mes factures')+'</div></div>'
      + '<p style="color:var(--text-muted,#6b7280);font-size:13px;padding:10px 0">'+_t2('لا توجد فواتير بعد','Aucune facture pour le moment')+'</p></div>';
    return;
  }
  var canPrintLocal = isLocalSource && (typeof RizqInvoice !== 'undefined');
  var rows = invs.map(function(inv){
    var amount = inv.price>0 ? Number(inv.price).toLocaleString()+' MRU' : _t2('مجاناً','Gratuit');
    var dateStr = '-';
    try{ dateStr = new Date(inv.issuedAt).toLocaleDateString(); }catch(e){}
    var printBtn = (canPrintLocal && inv.id)
      ? '<button class="btn btn-outline btn-sm" onclick="RizqInvoice.openInvoice(\''+escapeHtml(inv.id)+'\')">🖨️ '+_t2('عرض/طباعة','Voir/Imprimer')+'</button>'
      : '<span style="font-size:11.5px;color:var(--text-muted,#6b7280)">'+_t2('أُرسلت عبر واتساب/بريد','Envoyée par WhatsApp/e-mail')+'</span>';
    return '<tr>'
      + '<td style="padding:8px;font-size:12.5px">'+escapeHtml(inv.number)+'</td>'
      + '<td style="padding:8px;font-size:12.5px">'+escapeHtml(inv.pkgName)+'</td>'
      + '<td style="padding:8px;font-size:12.5px;font-weight:700;color:#C9A84C">'+escapeHtml(amount)+'</td>'
      + '<td style="padding:8px;font-size:12.5px">'+escapeHtml(dateStr)+'</td>'
      + '<td style="padding:8px;font-size:12.5px">'+printBtn+'</td>'
      + '</tr>';
  }).join('');
  wrap.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">'+_t2('🧾 فواتيري','🧾 Mes factures')+'</div></div>'
    + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'
    + '<thead><tr style="background:#f8faff;text-align:'+(document.documentElement.dir==='rtl'?'right':'left')+'">'
    + '<th style="padding:8px;font-size:12px;color:var(--text-muted,#6b7280)">'+_t2('رقم الإيصال','N° reçu')+'</th>'
    + '<th style="padding:8px;font-size:12px;color:var(--text-muted,#6b7280)">'+_t2('الباقة','Forfait')+'</th>'
    + '<th style="padding:8px;font-size:12px;color:var(--text-muted,#6b7280)">'+_t2('المبلغ','Montant')+'</th>'
    + '<th style="padding:8px;font-size:12px;color:var(--text-muted,#6b7280)">'+_t2('تاريخ الإصدار','Date d\'émission')+'</th>'
    + '<th style="padding:8px;font-size:12px;color:var(--text-muted,#6b7280)"></th>'
    + '</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

function renderPackagesDisplay(){
  var pkgs=JSON.parse(localStorage.getItem('rizq_store_packages')||localStorage.getItem('rizq_packages')||'[]').filter(function(p){return p.active!==false;});
  var el=document.getElementById('packages-display'); if(!el) return;
  var lang=(typeof _storeLang!=='undefined'?_storeLang:'ar');

  var FEATS_AR={'تجريبية':['وصول كامل للمنصة','عرض 10 منتجات','دعم فني أساسي'],'شهرية':['صفحة محل موثقة','عرض 100 منتج','إحصائيات شهرية','دعم بالأولوية'],'ربعية':['كل مزايا الشهرية','توفير 15% عن الشهري','عرض 500 منتج','مدير حساب مخصص'],'سنوية':['كل مزايا الربعية','توفير 35% عن الشهري','منتجات غير محدودة','دعم VIP 24/7','تقارير سنوية'],'الماسية الأساسية للمحلات':['منتجات غير محدودة للمتجر','نائب ذكي نصي للمحل (موقع + واتساب)','1,500 محادثة نصية شهرياً','لوحة متابعة وتحليل الأداء لحظياً'],'الماسية Pro للمحلات':['منتجات غير محدودة للمتجر','نائب ذكي تفاعلي للمحل (نصي + صوتي)','2,500 محادثة نصية + 150 دقيقة صوتية شهرياً','ويدجت الموقع + واتساب + مكالمات آليّة','لوحة متابعة وتحليل الأداء لحظياً']};
  var FEATS_FR={'تجريبية':['Accès complet à la plateforme','10 produits affichés','Support technique de base'],'شهرية':['Page boutique vérifiée','100 produits affichés','Statistiques mensuelles','Support prioritaire'],'ربعية':['Tous les avantages du mensuel','15% d\'économie vs mensuel','500 produits affichés','Gestionnaire de compte dédié'],'سنوية':['Tous les avantages du trimestriel','35% d\'économie vs mensuel','Produits illimités','Support VIP 24/7','Rapports annuels'],'الماسية الأساسية للمحلات':['Produits illimités pour la boutique','Adjoint intelligent texte (site + WhatsApp)','1 500 conversations texte / mois','Tableau de bord et analyse en temps réel'],'الماسية Pro للمحلات':['Produits illimités pour la boutique','Adjoint interactif (texte + voix)','2 500 conversations texte + 150 min voix / mois','Widget site + WhatsApp + appels automatiques','Tableau de bord et analyse en temps réel']};
  var FEATS=lang==='fr'?FEATS_FR:FEATS_AR;
  var ICONS={'تجريبية':'🎁','شهرية':'📅','ربعية':'🚀','سنوية':'👑','الماسية الأساسية للمحلات':'💎','الماسية Pro للمحلات':'💎','ماسية':'💎','الماسية 💎 (النائب الذكي الشامل)':'💎'};

  var DEF=[{name:'تجريبية',duration:'10 أيام',price:0},{name:'شهرية',duration:'شهر',price:2000},{name:'ربعية',duration:'3 أشهر',price:5500,highlight:true},{name:'سنوية',duration:'12 شهر',price:15000},{name:'الماسية الأساسية للمحلات',duration:'شهر',price:3500,isDiamond:true},{name:'الماسية Pro للمحلات',duration:'شهر',price:6000,isDiamond:true}];
  var list=pkgs.length?pkgs:DEF;
  if(typeof RizqPackagesConfig!=='undefined' && typeof RizqPackagesConfig.getCatalog==='function'){
    var cat=RizqPackagesConfig.getCatalog('store', lang);
    if(cat && cat.length) list=cat;
  }

  var r=RizqSub.renderPackageCardsHTML(list,FEATS,ICONS,lang);
  el.innerHTML=r.grid;
  var rp=document.getElementById('renewal-packages');
  if(rp)rp.innerHTML=r.renewal;
}

// ── Rizq ADS — باقات إعلان الفيديو (نفس محرك RizqSub، فئة 'video') ──
function renderVideoPackagesDisplay(){
  var el=document.getElementById('rizq-ads-packages-display'); if(!el) return;
  var lang=(typeof _storeLang!=='undefined'?_storeLang:'ar');
  var pkgs=[];
  if(typeof RizqPackagesConfig!=='undefined' && typeof RizqPackagesConfig.getCatalog==='function'){
    try{ pkgs=RizqPackagesConfig.getCatalog('video', lang).filter(function(p){return p.active!==false;}); }catch(e){}
  }
  if(!pkgs.length){ try{ pkgs=JSON.parse(localStorage.getItem('rizq_video_packages')||'[]').filter(function(p){return p.active!==false;}); }catch(e){ pkgs=[]; } }
  if(!pkgs.length && window.RizqPackagesConfig && RizqPackagesConfig.CATALOGS && RizqPackagesConfig.CATALOGS.video){
    pkgs=JSON.parse(JSON.stringify(RizqPackagesConfig.CATALOGS.video));
  }
  var list=pkgs;
  var FEATS_AR={'إعلان فيديو واحد':['فيديو إعلاني واحد لمدة 10 أيام','ظهور في قسم الإعلانات بالصفحة الرئيسية','دفع لكل إعلان — بلا اشتراك شهري'],'أساسي فيديو':['حتى 3 فيديوهات إعلانية ترويجية شهرياً','ظهور في قسم الإعلانات بالصفحة الرئيسية','إحصائيات أداء أساسية آلية'],'احترافي فيديو':['حتى 10 فيديوهات إعلانية ترويجية شهرياً','أولوية الترتيب في نتائج البحث','شارة «محتوى مميّز برزق» الموثّقة'],'أعمال ومعارض':['فيديوهات وعروض غير محدودة','ظهور مميز في القسم الرئيسي بالصفحة الرئيسية','تقارير تحليل أداء آلية مفصّلة','دعم VIP ذو أولوية + شارة VIP موثّقة'],'أساسي':['حتى 3 فيديوهات إعلانية ترويجية شهرياً','ظهور في قسم الإعلانات بالصفحة الرئيسية','إحصائيات أداء أساسية آلية'],'احترافي':['حتى 10 فيديوهات إعلانية ترويجية شهرياً','أولوية الترتيب في نتائج البحث','شارة «محتوى مميّز برزق» الموثّقة']};
  var FEATS_FR={'إعلان فيديو واحد':['Une vidéo publicitaire pendant 10 jours','Section publicitaire page d\'accueil','Paiement par annonce — sans abonnement mensuel'],'أساسي فيديو':['Jusqu\'à 3 vidéos promotionnelles / mois','Section publicitaire page d\'accueil','Statistiques de performance de base automatisées'],'احترافي فيديو':['Jusqu\'à 10 vidéos promotionnelles / mois','Priorité dans les résultats de recherche','Badge « Contenu vedette Rizq » vérifié'],'أعمال ومعارض':['Vidéos et vitrines illimitées','Placement premium section principale','Rapports d\'analyse automatisés détaillés','Support VIP prioritaire + badge VIP vérifié'],'أساسي':['Jusqu\'à 3 vidéos promotionnelles / mois','Section publicitaire page d\'accueil','Statistiques de performance de base automatisées'],'احترافي':['Jusqu\'à 10 vidéos promotionnelles / mois','Priorité dans les résultats de recherche','Badge « Contenu vedette Rizq » vérifié']};
  var FEATS=(lang==='fr')?FEATS_FR:FEATS_AR;
  var ICONS={'إعلان فيديو واحد':'⚡','أساسي فيديو':'🎬','احترافي فيديو':'🥇','أعمال ومعارض':'💎','أساسي':'🎬','احترافي':'🥇'};
  var r=RizqSub.renderPackageCardsHTML(list,FEATS,ICONS,lang,'video');
  el.innerHTML=r.grid;
}

// ── حالة إعلان الفيديو الحقيقية (Rizq ADS) — مهمة #238: كان صاحب الحساب
// يرسل طلب "مميزة الفيديو" ثم لا يرى أبداً إن كان قد فُعِّل فعلاً أو ما
// زال قيد المراجعة أو انتهى — يقرأ الآن الإعداد الحي نفسه (site-config)
// الذي تعرضه الصفحة الرئيسية فعلياً، فتكون الحالة المعروضة هنا مطابقة
// 100% لما يراه الزائر الحقيقي، بلا وعد بمعلومة غير موجودة فعلياً.
function _rizqRenderAdsStatus(acc){
  var mount=document.getElementById('rizq-ads-status-mount');
  if(!mount || !window.RIZQ_BACKEND_BASE || !acc || !acc.id) return;
  var lang=(typeof _storeLang!=='undefined'?_storeLang:'ar');
  var fr=(lang==='fr');
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'')+'/api/site-config').then(function(r){return r.ok?r.json():null;}).then(function(data){
    var va = data && data.config && data.config.videoAds;
    if(!va) return;
    var inHero = (va.hero||[]).find(function(a){return a.accountId===acc.id;});
    var inPopup = (va.popup||[]).find(function(a){return a.accountId===acc.id;});
    if(!inHero && !inPopup) return; // لا إعلان نشط حالياً — لا داعٍ لعرض شيء
    var spots=[];
    if(inHero) spots.push(_t2('🏠 الواجهة الرئيسية (Hero)','🏠 Page d\'accueil (Hero)'));
    if(inPopup) spots.push(_t2('📌 الشريط العلوي (Popup)','📌 Bandeau supérieur (Popup)'));
    var active = (inHero && inHero.active!==false) || (inPopup && inPopup.active!==false);
    mount.innerHTML = '<div style="background:'+(active?'#ecfdf5':'#fff7ed')+';border:1.5px solid '+(active?'#6ee7b7':'#fdba74')+';border-radius:12px;padding:14px 16px;font-size:12.5px;color:'+(active?'#065f46':'#9a3412')+';display:flex;align-items:center;gap:10px">'
      + '<span style="font-size:22px">'+(active?'🟢':'🟡')+'</span>'
      + '<span>'+(active
          ? ('✅ '+_t2('فيديوك الإعلاني نشط الآن في: ','Votre vidéo publicitaire est active sur : ')+spots.join(' + '))
          : _t2('⏸️ فيديوك مضاف لكنه موقوف مؤقتاً من الإدارة','⏸️ Votre vidéo est ajoutée mais suspendue par l\'administration'))+'</span>'
      + '</div>';
  }).catch(function(){});
}



function handleRenewalUpload(){ /* removed — use packages payment flow */ }
function submitRenewal(){
  var el = document.getElementById('packages-display');
  if(el) el.scrollIntoView({behavior:'smooth'});
  else showToast(_t2('اختر باقة من القائمة أدناه للتجديد','Choisissez un forfait ci-dessous pour renouveler'),'error');
}

// ══ SERVICE DESK (غرفة الطلبات) ══
function _serviceReqStatusLabel(st){
  var map = {
    new: _t2('جديد','Nouveau'),
    in_progress: _t2('قيد المعالجة','En cours'),
    done: _t2('منجز','Terminé'),
    rejected: _t2('مرفوض','Refusé')
  };
  return map[st] || st || '';
}

function renderStoreServiceRequests(){
  var serviceReqs = Array.isArray(window._rizqStoreServiceRequests) ? window._rizqStoreServiceRequests : [];
  var unreadService = serviceReqs.filter(function(r){ return r.status === 'new'; }).length;
  var rb = document.getElementById('req-badge');
  if(rb){
    if(unreadService > 0){ rb.textContent = unreadService; rb.style.display = ''; }
    else rb.style.display = 'none';
  }
  var el = document.getElementById('requests-list');
  if(!el) return;
  if(!serviceReqs.length){
    el.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:10px">📩</div><p>'+_t2('لا توجد طلبات بعد','Aucune demande pour le moment')+'</p></div>';
    return;
  }
  var statusColors = { new:'#1B3A6B', in_progress:'#f59e0b', done:'#10b981', rejected:'#dc2626' };
  el.innerHTML = serviceReqs.map(function(r){
    var phone = r.buyerWhatsapp || r.buyerPhone || '';
    var timeStr = r.createdAt ? new Date(r.createdAt).toLocaleString(localStorage.getItem('rizq_lang')==='fr'?'fr-FR':'ar-MR-u-nu-latn') : '';
    var st = r.status || 'new';
    return '<div class="req-item" style="--rc:'+(st==='new'?'var(--royal)':'rgba(27,58,107,.2)')+'">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">'
      + '<span style="font-size:14px;font-weight:700;color:var(--navy)">'+escapeHtml(r.buyerName||_t2('زبون','Client'))+'</span>'
      + (r.service?'<span style="font-size:11px;background:rgba(27,58,107,.08);color:var(--navy);padding:2px 8px;border-radius:10px">'+escapeHtml(r.service)+'</span>':'')
      + (r.templateName?'<span style="font-size:10px;background:rgba(201,168,76,.15);color:#8a6a1a;padding:2px 8px;border-radius:10px">'+escapeHtml(r.templateName)+'</span>':'')
      + '<span style="font-size:10px;font-weight:800;color:#fff;background:'+(statusColors[st]||'#64748b')+';padding:2px 8px;border-radius:10px">'+_serviceReqStatusLabel(st)+'</span>'
      + '<span style="font-size:11px;color:#9aa5b8;margin-right:auto">'+timeStr+'</span>'
      + '</div>'
      + '<div class="req-meta">'+escapeHtml(r.message||'')+'</div>'
      + '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:10px;font-size:12px">'
      + (phone?'<a href="https://wa.me/'+String(phone).replace(/\D/g,'')+'" target="_blank" rel="noopener" style="color:#10b981;font-weight:600">📞 WhatsApp '+escapeHtml(phone)+'</a>':'')
      + (r.buyerEmail?'<a href="mailto:'+escapeHtml(r.buyerEmail)+'" style="color:#1B3A6B;font-weight:600">✉️ '+escapeHtml(r.buyerEmail)+'</a>':'')
      + (r.id?'<span style="color:#9aa5b8;font-family:monospace">'+escapeHtml(r.id)+'</span>':'')
      + '</div>'
      + (window.RizqServiceDesk && typeof RizqServiceDesk.attachmentsHtml==='function' ? RizqServiceDesk.attachmentsHtml(r) : '')
      + '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">'
      + '<button type="button" onclick="_rizqSetServiceReqStatus(\''+escapeHtml(r.id)+'\',\'in_progress\')" style="padding:6px 10px;border:none;border-radius:8px;background:#fef3c7;color:#92400e;font-size:11.5px;font-weight:700;cursor:pointer">'+_t2('قيد المعالجة','En cours')+'</button>'
      + '<button type="button" onclick="_rizqSetServiceReqStatus(\''+escapeHtml(r.id)+'\',\'done\')" style="padding:6px 10px;border:none;border-radius:8px;background:#d1fae5;color:#065f46;font-size:11.5px;font-weight:700;cursor:pointer">'+_t2('منجز','Terminé')+'</button>'
      + '<button type="button" onclick="_rizqSetServiceReqStatus(\''+escapeHtml(r.id)+'\',\'rejected\')" style="padding:6px 10px;border:none;border-radius:8px;background:#fee2e2;color:#991b1b;font-size:11.5px;font-weight:700;cursor:pointer">'+_t2('رفض','Refuser')+'</button>'
      + '</div></div>';
  }).join('');
  if(window.RizqServiceDesk && typeof RizqServiceDesk.bindAttachmentButtons==='function'){
    RizqServiceDesk.bindAttachmentButtons(el, function(){ return window.REAL_ACCESS_TOKEN || SESSION_TOKEN; });
  }
}

function _rizqMergeServiceRequests(){
  try{
    if(IS_DEMO){
      window._rizqStoreServiceRequests = [
        {id:'SRQ-STORE-01',buyerName:'محمد ولد أحمد',buyerPhone:'22244115566',buyerWhatsapp:'22244115566',buyerEmail:'mohamed.demo@example.mr',service:'استفسار عن منتج',message:'هل يتوفر مقاس XL من الدراعة؟',templateName:'طلب خدمة — محل النجمة',status:'new',createdAt:new Date().toISOString()},
        {id:'SRQ-STORE-02',buyerName:'مريم بنت سالم',buyerPhone:'22233778899',buyerWhatsapp:'22233778899',buyerEmail:'',service:'طلب توصيل',message:'أرغب بالتوصيل لنواذيبو — الوثائق عبر واتساب',templateName:'طلب خدمة — محل النجمة',status:'in_progress',createdAt:new Date(Date.now()-864e5).toISOString()},
        {id:'SRQ-STORE-03',buyerName:'عبد الرحمن',buyerPhone:'22236554433',buyerWhatsapp:'22236554433',buyerEmail:'abdou.demo@example.mr',service:'حجز كمية',message:'أحتاج 10 عطور شرقية للجملة',templateName:'طلب خدمة — محل النجمة',status:'done',createdAt:new Date(Date.now()-2*864e5).toISOString()}
      ];
      if(typeof renderStoreServiceRequests==='function') renderStoreServiceRequests();
      return;
    }
    if(!SESSION_ID) return;
    var token = window.REAL_ACCESS_TOKEN || SESSION_TOKEN;
    if(window.RizqServiceDesk && token){
      RizqServiceDesk.listMine(SESSION_ID, token).then(function(list){
        window._rizqStoreServiceRequests = Array.isArray(list) ? list : [];
        if(typeof renderStoreServiceRequests==='function') renderStoreServiceRequests();
      });
      return;
    }
    try{
      var local = JSON.parse(localStorage.getItem('rizq_service_requests_local')||'[]');
      window._rizqStoreServiceRequests = local.filter(function(r){ return r && r.accountId === SESSION_ID; });
    }catch(e2){ window._rizqStoreServiceRequests = []; }
    if(typeof renderStoreServiceRequests==='function') renderStoreServiceRequests();
  }catch(e){}
}

function _rizqSetServiceReqStatus(id, status){
  if(!id || !status) return;
  if(IS_DEMO){
    var list = Array.isArray(window._rizqStoreServiceRequests) ? window._rizqStoreServiceRequests : [];
    window._rizqStoreServiceRequests = list.map(function(r){ if(r && r.id===id) r.status = status; return r; });
    if(typeof renderStoreServiceRequests==='function') renderStoreServiceRequests();
    showToast(_t2('تم تحديث حالة الطلب','Statut mis à jour'), 'success');
    return;
  }
  var token = window.REAL_ACCESS_TOKEN || SESSION_TOKEN;
  if(window.RizqServiceDesk && token){
    RizqServiceDesk.setStatus(id, status, token).then(function(){
      _rizqMergeServiceRequests();
      showToast(_t2('تم تحديث حالة الطلب','Statut mis à jour'), 'success');
    }).catch(function(){
      showToast(_t2('تعذّر تحديث الحالة','Échec de la mise à jour'), 'error');
    });
    return;
  }
  try{
    var key = 'rizq_service_requests_local';
    var localList = JSON.parse(localStorage.getItem(key)||'[]');
    localList = localList.map(function(r){ if(r && r.id===id) r.status = status; return r; });
    localStorage.setItem(key, JSON.stringify(localList));
    _rizqMergeServiceRequests();
  }catch(e){}
}

function loadStoreServiceDeskForm(){
  var desk = { enabled: true, formTitle: '', formHint: '', docsChannel: 'whatsapp' };
  var deskKey = SESSION_ID || (STORE && STORE.id) || 'demo';
  try{
    var saved = JSON.parse(localStorage.getItem('rizq_service_desk_'+deskKey)||'null');
    if(saved) desk = Object.assign(desk, saved);
  }catch(e){}
  if(STORE && STORE.serviceDesk) desk = Object.assign(desk, STORE.serviceDesk);
  var t = document.getElementById('desk-form-title');
  var h = document.getElementById('desk-form-hint');
  var c = document.getElementById('desk-docs-channel');
  var en = document.getElementById('desk-enabled');
  if(t) t.value = desk.formTitle || '';
  if(h) h.value = desk.formHint || '';
  if(c) c.value = desk.docsChannel || 'whatsapp';
  if(en) en.checked = desk.enabled !== false;
}

function saveStoreServiceDesk(){
  var desk = {
    enabled: !!(document.getElementById('desk-enabled') && document.getElementById('desk-enabled').checked),
    formTitle: ((document.getElementById('desk-form-title')||{}).value||'').trim(),
    formHint: ((document.getElementById('desk-form-hint')||{}).value||'').trim(),
    docsChannel: ((document.getElementById('desk-docs-channel')||{}).value||'whatsapp')
  };
  var deskId = SESSION_ID || (STORE && STORE.id) || 'demo';
  var token = window.REAL_ACCESS_TOKEN || SESSION_TOKEN;
  var done = function(out){
    if(STORE) STORE.serviceDesk = out || desk;
    try{
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
      var idx = accs.findIndex(function(a){ return a && a.id === deskId; });
      if(idx >= 0){
        accs[idx].serviceDesk = out || desk;
        localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs));
      }
    }catch(e){}
    showToast(_t2('✅ تم حفظ هوية غرفة الطلبات','✅ Identité du bureau de demandes enregistrée'), 'success');
  };
  if(window.RizqServiceDesk){
    RizqServiceDesk.saveDeskSettings(deskId, token, desk).then(done).catch(function(){ done(desk); });
  } else {
    try{ localStorage.setItem('rizq_service_desk_'+deskId, JSON.stringify(desk)); }catch(e){}
    done(desk);
  }
}

// ══ MESSAGES ══
function renderMessages(){
  if(IS_DEMO){
    const msgs = [...DEMO_MESSAGES];
    msgs.forEach(m=>m.read=true);
    document.getElementById('msg-badge').style.display='none';
    const el = document.getElementById('messages-list');
    if(!el) return;
    if(!msgs.length){
      el.innerHTML='<div style="text-align:center;padding:48px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">💬</div><p>'+_t2('لا توجد رسائل بعد','Aucun message pour le moment')+'</p></div>';
      return;
    }
    el.innerHTML = msgs.reverse().map(m=>`
      <div class="msg-item">
        <div class="msg-avatar">${m.name?m.name[0].toUpperCase():_t2('ز','C')}</div>
        <div class="msg-body">
          <div class="msg-name">${escapeHtml(m.name||_t2('زبون','Client'))}</div>
          <div class="msg-text">${escapeHtml(m.text||'')}</div>
          ${m.phone?`<div style="margin-top:6px"><a href="https://wa.me/${m.phone.replace(/\D/g,'')}" target="_blank" style="font-size:12px;color:#10b981;font-weight:600">📞 ${_t2('واتساب','WhatsApp')} ${escapeHtml(m.phone)}</a></div>`:''}
          <div class="msg-time">${m.time||''}</div>
        </div>
      </div>`).join('');
    return;
  }
  // ── إصلاح جوهري 29/07/2026: كان هذا الصندوق localStorage فقط ولا يوجد
  // أصلاً أي زر "راسل البائع" حقيقي يكتب إليه — أي رسائل حقيقية لم تكن
  // تصل هنا إطلاقاً. الآن يجلب المحادثات الحقيقية من /api/messages/threads
  // (تُنشَأ عبر زر "راسل البائع" في rizq_listing.html) مع إمكانية الرد.
  const el = document.getElementById('messages-list');
  if(!el) return;
  el.innerHTML='<div style="text-align:center;padding:32px;color:var(--text-muted)">'+_t2('جارٍ التحميل...','Chargement...')+'</div>';
  if(typeof window.RIZQ_BACKEND_BASE !== 'string' || !window.RIZQ_BACKEND_BASE || !SESSION_TOKEN){
    el.innerHTML='<div style="text-align:center;padding:48px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">💬</div><p>'+_t2('لا توجد رسائل بعد','Aucun message pour le moment')+'</p></div>';
    return;
  }
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '')+'/api/messages/threads?accountId='+encodeURIComponent(SESSION_ID), {
    headers: { 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) }
  }).then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      var threads = (data && Array.isArray(data.threads)) ? data.threads : [];
      var totalUnread = threads.reduce(function(s,t){ return s+(t.unreadCount||0); },0);
      var badge = document.getElementById('msg-badge');
      if(badge){ if(totalUnread>0){ badge.textContent=totalUnread; badge.style.display='inline-flex'; } else badge.style.display='none'; }
      if(!threads.length){
        el.innerHTML='<div style="text-align:center;padding:48px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">💬</div><p>'+_t2('لا توجد رسائل بعد','Aucun message pour le moment')+'</p></div>';
        return;
      }
      el.innerHTML = threads.map(function(t){
        var name = t.buyerName || _t2('زبون','Client');
        var last = t.lastMessage || {};
        var timeStr = last.createdAt ? new Date(last.createdAt).toLocaleString(_storeLang==='fr'?'fr-FR':'ar-MR-u-nu-latn') : '';
        var tk = escapeHtml(t.threadKey);
        return '<div class="msg-item">'
          + '<div class="msg-avatar">'+(name?escapeHtml(name[0].toUpperCase()):_t2('ز','C'))+'</div>'
          + '<div class="msg-body" style="flex:1">'
          +   '<div class="msg-name">'+escapeHtml(name)+(t.adTitle?(' · <span style="font-weight:400;color:var(--text-muted)">'+escapeHtml(t.adTitle)+'</span>'):'')+(t.unreadCount>0?' <span style="background:#dc2626;color:#fff;border-radius:8px;padding:1px 7px;font-size:10px">'+t.unreadCount+'</span>':'')+'</div>'
          +   '<div class="msg-text">'+(last.fromRole==='agent'?'🤖 ':'')+escapeHtml(last.body||'')+'</div>'
          +   (t.buyerPhone?('<div style="margin-top:6px"><a href="https://wa.me/'+t.buyerPhone.replace(/\D/g,'')+'" target="_blank" style="font-size:12px;color:#10b981;font-weight:600">📞 '+_t2('واتساب','WhatsApp')+' '+escapeHtml(t.buyerPhone)+'</a></div>'):'')
          +   '<div class="msg-time">'+timeStr+'</div>'
          +   '<div style="display:flex;gap:6px;margin-top:8px">'
          +     '<input type="text" id="reply-in-'+tk+'" placeholder="'+_t2('اكتب رداً…','Écrire une réponse…')+'" style="flex:1;padding:7px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:12.5px;font-family:inherit">'
          +     '<button onclick="_rizqSendThreadReply(\''+tk+'\')" style="padding:7px 14px;background:#1B3A6B;color:#fff;border:none;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer">'+_t2('إرسال','Envoyer')+'</button>'
          +   '</div>'
          + '</div></div>';
      }).join('');
      // نعلّم كل المحادثات المعروضة كمقروءة (نفس السلوك السابق: فتح الصندوق = قراءة الكل)
      threads.forEach(function(t){
        if(t.unreadCount>0){
          fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '')+'/api/messages/thread/'+encodeURIComponent(t.threadKey)+'/read', {
            method:'PATCH', headers:{'x-account-token':(window.REAL_ACCESS_TOKEN || SESSION_TOKEN)}
          }).catch(function(){});
        }
      });
    }).catch(function(){
      el.innerHTML='<div style="text-align:center;padding:48px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">💬</div><p>'+_t2('لا توجد رسائل بعد','Aucun message pour le moment')+'</p></div>';
    });
}

function _rizqSendThreadReply(threadKey){
  var input = document.getElementById('reply-in-'+threadKey);
  if(!input) return;
  var body = input.value.trim();
  if(!body) return;
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '')+'/api/messages/reply', {
    method:'POST', headers:{'Content-Type':'application/json','x-account-token':(window.REAL_ACCESS_TOKEN || SESSION_TOKEN)},
    body: JSON.stringify({ sellerAccountId: SESSION_ID, threadKey: threadKey, body: body })
  }).then(function(r){ return r.ok ? r.json() : Promise.reject(); })
    .then(function(){ showToast(_t2('✅ تم إرسال الرد','✅ Réponse envoyée')); renderMessages(); })
    .catch(function(){ showToast(_t2('تعذّر إرسال الرد — حاول مرة أخرى','Échec de l\'envoi — réessayez'),'error'); });
}

// ══ SUBSCRIPTION BADGE ══
function updateSubBadge(){
  if(!STORE) return;
  const info = getSubInfo();
  const daysLeft = info.daysLeft;
  const dot = document.getElementById('sb-sub-dot');
  const txt = document.getElementById('sb-sub-text');
  if(info.isExpired || daysLeft===0){ if(dot)dot.className='sub-dot exp'; if(txt)txt.textContent=_t2('انتهى الاشتراك','Abonnement expiré'); }
  else if(daysLeft<=2){ if(dot)dot.className='sub-dot warn'; if(txt)txt.textContent=_t2(`ينتهي خلال ${daysLeft} يوم`,`Expire dans ${daysLeft} jour(s)`); }
  else { if(dot)dot.className='sub-dot'; if(txt)txt.textContent=_t2('اشتراك نشط','Abonnement actif'); }
}

// ══ SETTINGS — تغيير كلمة المرور عبر الخادم ══
function changePassword(){
  const cur = (document.getElementById('s-pw-old')||{}).value||'';
  const pw = document.getElementById('s-pw-new').value;
  const c2 = document.getElementById('s-pw-confirm').value;
  if(!cur||!pw||!c2){showToast(_t2('عبّئ جميع الحقول','Remplissez tous les champs'),'error');return;}
  if(pw.length<8){showToast(_t2('كلمة المرور يجب أن تكون 8 أحرف+','Le mot de passe doit contenir 8 caractères ou plus'),'error');return;}
  if(pw!==c2){showToast(_t2('كلمة المرور غير متطابقة','Les mots de passe ne correspondent pas'),'error');return;}
  if(typeof IS_DEMO!=='undefined' && IS_DEMO){showToast(_t2('👁 وضع تجريبي','👁 Mode démo'));return;}
  var tok = window.REAL_ACCESS_TOKEN || SESSION_TOKEN;
  if(!SESSION_ID || !tok || !window.RizqAccount || typeof window.RizqAccount.changePasswordAsync !== 'function'){
    showToast(_t2('⚠️ متاح فقط لحساب حقيقي متصل بالخادم','⚠️ Compte réel requis'),'error');
    return;
  }
  window.RizqAccount.changePasswordAsync(SESSION_ID, tok, cur, pw).then(function(res){
    if(res && res.ok){
      document.getElementById('s-pw-old').value='';
      document.getElementById('s-pw-new').value='';
      document.getElementById('s-pw-confirm').value='';
      showToast(_t2('✅ تم تحديث كلمة المرور','✅ Mot de passe mis à jour'),'success');
      return;
    }
    var msg = (res && res.error) || _t2('تعذّر التحديث','Échec');
    if(res && res.code === 'invalid_current') msg = _t2('كلمة المرور الحالية غير صحيحة','Mot de passe actuel incorrect');
    showToast('⚠️ '+msg,'error');
  }).catch(function(){ showToast(_t2('⚠️ تعذّر الاتصال','⚠️ Connexion impossible'),'error'); });
}

// إصلاح جوهري (09/08/2026): كانت تعرض توست نجاح فوراً بلا أي إرسال حقيقي
// للخادم — لا يوجد أي طابور إدارة يرى الطلب رغم رسالتها الصريحة "ستراجعه
// الإدارة". الآن تُرسِل فعلياً عبر POST /api/deactivation-requests (خادم
// حقيقي جديد، راجع server.js) بالتوكن الحقيقي، ويظهر الطلب في لوحة الأدمن
// تحت "المستخدمون" — التعطيل الفعلي لا يحدث إلا بعد موافقة الأدمن.
function deactivateAccount(){
  if(!confirm(_t2('هل تريد تعطيل حسابك مؤقتاً؟','Voulez-vous désactiver temporairement votre compte ?'))) return;
  if(IS_DEMO){
    showToast(_t2('👁 وضع تجريبي — لا يُرسَل فعلياً','👁 Mode démo — non envoyé réellement'));
    return;
  }
  if(!window.RIZQ_BACKEND_BASE || !SESSION_ID){
    showToast(_t2('⚠️ متاح فقط لحساب حقيقي متصل بالخادم','⚠️ Disponible uniquement pour un compte réel connecté au serveur'),'error');
    return;
  }
  var btn = document.getElementById('deactivate-account-btn');
  var prevLabel = btn ? btn.textContent : '';
  if(btn){ if(btn.disabled) return; btn.disabled = true; btn.textContent = _t2('...جارٍ الإرسال','Envoi...'); }
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/deactivation-requests', {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) },
    body: JSON.stringify({ accountId: SESSION_ID })
  }).then(function(r){ return r.ok ? r.json() : Promise.reject(); })
    .then(function(data){
      showToast(data && data.alreadyPending
        ? _t2('⏳ لديك طلب تعطيل معلَّق بالفعل — قيد المراجعة','⏳ Vous avez déjà une demande de désactivation en attente — en cours d\'examen')
        : _t2('✅ تم إرسال طلب التعطيل — ستراجعه الإدارة','✅ Demande de désactivation envoyée — elle sera examinée par l\'administration'), 'success');
    }).catch(function(){
      showToast(_t2('⚠️ تعذّر إرسال الطلب — حاول مرة أخرى','⚠️ Échec de l\'envoi de la demande — réessayez'), 'error');
    }).finally(function(){
      if(btn){ btn.disabled = false; btn.textContent = prevLabel; }
    });
}

// ══ UTILS ══
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sb-overlay').classList.toggle('open');
}

function logout(){
  if(!confirm(_t2('هل تريد تسجيل الخروج؟','Voulez-vous vous déconnecter ?'))) return;
  if(window.RizqAccount && typeof window.RizqAccount.clearSession === 'function'){
    window.RizqAccount.clearSession();
  } else {
    try{ localStorage.removeItem('rizq_active_session'); }catch(e){}
  }
  window.location.href='rizq_landing_v8.html';
}


function _rizqSupportWhatsapp(){
  try{
    var cfg=JSON.parse(localStorage.getItem('rizq_site_config')||'{}');
    var w=String(cfg.whatsapp||cfg.phone||'').trim();
    if(w && !/X{2,}|XX\s*XX/i.test(w)) return w;
  }catch(e){}
  return '';
}
function _rizqTwilioForwardNum(){
  try{
    var ch=JSON.parse(localStorage.getItem('rizq_channels_config')||'{}');
    var n=String((ch.phone&&ch.phone.number)||ch.twilioNumber||'').trim();
    if(n && !/X{2,}|XX\s*XX/i.test(n)) return n;
  }catch(e){}
  return '';
}

// ══ AGENTS ══
function doUpgrade(){ showPanel('subscription', document.querySelector('.sb-item[onclick*=subscription]')); }
// ── وكيل كلود: زر التفعيل/الإيقاف ──────────────────────
var RIZQ_TWILIO_NUM = (typeof _rizqTwilioForwardNum==='function'?_rizqTwilioForwardNum():'');
var _agentToggleKey = 'rizq_agent_active_' + (STORE && STORE.phone ? STORE.phone : 'unknown');

function _getAgentActive(){
  try{ return localStorage.getItem(_agentToggleKey) !== 'false'; }catch(e){ return true; }
}

function _renderAgentToggle(){
  var active = _getAgentActive();
  var phone  = STORE && STORE.phone ? STORE.phone : '—';
  return '<div id="agent-toggle-card" style="margin-top:14px;background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:14px;padding:18px;color:#fff">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
      '<div>'+
        '<div style="font-size:14px;font-weight:700;color:#fbbf24">🤖 '+_t2('وكيل رزق الذكي','Agent intelligent Rizq')+'</div>'+
        '<div style="font-size:11.5px;color:#94a3b8;margin-top:3px">'+_t2('يرد على مكالماتك وواتساب بشخصيتك التجارية','Répond à vos appels et WhatsApp avec votre identité commerciale')+'</div>'+
      '</div>'+
      '<label class="rizq-toggle-switch" title="'+_t2('تفعيل/إيقاف الوكيل','Activer/Désactiver l\'agent')+'">'+
        '<input type="checkbox" id="agent-toggle-chk" '+(active?'checked':'')+' onchange="toggleRizqAgent(this.checked)">'+
        '<span class="rizq-toggle-slider"></span>'+
      '</label>'+
    '</div>'+
    '<div style="background:rgba(255,255,255,.07);border-radius:10px;padding:11px;font-size:11.5px;line-height:1.8">'+
      (RIZQ_TWILIO_NUM?('<div>📞 <strong>'+_t2('رقم تحويل المكالمات (Twilio رزق):','Numéro de renvoi d\'appel (Twilio Rizq):')+' </strong><code style="color:#fbbf24;font-size:12px">'+escapeHtml(RIZQ_TWILIO_NUM)+'</code></div>'):('<div style="color:#94a3b8">📞 '+_t2('رقم التحويل يُضبط من لوحة الإدارة عند التفعيل','Le numéro de renvoi est configuré depuis le panneau admin à l\'activation')+'</div>'))+
      '<div style="margin-top:6px;color:#94a3b8">'+
        _t2(
          'حوّل مكالماتك إلى هذا الرقم عند عدم الرد، وسيتولى الوكيل الذكي الاستقبال باسمك.',
          'Renvoyez vos appels vers ce numéro en cas de non-réponse, l\'agent IA répondra en votre nom.'
        )+
      '</div>'+
      '<div style="margin-top:6px">📱 '+_t2('رقمك المسجّل:','Votre numéro enregistré:')+' <strong style="color:#fbbf24">'+phone+'</strong></div>'+
    '</div>'+
    '<div id="agent-toggle-status" style="margin-top:10px;font-size:11px;text-align:center;color:'+(active?'#4ade80':'#f87171')+'">'+
      (active ? _t2('● الوكيل مفعّل — يرد على مكالماتك الآن','● Agent actif — répond à vos appels maintenant') :
                _t2('○ الوكيل موقوف — لن يرد على المكالمات','○ Agent désactivé — n\'accepte pas les appels'))+
    '</div>'+
    _renderChannelToggles()+
  '</div>'+
  '';
}

function _getChannelFlags(){
  var def = { widget_enabled:true, whatsapp_enabled:true, calls_enabled:true };
  try{
    var raw = localStorage.getItem('rizq_channel_flags_'+(SESSION_ID||''));
    if(raw) def = Object.assign(def, JSON.parse(raw));
  }catch(e){}
  if(typeof STORE!=='undefined' && STORE){
    if(STORE.widget_enabled!=null) def.widget_enabled=!!STORE.widget_enabled;
    if(STORE.whatsapp_enabled!=null) def.whatsapp_enabled=!!STORE.whatsapp_enabled;
    if(STORE.calls_enabled!=null) def.calls_enabled=!!STORE.calls_enabled;
  }
  return def;
}
function _renderChannelToggles(){
  var f = _getChannelFlags();
  function row(key, ar, fr){
    return '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:8px 10px;background:rgba(255,255,255,.06);border-radius:8px">'+
      '<span style="font-size:12px">'+_t2(ar,fr)+'</span>'+
      '<label class="rizq-toggle-switch"><input type="checkbox" '+(f[key]?'checked':'')+' onchange="toggleAccountChannel(\''+key+'\',this.checked)"><span class="rizq-toggle-slider"></span></label></div>';
  }
  return '<div style="margin-top:12px;font-size:11px;color:#94a3b8;font-weight:700">'+_t2('قنوات الربط','Canaux')+'</div>'+
    row('widget_enabled','ويدجت الموقع','Widget du site')+
    row('whatsapp_enabled','واتساب','WhatsApp')+
    row('calls_enabled','المكالمات','Appels');
}
function toggleAccountChannel(key, on){
  var flags = _getChannelFlags();
  flags[key] = !!on;
  try{ localStorage.setItem('rizq_channel_flags_'+(SESSION_ID||''), JSON.stringify(flags)); }catch(e){}
  if(typeof STORE!=='undefined' && STORE) STORE[key] = !!on;
  var base = (window.RIZQ_BACKEND_BASE||'').replace(/\/$/,'');
  if(!base || !SESSION_ID){
    showToast(_t2('✅ تم حفظ حالة القناة','✅ État du canal enregistré'));
    return;
  }
  var body = {};
  body[key] = !!on;
  fetch(base+'/api/accounts/mine/'+encodeURIComponent(SESSION_ID), {
    method:'PATCH',
    headers:{'Content-Type':'application/json','x-account-token': window.REAL_ACCESS_TOKEN||SESSION_TOKEN||''},
    body: JSON.stringify(body)
  }).then(function(r){ return r.json(); }).then(function(){
    showToast(_t2('✅ تم تحديث حالة الحساب','✅ Compte mis à jour'));
  }).catch(function(){
    showToast(_t2('✅ حُفظ محلياً','✅ Enregistré localement'));
  });
}

function toggleRizqAgent(active){
  var phone = STORE && STORE.phone ? STORE.phone : null;
  if(!phone){ showToast(_t2('⚠️ لا يوجد رقم هاتف مسجّل في ملفك','⚠️ Aucun numéro enregistré dans votre profil'),'warn'); return; }
  try{ localStorage.setItem(_agentToggleKey, active ? 'true' : 'false'); }catch(e){}
  // إصلاح: كان يقرأ window.RIZQ_BACKEND_URL غير المُعرَّف إطلاقاً في أي مكان
  // بالمشروع (يفشل بصمت دائماً)، وسرّاً ثابتاً بالكود بدل الإعداد الحقيقي.
  // الآن يستخدم نفس مصدر الحقيقة الوحيد (RizqSub.getAgentConfig) الذي يضبطه
  // محمد مرة واحدة من تبويب "وكيل الباقات" بلوحة الأدمن — نفس ما تستخدمه كل
  // نقاط اتصال الخادم الأخرى بالمشروع.
  var _cfg = (typeof RizqSub!=='undefined') ? RizqSub.getAgentConfig() : {};
  if(!_cfg.backendUrl){ showToast(_t2('⚠️ لم يُضبط رابط الخادم الخلفي بعد من لوحة الأدمن','⚠️ URL du serveur backend non configurée depuis l\'admin'),'warn'); return; }
  var BACKEND = _cfg.backendUrl.replace(/\/$/,'') + '/api/agent/toggle';
  fetch(BACKEND, {
    method:'POST',
    headers:{'Content-Type':'application/json','x-account-token':window.REAL_ACCESS_TOKEN||''},
    body:JSON.stringify({ subscriberPhone: phone, active: active, accountId: SESSION_ID })
  }).then(function(r){ return r.json(); }).then(function(d){
    var statusEl = document.getElementById('agent-toggle-status');
    if(statusEl){
      statusEl.style.color = active ? '#4ade80' : '#f87171';
      statusEl.textContent = active
        ? _t2('● الوكيل مفعّل — يرد على مكالماتك الآن','● Agent actif — répond à vos appels maintenant')
        : _t2('○ الوكيل موقوف — لن يرد على المكالمات','○ Agent désactivé — n\'accepte pas les appels');
    }
    showToast(active
      ? _t2('✅ الوكيل الذكي مفعّل','✅ Agent IA activé')
      : _t2('⏹️ الوكيل الذكي موقوف','⏹️ Agent IA désactivé')
    );
  }).catch(function(){
    // Backend غير متاح — حالة مؤقتة محلية فقط
    var statusEl = document.getElementById('agent-toggle-status');
    if(statusEl){
      statusEl.style.color = active ? '#4ade80' : '#f87171';
      statusEl.textContent = active
        ? _t2('● مفعّل محلياً (سيُزامَن عند الاتصال بالخادم)','● Activé localement (synchronisé lors de la connexion)')
        : _t2('○ موقوف محلياً','○ Désactivé localement');
    }
  });
}

function renderAgents(){
  var prods = IS_DEMO ? DEMO_PRODUCTS : JSON.parse(localStorage.getItem('store_products_'+SESSION_ID)||'[]');
  var approved = prods.filter(function(p){ return p.status!=='pending_review'; }).length;
  var pending  = prods.filter(function(p){ return p.status==='pending_review'; }).length;
  var el1=document.getElementById('mod-approved'); if(el1) el1.textContent=approved;
  var el2=document.getElementById('mod-pending');  if(el2) el2.textContent=pending;

  // Diamond check
  var isDiamond = (typeof RizqSub !== 'undefined' && STORE && STORE.id && RizqSub.hasFeature(STORE.id, 'ai_agent_full'))
    || (STORE && (STORE.plan==='diamond'||STORE.diamond||(STORE.planName&&STORE.planName.includes('ماس'))||/ماس|diamond/i.test(STORE.package||STORE.plan||'')));
  var badge  = document.getElementById('auto-reply-badge');
  var content= document.getElementById('auto-reply-content');
  if(!badge||!content) return;
  if(isDiamond){
    badge.textContent=_t2('✅ مفعّل','✅ Activé');
    badge.style.cssText='background:#d1fae5;color:#065f46;font-size:11px;font-weight:700;padding:4px 12px;border-radius:10px';
    content.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">'+
      '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px">'+
        '<div style="font-size:18px;margin-bottom:6px">📞</div>'+
        '<div style="font-size:13px;font-weight:700;color:#16a34a">'+_t2('رد آلي على المكالمات','Réponse automatique aux appels')+'</div>'+
        '<div style="font-size:12px;color:#2C3A4F;margin-top:4px">'+_t2('يرد على المكالمات الغائبة برسالة واتسآب تلقائياً','Répond automatiquement aux appels manqués par un message WhatsApp')+'</div>'+
      '</div>'+
      '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px">'+
        '<div style="font-size:18px;margin-bottom:6px">📧</div>'+
        '<div style="font-size:13px;font-weight:700;color:#1d4ed8">'+_t2('رد ذكي على البريد','Réponse intelligente aux e-mails')+'</div>'+
        '<div style="font-size:12px;color:#2C3A4F;margin-top:4px">'+_t2('يرد على استفسارات البريد خلال دقائق','Répond aux demandes par e-mail en quelques minutes')+'</div>'+
      '</div></div>'+
      '<div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:12px;font-size:12px;color:#7c3aed">'+_t2('💡 هذه الميزة حصرية للباقة الماسية — تضمن عدم تفويت أي فرصة تجارية','💡 Fonctionnalité exclusive au forfait Diamant — garantit de ne manquer aucune opportunité commerciale')+'</div>'+
      '<div id="agent-knowledge-upload"></div>'+
      '<div id="agent-chat-test"></div>'+
      _renderAgentToggle();
    if(typeof RizqDashboardAgentKnowledge!=='undefined'){
      RizqDashboardAgentKnowledge.renderKnowledgePanel({ mountId:'agent-knowledge-upload', accountId: SESSION_ID || '' });
    }
    if(typeof RizqDashboardAgentChat!=='undefined'){
      RizqDashboardAgentChat.renderAgentChatPanel({ mountId:'agent-chat-test', accountId: SESSION_ID || '' });
    }
  } else {
    badge.textContent=_t2('🔒 ماسية فقط','🔒 Diamant uniquement');
    badge.style.cssText='background:#f3f4f6;color:#6b7280;font-size:11px;font-weight:700;padding:4px 12px;border-radius:10px';
    content.innerHTML='<div style="text-align:center;padding:28px"><div style="font-size:40px;margin-bottom:12px">🔒</div>'+
      '<p style="font-size:13.5px;font-weight:700;color:var(--navy);margin-bottom:6px">'+_t2('ميزة حصرية للباقة الماسية','Fonctionnalité exclusive au forfait Diamant')+'</p>'+
      '<p style="font-size:12.5px;color:var(--text-muted);max-width:300px;margin:0 auto 16px">'+_t2('اشترك في باقة ماسية لتفعيل الرد التلقائي على المكالمات والبريد الإلكتروني','Abonnez-vous au forfait Diamant pour activer la réponse automatique aux appels et e-mails')+'</p>'+
      '<button onclick="doUpgrade()" class="btn btn-gold">'+_t2('📦 الترقية للماسية','📦 Passer au forfait Diamant')+'</button></div>';
  }
}

// ══ ترجمات AR / FR — لوحة المحل ═════════════
var _storeLang = (function(){ try{ return localStorage.getItem('rizq_lang')||'ar'; }catch(e){ return 'ar'; } })();
// _storeTranslations أُزيل 06/08/2026 — القاموس الآن مركزي في rizq_i18n_data.js["dashboard_store"]

function _t2(ar, fr){
  if(typeof RizqI18n !== 'undefined') return RizqI18n.t2(ar, fr);
  return (_storeLang === 'fr') ? fr : ar;
}
document.addEventListener('rizq:langchange', function(e){
  _storeLang = (e && e.detail && e.detail.lang) || _storeLang;
});

function _applyStoreLang(lang, silent){
  _storeLang = lang;
  var isAr = lang === 'ar';
  // ── وُحِّد هذا القسم على محرك RizqI18n المركزي في 06/08/2026 — كان هنا
  // قاموس ترجمة محلي مكرَّر (_storeTranslations) يكرر نفس البيانات الموجودة
  // في rizq_i18n_data.js، وهو مصدر الأخطاء المتكررة (حقل يُنسى في أحدهما).
  // الآن: RizqI18n.apply() يضبط lang/dir ويترجم كل [data-t]/[data-ph] من
  // القاموس المركزي namespace="dashboard_store" تلقائياً في نفس الاستدعاء.
  if(typeof RizqI18n !== 'undefined') RizqI18n.apply(lang);
  else { try{ localStorage.setItem('rizq_lang', lang); }catch(e){} document.documentElement.lang = lang; document.documentElement.dir = isAr ? 'rtl' : 'ltr'; }
  // update lang button — FR|AR أصفر/أبيض حسب اللغة الحالية
  document.querySelectorAll('.btn-lang-store, .rizq-lang-btn, .btn-lang').forEach(function(btn){
    if (window.RizqI18n && typeof window.RizqI18n.paintPrimaryLangBtn === 'function') {
      window.RizqI18n.paintPrimaryLangBtn(btn, isAr ? 'ar' : 'fr');
      return;
    }
    btn.classList.add('btn-lang','btn-lang-primary');
    btn.setAttribute('dir','ltr');
    btn.innerHTML='<span class="lang-fr" dir="ltr">FR</span><span class="lang-sep" aria-hidden="true"> | </span><span class="lang-ar" dir="ltr">AR</span>';
    btn.setAttribute('data-active-lang', isAr ? 'ar' : 'fr');
    var frEl=btn.querySelector('.lang-fr'), arEl=btn.querySelector('.lang-ar');
    if(frEl) frEl.style.color = isAr ? '#ffffff' : '#C9A84C';
    if(arEl) arEl.style.color = isAr ? '#C9A84C' : '#ffffff';
  });
  // re-apply topbar title for current panel (not a data-t element — set dynamically by showPanel)
  var activePanel = document.querySelector('.panel.active');
  if(activePanel){
    var pid = activePanel.id.replace('panel-','');
    var title = document.getElementById('topbar-title');
    if(title){
      var titleMap = isAr ? TITLES : TITLES_FR;
      title.textContent = titleMap[pid] || title.textContent;
    }
  }
  if(!silent && typeof showToast === 'function'){
    showToast(isAr ? 'تم التبديل إلى العربية 🇲🇷' : 'Langue changée en Français 🇫🇷', 'info');
  }
  try{ if(typeof renderOverview==='function') renderOverview(); }catch(e){}
  try{ if(typeof renderServicesShowcase==='function') renderServicesShowcase(); }catch(e){}
  try{ if(typeof renderProducts==='function') renderProducts(); }catch(e){}
  try{ if(typeof renderHoursTable==='function') renderHoursTable(); }catch(e){}
  try{ if(typeof renderPhotos==='function') renderPhotos(); }catch(e){}
  try{ if(typeof renderSubscriptionPanel==='function') renderSubscriptionPanel(); }catch(e){}
  try{ if(typeof renderPackagesDisplay==='function') renderPackagesDisplay(); }catch(e){}
  try{ if(typeof renderVideoPackagesDisplay==='function') renderVideoPackagesDisplay(); }catch(e){}
  try{ if(typeof renderMessages==='function') renderMessages(); }catch(e){}
  try{ if(typeof renderAgents==='function') renderAgents(); }catch(e){}
  try{ if(typeof renderMyPayments==='function') renderMyPayments(); }catch(e){}
  try{ if(typeof updateSubBadge==='function') updateSubBadge(); }catch(e){}
  try{ if(typeof renderRizqPayment==='function' && document.getElementById('bank-payment-widget')) renderRizqPayment('bank-payment-widget'); }catch(e){}
  try{ if(typeof renderRizqPayment==='function' && document.getElementById('rzq-pay-section')) renderRizqPayment('rzq-pay-section'); }catch(e){}
}

function toggleLangStore(){
  _applyStoreLang(_storeLang === 'ar' ? 'fr' : 'ar');
}
if (_storeLang === 'fr') {
  setTimeout(function(){ _applyStoreLang('fr', true); }, 0);
}

// ══ START ══
// ── مزامنة طرق الدفع + كتالوجات الأسعار من الخادم — الأدمن قد يعدّلها من
// جهازه الخاص؛ بدون هذا، يبقى هذا الجهاز يعرض فقط ما كان محفوظاً محلياً
// (غالباً فارغاً/قديماً)، فتظهر "لا توجد طرق دفع" أو أسعار قديمة.
(function syncSharedConfigOnLoad(){
  if(!window.RIZQ_BACKEND_BASE) return;
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/site-config')
    .then(function(res){ return res.ok ? res.json() : null; })
    .then(function(data){
      if(!data || !data.ok || !data.config) return;
      if(Array.isArray(data.config.bankCodes)){
        localStorage.setItem('rizq_bank_codes', JSON.stringify(data.config.bankCodes));
        if(typeof RizqAccountPayments !== 'undefined') RizqAccountPayments.afterPlatformBankCodesSynced();
      }
      // أرقام التحويل الكاملة — لصاحب الحساب فقط
      (function _loadPayMethodsFull(){
        var accId = (typeof SESSION_ID!=='undefined' && SESSION_ID) || (window.USER_ACC&&USER_ACC.id) || (window.CORP_ACC&&CORP_ACC.id) || (window.STORE&&STORE.id) || (window.OFFICE&&OFFICE.id) || '';
        var tok = window.REAL_ACCESS_TOKEN || '';
        if(!accId || !tok || !window.RIZQ_BACKEND_BASE) return;
        fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/pay-methods?accountId=' + encodeURIComponent(accId), {
          headers: { 'x-account-token': tok }
        }).then(function(r){ return r.ok ? r.json() : null; }).then(function(pm){
          if(pm && pm.ok && Array.isArray(pm.methods)){
            localStorage.setItem('rizq_bank_codes', JSON.stringify(pm.methods));
            if(typeof RizqAccountPayments !== 'undefined') RizqAccountPayments.afterPlatformBankCodesSynced();
          }
        }).catch(function(){});
      })();
      if(data.config.packages && typeof data.config.packages==='object'){
        if(Array.isArray(data.config.packages.store))   localStorage.setItem('rizq_store_packages', JSON.stringify(data.config.packages.store));
        if(Array.isArray(data.config.packages.video))   localStorage.setItem('rizq_video_packages', JSON.stringify(data.config.packages.video));
        if(Array.isArray(data.config.packages.general)) localStorage.setItem('rizq_packages', JSON.stringify(data.config.packages.general));
        if(Array.isArray(data.config.packages.tender))  localStorage.setItem('rizq_tender_packages', JSON.stringify(data.config.packages.tender));
        if(Array.isArray(data.config.packages.investment)) localStorage.setItem('rizq_investment_packages', JSON.stringify(data.config.packages.investment));
        if(Array.isArray(data.config.packages.verified_plus)) localStorage.setItem('rizq_verified_plus_packages', JSON.stringify(data.config.packages.verified_plus));
      }
      if(typeof RizqPackagesConfig!=='undefined' && typeof RizqPackagesConfig.ensureCatalogStorageFresh==='function'){
        try{ RizqPackagesConfig.ensureCatalogStorageFresh(true); }catch(e){}
      }
      if(typeof renderPackagesDisplay==='function') renderPackagesDisplay();
      if(typeof renderVideoPackagesDisplay==='function') renderVideoPackagesDisplay();
      if(typeof renderTenderSubStatus==='function') renderTenderSubStatus();
    }).catch(function(){});
})();
init();

;


// ══ Share & QR ══
var _qrDone = false;
function openShareModal(){
  document.getElementById('share-modal').classList.add('open');
  if(!_qrDone && window.QRCode){
    var c = document.getElementById('qr-container');
    if(c){ c.innerHTML='';
      var lnk = document.getElementById('share-link-input').value||location.href;
      try{ new QRCode(c,{text:lnk,width:140,height:140,colorDark:'#1B3A6B',colorLight:'#fff'}); }catch(e){}
      _qrDone=true;
    }
  }
}
function closeShareModal(e){
  if(!e||e.target===document.getElementById('share-modal'))
    document.getElementById('share-modal').classList.remove('open');
}
function copyShareLink(){
  var i=document.getElementById('share-link-input');
  if(!i)return;
  function _fallback(){
    try{ i.select(); document.execCommand('copy'); showToast(_t2('✅ تم نسخ الرابط','✅ Lien copié'),'success'); }
    catch(e){ /* لا خيار آخر — القيمة معروضة أصلاً في حقل قابل للتحديد */ }
  }
  if(navigator.clipboard && window.isSecureContext){
    // إصلاح: كان .then() بدون .catch()، والـ try/catch المتزامن لا يلتقط رفض
    // الوعد (شائع على file:// أو بدون HTTPS) فيفشل الزر بصمت تام.
    navigator.clipboard.writeText(i.value)
      .then(function(){ showToast(_t2('✅ تم نسخ الرابط','✅ Lien copié'),'success'); })
      .catch(_fallback);
  } else {
    _fallback();
  }
}
function shareWhatsAppLink(){
  var i=document.getElementById('share-link-input');
  var name = (typeof STORE!=='undefined'&&STORE&&STORE.name)||(typeof OFFICE_ACC!=='undefined'&&OFFICE_ACC&&OFFICE_ACC.name)||_t2('صفحتنا','notre page');
  window.open('https://wa.me/?text='+encodeURIComponent(_t2('تفضّل بزيارة '+name+' على منصة رزق:\n','Découvrez '+name+' sur la plateforme Rizq :\n')+(i&&i.value||location.href)),'_blank');
}
function printQRCode(){
  var qr=document.getElementById('qr-container');
  if(!qr)return;
  var img=qr.querySelector('img')||qr.querySelector('canvas');
  if(!img){showToast(_t2('انتظر تحميل QR','Attendez le chargement du QR'),'error');return;}
  var src=img.src||(img.toDataURL&&img.toDataURL());
  var name=(typeof STORE!=='undefined'&&STORE&&STORE.name)||(typeof OFFICE_ACC!=='undefined'&&OFFICE_ACC&&OFFICE_ACC.name)||_t2('صفحتنا','notre page');
  var w=window.open('','_blank');
  var isFr=_storeLang==='fr';
  var qrTitle=_t2('داشبورد المحل','Tableau de bord boutique');
  var qrScan=_t2('امسح QR لزيارة الصفحة','Scannez le QR pour visiter la page');
  var qrBrand=_t2('منصة رزق · rizq.mr','Plateforme Rizq · rizq.mr');
w.document.write('<html dir="'+(isFr?'ltr':'rtl')+'" lang="'+(isFr?'fr':'ar')+'"><head><title>'+qrTitle+' · v1781382349</title></head><body><!-- RIZQ-BUILD:202606131951 --><h2>'+name+'</h2><img src="'+src+'" width="200" height="200"><p>'+qrScan+'</p><p style="color:#C9A84C;font-weight:700">'+qrBrand+'</p></body></html>');
  w.print();
}


;

// ══ PAYMENT MODAL ══
var _payPkg = null;
var _payFile = null;

function openPayModal(pkgName, pkgPrice, category){
  _payPkg = {name: pkgName, price: pkgPrice, category: category || 'package'};
  _payFile = null;
  document.getElementById('pay-pkg-name').textContent = pkgName;
  document.getElementById('pay-amount').textContent = pkgPrice > 0 ? Number(pkgPrice).toLocaleString() + ' MRU' : _t2('مجاناً','Gratuit');
  document.getElementById('pay-receipt-name').style.display = 'none';
  document.getElementById('pay-receipt-file').value = '';
  var vidWrap = document.getElementById('pay-video-url-wrap');
  if(vidWrap){ vidWrap.style.display = (_payPkg.category === 'video') ? 'block' : 'none'; document.getElementById('pay-video-url').value=''; }

  // Load payment methods, grouped by type (bank transfer / mobile number / payment code)
  var codes = [];
  try { codes = JSON.parse(localStorage.getItem('rizq_bank_codes')||'[]').filter(function(b){return b.active !== false;}); } catch(e){}
  var groups = {bank:[], mobile:[], code:[]};
  codes.forEach(function(b){ var t = (b.type && groups[b.type]) ? b.type : 'bank'; groups[t].push(b); });
  var PM_META = {
    bank:   {icon:'🏦', label:_t2('تحويل بنكي','Virement bancaire')},
    mobile: {icon:'📱', label:_t2('رقم الهاتف','Numéro de téléphone')},
    code:   {icon:'🔑', label:_t2('رمز دفع','Code de paiement')}
  };
  var el = document.getElementById('pay-banks');
  var types = ['bank','mobile','code'].filter(function(t){ return groups[t].length; });
  if(!types.length){
    el.innerHTML = '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px;font-size:12.5px;color:#92400e;text-align:center">⚠️ '+_t2('لا توجد طرق دفع متاحة حالياً — تواصل مع الدعم','Aucun moyen de paiement disponible — contactez le support')+'</div>';
  } else {
    var tabsHtml = '', panelsHtml = '';
    types.forEach(function(t,i){
      var m = PM_META[t];
      var on = i===0;
      tabsHtml += '<button class="pm-tab" data-pmtab="'+t+'" onclick="switchPayTab(this,\''+t+'\')" style="flex:1;padding:9px 4px;border:1.5px solid '+(on?'#1B3A6B':'#e0e8ff')+';background:'+(on?'#1B3A6B':'#fff')+';color:'+(on?'#fff':'#1B3A6B')+';border-radius:10px;cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;transition:all .2s;line-height:1.5">'+m.icon+'<br>'+m.label+'</button>';
      panelsHtml += '<div class="pm-panel" data-pmpanel="'+t+'" style="display:'+(on?'block':'none')+'">' +
        groups[t].map(function(b){
          return '<div style="background:#f8f9ff;border:1.5px solid #e0e8ff;border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">' +
            '<div><div style="font-size:13px;font-weight:700;color:#1B3A6B">' + escapeHtml(b.bank) + '</div>' +
            (b.instruction ? '<div style="font-size:11px;color:#777;margin-top:2px">' + escapeHtml(b.instruction) + '</div>' : '') + '</div>' +
            '<div style="display:flex;align-items:center;gap:8px">' +
            '<span style="font-family:monospace;font-size:14px;font-weight:700;color:#0f2347;background:#e0e8ff;padding:5px 10px;border-radius:7px;letter-spacing:.5px;direction:ltr">' + escapeHtml(b.code) + '</span>' +
            '<button onclick="payModalCopy(this,\'' + String(b.code).replace(/'/g,"&#39;") + '\',\'' + String(b.bank).replace(/'/g,"&#39;") + '\',document.getElementById(\'pay-amount\').textContent)" style="background:linear-gradient(135deg,#C9A84C,#e8c96a);border:none;padding:6px 12px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700;color:#0f2347;white-space:nowrap">📋 '+_t2('نسخ','Copier')+'</button>' +
            '</div></div>';
        }).join('') +
      '</div>';
    });
    el.innerHTML = '<div style="display:flex;gap:8px;margin-bottom:12px">' + tabsHtml + '</div>' + panelsHtml;
  }

  var m = document.getElementById('pay-modal');
  if(typeof RizqSub !== 'undefined' && typeof RizqSub.configurePayModalFreeMode === 'function'){
    RizqSub.configurePayModalFreeMode(pkgPrice, (typeof _storeLang !== 'undefined' ? _storeLang : 'ar'));
  }
  m.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}


function switchPayTab(btn, type){
  var modal = btn.closest('#pay-modal') || document.getElementById('pay-modal');
  var tabs = modal.querySelectorAll('.pm-tab');
  var panels = modal.querySelectorAll('.pm-panel');
  tabs.forEach(function(t){
    var on = t.getAttribute('data-pmtab') === type;
    t.style.background = on ? '#1B3A6B' : '#fff';
    t.style.color = on ? '#fff' : '#1B3A6B';
    t.style.borderColor = on ? '#1B3A6B' : '#e0e8ff';
  });
  panels.forEach(function(p){
    p.style.display = (p.getAttribute('data-pmpanel') === type) ? 'block' : 'none';
  });
}

function payModalCopy(btn, code, bankName, amount){
  var parts = [];
  if(bankName) parts.push(_t2('البنك: ','Banque : ') + bankName);
  parts.push(_t2('الرمز: ','Code : ') + code);
  if(amount) parts.push(_t2('المبلغ: ','Montant : ') + amount);
  var copyText = parts.join(' | ');
  navigator.clipboard.writeText(copyText).then(function(){
    var o = btn.innerHTML;
    btn.innerHTML = _t2('✅ تم النسخ','✅ Copié');
    btn.style.background = 'linear-gradient(135deg,#059669,#10b981)';
    btn.style.color = '#fff';
    setTimeout(function(){ btn.innerHTML=o; btn.style.background='linear-gradient(135deg,#C9A84C,#e8c96a)'; btn.style.color='#0f2347'; }, 2000);
  }).catch(function(){
    var ta=document.createElement('textarea'); ta.value=copyText||code; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    btn.innerHTML='✅'; setTimeout(function(){btn.innerHTML=_t2('📋 نسخ الرمز','📋 Copier le code');},2000);
  });
}

function handlePayReceipt(inp){
  if(!inp.files||!inp.files[0]) return;
  _payFile = inp.files[0];
  var el = document.getElementById('pay-receipt-name');
  el.textContent = '✅ ' + _payFile.name;
  el.style.display = 'block';
  document.getElementById('pay-upload-zone').style.borderColor = '#059669';
}

function submitPayment(){
  if(!_payPkg) return;
  if(_payPkg.price > 0 && !_payFile){
    alert(_storeLang==='ar'?'يرجى رفع صورة وصل الدفع أولاً':'Veuillez d\'abord télécharger le reçu de paiement');
    return;
  }
  var isVideo = _payPkg.category === 'video';
  var videoUrl = '';
  if(isVideo){
    videoUrl = (document.getElementById('pay-video-url')||{}).value?.trim() || '';
    if(!videoUrl){
      alert(_storeLang==='ar'?'يرجى إدخال رابط الفيديو الإعلاني':'Veuillez entrer le lien de la vidéo publicitaire');
      return;
    }
  }
  // إصلاح: لم يكن الزر يُعطَّل أثناء الإرسال — نقر متكرر سريع كان يرسل
  // نفس طلب الاشتراك عدة مرات (بعكس النسخة المصلَحة سابقاً بـrizq_dashboard.html).
  var submitBtn = document.getElementById('pay-submit-btn');
  var prevLabel = submitBtn ? submitBtn.textContent : '';
  if(submitBtn){ if(submitBtn.disabled) return; submitBtn.disabled = true; submitBtn.textContent = _t2('...جارٍ الإرسال','Envoi...'); }
  // النقطة الموحّدة في RizqSub: تقرأ صورة الوصل فعلياً (لا اسم الملف فقط)
  // وتشغّل فحص احتيال إحصائي أولي — مصدر واحد يستخدمه store/office/corp بلا تكرار
  RizqSub.submitSubscriptionRequest({
    file: _payFile,
    pkgName: _payPkg.name,
    price: _payPkg.price,
    accountName: typeof STORE !== 'undefined' ? STORE.name : (typeof OFFICE !== 'undefined' ? OFFICE.name : _t2('مشترك','Abonné')),
    accountId: typeof SESSION_ID !== 'undefined' ? SESSION_ID : '',
    accessToken: window.REAL_ACCESS_TOKEN || '',
    category: _payPkg.category,
    videoUrl: isVideo ? videoUrl : null
  }).then(function(){
    closePayModal();
    showToast(isVideo
      ? _t2('✅ تم إرسال طلب Rizq ADS — يُفحص المحتوى ثم نوافق أو نرفض قبل النشر في الرئيسية','✅ Votre demande Rizq ADS a été envoyée — le contenu sera contrôlé, puis approuvé ou refusé avant publication')
      : _t2('✅ تم إرسال طلبك — سيتم مراجعته وتفعيل باقتك خلال 24 ساعة','✅ Votre demande a été envoyée — elle sera examinée et votre forfait activé dans les 24 heures'), 'success');
  }).catch(function(err){
    showToast((err && err.msg) || _t2('تعذّر إرسال الطلب — حاول مرة أخرى','Échec de l\'envoi de la demande — veuillez réessayer'), 'error');
  }).finally(function(){
    if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = prevLabel; }
  });
}

// Close on backdrop click
document.getElementById('pay-modal') && document.getElementById('pay-modal').addEventListener('click', function(e){
  if(e.target === this) closePayModal();
});

// ══ MY PAYMENT METHODS ══
function getMyStoreKey(){ var acc=(typeof STORE!=='undefined'&&STORE)||(typeof OFFICE_ACC!=='undefined'&&OFFICE_ACC)||(typeof CORP_ACC!=='undefined'&&CORP_ACC)||{}; return 'rizq_my_payments_'+(acc.id||'demo'); }

var DEMO_PAYMENTS=[];
function getMyPayments(){
  var accId = (typeof STORE !== 'undefined' && STORE && STORE.id) || SESSION_ID || 'demo';
  if(typeof RizqAccountPayments !== 'undefined') return RizqAccountPayments.getLocal(accId, IS_DEMO, DEMO_PAYMENTS);
  if(IS_DEMO) return DEMO_PAYMENTS;
  try{ return JSON.parse(localStorage.getItem(getMyStoreKey())||'[]'); }catch(e){ return []; }
}
function saveMyPayments(arr){
  var accId = (typeof STORE !== 'undefined' && STORE && STORE.id) || SESSION_ID || 'demo';
  if(typeof RizqAccountPayments !== 'undefined'){
    return RizqAccountPayments.persist(accId, arr, window.REAL_ACCESS_TOKEN || SESSION_TOKEN, IS_DEMO).then(function(saved){
      if(Array.isArray(saved)) localStorage.setItem(getMyStoreKey(), JSON.stringify(saved));
    });
  }
  localStorage.setItem(getMyStoreKey(), JSON.stringify(arr));
  return Promise.resolve();
}

function renderMyPayments(){
  var el = document.getElementById('my-payment-list');
  if(!el) return;
  var methods = getMyPayments();
  if(!methods.length){
    el.innerHTML = '<div style="text-align:center;padding:32px;color:#9aa7bd;font-size:13px">'+_t2('لا توجد طرق دفع بعد — اضغط "+ إضافة طريقة دفع" للبدء','Aucun moyen de paiement pour le moment — cliquez sur "+ Ajouter un moyen de paiement" pour commencer')+'</div>';
    return;
  }
  var typeLabels = {bank:_t2('🏦 تحويل بنكي','🏦 Virement bancaire'),bankily:_t2('📱 بنكيلي','📱 Bankily'),sedad:_t2('📱 سداد','📱 Sedad'),bimbam:_t2('📱 بيماه/BIMBAM','📱 Bimbam/BIMBAM'),mobile:_t2('📱 تطبيق دفع آخر','📱 Autre application de paiement'),cash:_t2('💵 عند الاستلام','💵 À la livraison'),instore:_t2('🏪 في المحل','🏪 En boutique'),custom:_t2('✏️ مخصص','✏️ Personnalisé')};
  el.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px">' +
    methods.map(function(m,i){
      var lbl = typeLabels[m.type] || m.type;
      var bits = [];
      if(m.code) bits.push('🔢 '+escapeHtml(m.code));
      if(m.phone) bits.push('📞 '+escapeHtml(m.phone));
      if(m.account) bits.push('🏦 '+escapeHtml(m.account));
      return '<div style="background:#f8faff;border:1.5px solid #e0e8ff;border-radius:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
        '<div style="flex:1">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
            '<span style="font-size:13px;font-weight:700;color:#1B3A6B">'+escapeHtml(m.bank||lbl)+'</span>' +
            '<span style="background:#e0e8ff;color:#1B3A6B;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700">'+lbl+'</span>' +
          '</div>' +
          (bits.length ? '<div style="font-family:monospace;font-size:12.5px;font-weight:700;color:#0f2347;display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px">'+bits.map(function(b){return '<span style="background:#e8f0fe;padding:4px 10px;border-radius:7px">'+b+'</span>';}).join('')+'</div>' : '') +
          (m.note ? '<div style="font-size:11.5px;color:#2C3A4F">'+escapeHtml(m.note)+'</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:6px">' +
          '<button data-idx="'+i+'" onclick="editMyPayment(this)" style="background:#e8f0fe;border:none;padding:6px 10px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;color:#1B3A6B">✏️</button>' +
          '<button data-idx="'+i+'" onclick="deleteMyPayment(this)" style="background:#fee2e2;border:none;padding:6px 10px;border-radius:7px;cursor:pointer;font-size:12px">🗑️</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
}

function showAddMyPayModal(){
  document.getElementById('my-pay-modal-title').textContent = _t2('إضافة طريقة دفع','Ajouter un moyen de paiement');
  document.getElementById('mypay-bank').value='';
  document.getElementById('mypay-code').value='';
  var ph = document.getElementById('mypay-phone'); if(ph) ph.value='';
  var ac = document.getElementById('mypay-account'); if(ac) ac.value='';
  document.getElementById('mypay-note').value='';
  document.getElementById('mypay-type').value='bank';
  document.getElementById('mypay-edit-idx').value='';
  document.getElementById('my-pay-modal').style.display='flex';
  document.body.style.overflow='hidden';
}

function closeMyPayModal(){
  document.getElementById('my-pay-modal').style.display='none';
  document.body.style.overflow='';
}

function editMyPayment(btn){
  var idx = parseInt(btn.getAttribute('data-idx'));
  var methods = getMyPayments();
  var m = methods[idx];
  if(!m) return;
  document.getElementById('my-pay-modal-title').textContent = _t2('تعديل طريقة الدفع','Modifier le moyen de paiement');
  document.getElementById('mypay-type').value = m.type||'bank';
  document.getElementById('mypay-bank').value = m.bank||'';
  document.getElementById('mypay-code').value = m.code||'';
  var ph = document.getElementById('mypay-phone'); if(ph) ph.value = m.phone||'';
  var ac = document.getElementById('mypay-account'); if(ac) ac.value = m.account||'';
  document.getElementById('mypay-note').value = m.note||'';
  document.getElementById('mypay-edit-idx').value = idx;
  document.getElementById('my-pay-modal').style.display='flex';
  document.body.style.overflow='hidden';
}

function deleteMyPayment(btn){
  var idx = parseInt(btn.getAttribute('data-idx'));
  if(!confirm(_t2('حذف طريقة الدفع هذه؟','Supprimer ce moyen de paiement ?'))) return;
  var methods = getMyPayments();
  methods.splice(idx,1);
  saveMyPayments(methods);
  renderMyPayments();
  showToast(_t2('تم الحذف','Supprimé'),'success');
}

function saveMyPayment(){
  var type = document.getElementById('mypay-type').value;
  var bank = document.getElementById('mypay-bank').value.trim();
  var code = document.getElementById('mypay-code').value.trim();
  var phone = (document.getElementById('mypay-phone')||{}).value?.trim()||'';
  var account = (document.getElementById('mypay-account')||{}).value?.trim()||'';
  var note = document.getElementById('mypay-note').value.trim();
  if(!bank && type!=='cash' && type!=='instore'){ alert(_t2('يرجى إدخال اسم البنك/الخدمة','Veuillez saisir le nom de la banque / du service')); return; }
  if(type!=='cash' && type!=='instore' && !code && !phone && !account){
    alert(_t2('أدخل على الأقل: رمز أو هاتف أو رقم حساب','Saisissez au moins : code, téléphone ou n° de compte'));
    return;
  }
  var entry = {type:type, bank:bank||type, code:code, phone:phone, account:account, note:note, addedAt: new Date().toISOString()};
  var methods = getMyPayments();
  var editIdx = document.getElementById('mypay-edit-idx').value;
  if(editIdx!=='') methods[parseInt(editIdx)] = entry;
  else methods.push(entry);
  saveMyPayments(methods).then(function(){
    closeMyPayModal();
    renderMyPayments();
    showToast(_t2('✅ تم الحفظ','✅ Enregistré'),'success');
  });
}

// Render on panel open

  // ══ RIZQ PAYMENT SECTION ══
  function renderRizqPayment(targetId){
    var el = document.getElementById(targetId);
    if(!el) return;
    var codes = [];
    try{ codes = (JSON.parse(localStorage.getItem('rizq_bank_codes')||'[]')).filter(function(c){return c.active!==false;}); }catch(e){}
    
    if(!codes.length){
      el.innerHTML = '<div style="background:linear-gradient(135deg,#1B3A6B,#0f2347);border-radius:16px;padding:24px;text-align:center;color:rgba(255,255,255,.5);font-size:13px">'+_t2('لم يتم إضافة طرق دفع بعد — تواصل مع فريق','Aucun moyen de paiement ajouté pour le moment — contactez l\'équipe')+' <span style="color:#e8c96a;font-weight:700">رزق / Rizq</span> '+_t2('عبر واتساب','via WhatsApp')+'</div>';
      return;
    }

    var cards = codes.map(function(b){
      var icon = b.bank.includes('بنكيلي')||b.bank.toLowerCase().includes('bankily') ? '📱' :
                 b.bank.includes('سداد')||b.bank.toLowerCase().includes('sedad') ? '💳' :
                 b.bank.includes('بيماه')||b.bank.toLowerCase().includes('bimbam') ? '📲' : '🏦';
      return '<div style="background:rgba(255,255,255,.06);border:1px solid rgba(201,168,76,.25);border-radius:14px;padding:18px;margin-bottom:12px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">'
          +'<div style="display:flex;align-items:center;gap:10px">'
            +'<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#C9A84C,#e8c96a);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">'+icon+'</div>'
            +'<div>'
              +'<div style="font-size:14px;font-weight:800;color:#e8c96a">'+escapeHtml(b.bank)+'</div>'
              +(b.instruction?'<div style="font-size:11px;color:rgba(255,255,255,.55);margin-top:2px">'+escapeHtml(b.instruction)+'</div>':'')
            +'</div>'
          +'</div>'
          +'<div style="display:flex;align-items:center;gap:8px">'
            +'<div style="font-family:monospace;font-size:16px;font-weight:900;color:#fff;background:rgba(0,0,0,.3);padding:8px 14px;border-radius:10px;letter-spacing:1px;direction:ltr">'+escapeHtml(b.code)+'</div>'
            +'<button onclick="rzqCopyCode(this,\''+escapeHtml(b.code)+'\')" style="background:linear-gradient(135deg,#C9A84C,#e8c96a);border:none;padding:9px 14px;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;color:#0f2347;white-space:nowrap;transition:all .2s">'+_t2('📋 نسخ','📋 Copier')+'</button>'
          +'</div>'
        +'</div>'
      +'</div>';
    }).join('');

    el.innerHTML = '<div style="background:linear-gradient(135deg,#1B3A6B,#0f2347);border-radius:18px;overflow:hidden">'
      +'<div style="padding:20px 22px 14px;border-bottom:1px solid rgba(201,168,76,.2)">'
        +'<div style="display:flex;align-items:center;gap:10px">'
          +'<div style="width:36px;height:36px;background:linear-gradient(135deg,#C9A84C,#e8c96a);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">💰</div>'
          +'<div>'
            +'<div style="font-size:15px;font-weight:900;color:#fff">'+_t2('كيف تدفع اشتراكك لـ','Comment payer votre abonnement à')+' <span style="color:#e8c96a">رزق / Rizq</span>؟</div>'
            +'<div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:1px">'+_t2('اختر طريقة الدفع أدناه وانسخ الرمز','Choisissez un moyen de paiement ci-dessous et copiez le code')+'</div>'
          +'</div>'
        +'</div>'
      +'</div>'
      +'<div style="padding:18px 22px">'
        +cards
        +'<div style="background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.2);border-radius:12px;padding:14px 16px;margin-top:4px">'
          +'<div style="font-size:12px;font-weight:700;color:#e8c96a;margin-bottom:8px">'+_t2('📋 خطوات الدفع','📋 Étapes de paiement')+'</div>'
          +'<div style="font-size:11.5px;color:rgba(255,255,255,.7);line-height:1.9">'
            +'<div>'+_t2('1️⃣ افتح تطبيق البنك أو بيماه على هاتفك','1️⃣ Ouvrez l\'application de votre banque ou Bimbam sur votre téléphone')+'</div>'
            +'<div>'+_t2('2️⃣ اختر <strong style="color:#e8c96a">دفع / تحويل</strong> وأدخل الرمز أعلاه','2️⃣ Choisissez <strong style="color:#e8c96a">Paiement / Virement</strong> et entrez le code ci-dessus')+'</div>'
            +(function(){ var wa=(typeof _rizqSupportWhatsapp==='function'?_rizqSupportWhatsapp():''); return wa ? ('<div>'+_t2('3️⃣ أرسل لنا صورة التأكيد على واتساب:','3️⃣ Envoyez-nous une capture de confirmation sur WhatsApp :')+' <strong style="color:#e8c96a;direction:ltr">'+escapeHtml(wa)+'</strong></div>') : ('<div>'+_t2('3️⃣ أرسل صورة التأكيد لفريق رزق عبر قنوات الدعم الرسمية','3️⃣ Envoyez la capture à l\'équipe Rizq via les canaux de support officiels')+'</div>'); })()
            +'<div>'+_t2('4️⃣ سيتم تفعيل اشتراكك خلال ساعات','4️⃣ Votre abonnement sera activé dans les heures qui suivent')+'</div>'
          +'</div>'
        +'</div>'
      +'</div>'
    +'</div>';
  }

  function rzqCopyCode(btn, code){
    if(navigator.clipboard){
      navigator.clipboard.writeText(code).then(function(){
        var orig=btn.textContent; btn.textContent=_t2('✅ تم النسخ!','✅ Copié !');
        btn.style.background='linear-gradient(135deg,#22c55e,#4ade80)';
        setTimeout(function(){btn.textContent=orig;btn.style.background='linear-gradient(135deg,#C9A84C,#e8c96a)';},2500);
      });
    } else {
      var ta=document.createElement('textarea'); ta.value=code;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      var orig=btn.textContent; btn.textContent=_t2('✅ تم!','✅ Fait !');
      setTimeout(function(){btn.textContent=orig;},2000);
    }
  }


  // ══ PREVIEW & SERVICES SHOWCASE ══
  function previewMyPage(){
    var acc=(typeof STORE!=='undefined'&&STORE)||{};
    var id=acc.id||'demo_store';
    var base=location.href.replace(/[^\/]+$/,'');
    /* الواجهة العامة أولاً ثم الكتالوج — نفس ترتيب الزائر */
    window.open(base+'rizq_store.html?id='+encodeURIComponent(id),'_blank');
  }

  function renderServicesShowcase(){
    var el=document.getElementById('services-showcase'); if(!el) return;
    var acc=(typeof STORE!=='undefined'&&STORE)||(typeof CORP_ACC!=='undefined'&&CORP_ACC)||(typeof OFFICE!=='undefined'&&OFFICE)||{};
    var accId=acc.id||'';
    var ACC_TYPE='store';
    // إصلاح: الاعتماد الحقيقي على محرك الباقات RizqSub (نفس المصدر الذي يُفعِّل
    // الميزات فعلياً عند الدفع) بدل مقارنة acc.plan بأسماء وهمية (gold/silver/pro)
    // لا وجود لها في نظام الباقات الفعلي — كانت تجعل كل الخدمات المدفوعة تظهر
    // مقفلة دوماً بلا علاقة بالباقة الحقيقية للمشترك.
    var feats = (typeof RizqSub!=='undefined') ? (accId ? RizqSub.checkSubscription(accId).features : RizqSub.FREE_FEATURES) : [];
    function has(f){ return !f || feats.indexOf(f)!==-1; }
    function reqPkg(f){ return (f && typeof RizqSub!=='undefined') ? RizqSub.getMinPackageForFeature(ACC_TYPE, f) : null; }

    var services=[
      {icon:'📦',label:_t2('نشر المنتجات/الخدمات','Publier produits/services'),feature:null,tip:_t2('انشر منتجاتك وخدماتك أمام آلاف المشترين','Publiez vos produits et services devant des milliers d\'acheteurs')},
      {icon:'💬',label:_t2('التواصل المباشر','Communication directe'),feature:null,tip:_t2('استقبل رسائل واستفسارات الزبائن مباشرة','Recevez messages et demandes des clients directement')},
      {icon:'📤',label:_t2('مشاركة الصفحة','Partage de la page'),feature:null,tip:_t2('شارك رابط صفحتك على وسائل التواصل','Partagez le lien de votre page sur les réseaux sociaux')},
      {icon:'📊',label:_t2('إحصائيات الزيارات','Statistiques de visites'),feature:'analytics',tip:_t2('تابع عدد من زار صفحتك وتفاعل معها','Suivez le nombre de visiteurs et leurs interactions')},
      {icon:'🥇',label:_t2('صدارة النتائج','Mise en avant dans les résultats'),feature:'priority_listing',tip:_t2('ظهور متقدم في نتائج البحث','Apparition prioritaire dans les résultats de recherche')},
      {icon:'🤖',label:_t2('وكيل ذكي','Agent intelligent'),feature:'ai_agent_full',tip:_t2('رد تلقائي ذكي على الاستفسارات 24/7','Réponse automatique intelligente aux demandes 24/7')},
      {icon:'📞',label:_t2('رد تلقائي مكالمات','Réponse automatique aux appels'),feature:'auto_reply_calls',tip:_t2('لا تفوتك مكالمة — الذكاء الاصطناعي يرد عنك','Ne manquez aucun appel — l\'IA répond pour vous')},
      {icon:'💎',label:_t2('مدير حساب VIP','Gestionnaire de compte VIP'),feature:'vip_manager',tip:_t2('دعم شخصي من فريق رزق على مدار الساعة','Support personnel de l\'équipe Rizq 24h/24')},
    ];

    el.innerHTML=services.map(function(s){
      var avail=has(s.feature);
      // إصلاح: بدل شارة "ترقية" عامة لا تحدد أي باقة، نعرض اسم أقل باقة حقيقية
      // تمنح هذه الخدمة تحديداً (مصدرها RizqSub.getMinPackageForFeature) — لا لبس.
      var need=avail?null:reqPkg(s.feature);
      var lockTxt = '🔒 '+(need ? (_t2('يتطلب: ','Nécessite : ')+need) : _t2('ترقية','Mise à niveau'));
      return '<div onclick="'+(avail?'':'showPanel(\'subscription\',null)')+'" style="background:#fff;border:2px solid '+(avail?'rgba(27,58,107,.18)':'rgba(201,168,76,.35)')+';border-radius:14px;padding:16px 10px 12px;text-align:center;position:relative;cursor:'+(avail?'default':'pointer')+';box-shadow:0 2px 8px rgba(27,58,107,.06);transition:box-shadow .2s,transform .2s" onmouseover="this.style.boxShadow=\'0 6px 18px rgba(27,58,107,.13)\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.boxShadow=\'0 2px 8px rgba(27,58,107,.06)\';this.style.transform=\'none\'">'
        +(avail?''
          :'<div style="position:absolute;top:-1px;right:-1px;background:linear-gradient(135deg,#C9A84C,#e8c96a);color:#0f2347;font-size:9.5px;font-weight:900;padding:3px 9px;border-radius:0 12px 0 10px;letter-spacing:.2px;white-space:nowrap">'+lockTxt+'</div>')
        +'<div style="font-size:30px;margin-bottom:8px;line-height:1">'+s.icon+'</div>'
        +'<div style="font-size:12px;font-weight:800;color:#1B3A6B;margin-bottom:5px;line-height:1.3">'+s.label+'</div>'
        +'<div style="font-size:10.5px;color:#2C3A4F;line-height:1.45">'+s.tip+'</div>'
        +(avail?'<div style="margin-top:10px;display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px rgba(16,185,129,.6)"></div>':'')
      +'</div>';
    }).join('');
  }


// Auto-navigate from URL hash / نية الاشتراك من زر الصفحة الرئيسية
window.addEventListener('load', function(){
  var h = location.hash.replace('#','');
  try{
    if(!h && sessionStorage.getItem('rizq_open_panel') === 'subscription'){
      h = 'subscription';
      sessionStorage.removeItem('rizq_open_panel');
      try{ history.replaceState(null, '', location.pathname + location.search + '#subscription'); }catch(eH){}
    }
  }catch(eIntent){}
  if(h){ var el = document.querySelector('.sb-item[onclick*="'+h+'"]'); if(el){ el.click(); } }
});
