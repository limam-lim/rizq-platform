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
    var heart = n > 0 ? '♥' : '♡';
    var wlBlock = document.getElementById('wishlist-block');
    if (wlBlock) wlBlock.classList.toggle('has-favs', n > 0);
    document.querySelectorAll('[data-rizq-fav-count]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.hidden = n < 1;
      el.classList.toggle('is-empty', n < 1);
    });
    document.querySelectorAll('[data-rizq-fav-heart], .rizq-hdr-fav-ico').forEach(function (el) {
      el.textContent = heart;
    });
    document.querySelectorAll('[data-rizq-fav-wrap]').forEach(function (el) {
      el.classList.toggle('has-favs', n > 0);
      var lbl = n > 0 ? t('المفضلة (' + n + ')', 'Favoris (' + n + ')') : t('المفضلة', 'Favoris');
      el.setAttribute('aria-label', lbl);
      el.setAttribute('title', lbl);
    });
  }

  function wishlistEmptyHtml() {
    var fr = lang() === 'fr';
    return '<div class="rzq-wishlist-empty" style="text-align:center;padding:36px 22px;background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(27,58,107,.05));border:2px solid rgba(201,168,76,.35);border-radius:20px;max-width:540px;margin:0 auto;box-shadow:0 8px 28px rgba(27,58,107,.08)">'
      + '<div class="rizq-gold-heart" style="font-size:42px;display:block;margin:0 auto 16px">♡</div>'
      + '<p style="font-size:18px;font-weight:900;color:#0f2347!important;margin:0 0 12px;line-height:1.55">'
      + (fr ? 'Aucune annonce en favori' : 'لا توجد إعلانات في المفضلة بعد')
      + '</p>'
      + '<p style="font-size:15px;font-weight:700;color:#1B3A6B!important;margin:0;line-height:1.85">'
      + (fr
        ? 'Parcourez les annonces et touchez le cœur doré <span class="rizq-gold-heart" style="font-size:18px">♡</span> pour sauvegarder.'
        : 'تصفّح الإعلانات واضغط على القلب الذهبي <span class="rizq-gold-heart" style="font-size:18px">♡</span> لحفظ الإعلان.')
      + '</p>'
      + '<div style="margin-top:20px"><a href="rizq_browse.html" style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#C9A84C,#FFD700);color:#0f2347;font-weight:900;font-size:15px;padding:12px 22px;border-radius:14px;text-decoration:none;box-shadow:0 4px 16px rgba(201,168,76,.35)">'
      + (fr ? 'Parcourir les annonces →' : 'تصفح الإعلانات ←') + '</a></div></div>';
  }

  function openWishlist(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    var block = document.getElementById('wishlist-block');
    if (!block) {
      window.location.href = 'rizq_landing_v8.html#wishlist-block';
      return;
    }
    var section = document.getElementById('rizq-live-activity');
    if (section) section.style.display = '';
    block.style.display = '';
    var wlTitle = document.getElementById('wishlist-block-title');
    if (wlTitle) {
      var fr = lang() === 'fr';
      if (!wlTitle.hasAttribute('data-t-ar')) wlTitle.setAttribute('data-t-ar', wlTitle.textContent.trim());
      wlTitle.textContent = fr ? (wlTitle.getAttribute('data-t-fr') || 'Vos favoris') : wlTitle.getAttribute('data-t-ar');
    }
    var done = function () {
      setTimeout(function () {
        block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try { history.replaceState(null, '', '#wishlist-block'); } catch (eH) { location.hash = 'wishlist-block'; }
      }, 100);
    };
    if (typeof window.RizqRenderWishlist === 'function') {
      window.RizqRenderWishlist(true).then(done);
      return;
    }
    var mount = document.getElementById('wishlist-mount');
    if (mount) mount.innerHTML = wishlistEmptyHtml();
    done();
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

  /* حالة المنتج حسب نوع القسم — لا نعرض «مستعمل» لأغذية مثلاً */
  var CONDITION_OPTS = [
    { v: 'جديد', ar: '✨ جديد', fr: '✨ Neuf' },
    { v: 'مستعمل — ممتاز', ar: '⭐ مستعمل — ممتاز', fr: '⭐ Occasion — excellent' },
    { v: 'مستعمل — جيد', ar: '👍 مستعمل — جيد', fr: '👍 Occasion — bon' },
    { v: 'للتصليح', ar: '🔧 للتصليح', fr: '🔧 À réparer' }
  ];

  var CONDITION_BY_PROFILE = {
    durable: CONDITION_OPTS,
    food: [
      { v: 'جديد', ar: '🥗 طازج / جديد', fr: '🥗 Frais / neuf' },
      { v: 'معبّأ', ar: '📦 معبّأ / معلّب', fr: '📦 Emballé' },
      { v: 'مجمّد', ar: '❄️ مجمّد', fr: '❄️ Surgelé' },
      { v: 'قريب الانتهاء', ar: '⏳ قريب الانتهاء', fr: '⏳ Bientôt périmé' }
    ],
    livestock: [
      { v: 'سليم', ar: '✅ سليم / صحي', fr: '✅ Sain' },
      { v: 'للتسمين', ar: '📈 للتسمين', fr: '📈 À engraisser' },
      { v: 'للذبح', ar: '🔪 للذبح', fr: '🔪 Pour abattage' },
      { v: 'جديد', ar: '🐣 صغير / حديث', fr: '🐣 Jeune' }
    ],
    none: []
  };

  var CAT_CONDITION_PROFILE = {
    'أغذية': 'food',
    'ماشية': 'livestock',
    'خدمات': 'none',
    'وظائف': 'none',
    'تأمين': 'none',
    'رحلات': 'none',
    'عقارات': 'none',
    'تجارة': 'durable',
    'تعليم': 'durable',
    'صحة': 'durable'
  };

  /* نطاقات سعر بالأوقية الجديدة (MRU) — 1 USD ≈ 37 MRU */
  var PRICE_PRESETS = {
    low: [
      { v: '0-1000', ar: 'أقل من 1,000', fr: 'Moins de 1 000' },
      { v: '1000-5000', ar: '1,000 — 5,000', fr: '1 000 — 5 000' },
      { v: '5000-20000', ar: '5,000 — 20,000', fr: '5 000 — 20 000' },
      { v: '20000-999999999', ar: 'أكثر من 20,000', fr: 'Plus de 20 000' }
    ],
    mid: [
      { v: '0-5000', ar: 'أقل من 5,000', fr: 'Moins de 5 000' },
      { v: '5000-25000', ar: '5,000 — 25,000', fr: '5 000 — 25 000' },
      { v: '25000-100000', ar: '25,000 — 100,000', fr: '25 000 — 100 000' },
      { v: '100000-999999999', ar: 'أكثر من 100,000', fr: 'Plus de 100 000' }
    ],
    high: [
      { v: '0-100000', ar: 'أقل من 100,000', fr: 'Moins de 100 000' },
      { v: '100000-500000', ar: '100,000 — 500,000', fr: '100 000 — 500 000' },
      { v: '500000-2000000', ar: '500,000 — 2M', fr: '500 000 — 2 M' },
      { v: '2000000-999999999', ar: 'أكثر من 2M', fr: 'Plus de 2 M' }
    ]
  };

  var PRICE_SLIDER = {
    low: { max: 50000, step: 500 },
    mid: { max: 500000, step: 2500 },
    high: { max: 5000000, step: 25000 }
  };

  var CAT_PRICE_TIER = {
    'أغذية': 'low',
    'أزياء': 'low',
    'صحة': 'low',
    'تعليم': 'low',
    'رياضة': 'mid',
    'إلكترونيات': 'mid',
    'أثاث': 'mid',
    'معدات-منزل': 'mid',
    'ذهب': 'mid',
    'طاقة': 'mid',
    'بناء': 'mid',
    'ماشية': 'mid',
    'تجارة': 'mid',
    'فنون': 'mid',
    'خدمات': 'mid',
    'وظائف': 'low',
    'تأمين': 'mid',
    'رحلات': 'mid',
    'سيارات': 'high',
    'شاحنات': 'high',
    'عقارات': 'high',
    'مكائن-صناعية': 'high'
  };

  function normalizeCatKey(cat) {
    if (!cat) return '';
    if (typeof global.RizqCategories !== 'undefined' && RizqCategories.normalize) {
      return RizqCategories.normalize(cat) || cat;
    }
    return String(cat);
  }

  function conditionProfileForCat(cat) {
    var key = normalizeCatKey(cat);
    return CAT_CONDITION_PROFILE[key] || 'durable';
  }

  function priceTierForCat(cat) {
    var key = normalizeCatKey(cat);
    return CAT_PRICE_TIER[key] || 'mid';
  }

  function conditionsForCat(cat) {
    var profile = conditionProfileForCat(cat);
    return CONDITION_BY_PROFILE[profile] || CONDITION_OPTS;
  }

  function conditionLabel(v) {
    var fr = lang() === 'fr';
    var pools = CONDITION_OPTS
      .concat(CONDITION_BY_PROFILE.food || [])
      .concat(CONDITION_BY_PROFILE.livestock || []);
    for (var i = 0; i < pools.length; i++) {
      if (pools[i].v === v) return fr ? pools[i].fr : pools[i].ar;
    }
    return v || '';
  }

  function conditionChipsHtml(name, cat) {
    name = name || 'rcond';
    var fr = lang() === 'fr';
    var opts = conditionsForCat(cat);
    if (!opts.length) return '';
    var html = '';
    opts.forEach(function (o) {
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
    return html;
  }

  function applyConditionFilters(cat) {
    var section = document.getElementById('condition-filter-section');
    var chips = document.getElementById('condition-chips');
    if (!section || !chips) return;
    var opts = conditionsForCat(cat);
    if (!opts.length) {
      section.style.display = 'none';
      chips.innerHTML = '';
      return;
    }
    section.style.display = '';
    chips.innerHTML = conditionChipsHtml('rcond', cat);
  }

  function pricePresetsForCat(cat) {
    var tier = priceTierForCat(cat);
    return {
      tier: tier,
      presets: PRICE_PRESETS[tier] || PRICE_PRESETS.mid,
      slider: PRICE_SLIDER[tier] || PRICE_SLIDER.mid
    };
  }

  function applyPriceFilters(cat) {
    var info = pricePresetsForCat(cat);
    var fr = lang() === 'fr';
    var radios = document.getElementById('price-radios');
    if (!radios) {
      /* search.html: radios بدون غلاف — نبني داخل قسم السعر */
      var rangeEl = document.getElementById('price-range');
      if (rangeEl && rangeEl.parentElement) {
        var existing = rangeEl.parentElement.querySelectorAll('input[name="rprice"]');
        if (existing.length) {
          var wrap = existing[0].closest('div[style]') || existing[0].parentElement;
          if (wrap && wrap !== rangeEl.parentElement) radios = wrap;
        }
      }
    }
    if (radios) {
      radios.innerHTML = info.presets
        .map(function (p) {
          return (
            '<label class="filter-option"><input type="radio" name="rprice" value="' +
            escapeHtml(p.v) +
            '" class="filter-cb"><span class="filter-label">' +
            escapeHtml(fr ? p.fr : p.ar) +
            '</span></label>'
          );
        })
        .join('');
    }
    var slider = document.getElementById('price-range');
    if (slider) {
      var max = info.slider.max;
      slider.max = String(max);
      slider.step = String(info.slider.step);
      slider.value = String(max);
      slider.setAttribute('data-price-max', String(max));
      var labels = slider.parentElement && slider.parentElement.querySelector('.range-labels');
      if (labels) {
        var last = labels.querySelector('span:last-child');
        if (last && last.id !== 'range-val') {
          last.textContent = max >= 1000000 ? max / 1000000 + 'M+' : max.toLocaleString('en-US') + '+';
        }
      }
      var rv = document.getElementById('range-val');
      if (rv) rv.textContent = fr ? 'Tout' : 'الكل';
    }
    return info;
  }

  function applyCategoryFilters(cat) {
    applyConditionFilters(cat);
    applyPriceFilters(cat);
  }

  function conditionFilterHtml(name, cat) {
    name = name || 'rcond';
    var fr = lang() === 'fr';
    var opts = conditionsForCat(cat);
    if (!opts.length) {
      return '<div class="filter-section" id="condition-filter-section" style="display:none"></div>';
    }
    var html =
      '<div class="filter-section" id="condition-filter-section">' +
      '<div class="filter-title"><span data-t="filter-condition">' +
      (fr ? 'État' : 'حالة المنتج') +
      '</span><button type="button" onclick="clearSection&&clearSection(\'condition\')" data-t="btn-clear-mini">' +
      (fr ? 'Effacer' : 'مسح') +
      '</button></div>' +
      '<div class="chips" id="condition-chips" style="display:flex;flex-wrap:wrap;gap:6px">' +
      conditionChipsHtml(name, cat) +
      '</div></div>';
    return html;
  }

  function conditionButtonsHtml(cat) {
    var fr = lang() === 'fr';
    var opts = conditionsForCat(cat);
    if (!opts.length) return '';
    return opts
      .map(function (o, i) {
        return (
          '<button type="button" class="subcat-btn' +
          (i === 0 ? ' selected' : '') +
          '" data-cond="' +
          escapeHtml(o.v) +
          '">' +
          escapeHtml(fr ? o.fr : o.ar) +
          '</button>'
        );
      })
      .join('');
  }

  function priceBucketFor(priceNum, cat) {
    var n = Number(priceNum) || 0;
    var presets = pricePresetsForCat(cat).presets;
    for (var i = 0; i < presets.length; i++) {
      var parts = presets[i].v.split('-');
      var a = parseInt(parts[0], 10);
      var b = parseInt(parts[1], 10);
      if (n >= a && n <= b) return presets[i].v;
    }
    return presets[presets.length - 1].v;
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

  function injectFavStyles() {
    if (document.getElementById('rizq-fav-gold-css')) return;
    var st = document.createElement('style');
    st.id = 'rizq-fav-gold-css';
    st.textContent =
      '.nav-fav-ico,.rizq-gold-heart,.rizq-hdr-fav-ico{color:#E8C96A;font-weight:800;-webkit-text-fill-color:#E8C96A;text-shadow:0 0 10px rgba(201,168,76,.55)}' +
      '.nav-fav-btn.has-favs .nav-fav-ico,.rizq-hdr-fav.has-favs .rizq-hdr-fav-ico,#wishlist-block.has-favs [data-rizq-fav-heart]{color:#FFD700;-webkit-text-fill-color:#FFD700;text-shadow:0 0 14px rgba(255,215,0,.6)}' +
      '.rzq-wishlist-empty .rizq-gold-heart{font-size:42px;line-height:1}';
    document.head.appendChild(st);
  }

  function boot() {
    injectFavStyles();
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

    document.addEventListener('click', function (ev) {
      var wrap = ev.target.closest('[data-rizq-fav-wrap]');
      if (!wrap) return;
      openWishlist(ev);
    }, true);

    if (location.hash === '#wishlist-block') {
      setTimeout(function () { openWishlist(); }, 500);
    }
    window.addEventListener('hashchange', function () {
      if (location.hash === '#wishlist-block') openWishlist();
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
    openWishlist: openWishlist,
    wishlistEmptyHtml: wishlistEmptyHtml,
    CONDITION_OPTS: CONDITION_OPTS,
    CONDITION_BY_PROFILE: CONDITION_BY_PROFILE,
    conditionLabel: conditionLabel,
    conditionFilterHtml: conditionFilterHtml,
    conditionChipsHtml: conditionChipsHtml,
    conditionButtonsHtml: conditionButtonsHtml,
    conditionsForCat: conditionsForCat,
    conditionProfileForCat: conditionProfileForCat,
    applyConditionFilters: applyConditionFilters,
    applyPriceFilters: applyPriceFilters,
    applyCategoryFilters: applyCategoryFilters,
    pricePresetsForCat: pricePresetsForCat,
    priceBucketFor: priceBucketFor,
    priceTierForCat: priceTierForCat,
    emptyStateHtml: emptyStateHtml,
    trustCardHtml: trustCardHtml,
    imgHtml: imgHtml,
    attachSearchSuggestions: attachSearchSuggestions
  };
})(typeof window !== 'undefined' ? window : this);
