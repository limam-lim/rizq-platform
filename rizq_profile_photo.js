/**
 * صورة الملف الشخصي — حرف الاسم بهوية رزق (كحلي + ذهب) بدل إيموجي عام،
 * أو صورة يرفعها صاحب الحساب من الداشبورد.
 */
(function (w) {
  'use strict';

  var FALLBACK_SVG =
    '<svg class="av-svg" viewBox="0 0 80 80" aria-hidden="true">' +
      '<circle cx="40" cy="28" r="13" fill="rgba(201,168,76,.18)" stroke="#C9A84C" stroke-width="3"/>' +
      '<path d="M16 68c3-16 12-24 24-24s21 8 24 24" fill="rgba(201,168,76,.12)" stroke="#C9A84C" stroke-width="3" stroke-linecap="round"/>' +
    '</svg>';

  function storageKey(id) {
    return 'rizq_profile_photo_' + (id || 'local');
  }

  function isUsablePhoto(src) {
    if (!src || typeof src !== 'string') return false;
    return /^(data:image\/|blob:|https?:\/\/|\/uploads\/)/i.test(src);
  }

  function initial(name) {
    var s = String(name || '').trim();
    if (!s || s === '—' || s === '-') return '';
    return s.charAt(0).toUpperCase();
  }

  function get(id) {
    try {
      var stored = localStorage.getItem(storageKey(id));
      if (isUsablePhoto(stored)) return stored;
    } catch (e0) {}
    try {
      var p = JSON.parse(localStorage.getItem('rizq_user_profile') || 'null');
      if (p && isUsablePhoto(p.photo)) return p.photo;
    } catch (e1) {}
    try {
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      var a = accs.find(function (x) { return x && x.id === id; });
      if (a && isUsablePhoto(a.thumb)) return a.thumb;
    } catch (e2) {}
    return '';
  }

  function set(id, data) {
    var photo = isUsablePhoto(data) ? data : '';
    try {
      if (photo) localStorage.setItem(storageKey(id), photo);
      else localStorage.removeItem(storageKey(id));
    } catch (e0) {}
    try {
      var p = JSON.parse(localStorage.getItem('rizq_user_profile') || '{}') || {};
      if (photo) p.photo = photo;
      else delete p.photo;
      localStorage.setItem('rizq_user_profile', JSON.stringify(p));
    } catch (e1) {}
    try {
      if (!id) return;
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      var idx = accs.findIndex(function (x) { return x && x.id === id; });
      if (idx > -1) {
        if (photo) accs[idx].thumb = photo;
        else delete accs[idx].thumb;
        localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs));
      }
    } catch (e2) {}
  }

  function paint(el, opts) {
    if (!el) return;
    opts = opts || {};
    while (el.firstChild) el.removeChild(el.firstChild);
    var photo = isUsablePhoto(opts.photo) ? opts.photo : '';
    if (photo) {
      var img = document.createElement('img');
      img.alt = '';
      img.src = photo;
      el.appendChild(img);
      el.classList.add('has-photo');
      return;
    }
    el.classList.remove('has-photo');
    var letter = initial(opts.name);
    if (letter) {
      var span = document.createElement('span');
      span.className = 'av-letter';
      span.textContent = letter;
      el.appendChild(span);
      return;
    }
    el.insertAdjacentHTML('afterbegin', FALLBACK_SVG);
  }

  function compress(file, cb) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) {
      cb(new Error('not_image'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      cb(new Error('too_big'));
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () { cb(new Error('read_fail')); };
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var side = Math.min(img.width, img.height);
        var sx = Math.max(0, (img.width - side) / 2);
        var sy = Math.max(0, (img.height - side) / 2);
        var out = Math.min(400, side) || 400;
        var canvas = document.createElement('canvas');
        canvas.width = out;
        canvas.height = out;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
        var data = canvas.toDataURL('image/jpeg', 0.82);
        cb(null, data);
      };
      img.onerror = function () { cb(new Error('decode_fail')); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  w.RizqProfilePhoto = {
    get: get,
    set: set,
    paint: paint,
    compress: compress,
    initial: initial
  };
})(window);
