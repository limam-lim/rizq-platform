#!/usr/bin/env node
'use strict';

/**
 * تسجيل webhook Telegram عندما يصبح النطاق (rizq.mr) متاحاً على الإنترنت.
 *
 * Usage:
 *   node scripts/setup-telegram-webhook.js
 *   node scripts/setup-telegram-webhook.js https://rizq.mr
 *
 * يقرأ TELEGRAM_BOT_TOKEN و PUBLIC_BASE_URL من .env
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const {
  isBotConfigured,
  deleteWebhook,
  registerWebhook,
  webhookSecret,
} = require('../services/telegramAdmin');

async function main() {
  const baseUrl = (process.argv[2] || process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

  if (!isBotConfigured()) {
    console.error('❌ TELEGRAM_BOT_TOKEN غير مضبوط في .env');
    process.exit(1);
  }
  if (!baseUrl) {
    console.error('❌ PUBLIC_BASE_URL مطلوب — مثال:');
    console.error('   node scripts/setup-telegram-webhook.js https://rizq.mr');
    process.exit(1);
  }

  console.log('[telegram] إزالة webhook/polling السابق...');
  await deleteWebhook();

  console.log('[telegram] تسجيل webhook → ' + baseUrl + '/api/telegram/webhook');
  const out = await registerWebhook(baseUrl);
  if (!out.ok) {
    console.error('❌ فشل:', out.error || out);
    process.exit(1);
  }

  console.log('✅ تم تسجيل webhook بنجاح');
  console.log('   URL:', out.webhookUrl);
  console.log('   secret_token:', webhookSecret() ? '(configured — يُرسل في X-Telegram-Bot-Api-Secret-Token)' : '(auto-generated from token hash)');
  console.log('\n⚠️  عطّل TELEGRAM_USE_POLLING في .env على الإنتاج (أو اضبطه false).');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
