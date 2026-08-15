/**
 * Buyer (مشتري سريع) — Schema + عمليات DB
 */
const crypto = require('crypto');
const { db } = require('../db');

const MR_PHONE_RE = /^(2[0-9]|3[0-9]|4[0-9])\d{6}$/;

function genBuyerId() {
  return 'buy_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}
function genBuyerToken() {
  return crypto.randomBytes(20).toString('hex');
}

function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '').slice(-8);
}

function publicBuyer(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, phone: row.phone, email: row.email || '' };
}

function findById(id) {
  return db.prepare('SELECT * FROM buyers WHERE id = ?').get(id);
}

function findByPhone(phone) {
  return db.prepare('SELECT * FROM buyers WHERE phone = ?').get(normalizePhone(phone));
}

function findByIdAndToken(id, token) {
  return db.prepare('SELECT * FROM buyers WHERE id = ? AND token = ?').get(id, token);
}

/**
 * تسجيل = دخول — نفس منطق POST /api/buyers/register السابق
 */
function registerOrLogin({ name, phone, email }) {
  const cleanName = String(name || '').trim().slice(0, 120);
  const cleanPhone = normalizePhone(phone);
  const cleanEmail = String(email || '').trim().slice(0, 120);
  if (!cleanName) {
    const err = new Error('الاسم الكامل مطلوب');
    err.status = 400;
    err.code = 'NAME_REQUIRED';
    throw err;
  }
  if (!MR_PHONE_RE.test(cleanPhone)) {
    const err = new Error('رقم هاتف موريتاني غير صالح');
    err.status = 400;
    err.code = 'INVALID_PHONE';
    throw err;
  }
  const now = new Date().toISOString();
  let row = findByPhone(cleanPhone);
  if (row) {
    db.prepare(`
      UPDATE buyers SET name = ?, email = ?, last_login_at = ?
      WHERE id = ?
    `).run(cleanName, cleanEmail || row.email, now, row.id);
    if (!row.token) {
      const token = genBuyerToken();
      db.prepare('UPDATE buyers SET token = ? WHERE id = ?').run(token, row.id);
      row.token = token;
    }
    row.name = cleanName;
    if (cleanEmail) row.email = cleanEmail;
    row.last_login_at = now;
    return { buyer: publicBuyer(row), token: row.token, created: false };
  }
  const id = genBuyerId();
  const token = genBuyerToken();
  db.prepare(`
    INSERT INTO buyers (id, name, phone, email, token, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, cleanName, cleanPhone, cleanEmail, token, now, now);
  row = findById(id);
  return { buyer: publicBuyer(row), token, created: true };
}

/**
 * دخول برقم الهاتف فقط — يفشل إن لم يكن مسجّلاً (404)
 */
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
  normalizePhone,
  publicBuyer,
  findById,
  findByPhone,
  findByIdAndToken,
  registerOrLogin,
  loginByPhone,
};
