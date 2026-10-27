// ═══════════════════════════════════════════════════════════════════
// rizq_video_ads.js — Rizq ADS Video Engine v2.0
// ═══════════════════════════════════════════════════════════════════
// أمان: إعلانات المعلنين عبر YouTube / Facebook embed
// فيديو المنصة المزروع: ملف خفيف محلي يبدأ الحلقة ويعود بعد انتهاء سلسلة المعلنين
//
// الموضع الأول — HERO (ذهبي):
//   Playlist: [فيديو المنصة] → معلن 1 → معلن 2 → … → فيديو المنصة
//   شاشة عريضة في الصفحة الرئيسية — سعر أعلى
//
// الموضع الثاني — STRIP (فضي):
//   شريط بطاقات فيديو عمودية تحت الشاشة الكبيرة (#rizq-vid-strip)
//   سطح المكتب: تشغيل صامت عند مرور الماوس
//   الجوال: تشغيل تلقائي صامت عند ظهور ≥50% (IntersectionObserver)، صوت بلمسة،
//           فيديو واحد (الأكثر ظهوراً)، saveData ⇒ غلاف + زر ▶️ فقط
//   مصدر البيانات: videoAds.strip أو videoAds.popup (توافق خلفي)
//   على الصفحات بلا شريط: يبقى الـ popup القديم كاحتياطي إن وُجدت إعلانات
//
// الإعدادات في localStorage /api/site-config تحت: videoAds
// تُعدَّل من لوحة الأدمن (تبويب "الفيديو الإعلاني")
// ═══════════════════════════════════════════════════════════════════

(function RizqVideoAds() {
  'use strict';

  // ── ثوابت ──
  var POPUP_H_DESKTOP = 150; // ارتفاع شريط الـ Popup — ديسكتوب
  var POPUP_H_MOBILE  = 90;  // ارتفاع شريط الـ Popup — موبايل
  var BAR_H = (window.innerWidth < 768) ? POPUP_H_MOBILE : POPUP_H_DESKTOP;

  // ── قراءة الإعدادات ──
  var config = {};
  var heroAds  = [];
  var popupAds = [];
  var stripAds = [];
  var _stripPlaying = null;
  var _stripLightbox = null;
  var _stripPickLockUntil = 0;

  function _loadLocalVideoAdsConfig() {
    try { return JSON.parse(localStorage.getItem('rizq_video_ads') || '{}'); }
    catch (e) { return {}; }
  }

  // ════════════════════════════════════════
  //  مساعدات
  // ════════════════════════════════════════

  /** استخراج YouTube Video ID */
  function ytId(url) {
    var m = (url || '').match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return m ? m[1] : null;
  }

  /** هل الرابط من Facebook؟ */
  function isFB(url) {
    return /facebook\.com|fb\.watch/.test(url || '');
  }

  /** بناء رابط الـ embed المناسب */
  function buildEmbedSrc(url, opts) {
    var mute     = opts.mute     ? 1 : 0;
    var autoplay = opts.autoplay !== false ? 1 : 0;
    var controls = opts.controls !== false ? 1 : 0;

    var id = ytId(url);
    if (id) {
      return 'https://www.youtube.com/embed/' + id +
        '?autoplay=' + autoplay +
        '&mute=' + mute +
        '&controls=' + controls +
        '&rel=0&modestbranding=1&playsinline=1';
    }

    if (isFB(url)) {
      return 'https://www.facebook.com/plugins/video.php' +
        '?href=' + encodeURIComponent(url) +
        '&autoplay=' + autoplay +
        '&mute=' + mute +
        '&show_text=0&width=560';
    }

    return null;
  }

  /** بناء رابط YouTube Playlist (لجميع المعلنين دفعة واحدة) */
  function buildYTPlaylistSrc(ids) {
    if (!ids.length) return null;
    return 'https://www.youtube.com/embed/' + ids[0] +
      '?playlist=' + ids.join(',') +
      '&autoplay=1&mute=1&loop=1&controls=1&rel=0&modestbranding=1&playsinline=1';
  }

  /** escape HTML */
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** إنشاء iframe عنصر */
  function makeIframe(src, w, h) {
    var f = document.createElement('iframe');
    f.src = src;
    f.style.cssText = 'width:' + (w || '100%') + ';height:' + (h || '100%') + ';border:0;display:block';
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('loading', 'eager');
    f.setAttribute('scrolling', 'no');
    return f;
  }

  // فيديو المنصة المزروع — بداية الحلقة وبعد انتهاء إعلانات المعلنين
  /* نسخة نظيفة بلا عناوين كبيرة تغطي الأيقونات/الإعلانات على الشاشة الكبيرة */
  var DEFAULT_PLATFORM_PROMO = '/rizq-assets/promo/rizq-platform-promo-clean-light.mp4';
  var DEFAULT_AD_SLOT_SEC = 25;
  var _heroAdvanceTimer = null;
  var _heroPlaylist = [];
  var _heroIdx = 0;

  function isDirectVideo(url) {
    return /\.(mp4|webm|ogg)(\?|#|$)/i.test(url || '') || /rizq-assets\/promo\//i.test(url || '');
  }

  function clearHeroAdvance() {
    if (_heroAdvanceTimer) {
      clearTimeout(_heroAdvanceTimer);
      _heroAdvanceTimer = null;
    }
  }

  function normalizePlatformPromoUrl(url) {
    var u = String(url || '').trim() || DEFAULT_PLATFORM_PROMO;
    /* استبدال النسخ ذات العناوين المحروقة التي تغطي الأيقونات */
    if (/rizq-platform-promo(-light)?\.mp4(\?|#|$)/i.test(u)) {
      return DEFAULT_PLATFORM_PROMO;
    }
    return u;
  }

  function buildHeroPlaylist() {
    var list = [];
    var promoEnabled = config.platformPromoEnabled !== false;
    var promoUrl = normalizePlatformPromoUrl(config.platformPromoUrl || DEFAULT_PLATFORM_PROMO);
    if (promoEnabled && promoUrl) {
      list.push({
        advertiser: 'رزق · Rizq Platform',
        url: promoUrl,
        active: true,
        isPlatform: true
      });
    }
    heroAds.forEach(function (a) {
      if (a && a.url) list.push(a);
    });
    return list;
  }

  /** إرسال حدث إحصائي (مشاهدة/نقرة) — بدون تعطيل الواجهة */
  function trackEvent(accountId, type) {
    if (!accountId || !window.RIZQ_BACKEND_BASE) return;
    try {
      fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/video-ads/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: accountId, type: type }),
        keepalive: true,
      }).catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
  }

  function badgeHtml(ad) {
    if (!ad || ad.isPlatform) return '';
    var parts = [];
    if (ad.vipBadge) parts.push('<span style="background:linear-gradient(135deg,#C9A84C,#E8C96A);color:#0f2347;font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px;margin-inline-start:6px">VIP</span>');
    else if (ad.featuredBadge) parts.push('<span style="background:#1B3A6B;color:#fde68a;font-size:10px;font-weight:800;padding:2px 8px;border-radius:10px;margin-inline-start:6px">مميّز برزق</span>');
    return parts.join('');
  }

  // ════════════════════════════════════════
  //  ① HERO — Playlist دوراني
  //     [فيديو المنصة] → معلن 1 → معلن 2 → … → يعود لفيديو المنصة
  // ════════════════════════════════════════
  function initHero() {
    var wrapEl = document.getElementById('hero-vid-wrap');
    if (!wrapEl) return;

    // أولوية البحث: معلنون بـ prioritySearch أولاً بعد فيديو المنصة
    heroAds = heroAds.slice().sort(function (a, b) {
      return Number(!!b.prioritySearch) - Number(!!a.prioritySearch);
    });
    _heroPlaylist = buildHeroPlaylist();
    if (!_heroPlaylist.length) return;

    var mount = document.getElementById('hero-featured-vid');
    var phEl = document.getElementById('hero-vid-ph');
    var advBar = document.getElementById('hero-vid-adv-bar');
    var advName = document.getElementById('hero-vid-adv-name');
    var advLoc = document.getElementById('hero-vid-adv-loc');
    var sndBtn = document.getElementById('hero-vid-sound-btn');
    var viewsEl = document.getElementById('hero-vid-views');
    var host = mount && mount.parentNode;
    if (!host) return;

    if (phEl) phEl.style.display = 'none';
    wrapEl.style.display = '';
    wrapEl.classList.add('is-playing');
    try { host.classList.add('is-playing'); } catch (ePlay) { /* ignore */ }

    /* لا نصوص/شارات على مساحة الفيديو — حتى عدّاد المعلنين */
    if (viewsEl) {
      viewsEl.textContent = '';
      viewsEl.style.display = 'none';
    }
    if (phEl) phEl.style.display = 'none';

    function paintMeta(ad) {
      /* بلا كتابات على/فوق مساحة الإعلان — البيانات الاختيارية تحت الإطار فقط لاحقاً إن لزم */
      if (advBar && advName) {
        advName.textContent = '';
        if (advLoc) advLoc.textContent = '';
        advBar.style.display = 'none';
        advBar.onclick = null;
      }
      if (viewsEl) {
        viewsEl.textContent = '';
        viewsEl.style.display = 'none';
      }
      if (phEl) phEl.style.display = 'none';
      /* أخفِ أي طبقة عنوان داخل إطار الفيديو */
      try {
        host.querySelectorAll('.rzq-hero-caption, .hero-vid-ph-body, .hero-vid-adv-name').forEach(function (el) {
          if (el && el.closest && el.closest('.hero-vid-inner')) {
            el.style.display = 'none';
            el.textContent = '';
          }
        });
      } catch (eCap) { /* ignore */ }
      void ad;
    }

    function clearMount() {
      clearHeroAdvance();
      Array.prototype.slice.call(host.querySelectorAll('iframe, video#hero-featured-vid, video.rzq-hero-player'))
        .forEach(function (el) { try { el.remove(); } catch (eR) { /* ignore */ } });
    }

    function advance() {
      if (_heroPlaylist.length <= 1) {
        // فيديو المنصة وحده — أعد التشغيل
        playAt(0);
        return;
      }
      _heroIdx = (_heroIdx + 1) % _heroPlaylist.length;
      playAt(_heroIdx);
    }

    function playAt(i) {
      var ad = _heroPlaylist[i];
      if (!ad) return;
      _heroIdx = i;
      paintMeta(ad);
      clearMount();
      if (ad.accountId && !ad.isPlatform) trackEvent(ad.accountId, 'impression');

      if (isDirectVideo(ad.url)) {
        var v = document.createElement('video');
        v.id = 'hero-featured-vid';
        v.className = 'rzq-hero-player';
        v.controls = false;
        applyMobileVideoAttrs(v, posterForVideoUrl(ad.url));
        // حلقة واحدة فقط إن وُجدت إعلانات مدفوعة؛ وإلا loop مستمر
        v.loop = _heroPlaylist.length <= 1;
        if (v.loop) v.setAttribute('loop', '');
        else v.removeAttribute('loop');
        v.src = ad.url;
        v.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;background:#000';
        host.insertBefore(v, host.firstChild);
        host.classList.add('is-playing');
        var wrapEl = host.closest('.hero-vid-wrap');
        if (wrapEl) wrapEl.classList.add('is-playing');
        if (sndBtn) {
          sndBtn.style.display = '';
          sndBtn.textContent = '🔇';
          sndBtn.onclick = function () {
            v.muted = !v.muted;
            sndBtn.textContent = v.muted ? '🔇' : '🔊';
          };
        }
        var fsBtn = document.getElementById('hero-vid-fs-btn');
        if (fsBtn) {
          fsBtn.style.display = '';
          fsBtn.onclick = function (ev) {
            if (ev) { ev.preventDefault(); ev.stopPropagation(); }
            if (typeof window.toggleHeroVidFullscreen === 'function') {
              window.toggleHeroVidFullscreen();
              return;
            }
            var inner = host;
            var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
            try {
              if (fsEl) {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
              } else if (inner.requestFullscreen) inner.requestFullscreen();
              else if (inner.webkitRequestFullscreen) inner.webkitRequestFullscreen();
            } catch (eFs2) { /* ignore */ }
          };
        }
        /* عند أول تفاعل: ادخل شاشة كاملة للفيديو الترويجي */
        if (ad.isPlatform && wrapEl && !wrapEl.getAttribute('data-fs-bound')) {
          wrapEl.setAttribute('data-fs-bound', '1');
          wrapEl.addEventListener('dblclick', function () {
            if (typeof window.toggleHeroVidFullscreen === 'function') window.toggleHeroVidFullscreen();
          });
        }
        var saveDataHero = prefersSaveData();
        v.autoplay = !saveDataHero;
        if (saveDataHero) {
          try { v.pause(); } catch (eSd) { /* ignore */ }
        } else {
          v.play().catch(function () { /* autoplay policies */ });
        }
        if (!v.loop) {
          v.onended = function () { advance(); };
        }
        return;
      }

      var embedSrc = buildEmbedSrc(ad.url, { mute: 1, autoplay: 1, controls: 1 });
      if (!embedSrc) {
        advance();
        return;
      }
      // لا loop على عنصر واحد — التقدّم يتم بالمؤقّت حتى نعود لفيديو المنصة
      var id = ytId(ad.url);
      if (id) {
        embedSrc = 'https://www.youtube.com/embed/' + id +
          '?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1';
      }
      var iframe = makeIframe(embedSrc, '100%', '100%');
      iframe.className = 'rzq-hero-player';
      host.insertBefore(iframe, host.firstChild);
      host.classList.add('is-playing');
      var wrapEl2 = host.closest('.hero-vid-wrap');
      if (wrapEl2) wrapEl2.classList.add('is-playing');
      if (sndBtn) sndBtn.style.display = 'none';
      var slotSec = Math.max(8, Math.min(120, Number(config.adSlotSeconds) || DEFAULT_AD_SLOT_SEC));
      _heroAdvanceTimer = setTimeout(advance, slotSec * 1000);
    }

    playAt(0);
  }

  // ════════════════════════════════════════
  //  ② STRIP — بطاقات فيديو عمودية (بديل الموضع الثاني)
  // ════════════════════════════════════════
  var STRIP_TARGET = 6;

  /** وضع لمس / جوال: تشغيل تلقائي صامت — لا يعتمد على hover */
  function isTouchPlaybackMode() {
    try {
      if (window.matchMedia('(pointer: coarse)').matches) return true;
      if (window.matchMedia('(hover: none)').matches) return true;
      if (window.matchMedia('(max-width: 699px)').matches) return true;
    } catch (e) { /* ignore */ }
    return window.innerWidth < 700;
  }

  /** توفير البيانات — لا تشغيل تلقائي */
  function prefersSaveData() {
    try {
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return !!(c && c.saveData);
    } catch (e) { return false; }
  }

  /** غلاف الفيديو من مسار mp4 المعروف (…-light.mp4 → …-poster.jpg) */
  function posterForVideoUrl(url) {
    var u = String(url || '').trim();
    if (!u || !/\.mp4(\?|#|$)/i.test(u)) return '';
    return u.replace(/-light\.mp4(?=([?#]|$))/i, '-poster.jpg')
      .replace(/\.mp4(?=([?#]|$))/i, '-poster.jpg');
  }

  function applyMobileVideoAttrs(v, posterUrl) {
    if (!v) return;
    v.muted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.playsInline = true;
    v.loop = true;
    v.setAttribute('loop', '');
    v.preload = 'none';
    v.setAttribute('preload', 'none');
    if (posterUrl) {
      v.poster = posterUrl;
      v.setAttribute('poster', posterUrl);
    }
  }

  /** مسار نسبي حتى يعمل على GitHub Pages (/rizq-platform/) وليس فقط على الجذر */
  function resolvePromoUrl(url) {
    var u = String(url || '').trim();
    if (!u) return u;
    if (/^https?:\/\//i.test(u) || u.indexOf('//') === 0 || u.indexOf('data:') === 0) return u;
    if (u.charAt(0) === '/') u = u.replace(/^\//, '');
    try {
      var base = window.location.href.replace(/[^/]*$/, '');
      return new URL(u, base).href;
    } catch (e) {
      return u;
    }
  }

  function demoStripAds() {
    /* 6 بطاقات ظاهرة أكبر — ملف mp4 لكل بطاقة بلا تكرار */
    return [
      { advertiser: 'محلات رزق', title: 'واجهة محلك', loc: 'نوّاكشوط', url: 'rizq-assets/promo/rizq-dashboard-store-demo-light.mp4', active: true, demo: true },
      { advertiser: 'مكاتب رزق', title: 'مكتب أعمالك', loc: 'موريتانيا', url: 'rizq-assets/promo/rizq-dashboard-office-demo-light.mp4', active: true, demo: true },
      { advertiser: 'معارض رزق', title: 'معرضك الافتراضي', loc: 'كل الولايات', url: 'rizq-assets/promo/rizq-dashboard-corp-demo-light.mp4', active: true, demo: true },
      { advertiser: 'رزق', title: 'واجهات المنصة', loc: 'Rizq ADS', url: 'rizq-assets/promo/rizq-public-interfaces-promo-light.mp4', active: true, demo: true },
      { advertiser: 'رزق', title: 'منصة رزق', loc: 'موريتانيا', url: 'rizq-assets/promo/rizq-platform-promo-clean-light.mp4', active: true, demo: true },
      { advertiser: 'رزق', title: 'وحدات المنصة', loc: 'شرح عملي', url: 'rizq-assets/promo/rizq-modules-promo-demo-light.mp4', active: true, demo: true }
    ].map(function (a) {
      return Object.assign({}, a, { url: resolvePromoUrl(a.url) });
    });
  }

  /** دائماً املأ الشريط إلى 6 بطاقات — لا تترك إعلاناً واحداً من الإعدادات يستبدل كل الأمثلة */
  function buildStripPlaylist() {
    var live = (stripAds || []).filter(function (a) {
      return a && a.url && isDirectVideo(a.url);
    }).map(function (a) {
      return Object.assign({}, a, { url: resolvePromoUrl(a.url) });
    });
    var demos = demoStripAds();
    var out = live.slice(0, STRIP_TARGET);
    var di = 0;
    while (out.length < STRIP_TARGET && di < demos.length) {
      out.push(demos[di++]);
    }
    while (out.length < STRIP_TARGET) {
      out.push(demos[out.length % demos.length]);
    }
    return out;
  }

  function syncStripActionUi(card) {
    if (!card) return;
    var video = card.querySelector('video');
    var btnPlay = card.querySelector('[data-act="play"]');
    var btnMute = card.querySelector('[data-act="mute"]');
    if (!video) return;
    var isFr = (document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0
      || document.body.classList.contains('rizq-lang-fr')
      || document.documentElement.getAttribute('dir') === 'ltr';
    if (btnPlay) {
      var playing = !video.paused && card.classList.contains('is-playing');
      var ico = btnPlay.querySelector('.rizq-vcard-act-ico');
      var lbl = btnPlay.querySelector('.rizq-vcard-act-lbl');
      if (ico) ico.textContent = playing ? '⏸' : '▶';
      if (lbl) lbl.textContent = playing ? (isFr ? 'Pause' : 'إيقاف') : (isFr ? 'Lire' : 'تشغيل');
      btnPlay.classList.toggle('is-on', playing);
    }
    if (btnMute) {
      var icoM = btnMute.querySelector('.rizq-vcard-act-ico');
      var lblM = btnMute.querySelector('.rizq-vcard-act-lbl');
      if (icoM) icoM.textContent = video.muted ? '🔇' : '🔊';
      if (lblM) lblM.textContent = video.muted ? (isFr ? 'Couper' : 'كتم') : (isFr ? 'Son' : 'صوت');
      btnMute.classList.toggle('is-on', !video.muted);
    }
  }

  function stopStripVideo(card) {
    if (!card) return;
    // لا توقف البطاقة أثناء نافذة التكبير
    if (_stripLightbox && _stripLightbox.getAttribute('data-card-id') === card.getAttribute('data-strip-id')) {
      return;
    }
    var v = card.querySelector('video');
    if (v) {
      try { v.pause(); v.currentTime = 0; } catch (e) { /* ignore */ }
      v.muted = true;
    }
    card.classList.remove('is-playing');
    card.removeAttribute('data-sound-on');
    if (_stripPlaying === card) _stripPlaying = null;
    syncStripActionUi(card);
  }

  function closeStripLightbox() {
    if (!_stripLightbox) return;
    var vid = _stripLightbox.querySelector('video');
    if (vid) {
      try { vid.pause(); } catch (e) { /* ignore */ }
    }
    var cardId = _stripLightbox.getAttribute('data-card-id');
    _stripLightbox.classList.remove('is-open');
    _stripLightbox.setAttribute('aria-hidden', 'true');
    _stripLightbox.removeAttribute('data-card-id');
    document.body.classList.remove('rizq-vstrip-lb-on');
    if (cardId) {
      var card = document.querySelector('.rizq-vcard[data-strip-id="' + cardId + '"]');
      if (card) stopStripVideo(card);
    }
  }

  function openStripLightbox(card, ad, isFr) {
    if (!card) return;
    var srcVideo = card.querySelector('video');
    if (!srcVideo || !srcVideo.currentSrc && !srcVideo.src) return;

    if (!_stripLightbox) {
      _stripLightbox = document.createElement('div');
      _stripLightbox.id = 'rizq-vstrip-lightbox';
      _stripLightbox.className = 'rizq-vstrip-lb';
      _stripLightbox.setAttribute('role', 'dialog');
      _stripLightbox.setAttribute('aria-modal', 'true');
      _stripLightbox.innerHTML =
        '<div class="rizq-vstrip-lb-panel">' +
          '<button type="button" class="rizq-vstrip-lb-close" data-lb="close" aria-label="إغلاق">×</button>' +
          '<video playsinline controls></video>' +
          '<div class="rizq-vstrip-lb-cap" data-lb="cap"></div>' +
          '<div class="rizq-vstrip-lb-tools">' +
            '<button type="button" data-lb="mute" aria-label="صوت">🔇</button>' +
            '<button type="button" data-lb="fs" aria-label="شاشة كاملة">⛶</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(_stripLightbox);
      _stripLightbox.addEventListener('click', function (ev) {
        if (ev.target === _stripLightbox) closeStripLightbox();
      });
      _stripLightbox.querySelector('[data-lb="close"]').addEventListener('click', function (ev) {
        ev.preventDefault();
        closeStripLightbox();
      });
      _stripLightbox.querySelector('[data-lb="mute"]').addEventListener('click', function (ev) {
        ev.preventDefault();
        var v = _stripLightbox.querySelector('video');
        if (!v) return;
        v.muted = !v.muted;
        ev.currentTarget.textContent = v.muted ? '🔇' : '🔊';
      });
      _stripLightbox.querySelector('[data-lb="fs"]').addEventListener('click', function (ev) {
        ev.preventDefault();
        var panel = _stripLightbox.querySelector('.rizq-vstrip-lb-panel');
        var v = _stripLightbox.querySelector('video');
        var el = panel || v;
        if (!el) return;
        try {
          if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          } else if (el.requestFullscreen) el.requestFullscreen();
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
          else if (v && v.webkitEnterFullscreen) v.webkitEnterFullscreen();
        } catch (eFs) { /* ignore */ }
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && _stripLightbox && _stripLightbox.classList.contains('is-open')) {
          closeStripLightbox();
        }
      });
    }

    var title = (ad && (ad.title || ad.advertiser)) || (isFr ? 'Offre Rizq' : 'عرض رزق');
    var v = _stripLightbox.querySelector('video');
    var cap = _stripLightbox.querySelector('[data-lb="cap"]');
    var muteBtn = _stripLightbox.querySelector('[data-lb="mute"]');
    var cardId = card.getAttribute('data-strip-id') || ('c' + Date.now());
    card.setAttribute('data-strip-id', cardId);
    _stripLightbox.setAttribute('data-card-id', cardId);
    _stripLightbox.setAttribute('aria-label', isFr ? 'Agrandir la vidéo' : 'تكبير الفيديو');
    if (cap) cap.textContent = title;
    v.src = srcVideo.currentSrc || srcVideo.src;
    v.muted = false;
    v.loop = true;
    v.currentTime = srcVideo.currentTime || 0;
    if (muteBtn) muteBtn.textContent = '🔊';
    _stripLightbox.classList.add('is-open');
    _stripLightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('rizq-vstrip-lb-on');
    playStripVideo(card);
    var p = v.play();
    if (p && typeof p.then === 'function') p.catch(function () { v.muted = true; v.play().catch(function () {}); });
    if (ad && ad.accountId) trackEvent(ad.accountId, 'click');
  }

  function playStripVideo(card) {
    if (!card) return;
    if (_stripPlaying === card) {
      // أعد المحاولة إن توقف المتصفح بصمت، مع احترام اختيار الصوت
      var same = card.querySelector('video');
      if (same && same.paused) {
        if (card.getAttribute('data-sound-on') !== '1') same.muted = true;
        same.play().catch(function () { /* ignore */ });
      }
      syncStripActionUi(card);
      return;
    }
    if (_stripPlaying) stopStripVideo(_stripPlaying);
    var v = card.querySelector('video');
    if (!v) return;
    // التشغيل التلقائي دائماً صامت؛ الصوت يبقى بعد لمسة المستخدم فقط
    if (card.getAttribute('data-sound-on') !== '1') v.muted = true;
    var p = v.play();
    if (p && typeof p.then === 'function') {
      p.then(function () {
        card.classList.add('is-playing');
        _stripPlaying = card;
        syncStripActionUi(card);
      }).catch(function () { /* autoplay policies */ });
    } else {
      card.classList.add('is-playing');
      _stripPlaying = card;
      syncStripActionUi(card);
    }
  }

  function initStrip() {
    var root = document.getElementById('rizq-vid-strip');
    var track = document.getElementById('rizq-vid-strip-track');
    var countEl = document.getElementById('rizq-vid-strip-count');
    var prevBtn = document.getElementById('rizq-vid-strip-prev');
    var nextBtn = document.getElementById('rizq-vid-strip-next');
    if (!root || !track) return false;

    // دائماً 6 بطاقات ظاهرة أكبر: إعلانات حيّة أولاً ثم أمثلة شغّالة تملأ الباقي
    var ads = buildStripPlaylist();

    var isFr = (document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0
      || document.body.classList.contains('rizq-lang-fr')
      || document.documentElement.getAttribute('dir') === 'ltr';
    var vidLbl = isFr ? 'Vidéo' : 'فيديو';
    var lblPlay = isFr ? 'Lire' : 'تشغيل';
    var lblMute = isFr ? 'Couper' : 'كتم';
    var lblFs = isFr ? 'Agrandir' : 'تكبير';
    var countTpl = isFr
      ? function (n) { return n + ' vidéo' + (n > 1 ? 's' : '') + ' disponible' + (n > 1 ? 's' : ''); }
      : function (n) { return n === 1 ? 'فيديو واحد متاح' : (n + ' فيديوهات متاحة'); };

    track.innerHTML = '';
    ads.forEach(function (ad, adIdx) {
      var card = document.createElement('article');
      card.className = 'rizq-vcard';
      card.tabIndex = 0;
      card.setAttribute('data-strip-id', 'strip-' + adIdx);
      var title = ad.title || ad.advertiser || (isFr ? 'Offre Rizq' : 'عرض رزق');
      var sub = [ad.loc, ad.advertiser].filter(Boolean).join(' · ');
      var posterUrl = posterForVideoUrl(ad.url);
      card.innerHTML =
        '<div class="rizq-vcard-thumb">' +
          '<video muted playsinline loop preload="none"' +
            (posterUrl ? ' poster="' + esc(posterUrl) + '"' : '') +
            ' src="' + esc(ad.url) + '"></video>' +
          '<div class="rizq-vcard-shade"></div>' +
          '<span class="rizq-vcard-tag">' + esc(vidLbl) + '</span>' +
          '<span class="rizq-vcard-play" aria-hidden="true">▶</span>' +
          '<div class="rizq-vcard-actions" role="toolbar" aria-label="' + esc(isFr ? 'Actions vidéo' : 'أدوات الفيديو') + '">' +
            '<button type="button" class="rizq-vcard-act" data-act="play" aria-label="' + esc(lblPlay) + '">' +
              '<span class="rizq-vcard-act-ico">▶</span><span class="rizq-vcard-act-lbl">' + esc(lblPlay) + '</span>' +
            '</button>' +
            '<button type="button" class="rizq-vcard-act" data-act="mute" aria-label="' + esc(lblMute) + '">' +
              '<span class="rizq-vcard-act-ico">🔇</span><span class="rizq-vcard-act-lbl">' + esc(lblMute) + '</span>' +
            '</button>' +
            '<button type="button" class="rizq-vcard-act rizq-vcard-act--fs" data-act="fs" aria-label="' + esc(lblFs) + '" title="' + esc(lblFs) + '">' +
              '<span class="rizq-vcard-act-ico">⛶</span><span class="rizq-vcard-act-lbl">' + esc(lblFs) + '</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="rizq-vcard-name">' + esc(title) + '</div>' +
        (sub ? '<div class="rizq-vcard-sub">' + esc(sub) + '</div>' : '');

      var video = card.querySelector('video');
      applyMobileVideoAttrs(video, posterUrl);
      var btnPlay = card.querySelector('[data-act="play"]');
      var btnMute = card.querySelector('[data-act="mute"]');
      var btnFs = card.querySelector('[data-act="fs"]');
      var hoverPlayTimer = null;
      var touchMode = isTouchPlaybackMode();

      function clearHoverPlayTimer() {
        if (hoverPlayTimer) {
          clearTimeout(hoverPlayTimer);
          hoverPlayTimer = null;
        }
      }

      function syncActionUi() {
        if (!video) return;
        if (btnPlay) {
          var playing = !video.paused && card.classList.contains('is-playing');
          btnPlay.querySelector('.rizq-vcard-act-ico').textContent = playing ? '❚❚' : '▶';
          btnPlay.querySelector('.rizq-vcard-act-lbl').textContent = playing
            ? (isFr ? 'Pause' : 'إيقاف')
            : lblPlay;
          btnPlay.classList.toggle('is-on', playing);
        }
        if (btnMute) {
          btnMute.querySelector('.rizq-vcard-act-ico').textContent = video.muted ? '🔇' : '🔊';
          btnMute.querySelector('.rizq-vcard-act-lbl').textContent = video.muted
            ? lblMute
            : (isFr ? 'Son' : 'صوت');
          btnMute.classList.toggle('is-on', !video.muted);
        }
      }

      // سطح المكتب فقط: مرور = تشغيل بعد تأخير قصير؛ مغادرة = توقف
      if (!touchMode) {
        card.addEventListener('mouseenter', function () {
          clearHoverPlayTimer();
          hoverPlayTimer = setTimeout(function () {
            hoverPlayTimer = null;
            playStripVideo(card);
            syncActionUi();
          }, 480);
        });
        card.addEventListener('mouseleave', function () {
          clearHoverPlayTimer();
          if (_stripLightbox && _stripLightbox.classList.contains('is-open')) return;
          stopStripVideo(card);
          syncActionUi();
        });
      }

      if (btnPlay) {
        btnPlay.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          clearHoverPlayTimer();
          if (card.classList.contains('is-playing') && video && !video.paused) {
            try { video.pause(); } catch (e) {}
            card.classList.remove('is-playing');
            if (_stripPlaying === card) _stripPlaying = null;
          } else {
            playStripVideo(card);
          }
          syncActionUi();
        });
      }
      if (btnMute) {
        btnMute.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          if (!video) return;
          if (!card.classList.contains('is-playing')) playStripVideo(card);
          video.muted = !video.muted;
          syncActionUi();
        });
      }
      if (btnFs) {
        btnFs.addEventListener('click', function (ev) {
          ev.preventDefault(); ev.stopPropagation();
          openStripLightbox(card, ad, isFr);
        });
      }

      // جوال: لمسة على البطاقة = تشغيل الصوت فقط (الفيديو يشتغل تلقائياً عند الظهور)
      // مع توفير البيانات: اللمسة تشغّل الفيديو صامتاً أولاً
      card.addEventListener('click', function (ev) {
        if (ev.target.closest && ev.target.closest('.rizq-vcard-actions')) return;
        if (!isTouchPlaybackMode()) return;
        ev.preventDefault();
        _stripPickLockUntil = Date.now() + 900;
        if (!video) return;
        if (!card.classList.contains('is-playing') || video.paused) {
          playStripVideo(card);
          syncActionUi();
        } else {
          video.muted = !video.muted;
          if (video.muted) card.removeAttribute('data-sound-on');
          else card.setAttribute('data-sound-on', '1');
          syncActionUi();
        }
        if (ad.accountId) trackEvent(ad.accountId, 'click');
      });
      card.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          if (card.classList.contains('is-playing')) stopStripVideo(card);
          else playStripVideo(card);
          syncActionUi();
        }
      });

      if (ad.accountId && !ad.demo) trackEvent(ad.accountId, 'impression');
      track.appendChild(card);
    });

    if (countEl) countEl.textContent = countTpl(ads.length);

    function updateNav() {
      if (!prevBtn || !nextBtn) return;
      var maxScroll = Math.max(0, track.scrollWidth - track.clientWidth - 2);
      var sl = Math.abs(track.scrollLeft);
      // RTL: scrollLeft قد يكون سالباً أو من اليمين حسب المتصفح
      var atStart = sl <= 2;
      var atEnd = sl >= maxScroll - 2;
      if (document.documentElement.getAttribute('dir') === 'rtl') {
        // في معظم المتصفحات الحديثة scrollLeft سالب في RTL
        var rtlLeft = track.scrollLeft;
        atStart = rtlLeft >= -2;
        atEnd = rtlLeft <= -maxScroll + 2 || (rtlLeft >= 0 && sl >= maxScroll - 2);
      }
      prevBtn.disabled = atStart;
      nextBtn.disabled = atEnd && maxScroll > 0 ? atEnd : maxScroll <= 0;
      if (maxScroll <= 0) { prevBtn.disabled = true; nextBtn.disabled = true; }
    }

    function scrollByCard(dir) {
      var card = track.querySelector('.rizq-vcard');
      var step = card ? card.getBoundingClientRect().width + 10 : 180;
      var rtl = document.documentElement.getAttribute('dir') === 'rtl';
      var delta = step * dir * (rtl ? -1 : 1);
      track.scrollBy({ left: delta, behavior: 'smooth' });
      setTimeout(updateNav, 320);
    }

    if (prevBtn) prevBtn.onclick = function () { scrollByCard(-1); };
    if (nextBtn) nextBtn.onclick = function () { scrollByCard(1); };
    track.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
    updateNav();
    root.hidden = false;
    root.style.display = '';

    /* تلميح الجوال: اضغط لتشغيل الصوت — سطح المكتب يبقى «مرّر الماوس» */
    (function syncStripHint() {
      var hint = root.querySelector('.rizq-vid-strip-hint');
      if (!hint) return;
      function apply() {
        var tap = isTouchPlaybackMode();
        var key = tap
          ? (hint.getAttribute('data-t-mobile') || 'vstrip-hint-tap')
          : (hint.getAttribute('data-t') || 'vstrip-hint');
        var ar = {
          'vstrip-hint': 'مرّر الماوس للتشغيل',
          'vstrip-hint-tap': 'اضغط لتشغيل الصوت 🔊'
        };
        var fr = {
          'vstrip-hint': 'Survolez pour lire',
          'vstrip-hint-tap': 'Appuyez pour activer le son 🔊'
        };
        /* إن وُجدت ترجمة الصفحة استخدمها */
        try {
          if (typeof window.rizqGetT === 'function') {
            var tr = window.rizqGetT(key);
            if (tr) { hint.textContent = tr; return; }
          }
        } catch (eT) { /* ignore */ }
        hint.textContent = isFr ? (fr[key] || fr['vstrip-hint']) : (ar[key] || ar['vstrip-hint']);
      }
      apply();
      window.addEventListener('resize', apply);
    })();

    /*
     * جوال/لمس: تشغيل تلقائي صامت عند ظهور ≥50%، وإيقاف عند الخروج.
     * فيديو واحد فقط — الأكثر ظهوراً. saveData ⇒ غلاف + زر ▶️ بلا تلقائي.
     * سطح المكتب: hover كما هو.
     */
    (function bindStripVisibilityPlay() {
      if (!isTouchPlaybackMode() || typeof IntersectionObserver === 'undefined') return;
      var cards = Array.prototype.slice.call(track.querySelectorAll('.rizq-vcard'));
      if (!cards.length) return;
      var saveData = prefersSaveData();
      var ratios = new Map();
      var heroWrap = document.getElementById('hero-vid-wrap');
      var heroRatio = 0;

      function pauseHeroForStrip() {
        var hv = document.getElementById('hero-featured-vid')
          || (heroWrap && heroWrap.querySelector('video'));
        if (!hv) return;
        try { hv.pause(); } catch (e) { /* ignore */ }
      }

      function resumeHeroIfVisible() {
        if (saveData || heroRatio < 0.5) return;
        if (_stripPlaying) return;
        var hv = document.getElementById('hero-featured-vid')
          || (heroWrap && heroWrap.querySelector('video'));
        if (!hv) return;
        hv.muted = true;
        hv.play().catch(function () { /* ignore */ });
      }

      function pickMostVisible() {
        if (saveData) return; // غلاف + زر فقط
        if (Date.now() < _stripPickLockUntil) return;
        var bestCard = null;
        var bestR = 0;
        var bestArea = 0;
        ratios.forEach(function (r, card) {
          if (r < 0.5) return;
          var rect = card.getBoundingClientRect();
          var vh = window.innerHeight || 1;
          var vw = window.innerWidth || 1;
          var visibleH = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
          var visibleW = Math.max(0, Math.min(rect.right, vw) - Math.max(rect.left, 0));
          var area = visibleH * visibleW;
          // نسبة الظهور أولاً، ثم المساحة عند التعادل
          if (r > bestR || (r === bestR && area > bestArea)) {
            bestArea = area;
            bestR = r;
            bestCard = card;
          }
        });
        var heroArea = 0;
        if (heroWrap && heroRatio >= 0.5) {
          var hr = heroWrap.getBoundingClientRect();
          var hvh = window.innerHeight || 1;
          var hvw = window.innerWidth || 1;
          heroArea = Math.max(0, Math.min(hr.bottom, hvh) - Math.max(hr.top, 0))
            * Math.max(0, Math.min(hr.right, hvw) - Math.max(hr.left, 0));
        }
        // ثبات: أبقِ الفيديو الحالي إن بقي ظاهراً ≥40% ولم يتفوّق عليه آخر بوضوح
        if (_stripPlaying && ratios.has(_stripPlaying)) {
          var curR = ratios.get(_stripPlaying) || 0;
          if (curR >= 0.4 && (!bestCard || curR >= bestR - 0.08)) {
            bestCard = _stripPlaying;
            bestR = curR;
          }
        }

        // البطل يفوز فقط إن كانت نسبة ظهوره أعلى (أو مساوية بمساحة أكبر)
        if (heroRatio >= 0.5 && (heroRatio > bestR || (heroRatio === bestR && heroArea >= bestArea))) {
          cards.forEach(function (c) { stopStripVideo(c); });
          resumeHeroIfVisible();
          return;
        }
        cards.forEach(function (c) {
          if (c === bestCard) {
            pauseHeroForStrip();
            playStripVideo(c);
          } else {
            stopStripVideo(c);
          }
        });
        if (!bestCard) resumeHeroIfVisible();
      }

      function visibleRatio(el) {
        if (!el) return 0;
        var r = el.getBoundingClientRect();
        var vh = window.innerHeight || 1;
        var vw = window.innerWidth || 1;
        var visibleH = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        var visibleW = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
        if (r.height <= 0 || r.width <= 0) return 0;
        return (visibleH / r.height) * (visibleW / r.width);
      }

      function remeasureAndPick() {
        cards.forEach(function (card) { ratios.set(card, visibleRatio(card)); });
        heroRatio = heroWrap ? visibleRatio(heroWrap) : 0;
        pickMostVisible();
      }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (heroWrap && entry.target === heroWrap) {
            heroRatio = entry.isIntersecting ? entry.intersectionRatio : 0;
            return;
          }
          ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        pickMostVisible();
      }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

      cards.forEach(function (card) {
        var v = card.querySelector('video');
        applyMobileVideoAttrs(v, v && v.getAttribute('poster'));
        ratios.set(card, 0);
        io.observe(card);
      });
      if (heroWrap) io.observe(heroWrap);

      // تمرير عمودي/أفقي — قياس هندسي احتياطي أدق من IO وحده
      track.addEventListener('scroll', function () {
        window.requestAnimationFrame(remeasureAndPick);
      }, { passive: true });
      window.addEventListener('scroll', function () {
        window.requestAnimationFrame(remeasureAndPick);
      }, { passive: true });
      window.addEventListener('resize', function () {
        window.requestAnimationFrame(remeasureAndPick);
      });
      setTimeout(remeasureAndPick, 120);
    })();

    return true;
  }

  // ════════════════════════════════════════
  //  POPUP — احتياطي للصفحات بلا شريط بطاقات
  // ════════════════════════════════════════
  function initPopup() {
    if (!popupAds.length) return;
    if (sessionStorage.getItem('rzq_pop_shown')) return; // مرة واحدة بالجلسة

    // — تحديد المعلن بالدور (دوران بالزوار) —
    var counter = parseInt(localStorage.getItem('rzq_pop_ctr') || '0', 10);
    var adIdx   = counter % popupAds.length;
    localStorage.setItem('rzq_pop_ctr', (counter + 1).toString());
    sessionStorage.setItem('rzq_pop_shown', '1');

    var ad = popupAds[adIdx];
    var embedSrc = buildEmbedSrc(ad.url, { mute: 1, autoplay: 1, controls: 0 });
    if (!embedSrc) return;
    if (ad.accountId) trackEvent(ad.accountId, 'impression');

    // YouTube: أضف loop
    var id = ytId(ad.url);
    if (id) embedSrc += '&loop=1&playlist=' + id;

    // — بناء الشريط —
    var bar = document.createElement('div');
    bar.id  = 'rzq-pop-bar';
    bar.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0',
      'z-index:100000',
      'height:' + BAR_H + 'px',
      'background:#070f1a',
      'border-bottom:2px solid rgba(201,168,76,.4)',
      'overflow:hidden',
      'display:flex', 'align-items:stretch'
    ].join(';');

    // شارة RIZQ ADS
    var badge = document.createElement('div');
    badge.style.cssText = [
      'position:absolute', 'top:6px', 'right:10px', 'z-index:2',
      'background:rgba(201,168,76,.15)',
      'border:1px solid rgba(201,168,76,.45)',
      'padding:2px 10px', 'border-radius:20px',
      'font-size:10px', 'font-weight:700',
      'color:#C9A84C', 'letter-spacing:1.2px',
      'font-family:sans-serif', 'white-space:nowrap',
      'pointer-events:none'
    ].join(';');
    badge.innerHTML = '● RIZQ ADS' + (ad.vipBadge ? ' · VIP' : (ad.featuredBadge ? ' · مميّز' : ''));

    // اسم المعلن (أسفل يمين)
    var advLabel = null;
    if (ad.advertiser) {
      advLabel = document.createElement('div');
      advLabel.style.cssText = [
        'position:absolute', 'bottom:5px', 'right:10px', 'z-index:2',
        'font-size:9px', 'color:rgba(255,255,255,.4)',
        'font-family:sans-serif', 'cursor:pointer'
      ].join(';');
      advLabel.textContent = esc(ad.advertiser);
      if (ad.accountId) {
        advLabel.onclick = function () { trackEvent(ad.accountId, 'click'); };
      }
    }

    // iframe الفيديو
    var iframe = makeIframe(embedSrc, '100%', BAR_H + 'px');

    bar.appendChild(badge);
    if (advLabel) bar.appendChild(advLabel);
    bar.appendChild(iframe);

    // — ضبط الصفحة لإفساح المجال للشريط —
    _adjustPageForBar(BAR_H);

    document.body.prepend(bar);
  }

  /** دفع المحتوى والنافبار أسفل شريط الـ Popup */
  function _adjustPageForBar(h) {
    // إضافة style rule لدفع النافبار المثبّت
    var style = document.createElement('style');
    style.id  = 'rzq-pop-style';
    style.textContent =
      // النافبار في landing
      '.rzq-nav { top: ' + h + 'px !important; }' +
      // النافبار في باقي الصفحات
      '.topnav   { top: ' + h + 'px !important; }' +
      // شريط الإشعار القانوني الثابت (إن وُجد)
      '.rzq-legal-notice { top: ' + h + 'px !important; }';
    document.head.appendChild(style);

    // padding-top للصفحة (لحماية المحتوى العادي)
    var body = document.body;
    var curPad = parseFloat(getComputedStyle(body).paddingTop || '0');
    body.style.paddingTop = (curPad + h) + 'px';
  }

  // ════════════════════════════════════════
  //  التشغيل
  // ════════════════════════════════════════
  function run() {
    // Hero يعمل حتى بدون معلنين مدفوعين إن وُجد فيديو المنصة المزروع
    initHero();
    // الموضع الثاني: شريط البطاقات على الرئيسية؛ وإلا popup قديم إن وُجدت إعلانات
    var usedStrip = initStrip();
    if (!usedStrip && popupAds.length) initPopup();
  }

  function _startWithConfig(cfg) {
    config   = cfg || {};
    heroAds  = (config.hero  || []).filter(function (a) { return a.active !== false; });
    popupAds = (config.popup || []).filter(function (a) { return a.active !== false; });
    // strip جديد؛ إن لم يُعرَّف نعيد استخدام popup كمصدر للبطاقات (توافق)
    stripAds = (config.strip || config.popup || []).filter(function (a) { return a.active !== false; });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  // ── إصلاح جوهري: كان هذا الملف يقرأ rizq_video_ads من localStorage فقط —
  // أي زائر يفتح المنصة من جهاز لم يفتح فيه الأدمن لوحة التحكم من قبل لن
  // يرى أي إعلان فيديو إطلاقاً مهما أضاف الأدمن من جهازه الخاص. نحاول
  // الخادم أولاً (بمهلة قصيرة 1.2 ثانية حتى لا نؤخر الصفحة لزائر حقيقي)
  // ثم محلياً كخيار بديل فوري إن تعذّر الوصول أو لم يُنشر الخادم بعد.
  if (window.RIZQ_BACKEND_BASE) {
    var _settled = false;
    var _localFallbackTimer = setTimeout(function () {
      if (_settled) return; _settled = true;
      _startWithConfig(_loadLocalVideoAdsConfig());
    }, 1200);
    fetch(window.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/site-config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (_settled) return; _settled = true;
        clearTimeout(_localFallbackTimer);
        var remote = data && data.ok && data.config && data.config.videoAds;
        if (remote && typeof remote === 'object' && (Array.isArray(remote.hero) || Array.isArray(remote.popup) || Array.isArray(remote.strip))) {
          try { localStorage.setItem('rizq_video_ads', JSON.stringify(remote)); } catch (e) {}
          _startWithConfig(remote);
        } else {
          _startWithConfig(_loadLocalVideoAdsConfig());
        }
      }).catch(function () {
        if (_settled) return; _settled = true;
        clearTimeout(_localFallbackTimer);
        _startWithConfig(_loadLocalVideoAdsConfig());
      });
  } else {
    _startWithConfig(_loadLocalVideoAdsConfig());
  }

})();
