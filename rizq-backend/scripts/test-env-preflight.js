#!/usr/bin/env node
/**
 * اختبارات وحدة لـ env-preflight — بلا طباعة قيم الأسرار.
 */
'use strict';

const path = require('path');
const {
  runEnvPreflight,
  databasePassword,
  parseEnvFile,
  assertDotenvGitignored,
  EXAMPLE_PATH,
} = require('./env-preflight');

let passed = 0;
let failed = 0;
function ok(name, pass, detail) {
  if (pass) {
    passed += 1;
    console.log('  ✓ ' + name);
  } else {
    failed += 1;
    console.log('  ✗ ' + name + (detail ? ' ' + JSON.stringify(detail) : ''));
  }
}

const example = parseEnvFile(EXAMPLE_PATH);

ok('example DATABASE_URL has empty password', !databasePassword(example.DATABASE_URL || '').ok);
ok('real-shaped URL password ok', databasePassword('postgres://rizq:s3cretvalue@127.0.0.1:5432/rizq').ok
  && databasePassword('postgres://rizq:s3cretvalue@127.0.0.1:5432/rizq').passwordLen === 11);
ok('.env is gitignored', assertDotenvGitignored());

/* فشل صامت عند نسخ .env.example */
const bad = runEnvPreflight({
  exitOnFail: false,
  context: 'unit-bad',
  env: Object.assign({}, example, {
    DATABASE_URL: example.DATABASE_URL || 'postgres://rizq:@127.0.0.1:5432/rizq',
    BACKEND_SHARED_SECRET: example.BACKEND_SHARED_SECRET || '',
    SENTINEL_DB_PASSWORD: '',
    ADMIN_PANEL_GATE_KEY: example.ADMIN_PANEL_GATE_KEY || 'change-me-long-random',
  }),
});
ok('example-shaped env fails preflight', !bad.ok && bad.errors.length >= 2, bad.errors);

const good = runEnvPreflight({
  exitOnFail: false,
  context: 'unit-good',
  env: {
    DB_DRIVER: 'postgres',
    DATABASE_URL: 'postgres://rizq:unit-test-password-32chars!!@127.0.0.1:5432/rizq',
    BACKEND_SHARED_SECRET: 'unit-backend-shared-secret-value-ok',
    SENTINEL_DB_PASSWORD: 'unit-sentinel-db-password-ok',
    ADMIN_PANEL_GATE_KEY: 'unit-admin-panel-gate-key-ok',
  },
});
ok('populated env passes preflight', good.ok, good.errors);

/* لا تسرّب القيم في رسائل الخطأ */
const leak = bad.errors.concat(good.errors).join('\n');
ok('error messages do not contain secret material',
  !/unit-backend-shared|unit-sentinel|unit-admin|s3cretvalue|unit-test-password/.test(leak),
  leak.slice(0, 200));

console.log(failed ? ('\nenv-preflight tests: ' + passed + ' passed, ' + failed + ' failed')
  : ('\nenv-preflight tests: ' + passed + ' passed, 0 failed'));
process.exit(failed ? 1 : 0);
