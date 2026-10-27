/**
 * استخراج توكن الحساب — في الإنتاج: رأس فقط (لا query string)
 * dashToken يُقبل كدليل ملكية على مسارات المالك حتى لا نحتاج لإرجاع accessToken
 * من verify-dash (تصعيد صلاحيات عبر رابط الداشبورد).
 */
'use strict';

const { timingSafeEqualStr } = require('../lib/secureCompare');

function isProdEnv() {
  return process.env.NODE_ENV === 'production' || process.env.RIZQ_ENV === 'production';
}

function extractAccountToken(req) {
  const header = String(req.header('x-account-token') || '').trim();
  if (header) return header;
  if (!isProdEnv()) {
    const q = req.query && req.query.token;
    return q ? String(q).trim() : '';
  }
  return '';
}

function extractDashToken(req) {
  const header = String(req.header('x-dash-token') || '').trim();
  if (header) return header;
  const body = req.body || {};
  // الداشبوردات ترسل dashToken — نقبل token أيضاً للتوافق دون كسر المسار الحالي
  const fromBody = body.dashToken || body.token;
  if (fromBody) return String(fromBody).trim();
  if (!isProdEnv() && req.query && req.query.token) {
    return String(req.query.token).trim();
  }
  return '';
}

function getAccessTokenTtlMs() {
  const days = Number(process.env.ACCESS_TOKEN_TTL_DAYS || 14);
  return Math.max(1, Number.isFinite(days) ? days : 14) * 86400000;
}

function getDashTokenTtlMs() {
  const days = Number(process.env.DASH_TOKEN_TTL_DAYS || 30);
  return Math.max(1, Number.isFinite(days) ? days : 30) * 86400000;
}

function _expiryStillValid(iso) {
  if (!iso) return true; /* توكنات قديمة بلا expiry تبقى حتى أول تدوير */
  const t = Date.parse(String(iso));
  if (!Number.isFinite(t)) return true;
  return t > Date.now();
}

function accessTokenStillValid(acc) {
  return !!(acc && acc.accessToken && _expiryStillValid(acc.accessTokenExpiresAt));
}

function dashTokenStillValid(acc) {
  return !!(acc && acc.dashToken && _expiryStillValid(acc.dashTokenExpiresAt));
}

/** يختم accessToken جديد + تاريخ انتهاء */
function stampAccessToken(acc, genAccessToken) {
  if (!acc || typeof genAccessToken !== 'function') return acc;
  acc.accessToken = genAccessToken();
  acc.accessTokenExpiresAt = new Date(Date.now() + getAccessTokenTtlMs()).toISOString();
  return acc;
}

/** يختم dashToken جديد + تاريخ انتهاء */
function stampDashToken(acc, genDashToken) {
  if (!acc || typeof genDashToken !== 'function') return acc;
  acc.dashToken = genDashToken();
  acc.dashTokenExpiresAt = new Date(Date.now() + getDashTokenTtlMs()).toISOString();
  return acc;
}

/** يطابق accessToken أو dashToken لنفس الحساب (كلاهما يثبت الملكية) مع احترام TTL. */
function tokenMatchesAccount(acc, token) {
  if (!acc || !token) return false;
  const t = String(token).trim();
  if (!t) return false;
  if (acc.accessToken && timingSafeEqualStr(t, acc.accessToken)) {
    return accessTokenStillValid(acc);
  }
  if (acc.dashToken && timingSafeEqualStr(t, acc.dashToken)) {
    return dashTokenStillValid(acc);
  }
  return false;
}

/** حساب معتمد وغير معلّق — شرط مشترك لمسارات المالك. */
function isAccountActive(acc) {
  return !!(acc && acc.status === 'approved' && !acc.suspended);
}

/** ملكية فعّالة: حساب نشط + توكن مطابق (access أو dash). */
function activeOwnerMatches(acc, token) {
  return isAccountActive(acc) && tokenMatchesAccount(acc, token);
}

/** طلب يبدو من متصفح (Origin / Sec-Fetch-Site) — لرفض الأسرار الخادمية في الإنتاج. */
function isBrowserOrigin(req) {
  const origin = req && req.header ? req.header('origin') : '';
  if (origin && origin !== 'null') return true;
  const secFetchSite = String((req && req.header && req.header('sec-fetch-site')) || '').toLowerCase();
  return secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'cross-site';
}

module.exports = {
  isProdEnv,
  extractAccountToken,
  extractDashToken,
  tokenMatchesAccount,
  isAccountActive,
  activeOwnerMatches,
  isBrowserOrigin,
  getAccessTokenTtlMs,
  getDashTokenTtlMs,
  accessTokenStillValid,
  dashTokenStillValid,
  stampAccessToken,
  stampDashToken,
};
