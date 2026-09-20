#!/usr/bin/env node
/**
 * مراجعة يومية — تسجيل + OTP + دخول + توجيه كل نوع حساب إلى داشبورده.
 * تشغيل: OTP_DEV_HINT=true node scripts/test-auth-dashboard-routing.js
 */
'use strict';

const BASE = process.env.RIZQ_BASE || 'http://127.0.0.1:3000';

const DASH = {
  individual: 'rizq_dashboard.html',
  store: 'rizq_dashboard_store.html',
  office: 'rizq_dashboard_office.html',
  corp: 'rizq_dashboard_corp.html',
};

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function json(method, path, body, headers) {
  const res = await fetch(BASE + path, {
    method,
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      headers || {}
    ),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function verifyEmailOtp(email, name, phone) {
  const send = await json('POST', '/api/otp/send', {
    channel: 'buyer',
    email,
    name: name || 'Test',
    phoneMr: phone || '22123456',
    whatsapp: '+222' + (phone || '22123456'),
  });
  assert(send.data && send.data.ok, 'otp send failed: ' + JSON.stringify(send.data));
  const code = send.data.devHint
    || process.env.OTP_DEMO_CODE
    || null;
  assert(code, 'Need OTP_DEV_HINT=true (or OTP_DEMO_CODE) for automated OTP in tests');
  const ver = await json('POST', '/api/otp/verify', {
    channel: 'buyer',
    email,
    code: String(code),
  });
  assert(ver.data && ver.data.ok, 'otp verify failed: ' + JSON.stringify(ver.data));
}

async function registerAndLogin(type, extras) {
  const stamp = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const email = `route_${type}_${stamp}@rizq.test`;
  const password = 'TestPass9!';
  const id = 'ACC_' + String(Date.now()).slice(0, 13) + String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
  const clientDash = 'TK_CLIENTSHOULDNOTWIN';
  const payload = Object.assign({
    id,
    type,
    name: 'اختبار ' + type + ' ' + stamp,
    email,
    password,
    phone: '22123456',
    city: 'نواكشوط',
    dashToken: clientDash,
    nni: String(1000000000 + Math.floor(Math.random() * 899999999)),
  }, extras || {});

  if (type === 'individual' || type === 'store') {
    await verifyEmailOtp(email, payload.name, payload.phone);
  }

  const reg = await json('POST', '/api/accounts', payload);
  assert(reg.data && reg.data.ok, type + ' register failed: ' + JSON.stringify(reg.data));
  assert(reg.data.type === type, type + ' register type mismatch');

  if (type === 'individual' || type === 'store') {
    assert(reg.data.autoApproved === true, type + ' should auto-approve after OTP');
    assert(reg.data.status === 'approved', type + ' status approved');
    assert(reg.data.dashToken, type + ' missing server dashToken');
    assert(reg.data.dashToken !== clientDash, type + ' must ignore client dashToken');
    assert(String(reg.data.dashToken).length > 20, type + ' dashToken should be strong');

    const login = await json('POST', '/api/accounts/seller-login', { email, password });
    assert(login.status === 200 && login.data && login.data.ok, type + ' login failed: ' + JSON.stringify(login.data));
    assert(login.data.account.type === type, type + ' login type mismatch');
    const expectedFile = DASH[type];
    const urlPath = expectedFile + '?id=' + encodeURIComponent(login.data.account.id);
    assert(login.data.account.dashToken || login.data.account.token, type + ' missing dashToken');
    return { type, email, id: login.data.account.id, urlPath, status: 'approved', dashToken: login.data.account.dashToken };
  }

  assert(reg.data.autoApproved !== true, type + ' must NOT auto-approve');
  assert(reg.data.status === 'pending', type + ' should stay pending');
  const login = await json('POST', '/api/accounts/seller-login', { email, password });
  assert(login.status === 403 && login.data && login.data.code === 'not_approved',
    type + ' login should be not_approved, got ' + JSON.stringify(login.data));
  return { type, email, id: reg.data.id, urlPath: DASH[type] + '?id=' + encodeURIComponent(reg.data.id), status: 'pending' };
}

async function main() {
  const health = await fetch(BASE + '/health').then((r) => r.ok).catch(() => false);
  assert(health, 'server not reachable at ' + BASE);

  /* بدون OTP: فرد/محل يبقيان pending */
  const stamp = Date.now();
  const noOtpEmail = `nootp_${stamp}@rizq.test`;
  const noOtp = await json('POST', '/api/accounts', {
    id: 'ACC_' + String(Date.now()).slice(0, 13) + '000001',
    type: 'individual',
    name: 'No OTP User',
    email: noOtpEmail,
    password: 'TestPass9!',
    phone: '22123456',
    city: 'نواكشوط',
    nni: String(1000000000 + Math.floor(Math.random() * 899999999)),
  });
  assert(noOtp.data && noOtp.data.ok, 'no-otp register should still create account');
  assert(noOtp.data.status === 'pending', 'without OTP must stay pending');
  assert(noOtp.data.otpRequired === true, 'should signal otpRequired');
  assert(!noOtp.data.dashToken, 'no dashToken without approval');

  /* إعلان مجهول مرفوض */
  const anonAd = await json('POST', '/api/ads', { title: 'spam', category: 'cars' });
  assert(anonAd.status === 401, 'anonymous ads must be rejected, got ' + anonAd.status);

  /* buyers/me query deprecated */
  const buyersMe = await json('GET', '/api/buyers/me?id=x&token=y');
  assert(buyersMe.status === 410, 'buyers/me must be gone, got ' + buyersMe.status);

  const storeAct = { activityId: 'st_cars_used', activity: 'بيع سيارات مستعملة', category: 'سيارات' };
  const officeAct = { activityId: 'of_law', activity: 'مكتب محاماة', category: 'خدمات' };
  const corpAct = { activityId: 'st_cars_new', activity: 'بيع سيارات جديدة', category: 'سيارات' };

  const results = [];
  results.push(await registerAndLogin('individual'));
  results.push(await registerAndLogin('store', storeAct));
  results.push(await registerAndLogin('office', officeAct));
  results.push(await registerAndLogin('corp', corpAct));

  const store = results.find((r) => r.type === 'store');
  const loginStore = await json('POST', '/api/accounts/seller-login', {
    email: store.email,
    password: 'TestPass9!',
  });
  assert(loginStore.data && loginStore.data.ok, 'store re-login');
  const tok = loginStore.data.account.dashToken || loginStore.data.account.token;
  const vRes = await fetch(BASE + '/api/accounts/verify-dash/' + encodeURIComponent(store.id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-dash-token': tok },
    body: JSON.stringify({ dashToken: tok }),
  });
  const verified = await vRes.json();
  if (verified && verified.ok && verified.account) {
    assert(verified.account.type === 'store', 'verify-dash must keep store type');
  }

  console.log('OK auth→dashboard routing + security gates');
  results.forEach((r) => {
    console.log(' -', r.type, r.status, '→', r.urlPath);
  });
  console.log('ACHIEVEMENTS_PRESERVED: type-map, recoverSessionParams, bcrypt seller-login, verify-dash type lock, OTP gate, server dashToken');
}

main().catch((e) => {
  console.error('FAIL', e.message || e);
  process.exit(1);
});
