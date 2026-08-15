/**
 * OTP — إرسال/تحقق رمز الهاتف للتسجيل
 * Production: OTP عشوائي + Twilio (إن وُجد). لا رمز تجريبي ثابت.
 * Development: OTP عشوائي؛ OTP_DEMO_CODE + OTP_ALLOW_DEMO=true للاختبار المحلي فقط.
 */
const fs = require('fs');
const path = require('path');
const { sendSMS } = require('../rizq_package_lifecycle_agent');

const FILE = path.join(__dirname, '..', 'data', 'otp-store.json');
const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.RIZQ_ENV === 'production';
}

function isDemoOtpAllowed() {
  return !isProduction() && process.env.OTP_ALLOW_DEMO === 'true';
}

function readStore() {
  try {
    if (!fs.existsSync(FILE)) return [];
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeStore(list) {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8');
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s/g, '').replace(/^\+222/, '').replace(/\D/g, '').slice(-8);
}

function isValidMauritanianPhone(ph) {
  return /^(2[0-9]|3[0-9]|4[0-9])\d{6}$/.test(ph);
}

function generateCode() {
  if (isDemoOtpAllowed() && process.env.OTP_DEMO_CODE) {
    return String(process.env.OTP_DEMO_CODE).replace(/\D/g, '').slice(0, 6).padStart(6, '0');
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getPublicOtpConfig() {
  return {
    production: isProduction(),
    demoOtpAllowed: isDemoOtpAllowed(),
    smsConfigured: !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.RIZQ_TWILIO_NUMBER),
    devHintEnabled: !isProduction() && process.env.OTP_DEV_HINT === 'true',
  };
}

async function sendOtp(phone) {
  const ph = normalizePhone(phone);
  if (!isValidMauritanianPhone(ph)) {
    return { ok: false, error: 'invalid_phone', message: 'رقم هاتف موريتاني غير صالح' };
  }

  const code = generateCode();
  const now = Date.now();
  const list = readStore().filter((x) => x.phone !== ph);
  list.push({ phone: ph, code, expiresAt: now + TTL_MS, attempts: 0, createdAt: new Date(now).toISOString() });
  writeStore(list);

  const smsText = `رمز التحقق رزق: ${code}. صالح 5 دقائق.`;
  let sentViaSms = false;
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.RIZQ_TWILIO_NUMBER) {
    const sms = await sendSMS('+222' + ph, smsText);
    sentViaSms = !!(sms && sms.ok);
  }

  const out = { ok: true, expiresIn: Math.floor(TTL_MS / 1000), sentViaSms };
  const cfg = getPublicOtpConfig();
  if (cfg.devHintEnabled && !sentViaSms) {
    out.devHint = code;
  }
  return out;
}

function verifyOtp(phone, code) {
  const ph = normalizePhone(phone);
  const submitted = String(code || '').replace(/\D/g, '');
  if (submitted.length !== 6) {
    return { ok: false, error: 'invalid_code', message: 'رمز غير صحيح' };
  }

  const list = readStore();
  const idx = list.findIndex((x) => x.phone === ph);
  if (idx < 0) {
    return { ok: false, error: 'no_otp', message: 'لم يُرسَل رمز — اطلب رمزاً جديداً' };
  }

  const rec = list[idx];
  if (Date.now() > rec.expiresAt) {
    list.splice(idx, 1);
    writeStore(list);
    return { ok: false, error: 'expired', message: 'انتهت صلاحية الرمز — اطلب رمزاً جديداً' };
  }

  rec.attempts = (rec.attempts || 0) + 1;
  if (rec.attempts > MAX_ATTEMPTS) {
    list.splice(idx, 1);
    writeStore(list);
    return { ok: false, error: 'too_many_attempts', message: 'محاولات كثيرة — اطلب رمزاً جديداً' };
  }

  if (submitted !== rec.code) {
    writeStore(list);
    return { ok: false, error: 'invalid_code', message: 'رمز غير صحيح' };
  }

  list.splice(idx, 1);
  writeStore(list);
  return { ok: true };
}

module.exports = { sendOtp, verifyOtp, getPublicOtpConfig, normalizePhone, isValidMauritanianPhone };
