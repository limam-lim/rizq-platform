// ── HERO SEARCH SUBMIT — يحوّل المستخدم لصفحة النتائج مع القسم المختار ونص البحث ──
const HERO_CAT_KEYS = ['', 'عقارات','سيارات','شاحنات','إلكترونيات','وظائف','ماشية','أزياء','بناء'];
function doMainSearch(){
  const input = document.getElementById('hero-search');
  const q = input ? input.value.trim() : '';
  const sel = document.querySelector('.search-cat-select');
  const catKey = sel ? (HERO_CAT_KEYS[sel.selectedIndex] || '') : '';
  hideSugg();
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (catKey) params.set('cat', catKey);
  window.location.href = 'rizq_browse.html' + (params.toString() ? '?' + params.toString() : '');
}

// ── CATEGORIES INLINE EXPAND ──
const catGrid = document.querySelector('.cats-grid');
const iepanel = document.getElementById('cat-inline-panel');

let activeCard = null;
let pinnedCard = null;
let closeTimer = null;
let currentSubCat = '';
let currentCat = '';

function _setCardActive(card, on) {
  if (!card) return;
  card.classList.toggle('open', on);
  card.classList.toggle('pinned', on && pinnedCard === card);
}

function isDeskCatPopup() {
  return false;
}

function resetCatPopupBox() {
  if (!iepanel) return;
  iepanel.style.position = '';
  iepanel.style.top = '';
  iepanel.style.left = '';
  iepanel.style.width = '';
  iepanel.style.maxWidth = '';
  iepanel.style.zIndex = '';
  iepanel.style.margin = '';
  iepanel.style.gridColumn = '';
}

function positionCatPopup(card) {
  return;
}

function openInlineExpand(card) {
  if (!card) return;
  const catNameAr = card.querySelector('.cat-name')?.textContent?.trim() || card.getAttribute('data-cat-ar') || '';
  if (!iepanel) {
    if (catNameAr) window.location.href = 'rizq_browse.html?cat=' + encodeURIComponent(catNameAr);
    return;
  }

  if (activeCard && activeCard !== card) _setCardActive(activeCard, false);
  activeCard = card;
  _setCardActive(card, true);
  iepanel.classList.toggle('pinned', pinnedCard === card);

  if (iepanel.parentElement === document.body && catGrid) catGrid.appendChild(iepanel);
  resetCatPopupBox();
  if (catGrid) {
    const allCards = [...catGrid.querySelectorAll('.cat-card')];
    const cardTop = card.offsetTop;
    let lastInRow = card;
    const cardIdx = allCards.indexOf(card);
    for (let i = cardIdx + 1; i < allCards.length; i++) {
      if (allCards[i].offsetTop === cardTop) lastInRow = allCards[i];
      else break;
    }
    lastInRow.after(iepanel);
  }

  const catIcon   = card.querySelector('.cat-icon-box')?.textContent?.trim() || '';
  const catNameDisp = (function () {
    if (isAr) return catNameAr;
    var ai = CAT_NAMES.ar.indexOf(catNameAr);
    if (ai >= 0) return CAT_NAMES.fr[ai];
    var key = card.getAttribute('data-cat-key');
    if (typeof RizqCategories !== 'undefined' && key) {
      var c = RizqCategories.getByKey(key);
      if (c) return c.nameFr;
    }
    return catNameAr;
  })();
  const viewAllHref  = 'rizq_browse.html?cat=' + encodeURIComponent(catNameAr);
  const viewAllLabel = isAr ? '📂 كل الإعلانات ←' : '📂 Toutes les annonces →';

  const drop = card.querySelector('.cat-drop');
  const groups = drop ? drop.querySelectorAll('.drop-group') : [];
  let groupsHtml = '';
  groups.forEach(g => {
    const titleAr   = g.querySelector('.drop-group-title')?.textContent?.trim() || '';
    const titleDisp = isAr ? titleAr : (window._subFR?.[titleAr] || titleAr);
    const linksHtml = [...g.querySelectorAll('.drop-link')].map(l => {
      const ar   = l.textContent.trim();
      const fr   = window._subFR?.[ar] || ar;
      const disp = isAr ? ar : fr;
      return `<a class="iep-link" href="#" data-ar="${ar}" data-fr="${fr}">${disp}</a>`;
    }).join('');
    groupsHtml += `<div><div class="iep-group-title">${titleDisp}</div>${linksHtml}</div>`;
  });

  iepanel.innerHTML = `
    <div class="iep-arrow" id="iep-arrow"></div>
    <div class="iep-header">
      <div class="iep-title">${catIcon} ${catNameDisp}</div>
      <div class="iep-actions">
        <a class="iep-viewall" href="${viewAllHref}">${viewAllLabel}</a>
        <button class="iep-close" onclick="closeInlineExpand(true)">✕</button>
      </div>
    </div>
    <div class="iep-groups">${groupsHtml || '<p class="iep-empty">—</p>'}</div>
  `;

  iepanel.querySelectorAll('.iep-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = 'rizq_browse.html?cat=' + encodeURIComponent(catNameAr) + '&sub=' + encodeURIComponent(this.dataset.ar);
    });
  });

  iepanel.style.display = 'block';
  iepanel.classList.remove('visible', 'closing');
  void iepanel.offsetWidth;
  iepanel.classList.add('visible');
  try {
    if (window.matchMedia('(max-width:768px)').matches) {
      setTimeout(function () {
        iepanel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 80);
    }
  } catch (eS) {}
  const arrow = iepanel.querySelector('#iep-arrow');
  if (arrow) {
    const panelRect = iepanel.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const arrowLeft = (cardRect.left - panelRect.left) + (cardRect.width / 2) - 16;
    arrow.style.left = Math.max(8, Math.min(arrowLeft, panelRect.width - 40)) + 'px';
  }
}

function closeInlineExpand(force) {
  if (pinnedCard && !force) return;
  var panel = iepanel;
  var card = activeCard;
  function afterHide() {
    if (panel && !panel.classList.contains('visible')) resetCatPopupBox();
    if (card && activeCard === card) {
      _setCardActive(card, false);
      activeCard = null;
      pinnedCard = null;
    } else if (!activeCard) {
      pinnedCard = null;
    }
  }
  if (panel && typeof window.rizqAnimatePanelClose === 'function') {
    window.rizqAnimatePanelClose(panel, afterHide);
  } else {
    if (panel) {
      panel.style.display = 'none';
      panel.classList.remove('visible', 'pinned', 'closing');
      resetCatPopupBox();
    }
    afterHide();
  }
}

// Backward-compat aliases (used by dynamically generated extra-categories cards)
function openDrop(card)  { openInlineExpand(card); }
function closeDrop()     { closeInlineExpand(true); }
function scheduleClose() { /* no-op — handled by hover timer below */ }

// Hover + click — smart open/close with travel delay
let _hoverOpenTimer  = null;
let _hoverCloseTimer = null;

function _cancelHoverTimers() {
  clearTimeout(_hoverOpenTimer);
  clearTimeout(_hoverCloseTimer);
}

function _bindCard(card) {
  if (!card || card.dataset.rzqBound === '1') return;
  card.dataset.rzqBound = '1';
  card.style.pointerEvents = 'auto';
  var nameEl = card.querySelector('.cat-name');
  if (nameEl && !card.getAttribute('data-cat-ar')) {
    card.setAttribute('data-cat-ar', nameEl.textContent.trim());
  }
  card.addEventListener('click', function(e) {
    if (e.target.closest('a,button,.iep-link,.drop-link,#cat-inline-panel')) return;
    e.preventDefault();
    e.stopPropagation();
    _cancelHoverTimers();
    /* الجوال والحاسوب سواء: النقرة تفتح لوحة الفروع أولاً (فيها «عرض الكل»)،
       ولا يُنتقل لصفحة الإعلانات إلا من داخل اللوحة. */
    if (pinnedCard === this) {
      closeInlineExpand(true);
      return;
    }
    pinnedCard = this;
    openInlineExpand(this);
  });
  card.addEventListener('mouseenter', function() {
    try { if (window.matchMedia('(max-width:768px)').matches) return; } catch (eM) {}
    if (pinnedCard && pinnedCard !== this) return;
    _cancelHoverTimers();
    const self = this;
    _hoverOpenTimer = setTimeout(function() { openInlineExpand(self); }, 160);
  });
  card.addEventListener('mouseleave', function() {
    if (pinnedCard === this) return;
    clearTimeout(_hoverOpenTimer);
    _hoverCloseTimer = setTimeout(function() {
      if (!iepanel || !iepanel.matches(':hover')) closeInlineExpand(false);
    }, 280);
  });
}

document.querySelectorAll('.cat-card').forEach(_bindCard);

function _rizqInitBuiltinCategories() {
  if (typeof RizqCategories === 'undefined') return;
  var grid = document.querySelector('.cats-grid');
  RizqCategories.renderBuiltinGrid(grid);
  if (grid) {
    grid.querySelectorAll('.cat-card:not([data-suggest="1"]):not([data-extra="1"])').forEach(function(card) {
      if (typeof obs !== 'undefined' && obs && obs.observe) obs.observe(card);
      _bindCard(card);
    });
  }
  if (typeof refreshCatStatsText === 'function') {
    try { refreshCatStatsText(); } catch (eStats) { /* CAT_NAMES/LANG not ready yet */ }
  }
}

if (iepanel) {
  iepanel.addEventListener('mouseenter', function() { clearTimeout(_hoverCloseTimer); });
  iepanel.addEventListener('mouseleave', function() {
    if (pinnedCard) return;
    _hoverCloseTimer = setTimeout(function() { closeInlineExpand(false); }, 220);
  });
}

document.querySelectorAll('.qcat').forEach(function(el){
  el.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    var k = el.getAttribute('data-qcat');
    if (!k) return;
    var hasSubs = (typeof QCAT_DATA !== 'undefined') && QCAT_DATA[k];
    if (!hasSubs) {
      window.location.href = 'rizq_browse.html?cat=' + encodeURIComponent(k);
      return;
    }
    /* النقرة الأولى تفتح لوحة الفروع؛ النقرة الثانية على نفس البلاطة تنتقل
       للإعلانات. مهلة 600ms تمنع الـ mouseenter المرافق للمسة من إحصائها كنقرة أولى. */
    var openedAt = el._qcatOpenedAt || 0;
    if (qcatPinned === el && el.classList.contains('qcat-open') && (Date.now() - openedAt) > 600) {
      closeQcatPortal(true);
      window.location.href = 'rizq_browse.html?cat=' + encodeURIComponent(k);
    } else {
      qcatPinned = el;
      openQcatPortal(el);
    }
  });
});

document.addEventListener('click', function(e) {
  if (!e.target.closest('.cat-card') && !e.target.closest('#cat-inline-panel') && !e.target.closest('#sub-modal') && !e.target.closest('#rzq-sheet')) {
    closeInlineExpand(true);
  }
});
window.addEventListener('resize', function () {
  if (activeCard && iepanel && iepanel.style.display === 'block') openInlineExpand(activeCard);
});

// ── SUB ACTION MODAL ──
const CAT_ICONS_MAP = {
  'منازل وعقارات':'🏠','سيارات وقطع غيار':'🚗','شاحنات ومعدات ثقيلة':'🚛',
  'هواتف وإلكترونيات':'📱','موضة وأزياء':'👗','صحة وجمال':'🌿',
  'وظائف وفرص عمل':'💼','خدمات ومهن':'🔧','أثاث وديكور':'🛋️',
  'بناء ومقاولات':'🧱','تجارة وصناعة':'🏭','رياضة وهوايات':'⚽',
  'تعليم وثقافة':'📚','أغذية ومطاعم':'🍽️','فنون وحرف يدوية':'🎨','ماشية ودواجن':'🐄'
};

function openSubModal(cat, sub) {
  closeDrop();
  const icon = CAT_ICONS_MAP[cat] || '🏷️';
  document.getElementById('sm-icon').textContent = icon;
  document.getElementById('sm-title').textContent = sub;
  document.getElementById('sm-sub').textContent = cat;
  const modal = document.getElementById('sub-modal');
  modal.style.display = 'block';
  document.getElementById('sub-modal-overlay').style.display = 'block';
}

function closeSubModal() {
  document.getElementById('sub-modal').style.display = 'none';
  document.getElementById('sub-modal-overlay').style.display = 'none';
}

function browseSubCat() {
  try { closeSubModal(); } catch (e) {}
  var params = new URLSearchParams();
  var cat = (typeof currentCat !== 'undefined' && currentCat) ? currentCat : '';
  var sub = (typeof currentSubCat !== 'undefined' && currentSubCat) ? currentSubCat : '';
  if (cat) params.set('cat', cat);
  if (sub) params.set('sub', sub);
  var url = 'rizq_browse.html' + (params.toString() ? '?' + params.toString() : '');
  window.location.assign(url);
}

function postInSubCat() {
  closeSubModal();
  var params = new URLSearchParams();
  var cat = (typeof currentCat !== 'undefined' && currentCat) ? currentCat : '';
  var sub = (typeof currentSubCat !== 'undefined' && currentSubCat) ? currentSubCat : '';
  if (cat) params.set('cat', cat);
  if (sub) params.set('sub', sub);
  goToPost(params.toString());
}

function goToPost(query) {
  var url = 'rizq_post.html';
  if (query) url += (String(query).indexOf('?') === 0 ? query : '?' + query);
  window.location.href = url;
}
window.goToPost = goToPost;
