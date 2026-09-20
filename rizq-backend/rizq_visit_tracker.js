/**
 * rizq_visit_tracker.js — عدّاد زيارات حقيقي (SQLite عبر repos)
 */
const repos = require('./db/repos');

const SOURCES = ['direct', 'whatsapp', 'facebook', 'google', 'other'];
const KEEP_DAYS = 100;

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

function trackVisit(accountId, referrer) {
  if (!accountId) return { ok: false, error: 'accountId مطلوب' };
  const rec = repos.getVisitStats(accountId) || { total: 0, byDay: {}, bySource: {} };
  const day = _todayKey();
  const source = _bucketSource(referrer);

  rec.total = (rec.total || 0) + 1;
  rec.byDay = rec.byDay || {};
  rec.bySource = rec.bySource || {};
  rec.byDay[day] = (rec.byDay[day] || 0) + 1;
  rec.bySource[source] = (rec.bySource[source] || 0) + 1;

  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  Object.keys(rec.byDay).forEach((d) => { if (d < cutoff) delete rec.byDay[d]; });

  repos.setVisitStats(accountId, rec);
  return { ok: true };
}

function getVisitStats(accountId) {
  const rec = repos.getVisitStats(accountId);
  if (!rec) return { total: 0, last90: [], monthTotal: 0, bySource: {} };

  const days = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, count: (rec.byDay && rec.byDay[d]) || 0 });
  }
  const monthPrefix = _todayKey().slice(0, 7);
  const monthTotal = Object.keys(rec.byDay || {})
    .filter((d) => d.startsWith(monthPrefix))
    .reduce((sum, d) => sum + (rec.byDay[d] || 0), 0);

  return {
    total: rec.total || 0,
    last90: days,
    monthTotal,
    bySource: Object.assign({}, ...SOURCES.map((s) => ({ [s]: (rec.bySource && rec.bySource[s]) || 0 }))),
  };
}

function setupVisitTrackingAPI(app, trackVisitLimiter, getAccountRecord, getMainAccount) {
  app.post('/api/track-visit', trackVisitLimiter, (req, res) => {
    const { accountId, referrer } = req.body || {};
    const result = trackVisit(String(accountId || '').slice(0, 40), referrer);
    if (!result.ok) return res.status(400).json(result);
    res.json({ ok: true });
  });

  app.get('/api/visit-stats/:id', (req, res) => {
    const id = req.params.id;
    const token = req.header('x-account-token') || req.query.token;
    const mainAcc = getMainAccount ? getMainAccount(id) : null;
    const pkgRec = getAccountRecord ? getAccountRecord(id) : null;
    if (!mainAcc && !pkgRec) return res.status(404).json({ error: 'account_not_found' });
    const validToken = (mainAcc && mainAcc.accessToken) || (pkgRec && pkgRec.accessToken) || null;
    if (!token || !validToken || token !== validToken) return res.status(401).json({ error: 'unauthorized' });
    res.json({ ok: true, stats: getVisitStats(id) });
  });
}

module.exports = { trackVisit, getVisitStats, setupVisitTrackingAPI };
