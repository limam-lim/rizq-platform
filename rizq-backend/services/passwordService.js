'use strict';

/**
 * Server-side password hashing (bcryptjs).
 * Never store or log plaintext passwords.
 */
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = Math.max(10, Number(process.env.BCRYPT_ROUNDS) || 10);
const MIN_PASSWORD_LEN = 8;

function validatePasswordStrength(password) {
  const pw = String(password || '');
  if (pw.length < MIN_PASSWORD_LEN) {
    return { ok: false, error: 'password_too_short', message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
  }
  if (pw.length > 200) {
    return { ok: false, error: 'password_too_long', message: 'كلمة المرور طويلة جداً' };
  }
  return { ok: true };
}

async function hashPassword(password) {
  const check = validatePasswordStrength(password);
  if (!check.ok) {
    const err = new Error(check.message);
    err.status = 400;
    err.code = check.error;
    throw err;
  }
  return bcrypt.hash(String(password), BCRYPT_ROUNDS);
}

async function verifyPassword(password, passwordHash) {
  if (!passwordHash || !password) return false;
  try {
    return await bcrypt.compare(String(password), String(passwordHash));
  } catch (_) {
    return false;
  }
}

module.exports = {
  BCRYPT_ROUNDS,
  MIN_PASSWORD_LEN,
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
};
