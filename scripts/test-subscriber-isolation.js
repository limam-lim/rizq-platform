#!/usr/bin/env node
/**
 * اختبارات عزل المشتركين — resolveSubscriberProfile / phonesEquivalent
 * تشغيل: npm run test:isolation
 *
 * يعمل في الذاكرة فقط (RIZQ_SUBSCRIBERS_MEMORY_ONLY) حتى لا يلمس PostgreSQL.
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
async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ❌ ${name}: ${e.message}`);
  }
}

async function main() {
  console.log('\n🔐 اختبار عزل المشتركين (ذاكرة فقط)\n');

  await check('digitsOnly يزيل الرموز', () => {
    assert.strictEqual(digitsOnly('+222 45-12-34-56'), '22245123456');
    assert.strictEqual(digitsOnly(''), '');
  });

  await check('phonesEquivalent: تطابق كامل وصيغ E.164', () => {
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

  await check('register + resolve بالمفتاح الحرفي', async () => {
    await registerSubscriber(ID_A, {
      businessName: 'منشأة ألف',
      businessType: 'store',
      plan: 'diamond',
      tier: 'diamond',
      phone: ID_A,
    });
    await registerSubscriber(ID_B, {
      businessName: 'منشأة باء',
      businessType: 'store',
      plan: 'diamond',
      tier: 'diamond',
      phone: ID_B,
    });
    const a = await resolveSubscriberProfile(ID_A);
    const b = await resolveSubscriberProfile('22236000002');
    assert.ok(a && a.profile.businessName === 'منشأة ألف');
    assert.ok(b && b.profile.businessName === 'منشأة باء');
    assert.notStrictEqual(a.subscriberId, b.subscriberId);
  });

  await check('لا خلط بين مشتركين مختلفين', async () => {
    const a = await resolveSubscriberProfile(ID_A);
    const b = await resolveSubscriberProfile(ID_B);
    assert.strictEqual(a.profile.businessName, 'منشأة ألف');
    assert.strictEqual(b.profile.businessName, 'منشأة باء');
    assert.ok(!phonesEquivalent(ID_A, ID_B));
  });

  await check('رقم غير معروف → null (مسار المنصة)', async () => {
    assert.strictEqual(await resolveSubscriberProfile('+22299999999'), null);
    assert.strictEqual(await resolveSubscriberProfile(''), null);
    assert.strictEqual(await resolveSubscriberProfile(null), null);
  });

  await check('تطابق غامض → null (فشل آمن)', async () => {
    await registerSubscriber(ID_AMBIG_1, {
      businessName: 'غامض 1',
      businessType: 'store',
      plan: 'diamond',
      phone: ID_AMBIG_1,
    });
    await registerSubscriber(ID_AMBIG_2, {
      businessName: 'غامض 2',
      businessType: 'store',
      plan: 'diamond',
      phone: ID_AMBIG_2,
    });
    const ambiguous = await resolveSubscriberProfile('44440001');
    assert.strictEqual(ambiguous, null, 'يجب رفض التطابق الغامض');
  });

  await check('getSubscriberProfile حرفي فقط (لا تطبيع)', async () => {
    assert.ok(await getSubscriberProfile(ID_A));
    assert.strictEqual(await getSubscriberProfile('22236000001'), null);
  });

  await check('بناء البرومبت لا يخلط منشآت (عينة ولاء)', () => {
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
