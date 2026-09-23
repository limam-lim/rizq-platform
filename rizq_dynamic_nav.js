/**
 * rizq_dynamic_nav.js — شريط أقسام ديناميكي + قوائم «المزيد» (Desktop vs Mobile)
 * المصدر الوحيد للأقسام: MODULES — أي قسم جديد يُضاف هنا يظهر تلقائياً في «المزيد» على الجوال.
 */
(function (global) {
  'use strict';

  var MODULES = [
    /* الترتيب = توالي أقسام الصفحة الرئيسية من الأعلى للأسفل */
    { key: 'store', href: 'rizq_store.html', hdr: 'stores', ico: '🏪', order: 3, always: true, landingHref: '#virtual-stores' },
    { key: 'office', href: 'rizq_office.html', hdr: 'offices', ico: '💼', order: 4, landingHref: '#virtual-offices' },
    { key: 'corp', href: 'rizq_showroom.html', hdr: 'showrooms', ico: '🏬', order: 5, landingHref: '#virtual-showrooms' },
    { key: 'tenders', href: 'rizq_tenders.html', hdr: 'tenders', ico: '📋', order: 6, labelAr: 'المناقصات', labelFr: 'Appels d\'offres', landingHref: '#virtual-tenders' },
    { key: 'investments', href: 'rizq_investments.html', hdr: 'investments', ico: '📈', order: 7, labelAr: 'الاستثمارات', labelFr: 'Investissements', landingHref: '#virtual-investments' }
  ];

  var DESKTOP_MORE = [
    { href: 'rizq_landing_v8.html#categories', hdr: 'cats', key: 'cats', ico: '📂', landingHref: '#categories' },
    { href: 'rizq_ads_info.html', hdr: 'rizqads', key: 'rizqads', ico: '🎬' },
    { href: 'rizq_post.html', hdr: 'post', key: 'post', ico: '➕' },
    { href: 'rizq_landing_v8.html#pricing', hdr: 'packs', key: 'packs', ico: '💎', landingHref: '#pricing' },
    { href: 'rizq_legal.html', hdr: 'legal', key: 'legal', ico: '⚖️' },
    { href: 'rizq_landing_v8.html#about', hdr: 'about', key: 'about', ico: 'ℹ️', landingHref: '#about' }
  ];

  /** عناصر ثابتة في «المزيد» على الجوال (بعد أقسام MODULES) */
  var MOBILE_MORE_EXTRAS = [
    { href: 'rizq_browse.html', hdr: 'ads', ico: '📢', landingHref: '#listings' },
    { href: 'rizq_ads_info.html', hdr: 'rizqads', ico: '🎬' },
    { href: 'rizq_post.html', hdr: 'post', ico: '➕' },
    { href: 'rizq_landing_v8.html#pricing', hdr: 'packs', ico: '💎', landingHref: '#pricing' },
    { href: 'rizq_legal.html', hdr: 'legal', ico: '⚖️' },
    { href: 'rizq_landing_v8.html#about', hdr: 'about', ico: 'ℹ️', landingHref: '#about' }
  ];

  /** روابط سطح المكتب الثابتة — الإعلانات بعد الرئيسية مباشرة */
  var DESKTOP_MAIN_EXTRAS = [
    { href: 'rizq_browse.html', hdr: 'ads', ico: '📢', order: 2, landingHref: '#listings', gold: false }
  ];

  var LABELS = {
    stores: { ar: 'المحلات', fr: 'Boutiques' },
    offices: { ar: 'المكاتب', fr: 'Bureaux' },
    showrooms: { ar: 'المعارض', fr: 'Showrooms' },
    tenders: { ar: 'المناقصات', fr: 'Appels d\'offres' },
    investments: { ar: 'الاستثمارات', fr: 'Investissements' },
    ads: { ar: 'الإعلانات', fr: 'Annonces' },
    rizqads: { ar: 'Rizq ADS', fr: 'Rizq ADS' },
    cats: { ar: 'الأقسام', fr: 'Catégories' },
    post: { ar: 'نشر (+)', fr: 'Publier (+)' },
    packs: { ar: 'الباقات', fr: 'Forfaits' },
    legal: { ar: 'المواد القانونية', fr: 'Mentions légales' },
    about: { ar: 'من نحن', fr: 'À propos' }
  };

  function isLanding() {
    try {
      var k = (location.pathname || '').split('/').pop().toLowerCase().replace(/\.html$/, '');
      return !k || k === 'rizq_landing_v8' || k === 'index';
    } catch (e) {
      return false;
    }
  }

  function isPhoneNav() {
    try {
      if (global.RizqViewport && typeof global.RizqViewport.isPhone === 'function') {
        return global.RizqViewport.isPhone();
      }
      return global.matchMedia('(max-width:768px), (orientation:landscape) and (max-height:500px)').matches;
    } catch (e) {
      return false;
    }
  }

  function lang() {
    try {
      if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') {
        return global.RizqI18n.getLang();
      }
      return localStorage.getItem('rizq_lang') || 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t(ar, fr) {
    return lang() === 'fr' ? fr : ar;
  }

  function labelFor(item) {
    if (item.labelAr) return lang() === 'fr' ? (item.labelFr || (LABELS[item.hdr] && LABELS[item.hdr].fr)) : item.labelAr;
    var L = LABELS[item.hdr];
    if (L) return t(L.ar, L.fr);
    return item.hdr || '';
  }

  function moduleOpen(flags, key) {
    if (!flags || typeof flags !== 'object') return key === 'store';
    var mod = MODULES.filter(function (m) { return m.key === key; })[0];
    if (mod && mod.always) return true;
    return flags[key] !== false;
  }

  function resolveHref(item, onLanding) {
    if (onLanding && item.landingHref) return item.landingHref;
    return item.href;
  }

  /** قائمة «المزيد» على الجوال = كل MODULES المفعّلة + عناصر ثابتة */
  function getMobileMoreItems() {
    var fromModules = MODULES.map(function (m) {
      return {
        module: m.key,
        href: m.href,
        hdr: m.hdr,
        ico: m.ico,
        labelAr: m.labelAr,
        labelFr: m.labelFr,
        landingHref: m.landingHref
      };
    });
    return fromModules.concat(MOBILE_MORE_EXTRAS);
  }

  function ensureModuleSlots(container) {
    if (!container || container.getAttribute('data-rizq-modules-ready')) return;
    var onLanding = isLanding();
    var moreLi = container.querySelector('#nav-more-li, #rizq-desk-more-li');
    var aiLi = container.querySelector('#rizq-hdr-assistant, #rizq-desk-assistant, #nav-assistant-btn');
    aiLi = aiLi ? aiLi.closest('li') || aiLi.parentElement : null;
    if (!aiLi && container.classList.contains('rizq-hdr-row2')) {
      aiLi = container.querySelector('#rizq-hdr-assistant');
    }

    MODULES.forEach(function (mod) {
      var sel = '[data-rizq-module="' + mod.key + '"]';
      var existing = container.querySelector(sel);
      if (existing) {
        var existingA = existing.tagName === 'A' ? existing : existing.querySelector('a');
        if (existingA) existingA.href = resolveHref(mod, onLanding);
        existing.setAttribute('data-nav-order', String(mod.order));
        return;
      }
      var el;
      if (container.classList.contains('rizq-hdr-row2')) {
        el = document.createElement('a');
        el.className = 'rizq-hdr-item rizq-nav-module';
        el.href = resolveHref(mod, onLanding);
        el.setAttribute('data-rizq-module', mod.key);
        el.setAttribute('data-nav-order', String(mod.order));
        el.innerHTML = '<span class="rizq-hdr-ico">' + mod.ico + '</span><span class="rizq-hdr-lbl" data-hdr="' + mod.hdr + '">' + labelFor(mod) + '</span>';
        var aiBtn = container.querySelector('#rizq-hdr-assistant');
        if (aiBtn) container.insertBefore(el, aiBtn);
        else container.appendChild(el);
      } else {
        el = document.createElement('li');
        el.className = 'rizq-nav-module';
        el.setAttribute('data-rizq-module', mod.key);
        el.setAttribute('data-nav-order', String(mod.order));
        el.innerHTML = '<a href="' + resolveHref(mod, onLanding) + '" data-hdr="' + mod.hdr + '">' + labelFor(mod) + '</a>';
        if (moreLi && moreLi.parentNode) moreLi.parentNode.insertBefore(el, moreLi);
        else if (aiLi && aiLi.parentNode) aiLi.parentNode.insertBefore(el, aiLi);
        else container.appendChild(el);
      }
    });
    container.setAttribute('data-rizq-modules-ready', '1');
  }

  function ensureDesktopMainExtras(container) {
    if (!container || container.classList.contains('rizq-hdr-row2')) return;
    var onLanding = isLanding();
    var insertAfter = container.querySelector('[data-nav-order="1"]');
    DESKTOP_MAIN_EXTRAS.forEach(function (item) {
      var sel = '[data-rizq-nav-extra="' + item.hdr + '"]';
      var existing = container.querySelector(sel);
      if (existing) {
        var a0 = existing.querySelector('a') || (existing.tagName === 'A' ? existing : null);
        if (a0) a0.href = resolveHref(item, onLanding);
        existing.setAttribute('data-nav-order', String(item.order));
        insertAfter = existing;
        return;
      }
      var li = document.createElement('li');
      li.className = 'rizq-nav-extra';
      li.setAttribute('data-rizq-nav-extra', item.hdr);
      li.setAttribute('data-nav-order', String(item.order));
      var a = document.createElement('a');
      a.href = resolveHref(item, onLanding);
      a.setAttribute('data-hdr', item.hdr);
      a.textContent = labelFor(item);
      li.appendChild(a);
      if (insertAfter && insertAfter.parentNode) {
        insertAfter.parentNode.insertBefore(li, insertAfter.nextSibling);
        insertAfter = li;
      } else {
        container.appendChild(li);
        insertAfter = li;
      }
    });
  }

  function applyMainBar(flags) {
    var phone = isPhoneNav();
    var onLanding = isLanding();
    document.querySelectorAll('#nav .nav-center, #rizq-desk-nav .nav-center, #rizq-app-header .rizq-hdr-row2').forEach(function (container) {
      ensureModuleSlots(container);
      ensureDesktopMainExtras(container);
      MODULES.forEach(function (mod) {
        var open = moduleOpen(flags, mod.key);
        container.querySelectorAll('[data-rizq-module="' + mod.key + '"]').forEach(function (el) {
          var link = el.tagName === 'A' ? el : el.querySelector('a');
          if (link) link.href = resolveHref(mod, onLanding);
          el.setAttribute('data-nav-order', String(mod.order));
          /* على الهبوط: أظهر كل الأقسام في الشريط (تمرير أفقي) حسب ترتيب الصفحة */
          if (phone && !onLanding) {
            el.style.display = 'none';
            return;
          }
          if (open || mod.always) el.style.removeProperty('display');
          else el.style.display = 'none';
        });
      });
      container.querySelectorAll('[data-rizq-nav-extra]').forEach(function (el) {
        if (phone && !onLanding) el.style.display = 'none';
        else el.style.removeProperty('display');
      });
      container.querySelectorAll('#rizq-hdr-assistant, #rizq-desk-assistant, #nav-assistant-btn').forEach(function (ai) {
        var li = ai.closest('li') || ai;
        if (li.setAttribute) li.setAttribute('data-nav-order', '9');
      });
      container.querySelectorAll('#rizq-hdr-more-wrap, #rizq-desk-more-li, #nav-more-li').forEach(function (more) {
        more.style.display = '';
        if (more.setAttribute) more.setAttribute('data-nav-order', '8');
      });
    });
  }

  function rebuildMoreMenu(menu, items, flags, variant) {
    if (!menu) return;
    menu.setAttribute('data-rizq-more-variant', variant);
    menu.innerHTML = '';
    var onLanding = isLanding();
    items.forEach(function (item) {
      if (item.module && !moduleOpen(flags, item.module)) return;
      var href = resolveHref(item, onLanding);
      var a = document.createElement('a');
      a.setAttribute('role', 'menuitem');
      a.href = href;
      a.setAttribute('data-hdr', item.hdr);
      if (variant === 'desktop') {
        a.className = 'nav-dd-item rizq-more-desktop-item';
        a.innerHTML = '<span class="nav-dd-icon">' + (item.ico || '•') + '</span><div><strong data-hdr="' + item.hdr + '">' + labelFor(item) + '</strong></div>';
      } else if (menu.classList.contains('rizq-hdr-more-menu')) {
        a.className = 'nav-dd-item rizq-more-mobile-item';
        a.innerHTML = '<span class="nav-dd-icon">' + (item.ico || '•') + '</span><div><strong data-hdr="' + item.hdr + '">' + labelFor(item) + '</strong></div>';
      } else {
        a.className = 'nav-dd-item rizq-more-mobile-item';
        a.innerHTML = '<span class="nav-dd-icon">' + (item.ico || '•') + '</span><div><strong data-hdr="' + item.hdr + '">' + labelFor(item) + '</strong></div>';
      }
      menu.appendChild(a);
    });
  }

  function rebuildMobileDrawerList(flags) {
    var list = document.getElementById('mobile-drawer-list');
    if (!list) return;
    list.innerHTML = '';
    var onLanding = isLanding();
    getMobileMoreItems().forEach(function (item) {
      if (item.module && !moduleOpen(flags, item.module)) return;
      var href = resolveHref(item, onLanding);
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = href;
      a.setAttribute('data-hdr', item.hdr);
      var label = labelFor(item);
      a.textContent = (item.ico ? item.ico + ' ' : '') + label;
      if (item.hdr === 'rizqads') {
        a.style.color = 'var(--gold)';
      }
      a.addEventListener('click', function () {
        if (typeof global.closeMobileNav === 'function') global.closeMobileNav();
      });
      li.appendChild(a);
      list.appendChild(li);
    });
  }

  function applyMoreMenus(flags) {
    flags = flags && typeof flags === 'object' ? flags : {
      individual: true, store: true, office: true, corp: true, tenders: true, investments: true, videoAds: true
    };
    var mobileItems = getMobileMoreItems();
    document.querySelectorAll('#rizq-desk-more-li .nav-dropdown-menu, #nav-more-li .nav-dropdown-menu').forEach(function (menu) {
      var isMobile = isPhoneNav();
      var onLanding = isLanding();
      if (menu.closest('#nav-more-li') && isMobile) {
        rebuildMoreMenu(menu, mobileItems, flags, 'mobile');
        menu.setAttribute('data-rizq-more-variant', 'mobile');
      } else {
        rebuildMoreMenu(menu, DESKTOP_MORE, flags, 'desktop');
      }
    });
    document.querySelectorAll('#rizq-hdr-more-menu').forEach(function (menu) {
      rebuildMoreMenu(menu, mobileItems, flags, 'mobile');
    });
    rebuildMobileDrawerList(flags);
  }

  function ensureMoreMenusFilled() {
    document.querySelectorAll('#rizq-desk-more-li .nav-dropdown-menu, #nav-more-li .nav-dropdown-menu, #rizq-hdr-more-menu').forEach(function (menu) {
      if (menu && menu.children.length === 0) {
        applyMoreMenus(_lastApplied);
      }
    });
    if (document.getElementById('mobile-drawer-list') && !document.getElementById('mobile-drawer-list').children.length) {
      applyMoreMenus(_lastApplied);
    }
  }

  function applySectionHides(flags) {
    var SECTION_MAP = { store: 'virtual-stores', office: 'virtual-offices', corp: 'virtual-showrooms', tenders: 'virtual-tenders', investments: 'virtual-investments' };
    Object.keys(SECTION_MAP).forEach(function (key) {
      if (flags[key] !== false) return;
      var sec = document.getElementById(SECTION_MAP[key]);
      if (sec) sec.style.display = 'none';
    });
    if (flags.store === false && flags.office === false && flags.corp === false) {
      document.querySelectorAll('.hero-biz-nav').forEach(function (el) {
        el.style.display = 'none';
      });
    } else {
      document.querySelectorAll('.hero-biz-nav').forEach(function (el) {
        el.style.display = '';
      });
    }
  }

  function applyLabels() {
    document.querySelectorAll('[data-hdr]').forEach(function (el) {
      var k = el.getAttribute('data-hdr');
      if (!k || !LABELS[k]) return;
      var text = t(LABELS[k].ar, LABELS[k].fr);
      if (k === 'tenders' && el.closest('[data-rizq-module="tenders"]')) {
        text = t('المناقصات', 'Appels d\'offres');
      }
      if (!text) return;
      if (el.closest('#mobile-drawer-list')) {
        var ico = '';
        getMobileMoreItems().some(function (it) {
          if (it.hdr === k) { ico = it.ico || ''; return true; }
          return false;
        });
        el.textContent = (ico ? ico + ' ' : '') + text;
        return;
      }
      /* Preserve icon spans inside more-menu items (don't wipe structure). */
      var strong = el.tagName === 'STRONG' ? el : el.querySelector('strong[data-hdr], strong');
      var labelTarget = strong || (el.querySelector('.rizq-hdr-lbl') ? el.querySelector('.rizq-hdr-lbl') : null);
      if (labelTarget) {
        labelTarget.textContent = text;
      } else if (!el.querySelector('.nav-dd-icon, .rizq-hdr-ico')) {
        el.textContent = text;
      }
    });
  }

  var _lastApplied = null;

  function apply(flags) {
    if (!flags || typeof flags !== 'object') {
      /* Keep modules navigable until /api/site-config arrives — closed-by-default
         made header links (مكاتب/معارض/مناقصات) vanish and feel “dead”. */
      flags = { individual: true, store: true, office: true, corp: true, tenders: true, investments: true, videoAds: true };
    }
    _lastApplied = flags;
    applyMainBar(flags);
    applyMoreMenus(flags);
    applySectionHides(flags);
    applyLabels();
    ensureMoreMenusFilled();
    if (global.RizqHeader && typeof global.RizqHeader.applyLabels === 'function') {
      try { global.RizqHeader.applyLabels(); } catch (e) {}
    } else {
      syncNavFlexOrder();
    }
    if (global.RizqHeader && typeof global.RizqHeader.markActive === 'function') {
      try { global.RizqHeader.markActive(); } catch (eA) {}
    }
  }

  function syncNavFlexOrder() {
    document.querySelectorAll(
      '#nav .nav-center > li, #rizq-desk-nav .nav-center > li, #rizq-app-header .rizq-hdr-row2 > *'
    ).forEach(function (el) {
      var o = el.getAttribute('data-nav-order');
      if (o) el.style.order = o;
    });
  }

  global.RizqDynamicNav = {
    apply: apply,
    MODULES: MODULES,
    moduleOpen: moduleOpen,
    getMobileMoreItems: getMobileMoreItems
  };

  document.addEventListener('rizq:langchange', function () {
    if (_lastApplied) apply(_lastApplied);
  });

  try {
    var mq = global.matchMedia('(max-width:768px)');
    function onMq() {
      if (_lastApplied) apply(_lastApplied);
    }
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  } catch (eMq) {}

  function bootNav() {
    apply(_lastApplied || null);
    ensureMoreMenusFilled();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootNav);
  } else {
    bootNav();
  }
  setTimeout(bootNav, 200);
})(window);
