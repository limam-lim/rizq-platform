#!/usr/bin/env node
'use strict';
/**
 * launch-check — قراءة فقط، لا يغيّر شيئاً.
 * يطبع ✅/❌ لعناصر جاهزية الإطلاق.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');

function ok(name, pass, detail) {
  console.log((pass ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''));
  return pass;
}

function isDemoRec(rec) {
  if (!rec) return false;
  const id = String(rec.id || '');
  const acc = String(rec.accountId || '');
  return rec.is_demo === true
    || rec.isDemo === true
    || rec.graduationDemo === true
    || id.indexOf('acc_grad_') === 0
    || id.indexOf('acc_demo') === 0
    || acc.indexOf('acc_grad_') === 0
    || acc.indexOf('acc_demo') === 0
    || /^RZQ-2026-33\d{3}$/i.test(id)
    || /^RZQ-2026-1000\d/i.test(id);
}

function latestBackupMeta() {
  const dirs = [
    path.join(ROOT, 'backups'),
    path.join(DATA, 'backups'),
  ];
  let best = null;
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((name) => {
      if (name.indexOf('__backup_test__') >= 0) return;
      const fp = path.join(dir, name);
      try {
        const st = fs.statSync(fp);
        if (!st.isFile() && !st.isDirectory()) return;
        if (!best || st.mtimeMs > best.mtimeMs) {
          best = { path: fp, name, mtimeMs: st.mtimeMs, mtime: st.mtime.toISOString() };
        }
      } catch (e) { /* ignore */ }
    });
  });
  // meta file from backupService
  const metaPath = path.join(DATA, 'backup-latest.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      return { file: best, meta };
    } catch (e) { /* ignore */ }
  }
  return { file: best, meta: null };
}

function restoreTestEvidence() {
  const testScript = path.join(ROOT, 'scripts', 'test-backup-restore.js');
  const hasTest = fs.existsSync(testScript);
  let evidence = null;
  const preferred = path.join(DATA, 'backup-restore-last.json');
  if (fs.existsSync(preferred)) {
    try {
      evidence = JSON.parse(fs.readFileSync(preferred, 'utf8'));
    } catch (e) { /* ignore */ }
  }
  return {
    hasTestScript: hasTest,
    evidence,
    lastRunNote: evidence ? JSON.stringify(evidence) : null,
  };
}

function cronScheduled() {
  try {
    const sched = require('../services/maintenanceScheduler');
    const serverSrc = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
    const wired = /startMaintenanceScheduler\s*\(/.test(serverSrc);
    return {
      daily: sched.DEFAULT_CRON === '0 3 * * *',
      weekly: sched.DEFAULT_WEEKLY_CRON === '0 4 * * 1',
      tz: sched.DEFAULT_TZ === 'Africa/Nouakchott',
      wiredInServer: wired,
      dailyExpr: sched.DEFAULT_CRON,
      weeklyExpr: sched.DEFAULT_WEEKLY_CRON,
      timezone: sched.DEFAULT_TZ,
    };
  } catch (e) {
    return { error: e.message };
  }
}

function envPresent() {
  const keys = [
    'BACKEND_SHARED_SECRET',
    'RIZQ_API_SECRET',
    'SUPER_ADMIN_EMAIL',
    'SUPER_ADMIN_PASS_HASH',
    'BACKUP_ENCRYPTION_KEY',
  ];
  // load .env lightly if dotenv present
  try { require('dotenv').config({ path: path.join(ROOT, '.env') }); } catch (e) { /* ignore */ }
  const missing = keys.filter((k) => !String(process.env[k] || '').trim());
  const storage = {
    STORAGE_DRIVER: process.env.STORAGE_DRIVER || process.env.OBJECT_STORAGE_DRIVER || 'local',
    LOCAL_ROOT: process.env.UPLOADS_DIR || path.join(ROOT, 'uploads'),
    BACKUP_DIR: process.env.BACKUP_DIR || path.join(ROOT, 'backups'),
  };
  return { missing, storage, ok: missing.length === 0 };
}

async function launchDateEmpty() {
  try {
    const launchMode = require('../config/launchMode');
    const s = await launchMode.getLaunchSettings();
    return {
      launchDate: s.launchDate || '',
      empty: !s.launchDate,
      maintenanceDryRun: !!s.maintenanceDryRun,
      freeUntil: s.freeUntil || null,
    };
  } catch (e) {
    // fallback site-config
    try {
      const cfg = (await require('../db/repos').getSiteConfig()) || {};
      return { launchDate: cfg.launchDate || '', empty: !cfg.launchDate };
    } catch (e2) {
      return { error: e.message, empty: false };
    }
  }
}

function countDemo() {
  const store = require('../db/platformStore');
  const adsAll = store.readAds() || [];
  const accountsAll = store.readAccounts() || [];
  let catalogAll = [];
  try { catalogAll = store.readCatalog() || []; } catch (e) { /* ignore */ }
  const ads = adsAll.filter(isDemoRec);
  const accounts = accountsAll.filter(isDemoRec);
  const catalog = catalogAll.filter(isDemoRec);
  const gradTagged = []
    .concat(adsAll, accountsAll, catalogAll)
    .filter((r) => r && r.graduationDemo === true).length;
  return {
    ads: ads.length,
    accounts: accounts.length,
    catalog: catalog.length,
    total: ads.length + accounts.length + catalog.length,
    graduationTagged: gradTagged,
  };
}

async function main() {
  console.log('══ launch-check (read-only) ══\n');
  let passed = 0;
  let total = 0;
  function check(name, pass, detail) {
    total++;
    if (ok(name, pass, detail)) passed++;
  }

  const bak = latestBackupMeta();
  const restore = restoreTestEvidence();
  if (bak.file || bak.meta) {
    const when = (bak.meta && (bak.meta.at || bak.meta.createdAt)) || (bak.file && bak.file.mtime) || '?';
    check('backup exists', true, String(when));
  } else {
    check('backup exists', false, 'no backup file/meta found');
  }
  let restoreOk = false;
  let restoreDetail = 'run: npm run test:backup (not auto-run here)';
  if (restore.lastRunNote) {
    try {
      const parsed = JSON.parse(restore.lastRunNote);
      restoreOk = parsed.ok === true;
      restoreDetail = 'last test at ' + (parsed.at || '?') + ' passed=' + parsed.passed + '/' + parsed.total;
    } catch (e) {
      restoreOk = /✅|passed|ok/i.test(restore.lastRunNote);
      restoreDetail = 'evidence: ' + String(restore.lastRunNote).slice(0, 100);
    }
  } else if (restore.hasTestScript) {
    restoreOk = false;
    restoreDetail = 'script present — no restore evidence yet (npm run test:backup)';
  }
  check('backup restore tested', restoreOk, restoreDetail);

  const demo = countDemo();
  /* أثناء عرض التخرج: المحتوى الموسوم graduationDemo مطلوب.
     قبل الإطلاق الحقيقي: بعد purge يجب أن يكون المجموع 0. */
  if (demo.graduationTagged > 0) {
    check(
      'graduation demo seeded',
      demo.total > 0,
      'ads=' + demo.ads + ' accounts=' + demo.accounts + ' catalog=' + demo.catalog
        + ' graduationTagged=' + demo.graduationTagged
        + ' — purge before real launch'
    );
  } else {
    check(
      'is_demo remaining is 0 (pre-launch)',
      demo.total === 0,
      'ads=' + demo.ads + ' accounts=' + demo.accounts + ' catalog=' + demo.catalog
    );
  }

  const cron = cronScheduled();
  check('cron daily 03:00', !!(cron.daily), cron.dailyExpr + ' ' + (cron.timezone || ''));
  check('cron weekly Mon 04:00', !!(cron.weekly), cron.weeklyExpr + ' ' + (cron.timezone || ''));
  check('cron wired in server.js', cron.wiredInServer === true, 'startMaintenanceScheduler(...)');

  const env = envPresent();
  check(
    'required env present',
    env.ok,
    env.ok ? ('storage=' + env.storage.STORAGE_DRIVER) : ('missing: ' + env.missing.join(', '))
  );
  check(
    'storage root configured',
    !!env.storage.LOCAL_ROOT,
    env.storage.LOCAL_ROOT
  );

  const launch = await launchDateEmpty();
  check(
    'launchDate empty (dry-run maintenance)',
    launch.empty === true,
    'launchDate=' + JSON.stringify(launch.launchDate || '') + ' dryRun=' + !!launch.maintenanceDryRun
  );

  console.log('\n' + passed + '/' + total + ' checks');
  console.log(JSON.stringify({
    ok: passed === total,
    passed,
    total,
    demo,
    backup: bak.meta || bak.file,
    cron,
    launch,
  }, null, 2));
  // exit 0 even if some ❌ — this is a report tool for operators
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
