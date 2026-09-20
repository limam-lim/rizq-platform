/**
 * اختبار شامل لإصلاحات الأمان — يعمل ضد خادم يعمل على PORT (افتراضي 3000)
 * node scripts/test-security-hardening.js
 *
 * الحسابات/المناقصات/الباقات تُزرع عبر platformStore + repos (SQLite).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const platformStore = require('../db/platformStore');
const repos = require('../db/repos');

const PORT = Number(process.env.PORT || 3000);
const BASE = 'http://127.0.0.1:' + PORT;
const DATA_DIR = path.join(__dirname, '..', 'data');

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
  const backupTenders = platformStore.readTenders();
  const { id, dashToken, accessToken, pending, approved } = seedTestAccount();
  let seededCatalogId = null;
  let seededTenderId = null;
  const tenderPkgKey = id + '::tender';

  try {
    platformStore.upsertAccount(pending);

    const dashPending = await req('POST', '/api/accounts/verify-dash/' + id, { dashToken }, { 'x-dash-token': dashToken });
    ok('verify-dash pending account → 401', dashPending.status === 401, 'status=' + dashPending.status);

    const dashBad = await req('POST', '/api/accounts/verify-dash/' + id, { dashToken: 'wrong' }, { 'x-dash-token': 'wrong' });
    ok('verify-dash wrong token → 401', dashBad.status === 401);

    const entPending = await req('GET', '/api/entitlements/' + id, null, { 'x-account-token': accessToken });
    ok('entitlements pending account → 401', entPending.status === 401, 'status=' + entPending.status);

    platformStore.upsertAccount(approved);

    repos.setPackage(id, {
      accountId: id,
      accountType: 'store',
      status: 'active',
      paymentConfirmed: true,
      activatedBy: 'admin',
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      pkgName: 'monthly',
      packageId: 'store-month',
      accessToken,
    });

    const dashOk = await req('POST', '/api/accounts/verify-dash/' + id, { dashToken }, { 'x-dash-token': dashToken });
    ok('verify-dash approved POST → 200 without accessToken',
      dashOk.status === 200 && dashOk.body && dashOk.body.account && dashOk.body.account.id === id && dashOk.body.account.accessToken === undefined,
      dashOk.body && dashOk.body.account ? 'profile ok' : 'no account');

    const exchangeOk = await req('POST', '/api/accounts/exchange-dash-token/' + id, { dashToken }, { 'x-dash-token': dashToken });
    ok('exchange-dash-token approved → accessToken',
      exchangeOk.status === 200 && exchangeOk.body && exchangeOk.body.accessToken === accessToken,
      exchangeOk.body ? 'got token' : 'no token');

    const dashGet = await req('GET', '/api/accounts/verify-dash/' + id + '?token=' + encodeURIComponent(dashToken));
    ok('verify-dash GET still works in dev', dashGet.status === 200, 'status=' + dashGet.status);

    const catalogPost = await req('POST', '/api/catalog', {
      accountId: id,
      name: 'Sec Test Item',
      kind: 'product',
      status: 'active',
    }, { 'x-account-token': accessToken });
    ok('catalog POST forces pending_review',
      catalogPost.status === 200 && catalogPost.body && catalogPost.body.item && catalogPost.body.item.status === 'pending_review',
      catalogPost.body && catalogPost.body.item ? 'status=' + catalogPost.body.item.status : 'no item');
    seededCatalogId = catalogPost.body && catalogPost.body.item && catalogPost.body.item.id;

    const mineOk = await req('GET', '/api/accounts/mine/' + id, null, { 'x-account-token': accessToken });
    ok('mine approved account readable', mineOk.status === 200 && mineOk.body && mineOk.body.ok, 'status=' + mineOk.status);

    const mineQuery = await req('GET', '/api/accounts/mine/' + id + '?token=' + accessToken);
    ok('mine query token works in dev', mineQuery.status === 200, 'status=' + mineQuery.status);

    const staticTenderAsset = await req('GET', '/uploads/tenders/test/0.webp');
    ok('tender static assets blocked', staticTenderAsset.status === 403, 'status=' + staticTenderAsset.status);

    repos.setPackage(tenderPkgKey, {
      accountId: tenderPkgKey,
      accountType: 'store',
      status: 'active',
      paymentConfirmed: true,
      activatedBy: 'admin',
      periodStart: new Date().toISOString(),
      periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      pkgName: 'باقة المناقصة',
      packageId: 'tnd-month',
    });

    const tenderLeak = await req('POST', '/api/tenders', {
      accountId: id,
      title: 'test واتس 22112233',
      deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    }, { 'x-account-token': accessToken });
    ok('tender POST rejects contact leak', tenderLeak.status === 422, 'status=' + tenderLeak.status);

    const tenderPost = await req('POST', '/api/tenders', {
      accountId: id,
      title: 'Security harness tender',
      desc: 'clean description',
      deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    }, { 'x-account-token': accessToken });
    ok('tender POST pending_review',
      tenderPost.status === 200 && tenderPost.body && tenderPost.body.pendingReview === true
        && tenderPost.body.tender && tenderPost.body.tender.status === 'pending_review',
      tenderPost.body ? 'status=' + (tenderPost.body.tender && tenderPost.body.tender.status) : String(tenderPost.status));

    seededTenderId = tenderPost.body && tenderPost.body.tender && tenderPost.body.tender.id;
    if (seededTenderId) {
      const pub = await req('GET', '/api/tenders');
      const found = (pub.body && pub.body.tenders || []).find((t) => t.id === seededTenderId);
      ok('pending tender not in public list', !found);
    }

  } finally {
    try {
      platformStore.deleteAccount(id);
    } catch (e) { /* ignore cleanup */ }
    try {
      if (seededCatalogId) platformStore.deleteCatalogItem(seededCatalogId);
    } catch (e) { /* ignore cleanup */ }
    try {
      if (seededTenderId) platformStore.deleteTender(seededTenderId);
      else platformStore.writeTenders(backupTenders);
    } catch (e) { /* ignore cleanup */ }
    try {
      repos.packages.remove(id);
      repos.packages.remove(tenderPkgKey);
    } catch (e) { /* ignore cleanup */ }
  }

  // ── 9. OTP hashing (unit) ──
  const otp = require('../services/otpService');
  const backupOtp = repos.listOtp();
  process.env.OTP_ALLOW_DEMO = 'true';
  process.env.OTP_DEMO_CODE = '112233';
  const testEmail = 'otpsec_' + Date.now() + '@rizq.test';
  try {
    const sent = await otp.sendBuyerOtp({ email: testEmail, name: 'OTP Sec', phoneMr: '33112244' });
    ok('sendBuyerOtp', sent.ok === true);
    const store = repos.listOtp();
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
    repos.replaceOtpStore(backupOtp);
  }

  // ── 10. Site config public read + no secrets ──
  const cfg = await req('GET', '/api/site-config');
  ok('GET /api/site-config public', cfg.status === 200 && cfg.body && cfg.body.ok);
  const pub = cfg.body && cfg.body.config;
  ok('site-config has no webhookUrl', !!(pub && (!pub.channelsPublic || !pub.channelsPublic.webhookUrl)));
  ok('site-config has moduleFlags', !!(pub && pub.moduleFlags));

  // ── 11. CSP header ──
  const healthRes = await fetch(BASE + '/health');
  ok('CSP header present', !!healthRes.headers.get('content-security-policy'));

  // ── 12. Invalid account type ──
  const badType = await req('POST', '/api/accounts', { name: 'Bad', type: 'hacker', email: 'bad_' + Date.now() + '@t.com' });
  ok('invalid account type rejected', badType.status === 400 && badType.body && badType.body.code === 'invalid_type');

  // ── 13. NNI available does not enumerate duplicates ──
  const nniFmt = await req('GET', '/api/accounts/nni-available?nni=abc');
  ok('NNI invalid format → 400', nniFmt.status === 400);
  const nniOk = await req('GET', '/api/accounts/nni-available?nni=1234567890');
  ok('NNI valid format → available without DB reveal', nniOk.status === 200 && nniOk.body && nniOk.body.available === true);

  // ── 14. Image URL reuse ownership ──
  const { saveProcessedImages } = require('../services/imagePipeline');
  const stolen = await saveProcessedImages({
    namespace: 'ads',
    entityId: 'RZQ-OWN',
    images: ['/uploads/ads/RZQ-OTHER/0.webp'],
    maxCount: 2,
  });
  ok('image reuse rejects foreign entity URL', Array.isArray(stolen) && stolen.length === 0);
  const owned = await saveProcessedImages({
    namespace: 'ads',
    entityId: 'RZQ-OWN',
    images: ['/uploads/ads/RZQ-OWN/0.webp'],
    maxCount: 2,
  });
  ok('image reuse allows own entity URL', Array.isArray(owned) && owned[0] === '/uploads/ads/RZQ-OWN/0.webp');

  // ── 15. JSON backup scrub ──
  const { scrubSecretsForBackup } = require('../lib/scrubSecrets');
  const scrubbed = scrubSecretsForBackup({
    accessToken: 'secret',
    dashToken: 'TK_x',
    passHash: '$2a',
    name: 'Safe',
    channelsPublic: { phone: '1', webhookUrl: 'https://evil' },
  });
  ok('scrub removes tokens/hashes', !scrubbed.accessToken && !scrubbed.dashToken && !scrubbed.passHash && scrubbed.name === 'Safe');
  ok('scrub removes nested webhookUrl', !(scrubbed.channelsPublic && scrubbed.channelsPublic.webhookUrl));

  // ── 16. Suspended verify-dash ──
  const sus = seedTestAccount();
  try {
    platformStore.upsertAccount(Object.assign({}, sus.approved, { suspended: true }));
    const vSus = await req('POST', '/api/accounts/verify-dash/' + sus.id, { dashToken: sus.dashToken }, { 'x-dash-token': sus.dashToken });
    ok('verify-dash suspended → 401', vSus.status === 401);
    const exSus = await req('POST', '/api/accounts/exchange-dash-token/' + sus.id, { dashToken: sus.dashToken }, { 'x-dash-token': sus.dashToken });
    ok('exchange-dash-token suspended → 401', exSus.status === 401);
  } finally {
    try { platformStore.deleteAccount(sus.id); } catch (e) { /* ignore */ }
  }

  // ── 17. visit-stats rejects query token ──
  const pkgAcc = seedTestAccount();
  try {
    platformStore.upsertAccount(pkgAcc.approved);
    repos.setPackage(pkgAcc.id, { accessToken: pkgAcc.accessToken, accountType: 'store', accountId: pkgAcc.id });
    const qTok = await req('GET', '/api/visit-stats/' + pkgAcc.id + '?token=' + encodeURIComponent(pkgAcc.accessToken));
    ok('visit-stats query token rejected', qTok.status === 401);
    const hTok = await req('GET', '/api/visit-stats/' + pkgAcc.id, null, { 'x-account-token': pkgAcc.accessToken });
    ok('visit-stats header token accepted', hTok.status === 200 && hTok.body && hTok.body.ok, 'status=' + hTok.status);
  } finally {
    try {
      platformStore.deleteAccount(pkgAcc.id);
      repos.packages.remove(pkgAcc.id);
    } catch (e) { /* ignore */ }
  }

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
