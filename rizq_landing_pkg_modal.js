/* extracted */

var _pkgModalOrigin = '';
function openPkgModal(cardEl,origin){
  var raw=cardEl&&cardEl.getAttribute('data-pkg');
  if(!raw) return;
  _pkgModalOrigin = origin || '';
  var p; try{ p=JSON.parse(raw.replace(/&quot;/g,'"')); }catch(e){ return; }
  var _fr=(typeof isAr!=='undefined' && !isAr);
  if(window.RizqPackagesConfig && typeof RizqPackagesConfig.enrichForDisplay==='function'){
    p=RizqPackagesConfig.enrichForDisplay(p, _fr?'fr':'ar');
  }
  var pName=_fr?trPkg(p.name_fr||p.name):p.name;
  var pPeriod=_fr?(p.period_fr||trPkg(p.period||'')):(p.period||'');
  var pFeats=_fr?((p.features_fr&&p.features_fr.length)?p.features_fr:(p.features||[]).map(trPkg)):(p.features||[]);
  var pCta=_fr?(p.cta_fr||trPkg(p.cta||'')||"S'abonner →"):(p.cta||'اشترك الآن ←');
  var pDesc=_fr?(p.description_fr||p.description||''):(p.description||'');
  var pRoi=_fr?(p.roi_fr||p.roi||''):(p.roi||'');
  var pBadge=_fr?(p.featuredBadge_fr||p.featuredBadge||'Le plus choisi par les entreprises'):(p.featuredBadge||'الأكثر اختياراً للشركات');
  if(_fr){
    pFeats=(pFeats||[]).map(trPkg).filter(function(f){ return f && !/[\u0600-\u06FF]/.test(String(f)); });
    if(/[\u0600-\u06FF]/.test(String(pName||''))) pName=p.name_fr||pName;
    if(/[\u0600-\u06FF]/.test(String(pPeriod||''))) pPeriod=p.period_fr||'';
    if(/[\u0600-\u06FF]/.test(String(pDesc||''))) pDesc=p.description_fr||'';
    if(/[\u0600-\u06FF]/.test(String(pRoi||''))) pRoi=p.roi_fr||'';
    if(/[\u0600-\u06FF]/.test(String(pBadge||''))) pBadge=p.featuredBadge_fr||'';
    if(/[\u0600-\u06FF]/.test(String(pCta||''))) pCta=p.cta_fr||"S'abonner →";
  }
  var lblFree=_fr?'Gratuit':'مجاناً';
  var lblStartFree=_fr?'Commencer gratuitement':'ابدأ مجاناً';
  var isDiamond=p.diamond||p.isDiamond||/ماس|diamond|diamant/i.test(String(p.id||'')+String(p.name||'')+String(p.name_fr||'')+String(p.cta||''));
  var isYear=/year|annuel|سنوي/i.test(String(p.id||'')+String(p.name||'')+String(p.name_fr||'')) || (Number(p.durationDays)>=360);
  var isTrial=/trial|free|essai|gratuit|مجاني|تجريب/i.test(String(p.id||'')+String(p.name||'')+String(p.name_fr||'')) || !Number(p.price);
  var isQuart=/quart|trimestr|ربع/i.test(String(p.id||'')+String(p.name||'')+String(p.name_fr||'')) || (Number(p.durationDays)>=80 && Number(p.durationDays)<360);
  var isMonth=/month|mensuel|شهر/i.test(String(p.id||'')+String(p.name||'')+String(p.name_fr||'')) && !isYear && !isQuart;
  var isFree=p.price===0||p.price==='0'||p.cta==='ابدأ مجاناً';
  var bg=isDiamond?'linear-gradient(145deg,#3b0764,#6b21a8)':isYear?'linear-gradient(145deg,#1B3A6B,#0f2347)':isTrial?'linear-gradient(145deg,#f0fdf4,#dcfce7)':'linear-gradient(145deg,#f8faff,#eff3ff)';
  var nameCol=isDiamond?'#e9d5ff':isYear?'#fde68a':isTrial?'#15803d':'#1B3A6B';
  var priceCol=isDiamond?'#c084fc':isYear?'#fbbf24':isTrial?'#16a34a':'#1d4ed8';
  var mutedCol=isDiamond?'rgba(233,213,255,.6)':isYear?'rgba(255,255,255,.5)':isTrial?'#4ade80':'#9ca3af';
  var featCol=isDiamond?'rgba(233,213,255,.9)':isYear?'rgba(255,255,255,.85)':isTrial?'#166534':'#374151';
  var checkCol=isDiamond?'#c084fc':isYear?'#fde68a':isTrial?'#22c55e':'#10b981';
  var border=isDiamond?'2px solid rgba(192,132,252,.5)':isYear?'2px solid rgba(201,168,76,.5)':isTrial?'1.5px solid #86efac':'1.5px solid #bfcfef';
  var btnBg=isDiamond?'linear-gradient(135deg,#a855f7,#7c3aed)':isTrial?'linear-gradient(135deg,#22c55e,#16a34a)':'#fff';
  var btnCol=isDiamond||isTrial?'#fff':'#0f2347';
  var icon=isTrial?'🎁':isMonth?'📅':isQuart?'🚀':isYear?'👑':isDiamond?'💎':'📦';

  var box=document.getElementById('pkg-modal-box');
  box.style.background=bg; box.style.border=border;

  var _xm = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  document.getElementById('pkg-modal-content').innerHTML=
    '<div style="text-align:center;margin-bottom:18px">'
    +(isDiamond?'<div style="display:inline-block;background:linear-gradient(135deg,#a855f7,#c084fc);color:#fff;font-size:10px;font-weight:900;padding:4px 14px;border-radius:10px;margin-bottom:10px">💎 '+_xm(pBadge)+'</div>':'')
    +'<div style="font-size:52px;margin-bottom:8px">'+_xm(icon)+'</div>'
    +'<div style="font-size:22px;font-weight:900;color:'+nameCol+'">'+_xm(pName)+'</div>'
    +(pDesc?'<div style="font-size:12.5px;color:'+featCol+';line-height:1.6;margin:8px 0 0;text-align:'+(_fr?'left':'right')+'">'+_xm(pDesc)+'</div>':'')
    +'<div style="font-size:12px;color:'+mutedCol+';font-weight:600;margin-top:4px">'+_xm(pPeriod)+'</div>'
    +'</div>'
    +'<div style="text-align:center;margin-bottom:20px">'
    +'<span style="font-size:40px;font-weight:900;color:'+priceCol+'">'+(isFree?_xm(lblFree):Number(p.price).toLocaleString()+' MRU')+'</span>'
    +(!isFree?'<div style="font-size:11px;color:'+mutedCol+';font-weight:600">/ '+_xm(pPeriod)+'</div>':'')
    +'</div>'
    +(isDiamond && pRoi ? '<div style="margin:0 0 16px;padding:12px 14px;border-radius:12px;background:rgba(251,191,36,.14);border:1px solid rgba(251,191,36,.4);font-size:12.5px;line-height:1.6;color:#fde68a;text-align:'+(_fr?'left':'right')+'">💼 '+_xm(pRoi)+'</div>' : '')
    +'<div style="background:rgba(255,255,255,.08);border-radius:14px;padding:16px">'
    +pFeats.map(function(f){ return '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;font-size:13px"><span style="color:'+checkCol+';font-size:15px;flex-shrink:0">✓</span><span style="color:'+featCol+'">'+_xm(f)+'</span></div>'; }).join('')
    +'</div>';

  var ctaBtn=document.getElementById('pkg-modal-cta');
  ctaBtn.textContent=isFree?lblStartFree:pCta;
  ctaBtn.style.background=btnBg; ctaBtn.style.color=btnCol;

  var modal=document.getElementById('pkg-modal');
  modal.style.display='flex';
  document.body.style.overflow='hidden';
}
function closePkgModal(){
  document.getElementById('pkg-modal').style.display='none';
  document.body.style.overflow='';
}
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closePkgModal(); });

// ── توجيه زر "اشترك الآن" في نافذة الباقة إلى مسار التسجيل الصحيح حسب أصل الباقة
//    (فردي/محل/مكتب) بدل فتح خطوة "نوع الحساب" العامة دون أي تحديد مسبق ──
function pkgModalCTA(){
  var origin = _pkgModalOrigin;
  closePkgModal();
  if(origin==='tender'){
    window.location.href = 'rizq_tenders.html';
    return;
  }
  if(origin==='ads'){
    window.location.href = 'rizq_ads_info.html';
    return;
  }
  if(origin==='individual') openRegisterAs('private');
  else if(origin==='stores') openRegisterAs('company','store');
  else if(origin==='offices') openRegisterAs('company','office');
  else if(origin==='corp') openRegisterAs('company','corp');
  else if(origin==='estate' || origin==='estates' || origin==='realestate') openRegisterAs('estate');
  else location.href='rizq_register.html?mode=seller';
}
