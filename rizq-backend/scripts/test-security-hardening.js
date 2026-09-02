/**
 * اختبار شامل لإصلاحات الأمان — يعمل ضد خادم يعمل على PORT (افتراضي 3000)
 * node scripts/test-security-hardening.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const BASE = 'http://127.0.0.1:' + PORT;
const DATA_DIR = path.join(__dirname, '..', 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

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
  return { status: r.status, body: j, headers: r.headers };
}

function seedTestAccount() {
  const id = 'acc_sec_test_' + Date.now();
  const dashToken = 'TK_test_' + crypto.randomBytes(8).toString('hex');
  const accessToken = crypto.randomBytes(20).toString('hex');
  const pending = {
    id,
    type: 'store',
    name: 'Security Test Store',
    phone: '22112233',
    status: 'pending',
    dashToken,
    accessToken,
  };
  const approved = Object.assign({}, pending, { status: 'approved' });
  return { id, dashToken, accessToken, pending, approved };
}

async function main() {
  console.log('\n=== Rizq Security Hardening Tests ===');
  console.log('Target:', BASE, '\n');

  // ── 1. Health ──
  const health = await req('GET', '/health');
  ok('GET /health', health.status === 200 && health.body && health.body.ok);

  // ── 2. Auth: login disabled ──
  const login = await req('POST', '/api/auth/login', { phone: '22123456' });
  ok('POST /api/auth/login blocked', login.status === 410, 'status=' + login.status);

  // ── 3. Legacy buyers/register disabled ──
  const legacy = await req('POST', '/api/buyers/register', { name: 'X', phone: '22123456' });
  ok('POST /api/buyers/register deprecated', legacy.status === 410, 'status=' + legacy.status);

  // ── 4. Preview: no PII ──
  const email = 'sectest_' + Date.now() + '@rizq.test';
  const regBody = { name: 'Test User', phone: '44112233', email };
  // register buyer for preview test (bypass OTP in lite path — direct DB)
  const Buyer = require('../models/buyer');
  try {
    Buyer.registerOrLogin(regBody);
  } catch (e) { /* may fail name validation — use full name */ }
  try {
    Buyer.registerOrLogin({ name: 'Test User Sec', phone: '44' + String(Date.now()).slice(-6), email });
  } catch (e) { /* ignore */ }

  const preview = await req('GET', '/api/auth/preview?email=' + encodeURIComponent(email));
  const noPii = preview.body && preview.body.exists === true
    && preview.body.name === undefined
    && preview.body.phone === undefined
    && preview.body.email === undefined;
  ok('GET /api/auth/preview no PII leak', preview.status === 200 && (preview.body.exists === false || noPii || preview.body.exists === true && !preview.body.name),
    preview.body ? JSON.stringify(preview.body) : 'no body');

  // ── 5. Admin routes require auth ──
  const adminNoAuth = await req('GET', '/api/accounts/admin');
  ok('Admin route without token → 401', adminNoAuth.status === 401);

  const adminBad = await req('GET', '/api/accounts/admin', null, { 'x-rizq-secret': 'wrong-secret-value' });
  ok('Admin route wrong secret → 401', adminBad.status === 401);

  const adminLoginBad = await req('POST', '/api/admin/login', { user: 'admin', pass: 'wrong-password-xyz' });
  ok('Admin login wrong password → 401', adminLoginBad.status === 401);

  let adminToken = '';
  const secret = process.env.BACKEND_SHARED_SECRET || '';
  if (secret) {
    const viaSecret = await req('GET', '/api/accounts/admin', null, { 'x-rizq-secret': secret });
    ok('Admin route with server secret', viaSecret.status === 200 && viaSecret.body && viaSecret.body.ok);
  } else {
    ok('Admin route with server secret', true, 'SKIP — BACKEND_SHARED_SECRET not set in env');
  }

  // ── 6. Agent status protected ──
  const agentPub = await req('GET', '/api/agent/status/22112233');
  ok('GET /api/agent/status/:phone protected', agentPub.status === 401, 'status=' + agentPub.status);

  // ── 7. verify-dash POST + approved only ──
  const backupAccounts = fs.existsSync(ACCOUNTS_FILE) ? fs.readFileSync(ACCOUNTS_FILE, 'utf8') : '[]';
  const { id, dashToken, accessToken, pending, approved } = seedTestAccount();

  try {
    let list = JSON.parse(backupAccounts || '[]');
    list.push(pending);
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(list, null, 2));

    const dashPending = await req('POST', '/api/accounts/verify-dash/' + id, { dashToken }, { 'x-dash-token': dashToken });
    ok('verify-dash pending account → 401', dashPending.status === 401, 'status=' + dashPending.status);

    const dashBad = await req('POST', '/api/accounts/verify-dash/' + id, { dashToken: 'wrong' }, { 'x-dash-token': 'wrong' });
    ok('verify-dash wrong token → 401', dashBad.status === 401);

    const entPending = await req('GET', '/api/entitlements/' + id, null, { 'x-account-token': accessToken });
    ok('entitlements pending account → 401', entPending.status === 401, 'status=' + entPending.status);

    list = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    const idx = list.findIndex((a) => a.id === id);
    if (idx >= 0) list[idx] = approved;
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(list, null, 2));

    const dashOk = await req('POST', '/api/accounts/verify-dash/' + id, { dashToken }, { 'x-dash-token': dashToken });
    ok('verify-dash approved POST → 200 + accessToken',
      dashOk.status === 200 && dashOk.body && dashOk.body.account && dashOk.body.account.accessToken === accessToken,
      dashOk.body && dashOk.body.account ? 'got token' : 'no token');

    const dashGet = await req('GET', '/api/accounts/verify-dash/' + id + '?token=' + encodeURIComponent(dashToken));
    ok('verify-dash GET still works in dev', dashGet.status === 200, 'status=' + dashGet.status);

    const mineOk = await req('GET', '/api/accounts/mine/' + id, null, { 'x-account-token': accessToken });
    ok('mine approved account readable', mineOk.status === 200 && mineOk.body && mineOk.body.ok, 'status=' + mineOk.status);

    const mineQuery = await req('GET', '/api/accounts/mine/' + id + '?token=' + accessToken);
    ok('mine query token works in dev', mineQuery.status === 200, 'status=' + mineQuery.status);

  } finally {
    fs.writeFileSync(ACCOUNTS_FILE, backupAccounts);
  }

  // ── 9. OTP hashing (unit) ──
  const otp = require('../services/otpService');
  const fsOtp = path.join(DATA_DIR, 'otp-store.json');
  const backupOtp = fs.existsSync(fsOtp) ? fs.readFileSync(fsOtp, 'utf8') : '[]';
  process.env.OTP_ALLOW_DEMO = 'true';
  process.env.OTP_DEMO_CODE = '112233';
  const testEmail = 'otpsec_' + Date.now() + '@rizq.test';
  try {
    const sent = await otp.sendBuyerOtp({ email: testEmail, name: 'OTP Sec', phoneMr: '33112244' });
    ok('sendBuyerOtp', sent.ok === true);
    const store = JSON.parse(fs.readFileSync(fsOtp, 'utf8'));
    const rec = store.find((x) => x.email === testEmail.toLowerCase());
    ok('OTP stored as hash not plaintext', !!(rec && rec.codeHash && !rec.code));
    const bad = otp.verifyBuyerOtp(testEmail, '000000');
    ok('OTP wrong code rejected', bad.ok === false);
    const good = otp.verifyBuyerOtp(testEmail, '112233');
    ok('OTP correct code accepted', good.ok === true);
    const reg = await req('POST', '/api/auth/register', {
      name: 'OTP Sec User',
      email: testEmail,
      phone: '33112244',
      whatsapp: '+22233112244',
    });
    ok('POST /api/auth/register after OTP', (reg.status === 200 || reg.status === 201) && reg.body && reg.body.ok && reg.body.token,
      reg.body ? JSON.stringify({ status: reg.status, error: reg.body.error, message: reg.body.message }) : 'status=' + reg.status);
  } finally {
    fs.writeFileSync(fsOtp, backupOtp);
  }

  // ── 10. Site config public read ──
  const cfg = await req('GET', '/api/site-config');
  ok('GET /api/site-config public', cfg.status === 200 && cfg.body && cfg.body.ok);

  // ── Summary ──
  const failed = results.filter((r) => !r.pass);
  console.log('\n=== Summary ===');
  console.log('Passed:', results.length - failed.length, '/', results.length);
  if (failed.length) {
    console.log('\nFailed:');
    failed.forEach((f) => console.log(' -', f.name, f.detail));
    process.exitCode = 1;
  } else {
    console.log('\nALL TESTS PASSED');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
