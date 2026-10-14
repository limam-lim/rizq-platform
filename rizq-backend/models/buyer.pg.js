/**
 * Buyer — PostgreSQL sync (parameterized via db/sql)
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
    id: row.id, name: row.name, phone: row.phone || '',
    phoneIntl: row.phone_intl || '', whatsapp: row.whatsapp || '', email: row.email || '',
  };
}

function findById(id) {
  return sql.queryOneSync('SELECT * FROM buyers WHERE id = ?', [id]);
}
function findByPhone(phone) {
  const mr = normalizePhone(phone);
  if (!MR_PHONE_RE.test(mr)) return null;
  return sql.queryOneSync('SELECT * FROM buyers WHERE phone = ?', [mr]);
}
function findByEmail(email) {
  const em = normalizeEmailSafe(email);
  if (!em) return null;
  return sql.queryOneSync('SELECT * FROM buyers WHERE lower(email) = ? OR email_lc = ?', [em, em]);
}
function findByIdAndToken(id, token) {
  return sql.queryOneSync('SELECT * FROM buyers WHERE id = ? AND token = ?', [id, token]);
}
function hashPassword(password) {
  const pw = String(password || '');
  if (pw.length < 6 || pw.length > 128) return null;
  return bcrypt.hashSync(pw, BCRYPT_ROUNDS);
}

function registerOrLogin(payload) {
  const cleanName = normalizeDisplayName(payload.name, 120);
  const cleanEmail = normalizeEmailSafe(payload.email);
  const mr = normalizePhone(payload.phone || payload.phoneMr);
  const intl = normalizeIntlPhone(payload.phoneIntl || payload.phone_intl);
  const wa = normalizeIntlPhone(payload.whatsapp) || (MR_PHONE_RE.test(mr) ? '+222' + mr : intl);
  const password = String(payload.password || '');
  const passHash = password ? hashPassword(password) : null;

  if (!cleanName || !isFullName(cleanName)) {
    const err = new Error('يرجى إدخال الاسم الكامل (الاسم واللقب)');
    err.status = 400; err.code = 'NAME_REQUIRED'; throw err;
  }
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
    const err = new Error('البريد الإلكتروني مطلوب وصالح');
    err.status = 400; err.code = 'EMAIL_REQUIRED'; throw err;
  }
  if (!MR_PHONE_RE.test(mr) && !intl) {
    const err = new Error('أدخل هاتفاً موريتانياً أو رقماً دولياً');
    err.status = 400; err.code = 'PHONE_REQUIRED'; throw err;
  }
  if (!wa) {
    const err = new Error('رقم واتساب صالح مطلوب');
    err.status = 400; err.code = 'WHATSAPP_REQUIRED'; throw err;
  }
  if (!passHash) {
    const err = new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    err.status = 400; err.code = 'WEAK_PASSWORD'; throw err;
  }

  const primaryPhone = MR_PHONE_RE.test(mr) ? mr : wa.replace(/\D/g, '').slice(-15);
  const now = new Date().toISOString();
  const token = genBuyerToken();
  let row = findByEmail(cleanEmail);
  if (row) {
    const phoneOwner = MR_PHONE_RE.test(mr) ? findByPhone(mr) : null;
    if (phoneOwner && phoneOwner.id !== row.id) {
      const err = new Error('رقم الهاتف مرتبط بحساب آخر');
      err.status = 409; err.code = 'PHONE_IN_USE'; throw err;
    }
    sql.executeSync(
      `UPDATE buyers SET name=?, email=?, email_lc=?, phone=?, phone_intl=?, whatsapp=?,
        pass_hash=?, token=?, last_login_at=? WHERE id=?`,
      [cleanName, cleanEmail, cleanEmail, primaryPhone, intl, wa, passHash, token, now, row.id]
    );
    return { buyer: publicBuyer(findById(row.id)), token, created: false };
  }
  if (MR_PHONE_RE.test(mr) && findByPhone(mr)) {
    const err = new Error('رقم الهاتف مسجّل مسبقاً — سجّل دخولك بنفس البريد المرتبط');
    err.status = 409; err.code = 'PHONE_IN_USE'; throw err;
  }
  const id = genBuyerId();
  sql.executeSync(
    `INSERT INTO buyers (id, name, phone, phone_intl, whatsapp, email, email_lc, pass_hash, token, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, cleanName, primaryPhone, intl, wa, cleanEmail, cleanEmail, passHash, token, now, now]
  );
  return { buyer: publicBuyer(findById(id)), token, created: true };
}

async function loginByEmailPassword(email, password) {
  const em = normalizeEmailSafe(email);
  const pw = String(password || '');
  if (!em || !EMAIL_RE.test(em) || !pw) {
    const err = new Error('البريد وكلمة المرور مطلوبان');
    err.status = 400; err.code = 'MISSING_CREDENTIALS'; throw err;
  }
  const dummyHash = '$2a$10$Cr7J1rfztqkXC9ZpESd5qO2PLvx6D3SJKxfBjfX3DXVMuu3YBVDYy';
  const row = findByEmail(em);
  let ok = false;
  try {
    ok = row && row.pass_hash ? await bcrypt.compare(pw, row.pass_hash) : await bcrypt.compare(pw, dummyHash);
  } catch (e) { ok = false; }
  if (!row || !row.pass_hash || !ok) {
    const err = new Error('بيانات الدخول غير صحيحة');
    err.status = 401; err.code = 'INVALID'; throw err;
  }
  const token = genBuyerToken();
  const now = new Date().toISOString();
  sql.executeSync('UPDATE buyers SET token = ?, last_login_at = ? WHERE id = ?', [token, now, row.id]);
  return { buyer: publicBuyer(findById(row.id)), token };
}

function loginByPhone(phone) {
  const cleanPhone = normalizePhone(phone);
  if (!MR_PHONE_RE.test(cleanPhone)) {
    const err = new Error('رقم هاتف موريتاني غير صالح');
    err.status = 400; err.code = 'INVALID_PHONE'; throw err;
  }
  const row = findByPhone(cleanPhone);
  if (!row) {
    const err = new Error('لا يوجد حساب بهذا الرقم — سجّل أولاً');
    err.status = 404; err.code = 'NOT_FOUND'; throw err;
  }
  sql.executeSync('UPDATE buyers SET last_login_at = ? WHERE id = ?', [new Date().toISOString(), row.id]);
  return { buyer: publicBuyer(row), token: row.token };
}

module.exports = {
  MR_PHONE_RE, EMAIL_RE, normalizePhone, normalizeIntlPhone, publicBuyer,
  findById, findByPhone, findByEmail, findByIdAndToken,
  registerOrLogin, loginByEmailPassword, loginByPhone,
};
