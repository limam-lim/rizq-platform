/**
 * rizq_store_commerce.js — كتالوج المحل العام (واجهة / منتجات / سلة)
 * صور متحركة بأسلوب إعلانات الصفحة الرئيسية + ترقيم 15 منتجاً.
 */
(function (global) {
  'use strict';

  var PAGE_SIZE = 15;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function imagesOf(p) {
    if (!p) return [];
    if (Array.isArray(p.imgDataArr) && p.imgDataArr.length) return p.imgDataArr.filter(Boolean);
    if (Array.isArray(p.images) && p.images.length) return p.images.filter(Boolean);
    if (p.imgData) return [p.imgData];
    if (p.image) return [p.image];
    if (p.thumb) return [p.thumb];
    return [];
  }

  /** وسائط منتج بأسلوب رزق (تدوير تلقائي إن وُجدت صور متعددة) */
  function productMediaHtml(p, opts) {
    opts = opts || {};
    var fr = !!opts.fr;
    var imgs = imagesOf(p);
    var emoji = p.emoji || '📦';
    var title = (fr && p.nameF) ? p.nameF : (p.name || '');
    var price = opts.price != null
      ? opts.price
      : ((Number(p.price) || 0).toLocaleString('en-US') + ' MRU');
    var id = p.id != null ? String(p.id) : '';

    if (global.RizqAdCards && typeof global.RizqAdCards.mediaHtml === 'function') {
      return global.RizqAdCards.mediaHtml({
        id: id,
        title: title,
        images: imgs,
        emoji: emoji,
        price: opts.showPrice === false ? '' : price,
        pin: !!(p.isNew || p.featured)
      }, { fr: fr, emoji: emoji, title: title, price: opts.showPrice === false ? '' : price, pin: !!(p.isNew || p.featured) });
    }

    if (imgs.length) {
      var multi = imgs.length > 1;
      var slides = imgs.map(function (src) {
        return '<div class="rzq-adx-slide"><img src="' + esc(src) + '" alt="' + esc(title) + '" loading="lazy" decoding="async"/></div>';
      }).join('');
      return '<div class="rzq-adx-media' + (multi ? ' has-multi' : '') + '" data-idx="0" data-count="' + imgs.length + '">'
        + '<div class="rzq-adx-slides">' + slides + '</div>'
        + '<div class="rzq-adx-grad"></div>'
        + (opts.showPrice === false ? '' : '<div class="rzq-adx-price"><span class="rzq-adx-price-pill">' + esc(price) + '</span></div>')
        + '</div>';
    }

    return '<div class="rzq-adx-media rzq-store-emoji-media" data-count="1">'
      + '<div class="rzq-adx-slides"><div class="rzq-adx-slide" style="background:linear-gradient(145deg,#111d2e,#1B3A6B)">'
      + '<span class="rzq-adx-emoji" aria-hidden="true">' + esc(emoji) + '</span></div></div>'
      + '<div class="rzq-adx-grad"></div>'
      + (opts.showPrice === false ? '' : '<div class="rzq-adx-price"><span class="rzq-adx-price-pill">' + esc(price) + '</span></div>')
      + '</div>';
  }

  function bindMedia(root) {
    if (global.RizqAdCards && typeof global.RizqAdCards.bindAll === 'function') {
      global.RizqAdCards.bindAll(root || document);
    }
  }

  /** أوصاف عرض/تجريبية لا تُعرض للزبون في محل حقيقي */
  function isPlaceholderDesc(s) {
    var t = String(s || '').trim().toLowerCase();
    if (!t) return true;
    var placeholders = [
      'منتج عرض', 'بيانات عرض', 'بيانات ترويجية فقط', 'بيانات ترويجية',
      'article démo', 'article demo', 'produit démo', 'produit demo',
      'demo product', 'sample product', 'lorem ipsum'
    ];
    for (var i = 0; i < placeholders.length; i++) {
      if (t === placeholders[i]) return true;
    }
    return false;
  }

  function cleanDesc(s) {
    return isPlaceholderDesc(s) ? '' : String(s || '').trim();
  }

  function mapRawProduct(p, i) {
    var priceNum = parseFloat(String(p.price == null ? '0' : p.price).replace(/[^\d.]/g, '')) || 0;
    var isNew = false;
    try { isNew = p.addedAt && (Date.now() - new Date(p.addedAt).getTime()) < 3 * 86400000; } catch (e) {}
    var imgs = imagesOf(p);
    var desc = cleanDesc(p.desc);
    var descF = cleanDesc(p.descF || p.desc);
    return {
      id: p.id != null ? p.id : (i + 1),
      _idx: i + 1,
      name: p.name || '',
      nameF: p.nameF || p.name || '',
      cat: p.cat || 'عام',
      topicId: p.topicId || '',
      emoji: p.emoji || '📦',
      price: priceNum,
      oldPrice: p.oldPrice || null,
      discount: !!p.discount,
      isNew: isNew,
      desc: desc,
      descF: descF,
      stock: p.stock,
      imgData: imgs[0] || p.imgData || '',
      imgDataArr: imgs,
      images: imgs,
      storeId: p.storeId || p.accountId || ''
    };
  }

  function pageSlice(list, page, size) {
    size = size || PAGE_SIZE;
    page = Math.max(1, page | 0);
    var total = Array.isArray(list) ? list.length : 0;
    var pages = Math.max(1, Math.ceil(total / size));
    if (page > pages) page = pages;
    var start = (page - 1) * size;
    return {
      page: page,
      pages: pages,
      size: size,
      total: total,
      items: (list || []).slice(start, start + size)
    };
  }

  function storeIdFromUrl() {
    try {
      var params = new URLSearchParams(location.search);
      return params.get('id') || params.get('store') || '';
    } catch (e) {
      return '';
    }
  }

  function withStoreId(href, storeId) {
    if (!storeId) return href;
    try {
      var u = new URL(href, location.href);
      u.searchParams.set('id', storeId);
      return u.pathname.replace(/^\//, '') + u.search + u.hash;
    } catch (e2) {
      var base = String(href || '').split('?')[0].split('#')[0];
      return base + '?id=' + encodeURIComponent(storeId);
    }
  }

  function wireStoreLinks(storeId, root) {
    if (!storeId) return;
    var scope = root || document;
    scope.querySelectorAll('a[href*="rizq_products.html"], a[href*="rizq_cart.html"], a[href*="rizq_store.html"]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (/^https?:/i.test(href) && href.indexOf(location.host) === -1) return;
      a.setAttribute('href', withStoreId(href, storeId));
    });
  }

  function setLogo(el, thumb, emoji) {
    if (!el) return;
    if (thumb) {
      el.innerHTML = '<img src="' + esc(thumb) + '" alt="" width="88" height="88" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block"/>';
    } else if (emoji) {
      el.textContent = emoji;
    }
  }

  /**
   * حصص فيديو المحل حسب الباقة:
   * - تجريبية: 0
   * - شهرية/ربعية/ماسية: فيديو تعريفي + إمكانية فيديو إضافي
   * - سنوية: فيديو تعريفي + فيديو إضافي مجاني
   */
  function introVideoSlots(acc) {
    var plan = String((acc && (acc.planName || acc.plan || acc.package || '')) || '').toLowerCase();
    var trial = /تجريب|trial|essai/.test(plan) || plan === 'store_trial';
    var yearly = /سنو|year|annuel|store_yearly/.test(plan);
    var hasIntro = false;
    try {
      if (global.RizqSub && typeof RizqSub.hasFeature === 'function' && acc && acc.id) {
        hasIntro = !!RizqSub.hasFeature(acc.id, 'intro_video');
      }
    } catch (e) {}
    if (!hasIntro) {
      hasIntro = !trial && (/شهر|ربع|ماس|diamond|month|quart|mensuel|mensuelle/.test(plan) || yearly
        || !!(acc && (acc.promo_video || acc.promo_video_extra)));
    }
    if (trial && !acc.promo_video && !acc.promo_video_extra) {
      return { max: 0, included: 0, extraFree: 0, labelAr: 'بدون فيديو', labelFr: 'Sans vidéo' };
    }
    if (!hasIntro && !acc.promo_video) {
      return { max: 0, included: 0, extraFree: 0, labelAr: 'بدون فيديو', labelFr: 'Sans vidéo' };
    }
    return {
      max: 2,
      included: 1,
      extraFree: yearly ? 1 : 0,
      labelAr: yearly ? 'فيديو تعريفي + فيديو إضافي مجاني' : 'فيديو تعريفي + فيديو إضافي',
      labelFr: yearly ? 'Vidéo + 1 supplémentaire offerte' : 'Vidéo + vidéo supplémentaire'
    };
  }

  function promoVideosOf(acc) {
    if (!acc) return [];
    var list = [];
    if (acc.promo_video) list.push({ url: String(acc.promo_video).trim(), kind: 'intro' });
    if (acc.promo_video_extra) list.push({ url: String(acc.promo_video_extra).trim(), kind: 'extra' });
    return list.filter(function (v) { return !!v.url; });
  }

  /* ── لوحة تفاصيل منتج بهوية عرض الإعلان ── */
  var _pdState = { product: null, idx: 0, qty: 1, opts: null, similar: [] };

  function ensureDetailHost() {
    var root = document.getElementById('rzq-pd-root');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'rzq-pd-root';
    root.className = 'rzq-pd-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML =
      '<div class="rzq-pd-sheet" id="rzq-pd-sheet"></div>'
      + '<div class="rzq-pd-lightbox" id="rzq-pd-lightbox" onclick="if(event.target===this)RizqStoreCommerce.closeLightbox()">'
      + '<button type="button" class="rzq-pd-lightbox-close" onclick="RizqStoreCommerce.closeLightbox()">✕</button>'
      + '<img id="rzq-pd-lightbox-img" alt=""/>'
      + '</div>';
    root.addEventListener('click', function (e) {
      if (e.target === root) closeProductDetail();
    });
    document.body.appendChild(root);
    return root;
  }

  function stockBadge(p, fr) {
    var info = null;
    if (global.RizqStock && typeof RizqStock.buyerLabel === 'function') {
      info = RizqStock.buyerLabel(p.stock, fr);
    }
    if (info) return '<span class="rzq-pd-badge ' + esc(info.level || 'in') + '">' + esc(info.text) + '</span>';
    if (p.stock != null && String(p.stock).trim() !== '') {
      return '<span class="rzq-pd-badge in">' + esc(String(p.stock)) + '</span>';
    }
    return '<span class="rzq-pd-badge in">' + (fr ? 'En stock' : 'موجود في الاستوك') + '</span>';
  }

  function renderDetailHtml(p, opts) {
    opts = opts || {};
    var fr = !!opts.fr;
    var storeName = opts.storeName || (fr ? 'Boutique' : 'المحل');
    var imgs = imagesOf(p);
    var title = fr ? (p.nameF || p.name || '') : (p.name || p.nameF || '');
    var titleAlt = fr ? (p.name || '') : (p.nameF || '');
    var desc = cleanDesc(fr ? (p.descF || p.desc || '') : (p.desc || p.descF || ''));
    var priceNum = Number(p.price) || 0;
    var priceTxt = priceNum.toLocaleString('en-US') + ' MRU';
    var oldTxt = p.oldPrice ? Number(p.oldPrice).toLocaleString('en-US') + ' MRU' : '';
    var cat = p.cat || (fr ? 'Produit' : 'منتج');
    var emoji = p.emoji || '📦';
    var qty = _pdState.qty || 1;

    var mainInner;
    if (imgs.length) {
      mainInner = '<img id="rzq-pd-main-img" src="' + esc(imgs[0]) + '" alt="' + esc(title) + '"/>';
    } else {
      mainInner = '<div class="rzq-pd-emoji-stage"><span class="rzq-pd-emoji-xl" aria-hidden="true">' + esc(emoji) + '</span></div>';
    }
    var zoomHint = '<button type="button" class="rzq-pd-zoom-hint" onclick="event.stopPropagation();RizqStoreCommerce.openLightbox()">'
      + '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/><path d="M11 8v6M8 11h6"/></svg>'
      + '<span>' + (fr ? 'Agrandir' : 'تكبير') + '</span></button>';
    var nav = imgs.length > 1
      ? '<button type="button" class="rzq-pd-gal-btn prev" onclick="event.stopPropagation();RizqStoreCommerce.navPhoto(-1)" aria-label="' + (fr ? 'Précédente' : 'السابقة') + '">‹</button>'
        + '<button type="button" class="rzq-pd-gal-btn next" onclick="event.stopPropagation();RizqStoreCommerce.navPhoto(1)" aria-label="' + (fr ? 'Suivante' : 'التالية') + '">›</button>'
        + '<span class="rzq-pd-counter" id="rzq-pd-counter">1 / ' + imgs.length + '</span>'
      : '';
    var thumbs = '';
    if (imgs.length > 1) {
      thumbs = '<div class="rzq-pd-thumbs">' + imgs.map(function (src, i) {
        return '<div class="rzq-pd-thumb' + (i === 0 ? ' active' : '') + '" data-i="' + i + '" onclick="RizqStoreCommerce.setPhoto(' + i + ')">'
          + '<img src="' + esc(src) + '" alt="" loading="lazy"/></div>';
      }).join('') + '</div>';
    } else if (!imgs.length) {
      thumbs = '<div class="rzq-pd-thumbs"><div class="rzq-pd-thumb active"><span>' + esc(emoji) + '</span></div></div>';
    }

    var similar = (_pdState.similar || []).slice(0, 4);
    var similarHtml = similar.length
      ? '<div class="rzq-pd-block"><div class="rzq-pd-block-title">' + (fr ? '✦ Produits similaires' : '✦ منتجات مشابهة') + '</div>'
        + '<div class="rzq-pd-similar">' + similar.map(function (s) {
          var sid = JSON.stringify(String(s.id));
          var sn = fr ? (s.nameF || s.name) : (s.name || s.nameF);
          var simImgs = imagesOf(s);
          var media = simImgs[0]
            ? '<img src="' + esc(simImgs[0]) + '" alt="" loading="lazy"/>'
            : esc(s.emoji || '📦');
          return '<div class="rzq-pd-sim" onclick="RizqStoreCommerce.openProductDetail(' + sid + ')">'
            + '<div class="rzq-pd-sim-media">' + media + '</div>'
            + '<div class="rzq-pd-sim-body"><div class="rzq-pd-sim-title">' + esc(sn) + '</div>'
            + '<div class="rzq-pd-sim-price">' + (Number(s.price) || 0).toLocaleString('en-US') + ' MRU</div></div></div>';
        }).join('') + '</div></div>'
      : '';

    return ''
      + '<div class="rzq-pd-topbar">'
      + '<button type="button" class="rzq-pd-back" onclick="RizqStoreCommerce.closeProductDetail()">← ' + (fr ? 'Retour' : 'رجوع') + '</button>'
      + '<span class="rzq-pd-eyebrow">RIZQ · ' + (fr ? 'Fiche produit' : 'بطاقة منتج') + '</span>'
      + '<button type="button" class="rzq-pd-x" onclick="RizqStoreCommerce.closeProductDetail()" aria-label="' + (fr ? 'Fermer' : 'إغلاق') + '">✕</button>'
      + '</div>'
      + '<div class="rzq-pd-body">'
      + '<div class="rzq-pd-hero">'
      + '<div class="rzq-pd-gallery">'
      + '<div class="rzq-pd-main" id="rzq-pd-main" onclick="RizqStoreCommerce.openLightbox()" title="' + (fr ? 'Cliquer pour agrandir' : 'انقر للتكبير') + '">'
      + mainInner + nav + zoomHint + '</div>'
      + thumbs
      + '</div>'
      + '<div class="rzq-pd-info">'
      + '<div class="rzq-pd-cat"><span>🏪 ' + esc(storeName) + '</span><span class="sep">›</span><span>📂 ' + esc(cat) + '</span>'
      + (p.isNew ? '<span class="rzq-pd-badge">✨ ' + (fr ? 'Nouveau' : 'جديد') + '</span>' : '')
      + (p.discount || p.oldPrice ? '<span class="rzq-pd-badge">🏷 ' + (fr ? 'Offre' : 'عرض') + '</span>' : '')
      + '</div>'
      + '<h1 class="rzq-pd-title">' + esc(title) + '</h1>'
      + (titleAlt && titleAlt !== title ? '<div class="rzq-pd-sub">' + esc(titleAlt) + '</div>' : '')
      + '<div class="rzq-pd-price-box">'
      + '<div><div class="rzq-pd-price">' + esc(priceTxt)
      + (oldTxt ? '<span class="rzq-pd-price-old">' + esc(oldTxt) + '</span>' : '')
      + '</div><div class="rzq-pd-period">' + (fr ? 'Prix magasin' : 'سعر المحل') + '</div></div>'
      + stockBadge(p, fr)
      + '</div>'
      + '<div class="rzq-pd-qty"><span>' + (fr ? 'Quantité' : 'الكمية') + '</span>'
      + '<button type="button" onclick="RizqStoreCommerce.changeQty(-1)" aria-label="-">−</button>'
      + '<span id="rzq-pd-qty">' + qty + '</span>'
      + '<button type="button" onclick="RizqStoreCommerce.changeQty(1)" aria-label="+">+</button>'
      + '<strong id="rzq-pd-total" class="rzq-pd-total" style="margin-inline-start:6px">' + (priceNum * qty).toLocaleString('en-US') + ' MRU</strong>'
      + '</div>'
      + '<div class="rzq-pd-actions">'
      + '<button type="button" class="rzq-pd-btn rzq-pd-btn-cart" onclick="RizqStoreCommerce.addFromDetail()">🛒 ' + (fr ? 'Ajouter au panier' : 'أضف للسلة') + '</button>'
      + '<button type="button" class="rzq-pd-btn rzq-pd-btn-ask" onclick="RizqStoreCommerce.askFromDetail()">💬 ' + (fr ? 'Demander' : 'استفسر') + '</button>'
      + '<button type="button" class="rzq-pd-btn rzq-pd-btn-ghost" onclick="RizqStoreCommerce.shareFromDetail()">↗ ' + (fr ? 'Partager ce produit' : 'مشاركة هذا المنتج') + '</button>'
      + '</div>'
      + '</div></div>'
      + (desc
        ? '<div class="rzq-pd-block"><div class="rzq-pd-block-title">' + (fr ? '📝 Description' : '📝 الوصف') + '</div>'
          + '<div class="rzq-pd-desc">' + esc(desc) + '</div></div>'
        : '')
      + '<div class="rzq-pd-block"><div class="rzq-pd-block-title">' + (fr ? '📋 Fiche' : '📋 المواصفات') + '</div>'
      + '<div class="rzq-pd-specs">'
      + '<div class="rzq-pd-spec"><span class="rzq-pd-spec-ico">📂</span><div><div class="rzq-pd-spec-label">' + (fr ? 'Catégorie' : 'الفئة') + '</div><div class="rzq-pd-spec-val">' + esc(cat) + '</div></div></div>'
      + '<div class="rzq-pd-spec"><span class="rzq-pd-spec-ico">💰</span><div><div class="rzq-pd-spec-label">' + (fr ? 'Prix' : 'السعر') + '</div><div class="rzq-pd-spec-val">' + esc(priceTxt) + '</div></div></div>'
      + '<div class="rzq-pd-spec"><span class="rzq-pd-spec-ico">🏪</span><div><div class="rzq-pd-spec-label">' + (fr ? 'Magasin' : 'المحل') + '</div><div class="rzq-pd-spec-val">' + esc(storeName) + '</div></div></div>'
      + '<div class="rzq-pd-spec"><span class="rzq-pd-spec-ico">📦</span><div><div class="rzq-pd-spec-label">' + (fr ? 'Disponibilité' : 'التوفر') + '</div><div class="rzq-pd-spec-val">' + esc((global.RizqStock && RizqStock.buyerLabel) ? (RizqStock.buyerLabel(p.stock, fr) || {}).text || (fr ? 'En stock' : 'متوفر') : (fr ? 'En stock' : 'متوفر')) + '</div></div></div>'
      + '</div></div>'
      + '<div class="rzq-pd-block"><div class="rzq-pd-block-title">' + (fr ? '🏷 Étiquettes' : '🏷 الوسوم') + '</div>'
      + '<div class="rzq-pd-tags">'
      + '<span class="rzq-pd-tag">📂 ' + esc(cat) + '</span>'
      + '<span class="rzq-pd-tag">🏪 ' + esc(storeName) + '</span>'
      + (p.isNew ? '<span class="rzq-pd-tag">✨ ' + (fr ? 'Nouveau' : 'جديد') + '</span>' : '')
      + (p.discount || p.oldPrice ? '<span class="rzq-pd-tag">🏷 ' + (fr ? 'Promo' : 'تخفيض') + '</span>' : '')
      + '</div></div>'
      + '<div class="rzq-pd-disclaimer">⚖️ <strong>رزق</strong> '
      + (fr
        ? "est une plateforme de mise en relation uniquement — paiement et livraison se font directement avec le magasin. <span>Vérifiez avant de payer</span>."
        : 'وسيط نشر إلكتروني فقط — الدفع والتسليم يتمان مباشرة مع المحل. <span>عاين المنتج قبل أي دفع</span>.')
      + '</div>'
      + similarHtml
      + '</div>';
  }

  function findProductById(id, catalog) {
    var list = catalog || (_pdState.opts && _pdState.opts.catalog) || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) return list[i];
    }
    return null;
  }

  function openProductDetail(idOrProduct, opts) {
    opts = opts || _pdState.opts || {};
    var p = (idOrProduct && typeof idOrProduct === 'object')
      ? idOrProduct
      : findProductById(idOrProduct, opts.catalog);
    if (!p && _pdState.product && String(_pdState.product.id) === String(idOrProduct)) p = _pdState.product;
    if (!p) return false;

    var catalog = opts.catalog || [];
    _pdState.product = p;
    _pdState.opts = opts;
    _pdState.idx = 0;
    _pdState.qty = 1;
    _pdState.similar = catalog.filter(function (x) {
      return String(x.id) !== String(p.id) && (!p.cat || x.cat === p.cat);
    });
    if (_pdState.similar.length < 2) {
      _pdState.similar = catalog.filter(function (x) { return String(x.id) !== String(p.id); });
    }

    var root = ensureDetailHost();
    var sheet = document.getElementById('rzq-pd-sheet');
    if (sheet) sheet.innerHTML = renderDetailHtml(p, opts);
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
    return true;
  }

  function closeProductDetail() {
    var root = document.getElementById('rzq-pd-root');
    if (root) root.classList.remove('open');
    document.body.style.overflow = '';
    closeLightbox();
  }

  function setPhoto(i) {
    var imgs = imagesOf(_pdState.product);
    if (!imgs.length) return;
    _pdState.idx = ((i % imgs.length) + imgs.length) % imgs.length;
    var img = document.getElementById('rzq-pd-main-img');
    if (img) img.src = imgs[_pdState.idx];
    var c = document.getElementById('rzq-pd-counter');
    if (c) c.textContent = (_pdState.idx + 1) + ' / ' + imgs.length;
    document.querySelectorAll('.rzq-pd-thumb').forEach(function (t, n) {
      t.classList.toggle('active', n === _pdState.idx);
    });
  }

  function navPhoto(dir) { setPhoto((_pdState.idx || 0) + dir); }

  function openLightbox() {
    var imgs = imagesOf(_pdState.product);
    var box = document.getElementById('rzq-pd-lightbox');
    var img = document.getElementById('rzq-pd-lightbox-img');
    if (!box || !img) return;
    if (imgs.length) {
      img.src = imgs[_pdState.idx || 0];
      img.style.display = '';
    } else {
      img.style.display = 'none';
    }
    box.classList.add('open');
  }

  function closeLightbox() {
    var box = document.getElementById('rzq-pd-lightbox');
    if (box) box.classList.remove('open');
  }

  function changeQty(delta) {
    _pdState.qty = Math.max(1, Math.min(99, (_pdState.qty || 1) + delta));
    var q = document.getElementById('rzq-pd-qty');
    var t = document.getElementById('rzq-pd-total');
    if (q) q.textContent = _pdState.qty;
    if (t && _pdState.product) {
      t.textContent = ((Number(_pdState.product.price) || 0) * _pdState.qty).toLocaleString('en-US') + ' MRU';
    }
  }

  function addFromDetail() {
    var p = _pdState.product;
    var opts = _pdState.opts || {};
    if (!p) return;
    if (typeof opts.onAdd === 'function') {
      opts.onAdd(p, _pdState.qty || 1);
    }
    closeProductDetail();
  }

  function askFromDetail() {
    var p = _pdState.product;
    var opts = _pdState.opts || {};
    if (!p) return;
    if (typeof opts.onAsk === 'function') opts.onAsk(p);
    else closeProductDetail();
  }

  function shareFromDetail() {
    var p = _pdState.product;
    var opts = _pdState.opts || {};
    if (!p) return;
    var fr = !!(opts.fr);
    var title = fr ? (p.nameF || p.name) : (p.name || p.nameF);
    var url = location.href.split('#')[0] + '#product-' + encodeURIComponent(String(p.id));
    if (navigator.share) {
      navigator.share({ title: title, text: title, url: url }).catch(function () {});
    } else if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).catch(function () {});
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var lb = document.getElementById('rzq-pd-lightbox');
      if (lb && lb.classList.contains('open')) { closeLightbox(); return; }
      var root = document.getElementById('rzq-pd-root');
      if (root && root.classList.contains('open')) closeProductDetail();
    }
  });

  global.RizqStoreCommerce = {
    PAGE_SIZE: PAGE_SIZE,
    esc: esc,
    imagesOf: imagesOf,
    productMediaHtml: productMediaHtml,
    bindMedia: bindMedia,
    cleanDesc: cleanDesc,
    isPlaceholderDesc: isPlaceholderDesc,
    mapRawProduct: mapRawProduct,
    pageSlice: pageSlice,
    storeIdFromUrl: storeIdFromUrl,
    withStoreId: withStoreId,
    wireStoreLinks: wireStoreLinks,
    setLogo: setLogo,
    introVideoSlots: introVideoSlots,
    promoVideosOf: promoVideosOf,
    openProductDetail: openProductDetail,
    closeProductDetail: closeProductDetail,
    setPhoto: setPhoto,
    navPhoto: navPhoto,
    openLightbox: openLightbox,
    closeLightbox: closeLightbox,
    changeQty: changeQty,
    addFromDetail: addFromDetail,
    askFromDetail: askFromDetail,
    shareFromDetail: shareFromDetail
  };
})(window);
