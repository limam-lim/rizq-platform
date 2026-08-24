/**
 * مصدر موحّد لمفتاح Claude API وموديلَي رزق
 *
 *   RIZQ_FAST_MODEL=claude-haiku-4-5-20251001      ويدجت عام / عقل القنوات / باقات غير ماسية
 *   RIZQ_ADVANCED_MODEL=claude-sonnet-4-5-20250929  سكرتير الباقة الماسية + ترجمة / وصول
 *
 * التوافق الخلفي: RIZQ_WIDGET_MODEL و RIZQ_AGENT_MODEL ما زالا يُقرآن كبديل لـ FAST.
 */
const DEFAULT_FAST = 'claude-haiku-4-5-20251001';
const DEFAULT_ADVANCED = 'claude-sonnet-4-5-20250929';

function ensureAnthropicEnv() {
  if (!process.env.ANTHROPIC_API_KEY && process.env.CLAUDE_API_KEY) {
    process.env.ANTHROPIC_API_KEY = process.env.CLAUDE_API_KEY;
  }
}

function getAnthropicApiKey() {
  ensureAnthropicEnv();
  return String(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();
}

function isAnthropicConfigured() {
  return getAnthropicApiKey().length > 0;
}

function getFastModel() {
  return String(
    process.env.RIZQ_FAST_MODEL ||
    process.env.RIZQ_WIDGET_MODEL ||
    process.env.RIZQ_AGENT_MODEL ||
    DEFAULT_FAST
  ).trim() || DEFAULT_FAST;
}

function getAdvancedModel() {
  return String(process.env.RIZQ_ADVANCED_MODEL || DEFAULT_ADVANCED).trim() || DEFAULT_ADVANCED;
}

/** نموذج جميع الوكلاء (ويدجت / واتساب / صوت / تيليغرام) — Sonnet حصراً */
function getAgentModel() {
  return getAdvancedModel();
}

function isDiamondProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;
  var blob = [profile.plan, profile.tier, profile.package, profile.pkg, profile.pkgName, profile.planType]
    .filter(Boolean)
    .join(' ');
  return /(ماس|diamond|diamant)/i.test(blob);
}

function resolveChatModel(profile, opts) {
  if (opts && opts.useAdvancedModel) return getAdvancedModel();
  // سياسة رزq: كل الوكلاء على Sonnet — لا Haiku في مسارات الوكيل
  return getAgentModel();
}

function applyPromptCache(params) {
  const next = Object.assign({}, params);
  if (typeof params.system === 'string' && params.system) {
    next.system = [{
      type: 'text',
      text: params.system,
      cache_control: { type: 'ephemeral' },
    }];
  } else if (Array.isArray(params.system) && params.system.length) {
    next.system = params.system.map((block, i, arr) => {
      const last = i === arr.length - 1;
      if (typeof block === 'string') {
        const out = { type: 'text', text: block };
        if (last) out.cache_control = { type: 'ephemeral' };
        return out;
      }
      if (last && block && typeof block === 'object') {
        return Object.assign({}, block, { cache_control: { type: 'ephemeral' } });
      }
      return block;
    });
  }
  if (Array.isArray(params.tools) && params.tools.length) {
    next.tools = params.tools.map((tool, i) => {
      if (i !== params.tools.length - 1) return tool;
      return Object.assign({}, tool, { cache_control: { type: 'ephemeral' } });
    });
  }
  return next;
}

async function createCachedMessage(client, params, options) {
  const prepared = applyPromptCache(params);
  const fast = getFastModel();
  const allowFallback = !!(options && options.fallbackToFast) && prepared.model && prepared.model !== fast;
  try {
    const response = await client.messages.create(prepared);
    return { response, model: prepared.model, fallback: false };
  } catch (err) {
    if (!allowFallback) throw err;
    console.warn('[claude] ' + prepared.model + ' فشل — تحويل احتياطي إلى ' + fast + ':', err && err.message);
    const retry = Object.assign({}, prepared, { model: fast });
    const response = await client.messages.create(retry);
    return { response, model: fast, fallback: true };
  }
}

module.exports = {
  ensureAnthropicEnv,
  getAnthropicApiKey,
  isAnthropicConfigured,
  getFastModel,
  getAdvancedModel,
  getAgentModel,
  isDiamondProfile,
  resolveChatModel,
  applyPromptCache,
  createCachedMessage,
  DEFAULT_FAST,
  DEFAULT_ADVANCED,
};
