#!/usr/bin/env node
/**
 * test-lifecycle-concurrent-save.js — B3: موافقة دفع تتم أثناء تشغيل وكيل دورة الحياة لا تُمحى.
 *
 * يشغّل runLifecycleScan الحقيقي على قاعدة اختبار. أثناء الفحص (بعد أن قرأ الوكيل كل
 * السجلات وقبل أن يحفظ) يوافق الأدمن على:
 *   - تجديد حسابين منتهيين (E1, E2) كان الوكيل على وشك إيقافهما
 *   - اشتراك حساب جديد تماماً (Z) لم يكن موجوداً لحظة قراءة الوكيل
 * المتوقع: Z موجود، E1/E2 مفعّلان بالتجديد، وسجل منتهٍ آخر (W) أوقفه الوكيل فعلاً.
 *
 * يتطلب DB_DRIVER=postgres + DATABASE_URL (قاعدة اختبار).
 * الاستخدام: npm run test:lifecycle-save
 */
'use strict';

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

const DAY = 86400000;

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-lifecycle-concurrent-save: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }
  delete process.env.WHATSAPP_TOKEN; delete process.env.EMAIL_USER; delete process.env.TWILIO_SID;
  const repos = require('../db/repos');
  const life = require('../rizq_package_lifecycle_agent');

  const now = Date.now();
  const tag = 'B3SCAN_' + now;
  const E1 = tag + '_E1';
  const E2 = tag + '_E2';
  const W = tag + '_W';
  const Z = tag + '_Z';
  const ids = [E1, E2, W, Z];

  const expiredRec = (id) => ({
    accountId: id,
    accountName: id,
    accountType: 'store',
    planType: 'store_monthly',
    packageId: 'st-month',
    pkgName: 'شهرية',
    price: 2000,
    isTrial: false,
    status: 'active',
    subscriptionStatus: 'active',
    paymentConfirmed: true,
    paidAt: new Date(now - 31 * DAY).toISOString(),
    periodStart: new Date(now - 31 * DAY).toISOString(),
    periodEnd: new Date(now - 3600000).toISOString(),
    accessToken: 'tok_' + id,
    invoices: [],
  });

  try {
    for (const id of [E1, E2, W]) await repos.packages.upsert(id, expiredRec(id));

    const downgraded = [];
    let approved = false;
    const accountsHelpers = {
      readAccounts: async () => [E1, E2, W].map((id) => ({ id, planType: 'store_monthly', package: 'شهرية' })),
      writeAccounts: async (list) => {
        const hit = (list || []).find((a) => a && a.downgradedAt);
        if (!hit) return;
        downgraded.push(hit.id);
        if (approved || (hit.id !== E1 && hit.id !== E2)) return;
        approved = true;
        // الأدمن يوافق على دفعات أثناء تشغيل الوكيل (بعد قراءته وقبل حفظه)
        for (const id of [E1, E2, Z]) {
          const r = await life.syncAccountPackage({
            accountId: id,
            accountName: id,
            accountType: 'store',
            pkgName: 'شهرية',
            packageId: 'st-month',
            price: 2000,
            days: 30,
            activatedBy: 'admin',
            paymentConfirmed: true,
          });
          if (!r.ok) throw new Error('approval failed for ' + id + ': ' + r.error);
        }
      },
    };

    console.log('\n— lifecycle scan with concurrent approvals —');
    const scan = await life.runLifecycleScan(accountsHelpers);
    ok('scan completed', scan && scan.ok === true, scan);
    ok('approvals happened mid-scan', approved === true);

    const z = await repos.getPackage(Z);
    ok('new subscriber approved during the scan is NOT wiped', !!z && z.status === 'active' && z.paymentConfirmed === true, z && z.status);

    for (const id of [E1, E2]) {
      const rec = await repos.getPackage(id);
      const endMs = rec && new Date(rec.periodEnd).getTime();
      ok(id.slice(-2) + ': renewal approved during the scan is NOT reverted to expired',
        !!rec && rec.status === 'active' && endMs > now + 29 * DAY,
        rec && { status: rec.status, periodEnd: rec.periodEnd });
    }

    const w = await repos.getPackage(W);
    ok('agent still expires the untouched overdue package', !!w && w.status === 'expired' && w.subscriptionStatus === 'expired', w && w.status);

    const touched = downgraded.filter((id) => id === E1 || id === E2);
    ok('agent re-checks before acting: renewed account processed after the approval is not downgraded',
      touched.length === 1, downgraded);

    const meta = await repos.getPackageMeta();
    ok('invoice sequence meta row intact', meta && typeof meta.invoiceSeq === 'number', meta);
  } finally {
    for (const id of ids) {
      try { await repos.packages.remove(id, { skipBackup: true }); } catch (e) { /* */ }
    }
    try { await repos.packages.writeBackup(); } catch (e) { /* */ }
  }

  console.log(`\nlifecycle concurrent save: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
