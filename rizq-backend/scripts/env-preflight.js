#!/usr/bin/env node
/**
 * env-preflight — يفشل فوراً قبل test:all / إقلاع الخادم إذا كانت الأسرار ناقصة
 * أو مساوية لقيم .env.example (مثل كلمة سر DATABASE_URL الفارغة).
 *
 * يطبع الاسم والطول فقط — لا القيم.
 *
 * تشغيل مباشر: node scripts/env-preflight.js
 * أو: npm run preflight
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const ENV_PATH = path.join(BACKEND, '.env');
const EXAMPLE_PATH = path.join(BACKEND, '.env.example');

/** أسرار يجب أن تكون غير فارغة وغير مساوية لـ .env.example */
const REQUIRED_SECRETS = [
  'BACKEND_SHARED_SECRET',
  'SENTINEL_DB_PASSWORD',
  'ADMIN_PANEL_GATE_KEY',
];

function parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  fs.readFileSync(filePath, 'utf8').split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i < 1) return;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  });
  return out;
}

function redactLen(v) {
  if (v == null) return 0;
  return String(v).length;
}

function databasePassword(url) {
  if (!url || !String(url).trim()) return { ok: false, reason: 'missing', passwordLen: 0 };
  try {
    const u = new URL(String(url).trim());
    const pass = u.password == null ? '' : String(u.password);
    if (!pass.length) {
      return { ok: false, reason: 'empty_password', passwordLen: 0, user: u.username, host: u.host, db: u.pathname };
    }
    return { ok: true, passwordLen: pass.length, user: u.username, host: u.host, db: u.pathname };
  } catch (e) {
    return { ok: false, reason: 'unparseable', passwordLen: 0 };
  }
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.exitOnFail=true]
 * @param {string} [opts.context='preflight']
 * @param {NodeJS.ProcessEnv} [opts.env=process.env]
 * @param {string} [opts.examplePath]
 * @returns {{ ok: boolean, errors: string[], checks: object[] }}
 */
function runEnvPreflight(opts) {
  opts = opts || {};
  const exitOnFail = opts.exitOnFail !== false;
  const context = opts.context || 'preflight';
  const env = opts.env || process.env;
  const examplePath = opts.examplePath || EXAMPLE_PATH;
  const example = parseEnvFile(examplePath);
  const errors = [];
  const checks = [];

  function fail(msg) {
    errors.push(msg);
  }

  function note(name, len, status) {
    checks.push({ name, len, status });
    console.log('[env-preflight] ' + name + ' len=' + len + ' ' + status);
  }

  /* DATABASE_URL — كلمة السر إلزامية عند استخدام postgres */
  const dbUrl = env.DATABASE_URL != null ? String(env.DATABASE_URL) : '';
  const dbDriver = String(env.DB_DRIVER || example.DB_DRIVER || 'postgres').toLowerCase();
  const exampleDbUrl = example.DATABASE_URL != null ? String(example.DATABASE_URL) : '';

  if (dbDriver === 'postgres' || /postgres/i.test(dbUrl) || !dbUrl) {
    const info = databasePassword(dbUrl);
    if (!dbUrl.trim()) {
      fail('DATABASE_URL is missing (required for postgres)');
      note('DATABASE_URL', 0, 'FAIL missing');
    } else if (exampleDbUrl && dbUrl.trim() === exampleDbUrl.trim()) {
      fail('DATABASE_URL equals .env.example (likely empty DB password)');
      note('DATABASE_URL', redactLen(dbUrl), 'FAIL equals .env.example');
    } else if (!info.ok) {
      fail('DATABASE_URL has no password (SCRAM will fail: client password must be a string)');
      note('DATABASE_URL', redactLen(dbUrl), 'FAIL empty_password');
    } else {
      note('DATABASE_URL', redactLen(dbUrl), 'OK password_len=' + info.passwordLen);
    }
  } else {
    note('DATABASE_URL', redactLen(dbUrl), 'SKIP non-postgres');
  }

  REQUIRED_SECRETS.forEach((key) => {
    const val = env[key] != null ? String(env[key]) : '';
    const ex = example[key] != null ? String(example[key]) : '';
    const len = redactLen(val);
    if (!val.trim()) {
      fail(key + ' is empty');
      note(key, len, 'FAIL empty');
      return;
    }
    if (ex.trim() && val.trim() === ex.trim()) {
      fail(key + ' equals .env.example placeholder');
      note(key, len, 'FAIL equals .env.example');
      return;
    }
    note(key, len, 'OK');
  });

  /* أي مفتاح آخر في .env.example بقيمة غير فارغة «تبدو سرّاً» — إن وُجد في env ومساوٍ للمثال يفشل */
  const secretish = /SECRET|PASSWORD|PASS_HASH|ENCRYPTION_KEY|TOKEN|API_KEY/i;
  Object.keys(example).forEach((key) => {
    if (REQUIRED_SECRETS.indexOf(key) >= 0 || key === 'DATABASE_URL') return;
    if (!secretish.test(key)) return;
    const ex = String(example[key] || '');
    if (!ex.trim()) return; /* مثال فارغ: لا نرفض الفراغ هنا — فقط التطابق مع placeholder غير فارغ */
    const val = env[key] != null ? String(env[key]) : '';
    if (!val.trim()) return; /* اختياري إن لم يُضبط */
    if (val.trim() === ex.trim()) {
      fail(key + ' equals .env.example placeholder');
      note(key, redactLen(val), 'FAIL equals .env.example');
    }
  });

  const ok = errors.length === 0;
  if (ok) {
    console.log('[env-preflight] OK (' + context + ')');
  } else {
    console.error('[env-preflight] FAILED (' + context + ') — ' + errors.length + ' issue(s):');
    errors.forEach((e) => console.error('  ✗ ' + e));
    console.error('[env-preflight] Fix rizq-backend/.env (copy from .env.example and set real secrets). Never commit .env.');
    if (exitOnFail) process.exit(1);
  }
  return { ok, errors, checks };
}

function assertDotenvGitignored() {
  const rootGitignore = path.join(BACKEND, '..', '.gitignore');
  const beGitignore = path.join(BACKEND, '.gitignore');
  const texts = [];
  if (fs.existsSync(rootGitignore)) texts.push(fs.readFileSync(rootGitignore, 'utf8'));
  if (fs.existsSync(beGitignore)) texts.push(fs.readFileSync(beGitignore, 'utf8'));
  const joined = texts.join('\n');
  const ok = /(^|\n)\.env(\n|$)/.test(joined)
    || /(^|\n)rizq-backend\/\.env(\n|$)/.test(joined)
    || /(^|\n)\.env\.\*(\n|$)/.test(joined);
  if (!ok) {
    console.error('[env-preflight] .env does not appear in .gitignore — refuse to continue');
    return false;
  }
  console.log('[env-preflight] .env gitignore coverage OK');
  return true;
}

if (require.main === module) {
  /* CLI: ملف .env يتقدّم على بيئة الصدفة حتى يكشف نسخ .env.example */
  const fileEnv = parseEnvFile(ENV_PATH);
  Object.keys(fileEnv).forEach((k) => {
    process.env[k] = fileEnv[k];
  });
  if (!assertDotenvGitignored()) process.exit(1);
  runEnvPreflight({ exitOnFail: true, context: 'cli' });
}

module.exports = {
  runEnvPreflight,
  parseEnvFile,
  databasePassword,
  assertDotenvGitignored,
  REQUIRED_SECRETS,
  ENV_PATH,
  EXAMPLE_PATH,
};
