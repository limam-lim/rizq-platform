/**
 * verify-dash: لا تكشف حالة الحساب المعلّق بلا رمز مطابق.
 * - بلا رمز / رمز خاطئ → 401
 * - accessToken صحيح لحساب معلّق → 403 not_approved
 *
 * تشغيل: node scripts/test-verify-dash-pending.js
 */
'use strict';

const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (e) { /* optional */ }
const { spawnHttpTestServer } = require('./_spawnHttpTestServer');

let BASE = 'http://127.0.0.1:' + (process.env.PORT || 3000);
const results = [];

function ok(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
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
  return { status: r.status, body: j };
}

async function main() {
  console.log('\n=== verify-dash pending token gate ===\n');
  let httpServer = null;
  try {
    httpServer = await spawnHttpTestServer();
    BASE = httpServer.base;
    process.env.PORT = String(httpServer.port);
  } catch (eSpawn) {
    console.error('spawn failed:', eSpawn && eSpawn.message || eSpawn);
    process.exit(1);
  }
  try {
  const id = 'ACC_' + Date.now() + String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
  const email = 'vd_pend_' + Date.now() + '@test.mr';
  const nni = String(3400000000 + Math.floor(Math.random() * 89999999));
  const reg = await req('POST', '/api/accounts', {
    id,
    type: 'store',
    name: 'VD Pending Gate',
    email,
    password: 'Journey!VdPendAa1',
    phone: '44112233',
    phoneIntl: '+22244112233',
    city: 'نواكشوط',
    nni,
    activityId: 'st_grocery',
    activity: 'بقالة',
  });
  ok('register pending account', reg.status === 200 && reg.body && reg.body.ok && reg.body.status === 'pending',
    'status=' + reg.status + ' bodyStatus=' + (reg.body && reg.body.status));
  const accId = (reg.body && reg.body.id) || id;
  const accessToken = reg.body && reg.body.accessToken;
  ok('registration returned accessToken', !!accessToken);

  const noTok = await req('POST', '/api/accounts/verify-dash/' + encodeURIComponent(accId), { dashToken: '' });
  ok('no token → 401 (no status leak)', noTok.status === 401 && !(noTok.body && noTok.body.code === 'not_approved'),
    'status=' + noTok.status + ' code=' + (noTok.body && noTok.body.code));

  const omitTok = await req('POST', '/api/accounts/verify-dash/' + encodeURIComponent(accId), {});
  ok('omitted token → 401', omitTok.status === 401);

  const badTok = await req('POST', '/api/accounts/verify-dash/' + encodeURIComponent(accId),
    { dashToken: 'forged-token-xyz' }, { 'x-dash-token': 'forged-token-xyz' });
  ok('wrong token → 401', badTok.status === 401 && !(badTok.body && badTok.body.code === 'not_approved'),
    'status=' + badTok.status);

  const good = await req('POST', '/api/accounts/verify-dash/' + encodeURIComponent(accId),
    { dashToken: accessToken }, { 'x-dash-token': accessToken });
  ok('valid accessToken on pending → 403 not_approved',
    good.status === 403 && good.body && good.body.code === 'not_approved' && good.body.status === 'pending',
    'status=' + good.status + ' code=' + (good.body && good.body.code) + ' st=' + (good.body && good.body.status));

  const failed = results.filter((r) => !r.pass);
  console.log('\n' + (failed.length ? 'FAILED ' + failed.length : 'ALL OK') + ' / ' + results.length);
  return failed.length ? 1 : 0;
  } finally {
    if (httpServer) {
      try { await httpServer.stop(); } catch (eStop) { /* */ }
    }
  }
}

main().then((code) => {
  process.exit(code == null ? 0 : code);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
