/**
 * rizq_dashboard_ui.js — Private Digital Space interactions
 * Preview bar · actionable service tiles · package widget · hours modes · brand accent · dropzones
 * Additive; does not replace existing API bindings.
 */
(function (global) {
  'use strict';

  var RizqDashUI = global.RizqDashUI || {};

  function t(ar, fr) {
    if (typeof global._t2 === 'function') return global._t2(ar, fr);
    try {
      if ((document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0) return fr;
    } catch (e) {}
    return ar;
  }

  function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function detectType() {
    var b = document.body;
    if (!b) return 'individual';
    var ns = (b.getAttribute('data-t-ns') || '').toLowerCase();
    if (ns.indexOf('store') >= 0) return 'store';
    if (ns.indexOf('office') >= 0) return 'office';
    if (ns.indexOf('estate') >= 0) return 'estate';
    if (ns.indexOf('corp') >= 0) return 'corp';
    if (ns === 'dashboard' || ns.indexOf('individual') >= 0) return 'individual';
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('store') >= 0) return 'store';
    if (path.indexOf('office') >= 0) return 'office';
    if (path.indexOf('estate') >= 0) return 'estate';
    if (path.indexOf('corp') >= 0) return 'corp';
    return 'individual';
  }

  function sessionId() {
    try {
      var p = new URLSearchParams(location.search);
      return p.get('id') || global.SESSION_ID || '';
    } catch (e) {
      return global.SESSION_ID || '';
    }
  }

  function accountObj(type) {
    type = type || detectType();
    if (type === 'store' && global.STORE) return global.STORE;
    if (type === 'office' && global.OFFICE) return global.OFFICE;
    if (type === 'estate' && (global.ESTATE || global.OFFICE)) return global.ESTATE || global.OFFICE;
    if (type === 'corp' && (global.CORP_ACC || global.CORP)) return global.CORP_ACC || global.CORP;
    if (global.USER || global.ACC || global.ACCOUNT) return global.USER || global.ACC || global.ACCOUNT;
    return {};
  }

  function publicPreviewUrl(type, id) {
    var base = location.href.replace(/[^/]+$/, '');
    id = encodeURIComponent(id || 'demo');
    if (type === 'store') return base + 'rizq_store.html?id=' + id;
    if (type === 'office') return base + 'rizq_office.html?id=' + id;
    if (type === 'estate') return base + 'rizq_estate.html?id=' + id;
    if (type === 'corp') return base + 'rizq_corp.html?id=' + id;
    return base + 'rizq_landing_v8.html';
  }

  function brandKey(id) {
    return 'rizq_dash_brand_' + (id || 'anon');
  }

  function loadBrand(id) {
    try {
      return JSON.parse(localStorage.getItem(brandKey(id)) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function saveBrand(id, data) {
    try {
      localStorage.setItem(brandKey(id), JSON.stringify(data || {}));
    } catch (e) {}
  }

  function applyBrandAccent(color) {
    var c = color || '#C9A84C';
    document.documentElement.style.setProperty('--rizq-brand-accent', c);
    if (document.body) {
      document.body.style.setProperty('--rizq-brand-accent', c);
      document.body.setAttribute('data-brand-accent', c);
    }
    var sw = document.getElementById('rizq-preview-accent');
    if (sw) sw.style.background = c;
  }

  /* ── Live storefront preview bar ─────────────────────────── */
  function ensurePreviewBar() {
    var type = detectType();
    if (type === 'individual') return null;
    if (document.getElementById('rizq-live-preview-bar')) return document.getElementById('rizq-live-preview-bar');

    var mount =
      document.getElementById('rizq-status-summary-mount') ||
      document.getElementById('rizq-sub-slot') ||
      document.querySelector('.content') ||
      document.getElementById('dash-root') ||
      document.querySelector('.page-content');
    if (!mount) return null;

    var id = sessionId();
    var acc = accountObj(type);
    var brand = loadBrand(id);
    var name = acc.name || acc.storeName || acc.officeName || acc.companyName || t('مساحتك الخاصة', 'Votre espace privé');
    var accent = brand.accent || acc.brandColor || '#C9A84C';

    var bar = document.createElement('div');
    bar.id = 'rizq-live-preview-bar';
    bar.className = 'rizq-preview-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', t('معاينة الواجهة العامة', 'Aperçu de la vitrine'));
    bar.innerHTML =
      '<span class="rizq-preview-bar__live">' + escapeHtml(t('مباشر', 'Live')) + '</span>' +
      '<div class="rizq-preview-bar__accent" id="rizq-preview-accent" title="' + escapeHtml(t('لون علامتك', 'Couleur de marque')) + '"></div>' +
      '<div class="rizq-preview-bar__meta">' +
        '<div class="rizq-preview-bar__title">' + escapeHtml(t('المساحة الخاصة بالمشترك', 'Espace privé abonné')) + ' · ' + escapeHtml(name) + '</div>' +
        '<div class="rizq-preview-bar__sub">' + escapeHtml(t('تحديثات الداشبورد تنعكس فوراً على واجهتك العامة', 'Les mises à jour du tableau se reflètent sur votre vitrine')) + '</div>' +
      '</div>' +
      '<div class="rizq-preview-bar__actions">' +
        '<button type="button" class="rizq-preview-bar__ghost" id="rizq-brand-customize-btn">' + escapeHtml(t('🎨 تخصيص', '🎨 Personnaliser')) + '</button>' +
        '<button type="button" class="rizq-preview-bar__cta" id="rizq-preview-open-btn">' + escapeHtml(t('👁 معاينة الواجهة', '👁 Voir la vitrine')) + '</button>' +
      '</div>';

    if (mount.id === 'rizq-status-summary-mount' || mount.id === 'rizq-sub-slot') {
      mount.parentNode.insertBefore(bar, mount.nextSibling);
    } else {
      mount.insertBefore(bar, mount.firstChild);
    }

    applyBrandAccent(accent);

    var openBtn = document.getElementById('rizq-preview-open-btn');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        if (typeof global.previewMyPage === 'function') {
          global.previewMyPage();
          return;
        }
        window.open(publicPreviewUrl(type, id || 'demo'), '_blank');
      });
    }

    var customBtn = document.getElementById('rizq-brand-customize-btn');
    if (customBtn) {
      customBtn.addEventListener('click', function () {
        openBrandCustomize(id, brand);
      });
    }

    return bar;
  }

  function openBrandCustomize(id, brand) {
    brand = brand || loadBrand(id);
    var existing = document.getElementById('rizq-brand-modal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'rizq-brand-modal';
    overlay.className = 'modal-overlay open';
    overlay.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(10,25,47,.55);z-index:400;align-items:center;justify-content:center;padding:16px';
    overlay.innerHTML =
      '<div class="modal-box" style="background:#fff;border-radius:18px;padding:22px;max-width:420px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.3)">' +
        '<div style="font-size:16px;font-weight:900;color:#1B3A6B;margin-bottom:6px">' + escapeHtml(t('تخصيص مساحتك الخاصة', 'Personnaliser votre espace')) + '</div>' +
        '<p style="font-size:12px;color:#2C3A4F;margin-bottom:14px;line-height:1.6">' + escapeHtml(t('لون العلامة يظهر في شريط المعاينة وأزرار التمييز — بدون كسر الهوية العامة لرزق.', 'La couleur de marque s’affiche dans la barre d’aperçu et les accents — sans casser l’identité Rizq.')) + '</p>' +
        '<div class="brand-customize-row">' +
          '<label style="font-size:12px;font-weight:700;color:#1B3A6B">' + escapeHtml(t('لون التمييز', 'Couleur d’accent')) + '</label>' +
          '<input type="color" id="rizq-brand-color" value="' + escapeHtml(brand.accent || '#C9A84C') + '" style="width:48px;height:36px;border:none;background:transparent;cursor:pointer"/>' +
          '<span class="brand-accent-swatch" id="rizq-brand-swatch" style="background:' + escapeHtml(brand.accent || '#C9A84C') + '"></span>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">' +
          '<button type="button" class="btn btn-outline btn-sm" id="rizq-brand-cancel">' + escapeHtml(t('إلغاء', 'Annuler')) + '</button>' +
          '<button type="button" class="btn btn-gold btn-sm" id="rizq-brand-save">' + escapeHtml(t('حفظ', 'Enregistrer')) + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var colorInp = document.getElementById('rizq-brand-color');
    var swatch = document.getElementById('rizq-brand-swatch');
    if (colorInp) {
      colorInp.addEventListener('input', function () {
        if (swatch) swatch.style.background = colorInp.value;
        applyBrandAccent(colorInp.value);
      });
    }
    function close() { overlay.remove(); }
    var cancel = document.getElementById('rizq-brand-cancel');
    if (cancel) cancel.addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    var save = document.getElementById('rizq-brand-save');
    if (save) {
      save.addEventListener('click', function () {
        var c = (colorInp && colorInp.value) || '#C9A84C';
        brand.accent = c;
        saveBrand(id, brand);
        applyBrandAccent(c);
        if (typeof global.showToast === 'function') {
          global.showToast(t('تم حفظ تخصيص المساحة ✅', 'Personnalisation enregistrée ✅'), 'success');
        }
        close();
        refreshPreviewMeta();
      });
    }
  }

  function refreshPreviewMeta() {
    var bar = document.getElementById('rizq-live-preview-bar');
    if (!bar) return;
    var type = detectType();
    var acc = accountObj(type);
    var name = acc.name || acc.storeName || acc.officeName || acc.companyName || '';
    var title = bar.querySelector('.rizq-preview-bar__title');
    if (title && name) {
      title.textContent = t('المساحة الخاصة بالمشترك', 'Espace privé abonné') + ' · ' + name;
    }
  }

  /* ── Package status widget ───────────────────────────────── */
  function listingUsage(type) {
    type = type || detectType();
    var used = 0;
    var limit = null;
    var id = sessionId();
    try {
      if (type === 'store' && Array.isArray(global.products)) used = global.products.length;
      else if (type === 'office' && Array.isArray(global.services)) used = global.services.length;
      else if (type === 'estate' && Array.isArray(global.PROPS)) used = global.PROPS.length;
      else if (type === 'corp' && Array.isArray(global.products)) used = global.products.length;
      else if (type === 'individual') {
        var ads = JSON.parse(localStorage.getItem('rizq_ads') || '[]');
        used = ads.filter(function (a) { return !id || a.ownerId === id || a.userId === id; }).length;
      }
    } catch (e) {}

    try {
      if (typeof global.RizqSub !== 'undefined' && id) {
        var sub = global.RizqSub.checkSubscription(id);
        var feats = (sub && sub.features) || [];
        var limFn = null;
        if (type === 'estate' && typeof global.listingLimit === 'function') {
          var lim = global.listingLimit();
          if (lim) {
            used = lim.used != null ? lim.used : used;
            limit = lim.limit === Infinity ? null : lim.limit;
          }
        }
        if (limit == null && sub && sub.limits && sub.limits.listings != null) {
          limit = sub.limits.listings;
        }
        if (limit == null && typeof global.RizqSub.getListingLimit === 'function') {
          limFn = global.RizqSub.getListingLimit(detectType(), feats);
          if (limFn != null && limFn !== Infinity) limit = limFn;
        }
      }
    } catch (e2) {}

    if (limit == null) {
      if (type === 'store') limit = 25;
      else if (type === 'office') limit = 15;
      else if (type === 'estate') limit = 20;
      else if (type === 'corp') limit = 100;
      else limit = 10;
    }
    return { used: used, limit: limit };
  }

  function planLabel(id) {
    try {
      if (typeof global.RizqSub !== 'undefined' && id) {
        var sub = global.RizqSub.checkSubscription(id);
        if (sub && (sub.planName || sub.packageName || sub.plan)) {
          return sub.planName || sub.packageName || sub.plan;
        }
        if (sub && sub.active === false) return t('غير مفعّل', 'Inactif');
      }
    } catch (e) {}
    var acc = accountObj();
    return acc.plan || acc.packageName || t('باقتك الحالية', 'Forfait actuel');
  }

  function ensurePackageWidget() {
    if (document.getElementById('rizq-pkg-widget')) return document.getElementById('rizq-pkg-widget');
    var type = detectType();
    var mount = document.getElementById('services-showcase');
    if (!mount || !mount.parentElement) {
      mount = document.querySelector('#panel-overview .card') || document.getElementById('panel-overview');
    }
    if (!mount) return null;

    var usage = listingUsage(type);
    var pct = usage.limit ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
    var id = sessionId();
    var widget = document.createElement('div');
    widget.id = 'rizq-pkg-widget';
    widget.className = 'rizq-pkg-widget';
    widget.innerHTML =
      '<div class="rizq-pkg-widget__head">' +
        '<div class="rizq-pkg-widget__title">' + escapeHtml(t('حالة الباقة والترقية', 'Statut du forfait')) + '</div>' +
        '<span class="rizq-pkg-widget__plan">' + escapeHtml(planLabel(id)) + '</span>' +
      '</div>' +
      '<div class="rizq-pkg-widget__meta">' +
        '<span>' + escapeHtml(t('العناصر المنشورة', 'Éléments publiés')) + '</span>' +
        '<span><strong>' + usage.used + '</strong> / ' + (usage.limit == null ? '∞' : usage.limit) + '</span>' +
      '</div>' +
      '<div class="rizq-pkg-widget__meter"><div class="rizq-pkg-widget__fill" style="width:' + pct + '%"></div></div>' +
      '<div class="rizq-pkg-widget__actions">' +
        '<button type="button" class="btn btn-gold btn-sm" data-rizq-pkg-upgrade>' + escapeHtml(t('⬆️ ترقية الباقة', '⬆️ Améliorer')) + '</button>' +
        '<button type="button" class="btn btn-outline btn-sm" data-rizq-pkg-receipt>' + escapeHtml(t('📎 رفع إيصال', '📎 Reçu')) + '</button>' +
      '</div>';

    var parent = mount.parentElement || mount;
    if (mount.id === 'services-showcase') {
      parent.insertBefore(widget, mount);
    } else {
      parent.insertBefore(widget, parent.firstChild);
    }

    var up = widget.querySelector('[data-rizq-pkg-upgrade]');
    if (up) {
      up.addEventListener('click', function () {
        if (typeof global.showPanel === 'function') global.showPanel('subscription', null);
        else if (typeof global.doUpgrade === 'function') global.doUpgrade();
      });
    }
    var rec = widget.querySelector('[data-rizq-pkg-receipt]');
    if (rec) {
      rec.addEventListener('click', function () {
        if (typeof global.showPanel === 'function') {
          global.showPanel('subscription', null);
          setTimeout(function () {
            var slot = document.getElementById('pay-receipt') ||
              document.getElementById('receipt-input') ||
              document.querySelector('input[type="file"][accept*="image"]');
            if (slot && typeof slot.scrollIntoView === 'function') slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 280);
        }
      });
    }
    return widget;
  }

  function refreshPackageWidget() {
    var w = document.getElementById('rizq-pkg-widget');
    if (!w) {
      ensurePackageWidget();
      return;
    }
    var usage = listingUsage();
    var pct = usage.limit ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
    var fill = w.querySelector('.rizq-pkg-widget__fill');
    if (fill) fill.style.width = pct + '%';
    var meta = w.querySelector('.rizq-pkg-widget__meta span:last-child');
    if (meta) meta.innerHTML = '<strong>' + usage.used + '</strong> / ' + (usage.limit == null ? '∞' : usage.limit);
    var plan = w.querySelector('.rizq-pkg-widget__plan');
    if (plan) plan.textContent = planLabel(sessionId());
  }

  /* ── Actionable service tile helpers ─────────────────────── */
  var PANEL_ACTIONS = {
    store: {
      products: 'products', catalog: 'products', hours: 'hours', photos: 'photos',
      messages: 'messages', requests: 'requests', subscription: 'subscription',
      agent: 'agent', ai: 'agent', analytics: 'overview', profile: 'profile',
      share: null
    },
    office: {
      services: 'services', hours: 'hours', photos: 'photos', requests: 'requests',
      messages: 'messages', subscription: 'subscription', agent: 'agent', profile: 'profile'
    },
    estate: {
      properties: 'properties', hours: 'hours', photos: 'photos', requests: 'requests',
      tenders: 'tenders', subscription: 'subscription', profile: 'profile', mypayments: 'mypayments'
    },
    corp: {
      products: 'products', hours: 'hours', photos: 'photos', messages: 'messages',
      requests: 'requests', subscription: 'subscription', team: 'team', api: 'api', analytics: 'analytics'
    },
    individual: {
      ads: 'ads', messages: 'messages', subscription: 'subscription', settings: 'settings'
    }
  };

  function statusBadge(avail, feature, needPkg) {
    if (avail) {
      return { cls: 'ok', text: t('متاح', 'Disponible') };
    }
    var diamond = needPkg && /ماسي|diamond|diamant/i.test(String(needPkg));
    if (diamond) {
      return { cls: 'diamond', text: t('ماسية', 'Diamant') };
    }
    return {
      cls: 'lock',
      text: needPkg
        ? (t('يتطلب ترقية', 'Upgrade') + ': ' + needPkg)
        : t('يتطلب ترقية', 'Upgrade requis')
    };
  }

  function buildSvcTile(opts) {
    opts = opts || {};
    var avail = !!opts.avail;
    var badge = statusBadge(avail, opts.feature, opts.needPkg);
    var action = opts.action || '';
    var onclick = '';
    if (avail && action) {
      if (action === 'share' && typeof global.openShareModal === 'function') onclick = 'openShareModal()';
      else if (action.indexOf('(') >= 0) onclick = action;
      else onclick = "showPanel('" + action.replace(/'/g, '') + "',null)";
    } else if (!avail) {
      onclick = "showPanel('subscription',null)";
    }
    return (
      '<div class="svc-tile' + (avail ? '' : ' is-locked') + '"' +
      (onclick ? ' onclick="' + onclick + '"' : '') +
      ' data-feature="' + escapeHtml(opts.feature || '') + '" role="button" tabindex="0">' +
        '<div class="svc-tile__badge ' + badge.cls + '">' + escapeHtml(badge.text) + '</div>' +
        '<div class="svc-tile__icon">' + (opts.icon || '✨') + '</div>' +
        '<div class="svc-tile__label">' + escapeHtml(opts.label || '') + '</div>' +
        '<div class="svc-tile__tip">' + escapeHtml(opts.tip || '') + '</div>' +
        (avail ? '<div class="svc-tile__dot" aria-hidden="true"></div>' : '') +
      '</div>'
    );
  }

  function renderIndividualShowcase() {
    var root = document.getElementById('services-showcase');
    if (!root || detectType() !== 'individual') return;
    if (root.children.length && root.querySelector('.svc-tile')) return;
    var tiles = [
      { icon: '📋', label: t('إعلاناتي', 'Mes annonces'), tip: t('إدارة قائمة الإعلانات', 'Gérer vos annonces'), action: 'my-ads', avail: true },
      { icon: '➕', label: t('إعلان جديد', 'Nouvelle annonce'), tip: t('انشر إعلاناً بسرعة', 'Publier rapidement'), action: "location.href='rizq_post.html'", avail: true },
      { icon: '💬', label: t('الرسائل', 'Messages'), tip: t('صندوق الوارد', 'Boîte de réception'), action: 'messages', avail: true },
      { icon: '💳', label: t('اشتراكي', 'Abonnement'), tip: t('الباقة والترقية', 'Forfait et upgrade'), action: 'subscription', avail: true },
      { icon: '👤', label: t('ملفي', 'Mon profil'), tip: t('البيانات الشخصية', 'Données personnelles'), action: 'profile', avail: true }
    ];
    root.innerHTML = tiles.map(function (s) {
      return buildSvcTile(s);
    }).join('');
  }

  function enhanceExistingShowcase() {
    var root = document.getElementById('services-showcase');
    if (!root) return;
    var type = detectType();
    if (type === 'individual') {
      renderIndividualShowcase();
      return;
    }
    var map = PANEL_ACTIONS[type] || {};

    Array.prototype.forEach.call(root.children, function (tile) {
      if (!tile || tile.classList.contains('svc-tile')) return;
      tile.classList.add('svc-tile');
      tile.style.cursor = 'pointer';
      if (!tile.getAttribute('onclick') || tile.getAttribute('onclick') === '') {
        var label = (tile.textContent || '').toLowerCase();
        var panel = null;
        Object.keys(map).forEach(function (k) {
          if (label.indexOf(k) >= 0 || label.indexOf(
            k === 'hours' ? 'ساعات' :
            k === 'products' ? 'منتج' :
            k === 'properties' ? 'عقار' :
            k === 'services' ? 'خدم' :
            k === 'agent' ? 'وكيل' :
            k === 'photos' ? 'صور' :
            k === 'messages' ? 'رسال' :
            k === 'requests' ? 'طلب' :
            k === 'subscription' ? 'اشتراك' : k
          ) >= 0) {
            panel = map[k];
          }
        });
        if (/ساعات|horaires|hours/i.test(label)) panel = 'hours';
        if (/وكيل|agent|ai/i.test(label)) panel = map.agent || 'agent';
        if (/منتج|produit|product/i.test(label)) panel = map.products || map.catalog || 'products';
        if (/عقار|propriét|property/i.test(label)) panel = map.properties || 'properties';
        if (/خدم|service/i.test(label) && type === 'office') panel = 'services';
        if (/صور|photo|galerie/i.test(label)) panel = map.photos || 'photos';
        if (/رسال|message/i.test(label)) panel = map.messages || 'messages';
        if (/معاينة|طلب|demande|request|visite/i.test(label)) panel = map.requests || 'requests';
        if (panel && typeof global.showPanel === 'function') {
          tile.setAttribute('onclick', "showPanel('" + panel + "',null)");
        } else if (!tile.getAttribute('onclick') && typeof global.showPanel === 'function') {
          /* keep locked tiles going to subscription if they already do */
        }
      }
      /* ensure pointer + hover class */
      if (!tile.querySelector('.svc-tile__badge') && /متاح|disponible/i.test(tile.textContent || '')) {
        var b = document.createElement('div');
        b.className = 'svc-tile__badge ok';
        b.textContent = t('متاح', 'Disponible');
        tile.appendChild(b);
      }
    });
  }

  /* ── Hours: Open / Closed / 24h chips ────────────────────── */
  function enhanceHoursPanel() {
    var table = document.getElementById('hours-table');
    if (!table) return;
    var panel = document.getElementById('panel-hours');
    if (panel && !document.getElementById('rizq-hours-toolbar')) {
      var toolbar = document.createElement('div');
      toolbar.id = 'rizq-hours-toolbar';
      toolbar.className = 'rizq-hours-toolbar';
      toolbar.innerHTML =
        '<button type="button" class="hours-mode-btn" data-hours-bulk="open">' + escapeHtml(t('فتح الكل', 'Tout ouvrir')) + '</button>' +
        '<button type="button" class="hours-mode-btn" data-hours-bulk="closed">' + escapeHtml(t('إغلاق الكل', 'Tout fermer')) + '</button>' +
        '<button type="button" class="hours-mode-btn" data-hours-bulk="24h">' + escapeHtml(t('24 ساعة', '24h/24')) + '</button>';
      table.parentNode.insertBefore(toolbar, table);
      toolbar.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-hours-bulk]');
        if (!btn) return;
        applyBulkHours(btn.getAttribute('data-hours-bulk'));
      });
    }

    Array.prototype.forEach.call(table.querySelectorAll('.hours-row'), function (row, i) {
      if (row.querySelector('.hours-day-modes')) return;
      var modes = document.createElement('div');
      modes.className = 'hours-day-modes';
      modes.innerHTML =
        '<button type="button" class="hours-chip" data-day="' + i + '" data-mode="open">' + escapeHtml(t('مفتوح', 'Ouvert')) + '</button>' +
        '<button type="button" class="hours-chip" data-day="' + i + '" data-mode="closed">' + escapeHtml(t('مغلق', 'Fermé')) + '</button>' +
        '<button type="button" class="hours-chip" data-day="' + i + '" data-mode="24h">' + escapeHtml(t('24س', '24h')) + '</button>';
      row.appendChild(modes);
      syncHourChips(i);
      modes.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-mode]');
        if (!chip) return;
        setDayMode(Number(chip.getAttribute('data-day')), chip.getAttribute('data-mode'));
      });
    });
  }

  function setDayMode(i, mode) {
    var openEl = document.getElementById('hr-open-' + i);
    var fromEl = document.getElementById('hr-from-' + i);
    var toEl = document.getElementById('hr-to-' + i);
    if (!fromEl || !toEl) return;
    if (mode === 'closed') {
      if (openEl) openEl.checked = false;
      fromEl.disabled = true;
      toEl.disabled = true;
    } else if (mode === '24h') {
      if (openEl) openEl.checked = true;
      fromEl.disabled = false;
      toEl.disabled = false;
      fromEl.value = '00:00';
      toEl.value = '23:59';
    } else {
      if (openEl) openEl.checked = true;
      fromEl.disabled = false;
      toEl.disabled = false;
      if (!fromEl.value) fromEl.value = '09:00';
      if (!toEl.value) toEl.value = '18:00';
    }
    if (typeof global.toggleDay === 'function' && openEl) {
      try { /* sync any app-side state */ } catch (e) {}
    }
    syncHourChips(i);
  }

  function syncHourChips(i) {
    var openEl = document.getElementById('hr-open-' + i);
    var fromEl = document.getElementById('hr-from-' + i);
    var toEl = document.getElementById('hr-to-' + i);
    var open = openEl ? openEl.checked : true;
    var is24 = open && fromEl && toEl && fromEl.value === '00:00' && (toEl.value === '23:59' || toEl.value === '24:00');
    Array.prototype.forEach.call(document.querySelectorAll('.hours-chip[data-day="' + i + '"]'), function (chip) {
      chip.classList.remove('is-on', 'is-off', 'is-24');
      var m = chip.getAttribute('data-mode');
      if (m === 'closed' && !open) chip.classList.add('is-off');
      else if (m === '24h' && is24) chip.classList.add('is-24');
      else if (m === 'open' && open && !is24) chip.classList.add('is-on');
    });
  }

  function applyBulkHours(mode) {
    var i = 0;
    while (document.getElementById('hr-from-' + i) || document.getElementById('hr-open-' + i)) {
      setDayMode(i, mode === 'closed' ? 'closed' : (mode === '24h' ? '24h' : 'open'));
      i++;
      if (i > 14) break;
    }
  }

  /* ── Drag-and-drop enhancement for upload zones ──────────── */
  function enhanceDropzones() {
    var zones = document.querySelectorAll('.upload-zone, [data-dropzone], #prod-images-zone, #prop-photos-zone, #photos-upload');
    Array.prototype.forEach.call(zones, function (zone) {
      if (zone._rizqDropBound) return;
      zone._rizqDropBound = true;
      zone.classList.add('rizq-dropzone');
      if (!zone.querySelector('.rizq-dropzone__hint')) {
        var hint = document.createElement('div');
        hint.className = 'rizq-dropzone__hint';
        hint.textContent = t('اسحب وأفلت الصور هنا · حتى 1.5MB للصورة', 'Glissez-déposez · max 1,5 Mo / image');
        zone.appendChild(hint);
      }
      ['dragenter', 'dragover'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.add('is-dragover');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        zone.addEventListener(ev, function (e) {
          e.preventDefault();
          e.stopPropagation();
          zone.classList.remove('is-dragover');
        });
      });
      zone.addEventListener('drop', function (e) {
        var files = e.dataTransfer && e.dataTransfer.files;
        if (!files || !files.length) return;
        var input = zone.querySelector('input[type="file"]') ||
          document.getElementById(zone.getAttribute('data-input') || '') ||
          zone.nextElementSibling;
        if (input && input.tagName === 'INPUT' && input.type === 'file') {
          try {
            var dt = new DataTransfer();
            Array.prototype.forEach.call(files, function (f) {
              if (f.size > 1.5 * 1024 * 1024) {
                if (typeof global.showToast === 'function') {
                  global.showToast(t('صورة أكبر من 1.5MB تم تخطيها', 'Image > 1,5 Mo ignorée'), 'error');
                }
                return;
              }
              dt.items.add(f);
            });
            input.files = dt.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          } catch (err) {}
        }
      });
    });
  }

  /* ── Map picker helper (profile / listing forms) ─────────── */
  function ensureMapPickers() {
    var targets = [
      { lat: 'p-lat', lng: 'p-lng', mount: 'p-location-wrap' },
      { lat: 'prop-lat', lng: 'prop-lng', mount: 'prop-map-wrap' },
      { lat: 'pf-lat', lng: 'pf-lng', mount: 'pf-location-row' },
      { lat: 'office-lat', lng: 'office-lng', mount: null }
    ];
    targets.forEach(function (cfg) {
      var lat = document.getElementById(cfg.lat);
      var lng = document.getElementById(cfg.lng);
      if (!lat && !lng) return;
      var host = (cfg.mount && document.getElementById(cfg.mount)) ||
        (lat && lat.parentElement) ||
        (lng && lng.parentElement);
      if (!host || host.querySelector('.map-picker-btn')) return;
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px';
      row.innerHTML =
        '<button type="button" class="map-picker-btn" data-map-pick>' + escapeHtml(t('📍 تحديد على الخريطة', '📍 Choisir sur la carte')) + '</button>' +
        '<span class="map-picker-coords" data-map-coords></span>';
      host.appendChild(row);
      var btn = row.querySelector('[data-map-pick]');
      var coords = row.querySelector('[data-map-coords]');
      function syncCoords() {
        if (!coords) return;
        var a = lat ? lat.value : '';
        var b = lng ? lng.value : '';
        coords.textContent = (a && b) ? (a + ', ' + b) : t('لم يُحدد بعد', 'Pas encore défini');
      }
      syncCoords();
      if (lat) lat.addEventListener('input', syncCoords);
      if (lng) lng.addEventListener('input', syncCoords);
      if (btn) {
        btn.addEventListener('click', function () {
          pickMapLocation(lat, lng, syncCoords);
        });
      }
    });
  }

  function pickMapLocation(latEl, lngEl, cb) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (pos) {
        if (latEl) latEl.value = String(pos.coords.latitude.toFixed(6));
        if (lngEl) lngEl.value = String(pos.coords.longitude.toFixed(6));
        if (typeof cb === 'function') cb();
        if (typeof global.showToast === 'function') {
          global.showToast(t('تم تحديد موقعك الحالي ✅', 'Position actuelle définie ✅'), 'success');
        }
        refreshPreviewMeta();
      }, function () {
        promptManualCoords(latEl, lngEl, cb);
      }, { enableHighAccuracy: true, timeout: 8000 });
    } else {
      promptManualCoords(latEl, lngEl, cb);
    }
  }

  function promptManualCoords(latEl, lngEl, cb) {
    var raw = window.prompt(
      t('أدخل الإحداثيات lat,lng', 'Entrez lat,lng'),
      ((latEl && latEl.value) || '18.0735') + ',' + ((lngEl && lngEl.value) || '-15.9582')
    );
    if (!raw) return;
    var parts = String(raw).split(/[,\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      if (latEl) latEl.value = parts[0];
      if (lngEl) lngEl.value = parts[1];
      if (typeof cb === 'function') cb();
    }
  }

  /* ── Enforce pointer on dynamically injected controls ────── */
  function enforcePointers(root) {
    root = root || document;
    var sel = 'button,[onclick],.qa-card,.sb-item,.nav-item,.upload-zone,.svc-tile,.stat-card';
    try {
      Array.prototype.forEach.call(root.querySelectorAll(sel), function (el) {
        if (el && el.style) el.style.cursor = 'pointer';
      });
    } catch (e) {}
  }

  /* ── Boot ────────────────────────────────────────────────── */
  function boot() {
    if (!document.body) return;
    if (!document.body.classList.contains('rizq-dash')) {
      document.body.classList.add('rizq-dash');
    }
    var id = sessionId();
    var brand = loadBrand(id);
    if (brand.accent) applyBrandAccent(brand.accent);

    ensurePreviewBar();
    ensurePackageWidget();
    renderIndividualShowcase();
    enhanceExistingShowcase();
    enhanceHoursPanel();
    enhanceDropzones();
    ensureMapPickers();
    enforcePointers();
  }

  function observePanels() {
    var root = document.querySelector('.content, .page-content, #dash-root, .main') || document.body;
    if (!root || typeof MutationObserver === 'undefined') return;
    var timer = null;
    var obs = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        enhanceExistingShowcase();
        enhanceHoursPanel();
        enhanceDropzones();
        ensureMapPickers();
        refreshPackageWidget();
        enforcePointers();
      }, 120);
    });
    obs.observe(root, { childList: true, subtree: true });
  }

  RizqDashUI.t = t;
  RizqDashUI.detectType = detectType;
  RizqDashUI.buildSvcTile = buildSvcTile;
  RizqDashUI.statusBadge = statusBadge;
  RizqDashUI.ensurePreviewBar = ensurePreviewBar;
  RizqDashUI.ensurePackageWidget = ensurePackageWidget;
  RizqDashUI.refreshPackageWidget = refreshPackageWidget;
  RizqDashUI.enhanceHoursPanel = enhanceHoursPanel;
  RizqDashUI.enhanceDropzones = enhanceDropzones;
  RizqDashUI.applyBrandAccent = applyBrandAccent;
  RizqDashUI.boot = boot;
  RizqDashUI.PANEL_ACTIONS = PANEL_ACTIONS;

  global.RizqDashUI = RizqDashUI;

  function start() {
    boot();
    observePanels();
    /* re-run after app scripts finish first paint */
    setTimeout(boot, 400);
    setTimeout(function () {
      enhanceExistingShowcase();
      refreshPackageWidget();
      enhanceHoursPanel();
    }, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : this);
