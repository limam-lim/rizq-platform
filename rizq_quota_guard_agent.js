/**
 * rizq_quota_guard_agent.js
 * ══════════════════════════════════════════════════════════════════
 * مراقبة حصص الباقة الماسية — حظر فوري عند النفاد (بدون تخفيض Haiku)
 * السعات والأسعار تُقرأ ديناميكياً من site-config.json (catalogConfig)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  getQuotaConfig,
  getTopupConfig,
  resolveQuotaLimitsForAccount,
} = require('./rizq-backend/services/catalogConfig');

function storePath() {
  return process.env.RIZQ_QUOTA_STORE ||
    path.join(__dirname, 'rizq-backend', 'data', 'quota-usage.json');
}

/** أسعار Anthropic التقريبية — للتتبع الداخلي فقط */
const RATES = {
  sonnet: { in: 3, out: 15, cacheRead: 0.30, cacheWrite: 3.75 },
};

function numEnv(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function currentPeriod(now) {
  const d = now || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function emptyRow(id, meta) {
  return {
    subscriberId: id,
    accountId: (meta && meta.accountId) || '',
    businessName: (meta && meta.businessName) || '',
    phone: (meta && meta.phone) || '',
    diamondTier: (meta && meta.diamondTier) || 'diamond_standard',
    period: currentPeriod(),
    messages: 0,
    minutes: 0,
    topupMessages: 0,
    topupMinutes: 0,
    tokensIn: 0,
    tokensOut: 0,
    tokensCacheRead: 0,
    tokensCacheWrite: 0,
    costUsd: 0,
    alertLevel: 0,
    events: [],
    topupRequests: [],
  };
}

function _load() {
  try {
    return JSON.parse(fs.readFileSync(storePath(), 'utf8'));
  } catch (e) {
    return { subscribers: {}, topupRequests: [] };
  }
}

function _save(store) {
  try {
    const dir = path.dirname(storePath());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storePath(), JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('[quota-guard] فشل الحفظ:', e.message);
  }
}

function _ensurePeriod(row, meta) {
  const period = currentPeriod();
  if (row.period === period) return row;
  const hist = Array.isArray(row.history) ? row.history : [];
  hist.unshift({
    period: row.period,
    messages: row.messages,
    minutes: row.minutes,
    tokens: (row.tokensIn || 0) + (row.tokensOut || 0),
    costUsd: row.costUsd,
    topupMessages: row.topupMessages || 0,
    topupMinutes: row.topupMinutes || 0,
  });
  return Object.assign(emptyRow(row.subscriberId, {
    accountId: row.accountId || (meta && meta.accountId),
    businessName: row.businessName || (meta && meta.businessName),
    phone: row.phone || (meta && meta.phone),
    diamondTier: row.diamondTier || (meta && meta.diamondTier),
  }), { history: hist.slice(0, 12) });
}

function findRow(store, subscriberId, accountId) {
  const subs = store.subscribers || {};
  if (subscriberId && subs[subscriberId]) return { key: subscriberId, row: subs[subscriberId] };
  if (accountId) {
    const hit = Object.keys(subs).find((k) => subs[k] && subs[k].accountId === accountId);
    if (hit) return { key: hit, row: subs[hit] };
    if (subs[accountId]) return { key: accountId, row: subs[accountId] };
  }
  return null;
}

function resolveRowLimits(row, opts) {
  if (opts && opts.quotaLimits) {
    return {
      messages: opts.quotaLimits.messages + (row.topupMessages || 0),
      minutes: opts.quotaLimits.minutes + (row.topupMinutes || 0),
      tier: opts.quotaLimits.tier || row.diamondTier,
      audioAccess: !!opts.quotaLimits.audioAccess,
    };
  }
  const tier = (opts && opts.diamondTier) || row.diamondTier || 'diamond_standard';
  let accountRec = null;
  try {
    const { getAccountRecord } = require('./rizq-backend/rizq_package_lifecycle_agent');
    accountRec = getAccountRecord(row.accountId);
  } catch (e) { /* optional */ }
  const base = resolveQuotaLimitsForAccount(Object.assign({}, accountRec || {}, {
    diamondTier: tier,
    accountId: row.accountId,
  }));
  return {
    messages: base.messages + (row.topupMessages || 0),
    minutes: base.minutes + (row.topupMinutes || 0),
    tier: base.tier,
    audioAccess: base.audioAccess,
  };
}

function totalTokens(row) {
  return (row.tokensIn || 0) + (row.tokensOut || 0) + (row.tokensCacheRead || 0) + (row.tokensCacheWrite || 0);
}

function ratios(row, opts) {
  const lim = resolveRowLimits(row, opts);
  return {
    messages: lim.messages ? (row.messages || 0) / lim.messages : 0,
    minutes: lim.minutes ? (row.minutes || 0) / lim.minutes : (row.minutes > 0 ? Infinity : 0),
  };
}

function overallPct(row, opts) {
  const r = ratios(row, opts);
  return Math.round(Math.max(r.messages, r.minutes) * 1000) / 10;
}

function isTextChannel(channel) {
  return !channel || channel === 'call';
}

function quotaBlockedState(row, channel, opts) {
  const lim = resolveRowLimits(row, opts);
  const ch = String(channel || 'widget').toLowerCase();
  if (ch === 'call') {
    if (!lim.audioAccess || lim.minutes <= 0) {
      return { blocked: true, dimension: 'audio', reason: 'المكالمات الصوتية غير مشمولة في باقتك — ترقّ إلى الماسية المتقدمة (Pro)' };
    }
    if ((row.minutes || 0) >= lim.minutes) {
      return { blocked: true, dimension: 'minutes', reason: 'استنفدت حصة الدقائق الصوتية — اشترِ شحن صوتي أو جدّد الباقة' };
    }
    return { blocked: false };
  }
  if ((row.messages || 0) >= lim.messages) {
    return { blocked: true, dimension: 'messages', reason: 'استنفدت حصة المحادثات النصية — اشترِ شحن نصي أو جدّد الباقة' };
  }
  return { blocked: false };
}

function estimateUsd(model, usage) {
  const u = usage || {};
  const rate = RATES.sonnet;
  const inn = (u.input_tokens || 0) / 1e6;
  const out = (u.output_tokens || 0) / 1e6;
  const cr = (u.cache_read_input_tokens || 0) / 1e6;
  const cw = (u.cache_creation_input_tokens || 0) / 1e6;
  return inn * rate.in + out * rate.out + cr * rate.cacheRead + cw * rate.cacheWrite;
}

function estimateCallMinutes(text) {
  const secs = Math.max(15, Math.ceil(String(text || '').length / 12));
  return Math.round((secs / 60) * 100) / 100;
}

function snapshotOf(row, opts) {
  const lim = resolveRowLimits(row, opts);
  const pct = overallPct(row, opts);
  const r = ratios(row, opts);
  const textBlock = quotaBlockedState(row, 'widget', opts);
  const callBlock = quotaBlockedState(row, 'call', opts);
  return {
    subscriberId: row.subscriberId,
    accountId: row.accountId || '',
    businessName: row.businessName || '',
    phone: row.phone || '',
    diamondTier: lim.tier || row.diamondTier,
    period: row.period,
    messages: row.messages || 0,
    minutes: Math.round((row.minutes || 0) * 10) / 10,
    topupMessages: row.topupMessages || 0,
    topupMinutes: row.topupMinutes || 0,
    tokens: totalTokens(row),
    costUsd: Math.round((row.costUsd || 0) * 10000) / 10000,
    limits: { messages: lim.messages, minutes: lim.minutes, audioAccess: lim.audioAccess },
    ratios: {
      messages: Math.round(r.messages * 1000) / 10,
      minutes: Math.round(r.minutes * 1000) / 10,
    },
    pct,
    quotaBlocked: textBlock.blocked || callBlock.blocked,
    textBlocked: textBlock.blocked,
    callBlocked: callBlock.blocked,
    blockReason: textBlock.blocked ? textBlock.reason : (callBlock.blocked ? callBlock.reason : null),
    alertLevel: row.alertLevel || 0,
    topups: getTopupConfig(),
    pendingTopup: (row.topupRequests || []).some((a) => a.status === 'pending'),
    events: (row.events || []).slice(0, 8),
  };
}

async function _sendWhatsApp(to, text) {
  const TOKEN = process.env.WHATSAPP_TOKEN || '';
  const PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
  const digits = String(to || '').replace(/\D/g, '');
  if (!TOKEN || !PHONE_ID || digits.length < 8) {
    return { ok: false, error: 'whatsapp_unconfigured' };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: digits,
        type: 'text',
        text: { body: text },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data.error && data.error.message) || ('http_' + res.status) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function alertMessage(level, snap) {
  const name = snap.businessName || 'منشأتك';
  const topups = getTopupConfig();
  if (level >= 100) {
    return (
      '💎 رزق — انتهت الحصة\n' +
      name + ' استنفدت حصة الباقة الماسية (' + snap.pct + '%).\n' +
      'توقف الوكيل حتى شحن إضافي:\n' +
      '• نص: ' + topups.text.conversations + ' محادثة — ' + topups.text.priceMru + ' MRU\n' +
      '• صوت: ' + topups.voice.minutes + ' دقيقة — ' + topups.voice.priceMru + ' MRU'
    );
  }
  return (
    '💎 رزق — تنبيه استهلاك\n' +
    name + ' وصلت إلى ' + snap.pct + '% من حصة الباقة الماسية.\n' +
    'المحادثات: ' + snap.messages + '/' + snap.limits.messages +
    ' · الدقائق: ' + snap.minutes + '/' + snap.limits.minutes
  );
}

async function maybeAlert(row, opts) {
  const pct = overallPct(row, opts);
  let level = row.alertLevel || 0;
  if (pct < 80) level = 0;
  let fired = 0;
  if (pct >= 100 && level < 100) fired = 100;
  else if (pct >= 80 && level < 80) fired = 80;
  if (!fired) {
    row.alertLevel = level;
    return row;
  }
  row.alertLevel = fired;
  const snap = snapshotOf(row, opts);
  const text = alertMessage(fired, snap);
  row.events = [{ at: new Date().toISOString(), level: fired, pct: snap.pct, text }].concat(row.events || []).slice(0, 20);
  const wa = await _sendWhatsApp(row.phone || row.subscriberId, text);
  if (!wa.ok) {
    console.warn('[quota-guard] تنبيه ' + fired + '% لـ ' + row.subscriberId + ' (واتساب: ' + wa.error + ')');
  }
  return row;
}

function getOrCreate(store, subscriberId, meta) {
  const found = findRow(store, subscriberId, meta && meta.accountId);
  const key = (found && found.key) || subscriberId;
  let row = found ? found.row : emptyRow(key, meta);
  row = _ensurePeriod(row, meta);
  if (meta) {
    if (meta.accountId) row.accountId = meta.accountId;
    if (meta.businessName) row.businessName = meta.businessName;
    if (meta.phone) row.phone = meta.phone;
    if (meta.diamondTier) row.diamondTier = meta.diamondTier;
  }
  row.subscriberId = key;
  store.subscribers = store.subscribers || {};
  store.subscribers[key] = row;
  return { key, row };
}

function quotaError(message, dimension, snap) {
  const err = new Error(message || 'quota_exhausted');
  err.status = 429;
  err.code = 'quota_exhausted';
  err.details = { dimension, snapshot: snap };
  return err;
}

function assertQuotaAvailable(opts) {
  opts = opts || {};
  const subscriberId = String(opts.subscriberId || opts.accountId || '').trim();
  if (!subscriberId) return null;
  const store = _load();
  const { row } = getOrCreate(store, subscriberId, opts);
  store.subscribers[row.subscriberId] = row;
  _save(store);
  const block = quotaBlockedState(row, opts.channel || 'widget', opts);
  if (block.blocked) {
    throw quotaError(block.reason, block.dimension, snapshotOf(row, opts));
  }
  return snapshotOf(row, opts);
}

function getQuotaBlockReason(subscriberId, accountId, channel) {
  const snap = getSnapshot(subscriberId, accountId);
  const ch = String(channel || 'widget').toLowerCase();
  if (ch === 'call' && snap.callBlocked) return snap.blockReason;
  if (snap.textBlocked) return snap.blockReason;
  return 'الحصة غير متاحة';
}

async function recordUsage(opts) {
  opts = opts || {};
  const subscriberId = String(opts.subscriberId || opts.accountId || '').trim();
  if (!subscriberId) return null;

  assertQuotaAvailable(opts);

  const store = _load();
  const { row } = getOrCreate(store, subscriberId, opts);
  const usage = opts.usage || {};
  const msgAdd = opts.messages != null ? Number(opts.messages) : 1;
  if (Number.isFinite(msgAdd) && msgAdd > 0 && String(opts.channel || '').toLowerCase() !== 'call') {
    row.messages += msgAdd;
  }
  let minutes = Number(opts.minutes) || 0;
  if (!minutes && opts.channel === 'call') minutes = estimateCallMinutes(opts.replyText || '');
  if (minutes > 0) row.minutes = Math.round(((row.minutes || 0) + minutes) * 100) / 100;
  row.tokensIn += usage.input_tokens || 0;
  row.tokensOut += usage.output_tokens || 0;
  row.tokensCacheRead += usage.cache_read_input_tokens || 0;
  row.tokensCacheWrite += usage.cache_creation_input_tokens || 0;
  row.costUsd = Math.round(((row.costUsd || 0) + estimateUsd(opts.model, usage)) * 100000) / 100000;
  await maybeAlert(row, opts);
  _save(store);
  const snap = snapshotOf(row, opts);
  snap.quotaBlocked = quotaBlockedState(row, opts.channel, opts).blocked;
  return snap;
}

function getSnapshot(subscriberId, accountId, opts) {
  const store = _load();
  const found = findRow(store, subscriberId, accountId);
  if (!found) {
    return snapshotOf(emptyRow(subscriberId || accountId || 'unknown', { accountId: accountId || '' }), opts);
  }
  const row = _ensurePeriod(found.row);
  store.subscribers[found.key] = row;
  _save(store);
  return snapshotOf(row, opts);
}

/** @deprecated — لا تخفيض Haiku؛ يُعاد false دائماً للتوافق الخلفي */
function shouldForceFast() {
  return false;
}

function selectDiamondModel() {
  const { getAdvancedModel } = require('./rizq-backend/config/anthropic');
  return getAdvancedModel();
}

function isQuotaBlocked(subscriberId, accountId, channel, opts) {
  const store = _load();
  const found = findRow(store, subscriberId, accountId);
  if (!found) return false;
  return quotaBlockedState(_ensurePeriod(found.row), channel, opts).blocked;
}

function requestTopup({ subscriberId, accountId, businessName, phone, type }) {
  const topups = getTopupConfig();
  const kind = String(type || 'text').toLowerCase() === 'voice' ? 'voice' : 'text';
  const spec = topups[kind];
  const store = _load();
  const key = String(subscriberId || accountId || '').trim();
  if (!key) return { ok: false, error: 'missing_id' };
  const { row } = getOrCreate(store, key, { accountId, businessName, phone });
  store.topupRequests = Array.isArray(store.topupRequests) ? store.topupRequests : [];
  const pending = (store.topupRequests || []).concat(row.topupRequests || [])
    .find((a) => a.status === 'pending' && a.type === kind && (a.accountId === row.accountId || a.subscriberId === row.subscriberId));
  if (pending) return { ok: true, already: true, request: pending, snapshot: snapshotOf(row) };
  const req = {
    id: 'TOPUP-' + Date.now(),
    type: kind,
    subscriberId: row.subscriberId,
    accountId: row.accountId || accountId || '',
    businessName: row.businessName || businessName || '',
    period: row.period,
    priceMru: spec.priceMru,
    amount: kind === 'voice' ? spec.minutes : spec.conversations,
    unit: kind === 'voice' ? 'minutes' : 'messages',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  store.topupRequests.unshift(req);
  row.topupRequests = [req].concat(row.topupRequests || []).slice(0, 10);
  _save(store);
  return { ok: true, request: req, topup: spec, snapshot: snapshotOf(row) };
}

function resolveTopup(requestId, status) {
  const store = _load();
  const req = (store.topupRequests || []).find((a) => a.id === requestId);
  if (!req) return { ok: false, error: 'not_found' };
  if (req.status !== 'pending') return { ok: false, error: 'already_resolved', request: req };
  req.status = status === 'approved' ? 'approved' : 'rejected';
  req.resolvedAt = new Date().toISOString();
  const found = findRow(store, req.subscriberId, req.accountId);
  if (found && req.status === 'approved') {
    const row = _ensurePeriod(found.row);
    if (req.type === 'voice') row.topupMinutes = (row.topupMinutes || 0) + Number(req.amount || 0);
    else row.topupMessages = (row.topupMessages || 0) + Number(req.amount || 0);
    row.alertLevel = overallPct(row) >= 100 ? 100 : overallPct(row) >= 80 ? 80 : 0;
    (row.topupRequests || []).forEach((a) => {
      if (a.id === requestId) {
        a.status = req.status;
        a.resolvedAt = req.resolvedAt;
      }
    });
    store.subscribers[found.key] = row;
  }
  _save(store);
  return { ok: true, request: req, snapshot: found ? snapshotOf(found.row) : null };
}

function listAdminUsage(profiles) {
  const store = _load();
  const seen = {};
  const rows = [];
  function pushFrom(id, meta) {
    const { row } = getOrCreate(store, id, meta);
    if (seen[row.subscriberId]) return;
    seen[row.subscriberId] = true;
    rows.push(snapshotOf(row));
  }
  (profiles || []).forEach((p) => {
    const id = p.subscriberId || p.id;
    if (!id) return;
    pushFrom(id, {
      accountId: p.accountId || '',
      businessName: p.businessName || p.name || '',
      phone: p.phone || p.subscriberId || '',
      diamondTier: p.diamondTier,
    });
  });
  Object.keys(store.subscribers || {}).forEach((id) => {
    if (!seen[id]) rows.push(snapshotOf(_ensurePeriod(store.subscribers[id])));
  });
  rows.sort((a, b) => b.pct - a.pct);
  const pending = (store.topupRequests || []).filter((a) => a.status === 'pending');
  const totalCost = rows.reduce((s, r) => s + (r.costUsd || 0), 0);
  return {
    period: currentPeriod(),
    limits: getQuotaConfig(),
    topups: getTopupConfig(),
    count: rows.length,
    over80: rows.filter((r) => r.pct >= 80).length,
    blocked: rows.filter((r) => r.quotaBlocked).length,
    totalCostUsd: Math.round(totalCost * 10000) / 10000,
    pendingTopups: pending,
    subscribers: rows,
  };
}

function setupQuotaGuardAPI(app, requireSharedSecret, deps) {
  deps = deps || {};
  const verifyAccountOwner = deps.verifyAccountOwner || (() => null);
  const getAccountRecord = deps.getAccountRecord || (() => null);
  const loadProfiles = deps.loadProfiles || (() => []);

  function ownerOf(accountId, token) {
    const acc = verifyAccountOwner(accountId, token);
    if (acc) return acc;
    const rec = getAccountRecord(accountId);
    if (rec && rec.accessToken && token && token === rec.accessToken) {
      return { id: accountId, name: rec.businessName || rec.name || '', phone: rec.phone || '' };
    }
    return null;
  }

  app.get('/api/quota/admin', requireSharedSecret, (req, res) => {
    try {
      res.json({ ok: true, ...listAdminUsage(loadProfiles()) });
    } catch (err) {
      console.error('[quota/admin]', err.message);
      res.status(500).json({ ok: false, error: 'تعذّر قراءة الاستهلاك' });
    }
  });

  app.post('/api/quota/admin/topups/:id/resolve', requireSharedSecret, (req, res) => {
    const status = (req.body && req.body.status) || 'approved';
    const out = resolveTopup(req.params.id, status);
    if (!out.ok) return res.status(404).json(out);
    res.json(out);
  });

  app.post('/api/quota/admin/addons/:id/resolve', requireSharedSecret, (req, res) => {
    const out = resolveTopup(req.params.id, (req.body && req.body.status) || 'approved');
    if (!out.ok) return res.status(404).json(out);
    res.json(out);
  });

  app.get('/api/quota/mine/:accountId', (req, res) => {
    const accountId = req.params.accountId;
    const token = req.header('x-account-token') || req.query.token || '';
    const acc = ownerOf(accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const snap = getSnapshot(acc.phone || accountId, accountId);
    snap.businessName = snap.businessName || acc.name || '';
    res.json({ ok: true, usage: snap, topups: getTopupConfig() });
  });

  app.post('/api/subscriber/quota/topup', (req, res) => {
    const body = req.body || {};
    const accountId = String(body.accountId || '').trim();
    const token = req.header('x-account-token') || body.token || '';
    const acc = ownerOf(accountId, token);
    if (!acc) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const type = String(body.type || 'text').toLowerCase() === 'voice' ? 'voice' : 'text';
    const out = requestTopup({
      subscriberId: acc.phone || accountId,
      accountId,
      businessName: acc.name || '',
      phone: acc.phone || '',
      type,
    });
    res.json(out);
  });

  app.post('/api/quota/mine/:accountId/addon', (req, res) => {
    const accountId = req.params.accountId;
    const token = req.header('x-account-token') || req.query.token || '';
    const acc = ownerOf(accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const type = (req.body && req.body.type) || 'text';
    const out = requestTopup({
      subscriberId: acc.phone || accountId,
      accountId,
      businessName: acc.name || '',
      phone: acc.phone || '',
      type,
    });
    res.json(out);
  });
}

module.exports = {
  getQuotaConfig,
  getTopupConfig,
  assertQuotaAvailable,
  getQuotaBlockReason,
  recordUsage,
  getSnapshot,
  shouldForceFast,
  selectDiamondModel,
  isQuotaBlocked,
  requestTopup,
  resolveTopup,
  listAdminUsage,
  estimateCallMinutes,
  estimateUsd,
  overallPct,
  setupQuotaGuardAPI,
  currentPeriod,
};
