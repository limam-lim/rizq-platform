/**
 * rizq_ad_cards.js — بطاقة إعلان عمودية فاخرة (نموذج رزق)
 * كاروسيل + سعر ذهبي + مفضلة على الصورة + اتصال/واتساب أسفل البطاقة
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function imagesOf(ad) {
    if (!ad) return [];
    var list = [];
    if (Array.isArray(ad.images)) {
      ad.images.forEach(function (u) {
        if (u && typeof u === 'string') list.push(u);
      });
    }
    if (!list.length && ad.image && typeof ad.image === 'string') list.push(ad.image);
    if (!list.length && ad.img && typeof ad.img === 'string') list.push(ad.img);
    var seen = {};
    return list.filter(function (u) {
      if (seen[u]) return false;
      seen[u] = 1;
      return true;
    }).slice(0, 8);
  }

  function contactPhone(ad) {
    if (!ad) return '';
    return (ad.phone || (ad.sellerContact && (ad.sellerContact.phone || ad.sellerContact.tel)) || '') + '';
  }

  function contactWa(ad) {
    if (!ad) return '';
    return (ad.whatsapp || (ad.sellerContact && (ad.sellerContact.whatsapp || ad.sellerContact.phone)) || ad.phone || '') + '';
  }

  function isFav(id) {
    if (typeof global.isFavorited === 'function') return !!global.isFavorited(id);
    try {
      var v = JSON.parse(localStorage.getItem('rizq_wishlist') || '[]');
      return Array.isArray(v) && v.indexOf(String(id)) !== -1;
    } catch (e) {
      return false;
    }
  }

  function toggleFav(id, btn) {
    if (typeof global.quickToggleFavorite === 'function') {
      global.quickToggleFavorite(id, btn);
      if (btn) {
        var on = isFav(id);
        btn.classList.toggle('is-on', on);
        btn.textContent = on ? '♥' : '♡';
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
      return;
    }
    try {
      var ids = JSON.parse(localStorage.getItem('rizq_wishlist') || '[]');
      if (!Array.isArray(ids)) ids = [];
      var sid = String(id);
      var i = ids.indexOf(sid);
      if (i === -1) ids.push(sid); else ids.splice(i, 1);
      localStorage.setItem('rizq_wishlist', JSON.stringify(ids));
      var on2 = i === -1;
      if (btn) {
        btn.classList.toggle('is-on', on2);
        btn.textContent = on2 ? '♥' : '♡';
        btn.setAttribute('aria-pressed', on2 ? 'true' : 'false');
      }
      try {
        global.dispatchEvent(new CustomEvent('rizq_wishlist', { detail: { ids: ids } }));
      } catch (e2) {}
    } catch (e3) {}
  }

  function openWhatsApp(btn) {
    var phone = (btn.getAttribute('data-phone') || '').replace(/[^\d+]/g, '');
    var accountId = btn.getAttribute('data-account') || '';
    var locked = btn.getAttribute('data-locked') === '1';
    var lang = (document.documentElement.lang === 'fr' || document.body.classList.contains('rizq-lang-fr')) ? 'fr' : 'ar';
    if (locked || !phone) {
      if (global.RizqContactGate && accountId) {
        global.RizqContactGate.onMaskedContactClick(accountId, 'individual', { lang: lang });
      } else if (typeof global.alert === 'function') {
        global.alert(lang === 'fr' ? 'Coordonnées masquées — abonnement requis' : 'بيانات التواصل مخفية — يلزم اشتراك');
      }
      return;
    }
    var msg = lang === 'fr' ? 'Bonjour, j\'ai vu votre annonce sur Rizq' : 'مرحباً، رأيت إعلانك على رزق';
    global.open('https://wa.me/' + phone.replace(/[^\d]/g, '') + '?text=' + encodeURIComponent(msg), '_blank');
  }

  function openTel(btn) {
    var phone = (btn.getAttribute('data-phone') || '').replace(/[^\d+]/g, '');
    var accountId = btn.getAttribute('data-account') || '';
    var locked = btn.getAttribute('data-locked') === '1';
    var lang = (document.documentElement.lang === 'fr' || document.body.classList.contains('rizq-lang-fr')) ? 'fr' : 'ar';
    if (locked || !phone) {
      if (global.RizqContactGate && accountId) {
        global.RizqContactGate.onMaskedContactClick(accountId, 'individual', { lang: lang });
      } else if (typeof global.alert === 'function') {
        global.alert(lang === 'fr' ? 'Coordonnées masquées — abonnement requis' : 'بيانات التواصل مخفية — يلزم اشتراك');
      }
      return;
    }
    global.location.href = 'tel:' + phone;
  }

  var VIEWED_KEY = 'rizq_recently_viewed';
  var VIEWED_MAX = 80;

  function viewedIds() {
    try {
      var v = JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]');
      return Array.isArray(v) ? v.map(String) : [];
    } catch (e) {
      return [];
    }
  }

  function isViewed(id) {
    if (id == null || id === '') return false;
    return viewedIds().indexOf(String(id)) !== -1;
  }

  function seenLabel(fr) {
    return fr ? 'Déjà vu' : 'شاهدته من قبل';
  }

  function seenHtml(fr) {
    return '<div class="rzq-adx-seen" aria-label="' + esc(seenLabel(fr)) + '">' +
      '<span class="rzq-adx-seen-ico" aria-hidden="true">👁</span>' +
      '<span class="rzq-adx-seen-txt">' + esc(seenLabel(fr)) + '</span>' +
      '</div>';
  }

  function syncSeenOnMedia(media, fr) {
    if (!media) return;
    var id = media.getAttribute('data-ad-id');
    if (!id) return;
    var on = isViewed(id);
    media.classList.toggle('has-seen', on);
    var existing = media.querySelector('.rzq-adx-seen');
    if (on && !existing) {
      media.insertAdjacentHTML('beforeend', seenHtml(!!fr));
    } else if (!on && existing) {
      existing.parentNode.removeChild(existing);
    } else if (on && existing) {
      var t = existing.querySelector('.rzq-adx-seen-txt');
      if (t) t.textContent = seenLabel(!!fr);
    }
  }

  function refreshSeenBadges(root) {
    root = root || document;
    var fr = document.documentElement.lang === 'fr' ||
      (document.body && document.body.classList.contains('rizq-lang-fr'));
    var nodes = root.querySelectorAll('.rzq-adx-media[data-ad-id]');
    for (var i = 0; i < nodes.length; i++) syncSeenOnMedia(nodes[i], fr);
  }

  function markViewed(id) {
    if (id == null || id === '') return;
    var sid = String(id);
    var ids = viewedIds().filter(function (x) { return x !== sid; });
    ids.unshift(sid);
    if (ids.length > VIEWED_MAX) ids = ids.slice(0, VIEWED_MAX);
    try { localStorage.setItem(VIEWED_KEY, JSON.stringify(ids)); } catch (e) {}
    refreshSeenBadges(document);
    try {
      global.dispatchEvent(new CustomEvent('rizq_recently_viewed', { detail: { ids: ids, id: sid } }));
    } catch (e2) {}
  }

  var PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.8 21 3 13.2 3 3.7c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" fill="currentColor"/></svg>';
  var WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.3 2 11.6c0 2 .6 3.9 1.7 5.5L2 22l5.1-1.6c1.5.8 3.2 1.2 4.9 1.2 5.5 0 10-4.3 10-9.6S17.5 2 12 2zm0 17.5c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.2 1 1-3.1-.2-.3c-.9-1.4-1.4-3-1.4-4.6 0-4.3 3.7-7.8 8.4-7.8s8.4 3.5 8.4 7.8-3.7 7.8-8.4 7.8zm4.6-5.8c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.2-.3-.2-.6-.3z"/></svg>';

  /**
   * أزرار اتصال + واتساب أسفل البطاقة (نموذج فاخر)
   */
  function actionsHtml(ad, opts) {
    opts = opts || {};
    var fr = !!opts.fr;
    var id = ad && ad.id != null ? String(ad.id) : '';
    var phone = contactPhone(ad);
    var wa = contactWa(ad) || phone;
    var accountId = (ad && ad.accountId) || '';
    var locked = !!(ad && ad.contactsLocked);
    return ''
      + '<div class="rzq-adx-actions" data-ad-id="' + esc(id) + '">'
      +   '<button type="button" class="rzq-adx-tel" data-ad-id="' + esc(id) + '" data-phone="' + esc(phone) + '" data-account="' + esc(accountId) + '" data-locked="' + (locked ? '1' : '0') + '" aria-label="' + (fr ? 'Appeler' : 'اتصال') + '">' + PHONE_SVG + '</button>'
      +   '<button type="button" class="rzq-adx-wa" data-ad-id="' + esc(id) + '" data-phone="' + esc(wa) + '" data-account="' + esc(accountId) + '" data-locked="' + (locked ? '1' : '0') + '" aria-label="WhatsApp">' + WA_SVG + '</button>'
      + '</div>';
  }

  /**
   * @param {object} ad
   * @param {object} opts price, pin, fr, emoji, bg, title
   */
  function mediaHtml(ad, opts) {
    opts = opts || {};
    var fr = !!opts.fr;
    var imgs = imagesOf(ad);
    var multi = imgs.length > 1;
    var price = opts.price != null ? opts.price : (ad && (ad.priceFR && fr ? ad.priceFR : ad.price)) || '';
    var pin = !!(opts.pin || (ad && (ad.pin || ad.boosted || ad.featured)));
    var emoji = opts.emoji || (ad && ad.emoji) || '📦';
    var bg = opts.bg || (ad && ad.bg) || 'linear-gradient(145deg,#111d2e,#1B3A6B)';
    var title = opts.title || (ad && ad.title) || '';
    var id = ad && ad.id != null ? String(ad.id) : '';
    var favOn = id ? isFav(id) : false;
    var viewed = id ? isViewed(id) : false;

    var slides = '';
    if (imgs.length) {
      slides = imgs.map(function (src) {
        return '<div class="rzq-adx-slide"><img src="' + esc(src) + '" alt="' + esc(title) + '" loading="lazy" decoding="async"/></div>';
      }).join('');
    } else {
      slides = '<div class="rzq-adx-slide" style="background:' + esc(bg) + '"><span class="rzq-adx-emoji" aria-hidden="true">' + esc(emoji) + '</span></div>';
    }

    var dots = '';
    if (multi) {
      dots = '<div class="rzq-adx-dots" aria-hidden="true">' +
        imgs.map(function (_, i) {
          return '<span class="rzq-adx-dot' + (i === 0 ? ' is-on' : '') + '"></span>';
        }).join('') + '</div>';
    }

    var nav = multi
      ? '<button type="button" class="rzq-adx-nav rzq-adx-prev" aria-label="' + (fr ? 'Précédente' : 'السابق') + '">‹</button>' +
        '<button type="button" class="rzq-adx-nav rzq-adx-next" aria-label="' + (fr ? 'Suivante' : 'التالي') + '">›</button>'
      : '';

    var cls = 'rzq-adx-media' + (multi ? ' has-multi' : '') + (viewed ? ' has-seen' : '') + (pin ? ' has-pin' : '');

    return ''
      + '<div class="' + cls + '" data-ad-id="' + esc(id) + '" data-idx="0" data-count="' + (imgs.length || 1) + '">'
      +   '<div class="rzq-adx-slides">' + slides + '</div>'
      +   '<div class="rzq-adx-grad"></div>'
      +   '<span class="rzq-adx-wm" aria-hidden="true">' + (fr ? 'Rizq' : 'رزق') + '</span>'
      +   '<button type="button" class="rzq-adx-fav' + (favOn ? ' is-on' : '') + '" data-ad-id="' + esc(id) + '" aria-label="' + (fr ? 'Favoris' : 'المفضلة') + '" aria-pressed="' + (favOn ? 'true' : 'false') + '">' + (favOn ? '♥' : '♡') + '</button>'
      +   nav
      +   dots
      +   (price ? '<div class="rzq-adx-price"><span class="rzq-adx-price-pill">' + esc(price) + '</span></div>' : '')
      +   (pin ? '<div class="rzq-adx-badge">' + (fr ? 'Vedette' : 'مميّز') + '</div>' : '')
      +   (viewed ? seenHtml(fr) : '')
      + '</div>';
  }

  function go(media, dir) {
    if (!media || !media.classList.contains('has-multi')) return;
    var count = parseInt(media.getAttribute('data-count') || '1', 10) || 1;
    var idx = parseInt(media.getAttribute('data-idx') || '0', 10) || 0;
    idx = (idx + dir + count) % count;
    media.setAttribute('data-idx', String(idx));
    var slides = media.querySelector('.rzq-adx-slides');
    if (slides) slides.style.transform = 'translateX(' + (-idx * 100) + '%)';
    var dots = media.querySelectorAll('.rzq-adx-dot');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('is-on', i === idx);
    }
  }

  function bindOne(media) {
    if (!media || media.getAttribute('data-rzq-adx-bound') === '1') return;
    media.setAttribute('data-rzq-adx-bound', '1');

    var prev = media.querySelector('.rzq-adx-prev');
    var next = media.querySelector('.rzq-adx-next');
    var fav = media.querySelector('.rzq-adx-fav');

    function hold(on) {
      media.classList.toggle('is-holding', !!on);
      var track = media.closest('.cards-track');
      if (track && track._rzqMarquee && typeof track._rzqMarquee.setPaused === 'function') {
        track._rzqMarquee.setPaused(!!on || !!(track.querySelector && track.querySelector('.rzq-adx-media.is-holding')));
      }
    }

    if (prev) {
      prev.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        hold(true); go(media, -1);
        setTimeout(function () { hold(false); }, 450);
      });
    }
    if (next) {
      next.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        hold(true); go(media, 1);
        setTimeout(function () { hold(false); }, 450);
      });
    }
    if (fav) {
      fav.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        toggleFav(fav.getAttribute('data-ad-id'), fav);
      });
    }

    var x0 = null;
    media.addEventListener('touchstart', function (e) {
      if (!media.classList.contains('has-multi')) return;
      media.classList.add('is-touch');
      hold(true);
      x0 = e.changedTouches[0].clientX;
    }, { passive: true });
    media.addEventListener('touchend', function (e) {
      var startX = x0;
      x0 = null;
      hold(false);
      media.classList.remove('is-touch');
      if (startX == null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 34) return;
      go(media, dx < 0 ? 1 : -1);
    }, { passive: true });
    media.addEventListener('touchcancel', function () {
      x0 = null;
      hold(false);
      media.classList.remove('is-touch');
    }, { passive: true });

    media.addEventListener('mouseleave', function () { hold(false); });
  }

  function bindActions(root) {
    root = root || document;
    var nodes = root.querySelectorAll('.rzq-adx-actions:not([data-rzq-adx-act="1"])');
    for (var i = 0; i < nodes.length; i++) {
      var box = nodes[i];
      box.setAttribute('data-rzq-adx-act', '1');
      var tel = box.querySelector('.rzq-adx-tel');
      var wa = box.querySelector('.rzq-adx-wa');
      if (tel) {
        tel.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          openTel(e.currentTarget);
        });
      }
      if (wa) {
        wa.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          openWhatsApp(e.currentTarget);
        });
      }
    }
  }

  function bindAll(root) {
    root = root || document;
    var nodes = root.querySelectorAll('.rzq-adx-media:not([data-rzq-adx-bound="1"])');
    for (var i = 0; i < nodes.length; i++) bindOne(nodes[i]);
    bindActions(root);
  }

  function observe() {
    if (global._rzqAdxObs) return;
    try {
      global._rzqAdxObs = new MutationObserver(function () {
        bindAll(document);
      });
      global._rzqAdxObs.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { bindAll(document); });
    } else {
      bindAll(document);
    }
  }

  /** ألبومات تجريبية — صور عمودية فاخرة مطابقة للنموذج */
  function seedDemoGalleries(list) {
    if (!list || !list.length) return;
    var fashionV = 'v8'; /* صور المستخدم الأصلية (دراعة/ملحفة) بوجوه مختلفة فقط */
    var fashion = {
      melhafaStreet: 'rizq-assets/demo-fashion/demo-melhafa-street-dark.jpg?' + fashionV,
      melhafaShop: 'rizq-assets/demo-fashion/demo-melhafa-shop-warm.jpg?' + fashionV,
      melhafaLilac: 'rizq-assets/demo-fashion/demo-melhafa-street-lilac.jpg?' + fashionV,
      daraaStreet: 'rizq-assets/demo-fashion/demo-daraa-street-dark.jpg?' + fashionV,
      daraaShop: 'rizq-assets/demo-fashion/demo-daraa-shop-olive.jpg?' + fashionV,
      daraaBoutique: 'rizq-assets/demo-fashion/demo-daraa-boutique-navy.jpg?' + fashionV
    };
    var map = {
      '101': ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=70'],
      '102': ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70'],
      '103': ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=70'],
      '201': ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=70'],
      '204': ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=70'],
      '205': ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=70'],
      '207': ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70'],
      '1': ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=70'],
      '10': ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70'],
      '14': ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=70'],
      '18': ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=800&q=70'],
      /* أزياء تجريبية — ملحفة ودراعة بوجوه وأماكن متنوعة */
      '211': [fashion.daraaStreet, fashion.daraaBoutique, fashion.daraaShop],
      '216': [fashion.melhafaStreet, fashion.melhafaShop, fashion.melhafaLilac],
      '231': [fashion.melhafaShop, fashion.melhafaStreet],
      '232': [fashion.daraaBoutique, fashion.daraaStreet],
      '233': [fashion.melhafaLilac, fashion.melhafaShop],
      '234': [fashion.daraaShop, fashion.daraaBoutique]
    };
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!a || a.id == null) continue;
      if (Array.isArray(a.images) && a.images.length) continue;
      var g = map[String(a.id)];
      if (g) a.images = g.slice();
      if (!a.phone && !a.whatsapp) {
        a.phone = a.phone || '+22245000000';
        a.whatsapp = a.whatsapp || '+22245000000';
      }
    }
  }

  var api = {
    esc: esc,
    imagesOf: imagesOf,
    mediaHtml: mediaHtml,
    actionsHtml: actionsHtml,
    bindOne: bindOne,
    bindAll: bindAll,
    bindActions: bindActions,
    go: go,
    toggleFav: toggleFav,
    openWhatsApp: openWhatsApp,
    openTel: openTel,
    seedDemoGalleries: seedDemoGalleries,
    isViewed: isViewed,
    markViewed: markViewed,
    viewedIds: viewedIds,
    refreshSeenBadges: refreshSeenBadges
  };

  global.RizqAdCards = api;
  global.rizqMarkAdViewed = markViewed;
  observe();
})(typeof window !== 'undefined' ? window : this);
