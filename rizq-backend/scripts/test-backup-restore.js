#!/usr/bin/env node
/** Restore verification — backup → decrypt → extract → SHA-256 integrity check */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { runDailyBackup, verifyBackupRestore, applyRetentionPolicy } = require('../services/backupService');

const ROOT = path.join(__dirname, '..');
const FIXTURE = path.join(ROOT, 'data', '__backup_test__');
const FIXTURE_UPLOADS = path.join(ROOT, 'uploads', '__backup_test__');
const BACKUP_DIR = path.join(ROOT, 'backups', '__backup_test__');

function ok(name, pass, detail) {
  console.log((pass ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''));
  return pass;
}

function setupFixture() {
  fs.mkdirSync(FIXTURE, { recursive: true });
  fs.mkdirSync(FIXTURE_UPLOADS, { recursive: true });
  fs.writeFileSync(
    path.join(FIXTURE, 'sample.json'),
    JSON.stringify({ hello: 'rizq', ts: Date.now() }, null, 2),
    'utf8'
  );
  fs.writeFileSync(path.join(FIXTURE_UPLOADS, 'photo.webp'), 'fake-webp-content-for-restore-test', 'utf8');
}

function cleanup() {
  for (const p of [FIXTURE, FIXTURE_UPLOADS, BACKUP_DIR]) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
  const backupsRoot = path.join(ROOT, 'backups');
  if (fs.existsSync(backupsRoot)) {
    fs.readdirSync(backupsRoot)
      .filter((f) => f.startsWith('rizq-backup-') && f.includes('__backup_test__') === false)
      .filter((f) => f.endsWith('.rizqenc') || f.endsWith('.meta.json'))
      .forEach((f) => {
        if (f.includes(new Date().toISOString().slice(0, 10))) {
          /* keep today's real backup if any */
        }
      });
  }
}

async function run() {
  cleanup();
  setupFixture();

  process.env.BACKUP_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  process.env.BACKUP_DIR = BACKUP_DIR;
  process.env.BACKUP_RETENTION_DAYS = '30';

  let passed = 0;
  let total = 0;
  function check(name, pass, detail) {
    total++;
    if (ok(name, pass, detail)) passed++;
  }

  let backupPath;
  try {
    const summary = await runDailyBackup({ backendRoot: ROOT, trigger: 'test' });
    backupPath = summary.backupPath;
    check('creates encrypted backup file', summary.ok && fs.existsSync(backupPath), summary.backupFile);
    check('backup includes fixture entries', summary.entryCount >= 2, 'entries=' + summary.entryCount);
    check('writes sidecar meta json', fs.existsSync(backupPath.replace('.rizqenc', '.meta.json')));
  } catch (e) {
    check('creates encrypted backup file', false, e.message);
    cleanup();
    console.log('\n' + passed + '/' + total + ' checks passed\n');
    process.exit(1);
  }

  try {
    const verify = await verifyBackupRestore(backupPath, { workRoot: path.join(BACKUP_DIR, '.verify-work') });
    check('restore verification passes', verify.ok, 'verified=' + verify.verifiedFiles);
    check('no missing files after restore', verify.missingFiles.length === 0);
    check('no hash mismatches after restore', verify.hashMismatches.length === 0);
  } catch (e) {
    check('restore verification passes', false, e.message);
  }

  // Retention policy — create dummy old backups
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const oldNames = [];
  for (let i = 0; i < 32; i++) {
    const name = 'rizq-backup-2020-01-' + String(i + 1).padStart(2, '0') + '.rizqenc';
    const fp = path.join(BACKUP_DIR, name);
    fs.writeFileSync(fp, 'dummy-old-backup-' + i);
    oldNames.push(name);
  }
  const retention = applyRetentionPolicy(BACKUP_DIR, 30);
  check('retention keeps at most 30 backups', retention.kept <= 30, 'kept=' + retention.kept);
  check('retention removes old backups', retention.removed.length >= 2, 'removed=' + retention.removed.length);

  cleanup();
  console.log('\n' + passed + '/' + total + ' checks passed\n');
  process.exit(passed === total ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  cleanup();
  process.exit(1);
});
