#!/usr/bin/env node
/**
 * يشغّل اختباراً على قاعدة rizq_test فقط:
 * 1) ينشئ القاعدة إن لزم
 * 2) يفرّغ المخطط ويطبّق الهجرات قبل التشغيل
 * 3) يضبط DATABASE_URL → …/rizq_test ويرفض أي اسم آخر
 * 4) بعد الانتهاء يفرّغ المخطط مجدداً
 *
 * الاستخدام:
 *   node scripts/run-with-test-db.js scripts/test-foo.js [args…]
 *   node scripts/run-with-test-db.js --no-migrate scripts/test-foo.js
 */
'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const BACKEND = path.join(__dirname, '..');
const ENV_PATH = path.join(BACKEND, '.env');
const ASSERT = path.join(__dirname, 'assert-rizq-test-db.js');
const TEST_DB = 'rizq_test';

function loadDotenvFile() {
  if (!fs.existsSync(ENV_PATH)) return;
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i < 1) return;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, k)) process.env[k] = v;
  });
}

function dbNameFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    return String(u.pathname || '').replace(/^\//, '').split('?')[0] || '';
  } catch (e) {
    const m = String(url).match(/\/([^/?]+)(?:\?|$)/);
    return m ? m[1] : '';
  }
}

function withDbName(url, name) {
  const u = new URL(url);
  u.pathname = '/' + name;
  return u.toString();
}

function adminUrlFrom(url) {
  // connect to maintenance DB to CREATE DATABASE
  return withDbName(url, 'postgres');
}

async function ensureDatabase(baseUrl) {
  const admin = new Client({ connectionString: adminUrlFrom(baseUrl) });
  await admin.connect();
  try {
    const r = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB]);
    if (!r.rowCount) {
      // identifier — validated constant
      await admin.query('CREATE DATABASE ' + TEST_DB + ' OWNER CURRENT_USER');
      console.log('[run-with-test-db] created database ' + TEST_DB);
    }
  } finally {
    await admin.end().catch(() => {});
  }
}

async function resetSchema(testUrl) {
  const c = new Client({ connectionString: testUrl });
  await c.connect();
  try {
    await c.query('DROP SCHEMA IF EXISTS public CASCADE');
    await c.query('CREATE SCHEMA public');
    await c.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');
    await c.query('GRANT ALL ON SCHEMA public TO public');
  } finally {
    await c.end().catch(() => {});
  }
}

function runMigrations(testUrl) {
  const env = Object.assign({}, process.env, {
    DATABASE_URL: testUrl,
    DB_DRIVER: 'postgres',
  });
  const r = spawnSync(
    process.execPath,
    [
      '-r', 'dotenv/config',
      path.join(BACKEND, 'node_modules/node-pg-migrate/bin/node-pg-migrate.js'),
      'up',
      '-m', 'migrations',
      '--database-url-var', 'DATABASE_URL',
    ],
    { cwd: BACKEND, env, encoding: 'utf8' }
  );
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) {
    throw new Error('migrations failed with status ' + r.status);
  }
}

function parseArgs(argv) {
  const out = { migrate: true, scriptArgs: [] };
  let i = 0;
  while (i < argv.length) {
    if (argv[i] === '--no-migrate') {
      out.migrate = false;
      i++;
      continue;
    }
    if (argv[i] === '--') {
      out.scriptArgs = argv.slice(i + 1);
      break;
    }
    out.scriptArgs = argv.slice(i);
    break;
  }
  return out;
}

async function main() {
  loadDotenvFile();
  const args = parseArgs(process.argv.slice(2));
  if (!args.scriptArgs.length) {
    console.error('Usage: node scripts/run-with-test-db.js [--no-migrate] <script.js> [args…]');
    process.exit(2);
  }

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    console.error('REFUSED: DATABASE_URL missing in env / rizq-backend/.env');
    process.exit(2);
  }
  const sourceName = dbNameFromUrl(baseUrl);
  if (sourceName === TEST_DB) {
    // already pointing at test — still reset
  } else if (!sourceName) {
    console.error('REFUSED: cannot parse database name from DATABASE_URL');
    process.exit(2);
  }

  const testUrl = withDbName(baseUrl, TEST_DB);
  process.env.DATABASE_URL = testUrl;
  process.env.DB_DRIVER = process.env.DB_DRIVER || 'postgres';
  process.env.RIZQ_TEST_DB = TEST_DB;

  console.log('[run-with-test-db] source template from ' + sourceName + ' → ' + TEST_DB);

  await ensureDatabase(baseUrl);
  if (args.migrate) {
    console.log('[run-with-test-db] reset + migrate ' + TEST_DB + ' (before)');
    await resetSchema(testUrl);
    runMigrations(testUrl);
  }

  const script = args.scriptArgs[0];
  const scriptPath = path.isAbsolute(script) ? script : path.resolve(process.cwd(), script);
  const rest = args.scriptArgs.slice(1);

  const childEnv = Object.assign({}, process.env, {
    DATABASE_URL: testUrl,
    DB_DRIVER: 'postgres',
    RIZQ_TEST_DB: TEST_DB,
    // لا تدع dotenv في الاختبارات يعيد rizq_audit
    DOTENV_CONFIG_OVERRIDE: 'false',
  });

  const exitCode = await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['-r', ASSERT, scriptPath].concat(rest),
      { cwd: process.cwd(), env: childEnv, stdio: 'inherit' }
    );
    child.on('error', (err) => {
      console.error(err);
      resolve(1);
    });
    child.on('close', (code, signal) => {
      if (signal) resolve(1);
      else resolve(code == null ? 1 : code);
    });
  });

  try {
    console.log('[run-with-test-db] reset ' + TEST_DB + ' (after)');
    await resetSchema(testUrl);
  } catch (eAfter) {
    console.error('[run-with-test-db] post-reset failed:', eAfter && eAfter.message ? eAfter.message : eAfter);
  }

  process.exit(exitCode);
}

main().catch((e) => {
  console.error('[run-with-test-db]', e && e.stack ? e.stack : e);
  process.exit(1);
});
