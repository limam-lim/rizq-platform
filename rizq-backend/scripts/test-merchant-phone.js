/**
 * اختبار تطبيع هاتف المحل/المكتب/المعرض + رفض التسجيل غير الصالح
 */
'use strict';

const http = require('http');
const { resolveAccountPhones, normalizeMrPhone, phoneMatchKey } = require('../lib/phoneNormalize');

const BASE = process.env.RIZQ_TEST_BASE || 'http://127.0.0.1:3000';

function req(method, path, body) {
  const u = new URL(path, BASE);
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const r = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : {},
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          let parsed = null;
          try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('OK  ', msg);
}

async function main() {
  console.log('\n=== Merchant phone normalize + register ===\n');

  assert(normalizeMrPhone('+222 45 12 34 56') === '45123456', 'MR from +222');
  assert(normalizeMrPhone('45123456') === '45123456', 'MR local 8');
  assert(normalizeMrPhone('11223344') === '', 'reject invalid MR prefix');
  assert(phoneMatchKey('+22245123456') === '45123456', 'match key');

  const mr = resolveAccountPhones({ phone: '36 11 22 33' });
  assert(mr.ok && mr.phone === '36112233' && mr.whatsapp === '+22236112233', 'resolve MR merchant');

  const intl = resolveAccountPhones({ phone: '+33 6 12 34 56 78' });
  assert(intl.ok && intl.phoneIntl === '+33612345678' && intl.whatsapp === '+33612345678', 'resolve intl merchant');

  const bad = resolveAccountPhones({ phone: '123' });
  assert(!bad.ok && bad.code === 'invalid_phone', 'reject short phone');

  const noPhone = await req('POST', '/api/accounts', {
    name: 'محل اختبار',
    type: 'store',
    email: 'nophone_' + Date.now() + '@t.com',
    password: 'password12',
    city: 'نواكشوط',
    activityId: 'st_phones',
  });
  assert(noPhone.status === 400 && noPhone.body && noPhone.body.code === 'invalid_phone',
    'POST /api/accounts without phone → 400');

  const badPhone = await req('POST', '/api/accounts', {
    name: 'محل اختبار',
    type: 'store',
    phone: '999',
    email: 'badph_' + Date.now() + '@t.com',
    password: 'password12',
    city: 'نواكشوط',
    activityId: 'st_phones',
  });
  assert(badPhone.status === 400 && badPhone.body && badPhone.body.code === 'invalid_phone',
    'POST /api/accounts bad phone → 400');

  const ts = Date.now();
  const okStore = await req('POST', '/api/accounts', {
    id: 'ACC_' + String(ts).padStart(13, '0').slice(0, 13),
    name: 'محل هاتف سليم',
    type: 'store',
    phone: '+222 44 55 66 77',
    email: 'store_phone_' + ts + '@t.com',
    password: 'password12',
    city: 'نواكشوط',
    activityId: 'st_phones',
  });
  assert(okStore.status === 200 && okStore.body && okStore.body.ok,
    'POST store with valid MR phone → ok (status=' + okStore.status + ' code=' + (okStore.body && okStore.body.code) + ')');

  const ts2 = Date.now() + 1;
  const okOffice = await req('POST', '/api/accounts', {
    id: 'ACC_' + String(ts2).padStart(13, '0').slice(0, 13),
    name: 'مكتب هاتف سليم',
    type: 'office',
    phone: '45129876',
    email: 'office_phone_' + ts2 + '@t.com',
    password: 'password12',
    city: 'نواذيبو',
    activityId: 'of_law',
  });
  assert(okOffice.status === 200 && okOffice.body && okOffice.body.ok,
    'POST office with valid phone → ok (status=' + okOffice.status + ' err=' + JSON.stringify(okOffice.body) + ')');

  const ts3 = Date.now() + 2;
  const okCorp = await req('POST', '/api/accounts', {
    id: 'ACC_' + String(ts3).padStart(13, '0').slice(0, 13),
    name: 'معرض سيارات سليم',
    type: 'corp',
    phone: '+22236110011',
    email: 'corp_phone_' + ts3 + '@t.com',
    password: 'password12',
    city: 'نواكشوط',
    activityId: 'st_cars_used',
  });
  assert(okCorp.status === 200 && okCorp.body && okCorp.body.ok,
    'POST corp/showroom with valid phone → ok');

  const noEmailCorp = await req('POST', '/api/accounts', {
    name: 'شركة بلا بريد',
    type: 'corp',
    phone: '44112233',
    password: 'password12',
    activityId: 'st_cars_used',
  });
  assert(noEmailCorp.status === 400 && noEmailCorp.body && noEmailCorp.body.code === 'email_required',
    'corp without email → 400');

  console.log('\nALL MERCHANT PHONE TESTS PASSED\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
