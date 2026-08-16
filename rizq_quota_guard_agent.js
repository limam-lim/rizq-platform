/**
 * rizq_quota_guard_agent.js
 * ══════════════════════════════════════════════════════════════════
 * وكيل مراقبة الاستهلاك العادل للباقة الماسية 💎
 *
 * يتتبع لكل مشترك ماسي خلال الشهر الميلادي:
 *   - الرسائل (واتساب / بريد / ويدجت الداشبورد / رد الاستفسارات)
 *   - دقائق المكالمات (تقدير من ردّ الصوت إن لم يتوفر Twilio duration)
 *   - التوكنز وتكلفة Claude API بالدولار
 *
 * عند 80%: إشعار وشوك انتهاء الحصة.
 * عند 100%: إشعار + خيار حزمة إضافية + تحويل Sonnet → Haiku لحماية رصيد API.
 *
 * التخزين: ملف JSON مشترك (rizq-backend/data/quota-usage.json) لتراه
 * عملية المكالمات وعملية rizq-backend معاً.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function storePath() {
  return process.env.RIZQ_QUOTA_STORE ||
    path.join(__dirname, 'rizq-backend', 'data', 'quota-usage.json');
}

function getBaseLimits() {
  return {
    messages: numEnv('RIZQ_QUOTA_MSG_LIMIT', 500),
    minutes: numEnv('RIZQ_QUOTA_MIN_LIMIT', 120),
    tokens: numEnv('RIZQ_QUOTA_TOKEN_LIMIT', 400000),
    costUsd: numEnv('RIZQ_QUOTA_COST_USD_LIMIT', 8),
  };
}

const ADDON = {
  priceMru: numEnv('RIZQ_QUOTA_ADDON_PRICE_MRU', 1500),
  extraMessages: numEnv('RIZQ_QUOTA_ADDON_MSG', 250),
  extraMinutes: numEnv('RIZQ_QUOTA_ADDON_MIN', 60),
  extraTokens: numEnv('RIZQ_QUOTA_ADDON_TOKENS', 200000),
  extraCostUsd: numEnv('RIZQ_QUOTA_ADDON_COST_USD', 4),
};

/** أسعار Anthropic التقريبية لكل مليون توكن (USD) — Haiku 4.5 / Sonnet 4.5 */
const RATES = {
  sonnet: { in: 3, out: 15, cacheRead: 0.30, cacheWrite: 3.75 },
  haiku: { in: 1, out: 5, cacheRead: 0.10, cacheWrite: 1.25 },
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
    period: currentPeriod(),
    messages: 0,
    minutes: 0,
    tokensIn: 0,
    tokensOut: 0,
    tokensCacheRead: 0,
    tokensCacheWrite: 0,
    costUsd: 0,
    addons: 0,
    alertLevel: 0,
    events: [],
    addonRequests: [],
  };
}

function _load() {
  try {
    return JSON.parse(fs.readFileSync(storePath(), 'utf8'));
  } catch (e) {
    return { subscribers: {}, addonRequests: [] };
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
    addons: row.addons,
  });
  return Object.assign(emptyRow(row.subscriberId, {
    accountId: row.accountId || (meta && meta.accountId),
    businessName: row.businessName || (meta && meta.businessName),
    phone: row.phone || (meta && meta.phone),
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

function getLimits(row) {
  const base = getBaseLimits();
  const n = (row && row.addons) || 0;
  return {
    messages: base.messages + n * ADDON.extraMessages,
    minutes: base.minutes + n * ADDON.extraMinutes,
    tokens: base.tokens + n * ADDON.extraTokens,
    costUsd: base.costUsd + n * ADDON.extraCostUsd,
  };
}

function totalTokens(row) {
  return (row.tokensIn || 0) + (row.tokensOut || 0) + (row.tokensCacheRead || 0) + (row.tokensCacheWrite || 0);
}

function ratios(row) {
  const lim = getLimits(row);
  const tokens = totalTokens(row);
  return {
    messages: lim.messages ? (row.messages || 0) / lim.messages : 0,
    minutes: lim.minutes ? (row.minutes || 0) / lim.minutes : 0,
    tokens: lim.tokens ? tokens / lim.tokens : 0,
    costUsd: lim.costUsd ? (row.costUsd || 0) / lim.costUsd : 0,
  };
}

function overallPct(row) {
  const r = ratios(row);
  return Math.round(Math.max(r.messages, r.minutes, r.tokens, r.costUsd) * 1000) / 10;
}

function estimateUsd(model, usage) {
  const u = usage || {};
  const haiku = /haiku/i.test(String(model || ''));
  const rate = haiku ? RATES.haiku : RATES.sonnet;
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

function snapshotOf(row) {
  const lim = getLimits(row);
  const pct = overallPct(row);
  const r = ratios(row);
  return {
    subscriberId: row.subscriberId,
    accountId: row.accountId || '',
    businessName: row.businessName || '',
    phone: row.phone || '',
    period: row.period,
    messages: row.messages || 0,
    minutes: Math.round((row.minutes || 0) * 10) / 10,
    tokens: totalTokens(row),
    costUsd: Math.round((row.costUsd || 0) * 10000) / 10000,
    addons: row.addons || 0,
    limits: lim,
    ratios: {
      messages: Math.round(r.messages * 1000) / 10,
      minutes: Math.round(r.minutes * 1000) / 10,
      tokens: Math.round(r.tokens * 1000) / 10,
      costUsd: Math.round(r.costUsd * 1000) / 10,
    },
    pct,
    forceFast: pct >= 100,
    alertLevel: row.alertLevel || 0,
    addon: ADDON,
    pendingAddon: (row.addonRequests || []).some((a) => a.status === 'pending'),
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
  if (level >= 100) {
    return (
      '💎 رزق — حصة الباقة الماسية\n' +
      name + ' استنفدت الحصة العادلة لهذا الشهر (' + snap.pct + '%).\n' +
      'حُوّل الوكيل تلقائياً إلى النموذج السريع (Haiku) لحماية الخدمة.\n' +
      'لشراء حزمة إضافية (' + ADDON.priceMru + ' أوقية): افتح لوحة التحكم ← الوكيل الذكي.'
    );
  }
  return (
    '💎 رزق — تنبيه استهلاك\n' +
    name + ' وصلت إلى ' + snap.pct + '% من الحصة العادلة للباقة الماسية هذا الشهر.\n' +
    'الرسائل: ' + snap.messages + '/' + snap.limits.messages +
    ' · الدقائق: ' + snap.minutes + '/' + snap.limits.minutes +
    ' · التوكنز: ' + snap.tokens + '/' + snap.limits.tokens +
    '\nجدّد أو اشترِ حزمة إضافية قبل انقطاع النموذج المتقدم.'
  );
}

async function maybeAlert(row) {
  const pct = overallPct(row);
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
  const snap = snapshotOf(row);
  const text = alertMessage(fired, snap);
  row.events = [{ at: new Date().toISOString(), level: fired, pct: snap.pct, text }].concat(row.events || []).slice(0, 20);
  const wa = await _sendWhatsApp(row.phone || row.subscriberId, text);
  if (!wa.ok) {
    console.warn('[quota-guard] تنبيه ' + fired + '% لـ ' + row.subscriberId + ' (واتساب: ' + wa.error + ')');
  } else {
    console.log('[quota-guard] تنبيه ' + fired + '% أُرسل لـ ' + (row.businessName || row.subscriberId));
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
  }
  row.subscriberId = key;
  store.subscribers = store.subscribers || {};
  store.subscribers[key] = row;
  return { key, row };
}

async function recordUsage(opts) {
  opts = opts || {};
  const subscriberId = String(opts.subscriberId || opts.accountId || '').trim();
  if (!subscriberId) return null;
  const store = _load();
  const { row } = getOrCreate(store, subscriberId, {
    accountId: opts.accountId || '',
    businessName: opts.businessName || '',
    phone: opts.phone || '',
  });
  const usage = opts.usage || {};
  const msgAdd = opts.messages != null ? Number(opts.messages) : 1;
  if (Number.isFinite(msgAdd) && msgAdd > 0) row.messages += msgAdd;
  let minutes = Number(opts.minutes) || 0;
  if (!minutes && opts.channel === 'call') minutes = estimateCallMinutes(opts.replyText || '');
  row.minutes = Math.round(((row.minutes || 0) + minutes) * 100) / 100;
  row.tokensIn += usage.input_tokens || 0;
  row.tokensOut += usage.output_tokens || 0;
  row.tokensCacheRead += usage.cache_read_input_tokens || 0;
  row.tokensCacheWrite += usage.cache_creation_input_tokens || 0;
  row.costUsd = Math.round(((row.costUsd || 0) + estimateUsd(opts.model, usage)) * 100000) / 100000;
  await maybeAlert(row);
  _save(store);
  return snapshotOf(row);
}

function getSnapshot(subscriberId, accountId) {
  const store = _load();
  const found = findRow(store, subscriberId, accountId);
  if (!found) {
    return snapshotOf(emptyRow(subscriberId || accountId || 'unknown', { accountId: accountId || '' }));
  }
  const row = _ensurePeriod(found.row);
  store.subscribers[found.key] = row;
  _save(store);
  return snapshotOf(row);
}

function shouldForceFast(subscriberId, accountId) {
  return getSnapshot(subscriberId, accountId).forceFast;
}

function selectDiamondModel(subscriberId, accountId) {
  const { getFastModel, getAdvancedModel } = require('./rizq-backend/config/anthropic');
  return shouldForceFast(subscriberId, accountId) ? getFastModel() : getAdvancedModel();
}

function requestAddon({ subscriberId, accountId, businessName, phone }) {
  const store = _load();
  const key = String(subscriberId || accountId || '').trim();
  if (!key) return { ok: false, error: 'missing_id' };
  const { row } = getOrCreate(store, key, { accountId, businessName, phone });
  store.addonRequests = Array.isArray(store.addonRequests) ? store.addonRequests : [];
  const pending = store.addonRequests.find((a) => a.status === 'pending' && (a.subscriberId === row.subscriberId || (accountId && a.accountId === accountId)));
  if (pending) return { ok: true, already: true, request: pending, snapshot: snapshotOf(row) };
  const req = {
    id: 'ADDON-' + Date.now(),
    subscriberId: row.subscriberId,
    accountId: row.accountId || accountId || '',
    businessName: row.businessName || businessName || '',
    period: row.period,
    priceMru: ADDON.priceMru,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  store.addonRequests.unshift(req);
  row.addonRequests = [req].concat(row.addonRequests || []).slice(0, 10);
  _save(store);
  return { ok: true, request: req, snapshot: snapshotOf(row) };
}

function resolveAddon(requestId, status) {
  const store = _load();
  const req = (store.addonRequests || []).find((a) => a.id === requestId);
  if (!req) return { ok: false, error: 'not_found' };
  if (req.status !== 'pending') return { ok: false, error: 'already_resolved', request: req };
  req.status = status === 'approved' ? 'approved' : 'rejected';
  req.resolvedAt = new Date().toISOString();
  const found = findRow(store, req.subscriberId, req.accountId);
  if (found) {
    const row = _ensurePeriod(found.row);
    if (req.status === 'approved') {
      row.addons = (row.addons || 0) + 1;
      row.alertLevel = overallPct(row) >= 100 ? 100 : overallPct(row) >= 80 ? 80 : 0;
    }
    (row.addonRequests || []).forEach((a) => {
      if (a.id === requestId) {
        a.status = req.status;
        a.resolvedAt = req.resolvedAt;
      }
    });
    store.subscribers[found.key] = row;
    _save(store);
    return { ok: true, request: req, snapshot: snapshotOf(row) };
  }
  _save(store);
  return { ok: true, request: req };
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
    });
  });
  Object.keys(store.subscribers || {}).forEach((id) => {
    if (!seen[id]) rows.push(snapshotOf(_ensurePeriod(store.subscribers[id])));
  });
  rows.sort((a, b) => b.pct - a.pct);
  const pending = (store.addonRequests || []).filter((a) => a.status === 'pending');
  const totalCost = rows.reduce((s, r) => s + (r.costUsd || 0), 0);
  return {
    period: currentPeriod(),
    limits: getBaseLimits(),
    addon: ADDON,
    count: rows.length,
    over80: rows.filter((r) => r.pct >= 80).length,
    over100: rows.filter((r) => r.forceFast).length,
    totalCostUsd: Math.round(totalCost * 10000) / 10000,
    pendingAddons: pending,
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

  app.post('/api/quota/admin/addons/:id/resolve', requireSharedSecret, (req, res) => {
    const status = (req.body && req.body.status) || 'approved';
    const out = resolveAddon(req.params.id, status);
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
    res.json({ ok: true, usage: snap });
  });

  app.post('/api/quota/mine/:accountId/addon', (req, res) => {
    const accountId = req.params.accountId;
    const token = req.header('x-account-token') || req.query.token || '';
    const acc = ownerOf(accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const out = requestAddon({
      subscriberId: acc.phone || accountId,
      accountId,
      businessName: acc.name || '',
      phone: acc.phone || '',
    });
    res.json(out);
  });
}

module.exports = {
  getBaseLimits,
  ADDON,
  recordUsage,
  getSnapshot,
  shouldForceFast,
  selectDiamondModel,
  requestAddon,
  resolveAddon,
  listAdminUsage,
  estimateCallMinutes,
  estimateUsd,
  overallPct,
  setupQuotaGuardAPI,
  currentPeriod,
};
