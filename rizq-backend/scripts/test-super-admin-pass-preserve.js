/**
 * اختبار: هاش سوبر أدمن لا يُستبدل عند الإقلاع + changeOwnPassword يعمل.
 * node scripts/test-super-admin-pass-preserve.js
 */
'use strict';

const bcrypt = require('bcryptjs');
const adminTeam = require('../services/adminTeam');

const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

async function main() {
  const email = 'test-owner-preserve@localhost';
  const pass1 = 'InitialPass123!';
  const pass2 = 'ChangedPass456!';
  const hash1 = bcrypt.hashSync(pass1, 10);
  const hashEnvOther = bcrypt.hashSync('EnvWouldOverwrite999!', 10);

  const before = adminTeam.readTeam().slice();
  try {
    // نظّف أي صف اختبار سابق
    const cleaned = before.filter((m) => {
      const e = String(m.email || '').toLowerCase();
      const u = String(m.user || '').toLowerCase();
      return e !== email && u !== email;
    });
    adminTeam.writeTeam(cleaned);

    adminTeam.ensureOwnerSuperAdmin({
      email,
      user: email,
      name: 'Test Owner',
      passHash: hash1,
    });
    let row = adminTeam.readTeam().find((m) => String(m.email || '').toLowerCase() === email);
    ok('ensure creates owner', !!row && row.passHash === hash1);

    const auth1 = await adminTeam.authenticate(email, pass1);
    ok('auth with initial password', !!auth1);

    await adminTeam.changeOwnPassword(email, pass1, pass2);
    const auth2 = await adminTeam.authenticate(email, pass2);
    const authOld = await adminTeam.authenticate(email, pass1);
    ok('changeOwnPassword accepts new', !!auth2);
    ok('changeOwnPassword rejects old', !authOld);

    const hashAfterChange = adminTeam.readTeam().find((m) => String(m.email || '').toLowerCase() === email).passHash;

    // محاكاة إقلاع: .env هاش مختلف — يجب ألا يستبدل
    adminTeam.ensureOwnerSuperAdmin({
      email,
      user: email,
      name: 'Test Owner',
      passHash: hashEnvOther,
    });
    row = adminTeam.readTeam().find((m) => String(m.email || '').toLowerCase() === email);
    ok('ensure preserves panel-changed hash', row && row.passHash === hashAfterChange);
    ok('still auth with panel password after ensure', !!(await adminTeam.authenticate(email, pass2)));

    // فرض من .env
    adminTeam.ensureOwnerSuperAdmin({
      email,
      user: email,
      name: 'Test Owner',
      passHash: hashEnvOther,
      forcePassHash: true,
    });
    row = adminTeam.readTeam().find((m) => String(m.email || '').toLowerCase() === email);
    ok('forcePassHash overwrites', row && row.passHash === hashEnvOther);
    ok('auth with forced env password', !!(await adminTeam.authenticate(email, 'EnvWouldOverwrite999!')));

    let weakOk = false;
    try {
      await adminTeam.changeOwnPassword(email, 'EnvWouldOverwrite999!', 'short');
    } catch (e) {
      weakOk = e.code === 'weak_password';
    }
    ok('rejects weak password', weakOk);

    let badCur = false;
    try {
      await adminTeam.changeOwnPassword(email, 'wrong-current', 'LongEnoughPass1');
    } catch (e) {
      badCur = e.code === 'invalid_current';
    }
    ok('rejects wrong current password', badCur);
  } finally {
    // أزل صف الاختبار وأعد الباقي
    const restored = adminTeam.readTeam().filter((m) => {
      const e = String(m.email || '').toLowerCase();
      const u = String(m.user || '').toLowerCase();
      return e !== email && u !== email;
    });
    // إن كان قبل الاختبار صفوف أخرى، احتفظ بالحالة الحالية بعد حذف الاختبار فقط
    adminTeam.writeTeam(restored.length ? restored : before.filter((m) => {
      const e = String(m.email || '').toLowerCase();
      return e !== email;
    }));
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log('\n' + (failed ? 'FAILED' : 'ALL PASSED') + ': ' + (results.length - failed) + '/' + results.length);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
