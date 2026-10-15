/**
 * RizqLiveShowcase — بث يوتيوب موقّت لترويج بضاعة جديدة
 * حصري: الماسية الأساسية + الماسية Pro
 * حد يومي: 10 دقائق — يستبدل زاوية الفيديو الإضافي في الهيرو
 * بدون YouTube API: embed/live_stream?channel=ID + زر تفعيل بسيط
 */
(function (global) {
  'use strict';

  var DAILY_LIMIT_SEC = 10 * 60;
  var STORAGE_ACCOUNTS = 'rizq_pending_accounts';
  var STYLE_ID = 'rizq-live-showcase-css';
  var _timers = {};

  function _fr() {
    try {
      if (global.RizqI18n && typeof RizqI18n.getLang === 'function') return RizqI18n.getLang() === 'fr';
    } catch (e) {}
    return (localStorage.getItem('rizq_lang') || 'ar') === 'fr';
  }

  function _t(ar, fr) {
    return _fr() ? fr : ar;
  }

  function dayKeyNouakchott(d) {
    d = d || new Date();
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Nouakchott',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
    } catch (e) {
      return d.toISOString().slice(0, 10);
    }
  }

  function loadAccounts() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_ACCOUNTS) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveAccounts(list) {
    localStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(list));
  }

  function findAccount(accId) {
    var list = loadAccounts();
    var i;
    for (i = 0; i < list.length; i++) {
      if (list[i] && String(list[i].id) === String(accId)) return { acc: list[i], idx: i, list: list };
    }
    return null;
  }

  function patchAccount(accId, patch) {
    var hit = findAccount(accId);
    if (!hit) return null;
    Object.keys(patch).forEach(function (k) {
      hit.acc[k] = patch[k];
    });
    hit.list[hit.idx] = hit.acc;
    saveAccounts(hit.list);
    return hit.acc;
  }

  function resolveAccount(accOrId) {
    if (!accOrId) return null;
    if (typeof accOrId === 'object') return accOrId;
    var hit = findAccount(accOrId);
    return hit ? hit.acc : null;
  }

  function isDiamondEligible(acc) {
    acc = resolveAccount(acc);
    if (!acc) return false;
    var tier = String(acc.diamondTier || acc.planType || '').toLowerCase();
    if (tier === 'diamond_standard' || tier === 'diamond_pro' || tier === 'corp_diamond_pro' || tier === 'corp_diamond_standard') {
      return true;
    }
    if (acc.diamond === true) return true;
    var name = String(acc.planName || acc.plan || acc.package || '');
    var id = String(acc.packageId || acc.activatedPkgId || acc.planId || '');
    if (global.RizqSub && typeof RizqSub.isDiamondName === 'function') {
      if (RizqSub.isDiamondName(name)) return true;
    }
    return /ماس|diamond|diamant/i.test(name) || /diam/.test(id);
  }

  function parseChannelId(input) {
    var s = String(input || '').trim();
    if (!s) return '';
    /* UC… raw */
    if (/^UC[\w-]{20,}$/i.test(s)) return s;
    var m =
      s.match(/[?&]channel=([^&#]+)/i) ||
      s.match(/youtube\.com\/channel\/(UC[\w-]+)/i) ||
      s.match(/youtube\.com\/embed\/live_stream\?channel=(UC[\w-]+)/i);
    if (m && m[1]) return decodeURIComponent(m[1]).trim();
    /* @handle — لا يكفي وحده للـ live_stream بدون تحويل؛ نرفض ونطلب Channel ID */
    if (s.charAt(0) === '@') return '';
    if (/^[\w-]{16,}$/.test(s) && s.indexOf('http') !== 0) return s;
    return '';
  }

  function embedUrl(channelId) {
    var id = parseChannelId(channelId);
    if (!id) return '';
    return 'https://www.youtube.com/embed/live_stream?channel=' + encodeURIComponent(id) + '&autoplay=1&mute=1';
  }

  function normalizeDayUsage(acc) {
    var today = dayKeyNouakchott();
    if (String(acc.live_day_key || '') !== today) {
      acc.live_day_key = today;
      acc.live_seconds_used_today = 0;
    }
    acc.live_seconds_used_today = Math.max(0, parseInt(acc.live_seconds_used_today, 10) || 0);
    return acc;
  }

  function remainingDailySec(acc) {
    acc = normalizeDayUsage(resolveAccount(acc) || {});
    return Math.max(0, DAILY_LIMIT_SEC - (acc.live_seconds_used_today || 0));
  }

  function sessionElapsedSec(acc) {
    if (!acc || !acc.live_active || !acc.live_started_at) return 0;
    var start = Date.parse(acc.live_started_at);
    if (!Number.isFinite(start)) return 0;
    return Math.max(0, Math.floor((Date.now() - start) / 1000));
  }

  function sessionRemainingSec(acc) {
    acc = resolveAccount(acc);
    if (!acc || !acc.live_active) return 0;
    var budget = Math.max(0, parseInt(acc.live_session_budget_sec, 10) || 0);
    if (!budget) budget = remainingDailySec(acc) + sessionElapsedSec(acc);
    return Math.max(0, budget - sessionElapsedSec(acc));
  }

  function isLiveNow(acc) {
    acc = resolveAccount(acc);
    if (!acc || !acc.live_active) return false;
    if (!isDiamondEligible(acc)) return false;
    if (!parseChannelId(acc.youtube_channel_id || acc.youtubeChannelId || '')) return false;
    return sessionRemainingSec(acc) > 0;
  }

  function getStatus(acc) {
    acc = resolveAccount(acc);
    if (!acc) {
      return { ok: false, entitled: false, live: false, remainingDaySec: 0, remainingSessionSec: 0 };
    }
    acc = normalizeDayUsage(acc);
    var entitled = isDiamondEligible(acc);
    var live = isLiveNow(acc);
    return {
      ok: true,
      entitled: entitled,
      live: live,
      channelId: parseChannelId(acc.youtube_channel_id || acc.youtubeChannelId || ''),
      remainingDaySec: remainingDailySec(acc),
      remainingSessionSec: live ? sessionRemainingSec(acc) : 0,
      usedTodaySec: acc.live_seconds_used_today || 0,
      dailyLimitSec: DAILY_LIMIT_SEC
    };
  }

  function formatMmSs(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function saveChannelId(accId, raw) {
    var id = parseChannelId(raw);
    if (!id) {
      return {
        ok: false,
        error: _t(
          'أدخل معرّف قناة يوتيوب الصحيح (يبدأ غالباً بـ UC…)',
          'Entrez un Channel ID YouTube valide (souvent UC…)'
        )
      };
    }
    var hit = findAccount(accId);
    if (!hit) return { ok: false, error: _t('الحساب غير موجود', 'Compte introuvable') };
    if (!isDiamondEligible(hit.acc)) {
      return {
        ok: false,
        error: _t(
          'البث المباشر حصري للباقة الماسية الأساسية أو Pro',
          'Le live est réservé au Diamant Standard ou Pro'
        )
      };
    }
    hit.acc.youtube_channel_id = id;
    hit.acc.youtubeChannelId = id;
    saveAccounts(hit.list);
    return { ok: true, channelId: id, account: hit.acc };
  }

  function stopLive(accId, opts) {
    opts = opts || {};
    var hit = findAccount(accId);
    if (!hit) return { ok: false };
    var acc = normalizeDayUsage(hit.acc);
    if (acc.live_active) {
      var elapsed = sessionElapsedSec(acc);
      acc.live_seconds_used_today = Math.min(DAILY_LIMIT_SEC, (acc.live_seconds_used_today || 0) + elapsed);
    }
    acc.live_active = false;
    acc.live_started_at = '';
    acc.live_session_budget_sec = 0;
    hit.list[hit.idx] = acc;
    saveAccounts(hit.list);
    if (_timers[accId]) {
      clearInterval(_timers[accId]);
      delete _timers[accId];
    }
    if (typeof opts.onStop === 'function') {
      try {
        opts.onStop(acc);
      } catch (e) {}
    }
    try {
      global.dispatchEvent(new CustomEvent('rizq-live-changed', { detail: { accountId: accId, live: false } }));
    } catch (e2) {}
    return { ok: true, account: acc };
  }

  function startLive(accId) {
    var hit = findAccount(accId);
    if (!hit) return { ok: false, error: _t('الحساب غير موجود', 'Compte introuvable') };
    var acc = normalizeDayUsage(hit.acc);
    if (!isDiamondEligible(acc)) {
      return {
        ok: false,
        error: _t(
          'هذه الميزة حصرية لأصحاب الباقة الماسية الأساسية أو Pro',
          'Fonctionnalité réservée au Diamant Standard ou Pro'
        )
      };
    }
    var channelId = parseChannelId(acc.youtube_channel_id || acc.youtubeChannelId || '');
    if (!channelId) {
      return {
        ok: false,
        error: _t('سجّل معرّف قناة يوتيوب أولاً', 'Enregistrez d\'abord le Channel ID YouTube')
      };
    }
    if (acc.live_active && sessionRemainingSec(acc) > 0) {
      return { ok: true, already: true, account: acc, remainingSec: sessionRemainingSec(acc) };
    }
    /* إن كانت جلسة منتهية عالقة */
    if (acc.live_active) stopLive(accId);

    var rem = remainingDailySec(acc);
    if (rem <= 0) {
      return {
        ok: false,
        error: _t(
          'انتهت حصتك اليومية (10 دقائق). حاول غداً.',
          'Quota journalier atteint (10 min). Réessayez demain.'
        )
      };
    }

    acc.live_active = true;
    acc.live_started_at = new Date().toISOString();
    acc.live_session_budget_sec = rem;
    acc.youtube_channel_id = channelId;
    hit.list[hit.idx] = acc;
    saveAccounts(hit.list);

    try {
      global.dispatchEvent(new CustomEvent('rizq-live-changed', { detail: { accountId: accId, live: true } }));
    } catch (e) {}

    return { ok: true, account: acc, remainingSec: rem, embed: embedUrl(channelId) };
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var css = [
      '.rzq-live-badge{position:absolute;z-index:6;top:6px;left:6px;right:6px;display:flex;align-items:center;justify-content:space-between;gap:6px;pointer-events:none}',
      '.rzq-live-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:rgba(185,28,28,.92);color:#fff;font-size:10px;font-weight:800;letter-spacing:.2px;box-shadow:0 2px 8px rgba(0,0,0,.35)}',
      '.rzq-live-dot{width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 0 0 rgba(255,255,255,.7);animation:rzqLivePulse 1.2s ease-out infinite}',
      '@keyframes rzqLivePulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.55)}70%{box-shadow:0 0 0 8px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}',
      '.rzq-live-timer{padding:3px 7px;border-radius:8px;background:rgba(6,17,28,.78);color:#F5DFA0;font-size:10px;font-weight:800;font-variant-numeric:tabular-nums}',
      '.rzq-live-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}',
      '.hero-video-card.is-live-now{border-color:rgba(239,68,68,.75)!important;box-shadow:0 10px 28px rgba(185,28,28,.28),0 0 0 1px rgba(239,68,68,.25)}',
      '.hero-video-card.is-live-now .hero-video-mount{position:relative;aspect-ratio:16/9;min-height:0;background:#000}',
      '.rzq-live-dash{border:1px solid rgba(201,168,76,.35);border-radius:14px;padding:14px;background:linear-gradient(165deg,rgba(201,168,76,.08),rgba(27,58,107,.04));margin-top:14px}',
      '.rzq-live-dash h4{margin:0 0 8px;font-size:14px;color:#1B3A6B;font-weight:800}',
      '.rzq-live-dash .rzq-live-note{font-size:11.5px;color:#64748b;line-height:1.55;margin:0 0 10px}',
      '.rzq-live-dash .rzq-live-lock{padding:12px;border-radius:12px;background:rgba(15,35,71,.06);border:1px dashed rgba(27,58,107,.25);text-align:center}',
      '.rzq-live-dash .rzq-live-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
      '.rzq-live-dash .btn-live-go{background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border:none;border-radius:10px;padding:10px 14px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit}',
      '.rzq-live-dash .btn-live-stop{background:#0f2347;color:#F5DFA0;border:1px solid rgba(201,168,76,.45);border-radius:10px;padding:10px 14px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit}',
      '.rzq-live-dash .rzq-live-quota{font-size:12px;font-weight:700;color:#1B3A6B;margin-top:8px}'
    ].join('');
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = css;
    document.head.appendChild(el);
  }

  function renderLiveMount(mountEl, channelId, remainingSec) {
    if (!mountEl) return false;
    injectCss();
    var url = embedUrl(channelId);
    if (!url) return false;
    mountEl.innerHTML =
      '<div class="rzq-live-badge">' +
      '<span class="rzq-live-pill"><span class="rzq-live-dot"></span>' +
      _t('مباشر | ترويج بضاعة', 'Live | Nouveautés') +
      '</span>' +
      '<span class="rzq-live-timer" data-rzq-live-timer="1">' +
      formatMmSs(remainingSec) +
      ' ' +
      _t('متبقية', 'restantes') +
      '</span></div>' +
      '<iframe class="rzq-live-frame" src="' +
      url +
      '" title="YouTube Live" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
    return true;
  }

  function applyLiveToExtraCard(acc, selectors) {
    selectors = selectors || {};
    acc = resolveAccount(acc);
    if (!acc) return false;
    injectCss();
    var extraCard = document.querySelector(selectors.extraCard || '#hero-extra-card, #office-hero-extra-card, #sr-hero-extra-card, #corp-hero-extra-card');
    var extraMount = document.querySelector(selectors.extraMount || '#hero-extra-video-mount, #office-hero-extra-video-mount, #sr-hero-extra-video-mount, #corp-hero-extra-video-mount');
    var hero = document.querySelector(selectors.hero || '.store-hero, .office-hero, .showroom-hero, .corp-hero');
    if (!extraCard || !extraMount) return false;

    if (!isLiveNow(acc)) {
      extraCard.classList.remove('is-live-now');
      return false;
    }

    var rem = sessionRemainingSec(acc);
    var channelId = parseChannelId(acc.youtube_channel_id || acc.youtubeChannelId || '');
    var ok = renderLiveMount(extraMount, channelId, rem);
    if (ok) {
      extraCard.style.display = '';
      extraCard.classList.add('is-live-now');
      if (hero) hero.classList.add('has-hero-videos');
      _watchSession(acc.id, function () {
        /* عند الانتهاء: أزل علامة البث وأبطل كاش الهيرو ثم أعد الفيديو الإضافي */
        try {
          extraCard.classList.remove('is-live-now');
          if (hero) hero.removeAttribute('data-rzq-promo-sig');
          try { global.__rzqOfficeIntroSig = ''; } catch (e1) {}
          try { global.__rzqCorpIntroSig = ''; } catch (e2) {}
          try { global.__rzqShowroomIntroSig = ''; } catch (e3) {}
          if (typeof global.mountStorePromoVideo === 'function' && global._rizqStoreProfile) {
            global.mountStorePromoVideo(global._rizqStoreProfile);
          } else if (typeof global.mountOfficeIntroVideo === 'function') {
            global.mountOfficeIntroVideo();
          } else if (typeof global.mountShowroomIntroVideo === 'function') {
            global.mountShowroomIntroVideo();
          } else if (typeof global.mountCorpIntroVideo === 'function') {
            global.mountCorpIntroVideo();
          } else {
            location.reload();
          }
        } catch (e) {
          location.reload();
        }
      });
    }
    return ok;
  }

  function _watchSession(accId, onEnd) {
    if (_timers[accId]) clearInterval(_timers[accId]);
    _timers[accId] = setInterval(function () {
      var acc = resolveAccount(accId);
      if (!acc) return;
      if (!isLiveNow(acc)) {
        stopLive(accId);
        var nodes = document.querySelectorAll('[data-rzq-live-timer]');
        Array.prototype.forEach.call(nodes, function (n) {
          n.textContent = '00:00 ' + _t('متبقية', 'restantes');
        });
        if (typeof onEnd === 'function') onEnd();
        return;
      }
      var rem = sessionRemainingSec(acc);
      var nodes2 = document.querySelectorAll('[data-rzq-live-timer]');
      Array.prototype.forEach.call(nodes2, function (n) {
        n.textContent = formatMmSs(rem) + ' ' + _t('متبقية', 'restantes');
      });
      var dash = document.querySelector('[data-rzq-live-quota]');
      if (dash) {
        var st = getStatus(acc);
        dash.textContent = _t(
          'المتبقي اليوم: ' + formatMmSs(st.remainingDaySec - (st.live ? st.remainingSessionSec > 0 ? 0 : 0 : 0)),
          'Reste aujourd\'hui : ' + formatMmSs(Math.max(0, st.remainingDaySec))
        );
        /* أدق: المتبقي اليوم = الميزانية اليومية ناقص المستخدم ناقص الجاري */
        var usedIncl = (acc.live_seconds_used_today || 0) + sessionElapsedSec(acc);
        dash.textContent = _t(
          'حصة اليوم: ' + formatMmSs(Math.max(0, DAILY_LIMIT_SEC - usedIncl)) + ' متبقية من 10:00',
          'Quota du jour : ' + formatMmSs(Math.max(0, DAILY_LIMIT_SEC - usedIncl)) + ' / 10:00'
        );
      }
    }, 1000);
  }

  function bindDashboard(container, acc) {
    if (!container || !acc || !acc.id) return;
    injectCss();
    var root = typeof container === 'string' ? document.querySelector(container) : container;
    if (!root) return;

    var entitled = isDiamondEligible(acc);
    var channel = parseChannelId(acc.youtube_channel_id || acc.youtubeChannelId || '');
    var st = getStatus(acc);

    root.innerHTML =
      '<div class="rzq-live-dash" id="rzq-live-dash">' +
      '<h4>🔴 ' +
      _t('بث مباشر لترويج بضاعة جديدة', 'Live — promotion de nouveautés') +
      '</h4>' +
      '<p class="rzq-live-note">' +
      _t(
        'يوتيوب فقط · حد 10 دقائق يومياً · يظهر مكان الفيديو الإضافي في صفحة واجهتك. سجّل معرّف القناة مرة واحدة، ابدأ البث على يوتيوب، ثم اضغط الزر.',
        'YouTube uniquement · 10 min/jour · remplace la vidéo supplémentaire. Enregistrez le Channel ID une fois, lancez le live YouTube, puis appuyez sur le bouton.'
      ) +
      '</p>' +
      (entitled
        ? '<label class="form-label" style="font-weight:700;font-size:12.5px;color:#1B3A6B">' +
          _t('معرّف قناة يوتيوب (Channel ID)', 'YouTube Channel ID') +
          '</label>' +
          '<input class="form-input" id="rzq-live-channel" dir="ltr" placeholder="UCxxxxxxxxxxxxxxxxxxxxxx" value="' +
          String(channel).replace(/"/g, '&quot;') +
          '" style="font-family:monospace;font-size:12px"/>' +
          '<div class="rzq-live-actions">' +
          '<button type="button" class="btn-live-go" id="rzq-live-start">🔴 ' +
          _t('أنا على الهواء الآن', 'Je suis en direct') +
          '</button>' +
          '<button type="button" class="btn-live-stop" id="rzq-live-stop" style="display:' +
          (st.live ? 'inline-flex' : 'none') +
          '">' +
          _t('إيقاف العرض على رزق', 'Arrêter sur Rizq') +
          '</button>' +
          '<button type="button" class="btn btn-outline btn-sm" id="rzq-live-save" style="border-radius:10px;padding:10px 12px;font-weight:700">' +
          _t('حفظ المعرّف', 'Enregistrer l\'ID') +
          '</button>' +
          '</div>' +
          '<div class="rzq-live-quota" data-rzq-live-quota="1"></div>'
        : '<div class="rzq-live-lock"><div style="font-size:22px;margin-bottom:6px">💎</div><div style="font-size:13px;font-weight:800;color:#1B3A6B;margin-bottom:6px">' +
          _t(
            'هذه الميزة حصرية لأصحاب الباقة الماسية الأساسية أو Pro',
            'Réservé au Diamant Standard ou Pro'
          ) +
          '</div><div style="font-size:12px;color:#64748b">' +
          _t('رقِّ باقتك لتفعيل البث الموقّت لترويج البضاعة الجديدة.', 'Passez au Diamant pour activer le live minuté.') +
          '</div></div>') +
      '</div>';

    function refreshQuota() {
      var a = resolveAccount(acc.id) || acc;
      var usedIncl = (normalizeDayUsage(a).live_seconds_used_today || 0) + (isLiveNow(a) ? sessionElapsedSec(a) : 0);
      var q = root.querySelector('[data-rzq-live-quota]');
      if (q) {
        q.textContent = _t(
          'حصة اليوم: ' + formatMmSs(Math.max(0, DAILY_LIMIT_SEC - usedIncl)) + ' متبقية من 10:00',
          'Quota du jour : ' + formatMmSs(Math.max(0, DAILY_LIMIT_SEC - usedIncl)) + ' / 10:00'
        );
      }
      var stopBtn = root.querySelector('#rzq-live-stop');
      if (stopBtn) stopBtn.style.display = isLiveNow(a) ? 'inline-flex' : 'none';
    }
    refreshQuota();

    var saveBtn = root.querySelector('#rzq-live-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var input = root.querySelector('#rzq-live-channel');
        var res = saveChannelId(acc.id, input && input.value);
        if (!res.ok) {
          if (global.showToast) showToast('⚠️ ' + res.error);
          else alert(res.error);
          return;
        }
        if (global.showToast) showToast(_t('✅ تم حفظ معرّف القناة', '✅ Channel ID enregistré'));
        refreshQuota();
      });
    }

    var startBtn = root.querySelector('#rzq-live-start');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        var input = root.querySelector('#rzq-live-channel');
        if (input && input.value) saveChannelId(acc.id, input.value);
        var res = startLive(acc.id);
        if (!res.ok) {
          if (global.showToast) showToast('⚠️ ' + res.error);
          else alert(res.error);
          return;
        }
        if (global.showToast) {
          showToast(
            _t(
              '🔴 البث ظاهر على واجهتك مكان الفيديو الإضافي',
              '🔴 Live affiché à la place de la vidéo supplémentaire'
            )
          );
        }
        refreshQuota();
        _watchSession(acc.id, refreshQuota);
      });
    }

    var stopBtn2 = root.querySelector('#rzq-live-stop');
    if (stopBtn2) {
      stopBtn2.addEventListener('click', function () {
        stopLive(acc.id);
        if (global.showToast) showToast(_t('تم إيقاف العرض المباشر', 'Live arrêté'));
        refreshQuota();
      });
    }

    if (st.live) _watchSession(acc.id, refreshQuota);
  }

  function maybeApplyPublic(acc, selectors) {
    acc = resolveAccount(acc);
    if (!acc) return false;
    /* صفّر الجلسات المنتهية */
    if (acc.live_active && sessionRemainingSec(acc) <= 0) {
      stopLive(acc.id);
      return false;
    }
    return applyLiveToExtraCard(acc, selectors);
  }

  global.RizqLiveShowcase = {
    DAILY_LIMIT_SEC: DAILY_LIMIT_SEC,
    isDiamondEligible: isDiamondEligible,
    parseChannelId: parseChannelId,
    embedUrl: embedUrl,
    getStatus: getStatus,
    isLiveNow: isLiveNow,
    saveChannelId: saveChannelId,
    startLive: startLive,
    stopLive: stopLive,
    formatMmSs: formatMmSs,
    bindDashboard: bindDashboard,
    applyLiveToExtraCard: applyLiveToExtraCard,
    maybeApplyPublic: maybeApplyPublic,
    dayKeyNouakchott: dayKeyNouakchott
  };
})(typeof window !== 'undefined' ? window : this);
