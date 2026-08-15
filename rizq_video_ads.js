// ═══════════════════════════════════════════════════════════════════
// rizq_video_ads.js — Rizq ADS Video Engine v2.0
// ═══════════════════════════════════════════════════════════════════
// أمان: لا ملفات فيديو على سيرفرنا — كل شيء embed من YouTube / Facebook
//
// الموضع الأول — HERO:
//   Playlist دوراني تلقائي (فيديو → فيديو) لجميع المعلنين في قائمة Hero
//   يظهر داخل بطاقة الـ Hero في الصفحة الرئيسية
//   الزائر يختار — يمكنه التمرير عليه أو تجاهله
//
// الموضع الثاني — POPUP:
//   شريط ثابت أعلى كل صفحات المنصة (position:fixed top:0)
//   muted تلقائياً — لا زر إغلاق — يبقى طول الجلسة
//   يدور بالزوار: زائر 1 → محمد, زائر 2 → أحمد, زائر 3 → فاطمة ...
//
// الإعدادات في localStorage تحت المفتاح: 'rizq_video_ads'
// تُعدَّل من لوحة الأدمن (تبويب "Rizq ADS — الفيديو")
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

  // ════════════════════════════════════════
  //  ① HERO — Playlist دوراني
  // ════════════════════════════════════════
  function initHero() {
    var wrapEl  = document.getElementById('hero-vid-wrap');
    if (!wrapEl || !heroAds.length) return; // لسنا في الصفحة الرئيسية

    var vidEl   = document.getElementById('hero-featured-vid');
    var phEl    = document.getElementById('hero-vid-ph');
    var advBar  = document.getElementById('hero-vid-adv-bar');
    var advName = document.getElementById('hero-vid-adv-name');
    var sndBtn  = document.getElementById('hero-vid-sound-btn');
    var viewsEl = document.getElementById('hero-vid-views');

    // — جمع كل IDs اليوتيوب —
    var ytIds = [];
    heroAds.forEach(function (a) {
      var id = ytId(a.url);
      if (id) ytIds.push(id);
    });

    var iframeSrc;
    if (ytIds.length) {
      // Playlist YouTube دوراني
      iframeSrc = buildYTPlaylistSrc(ytIds);
    } else {
      // Facebook — فيديو واحد مع loop
      iframeSrc = buildEmbedSrc(heroAds[0].url, { mute: 1, autoplay: 1, controls: 1 });
    }

    if (!iframeSrc) return;

    var iframe = makeIframe(iframeSrc, '100%', '100%');

    // استبدال <video> بـ <iframe>
    if (vidEl) {
      vidEl.parentNode.replaceChild(iframe, vidEl);
    }

    // إخفاء الـ placeholder
    if (phEl) phEl.style.display = 'none';

    // إخفاء زر الصوت (YouTube يتكفّل بالتحكم)
    if (sndBtn) sndBtn.style.display = 'none';

    // إظهار شريط المعلنين
    if (advBar && advName) {
      advName.textContent = heroAds.length > 1
        ? 'Rizq ADS · ' + heroAds.length + ' معلنون'
        : (heroAds[0].advertiser || 'Rizq ADS');
      advBar.style.display = 'block';
    }

    // عداد وهمي للزخم (يُستبدَل بأرقام حقيقية من الباك إند مستقبلاً)
    if (viewsEl && heroAds.length) {
      viewsEl.textContent = '👁 مُعلنون نشطون: ' + heroAds.length;
      viewsEl.style.display = 'block';
    }

    wrapEl.style.display = '';
  }

  // ════════════════════════════════════════
  //  ② POPUP — شريط أعلى الصفحة (لا يُغلق)
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
    badge.textContent = '● RIZQ ADS';

    // اسم المعلن (أسفل يمين)
    var advLabel = null;
    if (ad.advertiser) {
      advLabel = document.createElement('div');
      advLabel.style.cssText = [
        'position:absolute', 'bottom:5px', 'right:10px', 'z-index:2',
        'font-size:9px', 'color:rgba(255,255,255,.4)',
        'font-family:sans-serif', 'pointer-events:none'
      ].join(';');
      advLabel.textContent = esc(ad.advertiser);
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
    if (!heroAds.length && !popupAds.length) return; // لا معلنون نشطون — لا شيء لعرضه
    initHero();
    initPopup();
  }

  function _startWithConfig(cfg) {
    config   = cfg || {};
    heroAds  = (config.hero  || []).filter(function (a) { return a.active !== false; });
    popupAds = (config.popup || []).filter(function (a) { return a.active !== false; });
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
        if (remote && typeof remote === 'object' && (Array.isArray(remote.hero) || Array.isArray(remote.popup))) {
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
