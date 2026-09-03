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

  function readPendingAccounts() {
    try {
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      return Array.isArray(accs) ? accs : [];
    } catch (e) {
      return [];
    }
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

  function buildDashboardUrl(acc) {
    if (!acc || !acc.id || !acc.token) return '';
    var type = acc.type || 'individual';
    var file = DASHBOARD_FILES[type] || DASHBOARD_FILES.individual;
    return file + '?id=' + encodeURIComponent(acc.id) + '&token=' + encodeURIComponent(acc.token);
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
  }

  function findSellerByLogin(email, password) {
    var em = String(email || '').trim().toLowerCase();
    var pw = String(password || '');
    if (!em || !pw) return null;
    return readPendingAccounts().find(function (a) {
      if (!a || a.status !== 'approved') return false;
      if (!a.token) return false;
      if (String(a.email || '').trim().toLowerCase() !== em) return false;
      if (a.password == null || a.password === '') return false;
      return String(a.password) === pw;
    }) || null;
  }

  function loginSeller(email, password) {
    var acc = findSellerByLogin(email, password);
    if (!acc) return { ok: false, code: 'invalid' };
    setActiveSession(acc);
    var url = buildDashboardUrl(acc);
    return { ok: true, account: acc, url: url };
  }

  function goAfterRegistration(acc) {
    if (!acc) return false;
    if (acc.status === 'approved' && acc.token) {
      setActiveSession(acc);
      var url = buildDashboardUrl(acc);
      if (url) {
        location.href = url;
        return true;
      }
    }
    return false;
  }

  function openGuestChoice() {
    /* على الكمبيوتر/التابلت: نفتح صفحة الحساب الكاملة مباشرة */
    var isDesktop = false;
    try { isDesktop = window.matchMedia('(min-width: 769px)').matches; } catch (e) {}
    if (isDesktop && typeof window.openModal === 'function') {
      window.openModal('account');
      return true;
    }
    /* على الهاتف: نستخدم نافذة AuthGate العادية */
    if (window.RizqAuthGate && typeof window.RizqAuthGate.openAccountChoice === 'function') {
      window.RizqAuthGate.openAccountChoice();
      return true;
    }
    if (window.RizqAuthGate && typeof window.RizqAuthGate.openAccount === 'function') {
      window.RizqAuthGate.openAccount();
      return true;
    }
    if (typeof window.openModal === 'function') {
      window.openModal('account');
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
    if (openGuestChoice()) return false;
    location.href = 'rizq_register.html';
    return false;
  }

  function bootstrapDashboard() {
    var p = new URLSearchParams(location.search);
    if (p.get('id') && p.get('token')) return;
    if (p.get('demo') === '1') return;
    var url = resolveDashboardUrl();
    if (!url) return;
    var target = url.split('?')[0];
    var current = (location.pathname || '').split('/').pop() || '';
    if (current === target && p.get('id') && p.get('token')) return;
    location.replace(url);
  }

  window.RizqAccount = {
    open: openAccount,
    resolveDashboardUrl: resolveDashboardUrl,
    buildDashboardUrl: buildDashboardUrl,
    bootstrapDashboard: bootstrapDashboard,
    clearSession: clearSession,
    setActiveSession: setActiveSession,
    loginSeller: loginSeller,
    goAfterRegistration: goAfterRegistration,
    findSellerByLogin: findSellerByLogin
  };
})();
