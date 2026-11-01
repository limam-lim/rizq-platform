#!/usr/bin/env node
/**
 * الحارس (Sentinel) — عملية مستقلة للمراقبة والتنسيق (قراءة فقط + إيقاظ مسموح).
 */
'use strict';

const http = require('http');
const cron = require('node-cron');
const { cfg, loadEnvFiles } = require('./lib/config');
const db = require('./lib/db');
const store = require('./lib/store');
const health = require('./lib/health');
const activity = require('./lib/activity');
const agents = require('./lib/agents');
const journeys = require('./lib/journeys');
const telegram = require('./lib/telegram');
const claude = require('./lib/claude');
const { wakeAgent, isWhitelisted } = require('./lib/wake');

loadEnvFiles();

/** آخر لقطات للرد على الأوامر بدون لمس القاعدة مباشرة من /ask */
const cache = {
  health: null,
  activity: null,
  agents: null,
  journeys: null,
};

function aggregates() {
  return {
    health: cache.health,
    activity: cache.activity,
    agents: cache.agents,
    journeys: cache.journeys
      ? {
        jsErrors: cache.journeys.jsErrors,
        slowPages: cache.journeys.slowPages,
        clsMax: cache.journeys.clsMax,
        failed: !!(cache.journeys.desk && cache.journeys.desk.failedCore)
          || !!(cache.journeys.phone && cache.journeys.phone.failedCore),
      }
      : null,
    visitorsToday: cache.activity && cache.activity.visitorsToday,
    registrationsByType: cache.activity && cache.activity.registrationsByType,
    pendingAccounts: cache.activity && cache.activity.pendingAccounts,
    pendingPayments: cache.activity && cache.activity.pendingPayments,
    pendingAds: cache.activity && cache.activity.pendingAds,
    pendingCatalog: cache.activity && cache.activity.pendingCatalog,
    reportsOpen: cache.activity && cache.activity.reportsOpen,
    widgetMessagesToday: cache.activity && cache.activity.widgetMessagesToday,
    leadsToday: cache.activity && cache.activity.leadsToday,
  };
}

telegram.registerCommands({
  '/status': async () => {
    const h = cache.health || (await health.runHealthCheck(telegram));
    cache.health = h;
    const healthOk = (h.checks || []).find((x) => String(x.url || '').includes('/health'));
    return [
      '🛡 حالة الحارس',
      'الخادم: ' + (healthOk && healthOk.ok ? 'OK' : 'خلل'),
      'القرص: ' + (h.diskPct == null ? '—' : h.diskPct + '%'),
      'الذاكرة: ' + (h.mem && h.mem.usedPct != null ? h.mem.usedPct + '%' : '—'),
      'SSL: ' + (h.sslDays == null ? '—' : h.sslDays + ' يوماً'),
      'نسخة احتياطية: ' + (h.backupAgeHours == null ? '—' : h.backupAgeHours.toFixed(1) + 'س'),
      '5xx: ' + (h.fiveXxRatio == null ? '—' : Math.round(h.fiveXxRatio * 100) + '%'),
    ].join('\n');
  },
  '/today': async () => {
    const a = cache.activity || (await activity.collectActivity());
    cache.activity = a;
    return claude.formatNumericOnly(Object.assign({}, a, { health: cache.health }));
  },
  '/week': async () => {
    const reps = await store.listReports(14);
    const weekly = reps.filter((r) => r.reportType === 'weekly').slice(0, 2);
    if (!weekly.length) {
      return 'لا يوجد تقرير أسبوعي بعد. سيُنشأ يوم الاثنين 08:30 Europe/Madrid.';
    }
    return weekly.map((r) => r.title + '\n' + String(r.body || '').slice(0, 1500)).join('\n\n—\n\n');
  },
  '/agents': async () => {
    const s = cache.agents || (await agents.superviseAgents(telegram));
    cache.agents = s;
    const lines = (s.agents || []).map((a) =>
      '• ' + a.id + ' — ' + (a.overdue ? 'متأخر' : 'ضمن الجدول')
      + (a.lastAt ? ' (آخر: ' + a.lastAt + ')' : '')
      + (a.woke ? ' [أُيقظ]' : '')
    );
    lines.push('مسودات سوشيال بانتظار موافقة: ' + ((s.pendingSocial || []).length));
    lines.push('فجوات جودة: ' + ((s.quality && s.quality.weakCount) || 0));
    return lines.join('\n');
  },
  '/pending': async () => {
    const sug = await store.listSuggestions('pending_owner', 20);
    if (!sug.length) return 'لا اقتراحات بانتظار موافقة المالك.';
    return sug.map((s) =>
      '#' + s.impactRank + ' [' + s.id + '] ' + s.title + '\n' + String(s.body || '').slice(0, 280)
    ).join('\n\n');
  },
  '/ask': async ({ arg }) => {
    if (!arg) return 'الاستخدام: /ask <سؤال>';
    const r = await claude.askFromAggregates(arg, aggregates());
    return r.text || 'لا رد';
  },
});

async function safe(name, fn) {
  try {
    return await fn();
  } catch (e) {
    console.error('[sentinel]', name, e && e.message);
    await store.insertEvent({
      kind: 'runner_error',
      severity: 'warn',
      summary: name + ': ' + (e && e.message),
      payload: { name, stack: e && e.stack },
    }).catch(() => {});
    return null;
  }
}

async function tickHealth() {
  cache.health = await safe('health', () => health.runHealthCheck(telegram));
}

async function tickActivity() {
  cache.activity = await safe('activity', () => activity.collectActivity());
  cache.agents = await safe('agents', () => agents.superviseAgents(telegram));
}

async function tickJourneys() {
  cache.journeys = await safe('journeys', () => journeys.runJourneys(telegram));
}

async function buildDailyReport() {
  const a = cache.activity || (await activity.collectActivity());
  cache.activity = a;
  const h = cache.health || {};
  const body = claude.formatNumericOnly(Object.assign({}, a, { health: h }));
  await store.insertReport({
    reportType: 'daily',
    title: 'تقرير يومي ' + new Date().toISOString().slice(0, 10),
    body,
    metrics: Object.assign({}, a, { health: h }),
  });
  await telegram.sendOwner('🌅 تقرير يومي الحارس\n\n' + body).catch(() => {});
  await safe('smart', () => claude.dailySmartSuggestions(Object.assign({}, a, { health: h })));
  await safe('quality_suggest', () => agents.proposeQualitySuggestions(claude));
}

async function buildWeeklyReport() {
  const reps = await store.listReports(40);
  const dailies = reps.filter((r) => r.reportType === 'daily').slice(0, 7);
  const body = 'تقرير أسبوعي — ملخص آخر ' + dailies.length + ' تقارير يومية:\n\n'
    + dailies.map((r) => '• ' + r.title).join('\n')
    + '\n\n' + claude.formatNumericOnly(aggregates());
  await store.insertReport({
    reportType: 'weekly',
    title: 'تقرير أسبوعي',
    body,
    metrics: aggregates(),
  });
  await telegram.sendOwner('📅 تقرير أسبوعي الحارس\n\n' + body.slice(0, 3500)).catch(() => {});
}

function startHttpBridge() {
  const c = cfg();
  if (!c.listenPort) return null;
  const server = http.createServer(async (req, res) => {
    const url = String(req.url || '');
    const secret = req.headers['x-sentinel-secret'] || req.headers['x-shared-secret'] || '';
    const okSecret = c.wakeSecret && String(secret) === c.wakeSecret;

    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(obj));
    };

    if (req.method === 'GET' && url === '/health') {
      return send(200, { ok: true, service: 'sentinel' });
    }

    if (!okSecret) return send(401, { ok: false, error: 'unauthorized' });

    if (req.method === 'POST' && url === '/ingest/telegram') {
      let raw = '';
      req.on('data', (chunk) => { raw += chunk; if (raw.length > 200000) req.destroy(); });
      req.on('end', async () => {
        try {
          const body = JSON.parse(raw || '{}');
          const out = await telegram.ingestAdminOutbound(body.text || body.message || '', body.meta || {});
          send(200, out);
        } catch (e) {
          send(400, { ok: false, error: e.message });
        }
      });
      return;
    }

    if (req.method === 'POST' && url === '/telegram/update') {
      let raw = '';
      req.on('data', (chunk) => { raw += chunk; if (raw.length > 200000) req.destroy(); });
      req.on('end', async () => {
        try {
          const body = JSON.parse(raw || '{}');
          const out = await telegram.handleUpdate(body);
          send(200, out);
        } catch (e) {
          send(400, { ok: false, error: e.message });
        }
      });
      return;
    }

    if (req.method === 'GET' && url.startsWith('/api/snapshot')) {
      return send(200, { ok: true, aggregates: aggregates(), cacheKeys: Object.keys(cache) });
    }

    return send(404, { ok: false, error: 'not_found' });
  });
  server.listen(c.listenPort, '127.0.0.1', () => {
    console.log('[sentinel] bridge on 127.0.0.1:' + c.listenPort);
  });
  return server;
}

async function main() {
  const c = cfg();
  console.log('[sentinel] starting — tz=' + c.timezone + ' backend=' + c.backendBase);

  // تحقق اتصال DB
  try {
    await db.query('SELECT 1 AS ok');
    console.log('[sentinel] db ok (rizq_sentinel)');
  } catch (e) {
    console.error('[sentinel] db connection failed:', e.message);
    console.error('[sentinel] continuing with limited mode — set SENTINEL_DATABASE_URL');
  }

  await store.insertEvent({
    kind: 'sentinel_boot',
    severity: 'info',
    summary: 'تشغيل الحارس',
    payload: { pid: process.pid, tz: c.timezone },
  }).catch(() => {});

  startHttpBridge();
  await telegram.startPolling(() => ({ aggregates, wakeAgent, isWhitelisted }));

  // فوراً ثم جداول
  await tickHealth();
  await tickActivity();

  setInterval(() => { tickHealth(); }, c.healthIntervalMs);
  setInterval(() => { tickActivity(); }, c.activityIntervalMs);

  cron.schedule(c.journeyCron, () => { tickJourneys(); }, { timezone: c.timezone });

  // يومي 08:30 Europe/Madrid
  cron.schedule('30 8 * * *', () => { buildDailyReport(); }, { timezone: c.timezone });
  // أسبوعي الاثنين 08:30
  cron.schedule('30 8 * * 1', () => { buildWeeklyReport(); }, { timezone: c.timezone });

  console.log('[sentinel] schedules armed');
}

if (require.main === module) {
  main().catch((e) => {
    console.error('[sentinel] fatal', e);
    process.exit(1);
  });
}

module.exports = {
  main,
  aggregates,
  cache,
  tickHealth,
  tickActivity,
  tickJourneys,
  buildDailyReport,
  buildWeeklyReport,
};
