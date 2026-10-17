/**
 * TRIAL — سلوك هيدر النموذج + سلة عامة (محلات / معارض / مكاتب)
 */
(function () {
  'use strict';
  if (!document.body || !document.body.classList.contains('rizq-mockup-hdr-trial')) return;

  var DEMO_CART = [
    { id: 'demo-s1', name: 'هاتف ذكي', nameF: 'Smartphone', qty: 1, module: 'store', storeName: 'محل تجريبي' },
    { id: 'demo-r1', name: 'سيارة مستعملة', nameF: 'Voiture', qty: 1, module: 'showroom', storeName: 'معرض تجريبي' },
    { id: 'demo-o1', name: 'استشارة قانونية', nameF: 'Consultation', qty: 1, module: 'office', storeName: 'مكتب تجريبي' },
  ];

  function readCart() {
    try {
      var c = JSON.parse(localStorage.getItem('rizq_cart') || '[]');
      if (Array.isArray(c) && c.length) return c;
    } catch (e) { /* ignore */ }
    // معاينة النموذج فقط — لا تُكتب في localStorage
    return DEMO_CART.slice();
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

  function refreshBadge() {
    var badge = document.getElementById('rmh-cart-badge');
    if (!badge) return;
    var n = qtySum(readCart());
    badge.textContent = String(n);
    if (n > 0) {
      badge.hidden = false;
      badge.classList.remove('is-empty');
    } else {
      badge.hidden = true;
      badge.classList.add('is-empty');
    }
  }

  function itemLabel(it, fr) {
    if (fr && it.nameF) return it.nameF;
    return it.name || it.nameF || (fr ? 'Article' : 'منتج');
  }

  function renderCartPanel() {
    var body = document.getElementById('rmh-cart-body');
    if (!body) return;
    var fr = document.documentElement.lang === 'fr';
    var items = readCart();
    if (!items.length) {
      body.innerHTML = '<p class="rmh-cart-empty">' + (fr ? 'Panier vide' : 'السلة فارغة') + '</p>';
      return;
    }
    var g = groupCart(items);
    var labels = {
      store: fr ? 'Magasins' : 'المحلات',
      showroom: fr ? 'Showrooms' : 'المعارض',
      office: fr ? 'Bureaux' : 'المكاتب',
    };
    var html = '';
    ['store', 'showroom', 'office'].forEach(function (key) {
      var list = g[key];
      if (!list.length) return;
      html +=
        '<div class="rmh-cart-sec">' +
        '<div class="rmh-cart-sec-title"><span>' +
        labels[key] +
        '</span><span class="rmh-cart-sec-count">' +
        qtySum(list) +
        '</span></div><ul>';
      list.slice(0, 4).forEach(function (it) {
        html +=
          '<li>' +
          escapeHtml(itemLabel(it, fr)) +
          (Number(it.qty) > 1 ? ' ×' + Number(it.qty) : '') +
          '</li>';
      });
      if (list.length > 4) {
        html += '<li>… +' + (list.length - 4) + '</li>';
      }
      html += '</ul></div>';
    });
    body.innerHTML = html || '<p class="rmh-cart-empty">' + (fr ? 'Panier vide' : 'السلة فارغة') + '</p>';
  }

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

  function wireCart() {
    var wrap = document.getElementById('rmh-cart-wrap');
    var btn = document.getElementById('rmh-cart-btn');
    if (!wrap || !btn) return;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = wrap.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) renderCartPanel();
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function wireLang() {
    var btn = document.getElementById('rmh-lang-btn');
    var navLang = document.getElementById('nav-lang-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (navLang) navLang.click();
      else if (typeof toggleLang === 'function') toggleLang();
      else if (typeof toggleLangPage === 'function') toggleLangPage();
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
      { key: 'estate', el: document.getElementById('rzq-disc-estate') },
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

  function wireMore() {
    var wrap = document.querySelector('.rmh-more-wrap');
    var btn = document.getElementById('rmh-more-btn');
    var menu = document.getElementById('rmh-more-menu');
    if (!wrap || !btn || !menu) return;
    var leaveTimer = null;

    function placeMenu() {
      var br = btn.getBoundingClientRect();
      var menuW = Math.max(176, Math.round(menu.offsetWidth || 176));
      /* في RTL الزر على اليسار غالباً — ثبّت القائمة تحت الزر دون قصّ */
      var left = Math.round(br.left + br.width / 2 - menuW / 2);
      left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
      var top = Math.round(br.bottom + 6);
      menu.classList.add('is-positioned');
      menu.style.setProperty('position', 'fixed', 'important');
      menu.style.setProperty('left', left + 'px', 'important');
      menu.style.setProperty('right', 'auto', 'important');
      menu.style.setProperty('top', top + 'px', 'important');
      menu.style.setProperty('transform', 'none', 'important');
      menu.style.setProperty('z-index', '10080', 'important');
      menu.style.setProperty('display', 'flex', 'important');
    }

    function closeMore() {
      clearTimeout(leaveTimer);
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
      menu.classList.remove('is-positioned');
      menu.style.removeProperty('display');
    }

    function openMore() {
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      menu.hidden = false;
      placeMenu();
      requestAnimationFrame(placeMenu);
    }

    function scheduleClose() {
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(function () {
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
      clearTimeout(leaveTimer);
      openMore();
    });
    wrap.addEventListener('mouseleave', function () {
      if (!fineHover()) return;
      scheduleClose();
    });
    menu.addEventListener('mouseenter', function () { clearTimeout(leaveTimer); });
    menu.addEventListener('mouseleave', scheduleClose);
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target) && !menu.contains(e.target)) closeMore();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMore();
    });
    window.addEventListener('resize', function () {
      if (wrap.classList.contains('open')) placeMenu();
    });
    window.addEventListener('scroll', function () {
      if (wrap.classList.contains('open')) placeMenu();
    }, true);
  }

  function wireHelp() {
    var wrap = document.getElementById('rmh-help-wrap');
    var btn = document.getElementById('rmh-help-btn');
    var menu = document.getElementById('rmh-help-menu');
    if (!wrap || !btn || !menu) return;
    var leaveTimer = null;

    function placeMenu() {
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
    }

    function closeHelp() {
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
      menu.classList.remove('is-positioned');
    }

    function openHelp() {
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      menu.hidden = false;
      placeMenu();
      requestAnimationFrame(placeMenu);
    }

    function scheduleClose() {
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(function () {
        if (wrap.matches(':hover') || menu.matches(':hover')) return;
        closeHelp();
      }, 140);
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (wrap.classList.contains('open')) closeHelp();
      else openHelp();
    });
    wrap.addEventListener('mouseenter', function () {
      try { if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return; } catch (err) { return; }
      clearTimeout(leaveTimer);
      openHelp();
    });
    wrap.addEventListener('mouseleave', function () {
      try { if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return; } catch (err) { return; }
      scheduleClose();
    });
    menu.addEventListener('mouseenter', function () { clearTimeout(leaveTimer); });
    menu.addEventListener('mouseleave', scheduleClose);
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target) && !menu.contains(e.target)) closeHelp();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeHelp();
    });
  }

  function syncMockHdrHeight() {
    var hdr = document.getElementById('rizq-mock-hdr');
    if (!hdr) return;
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

  function boot() {
    fillCategories();
    refreshBadge();
    renderCartPanel();
    wireCart();
    wireLang();
    wireHelp();
    wireMore();
    wireNavActive();
    ensureHeroTagline();
    syncMockHdrHeight();
    setTimeout(function () {
      fillCategories();
      ensureHeroTagline();
      syncMockHdrHeight();
    }, 1200);
    window.addEventListener('resize', syncMockHdrHeight);
    window.addEventListener('storage', function (ev) {
      if (ev.key === 'rizq_cart') {
        refreshBadge();
        renderCartPanel();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
