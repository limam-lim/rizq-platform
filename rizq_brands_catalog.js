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
    {
      id: 'honda', nameAr: 'هوندا', nameFr: 'Honda', sector: 'auto',
      categories: ['سيارات'], color: '#E40521', letter: 'H',
      aliases: ['honda', 'هوندا'],
      models: [
        M('civic', 'سيفيك', 'Civic'), M('accord', 'أكورد', 'Accord'),
        M('cr-v', 'CR-V', 'CR-V'), M('hr-v', 'HR-V', 'HR-V'), M('city', 'سيتي', 'City')
      ]
    },
    {
      id: 'mazda', nameAr: 'مازدا', nameFr: 'Mazda', sector: 'auto',
      categories: ['سيارات'], color: '#910A2D', letter: 'MZ',
      aliases: ['mazda', 'مازدا'],
      models: [
        M('mazda3', 'مازدا 3', 'Mazda3'), M('mazda6', 'مازدا 6', 'Mazda6'),
        M('cx-5', 'CX-5', 'CX-5'), M('cx-30', 'CX-30', 'CX-30')
      ]
    },
    {
      id: 'mitsubishi', nameAr: 'ميتسوبيشي', nameFr: 'Mitsubishi', sector: 'auto',
      categories: ['سيارات'], color: '#E60012', letter: 'M',
      aliases: ['mitsubishi', 'ميتسوبيشي', 'ميتسبيشي'],
      models: [
        M('l200', 'L200', 'L200'), M('pajero', 'باجيرو', 'Pajero'),
        M('outlander', 'أوتلاندر', 'Outlander'), M('asx', 'ASX', 'ASX')
      ]
    },
    {
      id: 'suzuki', nameAr: 'سوزوكي', nameFr: 'Suzuki', sector: 'auto',
      categories: ['سيارات'], color: '#E30613', letter: 'SZ',
      aliases: ['suzuki', 'سوزوكي'],
      models: [
        M('swift', 'سويفت', 'Swift'), M('vitara', 'فيتارا', 'Vitara'),
        M('jimny', 'جيمني', 'Jimny'), M('dzire', 'ديزاير', 'Dzire')
      ]
    },
    {
      id: 'audi', nameAr: 'أودي', nameFr: 'Audi', sector: 'auto',
      categories: ['سيارات'], color: '#BB0A30', letter: 'AU',
      aliases: ['audi', 'أودي', 'اودي'],
      models: [
        M('a3', 'A3', 'A3'), M('a4', 'A4', 'A4'), M('a6', 'A6', 'A6'),
        M('q3', 'Q3', 'Q3'), M('q5', 'Q5', 'Q5'), M('q7', 'Q7', 'Q7')
      ]
    },
    {
      id: 'land-rover', nameAr: 'لاند روفر', nameFr: 'Land Rover', sector: 'auto',
      categories: ['سيارات'], color: '#005A2B', letter: 'LR',
      aliases: ['land rover', 'landrover', 'لاند روفر', 'رنج روفر'],
      models: [
        M('defender', 'ديفندر', 'Defender'), M('discovery', 'ديسكفري', 'Discovery'),
        M('range-rover', 'رنج روفر', 'Range Rover'), M('evoque', 'إيفوك', 'Evoque')
      ]
    },
    {
      id: 'jeep', nameAr: 'جيب', nameFr: 'Jeep', sector: 'auto',
      categories: ['سيارات'], color: '#1C3F24', letter: 'JP',
      aliases: ['jeep', 'جيب'],
      models: [
        M('wrangler', 'رانجلر', 'Wrangler'), M('cherokee', 'شيروكي', 'Cherokee'),
        M('compass', 'كومباس', 'Compass'), M('grand-cherokee', 'جراند شيروكي', 'Grand Cherokee')
      ]
    },
    {
      id: 'volvo', nameAr: 'فولفو', nameFr: 'Volvo', sector: 'auto',
      categories: ['سيارات'], color: '#003057', letter: 'VO',
      aliases: ['volvo', 'فولفو'],
      models: [
        M('xc40', 'XC40', 'XC40'), M('xc60', 'XC60', 'XC60'),
        M('xc90', 'XC90', 'XC90'), M('s60', 'S60', 'S60')
      ]
    },
    {
      id: 'skoda', nameAr: 'سكودا', nameFr: 'Škoda', sector: 'auto',
      categories: ['سيارات'], color: '#4BA82E', letter: 'SK',
      aliases: ['skoda', 'škoda', 'سكودا'],
      models: [
        M('octavia', 'أوكتافيا', 'Octavia'), M('superb', 'سوبيرب', 'Superb'),
        M('kodiaq', 'كودياك', 'Kodiaq'), M('kamiq', 'كاميك', 'Kamiq')
      ]
    },
    {
      id: 'opel', nameAr: 'أوبل', nameFr: 'Opel', sector: 'auto',
      categories: ['سيارات'], color: '#F7D117', letter: 'OP',
      aliases: ['opel', 'أوبل', 'اوبل'],
      models: [
        M('corsa', 'كورسا', 'Corsa'), M('astra', 'أسترا', 'Astra'),
        M('mokka', 'موكا', 'Mokka'), M('grandland', 'جراندلاند', 'Grandland')
      ]
    },
    {
      id: 'geely', nameAr: 'جيلي', nameFr: 'Geely', sector: 'auto',
      categories: ['سيارات'], color: '#003DA5', letter: 'GE',
      aliases: ['geely', 'جيلي'],
      models: [
        M('coolray', 'كولراي', 'Coolray'), M('azkarra', 'أزكارا', 'Azkarra'),
        M('okavango', 'أوكافانجو', 'Okavango'), M('emgrand', 'إمجراند', 'Emgrand')
      ]
    },
    {
      id: 'chery', nameAr: 'شيري', nameFr: 'Chery', sector: 'auto',
      categories: ['سيارات'], color: '#E31C23', letter: 'CH',
      aliases: ['chery', 'شيري'],
      models: [
        M('tiggo-4', 'تيجو 4', 'Tiggo 4'), M('tiggo-7', 'تيجو 7', 'Tiggo 7'),
        M('tiggo-8', 'تيجو 8', 'Tiggo 8'), M('arrizo', 'أريزو', 'Arrizo')
      ]
    },
    {
      id: 'byd', nameAr: 'بي واي دي', nameFr: 'BYD', sector: 'auto',
      categories: ['سيارات'], color: '#FF3300', letter: 'BYD',
      aliases: ['byd', 'بي واي دي'],
      models: [
        M('atto-3', 'أتو 3', 'Atto 3'), M('seal', 'سيل', 'Seal'),
        M('dolphin', 'دولفين', 'Dolphin'), M('han', 'هان', 'Han')
      ]
    },
    {
      id: 'tesla', nameAr: 'تيسلا', nameFr: 'Tesla', sector: 'auto',
      categories: ['سيارات'], color: '#CC0000', letter: 'TS',
      aliases: ['tesla', 'تيسلا'],
      models: [
        M('model-3', 'موديل 3', 'Model 3'), M('model-y', 'موديل Y', 'Model Y'),
        M('model-s', 'موديل S', 'Model S'), M('model-x', 'موديل X', 'Model X')
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
    {
      id: 'mango', nameAr: 'مانجو', nameFr: 'Mango', sector: 'fashion',
      categories: ['أزياء'], color: '#E87722', letter: 'MG',
      aliases: ['mango', 'مانجو'],
      models: [
        M('femme', 'نسائي', 'Femme'), M('homme', 'رجالي', 'Homme'), M('kids', 'أطفال', 'Kids')
      ]
    },
    {
      id: 'pull-bear', nameAr: 'بول آند بير', nameFr: 'Pull&Bear', sector: 'fashion',
      categories: ['أزياء'], color: '#111111', letter: 'PB',
      aliases: ['pull&bear', 'pull and bear', 'بول اند بير', 'بول آند بير'],
      models: [
        M('homme', 'رجالي', 'Homme'), M('femme', 'نسائي', 'Femme')
      ]
    },
    {
      id: 'bershka', nameAr: 'بيرشكا', nameFr: 'Bershka', sector: 'fashion',
      categories: ['أزياء'], color: '#00A0E3', letter: 'BK',
      aliases: ['bershka', 'بيرشكا'],
      models: [
        M('femme', 'نسائي', 'Femme'), M('homme', 'رجالي', 'Homme')
      ]
    },
    {
      id: 'uniqlo', nameAr: 'يونيكلو', nameFr: 'Uniqlo', sector: 'fashion',
      categories: ['أزياء'], color: '#FF0000', letter: 'UQ',
      aliases: ['uniqlo', 'يونيكلو'],
      models: [
        M('ut', 'UT', 'UT'), M('airism', 'إيريزم', 'AIRism'), M('heattech', 'هيت تك', 'HEATTECH')
      ]
    },
    {
      id: 'guess', nameAr: 'جيس', nameFr: 'Guess', sector: 'fashion',
      categories: ['أزياء'], color: '#C4A35A', letter: 'GU',
      aliases: ['guess', 'جيس'],
      models: [
        M('jeans', 'جينز', 'Jeans'), M('bags', 'حقائب', 'Sacs'), M('watches', 'ساعات', 'Montres')
      ]
    },
    {
      id: 'calvin-klein', nameAr: 'كالفن كلاين', nameFr: 'Calvin Klein', sector: 'fashion',
      categories: ['أزياء'], color: '#111111', letter: 'CK',
      aliases: ['calvin klein', 'ck', 'كالفن كلاين'],
      models: [
        M('underwear', 'داخلي', 'Underwear'), M('jeans', 'جينز', 'Jeans'), M('perfume', 'عطور', 'Parfum')
      ]
    },
    {
      id: 'tommy-hilfiger', nameAr: 'تومي هيلفيغر', nameFr: 'Tommy Hilfiger', sector: 'fashion',
      categories: ['أزياء'], color: '#001F5B', letter: 'TH',
      aliases: ['tommy', 'tommy hilfiger', 'تومي', 'تومي هيلفيغر'],
      models: [
        M('polo', 'بولو', 'Polo'), M('denim', 'دينيم', 'Denim'), M('kids', 'أطفال', 'Kids')
      ]
    },
    {
      id: 'lacoste', nameAr: 'لاكوست', nameFr: 'Lacoste', sector: 'fashion',
      categories: ['أزياء', 'رياضة'], color: '#004D28', letter: 'LA',
      aliases: ['lacoste', 'لاكوست'],
      models: [
        M('polo', 'بولو', 'Polo'), M('sneakers', 'سنيكرز', 'Sneakers'), M('tennis', 'تنس', 'Tennis')
      ]
    },
    {
      id: 'levis', nameAr: 'ليفايز', nameFr: "Levi's", sector: 'fashion',
      categories: ['أزياء'], color: '#C41230', letter: 'LV',
      aliases: ['levis', "levi's", 'ليفايز', 'ليفي'],
      models: [
        M('501', '501', '501'), M('511', '511', '511'), M('trucker', 'تراكر', 'Trucker')
      ]
    },
    {
      id: 'ralph-lauren', nameAr: 'رالف لورين', nameFr: 'Ralph Lauren', sector: 'fashion',
      categories: ['أزياء'], color: '#00205B', letter: 'RL',
      aliases: ['ralph lauren', 'polo ralph', 'رالف لورين'],
      models: [
        M('polo', 'بولو', 'Polo'), M('oxford', 'أكسفورد', 'Oxford'), M('kids', 'أطفال', 'Kids')
      ]
    },
    {
      id: 'chanel', nameAr: 'شانيل', nameFr: 'Chanel', sector: 'fashion',
      categories: ['أزياء'], color: '#111111', letter: 'CH',
      aliases: ['chanel', 'شانيل'],
      models: [
        M('bags', 'حقائب', 'Sacs'), M('perfume', 'عطور', 'Parfum'), M('ready-to-wear', 'ملابس', 'Prêt-à-porter')
      ]
    },
    {
      id: 'louis-vuitton', nameAr: 'لويس فويتون', nameFr: 'Louis Vuitton', sector: 'fashion',
      categories: ['أزياء'], color: '#8B5A2B', letter: 'LV',
      aliases: ['louis vuitton', 'lv', 'لويس فويتون', 'لويس فيتون'],
      models: [
        M('bags', 'حقائب', 'Sacs'), M('sneakers', 'سنيكرز', 'Sneakers'), M('accessories', 'إكسسوارات', 'Accessoires')
      ]
    },
    {
      id: 'prada', nameAr: 'برادا', nameFr: 'Prada', sector: 'fashion',
      categories: ['أزياء'], color: '#111111', letter: 'PR',
      aliases: ['prada', 'برادا'],
      models: [
        M('bags', 'حقائب', 'Sacs'), M('shoes', 'أحذية', 'Chaussures'), M('eyewear', 'نظارات', 'Lunettes')
      ]
    },
    {
      id: 'dior', nameAr: 'ديور', nameFr: 'Dior', sector: 'fashion',
      categories: ['أزياء'], color: '#111111', letter: 'DI',
      aliases: ['dior', 'ديور'],
      models: [
        M('bags', 'حقائب', 'Sacs'), M('perfume', 'عطور', 'Parfum'), M('makeup', 'مكياج', 'Maquillage')
      ]
    },
    {
      id: 'new-balance', nameAr: 'نيو بالانس', nameFr: 'New Balance', sector: 'sports',
      categories: ['أزياء', 'رياضة'], color: '#CF0A2C', letter: 'NB',
      aliases: ['new balance', 'nb', 'نيو بالانس'],
      models: [
        M('574', '574', '574'), M('550', '550', '550'), M('327', '327', '327'), M('990', '990', '990')
      ]
    },
    {
      id: 'under-armour', nameAr: 'أندر آرمر', nameFr: 'Under Armour', sector: 'sports',
      categories: ['أزياء', 'رياضة'], color: '#1D1D1D', letter: 'UA',
      aliases: ['under armour', 'ua', 'أندر آرمر', 'اندر ارمر'],
      models: [
        M('hovr', 'هوفر', 'HOVR'), M('curry', 'كوري', 'Curry'), M('heatgear', 'هيت جير', 'HeatGear')
      ]
    },
    {
      id: 'reebok', nameAr: 'ريبوك', nameFr: 'Reebok', sector: 'sports',
      categories: ['أزياء', 'رياضة'], color: '#E31C23', letter: 'RB',
      aliases: ['reebok', 'ريبوك'],
      models: [
        M('classic', 'كلاسيك', 'Classic'), M('nano', 'نانو', 'Nano'), M('club-c', 'كلوب C', 'Club C')
      ]
    },
    {
      id: 'converse', nameAr: 'كونفيرس', nameFr: 'Converse', sector: 'sports',
      categories: ['أزياء', 'رياضة'], color: '#111111', letter: 'CV',
      aliases: ['converse', 'كونفيرس', 'كونفرس'],
      models: [
        M('chuck-70', 'تشاك 70', 'Chuck 70'), M('all-star', 'أول ستار', 'All Star'), M('run-star', 'ران ستار', 'Run Star')
      ]
    },
    {
      id: 'vans', nameAr: 'فانس', nameFr: 'Vans', sector: 'sports',
      categories: ['أزياء', 'رياضة'], color: '#C41E3A', letter: 'VN',
      aliases: ['vans', 'فانس'],
      models: [
        M('old-skool', 'أولد سكول', 'Old Skool'), M('sk8-hi', 'SK8-Hi', 'SK8-Hi'), M('authentic', 'أوثنتيك', 'Authentic')
      ]
    },
    {
      id: 'asics', nameAr: 'أسيكس', nameFr: 'ASICS', sector: 'sports',
      categories: ['أزياء', 'رياضة'], color: '#001E62', letter: 'AS',
      aliases: ['asics', 'أسيكس', 'اسيكس'],
      models: [
        M('gel-kayano', 'جيل كايانو', 'Gel-Kayano'), M('gel-nimbus', 'جيل نمبس', 'Gel-Nimbus'), M('gt-2000', 'GT-2000', 'GT-2000')
      ]
    },
    {
      id: 'skechers', nameAr: 'سكيتشرز', nameFr: 'Skechers', sector: 'sports',
      categories: ['أزياء', 'رياضة'], color: '#111111', letter: 'SK',
      aliases: ['skechers', 'سكيتشرز'],
      models: [
        M('go-walk', 'جو ووك', 'Go Walk'), M('d-lites', 'دي لايتس', 'D-Lites'), M('arch-fit', 'آرتش فت', 'Arch Fit')
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
    {
      id: 'police', nameAr: 'بوليس', nameFr: 'Police', sector: 'eyewear',
      categories: ['أزياء'], color: '#111111', letter: 'PL',
      aliases: ['police', 'بوليس'],
      models: [
        M('origins', 'أوريجينز', 'Origins'), M('lifestyle', 'لايف ستايل', 'Lifestyle')
      ]
    },
    {
      id: 'tom-ford', nameAr: 'توم فورد', nameFr: 'Tom Ford', sector: 'eyewear',
      categories: ['أزياء'], color: '#111111', letter: 'TF',
      aliases: ['tom ford', 'توم فورد'],
      models: [
        M('ft', 'FT', 'FT'), M('private', 'برايفت', 'Private')
      ]
    },

    /* ── إلكترونيات شائعة (ماركة فقط + خطوط) ── */
    {
      id: 'apple', nameAr: 'آبل', nameFr: 'Apple', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#555555', letter: 'AP',
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
    },
    {
      id: 'huawei', nameAr: 'هواوي', nameFr: 'Huawei', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#CF0A2C', letter: 'HW',
      aliases: ['huawei', 'هواوي'],
      models: [
        M('p-series', 'سلسلة P', 'P Series'), M('mate', 'ميت', 'Mate'),
        M('nova', 'نوفا', 'Nova'), M('watch-gt', 'Watch GT', 'Watch GT')
      ]
    },
    {
      id: 'oppo', nameAr: 'أوبو', nameFr: 'OPPO', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#1BA784', letter: 'OP',
      aliases: ['oppo', 'أوبو', 'اوبو'],
      models: [
        M('find-x', 'Find X', 'Find X'), M('reno', 'رينو', 'Reno'), M('a-series', 'سلسلة A', 'A Series')
      ]
    },
    {
      id: 'vivo', nameAr: 'فيفو', nameFr: 'vivo', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#415FFF', letter: 'VI',
      aliases: ['vivo', 'فيفو'],
      models: [
        M('x-series', 'سلسلة X', 'X Series'), M('v-series', 'سلسلة V', 'V Series'), M('y-series', 'سلسلة Y', 'Y Series')
      ]
    },
    {
      id: 'realme', nameAr: 'ريلمي', nameFr: 'realme', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#FFC915', letter: 'RM',
      aliases: ['realme', 'ريلمي'],
      models: [
        M('gt', 'GT', 'GT'), M('narzo', 'نارزو', 'Narzo'), M('c-series', 'سلسلة C', 'C Series')
      ]
    },
    {
      id: 'honor', nameAr: 'هونر', nameFr: 'Honor', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#111111', letter: 'HO',
      aliases: ['honor', 'هونر'],
      models: [
        M('magic', 'ماجيك', 'Magic'), M('x-series', 'سلسلة X', 'X Series'), M('watch', 'ساعة', 'Watch')
      ]
    },
    {
      id: 'sony', nameAr: 'سوني', nameFr: 'Sony', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#111111', letter: 'SO',
      aliases: ['sony', 'سوني'],
      models: [
        M('xperia', 'إكسبيريا', 'Xperia'), M('bravia', 'برافيا', 'Bravia'),
        M('playstation', 'بلايستيشن', 'PlayStation'), M('wh1000', 'WH-1000', 'WH-1000')
      ]
    },
    {
      id: 'lg', nameAr: 'إل جي', nameFr: 'LG', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#A50034', letter: 'LG',
      aliases: ['lg', 'إل جي', 'ال جي'],
      models: [
        M('oled', 'OLED', 'OLED'), M('gram', 'جرام', 'Gram'), M('soundbar', 'ساوند بار', 'Soundbar')
      ]
    },
    {
      id: 'lenovo', nameAr: 'لينوفو', nameFr: 'Lenovo', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#E2231A', letter: 'LE',
      aliases: ['lenovo', 'لينوفو'],
      models: [
        M('thinkpad', 'ثينك باد', 'ThinkPad'), M('ideapad', 'آيديا باد', 'IdeaPad'), M('legion', 'ليجون', 'Legion')
      ]
    },
    {
      id: 'hp', nameAr: 'إتش بي', nameFr: 'HP', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#0096D6', letter: 'HP',
      aliases: ['hp', 'hewlett', 'إتش بي', 'اتش بي'],
      models: [
        M('pavilion', 'بافيليون', 'Pavilion'), M('elitebook', 'إيليت بوك', 'EliteBook'), M('omen', 'أومن', 'OMEN')
      ]
    },
    {
      id: 'dell', nameAr: 'ديل', nameFr: 'Dell', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#007DB8', letter: 'DE',
      aliases: ['dell', 'ديل'],
      models: [
        M('xps', 'XPS', 'XPS'), M('inspiron', 'إنسبايرون', 'Inspiron'), M('alienware', 'أليان وير', 'Alienware')
      ]
    },
    {
      id: 'asus', nameAr: 'أسوس', nameFr: 'ASUS', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#000000', letter: 'AS',
      aliases: ['asus', 'أسوس', 'اسوس'],
      models: [
        M('zenbook', 'زين بوك', 'Zenbook'), M('vivobook', 'فيفو بوك', 'Vivobook'), M('rog', 'ROG', 'ROG')
      ]
    },
    {
      id: 'nokia', nameAr: 'نوكيا', nameFr: 'Nokia', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#124191', letter: 'NK',
      aliases: ['nokia', 'نوكيا'],
      models: [
        M('g-series', 'سلسلة G', 'G Series'), M('x-series', 'سلسلة X', 'X Series'), M('c-series', 'سلسلة C', 'C Series')
      ]
    },
    {
      id: 'tecno', nameAr: 'تكنو', nameFr: 'TECNO', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#00AEEF', letter: 'TE',
      aliases: ['tecno', 'تكنو'],
      models: [
        M('spark', 'سبارك', 'Spark'), M('camon', 'كامون', 'Camon'), M('phantom', 'فانتوم', 'Phantom')
      ]
    },
    {
      id: 'infinix', nameAr: 'إنفينيكس', nameFr: 'Infinix', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#111111', letter: 'IX',
      aliases: ['infinix', 'إنفينيكس', 'انفينكس'],
      models: [
        M('note', 'نوت', 'Note'), M('hot', 'هوت', 'Hot'), M('zero', 'زيرو', 'Zero')
      ]
    },
    {
      id: 'itel', nameAr: 'ايتل', nameFr: 'itel', sector: 'electronics',
      categories: ['إلكترونيات'], color: '#FF6A00', letter: 'IT',
      aliases: ['itel', 'ايتل', 'أيتل'],
      models: [
        M('a-series', 'سلسلة A', 'A Series'), M('p-series', 'سلسلة P', 'P Series'), M('s-series', 'سلسلة S', 'S Series')
      ]
    },

    /* ── أثاث ومعارض ── */
    {
      id: 'ikea', nameAr: 'إيكيا', nameFr: 'IKEA', sector: 'furniture',
      categories: ['أثاث'], color: '#0051BA', letter: 'IK',
      aliases: ['ikea', 'إيكيا', 'ايكيا'],
      models: [
        M('billy', 'بيلي', 'Billy'), M('malm', 'مالم', 'Malm'), M('kallax', 'كالاكس', 'Kallax')
      ]
    },
    {
      id: 'home-centre', nameAr: 'هوم سنتر', nameFr: 'Home Centre', sector: 'furniture',
      categories: ['أثاث'], color: '#C8102E', letter: 'HC',
      aliases: ['home centre', 'homecentre', 'هوم سنتر'],
      models: [
        M('living', 'معيشة', 'Living'), M('bedroom', 'غرف نوم', 'Bedroom'), M('dining', 'سفرة', 'Dining')
      ]
    },
    {
      id: 'pan-emirates', nameAr: 'بان إميريتس', nameFr: 'Pan Emirates', sector: 'furniture',
      categories: ['أثاث'], color: '#8B0000', letter: 'PE',
      aliases: ['pan emirates', 'بان إميريتس', 'بان امارات'],
      models: [
        M('sofa', 'كنب', 'Sofa'), M('dining', 'سفرة', 'Dining'), M('office', 'مكتب', 'Office')
      ]
    },
    {
      id: 'danube', nameAr: 'دانوب', nameFr: 'Danube', sector: 'furniture',
      categories: ['أثاث'], color: '#003399', letter: 'DN',
      aliases: ['danube', 'دانوب'],
      models: [
        M('home', 'منزلي', 'Home'), M('kitchen', 'مطبخ', 'Kitchen'), M('decor', 'ديكور', 'Décor')
      ]
    },

    /* ── مجوهرات وساعات ── */
    {
      id: 'rolex', nameAr: 'رولكس', nameFr: 'Rolex', sector: 'jewelry',
      categories: ['مجوهرات', 'ذهب', 'أزياء'], color: '#006039', letter: 'RX',
      aliases: ['rolex', 'رولكس'],
      models: [
        M('submariner', 'سابمارينر', 'Submariner'), M('datejust', 'داتجست', 'Datejust'), M('daytona', 'دايتونا', 'Daytona')
      ]
    },
    {
      id: 'cartier', nameAr: 'كارتييه', nameFr: 'Cartier', sector: 'jewelry',
      categories: ['مجوهرات', 'ذهب', 'أزياء'], color: '#C4A35A', letter: 'CA',
      aliases: ['cartier', 'كارتييه', 'كارتيي'],
      models: [
        M('love', 'لوف', 'Love'), M('tank', 'تانك', 'Tank'), M('juste', 'جوست', 'Juste un Clou')
      ]
    },
    {
      id: 'swatch', nameAr: 'سواتش', nameFr: 'Swatch', sector: 'jewelry',
      categories: ['مجوهرات', 'ذهب', 'أزياء'], color: '#E30613', letter: 'SW',
      aliases: ['swatch', 'سواتش'],
      models: [
        M('originals', 'أوريجينال', 'Originals'), M('irony', 'آيروني', 'Irony'), M('sistem51', 'سيستم 51', 'Sistem51')
      ]
    },
    {
      id: 'casio', nameAr: 'كاسيو', nameFr: 'Casio', sector: 'jewelry',
      categories: ['مجوهرات', 'ذهب', 'أزياء', 'إلكترونيات'], color: '#1A1A1A', letter: 'CS',
      aliases: ['casio', 'كاسيو', 'g-shock', 'جي شوك'],
      models: [
        M('g-shock', 'جي شوك', 'G-Shock'), M('edifice', 'إيديفيس', 'Edifice'), M('sheen', 'شين', 'Sheen')
      ]
    },
    {
      id: 'tissot', nameAr: 'تيسو', nameFr: 'Tissot', sector: 'jewelry',
      categories: ['مجوهرات', 'ذهب', 'أزياء'], color: '#C4A35A', letter: 'TI',
      aliases: ['tissot', 'تيسو'],
      models: [
        M('prx', 'PRX', 'PRX'), M('seastar', 'سي ستار', 'Seastar'), M('tradition', 'تراديسيون', 'Tradition')
      ]
    },
    {
      id: 'pandora', nameAr: 'باندورا', nameFr: 'Pandora', sector: 'jewelry',
      categories: ['مجوهرات', 'ذهب', 'أزياء'], color: '#6B2D5C', letter: 'PD',
      aliases: ['pandora', 'باندورا'],
      models: [
        M('charm', 'تشارم', 'Charm'), M('bracelet', 'سوار', 'Bracelet'), M('ring', 'خاتم', 'Ring')
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

  /** شارة HTML صغيرة للبطاقات — شعار + اسم معاً */
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
      + '<img class="rzq-brand-chip-logo" src="' + esc(logoDataUri(brand, size * 2)) + '" alt="' + esc(displayName(brand, fr)) + '" width="' + size + '" height="' + size + '" style="border-radius:50%;flex-shrink:0"/>'
      + '<span class="rzq-brand-chip-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(label) + '</span>'
      + '</span>';
  }

  /**
   * صف واضح: شعار الماركة + اسمها (لبطاقات الإطلالات / المعارض — أسلوب أمازون)
   */
  function logoNameHtml(brandId, opts) {
    opts = opts || {};
    var brand = getById(brandId);
    if (!brand) return '';
    var fr = !!opts.fr;
    var size = opts.size || 28;
    var name = displayName(brand, fr);
    var model = opts.modelId ? getModel(brandId, opts.modelId) : null;
    var sub = model ? modelName(model, fr) : '';
    return '<div class="rzq-brand-logo-name" data-brand-id="' + esc(brand.id) + '" title="' + esc(name) + '">'
      + '<img class="rzq-brand-logo-name-img" src="' + esc(logoDataUri(brand, size * 2)) + '" alt="' + esc(name) + '" width="' + size + '" height="' + size + '"/>'
      + '<span class="rzq-brand-logo-name-text">'
      +   '<span class="rzq-brand-logo-name-main">' + esc(name) + '</span>'
      +   (sub ? '<span class="rzq-brand-logo-name-sub">' + esc(sub) + '</span>' : '')
      + '</span>'
      + '</div>';
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

  /** شريط شعارات أفقي — كل زر: شعار + اسم واضحين */
  function stripHtml(catKey, fr, opts) {
    opts = opts || {};
    var brands = forCategory(catKey);
    if (!brands.length) return '';
    var active = opts.activeId || '';
    var head = opts.heading != null
      ? opts.heading
      : (fr ? 'Shop by Brand' : 'تسوّق حسب الماركة');
    var headHtml = head
      ? '<div class="rzq-brand-strip-head"><span class="rzq-brand-strip-head-label">' + esc(head) + '</span></div>'
      : '';
    return '<div class="rzq-brand-strip-panel">'
      + headHtml
      + '<div class="rzq-brand-strip" role="list" aria-label="' + esc(head || (fr ? 'Marques' : 'الماركات')) + '">'
      + brands.map(function (b) {
        var on = active && String(active) === String(b.id);
        var name = displayName(b, fr);
        return '<button type="button" class="rzq-brand-strip-btn' + (on ? ' is-on' : '') + '" data-brand-id="' + esc(b.id) + '" title="' + esc(name) + '" role="listitem" aria-label="' + esc(name) + '">'
          + '<span class="rzq-brand-strip-logo">'
          +   '<img src="' + esc(logoDataUri(b, 96)) + '" alt="' + esc(name) + '" width="48" height="48"/>'
          + '</span>'
          + '<span class="rzq-brand-strip-name">' + esc(name) + '</span>'
          + '</button>';
      }).join('')
      + '</div></div>';
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
    logoNameHtml: logoNameHtml,
    fillBrandSelect: fillBrandSelect,
    fillModelSelect: fillModelSelect,
    stripHtml: stripHtml,
    sectors: {
      auto: 'auto', fashion: 'fashion', sports: 'sports', eyewear: 'eyewear',
      electronics: 'electronics', furniture: 'furniture', jewelry: 'jewelry'
    }
  };
})(typeof window !== 'undefined' ? window : this);
