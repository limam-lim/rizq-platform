/**
 * OTP — إرسال/تحقق رمز الهاتف (+ البريد للمشتري)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sendSMS } = require('../rizq_package_lifecycle_agent');

const FILE = path.join(__dirname, '..', 'data', 'otp-store.json');
const TTL_MS = 5 * 60 * 1000;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let _mailer = null;
function getMailer() {
  if (_mailer) return _mailer;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  try {
    const nodemailer = require('nodemailer');
    _mailer = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    return _mailer;
  } catch (e) {
    return null;
  }
}

async function sendOtpEmail(to, code, name) {
  const mailer = getMailer();
  if (!mailer || !to) return { ok: false };
  const safeName = escapeHtml(String(name || '').trim() || 'عزيزي المستخدم');
  const safeCode = escapeHtml(code);
  try {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM || '"رزق Rizq" <direction@rizq.mr>',
      to,
      subject: 'رمز التحقق — رزق Rizq',
      html: '<div dir="rtl" style="font-family:Segoe UI,Tahoma,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1B3A6B">'
        + '<h2 style="color:#C9A84C;margin:0 0 12px">رزق Rizq</h2>'
        + '<p>مرحباً ' + safeName + '،</p>'
        + '<p>رمز التحقق الخاص بك:</p>'
        + '<p style="font-size:28px;font-weight:800;letter-spacing:6px;color:#0d1b2a">' + safeCode + '</p>'
        + '<p style="font-size:13px;color:#64748b">صالح لمدة 5 دقائق. لا تشارك هذا الرمز مع أحد.</p>'
        + '</div>',
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

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

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeIntlPhone(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  let digits = s.replace(/[^\d+]/g, '');
  if (digits.startsWith('00')) digits = '+' + digits.slice(2);
  if (!digits.startsWith('+')) {
    digits = digits.replace(/\D/g, '');
    if (digits.length >= 8) digits = '+' + digits;
    else return '';
  }
  const num = digits.replace(/\D/g, '');
  if (num.length < 8 || num.length > 15) return '';
  return '+' + num;
}

function buyerStoreKey(email) {
  return 'buyer:' + normalizeEmail(email);
}

function isValidMauritanianPhone(ph) {
  return /^(2[0-9]|3[0-9]|4[0-9])\d{6}$/.test(ph);
}

function otpPepper() {
  return process.env.OTP_PEPPER || process.env.BACKEND_SHARED_SECRET || 'rizq-otp-pepper';
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hashOtpCode(code) {
  return crypto.createHmac('sha256', otpPepper()).update(String(code)).digest('hex');
}

function codesMatch(submitted, record) {
  if (!record) return false;
  const plain = String(submitted || '').replace(/\D/g, '');
  if (plain.length !== 6) return false;
  if (record.codeHash) return hashOtpCode(plain) === record.codeHash;
  return plain === String(record.code || '');
}

function generateCode() {
  if (isDemoOtpAllowed() && process.env.OTP_DEMO_CODE) {
    return String(process.env.OTP_DEMO_CODE).replace(/\D/g, '').slice(0, 6).padStart(6, '0');
  }
  return String(crypto.randomInt(100000, 1000000));
}

function getPublicOtpConfig() {
  return {
    production: isProduction(),
    demoOtpAllowed: isDemoOtpAllowed(),
    smsConfigured: !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.RIZQ_TWILIO_NUMBER),
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    devHintEnabled: !isProduction() && process.env.OTP_DEV_HINT === 'true',
  };
}

async function sendOtp(phone, opts) {
  const ph = normalizePhone(phone);
  if (!isValidMauritanianPhone(ph)) {
    return { ok: false, error: 'invalid_phone', message: 'رقم هاتف موريتاني غير صالح' };
  }

  const email = String((opts && opts.email) || '').trim().toLowerCase();
  const name = String((opts && opts.name) || '').trim();
  if (email && !EMAIL_RE.test(email)) {
    return { ok: false, error: 'invalid_email', message: 'بريد إلكتروني غير صالح' };
  }

  const code = generateCode();
  const now = Date.now();
  const list = readStore().filter((x) => x.phone !== ph);
  list.push({
    phone: ph,
    email: email || '',
    name: name || '',
    codeHash: hashOtpCode(code),
    expiresAt: now + TTL_MS,
    attempts: 0,
    verified: false,
    createdAt: new Date(now).toISOString(),
  });
  writeStore(list);

  const smsText = `رمز التحقق رزق: ${code}. صالح 5 دقائق.`;
  let sentViaSms = false;
  if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.RIZQ_TWILIO_NUMBER) {
    const sms = await sendSMS('+222' + ph, smsText);
    sentViaSms = !!(sms && sms.ok);
  }

  let sentViaEmail = false;
  if (email) {
    const mail = await sendOtpEmail(email, code, name);
    sentViaEmail = !!(mail && mail.ok);
  }

  const out = { ok: true, expiresIn: Math.floor(TTL_MS / 1000), sentViaSms, sentViaEmail };
  const cfg = getPublicOtpConfig();
  if (cfg.devHintEnabled && !sentViaSms && !sentViaEmail) {
    out.devHint = code;
  }
  if (email && !sentViaEmail && !cfg.devHintEnabled) {
    out.emailWarning = 'تعذّر إرسال البريد — تحقق من العنوان أو حاول لاحقاً';
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

  if (!codesMatch(submitted, rec)) {
    writeStore(list);
    return { ok: false, error: 'invalid_code', message: 'رمز غير صحيح' };
  }

  rec.verified = true;
  rec.verifiedUntil = Date.now() + VERIFY_WINDOW_MS;
  delete rec.code;
  writeStore(list);
  return { ok: true };
}

function consumeVerification(phone) {
  const ph = normalizePhone(phone);
  const list = readStore();
  const idx = list.findIndex((x) => x.phone === ph && x.verified);
  if (idx < 0) {
    return { ok: false, error: 'otp_required', message: 'يجب التحقق من الهاتف برمز OTP أولاً' };
  }
  const rec = list[idx];
  if (Date.now() > (rec.verifiedUntil || rec.expiresAt)) {
    list.splice(idx, 1);
    writeStore(list);
    return { ok: false, error: 'otp_expired', message: 'انتهت صلاحية التحقق — أعد إرسال الرمز' };
  }
  list.splice(idx, 1);
  writeStore(list);
  return { ok: true, email: rec.email || '' };
}

async function sendBuyerOtp(payload) {
  const email = normalizeEmail(payload && payload.email);
  const name = String((payload && payload.name) || '').trim();
  const mr = normalizePhone(payload && (payload.phoneMr || payload.phone));
  const intl = normalizeIntlPhone(payload && (payload.phoneIntl || payload.phone_intl));
  const wa = normalizeIntlPhone(payload && payload.whatsapp)
    || (isValidMauritanianPhone(mr) ? '+222' + mr : intl);

  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, error: 'invalid_email', message: 'بريد إلكتروني غير صالح' };
  }
  if (!isValidMauritanianPhone(mr) && !intl) {
    return { ok: false, error: 'phone_required', message: 'أدخل هاتفاً موريتانياً أو رقماً دولياً' };
  }

  const code = generateCode();
  const now = Date.now();
  const key = buyerStoreKey(email);
  const list = readStore().filter((x) => x.key !== key);
  list.push({
    key,
    channel: 'buyer',
    email,
    phone: mr || '',
    phoneIntl: intl || '',
    whatsapp: wa || '',
    name,
    codeHash: hashOtpCode(code),
    expiresAt: now + TTL_MS,
    attempts: 0,
    verified: false,
    createdAt: new Date(now).toISOString(),
  });
  writeStore(list);

  let sentViaSms = false;
  if (isValidMauritanianPhone(mr) && process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.RIZQ_TWILIO_NUMBER) {
    const sms = await sendSMS('+222' + mr, `رمز التحقق رزق: ${code}. صالح 5 دقائق.`);
    sentViaSms = !!(sms && sms.ok);
  }

  const mail = await sendOtpEmail(email, code, name);
  const sentViaEmail = !!(mail && mail.ok);

  const out = { ok: true, expiresIn: Math.floor(TTL_MS / 1000), sentViaSms, sentViaEmail, channel: 'buyer' };
  const cfg = getPublicOtpConfig();
  if (cfg.devHintEnabled && !sentViaSms && !sentViaEmail) out.devHint = code;
  if (!sentViaEmail && !cfg.devHintEnabled) {
    out.emailWarning = 'تعذّر إرسال البريد — تحقق من العنوان أو حاول لاحقاً';
  }
  return out;
}

function verifyBuyerOtp(email, code) {
  const em = normalizeEmail(email);
  const submitted = String(code || '').replace(/\D/g, '');
  if (!em || submitted.length !== 6) {
    return { ok: false, error: 'invalid_code', message: 'رمز غير صحيح' };
  }

  const list = readStore();
  const key = buyerStoreKey(em);
  const idx = list.findIndex((x) => x.key === key);
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

  if (!codesMatch(submitted, rec)) {
    writeStore(list);
    return { ok: false, error: 'invalid_code', message: 'رمز غير صحيح' };
  }

  rec.verified = true;
  rec.verifiedUntil = Date.now() + VERIFY_WINDOW_MS;
  delete rec.code;
  writeStore(list);
  return { ok: true };
}

function consumeBuyerVerificationByEmail(email) {
  const em = normalizeEmail(email);
  const list = readStore();
  const key = buyerStoreKey(em);
  const idx = list.findIndex((x) => x.key === key && x.verified);
  if (idx < 0) {
    return { ok: false, error: 'otp_required', message: 'يجب التحقق من البريد برمز OTP أولاً' };
  }
  const rec = list[idx];
  if (Date.now() > (rec.verifiedUntil || rec.expiresAt)) {
    list.splice(idx, 1);
    writeStore(list);
    return { ok: false, error: 'otp_expired', message: 'انتهت صلاحية التحقق — أعد إرسال الرمز' };
  }
  list.splice(idx, 1);
  writeStore(list);
  return { ok: true, email: em };
}

module.exports = {
  sendOtp,
  verifyOtp,
  consumeVerification,
  sendBuyerOtp,
  verifyBuyerOtp,
  consumeBuyerVerificationByEmail,
  getPublicOtpConfig,
  normalizePhone,
  normalizeEmail,
  normalizeIntlPhone,
  isValidMauritanianPhone,
};
