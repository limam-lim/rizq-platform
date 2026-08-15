/**
 * مصدر موحّد لمفتاح Claude API — يدعم ANTHROPIC_API_KEY و CLAUDE_API_KEY
 */
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

module.exports = { ensureAnthropicEnv, getAnthropicApiKey, isAnthropicConfigured };
