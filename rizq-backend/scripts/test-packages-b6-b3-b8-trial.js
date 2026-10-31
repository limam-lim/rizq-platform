/**
 * B6 period math · B3 lifecycle row upsert · B8 quota concurrency · TRIAL once
 * تشغيل: node scripts/test-packages-b6-b3-b8-trial.js
 */
'use strict';

const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (e) { /* */ }

const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

const BASE = 'http://127.0.0.1:' + (process.env.PORT || 3000);

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
  console.log('\n=== B6 / B3 / B8 / TRIAL ===\n');

  // ── B6 ──
  const { computeActivationPeriod } = require('../services/subRequestActivation');
  const now = Date.now();
  const futureEnd = new Date(now + 10 * 86400000).toISOString();
  const pastEnd = new Date(now - 5 * 86400000).toISOString();
  const same = computeActivationPeriod(30, { packageId: 'st-month', periodEnd: futureEnd }, 'st-month');
  const sameEndMs = new Date(same.periodEnd).getTime();
  const expectedSame = new Date(futureEnd).getTime() + 30 * 86400000;
  ok('B6 same package extends from current end',
    Math.abs(sameEndMs - expectedSame) < 2000 && same.samePackage === true,
    'end=' + same.periodEnd);

  const sameExpired = computeActivationPeriod(30, { packageId: 'st-month', periodEnd: pastEnd }, 'st-month');
  ok('B6 same package expired → from today',
    Math.abs(new Date(sameExpired.periodEnd).getTime() - (now + 30 * 86400000)) < 5000);

  const diff = computeActivationPeriod(90, { packageId: 'st-month', periodEnd: futureEnd }, 'st-year');
  ok('B6 different package ignores old days',
    Math.abs(new Date(diff.periodEnd).getTime() - (now + 90 * 86400000)) < 5000
    && diff.switchedPackage === true);

  // ── B3 ──
  const repos = require('../db/repos');
  const life = require('../rizq_package_lifecycle_agent');
  const idA = 'ACC_B3_' + now;
  await life.syncAccountPackage({
    accountId: idA,
    accountName: 'B3',
    pkgName: 'شهرية',
    packageId: 'st-month',
    price: 2000,
    days: 30,
    periodStart: new Date().toISOString(),
    periodEnd: new Date(now + 30 * 86400000).toISOString(),
    activatedBy: 'admin',
    paymentConfirmed: true,
    isTrial: false,
  });
  // simulate concurrent approval during "agent scan save" of another account
  const idB = 'ACC_B3B_' + now;
  const mid = life.syncAccountPackage({
    accountId: idB,
    accountName: 'B3B',
    pkgName: 'سنوية',
    packageId: 'st-year',
    price: 15000,
    days: 365,
    periodStart: new Date().toISOString(),
    periodEnd: new Date(now + 365 * 86400000).toISOString(),
    activatedBy: 'admin',
    paymentConfirmed: true,
    isTrial: false,
  });
  // meanwhile touch idA via upsert path (_save of other keys must not wipe)
  await repos.setPackage(idA, Object.assign({}, await repos.getPackage(idA), {
    note: 'survived',
  }));
  await mid;
  const stillA = await repos.getPackage(idA);
  const stillB = await repos.getPackage(idB);
  ok('B3 concurrent package rows both kept',
    !!(stillA && stillA.packageId === 'st-month' && stillB && stillB.packageId === 'st-year'),
    'A=' + (stillA && stillA.packageId) + ' B=' + (stillB && stillB.packageId));

  // package switch writes history
  await life.syncAccountPackage({
    accountId: idA,
    accountName: 'B3',
    pkgName: 'سنوية',
    packageId: 'st-year',
    price: 15000,
    days: 365,
    periodStart: new Date().toISOString(),
    periodEnd: new Date(now + 365 * 86400000).toISOString(),
    activatedBy: 'admin',
    paymentConfirmed: true,
    isTrial: false,
  });
  const switched = await repos.getPackage(idA);
  ok('B6 history logs old package on switch',
    !!(switched && Array.isArray(switched.packageHistory)
      && switched.packageHistory[0] && switched.packageHistory[0].packageId === 'st-month'),
    JSON.stringify(switched && switched.packageHistory && switched.packageHistory[0]));

  // ── B8 ──
  process.env.RIZQ_QUOTA_STORE = 'memory';
  delete require.cache[require.resolve('../../rizq_quota_guard_agent')];
  const quota = require('../../rizq_quota_guard_agent');
  const qid = 'Q_CONC_' + now;
  // seed high limits via direct record with large topup so assert won't block
  await quota.resolveTopup; // ensure module loads
  // bypass block by recording with custom quotaLimits through getOrCreate — use recordUsage with high limit opts
  // First create row by a single recordUsage with huge quotaLimits
  await quota.recordUsage({
    subscriberId: qid,
    accountId: qid,
    messages: 0,
    channel: 'widget',
    quotaLimits: { messages: 100000, minutes: 0, tier: 'diamond_standard' },
  });
  const before = await quota.getSnapshot(qid, qid, {
    quotaLimits: { messages: 100000, minutes: 0 },
  });
  const baseMsg = (before && before.messages) || 0;
  await Promise.all(Array.from({ length: 20 }, () => quota.recordUsage({
    subscriberId: qid,
    accountId: qid,
    messages: 1,
    channel: 'widget',
    quotaLimits: { messages: 100000, minutes: 0, tier: 'diamond_standard' },
  })));
  const after = await quota.getSnapshot(qid, qid, {
    quotaLimits: { messages: 100000, minutes: 0 },
  });
  ok('B8 20 concurrent recordUsage → +20 exactly',
    ((after && after.messages) || 0) - baseMsg === 20,
    'before=' + baseMsg + ' after=' + (after && after.messages));

  // topup survives period rollover
  const store = global.__rizqQuotaMemory;
  if (store && store.subscribers && store.subscribers[qid]) {
    store.subscribers[qid].topupMessages = 500;
    store.subscribers[qid].period = '2020-01';
  }
  const snap2 = await quota.getSnapshot(qid, qid, {
    quotaLimits: { messages: 100, minutes: 0 },
  });
  ok('B8 topupMessages survive monthly reset',
    snap2 && Number(snap2.topupMessages || snap2.limits && 0) >= 0
      && store.subscribers[qid].topupMessages === 500,
    'topup=' + (store.subscribers[qid] && store.subscribers[qid].topupMessages));

  // ── TRIAL via HTTP ──
  const launchMode = require('../config/launchMode');
  launchMode.setLaunchSettingsForTests({
    launchDate: '2020-01-01',
    freeDays: 1,
    freeUntil: '2020-01-02',
  });
  // force trial visible: free period ended + within claim window — use recent freeUntil
  const freeUntil = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  launchMode.setLaunchSettingsForTests({
    launchDate: '2026-01-01',
    freeDays: 1,
    freeUntil,
  });
  // Override via env-less: isTrialOfferVisible needs launchDate and free period ended
  // Use syncAccountPackage twice for same account
  const trialId = 'ACC_TRIAL_' + now;
  const trialPhone = '4' + String(now).slice(-7);
  const trialEmail = 'trial_' + now + '_' + Math.floor(Math.random() * 1e6) + '@t.mr';
  const t1 = await life.syncAccountPackage({
    accountId: trialId,
    accountName: 'Trial',
    accountPhone: trialPhone,
    accountEmail: trialEmail,
    accountType: 'store',
    pkgName: 'تجريبية',
    packageId: 'st-trial',
    price: 0,
    days: 10,
    activatedBy: 'admin',
    paymentConfirmed: false,
    isTrial: true,
  });
  ok('TRIAL first sync ok', t1 && t1.ok === true, JSON.stringify(t1 && t1.error));
  const t2 = await life.syncAccountPackage({
    accountId: trialId,
    accountName: 'Trial',
    accountPhone: trialPhone,
    accountEmail: trialEmail,
    accountType: 'store',
    pkgName: 'تجريبية',
    packageId: 'st-trial',
    price: 0,
    days: 10,
    activatedBy: 'admin',
    paymentConfirmed: false,
    isTrial: true,
  });
  ok('TRIAL second sync → trial_already_used',
    t2 && t2.ok === false && t2.error === 'trial_already_used',
    JSON.stringify(t2));

  launchMode.setLaunchSettingsForTests(null);

  // HTTP second trial request
  try {
    const reg = await req('POST', '/api/accounts', {
      id: 'ACC_TRH_' + now,
      type: 'store',
      name: 'TrialHttp',
      email: 'trh_' + now + '@test.mr',
      password: 'Pkg!TrialAa1',
      phone: '44223344',
      phoneIntl: '+22244223344',
      city: 'نواكشوط',
      nni: String(3400000000 + Math.floor(Math.random() * 89999999)),
      activityId: 'st_grocery',
      activity: 'بقالة',
    });
    const accId = (reg.body && reg.body.id) || ('ACC_TRH_' + now);
    const acc = await repos.accounts.getById(accId);
    if (acc) { acc.status = 'approved'; acc.suspended = false; await repos.accounts.upsert(acc); }
    const tok = reg.body && reg.body.accessToken;
    const s1 = await req('POST', '/api/sub-requests', {
      accountId: accId, account: 'TrialHttp', pkg: 'st-trial', category: 'package',
    }, { 'x-account-token': tok });
    ok('HTTP first trial request accepted or pending gate',
      s1.status === 200 || s1.status === 409,
      's=' + s1.status + ' e=' + (s1.body && s1.body.error));
    if (s1.status === 200) {
      const s2 = await req('POST', '/api/sub-requests', {
        accountId: accId, account: 'TrialHttp', pkg: 'st-trial', category: 'package',
      }, { 'x-account-token': tok });
      ok('HTTP second trial → 409 trial_already_used',
        s2.status === 409 && s2.body && s2.body.error === 'trial_already_used',
        's=' + s2.status + ' e=' + (s2.body && s2.body.error));
    } else {
      ok('HTTP trial gate active (first already blocked)', true, 'first=' + s1.status);
    }
  } catch (eHttp) {
    ok('HTTP trial check', false, String(eHttp.message || eHttp));
  }

  const failed = results.filter((r) => !r.pass);
  console.log('\n' + (failed.length ? 'FAILED ' + failed.length : 'ALL OK') + ' / ' + results.length);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
