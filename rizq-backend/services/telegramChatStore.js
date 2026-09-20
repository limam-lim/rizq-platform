'use strict';

const fs = require('fs');
const path = require('path');
const repos = require('../db/repos');

const ENV_FILE = path.join(__dirname, '..', '.env');

function readPersistedAdminChat() {
  try {
    const raw = repos.getTelegramChat();
    const chatId = String(raw && raw.chatId || '').trim();
    return chatId || null;
  } catch (e) {
    console.warn('[telegram-chat-store] read error:', e && e.message);
    return null;
  }
}

function writePersistedAdminChat(chatId, meta) {
  meta = meta || {};
  const payload = {
    chatId: String(chatId),
    registeredAt: new Date().toISOString(),
    source: meta.source || 'unknown',
    title: meta.title || '',
  };
  repos.saveTelegramChat(payload);
  return payload;
}

function updateEnvAdminChatId(chatId) {
  const id = String(chatId || '').trim();
  if (!id) return false;
  try {
    let content = '';
    if (fs.existsSync(ENV_FILE)) {
      content = fs.readFileSync(ENV_FILE, 'utf8');
    }
    if (/^TELEGRAM_ADMIN_CHAT_ID=.*/m.test(content)) {
      content = content.replace(/^TELEGRAM_ADMIN_CHAT_ID=.*/m, 'TELEGRAM_ADMIN_CHAT_ID=' + id);
    } else {
      content += (content.endsWith('\n') ? '' : '\n') + 'TELEGRAM_ADMIN_CHAT_ID=' + id + '\n';
    }
    fs.writeFileSync(ENV_FILE, content, 'utf8');
    process.env.TELEGRAM_ADMIN_CHAT_ID = id;
    return true;
  } catch (e) {
    console.error('[telegram-chat-store] .env update failed:', e && e.message);
    return false;
  }
}

function registerAdminChatId(chatId, meta) {
  meta = meta || {};
  const id = String(chatId || '').trim();
  if (!id) return null;
  const record = writePersistedAdminChat(id, meta);
  const envUpdated = updateEnvAdminChatId(id);
  console.log('[telegram-chat-store] admin chat registered', {
    chatId: id,
    source: meta.source || 'unknown',
    envUpdated,
  });
  return record;
}

module.exports = {
  readPersistedAdminChat,
  writePersistedAdminChat,
  updateEnvAdminChatId,
  registerAdminChatId,
};
