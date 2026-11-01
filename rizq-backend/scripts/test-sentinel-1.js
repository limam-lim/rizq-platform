#!/usr/bin/env node
/**
 * اختبارات الحارس (SENTINEL-1) على rizq_test فقط.
 * تشغيل: node scripts/run-with-test-db.js scripts/test-sentinel-1.js
 */
'use strict';

const path = require('path');
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..', '..');
const redact = require(path.join(ROOT, 'services/sentinel/lib/redact'));
const alerts = require(path.join(ROOT, 'services/sentinel/lib/alerts'));
const { isWhitelisted, WAKE_WHITELIST } = require(path.join(ROOT, 'services/sentinel/lib/wake'));
const telegram = require(path.join(ROOT, 'services/sentinel/lib/telegram'));
const { isSentinelAccount } = require('../lib/sentinelAccount');

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
  require('./assert-rizq-test-db'); // يرفض إن لم تكن القاعدة rizq_test

  const db = require('../db');
  await db.ready();
  const sql = require('../db/sql');
  const platformStore = require('../db/platformStore');

  // ── 1) دور القراءة فقط لا يستطيع UPDATE/DELETE على accounts و ads ──
  const mainUrl = process.env.DATABASE_URL;
  const info = parseDbUrl(mainUrl);
  const pass = String(process.env.SENTINEL_DB_PASSWORD || process.env.RIZQ_SENTINEL_PASSWORD || 'sentinel_test_pass_9d2d');
  const lit = pass.replace(/'/g, "''");

  // إنشاء الدور عبر مستخدم الصيانة (postgres) — تطبيق الهجرات لا يملك CREATEROLE عادةً
  const { spawnSync } = require('child_process');
  const roleSql = [
    `DO $$ BEGIN`,
    `  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rizq_sentinel') THEN`,
    `    CREATE ROLE rizq_sentinel LOGIN PASSWORD '${lit}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;`,
    `  ELSE`,
    `    ALTER ROLE rizq_sentinel WITH LOGIN PASSWORD '${lit}';`,
    `  END IF;`,
    `END $$;`,
    `GRANT CONNECT ON DATABASE ${info.database} TO rizq_sentinel;`,
    `GRANT USAGE ON SCHEMA public TO rizq_sentinel;`,
    `GRANT SELECT ON TABLE accounts, ads, catalog_items, tenders, documents, buyers, wishlist_items TO rizq_sentinel;`,
    `GRANT SELECT, INSERT, UPDATE ON TABLE sentinel_events, sentinel_reports, sentinel_suggestions TO rizq_sentinel;`,
    `REVOKE UPDATE, DELETE, INSERT, TRUNCATE ON TABLE accounts, ads FROM rizq_sentinel;`,
    `GRANT SELECT ON TABLE accounts, ads TO rizq_sentinel;`,
  ].join('\n');
  const psql = spawnSync('sudo', ['-n', '-u', 'postgres', 'psql', '-d', info.database, '-v', 'ON_ERROR_STOP=1', '-c', roleSql], {
    encoding: 'utf8',
  });
  if (psql.status !== 0) {
    // محاولة بدون sudo إن كان المستخدم الحالي يملك CREATEROLE
    const admin = new Client({ connectionString: mainUrl });
    await admin.connect();
    try {
      await admin.query(roleSql);
    } catch (e) {
      ok(false, 'create rizq_sentinel role', (psql.stderr || e.message || '').slice(0, 300));
      throw e;
    } finally {
      await admin.end().catch(() => {});
    }
  } else {
    ok(true, 'rizq_sentinel role provisioned via postgres');
  }

  const sentinelUrl = `postgres://rizq_sentinel:${encodeURIComponent(pass)}@${info.host}:${info.port}/${info.database}`;
  const sc = new Client({ connectionString: sentinelUrl });
  await sc.connect();
  try {
    const sel = await sc.query('SELECT COUNT(*)::int AS n FROM accounts');
    ok(sel.rows[0].n >= 0, 'sentinel SELECT accounts allowed');

    let updateBlocked = false;
    try {
      await sc.query(`UPDATE accounts SET status = 'hacked' WHERE id = 'nope'`);
    } catch (e) {
      updateBlocked = /permission denied|insufficient_privilege/i.test(e.message);
    }
    ok(updateBlocked, 'sentinel UPDATE accounts denied');

    let deleteBlocked = false;
    try {
      await sc.query(`DELETE FROM ads WHERE id = 'nope'`);
    } catch (e) {
      deleteBlocked = /permission denied|insufficient_privilege/i.test(e.message);
    }
    ok(deleteBlocked, 'sentinel DELETE ads denied');

    // INSERT على جداوله الخاصة مسموح
    const eid = 'evt_test_' + Date.now();
    await sc.query(
      `INSERT INTO sentinel_events (id, kind, severity, source, summary, payload)
       VALUES ($1,'test','info','test','hello','{}')`,
      [eid]
    );
    ok(true, 'sentinel INSERT sentinel_events allowed');
    await sc.query(`UPDATE sentinel_events SET summary = 'updated' WHERE id = $1`, [eid]);
    ok(true, 'sentinel UPDATE sentinel_events allowed');
  } finally {
    await sc.end().catch(() => {});
  }

  // ── 2) محاكاة تنبيه → كتم → عودة ──
  alerts.resetAlertState();
  const sent = [];
  const fakeTg = {
    sendOwner: async (t) => { sent.push(t); return { ok: true }; },
  };
  const a1 = await alerts.notifyCritical(fakeTg, 'server_down', 'الخادم متوقف');
  const a2 = await alerts.notifyCritical(fakeTg, 'server_down', 'الخادم متوقف مجدداً');
  const a3 = await alerts.notifyRecovered(fakeTg, 'server_down', 'عاد للعمل');
  ok(a1.sent === true, 'critical alert sent once');
  ok(a2.sent === false && a2.reason === 'cooldown', 'critical alert suppressed by cooldown');
  ok(a3.sent === true, 'recovery message sent');
  ok(sent.length === 2, 'exactly two telegram sends (alert+recovery)', 'n=' + sent.length);

  // قرص / نسخة — نفس آلية الكتم
  alerts.resetAlertState();
  sent.length = 0;
  await alerts.notifyCritical(fakeTg, 'disk_full', 'القرص 90%');
  await alerts.notifyCritical(fakeTg, 'disk_full', 'القرص 91%');
  await alerts.notifyRecovered(fakeTg, 'disk_full', 'عاد القرص');
  await alerts.notifyCritical(fakeTg, 'backup_stale', 'نسخة قديمة');
  await alerts.notifyCritical(fakeTg, 'backup_stale', 'نسخة قديمة 2');
  await alerts.notifyRecovered(fakeTg, 'backup_stale', 'عادت النسخة');
  ok(sent.length === 4, 'disk+backup: alert+recovery each (4 sends)', 'n=' + sent.length);

  // ── 3) القائمة البيضاء للإيقاظ ──
  ok(isWhitelisted('lifecycle'), 'wake whitelist allows lifecycle');
  ok(!isWhitelisted('rm_rf_root'), 'wake whitelist rejects unknown');
  ok(WAKE_WHITELIST.indexOf('marketing') >= 0, 'marketing in whitelist');

  ok(!isWhitelisted('drop_database'), 'wake rejects drop_database');
  require('../routes/sentinelAdmin'); // تحميل المسار للتأكد من سلامة الاستيراد

  // ── 4) /ask من chat_id غريب يُتجاهل ──
  process.env.SENTINEL_TELEGRAM_CHAT_ID = '999001';
  const ignored = await telegram.handleUpdate({
    message: { chat: { id: 123456789 }, text: '/ask ما الحالة؟' },
  });
  ok(ignored.ignored === true && ignored.reason === 'foreign_chat', '/ask from foreign chat ignored');

  // ── 5) حساب الحارس لا يظهر في القوائم العامة ──
  const sid = 'acc_sentinel_test_' + Date.now();
  await platformStore.upsertAccount({
    id: sid,
    type: 'store',
    name: 'حارس اختبار',
    email: 'sentinel@rizq.mr',
    status: 'approved',
    phone: '44119988',
    suspended: false,
    isSentinel: true,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
  // تأكد أن العمود data يحمل isSentinel
  await sql.query(
    `UPDATE accounts SET data = jsonb_set(COALESCE(data,'{}'::jsonb), '{isSentinel}', 'true'::jsonb) WHERE id = $1`,
    [sid]
  );
  const pub = await platformStore.queryPublicAccounts({ limit: 200 });
  const hit = (pub.accounts || []).some((a) => a.id === sid || isSentinelAccount(a));
  ok(!hit, 'sentinel account excluded from public accounts list');
  ok(isSentinelAccount({ id: sid, email: 'sentinel@rizq.mr', isSentinel: true }), 'isSentinelAccount detects flag');

  // ── 6) إخفاء الهاتف والبريد ──
  ok(redact.maskPhone('22241234567') === '2224****67' || /224\*\*\*\*67|2224\*\*\*\*67/.test(redact.maskPhone('22241234567')),
    'maskPhone partial', redact.maskPhone('22241234567'));
  ok(redact.maskPhone('45112233').indexOf('****') >= 0, 'maskPhone local', redact.maskPhone('45112233'));
  ok(redact.maskEmail('owner@rizq.mr').indexOf('***@') >= 0, 'maskEmail', redact.maskEmail('owner@rizq.mr'));
  const scrubbed = redact.redactText('اتصل 22245112233 أو owner@rizq.mr');
  ok(!/45112233/.test(scrubbed) && !/owner@rizq\.mr/.test(scrubbed), 'redactText hides phone+email', scrubbed);

  // تنظيف
  await platformStore.deleteAccount(sid).catch(() => {});

  if (failed) {
    console.error('\nSENTINEL-1 FAILED:', failed);
    process.exit(1);
  }
  console.log('\nSENTINEL-1 OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
