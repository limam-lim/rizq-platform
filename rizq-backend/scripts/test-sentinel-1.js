#!/usr/bin/env node
/**
 * اختبارات الحارس (SENTINEL-1) على rizq_test فقط.
 * تشغيل: node scripts/run-with-test-db.js scripts/test-sentinel-1.js
 */
'use strict';

const path = require('path');
const http = require('http');
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..', '..');
const redact = require(path.join(ROOT, 'services/sentinel/lib/redact'));
const alerts = require(path.join(ROOT, 'services/sentinel/lib/alerts'));
const { isWhitelisted, WAKE_WHITELIST } = require(path.join(ROOT, 'services/sentinel/lib/wake'));
const telegram = require(path.join(ROOT, 'services/sentinel/lib/telegram'));
const { isSentinelAccount } = require('../lib/sentinelAccount');
const {
  isLocalWakeRequest,
  requireLocalWake,
  requireWakeSecret,
} = require('../routes/sentinelAdmin');
const { spawnHttpTestServer } = require('./_spawnHttpTestServer');

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

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; },
  };
}

function httpJson(port, method, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = body == null ? null : JSON.stringify(body);
    const req = http.request({
      host: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: Object.assign(
        { Accept: 'application/json' },
        payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {},
        headers || {}
      ),
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch (_) { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  require('./assert-rizq-test-db');

  const db = require('../db');
  await db.ready();
  const sql = require('../db/sql');
  const platformStore = require('../db/platformStore');

  const mainUrl = process.env.DATABASE_URL;
  const info = parseDbUrl(mainUrl);
  const pass = String(process.env.SENTINEL_DB_PASSWORD || process.env.RIZQ_SENTINEL_PASSWORD || 'sentinel_test_pass_9d2d');
  const lit = pass.replace(/'/g, "''");

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
    `REVOKE ALL ON TABLE accounts, ads, catalog_items, tenders, documents, buyers, wishlist_items FROM rizq_sentinel;`,
    `GRANT SELECT ON sentinel_v_accounts, sentinel_v_ads, sentinel_v_catalog, sentinel_v_tenders, sentinel_v_requests TO rizq_sentinel;`,
    `GRANT SELECT, INSERT, UPDATE ON TABLE sentinel_events, sentinel_reports, sentinel_suggestions TO rizq_sentinel;`,
  ].join('\n');
  const psql = spawnSync('sudo', ['-n', '-u', 'postgres', 'psql', '-d', info.database, '-v', 'ON_ERROR_STOP=1', '-c', roleSql], {
    encoding: 'utf8',
  });
  if (psql.status !== 0) {
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

  // تأكيد أن المالك منح الـ views (الهجرة قد سبقت الدور)
  const owner = new Client({ connectionString: mainUrl });
  await owner.connect();
  try {
    await owner.query(`REVOKE ALL ON TABLE accounts, ads, catalog_items, tenders, documents, buyers, wishlist_items FROM rizq_sentinel`);
    await owner.query(`GRANT SELECT ON sentinel_v_accounts, sentinel_v_ads, sentinel_v_catalog, sentinel_v_tenders, sentinel_v_requests TO rizq_sentinel`);
    await owner.query(`GRANT SELECT, INSERT, UPDATE ON TABLE sentinel_events, sentinel_reports, sentinel_suggestions TO rizq_sentinel`);
  } finally {
    await owner.end().catch(() => {});
  }

  const sentinelUrl = `postgres://rizq_sentinel:${encodeURIComponent(pass)}@${info.host}:${info.port}/${info.database}`;
  const sc = new Client({ connectionString: sentinelUrl });
  await sc.connect();
  try {
    const sel = await sc.query('SELECT COUNT(*)::int AS n FROM sentinel_v_accounts');
    ok(sel.rows[0].n >= 0, 'sentinel SELECT sentinel_v_accounts allowed');

    let tableBlocked = false;
    try {
      await sc.query('SELECT id, data FROM accounts LIMIT 1');
    } catch (e) {
      tableBlocked = /permission denied|insufficient_privilege/i.test(e.message);
    }
    ok(tableBlocked, 'sentinel cannot SELECT data from accounts table');

    let passHashBlocked = false;
    try {
      await sc.query(`SELECT data->>'passHash' AS ph FROM accounts LIMIT 1`);
    } catch (e) {
      passHashBlocked = /permission denied|insufficient_privilege/i.test(e.message);
    }
    ok(passHashBlocked, 'sentinel cannot SELECT passHash from accounts');

    let docsBlocked = false;
    try {
      await sc.query('SELECT data FROM documents LIMIT 1');
    } catch (e) {
      docsBlocked = /permission denied|insufficient_privilege/i.test(e.message);
    }
    ok(docsBlocked, 'sentinel cannot SELECT documents.data');

    let buyersBlocked = false;
    try {
      await sc.query('SELECT token, phone FROM buyers LIMIT 1');
    } catch (e) {
      buyersBlocked = /permission denied|insufficient_privilege/i.test(e.message);
    }
    ok(buyersBlocked, 'sentinel cannot SELECT buyers');

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

    const eid = 'evt_test_' + Date.now();
    await sc.query(
      `INSERT INTO sentinel_events (id, kind, severity, source, summary, payload)
       VALUES ($1,'test','info','test','hello','{}')`,
      [eid]
    );
    ok(true, 'sentinel INSERT sentinel_events allowed');
    await sc.query(`UPDATE sentinel_events SET summary = 'updated' WHERE id = $1`, [eid]);
    ok(true, 'sentinel UPDATE sentinel_events allowed');

    const viewCols = await sc.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name='sentinel_v_accounts'`
    );
    const cols = (viewCols.rows || []).map((r) => r.column_name);
    ok(!cols.includes('data') && !cols.includes('email') && !cols.includes('nni'),
      'sentinel_v_accounts has no data/email/nni columns', cols.join(','));
  } finally {
    await sc.end().catch(() => {});
  }

  // ── تنبيه → كتم → عودة ──
  alerts.resetAlertState();
  const sent = [];
  const fakeTg = { sendOwner: async (t) => { sent.push(t); return { ok: true }; } };
  const a1 = await alerts.notifyCritical(fakeTg, 'server_down', 'الخادم متوقف');
  const a2 = await alerts.notifyCritical(fakeTg, 'server_down', 'الخادم متوقف مجدداً');
  const a3 = await alerts.notifyRecovered(fakeTg, 'server_down', 'عاد للعمل');
  ok(a1.sent === true, 'critical alert sent once');
  ok(a2.sent === false && a2.reason === 'cooldown', 'critical alert suppressed by cooldown');
  ok(a3.sent === true, 'recovery message sent');
  ok(sent.length === 2, 'exactly two telegram sends (alert+recovery)', 'n=' + sent.length);

  alerts.resetAlertState();
  sent.length = 0;
  await alerts.notifyCritical(fakeTg, 'disk_full', 'القرص 90%');
  await alerts.notifyCritical(fakeTg, 'disk_full', 'القرص 91%');
  await alerts.notifyRecovered(fakeTg, 'disk_full', 'عاد القرص');
  await alerts.notifyCritical(fakeTg, 'backup_stale', 'نسخة قديمة');
  await alerts.notifyCritical(fakeTg, 'backup_stale', 'نسخة قديمة 2');
  await alerts.notifyRecovered(fakeTg, 'backup_stale', 'عادت النسخة');
  ok(sent.length === 4, 'disk+backup: alert+recovery each (4 sends)', 'n=' + sent.length);

  ok(isWhitelisted('lifecycle'), 'wake whitelist allows lifecycle');
  ok(!isWhitelisted('rm_rf_root'), 'wake whitelist rejects unknown');
  ok(WAKE_WHITELIST.indexOf('marketing') >= 0, 'marketing in whitelist');
  ok(!isWhitelisted('drop_database'), 'wake rejects drop_database');

  // ── إيقاظ: IP خارجي → 403 ──
  const extReq = { socket: { remoteAddress: '203.0.113.50' }, header() { return ''; } };
  const extRes = mockRes();
  let extNext = false;
  requireLocalWake(extReq, extRes, () => { extNext = true; });
  ok(extRes.statusCode === 403 && !extNext, 'wake from external IP → 403');

  const localReq = { socket: { remoteAddress: '127.0.0.1' }, header() { return ''; } };
  ok(isLocalWakeRequest(localReq) === true, '127.0.0.1 is local');
  ok(isLocalWakeRequest({ socket: { remoteAddress: '::ffff:127.0.0.1' } }) === true, '::ffff:127.0.0.1 is local');
  ok(isLocalWakeRequest({ socket: { remoteAddress: '::1' } }) === true, '::1 is local');

  // ── بلا سر مضبوط → 503 (وحدة) ──
  const prevWake = process.env.SENTINEL_WAKE_SECRET;
  process.env.SENTINEL_WAKE_SECRET = '';
  const noSecretRes = mockRes();
  let noSecretNext = false;
  requireWakeSecret(
    { socket: { remoteAddress: '127.0.0.1' }, header() { return 'anything'; } },
    noSecretRes,
    () => { noSecretNext = true; }
  );
  ok(noSecretRes.statusCode === 503 && !noSecretNext, 'wake without SENTINEL_WAKE_SECRET → 503');

  // ── سر خاطئ → 401 ؛ صحيح من localhost → 200 ──
  process.env.SENTINEL_WAKE_SECRET = 'sentinel-wake-test-secret-9d2d';
  process.env.BACKEND_SHARED_SECRET = process.env.BACKEND_SHARED_SECRET || 'shared-should-not-work-for-wake';
  let srv = null;
  try {
    srv = await spawnHttpTestServer({ timeoutMs: 60000 });
    const wrong = await httpJson(srv.port, 'POST', '/api/internal/sentinel/wake', {
      'X-Sentinel-Secret': 'wrong-secret',
    }, { agent: 'lifecycle' });
    ok(wrong.status === 401, 'wake with wrong secret → 401', 'status=' + wrong.status);

    const viaShared = await httpJson(srv.port, 'POST', '/api/internal/sentinel/wake', {
      'X-Shared-Secret': process.env.BACKEND_SHARED_SECRET,
    }, { agent: 'lifecycle' });
    ok(viaShared.status === 401, 'wake rejects BACKEND_SHARED_SECRET fallback → 401', 'status=' + viaShared.status);

    const okWake = await httpJson(srv.port, 'POST', '/api/internal/sentinel/wake', {
      'X-Sentinel-Secret': 'sentinel-wake-test-secret-9d2d',
    }, { agent: 'quota_guard' });
    ok(okWake.status === 200 && okWake.body && okWake.body.ok !== false,
      'wake with correct secret from localhost → 200', 'status=' + okWake.status);
  } finally {
    if (srv) await srv.stop().catch(() => {});
  }

  // اختبار 503 عبر خادم بلا السر (سلسلة فارغة تمنع dotenv من إعادة التحميل فوقها إن وُجدت)
  process.env.SENTINEL_WAKE_SECRET = '';
  let srv2 = null;
  try {
    srv2 = await spawnHttpTestServer({ timeoutMs: 60000 });
    const noCfg = await httpJson(srv2.port, 'POST', '/api/internal/sentinel/wake', {
      'X-Sentinel-Secret': 'x',
    }, { agent: 'lifecycle' });
    ok(noCfg.status === 503, 'HTTP wake without configured secret → 503', 'status=' + noCfg.status);
  } finally {
    if (srv2) await srv2.stop().catch(() => {});
    if (prevWake == null || prevWake === '') delete process.env.SENTINEL_WAKE_SECRET;
    else process.env.SENTINEL_WAKE_SECRET = prevWake;
  }

  process.env.SENTINEL_TELEGRAM_CHAT_ID = '999001';
  const ignored = await telegram.handleUpdate({
    message: { chat: { id: 123456789 }, text: '/ask ما الحالة؟' },
  });
  ok(ignored.ignored === true && ignored.reason === 'foreign_chat', '/ask from foreign chat ignored');

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
  await sql.query(
    `UPDATE accounts SET data = jsonb_set(COALESCE(data,'{}'::jsonb), '{isSentinel}', 'true'::jsonb) WHERE id = $1`,
    [sid]
  );
  const pub = await platformStore.queryPublicAccounts({ limit: 200 });
  const hit = (pub.accounts || []).some((a) => a.id === sid || isSentinelAccount(a));
  ok(!hit, 'sentinel account excluded from public accounts list');
  ok(isSentinelAccount({ id: sid, email: 'sentinel@rizq.mr', isSentinel: true }), 'isSentinelAccount detects flag');

  ok(redact.maskPhone('22241234567') === '2224****67' || /224\*\*\*\*67|2224\*\*\*\*67/.test(redact.maskPhone('22241234567')),
    'maskPhone partial', redact.maskPhone('22241234567'));
  ok(redact.maskPhone('45112233').indexOf('****') >= 0, 'maskPhone local', redact.maskPhone('45112233'));
  ok(redact.maskEmail('owner@rizq.mr').indexOf('***@') >= 0, 'maskEmail', redact.maskEmail('owner@rizq.mr'));
  const scrubbed = redact.redactText('اتصل 22245112233 أو owner@rizq.mr');
  ok(!/45112233/.test(scrubbed) && !/owner@rizq\.mr/.test(scrubbed), 'redactText hides phone+email', scrubbed);

  // رفض كلمة سر CHANGE_ME في sentinel-role.sql (فحص نصي + تشغيل جاف إن أمكن)
  const roleFile = require('fs').readFileSync(
    path.join(ROOT, 'deploy/hetzner/sentinel-role.sql'),
    'utf8'
  );
  ok(!/PASSWORD 'CHANGE_ME/.test(roleFile), 'sentinel-role.sql has no default CHANGE_ME password literal');
  ok(/-v sentinel_password/.test(roleFile) || /:'sentinel_password'/.test(roleFile),
    'sentinel-role.sql expects -v sentinel_password');

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
