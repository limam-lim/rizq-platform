/**
 * routes/integration.js — Corp Diamond Pro API integration (management + v1 external)
 * External routes are sandboxed: read-only catalog + structured inquiry submission only.
 */
'use strict';

const rateLimit = require('express-rate-limit');
const { asyncHandler, sendError } = require('../middleware/errors');
const { requireCorpApiKey } = require('../middleware/apiKeyAuth');
const {
  rejectNonJsonContent,
  requireIntegrationPayload,
} = require('../middleware/integrationPayloadGuard');
const {
  ensureApiKeyForCompany,
  regenerateApiKey,
  getIntegrationStatus,
  updateAllowedOriginIp,
  isCorpDiamondProEntitled,
} = require('../services/apiIntegration');
const { assertAccountFeature } = require('../services/packageAccessGuard');
const CorpApiIntegration = require('../models/corpApiIntegration');

const integrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'تجاوزت حد الطلبات — حاول لاحقاً', code: 'RATE_LIMIT' },
});

const externalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.apiCompanyId || req.ip,
  message: { ok: false, error: 'تجاوزت حد طلبات API — حاول لاحقاً', code: 'RATE_LIMIT' },
});

function setupIntegrationAPI(app, deps) {
  deps = deps || {};
  const {
    verifyAccountOwner,
    readAccounts,
    readCatalog,
    readMessages,
    writeMessages,
    requireSharedSecret,
  } = deps;

  if (!app || typeof verifyAccountOwner !== 'function') {
    throw new Error('setupIntegrationAPI requires app + verifyAccountOwner');
  }

  function ownerGuard(accountId, token) {
    const acc = verifyAccountOwner(accountId, token);
    if (!acc) return { ok: false, status: 401, error: 'unauthorized' };
    if (acc.type !== 'corp') {
      return { ok: false, status: 403, error: 'متاح لحسابات الشركات فقط', code: 'CORP_ONLY' };
    }
    try {
      assertAccountFeature(acc, 'api_erp_integration');
    } catch (e) {
      return { ok: false, status: e.status || 403, error: e.message, code: e.code };
    }
    return { ok: true, acc };
  }

  /** GET /api/integration/status/:accountId — owner dashboard */
  app.get('/api/integration/status/:accountId', integrationLimiter, (req, res) => {
    const accountId = String(req.params.accountId || '').trim();
    const token = req.header('x-account-token') || req.query.token || '';
    const guard = ownerGuard(accountId, token);
    if (!guard.ok) return sendError(res, guard.status, guard.error, guard.code);

    let status = getIntegrationStatus(accountId, guard.acc.type);
    if (status.entitled && !status.hasKey) {
      const created = ensureApiKeyForCompany(accountId, guard.acc.type);
      if (created.ok && created.integration) {
        status = {
          ok: true,
          entitled: true,
          hasKey: true,
          integration: created.integration,
          justCreated: !!created.created,
        };
      }
    }
    res.json({ ok: true, ...status });
  });

  /** POST /api/integration/key/:accountId/regenerate — rotate key (owner) */
  app.post('/api/integration/key/:accountId/regenerate', integrationLimiter, (req, res) => {
    const accountId = String(req.params.accountId || '').trim();
    const token = req.header('x-account-token') || '';
    const guard = ownerGuard(accountId, token);
    if (!guard.ok) return sendError(res, guard.status, guard.error, guard.code);

    const result = regenerateApiKey(accountId, guard.acc.type);
    if (!result.ok) return sendError(res, 403, result.error, result.code);
    res.json(result);
  });

  /** PATCH /api/integration/key/:accountId — update IP allowlist (owner) */
  app.patch('/api/integration/key/:accountId', integrationLimiter, (req, res) => {
    const accountId = String(req.params.accountId || '').trim();
    const token = req.header('x-account-token') || '';
    const guard = ownerGuard(accountId, token);
    if (!guard.ok) return sendError(res, guard.status, guard.error, guard.code);

    const body = req.body || {};
    const allowedKeys = ['allowedOriginIp', 'allowed_origin_ip'];
    const hasIpField = allowedKeys.some((k) => k in body);
    if (!hasIpField) {
      return sendError(res, 400, 'allowedOriginIp مطلوب', 'MISSING_FIELD');
    }
    const ipVal = body.allowedOriginIp != null ? body.allowedOriginIp : body.allowed_origin_ip;
    const result = updateAllowedOriginIp(accountId, guard.acc.type, ipVal);
    if (!result.ok) return sendError(res, 400, result.error, result.code);
    res.json(result);
  });

  /** GET /api/integration/admin/list — admin overview (shared secret) */
  if (typeof requireSharedSecret === 'function') {
    app.get('/api/integration/admin/list', requireSharedSecret, (req, res) => {
      const rows = CorpApiIntegration.listAll().map((row) => {
        const acc = typeof readAccounts === 'function'
          ? readAccounts().find((a) => a.id === row.companyId)
          : null;
        return {
          companyId: row.companyId,
          companyName: acc ? (acc.name || acc.id) : row.companyId,
          apiStatus: row.apiStatus,
          keyPrefix: `rizq_live_${row.apiKeyPrefix}…`,
          allowedOriginIp: row.allowedOriginIp,
          lastUsedAt: row.lastUsedAt,
          createdAt: row.createdAt,
          entitled: isCorpDiamondProEntitled(row.companyId, 'corp'),
        };
      });
      res.json({ ok: true, integrations: rows });
    });

    app.get('/api/integration/admin/:accountId', requireSharedSecret, (req, res) => {
      const accountId = String(req.params.accountId || '').trim();
      const status = getIntegrationStatus(accountId, 'corp');
      res.json({ ok: true, ...status });
    });
  }

  // ── External v1 API (Bearer rizq_live_*) — sandboxed, no OS/file access ──
  const v1 = [
    externalLimiter,
    requireCorpApiKey,
  ];

  app.get('/api/v1/integration/health', ...v1, (req, res) => {
    res.json({
      ok: true,
      service: 'rizq-integration',
      companyId: req.apiCompanyId,
      status: 'active',
      timestamp: new Date().toISOString(),
    });
  });

  app.get(
    '/api/v1/integration/catalog',
    ...v1,
    requireIntegrationPayload('catalogQuery'),
    asyncHandler((req, res) => {
      if (typeof readCatalog !== 'function') {
        return sendError(res, 503, 'الخدمة غير متاحة', 'SERVICE_UNAVAILABLE');
      }
      const q = req.sanitizedBody || {};
      const limit = Math.min(q.limit || 50, 100);
      const offset = q.offset || 0;
      let items = readCatalog().filter(
        (it) => it.accountId === req.apiCompanyId && it.status === 'active'
      );
      if (q.kind) items = items.filter((it) => it.kind === q.kind);
      items = items
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(offset, offset + limit)
        .map((it) => ({
          id: it.id,
          kind: it.kind,
          name: it.name,
          nameFr: it.nameFr || '',
          price: it.price || '',
          category: it.cat || '',
          description: it.desc || '',
          stock: it.stock || '',
          image: it.image || (Array.isArray(it.images) ? it.images[0] : null),
          updatedAt: it.updatedAt || it.createdAt,
        }));

      res.json({
        ok: true,
        companyId: req.apiCompanyId,
        count: items.length,
        items,
      });
    })
  );

  app.post(
    '/api/v1/integration/inquiries',
    ...v1,
    rejectNonJsonContent,
    requireIntegrationPayload('inquiry'),
    asyncHandler((req, res) => {
      if (typeof readMessages !== 'function' || typeof writeMessages !== 'function') {
        return sendError(res, 503, 'الخدمة غير متاحة', 'SERVICE_UNAVAILABLE');
      }

      const b = req.sanitizedBody;
      const companyId = req.apiCompanyId;
      const guestPhone = String(b.guestPhone).replace(/\D/g, '').slice(-15);
      const threadKey = companyId + '::erp:guest:' + guestPhone;
      const list = readMessages();
      const rec = {
        id: 'ERP-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        threadKey,
        sellerAccountId: companyId,
        buyerAccountId: null,
        buyerName: b.guestName,
        buyerPhone: b.guestPhone,
        adId: b.externalRef || null,
        adTitle: b.subject || 'ERP/PMS Integration',
        body: b.message,
        fromRole: 'buyer',
        source: 'api_integration',
        externalRef: b.externalRef || null,
        metadata: b.metadata || null,
        read: false,
        createdAt: new Date().toISOString(),
      };
      list.push(rec);
      writeMessages(list);

      res.status(201).json({
        ok: true,
        inquiryId: rec.id,
        companyId,
        threadKey,
        receivedAt: rec.createdAt,
      });
    })
  );
}

module.exports = { setupIntegrationAPI };
