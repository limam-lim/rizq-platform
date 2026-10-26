'use strict';

const COOKIE_ID = 'rizq_buyer_id';
const COOKIE_TOKEN = 'rizq_buyer_token';
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 يوم

function parseCookies(req) {
  const raw = String((req && req.headers && req.headers.cookie) || '');
  const out = Object.create(null);
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function cookieFlags(req) {
  const secure = !!(req.secure || String(req.headers['x-forwarded-proto'] || '') === 'https');
  return 'Path=/; HttpOnly; SameSite=Lax; Max-Age=' + MAX_AGE_SEC + (secure ? '; Secure' : '');
}

function clearFlags(req) {
  const secure = !!(req.secure || String(req.headers['x-forwarded-proto'] || '') === 'https');
  return 'Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + (secure ? '; Secure' : '');
}

/** اضبط كوكي جلسة المشتري (إلى جانب التوكن في JSON للتوافق) */
function setBuyerSessionCookies(req, res, buyerId, token) {
  if (!res || !buyerId || !token) return;
  const flags = cookieFlags(req);
  const prev = res.getHeader('Set-Cookie');
  const next = [
    COOKIE_ID + '=' + encodeURIComponent(String(buyerId)) + '; ' + flags,
    COOKIE_TOKEN + '=' + encodeURIComponent(String(token)) + '; ' + flags,
  ];
  if (!prev) res.setHeader('Set-Cookie', next);
  else res.setHeader('Set-Cookie', [].concat(prev, next));
}

function clearBuyerSessionCookies(req, res) {
  if (!res) return;
  const flags = clearFlags(req);
  const prev = res.getHeader('Set-Cookie');
  const next = [
    COOKIE_ID + '=; ' + flags,
    COOKIE_TOKEN + '=; ' + flags,
  ];
  if (!prev) res.setHeader('Set-Cookie', next);
  else res.setHeader('Set-Cookie', [].concat(prev, next));
}

function readBuyerSessionCookies(req) {
  const c = parseCookies(req);
  return {
    id: String(c[COOKIE_ID] || '').trim(),
    token: String(c[COOKIE_TOKEN] || '').trim(),
  };
}

module.exports = {
  COOKIE_ID,
  COOKIE_TOKEN,
  setBuyerSessionCookies,
  clearBuyerSessionCookies,
  readBuyerSessionCookies,
};
