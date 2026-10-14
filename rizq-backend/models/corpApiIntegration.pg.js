/**
 * Corporate API keys — PostgreSQL sync (tenant-scoped)
 */
'use strict';

const sql = require('../db/sql');

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
  return mapRow(sql.queryOneSync(`${SELECT_BASE} WHERE company_id = ?`, [String(companyId)]));
}

function findByPrefix(prefix) {
  return mapRow(sql.queryOneSync(`${SELECT_BASE} WHERE api_key_prefix = ?`, [String(prefix)]));
}

function upsert(record) {
  const now = new Date().toISOString();
  sql.executeSync(
    `INSERT INTO corp_api_integrations (
      company_id, api_key_hash, api_key_prefix, api_status,
      allowed_origin_ip, last_used_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (company_id) DO UPDATE SET
      api_key_hash = EXCLUDED.api_key_hash,
      api_key_prefix = EXCLUDED.api_key_prefix,
      api_status = EXCLUDED.api_status,
      allowed_origin_ip = COALESCE(EXCLUDED.allowed_origin_ip, corp_api_integrations.allowed_origin_ip),
      last_used_at = EXCLUDED.last_used_at,
      updated_at = EXCLUDED.updated_at`,
    [
      String(record.companyId), String(record.apiKeyHash), String(record.apiKeyPrefix),
      record.apiStatus || 'active', record.allowedOriginIp || null, record.lastUsedAt || null,
      record.createdAt || now, now,
    ]
  );
  return findByCompanyId(record.companyId);
}

function updateStatus(companyId, apiStatus) {
  const now = new Date().toISOString();
  const r = sql.executeSync(
    'UPDATE corp_api_integrations SET api_status = ?, updated_at = ? WHERE company_id = ?',
    [apiStatus, now, String(companyId)]
  );
  return r.changes > 0 ? findByCompanyId(companyId) : null;
}

function updateAllowedIp(companyId, allowedOriginIp) {
  const now = new Date().toISOString();
  const r = sql.executeSync(
    'UPDATE corp_api_integrations SET allowed_origin_ip = ?, updated_at = ? WHERE company_id = ?',
    [allowedOriginIp || null, now, String(companyId)]
  );
  return r.changes > 0 ? findByCompanyId(companyId) : null;
}

function touchLastUsed(companyId) {
  const now = new Date().toISOString();
  sql.executeSync(
    'UPDATE corp_api_integrations SET last_used_at = ?, updated_at = ? WHERE company_id = ?',
    [now, now, String(companyId)]
  );
}

function listAll() {
  return sql.querySync(`${SELECT_BASE} ORDER BY created_at DESC`).map(mapRow);
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
  findByCompanyId, findByPrefix, upsert, updateStatus, updateAllowedIp,
  touchLastUsed, listAll, toPublicView,
};
