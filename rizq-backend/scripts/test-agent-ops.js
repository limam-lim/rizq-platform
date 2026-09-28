/**
 * اختبار مركز تسيير الوكلاء + طبقة الجودة
 * node rizq-backend/scripts/test-agent-ops.js
 */
'use strict';

delete process.env.ANTHROPIC_API_KEY;
delete process.env.CLAUDE_API_KEY;

const aq = require('../services/agentQuality');
const ops = require('../services/agentOps');
const RizqAgent = require('../../rizq_agent');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed += 1; console.error('FAIL:', msg); }
  else console.log('OK:', msg);
}

const excellence = aq.buildIntelligenceExcellenceBlock({ mode: 'platform' });
assert(/INTELLIGENCE EXCELLENCE/.test(excellence), 'excellence block');

const master = RizqAgent.buildMasterSystemPrompt({ agentTier: 'general' });
assert(/INTELLIGENCE EXCELLENCE/.test(master), 'master prompt includes excellence');

const claim = aq.stripForbiddenClaims('عائد مضمون 50% شهرياً', 'ar');
assert(claim.scrubbed === true, 'scrubs guaranteed return');

const polish = aq.polishChannelReply('مرحبا **رزق**\n- بند', { channel: 'whatsapp' });
assert(polish.text.indexOf('**') === -1, 'strips markdown for whatsapp');

const miss = aq.recordAgentMiss({ text: 'كم سعر الباقة؟', agent: 'test', type: 'missed', lang: 'ar' });
assert(!!miss && !!miss.id, 'record miss');
assert(aq.listAgentMisses(10).some((m) => m.id === miss.id), 'list misses');

const dash = ops.buildDashboard();
assert(dash.ok && Array.isArray(dash.families) && dash.families.length >= 6, 'dashboard families');
assert(dash.settings.widgetEnabled !== false, 'widget enabled default');

const saved = ops.saveSettings({ widgetEnabled: false, marketingEnabled: false }, 'tester');
assert(saved.widgetEnabled === false && saved.marketingEnabled === false, 'save toggles');
assert(ops.isAgentFamilyEnabled('widget') === false, 'widget disabled');
assert(ops.isAgentFamilyEnabled('brain') === true, 'brain still on');

ops.saveSettings({ widgetEnabled: true, marketingEnabled: true }, 'tester');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('\nAll agent ops / quality tests passed.');
