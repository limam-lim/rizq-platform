#!/usr/bin/env node
/** Manual encrypted backup — same path as nightly cron job. */
require('dotenv').config();
const path = require('path');
const { runDailyBackup } = require('../services/backupService');

const root = path.join(__dirname, '..');

runDailyBackup({ backendRoot: root, trigger: 'cli' })
  .then((summary) => {
    try {
      const fs = require('fs');
      const metaPath = path.join(root, 'data', 'backup-latest.json');
      fs.mkdirSync(path.dirname(metaPath), { recursive: true });
      fs.writeFileSync(metaPath, JSON.stringify({
        at: summary.runAt || new Date().toISOString(),
        createdAt: summary.runAt || new Date().toISOString(),
        backupFile: summary.backupFile,
        backupPath: summary.backupPath,
        entryCount: summary.entryCount,
        trigger: summary.trigger || 'cli',
        ok: !!summary.ok,
      }, null, 2), 'utf8');
    } catch (e) { /* ignore meta write */ }
    console.log('[backup] ok —', summary.backupFile);
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error('[backup] failed:', e.message);
    process.exit(1);
  });
