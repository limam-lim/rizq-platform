#!/usr/bin/env node
/**
 * اختبار تخزين SQLite للمنصة (حسابات/إعلانات) مع بقاء عقود الـ API.
 * تشغيل: node rizq-backend/scripts/test-platform-store.js
 */
'use strict';

const path = require('path');
const fs = require('fs');

process.chdir(path.join(__dirname, '..'));

const store = require('../db/platformStore');
const BASE = process.env.RIZQ_BASE || 'http://127.0.0.1:3000';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function json(method, urlPath, body) {
  const res = await fetch(BASE + urlPath, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function main() {
  const stamp = Date.now();
  const id = 'ACC_STORE_' + stamp;
  const email = 'storetest_' + stamp + '@rizq.test';

  // كتابة مباشرة عبر المتجر
  const before = store.readAccounts().length;
  store.writeAccounts(store.readAccounts().concat([{
    id,
    type: 'individual',
    name: 'Store Test',
    email,
    status: 'approved',
    phone: '22123456',
    accessToken: 'tok_' + stamp,
    dashToken: 'TK_' + stamp,
    createdAt: new Date().toISOString(),
  }]));
  const after = store.readAccounts();
  assert(after.some((a) => a.id === id), 'account persisted in sqlite store');
  assert(store.getAccountById(id), 'getAccountById works');
  assert(store.getAccountByEmail(email), 'getAccountByEmail works');

  const accountsJson = path.join(__dirname, '..', 'data', 'accounts.json');
  assert(fs.existsSync(accountsJson), 'json backup still written');
  const fromFile = JSON.parse(fs.readFileSync(accountsJson, 'utf8'));
  assert(fromFile.some((a) => a.id === id), 'json backup contains account');

  // عبر API العام
  const pub = await json('GET', '/api/accounts/public');
  assert(pub.status === 200 && pub.data && pub.data.ok, 'public accounts api ok');
  assert(Array.isArray(pub.data.accounts), 'public accounts list');
  assert(pub.data.accounts.some((a) => a.id === id), 'sqlite account visible via API');

  // تنظيف سجل الاختبار
  store.writeAccounts(store.readAccounts().filter((a) => a.id !== id));
  assert(!store.getAccountById(id), 'cleanup ok');

  console.log('OK platform-store sqlite accounts+backup');
  console.log('ACHIEVEMENTS_PRESERVED: API contracts, json backup mirror, indexed lookups');
  console.log('accounts_before=', before, 'accounts_now=', store.readAccounts().length);
}

main().catch((e) => {
  console.error('FAIL', e.message || e);
  process.exit(1);
});
