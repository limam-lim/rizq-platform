/* ── نماذج المعارض — نفس فكرة أفكار الأنماط لكن لسيارات/أثاث/إلكترونيات… ── */
var _rizqSrmCat = 'cars';
var RIZQ_SRM_CATS = {
  /* allow يُطبَّق على cat/catKey فقط — لا على الوصف (تفادي «موقف سيارات» في الشقق) */
  cars: { ar:'سيارات', fr:'Voitures', dirCat:'سيارات', allow:/^(?=.*(?:سيارات|voiture|\bauto\b|sedan|suv|4x4|camionnette|moto))/i, block:/عقارات|شقق|أراضي|أثاث|إلكترون|ذهب|ماشية|خدمات|أزياء|appartement|terrain/i },
  electronics: { ar:'إلكترونيات', fr:'Électronique', dirCat:'إلكترونيات', allow:/إلكترون|هواتف|لابتوب|تلفزيون|جوال|iphone|samsung|laptop|\btv\b|électronique|electronique/i, block:/عقارات|سيارات|شاحن(?:ات)?\b|أثاث|ذهب|ماشية|appartement|voiture/i },
  furniture: { ar:'أثاث ومفروشات', fr:'Meubles', dirCat:'أثاث', allow:/أثاث|مفروشات|كنب|سرير|طاولة|خزانة|meuble|canapé|sofa|armoire/i, block:/عقارات|سيارات|إلكترون|ذهب|ماشية|شاحن/i },
  equipment: { ar:'معدات ومكائن', fr:'Équipements', dirCat:'معدات', allow:/معدات|مكائن|آلات|حفارة|مولد|équipement|equipement|\bmachine\b|\bengin\b|générateur|generateur|caterpillar/i, block:/عقارات|شقق|أزياء|ذهب|ماشية|إلكترون.*هاتف/i },
  building: { ar:'مواد بناء', fr:'Matériaux', dirCat:'بناء', allow:/بناء|إسمنت|حديد|طوب|مواد\s*بناء|ciment|fer\b|construction|matériau|materiau|ألواح\s*شمسي/i, block:/عقارات|شقق|سيارات|أزياء|ذهب/i },
  jewelry: { ar:'مجوهرات', fr:'Bijoux', dirCat:'ذهب', allow:/ذهب|مجوهرات|خاتم|سوار|عقد|عيار|bijou|\bgold\b|joaill/i, block:/عقارات|سيارات|إلكترون|أثاث|ماشية|شاحن/i }
};
var RIZQ_SRM_EMOJI_SETS = {
  cars: [['🚗','🔑','🛡️'],['🚙','🛞','🗺️'],['🚘','✨','🏷️']],
  electronics: [['📱','🔋','🎧'],['💻','🖱️','⌨️'],['📺','🔊','📡']],
  furniture: [['🛋️','🪞','🪴'],['🛏️','🗄️','💡'],['🪑','📐','🗂️']],
  equipment: [['⚙️','🔧','🧰'],['⚡','🛢️','🔌'],['🚜','🛞','🛡️']],
  building: [['🏗️','🧱','📦'],['🔩','📏','🏭'],['🪟','🪣','✨']],
  jewelry: [['🪙','💍','✨'],['💍','📿','💎'],['💎','👑','✨']]
};
var RIZQ_SRM_TEMPLATES = {
  cars: [
    { ar:'موديل سيدان عائلي', fr:'Berline familiale', emoji:['🚗','🔑','🛡️'], cats:['سيارات'], browseSub:'سيارات للبيع', kind:'sedan' },
    { ar:'SUV للطريق الطويل', fr:'SUV longue route', emoji:['🚙','🛞','🗺️'], cats:['سيارات'], browseSub:'سيارات للبيع', kind:'suv' },
    { ar:'تشكيلة معرض اليوم', fr:'Sélection du showroom', emoji:['🚘','✨','🏷️'], cats:['سيارات'], browseSub:'', kind:'' }
  ],
  electronics: [
    { ar:'هواتف ذكية مختارة', fr:'Smartphones sélectionnés', emoji:['📱','🔋','🎧'], cats:['إلكترونيات'], browseSub:'هواتف ذكية', kind:'phone' },
    { ar:'لابتوب للعمل والترفيه', fr:'Laptops travail & loisir', emoji:['💻','🖱️','⌨️'], cats:['إلكترونيات'], browseSub:'لابتوب وحاسوب', kind:'laptop' },
    { ar:'شاشات وتلفزيونات', fr:'Écrans & TV', emoji:['📺','🔊','📡'], cats:['إلكترونيات'], browseSub:'شاشات وتلفزيون', kind:'tv' }
  ],
  furniture: [
    { ar:'صالون أنيق للبيت', fr:'Salon élégant', emoji:['🛋️','🪞','🪴'], cats:['أثاث'], browseSub:'', kind:'sofa' },
    { ar:'غرفة نوم متكاملة', fr:'Chambre complète', emoji:['🛏️','🗄️','💡'], cats:['أثاث'], browseSub:'', kind:'bed' },
    { ar:'مكتب ومنضدة عملية', fr:'Bureau & table', emoji:['🪑','📐','🗂️'], cats:['أثاث'], browseSub:'', kind:'desk' }
  ],
  equipment: [
    { ar:'معدات ورشة جاهزة', fr:'Équipement d\'atelier', emoji:['⚙️','🔧','🧰'], cats:['معدات'], browseSub:'', kind:'tools' },
    { ar:'مولدات وطاقة', fr:'Groupes & énergie', emoji:['⚡','🛢️','🔌'], cats:['معدات','طاقة'], browseSub:'', kind:'generator' },
    { ar:'آليات خفيفة للمعرض', fr:'Engins légers', emoji:['🚜','🛞','🛡️'], cats:['معدات'], browseSub:'', kind:'' }
  ],
  building: [
    { ar:'مواد بناء أساسية', fr:'Matériaux de base', emoji:['🏗️','🧱','📦'], cats:['بناء'], browseSub:'', kind:'cement' },
    { ar:'حديد وتسليح', fr:'Fer & armature', emoji:['🔩','📏','🏭'], cats:['بناء'], browseSub:'', kind:'steel' },
    { ar:'تشطيبات المعرض', fr:'Finitions showroom', emoji:['🪟','🪣','✨'], cats:['بناء'], browseSub:'', kind:'' }
  ],
  jewelry: [
    { ar:'تشكيلة ذهب المعرض', fr:'Sélection or showroom', emoji:['🪙','💍','✨'], cats:['ذهب'], browseSub:'', kind:'gold' },
    { ar:'خواتم وأساور', fr:'Bagues & bracelets', emoji:['💍','📿','💎'], cats:['ذهب'], browseSub:'', kind:'ring' },
    { ar:'طقم فاخر للعرض', fr:'Parure premium', emoji:['💎','👑','✨'], cats:['ذهب'], browseSub:'', kind:'' }
  ]
};
var RIZQ_SRM_AUTO_MS = 3 * 60 * 1000;
var _rizqSrmAutoTimer = null;
var _rizqSrmNextAt = 0;

function _srmTemplatesFor(cat){
  return RIZQ_SRM_TEMPLATES[cat] || RIZQ_SRM_TEMPLATES.cars;
}
function _srmCatMeta(cat){
  return RIZQ_SRM_CATS[cat] || RIZQ_SRM_CATS.cars;
}
function _srmTabIdFor(cat){
  return 'srm-tab-' + (RIZQ_SRM_CATS[cat] ? cat : 'cars');
}
function _srmIsModelCat(a, cat){
  if(!a) return false;
  var meta = _srmCatMeta(cat);
  var k = String(a.catKey || '').trim();
  var catStr = String(a.cat || '').trim();
  var head = (k + ' ' + catStr).trim();
  if(!head) return false;
  /* استبعاد صريح للأصناف الدخيلة */
  if(meta.block && meta.block.test(head)) return false;
  /* عنوان عقاري لا يدخل تبويب السيارات حتى مع ذكر «موقف سيارات» في الوصف */
  if(cat === 'cars'){
    var titleBlob = [a.title||'', a.titleFR||'', a.titleFr||'', a.subcat||''].join(' ');
    if(/شقة|فيلا|أرض|بنتهاوس|appartement|villa|\bterrain\b|penthouse/i.test(titleBlob)) return false;
  }
  if(meta.dirCat && (k === meta.dirCat || k.indexOf(meta.dirCat) >= 0 || catStr.indexOf(meta.dirCat) >= 0)) return true;
  /* لا تختبر allow على العنوان/الوصف — فقط cat/catKey */
  if(meta.allow && (meta.allow.test(k) || meta.allow.test(catStr))) return true;
  return false;
}
function _srmPickCompanions(primary, pool, n, avoidIds){
  n = n || 2;
  avoidIds = avoidIds || {};
  var used = {};
  Object.keys(avoidIds).forEach(function(k){ used[k] = 1; });
  if(primary && primary.id != null) used[String(primary.id)] = 1;
  var list = (pool || []).filter(function(a){
    return a && a.id != null && !used[String(a.id)];
  });
  /* فضّل منتجات نفس المعرض أولاً — كتالوج واحد متماسك */
  var sameId = primary && (primary.showroomId || primary.storeId)
    ? String(primary.showroomId || primary.storeId) : '';
  if(sameId){
    var sameShowroom = list.filter(function(a){
      return String(a.showroomId || a.storeId || '') === sameId;
    });
    if(sameShowroom.length){
      list = sameShowroom.concat(list.filter(function(a){
        return String(a.showroomId || a.storeId || '') !== sameId;
      }));
    }
  }
  var primaryKind = _srmAdKind(primary);
  var picks = [];
  /* فضّل منتجات بأنواع مختلفة (مثل أمازون: سيارة + إطار + مفتاح) */
  var preferKinds = list.slice().sort(function(a, b){
    var ka = _srmAdKind(a), kb = _srmAdKind(b);
    var sa = (ka && ka !== primaryKind) ? 0 : 1;
    var sb = (kb && kb !== primaryKind) ? 0 : 1;
    return sa - sb;
  });
  var ordered = (typeof _styShuffle === 'function' ? _styShuffle(preferKinds) : preferKinds.slice());
  /* أعد الترتيب: المختلف النوع أولاً بعد الخلط داخل كل مجموعة */
  ordered.sort(function(a, b){
    var ka = _srmAdKind(a), kb = _srmAdKind(b);
    var sa = (ka && ka !== primaryKind) ? 0 : 1;
    var sb = (kb && kb !== primaryKind) ? 0 : 1;
    return sa - sb;
  });
  for(var i=0; i<ordered.length && picks.length < n; i++){
    var ad = ordered[i];
    if(used[String(ad.id)]) continue;
    picks.push(ad);
    used[String(ad.id)] = 1;
  }
  return picks;
}
/** ثلاثة منتجات مختلفة لنفس بطاقة الموزاييك — لا بلاطة فارغة */
function _srmPickTrio(pool, preferKind, avoidIds){
  avoidIds = avoidIds || {};
  var used = {};
  Object.keys(avoidIds).forEach(function(k){ used[k] = 1; });
  var list = (pool || []).filter(function(a){ return a && a.id != null && !used[String(a.id)]; });
  if(!list.length) list = (pool || []).filter(Boolean);
  var primary = null;
  if(preferKind){
    var kindHits = list.filter(function(a){ return _srmAdKind(a) === preferKind; });
    if(kindHits.length) primary = (typeof _styShuffle === 'function' ? _styShuffle(kindHits) : kindHits)[0];
  }
  if(!primary && list.length) primary = (typeof _styShuffle === 'function' ? _styShuffle(list) : list)[0];
  if(!primary) return [];
  used[String(primary.id)] = 1;
  var comps = _srmPickCompanions(primary, pool, 2, used);
  var items = [primary].concat(comps);
  /* املأ من نفس الصنف دون تكرار داخل البطاقة */
  for(var i=0; i<(pool||[]).length && items.length < 3; i++){
    var a = pool[i];
    if(!a || a.id == null) continue;
    if(items.some(function(x){ return x && String(x.id) === String(a.id); })) continue;
    items.push(a);
  }
  return items.slice(0, 3);
}
function _srmAdKind(a){
  if(!a) return '';
  var blob = [a.title||'', a.titleFR||'', a.subcat||'', a.cat||'', a.catKey||'', (a.tags||[]).join(' ')].join(' ');
  if(/مفتاح|مفاتيح|ريموت|\bclé|keys?/i.test(blob)) return 'keys';
  if(/إطار|إطارات|pneu|tire|wheel|🛞/i.test(blob)) return 'tire';
  if(/suv|جيب|دفع\s*رباعي|4\s*x\s*4|land\s*cruiser|تويوتا\s*لاند|توسان|tucson|hilux/i.test(blob)) return 'suv';
  if(/سيدان|berline|\bsedan\b|كامري|corolla|فيينا|camry/i.test(blob)) return 'sedan';
  if(/هاتف|iphone|samsung|phone|جوال|موبايل/i.test(blob)) return 'phone';
  if(/لابتوب|laptop|حاسوب|ordinateur/i.test(blob)) return 'laptop';
  if(/تلفزيون|\btv\b|écran|شاشة/i.test(blob)) return 'tv';
  if(/سماع|écouteur|headphone|🎧/i.test(blob)) return 'audio';
  if(/كنب|sofa|canapé|صالون\s*(?:أنيق|بيت|منزل|غرفة)?/i.test(blob)) return 'sofa';
  if(/سرير|bed|lit|غرفة\s*نوم/i.test(blob)) return 'bed';
  if(/مكتب|bureau|desk|طاولة/i.test(blob)) return 'desk';
  if(/مولد|générateur|generateur|generator/i.test(blob)) return 'generator';
  if(/عدة|أدوات|tools|atelier/i.test(blob)) return 'tools';
  if(/إسمنت|ciment|cement/i.test(blob)) return 'cement';
  if(/حديد|fer|acier|steel/i.test(blob)) return 'steel';
  if(/خاتم|bague|ring/i.test(blob)) return 'ring';
  if(/ذهب|or\b|gold|عيار/i.test(blob)) return 'gold';
  return '';
}
function _srmUpdateTick(fr){
  var el = document.getElementById('rizq-srm-tick');
  if(!el) return;
  if(!_rizqSrmNextAt){ el.textContent = ''; return; }
  el.textContent = fr ? ('✨ De nouvelles offres arrivent') : ('✨ عروض جديدة في الطريق');
}
function _srmStartAutoRefresh(){
  if(_rizqSrmAutoTimer) clearInterval(_rizqSrmAutoTimer);
  _rizqSrmNextAt = Date.now() + RIZQ_SRM_AUTO_MS;
  _rizqSrmAutoTimer = setInterval(function(){
    if(document.hidden) return;
    _rizqSrmNextAt = Date.now() + RIZQ_SRM_AUTO_MS;
    try { buildShowroomModels(true); } catch(e){}
  }, RIZQ_SRM_AUTO_MS);
  if(!_srmUpdateTick._bound){
    _srmUpdateTick._bound = 1;
    setInterval(function(){
      var fr = false;
      try {
        if(typeof isAr !== 'undefined') fr = !isAr;
        else fr = (localStorage.getItem('rizq_lang')||'ar') === 'fr';
      } catch(e){}
      _srmUpdateTick(fr);
    }, 1000);
  }
  try {
    var fr0 = (typeof isAr !== 'undefined') ? !isAr : false;
    _srmUpdateTick(fr0);
  } catch(e2){}
}
function setShowroomModelCat(cat){
  if(!RIZQ_SRM_CATS[cat]) cat = 'cars';
  _rizqSrmCat = cat;
  document.querySelectorAll('#rizq-showroom-models .rizq-styles-gtab[data-srm-cat]').forEach(function(btn){
    var on = btn.getAttribute('data-srm-cat') === cat;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  var rail = document.getElementById('rizq-srm-rail');
  if(rail) rail.setAttribute('aria-labelledby', _srmTabIdFor(cat));
  /* إن وُجدت نتائج مسبقة لهذا التبويب استخدمها، وإلا اجلب من الخادم */
  try {
    var cached = window.__rizqHomeCatalog && window.__rizqHomeCatalog.showrooms
      && window.__rizqHomeCatalog.showrooms[cat];
    if(cached && cached.length){
      var byAcc = {};
      cached.forEach(function(it){
        if(!it || !it.accountId) return;
        var aid = String(it.accountId);
        if(!byAcc[aid]){
          byAcc[aid] = { acc: it.seller || { id: aid, type: 'corp' }, items: [] };
        }
        byAcc[aid].items.push(it);
      });
      window.__rizqSrmApiCatalog = Object.keys(byAcc).map(function(k){ return byAcc[k]; });
    } else {
      window.__rizqSrmHydrating = 0;
      _srmHydrateFromApi();
    }
  } catch(eHyd){}
  buildShowroomModels(false);
  try { refreshLandingBrandStrips(); } catch(eBrand){}
}
function buildShowroomModels(reshuffle){
  var rail = document.getElementById('rizq-srm-rail');
  if(!rail) return;
  var fr = false;
  try {
    if(typeof isAr !== 'undefined') fr = !isAr;
    else fr = (localStorage.getItem('rizq_lang')||'ar') === 'fr';
  } catch(e) {}
  var cat = RIZQ_SRM_CATS[_rizqSrmCat] ? _rizqSrmCat : 'cars';
  var meta = _srmCatMeta(cat);
  var templates = _srmTemplatesFor(cat);
  /* كتالوج المعارض فقط — لا إعلانات التصفح (تفادي صور خاطئة مثل توسان←فورد) */
  var pool = (typeof _srmPool === 'function' ? _srmPool() : []).filter(function(a){ return _srmIsModelCat(a, cat); });
  var tplList = (typeof _styShuffle === 'function' ? _styShuffle(templates) : templates.slice());
  var usedPrimary = {};
  var cards = [];
  var cta = fr ? 'Voir le showroom' : 'تصفّح المعرض';
  var badge = fr ? meta.fr : meta.ar;
  var esc = typeof _styEsc === 'function' ? _styEsc : function(s){ return String(s==null?'':s); };

  function renderTrioCard(items, name, metaLine, tplEmoji){
    if(!items || !items.length) return;
    var primary = items[0];
    /* داخل البطاقة: 3 منتجات مختلفة — كل بلاطة بسعر ونقرة خاصة */
    var tileItems = items.slice(0, 3);
    while(tileItems.length < 3 && pool.length){
      var filler = pool.find(function(a){
        return a && !tileItems.some(function(x){ return x && String(x.id)===String(a.id); });
      });
      if(!filler) break;
      tileItems.push(filler);
    }
    if(tileItems.length < 3) return; /* لا بطاقة ببلاطات جامدة */
    var href = (primary && primary.href)
      ? primary.href
      : (primary && (primary.showroomId || primary.storeId)
        ? ('rizq_showroom.html?id=' + encodeURIComponent(primary.showroomId || primary.storeId))
        : ('rizq_directory.html?type=corp&cat=' + encodeURIComponent(meta.dirCat)));
    var tiles = '';
    for(var ti=0; ti<3; ti++){
      var adT = tileItems[ti];
      tiles += (typeof _styTileHtml === 'function')
        ? _styTileHtml(adT, (tplEmoji||[])[ti] || adT.emoji, adT.bg)
        : '';
    }
    var brandCatSrm = (typeof _landingBrandCatForSrm === 'function')
      ? _landingBrandCatForSrm(cat)
      : (cat === 'electronics' ? 'إلكترونيات' : (cat === 'cars' ? 'سيارات' : ''));
    var brandHtmlSrm = (typeof _styBrandChipForLook === 'function')
      ? _styBrandChipForLook(tileItems, fr, brandCatSrm || 'سيارات')
      : ((typeof _styBrandLogoNameHtml === 'function') ? _styBrandLogoNameHtml(primary, fr) : '');
    cards.push((typeof _styBuildCardHtml === 'function')
      ? _styBuildCardHtml({
          srmCat: cat,
          tilesHtml: tiles,
          brandHtml: brandHtmlSrm,
          badge: badge,
          name: name,
          meta: metaLine,
          cta: cta,
          href: href,
          primaryId: primary && primary.id != null ? primary.id : ''
        })
      : '<article class="rizq-style-card" role="listitem" data-srm-cat="'+cat+'">'
        + '<div class="rizq-style-mosaic">'+tiles+'</div>'
        + '<div class="rizq-style-body">'
        +   (brandHtmlSrm ? '<div class="rizq-style-brand-row">'+brandHtmlSrm+'</div>' : '')
        +   '<div class="rizq-style-badge">'+esc(badge)+'</div>'
        +   '<div class="rizq-style-name">'+esc(name)+'</div>'
        +   '<div class="rizq-style-meta">'+esc(metaLine)+'</div>'
        +   '<a class="rizq-style-cta" href="'+esc(href)+'">'+esc(cta)+'</a>'
        + '</div></article>'
    );
  }

  tplList.forEach(function(tpl){
    var items = _srmPickTrio(pool, tpl.kind || '', usedPrimary);
    if(!items.length) items = _srmPickTrio(pool, '', {});
    if(!items.length) return;
    if(items[0] && items[0].id != null) usedPrimary[String(items[0].id)] = 1;
    var name = fr ? tpl.fr : tpl.ar;
    renderTrioCard(items, name, _styClearMeta(items, fr), tpl.emoji);
  });

  /* بطاقات إضافية لسلسلة أفقية متواصلة */
  var extrasSrm = (typeof _styShuffle === 'function' ? _styShuffle : function(a){return a.slice();})(
    pool.filter(function(a){ return a && !usedPrimary[String(a.id)]; })
  );
  var emojiSrm = (RIZQ_SRM_EMOJI_SETS && RIZQ_SRM_EMOJI_SETS[cat]) || RIZQ_SRM_EMOJI_SETS.cars;
  for(var sx=0; cards.length < 6 && sx < extrasSrm.length; sx++){
    var adS = extrasSrm[sx];
    usedPrimary[String(adS.id)] = 1;
    var itemsS = _srmPickTrio(pool, _srmAdKind(adS), {});
    if(itemsS[0] && String(itemsS[0].id) !== String(adS.id)){
      itemsS = [adS].concat(_srmPickCompanions(adS, pool, 2, {}));
      while(itemsS.length < 3){
        var more = pool.find(function(a){
          return a && !itemsS.some(function(x){ return x && String(x.id)===String(a.id); });
        });
        if(!more) break;
        itemsS.push(more);
      }
    }
    var dS = (typeof trAd === 'function') ? trAd(adS) : adS;
    var nameS = String((dS && (dS.title || adS.title)) || (fr ? 'Modèle Rizq' : 'نموذج رزق'));
    if(nameS.length > 52) nameS = nameS.slice(0, 49).trim() + '…';
    renderTrioCard(itemsS, nameS, _styClearMeta(itemsS, fr), emojiSrm[sx % emojiSrm.length]);
  }

  if(!cards.length){
    rail.classList.add('is-empty');
    rail.innerHTML = '<div class="rizq-styles-empty">'+(fr
      ? 'Pas encore assez de produits catalogue showroom. Explorez le guide des showrooms.'
      : 'لا توجد منتجات كافية في كتالوج المعارض بعد. تصفّح دليل المعارض.')+'</div>';
    return;
  }
  rail.classList.remove('is-empty');
  rail.innerHTML = cards.concat(cards).join('');
  if(reshuffle){
    try { _srmStartAutoRefresh(); } catch(e3) {}
  }
  _srmUpdateTick(fr);
  requestAnimationFrame(function(){ syncMarqueeShift(rail); });
}
/** جلب كتالوجات المعارض — طلب واحد /api/catalog/home?section=showrooms&cat= */
function _srmHydrateFromApi(){
  var base = (typeof window.RIZQ_BACKEND_BASE === 'string' ? window.RIZQ_BACKEND_BASE : '').replace(/\/$/,'');
  if(!base) return;
  if(window.__rizqSrmHydrating) return;
  window.__rizqSrmHydrating = 1;
  var cat = _rizqSrmCat || 'cars';
  fetch(base + '/api/catalog/home?section=showrooms&cat=' + encodeURIComponent(cat) + '&limit=48')
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(data){
      if(!data || !data.ok || !Array.isArray(data.items) || !data.items.length) return;
      window.__rizqHomeCatalog = window.__rizqHomeCatalog || {};
      window.__rizqHomeCatalog.showrooms = window.__rizqHomeCatalog.showrooms || {};
      window.__rizqHomeCatalog.showrooms[cat] = data.items;
      /* توافق الجامع القديم: مصفوفة {acc, items} مجمّعة حسب الحساب */
      var byAcc = {};
      data.items.forEach(function(it){
        if(!it || !it.accountId) return;
        var aid = String(it.accountId);
        if(!byAcc[aid]){
          byAcc[aid] = {
            acc: it.seller || { id: aid, name: (it.seller && it.seller.name) || aid, type: 'corp' },
            items: []
          };
        }
        byAcc[aid].items.push(it);
      });
      window.__rizqSrmApiCatalog = Object.keys(byAcc).map(function(k){ return byAcc[k]; });
      try { buildShowroomModels(false); } catch(eB){}
    })
    .catch(function(){})
    .then(function(){ window.__rizqSrmHydrating = 0; });
}
try { buildShowroomModels(false); } catch(eSrm) {}
try { _srmStartAutoRefresh(); } catch(eSrmAuto) {}
try { _srmHydrateFromApi(); } catch(eSrmHyd) {}
try { refreshLandingBrandStrips(); } catch(eBrandBoot) {}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){
    try { refreshLandingBrandStrips(); } catch(e){}
  });
} else {
  try { refreshLandingBrandStrips(); } catch(e){}
}
