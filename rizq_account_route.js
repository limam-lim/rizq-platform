/**
 * rizq_account_route.js — توجيه زر «حسابي» ولوحات التحكم حسب الجلسة المحلية.
 */
(function () {
  'use strict';
  if (window.RizqAccount) return;

  var DASHBOARD_FILES = {
    individual: 'rizq_dashboard.html',
    store: 'rizq_dashboard_store.html',
    office: 'rizq_dashboard_office.html',
    corp: 'rizq_dashboard_corp.html'
  };

  var SESSION_KEYS = [
    'rizq_active_session',
    'rizq_individual_session',
    'rizq_corp_session',
    'rizq_session',
    'rizq_session_id'
  ];

  var AFTER_AUTH_HREF_KEY = 'rizq_after_auth_href';

  function dashTokenStorageKey(accountId) {
    return 'rizq_dash_token_' + String(accountId || '');
  }

  function storeDashToken(accountId, token) {
    if (!accountId || !token) return;
    try {
      sessionStorage.setItem(dashTokenStorageKey(accountId), String(token));
    } catch (e) {}
  }

  function readDashToken(accountId) {
    if (!accountId) return '';
    try {
      var stored = sessionStorage.getItem(dashTokenStorageKey(accountId));
      if (stored) return stored;
    } catch (e) {}
    var sess = readStoredSession();
    if (sess && sess.id === accountId && sess.token) return sess.token;
    var acc = readPendingAccounts().find(function (a) {
      return a && a.id === accountId && a.token;
    });
    return (acc && acc.token) || '';
  }

  function stripTokenFromUrl() {
    try {
      var p = new URLSearchParams(location.search);
      if (!p.has('token')) return false;
      var id = p.get('id');
      var tok = p.get('token');
      if (id && tok) storeDashToken(id, tok);
      p.delete('token');
      var qs = p.toString();
      var path = location.pathname || '';
      history.replaceState(null, '', path + (qs ? '?' + qs : '') + (location.hash || ''));
      return true;
    } catch (e) {
      return false;
    }
  }

  function readPendingAccounts() {
    try {
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      return Array.isArray(accs) ? accs : [];
    } catch (e) {
      return [];
    }
  }

  /** تنظيف أمني: إزالة أي password نصي قديم دون المساس بالجلسات/التوكنات */
  function purgeLegacyPlaintextPasswords() {
    try {
      var accs = readPendingAccounts();
      var changed = false;
      for (var i = 0; i < accs.length; i++) {
        if (accs[i] && Object.prototype.hasOwnProperty.call(accs[i], 'password')) {
          delete accs[i].password;
          changed = true;
        }
      }
      if (changed) localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs));
    } catch (e) {}
  }

  function readStoredSession() {
    var sess = null;
    try { sess = JSON.parse(localStorage.getItem('rizq_active_session') || 'null'); } catch (e) {}
    if (sess && sess.id && sess.token) return sess;
    try { sess = JSON.parse(localStorage.getItem('rizq_individual_session') || 'null'); } catch (e2) {}
    if (sess && sess.id && sess.token) return Object.assign({ type: 'individual' }, sess);
    return null;
  }

  function findApprovedAccount(sess) {
    if (!sess || !sess.id || !sess.token) return null;
    return readPendingAccounts().find(function (a) {
      return a && a.id === sess.id && a.token === sess.token && a.status === 'approved';
    }) || null;
  }

  function dashFileName(type) {
    return DASHBOARD_FILES[type] || DASHBOARD_FILES.individual;
  }

  function htmlDashPath(file) {
    var name = String(file || '').split('?')[0].replace(/^\//, '');
    if (!name) return dashFileName('individual');
    if (/\.html$/i.test(name)) return name;
    return name + '.html';
  }

  function cleanDashPath(file) {
    return String(file || '').replace(/\.html$/i, '');
  }

  function normalizeDashName(name) {
    return cleanDashPath(String(name || '').split('?')[0]).toLowerCase();
  }

  function buildDashboardUrl(acc) {
    if (!acc || !acc.id || !acc.token) return '';
    storeDashToken(acc.id, acc.token);
    var type = acc.type || 'individual';
    var path = htmlDashPath(dashFileName(type));
    return path + '?id=' + encodeURIComponent(acc.id);
  }

  function resolveDashboardUrl() {
    var sess = readStoredSession();
    if (!sess) return '';
    var acc = findApprovedAccount(sess);
    if (!acc) return '';
    return buildDashboardUrl(acc);
  }

  function setActiveSession(acc) {
    if (!acc || !acc.id || !acc.token) return;
    storeDashToken(acc.id, acc.token);
    try {
      localStorage.setItem('rizq_active_session', JSON.stringify({
        id: acc.id,
        token: acc.token,
        type: acc.type || 'individual',
        name: acc.name || acc.owner || acc.manager || ''
      }));
    } catch (e) {}
    if ((acc.type || '') === 'individual') {
      try {
        localStorage.setItem('rizq_individual_session', JSON.stringify({
          id: acc.id,
          token: acc.token,
          name: acc.name || ''
        }));
      } catch (e2) {}
    }
  }

  function clearSession() {
    SESSION_KEYS.forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    try {
      for (var i = sessionStorage.length - 1; i >= 0; i--) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf('rizq_dash_token_') === 0) sessionStorage.removeItem(k);
      }
    } catch (e2) {}
  }

  function setAfterAuthHref(href) {
    if (!href) return;
    var safe = String(href);
    /* منع تحويل مفتوح: نفس المنشأ أو مسار نسبي فقط */
    try {
      if (/^https?:\/\//i.test(safe) || safe.indexOf('//') === 0) {
        var u = new URL(safe, location.href);
        if (u.origin !== location.origin) return;
        safe = u.pathname + u.search + u.hash;
      }
      if (safe.charAt(0) !== '/' && safe.indexOf('.html') < 0 && safe.indexOf('rizq_') !== 0) {
        return;
      }
    } catch (e) {
      return;
    }
    try {
      sessionStorage.setItem(AFTER_AUTH_HREF_KEY, safe);
    } catch (e2) {}
  }

  function consumeAfterAuthHref() {
    var href = '';
    try {
      href = sessionStorage.getItem(AFTER_AUTH_HREF_KEY) || '';
      if (href) sessionStorage.removeItem(AFTER_AUTH_HREF_KEY);
    } catch (e) {}
    if (!href) return '';
    try {
      if (/^https?:\/\//i.test(href) || href.indexOf('//') === 0) {
        var u = new URL(href, location.href);
        if (u.origin !== location.origin) return '';
        return u.pathname + u.search + u.hash;
      }
    } catch (e2) {
      return '';
    }
    return href;
  }

  function publicShareUrl(accOrType, id) {
    var path = publicPageForAccount(accOrType, id);
    if (!path) return '';
    var origin = '';
    try {
      origin = (typeof location !== 'undefined' && location.origin) ? location.origin : '';
    } catch (e) {}
    return origin ? origin + '/' + String(path).replace(/^\//, '') : String(path);
  }

  function initShareLinkInput(inputId, acc) {
    var el = document.getElementById(inputId || 'share-link-input');
    if (!el || !acc) return;
    el.value = publicShareUrl(acc);
  }

  function redirectAfterAuth(defaultUrl) {
    var after = consumeAfterAuthHref();
    var target = after || defaultUrl || '';
    if (target) location.href = target;
    return target;
  }

  function publicPageForAccount(accOrType, id) {
    var type = 'individual';
    var accId = '';
    if (accOrType && typeof accOrType === 'object') {
      type = accOrType.type || 'individual';
      accId = accOrType.id || '';
    } else {
      type = accOrType || 'individual';
      accId = id || '';
    }
    var map = {
      store: 'rizq_store.html',
      office: 'rizq_office.html',
      corp: 'rizq_corp.html',
      individual: 'rizq_profile.html'
    };
    var page = map[type] || 'rizq_profile.html';
    return accId ? page + '?id=' + encodeURIComponent(accId) : page;
  }

  function backendBase() {
    try {
      if (typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE) {
        return window.RIZQ_BACKEND_BASE.replace(/\/$/, '');
      }
    } catch (e) {}
    return '';
  }

  function mergeServerAccount(serverAcc) {
    if (!serverAcc || !serverAcc.id) return null;
    var accs = readPendingAccounts();
    var idx = accs.findIndex(function (a) { return a && a.id === serverAcc.id; });
    var rec = idx >= 0 ? Object.assign({}, accs[idx]) : {};
    rec.id = serverAcc.id;
    rec.type = serverAcc.type || rec.type || 'individual';
    rec.name = serverAcc.name || rec.name || rec.owner || rec.manager || '';
    rec.email = serverAcc.email || rec.email || '';
    rec.status = serverAcc.status || rec.status || 'approved';
    rec.token = serverAcc.dashToken || serverAcc.token || rec.token || '';
    rec.backendAccessToken = serverAcc.accessToken || rec.backendAccessToken || '';
    if (typeof serverAcc.suspended !== 'undefined') rec.suspended = !!serverAcc.suspended;
    delete rec.password;
    ['phone', 'city', 'address', 'desc', 'promo_video', 'category', 'whatsapp', 'facebook', 'thumb', 'tagline', 'package', 'package_price'].forEach(function (k) {
      if (serverAcc[k] != null && serverAcc[k] !== '') rec[k] = serverAcc[k];
    });
    if (idx >= 0) accs[idx] = rec;
    else accs.push(rec);
    try { localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs)); } catch (e) {}
    if (rec.token) storeDashToken(rec.id, rec.token);
    return rec;
  }

  function accountAccessToken(acc) {
    if (!acc) return '';
    return acc.backendAccessToken || acc.accessToken || '';
  }

  function syncAccountFromBackend(acc) {
    var token = accountAccessToken(acc);
    if (!acc || !acc.id || !token) return Promise.resolve(acc);
    var base = backendBase();
    if (!base) return Promise.resolve(acc);
    return fetch(base + '/api/accounts/mine/' + encodeURIComponent(acc.id), {
      headers: { 'x-account-token': token }
    }).then(function (r) {
      if (r.status === 401 || r.status === 403) {
        clearSession();
        return null;
      }
      return r.ok ? r.json() : null;
    }).then(function (data) {
      if (!data) return null;
      if (data && data.ok && data.account) {
        if (data.account.suspended) {
          clearSession();
          return null;
        }
        if (data.account.status && data.account.status !== 'approved') {
          clearSession();
          return null;
        }
        var merged = mergeServerAccount(Object.assign({}, data.account, {
          accessToken: token,
          dashToken: data.account.dashToken || acc.token
        }));
        return merged || null;
      }
      return null;
    }).catch(function () { return acc; });
  }

  function loginSellerAsync(email, password) {
    var em = String(email || '').trim().toLowerCase();
    var pw = String(password || '');
    if (!em || !pw) return Promise.resolve({ ok: false, code: 'invalid' });

    var base = backendBase();
    if (!base) return Promise.resolve({ ok: false, code: 'network' });

    return fetch(base + '/api/accounts/seller-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em, password: pw })
    }).then(function (r) {
      return r.json().then(function (data) { return { res: r, data: data }; }).catch(function () {
        return { res: r, data: null };
      });
    }).then(function (out) {
      var data = out.data;
      if (out.res && out.res.status === 403 && data && data.code === 'not_approved') {
        if (data.account) mergeServerAccount(data.account);
        return { ok: false, code: 'not_approved', status: data.status };
      }
      if (!data || !data.ok || !data.account) {
        return { ok: false, code: (data && data.code) || 'invalid' };
      }
      var acc = mergeServerAccount(data.account);
      if (!acc.token && data.account.dashToken) acc.token = data.account.dashToken;
      if (acc.status !== 'approved' || !acc.token) {
        return { ok: false, code: 'not_approved', status: acc.status };
      }
      setActiveSession(acc);
      return { ok: true, account: acc, url: buildDashboardUrl(acc) };
    }).catch(function () {
      return { ok: false, code: 'network' };
    });
  }

  function requestPasswordReset(email) {
    var em = String(email || '').trim().toLowerCase();
    var base = backendBase();
    if (!em || !base) return Promise.resolve({ ok: false, code: 'invalid' });
    return fetch(base + '/api/accounts/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em })
    }).then(function (r) {
      return r.json().then(function (data) { return data || { ok: false }; }).catch(function () {
        return { ok: false, code: 'network' };
      });
    }).catch(function () { return { ok: false, code: 'network' }; });
  }

  function confirmPasswordReset(email, code, newPassword) {
    var em = String(email || '').trim().toLowerCase();
    var base = backendBase();
    if (!em || !code || !newPassword || !base) return Promise.resolve({ ok: false, code: 'invalid' });
    return fetch(base + '/api/accounts/password-reset/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em, code: String(code).replace(/\D/g, ''), newPassword: String(newPassword) })
    }).then(function (r) {
      return r.json().then(function (data) {
        if (data && data.ok && data.account) {
          var acc = mergeServerAccount(data.account);
          if (!acc.token && data.account.dashToken) acc.token = data.account.dashToken;
          if (acc.status === 'approved' && acc.token) setActiveSession(acc);
          return { ok: true, account: acc, url: buildDashboardUrl(acc) };
        }
        return { ok: false, code: (data && data.code) || 'invalid', error: data && data.error };
      }).catch(function () { return { ok: false, code: 'network' }; });
    }).catch(function () { return { ok: false, code: 'network' }; });
  }

  function changePasswordAsync(accountId, accessToken, currentPassword, newPassword) {
    var id = String(accountId || '');
    var tok = String(accessToken || '');
    var base = backendBase();
    if (!id || !tok || !base) return Promise.resolve({ ok: false, code: 'unauthorized' });
    return fetch(base + '/api/accounts/mine/' + encodeURIComponent(id) + '/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-account-token': tok
      },
      body: JSON.stringify({
        currentPassword: String(currentPassword || ''),
        newPassword: String(newPassword || '')
      })
    }).then(function (r) {
      return r.json().then(function (data) {
        if (r.ok && data && data.ok) return { ok: true };
        return { ok: false, code: (data && data.code) || 'invalid', error: data && data.error };
      }).catch(function () { return { ok: false, code: 'network' }; });
    }).catch(function () { return { ok: false, code: 'network' }; });
  }

  function goAfterRegistration(acc) {
    if (!acc) return false;
    if (acc.status === 'approved' && acc.token) {
      setActiveSession(acc);
      var url = buildDashboardUrl(acc);
      if (url) {
        redirectAfterAuth(url);
        return true;
      }
    }
    return false;
  }

  function rememberCurrentForAfterAuth() {
    try {
      if (sessionStorage.getItem(AFTER_AUTH_HREF_KEY)) return;
      setAfterAuthHref(location.pathname + location.search + (location.hash || ''));
    } catch (e) {}
  }

  function promptLogin(returnHref) {
    if (returnHref) setAfterAuthHref(returnHref);
    else rememberCurrentForAfterAuth();
    var dash = resolveDashboardUrl();
    if (dash) {
      location.href = dash;
      return true;
    }
    return openGuestChoice();
  }

  function openGuestChoice() {
    /* مشتري مسجّل: لوحة الحساب لا شاشة الاختيار */
    if (window.RizqAuthGate && typeof window.RizqAuthGate.isLoggedIn === 'function' && window.RizqAuthGate.isLoggedIn()) {
      if (typeof window.RizqAuthGate.openAccount === 'function') {
        window.RizqAuthGate.openAccount();
        return true;
      }
    }
    if (window.RizqAuthGate && typeof window.RizqAuthGate.openAccountChoice === 'function') {
      window.RizqAuthGate.openAccountChoice();
      return true;
    }
    if (window.RizqAuthGate && typeof window.RizqAuthGate.openAccount === 'function') {
      window.RizqAuthGate.openAccount();
      return true;
    }
    if (typeof window.openModal === 'function') {
      window.openModal('login');
      return true;
    }
    return false;
  }

  function openAccount(e) {
    if (e && e.preventDefault) e.preventDefault();
    var url = resolveDashboardUrl();
    if (url) {
      location.href = url;
      return false;
    }
    rememberCurrentForAfterAuth();
    if (openGuestChoice()) return false;
    location.href = 'rizq_register.html';
    return false;
  }

  function bootstrapDashboard() {
    var p = new URLSearchParams(location.search);
    if (p.get('demo') === '1') return;
    stripTokenFromUrl();
    if (p.get('id')) {
      try {
        sessionStorage.removeItem('rizq_dash_boot_guard');
        sessionStorage.removeItem('rizq_dash_boot_ts');
      } catch (eClear) {}
      return;
    }
    var url = resolveDashboardUrl();
    if (!url) return;
    var targetFile = url.split('?')[0];
    var query = url.indexOf('?') >= 0 ? url.slice(url.indexOf('?')) : '';
    var currentFile = (location.pathname || '').split('/').pop() || '';
    var now = Date.now();
    var last = 0;
    try { last = parseInt(sessionStorage.getItem('rizq_dash_boot_ts') || '0', 10) || 0; } catch (eTs) {}
    if (last && (now - last) < 900) return;
    try { sessionStorage.setItem('rizq_dash_boot_ts', String(now)); } catch (eTs2) {}

    if (normalizeDashName(currentFile) === normalizeDashName(targetFile)) {
      if (!query) return;
      location.replace(currentFile + query);
      return;
    }
    location.replace(htmlDashPath(targetFile) + query);
  }

  function recoverSessionParams(expectedType) {
    stripTokenFromUrl();
    var p = new URLSearchParams(location.search);
    var id = p.get('id') || '';
    var token = id ? readDashToken(id) : '';

    if (id && token) {
      var accFromUrl = readPendingAccounts().find(function (a) {
        return a && a.id === id && a.token === token && a.status === 'approved';
      });
      var typeFromUrl = accFromUrl && accFromUrl.type ? accFromUrl.type : (expectedType || '');
      if (expectedType && typeFromUrl && typeFromUrl !== expectedType) return null;
      try {
        var pathOnly = htmlDashPath(dashFileName(typeFromUrl || expectedType || 'individual'));
        history.replaceState(null, '', pathOnly + '?id=' + encodeURIComponent(id));
      } catch (eHist) {}
      return { id: id, token: token, account: accFromUrl || null, fromUrl: true };
    }

    var sess = readStoredSession();
    if (!sess) return null;
    var acc = findApprovedAccount(sess);
    if (!acc) return null;
    var type = acc.type || 'individual';
    if (expectedType && type !== expectedType) return null;
    storeDashToken(acc.id, acc.token);
    try {
      var path = htmlDashPath(dashFileName(type));
      history.replaceState(null, '', path + '?id=' + encodeURIComponent(acc.id));
    } catch (eHist2) {}
    return { id: acc.id, token: acc.token, account: acc, fromUrl: false };
  }

  function refreshStoredSessionFromBackend() {
    var sess = readStoredSession();
    if (!sess) return Promise.resolve(null);
    var acc = findApprovedAccount(sess);
    if (!acc) return Promise.resolve(null);
    return syncAccountFromBackend(acc).then(function (fresh) {
      if (fresh && fresh.status === 'approved' && !fresh.suspended && fresh.token) {
        setActiveSession(fresh);
        return fresh;
      }
      clearSession();
      return null;
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      stripTokenFromUrl();
      purgeLegacyPlaintextPasswords();
      refreshStoredSessionFromBackend();
    });
  }

  window.RizqAccount = {
    open: openAccount,
    publicPageForAccount: publicPageForAccount,
    resolveDashboardUrl: resolveDashboardUrl,
    buildDashboardUrl: buildDashboardUrl,
    bootstrapDashboard: bootstrapDashboard,
    recoverSessionParams: recoverSessionParams,
    clearSession: clearSession,
    setActiveSession: setActiveSession,
    storeDashToken: storeDashToken,
    readDashToken: readDashToken,
    stripTokenFromUrl: stripTokenFromUrl,
    setAfterAuthHref: setAfterAuthHref,
    rememberCurrentForAfterAuth: rememberCurrentForAfterAuth,
    promptLogin: promptLogin,
    consumeAfterAuthHref: consumeAfterAuthHref,
    redirectAfterAuth: redirectAfterAuth,
    publicShareUrl: publicShareUrl,
    initShareLinkInput: initShareLinkInput,
    loginSellerAsync: loginSellerAsync,
    requestPasswordReset: requestPasswordReset,
    confirmPasswordReset: confirmPasswordReset,
    changePasswordAsync: changePasswordAsync,
    syncAccountFromBackend: syncAccountFromBackend,
    mergeServerAccount: mergeServerAccount,
    refreshStoredSessionFromBackend: refreshStoredSessionFromBackend,
    goAfterRegistration: goAfterRegistration
  };
})();
