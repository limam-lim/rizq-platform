/**
 * rizq_visit_tracker.js — عدّاد زيارات + ظهور/نقر (PostgreSQL عبر repos)
 * الظهور/النقر على الرئيسية ودليل رزق؛ الزيارة لصفحة المحل.
 * منع التضخيم: نفس الزائر ≤ مرة كل 30 دقيقة لنفس المحل ولكل نوع حدث.
 */
'use strict';

const crypto = require('crypto');
const repos = require('./db/repos');

const SOURCES = ['direct', 'whatsapp', 'facebook', 'google', 'other'];
const SURFACES = ['home', 'guide', 'store', 'other'];
const EVENT_KINDS = ['visit', 'impression', 'click'];
const KEEP_DAYS = 100;
const DEDUPE_TTL_MS = 30 * 60 * 1000;

/** مفاتيح منع التضخيم في الذاكرة (بديل Redis) */
const _dedupe = new Map();

function _todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function _bucketSource(referrer) {
  const r = String(referrer || '').toLowerCase();
  if (!r) return 'direct';
  if (r.includes('wa.me') || r.includes('whatsapp')) return 'whatsapp';
  if (r.includes('facebook') || r.includes('fb.com') || r.includes('instagram')) return 'facebook';
  if (r.includes('google')) return 'google';
  return 'other';
}

function _pruneDedupe(now) {
  _dedupe.forEach((exp, key) => {
    if (exp <= now) _dedupe.delete(key);
  });
}

function viewerFingerprint(req, viewerId) {
  if (viewerId) return 'v:' + String(viewerId).slice(0, 64);
  const ip = String((req && (req.ip || (req.headers && req.headers['x-forwarded-for']))) || '')
    .split(',')[0]
    .trim();
  const ua = String((req && req.headers && req.headers['user-agent']) || '').slice(0, 200);
  const pepper = String(
    process.env.OTP_PEPPER || process.env.BACKEND_SHARED_SECRET || process.env.RIZQ_API_SECRET || 'rizq-visit'
  ).slice(0, 64);
  return 'a:' + crypto.createHash('sha256').update(ip + '|' + ua + '|' + pepper).digest('hex').slice(0, 40);
}

function _emptyBucket() {
  return { total: 0, byDay: {}, bySurface: { home: 0, guide: 0, store: 0, other: 0 } };
}

function _ensureShape(rec) {
  rec = rec || {};
  rec.total = rec.total || 0;
  rec.byDay = rec.byDay || {};
  rec.bySource = rec.bySource || {};
  if (!rec.impressions) rec.impressions = _emptyBucket();
  if (!rec.clicks) rec.clicks = _emptyBucket();
  rec.impressions.byDay = rec.impressions.byDay || {};
  rec.impressions.bySurface = Object.assign(
    { home: 0, guide: 0, store: 0, other: 0 },
    rec.impressions.bySurface || {}
  );
  rec.clicks.byDay = rec.clicks.byDay || {};
  rec.clicks.bySurface = Object.assign(
    { home: 0, guide: 0, store: 0, other: 0 },
    rec.clicks.bySurface || {}
  );
  return rec;
}

function _pruneDays(byDay) {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  Object.keys(byDay || {}).forEach((d) => {
    if (d < cutoff) delete byDay[d];
  });
}

function _sumPrefix(byDay, prefix) {
  return Object.keys(byDay || {})
    .filter((d) => d.startsWith(prefix))
    .reduce((sum, d) => sum + (byDay[d] || 0), 0);
}

function _sumLastDays(byDay, n) {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    sum += (byDay && byDay[d]) || 0;
  }
  return sum;
}

function _daySeries(byDay, n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, count: (byDay && byDay[d]) || 0 });
  }
  return days;
}

/**
 * @param {string} accountId
 * @param {{ kind?: string, surface?: string, referrer?: string, viewerKey?: string }} opts
 */
async function trackVisit(accountId, referrerOrOpts, maybeOpts) {
  let opts = {};
  if (referrerOrOpts && typeof referrerOrOpts === 'object' && !Array.isArray(referrerOrOpts)) {
    opts = referrerOrOpts;
  } else {
    opts = Object.assign({}, maybeOpts || {}, { referrer: referrerOrOpts });
  }
  if (!accountId) return { ok: false, error: 'accountId مطلوب' };

  const kind = EVENT_KINDS.includes(String(opts.kind || 'visit')) ? String(opts.kind || 'visit') : 'visit';
  const surfaceRaw = String(opts.surface || (kind === 'visit' ? 'store' : 'home')).toLowerCase();
  const surface = SURFACES.includes(surfaceRaw) ? surfaceRaw : 'other';
  const viewerKey = String(opts.viewerKey || '').slice(0, 80) || 'anon';

  const now = Date.now();
  _pruneDedupe(now);
  const dedupeKey = [viewerKey, accountId, kind].join('|');
  if (_dedupe.has(dedupeKey)) {
    return { ok: true, counted: false, deduped: true };
  }
  _dedupe.set(dedupeKey, now + DEDUPE_TTL_MS);

  const rec = _ensureShape(await repos.getVisitStats(accountId));
  const day = _todayKey();
  const source = _bucketSource(opts.referrer);

  if (kind === 'visit') {
    rec.total = (rec.total || 0) + 1;
    rec.byDay[day] = (rec.byDay[day] || 0) + 1;
    rec.bySource[source] = (rec.bySource[source] || 0) + 1;
    _pruneDays(rec.byDay);
  } else if (kind === 'impression') {
    rec.impressions.total = (rec.impressions.total || 0) + 1;
    rec.impressions.byDay[day] = (rec.impressions.byDay[day] || 0) + 1;
    rec.impressions.bySurface[surface] = (rec.impressions.bySurface[surface] || 0) + 1;
    _pruneDays(rec.impressions.byDay);
  } else if (kind === 'click') {
    rec.clicks.total = (rec.clicks.total || 0) + 1;
    rec.clicks.byDay[day] = (rec.clicks.byDay[day] || 0) + 1;
    rec.clicks.bySurface[surface] = (rec.clicks.bySurface[surface] || 0) + 1;
    _pruneDays(rec.clicks.byDay);
  }

  await repos.setVisitStats(accountId, rec);
  return { ok: true, counted: true, kind, surface };
}

async function getVisitStats(accountId) {
  const raw = await repos.getVisitStats(accountId);
  if (!raw) {
    return {
      total: 0,
      last90: [],
      last30: [],
      weekTotal: 0,
      monthTotal: 0,
      bySource: Object.assign({}, ...SOURCES.map((s) => ({ [s]: 0 }))),
      impressions: {
        total: 0,
        weekTotal: 0,
        monthTotal: 0,
        last30: [],
        bySurface: { home: 0, guide: 0, store: 0, other: 0 },
      },
      clicks: {
        total: 0,
        weekTotal: 0,
        monthTotal: 0,
        last30: [],
        bySurface: { home: 0, guide: 0, store: 0, other: 0 },
      },
    };
  }
  const rec = _ensureShape(raw);
  const monthPrefix = _todayKey().slice(0, 7);
  return {
    total: rec.total || 0,
    last90: _daySeries(rec.byDay, 90),
    last30: _daySeries(rec.byDay, 30),
    weekTotal: _sumLastDays(rec.byDay, 7),
    monthTotal: _sumPrefix(rec.byDay, monthPrefix),
    bySource: Object.assign({}, ...SOURCES.map((s) => ({ [s]: (rec.bySource && rec.bySource[s]) || 0 }))),
    impressions: {
      total: rec.impressions.total || 0,
      weekTotal: _sumLastDays(rec.impressions.byDay, 7),
      monthTotal: _sumPrefix(rec.impressions.byDay, monthPrefix),
      last30: _daySeries(rec.impressions.byDay, 30),
      bySurface: Object.assign({ home: 0, guide: 0, store: 0, other: 0 }, rec.impressions.bySurface || {}),
    },
    clicks: {
      total: rec.clicks.total || 0,
      weekTotal: _sumLastDays(rec.clicks.byDay, 7),
      monthTotal: _sumPrefix(rec.clicks.byDay, monthPrefix),
      last30: _daySeries(rec.clicks.byDay, 30),
      bySurface: Object.assign({ home: 0, guide: 0, store: 0, other: 0 }, rec.clicks.bySurface || {}),
    },
  };
}

function setupVisitTrackingAPI(app, trackVisitLimiter, getAccountRecord, getMainAccount) {
  app.post('/api/track-visit', trackVisitLimiter, async (req, res) => {
    try {
      const b = req.body || {};
      const accountId = String(b.accountId || '').slice(0, 40);
      if (b.demo === true || b.demo === 1 || b.demo === '1') {
        return res.json({ ok: true, counted: false, reason: 'demo' });
      }
      const viewerId = String(req.header('x-account-id') || b.viewerId || '').trim();
      if (viewerId && viewerId === accountId) {
        return res.json({ ok: true, counted: false, reason: 'self' });
      }
      const result = await trackVisit(accountId, {
        kind: 'visit',
        surface: 'store',
        referrer: b.referrer,
        viewerKey: viewerFingerprint(req, viewerId || null),
      });
      if (!result.ok) return res.status(400).json(result);
      return res.json({ ok: true, counted: !!result.counted, deduped: !!result.deduped });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'track_failed' });
    }
  });

  /** ظهور/نقر بطاقة المحل على الرئيسية أو دليل رزق — بلا بيانات شخصية */
  app.post('/api/track-engagement', trackVisitLimiter, async (req, res) => {
    try {
      const b = req.body || {};
      const accountId = String(b.accountId || b.targetAccountId || '').slice(0, 40);
      const kind = String(b.kind || '').toLowerCase();
      if (kind !== 'impression' && kind !== 'click') {
        return res.status(400).json({ ok: false, error: 'invalid_kind' });
      }
      if (b.demo === true || b.demo === 1 || b.demo === '1') {
        return res.json({ ok: true, counted: false, reason: 'demo' });
      }
      if (!accountId) return res.status(400).json({ ok: false, error: 'accountId مطلوب' });

      const mainAcc = getMainAccount ? await getMainAccount(accountId) : null;
      const pkgRec = getAccountRecord ? await getAccountRecord(accountId) : null;
      if (!mainAcc && !pkgRec) {
        return res.json({ ok: true, counted: false, reason: 'unknown_account' });
      }

      const viewerId = String(req.header('x-account-id') || b.viewerId || '').trim();
      if (viewerId && viewerId === accountId) {
        return res.json({ ok: true, counted: false, reason: 'self' });
      }

      const result = await trackVisit(accountId, {
        kind,
        surface: b.surface,
        referrer: b.referrer || (req.headers && req.headers.referer),
        viewerKey: viewerFingerprint(req, viewerId || null),
      });
      if (!result.ok) return res.status(400).json(result);
      return res.json({
        ok: true,
        counted: !!result.counted,
        deduped: !!result.deduped,
        kind: result.kind,
        surface: result.surface,
      });
    } catch (err) {
      return res.json({ ok: true, counted: false });
    }
  });

  app.get('/api/visit-stats/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const token = String(req.header('x-account-token') || '').trim();
      const mainAcc = getMainAccount ? await getMainAccount(id) : null;
      const pkgRec = getAccountRecord ? await getAccountRecord(id) : null;
      if (!mainAcc && !pkgRec) return res.status(404).json({ error: 'account_not_found' });
      if (!token) return res.status(401).json({ error: 'unauthorized' });
      const { timingSafeEqualStr } = require('./lib/secureCompare');
      const { activeOwnerMatches } = require('./middleware/accountAuth');
      if (mainAcc) {
        if (!activeOwnerMatches(mainAcc, token)) {
          return res.status(401).json({ error: 'unauthorized' });
        }
      } else {
        const validToken = (pkgRec && pkgRec.accessToken) || null;
        if (!validToken || !timingSafeEqualStr(token, validToken)) {
          return res.status(401).json({ error: 'unauthorized' });
        }
      }
      return res.json({ ok: true, stats: await getVisitStats(id) });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'stats_failed' });
    }
  });
}

module.exports = {
  trackVisit,
  getVisitStats,
  setupVisitTrackingAPI,
  viewerFingerprint,
  DEDUPE_TTL_MS,
  EVENT_KINDS,
  SURFACES,
};
