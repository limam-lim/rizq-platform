#!/usr/bin/env node
'use strict';

/**
 * Provision secret admin panel + bcrypt accounts with roles.
 *
 * Usage:
 *   node scripts/provision-secret-admin.js
 *   node scripts/provision-secret-admin.js --user m.limam --name "M. LIMAM" --role super
 *   node scripts/provision-secret-admin.js --add --user finance.desk --role finance --name "مراقب مالي"
 *   node scripts/provision-secret-admin.js --add --user commercial.desk --role commercial --name "مسؤول تجاري"
 *   node scripts/provision-secret-admin.js --add --user mods.desk --role moderator --name "مشرف محتوى"
 *   node scripts/provision-secret-admin.js --add --user support.desk --role support --name "دعم فني"
 *   node scripts/provision-secret-admin.js --rotate-path
 *   node scripts/provision-secret-admin.js --rotate-pass --slot 1
 *
 * Roles: super | admin | commercial | finance | moderator | support
 * All teammates share the same secret panel URL; each has their own login.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { normalizeRole, ROLES } = require('../services/adminRoles');

const ENV_PATH = path.join(__dirname, '..', '.env');
const MAX_SLOTS = 20;

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes('--' + name);
}

function readEnvMap(raw) {
  const map = new Map();
  String(raw || '')
    .split(/\r?\n/)
    .forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) return;
      const i = t.indexOf('=');
      map.set(t.slice(0, i), t.slice(i + 1));
    });
  return map;
}

function loadSlots(map) {
  const slots = [];
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const user = map.get('ADMIN_USER_' + i);
    const passHash = map.get('ADMIN_PASS_HASH_' + i);
    if (!user && !passHash) continue;
    slots.push({
      index: i,
      user: user || '',
      passHash: passHash || '',
      name: map.get('ADMIN_NAME_' + i) || user || '',
      role: normalizeRole(map.get('ADMIN_ROLE_' + i) || 'moderator'),
    });
  }
  return slots;
}

function nextFreeSlot(slots) {
  const used = new Set(slots.map((s) => s.index));
  for (let i = 1; i <= MAX_SLOTS; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

function writeEnv(map, slots, panelPath, gateKey) {
  const rounds = Number(map.get('BCRYPT_ROUNDS') || 12);
  const lines = [
    '# Rizq backend local env — secrets only; never commit this file',
    'NODE_ENV=' + (map.get('NODE_ENV') || 'development'),
    'RIZQ_ENV=' + (map.get('RIZQ_ENV') || 'development'),
    'PORT=' + (map.get('PORT') || '3000'),
    'BCRYPT_ROUNDS=' + rounds,
    '',
    '# ── Secret admin panel gate (shared by all roles) ──',
    'ADMIN_PANEL_PATH=' + panelPath,
    'ADMIN_PANEL_GATE_KEY=' + gateKey,
    'ADMIN_PANEL_BLOCK_LEGACY=1',
    '',
    '# ── Admin accounts by slot (role-scoped) ──',
  ];

  slots
    .slice()
    .sort((a, b) => a.index - b.index)
    .forEach((s) => {
      lines.push('ADMIN_USER_' + s.index + '=' + s.user);
      lines.push("ADMIN_PASS_HASH_" + s.index + "='" + s.passHash + "'");
      lines.push('ADMIN_NAME_' + s.index + '=' + s.name);
      lines.push('ADMIN_ROLE_' + s.index + '=' + s.role);
      lines.push('');
    });

  // Preserve other unmanaged keys
  const managed = new Set([
    'NODE_ENV', 'RIZQ_ENV', 'PORT', 'BCRYPT_ROUNDS',
    'ADMIN_PANEL_PATH', 'ADMIN_PANEL_GATE_KEY', 'ADMIN_PANEL_BLOCK_LEGACY',
    'ADMIN_ACCOUNTS_JSON', 'ADMIN_DEV_ACCOUNTS_JSON',
  ]);
  for (let i = 1; i <= MAX_SLOTS; i++) {
    managed.add('ADMIN_USER_' + i);
    managed.add('ADMIN_PASS_HASH_' + i);
    managed.add('ADMIN_NAME_' + i);
    managed.add('ADMIN_ROLE_' + i);
  }

  const extras = [];
  map.forEach((v, k) => {
    if (!managed.has(k)) extras.push(k + '=' + v);
  });
  if (extras.length) {
    lines.push('# ── Other ──');
    extras.forEach((e) => lines.push(e));
    lines.push('');
  }

  fs.writeFileSync(ENV_PATH, lines.join('\n'), { mode: 0o600 });
  try { fs.chmodSync(ENV_PATH, 0o600); } catch (_) {}
}

function main() {
  const existing = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const map = readEnvMap(existing);
  let slots = loadSlots(map);
  const rounds = Number(map.get('BCRYPT_ROUNDS') || 12);

  let panelPath = String(map.get('ADMIN_PANEL_PATH') || '').replace(/^\/+/, '');
  let gateKey = String(map.get('ADMIN_PANEL_GATE_KEY') || '');
  if (!panelPath || !gateKey || hasFlag('rotate-path')) {
    panelPath = 'cp-' + crypto.randomBytes(8).toString('hex');
    gateKey = crypto.randomBytes(24).toString('base64url');
  }

  const addMode = hasFlag('add');
  const slotArg = arg('slot', null);
  let passwordPrinted = null;
  let targetSlot = null;

  if (addMode) {
    const user = arg('user', null);
    if (!user) {
      console.error('--add requires --user');
      process.exit(1);
    }
    const role = normalizeRole(arg('role', 'moderator'));
    if (!ROLES[role]) {
      console.error('Unknown role. Use: ' + Object.keys(ROLES).join(' | '));
      process.exit(1);
    }
    const name = arg('name', user);
    const existingUser = slots.find((s) => s.user === user);
    const index = existingUser ? existingUser.index : nextFreeSlot(slots);
    if (!index) {
      console.error('No free admin slot (max ' + MAX_SLOTS + ')');
      process.exit(1);
    }
    const password = crypto.randomBytes(18).toString('base64url');
    const passHash = bcrypt.hashSync(password, rounds);
    const row = { index, user, passHash, name, role };
    slots = slots.filter((s) => s.index !== index).concat([row]);
    passwordPrinted = password;
    targetSlot = row;
  } else {
    // Bootstrap / rotate primary (slot 1) super account
    const index = Number(slotArg || 1);
    let row = slots.find((s) => s.index === index);
    const user = arg('user', (row && row.user) || 'm.limam');
    const name = arg('name', (row && row.name) || 'M. LIMAM');
    const role = normalizeRole(arg('role', (row && row.role) || 'super'));
    let passHash = row && row.passHash;
    if (!passHash || hasFlag('rotate-pass') || !row) {
      passwordPrinted = crypto.randomBytes(18).toString('base64url');
      passHash = bcrypt.hashSync(passwordPrinted, rounds);
    }
    row = { index, user, passHash, name, role };
    slots = slots.filter((s) => s.index !== index).concat([row]);
    targetSlot = row;
  }

  writeEnv(map, slots, panelPath, gateKey);

  const port = map.get('PORT') || '3000';
  const base = (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:' + port).replace(/\/$/, '');
  const url = base + '/' + panelPath + '?k=' + gateKey;

  console.log('');
  console.log('✓ Admin secrets updated → rizq-backend/.env');
  console.log('  Shared panel URL : ' + url);
  console.log('  Account slot     : ' + targetSlot.index);
  console.log('  Username         : ' + targetSlot.user);
  console.log('  Role             : ' + targetSlot.role + ' (' + (ROLES[targetSlot.role] || {}).labelAr + ')');
  if (passwordPrinted) console.log('  Password         : ' + passwordPrinted);
  else console.log('  Password         : (unchanged)');
  console.log('');
  console.log('Team slots:');
  slots
    .slice()
    .sort((a, b) => a.index - b.index)
    .forEach((s) => {
      console.log('  #' + s.index + '  ' + s.user + '  [' + s.role + ']  ' + s.name);
    });
  console.log('');
  console.log('Restart backend after changes. Store credentials offline.');
}

main();
