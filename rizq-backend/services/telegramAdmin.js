'use strict';

const crypto = require('crypto');
const { analyzeReceiptImage } = require('./receiptVision');
const { activateSubRequest, rejectSubRequest, formatPlausibility } = require('./subRequestActivation');
const { scorePackageRequest, shouldAutoApprove } = require('./provisionalTier');
const {
  formatLeadAlertText,
  formatWidgetMediaCaption,
  formatSubRequestCaption,
  cleanField,
} = require('./telegramNotifyFormat');
const {
  readPersistedAdminChat,
  registerAdminChatId,
} = require('./telegramChatStore');

const BOT_TOKEN = () => String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
const ADMIN_CHAT_ID = () => String(
  process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || ''
).trim();
const SUBSCRIBER_ID = () => String(process.env.TELEGRAM_SUBSCRIBER_ID || '').trim();

/** محادثات رُصدت عبر polling — getUpdates لا يعيدها أثناء تشغيل السيرفر */
const _seenChatIds = new Map();

function rememberSeenChat(chatId, chatMeta) {
  const id = String(chatId || '').trim();
  if (!id) return;
  _seenChatIds.set(id, {
    id,
    type: (chatMeta && chatMeta.type) || 'private',
    title: (chatMeta && (chatMeta.title || chatMeta.username || chatMeta.first_name)) || '',
    seenAt: Date.now(),
  });
}

/** توكن البوت فقط — يكفي لتشغيل webhook واستقبال الرسائل */
function isBotConfigured() {
  return !!BOT_TOKEN();
}

/** توكن + محادثة الأدمن — لإشعارات طلبات الاشتراك */
function isConfigured() {
  return !!(BOT_TOKEN() && ADMIN_CHAT_ID());
}

function getTelegramDiagnostics() {
  const token = BOT_TOKEN();
  const chatId = ADMIN_CHAT_ID();
  return {
    hasToken: !!token,
    tokenPrefix: token ? token.slice(0, 8) + '…' : '(empty)',
    adminChatId: chatId || '(empty)',
    adminChatIdSource: process.env.TELEGRAM_ADMIN_CHAT_ID
      ? 'TELEGRAM_ADMIN_CHAT_ID'
      : (process.env.TELEGRAM_CHAT_ID ? 'TELEGRAM_CHAT_ID' : '(none)'),
    configured: !!(token && chatId),
  };
}

function normalizeTelegramChatId(raw) {
  const s = String(raw || '').trim();
  if (!s) return s;
  return s;
}

function logTelegramSendFailure(method, chatId, err, extra) {
  const payload = {
    method,
    chat_id: chatId,
    message: err && err.message,
    httpStatus: err && err.httpStatus,
    error_code: err && err.telegram && err.telegram.error_code,
    description: err && err.telegram && err.telegram.description,
    telegram_response: err && err.telegram ? err.telegram : undefined,
    diagnostics: getTelegramDiagnostics(),
  };
  if (extra) Object.assign(payload, extra);
  console.error('[telegram-api] ❌ SEND REJECTED — full details:', JSON.stringify(payload, null, 2));
}

/**
 * محادثات التنبيه/الموافقة فقط — لا تُضمَّن محادثات الزوار العشوائية
 * (_seenChatIds) وإلا أي من يراسل البوت يصبح قادراً على Approve باقات.
 */
function buildAlertChatCandidates() {
  const ids = [];
  const seen = new Set();
  const add = (raw) => {
    const id = normalizeTelegramChatId(raw);
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  add(ADMIN_CHAT_ID());
  add(readPersistedAdminChat());
  // SUBSCRIBER_ID إن كان رقم محادثة تيليجرام صريحاً فقط (وليس معرف مشترك نصي)
  const sub = String(SUBSCRIBER_ID() || '').trim();
  if (/^-?\d+$/.test(sub)) add(sub);
  return ids;
}

/** هل يُسمح بتثبيت chat_id كأدمن؟ فقط إن طابق الإعداد أو قائمة سماح صريحة. */
function canPromoteAdminChat(chatId) {
  const id = normalizeTelegramChatId(chatId);
  if (!id) return false;
  const configured = normalizeTelegramChatId(ADMIN_CHAT_ID());
  if (configured && id === configured) return true;
  const allow = String(process.env.TELEGRAM_ADMIN_CHAT_ALLOWLIST || '')
    .split(/[,\s]+/)
    .map((s) => normalizeTelegramChatId(s))
    .filter(Boolean);
  if (allow.includes(id)) return true;
  // bootstrap مرة واحدة فقط عندما لا يوجد أدمن مُعدّ مسبقاً
  if (!configured && !readPersistedAdminChat() && process.env.TELEGRAM_ALLOW_AUTO_ADMIN === '1') {
    return true;
  }
  return false;
}

async function fetchRecentPrivateChatIds(limit) {
  const token = BOT_TOKEN();
  if (!token) return [];
  limit = Math.min(Math.max(Number(limit) || 10, 1), 25);
  try {
    const url = 'https://api.telegram.org/bot' + token + '/getUpdates?limit=' + limit + '&timeout=0';
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await res.json().catch(() => ({}));
    if (!data.ok || !Array.isArray(data.result)) {
      console.error('[telegram-admin] getUpdates for chat discovery failed:', JSON.stringify(data));
      return [];
    }
    const out = [];
    const seen = new Set();
    data.result.forEach((u) => {
      const chat = (u.message && u.message.chat) || (u.callback_query && u.callback_query.message && u.callback_query.message.chat);
      if (!chat || !chat.id) return;
      const id = String(chat.id);
      if (seen.has(id)) return;
      seen.add(id);
      out.push({
        id,
        type: chat.type,
        title: chat.title || chat.username || chat.first_name || '',
      });
    });
    _seenChatIds.forEach((meta) => {
      if (seen.has(meta.id)) return;
      seen.add(meta.id);
      out.push({
        id: meta.id,
        type: meta.type,
        title: meta.title,
        source: 'polling_seen',
      });
    });
    return out;
  } catch (e) {
    console.error('[telegram-admin] fetchRecentPrivateChatIds error:', e && e.message);
    return [];
  }
}

async function validateAdminChatAtStartup() {
  if (!isBotConfigured()) return { ok: false, reason: 'not_configured' };
  const candidates = buildAlertChatCandidates();
  let lastErr = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const chatId = candidates[i];
    try {
      await telegramApi('getChat', { chat_id: chatId });
      const configured = normalizeTelegramChatId(ADMIN_CHAT_ID());
      if (chatId !== configured && canPromoteAdminChat(chatId)) {
        registerAdminChatId(chatId, { source: 'startup_auto_fix' });
        console.log('[telegram] admin chat auto-fixed →', chatId, '(was invalid:', configured || '(empty)', ')');
      } else if (chatId === configured) {
        console.log('[telegram] admin chat validated:', chatId);
      } else {
        console.warn('[telegram] candidate chat valid but not promoted (set TELEGRAM_ADMIN_CHAT_ID):', chatId);
        return { ok: true, chatId, autoFixed: false };
      }
      return { ok: true, chatId, autoFixed: chatId !== configured && canPromoteAdminChat(chatId) };
    } catch (e) {
      lastErr = e;
      if (chatId === normalizeTelegramChatId(ADMIN_CHAT_ID())) {
        logTelegramSendFailure('getChat', chatId, e, { phase: 'startup_validation' });
      }
    }
  }

  // لا نرقّي محادثات مكتشفة عشوائياً إلى أدمن — نطبعها للمساعدة فقط
  const discovered = await fetchRecentPrivateChatIds(15);
  for (let j = 0; j < discovered.length; j += 1) {
    const chatId = String(discovered[j].id);
    if (candidates.includes(chatId)) continue;
    if (!canPromoteAdminChat(chatId)) continue;
    try {
      await telegramApi('getChat', { chat_id: chatId });
      registerAdminChatId(chatId, {
        source: 'startup_discovered',
        title: discovered[j].title,
      });
      console.log('[telegram] admin chat auto-registered from allowlist discovery →', chatId);
      return { ok: true, chatId, autoFixed: true };
    } catch (e) {
      lastErr = e;
    }
  }

  if (discovered.length) {
    console.warn('[telegram] configured chat_id invalid — recent bot conversations (message bot + Start):');
    discovered.forEach((c) => {
      console.warn('  → chat_id=' + c.id + ' type=' + c.type + ' name=' + c.title);
    });
  } else {
    console.warn('[telegram] no chats found — open Telegram, message @RizqOficial_bot, press Start (chat_id will auto-save to .env)');
  }
  return { ok: false, error: lastErr && lastErr.message, discovered };
}

async function sendMessageToAlertChats(text, meta) {
  meta = meta || {};
  const candidates = buildAlertChatCandidates();
  let lastErr = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const chatId = candidates[i];
    try {
      const result = await telegramApi('sendMessage', { chat_id: chatId, text });
      return { result, chatId, via: 'configured' };
    } catch (e) {
      lastErr = e;
      logTelegramSendFailure('sendMessage', chatId, e, meta);
      const desc = (e && e.telegram && e.telegram.description) || '';
      if (!/chat not found|bot was blocked|user is deactivated|peer_id_invalid/i.test(desc)) {
        throw e;
      }
    }
  }

  // محاولة إرسال لمحادثات مكتشفة مسموح بها فقط — بلا ترقية عشوائية
  const discovered = await fetchRecentPrivateChatIds(20);
  for (let j = 0; j < discovered.length; j += 1) {
    const chatId = String(discovered[j].id);
    if (candidates.includes(chatId)) continue;
    if (!canPromoteAdminChat(chatId)) continue;
    try {
      const result = await telegramApi('sendMessage', { chat_id: chatId, text });
      registerAdminChatId(chatId, { source: 'discovered_send', title: discovered[j].title });
      console.warn('[telegram-admin] alert delivered via allowlisted chat_id ' + chatId);
      return { result, chatId, via: 'discovered' };
    } catch (e) {
      lastErr = e;
      logTelegramSendFailure('sendMessage', chatId, e, Object.assign({ via: 'discovered' }, meta));
    }
  }

  const err = lastErr || new Error('telegram_all_chat_ids_failed');
  err.code = 'telegram_all_chat_ids_failed';
  throw err;
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
  if (!token) {
    console.error('[telegram-api] TELEGRAM_BOT_TOKEN is undefined or empty');
    throw new Error('TELEGRAM_BOT_TOKEN missing');
  }

  const url = 'https://api.telegram.org/bot' + token + '/' + method;
  const isSend = /^send/i.test(method);
  const chatId = multipart ? '(multipart)' : (payload && payload.chat_id);
  if (isSend) {
    console.log('[telegram-api] → send attempt', { method, chat_id: chatId, multipart: !!multipart });
  }

  let res;
  try {
    if (multipart) {
      res = await fetch(url, { method: 'POST', body: payload });
    } else {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
  } catch (networkErr) {
    console.error('[telegram-api] ❌ network/request error', {
      method,
      chat_id: chatId,
      message: networkErr && networkErr.message,
      stack: networkErr && networkErr.stack,
    });
    throw networkErr;
  }

  let data = {};
  try {
    data = await res.json();
  } catch (parseErr) {
    console.error('[telegram-api] ❌ invalid JSON response', {
      method,
      chat_id: chatId,
      status: res.status,
      statusText: res.statusText,
      message: parseErr && parseErr.message,
    });
    throw parseErr;
  }

  if (!data.ok) {
    if (isSend) {
      console.error('[telegram-api] ❌ send FAILED', {
        method,
        chat_id: chatId,
        httpStatus: res.status,
        error_code: data.error_code,
        description: data.description,
        diagnostics: getTelegramDiagnostics(),
        response: data,
      });
    }
    const err = new Error(data.description || 'telegram_api_error');
    err.telegram = data;
    err.httpStatus = res.status;
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
  return formatSubRequestCaption(req, aiResult, formatPlausibility);
}

function inlineKeyboard(requestId, opts) {
  if (opts && opts.autoApproved) {
    return { inline_keyboard: [] };
  }
  return {
    inline_keyboard: [[
      { text: '✅ تفعيل الاشتراك', callback_data: 'sr:a:' + requestId },
      { text: '❌ رفض الطلب', callback_data: 'sr:r:' + requestId },
    ]],
  };
}


function loadReceiptDataUrl(req) {
  if (req && req.receiptImage) return req.receiptImage;
  if (!req || !req.receiptPath) return null;
  try {
    const fs = require('fs');
    const { resolveReceiptAbsolute } = require('./receiptStorage');
    const abs = resolveReceiptAbsolute(req.receiptPath);
    if (!abs) return null;
    const buf = fs.readFileSync(abs);
    const mime = (req.receiptMeta && req.receiptMeta.mime) || 'image/jpeg';
    if (!String(mime).startsWith('image/')) return null; // PDF: notify without vision
    return 'data:' + mime + ';base64,' + buf.toString('base64');
  } catch (e) {
    console.warn('[telegram-admin] load receipt:', e.message);
    return null;
  }
}

function parseDataUrl(receiptImage) {
  const m = String(receiptImage || '').match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!m) return null;
  return { mediaType: m[1], buffer: Buffer.from(m[2], 'base64') };
}

async function sendLeadEscalationAlert(lead) {
  const diag = getTelegramDiagnostics();
  if (!isConfigured()) {
    const msg = '[telegram-admin] lead alert skipped — set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID (or TELEGRAM_CHAT_ID) in .env';
    console.error(msg, diag);
    const err = new Error('telegram_admin_not_configured');
    err.code = 'telegram_admin_not_configured';
    err.diagnostics = diag;
    throw err;
  }

  const leadId = lead.leadId || lead.ticketId || lead.id;
  const text = formatLeadAlertText(lead);

  console.log('[telegram-admin] lead alert dispatch (sync)', {
    leadId,
    chatCandidates: buildAlertChatCandidates(),
    hasToken: diag.hasToken,
  });

  try {
    const sent = await sendMessageToAlertChats(text, { leadId, kind: 'lead_alert' });
    console.log('[telegram-admin] lead alert delivered', {
      messageId: sent.result && sent.result.message_id,
      leadId,
      chatId: sent.chatId,
      via: sent.via,
    });
    return sent.result;
  } catch (e) {
    logTelegramSendFailure('sendLeadEscalationAlert', ADMIN_CHAT_ID(), e, { leadId });
    throw e;
  }
}

async function sendWidgetMediaAlert(payload) {
  if (!isConfigured()) {
    const err = new Error('telegram_admin_not_configured');
    err.code = 'telegram_admin_not_configured';
    throw err;
  }

  const caption = formatWidgetMediaCaption(payload);

  const mediaType = payload.mediaType || 'image/jpeg';
  const ext = mediaType.includes('png') ? 'png' : mediaType.includes('webp') ? 'webp' : 'jpg';
  const fileName = String(payload.fileName || 'attachment').replace(/\.(png|jpe?g|webp)$/i, '') + '.' + ext;

  const form = new FormData();
  form.append('chat_id', ADMIN_CHAT_ID());
  form.append('caption', caption);
  form.append('photo', new Blob([payload.imageBuffer], { type: mediaType }), fileName);

  const result = await telegramApi('sendPhoto', form, true);
  console.log('[telegram-admin] widget media alert delivered', {
    messageId: result && result.message_id,
  });
  return result;
}

/** alias — استدعاء موحّد لإشعارات الإدارة */
const sendTelegramNotification = sendLeadEscalationAlert;
const sendTelegramAdminNotification = sendLeadEscalationAlert;

async function sendSubRequestNotification(req, aiResult, opts) {
  if (!isConfigured()) return null;
  opts = opts || {};

  const caption = buildSubRequestCaption(req, aiResult);
  const markup = JSON.stringify(inlineKeyboard(req.id, { autoApproved: !!opts.autoApproved }));
  const chatId = ADMIN_CHAT_ID();

  const parsed = parseDataUrl(loadReceiptDataUrl(req));
  if (parsed && parsed.buffer.length > 0) {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('reply_markup', markup);
    const ext = parsed.mediaType.includes('png') ? 'png' : 'jpg';
    form.append('photo', new Blob([parsed.buffer], { type: parsed.mediaType }), 'receipt.' + ext);
    return telegramApi('sendPhoto', form, true);
  }

  return telegramApi('sendMessage', {
    chat_id: chatId,
    text: caption + '\n\n⚠️ لم تُرفق صورة وصل',
    reply_markup: inlineKeyboard(req.id, { autoApproved: !!opts.autoApproved }),
  });
}

async function editSubRequestMessage(chatId, messageId, text) {
  if (!chatId || messageId == null) return;
  try {
    await telegramApi('editMessageCaption', {
      chat_id: chatId,
      message_id: messageId,
      caption: text,
      reply_markup: { inline_keyboard: [] },
    });
  } catch (e) {
    await telegramApi('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      reply_markup: { inline_keyboard: [] },
    });
  }
}

function isAuthorizedChat(chatId) {
  return buildAlertChatCandidates().includes(String(chatId));
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
 * بعد POST /api/sub-requests — تحليل الوصل + موافقة مبدئية (أخضر) أو تعليق (أصفر/أحمر)
 * ثم إشعار Telegram إن كان مضبوطاً. لا يعتمد تشغيل الموافقة المبدئية على Telegram.
 */
async function processNewSubRequest(requestId, deps) {
  deps = deps || {};
  const { readSubRequests, writeSubRequests, anthropic, readAccounts } = deps;
  if (typeof readSubRequests !== 'function' || typeof writeSubRequests !== 'function') return;

  const { idx, list, req } = findSubRequestById(readSubRequests, requestId);
  if (idx === -1 || !req) return;
  if (req.status !== 'pending') return;

  const accRow = typeof readAccounts === 'function'
    ? readAccounts().find((a) => a.id === req.accountId)
    : null;
  req._phone = (accRow && accRow.phone) || '';
  req._accountPhone = (accRow && accRow.phone) || '';

  // لا نثق أبداً بـ riskLevel / flags القادمة من العميل — فقط تحليل السيرفر
  let aiResult = null;
  let visionRan = false;
  let serverExpectedPrice = Number(req.expectedPrice) || Number(req.price) || 0;
  try {
    const { findCatalogPackage } = require('./catalogConfig');
    const catalogPkg = findCatalogPackage({ pkgName: req.pkg, name: req.pkg, id: req.pkg });
    if (catalogPkg && Number(catalogPkg.price) > 0) {
      serverExpectedPrice = Number(catalogPkg.price);
    }
  } catch (eCat) { /* optional */ }

  if (req.receiptImage && isAnthropicAvailable(deps)) {
    try {
      const analysis = await analyzeReceiptImage(req.receiptImage, {
        expectedPrice: serverExpectedPrice,
        pkgName: req.pkg,
        anthropic,
      });
      aiResult = analysis.result || { plausibilityLevel: 'unreviewed' };
      visionRan = true;
    } catch (e) {
      console.warn('[telegram-admin] receipt analysis:', e && e.message);
      aiResult = { plausibilityLevel: 'unreviewed', notes: ['تعذّر التحليل الآلي'] };
    }
  } else {
    aiResult = {
      plausibilityLevel: req.receiptImage ? 'unreviewed' : 'high',
      notes: req.receiptImage
        ? ['تحليل آلي غير متاح — بانتظار مراجعة بشرية']
        : ['لا يوجد وصل مرفق'],
    };
  }

  // تجاهل أعلام العميل — فقط ملاحظات التحليل الآلي
  const safeReq = Object.assign({}, req, {
    riskLevel: undefined,
    flags: [],
    expectedPrice: serverExpectedPrice,
    price: serverExpectedPrice || req.price,
  });
  const score = scorePackageRequest(safeReq, aiResult);
  const patch = {
    aiAnalysis: aiResult,
    aiAnalyzedAt: new Date().toISOString(),
    riskLevel: aiResult.plausibilityLevel || 'unreviewed',
    clientRiskIgnored: true,
    visionRan,
    serverExpectedPrice,
    provisionalTier: score.provisionalTier,
    provisionalLabelAr: score.provisionalLabelAr,
    provisionalLabelFr: score.provisionalLabelFr,
    provisionalReasons: score.provisionalReasons,
    provisionalAt: score.provisionalAt,
    provisionalBy: score.provisionalBy,
  };
  patchSubRequest(list, idx, patch, writeSubRequests);

  let autoActivated = false;
  // موافقة تلقائية فقط إن شغّل الرؤية فعلاً وأعاد أخضر — بلا ثقة بعميل
  if (visionRan && shouldAutoApprove(score.provisionalTier)) {
    const fresh = findSubRequestById(readSubRequests, requestId);
    if (fresh.idx !== -1 && fresh.req && fresh.req.status === 'pending') {
      const activation = await activateSubRequest(fresh.req, deps);
      if (activation && activation.ok) {
        patchSubRequest(fresh.list, fresh.idx, {
          status: 'approved',
          reviewedAt: new Date().toISOString(),
          reviewedVia: 'agent_provisional',
          paymentConfirmed: true,
          provisionalAutoApproved: true,
        }, writeSubRequests);
        autoActivated = true;
        console.log('[packages-agent] provisional auto-approve:', requestId);
      } else {
        console.warn('[packages-agent] green but activation failed:', activation && activation.error);
      }
    }
  }

  if (!isConfigured()) return;

  try {
    const latest = findSubRequestById(readSubRequests, requestId);
    const notifyReq = latest.req || req;
    notifyReq._phone = req._phone;
    notifyReq._accountPhone = req._accountPhone;
    notifyReq.provisionalTier = score.provisionalTier;
    notifyReq.provisionalAutoApproved = autoActivated;
    const msg = await sendSubRequestNotification(notifyReq, aiResult, {
      provisionalTier: score.provisionalTier,
      autoApproved: autoActivated,
    });
    if (msg && msg.message_id && latest.idx !== -1) {
      patchSubRequest(latest.list, latest.idx, {
        telegramChatId: String(msg.chat?.id || ADMIN_CHAT_ID()),
        telegramMessageId: msg.message_id,
      }, writeSubRequests);
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
  rememberSeenChat(chatId, message.chat);
  if (!text) return { ok: true, ignored: 'no_text' };

  console.log('[telegram-bot] message from chat', chatId, ':', text.slice(0, 80));

  if (text === '/start') {
    let promoted = false;
    if (message.chat && message.chat.type === 'private' && canPromoteAdminChat(chatId)) {
      registerAdminChatId(chatId, {
        source: '/start',
        title: [message.from && message.from.first_name, message.from && message.from.username]
          .filter(Boolean).join(' '),
      });
      promoted = true;
    }
    await telegramApi('sendMessage', {
      chat_id: chatId,
      text: promoted
        ? '👋 مرحباً!\nأنا وكيل رزق الذكي (@RizqOficial_bot).\n✅ تم تثبيت هذه المحادثة كمحادثة إدارة.'
        : '👋 مرحباً!\nأنا وكيل رزق الذكي (@RizqOficial_bot).\nاكتب سؤالك وسأرد عليك.\n\n(محادثة الإدارة مُحدَّدة مسبقاً — /start لا يمنح صلاحيات موافقة الباقات.)',
    });
    console.log('[telegram-bot] /start replied', { chatId, promoted });
    return { ok: true, action: 'welcome', chatIdRegistered: promoted ? chatId : null };
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

  try {
    await telegramApi('sendMessage', {
      chat_id: chatId,
      text: replyText.slice(0, 4096),
    });
    console.log('[telegram-bot] reply sent to chat', chatId, '(', replyText.slice(0, 60), '…)');
  } catch (sendErr) {
    console.error('[telegram-bot] sendMessage failed:', sendErr.message);
  }
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
    await editSubRequestMessage(chatId, messageId, '❌ تم رفض طلب ' + cleanField(name) + '\n\nبواسطة الأدمن عبر Telegram');
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
    '✅ تم تفعيل باقة ' + cleanField(clientName) + ' بنجاح\n\nبواسطة الأدمن عبر Telegram',
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
  getTelegramDiagnostics,
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
  sendWidgetMediaAlert,
  sendTelegramNotification,
  sendTelegramAdminNotification,
  formatPlausibility,
  telegramApi,
  getBotIdentity,
  getUpdatesLongPoll,
  validateAdminChatAtStartup,
  fetchRecentPrivateChatIds,
  buildAlertChatCandidates,
  canPromoteAdminChat,
  isAuthorizedChat,
};
