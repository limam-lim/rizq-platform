/**
 * rizq_module_flags.js — إخفاء أقسام ما قبل الإطلاق + «قريباً» + حماية الروابط
 */
(function (global) {
  'use strict';

  var _lastFlags = null;
  var _guardBound = false;
  var _csSelectedSection = '';

  var HREF_MODULE = {
    'rizq_store.html': 'store',
    'rizq_office.html': 'office',
    'rizq_showroom.html': 'corp',
    'rizq_showroom_directory.html': 'corp',
    'rizq_directory.html': 'corp',
    'rizq_corp.html': 'corp',
    'rizq_tenders.html': 'tenders',
    'rizq_investments.html': 'investments',
    'rizq_ads_info.html': 'videoAds'
  };

  var CS_SECTIONS = [
    { key: 'office', icon: '📒', ar: 'المكاتب', fr: 'Bureaux' },
    { key: 'corp', icon: '🏢', ar: 'الشركات والمعارض', fr: 'Entreprises & showrooms' },
    { key: 'tenders', icon: '📑', ar: 'غرفة المناقصات', fr: 'Salle des appels d\'offres' },
    { key: 'investments', icon: '📈', ar: 'غرفة الاستثمارات', fr: 'Salle des investissements' },
    { key: 'videoAds', icon: '🎬', ar: 'فيديوهات Rizq ADS', fr: 'Vidéos Rizq ADS' }
  ];

  function defaultFlags() {
    return { individual: true, store: true, office: true, corp: true, estate: true, tenders: true, investments: true, videoAds: true };
  }

  function lang() {
    try {
      if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') return global.RizqI18n.getLang();
      return localStorage.getItem('rizq_lang') || 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t(ar, fr) {
    return lang() === 'fr' ? fr : ar;
  }

  function pageKey() {
    try {
      var p = (location.pathname || '').split('/').pop().toLowerCase();
      var q = p.indexOf('?');
      if (q !== -1) p = p.slice(0, q);
      var h = p.indexOf('#');
      if (h !== -1) p = p.slice(0, h);
      return p.replace(/\.html$/, '');
    } catch (e) {
      return '';
    }
  }

  function moduleKeyFromHref(href) {
    if (!href) return null;
    var disc = href.match(/#rzq-disc-(store|corp|office|tenders|investments)\b/);
    if (disc) return disc[1];
    if (href.charAt(0) === '#') return null;
    var qIdx = href.indexOf('?');
    var query = qIdx !== -1 ? href.slice(qIdx + 1).split('#')[0] : '';
    var path = href.split('?')[0].split('#')[0];
    var file = path.split('/').pop().toLowerCase();
    if (!file) return null;
    if (file === 'rizq_directory.html' || file === 'rizq_directory') {
      try {
        var tp = new URLSearchParams(query).get('type');
        if (tp === 'store' || tp === 'office' || tp === 'corp') return tp;
      } catch (e) {}
      return 'corp';
    }
    if (HREF_MODULE[file]) return HREF_MODULE[file];
    if (!/\.html$/.test(file)) return HREF_MODULE[file + '.html'] || null;
    return null;
  }

  function sectionLabel(key) {
    var s = CS_SECTIONS.filter(function (x) { return x.key === key; })[0];
    if (s) return t(s.ar, s.fr);
    var map = {
      store: t('المحلات', 'Boutiques'),
      office: t('المكاتب', 'Bureaux'),
      corp: t('معارض الشو روم', 'Showrooms'),
      tenders: t('غرفة المناقصات', 'Appels d\'offres'),
      investments: t('غرفة الاستثمارات', 'Investissements'),
      videoAds: t('Rizq ADS', 'Rizq ADS')
    };
    return map[key] || key;
  }

  function refreshComingSoonModalLang() {
    var desc = document.getElementById('cs-modal-desc');
    var input = document.getElementById('cs-modal-input');
    var nameEl = document.getElementById('cs-modal-name');
    var actEl = document.getElementById('cs-modal-activity');
    var submit = document.getElementById('cs-modal-submit');
    var cancel = document.getElementById('cs-modal-cancel');
    if (desc) {
      desc.textContent = t(
        'هذا القسم قيد الإطلاق — سجّل اسمك وهاتفك ونوع نشاطك لنعلمك فور التفعيل.',
        'Cette section arrive bientôt — indiquez nom, téléphone et activité pour être prévenu.'
      );
    }
    if (nameEl) nameEl.placeholder = t('الاسم', 'Nom');
    if (input) input.placeholder = t('الهاتف (+222 ...)', 'Téléphone (+222 ...)');
    if (actEl) actEl.placeholder = t('نوع النشاط', 'Type d\'activité');
    if (submit) submit.textContent = '✅ ' + t('سجّل اهتمامك', 'Enregistrer mon intérêt');
    if (cancel) cancel.textContent = t('إغلاق', 'Fermer');
  }

  function ensureComingSoonModal() {
    if (document.getElementById('cs-modal-overlay')) {
      refreshComingSoonModalLang();
      return;
    }
    var modal = document.createElement('div');
    modal.id = 'cs-modal-overlay';
    modal.className = 'cs-modal-overlay';
    modal.innerHTML = '<div class="cs-modal-box">'
      + '<div class="cs-modal-title" id="cs-modal-title"></div>'
      + '<div class="cs-modal-desc" id="cs-modal-desc"></div>'
      + '<input type="text" id="cs-modal-name" class="cs-modal-input" autocomplete="name">'
      + '<input type="tel" id="cs-modal-input" class="cs-modal-input" autocomplete="tel">'
      + '<input type="text" id="cs-modal-activity" class="cs-modal-input">'
      + '<button type="button" class="cs-modal-submit" id="cs-modal-submit"></button>'
      + '<button type="button" class="cs-modal-cancel" id="cs-modal-cancel"></button>'
      + '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeComingSoonModal();
    });
    document.getElementById('cs-modal-submit').addEventListener('click', submitComingSoonInterest);
    document.getElementById('cs-modal-cancel').addEventListener('click', closeComingSoonModal);
    refreshComingSoonModalLang();
  }

  function openComingSoonModal(key, label) {
    _csSelectedSection = key || '';
    ensureComingSoonModal();
    var overlay = document.getElementById('cs-modal-overlay');
    var title = document.getElementById('cs-modal-title');
    if (title) title.textContent = '🔔 ' + (label || sectionLabel(key));
    var input = document.getElementById('cs-modal-input');
    if (input) input.value = '';
    if (overlay) {
      overlay.classList.add('active');
      overlay.style.display = 'flex';
      overlay.style.pointerEvents = 'auto';
    }
  }

  function closeComingSoonModal() {
    var overlay = document.getElementById('cs-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.style.display = '';
      overlay.style.pointerEvents = '';
    }
  }

  function submitComingSoonInterest() {
    var input = document.getElementById('cs-modal-input');
    var nameEl = document.getElementById('cs-modal-name');
    var actEl = document.getElementById('cs-modal-activity');
    var contact = input ? input.value.trim() : '';
    var name = nameEl ? nameEl.value.trim() : '';
    var activityType = actEl ? actEl.value.trim() : '';
    if (!contact || contact.length < 6) {
      alert(t('الرجاء إدخال رقم هاتف صالح', 'Veuillez saisir un téléphone valide'));
      return;
    }
    if (!name) {
      alert(t('الرجاء إدخال الاسم', 'Veuillez saisir le nom'));
      return;
    }
    if (!global.RIZQ_BACKEND_BASE) {
      closeComingSoonModal();
      notifySoonSaved();
      return;
    }
    fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/section-interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: _csSelectedSection,
        contact: contact,
        phone: contact,
        name: name,
        activityType: activityType
      })
    }).then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        closeComingSoonModal();
        if (data && data.ok) notifySoonSaved();
      }).catch(function () {
        closeComingSoonModal();
      });
  }

  function notifySoonSaved() {
    var msg = t('✅ سجّلنا اهتمامك — سنعلمك فور التفعيل', '✅ Intérêt enregistré — nous vous préviendrons à l\'ouverture');
    if (typeof global.showToast === 'function') global.showToast(msg);
    else alert(msg);
  }

  function showComingSoonNotice(key) {
    var s = CS_SECTIONS.filter(function (x) { return x.key === key; })[0];
    var label = (s ? s.icon + ' ' : '🔜 ') + sectionLabel(key);
    var toastMsg = t('قريباً: ', 'Bientôt : ') + sectionLabel(key);
    if (typeof global.showToast === 'function') global.showToast(toastMsg, 'info');
    openComingSoonModal(key, label);
  }

  function hideComingSoonStrip(strip) {
    if (!strip) return;
    strip.innerHTML = '';
    strip.style.display = 'none';
    strip.style.background = 'none';
    strip.style.minHeight = '0';
    strip.style.padding = '0';
    strip.style.margin = '0';
    strip.setAttribute('hidden', '');
    strip.setAttribute('aria-hidden', 'true');
  }

  function renderComingSoonStrip(flags) {
    var strip = document.getElementById('coming-soon-strip');
    if (!strip) return;
    var closed = CS_SECTIONS.filter(function (s) { return flags[s.key] === false; });
    if (!closed.length) {
      hideComingSoonStrip(strip);
      return;
    }
    strip.removeAttribute('hidden');
    strip.removeAttribute('aria-hidden');
    var isFr = lang() === 'fr';
    var html = '<div class="cs-strip">'
      + '<div class="cs-strip-title">' + t('🔜 قريباً على رزق — أخبرنا بما يهمّك', '🔜 Bientôt sur Rizq — dites-nous ce qui vous intéresse') + '</div>'
      + closed.map(function (s) {
        return '<div class="cs-item"><span class="cs-item-label">' + s.icon + ' ' + t(s.ar, s.fr) + '</span>'
          + '<span class="cs-item-soon">' + t('قريباً', 'Bientôt') + '</span>'
          + '<button type="button" class="cs-item-btn" data-cs-key="' + s.key + '" data-cs-label="' + t(s.ar, s.fr).replace(/"/g, '&quot;') + '">'
          + t('أعلمني عند التفعيل', 'Prévenez-moi') + '</button></div>';
      }).join('')
      + '</div>';
    strip.innerHTML = html;
    strip.style.display = 'block';
    strip.setAttribute('dir', isFr ? 'ltr' : 'rtl');
    strip.querySelectorAll('.cs-item-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openComingSoonModal(btn.getAttribute('data-cs-key'), btn.getAttribute('data-cs-label'));
      });
    });
    ensureComingSoonModal();
  }

  function tagModuleLinks() {
    Object.keys(HREF_MODULE).forEach(function (file) {
      var key = HREF_MODULE[file];
      document.querySelectorAll('a[href="' + file + '"], a[href*="' + file + '"]').forEach(function (a) {
        if (!a.getAttribute('data-rizq-module')) a.setAttribute('data-rizq-module', key);
      });
    });
    document.querySelectorAll('.hero-biz-btn[href]').forEach(function (a) {
      var key = moduleKeyFromHref(a.getAttribute('href'));
      if (key) a.setAttribute('data-rizq-module', key);
    });
  }

  function isModuleClosed(flags, key) {
    if (global.RizqDynamicNav && typeof global.RizqDynamicNav.moduleOpen === 'function') {
      return !global.RizqDynamicNav.moduleOpen(flags, key);
    }
    if (key === 'store') return false;
    return flags[key] === false;
  }

  function applyComingSoonBadges(flags) {
    tagModuleLinks();
    document.querySelectorAll('.hero-biz-btn[data-rizq-module]').forEach(function (btn) {
      var key = btn.getAttribute('data-rizq-module');
      var closed = isModuleClosed(flags, key);
      var badge = btn.querySelector('.hero-biz-badge[data-rizq-soon="1"]');
      if (closed) {
        btn.style.display = '';
        btn.classList.add('rizq-module-soon');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'hero-biz-badge';
          badge.setAttribute('data-rizq-soon', '1');
          badge.setAttribute('data-t', 'hbiz-soon-badge');
          btn.insertBefore(badge, btn.firstChild);
        }
        badge.textContent = t('قريباً', 'Bientôt');
        badge.style.display = '';
      } else {
        btn.classList.remove('rizq-module-soon');
        if (badge) badge.remove();
      }
    });
    /* استبدال أزرار الاشتراك/التسجيل في الأقسام المغلقة بـ «سجّل اهتمامك» */
    document.querySelectorAll('[data-rizq-subscribe],[data-rizq-register-section]').forEach(function (el) {
      var key = el.getAttribute('data-rizq-subscribe') || el.getAttribute('data-rizq-register-section');
      if (!key || !isModuleClosed(flags, key)) return;
      if (el.getAttribute('data-rizq-interest-bound') === '1') return;
      el.setAttribute('data-rizq-interest-bound', '1');
      el.setAttribute('data-rizq-interest-section', key);
      var lbl = el.querySelector('.rizq-hdr-lbl, span, strong') || el;
      try {
        if (el.tagName === 'A' || el.tagName === 'BUTTON') {
          el.addEventListener('click', function (ev) {
            if (!isModuleClosed(_lastFlags || flags, key)) return;
            ev.preventDefault();
            ev.stopPropagation();
            openComingSoonModal(key, sectionLabel(key));
          }, true);
        }
      } catch (eBind) {}
      if (el.tagName === 'A' || el.tagName === 'BUTTON') {
        el.textContent = t('سجّل اهتمامك', 'Enregistrez votre intérêt');
      }
    });
  }

  function applyHeroAndSectionHides(flags) {
    /* الأقسام المغلقة تبقى ظاهرة بنفس التصميم — شارة «قريباً» فقط */
    applyComingSoonBadges(flags);
    /* نماذج demo=?1 تبقى تعمل كما هي — لا نحجب الصفحات */
  }

  function guardCurrentPage() {
    /* Navigation is never blocked — closed modules may still show an info strip only. */
  }

  function bindModuleGuard() {
    /* Removed capture-phase preventDefault: it made header/footer links feel dead. */
    _guardBound = true;
  }

  function apply(flags) {
    flags = flags && typeof flags === 'object' ? flags : defaultFlags();
    _lastFlags = flags;
    if (global.RizqDynamicNav && typeof global.RizqDynamicNav.apply === 'function') {
      global.RizqDynamicNav.apply(flags);
    } else {
      /* لا نخفي روابط الأقسام المغلقة — تبقى ظاهرة مع شارة قريباً */
    }
    applyHeroAndSectionHides(flags);
    renderComingSoonStrip(flags);
    guardCurrentPage(flags);
    bindModuleGuard(flags);
  }

  function renderLaunchFreeBanner(launch) {
    var id = 'rizq-launch-free-banner';
    var existing = document.getElementById(id);
    var active = launch && launch.freePeriodActive && launch.freeUntil;
    if (!active) {
      if (existing) existing.remove();
      return;
    }
    var until = String(launch.freeUntil);
    var msg = t(
      'مجاناً بالكامل حتى ' + until + ' — سجّل الآن واحصل على شارة شريك مؤسس وخصم دائم',
      'Entièrement gratuit jusqu\'au ' + until + ' — inscrivez-vous et obtenez le badge Partenaire fondateur + remise durable'
    );
    if (!existing) {
      existing = document.createElement('div');
      existing.id = id;
      existing.setAttribute('role', 'status');
      existing.style.cssText = 'position:relative;z-index:40;width:100%;box-sizing:border-box;padding:8px 14px;text-align:center;font-size:13px;font-weight:800;line-height:1.45;color:#0D1B2A;background:linear-gradient(90deg,#E8C96A,#C9A84C,#E8C96A);border-bottom:1px solid rgba(13,27,42,.12);';
      var host = document.body;
      if (host.firstChild) host.insertBefore(existing, host.firstChild);
      else host.appendChild(existing);
    }
    existing.textContent = msg;
  }

  function fetchAndApply() {
    if (!global.RIZQ_BACKEND_BASE) {
      apply(defaultFlags());
      return;
    }
    fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/site-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var cfg = data && data.ok && data.config ? data.config : null;
        var flags = (cfg && cfg.moduleFlags) || defaultFlags();
        apply(flags);
        renderLaunchFreeBanner(cfg && cfg.launch);
      })
      .catch(function () {
        apply(defaultFlags());
      });
  }

  global.openComingSoonModal = openComingSoonModal;
  global.closeComingSoonModal = closeComingSoonModal;
  global.submitComingSoonInterest = submitComingSoonInterest;
  global.renderComingSoonStrip = renderComingSoonStrip;
  global.showComingSoonNotice = showComingSoonNotice;

  global.RizqModuleFlags = {
    apply: apply,
    fetchAndApply: fetchAndApply,
    reapply: function () {
      if (_lastFlags) apply(_lastFlags);
      else fetchAndApply();
    },
    defaultFlags: defaultFlags,
    moduleKeyFromHref: moduleKeyFromHref
  };

  document.addEventListener('rizq:langchange', function () {
    if (_lastFlags) renderComingSoonStrip(_lastFlags);
    else refreshComingSoonModalLang();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndApply);
  } else {
    fetchAndApply();
  }
})(window);
