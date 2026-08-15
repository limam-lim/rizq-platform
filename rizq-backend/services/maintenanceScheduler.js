/**
 * Daily maintenance scheduler — lifecycle at 03:00, backup immediately after.
 */
const cron = require('node-cron');
const { runAdLifecycleMaintenance } = require('./adLifecycle');
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
        const summary = runAdLifecycleMaintenance(Object.assign({}, deps, { trigger: 'cron' }));
        console.log(
          '[maintenance-cron] lifecycle — archived=' + summary.archived +
          ' purged=' + summary.mediaPurged +
          ' bytesFreed=' + summary.bytesFreed +
          ' skippedPaid=' + summary.skippedPaidGrace
        );
      } catch (e) {
        console.error('[maintenance-cron] lifecycle error:', e.message);
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

  console.log('[maintenance-cron] scheduled daily at 03:00 (' + tz + ') — lifecycle then backup — expr: ' + cronExpr);
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
