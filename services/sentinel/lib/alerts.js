/**
 * تنبيهات حرجة مع كتم تكرار (cooldown) ورسالة «عاد للعمل».
 */
'use strict';

const { cfg } = require('./config');
const store = require('./store');
const { redactText } = require('./redact');

/** @type {Map<string, { open: boolean, lastSentAt: number, lastRecoveredAt: number }>} */
const state = new Map();

function getState(key) {
  if (!state.has(key)) state.set(key, { open: false, lastSentAt: 0, lastRecoveredAt: 0 });
  return state.get(key);
}

async function notifyCritical(telegram, key, message, opts) {
  opts = opts || {};
  const c = cfg();
  const st = getState(key);
  const now = Date.now();
  const text = redactText(String(message || ''));

  if (st.open && now - st.lastSentAt < c.alertCooldownMs && !opts.force) {
    await store.insertEvent({
      kind: 'alert_suppressed',
      severity: 'info',
      summary: 'كتم تنبيه: ' + key,
      payload: { key, message: text },
    });
    return { sent: false, reason: 'cooldown', key };
  }

  st.open = true;
  st.lastSentAt = now;
  if (telegram && typeof telegram.sendOwner === 'function') {
    await telegram.sendOwner('🚨 ' + text);
  }
  await store.insertEvent({
    kind: 'alert_critical',
    severity: 'critical',
    summary: text.slice(0, 500),
    payload: { key },
  });
  return { sent: true, key };
}

async function notifyRecovered(telegram, key, message) {
  const st = getState(key);
  if (!st.open) return { sent: false, reason: 'not_open', key };
  st.open = false;
  st.lastRecoveredAt = Date.now();
  const text = redactText(String(message || ('عاد للعمل: ' + key)));
  if (telegram && typeof telegram.sendOwner === 'function') {
    await telegram.sendOwner('✅ ' + text);
  }
  await store.insertEvent({
    kind: 'alert_recovered',
    severity: 'info',
    summary: text.slice(0, 500),
    payload: { key },
  });
  return { sent: true, key };
}

function resetAlertState() {
  state.clear();
}

function peekAlertState(key) {
  return Object.assign({}, getState(key));
}

module.exports = {
  notifyCritical,
  notifyRecovered,
  resetAlertState,
  peekAlertState,
  getState,
};
