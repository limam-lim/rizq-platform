/**
 * اشتراكات Web Push
 */
'use strict';

const crypto = require('crypto');
const webpush = require('web-push');
const { db } = require('../db');

let _vapidReady = false;

function ensureVapid() {
  if (_vapidReady) return true;
  let publicKey = process.env.VAPID_PUBLIC_KEY || '';
  let privateKey = process.env.VAPID_PRIVATE_KEY || '';
  const subject = process.env.VAPID_SUBJECT || 'mailto:direction@rizq.mr';
  if (!publicKey || !privateKey) {
    // توليد مفاتيح تطوير ثابتة في الذاكرة إن لم تُضبط — للتجربة المحلية فقط
    if (process.env.NODE_ENV === 'production' || process.env.RIZQ_ENV === 'production') {
      return false;
    }
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    process.env.VAPID_PUBLIC_KEY = publicKey;
    process.env.VAPID_PRIVATE_KEY = privateKey;
    console.warn('[push] generated ephemeral VAPID keys for development');
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    _vapidReady = true;
    return true;
  } catch (e) {
    console.warn('[push] vapid setup failed:', e.message);
    return false;
  }
}

function getPublicKey() {
  ensureVapid();
  return process.env.VAPID_PUBLIC_KEY || '';
}

function upsert({ userKind, userId, subscription, userAgent }) {
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    const err = new Error('اشتراك Push غير صالح');
    err.status = 400;
    err.code = 'INVALID_SUB';
    throw err;
  }
  const endpoint = String(subscription.endpoint);
  const p256dh = String(subscription.keys.p256dh || '');
  const auth = String(subscription.keys.auth || '');
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').get(endpoint);
  if (existing) {
    db.prepare(`
      UPDATE push_subscriptions
      SET user_kind = ?, user_id = ?, p256dh = ?, auth = ?, user_agent = ?, last_used_at = ?
      WHERE endpoint = ?
    `).run(userKind, userId, p256dh, auth, String(userAgent || '').slice(0, 200), now, endpoint);
    return existing.id;
  }
  const id = 'push_' + crypto.randomBytes(8).toString('hex');
  db.prepare(`
    INSERT INTO push_subscriptions (id, user_kind, user_id, endpoint, p256dh, auth, user_agent, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userKind, userId, endpoint, p256dh, auth, String(userAgent || '').slice(0, 200), now, now);
  return id;
}

function removeEndpoint(endpoint) {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(String(endpoint || ''));
}

function listByUser(userKind, userId) {
  return db.prepare(
    'SELECT id, endpoint, created_at AS createdAt FROM push_subscriptions WHERE user_kind = ? AND user_id = ?'
  ).all(String(userKind), String(userId));
}

async function sendToUser(userKind, userId, payload) {
  if (!ensureVapid()) return { ok: false, detail: 'vapid_missing', sent: 0 };
  const rows = db.prepare(
    'SELECT * FROM push_subscriptions WHERE user_kind = ? AND user_id = ?'
  ).all(String(userKind), String(userId));
  if (!rows.length) return { ok: false, detail: 'no_subscriptions', sent: 0 };
  const body = JSON.stringify(payload || { title: 'رزق', body: '' });
  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        body,
        { TTL: 60 * 60 }
      );
      sent += 1;
      db.prepare('UPDATE push_subscriptions SET last_used_at = ? WHERE id = ?')
        .run(new Date().toISOString(), row.id);
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(row.id);
      }
    }
  }
  return { ok: sent > 0, sent, detail: sent ? 'sent' : 'all_failed' };
}

module.exports = {
  ensureVapid,
  getPublicKey,
  upsert,
  removeEndpoint,
  listByUser,
  sendToUser,
};
