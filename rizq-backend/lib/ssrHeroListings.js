/**
 * حقن أول 4–6 بطاقات #hero-listings في HTML الخادم (LCP).
 * كل الحقول مُهرَّبة؛ الارتفاع يطابق هيكل الـ skeleton (140px media + جسم).
 */
'use strict';

const SSR_COUNT_MIN = 4;
const SSR_COUNT_MAX = 6;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** مسارات صور تجريبية مطابقة لـ RizqAdCards.seedDemoGalleries (بدون query). */
const DEMO_SEED = [
  {
    id: '211',
    emoji: '👔',
    bg: 'linear-gradient(135deg,#1B3A6B,#0f2347)',
    cat: '👗 أزياء — دراعة رجالية',
    catFr: '👗 Mode — Daraa homme',
    title: 'دراعة موريتانية فاخرة مطرزة — أزرق سماوي',
    titleFr: 'Daraa mauritanienne brodée — bleu ciel',
    price: '45,000 MRU',
    loc: '📍 نواكشوط — السوق الكبير',
    locFr: '📍 Nouakchott — Grand marché',
    image: 'rizq-assets/demo-fashion/demo-daraa-street-dark.webp',
  },
  {
    id: '216',
    emoji: '🧕',
    bg: 'linear-gradient(135deg,#6b2d4a,#3d1a2c)',
    cat: '👗 أزياء — ملحفة نسائية',
    catFr: '👗 Mode — Melhfa femme',
    title: 'ملحفة حريرية فاخرة — زمرد وذهب',
    titleFr: 'Melhfa soie de luxe — émeraude et or',
    price: '38,000 MRU',
    loc: '📍 نواكشوط — تفرغ زينة',
    locFr: '📍 Nouakchott — Tevragh Zeina',
    image: 'rizq-assets/demo-fashion/demo-melhafa-street-dark.webp',
  },
  {
    id: '231',
    emoji: '🧕',
    bg: 'linear-gradient(135deg,#7a3a1a,#3a1a10)',
    cat: '👗 أزياء — ملحفة نسائية',
    catFr: '👗 Mode — Melhfa femme',
    title: 'ملحفة نقش تقليدي — تراكوتا',
    titleFr: 'Melhfa motif traditionnel — terracotta',
    price: '42,000 MRU',
    loc: '📍 نواكشوط — محل الأقمشة',
    locFr: '📍 Nouakchott — boutique tissus',
    image: 'rizq-assets/demo-fashion/demo-melhafa-shop-warm.webp',
  },
  {
    id: '232',
    emoji: '👔',
    bg: 'linear-gradient(135deg,#0f2347,#1B3A6B)',
    cat: '👗 أزياء — دراعة رجالية',
    catFr: '👗 Mode — Daraa homme',
    title: 'دراعة كحلي مطرزة — محل رجالي',
    titleFr: 'Daraa marine brodée — boutique homme',
    price: '52,000 MRU',
    loc: '📍 نواكشوط — محل الدراعات',
    locFr: '📍 Nouakchott — boutique Daraa',
    image: 'rizq-assets/demo-fashion/demo-daraa-boutique-navy.webp',
  },
  {
    id: '201',
    emoji: '🏠',
    bg: 'linear-gradient(135deg,#1B3A6B,#0f2347)',
    cat: '🏠 منازل وعقارات',
    catFr: '🏠 Immobilier',
    title: 'شقة فاخرة 3 غرف — نواكشوط الغربية',
    titleFr: 'Appartement de luxe 3 pièces — Nouakchott Ouest',
    price: '150,000 MRU/شهر',
    priceFr: '150,000 MRU/mois',
    loc: '📍 نواكشوط الغربية',
    locFr: '📍 Nouakchott Ouest',
    image: 'rizq-assets/demo-estate/u-1560448204-e02f11c3d0e2.webp',
  },
  {
    id: '207',
    emoji: '🚗',
    bg: 'linear-gradient(135deg,#0e1d2e,#1d3a5e)',
    cat: '🚗 سيارات',
    catFr: '🚗 Autos',
    title: 'Toyota Land Cruiser 2020 — خليجي',
    titleFr: 'Toyota Land Cruiser 2020 — Import Golfe',
    price: '9,500,000 MRU',
    loc: '📍 نواكشوط',
    locFr: '📍 Nouakchott',
    image: 'rizq-assets/demo-cars/u-1533473359331-0135ef1b58bf.webp',
  },
];

function firstImage(ad) {
  if (!ad) return '';
  if (Array.isArray(ad.images) && ad.images[0]) return String(ad.images[0]).split('?')[0];
  if (ad.image) return String(ad.image).split('?')[0];
  if (ad.img) return String(ad.img).split('?')[0];
  return '';
}

function safeImageSrc(raw) {
  const s = String(raw || '').trim().split('?')[0];
  if (!s) return '';
  // مسارات نسبية آمنة فقط (لا javascript: / data:)
  if (s.charAt(0) === '/' && s.charAt(1) !== '/') {
    if (/javascript:|data:|vbscript:/i.test(s) || /[\s<>"']/.test(s)) return '';
    return s;
  }
  if (/^[a-z0-9][\w./-]*$/i.test(s)) {
    if (/javascript:|data:|vbscript:/i.test(s)) return '';
    return s;
  }
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.href;
  } catch (e) {
    return '';
  }
}

function normalizeLiveAd(ad, lang) {
  const fr = lang === 'fr';
  const title = fr
    ? String(ad.titleFr || ad.titleFR || ad.title || '').trim()
    : String(ad.title || '').trim();
  if (!title || title === '(بدون عنوان)' || title === '(Sans titre)') return null;
  const img = safeImageSrc(firstImage(ad));
  const cat = fr
    ? String(ad.catFr || ad.categoryFr || ad.cat || ad.category || '').trim()
    : String(ad.cat || ad.category || '').trim();
  const loc = fr
    ? String(ad.locFr || ad.wilayaFr || ad.loc || ad.wilaya || '').trim()
    : String(ad.loc || ad.wilaya || '').trim();
  const price = fr
    ? String(ad.priceFr || ad.priceFR || ad.price || '').trim()
    : String(ad.price || '').trim();
  return {
    id: String(ad.id),
    emoji: String(ad.emoji || '📦').slice(0, 8),
    bg: String(ad.bg || 'linear-gradient(145deg,#111d2e,#1B3A6B)').slice(0, 120),
    cat: cat.slice(0, 80),
    title: title.slice(0, 120),
    price: price.slice(0, 40),
    loc: loc.slice(0, 80),
    image: img,
  };
}

function demoCards(lang) {
  const fr = lang === 'fr';
  return DEMO_SEED.map((d) => ({
    id: d.id,
    emoji: d.emoji,
    bg: d.bg,
    cat: fr ? d.catFr : d.cat,
    title: fr ? d.titleFr : d.title,
    price: fr && d.priceFr ? d.priceFr : d.price,
    loc: fr ? d.locFr : d.loc,
    image: d.image,
  }));
}

/**
 * يجلب مرشّحي الحقن: إعلانات حية بصورة أولاً، وإلا بذرة DEMO.
 */
async function pickHeroAds(opts) {
  const lang = opts && opts.lang === 'fr' ? 'fr' : 'ar';
  const count = Math.max(
    SSR_COUNT_MIN,
    Math.min(SSR_COUNT_MAX, Number(opts && opts.count) || SSR_COUNT_MAX)
  );
  let live = [];
  try {
    const platformStore = require('../db/platformStore');
    const { filterListableAccountIds } = require('../services/packageFreeze');
    const { ads: slice } = await platformStore.queryPublicAds({
      limit: 40,
      offset: 0,
    });
    const listable = await filterListableAccountIds((slice || []).map((a) => a && a.accountId));
    const filtered = (slice || []).filter((ad) => {
      if (!ad) return false;
      if (!ad.accountId) return true;
      return listable.has(String(ad.accountId).split('::')[0]);
    });
    live = filtered
      .map((a) => normalizeLiveAd(a, lang))
      .filter((a) => a && a.image);
  } catch (eLive) {
    live = [];
  }
  const pool = live.length >= SSR_COUNT_MIN ? live : demoCards(lang);
  return pool.slice(0, count);
}

function renderCardHtml(card, idx) {
  const eager = idx === 0;
  const img = safeImageSrc(card.image);
  const mediaInner = img
    ? ('<img class="rzq-ssr-hero-img" src="' + esc(img) + '" alt="' + esc(card.title) + '"'
      + ' width="200" height="140" decoding="async"'
      + (eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"')
      + ' style="display:block;width:100%;height:140px;object-fit:cover;border-radius:16px 16px 0 0">')
    : ('<div class="rzq-ssr-hero-fallback" style="height:140px;border-radius:16px 16px 0 0;display:flex;align-items:center;justify-content:center;background:'
      + esc(card.bg) + '"><span aria-hidden="true">' + esc(card.emoji) + '</span></div>');

  return (
    '<div class="ad-card" data-rizq-ssr-hero="1" data-ad-id="' + esc(card.id) + '"'
    + ' style="min-width:200px;width:200px;flex:0 0 auto">'
    + '<div class="ad-card-img rzq-adx-media" style="height:140px;overflow:hidden;border-radius:16px 16px 0 0">'
    + mediaInner
    + '</div>'
    + '<div class="ad-card-body" style="padding:12px;display:flex;flex-direction:column;gap:8px;box-sizing:border-box">'
    + '<div class="ad-cat" style="margin:0;min-height:1em;line-height:1.2;font-size:11px">' + esc(card.cat) + '</div>'
    + '<div class="ad-title" style="margin:0;min-height:1.2em;line-height:1.3;font-size:13px">' + esc(card.title) + '</div>'
    + (card.price
      ? '<div class="ad-price" style="margin:0;font-size:10px;padding:2px 6px">' + esc(card.price) + '</div>'
      : '<div class="ad-loc" style="margin:0;min-height:1em;font-size:11px">' + esc(card.loc) + '</div>')
    + '</div></div>'
  );
}

function renderTrackHtml(cards) {
  return cards.map(renderCardHtml).join('');
}

function preloadHint(cards) {
  const first = cards && cards[0] && safeImageSrc(cards[0].image);
  if (!first) return '';
  return '<link rel="preload" as="image" href="' + esc(first) + '" fetchpriority="high">';
}

/**
 * يستبدل هيكل #cards-track داخل HTML الصفحة الرئيسية.
 * إن فشل الجلب يُبقي الهيكل كما هو.
 */
async function injectHeroListingsHtml(html, opts) {
  const src = String(html || '');
  if (!/id=["']cards-track["']/.test(src)) return src;
  let cards;
  try {
    cards = await pickHeroAds(opts || {});
  } catch (ePick) {
    return src;
  }
  if (!cards || cards.length < SSR_COUNT_MIN) return src;

  const inner = renderTrackHtml(cards);
  const lang = (opts && opts.lang === 'fr') ? 'fr' : 'ar';
  const marked = src.replace(
    /(<div\b[^>]*\bid=["']cards-track["'][^>]*)(>)/i,
    function (_m, open, gt) {
      let o = open;
      if (!/\bdata-rizq-ssr-seeded=/.test(o)) {
        o += ' data-rizq-ssr-seeded="' + cards.length + '"';
      }
      if (!/\bdata-rizq-ssr-lang=/.test(o)) {
        o += ' data-rizq-ssr-lang="' + lang + '"';
      }
      return o + gt;
    }
  );

  const out = replaceCardsTrackInner(marked, inner);
  if (out === marked) return src;

  const hint = preloadHint(cards);
  if (!hint) return out;
  if (/rel=["']preload["'][^>]*as=["']image["']/.test(out)) return out;
  return out.replace(/<\/head>/i, hint + '\n</head>');
}

function replaceCardsTrackInner(html, inner) {
  const re = /<div\b([^>]*\bid=["']cards-track["'][^>]*)>/i;
  const m = re.exec(html);
  if (!m) return html;
  const startOpen = m.index;
  const afterOpen = m.index + m[0].length;
  // ابحث إغلاق div المطابق
  let i = afterOpen;
  let depth = 1;
  const s = html;
  while (i < s.length && depth > 0) {
    const nextOpen = s.indexOf('<div', i);
    const nextClose = s.indexOf('</div>', i);
    if (nextClose < 0) return html;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      if (depth === 0) {
        return s.slice(0, afterOpen) + inner + s.slice(nextClose);
      }
      i = nextClose + 6;
    }
  }
  return html;
}

module.exports = {
  esc,
  pickHeroAds,
  renderTrackHtml,
  injectHeroListingsHtml,
  replaceCardsTrackInner,
  DEMO_SEED,
  SSR_COUNT_MIN,
  SSR_COUNT_MAX,
};
