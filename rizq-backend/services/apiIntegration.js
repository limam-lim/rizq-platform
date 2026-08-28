/**
 * apiIntegration.js — Secure API key lifecycle for Corp Diamond Pro
 * Auto-generates rizq_live_* keys on subscription confirmation.
 */
'use strict';

const crypto = require('crypto');
const CorpApiIntegration = require('../models/corpApiIntegration');
const { getEntitlements, hasFeature } = require('./entitlements');

const KEY_PREFIX = 'rizq_live_';
const KEY_RANDOM_BYTES = 32;

function getPepper() {
  return process.env.API_KEY_PEPPER
    || process.env.BACKEND_SHARED_SECRET
    || 'rizq-api-pepper-change-in-production';
}

function hashApiKey(plainKey) {
  return crypto.createHmac('sha256', getPepper()).update(String(plainKey)).digest('hex');
}

function extractKeyPrefix(plainKey) {
  const raw = String(plainKey || '');
  if (!raw.startsWith(KEY_PREFIX)) return null;
  const body = raw.slice(KEY_PREFIX.length);
  return body.slice(0, 12);
}

function generatePlainApiKey() {
  const randomPart = crypto.randomBytes(KEY_RANDOM_BYTES).toString('base64url');
  return KEY_PREFIX + randomPart;
}

function isCorpDiamondProEntitled(accountId, accountType) {
  const ent = getEntitlements(accountId, accountType || 'corp');
  return ent.accountType === 'corp'
    && hasFeature(ent, 'api_erp_integration')
    && ent.subscriptionStatus !== 'expired'
    && ent.subscriptionStatus !== 'suspended'
    && ent.subscriptionStatus !== 'pending'
    && ent.subscriptionStatus !== 'no_subscription';
}

function verifyPlainKey(plainKey) {
  const prefix = extractKeyPrefix(plainKey);
  if (!prefix) return null;
  const row = CorpApiIntegration.findByPrefix(prefix);
  if (!row) return null;
  const expected = hashApiKey(plainKey);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(row.apiKeyHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return row;
}

function ensureApiKeyForCompany(companyId, accountType) {
  if (!companyId) return { ok: false, error: 'company_id_required' };
  if (!isCorpDiamondProEntitled(companyId, accountType)) {
    return { ok: false, error: 'not_entitled', code: 'PLAN_REQUIRED' };
  }

  const existing = CorpApiIntegration.findByCompanyId(companyId);
  if (existing && existing.apiStatus === 'active') {
    return {
      ok: true,
      created: false,
      integration: CorpApiIntegration.toPublicView(existing),
    };
  }

  const plainKey = generatePlainApiKey();
  const prefix = extractKeyPrefix(plainKey);
  const now = new Date().toISOString();
  const saved = CorpApiIntegration.upsert({
    companyId,
    apiKeyHash: hashApiKey(plainKey),
    apiKeyPrefix: prefix,
    apiStatus: 'active',
    allowedOriginIp: existing ? existing.allowedOriginIp : null,
    lastUsedAt: existing ? existing.lastUsedAt : null,
    createdAt: existing ? existing.createdAt : now,
  });

  return {
    ok: true,
    created: true,
    integration: CorpApiIntegration.toPublicView(saved, plainKey),
  };
}

function regenerateApiKey(companyId, accountType) {
  if (!isCorpDiamondProEntitled(companyId, accountType)) {
    return { ok: false, error: 'not_entitled', code: 'PLAN_REQUIRED' };
  }
  const plainKey = generatePlainApiKey();
  const prefix = extractKeyPrefix(plainKey);
  const existing = CorpApiIntegration.findByCompanyId(companyId);
  const now = new Date().toISOString();
  const saved = CorpApiIntegration.upsert({
    companyId,
    apiKeyHash: hashApiKey(plainKey),
    apiKeyPrefix: prefix,
    apiStatus: 'active',
    allowedOriginIp: existing ? existing.allowedOriginIp : null,
    lastUsedAt: null,
    createdAt: existing ? existing.createdAt : now,
  });
  return {
    ok: true,
    regenerated: true,
    integration: CorpApiIntegration.toPublicView(saved, plainKey),
  };
}

function getIntegrationStatus(companyId, accountType, opts) {
  opts = opts || {};
  const entitled = isCorpDiamondProEntitled(companyId, accountType);
  const row = CorpApiIntegration.findByCompanyId(companyId);
  if (!row) {
    return {
      ok: true,
      entitled,
      hasKey: false,
      integration: null,
      message: entitled
        ? 'لم يُنشأ مفتاح API بعد — سيُولَّد تلقائياً عند تأكيد الاشتراك'
        : 'متاح حصرياً لباقة الماسية Pro للشركات',
    };
  }
  const view = CorpApiIntegration.toPublicView(row, opts.includePlainKey ? null : null);
  return { ok: true, entitled, hasKey: true, integration: view };
}

function suspendApiKey(companyId) {
  const row = CorpApiIntegration.findByCompanyId(companyId);
  if (!row) return { ok: true, skipped: true };
  CorpApiIntegration.updateStatus(companyId, 'suspended');
  return { ok: true, suspended: true };
}

function activateApiKey(companyId, accountType) {
  if (!isCorpDiamondProEntitled(companyId, accountType)) {
    return suspendApiKey(companyId);
  }
  const row = CorpApiIntegration.findByCompanyId(companyId);
  if (!row) return ensureApiKeyForCompany(companyId, accountType);
  CorpApiIntegration.updateStatus(companyId, 'active');
  return {
    ok: true,
    activated: true,
    integration: CorpApiIntegration.toPublicView(CorpApiIntegration.findByCompanyId(companyId)),
  };
}

function updateAllowedOriginIp(companyId, accountType, ipValue) {
  if (!isCorpDiamondProEntitled(companyId, accountType)) {
    return { ok: false, error: 'not_entitled', code: 'PLAN_REQUIRED' };
  }
  const row = CorpApiIntegration.findByCompanyId(companyId);
  if (!row) return { ok: false, error: 'no_api_key', code: 'NO_KEY' };

  let normalized = null;
  if (ipValue != null && String(ipValue).trim()) {
    const parts = String(ipValue).split(',').map((s) => s.trim()).filter(Boolean);
    const valid = parts.every((ip) => /^[\d.a-fA-F:]+$/.test(ip) && ip.length <= 45);
    if (!valid || parts.length > 10) {
      return { ok: false, error: 'invalid_ip', code: 'INVALID_IP' };
    }
    normalized = parts.join(',');
  }

  const updated = CorpApiIntegration.updateAllowedIp(companyId, normalized);
  return {
    ok: true,
    integration: CorpApiIntegration.toPublicView(updated),
  };
}

function assertIpAllowed(row, clientIp) {
  if (!row || !row.allowedOriginIp) return true;
  const allowed = row.allowedOriginIp.split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.length) return true;
  const ip = String(clientIp || '').replace(/^::ffff:/, '');
  return allowed.includes(ip);
}

function resolveClientIp(req) {
  const forwarded = req.header('x-forwarded-for');
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || '';
}

function authenticateApiKeyRequest(req) {
  const auth = req.header('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return { ok: false, status: 401, code: 'AUTH_REQUIRED', error: 'Authorization: Bearer <rizq_live_...> مطلوب' };
  }
  const plainKey = auth.slice(7).trim();
  if (!plainKey.startsWith(KEY_PREFIX) || plainKey.length < KEY_PREFIX.length + 16) {
    return { ok: false, status: 401, code: 'INVALID_KEY_FORMAT', error: 'صيغة مفتاح API غير صالحة' };
  }

  const row = verifyPlainKey(plainKey);
  if (!row) {
    return { ok: false, status: 401, code: 'INVALID_KEY', error: 'مفتاح API غير صالح' };
  }
  if (row.apiStatus !== 'active') {
    return { ok: false, status: 403, code: 'KEY_SUSPENDED', error: 'مفتاح API موقوف — جدّد اشتراك الماسية Pro' };
  }

  const clientIp = resolveClientIp(req);
  if (!assertIpAllowed(row, clientIp)) {
    return { ok: false, status: 403, code: 'IP_NOT_ALLOWED', error: 'عنوان IP غير مصرح به لهذا المفتاح' };
  }

  CorpApiIntegration.touchLastUsed(row.companyId);
  return {
    ok: true,
    integration: row,
    companyId: row.companyId,
    clientIp,
  };
}

function onSubscriptionActivated(accountId, accountType, planType) {
  if (accountType !== 'corp' || planType !== 'corp_diamond_pro') {
    return suspendApiKey(accountId);
  }
  return ensureApiKeyForCompany(accountId, accountType);
}

function onSubscriptionExpired(accountId) {
  return suspendApiKey(accountId);
}

module.exports = {
  KEY_PREFIX,
  generatePlainApiKey,
  hashApiKey,
  extractKeyPrefix,
  verifyPlainKey,
  isCorpDiamondProEntitled,
  ensureApiKeyForCompany,
  regenerateApiKey,
  getIntegrationStatus,
  suspendApiKey,
  activateApiKey,
  updateAllowedOriginIp,
  authenticateApiKeyRequest,
  resolveClientIp,
  onSubscriptionActivated,
  onSubscriptionExpired,
};
