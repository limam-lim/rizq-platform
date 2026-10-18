/**
 * Rizq Estate — بيانات عروض الوكالة (تجريبية فاخرة)
 * وسائط مصنّفة + مواصفات ديناميكية حسب نوع العقار.
 */
(function (global) {
  'use strict';

  var U = {
    villaExt: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80',
    villaNight: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
    living: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=80',
    kitchen: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=80',
    kitchen2: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=1400&q=80',
    bath: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1400&q=80',
    bath2: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1400&q=80',
    bedroom: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80',
    bedroom2: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1400&q=80',
    terrace: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=80',
    apt: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80',
    apt2: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=80',
    house: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=80',
    penthouse: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80',
    land: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80',
    shop: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80',
    garage: 'https://images.unsplash.com/photo-1486006920555-c31d558a1733?auto=format&fit=crop&w=1400&q=80'
  };

  var LISTINGS = [
    {
      id: 'e1', cat: 'villa', deal: 'sale', featured: true,
      title: 'فيلا راقية تمليك — نواكشوط الغربية',
      loc: 'نواكشوط الغربية', street: 'حي الدبلوماسيين — قرب الشارع الرئيسي',
      price: '4.8M MRU', badge: 'للبيع',
      beds: 5, living: 2, baths: 4, area: 420, builtArea: 360,
      furnish: 'مفروش جزئياً', parking: 2,
      features: ['مسبح', 'حديقة', 'مكيفات', 'مطبخ مجهز', 'حراسة/أمن', 'كراج مغطى'],
      desc: 'فيلا فاخرة بحديقة ومسبح وإطلالة واسعة — تشطيب حديث، وثائق تمليك جاهزة، ومساحات معيشة رحبة للعائلة.',
      media: {
        cover: U.villaExt,
        kitchen: [U.kitchen, U.kitchen2],
        baths: [U.bath, U.bath2],
        rooms: [U.living, U.bedroom, U.bedroom2],
        exterior: [U.villaNight, U.terrace, U.garage]
      },
      map: { lat: 18.0855, lon: -15.9850, nearby: ['مدرسة دولية', 'مسجد الحي', 'شارع الوكالة الرئيسي'] }
    },
    {
      id: 'e2', cat: 'apartment', deal: 'sale',
      title: 'شقة فاخرة تمليك — تفرغ زينة',
      loc: 'تفرغ زينة', street: 'قرب دوار تفرغ زينة',
      price: '2.6M MRU', badge: 'للبيع',
      beds: 3, living: 1, baths: 2, area: 145, builtArea: 145,
      furnish: 'مفروش جزئياً', parking: 1,
      features: ['مكيفات', 'مطبخ مجهز', 'مصعد', 'خزانات مدمجة'],
      desc: 'شقة 3 غرف في موقع هادئ قريب من الخدمات — وثائق تمليك جاهزة وإضاءة طبيعية ممتازة.',
      media: {
        cover: U.apt,
        kitchen: [U.kitchen],
        baths: [U.bath],
        rooms: [U.apt2, U.bedroom, U.living],
        exterior: [U.terrace]
      },
      map: { lat: 18.1105, lon: -15.9990, nearby: ['سوق الحي', 'مسجد', 'عيادة'] }
    },
    {
      id: 'e3', cat: 'apartment', deal: 'sale',
      title: 'شقة تمليك بإطلالة مدينة — لكصر',
      loc: 'لكصر', street: 'شارع لكصر المركزي',
      price: '2.1M MRU', badge: 'للبيع',
      beds: 2, living: 1, baths: 2, area: 110, builtArea: 110,
      furnish: 'غير مفروش', parking: 1,
      features: ['مكيفات', 'مصعد', 'مطبخ مجهز'],
      desc: 'شقة جاهزة للسكن مع إطلالة مدينة — مناسبة للعائلات الصغيرة أو الاستثمار.',
      media: {
        cover: U.apt2,
        kitchen: [U.kitchen2],
        baths: [U.bath2],
        rooms: [U.bedroom, U.living],
        exterior: [U.terrace]
      },
      map: { lat: 18.0861, lon: -15.9785, nearby: ['سوق لكصر', 'مدرسة', 'مسجد'] }
    },
    {
      id: 'e4', cat: 'land', deal: 'sale',
      title: 'أرض سكنية 600 م² — القطب',
      loc: 'القطب', street: 'قطعة واضحة المعالم — القطب',
      price: '2.2M MRU', badge: 'أرض',
      beds: null, living: null, baths: null, area: 600, builtArea: null,
      furnish: null, parking: null,
      land: { frontage: 20, zoning: 'سكني', deed: 'سند ملكية معتمد / Titre Foncier' },
      features: ['سند ملكية معتمد', 'واجهة على الشارع', 'جاهزة للبناء'],
      desc: 'قطعة أرض سكنية بموقع واضح ووثائق مستوفاة — واجهة 20 م على الشارع، جاهزة للبناء فوراً.',
      media: {
        cover: U.land,
        kitchen: [], baths: [], rooms: [],
        exterior: [U.land, U.villaExt]
      },
      map: { lat: 18.0400, lon: -15.9800, nearby: ['شارع القطب', 'مسجد الحي'] }
    },
    {
      id: 'e5', cat: 'villa', deal: 'sale',
      title: 'منزل عائلي بحديقة — لكصر',
      loc: 'لكصر', street: 'حي العائلات — لكصر',
      price: '3.4M MRU', badge: 'للبيع',
      beds: 4, living: 2, baths: 3, area: 280, builtArea: 240,
      furnish: 'غير مفروش', parking: 1,
      features: ['حديقة', 'مكيفات', 'مطبخ مجهز', 'حراسة/أمن'],
      desc: 'منزل عائلي بحديقة خاصة ومساحات معيشة واسعة — مثالي للعائلات الكبيرة.',
      media: {
        cover: U.house,
        kitchen: [U.kitchen],
        baths: [U.bath],
        rooms: [U.living, U.bedroom, U.bedroom2],
        exterior: [U.house, U.garage]
      },
      map: { lat: 18.0861, lon: -15.9785, nearby: ['مدرسة', 'مسجد', 'سوق'] }
    },
    {
      id: 'e6', cat: 'shop', deal: 'rent',
      title: 'محل تجاري على شارع رئيسي — سوق العاصمة',
      loc: 'سوق العاصمة', street: 'الواجهة على الشارع الرئيسي',
      price: '85K / شهر', badge: 'للكراء',
      beds: null, living: null, baths: 1, area: 75, builtArea: 75,
      furnish: null, parking: 0,
      features: ['واجهة زجاجية', 'حركة عالية', 'مكيفات'],
      desc: 'محل على شارع رئيسي بحركة يومية عالية — مناسب للتجارة والخدمات.',
      media: {
        cover: U.shop,
        kitchen: [], baths: [U.bath2], rooms: [],
        exterior: [U.shop]
      },
      map: { lat: 18.0850, lon: -15.9700, nearby: ['سوق العاصمة', 'مواقف عامة'] }
    },
    {
      id: 'e7', cat: 'apartment', deal: 'sale',
      title: 'بنتهاوس تمليك — القطب',
      loc: 'القطب', street: 'طابق علوي — إطلالة غروب',
      price: '6.5M MRU', badge: 'للبيع',
      beds: 4, living: 2, baths: 3, area: 260, builtArea: 260,
      furnish: 'مفروش بالكامل', parking: 2,
      features: ['تراس واسع', 'مكيفات', 'مطبخ مجهز', 'مصعد', 'حراسة/أمن', 'خزانات مدمجة'],
      desc: 'بنتهاوس بإطلالة غروب وتراس واسع — تشطيب راقٍ ومفروش بالكامل.',
      media: {
        cover: U.penthouse,
        kitchen: [U.kitchen, U.kitchen2],
        baths: [U.bath, U.bath2],
        rooms: [U.living, U.bedroom, U.bedroom2],
        exterior: [U.terrace, U.penthouse]
      },
      map: { lat: 18.0400, lon: -15.9800, nearby: ['الشارع الرئيسي', 'مسجد'] }
    },
    {
      id: 'e8', cat: 'villa', deal: 'rent',
      title: 'فيلا مفروشة للكراء — تفرغ زينة',
      loc: 'تفرغ زينة', street: 'حي راقٍ — تفرغ زينة',
      price: '280K / شهر', badge: 'للكراء',
      beds: 5, living: 2, baths: 4, area: 380, builtArea: 320,
      furnish: 'مفروش بالكامل', parking: 2,
      features: ['مسبح', 'حديقة', 'مكيفات', 'مطبخ مجهز', 'حراسة/أمن', 'كراج مغطى'],
      desc: 'فيلا مفروشة في حي راقٍ — مناسبة للعائلات والإقامات الطويلة مع حديقة ومسبح.',
      media: {
        cover: U.villaNight,
        kitchen: [U.kitchen2],
        baths: [U.bath, U.bath2],
        rooms: [U.living, U.bedroom, U.bedroom2],
        exterior: [U.villaExt, U.terrace, U.garage]
      },
      map: { lat: 18.1105, lon: -15.9990, nearby: ['سفارات', 'مدارس', 'مسجد'] }
    }
  ];

  function allMedia(item) {
    var m = item.media || {};
    var out = [];
    if (m.cover) out.push({ src: m.cover, cat: 'cover', label: 'الرئيسية' });
    (m.rooms || []).forEach(function (s) { out.push({ src: s, cat: 'rooms', label: 'المجلس والغرف' }); });
    (m.kitchen || []).forEach(function (s) { out.push({ src: s, cat: 'kitchen', label: 'المطبخ' }); });
    (m.baths || []).forEach(function (s) { out.push({ src: s, cat: 'baths', label: 'الحمامات' }); });
    (m.exterior || []).forEach(function (s) { out.push({ src: s, cat: 'exterior', label: 'المحيط والكراج' }); });
    if (!out.length && item.img) out.push({ src: item.img, cat: 'cover', label: 'الرئيسية' });
    return out;
  }

  function cardImgs(item) {
    return allMedia(item).map(function (x) { return x.src; });
  }

  function coverOf(item) {
    return (item.media && item.media.cover) || item.img || (cardImgs(item)[0] || '');
  }

  global.RizqEstateData = {
    LISTINGS: LISTINGS,
    allMedia: allMedia,
    cardImgs: cardImgs,
    coverOf: coverOf,
    MEDIA_TABS: [
      { id: 'all', ar: 'الكل', fr: 'Tout' },
      { id: 'kitchen', ar: 'المطبخ', fr: 'Cuisine' },
      { id: 'baths', ar: 'الحمامات', fr: 'Salles de bain' },
      { id: 'rooms', ar: 'المجلس والغرف', fr: 'Salons & chambres' },
      { id: 'exterior', ar: 'المحيط والكراج', fr: 'Extérieur' }
    ],
    FURNISH: ['مفروش بالكامل', 'مفروش جزئياً', 'غير مفروش'],
    RES_FEATURES: ['مكيفات', 'مسبح', 'حديقة', 'مطبخ مجهز', 'مصعد', 'حراسة/أمن', 'خزانات مدمجة', 'كراج مغطى'],
    LAND_FEATURES: ['سند ملكية معتمد', 'واجهة على الشارع', 'جاهزة للبناء', 'زاوية']
  };
})(typeof window !== 'undefined' ? window : this);
