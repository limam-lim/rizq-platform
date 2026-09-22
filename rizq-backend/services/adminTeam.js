/**
 * adminTeam.js — فريق الإدارة + صلاحيات ديناميكية
 * التخزين عبر repos (SQLite).
 */
'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {
  MAX_TEAM_MEMBERS,
  PERMISSION_DEFS,
  PERMISSION_PRESETS,
  normalizePermissions,
  hasAdminPermission,
  permissionsForLegacyRole,
} = require('./adminPermissions');
const repos = require('../db/repos');

function genAdminId() {
  return 'adm_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
}

function readTeam() {
  return repos.adminTeam.list();
}

function writeTeam(list) {
  const rows = Array.isArray(list) ? list : [];
  repos.adminTeam.replaceAll(rows.map((m) => ({
    id: String(m.id || genAdminId()),
    data: m,
  })));
}

function publicMember(row) {
  if (!row) return null;
  return {
    id: row.id,
    user: row.user,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    notes: row.notes || '',
    permissions: normalizePermissions(row.permissions),
    active: row.active !== false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt || null,
  };
}

function seedFromLegacyAccounts(legacyAccounts) {
  const existing = readTeam();
  if (existing.length) return existing;
  const now = new Date().toISOString();
  const seeded = (legacyAccounts || []).map((acc) => ({
    id: genAdminId(),
    user: acc.user,
    passHash: acc.passHash,
    name: acc.name,
    email: acc.email || (String(acc.user || '').includes('@') ? String(acc.user) : ''),
    phone: '',
    notes: 'ترحيل تلقائي من ADMIN_ACCOUNTS',
    permissions: permissionsForLegacyRole(acc.role || 'moderator'),
    active: true,
    createdAt: now,
    updatedAt: now,
    legacyRole: acc.role || 'staff',
  }));
  if (seeded.length) writeTeam(seeded);
  return seeded;
}

/**
 * يضمن وجود سوبر أدمن المالك (البريد الدائم) في فريق الإدارة.
 * المصدر: SUPER_ADMIN_EMAIL + SUPER_ADMIN_PASS_HASH من .env، أو ownerSpec من الكود.
 *
 * مهم: لا نستبدل passHash الموجود عند كل إقلاع — وإلا تلغى كلمة السر
 * التي غيّرها الأدمن من اللوحة. لإعادة فرض هاش .env استخدم SUPER_ADMIN_FORCE_PASS_HASH=1.
 */
function ensureOwnerSuperAdmin(ownerSpec) {
  const email = String(
    (ownerSpec && ownerSpec.email) || process.env.SUPER_ADMIN_EMAIL || ''
  ).trim().toLowerCase();
  const envPassHash = String(
    (ownerSpec && ownerSpec.passHash) || process.env.SUPER_ADMIN_PASS_HASH || ''
  ).trim();
  const name = String((ownerSpec && ownerSpec.name) || process.env.SUPER_ADMIN_NAME || 'M. LIMAM').trim() || 'M. LIMAM';
  const user = String((ownerSpec && ownerSpec.user) || email).trim().toLowerCase() || email;
  if (!email || !envPassHash || !envPassHash.startsWith('$2')) return readTeam();

  const forcePass = String(process.env.SUPER_ADMIN_FORCE_PASS_HASH || '').trim() === '1'
    || !!(ownerSpec && ownerSpec.forcePassHash);
  const list = readTeam();
  const now = new Date().toISOString();
  let idx = list.findIndex((m) => {
    const e = String(m.email || '').toLowerCase();
    const u = String(m.user || '').toLowerCase();
    return e === email || u === email || u === user;
  });
  if (idx === -1) {
    // ترقية/استبدال حساب admin السابق الوحيد إن وُجد
    idx = list.findIndex((m) => String(m.user || '').toLowerCase() === 'admin' && (m.permissions || []).includes('*'));
  }
  if (idx === -1) {
    list.unshift({
      id: genAdminId(),
      user,
      email,
      passHash: envPassHash,
      name,
      phone: '',
      notes: 'سوبر أدمن المالك — دائم',
      permissions: ['*'],
      active: true,
      createdAt: now,
      updatedAt: now,
      legacyRole: 'super',
    });
  } else {
    const row = list[idx];
    const existingHash = String(row.passHash || '').trim();
    row.user = user;
    row.email = email;
    row.name = name;
    // احفظ كلمة السر التي عُيّنت من اللوحة؛ لا تُعد الكتابة من .env إلا عند الإنشاء/الإجبار/هاش تالف
    if (forcePass || !existingHash.startsWith('$2')) {
      row.passHash = envPassHash;
    }
    row.permissions = ['*'];
    row.active = true;
    row.legacyRole = 'super';
    row.notes = row.notes || 'سوبر أدمن المالك — دائم';
    row.updatedAt = now;
    list[idx] = row;
  }

  // عطّل أي سوبر أدمن قديم باسم admin إن بقي مختلفاً عن المالك
  list.forEach((m, i) => {
    if (i === idx) return;
    if (String(m.user || '').toLowerCase() === 'admin' && (m.permissions || []).includes('*')) {
      m.active = false;
      m.updatedAt = now;
      m.notes = (m.notes || '') + ' | أُوقف بعد تعيين المالك ' + email;
    }
  });

  writeTeam(list);
  return list;
}

/**
 * تغيير كلمة مرور العضو الحالي (يتطلب كلمة السر الحالية).
 * لا يحتاج صلاحية team.manage — أي أدمن مسجّل دخوله.
 */
async function changeOwnPassword(loginUser, currentPass, newPass) {
  const u = String(loginUser || '').trim().toLowerCase();
  const cur = String(currentPass || '');
  const next = String(newPass || '');
  if (!u || !cur || !next) {
    const err = new Error('missing_fields');
    err.code = 'missing_fields';
    throw err;
  }
  if (next.length < 8) {
    const err = new Error('weak_password');
    err.code = 'weak_password';
    throw err;
  }
  if (next === cur) {
    const err = new Error('same_password');
    err.code = 'same_password';
    throw err;
  }
  const list = readTeam();
  const idx = list.findIndex((m) => {
    if (m.active === false) return false;
    const loginU = String(m.user || '').trim().toLowerCase();
    const loginE = String(m.email || '').trim().toLowerCase();
    return loginU === u || (loginE && loginE === u);
  });
  if (idx === -1) {
    const err = new Error('not_found');
    err.code = 'not_found';
    throw err;
  }
  const row = list[idx];
  const ok = await bcrypt.compare(cur, String(row.passHash || ''));
  if (!ok) {
    const err = new Error('invalid_current');
    err.code = 'invalid_current';
    throw err;
  }
  row.passHash = await bcrypt.hash(next, 12);
  row.updatedAt = new Date().toISOString();
  list[idx] = row;
  writeTeam(list);
  return publicMember(row);
}

async function authenticate(user, pass) {
  const u = String(user || '').trim().toLowerCase();
  if (!u || !pass) return null;
  const row = readTeam().find((m) => {
    if (m.active === false) return false;
    const loginUser = String(m.user || '').trim().toLowerCase();
    const loginEmail = String(m.email || '').trim().toLowerCase();
    return loginUser === u || (loginEmail && loginEmail === u);
  });
  const hash = row ? row.passHash : '$2b$10$........................................';
  const ok = await bcrypt.compare(String(pass), hash);
  if (!row || !ok) return null;
  return row;
}

function touchLogin(user) {
  const list = readTeam();
  const idx = list.findIndex((m) => m.user === user);
  if (idx === -1) return;
  list[idx].lastLoginAt = new Date().toISOString();
  writeTeam(list);
}

function listTeamPublic() {
  return readTeam().filter((m) => m.active !== false).map(publicMember);
}

function getMemberById(id) {
  return readTeam().find((m) => m.id === id) || null;
}

function assertTeamCapacity() {
  const active = readTeam().filter((m) => m.active !== false);
  if (active.length >= MAX_TEAM_MEMBERS) {
    const err = new Error('team_limit_reached');
    err.code = 'team_limit_reached';
    err.max = MAX_TEAM_MEMBERS;
    throw err;
  }
}

async function createMember(payload, actorUser, actorPerms) {
  assertTeamCapacity();
  const user = String(payload.user || '').trim().toLowerCase();
  const name = String(payload.name || '').trim();
  const pass = String(payload.pass || '');
  if (!user || !name || !pass) {
    const err = new Error('missing_fields');
    err.code = 'missing_fields';
    throw err;
  }
  if (readTeam().some((m) => m.user === user && m.active !== false)) {
    const err = new Error('user_exists');
    err.code = 'user_exists';
    throw err;
  }
  let perms = normalizePermissions(payload.permissions);
  // team.manage alone لا يمنح Super (*) — يلزم أن يكون الفاعل Super أصلاً
  if (perms.includes('*') && !hasAdminPermission(actorPerms, '*')) {
    const err = new Error('cannot_grant_super');
    err.code = 'cannot_grant_super';
    throw err;
  }
  const now = new Date().toISOString();
  const member = {
    id: genAdminId(),
    user,
    passHash: await bcrypt.hash(pass, 10),
    name,
    email: String(payload.email || '').slice(0, 120),
    phone: String(payload.phone || '').slice(0, 40),
    notes: String(payload.notes || '').slice(0, 300),
    permissions: perms,
    active: true,
    createdAt: now,
    updatedAt: now,
    createdBy: actorUser || null,
  };
  const list = readTeam();
  list.push(member);
  writeTeam(list);
  return publicMember(member);
}

async function updateMember(id, payload, actorPerms) {
  const list = readTeam();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const row = list[idx];
  if (payload.name != null) row.name = String(payload.name).trim().slice(0, 120);
  if (payload.email != null) row.email = String(payload.email).slice(0, 120);
  if (payload.phone != null) row.phone = String(payload.phone).slice(0, 40);
  if (payload.notes != null) row.notes = String(payload.notes).slice(0, 300);
  if (payload.permissions != null) {
    const next = normalizePermissions(payload.permissions);
    if (next.includes('*') && !hasAdminPermission(actorPerms, '*')) {
      const err = new Error('cannot_grant_super');
      err.code = 'cannot_grant_super';
      throw err;
    }
    // منع إسقاط آخر Super
    const wasSuper = (row.permissions || []).includes('*');
    if (wasSuper && !next.includes('*')) {
      const supers = readTeam().filter((m) => m.active !== false && (m.permissions || []).includes('*'));
      if (supers.length <= 1) {
        const err = new Error('last_super_admin');
        err.code = 'last_super_admin';
        throw err;
      }
    }
    row.permissions = next;
  }
  if (payload.active != null) row.active = !!payload.active;
  if (payload.pass && String(payload.pass).length >= 6) {
    row.passHash = await bcrypt.hash(String(payload.pass), 10);
  }
  row.updatedAt = new Date().toISOString();
  list[idx] = row;
  writeTeam(list);
  return publicMember(row);
}

async function deactivateMember(id) {
  return updateMember(id, { active: false });
}

module.exports = {
  MAX_TEAM_MEMBERS,
  PERMISSION_DEFS,
  PERMISSION_PRESETS,
  readTeam,
  writeTeam,
  seedFromLegacyAccounts,
  ensureOwnerSuperAdmin,
  changeOwnPassword,
  authenticate,
  touchLogin,
  listTeamPublic,
  getMemberById,
  createMember,
  updateMember,
  deactivateMember,
  normalizePermissions,
  hasAdminPermission,
  publicMember,
};
