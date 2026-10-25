/**
 * rizq_passkey.js — عميل WebAuthn / Passkeys (بصمة · Face ID · Touch ID)
 * يعتمد navigator.credentials الأصلي — بلا حزمة npm على الواجهة.
 */
(function (global) {
  'use strict';
  if (global.RizqPasskey) return;

  function apiBase() {
    return global.RIZQ_BACKEND_BASE ? String(global.RIZQ_BACKEND_BASE).replace(/\/$/, '') : '';
  }

  function supported() {
    try {
      return !!(
        global.window
        && global.window.PublicKeyCredential
        && typeof global.navigator.credentials !== 'undefined'
        && typeof global.navigator.credentials.create === 'function'
        && typeof global.navigator.credentials.get === 'function'
      );
    } catch (e) {
      return false;
    }
  }

  function b64urlToBuf(b64url) {
    var s = String(b64url || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s);
    var buf = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  function bufToB64url(buf) {
    var bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf.buffer || buf);
    var str = '';
    for (var i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function publicKeyCredentialToJSON(cred) {
    if (!cred) return null;
    var response = cred.response;
    var out = {
      id: cred.id,
      rawId: bufToB64url(cred.rawId),
      type: cred.type,
      clientExtensionResults: cred.getClientExtensionResults ? cred.getClientExtensionResults() : {},
      response: {},
    };
    if (response.clientDataJSON) out.response.clientDataJSON = bufToB64url(response.clientDataJSON);
    if (response.attestationObject) out.response.attestationObject = bufToB64url(response.attestationObject);
    if (response.authenticatorData) out.response.authenticatorData = bufToB64url(response.authenticatorData);
    if (response.signature) out.response.signature = bufToB64url(response.signature);
    if (response.userHandle) out.response.userHandle = bufToB64url(response.userHandle);
    if (typeof response.getTransports === 'function') {
      try { out.response.transports = response.getTransports(); } catch (e) {}
    }
    if (cred.authenticatorAttachment) out.authenticatorAttachment = cred.authenticatorAttachment;
    return out;
  }

  function prepareCreateOptions(options) {
    var o = JSON.parse(JSON.stringify(options || {}));
    o.challenge = b64urlToBuf(o.challenge);
    if (o.user && o.user.id) o.user.id = b64urlToBuf(o.user.id);
    if (Array.isArray(o.excludeCredentials)) {
      o.excludeCredentials = o.excludeCredentials.map(function (c) {
        return Object.assign({}, c, { id: b64urlToBuf(c.id) });
      });
    }
    return o;
  }

  function prepareGetOptions(options) {
    var o = JSON.parse(JSON.stringify(options || {}));
    o.challenge = b64urlToBuf(o.challenge);
    if (Array.isArray(o.allowCredentials)) {
      o.allowCredentials = o.allowCredentials.map(function (c) {
        return Object.assign({}, c, { id: b64urlToBuf(c.id) });
      });
    }
    return o;
  }

  function fetchJson(url, opts) {
    opts = opts || {};
    opts.credentials = 'include';
    if (!opts.headers) opts.headers = {};
    if (!opts.headers['Content-Type'] && opts.body) {
      opts.headers['Content-Type'] = 'application/json';
    }
    return fetch(url, opts).then(function (res) {
      return res.json().then(function (body) {
        return { ok: res.ok, status: res.status, body: body };
      }).catch(function () {
        return { ok: false, status: res.status, body: null };
      });
    });
  }

  function buyerHeaders() {
    var h = { 'Content-Type': 'application/json' };
    try {
      if (global.RizqAuthGate && typeof global.RizqAuthGate.getSession === 'function') {
        var s = global.RizqAuthGate.getSession();
        if (s && s.token && s.id) {
          h.Authorization = 'Bearer ' + s.token;
          h['X-Buyer-Id'] = s.id;
        }
      }
    } catch (e) {}
    return h;
  }

  function sellerHeaders(accountId, token) {
    var h = { 'Content-Type': 'application/json' };
    var tok = token || '';
    if (!tok && global.RizqAccount && accountId && typeof global.RizqAccount.readDashToken === 'function') {
      try { tok = global.RizqAccount.readDashToken(accountId) || ''; } catch (e) {}
    }
    if (!tok) {
      try { tok = sessionStorage.getItem('rizq_dash_token_' + accountId) || ''; } catch (e2) {}
    }
    if (!tok && global.RizqDash && typeof global.RizqDash.readEphemeralAccessToken === 'function') {
      try { tok = global.RizqDash.readEphemeralAccessToken(accountId) || ''; } catch (e3) {}
    }
    if (tok) {
      h['x-account-token'] = tok;
      h['x-dash-token'] = tok;
    }
    return h;
  }

  function registerBuyer(friendlyName) {
    if (!supported()) return Promise.reject(new Error('unsupported'));
    var base = apiBase();
    if (!base) return Promise.reject(new Error('no_backend'));
    return fetchJson(base + '/api/auth/passkey/register-options', {
      method: 'POST',
      headers: buyerHeaders(),
      body: JSON.stringify({ kind: 'buyer' }),
    }).then(function (r) {
      if (!r.ok || !r.body || !r.body.options) {
        throw Object.assign(new Error((r.body && (r.body.message || r.body.error)) || 'options_failed'), { body: r.body });
      }
      return navigator.credentials.create({ publicKey: prepareCreateOptions(r.body.options) });
    }).then(function (cred) {
      if (!cred) throw new Error('cancelled');
      return fetchJson(base + '/api/auth/passkey/verify-registration', {
        method: 'POST',
        headers: buyerHeaders(),
        body: JSON.stringify({
          kind: 'buyer',
          friendlyName: friendlyName || '',
          response: publicKeyCredentialToJSON(cred),
        }),
      });
    }).then(function (r2) {
      if (!r2.ok || !r2.body || !r2.body.ok) {
        throw Object.assign(new Error((r2.body && (r2.body.message || r2.body.error)) || 'verify_failed'), { body: r2.body });
      }
      return r2.body;
    });
  }

  function registerSeller(accountId, token, friendlyName) {
    if (!supported()) return Promise.reject(new Error('unsupported'));
    var base = apiBase();
    if (!base || !accountId) return Promise.reject(new Error('no_backend'));
    var headers = sellerHeaders(accountId, token);
    return fetchJson(base + '/api/auth/passkey/register-options', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ kind: 'seller', accountId: accountId }),
    }).then(function (r) {
      if (!r.ok || !r.body || !r.body.options) {
        throw Object.assign(new Error((r.body && (r.body.message || r.body.error)) || 'options_failed'), { body: r.body });
      }
      return navigator.credentials.create({ publicKey: prepareCreateOptions(r.body.options) });
    }).then(function (cred) {
      if (!cred) throw new Error('cancelled');
      return fetchJson(base + '/api/auth/passkey/verify-registration', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          kind: 'seller',
          accountId: accountId,
          friendlyName: friendlyName || '',
          response: publicKeyCredentialToJSON(cred),
        }),
      });
    }).then(function (r2) {
      if (!r2.ok || !r2.body || !r2.body.ok) {
        throw Object.assign(new Error((r2.body && (r2.body.message || r2.body.error)) || 'verify_failed'), { body: r2.body });
      }
      return r2.body;
    });
  }

  function login(opts) {
    opts = opts || {};
    if (!supported()) return Promise.reject(new Error('unsupported'));
    var base = apiBase();
    if (!base) return Promise.reject(new Error('no_backend'));
    var kind = opts.kind || 'any';
    var email = opts.email || '';
    return fetchJson(base + '/api/auth/passkey/login-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: kind, email: email }),
    }).then(function (r) {
      if (!r.ok || !r.body || !r.body.options) {
        throw Object.assign(new Error((r.body && (r.body.message || r.body.error)) || 'options_failed'), { body: r.body });
      }
      return navigator.credentials.get({ publicKey: prepareGetOptions(r.body.options) });
    }).then(function (cred) {
      if (!cred) throw new Error('cancelled');
      return fetchJson(base + '/api/auth/passkey/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: publicKeyCredentialToJSON(cred) }),
      });
    }).then(function (r2) {
      if (!r2.ok || !r2.body || !r2.body.ok) {
        throw Object.assign(new Error((r2.body && (r2.body.message || r2.body.error)) || 'login_failed'), { body: r2.body });
      }
      return r2.body;
    });
  }

  function listBuyer() {
    var base = apiBase();
    if (!base) return Promise.resolve([]);
    return fetchJson(base + '/api/auth/passkey/list?kind=buyer', {
      method: 'GET',
      headers: buyerHeaders(),
    }).then(function (r) {
      return (r.ok && r.body && Array.isArray(r.body.passkeys)) ? r.body.passkeys : [];
    }).catch(function () { return []; });
  }

  global.RizqPasskey = {
    supported: supported,
    registerBuyer: registerBuyer,
    registerSeller: registerSeller,
    login: login,
    listBuyer: listBuyer,
    publicKeyCredentialToJSON: publicKeyCredentialToJSON,
  };
})(typeof window !== 'undefined' ? window : globalThis);
