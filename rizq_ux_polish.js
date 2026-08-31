/**
 * rizq_ux_polish.js — بحث مقترح، مفضلة، بطاقة ثقة، حالات فارغة، صور موحّدة
 * يُحمَّل بعد rizq_auth_gate.js عند الحاجة.
 */
(function (global) {
  'use strict';

  function lang() {
    try {
      if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') {
        return global.RizqI18n.getLang() === 'fr' ? 'fr' : 'ar';
      }
      return localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t(ar, fr) {
    return lang() === 'fr' ? fr : ar;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function wishlistIds() {
    try {
      var v = JSON.parse(localStorage.getItem('rizq_wishlist') || '[]');
      return Array.isArray(v) ? v.map(String) : [];
    } catch (e) {
      return [];
    }
  }

  function wishlistHas(id) {
    return wishlistIds().indexOf(String(id)) !== -1;
  }

  function wishlistToggle(id) {
    id = String(id);
    var ids = wishlistIds();
    var i = ids.indexOf(id);
    var added;
    if (i === -1) {
      ids.push(id);
      added = true;
    } else {
      ids.splice(i, 1);
      added = false;
    }
    try {
      localStorage.setItem('rizq_wishlist', JSON.stringify(ids));
    } catch (e) {}
    try {
      document.dispatchEvent(new CustomEvent('rizq_wishlist', { detail: { id: id, added: added, count: ids.length } }));
    } catch (e2) {}
    updateFavBadges();
    return added;
  }

  function ensureToastHost() {
    var el = document.getElementById('rizq-toast-global');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'rizq-toast-global';
    el.className = 'rizq-toast-global';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    return el;
  }

  function showToast(msg, opts) {
    opts = opts || {};
    if (typeof global.showToast === 'function' && global.showToast !== showToast) {
      try {
        global.showToast(msg);
        return;
      } catch (e) {}
    }
    var host = ensureToastHost();
    host.textContent = msg;
    host.classList.add('show');
    clearTimeout(host._hideT);
    host._hideT = setTimeout(function () {
      host.classList.remove('show');
    }, opts.ms || 2600);
  }

  function toastFav(added) {
    showToast(
      added
        ? t('❤️ أُضيف إلى المفضلة', '❤️ Ajouté aux favoris')
        : t('أُزيل من المفضلة', 'Retiré des favoris')
    );
  }

  function updateFavBadges() {
    var n = wishlistIds().length;
    document.querySelectorAll('[data-rizq-fav-count]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.hidden = n < 1;
      el.classList.toggle('is-empty', n < 1);
    });
    document.querySelectorAll('[data-rizq-fav-wrap]').forEach(function (el) {
      el.classList.toggle('has-favs', n > 0);
      el.setAttribute('aria-label', t('المفضلة (' + n + ')', 'Favoris (' + n + ')'));
    });
  }

  function cartItems() {
    try {
      var v = JSON.parse(localStorage.getItem('rizq_cart') || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  }

  function cartCount() {
    return cartItems().reduce(function (s, c) {
      return s + (Number(c.qty) || 1);
    }, 0);
  }

  function updateCartBadges() {
    var n = cartCount();
    document.querySelectorAll('[data-rizq-cart-count], #nav-cart-count').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      if (el.hasAttribute('hidden')) el.hidden = n < 1;
      el.classList.toggle('is-empty', n < 1);
    });
    document.querySelectorAll('[data-rizq-cart-wrap], #rizq-hdr-cart').forEach(function (el) {
      el.classList.toggle('has-items', n > 0);
      el.setAttribute('aria-label', t('السلة (' + n + ')', 'Panier (' + n + ')'));
    });
  }

  function updateStoreWishBadge(count) {
    if (count == null) return;
    var n = Number(count) || 0;
    document.querySelectorAll('[data-rizq-store-wish-count], #nav-wish-count, #ab-wish-count').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      if (el.hasAttribute('hidden')) el.hidden = n < 1;
      el.classList.toggle('is-empty', n < 1);
    });
    document.querySelectorAll('#rizq-hdr-store-wish').forEach(function (el) {
      el.classList.toggle('has-favs', n > 0);
    });
  }

  function updateCommerceBadges() {
    updateCartBadges();
    updateFavBadges();
  }

  var CONDITION_OPTS = [
    { v: 'جديد', ar: '✨ جديد', fr: '✨ Neuf' },
    { v: 'مستعمل — ممتاز', ar: '⭐ مستعمل — ممتاز', fr: '⭐ Occasion — excellent' },
    { v: 'مستعمل — جيد', ar: '👍 مستعمل — جيد', fr: '👍 Occasion — bon' },
    { v: 'للتصليح', ar: '🔧 للتصليح', fr: '🔧 À réparer' }
  ];

  function conditionLabel(v) {
    var fr = lang() === 'fr';
    for (var i = 0; i < CONDITION_OPTS.length; i++) {
      if (CONDITION_OPTS[i].v === v) return fr ? CONDITION_OPTS[i].fr : CONDITION_OPTS[i].ar;
    }
    return v || '';
  }

  function conditionFilterHtml(name) {
    name = name || 'rcond';
    var fr = lang() === 'fr';
    var html =
      '<div class="filter-section" id="condition-filter-section">' +
      '<div class="filter-title"><span data-t="filter-condition">' +
      (fr ? 'État' : 'حالة المنتج') +
      '</span><button type="button" onclick="clearSection&&clearSection(\'condition\')" data-t="btn-clear-mini">' +
      (fr ? 'Effacer' : 'مسح') +
      '</button></div>' +
      '<div class="chips" id="condition-chips" style="display:flex;flex-wrap:wrap;gap:6px">';
    CONDITION_OPTS.forEach(function (o) {
      html +=
        '<label class="filter-option" style="margin:0">' +
        '<input type="radio" name="' +
        name +
        '" value="' +
        escapeHtml(o.v) +
        '" class="filter-cb">' +
        '<span class="filter-label">' +
        escapeHtml(fr ? o.fr : o.ar) +
        '</span></label>';
    });
    html += '</div></div>';
    return html;
  }

  function emptyStateHtml(opts) {
    opts = opts || {};
    var title = opts.title || t('لا توجد نتائج', 'Aucun résultat');
    var desc =
      opts.desc ||
      t(
        'جرّب تعديل الفلاتر أو انشر إعلانك ليظهر هنا.',
        'Modifiez les filtres ou publiez votre annonce.'
      );
    var primaryHref = opts.primaryHref || 'rizq_post.html';
    var primaryLabel = opts.primaryLabel || t('📢 انشر إعلانك', '📢 Publier une annonce');
    var secondaryLabel = opts.secondaryLabel || t('مسح الفلاتر', 'Réinitialiser');
    var secondaryOnclick = opts.secondaryOnclick || 'resetAllFilters()';
    return (
      '<div class="rizq-empty-state empty-state">' +
      '<div class="ei" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></div>' +
      '<h3>' +
      escapeHtml(title) +
      '</h3>' +
      '<p>' +
      escapeHtml(desc) +
      '</p>' +
      '<div class="es-actions">' +
      '<a class="es-btn-primary" href="' +
      escapeHtml(primaryHref) +
      '">' +
      escapeHtml(primaryLabel) +
      '</a>' +
      '<button type="button" class="es-btn-secondary" onclick="' +
      secondaryOnclick +
      '">' +
      escapeHtml(secondaryLabel) +
      '</button>' +
      '</div></div>'
    );
  }

  function trustCardHtml(ad, opts) {
    opts = opts || {};
    ad = ad || {};
    var fr = lang() === 'fr';
    var name = ad.seller || ad.storeName || ad.accountName || (fr ? 'Vendeur' : 'البائع');
    var score = Number(ad.seller_trust_score);
    if (!Number.isFinite(score)) score = ad.verified ? 75 : 60;
    score = Math.max(0, Math.min(100, Math.round(score)));
    var verified = !!ad.verified;
    var adsCount = Number(ad.sellerAdsCount || ad.adsCount || 0);
    var since = ad.memberSince || ad.sellerSince || '';
    var profileHref = opts.profileHref || (ad.accountId ? 'rizq_profile.html?id=' + encodeURIComponent(ad.accountId) : '');
    var rating = (score / 20).toFixed(1);
    var stars = score >= 80 ? '★★★★★' : score >= 60 ? '★★★★☆' : score >= 40 ? '★★★☆☆' : '★★☆☆☆';

    var badges = '';
    if (verified) {
      badges +=
        '<span class="rizq-trust-badge ok">' +
        escapeHtml(fr ? '✅ Vérifié' : '✅ موثّق') +
        '</span>';
    }
    if (score >= 80) {
      badges +=
        '<span class="rizq-trust-badge gold">' +
        escapeHtml(fr ? '⭐ Confiance élevée' : '⭐ ثقة عالية') +
        '</span>';
    }

    var meta = [];
    meta.push(
      '<span class="rizq-trust-score" title="' +
        escapeHtml(fr ? 'Score de confiance' : 'درجة الثقة') +
        '">' +
        score +
        '/100</span>'
    );
    if (adsCount > 0) {
      meta.push(
        '<span>' +
          adsCount +
          ' ' +
          escapeHtml(fr ? (adsCount === 1 ? 'annonce' : 'annonces') : 'إعلان') +
          '</span>'
      );
    }
    if (since) {
      meta.push('<span>' + escapeHtml((fr ? 'Depuis ' : 'منذ ') + since) + '</span>');
    }

    var open =
      profileHref
        ? '<a class="rizq-trust-card" href="' + escapeHtml(profileHref) + '">'
        : '<div class="rizq-trust-card">';
    var close = profileHref ? '</a>' : '</div>';

    return (
      open +
      '<div class="rizq-trust-av" aria-hidden="true">' +
      escapeHtml((ad.emoji || name || '👤').toString().slice(0, 2)) +
      '</div>' +
      '<div class="rizq-trust-body">' +
      '<div class="rizq-trust-name">' +
      escapeHtml(name) +
      '</div>' +
      '<div class="rizq-trust-stars" aria-label="' +
      rating +
      '">' +
      stars +
      ' <em>' +
      rating +
      '</em></div>' +
      (badges ? '<div class="rizq-trust-badges">' + badges + '</div>' : '') +
      '<div class="rizq-trust-meta">' +
      meta.join('<span class="dot">·</span>') +
      '</div>' +
      '</div>' +
      close
    );
  }

  function imgHtml(src, opts) {
    opts = opts || {};
    var alt = opts.alt || '';
    var eager = !!opts.eager;
    if (!src) {
      return (
        '<div class="rizq-img-wrap rizq-ad-frame' +
        (opts.className ? ' ' + opts.className : '') +
        '" aria-hidden="true"></div>'
      );
    }
    return (
      '<div class="rizq-img-wrap rizq-ad-frame' +
      (opts.className ? ' ' + opts.className : '') +
      '">' +
      '<img src="' +
      escapeHtml(src) +
      '" alt="' +
      escapeHtml(alt) +
      '" ' +
      (eager ? 'loading="eager"' : 'loading="lazy"') +
      ' decoding="async" onload="var w=this.closest(\'.rizq-img-wrap\');if(w)w.classList.add(\'loaded\')">' +
      '</div>'
    );
  }

  function attachSearchSuggestions(cfg) {
    cfg = cfg || {};
    var input = typeof cfg.input === 'string' ? document.getElementById(cfg.input) : cfg.input;
    if (!input) return null;
    var boxId = cfg.boxId || input.id + '-suggestions';
    var box = document.getElementById(boxId);
    if (!box) {
      box = document.createElement('div');
      box.id = boxId;
      box.className = 'rizq-sugg-box search-suggestions';
      box.setAttribute('role', 'listbox');
      box.style.display = 'none';
      var wrap = input.closest('.nav-sticky-search-wrap, .nav-search, .search-bar, .rizq-sugg-host') || input.parentElement;
      if (wrap) {
        if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
        wrap.appendChild(box);
      } else {
        input.insertAdjacentElement('afterend', box);
      }
    }

    function getAds() {
      if (typeof cfg.getAds === 'function') return cfg.getAds() || [];
      if (global.ADS) return global.ADS;
      if (global.ALL_ADS) return global.ALL_ADS;
      if (global.filtered) return global.filtered;
      return [];
    }

    function hide() {
      box.style.display = 'none';
    }

    function show() {
      var v = (input.value || '').trim();
      if (!v || v.length < 1) {
        hide();
        return;
      }
      var q = v.toLowerCase();
      var ads = getAds();
      var res = ads
        .filter(function (s) {
          var title = String(s.title || s.titleFR || '');
          var cat = String(s.cat || s.category || s.categoryLabel || s.subcat || '');
          return title.toLowerCase().indexOf(q) >= 0 || cat.toLowerCase().indexOf(q) >= 0;
        })
        .slice(0, 6);

      if (!res.length) {
        box.innerHTML =
          '<div class="sugg-item sugg-empty" style="cursor:default">' +
          escapeHtml(t('لا توجد نتائج', 'Aucun résultat')) +
          '</div>';
      } else {
        box.innerHTML = res
          .map(function (s) {
            var title = s.title || s.titleFR || '';
            var price = s.price || '';
            var emoji = s.emoji || '📦';
            var safe = String(title).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            return (
              '<div class="sugg-item" role="option" data-q="' +
              escapeHtml(title) +
              '" onclick="(function(){var i=document.getElementById(\'' +
              input.id +
              '\');if(i)i.value=\'' +
              safe +
              '\';' +
              (cfg.onPickExpr ||
                (typeof cfg.onPick === 'string'
                  ? cfg.onPick
                  : 'if(window.doMainSearch)doMainSearch();else if(window.doSearch)doSearch();else if(window.doNavStickySearch)doNavStickySearch();')) +
              '})()">' +
              '<span class="sugg-icon">' +
              escapeHtml(emoji) +
              '</span><span class="sugg-title">' +
              escapeHtml(title) +
              '</span><span class="sugg-price">' +
              escapeHtml(price) +
              '</span></div>'
            );
          })
          .join('');
      }
      box.style.display = 'block';
    }

    input.addEventListener('input', show);
    input.addEventListener('focus', show);
    input.addEventListener('blur', function () {
      setTimeout(hide, 180);
    });
    return { show: show, hide: hide, box: box };
  }

  function boot() {
    updateFavBadges();
    updateCartBadges();
    document.addEventListener('rizq_wishlist', updateFavBadges);
    document.addEventListener('rizq_cart', updateCartBadges);
    window.addEventListener('storage', function (e) {
      if (e.key === 'rizq_wishlist') updateFavBadges();
      if (e.key === 'rizq_cart') updateCartBadges();
    });
    document.addEventListener('rizq:langchange', function () {
      updateFavBadges();
      updateCartBadges();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.RizqUx = {
    lang: lang,
    t: t,
    escapeHtml: escapeHtml,
    wishlistIds: wishlistIds,
    wishlistHas: wishlistHas,
    wishlistToggle: wishlistToggle,
    showToast: showToast,
    toastFav: toastFav,
    updateFavBadges: updateFavBadges,
    cartCount: cartCount,
    updateCartBadges: updateCartBadges,
    updateStoreWishBadge: updateStoreWishBadge,
    updateCommerceBadges: updateCommerceBadges,
    CONDITION_OPTS: CONDITION_OPTS,
    conditionLabel: conditionLabel,
    conditionFilterHtml: conditionFilterHtml,
    emptyStateHtml: emptyStateHtml,
    trustCardHtml: trustCardHtml,
    imgHtml: imgHtml,
    attachSearchSuggestions: attachSearchSuggestions
  };
})(typeof window !== 'undefined' ? window : this);
