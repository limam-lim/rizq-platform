/**
 * Passkeys / WebAuthn credentials — مشترٍ وبائع
 */
'use strict';

const crypto = require('crypto');
const { db } = require('../db');

function genId() {
  return 'pk_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}

function rowToPublic(row) {
  if (!row) return null;
  let transports = [];
  try { transports = JSON.parse(row.transports || '[]'); } catch (e) { transports = []; }
  return {
    id: row.id,
    userKind: row.user_kind,
    userId: row.user_id,
    credentialId: row.credential_id,
    deviceType: row.device_type || '',
    backedUp: !!row.backed_up,
    friendlyName: row.friendly_name || '',
    transports: Array.isArray(transports) ? transports : [],
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at || null,
  };
}

function listByUser(userKind, userId) {
  return db.prepare(
    'SELECT * FROM user_passkeys WHERE user_kind = ? AND user_id = ? ORDER BY created_at DESC'
  ).all(String(userKind), String(userId)).map(rowToPublic);
}

function listCredentialDescriptors(userKind, userId) {
  return db.prepare(
    'SELECT credential_id, transports FROM user_passkeys WHERE user_kind = ? AND user_id = ?'
  ).all(String(userKind), String(userId)).map((row) => {
    let transports = [];
    try { transports = JSON.parse(row.transports || '[]'); } catch (e) { transports = []; }
    return {
      id: row.credential_id,
      type: 'public-key',
      transports: Array.isArray(transports) ? transports : undefined,
    };
  });
}

function findByCredentialId(credentialId) {
  const row = db.prepare('SELECT * FROM user_passkeys WHERE credential_id = ?').get(String(credentialId));
  return row || null;
}

function insertPasskey(fields) {
  const id = genId();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_passkeys (
      id, user_kind, user_id, credential_id, public_key, counter, transports,
      device_type, backed_up, friendly_name, created_at, last_used_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    String(fields.userKind),
    String(fields.userId),
    String(fields.credentialId),
    String(fields.publicKey),
    Number(fields.counter) || 0,
    JSON.stringify(fields.transports || []),
    String(fields.deviceType || ''),
    fields.backedUp ? 1 : 0,
    String(fields.friendlyName || '').slice(0, 80),
    now,
    now
  );
  return findByCredentialId(fields.credentialId);
}

function updateCounter(credentialId, newCounter) {
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE user_passkeys SET counter = ?, last_used_at = ? WHERE credential_id = ?'
  ).run(Number(newCounter) || 0, now, String(credentialId));
}

function removeById(id, userKind, userId) {
  const r = db.prepare(
    'DELETE FROM user_passkeys WHERE id = ? AND user_kind = ? AND user_id = ?'
  ).run(String(id), String(userKind), String(userId));
  return r.changes > 0;
}

function countByUser(userKind, userId) {
  const row = db.prepare(
    'SELECT COUNT(*) AS n FROM user_passkeys WHERE user_kind = ? AND user_id = ?'
  ).get(String(userKind), String(userId));
  return row ? row.n : 0;
}

function deleteAllForUser(userKind, userId) {
  const r = db.prepare(
    'DELETE FROM user_passkeys WHERE user_kind = ? AND user_id = ?'
  ).run(String(userKind), String(userId));
  return r.changes || 0;
}

/* ── challenges ─────────────────────────────────────────── */

function purgeExpiredChallenges() {
  const now = new Date().toISOString();
  try {
    db.prepare('DELETE FROM webauthn_challenges WHERE expires_at < ?').run(now);
  } catch (e) {}
}

function saveChallenge({ userKind, userId, challenge, purpose, ttlMs }) {
  purgeExpiredChallenges();
  const id = 'chal_' + crypto.randomBytes(12).toString('hex');
  const now = Date.now();
  const ttl = Math.max(60_000, Math.min(Number(ttlMs) || 300_000, 600_000));
  db.prepare(`
    INSERT INTO webauthn_challenges (id, user_kind, user_id, challenge, purpose, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userKind ? String(userKind) : null,
    userId ? String(userId) : null,
    String(challenge),
    String(purpose),
    new Date(now).toISOString(),
    new Date(now + ttl).toISOString()
  );
  return id;
}

function consumeChallenge(challenge, purpose) {
  purgeExpiredChallenges();
  const row = db.prepare(
    'SELECT * FROM webauthn_challenges WHERE challenge = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1'
  ).get(String(challenge), String(purpose));
  if (!row) return null;
  db.prepare('DELETE FROM webauthn_challenges WHERE id = ?').run(row.id);
  if (row.expires_at < new Date().toISOString()) return null;
  return row;
}

module.exports = {
  listByUser,
  listCredentialDescriptors,
  findByCredentialId,
  insertPasskey,
  updateCounter,
  removeById,
  countByUser,
  deleteAllForUser,
  saveChallenge,
  consumeChallenge,
  rowToPublic,
};
