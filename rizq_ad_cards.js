/**
 * rizq_ad_cards.js — بطاقة إعلان ملكية موحّدة
 * كاروسيل صور + سعر ذهبي + مفضلة/واتساب مصغّران
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
    // unique, max 8
    var seen = {};
    return list.filter(function (u) {
      if (seen[u]) return false;
      seen[u] = 1;
      return true;
    }).slice(0, 8);
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

  /**
   * @param {object} ad
   * @param {object} opts
   *   price, pin, fr, emoji, bg, title
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
    var phone = (ad && (ad.phone || (ad.sellerContact && (ad.sellerContact.whatsapp || ad.sellerContact.phone)))) || '';
    var accountId = (ad && ad.accountId) || '';
    var locked = !!(ad && ad.contactsLocked);
    var favOn = id ? isFav(id) : false;

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
      ? '<button type="button" class="rzq-adx-nav rzq-adx-prev" aria-label="' + (fr ? 'Précédente' : 'السابق') + '">›</button>' +
        '<button type="button" class="rzq-adx-nav rzq-adx-next" aria-label="' + (fr ? 'Suivante' : 'التالي') + '">‹</button>'
      : '';

    return ''
      + '<div class="rzq-adx-media' + (multi ? ' has-multi' : '') + '" data-ad-id="' + esc(id) + '" data-idx="0" data-count="' + (imgs.length || 1) + '">'
      +   '<div class="rzq-adx-slides">' + slides + '</div>'
      +   '<div class="rzq-adx-grad"></div>'
      +   '<button type="button" class="rzq-adx-fav' + (favOn ? ' is-on' : '') + '" data-ad-id="' + esc(id) + '" aria-label="' + (fr ? 'Favoris' : 'المفضلة') + '" aria-pressed="' + (favOn ? 'true' : 'false') + '">' + (favOn ? '♥' : '♡') + '</button>'
      +   '<button type="button" class="rzq-adx-wa" data-ad-id="' + esc(id) + '" data-phone="' + esc(phone) + '" data-account="' + esc(accountId) + '" data-locked="' + (locked ? '1' : '0') + '" aria-label="WhatsApp">✆</button>'
      +   nav
      +   dots
      +   (price ? '<div class="rzq-adx-price">' + esc(price) + '</div>' : '')
      +   (pin ? '<div class="rzq-adx-badge">' + (fr ? 'Vedette' : 'مميّز') + '</div>' : '')
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
    var wa = media.querySelector('.rzq-adx-wa');

    function hold(on) {
      media.classList.toggle('is-holding', !!on);
    }

    if (prev) {
      prev.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        hold(true); go(media, -1);
      });
    }
    if (next) {
      next.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        hold(true); go(media, 1);
      });
    }
    if (fav) {
      fav.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        toggleFav(fav.getAttribute('data-ad-id'), fav);
      });
    }
    if (wa) {
      wa.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        openWhatsApp(wa);
      });
    }

    // Touch swipe
    var x0 = null;
    media.addEventListener('touchstart', function (e) {
      if (!media.classList.contains('has-multi')) return;
      media.classList.add('is-touch');
      hold(true);
      x0 = e.changedTouches[0].clientX;
    }, { passive: true });
    media.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) < 34) return;
      // slides are LTR: swipe left → next
      go(media, dx < 0 ? 1 : -1);
    }, { passive: true });

    media.addEventListener('mouseleave', function () { hold(false); });
  }

  function bindAll(root) {
    root = root || document;
    var nodes = root.querySelectorAll('.rzq-adx-media:not([data-rzq-adx-bound="1"])');
    for (var i = 0; i < nodes.length; i++) bindOne(nodes[i]);
  }

  // Auto-bind on DOM mutations for dynamic grids
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

  /** ألبومات تجريبية لبيانات العرض — تُملأ فقط إن لم تكن للإعلان صور */
  function seedDemoGalleries(list) {
    if (!list || !list.length) return;
    var map = {
      '101': ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=70'],
      '102': ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70'],
      '103': ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=70'],
      '201': ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=70'],
      '204': ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=70'],
      '205': ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=70'],
      '207': ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70'],
      '1': ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=70'],
      '10': ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=70'],
      '14': ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=70'],
      '18': ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=70','https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=800&q=70']
    };
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!a || a.id == null) continue;
      if (Array.isArray(a.images) && a.images.length) continue;
      var g = map[String(a.id)];
      if (g) a.images = g.slice();
    }
  }

  var api = {
    esc: esc,
    imagesOf: imagesOf,
    mediaHtml: mediaHtml,
    bindOne: bindOne,
    bindAll: bindAll,
    go: go,
    toggleFav: toggleFav,
    openWhatsApp: openWhatsApp,
    seedDemoGalleries: seedDemoGalleries
  };

  global.RizqAdCards = api;
  observe();
})(typeof window !== 'undefined' ? window : this);
