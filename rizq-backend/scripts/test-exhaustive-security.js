/**
 * اختبار المسح الشامل — Exhaustive security sweep
 * node scripts/test-exhaustive-security.js
 */
'use strict';

const crypto = require('crypto');
const platformStore = require('../db/platformStore');
const repos = require('../db/repos');
const { requireSatelliteSecret, expectedSecret } = require('../lib/satelliteAuth');
const { activateSubRequest } = require('../services/subRequestActivation');

const PORT = Number(process.env.PORT || 3000);
const BASE = 'http://127.0.0.1:' + PORT;
const SECRET = process.env.BACKEND_SHARED_SECRET || 'rizq-test-secret';
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
  console.log('\n=== Exhaustive Security Sweep ===\n');

  // 1. Low-priv admin cannot activate packages / broadcast / suspend
  // Simulate by using wrong permission via forging session is hard —
  // instead verify endpoints reject without auth and require permission key via secret=*
  const noAuth = await req('POST', '/api/account-package/sync', {
    accountId: 'acc_x', pkgName: 'ماسية', days: 365, paymentConfirmed: true, activatedBy: 'admin',
  });
  ok('package sync without auth → 401', noAuth.status === 401);

  const blast = await req('POST', '/api/broadcast-sms', { message: 'hi' });
  ok('broadcast-sms without auth → 401', blast.status === 401);

  const deact = await req('POST', '/api/deactivation-requests/admin/x/resolve', { action: 'approve' });
  ok('deactivation resolve without auth → 401', deact.status === 401);

  const subDec = await req('POST', '/api/sub-requests/admin/x/decision', { action: 'approve' });
  ok('sub-request decision without auth → 401', subDec.status === 401);

  // Shared secret (super) still works for payments
  const withSecret = await req('GET', '/api/sub-requests/admin', null, { 'x-rizq-secret': SECRET });
  ok('sub-requests admin with server secret → 200', withSecret.status === 200, 'status=' + withSecret.status);

  // 2. Investments require auth
  const invPlan = await req('POST', '/api/investments/plan', { title: 'Test plan long enough', description: 'x'.repeat(40) });
  ok('investments/plan without auth → 401', invPlan.status === 401);

  const invSub = await req('POST', '/api/investments/submit', {
    title: 'فرصة استثمارية كاملة', description: 'وصف طويل بما يكفي للاختبار '.repeat(3), capital: '1000', sector: 'تجارة',
  });
  ok('investments/submit without auth → 401', invSub.status === 401);

  // 3. Video category does not activate diamond package
  let videoAct = null;
  try {
    videoAct = await activateSubRequest({
      id: 'sub_test_video',
      status: 'pending',
      category: 'video',
      pkg: 'الماسية المتقدمة',
      price: 0,
      accountId: 'acc_nonexistent_video',
      videoUrl: 'https://example.com/v.mp4',
    }, {
      syncAccountPackage: async () => ({ ok: true, shouldNotRun: true }),
      getAccountRecord: () => null,
      readAccounts: () => [],
      writeAccounts: () => {},
    });
  } catch (e) {
    videoAct = { ok: false, error: e.message };
  }
  ok('video category rejects diamond package masquerading as video',
    videoAct && videoAct.ok === false && (videoAct.error === 'invalid_video_package' || /diamond|ماس|invalid/i.test(String(videoAct.error || videoAct.message || ''))),
    JSON.stringify(videoAct));

  // 4. Email uniqueness on register (seed then conflict)
  const email = 'uniq_' + Date.now() + '@rizq.test';
  const phone1 = '44' + String(Date.now()).slice(-6);
  // skip full register (needs OTP) — unit check via list collision is covered in buyer model;
  // verify API rejects duplicate email if we can plant account
  const id = 'acc_exh_' + Date.now();
  const tok = crypto.randomBytes(16).toString('hex');
  platformStore.upsertAccount({
    id, type: 'individual', name: 'Exh Seller', status: 'approved',
    accessToken: tok, phone: phone1, email,
  });
  try {
    const dup = await req('POST', '/api/accounts', {
      type: 'individual', name: 'Other Person Name', phone: '44' + String(Date.now() + 1).slice(-6),
      email, password: 'password123',
    });
    ok('duplicate seller email → 409', dup.status === 409 || (dup.body && dup.body.code === 'email_in_use'),
      'status=' + dup.status + ' code=' + (dup.body && dup.body.code));
  } finally {
    try { platformStore.deleteAccount(id); } catch (e) { /* */ }
  }

  // 5. Agent channel flags without diamond
  const id2 = 'acc_exh2_' + Date.now();
  const tok2 = crypto.randomBytes(16).toString('hex');
  platformStore.upsertAccount({
    id: id2, type: 'store', name: 'No Diamond', status: 'approved',
    accessToken: tok2, phone: '44110022', email: 'nodiam_' + Date.now() + '@rizq.test',
  });
  try {
    const flags = await req('PATCH', '/api/accounts/mine/' + id2, {
      widget_enabled: true,
    }, { 'x-account-token': tok2 });
    ok('widget_enabled without diamond → 403', flags.status === 403,
      'status=' + flags.status + ' code=' + (flags.body && flags.body.code));
  } finally {
    try { platformStore.deleteAccount(id2); } catch (e) { /* */ }
  }

  // 6. Ad boost public response redacted
  const boostGet = await req('GET', '/api/ad-boosts/NO_SUCH_AD');
  ok('ad-boosts public shape', boostGet.status === 200 && boostGet.body
    && boostGet.body.boost === undefined
    && (boostGet.body.active === false || boostGet.body.boosted === false));

  // 7. Satellite auth helper
  const fakeReq = { header: () => '', body: {}, query: {} };
  let satStatus = null;
  requireSatelliteSecret(fakeReq, {
    status(c) { satStatus = c; return this; },
    json() { return this; },
  }, () => { satStatus = 200; });
  ok('satellite secret rejects empty', satStatus === 401 || satStatus === 503);

  // 8. Reviews still require auth
  const rev = await req('POST', '/api/reviews', { targetId: 'acc_x', rating: 5 });
  ok('anon review → 401', rev.status === 401);

  const failed = results.filter((r) => !r.pass);
  console.log('\nPassed:', results.length - failed.length, '/', results.length);
  if (failed.length) {
    failed.forEach((f) => console.log(' -', f.name, f.detail));
    process.exitCode = 1;
  } else {
    console.log('ALL EXHAUSTIVE TESTS PASSED');
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
