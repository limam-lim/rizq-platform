/**
 * rizq_ops_admin.js — نزاعات الطلبات ومقاييس السوق في لوحة الإدارة
 * يحقن تبويباً وواجهة دون إعادة بناء اللوحة.
 */
(function () {
  'use strict';
  if (window.__rizqOpsAdmin) return;
  window.__rizqOpsAdmin = true;

  function apiBase() {
    if (typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE) {
      return String(window.RIZQ_BACKEND_BASE).replace(/\/$/, '');
    }
    return location.origin;
  }

  function ensureOpsClient(cb) {
    if (window.RizqOps) return cb();
    var s = document.createElement('script');
    s.src = 'rizq_ops_client.js?v=1.1';
    s.onload = cb;
    document.head.appendChild(s);
  }

  var _lastDisputed = 0;
  var _baseTitle = '';

  function injectUi() {
    var sidebar = document.querySelector('.sidebar') || document.querySelector('[class*="sb-nav"]') || document.querySelector('.sb-item') && document.querySelector('.sb-item').parentElement;
    if (!sidebar) return;
    if (document.getElementById('sb-marketplace-orders')) return;

    var item = document.createElement('div');
    item.className = 'sb-item';
    item.id = 'sb-marketplace-orders';
    item.setAttribute('data-admin-perm', 'payments');
    item.innerHTML = '<span class="sb-icon">🛒</span><span class="sb-label">طلبات السوق والنزاعات</span><span class="sb-badge" id="disputes-badge" style="background:linear-gradient(135deg,#dc2626,#b91c1c);display:none">0</span>';
    item.onclick = function () {
      if (typeof showPanel === 'function') showPanel('marketplace-orders', item);
      else activateLocal(item);
      renderAdminOrders();
    };
    var reports = sidebar.querySelector('[onclick*="reports"]');
    if (reports && reports.parentNode) reports.parentNode.insertBefore(item, reports.nextSibling);
    else sidebar.appendChild(item);

    var main = document.querySelector('.main-content') || document.querySelector('.content') || document.body;
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'panel-marketplace-orders';
    panel.innerHTML =
      '<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">📈 مقاييس السوق اليوم</div>' +
      '<button type="button" class="btn btn-outline btn-sm" onclick="window.rizqRenderAdminOrders && rizqRenderAdminOrders()">🔄</button></div>' +
      '<div id="admin-order-metrics" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px"></div></div>' +
      '<div class="card"><div class="card-header"><div class="card-title">⚖️ النزاعات المفتوحة</div></div>' +
      '<div id="admin-disputes-list"><p style="padding:20px;color:#94a3b8;text-align:center">جاري التحميل…</p></div></div>';
    main.appendChild(panel);
  }

  function activateLocal(item) {
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
    var p = document.getElementById('panel-marketplace-orders');
    if (p) p.classList.add('active');
    document.querySelectorAll('.sb-item').forEach(function (n) { n.classList.remove('active'); });
    if (item) item.classList.add('active');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function renderAdminOrders() {
    ensureOpsClient(function () {
      var metricsEl = document.getElementById('admin-order-metrics');
      var listEl = document.getElementById('admin-disputes-list');
      window.RizqOps.adminMetrics().then(function (j) {
        if (!metricsEl || !j || !j.ok) return;
        var m = j.metrics || {};
        metricsEl.innerHTML =
          '<div style="background:#f8faff;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><div style="font-size:11px;color:#64748b">طلبات اليوم</div><div style="font-size:22px;font-weight:900;color:#0f2347">' + (m.todayOrders || 0) + '</div></div>' +
          '<div style="background:#f8faff;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><div style="font-size:11px;color:#64748b">إيراد اليوم</div><div style="font-size:22px;font-weight:900;color:#c9a84c">' + (m.todayRevenue || 0) + '</div></div>' +
          '<div style="background:#f8faff;border:1px solid #e2e8f0;border-radius:12px;padding:12px"><div style="font-size:11px;color:#64748b">نزاعات مفتوحة</div><div style="font-size:22px;font-weight:900;color:#b91c1c">' + (m.disputedOpen || 0) + '</div></div>';
        var badge = document.getElementById('disputes-badge');
        var openN = Number(m.disputedOpen) || 0;
        if (badge) {
          if (openN) { badge.textContent = String(openN); badge.style.display = ''; }
          else badge.style.display = 'none';
        }
        if (!_baseTitle) _baseTitle = document.title || 'رزق — إدارة';
        if (openN > 0) {
          document.title = '(' + openN + ') نزاع · ' + _baseTitle;
          if (openN > _lastDisputed && typeof showToast === 'function') {
            showToast('نزاعات مفتوحة: ' + openN, 'error');
          }
        } else if (_baseTitle) {
          document.title = _baseTitle;
        }
        _lastDisputed = openN;
      }).catch(function () {});

      window.RizqOps.listDisputed().then(function (j) {
        if (!listEl) return;
        if (!j || !j.ok || !j.orders || !j.orders.length) {
          listEl.innerHTML = '<p style="padding:24px;text-align:center;color:#94a3b8">لا نزاعات مفتوحة</p>';
          return;
        }
        listEl.innerHTML = j.orders.map(function (o) {
          return '<div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:10px">' +
            '<div style="display:flex;justify-content:space-between;gap:8px"><strong>#' + esc(o.orderNumber) + '</strong>' +
            '<span style="color:#b91c1c;font-weight:800">نزاع</span></div>' +
            '<div style="font-size:13px;color:#475569;margin-top:6px;line-height:1.55">' +
            esc(o.total) + ' ' + esc(o.currency || 'MRU') +
            (o.disputeReason ? '<br/>سبب: ' + esc(o.disputeReason) : '') +
            (o.payoutFrozen ? '<br/>❄️ صرف البائع مجمّد' : '') +
            '</div>' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' +
            '<button type="button" class="btn btn-primary btn-sm" onclick="window.rizqResolveOrder && rizqResolveOrder(\'' + esc(o.id) + '\',\'completed\')">إغلاق لصالح المشتري/إتمام</button>' +
            '<button type="button" class="btn btn-outline btn-sm" onclick="window.rizqResolveOrder && rizqResolveOrder(\'' + esc(o.id) + '\',\'cancelled\')">إلغاء وحل النزاع</button>' +
            '<button type="button" class="btn btn-outline btn-sm" onclick="window.rizqResolveOrder && rizqResolveOrder(\'' + esc(o.id) + '\',\'accepted\')">إعادة للبائع</button>' +
            '</div></div>';
        }).join('');
      }).catch(function () {
        if (listEl) listEl.innerHTML = '<p style="color:#b91c1c;padding:20px;text-align:center">تعذّر التحميل</p>';
      });
    });
  }

  window.rizqRenderAdminOrders = renderAdminOrders;
  window.rizqResolveOrder = function (id, next) {
    var note = prompt('قرار الإدارة / ملاحظة:') || 'قرار الإدارة';
    ensureOpsClient(function () {
      window.RizqOps.resolveDispute(id, note, next).then(function (j) {
        if (j && j.ok) {
          if (typeof showToast === 'function') showToast('تم حل النزاع', 'success');
          renderAdminOrders();
        } else {
          alert((j && j.error) || 'فشل');
        }
      });
    });
  };

  // ربط showPanel الأصلي إن وُجد
  var _origShow = window.showPanel;
  if (typeof _origShow === 'function') {
    window.showPanel = function (id, el) {
      _origShow(id, el);
      if (id === 'marketplace-orders') renderAdminOrders();
    };
  }

  function startBadgePolling() {
    if (window.__rizqDisputePoll) return;
    window.__rizqDisputePoll = setInterval(function () {
      if (!document.getElementById('disputes-badge')) return;
      renderAdminOrders();
    }, 45000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectUi();
      setTimeout(renderAdminOrders, 800);
      startBadgePolling();
    });
  } else {
    injectUi();
    setTimeout(renderAdminOrders, 800);
    startBadgePolling();
  }
})();
