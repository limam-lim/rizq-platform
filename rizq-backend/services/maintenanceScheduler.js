/**
 * Daily maintenance scheduler — ops housekeeping at 03:00, backup immediately after.
 * Housekeeping: lifecycle + renewal reminders + cleanups + weekly Super Admin report.
 */
const cron = require('node-cron');
const { runOpsHousekeepingPass } = require('./opsHousekeeping');
const { runDailyBackup } = require('./backupService');

const DEFAULT_CRON = '0 3 * * *';
const DEFAULT_TZ = 'Africa/Nouakchott';

let scheduledTask = null;

function startMaintenanceScheduler(deps) {
  const cronExpr = process.env.MAINTENANCE_CRON || DEFAULT_CRON;
  const tz = process.env.MAINTENANCE_CRON_TZ || DEFAULT_TZ;
  const backendRoot = deps.backendRoot;

  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (!cron.validate(cronExpr)) {
    console.error('[maintenance-cron] invalid MAINTENANCE_CRON:', cronExpr);
    return null;
  }

  scheduledTask = cron.schedule(
    cronExpr,
    async () => {
      try {
        const out = await runOpsHousekeepingPass(Object.assign({}, deps, { trigger: 'cron' }));
        const life = out.lifecycle || {};
        const rem = out.reminders || {};
        const clean = out.cleanups || {};
        console.log(
          '[maintenance-cron] ops — dryRun=' + !!out.dryRun +
          ' archived=' + (life.archived || 0) +
          ' purged=' + (life.mediaPurged || 0) +
          ' reminded=' + (rem.reminded || rem.wouldRemind || 0) +
          ' sold=' + (clean.soldPurged || clean.wouldSoldPurge || 0) +
          ' drafts=' + (clean.draftsRemoved || clean.wouldDraftsRemove || 0) +
          ' weekly=' + (out.weekly ? out.weekly.id : 'skip')
        );
      } catch (e) {
        console.error('[maintenance-cron] ops housekeeping error:', e.message);
      }

      try {
        const backup = await runDailyBackup({ backendRoot, trigger: 'cron' });
        console.log(
          '[maintenance-cron] backup — file=' + backup.backupFile +
          ' entries=' + backup.entryCount +
          ' encryptedBytes=' + backup.encryptedBytes +
          ' retentionRemoved=' + (backup.retentionRemoved || []).length
        );
      } catch (e) {
        console.error('[maintenance-cron] backup error:', e.message);
      }
    },
    { timezone: tz }
  );

  console.log('[maintenance-cron] scheduled daily at 03:00 (' + tz + ') — ops then backup — expr: ' + cronExpr);
  return scheduledTask;
}

function stopMaintenanceScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}

module.exports = {
  startMaintenanceScheduler,
  stopMaintenanceScheduler,
  DEFAULT_CRON,
  DEFAULT_TZ,
};
