/**
 * corpApiIntegration.js — SQLite model for Diamond Pro corporate API keys
 * Multi-tenant: each row is scoped to one company_id (account id).
 */
const { db } = require('../db');

const SELECT_BASE = `
  SELECT company_id, api_key_hash, api_key_prefix, api_status,
         allowed_origin_ip, last_used_at, created_at, updated_at
  FROM corp_api_integrations
`;

function mapRow(row) {
  if (!row) return null;
  return {
    companyId: row.company_id,
    apiKeyHash: row.api_key_hash,
    apiKeyPrefix: row.api_key_prefix,
    apiStatus: row.api_status,
    allowedOriginIp: row.allowed_origin_ip || null,
    lastUsedAt: row.last_used_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findByCompanyId(companyId) {
  const row = db.prepare(`${SELECT_BASE} WHERE company_id = ?`).get(String(companyId));
  return mapRow(row);
}

function findByPrefix(prefix) {
  const row = db.prepare(`${SELECT_BASE} WHERE api_key_prefix = ?`).get(String(prefix));
  return mapRow(row);
}

function upsert(record) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO corp_api_integrations (
      company_id, api_key_hash, api_key_prefix, api_status,
      allowed_origin_ip, last_used_at, created_at, updated_at
    ) VALUES (
      @company_id, @api_key_hash, @api_key_prefix, @api_status,
      @allowed_origin_ip, @last_used_at, @created_at, @updated_at
    )
    ON CONFLICT(company_id) DO UPDATE SET
      api_key_hash = excluded.api_key_hash,
      api_key_prefix = excluded.api_key_prefix,
      api_status = excluded.api_status,
      allowed_origin_ip = COALESCE(excluded.allowed_origin_ip, corp_api_integrations.allowed_origin_ip),
      last_used_at = excluded.last_used_at,
      updated_at = excluded.updated_at
  `).run({
    company_id: String(record.companyId),
    api_key_hash: String(record.apiKeyHash),
    api_key_prefix: String(record.apiKeyPrefix),
    api_status: record.apiStatus || 'active',
    allowed_origin_ip: record.allowedOriginIp || null,
    last_used_at: record.lastUsedAt || null,
    created_at: record.createdAt || now,
    updated_at: now,
  });
  return findByCompanyId(record.companyId);
}

function updateStatus(companyId, apiStatus) {
  const now = new Date().toISOString();
  const r = db.prepare(`
    UPDATE corp_api_integrations
    SET api_status = ?, updated_at = ?
    WHERE company_id = ?
  `).run(apiStatus, now, String(companyId));
  return r.changes > 0 ? findByCompanyId(companyId) : null;
}

function updateAllowedIp(companyId, allowedOriginIp) {
  const now = new Date().toISOString();
  const r = db.prepare(`
    UPDATE corp_api_integrations
    SET allowed_origin_ip = ?, updated_at = ?
    WHERE company_id = ?
  `).run(allowedOriginIp || null, now, String(companyId));
  return r.changes > 0 ? findByCompanyId(companyId) : null;
}

function touchLastUsed(companyId) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE corp_api_integrations
    SET last_used_at = ?, updated_at = ?
    WHERE company_id = ?
  `).run(now, now, String(companyId));
}

function listAll() {
  return db.prepare(`${SELECT_BASE} ORDER BY created_at DESC`).all().map(mapRow);
}

function toPublicView(row, plainKey) {
  if (!row) return null;
  return {
    companyId: row.companyId,
    apiStatus: row.apiStatus,
    allowedOriginIp: row.allowedOriginIp,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    keyPrefix: row.apiKeyPrefix ? `rizq_live_${row.apiKeyPrefix}…` : null,
    apiKey: plainKey || null,
    hasKey: true,
  };
}

module.exports = {
  findByCompanyId,
  findByPrefix,
  upsert,
  updateStatus,
  updateAllowedIp,
  touchLastUsed,
  listAll,
  toPublicView,
};
