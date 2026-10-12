/**
 * rizq_intro_video.js — فيديو تعريفي مضمَّن لصفحات المشتركين العامة
 * ═══════════════════════════════════════════════════════════════════
 * YouTube / Facebook (embed بعد النقر) أو ملف MP4 محلي (داشبورد تجريبي).
 * التجريبي حسب النوع: محل → داشبورد المحل، مكتب → داشبورد المكتب، شركة → داشبورد المعرض.
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

  /** فيديو محلي / MP4 (داشبورد تجريبي أو أصول رزق) */
  function isNativeVideo(url) {
    var s = String(url || '').trim();
    if (!s) return false;
    if (/^https?:\/\//i.test(s) && !/rizq-assets\//i.test(s)) {
      return /\.(mp4|webm|ogg)(\?|#|$)/i.test(s);
    }
    return /\.(mp4|webm|ogg)(\?|#|$)/i.test(s) || /rizq-assets\/promo\//i.test(s);
  }

  // MAX_SECONDS: الحد الأقصى لطول "الفيديو التعريفي" — 15-20 ثانية فقط
  var MAX_SECONDS = 20;

  var DEMO_DASH_VIDEOS = {
    store: {
      video: 'rizq-assets/promo/rizq-dashboard-store-demo-light.mp4',
      poster: 'rizq-assets/promo/rizq-dashboard-store-demo-poster.jpg',
      page: 'rizq_dashboard_store.html?demo=1&embed=1',
      labelAr: 'داشبورد المحل',
      labelFr: 'Tableau de bord boutique'
    },
    office: {
      video: 'rizq-assets/promo/rizq-dashboard-office-demo-light.mp4',
      poster: 'rizq-assets/promo/rizq-dashboard-office-demo-poster.jpg',
      page: 'rizq_dashboard_office.html?demo=1&embed=1',
      labelAr: 'داشبورد المكتب',
      labelFr: 'Tableau de bord bureau'
    },
    corp: {
      video: 'rizq-assets/promo/rizq-dashboard-corp-demo-light.mp4',
      poster: 'rizq-assets/promo/rizq-dashboard-corp-demo-poster.jpg',
      page: 'rizq_dashboard_corp.html?demo=1&embed=1',
      labelAr: 'داشبورد المعرض',
      labelFr: 'Tableau de bord showroom'
    },
    showroom: {
      video: 'rizq-assets/promo/rizq-dashboard-corp-demo-light.mp4',
      poster: 'rizq-assets/promo/rizq-dashboard-corp-demo-poster.jpg',
      page: 'rizq_dashboard_corp.html?demo=1&embed=1',
      labelAr: 'داشبورد المعرض',
      labelFr: 'Tableau de bord showroom'
    }
  };

  function demoPack(type) {
    var key = normalizeAccountType(type) || 'store';
    return DEMO_DASH_VIDEOS[key] || DEMO_DASH_VIDEOS.store;
  }

  function absAsset(path) {
    var s = String(path || '');
    if (!s) return '';
    if (/^https?:\/\//i.test(s) || s.charAt(0) === '/') return s;
    try {
      return new URL(s, location.href).pathname.replace(/^\//, '') === s
        ? s
        : s;
    } catch (e) {}
    return s;
  }

  function demoDashboardPage(type) {
    return demoPack(type).page;
  }

  function normalizeAccountType(type) {
    var t = String(type || '').toLowerCase().trim();
    if (t === 'store' || t === 'shop' || t === 'محل') return 'store';
    if (t === 'office' || t === 'bureau' || t === 'مكتب') return 'office';
    if (t === 'corp' || t === 'company' || t === 'showroom' || t === 'معرض' || t === 'شركة') {
      return t === 'showroom' || t === 'معرض' ? 'showroom' : 'corp';
    }
    return '';
  }

  /** رابط فيديو داشبورد تجريبي حسب نوع الحساب */
  function demoDashboardVideo(type) {
    return absAsset(demoPack(type).video);
  }

  function demoDashboardPoster(type) {
    return absAsset(demoPack(type).poster);
  }

  /** إن كان الرابط يوتيوب تجريبي قديم (Big Buck / Rickroll) أو فارغاً → داشبورد النوع */
  function resolveDemoUrl(url, type, force) {
    var s = String(url || '').trim();
    var t = normalizeAccountType(type);
    if (!t) return s;
    /* لا تلمس روابط المشتركين الحقيقية — فقط الفراغ أو يوتيوب التجريبي القديم */
    if (force || !s || /aqz-KE-bpKQ|eRsGyueVLvQ|dQw4w9WgXcQ/i.test(s)) {
      return demoDashboardVideo(t);
    }
    if (/rizq-dashboard-(store|office|corp)-demo/i.test(s)) return absAsset(s);
    return s;
  }

  function buildEmbedSrc(url, muted, maxSeconds, autoplay) {
    var cap = Number(maxSeconds) > 0 ? Number(maxSeconds) : MAX_SECONDS;
    var id = ytId(url);
    var ap = autoplay === false ? 0 : 1;
    if (id) {
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

  function nativePosterFor(url, opts) {
    if (opts && opts.poster) return String(opts.poster);
    var s = String(url || '');
    var m = s.match(/rizq-dashboard-(store|office|corp)-demo/i);
    if (m) return 'rizq-assets/promo/rizq-dashboard-' + m[1].toLowerCase() + '-demo-poster.jpg';
    if (/rizq-dashboard-store/i.test(s)) return DEMO_DASH_VIDEOS.store.poster;
    if (/rizq-dashboard-office/i.test(s)) return DEMO_DASH_VIDEOS.office.poster;
    if (/rizq-dashboard-corp/i.test(s)) return DEMO_DASH_VIDEOS.corp.poster;
    return '';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** رابط المصدر الأصلي — http(s) فقط؛ يمنع javascript: click-XSS */
  function safeExternalUrl(url) {
    var s = String(url || '').trim();
    if (!s || /[\s<>"']/.test(s) || /javascript:/i.test(s)) return '';
    if (isNativeVideo(s) && !/^https?:\/\//i.test(s)) return '';
    try {
      var p = new URL(s, location.href);
      if (p.protocol !== 'http:' && p.protocol !== 'https:') return '';
      if (isNativeVideo(s)) return '';
      return p.href;
    } catch (e) {
      return '';
    }
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
      '.rzq-iv-frame iframe,.rzq-iv-frame video.rzq-iv-video{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;object-fit:cover}' +
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
      '#p-promo-video-preview .rzq-iv-wrap,#p-promo-video-extra-preview .rzq-iv-wrap{max-width:none}' +
      '.rzq-iv-frame.is-live-dash{background:#0a1220}' +
      '.rzq-iv-dash-scale{position:absolute;inset:0;overflow:hidden;background:#f8faff}' +
      '.rzq-iv-dash-scale iframe{position:absolute;top:0;right:0;width:180%;height:180%;border:0;' +
        'transform:scale(.555);transform-origin:top right;background:#f8faff}' +
      '.rzq-iv-dash-hint{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);z-index:4;' +
        'background:rgba(10,22,40,.82);color:#E8C96A;font-size:11px;font-weight:800;padding:6px 12px;border-radius:999px;' +
        'border:1px solid rgba(201,168,76,.45);white-space:nowrap;pointer-events:none}';
    document.head.appendChild(s);
  }

  /**
   * mountDashboardPreview — يعرض داشبورد حي (iframe) للمحل/المكتب/المعرض داخل خانة الفيديو التعريفي.
   */
  function mountDashboardPreview(hostEl, type, opts) {
    if (!hostEl) return false;
    opts = opts || {};
    var pack = demoPack(type);
    var fr = !!(opts.fr || opts.lang === 'fr');
    injectCSS();
    var uid = 'rzq-iv-d-' + Math.random().toString(36).slice(2, 9);
    var title = opts.title || (fr ? ('🎬 ' + pack.labelFr) : ('🎬 ' + pack.labelAr));
    var playLbl = opts.playLabel || (fr ? 'Afficher le tableau de bord' : 'عرض الداشبورد');
    var hint = fr ? 'Aperçu live du tableau de bord' : 'معاينة حية للداشبورد';
    var poster = absAsset(opts.poster || pack.poster);
    var page = pack.page;
    var openLbl = fr ? 'Ouvrir le tableau de bord ↗' : 'افتح الداشبورد الكامل ↗';

    hostEl.innerHTML =
      '<div class="rzq-iv-wrap">' +
        '<div class="rzq-iv-frame is-live-dash" id="' + uid + '-frame">' +
          '<div class="rzq-iv-badge">' + esc(title) + '</div>' +
          '<button type="button" class="rzq-iv-poster" id="' + uid + '-poster" style="background-image:url(\'' + String(poster).replace(/'/g, '%27') + '\')" aria-label="' + esc(playLbl) + '">' +
            '<span class="rzq-iv-play" aria-hidden="true">▶</span>' +
            '<span class="rzq-iv-play-label">' + esc(playLbl) + '</span>' +
          '</button>' +
        '</div>' +
        '<a class="rzq-iv-src" href="' + esc(page.replace('&embed=1', '').replace('?embed=1', '?demo=1')) + '" target="_blank" rel="noopener noreferrer">' +
          esc(openLbl) +
        '</a>' +
      '</div>';

    var frame = hostEl.querySelector('#' + uid + '-frame');
    var posterBtn = hostEl.querySelector('#' + uid + '-poster');

    function showClipFallback() {
      if (!frame) return;
      var old = frame.querySelector('.rzq-iv-dash-scale');
      if (old) old.remove();
      var oldV = frame.querySelector('video.rzq-iv-video');
      if (oldV) oldV.remove();
      var hintOld = frame.querySelector('.rzq-iv-dash-hint');
      if (hintOld) hintOld.remove();
      var video = document.createElement('video');
      video.className = 'rzq-iv-video';
      video.src = absAsset(pack.video);
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.muted = true;
      video.autoplay = true;
      video.controls = true;
      video.loop = true;
      if (poster) video.poster = poster;
      frame.appendChild(video);
      var playP = video.play();
      if (playP && typeof playP.catch === 'function') playP.catch(function () {});
      var hintEl = document.createElement('div');
      hintEl.className = 'rzq-iv-dash-hint';
      hintEl.textContent = fr ? pack.labelFr : pack.labelAr;
      frame.appendChild(hintEl);
    }

    function showLive() {
      if (!frame) return;
      if (posterBtn) posterBtn.remove();
      var old = frame.querySelector('.rzq-iv-dash-scale');
      if (old) old.remove();
      var wrap = document.createElement('div');
      wrap.className = 'rzq-iv-dash-scale';
      var iframe = document.createElement('iframe');
      iframe.src = page;
      iframe.title = pack.labelAr;
      iframe.setAttribute('loading', 'eager');
      iframe.setAttribute('referrerpolicy', 'same-origin');
      var loaded = false;
      iframe.addEventListener('load', function () {
        loaded = true;
        try {
          /* chrome-error / صفحة فارغة → مقطع داشبورد */
          var href = '';
          try { href = iframe.contentWindow && iframe.contentWindow.location && iframe.contentWindow.location.href; } catch (eH) { href = 'ok'; }
          if (href && /chrome-error|about:blank/i.test(href)) showClipFallback();
        } catch (eL) {}
      });
      setTimeout(function () {
        if (!loaded) showClipFallback();
      }, 2500);
      wrap.appendChild(iframe);
      var hintEl = document.createElement('div');
      hintEl.className = 'rzq-iv-dash-hint';
      hintEl.textContent = hint;
      frame.appendChild(wrap);
      frame.appendChild(hintEl);
    }

    if (posterBtn) {
      posterBtn.addEventListener('click', showLive);
    }
    /* عرض فوري: الزائر يرى الداشبورد مباشرة دون انتظار نقرة */
    if (opts.autoLive !== false) {
      try { showLive(); } catch (eLive) { try { showClipFallback(); } catch (e2) {} }
    }
    return true;
  }

  /**
   * mount(hostEl, url, opts) — يبني الفيديو التعريفي داخل hostEl.
   * opts.accountType: store|office|corp|showroom — يستبدل روابط يوتيوب التجريبية بمقطع داشبورد النوع.
   * opts.liveDashboard: اختياري — معاينة حية (غير مستخدمة في الواجهة العامة افتراضياً).
   */
  function mount(hostEl, url, opts) {
    opts = opts || {};
    var type = opts.accountType || opts.type || '';
    if (opts.liveDashboard || opts.forceDashboard) {
      return mountDashboardPreview(hostEl, type || 'store', opts);
    }
    if (!hostEl || !url) {
      if (hostEl && type) {
        url = demoDashboardVideo(type);
      } else {
        return false;
      }
    }
    url = resolveDemoUrl(url, type, !!opts.forceDashboard);
    var native = isNativeVideo(url);
    var embedReady = native || !!buildEmbedSrc(url, true, MAX_SECONDS, true);
    if (!embedReady) return false;
    injectCSS();

    var muted = true;
    var uid = 'rzq-iv-' + Math.random().toString(36).slice(2, 9);
    var id = ytId(url);
    var thumb = native ? nativePosterFor(url, opts) : ytThumb(url);
    if (!thumb && opts.accountType) thumb = demoDashboardPoster(opts.accountType);
    var playLbl = opts.playLabel || 'تشغيل الفيديو التعريفي';
    var posterBg = thumb
      ? ("background-image:url('" + String(thumb).replace(/'/g, '%27') + "')")
      : 'background:linear-gradient(145deg,#0f1f3d,#1B3A6B)';

    var safeHref = safeExternalUrl(url);
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
        (safeHref
          ? ('<a class="rzq-iv-src" href="' + esc(safeHref) + '" target="_blank" rel="noopener noreferrer">' +
              esc(opts.linkLabel || 'شاهد على المصدر الأصلي ↗') +
            '</a>')
          : '') +
      '</div>';

    var frame = hostEl.querySelector('#' + uid + '-frame');
    var poster = hostEl.querySelector('#' + uid + '-poster');
    var soundBtn = hostEl.querySelector('#' + uid + '-sound');

    function syncSoundLabel() {
      if (!soundBtn) return;
      soundBtn.classList.add('is-on');
      soundBtn.textContent = muted
        ? ('🔇 ' + (opts.mutedLabel || 'اضغط لتفعيل الصوت'))
        : ('🔊 ' + (opts.unmutedLabel || 'الصوت مفعّل'));
    }

    function loadNativePlayer(withSound) {
      muted = !withSound;
      if (!frame) return;
      if (poster) poster.remove();
      var oldV = frame.querySelector('video.rzq-iv-video');
      if (oldV) oldV.remove();
      var oldI = frame.querySelector('iframe');
      if (oldI) oldI.remove();
      var video = document.createElement('video');
      video.className = 'rzq-iv-video';
      video.id = uid + '-video';
      video.src = url;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.controls = true;
      video.muted = muted;
      video.autoplay = true;
      if (thumb) video.poster = thumb;
      var cap = MAX_SECONDS;
      video.addEventListener('timeupdate', function () {
        if (video.currentTime >= cap) {
          try { video.pause(); video.currentTime = cap; } catch (e) {}
        }
      });
      frame.appendChild(video);
      var playP = video.play();
      if (playP && typeof playP.catch === 'function') playP.catch(function () {});
      syncSoundLabel();
    }

    function loadEmbedPlayer(withSound) {
      muted = !withSound;
      var src = buildEmbedSrc(url, muted, MAX_SECONDS, true);
      if (!src || !frame) return;
      if (poster) poster.remove();
      var old = frame.querySelector('iframe');
      if (old) old.remove();
      var oldV = frame.querySelector('video.rzq-iv-video');
      if (oldV) oldV.remove();
      var iframe = document.createElement('iframe');
      iframe.id = uid + '-iframe';
      iframe.src = src;
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.setAttribute('loading', 'eager');
      iframe.title = opts.title || 'فيديو تعريفي';
      frame.appendChild(iframe);
      syncSoundLabel();
    }

    function loadPlayer(withSound) {
      if (native) loadNativePlayer(withSound);
      else loadEmbedPlayer(withSound);
    }

    if (poster) {
      poster.addEventListener('click', function () { loadPlayer(false); });
    }
    if (soundBtn) {
      soundBtn.addEventListener('click', function () {
        muted = !muted;
        if (native) {
          var v = hostEl.querySelector('#' + uid + '-video');
          if (v) {
            v.muted = muted;
            if (!muted) {
              var p = v.play();
              if (p && typeof p.catch === 'function') p.catch(function () {});
            }
          }
          syncSoundLabel();
          return;
        }
        var iframe = hostEl.querySelector('#' + uid + '-iframe');
        var newSrc = buildEmbedSrc(url, muted, MAX_SECONDS, true);
        if (iframe && newSrc) iframe.src = newSrc;
        syncSoundLabel();
      });
    }

    if (!id && !native && poster && !thumb) {
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
    mountDashboardPreview: mountDashboardPreview,
    loadAndMountForAccount: loadAndMountForAccount,
    buildEmbedSrc: buildEmbedSrc,
    ytId: ytId,
    ytThumb: ytThumb,
    isFB: isFB,
    isNativeVideo: isNativeVideo,
    demoDashboardVideo: demoDashboardVideo,
    demoDashboardPoster: demoDashboardPoster,
    demoDashboardPage: demoDashboardPage,
    resolveDemoUrl: resolveDemoUrl,
    MAX_SECONDS: MAX_SECONDS
  };
})(window);
