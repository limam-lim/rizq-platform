#!/usr/bin/env node
'use strict';

/**
 * تطبيق سوبر أدمن المالك على .env + قاعدة الإدارة.
 *
 * Usage:
 *   node scripts/apply-super-admin.js --email megalimam@gmail.com --pass 'YOUR_PASSWORD'
 *   node scripts/apply-super-admin.js --email megalimam@gmail.com --hash '$2a$12$...'
 *
 * لا يطبع كلمة السر. يكتب SUPER_ADMIN_* في rizq-backend/.env (gitignored)
 * ويفرض تحديث passHash في فريق الإدارة.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const ENV_PATH = path.join(__dirname, '..', '.env');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return fallback;
}

function upsertEnv(raw, key, value) {
  const lines = String(raw || '').split(/\r?\n/);
  let found = false;
  const next = lines.map((line) => {
    if (/^\s*#/.test(line) || !line.includes('=')) return line;
    const i = line.indexOf('=');
    const k = line.slice(0, i);
    if (k === key) {
      found = true;
      return key + '=' + value;
    }
    return line;
  });
  if (!found) next.push(key + '=' + value);
  return next.join('\n').replace(/\n*$/, '\n');
}

function main() {
  const email = String(arg('email', process.env.SUPER_ADMIN_EMAIL || 'megalimam@gmail.com'))
    .trim()
    .toLowerCase();
  const name = String(arg('name', process.env.SUPER_ADMIN_NAME || 'M. LIMAM')).trim() || 'M. LIMAM';
  let passHash = String(arg('hash', '') || '').trim();
  const pass = arg('pass', null);

  if (!passHash && pass) {
    passHash = bcrypt.hashSync(String(pass), 12);
  }
  if (!email || !passHash || !passHash.startsWith('$2')) {
    console.error('Usage: node scripts/apply-super-admin.js --email you@mail.com --pass "..."');
    console.error('   or: node scripts/apply-super-admin.js --email you@mail.com --hash "$2a$12$..."');
    process.exit(1);
  }

  let raw = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  raw = upsertEnv(raw, 'SUPER_ADMIN_EMAIL', email);
  raw = upsertEnv(raw, 'SUPER_ADMIN_USER', email);
  raw = upsertEnv(raw, 'SUPER_ADMIN_NAME', name);
  raw = upsertEnv(raw, 'SUPER_ADMIN_PASS_HASH', passHash);
  fs.writeFileSync(ENV_PATH, raw, { mode: 0o600 });
  try { fs.chmodSync(ENV_PATH, 0o600); } catch (_) {}

  process.env.SUPER_ADMIN_EMAIL = email;
  process.env.SUPER_ADMIN_PASS_HASH = passHash;
  process.env.SUPER_ADMIN_NAME = name;

  const adminTeam = require('../services/adminTeam');
  adminTeam.ensureOwnerSuperAdmin({
    email,
    user: email,
    name,
    passHash,
    forcePassHash: true,
  });

  console.log('✓ Super admin applied');
  console.log('  email : ' + email);
  console.log('  name  : ' + name);
  console.log('  .env  : ' + ENV_PATH);
  console.log('  Restart the backend if it is already running.');
}

main();
