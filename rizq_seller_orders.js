/**
 * rizq_seller_orders.js — حقن لوحة طلبات الشراء في لوحات office/corp/estate
 */
(function () {
  'use strict';
  if (window.__rizqSellerOrdersInjected) return;
  window.__rizqSellerOrdersInjected = true;

  function ensureOps(cb) {
    if (window.RizqOps) return cb();
    var s = document.createElement('script');
    s.src = 'rizq_ops_client.js?v=1.0';
    s.onload = cb;
    document.head.appendChild(s);
  }

  function sellerId() {
    if (typeof window.SESSION_ID !== 'undefined' && window.SESSION_ID) return window.SESSION_ID;
    try {
      var acc = JSON.parse(localStorage.getItem('rizq_active_session') || 'null');
      return (acc && acc.id) || '';
    } catch (e) { return ''; }
  }

  function inject() {
    var sid = sellerId();
    if (!sid) return;
    var sidebar = document.querySelector('.sidebar') || document.querySelector('.sb-nav') ||
      (document.querySelector('.sb-item') && document.querySelector('.sb-item').parentElement);
    if (!sidebar || document.getElementById('sb-marketplace-orders-seller')) return;

    var item = document.createElement('div');
    item.className = 'sb-item';
    item.id = 'sb-marketplace-orders-seller';
    item.innerHTML = '<span class="sb-icon">🛒</span><span>طلبات الشراء</span>';
    item.onclick = function () {
      if (typeof showPanel === 'function') showPanel('marketplace-orders', item);
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
      var p = document.getElementById('panel-marketplace-orders');
      if (p) p.classList.add('active');
      document.querySelectorAll('.sb-item').forEach(function (n) { n.classList.remove('active'); });
      item.classList.add('active');
      render();
    };
    var req = sidebar.querySelector('[onclick*="requests"]') || sidebar.querySelector('[onclick*="messages"]');
    if (req && req.parentNode) req.parentNode.insertBefore(item, req);
    else sidebar.appendChild(item);

    var main = document.querySelector('.main') || document.querySelector('.content') || document.querySelector('.main-content');
    if (!main) return;
    if (document.getElementById('panel-marketplace-orders')) return;
    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'panel-marketplace-orders';
    panel.innerHTML = '<div class="card"><div class="card-header"><div class="card-title">🛒 طلبات الشراء</div>' +
      '<button type="button" class="btn btn-outline btn-sm" onclick="window.rizqSellerOrdersRender&&rizqSellerOrdersRender()">🔄</button></div>' +
      '<div id="inj-seller-metrics" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:12px"></div>' +
      '<div id="inj-seller-orders"></div></div>';
    main.appendChild(panel);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function render() {
    ensureOps(function () {
      var sid = sellerId();
      var list = document.getElementById('inj-seller-orders');
      var metrics = document.getElementById('inj-seller-metrics');
      if (!sid || !list) return;
      window.RizqOps.sellerMetrics(sid).then(function (j) {
        if (!metrics || !j || !j.ok) return;
        var m = j.metrics;
        metrics.innerHTML =
          '<div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px"><div style="font-size:11px;color:#64748b">طلبات اليوم</div><strong>' + m.todayOrders + '</strong></div>' +
          '<div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px"><div style="font-size:11px;color:#64748b">مبيعات اليوم</div><strong style="color:#c9a84c">' + m.todayRevenue + '</strong></div>' +
          '<div style="padding:10px;border:1px solid #e2e8f0;border-radius:10px"><div style="font-size:11px;color:#64748b">نسبة الإتمام</div><strong>' + m.fulfillmentRate + '%</strong></div>';
      }).catch(function () {});
      window.RizqOps.listSellerOrders(sid).then(function (j) {
        if (!j || !j.ok || !j.orders || !j.orders.length) {
          list.innerHTML = '<p style="color:#94a3b8;padding:16px;text-align:center">لا توجد طلبات</p>';
          return;
        }
        list.innerHTML = j.orders.map(function (o) {
          return '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px">' +
            '<strong>#' + esc(o.orderNumber) + '</strong> · ' + esc(o.status) + ' · ' + esc(o.total) + ' ' + esc(o.currency || 'MRU') +
            (o.paymentReference ? '<br/>Ref: ' + esc(o.paymentReference) : '') +
            '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">' +
            (o.status === 'new' ? '<button type="button" class="btn btn-sm btn-primary" onclick="window.rizqSellerAdvance&&rizqSellerAdvance(\'' + o.id + '\',\'accepted\')">قبول</button>' : '') +
            (o.status === 'accepted' ? '<button type="button" class="btn btn-sm btn-primary" onclick="window.rizqSellerAdvance&&rizqSellerAdvance(\'' + o.id + '\',\'out_for_delivery\')">خرج للتوصيل</button>' : '') +
            (o.status === 'out_for_delivery' ? '<button type="button" class="btn btn-sm btn-primary" onclick="window.rizqSellerAdvance&&rizqSellerAdvance(\'' + o.id + '\',\'completed\')">تم التسليم</button>' : '') +
            (o.paymentStatus === 'awaiting_review' ? '<button type="button" class="btn btn-sm btn-outline" onclick="window.rizqSellerPay&&rizqSellerPay(\'' + o.id + '\',\'approved\')">اعتماد الدفع</button>' : '') +
            '</div></div>';
        }).join('');
      });
    });
  }

  window.rizqSellerOrdersRender = render;
  window.rizqSellerAdvance = function (id, st) {
    ensureOps(function () {
      window.RizqOps.patchOrderStatus(id, st, {}, sellerId()).then(function () { render(); });
    });
  };
  window.rizqSellerPay = function (id, decision) {
    ensureOps(function () {
      window.RizqOps.reviewPayment(id, decision, sellerId(), '').then(function () { render(); });
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else setTimeout(inject, 400);
})();
