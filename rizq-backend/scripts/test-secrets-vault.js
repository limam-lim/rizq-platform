/**
 * اختبار خزنة الأسرار
 * node rizq-backend/scripts/test-secrets-vault.js
 */
'use strict';

process.env.BACKEND_SHARED_SECRET = process.env.BACKEND_SHARED_SECRET || 'test-vault-secret-97ff';
process.env.RIZQ_API_SECRET = process.env.RIZQ_API_SECRET || 'test-api-secret-97ff';
delete process.env.ANTHROPIC_API_KEY;
delete process.env.CLAUDE_API_KEY;
delete process.env.TWILIO_SID;
delete process.env.TWILIO_AUTH_TOKEN;

const vault = require('../services/secretsVault');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed += 1; console.error('FAIL:', msg); }
  else console.log('OK:', msg);
}

const before = vault.getPublicStatus();
assert(before.ok && before.groups.length >= 4, 'groups present');
assert(before.groups.some((g) => g.group === 'twilio'), 'twilio group');
assert(before.groups.some((g) => g.group === 'claude'), 'claude group');

const saved = vault.saveSecrets({
  values: {
    ANTHROPIC_API_KEY: 'sk-ant-test-key-1234567890abcdef',
    TWILIO_SID: 'ACtestsid1234567890',
    TWILIO_AUTH_TOKEN: 'twilio-auth-token-secret-value',
    FACEBOOK_PAGE_ID: '999888777',
    FACEBOOK_PAGE_ACCESS_TOKEN: 'EAAGtesttoken123456',
  },
}, 'tester');

assert(saved.ok && saved.changed.length >= 4, 'saved keys');
assert(process.env.ANTHROPIC_API_KEY.indexOf('sk-ant-test') === 0, 'applied anthropic to env');
assert(process.env.TWILIO_SID === 'ACtestsid1234567890', 'applied twilio sid');

const status = vault.getPublicStatus();
assert(status.readiness.claude === true, 'claude ready');
assert(status.readiness.twilio === true, 'twilio ready');
assert(status.readiness.facebook === true, 'facebook ready');

const claudeField = status.groups.find((g) => g.group === 'claude').fields.find((f) => f.key === 'ANTHROPIC_API_KEY');
assert(claudeField.set && claudeField.masked.indexOf('…') !== -1, 'masked secret');
assert(claudeField.masked.indexOf('sk-ant-test-key-1234567890abcdef') === -1, 'full key not exposed');

const custom = vault.saveSecrets({ addCustomKey: 'MY_CUSTOM_API_KEY', values: { MY_CUSTOM_API_KEY: 'custom-secret-999' } }, 'tester');
assert(custom.ok && (custom.status.customFields || []).some((f) => f.key === 'MY_CUSTOM_API_KEY'), 'custom key added');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('\nAll secrets vault tests passed.');
