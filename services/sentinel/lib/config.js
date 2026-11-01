/**
 * إعدادات الحارس من البيئة.
 */
'use strict';

const path = require('path');
const fs = require('fs');

function loadEnvFiles() {
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '..', 'rizq-backend', '.env'),
    path.join(__dirname, '..', '..', '..', '.env'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      require('dotenv').config({ path: p });
    }
  }
}

loadEnvFiles();

const WAKE_WHITELIST = Object.freeze([
  'lifecycle',
  'quota_guard',
  'marketing',
  'moderator',
  'ops_housekeeping',
  'maintenance_daily',
  'maintenance_weekly',
  'investment_ops',
  'currency_rates',
]);

function cfg() {
  const publicBase = String(process.env.PUBLIC_BASE_URL || process.env.SENTINEL_BASE_URL || 'https://rizq.mr').replace(/\/$/, '');
  const backendBase = String(process.env.SENTINEL_BACKEND_URL || process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
  const dbPass = String(process.env.SENTINEL_DB_PASSWORD || process.env.RIZQ_SENTINEL_PASSWORD || '').trim();
  let databaseUrl = String(process.env.SENTINEL_DATABASE_URL || '').trim();
  if (!databaseUrl) {
    const mainUrl = String(process.env.DATABASE_URL || '').trim();
    if (mainUrl && dbPass) {
      try {
        const u = new URL(mainUrl);
        u.username = 'rizq_sentinel';
        u.password = dbPass;
        databaseUrl = u.toString();
      } catch (_) {
        databaseUrl = '';
      }
    }
  }
  return {
    publicBase,
    backendBase,
    databaseUrl,
    dbPass,
    wakeSecret: String(process.env.SENTINEL_WAKE_SECRET || process.env.BACKEND_SHARED_SECRET || '').trim(),
    telegramBotToken: String(process.env.SENTINEL_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    telegramChatId: String(process.env.SENTINEL_TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim(),
    anthropicKey: String(process.env.ANTHROPIC_API_KEY || '').trim(),
    dailyTokenBudget: Math.max(0, Number(process.env.SENTINEL_DAILY_TOKEN_BUDGET) || 50000),
    timezone: String(process.env.SENTINEL_TZ || 'Europe/Madrid'),
    domainExpiry: String(process.env.SENTINEL_DOMAIN_EXPIRY || '').trim(),
    caddyAccessLog: String(process.env.SENTINEL_CADDY_ACCESS_LOG || '/var/log/caddy/access.log').trim(),
    backupDbDir: String(process.env.BACKUP_DB_DIR || '/opt/rizq/backups/db').trim(),
    cloudflareToken: String(process.env.CLOUDFLARE_ANALYTICS_TOKEN || process.env.CF_ANALYTICS_TOKEN || '').trim(),
    cloudflareZone: String(process.env.CLOUDFLARE_ZONE_ID || '').trim(),
    listenPort: Math.max(0, Number(process.env.SENTINEL_LISTEN_PORT) || 3017),
    healthIntervalMs: Math.max(60000, Number(process.env.SENTINEL_HEALTH_MS) || 5 * 60 * 1000),
    activityIntervalMs: Math.max(60000, Number(process.env.SENTINEL_ACTIVITY_MS) || 15 * 60 * 1000),
    journeyCron: String(process.env.SENTINEL_JOURNEY_CRON || '15 * * * *'),
    alertCooldownMs: Math.max(60000, Number(process.env.SENTINEL_ALERT_COOLDOWN_MS) || 30 * 60 * 1000),
    backupMaxAgeHours: Math.max(1, Number(process.env.SENTINEL_BACKUP_MAX_AGE_H) || 26),
    diskAlertPct: Math.max(50, Number(process.env.SENTINEL_DISK_ALERT_PCT) || 85),
    sslAlertDays: Math.max(1, Number(process.env.SENTINEL_SSL_ALERT_DAYS) || 14),
    slowPageMs: Math.max(500, Number(process.env.SENTINEL_SLOW_PAGE_MS) || 3000),
    sentinelEmail: String(process.env.SENTINEL_ACCOUNT_EMAIL || 'sentinel@rizq.mr').trim().toLowerCase(),
    wakeWhitelist: WAKE_WHITELIST,
  };
}

module.exports = { cfg, WAKE_WHITELIST, loadEnvFiles };
