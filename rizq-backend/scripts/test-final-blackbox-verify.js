/**
 * Final Black-Box & Boundary Security Verification
 * node scripts/test-final-blackbox-verify.js
 *
 * 1) Fuzz / boundary payloads on critical APIs → no 500 / no secret leak in errors
 * 2) Privilege escalation: overview-only admin → 403 on sensitive routes
 * 3) Public response + static client storage secret leak checks
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const adminTeam = require('../services/adminTeam');
const { scrubSecretsForBackup, SECRET_KEYS } = require('../lib/scrubSecrets');

const PORT = Number(process.env.PORT || 3000);
const BASE = 'http://127.0.0.1:' + PORT;
const SECRET = process.env.BACKEND_SHARED_SECRET || 'rizq-test-secret';
const ROOT = path.join(__dirname, '..', '..');

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
  const text = await r.text();
  let j = null;
  try { j = JSON.parse(text); } catch (e) { j = null; }
  return { status: r.status, body: j, text, headers: r.headers };
}

function containsSecretLeak(payload) {
  const s = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
  if (!s) return false;
  const patterns = [
    /"accessToken"\s*:\s*"[a-f0-9]{20,}"/i,
    /"dashToken"\s*:\s*"TK_[^"]+"/i,
    /"passHash"\s*:\s*"\$2/i,
    /"webhookUrl"\s*:\s*"https?:\/\//i,
    /"codeHash"\s*:\s*"[a-f0-9]{32,}"/i,
    /sk-ant-[a-zA-Z0-9_-]{20,}/,
    /BACKEND_SHARED_SECRET/,
    /"plainKey"\s*:\s*"rizq_live_/i,
    /"twilio.?token"\s*:\s*"[^"]{10,}"/i,
    /"email.?pass"\s*:\s*"[^"]{4,}"/i,
  ];
  return patterns.some((re) => re.test(s));
}

function isUnhandledExplosion(status, text) {
  if (status >= 500) return true;
  const t = String(text || '');
  // Node stack / SQL / path disclosure
  if (/at Object\.|at Module\.|SQLITE_|ENOENT|\/workspace\/|node:internal/i.test(t)) return true;
  return false;
}

async function loginOverviewAdmin() {
  const user = 'overview_bb_' + Date.now();
  const pass = 'OverviewTest!' + crypto.randomBytes(3).toString('hex');
  await adminTeam.createMember({
    user,
    name: 'Overview Blackbox',
    pass,
    permissions: ['overview'],
  }, 'verify-script', ['*']);
  const login = await req('POST', '/api/admin/login', { user, pass });
  if (login.status !== 200 || !login.body || !login.body.token) {
    throw new Error('overview login failed: ' + login.status + ' ' + JSON.stringify(login.body));
  }
  return { user, pass, token: login.body.token, permissions: login.body.permissions };
}

async function sectionFuzz() {
  console.log('\n── 1. Fuzz & boundary ──\n');
  const fuzzBodies = [
    null,
    {},
    { __proto__: { admin: true } },
    { constructor: { prototype: { polluted: true } } },
    [],
    '',
    'not-json-but-we-send-object',
    { accountId: '', token: '', pkg: '', riskLevel: 'clear', flags: ['clear'], status: 'active' },
    { accountId: 'a'.repeat(5000), message: 'x'.repeat(20000) },
    { email: 'not-an-email', phone: '000', code: '1' },
    { email: "a' OR 1=1 --@x.com", phone: '44112233', code: '000000' },
    { title: '<script>alert(1)</script>', desc: '{{7*7}}', price: -1, category: '../../etc' },
    { images: ['data:text/html;base64,PHNjcmlwdD4='], seller_trust_score: 9999, status: 'active' },
  ];

  const endpoints = [
    ['POST', '/api/accounts', fuzzBodies],
    ['POST', '/api/ads', fuzzBodies],
    ['POST', '/api/catalog', fuzzBodies],
    ['POST', '/api/sub-requests', fuzzBodies],
    ['POST', '/api/messages', fuzzBodies],
    ['POST', '/api/reviews', fuzzBodies],
    ['POST', '/api/otp/send', fuzzBodies],
    ['POST', '/api/otp/verify', fuzzBodies],
    ['POST', '/api/auth/register', fuzzBodies],
    ['POST', '/api/widget/chat', fuzzBodies],
    ['POST', '/api/ai/chat', fuzzBodies],
    ['POST', '/api/investments/plan', fuzzBodies],
    ['POST', '/api/investments/submit', fuzzBodies],
    ['POST', '/api/agent/toggle', fuzzBodies],
    ['POST', '/api/account-package/sync', fuzzBodies],
    ['POST', '/api/broadcast-sms', fuzzBodies],
    ['GET', '/api/site-config', [null]],
    ['GET', '/api/ads', [null]],
    ['GET', '/api/catalog', [null]],
    ['GET', '/api/accounts/public', [null]],
    ['GET', '/api/auth/preview?email=fuzz@test.com', [null]],
    ['GET', '/api/ad-boosts/RZQ-9999-99999', [null]],
  ];

  let fuzzOk = 0;
  let fuzzFail = 0;
  for (const [method, ep, bodies] of endpoints) {
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      let r;
      try {
        r = method === 'GET' ? await req('GET', ep) : await req(method, ep, body === 'not-json-but-we-send-object' ? { weird: true } : body);
      } catch (e) {
        ok('fuzz ' + method + ' ' + ep + ' #' + i, false, 'network: ' + e.message);
        fuzzFail++;
        continue;
      }
      const exploded = isUnhandledExplosion(r.status, r.text);
      const leak = containsSecretLeak(r.text);
      const pass = !exploded && !leak && r.status < 500;
      if (!pass) {
        ok('fuzz ' + method + ' ' + ep + ' #' + i, false,
          'status=' + r.status + (exploded ? ' explosion' : '') + (leak ? ' LEAK' : '') + ' body=' + String(r.text).slice(0, 120));
        fuzzFail++;
      } else {
        fuzzOk++;
      }
    }
  }
  ok('fuzz suite: no 500 / no secret leak across critical APIs', fuzzFail === 0,
    'okCases=' + fuzzOk + ' failCases=' + fuzzFail);
}

async function sectionPrivilege() {
  console.log('\n── 2. Privilege escalation (overview staff) ──\n');
  let overview;
  try {
    overview = await loginOverviewAdmin();
  } catch (e) {
    ok('create/login overview admin', false, e.message);
    return;
  }
  ok('overview admin login', true, 'perms=' + JSON.stringify(overview.permissions));
  ok('overview permissions are overview-only',
    Array.isArray(overview.permissions) && overview.permissions.length === 1 && overview.permissions[0] === 'overview');

  const hdr = { 'x-admin-token': overview.token };
  const sensitive = [
    ['POST', '/api/account-package/sync', { accountId: 'acc_x', pkgName: 'ماسية', days: 30, paymentConfirmed: true, activatedBy: 'admin' }],
    ['POST', '/api/broadcast-sms', { message: 'pwn' }],
    ['POST', '/api/sub-requests/admin/sub_fake/decision', { action: 'approve' }],
    ['POST', '/api/ad-boosts', { accountId: 'acc_x', adId: 'RZQ-2026-99999', days: 3 }],
    ['POST', '/api/tenders/package/activate', { accountId: 'acc_x', days: 30 }],
    ['POST', '/api/deactivation-requests/admin/x/resolve', { action: 'approve' }],
    ['GET', '/api/reports/admin', null],
    ['GET', '/api/ads/admin', null],
    ['POST', '/api/ads/admin/x/decision', { action: 'approve' }],
    ['GET', '/api/sub-requests/admin', null],
    ['POST', '/api/verify-receipt', { imageBase64: 'data:image/png;base64,xx' }],
    ['POST', '/api/currency-rates/refresh', {}],
    ['GET', '/api/admin/investments', null],
    ['POST', '/api/admin/investments/x/decision', { action: 'approve' }],
    ['GET', '/api/quota/admin', null],
    ['POST', '/api/telegram/setup-webhook', {}],
    ['POST', '/api/admin/team', { user: 'evil', name: 'Evil', pass: 'password123', permissions: ['*'] }],
    ['GET', '/api/admin/team', null],
    ['GET', '/api/accounts/admin', null],
    ['POST', '/api/accounts/admin/acc_x/decision', { action: 'approve' }],
  ];

  let denied = 0;
  for (const [method, ep, body] of sensitive) {
    const r = await req(method, ep, body, hdr);
    // Must be 403 (forbidden) — not 200. 401 would mean auth broken; 404 ok if resource missing AFTER authz
    const pass = r.status === 403 || (r.status === 404 && r.body && r.body.error === 'admin_forbidden');
    // Some routes may 404 after permission check fails differently — require admin_forbidden or 403
    const hardPass = r.status === 403
      || (r.body && (r.body.error === 'admin_forbidden' || r.body.code === 'admin_forbidden'));
    if (hardPass) {
      denied++;
      ok('overview blocked ' + method + ' ' + ep, true, 'status=' + r.status);
    } else {
      ok('overview blocked ' + method + ' ' + ep, false,
        'status=' + r.status + ' body=' + JSON.stringify(r.body).slice(0, 160));
    }
  }
  ok('overview staff denied all sensitive admin routes', denied === sensitive.length,
    denied + '/' + sensitive.length);

  // daily-digest requires overview — should succeed
  const digest = await req('GET', '/api/admin/daily-digest', null, hdr);
  ok('overview CAN read daily-digest', digest.status === 200 && digest.body && digest.body.ok !== false,
    'status=' + digest.status);

  // cleanup member
  try {
    const list = adminTeam.readTeam();
    const row = list.find((m) => m.user === overview.user);
    if (row) await adminTeam.deactivateMember(row.id);
  } catch (e) { /* ignore */ }
}

async function sectionLeaks() {
  console.log('\n── 3. Session / public leak surface ──\n');

  const publicGets = [
    '/api/site-config',
    '/api/ads',
    '/api/catalog',
    '/api/accounts/public',
    '/api/investments',
    '/api/tenders/public-stats',
    '/api/discovery/top-sellers',
    '/api/otp/config',
    '/api/auth/preview?email=nobody@rizq.test',
    '/health',
  ];
  for (const ep of publicGets) {
    const r = await req('GET', ep);
    const leak = containsSecretLeak(r.text);
    ok('public ' + ep + ' no secret fields', r.status < 500 && !leak,
      leak ? 'LEAK in body' : 'status=' + r.status);
  }

  // scrub helper unit
  const scrubbed = scrubSecretsForBackup({
    accessToken: 'abc123abc123abc123abc123',
    dashToken: 'TK_secret',
    webhookUrl: 'https://evil.example/hook',
    nested: { passHash: '$2a$10$xxxxxxxx', ok: true },
    title: 'safe',
  });
  ok('scrubSecrets strips tokens/hashes/webhooks',
    !scrubbed.accessToken && !scrubbed.dashToken && !scrubbed.webhookUrl
    && (!scrubbed.nested || !scrubbed.nested.passHash) && scrubbed.title === 'safe');

  // Static client scan — secrets must not be written to localStorage keys we fixed
  const clientFiles = [
    'rizq_cp_panel.html',
    'rizq_auth_gate.js',
    'rizq_account_route.js',
    'rizq_landing_v8.html',
    'rizq_messenger.js',
    'rizq_subscription_engine.js',
  ];
  let clientIssues = 0;
  for (const f of clientFiles) {
    const full = path.join(ROOT, f);
    if (!fs.existsSync(full)) continue;
    const src = fs.readFileSync(full, 'utf8');
    // Bad: persisting twilio token / email pass into localStorage
    if (/localStorage\.setItem\([^)]*ch-twilio-token|CHANNELS_FIELD_IDS[\s\S]{0,200}ch-twilio-token[\s\S]{0,200}localStorage\.setItem/i.test(src)
      && !/CHANNELS_SECRET_IDS/.test(src)) {
      ok('client ' + f + ' no Twilio token in LS write path', false);
      clientIssues++;
    }
    // Good pattern present in cp panel
    if (f === 'rizq_cp_panel.html') {
      ok('cp_panel defines CHANNELS_SECRET_IDS (no secret LS)', /CHANNELS_SECRET_IDS/.test(src));
      ok('cp_panel does not put twilio-token in CHANNELS_FIELD_IDS',
        !/CHANNELS_FIELD_IDS\s*=\s*\[[^\]]*ch-twilio-token/s.test(src));
    }
    // Buyer auth should use headers not query token in verifySessionSilently
    if (f === 'rizq_auth_gate.js') {
      ok('auth_gate /api/auth/me uses headers not ?token=',
        !/\/api\/auth\/me\?id=/.test(src) && /X-Buyer-Id|Authorization/.test(src));
    }
  }
  ok('static client secret-storage scan clean', clientIssues === 0, 'issues=' + clientIssues);

  // SECRET_KEYS catalog completeness smoke
  ok('SECRET_KEYS includes accessToken/dashToken/webhookUrl',
    SECRET_KEYS.has('accessToken') && SECRET_KEYS.has('dashToken') && SECRET_KEYS.has('webhookUrl'));
}

async function main() {
  console.log('\n=== Final Black-Box & Boundary Verification ===');
  console.log('Target:', BASE, '\n');

  const health = await req('GET', '/health');
  ok('server health', health.status === 200 && health.body && health.body.ok);

  // Privilege قبل الـ fuzz — تجنّب 429 من adminLoginLimiter بعد مئات الطلبات
  await sectionPrivilege();
  await sectionLeaks();
  await sectionFuzz();

  const failed = results.filter((r) => !r.pass);
  console.log('\n=== Summary ===');
  console.log('Passed:', results.length - failed.length, '/', results.length);
  if (failed.length) {
    console.log('Failed:');
    failed.forEach((f) => console.log(' -', f.name, f.detail));
    process.exitCode = 1;
  } else {
    console.log('ALL FINAL BLACK-BOX CHECKS PASSED');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
