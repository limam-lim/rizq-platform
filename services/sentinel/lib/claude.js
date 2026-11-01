/**
 * تحليل ذكي عبر Claude — ميزانية توكن يومية — بيانات مجمّعة فقط بلا وصول مباشر للقاعدة.
 */
'use strict';

const { cfg } = require('./config');
const store = require('./store');

let usedTokensToday = 0;
let budgetDay = '';

function refreshBudgetDay() {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== budgetDay) {
    budgetDay = day;
    usedTokensToday = 0;
  }
}

function remainingBudget() {
  refreshBudgetDay();
  const c = cfg();
  return Math.max(0, c.dailyTokenBudget - usedTokensToday);
}

function recordUsage(usage) {
  refreshBudgetDay();
  const n = Number((usage && (usage.input_tokens + usage.output_tokens)) || 0);
  usedTokensToday += n;
}

async function askFromAggregates(question, aggregates) {
  const c = cfg();
  refreshBudgetDay();
  if (!c.anthropicKey) {
    return {
      ok: false,
      reason: 'no_anthropic_key',
      text: formatNumericOnly(aggregates),
    };
  }
  if (remainingBudget() <= 0) {
    return {
      ok: false,
      reason: 'budget_exhausted',
      text: 'نفدت ميزانية التوكن اليومية.\n\n' + formatNumericOnly(aggregates),
    };
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: c.anthropicKey });
  const sys =
    'أنت الحارس (Sentinel) لمنصة رزق. تجيب بالعربية الفصحى المبسّطة بوضوح وصراحة. '
    + 'تعتمد فقط على بيانات JSON المجمّعة المرفقة. لا تخترع أرقاماً. لا تطلب بيانات شخصية. '
    + 'لا تقترح تعديل كود أو موافقة دفع/إعلان أو نشراً.';
  const user =
    'سؤال المالك:\n' + String(question || '').slice(0, 2000)
    + '\n\nبيانات مجمّعة (JSON):\n' + JSON.stringify(aggregates || {}).slice(0, 12000);

  const msg = await client.messages.create({
    model: process.env.SENTINEL_CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    system: sys,
    messages: [{ role: 'user', content: user }],
  });
  recordUsage(msg.usage);
  const text = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return { ok: true, text, usage: msg.usage, remaining: remainingBudget() };
}

async function dailySmartSuggestions(aggregates) {
  const c = cfg();
  refreshBudgetDay();
  if (!c.anthropicKey) {
    await store.insertReport({
      reportType: 'daily_numeric',
      title: 'تقرير رقمي (بلا Claude)',
      body: formatNumericOnly(aggregates),
      metrics: aggregates || {},
    });
    return { ok: false, reason: 'no_anthropic_key' };
  }
  if (remainingBudget() <= 0) {
    await store.insertReport({
      reportType: 'daily_numeric',
      title: 'تقرير رقمي (نفدت الميزانية)',
      body: formatNumericOnly(aggregates),
      metrics: aggregates || {},
    });
    return { ok: false, reason: 'budget_exhausted' };
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: c.anthropicKey });
  const sys =
    'أنت مستشار تشغيلي لمنصة رزق. اكتب بالعربية 3 إلى 5 اقتراحات مرتبة حسب الأثر (1 الأعلى). '
    + 'كن صريحاً ومختصراً. لا بيانات شخصية. كل اقتراح: عنوان ثم فقرة قصيرة. '
    + 'الخرج JSON مصفوفة: [{"impactRank":1,"title":"...","body":"...","category":"ops|knowledge|tone"}]';
  const user = 'ملخص أرقام اليوم:\n' + JSON.stringify(aggregates || {}).slice(0, 14000);

  const msg = await client.messages.create({
    model: process.env.SENTINEL_CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: 1600,
    system: sys,
    messages: [{ role: 'user', content: user }],
  });
  recordUsage(msg.usage);
  const raw = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  let items = [];
  try {
    const m = raw.match(/\[[\s\S]*\]/);
    items = JSON.parse(m ? m[0] : raw);
  } catch (_) {
    items = [{ impactRank: 2, title: 'مراجعة يدوية', body: raw.slice(0, 1500), category: 'ops' }];
  }
  if (!Array.isArray(items)) items = [];
  const ids = [];
  for (const it of items.slice(0, 5)) {
    const id = await store.insertSuggestion({
      category: it.category || 'ops',
      title: String(it.title || 'اقتراح').slice(0, 200),
      body: String(it.body || '').slice(0, 4000),
      impactRank: Number(it.impactRank) || 3,
      source: 'claude',
      meta: { usage: msg.usage },
    });
    ids.push(id);
  }
  await store.insertReport({
    reportType: 'daily_smart',
    title: 'تحليل يومي ذكي',
    body: raw.slice(0, 8000),
    metrics: Object.assign({}, aggregates || {}, { suggestionIds: ids, usage: msg.usage }),
  });
  return { ok: true, ids, remaining: remainingBudget() };
}

function formatNumericOnly(agg) {
  const a = agg || {};
  const lines = [
    '📊 تقرير رقمي (بدون تحليل ذكي)',
    'الزوار: ' + (a.visitorsToday == null ? '—' : a.visitorsToday),
    'تسجيلات: ' + JSON.stringify(a.registrationsByType || {}),
    'حسابات معلّقة: ' + (a.pendingAccounts == null ? '—' : a.pendingAccounts),
    'مدفوعات معلّقة: ' + (a.pendingPayments == null ? '—' : a.pendingPayments),
    'إعلانات معلّقة: ' + (a.pendingAds == null ? '—' : a.pendingAds),
    'كتالوج معلّق: ' + (a.pendingCatalog == null ? '—' : a.pendingCatalog),
    'بلاغات: ' + (a.reportsOpen == null ? '—' : a.reportsOpen),
    'ويدجت اليوم: ' + (a.widgetMessagesToday == null ? '—' : a.widgetMessagesToday),
    'عملاء محتملون: ' + (a.leadsToday == null ? '—' : a.leadsToday),
  ];
  if (a.health) {
    lines.push('صحة: قرص=' + a.health.diskPct + '% SSL=' + a.health.sslDays + ' نسخة=' + a.health.backupAgeHours);
  }
  return lines.join('\n');
}

module.exports = {
  askFromAggregates,
  dailySmartSuggestions,
  formatNumericOnly,
  remainingBudget,
  recordUsage,
};
