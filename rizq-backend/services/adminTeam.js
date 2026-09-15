/**
 * adminTeam.js — فريق الإدارة + صلاحيات ديناميكية
 */
'use strict';

const fs = require('fs');
const path = require('path');
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

const TEAM_FILE = path.join(__dirname, '..', 'data', 'admin-team.json');

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function genAdminId() {
  return 'adm_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
}

function readTeam() {
  return readJson(TEAM_FILE, []);
}

function writeTeam(list) {
  writeJson(TEAM_FILE, list);
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
    email: '',
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

async function authenticate(user, pass) {
  const u = String(user || '').trim();
  if (!u || !pass) return null;
  const row = readTeam().find((m) => m.user === u && m.active !== false);
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

async function createMember(payload, actorUser) {
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
  const now = new Date().toISOString();
  const member = {
    id: genAdminId(),
    user,
    passHash: await bcrypt.hash(pass, 10),
    name,
    email: String(payload.email || '').slice(0, 120),
    phone: String(payload.phone || '').slice(0, 40),
    notes: String(payload.notes || '').slice(0, 300),
    permissions: normalizePermissions(payload.permissions),
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

async function updateMember(id, payload) {
  const list = readTeam();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const row = list[idx];
  if (payload.name != null) row.name = String(payload.name).trim().slice(0, 120);
  if (payload.email != null) row.email = String(payload.email).slice(0, 120);
  if (payload.phone != null) row.phone = String(payload.phone).slice(0, 40);
  if (payload.notes != null) row.notes = String(payload.notes).slice(0, 300);
  if (payload.permissions != null) row.permissions = normalizePermissions(payload.permissions);
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
