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

  /* Express على localhost:3000 لا يخدم الملفات بلا .html (يُرجع JSON 404).
     نُبقي اسم الملف كاملاً في روابط اللوحات. المقارنة تتجاهل الامتداد
     حتى لا تكسر Live Server إن حوّل *.html إلى مسار بلا امتداد. */
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
    var type = acc.type || 'individual';
    var path = htmlDashPath(dashFileName(type));
    return path + '?id=' + encodeURIComponent(acc.id) + '&token=' + encodeURIComponent(acc.token);
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
    if (p.get('demo') === '1') return;
    if (p.get('id') && p.get('token')) {
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
    /* منع حلقة سريعة فقط (أقل من ثانية) — لا قفل دائم يمنع فتح اللوحة */
    if (last && (now - last) < 900) return;
    try { sessionStorage.setItem('rizq_dash_boot_ts', String(now)); } catch (eTs2) {}

    if (normalizeDashName(currentFile) === normalizeDashName(targetFile)) {
      if (!query) return;
      location.replace(currentFile + query);
      return;
    }
    location.replace(htmlDashPath(targetFile) + query);
  }

  /* إن فُقدت ?id=&token= من الرابط (تحويل السيرفر)، نستعيدها من الجلسة المحلية
     بدون إعادة تحميل لتجنّب الشاشة البيضاء و«يجب تسجيل الدخول». */
  function recoverSessionParams(expectedType) {
    var p = new URLSearchParams(location.search);
    if (p.get('id') && p.get('token')) {
      return { id: p.get('id'), token: p.get('token'), fromUrl: true };
    }
    var sess = readStoredSession();
    if (!sess) return null;
    var acc = findApprovedAccount(sess);
    if (!acc) return null;
    var type = acc.type || 'individual';
    if (expectedType && type !== expectedType) return null;
    try {
      var path = htmlDashPath(dashFileName(type));
      var q = '?id=' + encodeURIComponent(acc.id) + '&token=' + encodeURIComponent(acc.token);
      history.replaceState(null, '', path + q);
    } catch (eHist) {}
    return { id: acc.id, token: acc.token, account: acc, fromUrl: false };
  }

  window.RizqAccount = {
    open: openAccount,
    resolveDashboardUrl: resolveDashboardUrl,
    buildDashboardUrl: buildDashboardUrl,
    bootstrapDashboard: bootstrapDashboard,
    recoverSessionParams: recoverSessionParams,
    clearSession: clearSession,
    setActiveSession: setActiveSession,
    loginSeller: loginSeller,
    goAfterRegistration: goAfterRegistration,
    findSellerByLogin: findSellerByLogin
  };
})();
