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

  function mapRawProduct(p, i) {
    var priceNum = parseFloat(String(p.price == null ? '0' : p.price).replace(/[^\d.]/g, '')) || 0;
    var isNew = false;
    try { isNew = p.addedAt && (Date.now() - new Date(p.addedAt).getTime()) < 3 * 86400000; } catch (e) {}
    var imgs = imagesOf(p);
    return {
      id: p.id != null ? p.id : (i + 1),
      _idx: i + 1,
      name: p.name || '',
      nameF: p.nameF || p.name || '',
      cat: p.cat || 'عام',
      emoji: p.emoji || '📦',
      price: priceNum,
      oldPrice: p.oldPrice || null,
      discount: !!p.discount,
      isNew: isNew,
      desc: p.desc || '',
      descF: p.descF || p.desc || '',
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

  global.RizqStoreCommerce = {
    PAGE_SIZE: PAGE_SIZE,
    esc: esc,
    imagesOf: imagesOf,
    productMediaHtml: productMediaHtml,
    bindMedia: bindMedia,
    mapRawProduct: mapRawProduct,
    pageSlice: pageSlice,
    storeIdFromUrl: storeIdFromUrl,
    withStoreId: withStoreId,
    wireStoreLinks: wireStoreLinks,
    setLogo: setLogo
  };
})(window);
