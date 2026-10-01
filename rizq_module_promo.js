/**
 * rizq_module_promo.js — inject branded promo header (video + banners)
 * under entity heroes on store / showroom / office / tenders / investments pages.
 */
(function () {
  'use strict';

  var PAGE_MAP = {
    'rizq_store.html': 'store',
    'rizq_showroom.html': 'showroom',
    'rizq_office.html': 'office',
    'rizq_tenders.html': 'tenders',
    'rizq_investments.html': 'investments'
  };

  var MODULES = {
    store: {
      hero: '.store-hero',
      eyebrow: '✨ RIZQ STORES',
      titleAr: 'واجهة المحلات',
      titleFr: 'Interface Boutiques',
      tagAr: 'ترويج رزق للمحلات والبضائع — عروض وخدمات ترويجية',
      tagFr: 'Promo Rizq pour boutiques et marchandises',
      ctaAr: '📢 احجز ترويجك',
      ctaFr: '📢 Réserver une promo',
      ctaHref: 'rizq_ads_info.html',
      video: 'rizq-assets/promo/rizq-public-interfaces-promo-light.mp4',
      banners: [
        { ico: '🛒', tAr: 'بضائع ترويجية', tFr: 'Marchandises promo', dAr: 'عينات منتجات للمحلات', dFr: 'Échantillons produits', href: 'rizq_store.html?id=acc_promo_store_rizq' },
        { ico: '🚚', tAr: 'خدمات التوصيل', tFr: 'Livraison', dAr: 'توصيل واستلام ترويجي', dFr: 'Livraison & retrait', href: 'rizq_store.html?id=acc_promo_store_rizq' },
        { ico: '⭐', tAr: 'عروض مميزة', tFr: 'Offres vedettes', dAr: 'بانرات ذهبية للبضاعة', dFr: 'Bannières produits', href: 'rizq_ads_info.html' },
        { ico: '🏪', tAr: 'انضم كمحل', tFr: 'Devenir boutique', dAr: 'افتح واجهتك على رزق', dFr: 'Ouvrez votre vitrine', href: 'rizq_landing_v8.html#pricing' }
      ]
    },
    showroom: {
      hero: '.showroom-hero',
      eyebrow: '✨ RIZQ SHOWROOMS',
      titleAr: 'واجهة المعارض',
      titleFr: 'Interface Showrooms',
      tagAr: 'ترويج رزق للمعارض والمجموعات — بيانات ترويجية',
      tagFr: 'Promo Rizq pour showrooms et collections',
      ctaAr: '📢 روّج لمعرضك',
      ctaFr: '📢 Promouvoir le showroom',
      ctaHref: 'rizq_ads_info.html',
      video: 'rizq-assets/promo/rizq-public-interfaces-promo-light.mp4',
      banners: [
        { ico: '🏬', tAr: 'مجموعات ترويجية', tFr: 'Collections promo', dAr: 'عروض واجهة المعرض', dFr: 'Vitrine showroom', href: 'rizq_showroom.html?id=acc_promo_corp_rizq' },
        { ico: '🛋️', tAr: 'قطع مميزة', tFr: 'Pièces vedettes', dAr: 'بانرات للمنتجات المعروضة', dFr: 'Bannières exposées', href: 'rizq_showroom.html?id=acc_promo_corp_rizq' },
        { ico: '🎬', tAr: 'فيديو ترويجي', tFr: 'Vidéo promo', dAr: 'موضع Rizq ADS للمعارض', dFr: 'Slot Rizq ADS', href: 'rizq_ads_info.html' },
        { ico: '✨', tAr: 'انضم كمعرض', tFr: 'Devenir showroom', dAr: 'واجهة ذهبية لمعرضك', dFr: 'Vitrine premium', href: 'rizq_landing_v8.html#pricing' }
      ]
    },
    office: {
      hero: '.office-hero',
      eyebrow: '✨ RIZQ OFFICES',
      titleAr: 'واجهة المكاتب',
      titleFr: 'Interface Bureaux',
      tagAr: 'ترويج رزق للمكاتب والخدمات المهنية',
      tagFr: 'Promo Rizq pour bureaux et services',
      ctaAr: '📢 روّج لخدماتك',
      ctaFr: '📢 Promouvoir vos services',
      ctaHref: 'rizq_ads_info.html',
      video: 'rizq-assets/promo/rizq-public-interfaces-promo-light.mp4',
      banners: [
        { ico: '🏢', tAr: 'خدمات مكتبية', tFr: 'Services bureau', dAr: 'عروض ترويجية للخدمات', dFr: 'Services en promo', href: 'rizq_office.html?id=acc_promo_office_rizq' },
        { ico: '📋', tAr: 'استشارات', tFr: 'Conseil', dAr: 'بانرات للخدمات المهنية', dFr: 'Bannières services', href: 'rizq_office.html?id=acc_promo_office_rizq' },
        { ico: '🤝', tAr: 'شراكات', tFr: 'Partenariats', dAr: 'ترويج للشركات والمكاتب', dFr: 'Promo entreprises', href: 'rizq_ads_info.html' },
        { ico: '💼', tAr: 'انضم كمكتب', tFr: 'Devenir bureau', dAr: 'افتح مكتبك على رزق', dFr: 'Ouvrez votre bureau', href: 'rizq_landing_v8.html#pricing' }
      ]
    },
    tenders: {
      hero: '.tender-hero',
      eyebrow: '✨ RIZQ TENDERS',
      titleAr: 'واجهة المناقصات',
      titleFr: 'Interface Appels d’offres',
      tagAr: 'ترويج رزق لغرفة المناقصات والعروض',
      tagFr: 'Promo Rizq pour les appels d’offres',
      ctaAr: '📢 انشر مناقصة',
      ctaFr: '📢 Publier un AO',
      ctaHref: 'rizq_tenders.html#submit',
      video: 'rizq-assets/promo/rizq-modules-promo-demo-light.mp4',
      banners: [
        { ico: '📑', tAr: 'مناقصات ترويجية', tFr: 'AO promo', dAr: 'عينات عروض للغرفة', dFr: 'Exemples d’AO', href: 'rizq_tenders.html' },
        { ico: '🏛️', tAr: 'للجهات', tFr: 'Pour institutions', dAr: 'ترويج مناقصات رسمية', dFr: 'AO institutionnels', href: 'rizq_tenders.html#submit' },
        { ico: '🛠️', tAr: 'للمقاولين', tFr: 'Pour entrepreneurs', dAr: 'بانرات فرص العمل', dFr: 'Opportunités', href: 'rizq_tenders.html' },
        { ico: '📣', tAr: 'إعلان رزق', tFr: 'Pub Rizq', dAr: 'وسّع وصول مناقصتك', dFr: 'Élargissez la portée', href: 'rizq_ads_info.html' }
      ]
    },
    investments: {
      hero: '.inv-hero',
      eyebrow: '✨ RIZQ INVESTMENTS',
      titleAr: 'واجهة الاستثمارات',
      titleFr: 'Interface Investissements',
      tagAr: 'ترويج رزق لفرص الاستثمار والشراكات',
      tagFr: 'Promo Rizq pour opportunités d’investissement',
      ctaAr: '📢 اعرض فرصة',
      ctaFr: '📢 Publier une opportunité',
      ctaHref: 'rizq_investments.html#submit',
      video: 'rizq-assets/promo/rizq-modules-promo-demo-light.mp4',
      banners: [
        { ico: '📈', tAr: 'فرص ترويجية', tFr: 'Opportunités promo', dAr: 'عينات استثمار على رزق', dFr: 'Exemples d’invest.', href: 'rizq_investments.html' },
        { ico: '💎', tAr: 'شراكات', tFr: 'Partenariats', dAr: 'بانرات للمستثمرين', dFr: 'Bannières investisseurs', href: 'rizq_investments.html#submit' },
        { ico: '🧭', tAr: 'وكيل الاستثمار', tFr: 'Agent investissement', dAr: 'إرشاد ترويجي للفرص', dFr: 'Conseil opportunité', href: 'rizq_investments.html' },
        { ico: '🎬', tAr: 'ترويج رزق', tFr: 'Promo Rizq', dAr: 'وسّع ظهور فرصتك', dFr: 'Plus de visibilité', href: 'rizq_ads_info.html' }
      ]
    }
  };

  function pageFile() {
    var path = (location.pathname || '').split('/').pop() || '';
    return path.toLowerCase();
  }

  function isFr() {
    return (document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0
      || document.documentElement.getAttribute('dir') === 'ltr';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildHtml(mod) {
    var fr = isFr();
    var title = fr ? mod.titleFr : mod.titleAr;
    var tag = fr ? mod.tagFr : mod.tagAr;
    var cta = fr ? mod.ctaFr : mod.ctaAr;
    var disc = fr
      ? 'Données promotionnelles uniquement — pas des données réelles'
      : 'بيانات ترويجية فقط — ليست بيانات حقيقية';
    var note = fr ? 'Vidéo promo Rizq · interfaces publiques' : 'فيديو ترويجي لرزق · الواجهات العامة';
    var cards = mod.banners.map(function (b) {
      return ''
        + '<a class="rizq-mod-promo-card" href="' + esc(b.href) + '">'
        +   '<span class="rizq-mod-promo-card-ico" aria-hidden="true">' + b.ico + '</span>'
        +   '<strong>' + esc(fr ? b.tFr : b.tAr) + '</strong>'
        +   '<span>' + esc(fr ? b.dFr : b.dAr) + '</span>'
        + '</a>';
    }).join('');

    return ''
      + '<section class="rizq-mod-promo" id="rizq-mod-promo" data-rizq-module-promo="' + esc(mod.key || '') + '" aria-label="' + esc(title) + '">'
      +   '<div class="rizq-mod-promo-inner">'
      +     '<div class="rizq-mod-promo-head">'
      +       '<div>'
      +         '<span class="rizq-mod-promo-eyebrow">' + esc(mod.eyebrow) + '</span>'
      +         '<h2 class="rizq-mod-promo-title">' + esc(title) + '</h2>'
      +         '<p class="rizq-mod-promo-tag">' + esc(tag) + '</p>'
      +       '</div>'
      +       '<a class="rizq-mod-promo-cta" href="' + esc(mod.ctaHref) + '">' + esc(cta) + '</a>'
      +     '</div>'
      +     '<div class="rizq-mod-promo-vid">'
      +       '<span class="rizq-mod-promo-vid-badge"><span class="dot" aria-hidden="true"></span>LIVE · RIZQ PROMO</span>'
      +       '<video class="rizq-mod-promo-player" autoplay muted loop playsinline preload="metadata" poster="">'
      +         '<source src="' + esc(mod.video) + '" type="video/mp4"/>'
      +       '</video>'
      +       '<div class="rizq-mod-promo-vid-note">'
      +         '<span>' + esc(note) + '</span>'
      +         '<a href="rizq_ads_info.html">' + (fr ? 'Rizq ADS →' : 'إعلانات رزق ←') + '</a>'
      +       '</div>'
      +     '</div>'
      +     '<div class="rizq-mod-promo-banners">' + cards + '</div>'
      +     '<p class="rizq-mod-promo-disc">' + esc(disc) + '</p>'
      +   '</div>'
      + '</section>';
  }

  function inject() {
    if (document.getElementById('rizq-mod-promo')) return;
    var key = PAGE_MAP[pageFile()];
    if (!key || !MODULES[key]) return;
    var mod = MODULES[key];
    mod.key = key;
    var hero = document.querySelector(mod.hero);
    if (!hero || !hero.parentNode) return;

    var wrap = document.createElement('div');
    wrap.innerHTML = buildHtml(mod);
    var node = wrap.firstChild;
    if (hero.nextSibling) hero.parentNode.insertBefore(node, hero.nextSibling);
    else hero.parentNode.appendChild(node);

    var vid = node.querySelector('.rizq-mod-promo-player');
    if (vid) {
      var play = function () {
        var p = vid.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      };
      if (vid.readyState >= 2) play();
      else vid.addEventListener('loadeddata', play, { once: true });
    }
  }

  function boot() {
    inject();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.RizqModulePromo = { refresh: inject };
})();
