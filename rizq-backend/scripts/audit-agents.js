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
  'rizq_packages_config.js',
  'rizq_agent_brain.js', 'rizq_subscriber_agent.js', 'rizq_moderator_agent.js',
  'rizq_secretary_agent.js', 'rizq_visual_agent.js', 'rizq_widget_embed.js',
  'rizq_manager_agent_config.js', 'rizq-backend/services/widgetChat.js',
  'rizq-backend/config/anthropic.js', 'rizq_quota_guard_agent.js',
  'rizq-backend/services/widgetAgentTools.js', 'rizq-backend/services/agentTickets.js',
  'rizq-backend/services/agentStatus.js', 'rizq-backend/server.js',
].forEach((f) => syntax(path.join(ROOT, f)));

// 2. Widget tools (sync path — async executeWidgetTool is covered in listen())
const { executeWidgetTool, executeWidgetToolSync, resolvePageContextFacts, WIDGET_TOOLS } = require('../services/widgetAgentTools');
ok('widget tools count', WIDGET_TOOLS.length >= 6, String(WIDGET_TOOLS.length));
const { readTickets } = require('../services/agentTickets');
const { setActive, isActive } = require('../services/agentStatus');
// المستودع async — هذه الفحوص تُنتظر داخل listen() قبل كتابة النتيجة
const earlyChecks = (async () => {
  ok('search_ads', (await executeWidgetToolSync('search_ads', { limit: 2 })).ok);
  const ticket = await executeWidgetToolSync('create_support_ticket', { type: 'report', summary: 'audit test' });
  ok('ticket persisted', ticket.ok && ticket.ticket_id);
  ok('ticket in file', (await readTickets()).some((t) => t.id === ticket.ticket_id));

  // 3. Page context
  const facts = await resolvePageContextFacts({ urlAdId: 'NOPE-ID' });
  ok('page context no crash', Array.isArray(facts.ads));

  // 4. Agent status
  await setActive('22112233', false);
  ok('agent status off', (await isActive('22112233')) === false);
  await setActive('22112233', true);
  ok('agent status on', (await isActive('22112233')) === true);
})().catch((e) => ok('early agent checks', false, e.message));

// 5. Brain tools (no API) — executeTool is async; package check runs in listen() below
const { executeTool, AGENT_TOOLS } = require(path.join(ROOT, 'rizq_agent_brain.js'));
ok('brain tools', AGENT_TOOLS.length >= 4);
const { getPackagesForTool } = require(path.join(ROOT, 'rizq_packages_config.js'));
// Price parity check is async (executeWidgetTool) — completed inside listen() below.

// 6. validateReply
const { validateReply } = require('../services/widgetChat');
const v1 = validateReply('ربما السعر 50000 MRU', { prices: [], adIds: [], trustScores: [] }, 'ar');
ok('validate uncertain', v1.reviewed && !v1.grounded);
const v2 = validateReply('السعر 10000 MRU', { prices: ['10000 MRU'], adIds: [], trustScores: [] }, 'ar');
ok('validate grounded price', v2.grounded || v2.reviewed);

// 7. RizqManager page context (load in vm)
try {
  const vm = require('vm');
  const Pkg = require(path.join(ROOT, 'rizq_packages_config.js'));
  const ctx = {
    window: { RizqPackagesConfig: Pkg },
    globalThis: { RizqPackagesConfig: Pkg },
    console,
    localStorage: { getItem: () => null, setItem: () => {} },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'rizq_manager_agent_config.js'), 'utf8'), ctx);
  const r = ctx.window.RizqManager.processMessage('كم السعر؟', {
    pageContext: { ad: { id: '1', title: 'Test', price: '5000 MRU', seller_trust_score: 80 } },
    uiLang: 'ar',
  });
  ok('RizqManager ad price', r.grounded && /5000/.test(r.reply));
  const pkgReply = ctx.window.RizqManager.processMessage('ما هي الباقات؟', { uiLang: 'ar' });
  ok('RizqManager packages canonical', /1500/.test(pkgReply.reply) && /5000/.test(pkgReply.reply) && !/8000/.test(pkgReply.reply) && !/فضية/.test(pkgReply.reply));
  var pkg = Pkg.getPublicPackages().find(function (p) {
    return p && (p.id === 'diamond_standard' || p.id === 'diamond' || p.diamond || p.isDiamond);
  });
  ok('diamond marketing name', pkg && /ماس|💎|نائب|Diamant|diamond/i.test(pkg.name || ''));
  ok('diamond marketing no tech jargon', pkg && pkg.features && !/Haiku|Sonnet|Claude|\bAI\b/i.test(pkg.features.join(' ')));
  ok('diamond featured badge', pkg && String(pkg.featuredBadge || '').length > 0);
  ok('diamond ROI copy', pkg && /5,000|5000/.test(pkg.roi || ''));
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

// 8b. Dynamic model + prompt cache + Sonnet→Haiku fallback
try {
  const {
    isDiamondProfile,
    resolveChatModel,
    applyPromptCache,
    createCachedMessage,
    getFastModel,
    getAdvancedModel,
  } = require('../config/anthropic');
  const { AGENT_TOOLS } = require('../../rizq_agent_brain');
  const { WIDGET_TOOLS } = require('../services/widgetAgentTools');

  ok('diamond plan=diamond', isDiamondProfile({ plan: 'diamond' }));
  ok('diamond plan=ماسي', isDiamondProfile({ plan: 'ماسي' }));
  ok('diamond store_diamond', isDiamondProfile({ plan: 'store_diamond' }));
  ok('non-diamond basic', !isDiamondProfile({ plan: 'basic' }));
  ok('resolve diamond → advanced', resolveChatModel({ plan: 'diamond' }) === getAdvancedModel());
  // سياسة حالية: كل مسارات الوكيل على Sonnet (getAgentModel) — لا Haiku للويدجت/الوكلاء
  ok('resolve public → agent/sonnet', resolveChatModel({}) === getAdvancedModel());

  const origLast = JSON.stringify(WIDGET_TOOLS[WIDGET_TOOLS.length - 1]);
  const cached = applyPromptCache({
    model: getFastModel(),
    system: 'sys',
    tools: WIDGET_TOOLS,
  });
  ok('cache system ephemeral', cached.system[0].cache_control && cached.system[0].cache_control.type === 'ephemeral');
  ok('cache last tool ephemeral', cached.tools[cached.tools.length - 1].cache_control.type === 'ephemeral');
  ok('cache does not mutate WIDGET_TOOLS', JSON.stringify(WIDGET_TOOLS[WIDGET_TOOLS.length - 1]) === origLast);
  ok('cache does not mutate AGENT_TOOLS', !AGENT_TOOLS[AGENT_TOOLS.length - 1].cache_control);
} catch (e) {
  ok('model cache fallback helpers', false, e.message);
}

const os = require('os');
const quotaTmp = path.join(os.tmpdir(), 'rizq-quota-audit-' + Date.now() + '.json');
process.env.RIZQ_QUOTA_STORE = quotaTmp;
process.env.RIZQ_QUOTA_MSG_LIMIT = '10';
process.env.RIZQ_QUOTA_MIN_LIMIT = '100';
process.env.RIZQ_QUOTA_TOKEN_LIMIT = '1000000';
process.env.RIZQ_QUOTA_COST_USD_LIMIT = '100';

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
app.post('/api/agent/toggle', async (req, res) => {
  const { subscriberPhone, active, secret } = req.body || {};
  const a = process.env.BACKEND_SHARED_SECRET || 'test-secret';
  if (secret !== a) return res.status(403).json({ ok: false });
  await setSt(subscriberPhone, active);
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
    await earlyChecks;
    // Brain/widget get_packages_info are async and now source live_catalog
    const bt = await executeTool('get_packages_info', { lang: 'ar', catalog: 'store' });
    ok(
      'brain packages source',
      (bt.source === 'live_catalog' || bt.source === 'rizq_packages_config')
        && Array.isArray(bt.packages) && bt.packages.length >= 4,
      bt && bt.source ? String(bt.source) + ' n=' + (bt.packages && bt.packages.length) : 'empty'
    );
    ok(
      'brain packages no old silver/gold',
      Array.isArray(bt.packages) && !bt.packages.some((p) => /فضي|ذهبي|Argent|Silver|Gold/i.test(p.name || ''))
    );
    const storeCanonical = getPackagesForTool('ar', 'store');
    const widgetPkgs = await executeWidgetTool('get_packages_info', { lang: 'ar', catalog: 'store' });
    ok(
      'widget tools match canonical prices',
      Array.isArray(widgetPkgs.packages)
        && widgetPkgs.packages.map((p) => p.price).join(',') === storeCanonical.map((p) => p.price).join(',')
    );

    // استخدم نفس السرّ الفعّال في البيئة (قد يكون من .env) وليس قيمة ثابتة
    const toggleSecret = process.env.BACKEND_SHARED_SECRET || 'test-secret';
    process.env.BACKEND_SHARED_SECRET = toggleSecret;
    const tog = await req('POST', '/api/agent/toggle', {
      subscriberPhone: '44112233',
      active: true,
      secret: toggleSecret,
    });
    ok('HTTP agent/toggle', tog.status === 200 && tog.body.ok, 'status=' + tog.status);

    const Quota = require('../../rizq_quota_guard_agent');
    // Limits come from catalog (default 2000 msgs) — drive % via large message batches
    const snap80 = await Quota.recordUsage({
      subscriberId: '+22244110001',
      accountId: 'ACC-Q1',
      businessName: 'مكتب اختبار',
      messages: 1600,
      usage: { input_tokens: 100, output_tokens: 50 },
      model: 'claude-sonnet-4-5-20251001',
    });
    ok('quota warn 80%', snap80.pct >= 80 && snap80.pct < 100 && snap80.alertLevel === 80 && Quota.shouldForceFast() === false);
    let snap100;
    try {
      snap100 = await Quota.recordUsage({
        subscriberId: '+22244110001',
        accountId: 'ACC-Q1',
        messages: 500,
        usage: { input_tokens: 10, output_tokens: 5 },
        model: 'claude-sonnet-4-5-20251001',
      });
    } catch (eQuota) {
      // At 100% assertQuotaAvailable may block further writes — treat as capped
      snap100 = await Quota.getSnapshot('+22244110001', 'ACC-Q1');
      snap100._blockedWrite = eQuota && eQuota.code === 'quota_exhausted';
    }
    ok(
      'quota cap 100% blocks (no Haiku downgrade)',
      snap100.pct >= 100
        && Quota.shouldForceFast() === false
        && (snap100.textBlocked || snap100.quotaBlocked || snap100._blockedWrite || snap100.alertLevel === 100)
    );
    const reqTopup = await Quota.requestTopup({ subscriberId: '+22244110001', accountId: 'ACC-Q1', businessName: 'مكتب اختبار', type: 'text' });
    ok('quota topup request', reqTopup.ok && reqTopup.request && reqTopup.request.status === 'pending');
    const approved = await Quota.resolveTopup(reqTopup.request.id, 'approved');
    ok(
      'quota topup approved restores headroom',
      approved.ok
        && (approved.snapshot.topupMessages > 0 || !approved.snapshot.textBlocked)
        && Quota.shouldForceFast() === false
    );
    const admin = await Quota.listAdminUsage([{ subscriberId: '+22244110001', accountId: 'ACC-Q1', businessName: 'مكتب اختبار' }]);
    ok('quota admin tracker', admin.count >= 1 && typeof admin.totalCostUsd === 'number');
    try { fs.unlinkSync(quotaTmp); } catch (e) {}

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

    const { createCachedMessage, getFastModel, getAdvancedModel } = require('../config/anthropic');
    let calls = 0;
    const mockClient = {
      messages: {
        create: async (params) => {
          calls++;
          if (calls === 1) {
            if (params.model !== getAdvancedModel()) throw new Error('expected advanced on first call');
            throw new Error('sonnet unavailable');
          }
          if (params.model !== getFastModel()) throw new Error('expected fast on retry');
          return { content: [{ type: 'text', text: 'ok' }], usage: {} };
        },
      },
    };
    const out = await createCachedMessage(mockClient, {
      model: getAdvancedModel(),
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
    }, { fallbackToFast: true });
    ok('sonnet→haiku fallback', out.fallback === true && out.model === getFastModel() && calls === 2);
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
