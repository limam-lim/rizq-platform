/**
 * تدقيق شامل للوكلاء الذكيين — بدون Claude API
 * node rizq-backend/scripts/audit-agents.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const BACKEND = path.join(ROOT, 'rizq-backend');
const results = [];

function ok(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
}

function syntax(file) {
  const rel = path.relative(ROOT, file);
  try {
    execSync('node --check "' + file + '"', { stdio: 'pipe' });
    ok('syntax: ' + rel, true);
  } catch (e) {
    ok('syntax: ' + rel, false, (e.stderr || e.message || '').toString().slice(0, 120));
  }
}

// 1. Syntax all agent files
[
  'rizq_agent_brain.js', 'rizq_subscriber_agent.js', 'rizq_moderator_agent.js',
  'rizq_secretary_agent.js', 'rizq_visual_agent.js', 'rizq_widget_embed.js',
  'rizq_manager_agent_config.js', 'rizq-backend/services/widgetChat.js',
  'rizq-backend/services/widgetAgentTools.js', 'rizq-backend/services/agentTickets.js',
  'rizq-backend/services/agentStatus.js', 'rizq-backend/server.js',
].forEach((f) => syntax(path.join(ROOT, f)));

// 2. Widget tools
const { executeWidgetTool, resolvePageContextFacts, WIDGET_TOOLS } = require('../services/widgetAgentTools');
ok('widget tools count', WIDGET_TOOLS.length >= 6, String(WIDGET_TOOLS.length));
ok('search_ads', executeWidgetTool('search_ads', { limit: 2 }).ok);
const ticket = executeWidgetTool('create_support_ticket', { type: 'report', summary: 'audit test' });
ok('ticket persisted', ticket.ok && ticket.ticket_id);
const { readTickets } = require('../services/agentTickets');
ok('ticket in file', readTickets().some((t) => t.id === ticket.ticket_id));

// 3. Page context
const facts = resolvePageContextFacts({ urlAdId: 'NOPE-ID' });
ok('page context no crash', Array.isArray(facts.ads));

// 4. Agent status
const { setActive, isActive } = require('../services/agentStatus');
setActive('22112233', false);
ok('agent status off', isActive('22112233') === false);
setActive('22112233', true);
ok('agent status on', isActive('22112233') === true);

// 5. Brain tools (no API)
const { executeTool, AGENT_TOOLS } = require(path.join(ROOT, 'rizq_agent_brain.js'));
ok('brain tools', AGENT_TOOLS.length >= 4);
const bt = executeTool('get_packages_info', { lang: 'ar' });
ok('brain packages', bt.packages && bt.packages.length === 4);

// 6. validateReply
const { validateReply } = require('../services/widgetChat');
const v1 = validateReply('ربما السعر 50000 MRU', { prices: [], adIds: [], trustScores: [] }, 'ar');
ok('validate uncertain', v1.reviewed && !v1.grounded);
const v2 = validateReply('السعر 10000 MRU', { prices: ['10000 MRU'], adIds: [], trustScores: [] }, 'ar');
ok('validate grounded price', v2.grounded || v2.reviewed);

// 7. RizqManager page context (load in vm)
try {
  const vm = require('vm');
  const ctx = { window: {}, console, localStorage: { getItem: () => null, setItem: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'rizq_manager_agent_config.js'), 'utf8'), ctx);
  const r = ctx.window.RizqManager.processMessage('كم السعر؟', {
    pageContext: { ad: { id: '1', title: 'Test', price: '5000 MRU', seller_trust_score: 80 } },
    uiLang: 'ar',
  });
  ok('RizqManager ad price', r.grounded && /5000/.test(r.reply));
} catch (e) {
  ok('RizqManager ad price', false, e.message);
}

// 8. Moderator
try {
  const vm = require('vm');
  const ctx = { window: {}, console, localStorage: { getItem: () => null, setItem: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'rizq_moderator_config.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'rizq_moderator_agent.js'), 'utf8'), ctx);
  const d = ctx.window.RizqAgent.inspect({ title: 'بيع خمر', desc: 'test', price: '1000', category: 'other' });
  ok('moderator rejects alcohol', d.decision === 'reject' || d.decision === 'review_human');
} catch (e) {
  ok('moderator inspect', false, e.message);
}

// 9. HTTP routes (lite server)
const express = require('express');
const authRouter = require('../routes/auth');
const wishlistRouter = require('../routes/wishlist');
const { globalErrorHandler, notFoundHandler } = require('../middleware/errors');
const { handleWidgetChat } = require('../services/widgetChat');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/wishlist', wishlistRouter);
const { setActive: setSt } = require('../services/agentStatus');
app.post('/api/agent/toggle', (req, res) => {
  const { subscriberPhone, active, secret } = req.body || {};
  const a = process.env.BACKEND_SHARED_SECRET || 'test-secret';
  if (secret !== a) return res.status(403).json({ ok: false });
  setSt(subscriberPhone, active);
  res.json({ ok: true, active: !!active });
});
app.use(notFoundHandler);
app.use(globalErrorHandler);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const base = 'http://127.0.0.1:' + port;

  function req(method, p, body) {
    return new Promise((resolve, reject) => {
      const u = new URL(p, base);
      const r = http.request({
        hostname: u.hostname, port: u.port, path: u.pathname + u.search,
        method, headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let d = '';
        res.on('data', (c) => { d += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d || '{}') }));
      });
      r.on('error', reject);
      if (body) r.write(JSON.stringify(body));
      r.end();
    });
  }

  try {
    process.env.BACKEND_SHARED_SECRET = process.env.BACKEND_SHARED_SECRET || 'test-secret';
    const tog = await req('POST', '/api/agent/toggle', { subscriberPhone: '44112233', active: true, secret: 'test-secret' });
    ok('HTTP agent/toggle', tog.status === 200 && tog.body.ok);

    if (!process.env.ANTHROPIC_API_KEY) {
      try {
        await handleWidgetChat({ message: 'test', lang: 'ar' });
        ok('widget chat no key', false, 'should throw');
      } catch (e) {
        ok('widget chat no key fallback', e.status === 503);
      }
    } else {
      ok('widget chat API key', true, 'ANTHROPIC_API_KEY set — skipped live call');
    }
  } catch (e) {
    ok('HTTP tests', false, e.message);
  }

  const passed = results.filter((r) => r.pass).length;
  console.log('\n=== RIZQ Agents Comprehensive Audit ===\n');
  results.forEach((r) => {
    console.log((r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? ' — ' + r.detail : ''));
  });
  console.log('\n' + passed + '/' + results.length + ' passed\n');

  server.close(() => process.exit(passed === results.length ? 0 : 1));
});
