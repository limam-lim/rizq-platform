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
      if (session && (session.accountId || session.id) && (session.accessToken || session.token)) {
        return {
          accountId: session.accountId || session.id,
          accessToken: session.accessToken || session.token
        };
      }
      var ind = JSON.parse(localStorage.getItem('rizq_individual_session') || 'null');
      if (ind && (ind.accountId || ind.id) && (ind.accessToken || ind.token)) {
        return {
          accountId: ind.accountId || ind.id,
          accessToken: ind.accessToken || ind.token
        };
      }
      var dash = JSON.parse(localStorage.getItem('rizq_dashboard_session') || 'null');
      if (dash && dash.id && dash.accessToken) {
        return { accountId: dash.id, accessToken: dash.accessToken };
      }
    } catch (e) { /* ignore */ }
    /* جلسة المشتري عبر بوابة المصادقة */
    try {
      if (global.RizqAuthGate && typeof global.RizqAuthGate.isLoggedIn === 'function' && global.RizqAuthGate.isLoggedIn()) {
        var s = typeof global.RizqAuthGate.getSession === 'function' ? global.RizqAuthGate.getSession() : null;
        if (s && s.id && s.token) return { accountId: s.id, accessToken: s.token };
        return { accountId: 'buyer', accessToken: 'session' };
      }
    } catch (e2) { /* ignore */ }
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
    var creds = getViewerCredentials();
    var isPromo = false;
    try {
      if (typeof global.rizqIsPromoDemo === 'function') isPromo = !!global.rizqIsPromoDemo();
      else if (global.RizqAuthGate && typeof global.RizqAuthGate.isPromoDemoContext === 'function') {
        isPromo = !!global.RizqAuthGate.isPromoDemoContext();
      } else if (/[?&]demo=1(?:&|$)/.test(String((global.location && global.location.search) || ''))) {
        isPromo = true;
      }
    } catch (ePromo) {}
    /* النماذج الترويجية: لا تطلب تسجيلاً */
    if (isPromo) {
      return Promise.resolve({ ok: true, access: { lockReason: 'demo', contactsLocked: false } });
    }
    /* زائر بدون حساب على صفحة حقيقية: اطلب تسجيل الدخول */
    if (!creds && typeof global.rizqRequireAuth === 'function') {
      global.rizqRequireAuth(function () {
        if (typeof opts.onAuthed === 'function') opts.onAuthed();
        else if (typeof global.location !== 'undefined') global.location.reload();
      }, opts.reasonKey || 'reasonPhone');
      return Promise.resolve({ ok: false, access: { lockReason: 'unauthenticated', contactsLocked: true } });
    }
    return reportContactAttempt(targetAccountId, module, opts).then(function (res) {
      var access = res && res.access ? res.access : {};
      var msg = fr
        ? 'Coordonnées masquées — le commerçant doit activer un forfait.'
        : 'رقم التواصل غير متاح حالياً — يجب على التاجر تفعيل باقة اشتراك.';
      if (access.lockReason === 'expired' || access.lockReason === 'no_subscription' || access.lockReason === 'pending' || access.lockReason === 'suspended') {
        msg = fr
          ? 'Numéro de contact indisponible pour le moment — forfait commerçant requis.'
          : 'رقم التواصل غير متاح حالياً — يلزم تفعيل باقة للتاجر.';
      } else if (access.lockReason === 'unauthenticated') {
        msg = fr
          ? 'Connectez-vous avec un compte Rizq pour voir les coordonnées du commerçant.'
          : 'سجّل دخولك بحساب على رزق لعرض بيانات التواصل مع التاجر.';
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

  function trackContactClick(targetAccountId, adId, type) {
    try {
      if (/[?&]demo=1(?:&|$)/.test(String((global.location && global.location.search) || ''))) {
        return;
      }
    } catch (eDemo) {}
    var base = getBackendBase();
    if (!base || !targetAccountId) return;
    var creds = getViewerCredentials();
    if (creds && creds.accountId && String(creds.accountId) === String(targetAccountId)) return;
    var payload = JSON.stringify({
      targetAccountId: String(targetAccountId).slice(0, 40),
      adId: adId ? String(adId).slice(0, 80) : '',
      type: String(type || '').toLowerCase(),
    });
    var url = base + '/api/contact-click';
    var headers = { 'Content-Type': 'application/json' };
    if (creds) {
      headers['x-account-id'] = creds.accountId;
      headers['x-account-token'] = creds.accessToken;
    }
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) return;
      }
    } catch (eBeacon) {}
    try {
      fetch(url, { method: 'POST', headers: headers, body: payload, keepalive: true, credentials: 'omit' }).catch(function () {});
    } catch (eFetch) {}
  }

  function bindContactClickDelegation(root) {
    var scope = root || document;
    if (!scope || scope.__rizqContactClickBound) return;
    scope.__rizqContactClickBound = true;
    scope.addEventListener('click', function (ev) {
      var el = ev.target && ev.target.closest ? ev.target.closest('[data-rizq-contact]') : null;
      if (!el) return;
      var type = el.getAttribute('data-rizq-contact');
      var accountId = el.getAttribute('data-account') || '';
      var adId = el.getAttribute('data-ad') || '';
      if (!type || !accountId) return;
      trackContactClick(accountId, adId, type);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { bindContactClickDelegation(document); });
  } else {
    bindContactClickDelegation(document);
  }

  global.RizqContactGate = {
    getViewerCredentials: getViewerCredentials,
    authHeaders: authHeaders,
    fetchAccess: fetchAccess,
    reportContactAttempt: reportContactAttempt,
    onMaskedContactClick: onMaskedContactClick,
    applySellerContactToAd: applySellerContactToAd,
    trackContactClick: trackContactClick,
    bindContactClickDelegation: bindContactClickDelegation,
  };
  global.trackContactClick = trackContactClick;
})(typeof window !== 'undefined' ? window : globalThis);
