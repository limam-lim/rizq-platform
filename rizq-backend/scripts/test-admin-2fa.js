#!/usr/bin/env node
/**
 * test-admin-2fa.js — TOTP (متجهات RFC 6238 الرسمية) + تدفق دخول الأدمن بخطوتين.
 * يتطلب DB_DRIVER=postgres + DATABASE_URL (قاعدة اختبار).
 */
'use strict';

const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

const BACKEND = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); }
}

function request(port, method, urlPath, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port, method, path: urlPath,
      headers: Object.assign({ 'content-type': 'application/json' }, data ? { 'content-length': Buffer.byteLength(data) } : {}),
    }, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => { let json = null; try { json = JSON.parse(buf); } catch (e) { /* */ } resolve({ status: res.statusCode, json }); });
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

async function waitForServer(port, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const r = await request(port, 'GET', '/api/otp/config');
    if (r.status === 200) return true;
    await new Promise((s) => setTimeout(s, 300));
  }
  return false;
}

(async () => {
  const totp = require('../lib/totp');

  console.log('\n— TOTP RFC 6238 vectors (SHA-1) —');
  const rfcSecret = totp.base32Encode(Buffer.from('12345678901234567890'));
  ok('base32 of RFC seed', rfcSecret === 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', rfcSecret);
  const vectors = [[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037']];
  vectors.forEach(([t, want]) => ok('T=' + t + ' → ' + want, totp.totp(rfcSecret, t * 1000) === want, totp.totp(rfcSecret, t * 1000)));
  ok('verify accepts ±1 step drift', totp.verifyTotp(rfcSecret, totp.totp(rfcSecret, 1111111109000), { nowMs: 1111111139000 }) >= 0);
  ok('verify rejects ±3 steps', totp.verifyTotp(rfcSecret, totp.totp(rfcSecret, 1111111109000), { nowMs: 1111111199000 }) === -1);
  ok('base32 round-trip', totp.base32Decode(totp.base32Encode(Buffer.from('rizq'))).toString() === 'rizq');

  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-admin-2fa: DB part requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(fail ? 1 : 2);
  }
  process.env.ADMIN_2FA_KEY = process.env.ADMIN_2FA_KEY || crypto.randomBytes(32).toString('hex');
  const repos = require('../db/repos');
  const bcrypt = require('bcryptjs');
  const twoFactor = require('../services/adminTwoFactor');

  // seed a super admin team member
  const now = Date.now();
  const user = 'owner2fa' + now;
  const password = 'S3cure-' + now;
  await repos.adminTeam.upsert('ADM_2FA_' + now, {
    id: 'ADM_2FA_' + now, user, name: 'Owner 2FA', email: user + '@test.mr',
    passHash: await bcrypt.hash(password, 10), permissions: ['*'], active: true, createdAt: new Date().toISOString(),
  });

  console.log('\n— enforcement switch (unit) —');
  process.env.ADMIN_2FA_ENFORCE_SUPER = '1';
  const enforced = await twoFactor.loginRequirement({ user, permissions: ['*'] });
  ok('ENFORCE_SUPER=1 + super not enrolled → enrollment required', enforced.enrollmentRequired === true);
  const staff = await twoFactor.loginRequirement({ user: 'staff_' + now, permissions: ['overview'] });
  ok('ENFORCE_SUPER does not affect non-super staff', staff.enrollmentRequired === false && staff.required === false);
  delete process.env.ADMIN_2FA_ENFORCE_SUPER;

  const port = 4100 + Math.floor(Math.random() * 90);
  const env = Object.assign({}, process.env, { PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test' });
  delete env.TELEGRAM_BOT_TOKEN;
  delete env.ADMIN_2FA_ENFORCE_SUPER;
  const child = spawn(process.execPath, ['server.js'], { cwd: BACKEND, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  try {
    const up = await waitForServer(port, 45000);
    ok('server boots', up, logs.slice(-600));
    if (!up) return;

    console.log('\n— login flow —');
    const before = await request(port, 'POST', '/api/admin/login', { user, pass: password });
    ok('2FA off by default → login works with password only (no lock-out on deploy)', before.status === 200 && before.json && before.json.token, before.json);

    const { secret } = await twoFactor.beginEnrollment(user);
    const bad = await twoFactor.confirmEnrollment(user, '000000' === totp.totp(secret) ? '111111' : '000000');
    ok('enrollment rejects a wrong code', bad.ok === false);
    // confirm with the code of the PREVIOUS step so the current one is still usable for login
    const prevCode = totp.totp(secret, Date.now() - 30000);
    const en = await twoFactor.confirmEnrollment(user, prevCode);
    ok('enrollment confirmed + 10 recovery codes', en.ok && Array.isArray(en.recoveryCodes) && en.recoveryCodes.length === 10, en);
    const stored = await repos.adminTwoFactor.get(user);
    ok('secret stored encrypted (not plaintext)', stored && JSON.stringify(stored).indexOf(secret) === -1 && stored.secret && stored.secret.tag);

    const wrongPass = await request(port, 'POST', '/api/admin/login', { user, pass: 'nope' });
    ok('wrong password → 401 (no 2FA hint)', wrongPass.status === 401 && (!wrongPass.json || wrongPass.json.code !== 'totp_required'));
    const need = await request(port, 'POST', '/api/admin/login', { user, pass: password });
    ok('password only → 401 totp_required, no token', need.status === 401 && need.json && need.json.code === 'totp_required' && !need.json.token, need.json);
    const wrong = await request(port, 'POST', '/api/admin/login', { user, pass: password, otp: '123456' === totp.totp(secret) ? '654321' : '123456' });
    ok('wrong code → 401 totp_invalid', wrong.status === 401 && wrong.json && wrong.json.code === 'totp_invalid', wrong.json);
    const code = totp.totp(secret);
    const good = await request(port, 'POST', '/api/admin/login', { user, pass: password, otp: code });
    ok('correct code → 200 + session token', good.status === 200 && good.json && good.json.token, good.json);
    const replay = await request(port, 'POST', '/api/admin/login', { user, pass: password, otp: code });
    ok('same code reused → rejected (replay protection)', replay.status === 401 && replay.json && replay.json.code === 'totp_invalid', replay.json);
    const rc = en.recoveryCodes[0];
    const rec1 = await request(port, 'POST', '/api/admin/login', { user, pass: password, otp: rc.toLowerCase() });
    ok('recovery code works once', rec1.status === 200 && rec1.json && rec1.json.token, rec1.json);
    const rec2 = await request(port, 'POST', '/api/admin/login', { user, pass: password, otp: rc });
    ok('recovery code cannot be reused', rec2.status === 401, rec2.status);
    const st = await twoFactor.status(user);
    ok('status: enabled, 9 recovery codes left', st.enabled === true && st.recoveryLeft === 9, st);

    await twoFactor.disable(user);
    const after = await request(port, 'POST', '/api/admin/login', { user, pass: password });
    ok('after disable → password-only login works again', after.status === 200 && after.json && after.json.token, after.json);
  } finally {
    child.kill('SIGTERM');
    await new Promise((s) => setTimeout(s, 400));
    try { await repos.adminTeam.remove('ADM_2FA_' + now, { skipBackup: true }); } catch (e) { /* */ }
    if (fail) console.log('\n--- server log tail ---\n' + logs.slice(-1500));
  }
  console.log(`\nadmin 2fa: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
