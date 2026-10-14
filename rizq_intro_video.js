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
    /* لا تلمس روابط المشتركين / الفيديو الإضافي — فقط الفراغ أو Big Buck / Rickroll القديم */
    if (force || !s || /aqz-KE-bpKQ|dQw4w9WgXcQ/i.test(s)) {
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
      /* زر تشغيل شفاف — أيقونة فقط بلا نصوص تغطي الشاشة */
      '.rzq-iv-play{position:relative;z-index:2;width:56px;height:56px;border-radius:50%;' +
        'background:rgba(255,255,255,.18);color:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;' +
        'font-size:22px;box-shadow:none;border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(4px);' +
        'opacity:.35;transition:opacity .22s ease,transform .22s ease,background .2s ease}' +
      '.rzq-iv-poster:hover .rzq-iv-play,.rzq-iv-frame:focus-within .rzq-iv-play{opacity:.95;transform:scale(1.04);background:rgba(255,255,255,.28)}' +
      '.rzq-iv-play-label,.rzq-iv-badge,.rzq-iv-dash-hint{display:none!important}' +
      /* كتم + تكبير: رموز دائرية فقط (aria-label للنفاذية) */
      '.rzq-iv-sound,.rzq-iv-fs{position:absolute;bottom:8px;z-index:4;display:none;align-items:center;justify-content:center;' +
        'width:34px;height:34px;padding:0;border-radius:50%;cursor:pointer;' +
        'background:rgba(10,22,40,.78);backdrop-filter:blur(6px);border:1px solid rgba(201,168,76,.5);' +
        'color:#e8c96a;font-size:15px;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.35);' +
        'transition:background .2s,transform .15s,opacity .2s}' +
      '.rzq-iv-sound{left:8px}' +
      '.rzq-iv-fs{right:8px}' +
      '.rzq-iv-sound.is-on,.rzq-iv-fs.is-on{display:inline-flex}' +
      '.rzq-iv-sound:hover,.rzq-iv-fs:hover{background:rgba(201,168,76,.35);transform:scale(1.06)}' +
      '.rzq-iv-frame:fullscreen,.rzq-iv-frame:-webkit-full-screen{width:100vw;height:100vh;aspect-ratio:auto;border-radius:0;background:#000}' +
      '.rzq-iv-frame:fullscreen iframe,.rzq-iv-frame:fullscreen video.rzq-iv-video,' +
      '.rzq-iv-frame:-webkit-full-screen iframe,.rzq-iv-frame:-webkit-full-screen video.rzq-iv-video{object-fit:contain}' +
      '.rzq-iv-src{display:none!important}' +
      '.store-video-frame .rzq-iv-wrap,.store-video-frame .rzq-iv-frame{max-width:100%;width:100%;height:100%;min-height:220px;box-sizing:border-box}' +
      '@media (max-width:900px){' +
        '.store-video-frame .rzq-iv-wrap,.store-video-frame .rzq-iv-frame{min-height:0!important;max-width:100%!important;width:100%!important}' +
        '.store-video-frame .rzq-iv-frame iframe,.store-video-frame .rzq-iv-frame video.rzq-iv-video{object-fit:contain!important}' +
        '.rzq-iv-sound,.rzq-iv-fs{width:30px;height:30px;font-size:13px;bottom:6px}' +
        '.rzq-iv-sound{left:6px}.rzq-iv-fs{right:6px}' +
      '}' +
      '#p-promo-video-preview .rzq-iv-wrap,#p-promo-video-extra-preview .rzq-iv-wrap{max-width:none}' +
      '.rzq-iv-frame.is-live-dash{background:#0a1220}' +
      '.rzq-iv-dash-scale{position:absolute;inset:0;overflow:hidden;background:#f8faff}' +
      '.rzq-iv-dash-scale iframe{position:absolute;top:0;right:0;width:180%;height:180%;border:0;' +
        'transform:scale(.555);transform-origin:top right;background:#f8faff}' +
      '.rzq-iv-dash-hint{display:none!important}';
    document.head.appendChild(s);
  }

  /** زر تكبير الشاشة — أيقونة فقط؛ يعمل على الإطار (فيديو أصلي أو iframe) */
  function wireFullscreen(frameEl, btn, fr) {
    if (!frameEl || !btn || btn.getAttribute('data-rzq-fs-wired') === '1') return;
    btn.setAttribute('data-rzq-fs-wired', '1');
    var exitLbl = fr ? 'Quitter' : 'إغلاق';
    var enterLbl = fr ? 'Plein écran' : 'شاشة كاملة';
    function syncFsIcon() {
      var now = !!(document.fullscreenElement || document.webkitFullscreenElement);
      btn.textContent = now ? '✕' : '⛶';
      btn.setAttribute('aria-label', now ? exitLbl : enterLbl);
      btn.setAttribute('title', now ? exitLbl : enterLbl);
    }
    btn.addEventListener('click', function (ev) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      var cur = document.fullscreenElement || document.webkitFullscreenElement;
      try {
        if (cur) {
          if (document.exitFullscreen) document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        } else if (frameEl.requestFullscreen) {
          frameEl.requestFullscreen();
        } else if (frameEl.webkitRequestFullscreen) {
          frameEl.webkitRequestFullscreen();
        } else {
          var v = frameEl.querySelector('video.rzq-iv-video');
          if (v && v.webkitEnterFullscreen) v.webkitEnterFullscreen();
        }
      } catch (eFs) {}
      setTimeout(syncFsIcon, 80);
    });
    document.addEventListener('fullscreenchange', syncFsIcon);
    document.addEventListener('webkitfullscreenchange', syncFsIcon);
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

    var fsLbl = fr ? 'Plein écran' : 'شاشة كاملة';
    hostEl.innerHTML =
      '<div class="rzq-iv-wrap">' +
        '<div class="rzq-iv-frame is-live-dash" id="' + uid + '-frame">' +
          '<button type="button" class="rzq-iv-poster" id="' + uid + '-poster" style="background-image:url(\'' + String(poster).replace(/'/g, '%27') + '\')" aria-label="' + esc(playLbl) + '" title="' + esc(title) + '">' +
            '<span class="rzq-iv-play" aria-hidden="true">▶</span>' +
          '</button>' +
          '<button type="button" class="rzq-iv-fs is-on" id="' + uid + '-fs" aria-label="' + esc(fsLbl) + '" title="' + esc(fsLbl) + '">⛶</button>' +
        '</div>' +
        '<a class="rzq-iv-src" href="' + esc(page.replace('&embed=1', '').replace('?embed=1', '?demo=1')) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(openLbl) + '">↗</a>' +
      '</div>';

    var frame = hostEl.querySelector('#' + uid + '-frame');
    var posterBtn = hostEl.querySelector('#' + uid + '-poster');
    var fsBtnDash = hostEl.querySelector('#' + uid + '-fs');
    if (fsBtnDash && frame) {
      wireFullscreen(frame, fsBtnDash, fr);
    }

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

    /* لا تُعد التركيب لنفس الرابط — يمنع حلقة MutationObserver ↔ applyLang في صفحات المعرض */
    var prevUrl = hostEl.getAttribute('data-rzq-iv-url') || '';
    var prevTitle = hostEl.getAttribute('data-rzq-iv-title') || '';
    var nextTitle = String(opts.title || '🎬 فيديو تعريفي');
    if (
      !opts.forceRemount &&
      prevUrl === String(url) &&
      prevTitle === nextTitle &&
      hostEl.querySelector('.rzq-iv-wrap')
    ) {
      return true;
    }
    hostEl.setAttribute('data-rzq-iv-url', String(url));
    hostEl.setAttribute('data-rzq-iv-title', nextTitle);

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
    var a11yTitle = opts.title || '🎬 فيديو تعريفي';
    var frUi = !!(opts.fr || opts.lang === 'fr' || /vidéo|présentation|supplémentaire/i.test(String(opts.title || '')));
    var muteAria = opts.mutedLabel || (frUi ? 'Activer le son' : 'تفعيل الصوت');
    var unmuteAria = opts.unmutedLabel || (frUi ? 'Couper le son' : 'كتم الصوت');
    var fsAria = opts.fsLabel || (frUi ? 'Plein écran' : 'شاشة كاملة');
    var linkAria = opts.linkLabel || (frUi ? 'Source' : 'المصدر');
    hostEl.innerHTML =
      '<div class="rzq-iv-wrap">' +
        '<div class="rzq-iv-frame" id="' + uid + '-frame">' +
          '<button type="button" class="rzq-iv-poster" id="' + uid + '-poster" style="' + posterBg + '" aria-label="' + esc(playLbl) + '" title="' + esc(a11yTitle) + '">' +
            '<span class="rzq-iv-play" aria-hidden="true">▶</span>' +
          '</button>' +
          /* كتم + تكبير ظاهران من البداية على التعريفي والإضافي — رموز فقط */
          '<button type="button" class="rzq-iv-sound is-on" id="' + uid + '-sound" aria-label="' + esc(muteAria) + '" title="' + esc(muteAria) + '">🔇</button>' +
          '<button type="button" class="rzq-iv-fs is-on" id="' + uid + '-fs" aria-label="' + esc(fsAria) + '" title="' + esc(fsAria) + '">⛶</button>' +
        '</div>' +
        (safeHref
          ? ('<a class="rzq-iv-src" href="' + esc(safeHref) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(linkAria) + '">↗</a>')
          : '') +
      '</div>';

    var frame = hostEl.querySelector('#' + uid + '-frame');
    var poster = hostEl.querySelector('#' + uid + '-poster');
    var soundBtn = hostEl.querySelector('#' + uid + '-sound');
    var fsBtn = hostEl.querySelector('#' + uid + '-fs');
    var playerStarted = false;

    function syncSoundLabel() {
      if (!soundBtn) return;
      soundBtn.classList.add('is-on');
      if (fsBtn) fsBtn.classList.add('is-on');
      soundBtn.textContent = muted ? '🔇' : '🔊';
      soundBtn.setAttribute('aria-label', muted ? muteAria : unmuteAria);
      soundBtn.setAttribute('title', muted ? muteAria : unmuteAria);
    }

    function ensurePlayer(withSound) {
      if (playerStarted) return;
      playerStarted = true;
      loadPlayer(!!withSound);
    }

    if (frame && fsBtn) {
      wireFullscreen(frame, fsBtn, frUi);
      /* إن ضغط التكبير قبل التشغيل — شغّل ثم كبّر (مهم للفيديو الإضافي) */
      fsBtn.addEventListener('click', function () {
        try { ensurePlayer(false); } catch (eLoad) {}
      }, true);
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
      poster.addEventListener('click', function () { ensurePlayer(false); });
    }
    if (soundBtn) {
      soundBtn.addEventListener('click', function () {
        if (!playerStarted) {
          muted = false;
          ensurePlayer(true);
          syncSoundLabel();
          return;
        }
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

    /* MP4 محلي: تشغيل صامت فوري حتى يظهر شرح الداشبورد بلا تأخير */
    if (native && opts.autoplay !== false) {
      try { ensurePlayer(false); } catch (eAuto) {}
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
