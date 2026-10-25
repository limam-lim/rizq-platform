/**
 * إشعارات المشتري متعددة القنوات — SMS / WhatsApp / Email / Push / سجل داخلي
 */
'use strict';

const { db } = require('../db');

db.exec(`
  CREATE TABLE IF NOT EXISTS notification_log (
    id          TEXT PRIMARY KEY,
    user_kind   TEXT NOT NULL DEFAULT 'buyer',
    user_id     TEXT NOT NULL DEFAULT '',
    channel     TEXT NOT NULL,
    template    TEXT NOT NULL DEFAULT '',
    destination TEXT NOT NULL DEFAULT '',
    body        TEXT NOT NULL DEFAULT '',
    ok          INTEGER NOT NULL DEFAULT 0,
    detail      TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
  );
`);

function logNotif(row) {
  const crypto = require('crypto');
  try {
    db.prepare(`
      INSERT INTO notification_log (id, user_kind, user_id, channel, template, destination, body, ok, detail, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ntf_' + crypto.randomBytes(6).toString('hex'),
      row.userKind || 'buyer',
      row.userId || '',
      row.channel || '',
      row.template || '',
      row.destination || '',
      String(row.body || '').slice(0, 1000),
      row.ok ? 1 : 0,
      String(row.detail || '').slice(0, 400),
      new Date().toISOString()
    );
  } catch (e) {}
}

const ORDER_TEMPLATES = {
  new: {
    ar: (o) => 'تم استلام طلبك بنجاح #' + o.orderNumber + ' — إجمالي ' + o.total + ' ' + (o.currency || 'MRU'),
    fr: (o) => 'Commande reçue #' + o.orderNumber + ' — total ' + o.total + ' ' + (o.currency || 'MRU'),
  },
  accepted: {
    ar: (o) => 'تم قبول طلبك #' + o.orderNumber + ' وهو قيد التحضير',
    fr: (o) => 'Commande #' + o.orderNumber + ' acceptée et en préparation',
  },
  out_for_delivery: {
    ar: (o) => 'خرج طلبك #' + o.orderNumber + ' للتوصيل مع المندوب',
    fr: (o) => 'Commande #' + o.orderNumber + ' en cours de livraison',
  },
  completed: {
    ar: (o) => 'تم تسليم الطلب #' + o.orderNumber + ' بنجاح — شكراً لثقتكم برزق',
    fr: (o) => 'Commande #' + o.orderNumber + ' livrée avec succès',
  },
  cancelled: {
    ar: (o) => 'تم إلغاء الطلب #' + o.orderNumber,
    fr: (o) => 'Commande #' + o.orderNumber + ' annulée',
  },
  disputed: {
    ar: (o) => 'تم فتح نزاع على الطلب #' + o.orderNumber + ' — فريق رزق يراجع الحالة',
    fr: (o) => 'Litige ouvert sur #' + o.orderNumber,
  },
};

function renderOrderMessage(order, status, lang) {
  const tpl = ORDER_TEMPLATES[status] || ORDER_TEMPLATES.new;
  const fn = (lang === 'fr' ? tpl.fr : tpl.ar) || tpl.ar;
  return fn(order);
}

async function sendEmail(to, subject, text) {
  if (!to || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { ok: false, detail: 'email_not_configured' };
  }
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: subject || 'رزق',
      text,
    });
    return { ok: true, detail: 'sent' };
  } catch (e) {
    return { ok: false, detail: e.message || 'email_failed' };
  }
}

async function sendSms(phone, text) {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from = process.env.RIZQ_TWILIO_NUMBER;
  if (!sid || !token || !from || !phone) {
    return { ok: false, detail: 'sms_not_configured' };
  }
  try {
    const twilio = require('twilio')(sid, token);
    await twilio.messages.create({ from, to: phone, body: String(text).slice(0, 320) });
    return { ok: true, detail: 'sent' };
  } catch (e) {
    return { ok: false, detail: e.message || 'sms_failed' };
  }
}

async function sendWhatsApp(phone, text) {
  // Twilio WhatsApp إن وُجد، وإلا نسجّل فقط (الواجهة تفتح wa.me عند الحاجة)
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from = process.env.RIZQ_TWILIO_WHATSAPP || process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from || !phone) {
    return { ok: false, detail: 'whatsapp_not_configured' };
  }
  try {
    const twilio = require('twilio')(sid, token);
    const to = phone.startsWith('whatsapp:') ? phone : ('whatsapp:' + phone);
    const fr = from.startsWith('whatsapp:') ? from : ('whatsapp:' + from);
    await twilio.messages.create({ from: fr, to, body: String(text).slice(0, 900) });
    return { ok: true, detail: 'sent' };
  } catch (e) {
    return { ok: false, detail: e.message || 'whatsapp_failed' };
  }
}

async function sendWebPush(userKind, userId, payload) {
  try {
    const Push = require('../models/pushSubscription');
    return await Push.sendToUser(userKind, userId, payload);
  } catch (e) {
    return { ok: false, detail: e.message || 'push_failed', sent: 0 };
  }
}

/**
 * إشعار مشترٍ بحالة طلب — يحاول SMS ثم واتساب ثم بريد ثم Push
 */
async function notifyBuyerOrderStatus(order, status, buyerProfile) {
  const lang = (buyerProfile && buyerProfile.lang) || 'ar';
  const body = renderOrderMessage(order, status || order.status, lang);
  const userId = order.buyerId || (buyerProfile && buyerProfile.id) || '';
  const phone = (buyerProfile && (buyerProfile.phoneIntl || buyerProfile.whatsapp || buyerProfile.phone)) || order.delivery?.phone || '';
  const email = (buyerProfile && buyerProfile.email) || '';
  const results = [];

  let normalizedPhone = String(phone || '').trim();
  if (/^\d{8}$/.test(normalizedPhone)) normalizedPhone = '+222' + normalizedPhone;

  const sms = await sendSms(normalizedPhone, body);
  logNotif({ userKind: 'buyer', userId, channel: 'sms', template: status, destination: normalizedPhone, body, ok: sms.ok, detail: sms.detail });
  results.push({ channel: 'sms', ...sms });

  if (!sms.ok) {
    const wa = await sendWhatsApp(normalizedPhone, body);
    logNotif({ userKind: 'buyer', userId, channel: 'whatsapp', template: status, destination: normalizedPhone, body, ok: wa.ok, detail: wa.detail });
    results.push({ channel: 'whatsapp', ...wa });
  }

  const mail = await sendEmail(email, 'رزق — تحديث الطلب #' + order.orderNumber, body);
  logNotif({ userKind: 'buyer', userId, channel: 'email', template: status, destination: email, body, ok: mail.ok, detail: mail.detail });
  results.push({ channel: 'email', ...mail });

  const push = await sendWebPush('buyer', userId, {
    title: 'رزق',
    body,
    data: { orderId: order.id, orderNumber: order.orderNumber, status },
  });
  logNotif({
    userKind: 'buyer',
    userId,
    channel: 'push',
    template: status,
    destination: userId,
    body,
    ok: !!(push && push.ok),
    detail: (push && (push.detail || String(push.sent || 0))) || '',
  });
  results.push({ channel: 'push', ok: !!(push && push.ok), detail: push });

  // سجل داخلي دائماً — يظهر في حسابي كتنبيه محفوظ
  logNotif({
    userKind: 'buyer',
    userId,
    channel: 'in_app',
    template: status,
    destination: userId,
    body,
    ok: true,
    detail: 'logged',
  });
  results.push({ channel: 'in_app', ok: true });

  return { ok: results.some((r) => r.ok), body, results };
}

function listInApp(userKind, userId, { limit = 30 } = {}) {
  return db.prepare(`
    SELECT id, channel, template, body, created_at AS createdAt, ok
    FROM notification_log
    WHERE user_kind = ? AND user_id = ? AND channel = 'in_app'
    ORDER BY created_at DESC LIMIT ?
  `).all(String(userKind), String(userId), Math.min(100, limit));
}

module.exports = {
  notifyBuyerOrderStatus,
  renderOrderMessage,
  sendEmail,
  sendSms,
  sendWhatsApp,
  sendWebPush,
  listInApp,
  ORDER_TEMPLATES,
};
