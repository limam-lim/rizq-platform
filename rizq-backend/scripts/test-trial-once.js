#!/usr/bin/env node
/**
 * test-trial-once.js — تجربة مجانية واحدة لكل حساب ولكل فئة.
 *   - POST /api/sub-requests لتجربة ثانية (نفس الحساب + الفئة) → 409 trial_already_used
 *   - فئة أخرى (مناقصات) أو باقة مدفوعة لا تتأثر؛ طلب تجربة مرفوض لا يُحتسب
 *   - syncAccountPackage يرفض تجربة ثانية حتى بتفعيل الأدمن (activatedBy:'admin')
 *   - نفس الهاتف على حساب آخر في نفس الفئة → trial_already_used
 *
 * يتطلب DB_DRIVER=postgres + DATABASE_URL (قاعدة اختبار).
 * الاستخدام: npm run test:trial-once
 */
'use strict';

const path = require('path');
const { spawn } = require('child_process');

const BACKEND = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-trial-once: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }
  delete process.env.WHATSAPP_TOKEN; delete process.env.EMAIL_USER; delete process.env.TWILIO_SID;
  const repos = require('../db/repos');
  const life = require('../rizq_package_lifecycle_agent');
  const { activateSubRequest } = require('../services/subRequestActivation');

  const now = Date.now();
  const phone = '3' + String(now).slice(-7);
  const mkAcc = (suffix, ph) => ({
    id: 'ACC_TRIAL1_' + suffix + '_' + now, type: 'store', name: 'Trial ' + suffix,
    email: 'trial1' + suffix.toLowerCase() + now + '@test.mr', phone: ph,
    status: 'approved', suspended: false,
    accessToken: 'tok_trial1_' + suffix + '_' + now, accessTokenExpiresAt: new Date(now + 86400000).toISOString(),
    createdAt: new Date(now).toISOString(),
  });
  const acc = mkAcc('A', phone);
  const accRej = mkAcc('R', '2' + String(now).slice(-7));
  const twin = mkAcc('T', phone);
  for (const a of [acc, accRej, twin]) await repos.accounts.upsert(a);

  const port = 4300 + Math.floor(Math.random() * 90);
  const env = Object.assign({}, process.env, { PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test' });
  delete env.TELEGRAM_BOT_TOKEN;
  const child = spawn(process.execPath, ['server.js'], { cwd: BACKEND, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  const U = 'http://127.0.0.1:' + port;
  const call = (body, token) => fetch(U + '/api/sub-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-account-token': token },
    body: JSON.stringify(body),
  }).then(async (r) => ({ s: r.status, d: await r.json().catch(() => null) }));
  const createdSubs = [];
  const track = (r) => { if (r && r.d && r.d.id) createdSubs.push(r.d.id); return r; };

  try {
    let up = false;
    for (let i = 0; i < 150 && !up; i++) {
      try { up = (await fetch(U + '/api/otp/config')).ok; } catch (e) { /* */ }
      if (!up) await new Promise((s) => setTimeout(s, 300));
    }
    ok('server boots on test port', up, logs.slice(-600));
    if (!up) throw new Error('server did not start');

    console.log('\n— POST /api/sub-requests —');
    const first = track(await call({ accountId: acc.id, account: acc.name, pkg: 'st-trial', category: 'package' }, acc.accessToken));
    ok('first trial request accepted', first.s === 200 && first.d && first.d.ok === true, first);
    const second = track(await call({ accountId: acc.id, account: acc.name, pkg: 'st-trial', category: 'package' }, acc.accessToken));
    ok('second trial request (same account + category) → 409 trial_already_used',
      second.s === 409 && second.d && second.d.error === 'trial_already_used', second);
    const tender = track(await call({ accountId: acc.id, account: acc.name, pkg: 'tnd-trial', category: 'tender' }, acc.accessToken));
    ok('trial in another category (tender) still allowed', tender.s === 200, tender);
    const tender2 = track(await call({ accountId: acc.id, account: acc.name, pkg: 'tnd-trial', category: 'tender' }, acc.accessToken));
    ok('second tender trial → 409 trial_already_used', tender2.s === 409 && tender2.d && tender2.d.error === 'trial_already_used', tender2);
    const paid = track(await call({ accountId: acc.id, account: acc.name, pkg: 'st-month', category: 'package' }, acc.accessToken));
    ok('paid package request unaffected', paid.s === 200, paid);

    console.log('\n— approval consumes the trial —');
    const row = await repos.subRequests.get(first.d.id);
    const deps = {
      syncAccountPackage: life.syncAccountPackage,
      getAccountRecord: life.getAccountRecord,
      readAccounts: async () => [acc],
      writeAccounts: async () => {},
    };
    const act = await activateSubRequest(row, deps);
    ok('first trial activates', act && act.ok === true, act);
    await repos.subRequests.upsert(row.id, Object.assign({}, await repos.subRequests.get(row.id), { status: 'approved' }), { skipBackup: true });
    ok('trial recorded on the package', (await life.getAccountRecord(acc.id) || {}).isTrial === true);

    const again = await life.syncAccountPackage({
      accountId: acc.id, accountName: acc.name, accountPhone: acc.phone, accountType: 'store',
      pkgName: 'تجريبية', packageId: 'st-trial', price: 0, days: 10, activatedBy: 'admin', isTrial: true,
    });
    ok('admin activation of a second trial → trial_already_used', again && again.ok === false && again.error === 'trial_already_used', again);
    const afterApproval = track(await call({ accountId: acc.id, account: acc.name, pkg: 'st-trial', category: 'package' }, acc.accessToken));
    ok('trial request after the trial was used → 409', afterApproval.s === 409 && afterApproval.d && afterApproval.d.error === 'trial_already_used', afterApproval);

    const paidSync = await life.syncAccountPackage({
      accountId: acc.id, accountName: acc.name, accountType: 'store',
      pkgName: 'شهرية', packageId: 'st-month', price: 2000, days: 30, activatedBy: 'admin', paymentConfirmed: true,
    });
    ok('upgrade to a paid package works', paidSync && paidSync.ok === true, paidSync);
    const afterUpgrade = await life.syncAccountPackage({
      accountId: acc.id, accountName: acc.name, accountType: 'store',
      pkgName: 'تجريبية', packageId: 'st-trial', price: 0, days: 10, activatedBy: 'admin', isTrial: true,
    });
    ok('trial still blocked after switching to a paid package', afterUpgrade && afterUpgrade.error === 'trial_already_used', afterUpgrade);

    const twinTrial = await life.syncAccountPackage({
      accountId: twin.id, accountName: twin.name, accountPhone: twin.phone, accountType: 'store',
      pkgName: 'تجريبية', packageId: 'st-trial', price: 0, days: 10, activatedBy: 'admin', isTrial: true,
    });
    ok('same phone on another account (same category) → trial_already_used', twinTrial && twinTrial.error === 'trial_already_used', twinTrial);

    console.log('\n— rejected trial request does not count —');
    const rj = track(await call({ accountId: accRej.id, account: accRej.name, pkg: 'st-trial', category: 'package' }, accRej.accessToken));
    ok('trial request accepted', rj.s === 200, rj);
    if (rj.d && rj.d.id) {
      // انتظر انتهاء تحليل الطلب في الخلفية (يكتب نسخته من الصف) قبل رفض الأدمن
      for (let i = 0; i < 50; i++) {
        const cur = await repos.subRequests.get(rj.d.id);
        if (cur && cur.aiAnalyzedAt) break;
        await new Promise((s) => setTimeout(s, 100));
      }
      await repos.subRequests.upsert(rj.d.id, Object.assign({}, await repos.subRequests.get(rj.d.id), { status: 'rejected' }), { skipBackup: true });
    }
    const rj2 = track(await call({ accountId: accRej.id, account: accRej.name, pkg: 'st-trial', category: 'package' }, accRej.accessToken));
    ok('new trial request after rejection accepted', rj2.s === 200, rj2);
  } finally {
    child.kill('SIGTERM');
    await new Promise((s) => setTimeout(s, 400));
    for (const a of [acc, accRej, twin]) {
      for (const key of [a.id, a.id + '::tender']) {
        try { await repos.packages.remove(key, { skipBackup: true }); } catch (e) { /* */ }
        try { await repos.trialClaims.remove(key, { skipBackup: true }); } catch (e) { /* */ }
      }
    }
    for (const id of createdSubs) {
      try { await repos.subRequests.remove(id, { skipBackup: true }); } catch (e) { /* */ }
    }
    try { await repos.packages.writeBackup(); await repos.subRequests.writeBackup(); } catch (e) { /* */ }
    if (fail) console.log('\n--- server log tail ---\n' + logs.slice(-1500));
  }

  console.log(`\ntrial once: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
