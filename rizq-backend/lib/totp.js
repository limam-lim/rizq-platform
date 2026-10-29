/**
 * totp.js — TOTP (RFC 6238 / HOTP RFC 4226) بلا اعتماديات خارجية.
 * متوافق مع Google Authenticator / Microsoft Authenticator / Authy:
 * SHA-1، 6 أرقام، خطوة 30 ثانية، مفتاح Base32.
 */
'use strict';

const crypto = require('crypto');

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const clean = String(str || '').toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error('invalid_base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** مفتاح جديد 160-bit (الطول الموصى به لـ SHA-1) */
function generateSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secretB32, counter) {
  const key = base32Decode(secretB32);
  const msg = Buffer.alloc(8);
  // counter كـ 64-bit big-endian
  msg.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  msg.writeUInt32BE(counter >>> 0, 4);
  const h = crypto.createHmac('sha1', key).update(msg).digest();
  const off = h[h.length - 1] & 0x0f;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

function currentStep(nowMs) {
  return Math.floor((nowMs == null ? Date.now() : nowMs) / 1000 / STEP_SECONDS);
}

function totp(secretB32, nowMs) {
  return hotp(secretB32, currentStep(nowMs));
}

/**
 * يتحقق من رمز ضمن نافذة ±window خطوة (انحراف ساعة الهاتف).
 * يعيد رقم الخطوة المطابقة (لمنع إعادة الاستخدام) أو -1.
 */
function verifyTotp(secretB32, code, opts) {
  const c = String(code || '').replace(/\D/g, '');
  if (c.length !== DIGITS) return -1;
  const window = opts && Number.isInteger(opts.window) ? opts.window : 1;
  const step = currentStep(opts && opts.nowMs);
  for (let d = -window; d <= window; d++) {
    const s = step + d;
    const expected = hotp(secretB32, s);
    const a = Buffer.from(expected);
    const b = Buffer.from(c);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return s;
  }
  return -1;
}

function otpauthUrl(secretB32, account, issuer) {
  const iss = issuer || 'Rizq';
  const label = encodeURIComponent(iss + ':' + account);
  return 'otpauth://totp/' + label + '?secret=' + secretB32
    + '&issuer=' + encodeURIComponent(iss) + '&algorithm=SHA1&digits=' + DIGITS + '&period=' + STEP_SECONDS;
}

module.exports = {
  base32Encode,
  base32Decode,
  generateSecret,
  hotp,
  totp,
  verifyTotp,
  currentStep,
  otpauthUrl,
  STEP_SECONDS,
  DIGITS,
};
