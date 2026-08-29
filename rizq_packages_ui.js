/**
 * rizq_packages_ui.js — عرض ديناميكي لباقات رزق + مزامنة site-config
 */
(function (global) {
  'use strict';

  var LS_MAP_FALLBACK = {
    general: 'rizq_packages',
    individual: 'rizq_individual_packages',
    office: 'rizq_office_packages',
    store: 'rizq_store_packages',
    corp: 'rizq_corp_packages',
    video: 'rizq_video_packages',
    tender: 'rizq_tender_packages',
    verified_plus: 'rizq_verified_plus_packages'
  };

  function resolveLsMap() {
    if (global.RizqPackagesConfig && typeof global.RizqPackagesConfig.getLsMap === 'function') {
      return global.RizqPackagesConfig.getLsMap();
    }
    return LS_MAP_FALLBACK;
  }

  var LS_MAP = resolveLsMap();

  function getLang() {
    try {
      if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') return global.RizqI18n.getLang();
      return localStorage.getItem('rizq_lang') || 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t2(ar, fr) {
    return getLang() === 'fr' ? fr : ar;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function isDiamond(p) {
    if (!p) return false;
    if (p.diamond || p.isDiamond) return true;
    if (global.RizqPackagesConfig && typeof global.RizqPackagesConfig.isDiamondPackage === 'function') {
      return global.RizqPackagesConfig.isDiamondPackage(p);
    }
    return /ماس|diamond|diamant/i.test([p.id, p.name, p.name_fr].filter(Boolean).join(' '));
  }

  function isTrial(p) {
    return !Number(p.price) || p.id === 'trial' || /trial|تجرب|ind-free|cp-trial|st-trial|of-trial|^Essai$/i.test(String(p.name || ''));
  }

  function isYearly(p) {
    return Number(p.durationDays) >= 360 || p.name === 'سنوية' || p.name === 'Annuelle';
  }

  function isQuarterly(p) {
    return (Number(p.durationDays) >= 80 && Number(p.durationDays) < 360) || p.name === 'ربعية';
  }

  function enrich(pkg, lang) {
    var p = Object.assign({}, pkg || {});
    if (global.RizqPackagesConfig && typeof global.RizqPackagesConfig.enrichForDisplay === 'function') {
      p = global.RizqPackagesConfig.enrichForDisplay(p, lang || getLang());
    }
    if (!p.name && global.RizqPackagesConfig && typeof global.RizqPackagesConfig.localizedName === 'function') {
      p.name = global.RizqPackagesConfig.localizedName(p, lang || getLang());
    } else if (global.RizqPackagesConfig && typeof global.RizqPackagesConfig.localizedName === 'function' && /^[a-z]+-[a-z]+$/.test(String(p.name || ''))) {
      p.name = global.RizqPackagesConfig.localizedName(p, lang || getLang());
    }
    if (!p.period || /^MRU\s*\//i.test(String(p.period))) {
      var days = Number(p.durationDays) || 30;
      var lng = lang || getLang();
    if (!Number(p.price)) p.period = lng === 'fr' ? (days + ' jours') : (days + ' أيام');
    else if (p.id && String(p.id).indexOf('boost') !== -1) p.period = lng === 'fr' ? 'par annonce' : 'لكل إعلان';
    else if (days >= 360) p.period = lng === 'fr' ? 'par an' : 'سنوياً';
      else if (days >= 80) p.period = lng === 'fr' ? '3 mois' : '3 أشهر';
      else p.period = lng === 'fr' ? 'par mois' : 'شهرياً';
    }
    return p;
  }

  function getPackages(catalogKey, lang) {
    if (global.RizqPackagesConfig && typeof global.RizqPackagesConfig.ensureCatalogStorageFresh === 'function') {
      try { global.RizqPackagesConfig.ensureCatalogStorageFresh(); } catch (e) {}
    }
    var key = catalogKey || 'general';
    lang = lang || getLang();
    var list = [];
    if (global.RizqPackagesConfig && typeof global.RizqPackagesConfig.getCatalog === 'function') {
      try {
        list = global.RizqPackagesConfig.getCatalog(key, lang) || [];
      } catch (e) {}
    }
    if (!list.length && global.RizqPackagesConfig && global.RizqPackagesConfig.CATALOGS) {
      list = JSON.parse(JSON.stringify(global.RizqPackagesConfig.CATALOGS[key] || []));
    }
    return (list || []).filter(function (p) { return p && p.active !== false; }).map(function (p) {
      return enrich(p, lang);
    });
  }

  function syncAllFromBackend(cb) {
    var cfg = global.RizqPackagesConfig;
    if (cfg && typeof cfg.syncCatalogFromBackend === 'function') {
      return cfg.syncCatalogFromBackend({ force: true }).then(function (ok) {
        if (typeof cb === 'function') cb(!!ok);
        return !!ok;
      });
    }
    if (!global.RIZQ_BACKEND_BASE) {
      if (typeof cb === 'function') cb(false);
      return Promise.resolve(false);
    }
    return fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/site-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        var pkgs = data && data.ok && data.config && data.config.packages;
        if (!pkgs || typeof pkgs !== 'object') {
          if (typeof cb === 'function') cb(false);
          return false;
        }
        Object.keys(resolveLsMap()).forEach(function (k) {
          if (Array.isArray(pkgs[k])) localStorage.setItem(resolveLsMap()[k], JSON.stringify(pkgs[k]));
        });
        try {
          if (global.RizqPackagesConfig && global.RizqPackagesConfig.CATALOG_SYNC_REVISION) {
            localStorage.setItem('rizq_catalog_sync_revision', global.RizqPackagesConfig.CATALOG_SYNC_REVISION);
          }
        } catch (e) {}
        if (typeof cb === 'function') cb(true);
        return true;
      })
      .catch(function () {
        if (typeof cb === 'function') cb(false);
        return false;
      });
  }

  function ctaHref(p, opts) {
    opts = opts || {};
    if (isTrial(p)) return opts.registerHref || 'rizq_landing_v8.html#register';
    return opts.pricingHref || 'rizq_landing_v8.html#pricing';
  }

  function ctaLabel(p) {
    if (p && p.cta) return p.cta;
    if (isTrial(p)) return t2('ابدأ تجربتك المجانية', 'Commencer l\'essai');
    if (isDiamond(p)) return t2('اشترك في الماسية', 'Choisir le Diamant');
    return t2('اشترك الآن', 'S\'abonner');
  }

  function pickLocalized(p, field, frField) {
    var lang = getLang();
    if (lang === 'fr') {
      var fr = p[frField];
      if (fr != null && String(fr).trim() !== '') return fr;
    }
    return p[field];
  }

  function pkgSkeletonHtml(count) {
    count = Math.max(2, Math.min(count || 4, 6));
    var i, html = '<div class="rizq-pkg-skel-grid" role="status" aria-busy="true" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px">';
    for (i = 0; i < count; i++) {
      html += '<div class="rizq-pkg-card rizq-skel-card" style="border-radius:18px;padding:28px 18px;border:1.5px solid rgba(201,168,76,.2);background:linear-gradient(160deg,#0a1628,#122040)">'
        + '<div class="rizq-skel" style="height:14px;width:55%;margin:0 auto 16px;border-radius:8px"></div>'
        + '<div class="rizq-skel" style="height:28px;width:40%;margin:0 auto 10px;border-radius:8px"></div>'
        + '<div class="rizq-skel" style="height:10px;width:70%;margin:0 auto 18px;border-radius:6px"></div>'
        + '<div class="rizq-skel" style="height:10px;width:90%;margin:0 auto 8px;border-radius:6px"></div>'
        + '<div class="rizq-skel" style="height:10px;width:85%;margin:0 auto 8px;border-radius:6px"></div>'
        + '<div class="rizq-skel" style="height:10px;width:80%;margin:0 auto 18px;border-radius:6px"></div>'
        + '<div class="rizq-skel" style="height:40px;width:100%;border-radius:11px"></div>'
        + '</div>';
    }
    return html + '</div>';
  }

  function renderCard(p, opts) {
    opts = opts || {};
    var lang = opts.lang || getLang();
    var dia = isDiamond(p);
    var trial = isTrial(p);
    var year = isYearly(p);
    var quarter = isQuarterly(p);
    var highlight = !!p.highlight || (!trial && !dia && !year && (p.id === 'st-month' || p.id === 'cp-month' || p.id === 'of-month' || p.id === 'vid-pro' || p.name === 'Pro' || p.name === 'احترافية'));
    var bg = dia ? 'linear-gradient(160deg,#0a1628,#1B3A6B)' : year ? 'linear-gradient(160deg,#1B3A6B,#0f2347)' : highlight ? 'linear-gradient(160deg,#16263d,#0D1B2A)' : trial ? 'linear-gradient(160deg,#f0fdf4,#dcfce7)' : 'linear-gradient(160deg,#f8faff,#eff3ff)';
    var border = dia ? '2px solid rgba(201,168,76,.55)' : year ? '2px solid rgba(201,168,76,.6)' : highlight ? '2px solid var(--gold,#C9A84C)' : trial ? '1.5px solid #86efac' : '1.5px solid #bfcfef';
    var nameCol = dia ? '#f3de9c' : year ? '#fde68a' : highlight ? '#fff' : trial ? '#15803d' : '#1B3A6B';
    var priceCol = dia ? '#e8c96a' : year ? '#fbbf24' : highlight ? 'var(--gold,#C9A84C)' : trial ? '#16a34a' : '#1d4ed8';
    var featCol = dia ? 'rgba(255,255,255,.85)' : year ? 'rgba(255,255,255,.85)' : highlight ? '#cdd7e8' : trial ? '#166534' : '#3a4a63';
    var periodCol = dia ? 'rgba(243,222,156,.7)' : year ? 'rgba(255,255,255,.6)' : highlight ? '#9fb0cc' : trial ? '#4ade80' : '#5b6b8a';
    var btnStyle = dia
      ? 'border:none;color:#0f2347;background:linear-gradient(135deg,#e8c96a,#C9A84C);box-shadow:0 6px 18px rgba(201,168,76,.4)'
      : year
        ? 'border:none;color:#0f2347;background:linear-gradient(135deg,#e8c96a,#C9A84C);box-shadow:0 6px 18px rgba(201,168,76,.4)'
        : highlight
          ? 'border:none;color:#16263d;background:linear-gradient(135deg,#e8c96a,var(--gold,#C9A84C));box-shadow:0 6px 18px rgba(201,168,76,.4)'
          : trial
            ? 'border:1.5px solid rgba(16,185,129,.4);color:#15803d;background:rgba(16,185,129,.08)'
            : 'border:none;color:#fff;background:linear-gradient(135deg,#1B3A6B,#234d8f);box-shadow:0 4px 14px rgba(27,58,107,.35)';
    var priceTxt = trial ? t2('مجاناً', 'Gratuit') : Number(p.price).toLocaleString();
    var feats = (lang === 'fr' && Array.isArray(p.features_fr) && p.features_fr.length)
      ? p.features_fr.slice(0, 6)
      : (p.features || []).slice(0, 6);
    var desc = pickLocalized(p, 'description', 'description_fr') || '';
    var roi = pickLocalized(p, 'roi', 'roi_fr') || '';
    var badgeTxt = pickLocalized(p, 'featuredBadge', 'featuredBadge_fr')
      || (dia ? t2('الأكثر اختياراً للشركات', 'Le plus choisi') : '');
    var badge = '';
    if (dia && badgeTxt) {
      badge = '<div class="rizq-feat-badge" style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#C9A84C,#e8c96a);color:#0f2347;font-size:10px;font-weight:900;padding:5px 14px;border-radius:20px;white-space:nowrap;box-shadow:0 4px 14px rgba(201,168,76,.45)">💎 ' + esc(badgeTxt) + '</div>';
    } else if (year) {
      badge = '<div class="rizq-feat-badge" style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#C9A84C,#e8c96a);color:#0f2347;font-size:10px;font-weight:900;padding:5px 16px;border-radius:20px;white-space:nowrap;box-shadow:0 4px 14px rgba(201,168,76,.4)">🏆 ' + t2('الأفضل قيمة', 'Meilleur rapport') + '</div>';
    } else if (highlight) {
      badge = '<div class="rizq-feat-badge" style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#e8c96a,var(--gold,#C9A84C));color:#16263d;font-size:10px;font-weight:900;padding:5px 16px;border-radius:20px;white-space:nowrap;box-shadow:0 4px 14px rgba(201,168,76,.4)">⭐ ' + t2('الأكثر اختياراً', 'Le plus demandé') + '</div>';
    }
    return ''
      + '<div class="store-pkg-card rizq-pkg-card" data-pkg="' + esc(p.id || '') + '" data-catalog="' + esc(opts.catalogKey || '') + '" style="background:' + bg + ';border:' + border + ';border-radius:18px;padding:' + (highlight || year || dia ? '32px' : '28px') + ' 18px 22px;text-align:center;position:relative;transition:transform .25s,box-shadow .25s">'
      + badge
      + '<div class="pkg-name" style="font-size:15px;font-weight:800;color:' + nameCol + ';margin-bottom:4px">' + esc(p.name || '') + '</div>'
      + (desc ? '<div style="font-size:11px;color:' + featCol + ';margin-bottom:8px;line-height:1.5">' + esc(desc) + '</div>' : '')
      + '<div><span class="pkg-price" style="font-size:27px;font-weight:900;color:' + priceCol + '">' + priceTxt + '</span>'
      + (!trial ? ' <span style="font-size:12px;color:' + periodCol + ';font-weight:600">MRU</span>' : '')
      + '</div>'
      + '<div class="pkg-period" style="font-size:11px;color:' + periodCol + ';font-weight:600;margin-bottom:16px">' + esc(p.period || '') + '</div>'
      + '<div style="height:1px;background:rgba(127,127,127,.15);margin-bottom:16px"></div>'
      + '<ul class="pkg-feats" style="list-style:none;display:flex;flex-direction:column;gap:8px;text-align:start;font-size:12px;color:' + featCol + ';margin-bottom:20px;padding:0">'
      + feats.map(function (f) { return '<li>✓ ' + esc(f) + '</li>'; }).join('')
      + '</ul>'
      + (roi ? '<div style="font-size:11px;color:#fde68a;margin:-8px 0 14px;line-height:1.5">💼 ' + esc(roi) + '</div>' : '')
      + '<button type="button" class="store-pkg-btn" onclick="window.location=\'' + esc(ctaHref(p, opts)) + '\'" style="width:100%;padding:11px;border-radius:11px;font-weight:800;font-size:13px;cursor:pointer;' + btnStyle + '">' + esc(ctaLabel(p)) + '</button>'
      + '</div>';
  }

  function renderGridHTML(list, opts) {
    list = list || [];
    opts = opts || {};
    if (!list.length) {
      return '<p style="text-align:center;color:#6a7a8a;font-size:14px;padding:24px">' + t2('لا توجد باقات متاحة حالياً', 'Aucun forfait disponible pour le moment') + '</p>';
    }
    var cols = opts.columns || Math.min(list.length, 5);
    return '<div class="rizq-pkg-grid-inner" data-cols="' + cols + '" style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:16px">'
      + list.map(function (p) { return renderCard(p, opts); }).join('')
      + '</div>';
  }

  function mount(containerId, catalogKey, opts) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    opts = Object.assign({ catalogKey: catalogKey }, opts || {});
    var skelCount = Number(opts.columns) || Number(el.getAttribute('data-rizq-pkg-cols')) || 4;
    var shownAt = Date.now();
    if (!el.getAttribute('data-rizq-pkg-ready')) {
      el.innerHTML = pkgSkeletonHtml(skelCount);
    }

    function draw() {
      var list = getPackages(catalogKey, opts.lang);
      if (opts.ensureDiamond && global.RizqPackagesConfig && typeof global.RizqPackagesConfig.withDiamond === 'function') {
        list = global.RizqPackagesConfig.withDiamond(list, opts.lang || getLang(), catalogKey).map(function (p) {
          return enrich(p, opts.lang || getLang());
        });
      }
      el.innerHTML = renderGridHTML(list, opts);
      el.setAttribute('data-rizq-pkg-ready', '1');
    }

    function drawAfterMin() {
      var wait = Math.max(0, 480 - (Date.now() - shownAt));
      setTimeout(draw, wait);
    }

    drawAfterMin();
    syncAllFromBackend(function () { draw(); });
  }

  function renderAdsCard(p, idx, opts) {
    opts = opts || {};
    var lang = opts.lang || getLang();
    var popular = p.id === 'vid-pro' || idx === 1;
    var cls = popular ? 'p-card popular reveal-init' : 'p-card reveal-init';
    var badge = popular ? '<div class="p-badge">' + t2('⭐ الأكثر شعبية', '⭐ Le plus populaire') + '</div>' : '';
    var price = Number(p.price) ? Number(p.price).toLocaleString() : t2('مجاناً', 'Gratuit');
    var featSrc = (lang === 'fr' && Array.isArray(p.features_fr) && p.features_fr.length) ? p.features_fr : (p.features || []);
    var feats = featSrc.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
    return ''
      + '<div class="' + cls + '" data-pkg="' + esc(p.id || '') + '">'
      + badge
      + '<div class="p-icon">' + (popular ? '🥇' : idx === 2 ? '💎' : '🥈') + '</div>'
      + '<div class="p-name">' + esc(p.name || '') + '</div>'
      + '<div class="p-sub">' + esc(p.period || t2('MRU / شهر', 'MRU / mois')) + '</div>'
      + '<div class="p-price">' + price + '</div>'
      + '<div class="p-period">' + t2('MRU / شهر', 'MRU / mois') + '</div>'
      + '<ul class="p-feats">' + feats + '</ul>'
      + '<a href="' + esc(opts.registerHref || 'rizq_landing_v8.html?openRegister=1') + '" class="p-cta">' + t2('ابدأ الآن', 'Commencer') + '</a>'
      + '</div>';
  }

  function mountAds(containerId, opts) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    opts = opts || {};
    var shownAt = Date.now();
    if (!el.getAttribute('data-rizq-pkg-ready')) {
      el.innerHTML = pkgSkeletonHtml(3);
    }
    function draw() {
      var list = getPackages('video', opts.lang);
      el.innerHTML = list.map(function (p, i) { return renderAdsCard(p, i, opts); }).join('');
      el.setAttribute('data-rizq-pkg-ready', '1');
    }
    function drawAfterMin() {
      var wait = Math.max(0, 480 - (Date.now() - shownAt));
      setTimeout(draw, wait);
    }
    drawAfterMin();
    syncAllFromBackend(function () { draw(); });
  }

  global.RizqPackagesUI = {
    LS_MAP: LS_MAP,
    resolveLsMap: resolveLsMap,
    getLang: getLang,
    getPackages: getPackages,
    syncAllFromBackend: syncAllFromBackend,
    renderGridHTML: renderGridHTML,
    pkgSkeletonHtml: pkgSkeletonHtml,
    mount: mount,
    mountAds: mountAds
  };

  function ensureGridStyles() {
    if (document.getElementById('rizq-pkg-grid-styles')) return;
    var s = document.createElement('style');
    s.id = 'rizq-pkg-grid-styles';
    s.textContent = ''
      + '@media(max-width:1200px){.rizq-pkg-grid-inner[data-cols="5"]{grid-template-columns:repeat(3,1fr)!important}}'
      + '@media(max-width:820px){.rizq-pkg-grid-inner[data-cols="5"]{grid-template-columns:repeat(2,1fr)!important}}'
      + '@media(max-width:520px){.rizq-pkg-grid-inner[data-cols="5"]{grid-template-columns:1fr!important}}';
    document.head.appendChild(s);
  }

  function autoMount() {
    ensureGridStyles();
    document.querySelectorAll('[data-rizq-pkg-catalog]').forEach(function (el) {
      var key = el.getAttribute('data-rizq-pkg-catalog');
      if (!key) return;
      var cols = Number(el.getAttribute('data-rizq-pkg-cols')) || 0;
      var ensureDiamond = el.getAttribute('data-rizq-pkg-diamond') === '1';
      mount(el.id || el, key, {
        columns: cols || undefined,
        ensureDiamond: ensureDiamond,
        registerHref: el.getAttribute('data-rizq-pkg-register') || undefined,
        pricingHref: el.getAttribute('data-rizq-pkg-pricing') || undefined
      });
    });
    document.querySelectorAll('[data-rizq-pkg-ads="1"]').forEach(function (el) {
      mountAds(el.id || el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
  document.addEventListener('rizq:langchange', function () {
    autoMount();
  });
})(typeof window !== 'undefined' ? window : globalThis);
