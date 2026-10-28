/**
 * Buyer (مشتري سريع) — async PostgreSQL model
 */
'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sql = require('../db/sql');
const { normalizeDisplayName, normalizeEmailSafe } = require('../lib/sanitizeText');

const MR_PHONE_RE = /^(2[0-9]|3[0-9]|4[0-9])\d{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = Math.max(8, Math.min(14, Number(process.env.BCRYPT_ROUNDS) || 10));

function isFullName(name) {
  return /\S+\s+\S+/.test(String(name || '').trim());
}

function genBuyerId() {
  return 'buy_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}
function genBuyerToken() {
  return crypto.randomBytes(20).toString('hex');
}

function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '').slice(-8);
}

function normalizeIntlPhone(raw) {
  var s = String(raw || '').trim();
  if (!s) return '';
  var digits = s.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = '+' + digits.slice(2);
  if (!digits.startsWith('+')) {
    digits = digits.replace(/\D/g, '');
    if (digits.length >= 8) digits = '+' + digits;
    else return '';
  }
  var num = digits.replace(/\D/g, '');
  if (num.length < 8 || num.length > 15) return '';
  return '+' + num;
}

function publicBuyer(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    phoneIntl: row.phone_intl || '',
    whatsapp: row.whatsapp || '',
    email: row.email || '',
  };
}

async function findById(id) {
  return sql.queryOne('SELECT * FROM buyers WHERE id = ?', [id]);
}

async function findByPhone(phone) {
  const mr = normalizePhone(phone);
  if (!MR_PHONE_RE.test(mr)) return null;
  return sql.queryOne('SELECT * FROM buyers WHERE phone = ?', [mr]);
}

async function findByEmail(email) {
  const em = normalizeEmailSafe(email);
  if (!em) return null;
  return sql.queryOne(
    'SELECT * FROM buyers WHERE lower(email) = ? OR email_lc = ?',
    [em, em]
  );
}

async function findByIdAndToken(id, token) {
  const row = await findById(id);
  if (!row || !row.token || !token) return null;
  try {
    const { timingSafeEqualStr } = require('../lib/secureCompare');
    if (!timingSafeEqualStr(row.token, token)) return null;
  } catch (e) {
    if (String(row.token) !== String(token)) return null;
  }
  return row;
}

async function invalidateToken(id) {
  const row = await findById(id);
  if (!row) return false;
  const token = genBuyerToken();
  await sql.execute('UPDATE buyers SET token = ? WHERE id = ?', [token, id]);
  return true;
}

function hashPassword(password) {
  const pw = String(password || '');
  if (pw.length < 8 || pw.length > 128) return null;
  return bcrypt.hashSync(pw, BCRYPT_ROUNDS);
}

async function registerOrLogin(payload) {
  const cleanName = normalizeDisplayName(payload.name, 120);
  const cleanEmail = normalizeEmailSafe(payload.email);
  const mr = normalizePhone(payload.phone || payload.phoneMr);
  const intl = normalizeIntlPhone(payload.phoneIntl || payload.phone_intl);
  const wa = normalizeIntlPhone(payload.whatsapp) || (MR_PHONE_RE.test(mr) ? '+222' + mr : intl);
  const password = String(payload.password || '');
  const passHash = password ? hashPassword(password) : null;

  if (!cleanName || !isFullName(cleanName)) {
    const err = new Error('يرجى إدخال الاسم الكامل (الاسم واللقب)');
    err.status = 400;
    err.code = 'NAME_REQUIRED';
    throw err;
  }
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
    const err = new Error('البريد الإلكتروني مطلوب وصالح');
    err.status = 400;
    err.code = 'EMAIL_REQUIRED';
    throw err;
  }
  if (!MR_PHONE_RE.test(mr) && !intl) {
    const err = new Error('أدخل هاتفاً موريتانياً أو رقماً دولياً');
    err.status = 400;
    err.code = 'PHONE_REQUIRED';
    throw err;
  }
  if (!wa) {
    const err = new Error('رقم واتساب صالح مطلوب');
    err.status = 400;
    err.code = 'WHATSAPP_REQUIRED';
    throw err;
  }
  if (password && !passHash) {
    const err = new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
    err.status = 400;
    err.code = 'WEAK_PASSWORD';
    throw err;
  }

  const primaryPhone = MR_PHONE_RE.test(mr) ? mr : wa.replace(/\D/g, '').slice(-15);
  const now = new Date().toISOString();
  const token = genBuyerToken();

  let row = await findByEmail(cleanEmail);
  if (row) {
    const phoneOwner = MR_PHONE_RE.test(mr) ? await findByPhone(mr) : null;
    if (phoneOwner && phoneOwner.id !== row.id) {
      const err = new Error('رقم الهاتف مرتبط بحساب آخر');
      err.status = 409;
      err.code = 'PHONE_IN_USE';
      throw err;
    }
    if (passHash) {
      await sql.execute(
        `UPDATE buyers SET name = ?, email = ?, email_lc = ?, phone = ?, phone_intl = ?, whatsapp = ?,
          pass_hash = ?, token = ?, last_login_at = ?, updated_at_ts = NOW()
        WHERE id = ?`,
        [cleanName, cleanEmail, cleanEmail, primaryPhone, intl, wa, passHash, token, now, row.id]
      );
    } else {
      await sql.execute(
        `UPDATE buyers SET name = ?, email = ?, email_lc = ?, phone = ?, phone_intl = ?, whatsapp = ?,
          token = ?, last_login_at = ?, updated_at_ts = NOW()
        WHERE id = ?`,
        [cleanName, cleanEmail, cleanEmail, primaryPhone, intl, wa, token, now, row.id]
      );
    }
    row = await findById(row.id);
    return { buyer: publicBuyer(row), token, created: false };
  }

  if (MR_PHONE_RE.test(mr)) {
    const phoneOwner = await findByPhone(mr);
    if (phoneOwner) {
      const err = new Error('رقم الهاتف مسجّل مسبقاً — سجّل دخولك بنفس البريد المرتبط');
      err.status = 409;
      err.code = 'PHONE_IN_USE';
      throw err;
    }
  }

  const id = genBuyerId();
  await sql.execute(
    `INSERT INTO buyers (id, name, phone, phone_intl, whatsapp, email, email_lc, pass_hash, token, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, cleanName, primaryPhone, intl, wa, cleanEmail, cleanEmail, passHash, token, now, now]
  );
  row = await findById(id);
  return { buyer: publicBuyer(row), token, created: true };
}

async function loginByEmailPassword(email, password) {
  const em = normalizeEmailSafe(email);
  const pw = String(password || '');
  if (!em || !EMAIL_RE.test(em) || !pw) {
    const err = new Error('البريد وكلمة المرور مطلوبان');
    err.status = 400;
    err.code = 'MISSING_CREDENTIALS';
    throw err;
  }
  const dummyHash = '$2a$10$Cr7J1rfztqkXC9ZpESd5qO2PLvx6D3SJKxfBjfX3DXVMuu3YBVDYy';
  const row = await findByEmail(em);
  let ok = false;
  try {
    ok = row && row.pass_hash ? await bcrypt.compare(pw, row.pass_hash) : await bcrypt.compare(pw, dummyHash);
  } catch (e) {
    ok = false;
  }
  if (!row || !row.pass_hash || !ok) {
    const err = new Error('بيانات الدخول غير صحيحة');
    err.status = 401;
    err.code = 'INVALID';
    throw err;
  }
  const token = genBuyerToken();
  const now = new Date().toISOString();
  await sql.execute(
    'UPDATE buyers SET token = ?, last_login_at = ?, updated_at_ts = NOW() WHERE id = ?',
    [token, now, row.id]
  );
  const updated = await findById(row.id);
  return { buyer: publicBuyer(updated), token };
}

function loginByPhone() {
  const err = new Error('دخول الهاتف غير متاح — استخدم البريد وكلمة المرور أو OTP');
  err.status = 403;
  err.code = 'PHONE_LOGIN_DISABLED';
  throw err;
}

module.exports = {
  MR_PHONE_RE,
  EMAIL_RE,
  normalizePhone,
  normalizeIntlPhone,
  publicBuyer,
  findById,
  findByPhone,
  findByEmail,
  findByIdAndToken,
  invalidateToken,
  registerOrLogin,
  loginByEmailPassword,
  loginByPhone,
};
