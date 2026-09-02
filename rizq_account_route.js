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
    try {
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      return accs.find(function (a) {
        return a.id === sess.id && a.token === sess.token && a.status === 'approved';
      }) || null;
    } catch (e) {
      return null;
    }
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

  function isLandingPage() {
    var p = (location.pathname || '').split('/').pop() || '';
    return p === '' || p === 'index.html' || p === 'rizq_landing_v8.html';
  }

  function openAccount(e) {
    if (e && e.preventDefault) e.preventDefault();
    var url = resolveDashboardUrl();
    if (url) {
      location.href = url;
      return false;
    }
    if (window.RizqAuthGate && typeof window.RizqAuthGate.openAccount === 'function') {
      window.RizqAuthGate.openAccount();
      return false;
    }
    if (isLandingPage() && typeof window.openModal === 'function') {
      window.openModal('login');
      return false;
    }
    location.href = 'rizq_landing_v8.html?openLogin=1';
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
    bootstrapDashboard: bootstrapDashboard
  };
})();
