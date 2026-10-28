/**
 * rizq_contact_tracker.js — عدّاد نقرات التواصل (اتصال / واتساب / إيميل)
 * على نمط rizq_visit_tracker.js
 */
'use strict';

const crypto = require('crypto');
const repos = require('./db/repos');

const CONTACT_TYPES = ['call', 'whatsapp', 'email'];
const KEEP_DAYS = 100;
const MAX_ADS = 200;
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;

/** مفاتيح منع التضخيم في الذاكرة (بديل Redis) */
const _dedupe = new Map();

function _todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function _pruneDedupe(now) {
  _dedupe.forEach((exp, key) => {
    if (exp <= now) _dedupe.delete(key);
  });
}

function _viewerFingerprint(req, viewerId) {
  if (viewerId) return 'v:' + String(viewerId).slice(0, 64);
  const ip = String((req && (req.ip || (req.headers && req.headers['x-forwarded-for']))) || '').split(',')[0].trim();
  const ua = String((req && req.headers && req.headers['user-agent']) || '').slice(0, 200);
  const pepper = String(process.env.OTP_PEPPER || process.env.BACKEND_SHARED_SECRET || process.env.RIZQ_API_SECRET || 'rizq-contact').slice(0, 64);
  return 'a:' + crypto.createHash('sha256').update(ip + '|' + ua + '|' + pepper).digest('hex').slice(0, 40);
}

async function trackContactClick(accountId, opts) {
  opts = opts || {};
  const type = String(opts.type || '').toLowerCase();
  if (!CONTACT_TYPES.includes(type)) {
    return { ok: false, status: 400, error: 'invalid_type' };
  }
  if (!accountId) return { ok: false, status: 400, error: 'accountId مطلوب' };

  const adId = String(opts.adId || '').slice(0, 80);
  const day = _todayKey();
  const now = Date.now();
  _pruneDedupe(now);

  const dedupeKey = [opts.viewerKey || 'anon', accountId, adId || '-', type, day].join('|');
  if (_dedupe.has(dedupeKey)) {
    return { ok: true, counted: false, deduped: true };
  }
  _dedupe.set(dedupeKey, now + DEDUPE_TTL_MS);

  const rec = (await repos.getContactStats(accountId)) || {
    total: 0,
    byDay: {},
    byType: { call: 0, whatsapp: 0, email: 0 },
    byAd: {},
  };
  rec.total = (rec.total || 0) + 1;
  rec.byDay = rec.byDay || {};
  rec.byType = Object.assign({ call: 0, whatsapp: 0, email: 0 }, rec.byType || {});
  rec.byAd = rec.byAd || {};
  rec.byDay[day] = (rec.byDay[day] || 0) + 1;
  rec.byType[type] = (rec.byType[type] || 0) + 1;
  if (adId) {
    if (!rec.byAd[adId]) rec.byAd[adId] = { total: 0, call: 0, whatsapp: 0, email: 0 };
    rec.byAd[adId].total = (rec.byAd[adId].total || 0) + 1;
    rec.byAd[adId][type] = (rec.byAd[adId][type] || 0) + 1;
  }

  const cutoff = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);
  Object.keys(rec.byDay).forEach((d) => { if (d < cutoff) delete rec.byDay[d]; });

  const adEntries = Object.keys(rec.byAd).map((id) => ({ id, total: (rec.byAd[id] && rec.byAd[id].total) || 0 }));
  if (adEntries.length > MAX_ADS) {
    adEntries.sort((a, b) => b.total - a.total);
    const keep = new Set(adEntries.slice(0, MAX_ADS).map((e) => e.id));
    Object.keys(rec.byAd).forEach((id) => { if (!keep.has(id)) delete rec.byAd[id]; });
  }

  await repos.setContactStats(accountId, rec);
  return { ok: true, counted: true };
}

async function getContactStats(accountId) {
  const rec = await repos.getContactStats(accountId);
  if (!rec) {
    return {
      total: 0,
      monthTotal: 0,
      last30: [],
      byType: { call: 0, whatsapp: 0, email: 0 },
      topAds: [],
    };
  }
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    days.push({ date: d, count: (rec.byDay && rec.byDay[d]) || 0 });
  }
  const monthPrefix = _todayKey().slice(0, 7);
  const monthTotal = Object.keys(rec.byDay || {})
    .filter((d) => d.startsWith(monthPrefix))
    .reduce((sum, d) => sum + (rec.byDay[d] || 0), 0);
  const topAds = Object.keys(rec.byAd || {})
    .map((id) => ({ adId: id, total: (rec.byAd[id] && rec.byAd[id].total) || 0, byType: rec.byAd[id] }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    total: rec.total || 0,
    monthTotal,
    last30: days,
    byType: Object.assign({ call: 0, whatsapp: 0, email: 0 }, rec.byType || {}),
    topAds,
  };
}

function setupContactTrackingAPI(app, limiter, getAccountRecord, getMainAccount, findAdOwner) {
  app.post('/api/contact-click', limiter, async (req, res) => {
    try {
      const b = req.body || {};
      const targetAccountId = String(b.targetAccountId || b.accountId || '').slice(0, 40);
      const adId = String(b.adId || '').slice(0, 80);
      const type = String(b.type || '').toLowerCase();
      if (!CONTACT_TYPES.includes(type)) {
        return res.status(400).json({ ok: false, error: 'invalid_type' });
      }

      /* demo=1 من العميل — لا عدّ */
      if (b.demo === true || b.demo === 1 || b.demo === '1') {
        return res.json({ ok: true, counted: false, reason: 'demo' });
      }

      const mainAcc = getMainAccount ? await getMainAccount(targetAccountId) : null;
      const pkgRec = getAccountRecord ? await getAccountRecord(targetAccountId) : null;
      if (!mainAcc && !pkgRec) {
        return res.json({ ok: true, counted: false, reason: 'unknown_account' });
      }

      if (adId && typeof findAdOwner === 'function') {
        const owner = await findAdOwner(adId);
        if (owner && owner !== targetAccountId) {
          return res.json({ ok: true, counted: false, reason: 'ad_mismatch' });
        }
      }

      const viewerId = String(req.header('x-account-id') || b.viewerId || '').trim();
      /* لا تعدّ نقر صاحب الحساب على إعلانه */
      if (viewerId && viewerId === targetAccountId) {
        return res.json({ ok: true, counted: false, reason: 'self' });
      }

      const viewerKey = _viewerFingerprint(req, viewerId || null);
      const result = await trackContactClick(targetAccountId, {
        type,
        adId,
        viewerKey,
      });
      if (!result.ok && result.status === 400) {
        return res.status(400).json(result);
      }
      return res.json({ ok: true, counted: !!result.counted, deduped: !!result.deduped });
    } catch (err) {
      return res.json({ ok: true, counted: false });
    }
  });

  app.get('/api/contact-click/stats', async (req, res) => {
    try {
      const id = String(req.header('x-account-id') || req.query.accountId || '').trim().slice(0, 40);
      const token = String(req.header('x-account-token') || '').trim();
      if (!id || !token) return res.status(401).json({ error: 'unauthorized' });
      const mainAcc = getMainAccount ? await getMainAccount(id) : null;
      const pkgRec = getAccountRecord ? await getAccountRecord(id) : null;
      if (!mainAcc && !pkgRec) return res.status(404).json({ error: 'account_not_found' });
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
      return res.json({ ok: true, stats: await getContactStats(id) });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'stats_failed' });
    }
  });
}

module.exports = {
  CONTACT_TYPES,
  trackContactClick,
  getContactStats,
  setupContactTrackingAPI,
  _viewerFingerprint,
};
