/**
 * rizq_intro_video.js — فيديو تعريفي مضمَّن (Embed) لصفحات المشتركين العامة
 * ═══════════════════════════════════════════════════════════════════
 * يعرض غلاف يوتيوب واضحاً ثم يشغّل الـ embed بعد نقرة المستخدم
 * (يتفادى شاشة YouTube «Sign in to confirm you're not a bot» عند autoplay).
 * ═══════════════════════════════════════════════════════════════════
 */
(function (global) {
  'use strict';

  function ytId(url) {
    var m = String(url || '').match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return m ? m[1] : null;
  }
  function isFB(url) { return /facebook\.com|fb\.watch/.test(url || ''); }

  // MAX_SECONDS: الحد الأقصى لطول "الفيديو التعريفي" — 15-20 ثانية فقط
  var MAX_SECONDS = 20;

  function buildEmbedSrc(url, muted, maxSeconds, autoplay) {
    var cap = Number(maxSeconds) > 0 ? Number(maxSeconds) : MAX_SECONDS;
    var id = ytId(url);
    var ap = autoplay === false ? 0 : 1;
    if (id) {
      // youtube-nocookie + origin يقلّلان حظر «confirm you're not a bot»
      var origin = '';
      try { origin = encodeURIComponent(location.origin || ''); } catch (e) {}
      return 'https://www.youtube-nocookie.com/embed/' + id +
        '?autoplay=' + ap +
        '&mute=' + (muted ? 1 : 0) +
        '&start=0&end=' + cap +
        '&controls=1&rel=0&modestbranding=1&playsinline=1' +
        '&enablejsapi=1' +
        (origin ? ('&origin=' + origin) : '');
    }
    if (isFB(url)) {
      return 'https://www.facebook.com/plugins/video.php' +
        '?href=' + encodeURIComponent(url) +
        '&autoplay=' + ap + '&mute=' + (muted ? 1 : 0) + '&show_text=0';
    }
    return null;
  }

  function ytThumb(url) {
    var id = ytId(url);
    if (!id) return '';
    return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var CSS_INJECTED = false;
  function injectCSS() {
    if (CSS_INJECTED) return; CSS_INJECTED = true;
    var s = document.createElement('style');
    s.textContent =
      '@keyframes rzqIvIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}' +
      '.rzq-iv-wrap{max-width:640px;margin:0 auto;width:100%;animation:rzqIvIn .55s cubic-bezier(.16,1,.3,1) both}' +
      '.rzq-iv-frame{position:relative;border-radius:12px;overflow:hidden;background:#0D1B2A;aspect-ratio:16/9;' +
        'box-shadow:0 0 0 1.5px rgba(201,168,76,.45),0 12px 36px rgba(15,35,71,.16)}' +
      '.rzq-iv-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}' +
      '.rzq-iv-poster{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
        'background-size:cover;background-position:center;cursor:pointer;border:none;padding:0;width:100%;height:100%}' +
      '.rzq-iv-poster::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,17,28,.15),rgba(6,17,28,.55))}' +
      '.rzq-iv-play{position:relative;z-index:2;width:68px;height:68px;border-radius:50%;' +
        'background:linear-gradient(135deg,#C9A84C,#E8C96A);color:#0D1B2A;display:flex;align-items:center;justify-content:center;' +
        'font-size:28px;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:transform .2s}' +
      '.rzq-iv-poster:hover .rzq-iv-play{transform:scale(1.06)}' +
      '.rzq-iv-play-label{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);z-index:2;' +
        'background:rgba(10,22,40,.78);color:#E8C96A;font-size:12px;font-weight:800;padding:6px 12px;border-radius:999px;' +
        'border:1px solid rgba(201,168,76,.4);white-space:nowrap;pointer-events:none}' +
      '.rzq-iv-badge{position:absolute;top:10px;right:10px;z-index:3;background:linear-gradient(135deg,#C9A84C,#e8c96a);color:#0f2347;' +
        'font-size:10.5px;font-weight:900;padding:5px 12px;border-radius:10px;letter-spacing:.4px;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.28);pointer-events:none}' +
      '.rzq-iv-sound{position:absolute;bottom:10px;left:10px;z-index:3;display:none;background:rgba(10,22,40,.75);' +
        'backdrop-filter:blur(6px);border:1px solid rgba(201,168,76,.5);color:#e8c96a;font-size:12px;font-weight:700;' +
        'padding:7px 14px;border-radius:10px;cursor:pointer;transition:background .2s}' +
      '.rzq-iv-sound.is-on{display:inline-flex}' +
      '.rzq-iv-sound:hover{background:rgba(201,168,76,.25)}' +
      '.rzq-iv-src{display:block;text-align:center;margin-top:10px;font-size:11.5px;color:rgba(27,58,107,.55);text-decoration:none;transition:color .2s}' +
      '.rzq-iv-src:hover{color:#1B3A6B}' +
      '.store-video-frame .rzq-iv-wrap,.store-video-frame .rzq-iv-frame{max-width:none;width:100%;height:100%;min-height:220px}' +
      '#p-promo-video-preview .rzq-iv-wrap,#p-promo-video-extra-preview .rzq-iv-wrap{max-width:none}';
    document.head.appendChild(s);
  }

  /**
   * mount(hostEl, url, opts) — يبني الفيديو التعريفي داخل hostEl.
   * يعرض غلاف يوتيوب فوراً، ويحمّل الـ iframe بعد النقر (أكثر موثوقية).
   */
  function mount(hostEl, url, opts) {
    if (!hostEl || !url) return false;
    var embedReady = !!buildEmbedSrc(url, true, MAX_SECONDS, true);
    if (!embedReady) return false;
    opts = opts || {};
    injectCSS();

    var muted = true;
    var uid = 'rzq-iv-' + Math.random().toString(36).slice(2, 9);
    var id = ytId(url);
    var thumb = ytThumb(url);
    var playLbl = opts.playLabel || 'تشغيل الفيديو التعريفي';
    var posterBg = thumb
      ? ("background-image:url('" + String(thumb).replace(/'/g, '%27') + "')")
      : 'background:linear-gradient(145deg,#0f1f3d,#1B3A6B)';

    hostEl.innerHTML =
      '<div class="rzq-iv-wrap">' +
        '<div class="rzq-iv-frame" id="' + uid + '-frame">' +
          '<div class="rzq-iv-badge">' + esc(opts.title || '🎬 فيديو تعريفي') + '</div>' +
          '<button type="button" class="rzq-iv-poster" id="' + uid + '-poster" style="' + posterBg + '" aria-label="' + esc(playLbl) + '">' +
            '<span class="rzq-iv-play" aria-hidden="true">▶</span>' +
            '<span class="rzq-iv-play-label">' + esc(playLbl) + '</span>' +
          '</button>' +
          '<button type="button" class="rzq-iv-sound" id="' + uid + '-sound">🔇 ' + esc(opts.mutedLabel || 'اضغط لتفعيل الصوت') + '</button>' +
        '</div>' +
        '<a class="rzq-iv-src" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(opts.linkLabel || 'شاهد على المصدر الأصلي ↗') +
        '</a>' +
      '</div>';

    var frame = hostEl.querySelector('#' + uid + '-frame');
    var poster = hostEl.querySelector('#' + uid + '-poster');
    var soundBtn = hostEl.querySelector('#' + uid + '-sound');

    function loadPlayer(withSound) {
      muted = !withSound;
      var src = buildEmbedSrc(url, muted, MAX_SECONDS, true);
      if (!src || !frame) return;
      if (poster) poster.remove();
      var old = frame.querySelector('iframe');
      if (old) old.remove();
      var iframe = document.createElement('iframe');
      iframe.id = uid + '-iframe';
      iframe.src = src;
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.setAttribute('loading', 'eager');
      iframe.title = opts.title || 'فيديو تعريفي';
      frame.appendChild(iframe);
      if (soundBtn) {
        soundBtn.classList.add('is-on');
        soundBtn.textContent = muted
          ? ('🔇 ' + (opts.mutedLabel || 'اضغط لتفعيل الصوت'))
          : ('🔊 ' + (opts.unmutedLabel || 'الصوت مفعّل'));
      }
    }

    if (poster) {
      poster.addEventListener('click', function () { loadPlayer(false); });
    }
    if (soundBtn) {
      soundBtn.addEventListener('click', function () {
        muted = !muted;
        var iframe = hostEl.querySelector('#' + uid + '-iframe');
        var newSrc = buildEmbedSrc(url, muted, MAX_SECONDS, true);
        if (iframe && newSrc) iframe.src = newSrc;
        soundBtn.textContent = muted
          ? ('🔇 ' + (opts.mutedLabel || 'اضغط لتفعيل الصوت'))
          : ('🔊 ' + (opts.unmutedLabel || 'الصوت مفعّل'));
      });
    }

    // إن لم تتوفر صورة غلاف (فيسبوك) نبقي زر التشغيل فوق خلفية كحلية
    if (!id && poster && !thumb) {
      poster.style.background = 'linear-gradient(145deg,#0f1f3d,#1B3A6B)';
    }

    return true;
  }

  function loadAndMountForAccount(accountId, opts) {
    opts = opts || {};
    var sectionId = opts.sectionId || 'video-intro-section';
    var mountId = opts.mountId || 'intro-video-mount';
    var sec = document.getElementById(sectionId);
    var mountEl = document.getElementById(mountId);
    if (!accountId || !sec || !mountEl) return Promise.resolve(false);

    function tryShow(url) {
      if (!url) return false;
      var ok = mount(mountEl, url, opts.mountOpts || {});
      if (ok) sec.style.display = '';
      return ok;
    }

    // رابط صريح من الصفحة (حساب محمّل مسبقاً) — يتجنّب سباق التخزين المحلي
    if (opts.url && tryShow(opts.url)) {
      return Promise.resolve(true);
    }

    try {
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      var local = accs.find(function (a) { return a && a.id === accountId; });
      if (local && local.promo_video && tryShow(local.promo_video)) {
        return Promise.resolve(true);
      }
    } catch (e) {}

    var base = '';
    try {
      if (typeof global.RIZQ_BACKEND_BASE === 'string' && global.RIZQ_BACKEND_BASE) {
        base = global.RIZQ_BACKEND_BASE.replace(/\/$/, '');
      }
    } catch (e2) {}
    if (!base) return Promise.resolve(false);

    var byId = fetch(base + '/api/accounts/public/' + encodeURIComponent(accountId))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.account && data.account.promo_video) {
          return tryShow(data.account.promo_video);
        }
        return false;
      })
      .catch(function () { return false; });

    return byId.then(function (ok) {
      if (ok) return true;
      // احتياط: قائمة الحسابات العامة (نفس مصدر دليل المعارض/المكاتب)
      return fetch(base + '/api/accounts/public')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          var list = (data && Array.isArray(data.accounts))
            ? data.accounts
            : (data && data.ok && Array.isArray(data.accounts) ? data.accounts : []);
          var found = list.find(function (a) { return a && a.id === accountId; });
          if (found && found.promo_video) return tryShow(found.promo_video);
          return false;
        })
        .catch(function () { return false; });
    });
  }

  global.RizqIntroVideo = {
    mount: mount,
    loadAndMountForAccount: loadAndMountForAccount,
    buildEmbedSrc: buildEmbedSrc,
    ytId: ytId,
    ytThumb: ytThumb,
    isFB: isFB
  };
})(typeof window !== 'undefined' ? window : this);
