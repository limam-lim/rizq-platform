/**
 * اختبارات تشغيلية — fix-ops-1
 * تشغيل: node scripts/run-with-test-db.js scripts/test-ops-1.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..', '..');
const BACKEND = path.join(__dirname, '..');

let failed = 0;
function ok(cond, msg, detail) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg, detail || '');
  } else {
    console.log('OK:', msg, detail || '');
  }
}

function parseDbUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password || ''),
    database: u.pathname.replace(/^\//, '').split('?')[0],
  };
}

async function main() {
  const db = require('../db');
  await db.ready();
  const sql = require('../db/sql');
  const platformStore = require('../db/platformStore');
  const { getExternalTimeoutMs, getExternalMaxRetries, fetchWithTimeout } = require('../lib/externalHttp');

  // ── 2) DEV_JSON_DUMPS ──
  const dumpPath = path.join(BACKEND, 'data', '__ops1_dump_test.json');
  try { fs.unlinkSync(dumpPath); } catch (e) { /* */ }
  delete process.env.DEV_JSON_DUMPS;
  const { backupJson: bjDoc } = (() => {
    // إعادة تحميل صعبة — نختبر الدالة عبر كتابة accounts ثم فحص الملف
    return {};
  })();
  const accountsPath = path.join(BACKEND, 'data', 'accounts.json');
  const beforeStat = fs.existsSync(accountsPath) ? fs.statSync(accountsPath).mtimeMs : 0;
  await new Promise((r) => setTimeout(r, 20));
  process.env.DEV_JSON_DUMPS = '0';
  // استدعاء upsert يمر عبر backupJson المبوّب
  const id = 'ACC_OPS1_' + Date.now();
  await platformStore.upsertAccount({
    id,
    type: 'store',
    name: 'ops1',
    email: id.toLowerCase() + '@example.com',
    status: 'approved',
    phone: '44110001',
    suspended: false,
    updatedAt: new Date().toISOString(),
  });
  const afterOff = fs.existsSync(accountsPath) ? fs.statSync(accountsPath).mtimeMs : 0;
  ok(afterOff === beforeStat || !fs.existsSync(accountsPath) || afterOff === beforeStat,
    'JSON dump gated off (DEV_JSON_DUMPS!=1)',
    'mtimeBefore=' + beforeStat + ' after=' + afterOff);

  process.env.DEV_JSON_DUMPS = '1';
  // إعادة require لن يحدّث الإغلاق — backupJson يقرأ env كل استدعاء ✓
  await platformStore.upsertAccount({
    id,
    type: 'store',
    name: 'ops1-b',
    email: id.toLowerCase() + '@example.com',
    status: 'approved',
    phone: '44110001',
    suspended: false,
    updatedAt: new Date().toISOString(),
  });
  ok(fs.existsSync(accountsPath), 'JSON dump writes when DEV_JSON_DUMPS=1');
  process.env.DEV_JSON_DUMPS = '0';
  try { await platformStore.deleteAccount(id); } catch (e) { /* */ }

  // ── 4) مهلات ──
  ok(getExternalTimeoutMs('anthropic') === 15000 || getExternalTimeoutMs() === 15000, 'default timeout 15s');
  ok(getExternalMaxRetries('telegram') === 1, 'default max retries 1');
  process.env.EXTERNAL_HTTP_TIMEOUT_MS = '15000';
  let timedOut = false;
  try {
    await fetchWithTimeout('http://127.0.0.1:9', { service: 'http', timeoutMs: 200, maxRetries: 0 });
  } catch (e) {
    timedOut = true;
  }
  ok(timedOut, 'fetchWithTimeout aborts unreachable host');

  // ── 3) SQL ترقيم + معيار 5000 إعلان ──
  console.log('Seeding 5000 ads for bench…');
  const tSeed0 = Date.now();
  await sql.execute("DELETE FROM ads WHERE id LIKE 'OPS1-%'");
  // إدخال دفعي
  for (let batch = 0; batch < 50; batch++) {
    const values = [];
    const params = [];
    for (let i = 0; i < 100; i++) {
      const n = batch * 100 + i;
      const adId = 'OPS1-' + String(n).padStart(5, '0');
      const cat = n % 3 === 0 ? 'إلكترونيات' : (n % 3 === 1 ? 'سيارات' : 'عقارات');
      const wilaya = n % 2 === 0 ? 'نواكشوط' : 'نواذيبو';
      const data = JSON.stringify({
        id: adId,
        accountId: 'ACC_OPS_SEED',
        status: 'active',
        category: cat,
        wilaya,
        title: 'إعلان اختباري ' + n,
        desc: 'وصف ' + n,
        createdAt: new Date(Date.now() - n * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
      values.push('(?, ?, ?, ?, ?::jsonb, ?)');
      params.push(adId, 'ACC_OPS_SEED', 'active', cat, data, new Date().toISOString());
    }
    await sql.execute(
      'INSERT INTO ads (id, account_id, status, category, data, updated_at) VALUES '
      + values.join(',')
      + ' ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, category = EXCLUDED.category, status = EXCLUDED.status',
      params
    );
  }
  ok(true, 'seeded 5000 ads', 'ms=' + (Date.now() - tSeed0));

  // قبل: تحميل الكل في الذاكرة (محاكاة السلوك القديم)
  const tMem0 = Date.now();
  const all = await platformStore.readAds();
  const filtered = all.filter((a) => a.status === 'active' && a.category === 'إلكترونيات' && a.wilaya === 'نواكشوط');
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const memPage = filtered.slice(0, 60);
  const memMs = Date.now() - tMem0;

  const tSql0 = Date.now();
  const sqlPage = await platformStore.queryPublicAds({
    category: 'إلكترونيات',
    wilaya: 'نواكشوط',
    limit: 60,
    offset: 0,
  });
  const sqlMs = Date.now() - tSql0;

  ok(sqlPage.ads.length > 0 && sqlPage.ads.length <= 60, 'SQL page size', String(sqlPage.ads.length));
  ok(sqlPage.total >= sqlPage.ads.length, 'SQL total >= page');
  ok(sqlPage.ads.every((a) => a.category === 'إلكترونيات' && a.wilaya === 'نواكشوط'), 'SQL filters applied');
  console.log('BENCH memMs=' + memMs + ' sqlMs=' + sqlMs + ' memRows=' + all.length + ' sqlTotal=' + sqlPage.total);
  ok(sqlMs <= memMs || sqlMs < 2000, 'SQL path not slower than full scan (or <2s)', 'mem=' + memMs + ' sql=' + sqlMs);

  const search = await platformStore.queryPublicAds({ search: 'اختباري 42', limit: 10 });
  ok(search.total >= 1, 'SQL search works');

  const pubAcc = await platformStore.queryPublicAccounts({ limit: 5, offset: 0 });
  ok(Array.isArray(pubAcc.accounts) && pubAcc.accounts.length <= 5, 'accounts public SQL limit');

  // تنظيف بذور المعيار
  await sql.execute("DELETE FROM ads WHERE id LIKE 'OPS1-%'");

  // ── 1) backup + restore ──
  const pass = 'ops1-test-passphrase-' + Date.now();
  process.env.BACKUP_GPG_PASSPHRASE = pass;
  process.env.BACKUP_ENCRYPTION_PASSPHRASE = pass;
  process.env.BACKUP_DB_DIR = path.join(ROOT, 'backups', 'db-ops1-test');
  fs.mkdirSync(process.env.BACKUP_DB_DIR, { recursive: true });

  // تأكد وجود بعض الصفوف
  await platformStore.upsertAccount({
    id: 'ACC_OPS_BAK',
    type: 'store',
    name: 'bak',
    email: 'ops-bak@example.com',
    status: 'approved',
    phone: '44220011',
    suspended: false,
    updatedAt: new Date().toISOString(),
  });
  await platformStore.upsertAd({
    id: 'OPS-BAK-AD-1',
    accountId: 'ACC_OPS_BAK',
    status: 'active',
    category: 'إلكترونيات',
    wilaya: 'نواكشوط',
    title: 'backup probe',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const srcUrl = process.env.DATABASE_URL;
  ok(/rizq_test/.test(String(srcUrl)), 'running on rizq_test', String(srcUrl).replace(/:[^:@/]+@/, ':***@'));

  const adsBefore = Number((await sql.queryOne('SELECT COUNT(*)::int AS n FROM ads')).n);
  const accBefore = Number((await sql.queryOne('SELECT COUNT(*)::int AS n FROM accounts')).n);

  const bak = spawnSync('bash', [path.join(ROOT, 'scripts/backup-db.sh')], {
    cwd: ROOT,
    env: Object.assign({}, process.env, {
      DATABASE_URL: srcUrl,
      BACKUP_DB_DIR: process.env.BACKUP_DB_DIR,
      BACKUP_GPG_PASSPHRASE: pass,
      BACKUP_ENCRYPTION_PASSPHRASE: pass,
    }),
    encoding: 'utf8',
  });
  ok(bak.status === 0, 'backup-db.sh exit 0', (bak.stderr || bak.stdout || '').slice(-200));
  const encPath = String(bak.stdout || '').trim().split('\n').filter(Boolean).pop();
  ok(encPath && fs.existsSync(encPath), 'encrypted backup file exists', encPath);

  // أنشئ rizq_test_restore
  const cfg = parseDbUrl(srcUrl);
  const adminUrl = `postgres://${encodeURIComponent(cfg.user)}:${encodeURIComponent(cfg.password)}@${cfg.host}:${cfg.port}/postgres`;
  const restoreUrl = `postgres://${encodeURIComponent(cfg.user)}:${encodeURIComponent(cfg.password)}@${cfg.host}:${cfg.port}/rizq_test_restore`;
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', ['rizq_test_restore']);
  if (!exists.rowCount) {
    await admin.query('CREATE DATABASE rizq_test_restore');
  }
  await admin.end();

  const res = spawnSync('bash', [path.join(ROOT, 'scripts/restore-db.sh'), encPath], {
    cwd: ROOT,
    env: Object.assign({}, process.env, {
      TARGET_DATABASE_URL: restoreUrl,
      POSTGRES_ADMIN_URL: adminUrl,
      BACKUP_GPG_PASSPHRASE: pass,
      BACKUP_ENCRYPTION_PASSPHRASE: pass,
    }),
    encoding: 'utf8',
  });
  ok(res.status === 0, 'restore-db.sh exit 0', (res.stderr || res.stdout || '').slice(-300));

  const restoreClient = new Client({ connectionString: restoreUrl });
  await restoreClient.connect();
  const adsAfter = Number((await restoreClient.query('SELECT COUNT(*)::int AS n FROM ads')).rows[0].n);
  const accAfter = Number((await restoreClient.query('SELECT COUNT(*)::int AS n FROM accounts')).rows[0].n);
  await restoreClient.end();

  ok(adsAfter === adsBefore, 'restored ads count matches', adsBefore + '→' + adsAfter);
  ok(accAfter === accBefore, 'restored accounts count matches', accBefore + '→' + accAfter);

  // تنظيف ملفات الاختبار
  try { fs.rmSync(process.env.BACKUP_DB_DIR, { recursive: true, force: true }); } catch (e) { /* */ }
  try { await platformStore.deleteAd('OPS-BAK-AD-1'); } catch (e) { /* */ }
  try { await platformStore.deleteAccount('ACC_OPS_BAK'); } catch (e) { /* */ }

  // نشر: ملفات موجودة
  const deploy = path.join(ROOT, 'deploy/hetzner');
  ['Caddyfile', 'rizq.service', 'postgres-tuning.conf', 'ufw-cloudflare.sh', '.env.production.example', 'INSTALL.md']
    .forEach((f) => ok(fs.existsSync(path.join(deploy, f)), 'deploy file ' + f));

  if (failed) {
    console.error('\n' + failed + ' assertion(s) failed');
    process.exit(1);
  }
  console.log('\nAll ops-1 tests passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
