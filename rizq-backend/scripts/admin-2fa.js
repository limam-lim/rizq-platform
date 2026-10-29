#!/usr/bin/env node
/**
 * admin-2fa.js — تفعيل/تعطيل التحقق بخطوتين لحساب أدمن (يُشغَّل على الخادم).
 *
 *   node scripts/admin-2fa.js genkey              → يولّد ADMIN_2FA_KEY (ضعه في متغيرات البيئة)
 *   node scripts/admin-2fa.js status  <user>
 *   node scripts/admin-2fa.js enable  <user>      → يعرض مفتاح الإعداد، ثم يطلب رمزاً من التطبيق للتأكيد
 *   node scripts/admin-2fa.js disable <user>      → عند فقدان الهاتف وانتهاء الرموز الاحتياطية
 *
 * <user> = اسم الدخول أو البريد كما في فريق الأدمن.
 * يتطلب DB_DRIVER=postgres + DATABASE_URL + ADMIN_2FA_KEY.
 */
'use strict';

const readline = require('readline');
const crypto = require('crypto');

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(String(a || '').trim()); }));
}

function groupKey(k) { return k.replace(/(.{4})/g, '$1 ').trim(); }

(async () => {
  const [cmd, userArg] = process.argv.slice(2);
  if (cmd === 'genkey') {
    console.log('\nADMIN_2FA_KEY=' + crypto.randomBytes(32).toString('hex'));
    console.log('\nضع هذا السطر في متغيرات البيئة على الخادم (Render/Hetzner) — لا تضعه في GitHub.\n');
    process.exit(0);
  }
  if (!['status', 'enable', 'disable'].includes(cmd) || !userArg) {
    console.log('usage: node scripts/admin-2fa.js genkey | status|enable|disable <user>');
    process.exit(2);
  }
  require('dotenv').config();
  const twoFactor = require('../services/adminTwoFactor');
  const team = require('../services/adminTeam');
  const db = require('../db/pool');
  if (typeof db.ready === 'function') await db.ready();

  const all = await team.listTeamPublic();
  const u = userArg.toLowerCase();
  const member = all.find((m) => String(m.user || '').toLowerCase() === u || String(m.email || '').toLowerCase() === u);
  if (!member) { console.error('✗ لا يوجد عضو أدمن بهذا الاسم/البريد: ' + userArg); process.exit(1); }
  const user = member.user;

  if (cmd === 'status') {
    console.log(user, JSON.stringify(await twoFactor.status(user), null, 2));
    process.exit(0);
  }
  if (cmd === 'disable') {
    const sure = await ask('تعطيل 2FA لـ ' + user + '؟ اكتب نعم/yes: ');
    if (!/^(yes|نعم)$/i.test(sure)) { console.log('أُلغي.'); process.exit(1); }
    await twoFactor.disable(user);
    console.log('✓ عُطِّل التحقق بخطوتين لـ ' + user);
    process.exit(0);
  }
  // enable
  if (!twoFactor.encryptionKey()) {
    console.error('✗ ADMIN_2FA_KEY غير مضبوط. شغّل أولاً: node scripts/admin-2fa.js genkey ثم ضعه في البيئة.');
    process.exit(1);
  }
  const { secret, otpauthUrl } = await twoFactor.beginEnrollment(user);
  console.log('\n1) افتح Google Authenticator أو Microsoft Authenticator على هاتفك');
  console.log('2) اختر: إضافة حساب ← "إدخال مفتاح الإعداد" (Enter a setup key)');
  console.log('   اسم الحساب: Rizq Admin');
  console.log('   المفتاح:    ' + groupKey(secret));
  console.log('   النوع:      حسب الوقت (Time based)');
  console.log('\n   (أو حوّل هذا الرابط إلى QR:) ' + otpauthUrl + '\n');
  const code = await ask('3) اكتب الرمز المكوّن من 6 أرقام الظاهر الآن في التطبيق: ');
  const r = await twoFactor.confirmEnrollment(user, code);
  if (!r.ok) { console.error('✗ لم يُفعَّل: ' + r.error + ' — أعد المحاولة.'); process.exit(1); }
  console.log('\n✓ فُعِّل التحقق بخطوتين لـ ' + user);
  console.log('\nرموز احتياطية — اكتبها على ورق واحفظها بعيداً عن الهاتف. كل رمز يُستعمل مرة واحدة:\n');
  r.recoveryCodes.forEach((c, i) => console.log('   ' + String(i + 1).padStart(2) + '.  ' + c));
  console.log('\nلن تظهر هذه الرموز مرة أخرى.\n');
  process.exit(0);
})().catch((e) => { console.error('✗', e && e.message); process.exit(1); });
