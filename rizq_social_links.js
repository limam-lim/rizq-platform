/**
 * rizq_social_links.js — أزرار «تابعنا» من site.social عبر /api/site-config
 * تظهر فقط المنصات المفعّلة ولها رابط آمن. تُدار من سوبر أدمن خطوة بخطوة.
 */
(function (global) {
  'use strict';

  var ROOT_ID = 'rizq-social-follow';
  var STYLE_ID = 'rizq-social-follow-css';
  var ORDER = ['facebook', 'x', 'instagram', 'youtube', 'tiktok', 'linkedin', 'snapchat', 'telegram', 'whatsapp'];
  var LABELS = {
    facebook: { ar: 'فيسبوك', fr: 'Facebook' },
    x: { ar: 'إكس', fr: 'X' },
    instagram: { ar: 'إنستغرام', fr: 'Instagram' },
    youtube: { ar: 'يوتيوب', fr: 'YouTube' },
    tiktok: { ar: 'تيك توك', fr: 'TikTok' },
    linkedin: { ar: 'لينكدإن', fr: 'LinkedIn' },
    snapchat: { ar: 'سناب شات', fr: 'Snapchat' },
    telegram: { ar: 'تيليغرام', fr: 'Telegram' },
    whatsapp: { ar: 'واتساب', fr: 'WhatsApp' }
  };

  var ICONS = {
    facebook:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.5 8.5V6.8c0-.7.5-1.3 1.2-1.3H17V3h-2.1C12.7 3 11 4.7 11 6.9v1.6H9v2.7h2V21h3.5v-9.8h2.4l.6-2.7h-3z"/></svg>',
    x:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.7 3H20l-6.2 7.1L21 21h-5.4l-4.2-5.5L6.4 21H4l6.7-7.7L3.2 3h5.5l3.8 5.1L17.7 3zm-1 16.2h1.5L7.4 4.7H5.8l10.9 14.5z"/></svg>',
    instagram:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2zm5.1-8.2a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM12 4.4c1.7 0 1.9.01 2.6.04.9.04 1.5.2 2 .39.55.21 1 .52 1.46.98.46.46.77.91.98 1.46.19.5.35 1.1.39 2 .03.7.04.9.04 2.6s-.01 1.9-.04 2.6c-.04.9-.2 1.5-.39 2a3.7 3.7 0 0 1-.98 1.46 3.7 3.7 0 0 1-1.46.98c-.5.19-1.1.35-2 .39-.7.03-.9.04-2.6.04s-1.9-.01-2.6-.04c-.9-.04-1.5-.2-2-.39a3.7 3.7 0 0 1-1.46-.98 3.7 3.7 0 0 1-.98-1.46c-.19-.5-.35-1.1-.39-2C4.41 13.9 4.4 13.7 4.4 12s.01-1.9.04-2.6c.04-.9.2-1.5.39-2 .21-.55.52-1 .98-1.46.46-.46.91-.77 1.46-.98.5-.19 1.1-.35 2-.39.7-.03.9-.04 2.6-.04zm0-1.8c-1.73 0-1.95.01-2.63.04-1.05.05-1.88.24-2.55.51a5.5 5.5 0 0 0-2 1.31 5.5 5.5 0 0 0-1.31 2c-.27.67-.46 1.5-.51 2.55-.03.68-.04.9-.04 2.63s.01 1.95.04 2.63c.05 1.05.24 1.88.51 2.55a5.5 5.5 0 0 0 1.31 2 5.5 5.5 0 0 0 2 1.31c.67.27 1.5.46 2.55.51.68.03.9.04 2.63.04s1.95-.01 2.63-.04c1.05-.05 1.88-.24 2.55-.51a5.5 5.5 0 0 0 2-1.31 5.5 5.5 0 0 0 1.31-2c.27-.67.46-1.5.51-2.55.03-.68.04-.9.04-2.63s-.01-1.95-.04-2.63c-.05-1.05-.24-1.88-.51-2.55a5.5 5.5 0 0 0-1.31-2 5.5 5.5 0 0 0-2-1.31c-.67-.27-1.5-.46-2.55-.51C13.95 2.61 13.73 2.6 12 2.6z"/></svg>',
    youtube:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.9 12 4.9 12 4.9s-6 0-7.7.4A2.7 2.7 0 0 0 2.4 7.2 28 28 0 0 0 2 12a28 28 0 0 0 .4 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.4 7.7.4 7.7.4s6 0 7.7-.4a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-4.8zM10.2 15.1V8.9L15.5 12l-5.3 3.1z"/></svg>',
    tiktok:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 4.1c-.7.7-1.5 1.2-2.4 1.5V15a4.6 4.6 0 1 1-4.6-4.6c.2 0 .4 0 .6.05v2.3a2.3 2.3 0 1 0 1.6 2.2V3h2.3c.1 1.4.7 2.7 1.8 3.7.5.5 1.1.8 1.8 1.1V9a6.7 6.7 0 0 1-1.1-.9z"/></svg>',
    linkedin:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.3 9.3H3.9V20h2.4V9.3zM5.1 4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM20.1 13.2c0-2.5-1.3-4-3.3-4-1.1 0-1.9.5-2.3 1.2h-.05V9.3h-2.3c0 .6 0 10.7 0 10.7h2.4v-6c0-.3 0-.6.1-.8.2-.6.7-1.2 1.6-1.2 1.1 0 1.6.9 1.6 2.1V20h2.4v-6.8z"/></svg>',
    snapchat:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.2c2.9 0 4.7 2 4.7 5.1 0 1.2-.2 2.2-.2 3.3 0 .5.3.8.9 1.1.7.4 1.5.9 1.7 1.7.1.5 0 1-.4 1.3-.5.4-1.1.3-1.7.2-.3 0-.5 0-.6.2-.2.4.1 1.1.4 1.6.3.6.3 1.1-.1 1.5-.5.5-1.3.5-2 .5-.5 0-.9.1-1.1.4-.4.5-.5 1.3-1.6 1.3s-1.2-.8-1.6-1.3c-.2-.3-.6-.4-1.1-.4-.7 0-1.5 0-2-.5-.4-.4-.4-.9-.1-1.5.3-.5.6-1.2.4-1.6-.1-.2-.3-.2-.6-.2-.6.1-1.2.2-1.7-.2-.4-.3-.5-.8-.4-1.3.2-.8 1-1.3 1.7-1.7.6-.3.9-.6.9-1.1 0-1.1-.2-2.1-.2-3.3 0-3.1 1.8-5.1 4.7-5.1z"/></svg>',
    telegram:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.7 4.3 3.9 10.7c-1.1.4-1.1 1.1-.2 1.4l4.3 1.3 1.7 5.1c.2.6.1.9.7.9.4 0 .6-.2.9-.4l2.5-2.4 4.9 3.6c.9.5 1.5.2 1.7-.8L22 5.5c.3-1.1-.4-1.6-1.3-1.2zm-2.8 3.2-8.8 7.9-.3 3.3-1.5-4.6 10.6-6.6z"/></svg>',
    whatsapp:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3.1A8.9 8.9 0 0 0 5.1 16.7L3.9 20.8l4.2-1.1A8.9 8.9 0 1 0 12 3.1zm5.1 12.7c-.2.6-1.2 1.1-1.9 1.2-.5.1-1.1.1-1.8-.1-1.1-.3-2.5-.9-4.1-2.3-2-1.7-3.4-3.9-3.6-4.2-.3-.4-1.1-1.6-1.1-3s.7-2.1 1-2.3c.2-.2.5-.3.8-.3h.6c.2 0 .4 0 .6.5.2.6.7 2 .8 2.2.1.2.1.4 0 .6-.1.2-.2.4-.3.5-.2.2-.3.3-.5.5-.2.2-.3.3-.1.6.2.3.8 1.4 1.8 2.2 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.7-.1.3.1 1.9.9 2.2 1.1.3.2.5.2.6.4.1.2.1.9-.1 1.5z"/></svg>'
  };

  function lang() {
    try {
      if (typeof global._rizqLang === 'function') return global._rizqLang();
      if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') return global.RizqI18n.getLang();
    } catch (e) {}
    try {
      var saved = localStorage.getItem('rizq_lang');
      if (saved === 'fr' || saved === 'ar') return saved;
    } catch (e2) {}
    return document.documentElement.getAttribute('lang') === 'fr' ? 'fr' : 'ar';
  }

  function isSafeUrl(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    if (s.charAt(0) === '/' || s.charAt(0) === '#') return s;
    try {
      var u = new URL(s);
      var p = String(u.protocol || '').toLowerCase();
      if (p !== 'http:' && p !== 'https:') return '';
      // ارفض جذر النطاق فقط (instagram.com/) — يلزم مسار حساب حقيقي
      var path = String(u.pathname || '').replace(/\/+$/, '');
      if (!path) return '';
      return s;
    } catch (e) {
      return '';
    }
  }

  function waMeFromPhone(phone) {
    var d = String(phone == null ? '' : phone).replace(/\D/g, '');
    if (!d) return '';
    if (d.length === 8) d = '222' + d;
    if (d.length < 10) return '';
    return 'https://wa.me/' + d;
  }

  /** يدمج site.social مع واتساب الدعم إن لم يُضبط/يُعطَّل صراحةً في سوبر أدمن */
  function enrichSocial(site) {
    var raw = site && typeof site.social === 'object' ? site.social : {};
    var social = {};
    for (var i = 0; i < ORDER.length; i++) {
      var key = ORDER[i];
      var item = raw[key];
      social[key] =
        item && typeof item === 'object'
          ? { enabled: !!item.enabled, url: String(item.url || '') }
          : { enabled: false, url: '' };
    }
    var cur = social.whatsapp || { enabled: false, url: '' };
    var explicitOff = cur.enabled === false && String(cur.url || '').trim() !== '';
    if (!explicitOff) {
      var fromUrl = isSafeUrl(cur.url);
      var fromPhone = waMeFromPhone(site && site.whatsapp);
      if (fromUrl || fromPhone) {
        social.whatsapp = { enabled: true, url: fromUrl || fromPhone };
      }
    }
    return social;
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = ''
      + '#' + ROOT_ID + '{margin-top:14px;display:none}'
      + '#' + ROOT_ID + '.is-visible{display:block}'
      + '#' + ROOT_ID + ' .rzq-soc-title{font-size:11px;font-weight:800;color:#C9A84C;'
      + 'letter-spacing:1.2px;text-transform:uppercase;margin:0 0 10px;font-family:Georgia,serif}'
      + '#' + ROOT_ID + ' .rzq-soc-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px}'
      + '#' + ROOT_ID + ' .rzq-soc-btn{width:34px;height:34px;display:inline-flex;align-items:center;'
      + 'justify-content:center;color:rgba(255,255,255,.88);background:transparent;border:none;'
      + 'padding:0;border-radius:8px;transition:color .2s ease,transform .2s ease,background .2s ease}'
      + '#' + ROOT_ID + ' .rzq-soc-btn:hover{color:#C9A84C;background:rgba(201,168,76,.1);transform:translateY(-1px)}'
      + '#' + ROOT_ID + ' .rzq-soc-btn:focus-visible{outline:2px solid #C9A84C;outline-offset:2px}'
      + '#' + ROOT_ID + ' .rzq-soc-btn svg{width:22px;height:22px;display:block}'
      + '@media (prefers-reduced-motion:reduce){#' + ROOT_ID + ' .rzq-soc-btn{transition:none}}';
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function findMountParent() {
    var existing = document.getElementById(ROOT_ID);
    if (existing && existing.parentNode) return existing.parentNode;
    var contactList = document.querySelector('footer .footer-contact-list, footer.rizq-footer .footer-contact-list');
    if (contactList && contactList.parentNode) return contactList.parentNode;
    var contactTitle = null;
    var titles = document.querySelectorAll('footer .footer-col-title, footer.rizq-footer .footer-col-title');
    for (var i = 0; i < titles.length; i++) {
      var t = titles[i];
      if (t.getAttribute('data-t') === 'ft-contact') {
        contactTitle = t;
        break;
      }
    }
    if (contactTitle && contactTitle.parentNode) return contactTitle.parentNode;
    return null;
  }

  function ensureRoot() {
    var root = document.getElementById(ROOT_ID);
    if (root) return root;
    var parent = findMountParent();
    if (!parent) return null;
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('data-rizq-social', '1');
    parent.appendChild(root);
    return root;
  }

  function activeItems(social) {
    var out = [];
    if (!social || typeof social !== 'object') return out;
    for (var i = 0; i < ORDER.length; i++) {
      var key = ORDER[i];
      var item = social[key];
      if (!item || typeof item !== 'object') continue;
      if (!item.enabled) continue;
      var url = isSafeUrl(item.url);
      if (!url) continue;
      out.push({ key: key, url: url });
    }
    return out;
  }

  function render(social) {
    ensureStyle();
    var root = ensureRoot();
    if (!root) return;
    var items = activeItems(social);
    if (!items.length) {
      root.classList.remove('is-visible');
      root.innerHTML = '';
      root.hidden = true;
      return;
    }
    var fr = lang() === 'fr';
    var title = fr ? 'Suivez-nous' : 'تابعنا';
    var html = '<div class="rzq-soc-title" data-t="ft-follow">' + title + '</div><div class="rzq-soc-row" role="list">';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var lab = LABELS[it.key] || { ar: it.key, fr: it.key };
      var name = fr ? lab.fr : lab.ar;
      html +=
        '<a class="rzq-soc-btn" role="listitem" href="' +
        it.url.replace(/"/g, '&quot;') +
        '" target="_blank" rel="noopener noreferrer" aria-label="' +
        name +
        '" title="' +
        name +
        '" data-social="' +
        it.key +
        '">' +
        (ICONS[it.key] || '') +
        '</a>';
    }
    html += '</div>';
    root.innerHTML = html;
    root.hidden = false;
    root.classList.add('is-visible');
  }

  function backendBase() {
    var b = String(global.RIZQ_BACKEND_BASE || '').replace(/\/$/, '');
    if (b) return b;
    try {
      var origin = String(location.origin || '').replace(/\/$/, '');
      if (/^https?:\/\//i.test(origin)) return origin;
    } catch (e) {}
    return '';
  }

  function loadAndRender() {
    var base = backendBase();
    if (!base) {
      render(null);
      return Promise.resolve(false);
    }
    return fetch(base + '/api/site-config', { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var site = data && data.ok && data.config ? data.config.site : null;
        var social = site ? enrichSocial(site) : null;
        var wanted = activeItems(social).length;
        render(social);
        var root = document.getElementById(ROOT_ID);
        if (!root && wanted > 0) return { mounted: false, wanted: wanted };
        if (wanted > 0) {
          return {
            mounted: !!root.querySelector('.rzq-soc-btn'),
            wanted: wanted
          };
        }
        return { mounted: true, wanted: 0 };
      })
      .catch(function () {
        render(null);
        return { mounted: false, wanted: -1 };
      });
  }

  var _bootTries = 0;
  function boot() {
    _bootTries += 1;
    loadAndRender().then(function (state) {
      // إعادة المحاولة إن تأخر حقن الفوتر بينما توجد روابط مفعّلة
      if (state && state.wanted > 0 && !state.mounted && _bootTries < 8) {
        setTimeout(boot, 350 * _bootTries);
      }
    });
  }

  global.RizqSocialLinksRefresh = loadAndRender;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('rizq:langchange', function () {
    loadAndRender();
  });
})(typeof window !== 'undefined' ? window : this);
