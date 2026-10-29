/**
 * adminTwoFactor.js — التحقق بخطوتين (TOTP) لحسابات الأدمن.
 *
 * - مُطفأ افتراضياً: لا يتغير الدخول إلا بعد أن يفعّله صاحب الحساب
 *   (scripts/admin-2fa.js enable <user>) — لا خطر إقفال عند النشر.
 * - المفتاح يُخزَّن مشفّراً AES-256-GCM بمفتاح ADMIN_2FA_KEY (متغير بيئة، لا في القاعدة).
 * - منع إعادة استخدام الرمز نفسه (lastStep)، و10 رموز احتياطية تُستهلك مرة واحدة.
 * - ADMIN_2FA_ENFORCE_SUPER=1 (اختياري لاحقاً): يمنع دخول أي سوبر لم يفعّل 2FA.
 */
'use strict';

const crypto = require('crypto');
const totp = require('../lib/totp');

const RECOVERY_CODES = 10;

function _repo() {
  return require('../db/repos').adminTwoFactor;
}

function userKey(user) {
  return String(user || '').trim().toLowerCase().slice(0, 120);
}

function encryptionKey() {
  const raw = String(process.env.ADMIN_2FA_KEY || '').trim();
  if (!raw) return null;
  let buf = null;
  if (/^[0-9a-f]{64}$/i.test(raw)) buf = Buffer.from(raw, 'hex');
  else {
    try { buf = Buffer.from(raw, 'base64'); } catch (e) { buf = null; }
  }
  return buf && buf.length === 32 ? buf : null;
}

function encryptSecret(secretB32) {
  const key = encryptionKey();
  if (!key) throw Object.assign(new Error('ADMIN_2FA_KEY missing or invalid (need 32 bytes hex/base64)'), { code: 'no_2fa_key' });
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(secretB32, 'utf8'), c.final()]);
  return { v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), data: enc.toString('base64') };
}

function decryptSecret(box) {
  const key = encryptionKey();
  if (!key || !box || !box.data) return null;
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(box.iv, 'base64'));
    d.setAuthTag(Buffer.from(box.tag, 'base64'));
    return Buffer.concat([d.update(Buffer.from(box.data, 'base64')), d.final()]).toString('utf8');
  } catch (e) {
    return null;
  }
}

function hashRecovery(code) {
  return crypto.createHash('sha256').update('rizq-2fa-recovery:' + String(code).replace(/[\s-]/g, '').toUpperCase()).digest('hex');
}

function genRecoveryCodes() {
  const out = [];
  for (let i = 0; i < RECOVERY_CODES; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars
    out.push(raw.slice(0, 5) + '-' + raw.slice(5));
  }
  return out;
}

async function getRecord(user) {
  const k = userKey(user);
  if (!k) return null;
  // لا نبتلع أخطاء القراءة: خطأ هنا يجب أن يرفض الدخول (fail-closed) لا أن يتجاوز 2FA
  return (await _repo().get(k)) || null;
}

async function isEnabled(user) {
  const r = await getRecord(user);
  return !!(r && r.enabled && r.secret);
}

function isSuper(member) {
  const p = Array.isArray(member && member.permissions) ? member.permissions : [];
  return p.indexOf('*') !== -1;
}

/**
 * ما المطلوب من هذا العضو عند الدخول؟
 * { required: bool, enrollmentRequired: bool }
 */
async function loginRequirement(member) {
  const enabled = await isEnabled(member && member.user);
  if (enabled) return { required: true, enrollmentRequired: false };
  const enforce = String(process.env.ADMIN_2FA_ENFORCE_SUPER || '').trim() === '1';
  if (enforce && isSuper(member)) return { required: false, enrollmentRequired: true };
  return { required: false, enrollmentRequired: false };
}

/** يتحقق من رمز TOTP أو رمز احتياطي؛ يحدّث lastStep / يستهلك الرمز الاحتياطي */
async function verifyLogin(member, code) {
  const k = userKey(member && member.user);
  const rec = await getRecord(k);
  if (!rec || !rec.enabled) return { ok: false, error: 'not_enabled' };
  const secret = decryptSecret(rec.secret);
  if (!secret) return { ok: false, error: 'key_unavailable' };
  const input = String(code || '').trim();

  if (/^\d{6}$/.test(input.replace(/\s/g, ''))) {
    const step = totp.verifyTotp(secret, input.replace(/\s/g, ''), { window: 1 });
    if (step < 0) return { ok: false, error: 'invalid_code' };
    if (Number.isInteger(rec.lastStep) && step <= rec.lastStep) return { ok: false, error: 'code_already_used' };
    rec.lastStep = step;
    rec.lastUsedAt = new Date().toISOString();
    await _repo().upsert(k, rec, { skipBackup: true });
    return { ok: true, method: 'totp' };
  }

  const h = hashRecovery(input);
  const list = Array.isArray(rec.recovery) ? rec.recovery : [];
  const idx = list.findIndex((x) => x && x.hash === h && !x.usedAt);
  if (idx === -1) return { ok: false, error: 'invalid_code' };
  list[idx].usedAt = new Date().toISOString();
  rec.recovery = list;
  rec.lastUsedAt = list[idx].usedAt;
  await _repo().upsert(k, rec, { skipBackup: true });
  return { ok: true, method: 'recovery', recoveryLeft: list.filter((x) => !x.usedAt).length };
}

/** خطوة 1: مفتاح معلّق (لا يُفعَّل حتى يُثبت المستخدم رمزاً صحيحاً) */
async function beginEnrollment(user) {
  const k = userKey(user);
  if (!k) throw new Error('user_required');
  const secret = totp.generateSecret();
  const rec = (await getRecord(k)) || { user: k };
  rec.pending = { secret: encryptSecret(secret), createdAt: new Date().toISOString() };
  await _repo().upsert(k, rec, { skipBackup: true });
  return { secret, otpauthUrl: totp.otpauthUrl(secret, k, 'Rizq Admin') };
}

/** خطوة 2: تأكيد برمز من التطبيق → تفعيل + رموز احتياطية (تُعرض مرة واحدة) */
async function confirmEnrollment(user, code) {
  const k = userKey(user);
  const rec = await getRecord(k);
  if (!rec || !rec.pending) return { ok: false, error: 'no_pending_enrollment' };
  if (Date.now() - Date.parse(rec.pending.createdAt) > 15 * 60 * 1000) return { ok: false, error: 'enrollment_expired' };
  const secret = decryptSecret(rec.pending.secret);
  if (!secret) return { ok: false, error: 'key_unavailable' };
  const step = totp.verifyTotp(secret, code, { window: 1 });
  if (step < 0) return { ok: false, error: 'invalid_code' };
  const codes = genRecoveryCodes();
  const next = {
    user: k,
    enabled: true,
    secret: rec.pending.secret,
    lastStep: step,
    enabledAt: new Date().toISOString(),
    recovery: codes.map((c) => ({ hash: hashRecovery(c), usedAt: null })),
  };
  await _repo().upsert(k, next, { skipBackup: true });
  return { ok: true, recoveryCodes: codes };
}

async function disable(user) {
  const k = userKey(user);
  const rec = await getRecord(k);
  if (!rec) return { ok: true, already: true };
  await _repo().remove(k, { skipBackup: true });
  return { ok: true };
}

async function status(user) {
  const rec = await getRecord(user);
  if (!rec) return { enabled: false };
  return {
    enabled: !!rec.enabled,
    enabledAt: rec.enabledAt || null,
    lastUsedAt: rec.lastUsedAt || null,
    pending: !!rec.pending,
    recoveryLeft: Array.isArray(rec.recovery) ? rec.recovery.filter((x) => !x.usedAt).length : 0,
  };
}

module.exports = {
  loginRequirement,
  verifyLogin,
  beginEnrollment,
  confirmEnrollment,
  disable,
  status,
  isEnabled,
  encryptionKey,
};
