/**
 * Maintenance scheduler
 * - Daily 03:00 Africa/Nouakchott: ops housekeeping (lifecycle/reminders/cleanups) then backup
 * - Weekly Monday 04:00: Super Admin weekly report (after daily job, not concurrent)
 */
const cron = require('node-cron');
const { runOpsHousekeepingPass } = require('./opsHousekeeping');
const { runDailyBackup } = require('./backupService');

const DEFAULT_CRON = '0 3 * * *';
const DEFAULT_WEEKLY_CRON = '0 4 * * 1'; // الاثنين 04:00
const DEFAULT_TZ = 'Africa/Nouakchott';

let scheduledTask = null;
let weeklyTask = null;

function startMaintenanceScheduler(deps) {
  const cronExpr = process.env.MAINTENANCE_CRON || DEFAULT_CRON;
  const weeklyExpr = process.env.WEEKLY_OPS_CRON || DEFAULT_WEEKLY_CRON;
  const tz = process.env.MAINTENANCE_CRON_TZ || DEFAULT_TZ;
  const backendRoot = deps.backendRoot;

  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  if (weeklyTask) {
    weeklyTask.stop();
    weeklyTask = null;
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
          ' emailed=' + (rem.emailed || 0) +
          ' sold=' + (clean.soldPurged || clean.wouldSoldPurge || 0) +
          ' drafts=' + (clean.draftsRemoved || clean.wouldDraftsRemove || 0) +
          ' weekly=' + (out.weekly ? 'unexpected' : 'skip')
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

  if (!cron.validate(weeklyExpr)) {
    console.error('[weekly-ops-cron] invalid WEEKLY_OPS_CRON:', weeklyExpr);
  } else {
    weeklyTask = cron.schedule(
      weeklyExpr,
      async () => {
        try {
          // بعد صيانة 03:00 — تقرير فقط (لا يعيد التنظيفات)
          const out = await runOpsHousekeepingPass(Object.assign({}, deps, {
            trigger: 'weekly',
            weeklyOnly: true,
          }));
          console.log(
            '[weekly-ops-cron] report — id=' + (out.weekly && out.weekly.id) +
            ' dryRun=' + !!out.dryRun +
            ' uploadsMB=' + (out.weekly && out.weekly.storage && out.weekly.storage.uploadsMB)
          );
        } catch (e) {
          console.error('[weekly-ops-cron] error:', e.message);
        }
      },
      { timezone: tz }
    );
  }

  console.log('[maintenance-cron] daily 03:00 (' + tz + ') ops+backup — expr: ' + cronExpr);
  console.log('[weekly-ops-cron] Monday 04:00 (' + tz + ') Super Admin report — expr: ' + weeklyExpr);
  return scheduledTask;
}

function stopMaintenanceScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
  if (weeklyTask) {
    weeklyTask.stop();
    weeklyTask = null;
  }
}

module.exports = {
  startMaintenanceScheduler,
  stopMaintenanceScheduler,
  DEFAULT_CRON,
  DEFAULT_WEEKLY_CRON,
  DEFAULT_TZ,
};
