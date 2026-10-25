/**
 * جلسة المشتري في كوكي HttpOnly — لا تُقرأ من JavaScript الصفحة.
 */
'use strict';

const { isProdEnv } = require('../middleware/accountAuth');

const COOKIE_NAME = 'rizq_buyer';
const MAX_AGE_SEC = 30 * 24 * 60 * 60;

function useCrossSiteCookie() {
  const v = String(process.env.BUYER_COOKIE_SAMESITE || process.env.COOKIE_SAMESITE || '').toLowerCase();
  if (v === 'none') return true;
  if (v === 'lax' || v === 'strict') return false;
  // الإنتاج: الواجهة والخادم غالباً على نطاقين مع CORS credentials
  return isProdEnv();
}

function cookieFlags() {
  const cross = useCrossSiteCookie();
  const secure = isProdEnv() || cross || process.env.BUYER_COOKIE_SECURE === 'true';
  const sameSite = cross ? 'None' : 'Lax';
  return [
    'Path=/',
    'HttpOnly',
    'SameSite=' + sameSite,
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

function encodeSession(id, token) {
  return encodeURIComponent(String(id || '')) + '.' + encodeURIComponent(String(token || ''));
}

function decodeSession(raw) {
  if (!raw) return null;
  let decoded = String(raw);
  try {
    decoded = decodeURIComponent(decoded);
  } catch (e) {}
  const dot = decoded.indexOf('.');
  if (dot < 1) return null;
  const id = decoded.slice(0, dot).trim();
  const token = decoded.slice(dot + 1).trim();
  if (!id || !token || token.length < 20) return null;
  return { id, token };
}

function parseCookieHeader(header) {
  const out = {};
  String(header || '').split(';').forEach(function (part) {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = v;
  });
  return out;
}

function readBuyerSessionFromRequest(req) {
  const cookies = parseCookieHeader(req && req.headers && req.headers.cookie);
  return decodeSession(cookies[COOKIE_NAME]);
}

function setBuyerSessionCookie(res, id, token) {
  if (!res || !id || !token) return;
  const value = encodeSession(id, token);
  res.append('Set-Cookie', COOKIE_NAME + '=' + value + '; Max-Age=' + MAX_AGE_SEC + '; ' + cookieFlags());
}

function clearBuyerSessionCookie(res) {
  if (!res) return;
  const cross = useCrossSiteCookie();
  const secure = isProdEnv() || cross || process.env.BUYER_COOKIE_SECURE === 'true';
  const sameSite = cross ? 'None' : 'Lax';
  const flags = ['Path=/', 'HttpOnly', 'SameSite=' + sameSite, 'Max-Age=0'];
  if (secure) flags.push('Secure');
  res.append('Set-Cookie', COOKIE_NAME + '=; ' + flags.join('; '));
}

module.exports = {
  COOKIE_NAME,
  readBuyerSessionFromRequest,
  setBuyerSessionCookie,
  clearBuyerSessionCookie,
  decodeSession,
};
