/**
 * تجميع النشاط — كل 15 دقيقة (قراءة فقط).
 */
'use strict';

const fs = require('fs');
const db = require('./db');
const store = require('./store');
const { cfg } = require('./config');

const SENTINEL_SQL = `(COALESCE(data->>'isSentinel','') <> 'true')`;

async function countWhere(table, where, params) {
  const r = await db.queryOne(
    'SELECT COUNT(*)::int AS n FROM ' + table + ' WHERE ' + where,
    params || []
  );
  return Number(r && r.n) || 0;
}

async function oldestWhere(table, where, params, orderExpr) {
  const r = await db.queryOne(
    'SELECT id, updated_at AS "updatedAt", data FROM ' + table
      + ' WHERE ' + where
      + ' ORDER BY ' + (orderExpr || "COALESCE(NULLIF(data->>'createdAt',''), updated_at) ASC")
      + ' LIMIT 1',
    params || []
  );
  if (!r) return null;
  return {
    id: r.id,
    updatedAt: r.updatedAt,
    createdAt: r.data && r.data.createdAt,
    type: r.data && r.data.type,
    name: r.data && r.data.name,
  };
}

function parseCaddyVisitorsToday(logPath) {
  if (!logPath || !fs.existsSync(logPath)) return null;
  try {
    const { spawnSync } = require('child_process');
    const r = spawnSync('tail', ['-n', '8000', logPath], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const lines = String(r.stdout || '').split(/\n/).filter(Boolean);
    const day = new Date().toISOString().slice(0, 10);
    const ips = new Set();
    for (const line of lines) {
      try {
        if (line.trim().startsWith('{')) {
          const j = JSON.parse(line);
          const t = j.ts || j.timestamp || j.time;
          const iso = typeof t === 'number'
            ? new Date(t < 1e12 ? t * 1000 : t).toISOString()
            : String(t || '');
          if (!iso.startsWith(day)) continue;
          const ip = j.request && (j.request.client_ip || j.request.remote_ip)
            || j.client_ip || j.remote_ip || '';
          if (ip) ips.add(String(ip));
        }
      } catch (_) { /* */ }
    }
    return ips.size;
  } catch (_) {
    return null;
  }
}

async function fetchCloudflareVisitors() {
  const c = cfg();
  if (!c.cloudflareToken || !c.cloudflareZone) return null;
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const body = {
      query: `query { viewer { zones(filter:{zoneTag:"${c.cloudflareZone}"}) { httpRequests1dGroups(limit:1, filter:{date_geq:"${since.slice(0, 10)}"}) { sum { requests uniqSessions } } } } }`,
    };
    const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + c.cloudflareToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const g = j && j.data && j.data.viewer && j.data.viewer.zones
      && j.data.viewer.zones[0] && j.data.viewer.zones[0].httpRequests1dGroups
      && j.data.viewer.zones[0].httpRequests1dGroups[0];
    if (!g || !g.sum) return null;
    return Number(g.sum.uniqSessions || g.sum.requests) || null;
  } catch (_) {
    return null;
  }
}

async function collectActivity() {
  const c = cfg();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const registrationsByType = {};
  try {
    const rows = await db.query(
      `SELECT type, COUNT(*)::int AS n FROM accounts
       WHERE ${SENTINEL_SQL}
         AND COALESCE(NULLIF(data->>'createdAt',''), updated_at) >= $1
       GROUP BY type`,
      [todayIso]
    );
    (rows.rows || []).forEach((r) => { registrationsByType[r.type || 'unknown'] = r.n; });
  } catch (e) {
    registrationsByType._error = e.message;
  }

  const pendingAccounts = await countWhere(
    'accounts',
    `status = 'pending' AND ${SENTINEL_SQL}`
  );
  const oldestPendingAccount = await oldestWhere(
    'accounts',
    `status = 'pending' AND ${SENTINEL_SQL}`
  );

  const pendingPayments = await countWhere(
    'documents',
    `collection = 'sub_requests' AND (data->>'status' = 'pending')`
  ).catch(() => 0);
  let oldestPayment = null;
  try {
    oldestPayment = await db.queryOne(
      `SELECT id, data, updated_at AS "updatedAt" FROM documents
       WHERE collection = 'sub_requests' AND data->>'status' = 'pending'
       ORDER BY COALESCE(NULLIF(data->>'createdAt',''), updated_at) ASC LIMIT 1`
    );
  } catch (_) { /* */ }

  const pendingAds = await countWhere('ads', `status = 'pending'`);
  const pendingCatalog = await countWhere('catalog_items', `status = 'pending_review'`);
  const reports = await countWhere(
    'documents',
    `collection IN ('reports','ad_reports') AND COALESCE(data->>'status','open') IN ('open','pending','new')`
  ).catch(() => 0);

  let widgetMessages = 0;
  try {
    widgetMessages = await countWhere(
      'documents',
      `collection = 'widget_messages' AND COALESCE(NULLIF(data->>'createdAt',''), updated_at) >= $1`,
      [todayIso]
    );
  } catch (_) { /* */ }

  let leads = 0;
  try {
    leads = await countWhere(
      'documents',
      `collection IN ('leads','widget_leads') AND COALESCE(NULLIF(data->>'createdAt',''), updated_at) >= $1`,
      [todayIso]
    );
  } catch (_) { /* */ }

  let visitors = await fetchCloudflareVisitors();
  if (visitors == null) visitors = parseCaddyVisitorsToday(c.caddyAccessLog);

  const metrics = {
    at: new Date().toISOString(),
    visitorsToday: visitors,
    registrationsByType,
    pendingAccounts,
    oldestPendingAccount,
    pendingPayments,
    oldestPayment: oldestPayment
      ? { id: oldestPayment.id, createdAt: oldestPayment.data && oldestPayment.data.createdAt }
      : null,
    pendingAds,
    pendingCatalog,
    reportsOpen: reports,
    widgetMessagesToday: widgetMessages,
    leadsToday: leads,
  };

  await store.insertEvent({
    kind: 'activity_snapshot',
    severity: 'info',
    summary: 'نشاط: زوار=' + (visitors == null ? '?' : visitors)
      + ' معلّق حسابات=' + pendingAccounts
      + ' إعلانات=' + pendingAds
      + ' كتالوج=' + pendingCatalog,
    payload: metrics,
  });

  return metrics;
}

module.exports = { collectActivity, SENTINEL_SQL };
