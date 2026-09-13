'use strict';

const { normalizeRole } = require('./adminRoles');

/**
 * Load admin accounts from environment — never hardcode production credentials.
 *
 * Supported formats:
 * 1) ADMIN_ACCOUNTS_JSON='[{"user":"admin","passHash":"$2a$...","name":"...","role":"super"}]'
 * 2) Per-account (حتى 20):
 *    ADMIN_USER_1=m.limam
 *    ADMIN_PASS_HASH_1=$2a$...
 *    ADMIN_NAME_1=M. LIMAM
 *    ADMIN_ROLE_1=super
 *    ADMIN_USER_2=finance.desk
 *    ADMIN_ROLE_2=finance
 *    ADMIN_USER_3=commercial.desk
 *    ADMIN_ROLE_3=commercial
 *
 * الأدوار: super | admin | commercial | finance | moderator | support
 * Optional DEV fallbacks (non-production only) via ADMIN_DEV_ACCOUNTS_JSON.
 */
function parseJsonEnv(raw) {
  if (!raw || !String(raw).trim()) return null;
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function normalizeAccount(row) {
  if (!row || typeof row !== 'object') return null;
  const user = String(row.user || row.username || '').trim();
  const passHash = String(row.passHash || row.passwordHash || '').trim();
  if (!user || !passHash || !passHash.startsWith('$2')) return null;
  return {
    user,
    passHash,
    name: String(row.name || user).trim().slice(0, 80),
    role: normalizeRole(row.role || 'moderator'),
  };
}

function loadFromIndexedEnv() {
  const out = [];
  for (let i = 1; i <= 20; i++) {
    const user = process.env['ADMIN_USER_' + i];
    const passHash = process.env['ADMIN_PASS_HASH_' + i];
    if (!user && !passHash) continue;
    const acc = normalizeAccount({
      user,
      passHash,
      name: process.env['ADMIN_NAME_' + i],
      role: process.env['ADMIN_ROLE_' + i],
    });
    if (acc) out.push(acc);
  }
  return out;
}

function loadAdminAccounts() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.RIZQ_ENV === 'production';
  const fromJson = (parseJsonEnv(process.env.ADMIN_ACCOUNTS_JSON) || [])
    .map(normalizeAccount)
    .filter(Boolean);
  const fromIndexed = loadFromIndexedEnv();
  let list = fromJson.concat(fromIndexed);

  // Deduplicate by username (last wins)
  const map = new Map();
  list.forEach((a) => map.set(a.user, a));
  list = Array.from(map.values());

  if (!list.length && !isProd) {
    const dev = (parseJsonEnv(process.env.ADMIN_DEV_ACCOUNTS_JSON) || [])
      .map(normalizeAccount)
      .filter(Boolean);
    if (dev.length) {
      console.warn('[adminAccounts] using ADMIN_DEV_ACCOUNTS_JSON (non-production only)');
      return dev;
    }
    console.warn('[adminAccounts] no admin accounts configured — set ADMIN_ACCOUNTS_JSON or ADMIN_USER_1/ADMIN_PASS_HASH_1');
  }

  if (!list.length && isProd) {
    console.error('[adminAccounts] CRITICAL: no admin accounts in production env');
  }
  return list;
}

module.exports = { loadAdminAccounts, normalizeAccount };
