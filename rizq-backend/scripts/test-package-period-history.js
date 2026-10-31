#!/usr/bin/env node
/**
 * test-package-period-history.js — B6: شراء باقة ثانية.
 *   - نفس الباقة وما زالت نشطة: يُمدّ الانتهاء من periodEnd الحالي
 *   - نفس الباقة ومنتهية/موقوفة: من اليوم + مدة الباقة
 *   - باقة مختلفة: من اليوم بمدة الباقة الجديدة فقط (بلا ترحيل أيام القديمة)،
 *     وتُسجَّل الباقة القديمة في packageHistory قبل الاستبدال
 *   - طلب معلّق (createPendingPackageFromRequest) لا يخفي هوية الباقة السابقة
 *
 * يتطلب DB_DRIVER=postgres + DATABASE_URL (قاعدة اختبار).
 * الاستخدام: npm run test:package-period
 */
'use strict';

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

const DAY = 86400000;
const near = (ms, expected, tolMs) => Math.abs(ms - expected) <= (tolMs || 60000);

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-package-period-history: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }
  delete process.env.WHATSAPP_TOKEN; delete process.env.EMAIL_USER; delete process.env.TWILIO_SID;
  const repos = require('../db/repos');
  const life = require('../rizq_package_lifecycle_agent');
  const {
    activateSubRequest,
    computeActivationPeriod,
    resolvePackageDurationDays,
  } = require('../services/subRequestActivation');

  console.log('\n— computeActivationPeriod (pure) —');
  {
    const t0 = Date.now();
    const in10 = new Date(t0 + 10 * DAY).toISOString();
    const ago5 = new Date(t0 - 5 * DAY).toISOString();
    const active = { packageId: 'st-month', pkgName: 'شهرية', status: 'active', periodEnd: in10 };
    const end = (p) => new Date(p.periodEnd).getTime();

    ok('no existing package → today + days', near(end(computeActivationPeriod(30, null, { packageId: 'st-month' })), t0 + 30 * DAY));
    ok('same packageId, still active → current end + days',
      near(end(computeActivationPeriod(30, active, { packageId: 'st-month' })), t0 + 40 * DAY));
    ok('same packageId (string arg) → current end + days',
      near(end(computeActivationPeriod(30, active, 'st-month')), t0 + 40 * DAY));
    ok('same packageId, expired → today + days',
      near(end(computeActivationPeriod(30, Object.assign({}, active, { periodEnd: ago5, status: 'expired' }), { packageId: 'st-month' })), t0 + 30 * DAY));
    ok('same packageId, suspended (future end) → today + days',
      near(end(computeActivationPeriod(30, Object.assign({}, active, { status: 'suspended' }), { packageId: 'st-month' })), t0 + 30 * DAY));
    ok('different packageId, old still active → today + new days only (no carryover)',
      near(end(computeActivationPeriod(365, active, { packageId: 'st-year' })), t0 + 365 * DAY));
    ok('legacy record without packageId, same name → extends',
      near(end(computeActivationPeriod(30, { pkgName: 'شهرية', status: 'active', periodEnd: in10 }, { packageId: 'st-month', pkgName: 'شهرية' })), t0 + 40 * DAY));
    ok('pending record keeps prior package identity (prePending) → different package starts today',
      near(end(computeActivationPeriod(365, {
        pkgName: 'سنوية', status: 'pending', periodEnd: in10,
        prePending: { pkgName: 'شهرية', status: 'active', periodEnd: in10 },
      }, { pkgName: 'سنوية' })), t0 + 365 * DAY));
  }

  const now = Date.now();
  const acc = { id: 'ACC_B6_' + now, name: 'B6 Store', type: 'store', phone: '', email: '' };
  const legacy = { id: 'ACC_B6L_' + now, name: 'B6 Legacy', type: 'store', phone: '', email: '' };
  const accounts = [acc, legacy];
  const deps = {
    syncAccountPackage: life.syncAccountPackage,
    getAccountRecord: life.getAccountRecord,
    readAccounts: async () => accounts,
    writeAccounts: async () => {},
  };
  const subIds = [];
  let seq = 0;
  async function approve(accountId, pkg, packageId, price) {
    const row = {
      id: 'sub_b6_' + now + '_' + (++seq),
      status: 'pending',
      category: 'package',
      accountId,
      account: accountId,
      pkg,
      packageId,
      price,
      expectedPrice: price,
      submittedAt: new Date().toISOString(),
    };
    await repos.subRequests.upsert(row.id, row, { skipBackup: true });
    subIds.push(row.id);
    const r = await activateSubRequest(row, deps);
    if (!r || !r.ok) throw new Error('activation failed: ' + JSON.stringify(r));
    return life.getAccountRecord(accountId);
  }
  const endOf = (rec) => new Date(rec.periodEnd).getTime();

  try {
    const monthDays = await resolvePackageDurationDays({ id: 'st-month', pkgName: 'شهرية' });
    const yearDays = await resolvePackageDurationDays({ id: 'st-year', pkgName: 'سنوية' });
    ok('annual package duration comes from the catalog (not the 30-day fallback)', yearDays > monthDays, { monthDays, yearDays });

    console.log('\n— second purchase, same package —');
    const r1 = await approve(acc.id, 'شهرية', 'st-month', 2000);
    ok('first purchase: today + ' + monthDays + 'd', near(endOf(r1), Date.now() + monthDays * DAY), r1.periodEnd);
    const r2 = await approve(acc.id, 'شهرية', 'st-month', 2000);
    ok('same package while active: extends from current end', near(endOf(r2), endOf(r1) + monthDays * DAY), { before: r1.periodEnd, after: r2.periodEnd });
    ok('same package renewal does not add history', !(r2.packageHistory || []).length, r2.packageHistory);

    console.log('\n— second purchase, different package —');
    const r3 = await approve(acc.id, 'سنوية', 'st-year', 15000);
    ok('different package: today + ' + yearDays + 'd only (old days dropped)', near(endOf(r3), Date.now() + yearDays * DAY), r3.periodEnd);
    ok('record now points to the new package', r3.packageId === 'st-year' && r3.pkgName === 'سنوية', { id: r3.packageId, name: r3.pkgName });
    const h = (r3.packageHistory || [])[0];
    ok('old package logged in history before replacement',
      !!h && h.packageId === 'st-month' && h.pkgName === 'شهرية' && h.periodEnd === r2.periodEnd && !!h.endedAt,
      r3.packageHistory);

    console.log('\n— same package after expiry —');
    await repos.packages.upsert(acc.id, Object.assign({}, r3, {
      status: 'expired', subscriptionStatus: 'expired', periodEnd: new Date(Date.now() - 2 * DAY).toISOString(),
    }));
    const r4 = await approve(acc.id, 'سنوية', 'st-year', 15000);
    ok('same package but expired: today + days', near(endOf(r4), Date.now() + yearDays * DAY), r4.periodEnd);
    ok('history kept across renewals', (r4.packageHistory || []).length === 1, r4.packageHistory);

    console.log('\n— pending request does not mask the previous package —');
    await repos.packages.upsert(legacy.id, {
      accountId: legacy.id, accountName: legacy.name, accountType: 'store', planType: 'store_monthly',
      pkgName: 'شهرية', price: 2000, isTrial: false, status: 'active', subscriptionStatus: 'active',
      paymentConfirmed: false, periodStart: new Date(Date.now() - 5 * DAY).toISOString(),
      periodEnd: new Date(Date.now() + 20 * DAY).toISOString(), accessToken: 'tok_' + legacy.id, invoices: [],
    });
    await life.createPendingPackageFromRequest({
      accountId: legacy.id, accountName: legacy.name, accountType: 'store', pkgName: 'سنوية', price: 15000, requestId: 'x',
    });
    const pend = await life.getAccountRecord(legacy.id);
    ok('pending record snapshots the previous package', pend.status === 'pending' && pend.prePending && pend.prePending.pkgName === 'شهرية', pend.prePending);
    const r5 = await approve(legacy.id, 'سنوية', 'st-year', 15000);
    ok('switch from legacy package (no packageId): today + new days', near(endOf(r5), Date.now() + yearDays * DAY), r5.periodEnd);
    ok('legacy package logged in history', (r5.packageHistory || [])[0] && r5.packageHistory[0].pkgName === 'شهرية', r5.packageHistory);
    ok('prePending cleared after activation', !r5.prePending, r5.prePending);
  } finally {
    for (const id of [acc.id, legacy.id]) {
      try { await repos.packages.remove(id, { skipBackup: true }); } catch (e) { /* */ }
    }
    for (const id of subIds) {
      try { await repos.subRequests.remove(id, { skipBackup: true }); } catch (e) { /* */ }
    }
    try { await repos.packages.writeBackup(); await repos.subRequests.writeBackup(); } catch (e) { /* */ }
  }

  console.log(`\npackage period & history: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
