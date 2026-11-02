/* ── نماذج العقارات — بطاقة بـ 4 صور (كبيرة فوق + 3 مصغّرات تتحرّك) ── */
var RIZQ_EST_MODELS = [
  {id:'est1', cat:'villa', titleAr:'فيلا راقية بإطلالة بانورامية', titleFr:'Villa premium vue panoramique', locAr:'نواكشوط الغربية', locFr:'Nouakchott Ouest', price:'4.8M MRU', beds:'5', baths:'4', area:'420 م²', badgeAr:'مميّز', badgeFr:'Premium',
    imgs:[
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=700&q=80'
    ]},
  {id:'est2', cat:'apartment', titleAr:'شقة فاخرة 3 غرف — تشطيب حديث', titleFr:'Appartement 3 chambres premium', locAr:'تفرغ زينة', locFr:'Tevragh Zeina', price:'150K / شهر', beds:'3', baths:'2', area:'145 م²', badgeAr:'للكراء', badgeFr:'Location',
    imgs:[
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=700&q=80'
    ]},
  {id:'est3', cat:'apartment', titleAr:'شقة مفروشة بإطلالة مدينة', titleFr:'Appartement meublé vue ville', locAr:'لكصر', locFr:'Ksar', price:'2.1M MRU', beds:'2', baths:'2', area:'110 م²', badgeAr:'للبيع', badgeFr:'Vente',
    imgs:[
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=700&q=80'
    ]},
  {id:'est4', cat:'land', titleAr:'أرض سكنية 600 م² — موقع استراتيجي', titleFr:'Terrain 600 m² — emplacement stratégique', locAr:'نواذيبو', locFr:'Nouadhibou', price:'2.2M MRU', beds:'—', baths:'—', area:'600 م²', badgeAr:'أرض', badgeFr:'Terrain',
    imgs:[
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1464146072230-91cabc968266?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=700&q=80'
    ]},
  {id:'est5', cat:'villa', titleAr:'منزل عائلي بحديقة خاصة', titleFr:'Maison familiale avec jardin', locAr:'كيفة', locFr:'Kiffa', price:'3.4M MRU', beds:'4', baths:'3', area:'280 م²', badgeAr:'منزل', badgeFr:'Maison',
    imgs:[
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=700&q=80'
    ]},
  {id:'est6', cat:'shop', titleAr:'محل تجاري على شارع رئيسي', titleFr:'Local commercial sur artère principale', locAr:'سوق العاصمة', locFr:'Marché capital', price:'85K / شهر', beds:'—', baths:'—', area:'75 م²', badgeAr:'محل', badgeFr:'Local',
    imgs:[
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1555529902-54637c40857f?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=700&q=80'
    ]},
  {id:'est7', cat:'apartment', titleAr:'بنتهاوس بإطلالة غروب', titleFr:'Penthouse vue coucher de soleil', locAr:'القطب', locFr:'Le Pôle', price:'6.5M MRU', beds:'4', baths:'3', area:'260 م²', badgeAr:'بنتهاوس', badgeFr:'Penthouse',
    imgs:[
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=700&q=80'
    ]},
  {id:'est8', cat:'villa', titleAr:'فيلا حديثة بإضاءة ذهبية', titleFr:'Villa contemporaine lumière dorée', locAr:'سبخة', locFr:'Sebkha', price:'5.2M MRU', beds:'6', baths:'5', area:'510 م²', badgeAr:'فلل', badgeFr:'Villa',
    imgs:[
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=700&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=700&q=80'
    ]}
];
var _rizqEstCat = 'all';
var _rizqEstGalleryTimer = null; try{ window._rizqEstGalleryTimer = null; }catch(e){}

function setEstateModelCat(cat){
  var ok = {all:1, apartment:1, villa:1, land:1, shop:1};
  if(!ok[cat]) cat = 'all';
  _rizqEstCat = cat;
  document.querySelectorAll('#rizq-estate-models .rizq-styles-gtab[data-est-cat]').forEach(function(btn){
    var on = btn.getAttribute('data-est-cat') === cat;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  var rail = document.getElementById('rizq-est-rail');
  if(rail) rail.setAttribute('aria-labelledby', 'est-tab-' + cat);
  buildEstateModels(false);
}

function _rizqEstImgs(item){
  var list = (item && item.imgs && item.imgs.length) ? item.imgs.slice() : [];
  if(!list.length && item && item.img) list = [item.img];
  while(list.length < 4) list.push(list[list.length % Math.max(1, list.length)] || list[0]);
  return list.slice(0, 4);
}

function _rizqEstApplyGallery(card, imgs, heroIdx){
  if(!card || !imgs || !imgs.length) return;
  var n = imgs.length;
  var hi = ((heroIdx % n) + n) % n;
  var hero = card.querySelector('.rizq-est-hero img');
  var thumbs = card.querySelectorAll('.rizq-est-thumb img');
  if(hero){
    if(hero.getAttribute('src') !== imgs[hi]) hero.setAttribute('src', imgs[hi]);
  }
  var ti = 0;
  for(var i=0;i<n;i++){
    if(i === hi) continue;
    if(thumbs[ti]){
      if(thumbs[ti].getAttribute('src') !== imgs[i]) thumbs[ti].setAttribute('src', imgs[i]);
      ti++;
    }
  }
  card.setAttribute('data-est-hero', String(hi));
}

function _rizqEstStartGalleries(rail){
  if(_rizqEstGalleryTimer){ clearInterval(_rizqEstGalleryTimer); _rizqEstGalleryTimer = null; } try{ window._rizqEstGalleryTimer = _rizqEstGalleryTimer; }catch(e){}
  if(!rail) return;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  _rizqEstGalleryTimer = setInterval(function(){
    rail.querySelectorAll('.rizq-est-card[data-est-imgs]').forEach(function(card){
      var raw = card.getAttribute('data-est-imgs') || '';
      var imgs = raw.split('|').filter(Boolean);
      if(imgs.length < 2) return;
      var cur = parseInt(card.getAttribute('data-est-hero') || '0', 10) || 0;
      _rizqEstApplyGallery(card, imgs, cur + 1);
    });
  }, 3200);
  try{ window._rizqEstGalleryTimer = _rizqEstGalleryTimer; }catch(e){}
}

function buildEstateModels(reshuffle){
  var rail = document.getElementById('rizq-est-rail');
  if(!rail) return;
  var fr = false;
  try {
    if(typeof isAr !== 'undefined') fr = !isAr;
    else fr = (localStorage.getItem('rizq_lang')||'ar') === 'fr';
  } catch(e) {}
  var cat = _rizqEstCat || 'all';
  var esc = typeof _styEsc === 'function' ? _styEsc : function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); };
  var list = RIZQ_EST_MODELS.filter(function(x){ return cat === 'all' || x.cat === cat; });
  if(reshuffle && typeof _styShuffle === 'function') list = _styShuffle(list.slice());
  var tick = document.getElementById('rizq-est-tick');
  if(tick) tick.textContent = fr
    ? (list.length + ' modèles · 4 photos')
    : (list.length + ' نموذجاً · 4 صور');
  if(!list.length){
    rail.classList.add('is-empty');
    rail.innerHTML = '<div class="rizq-styles-empty">'+(fr
      ? 'Aucun modèle pour ce filtre — voir tout le marché immobilier.'
      : 'لا نماذج لهذا التصفية — اعرض سوق كل العقارات.')+'</div>';
    return;
  }
  var href = 'rizq_estate.html?demo=1';
  var cards = list.map(function(item){
    var imgs = _rizqEstImgs(item);
    var title = esc(fr ? item.titleFr : item.titleAr);
    var thumbsHtml = '';
    for(var t=1;t<4;t++){
      thumbsHtml += '<div class="rizq-est-thumb"><img src="'+esc(imgs[t])+'" alt="" loading="lazy" decoding="async"/></div>';
    }
    return '<a class="rizq-est-card" role="listitem" href="'+href+'" data-est-cat="'+esc(item.cat)+'" data-est-imgs="'+esc(imgs.join('|'))+'" data-est-hero="0">'
      + '<div class="rizq-est-card-media">'
      +   '<div class="rizq-est-hero"><img src="'+esc(imgs[0])+'" alt="'+title+'" loading="lazy" decoding="async"/></div>'
      +   '<div class="rizq-est-thumbs">'+thumbsHtml+'</div>'
      +   '<span class="rizq-est-badge">'+esc(fr ? item.badgeFr : item.badgeAr)+'</span>'
      +   '<span class="rizq-est-price">'+esc(item.price)+'</span>'
      + '</div>'
      + '<div class="rizq-est-card-body">'
      +   '<h3>'+title+'</h3>'
      +   '<div class="rizq-est-loc">📍 '+esc(fr ? item.locFr : item.locAr)+'</div>'
      +   '<div class="rizq-est-meta">'
      +     '<span>🛏 '+esc(item.beds)+'</span>'
      +     '<span>🛁 '+esc(item.baths)+'</span>'
      +     '<span>📐 '+esc(item.area)+'</span>'
      +   '</div>'
      + '</div></a>';
  });
  rail.classList.remove('is-empty');
  /* كرّر القائمة لحركة شريط مستمرة مثل المعارض */
  rail.innerHTML = cards.concat(cards).join('');
  _rizqEstStartGalleries(rail);
  requestAnimationFrame(function(){
    try { if(typeof syncMarqueeShift === 'function') syncMarqueeShift(rail); } catch(e2){}
    try {
      if(typeof bindRafMarquee === 'function'){
        bindRafMarquee(rail, {pxPerSec: 42});
        if(rail._rzqMarquee) rail._rzqMarquee.remeasure();
      }
    } catch(e3){}
  });
}
try { buildEstateModels(false); } catch(eEst) {}
