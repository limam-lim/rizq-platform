#!/usr/bin/env node
/** Verify an existing .rizqenc backup (decrypt + SHA-256 integrity). */
require('dotenv').config();
const path = require('path');
const { verifyBackupRestore } = require('../services/backupService');

const backupPath = process.argv[2];
if (!backupPath) {
  console.error('Usage: node scripts/verify-backup.js <path-to-.rizqenc>');
  process.exit(1);
}

verifyBackupRestore(path.resolve(backupPath))
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  })
  .catch((e) => {
    console.error('[verify-backup] failed:', e.message);
    process.exit(1);
  });
