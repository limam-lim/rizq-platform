/**
 * مهلات وإعادة محاولة محدودة لاتصالات خارجية (Claude / FB / Telegram / SMTP / صور…).
 * الافتراضي 15 ثانية — قابل للضبط عبر EXTERNAL_HTTP_TIMEOUT_MS أو *_TIMEOUT_MS.
 */
'use strict';

function envInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function getExternalTimeoutMs(service) {
  const key = service ? String(service).toUpperCase() + '_TIMEOUT_MS' : '';
  if (key && process.env[key]) return envInt(key, 15000);
  return envInt('EXTERNAL_HTTP_TIMEOUT_MS', 15000);
}

function getExternalMaxRetries(service) {
  const key = service ? String(service).toUpperCase() + '_MAX_RETRIES' : '';
  if (key && process.env[key] != null && process.env[key] !== '') {
    const n = Number(process.env[key]);
    return Number.isFinite(n) && n >= 0 ? Math.min(5, Math.floor(n)) : 1;
  }
  return envInt('EXTERNAL_HTTP_MAX_RETRIES', 1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * fetch مع AbortSignal.timeout وإعادة محاولة محدودة على أخطاء الشبكة/5xx.
 * @param {string} url
 * @param {RequestInit & { service?: string, timeoutMs?: number, maxRetries?: number }} [opts]
 */
async function fetchWithTimeout(url, opts) {
  opts = opts || {};
  const service = opts.service || 'http';
  const timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : getExternalTimeoutMs(service);
  const maxRetries = opts.maxRetries != null ? opts.maxRetries : getExternalMaxRetries(service);
  const init = Object.assign({}, opts);
  delete init.service;
  delete init.timeoutMs;
  delete init.maxRetries;

  let lastErr = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, Object.assign({}, init, {
        signal: init.signal || (ctrl && ctrl.signal),
      }));
      if (timer) clearTimeout(timer);
      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(200 * (attempt + 1));
        continue;
      }
      return res;
    } catch (err) {
      if (timer) clearTimeout(timer);
      lastErr = err;
      if (attempt >= maxRetries) break;
      await sleep(200 * (attempt + 1));
    }
  }
  const e = lastErr || new Error('external_http_failed');
  e.code = e.code || 'external_timeout';
  e.service = service;
  throw e;
}

/** خيارات nodemailer connection/socket timeout */
function smtpTransportTimeouts(service) {
  const ms = getExternalTimeoutMs(service || 'smtp');
  return {
    connectionTimeout: ms,
    greetingTimeout: ms,
    socketTimeout: ms,
  };
}

/** جلب صورة/ملف ثنائي بمهلة محدودة (CDN / روابط خارجية) */
async function fetchBinaryWithTimeout(url, opts) {
  opts = opts || {};
  const res = await fetchWithTimeout(url, Object.assign({
    service: opts.service || 'images',
    timeoutMs: opts.timeoutMs,
    maxRetries: opts.maxRetries,
  }, opts.headers ? { headers: opts.headers } : {}));
  if (!res.ok) {
    const err = new Error('fetch_binary_http_' + res.status);
    err.status = res.status;
    throw err;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { buffer: buf, contentType: res.headers.get('content-type') || '', status: res.status };
}

module.exports = {
  getExternalTimeoutMs,
  getExternalMaxRetries,
  fetchWithTimeout,
  fetchBinaryWithTimeout,
  smtpTransportTimeouts,
};
