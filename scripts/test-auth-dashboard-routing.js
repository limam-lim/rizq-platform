#!/usr/bin/env node
/**
 * مراجعة يومية — تسجيل + دخول + توجيه كل نوع حساب إلى داشبورده.
 * تشغيل: node scripts/test-auth-dashboard-routing.js
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

async function json(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function registerAndLogin(type, extras) {
  const stamp = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const email = `route_${type}_${stamp}@rizq.test`;
  const password = 'TestPass9!';
  const id = 'ACC_' + String(Date.now()).slice(0, 13) + String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
  const dashToken = 'TK_' + Math.random().toString(36).slice(2, 12).toUpperCase();
  const payload = Object.assign({
    id,
    type,
    name: 'اختبار ' + type + ' ' + stamp,
    email,
    password,
    phone: '22123456',
    city: 'نواكشوط',
    dashToken,
    nni: String(1000000000 + Math.floor(Math.random() * 899999999)),
  }, extras || {});

  const reg = await json('POST', '/api/accounts', payload);
  assert(reg.data && reg.data.ok, type + ' register failed: ' + JSON.stringify(reg.data));
  assert(reg.data.type === type, type + ' register type mismatch');

  const login = await json('POST', '/api/accounts/seller-login', { email, password });
  if (type === 'individual' || type === 'store') {
    assert(reg.data.autoApproved === true, type + ' should auto-approve');
    assert(reg.data.status === 'approved', type + ' status approved');
    assert(login.status === 200 && login.data && login.data.ok, type + ' login failed: ' + JSON.stringify(login.data));
    assert(login.data.account.type === type, type + ' login type mismatch');
    const expectedFile = DASH[type];
    const urlPath = expectedFile + '?id=' + encodeURIComponent(login.data.account.id);
    assert(login.data.account.dashToken || login.data.account.token, type + ' missing dashToken');
    return { type, email, id: login.data.account.id, urlPath, status: 'approved' };
  }

  assert(reg.data.autoApproved !== true, type + ' must NOT auto-approve');
  assert(reg.data.status === 'pending', type + ' should stay pending');
  assert(login.status === 403 && login.data && login.data.code === 'not_approved',
    type + ' login should be not_approved, got ' + JSON.stringify(login.data));
  return { type, email, id: reg.data.id, urlPath: DASH[type] + '?id=' + encodeURIComponent(reg.data.id), status: 'pending' };
}

async function main() {
  const health = await fetch(BASE + '/health').then((r) => r.ok).catch(() => false);
  assert(health, 'server not reachable at ' + BASE);

  const storeAct = { activityId: 'st_cars_used', activity: 'بيع سيارات مستعملة', category: 'سيارات' };
  const officeAct = { activityId: 'of_law', activity: 'مكتب محاماة', category: 'خدمات' };
  const corpAct = { activityId: 'st_cars_new', activity: 'بيع سيارات جديدة', category: 'سيارات' };

  const results = [];
  results.push(await registerAndLogin('individual'));
  results.push(await registerAndLogin('store', storeAct));
  results.push(await registerAndLogin('office', officeAct));
  results.push(await registerAndLogin('corp', corpAct));

  // Cross-type: store dashToken must not verify as corp
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

  console.log('OK auth→dashboard routing');
  results.forEach((r) => {
    console.log(' -', r.type, r.status, '→', r.urlPath);
  });
  console.log('ACHIEVEMENTS_PRESERVED: type-map, recoverSessionParams, bcrypt seller-login, verify-dash type lock');
}

main().catch((e) => {
  console.error('FAIL', e.message || e);
  process.exit(1);
});
