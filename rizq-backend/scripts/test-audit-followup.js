/**
 * اختبارات متابعة تدقيق المشتركين/الأمان (جولة تدقيق الوكيل)
 * node scripts/test-audit-followup.js
 */
'use strict';

const crypto = require('crypto');
const { syncAccountPackage, getAccountRecord } = require('../rizq_package_lifecycle_agent');
const platformStore = require('../db/platformStore');
const repos = require('../db/repos');

const PORT = Number(process.env.PORT || 3000);
const BASE = 'http://127.0.0.1:' + PORT;
const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

async function req(method, urlPath, body, headers) {
  const r = await fetch(BASE + urlPath, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, body: j };
}

async function main() {
  console.log('\n=== Audit follow-up tests ===\n');

  // Unit: days → periodEnd
  const id = 'acc_audit_vid_' + Date.now() + '::video';
  const sync = await syncAccountPackage({
    accountId: id,
    accountName: 'Audit Video',
    accountType: 'video',
    pkgName: 'فيديو أساسي',
    packageId: 'vid-basic',
    price: 1000,
    days: 30,
    paymentConfirmed: true,
    activatedBy: 'admin',
  });
  ok('syncAccountPackage with days only', !!sync.ok);
  const rec = getAccountRecord(id);
  ok('periodEnd derived from days', !!(rec && rec.periodEnd && new Date(rec.periodEnd) > Date.now()),
    rec && rec.periodEnd);
  ok('period ~30 days', !!(rec && Math.abs(new Date(rec.periodEnd) - Date.now() - 30 * 86400000) < 60000));

  // Live API
  let health;
  try { health = await req('GET', '/health'); } catch (e) { health = null; }
  if (!health || health.status !== 200) {
    console.log('(skip live — server down)');
  } else {
    // Seed bank codes with a secret code
    const cfg = repos.getSiteConfig() || {};
    const secretCode = 'SECRET-BANK-' + crypto.randomBytes(4).toString('hex');
    repos.saveSiteConfig(Object.assign({}, cfg, {
      bankCodes: [{
        id: 'bc_audit_1',
        type: 'bank',
        bank: 'Audit Bank',
        code: secretCode,
        instruction: 'transfer',
        active: true,
      }],
    }));

    const pub = await req('GET', '/api/site-config');
    const banks = pub.body && pub.body.config && pub.body.config.bankCodes;
    ok('public site-config has bankCodes list', Array.isArray(banks) && banks.length >= 1);
    ok('public site-config strips bank code', !!(banks && banks[0] && banks[0].code === undefined && banks[0].bank === 'Audit Bank'),
      banks && banks[0] ? JSON.stringify(banks[0]) : 'none');

    // Seed approved account for pay-methods
    const accId = 'acc_pay_' + Date.now();
    const accessToken = crypto.randomBytes(20).toString('hex');
    const dashToken = 'TK_' + crypto.randomBytes(8).toString('hex');
    platformStore.upsertAccount({
      id: accId,
      type: 'store',
      name: 'Pay Test',
      status: 'approved',
      accessToken,
      dashToken,
    });

    const payNoAuth = await req('GET', '/api/pay-methods?accountId=' + accId);
    ok('pay-methods without token → 401', payNoAuth.status === 401);

    const payOk = await req('GET', '/api/pay-methods?accountId=' + accId, null, { 'x-account-token': accessToken });
    ok('pay-methods with token returns code',
      payOk.status === 200 && payOk.body && payOk.body.methods
        && payOk.body.methods.some((m) => m.code === secretCode),
      payOk.status + '');

    // video event for unknown id still rejected
    const ev = await req('POST', '/api/video-ads/event', { accountId: 'acc_fake_xxx', type: 'impression' });
    ok('video-ads/event rejects inactive advertiser', ev.status === 404 || (ev.body && ev.body.error === 'advertiser_not_active'));
  }

  const failed = results.filter((r) => !r.pass);
  console.log('\n' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  if (failed.length) {
    failed.forEach((f) => console.log(' FAIL', f.name, f.detail));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
