// ══ XSS helpers ══
function escapeHtml(s){ if(!s)return''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escapeAttr(s){ if(!s)return''; return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

// ══ Price translation maps ══
const PRICE_NAME_FR = {
  'أرز (الكيس 25كغ)':'Riz (sac 25kg)','دقيق (الكيس 50كغ)':'Farine (sac 50kg)',
  'زيت طعام (5 لتر)':'Huile alimentaire (5L)','سكر (الكيس 50كغ)':'Sucre (sac 50kg)',
  'حليب مجفف (علبة 2.5كغ)':'Lait en poudre (boîte 2.5kg)','لحم بقر (1كغ)':'Bœuf (1kg)',
  'لحم إبل (1كغ)':'Chameau (1kg)','دجاج (1كغ)':'Poulet (1kg)','طماطم (1كغ)':'Tomates (1kg)',
  'بصل (1كغ)':'Oignons (1kg)','بطاطس (1كغ)':'Pommes de terre (1kg)','خبز (الرغيف)':'Pain (baguette)',
  'شاي أخضر (كغ)':'Thé vert (kg)','معكرونة (علبة 500غ)':'Pâtes (boîte 500g)','فاصوليا بيضاء (كغ)':'Haricots blancs (kg)',
  'سمك طازج (كغ)':'Poisson frais (kg)','بيض (طبق 30)':'Œufs (plateau 30)','زبدة (250غ)':'Beurre (250g)',
  'تمر (كغ)':'Dattes (kg)','ماء معدني (1.5ل)':'Eau minérale (1.5L)',
  'بنزين (سوبر)':'Essence (super)','مازوت (غازوال)':'Diesel (gazole)',
  'غاز بوتان (قارورة 6كغ)':'Gaz butane (bouteille 6kg)',
  'غاز بوتان (قارورة 12.5كغ)':'Gaz butane (bouteille 12.5kg)','زيت محرك (4 لتر)':'Huile moteur (4L)'
};
const PRICE_UNIT_FR = {
  'MRU / كيس':'MRU / sac','MRU / عبوة':'MRU / bidon','MRU / علبة':'MRU / boîte',
  'MRU / كغ':'MRU / kg','MRU / رغيف':'MRU / baguette','MRU / لتر':'MRU / litre',
  'MRU / قارورة':'MRU / bouteille'
};
function trPriceName(n){ return (!isAr && PRICE_NAME_FR[n]) ? PRICE_NAME_FR[n] : n; }
function trPriceUnit(u){ return (!isAr && PRICE_UNIT_FR[u]) ? PRICE_UNIT_FR[u] : u; }

// ══ Prices board ══
/* احتياطي عرض التخرج — إن فشل /api/site-config أو كان localStorage فارغاً */
const DEFAULT_PRICES = {
  food: [
    {icon:'🍚',name:'أرز (الكيس 25كغ)',price:11500,unit:'MRU / كيس',trend:'flat'},
    {icon:'🌾',name:'دقيق (الكيس 50كغ)',price:14800,unit:'MRU / كيس',trend:'up'},
    {icon:'🛢️',name:'زيت طعام (5 لتر)',price:3200,unit:'MRU / عبوة',trend:'up'},
    {icon:'🍬',name:'سكر (الكيس 50كغ)',price:13900,unit:'MRU / كيس',trend:'down'},
    {icon:'🥛',name:'حليب مجفف (علبة 2.5كغ)',price:2650,unit:'MRU / علبة',trend:'flat'},
    {icon:'🥩',name:'لحم بقر (1كغ)',price:340,unit:'MRU / كغ',trend:'up'},
    {icon:'🐪',name:'لحم إبل (1كغ)',price:300,unit:'MRU / كغ',trend:'flat'},
    {icon:'🍗',name:'دجاج (1كغ)',price:185,unit:'MRU / كغ',trend:'down'},
    {icon:'🍅',name:'طماطم (1كغ)',price:55,unit:'MRU / كغ',trend:'up'},
    {icon:'🧅',name:'بصل (1كغ)',price:38,unit:'MRU / كغ',trend:'flat'},
    {icon:'🥔',name:'بطاطس (1كغ)',price:42,unit:'MRU / كغ',trend:'down'},
    {icon:'🍞',name:'خبز (الرغيف)',price:10,unit:'MRU / رغيف',trend:'flat'},
    {icon:'🍵',name:'شاي أخضر (كغ)',price:420,unit:'MRU / كغ',trend:'flat'},
    {icon:'🍝',name:'معكرونة (علبة 500غ)',price:95,unit:'MRU / علبة',trend:'up'},
    {icon:'🫘',name:'فاصوليا بيضاء (كغ)',price:180,unit:'MRU / كغ',trend:'flat'},
    {icon:'🐟',name:'سمك طازج (كغ)',price:220,unit:'MRU / كغ',trend:'up'},
    {icon:'🥚',name:'بيض (طبق 30)',price:450,unit:'MRU / طبق',trend:'down'},
    {icon:'🧈',name:'زبدة (250غ)',price:160,unit:'MRU / عبوة',trend:'flat'},
    {icon:'🌴',name:'تمر (كغ)',price:280,unit:'MRU / كغ',trend:'up'},
    {icon:'🧴',name:'ماء معدني (1.5ل)',price:35,unit:'MRU / قارورة',trend:'flat'}
  ],
  fuel: [
    {icon:'⛽',name:'بنزين (سوبر)',price:16.2,unit:'MRU / لتر',trend:'up'},
    {icon:'🛢️',name:'مازوت (غازوال)',price:15.6,unit:'MRU / لتر',trend:'up'},
    {icon:'🔥',name:'غاز بوتان (قارورة 6كغ)',price:1450,unit:'MRU / قارورة',trend:'flat'},
    {icon:'🔥',name:'غاز بوتان (قارورة 12.5كغ)',price:2700,unit:'MRU / قارورة',trend:'flat'},
    {icon:'🛢️',name:'زيت محرك (4 لتر)',price:3800,unit:'MRU / عبوة',trend:'down'}
  ],
  /* 11 عملة أساسية — الأدمن يضيف المزيد عبر لوحة التحكم / rizq_prices */
  currencies: [
    {code:'USD',icon:'🇺🇸',name:'دولار أمريكي',name_fr:'Dollar américain',divisor:1,enabled:true,adjustPct:0,manual:false,ratePerUnit:40,price:40,trend:'flat'},
    {code:'EUR',icon:'🇪🇺',name:'يورو',name_fr:'Euro',divisor:1,enabled:true,adjustPct:0,manual:false,ratePerUnit:44,price:44,trend:'flat'},
    {code:'MAD',icon:'🇲🇦',name:'درهم مغربي',name_fr:'Dirham marocain',divisor:100,enabled:true,adjustPct:0,manual:false,ratePerUnit:4,price:4,trend:'flat'},
    {code:'DZD',icon:'🇩🇿',name:'دينار جزائري',name_fr:'Dinar algérien',divisor:100,enabled:true,adjustPct:0,manual:false,ratePerUnit:0.3,price:0.3,trend:'flat'},
    {code:'TND',icon:'🇹🇳',name:'دينار تونسي',name_fr:'Dinar tunisien',divisor:100,enabled:true,adjustPct:0,manual:false,ratePerUnit:13,price:13,trend:'flat'},
    {code:'SAR',icon:'🇸🇦',name:'ريال سعودي',name_fr:'Riyal saoudien',divisor:1,enabled:true,adjustPct:0,manual:false,ratePerUnit:10.5,price:10.5,trend:'flat'},
    {code:'AED',icon:'🇦🇪',name:'درهم إماراتي',name_fr:'Dirham émirati',divisor:1,enabled:true,adjustPct:0,manual:false,ratePerUnit:11,price:11,trend:'flat'},
    {code:'XOF',icon:'🌍',name:'فرنك غرب أفريقي',name_fr:'Franc CFA (UEMOA)',divisor:100,enabled:true,adjustPct:0,manual:false,ratePerUnit:0.065,price:0.065,trend:'flat'},
    {code:'TRY',icon:'🇹🇷',name:'ليرة تركية',name_fr:'Livre turque',divisor:1,enabled:true,adjustPct:0,manual:false,ratePerUnit:1.2,price:1.2,trend:'flat'},
    {code:'CNY',icon:'🇨🇳',name:'يوان صيني',name_fr:'Yuan chinois',divisor:1,enabled:true,adjustPct:0,manual:false,ratePerUnit:5.5,price:5.5,trend:'flat'},
    {code:'AOA',icon:'🇦🇴',name:'كوانزا أنغولي',name_fr:'Kwanza angolais',divisor:100,enabled:true,adjustPct:0,manual:false,ratePerUnit:0.045,price:0.045,trend:'flat'}
  ]
};
let _pricesData = [];
let _priceTab = 'food';
function normalizePricesBoard(p){
  if(!p) return [];
  if(Array.isArray(p)) return p;
  const out = [];
  ['food','fuel','currencies'].forEach(function(cat){
    (p[cat]||[]).forEach(function(it){
      if(!it) return;
      if(cat==='currencies' && it.enabled===false) return;
      const row = Object.assign({}, it, { cat: cat });
      if(cat==='currencies'){
        row.name = isAr ? (it.name || it.code) : (it.name_fr || it.name || it.code);
        row.unit = (it.unit || (it.divisor===1 ? ('1 '+it.code) : (it.divisor+' '+it.code))) + ' = MRU';
      }
      out.push(row);
    });
  });
  return out;
}
function priceTrendHTML(t){
  const L = isAr ? {up:'▲ ارتفاع',down:'▼ انخفاض',flat:'● مستقر'} : {up:'▲ Hausse',down:'▼ Baisse',flat:'● Stable'};
  if(t==='up') return '<span class="price-trend up">'+L.up+'</span>';
  if(t==='down') return '<span class="price-trend down">'+L.down+'</span>';
  return '<span class="price-trend flat">'+L.flat+'</span>';
}
/** شعارات العملات المحلية — أعلام الدول (+ شعار CFA لـ XOF) */
const CURRENCY_FLAG_FILES = {
  USD: 'rizq-assets/currency-flags/USD.png',
  EUR: 'rizq-assets/currency-flags/EUR.png',
  MAD: 'rizq-assets/currency-flags/MAD.png',
  DZD: 'rizq-assets/currency-flags/DZD.png',
  TND: 'rizq-assets/currency-flags/TND.png',
  SAR: 'rizq-assets/currency-flags/SAR.png',
  AED: 'rizq-assets/currency-flags/AED.png',
  XOF: 'rizq-assets/currency-flags/XOF.svg',
  TRY: 'rizq-assets/currency-flags/TRY.png',
  CNY: 'rizq-assets/currency-flags/CNY.png',
  AOA: 'rizq-assets/currency-flags/AOA.png'
};
function currencyFlagHTML(it){
  const code = String((it && (it.code || it.unit)) || '').toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
  const src = CURRENCY_FLAG_FILES[code];
  const label = escapeHtml((it && it.name) || code || 'currency');
  if(src){
    const badge = code === 'XOF' ? ' is-badge' : '';
    return '<img class="price-curr-flag-img'+badge+'" src="'+escapeHtml(src)+'" alt="'+label+'" width="26" height="18" loading="lazy" decoding="async">';
  }
  return '<span class="price-curr-flag" aria-hidden="true">'+escapeHtml((it && it.icon) || '💱')+'</span>';
}
/* الرئيسية: شبكة 5×4 = 20 بطاقة — اللوحة الكاملة في rizq_market_pulse.html */
const LANDING_PULSE_PREVIEW = 20;
function renderPrices(){
  const grid = document.getElementById('prices-grid');
  if(!grid) return;
  const allItems = _pricesData.filter(it=>it.cat===_priceTab);
  const items = allItems.slice(0, LANDING_PULSE_PREVIEW);
  const note = document.getElementById('prices-note');
  if(note){
    const more = allItems.length > LANDING_PULSE_PREVIEW ? (allItems.length - LANDING_PULSE_PREVIEW) : 0;
    note.innerHTML = _priceTab==='currencies'
      ? (isAr
        ? ('أسعار إرشادية · عيّنة'+(more?(' · +'+more+' في الصفحة الكاملة'):''))
        : ('Taux indicatifs · aperçu'+(more?(' · +'+more+' sur la page complète'):'')))
      : (isAr
        ? ('الأسعار تقريبية · عيّنة من نبضة السوق'+(more?(' · +'+more+' أخرى'):''))
        : ('Prix indicatifs · aperçu'+(more?(' · +'+more+' autres'):'')));
  }
  const browse = document.getElementById('prices-browse-full');
  if(browse){
    browse.textContent = isAr ? '📈 نبضة السوق — عرض كل الأسعار ←' : '📈 Pouls du marché — tous les prix →';
  }
  if(!items.length){
    grid.innerHTML = '<p class="rzq-empty" style="grid-column:1/-1;text-align:center;color:#6a7a8a;padding:28px 16px;font-size:14px">'+(isAr?'لا توجد أسعار سوق بعد.':'Aucun prix de marché pour le moment.')+'</p>';
    updatePriceTimestamp();
    return;
  }
  grid.innerHTML = items.map(it=>{
    if(it.cat==='currencies'){
      return `<div class="price-card price-card-currency">
        <div class="price-card-head">
          <div class="price-card-top">${currencyFlagHTML(it)}<div class="price-name">${escapeHtml(it.name)}</div></div>
          ${priceTrendHTML(it.trend)}
        </div>
        <div class="price-card-main">
          <div class="price-unit" dir="ltr">${escapeHtml(it.unit)}</div>
          <div class="price-value">${Number(it.price||0).toLocaleString('en-US')}</div>
        </div>
      </div>`;
    }
    return `<div class="price-card">
      <div class="price-card-head">
        <div class="price-name">${escapeHtml(trPriceName(it.name))}</div>
        ${priceTrendHTML(it.trend)}
      </div>
      <div class="price-card-main">
        <div class="price-value">${it.price.toLocaleString()}</div>
        <div class="price-unit">${escapeHtml(trPriceUnit(it.unit))}</div>
      </div>
    </div>`;
  }).join('');
  updatePriceTimestamp();
}
function renderPriceTicker(){
  const track = document.getElementById('price-ticker');
  if(!track) return;
  const wrap = track.closest('.price-ticker-wrap');
  // الشريط يتبع التبويب النشط: مواد غذائية / محروقات / عملات
  const cat = _priceTab || 'food';
  const filtered = _pricesData.filter(function(it){ return it && it.cat === cat; });
  if(wrap){
    var labels = isAr
      ? {food:'آخر تحديثات المواد الغذائية',fuel:'آخر تحديثات المحروقات',currencies:'آخر تحديثات العملات'}
      : {food:'Dernières denrées',fuel:'Derniers carburants',currencies:'Dernières devises'};
    wrap.setAttribute('aria-label', labels[cat] || labels.food);
    wrap.setAttribute('data-ticker-cat', cat);
  }
  if(!filtered.length){ track.innerHTML=''; return; }
  const items = filtered.concat(filtered);
  track.innerHTML = items.map(it=>{
    const nm = it.cat==='currencies' ? it.name : trPriceName(it.name);
    const un = it.cat==='currencies' ? it.unit : trPriceUnit(it.unit);
    return `<span class="ticker-item price-ticker-item"><span class="pt-name">${escapeHtml(nm)}</span> <strong class="pt-price">${Number(it.price||0).toLocaleString('en-US')}</strong> <span class="pt-unit">${escapeHtml(un)}</span> ${priceTrendHTML(it.trend)}</span>`;
  }).join('');
  requestAnimationFrame(function(){ syncMarqueeShift(track); });
}
function updatePriceTimestamp(){
  const el = document.getElementById('prices-updated-date');
  if(!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString(isAr?'ar-MR-u-nu-latn':'fr-FR',{day:'numeric',month:'long',year:'numeric'});
}
function goNavPackage(tab){
  var cards = document.querySelectorAll('#pricing .ptab-card');
  var map = {individual:0, stores:1, offices:2, corp:3, tender:4, investment:5, ads:6};
  var btn = cards[map[tab]] || document.querySelector('#pricing .ptab-card[data-ptab="'+tab+'"]');
  document.querySelectorAll('#pricing .ptab-card').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.price-pane').forEach(function(p){ p.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var pane = document.getElementById('pane-' + tab);
  if (pane) pane.classList.add('active');
}
/**
 * زر الاشتراك الفاخم: يفتح تسجيل حساب القسم مباشرة
 * (محل / معرض / مكتب…) جاهزاً للاشتراك — بلا مرور بالباقات أولاً.
 * إن وُجدت جلسة بنفس النوع → لوحة اشتراكي مباشرة.
 */
function goSubscribePackage(tab){
  var typeMap = { stores:'store', corp:'corp', offices:'office', tender:null, investment:null, individual:'individual' };
  var wantType = typeMap[tab];
  try{ sessionStorage.setItem('rizq_open_panel', 'subscription'); }catch(eIntent){}

  /* جلسة بائع قائمة من نفس النوع → اشتراكي في لوحته */
  try{
    var dashUrl = (window.RizqAccount && typeof window.RizqAccount.resolveDashboardUrl === 'function')
      ? (window.RizqAccount.resolveDashboardUrl() || '')
      : '';
    var sessType = '';
    try{
      var sess = JSON.parse(localStorage.getItem('rizq_active_session') || 'null');
      sessType = (sess && sess.type) ? String(sess.type) : '';
    }catch(eS){}
    if(dashUrl && wantType && sessType === wantType){
      location.href = String(dashUrl).split('#')[0] + '#subscription';
      return false;
    }
    if(dashUrl && (tab === 'tender' || tab === 'investment')){
      location.href = String(dashUrl).split('#')[0] + '#subscription';
      return false;
    }
  }catch(eDash){}

  /* فتح تسجيل حساب بالقسم المناسب مباشرة */
  try{
    if(typeof openRegisterAs === 'function'){
      if(tab === 'stores'){ openRegisterAs('company', 'store'); return false; }
      if(tab === 'corp'){ openRegisterAs('company', 'corp'); return false; }
      if(tab === 'offices'){ openRegisterAs('company', 'office'); return false; }
      if(tab === 'estate' || tab === 'estates' || tab === 'realestate'){ openRegisterAs('estate'); return false; }
      if(tab === 'tender' || tab === 'investment'){ openRegisterAs('company'); return false; }
      if(tab === 'individual'){ openRegisterAs('private'); return false; }
    }
  }catch(eReg){}

  openModal('register');
  return false;
}
window.goSubscribePackage = goSubscribePackage;
function switchPriceTab(tab, btn){
  if(tab==='individual'||tab==='stores'||tab==='offices'||tab==='corp'||tab==='tender'||tab==='investment'||tab==='ads'){
    document.querySelectorAll('#pricing .ptab-card').forEach(function(b){b.classList.remove('active');});
    document.querySelectorAll('.price-pane').forEach(function(p){p.classList.remove('active');});
    if(btn) btn.classList.add('active');
    var pane=document.getElementById('pane-'+tab);
    if(pane) pane.classList.add('active');
    if(typeof window.updateDiamondPitch==='function') window.updateDiamondPitch(tab);
    return;
  }
  _priceTab = tab;
  // إصلاح: كان السلكتور '.price-tab-btn' لا يطابق أي عنصر فعلياً (الكلاس الحقيقي price-tab/ptab-card)،
  // فلم تُزَل حالة "active" عن التبويب القديم أبداً. الحل: تنظيف الإخوة المباشرين لمن نُقر عليه.
  if(btn && btn.parentElement){
    Array.from(btn.parentElement.children).forEach(b=>b.classList.remove('active'));
  }
  if(btn) btn.classList.add('active');
  renderPrices();
  renderPriceTicker();
}
function loadPrices(){
  try{
    const raw = localStorage.getItem('rizq_prices');
    if(raw){
      const p = JSON.parse(raw);
      _pricesData = normalizePricesBoard(p);
      if(_pricesData.length){ renderPrices(); renderPriceTicker(); return; }
    }
  }catch(e){ /* fall through */ }
  /* بلا بيانات مخزّنة أو لوحة فارغة — اعرض احتياطي التخرج */
  _pricesData = normalizePricesBoard(DEFAULT_PRICES);
  try{ if(!localStorage.getItem('rizq_prices')) localStorage.setItem('rizq_prices', JSON.stringify(DEFAULT_PRICES)); }catch(eSeed){}
  renderPrices();
  renderPriceTicker();
}
loadPrices();
window.addEventListener('storage',function(e){ if(e.key==='rizq_prices') loadPrices(); });

// ══ Extra categories from admin ══
function renderExtraCategories(){
  const grid = document.querySelector('.cats-grid');
  if(!grid) return;
  grid.querySelectorAll('.cat-card[data-extra="1"]').forEach(el=>el.remove());
  let extra=[];
  try{ const raw=localStorage.getItem('rizq_extra_categories'); if(raw){ const p=JSON.parse(raw); if(Array.isArray(p)) extra=p; } }catch(e){}
  extra.forEach(function(cat){
    if(!cat||!cat.name) return;
    const card=document.createElement('div');
    card.className='cat-card fade-in';
    card.setAttribute('data-extra','1');
    card.style.position='relative'; card.style.cursor='pointer';
    const dispName = isAr ? cat.name : (cat.name_fr || cat.name);
    const dispCount = isAr ? (cat.count||'جديد') : (cat.count_fr || cat.count || 'Nouveau');
    const subsList = isAr ? (cat.subs||[]) : ((cat.subs_fr && cat.subs_fr.length) ? cat.subs_fr : (cat.subs||[]));
    const subsHTML=subsList.map(function(s){ return '<a class="drop-link" href="#">'+escapeHtml(s)+'</a>'; }).join('');
    card.innerHTML='<div class="cat-icon-box">'+escapeHtml(cat.icon||'🆕')+'</div><span class="cat-name">'+escapeHtml(dispName)+'</span><span class="cat-count">'+escapeHtml(dispCount)+'</span>'+(subsHTML?'<div class="cat-drop"><div class="drop-group"><div class="drop-group-title">'+(isAr?'أقسام فرعية':'Sous-catégories')+'</div>'+subsHTML+'</div></div>':'');
    grid.appendChild(card);
    obs.observe(card);
    _bindCard(card);
  });
}
renderExtraCategories();

// ══ بطاقة "اقترح قسماً جديداً 💡" — دائماً آخر بطاقة في شبكة الأقسام، بعد كل الأقسام الإضافية ══
function renderSuggestCard(){
  const grid = document.querySelector('.cats-grid');
  if(!grid) return;
  const old = grid.querySelector('.cat-card[data-suggest="1"]');
  if(old) old.remove();
  const card = document.createElement('div');
  card.className = 'cat-card fade-in';
  card.setAttribute('data-suggest','1');
  card.style.position = 'relative';
  card.style.cursor = 'pointer';
  card.style.borderStyle = 'dashed';
  card.innerHTML = '<div class="cat-icon-box" style="background:transparent;border:2px dashed rgba(201,168,76,.5);color:#C9A84C">➕</div>'
    + '<span class="cat-name">' + (isAr ? 'اقترح قسماً جديداً 💡' : 'Proposer une section 💡') + '</span>'
    + '<span class="cat-count">' + (isAr ? 'فكرتك تهمنا' : 'Votre idée compte') + '</span>';
  card.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); openSuggestCatModal(); });
  grid.appendChild(card);
  if (typeof obs !== 'undefined' && obs && obs.observe) obs.observe(card);
}
renderSuggestCard();

// ══ نظام Toast بسيط مشترك (كان showToast() يُستدعى في doLogin() بدون أن يكون مُعرَّفاً — خطأ كان يُسقط إعادة التوجيه بعد تسجيل الدخول) ══
function showToast(msg, durationOrType){
  let toast = document.getElementById('rizq-toast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'rizq-toast';
    toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(20px);background:linear-gradient(135deg,#1a2f52,#0d1f3c);border:1px solid rgba(201,168,76,.4);color:#fff;padding:13px 22px;border-radius:12px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 12px 32px rgba(0,0,0,.4);opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;max-width:90vw;text-align:center';
    document.body.appendChild(toast);
  }
  var duration = 2600;
  var type = '';
  if (typeof durationOrType === 'number' && isFinite(durationOrType)) {
    duration = durationOrType;
  } else if (typeof durationOrType === 'string' && durationOrType) {
    if (/^\d+$/.test(durationOrType)) duration = parseInt(durationOrType, 10);
    else type = durationOrType;
  }
  if (type === 'success') {
    toast.style.borderColor = 'rgba(16,185,129,.55)';
    toast.style.boxShadow = '0 12px 32px rgba(0,0,0,.4),0 0 0 1px rgba(16,185,129,.25)';
  } else if (type === 'error') {
    toast.style.borderColor = 'rgba(248,113,113,.55)';
    toast.style.boxShadow = '0 12px 32px rgba(0,0,0,.4),0 0 0 1px rgba(248,113,113,.25)';
  } else {
    toast.style.borderColor = 'rgba(201,168,76,.4)';
    toast.style.boxShadow = '0 12px 32px rgba(0,0,0,.4)';
  }
  toast.textContent = msg;
  clearTimeout(toast._hideTimer);
  requestAnimationFrame(function(){
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  toast._hideTimer = setTimeout(function(){
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, duration);
}
window.showToast = showToast;

// ══ منطق نافذة "اقترح قسماً جديداً" — يكتب في rizq_category_suggestions (يقرأه rizq_admin.html لعرض الأكثر طلباً) ══
function openSuggestCatModal(){
  document.getElementById('suggest-cat-overlay').style.display = 'block';
  document.getElementById('suggest-cat-modal').style.display = 'block';
  const err = document.getElementById('suggest-cat-err');
  err.style.display = 'none'; err.textContent = '';
  const input = document.getElementById('suggest-cat-input');
  input.value = '';
  setTimeout(function(){ input.focus(); }, 50);
}
function closeSuggestCatModal(){
  document.getElementById('suggest-cat-overlay').style.display = 'none';
  document.getElementById('suggest-cat-modal').style.display = 'none';
}
function submitCategorySuggestion(){
  const input = document.getElementById('suggest-cat-input');
  const err = document.getElementById('suggest-cat-err');
  const name = (input.value || '').trim();
  if(!name){
    err.textContent = isAr ? 'يرجى كتابة اسم القسم أولاً' : 'Veuillez écrire le nom de la section';
    err.style.display = 'block';
    input.focus();
    return;
  }
  let suggestions = [];
  try{
    const raw = localStorage.getItem('rizq_category_suggestions');
    if(raw){ const p = JSON.parse(raw); if(Array.isArray(p)) suggestions = p; }
  }catch(e){}
  const norm = name.toLowerCase();
  const existing = suggestions.find(function(s){ return s.name && s.name.trim().toLowerCase() === norm; });
  if(existing){ existing.votes = (existing.votes || 1) + 1; }
  else { suggestions.push({ name: name, votes: 1 }); }
  try{ localStorage.setItem('rizq_category_suggestions', JSON.stringify(suggestions)); }catch(e){}
  closeSuggestCatModal();
  showToast(isAr ? '✅ تم استلام اقتراحك — شكراً لك!' : '✅ Votre suggestion a été reçue — merci !');
}
document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeSuggestCatModal(); });

// ══ مصدر وحيد للحقيقة: عدد الأقسام والفروع يُحسب من DOM فعلياً، لا يُكتب كنص ثابت أبداً ══
function refreshCatStatsText(){
  const grid = document.querySelector('.cats-grid');
  if(!grid) return;
  const n = grid.querySelectorAll('.cat-card:not([data-suggest="1"])').length;
  const m = grid.querySelectorAll('.cat-card:not([data-suggest="1"]) .drop-link').length;
  if(!n) return;
  var cats = [];
  grid.querySelectorAll('.cat-card:not([data-suggest="1"])').forEach(function(card){
    var nameEl = card.querySelector('.cat-name');
    if(!nameEl) return;
    var raw = (nameEl.textContent || '').trim();
    var ar = nameEl.getAttribute('data-ar') || card.getAttribute('data-cat-ar') || '';
    if(!ar){
      var fi = (CAT_NAMES.fr || []).indexOf(raw);
      ar = fi >= 0 ? CAT_NAMES.ar[fi] : raw;
    }
    var ai = (CAT_NAMES.ar || []).indexOf(ar);
    var frName = ai >= 0 ? CAT_NAMES.fr[ai] : ar;
    var iconEl = card.querySelector('.cat-icon-box');
    cats.push({
      ar: ar,
      fr: frName,
      emoji: iconEl ? (iconEl.textContent || '').trim() : '',
      n: card.querySelectorAll('.drop-link').length
    });
  });
  try { localStorage.setItem('rizq_cat_stats', JSON.stringify({n:n,m:m,cats:cats})); } catch(e){}
  LANG.ar['s-cats-desc'] = 'من الدراعة إلى السيارة — كل ما يبحث عنه الموريتاني في مكان واحد';
  LANG.ar['why2-title']  = 'سوق يغطي كل حاجة';
  LANG.ar['why2-desc']   = 'من العقارات إلى الإبل، من الدراعة إلى الحفارات — كل ما تبحث عنه في مكان واحد.';
  LANG.ar['ft-desc']     = 'سوق موريتانيا الإلكتروني للإعلانات والأعمال: محلات، معارض، مناقصات، واستثمارات.';
  LANG.fr['s-cats-desc'] = 'De la daraa à la voiture — tout ce que cherche le Mauritanien, au même endroit';
  LANG.fr['why2-title']  = 'Un marché pour chaque besoin';
  LANG.fr['why2-desc']   = "De l'immobilier aux chameaux, de la daraa aux engins — tout ce que vous cherchez au même endroit.";
  LANG.fr['ft-desc']     = 'Le marché électronique mauritanien des annonces et des affaires : boutiques, showrooms, appels d\'offres et investissements.';
  const lang = (typeof isAr!=='undefined' && !isAr) ? 'fr' : 'ar';
  ['s-cats-desc','why2-title','why2-desc','ft-desc'].forEach(function(key){
    document.querySelectorAll('[data-t="'+key+'"]').forEach(function(el){ el.innerHTML = LANG[lang][key]; });
  });
  const catNum = document.querySelector('#platform-stats [data-stat="cats"] .h-stat-num');
  if(catNum){ catNum.setAttribute('data-target', String(n)); catNum.dataset.counted = '1'; catNum.textContent = String(n); }
  const subNum = document.querySelector('#platform-stats [data-stat="subs"] .h-stat-num');
  if(subNum){ subNum.setAttribute('data-target', String(m)); subNum.dataset.counted = '1'; subNum.textContent = String(m) + (subNum.getAttribute('data-suffix') || ''); }
  const metaDesc = document.querySelector('meta[name="description"]');
  if(metaDesc) metaDesc.setAttribute('content','رزق — سوق موريتانيا الإلكتروني. بيع واشترِ بأمان: عقارات، سيارات، ذهب، ماشية، إلكترونيات وأكثر. '+n+' قسماً، '+m+'+ فرعاً، مجاناً.');
  if(typeof window._rizqApplyFooterStats === 'function') window._rizqApplyFooterStats();
}
refreshCatStatsText();
window.addEventListener('storage',function(e){ if(e.key==='rizq_extra_categories'){ renderExtraCategories(); refreshCatStatsText(); } });

/** إعلان نشط حي من الخادم — تحت شريط الفيديو مباشرة */
(function(){
  function applyAdsLive(n){
    var cell = document.querySelector('#platform-stats [data-stat="ads"]');
    var num = cell ? cell.querySelector('.h-stat-num') : document.querySelector('#platform-stats [data-stat="ads"] .h-stat-num');
    if(!num) return;
    var v = Math.max(0, Number(n)||0);
    var minShow = (window.RizqDemo && typeof RizqDemo.minActiveAdsToShow === 'function')
      ? RizqDemo.minActiveAdsToShow()
      : (Number(window.RIZQ_LAUNCH && RIZQ_LAUNCH.minActiveAdsToShow) || 0);
    if(cell){
      if(minShow > 0 && v < minShow){
        cell.style.display = 'none';
        cell.setAttribute('hidden', '');
      } else {
        cell.style.display = '';
        cell.removeAttribute('hidden');
      }
    }
    num.setAttribute('data-target', String(v));
    num.dataset.counted = '1';
    num.textContent = v.toLocaleString('en-US');
  }
  document.addEventListener('rizq:launch', function(){
    try {
      var cur = document.querySelector('#platform-stats [data-stat="ads"] .h-stat-num');
      if(cur) applyAdsLive(Number(cur.getAttribute('data-target') || cur.textContent) || 0);
    } catch(eMinAds) {}
  });
  function refreshPlatformLiveStats(){
    var base = (window.RIZQ_BACKEND_BASE||'').replace(/\/$/,'');
    if(!base){ applyAdsLive(0); return; }
    fetch(base + '/api/discovery/platform-stats', { credentials:'omit' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if(data && data.ok) applyAdsLive(data.adsActive);
        else applyAdsLive(0);
      })
      .catch(function(){ applyAdsLive(0); });
  }
  window.refreshPlatformLiveStats = refreshPlatformLiveStats;
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshPlatformLiveStats);
  else refreshPlatformLiveStats();
  setInterval(refreshPlatformLiveStats, 60000);
})();




// ══ خريطة ترجمة احتياطية عربي→فرنسي للباقات المحفوظة قديماً في localStorage بدون حقول _fr ══
// (الأدمن يحفظ الباقات عبر rizq_admin.html بدون حقول _fr — فتبقى عالقة بالعربية إلى الأبد
//  لو اعتمدنا فقط على fallback "إن غاب _fr اعرض العربي". هذه الخريطة تترجم نفس النصوص الثابتة
//  المستخدمة في الباقات الافتراضية حتى لو أتت من بيانات قديمة محفوظة فعلياً في متصفح الزائر.
//  مُعرَّفة على مستوى السكريبت (لا داخل renderPricingSection) لأن openPkgModal تحتاجها أيضاً)
var PKG_TR = {
  'مجاني':'Gratuit','تجريبية':'Essai','شهرية':'Mensuelle','ربعية':'Trimestrielle','سنوية':'Annuelle','💎 ماسي':'💎 Diamant','الماسية 💎 (النائب الذكي الشامل)':'Diamant 💎 (Adjoint intelligent complet)',
  'للأبد':'à vie','شهرياً':'par mois','3 أيام':'3 jours','3 أشهر':'3 mois','سنة':'par an',
  'ابدأ مجاناً':'Commencer gratuitement','ابدأ Pro الآن':'Démarrer Pro maintenant','تواصل معنا':'Contactez-nous',
  'ترقية للماسي 💎':'Passer au Diamant 💎','اشترك في الماسية':'Choisir le Diamant',
  'الأكثر اختياراً للشركات':'Le plus choisi par les entreprises',
  'وفر راتب موظف استقبال — مقابل 5,000 أوقية شهرياً فقط.':'Économisez le salaire d\'un agent d\'accueil — pour seulement 5 000 MRU par mois.',
  'وكيل أعمال متكامل يدير متجرك أو مؤسستك بدقة بشرية فائقة وعلى مدار 24 ساعة.':'Un adjoint commercial intégré qui gère votre boutique ou institution avec une précision humaine, 24h/24.',
  '5 إعلانات نشطة':'5 annonces actives','5 صور/إعلان':'5 photos/annonce','تواصل مباشر':'Contact direct',
  '🎬 فيديو — علامة رزق.mr':'🎬 Vidéo — filigrane rizq.mr','30 ث | 20MB':'30 s | 20MB',
  'إعلانات غير محدودة':'Annonces illimitées','10 صور':'10 photos','شارة موثّق ✅':'Badge vérifié ✅',
  '🎬 فيديو بدون علامة مائية':'🎬 Vidéo sans filigrane','60 ث | 40MB':'60 s | 40MB','Boost أسبوعي':'Boost hebdomadaire',
  'أولوية في البحث':'Priorité dans la recherche','كل مزايا Pro':'Tous les avantages Pro','متجر خاص':'Boutique privée',
  '🎬 فيديو بدون علامة':'🎬 Vidéo sans filigrane','مدير حساب':'Gestionnaire de compte','تقارير متقدمة':'Rapports avancés',
  'عرض المنتجات':'Affichage des produits','صفحة المحل':'Page de la boutique','تواصل مع الزبائن':'Contact avec les clients',
  '❌ بدون فيديو':'❌ Sans vidéo','جميع المزايا':'Tous les avantages','دعم الصور':'Support photos','إحصائيات':'Statistiques',
  '🎬 فيديو تعريفي مشمول':'🎬 Vidéo de présentation incluse','90 ث | 50MB':'90 s | 50MB',
  'فيديو إضافي +500 MRU':'Vidéo supplémentaire +500 MRU','توفير 13%':'Économisez 13%','🎬 فيديو مشمول':'🎬 Vidéo incluse',
  'توفير 39%':'Économisez 39%','أفضل قيمة':'Meilleure valeur',
  '🎬 فيديو مشمول + 1 إضافي مجاني':'🎬 Vidéo incluse + 1 gratuite supplémentaire','أولوية الدعم':'Support prioritaire',
  'كل مزايا السنوية':"Tous les avantages de l'offre annuelle",'إعلانات + منتجات غير محدودة':'Annonces + produits illimités',
  'شارة موثوق ممتاز':'Badge de confiance premium',
  '📞 الرد التلقائي على المكالمات الغائبة':'📞 Réponse automatique aux appels manqués',
  '📧 ردود ذكية على البريد الإلكتروني':'📧 Réponses intelligentes par e-mail',
  'مدير حساب شخصي VIP':'Gestionnaire de compte VIP personnel','أولوية قصوى في المراجعة':'Priorité maximale de révision',
  'عرض الخدمات':'Affichage des services','صفحة المكتب':'Page du bureau','طلبات تواصل':'Demandes de contact',
  'توفير 14%':'Économisez 14%','توفير 33%':'Économisez 33%','خدمات غير محدودة':'Services illimités',
  '📞 الرد التلقائي على مكالماتك الغائبة':'📞 Réponse automatique à vos appels manqués',
  '📧 ردود ذكية على بريدك الإلكتروني':'📧 Réponses intelligentes à vos e-mails',
  'أولوية قصوى — ظهور دائم في النتائج':'Priorité maximale — visibilité permanente dans les résultats',
  'باقة شهرية':'Mensuel','باقة متوسطة':'Forfait intermédiaire','مجانية':'Gratuit','مميزة':'Mise en avant','أساسي':'Basique','سنوي':'Annuel',
  'وصول كامل للمنصة':'Accès complet à la plateforme','استعراض المنتجات':'Présentation des produits','دعم فني أساسي':'Support technique de base',
  'شارة محل مميّز برزق':'Badge boutique premium Rizq','عرض 50 منتج':'Affichage de 50 produits','عرض 100 منتج':'Affichage de 100 produits','عرض 500 منتج':'Affichage de 500 produits','عرض 10 منتجات':'10 produits affichés','إحصائيات شهرية':'Statistiques mensuelles','دعم بالأولوية':'Support prioritaire',
  'كل مزايا الشهرية':'Tous les avantages mensuels','توفير 15% عن الشهري':'Économisez 15% vs mensuel','عرض 200 منتج':'Affichage de 200 produits','مدير حساب مخصص':'Gestionnaire de compte dédié',
  'كل مزايا الربعية':'Tous les avantages trimestriels','توفير 35% عن الشهري':'Économisez 35% vs mensuel','منتجات غير محدودة':'Produits illimités','دعم VIP 24/7':'Support VIP 24/7','تقارير سنوية':'Rapports annuels',
  'منتجات غير محدودة للمتجر':'Produits illimités pour la boutique','نائب ذكي نصي للمحل (موقع + واتساب)':'Adjoint intelligent texte (site + WhatsApp)','1,500 محادثة نصية شهرياً':'1 500 conversations texte / mois',
  'نائب ذكي تفاعلي للمحل (نصي + صوتي)':'Adjoint interactif boutique (texte + voix)','2,500 محادثة نصية + 150 دقيقة صوتية شهرياً':'2 500 conversations texte + 150 min voix / mois','ويدجت الموقع + واتساب + مكالمات آليّة':'Widget site + WhatsApp + appels automatiques',
  'الماسية الأساسية للمحلات':'Diamant Standard boutique','الماسية Pro للمحلات':'Diamant Pro boutique','الأكثر اختياراً للمحلات':'Le plus choisi pour les boutiques',
  'اشترك في الماسية الأساسية للمحلات':'Choisir Diamant Standard boutique','اشترك في الماسية Pro للمحلات':'Choisir Diamant Pro boutique',
  'عرض حتى 3 خدمات نشطة':'Jusqu\'à 3 services actifs','شارة مكتب موثوق':'Badge bureau vérifié','نظام حجز المواعيد':'Système de prise de rendez-vous',
  'عرض خدمات غير محدود':'Services illimités','فيديو تعريفي مشمول + 1 إضافي مجاناً':'Vidéo incluse + 1 gratuite supplémentaire',
  'موظف استقبال واستفسارات 24/7 (نصي)':'Agent d\'accueil et réponses 24h/24 (texte)','تنظيم طلبات الخدمات والمواعيد':'Organisation des demandes de services et rendez-vous',
  '2,000 محادثة نصية شهرياً':'2 000 conversations texte / mois','موظف استقبال آلي مخصص (نصي + صوتي)':'Agent d\'accueil automatique dédié (texte + voix)',
  'رد آلي على الاتصالات':'Réponse automatique aux appels','إدارة المواعيد والاستشارات مع نموذج طلبات متقدم':'Gestion des rendez-vous et consultations avec formulaire avancé',
  '4,000 محادثة نصية + 300 دقيقة صوتية شهرياً':'4 000 conversations texte + 300 min voix / mois',
  '3,500 محادثة نصية + 200 دقيقة صوتية شهرياً':'3 500 conversations texte + 200 min voix / mois',
  'نائب ذكي نصي للشركة (موقع + واتساب)':'Adjoint intelligent texte entreprise (site + WhatsApp)','4,000 محادثة نصية شهرياً':'4 000 conversations texte / mois','هوية مخصصة باسم شركتك':'Identité personnalisée au nom de votre entreprise',
  'نائب ذكي تفاعلي للشركة (نصي + صوتي)':'Adjoint interactif entreprise (texte + voix)','7,000 محادثة نصية + 600 دقيقة صوتية شهرياً':'7 000 conversations texte + 600 min voix / mois','تكامل API / ERP':'Intégration API / ERP',
  'الماسية الأساسية للشركات':'Diamant Standard entreprise','الماسية Pro للشركات':'Diamant Pro entreprise','الأكثر اختياراً للشركات':'Le plus choisi pour les entreprises',
  'اشترك في الماسية الأساسية للشركات':'Choisir Diamant Standard entreprise','اشترك في الماسية Pro للشركات':'Choisir Diamant Pro entreprise',
  'الماسية الأساسية للمكاتب':'Diamant Standard bureau','الماسية Pro للمكاتب':'Diamant Pro bureau','الأكثر اختياراً للمكاتب':'Le plus choisi pour les bureaux',
  'اشترك في الماسية الأساسية للمكاتب':'Choisir Diamant Standard bureau','اشترك في الماسية Pro للمكاتب':'Choisir Diamant Pro bureau',
  'شارة موثّق':'Badge vérifié','فيديو تعريفي مشمول':'Vidéo de présentation incluse',
  '🏅 شارة "موثّق ✅"':'Badge vérifié ✅','🏅 شارة "محل مميّز برزق"':'Badge boutique premium Rizq',
  'إعلان واحد نشط':'1 annonce active','حتى 5 صور للإعلان':'Jusqu\'à 5 photos par annonce','ظهور في نتائج البحث العادية':'Visibilité dans les résultats standard',
  'تثبيت أعلى النتائج لمدة 3 أيام':'Épinglage en tête des résultats pendant 3 jours','شارة "إعلان مميز"':'Badge « annonce mise en avant »',
  'حتى 10 إعلانات نشطة':'Jusqu\'à 10 annonces actives','حتى 10 إعلانات نشطة شهرياً':'Jusqu\'à 10 annonces actives par mois',
  'حتى 5 إعلانات نشطة شهرياً':'Jusqu\'à 5 annonces actives par mois','إمكانيات الإدارة والتعديل طوال الشهر':'Gestion et modification pendant tout le mois',
  'شارة إعلان مميز':'Badge « annonce mise en avant »','لكل إعلان':'par annonce','دفعة واحدة':'paiement unique','حتى 5 صور لكل إعلان':'Jusqu\'à 5 photos par annonce','تجديد تلقائي للإعلانات':'Renouvellement automatique des annonces',
  'اشترك الآن':'S\'abonner maintenant','اشترك':'S\'abonner',
  'إعلان فيديو واحد':'Vidéo unique','أساسي فيديو':'Basique vidéo','احترافي فيديو':'Pro vidéo','أعمال ومعارض':'Entreprises & galeries',
  'MRU / إعلان · 10 أيام':'MRU / annonce · 10 jours','فيديو إعلاني واحد لمدة 10 أيام':'Une vidéo publicitaire pendant 10 jours',
  'ظهور في قسم الإعلانات بالصفحة الرئيسية':'Section publicitaire page d\'accueil',
  'دفع لكل إعلان — بلا اشتراك شهري':'Paiement par annonce — sans abonnement mensuel',
  'اشترِ إعلان فيديو الآن':'Acheter une annonce vidéo','🎬 اشترِ إعلان فيديو الآن':'🎬 Acheter une annonce vidéo',
  'إعلان واحد':'1 annonce','Pay-Per-Ad':'Paiement par annonce','دفع لكل إعلان':'Paiement par annonce',
  '💎 ماسية':'💎 Diamant','الماسية الأساسية':'Diamant Standard','الماسية Pro':'Diamant Pro',
  'استعراض الإعلانات':'Parcourir les annonces','شارة شركة مميّزة برزق':'Badge entreprise premium Rizq',
  'عرض 30 إعلان':'30 annonces affichées','ميزات VIP حصرية':'Avantages VIP exclusifs',
  'دعم 24/7':'Support 24/7','تقارير سنوية شاملة':'Rapports annuels complets',
  'تصفّح وتصفية المناقصات المنشورة':"Parcourir et filtrer les appels d'offres",
  'بيانات التواصل مخفية/ضبابية':'Coordonnées masquées / floutées','تقديم العروض مقفول':"Dépôt d'offres verrouillé",
  'كشف بيانات تواصل صاحب المناقصة':"Coordonnées de l'émetteur révélées",
  'تقديم عروض غير محدود':"Dépôt d'offres illimité",'نشر مناقصات':"Publier des appels d'offres",
  'توفير 10% عن الشهري':'Économisez 10% vs mensuel',
  'أولوية ظهور عروضك لأصحاب المناقصات':'Priorité de vos offres auprès des émetteurs',
  'توفير 25% عن الشهري':'Économisez 25% vs mensuel','دعم VIP':'Support VIP',
  'تنبيهات فورية SMS/واتساب للمناقصات الجديدة':'Alertes SMS/WhatsApp pour les nouveaux appels d\'offres',
  'حتى 3 فيديوهات إعلانية ترويجية شهرياً (عرض منتجات متعددة)':'Jusqu\'à 3 vidéos pub / mois (plusieurs produits)',
  'إحصائيات أداء أساسية آلية':'Statistiques de performance automatiques',
  'حتى 10 فيديوهات إعلانية ترويجية شهرياً':'Jusqu\'à 10 vidéos pub / mois',
  'أولوية الترتيب في نتائج البحث':'Priorité dans les résultats de recherche',
  'شارة «محتوى مميّز برزق» الموثّقة':'Badge « contenu mis en avant Rizq »',
  'فيديوهات وعروض غير محدودة':'Vidéos et campagnes illimitées',
  'ظهور مميز في القسم الرئيسي بالصفحة الرئيسية':'Mise en avant sur la page d\'accueil',
  'تقارير تحليل أداء آلية مفصّلة':'Rapports de performance détaillés',
  'دعم VIP ذو أولوية + شارة VIP موثّقة':'Support VIP prioritaire + badge VIP'
};
function trPkg(s){
  if (typeof s !== 'string') return s;
  if (PKG_TR.hasOwnProperty(s)) return PKG_TR[s];
  var t = s.replace(/\s+/g, ' ').trim();
  if (PKG_TR.hasOwnProperty(t)) return PKG_TR[t];
  return s;
}

function renderPricingSection(){
  /* Paint skeletons first so active pane never flashes empty while catalogs resolve */
  try {
    document.querySelectorAll('.pricing-grid[data-rizq-pkg-skel="1"]').forEach(function(el){
      if (el.children.length) return;
      if (window.RizqPackagesUI && typeof RizqPackagesUI.pkgSkeletonHtml === 'function') {
        el.innerHTML = RizqPackagesUI.pkgSkeletonHtml(4);
      } else {
        var sk = '';
        for (var i = 0; i < 4; i++) {
          sk += '<div class="rpkg-card rizq-skel-card" style="border-radius:18px;padding:28px 18px;border:1.5px solid rgba(201,168,76,.2);background:linear-gradient(160deg,#0a1628,#122040);min-height:180px" aria-hidden="true">'
            + '<div class="rizq-skel" style="height:14px;width:55%;margin:0 auto 16px;border-radius:8px;background:linear-gradient(90deg,rgba(201,168,76,.12),rgba(201,168,76,.28),rgba(201,168,76,.12));background-size:200% 100%;animation:rizqSkelShimmer 1.2s ease-in-out infinite"></div>'
            + '<div class="rizq-skel" style="height:28px;width:40%;margin:0 auto 10px;border-radius:8px;background:linear-gradient(90deg,rgba(201,168,76,.12),rgba(201,168,76,.28),rgba(201,168,76,.12));background-size:200% 100%;animation:rizqSkelShimmer 1.2s ease-in-out infinite"></div>'
            + '<div class="rizq-skel" style="height:10px;width:70%;margin:0 auto 18px;border-radius:6px;background:linear-gradient(90deg,rgba(201,168,76,.12),rgba(201,168,76,.28),rgba(201,168,76,.12));background-size:200% 100%;animation:rizqSkelShimmer 1.2s ease-in-out infinite"></div>'
            + '</div>';
        }
        el.innerHTML = sk;
      }
    });
  } catch (eSk) {}
  var DEF_IND=[
    {name:'مجاني',name_fr:'Gratuit',price:0,period:'للأبد',period_fr:'à vie',highlight:false,
      features:['5 إعلانات نشطة','5 صور/إعلان','تواصل مباشر','🎬 فيديو — علامة رزق.mr','30 ث | 20MB'],
      features_fr:['5 annonces actives','5 photos/annonce','Contact direct','🎬 Vidéo — filigrane rizq.mr','30 s | 20MB'],
      cta:'ابدأ مجاناً',cta_fr:'Commencer gratuitement'},
    {name:'Pro',name_fr:'Pro',price:500,period:'شهرياً',period_fr:'par mois',highlight:true,
      features:['إعلانات غير محدودة','10 صور','شارة موثّق ✅','🎬 فيديو بدون علامة مائية','60 ث | 40MB','Boost أسبوعي','أولوية في البحث'],
      features_fr:['Annonces illimitées','10 photos','Badge vérifié ✅','🎬 Vidéo sans filigrane','60 s | 40MB','Boost hebdomadaire','Priorité dans la recherche'],
      cta:'ابدأ Pro الآن',cta_fr:'Démarrer Pro maintenant'},
    {name:'Business',name_fr:'Business',price:2000,period:'شهرياً',period_fr:'par mois',
      features:['كل مزايا Pro','متجر خاص','🎬 فيديو بدون علامة','60 ث | 40MB','مدير حساب','تقارير متقدمة'],
      features_fr:['Tous les avantages Pro','Boutique privée','🎬 Vidéo sans filigrane','60 s | 40MB','Gestionnaire de compte','Rapports avancés'],
      cta:'تواصل معنا',cta_fr:'Contactez-nous'}
  ];
  var DEF_STO=[
    {name:'تجريبية',name_fr:'Essai',price:0,period:'10 أيام',period_fr:'10 jours',
      features:['عرض المنتجات','صفحة المحل','تواصل مع الزبائن','❌ بدون فيديو'],
      features_fr:['Affichage des produits','Page de la boutique','Contact avec les clients','❌ Sans vidéo'],
      cta:'ابدأ مجاناً',cta_fr:'Commencer gratuitement'},
    {name:'شهرية',name_fr:'Mensuelle',price:3000,period:'شهرياً',period_fr:'par mois',highlight:true,
      features:['جميع المزايا','دعم الصور','إحصائيات','🎬 فيديو تعريفي مشمول','90 ث | 50MB','فيديو إضافي +500 MRU'],
      features_fr:['Tous les avantages','Support photos','Statistiques','🎬 Vidéo de présentation incluse','90 s | 50MB','Vidéo supplémentaire +500 MRU'],
      cta:'اشترك الآن',cta_fr:"S'abonner maintenant"},
    {name:'ربعية',name_fr:'Trimestrielle',price:7800,period:'3 أشهر',period_fr:'3 mois',
      features:['توفير 13%','جميع المزايا','🎬 فيديو مشمول','90 ث | 50MB','فيديو إضافي +500 MRU'],
      features_fr:['Économisez 13%','Tous les avantages','🎬 Vidéo incluse','90 s | 50MB','Vidéo supplémentaire +500 MRU'],
      cta:'اشترك',cta_fr:"S'abonner"},
    {name:'سنوية',name_fr:'Annuelle',price:22000,period:'سنة',period_fr:'par an',
      features:['توفير 39%','أفضل قيمة','🎬 فيديو مشمول + 1 إضافي مجاني','90 ث | 50MB','أولوية الدعم'],
      features_fr:['Économisez 39%','Meilleure valeur','🎬 Vidéo incluse + 1 gratuite supplémentaire','90 s | 50MB','Support prioritaire'],
      cta:'اشترك',cta_fr:"S'abonner"},
    {name:'الماسية الأساسية للمحلات',name_fr:'Diamant Standard boutique',id:'st-diam-std',price:3500,period:'شهرياً',period_fr:'par mois',diamond:true,diamondTier:'diamond_standard',featured:true,
      description:'نائب ذكي نصي للمحل — ويدجت الموقع + الواتساب.',
      description_fr:'Adjoint intelligent texte pour boutique — widget site + WhatsApp.',
      featuredBadge:'الأكثر اختياراً للمحلات',
      featuredBadge_fr:'Le plus choisi pour les boutiques',
      roi:'من 3,500 أوقية/شهر',
      roi_fr:'Dès 3 500 MRU/mois',
      features:['منتجات غير محدودة للمتجر','نائب ذكي نصي للمحل (موقع + واتساب)','1,500 محادثة نصية شهرياً','لوحة متابعة وتحليل الأداء لحظياً'],
      features_fr:['Produits illimités pour la boutique','Adjoint intelligent texte (site + WhatsApp)','1 500 conversations texte / mois','Tableau de bord et analyse en temps réel'],
      cta:'اشترك في الماسية الأساسية للمحلات',cta_fr:'Choisir Diamant Standard boutique'},
    {name:'الماسية Pro للمحلات',name_fr:'Diamant Pro boutique',id:'st-diam-pro',price:6000,period:'شهرياً',period_fr:'par mois',diamond:true,diamondTier:'diamond_pro',featured:true,
      description:'نائب ذكي تفاعلي للمحل — نصي + صوتي + مكالمات آلية.',
      description_fr:'Adjoint interactif boutique — texte + voix + appels automatiques.',
      featuredBadge:'Enterprise',
      featuredBadge_fr:'Enterprise',
      roi:'من 6,000 أوقية/شهر',
      roi_fr:'Dès 6 000 MRU/mois',
      features:['منتجات غير محدودة للمتجر','نائب ذكي تفاعلي للمحل (نصي + صوتي)','2,500 محادثة نصية + 150 دقيقة صوتية شهرياً','ويدجت الموقع + واتساب + مكالمات آليّة','لوحة متابعة وتحليل الأداء لحظياً'],
      features_fr:['Produits illimités pour la boutique','Adjoint interactif (texte + voix)','2 500 conversations texte + 150 min voix / mois','Widget site + WhatsApp + appels automatiques','Tableau de bord et analyse en temps réel'],
      cta:'اشترك في الماسية Pro للمحلات',cta_fr:'Choisir Diamant Pro boutique'}
  ];
  var DEF_OFF=[
    {name:'تجريبية',name_fr:'Essai',price:0,period:'10 أيام',period_fr:'10 jours',
      features:['عرض حتى 3 خدمات نشطة','صفحة المكتب','طلبات تواصل'],
      features_fr:['Jusqu\'à 3 services actifs','Page du bureau','Demandes de contact'],
      cta:'ابدأ مجاناً',cta_fr:'Commencer gratuitement'},
    {name:'شهرية',name_fr:'Mensuelle',price:3500,period:'شهرياً',period_fr:'par mois',highlight:true,
      features:['شارة مكتب موثوق','نظام حجز المواعيد','فيديو تعريفي مشمول'],
      features_fr:['Badge bureau vérifié','Système de prise de rendez-vous','Vidéo de présentation incluse'],
      cta:'اشترك الآن',cta_fr:"S'abonner maintenant"},
    {name:'ربعية',name_fr:'Trimestrielle',price:9000,period:'3 أشهر',period_fr:'3 mois',
      features:['توفير 14%','عرض خدمات غير محدود','مدير حساب مخصص'],
      features_fr:['Économisez 14%','Services illimités','Gestionnaire de compte dédié'],
      cta:'اشترك',cta_fr:"S'abonner"},
    {name:'سنوية',name_fr:'Annuelle',price:28000,period:'سنة',period_fr:'par an',
      features:['توفير 33%','فيديو تعريفي مشمول + 1 إضافي مجاناً','أولوية الدعم'],
      features_fr:['Économisez 33%','Vidéo incluse + 1 gratuite supplémentaire','Support prioritaire'],
      cta:'اشترك',cta_fr:"S'abonner"},
    {name:'الماسية الأساسية للمكاتب',name_fr:'Diamant Standard bureau',id:'of-diam-std',price:4000,period:'شهرياً',period_fr:'par mois',diamond:true,diamondTier:'diamond_standard',featured:true,
      description:'موظف استقبال واستفسارات نصي — الموقع + الواتساب.',
      description_fr:'Agent d\'accueil texte — site + WhatsApp.',
      featuredBadge:'الأكثر اختياراً للمكاتب',
      featuredBadge_fr:'Le plus choisi pour les bureaux',
      roi:'من 4,000 أوقية/شهر',
      roi_fr:'Dès 4 000 MRU/mois',
      features:['موظف استقبال واستفسارات 24/7 (نصي)','تنظيم طلبات الخدمات والمواعيد','2,000 محادثة نصية شهرياً','ويدجت الموقع + واتساب'],
      features_fr:['Agent d\'accueil et réponses 24h/24 (texte)','Organisation des demandes de services et rendez-vous','2 000 conversations texte / mois','Widget site + WhatsApp'],
      cta:'اشترك في الماسية الأساسية للمكاتب',cta_fr:'Choisir Diamant Standard bureau'},
    {name:'الماسية Pro للمكاتب',name_fr:'Diamant Pro bureau',id:'of-diam-pro',price:7500,period:'شهرياً',period_fr:'par mois',diamond:true,diamondTier:'diamond_pro',featured:true,
      description:'موظف استقبال آلي — نصي + صوتي + مكالمات تفاعلية.',
      description_fr:'Agent d\'accueil automatique — texte + voix + appels interactifs.',
      featuredBadge:'Enterprise',
      featuredBadge_fr:'Enterprise',
      roi:'من 7,500 أوقية/شهر',
      roi_fr:'Dès 7 500 MRU/mois',
      features:['موظف استقبال آلي مخصص (نصي + صوتي)','رد آلي على الاتصالات','إدارة المواعيد والاستشارات مع نموذج طلبات متقدم','3,500 محادثة نصية + 200 دقيقة صوتية شهرياً'],
      features_fr:['Agent d\'accueil automatique dédié (texte + voix)','Réponse automatique aux appels','Gestion des rendez-vous et consultations avec formulaire avancé','3 500 conversations texte + 200 min voix / mois'],
      cta:'اشترك في الماسية Pro للمكاتب',cta_fr:'Choisir Diamant Pro bureau'}
  ];


  function pkgsFromLS(key, def){ try{ var d=JSON.parse(localStorage.getItem(key)||'null'); return(d&&d.length)?d:def; }catch(e){return def;} }

  function isDiaName(p){
    return !!(p && (p.diamond || p.isDiamond || /ماس|diamond|diamant/i.test([p.id,p.name,p.name_fr,p.cta].filter(Boolean).join(' '))));
  }

  function diamondCanon(lang, pkg){
    var tier = 'diamond_standard';
    if(pkg && window.RizqPackagesConfig){
      if(typeof RizqPackagesConfig.resolveDiamondTierFromPkg==='function'){
        tier = RizqPackagesConfig.resolveDiamondTierFromPkg(pkg) || tier;
      } else if(/pro|diam-pro/i.test(String(pkg.id||''))) tier = 'diamond_pro';
    }
    if(window.RizqPackagesConfig && typeof RizqPackagesConfig.diamondCopy==='function'){
      var c=RizqPackagesConfig.diamondCopy(lang, tier, pkg && pkg.price);
      var isPro = tier === 'diamond_pro';
      return {
        name:c.name, name_fr:c.name,
        description:c.description, description_fr:c.description,
        featuredBadge:c.featuredBadge, featuredBadge_fr:c.featuredBadge,
        roi:c.roi, roi_fr:c.roi,
        features:c.features||[], features_fr:c.features||[],
        cta: lang==='fr' ? (isPro ? 'Choisir Diamant Pro' : 'Choisir Diamant Standard') : (isPro ? 'اشترك في الماسية Pro' : 'اشترك في الماسية الأساسية'),
        cta_fr: isPro ? 'Choisir Diamant Pro' : 'Choisir Diamant Standard',
        diamond:true, isDiamond:true, diamondTier:tier, featured:true
      };
    }
    var pool=(DEF_OFF.concat(DEF_STO)).filter(function(x){return x.diamond;});
    var hit = pool.filter(function(x){ return tier==='diamond_pro' ? x.diamondTier==='diamond_pro' : x.diamondTier!=='diamond_pro'; })[0];
    return hit ? Object.assign({}, hit) : (pool[0] ? Object.assign({}, pool[0]) : null);
  }

  function applyDiamondMarketing(list, lang){
    lang = lang || ((typeof isAr!=='undefined' && !isAr)?'fr':'ar');
    var canon = diamondCanon(lang);
    if(!canon) return list||[];
    var found=false;
    var out=(list||[]).map(function(p){
      if(!isDiaName(p)) return p;
      found=true;
      var n=Object.assign({}, p, canon, {price:p.price, period:p.period, period_fr:p.period_fr, duration:p.duration, durationDays:p.durationDays});
      if(window.RizqPackagesConfig && typeof RizqPackagesConfig.enrichForDisplay==='function'){
        n=RizqPackagesConfig.enrichForDisplay(Object.assign({}, n, {diamond:true, isDiamond:true}), lang);
        n.price = p.price;
      }
      n.cta = canon.cta; n.cta_fr = canon.cta_fr;
      n.diamond=true; n.isDiamond=true; n.featured=true;
      return n;
    });
    if(!found){
      var extra=window.RizqPackagesConfig && typeof RizqPackagesConfig.getDiamondPackage==='function'
        ? RizqPackagesConfig.getDiamondPackage(lang)
        : Object.assign({}, canon, {price:5000, period: lang==='fr'?'par mois':'شهرياً', period_fr:'par mois'});
      out=out.concat([extra]);
    }
    return out;
  }

  function overlayLivePrices(defList, catalogKey){
    var live=[];
    if(window.RizqPackagesConfig && typeof RizqPackagesConfig.getCatalog==='function'){
      try{ live=RizqPackagesConfig.getCatalog(catalogKey) || []; }catch(e){}
    }
    var lsMap = (window.RizqPackagesConfig && typeof RizqPackagesConfig.getLsMap === 'function')
      ? RizqPackagesConfig.getLsMap()
      : {store:'rizq_store_packages', office:'rizq_office_packages', general:'rizq_packages', corp:'rizq_corp_packages', individual:'rizq_individual_packages'};
    if(!live.length) live=pkgsFromLS(lsMap[catalogKey]||'rizq_packages', [])||[];
    var general=[];
    if(window.RizqPackagesConfig && typeof RizqPackagesConfig.getCatalog==='function'){
      try{ general=RizqPackagesConfig.getCatalog('general')||[]; }catch(e){}
    }
    return (defList||[]).map(function(d){
      var n=Object.assign({}, d);
      var match=null;
      if(isDiaName(d)){
        match=live.filter(isDiaName)[0] || general.filter(isDiaName)[0];
      } else {
        match=live.filter(function(l){ return (d.id && l.id===d.id) || String(l.name||'')===d.name || String(l.name_fr||'')===d.name_fr; })[0];
      }
      if(match && match.price!=null && match.price!=='') n.price=Number(match.price);
      if(match && match.durationDays) n.durationDays=Number(match.durationDays);
      return n;
    });
  }

  function pkgsFromConfig(catalogKey, lsKey, def, ensureDiamond){
    var lang = (typeof isAr!=='undefined' && !isAr)?'fr':'ar';
    var list=null;
    if(window.RizqPackagesConfig && typeof RizqPackagesConfig.getPackagesForTool==='function'){
      try{
        var cat=RizqPackagesConfig.getPackagesForTool(lang, catalogKey);
        if(cat && cat.length) list=cat.slice();
      }catch(e){}
    } else if(window.RizqPackagesConfig && typeof RizqPackagesConfig.getCatalog==='function'){
      try{
        var cat2=RizqPackagesConfig.getCatalog(catalogKey);
        if(cat2 && cat2.length) list=cat2.slice();
      }catch(e){}
    }
    if(!list) list=pkgsFromLS(lsKey, def);
    if(ensureDiamond && window.RizqPackagesConfig && typeof RizqPackagesConfig.withDiamond==='function'){
      list=RizqPackagesConfig.withDiamond(list, lang, catalogKey);
    }
    return list;
  }

  var _pkgLang = (typeof isAr!=='undefined' && !isAr)?'fr':'ar';
  try {
    var _savedPkgLang = localStorage.getItem('rizq_lang');
    if (_savedPkgLang === 'fr' || _savedPkgLang === 'ar') _pkgLang = _savedPkgLang;
  } catch (eLang) {}

  function catalogPackages(catalogKey, ensureDiamond) {
    try {
    var lang = _pkgLang;
    var list = [];
    if (window.RizqPackagesConfig) {
      if (typeof RizqPackagesConfig.getPackagesForTool === 'function') {
        try { list = RizqPackagesConfig.getPackagesForTool(lang, catalogKey) || []; } catch (e) {}
      }
      if (!list.length && typeof RizqPackagesConfig.getCatalog === 'function') {
        try { list = RizqPackagesConfig.getCatalog(catalogKey, lang) || []; } catch (e) {}
      }
      if (!list.length && RizqPackagesConfig.CATALOGS && RizqPackagesConfig.CATALOGS[catalogKey]) {
        list = JSON.parse(JSON.stringify(RizqPackagesConfig.CATALOGS[catalogKey]));
      }
    }
    list = (list || []).filter(function (p) { return p && p.active !== false; }).map(function (p) {
      var out = enrichPkgForLanding(p, lang);
      if (out.id && /-month$/.test(out.id) && catalogKey !== 'individual') out.highlight = true;
      if (out.id === 'ind-monthly') out.highlight = true;
      return out;
    });
    if (ensureDiamond && window.RizqPackagesConfig && typeof RizqPackagesConfig.withDiamond === 'function') {
      list = RizqPackagesConfig.withDiamond(list, lang, catalogKey).map(function (p) { return enrichPkgForLanding(p, lang); });
    }
    /* Stable order: trial → month → quarter → year → diamond std → diamond pro */
    list.sort(function (a, b) {
      function rank(p) {
        var id = String(p.id || '');
        var dia = !!(p.diamond || p.isDiamond || /ماس|diamond|diamant/i.test(id + (p.name || '')));
        if (dia) return 1000 + (/pro/i.test(id) ? 2 : 1);
        var d = Number(p.durationDays) || 0;
        if (!Number(p.price)) return 0;
        if (d >= 360) return 40;
        if (d >= 80) return 30;
        if (d >= 25) return 20;
        return 10;
      }
      var ra = rank(a), rb = rank(b);
      if (ra !== rb) return ra - rb;
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    });
    return list;
    } catch (eCat) {
      return [];
    }
  }

  function landingPeriodShort(p, lang) {
    var days = Number(p.durationDays) || 30;
    if (!Number(p.price)) {
      return lang === 'fr' ? (days + ' jours') : (days + ' أيام');
    }
    if (p.id && String(p.id).indexOf('boost') !== -1) {
      return lang === 'fr' ? 'par annonce' : 'لكل إعلان';
    }
    if (days >= 360) return lang === 'fr' ? 'par an' : 'سنوياً';
    if (days >= 80) return lang === 'fr' ? '3 mois' : '3 أشهر';
    if (days > 10 && days <= 31 && !(p.id && /-month$/.test(String(p.id)))) {
      return lang === 'fr' ? (days + ' jours') : (days + ' يوماً');
    }
    return lang === 'fr' ? 'par mois' : 'شهرياً';
  }

  function enrichPkgForLanding(p, lang) {
    if (window.RizqPackagesConfig && typeof RizqPackagesConfig.enrichForDisplay === 'function') {
      p = RizqPackagesConfig.enrichForDisplay(p, lang);
    }
    if (window.RizqPackagesConfig && typeof RizqPackagesConfig.localizedName === 'function') {
      p.name = RizqPackagesConfig.localizedName(p, lang);
      p.name_fr = RizqPackagesConfig.localizedName(p, 'fr');
    }
    var out = {
      id: p.id,
      name: p.name || '',
      name_fr: p.name_fr || p.name || '',
      price: Number(p.price) || 0,
      period: landingPeriodShort(p, lang),
      period_fr: landingPeriodShort(p, 'fr'),
      durationDays: p.durationDays,
      features: p.features || [],
      features_fr: (p.features_fr && p.features_fr.length) ? p.features_fr : [],
      diamond: !!(p.diamond || p.isDiamond),
      featured: !!p.featured,
      featuredBadge: p.featuredBadge || '',
      featuredBadge_fr: p.featuredBadge_fr || '',
      description: p.description || '',
      description_fr: p.description_fr || '',
      roi: p.roi || '',
      roi_fr: p.roi_fr || '',
      highlight: !!p.highlight || p.id === 'of-month' || p.id === 'st-month' || p.id === 'cp-month',
      cta: p.cta || '',
      cta_fr: p.cta_fr || ''
    };
    if (lang === 'fr') {
      out.name = out.name_fr || trPkg(out.name);
      out.period = out.period_fr || trPkg(out.period || '');
      if (!out.features_fr.length) out.features_fr = (out.features || []).map(trPkg);
      /* Force primary fields to FR so any consumer reading .features/.name stays clean */
      out.features = out.features_fr.slice();
      out.cta = out.cta_fr || trPkg(out.cta || '') || "S'abonner →";
      if (out.description_fr) out.description = out.description_fr;
      else if (/[\u0600-\u06FF]/.test(String(out.description || ''))) out.description = '';
      if (out.featuredBadge_fr) out.featuredBadge = out.featuredBadge_fr;
      else if (/[\u0600-\u06FF]/.test(String(out.featuredBadge || ''))) out.featuredBadge = '';
      if (out.roi_fr) out.roi = out.roi_fr;
      else if (/[\u0600-\u06FF]/.test(String(out.roi || ''))) out.roi = '';
    }
    return out;
  }

  var ind = catalogPackages('individual', false);
  var sto = catalogPackages('store', true);
  var off = catalogPackages('office', true);
  var corp = catalogPackages('corp', true);
  var tender = catalogPackages('tender', false);
  var investment = catalogPackages('investment', false);
  var ads = catalogPackages('video', false);
  if (!ind.length) ind = DEF_IND.slice();
  if (!sto.length) sto = DEF_STO.slice();
  if (!off.length) off = DEF_OFF.slice();
  function rawCat(key) {
    try {
      if (window.RizqPackagesConfig && RizqPackagesConfig.CATALOGS && RizqPackagesConfig.CATALOGS[key]) {
        return JSON.parse(JSON.stringify(RizqPackagesConfig.CATALOGS[key]));
      }
    } catch (eRaw) {}
    return [];
  }
  if (!corp.length) corp = rawCat('corp');
  if (!tender.length) tender = rawCat('tender');
  if (!investment.length) investment = rawCat('investment');
  if (!ads.length) ads = rawCat('video');

  function renderGrid(pkgs, gridId){
    var el=document.getElementById(gridId); if(!el)return;
    pkgs = pkgs || [];
    var origin = gridId==='grid-individual'?'individual':gridId==='grid-stores'?'stores':gridId==='grid-offices'?'offices':gridId==='grid-corp'?'corp':gridId==='grid-tender'?'tender':gridId==='grid-investment'?'investment':gridId==='grid-ads'?'ads':'';
    var _fr = (typeof isAr!=='undefined' && !isAr);
    var _xe = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
    el.innerHTML=pkgs.map(function(p){
      if(isDiaName(p) || (window.RizqPackagesConfig && typeof RizqPackagesConfig.isDiamondPackage==='function' && RizqPackagesConfig.isDiamondPackage(p))){
        var _lang = _fr?'fr':'ar';
        if(window.RizqPackagesConfig && typeof RizqPackagesConfig.enrichForDisplay==='function'){
          p = RizqPackagesConfig.enrichForDisplay(Object.assign({}, p, {diamond:true, isDiamond:true}), _lang);
        } else {
          var _c = diamondCanon(_lang, p);
          if(_c) p = Object.assign({}, p, _c, {price:p.price, period:p.period, period_fr:p.period_fr});
        }
        p.diamond = true; p.isDiamond = true; p.featured = true;
      }
      var pName = _fr ? trPkg(p.name_fr || p.name) : p.name;
      var pPeriod = _fr ? (p.period_fr || trPkg(p.period||'')) : (p.period||'');
      var pFeats = _fr ? ((p.features_fr && p.features_fr.length) ? p.features_fr : (p.features||[]).map(trPkg)) : (p.features||[]);
      var pCta = _fr ? (p.cta_fr || trPkg(p.cta||'') || "S'abonner →") : (p.cta||'اشترك الآن ←');
      var pDesc = _fr ? (p.description_fr || p.description || '') : (p.description || '');
      var pRoi = _fr ? (p.roi_fr || p.roi || '') : (p.roi || '');
      var pBadge = _fr ? (p.featuredBadge_fr || p.featuredBadge || 'Le plus choisi par les entreprises') : (p.featuredBadge || 'الأكثر اختياراً للشركات');
      if (_fr) {
        pName = trPkg(pName);
        pPeriod = trPkg(pPeriod);
        pCta = trPkg(pCta);
        pDesc = trPkg(pDesc);
        pRoi = trPkg(pRoi);
        pBadge = trPkg(pBadge);
        pFeats = (pFeats || []).map(trPkg).filter(function(f){ return f && !/[\u0600-\u06FF]/.test(String(f)); });
        if (/[\u0600-\u06FF]/.test(String(pName||''))) pName = p.name_fr || pName;
        if (/[\u0600-\u06FF]/.test(String(pPeriod||''))) pPeriod = p.period_fr || '';
        if (/[\u0600-\u06FF]/.test(String(pDesc||''))) pDesc = p.description_fr || '';
        if (/[\u0600-\u06FF]/.test(String(pRoi||''))) pRoi = p.roi_fr || '';
        if (/[\u0600-\u06FF]/.test(String(pBadge||''))) pBadge = p.featuredBadge_fr || '';
        if (/[\u0600-\u06FF]/.test(String(pCta||''))) pCta = p.cta_fr || "S'abonner →";
      }
      var isFree=p.price===0||p.price==='0'||p.cta==='ابدأ مجاناً';
      var isDiamond=p.diamond||p.isDiamond||/ماس|diamond|diamant/i.test(String(p.id||'')+String(p.name||'')+String(p.name_fr||'')+String(p.cta||''));
      var isYear=/year|annuel|سنوي/i.test(String(p.id||'')+String(p.name||'')+String(p.name_fr||'')) || (Number(p.durationDays)>=360);
      var isTrial=/trial|free|essai|gratuit|مجاني|تجريب/i.test(String(p.id||'')+String(p.name||'')+String(p.name_fr||'')) || !Number(p.price);
      var isQuart=/quart|trimestr|ربع/i.test(String(p.id||'')+String(p.name||'')+String(p.name_fr||'')) || (Number(p.durationDays)>=80 && Number(p.durationDays)<360);
      var isMonth=/month|mensuel|شهر/i.test(String(p.id||'')+String(p.name||'')+String(p.name_fr||'')) && !isYear && !isQuart;
      var isHL=p.highlight&&!isDiamond;
      /* كل بطاقات الباقات كحلية (نموذج 1) — لا خلفيات بيضاء/فاتحة */
      var bg=isDiamond?'linear-gradient(145deg,#2e1065,#1B3A6B)'
        :isYear?'linear-gradient(145deg,#1B3A6B,#0f2347)'
        :isTrial?'linear-gradient(145deg,#0a1628,#122a4a)'
        :isHL?'linear-gradient(145deg,#16263d,#0D1B2A)'
        :'linear-gradient(145deg,#0D1B2A,#1B3A6B)';
      var border=isDiamond?'2px solid rgba(192,132,252,.7)'
        :isYear?'2px solid rgba(201,168,76,.6)'
        :isHL?'2px solid #C9A84C'
        :isTrial?'1.5px solid rgba(134,239,172,.55)'
        :'1.5px solid rgba(201,168,76,.28)';
      var shadow=isDiamond?'0 8px 28px rgba(107,33,168,.45)'
        :isYear?'0 8px 28px rgba(15,35,71,.35)'
        :isHL?'0 8px 28px rgba(201,168,76,.22)'
        :'0 6px 20px rgba(0,0,0,.28)';
      var nameCol=isDiamond?'#e9d5ff':isYear?'#fde68a':isTrial?'#86efac':isHL?'#fde68a':'#ffffff';
      var priceCol=isDiamond?'#c084fc':isYear?'#fbbf24':isTrial?'#4ade80':isHL?'#C9A84C':'#e8c96a';
      var mutedCol=isDiamond?'rgba(233,213,255,.55)':isYear?'rgba(255,255,255,.45)':isTrial?'rgba(134,239,172,.7)':'rgba(255,255,255,.55)';
      var featCol=isDiamond?'rgba(233,213,255,.9)':isYear?'rgba(255,255,255,.8)':isTrial?'rgba(220,252,231,.9)':'rgba(255,255,255,.82)';
      var checkCol=isDiamond?'#c084fc':isYear?'#fde68a':isTrial?'#4ade80':'#C9A84C';
      var btnBg=isDiamond?'linear-gradient(135deg,#a855f7,#7c3aed)':isTrial?'linear-gradient(135deg,#22c55e,#16a34a)':'#fff';
      var btnCol=isDiamond?'#fff':isTrial?'#fff':'#0f2347';
      var icon=isTrial?'🎁':isMonth?'📅':isQuart?'🚀':isYear?'👑':isDiamond?'💎':'📦';
      var pJson=JSON.stringify(p).replace(/"/g,'&quot;');
      var lblPopular=_fr?'⭐ Le plus demandé':'⭐ الأكثر طلباً';
      var lblDiamondTier=pBadge;
      var lblBestValue=_fr?'💎 Meilleure valeur':'💎 الأفضل قيمة';
      var lblFree=_fr?'Gratuit':'مجاناً';
      var lblStartFree=_fr?'Commencer gratuitement':'ابدأ مجاناً';
      var hasBadge=isHL||isYear||isDiamond;
      return '<div class="rpkg-card pricing-card'+(hasBadge?' has-badge':'')+(isDiamond||isYear||isHL?' featured':'')+'" onclick="openPkgModal(this,\''+origin+'\')" data-pkg="'+pJson+'" style="background:'+bg+';border:'+border+';box-shadow:'+shadow+'">'
        +(isHL?'<div class="pricing-card-badge pricing-card-badge--popular">'+_xe(lblPopular)+'</div>':'')
        +(isDiamond?'<div class="pricing-card-badge pricing-card-badge--diamond">💎 '+_xe(lblDiamondTier)+'</div>':'')
        +(isYear?'<div class="pricing-card-badge pricing-card-badge--year">'+_xe(lblBestValue)+'</div>':'')
        +'<div class="pricing-card-icon">'+_xe(icon)+'</div>'
        +'<div class="pricing-card-name" style="color:'+nameCol+'">'+_xe(pName)+'</div>'
        +(pDesc?'<div class="pricing-card-desc" style="color:'+featCol+'">'+_xe(pDesc)+'</div>':'')
        +'<div class="pricing-card-period" style="color:'+mutedCol+'">'+_xe(pPeriod)+'</div>'
        +'<div class="pricing-card-divider" style="background:'+(isYear||isDiamond?'rgba(255,255,255,.12)':'rgba(27,58,107,.08)')+'"></div>'
        +'<div class="pricing-card-price-wrap"><span class="price" style="color:'+priceCol+'">'+(isFree?_xe(lblFree):Number(p.price).toLocaleString())+'</span>'
        +(!isFree?'<div class="pricing-card-price-unit" style="color:'+mutedCol+'">MRU / '+_xe(pPeriod)+'</div>':'')+'</div>'
        +(isDiamond && pRoi ? '<div class="pricing-card-roi" style="color:#fde68a">💼 '+_xe(pRoi)+'</div>' : '')
        +'<ul class="pricing-features">'+pFeats.map(function(f){return'<li><span style="color:'+checkCol+';font-size:13px;flex-shrink:0">✓</span><span style="color:'+featCol+'">'+_xe(f)+'</span></li>';}).join('')+'</ul>'
        +(isFree?'<div class="pricing-card-freebox">'+_xe(lblStartFree)+'</div>'
          :'<button onclick="event.stopPropagation();openPkgModal(this.closest(\'.pricing-card\'),\''+origin+'\')" style="background:'+btnBg+';color:'+btnCol+'">'+_xe(pCta)+'</button>')
        +'</div>';
    }).join('');
  }


  // ── render all 6 grids ──
  renderGrid(ind, 'grid-individual');
  renderGrid(sto, 'grid-stores');
  renderGrid(off, 'grid-offices');
  renderGrid(corp, 'grid-corp');
  renderGrid(tender, 'grid-tender');
  renderGrid(investment, 'grid-investment');
  renderGrid(ads, 'grid-ads');

  // ── package tab switcher (overrides food/fuel one for pkg tabs only) ──
  var DIAMOND_PITCH = {
    stores: {
      head: { ar: '💎 النائب الذكي — باقتان ماسيتان للمحلات', fr: '💎 Adjoint intelligent — deux forfaits Diamant pour boutiques' },
      std: { name: { ar: 'الماسية الأساسية للمحلات', fr: 'Diamant Standard boutique' }, desc: { ar: 'نائب ذكي نصي للمحل — ويدجت + واتساب · 3,500 MRU/شهر', fr: 'Adjoint texte pour boutique — widget + WhatsApp · 3 500 MRU/mois' } },
      pro: { name: { ar: 'الماسية Pro للمحلات', fr: 'Diamant Pro boutique' }, desc: { ar: 'نص + صوت + مكالمات آلية · 6,000 MRU/شهر', fr: 'Texte + voix + appels automatiques · 6 000 MRU/mois' } },
      foot: { ar: 'الفرق الرئيسي: Pro للمحلات تضيف المكالمات الصوتية الذكية فوق كل مزايا الأساسية.', fr: 'Différence clé : Pro boutique ajoute les appels vocaux intelligents au-delà du texte.' }
    },
    offices: {
      head: { ar: '💎 النائب الذكي — باقتان ماسيتان للمكاتب', fr: '💎 Adjoint intelligent — deux forfaits Diamant pour bureaux' },
      std: { name: { ar: 'الماسية الأساسية للمكاتب', fr: 'Diamant Standard bureau' }, desc: { ar: 'استقبال واستفسارات نصي 24/7 — 4,000 MRU/شهر', fr: 'Accueil et réponses texte 24h/24 — 4 000 MRU/mois' } },
      pro: { name: { ar: 'الماسية Pro للمكاتب', fr: 'Diamant Pro bureau' }, desc: { ar: 'نص + مكالمات صوتية · 7,500 MRU/شهر', fr: 'Texte + appels vocaux · 7 500 MRU/mois' } },
      foot: { ar: 'الفرق الرئيسي: Pro للمكاتب تضيف المكالمات الصوتية التفاعلية ورد الاتصالات الآلي.', fr: 'Différence clé : Pro bureau ajoute les appels vocaux interactifs et la réponse automatique.' }
    },
    corp: {
      head: { ar: '💎 النائب الذكي — باقتان ماسيتان للشركات', fr: '💎 Adjoint intelligent — deux forfaits Diamant entreprise' },
      std: { name: { ar: 'الماسية الأساسية للشركات', fr: 'Diamant Standard entreprise' }, desc: { ar: 'نائب ذكي نصي — 6,000 MRU/شهر · 4,000 محادثة', fr: 'Adjoint texte — 6 000 MRU/mois · 4 000 conversations' } },
      pro: { name: { ar: 'الماسية Pro للشركات', fr: 'Diamant Pro entreprise' }, desc: { ar: 'نص + صوت + تكامل API/ERP · 15,000 MRU/شهر', fr: 'Texte + voix + API/ERP · 15 000 MRU/mois' } },
      foot: { ar: 'الفرق الرئيسي: Pro للشركات يضيف المكالمات الصوتية وتكامل API/ERP مع حدود استخدام أعلى.', fr: 'Différence clé : Pro entreprise ajoute la voix, l\'intégration API/ERP et des quotas supérieurs.' }
    },
    default: {
      head: { ar: '💎 النائب الذكي — باقتان ماسيتان', fr: '💎 Le plus choisi par les entreprises' },
      std: { name: { ar: 'الماسية الأساسية 💎', fr: 'Diamant Standard 💎' }, desc: { ar: 'موظف استقبال واستفسارات آلي 24/7', fr: 'Réceptionniste automatique 24h/24' } },
      pro: { name: { ar: 'الماسية Pro 💎', fr: 'Diamant Pro 💎' }, desc: { ar: 'نص + مكالمات صوتية تفاعلية', fr: 'Texte + appels vocaux interactifs' } },
      foot: { ar: 'الفرق الرئيسي: الماسية Pro تضيف المكالمات الصوتية التفاعلية فوق كل مزايا الماسية الأساسية.', fr: 'Le principal avantage de Pro : les appels vocaux interactifs en plus du texte.' }
    }
  };
  function updateDiamondPitch(tab){
    var box=document.getElementById('diamond-pitch');
    if(!box) return;
    var showDiamond=tab==='stores'||tab==='offices'||tab==='corp';
    box.style.display=showDiamond?'block':'none';
    if(!showDiamond) return;
    var cfg=(tab==='stores')?DIAMOND_PITCH.stores:(tab==='offices')?DIAMOND_PITCH.offices:(tab==='corp')?DIAMOND_PITCH.corp:DIAMOND_PITCH.default;
    var fr=(typeof isAr!=='undefined' && !isAr);
    var lang=fr?'fr':'ar';
    var el=function(id){return document.getElementById(id);};
    if(el('diamond-pitch-head')) el('diamond-pitch-head').textContent=cfg.head[lang];
    if(el('diamond-pitch-std-name')) el('diamond-pitch-std-name').textContent=cfg.std.name[lang];
    if(el('diamond-pitch-std-desc')) el('diamond-pitch-std-desc').textContent=cfg.std.desc[lang];
    if(el('diamond-pitch-pro-name')) el('diamond-pitch-pro-name').textContent=cfg.pro.name[lang];
    if(el('diamond-pitch-pro-desc')) el('diamond-pitch-pro-desc').textContent=cfg.pro.desc[lang];
    if(el('diamond-pitch-foot')) el('diamond-pitch-foot').textContent=cfg.foot[lang];
  }
  window.updateDiamondPitch = updateDiamondPitch;
  var _origSPT = window.switchPriceTab;
  window.switchPriceTab = function(tab, btn){
    if(tab==='individual'||tab==='stores'||tab==='offices'||tab==='corp'||tab==='tender'||tab==='ads'){
      document.querySelectorAll('#pricing .ptab-card').forEach(function(b){b.classList.remove('active');});
      document.querySelectorAll('.price-pane').forEach(function(p){p.classList.remove('active');});
      if(btn) btn.classList.add('active');
      var pane=document.getElementById('pane-'+tab);
      if(pane) pane.classList.add('active');
      updateDiamondPitch(tab);
      return;
    }
    if(typeof _origSPT==='function') _origSPT(tab,btn);
  };
  var activeBtn = document.querySelector('#pricing .ptab-card.active');
  var activeTab = (activeBtn && activeBtn.getAttribute('data-ptab')) || 'offices';
  updateDiamondPitch(activeTab);
}

document.addEventListener('DOMContentLoaded', function(){
  try {
    // Language already applied by syncLandingLangOnLoad — only refresh pricing if still AR.
    var saved = localStorage.getItem('rizq_lang');
    if (saved !== 'fr' && typeof renderPricingSection === 'function') renderPricingSection();
  } catch (e) {
    if (typeof renderPricingSection === 'function') renderPricingSection();
  }
});
