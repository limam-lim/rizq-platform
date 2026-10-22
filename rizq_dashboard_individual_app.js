/* Token hardening: accessToken never persisted to localStorage — use RizqDash */
if (window.RizqDash && RizqDash.purgeSensitiveTokensFromStorage) { try { RizqDash.purgeSensitiveTokensFromStorage(); RizqDash.stripUrlToken(); } catch (ePurge) {} }
/* extracted from rizq_dashboard.html — do not edit HTML for logic */
if(window.RizqAccount)RizqAccount.bootstrapDashboard();
;

// أيقونات SVG بهوية رزق (أزرق داكن على خلفية بيضاء) تحل محل الإيموجي العام في صور مصغّرة لإعلانات لوحة التحكم
const ICON_SVG = {
  '🏠':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 12 4l8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/></svg>',
  '🚗':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11 6.5 7.5A2 2 0 0 1 8.4 6.3h7.2a2 2 0 0 1 1.9 1.2L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><circle cx="7.5" cy="17.5" r="1.4"/><circle cx="16.5" cy="17.5" r="1.4"/></svg>',
  '📱':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3" width="10" height="18" rx="2.2"/><path d="M10.5 18.3h3"/></svg>',
  '🐪':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="5"/><path d="M8.5 9 7 6.5M15.5 9 17 6.5"/><circle cx="10" cy="12.5" r=".55" fill="currentColor" stroke="none"/><circle cx="14" cy="12.5" r=".55" fill="currentColor" stroke="none"/><path d="M10.5 15.3a2 2 0 0 0 3 0"/></svg>',
  '👗':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.6" r="1.4"/><path d="M12 6v1.8"/><path d="M12 7.8 4 13.3a1 1 0 0 0 .5 1.8h15a1 1 0 0 0 .5-1.8z"/><path d="M7 19.2h10"/></svg>'
};
function iconHTML(emoji){ return ICON_SVG[emoji] || emoji; }

// ── DATA ──
const DEMO_ADS = [];

// ── تحويل إعلان خام (محلي أو من الخادم) لشكل عرض لوحة "إعلاناتي" ──
function _mapRawAdToDashboard(a){
  return {
    id: a.id,
    accountId: a.accountId || '',
    emoji: a.emoji || '📦',
    cat: (a.emoji||'📦') + ' ' + (a.category||'غير محدد'),
    title: a.title || '(بدون عنوان)',
    titleFr: a.titleFr || '',
    desc: a.desc || '',
    descFr: a.descFr || '',
    price: a.price ? (a.price + ' MRU') : '—',
    status: a.status || 'pending',
    views: a.views || 0,
    contacts: a.contacts || 0,
    date: a.date || ''
  };
}
// ── ربط الإعلانات الحقيقية المنشورة من rizq_post.html (localStorage['rizq_ads']) ──
// ملاحظة صادقة: هذه إعلانات هذا الجهاز/المتصفح فقط — تُدمَج مع إعلانات
// الخادم الحقيقية (كل الأجهزة) عبر _rizqMergeMyBackendAds أسفل.
function loadRealAds(){
  try{ return JSON.parse(localStorage.getItem('rizq_ads') || '[]').map(_mapRawAdToDashboard); }
  catch(e){ return []; }
}

// ── إصلاح جوهري 29/07/2026: جلب إعلانات هذا الحساب الحقيقية من كل
// الأجهزة عبر /api/ads/mine (بدل الاقتصار على متصفح واحد فقط) ──
function _rizqMergeMyBackendAds(acc){
  try{
    if(typeof window.RIZQ_BACKEND_BASE !== 'string' || !window.RIZQ_BACKEND_BASE || !acc || !acc.token) return;
    // إصلاح جوهري (2026-08-05): كانت ترسل acc.token (=dashToken) مباشرة —
    // نفس علّة x-account-token المشروحة أعلى _resolveRealAccessToken، فترفض
    // /api/ads/mine دائماً بـ401 (verifyAccountOwner لا يقبل إلا accessToken
    // الحقيقي). الآن تُستدعى بعد حل window.REAL_ACCESS_TOKEN (انظر ترتيب
    // النداء في _initDashboardWithAccount).
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/ads/mine?accountId=' + encodeURIComponent(SESSION_ID), {
      headers: { 'x-account-token': (window.REAL_ACCESS_TOKEN || acc.token) }
    }).then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if(!data || !Array.isArray(data.ads) || !data.ads.length) return;
        var existingIds = {};
        MY_ADS.forEach(function(a){ existingIds[String(a.id)] = true; });
        // إصلاح: نستبعد الإعلانات المحذوفة (status='removed' — حذف ناعم في
        // الخادم، انظر DELETE /api/ads/:id) حتى لا تعود للظهور في "إعلاناتي"
        // بعد أن حذفها المستخدم فعلياً عبر deleteAd أعلاه.
        var mapped = data.ads.filter(function(a){ return !existingIds[String(a.id)] && a.status !== 'removed'; }).map(_mapRawAdToDashboard);
        if(!mapped.length) return;
        mapped.forEach(function(a){ MY_ADS.push(a); });
        renderAdsTable(); renderQuickAds(); renderFavs();
      }).catch(function(){ /* صامت — لا خادم منشور بعد أو انقطاع شبكة */ });
  }catch(e){}
}

// ── إحصائيات حقيقية للحساب الفردي (مشاهدات + تواصل) — بديل الأرقام
// الثابتة/العشوائية التي كانت تظهر ببطاقات "نظرة عامة" ومخطط الأسبوع.
// views: من GET /api/visit-stats/:id (rizq_visit_tracker.js — يتطلب أن
//   تكون rizq_profile.html/rizq_listing.html قد أرسلتا ping زيارة فعلياً).
// contacts: من عدد محادثات GET /api/messages/threads (كل محادثة = تواصل
//   حقيقي واحد، بدل الرقم العشوائي القديم).
window._rizqVisitDays = null; // last90 المخزّنة بعد أول تحميل ناجح
function _loadRealDashboardStats(acc){
  try{
    if(IS_DEMO || typeof window.RIZQ_BACKEND_BASE !== 'string' || !window.RIZQ_BACKEND_BASE || !SESSION_ID) return;
    var hdr = { 'x-account-token': (window.REAL_ACCESS_TOKEN || (acc && acc.token) || SESSION_TOKEN) };
    var base = window.RIZQ_BACKEND_BASE.replace(/\/$/, '');

    fetch(base + '/api/visit-stats/' + encodeURIComponent(SESSION_ID), { headers: hdr })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if(!data || !data.ok || !data.stats) return;
        var viewsEl = document.querySelector('.stat-card.views .stat-num');
        if(viewsEl) viewsEl.textContent = (data.stats.total || 0).toLocaleString();
        var viewsChangeEl = document.querySelector('.stat-card.views .stat-change');
        if(viewsChangeEl){ viewsChangeEl.className = 'stat-change'; viewsChangeEl.textContent = (data.stats.monthTotal || 0) + ' ' + _t2('مشاهدة هذا الشهر','vues ce mois-ci'); }
        window._rizqVisitDays = Array.isArray(data.stats.last90) ? data.stats.last90 : [];
        var activeTab = document.querySelector('.chart-tab.active');
        var idx = activeTab ? Array.prototype.indexOf.call(document.querySelectorAll('.chart-tab'), activeTab) : 0;
        _renderChartFromDays(window._rizqVisitDays, [7,30,90][idx] || 7);
      }).catch(function(){});

    // الرسائل تُحدَّث عبر renderMessages (seller threads + buyer mine)
    if(typeof renderMessages === 'function') renderMessages();

    // تقييم الملف الشخصي الحقيقي
    fetch(base + '/api/reviews/' + encodeURIComponent(SESSION_ID) + '/stats')
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        var el = document.getElementById('pf-stat-rating');
        if(!el) return;
        if(data && data.count) el.textContent = '★ '+data.average+' ('+data.count+')';
        else el.textContent = _t2('لا تقييمات بعد','Aucun avis');
      }).catch(function(){});
  }catch(e){}
}

// يُحسب فعلياً داخل initDashboard() بعد التحقق من IS_DEMO/SESSION_ID (انظر أسفل الملف).
// حساب مؤقت هنا فقط لتفادي أخطاء المرجع قبل التشغيل — يُستبدل قبل أي عرض فعلي.
let MY_ADS = [];
function _applyDashGreeting(){
  var greet=document.querySelector('[data-t="greeting"]');
  if(!greet) return;
  var acc = typeof USER_ACC !== 'undefined' ? USER_ACC : null;
  var nm=(acc && acc.name)?String(acc.name).trim():'';
  greet.textContent = nm ? _t2('مرحباً، '+nm+' 👋','Bonjour, '+nm+' 👋') : _t2('مرحباً 👋','Bonjour 👋');
}

// لغة الموقع الحالية المحفوظة (مشتركة بين كل الصفحات عبر localStorage['rizq_lang'])
function _rizqLang(){ try{ return localStorage.getItem('rizq_lang') || 'ar'; }catch(e){ return 'ar'; } }
// عنوان الإعلان بحسب اللغة الحالية — مع رجوع للعربية إن لم تتوفر نسخة فرنسية
// (إعلانات DEMO_ADS التجريبية لا تحتوي حقول فرنسية، فتُعرض بالعربية دوماً)
function adTitleLocalized(a){
  if(typeof RizqLocale!=='undefined') return RizqLocale.adTitle(a, _rizqLang());
  var fr=_rizqLang()==='fr';
  return fr?(a.titleFr||a.title||''):(a.title||a.titleFr||'');
}

const MESSAGES = [];
let ACTIVE_CHAT_IDX = -1;
let CHAT_MSGS = [];
const NOTIFS = [];
const CHART_DATA = [];
const CHART_DAYS = [];

// ── RENDER FUNCTIONS ──
function renderChart(){
  const bars=document.getElementById('chart-bars');
  if(!bars) return;
  if(!CHART_DATA.length){
    bars.innerHTML='<div style="width:100%;text-align:center;color:var(--text-muted);font-size:12.5px;padding:28px 0">'+_t2('لا توجد مشاهدات بعد','Aucune vue pour le moment')+'</div>';
    return;
  }
  const max=Math.max.apply(null, CHART_DATA.concat([1]));
  bars.innerHTML=CHART_DATA.map((v,i)=>`
    <div class="bar-wrap">
      <div class="bar" data-val="${v.toLocaleString()} مشاهدة" style="height:${(v/max)*100}%;background:${i===CHART_DATA.length-1?'linear-gradient(180deg,var(--gold),var(--gold-light))':'linear-gradient(180deg,#6b8cc4,#9bb0d8)'}"></div>
      <div class="bar-label">${CHART_DAYS[i]}</div>
    </div>`).join('');
}

// ── مخطط زيارات حقيقي من last90 (window._rizqVisitDays) — يستبدل مخطط
// CHART_DATA الثابت للحسابات الحقيقية فقط (renderChart أعلاه يبقى كما هو
// للعرض التجريبي demo). 7 أيام/30 يوماً: شريط يومي. 3 أشهر: تجميع أسبوعي
// (~13 شريطاً) بدل 90 شريطاً رفيعاً غير مقروء عملياً بنفس حاوية العرض
// الحالية (flex:1 لكل شريط).
function _renderChartFromDays(days, tabDays){
  const bars=document.getElementById('chart-bars');
  if(!bars) return;
  if(!Array.isArray(days) || !days.length){
    bars.innerHTML = '<div style="width:100%;text-align:center;color:var(--text-muted);font-size:12px;padding:20px 0">'+_t2('لا توجد بيانات زيارات كافية بعد','Pas encore assez de données de visites')+'</div>';
    return;
  }
  const fr = (_rizqLang()==='fr');
  let buckets;
  if(tabDays===90){
    // تجميع أسبوعي على آخر 90 يوماً
    const weeks=[];
    for(let i=0;i<days.length;i+=7){
      const chunk = days.slice(i, i+7);
      if(!chunk.length) continue;
      weeks.push({ date: chunk[0].date, count: chunk.reduce((s,d)=>s+d.count,0) });
    }
    buckets = weeks;
  } else {
    buckets = days.slice(-tabDays);
  }
  const max=Math.max(1, ...buckets.map(b=>b.count));
  bars.innerHTML=buckets.map((b,i)=>{
    const dt = new Date(b.date+'T00:00:00');
    const label = tabDays===7
      ? dt.toLocaleDateString(fr?'fr-FR':'ar-MR-u-nu-latn', {weekday:'short'})
      : dt.toLocaleDateString(fr?'fr-FR':'ar-MR-u-nu-latn', {day:'numeric', month:'numeric'});
    const isLast = i===buckets.length-1;
    return `<div class="bar-wrap">
      <div class="bar" data-val="${b.count.toLocaleString()} ${_t2('مشاهدة','vues')}" style="height:${(b.count/max)*100}%;background:${isLast?'linear-gradient(180deg,var(--gold),var(--gold-light))':'linear-gradient(180deg,#6b8cc4,#9bb0d8)'}"></div>
      <div class="bar-label">${label}</div>
    </div>`;
  }).join('');
}

function renderAdsTable(){
  renderAdsTableData(MY_ADS);
  _updateAdFilterCounts();
}

function _updateAdFilterCounts(){
  var all = MY_ADS.length;
  var n = function(st){ return MY_ADS.filter(function(a){ return a.status===st; }).length; };
  var set = function(id, v){ var el=document.getElementById(id); if(el) el.textContent='('+v+')'; };
  set('sf-n-all', all);
  set('sf-n-active', n('active'));
  set('sf-n-pending', n('pending'));
  set('sf-n-expired', n('expired'));
  var adsNum = document.querySelector('.stat-card.balance .stat-num');
  if(adsNum) adsNum.textContent = String(n('active') || all);
  var adsChange = document.querySelector('.stat-card.balance .stat-change');
  if(adsChange){ adsChange.className='stat-change'; adsChange.textContent = all ? (all+' '+_t2('إعلان','annonce(s)')) : _t2('لا إعلانات بعد','aucune annonce'); }
  if(window.RizqStatusSummary && typeof RizqStatusSummary.render==='function'){
    RizqStatusSummary.render({ items: MY_ADS, itemType: 'ads' });
  }
}

function renderQuickAds(){
  const el=document.getElementById('quick-ads');
  if(!el) return;
  if(!MY_ADS.length){
    el.innerHTML='<p style="color:var(--text-muted);font-size:12.5px;text-align:center;padding:12px 0">'+_t2('لا توجد إعلانات بعد — انشر إعلانك الأول','Aucune annonce pour le moment — publiez votre première annonce')+'</p>';
    return;
  }
  el.innerHTML=MY_ADS.slice(0,3).map(a=>`
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #eef2fb">
      <div style="width:40px;height:36px;border-radius:8px;background:linear-gradient(145deg,#eef2fb,#f8faff);border:1px solid #e2e8f5;display:flex;align-items:center;justify-content:center;color:var(--royal);flex-shrink:0"><span style="display:flex;width:18px;height:18px">${iconHTML(a.emoji).replace('<svg ', '<svg style="width:18px;height:18px;stroke-width:1.6" ')}</span></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700;color:#1a2535;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${adTitleLocalized(a)}</div>
        <div style="font-size:11.5px;color:var(--text-muted)">👁 ${a.views} ${_t2('مشاهدة','vues')} · 📞 ${a.contacts} ${_t2('تواصل','contacts')}</div>
      </div>
      <div style="font-size:13px;font-weight:800;color:var(--gold-dk);white-space:nowrap">${a.price.split(' ')[0]}</div>
    </div>`).join('');
}

function _dashAuthHeaders(){
  return { 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN || '') };
}
function _escapeHtmlDash(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _fmtMsgTime(iso){
  try{
    return new Date(iso).toLocaleString(_rizqLang()==='fr'?'fr-FR':'ar-MR-u-nu-latn',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  }catch(e){ return ''; }
}

function renderMessages(){
  const list=document.getElementById('msgs-list');
  if(!list) return;
  if(IS_DEMO){
    list.innerHTML='<div style="padding:28px 16px;text-align:center;color:var(--text-muted);font-size:12.5px">'+_t2('لا رسائل في العرض التجريبي','Aucun message en mode démo')+'</div>';
    return;
  }
  if(!window.RIZQ_BACKEND_BASE || !SESSION_ID){
    list.innerHTML='<div style="padding:28px 16px;text-align:center;color:var(--text-muted);font-size:12.5px">'+_t2('لا رسائل بعد','Aucun message pour le moment')+'</div>';
    return;
  }
  list.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12.5px">'+_t2('جارٍ التحميل...','Chargement...')+'</div>';
  var base = window.RIZQ_BACKEND_BASE.replace(/\/$/,'');
  var hdr = _dashAuthHeaders();
  Promise.all([
    fetch(base+'/api/messages/threads?accountId='+encodeURIComponent(SESSION_ID),{headers:hdr}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}),
    fetch(base+'/api/messages/mine?accountId='+encodeURIComponent(SESSION_ID),{headers:hdr}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;})
  ]).then(function(results){
    var sellerThreads = (results[0] && Array.isArray(results[0].threads)) ? results[0].threads : [];
    var buyerThreads = (results[1] && Array.isArray(results[1].threads)) ? results[1].threads : [];
    var byKey = {};
    sellerThreads.forEach(function(t){
      byKey[t.threadKey] = {
        threadKey: t.threadKey, role:'seller', sellerAccountId: SESSION_ID,
        name: t.buyerName || _t2('زبون','Client'),
        emoji: '💬', preview: (t.lastMessage && t.lastMessage.body) || '',
        time: _fmtMsgTime(t.lastMessage && t.lastMessage.createdAt),
        ad: t.adTitle || _t2('إعلان','Annonce'), adId: t.adId || null,
        unread: !!(t.unreadCount), unreadCount: t.unreadCount||0, active:false
      };
    });
    buyerThreads.forEach(function(t){
      if(byKey[t.threadKey]) return;
      byKey[t.threadKey] = {
        threadKey: t.threadKey, role:'buyer', sellerAccountId: t.sellerAccountId,
        name: _t2('بائع','Vendeur'),
        emoji: '🏪', preview: (t.lastMessage && t.lastMessage.body) || '',
        time: _fmtMsgTime(t.lastMessage && t.lastMessage.createdAt),
        ad: t.adTitle || _t2('إعلان','Annonce'), adId: t.adId || null,
        unread: false, unreadCount: 0, active:false
      };
    });
    MESSAGES.length = 0;
    Object.keys(byKey).forEach(function(k){ MESSAGES.push(byKey[k]); });
    MESSAGES.sort(function(a,b){ return (b.time||'').localeCompare(a.time||''); });

    var totalUnread = MESSAGES.reduce(function(s,m){ return s+(m.unreadCount||0); },0);
    var badge = document.querySelector('.nav-item[onclick*=messages] .nav-badge');
    if(badge){ if(totalUnread>0){ badge.textContent=totalUnread; badge.style.display=''; } else badge.style.display='none'; }
    var contactsEl = document.querySelector('.stat-card.contacts .stat-num');
    if(contactsEl) contactsEl.textContent = String(MESSAGES.length);
    var contactsChangeEl = document.querySelector('.stat-card.contacts .stat-change');
    if(contactsChangeEl){
      contactsChangeEl.className='stat-change';
      contactsChangeEl.textContent = totalUnread ? ('🔔 '+totalUnread+' '+_t2('غير مقروءة','non lu(s)')) : _t2('لا رسائل غير مقروءة','aucun message non lu');
    }

    if(!MESSAGES.length){
      list.innerHTML='<div style="padding:28px 16px;text-align:center;color:var(--text-muted);font-size:12.5px">'+_t2('لا رسائل بعد','Aucun message pour le moment')+'</div>';
      var msgs=document.getElementById('chat-msgs'); if(msgs) msgs.innerHTML='';
      return;
    }
    list.innerHTML=MESSAGES.map(function(m,i){
      return '<div class="msg-item'+(m.active?' active':'')+(m.unread?' unread':'')+'" onclick="openChat('+i+')">'
        +'<div style="display:flex;align-items:center;gap:9px">'
        +'<div class="msg-av">'+m.emoji+'</div>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">'
        +'<div class="msg-name">'+_escapeHtmlDash(m.name)+'</div>'
        +'<div class="msg-time">'+_escapeHtmlDash(m.time)+'</div></div>'
        +'<div class="msg-preview">'+_escapeHtmlDash(m.preview)+'</div>'
        +'<div style="font-size:10px;color:var(--text-muted);margin-top:2px">'+_escapeHtmlDash(m.ad)+'</div>'
        +'</div>'
        +(m.unread?'<div class="msg-unread-dot"></div>':'')
        +'</div></div>';
    }).join('');
    if(ACTIVE_CHAT_IDX>=0 && ACTIVE_CHAT_IDX<MESSAGES.length) openChat(ACTIVE_CHAT_IDX);
  }).catch(function(){
    list.innerHTML='<div style="padding:28px 16px;text-align:center;color:var(--text-muted);font-size:12.5px">'+_t2('لا رسائل بعد','Aucun message pour le moment')+'</div>';
  });
}

function openChat(idx){
  const m=MESSAGES[idx];
  if(!m) return;
  ACTIVE_CHAT_IDX = idx;
  MESSAGES.forEach(function(x,i){ x.active = i===idx; });
  document.getElementById('chat-name').textContent=m.name;
  const sub=document.getElementById('chat-sub');
  if(sub) sub.textContent=(_rizqLang()==='fr'?'Concernant : ':'بخصوص: ')+m.ad;
  document.querySelectorAll('.msg-item').forEach(function(el,i){ el.classList.toggle('active',i===idx); });
  const msgs=document.getElementById('chat-msgs');
  if(msgs) msgs.innerHTML='<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px">'+_t2('جارٍ التحميل...','Chargement...')+'</div>';
  if(!window.RIZQ_BACKEND_BASE || !m.threadKey){ CHAT_MSGS=[]; _paintChatMsgs(); return; }
  var base = window.RIZQ_BACKEND_BASE.replace(/\/$/,'');
  fetch(base+'/api/messages/thread/'+encodeURIComponent(m.threadKey), { headers: _dashAuthHeaders() })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      var list = (data && Array.isArray(data.messages)) ? data.messages : [];
      CHAT_MSGS = list.map(function(msg){
        var sent = (m.role==='seller' && msg.fromRole==='seller') || (m.role==='buyer' && msg.fromRole==='buyer');
        return { text: msg.body||'', time: _fmtMsgTime(msg.createdAt), sent: !!sent };
      });
      _paintChatMsgs();
      if(m.role==='seller' && m.unreadCount>0){
        fetch(base+'/api/messages/thread/'+encodeURIComponent(m.threadKey)+'/read', {
          method:'PATCH', headers: _dashAuthHeaders()
        }).catch(function(){});
        m.unread=false; m.unreadCount=0;
      }
    }).catch(function(){ CHAT_MSGS=[]; _paintChatMsgs(); });
}
function _paintChatMsgs(){
  const msgs=document.getElementById('chat-msgs');
  if(!msgs) return;
  if(!CHAT_MSGS.length){
    msgs.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12.5px">'+_t2('ابدأ المحادثة','Commencez la conversation')+'</div>';
    return;
  }
  msgs.innerHTML=CHAT_MSGS.map(function(m){
    return '<div style="display:flex;flex-direction:column;align-items:'+(m.sent?'flex-end':'flex-start')+'">'
      +'<div class="chat-msg '+(m.sent?'sent':'recv')+'">'+_escapeHtmlDash(m.text)+'</div>'
      +'<div class="chat-time">'+_escapeHtmlDash(m.time)+'</div></div>';
  }).join('');
  msgs.scrollTop=msgs.scrollHeight;
}

function sendMsg(){
  const input=document.getElementById('chat-input');
  const text=input.value.trim();
  if(!text)return;
  const m = ACTIVE_CHAT_IDX>=0 ? MESSAGES[ACTIVE_CHAT_IDX] : null;
  if(!m || !m.threadKey){
    if(typeof showToast==='function') showToast(_t2('لا توجد محادثة محددة بعد','Aucune conversation sélectionnée pour le moment'));
    return;
  }
  if(!window.RIZQ_BACKEND_BASE){
    if(typeof showToast==='function') showToast(_t2('الخادم غير متاح','Serveur indisponible'));
    return;
  }
  var base = window.RIZQ_BACKEND_BASE.replace(/\/$/,'');
  var btn = document.querySelector('.chat-send');
  if(btn) btn.disabled = true;
  var req;
  if(m.role==='seller'){
    req = fetch(base+'/api/messages/reply', {
      method:'POST', headers: Object.assign({'Content-Type':'application/json'}, _dashAuthHeaders()),
      body: JSON.stringify({ sellerAccountId: SESSION_ID, threadKey: m.threadKey, body: text })
    });
  } else {
    req = fetch(base+'/api/messages', {
      method:'POST', headers: Object.assign({'Content-Type':'application/json'}, _dashAuthHeaders()),
      body: JSON.stringify({ sellerAccountId: m.sellerAccountId, buyerAccountId: SESSION_ID, body: text, adId: m.adId, adTitle: m.ad })
    });
  }
  req.then(function(r){ return r.ok ? r.json() : Promise.reject(); })
    .then(function(){
      input.value='';
      openChat(ACTIVE_CHAT_IDX);
      if(typeof showToast==='function') showToast(_t2('✅ تم الإرسال','✅ Envoyé'));
    })
    .catch(function(){
      if(typeof showToast==='function') showToast(_t2('تعذّر إرسال الرسالة','Échec de l\'envoi'),'error');
    })
    .finally(function(){ if(btn) btn.disabled=false; });
}

function renderNotifs(){
  const list=document.getElementById('notifs-list');
  if(!list) return;
  var unread = NOTIFS.filter(function(n){ return n.unread; }).length;
  var dot=document.getElementById('notif-dot');
  if(dot) dot.hidden = unread===0;
  if(!NOTIFS.length){
    list.innerHTML='<p style="color:var(--text-muted);font-size:12.5px;text-align:center;padding:24px 0">'+_t2('لا إشعارات بعد','Aucune notification pour le moment')+'</p>';
    return;
  }
  list.innerHTML=NOTIFS.map(n=>`
    <div class="notif-item${n.unread?' unread':''}">
      <div class="notif-icon" style="background:${n.bg}">${n.icon}</div>
      <div style="flex:1">
        <div class="notif-title">${n.title}</div>
        <div class="notif-text">${n.text}</div>
        <div class="notif-time">${n.time}</div>
      </div>
      ${n.unread?'<div style="width:8px;height:8px;background:var(--gold);border-radius:50%;flex-shrink:0;margin-top:4px"></div>':''}
    </div>`).join('');
}

// إصلاح جوهري (2026-08-05): كانت هذه اللوحة تعرض MY_ADS.slice(0,3) —
// أي إعلانات المستخدم نفسه، مُصنَّفة خطأً على أنها "مفضلة"! لا علاقة
// حقيقية بما أضافه المستخدم فعلياً للمفضلة. الآن تُقرأ من
// localStorage['rizq_wishlist'] الحقيقي (نفس المخزَّن المستخدم في
// rizq_browse.html/rizq_listing.html/rizq_search.html/rizq_landing_v8.html)
// وتُجلب بياناتها الحيّة دفعة واحدة عبر GET /api/ads/batch — بنفس نمط
// "المفضلة لديك" في rizq_landing_v8.html بالضبط.
function _favEmptyHTML(msgAr, msgFr){
  return '<p style="grid-column:1/-1;color:var(--text-muted);font-size:12.5px;text-align:center;padding:24px 0">'+_t2(msgAr, msgFr)+'</p>';
}
function _favCardHTML(a, href){
  return `<a href="${href}" style="background:#fff;border:1px solid #e2e8f5;border-radius:14px;overflow:hidden;text-decoration:none;display:block;transition:all .3s;box-shadow:0 2px 10px rgba(15,35,65,.04)" onmouseover="this.style.borderColor='rgba(201,168,76,.3)'" onmouseout="this.style.borderColor='#e2e8f5'">
      <div style="height:100px;background:linear-gradient(145deg,#eef2fb,#f8faff);display:flex;align-items:center;justify-content:center;color:var(--royal)"><span style="display:flex;width:38px;height:38px">${iconHTML(a.emoji).replace('<svg ', '<svg style="width:38px;height:38px;stroke-width:1.4" ')}</span></div>
      <div style="padding:12px">
        <div style="font-size:13px;font-weight:700;color:#1a2535;margin-bottom:5px">${adTitleLocalized(a)}</div>
        <div style="font-size:14px;font-weight:900;color:var(--gold-dk)">${a.price}</div>
      </div>
    </a>`;
}
function renderFavs(){
  const grid=document.getElementById('favs-grid');
  if(!grid) return;
  if(IS_DEMO){
    // عرض تجريبي فقط — بلا rizq_wishlist حقيقي عادةً؛ نُبقي عيّنة توضيحية صادقة المصدر (إعلانات العرض التجريبي نفسها)
    const favAds=MY_ADS.slice(0,3);
    grid.innerHTML = favAds.length ? favAds.map(a=>_favCardHTML(a,'rizq_browse.html')).join('') : _favEmptyHTML('لا توجد عناصر بعد','Aucun élément pour le moment');
    return;
  }
  let ids=[];
  try{ const v=JSON.parse(localStorage.getItem('rizq_wishlist')||'[]'); if(Array.isArray(v)) ids=v; }catch(e){}
  if(!ids.length || typeof window.RIZQ_BACKEND_BASE !== 'string' || !window.RIZQ_BACKEND_BASE){
    grid.innerHTML = _favEmptyHTML('لم تُضِف أي إعلان إلى المفضلة بعد — اضغط ♥ على أي إعلان أثناء التصفح','Vous n\'avez encore ajouté aucune annonce aux favoris — appuyez sur ♥ sur une annonce en parcourant');
    return;
  }
  grid.innerHTML = _favEmptyHTML('جارٍ التحميل...','Chargement...');
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/ads/batch?ids=' + ids.slice(0,30).map(encodeURIComponent).join(','))
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      const raw = data && data.ok && Array.isArray(data.ads) ? data.ads : [];
      if(!raw.length){ grid.innerHTML = _favEmptyHTML('لم تُضِف أي إعلان إلى المفضلة بعد — اضغط ♥ على أي إعلان أثناء التصفح','Vous n\'avez encore ajouté aucune annonce aux favoris — appuyez sur ♥ sur une annonce en parcourant'); return; }
      const favAds = raw.map(_mapRawAdToDashboard);
      grid.innerHTML = favAds.map(a=>_favCardHTML(a,'rizq_browse.html?id='+encodeURIComponent(a.id))).join('');
    }).catch(function(){ grid.innerHTML = _favEmptyHTML('تعذّر تحميل المفضلة — حاول مرة أخرى','Échec du chargement des favoris — veuillez réessayer'); });
}

// ── PANEL SWITCHING ──
function showPanel(id, navEl){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('panel-'+id).classList.add('active');
  if(navEl){
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    navEl.classList.add('active');
  }
  const titles={overview:'نظرة عامة','my-ads':'إعلاناتي',messages:'الرسائل',notifications:'الإشعارات',favorites:'المفضلة',profile:'ملفي الشخصي',security:'الأمان',subscription:'💳 باقتي','video-ads':'🎬 إعلان فيديو',tenders:'📋 المناقصات',referral:'🎁 إحالة الأصدقاء',verifiedplus:'🛡️ شارة موثّق⁺'};
  const titlesFr={overview:'Vue d\'ensemble','my-ads':'Mes annonces',messages:'Messages',notifications:'Notifications',favorites:'Favoris',profile:'Mon profil',security:'Sécurité',subscription:'💳 Mon forfait','video-ads':'🎬 Annonce vidéo',tenders:'📋 Appels d\'offres',referral:'🎁 Parrainage',verifiedplus:'🛡️ Badge Vérifié+'};
  document.getElementById('topbar-title').textContent=(_rizqLang()==='fr'?(titlesFr[id]||'Tableau de bord'):(titles[id]||'لوحة التحكم'));
  if(id==='subscription'){ renderSubscriptionPanel(); renderPackagesDisplay(); }
  if(id==='video-ads'){ renderVideoPackagesDisplay(); if(USER_ACC) _rizqRenderAdsStatus(USER_ACC); }
  if(id==='tenders'){ renderTenderSubStatus(); renderMyTenders(); }
  if(id==='referral'){ renderReferralPanel(); }
  if(id==='verifiedplus'){ renderVerifiedPlusPanel(); }
  if(id==='security'){ initSecurityToggles(); }
  if(window.innerWidth<768)closeSidebar();
}

// ── برنامج الإحالة (جيب صاحبك واربح) ────────────────────────────────
function renderReferralPanel(){
  var linkInput = document.getElementById('referral-link-input');
  var statsEl = document.getElementById('referral-stats');
  if(!linkInput) return;
  linkInput.value = SESSION_ID ? (location.origin + '/rizq_landing_v8.html?ref=' + encodeURIComponent(SESSION_ID)) : '';
  if(!statsEl) return;
  if(IS_DEMO || !window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN){
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

// ── شارة "موثّق⁺" (Verified+) — مهمة #232 ──

function renderVerifiedPlusPanel(){
  var fr = (_rizqLang()==='fr');
  var el = document.getElementById('vplus-status');
  if(!el) return;
  if(IS_DEMO || !window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN){
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
          + '<span>✅ '+(fr?('Votre badge « Vérifié+ » est actif jusqu\'au '+endsTxt) : ('شارة "موثّق⁺" فعّالة لديك حتى '+endsTxt))+'</span>'
          + '</div>';
        return;
      }
      var FEATS_AR = {'سنوية':['شارة "موثّق⁺" الرسمية بشعار رزق','أعلى درجة ثقة لدى المشترين','تحقق هوية مُعزَّز من فريق رزق','صالحة لسنة كاملة']};
      var FEATS_FR = {'سنوية':['Badge officiel « Vérifié+ » avec logo Rizq','Confiance maximale auprès des acheteurs','Vérification d\'identité renforcée par Rizq','Valable un an complet']};
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

function filterAds(status,btn){
  document.querySelectorAll('.sf-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const filtered = status==='all' ? MY_ADS : MY_ADS.filter(a=>a.status===status);
  renderAdsTableData(filtered);
}

function renderAdsTableData(data){
  const statMap={
    active:'<span class="status-pill status-active">● نشط</span>',
    pending:'<span class="status-pill status-pending">⏳ قيد المراجعة</span>',
    expired:'<span class="status-pill status-expired">✕ منتهي</span>',
    draft:'<span class="status-pill status-draft">✏️ مسودة</span>',
    inactive:'<span class="status-pill status-draft">⏸️ متوقف</span>',
    sold:'<span class="status-pill status-active">✔ مباع</span>',
    rejected:'<span class="status-pill status-expired">✕ مرفوض</span>'
  };
  const tbody=document.getElementById('ads-tbody');
  tbody.innerHTML=data.map(a=>`
    <tr>
      <td><div class="td-ad" onclick="window.location='rizq_browse.html?id='+encodeURIComponent('${a.id}')" style="cursor:pointer" title="عرض الإعلان"><div class="td-thumb">${iconHTML(a.emoji)}</div><div><div class="td-title" style="color:var(--gold)">${adTitleLocalized(a)}</div><div class="td-cat">${a.cat}</div></div></div></td>
      <td><div class="td-price">${a.price}</div></td>
      <td>${statMap[a.status]||''}</td>
      <td><div class="td-views">👁 ${(a.views||0).toLocaleString()}</div></td>
      <td><div class="td-stat">📞 ${a.contacts||0}</div></td>
      <td><div class="td-date">${a.date}</div></td>
      <td><div class="td-actions">
        <button class="act-btn act-edit" onclick="window.location='rizq_post.html?edit='+encodeURIComponent('${a.id}')">✏️ تعديل</button>
        <button class="act-btn act-boost" onclick="boostThisAd('${a.id}')">🚀 تعزيز</button>
        <button class="act-btn act-${a.status==='active'?'pause':'edit'}" onclick="toggleAdStatus(this,'${a.id}')">${a.status==='active'?'إيقاف':'تفعيل'}</button>
        <button class="act-btn act-delete" onclick="deleteAd(this,'${a.id}')">حذف</button>
      </div></td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">لا توجد إعلانات في هذه الفئة</td></tr>';
}

// مزامنة حالة الإعلان مع localStorage['rizq_ads'] إن كان إعلاناً حقيقياً (id يبدأ بـ RZQ-)
function syncRealAdStatus(id, newStatus){
  if(typeof id!=='string' || id.indexOf('RZQ-')!==0) return;
  try{
    var ads=JSON.parse(localStorage.getItem('rizq_ads')||'[]');
    var idx=ads.findIndex(function(x){return x.id===id;});
    if(idx>-1){ ads[idx].status=newStatus; localStorage.setItem('rizq_ads',JSON.stringify(ads)); }
  }catch(e){}
}
function removeRealAd(id){
  if(typeof id!=='string' || id.indexOf('RZQ-')!==0) return;
  try{
    var ads=JSON.parse(localStorage.getItem('rizq_ads')||'[]');
    ads=ads.filter(function(x){return x.id!==id;});
    localStorage.setItem('rizq_ads',JSON.stringify(ads));
  }catch(e){}
}

// إصلاح جوهري: كان هذا الزر يبدّل الحالة محلياً فقط (toast نجاح وهمي بلا أي
// أثر حقيقي) — لا يستدعي الخادم إطلاقاً، فتعود الحالة كما كانت عند إعادة
// التحميل لأي إعلان حقيقي غير محفوظ محلياً على هذا الجهاز بالذات. كذلك كان
// يستخدم قيمتي 'active'/'expired' غير المسموح بهما أصلاً لصاحب الإعلان في
// الخادم (PATCH /api/ads/:id يقصر إعادة التفعيل على الأدمن فقط — راجع
// ownerAllowedStatus في server.js). الآن: وضع demo يبقى تبديلاً محلياً فقط
// كما كان (صادق لأنه عرض تجريبي بلا حساب حقيقي)، أما الحساب الحقيقي فيُرسل
// طلب إيقاف حقيقي للخادم، وإعادة التفعيل تعرض رسالة صادقة بدل ادّعاء نجاح وهمي.
function toggleAdStatus(btn, id){
  const ad = MY_ADS.find(a=>String(a.id)===String(id));
  if(!ad) return;

  if(IS_DEMO || !window.RIZQ_BACKEND_BASE || !SESSION_TOKEN){
    ad.status = ad.status==='active' ? 'expired' : 'active';
    syncRealAdStatus(id, ad.status);
    showToast(_rizqLang()==='fr'?(ad.status==='active'?'▶️ Annonce activée':'⏸️ Annonce mise en pause'):(ad.status==='active'?'▶️ تم تفعيل الإعلان':'⏸️ تم إيقاف الإعلان'));
    renderAdsTableData(MY_ADS);
    return;
  }

  if(ad.status !== 'active'){
    showToast(_t2('⚠️ إعادة تفعيل إعلان متوقف تتطلب مراجعة الإدارة — غير متاح ذاتياً حالياً','⚠️ La réactivation d\'une annonce nécessite une validation par l\'administration — impossible de le faire soi-même pour l\'instant'));
    return;
  }
  if(btn && btn.disabled) return;
  var prevLabel = btn ? btn.textContent : '';
  if(btn){ btn.disabled = true; btn.textContent = _t2('...جارٍ الإيقاف','Pause...'); }
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/ads/' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) },
    body: JSON.stringify({ status: 'inactive' })
  }).then(function(r){ return r.ok ? r.json() : Promise.reject(); })
    .then(function(){
      ad.status = 'inactive';
      syncRealAdStatus(id, 'inactive');
      showToast(_t2('⏸️ تم إيقاف الإعلان','⏸️ Annonce mise en pause'));
      renderAdsTableData(MY_ADS);
    }).catch(function(){
      showToast(_t2('⚠️ تعذّر تحديث حالة الإعلان — حاول مرة أخرى','⚠️ Échec de la mise à jour — réessayez'));
    }).finally(function(){
      if(btn){ btn.disabled = false; btn.textContent = prevLabel; }
    });
}

// إصلاح جوهري: الحذف كان محلياً فقط (removeRealAd لا يؤثر إلا على إعلانات
// محفوظة في localStorage['rizq_ads'] لهذا الجهاز بالذات) — أي إعلان حقيقي
// وصل عبر _rizqMergeMyBackendAds (من جهاز آخر) لم يكن يُحذف من الخادم
// إطلاقاً رغم اختفائه المؤقت من الجدول، ليعود للظهور عند إعادة التحميل.
// الآن يُرسل طلب حذف حقيقي (DELETE /api/ads/:id) لأي إعلان حقيقي.
function deleteAd(btn, id){
  if(!confirm((_rizqLang()==='ar')?'هل أنت متأكد من حذف هذا الإعلان؟':'Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;
  if(btn && btn.disabled) return;

  function _finishDelete(){
    const idx = MY_ADS.findIndex(a=>String(a.id)===String(id));
    if(idx>-1) MY_ADS.splice(idx,1);
    removeRealAd(id);
    showToast((_rizqLang()==='ar')?'🗑️ تم حذف الإعلان':'🗑️ Annonce supprimée');
    renderAdsTableData(MY_ADS);
    renderQuickAds();
  }

  if(!IS_DEMO && window.RIZQ_BACKEND_BASE && SESSION_TOKEN && typeof id==='string' && id.indexOf('RZQ-')===0){
    var prevLabel = btn ? btn.textContent : '';
    if(btn){ btn.disabled = true; btn.textContent = _t2('...جارٍ الحذف','Suppression...'); }
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/ads/' + encodeURIComponent(id), {
      method: 'DELETE',
      headers: { 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) }
    }).then(function(r){ return r.ok ? r.json() : Promise.reject(); })
      .then(function(){ _finishDelete(); })
      .catch(function(){
        showToast((_rizqLang()==='ar')?'⚠️ تعذّر حذف الإعلان من الخادم — حاول مرة أخرى':'⚠️ Échec de la suppression sur le serveur — réessayez');
        if(btn){ btn.disabled = false; btn.textContent = prevLabel; }
      });
    return;
  }

  _finishDelete();
}

// إصلاح جوهري: زر "🚀 تعزيز" في جدول كل إعلان كان يعيد التوجيه لصفحة تسعير
// عامة (rizq_landing_v8.html#pricing) بدل استخدام آلية شراء التثبيت الحقيقية
// المبنية فعلياً في هذه الصفحة (openAdBoostPicker/selectAdToBoost/openPayModal
// + RizqSub.submitSubscriptionRequest) — كان زراً معطَّلاً وظيفياً يوهم
// المستخدم بإجراء مباشر على هذا الإعلان بالذات بينما لا علاقة له بالإعلان إطلاقاً.
function boostThisAd(id){
  var ad = MY_ADS.find(function(a){ return String(a.id)===String(id); });
  if(!ad) return;
  if((ad.status||'active') !== 'active'){
    showToast(_t2('⚠️ يمكن تعزيز الإعلانات النشطة فقط','⚠️ Seules les annonces actives peuvent être boostées'));
    return;
  }
  if(typeof RizqSub!=='undefined' && RizqSub.isAdBoosted && RizqSub.isAdBoosted(ad.id)){
    showToast(_t2('ℹ️ هذا الإعلان مثبَّت بالفعل','ℹ️ Cette annonce est déjà épinglée'));
    return;
  }
  var price = 500;
  try{
    var pkgs = JSON.parse(localStorage.getItem('rizq_individual_packages')||'[]');
    var p = pkgs.find(function(x){ return x.name==='مميزة'; });
    if(p && typeof p.price==='number') price = p.price;
  }catch(e){}
  if(typeof selectAdToBoost==='function') selectAdToBoost(ad.id, 'مميزة', price);
  else location.href='rizq_landing_v8.html#pricing';
}

function setTab(btn){
  const tabs = document.querySelectorAll('.chart-tab');
  tabs.forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const idx = Array.prototype.indexOf.call(tabs, btn);
  const tabDays = [7,30,90][idx] || 7;
  // إصلاح: كان الزر يعرض توست "جارٍ التحديث" فقط بلا أي تأثير فعلي على
  // المخطط — الآن يُعيد رسم المخطط فعلياً من بيانات الزيارات الحقيقية
  // المخزّنة (window._rizqVisitDays) للحسابات الحقيقية، ومن CHART_DATA
  // الثابت للعرض التجريبي فقط.
  if(!IS_DEMO && window._rizqVisitDays){
    _renderChartFromDays(window._rizqVisitDays, tabDays);
  } else if(!IS_DEMO){
    showToast((_rizqLang()==='ar')?'📊 جارٍ تحميل بيانات الزيارات...':'📊 Chargement des données de visites...');
  } else {
    showToast((_rizqLang()==='ar')?'📊 تحديث البيانات...':'📊 Mise à jour des données...');
  }
}

function openSidebar(){document.getElementById('sidebar').classList.add('open');document.getElementById('sb-overlay').classList.add('open');}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sb-overlay').classList.remove('open');}

let toastTimer;

// ── PROFILE: حفظ/تحميل حقيقي على هذا الجهاز (localStorage) ──
function _dashPhotoId(){
  return SESSION_ID || (IS_DEMO ? 'demo' : 'local');
}
function _dashProfileName(){
  var el = document.getElementById('pf-name');
  var typed = el && el.value ? el.value.trim() : '';
  if(typed) return typed;
  var un = document.querySelector('.user-name');
  var shown = un && un.textContent ? un.textContent.trim() : '';
  if(shown && shown !== '—') return shown;
  return '';
}
function applyDashAvatars(photo){
  if(!window.RizqProfilePhoto) return;
  var src = photo;
  if(src === undefined) src = RizqProfilePhoto.get(_dashPhotoId());
  var opts = { photo: src || '', name: _dashProfileName() };
  RizqProfilePhoto.paint(document.getElementById('dash-user-av'), opts);
  RizqProfilePhoto.paint(document.getElementById('pf-photo-preview'), opts);
  var rm = document.getElementById('pf-photo-remove');
  if(rm) rm.hidden = !opts.photo;
}
function _persistDashPhoto(data, syncServer){
  if(!window.RizqProfilePhoto) return;
  RizqProfilePhoto.set(_dashPhotoId(), data || '');
  applyDashAvatars(data || '');
  if(!syncServer || IS_DEMO || !window.RIZQ_BACKEND_BASE || !SESSION_ID) return;
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/mine/' + encodeURIComponent(SESSION_ID), {
    method: 'PATCH',
    headers: { 'Content-Type':'application/json', 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) },
    body: JSON.stringify({ thumb: data || '' })
  }).catch(function(){});
}
function loadProfile(){
  try{
    var p = JSON.parse(localStorage.getItem('rizq_user_profile') || 'null');
    if(p){
      var map = {'pf-name':'name','pf-email':'email','pf-phone':'phone','pf-city':'city'};
      Object.keys(map).forEach(function(id){
        var el = document.getElementById(id);
        if(el && p[map[id]] !== undefined) el.value = p[map[id]];
      });
      var bioEl = document.getElementById('pf-bio');
      if(bioEl && p.bio !== undefined) bioEl.value = p.bio;
    }
  }catch(e){}
  applyDashAvatars();
}
function _profileSyncsToServer(){
  return !IS_DEMO && window.RIZQ_BACKEND_BASE && SESSION_ID;
}
function applyProfileLocalNote(){
  var el = document.getElementById('pf-local-note');
  if(!el) return;
  var localHost = window.RIZQ_IS_LOCAL === true;
  el.hidden = !localHost || _profileSyncsToServer();
}
function saveProfile(){
  var profile = {
    name:  (document.getElementById('pf-name')||{}).value || '',
    email: (document.getElementById('pf-email')||{}).value || '',
    phone: (document.getElementById('pf-phone')||{}).value || '',
    city:  (document.getElementById('pf-city')||{}).value || '',
    bio:   (document.getElementById('pf-bio')||{}).value || ''
  };
  if(window.RizqProfilePhoto){
    var photo = RizqProfilePhoto.get(_dashPhotoId());
    if(photo) profile.photo = photo;
  }
  localStorage.setItem('rizq_user_profile', JSON.stringify(profile));
  applyDashAvatars();
  if(_profileSyncsToServer()){
    var body = { name: profile.name, email: profile.email, phone: profile.phone, city: profile.city, desc: profile.bio };
    if(window.RizqProfilePhoto) body.thumb = RizqProfilePhoto.get(_dashPhotoId()) || '';
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/mine/' + encodeURIComponent(SESSION_ID), {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json', 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) },
      body: JSON.stringify(body)
    }).catch(function(){});
  }
  var synced = _profileSyncsToServer();
  showToast(synced
    ? ((_rizqLang()==='ar')?'✅ تم حفظ التغييرات':'✅ Modifications enregistrées')
    : ((_rizqLang()==='ar')?'✅ تم حفظ التغييرات على هذا الجهاز':'✅ Modifications enregistrées sur cet appareil'));
}
(function wireDashPhotoUpload(){
  var pick = document.getElementById('pf-photo-pick');
  var file = document.getElementById('pf-photo-file');
  var rm = document.getElementById('pf-photo-remove');
  var nameEl = document.getElementById('pf-name');
  if(pick && file){
    pick.addEventListener('click', function(){ file.click(); });
    file.addEventListener('change', function(){
      var f = file.files && file.files[0];
      file.value = '';
      if(!f || !window.RizqProfilePhoto) return;
      RizqProfilePhoto.compress(f, function(err, data){
        if(err){
          var ar = (_rizqLang()==='ar');
          if(err.message === 'too_big') showToast(ar ? 'الصورة كبيرة جداً — اختر صورة أصغر من 8 ميغا' : 'Image trop lourde — choisissez un fichier de moins de 8 Mo');
          else showToast(ar ? 'تعذّر قراءة الصورة — جرّب ملف JPG أو PNG' : 'Impossible de lire l\'image — essayez un fichier JPG ou PNG');
          return;
        }
        _persistDashPhoto(data, true);
        showToast((_rizqLang()==='ar')?'✅ تم رفع الصورة — تظهر على ملفك العام':'✅ Photo enregistrée — elle apparaît sur votre profil public');
      });
    });
  }
  if(rm){
    rm.addEventListener('click', function(){
      _persistDashPhoto('', true);
      showToast((_rizqLang()==='ar')?'تمت إزالة الصورة':'Photo retirée');
    });
  }
  if(nameEl){
    nameEl.addEventListener('input', function(){ applyDashAvatars(); });
  }
})();

// ── إخفاء رقم الهاتف — إصلاح جوهري (2026-08-05): كان الزر يُبدّل شكله
// فقط (this.classList.toggle('on')) بلا أي تخزين إطلاقاً — يعود لوضعه
// الافتراضي مع أي تحميل صفحة جديد. الآن يُخزَّن فعلياً عبر PATCH
// /api/accounts/mine/:id (حقل hidePhone الجديد). ملاحظة صادقة: صفحة
// الإعلان العامة (rizq_listing.html) أصلاً لا تُظهر رقم هاتف حقيقي لأي
// حساب فردي إطلاقاً (قرار خصوصية سابق متعمَّد — ACCOUNT_PUBLIC_FIELDS
// بـserver.js لا يُخرج phone لغير صاحب الحساب/الأدمن أبداً)، فهذا
// التفضيل يُخزَّن للاستخدام المستقبلي (مثل نظام الرسائل) بدل أن يُفقَد.
function toggleHidePhone(btn){
  if(IS_DEMO){
    btn.classList.toggle('on');
    showToast((_rizqLang()==='ar')?'👁 وضع تجريبي — لا يُحفَظ فعلياً':'👁 Mode démo — non enregistré réellement');
    return;
  }
  if(!window.RIZQ_BACKEND_BASE || !SESSION_ID){ showToast((_rizqLang()==='ar')?'⚠️ متاح فقط لحساب حقيقي متصل بالخادم':'⚠️ Disponible uniquement pour un compte réel connecté au serveur'); return; }
  if(btn.disabled) return;
  var newVal = !btn.classList.contains('on');
  btn.disabled = true;
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/mine/' + encodeURIComponent(SESSION_ID), {
    method: 'PATCH',
    headers: { 'Content-Type':'application/json', 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) },
    body: JSON.stringify({ hidePhone: newVal })
  }).then(function(r){ return r.ok ? r.json() : Promise.reject(); })
    .then(function(){
      btn.classList.toggle('on', newVal);
      showToast(newVal ? ((_rizqLang()==='ar')?'✅ تم إخفاء رقم هاتفك':'✅ Votre numéro a été masqué') : ((_rizqLang()==='ar')?'✅ رقم هاتفك ظاهر الآن':'✅ Votre numéro est visible'));
    }).catch(function(){
      showToast((_rizqLang()==='ar')?'⚠️ تعذّر الحفظ — حاول مرة أخرى':'⚠️ Échec de l\'enregistrement — réessayez');
    }).finally(function(){ btn.disabled = false; });
}
// ── إشعارات البريد/SMS: لا يوجد أي نظام إرسال فعلي مرتبط بحدث لأي مستخدم
// عادي بكل المنصة (الـSMS الوحيد الموجود هو بث إداري يدوي من الأدمن —
// POST /api/broadcast-sms — وليس إشعاراً تلقائياً عند كل تواصل). بدل بناء
// تخزين وهمي يوحي بأن التفضيل يُفعِّل شيئاً غير موجود، نُبقي المفتاحين
// تفاعليين بصرياً (تجربة استخدام متّسقة) لكن مع رسالة صادقة توضّح أنهما
// عرض فقط حالياً — نفس نهج changePassword() أعلاه بالضبط.
function toggleNotifPref(btn){
  btn.classList.toggle('on');
  showToast((_rizqLang()==='ar')?'⚠️ نظام إشعارات حقيقي (بريد/SMS) قيد التطوير — هذا المفتاح للعرض فقط حالياً':'⚠️ Le système de notifications réel (e-mail/SMS) est en cours de développement — ce commutateur est pour l\'instant indicatif uniquement');
}
function initSecurityToggles(){
  var btn = document.getElementById('toggle-hide-phone');
  if(!btn || IS_DEMO || !window.RIZQ_BACKEND_BASE || !SESSION_ID) return;
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/mine/' + encodeURIComponent(SESSION_ID), {
    headers: { 'x-account-token': (window.REAL_ACCESS_TOKEN || SESSION_TOKEN) }
  }).then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      var acc = data && data.ok ? data.account : null;
      if(acc) btn.classList.toggle('on', !!acc.hidePhone);
    }).catch(function(){});
}

// ── PASSWORD: تغيير كلمة المرور عبر الخادم (bcrypt) ──
function changePassword(){
  var cur = document.getElementById('pw-current').value;
  var nw  = document.getElementById('pw-new').value;
  var cf  = document.getElementById('pw-confirm').value;
  if(!cur || !nw || !cf){ showToast((_rizqLang()==='ar')?'⚠️ عبّئ جميع الحقول':'⚠️ Remplissez tous les champs'); return; }
  if(nw.length < 8){ showToast((_rizqLang()==='ar')?'⚠️ كلمة المرور الجديدة قصيرة جداً':'⚠️ Le nouveau mot de passe est trop court'); return; }
  if(nw !== cf){ showToast((_rizqLang()==='ar')?'⚠️ كلمتا المرور غير متطابقتين':'⚠️ Les mots de passe ne correspondent pas'); return; }
  if(IS_DEMO){ showToast(_t2('👁 وضع تجريبي','👁 Mode démo')); return; }
  var tok = window.REAL_ACCESS_TOKEN || SESSION_TOKEN;
  if(!SESSION_ID || !tok || !window.RizqAccount || typeof window.RizqAccount.changePasswordAsync !== 'function'){
    showToast(_t2('⚠️ متاح فقط لحساب حقيقي متصل بالخادم','⚠️ Compte réel requis'));
    return;
  }
  window.RizqAccount.changePasswordAsync(SESSION_ID, tok, cur, nw).then(function(res){
    if(res && res.ok){
      document.getElementById('pw-current').value='';
      document.getElementById('pw-new').value='';
      document.getElementById('pw-confirm').value='';
      showToast(_t2('✅ تم تحديث كلمة المرور','✅ Mot de passe mis à jour'));
      return;
    }
    var msg = (res && res.error) || _t2('تعذّر التحديث','Échec de la mise à jour');
    if(res && res.code === 'invalid_current') msg = _t2('كلمة المرور الحالية غير صحيحة','Mot de passe actuel incorrect');
    showToast('⚠️ ' + msg);
  }).catch(function(){ showToast(_t2('⚠️ تعذّر الاتصال','⚠️ Connexion impossible')); });
}

// ── تعطيل الحساب مؤقتاً: ميزة جديدة (09/08/2026) — تُرسِل طلباً حقيقياً
// عبر POST /api/deactivation-requests (نفس الخادم المبني لداشبورد المحل)
// يراجعه الأدمن من لوحة "المستخدمون"؛ لا يُعطِّل الحساب فوراً بذاته.
function deactivateAccount(){
  if(!confirm(_t2('هل تريد تعطيل حسابك مؤقتاً؟','Voulez-vous désactiver temporairement votre compte ?'))) return;
  if(IS_DEMO){
    showToast(_t2('👁 وضع تجريبي — لا يُرسَل فعلياً','👁 Mode démo — non envoyé réellement'));
    return;
  }
  if(!window.RIZQ_BACKEND_BASE || !SESSION_ID){
    showToast(_t2('⚠️ متاح فقط لحساب حقيقي متصل بالخادم','⚠️ Disponible uniquement pour un compte réel connecté au serveur'));
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
        : _t2('✅ تم إرسال طلب التعطيل — ستراجعه الإدارة','✅ Demande de désactivation envoyée — elle sera examinée par l\'administration'));
    }).catch(function(){
      showToast(_t2('⚠️ تعذّر إرسال الطلب — حاول مرة أخرى','⚠️ Échec de l\'envoi de la demande — réessayez'));
    }).finally(function(){
      if(btn){ btn.disabled = false; btn.textContent = prevLabel; }
    });
}

// ── حذف الحساب: إجراء حقيقي محلي (يمسح بيانات هذا الجهاز فقط، لا يوجد خادم مركزي بعد) ──
function confirmDeleteAccount(){
  var ok = confirm((_rizqLang()==='ar')?'هل أنت متأكد من حذف بياناتك من هذا الجهاز؟ سيتم مسح إعلاناتك المحفوظة محلياً وملفك الشخصي ولا يمكن التراجع عن هذا الإجراء.':'Êtes-vous sûr de vouloir supprimer vos données de cet appareil ? Vos annonces enregistrées localement et votre profil seront effacés, et cette action est irréversible.');
  if(!ok) return;
  try{
    localStorage.removeItem('rizq_ads');
    localStorage.removeItem('rizq_user_profile');
    localStorage.removeItem('rizq_cart');
  }catch(e){}
  showToast((_rizqLang()==='ar')?'✅ تم حذف بيانات حسابك من هذا الجهاز':'✅ Les données de votre compte ont été supprimées de cet appareil');
  setTimeout(function(){ location.href='rizq_landing_v8.html'; }, 1500);
}

// ═══════════════════════════════════════════════════════════════
// SESSION / ACCESS — الحساب الفردي (غير التجاري)
// ═══════════════════════════════════════════════════════════════
const params = new URLSearchParams(window.location.search);
var SESSION_ID = '';
var SESSION_TOKEN = '';
const IS_DEMO = params.get('demo') === '1';
(function rizqHydrateDashSession(){
  if(IS_DEMO) return;
  if(window.RizqAccount && typeof window.RizqAccount.recoverSessionParams === 'function'){
    var rec = window.RizqAccount.recoverSessionParams('individual');
    if(rec){ SESSION_ID = rec.id || ''; SESSION_TOKEN = rec.token || ''; return; }
  }
  SESSION_ID = params.get('id') || '';
  SESSION_TOKEN = params.get('token') || '';
  if(SESSION_ID && !SESSION_TOKEN && window.RizqAccount && typeof window.RizqAccount.readDashToken === 'function'){
    SESSION_TOKEN = window.RizqAccount.readDashToken(SESSION_ID);
  }
})();
if(typeof applyDashAvatars === 'function') applyDashAvatars();


// قائمة مستويات باقة المناقصة (شهرية/ربعية/سنوية) — تُقرأ من مخزون الأدمن
// المتزامن محلياً، وإلا نرجع لنفس القيم الافتراضية المعرَّفة في PKG_DEFAULTS.tender
// داخل rizq_admin.html (راجع تعليق التوسيع هناك بتاريخ 24/07/2026).

function renderTenderSubStatus(){
  var fr = (_rizqLang()==='fr');
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
        ? RizqSub.renderPackageCardsHTML(_tenderPkgList(), FEATS, ICONS, _rizqLang(), 'tender').grid
        : '';
      el.innerHTML = '<div style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:12px;padding:14px;font-size:12.5px;color:#92400e">🔒 ' + lockMsg + '</div>'
        + '<div style="margin-top:14px">' + cardsHtml + '</div>';
    }).catch(function(){
      el.innerHTML = '<p style="font-size:12px;color:var(--text-muted)">'+(fr?'Impossible de vérifier l\'abonnement' : 'تعذّر التحقق من حالة الاشتراك')+'</p>';
    });
}

function renderMyTenders(){
  var fr = (_rizqLang()==='fr');
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
        return '<div style="margin-bottom:14px;border:1px solid #e2e8f5;border-radius:14px;padding:14px;background:#fff">'
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

const DEMO_ACCOUNT = { id: "demo", name: "", phone: "", email: "", wilaya: "" };

let USER_ACC = null;

// ═══════════════════════════════════════════════════════════════
// إصلاح جوهري (2026-08-05): SESSION_TOKEN (من رابط الداشبورد ?token=)
// هو dashToken — مختلف تماماً عن accessToken الحقيقي الذي يتطلبه
// verifyAccountOwner() بالخادم لكل فعل كتابة حقيقي (إيقاف/حذف/تعديل
// إعلان، مناقصات...). كل استدعاءات x-account-token في هذا الملف كانت
// ترسل SESSION_TOKEN مباشرة — تفشل دائماً بـ401 من الخادم لأنه ليس نفس
// accessToken. الحل: window.REAL_ACCESS_TOKEN يُحل من مصدرين —
// (أ) rizq_pending_accounts[].backendAccessToken المحفوظ محلياً وقت
//     التسجيل (نفس الجهاز — rizq_landing_v8.html، _syncAccountToBackend)
// (ب) وإلا POST /api/accounts/exchange-dash-token/:id (endpoint منفصل —
//     verify-dash لا يُعيد accessToken مباشرة لأسباب أمنية).
// ═══════════════════════════════════════════════════════════════

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

function verifyAccess(){
  if(IS_DEMO) return DEMO_ACCOUNT;
  if(!SESSION_ID || !SESSION_TOKEN) return false;
  const accs = JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');
  return accs.find(a=>a.id===SESSION_ID && a.token===SESSION_TOKEN && a.status==='approved' && a.type==='individual') || null;
}

// ── إصلاح جوهري: عند فتح المستخدم رابط داشبوردة من جهازه الخاص (وليس نفس
// متصفح الأدمن)، لا يوجد محلياً سجل لهذا الحساب — كانت الصفحة ترفض الوصول
// رغم أن الحساب مُفعَّل فعلياً على الخادم. نحاول التحقق من الخادم قبل الرفض.
function verifyAccessRemote(){
  return new Promise(function(resolve){
    if(!window.RIZQ_BACKEND_BASE || !SESSION_ID || !SESSION_TOKEN){ resolve(null); return; }
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/accounts/verify-dash/' + encodeURIComponent(SESSION_ID), { method:'POST', headers:{'Content-Type':'application/json','x-dash-token':SESSION_TOKEN}, body:JSON.stringify({dashToken:SESSION_TOKEN}) })
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(data){
        if(!data || !data.ok || !data.account || data.account.type!=='individual'){ resolve(null); return; }
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
  var el = document.getElementById('access-denied');
  if(el && !SESSION_ID && !SESSION_TOKEN){
    var h2 = el.querySelector('h2');
    var p = el.querySelector('p');
    if(h2) h2.textContent = (_rizqLang()==='fr') ? 'Connexion requise' : 'يجب تسجيل الدخول';
    if(p) p.innerHTML = (_rizqLang()==='fr')
      ? 'Connectez-vous ou créez un compte pour accéder à votre tableau de bord sur <span style="color:var(--gold);font-weight:900">Rizq</span>.'
      : 'سجّل الدخول أو أنشئ حساباً للوصول إلى لوحة التحكم على <span style="color:var(--gold);font-weight:900">رزق</span>.';
    var home = el.querySelector('a[href*="rizq_landing"]');
    if(home){
      home.textContent = (_rizqLang()==='fr') ? 'Se connecter' : 'تسجيل الدخول';
      home.href = 'rizq_landing_v8.html?openLogin=1';
    }
  }
  document.getElementById('access-denied').style.display='flex';
  document.getElementById('sidebar').style.display='none';
  document.querySelector('.main-content').style.display='none';
}

// لغة ثنائية آمنة (لا تعتمد على المتغير (_rizqLang()==='ar') المحصور داخل IIFE منفصل — انظر _rizqLang أعلاه)
function _t2(ar, fr){ return (_rizqLang()==='fr') ? fr : ar; }

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION LIFECYCLE UI — يستخدم RizqSub engine (نفس نمط لوحات المحل/المكتب/الشركة)
// ═══════════════════════════════════════════════════════════════
function initSubscriptionLifecycle(accId, accType){
  if(!accId || typeof RizqSub === 'undefined') return;
  RizqSub.runLifecycleCheck(accId, {
    onActive: function(sub){},
    onTrial: function(sub){
      _showSubBanner({icon:'🎁',color:'#0891b2',
        title:_t2('أنت في الفترة التجريبية المجانية','Vous êtes en période d\'essai gratuite'),
        msg:_t2('تنتهي خلال <strong>'+sub.daysLeft+'</strong> يوم — اشترك الآن لتحتفظ بمزاياك','Elle expire dans <strong>'+sub.daysLeft+'</strong> jour(s) — abonnez-vous maintenant'),
        cta:_t2('🚀 اشترك الآن','🚀 S\'abonner maintenant'), ctaFn:'_openRenewalPanel()'});
    },
    onExpiringReminder: function(sub){
      _showSubBanner({icon:'⚠️',color:'#d97706',
        title:_t2('باقتك تنتهي '+(sub.daysLeft<=0?'اليوم':'غداً')+'!','Votre forfait expire '+(sub.daysLeft<=0?'aujourd\'hui':'demain')+'!'),
        msg:_t2('جدّد باقة <strong>'+sub.pkg+'</strong> الآن حتى لا تفقد مزاياك','Renouvelez le forfait <strong>'+sub.pkg+'</strong> maintenant pour ne pas perdre vos avantages'),
        cta:_t2('🔄 جدّد الآن','🔄 Renouveler maintenant'), ctaFn:'_openRenewalPanel()', urgent:true});
    },
    onExpired: function(sub){
      _showSubBanner({icon:'🔒',color:'#dc2626',
        title:_t2('انتهت باقتك — '+sub.pkg,'Votre forfait a expiré — '+sub.pkg),
        msg:_t2('حسابك على الخطة المجانية — جدّد للاستفادة من كل المزايا','Compte gratuit — renouvelez pour profiter de tous les avantages'),
        cta:_t2('♻️ جدّد الاشتراك','♻️ Renouveler l\'abonnement'), ctaFn:'_openRenewalPanel()', persistent:true});
    },
    onNoSubscription: function(sub){
      _showSubBanner({icon:'📦',color:'#1B3A6B',
        title:_t2('لا يوجد اشتراك نشط','Aucun abonnement actif'),
        msg:_t2('اختر باقة لتفعيل جميع مزايا حسابك على رزق','Choisissez un forfait pour activer tous les avantages de votre compte Rizq'),
        cta:_t2('📦 اختر باقة','📦 Choisir un forfait'), ctaFn:'_openRenewalPanel()'});
    }
  });
}

function _showSubBanner(opts){
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
    +(opts.persistent?'':'<button onclick="document.getElementById(\'rizq-sub-banner\').remove()" style="font-size:10px;color:#9ca3af;background:none;border:none;cursor:pointer">'+_t2('تذكيرني لاحقاً','Me rappeler plus tard')+'</button>')
    +'</div>';
  var slot = document.getElementById('rizq-sub-slot') || document.querySelector('.page-content');
  if(slot) slot.insertBefore(banner, slot.firstChild);
  else document.body.appendChild(banner);
  if(opts.urgent && !document.getElementById('sub-pulse-style')){
    var st = document.createElement('style');
    st.id = 'sub-pulse-style';
    st.textContent = '@keyframes pulse{0%,100%{box-shadow:0 8px 32px rgba(217,119,6,.2)}50%{box-shadow:0 8px 40px rgba(217,119,6,.5)}}';
    document.head.appendChild(st);
  }
}

function _openRenewalPanel(){
  var navItem = document.querySelector('.nav-item[onclick*="subscription"]');
  if(navItem){ navItem.click(); return; }
  var panel = document.getElementById('panel-subscription');
  if(panel) panel.scrollIntoView({behavior:'smooth'});
}

function getSubInfo(){
  if(typeof RizqSub !== 'undefined' && SESSION_ID){
    var sub = RizqSub.checkSubscription(SESSION_ID);
    if(sub.status !== 'no_subscription'){
      var isExpired = sub.status==='expired';
      var isTrial = sub.status==='trial' || sub.status==='trial_expiring';
      var isExpiringSoon = sub.status==='expiring_soon' || sub.status==='trial_expiring';
      var totalDays = (sub.acc && sub.acc.pkg_days) ? sub.acc.pkg_days : (isTrial?3:30);
      var pkgName = (sub.acc && (sub.acc.pkg_name || sub.acc.package || sub.acc.plan)) || '';
      return {daysLeft:sub.daysLeft, isTrial:isTrial, isExpired:isExpired, isExpiringSoon:isExpiringSoon, pct: Math.max(0,Math.min(100,(sub.daysLeft/Math.max(1,totalDays))*100)), pkgName:pkgName, status:sub.status};
    }
  }
  var trialEnd = new Date((USER_ACC&&USER_ACC.trial_ends)||Date.now());
  var daysLeft = Math.max(0,Math.ceil((trialEnd-new Date())/86400000));
  var isTrial = !(USER_ACC&&USER_ACC.plan);
  var isExpired = daysLeft===0;
  var totalDays = isTrial ? 3 : 30;
  return {daysLeft:daysLeft, isTrial:isTrial, isExpired:isExpired, isExpiringSoon: !isTrial && !isExpired && daysLeft<=5, pct: Math.max(0,Math.min(100,(daysLeft/totalDays)*100)), pkgName:(USER_ACC&&USER_ACC.plan)||'', status:isExpired?'expired':(isTrial?'trial':'active')};
}

function updateSidebarUser(acc){
  var nameEl = document.getElementById('dash-user-name') || document.querySelector('.user-name');
  var badgeEl = document.getElementById('dash-user-badge');
  var planEl = document.getElementById('dash-user-plan');
  if(nameEl && acc && acc.name) nameEl.textContent = acc.name;
  var verified = !!(acc && (acc.id_verified || acc.verified || acc.status==='approved'));
  if(badgeEl){
    badgeEl.textContent = verified ? _t2('✅ موثّق','✅ Vérifié') : _t2('⏳ بانتظار التوثيق','⏳ Vérification en attente');
    badgeEl.style.color = verified ? '' : '#fbbf24';
  }
  if(planEl){
    var info = getSubInfo();
    var planLabel;
    if(info.isExpired) planLabel = _t2('خطة: منتهية','Forfait : expiré');
    else if(info.isTrial) planLabel = _t2('خطة: تجريبية','Forfait : essai');
    else if(info.pkgName) planLabel = _t2('خطة: ','Forfait : ')+info.pkgName;
    else planLabel = _t2('خطة: نشطة','Forfait : actif');
    planEl.textContent = planLabel;
  }
}

function updateProfileAccountStats(acc){
  var sinceEl = document.getElementById('pf-stat-since');
  var adsEl = document.getElementById('pf-stat-ads');
  var statusEl = document.getElementById('pf-stat-status');
  var planEl = document.getElementById('pf-stat-plan');
  var ratingEl = document.getElementById('pf-stat-rating');
  var sinceDate = (acc && (acc.approvedAt || acc.createdAt || acc.created_at)) || null;
  if(sinceEl){
    if(sinceDate){
      try{
        sinceEl.textContent = new Date(sinceDate).toLocaleDateString(_rizqLang()==='fr'?'fr-FR':'ar-MR-u-nu-latn',{year:'numeric',month:'long'});
      }catch(e){ sinceEl.textContent = '—'; }
    } else sinceEl.textContent = '—';
  }
  if(adsEl) adsEl.textContent = String((MY_ADS||[]).length) + ' ' + _t2('إعلان','annonce(s)');
  var verified = !!(acc && (acc.id_verified || acc.verified || acc.status==='approved'));
  if(statusEl){
    statusEl.textContent = verified ? _t2('✅ موثّق','✅ Vérifié') : _t2('⏳ غير موثّق بعد','⏳ Pas encore vérifié');
    statusEl.style.color = verified ? 'var(--green)' : '#f59e0b';
  }
  var info = getSubInfo();
  if(planEl){
    if(info.isExpired) planEl.textContent = _t2('منتهية','Expiré');
    else if(info.isTrial) planEl.textContent = _t2('تجريبية','Essai');
    else planEl.textContent = info.pkgName || _t2('نشطة','Actif');
  }
  if(ratingEl && ratingEl.textContent === '—'){
    ratingEl.textContent = _t2('جارٍ التحميل...','Chargement...');
  }
}

function renderSubscriptionPanel(){
  var info = getSubInfo();
  var daysLeft=info.daysLeft, isTrial=info.isTrial, isExpired=info.isExpired, isExpiringSoon=info.isExpiringSoon;
  var wrap = document.getElementById('sub-card-wrap');
  if(!wrap) return;
  var bg = isExpired?'linear-gradient(145deg,#fef2f2,#fee2e2)':isTrial?'linear-gradient(145deg,#f0fdf4,#dcfce7)':'linear-gradient(145deg,#f8faff,#eff3ff)';
  var border = isExpired?'1.5px solid #fca5a5':isTrial?'1.5px solid #86efac':'1.5px solid #bfcfef';
  var statusText = isExpired?_t2('❌ انتهى الاشتراك','❌ Abonnement expiré'):isTrial?_t2('🎁 فترة تجريبية مجانية','🎁 Période d\'essai gratuite'):_t2('✅ اشتراك نشط','✅ Abonnement actif');
  var expiresText = isExpired?_t2('انتهى الاشتراك — جدّد الآن','Abonnement expiré — renouvelez maintenant'):isTrial?_t2('الفترة التجريبية تنتهي خلال '+daysLeft+' يوم','La période d\'essai se termine dans '+daysLeft+' jour(s)'):_t2('ينتهي خلال '+daysLeft+' يوماً','Expire dans '+daysLeft+' jour(s)');
  wrap.innerHTML = '<div style="position:relative;border-radius:16px;padding:22px;background:'+bg+';border:'+border+';overflow:hidden">'
    +'<div style="position:absolute;top:14px;left:16px;opacity:.1;font-size:60px">💳</div>'
    +'<div style="font-size:15px;font-weight:800;color:#1a2535">'+statusText+'</div>'
    +'<div style="font-size:12.5px;color:var(--text-muted);margin-top:4px">'+expiresText+'</div>'
    +(!isExpired?'<div style="margin-top:12px;height:6px;background:rgba(0,0,0,.06);border-radius:4px;overflow:hidden"><div style="height:100%;width:'+info.pct+'%;background:linear-gradient(135deg,var(--gold),var(--gold-light))"></div></div>':'')
    +'<div style="margin-top:16px"><button class="btn-save" style="width:auto;padding:9px 18px" onclick="document.getElementById(\'packages-display\').scrollIntoView({behavior:\'smooth\'})">'+_t2('🔄 عرض الباقات','🔄 Voir les forfaits')+'</button></div>'
    +'</div>'
    +(isExpiringSoon||isExpired?'<div style="margin-top:12px;text-align:center;background:#fff;border:1px solid #fde68a;border-radius:12px;padding:12px">'
      +'<div style="font-size:12.5px;font-weight:700;color:#92400e">'+(isExpired?_t2('⛔ انتهى اشتراكك — جدد الآن لاستعادة كل المزايا','⛔ Votre abonnement a expiré — renouvelez maintenant'):_t2('⚠️ اشتراكك سينتهي بعد '+daysLeft+' أيام','⚠️ Votre abonnement expire dans '+daysLeft+' jours'))+'</div>'
      +'</div>':'');
}

function renderMyInvoices(){
  var wrap = document.getElementById('my-invoices-wrap');
  if(!wrap) return;
  var accounts0 = JSON.parse(localStorage.getItem('rizq_accounts')||'{}');
  var hasServerToken = !!(accounts0[SESSION_ID] && accounts0[SESSION_ID].server_token);
  if(typeof RizqSub === 'undefined' || typeof RizqSub.fetchInvoices !== 'function'){
    if(typeof RizqInvoice === 'undefined'){ wrap.innerHTML=''; return; }
    _paintInvoices(RizqInvoice.getInvoicesForAccount(SESSION_ID) || [], true);
    return;
  }
  wrap.innerHTML = '<div class="settings-card"><div class="settings-card-title">'+_t2('🧾 فواتيري','🧾 Mes factures')+'</div>'
    + '<p style="color:var(--text-muted);font-size:12.5px;padding:6px 0">'+_t2('جارٍ التحميل...','Chargement...')+'</p></div>';
  RizqSub.fetchInvoices(SESSION_ID).then(function(invs){ _paintInvoices(invs||[], !hasServerToken); }).catch(function(){ _paintInvoices([], !hasServerToken); });
}

function _paintInvoices(invs, isLocalSource){
  var wrap = document.getElementById('my-invoices-wrap');
  if(!wrap) return;
  if(!invs.length){
    wrap.innerHTML = '<div class="settings-card"><div class="settings-card-title">'+_t2('🧾 فواتيري','🧾 Mes factures')+'</div>'
      + '<p style="color:var(--text-muted);font-size:13px;padding:10px 0">'+_t2('لا توجد فواتير بعد','Aucune facture pour le moment')+'</p></div>';
    return;
  }
  var canPrintLocal = isLocalSource && (typeof RizqInvoice !== 'undefined');
  var rows = invs.map(function(inv){
    var amount = inv.price>0 ? Number(inv.price).toLocaleString()+' MRU' : _t2('مجاناً','Gratuit');
    var dateStr = '-';
    try{ dateStr = new Date(inv.issuedAt).toLocaleDateString(); }catch(e){}
    var printBtn = (canPrintLocal && inv.id)
      ? '<button class="act-btn act-edit" onclick="RizqInvoice.openInvoice(\''+escapeHtml(inv.id)+'\')">🖨️ '+_t2('عرض/طباعة','Voir/Imprimer')+'</button>'
      : '<span style="font-size:11.5px;color:var(--text-muted)">'+_t2('أُرسلت عبر واتساب/بريد','Envoyée par WhatsApp/e-mail')+'</span>';
    return '<tr>'
      + '<td style="padding:8px;font-size:12.5px">'+escapeHtml(inv.number)+'</td>'
      + '<td style="padding:8px;font-size:12.5px">'+escapeHtml(inv.pkgName)+'</td>'
      + '<td style="padding:8px;font-size:12.5px;font-weight:700;color:#C9A84C">'+escapeHtml(amount)+'</td>'
      + '<td style="padding:8px;font-size:12.5px">'+escapeHtml(dateStr)+'</td>'
      + '<td style="padding:8px;font-size:12.5px">'+printBtn+'</td>'
      + '</tr>';
  }).join('');
  wrap.innerHTML = '<div class="settings-card"><div class="settings-card-title">'+_t2('🧾 فواتيري','🧾 Mes factures')+'</div>'
    + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">'
    + '<thead><tr style="background:#f8faff;text-align:'+(document.documentElement.dir==='rtl'?'right':'left')+'">'
    + '<th style="padding:8px;font-size:12px;color:var(--text-muted)">'+_t2('رقم الإيصال','N° reçu')+'</th>'
    + '<th style="padding:8px;font-size:12px;color:var(--text-muted)">'+_t2('الباقة','Forfait')+'</th>'
    + '<th style="padding:8px;font-size:12px;color:var(--text-muted)">'+_t2('المبلغ','Montant')+'</th>'
    + '<th style="padding:8px;font-size:12px;color:var(--text-muted)">'+_t2('تاريخ الإصدار','Date d\'émission')+'</th>'
    + '<th style="padding:8px;font-size:12px;color:var(--text-muted)"></th>'
    + '</tr></thead><tbody>'+rows+'</tbody></table></div></div>';
}

function renderPackagesDisplay(){
  var pkgs=[];
  try{
    if(window.RizqPackagesConfig && typeof RizqPackagesConfig.getCatalog==='function'){
      pkgs=RizqPackagesConfig.getCatalog('individual', _rizqLang()).filter(function(p){return p.active!==false;});
    }
  }catch(e){ pkgs=[]; }
  if(!pkgs.length){
    try{ pkgs=JSON.parse(localStorage.getItem('rizq_individual_packages')||'[]').filter(function(p){return p.active!==false;}); }catch(e){ pkgs=[]; }
  }
  var el=document.getElementById('packages-display'); if(!el) return;

  // إصلاح جوهري 24/07/2026: هذا الكتالوج الاحتياطي (وأسماؤه/ميزاته) كان مختلفاً
  // تماماً عن الكتالوج الحقيقي الذي يديره الأدمن (PKG_DEFAULTS.individual في
  // rizq_admin.html: مجانية/مميزة/باقة شهرية) — يعني المشترك كان يرى ويشترك في
  // باقات بأسماء ومزايا لا تطابق ما يديره الأدمن فعلياً. تم توحيدهما الآن.
  var FEATS_AR={'مجانية':['إعلان واحد نشط','حتى 5 صور للإعلان','ظهور في نتائج البحث العادية'],'مميزة':['تثبيت أعلى النتائج لمدة 3 أيام','حتى 5 صور للإعلان','شارة "إعلان مميز"'],'باقة متوسطة':['حتى 5 إعلانات نشطة شهرياً','حتى 5 صور لكل إعلان','إمكانيات الإدارة والتعديل طوال الشهر'],'باقة شهرية':['حتى 10 إعلانات نشطة شهرياً','حتى 5 صور لكل إعلان','تجديد تلقائي للإعلانات']};
  var FEATS_FR={'مجانية':['1 annonce active','Jusqu\'à 5 photos par annonce','Visibilité standard dans les résultats'],'مميزة':['Épinglage en tête des résultats pendant 3 jours','Jusqu\'à 5 photos par annonce','Badge "Annonce en vedette"'],'باقة متوسطة':['Jusqu\'à 5 annonces actives par mois','Jusqu\'à 5 photos par annonce','Gestion et modification pendant tout le mois'],'باقة شهرية':['Jusqu\'à 10 annonces actives par mois','Jusqu\'à 5 photos par annonce','Renouvellement automatique des annonces']};
  var FEATS=(_rizqLang()==='fr')?FEATS_FR:FEATS_AR;
  var ICONS={'مجانية':'🎁','مميزة':'⭐','باقة متوسطة':'📦','باقة شهرية':'📅'};

  var DEF=[{name:'مجانية',duration:'10 أيام',price:0},{name:'مميزة',duration:'30 يوماً',price:300,period:'لكل إعلان'},{name:'باقة متوسطة',duration:'شهر',price:1000},{name:'باقة شهرية',duration:'شهر',price:2000,highlight:true}];
  var list=pkgs.length?pkgs:DEF;

  if(typeof RizqSub === 'undefined' || typeof RizqSub.renderPackageCardsHTML !== 'function'){ el.innerHTML=''; return; }
  var r=RizqSub.renderPackageCardsHTML(list,FEATS,ICONS,_rizqLang());
  el.innerHTML=r.grid;
  var rp=document.getElementById('renewal-packages');
  if(rp) rp.innerHTML=r.renewal;
}

// ── Rizq ADS — باقات إعلان الفيديو (فئة video) ──
function renderVideoPackagesDisplay(){
  var el=document.getElementById('rizq-ads-packages-display'); if(!el) return;
  var lang=_rizqLang();
  var pkgs=[];
  if(typeof RizqPackagesConfig!=='undefined' && typeof RizqPackagesConfig.getCatalog==='function'){
    try{ pkgs=RizqPackagesConfig.getCatalog('video', lang).filter(function(p){return p.active!==false;}); }catch(e){}
  }
  if(!pkgs.length){ try{ pkgs=JSON.parse(localStorage.getItem('rizq_video_packages')||'[]').filter(function(p){return p.active!==false;}); }catch(e){ pkgs=[]; } }
  if(!pkgs.length && window.RizqPackagesConfig && RizqPackagesConfig.CATALOGS && RizqPackagesConfig.CATALOGS.video){
    pkgs=JSON.parse(JSON.stringify(RizqPackagesConfig.CATALOGS.video));
  }
  var FEATS_AR={
    'إعلان فيديو واحد':['فيديو إعلاني واحد لمدة 10 أيام','ظهور في قسم الإعلانات بالصفحة الرئيسية','دفع لكل إعلان — بلا اشتراك شهري'],
    'أساسي فيديو':['حتى 3 فيديوهات إعلانية ترويجية شهرياً','ظهور في قسم الإعلانات بالصفحة الرئيسية','إحصائيات أداء أساسية آلية'],
    'احترافي فيديو':['حتى 10 فيديوهات إعلانية ترويجية شهرياً','أولوية الترتيب في نتائج البحث','شارة «محتوى مميّز برزق» الموثّقة'],
    'أعمال ومعارض':['فيديوهات وعروض غير محدودة','ظهور مميز في القسم الرئيسي بالصفحة الرئيسية','تقارير تحليل أداء آلية مفصّلة','دعم VIP ذو أولوية + شارة VIP موثّقة']
  };
  var FEATS_FR={
    'إعلان فيديو واحد':['Une vidéo publicitaire pendant 10 jours','Section publicitaire page d\'accueil','Paiement par annonce — sans abonnement mensuel'],
    'Basique vidéo':['Jusqu\'à 3 vidéos promotionnelles / mois','Section publicitaire page d\'accueil','Statistiques de performance de base automatisées'],
    'Pro vidéo':['Jusqu\'à 10 vidéos promotionnelles / mois','Priorité dans les résultats de recherche','Badge « Contenu vedette Rizq » vérifié'],
    'Entreprises & galeries':['Vidéos et vitrines illimitées','Placement premium section principale','Rapports d\'analyse automatisés détaillés','Support VIP prioritaire + badge VIP vérifié']
  };
  var FEATS=(lang==='fr')?FEATS_FR:FEATS_AR;
  var ICONS={'إعلان فيديو واحد':'⚡','أساسي فيديو':'🎬','احترافي فيديو':'🥇','أعمال ومعارض':'💎','Vidéo unique':'⚡','Basique vidéo':'🎬','Pro vidéo':'🥇'};
  if(typeof RizqSub==='undefined' || typeof RizqSub.renderPackageCardsHTML!=='function'){ el.innerHTML=''; return; }
  var r=RizqSub.renderPackageCardsHTML(pkgs, FEATS, ICONS, lang, 'video');
  el.innerHTML=r.grid;
}

function openVideoAdPayModal(pkgId){
  var lang=_rizqLang();
  var pkgs=[];
  if(typeof RizqPackagesConfig!=='undefined' && typeof RizqPackagesConfig.getCatalog==='function'){
    try{ pkgs=RizqPackagesConfig.getCatalog('video', lang)||[]; }catch(e){}
  }
  if(!pkgs.length){ try{ pkgs=JSON.parse(localStorage.getItem('rizq_video_packages')||'[]'); }catch(e){} }
  var pkg = (pkgs||[]).find(function(p){ return p && (p.id===pkgId || String(p.name||'').indexOf('إعلان فيديو')!==-1); });
  if(!pkg && window.RizqPackagesConfig && RizqPackagesConfig.CATALOGS && RizqPackagesConfig.CATALOGS.video){
    pkg = RizqPackagesConfig.CATALOGS.video.find(function(p){ return p.id===pkgId; });
  }
  if(!pkg){ showToast(_t2('تعذّر تحميل الباقة','Impossible de charger le forfait')); return; }
  openPayModal(pkg.name, Number(pkg.price)||1500, 'video');
}

function _rizqRenderAdsStatus(acc){
  var mount=document.getElementById('rizq-ads-status-mount');
  if(!mount || !window.RIZQ_BACKEND_BASE || !acc || !acc.id) return;
  var base=window.RIZQ_BACKEND_BASE.replace(/\/$/,'');
  var run=function(token){
  Promise.all([
    fetch(base+'/api/site-config').then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}),
    token ? fetch(base+'/api/video-ads/stats/'+encodeURIComponent(acc.id), {
      headers: { 'x-account-token': token }
    }).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}) : Promise.resolve(null),
    token ? fetch(base+'/api/entitlements/'+encodeURIComponent(acc.id), {
      headers: { 'x-account-token': token }
    }).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;}) : Promise.resolve(null)
  ]).then(function(results){
    var data = results[0];
    var statsPayload = results[1];
    var entPayload = results[2];
    var va = data && data.config && data.config.videoAds;
    var media = (entPayload && entPayload.media) || (statsPayload && statsPayload.media) || null;
    var parts = [];
    if(va){
      var inHero = (va.hero||[]).find(function(a){return a.accountId===acc.id;});
      var inPopup = (va.popup||[]).find(function(a){return a.accountId===acc.id;});
      if(inHero || inPopup){
        var spots=[];
        if(inHero) spots.push(_t2('🏠 الواجهة الرئيسية (Hero)','🏠 Page d\'accueil (Hero)'));
        if(inPopup) spots.push(_t2('📌 الشريط العلوي (Popup)','📌 Bandeau supérieur (Popup)'));
        var active = (inHero && inHero.active!==false) || (inPopup && inPopup.active!==false);
        var badges = [];
        var ad = inHero || inPopup;
        if(ad && ad.vipBadge) badges.push('VIP');
        else if(ad && ad.featuredBadge) badges.push(_t2('مميّز برزق','Mis en avant Rizq'));
        parts.push('<div style="background:'+(active?'#ecfdf5':'#fff7ed')+';border:1.5px solid '+(active?'#6ee7b7':'#fdba74')+';border-radius:12px;padding:14px 16px;font-size:12.5px;color:'+(active?'#065f46':'#9a3412')+';display:flex;align-items:center;gap:10px;margin-bottom:10px">'
          + '<span style="font-size:22px">'+(active?'🟢':'🟡')+'</span>'
          + '<span>'+(active
              ? ('✅ '+_t2('فيديوك الإعلاني نشط الآن في: ','Votre vidéo publicitaire est active sur : ')+spots.join(' + ') + (badges.length?' · '+badges.join(' · '):''))
              : _t2('⏸️ فيديوك مضاف لكنه موقوف مؤقتاً من الإدارة','⏸️ Votre vidéo est ajoutée mais suspendue par l\'administration'))+'</span>'
          + '</div>');
      }
    }
    if(statsPayload && statsPayload.ok && statsPayload.stats){
      var st = statsPayload.stats;
      parts.push('<div style="background:#f8faff;border:1.5px solid #bfcfef;border-radius:12px;padding:14px 16px;font-size:12.5px;color:#1B3A6B;display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        + '<div><div style="font-size:11px;color:#6b7280">'+_t2('المشاهدات','Impressions')+'</div><div style="font-size:20px;font-weight:800">'+(Number(st.impressions)||0).toLocaleString()+'</div></div>'
        + '<div><div style="font-size:11px;color:#6b7280">'+_t2('النقرات','Clics')+'</div><div style="font-size:20px;font-weight:800">'+(Number(st.clicks)||0).toLocaleString()+'</div></div>'
        + (media && media.maxVideosPerMonth != null ? '<div style="grid-column:1/-1;font-size:11.5px;color:#5B6478">'+_t2('حد الفيديوهات الشهري: ','Limite mensuelle de vidéos : ')+(media.maxVideosPerMonth===null||media.maxVideosPerMonth===Infinity||media.maxVideosPerMonth>999?'∞':media.maxVideosPerMonth)+'</div>' : '')
        + '</div>');
    } else if(media && media.subscribed){
      parts.push('<div style="background:#f8faff;border:1.5px solid #bfcfef;border-radius:12px;padding:12px 14px;font-size:12px;color:#1B3A6B">'+_t2('باقة Rizq ADS نشطة','Forfait Rizq ADS actif')+(media.planType?' · '+media.planType:'')+'</div>');
    }
    if(parts.length) mount.innerHTML = parts.join('');
  });
  };
  var tok = window.REAL_ACCESS_TOKEN || '';
  if(tok){ run(tok); return; }
  if(typeof _resolveRealAccessToken==='function'){
    _resolveRealAccessToken(acc).then(function(t){ run(t || window.REAL_ACCESS_TOKEN || ''); });
  } else { run(''); }
}

var renewalFile = null;
function handleRenewalUpload(){ /* removed — use packages payment flow */ }
function submitRenewal(){
  var el = document.getElementById('packages-display');
  if(el) el.scrollIntoView({behavior:'smooth'});
}

// ══ منتقي الإعلان لباقة "مميزة" (#219) ══
// إصلاح جوهري: كانت "مميزة" تُشترى كأي باقة حساب أخرى — الآن يجب اختيار
// إعلان محدَّد أولاً؛ التثبيت الفعلي (بعد موافقة الأدمن) يُطبَّق على ذلك
// الإعلان بعينه (RizqSub.activateAdBoost) لا على الحساب كله.
function openAdBoostPicker(pkgName, price){
  var eligible = (MY_ADS||[]).filter(function(a){
    var isActive = (a.status||'active') === 'active';
    var alreadyBoosted = typeof RizqSub!=='undefined' && RizqSub.isAdBoosted && RizqSub.isAdBoosted(a.id);
    return isActive && !alreadyBoosted;
  });
  if(!eligible.length){
    showToast(_t2('ليس لديك إعلان نشط قابل للتثبيت حالياً (تحقّق أنه لا يوجد إعلان مثبَّت مسبقاً)','Vous n\'avez aucune annonce active pouvant être épinglée actuellement (vérifiez qu\'aucune n\'est déjà épinglée)'));
    return;
  }
  var listEl = document.getElementById('ad-boost-list');
  listEl.innerHTML = eligible.map(function(a){
    var title = (typeof adTitleLocalized==='function') ? adTitleLocalized(a) : (a.title||a.name||'—');
    return '<div onclick="selectAdToBoost(\''+a.id+'\',\''+escapeHtml(pkgName)+'\','+price+')" style="cursor:pointer;display:flex;align-items:center;gap:10px;padding:11px 12px;border:1.5px solid rgba(27,58,107,.12);border-radius:12px;margin-bottom:8px" onmouseover="this.style.borderColor=\'#C9A84C\'" onmouseout="this.style.borderColor=\'rgba(27,58,107,.12)\'">'
      +'<span style="font-size:22px">'+(a.emoji||'📦')+'</span>'
      +'<div style="flex:1"><div style="font-size:13px;font-weight:700;color:#1B3A6B">'+escapeHtml(title)+'</div>'
      +(a.price?'<div style="font-size:11.5px;color:#9ca3af;margin-top:2px">'+escapeHtml(String(a.price))+'</div>':'')+'</div>'
      +'<span style="color:#C9A84C;font-size:18px">›</span></div>';
  }).join('');
  document.getElementById('ad-boost-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeAdBoostModal(){
  document.getElementById('ad-boost-modal').style.display = 'none';
  document.body.style.overflow = '';
}
function selectAdToBoost(adId, pkgName, price){
  var ad = (MY_ADS||[]).find(function(a){ return String(a.id)===String(adId); });
  closeAdBoostModal();
  var title = ad ? ((typeof adTitleLocalized==='function') ? adTitleLocalized(ad) : (ad.title||ad.name||'')) : '';
  openPayModal(pkgName, price, 'ad_boost', adId, title);
}

// ══ PAYMENT MODAL (اشتراك مباشر من بطاقة الباقة) ══
var _payPkg = null;
var _payFile = null;

function openPayModal(pkgName, pkgPrice, category, adId, adTitle){
  _payPkg = {name: pkgName, price: pkgPrice, category: category || 'package', adId: adId || null, adTitle: adTitle || ''};
  _payFile = null;
  document.getElementById('pay-pkg-name').textContent = adTitle ? (pkgName + ' — ' + adTitle) : pkgName;
  var amtEl = document.getElementById('pay-amount');
  if(amtEl){
    if(typeof RizqSub !== 'undefined' && RizqSub.isPriceUnset && RizqSub.isPriceUnset(pkgPrice)){
      amtEl.textContent = '—';
    } else if(typeof RizqSub !== 'undefined' && RizqSub.isExplicitFreePrice && RizqSub.isExplicitFreePrice(pkgPrice)){
      amtEl.textContent = _t2('مجاناً','Gratuit');
    } else {
      amtEl.textContent = Number(pkgPrice).toLocaleString() + ' MRU';
    }
  }
  document.getElementById('pay-receipt-name').style.display = 'none';
  document.getElementById('pay-receipt-file').value = '';
  var vidWrap = document.getElementById('pay-video-url-wrap');
  if(vidWrap){ vidWrap.style.display = (_payPkg.category === 'video') ? 'block' : 'none'; var vidInp = document.getElementById('pay-video-url'); if(vidInp) vidInp.value = ''; }

  var codes = [];
  try { codes = JSON.parse(localStorage.getItem('rizq_bank_codes')||'[]').filter(function(b){return b.active!==false;}); } catch(e){}
  var el = document.getElementById('pay-banks');
  if(!codes.length){
    el.innerHTML = '<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px;font-size:12.5px;color:#92400e;text-align:center">⚠️ '+((typeof RizqI18n!=='undefined'&&RizqI18n.t)?RizqI18n.t('pay-no-methods','dashboard'):_t2('لا توجد طرق دفع متاحة حالياً — تواصل مع الدعم','Aucun moyen de paiement disponible — contactez le support'))+'</div>';
  } else {
    el.innerHTML = codes.map(function(b){
      return '<div style="background:#f8faff;border:1.5px solid #e0e8ff;border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'
        +'<div><div style="font-size:13px;font-weight:700;color:#1B3A6B">'+escapeHtml(b.bank||'')+'</div>'
        +(b.instruction || b.note ? '<div style="font-size:11px;color:#777;margin-top:2px">'+escapeHtml(b.instruction || b.note)+'</div>' : '')+'</div>'
        +'<span style="font-family:monospace;font-size:14px;font-weight:700;color:#0f2347;background:#e0e8ff;padding:5px 10px;border-radius:7px;letter-spacing:.5px;direction:ltr">'+escapeHtml(b.code||'')+'</span>'
        +'</div>';
    }).join('');
  }
  var m = document.getElementById('pay-modal');
  if(!m) return;
  if(typeof RizqSub !== 'undefined' && typeof RizqSub.configurePayModalFreeMode === 'function'){
    RizqSub.configurePayModalFreeMode(pkgPrice, _rizqLang());
  }
  m.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}


function handlePayReceipt(inp){
  if(!inp.files||!inp.files[0]) return;
  _payFile = inp.files[0];
  var el = document.getElementById('pay-receipt-name');
  el.textContent = '✅ ' + _payFile.name;
  el.style.display = 'block';
}

function submitPayment(){
  if(!_payPkg) return;
  if(typeof RizqSub !== 'undefined' && RizqSub.isPriceUnset && RizqSub.isPriceUnset(_payPkg.price)){
    showToast(_t2('السعر غير مضبوط — حدّده السوبر أدمن من لوحة الباقات أولاً','Prix non défini — le Super Admin doit le fixer d\'abord'));
    return;
  }
  var isFree = typeof RizqSub !== 'undefined' && RizqSub.isExplicitFreePrice && RizqSub.isExplicitFreePrice(_payPkg.price);
  if(!isFree && Number(_payPkg.price) > 0 && !_payFile){
    showToast(_t2('يرجى رفع صورة وصل الدفع أولاً','Veuillez d\'abord télécharger le reçu de paiement'));
    return;
  }
  var isVideo = _payPkg.category === 'video';
  var videoUrl = '';
  if(isVideo){
    videoUrl = (document.getElementById('pay-video-url')||{}).value?.trim() || '';
    if(!videoUrl){
      showToast(_t2('يرجى إدخال رابط الفيديو الإعلاني','Veuillez entrer le lien de la vidéo publicitaire'));
      return;
    }
    // فحص حصة الفيديوهات حسب الباقة قبل الإرسال
    if(typeof RizqSub !== 'undefined' && typeof RizqSub.checkPostLimit === 'function' && SESSION_ID){
      var activeVidCount = 0;
      try {
        var va = JSON.parse(localStorage.getItem('rizq_video_ads')||'{}');
        ['hero','popup'].forEach(function(slot){
          (va[slot]||[]).forEach(function(a){
            if(a && a.accountId === SESSION_ID && a.active !== false && a.url) activeVidCount++;
          });
        });
      } catch(e){}
      var lim = RizqSub.checkPostLimit(SESSION_ID, 'video', activeVidCount);
      // إن لم تكن باقة فيديو نشطة بعد، نسمح بطلب الشراء الأول؛ الحصة تُفرض عند التفعيل
      if(lim && lim.allowed === false && lim.reason === 'tier_limit_reached'){
        showToast(_t2('وصلت لحد فيديوهات باقتك ('+lim.limit+')','Vous avez atteint la limite de vidéos ('+lim.limit+')'));
        return;
      }
    }
  }
  if(typeof RizqSub === 'undefined' || typeof RizqSub.submitSubscriptionRequest !== 'function'){
    showToast(_t2('تعذّر إرسال الطلب — حاول مرة أخرى','Échec de l\'envoi de la demande — veuillez réessayer'));
    return;
  }
  if(!window.REAL_ACCESS_TOKEN){
    showToast(_t2('جارٍ تجهيز الجلسة — أعد المحاولة بعد ثانية','Préparation de la session — réessayez dans une seconde'));
    if(typeof _resolveRealAccessToken==='function' && USER_ACC) _resolveRealAccessToken(USER_ACC);
    return;
  }
  // حماية من الإرسال المزدوج (نقر متكرر سريع قبل انتهاء قراءة/رفع الملف)
  var submitBtn = document.getElementById('pay-submit-btn');
  if(submitBtn && submitBtn.disabled) return;
  var prevLabel = submitBtn ? submitBtn.textContent : '';
  if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = _t2('...جارٍ الإرسال','Envoi...'); }
  RizqSub.submitSubscriptionRequest({
    file: _payFile,
    pkgName: _payPkg.name,
    price: _payPkg.price,
    accountName: (USER_ACC&&USER_ACC.name) || _t2('مشترك','Abonné'),
    accountId: SESSION_ID,
    accessToken: window.REAL_ACCESS_TOKEN || '',
    category: _payPkg.category || 'package',
    adId: _payPkg.adId || null,
    adTitle: _payPkg.adTitle || '',
    videoUrl: isVideo ? videoUrl : null
  }).then(function(){
    closePayModal();
    showToast(isVideo
      ? _t2('✅ تم إرسال طلب Rizq ADS — يُفحص المحتوى ثم نوافق أو نرفض قبل النشر في الرئيسية','✅ Votre demande Rizq ADS a été envoyée — le contenu sera contrôlé, puis approuvé ou refusé avant publication')
      : _t2('✅ تم إرسال طلبك — سيتم مراجعته وتفعيل باقتك خلال 24 ساعة','✅ Votre demande a été envoyée — elle sera examinée et votre forfait activé dans les 24 heures'));
  }).catch(function(err){
    showToast((err && err.msg) || _t2('تعذّر إرسال الطلب — حاول مرة أخرى','Échec de l\'envoi de la demande — veuillez réessayer'));
  }).finally(function(){
    if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = prevLabel; }
  });
}

// ── INIT ──
function initDashboard(){
  if(IS_DEMO){ _initDashboardWithAccount(DEMO_ACCOUNT); return; }
  if(!SESSION_ID || !SESSION_TOKEN){ showAccessDenied(); return; }
  // دائماً تحقق من الخادم — لا تثق بـ localStorage وحده (حساب معلّق/مرفوض)
  verifyAccessRemote().then(function(remoteAcc){
    if(remoteAcc) _initDashboardWithAccount(remoteAcc); else showAccessDenied();
  });
}

function _initDashboardWithAccount(acc){
  USER_ACC = acc;
  if(typeof RizqPackagesConfig!=='undefined' && typeof RizqPackagesConfig.ensureCatalogStorageFresh==='function'){
    try{ RizqPackagesConfig.ensureCatalogStorageFresh(); }catch(e){}
  }
  // ── حساب إعلاناتي الحقيقية بعد معرفة IS_DEMO/SESSION_ID بشكل نهائي ──
  // العرض التجريبي (demo) يعرض DEMO_ADS فقط (لا نخلط إعلانات زوّار حقيقيين في عرض تجريبي عام).
  // الحساب الحقيقي يعرض فقط الإعلانات التي تحمل accountId مطابق لهذا الحساب — بدون أي DEMO_ADS.
  if(IS_DEMO){
    MY_ADS = DEMO_ADS.slice();
  }else{
    MY_ADS = loadRealAds().filter(function(a){ return a.accountId === SESSION_ID; });
    // نُثبّت جلسة الحساب الفردي محلياً حتى يقرأها rizq_post.html عند نشر إعلان جديد
    // (token هنا يبقى dashToken — نفس الاستخدام القديم بلا أي تغيير — أما
    // accessToken فحقل جديد يُضاف بعد حله أدناه، ليستخدمه rizq_post.html
    // في تعديل إعلان حقيقي عبر PATCH، دون كسر التحقق المحلي القديم في
    // publishAd() الذي يقارن sess.token بـrizq_pending_accounts[].token)
    try{ localStorage.setItem('rizq_individual_session', JSON.stringify({id: acc.id, token: acc.token})); }catch(e){}
    // جلسة عامة موحَّدة (كل أنواع الحسابات) يقرأها rizq_tenders.html لمعرفة "من
    // المسجَّل دخوله الآن" بغض النظر عن نوع الحساب — ميزة المناقصات الجديدة.
    try{ localStorage.setItem('rizq_active_session', JSON.stringify({id: acc.id, token: acc.token, type:'individual', name: acc.name||''})); }catch(e){}
    // إصلاح جوهري (2026-08-05): _rizqMergeMyBackendAds و_loadRealDashboardStats
    // كلاهما يحتاج accessToken الحقيقي (وليس dashToken) لينجح فعلياً مع
    // verifyAccountOwner() بالخادم — يُستدعيان الآن بعد حل window.REAL_ACCESS_TOKEN
    // بدل التوازي معه، حتى لا يرسلا dashToken فيفشلان دوماً بصمت (401 catch).
    _resolveRealAccessToken(acc).then(function(realToken){
      if(realToken){
        /* W4: accessToken في sessionStorage/الذاكرة فقط — ممنوع localStorage */
        if(window.RizqDash && typeof RizqDash.rememberAccessToken === 'function'){
          try{ RizqDash.rememberAccessToken(acc.id, realToken); }catch(eMem){}
        } else {
          window.REAL_ACCESS_TOKEN = realToken;
          try{ sessionStorage.setItem('rizq_access_mem_' + acc.id, realToken); }catch(eSs){}
        }
        try{
          var s = JSON.parse(localStorage.getItem('rizq_individual_session')||'{}');
          if(s && s.accessToken){ delete s.accessToken; localStorage.setItem('rizq_individual_session', JSON.stringify(s)); }
        }catch(ePurge){}
        // مزامنة صلاحيات الباقة من الخادم (حدود/ميزات حية بما فيها media)
        if(typeof RizqSub !== 'undefined' && typeof RizqSub.syncEntitlementsFromServer === 'function'){
          try{ RizqSub.syncEntitlementsFromServer(acc.id, realToken); }catch(eSync){}
        }
      }
      _rizqMergeMyBackendAds(acc);
      _loadRealDashboardStats(acc);
      if(typeof _rizqRenderAdsStatus === 'function') _rizqRenderAdsStatus(acc);
    });
  }
  renderChart();
  renderAdsTable();
  renderQuickAds();
  renderMessages();
  renderNotifs();
  renderFavs();
  loadProfile();
  applyProfileLocalNote();
  if(typeof _applyDashGreeting === 'function') _applyDashGreeting();
  else {
    var greet=document.querySelector('[data-t="greeting"]');
    if(greet){
      var nm=(acc && acc.name)?String(acc.name).trim():'';
      greet.textContent = nm ? _t2('مرحباً، '+nm+' 👋','Bonjour, '+nm+' 👋') : _t2('مرحباً 👋','Bonjour 👋');
    }
  }
  try{
    var wish=JSON.parse(localStorage.getItem('rizq_wishlist')||'[]');
    var favNum=document.querySelector('.stat-card.favs .stat-num');
    if(favNum && Array.isArray(wish)) favNum.textContent=String(wish.length);
    var favChange=document.querySelector('.stat-card.favs .stat-change');
    if(favChange) favChange.textContent = Array.isArray(wish) && wish.length ? _t2('محفوظة لديك','enregistrés') : _t2('فارغة','vide');
  }catch(eFav){}
  updateSidebarUser(acc);
  updateProfileAccountStats(acc);
  if(!IS_DEMO){
    if(acc && acc.thumb && window.RizqProfilePhoto) RizqProfilePhoto.set(SESSION_ID, acc.thumb);
  }
  var adsStat=document.querySelector('.stat-card.balance .stat-num');
  if(adsStat) adsStat.textContent=String((MY_ADS||[]).filter(function(a){return (a.status||'active')==='active';}).length);
  applyDashAvatars();
  if(typeof renderSubscriptionPanel==='function') renderSubscriptionPanel();
  if(typeof initSubscriptionLifecycle==='function') initSubscriptionLifecycle(acc.id, 'individual');
  // قفل كتابة موحّد (W3) — نفس سياسة المحل/المكتب/الشركة/العقارات
  if(window.RizqDash && typeof RizqDash.applySubscriptionLock==='function'){
    RizqDash.applySubscriptionLock(acc.id, document.querySelector('.page-content') || document.body, { isDemo: !!IS_DEMO });
  } else if(typeof useSubscriptionPermissions==='function' && window.RizqSubscriptionPermissions){
    var _permsInd = useSubscriptionPermissions(acc.id, { isDemo: !!IS_DEMO });
    if(window.RizqSubscriptionPermissions.disableFormsAndShowUpgradeBanner){
      window.RizqSubscriptionPermissions.disableFormsAndShowUpgradeBanner(document.querySelector('.page-content') || document.body, _permsInd);
    }
  }
  if(typeof renderMyInvoices==='function') renderMyInvoices();
  if(window.RizqAccount && typeof RizqAccount.initShareLinkInput==='function'){
    RizqAccount.initShareLinkInput('share-link-input', acc);
  }
  if(window.RizqStatusSummary && typeof RizqStatusSummary.render==='function'){
    RizqStatusSummary.render({ items: MY_ADS, itemType: 'ads' });
  }
  if(!IS_DEMO && window.RizqSellerOnboarding && typeof RizqSellerOnboarding.maybeShow==='function'){
    RizqSellerOnboarding.maybeShow({
      account: acc,
      accountType: 'individual',
      isDemo: IS_DEMO,
      contentCount: MY_ADS.length,
      onShare: function(){ if(typeof openShareModal==='function') openShareModal(); }
    });
  }
}
// ── مزامنة طرق الدفع + كتالوجات الأسعار من الخادم — الأدمن قد يعدّلها من
// جهازه الخاص؛ بدون هذا، يبقى هذا الجهاز يعرض فقط ما كان محفوظاً محلياً.
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
        if(Array.isArray(data.config.packages.individual)) localStorage.setItem('rizq_individual_packages', JSON.stringify(data.config.packages.individual));
        if(Array.isArray(data.config.packages.general))     localStorage.setItem('rizq_packages', JSON.stringify(data.config.packages.general));
        if(Array.isArray(data.config.packages.video))       localStorage.setItem('rizq_video_packages', JSON.stringify(data.config.packages.video));
        if(Array.isArray(data.config.packages.tender))      localStorage.setItem('rizq_tender_packages', JSON.stringify(data.config.packages.tender));
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
initDashboard();

// تسجيل الخروج — يمسح جلسة الحساب الفردي المحفوظة محلياً (المستخدمة من rizq_post.html لإسناد الإعلانات)
function logout(){
  if(window.RizqAccount && typeof window.RizqAccount.clearSession === 'function'){
    window.RizqAccount.clearSession();
  } else {
    try{ localStorage.removeItem('rizq_individual_session'); }catch(e){}
    try{ localStorage.removeItem('rizq_active_session'); }catch(e2){}
  }
  showToast(_t2('👋 تم تسجيل الخروج','👋 Déconnexion réussie'));
  setTimeout(function(){ location.href='rizq_landing_v8.html'; }, 1500);
}

// Animate bars on load
setTimeout(()=>{
  document.querySelectorAll('.bar').forEach(b=>{
    const h=b.style.height;
    b.style.height='0';
    setTimeout(()=>b.style.height=h,100);
  });
},300);

/* ── Universal Share ── */
function rizqShare(title, url) {
  title = title || document.title;
  url   = url   || location.href;
  function _ok(){ if(typeof showToast === 'function') showToast((_rizqLang()==='ar')?'📋 تم نسخ الرابط':'📋 Lien copié'); else alert(((_rizqLang()==='ar')?'تم نسخ الرابط: ':'Lien copié : ') + url); }
  function _promptFallback(){ prompt((_rizqLang()==='ar')?'انسخ الرابط:':'Copiez le lien :', url); }
  if (navigator.share) {
    navigator.share({ title: title, text: title, url: url }).catch(function(){});
  } else if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(_ok).catch(_promptFallback);
  } else {
    _promptFallback();
  }
}


;

(function(){
  const DAYS_FR = ['Vendredi','Samedi','Dimanche','Lundi','Mardi','Mercredi',"Aujourd'hui"];
  const DAYS_AR = ['الجمعة','السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','اليوم'];

  const STATUS_FR = {
    active: '<span class="status-pill status-active">● Actif</span>',
    pending: '<span class="status-pill status-pending">⏳ En attente</span>',
    expired: '<span class="status-pill status-expired">✕ Expiré</span>',
    draft: '<span class="status-pill status-draft">✏️ Brouillon</span>'
  };
  const STATUS_AR = {
    active: '<span class="status-pill status-active">● نشط</span>',
    pending: '<span class="status-pill status-pending">⏳ قيد المراجعة</span>',
    expired: '<span class="status-pill status-expired">✕ منتهي</span>',
    draft: '<span class="status-pill status-draft">✏️ مسودة</span>'
  };



  function applyDashLang(lang) {
    // ── وُحِّد هذا المنطق على محرك RizqI18n المركزي في 06/08/2026 —
    // كان لهذه الصفحة قاموس ترجمة محلي مكرَّر (T) بجانب rizq_i18n_data.js
    // ["dashboard"]، وهو مصدر أخطاء متكررة (حقل يُضاف هنا وليس هناك أو
    // العكس). الآن: RizqI18n.applyStaticDom() يتكفّل بكل عنصر [data-t]/
    // [data-ph] تلقائياً من القاموس المركزي؛ هذه الدالة تبقى فقط للسلوك
    // الخاص بهذه الصفحة الذي لا يعرفه المحرك العام (أيام الرسم البياني،
    // حالة الإعلانات، الخط).
    document.body.style.fontFamily = "'Cairo', sans-serif";

    if(typeof _applyDashGreeting === 'function') _applyDashGreeting();

    // أيام الرسم البياني
    const days = lang === 'ar' ? DAYS_AR : DAYS_FR;
    document.querySelectorAll('.bar-label').forEach((el, i) => {
      if (days[i]) el.textContent = days[i];
    });

    // حالة الإعلانات في الجدول
    const statusMap = lang === 'ar' ? STATUS_AR : STATUS_FR;
    document.querySelectorAll('[data-status]').forEach(el => {
      const s = el.dataset.status;
      if (statusMap[s]) el.innerHTML = statusMap[s];
    });
  }

  document.addEventListener('rizq:langchange', function (e) {
    applyDashLang(e.detail.lang);
  });

  window.addEventListener('DOMContentLoaded', function() {
    applyDashLang((typeof RizqI18n !== 'undefined') ? RizqI18n.getLang() : (localStorage.getItem('rizq_lang') || 'ar'));
  });
})();

;

// ══ Share & QR — ملفي الشخصي ══
(function(){
  if(window.RizqAccount && typeof RizqAccount.initShareLinkInput==='function' && USER_ACC){
    RizqAccount.initShareLinkInput('share-link-input', USER_ACC);
  }
})();
var _qrDone=false;
function openShareModal(){
  document.getElementById('share-modal').classList.add('open');
  if(!_qrDone && window.QRCode){
    var c=document.getElementById('qr-container');

    if(c.innerHTML===''){
      try{new QRCode(c,{text:(document.getElementById('share-link-input')||{}).value||location.href,width:180,height:180});}catch(err){}
      _qrDone=true;
    }
  }
}
function closeShareModal(e){
  if(!e||e.target===document.getElementById('share-modal'))
    document.getElementById('share-modal').classList.remove('open');
}
function copyShareLink(){
  var inp=document.getElementById('share-link-input');
  if(!inp)return;
  var v=inp.value;
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(v).then(function(){showToast(_t2('✅ تم نسخ الرابط!','✅ Lien copié !'));}).catch(function(){
      inp.select();try{document.execCommand('copy');}catch(err){}
      showToast(_t2('✅ تم نسخ الرابط!','✅ Lien copié !'));
    });
  } else {
    inp.select();try{document.execCommand('copy');}catch(err){}
    showToast(_t2('✅ تم نسخ الرابط!','✅ Lien copié !'));
  }
}
function shareWhatsAppLink(){
  var inp=document.getElementById('share-link-input');
  var link=(inp&&inp.value)||location.href;
  var isFr=(localStorage.getItem('rizq_lang')==='fr');
  var txt=isFr?('Découvrez mon profil sur Rizq: '+link):('شاهد ملفي الشخصي على منصة رزق: '+link);
  window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
}
function printQRCode(){
  var w=window.open('','_blank','width=400,height=500');
  var q=document.getElementById('qr-container');
  if(q&&w){
    w.document.write('<html><body style="text-align:center;padding:40px;font-family:sans-serif">'+q.innerHTML+'<p style="font-size:13px;word-break:break-all">'+(document.getElementById('share-link-input')||{}).value+'</p></body></html>');
    w.document.close();w.print();
  }
}
