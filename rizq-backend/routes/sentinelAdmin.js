/**
 * مسارات لوحة الحارس (سوبر فقط) + إيقاظ داخلي بقائمة بيضاء.
 * الإيقاظ: localhost فقط + SENTINEL_WAKE_SECRET إلزامي (timing-safe) بلا fallback.
 */
'use strict';

const crypto = require('crypto');
const { WAKE_WHITELIST } = require('../../services/sentinel/lib/config');

function wakeSecretConfigured() {
  return String(process.env.SENTINEL_WAKE_SECRET || '').trim();
}

function timingSafeEqualStr(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  const ha = crypto.createHash('sha256').update(sa).digest();
  const hb = crypto.createHash('sha256').update(sb).digest();
  return crypto.timingSafeEqual(ha, hb) && sa.length === sb.length;
}

/** عنوان الاتصال الخام فقط — لا X-Forwarded-For (قابل للتزوير). */
function socketRemoteIp(req) {
  const raw = String(
    (req.socket && req.socket.remoteAddress)
    || (req.connection && req.connection.remoteAddress)
    || ''
  );
  return raw.replace(/^::ffff:/i, '');
}

function isLocalWakeRequest(req) {
  const ip = socketRemoteIp(req);
  return ip === '127.0.0.1' || ip === '::1';
}

function requireLocalWake(req, res, next) {
  if (!isLocalWakeRequest(req)) {
    return res.status(403).json({ ok: false, error: 'localhost_only' });
  }
  return next();
}

function requireWakeSecret(req, res, next) {
  const expected = wakeSecretConfigured();
  if (!expected) {
    return res.status(503).json({ ok: false, error: 'wake_secret_not_configured' });
  }
  const got = String(req.header('x-sentinel-secret') || '').trim();
  if (!got || !timingSafeEqualStr(got, expected)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  return next();
}

function mountSentinelRoutes(app, deps) {
  const {
    requireSuperAdmin,
    requireSharedSecret,
    sql,
  } = deps;

  async function tableExists(name) {
    try {
      const r = await sql.queryOne(
        `SELECT 1 AS ok FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [name]
      );
      return !!r;
    } catch (_) {
      return false;
    }
  }

  app.get('/api/admin/sentinel/status', requireSuperAdmin, async (req, res) => {
    try {
      if (!(await tableExists('sentinel_events'))) {
        return res.json({ ok: true, ready: false, message: 'جداول الحارس غير مُرحَّلة بعد' });
      }
      const lastHealth = await sql.queryOne(
        `SELECT id, summary, payload, created_at AS "createdAt"
         FROM sentinel_events WHERE kind = 'health_snapshot'
         ORDER BY created_at DESC LIMIT 1`
      );
      const lastActivity = await sql.queryOne(
        `SELECT id, summary, payload, created_at AS "createdAt"
         FROM sentinel_events WHERE kind = 'activity_snapshot'
         ORDER BY created_at DESC LIMIT 1`
      );
      const pendingSug = await sql.queryOne(
        `SELECT COUNT(*)::int AS n FROM sentinel_suggestions WHERE status = 'pending_owner'`
      );
      res.json({
        ok: true,
        ready: true,
        lastHealth,
        lastActivity,
        pendingSuggestions: Number(pendingSug && pendingSug.n) || 0,
        wakeWhitelist: WAKE_WHITELIST.slice(),
      });
    } catch (e) {
      console.error('[sentinel-admin] status', e.message);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get('/api/admin/sentinel/events', requireSuperAdmin, async (req, res) => {
    try {
      if (!(await tableExists('sentinel_events'))) return res.json({ ok: true, events: [] });
      const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 50));
      const rows = await sql.query(
        `SELECT id, kind, severity, source, summary, payload, created_at AS "createdAt"
         FROM sentinel_events ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      res.json({ ok: true, events: rows || [] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get('/api/admin/sentinel/reports', requireSuperAdmin, async (req, res) => {
    try {
      if (!(await tableExists('sentinel_reports'))) return res.json({ ok: true, reports: [] });
      const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 20));
      const rows = await sql.query(
        `SELECT id, report_type AS "reportType", title, body, metrics, created_at AS "createdAt"
         FROM sentinel_reports ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      res.json({ ok: true, reports: rows || [] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get('/api/admin/sentinel/suggestions', requireSuperAdmin, async (req, res) => {
    try {
      if (!(await tableExists('sentinel_suggestions'))) return res.json({ ok: true, suggestions: [] });
      const status = String(req.query.status || 'pending_owner');
      const rows = await sql.query(
        `SELECT id, category, title, body, impact_rank AS "impactRank", status, source, meta,
                created_at AS "createdAt", reviewed_at AS "reviewedAt", reviewed_by AS "reviewedBy"
         FROM sentinel_suggestions
         WHERE ($1 = '' OR status = $1)
         ORDER BY impact_rank ASC, created_at DESC
         LIMIT 50`,
        [status === 'all' ? '' : status]
      );
      res.json({ ok: true, suggestions: rows || [] });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.post('/api/admin/sentinel/suggestions/:id/decide', requireSuperAdmin, async (req, res) => {
    try {
      const id = String(req.params.id || '');
      const decision = String((req.body && req.body.decision) || '').toLowerCase();
      if (decision !== 'approve' && decision !== 'reject') {
        return res.status(400).json({ ok: false, error: 'decision must be approve|reject' });
      }
      const status = decision === 'approve' ? 'approved' : 'rejected';
      const who = (req.admin && (req.admin.email || req.admin.user || req.admin.id)) || 'super';
      const row = await sql.queryOne(
        `UPDATE sentinel_suggestions
         SET status = $2, reviewed_at = NOW(), reviewed_by = $3
         WHERE id = $1
         RETURNING id, status, title`,
        [id, status, String(who).slice(0, 120)]
      );
      if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, suggestion: row, applied: false, note: 'لا يُطبَّق تلقائياً' });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  /** إيقاظ داخلي — localhost + سر إلزامي + قائمة بيضاء */
  app.post(
    '/api/internal/sentinel/wake',
    requireLocalWake,
    requireWakeSecret,
    async (req, res) => {
      try {
        const agent = String((req.body && req.body.agent) || '').trim().toLowerCase();
        if (!WAKE_WHITELIST.includes(agent)) {
          return res.status(403).json({ ok: false, error: 'not_whitelisted', agent });
        }
        const reason = String((req.body && req.body.reason) || 'manual').slice(0, 200);
        const result = await runWhitelistedWake(agent, deps);
        if (await tableExists('sentinel_events')) {
          const id = 'wake_' + Date.now().toString(36);
          await sql.query(
            `INSERT INTO sentinel_events (id, kind, severity, source, summary, payload)
             VALUES ($1,'wake_invoke',$2,'backend',$3,$4::jsonb)`,
            [
              id,
              result.ok ? 'info' : 'warn',
              'إيقاظ ' + agent + (result.ok ? ' OK' : ' فشل'),
              JSON.stringify({ agent, reason, result }),
            ]
          );
        }
        res.status(result.ok ? 200 : 500).json(Object.assign({ agent, reason }, result));
      } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
      }
    }
  );

  void requireSharedSecret;
}

async function runWhitelistedWake(agent, deps) {
  try {
    if (agent === 'lifecycle') {
      const mod = require('../rizq_package_lifecycle_agent');
      if (typeof mod.runLifecycleScan === 'function') {
        const out = await mod.runLifecycleScan();
        return { ok: true, result: out && typeof out === 'object' ? { keys: Object.keys(out) } : true };
      }
    }
    if (agent === 'ops_housekeeping' || agent === 'maintenance_daily') {
      const ops = require('../services/opsHousekeeping');
      if (typeof ops.runOpsHousekeepingPass === 'function') {
        const out = await ops.runOpsHousekeepingPass({ source: 'sentinel_wake' });
        return { ok: true, result: out && typeof out === 'object' ? { ok: out.ok !== false } : true };
      }
    }
    if (agent === 'marketing') {
      const m = require('../services/marketingAgent');
      if (typeof m.runDueCampaigns === 'function') {
        await m.runDueCampaigns();
        return { ok: true };
      }
      if (typeof m.tickScheduler === 'function') {
        await m.tickScheduler();
        return { ok: true };
      }
      return { ok: true, note: 'marketing_noop' };
    }
    if (agent === 'quota_guard') {
      return { ok: true, note: 'quota_guard_passive' };
    }
    if (agent === 'moderator') {
      return { ok: true, note: 'moderator_on_demand' };
    }
    if (agent === 'maintenance_weekly') {
      const ops = require('../services/opsHousekeeping');
      if (typeof ops.runWeeklyOpsReport === 'function') {
        await ops.runWeeklyOpsReport({ source: 'sentinel_wake' });
        return { ok: true };
      }
    }
    if (agent === 'investment_ops') {
      try {
        const inv = require('../services/investmentRoom');
        if (typeof inv.runDailyOps === 'function') {
          await inv.runDailyOps();
          return { ok: true };
        }
      } catch (_) { /* */ }
      return { ok: true, note: 'investment_noop' };
    }
    if (agent === 'currency_rates') {
      try {
        const cur = require('../services/currencyRates');
        if (typeof cur.refreshRates === 'function') {
          await cur.refreshRates();
          return { ok: true };
        }
      } catch (_) { /* */ }
      return { ok: true, note: 'currency_noop' };
    }
    return { ok: false, error: 'no_handler', agent };
  } catch (e) {
    return { ok: false, error: e.message, agent };
  }
}

module.exports = {
  mountSentinelRoutes,
  runWhitelistedWake,
  WAKE_WHITELIST,
  isLocalWakeRequest,
  requireLocalWake,
  requireWakeSecret,
  wakeSecretConfigured,
  timingSafeEqualStr,
  socketRemoteIp,
};
