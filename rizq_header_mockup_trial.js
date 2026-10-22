/**
 * هيدر النموذج الموحّد — يُحقن على كل الصفحات العامة
 * (شعار + بحث + أدوات فوق / أقسام أسفل على الهاتف)
 */
(function () {
  'use strict';

  function pathName() {
    try { return (location.pathname || '').split('/').pop() || ''; }
    catch (e) { return ''; }
  }
  function pageKey() {
    return pathName().toLowerCase().replace(/\.html$/, '');
  }
  function isDashShell() {
    return /dashboard|admin\.html|chat_widget|cp_panel|register\.html/.test(pathName().toLowerCase());
  }
  function isLanding() {
    var k = pageKey();
    return !k || k === 'rizq_landing_v8' || k === 'index';
  }
  function isPhone() {
    try { return window.matchMedia('(max-width:768px)').matches; }
    catch (e) { return false; }
  }

  function waitBody(fn) {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function ensureMockCss() {
    if (document.querySelector('link[href*="rizq_header_mockup_trial.css"]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'rizq_header_mockup_trial.css?v=5.48';
    (document.head || document.documentElement).appendChild(link);
  }

  if (isDashShell()) return;

  function navHrefs() {
    var L = isLanding();
    return {
      home: L ? '#hero' : 'rizq_landing_v8.html',
      ads: L ? '#listings' : 'rizq_browse.html',
      stores: L ? '#virtual-stores' : 'rizq_landing_v8.html#virtual-stores',
      showrooms: L ? '#virtual-showrooms' : 'rizq_landing_v8.html#virtual-showrooms',
      estate: L ? '#virtual-estate' : 'rizq_landing_v8.html#virtual-estate',
      post: 'rizq_post.html',
      offices: L ? '#virtual-offices' : 'rizq_landing_v8.html#virtual-offices',
      tenders: 'rizq_tenders_directory.html',
      investments: 'rizq_investments_directory.html',
      cats: L ? '#categories' : 'rizq_browse.html'
    };
  }

  function mockHeaderHtml() {
    var h = navHrefs();
    return '' +
      '<header id="rizq-mock-hdr" aria-label="شريط رزق">' +
      '<div class="rmh-util" hidden></div>' +
      '<div class="ticker-wrap is-empty civic-ticker-wrap rmh-ticker" id="ticker-wrap" role="marquee" aria-label="إعلانات خدمة عامة">' +
      '<div class="ticker-inner" id="ticker"></div></div>' +
      '<div class="rmh-main">' +
      '<a class="rmh-brand logo" href="rizq_landing_v8.html" aria-label="رزق" id="rmh-brand">' +
      '<img class="logo-mark-img rmh-mark" src="rizq-mark-inset.png?v=1" width="44" height="44" alt="رزق" decoding="async"/>' +
      '<div class="logo-text rmh-brand-text"><span class="logo-ar rmh-brand-ar">رزق</span>' +
      '<span class="logo-sub rmh-brand-sub">RIZQ PLATFORM</span></div></a>' +
      '<form class="rmh-search" id="rmh-search-form" action="rizq_browse.html" method="get" role="search">' +
      '<select class="rmh-search-cat" id="rmh-search-cat" name="cat" aria-label="كل الأقسام"><option value="">كل الأقسام</option></select>' +
      '<input class="rmh-search-input" id="rmh-search-q" type="search" name="q" autocomplete="off" ' +
      'placeholder="ابحث عن سيارة، شقة، محل، مكتب..." data-ph-fr="Cherchez une voiture, un appartement, un magasin, un bureau..."/>' +
      '<button class="rmh-search-btn" type="submit" aria-label="بحث">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
      '</button></form>' +
      '<div class="rmh-tools">' +
      '<button type="button" class="rmh-lang btn-lang btn-lang-primary" id="rmh-lang-btn" dir="ltr" aria-label="FR | AR">' +
      '<span class="lang-fr" dir="ltr">FR</span><span class="lang-sep" aria-hidden="true"> | </span><span class="lang-ar" dir="ltr">AR</span></button>' +
      '<button type="button" class="rmh-ico" onclick="typeof goToAccount===\'function\'&&goToAccount()" aria-label="حسابي">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19c1.6-3.2 4-4.8 6.5-4.8S16.9 15.8 18.5 19"/></svg></button>' +
      '<a class="rmh-ico rmh-cart-link" id="rmh-cart-btn" href="rizq_cart.html" data-rizq-cart-wrap aria-label="السلة العامة" title="السلة العامة">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 5h2l1.5 10h11L20 8H7"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/></svg>' +
      '<span class="rmh-cart-badge" id="rmh-cart-badge" data-rizq-cart-count hidden>0</span></a>' +
      '<a class="rmh-ico rmh-fav-link" href="rizq_favorites.html" data-rizq-fav-wrap aria-label="المفضلة العامة" title="المفضلة العامة">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20s-6.5-4.2-8.5-8A4.6 4.6 0 0 1 12 7.2 4.6 4.6 0 0 1 20.5 12c-2 3.8-8.5 8-8.5 8z"/></svg>' +
      '<span class="rmh-cart-badge rmh-fav-badge" id="rmh-fav-badge" data-rizq-fav-count hidden>0</span></a>' +
      '<div class="rizq-help-dd rmh-help-dd" id="rmh-help-wrap" data-rizq-toolbar="help">' +
      '<button type="button" class="rizq-help-dd-btn rmh-ico" id="rmh-help-btn" aria-haspopup="true" aria-expanded="false" aria-controls="rmh-help-menu" aria-label="المساعدة والدعم" title="المساعدة والدعم">' +
      '<span class="rizq-help-dd-chev" aria-hidden="true">▾</span>' +
      '<span class="rizq-help-dd-ico" aria-hidden="true"><svg class="rizq-help-svg" viewBox="0 0 24 24" width="18" height="18" focusable="false"><path fill="currentColor" d="M12 3a8 8 0 0 0-8 8v2.2a2.2 2.2 0 0 0 2.2 2.2H7.5a1.3 1.3 0 0 0 1.3-1.3V12a1.3 1.3 0 0 0-1.3-1.3H6.1A5.9 5.9 0 0 1 12 5a5.9 5.9 0 0 1 5.9 5.7h-1.4A1.3 1.3 0 0 0 15.2 12v2.1a1.3 1.3 0 0 0 1.3 1.3h1.3A2.2 2.2 0 0 0 20 13.2V11a8 8 0 0 0-8-8zm-1.2 14.6c0-.5.4-.9.9-.9h.6c2.1 0 3.4 1 3.4 2.5v.4c0 .4-.3.7-.7.7h-5c-.7 0-1.2-.5-1.2-1.2v-1.5z"/></svg></span></button>' +
      '<div class="rizq-help-dd-menu" id="rmh-help-menu" role="menu" hidden>' +
      '<a class="rizq-help-dd-item" role="menuitem" href="rizq_legal.html#s10"><span class="rizq-help-dd-item-lbl">اتصل بنا</span></a>' +
      '<a class="rizq-help-dd-item" role="menuitem" href="rizq_help.html"><span class="rizq-help-dd-item-lbl">مركز المساعدة</span></a>' +
      '</div></div></div></div>' +
      '<nav class="rmh-nav" aria-label="أقسام رزق">' +
      '<a href="' + h.home + '" data-rmh="home"><span class="rmh-nav-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7.2 14.2 12 12 16.8 9.8 12Z"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/></svg></span>الرئيسية</a>' +
      '<a href="' + h.ads + '" data-rmh="ads"><span class="rmh-nav-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 10v4h2l5 3V7L6 10H4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 7a7 7 0 0 1 0 10"/></svg></span>الإعلانات</a>' +
      '<a href="' + h.stores + '" data-rmh="stores"><span class="rmh-nav-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 10 6 5h12l2 5"/><path d="M4 10v9h16v-9"/><path d="M9 19v-5h6v5"/></svg></span>المحلات</a>' +
      '<a href="' + h.showrooms + '" data-rmh="showrooms"><span class="rmh-nav-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="7" width="16" height="12" rx="1"/><path d="M8 7V5h8v2M8 11h.01M12 11h.01M16 11h.01M8 15h8"/></svg></span>المعارض و المصانع</a>' +
      '<a href="' + h.estate + '" data-rmh="estate"><span class="rmh-nav-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 20V10l8-6 8 6v10"/><path d="M10 20v-6h4v6"/></svg></span>سوق العقارات</a>' +
      '<a class="rmh-post-nav" href="' + h.post + '" data-rmh="post"><span class="rmh-nav-ico rmh-post-plus" aria-hidden="true">+</span><span class="rmh-post-lbl">انشر إعلان</span></a>' +
      '<a href="' + h.offices + '" data-rmh="offices"><span class="rmh-nav-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="8" width="16" height="11" rx="1"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 13h16"/></svg></span>المكاتب</a>' +
      '<a href="' + h.tenders + '" data-rmh="tenders"><span class="rmh-nav-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 4h8a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z"/><path d="M9 9h6M9 13h6"/></svg></span>المناقصات</a>' +
      '<a href="' + h.investments + '" data-rmh="investments"><span class="rmh-nav-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 18V6M4 18h16"/><path d="M7 14l4-4 3 3 5-6"/></svg></span>الاستثمارات</a>' +
      '<div class="rmh-more-wrap" data-rmh="more">' +
      '<button type="button" class="rmh-more-btn" id="rmh-more-btn" aria-haspopup="true" aria-expanded="false" aria-controls="rmh-more-menu">' +
      '<span class="rmh-nav-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/></svg></span>' +
      '<span class="rmh-more-lbl">المزيد</span></button>' +
      '<div class="rmh-more-menu" id="rmh-more-menu" role="menu" hidden>' +
      '<a href="' + h.cats + '" class="rmh-more-item" role="menuitem"><span aria-hidden="true">📂</span><strong>الأقسام</strong></a>' +
      '<a href="rizq_ads_info.html" class="rmh-more-item" role="menuitem"><span aria-hidden="true">🎬</span><strong>Rizq ADS</strong></a>' +
      '<a href="rizq_legal.html" class="rmh-more-item" role="menuitem"><span aria-hidden="true">⚖️</span><strong>المواد القانونية</strong></a>' +
      '<a href="rizq_platform.html#who" class="rmh-more-item" role="menuitem"><span aria-hidden="true">ℹ️</span><strong>من نحن</strong></a>' +
      '<a href="rizq_platform.html#why" class="rmh-more-item" role="menuitem"><span aria-hidden="true">❓</span><strong>لماذا رزق</strong></a>' +
      '<a href="rizq_about.html" class="rmh-more-item" role="menuitem"><span aria-hidden="true">🏛️</span><strong>الشركة المالكة</strong></a>' +
      '</div></div></nav></header>';
  }

  function migrateCartToLink() {
    /* حوّل زر السلة + النافذة المنبثقة إلى رابط صفحة السلة العامة */
    var wrap = document.getElementById('rmh-cart-wrap');
    var btn = document.getElementById('rmh-cart-btn');
    var panel = document.getElementById('rmh-cart-panel');
    if (panel && panel.parentNode) {
      try { panel.parentNode.removeChild(panel); } catch (eP) {}
    }
    if (btn && btn.tagName === 'A' && btn.classList.contains('rmh-cart-link')) {
      btn.setAttribute('href', 'rizq_cart.html');
      return;
    }
    var parent = (wrap && wrap.parentNode) || (btn && btn.parentNode);
    if (!parent) return;
    var badgeHtml = '';
    var oldBadge = document.getElementById('rmh-cart-badge');
    if (oldBadge) badgeHtml = oldBadge.outerHTML;
    else badgeHtml = '<span class="rmh-cart-badge" id="rmh-cart-badge" data-rizq-cart-count hidden>0</span>';
    var link = document.createElement('a');
    link.className = 'rmh-ico rmh-cart-link';
    link.id = 'rmh-cart-btn';
    link.href = 'rizq_cart.html';
    link.setAttribute('data-rizq-cart-wrap', '');
    link.setAttribute('aria-label', 'السلة العامة');
    link.setAttribute('title', 'السلة العامة');
    link.innerHTML =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 5h2l1.5 10h11L20 8H7"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/></svg>' +
      badgeHtml;
    if (wrap) parent.replaceChild(link, wrap);
    else if (btn) parent.replaceChild(link, btn);
    var fav = parent.querySelector('a.rmh-ico[href*="fav"], a.rmh-fav-link');
    if (fav && !fav.classList.contains('rmh-fav-link')) {
      fav.classList.add('rmh-fav-link');
      fav.setAttribute('href', 'rizq_favorites.html');
      fav.setAttribute('aria-label', 'المفضلة العامة');
      fav.setAttribute('title', 'المفضلة العامة');
      if (!fav.querySelector('#rmh-fav-badge')) {
        fav.insertAdjacentHTML(
          'beforeend',
          '<span class="rmh-cart-badge rmh-fav-badge" id="rmh-fav-badge" data-rizq-fav-count hidden>0</span>'
        );
      }
    }
  }

  function ensureMockHeader() {
    if (document.getElementById('rizq-mock-hdr')) {
      try { migrateCartToLink(); } catch (eM) {}
      applyNavHrefs();
      markActiveFromPage();
      return;
    }
    document.body.insertAdjacentHTML('afterbegin', mockHeaderHtml());
    markActiveFromPage();
  }

  function applyNavHrefs() {
    var h = navHrefs();
    Object.keys(h).forEach(function (key) {
      var a = document.querySelector('.rmh-nav a[data-rmh="' + key + '"]');
      if (a) a.setAttribute('href', h[key]);
    });
    var cats = document.querySelector('.rmh-more-menu a.rmh-more-item[href="#categories"], .rmh-more-menu a.rmh-more-item[href*="browse"]');
    if (cats) cats.setAttribute('href', h.cats);
  }

  function markActiveFromPage() {
    var k = pageKey();
    var map = {
      rizq_landing_v8: 'home',
      index: 'home',
      '': 'home',
      rizq_browse: 'ads',
      rizq_listing: 'ads',
      rizq_post: 'post',
      rizq_directory: 'stores',
      rizq_store: 'stores',
      rizq_products: 'stores',
      rizq_cart: 'stores',
      rizq_showroom: 'showrooms',
      rizq_showroom_directory: 'showrooms',
      rizq_corp: 'showrooms',
      rizq_estate: 'estate',
      rizq_estate_directory: 'estate',
      rizq_estate_agencies: 'estate',
      rizq_office: 'offices',
      rizq_tenders: 'tenders',
      rizq_tenders_directory: 'tenders',
      rizq_tender_detail: 'tenders',
      rizq_investments: 'investments',
      rizq_investments_directory: 'investments',
      rizq_investment_detail: 'investments'
    };
    var active = map[k] || '';
    if (!active || isLanding()) return;
    document.querySelectorAll('.rmh-nav a[data-rmh]').forEach(function (a) {
      var on = a.getAttribute('data-rmh') === active;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  var DEMO_CART = [
    { id: 'demo-s1', name: 'هاتف ذكي', nameF: 'Smartphone', qty: 1, module: 'store', storeName: 'محل تجريبي' },
    { id: 'demo-r1', name: 'سيارة مستعملة', nameF: 'Voiture', qty: 1, module: 'showroom', storeName: 'معرض تجريبي' },
    { id: 'demo-o1', name: 'استشارة قانونية', nameF: 'Consultation', qty: 1, module: 'office', storeName: 'مكتب تجريبي' },
  ];

  function readCart() {
    try {
      var c = JSON.parse(localStorage.getItem('rizq_cart') || '[]');
      return Array.isArray(c) ? c : [];
    } catch (e) {
      return [];
    }
  }

  function readCartForPanel() {
    var c = readCart();
    if (c.length) return c;
    // معاينة النموذج فقط عند الفراغ — لا تُكتب في localStorage ولا تُحسب في الشارة
    return (DEMO_CART || []).slice();
  }

  function readWishlistCount() {
    try {
      if (window.RizqUx && typeof window.RizqUx.harvestLocalWishlists === 'function') {
        window.RizqUx.harvestLocalWishlists({ silent: true });
      }
      if (window.RizqUx && typeof window.RizqUx.wishlistIds === 'function') {
        return window.RizqUx.wishlistIds().length;
      }
      var ids = JSON.parse(localStorage.getItem('rizq_wishlist') || '[]');
      return Array.isArray(ids) ? ids.length : 0;
    } catch (e) {
      return 0;
    }
  }

  function moduleOf(item) {
    var m = String((item && item.module) || '').toLowerCase();
    if (m === 'showroom' || m === 'corp') return 'showroom';
    if (m === 'office') return 'office';
    if (m === 'store') return 'store';
    // تخمين من الرابط/النوع إن وُجد
    var sid = String((item && (item.storeId || item.accountId)) || '');
    if (/showroom|corp|demo-corp/i.test(sid)) return 'showroom';
    if (/office/i.test(sid)) return 'office';
    return 'store';
  }

  function groupCart(items) {
    var g = { store: [], showroom: [], office: [] };
    items.forEach(function (it) {
      g[moduleOf(it)].push(it);
    });
    return g;
  }

  function qtySum(list) {
    return list.reduce(function (n, it) {
      return n + Math.max(1, Number(it.qty) || 1);
    }, 0);
  }

  function refreshFavBadge() {
    var badge = document.getElementById('rmh-fav-badge');
    if (!badge) return;
    var n = readWishlistCount();
    badge.textContent = n > 99 ? '99+' : String(n);
    if (n > 0) {
      badge.hidden = false;
      try { badge.removeAttribute('hidden'); } catch (eH) {}
      badge.classList.remove('is-empty');
    } else {
      badge.hidden = true;
      badge.classList.add('is-empty');
    }
    var link = document.querySelector('.rmh-fav-link');
    if (link) {
      var fr = false;
      try { fr = (localStorage.getItem('rizq_lang') || 'ar') === 'fr'; } catch (eL) {}
      var lbl = n > 0
        ? (fr ? ('Favoris généraux (' + n + ')') : ('المفضلة العامة (' + n + ')'))
        : (fr ? 'Favoris généraux' : 'المفضلة العامة');
      link.setAttribute('aria-label', lbl);
      link.setAttribute('title', lbl);
      link.classList.toggle('has-favs', n > 0);
    }
  }

  function refreshBadge() {
    var badge = document.getElementById('rmh-cart-badge');
    if (!badge) return;
    var n = qtySum(readCart());
    badge.textContent = n > 99 ? '99+' : String(n);
    if (n > 0) {
      badge.hidden = false;
      try { badge.removeAttribute('hidden'); } catch (eH2) {}
      badge.classList.remove('is-empty');
    } else {
      badge.hidden = true;
      badge.classList.add('is-empty');
    }
    var link = document.querySelector('.rmh-cart-link') || document.getElementById('rmh-cart-btn');
    if (link) {
      var fr = false;
      try { fr = (localStorage.getItem('rizq_lang') || 'ar') === 'fr'; } catch (eL) {}
      var lbl = n > 0
        ? (fr ? ('Panier général (' + n + ')') : ('السلة العامة (' + n + ')'))
        : (fr ? 'Panier général' : 'السلة العامة');
      link.setAttribute('aria-label', lbl);
      link.setAttribute('title', lbl);
      link.classList.toggle('has-items', n > 0);
      if (link.tagName === 'A') link.setAttribute('href', 'rizq_cart.html');
    }
  }

  function itemLabel(it, fr) {
    if (fr && it.nameF) return it.nameF;
    return it.name || it.nameF || (fr ? 'Article' : 'منتج');
  }

  /* أُلغيت النافذة المنبثقة — أيقونة السلة تفتح rizq_cart.html مباشرة مثل المفضلة */
  function renderCartPanel() { /* no-op */ }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fillCategories() {
    var sel = document.getElementById('rmh-search-cat');
    var hero = document.getElementById('hero-search-cat-select');
    if (!sel) return;
    if (hero && hero.options.length > 1) {
      sel.innerHTML = hero.innerHTML;
      return;
    }
    var defaults = [
      ['عقارات', 'عقارات'],
      ['سيارات', 'سيارات'],
      ['إلكترونيات', 'إلكترونيات'],
      ['ذهب ومجوهرات', 'ذهب'],
      ['ماشية', 'ماشية'],
    ];
    defaults.forEach(function (pair) {
      var o = document.createElement('option');
      o.value = pair[0];
      o.textContent = pair[1];
      sel.appendChild(o);
    });
  }

  function closeCart() {
    /* لا نافذة منبثقة بعد الآن */
    var stale = document.getElementById('rmh-cart-panel');
    if (stale && stale.parentNode) {
      try { stale.parentNode.removeChild(stale); } catch (eR) {}
    }
  }

  function placeCartPanel() { /* no-op */ }
  function openCart() {
    try { location.href = 'rizq_cart.html'; } catch (eGo) {}
  }

  function wireCart() {
    var btn = document.getElementById('rmh-cart-btn');
    if (!btn) return;
    if (btn.tagName === 'A') {
      btn.setAttribute('href', 'rizq_cart.html');
      return;
    }
    /* توافق قديم إن بقي زر بدل الرابط */
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      location.href = 'rizq_cart.html';
    });
  }

  function currentMockLang() {
    try {
      var ls = localStorage.getItem('rizq_lang');
      if (ls === 'fr' || ls === 'ar') return ls;
    } catch (e) {}
    if (document.documentElement.lang === 'fr') return 'fr';
    if (document.body && document.body.classList.contains('rizq-lang-fr')) return 'fr';
    return 'ar';
  }

  function tMock(ar, fr) {
    return currentMockLang() === 'fr' ? fr : ar;
  }

  /** يمنع تسرب العربية في الهيدر عند اختيار الفرنسية */
  var __rmhLangBusy = false;
  function applyMockLang() {
    if (__rmhLangBusy) return;
    var hdr = document.getElementById('rizq-mock-hdr');
    if (!hdr) return;
    __rmhLangBusy = true;
    try {
    var fr = currentMockLang() === 'fr';
    var wantLang = fr ? 'fr' : 'ar';
    var wantDir = fr ? 'ltr' : 'rtl';
    if (document.documentElement.lang !== wantLang) document.documentElement.lang = wantLang;
    if (document.documentElement.getAttribute('dir') !== wantDir) document.documentElement.setAttribute('dir', wantDir);
    document.body.classList.toggle('rizq-lang-fr', fr);

    var nav = {
      home: ['الرئيسية', 'Accueil'],
      ads: ['الإعلانات', 'Annonces'],
      stores: ['المحلات', 'Boutiques'],
      showrooms: ['المعارض و المصانع', 'Showrooms & usines'],
      estate: ['سوق العقارات', 'Marché immobilier'],
      offices: ['المكاتب', 'Bureaux'],
      tenders: ['المناقصات', 'Appels d\'offres'],
      investments: ['الاستثمارات', 'Investissements']
    };
    Object.keys(nav).forEach(function (key) {
      var a = hdr.querySelector('.rmh-nav a[data-rmh="' + key + '"]');
      if (!a) return;
      var ico = a.querySelector('.rmh-nav-ico');
      var label = tMock(nav[key][0], nav[key][1]);
      a.setAttribute('aria-label', label);
      var textNode = null;
      for (var i = 0; i < a.childNodes.length; i++) {
        if (a.childNodes[i].nodeType === 3) {
          textNode = a.childNodes[i];
          break;
        }
      }
      if (textNode) textNode.textContent = label;
      else if (ico) ico.insertAdjacentText('afterend', label);
      else a.appendChild(document.createTextNode(label));
    });

    var postLbl = hdr.querySelector('.rmh-post-lbl');
    if (postLbl) postLbl.textContent = tMock('انشر إعلان', 'Publier');
    var postA = hdr.querySelector('a[data-rmh="post"]');
    if (postA) postA.setAttribute('aria-label', tMock('انشر إعلان', 'Publier une annonce'));

    var moreLbl = hdr.querySelector('.rmh-more-lbl');
    if (moreLbl) moreLbl.textContent = tMock('المزيد', 'Plus');
    var moreBtn = document.getElementById('rmh-more-btn');
    if (moreBtn) moreBtn.setAttribute('aria-label', tMock('المزيد', 'Plus'));

    var moreItems = [
      ['الأقسام', 'Catégories'],
      ['Rizq ADS', 'Rizq ADS'],
      ['المواد القانونية', 'Mentions légales'],
      ['من نحن', 'À propos'],
      ['لماذا رزق', 'Pourquoi Rizq'],
      ['الشركة المالكة', 'Société propriétaire']
    ];
    hdr.querySelectorAll('.rmh-more-item strong').forEach(function (el, idx) {
      if (moreItems[idx]) el.textContent = tMock(moreItems[idx][0], moreItems[idx][1]);
    });

    var helpItems = hdr.querySelectorAll('.rizq-help-dd-item-lbl');
    if (helpItems[0]) helpItems[0].textContent = tMock('اتصل بنا', 'Nous contacter');
    if (helpItems[1]) helpItems[1].textContent = tMock('مركز المساعدة', 'Centre d\'aide');
    var helpBtn = document.getElementById('rmh-help-btn');
    if (helpBtn) {
      var ht = tMock('المساعدة والدعم', 'Aide & support');
      helpBtn.setAttribute('aria-label', ht);
      helpBtn.setAttribute('title', ht);
    }

    var cat = document.getElementById('rmh-search-cat');
    if (cat) {
      cat.setAttribute('aria-label', tMock('كل الأقسام', 'Toutes les catégories'));
      if (cat.options && cat.options[0] && !cat.options[0].value) {
        cat.options[0].textContent = tMock('كل الأقسام', 'Toutes les catégories');
      }
    }
    var q = document.getElementById('rmh-search-q');
    if (q) {
      q.placeholder = fr
        ? (q.getAttribute('data-ph-fr') || 'Cherchez une voiture, un appartement, un magasin, un bureau...')
        : 'ابحث عن سيارة، شقة، محل، مكتب...';
    }
    var searchBtn = hdr.querySelector('.rmh-search-btn');
    if (searchBtn) searchBtn.setAttribute('aria-label', tMock('بحث', 'Rechercher'));

    var accountBtn = hdr.querySelector('.rmh-tools .rmh-ico[onclick*="goToAccount"]');
    if (accountBtn) accountBtn.setAttribute('aria-label', tMock('حسابي', 'Mon compte'));
    var fav = hdr.querySelector('.rmh-fav-link') || hdr.querySelector('.rmh-tools a.rmh-ico[href*="fav"]');
    if (fav) {
      fav.setAttribute('aria-label', tMock('المفضلة العامة', 'Favoris généraux'));
      fav.setAttribute('title', tMock('المفضلة العامة', 'Favoris généraux'));
    }
    var cartBtn = document.getElementById('rmh-cart-btn');
    if (cartBtn) {
      cartBtn.setAttribute('aria-label', tMock('السلة العامة', 'Panier général'));
      cartBtn.setAttribute('title', tMock('السلة العامة', 'Panier général'));
      if (cartBtn.tagName === 'A') cartBtn.setAttribute('href', 'rizq_cart.html');
    }
    closeCart();

    hdr.setAttribute('aria-label', tMock('شريط رزق', 'Barre Rizq'));
    var navEl = hdr.querySelector('nav.rmh-nav');
    if (navEl) navEl.setAttribute('aria-label', tMock('أقسام رزق', 'Rubriques Rizq'));
    var topNav = document.getElementById('rmh-nav-top');
    if (topNav) topNav.setAttribute('aria-label', tMock('أقسام رزق — أعلى', 'Rubriques Rizq — haut'));

    try { refreshBadge(); } catch (eCart) {}
    try { ensureHeroTagline(); } catch (eHero) {}
    } finally { __rmhLangBusy = false; }
  }

  function wireLang() {
    var btn = document.getElementById('rmh-lang-btn');
    var navLang = document.getElementById('nav-lang-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (navLang) navLang.click();
      else if (typeof toggleLang === 'function') toggleLang();
      else if (typeof toggleLangPage === 'function') toggleLangPage();
      else {
        var next = currentMockLang() === 'ar' ? 'fr' : 'ar';
        try { localStorage.setItem('rizq_lang', next); } catch (e) {}
        document.documentElement.lang = next;
        document.dispatchEvent(new CustomEvent('rizq:langchange', { bubbles: true, detail: { lang: next } }));
      }
      setTimeout(applyMockLang, 30);
      setTimeout(applyMockLang, 200);
    });
    document.addEventListener('rizq:langchange', function () {
      applyMockLang();
    });
  }

  /* مفاتيح التبويب التي تتبع التمرير داخل الصفحة */
  var SPY_KEYS = ['home', 'ads', 'stores', 'showrooms', 'estate', 'offices'];
  var spyLockKey = '';
  var spyLockUntil = 0;

  function headerOffset() {
    var hdr = document.getElementById('rizq-mock-hdr');
    var h = hdr ? hdr.getBoundingClientRect().height : 0;
    return Math.ceil(h || 188) + 8;
  }

  function spySections() {
    return [
      { key: 'home', el: document.getElementById('hero') || document.querySelector('.hero') },
      { key: 'ads', el: document.getElementById('listings') },
      { key: 'stores', el: document.getElementById('virtual-stores') },
      { key: 'showrooms', el: document.getElementById('virtual-showrooms') },
      { key: 'estate', el: document.getElementById('virtual-estate') },
      { key: 'offices', el: document.getElementById('virtual-offices') },
    ].filter(function (s) {
      return s.el;
    });
  }

  function setSpyActive(key) {
    if (SPY_KEYS.indexOf(key) === -1) return;
    document.querySelectorAll('.rmh-nav a[data-rmh]').forEach(function (a) {
      var k = a.getAttribute('data-rmh');
      if (SPY_KEYS.indexOf(k) === -1) return;
      var on = k === key;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  function resolveSpyKey() {
    var sections = spySections();
    if (!sections.length) return 'home';
    if (window.scrollY < 60) return 'home';
    /* خط التركيز مباشرة تحت الهيدر الثابت */
    var focusY = headerOffset() + 28;
    var current = sections[0].key;
    for (var i = 0; i < sections.length; i++) {
      var top = sections[i].el.getBoundingClientRect().top;
      if (top <= focusY) current = sections[i].key;
    }
    return current;
  }

  function updateSpy() {
    if (Date.now() < spyLockUntil && spyLockKey) {
      setSpyActive(spyLockKey);
      return;
    }
    spyLockKey = '';
    setSpyActive(resolveSpyKey());
  }

  function scrollToSpyTarget(el) {
    if (!el) return;
    var top = Math.max(0, Math.round(el.getBoundingClientRect().top + window.pageYOffset - headerOffset()));
    try {
      window.scrollTo({ top: top, left: 0, behavior: 'smooth' });
    } catch (err) {
      window.scrollTo(0, top);
    }
  }

  function wireNavActive() {
    document.querySelectorAll('.rmh-nav a[data-rmh]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        /* أي تنقّل في الشريط يغلق النوافذ المنبثقة المتداخلة */
        closeCart();
        closeMore();
        closeHelp();
        var key = a.getAttribute('data-rmh');
        var href = a.getAttribute('href') || '';
        if (SPY_KEYS.indexOf(key) === -1) return;
        if (href.charAt(0) !== '#') return;
        e.preventDefault();
        var id = href.slice(1);
        var target =
          (id && document.getElementById(id)) ||
          (key === 'home' ? document.getElementById('hero') || document.querySelector('.hero') : null);
        spyLockKey = key;
        spyLockUntil = Date.now() + 1200;
        setSpyActive(key);
        scrollToSpyTarget(target);
        try {
          if (id) history.replaceState(null, '', '#' + id);
        } catch (err) { /* ignore */ }
        requestAnimationFrame(updateSpy);
        setTimeout(updateSpy, 100);
        setTimeout(updateSpy, 400);
      });
    });

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        updateSpy();
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateSpy);
    document.addEventListener('visibilitychange', updateSpy);
    updateSpy();
    setTimeout(updateSpy, 300);
    setTimeout(updateSpy, 1200);
  }

  var __rmhMoreLeave = null;
  var __rmhHelpLeave = null;
  var __rmhMoreHome = null;
  var __rmhHelpHome = null;

  function closeMore() {
    var wrap = document.querySelector('.rmh-more-wrap');
    var btn = document.getElementById('rmh-more-btn');
    var menu = document.getElementById('rmh-more-menu');
    if (__rmhMoreLeave) clearTimeout(__rmhMoreLeave);
    __rmhMoreLeave = null;
    if (wrap) wrap.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (!menu) return;
    menu.hidden = true;
    menu.classList.remove('is-positioned');
    menu.style.removeProperty('display');
    menu.style.removeProperty('position');
    menu.style.removeProperty('left');
    menu.style.removeProperty('right');
    menu.style.removeProperty('top');
    menu.style.removeProperty('transform');
    menu.style.removeProperty('z-index');
    /* أعد القائمة لمكانها الأصلي حتى لا تبقى عالقة فوق الصفحة */
    if (__rmhMoreHome && menu.parentNode !== __rmhMoreHome) {
      __rmhMoreHome.appendChild(menu);
    }
  }

  function placeMoreMenu() {
    var btn = document.getElementById('rmh-more-btn');
    var menu = document.getElementById('rmh-more-menu');
    if (!btn || !menu) return;
    /* خارج .rmh-nav (overflow) حتى تُقبل النقرات على العناصر */
    if (menu.parentNode !== document.body) {
      if (!__rmhMoreHome) __rmhMoreHome = menu.parentNode;
      document.body.appendChild(menu);
    }
    var br = btn.getBoundingClientRect();
    var menuW = Math.max(176, Math.round(menu.offsetWidth || 176));
    var left = Math.round(br.left + br.width / 2 - menuW / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
    var top;
    if (isPhone()) {
      var mh = Math.min(menu.offsetHeight || 220, window.innerHeight * 0.55);
      top = Math.max(8, Math.round(br.top - mh - 8));
    } else {
      top = Math.round(br.bottom + 6);
    }
    menu.classList.add('is-positioned');
    menu.style.setProperty('position', 'fixed', 'important');
    menu.style.setProperty('left', left + 'px', 'important');
    menu.style.setProperty('right', 'auto', 'important');
    menu.style.setProperty('top', top + 'px', 'important');
    menu.style.setProperty('transform', 'none', 'important');
    menu.style.setProperty('z-index', '10080', 'important');
    menu.style.setProperty('display', 'flex', 'important');
  }

  function openMore() {
    var wrap = document.querySelector('.rmh-more-wrap');
    var btn = document.getElementById('rmh-more-btn');
    var menu = document.getElementById('rmh-more-menu');
    if (!wrap || !btn || !menu) return;
    closeCart();
    closeHelp();
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    placeMoreMenu();
    requestAnimationFrame(placeMoreMenu);
  }

  function wireMore() {
    var wrap = document.querySelector('.rmh-more-wrap');
    var btn = document.getElementById('rmh-more-btn');
    var menu = document.getElementById('rmh-more-menu');
    if (!wrap || !btn || !menu) return;
    if (!__rmhMoreHome) __rmhMoreHome = menu.parentNode;

    function scheduleClose() {
      clearTimeout(__rmhMoreLeave);
      __rmhMoreLeave = setTimeout(function () {
        if (wrap.matches(':hover') || menu.matches(':hover')) return;
        closeMore();
      }, 160);
    }

    function fineHover() {
      try { return window.matchMedia('(hover:hover) and (pointer:fine)').matches; } catch (err) { return false; }
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (wrap.classList.contains('open')) closeMore();
      else openMore();
    });
    wrap.addEventListener('mouseenter', function () {
      if (!fineHover()) return;
      clearTimeout(__rmhMoreLeave);
      openMore();
    });
    wrap.addEventListener('mouseleave', function () {
      if (!fineHover()) return;
      scheduleClose();
    });
    menu.addEventListener('mouseenter', function () { clearTimeout(__rmhMoreLeave); });
    menu.addEventListener('mouseleave', scheduleClose);
    menu.addEventListener('click', function (e) {
      /* رابط داخل القائمة — أغلق بعد اختيار العنصر */
      var a = e.target && e.target.closest ? e.target.closest('a.rmh-more-item') : null;
      if (a) setTimeout(closeMore, 0);
    });
    document.addEventListener('click', function (e) {
      if (!wrap.classList.contains('open')) return;
      if (wrap.contains(e.target) || menu.contains(e.target)) return;
      closeMore();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMore();
    });
    window.addEventListener('resize', function () {
      if (wrap.classList.contains('open')) placeMoreMenu();
    });
    window.addEventListener('scroll', function () {
      if (wrap.classList.contains('open')) placeMoreMenu();
    }, true);
  }

  function clearHelpMenuInline() {
    var menu = document.getElementById('rmh-help-menu');
    if (!menu) return;
    menu.classList.remove('is-positioned');
    /* يجب إزالة display وإلا يبقى flex!important مضمّناً ويمنع [hidden] */
    ['position', 'left', 'right', 'top', 'transform', 'z-index', 'display', 'flex-direction', 'pointer-events'].forEach(function (p) {
      menu.style.removeProperty(p);
    });
  }

  function closeHelp() {
    var wrap = document.getElementById('rmh-help-wrap');
    var btn = document.getElementById('rmh-help-btn');
    var menu = document.getElementById('rmh-help-menu');
    if (__rmhHelpLeave) clearTimeout(__rmhHelpLeave);
    __rmhHelpLeave = null;
    if (wrap) wrap.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (!menu) return;
    menu.hidden = true;
    menu.setAttribute('hidden', '');
    clearHelpMenuInline();
    if (__rmhHelpHome && menu.parentNode !== __rmhHelpHome) {
      __rmhHelpHome.appendChild(menu);
    }
  }

  function placeHelpMenu() {
    var btn = document.getElementById('rmh-help-btn');
    var menu = document.getElementById('rmh-help-menu');
    if (!btn || !menu || menu.hidden) return;
    if (menu.parentNode !== document.body) {
      if (!__rmhHelpHome) __rmhHelpHome = menu.parentNode;
      document.body.appendChild(menu);
    }
    var br = btn.getBoundingClientRect();
    var menuW = Math.max(168, Math.round(menu.getBoundingClientRect().width || menu.offsetWidth || 168));
    var left = Math.round(br.left + br.width / 2 - menuW / 2);
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
    var top = Math.round(br.bottom + 8);
    menu.classList.add('is-positioned');
    menu.style.setProperty('position', 'fixed', 'important');
    menu.style.setProperty('left', left + 'px', 'important');
    menu.style.setProperty('right', 'auto', 'important');
    menu.style.setProperty('top', top + 'px', 'important');
    menu.style.setProperty('transform', 'none', 'important');
    menu.style.setProperty('z-index', '10070', 'important');
    menu.style.setProperty('pointer-events', 'auto', 'important');
    /* لا تفرض display مضمّناً — CSS :not([hidden]) يتولى الإظهار/الإخفاء */
  }

  function openHelp() {
    var wrap = document.getElementById('rmh-help-wrap');
    var btn = document.getElementById('rmh-help-btn');
    var menu = document.getElementById('rmh-help-menu');
    if (!wrap || !btn || !menu) return;
    closeCart();
    closeMore();
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    menu.removeAttribute('hidden');
    placeHelpMenu();
    requestAnimationFrame(placeHelpMenu);
  }

  var __rmhHelpIgnoreDoc = 0;

  function wireHelp() {
    var wrap = document.getElementById('rmh-help-wrap');
    var btn = document.getElementById('rmh-help-btn');
    var menu = document.getElementById('rmh-help-menu');
    if (!wrap || !btn || !menu) return;
    if (wrap.getAttribute('data-rmh-help-bound') === '1') return;
    wrap.setAttribute('data-rmh-help-bound', '1');
    if (!__rmhHelpHome) __rmhHelpHome = menu.parentNode;

    /*
     * فتح/إغلاق بالنقر فقط — القائمة تُنقل إلى body فلا يعمل hover
     * (مغادرة الزر تُغلق قبل الوصول للروابط وتبدو «جامدة»).
     */
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      __rmhHelpIgnoreDoc = Date.now() + 450;
      if (wrap.classList.contains('open') && !menu.hidden) closeHelp();
      else openHelp();
    });
    menu.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      __rmhHelpIgnoreDoc = Date.now() + 450;
      /* اترك التنقل يحدث ثم أغلق */
      setTimeout(closeHelp, 10);
    });
    document.addEventListener('click', function (e) {
      if (Date.now() < __rmhHelpIgnoreDoc) return;
      if (menu.hidden && !wrap.classList.contains('open')) return;
      if (wrap.contains(e.target) || menu.contains(e.target)) return;
      closeHelp();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeHelp();
    });
  }

  /* هاتف: نفس التقسيم 5/5 — تبديل المواقع فقط
     أسفل قرب الإبهام: الرئيسية·الإعلانات·المحلات·المعارض·سوق العقارات
     أعلى: المكاتب·الاستثمارات·نشر·المناقصات·المزيد */
  var RMH_NAV_BOTTOM_ORDER = ['home', 'ads', 'stores', 'showrooms', 'estate'];
  var RMH_NAV_TOP_ORDER = ['offices', 'investments', 'post', 'tenders', 'more'];
  var __rmhNavSlots = null;

  function captureNavSlots(bottomNav) {
    if (__rmhNavSlots || !bottomNav) return;
    __rmhNavSlots = Array.prototype.map.call(bottomNav.children, function (el) {
      var key = el.getAttribute('data-rmh');
      if (!key && el.classList && el.classList.contains('rmh-more-wrap')) key = 'more';
      return { key: key || '', el: el };
    });
  }

  function navKeyOf(el) {
    if (!el) return '';
    var key = el.getAttribute('data-rmh');
    if (key) return key;
    if (el.classList && el.classList.contains('rmh-more-wrap')) return 'more';
    return '';
  }

  function slotByKey(key) {
    if (!__rmhNavSlots) return null;
    for (var i = 0; i < __rmhNavSlots.length; i++) {
      if (__rmhNavSlots[i].key === key) return __rmhNavSlots[i];
    }
    return null;
  }

  function appendOrdered(nav, orderKeys) {
    if (!nav) return;
    orderKeys.forEach(function (key) {
      var slot = slotByKey(key);
      if (slot && slot.el && slot.el.parentNode !== nav) nav.appendChild(slot.el);
      else if (slot && slot.el) nav.appendChild(slot.el);
    });
  }

  /** هاتف: تبديل مواقع النصفين فقط + نشر بين الاستثمارات والمناقصات */
  function syncPhoneNavSplit() {
    var hdr = document.getElementById('rizq-mock-hdr');
    if (!hdr) return;
    var bottomNav = hdr.querySelector('nav.rmh-nav:not(.rmh-nav-top)');
    if (!bottomNav) return;
    captureNavSlots(bottomNav);

    var topNav = document.getElementById('rmh-nav-top');

    if (!isPhone()) {
      if (topNav && __rmhNavSlots) {
        __rmhNavSlots.forEach(function (slot) {
          if (slot.el && slot.el.parentNode !== bottomNav) bottomNav.appendChild(slot.el);
        });
        topNav.parentNode && topNav.parentNode.removeChild(topNav);
      }
      document.body.classList.remove('rmh-phone-nav-split');
      return;
    }

    document.body.classList.add('rmh-phone-nav-split');
    if (!topNav) {
      topNav = document.createElement('nav');
      topNav.id = 'rmh-nav-top';
      topNav.className = 'rmh-nav rmh-nav-top';
      topNav.setAttribute('aria-label', 'أقسام رزق — أعلى');
      var main = hdr.querySelector('.rmh-main');
      if (main && main.nextSibling) hdr.insertBefore(topNav, main.nextSibling);
      else if (main) main.insertAdjacentElement('afterend', topNav);
      else hdr.insertBefore(topNav, bottomNav);
    }

    appendOrdered(topNav, RMH_NAV_TOP_ORDER);
    appendOrdered(bottomNav, RMH_NAV_BOTTOM_ORDER);

    /* أي عنصر غير معروف يبقى في الشريط العلوي بعد «المزيد» */
    if (__rmhNavSlots) {
      __rmhNavSlots.forEach(function (slot) {
        if (!slot.el) return;
        if (RMH_NAV_BOTTOM_ORDER.indexOf(slot.key) >= 0) return;
        if (RMH_NAV_TOP_ORDER.indexOf(slot.key) >= 0) return;
        if (slot.el.parentNode !== topNav) topNav.appendChild(slot.el);
      });
    }
  }

  function syncMockHdrHeight() {
    var hdr = document.getElementById('rizq-mock-hdr');
    if (!hdr) return;
    syncPhoneNavSplit();
    var main = hdr.querySelector('.rmh-main');
    var ticker = hdr.querySelector('.ticker-wrap:not(.is-empty)');
    var topNav = document.getElementById('rmh-nav-top');
    var bottomNav = hdr.querySelector('nav.rmh-nav:not(.rmh-nav-top)');
    var topH;
    if (isPhone() && main) {
      topH = Math.ceil(main.getBoundingClientRect().height || 44);
      if (ticker) topH += Math.ceil(ticker.getBoundingClientRect().height || 0);
      if (topNav) topH += Math.ceil(topNav.getBoundingClientRect().height || 48);
      topH = Math.max(topH, 96);
      document.body.style.setProperty('--rizq-mock-hdr-h', topH + 'px');
      if (bottomNav) {
        var nh = Math.ceil(bottomNav.getBoundingClientRect().height || 64);
        document.body.style.setProperty('--rizq-mock-nav-h', nh + 'px');
      }
      return;
    }
    var h = Math.ceil(hdr.getBoundingClientRect().height || 188);
    document.body.style.setProperty('--rizq-mock-hdr-h', h + 'px');
  }

  function ensureHeroTagline() {
    var el = document.getElementById('hero-tagline');
    if (!el) return;
    var fr = document.documentElement.lang === 'fr' || document.body.classList.contains('rizq-lang-fr');
    var ar = 'متجرك الافتراضي · مكتبك المهني · إعلانك المؤسسي — كل شيء في مكان واحد';
    var frTxt = 'Boutique virtuelle · Bureau pro · Pub institutionnelle — tout en un seul endroit';
    var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!txt || txt.length < 12) {
      el.innerHTML =
        '<span class="hero-tagline-lead" data-t="hero-tagline-lead">' +
        (fr ? 'Boutique virtuelle · Bureau pro · Pub institutionnelle' : 'متجرك الافتراضي · مكتبك المهني · إعلانك المؤسسي') +
        '</span><span class="hero-tagline-place" data-t="hero-one-place">' +
        (fr ? ' — tout en un seul endroit' : ' — كل شيء في مكان واحد') +
        '</span>';
    }
    el.hidden = false;
    el.removeAttribute('hidden');
    el.style.setProperty('display', 'block', 'important');
    el.style.setProperty('visibility', 'visible', 'important');
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('color', '#0a1628', 'important');
    el.style.setProperty('-webkit-text-fill-color', '#0a1628', 'important');
  }

  var __rmhBooted = false;
  function bootMockHeader() {
    if (__rmhBooted) return;
    __rmhBooted = true;
    ensureMockCss();
    applyNavHrefs();
    markActiveFromPage();
    fillCategories();
    refreshBadge();
    refreshFavBadge();
    renderCartPanel();
    wireCart();
    wireLang();
    applyMockLang();
    wireHelp();
    wireMore();
    wireNavActive();
    ensureHeroTagline();
    syncMockHdrHeight();
    setTimeout(function () {
      fillCategories();
      applyMockLang();
      ensureHeroTagline();
      syncMockHdrHeight();
      markActiveFromPage();
      refreshBadge();
      refreshFavBadge();
    }, 1200);
    window.addEventListener('resize', syncMockHdrHeight);
    window.addEventListener('storage', function (ev) {
      if (ev.key === 'rizq_cart') {
        refreshBadge();
        renderCartPanel();
      }
      if (
        ev.key === 'rizq_wishlist' ||
        ev.key === 'rizq_wishlist_meta' ||
        (ev.key && ev.key.indexOf('rizq_wishlist_') === 0) ||
        ev.key === 'rizq_showroom_wishlist'
      ) {
        refreshFavBadge();
      }
    });
    document.addEventListener('rizq_wishlist', function () {
      refreshFavBadge();
    });
    document.addEventListener('rizq_cart', function () {
      refreshBadge();
      renderCartPanel();
    });
  }

  /* التشغيل في النهاية — بعد تهيئة DEMO_CART وكل الدوال */
  waitBody(function () {
    document.body.classList.add('rizq-mockup-hdr-trial');
    document.documentElement.classList.add('rizq-app-nav');
    ensureMockCss();
    ensureMockHeader();
    bootMockHeader();
  });
})();
