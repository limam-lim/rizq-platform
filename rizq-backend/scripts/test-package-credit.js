#!/usr/bin/env node
/**
 * رصيد تبديل الباقة — ترقية / تخفيض / انتهاء / طلبان متزامنان.
 * على rizq_test فقط.
 */
'use strict';

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

const DAY = 86400000;
const near = (ms, expected, tolMs) => Math.abs(ms - expected) <= (tolMs || 90000);

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-package-credit: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }
  delete process.env.WHATSAPP_TOKEN; delete process.env.EMAIL_USER; delete process.env.TWILIO_SID;

  const repos = require('../db/repos');
  const life = require('../rizq_package_lifecycle_agent');
  const {
    computePackageCredit,
    computeActivationPeriod,
    activateSubRequest,
    resolvePackageDurationDays,
  } = require('../services/subRequestActivation');

  console.log('\n— computePackageCredit (pure) —');
  {
    const t0 = Date.now();
    const in10 = new Date(t0 + 10 * DAY).toISOString();
    /* ترقية: شهرية 3000/30، متبقي 10 → رصيد 1000، سنوية 15000 → مطلوب 14000 */
    const up = computePackageCredit({
      switched: true, active: true,
      oldPrice: 3000, oldDays: 30, periodEnd: in10,
      newPrice: 15000, newDays: 365, nowMs: t0,
    });
    ok('upgrade credit ≈ 1000', Math.abs(up.credit - 1000) < 1, up);
    ok('upgrade amountDue ≈ 14000', Math.abs(up.amountDue - 14000) < 1, up);
    ok('upgrade no cash refund', up.cashRefund === 0);
    ok('upgrade no extension', up.extensionDays === 0);

    /* تخفيض برصيد أكبر من السعر: رصيد 1000، جديدة 500/30 → تمديد */
    const down = computePackageCredit({
      switched: true, active: true,
      oldPrice: 3000, oldDays: 30, periodEnd: in10,
      newPrice: 500, newDays: 30, nowMs: t0,
    });
    ok('downgrade credit > newPrice', down.credit > down.newPrice, down);
    ok('downgrade amountDue 0', down.amountDue === 0, down);
    ok('downgrade extends days', down.extensionDays > 0 && down.totalDays > 30, down);
    /* (1000-500)/500 * 30 = 30 → total 60 */
    ok('downgrade totalDays ≈ 60', Math.abs(down.totalDays - 60) < 0.2, down);

    /* انتهاء: لا رصيد */
    const expired = computePackageCredit({
      switched: true, active: true,
      oldPrice: 3000, oldDays: 30,
      periodEnd: new Date(t0 - DAY).toISOString(),
      newPrice: 15000, newDays: 365, nowMs: t0,
    });
    ok('expired → no credit', expired.credit === 0 && expired.amountDue === 15000, expired);

    const same = computePackageCredit({ switched: false, newPrice: 3000, newDays: 30 });
    ok('same package → not applicable', same.applicable === false && same.amountDue === 3000, same);
  }

  console.log('\n— computeActivationPeriod: 4 cases (renew / expired / credit / same) —');
  {
    const t0 = Date.now();
    const in10 = new Date(t0 + 10 * DAY).toISOString();
    const past = new Date(t0 - 2 * DAY).toISOString();
    const active = { packageId: 'st-month', pkgName: 'شهرية', status: 'active', periodEnd: in10, price: 3000 };
    const expired = { packageId: 'st-month', pkgName: 'شهرية', status: 'expired', periodEnd: past, price: 3000 };

    const renew = computeActivationPeriod(30, active, { packageId: 'st-month', pkgName: 'شهرية' });
    ok('same package while active: extends from current end',
      near(new Date(renew.periodEnd).getTime(), new Date(in10).getTime() + 30 * DAY) && renew.samePackage === true,
      { end: renew.periodEnd, from: in10 });

    const renewExpired = computeActivationPeriod(30, expired, { packageId: 'st-month', pkgName: 'شهرية' });
    ok('same package expired: from today',
      near(new Date(renewExpired.periodEnd).getTime(), t0 + 30 * DAY),
      renewExpired.periodEnd);

    const credit = computePackageCredit({
      switched: true, active: true,
      oldPrice: 3000, oldDays: 30, periodEnd: in10,
      newPrice: 500, newDays: 30, nowMs: t0,
    });
    const period = computeActivationPeriod(30, active, { packageId: 'st-basic', pkgName: 'أساسية' }, credit);
    ok('switch with surplus credit extends period',
      near(new Date(period.periodEnd).getTime(), t0 + credit.totalDays * DAY) && period.switchedPackage === true,
      { end: period.periodEnd, totalDays: credit.totalDays });

    const sameNoCredit = computePackageCredit({ switched: false, newPrice: 3000, newDays: 30 });
    ok('same-package credit not applicable', sameNoCredit.applicable === false, sameNoCredit);
  }

  const now = Date.now();
  const acc = { id: 'ACC_CRED_' + now, name: 'Credit Store', type: 'store', phone: '', email: '' };
  const accounts = [acc];
  const deps = {
    syncAccountPackage: life.syncAccountPackage,
    getAccountRecord: life.getAccountRecord,
    readAccounts: async () => accounts,
    writeAccounts: async () => {},
  };

  console.log('\n— activation upgrade / downgrade / history —');
  const subIds = [];
  let seq = 0;
  async function approve(pkg, packageId, price, extra) {
    const row = Object.assign({
      id: 'sub_cred_' + now + '_' + (++seq),
      status: 'pending',
      category: 'package',
      accountId: acc.id,
      account: acc.name,
      pkg,
      packageId,
      price,
      expectedPrice: price,
      listPrice: price,
      submittedAt: new Date().toISOString(),
    }, extra || {});
    await repos.subRequests.upsert(row.id, row, { skipBackup: true });
    subIds.push(row.id);
    const r = await activateSubRequest(row, deps);
    if (!r || !r.ok) throw new Error('activation failed: ' + JSON.stringify(r));
    return life.getAccountRecord(acc.id);
  }

  try {
    const monthDays = await resolvePackageDurationDays({ id: 'st-month', pkgName: 'شهرية' });
    /* seed active monthly with known price/period */
    await life.syncAccountPackage({
      accountId: acc.id,
      accountName: acc.name,
      accountType: 'store',
      pkgName: 'شهرية',
      packageId: 'st-month',
      price: 3000,
      days: monthDays,
      periodStart: new Date(now - 20 * DAY).toISOString(),
      periodEnd: new Date(now + 10 * DAY).toISOString(),
      activatedBy: 'test',
      paymentConfirmed: true,
      paidAt: new Date(now - 20 * DAY).toISOString(),
      isTrial: false,
    });

    const rUp = await approve('سنوية', 'st-year', 14000, {
      expectedPrice: 15000,
      listPrice: 15000,
      packageCredit: computePackageCredit({
        switched: true, active: true,
        oldPrice: 3000, oldDays: 30,
        periodEnd: new Date(now + 10 * DAY).toISOString(),
        newPrice: 15000, newDays: 365, nowMs: now,
      }),
    });
    ok('upgrade activated', rUp && rUp.packageId === 'st-year', rUp && rUp.packageId);
    ok('upgrade history has packageCredit',
      !!(rUp.packageHistory && rUp.packageHistory[0] && rUp.packageHistory[0].packageCredit),
      rUp.packageHistory && rUp.packageHistory[0]);
    ok('upgrade lastPackageCredit stored', !!(rUp.lastPackageCredit && rUp.lastPackageCredit.credit > 0), rUp.lastPackageCredit);

    /* reset to expensive short package then downgrade with surplus */
    await life.syncAccountPackage({
      accountId: acc.id,
      accountName: acc.name,
      accountType: 'store',
      pkgName: 'ماسية',
      packageId: 'st-diamond',
      price: 9000,
      days: 30,
      periodStart: new Date(now - 5 * DAY).toISOString(),
      periodEnd: new Date(now + 25 * DAY).toISOString(),
      activatedBy: 'test',
      paymentConfirmed: true,
      paidAt: new Date(now - 5 * DAY).toISOString(),
      isTrial: false,
    });
    const downCredit = computePackageCredit({
      switched: true, active: true,
      oldPrice: 9000, oldDays: 30,
      periodEnd: new Date(now + 25 * DAY).toISOString(),
      newPrice: 2000, newDays: 30, nowMs: now,
    });
    const rDown = await approve('شهرية', 'st-month', 0, {
      expectedPrice: 2000,
      listPrice: 2000,
      packageCredit: downCredit,
    });
    ok('downgrade with surplus extends beyond 30d',
      near(new Date(rDown.periodEnd).getTime(), now + downCredit.totalDays * DAY),
      { end: rDown.periodEnd, totalDays: downCredit.totalDays });
    ok('downgrade amountDue was 0', downCredit.amountDue === 0, downCredit);

    console.log('\n— concurrent activations (same request id) —');
    const concurrent = {
      id: 'sub_cred_c1_' + now,
      status: 'pending',
      category: 'package',
      accountId: acc.id,
      account: acc.name,
      pkg: 'سنوية',
      packageId: 'st-year',
      price: 15000,
      expectedPrice: 15000,
      submittedAt: new Date().toISOString(),
    };
    await repos.subRequests.upsert(concurrent.id, concurrent, { skipBackup: true });
    subIds.push(concurrent.id);
    const [r1, r2] = await Promise.all([
      activateSubRequest(Object.assign({}, concurrent), deps),
      activateSubRequest(Object.assign({}, concurrent), deps),
    ]);
    const oks = [r1, r2].filter((r) => r && r.ok);
    const blocked = [r1, r2].filter((r) => r && (r.error === 'already_processed' || r.error === 'not_pending' || r.error === 'claim_failed'));
    ok('concurrent same id: exactly one succeeds', oks.length === 1, { r1: r1 && { ok: r1.ok, error: r1.error }, r2: r2 && { ok: r2.ok, error: r2.error } });
    ok('concurrent same id: other blocked', blocked.length === 1, { r1: r1 && r1.error, r2: r2 && r2.error });

    console.log('\n— concurrent activations (two request ids) — no double credit —');
    await life.syncAccountPackage({
      accountId: acc.id,
      accountName: acc.name,
      accountType: 'store',
      pkgName: 'شهرية',
      packageId: 'st-month',
      price: 3000,
      days: 30,
      periodStart: new Date(now - 20 * DAY).toISOString(),
      periodEnd: new Date(now + 10 * DAY).toISOString(),
      activatedBy: 'test',
      paymentConfirmed: true,
      paidAt: new Date(now - 20 * DAY).toISOString(),
      isTrial: false,
    });
    const beforeRec = life.getAccountRecord(acc.id);
    const beforeEnd = beforeRec && beforeRec.periodEnd;
    const creditSnap = computePackageCredit({
      switched: true, active: true,
      oldPrice: 3000, oldDays: 30,
      periodEnd: new Date(now + 10 * DAY).toISOString(),
      newPrice: 500, newDays: 30, nowMs: now,
    });
    const dualA = {
      id: 'sub_cred_dA_' + now,
      status: 'pending', category: 'package', accountId: acc.id, account: acc.name,
      pkg: 'أساسية', packageId: 'st-basic', price: 0,
      expectedPrice: 500, listPrice: 500,
      packageCredit: creditSnap,
      submittedAt: new Date().toISOString(),
    };
    const dualB = {
      id: 'sub_cred_dB_' + now,
      status: 'pending', category: 'package', accountId: acc.id, account: acc.name,
      pkg: 'أساسية', packageId: 'st-basic', price: 0,
      expectedPrice: 500, listPrice: 500,
      packageCredit: creditSnap,
      submittedAt: new Date().toISOString(),
    };
    await repos.subRequests.upsert(dualA.id, dualA, { skipBackup: true });
    await repos.subRequests.upsert(dualB.id, dualB, { skipBackup: true });
    subIds.push(dualA.id, dualB.id);
    const [d1, d2] = await Promise.all([
      activateSubRequest(Object.assign({}, dualA), deps),
      activateSubRequest(Object.assign({}, dualB), deps),
    ]);
    const dualOk = [d1, d2].filter((r) => r && r.ok);
    const afterRec = await life.getAccountRecord(acc.id);
    ok('concurrent two ids: at least one activates', dualOk.length >= 1, { d1: d1 && d1.ok, d2: d2 && d2.ok });
    const skipped = [d1, d2].filter((r) => r && r.skippedDuplicate);
    /* لا يُمدَّد مرتين بنفس الرصيد — نهاية الفترة ≈ تمديدة واحدة فقط */
    const expectedEnd = now + creditSnap.totalDays * DAY;
    ok('concurrent two ids: period not double-extended',
      afterRec && near(new Date(afterRec.periodEnd).getTime(), expectedEnd, 180000),
      { end: afterRec && afterRec.periodEnd, expectedDays: creditSnap.totalDays, beforeEnd, dualOk: dualOk.length, skipped: skipped.length });
    ok('concurrent two ids: one skipped duplicate', skipped.length === 1 || dualOk.length === 1,
      { skipped: skipped.length, dualOk: dualOk.length });
  } finally {
    for (const id of subIds) {
      try { await repos.subRequests.remove(id); } catch (e) { /* */ }
    }
    try {
      const store = await life._loadForTests ? null : null;
      void store;
    } catch (e) { /* */ }
  }

  console.log('\n— credit uses amount actually paid (seasonal discount) —');
  {
    const t0 = Date.now();
    const in15 = new Date(t0 + 15 * DAY).toISOString();
    /* اشترى شهرية بخصم 50%: دفع 1500 بدل 3000 — عند الترقية الرصيد من 1500 لا 3000 */
    const paidUp = computePackageCredit({
      switched: true, active: true,
      oldPrice: 1500, oldDays: 30, periodEnd: in15,
      newPrice: 15000, newDays: 365, nowMs: t0,
    });
    ok('seasonal paid upgrade credit ≈ 750 (not 1500)', Math.abs(paidUp.credit - 750) < 1, paidUp);
    ok('seasonal paid upgrade amountDue ≈ 14250', Math.abs(paidUp.amountDue - 14250) < 1, paidUp);

    const listUp = computePackageCredit({
      switched: true, active: true,
      oldPrice: 3000, oldDays: 30, periodEnd: in15,
      newPrice: 15000, newDays: 365, nowMs: t0,
    });
    ok('list-price credit would be ≈ 1500 (contrast)', Math.abs(listUp.credit - 1500) < 1, listUp);
    ok('paid credit < list credit', paidUp.credit < listUp.credit - 100, { paid: paidUp.credit, list: listUp.credit });

    /* تخفيض من باقة دُفعت مخفّضة: رصيد أقل → مطلوب أكبر أو تمديد أقل */
    const paidDown = computePackageCredit({
      switched: true, active: true,
      oldPrice: 1500, oldDays: 30, periodEnd: in15,
      newPrice: 500, newDays: 30, nowMs: t0,
    });
    const listDown = computePackageCredit({
      switched: true, active: true,
      oldPrice: 3000, oldDays: 30, periodEnd: in15,
      newPrice: 500, newDays: 30, nowMs: t0,
    });
    ok('seasonal paid downgrade credit ≈ 750', Math.abs(paidDown.credit - 750) < 1, paidDown);
    ok('paid downgrade extends less than list-price path',
      paidDown.totalDays < listDown.totalDays - 5, { paid: paidDown.totalDays, list: listDown.totalDays });
  }

  console.log('\n' + (fail ? 'FAILED ' + fail : 'ALL OK') + ' / ' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
