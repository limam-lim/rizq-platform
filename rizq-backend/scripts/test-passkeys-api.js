/**
 * اختبار مسارات Passkey دون جهاز بصمة حقيقي
 */
'use strict';

const express = require('express');
const http = require('http');
const path = require('path');

process.env.NODE_ENV = 'development';
process.env.RIZQ_ENV = 'development';
process.env.WEBAUTHN_RP_ID = 'localhost';
process.env.WEBAUTHN_ORIGIN = 'http://localhost:3000';

const Buyer = require('../models/buyer');
const Passkey = require('../models/passkey');
const passkeyRouter = require('../routes/passkey');
const { setBuyerSessionCookie, COOKIE_NAME } = require('../lib/buyerCookie');

function req(app, method, pathName, { headers = {}, body = null, cookies = '' } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const data = body ? JSON.stringify(body) : null;
      const r = http.request({
        hostname: '127.0.0.1',
        port,
        path: pathName,
        method,
        headers: Object.assign({
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          ...(cookies ? { Cookie: cookies } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        }, headers),
      }, (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          server.close();
          let json = null;
          try { json = JSON.parse(raw); } catch (e) {}
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        });
      });
      r.on('error', (e) => { server.close(); reject(e); });
      if (data) r.write(data);
      r.end();
    });
  });
}

async function main() {
  let failed = 0;
  function ok(name, cond) {
    if (cond) console.log('OK  ' + name);
    else { console.error('FAIL ' + name); failed++; }
  }

  const app = express();
  app.use(express.json());
  passkeyRouter.configurePasskeyRoutes({
    readAccounts: () => [],
    writeAccounts: () => {},
    genDashToken: () => 'TK_test',
  });
  app.use('/api/auth/passkey', passkeyRouter);

  const cfg = await req(app, 'GET', '/api/auth/passkey/config');
  ok('config', cfg.status === 200 && cfg.body && cfg.body.passkeys === true);

  const loginOpts = await req(app, 'POST', '/api/auth/passkey/login-options', {
    body: { kind: 'any' },
  });
  ok('login-options', loginOpts.status === 200 && loginOpts.body && loginOpts.body.options && loginOpts.body.options.challenge);

  const buyer = Buyer.registerOrLogin({
    name: 'Passkey Test User',
    email: 'passkey-' + Date.now() + '@example.com',
    phone: '22113344',
    whatsapp: '+22222113344',
  });
  ok('buyer seed', !!(buyer && buyer.buyer && buyer.token));

  const fakeRes = { cookies: [], append(k, v) { if (k === 'Set-Cookie') this.cookies.push(v); }, set() {} };
  setBuyerSessionCookie(fakeRes, buyer.buyer.id, buyer.token);
  const cookie = fakeRes.cookies[0].split(';')[0];

  const regOpts = await req(app, 'POST', '/api/auth/passkey/register-options', {
    cookies: cookie,
    body: { kind: 'buyer' },
    headers: { Authorization: 'Bearer ' + buyer.token, 'X-Buyer-Id': buyer.buyer.id },
  });
  ok('register-options authed', regOpts.status === 200 && regOpts.body && regOpts.body.options && regOpts.body.options.user);
  ok('register-options challenge stored', !!regOpts.body.options.challenge);

  const unauth = await req(app, 'POST', '/api/auth/passkey/register-options', {
    body: { kind: 'buyer' },
  });
  ok('register-options requires auth', unauth.status === 401);

  const list = await req(app, 'GET', '/api/auth/passkey/list?kind=buyer', {
    cookies: cookie,
    headers: { Authorization: 'Bearer ' + buyer.token, 'X-Buyer-Id': buyer.buyer.id },
  });
  ok('list empty', list.status === 200 && Array.isArray(list.body.passkeys) && list.body.passkeys.length === 0);

  // Frontend client present
  const fs = require('fs');
  const pkClient = fs.readFileSync(path.join(__dirname, '../../rizq_passkey.js'), 'utf8');
  ok('client supported()', pkClient.includes('PublicKeyCredential'));
  const gate = fs.readFileSync(path.join(__dirname, '../../rizq_auth_gate.js'), 'utf8');
  ok('gate passkey button', gate.includes('rag-passkey-login-btn') && gate.includes('passkeyLogin'));

  if (failed) {
    console.error('\n' + failed + ' failed');
    process.exit(1);
  }
  console.log('\nall passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
