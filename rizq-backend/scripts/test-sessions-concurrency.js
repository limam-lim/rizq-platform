#!/usr/bin/env node
/**
 * test-sessions-concurrency.js — جلسات متعددة الأجهزة + كتابة آمنة متزامنة.
 *  - دخولات متزامنة لمستخدمين مختلفين: كل الجلسات تُحفظ، ولا يُحذف حساب جديد.
 *  - نفس الحساب على عدة أجهزة معاً: كلها صالحة.
 *  - خروج جهاز واحد لا يمس الآخرين؛ "خروج من كل الأجهزة" وتغيير كلمة المرور يُخرجان الكل.
 *  - تبادل رمز اللوحة: الرمزان السابقان مقبولان مهلة قصيرة (لا 401 للطلبات في الطريق).
 *  - إعلانات/طلبات اشتراك متزامنة: لا يمحو أحدها الآخر؛ الحذف المقصود يعمل.
 * يتطلب DB_DRIVER=postgres + DATABASE_URL (قاعدة اختبار).
 */
'use strict';

const path = require('path');
const { spawn } = require('child_process');

const BACKEND = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); }
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-sessions-concurrency: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }
  const repos = require('../db/repos');
  const platformStore = require('../db/platformStore');
  const bcrypt = require('bcryptjs');

  console.log('\n— diff-write (no clobbering) —');
  const now = Date.now();
  const adA = { id: 'AD_C_A_' + now, accountId: 'X', title: 'A', status: 'active', createdAt: new Date().toISOString() };
  const adGone = { id: 'AD_C_GONE_' + now, accountId: 'X', title: 'gone', status: 'active', createdAt: new Date().toISOString() };
  await platformStore.upsertAd(adGone);
  const readerOne = await platformStore.readAds();
  const readerTwo = await platformStore.readAds();
  readerOne.push(adA);
  await platformStore.writeAds(readerOne); // writer 1 adds A
  const adB = { id: 'AD_C_B_' + now, accountId: 'Y', title: 'B', status: 'active', createdAt: new Date().toISOString() };
  readerTwo.push(adB);
  await platformStore.writeAds(readerTwo.filter((a) => a.id !== adGone.id)); // writer 2 adds B + deletes "gone"
  const ids = new Set((await platformStore.readAds()).map((a) => a.id));
  ok('concurrent writer 1 ad survives writer 2', ids.has(adA.id));
  ok('concurrent writer 2 ad saved', ids.has(adB.id));
  ok('intentional deletion (seen + removed) applied', !ids.has(adGone.id));
  // deleting the last item via filter → empty list still deletes what was seen
  const solo = { id: 'AD_C_SOLO_' + now, accountId: 'Z', title: 'solo', status: 'active' };
  await platformStore.upsertAd(solo);
  const all = await platformStore.readAds();
  const others = all.filter((a) => a.id !== solo.id);
  await platformStore.writeAds(all.filter((a) => a.id !== solo.id));
  ok('delete via filter works', !(await platformStore.readAds()).some((a) => a.id === solo.id));
  ok('other ads untouched by that delete', (await platformStore.readAds()).length >= others.length);

  console.log('\n— sub-requests saveList —');
  const s1 = await repos.subRequests.list();
  const s2 = await repos.subRequests.list();
  s1.push({ id: 'sub_c1_' + now, status: 'pending', price: 100 });
  await repos.subRequests.saveList(s1);
  s2.push({ id: 'sub_c2_' + now, status: 'pending', price: 200 });
  await repos.subRequests.saveList(s2);
  const subIds = new Set((await repos.subRequests.list()).map((r) => r.id));
  ok('two simultaneous payment requests both kept', subIds.has('sub_c1_' + now) && subIds.has('sub_c2_' + now));

  // ── HTTP: devices ──
  const pw = 'Dev-' + now;
  const acc = {
    id: 'ACC_DEV_' + now, type: 'store', name: 'Devices', email: 'dev' + now + '@t.mr', phone: '4' + String(now).slice(-7),
    status: 'approved', passHash: await bcrypt.hash(pw, 10), createdAt: new Date().toISOString(),
  };
  await repos.accounts.upsert(acc);
  const port = 4200 + Math.floor(Math.random() * 90);
  const env = Object.assign({}, process.env, { PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test' });
  delete env.TELEGRAM_BOT_TOKEN;
  const child = spawn(process.execPath, ['server.js'], { cwd: BACKEND, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  const U = 'http://127.0.0.1:' + port;
  let ipN = 1;
  const call = (m, p, body, h) => fetch(U + p, {
    method: m,
    headers: Object.assign({ 'content-type': 'application/json', 'x-forwarded-for': '10.20.' + Math.floor(ipN / 250) + '.' + (ipN++ % 250) }, h || {}),
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ s: r.status, d: await r.json().catch(() => null) }));
  const mine = (tok) => call('GET', '/api/accounts/mine/' + acc.id, null, { 'x-account-token': tok }).then((r) => r.s);
  try {
    for (let i = 0; i < 90; i++) { try { if ((await fetch(U + '/api/otp/config')).ok) break; } catch (e) { /* */ } await new Promise((s) => setTimeout(s, 300)); }

    console.log('\n— multi-device sessions —');
    const login = () => call('POST', '/api/accounts/seller-login', { email: acc.email, password: pw }, { 'user-agent': 'TestDevice' });
    const phone = (await login()).d.account;
    const laptop = (await login()).d.account;
    ok('phone session works', (await mine(phone.accessToken)) === 200);
    ok('laptop login did NOT kick out the phone', (await mine(phone.accessToken)) === 200 && (await mine(laptop.accessToken)) === 200);
    const conc = await Promise.all([1, 2, 3, 4].map(() => login()));
    const concOk = (await Promise.all(conc.map((r) => mine(r.d.account.accessToken)))).filter((s) => s === 200).length;
    ok('4 devices logging in at the same instant: all valid', concOk === 4, concOk);
    const stored = await repos.accounts.getById(acc.id);
    ok('tokens stored as hashes only (no plaintext)', JSON.stringify(stored.sessions || []).indexOf(phone.accessToken) === -1);
    const ownView = await call('GET', '/api/accounts/mine/' + acc.id, null, { 'x-account-token': laptop.accessToken });
    ok('session internals never sent to client', ownView.d && !('sessions' in (ownView.d.account || ownView.d)));

    console.log('\n— dashboard token exchange grace —');
    const ex = await call('POST', '/api/accounts/exchange-dash-token/' + acc.id, { dashToken: laptop.dashToken });
    ok('exchange → new tokens', ex.s === 200 && ex.d.accessToken && ex.d.dashToken && ex.d.dashToken !== laptop.dashToken, ex.d);
    ok('old access token still accepted briefly (in-flight requests)', (await mine(laptop.accessToken)) === 200);
    ok('old dash token still accepted briefly', (await mine(laptop.dashToken)) === 200);
    ok('new access token works', (await mine(ex.d.accessToken)) === 200);
    const exAgain = await call('POST', '/api/accounts/exchange-dash-token/' + acc.id, { dashToken: laptop.dashToken });
    ok('old dash token cannot be exchanged twice', exAgain.s === 401, exAgain.s);
    const vd = await call('POST', '/api/accounts/verify-dash/' + acc.id, { dashToken: ex.d.dashToken });
    ok('verify-dash accepts a device dash token', vd.s === 200, vd.s);

    console.log('\n— logout —');
    const out1 = await call('POST', '/api/accounts/logout', { accountId: acc.id }, { 'x-account-token': phone.accessToken });
    ok('logout this device → 200', out1.s === 200 && out1.d && out1.d.everywhere === false, out1.d);
    ok('phone is logged out', (await mine(phone.accessToken)) === 401);
    ok('laptop still logged in', (await mine(ex.d.accessToken)) === 200);
    const wrong = await call('POST', '/api/accounts/logout', { accountId: acc.id }, { 'x-account-token': 'nope' });
    ok('logout with a bad token → 401', wrong.s === 401);

    console.log('\n— password change logs out every device —');
    const tab = (await login()).d.account;
    const chg = await call('POST', '/api/accounts/mine/' + acc.id + '/password', { currentPassword: pw, newPassword: pw + 'X1' }, { 'x-account-token': tab.accessToken });
    ok('password changed', chg.s === 200, chg.d);
    ok('other devices logged out after password change', (await mine(ex.d.accessToken)) === 401 && (await mine(conc[0].d.account.accessToken)) === 401);
    ok('device that changed it gets fresh working tokens', chg.d && (await mine(chg.d.accessToken)) === 200);
    const l2 = (await call('POST', '/api/accounts/seller-login', { email: acc.email, password: pw + 'X1' })).d.account;
    const l3 = (await call('POST', '/api/accounts/seller-login', { email: acc.email, password: pw + 'X1' })).d.account;
    const all2 = await call('POST', '/api/accounts/logout', { accountId: acc.id, all: true }, { 'x-account-token': l2.accessToken });
    ok('"logout everywhere" → all devices out', all2.s === 200 && (await mine(l3.accessToken)) === 401 && (await mine(l2.accessToken)) === 401);

    console.log('\n— suspended account —');
    const l4 = (await call('POST', '/api/accounts/seller-login', { email: acc.email, password: pw + 'X1' })).d.account;
    const cur = await repos.accounts.getById(acc.id);
    cur.suspended = true;
    await repos.accounts.upsert(cur);
    ok('suspension blocks existing device sessions', (await mine(l4.accessToken)) !== 200);
  } finally {
    child.kill('SIGTERM');
    await new Promise((s) => setTimeout(s, 400));
    if (fail) console.log('\n--- server log tail ---\n' + logs.slice(-1500));
  }
  console.log(`\nsessions & concurrency: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
