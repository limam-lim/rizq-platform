#!/usr/bin/env node
/**
 * اختبارات عزل المشتركين — resolveSubscriberProfile / phonesEquivalent
 * تشغيل: npm run test:isolation
 *
 * يعمل في الذاكرة فقط (RIZQ_SUBSCRIBERS_MEMORY_ONLY) حتى لا يلمس SQLite.
 */
'use strict';

process.env.RIZQ_SUBSCRIBERS_MEMORY_ONLY = '1';

const assert = require('assert');

const {
  digitsOnly,
  phonesEquivalent,
  resolveSubscriberProfile,
  registerSubscriber,
  getSubscriberProfile,
  buildSubscriberSystemPrompt,
} = require('../rizq_subscriber_agent');

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ❌ ${name}: ${e.message}`);
  }
}

console.log('\n🔐 اختبار عزل المشتركين (ذاكرة فقط)\n');

check('digitsOnly يزيل الرموز', () => {
  assert.strictEqual(digitsOnly('+222 45-12-34-56'), '22245123456');
  assert.strictEqual(digitsOnly(''), '');
});

check('phonesEquivalent: تطابق كامل وصيغ E.164', () => {
  assert.strictEqual(phonesEquivalent('+22245123456', '22245123456'), true);
  assert.strictEqual(phonesEquivalent('+22245123456', '45123456'), true);
  assert.strictEqual(phonesEquivalent('45123456', '45123457'), false);
  assert.strictEqual(phonesEquivalent('', '222'), false);
  assert.strictEqual(phonesEquivalent('1234567', '1234567'), true);
  assert.strictEqual(phonesEquivalent('1234567', '7654321'), false);
});

const ID_A = '+22236000001';
const ID_B = '+22236000002';
const ID_AMBIG_1 = '+22244440001';
const ID_AMBIG_2 = '+33344440001';

check('register + resolve بالمفتاح الحرفي', () => {
  registerSubscriber(ID_A, {
    businessName: 'منشأة ألف',
    businessType: 'store',
    plan: 'diamond',
    tier: 'diamond',
    phone: ID_A,
  });
  registerSubscriber(ID_B, {
    businessName: 'منشأة باء',
    businessType: 'store',
    plan: 'diamond',
    tier: 'diamond',
    phone: ID_B,
  });
  const a = resolveSubscriberProfile(ID_A);
  const b = resolveSubscriberProfile('22236000002');
  assert.ok(a && a.profile.businessName === 'منشأة ألف');
  assert.ok(b && b.profile.businessName === 'منشأة باء');
  assert.notStrictEqual(a.subscriberId, b.subscriberId);
});

check('لا خلط بين مشتركين مختلفين', () => {
  const a = resolveSubscriberProfile(ID_A);
  const b = resolveSubscriberProfile(ID_B);
  assert.strictEqual(a.profile.businessName, 'منشأة ألف');
  assert.strictEqual(b.profile.businessName, 'منشأة باء');
  assert.ok(!phonesEquivalent(ID_A, ID_B));
});

check('رقم غير معروف → null (مسار المنصة)', () => {
  assert.strictEqual(resolveSubscriberProfile('+22299999999'), null);
  assert.strictEqual(resolveSubscriberProfile(''), null);
  assert.strictEqual(resolveSubscriberProfile(null), null);
});

check('تطابق غامض → null (فشل آمن)', () => {
  registerSubscriber(ID_AMBIG_1, {
    businessName: 'غامض 1',
    businessType: 'store',
    plan: 'diamond',
    phone: ID_AMBIG_1,
  });
  registerSubscriber(ID_AMBIG_2, {
    businessName: 'غامض 2',
    businessType: 'store',
    plan: 'diamond',
    phone: ID_AMBIG_2,
  });
  const ambiguous = resolveSubscriberProfile('44440001');
  assert.strictEqual(ambiguous, null, 'يجب رفض التطابق الغامض');
});

check('getSubscriberProfile حرفي فقط (لا تطبيع)', () => {
  assert.ok(getSubscriberProfile(ID_A));
  assert.strictEqual(getSubscriberProfile('22236000001'), null);
});

check('بناء البرومبت لا يخلط منشآت (عينة ولاء)', () => {
  const prompt = buildSubscriberSystemPrompt(
    { businessName: 'منشأة ألف', businessType: 'store', products: [{ name: 'منتج أ', price: 10 }] },
    'whatsapp'
  );
  assert.ok(prompt.includes('منشأة ألف'));
  assert.ok(/حصرية|الولاء التجاري|لا تشارك معلومات خاصة بمنشآت أخرى/i.test(prompt));
  assert.ok(!prompt.includes('منشأة باء'));
});

console.log('');
if (failed) {
  console.error(`فشل ${failed} اختبار(ات)`);
  process.exit(1);
}
console.log('كل اختبارات العزل نجحت.\n');
process.exit(0);
