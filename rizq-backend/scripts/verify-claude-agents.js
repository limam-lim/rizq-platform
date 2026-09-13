#!/usr/bin/env node
'use strict';
/**
 * تحقق ربط الوكلاء بمفتاح Claude والسر المشترك — بدون طباعة أسرار.
 *   node scripts/verify-claude-agents.js
 */
const fs = require('fs');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const ROOT = path.join(BACKEND, '..');
require('dotenv').config({ path: path.join(BACKEND, '.env') });

const anthropic = require('../config/anthropic');
const {
  isAnthropicConfigured,
  getAnthropicApiKey,
  getAgentModel,
  getAdvancedModel,
} = anthropic;

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
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

[
  'rizq_subscriber_agent.js',
  'rizq_agent_brain.js',
].forEach((rel) => {
  const full = path.join(ROOT, rel);
  const src = fs.readFileSync(full, 'utf8');
  check(rel + ' imports anthropic config', /rizq-backend\/config\/anthropic/.test(src));
  check(rel + ' uses getAnthropicApiKey()', /getAnthropicApiKey\s*\(/.test(src));
  check(rel + ' checks isAnthropicConfigured()', /isAnthropicConfigured\s*\(/.test(src));
});

[
  'services/widgetChat.js',
  'services/receiptVision.js',
  'services/telegramAdmin.js',
  'server.js',
].forEach((rel) => {
  const full = path.join(BACKEND, rel);
  const src = fs.readFileSync(full, 'utf8');
  check(
    rel + ' wires Claude via anthropic config',
    /config\/anthropic|getAnthropicApiKey|isAnthropicConfigured|getAnthropicApiKey/.test(src)
  );
});

const panel = fs.readFileSync(path.join(ROOT, 'rizq_cp_panel.html'), 'utf8');
check('panel has checkSubAgentHealth', /function checkSubAgentHealth/.test(panel));
check('panel mentions BACKEND_SHARED_SECRET', /BACKEND_SHARED_SECRET/.test(panel));
check('panel calls /api/admin/agents-health', /\/api\/admin\/agents-health/.test(panel));
check('panel calls /api/ai/status', /\/api\/ai\/status/.test(panel));

const server = fs.readFileSync(path.join(BACKEND, 'server.js'), 'utf8');
check("route /api/ai/status", /app\.get\('\/api\/ai\/status'/.test(server));
check("route /api/admin/agents-health", /app\.get\('\/api\/admin\/agents-health'/.test(server));
check('ai/status handler closed', /app\.get\('\/api\/ai\/status'[\s\S]{0,300}\}\);\s*\n\s*\/\*\* GET \/api\/admin\/agents-health/.test(server));

const passed = results.filter((r) => r.pass).length;
console.log('\n=== Rizq Claude / Agents Wiring Verify ===\n');
results.forEach((r) => {
  console.log((r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? ' — ' + r.detail : ''));
});
console.log('\n' + passed + '/' + results.length + ' passed');
if (!isAnthropicConfigured()) {
  console.log('\nACTION REQUIRED:');
  console.log('  1) Put ANTHROPIC_API_KEY=sk-ant-... into rizq-backend/.env');
  console.log('  2) Restart backend');
  console.log('  3) In CP panel → وكيل الباقات: paste BACKEND_SHARED_SECRET into السر المشترك, Save');
  console.log('  4) Click فحص ربط الوكلاء / Claude');
}
process.exit(passed === results.length ? 0 : 1);
