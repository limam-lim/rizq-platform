// ═══════════════════════════════════════════════════════
// PAYMENT PANEL — Package selection + receipt upload
// ═══════════════════════════════════════════════════════
var _ppPendingData = null;
var _ppSelectedPkg = null;
var _ppReceiptB64  = null;
var _ppReceiptName = '';
var _ppBackPanel   = 'p-store-form';
var _ppBackDot     = 2;
var _ppPkgCatalog  = [];

function ppShowPanel(){
  var t = _ppPendingData ? _ppPendingData.type : 'store';
  ppRenderPackages(t);
  ppRenderPayMethods();
  showPanel('p-pkg-payment', 3, 4);
}

function ppRenderPackages(btype){
  /* إصلاح: كانت هذه الشاشة (اختيار الباقة أثناء التسجيل) بالعربية دائماً
     بدون أي فحص للغة — تظهر بالعربية حتى في الواجهة الفرنسية. الآن تُترجَم
     الأسماء والمزايا والشارات حسب اللغة الحالية. */
  var isFr = (window.RizqI18n ? RizqI18n.getLang() : (localStorage.getItem('rizq_lang')||'ar')) === 'fr';
  var lsKey = btype==='office' ? 'rizq_office_packages' : btype==='corp' ? 'rizq_corp_packages' : btype==='individual' ? 'rizq_individual_packages' : 'rizq_store_packages';
  var catalogKey = btype==='office' ? 'office' : btype==='corp' ? 'corp' : btype==='individual' ? 'individual' : 'store';
  var pkgs=null;
  if(window.RizqPackagesConfig){
    try{
      if(typeof RizqPackagesConfig.getPackagesForTool==='function'){
        var cat=RizqPackagesConfig.getPackagesForTool(isFr?'fr':'ar', catalogKey);
        if(cat&&cat.length) pkgs=cat.slice();
      } else if(typeof RizqPackagesConfig.getCatalog==='function'){
        var cat2=RizqPackagesConfig.getCatalog(catalogKey);
        if(cat2&&cat2.length) pkgs=cat2.slice();
      }
      if(!pkgs && RizqPackagesConfig.CATALOGS && RizqPackagesConfig.CATALOGS[catalogKey]){
        pkgs=JSON.parse(JSON.stringify(RizqPackagesConfig.CATALOGS[catalogKey]));
      }
    }catch(e){}
  }
  if(!pkgs){ try{ pkgs=JSON.parse(localStorage.getItem(lsKey)||'null'); }catch(e){ pkgs=null; } }
  if(!pkgs || !pkgs.length){
    pkgs = (window.RizqPackagesUI && typeof RizqPackagesUI.getPackages==='function')
      ? RizqPackagesUI.getPackages(catalogKey)
      : [];
  }
  if(btype!=='individual' && window.RizqPackagesConfig && typeof RizqPackagesConfig.withDiamond==='function'){
    pkgs=RizqPackagesConfig.withDiamond(pkgs, isFr?'fr':'ar', catalogKey);
  } else if(window.RizqPackagesConfig && typeof RizqPackagesConfig.enrichForDisplay==='function'){
    pkgs=pkgs.map(function(p){ return RizqPackagesConfig.enrichForDisplay(p, isFr?'fr':'ar'); });
  }

  var html='';
  pkgs.forEach(function(p,i){
    var isDia = p.diamond||p.isDiamond||String(p.name).indexOf('ماسي')!==-1;
    var isTrial = p.trial||p.price===0;
    var isHigh = p.highlight;
    var border = isDia?'1.5px solid rgba(168,85,247,.45)':isHigh?'1.5px solid rgba(201,168,76,.55)':'1.5px solid #e2e8f0';
    var bg = isDia?'#faf5ff':isHigh?'#fffef8':isTrial?'#f0fdf4':'#ffffff';
    var icon = isTrial?'🎁':isDia?'💎':isHigh?'⭐':'👑';
    var pName   = isFr ? trPkg(p.name_fr || p.name) : p.name;
    var pPeriod = isFr ? trPkg(p.period_fr || p.period || '') : (p.period || '');
    var freeLbl = isFr ? 'Gratuit' : 'مجاني';
    var priceStr = isTrial
      ? '<span class="pp-pkg-price-free" style="font-weight:800;font-size:15px;color:#15803d">'+freeLbl+'</span>'
      : '<span class="pp-pkg-price" style="font-weight:800;font-size:15px;color:'+(isDia?'#7c3aed':'#0f2347')+'">'+(p.price||0).toLocaleString('en-US')+'</span> <span class="pp-pkg-period" style="font-size:11px;color:#64748b">MRU'+(pPeriod?('/'+pPeriod):'')+'</span>';
    var featList = (isFr && p.features_fr && p.features_fr.length) ? p.features_fr : (p.features||[]);
    var feats = featList.slice(0,4).map(function(f){return '<span class="pp-pkg-feat" style="font-size:11.5px;color:#475569;background:#f8faff;border:1px solid #eef2f7;border-radius:10px;padding:3px 8px">✓ '+ (isFr ? trPkg(f) : f) +'</span>';}).join('');
    var bestLbl = isDia ? (isFr ? (p.featuredBadge_fr || p.featuredBadge || 'Le plus choisi par les entreprises') : (p.featuredBadge || 'الأكثر اختياراً للشركات')) : (isFr ? '💎 Meilleure offre' : '💎 الأفضل');
    var popularLbl = isFr ? '⭐ Le plus demandé' : '⭐ الأكثر طلباً';
    html+='<div data-pkgi="'+i+'" onclick="ppSelectPkg(this,'+i+')" style="cursor:pointer;border:'+border+';background:'+bg+';border-radius:14px;padding:14px 15px;transition:all .2s;position:relative" class="pp-pkg-card">'
      +(isDia?'<div style="position:absolute;top:-10px;inset-inline-end:14px;background:linear-gradient(135deg,#a855f7,#c084fc);color:#fff;font-size:9px;font-weight:900;padding:3px 12px;border-radius:20px">'+bestLbl+'</div>':'')
      +(isHigh&&!isDia?'<div style="position:absolute;top:-10px;inset-inline-end:14px;background:linear-gradient(135deg,#c9a84c,#d4bc72);color:#0d1b2a;font-size:9px;font-weight:900;padding:3px 12px;border-radius:20px">'+popularLbl+'</div>':'')
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:10px">'
      +'<div style="display:flex;align-items:center;gap:10px;min-width:0"><div id="pp-chk-'+i+'" class="pp-chk" style="width:20px;height:20px;border-radius:50%;border:2px solid #cbd5e1;flex-shrink:0;transition:all .2s;background:#fff"></div>'
      +'<span class="pp-pkg-title" style="font-size:14px;font-weight:800;color:#0f2347;line-height:1.35">'+icon+' '+pName+'</span></div>'
      +'<div style="flex-shrink:0;text-align:end">'+priceStr+'</div></div>'
      +'<div style="display:flex;flex-wrap:wrap;gap:6px">'+feats+'</div>'
      +'</div>';
  });
  document.getElementById('pp-pkg-list').innerHTML=html;
  _ppPkgCatalog = pkgs.slice();
  // auto-select highlight
  var cards=document.querySelectorAll('.pp-pkg-card');
  var defIdx=1; // monthly by default
  if(cards[defIdx]) ppSelectPkg(cards[defIdx],defIdx);
  else renderRegActivitySelects(btype, pkgs[0] && pkgs[0].id);
}

function ppSelectPkg(el,i){
  document.querySelectorAll('.pp-pkg-card').forEach(function(c,ci){
    c.style.boxShadow='none';
    c.style.transform='scale(1)';
    var chk=document.getElementById('pp-chk-'+ci);
    if(chk){chk.style.background='';chk.style.borderColor='rgba(255,255,255,.25)';chk.innerHTML='';}
  });
  el.style.boxShadow='0 0 0 2px var(--gold)';
  el.style.transform='scale(1.01)';
  var chk=document.getElementById('pp-chk-'+i);
  if(chk){chk.style.background='var(--gold)';chk.style.borderColor='var(--gold)';chk.innerHTML='<svg viewBox="0 0 10 8" fill="none" style="width:8px;height:7px;margin:2px auto;display:block"><path d="M1 4l2.5 2.5 5.5-5.5" stroke="#0d1b2a" stroke-width="2" stroke-linecap="round"/></svg>';}
  // Read package data
  var cards=document.querySelectorAll('.pp-pkg-card');
  _ppSelectedPkg = {idx:i, el:el};
  // Extract name & price from rendered element text
  var nameEl=el.querySelector('span[style*="font-size:13px"]');
  var priceEl=el.querySelector('span[style*="font-weight:800"]');
  _ppSelectedPkg.name = nameEl ? nameEl.textContent.trim() : (isAr ? 'شهرية' : 'Mensuelle');
  _ppSelectedPkg.price = priceEl ? priceEl.textContent.trim() : '0';
  _ppSelectedPkg.isTrial = _ppSelectedPkg.price==='مجاني'||_ppSelectedPkg.price==='Gratuit'||_ppSelectedPkg.price==='0'||parseInt(_ppSelectedPkg.price)===0;
  var pkg = _ppPkgCatalog && _ppPkgCatalog[i];
  _ppSelectedPkg.id = pkg && pkg.id ? pkg.id : null;
  ppRenderActivitiesForSelectedPkg();
}

function ppRenderPayMethods(){
  var codes=[]; try{codes=JSON.parse(localStorage.getItem('rizq_bank_codes')||'[]').filter(function(b){return b.active!==false;});}catch(e){}
  if(!codes.length){
    codes=[
      {bank:'تحويل بنكي',code:'MR40 0001 0001 0001234 5678',note:'ابعث الحوالة ثم ارفع صورة الوصل'},
      {bank:'بنكيلي Bankily',code:'22 30 00 00',note:'حول للرقم أعلاه وارفع صورة التأكيد'},
      {bank:'سداد Sedad',code:'MR-RIZQ-2025',note:'استخدم رمز المعاملة عند رفع الوصل'}
    ];
  }
  var icons={'تحويل بنكي':'🏦','bankily':'📱','بنكيلي':'📱','sedad':'💳','سداد':'💳','bimbam':'📱'};
  var html=codes.map(function(c){
    var icon='💳';
    Object.keys(icons).forEach(function(k){if(c.bank.toLowerCase().includes(k)||String(c.type||'').toLowerCase().includes(k))icon=icons[k];});
    return '<div class="pp-pay-row" style="display:flex;align-items:flex-start;gap:10px">'
      +'<span style="font-size:20px;flex-shrink:0;line-height:1">'+icon+'</span>'
      +'<div style="flex:1;min-width:0"><div class="pp-pay-bank" style="font-size:13px;margin-bottom:3px;color:#0f2347;font-weight:800">'+c.bank+'</div>'
      +'<div class="pp-pay-code" dir="ltr" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;margin-bottom:3px;letter-spacing:.4px;color:#1b3a6b;font-weight:700">'+c.code+'</div>'
      +(c.note?'<div class="pp-pay-note" style="font-size:11px;line-height:1.5;color:#64748b">'+c.note+'</div>':'')
      +'</div></div>';
  }).join('');
  document.getElementById('pp-pay-methods').innerHTML=html;
}

function ppHandleReceipt(input){
  if(!input.files||!input.files[0])return;
  var f=input.files[0];
  if(f.size>5*1024*1024){alert(isAr?'الحجم يجب أن لا يتجاوز 5MB':'La taille ne doit pas dépasser 5 Mo');return;}
  _ppReceiptName=f.name;
  var reader=new FileReader();
  reader.onload=function(e){
    _ppReceiptB64=e.target.result;
    var isImg=f.type.startsWith('image/');
    document.getElementById('pp-receipt-img').src=isImg?_ppReceiptB64:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text y="50" font-size="50">📄</text></svg>';
    document.getElementById('pp-receipt-name').textContent='✅ '+f.name+' ('+Math.round(f.size/1024)+' KB)';
    document.getElementById('pp-receipt-preview').style.display='block';
    document.getElementById('pp-receipt-zone').style.display='none';
  };
  reader.readAsDataURL(f);
}

function ppClearReceipt(){
  _ppReceiptB64=null; _ppReceiptName='';
  document.getElementById('pp-receipt-input').value='';
  document.getElementById('pp-receipt-preview').style.display='none';
  document.getElementById('pp-receipt-zone').style.display='block';
}

function ppBack(){
  showPanel(_ppBackPanel, _ppBackDot, 4);
}

function ppFinalSubmit(){
  if(!_ppSelectedPkg){alert(isAr?'يرجى اختيار باقة':'Veuillez choisir un forfait');return;}
  var accountType = (_ppPendingData && _ppPendingData.type) || bizType || 'store';
  var activityId = (document.getElementById('pp-activity-select') && document.getElementById('pp-activity-select').value) || '';
  if(!activityId){
    var formMap = { store: 'st-cat', office: 'of-cat', corp: 'cr-cat' };
    var formSel = document.getElementById(formMap[accountType]);
    activityId = formSel ? formSel.value : '';
  }
  if(!activityId){alert(isAr?'يرجى اختيار النشاط التجاري المناسب لباقتك':'Veuillez choisir l\'activité commerciale correspondant à votre forfait');return;}
  if(window.RizqMerchantActivities && !RizqMerchantActivities.isAllowed(activityId, accountType, _ppSelectedPkg.id)){
    alert(isAr?'النشاط المختار غير متاح لهذه الباقة':'Cette activité n\'est pas disponible pour ce forfait');return;
  }
  var isTrial=_ppSelectedPkg.isTrial;
  if(!isTrial && !_ppReceiptB64){
    if(!confirm(isAr?'لم ترفع وصل الدفع بعد. هل تريد المتابعة؟ (يمكنك رفعه لاحقاً من لوحة التحكم)':'Vous n\'avez pas encore téléchargé le reçu de paiement. Voulez-vous continuer ? (Vous pourrez le télécharger plus tard depuis votre tableau de bord)')) return;
  }
  var data = Object.assign({}, _ppPendingData||{});
  data.package      = _ppSelectedPkg.name;
  data.packageId    = _ppSelectedPkg.id || null;
  data.package_price= _ppSelectedPkg.price;
  data.activityId   = activityId;
  data.activity     = window.RizqMerchantActivities ? RizqMerchantActivities.displayName(activityId, _regLang()) : activityId;
  data.category     = window.RizqMerchantActivities ? RizqMerchantActivities.legacyCategoryFromActivity(activityId) : 'أخرى';
  data.package_paid = !isTrial;
  data.receipt_image= _ppReceiptB64||null;
  data.receipt_name = _ppReceiptName||null;
  data.pkg_status   = isTrial?'trial':((_ppReceiptB64)?'pending_payment_review':'pending_payment');
  Promise.resolve(saveAccountPending(data)).then(function(result){
    if(!result || result.ok === false || result.blocked){
      alert((result && result.message) || (isAr ? 'تعذّر إتمام التسجيل، أعد المحاولة' : 'Impossible de finaliser l\'inscription, réessayez'));
      _reenablePkgSubmitBtn();
      return;
    }
    var afterOtp = Promise.resolve(result);
    if(result && result.otpRequired && data.email && (result.accessToken || data.backendAccessToken)){
      afterOtp = _completeEmailOtpActivation(data, result).then(function(act){
        if(act && act.ok && act.activated){
          data.status = 'approved';
          result.autoApproved = true;
          result.status = 'approved';
        } else if(act && act.message){
          alert(act.message);
        }
        return result;
      });
    }
    return afterOtp.then(function(result2){
    if(!result2 || result2.ok === false || result2.blocked){
      alert((result2 && result2.message) || (isAr ? 'تعذّر إتمام التسجيل، أعد المحاولة' : 'Impossible de finaliser l\'inscription, réessayez'));
      _reenablePkgSubmitBtn();
      return;
    }
    var okEl=document.getElementById('p-ok');
    if(okEl){
      var h3=okEl.querySelector('h3');
      var autoApproved = data.status === 'approved' || (result2 && result2.autoApproved);
      if(h3 && isTrial) h3.textContent=isAr?'🎉 مرحباً في رزق — ابدأ تجربتك المجانية!':'🎉 Bienvenue chez Rizq — commencez votre essai gratuit !';
      else if(h3 && autoApproved) h3.textContent=isAr?'🎉 حسابك مُفعَّل — ابدأ الآن!':'🎉 Compte activé — commencez maintenant !';
      else if(h3) h3.textContent=isAr?'🎉 طلبك قيد المراجعة!':'🎉 Votre demande est en cours de révision !';
      var okDesc=okEl.querySelector('p');
      if(okDesc && window.RizqVerificationPolicy && RizqVerificationPolicy.requiresActivityAndId(data.type)){
        okDesc.innerHTML=isAr
          ? 'تم استلام طلبك. وثائق النشاط محفوظة في ملفك — صورة الهوية ستُحذف بعد التوثيق ويبقى NNI.<br/>المراجعة عادةً خلال 24–48 ساعة.'
          : 'Demande et documents reçus.<br/>Vérification licence/registre/NINEA — généralement sous 24–48 h. Vous serez notifié à l\'activation.';
      }
    }
    showPanel('p-ok', 4, 4);
    if (data.status === 'approved' && data.token && window.RizqAccount && typeof window.RizqAccount.goAfterRegistration === 'function') {
      setTimeout(function () { window.RizqAccount.goAfterRegistration(data); }, 1400);
    }
    });
  }).catch(function(){
    alert(isAr ? 'تعذّر إتمام التسجيل، أعد المحاولة' : 'Impossible de finaliser l\'inscription, réessayez');
    _reenablePkgSubmitBtn();
  });
}


function submitStoreReg(){
  const name=document.getElementById('st-name').value.trim();
  const owner=document.getElementById('st-owner').value.trim();
  const phoneRaw=document.getElementById('st-phone').value.trim();
  const city=document.getElementById('st-city').value.trim();
  const nni=document.getElementById('st-nni').value.trim();
  const pw=document.getElementById('st-pw').value;
  const pw2=document.getElementById('st-pw2').value;
  if(!name||!owner||!phoneRaw||!city){alert(isAr?'يرجى ملء جميع الحقول الإلزامية':'Veuillez remplir tous les champs obligatoires');return;}
  const phones = (window.RizqPhone && RizqPhone.resolveMerchantPhone(phoneRaw)) || null;
  if(!phones){alert((window.RizqPhone&&RizqPhone.phoneErrorMessage(isAr))||(isAr?'رقم هاتف غير صالح':'Numéro invalide'));return;}
  const stEmail=(document.getElementById('st-email')&&document.getElementById('st-email').value.trim().toLowerCase())||'';
  if(!stEmail||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stEmail)){alert(isAr?'البريد الإلكتروني مطلوب لتسجيل الدخول لاحقاً':'E-mail obligatoire pour vous connecter plus tard');return;}
  if(!NNI_RE.test(nni)){alert(isAr?'يرجى إدخال رقم تعريف وطني (NNI) صالح — أرقام فقط':'Veuillez saisir un numéro d\'identité nationale (NNI) valide — chiffres uniquement');return;}
  if(pw.length<8){alert(isAr?'كلمة المرور يجب أن تكون 8 أحرف على الأقل':'Le mot de passe doit contenir au moins 8 caractères');return;}
  if(pw!==pw2){alert(isAr?'كلمة المرور غير متطابقة':'Les mots de passe ne correspondent pas');return;}
  if(!stFile){alert(isAr?'يرجى رفع صورة البطاقة الوطنية':'Veuillez télécharger une photo de la carte d\'identité nationale');return;}
  checkNniAvailable(nni).then(function(ok){
    if(!ok) return;
    // إصلاح 13/08/2026: stFile كان يُتحقَّق من وجوده فقط لمنع المتابعة بلا رفع،
    // لكن محتواه الفعلي لم يكن يُقرأ أو يُرفَق بالحساب أبداً — الصورة تُفقَد
    // بالكامل بمجرد الضغط على "إرسال الطلب"، ولا تُخزَّن حتى محلياً.
    _fileToBase64(stFile).then(function(id_image){
      _ppPendingData={type:'store',name,owner,phone:phones.phone||phones.whatsapp,phoneIntl:phones.phoneIntl,whatsapp:phones.whatsapp,city,nni,id_image,email:document.getElementById('st-email').value.trim(),password:pw,trial_ends:new Date(Date.now()+10*86400000).toISOString()};
      _ppBackPanel='p-store-form'; _ppBackDot=2;
      ppShowPanel();
    });
  });
}

function submitOfficeReg(){
  const name=document.getElementById('of-name').value.trim();
  const owner=document.getElementById('of-owner').value.trim();
  const phoneRaw=document.getElementById('of-phone').value.trim();
  const email=document.getElementById('of-email').value.trim();
  const city=document.getElementById('of-city').value.trim();
  const nni=document.getElementById('of-nni').value.trim();
  const pw=document.getElementById('of-pw').value;
  const pw2=document.getElementById('of-pw2').value;
  if(!name||!owner||!phoneRaw||!email||!city){alert(isAr?'يرجى ملء جميع الحقول الإلزامية':'Veuillez remplir tous les champs obligatoires');return;}
  const phones = (window.RizqPhone && RizqPhone.resolveMerchantPhone(phoneRaw)) || null;
  if(!phones){alert((window.RizqPhone&&RizqPhone.phoneErrorMessage(isAr))||(isAr?'رقم هاتف غير صالح':'Numéro invalide'));return;}
  if(!NNI_RE.test(nni)){alert(isAr?'يرجى إدخال رقم تعريف وطني (NNI) صالح — أرقام فقط':'Veuillez saisir un numéro d\'identité nationale (NNI) valide — chiffres uniquement');return;}
  if(pw.length<8){alert(isAr?'كلمة المرور يجب أن تكون 8 أحرف على الأقل':'Le mot de passe doit contenir au moins 8 caractères');return;}
  if(pw!==pw2){alert(isAr?'كلمة المرور غير متطابقة':'Les mots de passe ne correspondent pas');return;}
  if(!ofFile1||!ofFile2){alert(isAr?'يرجى رفع رخصة النشاط والبطاقة الوطنية':'Veuillez télécharger la licence d\'activité et la carte d\'identité nationale');return;}
  checkNniAvailable(nni).then(function(ok){
    if(!ok) return;
    // ofFile2 = البطاقة الوطنية (id_image الحقيقي)، ofFile1 = رخصة النشاط
    // (license_image) — كلاهما كان يُفقَد تماماً بعد الرفع، لم يُقرآ أبداً.
    Promise.all([_fileToBase64(ofFile2), _fileToBase64(ofFile1)]).then(function(r){
      var id_image=r[0], license_image=r[1];
      _ppPendingData={type:'office',name,owner,phone:phones.phone||phones.whatsapp,phoneIntl:phones.phoneIntl,whatsapp:phones.whatsapp,email,city,nni,id_image,license_image,ninea:document.getElementById('of-ninea').value.trim(),password:pw,trial_ends:new Date(Date.now()+10*86400000).toISOString()};
      _ppBackPanel='p-office-form'; _ppBackDot=2;
      ppShowPanel();
    });
  });
}

function submitCorpReg(){
  const name=document.getElementById('cr-name').value.trim();
  const ninea=document.getElementById('cr-ninea').value.trim();
  const manager=document.getElementById('cr-manager').value.trim();
  const phoneRaw=document.getElementById('cr-phone').value.trim();
  const email=document.getElementById('cr-email').value.trim();
  const city=document.getElementById('cr-city').value.trim();
  const nni=document.getElementById('cr-nni').value.trim();
  const pw=document.getElementById('cr-pw').value;
  const pw2=document.getElementById('cr-pw2').value;
  if(!name||!ninea||!manager||!phoneRaw||!email||!city){alert(isAr?'يرجى ملء جميع الحقول الإلزامية':'Veuillez remplir tous les champs obligatoires');return;}
  const phones = (window.RizqPhone && RizqPhone.resolveMerchantPhone(phoneRaw)) || null;
  if(!phones){alert((window.RizqPhone&&RizqPhone.phoneErrorMessage(isAr))||(isAr?'رقم هاتف غير صالح':'Numéro invalide'));return;}
  if(!NNI_RE.test(nni)){alert(isAr?'يرجى إدخال رقم تعريف وطني (NNI) صالح — أرقام فقط':'Veuillez saisir un numéro d\'identité nationale (NNI) valide — chiffres uniquement');return;}
  if(pw.length<8){alert(isAr?'كلمة المرور يجب أن تكون 8 أحرف على الأقل':'Le mot de passe doit contenir au moins 8 caractères');return;}
  if(pw!==pw2){alert(isAr?'كلمة المرور غير متطابقة':'Les mots de passe ne correspondent pas');return;}
  if(!crFile1||!crFile2||!crFile3){alert(isAr?'يرجى رفع السجل التجاري ورخصة النشاط وبطاقة هوية المدير':'Veuillez télécharger le registre, la licence et la carte d\'identité du directeur');return;}
  checkNniAvailable(nni).then(function(ok){
    if(!ok) return;
    Promise.all([_fileToBase64(crFile3), _fileToBase64(crFile1), _fileToBase64(crFile2)]).then(function(r){
      var id_image=r[0], license_image=r[1], activity_image2=r[2];
      _ppPendingData={type:'corp',name,ninea,manager,phone:phones.phone||phones.whatsapp,phoneIntl:phones.phoneIntl,whatsapp:phones.whatsapp,email,city,nni,id_image,license_image,activity_image2,password:pw,trial_ends:new Date(Date.now()+10*86400000).toISOString()};
      _ppBackPanel='p-corp-form'; _ppBackDot=2;
      ppShowPanel();
    });
  });
}

function submitIndividualReg(){
  const name=document.getElementById('ind-name').value.trim();
  const phoneMr=(document.getElementById('ind-phone-mr').value||'').replace(/\D/g,'');
  const phoneIntl=_normalizeIntlPhone(document.getElementById('ind-phone-intl').value);
  const whatsapp=_normalizeIntlPhone(document.getElementById('ind-whatsapp').value);
  const city=document.getElementById('ind-city').value.trim();
  const email=document.getElementById('ind-email').value.trim().toLowerCase();
  const nni=document.getElementById('ind-nni').value.trim();
  const foreignIdEl=document.getElementById('ind-foreign-id');
  const foreignId=foreignIdEl ? foreignIdEl.value.trim() : '';
  const natCountryEl=document.getElementById('ind-nationality-country');
  const nationalityCountry=natCountryEl ? natCountryEl.value.trim() : '';
  const pw=document.getElementById('ind-pw').value;
  const pw2=document.getElementById('ind-pw2').value;
  const emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const mrRx=/^(2[0-9]|3[0-9]|4[0-9])\d{6}$/;
  if(!name||!city||!email){alert(isAr?'يرجى ملء الاسم والمدينة والبريد الإلكتروني':'Veuillez remplir le nom, la ville et l\'e-mail');return;}
  if(!emailRx.test(email)){alert(isAr?'يرجى إدخال بريد إلكتروني صحيح':'Veuillez saisir une adresse e-mail valide');return;}
  if(!mrRx.test(phoneMr) && !phoneIntl){alert(isAr?'أدخل هاتفاً موريتانياً أو رقماً دولياً':'Saisissez un numéro mauritanien ou international');return;}
  if(!whatsapp){alert(isAr?'رقم واتساب صالح مطلوب':'Numéro WhatsApp valide requis');return;}
  var isMr = natType !== 'int';
  if(isMr && !NNI_RE.test(nni)){alert(isAr?'يرجى إدخال رقم تعريف وطني (NNI) صالح — أرقام فقط':'Veuillez saisir un numéro d\'identité nationale (NNI) valide — chiffres uniquement');return;}
  if(!isMr){
    if(!nationalityCountry || nationalityCountry.length < 2){
      alert(isAr?'يرجى إدخال جنسيتك (اسم الدولة)':'Veuillez indiquer votre nationalité (pays)');
      return;
    }
    if(!foreignId || foreignId.replace(/\s/g,'').length < 5){
      alert(isAr?'يرجى إدخال رقم جواز السفر أو بطاقة الإقامة':'Veuillez saisir le n° de passeport ou de carte de séjour');
      return;
    }
  }
  if(pw.length<8){alert(isAr?'كلمة المرور يجب أن تكون 8 أحرف على الأقل':'Le mot de passe doit contenir au moins 8 caractères');return;}
  if(pw!==pw2){alert(isAr?'كلمة المرور غير متطابقة':'Les mots de passe ne correspondent pas');return;}
  if(!indFile){alert(isAr?(isMr?'يرجى رفع صورة البطاقة الوطنية':'يرجى رفع جواز السفر أو بطاقة الإقامة/الجنسية'):(isMr?'Veuillez télécharger une photo de la carte d\'identité nationale':'Veuillez télécharger votre passeport ou carte de séjour/nationalité'));return;}
  var termsEl=document.getElementById('ind-terms');
  if(termsEl && !termsEl.checked){alert(isAr?'يجب الموافقة على شروط المنصة لإرسال الطلب':'Veuillez accepter les conditions pour envoyer la demande');return;}
  var primaryPhone = mrRx.test(phoneMr) ? phoneMr : whatsapp.replace(/\D/g,'').slice(-15);
  function finishIndividualReg(){
    _fileToBase64(indFile).then(function(id_image){
    _ppPendingData={
      type:'individual',
      nationality: isMr ? 'mr' : 'foreign',
      nationalityCountry: isMr ? 'MR' : nationalityCountry,
      name,owner:name,
      phone: primaryPhone,
      phoneIntl: phoneIntl,
      whatsapp: whatsapp,
      city,
      nni: isMr ? nni : '',
      foreignId: isMr ? '' : foreignId,
      email: email,
      password: pw,
      id_image: id_image,
      trial_ends:new Date(Date.now()+10*86400000).toISOString()
    };
    _ppBackPanel='p-individual-form'; _ppBackDot=2;
    ppShowPanel();
    });
  }
  function runAfterOtp(){
    if(isMr){
      checkNniAvailable(nni).then(function(ok){
        if(!ok) return;
        finishIndividualReg();
      });
      return;
    }
    finishIndividualReg();
  }
  var otpData={ name:name, email:email, phoneMr:phoneMr, phoneIntl:phoneIntl, whatsapp:whatsapp };
  /* لا نفتح طبقة OTP فوق صفحة التسجيل — كانت تُخفى بـ CSS فتبدو الواجهة جامدة */
  runAfterOtp();
}

function selectType(t){
  /* browse = مسار المشتري عبر «حسابي» فقط — لا بطاقة مكررة في إنشاء حساب البائع */
  if(t==='browse'){
    location.href='rizq_register.html?mode=buyer';
    return;
  }
  acctType=t;
  ['private','estate','company'].forEach(x=>{
    const card=document.getElementById('type-'+x);
    const chk=document.getElementById('chk-'+x);
    if(!card||!chk) return;
    if(x===t){
      card.style.borderColor='rgba(201,168,76,.6)';
      card.style.background='rgba(201,168,76,.08)';
      chk.style.background='var(--gold)';
      chk.style.borderColor='var(--gold)';
      chk.innerHTML='<svg viewBox="0 0 12 10" fill="none" style="width:10px;height:8px;margin:auto;display:block;margin-top:3px"><path d="M1 5l3 3 7-7" stroke="#0f2347" stroke-width="2" stroke-linecap="round"/></svg>';
    } else {
      card.style.borderColor='rgba(255,255,255,.1)';
      card.style.background='rgba(255,255,255,.04)';
      chk.style.background='transparent';
      chk.style.borderColor='rgba(255,255,255,.2)';
      chk.innerHTML='';
    }
  });
}

function goFromType(){
  if(!acctType){alert(isAr?'يرجى اختيار نوع الحساب':'Veuillez choisir le type de compte');return;}
  if(acctType==='browse'){
    location.href='rizq_register.html?mode=buyer';
    return;
  }
  if(acctType==='estate'){
    /* مسار مستقل مثل المحل/المكتب → تسجيل عقاري ثم داشبورد العقارات */
    location.href='rizq_real_estate_register.html';
    return;
  }
  if(acctType==='private'){
    showPanel('p-nat-type',1,5);
  } else {
    showPanel('p-biz-type',1,4);
  }
}

function selectNatType(t){
  natType=t;
  ['mr','int'].forEach(function(x){
    var card=document.getElementById('nat-'+x);
    var chk=document.getElementById('chk-nat-'+x);
    if(!card||!chk) return;
    if(x===t){
      card.style.borderColor='rgba(201,168,76,.6)';
      card.style.background='rgba(201,168,76,.08)';
      chk.style.background='var(--gold)';
      chk.style.borderColor='var(--gold)';
      chk.innerHTML='<svg viewBox="0 0 12 10" fill="none" style="width:10px;height:8px;margin:auto;display:block;margin-top:3px"><path d="M1 5l3 3 7-7" stroke="#0f2347" stroke-width="2" stroke-linecap="round"/></svg>';
    } else {
      card.style.borderColor='rgba(255,255,255,.1)';
      card.style.background='rgba(255,255,255,.04)';
      chk.style.background='transparent';
      chk.style.borderColor='rgba(255,255,255,.2)';
      chk.innerHTML='';
    }
  });
}

function applyIndividualNatForm(){
  var isMr = natType !== 'int';
  var lang = (window.RizqI18n && typeof RizqI18n.getLang === 'function') ? RizqI18n.getLang() : (localStorage.getItem('rizq_lang') || 'ar');
  var fr = lang === 'fr';
  var t = (TR && TR[fr ? 'fr' : 'ar']) || {};
  var prefix = isMr ? 'pmr' : 'pint';
  var title = document.querySelector('#p-individual-form h3');
  var sub = document.getElementById('ind-form-sub');
  var idLabel = document.getElementById('ind-id-label');
  var idHint = document.getElementById('ind-id-hint');
  var uploadTxt = document.getElementById('ind-upload-txt');
  var uploadFmt = document.getElementById('ind-upload-fmt');
  var uploadIcon = document.getElementById('ind-upload-icon');
  var nni = document.getElementById('ind-nni');
  var foreignId = document.getElementById('ind-foreign-id');
  var natCountry = document.getElementById('ind-nationality-country');
  var btn = document.getElementById('btn-ind-submit');
  function setText(el, key, alsoDataT){
    if(!el) return;
    var val = t[key];
    if(val) el.textContent = val;
    if(alsoDataT){
      el.setAttribute('data-t', key);
      var frVal = (TR.fr && TR.fr[key]) || '';
      if(frVal) el.setAttribute('data-t-fr', frVal);
    }
  }
  setText(title, prefix + '-title', true);
  setText(sub, prefix + '-sub', true);
  setText(idLabel, prefix + '-id-label', true);
  setText(idHint, prefix + (isMr ? '-id-hint' : '-id-hint'), true);
  setText(uploadTxt, prefix + '-upload-txt', true);
  setText(uploadFmt, prefix + '-upload-hint', true);
  if(uploadIcon) uploadIcon.textContent = isMr ? '🪪' : '🛂';
  if(nni){
    nni.style.display = isMr ? '' : 'none';
    nni.required = !!isMr;
    if(!isMr) nni.value = '';
  }
  if(foreignId){
    foreignId.style.display = isMr ? 'none' : '';
    foreignId.required = !isMr;
    foreignId.placeholder = t['pint-foreign-id-ph'] || foreignId.placeholder;
    if(isMr) foreignId.value = '';
  }
  if(natCountry){
    natCountry.style.display = isMr ? 'none' : '';
    natCountry.required = !isMr;
    natCountry.placeholder = t['pint-nat-country-ph'] || natCountry.placeholder;
    if(isMr) natCountry.value = '';
  }
  if(btn){
    var nextKey = prefix + '-next';
    /* زر الإرسال الحالي «إرسال الطلب» — نُبقي نص الزر كما في الواجهة، ونحدّث data-t فقط */
    btn.setAttribute('data-t', nextKey);
    if(TR.fr && TR.fr[nextKey]) btn.setAttribute('data-t-fr', TR.fr[nextKey]);
  }
  syncIndWhatsapp();
}

function goFromNatType(){
  if(!natType){alert(isAr?'يرجى اختيار جنسيتك':'Veuillez choisir votre nationalité');return;}
  applyIndividualNatForm();
  showPanel('p-individual-form',2,5);
}

// Image preview helper
function prevImg(input,prevId,zoneId){
  if(!input.files||!input.files[0])return;
  const r=new FileReader();
  r.onload=e=>{
    const img=document.getElementById('img-'+prevId.replace('prev-',''));
    if(img)img.src=e.target.result;
    document.getElementById(prevId).style.display='block';
    document.getElementById(zoneId).style.display='none';
  };
  r.readAsDataURL(input.files[0]);
}
function clearImg(fileId,prevId,zoneId){
  document.getElementById(fileId).value='';
  document.getElementById(prevId).style.display='none';
  document.getElementById(zoneId).style.display='block';
}

function goPhoneFromCompany(){
  const n=document.getElementById('co-name').value.trim();
  const ni=document.getElementById('co-ninea').value.trim();
  const e=document.getElementById('co-email').value.trim();
  const c=document.getElementById('co-city').value.trim();
  const p=document.getElementById('co-pw').value;
  const p2=document.getElementById('co-pw2').value;
  const emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!n||!ni||!e||!c||!p||!p2){alert(isAr?'يرجى تعبئة جميع الحقول':'Veuillez remplir tous les champs');return;}
  if(!emailRx.test(e)){alert(isAr?'يرجى إدخال بريد إلكتروني صحيح':'Veuillez saisir une adresse e-mail valide');return;}
  if(p.length<8){alert(isAr?'كلمة المرور يجب أن تكون 8 أحرف على الأقل':'Le mot de passe doit contenir au moins 8 caractères');return;}
  if(p!==p2){alert(isAr?'كلمتا المرور غير متطابقتين':'Les mots de passe ne sont pas identiques');return;}
  if(!document.getElementById('f-co').files||!document.getElementById('f-co').files[0]){
    alert(isAr?'يرجى رفع وثيقة الشركة':'Veuillez télécharger un document de l\'entreprise');return;
  }
  document.getElementById('phone-back-btn').onclick=()=>showPanel('p-company',1,2);
  document.getElementById('phone-step-label').textContent='خطوة 2 من 2 — حساب شركة';
  showPanel('p-phone',2,2);
}

// Escape key closes all modals
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){
    var regModal=document.getElementById('modal');
    if(regModal && regModal.classList.contains('open') && regModal.classList.contains('reg-wizard-mode')){
      return;
    }
    closeModal(true);
    closeSubModal();
    closeDrop();
    closeAdModal();
    closeAllAds();
    closeQcatPortal(true);
  }
});

// OTP
const MR=/^(2[0-9]|3[0-9]|4[0-9])\d{6}$/;
var _otpPendingPhone = '';
var _rizqOtpConfig = { production: false, devHintEnabled: false };

function _loadOtpConfig(cb){
  if(!window.RIZQ_BACKEND_BASE){ if(cb) cb(); return; }
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/otp/config')
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      if(data && data.otp) _rizqOtpConfig = data.otp;
      if(cb) cb();
    }).catch(function(){ if(cb) cb(); });
}

function sendOTP(){
  const ph=document.getElementById('ph-in').value.replace(/\s/g,'');
  if(!MR.test(ph)){
    alert(isAr?'يرجى إدخال رقم هاتف موريتاني مسجل باسمك\n\n✓ Mauritel: يبدأ بـ 2X\n✓ Mattel: يبدأ بـ 3X\n✓ Chinguitel: يبدأ بـ 4X':'Veuillez saisir un numéro de téléphone mauritanien enregistré à votre nom\n\n✓ Mauritel : commence par 2X\n✓ Mattel : commence par 3X\n✓ Chinguitel : commence par 4X');
    return;
  }
  _otpPendingPhone = ph;
  document.getElementById('otp-wrap').style.display='block';
  document.getElementById('btn-send').style.display='none';
  document.getElementById('btn-verify').style.display='block';
  startTimer();

  if(!window.RIZQ_BACKEND_BASE){
    alert(isAr?'⚠️ الخادم غير مُضبّط — لا يمكن إرسال OTP':'⚠️ Serveur non configuré — impossible d\'envoyer l\'OTP');
    return;
  }

  var btn = document.getElementById('btn-send');
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/otp/send', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ phone: ph })
  }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, data: j }; }); })
    .then(function(res){
      if(!res.ok){
        alert((res.data && res.data.message) || (isAr?'تعذّر إرسال الرمز':'Échec de l\'envoi du code'));
        document.getElementById('otp-wrap').style.display='none';
        document.getElementById('btn-send').style.display='block';
        document.getElementById('btn-verify').style.display='none';
        return;
      }
      var msg = isAr ? ('📲 تم إرسال رمز التحقق إلى +222 ' + ph) : ('📲 Code envoyé au +222 ' + ph);
      if(res.data.devHint && !_rizqOtpConfig.production){
        msg += isAr ? ('\n\n(بيئة تطوير — الرمز: ' + res.data.devHint + ')') : ('\n\n(dev — code : ' + res.data.devHint + ')');
      }
      alert(msg);
    }).catch(function(){
      alert(isAr?'تعذّر الاتصال بالخادم':'Échec de connexion au serveur');
      document.getElementById('otp-wrap').style.display='none';
      document.getElementById('btn-send').style.display='block';
      document.getElementById('btn-verify').style.display='none';
    });
}

function verifyOTP(){
  const code=[...document.querySelectorAll('.otp-box')].map(b=>b.value).join('');
  if(code.length<6){alert(isAr?'يرجى إدخال رمز التحقق كاملاً (6 أرقام)':'Veuillez saisir le code de vérification complet (6 chiffres)');return;}
  if(!window.RIZQ_BACKEND_BASE || !_otpPendingPhone){
    alert(isAr?'⚠️ أعد إرسال الرمز أولاً':'⚠️ Renvoyez d\'abord le code');
    return;
  }
  fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/,'') + '/api/otp/verify', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ phone: _otpPendingPhone, code: code })
  }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, data: j }; }); })
    .then(function(res){
      if(!res.ok){
        alert((res.data && res.data.message) || (isAr?'رمز غير صحيح':'Code incorrect'));
        return;
      }
      _otpPendingPhone = '';
      document.querySelectorAll('.otp-box').forEach(b=>b.value='');
      document.getElementById('otp-wrap').style.display='none';
      document.getElementById('btn-send').style.display='block';
      document.getElementById('btn-verify').style.display='none';
      document.getElementById('ph-in').value='';
      var okType = document.getElementById('p-ok').dataset.type || 'private';
      ALL_PANELS.forEach(p=>{const el=document.getElementById(p);if(el)el.style.display='none';});
      document.getElementById('sdots').style.display='none';
      /* بعد تحقق الهاتف: النجاح مباشرة (رفع الهوية داخل نموذج الفرد مسبقاً) */
      var okPanel=document.getElementById('p-ok');
      if(okPanel){
        okPanel.style.display='block';
        okPanel.dataset.type=okType;
      }
    }).catch(function(){
      alert(isAr?'تعذّر الاتصال بالخادم':'Échec de connexion au serveur');
    });
}

_loadOtpConfig();

let tmr;
function startTimer(){
  let s=60;
  document.getElementById('cd').textContent=s;
  clearInterval(tmr);
  tmr=setInterval(()=>{
    s--;
    document.getElementById('cd').textContent=s;
    if(s<=0)clearInterval(tmr);
  },1000);
}

function on(el,i){
  el.value=el.value.replace(/\D/g,'');
  if(el.value&&i<5)document.querySelectorAll('.otp-box')[i+1].focus();
}

// Add backspace support for OTP
document.addEventListener('keydown',function(e){
  if(e.key==='Backspace'){
    const boxes=[...document.querySelectorAll('.otp-box')];
    const idx=boxes.indexOf(document.activeElement);
    if(idx>0&&!boxes[idx].value){
      boxes[idx-1].focus();
      boxes[idx-1].value='';
    }
  }
});

function goToAccount(e){
  if(window.RizqAccount && typeof window.RizqAccount.open === 'function'){
    return window.RizqAccount.open(e);
  }
  if(window.RizqAuthGate && typeof window.RizqAuthGate.openAccountChoice === 'function'){
    window.RizqAuthGate.openAccountChoice();
    return;
  }
  if(window.RizqAuthGate && typeof window.RizqAuthGate.openAccount === 'function'){
    window.RizqAuthGate.openAccount();
    return;
  }
  openModal('login');
}

function doLogin(){
  const e=document.getElementById('li-em').value.trim();
  const p=document.getElementById('li-pw').value;
  const emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!e||!p){alert(isAr?'يرجى تعبئة جميع الحقول':'Veuillez remplir tous les champs');return;}
  if(!emailRx.test(e)){alert(isAr?'يرجى إدخال بريد إلكتروني صحيح':'Veuillez saisir une adresse e-mail valide');return;}
  if(String(p).length < 6){alert(isAr?'كلمة المرور قصيرة جداً':'Mot de passe trop court');return;}
  var btn = document.querySelector('#p-login .m-btn-main');
  if(btn){ btn.disabled = true; btn.textContent = isAr ? 'جارٍ الدخول...' : 'Connexion...'; }
  function unlock(){
    if(btn){ btn.disabled = false; btn.textContent = isAr ? 'دخول ←' : 'Connexion →'; }
  }
  var loginFn = window.RizqAccount && (window.RizqAccount.loginSellerAsync || window.RizqAccount.loginSeller);
  if(typeof loginFn === 'function'){
    Promise.resolve(loginFn.call(window.RizqAccount, e, p)).then(function(res){
      unlock();
      if(res && res.ok && res.url){
        showToast(isAr?'✅ مرحباً بك في رزق!':'✅ Bienvenue sur Rizq !');
        closeModal(true);
        setTimeout(function(){ location.href = res.url; }, 400);
        return;
      }
      var msg = isAr ? 'بيانات الدخول غير صحيحة أو الحساب غير مفعّل بعد.' : 'Identifiants incorrects ou compte non encore activé.';
      if(res && res.code === 'not_approved') msg = isAr ? 'الحساب بانتظار الموافقة.' : 'Compte en attente d\'approbation.';
      if(res && res.code === 'network') msg = isAr ? 'تعذّر الاتصال — حاول مرة أخرى.' : 'Connexion impossible — réessayez.';
      alert(msg);
    }).catch(function(){
      unlock();
      alert(isAr?'تعذّر الاتصال — حاول مرة أخرى':'Connexion impossible — réessayez');
    });
    return;
  }
  unlock();
  var dashUrl = (window.RizqAccount && typeof window.RizqAccount.resolveDashboardUrl === 'function')
    ? window.RizqAccount.resolveDashboardUrl()
    : '';
  if(dashUrl){
    showToast(isAr?'✅ مرحباً بك في رزق!':'✅ Bienvenue sur Rizq !');
    closeModal(true);
    setTimeout(function(){ location.href = dashUrl; }, 400);
    return;
  }
  _loginFail();
}

/* ══ استعادة كلمة مرور البائع (OTP بالبريد) ══ */
var _forgotEmail = '';
function openForgotPassword(){
  var pre = (document.getElementById('li-em') && document.getElementById('li-em').value) || '';
  openModal('forgot');
  var em = document.getElementById('fg-em');
  if(em && pre) em.value = pre.trim();
}
function resetForgotUi(){
  _forgotEmail = '';
  var stepE = document.getElementById('forgot-step-email');
  var stepC = document.getElementById('forgot-step-code');
  if(stepE) stepE.style.display = 'block';
  if(stepC) stepC.style.display = 'none';
  var h = document.getElementById('forgot-heading');
  var s = document.getElementById('forgot-sub');
  if(h) h.textContent = isAr ? 'استعادة كلمة المرور' : 'Récupérer le mot de passe';
  if(s) s.textContent = isAr ? 'أدخل بريد حسابك على رزق لإرسال رمز التحقق' : 'Saisissez l\'e-mail de votre compte Rizq pour recevoir un code';
  document.querySelectorAll('.fg-otp').forEach(function(inp){ inp.value = ''; });
  var pw = document.getElementById('fg-pw');
  var pw2 = document.getElementById('fg-pw2');
  if(pw) pw.value = '';
  if(pw2) pw2.value = '';
  wireForgotOtpBoxes();
}
function wireForgotOtpBoxes(){
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.fg-otp'));
  boxes.forEach(function(box, idx){
    box.oninput = function(){
      var v = String(box.value || '').replace(/\D/g,'').slice(0,1);
      box.value = v;
      if(v && boxes[idx+1]) boxes[idx+1].focus();
    };
    box.onkeydown = function(ev){
      if(ev.key === 'Backspace' && !box.value && boxes[idx-1]){
        boxes[idx-1].focus();
      }
    };
    box.onpaste = function(ev){
      try{
        var t = (ev.clipboardData || window.clipboardData).getData('text') || '';
        var digits = String(t).replace(/\D/g,'').slice(0,6);
        if(digits.length){
          ev.preventDefault();
          digits.split('').forEach(function(d,i){ if(boxes[i]) boxes[i].value = d; });
          if(boxes[Math.min(digits.length, boxes.length)-1]) boxes[Math.min(digits.length, boxes.length)-1].focus();
        }
      }catch(eP){}
    };
  });
}
function forgotReadCode(){
  return Array.prototype.map.call(document.querySelectorAll('.fg-otp'), function(inp){
    return String(inp.value || '').replace(/\D/g,'');
  }).join('').slice(0,6);
}
function forgotSendCode(){
  var emEl = document.getElementById('fg-em');
  var email = (emEl && emEl.value || _forgotEmail || '').trim().toLowerCase();
  var emailRx=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRx.test(email)){ alert(isAr?'يرجى إدخال بريد إلكتروني صحيح':'Veuillez saisir une adresse e-mail valide'); return; }
  var btn = document.getElementById('fg-send-btn');
  var resend = document.getElementById('fg-resend-btn');
  if(btn){ btn.disabled = true; btn.textContent = isAr ? 'جارٍ الإرسال...' : 'Envoi...'; }
  if(resend) resend.disabled = true;
  var fn = window.RizqAccount && window.RizqAccount.requestPasswordReset;
  if(typeof fn !== 'function'){
    if(btn){ btn.disabled = false; btn.textContent = isAr ? 'إرسال الرمز ←' : 'Envoyer le code →'; }
    alert(isAr?'تعذّر الاتصال':'Connexion impossible');
    return;
  }
  fn(email).then(function(res){
    if(btn){ btn.disabled = false; btn.textContent = isAr ? 'إرسال الرمز ←' : 'Envoyer le code →'; }
    if(resend) resend.disabled = false;
    if(!res || !res.ok){
      alert((res && res.error) || (isAr?'تعذّر إرسال الرمز':'Échec d\'envoi du code'));
      return;
    }
    _forgotEmail = email;
    document.getElementById('forgot-step-email').style.display = 'none';
    document.getElementById('forgot-step-code').style.display = 'block';
    var h = document.getElementById('forgot-heading');
    var s = document.getElementById('forgot-sub');
    if(h) h.textContent = isAr ? 'أدخل الرمز وكلمة المرور الجديدة' : 'Code + nouveau mot de passe';
    if(s) s.textContent = isAr ? 'تحقق من بريدك ثم عيّن كلمة مرور جديدة' : 'Vérifiez votre e-mail puis définissez un nouveau mot de passe';
    var hint = document.getElementById('forgot-code-hint');
    var msg = isAr
      ? ('إن وُجد حساب لـ ' + email + ' فسيصلك رمز خلال دقائق.')
      : ('Si un compte existe pour ' + email + ', un code arrivera sous peu.');
    if(res.devHint) msg += (isAr ? ' (تجريبي: ' : ' (dev: ') + res.devHint + ')';
    if(hint) hint.textContent = msg;
    wireForgotOtpBoxes();
    var first = document.querySelector('.fg-otp');
    if(first) first.focus();
  }).catch(function(){
    if(btn){ btn.disabled = false; btn.textContent = isAr ? 'إرسال الرمز ←' : 'Envoyer le code →'; }
    if(resend) resend.disabled = false;
    alert(isAr?'تعذّر الاتصال':'Connexion impossible');
  });
}
function forgotConfirmReset(){
  var email = _forgotEmail || ((document.getElementById('fg-em')||{}).value||'').trim().toLowerCase();
  var code = forgotReadCode();
  var pw = (document.getElementById('fg-pw')||{}).value || '';
  var pw2 = (document.getElementById('fg-pw2')||{}).value || '';
  if(code.length !== 6){ alert(isAr?'أدخل الرمز المكوّن من 6 أرقام':'Saisissez le code à 6 chiffres'); return; }
  if(String(pw).length < 8){ alert(isAr?'كلمة المرور يجب أن تكون 8 أحرف على الأقل':'Le mot de passe doit contenir au moins 8 caractères'); return; }
  if(pw !== pw2){ alert(isAr?'كلمتا المرور غير متطابقتين':'Les mots de passe ne correspondent pas'); return; }
  var btn = document.getElementById('fg-confirm-btn');
  if(btn){ btn.disabled = true; btn.textContent = isAr ? 'جارٍ الحفظ...' : 'Enregistrement...'; }
  var fn = window.RizqAccount && window.RizqAccount.confirmPasswordReset;
  if(typeof fn !== 'function'){
    if(btn){ btn.disabled = false; btn.textContent = isAr ? 'تعيين كلمة المرور ←' : 'Définir le mot de passe →'; }
    alert(isAr?'تعذّر الاتصال':'Connexion impossible');
    return;
  }
  fn(email, code, pw).then(function(res){
    if(btn){ btn.disabled = false; btn.textContent = isAr ? 'تعيين كلمة المرور ←' : 'Définir le mot de passe →'; }
    if(res && res.ok){
      showToast(isAr?'✅ تم تعيين كلمة المرور':'✅ Mot de passe mis à jour');
      closeModal(true);
      if(res.url){
        setTimeout(function(){ location.href = res.url; }, 400);
      } else {
        setTimeout(function(){ openModal('login'); }, 300);
      }
      return;
    }
    var msg = (res && res.error) || (isAr?'تعذّر التعيين — تحقق من الرمز':'Échec — vérifiez le code');
    if(res && res.code === 'weak_password') msg = isAr?'كلمة المرور قصيرة جداً':'Mot de passe trop court';
    alert(msg);
  }).catch(function(){
    if(btn){ btn.disabled = false; btn.textContent = isAr ? 'تعيين كلمة المرور ←' : 'Définir le mot de passe →'; }
    alert(isAr?'تعذّر الاتصال':'Connexion impossible');
  });
}
window.openForgotPassword = openForgotPassword;
