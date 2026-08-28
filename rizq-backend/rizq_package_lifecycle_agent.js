/**
 * rizq_package_lifecycle_agent.js
 * ══════════════════════════════════════════════════════════════════
 * الوكيل المخصص فقط لدورة حياة باقات المشتركين (كل الفئات: فرد/محل/مكتب/
 * مؤسسة) — لم يكن موجوداً إطلاقاً قبل هذا الإصلاح. كان الموجود سابقاً فقط
 * لافتة تنبيه تفاعلية في rizq_subscription_engine.js تظهر لو فتح المشترك
 * داشبورده بنفسه لحظة اقتراب الانتهاء — بلا أي إرسال فعلي أو إيقاف حقيقي،
 * لأن بيانات الباقة كانت محفوظة فقط في متصفح كل مشترك (localStorage) ولا
 * يراها الخادم إطلاقاً.
 *
 * هذا الملف يحل الفجوة الجذرية: يستقبل نسخة من بيانات الباقة (الهاتف،
 * البريد، تاريخ الانتهاء...) من المتصفح لحظة كل تفعيل (عبر /api/account-
 * package/sync)، يولّد فاتورة حقيقية تصل فعلاً للمشترك (لوحة تحكمه +
 * واتساب + بريد)، ثم يفحص كل الحسابات كل ساعة عبر runLifecycleScan():
 *   - تذكير قبل 3 أيام وقبل يوم واحد من الانتهاء (واتساب + بريد)
 *   - عند تجاوز periodEnd: إيقاف فوري (status='expired') + تخفيض صلاحيات
 *     يمكن لأي داشبورد التحقق منه فعلياً بدل الاعتماد على تخزينه المحلي فقط.
 *
 * أمان: نقطة /api/account-package/:id (قراءة فواتير/حالة حساب) لا تستخدم
 * BACKEND_SHARED_SECRET العام (ذاك مخصص فقط للوحة أدمن الحقيقية) — بل
 * accessToken عشوائي خاص بكل حساب يُصدر لحظة أول مزامنة ويُخزَّن في
 * متصفح ذلك المشترك فقط، فلا يمكن لمشترك آخر رؤية فواتير غيره حتى لو
 * قرأ كود الصفحة بالكامل.
 * ══════════════════════════════════════════════════════════════════
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { resolveDiamondTier, isTrialPackage } = require('./services/catalogConfig');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const STORE_FILE = path.join(DATA_DIR, 'account-packages.json');

const REMINDER_WINDOWS_DAYS = [3, 1]; // نُذكّر عند تبقّي 3 أيام ويوم واحد

// ── تخزين على ملف JSON (نفس نمط rizq_subscribers_store.json الذي أثبت
//    عمله عبر عمليات Node منفصلة) ──────────────────────────────────────
function _load() {
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); } catch (e) { return {}; }
}
function _save(store) {
  try { fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8'); }
  catch (e) { console.error('⚠️ فشل حفظ account-packages.json:', e.message); }
}

function _genToken() { return crypto.randomBytes(20).toString('hex'); }

// ── رقم فاتورة تسلسلي — نفس صيغة rizq_invoice_engine.js (RZQ-YYYY-NNNNNN)
//    لكن بترقيم خاص بالخادم (مستقل عن أي عدّاد محلي في متصفح الأدمن) ────
function _nextInvoiceNumber(store) {
  const year = new Date().getFullYear();
  const seq = (store.__invoiceSeq || 0) + 1;
  store.__invoiceSeq = seq;
  return 'RZQ-' + year + '-' + String(seq).padStart(6, '0');
}

// ── إرسال واتساب — نفس آلية rizq_whatsapp_handler.js (Meta Cloud API)
//    لكن هذا الملف يعمل داخل عملية rizq-backend/server.js المنفصلة، لذا
//    لا يمكنه استدعاء دالة sendWhatsAppMessage هناك مباشرة (عمليتان
//    منفصلتان تماماً) — نكرر نفس المنطق الصغير هنا بنفس متغيرات env. ───
async function _sendWhatsApp(to, text) {
  const TOKEN = process.env.WHATSAPP_TOKEN || '';
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
  if (!TOKEN || !PHONE_ID || !to) {
    return { ok: false, error: 'WhatsApp غير مُعدّ (WHATSAPP_TOKEN/WHATSAPP_PHONE_ID) أو لا رقم هاتف' };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data.error && data.error.message) || ('http_' + res.status) };
    return { ok: true, messageId: data.messages && data.messages[0] && data.messages[0].id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── إرسال SMS — نفس حساب Twilio المستخدم فعلياً للمكالمات الصوتية في
//    rizq_call_handler.js (عملية منفصلة تماماً عن rizq-backend)، بنفس
//    متغيرات env (TWILIO_SID/TWILIO_TOKEN/RIZQ_TWILIO_NUMBER) — رقم واحد
//    مُستأجر يكفي للمكالمات والـSMS معاً، لا حاجة لأي اشتراك إضافي. لن
//    يعمل فعلياً حتى تُضاف بيانات اعتماد حقيقية عند النشر (وحسابات Twilio
//    التجريبية لا ترسل إلا لأرقام موثَّقة مسبقاً لدى Twilio). ─────────
let _twilioClient = null;
function _getTwilioClient() {
  if (_twilioClient) return _twilioClient;
  if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN) return null;
  try {
    const twilio = require('twilio');
    _twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
    return _twilioClient;
  } catch (e) {
    console.error('⚠️ twilio غير مثبَّت (npm install twilio):', e.message);
    return null;
  }
}
async function _sendSMS(to, text) {
  const client = _getTwilioClient();
  if (!client || !process.env.RIZQ_TWILIO_NUMBER || !to) {
    return { ok: false, error: 'SMS غير مُعدّ (TWILIO_SID/TWILIO_TOKEN/RIZQ_TWILIO_NUMBER) أو لا رقم هاتف' };
  }
  try {
    const msg = await client.messages.create({ body: text, from: process.env.RIZQ_TWILIO_NUMBER, to });
    return { ok: true, messageId: msg.sid };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── إرسال بريد — nodemailer عبر حساب البريد الرسمي للمنصة (direction@
//    rizq.mr أو ما يُضبط في .env). لن يعمل فعلياً حتى تُضاف بيانات دخول
//    حقيقية (EMAIL_USER/EMAIL_PASS) — نفس قيد WhatsApp/Twilio بالضبط:
//    الكود جاهز، التفعيل الفعلي ينتظر بيانات اعتماد حقيقية عند النشر. ──
let _mailer = null;
function _getMailer() {
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
    console.error('⚠️ nodemailer غير مثبَّت (npm install nodemailer):', e.message);
    return null;
  }
}
async function _sendEmail(to, subject, html) {
  const mailer = _getMailer();
  if (!mailer || !to) {
    return { ok: false, error: 'البريد غير مُعدّ (EMAIL_USER/EMAIL_PASS) أو لا بريد للحساب' };
  }
  try {
    await mailer.sendMail({
      from: process.env.EMAIL_FROM || '"رزق Rizq" <direction@rizq.mr>',
      to, subject, html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function _fmtMoney(n) { n = Number(n) || 0; return n.toLocaleString() + ' MRU'; }
function _fmtDate(iso) { try { return new Date(iso).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }); } catch (e) { return iso || '-'; } }

function _invoiceEmailHTML(inv) {
  return `<div style="font-family:'Segoe UI',Tahoma,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1B3A6B" dir="rtl">
    <div style="font-size:20px;font-weight:800;border-bottom:3px solid #C9A84C;padding-bottom:10px;margin-bottom:14px">رزق <span style="color:#C9A84C">Rizq</span> — إيصال تأكيد دفع</div>
    <p>مرحباً ${_esc(inv.accountName)}،</p>
    <p>تم تفعيل باقة <strong>${_esc(inv.pkgName)}</strong> بنجاح على حسابك.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:14px 0">
      <tr><td style="padding:6px 0;color:#6b7280">رقم الإيصال</td><td style="padding:6px 0;font-weight:700">${_esc(inv.number)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">المبلغ</td><td style="padding:6px 0;font-weight:700;color:#C9A84C">${inv.price > 0 ? _fmtMoney(inv.price) : 'مجاناً'}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280">صالحة حتى</td><td style="padding:6px 0">${_fmtDate(inv.periodEnd)}</td></tr>
    </table>
    <p style="font-size:11px;color:#6b7280">إيصال داخلي يؤكد تفعيل الباقة بعد مراجعة الدفع، وليس فاتورة ضريبية رسمية. لأي استفسار: direction@rizq.mr</p>
  </div>`;
}

// ── مزامنة تفعيل/تجديد باقة قادمة من متصفح المشترك أو من admin.html ────
// opts: { accountId, accountName, accountPhone, accountEmail, accountType,
//         pkgName, price, days, periodStart, periodEnd, activatedBy }
async function syncAccountPackage(opts) {
  opts = opts || {};
  if (!opts.accountId || !opts.pkgName) return { ok: false, error: 'accountId + pkgName مطلوبان' };

  const { mapPackageIdToPlanType, mapPackageNameToPlanType } = require('./services/entitlements');
  const store = _load();
  const existing = store[opts.accountId] || {};
  const accessToken = existing.accessToken || _genToken();
  const accountType = opts.accountType || existing.accountType || 'individual';
  const planType = mapPackageIdToPlanType(opts.packageId, accountType)
    || mapPackageNameToPlanType(opts.pkgName, accountType, opts.packageId);
  const diamondTier = resolveDiamondTier({ id: opts.packageId, pkgName: opts.pkgName, planType });
  const isTrial = opts.isTrial === true || isTrialPackage(opts.pkgName, opts.price);
  const paymentConfirmed = !isTrial && (
    opts.paymentConfirmed === true
    || !!opts.paidAt
    || (opts.activatedBy === 'admin' && opts.paymentConfirmed !== false)
  );

  const invoice = paymentConfirmed ? {
    id: 'INV_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    number: _nextInvoiceNumber(store),
    accountId: opts.accountId,
    accountName: opts.accountName || opts.accountId,
    pkgName: opts.pkgName,
    price: Number(opts.price) || 0,
    periodStart: opts.periodStart || new Date().toISOString(),
    periodEnd: opts.periodEnd || null,
    issuedAt: new Date().toISOString(),
  } : null;

  const record = {
    accountId: opts.accountId,
    accountName: opts.accountName || opts.accountId,
    accountPhone: opts.accountPhone || existing.accountPhone || '',
    accountEmail: opts.accountEmail || existing.accountEmail || '',
    accountType,
    planType,
    diamondTier: diamondTier || existing.diamondTier || null,
    packageId: opts.packageId || existing.packageId || null,
    isTrial,
    subscriptionStatus: isTrial ? 'active' : (paymentConfirmed ? 'active' : 'pending'),
    pkgName: opts.pkgName,
    price: Number(opts.price) || 0,
    periodStart: paymentConfirmed ? (opts.periodStart || new Date().toISOString()) : (existing.periodStart || null),
    periodEnd: paymentConfirmed ? (opts.periodEnd || null) : (existing.periodEnd || null),
    activatedBy: opts.activatedBy || 'admin',
    status: isTrial ? 'active' : (paymentConfirmed ? 'active' : 'pending'),
    paymentConfirmed: !!paymentConfirmed,
    paidAt: paymentConfirmed ? (opts.paidAt || new Date().toISOString()) : null,
    pendingSince: paymentConfirmed ? null : (existing.pendingSince || new Date().toISOString()),
    reminderSentAt: paymentConfirmed ? null : existing.reminderSentAt,
    suspendedAt: null,
    downgradedAt: null,
    accessToken,
    invoices: invoice
      ? [invoice].concat(existing.invoices || []).slice(0, 50)
      : (existing.invoices || []),
  };
  store[opts.accountId] = record;
  _save(store);

  try {
    const { onSubscriptionActivated, onSubscriptionExpired } = require('./services/apiIntegration');
    if (paymentConfirmed && planType === 'corp_diamond_pro' && accountType === 'corp') {
      onSubscriptionActivated(opts.accountId, accountType, planType);
    } else if (!paymentConfirmed || planType !== 'corp_diamond_pro' || accountType !== 'corp') {
      onSubscriptionExpired(opts.accountId);
    }
  } catch (apiErr) {
    console.warn('[syncAccountPackage] api integration:', apiErr.message);
  }

  const results = { whatsapp: null, email: null };
  if (paymentConfirmed && invoice) {
    if (record.accountPhone) {
      results.whatsapp = await _sendWhatsApp(record.accountPhone,
        `📞 رزق: تم تفعيل باقة "${record.pkgName}" بنجاح ✅\nرقم الإيصال: ${invoice.number}\nالمبلغ: ${invoice.price > 0 ? _fmtMoney(invoice.price) : 'مجاناً'}\nصالحة حتى: ${_fmtDate(invoice.periodEnd)}`);
    }
    if (record.accountEmail) {
      results.email = await _sendEmail(record.accountEmail, `رزق — تأكيد تفعيل باقة ${record.pkgName} (${invoice.number})`, _invoiceEmailHTML(invoice));
    }
  }

  return {
    ok: true,
    invoice,
    accessToken,
    delivery: results,
    status: record.status,
    paymentConfirmed: record.paymentConfirmed,
  };
}

/** طلب اشتراك جديد — pending حتى تأكيد الدفع من الأدمن */
function createPendingPackageFromRequest(opts) {
  opts = opts || {};
  if (!opts.accountId || !opts.pkgName) return { ok: false, error: 'accountId + pkgName مطلوبان' };

  const { mapPackageIdToPlanType, mapPackageNameToPlanType } = require('./services/entitlements');
  const store = _load();
  const existing = store[opts.accountId] || {};
  const endMs = existing.periodEnd ? new Date(existing.periodEnd).getTime() : NaN;
  if (existing.paymentConfirmed && !Number.isNaN(endMs) && endMs > Date.now()
      && ['active', 'expiring_soon'].includes(existing.status)) {
    return { ok: true, skipped: true, reason: 'subscription_still_active' };
  }

  const accountType = opts.accountType || existing.accountType || 'individual';
  const accessToken = existing.accessToken || _genToken();
  const record = Object.assign({}, existing, {
    accountId: opts.accountId,
    accountName: opts.accountName || existing.accountName || opts.accountId,
    accountPhone: opts.accountPhone || existing.accountPhone || '',
    accountEmail: opts.accountEmail || existing.accountEmail || '',
    accountType,
    planType: mapPackageIdToPlanType(opts.packageId, accountType)
      || mapPackageNameToPlanType(opts.pkgName, accountType, opts.packageId),
    pkgName: opts.pkgName,
    price: Number(opts.price) || 0,
    status: 'pending',
    subscriptionStatus: 'pending',
    paymentConfirmed: false,
    paidAt: null,
    pendingSince: new Date().toISOString(),
    pendingRequestId: opts.requestId || null,
    accessToken,
  });
  store[opts.accountId] = record;
  _save(store);
  return { ok: true, status: 'pending', accessToken: record.accessToken };
}

function getAccountRecord(accountId) {
  const store = _load();
  return store[accountId] || null;
}

// ── يُستخدم فقط من نقطة الملخص اليومي (/api/admin/daily-digest) لعرض
//    عدد الحسابات التي أوشكت باقتها على الانتهاء أو أُوقِفت فعلاً — لا
//    تُستخدم في أي مسار عام (لا تُعيد accessToken الحساس، فقط الحالة). ──
function getAllAccountPackageRecords() {
  const store = _load();
  const out = {};
  Object.keys(store).forEach((id) => {
    const { accessToken, ...safe } = store[id] || {};
    out[id] = safe;
  });
  return out;
}

// ── برنامج الإحالة (جيب صاحبك واربح) — ميزة جديدة 28/07/2026 ──────────
// حساب A يُحيل حساب B عبر رابط (?ref=A) عند التسجيل. أول مرة يصبح فيها B
// مشتركاً مدفوعاً فعلاً (وليس تجريبياً) — يُمنح A أيام مجانية إضافية تُضاف
// مباشرة فوق تاريخ انتهاء باقته الحالية هنا في account-packages.json (نفس
// المخزن الذي يتحكم فعلياً بحالة النشاط/الإيقاف). لا علاقة لهذا بمن يستحق
// المكافأة أكثر من مرة لنفس B — ذلك يُضبط من طرف الاستدعاء (accounts.json
// عبر علم referralBonusGranted) لأن هذا الملف لا يملك معرفة "من أحال من"،
// فقط "كيف نمدّد باقة حساب موجود".
const REFERRAL_BONUS_DAYS = 15;
function applyReferralBonusDays(referrerAccountId, bonusDays) {
  if (!referrerAccountId) return { ok: false, error: 'no referrer id' };
  const store = _load();
  const rec = store[referrerAccountId];
  // لا نمنح مكافأة إن لم يكن للمُحيل أي باقة مفعَّلة من قبل على الإطلاق —
  // لا يوجد "تاريخ انتهاء" منطقي نمدّده فوقه، ولا نريد إنشاء سجل باقة وهمي.
  if (!rec) return { ok: false, error: 'referrer has no package record yet' };
  const days = Number(bonusDays) || REFERRAL_BONUS_DAYS;
  const baseMs = Math.max(Date.now(), new Date(rec.periodEnd || 0).getTime() || 0);
  rec.periodEnd = new Date(baseMs + days * 86400000).toISOString();
  if (rec.status === 'expired' || rec.status === 'suspended' || rec.status === 'expiring_soon') {
    rec.status = 'active'; // مكافأة الإحالة تُعيد تفعيل الباقة إن كانت أوشكت على الانتهاء/توقفت
  }
  rec.referralBonusDaysTotal = (rec.referralBonusDaysTotal || 0) + days;
  store[referrerAccountId] = rec;
  _save(store);
  console.log('[RIZQ-REFERRAL] +' + days + ' يوم لحساب ' + referrerAccountId + ' (مكافأة إحالة) → ينتهي الآن ' + rec.periodEnd);
  return { ok: true, newPeriodEnd: rec.periodEnd };
}

// ── التحقق الحقيقي (من طرف الخادم) من "هل هذا الحساب مشترك ماسي فعّال؟" ──
// إصلاح جوهري 27/07/2026: ميزات الباقة الماسية الحصرية (وكيل ذكي كامل في
// المكالمات AI/واتساب، رد تلقائي على المكالمات/البريد، مدير حساب VIP) كانت
// جميعها بلا أي تحقق فعلي — الاعتماد كان فقط على تسجيل يدوي حرّ من الأدمن
// في rizq_admin.html (حقل "معرّف الرقم" + اسم بلا أي ربط بحساب حقيقي)، أو
// على فحص من طرف المتصفح فقط (rizq_secretary_agent.js) يمكن تجاوزه بسهولة
// من أي عملية Node منفصلة (خادم المكالمات/البريد) لا ترى localStorage إطلاقاً.
// هذه الدالة تصبح مصدر الحقيقة الوحيد من طرف الخادم — تُستخدم من
// rizq_call_handler.js (عبر /api/account-package/diamond-status-batch أدناه)
// وتُبنى فوق نفس account-packages.json المُغذّى فعلياً من كل تفعيل حقيقي.
const DIAMOND_ACTIVE_STATUSES = ['active', 'expiring_soon'];

function isPackageAccessActive(accountId) {
  if (!accountId) return false;
  const rec = getAccountRecord(accountId);
  if (!rec) return false;
  const { getSubscriptionStatus, isPaymentConfirmed } = require('./services/entitlements');
  const status = getSubscriptionStatus(rec);
  if (status === 'pending' || status === 'expired' || status === 'suspended' || status === 'no_subscription') {
    return false;
  }
  if (!isPaymentConfirmed(rec) && !rec.paidAt && !rec.isTrial) return false;
  const endMs = rec.periodEnd ? new Date(rec.periodEnd).getTime() : NaN;
  if (!rec.periodEnd || Number.isNaN(endMs) || endMs <= Date.now()) return false;
  return DIAMOND_ACTIVE_STATUSES.includes(rec.status) || status === 'active' || status === 'expiring_soon';
}

function isDiamondActive(accountId) {
  if (!isPackageAccessActive(accountId)) return false;
  const rec = getAccountRecord(accountId);
  if (!rec) return false;
  if (rec.isTrial || isTrialPackage(rec.pkgName, rec.price)) return false;
  const { isPaymentConfirmed } = require('./services/entitlements');
  if (!isPaymentConfirmed(rec)) return false;
  const isDiamondPkg = /(ماس|diamond|diamant)/i.test(rec.pkgName || rec.planType || '')
    || rec.diamondTier === 'diamond_standard' || rec.diamondTier === 'diamond_pro';
  return isDiamondPkg;
}

// ── لائحة كل المشتركين الذين لديهم رقم هاتف حقيقي مسجَّل — هذا هو المصدر
//    الوحيد المرئي للخادم لأرقام هواتف المشتركين (بيانات localStorage في
//    متصفح الأدمن غير مرئية للخادم إطلاقاً؛ المزامنة تحدث فقط عند تفعيل
//    باقة، انظر syncAccountPackage). تُستخدَم لبثّ SMS ترويجي يدوي من
//    الأدمن (broadcastSMS) — ليست قائمة بريدية تلقائية. ──────────────
function getAllSubscribersWithPhone() {
  const store = _load();
  const out = [];
  for (const accountId of Object.keys(store)) {
    if (accountId === '__invoiceSeq') continue;
    const rec = store[accountId];
    if (!rec || !rec.accountPhone) continue;
    out.push({ accountId, accountName: rec.accountName, accountPhone: rec.accountPhone, status: rec.status });
  }
  return out;
}

// ── بثّ SMS ترويجي يدوي — يُستدعى فقط بأمر صريح من الأدمن (زر "إرسال" في
//    rizq_admin.html)، ليس تلقائياً ولا مجدولاً بأي شكل. opts:
//    { message, filterStatus } — filterStatus اختياري (active/trial/
//    expiring_soon/expired/suspended)، أو محذوف/'all' لكل من له رقم هاتف.
async function broadcastSMS(opts) {
  opts = opts || {};
  const message = String(opts.message || '').trim();
  if (!message) return { ok: false, error: 'message مطلوب' };

  let recipients = getAllSubscribersWithPhone();
  if (opts.filterStatus && opts.filterStatus !== 'all') {
    recipients = recipients.filter((r) => r.status === opts.filterStatus);
  }

  const results = await Promise.all(recipients.map(async (r) => {
    const res = await _sendSMS(r.accountPhone, message);
    return { accountId: r.accountId, ok: res.ok, error: res.ok ? undefined : res.error };
  }));

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  return { ok: true, sent, failed, results };
}

// ── الفحص الدوري — يُستدعى كل ساعة من server.js عبر setInterval ────────
async function runLifecycleScan(accountsHelpers) {
  const { buildDowngradePatch } = require('./services/entitlements');
  const store = _load();
  const now = Date.now();
  let changed = false;

  for (const accountId of Object.keys(store)) {
    if (accountId === '__invoiceSeq') continue;
    const rec = store[accountId];
    if (!rec || !rec.periodEnd || rec.status === 'suspended' || rec.status === 'expired') continue;

    const endMs = new Date(rec.periodEnd).getTime();
    if (Number.isNaN(endMs)) continue;
    const daysLeft = (endMs - now) / (24 * 60 * 60 * 1000);

    // تذكير قبل الانتهاء (3 أيام ثم يوم واحد) — مرة واحدة لكل نافذة
    if (daysLeft > 0 && REMINDER_WINDOWS_DAYS.some((w) => daysLeft <= w)) {
      const lastReminderAgeMs = rec.reminderSentAt ? now - new Date(rec.reminderSentAt).getTime() : Infinity;
      if (lastReminderAgeMs > 20 * 60 * 60 * 1000) { // لا نكرر نفس التذكير خلال أقل من 20 ساعة
        const daysRounded = Math.max(1, Math.ceil(daysLeft));
        const msg = `⏰ رزق: باقتك "${rec.pkgName}" تنتهي خلال ${daysRounded} ${daysRounded === 1 ? 'يوم' : 'أيام'}. جدّدها الآن لتجنّب إيقاف الميزات.`;
        if (rec.accountPhone) await _sendWhatsApp(rec.accountPhone, msg);
        if (rec.accountEmail) await _sendEmail(rec.accountEmail, 'رزق — تذكير بقرب انتهاء الباقة', `<p dir="rtl">${msg}</p>`);
        rec.status = 'expiring_soon';
        rec.subscriptionStatus = 'expiring_soon';
        rec.reminderSentAt = new Date(now).toISOString();
        changed = true;
      }
    } else if (daysLeft <= 0) {
      // إيقاف فوري — لا مهلة سماح (تكاليف AI/مكالمات مباشرة على المنصة)
      const downgradePatch = buildDowngradePatch();
      rec.status = 'expired';
      rec.subscriptionStatus = 'expired';
      rec.planType = downgradePatch.planType;
      rec.downgradedAt = downgradePatch.downgradedAt;
      rec.expiredAt = new Date(now).toISOString();
      const msg = `🔒 رزق: انتهت باقة "${rec.pkgName}". تم إيقاف جميع الميزات فوراً. جدّد الآن لاستعادتها.`;
      if (rec.accountPhone) await _sendWhatsApp(rec.accountPhone, msg);
      if (rec.accountEmail) await _sendEmail(rec.accountEmail, 'رزق — انتهت باقتك', `<p dir="rtl">${msg}</p>`);
      _applyServerAccountDowngrade(accountId, rec, accountsHelpers, 'expired');
      try {
        const { onSubscriptionExpired } = require('./services/apiIntegration');
        onSubscriptionExpired(accountId);
      } catch (apiErr) {
        console.warn('[lifecycle] api key suspend:', apiErr.message);
      }
      changed = true;
    }
  }

  if (changed) _save(store);
  return { ok: true, scannedAt: new Date(now).toISOString() };
}

function _applyServerAccountDowngrade(accountId, rec, accountsHelpers, subscriptionStatus) {
  if (!accountsHelpers || typeof accountsHelpers.readAccounts !== 'function') return;
  try {
    const accounts = accountsHelpers.readAccounts();
    const idx = accounts.findIndex((a) => a.id === accountId);
    if (idx < 0) return;
    accounts[idx].planType = 'free';
    accounts[idx].subscriptionStatus = subscriptionStatus;
    accounts[idx].pkg_status = subscriptionStatus === 'suspended' ? 'suspended' : 'expired';
    accounts[idx].downgradedAt = new Date().toISOString();
    if (subscriptionStatus === 'expired' || subscriptionStatus === 'suspended') {
      accounts[idx].expired_pkg = accounts[idx].package || rec.pkgName;
    }
    accountsHelpers.writeAccounts(accounts);
  } catch (e) {
    console.error('[lifecycle-downgrade] accounts.json:', e.message);
  }
}

// ── نقاط الـ API ────────────────────────────────────────────────────
// accountsHelpers (اختياري): { readAccounts, writeAccounts } من server.js —
// مطلوب فقط لتفعيل مكافأة الإحالة (تحتاج قراءة/كتابة accounts.json الذي لا
// يملكه هذا الملف). إن لم يُمرَّر، تُستثنى منطقة الإحالة بصمت بلا أي كسر.
function setupPackageLifecycleAPI(app, requireSharedSecret, accountsHelpers) {
  // مزامنة تفعيل/تجديد — تُستدعى من rizq_subscription_engine.js (activatePackage)
  // أو من admin.html عند موافقة الأدمن على طلب اشتراك. محمية بسرّ الأدمن
  // (نفس BACKEND_SHARED_SECRET المستخدم لبقية نقاط لوحة الأدمن).
  app.post('/api/account-package/sync', requireSharedSecret, async (req, res) => {
    try {
      const result = await syncAccountPackage(req.body || {});
      if (!result.ok) return res.status(400).json(result);

      // ── مكافأة الإحالة: فقط عند أول تفعيل مدفوع فعلي (price>0) لهذا
      // الحساب، ومرة واحدة فقط لكل حساب مُحال (علم referralBonusGranted
      // في accounts.json يمنع تكرارها عند كل تجديد لاحق). ─────────────
      try {
        const accountId = (req.body || {}).accountId;
        const price = Number((req.body || {}).price) || 0;
        if (price > 0 && accountsHelpers && typeof accountsHelpers.readAccounts === 'function') {
          const accounts = accountsHelpers.readAccounts();
          const idx = accounts.findIndex((a) => a.id === accountId);
          if (idx > -1) {
            const acc = accounts[idx];
            if (acc.referredBy && !acc.referralBonusGranted) {
              const bonus = applyReferralBonusDays(acc.referredBy, REFERRAL_BONUS_DAYS);
              if (bonus.ok) {
                acc.referralBonusGranted = true;
                accounts[idx] = acc;
                accountsHelpers.writeAccounts(accounts);
              }
            }
          }
        }
      } catch (refErr) {
        console.error('[referral-bonus] error:', refErr.message); // لا نُفشل التفعيل نفسه أبداً بسبب هذا
      }

      res.json(result);
    } catch (err) {
      console.error('[account-package/sync] error:', err.message);
      res.status(500).json({ error: 'فشل حفظ بيانات الباقة' });
    }
  });

  // قراءة حالة/فواتير حساب — محمية بـ accessToken خاص بهذا الحساب فقط
  // (وليس سرّ الأدمن العام) لأن هذه النقطة تُستدعى من داشبورد المشترك
  // نفسه، وأي سرّ يُضمَّن في تلك الصفحة يصبح مرئياً لكل زائر لها.
  app.get('/api/account-package/:id', (req, res) => {
    const rec = getAccountRecord(req.params.id);
    if (!rec) return res.status(404).json({ error: 'لا يوجد سجل باقة لهذا الحساب' });
    const token = req.header('x-account-token') || req.query.token;
    if (!token || token !== rec.accessToken) return res.status(401).json({ error: 'unauthorized' });
    const { accessToken, ...safe } = rec; // لا نُعيد التوكن نفسه في الرد
    let entitlements = null;
    try {
      const { getEntitlements } = require('./services/entitlements');
      entitlements = getEntitlements(req.params.id, rec.accountType, rec);
    } catch (e) { /* optional */ }
    res.json({ ok: true, account: safe, entitlements });
  });

  // ── فحص جماعي لحالة "الباقة الماسية" — يستدعيه خادم المكالمات
  // (rizq_call_handler.js، عملية Node منفصلة تماماً لا ترى هذا الملف ولا
  // localStorage) دورياً ليعرف أي مشتركين مسجَّلين لديه فعلاً باقة ماسية
  // نشطة قبل تفعيل أي رد شخصي بشخصية المنشأة. محمي بسرّ الأدمن العام لأنه
  // يُستدعى من خادم موثوق (لا من متصفح الزوار).
  app.post('/api/account-package/diamond-status-batch', requireSharedSecret, (req, res) => {
    const ids = Array.isArray((req.body || {}).accountIds) ? req.body.accountIds.slice(0, 300) : [];
    const statuses = {};
    ids.forEach((id) => { statuses[String(id)] = isDiamondActive(id); });
    res.json({ ok: true, statuses });
  });
}

module.exports = {
  syncAccountPackage,
  createPendingPackageFromRequest,
  getAccountRecord,
  getAllAccountPackageRecords,
  isPackageAccessActive,
  isDiamondActive,
  getAllSubscribersWithPhone,
  broadcastSMS,
  runLifecycleScan,
  setupPackageLifecycleAPI,
  sendSMS: _sendSMS,
  sendWhatsApp: _sendWhatsApp,
  applyReferralBonusDays,
  REFERRAL_BONUS_DAYS,
};
