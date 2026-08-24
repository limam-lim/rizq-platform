'use strict';

const crypto = require('crypto');
const { analyzeReceiptImage } = require('./receiptVision');
const { activateSubRequest, rejectSubRequest, formatPlausibility } = require('./subRequestActivation');
const { formatLocalDateTime } = require('./localTime');

const BOT_TOKEN = () => String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const ADMIN_CHAT_ID = () => String(process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim();
const SUBSCRIBER_ID = () => String(process.env.TELEGRAM_SUBSCRIBER_ID || '').trim();

/** توكن البوت فقط — يكفي لتشغيل webhook واستقبال الرسائل */
function isBotConfigured() {
  return !!BOT_TOKEN();
}

/** توكن + محادثة الأدمن — لإشعارات طلبات الاشتراك */
function isConfigured() {
  return !!(BOT_TOKEN() && ADMIN_CHAT_ID());
}

function webhookSecret() {
  const explicit = String(process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  if (explicit) return explicit;
  const token = BOT_TOKEN();
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 32);
}

async function telegramApi(method, payload, multipart) {
  const token = BOT_TOKEN();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');

  const url = 'https://api.telegram.org/bot' + token + '/' + method;
  const isSend = /^send/i.test(method);
  const chatId = multipart ? '(multipart)' : (payload && payload.chat_id);
  if (isSend) {
    console.log('[telegram-api] → send attempt', { method, chat_id: chatId });
  }

  let res;
  if (multipart) {
    res = await fetch(url, { method: 'POST', body: payload });
  } else {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    if (isSend) {
      console.error('[telegram-api] ❌ send FAILED', {
        method,
        chat_id: chatId,
        error_code: data.error_code,
        description: data.description,
        response: data,
      });
    }
    const err = new Error(data.description || 'telegram_api_error');
    err.telegram = data;
    throw err;
  }
  if (isSend) {
    console.log('[telegram-api] ✅ send OK', {
      method,
      chat_id: chatId,
      message_id: data.result && data.result.message_id,
      chat: data.result && data.result.chat && {
        id: data.result.chat.id,
        type: data.result.chat.type,
        title: data.result.chat.title || data.result.chat.username,
      },
    });
  }
  return data.result;
}

/** long-poll عبر GET — أكثر موثوقية من POST مع timeout طويل في Node fetch */
async function getUpdatesLongPoll(offset) {
  const token = BOT_TOKEN();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');
  const qs = new URLSearchParams({
    offset: String(offset || 0),
    timeout: '30',
  });
  qs.append('allowed_updates', 'message');
  qs.append('allowed_updates', 'callback_query');
  const url = 'https://api.telegram.org/bot' + token + '/getUpdates?' + qs.toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    const err = new Error(data.description || 'getUpdates_failed');
    err.telegram = data;
    throw err;
  }
  return Array.isArray(data.result) ? data.result : [];
}

async function getBotIdentity() {
  if (!isBotConfigured()) return null;
  try {
    const me = await telegramApi('getMe', {});
    return { id: me.id, username: me.username, firstName: me.first_name };
  } catch (e) {
    return null;
  }
}

function buildSubRequestCaption(req, aiResult) {
  const pl = formatPlausibility(aiResult && aiResult.plausibilityLevel);
  const accRow = typeof req._accountPhone === 'string' ? req._accountPhone : '';
  const phone = accRow || req._phone || '—';
  const lines = [
    '🧾 *طلب اشتراك جديد*',
    '',
    '👤 *العميل:* ' + escapeMarkdown(req.account || req.accountId || '—'),
    '📱 *الهاتف:* `' + escapeMarkdown(String(phone)) + '`',
    '📦 *الباقة:* ' + escapeMarkdown(req.pkg || '—'),
    '💰 *المبلغ:* ' + (Number(req.price) || 0) + ' MRU',
    '🔍 *الموثوقية:* ' + escapeMarkdown(pl),
    '🏷 *الفئة:* `' + escapeMarkdown(req.category || 'package') + '`',
    '🆔 `' + escapeMarkdown(req.id) + '`',
  ];
  if (aiResult && aiResult.amount) lines.push('💵 *مبلغ الوصل:* ' + escapeMarkdown(String(aiResult.amount)));
  if (aiResult && aiResult.date) lines.push('📅 *التاريخ:* ' + escapeMarkdown(String(aiResult.date)));
  if (aiResult && aiResult.bankOrOperator) lines.push('🏦 *الجهة:* ' + escapeMarkdown(String(aiResult.bankOrOperator)));
  if (aiResult && Array.isArray(aiResult.notes) && aiResult.notes.length) {
    lines.push('', '_ملاحظات:_ ' + escapeMarkdown(aiResult.notes.slice(0, 2).join(' · ')));
  }
  return lines.join('\n');
}

function escapeMarkdown(text) {
  return String(text || '').replace(/([_*`\[])/g, '\\$1');
}

function inlineKeyboard(requestId) {
  return {
    inline_keyboard: [[
      { text: '✅ تفعيل الاشتراك', callback_data: 'sr:a:' + requestId },
      { text: '❌ رفض الطلب', callback_data: 'sr:r:' + requestId },
    ]],
  };
}

function parseDataUrl(receiptImage) {
  const m = String(receiptImage || '').match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return null;
  return { mediaType: m[1], buffer: Buffer.from(m[2], 'base64') };
}

async function sendLeadEscalationAlert(lead) {
  if (!isConfigured()) {
    const msg = '[telegram-admin] lead alert skipped — set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID in .env';
    console.error(msg, {
      hasToken: !!BOT_TOKEN(),
      adminChatId: ADMIN_CHAT_ID() || '(empty)',
    });
    const err = new Error('telegram_admin_not_configured');
    err.code = 'telegram_admin_not_configured';
    throw err;
  }

  const summary = lead.reason || lead.notes || (lead.kind === 'register_interest' ? 'طلب اشتراك/تفعيل' : 'طلب تصعيد للإدارة');
  const localWhen = lead.createdAtLocal || formatLocalDateTime(new Date());
  const text = [
    '🚨 *طلب تفعيل جديد / استفسار هام!*',
    '',
    '👤 *اسم التاجر:* ' + escapeMarkdown(lead.businessName || '—'),
    '📱 *رقم الهاتف:* `' + escapeMarkdown(lead.whatsapp || lead.phone || '—') + '`',
    '📦 *الباقة المطلوبة:* ' + escapeMarkdown(lead.package || '—'),
    '💬 *ملخص الطلب:* ' + escapeMarkdown(summary),
    '🕐 *التوقيت المحلي (نواكشوط):* ' + escapeMarkdown(localWhen),
  ].join('\n');
  const fullText = lead.ticketId
    ? text + '\n🆔 `' + escapeMarkdown(lead.ticketId) + '` · 📡 ' + escapeMarkdown(lead.channel || '—')
    : text + (lead.channel ? '\n📡 ' + escapeMarkdown(lead.channel) : '');

  try {
    const result = await telegramApi('sendMessage', {
      chat_id: ADMIN_CHAT_ID(),
      text: fullText,
      parse_mode: 'Markdown',
    });
    console.log('[telegram-admin] lead alert delivered', { messageId: result && result.message_id });
    return result;
  } catch (e) {
    console.error('[telegram-admin] lead alert sendMessage FAILED:', e && e.message, {
      adminChatId: ADMIN_CHAT_ID(),
      telegram: e && e.telegram,
    });
    throw e;
  }
}

/** alias — استدعاء موحّد لإشعارات الإدارة */
const sendTelegramNotification = sendLeadEscalationAlert;
const sendTelegramAdminNotification = sendLeadEscalationAlert;

async function sendSubRequestNotification(req, aiResult) {
  if (!isConfigured()) return null;

  const caption = buildSubRequestCaption(req, aiResult);
  const markup = JSON.stringify(inlineKeyboard(req.id));
  const chatId = ADMIN_CHAT_ID();

  const parsed = parseDataUrl(req.receiptImage);
  if (parsed && parsed.buffer.length > 0) {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('parse_mode', 'Markdown');
    form.append('reply_markup', markup);
    const ext = parsed.mediaType.includes('png') ? 'png' : 'jpg';
    form.append('photo', new Blob([parsed.buffer], { type: parsed.mediaType }), 'receipt.' + ext);
    return telegramApi('sendPhoto', form, true);
  }

  return telegramApi('sendMessage', {
    chat_id: chatId,
    text: caption + '\n\n⚠️ _لم تُرفق صورة وصل_',
    parse_mode: 'Markdown',
    reply_markup: inlineKeyboard(req.id),
  });
}

async function editSubRequestMessage(chatId, messageId, text) {
  if (!chatId || messageId == null) return;
  try {
    await telegramApi('editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption: text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] },
    });
  } catch (e) {
    await telegramApi('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] },
    });
  }
}

function isAuthorizedChat(chatId) {
  return String(chatId) === ADMIN_CHAT_ID();
}

function findSubRequestById(readSubRequests, requestId) {
  const list = typeof readSubRequests === 'function' ? readSubRequests() : [];
  const idx = list.findIndex((r) => r.id === requestId);
  if (idx === -1) return { idx: -1, list, req: null };
  return { idx, list, req: list[idx] };
}

function patchSubRequest(list, idx, patch, writeSubRequests) {
  list[idx] = Object.assign({}, list[idx], patch);
  writeSubRequests(list);
  return list[idx];
}

/**
 * بعد POST /api/sub-requests — تحليل الوصل + إشعار Telegram (لا يُوقف الاستجابة للعميل)
 */
async function processNewSubRequest(requestId, deps) {
  deps = deps || {};
  const { readSubRequests, writeSubRequests, anthropic, readAccounts } = deps;
  if (!isConfigured()) return;

  const { idx, list, req } = findSubRequestById(readSubRequests, requestId);
  if (idx === -1 || !req) return;

  const accRow = typeof readAccounts === 'function'
    ? readAccounts().find((a) => a.id === req.accountId)
    : null;
  req._phone = accRow?.phone || '';
  req._accountPhone = accRow?.phone || '';

  let aiResult = null;
  if (req.receiptImage && isAnthropicAvailable(deps)) {
    const analysis = await analyzeReceiptImage(req.receiptImage, {
      expectedPrice: req.expectedPrice || req.price,
      pkgName: req.pkg,
      anthropic,
    });
    aiResult = analysis.result || { plausibilityLevel: 'unreviewed' };
    patchSubRequest(list, idx, {
      aiAnalysis: aiResult,
      aiAnalyzedAt: new Date().toISOString(),
      riskLevel: aiResult.plausibilityLevel || req.riskLevel,
    }, writeSubRequests);
  } else {
    aiResult = { plausibilityLevel: req.receiptImage ? 'unreviewed' : 'high', notes: req.receiptImage ? ['تعذّر التحليل الآلي'] : ['لا يوجد وصل مرفق'] };
  }

  try {
    const msg = await sendSubRequestNotification(req, aiResult);
    if (msg && msg.message_id) {
      const fresh = findSubRequestById(readSubRequests, requestId);
      if (fresh.idx !== -1) {
        patchSubRequest(fresh.list, fresh.idx, {
          telegramChatId: String(msg.chat?.id || ADMIN_CHAT_ID()),
          telegramMessageId: msg.message_id,
        }, writeSubRequests);
      }
    }
  } catch (err) {
    console.error('[telegram-admin] notify failed:', err.message);
  }
}

function isAnthropicAvailable(deps) {
  try {
    if (deps.anthropic) return true;
    const { isAnthropicConfigured } = require('../config/anthropic');
    return isAnthropicConfigured();
  } catch (e) {
    return false;
  }
}

// ── جلسات محادثة Telegram → askSubscriberAgent (نفس نمط واتساب) ──
const TG_SESSIONS = new Map();
const TG_MAX_HISTORY = 12;
const TG_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function pruneTelegramSessions() {
  const now = Date.now();
  TG_SESSIONS.forEach((session, key) => {
    if (!session || now - (session.lastSeen || 0) > TG_SESSION_TTL_MS) TG_SESSIONS.delete(key);
  });
}

function resolveSubscriberIdForMessage(message) {
  if (SUBSCRIBER_ID()) return SUBSCRIBER_ID();
  const chatId = message && message.chat && message.chat.id;
  return chatId != null ? ('tg_' + chatId) : 'telegram';
}

async function handleIncomingMessage(message, deps) {
  if (!message || (message.from && message.from.is_bot)) return { ok: true, ignored: 'bot_message' };
  const text = String(message.text || message.caption || '').trim();
  const chatId = message.chat && message.chat.id;
  if (!chatId) return { ok: true, ignored: 'no_chat' };
  if (!text) return { ok: true, ignored: 'no_text' };

  console.log('[telegram-bot] message from chat', chatId, ':', text.slice(0, 80));

  if (text === '/start') {
    await telegramApi('sendMessage', {
      chat_id: chatId,
      text: '👋 مرحباً!\nأنا وكيل رزق الذكي (@RizqOficial_bot).\nاكتب سؤالك وسأرد عليك فوراً.',
    });
    console.log('[telegram-bot] /start replied to chat', chatId);
    return { ok: true, action: 'welcome' };
  }

  if (isAuthorizedChat(chatId) && (
    text === '/leads' ||
    /(?:هل\s*(?:هناك|يوجد)\s*طلب|طلبات?\s*(?:جديد|معلق|pending)|عرض\s*الطلبات|pending\s*leads?)/i.test(text)
  )) {
    const { getPendingLeads, formatPendingLeadsForAdmin } = require('./leadEscalation');
    const adminReply = formatPendingLeadsForAdmin(getPendingLeads());
    await telegramApi('sendMessage', {
      chat_id: chatId,
      text: adminReply.slice(0, 4096),
      parse_mode: 'Markdown',
    });
    console.log('[telegram-bot] admin pending leads from DB', chatId);
    return { ok: true, action: 'admin_leads_list' };
  }

  pruneTelegramSessions();
  const chatKey = String(chatId);
  if (!TG_SESSIONS.has(chatKey)) {
    TG_SESSIONS.set(chatKey, { history: [], lastSeen: Date.now() });
  }
  const session = TG_SESSIONS.get(chatKey);
  session.lastSeen = Date.now();

  const senderName = [message.from && message.from.first_name, message.from && message.from.last_name]
    .filter(Boolean).join(' ') || 'Telegram';

  let replyText = 'شكراً لرسالتكم. سأرد عليكم قريباً إن شاء الله.';
  try {
    if (SUBSCRIBER_ID()) {
      const { askSubscriberAgent } = require('../../rizq_subscriber_agent');
      const result = await askSubscriberAgent({
        subscriberId: SUBSCRIBER_ID(),
        channel: 'telegram',
        message: text,
        context: {
          sender: message.from && message.from.username ? '@' + message.from.username : chatKey,
          name: senderName,
          history: session.history.slice(-TG_MAX_HISTORY),
        },
      });
      replyText = (result && result.text) || replyText;
    } else {
      const { askAgent } = require('../../rizq_agent_brain');
      const result = await askAgent({
        channel: 'telegram',
        message: text,
        context: {
          name: senderName,
          isAdmin: isAuthorizedChat(chatId),
          history: session.history.slice(-TG_MAX_HISTORY),
        },
      });
      replyText = (result && result.text) || replyText;
    }
    session.history.push({ role: 'user', content: text });
    session.history.push({ role: 'assistant', content: replyText });
    if (session.history.length > TG_MAX_HISTORY * 2) {
      session.history = session.history.slice(-TG_MAX_HISTORY * 2);
    }
  } catch (err) {
    console.error('[telegram-bot] agent error:', err.message, err.status ? ('status=' + err.status) : '');
    replyText = '⚠️ عذراً، حدثت مشكلة مؤقتة. حاول مجدداً أو تواصل عبر direction@rizq.mr';
  }

  await telegramApi('sendMessage', {
    chat_id: chatId,
    text: replyText.slice(0, 4096),
  });
  console.log('[telegram-bot] reply sent to chat', chatId, '(', replyText.slice(0, 60), '…)');
  return { ok: true, action: 'reply' };
}

async function handleCallbackQuery(callbackQuery, deps) {
  const data = String(callbackQuery.data || '');
  const m = data.match(/^sr:([ar]):(.+)$/);
  if (!m) return { ok: false, reason: 'unknown_callback' };

  const action = m[1] === 'a' ? 'approve' : 'reject';
  const requestId = m[2];
  const chatId = callbackQuery.message && callbackQuery.message.chat && callbackQuery.message.chat.id;
  const messageId = callbackQuery.message && callbackQuery.message.message_id;

  if (!isAuthorizedChat(chatId)) {
    await telegramApi('answerCallbackQuery', {
      callback_query_id: callbackQuery.id,
      text: 'غير مصرّح',
      show_alert: true,
    });
    return { ok: false, reason: 'unauthorized_chat' };
  }

  const { readSubRequests, writeSubRequests } = deps;
  const { idx, list, req } = findSubRequestById(readSubRequests, requestId);

  if (idx === -1 || !req) {
    await telegramApi('answerCallbackQuery', {
      callback_query_id: callbackQuery.id,
      text: 'الطلب غير موجود',
      show_alert: true,
    });
    return { ok: false, reason: 'not_found' };
  }

  if (req.status !== 'pending') {
    await telegramApi('answerCallbackQuery', {
      callback_query_id: callbackQuery.id,
      text: 'تمت معالجة هذا الطلب مسبقاً (' + req.status + ')',
      show_alert: true,
    });
    return { ok: false, reason: 'already_processed', status: req.status };
  }

  if (action === 'reject') {
    patchSubRequest(list, idx, {
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewedVia: 'telegram',
    }, writeSubRequests);

    const name = req.account || req.accountId;
    await editSubRequestMessage(chatId, messageId, '❌ *تم رفض طلب* ' + escapeMarkdown(name) + '\n\n_بواسطة الأدمن عبر Telegram_');
    await telegramApi('answerCallbackQuery', { callback_query_id: callbackQuery.id, text: 'تم الرفض' });
    return { ok: true, action: 'reject' };
  }

  const activation = await activateSubRequest(req, deps);
  if (!activation.ok) {
    await telegramApi('answerCallbackQuery', {
      callback_query_id: callbackQuery.id,
      text: 'فشل التفعيل: ' + (activation.error || 'unknown'),
      show_alert: true,
    });
    return { ok: false, reason: 'activation_failed', error: activation.error };
  }

  patchSubRequest(list, idx, {
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewedVia: 'telegram',
    paymentConfirmed: true,
  }, writeSubRequests);

  const clientName = activation.accountName || req.account || req.accountId;
  await editSubRequestMessage(
    chatId,
    messageId,
    '✅ *تم تفعيل باقة* ' + escapeMarkdown(clientName) + ' *بنجاح*\n\n_بواسطة الأدمن عبر Telegram_',
  );
  await telegramApi('answerCallbackQuery', { callback_query_id: callbackQuery.id, text: '✅ تم التفعيل' });
  return { ok: true, action: 'approve', activation };
}

async function handleWebhookUpdate(update, deps) {
  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query, deps);
  }
  const message = update.message || update.edited_message;
  if (message) {
    if (!isBotConfigured()) return { ok: false, reason: 'bot_not_configured' };
    return handleIncomingMessage(message, deps);
  }
  return { ok: true, ignored: true };
}

function verifyWebhookSecret(req) {
  const expected = webhookSecret();
  if (!expected) return false;
  const headerSecret = req.header('x-telegram-bot-api-secret-token') || '';
  const pathSecret = req.params && req.params.secret;
  if (pathSecret != null) {
    return pathSecret === expected && (!headerSecret || headerSecret === expected);
  }
  return headerSecret === expected;
}

async function registerWebhook(publicBaseUrl) {
  if (!isBotConfigured()) return { ok: false, error: 'telegram_bot_not_configured' };
  const base = String(publicBaseUrl || process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  if (!base) return { ok: false, error: 'PUBLIC_BASE_URL required' };
  const secret = webhookSecret();
  const webhookUrl = base + '/api/telegram/webhook';
  const result = await telegramApi('setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'],
    secret_token: secret,
  });
  return { ok: true, webhookUrl, secretConfigured: !!secret, result };
}

async function deleteWebhook() {
  if (!isBotConfigured()) return { ok: false, error: 'telegram_bot_not_configured' };
  const result = await telegramApi('deleteWebhook', { drop_pending_updates: false });
  return { ok: true, result };
}

function shouldUsePolling() {
  if (!isBotConfigured()) return false;
  const flag = String(process.env.TELEGRAM_USE_POLLING || '').trim().toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'yes') return true;
  if (flag === 'false' || flag === '0' || flag === 'no') return false;
  const pub = String(process.env.PUBLIC_BASE_URL || '').trim();
  if (!pub && process.env.NODE_ENV !== 'production') return true;
  return false;
}

let _pollingActive = false;
let _pollOffset = 0;

function stopPolling() {
  _pollingActive = false;
}

async function startPolling(getDeps) {
  if (_pollingActive || !isBotConfigured()) return { ok: false, reason: 'already_running_or_not_configured' };
  _pollingActive = true;
  try {
    await deleteWebhook();
    console.log('[telegram-polling] webhook cleared — long-poll active');
  } catch (err) {
    console.warn('[telegram-polling] deleteWebhook:', err.message);
  }

  (async function pollLoop() {
    while (_pollingActive) {
      try {
        const list = await getUpdatesLongPoll(_pollOffset);
        if (list.length) {
          console.log('[telegram-polling] received', list.length, 'update(s)');
        }
        for (const update of list) {
          if (update && update.update_id != null) {
            _pollOffset = update.update_id + 1;
          }
          try {
            const deps = typeof getDeps === 'function' ? getDeps() : getDeps;
            await handleWebhookUpdate(update, deps || {});
          } catch (updErr) {
            console.error('[telegram-polling] update handler:', updErr.message);
          }
        }
      } catch (err) {
        if (!_pollingActive) break;
        const msg = err.message || String(err);
        if (/conflict/i.test(msg)) {
          console.error('[telegram-polling] Conflict — أوقف أي نسخة أخرى من السيرفر أو webhook نشط');
        } else {
          console.error('[telegram-polling] error:', msg);
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    console.log('[telegram-polling] stopped');
  })();

  return { ok: true, mode: 'polling' };
}

module.exports = {
  isBotConfigured,
  isConfigured,
  webhookSecret,
  verifyWebhookSecret,
  processNewSubRequest,
  handleWebhookUpdate,
  registerWebhook,
  deleteWebhook,
  shouldUsePolling,
  startPolling,
  stopPolling,
  sendSubRequestNotification,
  sendLeadEscalationAlert,
  sendTelegramNotification,
  sendTelegramAdminNotification,
  formatPlausibility,
  telegramApi,
  getBotIdentity,
  getUpdatesLongPoll,
};
