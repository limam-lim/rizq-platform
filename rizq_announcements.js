/* ═══════════════════════════════════════════════════════════════════
   rizq_announcements.js  v1.0
   نظام الإشعارات والإعلانات — Système d'annonces Rizq
   ───────────────────────────────────────────────────────────────────
   يُحقن في: rizq_landing_v8.html · rizq_browse.html · rizq_search.html
   يعرض:
     • شريط إعلانات ملون أسفل الناف بار
     • بطاقة "حدث مميز" عائمة (يسار أسفل)
   يُدار من: rizq_admin.html — panel-announcements
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── STORAGE KEYS ── */
  var STORAGE_KEY   = 'rizq_announcements';
  var DISMISSED_KEY = 'rizq_ann_dismissed';

  /* ── HELPERS ── */
  function getLang() {
    if (window.RizqI18n && typeof RizqI18n.getLang === 'function')
      return RizqI18n.getLang();
    return localStorage.getItem('rizq_lang') || 'ar';
  }

  function t(ar, fr) { return getLang() === 'fr' ? fr : ar; }

  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getDismissed() {
    try { return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]'); }
    catch(e) { return []; }
  }

  function addDismissed(id) {
    var list = getDismissed();
    if (list.indexOf(id) < 0) list.push(id);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
  }

  function getCurrentPage() {
    var f = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!f || f === 'index.html' || f.indexOf('landing') >= 0) return 'landing';
    if (f.indexOf('browse') >= 0) return 'browse';
    if (f.indexOf('search') >= 0) return 'search';
    if (f.indexOf('store') >= 0)  return 'store';
    return 'other';
  }

  function isActive(ann) {
    if (!ann.active) return false;
    if (ann.expires) {
      var d = new Date(ann.expires); d.setHours(23, 59, 59);
      if (d < new Date()) return false;
    }
    return true;
  }

  function pageMatches(ann, page) {
    var pages = (ann.pages || 'all').trim();
    if (pages === 'all') return true;
    return pages.split(',').map(function(p){return p.trim();}).indexOf(page) >= 0;
  }

  function pickText(ann, fieldAr, fieldFr) {
    var lang = getLang();
    return lang === 'fr'
      ? (ann[fieldFr] || ann[fieldAr] || '')
      : (ann[fieldAr] || ann[fieldFr] || '');
  }

  /* ── TYPE CONFIG ── */
  var TYPES = {
    congrats: { bg:'#C9A84C', fg:'#3d2a00', icon:'🎉', labelAr:'تهنئة',    labelFr:'Félicitations' },
    discount: { bg:'#10b981', fg:'#003d22', icon:'✂️', labelAr:'عرض خاص',  labelFr:'Offre spéciale' },
    alert:    { bg:'#ef4444', fg:'#3d0000', icon:'⚠️', labelAr:'تنبيه',     labelFr:'Alerte'         },
    event:    { bg:'#1B3A6B', fg:'#c8dcf0', icon:'📅', labelAr:'فعالية',    labelFr:'Événement'      },
    info:     { bg:'#4f46e5', fg:'#e0e0ff', icon:'ℹ️',  labelAr:'معلومة',   labelFr:'Info'           },
    promo:    { bg:'#7c3aed', fg:'#f3e8ff', icon:'📣', labelAr:'ترويج',     labelFr:'Promotion'      },
  };

  /* ── CSS ── */
  function injectCSS() {
    if (document.getElementById('rizq-ann-css')) return;
    var s = document.createElement('style');
    s.id = 'rizq-ann-css';
    s.textContent =
      '@keyframes rizq-ann-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}' +
      '@keyframes rizq-ann-out{to{opacity:0;transform:translateY(24px)}}' +
      '#rizq-ann-bar{transition:height .25s,opacity .25s;overflow:hidden}' +
      '.rizq-spotlight-card{animation:rizq-ann-in .45s cubic-bezier(.21,1.02,.73,1) both}' +
      '.rizq-spotlight-card.hiding{animation:rizq-ann-out .28s ease forwards}' +
      '@media(max-width:600px){.rizq-spotlight-card{width:calc(100vw - 32px)!important;left:16px!important;bottom:16px!important}}';
    document.head.appendChild(s);
  }

  /* ── ANNOUNCEMENT BAR ── */
  function buildBar(ann) {
    var cfg = TYPES[ann.type] || TYPES.info;
    var title  = pickText(ann,'titleAr','titleFr');
    var text   = pickText(ann,'textAr','textFr');
    var ctaTxt = pickText(ann,'ctaTextAr','ctaTextFr');

    var bar = document.createElement('div');
    bar.id = 'rizq-ann-bar';
    Object.assign(bar.style, {
      background   : cfg.bg,
      color        : cfg.fg,
      display      : 'flex',
      alignItems   : 'center',
      gap          : '10px',
      padding      : '9px 16px',
      fontSize     : '13px',
      fontWeight   : '500',
      direction    : 'rtl',
      fontFamily   : 'inherit',
      zIndex       : '998',
      flexWrap     : 'wrap',
      minHeight    : '42px',
      position     : 'relative',
    });

    var html = '<span style="font-size:17px;flex-shrink:0">' + cfg.icon + '</span>';
    html += '<span style="flex:1;min-width:0;line-height:1.4">';
    if (title) html += '<strong>' + esc(title) + '</strong>';
    if (title && text) html += ' — ';
    if (text)  html += esc(text);
    html += '</span>';

    if (ctaTxt && ann.ctaUrl) {
      html += '<a href="' + esc(ann.ctaUrl) + '" target="_blank" rel="noopener" '
        + 'style="font-size:11px;font-weight:700;background:rgba(0,0,0,.2);'
        + 'color:inherit;border-radius:6px;padding:4px 14px;text-decoration:none;'
        + 'border:1px solid rgba(0,0,0,.18);white-space:nowrap;flex-shrink:0">'
        + esc(ctaTxt) + '</a>';
    }
    if (ann.isPaid) {
      html += '<span style="font-size:10px;opacity:.6;flex-shrink:0;font-weight:400">'
        + t('إعلان','Pub') + '</span>';
    }
    html += '<button id="_rizq-bar-close" aria-label="' + t('إغلاق','Fermer') + '" '
      + 'style="background:none;border:none;cursor:pointer;font-size:18px;'
      + 'opacity:.65;padding:0 2px;color:inherit;flex-shrink:0;line-height:1;'
      + 'font-family:inherit">×</button>';

    bar.innerHTML = html;

    bar.querySelector('#_rizq-bar-close').addEventListener('click', function() {
      addDismissed(ann.id);
      bar.style.height = bar.offsetHeight + 'px';
      requestAnimationFrame(function(){
        bar.style.height  = '0';
        bar.style.opacity = '0';
        bar.style.padding = '0';
        bar.style.minHeight = '0';
        setTimeout(function(){ bar.remove(); }, 260);
      });
    });
    return bar;
  }

  /* ── SPOTLIGHT CARD ── */
  function buildSpotlight(ann) {
    var cfg = TYPES[ann.type] || TYPES.event;
    var title  = pickText(ann,'titleAr','titleFr');
    var text   = pickText(ann,'textAr','textFr');
    var ctaTxt = pickText(ann,'ctaTextAr','ctaTextFr') || t('اكتشف الآن','Découvrir');

    var card = document.createElement('div');
    card.className = 'rizq-spotlight-card';
    Object.assign(card.style, {
      position     : 'fixed',
      bottom       : '24px',
      left         : '24px',
      width        : '288px',
      background   : '#0f2040',
      borderRadius : '16px',
      overflow     : 'hidden',
      zIndex       : '9997',
      boxShadow    : '0 12px 40px rgba(0,0,0,.45)',
      direction    : 'rtl',
      fontFamily   : 'inherit',
    });

    var html = '';
    /* header strip */
    html += '<div style="background:linear-gradient(135deg,#C9A84C,#e8c96a);padding:10px 14px;'
      + 'display:flex;align-items:center;justify-content:space-between">';
    html += '<div style="display:flex;align-items:center;gap:8px">';
    html += '<span style="font-size:17px">' + cfg.icon + '</span>';
    html += '<span style="font-size:11px;font-weight:700;color:#3d2a00">'
      + esc(t(cfg.labelAr, cfg.labelFr)) + '</span>';
    if (ann.isPaid) {
      html += '<span style="font-size:10px;background:rgba(0,0,0,.15);color:#3d2a00;'
        + 'padding:1px 7px;border-radius:10px;font-weight:600">'
        + t('مموّل','Sponsorisé') + '</span>';
    }
    html += '</div>';
    html += '<button class="_sp-close" aria-label="' + t('إغلاق','Fermer') + '" '
      + 'style="background:rgba(0,0,0,.18);border:none;cursor:pointer;color:#3d2a00;'
      + 'border-radius:50%;width:24px;height:24px;font-size:14px;display:flex;'
      + 'align-items:center;justify-content:center;font-family:inherit">×</button>';
    html += '</div>';

    /* body */
    html += '<div style="padding:14px 16px 16px">';
    if (title) html += '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:7px;line-height:1.35">'
      + esc(title) + '</div>';
    if (text)  html += '<div style="font-size:12px;color:rgba(255,255,255,.62);line-height:1.65;margin-bottom:13px">'
      + esc(text)  + '</div>';

    html += '<div style="display:flex;gap:8px;align-items:center">';
    if (ann.ctaUrl) {
      html += '<a href="' + esc(ann.ctaUrl) + '" target="_blank" rel="noopener" '
        + 'style="flex:1;background:#C9A84C;color:#fff;border:none;border-radius:9px;'
        + 'padding:9px 14px;font-size:12.5px;font-weight:700;cursor:pointer;text-align:center;'
        + 'text-decoration:none;display:block;font-family:inherit">' + esc(ctaTxt) + '</a>';
    }
    html += '<button class="_sp-close" '
      + 'style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.55);'
      + 'border:1px solid rgba(255,255,255,.18);border-radius:9px;padding:9px 14px;'
      + 'font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap">'
      + t('لاحقاً','Plus tard') + '</button>';
    html += '</div></div>';

    card.innerHTML = html;
    card.querySelectorAll('._sp-close').forEach(function(btn){
      btn.addEventListener('click', function(){
        addDismissed(ann.id);
        card.classList.add('hiding');
        setTimeout(function(){ card.remove(); }, 300);
      });
    });
    return card;
  }

  /* ── INIT ── */
  function init() {
    var allAnns;
    try { allAnns = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e) { return; }
    if (!Array.isArray(allAnns) || !allAnns.length) return;

    injectCSS();
    var page      = getCurrentPage();
    var dismissed = getDismissed();

    var active = allAnns.filter(function(a){
      return isActive(a) && pageMatches(a, page) && dismissed.indexOf(a.id) < 0;
    });
    if (!active.length) return;

    var barAnn  = active.find(function(a){ return a.showBar  !== false; }) || null;
    var spotAnn = active.find(function(a){ return !!a.showSpotlight;   }) || null;

    /* Bar: insert after first <nav> */
    if (barAnn) {
      var nav = document.querySelector('nav');
      if (nav && nav.parentNode) {
        nav.parentNode.insertBefore(buildBar(barAnn), nav.nextSibling);
      }
    }

    /* Spotlight: append to body with small delay */
    if (spotAnn) {
      setTimeout(function(){ document.body.appendChild(buildSpotlight(spotAnn)); }, 900);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── PUBLIC API (للأدمين) ── */
  window.RizqAnnouncements = {
    _key: STORAGE_KEY,
    getAll  : function(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');}catch(e){return[];} },
    saveAll : function(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); },
    create  : function(ann){
      var list = this.getAll();
      ann.id        = 'ann_' + Date.now();
      ann.createdAt = new Date().toISOString();
      list.unshift(ann);
      this.saveAll(list);
      return ann.id;
    },
    update  : function(id, changes){
      var list = this.getAll();
      var i = list.findIndex(function(a){return a.id===id;});
      if (i >= 0){ list[i] = Object.assign({}, list[i], changes); this.saveAll(list); }
    },
    remove  : function(id){ this.saveAll(this.getAll().filter(function(a){return a.id!==id;})); },
    toggle  : function(id){
      var list = this.getAll();
      var i = list.findIndex(function(a){return a.id===id;});
      if (i >= 0){ list[i].active = !list[i].active; this.saveAll(list); }
    },
    TYPES   : TYPES,
    reload  : function(){ init(); },
  };
})();
