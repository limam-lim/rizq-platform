/**
 * بيانات واجهة البائع (غلاف + شعار) لبطاقات الثقة في تفاصيل الإعلان.
 * المصدر الوحيد للواجهات التجريبية — لا تُكتب داخل قوالب HTML مباشرة.
 */
(function (global) {
  'use strict';

  /** @type {Record<string, {cover?: string, logo?: string, accent?: string}>} */
  var BY_SELLER = {
    'وكالة السيارات الأولى': {
      cover: 'rizq-assets/demo-heroes/showroom-industrial.jpg',
      accent: '#1B3A6B'
    },
    'وكالة السيارات الفاخرة': {
      cover: 'rizq-assets/demo-heroes/showroom-appliances.jpg',
      accent: '#0f2347'
    },
    'أوتو موريتانيا': {
      cover: 'rizq-assets/demo-heroes/showroom-industrial.jpg',
      accent: '#234d8f'
    },
    'وكالة النجمة': {
      cover: 'rizq-assets/demo-heroes/store-boutique-promo.jpg',
      accent: '#1B3A6B'
    },
    'شركة المعدات الموريتانية': {
      cover: 'rizq-assets/demo-heroes/showroom-industrial.jpg',
      accent: '#162235'
    },
    'ورشة الذهب الموريتانية': {
      cover: 'rizq-assets/demo-heroes/store-boutique-promo.jpg',
      accent: '#7a4a00'
    },
    'الوطنية للعقار': {
      cover: 'rizq-assets/demo-heroes/office-law-interior.jpg',
      accent: '#1B3A6B'
    },
    'محمد ليمام | ADMINIA': {
      cover: 'rizq-assets/demo-heroes/office-lawyer-justice.jpg',
      accent: '#0D1B2A'
    }
  };

  /** غلاف افتراضي حسب القسم عند غياب اسم بائع معروف */
  var BY_CAT = {
    'سيارات': 'rizq-assets/demo-heroes/showroom-industrial.jpg',
    'شاحنات': 'rizq-assets/demo-heroes/showroom-industrial.jpg',
    'عقارات': 'rizq-assets/demo-heroes/office-law-interior.jpg',
    'إلكترونيات': 'rizq-assets/demo-heroes/showroom-appliances.jpg',
    'أزياء': 'rizq-assets/demo-fashion/demo-daraa-boutique-navy.jpg',
    'ذهب': 'rizq-assets/demo-heroes/store-boutique-promo.jpg',
    'خدمات': 'rizq-assets/demo-heroes/office-lawyer-justice.jpg'
  };

  function resolveSellerBrand(ad) {
    ad = ad || {};
    var name = String(ad.seller || ad.storeName || ad.accountName || '').trim();
    var known = (name && BY_SELLER[name]) || {};
    var cover =
      ad.sellerCover ||
      ad.sellerBanner ||
      known.cover ||
      (Array.isArray(ad.images) && ad.images[0]) ||
      BY_CAT[ad.cat] ||
      'rizq-assets/demo-heroes/store-boutique-promo.jpg';
    var logo = ad.sellerLogo || ad.sellerAvatar || known.logo || '';
    var accent = ad.sellerAccent || known.accent || '#1B3A6B';
    return {
      name: name,
      cover: cover,
      logo: logo,
      accent: accent
    };
  }

  global.RizqSellerBranding = {
    BY_SELLER: BY_SELLER,
    BY_CAT: BY_CAT,
    resolve: resolveSellerBrand
  };
})(typeof window !== 'undefined' ? window : globalThis);
