#!/usr/bin/env node
/** Manual encrypted backup — same path as nightly cron job. */
require('dotenv').config();
const path = require('path');
const { runDailyBackup } = require('../services/backupService');

const root = path.join(__dirname, '..');

runDailyBackup({ backendRoot: root, trigger: 'cli' })
  .then((summary) => {
    console.log('[backup] ok —', summary.backupFile);
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error('[backup] failed:', e.message);
    process.exit(1);
  });
