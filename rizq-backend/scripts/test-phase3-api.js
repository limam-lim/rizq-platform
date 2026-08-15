/**
 * اختبار مسارات /api/auth و /api/wishlist — المرحلة 3
 * التشغيل: node scripts/test-phase3-api.js
 */
const http = require('http');

const PORT = process.env.TEST_PORT || 3099;
process.env.PORT = String(PORT);

const server = require('../server');
const BASE = 'http://127.0.0.1:' + PORT;

function req(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch (e) { json = { raw: data }; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function authHeaders(id, token) {
  return {
    Authorization: 'Bearer ' + token,
    'X-Buyer-Id': id,
  };
}

async function run() {
  const results = [];
  const ok = (name, cond) => results.push({ name, pass: !!cond });

  // 1. Register (201)
  const reg = await req('POST', '/api/auth/register', {
    name: 'Test Buyer Phase3',
    phone: '22123456',
    email: 'test@rizq.mr',
  });
  ok('POST /api/auth/register → 201', reg.status === 201 && reg.body.ok && reg.body.token);
  const { id, token } = { id: reg.body.buyer.id, token: reg.body.token };

  // 2. Register same phone (200, not new)
  const reg2 = await req('POST', '/api/auth/register', { name: 'Test Buyer Phase3', phone: '22123456' });
  ok('POST /api/auth/register (existing) → 200', reg2.status === 200 && reg2.body.created === false);

  // 3. GET /api/auth/me
  const me = await req('GET', '/api/auth/me?id=' + encodeURIComponent(id) + '&token=' + encodeURIComponent(token));
  ok('GET /api/auth/me → 200', me.status === 200 && me.body.ok);

  // 4. Invalid phone → 400
  const badPhone = await req('POST', '/api/auth/register', { name: 'X', phone: '99123456' });
  ok('Invalid phone → 400', badPhone.status === 400 && badPhone.body.code === 'INVALID_PHONE');

  // 5. Unauthorized me → 401
  const badMe = await req('GET', '/api/auth/me?id=' + id + '&token=badtoken');
  ok('Bad token → 401', badMe.status === 401);

  // 6. Wishlist sync
  const sync = await req('POST', '/api/wishlist/sync', { ids: ['ad_1', 'ad_2', 'ad_1'] }, authHeaders(id, token));
  ok('POST /api/wishlist/sync → 200', sync.status === 200 && sync.body.count === 2);

  // 7. GET wishlist
  const wl = await req('GET', '/api/wishlist', null, authHeaders(id, token));
  ok('GET /api/wishlist → 200', wl.status === 200 && wl.body.ids.includes('ad_1'));

  // 8. PUT replace
  const put = await req('PUT', '/api/wishlist', { ids: ['ad_99'] }, authHeaders(id, token));
  ok('PUT /api/wishlist → 200', put.status === 200 && put.body.ids.length === 1 && put.body.ids[0] === 'ad_99');

  // 9. POST add item
  const add = await req('POST', '/api/wishlist/ad_100', null, authHeaders(id, token));
  ok('POST /api/wishlist/:itemId → 201', add.status === 201 && add.body.count === 2);

  // 10. DELETE item
  const del = await req('DELETE', '/api/wishlist/ad_99', null, authHeaders(id, token));
  ok('DELETE /api/wishlist/:itemId → 200', del.status === 200 && del.body.count === 1);

  // 11. Wishlist without auth → 401
  const noAuth = await req('GET', '/api/wishlist');
  ok('Wishlist no auth → 401', noAuth.status === 401);

  // 12. 404 unknown route
  const nf = await req('GET', '/api/does-not-exist');
  ok('Unknown route → 404', nf.status === 404 && nf.body.code === 'NOT_FOUND');

  // 13. Legacy /api/buyers/register
  const legacy = await req('POST', '/api/buyers/register', { name: 'Legacy', phone: '33112233' });
  ok('Legacy POST /api/buyers/register', legacy.status === 201 && legacy.body.token);

  const passed = results.filter((r) => r.pass).length;
  console.log('\n=== Phase 3 API Tests ===');
  results.forEach((r) => console.log((r.pass ? '✓' : '✗') + ' ' + r.name));
  console.log('\n' + passed + '/' + results.length + ' passed\n');

  server.close(() => process.exit(passed === results.length ? 0 : 1));
}

setTimeout(run, 800);
