/**
 * apiKeyAuth.js — Bearer rizq_live_* authentication for external integrations
 */
'use strict';

const { sendError } = require('./errors');
const { authenticateApiKeyRequest } = require('../services/apiIntegration');
const { getEntitlements, hasFeature } = require('../services/entitlements');

function requireCorpApiKey(req, res, next) {
  const authResult = authenticateApiKeyRequest(req);
  if (!authResult.ok) {
    return sendError(res, authResult.status, authResult.error, authResult.code);
  }

  const ent = getEntitlements(authResult.companyId, 'corp');
  if (!hasFeature(ent, 'api_erp_integration')) {
    return sendError(res, 403, 'اشتراك الماسية Pro للشركات غير نشط', 'PLAN_REQUIRED');
  }

  req.apiIntegration = authResult.integration;
  req.apiCompanyId = authResult.companyId;
  req.apiClientIp = authResult.clientIp;
  next();
}

module.exports = { requireCorpApiKey };
