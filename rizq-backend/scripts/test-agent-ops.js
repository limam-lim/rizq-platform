/**
 * اختبار مركز تسيير الوكلاء + طبقة الجودة + assertAgentEnabled
 * node rizq-backend/scripts/test-agent-ops.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

delete process.env.ANTHROPIC_API_KEY;
delete process.env.CLAUDE_API_KEY;

const db = require('../db');
const aq = require('../services/agentQuality');
const ops = require('../services/agentOps');
const RizqAgent = require('../../rizq_agent');
const { maybeAutoReplyToInquiry } = require('../services/inquiryAutoReply');
const investmentRoom = require('../services/investmentRoom');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed += 1; console.error('FAIL:', msg); }
  else console.log('OK:', msg);
}

async function main() {
  await db.ready();

  const excellence = aq.buildIntelligenceExcellenceBlock({ mode: 'platform' });
  assert(/INTELLIGENCE EXCELLENCE/.test(excellence), 'excellence block');

  const master = RizqAgent.buildMasterSystemPrompt({ agentTier: 'general' });
  assert(/INTELLIGENCE EXCELLENCE/.test(master), 'master prompt includes excellence');

  const claim = aq.stripForbiddenClaims('عائد مضمون 50% شهرياً', 'ar');
  assert(claim.scrubbed === true, 'scrubs guaranteed return');

  const polish = aq.polishChannelReply('مرحبا **رزق**\n- بند', { channel: 'whatsapp' });
  assert(polish.text.indexOf('**') === -1, 'strips markdown for whatsapp');

  const miss = await aq.recordAgentMiss({ text: 'كم سعر الباقة؟', agent: 'test', type: 'missed', lang: 'ar' });
  assert(!!miss && !!miss.id, 'record miss');
  assert((await aq.listAgentMisses(10)).some((m) => m.id === miss.id), 'list misses');

  const dash = await ops.buildDashboard();
  assert(dash.ok && Array.isArray(dash.families) && dash.families.length >= 6, 'dashboard families');
  assert(dash.settings.widgetEnabled !== false, 'widget enabled default');

  const saved = await ops.saveSettings({
    widgetEnabled: false,
    marketingEnabled: false,
    inquiryAutoReplyEnabled: false,
    investmentEnabled: false,
  }, 'tester');
  assert(saved.widgetEnabled === false && saved.marketingEnabled === false, 'save toggles');
  assert((await ops.isAgentFamilyEnabled('widget')) === false, 'widget disabled');
  assert((await ops.isAgentFamilyEnabled('brain')) === true, 'brain still on');
  assert((await ops.isAgentFamilyEnabled('inquiry')) === false, 'inquiry disabled');
  assert((await ops.isAgentFamilyEnabled('investment')) === false, 'investment disabled');

  const gateInq = await ops.assertAgentEnabled('inquiry');
  assert(gateInq.ok === false && gateInq.code === 'agent_family_disabled', 'assert inquiry disabled');
  const gateInv = await ops.assertAgentEnabled('investment');
  assert(gateInv.ok === false && gateInv.code === 'agent_family_disabled', 'assert investment disabled');

  // Entrypoints must refuse immediately when family disabled
  const inqOut = await maybeAutoReplyToInquiry({
    sellerAccount: {
      id: 'acc_ops_test',
      status: 'approved',
      type: 'store',
      name: 'Test',
      phone: '44112233',
      packageStatus: 'active',
      packageExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
    buyerMessage: { body: 'مرحبا', adId: null },
    threadKey: 't_ops_test',
    readMessagesFn: () => [],
    writeMessagesFn: () => {},
  });
  assert(inqOut == null, 'inquiry entrypoint refuses when disabled');

  let invBlocked = false;
  try {
    await investmentRoom.generatePlan({ title: 'مشروع', description: 'وصف' }, null);
  } catch (e) {
    invBlocked = e && (e.code === 'agent_family_disabled' || e.status === 403);
  }
  assert(invBlocked, 'investment entrypoint refuses when disabled');

  await ops.saveSettings({
    widgetEnabled: true,
    marketingEnabled: true,
    inquiryAutoReplyEnabled: true,
    investmentEnabled: true,
  }, 'tester');

  if (failed) {
    console.error(failed + ' failed');
    process.exitCode = 1;
  } else {
    console.log('\nAll agent ops / quality tests passed.');
  }
  await db.close();
}

main().catch(async (e) => {
  console.error(e);
  try { await db.close(); } catch (_) { /* */ }
  process.exit(1);
});
