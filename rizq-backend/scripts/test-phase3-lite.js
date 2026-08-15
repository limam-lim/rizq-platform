/**
 * اختبار طبقة DB + مسارات auth/wishlist بدون تحميل server.js الكامل
 */
const express = require('express');
require('../db');
const authRouter = require('../routes/auth');
const wishlistRouter = require('../routes/wishlist');
const { globalErrorHandler, notFoundHandler } = require('../middleware/errors');

const PORT = 3099;
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/wishlist', wishlistRouter);
app.use(notFoundHandler);
app.use(globalErrorHandler);

const server = app.listen(PORT, async () => {
  const BASE = 'http://127.0.0.1:' + PORT;
  const results = [];

  async function req(method, path, body, headers) {
    const r = await fetch(BASE + path, {
      method,
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json();
    return { status: r.status, body: j };
  }

  const authH = (id, token) => ({
    Authorization: 'Bearer ' + token,
    'X-Buyer-Id': id,
  });

  try {
    const phone = '44' + String(Date.now()).slice(-6);
    const reg = await req('POST', '/api/auth/register', { name: 'P3 Test', phone, email: 'p3@test.mr' });
    results.push(['register 201/200', (reg.status === 201 || reg.status === 200) && reg.body.ok]);

    const id = reg.body.buyer.id;
    const token = reg.body.token;

    const me = await req('GET', '/api/auth/me?id=' + id + '&token=' + token);
    results.push(['me 200', me.status === 200]);

    const bad = await req('POST', '/api/auth/register', { name: 'X', phone: '11111111' });
    results.push(['bad phone 400', bad.status === 400]);

    const sync = await req('POST', '/api/wishlist/sync', { ids: ['a1', 'a2'] }, authH(id, token));
    results.push(['sync 200', sync.status === 200 && sync.body.count === 2]);

    const get = await req('GET', '/api/wishlist', null, authH(id, token));
    results.push(['get wl', get.status === 200 && get.body.ids.length === 2]);

    const noAuth = await req('GET', '/api/wishlist');
    results.push(['no auth 401', noAuth.status === 401]);

    const nf = await req('GET', '/api/nope');
    results.push(['404', nf.status === 404]);

    console.log('\n=== Phase 3 API (lite) ===');
    results.forEach(([n, p]) => console.log((p ? 'OK' : 'FAIL') + ' ' + n));
    const pass = results.every(([, p]) => p);
    console.log(pass ? '\nALL PASSED' : '\nSOME FAILED');
    process.exitCode = pass ? 0 : 1;
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
