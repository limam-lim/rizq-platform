'use strict';
/**
 * اختبارات وحدات لتصلّب الإنتاج (بدون خادم كامل).
 * node scripts/test-prod-hardening.js
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

async function main() {
  const { hashPassword, verifyPassword, validatePasswordStrength } = require('../services/passwordService');
  const { storeReceipt, resolveReceiptAbsolute, ensureReceiptsDir, RECEIPTS_DIR } = require('../services/receiptStorage');
  const { loadAdminAccounts } = require('../services/adminAccounts');
  const { updatePackageStatus, syncAccountPackage, getAccountRecord } = require('../rizq_package_lifecycle_agent');
  const { validateTwilioSignature, getTwilioAuthToken } = require('../middleware/twilioWebhookAuth');

  // 1) password hashing
  const weak = validatePasswordStrength('123');
  ok('reject short password', weak.ok === false);
  const hash = await hashPassword('SecurePass9');
  ok('hash starts with $2', typeof hash === 'string' && hash.startsWith('$2'));
  ok('verify correct password', await verifyPassword('SecurePass9', hash) === true);
  ok('reject wrong password', await verifyPassword('wrong-pass', hash) === false);

  // 2) receipt validation
  ensureReceiptsDir();
  const bad = storeReceipt('not-a-receipt', { accountId: 'a', requestId: 'r' });
  ok('reject invalid receipt', bad.ok === false);
  const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const stored = storeReceipt(tinyPng, { accountId: 'ACC_t', requestId: 'sub_t' });
  ok('store png receipt', stored.ok === true, stored.relativePath);
  const abs = resolveReceiptAbsolute(stored.relativePath);
  ok('resolve receipt path', !!abs && fs.existsSync(abs));
  ok('path traversal blocked', resolveReceiptAbsolute('../server.js') === null);
  ok('receipts dir under uploads/receipts', RECEIPTS_DIR.includes(path.join('uploads', 'receipts')));

  // 3) admin accounts from env
  const prev = process.env.ADMIN_ACCOUNTS_JSON;
  process.env.ADMIN_ACCOUNTS_JSON = JSON.stringify([
    { user: 'secadmin', passHash: hash, name: 'Sec', role: 'super' },
  ]);
  const admins = loadAdminAccounts();
  ok('load admin from env', admins.some((a) => a.user === 'secadmin' && a.passHash === hash));
  if (prev === undefined) delete process.env.ADMIN_ACCOUNTS_JSON;
  else process.env.ADMIN_ACCOUNTS_JSON = prev;

  // 4) package cancel/suspend
  const id = 'ACC_HARDEN_' + Date.now();
  await syncAccountPackage({
    accountId: id,
    accountName: 'Harden Test',
    accountPhone: '22001122',
    accountEmail: 'harden@test.mr',
    accountType: 'store',
    pkgName: 'gold',
    price: 500,
    days: 30,
    activatedBy: 'test',
    paymentConfirmed: true,
  });
  const suspended = updatePackageStatus(id, 'suspended', { reason: 'test', requestedBy: 'admin' });
  ok('suspend package', suspended.ok && suspended.status === 'suspended');
  const cancelled = updatePackageStatus(id, 'cancelled', { reason: 'test', requestedBy: 'account' });
  ok('cancel package', cancelled.ok && cancelled.status === 'cancelled');
  ok('record persists', getAccountRecord(id).status === 'cancelled');

  // 5) twilio middleware export
  ok('twilio middleware export', typeof validateTwilioSignature === 'function');
  ok('twilio token helper', typeof getTwilioAuthToken === 'function');

  // cleanup test receipt
  try { if (abs) fs.unlinkSync(abs); } catch (_) {}

  const failed = results.filter((r) => !r.pass);
  console.log('\nPassed', results.length - failed.length, '/', results.length);
  if (failed.length) {
    failed.forEach((f) => console.log(' -', f.name, f.detail));
    process.exitCode = 1;
  } else {
    console.log('ALL PROD HARDENING UNIT TESTS PASSED');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
