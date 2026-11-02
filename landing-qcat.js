// ── QCAT PORTAL ──
var QCAT_DATA = (typeof RizqCategories !== 'undefined') ? RizqCategories.qcatData() : {
  'عقارات': {icon:'🏠', subs:['شقق للكراء','شقق للبيع','منازل وفيلات','أراضي','محلات تجارية','إيجار يومي']},
  'سيارات': {icon:'🚗', subs:['سيارات للبيع','سيارات للكراء','دراجات نارية','قطع غيار']},
  'شاحنات': {icon:'🚛', subs:['شاحنات للبيع','شاحنات للكراء','حافلات وباصات']},
  'إلكترونيات': {icon:'📱', subs:['هواتف ذكية','لابتوب وحاسوب','شاشات وتلفزيون']},
  'أزياء': {icon:'👗', subs:['دراعة رجالية','ملحفة نسائية','ملابس رجالية']},
  'ذهب ومجوهرات': {icon:'💰', subs:['ذهب عيار 24','ذهب عيار 22','أساور وخلاخيل']},
  'صحة وجمال': {icon:'🌿', subs:['أدوية ومكملات','مستحضرات طبيعية']},
  'ماشية': {icon:'🐄', subs:['إبل','بقر','غنم وماعز']}
};
const QCAT_DATA_FR = (typeof RizqCategories !== 'undefined' && RizqCategories.qcatDataFr)
  ? RizqCategories.qcatDataFr()
  : {
  'عقارات': {icon:'🏠', subs:['Appartements à louer','Appartements à vendre','Maisons & villas','Terrains','Locaux commerciaux','Location journalière']},
  'معدات-منزل': {icon:'🔌', subs:['Réfrigérateurs & congélateurs','Lave-linge & sèche-linge','Climatisation & refroidissement','Robots & préparation']},
  'طاقة': {icon:'⚡', subs:['Panneaux solaires','Onduleurs & convertisseurs','Groupes électrogènes','Batteries UPS & secours']},
  'رحلات': {icon:'✈️', subs:['Offres touristiques','Réservation hôtels','Voyages organisés','Bagages & valises']},
  'سيارات': {icon:'🚗', subs:['Voitures à vendre','Voitures à louer','Voitures électriques et hybrides','Motos','Pièces détachées','Pneus & batteries']},
  'شاحنات': {icon:'🚛', subs:['Camions à vendre','Camions à louer','Bus & autocars','Engins de chantier','Matériel agricole']},
  'إلكترونيات': {icon:'📱', subs:['Smartphones','Laptops & ordinateurs','Écrans & TV','Électroménager','Caméras & drones']},
  'أزياء': {icon:'👗', subs:['Daraa homme','Melhfa femme','Vêtements homme','Vêtements femme & enfant','Chaussures & sacs','Bijoux & or']},
  'ذهب ومجوهرات': {icon:'💰', subs:['Or 24 carats','Or 22 carats','Or 21 carats','Or 18 carats','Lingots d\'or','Bracelets & chevilles','Bagues & anneaux','Colliers & pendentifs','Parure de mariée','Or pour dot & mariage','Achat au poids (gramme / mithqal)','Évaluation & expertise','Refonte & fabrication','Bijoux en argent','Pierres précieuses']},
  'صحة وجمال': {icon:'🌿', subs:['Médicaments & compléments','Produits naturels','Parfums & soins','Matériel médical']},
  'وظائف': {icon:'💼', subs:['Administration & marketing','Ingénierie & technique','Santé & médecine','Enseignement','Freelance']},
  'ماشية': {icon:'🐄', subs:['Chameaux','Bovins','Ovins & caprins','Volailles & oiseaux','Aliments & accessoires']},
};

const QCAT_KEYS_FR = (typeof RizqCategories !== 'undefined' && RizqCategories.qcatKeysFr)
  ? RizqCategories.qcatKeysFr()
  : {
  'عقارات':'Immobilier','معدات-منزل':'Électroménager & maison','طاقة':'Énergie & accessoires','رحلات':'Voyages & tourisme',
  'سيارات':'Voitures','شاحنات':'Camions','إلكترونيات':'Électronique','أزياء':'Mode','ذهب ومجوهرات':'Or & bijoux',
  'صحة وجمال':'Santé & beauté','وظائف':'Emplois','ماشية':'Bétail','خدمات':'Services','بناء':'Construction','مكائن-صناعية':'Machines & équipements industriels'
};

/* Map quick-cat chips → «كل الأقسام» cards so both panels share the same branch layout */
var QCAT_TO_CAT_CARD = (typeof RizqCategories !== 'undefined') ? RizqCategories.qcatToCatCard() : {
  'عقارات': 'منازل وعقارات',
  'معدات-منزل': 'معدات المنازل',
  'طاقة': 'طاقة ومستلزمات',
  'رحلات': 'رحلات وسفر',
  'مكائن-صناعية': 'مكائن ومعدات صناعية',
  'سيارات': 'سيارات وقطع غيار',
  'شاحنات': 'شاحنات ومعدات ثقيلة',
  'إلكترونيات': 'هواتف وإلكترونيات',
  'أزياء': 'موضة وأزياء',
  'ذهب ومجوهرات': 'ذهب ومجوهرات',
  'صحة وجمال': 'صحة وجمال',
  'ماشية': 'ماشية ودواجن وبيطرة'
};

function _qcatDisplayTitle(catKey) {
  if (isAr) {
    var card = _qcatFindCatCard(catKey);
    if (card) {
      var ar = card.getAttribute('data-cat-ar');
      if (ar) return ar;
    }
    if (typeof RizqCategories !== 'undefined') {
      var c = RizqCategories.getByKey(catKey);
      if (c) return c.nameAr;
    }
    return catKey;
  }
  if (QCAT_KEYS_FR[catKey]) return QCAT_KEYS_FR[catKey];
  if (typeof RizqCategories !== 'undefined') {
    var c2 = RizqCategories.getByKey(catKey);
    if (c2) return c2.nameFr;
  }
  return catKey;
}

function rebuildSearchCatSelect() {
  var sel = document.getElementById('hero-search-cat-select') || document.querySelector('.search-cat-select');
  if (!sel) return;
  var allLabel = isAr ? 'كل الأقسام' : 'Toutes catégories';
  var prev = sel.value;
  var html = '<option value="">' + allLabel + '</option>';
  if (typeof RizqCategories !== 'undefined' && RizqCategories.BUILTIN) {
    RizqCategories.BUILTIN.forEach(function (c) {
      var label = isAr ? c.nameAr : c.nameFr;
      html += '<option value="' + String(c.key).replace(/"/g, '&quot;') + '">' + c.icon + ' ' + label + '</option>';
    });
  }
  sel.innerHTML = html;
  if (prev) sel.value = prev;
  sel.setAttribute('aria-label', isAr ? 'القسم' : 'Catégorie');
}
rebuildSearchCatSelect();

let qcatInlinePanel = null;
let qcatTimer = null;
let activeQcat = null;
let qcatPinned = null;
let _qcatHoverOpenTimer = null;

function positionQcatInlineArrow(el) {
  if (!qcatInlinePanel || !el) return;
  var arrow = qcatInlinePanel.querySelector('#qcat-iep-arrow');
  if (!arrow) return;
  var panelRect = qcatInlinePanel.getBoundingClientRect();
  var elRect = el.getBoundingClientRect();
  if (!panelRect.width) return;
  /* Center triangle under the active chip (physical left — works in RTL too) */
  var arrowLeft = (elRect.left - panelRect.left) + (elRect.width / 2) - 16;
  arrow.style.left = Math.max(8, Math.min(arrowLeft, panelRect.width - 40)) + 'px';
}

function _qcatFindCatCard(catKey) {
  var want = QCAT_TO_CAT_CARD[catKey] || catKey;
  var cards = document.querySelectorAll('.cats-grid .cat-card');
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var ar = card.getAttribute('data-cat-ar') || (card.querySelector('.cat-name') && card.querySelector('.cat-name').textContent.trim()) || '';
    if (ar === want || ar === catKey) return card;
  }
  return null;
}

function _iepGroupsHtmlFromDrop(drop) {
  if (!drop) return '';
  var groups = drop.querySelectorAll('.drop-group');
  var groupsHtml = '';
  groups.forEach(function(g) {
    var titleAr = (g.querySelector('.drop-group-title') && g.querySelector('.drop-group-title').textContent.trim()) || '';
    var titleDisp = isAr ? titleAr : ((window._subFR && window._subFR[titleAr]) || titleAr);
    var linksHtml = Array.prototype.map.call(g.querySelectorAll('.drop-link'), function(l) {
      var ar = l.textContent.trim();
      var fr = (window._subFR && window._subFR[ar]) || ar;
      var disp = isAr ? ar : fr;
      return '<a class="iep-link" href="#" data-ar="' + ar.replace(/"/g, '&quot;') + '" data-fr="' + String(fr).replace(/"/g, '&quot;') + '">' + disp + '</a>';
    }).join('');
    groupsHtml += '<div><div class="iep-group-title">' + titleDisp + '</div>' + linksHtml + '</div>';
  });
  return groupsHtml;
}

function _iepGroupsHtmlFromFlatSubs(subs, arSubs) {
  /* Chunk flat sub lists into columns (~3 links) — same density as cat-inline groups */
  var COL = 3;
  var html = '';
  for (var i = 0; i < subs.length; i += COL) {
    var chunk = subs.slice(i, i + COL);
    var links = chunk.map(function(s, j) {
      var ar = arSubs[i + j] || s;
      return '<a class="iep-link" href="#" data-ar="' + String(ar).replace(/"/g, '&quot;') + '">' + s + '</a>';
    }).join('');
    html += '<div>' + links + '</div>';
  }
  return html;
}

function openQcatPortal(el) {
  if (!qcatInlinePanel) qcatInlinePanel = document.getElementById('qcat-inline-panel');
  if (!qcatInlinePanel || !el) return;
  clearTimeout(qcatTimer);
  var catKey = el.dataset.qcat;
  var data = isAr ? QCAT_DATA[catKey] : QCAT_DATA_FR[catKey];
  if (!data && !QCAT_DATA[catKey]) return;
  if (!data) data = QCAT_DATA[catKey];

  document.querySelectorAll('.qcat.qcat-open').forEach(function(q){ q.classList.remove('qcat-open'); });
  activeQcat = el;
  el.classList.add('qcat-open');
  el._qcatOpenedAt = Date.now();

  var title = _qcatDisplayTitle(catKey);
  var arSubs = (QCAT_DATA[catKey] || data).subs || [];
  var viewAllHref = 'rizq_browse.html?cat=' + encodeURIComponent(catKey);
  /* Compact CTA — category already in .iep-title (same density as كل الأقسام) */
  var viewAllLabel = isAr ? '📂 كل الإعلانات ←' : '📂 Toutes les annonces →';

  var catCard = _qcatFindCatCard(catKey);
  var groupsHtml = '';
  if (catCard) {
    groupsHtml = _iepGroupsHtmlFromDrop(catCard.querySelector('.cat-drop'));
  }
  if (!groupsHtml) {
    var dispSubs = (isAr ? (QCAT_DATA[catKey] && QCAT_DATA[catKey].subs) : (data && data.subs)) || arSubs;
    groupsHtml = _iepGroupsHtmlFromFlatSubs(dispSubs, arSubs);
  }

  qcatInlinePanel.innerHTML =
    '<div class="iep-arrow" id="qcat-iep-arrow"></div>'
    + '<div class="iep-header">'
    +   '<div class="iep-title">' + (data.icon || '') + ' ' + title + '</div>'
    +   '<div class="iep-actions">'
    +     '<a class="iep-viewall" href="' + viewAllHref + '">' + viewAllLabel + '</a>'
    +     '<button class="iep-close" onclick="closeQcatPortal(true)">✕</button>'
    +   '</div>'
    + '</div>'
    + '<div class="iep-groups">' + (groupsHtml || '<p class="iep-empty">—</p>') + '</div>';

  qcatInlinePanel.querySelectorAll('.iep-link').forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      window.location.href = 'rizq_browse.html?cat=' + encodeURIComponent(catKey) + '&sub=' + encodeURIComponent(link.dataset.ar || link.textContent.trim());
    });
  });

  qcatInlinePanel.classList.toggle('pinned', qcatPinned === el);
  qcatInlinePanel.style.display = 'block';
  qcatInlinePanel.classList.remove('visible', 'closing');
  void qcatInlinePanel.offsetWidth;
  qcatInlinePanel.classList.add('visible');
  positionQcatInlineArrow(el);
  requestAnimationFrame(function(){ positionQcatInlineArrow(el); });

  try {
    if (window.matchMedia('(max-width:768px)').matches) {
      setTimeout(function(){ qcatInlinePanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 80);
    }
  } catch (eS) {}
}

function scheduleQcatOpen(el) {
  try { if (window.matchMedia('(max-width:768px)').matches) return; } catch (eM) {}
  if (qcatPinned && qcatPinned !== el) return;
  clearTimeout(_qcatHoverOpenTimer);
  _qcatHoverOpenTimer = setTimeout(function(){ openQcatPortal(el); }, 160);
}
function cancelQcatOpen() { clearTimeout(_qcatHoverOpenTimer); }

function scheduleQcatClose() {
  qcatTimer = setTimeout(function(){
    if (qcatPinned) return;
    if (qcatInlinePanel && qcatInlinePanel.matches(':hover')) return;
    closeQcatPortal(false);
  }, 280);
}
function clearQcatClose() { clearTimeout(qcatTimer); }
function closeQcatPortal(force) {
  if (qcatPinned && !force) return;
  if (!qcatInlinePanel) qcatInlinePanel = document.getElementById('qcat-inline-panel');
  var panel = qcatInlinePanel;
  var closingFor = activeQcat;
  function afterHide() {
    if (panel && !panel.classList.contains('visible')) {
      panel.innerHTML = '';
    }
    if (activeQcat === closingFor || !activeQcat) {
      document.querySelectorAll('.qcat.qcat-open').forEach(function(q){ q.classList.remove('qcat-open'); });
      activeQcat = null;
      qcatPinned = null;
    }
  }
  if (panel && typeof window.rizqAnimatePanelClose === 'function') {
    window.rizqAnimatePanelClose(panel, afterHide);
  } else {
    if (panel) {
      panel.style.display = 'none';
      panel.classList.remove('visible', 'pinned', 'closing');
      panel.innerHTML = '';
    }
    afterHide();
  }
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.qcat') && !e.target.closest('#qcat-inline-panel')) closeQcatPortal(true);
});
window.addEventListener('resize', function () {
  if (activeQcat && qcatInlinePanel && qcatInlinePanel.style.display === 'block') positionQcatInlineArrow(activeQcat);
});
window.addEventListener('scroll', function () {
  if (activeQcat && qcatInlinePanel && qcatInlinePanel.style.display === 'block') positionQcatInlineArrow(activeQcat);
}, { passive: true });
function qcatBrowseAll() {
  var catKey = activeQcat ? activeQcat.dataset.qcat : '';
  closeQcatPortal(true);
  if (catKey) window.location.href = 'rizq_browse.html?cat=' + encodeURIComponent(catKey);
  else document.getElementById('categories').scrollIntoView({behavior:'smooth'});
}

// ── الانتقال إلى صفحة العرض التفصيلي الكاملة (rizq_browse.html) عند الضغط على إعلان ──
// لماذا: نافذة #ad-modal overlay محدودة بالتصميم، بينما rizq_browse.html صفحة كاملة فيها
// شبكة مواصفات بالأيقونات + خريطة + عداد مشاهدات + رقم مرجعي + بطاقة بائع — وهذا ما طلبه المستخدم
// بدل النافذة. نمرّر بيانات الإعلان كاملة عبر localStorage['rizq_active_ad'] (يقرأها loadAdFromURL
// هناك) + ?id= في الرابط، حتى تُعرض المواصفات/الوسوم الحقيقية بدل محتوى تجريبي ثابت.
function goToListing(a) {
  if (!a) return;
  try {
    if (window.RizqAdCards && typeof RizqAdCards.markViewed === 'function') RizqAdCards.markViewed(a.id);
    else if (typeof window.rizqMarkAdViewed === 'function') window.rizqMarkAdViewed(a.id);
  } catch (eView) {}
  try {
    if(typeof rizqFeedStyleSeed === 'function'){
      rizqFeedStyleSeed({
        id: a.id,
        title: a.title,
        titleFR: a.titleFR || a.titleFr || '',
        desc: a.desc || '',
        emoji: a.emoji,
        cat: a.cat,
        catKey: a.catKey,
        images: Array.isArray(a.images) ? a.images : [],
        bg: a.bg,
        href: 'rizq_browse.html?id=' + encodeURIComponent(a.id)
      });
    }
  } catch(eFeed) {}
  const verified = /موثّق|Vérifié/.test(a.status || '') || !!a.verified;
  const imgs = Array.isArray(a.images) ? a.images.filter(Boolean) : [];
  const handoff = {
    id: a.id, title: a.title, titleFr: a.titleFR || a.titleFr || '', desc: a.desc, descFr: a.descFR || a.descFr || '',
    price: a.price, loc: a.loc, locFr: a.locFR || a.locFr || '', emoji: a.emoji, bg: a.bg || '', cat: a.cat, catKey: a.catKey,
    tags: a.tags || [], tagsFr: a.tagsFR || a.tagsFr || [], seller: a.seller, sellerFr: a.sellerFR || a.sellerFr || '',
    phone: a.phone || '', verified, images: imgs,
    wilaya: a.wilaya || '', subcat: a.subcat || '', accountId: a.accountId || ''
  };
  try { localStorage.setItem('rizq_active_ad', JSON.stringify(handoff)); } catch (e) {}
  /* صفحة التصفح المطوّرة (شبكة + لوحة تفاصيل) — لا rizq_listing القديمة */
  window.location.href = 'rizq_browse.html?id=' + encodeURIComponent(a.id);
}
// ── AD MODAL (Featured + Carousel) — أصبحت تُحوِّل لصفحة العرض الكاملة بدل فتح نافذة ──
function openAdModal(idOrIdx) {
  /* Always resolve by stable ad id — never by array index (order drifts). */
  var a = FEATURED_ADS.find(function(x){ return String(x.id) === String(idOrIdx); });
  if(!a) return;
  goToListing(a);
}
function openCarouselAdModal(idx) {
  const a = ADS[idx];
  if(!a) return;
  goToListing(a);
}
function openCarouselAdById(id) {
  var a = ADS.find(function(x){ return String(x.id) === String(id); });
  if(!a) return;
  goToListing(a);
}
function populateAdModal(a) {
  const d = trAd(a);
  function _escM(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  document.getElementById('amd-img').style.background = d.bg || '#1B3A6B';
  document.getElementById('amd-img').innerHTML = `<span style="font-size:80px">${_escM(d.emoji)}</span>${d.pin?'<div class="amd-badge">⭐ '+( isAr?'مميّز':'Vedette')+'</div>':''}`;
  document.getElementById('amd-cat').textContent = d.cat;
  const locEl = document.getElementById('amd-loc');
  if (locEl) locEl.textContent = d.loc || '';
  document.getElementById('amd-title').textContent = d.title;
  document.getElementById('amd-desc').textContent = d.desc;
  document.getElementById('amd-tags').innerHTML = (d.tags||[]).map(t=>`<span class="amd-tag">${_escM(t)}</span>`).join('');
  document.getElementById('amd-price').textContent = d.price;
  document.getElementById('amd-status').textContent = d.status;
  document.getElementById('amd-seller-av').textContent = d.sellerEmoji||'👤';
  document.getElementById('amd-seller-name').textContent = d.seller;
  document.getElementById('amd-seller-meta').textContent = d.sellerMeta;
  const callTxt = document.getElementById('amd-btn-call-txt');
  const msgTxt = document.getElementById('amd-btn-msg-txt');
  if (callTxt) callTxt.textContent = isAr ? 'اتصال' : 'Appeler';
  if (msgTxt) msgTxt.textContent = isAr ? 'واتساب' : 'WhatsApp';
  const shareTxt = document.getElementById('amd-btn-share-txt');
  if (shareTxt) shareTxt.textContent = isAr ? 'مشاركة' : 'Partager';
  const askTitle = document.getElementById('amd-ask-title');
  if (askTitle) askTitle.textContent = isAr ? '💬 اسأل عن هذا الإعلان' : '💬 Posez une question';
  const askInput = document.getElementById('amd-ask-input');
  if (askInput) { askInput.placeholder = isAr ? 'اكتب سؤالك للبائع...' : 'Écrivez votre question...'; askInput.value=''; }
  const askSendTxt = document.getElementById('amd-ask-send-txt');
  if (askSendTxt) askSendTxt.textContent = isAr ? 'إرسال' : 'Envoyer';
  currentAdRef = a;
  updateFavBtnUI();
  renderRelatedAds(a);
  const modal = document.getElementById('ad-modal');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  const box = document.getElementById('ad-modal-box');
  if (box) box.scrollTop = 0;
}
function callSeller(){
  if(!currentAdRef){ alert(isAr?'رقم البائع غير متوفر':'Numéro vendeur indisponible'); return; }
  if(currentAdRef.contactsLocked || !currentAdRef.phone){
    if(window.RizqContactGate && currentAdRef.accountId){
      RizqContactGate.onMaskedContactClick(currentAdRef.accountId, 'individual', { lang: isAr ? 'ar' : 'fr' });
    } else { alert(isAr?'بيانات التواصل مخفية — يلزم اشتراك مدفوع':'Coordonnées masquées — abonnement requis'); }
    return;
  }
  window.location.href = 'tel:'+String(currentAdRef.phone).replace(/\s/g,'');
}
function waSeller(){
  const msg = isAr ? 'مرحباً، رأيت إعلانك على رزق' : 'Bonjour, j\'ai vu votre annonce sur Rizq';
  if(!currentAdRef){ alert(isAr?'رقم البائع غير متوفر':'Numéro vendeur indisponible'); return; }
  if(currentAdRef.contactsLocked || !currentAdRef.phone){
    if(window.RizqContactGate && currentAdRef.accountId){
      RizqContactGate.onMaskedContactClick(currentAdRef.accountId, 'individual', { lang: isAr ? 'ar' : 'fr' });
    } else { alert(isAr?'بيانات التواصل مخفية — يلزم اشتراك مدفوع':'Coordonnées masquées — abonnement requis'); }
    return;
  }
  window.open('https://wa.me/'+String(currentAdRef.phone).replace(/[^\d]/g,'')+'?text=' + encodeURIComponent(msg), '_blank');
}

// ── المفضلة / المشاركة / اسأل البائع — تجعل نافذة الإعلان "حيّة" ──
let currentAdRef = null;
// ── مفضلة موحّدة (rizq_wishlist) — نفس المفتاح في browse/search/listing/dashboard ──
function _wishlistIds(){ try{ var v=JSON.parse(localStorage.getItem('rizq_wishlist')||'[]'); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
function _wishlistHas(id){ return _wishlistIds().indexOf(String(id))!==-1; }
function _wishlistToggle(id, opts){
  // المفضلة تتطلب حساب زائر/أعمال — لا تُحفظ لزائر مجهول
  if (window.RizqUx && typeof RizqUx.wishlistToggle === 'function') {
    return RizqUx.wishlistToggle(id, opts);
  }
  if (window.RizqUx && typeof RizqUx.hasWishlistAccount === 'function' && !RizqUx.hasWishlistAccount()) {
    if (typeof RizqUx.requireWishlistAuth === 'function') {
      RizqUx.requireWishlistAuth(function () { _wishlistToggle(id, opts); });
    } else if (typeof rizqRequireAuth === 'function') {
      rizqRequireAuth(function () { _wishlistToggle(id, opts); }, 'reasonFav');
    }
    return false;
  }
  var sid=String(id);
  var ids=_wishlistIds();
  var i=ids.indexOf(sid);
  if(i!==-1) ids.splice(i,1); else ids.push(sid);
  try{ localStorage.setItem('rizq_wishlist', JSON.stringify(ids)); }catch(e){}
  return i===-1;
}
function getFavorites(){ return _wishlistIds(); }
function isFavorited(id){ return _wishlistHas(id); }
function toggleFavoriteAd(){
  if(!currentAdRef || currentAdRef.id==null) return;
  _wishlistToggle(currentAdRef.id, {
    afterAuthToast: false,
    onDone: function (added) {
      updateFavBtnUI();
      if(window.RizqUx&&typeof RizqUx.toastFav==='function') RizqUx.toastFav(!!added);
      if(window.RizqUx&&typeof RizqUx.updateFavBadges==='function') RizqUx.updateFavBadges();
    }
  });
}
function updateFavBtnUI(){
  if(!currentAdRef) return;
  const on = isFavorited(currentAdRef.id);
  const btn = document.getElementById('amd-btn-fav');
  const icon = document.getElementById('amd-btn-fav-icon');
  const txt = document.getElementById('amd-btn-fav-txt');
  if(btn) btn.classList.toggle('active', on);
  if(icon) icon.textContent = on ? '❤️' : '🤍';
  if(txt) txt.textContent = on ? (isAr?'في المفضلة':'Dans les favoris') : (isAr?'أضف للمفضلة':'Ajouter aux favoris');
}
function shareAd(){
  if(!currentAdRef) return;
  const d = trAd(currentAdRef);
  const text = `${d.title} — ${d.price} — رزق Rizq`;
  const full = text+' '+location.href;
  function _ok(){ if(typeof showToast==='function') showToast(isAr?'تم نسخ رابط الإعلان':'Lien copié'); else alert(isAr?'تم نسخ رابط الإعلان':'Lien copié'); }
  function _promptFallback(){ prompt(isAr?'انسخ الرابط:':'Copiez le lien :', full); }
  if(navigator.share){
    navigator.share({title:d.title, text, url:location.href}).catch(()=>{});
  } else if(navigator.clipboard && window.isSecureContext){
    // إصلاح: كان بدون .catch() — إذا رفض المتصفح النسخ (شائع على file:// أو
    // بدون HTTPS) كان الزر يفشل بصمت تام دون أي رد فعل مرئي للمستخدم.
    navigator.clipboard.writeText(full).then(_ok).catch(_promptFallback);
  } else {
    _promptFallback();
  }
}
function askSeller(){
  const input = document.getElementById('amd-ask-input');
  const q = input ? input.value.trim() : '';
  if(!q || !currentAdRef) return;
  const d = trAd(currentAdRef);
  const msg = isAr ? `مرحباً، بخصوص إعلانك "${d.title}": ${q}` : `Bonjour, à propos de votre annonce "${d.title}" : ${q}`;
  if(!currentAdRef||!currentAdRef.phone){ alert(isAr?'رقم البائع غير متوفر':'Numéro vendeur indisponible'); return; } window.open('https://wa.me/'+String(currentAdRef.phone).replace(/[^\d]/g,'')+'?text=' + encodeURIComponent(msg), '_blank');
  input.value='';
}

// ── RELATED ADS ENGINE — every closed ad keeps the visitor browsing ──
function buildRelatedAds(current) {
  const pool = ALL_ADS_DATA.filter(x => x.title !== current.title);
  const sameSeller = pool.filter(x => current.seller && x.seller === current.seller);
  const sameCat = pool.filter(x => current.catKey && x.catKey === current.catKey && x.seller !== current.seller);
  const others = pool.filter(x => !sameSeller.includes(x) && !sameCat.includes(x));
  const combined = [...sameSeller, ...sameCat, ...others].slice(0, 4);
  return combined.map(x => ({ ad: x, sameSeller: x.seller === current.seller }));
}
function renderRelatedAds(current) {
  const wrap = document.getElementById('amd-related');
  if (!wrap) return;
  const entries = buildRelatedAds(current);
  if (!entries.length) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
  wrap.style.display = 'block';
  const title = isAr ? '✨ قد يهمك أيضاً — استمر في التصفح' : '✨ Vous aimerez aussi';
  wrap.innerHTML = `<div class="amd-related-title">${escapeHtml(title)}</div>
    <div class="amd-related-grid">
      ${entries.map(({ad:x,sameSeller:ss})=>{
        const xd = trAd(x);
        const badge = ss ? (isAr?'🔥 نفس البائع':'🔥 Même vendeur') : (isAr?'📂 نفس الفئة':'📂 Même catégorie');
        const safeId = String(x.id == null ? '' : x.id).replace(/[^a-zA-Z0-9_-]/g, '');
        const bg = String(xd.bg || '').replace(/[<>"']/g, '');
        return `<div class="amd-rel-card" onclick="openAdById('${safeId}')">
          <div class="amd-rel-img" style="background:${escapeHtml(bg)}"><span>${escapeHtml(xd.emoji||'')}</span><span class="amd-rel-badge">${escapeHtml(badge)}</span></div>
          <div class="amd-rel-body">
            <div class="amd-rel-title">${escapeHtml(xd.title||'')}</div>
            <div class="amd-rel-price">${escapeHtml(xd.price||'')}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}
function closeAdModal() {
  document.getElementById('ad-modal').classList.remove('open');
  document.body.style.overflow = '';
}

// ── ALL ADS MODAL ──
const ALL_ADS_DATA = [];
// ترحيل لمرة واحدة: rizq_favs (بالعنوان) → rizq_wishlist (بمعرّف الإعلان)
(function _migrateLegacyFavs(){
  try{
    var old=JSON.parse(localStorage.getItem('rizq_favs')||'[]');
    if(!Array.isArray(old)||!old.length){ localStorage.removeItem('rizq_favs'); return; }
    var ids=_wishlistIds(), changed=false;
    old.forEach(function(title){
      var ad=ALL_ADS_DATA.find(function(a){ return a.title===title; });
      if(ad&&ad.id!=null){
        var sid=String(ad.id);
        if(ids.indexOf(sid)===-1){ ids.push(sid); changed=true; }
      }
    });
    if(changed) localStorage.setItem('rizq_wishlist', JSON.stringify(ids));
    localStorage.removeItem('rizq_favs');
  }catch(e){}
})();
function openAdById(id) {
  var a = ALL_ADS_DATA.find(function(x){ return String(x.id) === String(id); });
  if (!a) a = FEATURED_ADS.find(function(x){ return String(x.id) === String(id); });
  if (!a) a = (typeof ADS !== 'undefined' ? ADS : []).find(function(x){ return String(x.id) === String(id); });
  if (!a) return;
  goToListing(a);
}
function openAdByGlobalIndex(idx) {
  /* Legacy: prefer id lookup when idx is actually an id; else array slot */
  var a = ALL_ADS_DATA.find(function(x){ return String(x.id) === String(idx); });
  if (!a && typeof idx === 'number' && idx >= 0 && idx < ALL_ADS_DATA.length) a = ALL_ADS_DATA[idx];
  if (!a) return;
  goToListing(a);
}

var ALL_ADS_MODAL_MAX = 1000;
var ALL_ADS_MODAL_PAGE = 24;
var _allAdsCat = 'all';
var _allAdsQ = '';
var _allAdsVisible = ALL_ADS_MODAL_PAGE;
var _allAdsLoading = false;
var _allAdsIO = null;

function _allAdsPool(){
  var seen = {};
  var out = [];
  function add(list){
    (list || []).forEach(function(a){
      if(!a || a.id == null) return;
      var id = String(a.id);
      if(seen[id]) return;
      seen[id] = 1;
      out.push(a);
    });
  }
  if(typeof ADS !== 'undefined') add(ADS);
  if(typeof FEATURED_ADS !== 'undefined') add(FEATURED_ADS);
  if(typeof ALL_ADS_DATA !== 'undefined') add(ALL_ADS_DATA);
  if(out.length > ALL_ADS_MODAL_MAX) out = out.slice(0, ALL_ADS_MODAL_MAX);
  return out;
}
function _allAdsFiltered(){
  var pool = _allAdsPool();
  var cat = _allAdsCat || 'all';
  var q = String(_allAdsQ || '').trim().toLowerCase();
  return pool.filter(function(a){
    if(cat !== 'all'){
      var k = String(a.catKey || a.cat || '');
      if(k.indexOf(cat) < 0 && cat.indexOf(k) < 0) return false;
    }
    if(q){
      var blob = [a.title, a.titleFR, a.desc, a.cat, a.catKey, a.loc, a.price].join(' ').toLowerCase();
      if(blob.indexOf(q) < 0) return false;
    }
    return true;
  });
}
function _aamEsc(s){
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _aamCardHtml(a, fr){
  var d = typeof trAd === 'function' ? trAd(a) : a;
  var idJs = String(a.id).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  var pin = !!d.pin || !!a.boosted;
  var fav = typeof isFavorited === 'function' ? isFavorited(a.id) : false;
  var photo = typeof _adPhotoHtml === 'function' ? _adPhotoHtml(a, d, 148) : ('<span>' + _aamEsc(d.emoji || '📦') + '</span>');
  var desc = String(d.desc || '').slice(0, 78);
  return ''
    + '<article class="aam-card' + (pin ? ' is-pin' : '') + '" role="listitem" data-ad-id="' + _aamEsc(a.id) + '" onclick="openAdById(\'' + idJs + '\')">'
    + (pin ? ('<span class="aam-badge">⭐ ' + (fr ? 'Vedette' : 'مميز') + '</span>') : '')
    + '<button type="button" class="aam-fav" onclick="event.stopPropagation();quickToggleFavorite(\'' + idJs + '\',this)" aria-label="favorite">' + (fav ? '❤️' : '🤍') + '</button>'
    + '<div class="aam-thumb" style="background:' + _aamEsc(d.bg || 'linear-gradient(145deg,#1B3A6B,#0f2347)') + '">' + photo + '</div>'
    + '<div class="aam-body">'
    +   '<div class="aam-cat">' + _aamEsc(d.cat || '') + '</div>'
    +   '<div class="aam-title">' + _aamEsc(d.title || '') + '</div>'
    +   (desc ? ('<div class="aam-desc">' + _aamEsc(desc) + (String(d.desc||'').length > 78 ? '…' : '') + '</div>') : '')
    +   '<div class="aam-meta"><span class="aam-price">' + _aamEsc(d.price || '') + '</span><span class="aam-loc">' + _aamEsc(d.loc || '') + '</span></div>'
    + '</div></article>';
}
function _allAdsBindInfinite(){
  if(_allAdsIO){ try{ _allAdsIO.disconnect(); }catch(e){} _allAdsIO = null; }
  var sentinel = document.getElementById('all-ads-sentinel');
  var root = document.getElementById('all-ads-scroll');
  if(!sentinel || !root || typeof IntersectionObserver === 'undefined') return;
  _allAdsIO = new IntersectionObserver(function(entries){
    if(!entries[0] || !entries[0].isIntersecting) return;
    loadMoreAllAds();
  }, { root: root, rootMargin: '120px', threshold: 0.01 });
  _allAdsIO.observe(sentinel);
}
function openAllAds() {
  const modal = document.getElementById('all-ads-modal');
  if(!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  _allAdsCat = 'all';
  _allAdsQ = '';
  _allAdsVisible = ALL_ADS_MODAL_PAGE;
  var qEl = document.getElementById('all-ads-q');
  if(qEl) qEl.value = '';
  try { if(typeof refreshAllAdsIndex === 'function') refreshAllAdsIndex(); } catch(e){}
  var fr = typeof isAr !== 'undefined' && !isAr;
  var title = document.getElementById('all-ads-title');
  var tag = document.getElementById('all-ads-tag');
  var browse = document.getElementById('all-ads-browse-link');
  if(title) title.innerHTML = fr ? 'Toutes les <span>annonces</span>' : 'كل <span>الإعلانات</span>';
  if(tag) tag.textContent = fr ? 'Toutes les annonces' : 'كل الإعلانات';
  if(browse) browse.textContent = fr ? '📂 Page Annonces complète' : '📂 صفحة الإعلانات الكاملة';
  if(qEl) qEl.placeholder = fr ? 'Rechercher dans les annonces…' : 'ابحث في الإعلانات…';
  var labels = fr
    ? {all:'Tout',عقارات:'Immobilier',سيارات:'Voitures',إلكترونيات:'Électronique',أزياء:'Mode',ماشية:'Bétail',شاحنات:'Camions',خدمات:'Services'}
    : {all:'الكل',عقارات:'عقارات',سيارات:'سيارات',إلكترونيات:'إلكترونيات',أزياء:'موضة',ماشية:'ماشية',شاحنات:'شاحنات',خدمات:'خدمات'};
  document.querySelectorAll('.all-ads-filter').forEach(function(f){
    var c = f.getAttribute('data-aam-cat') || 'all';
    if(labels[c]) f.textContent = labels[c];
    var on = c === 'all';
    f.classList.toggle('active', on);
    f.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  renderAllAds(true);
}
function closeAllAds() {
  var modal = document.getElementById('all-ads-modal');
  if(modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  if(_allAdsIO){ try{ _allAdsIO.disconnect(); }catch(e){} _allAdsIO = null; }
}
function filterAllAds(cat, btn) {
  _allAdsCat = cat || 'all';
  _allAdsVisible = ALL_ADS_MODAL_PAGE;
  document.querySelectorAll('.all-ads-filter').forEach(function(b){
    var on = b === btn || b.getAttribute('data-aam-cat') === _allAdsCat;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  renderAllAds(false);
  var scroll = document.getElementById('all-ads-scroll');
  if(scroll) scroll.scrollTop = 0;
}
function searchAllAds(q){
  _allAdsQ = q || '';
  _allAdsVisible = ALL_ADS_MODAL_PAGE;
  renderAllAds(false);
}
function loadMoreAllAds(){
  if(_allAdsLoading) return false;
  var filtered = _allAdsFiltered();
  if(_allAdsVisible >= filtered.length) return false;
  _allAdsLoading = true;
  _allAdsVisible = Math.min(_allAdsVisible + ALL_ADS_MODAL_PAGE, filtered.length, ALL_ADS_MODAL_MAX);
  renderAllAds(false);
  setTimeout(function(){ _allAdsLoading = false; }, 140);
  return true;
}
function renderAllAds(resetVisible) {
  const grid = document.getElementById('all-ads-grid');
  if(!grid) return;
  if(resetVisible) _allAdsVisible = ALL_ADS_MODAL_PAGE;
  var fr = typeof isAr !== 'undefined' && !isAr;
  var filtered = _allAdsFiltered();
  var total = Math.min(filtered.length, ALL_ADS_MODAL_MAX);
  if(_allAdsVisible < ALL_ADS_MODAL_PAGE) _allAdsVisible = ALL_ADS_MODAL_PAGE;
  if(_allAdsVisible > total) _allAdsVisible = Math.max(total, 0);
  var items = filtered.slice(0, _allAdsVisible);

  const countEl = document.getElementById('all-ads-count');
  if(countEl){
    if(!total){
      countEl.textContent = fr ? 'Aucune annonce' : 'لا توجد إعلانات';
    } else {
      countEl.textContent = fr
        ? ('Affichage ' + items.length + ' / ' + total + (filtered.length >= ALL_ADS_MODAL_MAX ? '+' : '') + ' annonces')
        : ('عرض ' + items.length + ' من ' + total + (filtered.length >= ALL_ADS_MODAL_MAX ? '+' : '') + ' إعلان');
    }
  }

  if(!items.length){
    if(window.RizqUx && typeof RizqUx.emptyStateHtml === 'function'){
      grid.innerHTML = RizqUx.emptyStateHtml({
        title: fr ? 'Aucune annonce dans cette catégorie' : 'لا توجد إعلانات في هذا القسم',
        primaryHref: 'rizq_post.html'
      });
    } else {
      grid.innerHTML = '<div class="all-ads-empty">' + (fr ? 'Aucune annonce dans cette catégorie' : 'لا توجد إعلانات في هذا القسم') + '</div>';
    }
    if(_allAdsIO){ try{ _allAdsIO.disconnect(); }catch(e){} _allAdsIO = null; }
    return;
  }

  var moreHtml = '';
  if(items.length >= total){
    moreHtml = '<div class="all-ads-more is-done"><span class="all-ads-more-lbl">'
      + (fr ? ('Fin — ' + total + ' annonces') : ('تم عرض كل الإعلانات الظاهرة — ' + total))
      + '</span></div>';
  } else {
    moreHtml = '<div class="all-ads-more" id="all-ads-sentinel">'
      + '<span class="all-ads-more-lbl">'
      + (fr ? ('Affichage ' + items.length + ' / ' + total + ' — continuez à défiler') : ('عرض ' + items.length + ' من ' + total + ' — مرّر للمزيد'))
      + '</span>'
      + '<button type="button" class="all-ads-more-btn" onclick="loadMoreAllAds()">'
      + (fr ? 'Charger plus' : 'تحميل المزيد')
      + '</button></div>';
  }
  grid.innerHTML = items.map(function(a){ return _aamCardHtml(a, fr); }).join('') + moreHtml;
  _allAdsBindInfinite();
}
function quickToggleFavorite(adId, btn) {
  _wishlistToggle(adId, {
    afterAuthToast: false,
    onDone: function (added) {
      if (btn) btn.textContent = added ? '❤️' : '🤍';
      if (currentAdRef && String(currentAdRef.id) === String(adId)) updateFavBtnUI();
      if(window.RizqUx&&typeof RizqUx.toastFav==='function') RizqUx.toastFav(!!added);
      if(window.RizqUx&&typeof RizqUx.updateFavBadges==='function') RizqUx.updateFavBadges();
    }
  });
}

// ── SEARCH SUGGESTIONS — from live ADS, not dummy queries ──
function showSugg(v){
  const box=document.getElementById('suggestions');
  if(!box) return;
  if(!v||v.length<1){box.style.display='none';return;}
  const q=v.toLowerCase();
  const res=(ADS||[]).filter(function(s){
    return String(s.title||'').toLowerCase().indexOf(q)>=0 || String(s.cat||'').toLowerCase().indexOf(q)>=0;
  }).slice(0,5);
  box.replaceChildren();
  if(!res.length){
    var empty=document.createElement('div');
    empty.className='sugg-item';
    empty.style.cursor='default';
    empty.style.color='#6a7a8a';
    empty.textContent=(typeof isAr!=='undefined'&&!isAr?'Aucun résultat':'لا توجد نتائج');
    box.appendChild(empty);
  } else {
    res.forEach(function(s){
      var row=document.createElement('div');
      row.className='sugg-item';
      row.addEventListener('click', function(){
        var inp=document.getElementById('hero-search');
        if(inp) inp.value=String(s.title||'');
        doMainSearch();
      });
      var ico=document.createElement('span');
      ico.className='sugg-icon';
      ico.textContent=s.emoji||'📦';
      var ttl=document.createElement('span');
      ttl.textContent=s.title||'';
      var pr=document.createElement('span');
      pr.className='sugg-price';
      pr.textContent=s.price||'';
      row.appendChild(ico); row.appendChild(ttl); row.appendChild(pr);
      box.appendChild(row);
    });
  }
  box.style.display='block';
}
function hideSugg(){var box=document.getElementById('suggestions'); if(box) box.style.display='none';}

function mapApiAdToHero(a){
  var raw = String(a.price||'').replace(/[^\d]/g,'');
  var price = raw ? (Number(raw).toLocaleString('en-US')+' MRU') : (a.price||'');
  var images = Array.isArray(a.images) ? a.images.filter(Boolean) : [];
  return {
    id: a.id,
    title: a.title || '',
    titleFR: a.titleFr || a.title || '',
    desc: a.desc || '',
    descFR: a.descFr || a.desc || '',
    cat: a.categoryLabel || a.category || '',
    catKey: a.category || '',
    loc: a.wilaya ? ('📍 '+a.wilaya) : '',
    locFR: a.wilaya || '',
    price: price,
    priceFR: price,
    emoji: a.emoji || '📦',
    bg: 'linear-gradient(135deg,#1B3A6B,#0f2347)',
    pin: !!a.boosted,
    seller: a.seller || '',
    status: a.status || '',
    images: images
  };
}
function _adPhotoHtml(a, d, h){
  h = h || 130;
  var src = (a && Array.isArray(a.images) && a.images[0]) ? String(a.images[0]) : '';
  if(window.RizqStoreCommerce && typeof RizqStoreCommerce.safeMediaUrl === 'function'){
    src = RizqStoreCommerce.safeMediaUrl(src) || '';
  } else {
    var raw = String(src||'').trim();
    if(!raw || /[\s<>"']/.test(raw) || /javascript:/i.test(raw)) src = '';
    else if(!(/^https?:\/\//i.test(raw) || raw.charAt(0)==='/' || /^data:image\//i.test(raw))) src = '';
    else src = raw;
  }
  var esc = function(s){ return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); };
  if(src){
    return '<div class="rizq-img-wrap" style="width:100%;height:'+h+'px"><img src="'+esc(src)+'" alt="'+esc(d&&d.title||'')+'" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;display:block" onload="var w=this.closest(\'.rizq-img-wrap\');if(w)w.classList.add(\'loaded\')"></div>';
  }
  return '<span>'+(d&&d.emoji?d.emoji:'📦')+'</span>';
}

/* لا تعرض ثقة/نجوم وهمية من مخزون الديمو الثابت */
(function(){
  function scrubTrust(list){
    if(!Array.isArray(list)) return;
    list.forEach(function(a){
      if(!a || typeof a !== 'object') return;
      if(a.sellerMeta) a.sellerMeta = '';
      if(a.sellerMetaFR) a.sellerMetaFR = '';
      if(a.status && /موثّق|Vérifié|شركة موثّقة|Entreprise/.test(String(a.status))) {
        a.status = '';
        a.statusFR = '';
      }
      a.verified = false;
      a.seller_trust_score = null;
      a.reviewCount = 0;
    });
  }
  if(typeof ADS !== 'undefined') scrubTrust(ADS);
  if(typeof FEATURED_ADS !== 'undefined') scrubTrust(FEATURED_ADS);
})();

function refreshAllAdsIndex(){
  ALL_ADS_DATA.length = 0;
  ADS.forEach(function(a){ ALL_ADS_DATA.push(a); });
  FEATURED_ADS.forEach(function(a){
    ALL_ADS_DATA.push(Object.assign({}, a, { catKey: a.catKey || (a.cat||'').split(' ')[1] || '' }));
  });
}
/* شريط تحت الهيدر = خدمة عامة (rizq_civic_ticker.js) — لا تملأه بعناوين الإعلانات.
   شريط «مباشر» أسفل يبقى لأحدث الإعلانات. */
function renderTickerFromAds(){
  if (window.RizqCivicTicker) {
    try {
      var list = typeof RizqCivicTicker.getAll === 'function' ? RizqCivicTicker.getAll() : [];
      if (typeof RizqCivicTicker.render === 'function') RizqCivicTicker.render(list && list.length ? list : RizqCivicTicker.FALLBACK || []);
    } catch (e) {}
  }
}
function applyCatCountsFromAds(){
  var counts = {};
  ADS.forEach(function(a){
    var k = a.catKey || a.cat || '';
    if(!k) return;
    counts[k] = (counts[k]||0)+1;
  });
  document.querySelectorAll('.cat-count').forEach(function(el){
    var card = el.closest('.cat-card');
    if(card && (card.getAttribute('data-extra')==='1' || card.getAttribute('data-suggest')==='1')) return;
    var name = card && card.querySelector('.cat-name') ? card.querySelector('.cat-name').textContent.trim() : '';
    var n = 0;
    Object.keys(counts).forEach(function(k){ if(name && (k===name || name.indexOf(k)>=0 || k.indexOf(name)>=0)) n += counts[k]; });
    var fr = (typeof isAr!=='undefined' && !isAr);
    el.textContent = n ? (n.toLocaleString('en-US')+(fr?' annonces':' إعلان')) : '—';
  });
}
function hydrateLiveAds(){
  document.querySelectorAll('.cat-count').forEach(function(el){
    var card = el.closest('.cat-card');
    if(card && (card.getAttribute('data-extra')==='1' || card.getAttribute('data-suggest')==='1')) return;
    el.textContent='—';
  });
function isDemoAd(a){
  if(!a) return true;
  if(a.is_demo === true || a.isDemo === true) return true;
  var id=String(a.id||'');
  var acc=String(a.accountId||'');
  /* محتوى التخرج (graduationDemo / acc_grad_) يُحسب حياً للعرض — ليس «acc_demo» */
  return acc.indexOf('acc_demo')===0 || /^RZQ-2026-1000\d/i.test(id);
}
function applyList(list){
    ADS.length = 0;
    (list||[]).filter(function(a){
      return a && !isDemoAd(a) && (a.status==='active' || !a.status)
        && (typeof _adHasPublicTitle !== 'function' || _adHasPublicTitle(a));
    }).forEach(function(a){
      ADS.push(mapApiAdToHero(a));
    });
    /* لا إعلانات حية — أظهر نوافذ DEMO فقط ما دام launchDate فارغاً (أو ?demo=1) */
    var usingShowcase = false;
    var demoOk = (window.RizqDemo && typeof RizqDemo.inventoryAllowed === 'function')
      ? RizqDemo.inventoryAllowed()
      : !(window.RIZQ_LAUNCH && RIZQ_LAUNCH.launchDate);
    if(!ADS.length && demoOk && typeof FEATURED_ADS !== 'undefined' && FEATURED_ADS.length){
      usingShowcase = true;
      /* قدّم إعلانات الملحفة/الدراعة التجريبية أولاً لتجربة البطاقات الفاخرة */
      var fashionDemoIds = {211:1,216:1,231:1,232:1,233:1,234:1};
      var fashionFirst = [];
      var restAds = [];
      FEATURED_ADS.forEach(function(a){
        if(!a || (typeof _adHasPublicTitle === 'function' && !_adHasPublicTitle(a))) return;
        if(fashionDemoIds[a.id]) fashionFirst.push(a);
        else restAds.push(a);
      });
      fashionFirst.concat(restAds).forEach(function(a){ ADS.push(a); });
    } else if (demoOk && typeof FEATURED_ADS !== 'undefined' && FEATURED_ADS.length) {
      /* قبل الإطلاق: ادمج نوافذ DEMO مع أي إعلانات حية حتى تبقى التجريبية ظاهرة */
      var have = {};
      ADS.forEach(function(a){ if(a&&a.id!=null) have[String(a.id)] = true; });
      FEATURED_ADS.forEach(function(a){
        if(!a || a.id==null || have[String(a.id)]) return;
        if(typeof _adHasPublicTitle === 'function' && !_adHasPublicTitle(a)) return;
        ADS.push(a);
        have[String(a.id)] = true;
      });
    }
    refreshAllAdsIndex();
    /* كتالوج الموزاييك يبقى متاحاً عبر FEATURED في _styPool حتى مع إعلانات حية */
    if(typeof buildCards==='function') buildCards();
    if(typeof buildLandingAds==='function') buildLandingAds(true);
    if(typeof buildStyleIdeas==='function') buildStyleIdeas(false);
    if(typeof buildShowroomModels==='function') buildShowroomModels(false);
    if(typeof buildEstateModels==='function') buildEstateModels(false);
    if(typeof refreshLandingBrandStrips==='function') refreshLandingBrandStrips();
    var heroSec=document.getElementById('hero-listings');
    if(heroSec) heroSec.style.display=ADS.length?'':'none';
    renderTickerFromAds();
    applyCatCountsFromAds();
    if(typeof window.refreshPlatformLiveStats === 'function') window.refreshPlatformLiveStats();
    else {
      var adStat = document.querySelector('#platform-stats [data-stat="ads"] .h-stat-num');
      if(adStat){
        /* عرض التخرج: اعرض عدد البطاقات الظاهرة (حية أو showcase) — لا تُصفِّر العداد */
        var liveCount = ADS.length;
        adStat.dataset.target = String(liveCount);
        adStat.dataset.counted = '1';
        adStat.textContent = liveCount.toLocaleString('en-US');
      }
    }
  }
  applyList([]);
  var base = (window.RIZQ_BACKEND_BASE||'').replace(/\/$/,'');
  if(!base) return;
  var track = document.getElementById('cards-track');
  var heroSec = document.getElementById('hero-listings');
  var skelShownAt = Date.now();
  if(track && !ADS.length){
    if(heroSec) heroSec.style.display = '';
    var sk = '', si;
    for(si = 0; si < 5; si++){
      sk += '<div class="ad-card" style="pointer-events:none;min-width:200px">'
        + '<div class="rizq-skel rizq-skel-media" style="height:140px;border-radius:16px 16px 0 0"></div>'
        + '<div style="padding:12px;display:flex;flex-direction:column;gap:8px">'
        + '<div class="rizq-skel rizq-skel-line mid" style="margin:0"></div>'
        + '<div class="rizq-skel rizq-skel-line short" style="margin:0"></div>'
        + '</div></div>';
    }
    track.innerHTML = sk;
  }
  function finishHydrate(listOrNull){
    var wait = Math.max(0, 700 - (Date.now() - skelShownAt));
    setTimeout(function(){
      if(listOrNull) applyList(listOrNull);
      else if(typeof buildCards==='function') buildCards();
    }, wait);
  }
  fetch(base+'/api/ads?limit=1000').then(function(r){ return r.ok?r.json():null; }).then(function(data){
    if(data && data.ok && Array.isArray(data.ads)) finishHydrate(data.ads);
    else finishHydrate(null);
  }).catch(function(){ finishHydrate(null); });
}
hydrateLiveAds();
