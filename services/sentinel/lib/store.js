/**
 * كتابة/قراءة جداول الحارس.
 */
'use strict';

const crypto = require('crypto');
const db = require('./db');

function newId(prefix) {
  return (prefix || 's') + '_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

async function insertEvent(row) {
  const id = row.id || newId('evt');
  await db.query(
    `INSERT INTO sentinel_events (id, kind, severity, source, summary, payload, created_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb, COALESCE($7::timestamptz, NOW()))`,
    [
      id,
      String(row.kind || 'event').slice(0, 80),
      String(row.severity || 'info').slice(0, 40),
      String(row.source || 'sentinel').slice(0, 80),
      String(row.summary || '').slice(0, 2000),
      JSON.stringify(row.payload || {}),
      row.createdAt || null,
    ]
  );
  return id;
}

async function listEvents(limit) {
  const n = Math.max(1, Math.min(200, Number(limit) || 50));
  const r = await db.query(
    `SELECT id, kind, severity, source, summary, payload, created_at AS "createdAt"
     FROM sentinel_events ORDER BY created_at DESC LIMIT $1`,
    [n]
  );
  return r.rows;
}

async function insertReport(row) {
  const id = row.id || newId('rep');
  await db.query(
    `INSERT INTO sentinel_reports (id, report_type, title, body, metrics, created_at)
     VALUES ($1,$2,$3,$4,$5::jsonb, COALESCE($6::timestamptz, NOW()))`,
    [
      id,
      String(row.reportType || 'daily').slice(0, 40),
      String(row.title || '').slice(0, 400),
      String(row.body || '').slice(0, 50000),
      JSON.stringify(row.metrics || {}),
      row.createdAt || null,
    ]
  );
  return id;
}

async function listReports(limit) {
  const n = Math.max(1, Math.min(100, Number(limit) || 20));
  const r = await db.query(
    `SELECT id, report_type AS "reportType", title, body, metrics, created_at AS "createdAt"
     FROM sentinel_reports ORDER BY created_at DESC LIMIT $1`,
    [n]
  );
  return r.rows;
}

async function insertSuggestion(row) {
  const id = row.id || newId('sug');
  await db.query(
    `INSERT INTO sentinel_suggestions
      (id, category, title, body, impact_rank, status, source, meta, created_at)
     VALUES ($1,$2,$3,$4,$5,'pending_owner',$6,$7::jsonb, NOW())`,
    [
      id,
      String(row.category || 'knowledge').slice(0, 60),
      String(row.title || '').slice(0, 400),
      String(row.body || '').slice(0, 20000),
      Math.max(1, Math.min(5, Number(row.impactRank) || 3)),
      String(row.source || 'claude').slice(0, 40),
      JSON.stringify(row.meta || {}),
    ]
  );
  return id;
}

async function listSuggestions(status, limit) {
  const n = Math.max(1, Math.min(100, Number(limit) || 50));
  if (status) {
    const r = await db.query(
      `SELECT id, category, title, body, impact_rank AS "impactRank", status, source, meta,
              created_at AS "createdAt", reviewed_at AS "reviewedAt", reviewed_by AS "reviewedBy"
       FROM sentinel_suggestions WHERE status = $1
       ORDER BY impact_rank ASC, created_at DESC LIMIT $2`,
      [String(status), n]
    );
    return r.rows;
  }
  const r = await db.query(
    `SELECT id, category, title, body, impact_rank AS "impactRank", status, source, meta,
            created_at AS "createdAt", reviewed_at AS "reviewedAt", reviewed_by AS "reviewedBy"
     FROM sentinel_suggestions ORDER BY created_at DESC LIMIT $1`,
    [n]
  );
  return r.rows;
}

async function updateSuggestionStatus(id, status, reviewedBy) {
  const r = await db.query(
    `UPDATE sentinel_suggestions
     SET status = $2, reviewed_at = NOW(), reviewed_by = $3
     WHERE id = $1
     RETURNING id, status`,
    [String(id), String(status), String(reviewedBy || 'owner').slice(0, 120)]
  );
  return r.rows[0] || null;
}

async function latestEventByKind(kind) {
  return db.queryOne(
    `SELECT id, kind, severity, summary, payload, created_at AS "createdAt"
     FROM sentinel_events WHERE kind = $1 ORDER BY created_at DESC LIMIT 1`,
    [String(kind)]
  );
}

module.exports = {
  newId,
  insertEvent,
  listEvents,
  insertReport,
  listReports,
  insertSuggestion,
  listSuggestions,
  updateSuggestionStatus,
  latestEventByKind,
};
