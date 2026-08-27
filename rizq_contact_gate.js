/**
 * rizq_contact_gate.js — Client UX for Contact Gate (server is source of truth)
 * © Rizq ADMINIA SARL — Proprietary & Confidential
 */
(function (global) {
  'use strict';

  function getBackendBase() {
    return (global.RIZQ_BACKEND_BASE || '').replace(/\/$/, '');
  }

  function getViewerCredentials() {
    try {
      var session = JSON.parse(localStorage.getItem('rizq_session') || 'null');
      if (session && session.accountId && session.accessToken) {
        return { accountId: session.accountId, accessToken: session.accessToken };
      }
      var dash = JSON.parse(localStorage.getItem('rizq_dashboard_session') || 'null');
      if (dash && dash.id && dash.accessToken) {
        return { accountId: dash.id, accessToken: dash.accessToken };
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function authHeaders(extra) {
    var creds = getViewerCredentials();
    var h = Object.assign({}, extra || {});
    if (creds) {
      h['x-account-id'] = creds.accountId;
      h['x-account-token'] = creds.accessToken;
    }
    return h;
  }

  function fetchAccess(targetAccountId, module) {
    var base = getBackendBase();
    if (!base || !targetAccountId) return Promise.resolve({ contactsLocked: true, lockReason: 'offline' });
    var url = base + '/api/contact-gate/status?targetAccountId=' + encodeURIComponent(targetAccountId)
      + '&module=' + encodeURIComponent(module || 'individual');
    return fetch(url, { headers: authHeaders() })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { return (data && data.access) ? data.access : { contactsLocked: true, lockReason: 'error' }; })
      .catch(function () { return { contactsLocked: true, lockReason: 'offline' }; });
  }

  function reportContactAttempt(targetAccountId, module, opts) {
    opts = opts || {};
    var base = getBackendBase();
    if (!base || !targetAccountId) return Promise.resolve({ ok: false });
    return fetch(base + '/api/contact-gate/attempt', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        targetAccountId: targetAccountId,
        module: module || 'individual',
        lang: opts.lang || (global.RizqI18n && RizqI18n.getLang ? RizqI18n.getLang() : 'ar'),
        contextType: opts.contextType || 'contact_click',
      }),
    }).then(function (r) { return r.ok ? r.json() : { ok: false }; })
      .catch(function () { return { ok: false }; });
  }

  function onMaskedContactClick(targetAccountId, module, opts) {
    opts = opts || {};
    var fr = opts.lang === 'fr';
    return reportContactAttempt(targetAccountId, module, opts).then(function (res) {
      var access = res && res.access ? res.access : {};
      var msg = fr
        ? 'Coordonnées masquées — abonnement actif requis pour débloquer les contacts.'
        : 'بيانات التواصل مخفية — يلزم اشتراك مدفوع نشط لفتح التواصل.';
      if (access.lockReason === 'trial') {
        msg = fr ? 'Période d\'essai — les contacts restent masqués.' : 'فترة تجريبية — بيانات التواصل مخفية.';
      } else if (access.lockReason === 'expired') {
        msg = fr ? 'Abonnement expiré — renouvelez pour recevoir des clients.' : 'انتهى الاشتراك — جدّد لاستقبال العملاء.';
      } else if (access.lockReason === 'unauthenticated') {
        msg = fr ? 'Connectez-vous puis souscrivez pour voir les coordonnées.' : 'سجّل دخولك واشترك لعرض بيانات التواصل.';
      }
      if (typeof opts.onMessage === 'function') opts.onMessage(msg, res);
      else if (typeof global.showToast === 'function') global.showToast(msg, 'info');
      else alert(msg);
      return res;
    });
  }

  function applySellerContactToAd(mapped, rawAd) {
    if (!mapped || !rawAd) return mapped;
    mapped.contactsLocked = !!rawAd.contactsLocked;
    mapped.contactAccess = rawAd.contactAccess || null;
    if (rawAd.sellerContact && !rawAd.contactsLocked) {
      mapped.phone = rawAd.sellerContact.phone || rawAd.sellerContact.whatsapp || '';
      mapped.email = rawAd.sellerContact.email || '';
      mapped.whatsapp = rawAd.sellerContact.whatsapp || '';
    } else {
      mapped.phone = '';
      mapped.email = '';
      mapped.whatsapp = '';
    }
    return mapped;
  }

  global.RizqContactGate = {
    getViewerCredentials: getViewerCredentials,
    authHeaders: authHeaders,
    fetchAccess: fetchAccess,
    reportContactAttempt: reportContactAttempt,
    onMaskedContactClick: onMaskedContactClick,
    applySellerContactToAd: applySellerContactToAd,
  };
})(typeof window !== 'undefined' ? window : globalThis);
