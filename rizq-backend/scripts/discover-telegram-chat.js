#!/usr/bin/env node
'use strict';

/**
 * يكتشف chat_id صالحاً من رسائل Telegram الأخيرة (أوقف السيرفر أولاً إن كان polling نشطاً).
 * Usage: node scripts/discover-telegram-chat.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
  fetchRecentPrivateChatIds,
  telegramApi,
  isBotConfigured,
} = require('../services/telegramAdmin');
const { registerAdminChatId, readPersistedAdminChat } = require('../services/telegramChatStore');

async function main() {
  if (!isBotConfigured()) {
    console.error('❌ TELEGRAM_BOT_TOKEN missing in rizq-backend/.env');
    process.exit(1);
  }

  const persisted = readPersistedAdminChat();
  if (persisted) {
    try {
      await telegramApi('getChat', { chat_id: persisted });
      console.log('✅ Persisted admin chat valid:', persisted);
      process.exit(0);
    } catch (e) {
      console.warn('⚠ Persisted chat invalid:', persisted, '—', e.message);
    }
  }

  const chats = await fetchRecentPrivateChatIds(25);
  if (!chats.length) {
    console.log('');
    console.log('No chats found in getUpdates.');
    console.log('1. Open Telegram → search @RizqOficial_bot');
    console.log('2. Press Start (or send any message)');
    console.log('3. Re-run: node scripts/discover-telegram-chat.js');
    console.log('');
    console.log('Tip: stop npm start first — polling consumes updates.');
    process.exit(2);
  }

  console.log('Recent bot conversations:');
  for (let i = 0; i < chats.length; i += 1) {
    const c = chats[i];
    console.log('  chat_id=' + c.id + '  type=' + c.type + '  name=' + (c.title || '(unknown)'));
    try {
      await telegramApi('getChat', { chat_id: c.id });
      registerAdminChatId(c.id, { source: 'discover_script', title: c.title });
      console.log('');
      console.log('✅ TELEGRAM_ADMIN_CHAT_ID updated in .env →', c.id);
      process.exit(0);
    } catch (e) {
      console.warn('    skip (invalid):', e.message);
    }
  }
  console.error('❌ No valid chat_id among discovered conversations.');
  process.exit(3);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
