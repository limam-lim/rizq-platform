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

/** يطابق accessToken أو dashToken لنفس الحساب (كلاهما يثبت الملكية). */
function tokenMatchesAccount(acc, token) {
  if (!acc || !token) return false;
  const t = String(token).trim();
  if (!t) return false;
  if (acc.accessToken && timingSafeEqualStr(t, acc.accessToken)) return true;
  if (acc.dashToken && timingSafeEqualStr(t, acc.dashToken)) return true;
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

module.exports = {
  isProdEnv,
  extractAccountToken,
  extractDashToken,
  tokenMatchesAccount,
  isAccountActive,
  activeOwnerMatches,
};
