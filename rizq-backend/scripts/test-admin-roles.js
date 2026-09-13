'use strict';
const assert = require('assert');
const {
  normalizeRole,
  permissionsFor,
  hasPermission,
  allowedPanels,
  describeRole,
  listRoles,
  ROLES,
} = require('../services/adminRoles');

assert.strictEqual(normalizeRole('تجاري'), 'commercial');
assert.strictEqual(normalizeRole('مالي'), 'finance');
assert.strictEqual(normalizeRole('commerce'), 'commercial');

assert.ok(hasPermission('super', 'team.manage'));
assert.ok(hasPermission('finance', 'payments.read'));
assert.ok(!hasPermission('finance', 'ads.write'));
assert.ok(hasPermission('commercial', 'ads.write'));
assert.ok(!hasPermission('commercial', 'payments.write'));
assert.ok(!hasPermission('commercial', 'team.manage'));
assert.ok(hasPermission('moderator', 'moderation.write'));
assert.ok(!hasPermission('support', 'payments.write'));

const finPanels = allowedPanels('finance');
assert.ok(finPanels.includes('payments'));
assert.ok(!finPanels.includes('ads'));
assert.ok(!finPanels.includes('team'));

const comPanels = allowedPanels('commercial');
assert.ok(comPanels.includes('ads'));
assert.ok(comPanels.includes('prices'));
assert.ok(!comPanels.includes('payments'));

assert.ok(listRoles().length >= 6);
assert.strictEqual(describeRole('finance').labelAr, ROLES.finance.labelAr);

console.log('admin-roles tests: OK (' + Object.keys(ROLES).join(', ') + ')');
