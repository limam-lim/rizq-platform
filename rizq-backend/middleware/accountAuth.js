/**
 * استخراج توكن الحساب — في الإنتاج: رأس فقط (لا query string)
 * dashToken يُقبل كدليل ملكية على مسارات المالك حتى لا نحتاج لإرجاع accessToken
 * من verify-dash (تصعيد صلاحيات عبر رابط الداشبورد).
 */
'use strict';

const crypto = require('crypto');
const { timingSafeEqualStr } = require('../lib/secureCompare');

/** حد الأجهزة المتزامنة لكل حساب (الأقدم استخداماً يُستبعد عند التجاوز) */
const MAX_DEVICE_SESSIONS = Math.max(1, Math.min(50, Number(process.env.MAX_DEVICE_SESSIONS) || 10));
/** مهلة قبول رمز اللوحة السابق بعد تدويره (طلبات كانت في الطريق) */
const DASH_ROTATE_GRACE_MS = 60 * 1000;

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

/* ══ جلسات متعددة الأجهزة ══════════════════════════════════════════════
 * acc.sessions = [{ sid, aH, dH, aExp, dExp, pdH, pdUntil, createdAt, lastSeenAt, ua }]
 * تُخزَّن بصمات SHA-256 فقط (لا الرموز). الرمزان الأساسيان acc.accessToken/dashToken
 * يبقيان كما هما (توافق: التسجيل/التفعيل/الموافقة).
 */
function hashToken(t) {
  return crypto.createHash('sha256').update('rizq-session:' + String(t || '')).digest('hex');
}

function _future(iso) {
  const t = Date.parse(String(iso || ''));
  return Number.isFinite(t) && t > Date.now();
}

/** يعيد { session, kind } حيث kind ∈ access | dash | prevDash — أو null */
function findSessionByToken(acc, token) {
  const t = String(token || '').trim();
  if (!acc || !t || !Array.isArray(acc.sessions) || !acc.sessions.length) return null;
  const h = hashToken(t);
  for (const s of acc.sessions) {
    if (!s) continue;
    if (s.aH && timingSafeEqualStr(h, s.aH) && _future(s.aExp)) return { session: s, kind: 'access' };
    if (s.dH && timingSafeEqualStr(h, s.dH) && _future(s.dExp)) return { session: s, kind: 'dash' };
    if (s.pdH && timingSafeEqualStr(h, s.pdH) && Number(s.pdUntil) > Date.now()) return { session: s, kind: 'prevDash' };
    if (s.paH && timingSafeEqualStr(h, s.paH) && Number(s.paUntil) > Date.now()) return { session: s, kind: 'prevAccess' };
  }
  return null;
}

function pruneSessions(acc) {
  if (!acc) return acc;
  const list = Array.isArray(acc.sessions) ? acc.sessions : [];
  let alive = list.filter((s) => s && (_future(s.aExp) || _future(s.dExp)));
  if (alive.length > MAX_DEVICE_SESSIONS) {
    alive = alive
      .sort((a, b) => String(b.lastSeenAt || b.createdAt).localeCompare(String(a.lastSeenAt || a.createdAt)))
      .slice(0, MAX_DEVICE_SESSIONS);
  }
  acc.sessions = alive;
  return acc;
}

/** جلسة جهاز جديدة — لا تمس جلسات الأجهزة الأخرى. يعيد الرموز (تُرسل مرة واحدة). */
function createDeviceSession(acc, genAccessToken, genDashToken, meta) {
  const accessToken = genAccessToken();
  const dashToken = genDashToken();
  const now = new Date();
  const s = {
    sid: crypto.randomBytes(8).toString('hex'),
    aH: hashToken(accessToken),
    dH: hashToken(dashToken),
    aExp: new Date(now.getTime() + getAccessTokenTtlMs()).toISOString(),
    dExp: new Date(now.getTime() + getDashTokenTtlMs()).toISOString(),
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    ua: String((meta && meta.ua) || '').slice(0, 120),
  };
  if (!Array.isArray(acc.sessions)) acc.sessions = [];
  acc.sessions.push(s);
  pruneSessions(acc);
  return { accessToken, dashToken, accessTokenExpiresAt: s.aExp, dashTokenExpiresAt: s.dExp, sid: s.sid };
}

/**
 * تدوير رمزَي جلسة جهاز واحد (عند تبادل رمز اللوحة) مع مهلة قصيرة للرمزين السابقين
 * — الطلبات التي كانت في الطريق بالرمز القديم لا تُرفض (سبب 401 المتقطع في اللوحات).
 */
function rotateSession(session, genAccessToken, genDashToken) {
  const now = Date.now();
  const dashToken = genDashToken();
  const accessToken = genAccessToken();
  session.pdH = session.dH;
  session.pdUntil = now + DASH_ROTATE_GRACE_MS;
  session.paH = session.aH;
  session.paUntil = now + DASH_ROTATE_GRACE_MS;
  session.dH = hashToken(dashToken);
  session.aH = hashToken(accessToken);
  session.dExp = new Date(now + getDashTokenTtlMs()).toISOString();
  session.aExp = new Date(now + getAccessTokenTtlMs()).toISOString();
  session.lastSeenAt = new Date(now).toISOString();
  return { accessToken, dashToken, accessTokenExpiresAt: session.aExp, dashTokenExpiresAt: session.dExp };
}

/** خروج من جهاز واحد */
function revokeSessionByToken(acc, token) {
  const hit = findSessionByToken(acc, token);
  if (!hit) return false;
  acc.sessions = (acc.sessions || []).filter((s) => s !== hit.session);
  return true;
}

/** خروج من كل الأجهزة (تغيير/استعادة كلمة المرور، اشتباه سرقة) */
function revokeAllSessions(acc) {
  if (acc) {
    acc.sessions = [];
    delete acc.prevDashHash;
    delete acc.prevDashUntil;
  }
  return acc;
}

/** رمز اللوحة الأساسي: الحالي أو السابق خلال مهلة التدوير */
function primaryDashMatches(acc, token) {
  const t = String(token || '').trim();
  if (!acc || !t) return false;
  if (acc.dashToken && timingSafeEqualStr(t, acc.dashToken)) return dashTokenStillValid(acc);
  if (acc.prevDashHash && Number(acc.prevDashUntil) > Date.now()) {
    return timingSafeEqualStr(hashToken(t), acc.prevDashHash);
  }
  return false;
}

/** تدوير رمز اللوحة الأساسي مع مهلة للرمز السابق */
function rotatePrimaryDash(acc, genDashToken) {
  if (acc.dashToken) {
    acc.prevDashHash = hashToken(acc.dashToken);
    acc.prevDashUntil = Date.now() + DASH_ROTATE_GRACE_MS;
  }
  stampDashToken(acc, genDashToken);
  return acc.dashToken;
}

/** هل الرمز رمزُ لوحة صالح (أساسي أو جلسة جهاز)؟ */
function dashTokenMatches(acc, token) {
  if (primaryDashMatches(acc, token)) return true;
  const hit = findSessionByToken(acc, token);
  return !!(hit && (hit.kind === 'dash' || hit.kind === 'prevDash'));
}

/** يطابق accessToken أو dashToken لنفس الحساب (كلاهما يثبت الملكية) مع احترام TTL — الأساسي أو أي جهاز. */
function tokenMatchesAccount(acc, token) {
  if (!acc || !token) return false;
  const t = String(token).trim();
  if (!t) return false;
  if (acc.accessToken && timingSafeEqualStr(t, acc.accessToken)) {
    return accessTokenStillValid(acc);
  }
  if (primaryDashMatches(acc, t)) return true;
  return !!findSessionByToken(acc, t);
}

/** حقول الجلسات الداخلية — لا تُرسل لأي عميل */
const SESSION_INTERNAL_FIELDS = ['sessions', 'prevDashHash', 'prevDashUntil'];

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
  hashToken,
  findSessionByToken,
  createDeviceSession,
  rotateSession,
  revokeSessionByToken,
  revokeAllSessions,
  pruneSessions,
  primaryDashMatches,
  rotatePrimaryDash,
  dashTokenMatches,
  SESSION_INTERNAL_FIELDS,
  MAX_DEVICE_SESSIONS,
};
