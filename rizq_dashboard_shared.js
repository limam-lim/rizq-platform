/**
 * rizq_dashboard_shared.js — نواة مشتركة للوحات المشتركين
 * Auth bootstrap · توكن مزدوج · مصطلحات الوارد · أقفال الاشتراك · helpers
 */
(function (global) {
  'use strict';

  /* ── XSS / UI helpers ─────────────────────────────────────── */
  function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, '&#96;');
  }
  function showToast(msg, type) {
    var el = document.getElementById('toast') || document.getElementById('rizq-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'rizq-toast';
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;padding:12px 18px;border-radius:10px;background:#0f172a;color:#fff;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:90vw;text-align:center';
      document.body.appendChild(el);
    }
    el.textContent = String(msg || '');
    el.style.background = type === 'bad' || type === 'error' ? '#991b1b' : (type === 'ok' || type === 'success' ? '#166534' : '#0f172a');
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.display = 'none'; }, 3200);
  }
  function closePayModal() {
    var m = document.getElementById('pay-modal');
    if (m) m.style.display = 'none';
    document.body.style.overflow = '';
  }
  function copyReferralLink() {
    var input = document.getElementById('referral-link-input');
    if (!input || !input.value) return;
    var msg = (typeof _t2 === 'function')
      ? _t2('✅ تم نسخ الرابط', '✅ Lien copié')
      : '✅ تم نسخ الرابط';
    navigator.clipboard.writeText(input.value).then(function () {
      showToast(msg, 'success');
    }).catch(function () {});
  }
  function _tenderPkgList() {
    try {
      var list = JSON.parse(localStorage.getItem('rizq_tender_packages') || 'null');
      if (Array.isArray(list) && list.length) return list;
    } catch (e) {}
    return [
      { name: 'تجريبية', price: 0, duration: '10 أيام' },
      { name: 'شهرية', price: 5000, duration: 'شهر' },
      { name: 'ربعية', price: 13500, duration: '3 أشهر' },
      { name: 'سنوية', price: 45000, duration: '12 شهر' }
    ];
  }
  function _tenderStatusBadgeOwner(t, fr) {
    var s = (t && t.status) || 'open';
    if (s === 'pending_review') return '<span style="font-size:11px;font-weight:700;color:#92400e;background:#fffbeb;padding:2px 8px;border-radius:6px;margin-left:6px">⏳ ' + (fr ? 'En révision' : 'قيد المراجعة') + '</span>';
    if (s === 'rejected') return '<span style="font-size:11px;font-weight:700;color:#b91c1c;background:#fef2f2;padding:2px 8px;border-radius:6px;margin-left:6px">❌ ' + (fr ? 'Refusée' : 'مرفوضة') + '</span>';
    if (s === 'open') return '<span style="font-size:11px;font-weight:700;color:#065f46;background:#ecfdf5;padding:2px 8px;border-radius:6px;margin-left:6px">✅ ' + (fr ? 'Publiée' : 'منشورة') + '</span>';
    return '';
  }
  function _verifiedPlusPkgList() {
    try {
      var list = JSON.parse(localStorage.getItem('rizq_verified_plus_packages') || 'null');
      if (Array.isArray(list) && list.length) return list;
    } catch (e) {}
    return [{ name: 'سنوية', price: 5000, duration: 'سنة' }];
  }

  /* ── Inbox terminology (موحّد عبر الأنواع) ───────────────── */
  var INBOX = {
    messages: { id: 'messages', ar: 'الرسائل', fr: 'Messages', panel: 'messages' },
    inquiries: { id: 'inquiries', ar: 'الاستفسارات', fr: 'Demandes', panel: 'inquiries' },
    appointments: { id: 'appointments', ar: 'طلبات المعاينة', fr: 'Visites', panel: 'appointments' }
  };
  function inboxLabel(key, lang) {
    var row = INBOX[key] || INBOX.messages;
    return (lang === 'fr') ? row.fr : row.ar;
  }

  /* ── Backend base ─────────────────────────────────────────── */
  function backendBase() {
    try {
      if (typeof global.RIZQ_BACKEND_BASE === 'string' && global.RIZQ_BACKEND_BASE) {
        return global.RIZQ_BACKEND_BASE.replace(/\/$/, '');
      }
    } catch (e) {}
    if (global.RizqAccount && typeof global.RizqAccount.backendBase === 'function') {
      try { return String(global.RizqAccount.backendBase() || '').replace(/\/$/, ''); } catch (e2) {}
    }
    return '';
  }

  function authHeaders(accessOrDash) {
    var t = accessOrDash || global.REAL_ACCESS_TOKEN || '';
    return t ? { 'x-account-token': t } : {};
  }

  /* ── Session / dual-token ─────────────────────────────────── */
  function stripUrlToken() {
    if (global.RizqAccount && typeof global.RizqAccount.stripTokenFromUrl === 'function') {
      try { global.RizqAccount.stripTokenFromUrl(); } catch (e) {}
      return;
    }
    try {
      var p = new URLSearchParams(location.search);
      if (!p.has('token')) return;
      var id = p.get('id');
      var tok = p.get('token');
      if (id && tok && global.RizqAccount && global.RizqAccount.storeDashToken) {
        global.RizqAccount.storeDashToken(id, tok);
      } else if (id && tok) {
        try { sessionStorage.setItem('rizq_dash_token_' + id, tok); } catch (e2) {}
      }
      p.delete('token');
      var qs = p.toString();
      history.replaceState(null, '', (location.pathname || '') + (qs ? '?' + qs : '') + (location.hash || ''));
    } catch (e3) {}
  }

  function resolveSession(expectedType) {
    stripUrlToken();
    if (global.RizqAccount && typeof global.RizqAccount.recoverSessionParams === 'function') {
      var rec = global.RizqAccount.recoverSessionParams(expectedType);
      if (rec && rec.id) return { id: rec.id, token: rec.token || '', isDemo: !!rec.isDemo };
    }
    try {
      var p = new URLSearchParams(location.search);
      var id = p.get('id') || '';
      var token = '';
      try { token = sessionStorage.getItem('rizq_dash_token_' + id) || ''; } catch (e) {}
      if (!token) token = p.get('token') || '';
      var demo = p.get('demo') === '1' || /^demo/i.test(id);
      return { id: id, token: token, isDemo: demo };
    } catch (e4) {
      return { id: '', token: '', isDemo: false };
    }
  }

  function verifyAccessLocal(sessionId, sessionToken, expectedType) {
    if (!sessionId || !sessionToken) return null;
    try {
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      return accs.find(function (a) {
        return a && a.id === sessionId && a.token === sessionToken
          && a.status === 'approved' && a.type === expectedType;
      }) || null;
    } catch (e) {
      return null;
    }
  }

  function mergeAccountIntoLocalStorage(acc) {
    if (!acc || !acc.id) return;
    try {
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      var idx = accs.findIndex(function (a) { return a && a.id === acc.id; });
      if (idx === -1) accs.push(acc);
      else accs[idx] = Object.assign({}, accs[idx], acc);
      localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs));
    } catch (e) {}
  }

  /** يعيد كتابة نص #access-denied الموجود إلى حالة «قيد المراجعة» بلا تصميم جديد. */
  function applyPendingDeniedMessage(opts) {
    opts = opts || {};
    var el = document.getElementById(opts.deniedId || 'access-denied');
    if (!el) return;
    var lang = 'ar';
    try {
      lang = (localStorage.getItem('rizq_lang') || document.documentElement.lang || 'ar').toLowerCase();
      if (lang.indexOf('fr') === 0) lang = 'fr';
      else lang = 'ar';
    } catch (eL) { lang = 'ar'; }
    var h2 = el.querySelector('h2');
    var pre = el.querySelector('[data-t="denied-msg-pre"]');
    var post = el.querySelector('[data-t="denied-msg-post"]');
    var p = el.querySelector('p');
    if (h2) {
      h2.textContent = lang === 'fr' ? 'Compte en cours de vérification' : 'حسابك قيد المراجعة';
      // امنع applyStaticDom من إعادة كتابة data-t="denied-title" فوق رسالة المراجعة
      try { h2.removeAttribute('data-t'); } catch (e1) {}
    }
    if (pre && post) {
      pre.textContent = lang === 'fr' ? 'Votre demande est examinée par' : 'طلبك قيد المراجعة لدى';
      post.textContent = lang === 'fr' ? '. Vous serez notifié à l\'activation.' : '. سيتم إشعارك عند التفعيل.';
      try { pre.removeAttribute('data-t'); post.removeAttribute('data-t'); } catch (e2) {}
    } else if (p) {
      p.textContent = lang === 'fr'
        ? 'Votre compte est en cours de vérification. Vous serez notifié à l\'activation.'
        : 'حسابك قيد المراجعة. سيتم إشعارك عند التفعيل.';
    }
  }

  function localPendingHint(sessionId) {
    if (!sessionId) return false;
    try {
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      var hit = accs.find(function (a) { return a && a.id === sessionId; });
      if (hit && hit.status && hit.status !== 'approved') return true;
    } catch (e) {}
    return false;
  }

  function verifyAccessRemote(sessionId, sessionToken, expectedType) {
    return new Promise(function (resolve) {
      var base = backendBase();
      if (!base || !sessionId) {
        if (localPendingHint(sessionId)) resolve({ __pending: true, status: 'pending' });
        else resolve(null);
        return;
      }
      // جرّب dashToken ثم accessToken المؤقت — الخادم لا يكشف not_approved بلا رمز مطابق
      var dash = sessionToken || '';
      var access = '';
      try { access = readEphemeralAccessToken(sessionId) || ''; } catch (eAcc) { access = ''; }
      function probe(tok) {
        var t = String(tok || '');
        return fetch(base + '/api/accounts/verify-dash/' + encodeURIComponent(sessionId), {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, t ? { 'x-dash-token': t } : {}),
          body: JSON.stringify({ dashToken: t })
        }).then(function (res) {
          return res.json().then(function (data) { return { res: res, data: data }; })
            .catch(function () { return { res: res, data: null }; });
        });
      }
      function interpret(out) {
        var data = out && out.data;
        if (out && out.res && out.res.ok && data && data.ok && data.account && data.account.type === expectedType) {
          var acc = Object.assign({ token: sessionToken || dash, status: 'approved' }, data.account);
          mergeAccountIntoLocalStorage(acc);
          return { kind: 'ok', acc: acc };
        }
        if (data && data.code === 'not_approved') {
          return { kind: 'pending', status: data.status || 'pending' };
        }
        return { kind: 'deny' };
      }
      var firstTok = dash || access;
      var chain = firstTok ? probe(firstTok) : Promise.resolve({ res: { ok: false, status: 401 }, data: null });
      chain.then(function (out) {
        var r = interpret(out);
        if (r.kind === 'ok') { resolve(r.acc); return null; }
        if (r.kind === 'pending') { resolve({ __pending: true, status: r.status }); return null; }
        // إن فشل dash جرّب accessToken (حساب معلّق يملك access بلا dash)
        if (access && access !== firstTok) return probe(access);
        return null;
      }).then(function (out2) {
        if (out2 == null) return;
        var r2 = interpret(out2);
        if (r2.kind === 'ok') { resolve(r2.acc); return; }
        if (r2.kind === 'pending') { resolve({ __pending: true, status: r2.status }); return; }
        if (localPendingHint(sessionId)) resolve({ __pending: true, status: 'pending' });
        else resolve(null);
      }).catch(function () {
        if (localPendingHint(sessionId)) resolve({ __pending: true, status: 'pending' });
        else resolve(null);
      });
    });
  }

  function accessMemKey(accountId) {
    return 'rizq_access_mem_' + String(accountId || '');
  }

  /** يزيل accessToken / backendAccessToken من localStorage (W4). */
  function purgeSensitiveTokensFromStorage() {
    var changed = false;
    try {
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      if (Array.isArray(accs)) {
        accs.forEach(function (a) {
          if (!a || typeof a !== 'object') return;
          if (Object.prototype.hasOwnProperty.call(a, 'accessToken')) {
            delete a.accessToken;
            changed = true;
          }
          if (Object.prototype.hasOwnProperty.call(a, 'backendAccessToken')) {
            delete a.backendAccessToken;
            changed = true;
          }
          if (Object.prototype.hasOwnProperty.call(a, 'password')) {
            delete a.password;
            changed = true;
          }
        });
        if (changed) localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs));
      }
    } catch (e) {}
    try {
      ['rizq_active_session', 'rizq_individual_session', 'rizq_corp_session', 'rizq_dashboard_session', 'rizq_session'].forEach(function (k) {
        var raw = localStorage.getItem(k);
        if (!raw) return;
        try {
          var o = JSON.parse(raw);
          if (o && typeof o === 'object') {
            var dirty = false;
            if (o.accessToken) { delete o.accessToken; dirty = true; }
            if (o.backendAccessToken) { delete o.backendAccessToken; dirty = true; }
            if (dirty) localStorage.setItem(k, JSON.stringify(o));
          }
        } catch (e2) {}
      });
    } catch (e3) {}
    return changed;
  }

  function rememberAccessToken(accountId, token) {
    global.REAL_ACCESS_TOKEN = token || null;
    if (!accountId || !token) return;
    try { sessionStorage.setItem(accessMemKey(accountId), token); } catch (e) {}
  }

  function readEphemeralAccessToken(accountId) {
    if (global.REAL_ACCESS_TOKEN) return global.REAL_ACCESS_TOKEN;
    if (!accountId) return '';
    try { return sessionStorage.getItem(accessMemKey(accountId)) || ''; } catch (e) { return ''; }
  }

  /**
   * يحل accessToken للكتابة عبر exchange-dash-token.
   * التخزين: ذاكرة الصفحة + sessionStorage فقط — ممنوع localStorage.
   */
  function resolveAccessToken(acc, sessionToken) {
    purgeSensitiveTokensFromStorage();
    stripUrlToken();
    global.REAL_ACCESS_TOKEN = null;
    if (!acc || !acc.id) return Promise.resolve(null);

    var cached = readEphemeralAccessToken(acc.id);
    if (cached) {
      global.REAL_ACCESS_TOKEN = cached;
      return Promise.resolve(cached);
    }

    var base = backendBase();
    var dash = sessionToken || (acc && acc.token) || '';
    try {
      if (!dash) dash = sessionStorage.getItem('rizq_dash_token_' + acc.id) || '';
    } catch (eD) {}
    if (!base || !dash) return Promise.resolve(null);

    return fetch(base + '/api/accounts/exchange-dash-token/' + encodeURIComponent(acc.id), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-dash-token': dash },
      body: JSON.stringify({ dashToken: dash })
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !data.accessToken) return null;
        rememberAccessToken(acc.id, data.accessToken);
        if (data.dashToken) {
          try { sessionStorage.setItem('rizq_dash_token_' + acc.id, data.dashToken); } catch (eS) {}
          if (global.RizqAccount && global.RizqAccount.storeDashToken) {
            try { global.RizqAccount.storeDashToken(acc.id, data.dashToken); } catch (eT) {}
          }
          try {
            var accs2 = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
            var rec2 = accs2.find(function (a) { return a && a.id === acc.id; });
            if (rec2) {
              delete rec2.backendAccessToken;
              delete rec2.accessToken;
              rec2.token = data.dashToken;
              rec2.dashToken = data.dashToken;
              localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs2));
            }
            var act = JSON.parse(localStorage.getItem('rizq_active_session') || 'null');
            if (act && act.id === acc.id) {
              act.token = data.dashToken;
              delete act.accessToken;
              delete act.backendAccessToken;
              localStorage.setItem('rizq_active_session', JSON.stringify(act));
            }
          } catch (eU) {}
        }
        return global.REAL_ACCESS_TOKEN;
      })
      .catch(function () { return null; });
  }

  /** نقطة دخول موحّدة للوحات — تطهير توكنات + خطافات اختيارية */
  function init(opts) {
    opts = opts || {};
    purgeSensitiveTokensFromStorage();
    stripUrlToken();
    if (opts.expectedType) return bootstrapDashboard(opts);
    return null;
  }

  function showAccessDenied(opts) {
    opts = opts || {};
    if (opts.pending || (opts.ctx && opts.ctx.pendingReview) || localPendingHint(opts.sessionId)) {
      applyPendingDeniedMessage(opts);
    }
    var el = document.getElementById(opts.deniedId || 'access-denied');
    var sidebar = document.getElementById(opts.sidebarId || 'sidebar');
    var main = document.querySelector(opts.mainSelector || '.main-content')
      || document.querySelector('.main');
    if (el) el.style.display = 'flex';
    if (sidebar) sidebar.style.display = 'none';
    if (main) main.style.display = 'none';
  }

  /**
   * تمهيد موحّد لأي لوحة: جلسة → تحقق محلي/بعيد → accessToken → قفل اشتراك
   * opts: { expectedType, isDemo, onReady(acc, ctx), onDenied(), writeRoot }
   */
  function bootstrapDashboard(opts) {
    opts = opts || {};
    purgeSensitiveTokensFromStorage();
    var expectedType = opts.expectedType || 'individual';
    var sess = resolveSession(expectedType);
    var ctx = {
      expectedType: expectedType,
      sessionId: sess.id,
      sessionToken: sess.token,
      isDemo: !!(opts.isDemo || sess.isDemo),
      accessToken: null,
      perms: null
    };

    function finishDenied() {
      if (typeof opts.onDenied === 'function') opts.onDenied(ctx);
      else showAccessDenied(Object.assign({}, opts, { pending: !!ctx.pendingReview, sessionId: ctx.sessionId, ctx: ctx }));
    }

    function afterAccount(acc) {
      if (!acc && !ctx.isDemo) {
        finishDenied();
        return;
      }
      if (acc && acc.__pending) {
        ctx.pendingReview = true;
        finishDenied();
        return;
      }
      var account = acc || { id: sess.id || 'demo', type: expectedType, status: 'approved', name: 'Demo' };
      return resolveAccessToken(account, ctx.sessionToken).then(function (tok) {
        ctx.accessToken = tok || null;
        ctx.sessionToken = (function () {
          try { return sessionStorage.getItem('rizq_dash_token_' + account.id) || ctx.sessionToken; } catch (e) { return ctx.sessionToken; }
        })();
        applySubscriptionLock(account.id, opts.writeRoot || document.body, opts);
        if (typeof opts.onReady === 'function') opts.onReady(account, ctx);
      });
    }

    if (ctx.isDemo) {
      return Promise.resolve().then(function () { return afterAccount(null); });
    }

    /* دائماً تحقق من الخادم — لا تثق بـ localStorage وحده (يمنع تزوير جلسة عقار/لوحة) */
    return verifyAccessRemote(ctx.sessionId, ctx.sessionToken, expectedType).then(function (remote) {
      if (remote && remote.__pending) {
        ctx.pendingReview = true;
        finishDenied();
        return;
      }
      if (remote) return afterAccount(remote);
      finishDenied();
    });
  }

  /* ── Subscription write lock (كل الأنواع) ─────────────────── */
  function applySubscriptionLock(accountId, root, opts) {
    opts = opts || {};
    var usePerms = global.useSubscriptionPermissions || (global.RizqSubscriptionPermissions && global.RizqSubscriptionPermissions.useSubscriptionPermissions);
    var disable = global.RizqSubscriptionPermissions && global.RizqSubscriptionPermissions.disableFormsAndShowUpgradeBanner;
    if (typeof usePerms !== 'function') return null;
    var perms = usePerms(accountId, { isDemo: !!(opts.isDemo) });
    if (root && typeof disable === 'function') disable(root, perms);
    return perms;
  }

  /* ── Public API ───────────────────────────────────────────── */
  var api = {
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    showToast: showToast,
    closePayModal: closePayModal,
    copyReferralLink: copyReferralLink,
    _tenderPkgList: _tenderPkgList,
    _tenderStatusBadgeOwner: _tenderStatusBadgeOwner,
    _verifiedPlusPkgList: _verifiedPlusPkgList,
    INBOX: INBOX,
    inboxLabel: inboxLabel,
    backendBase: backendBase,
    authHeaders: authHeaders,
    stripUrlToken: stripUrlToken,
    resolveSession: resolveSession,
    verifyAccessLocal: verifyAccessLocal,
    verifyAccessRemote: verifyAccessRemote,
    resolveAccessToken: resolveAccessToken,
    purgeSensitiveTokensFromStorage: purgeSensitiveTokensFromStorage,
    rememberAccessToken: rememberAccessToken,
    readEphemeralAccessToken: readEphemeralAccessToken,
    showAccessDenied: showAccessDenied,
    applyPendingDeniedMessage: applyPendingDeniedMessage,
    mergeAccountIntoLocalStorage: mergeAccountIntoLocalStorage,
    bootstrapDashboard: bootstrapDashboard,
    applySubscriptionLock: applySubscriptionLock,
    init: init
  };

  global.RizqDash = api;
  global.escapeHtml = escapeHtml;
  global.escapeAttr = escapeAttr;
  global.showToast = showToast;
  global.closePayModal = closePayModal;
  global.copyReferralLink = copyReferralLink;
  global._tenderPkgList = _tenderPkgList;
  global._tenderStatusBadgeOwner = _tenderStatusBadgeOwner;
  global._verifiedPlusPkgList = _verifiedPlusPkgList;
})(typeof window !== 'undefined' ? window : this);
