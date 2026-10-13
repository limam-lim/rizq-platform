/**
 * rizq_dyn_filters.js — فلاتر ديناميكية حسب القسم (سيارات، شاحنات، معدات، إلكترونيات، أغذية…)
 * يظهر فقط ما يخص القسم المختار — بدون نصوص تقنية للزائر.
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var YEAR_MAX = new Date().getFullYear() + 1;
  var YEAR_MIN = 1990;

  /** ملفات فلتر لكل عائلة أقسام */
  var PROFILES = {
    سيارات: {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        {
          id: 'year',
          type: 'year-range',
          labelAr: 'سنة التصنيع',
          labelFr: 'Année de fabrication'
        },
        {
          id: 'km',
          type: 'num-range',
          labelAr: 'الكيلومترات',
          labelFr: 'Kilométrage',
          minKey: 'kmMin',
          maxKey: 'kmMax',
          minPhAr: 'من',
          maxPhAr: 'إلى',
          minPhFr: 'De',
          maxPhFr: 'À',
          unitAr: 'كم',
          unitFr: 'km'
        },
        {
          id: 'gearbox',
          type: 'chips',
          labelAr: 'علبة التروس',
          labelFr: 'Boîte de vitesses',
          name: 'rgear',
          options: [
            { v: 'auto', ar: 'أوتوماتيك', fr: 'Automatique' },
            { v: 'manual', ar: 'يدوي', fr: 'Manuelle' }
          ]
        },
        {
          id: 'fuel',
          type: 'chips',
          labelAr: 'الوقود',
          labelFr: 'Carburant',
          name: 'rfuel',
          options: [
            { v: 'petrol', ar: 'بنزين', fr: 'Essence' },
            { v: 'diesel', ar: 'ديزل', fr: 'Diesel' },
            { v: 'hybrid', ar: 'هجين', fr: 'Hybride' },
            { v: 'electric', ar: 'كهربائي', fr: 'Électrique' }
          ]
        }
      ]
    },
    شاحنات: {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        {
          id: 'year',
          type: 'year-range',
          labelAr: 'سنة التصنيع',
          labelFr: 'Année de fabrication'
        },
        {
          id: 'payload',
          type: 'chips',
          labelAr: 'الحمولة',
          labelFr: 'Charge utile',
          name: 'rpayload',
          options: [
            { v: '0-5', ar: 'حتى 5 طن', fr: 'Jusqu\'à 5 t' },
            { v: '5-15', ar: '5 — 15 طن', fr: '5 — 15 t' },
            { v: '15-30', ar: '15 — 30 طن', fr: '15 — 30 t' },
            { v: '30-999', ar: 'أكثر من 30 طن', fr: 'Plus de 30 t' }
          ]
        },
        {
          id: 'hours',
          type: 'num-range',
          labelAr: 'ساعات العمل (معدات)',
          labelFr: 'Heures de service',
          minKey: 'hoursMin',
          maxKey: 'hoursMax',
          minPhAr: 'من',
          maxPhAr: 'إلى',
          minPhFr: 'De',
          maxPhFr: 'À',
          unitAr: 'ساعة',
          unitFr: 'h',
          whenSubcat: /معدات|زراعية|بناء/
        }
      ]
    },
    إلكترونيات: {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        {
          id: 'variant',
          type: 'chips',
          labelAr: 'الفئة / الإصدار',
          labelFr: 'Variante',
          name: 'rvariant',
          options: [
            { v: 'base', ar: 'عادي', fr: 'Standard' },
            { v: 'plus', ar: 'بلس', fr: 'Plus' },
            { v: 'pro', ar: 'برو', fr: 'Pro' },
            { v: 'pro-max', ar: 'برو ماكس', fr: 'Pro Max' },
            { v: 'ultra', ar: 'ألترا', fr: 'Ultra' }
          ]
        },
        {
          id: 'storage',
          type: 'chips',
          labelAr: 'السعة',
          labelFr: 'Stockage',
          name: 'rstorage',
          options: [
            { v: '64', ar: '64 GB', fr: '64 Go' },
            { v: '128', ar: '128 GB', fr: '128 Go' },
            { v: '256', ar: '256 GB', fr: '256 Go' },
            { v: '512', ar: '512 GB', fr: '512 Go' },
            { v: '1024', ar: '1 TB', fr: '1 To' }
          ]
        }
      ]
    },
    أزياء: {
      brand: true,
      model: true,
      rooms: false,
      condition: true,
      fields: [
        {
          id: 'size',
          type: 'chips',
          labelAr: 'المقاس',
          labelFr: 'Taille',
          name: 'rsize',
          options: [
            { v: 'xs', ar: 'XS', fr: 'XS' },
            { v: 's', ar: 'S', fr: 'S' },
            { v: 'm', ar: 'M', fr: 'M' },
            { v: 'l', ar: 'L', fr: 'L' },
            { v: 'xl', ar: 'XL', fr: 'XL' },
            { v: 'xxl', ar: 'XXL', fr: 'XXL' },
            { v: '40', ar: '40', fr: '40' },
            { v: '41', ar: '41', fr: '41' },
            { v: '42', ar: '42', fr: '42' },
            { v: '43', ar: '43', fr: '43' },
            { v: '44', ar: '44', fr: '44' }
          ]
        },
        {
          id: 'gender',
          type: 'chips',
          labelAr: 'الفئة',
          labelFr: 'Genre',
          name: 'rgender',
          options: [
            { v: 'men', ar: 'رجالي', fr: 'Homme' },
            { v: 'women', ar: 'نسائي', fr: 'Femme' },
            { v: 'kids', ar: 'أطفال', fr: 'Enfant' },
            { v: 'unisex', ar: 'للجنسين', fr: 'Unisexe' }
          ]
        }
      ]
    },
    ذهب: {
      brand: true,
      model: false,
      rooms: false,
      condition: false,
      fields: [
        {
          id: 'karat',
          type: 'chips',
          labelAr: 'العيار',
          labelFr: 'Titre',
          name: 'rkarat',
          options: [
            { v: '24', ar: 'عيار 24', fr: '24 carats' },
            { v: '22', ar: 'عيار 22', fr: '22 carats' },
            { v: '21', ar: 'عيار 21', fr: '21 carats' },
            { v: '18', ar: 'عيار 18', fr: '18 carats' }
          ]
        },
        {
          id: 'weight',
          type: 'num-range',
          labelAr: 'الوزن (غرام)',
          labelFr: 'Poids (g)',
          minKey: 'weightMin',
          maxKey: 'weightMax',
          minPhAr: 'من',
          maxPhAr: 'إلى',
          minPhFr: 'De',
          maxPhFr: 'À',
          unitAr: 'غ',
          unitFr: 'g'
        }
      ]
    },
    عقارات: {
      brand: false,
      model: false,
      rooms: true,
      condition: false,
      fields: [
        {
          id: 'furnish',
          type: 'chips',
          labelAr: 'التأثيث',
          labelFr: 'Ameublement',
          name: 'rfurnish',
          options: [
            { v: 'furnished', ar: 'مفروش', fr: 'Meublé' },
            { v: 'semi', ar: 'نصف مفروش', fr: 'Semi-meublé' },
            { v: 'empty', ar: 'فارغ', fr: 'Vide' }
          ]
        }
      ]
    },
    أغذية: {
      brand: false,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        {
          id: 'foodForm',
          type: 'chips',
          labelAr: 'الشكل',
          labelFr: 'Forme',
          name: 'rfoodform',
          options: [
            { v: 'fresh', ar: 'طازج', fr: 'Frais' },
            { v: 'canned', ar: 'معلب', fr: 'En conserve' },
            { v: 'frozen', ar: 'مجمّد', fr: 'Surgelé' },
            { v: 'dry', ar: 'جاف', fr: 'Sec' }
          ]
        },
        {
          id: 'foodUnit',
          type: 'chips',
          labelAr: 'وحدة البيع',
          labelFr: 'Unité',
          name: 'rfoodunit',
          options: [
            { v: 'kg', ar: 'بالكيلو', fr: 'Au kg' },
            { v: 'piece', ar: 'بالقطعة', fr: 'À la pièce' },
            { v: 'pack', ar: 'عبوة', fr: 'Paquet' },
            { v: 'box', ar: 'صندوق', fr: 'Caisse' }
          ]
        }
      ]
    },
    ماشية: {
      brand: false,
      model: false,
      rooms: false,
      condition: true,
      fields: [
        {
          id: 'livestockCount',
          type: 'num-range',
          labelAr: 'العدد',
          labelFr: 'Quantité',
          minKey: 'countMin',
          maxKey: 'countMax',
          minPhAr: 'من',
          maxPhAr: 'إلى',
          minPhFr: 'De',
          maxPhFr: 'À',
          unitAr: 'رأس',
          unitFr: 'têtes'
        }
      ]
    }
  };

  var ALIAS = {
    'ذهب ومجوهرات': 'ذهب',
    'أغذية ومطاعم': 'أغذية',
    'ماشية ودواجن': 'ماشية',
    'ماشية ودواجن وبيطرة': 'ماشية',
    'معدات-منزل': 'إلكترونيات',
    'أجهزة منزلية': 'إلكترونيات'
  };

  function profileFor(catKey) {
    var key = String(catKey || '').trim();
    if (!key) return null;
    if (PROFILES[key]) return PROFILES[key];
    if (ALIAS[key] && PROFILES[ALIAS[key]]) return PROFILES[ALIAS[key]];
    if (typeof global.RizqCategories !== 'undefined' && typeof global.RizqCategories.normalize === 'function') {
      var n = global.RizqCategories.normalize(key);
      if (PROFILES[n]) return PROFILES[n];
      if (ALIAS[n] && PROFILES[ALIAS[n]]) return PROFILES[ALIAS[n]];
    }
    return null;
  }

  function fieldVisible(field, subcat) {
    if (!field.whenSubcat) return true;
    return field.whenSubcat.test(String(subcat || ''));
  }

  function renderField(field, fr, state) {
    state = state || {};
    if (field.type === 'year-range') {
      var yFrom = state.yearFrom || '';
      var yTo = state.yearTo || '';
      var opts = [];
      for (var y = YEAR_MAX; y >= YEAR_MIN; y--) {
        opts.push('<option value="' + y + '">' + y + '</option>');
      }
      return '<div class="filter-section rzq-dyn-field" data-dyn-id="year">'
        + '<div class="filter-title"><span>' + esc(fr ? field.labelFr : field.labelAr) + '</span>'
        + '<button type="button" class="rzq-dyn-clear" data-clear="year">' + (fr ? 'Effacer' : 'مسح') + '</button></div>'
        + '<div class="rzq-dyn-range-row">'
        + '<select class="wilaya-select" id="dyn-year-from" data-dyn="yearFrom" aria-label="' + (fr ? 'From year' : 'من سنة') + '">'
        + '<option value="">' + (fr ? 'De' : 'من') + '</option>' + opts.join('') + '</select>'
        + '<span class="price-sep">—</span>'
        + '<select class="wilaya-select" id="dyn-year-to" data-dyn="yearTo" aria-label="' + (fr ? 'To year' : 'إلى سنة') + '">'
        + '<option value="">' + (fr ? 'À' : 'إلى') + '</option>' + opts.join('') + '</select>'
        + '</div></div>';
    }
    if (field.type === 'num-range') {
      return '<div class="filter-section rzq-dyn-field" data-dyn-id="' + esc(field.id) + '">'
        + '<div class="filter-title"><span>' + esc(fr ? field.labelFr : field.labelAr) + '</span>'
        + '<button type="button" class="rzq-dyn-clear" data-clear="' + esc(field.id) + '">' + (fr ? 'Effacer' : 'مسح') + '</button></div>'
        + '<div class="rzq-dyn-range-row">'
        + '<input type="number" class="price-input" id="dyn-' + esc(field.minKey) + '" data-dyn="' + esc(field.minKey) + '" placeholder="' + esc(fr ? field.minPhFr : field.minPhAr) + '" min="0"/>'
        + '<span class="price-sep">—</span>'
        + '<input type="number" class="price-input" id="dyn-' + esc(field.maxKey) + '" data-dyn="' + esc(field.maxKey) + '" placeholder="' + esc(fr ? field.maxPhFr : field.maxPhAr) + '" min="0"/>'
        + '</div>'
        + '<div class="rzq-dyn-unit">' + esc(fr ? field.unitFr : field.unitAr) + '</div>'
        + '</div>';
    }
    if (field.type === 'chips') {
      var chips = (field.options || []).map(function (o) {
        return '<label class="filter-option rzq-dyn-chip"><input type="radio" name="' + esc(field.name) + '" value="' + esc(o.v) + '" class="filter-cb" data-dyn-chip="' + esc(field.id) + '"/>'
          + '<span class="filter-label">' + esc(fr ? o.fr : o.ar) + '</span></label>';
      }).join('');
      return '<div class="filter-section rzq-dyn-field" data-dyn-id="' + esc(field.id) + '">'
        + '<div class="filter-title"><span>' + esc(fr ? field.labelFr : field.labelAr) + '</span>'
        + '<button type="button" class="rzq-dyn-clear" data-clear="' + esc(field.id) + '">' + (fr ? 'Effacer' : 'مسح') + '</button></div>'
        + '<div class="chips rzq-dyn-chips">' + chips + '</div></div>';
    }
    return '';
  }

  function render(catKey, fr, opts) {
    opts = opts || {};
    var profile = profileFor(catKey);
    var mount = opts.mount || document.getElementById('dyn-filters-mount');
    if (!mount) return profile;
    if (!profile || !profile.fields || !profile.fields.length) {
      mount.innerHTML = '';
      mount.hidden = true;
      return profile;
    }
    var subcat = opts.subcat || '';
    var html = profile.fields
      .filter(function (f) { return fieldVisible(f, subcat); })
      .map(function (f) { return renderField(f, !!fr, opts.state || {}); })
      .join('');
    mount.innerHTML = html;
    mount.hidden = !html;
    bind(mount, opts.onChange);
    return profile;
  }

  function bind(mount, onChange) {
    if (!mount) return;
    function fire() {
      if (typeof onChange === 'function') onChange(readState(mount));
      else if (typeof global.applyFilters === 'function') global.applyFilters();
    }
    mount.querySelectorAll('[data-dyn], [data-dyn-chip]').forEach(function (el) {
      el.addEventListener('change', fire);
      if (el.tagName === 'INPUT' && el.type === 'number') {
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') fire();
        });
      }
    });
    mount.querySelectorAll('.rzq-dyn-clear').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-clear');
        var section = mount.querySelector('[data-dyn-id="' + id + '"]');
        if (!section) return;
        section.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
        section.querySelectorAll('input[type="number"], select').forEach(function (i) { i.value = ''; });
        fire();
      });
    });
  }

  function readState(root) {
    root = root || document.getElementById('dyn-filters-mount');
    var st = {};
    if (!root) return st;
    root.querySelectorAll('[data-dyn]').forEach(function (el) {
      var k = el.getAttribute('data-dyn');
      var v = el.value;
      if (v !== '' && v != null) st[k] = v;
    });
    root.querySelectorAll('input[data-dyn-chip]:checked').forEach(function (el) {
      st[el.getAttribute('data-dyn-chip')] = el.value;
    });
    return st;
  }

  function clearAll() {
    var root = document.getElementById('dyn-filters-mount');
    if (!root) return;
    root.querySelectorAll('input[type="radio"]').forEach(function (r) { r.checked = false; });
    root.querySelectorAll('input[type="number"], select').forEach(function (i) { i.value = ''; });
  }

  function adYear(ad) {
    if (!ad) return 0;
    if (ad.year) return parseInt(ad.year, 10) || 0;
    var m = String(ad.title || '').match(/\b(19|20)\d{2}\b/);
    return m ? parseInt(m[0], 10) : 0;
  }

  function adKm(ad) {
    if (!ad) return null;
    if (ad.mileageKm != null) return Number(ad.mileageKm);
    if (ad.km != null) return Number(ad.km);
    var m = String(ad.desc || '').replace(/,/g, '').match(/(\d+)\s*كم/);
    if (m) return parseInt(m[1], 10);
    m = String(ad.descFr || ad.desc || '').replace(/\s/g, '').match(/(\d+)\s*km/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function matches(ad, state, catKey) {
    state = state || {};
    if (!ad) return false;
    var y = adYear(ad);
    if (state.yearFrom && y && y < parseInt(state.yearFrom, 10)) return false;
    if (state.yearTo && y && y > parseInt(state.yearTo, 10)) return false;
    if ((state.yearFrom || state.yearTo) && !y) return false;

    var km = adKm(ad);
    if (state.kmMin && (km == null || km < parseInt(state.kmMin, 10))) return false;
    if (state.kmMax && (km == null || km > parseInt(state.kmMax, 10))) return false;

    if (state.gearbox) {
      var g = String(ad.gearbox || ad.transmission || '').toLowerCase();
      var blob = [ad.title, ad.desc, ad.titleFr, ad.descFr].join(' ').toLowerCase();
      if (state.gearbox === 'auto') {
        if (!(g === 'auto' || g === 'automatic' || /أوتو|اتومات|automat/.test(blob))) return false;
      } else if (state.gearbox === 'manual') {
        if (!(g === 'manual' || /يدوي|manuelle|manual/.test(blob))) return false;
      }
    }

    if (state.fuel) {
      var fuel = String(ad.fuel || '').toLowerCase();
      var fblob = [ad.title, ad.desc, fuel].join(' ').toLowerCase();
      var fuelMap = {
        petrol: /بنزين|essence|petrol|gasoline/,
        diesel: /ديزل|diesel/,
        hybrid: /هجين|hybrid/,
        electric: /كهرب|electric|év|ev\b/
      };
      if (fuelMap[state.fuel] && !fuelMap[state.fuel].test(fblob) && fuel !== state.fuel) return false;
    }

    if (state.payload) {
      var tons = ad.payloadTons != null ? Number(ad.payloadTons) : null;
      if (tons == null) {
        var pm = String(ad.title + ' ' + ad.desc).match(/(\d+)\s*طن/);
        tons = pm ? parseFloat(pm[1]) : null;
      }
      if (tons == null) return false;
      var parts = String(state.payload).split('-');
      var a = parseFloat(parts[0]), b = parseFloat(parts[1]);
      if (tons < a || tons > b) return false;
    }

    if (state.hoursMin || state.hoursMax) {
      var hours = ad.hoursWorked != null ? Number(ad.hoursWorked) : null;
      if (hours == null) {
        var hm = String(ad.desc || '').match(/(\d+)\s*ساعة/);
        hours = hm ? parseInt(hm[1], 10) : null;
      }
      if (hours == null) return false;
      if (state.hoursMin && hours < parseInt(state.hoursMin, 10)) return false;
      if (state.hoursMax && hours > parseInt(state.hoursMax, 10)) return false;
    }

    if (state.variant) {
      var v = String(ad.phoneVariant || ad.variant || '').toLowerCase();
      var vblob = [ad.title, ad.titleFr, ad.modelName, ad.modelNameFr, v].join(' ').toLowerCase();
      if (state.variant === 'pro-max') {
        if (!/pro\s*max|برو\s*ماكس/.test(vblob)) return false;
      } else if (state.variant === 'pro') {
        if (!/(\bpro\b|برو)/.test(vblob) || /pro\s*max|برو\s*ماكس/.test(vblob)) return false;
      } else if (state.variant === 'plus') {
        if (!/\bplus\b|بلس/.test(vblob)) return false;
      } else if (state.variant === 'ultra') {
        if (!/\bultra\b|ألترا|الترا/.test(vblob)) return false;
      } else if (state.variant === 'base') {
        if (/pro\s*max|برو\s*ماكس|\bpro\b|برو|\bplus\b|بلس|\bultra\b|ألترا/.test(vblob)) return false;
      } else if (v && v !== state.variant) {
        return false;
      }
    }

    if (state.storage) {
      var st = String(ad.storageGb || ad.storage || '');
      var sblob = [ad.title, ad.desc, st].join(' ');
      if (state.storage === '1024') {
        if (!/1\s*t|1024/i.test(sblob)) return false;
      } else if (!(new RegExp(state.storage + '\\s*g', 'i').test(sblob) || st === state.storage)) {
        return false;
      }
    }

    if (state.size) {
      var sz = String(ad.size || '').toLowerCase();
      var szblob = [ad.title, ad.desc, sz].join(' ').toLowerCase();
      if (sz !== state.size && szblob.indexOf(String(state.size).toLowerCase()) < 0
        && !new RegExp('مقاس\\s*' + state.size + '|pointure\\s*' + state.size + '|taille\\s*' + state.size, 'i').test(szblob)) {
        return false;
      }
    }

    if (state.gender) {
      var gen = String(ad.gender || '').toLowerCase();
      var gblob = [ad.title, ad.desc, gen].join(' ').toLowerCase();
      var gMap = {
        men: /رجالي|homme|men|male/,
        women: /نسائي|femme|women|woman/,
        kids: /أطفال|enfant|kids|child/,
        unisex: /للجنسين|unisex/
      };
      if (gMap[state.gender] && !gMap[state.gender].test(gblob) && gen !== state.gender) return false;
    }

    if (state.karat) {
      var kblob = [ad.title, ad.desc, ad.subcat, ad.karat].join(' ');
      if (!(new RegExp('عيار\\s*' + state.karat + '|' + state.karat + '\\s*carat', 'i').test(kblob)
        || String(ad.karat) === state.karat)) return false;
    }

    if (state.weightMin || state.weightMax) {
      var w = ad.weightGrams != null ? Number(ad.weightGrams) : null;
      if (w == null) {
        var wm = String(ad.title + ' ' + ad.desc).match(/(\d+)\s*غ/);
        w = wm ? parseFloat(wm[1]) : null;
      }
      if (w == null) return false;
      if (state.weightMin && w < parseFloat(state.weightMin)) return false;
      if (state.weightMax && w > parseFloat(state.weightMax)) return false;
    }

    if (state.furnish) {
      var fblob = [ad.title, ad.desc, ad.furnish].join(' ').toLowerCase();
      var fMap = {
        furnished: /مفروش|meublé|furnished/,
        semi: /نصف مفروش|semi/,
        empty: /فارغ|vide|empty|غير مفروش/
      };
      if (fMap[state.furnish] && !fMap[state.furnish].test(fblob)) return false;
    }

    if (state.foodForm) {
      var ff = String(ad.foodForm || '').toLowerCase();
      var ffblob = [ad.title, ad.desc, ff].join(' ').toLowerCase();
      var ffMap = {
        fresh: /طازج|frais|fresh/,
        canned: /معلب|conserve|canned/,
        frozen: /مجمّد|مجمد|surgel|frozen/,
        dry: /جاف|sec|dry/
      };
      if (ffMap[state.foodForm] && !ffMap[state.foodForm].test(ffblob) && ff !== state.foodForm) return false;
    }

    if (state.foodUnit) {
      var fu = String(ad.foodUnit || '').toLowerCase();
      var fublob = [ad.title, ad.desc, ad.price, fu].join(' ').toLowerCase();
      var fuMap = {
        kg: /كيلو|kg|كغ/,
        piece: /قطعة|pièce|piece/,
        pack: /عبوة|paquet|pack/,
        box: /صندوق|caisse|box/
      };
      if (fuMap[state.foodUnit] && !fuMap[state.foodUnit].test(fublob) && fu !== state.foodUnit) return false;
    }

    if (state.countMin || state.countMax) {
      var cnt = ad.headCount != null ? Number(ad.headCount) : null;
      if (cnt == null) {
        var cm = String(ad.title + ' ' + ad.desc).match(/(\d+)\s*(رأس|رؤوس)/);
        cnt = cm ? parseInt(cm[1], 10) : null;
      }
      if (cnt == null) return false;
      if (state.countMin && cnt < parseInt(state.countMin, 10)) return false;
      if (state.countMax && cnt > parseInt(state.countMax, 10)) return false;
    }

    return true;
  }

  function syncVisibility(catKey) {
    var profile = profileFor(catKey);
    var brandSec = document.getElementById('brand-filter-section');
    var roomsSec = document.getElementById('rooms-filter-section');
    var condSec = document.getElementById('condition-filter-section');
    var modelSel = document.getElementById('model-select');
    var brandSel = document.getElementById('brand-select');

    if (!catKey) {
      /* كل الأقسام: أخفِ الفلاتر الخاصة، أبقِ العامة */
      if (brandSec) brandSec.style.display = 'none';
      if (roomsSec) roomsSec.style.display = 'none';
      var mount = document.getElementById('dyn-filters-mount');
      if (mount) { mount.innerHTML = ''; mount.hidden = true; }
      return null;
    }

    if (brandSec) {
      var showBrand = !!(profile && profile.brand);
      if (showBrand && global.RizqBrands && typeof global.RizqBrands.forCategory === 'function') {
        showBrand = global.RizqBrands.forCategory(catKey).length > 0;
      }
      brandSec.style.display = showBrand ? '' : 'none';
    }
    if (modelSel) {
      var showModel = !!(profile && profile.model);
      modelSel.style.display = showModel ? '' : 'none';
      if (brandSel && showModel) {
        /* model already toggled by brand fill */
      }
    }
    if (roomsSec) {
      roomsSec.style.display = (profile && profile.rooms) ? '' : 'none';
    }
    if (condSec && profile && profile.condition === false) {
      condSec.style.display = 'none';
    }
    return profile;
  }

  global.RizqDynFilters = {
    profiles: PROFILES,
    profileFor: profileFor,
    render: render,
    readState: readState,
    clearAll: clearAll,
    matches: matches,
    syncVisibility: syncVisibility,
    adYear: adYear,
    adKm: adKm
  };
})(typeof window !== 'undefined' ? window : this);
