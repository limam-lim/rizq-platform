/**
 * Buyer (مشتري سريع) — Schema + عمليات DB
 */
const crypto = require('crypto');
const { db } = require('../db');

const MR_PHONE_RE = /^(2[0-9]|3[0-9]|4[0-9])\d{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function findById(id) {
  return db.prepare('SELECT * FROM buyers WHERE id = ?').get(id);
}

function findByPhone(phone) {
  const mr = normalizePhone(phone);
  if (!MR_PHONE_RE.test(mr)) return null;
  return db.prepare('SELECT * FROM buyers WHERE phone = ?').get(mr);
}

function findByEmail(email) {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return null;
  return db.prepare('SELECT * FROM buyers WHERE lower(email) = ?').get(em);
}

function findByIdAndToken(id, token) {
  return db.prepare('SELECT * FROM buyers WHERE id = ? AND token = ?').get(id, token);
}

function registerOrLogin(payload) {
  const cleanName = String(payload.name || '').trim().slice(0, 120);
  const cleanEmail = String(payload.email || '').trim().toLowerCase().slice(0, 120);
  const mr = normalizePhone(payload.phone || payload.phoneMr);
  const intl = normalizeIntlPhone(payload.phoneIntl || payload.phone_intl);
  const wa = normalizeIntlPhone(payload.whatsapp) || (MR_PHONE_RE.test(mr) ? '+222' + mr : intl);

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

  const primaryPhone = MR_PHONE_RE.test(mr) ? mr : wa.replace(/\D/g, '').slice(-15);
  const now = new Date().toISOString();

  let row = findByEmail(cleanEmail) || (MR_PHONE_RE.test(mr) ? findByPhone(mr) : null);
  if (row) {
    db.prepare(`
      UPDATE buyers SET name = ?, email = ?, phone = ?, phone_intl = ?, whatsapp = ?, last_login_at = ?
      WHERE id = ?
    `).run(cleanName, cleanEmail, primaryPhone, intl, wa, now, row.id);
    if (!row.token) {
      const token = genBuyerToken();
      db.prepare('UPDATE buyers SET token = ? WHERE id = ?').run(token, row.id);
      row.token = token;
    }
    row = findById(row.id);
    return { buyer: publicBuyer(row), token: row.token, created: false };
  }

  const id = genBuyerId();
  const token = genBuyerToken();
  db.prepare(`
    INSERT INTO buyers (id, name, phone, phone_intl, whatsapp, email, token, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, cleanName, primaryPhone, intl, wa, cleanEmail, token, now, now);
  row = findById(id);
  return { buyer: publicBuyer(row), token, created: true };
}

function loginByPhone(phone) {
  const cleanPhone = normalizePhone(phone);
  if (!MR_PHONE_RE.test(cleanPhone)) {
    const err = new Error('رقم هاتف موريتاني غير صالح');
    err.status = 400;
    err.code = 'INVALID_PHONE';
    throw err;
  }
  const row = findByPhone(cleanPhone);
  if (!row) {
    const err = new Error('لا يوجد حساب بهذا الرقم — سجّل أولاً');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE buyers SET last_login_at = ? WHERE id = ?').run(now, row.id);
  return { buyer: publicBuyer(row), token: row.token };
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
  registerOrLogin,
  loginByPhone,
};
