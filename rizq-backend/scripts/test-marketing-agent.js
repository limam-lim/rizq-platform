/**
 * اختبار وحدات لمدير التسويق — توليد احتياطي + جودة + تخزين
 * تشغيل: node rizq-backend/scripts/test-marketing-agent.js
 */
'use strict';

process.env.RIZQ_SUBSCRIBERS_MEMORY_ONLY = '1';
// بدون Claude وبدون فيسبوك — المسار الاحتياطي
delete process.env.ANTHROPIC_API_KEY;
delete process.env.CLAUDE_API_KEY;
delete process.env.FACEBOOK_PAGE_ID;
delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const path = require('path');
const marketing = require('../services/marketingAgent');
const cfg = require('../../rizq_marketing_agent_config');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

async function main() {
  assert(cfg.listCampaignTypes().length >= 8, 'campaign types present');
  assert(cfg.CHANNELS.facebook.publishable === true, 'facebook publishable');

  const status = marketing.getPublicStatus();
  assert(status.enabled === true, 'enabled by default');
  assert(status.facebookConfigured === false, 'facebook not configured in test');
  assert(status.claudeConfigured === false, 'claude not configured in test');

  const camp = await marketing.createDraftCampaign({
    campaignType: 'merchant_acquisition',
    channel: 'facebook',
    lang: 'ar',
    brief: 'دعوة المحلات في نواكشوط للتسجيل في رزق',
    link: 'https://rizq.mr/rizq_register.html',
  }, 'test-admin');

  assert(!!camp && !!camp.id, 'draft created');
  assert(camp.status === 'pending_review', 'pending_review status');
  assert(/رزق|rizq/i.test(camp.body), 'brand in body');
  assert(camp.quality && typeof camp.quality.score === 'number', 'quality scored');
  assert(camp.variants && camp.variants.sms, 'sms variant');

  const scored = marketing.scoreCreative(camp.body, { channel: 'facebook' });
  assert(scored.pass === true || scored.score >= 50, 'quality reasonable');

  const edited = marketing.updateDraftBody(camp.id, {
    body: camp.body + '\n\nسجّل الآن على منصة رزق.',
  }, 'test-admin');
  assert(edited.body.indexOf('سجّل الآن') !== -1, 'edit body');

  const approved = marketing.approveCampaign(camp.id, 'test-admin', {});
  assert(approved.status === 'approved', 'approved');

  let publishErr = null;
  try {
    await marketing.publishCampaign(camp.id, 'test-admin', { forceAfterApprove: true });
  } catch (e) {
    publishErr = e;
  }
  assert(publishErr && publishErr.code === 'fb_not_configured', 'publish blocked without FB token');

  const listed = marketing.listCampaigns({ limit: 10 });
  assert(listed.some((c) => c.id === camp.id), 'listed');

  const stats = marketing.getStats();
  assert(stats.total >= 1, 'stats total');

  if (failed) {
    console.error('\n' + failed + ' assertion(s) failed');
    process.exit(1);
  }
  console.log('\nAll marketing agent tests passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
