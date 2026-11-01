/**
 * إيقاظ وكيل عبر مسار داخلي محمي — قائمة بيضاء فقط.
 */
'use strict';

const { cfg, WAKE_WHITELIST } = require('./config');
const store = require('./store');

function isWhitelisted(name) {
  const n = String(name || '').trim().toLowerCase();
  return WAKE_WHITELIST.includes(n);
}

async function wakeAgent(name, opts) {
  opts = opts || {};
  const c = cfg();
  const agent = String(name || '').trim().toLowerCase();
  if (!isWhitelisted(agent)) {
    await store.insertEvent({
      kind: 'wake_rejected',
      severity: 'warn',
      summary: 'إيقاظ مرفوض (خارج القائمة البيضاء): ' + agent,
      payload: { agent },
    });
    return { ok: false, error: 'not_whitelisted', agent };
  }
  if (!c.wakeSecret) {
    return { ok: false, error: 'wake_secret_missing', agent };
  }

  const url = c.backendBase + '/api/internal/sentinel/wake';
  let status = 0;
  let body = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentinel-Secret': c.wakeSecret,
      },
      body: JSON.stringify({ agent, reason: opts.reason || 'sentinel_auto_wake', once: true }),
    });
    status = res.status;
    body = await res.json().catch(() => ({}));
  } catch (e) {
    await store.insertEvent({
      kind: 'wake_failed',
      severity: 'critical',
      summary: 'فشل إيقاظ ' + agent + ': ' + e.message,
      payload: { agent, error: e.message },
    });
    return { ok: false, error: e.message, agent };
  }

  const ok = status >= 200 && status < 300 && body && body.ok !== false;
  await store.insertEvent({
    kind: ok ? 'wake_ok' : 'wake_failed',
    severity: ok ? 'info' : 'critical',
    summary: (ok ? 'إيقاظ ناجح: ' : 'إيقاظ فاشل: ') + agent,
    payload: { agent, status, body },
  });
  return { ok, agent, status, body };
}

module.exports = { wakeAgent, isWhitelisted, WAKE_WHITELIST };
