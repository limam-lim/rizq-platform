'use strict';
/**
 * Regression: Rizq ADS video packages isolate from main account,
 * place by entitlement, and reject diamond masquerading.
 */
const assert = require('assert');
const { activateSubRequest, activateVideoAdOnServer } = require('../services/subRequestActivation');
const {
  getMediaEntitlements,
  resolveMediaPlanFromPackageRef,
  STORE_PLANS,
  CORP_PLANS,
} = require('../services/entitlements');

async function run() {
  const diamond = await activateSubRequest({
    id: 't1', status: 'pending', category: 'video',
    pkg: 'الماسية المتقدمة', price: 0, accountId: 'acc_x',
    videoUrl: 'https://example.com/v.mp4',
  }, {
    syncAccountPackage: async () => { throw new Error('should_not_sync'); },
    getAccountRecord: () => null,
    readAccounts: () => [],
    writeAccounts: () => {},
  });
  assert.strictEqual(diamond.ok, false);
  assert.strictEqual(diamond.error, 'invalid_video_package');

  let syncedId = null;
  const basic = await activateSubRequest({
    id: 't2', status: 'pending', category: 'video',
    pkg: 'أساسي فيديو', packageId: 'vid-basic', price: 5000,
    accountId: 'acc_basic', account: 'Basic Adv',
    videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  }, {
    syncAccountPackage: async (opts) => { syncedId = opts.accountId; return { ok: true, accountId: opts.accountId }; },
    getAccountRecord: () => null,
    readAccounts: () => [{ id: 'acc_basic', name: 'Basic', type: 'store' }],
    writeAccounts: () => {},
  });
  assert.strictEqual(basic.ok, true);
  assert.strictEqual(basic.isolated, true);
  assert.strictEqual(syncedId, 'acc_basic::video');
  assert.strictEqual(basic.adResult.slot, 'popup');

  const biz = activateVideoAdOnServer({
    videoUrl: 'https://youtube.com/watch?v=abcdefghijk',
    accountId: 'acc_biz', account: 'Biz',
    pkg: 'أعمال ومعارض', packageId: 'vid-business', price: 25000,
  });
  assert.strictEqual(biz.ok, true);
  assert.strictEqual(biz.slot, 'hero');

  const planBiz = resolveMediaPlanFromPackageRef('أعمال ومعارض', 'vid-business', 25000);
  assert.strictEqual(planBiz.heroPlacement, true);
  assert.strictEqual(planBiz.vipBadge, true);

  const media = getMediaEntitlements('acc_pro', {
    packageId: 'vid-pro', pkgName: 'احترافي فيديو', status: 'active',
    paymentConfirmed: true, periodEnd: new Date(Date.now() + 864e5 * 10).toISOString(),
  });
  assert.strictEqual(media.featuredBadge, true);
  assert.strictEqual(media.prioritySearch, true);
  assert.strictEqual(media.heroPlacement, false);
  assert.strictEqual(media.basicStats, true);

  assert.ok(STORE_PLANS.store_monthly.features.includes('vip_badge'));
  assert.ok(CORP_PLANS.corp_monthly.features.includes('vip_badge'));

  console.log('OK media package activation regression');
}

run().catch((e) => { console.error(e); process.exit(1); });
