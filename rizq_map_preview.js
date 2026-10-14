/**
 * RizqMapPreview — معاينة موقع حقيقية داخل .map-placeholder
 * بلاطات OpenStreetMap + قاموس أحياء موريتانية (بدون مفتاح API).
 * النقر يفتح Google Maps على الإحداثيات عند توفرها.
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'rizq-map-preview-css';
  var DEFAULT = { lat: 18.0735, lon: -15.9582, zoom: 13 };

  /* أطول مفاتيح أولاً عبر ترتيب المطابقة */
  var PLACES = [
    { keys: ['تفرغ زينة', 'tevragh zeina', 'tevragh-zeina', 'tevragh'], lat: 18.1105, lon: -15.9990, zoom: 15 },
    { keys: ['لكصر', 'الكصر', 'ksar'], lat: 18.0861, lon: -15.9785, zoom: 15 },
    { keys: ['السبخة', 'سبخة', 'sebkha'], lat: 18.0730, lon: -15.9650, zoom: 15 },
    { keys: ['دار النعيم', 'dar naim', "dar naim"], lat: 18.0950, lon: -15.9200, zoom: 14 },
    { keys: ['عرفات', 'arafat'], lat: 18.0550, lon: -15.9500, zoom: 14 },
    { keys: ['توجنين', 'toujounine', 'toujounine'], lat: 18.0600, lon: -15.9000, zoom: 14 },
    { keys: ['رياض', 'riyadh', 'riyad'], lat: 18.0400, lon: -15.9800, zoom: 14 },
    { keys: ['الميناء', 'ميناء', 'port'], lat: 18.0900, lon: -16.0200, zoom: 14 },
    { keys: ['تيارت', 'tyart', 'teyarett'], lat: 18.1200, lon: -15.9500, zoom: 14 },
    { keys: ['نواذيبو', 'nouadhibou'], lat: 20.9310, lon: -17.0347, zoom: 13 },
    { keys: ['روصو', 'rosso'], lat: 16.5120, lon: -15.8050, zoom: 13 },
    { keys: ['كيهيدي', 'kaedi', 'kaédi'], lat: 16.1500, lon: -13.5000, zoom: 13 },
    { keys: ['أزويرات', 'zouerate', 'zouérat'], lat: 22.7333, lon: -12.4833, zoom: 12 },
    { keys: ['نواكشوط الغربية', 'nouakchott ouest', 'nouakchott west'], lat: 18.0855, lon: -15.9850, zoom: 13 },
    { keys: ['نواكشوط الشمالية', 'nouakchott nord', 'nouakchott north'], lat: 18.1100, lon: -15.9500, zoom: 13 },
    { keys: ['نواكشوط الجنوبية', 'nouakchott sud', 'nouakchott south'], lat: 18.0500, lon: -15.9600, zoom: 13 },
    { keys: ['نواكشوط', 'nouakchott'], lat: 18.0735, lon: -15.9582, zoom: 13 },
    { keys: ['موريتانيا', 'mauritania', 'mauritanie'], lat: 18.0735, lon: -15.9582, zoom: 11 }
  ];

  var _last = null;
  var _painting = false;
  var _obs = null;

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '.map-placeholder{position:relative!important;overflow:hidden!important;min-height:140px}',
      '.map-placeholder .map-tiles{position:absolute;inset:0;z-index:0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);pointer-events:none;background:#dce6f2}',
      '.map-placeholder .map-tiles img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.92) contrast(1.02)}',
      '.map-placeholder .map-overlay{position:relative;z-index:2;height:100%;min-height:inherit;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;padding:12px 10px 14px;box-sizing:border-box;background:linear-gradient(180deg,rgba(255,255,255,.08) 0%,rgba(248,250,255,.55) 45%,rgba(232,238,248,.88) 100%);text-align:center;pointer-events:none}',
      '.map-placeholder .map-pin{position:absolute;left:50%;top:44%;transform:translate(-50%,-100%);z-index:3;width:30px;height:30px;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.35));animation:rizqMapPin .9s ease}',
      '@keyframes rizqMapPin{from{opacity:0;transform:translate(-50%,-120%)}to{opacity:1;transform:translate(-50%,-100%)}}',
      '.map-placeholder.has-map-preview{border-style:solid}'
    ].join('');
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[،,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function resolve(addr) {
    var n = norm(addr);
    if (!n || n === '—' || n === '-') return null;
    var i, p, k;
    for (i = 0; i < PLACES.length; i++) {
      p = PLACES[i];
      for (k = 0; k < p.keys.length; k++) {
        if (n.indexOf(norm(p.keys[k])) !== -1) {
          return { lat: p.lat, lon: p.lon, zoom: p.zoom, label: addr };
        }
      }
    }
    /* إحداثيات صريحة lat,lon */
    var m = String(addr).match(/(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)/);
    if (m) {
      var lat = parseFloat(m[1]), lon = parseFloat(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { lat: lat, lon: lon, zoom: 15, label: addr };
      }
    }
    return null;
  }

  function lon2tile(lon, z) {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, z));
  }
  function lat2tile(lat, z) {
    var rad = (lat * Math.PI) / 180;
    return Math.floor(
      ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z)
    );
  }

  function ensureStructure(host) {
    if (!host) return null;
    injectCss();
    var tiles = host.querySelector('.map-tiles');
    if (!tiles) {
      tiles = document.createElement('div');
      tiles.className = 'map-tiles';
      tiles.setAttribute('aria-hidden', 'true');
      host.insertBefore(tiles, host.firstChild);
    }
    var overlay = host.querySelector('.map-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'map-overlay';
      var move = [];
      var kids = Array.prototype.slice.call(host.childNodes);
      kids.forEach(function (node) {
        if (node === tiles) return;
        if (node.nodeType === 1 && (node.classList.contains('map-pin') || node.classList.contains('map-tiles'))) return;
        move.push(node);
      });
      move.forEach(function (n) { overlay.appendChild(n); });
      host.appendChild(overlay);
    }
    var pin = host.querySelector('.map-pin');
    if (!pin) {
      pin = document.createElement('div');
      pin.className = 'map-pin';
      pin.setAttribute('aria-hidden', 'true');
      pin.innerHTML =
        '<svg viewBox="0 0 24 24" width="30" height="30" fill="#c0392b" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z"/>' +
        '</svg>';
      host.appendChild(pin);
    }
    return tiles;
  }

  function paintTiles(tilesEl, lat, lon, zoom) {
    var z = zoom || 14;
    var n = Math.pow(2, z);
    var x = lon2tile(lon, z);
    var y = lat2tile(lat, z);
    var html = [];
    var dy, dx, tx, ty;
    for (dy = -1; dy <= 1; dy++) {
      for (dx = -1; dx <= 1; dx++) {
        tx = (((x + dx) % n) + n) % n;
        ty = y + dy;
        if (ty < 0 || ty >= n) {
          html.push('<div></div>');
          continue;
        }
        html.push(
          '<img src="https://tile.openstreetmap.org/' +
            z +
            '/' +
            tx +
            '/' +
            ty +
            '.png" alt="" loading="lazy" referrerpolicy="no-referrer-when-downgrade">'
        );
      }
    }
    tilesEl.innerHTML = html.join('');
  }

  function findHost(target) {
    if (!target) {
      return document.querySelector('.map-placeholder');
    }
    if (typeof target === 'string') {
      return document.querySelector(target);
    }
    if (target.nodeType === 1) {
      if (target.classList.contains('map-placeholder')) return target;
      return target.closest ? target.closest('.map-placeholder') : target;
    }
    return null;
  }

  function paint(target, addr) {
    var host = findHost(target);
    if (!host) return null;
    _painting = true;
    try {
      var label = (addr != null ? String(addr) : '').trim();
      if (!label) {
        var addrEl =
          host.querySelector('.map-addr, #map-addr-el, #map-addr, #info-city-lbl') ||
          document.getElementById('map-addr-el') ||
          document.getElementById('map-addr');
        label = addrEl ? String(addrEl.textContent || '').trim() : '';
      }
      var coords = resolve(label) || DEFAULT;
      var key = coords.lat + ',' + coords.lon + ',' + (coords.zoom || 14);
      if (host.getAttribute('data-map-key') === key && host.querySelector('.map-tiles img')) {
        _last = { addr: label, lat: coords.lat, lon: coords.lon, zoom: coords.zoom };
        return _last;
      }
      _last = { addr: label, lat: coords.lat, lon: coords.lon, zoom: coords.zoom };
      var tiles = ensureStructure(host);
      if (tiles) paintTiles(tiles, coords.lat, coords.lon, coords.zoom || 14);
      host.classList.add('has-map-preview');
      host.setAttribute('data-map-lat', String(coords.lat));
      host.setAttribute('data-map-lon', String(coords.lon));
      host.setAttribute('data-map-key', key);
      return _last;
    } finally {
      _painting = false;
    }
  }

  function open(addr) {
    var label = (addr != null ? String(addr) : '').trim();
    if (!label || label === '—') {
      var el =
        document.querySelector('.map-addr, #map-addr-el, #map-addr, #info-city-lbl');
      label = el ? String(el.textContent || '').trim() : '';
    }
    var coords = resolve(label);
    if ((!coords || !label) && _last) coords = _last;
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)) {
      var q = coords.lat + ',' + coords.lon;
      if (label && label !== '—') q = label + ' @' + q;
      global.open(
        'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(label && label !== '—' ? label + ', Mauritania' : q),
        '_blank',
        'noopener'
      );
      return;
    }
    if (!label || label === '—') label = 'Nouakchott, Mauritania';
    global.open(
      'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(label),
      '_blank',
      'noopener'
    );
  }

  function paintAll() {
    var nodes = document.querySelectorAll('.map-placeholder');
    Array.prototype.forEach.call(nodes, function (el) {
      paint(el);
    });
  }

  function bindAuto() {
    paintAll();
    if (typeof MutationObserver === 'undefined') return;
    if (_obs) {
      try { _obs.disconnect(); } catch (e) {}
    }
    _obs = new MutationObserver(function () {
      if (_painting) return;
      paintAll();
    });
    Array.prototype.forEach.call(document.querySelectorAll('.map-placeholder'), function (el) {
      _obs.observe(el, { childList: true, subtree: true, characterData: true });
    });
  }

  var api = {
    resolve: resolve,
    paint: paint,
    paintAll: paintAll,
    open: open,
    last: function () { return _last; }
  };

  global.RizqMapPreview = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAuto);
  } else {
    bindAuto();
  }
})(typeof window !== 'undefined' ? window : this);
