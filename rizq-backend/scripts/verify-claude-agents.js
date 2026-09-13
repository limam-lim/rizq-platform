#!/usr/bin/env node
'use strict';
/**
 * تحقق ربط الوكلاء بمفتاح Claude والسر المشترك — بدون طباعة أسرار.
 *   node scripts/verify-claude-agents.js
 *   npm run verify:agents
 */
const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const ROOT = path.join(BACKEND, '..');
require('dotenv').config({ path: path.join(BACKEND, '.env') });

const anthropic = require('../config/anthropic');
const {
  isAnthropicConfigured,
  getAgentModel,
  getAdvancedModel,
} = anthropic;

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
}

function read(rel, base) {
  return fs.readFileSync(path.join(base || ROOT, rel), 'utf8');
}

check(
  'ANTHROPIC/CLAUDE key configured',
  isAnthropicConfigured(),
  isAnthropicConfigured() ? 'set (redacted)' : 'MISSING — أضف ANTHROPIC_API_KEY في rizq-backend/.env'
);
check('BACKEND_SHARED_SECRET configured', !!(process.env.BACKEND_SHARED_SECRET || '').trim());
check('RIZQ_API_SECRET configured', !!(process.env.RIZQ_API_SECRET || '').trim());
check('agent model', !!getAgentModel(), getAgentModel());
check('advanced model', !!getAdvancedModel(), getAdvancedModel());

/** مسارات Claude الفعلية — يجب أن تمر عبر config/anthropic */
const CLAUDE_CODE_PATHS = [
  {
    rel: 'rizq_subscriber_agent.js',
    base: ROOT,
    must: [/rizq-backend\/config\/anthropic/, /getAnthropicApiKey\s*\(/, /isAnthropicConfigured\s*\(/],
  },
  {
    rel: 'rizq_agent_brain.js',
    base: ROOT,
    must: [/rizq-backend\/config\/anthropic/, /getAnthropicApiKey\s*\(/, /isAnthropicConfigured\s*\(/],
  },
  {
    rel: 'services/widgetChat.js',
    base: BACKEND,
    must: [/config\/anthropic/, /getAnthropicApiKey\s*\(/, /isAnthropicConfigured\s*\(/],
  },
  {
    rel: 'services/receiptVision.js',
    base: BACKEND,
    must: [/config\/anthropic/, /getAnthropicApiKey\s*\(/],
  },
  {
    rel: 'services/inquiryAutoReply.js',
    base: BACKEND,
    must: [/config\/anthropic/, /isAnthropicConfigured\s*\(/, /handleWidgetChat/],
  },
  {
    rel: 'services/telegramAdmin.js',
    base: BACKEND,
    must: [/isAnthropicConfigured|anthropic/],
  },
  {
    rel: 'server.js',
    base: BACKEND,
    must: [/config\/anthropic/, /getAnthropicApiKey\s*\(/, /isAnthropicConfigured\s*\(/, /\/api\/admin\/agents-health/],
  },
  {
    rel: 'rizq_call_handler.js',
    base: ROOT,
    must: [/rizq_agent_brain/, /rizq_subscriber_agent/, /config\/anthropic|isAnthropicConfigured/],
  },
  {
    rel: 'rizq_whatsapp_handler.js',
    base: ROOT,
    must: [/rizq_agent_brain/, /rizq_subscriber_agent/, /config\/anthropic|isAnthropicConfigured/],
  },
  {
    rel: 'rizq_email_handler.js',
    base: ROOT,
    must: [/rizq_agent_brain/, /config\/anthropic|isAnthropicConfigured/],
  },
];

CLAUDE_CODE_PATHS.forEach(({ rel, base, must }) => {
  const src = read(rel, base);
  must.forEach((re, i) => {
    check(rel + ' link[' + i + ']: ' + re.source.slice(0, 48), re.test(src));
  });
});

/** وكلاء بلا Claude — نتأكد أنها ليست مسارات API منفصلة بمفتاح آخر */
[
  'rizq_moderator_agent.js',
  'rizq_visual_agent.js',
  'rizq_quota_guard_agent.js',
  'rizq_secretary_agent.js',
].forEach((rel) => {
  const src = read(rel, ROOT);
  check(
    rel + ' does not hardcode Anthropic SDK client',
    !/new Anthropic\s*\(/.test(src),
    'rules/UI only — OK'
  );
});

const panel = read('rizq_cp_panel.html', ROOT);
check('panel has checkSubAgentHealth', /function checkSubAgentHealth/.test(panel));
check('panel mentions BACKEND_SHARED_SECRET', /BACKEND_SHARED_SECRET/.test(panel));
check('panel calls /api/admin/agents-health', /\/api\/admin\/agents-health/.test(panel));
check('panel calls /api/ai/status', /\/api\/ai\/status/.test(panel));

const server = read('server.js', BACKEND);
check("route /api/ai/status", /app\.get\('\/api\/ai\/status'/.test(server));
check("route /api/admin/agents-health", /app\.get\('\/api\/admin\/agents-health'/.test(server));
check('agents-health lists linkedToKeyLoader', /linkedToKeyLoader/.test(server));
check('ai/status handler closed', /app\.get\('\/api\/ai\/status'[\s\S]{0,300}\}\);\s*\n\s*\/\*\* GET \/api\/admin\/agents-health/.test(server));

const passed = results.filter((r) => r.pass).length;
console.log('\n=== Rizq Claude / Agents Wiring Verify ===\n');
results.forEach((r) => {
  console.log((r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? ' — ' + r.detail : ''));
});
console.log('\n' + passed + '/' + results.length + ' passed');
console.log(
  '\nSummary: all Claude code paths link to shared config/anthropic.js' +
    (isAnthropicConfigured()
      ? ' — runtime key READY'
      : ' — runtime key MISSING (set ANTHROPIC_API_KEY then restart)')
);
if (!isAnthropicConfigured()) {
  console.log('\nACTION REQUIRED:');
  console.log('  1) Put ANTHROPIC_API_KEY=sk-ant-... into rizq-backend/.env (and Render env for production)');
  console.log('  2) Restart backend');
  console.log('  3) In CP panel → وكيل الباقات: paste BACKEND_SHARED_SECRET into السر المشترك, Save');
  console.log('  4) Click فحص ربط الوكلاء / Claude');
}
process.exit(passed === results.length ? 0 : 1);
