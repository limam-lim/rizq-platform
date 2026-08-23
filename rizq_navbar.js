/**
 * rizq_navbar.js — الـ navbar الموحّد لمنصة رزق
 * الإصدار: 2.0.0 | RIZQ-BUILD:202507091951
 *
 * الاستخدام في أي صفحة جديدة:
 *   <div id="rizq-nav-root" data-style="topnav" data-page="corp"></div>
 *   <script src="rizq_navbar.js"></script>
 *
 * أو استدعاء مباشر:
 *   RizqNavbar.render(document.getElementById('my-nav'), {style:'topnav', page:'listing'});
 */
(function(global){
'use strict';

// ══════════════════════════════════════════════
// 1. ثوابت الهوية البصرية
// ══════════════════════════════════════════════
var LOGO_SVG = '<img class="logo-mark-img" src="rizq-mark-512.png" width="42" height="42" alt="رزق"/>';

var DISCLAIMER_AR = '⚖️ رزق وسيط نشر إلكتروني فقط — عاين قبل الدفع';
var DISCLAIMER_FR = '⚖️ Rizq est un simple intermédiaire — Vérifiez avant de payer';

// ══════════════════════════════════════════════
// 2. CSS الموحّد للـ topnav
// ══════════════════════════════════════════════
var TOPNAV_CSS = [
  '.rn-topnav{position:sticky;top:0;z-index:500;background:linear-gradient(135deg,#071020,#0d1b2e);',
  'border-bottom:1px solid rgba(201,168,76,.2);box-shadow:0 2px 18px rgba(0,0,0,.35)}',
  '.rn-inner{max-width:1200px;margin:0 auto;padding:0 20px;height:52px;display:flex;',
  'align-items:center;justify-content:space-between;gap:14px}',
  '.rn-disc{font-size:11.5px;font-weight:700;color:#C9A84C;cursor:pointer;',
  'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px;',
  'background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.22);',
  'border-radius:20px;padding:4px 13px;transition:background .2s;flex-shrink:0}',
  '.rn-disc:hover{background:rgba(201,168,76,.16)}',
  '.rn-brand{display:flex;align-items:center;gap:10px;flex-shrink:0}',
  '.rn-logo-btn{background:transparent;border:none;border-radius:10px;',
  'width:42px;height:42px;display:flex;align-items:center;justify-content:center;',
  'cursor:pointer;flex-shrink:0;padding:0;outline:none}',
  '.rn-logo-btn:hover{opacity:.92}',
  '.rn-logo-text{display:flex;flex-direction:column;justify-content:center;text-align:right}',
  '.rn-logo-ar{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#C9A84C;line-height:1;text-shadow:0 0 16px rgba(201,168,76,.4)}',
  '.rn-logo-sub{font-size:8px;color:rgba(201,168,76,.65);letter-spacing:2px;font-style:italic;font-weight:700;text-transform:uppercase}',
  '.rn-links{display:flex;align-items:center;gap:4px}',
  '.rn-link{font-size:12.5px;font-weight:600;color:rgba(255,255,255,.75);text-decoration:none;',
  'background:none;border:none;cursor:pointer;padding:6px 10px;border-radius:8px;',
  'font-family:inherit;transition:all .2s}',
  '.rn-link:hover{color:#C9A84C;background:rgba(201,168,76,.08)}',
  '.rn-right{display:flex;align-items:center;gap:8px;flex-shrink:0}',
  '.rn-lang{background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.35);',
  'color:#C9A84C;font-size:12px;font-weight:700;padding:5px 14px;border-radius:20px;',
  'cursor:pointer;transition:all .2s;font-family:inherit;letter-spacing:.5px}',
  '.rn-lang:hover{background:rgba(201,168,76,.2)}',
  '@media(max-width:640px){.rn-disc{display:none}.rn-links{display:none}}',
].join('');

// ══════════════════════════════════════════════
// 3. دوال مساعدة
// ══════════════════════════════════════════════
function _getLang(){
  try{ return localStorage.getItem('rizq_lang') || 'ar'; }catch(e){ return 'ar'; }
}

function _setLang(l){
  try{ localStorage.setItem('rizq_lang', l); }catch(e){}
}

function _injectCSS(){
  if(document.getElementById('rizq-navbar-css')) return;
  var st = document.createElement('style');
  st.id = 'rizq-navbar-css';
  st.textContent = TOPNAV_CSS;
  document.head.appendChild(st);
}

// ══════════════════════════════════════════════
// 4. تقديم نموذج topnav (للصفحات العامة)
// ══════════════════════════════════════════════
function _buildTopnav(cfg){
  cfg = cfg || {};
  var lang = _getLang();
  var isFr = lang === 'fr';

  var links = '';
  if(cfg.links && cfg.links.length){
    cfg.links.forEach(function(lk){
      if(lk.href){
        links += '<a class="rn-link" href="'+lk.href+'">'+(isFr?lk.fr:lk.ar)+'</a>';
      } else if(lk.scrollTo){
        links += '<button class="rn-link" onclick="var t=document.getElementById(\''+lk.scrollTo+'\');if(t)t.scrollIntoView({behavior:\'smooth\'})">'+(isFr?lk.fr:lk.ar)+'</button>';
      }
    });
  }

  var disc = isFr ? DISCLAIMER_FR : DISCLAIMER_AR;
  var logoHref = cfg.logoHref || 'rizq_landing_v8.html';
  var onPromo = cfg.onPromo ? 'onclick="'+cfg.onPromo+'"' : 'onclick="if(typeof openRizqPromo===\'function\')openRizqPromo();else if(typeof openPromo===\'function\')openPromo()"';
  var onDisc  = 'onclick="if(typeof openDisc===\'function\')openDisc()"';
  var langNext = isFr ? 'AR' : 'FR';

  /* ترتيب DOM: brand → links → disc → lang
     يعمل تلقائياً مع dir الـ html:
     • LTR (FR): brand أقصى يسار ← links ← disc ← lang أقصى يمين ✓
     • RTL (AR): lang أقصى يسار ← disc ← links ← brand أقصى يمين ✓  */
  return ''
    + '<nav class="rn-topnav" id="rizq-topnav-rendered">'
    + '<div class="rn-inner">'
    + '<div class="rn-brand" style="direction:ltr">'
    + '<button class="rn-logo-btn" '+onPromo+' title="Rizq Platform">'+LOGO_SVG+'</button>'
    + '<a href="'+logoHref+'" style="text-decoration:none">'
    + '<div class="rn-logo-text"><span class="rn-logo-ar">رزق</span><span class="rn-logo-sub">RIZQ PLATFORM</span></div>'
    + '</a>'
    + '</div>'
    + (links ? '<div class="rn-links">'+links+'</div>' : '')
    + '<div class="rn-disc" id="rn-disc-txt" '+onDisc+' title="'+(isFr?'Cliquez pour les mentions légales':'اضغط لعرض الإشعار القانوني')+'">'
    + disc
    + '</div>'
    + '<div class="rn-right">'
    + '<button class="rn-lang" id="rn-lang-btn" onclick="RizqNavbar.toggleLang(this)">'+langNext+'</button>'
    + '</div>'
    + '</div>'
    + '</nav>';
}

// ══════════════════════════════════════════════
// 5. تبديل اللغة الموحّد
// ══════════════════════════════════════════════
function _toggleLang(btn){
  var current = _getLang();
  var next = current === 'ar' ? 'fr' : 'ar';
  _setLang(next);
  if(btn) btn.textContent = next === 'ar' ? 'FR' : 'AR';
  /* تحديث اتجاه الصفحة — يُقلب الـ navbar تلقائياً */
  document.documentElement.dir  = next === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = next === 'ar' ? 'ar'  : 'fr';

  // تحديث نص الإشعار
  var disc = document.getElementById('rn-disc-txt') || document.getElementById('nav-disclaimer-txt');
  if(disc) disc.textContent = next === 'fr' ? DISCLAIMER_FR : DISCLAIMER_AR;

  // استدعاء دالة تبديل اللغة للصفحة إذا وُجدت
  var pageFns = ['toggleLang','_applyCorpLang','_applyStoreLang','_applyOfficeLang','applyLang'];
  for(var i=0;i<pageFns.length;i++){
    if(typeof global[pageFns[i]] === 'function' && pageFns[i] !== 'toggleLang'){
      try{ global[pageFns[i]](next); }catch(e){}
      break;
    }
  }
  // أو toggleLang المحلية
  if(typeof global.toggleLang === 'function'){
    try{ global.toggleLang(); }catch(e){}
  }
}

// ══════════════════════════════════════════════
// 6. الواجهة العامة — RizqNavbar
// ══════════════════════════════════════════════
var RizqNavbar = {

  /**
   * render(el, config)
   * el: العنصر المستهدف (سيُستبدل بالـ nav)
   * config: { links:[{ar,fr,href|scrollTo}], logoHref, onPromo }
   */
  render: function(el, config){
    if(!el) return;
    _injectCSS();
    var html = _buildTopnav(config || {});
    el.outerHTML = html;
  },

  /** تبديل اللغة — يُستدعى من زر الـ nav */
  toggleLang: function(btn){ _toggleLang(btn); },

  /** تحديث نص الإشعار عند تغيير اللغة خارجياً */
  updateDisc: function(lang){
    var el = document.getElementById('rn-disc-txt') || document.getElementById('nav-disclaimer-txt');
    if(el) el.textContent = lang === 'fr' ? DISCLAIMER_FR : DISCLAIMER_AR;
  },

  /** إرجاع اللغة الحالية */
  getLang: function(){ return _getLang(); },

  /** الإصدار */
  version: '2.0.0'
};

// ══════════════════════════════════════════════
// 7. التهيئة التلقائية
// ══════════════════════════════════════════════
function _autoInit(){
  /* تطبيق اتجاه الصفحة من localStorage عند التحميل */
  var initLang = _getLang();
  document.documentElement.dir  = initLang === 'fr' ? 'ltr' : 'rtl';
  document.documentElement.lang = initLang === 'fr' ? 'fr'  : 'ar';

  var root = document.getElementById('rizq-nav-root');
  if(!root) return;

  // قراءة الإعدادات من data attributes
  var cfg = {};
  try{ cfg = JSON.parse(root.getAttribute('data-config') || '{}'); }catch(e){}

  RizqNavbar.render(root, cfg);
}

// تشغيل عند الجاهزية
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _autoInit);
} else {
  _autoInit();
}

// تصدير عام
global.RizqNavbar = RizqNavbar;

})(typeof window !== 'undefined' ? window : this);
