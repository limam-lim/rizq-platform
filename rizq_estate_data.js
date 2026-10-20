/**
 * Rizq Estate — بيانات عروض الوكالة (تجريبية فاخرة)
 * وسائط مصنّفة + مواصفات ديناميكية حسب نوع العقار.
 * كل نص معروض للمستخدم له زوج عربي/فرنسي لتفادي التسرب عند rizq_lang=fr.
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

  var LABEL = {
    cover: { ar: 'الرئيسية', fr: 'Principale' },
    rooms: { ar: 'المجلس والغرف', fr: 'Salons & chambres' },
    kitchen: { ar: 'المطبخ', fr: 'Cuisine' },
    baths: { ar: 'الحمامات', fr: 'Salles de bain' },
    exterior: { ar: 'المحيط والكراج', fr: 'Extérieur' }
  };

  var LISTINGS = [
    {
      id: 'e1', cat: 'villa', deal: 'sale', featured: true,
      title: 'فيلا راقية تمليك — نواكشوط الغربية',
      titleFr: 'Villa haut de gamme — Nouakchott Ouest',
      loc: 'نواكشوط الغربية', locFr: 'Nouakchott Ouest',
      street: 'حي الدبلوماسيين — قرب الشارع الرئيسي',
      streetFr: 'Quartier des diplomates — près de l’avenue principale',
      price: '4.8M MRU', badge: 'للبيع', badgeFr: 'À vendre',
      beds: 5, living: 2, baths: 4, area: 420, builtArea: 360,
      furnish: 'مفروش جزئياً', furnishFr: 'Partiellement meublé', parking: 2,
      features: ['مسبح', 'حديقة', 'مكيفات', 'مطبخ مجهز', 'حراسة/أمن', 'كراج مغطى'],
      featuresFr: ['Piscine', 'Jardin', 'Climatisation', 'Cuisine équipée', 'Sécurité', 'Garage couvert'],
      desc: 'فيلا فاخرة بحديقة ومسبح وإطلالة واسعة — تشطيب حديث، وثائق تمليك جاهزة، ومساحات معيشة رحبة للعائلة.',
      descFr: 'Villa luxueuse avec jardin, piscine et vue dégagée — finition moderne, titre foncier prêt, grands espaces de vie.',
      media: {
        cover: U.villaExt,
        kitchen: [U.kitchen, U.kitchen2],
        baths: [U.bath, U.bath2],
        rooms: [U.living, U.bedroom, U.bedroom2],
        exterior: [U.villaNight, U.terrace, U.garage]
      },
      map: {
        lat: 18.0855, lon: -15.9850,
        nearby: ['مدرسة دولية', 'مسجد الحي', 'شارع الوكالة الرئيسي'],
        nearbyFr: ['École internationale', 'Mosquée du quartier', 'Avenue principale de l’agence']
      }
    },
    {
      id: 'e2', cat: 'apartment', deal: 'sale',
      title: 'شقة فاخرة تمليك — تفرغ زينة',
      titleFr: 'Appartement de luxe — Tevragh Zeina',
      loc: 'تفرغ زينة', locFr: 'Tevragh Zeina',
      street: 'قرب دوار تفرغ زينة',
      streetFr: 'Près du rond-point de Tevragh Zeina',
      price: '2.6M MRU', badge: 'للبيع', badgeFr: 'À vendre',
      beds: 3, living: 1, baths: 2, area: 145, builtArea: 145,
      furnish: 'مفروش جزئياً', furnishFr: 'Partiellement meublé', parking: 1,
      features: ['مكيفات', 'مطبخ مجهز', 'مصعد', 'خزانات مدمجة'],
      featuresFr: ['Climatisation', 'Cuisine équipée', 'Ascenseur', 'Placards intégrés'],
      desc: 'شقة 3 غرف في موقع هادئ قريب من الخدمات — وثائق تمليك جاهزة وإضاءة طبيعية ممتازة.',
      descFr: 'Appartement 3 chambres dans un quartier calme, proche des services — titre prêt et belle lumière naturelle.',
      media: {
        cover: U.apt,
        kitchen: [U.kitchen],
        baths: [U.bath],
        rooms: [U.apt2, U.bedroom, U.living],
        exterior: [U.terrace]
      },
      map: {
        lat: 18.1105, lon: -15.9990,
        nearby: ['سوق الحي', 'مسجد', 'عيادة'],
        nearbyFr: ['Marché du quartier', 'Mosquée', 'Clinique']
      }
    },
    {
      id: 'e3', cat: 'apartment', deal: 'sale',
      title: 'شقة تمليك بإطلالة مدينة — لكصر',
      titleFr: 'Appartement avec vue ville — Ksar',
      loc: 'لكصر', locFr: 'Ksar',
      street: 'شارع لكصر المركزي',
      streetFr: 'Avenue centrale du Ksar',
      price: '2.1M MRU', badge: 'للبيع', badgeFr: 'À vendre',
      beds: 2, living: 1, baths: 2, area: 110, builtArea: 110,
      furnish: 'غير مفروش', furnishFr: 'Non meublé', parking: 1,
      features: ['مكيفات', 'مصعد', 'مطبخ مجهز'],
      featuresFr: ['Climatisation', 'Ascenseur', 'Cuisine équipée'],
      desc: 'شقة جاهزة للسكن مع إطلالة مدينة — مناسبة للعائلات الصغيرة أو الاستثمار.',
      descFr: 'Appartement prêt à habiter avec vue sur la ville — idéal familles ou investissement.',
      media: {
        cover: U.apt2,
        kitchen: [U.kitchen2],
        baths: [U.bath2],
        rooms: [U.bedroom, U.living],
        exterior: [U.terrace]
      },
      map: {
        lat: 18.0861, lon: -15.9785,
        nearby: ['سوق لكصر', 'مدرسة', 'مسجد'],
        nearbyFr: ['Marché du Ksar', 'École', 'Mosquée']
      }
    },
    {
      id: 'e4', cat: 'land', deal: 'sale',
      title: 'أرض سكنية 600 م² — القطب',
      titleFr: 'Terrain résidentiel 600 m² — Al Qutb',
      loc: 'القطب', locFr: 'Al Qutb',
      street: 'قطعة واضحة المعالم — القطب',
      streetFr: 'Parcelle bornée — Al Qutb',
      price: '2.2M MRU', badge: 'أرض', badgeFr: 'Terrain',
      beds: null, living: null, baths: null, area: 600, builtArea: null,
      furnish: null, parking: null,
      land: { frontage: 20, zoning: 'سكني', zoningFr: 'Résidentiel', deed: 'سند ملكية معتمد / Titre Foncier' },
      features: ['سند ملكية معتمد', 'واجهة على الشارع', 'جاهزة للبناء'],
      featuresFr: ['Titre foncier certifié', 'Façade sur rue', 'Prêt à construire'],
      desc: 'قطعة أرض سكنية بموقع واضح ووثائق مستوفاة — واجهة 20 م على الشارع، جاهزة للبناء فوراً.',
      descFr: 'Terrain résidentiel borné avec dossier complet — façade 20 m, prêt à construire.',
      media: {
        cover: U.land,
        kitchen: [], baths: [], rooms: [],
        exterior: [U.land, U.villaExt]
      },
      map: {
        lat: 18.0400, lon: -15.9800,
        nearby: ['شارع القطب', 'مسجد الحي'],
        nearbyFr: ['Avenue Al Qutb', 'Mosquée du quartier']
      }
    },
    {
      id: 'e5', cat: 'villa', deal: 'sale',
      title: 'منزل عائلي بحديقة — لكصر',
      titleFr: 'Maison familiale avec jardin — Ksar',
      loc: 'لكصر', locFr: 'Ksar',
      street: 'حي العائلات — لكصر',
      streetFr: 'Quartier des familles — Ksar',
      price: '3.4M MRU', badge: 'للبيع', badgeFr: 'À vendre',
      beds: 4, living: 2, baths: 3, area: 280, builtArea: 240,
      furnish: 'غير مفروش', furnishFr: 'Non meublé', parking: 1,
      features: ['حديقة', 'مكيفات', 'مطبخ مجهز', 'حراسة/أمن'],
      featuresFr: ['Jardin', 'Climatisation', 'Cuisine équipée', 'Sécurité'],
      desc: 'منزل عائلي بحديقة خاصة ومساحات معيشة واسعة — مثالي للعائلات الكبيرة.',
      descFr: 'Maison familiale avec jardin privé et grands espaces — idéale pour grandes familles.',
      media: {
        cover: U.house,
        kitchen: [U.kitchen],
        baths: [U.bath],
        rooms: [U.living, U.bedroom, U.bedroom2],
        exterior: [U.house, U.garage]
      },
      map: {
        lat: 18.0861, lon: -15.9785,
        nearby: ['مدرسة', 'مسجد', 'سوق'],
        nearbyFr: ['École', 'Mosquée', 'Marché']
      }
    },
    {
      id: 'e6', cat: 'shop', deal: 'rent',
      title: 'محل تجاري على شارع رئيسي — سوق العاصمة',
      titleFr: 'Local commercial sur avenue — Souk de la capitale',
      loc: 'سوق العاصمة', locFr: 'Souk de la capitale',
      street: 'الواجهة على الشارع الرئيسي',
      streetFr: 'Façade sur l’avenue principale',
      price: '85K / شهر', priceFr: '85K / mois', badge: 'للكراء', badgeFr: 'À louer',
      beds: null, living: null, baths: 1, area: 75, builtArea: 75,
      furnish: null, parking: 0,
      features: ['واجهة زجاجية', 'حركة عالية', 'مكيفات'],
      featuresFr: ['Vitrine vitrée', 'Fort passage', 'Climatisation'],
      desc: 'محل على شارع رئيسي بحركة يومية عالية — مناسب للتجارة والخدمات.',
      descFr: 'Local sur avenue à fort passage quotidien — idéal commerce et services.',
      media: {
        cover: U.shop,
        kitchen: [], baths: [U.bath2], rooms: [],
        exterior: [U.shop]
      },
      map: {
        lat: 18.0850, lon: -15.9700,
        nearby: ['سوق العاصمة', 'مواقف عامة'],
        nearbyFr: ['Souk de la capitale', 'Parkings publics']
      }
    },
    {
      id: 'e7', cat: 'apartment', deal: 'sale',
      title: 'بنتهاوس تمليك — القطب',
      titleFr: 'Penthouse — Al Qutb',
      loc: 'القطب', locFr: 'Al Qutb',
      street: 'طابق علوي — إطلالة غروب',
      streetFr: 'Dernier étage — vue coucher de soleil',
      price: '6.5M MRU', badge: 'للبيع', badgeFr: 'À vendre',
      beds: 4, living: 2, baths: 3, area: 260, builtArea: 260,
      furnish: 'مفروش بالكامل', furnishFr: 'Entièrement meublé', parking: 2,
      features: ['تراس واسع', 'مكيفات', 'مطبخ مجهز', 'مصعد', 'حراسة/أمن', 'خزانات مدمجة'],
      featuresFr: ['Grande terrasse', 'Climatisation', 'Cuisine équipée', 'Ascenseur', 'Sécurité', 'Placards intégrés'],
      desc: 'بنتهاوس بإطلالة غروب وتراس واسع — تشطيب راقٍ ومفروش بالكامل.',
      descFr: 'Penthouse avec vue coucher de soleil et grande terrasse — finition haut de gamme, entièrement meublé.',
      media: {
        cover: U.penthouse,
        kitchen: [U.kitchen, U.kitchen2],
        baths: [U.bath, U.bath2],
        rooms: [U.living, U.bedroom, U.bedroom2],
        exterior: [U.terrace, U.penthouse]
      },
      map: {
        lat: 18.0400, lon: -15.9800,
        nearby: ['الشارع الرئيسي', 'مسجد'],
        nearbyFr: ['Avenue principale', 'Mosquée']
      }
    },
    {
      id: 'e8', cat: 'villa', deal: 'rent',
      title: 'فيلا مفروشة للكراء — تفرغ زينة',
      titleFr: 'Villa meublée à louer — Tevragh Zeina',
      loc: 'تفرغ زينة', locFr: 'Tevragh Zeina',
      street: 'حي راقٍ — تفرغ زينة',
      streetFr: 'Quartier résidentiel — Tevragh Zeina',
      price: '280K / شهر', priceFr: '280K / mois', badge: 'للكراء', badgeFr: 'À louer',
      beds: 5, living: 2, baths: 4, area: 380, builtArea: 320,
      furnish: 'مفروش بالكامل', furnishFr: 'Entièrement meublé', parking: 2,
      features: ['مسبح', 'حديقة', 'مكيفات', 'مطبخ مجهز', 'حراسة/أمن', 'كراج مغطى'],
      featuresFr: ['Piscine', 'Jardin', 'Climatisation', 'Cuisine équipée', 'Sécurité', 'Garage couvert'],
      desc: 'فيلا مفروشة في حي راقٍ — مناسبة للعائلات والإقامات الطويلة مع حديقة ومسبح.',
      descFr: 'Villa meublée dans un quartier résidentiel — idéale familles et longs séjours, avec jardin et piscine.',
      media: {
        cover: U.villaNight,
        kitchen: [U.kitchen2],
        baths: [U.bath, U.bath2],
        rooms: [U.living, U.bedroom, U.bedroom2],
        exterior: [U.villaExt, U.terrace, U.garage]
      },
      map: {
        lat: 18.1105, lon: -15.9990,
        nearby: ['سفارات', 'مدارس', 'مسجد'],
        nearbyFr: ['Ambassades', 'Écoles', 'Mosquée']
      }
    }
  ];

  function allMedia(item, fr) {
    var m = item.media || {};
    var out = [];
    var L = LABEL;
    function lab(key) { return fr ? L[key].fr : L[key].ar; }
    if (m.cover) out.push({ src: m.cover, cat: 'cover', label: lab('cover') });
    (m.rooms || []).forEach(function (s) { out.push({ src: s, cat: 'rooms', label: lab('rooms') }); });
    (m.kitchen || []).forEach(function (s) { out.push({ src: s, cat: 'kitchen', label: lab('kitchen') }); });
    (m.baths || []).forEach(function (s) { out.push({ src: s, cat: 'baths', label: lab('baths') }); });
    (m.exterior || []).forEach(function (s) { out.push({ src: s, cat: 'exterior', label: lab('exterior') }); });
    if (!out.length && item.img) out.push({ src: item.img, cat: 'cover', label: lab('cover') });
    return out;
  }

  function cardImgs(item) {
    return allMedia(item, false).map(function (x) { return x.src; });
  }

  function coverOf(item) {
    return (item.media && item.media.cover) || item.img || (cardImgs(item)[0] || '');
  }

  function pick(item, arKey, frKey, fr) {
    if (fr && item && item[frKey]) return item[frKey];
    return (item && item[arKey]) || '';
  }

  global.RizqEstateData = {
    LISTINGS: LISTINGS,
    allMedia: allMedia,
    cardImgs: cardImgs,
    coverOf: coverOf,
    pick: pick,
    MEDIA_TABS: [
      { id: 'all', ar: 'الكل', fr: 'Tout' },
      { id: 'kitchen', ar: 'المطبخ', fr: 'Cuisine' },
      { id: 'baths', ar: 'الحمامات', fr: 'Salles de bain' },
      { id: 'rooms', ar: 'المجلس والغرف', fr: 'Salons & chambres' },
      { id: 'exterior', ar: 'المحيط والكراج', fr: 'Extérieur' }
    ],
    FURNISH: ['مفروش بالكامل', 'مفروش جزئياً', 'غير مفروش'],
    FURNISH_FR: {
      'مفروش بالكامل': 'Entièrement meublé',
      'مفروش جزئياً': 'Partiellement meublé',
      'غير مفروش': 'Non meublé'
    },
    BADGE_FR: { 'للبيع': 'À vendre', 'للكراء': 'À louer', 'أرض': 'Terrain' },
    RES_FEATURES: ['مكيفات', 'مسبح', 'حديقة', 'مطبخ مجهز', 'مصعد', 'حراسة/أمن', 'خزانات مدمجة', 'كراج مغطى'],
    LAND_FEATURES: ['سند ملكية معتمد', 'واجهة على الشارع', 'جاهزة للبناء', 'زاوية']
  };
})(typeof window !== 'undefined' ? window : this);
