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

  /** توحيد عنصر كتالوج (محل / معرض / شركة) لبطاقة التفاصيل والتكبير */
  function parsePriceNum(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    var n = parseFloat(String(v == null ? '' : v).replace(/[^\d.]/g, ''));
    return isFinite(n) ? n : 0;
  }

  function normalizeCatalogItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var p = Object.assign({}, raw);
    p.name = p.name || p.title || '';
    p.nameF = p.nameF || p.nameFr || p.titleFr || '';
    p.desc = cleanDesc(p.desc || p.specs || p.description || '');
    p.descF = cleanDesc(p.descF || p.specsFr || p.descriptionFr || p.desc || '');
    p.price = parsePriceNum(p.price);
    if (p.oldPrice != null) p.oldPrice = parsePriceNum(p.oldPrice);
    if (!p.emoji) p.emoji = '📦';
    if (!Array.isArray(p.images) && p.image) p.images = [p.image];
    if (p.variants != null && typeof p.variants !== 'string' && !Array.isArray(p.variants)) {
      try { p.variants = String(p.variants); } catch (eV) { p.variants = ''; }
    }
    if (p.unit != null) p.unit = String(p.unit).slice(0, 40);
    if (p.sku != null) p.sku = String(p.sku).slice(0, 64);
    if (global.RizqStock && typeof RizqStock.normalizeSizeStock === 'function') {
      var ss = RizqStock.normalizeSizeStock(p.sizeStock);
      if (ss) {
        p.sizeStock = ss;
        var sum = RizqStock.sumSizeStock(ss);
        if (sum != null && (p.stock == null || String(p.stock).trim() === '')) p.stock = sum;
      }
    }
    return p;
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
      sizeStock: (global.RizqStock && RizqStock.normalizeSizeStock)
        ? (RizqStock.normalizeSizeStock(p.sizeStock) || null)
        : (p.sizeStock || null),
      variants: p.variants || '',
      unit: p.unit || '',
      sku: p.sku || '',
      imgData: imgs[0] || p.imgData || '',
      imgDataArr: imgs,
      images: imgs,
      storeId: p.storeId || p.accountId || ''
    };
  }

  /** توحيد تسميات المقاسات الكبيرة: XXXL→3XL، XXXXL→4XL، 3xl→3XL */
  function normalizeSizeToken(tok) {
    var t = String(tok == null ? '' : tok).trim();
    if (!t) return '';
    var u = t.toUpperCase().replace(/\s+/g, '');
    if (u === 'XXXL' || u === 'XXLXL' || u === '3X' || u === 'XXX') return '3XL';
    if (u === 'XXXXL' || u === '4X' || u === 'XXXX') return '4XL';
    if (u === '2XL') return 'XXL';
    if (/^\d+XL$/.test(u) || /^(XS|S|M|L|XL|XXL)$/.test(u)) return u;
    return t;
  }

  /** تقسيم خيارات المقاسات/الأوزان من نص البائع أو مصفوفة */
  function splitVariantTokens(raw) {
    if (Array.isArray(raw)) {
      return raw.map(function (x) { return normalizeSizeToken(x); }).filter(Boolean);
    }
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return [];
    return s.split(/[,،|/·•]+/).map(function (x) { return normalizeSizeToken(x); }).filter(Boolean);
  }

  function inferVariantKind(product) {
    var cat = String((product && product.cat) || '').toLowerCase();
    var name = String((product && (product.name || product.nameF)) || '').toLowerCase();
    var blob = cat + ' ' + name;
    if (/حذاء|أحذية|صندل|basket|chaussure|shoe|sandal/.test(blob)) return 'shoe';
    if (/أزياء|ملابس|قميص|فستان|تيشيرت|معطف|دراعة|robe|chemise|t-shirt|mode|clothing|apparel/.test(blob)) return 'apparel';
    if (/كغ|كيلو|غرام|\bkg\b|\bg\b|وزن|weight|سمن|أرز|سكر|طحين|أغذية|تموين|aliment|food|épicerie/.test(blob)) return 'weight';
    if (/مل|ml|لتر|litre|عطر|parfum|كريم/.test(blob)) return 'volume';
    if (/gb|go|تخزين|phone|هاتف|إلكترون/.test(blob)) return 'storage';
    return 'generic';
  }

  function defaultOptionsForKind(kind) {
    if (kind === 'shoe') {
      return ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50'].map(function (n) {
        return { value: n, label: n + ' EU' };
      });
    }
    if (kind === 'apparel') {
      return ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'].map(function (n) {
        return { value: n, label: n };
      });
    }
    if (kind === 'weight') {
      return [
        { value: '250g', label: '250 غ' },
        { value: '500g', label: '500 غ' },
        { value: '1kg', label: '1 كغ' },
        { value: '5kg', label: '5 كغ' }
      ];
    }
    if (kind === 'volume') {
      return [
        { value: '50ml', label: '50 مل' },
        { value: '100ml', label: '100 مل' },
        { value: '200ml', label: '200 مل' }
      ];
    }
    if (kind === 'storage') {
      return [
        { value: '64GB', label: '64 GB' },
        { value: '128GB', label: '128 GB' },
        { value: '256GB', label: '256 GB' }
      ];
    }
    return [];
  }

  function variantGroupMeta(kind, fr) {
    var map = {
      shoe: { key: 'size', ar: 'المقاس', fr: 'Taille' },
      apparel: { key: 'size', ar: 'المقاس', fr: 'Taille' },
      weight: { key: 'weight', ar: 'الوزن', fr: 'Poids' },
      volume: { key: 'volume', ar: 'الحجم', fr: 'Volume' },
      storage: { key: 'storage', ar: 'السعة', fr: 'Capacité' },
      generic: { key: 'option', ar: 'الخيار', fr: 'Option' },
      color: { key: 'color', ar: 'اللون', fr: 'Couleur' }
    };
    var m = map[kind] || map.generic;
    return { key: m.key, label: fr ? m.fr : m.ar, labelAr: m.ar, labelFr: m.fr };
  }

  /**
   * مجموعات خيارات ديناميكية للمنتج (مقاس / وزن / لون…) — من variants البائع أو استنتاج الفئة.
   * الشكل: [{ key, label, options:[{value,label}] }]
   */
  function resolveVariantGroups(product, fr) {
    fr = !!fr;
    var p = product || {};
    var groups = [];
    var raw = p.variants;
    var kind = inferVariantKind(p);

    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      Object.keys(raw).forEach(function (k) {
        var opts = splitVariantTokens(raw[k]).map(function (v) {
          return { value: v, label: v };
        });
        if (!opts.length) return;
        var lk = String(k).toLowerCase();
        var meta = /لون|color|couleur/.test(lk)
          ? variantGroupMeta('color', fr)
          : (/وزن|weight|كغ|غرام/.test(lk)
            ? variantGroupMeta('weight', fr)
            : (/مقاس|size|taille|حذاء/.test(lk)
              ? variantGroupMeta(kind === 'shoe' ? 'shoe' : 'apparel', fr)
              : { key: 'opt_' + k, label: k, labelAr: k, labelFr: k }));
        groups.push({
          key: meta.key === 'option' ? ('opt_' + String(k).replace(/\s+/g, '_')) : meta.key,
          label: meta.label || k,
          options: opts
        });
      });
    } else {
      var text = String(raw == null ? '' : raw).trim();
      if (text && /[:：]/.test(text)) {
        text.split(/[·•|]+/).forEach(function (chunk) {
          var parts = chunk.split(/[:：]/);
          if (parts.length < 2) return;
          var gName = parts[0].trim();
          var opts = splitVariantTokens(parts.slice(1).join(':'));
          if (!gName || !opts.length) return;
          var lk = gName.toLowerCase();
          var meta = /لون|color|couleur/.test(lk)
            ? variantGroupMeta('color', fr)
            : (/وزن|weight|poids|كغ|غ/.test(lk)
              ? variantGroupMeta('weight', fr)
              : (/مقاس|size|taille/.test(lk)
                ? variantGroupMeta(kind === 'shoe' ? 'shoe' : 'apparel', fr)
                : { key: 'opt_' + gName.replace(/\s+/g, '_'), label: gName }));
          groups.push({
            key: meta.key,
            label: meta.label || gName,
            options: opts.map(function (v) { return { value: v, label: v }; })
          });
        });
      } else if (text) {
        var tokens = splitVariantTokens(text);
        if (tokens.length) {
          var meta2 = variantGroupMeta(kind, fr);
          groups.push({
            key: meta2.key,
            label: meta2.label,
            options: tokens.map(function (v) { return { value: v, label: v }; })
          });
        }
      }
    }

    if (!groups.length) {
      var defaults = defaultOptionsForKind(kind);
      if (defaults.length) {
        var meta3 = variantGroupMeta(kind, fr);
        groups.push({ key: meta3.key, label: meta3.label, options: defaults });
      }
    }
    return groups;
  }

  function variantSelectionKey(selected) {
    if (!selected || typeof selected !== 'object') return '';
    return Object.keys(selected).sort().map(function (k) {
      return k + '=' + String(selected[k] || '');
    }).join('|');
  }

  function variantSelectionLabel(groups, selected, fr) {
    if (!groups || !groups.length || !selected) return '';
    return groups.map(function (g) {
      var v = selected[g.key];
      if (!v) return '';
      var opt = (g.options || []).find(function (o) { return String(o.value) === String(v); });
      var lab = opt ? opt.label : v;
      return g.label + ': ' + lab;
    }).filter(Boolean).join(' · ');
  }

  function cartLineIdForProduct(productId, selected) {
    var base = String(productId == null ? '' : productId);
    var vk = variantSelectionKey(selected);
    if (!vk) return base;
    var slug = vk.replace(/[^a-zA-Z0-9=_|-]+/g, '_').slice(0, 80);
    return base + '__v_' + slug;
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
      return params.get('id') || params.get('store') || params.get('showroom') || params.get('corp') || '';
    } catch (e) {
      return '';
    }
  }

  /** معرّف البائع على سطر السلة (محل أو معرض) */
  function cartLineSellerId(line) {
    if (!line) return '';
    return String(line.storeId || line.accountId || '');
  }

  /**
   * سلة الزائر واحدة في localStorage، لكن واجهة كل محل/معرض تعرض فقط أسطره.
   * بدون sellerId تُعاد كل الأسطر (السلة العامة).
   */
  function cartLinesForSeller(items, sellerId) {
    var list = Array.isArray(items) ? items : [];
    if (!sellerId) return list.slice();
    var sid = String(sellerId);
    return list.filter(function (c) {
      return cartLineSellerId(c) === sid;
    });
  }

  function cartQtyForSeller(items, sellerId) {
    return cartLinesForSeller(items, sellerId).reduce(function (s, c) {
      return s + (Number(c.qty) || 0);
    }, 0);
  }

  function withStoreId(href, storeId) {
    if (!storeId) return href;
    try {
      var u = new URL(href, location.href);
      u.searchParams.set('id', storeId);
      // اسم الملف فقط — لا تُرجع pathname كاملاً (مثل rizq-platform/...) وإلا
      // يُحلّ الرابط النسبي على GitHub Pages إلى مسار مزدوج → 404.
      var parts = String(u.pathname || '').split('/').filter(Boolean);
      var file = parts.length ? parts[parts.length - 1] : '';
      if (!file) {
        var raw = String(href || '').split('?')[0].split('#')[0];
        file = raw.split('/').filter(Boolean).pop() || raw;
      }
      return file + u.search + u.hash;
    } catch (e2) {
      var base = String(href || '').split('?')[0].split('#')[0];
      var leaf = base.split('/').filter(Boolean).pop() || base;
      return leaf + '?id=' + encodeURIComponent(storeId);
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

  /** روابط صور آمنة فقط — يمنع javascript:/data:text XSS عبر src */
  function safeMediaUrl(u) {
    if (!u) return '';
    var s = String(u).trim();
    if (!s) return '';
    if (/[\s<>"']/.test(s) || /javascript:/i.test(s)) return '';
    if (s.charAt(0) === '/' || s.indexOf('./') === 0 || s.indexOf('../') === 0) {
      return s;
    }
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(s)) return s;
    try {
      var p = new URL(s, (typeof location !== 'undefined' && location.href) || 'https://local.invalid/');
      if (p.protocol !== 'http:' && p.protocol !== 'https:') return '';
      return s;
    } catch (e) {
      return '';
    }
  }

  function setLogo(el, thumb, emoji) {
    if (!el) return;
    var safe = safeMediaUrl(thumb);
    if (safe) {
      el.innerHTML = '<img src="' + esc(safe) + '" alt="" width="88" height="88" decoding="async" fetchpriority="high" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block"/>';
      var img = el.querySelector('img');
      if (img && emoji) {
        img.addEventListener('error', function () {
          el.textContent = emoji;
          el.classList.remove('is-storefront');
        }, { once: true });
      }
    } else if (emoji) {
      el.textContent = emoji;
    } else {
      el.textContent = '';
    }
  }

  function ensureStorefrontLightbox() {
    var box = document.getElementById('rzq-storefront-lb');
    if (box) return box;
    box = document.createElement('div');
    box.id = 'rzq-storefront-lb';
    box.className = 'rzq-storefront-lb';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-hidden', 'true');
    box.innerHTML =
      '<div class="rzq-storefront-lb-panel">' +
        '<button type="button" class="rzq-storefront-lb-close" aria-label="إغلاق">×</button>' +
        '<figure class="rzq-storefront-lb-figure">' +
          '<img class="rzq-storefront-lb-img" alt="" />' +
          '<figcaption class="rzq-storefront-lb-cap"></figcaption>' +
        '</figure>' +
      '</div>';
    document.body.appendChild(box);
    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('rzq-storefront-lb-on');
    }
    box.addEventListener('click', function (e) {
      if (e.target === box) close();
    });
    var closeBtn = box.querySelector('.rzq-storefront-lb-close');
    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) close();
    });
    box._rzqClose = close;
    return box;
  }

  /**
   * دائرة الشعار/واجهة المحل: تعرض صورة الواجهة، وبالضغط تنبثق صورة مهذبة.
   * يُفضَّل cover (غلاف الواجهة)، ثم thumb.
   */
  function wireStorefrontLogo(el, opts) {
    if (!el) return;
    opts = opts || {};
    var facade = safeMediaUrl(opts.cover) || safeMediaUrl(opts.thumb) || '';
    var circle = safeMediaUrl(opts.cover) || safeMediaUrl(opts.thumb) || '';
    var name = String(opts.name || '').trim();
    var kind = String(opts.kind || 'store');
    var fr = !!opts.fr;
    var emoji = opts.emoji || (kind === 'corp' || kind === 'showroom' ? '🏛️' : (kind === 'office' ? '🛡️' : '🏪'));
    setLogo(el, circle, emoji);
    el.classList.toggle('is-storefront', !!facade);
    el.setAttribute('role', facade ? 'button' : 'img');
    el.tabIndex = facade ? 0 : -1;
    var tip = fr
      ? (kind === 'corp' || kind === 'showroom' ? 'Voir la vitrine du showroom'
        : (kind === 'office' ? 'Voir la façade du bureau' : 'Voir la façade de la boutique'))
      : (kind === 'corp' || kind === 'showroom' ? 'عرض واجهة المعرض'
        : (kind === 'office' ? 'عرض واجهة المكتب' : 'عرض واجهة المحل'));
    if (facade) {
      el.title = tip;
      el.setAttribute('aria-label', tip + (name ? ' — ' + name : ''));
    } else {
      el.removeAttribute('title');
      el.removeAttribute('aria-label');
    }
    el._rzqStorefront = { url: facade, name: name, kind: kind, fr: fr };
    if (el._rzqStorefrontBound) return;
    el._rzqStorefrontBound = true;
    function open() {
      var data = el._rzqStorefront || {};
      if (!data.url) return;
      var box = ensureStorefrontLightbox();
      var img = box.querySelector('.rzq-storefront-lb-img');
      var cap = box.querySelector('.rzq-storefront-lb-cap');
      if (img) {
        img.src = data.url;
        img.alt = data.name || '';
      }
      if (cap) {
        var label = data.fr
          ? ((data.kind === 'corp' || data.kind === 'showroom') ? 'Vitrine du showroom'
            : (data.kind === 'office' ? 'Façade du bureau' : 'Façade de la boutique'))
          : ((data.kind === 'corp' || data.kind === 'showroom') ? 'واجهة المعرض'
            : (data.kind === 'office' ? 'واجهة المكتب' : 'واجهة المحل'));
        cap.textContent = data.name ? (label + ' — ' + data.name) : label;
      }
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('rzq-storefront-lb-on');
    }
    el.addEventListener('click', function (e) {
      if (!(el._rzqStorefront && el._rzqStorefront.url)) return;
      e.preventDefault();
      open();
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!(el._rzqStorefront && el._rzqStorefront.url)) return;
        e.preventDefault();
        open();
      }
    });
  }

  /**
   * خلفية هيرو المحل/المكتب/المعرض = غلاف مخصّص (cover) من الداشبورد.
   * يُفضَّل cover؛ يمكن تمرير cover || thumb حتى لا يظهر الكحلي الفارغ.
   */
  function setHeroPhoto(heroEl, cover) {
    if (!heroEl) return false;
    var safe = safeMediaUrl(cover);
    var slot = heroEl.querySelector('.hero-photo') || heroEl.querySelector('[data-hero-photo]');
    if (!safe) {
      heroEl.classList.remove('has-hero-photo');
      if (slot) {
        slot.innerHTML = '';
        slot.hidden = true;
        if (typeof slot.removeAttribute === 'function') slot.removeAttribute('style');
        else if (slot.style) {
          slot.style.backgroundImage = '';
          slot.style.backgroundSize = '';
          slot.style.backgroundPosition = '';
        }
      }
      return false;
    }
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'hero-photo';
      slot.setAttribute('aria-hidden', 'true');
      heroEl.insertBefore(slot, heroEl.firstChild);
    }
    slot.hidden = false;
    /* أظهر الطبقة فوراً حتى قبل اكتمال تحميل الصورة — يمنع وميض الكحلي */
    heroEl.classList.add('has-hero-photo');
    slot.style.backgroundImage = 'url("' + String(safe).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '")';
    slot.style.backgroundSize = 'cover';
    slot.style.backgroundPosition = 'center';
    var img = slot.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.setAttribute('fetchpriority', 'high');
      slot.appendChild(img);
    }
    if (img.getAttribute('src') !== safe) img.src = safe;
    try{
      var sid = '';
      try{
        var q = new URLSearchParams(location.search);
        sid = q.get('id') || q.get('store') || q.get('office') || q.get('corp') || q.get('showroom') || '';
      }catch(eQ){}
      if(sid && safe && safe.indexOf('data:') !== 0){
        sessionStorage.setItem('rizq_hero_cover_' + sid, String(safe).slice(0, 2000));
        /* توافق مع مفتاح الكاش القديم للمحل */
        sessionStorage.setItem('rizq_store_cover_' + sid, String(safe).slice(0, 2000));
      }
    }catch(eCache){}
    return true;
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
  var _pdState = { product: null, idx: 0, qty: 1, opts: null, similar: [], variantGroups: [], selected: {} };

  function ensureLightboxHost() {
    var box = document.getElementById('rzq-pd-lightbox');
    var needsBuild = !box || !document.getElementById('rzq-pd-lightbox-content');
    if (!box) {
      box = document.createElement('div');
      box.id = 'rzq-pd-lightbox';
      box.className = 'rzq-pd-lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.addEventListener('click', function (e) {
        if (e.target === box) closeLightbox();
      });
    }
    if (needsBuild) {
      box.className = 'rzq-pd-lightbox';
      box.innerHTML =
        '<button type="button" class="rzq-pd-lightbox-close" onclick="event.stopPropagation();RizqStoreCommerce.closeLightbox()" aria-label="✕">✕</button>'
        + '<div class="rzq-pd-lightbox-content" id="rzq-pd-lightbox-content" onclick="event.stopPropagation()"></div>'
        + '<div class="rzq-pd-lightbox-meta" id="rzq-pd-lightbox-meta"></div>';
    }
    if (box.parentElement !== document.body) document.body.appendChild(box);
    return box;
  }

  /**
   * تفويض أحداث لوحة المنتج — تجنّب onclick مضمّن مع JSON.stringify
   * داخل سمات HTML بعلامات اقتباس مزدوجة (كانت تقطع المعالج وتجمّد المقاس/الوزن/المشابه).
   */
  function wireDetailDelegation(root) {
    if (!root || root.dataset.pdWired === '1') return;
    root.dataset.pdWired = '1';
    function handleSimActivate(t) {
      if (!t || !root.contains(t)) return;
      var pid = t.getAttribute('data-pid');
      if (pid) openProductDetail(pid);
    }
    root.addEventListener('click', function (e) {
      if (e.target === root) {
        closeProductDetail();
        return;
      }
      var t = e.target && e.target.closest ? e.target.closest('.rzq-pd-vopt') : null;
      if (t && root.contains(t) && !t.disabled && !t.classList.contains('is-oos')) {
        e.preventDefault();
        selectVariant(t.getAttribute('data-vgroup'), t.getAttribute('data-vval'));
        return;
      }
      t = e.target && e.target.closest ? e.target.closest('[data-pd-qty]') : null;
      if (t && root.contains(t)) {
        e.preventDefault();
        var delta = Number(t.getAttribute('data-pd-qty'));
        if (!isNaN(delta)) changeQty(delta);
        return;
      }
      t = e.target && e.target.closest ? e.target.closest('.rzq-pd-sim[data-pid]') : null;
      if (t && root.contains(t)) {
        e.preventDefault();
        handleSimActivate(t);
        return;
      }
    });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = e.target && e.target.closest ? e.target.closest('.rzq-pd-sim[data-pid]') : null;
      if (!t || !root.contains(t)) return;
      e.preventDefault();
      handleSimActivate(t);
    });
  }

  function ensureDetailHost() {
    var root = document.getElementById('rzq-pd-root');
    if (root) {
      wireDetailDelegation(root);
      ensureLightboxHost();
      return root;
    }
    root = document.createElement('div');
    root.id = 'rzq-pd-root';
    root.className = 'rzq-pd-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = '<div class="rzq-pd-sheet" id="rzq-pd-sheet"></div>';
    wireDetailDelegation(root);
    document.body.appendChild(root);
    ensureLightboxHost();
    return root;
  }

  function stockBadge(p, fr, selected) {
    var info = null;
    if (global.RizqStock && typeof RizqStock.buyerLabelForSelection === 'function') {
      info = RizqStock.buyerLabelForSelection(p, selected || _pdState.selected || {}, fr);
    } else if (global.RizqStock && typeof RizqStock.buyerLabel === 'function') {
      info = RizqStock.buyerLabel(p.stock, fr);
    }
    if (info) {
      return '<span class="rzq-pd-badge ' + esc(info.level || 'in') + '" id="rzq-pd-stock-badge">'
        + esc(info.text) + '</span>';
    }
    if (p.stock != null && String(p.stock).trim() !== '') {
      return '<span class="rzq-pd-badge in" id="rzq-pd-stock-badge">' + esc(String(p.stock)) + '</span>';
    }
    return '<span class="rzq-pd-badge in" id="rzq-pd-stock-badge">' + (fr ? 'En stock' : 'موجود في الاستوك') + '</span>';
  }

  function optionStockMeta(p, value) {
    if (!global.RizqStock || !RizqStock.hasSizeStock(p)) return { qty: null, oos: false };
    var q = RizqStock.sizeQty(p, value);
    if (q == null) return { qty: null, oos: false };
    return { qty: q, oos: q <= 0 };
  }

  function renderDetailHtml(p, opts) {
    opts = opts || {};
    var fr = !!opts.fr;
    var storeName = opts.storeName || (fr ? 'Boutique' : 'المحل');
    var moduleLabel = opts.moduleLabel || (fr ? 'Fiche produit' : 'بطاقة منتج');
    var pricePeriod = opts.pricePeriod || (fr ? 'Prix magasin' : 'سعر المحل');
    var imgs = imagesOf(p);
    var title = fr ? (p.nameF || p.name || '') : (p.name || p.nameF || '');
    var titleAlt = fr ? (p.name || '') : (p.nameF || '');
    var desc = cleanDesc(fr ? (p.descF || p.desc || '') : (p.desc || p.descF || ''));
    var priceNum = parsePriceNum(p.price);
    var priceTxt = priceNum > 0 ? (priceNum.toLocaleString('en-US') + ' MRU') : (fr ? 'Sur demande' : 'حسب الطلب');
    var oldTxt = p.oldPrice ? parsePriceNum(p.oldPrice).toLocaleString('en-US') + ' MRU' : '';
    var cat = p.cat || (fr ? 'Produit' : 'منتج');
    var emoji = p.emoji || '📦';
    var qty = _pdState.qty || 1;
    var showCart = opts.showCart !== false;
    var showAsk = opts.showAsk !== false;
    var groups = _pdState.variantGroups || [];
    var selected = _pdState.selected || {};

    var variantsHtml = '';
    if (groups.length) {
      variantsHtml = groups.map(function (g) {
        var cur = selected[g.key] || '';
        var curOpt = (g.options || []).find(function (o) { return String(o.value) === String(cur); });
        var curLab = curOpt ? curOpt.label : cur;
        return '<div class="rzq-pd-variant" data-vgroup="' + esc(g.key) + '">'
          + '<div class="rzq-pd-variant-head">'
          + '<span class="rzq-pd-variant-label">' + esc(g.label) + ': '
          + '<strong id="rzq-pd-vsel-' + esc(g.key) + '">' + esc(curLab || (fr ? 'Choisir' : 'اختر')) + '</strong></span>'
          + '</div>'
          + '<div class="rzq-pd-variant-opts" role="listbox" aria-label="' + esc(g.label) + '">'
          + (g.options || []).map(function (o) {
            var on = String(o.value) === String(cur);
            var meta = optionStockMeta(p, o.value);
            var oos = !!meta.oos;
            var qtyHint = (meta.qty != null && meta.qty > 0 && meta.qty <= 5)
              ? (' <span class="rzq-pd-vopt-qty">' + meta.qty + '</span>')
              : '';
            return '<button type="button" class="rzq-pd-vopt'
              + (on ? ' is-selected' : '')
              + (oos ? ' is-oos' : '') + '"'
              + ' data-vgroup="' + esc(g.key) + '" data-vval="' + esc(o.value) + '"'
              + (oos ? ' disabled aria-disabled="true" title="' + (fr ? 'Rupture' : 'غير متوفر') + '"' : '')
              + ' aria-pressed="' + (on ? 'true' : 'false') + '"'
              + '>'
              + '<span class="rzq-pd-vopt-lab">' + esc(o.label) + '</span>'
              + qtyHint
              + '</button>';
          }).join('')
          + '</div></div>';
      }).join('');
    }

    var mainInner;
    if (imgs.length) {
      mainInner = '<img id="rzq-pd-main-img" src="' + esc(imgs[0]) + '" alt="' + esc(title) + '"'
        + ' onerror="RizqStoreCommerce.onMainImgError(this)"/>';
    } else {
      mainInner = '<div class="rzq-pd-emoji-stage"><span class="rzq-pd-emoji-xl" aria-hidden="true">' + esc(emoji) + '</span></div>';
    }
    var zoomHint = '<button type="button" class="rzq-pd-zoom-hint" onclick="event.stopPropagation();RizqStoreCommerce.openLightbox()">'
      + '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/><path d="M11 8v6M8 11h6"/></svg>'
      + '<span>' + (fr ? 'Agrandir' : 'تكبير') + '</span></button>';
    var nav = imgs.length > 1
      ? '<button type="button" class="rzq-pd-gal-btn prev" onclick="event.stopPropagation();RizqStoreCommerce.navPhoto(-1)" aria-label="' + (fr ? 'Précédente' : 'السابقة') + '">‹</button>'
        + '<button type="button" class="rzq-pd-gal-btn next" onclick="event.stopPropagation();RizqStoreCommerce.navPhoto(1)" aria-label="' + (fr ? 'Suivante' : 'التالية') + '">›</button>'
        + '<span class="rzq-pd-counter" id="rzq-pd-counter">1/' + imgs.length + '</span>'
      : (imgs.length === 1
        ? '<span class="rzq-pd-counter" id="rzq-pd-counter">1/1</span>'
        : '');
    var thumbs = '';
    if (imgs.length > 1) {
      thumbs = '<div class="rzq-pd-thumbs">' + imgs.map(function (src, i) {
        return '<div class="rzq-pd-thumb' + (i === 0 ? ' active' : '') + '" data-i="' + i + '" onclick="RizqStoreCommerce.setPhoto(' + i + ')">'
          + '<img src="' + esc(src) + '" alt="" loading="lazy"/></div>';
      }).join('') + '</div>';
    } else if (!imgs.length) {
      thumbs = '<div class="rzq-pd-thumbs"><div class="rzq-pd-thumb active"><span>' + esc(emoji) + '</span></div></div>';
    } else {
      thumbs = '<div class="rzq-pd-thumbs"><div class="rzq-pd-thumb active" data-i="0" onclick="RizqStoreCommerce.setPhoto(0)">'
        + '<img src="' + esc(imgs[0]) + '" alt="" loading="lazy"/></div></div>';
    }

    var similar = (_pdState.similar || []).slice(0, 4);
    var similarHtml = similar.length
      ? '<div class="rzq-pd-block"><div class="rzq-pd-block-title">' + (fr ? '✦ Produits similaires' : '✦ منتجات مشابهة') + '</div>'
        + '<div class="rzq-pd-similar">' + similar.map(function (s) {
          var sn = fr ? (s.nameF || s.name) : (s.name || s.nameF);
          var simImgs = imagesOf(s);
          var media = simImgs[0]
            ? '<img src="' + esc(simImgs[0]) + '" alt="" loading="lazy"/>'
            : esc(s.emoji || '📦');
          return '<div class="rzq-pd-sim" role="button" tabindex="0" data-pid="' + esc(String(s.id)) + '">'
            + '<div class="rzq-pd-sim-media">' + media + '</div>'
            + '<div class="rzq-pd-sim-body"><div class="rzq-pd-sim-title">' + esc(sn) + '</div>'
            + '<div class="rzq-pd-sim-price">' + (Number(s.price) || 0).toLocaleString('en-US') + ' MRU</div></div></div>';
        }).join('') + '</div></div>'
      : '';

    return ''
      + '<div class="rzq-pd-topbar">'
      + '<button type="button" class="rzq-pd-back" onclick="RizqStoreCommerce.closeProductDetail()">← ' + (fr ? 'Retour' : 'رجوع') + '</button>'
      + '<span class="rzq-pd-eyebrow">RIZQ · ' + esc(moduleLabel) + '</span>'
      + '<button type="button" class="rzq-pd-x" onclick="RizqStoreCommerce.closeProductDetail()" aria-label="' + (fr ? 'Fermer' : 'إغلاق') + '">✕</button>'
      + '</div>'
      + '<div class="rzq-pd-body">'
      + '<div class="rzq-pd-hero">'
      + '<div class="rzq-pd-gallery">'
      + '<div class="rzq-pd-gal-wrap">'
      + '<div class="rzq-pd-main" id="rzq-pd-main" role="button" tabindex="0" data-emo="' + esc(emoji) + '"'
      + ' onclick="RizqStoreCommerce.openLightbox()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();RizqStoreCommerce.openLightbox();}"'
      + ' title="' + (fr ? 'Cliquer pour agrandir' : 'انقر للتكبير') + '">'
      + mainInner + nav + zoomHint + '</div>'
      + '</div>'
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
      + '</div><div class="rzq-pd-period">' + esc(pricePeriod) + '</div></div>'
      + stockBadge(p, fr, selected)
      + '</div>'
      + variantsHtml
      + (showCart
        ? ('<div class="rzq-pd-qty"><span>' + (fr ? 'Quantité' : 'الكمية') + '</span>'
          + '<button type="button" data-pd-qty="-1" aria-label="-">−</button>'
          + '<span id="rzq-pd-qty">' + qty + '</span>'
          + '<button type="button" data-pd-qty="1" aria-label="+">+</button>'
          + '<strong id="rzq-pd-total" class="rzq-pd-total" style="margin-inline-start:6px">'
          + (priceNum > 0 ? ((priceNum * qty).toLocaleString('en-US') + ' MRU') : '—')
          + '</strong></div>')
        : '')
      + '<div class="rzq-pd-actions">'
      + (showCart ? '<button type="button" class="rzq-pd-btn rzq-pd-btn-cart" onclick="RizqStoreCommerce.addFromDetail()">🛒 ' + (fr ? 'Ajouter au panier' : 'أضف للسلة') + '</button>' : '')
      + (typeof opts.onWish === 'function'
        ? ('<button type="button" class="rzq-pd-btn rzq-pd-btn-ghost' + (opts.wishActive ? ' is-wish-on' : '') + '" id="rzq-pd-wish-btn" data-wish-id="' + esc(String(p.id == null ? '' : p.id)) + '" onclick="RizqStoreCommerce.wishFromDetail()">'
          + (opts.wishActive ? '❤ ' : '♡ ') + (fr ? 'Favoris' : 'المفضلة') + '</button>')
        : '')
      + (showAsk ? '<button type="button" class="rzq-pd-btn rzq-pd-btn-ask" onclick="RizqStoreCommerce.askFromDetail()">💬 ' + (fr ? 'Demander' : 'استفسر') + '</button>' : '')
      + '<button type="button" class="rzq-pd-btn rzq-pd-btn-ghost" onclick="RizqStoreCommerce.shareFromDetail()">↗ ' + (fr ? 'Partager' : 'مشاركة') + '</button>'
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
      + '<div class="rzq-pd-spec"><span class="rzq-pd-spec-ico">📦</span><div><div class="rzq-pd-spec-label">' + (fr ? 'Disponibilité' : 'التوفر') + '</div><div class="rzq-pd-spec-val" id="rzq-pd-stock-spec">' + esc((function () {
        var info = (global.RizqStock && RizqStock.buyerLabelForSelection)
          ? RizqStock.buyerLabelForSelection(p, selected, fr)
          : (global.RizqStock && RizqStock.buyerLabel ? RizqStock.buyerLabel(p.stock, fr) : null);
        return (info && info.text) || (fr ? 'En stock' : 'متوفر');
      })()) + '</div></div></div>'
      + (p.unit ? '<div class="rzq-pd-spec"><span class="rzq-pd-spec-ico">⚖</span><div><div class="rzq-pd-spec-label">' + (fr ? 'Unité' : 'الوحدة') + '</div><div class="rzq-pd-spec-val">' + esc(p.unit) + '</div></div></div>' : '')
      + (variantSelectionLabel(groups, selected, fr)
        ? '<div class="rzq-pd-spec"><span class="rzq-pd-spec-ico">📏</span><div><div class="rzq-pd-spec-label">' + (fr ? 'Choix' : 'اختيارك') + '</div><div class="rzq-pd-spec-val">' + esc(variantSelectionLabel(groups, selected, fr)) + '</div></div></div>'
        : '')
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
    p = normalizeCatalogItem(p) || p;

    var catalog = (opts.catalog || []).map(function (x) { return normalizeCatalogItem(x) || x; });
    opts = Object.assign({}, opts, { catalog: catalog });
    _pdState.product = p;
    _pdState.opts = opts;
    _pdState.idx = 0;
    _pdState.qty = Math.max(1, Math.min(99, Number(opts.qty) || 1));
    _pdState.variantGroups = resolveVariantGroups(p, !!opts.fr);
    _pdState.selected = {};
    if (opts.selected && typeof opts.selected === 'object') {
      _pdState.selected = Object.assign({}, opts.selected);
    } else if (opts.selectedVariant) {
      var g0 = _pdState.variantGroups[0];
      if (g0) _pdState.selected[g0.key] = String(opts.selectedVariant);
    }
    _pdState.variantGroups.forEach(function (g) {
      if (_pdState.selected[g.key]) {
        /* إن كان الاختيار المحفوظ نافذاً اتركه؛ وإلا اختر أول متوفر */
        var metaSel = optionStockMeta(p, _pdState.selected[g.key]);
        if (!metaSel.oos) return;
      }
      var pick = null;
      (g.options || []).forEach(function (o) {
        if (pick) return;
        var meta = optionStockMeta(p, o.value);
        if (!meta.oos) pick = String(o.value);
      });
      if (pick) _pdState.selected[g.key] = pick;
      else if (g.options && g.options[0]) _pdState.selected[g.key] = String(g.options[0].value);
    });
    /* حد الكمية حسب مخزون القياس المختار */
    var maxQ = selectedSizeMaxQty(p, _pdState.selected);
    if (maxQ != null) _pdState.qty = Math.max(1, Math.min(_pdState.qty, Math.max(1, maxQ) || 1));
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

  function selectedSizeMaxQty(p, selected) {
    if (!p || !global.RizqStock || !RizqStock.hasSizeStock(p)) {
      var total = global.RizqStock ? RizqStock.parse(p && p.stock) : null;
      return total;
    }
    var sizeVal = selected && (selected.size || selected.weight || selected.volume
      || selected.storage || selected.option || selected[Object.keys(selected || {})[0]]);
    var q = RizqStock.sizeQty(p, sizeVal);
    return q;
  }

  function refreshStockUi() {
    var p = _pdState.product;
    var opts = _pdState.opts || {};
    var fr = !!opts.fr;
    if (!p) return;
    var info = (global.RizqStock && RizqStock.buyerLabelForSelection)
      ? RizqStock.buyerLabelForSelection(p, _pdState.selected || {}, fr)
      : null;
    var badge = document.getElementById('rzq-pd-stock-badge');
    if (badge && info) {
      badge.className = 'rzq-pd-badge ' + (info.level || 'in');
      badge.textContent = info.text;
    }
    var spec = document.getElementById('rzq-pd-stock-spec');
    if (spec && info) spec.textContent = info.text;
    var maxQ = selectedSizeMaxQty(p, _pdState.selected);
    if (maxQ != null && maxQ >= 0 && (_pdState.qty || 1) > maxQ) {
      _pdState.qty = Math.max(1, maxQ || 1);
      var qEl = document.getElementById('rzq-pd-qty');
      if (qEl) qEl.textContent = _pdState.qty;
      var t = document.getElementById('rzq-pd-total');
      if (t) {
        var pn = parsePriceNum(p.price);
        t.textContent = pn > 0 ? ((pn * _pdState.qty).toLocaleString('en-US') + ' MRU') : '—';
      }
    }
  }

  function selectVariant(groupKey, value) {
    if (!_pdState.selected) _pdState.selected = {};
    groupKey = String(groupKey);
    value = String(value);
    var p = _pdState.product;
    var meta = optionStockMeta(p, value);
    if (meta.oos) {
      var fr = !!( _pdState.opts && _pdState.opts.fr);
      if (typeof global.showToast === 'function') {
        global.showToast(fr ? '❌ Cette taille est épuisée' : '❌ هذا القياس غير متوفر');
      }
      return;
    }
    _pdState.selected[groupKey] = value;
    var root = document.getElementById('rzq-pd-root');
    if (!root) return;
    root.querySelectorAll('.rzq-pd-vopt').forEach(function (btn) {
      if (String(btn.getAttribute('data-vgroup')) !== groupKey) return;
      var on = String(btn.getAttribute('data-vval')) === value;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var lab = document.getElementById('rzq-pd-vsel-' + groupKey);
    if (lab) {
      var g = (_pdState.variantGroups || []).find(function (x) { return x.key === groupKey; });
      var opt = g && (g.options || []).find(function (o) { return String(o.value) === value; });
      lab.textContent = opt ? opt.label : value;
    }
    refreshStockUi();
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
    if (img) {
      img.src = imgs[_pdState.idx];
      img.style.display = '';
    }
    var c = document.getElementById('rzq-pd-counter');
    if (c) c.textContent = (_pdState.idx + 1) + '/' + imgs.length;
    document.querySelectorAll('.rzq-pd-thumb').forEach(function (t, n) {
      t.classList.toggle('active', n === _pdState.idx);
    });
  }

  function navPhoto(dir) { setPhoto((_pdState.idx || 0) + dir); }

  function onMainImgError(imgEl) {
    try {
      if (!imgEl || !_pdState.product) return;
      imgEl.dataset.broken = '1';
      var p = _pdState.product;
      p.imgDataArr = [];
      p.images = [];
      p.imgData = '';
      p.image = '';
      p.thumb = '';
      var box = document.getElementById('rzq-pd-main');
      if (!box) return;
      var fr = !!( _pdState.opts && _pdState.opts.fr );
      var emoji = p.emoji || '📦';
      var zoom = '<button type="button" class="rzq-pd-zoom-hint" onclick="event.stopPropagation();RizqStoreCommerce.openLightbox()">'
        + '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/><path d="M11 8v6M8 11h6"/></svg>'
        + '<span>' + (fr ? 'Agrandir' : 'تكبير') + '</span></button>';
      box.innerHTML = '<div class="rzq-pd-emoji-stage"><span class="rzq-pd-emoji-xl" aria-hidden="true">'
        + esc(emoji) + '</span></div>' + zoom;
      var thumbs = box.parentElement && box.parentElement.parentElement
        ? box.parentElement.parentElement.querySelector('.rzq-pd-thumbs')
        : null;
      if (thumbs) {
        thumbs.innerHTML = '<div class="rzq-pd-thumb active"><span>' + esc(emoji) + '</span></div>';
      }
    } catch (e) { /* ignore */ }
  }

  function renderLightboxContent() {
    var box = ensureLightboxHost();
    var content = document.getElementById('rzq-pd-lightbox-content');
    var meta = document.getElementById('rzq-pd-lightbox-meta');
    if (!content) return box;
    var p = _pdState.product || {};
    var opts = _pdState.opts || {};
    var fr = !!opts.fr;
    var imgs = imagesOf(p);
    var title = fr ? (p.nameF || p.name || '') : (p.name || p.nameF || '');
    var tip = fr ? 'Click outside to close' : 'انقر خارج الصورة للإغلاق';

    if (!imgs.length) {
      var emoji = p.emoji || '📦';
      content.innerHTML =
        '<div class="rzq-pd-lb-emoji" onclick="event.stopPropagation()">'
        + '<span class="rzq-pd-lb-emoji-xl" aria-hidden="true">' + esc(emoji) + '</span>'
        + (title ? '<div class="rzq-pd-lb-emoji-title">' + esc(title) + '</div>' : '')
        + '</div>';
      if (meta) {
        meta.setAttribute('dir', 'rtl');
        meta.innerHTML = '<span>' + (fr ? 'Aperçu agrandi' : 'معاينة مكبّرة') + '</span>'
          + '<span aria-hidden="true">—</span>'
          + '<span>' + tip + '</span>';
      }
      return box;
    }

    var idx = Math.max(0, Math.min(_pdState.idx || 0, imgs.length - 1));
    _pdState.idx = idx;
    content.innerHTML =
      '<img src="' + esc(imgs[idx]) + '" alt="' + esc(title || (fr ? 'Photo' : 'صورة')) + '"'
      + ' onclick="event.stopPropagation()"'
      + ' onerror="RizqStoreCommerce.onLightboxImgError(this)"/>';
    if (meta) {
      meta.setAttribute('dir', 'rtl');
      meta.innerHTML = '<span dir="ltr">' + (idx + 1) + ' / ' + imgs.length + '</span>'
        + '<span aria-hidden="true">—</span>'
        + '<span>' + tip + '</span>';
    }
    return box;
  }

  function onLightboxImgError(imgEl) {
    try {
      if (!imgEl) return;
      imgEl.onerror = null;
      var p = _pdState.product || {};
      var fr = !!( _pdState.opts && _pdState.opts.fr );
      var content = document.getElementById('rzq-pd-lightbox-content');
      if (!content) return;
      content.innerHTML =
        '<div class="rzq-pd-lb-emoji" onclick="event.stopPropagation()">'
        + '<span class="rzq-pd-lb-emoji-xl" aria-hidden="true">' + esc(p.emoji || '📦') + '</span>'
        + '<div class="rzq-pd-lb-emoji-title">' + (fr ? 'Image indisponible' : 'الصورة غير متاحة') + '</div>'
        + '</div>';
    } catch (e) { /* ignore */ }
  }

  function openLightbox() {
    if (!_pdState.product) return;
    var box = renderLightboxContent();
    if (!box) return;
    box.classList.add('open');
    document.body.classList.add('rizq-pd-lightbox-open');
  }

  function closeLightbox() {
    var box = document.getElementById('rzq-pd-lightbox');
    if (box) box.classList.remove('open');
    document.body.classList.remove('rizq-pd-lightbox-open');
  }

  function changeQty(delta) {
    var max = 99;
    var sizeMax = selectedSizeMaxQty(_pdState.product, _pdState.selected);
    if (sizeMax != null) max = Math.max(0, Math.min(99, sizeMax));
    if (max <= 0) {
      _pdState.qty = 1;
    } else {
      _pdState.qty = Math.max(1, Math.min(max, (_pdState.qty || 1) + delta));
    }
    var q = document.getElementById('rzq-pd-qty');
    var t = document.getElementById('rzq-pd-total');
    if (q) q.textContent = _pdState.qty;
    if (t && _pdState.product) {
      var pn = parsePriceNum(_pdState.product.price);
      t.textContent = pn > 0 ? ((pn * _pdState.qty).toLocaleString('en-US') + ' MRU') : '—';
    }
  }

  function addFromDetail() {
    var p = _pdState.product;
    var opts = _pdState.opts || {};
    if (!p) return;
    var groups = _pdState.variantGroups || [];
    var selected = Object.assign({}, _pdState.selected || {});
    for (var i = 0; i < groups.length; i++) {
      if (!selected[groups[i].key]) {
        var msg = opts.fr ? 'Choisissez ' + groups[i].label : 'اختر ' + groups[i].label;
        if (typeof global.showToast === 'function') global.showToast('❌ ' + msg);
        return;
      }
      var meta = optionStockMeta(p, selected[groups[i].key]);
      if (meta.oos) {
        if (typeof global.showToast === 'function') {
          global.showToast(opts.fr ? '❌ Cette option est épuisée' : '❌ هذا الخيار غير متوفر');
        }
        return;
      }
    }
    var sizeMax = selectedSizeMaxQty(p, selected);
    var qty = _pdState.qty || 1;
    if (sizeMax != null && sizeMax <= 0) {
      if (typeof global.showToast === 'function') {
        global.showToast(opts.fr ? '❌ Rupture de stock' : '❌ نفذ من المخزون');
      }
      return;
    }
    if (sizeMax != null && qty > sizeMax) {
      qty = sizeMax;
      _pdState.qty = qty;
    }
    var selection = {
      selected: selected,
      key: variantSelectionKey(selected),
      label: variantSelectionLabel(groups, selected, !!opts.fr),
      groups: groups
    };
    if (typeof opts.onAdd === 'function') {
      opts.onAdd(p, qty, selection);
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

  function wishFromDetail() {
    var p = _pdState.product;
    var opts = _pdState.opts || {};
    if (!p || typeof opts.onWish !== 'function') return;
    opts.onWish(p);
    // _renderWishUI في صفحة المحل يحدّث الزر بعد نجاح الإضافة (أو بعد استئناف المصادقة)
    setTimeout(function () {
      try {
        if (typeof global._renderWishUI === 'function') global._renderWishUI();
      } catch (eWish) { /* ignore */ }
    }, 0);
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
    safeMediaUrl: safeMediaUrl,
    imagesOf: imagesOf,
    productMediaHtml: productMediaHtml,
    bindMedia: bindMedia,
    cleanDesc: cleanDesc,
    isPlaceholderDesc: isPlaceholderDesc,
    parsePriceNum: parsePriceNum,
    normalizeCatalogItem: normalizeCatalogItem,
    mapRawProduct: mapRawProduct,
    pageSlice: pageSlice,
    storeIdFromUrl: storeIdFromUrl,
    cartLineSellerId: cartLineSellerId,
    cartLinesForSeller: cartLinesForSeller,
    cartQtyForSeller: cartQtyForSeller,
    withStoreId: withStoreId,
    wireStoreLinks: wireStoreLinks,
    setLogo: setLogo,
    wireStorefrontLogo: wireStorefrontLogo,
    setHeroPhoto: setHeroPhoto,
    introVideoSlots: introVideoSlots,
    promoVideosOf: promoVideosOf,
    openProductDetail: openProductDetail,
    closeProductDetail: closeProductDetail,
    setPhoto: setPhoto,
    navPhoto: navPhoto,
    openLightbox: openLightbox,
    closeLightbox: closeLightbox,
    onMainImgError: onMainImgError,
    onLightboxImgError: onLightboxImgError,
    changeQty: changeQty,
    selectVariant: selectVariant,
    resolveVariantGroups: resolveVariantGroups,
    variantSelectionKey: variantSelectionKey,
    variantSelectionLabel: variantSelectionLabel,
    cartLineIdForProduct: cartLineIdForProduct,
    addFromDetail: addFromDetail,
    askFromDetail: askFromDetail,
    wishFromDetail: wishFromDetail,
    shareFromDetail: shareFromDetail
  };
})(window);
