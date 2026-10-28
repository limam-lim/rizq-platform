/**
 * corpApiIntegration.js — async PostgreSQL model for Diamond Pro API keys
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

async function findByCompanyId(companyId) {
  const row = await sql.queryOne(`${SELECT_BASE} WHERE company_id = ?`, [String(companyId)]);
  return mapRow(row);
}

async function findByPrefix(prefix) {
  const row = await sql.queryOne(`${SELECT_BASE} WHERE api_key_prefix = ?`, [String(prefix)]);
  return mapRow(row);
}

async function upsert(record) {
  const now = new Date().toISOString();
  await sql.execute(
    `INSERT INTO corp_api_integrations (
      company_id, api_key_hash, api_key_prefix, api_status,
      allowed_origin_ip, last_used_at, created_at, updated_at
    ) VALUES (
      @company_id, @api_key_hash, @api_key_prefix, @api_status,
      @allowed_origin_ip, @last_used_at, @created_at, @updated_at
    )
    ON CONFLICT (company_id) DO UPDATE SET
      api_key_hash = EXCLUDED.api_key_hash,
      api_key_prefix = EXCLUDED.api_key_prefix,
      api_status = EXCLUDED.api_status,
      allowed_origin_ip = COALESCE(EXCLUDED.allowed_origin_ip, corp_api_integrations.allowed_origin_ip),
      last_used_at = EXCLUDED.last_used_at,
      updated_at = EXCLUDED.updated_at,
      updated_at_ts = NOW()`,
    {
      company_id: String(record.companyId),
      api_key_hash: String(record.apiKeyHash),
      api_key_prefix: String(record.apiKeyPrefix),
      api_status: record.apiStatus || 'active',
      allowed_origin_ip: record.allowedOriginIp || null,
      last_used_at: record.lastUsedAt || null,
      created_at: record.createdAt || now,
      updated_at: now,
    }
  );
  return findByCompanyId(record.companyId);
}

async function updateStatus(companyId, apiStatus) {
  const now = new Date().toISOString();
  const r = await sql.execute(
    `UPDATE corp_api_integrations
     SET api_status = ?, updated_at = ?, updated_at_ts = NOW()
     WHERE company_id = ?`,
    [apiStatus, now, String(companyId)]
  );
  return r.changes > 0 ? findByCompanyId(companyId) : null;
}

async function updateAllowedIp(companyId, allowedOriginIp) {
  const now = new Date().toISOString();
  const r = await sql.execute(
    `UPDATE corp_api_integrations
     SET allowed_origin_ip = ?, updated_at = ?, updated_at_ts = NOW()
     WHERE company_id = ?`,
    [allowedOriginIp || null, now, String(companyId)]
  );
  return r.changes > 0 ? findByCompanyId(companyId) : null;
}

async function touchLastUsed(companyId) {
  const now = new Date().toISOString();
  await sql.execute(
    `UPDATE corp_api_integrations
     SET last_used_at = ?, updated_at = ?, updated_at_ts = NOW()
     WHERE company_id = ?`,
    [now, now, String(companyId)]
  );
}

async function listAll() {
  const rows = await sql.query(`${SELECT_BASE} ORDER BY created_at DESC`);
  return rows.map(mapRow);
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
