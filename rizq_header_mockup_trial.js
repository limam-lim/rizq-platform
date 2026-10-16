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

  function wireNavActive() {
    document.querySelectorAll('.rmh-nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.querySelectorAll('.rmh-nav a').forEach(function (x) {
          x.classList.remove('is-active');
        });
        a.classList.add('is-active');
      });
    });
  }

  function boot() {
    fillCategories();
    refreshBadge();
    renderCartPanel();
    wireCart();
    wireLang();
    wireNavActive();
    setTimeout(fillCategories, 1200);
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
