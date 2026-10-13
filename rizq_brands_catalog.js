/**
 * rizq_brands_catalog.js — كتالوج الماركات + الموديلات (إلهام Milanuncios / coche.net)
 * سيارات · أزياء · ملابس رياضية · نظارات وإكسسوارات
 * الشعارات: شارات حروف بألوان الماركة (بدون نسخ شعارات تجارية محمية).
 */
(function (global) {
  'use strict';

  function M(id, nameAr, nameFr) {
    return { id: id, nameAr: nameAr, nameFr: nameFr || nameAr };
  }

  /** @type {Array<object>} */
  var BRANDS = [
    /* ── سيارات ── */
    {
      id: 'toyota', nameAr: 'تويوتا', nameFr: 'Toyota', sector: 'auto',
      categories: ['سيارات'], color: '#EB0A1E', letter: 'T',
      aliases: ['toyota', 'تويوتا'],
      models: [
        M('corolla', 'كورولا', 'Corolla'), M('camry', 'كامري', 'Camry'),
        M('hilux', 'هايلكس', 'Hilux'), M('rav4', 'RAV4', 'RAV4'),
        M('land-cruiser', 'لاند كروزر', 'Land Cruiser'), M('yaris', 'ياريس', 'Yaris'),
        M('prado', 'برادو', 'Prado'), M('fortuner', 'فورتشنر', 'Fortuner')
      ]
    },
    {
      id: 'mercedes', nameAr: 'مرسيدس-بنز', nameFr: 'Mercedes-Benz', sector: 'auto',
      categories: ['سيارات'], color: '#333333', letter: 'MB',
      aliases: ['mercedes', 'benz', 'مرسيدس', 'بنز'],
      models: [
        M('a-class', 'الفئة A', 'Classe A'), M('c-class', 'الفئة C', 'Classe C'),
        M('e-class', 'الفئة E', 'Classe E'), M('s-class', 'الفئة S', 'Classe S'),
        M('gla', 'GLA', 'GLA'), M('glb', 'GLB', 'GLB'), M('glc', 'GLC', 'GLC'),
        M('gle', 'GLE', 'GLE'), M('g-class', 'الفئة G', 'Classe G')
      ]
    },
    {
      id: 'bmw', nameAr: 'بي إم دبليو', nameFr: 'BMW', sector: 'auto',
      categories: ['سيارات'], color: '#1C69D4', letter: 'BMW',
      aliases: ['bmw', 'بي ام دبليو', 'بي إم دبليو'],
      models: [
        M('serie-1', 'الفئة 1', 'Série 1'), M('serie-3', 'الفئة 3', 'Série 3'),
        M('serie-5', 'الفئة 5', 'Série 5'), M('x1', 'X1', 'X1'),
        M('x3', 'X3', 'X3'), M('x5', 'X5', 'X5'), M('x6', 'X6', 'X6')
      ]
    },
    {
      id: 'hyundai', nameAr: 'هيونداي', nameFr: 'Hyundai', sector: 'auto',
      categories: ['سيارات'], color: '#002C5F', letter: 'H',
      aliases: ['hyundai', 'هيونداي', 'هونداي'],
      models: [
        M('accent', 'أكسنت', 'Accent'), M('elantra', 'إلنترا', 'Elantra'),
        M('tucson', 'توسان', 'Tucson'), M('santa-fe', 'سانتا في', 'Santa Fe'),
        M('creta', 'كريتا', 'Creta'), M('i10', 'i10', 'i10'), M('i20', 'i20', 'i20')
      ]
    },
    {
      id: 'kia', nameAr: 'كيا', nameFr: 'Kia', sector: 'auto',
      categories: ['سيارات'], color: '#05141F', letter: 'KIA',
      aliases: ['kia', 'كيا'],
      models: [
        M('picanto', 'بيكانتو', 'Picanto'), M('rio', 'ريو', 'Rio'),
        M('cerato', 'سيراتو', 'Cerato'), M('sportage', 'سبورتاج', 'Sportage'),
        M('sorento', 'سورينتو', 'Sorento'), M('seltos', 'سيلتوس', 'Seltos')
      ]
    },
    {
      id: 'nissan', nameAr: 'نيسان', nameFr: 'Nissan', sector: 'auto',
      categories: ['سيارات'], color: '#C3002F', letter: 'N',
      aliases: ['nissan', 'نيسان'],
      models: [
        M('sunny', 'صني', 'Sunny'), M('altima', 'التيما', 'Altima'),
        M('patrol', 'باترول', 'Patrol'), M('xtrail', 'إكس تريل', 'X-Trail'),
        M('qashqai', 'قاشقاي', 'Qashqai'), M('navara', 'نافارا', 'Navara')
      ]
    },
    {
      id: 'volkswagen', nameAr: 'فولكسفاغن', nameFr: 'Volkswagen', sector: 'auto',
      categories: ['سيارات'], color: '#001E50', letter: 'VW',
      aliases: ['volkswagen', 'vw', 'فولكس', 'فولكسفاغن'],
      models: [
        M('golf', 'غولف', 'Golf'), M('polo', 'بولو', 'Polo'),
        M('passat', 'باسات', 'Passat'), M('tiguan', 'تيغوان', 'Tiguan'),
        M('touareg', 'طوارق', 'Touareg')
      ]
    },
    {
      id: 'peugeot', nameAr: 'بيجو', nameFr: 'Peugeot', sector: 'auto',
      categories: ['سيارات'], color: '#000000', letter: 'PE',
      aliases: ['peugeot', 'بيجو'],
      models: [
        M('208', '208', '208'), M('301', '301', '301'), M('308', '308', '308'),
        M('2008', '2008', '2008'), M('3008', '3008', '3008'), M('5008', '5008', '5008')
      ]
    },
    {
      id: 'renault', nameAr: 'رينو', nameFr: 'Renault', sector: 'auto',
      categories: ['سيارات'], color: '#FFCC33', letter: 'R',
      aliases: ['renault', 'رينو'],
      models: [
        M('clio', 'كليو', 'Clio'), M('megane', 'ميغان', 'Mégane'),
        M('duster', 'داستر', 'Duster'), M('symbol', 'سيمبول', 'Symbol'),
        M('captur', 'كابتشر', 'Captur')
      ]
    },
    {
      id: 'ford', nameAr: 'فورد', nameFr: 'Ford', sector: 'auto',
      categories: ['سيارات'], color: '#003478', letter: 'F',
      aliases: ['ford', 'فورد'],
      models: [
        M('focus', 'فوكاس', 'Focus'), M('fiesta', 'فييستا', 'Fiesta'),
        M('ranger', 'رينجر', 'Ranger'), M('explorer', 'إكسبلورر', 'Explorer'),
        M('edge', 'إيدج', 'Edge')
      ]
    },
    {
      id: 'chevrolet', nameAr: 'شيفروليه', nameFr: 'Chevrolet', sector: 'auto',
      categories: ['سيارات'], color: '#D4A017', letter: 'CH',
      aliases: ['chevrolet', 'chevy', 'شيفروليه', 'شفروليه'],
      models: [
        M('spark', 'سبارك', 'Spark'), M('aveo', 'أفيو', 'Aveo'),
        M('cruze', 'كروز', 'Cruze'), M('captiva', 'كابتيفا', 'Captiva'),
        M('tahoe', 'تاهو', 'Tahoe'), M('silverado', 'سيلفرادو', 'Silverado')
      ]
    },
    {
      id: 'dacia', nameAr: 'داسيا', nameFr: 'Dacia', sector: 'auto',
      categories: ['سيارات'], color: '#6EB52C', letter: 'D',
      aliases: ['dacia', 'داسيا'],
      models: [
        M('logan', 'لوغان', 'Logan'), M('sandero', 'سانديرو', 'Sandero'),
        M('duster', 'داستر', 'Duster'), M('lodgy', 'لودجي', 'Lodgy')
      ]
    },

    /* ── أزياء وملابس ── */
    {
      id: 'nike', nameAr: 'نايك', nameFr: 'Nike', sector: 'sports',
      categories: ['أزياء', 'رياضة'], color: '#111111', letter: 'NK',
      aliases: ['nike', 'نايك'],
      models: [
        M('air-force-1', 'إير فورس 1', 'Air Force 1'), M('air-max', 'إير ماكس', 'Air Max'),
        M('dunk', 'دانك', 'Dunk'), M('jordan', 'جوردان', 'Jordan'),
        M('dri-fit', 'دراي فت', 'Dri-FIT'), M('tech-fleece', 'تك فليس', 'Tech Fleece')
      ]
    },
    {
      id: 'adidas', nameAr: 'أديداس', nameFr: 'Adidas', sector: 'sports',
      categories: ['أزياء', 'رياضة'], color: '#000000', letter: 'AD',
      aliases: ['adidas', 'أديداس', 'اديداس'],
      models: [
        M('ultraboost', 'ألترابوست', 'Ultraboost'), M('samba', 'سامبا', 'Samba'),
        M('gazelle', 'غزال', 'Gazelle'), M('superstar', 'سوبرستار', 'Superstar'),
        M('campus', 'كامبوس', 'Campus'), M('originals', 'أوريجينالز', 'Originals')
      ]
    },
    {
      id: 'puma', nameAr: 'بوما', nameFr: 'Puma', sector: 'sports',
      categories: ['أزياء', 'رياضة'], color: '#000000', letter: 'PU',
      aliases: ['puma', 'بوما'],
      models: [
        M('suede', 'سويد', 'Suede'), M('rs-x', 'RS-X', 'RS-X'),
        M('speedcat', 'سبيدكات', 'Speedcat'), M('future', 'فيوتشر', 'Future')
      ]
    },
    {
      id: 'zara', nameAr: 'زارا', nameFr: 'Zara', sector: 'fashion',
      categories: ['أزياء'], color: '#000000', letter: 'Z',
      aliases: ['zara', 'زارا'],
      models: [
        M('homme', 'رجالي', 'Homme'), M('femme', 'نسائي', 'Femme'),
        M('kids', 'أطفال', 'Kids'), M('basics', 'أساسيات', 'Basics')
      ]
    },
    {
      id: 'h-m', nameAr: 'إتش آند إم', nameFr: 'H&M', sector: 'fashion',
      categories: ['أزياء'], color: '#E50010', letter: 'HM',
      aliases: ['h&m', 'hm', 'اتش اند ام', 'إتش آند إم'],
      models: [
        M('divided', 'ديفايدد', 'Divided'), M('basics', 'أساسيات', 'Basics'),
        M('kids', 'أطفال', 'Kids'), M('home', 'منزلي', 'Home')
      ]
    },
    {
      id: 'lc-waikiki', nameAr: 'إل سي واكيكي', nameFr: 'LC Waikiki', sector: 'fashion',
      categories: ['أزياء'], color: '#0057A0', letter: 'LC',
      aliases: ['lc waikiki', 'lcw', 'واكيكي', 'إل سي'],
      models: [
        M('homme', 'رجالي', 'Homme'), M('femme', 'نسائي', 'Femme'),
        M('kids', 'أطفال', 'Kids'), M('sports', 'رياضي', 'Sports')
      ]
    },
    {
      id: 'defacto', nameAr: 'ديفاكتو', nameFr: 'DeFacto', sector: 'fashion',
      categories: ['أزياء'], color: '#111111', letter: 'DF',
      aliases: ['defacto', 'ديفاكتو'],
      models: [
        M('homme', 'رجالي', 'Homme'), M('femme', 'نسائي', 'Femme'),
        M('kids', 'أطفال', 'Kids')
      ]
    },
    {
      id: 'gucci', nameAr: 'غوتشي', nameFr: 'Gucci', sector: 'fashion',
      categories: ['أزياء'], color: '#006341', letter: 'GG',
      aliases: ['gucci', 'غوتشي', 'جوتشي'],
      models: [
        M('bags', 'حقائب', 'Sacs'), M('shoes', 'أحذية', 'Chaussures'),
        M('ready-to-wear', 'ملابس جاهزة', 'Prêt-à-porter'), M('accessories', 'إكسسوارات', 'Accessoires')
      ]
    },

    /* ── نظارات وإكسسوارات ── */
    {
      id: 'ray-ban', nameAr: 'راي بان', nameFr: 'Ray-Ban', sector: 'eyewear',
      categories: ['أزياء'], color: '#ED1C24', letter: 'RB',
      aliases: ['ray-ban', 'rayban', 'راي بان'],
      models: [
        M('aviator', 'أفياتور', 'Aviator'), M('wayfarer', 'وايفارير', 'Wayfarer'),
        M('clubmaster', 'كلوب ماستر', 'Clubmaster'), M('erika', 'إريكا', 'Erika')
      ]
    },
    {
      id: 'oakley', nameAr: 'أوكلي', nameFr: 'Oakley', sector: 'eyewear',
      categories: ['أزياء', 'رياضة'], color: '#000000', letter: 'OK',
      aliases: ['oakley', 'اوكلي', 'أوكلي'],
      models: [
        M('holbrook', 'هولبروك', 'Holbrook'), M('frogskins', 'فروغ سكينز', 'Frogskins'),
        M('radar', 'رادار', 'Radar'), M('sutro', 'سوترو', 'Sutro')
      ]
    },
    {
      id: 'persol', nameAr: 'بيرسول', nameFr: 'Persol', sector: 'eyewear',
      categories: ['أزياء'], color: '#6B3A2A', letter: 'PO',
      aliases: ['persol', 'بيرسول'],
      models: [
        M('649', '649', '649'), M('714', '714', '714'), M('po9649', 'PO9649', 'PO9649')
      ]
    },
    {
      id: 'carrera', nameAr: 'كاريرا', nameFr: 'Carrera', sector: 'eyewear',
      categories: ['أزياء'], color: '#E30613', letter: 'CA',
      aliases: ['carrera', 'كاريرا'],
      models: [
        M('champion', 'شامبيون', 'Champion'), M('safari', 'سفاري', 'Safari'),
        M('panamerika', 'باناميريكا', 'Panamerika')
      ]
    },

    /* ── إلكترونيات شائعة (ماركة فقط + خطوط) ── */
    {
      id: 'apple', nameAr: 'آبل', nameFr: 'Apple', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#555555', letter: '',
      aliases: ['apple', 'آبل', 'ابل', 'آيفون'],
      models: [
        M('iphone-15', 'آيفون 15', 'iPhone 15'), M('iphone-14', 'آيفون 14', 'iPhone 14'),
        M('iphone-13', 'آيفون 13', 'iPhone 13'), M('ipad', 'آيباد', 'iPad'),
        M('macbook', 'ماك بوك', 'MacBook'), M('airpods', 'إيربودز', 'AirPods'),
        M('watch', 'ساعة', 'Watch')
      ]
    },
    {
      id: 'samsung', nameAr: 'سامسونج', nameFr: 'Samsung', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#1428A0', letter: 'S',
      aliases: ['samsung', 'سامسونج'],
      models: [
        M('galaxy-s24', 'Galaxy S24', 'Galaxy S24'), M('galaxy-s23', 'Galaxy S23', 'Galaxy S23'),
        M('galaxy-a', 'Galaxy A', 'Galaxy A'), M('galaxy-tab', 'Galaxy Tab', 'Galaxy Tab'),
        M('galaxy-watch', 'Galaxy Watch', 'Galaxy Watch'), M('buds', 'Buds', 'Buds')
      ]
    },
    {
      id: 'xiaomi', nameAr: 'شاومي', nameFr: 'Xiaomi', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#FF6900', letter: 'MI',
      aliases: ['xiaomi', 'mi', 'شاومي'],
      models: [
        M('redmi', 'ريدمي', 'Redmi'), M('poco', 'بوكو', 'POCO'),
        M('note', 'نوت', 'Note'), M('mi-tv', 'تلفزيون', 'Mi TV')
      ]
    }
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function logoSvg(brand, size) {
    size = size || 40;
    var letter = (brand.letter != null && brand.letter !== '')
      ? brand.letter
      : String(brand.nameFr || brand.nameAr || '?').slice(0, 2).toUpperCase();
    var fill = brand.color || '#1B3A6B';
    var fs = letter.length > 2 ? Math.round(size * 0.28) : Math.round(size * 0.36);
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + esc(brand.nameFr || brand.nameAr) + '">'
      + '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + (size / 2) + '" fill="' + esc(fill) + '"/>'
      + '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="Georgia,serif" font-weight="700" font-size="' + fs + '">' + esc(letter) + '</text>'
      + '</svg>';
  }

  function logoDataUri(brand, size) {
    try {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logoSvg(brand, size || 64));
    } catch (e) {
      return '';
    }
  }

  function listAll() {
    return BRANDS.slice();
  }

  function getById(id) {
    if (!id) return null;
    var sid = String(id).toLowerCase();
    for (var i = 0; i < BRANDS.length; i++) {
      if (String(BRANDS[i].id).toLowerCase() === sid) return BRANDS[i];
    }
    return null;
  }

  function normalizeCat(cat) {
    return String(cat || '').trim();
  }

  /** ماركات تظهر لقسم معيّن (مفتاح القسم مثل سيارات / أزياء) */
  function forCategory(catKey) {
    var key = normalizeCat(catKey);
    if (!key) return listAll();
    return BRANDS.filter(function (b) {
      return (b.categories || []).some(function (c) {
        return c === key || key.indexOf(c) >= 0 || c.indexOf(key) >= 0;
      });
    });
  }

  function forSector(sector) {
    var s = String(sector || '');
    return BRANDS.filter(function (b) { return b.sector === s; });
  }

  function modelsOf(brandId) {
    var b = getById(brandId);
    return b && Array.isArray(b.models) ? b.models.slice() : [];
  }

  function getModel(brandId, modelId) {
    var models = modelsOf(brandId);
    var mid = String(modelId || '').toLowerCase();
    for (var i = 0; i < models.length; i++) {
      if (String(models[i].id).toLowerCase() === mid) return models[i];
    }
    return null;
  }

  function displayName(brand, fr) {
    if (!brand) return '';
    return fr ? (brand.nameFr || brand.nameAr) : (brand.nameAr || brand.nameFr);
  }

  function modelName(model, fr) {
    if (!model) return '';
    return fr ? (model.nameFr || model.nameAr) : (model.nameAr || model.nameFr);
  }

  function searchMatch(brand, q) {
    if (!brand || !q) return false;
    var s = String(q).toLowerCase();
    var blob = [
      brand.id, brand.nameAr, brand.nameFr
    ].concat(brand.aliases || []).join(' ').toLowerCase();
    return blob.indexOf(s) >= 0;
  }

  function findByAlias(text) {
    var t = String(text || '').toLowerCase().trim();
    if (!t) return null;
    for (var i = 0; i < BRANDS.length; i++) {
      if (searchMatch(BRANDS[i], t)) return BRANDS[i];
      var names = [BRANDS[i].nameAr, BRANDS[i].nameFr].concat(BRANDS[i].aliases || []);
      for (var j = 0; j < names.length; j++) {
        if (t.indexOf(String(names[j]).toLowerCase()) >= 0) return BRANDS[i];
      }
    }
    return null;
  }

  /** شارة HTML صغيرة للبطاقات */
  function chipHtml(brandId, opts) {
    opts = opts || {};
    var brand = getById(brandId);
    if (!brand) return '';
    var fr = !!opts.fr;
    var model = opts.modelId ? getModel(brandId, opts.modelId) : null;
    var label = displayName(brand, fr);
    if (model) label += ' · ' + modelName(model, fr);
    var size = opts.size || 22;
    return '<span class="rzq-brand-chip" title="' + esc(label) + '" style="display:inline-flex;align-items:center;gap:6px;padding:3px 8px 3px 4px;border-radius:999px;background:rgba(15,35,71,.06);border:1px solid rgba(15,35,71,.1);font-size:11px;font-weight:700;color:#0F2347;max-width:100%">'
      + '<img src="' + esc(logoDataUri(brand, size * 2)) + '" alt="" width="' + size + '" height="' + size + '" style="border-radius:50%;flex-shrink:0"/>'
      + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(label) + '</span>'
      + '</span>';
  }

  /**
   * يملأ <select> للماركات حسب القسم.
   * @returns {number} عدد الخيارات المضافة
   */
  function fillBrandSelect(selectEl, catKey, fr, selectedId) {
    if (!selectEl) return 0;
    var brands = forCategory(catKey);
    var allLbl = fr ? '— Marque —' : '— الماركة —';
    selectEl.innerHTML = '<option value="">' + esc(allLbl) + '</option>'
      + brands.map(function (b) {
        var sel = selectedId && String(selectedId) === String(b.id) ? ' selected' : '';
        return '<option value="' + esc(b.id) + '"' + sel + '>' + esc(displayName(b, fr)) + '</option>';
      }).join('');
    return brands.length;
  }

  function fillModelSelect(selectEl, brandId, fr, selectedId) {
    if (!selectEl) return 0;
    var models = modelsOf(brandId);
    var allLbl = fr ? '— Modèle —' : '— الموديل —';
    selectEl.innerHTML = '<option value="">' + esc(allLbl) + '</option>'
      + models.map(function (m) {
        var sel = selectedId && String(selectedId) === String(m.id) ? ' selected' : '';
        return '<option value="' + esc(m.id) + '"' + sel + '>' + esc(modelName(m, fr)) + '</option>';
      }).join('');
    selectEl.disabled = !brandId;
    return models.length;
  }

  /** شريط شعارات أفقي (تصفح) */
  function stripHtml(catKey, fr, opts) {
    opts = opts || {};
    var brands = forCategory(catKey);
    if (!brands.length) return '';
    var active = opts.activeId || '';
    return '<div class="rzq-brand-strip" role="list" aria-label="' + (fr ? 'Marques' : 'الماركات') + '">'
      + brands.map(function (b) {
        var on = active && String(active) === String(b.id);
        return '<button type="button" class="rzq-brand-strip-btn' + (on ? ' is-on' : '') + '" data-brand-id="' + esc(b.id) + '" title="' + esc(displayName(b, fr)) + '" role="listitem">'
          + '<img src="' + esc(logoDataUri(b, 72)) + '" alt="' + esc(displayName(b, fr)) + '" width="40" height="40"/>'
          + '<span>' + esc(displayName(b, fr)) + '</span>'
          + '</button>';
      }).join('')
      + '</div>';
  }

  global.RizqBrands = {
    list: listAll,
    getById: getById,
    forCategory: forCategory,
    forSector: forSector,
    modelsOf: modelsOf,
    getModel: getModel,
    displayName: displayName,
    modelName: modelName,
    searchMatch: searchMatch,
    findByAlias: findByAlias,
    logoSvg: logoSvg,
    logoDataUri: logoDataUri,
    chipHtml: chipHtml,
    fillBrandSelect: fillBrandSelect,
    fillModelSelect: fillModelSelect,
    stripHtml: stripHtml,
    sectors: { auto: 'auto', fashion: 'fashion', sports: 'sports', eyewear: 'eyewear', electronics: 'electronics' }
  };
})(typeof window !== 'undefined' ? window : this);
