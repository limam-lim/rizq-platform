/**
 * تيليغرام الحارس — يرد فقط على SENTINEL_TELEGRAM_CHAT_ID.
 */
'use strict';

const { cfg } = require('./config');
const { redactText } = require('./redact');
const store = require('./store');

const commandHandlers = {};

function registerCommands(map) {
  Object.assign(commandHandlers, map || {});
}

async function telegramApi(method, payload) {
  const c = cfg();
  if (!c.telegramBotToken) throw new Error('telegram_bot_token_missing');
  const url = 'https://api.telegram.org/bot' + c.telegramBotToken + '/' + method;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok === false) {
    const err = new Error((body && body.description) || ('telegram_' + method + '_failed'));
    err.telegram = body;
    throw err;
  }
  return body.result;
}

function isOwnerChat(chatId) {
  const c = cfg();
  if (!c.telegramChatId) return false;
  return String(chatId) === String(c.telegramChatId);
}

async function sendOwner(text) {
  const c = cfg();
  if (!c.telegramBotToken || !c.telegramChatId) {
    await store.insertEvent({
      kind: 'telegram_skip',
      severity: 'info',
      summary: 'تيليغرام غير مضبوط — تخطي إرسال',
      payload: {},
    });
    return { ok: false, reason: 'not_configured' };
  }
  const safe = redactText(String(text || '')).slice(0, 3900);
  const result = await telegramApi('sendMessage', {
    chat_id: c.telegramChatId,
    text: safe,
    disable_web_page_preview: true,
  });
  return { ok: true, result };
}

/** رسائل واردة من telegramAdmin للمالك — تجميع وتحليل مع إبقاء الحرج فورياً */
const bridgeBuffer = [];
let bridgeTimer = null;

async function ingestAdminOutbound(message, meta) {
  meta = meta || {};
  const text = redactText(String(message || ''));
  const critical = !!(meta.critical || meta.severity === 'critical' || /🚨|حرج|متوقف|5xx|SSL|نسخة احتياطية/i.test(text));
  if (critical) {
    return sendOwner(text);
  }
  bridgeBuffer.push({ text, at: Date.now(), meta });
  if (!bridgeTimer) {
    bridgeTimer = setTimeout(flushBridge, 5 * 60 * 1000);
    if (bridgeTimer.unref) bridgeTimer.unref();
  }
  return { ok: true, buffered: true };
}

async function flushBridge() {
  bridgeTimer = null;
  if (!bridgeBuffer.length) return;
  const batch = bridgeBuffer.splice(0, bridgeBuffer.length);
  const lines = batch.map((b, i) => (i + 1) + ') ' + b.text.slice(0, 400));
  const body = '📬 ملخص إشعارات مجمّعة (' + batch.length + '):\n\n' + lines.join('\n\n');
  await sendOwner(body);
  await store.insertEvent({
    kind: 'telegram_bridge_flush',
    severity: 'info',
    summary: 'تجميع ' + batch.length + ' رسالة تيليغرام',
    payload: { count: batch.length },
  });
}

async function handleUpdate(update, deps) {
  deps = deps || {};
  const message = update && (update.message || update.edited_message);
  if (!message || !message.chat) return { ok: true, ignored: true };
  const chatId = String(message.chat.id);
  if (!isOwnerChat(chatId)) {
    await store.insertEvent({
      kind: 'telegram_ignored_chat',
      severity: 'info',
      summary: 'تجاهل chat_id غريب: ' + chatId.slice(0, 12),
      payload: { chatId: chatId.slice(0, 24) },
    });
    return { ok: true, ignored: true, reason: 'foreign_chat' };
  }
  const text = String(message.text || '').trim();
  if (!text.startsWith('/')) return { ok: true, ignored: true };

  const parts = text.split(/\s+/);
  const cmd = parts[0].split('@')[0].toLowerCase();
  const arg = text.slice(parts[0].length).trim();
  const handler = commandHandlers[cmd];
  if (!handler) {
    await sendOwner('أوامر: /status /today /week /agents /pending /ask <سؤال>');
    return { ok: true };
  }
  try {
    const reply = await handler({ arg, deps, chatId });
    if (reply) await sendOwner(String(reply));
    return { ok: true, cmd };
  } catch (e) {
    await sendOwner('تعذّر تنفيذ الأمر: ' + e.message);
    return { ok: false, error: e.message };
  }
}

let polling = false;
let offset = 0;

async function startPolling(deps) {
  const c = cfg();
  if (!c.telegramBotToken || polling) return { ok: false };
  polling = true;
  (async function loop() {
    while (polling) {
      try {
        const url = 'https://api.telegram.org/bot' + c.telegramBotToken
          + '/getUpdates?timeout=25&offset=' + offset;
        const res = await fetch(url);
        const body = await res.json();
        const list = (body && body.result) || [];
        for (const u of list) {
          if (u.update_id != null) offset = u.update_id + 1;
          await handleUpdate(u, typeof deps === 'function' ? deps() : deps);
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  })();
  return { ok: true };
}

function stopPolling() {
  polling = false;
}

module.exports = {
  registerCommands,
  sendOwner,
  ingestAdminOutbound,
  flushBridge,
  handleUpdate,
  startPolling,
  stopPolling,
  isOwnerChat,
  telegramApi,
  redactText,
};
