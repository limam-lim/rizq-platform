/**
 * rizq_ops_client.js — عميل واجهة لطلبات السوق، البحث الموحّد، Push، والخصوصية
 * يُحمَّل مع AuthGate / السلة / لوحات البائع دون إعادة تصميم الهوية.
 */
(function (global) {
  'use strict';
  if (global.RizqOps) return;

  var STATUS_AR = {
    new: 'جديد',
    accepted: 'مقبول',
    out_for_delivery: 'خرج للتوصيل',
    completed: 'مكتمل',
    cancelled: 'ملغى',
    disputed: 'قيد النزاع'
  };
  var STATUS_FR = {
    new: 'Nouveau',
    accepted: 'Accepté',
    out_for_delivery: 'En livraison',
    completed: 'Terminé',
    cancelled: 'Annulé',
    disputed: 'Litige'
  };

  function apiBase() {
    if (typeof global.RIZQ_BACKEND_BASE === 'string' && global.RIZQ_BACKEND_BASE) {
      return String(global.RIZQ_BACKEND_BASE).replace(/\/$/, '');
    }
    if (global.location && /localhost|127\.0\.0\.1/.test(global.location.hostname)) {
      return global.location.origin;
    }
    return '';
  }

  function isFr() {
    return (global.document && global.document.documentElement.lang === 'fr') || false;
  }

  function statusLabel(st) {
    return (isFr() ? STATUS_FR : STATUS_AR)[st] || st;
  }

  function buyerFetch(url, opts) {
    opts = opts || {};
    opts.credentials = 'include';
    opts.headers = opts.headers || {};
    if (global.RizqAuthGate && typeof global.RizqAuthGate.buyerAuthHeaders === 'function') {
      var s = global.RizqAuthGate.getSession && global.RizqAuthGate.getSession();
      if (s) Object.assign(opts.headers, global.RizqAuthGate.buyerAuthHeaders(s));
    }
    return fetch(url, opts);
  }

  function sellerHeaders(sellerId) {
    var h = { 'Content-Type': 'application/json' };
    try {
      var tok = '';
      if (typeof global.SESSION_TOKEN !== 'undefined' && global.SESSION_TOKEN) tok = global.SESSION_TOKEN;
      if (!tok && global.sessionStorage) {
        tok = global.sessionStorage.getItem('rizq_dash_token_' + sellerId) || '';
      }
      if (!tok && global.localStorage) {
        var acc = JSON.parse(global.localStorage.getItem('rizq_active_session') || 'null');
        if (acc && (acc.token || acc.dashToken)) tok = acc.token || acc.dashToken;
      }
      if (tok) {
        h['x-dash-token'] = tok;
        h['x-account-token'] = tok;
      }
      if (global.REAL_ACCESS_TOKEN) h['x-account-token'] = global.REAL_ACCESS_TOKEN;
    } catch (e) {}
    return h;
  }

  /* ── Orders ─────────────────────────────────────────── */

  function createOrder(payload) {
    return buyerFetch(apiBase() + '/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); });
  }

  function listBuyerOrders() {
    return buyerFetch(apiBase() + '/api/orders/buyer').then(function (r) {
      return r.json();
    });
  }

  function listSellerOrders(sellerId, status) {
    var q = '?sellerId=' + encodeURIComponent(sellerId);
    if (status) q += '&status=' + encodeURIComponent(status);
    return fetch(apiBase() + '/api/orders/seller' + q, {
      headers: sellerHeaders(sellerId),
      credentials: 'include'
    }).then(function (r) { return r.json(); });
  }

  function patchOrderStatus(orderId, status, extra, asSellerId) {
    var headers = { 'Content-Type': 'application/json' };
    var fetchFn = buyerFetch;
    if (asSellerId) {
      headers = sellerHeaders(asSellerId);
      fetchFn = fetch;
    }
    return fetchFn(apiBase() + '/api/orders/' + encodeURIComponent(orderId) + '/status', {
      method: 'PATCH',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify(Object.assign({ status: status }, extra || {}))
    }).then(function (r) { return r.json(); });
  }

  function cancelOrder(orderId, reason) {
    return buyerFetch(apiBase() + '/api/orders/' + encodeURIComponent(orderId) + '/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || '' })
    }).then(function (r) { return r.json(); });
  }

  function disputeOrder(orderId, reason) {
    return buyerFetch(apiBase() + '/api/orders/' + encodeURIComponent(orderId) + '/dispute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || '' })
    }).then(function (r) { return r.json(); });
  }

  function reviewPayment(orderId, decision, sellerId, note) {
    return fetch(apiBase() + '/api/orders/' + encodeURIComponent(orderId) + '/payment-review', {
      method: 'POST',
      headers: sellerHeaders(sellerId),
      credentials: 'include',
      body: JSON.stringify({ decision: decision, note: note || '' })
    }).then(function (r) { return r.json(); });
  }

  function sellerMetrics(sellerId) {
    return fetch(apiBase() + '/api/orders/metrics/seller?sellerId=' + encodeURIComponent(sellerId), {
      headers: sellerHeaders(sellerId),
      credentials: 'include'
    }).then(function (r) { return r.json(); });
  }

  function adminMetrics() {
    return fetch(apiBase() + '/api/orders/metrics/admin', { credentials: 'include' }).then(function (r) { return r.json(); });
  }

  function listDisputed() {
    return fetch(apiBase() + '/api/orders/admin/disputed', { credentials: 'include' }).then(function (r) { return r.json(); });
  }

  function resolveDispute(orderId, resolution, nextStatus) {
    return fetch(apiBase() + '/api/orders/' + encodeURIComponent(orderId) + '/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ resolution: resolution || '', nextStatus: nextStatus || 'cancelled' })
    }).then(function (r) { return r.json(); });
  }

  /* ── Search ─────────────────────────────────────────── */

  function unifiedSearch(q, limit) {
    var url = apiBase() + '/api/search/unified?q=' + encodeURIComponent(q || '') +
      (limit ? '&limit=' + encodeURIComponent(limit) : '');
    return fetch(url).then(function (r) { return r.json(); });
  }

  function renderSearchCards(results, mountEl) {
    if (!mountEl) return;
    if (!results || !results.length) {
      mountEl.innerHTML = '<p style="text-align:center;color:#64748b;padding:20px;font-family:Cairo,sans-serif">' +
        (isFr() ? 'Aucun résultat' : 'لا توجد نتائج') + '</p>';
      return;
    }
    mountEl.innerHTML = results.map(function (c) {
      var price = c.price ? ('<div style="color:#c9a84c;font-weight:800;margin-top:4px">' + esc(c.price) + (c.currency ? ' ' + esc(c.currency) : '') + '</div>') : '';
      return (
        '<a href="' + esc(c.href || '#') + '" style="display:flex;gap:12px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;text-decoration:none;color:inherit;background:#fff;margin-bottom:8px;font-family:Cairo,sans-serif">' +
        (c.thumb ? '<img src="' + esc(c.thumb) + '" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;background:#f1f5f9"/>' : '<div style="width:64px;height:64px;border-radius:8px;background:#0f2347;flex-shrink:0"></div>') +
        '<div style="flex:1;min-width:0"><div style="font-weight:800;color:#0f2347;font-size:14px">' + esc(c.title) + '</div>' +
        '<div style="font-size:12px;color:#64748b">' + esc(c.subtitle || c.type || '') + '</div>' + price + '</div></a>'
      );
    }).join('');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* ── Privacy ────────────────────────────────────────── */

  function exportMyData() {
    return buyerFetch(apiBase() + '/api/privacy/export').then(function (r) {
      return r.json().then(function (j) {
        if (j && j.ok && j.data) {
          var blob = new Blob([JSON.stringify(j.data, null, 2)], { type: 'application/json' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'rizq-data-export.json';
          document.body.appendChild(a);
          a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        }
        return j;
      });
    });
  }

  function eraseMyAccount(confirmWord) {
    return buyerFetch(apiBase() + '/api/privacy/erase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: confirmWord || 'DELETE' })
    }).then(function (r) { return r.json(); });
  }

  function listAlerts() {
    return buyerFetch(apiBase() + '/api/privacy/alerts').then(function (r) { return r.json(); });
  }

  /* ── Web Push ───────────────────────────────────────── */

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(base64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function enablePush(kind, sellerId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in global)) {
      return Promise.reject(new Error('unsupported'));
    }
    return buyerFetch(apiBase() + '/api/push/vapid-public-key')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok || !j.publicKey) throw new Error('vapid_missing');
        return navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(j.publicKey)
          });
        }).then(function (sub) {
          var body = {
            userKind: kind || 'buyer',
            userId: sellerId || '',
            subscription: sub.toJSON()
          };
          var headers = { 'Content-Type': 'application/json' };
          var fn = buyerFetch;
          if (kind === 'seller' && sellerId) {
            headers = sellerHeaders(sellerId);
            fn = fetch;
          }
          return fn(apiBase() + '/api/push/subscribe', {
            method: 'POST',
            headers: headers,
            credentials: 'include',
            body: JSON.stringify(body)
          }).then(function (r2) { return r2.json(); });
        });
      });
  }

  function disablePush() {
    if (!('serviceWorker' in navigator)) return Promise.resolve({ ok: true });
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        if (!sub) return { ok: true };
        var endpoint = sub.endpoint;
        return sub.unsubscribe().then(function () {
          return buyerFetch(apiBase() + '/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: endpoint })
          }).then(function (r) { return r.json(); });
        });
      });
    });
  }

  /* ── Buyer order card HTML ──────────────────────────── */

  function orderCardHtml(o) {
    var d = o.delivery || {};
    var track = [d.wilaya, d.district, d.address].filter(Boolean).join(' — ');
    var canDispute = o.status === 'completed' || o.status === 'out_for_delivery' || o.status === 'accepted';
    var canCancel = o.status === 'new' || o.status === 'accepted';
    return (
      '<div class="rag-order-card" data-oid="' + esc(o.id) + '" style="border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:0 0 10px;background:#fff;font-family:Cairo,sans-serif">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">' +
      '<strong style="color:#0f2347">#' + esc(o.orderNumber) + '</strong>' +
      '<span style="font-size:12px;font-weight:800;color:#c9a84c">' + esc(statusLabel(o.status)) + '</span></div>' +
      '<div style="font-size:12.5px;color:#475569;margin-top:6px;line-height:1.6">' +
      esc(o.total) + ' ' + esc(o.currency || 'MRU') +
      (track ? '<br/>📍 ' + esc(track) : '') +
      (o.driverNotes ? '<br/>🚚 ' + esc(o.driverNotes) : '') +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">' +
      (canCancel ? '<button type="button" class="rag-ops-cancel" data-oid="' + esc(o.id) + '" style="font-family:Cairo,sans-serif;font-size:12px;font-weight:800;padding:7px 10px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer">' + (isFr() ? 'Annuler' : 'إلغاء الطلب') + '</button>' : '') +
      (canDispute ? '<button type="button" class="rag-ops-dispute" data-oid="' + esc(o.id) + '" style="font-family:Cairo,sans-serif;font-size:12px;font-weight:800;padding:7px 10px;border-radius:8px;border:1px solid rgba(220,38,38,.35);background:#fff5f5;color:#b91c1c;cursor:pointer">' + (isFr() ? 'Signaler un problème' : 'إبلاغ عن مشكلة') + '</button>' : '') +
      '</div></div>'
    );
  }

  global.RizqOps = {
    apiBase: apiBase,
    statusLabel: statusLabel,
    STATUS_AR: STATUS_AR,
    createOrder: createOrder,
    listBuyerOrders: listBuyerOrders,
    listSellerOrders: listSellerOrders,
    patchOrderStatus: patchOrderStatus,
    cancelOrder: cancelOrder,
    disputeOrder: disputeOrder,
    reviewPayment: reviewPayment,
    sellerMetrics: sellerMetrics,
    adminMetrics: adminMetrics,
    listDisputed: listDisputed,
    resolveDispute: resolveDispute,
    unifiedSearch: unifiedSearch,
    renderSearchCards: renderSearchCards,
    exportMyData: exportMyData,
    eraseMyAccount: eraseMyAccount,
    listAlerts: listAlerts,
    enablePush: enablePush,
    disablePush: disablePush,
    orderCardHtml: orderCardHtml,
    esc: esc
  };
})(typeof window !== 'undefined' ? window : globalThis);
