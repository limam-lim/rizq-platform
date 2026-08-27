/**
 * rizq_account_payments.js — subscriber payment methods (store/office/corp)
 * Syncs owner-configured Bankily/Sedad/bank details to accounts.json via PATCH,
 * and renders them on public store/office pages for buyers.
 */
(function (global) {
  'use strict';

  var ALLOWED_TYPES = ['bank', 'bankily', 'sedad', 'bimbam', 'mobile', 'cash', 'instore', 'custom'];

  function localKey(accountId) {
    return 'rizq_my_payments_' + (accountId || 'demo');
  }

  function normalizeMethods(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 10).map(function (m) {
      var type = ALLOWED_TYPES.indexOf(m && m.type) >= 0 ? m.type : 'bank';
      return {
        type: type,
        bank: String((m && m.bank) || '').slice(0, 120),
        code: String((m && m.code) || '').slice(0, 120),
        note: String((m && m.note) || '').slice(0, 300),
        addedAt: String((m && m.addedAt) || new Date().toISOString()).slice(0, 30),
      };
    }).filter(function (m) {
      return m.bank || m.type === 'cash' || m.type === 'instore';
    });
  }

  function getLocal(accountId, isDemo, demoArr) {
    if (isDemo) return demoArr || [];
    try {
      return JSON.parse(localStorage.getItem(localKey(accountId)) || '[]');
    } catch (e) {
      return [];
    }
  }

  function setLocal(accountId, methods) {
    localStorage.setItem(localKey(accountId), JSON.stringify(methods));
  }

  function syncFromBackend(accountId, accessToken) {
    if (!accountId || !accessToken || !global.RIZQ_BACKEND_BASE) {
      return Promise.resolve(null);
    }
    return fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/accounts/mine/' + encodeURIComponent(accountId), {
      headers: { 'x-account-token': accessToken },
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !data.account) return null;
        var methods = normalizeMethods(data.account.paymentMethods || []);
        setLocal(accountId, methods);
        return methods;
      })
      .catch(function () { return null; });
  }

  function persist(accountId, methods, accessToken, isDemo) {
    var normalized = normalizeMethods(methods);
    if (isDemo) return Promise.resolve(normalized);
    setLocal(accountId, normalized);
    if (!accountId || !accessToken || !global.RIZQ_BACKEND_BASE) {
      return Promise.resolve(normalized);
    }
    return fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/accounts/mine/' + encodeURIComponent(accountId), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-account-token': accessToken,
      },
      body: JSON.stringify({ paymentMethods: normalized }),
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && data.ok && data.account && Array.isArray(data.account.paymentMethods)) {
          var synced = normalizeMethods(data.account.paymentMethods);
          setLocal(accountId, synced);
          return synced;
        }
        return normalized;
      })
      .catch(function () { return normalized; });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function typeLabel(type, fr) {
    var map = {
      bank: fr ? '🏦 Bank transfer' : '🏦 تحويل بنكي',
      bankily: fr ? '📱 Bankily' : '📱 بنكيلي',
      sedad: fr ? '📱 Sedad' : '📱 سداد',
      bimbam: fr ? '📱 Bimbam' : '📱 بيماه',
      mobile: fr ? '📱 Mobile wallet' : '📱 محفظة رقمية',
      cash: fr ? '💵 Cash on delivery' : '💵 الدفع عند الاستلام',
      instore: fr ? '🏪 Pay in store' : '🏪 الدفع في المحل',
      custom: fr ? '✏️ Other' : '✏️ مخصص',
    };
    return map[type] || (fr ? '💳 Payment' : '💳 دفع');
  }

  function renderPublic(container, methods, opts) {
    if (!container) return;
    opts = opts || {};
    var fr = !!opts.fr;
    var list = normalizeMethods(methods || []);
    if (!list.length) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    container.style.display = '';
    var title = fr ? '💳 Payment options' : '💳 طرق الدفع المتاحة';
    var hint = fr
      ? 'Use one of the methods below to pay the seller directly.'
      : 'استخدم إحدى الطرق أدناه للدفع مباشرة للبائع/مقدم الخدمة.';
    var cards = list.map(function (m) {
      var showCode = m.type === 'bank' || m.type === 'mobile' || m.type === 'custom'
        || m.type === 'bankily' || m.type === 'sedad' || m.type === 'bimbam';
      return '<div style="background:#fff;border:1.5px solid rgba(27,58,107,.12);border-radius:10px;padding:12px 14px;margin-bottom:8px">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'
        + '<div><div style="font-size:13px;font-weight:800;color:#1B3A6B">' + esc(m.bank || typeLabel(m.type, fr)) + '</div>'
        + '<div style="font-size:11px;color:#6a7a8a;margin-top:2px">' + esc(typeLabel(m.type, fr)) + '</div>'
        + (m.note ? '<div style="font-size:11px;color:#4a5568;margin-top:4px;line-height:1.5">' + esc(m.note) + '</div>' : '')
        + '</div>'
        + (showCode && m.code
          ? '<span style="font-family:monospace;font-size:14px;font-weight:800;color:#0f2347;background:#e8f0fe;padding:6px 12px;border-radius:8px;direction:ltr;letter-spacing:.4px">' + esc(m.code) + '</span>'
          : '')
        + '</div></div>';
    }).join('');
    container.innerHTML = '<div style="font-size:13px;font-weight:800;color:#1B3A6B;margin-bottom:8px">' + title + '</div>'
      + '<div style="font-size:12px;color:#6a7a8a;margin-bottom:10px;line-height:1.55">' + hint + '</div>'
      + cards;
  }

  function afterPlatformBankCodesSynced() {
    try {
      if (typeof renderRizqPayment === 'function') {
        ['bank-payment-widget', 'rzq-pay-section', 'rzq-pay-sub'].forEach(function (id) {
          if (document.getElementById(id)) renderRizqPayment(id);
        });
      }
    } catch (e) { /* ignore */ }
  }

  global.RizqAccountPayments = {
    localKey: localKey,
    normalize: normalizeMethods,
    getLocal: getLocal,
    setLocal: setLocal,
    syncFromBackend: syncFromBackend,
    persist: persist,
    renderPublic: renderPublic,
    afterPlatformBankCodesSynced: afterPlatformBankCodesSynced,
  };
})(typeof window !== 'undefined' ? window : globalThis);
