/**
 * rizq_quota_guard_agent.js
 * ══════════════════════════════════════════════════════════════════
 * مراقبة حصص الباقة الماسية — حظر فوري عند النفاد (بدون تخفيض Haiku)
 * السعات والأسعار تُقرأ ديناميكياً من site-config.json (catalogConfig)
 *
 * التخزين: صف لكل مشترك في PostgreSQL (rizq-backend/db/quotaStore) بزيادات ذرّية
 * داخل قاعدة البيانات — لا قراءة/تعديل/حفظ لمستند مشترك.
 *
 * الرصيد:
 *   messages / minutes     — استهلاك الشهر (يُصفَّر شهرياً)
 *   paidMessages / paidMinutes — رصيد الشحن المدفوع المتبقي (لا يُصفَّر شهرياً)
 *   الاستهلاك يأخذ من حصة الشهر أولاً ثم من الرصيد المدفوع.
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

const HISTORY_MAX = 12;
const EVENTS_MAX = 20;

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
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
    paidMessages: 0,
    paidMinutes: 0,
    paidMessagesUsed: 0,
    paidMinutesUsed: 0,
    paidMessagesTotal: 0,
    paidMinutesTotal: 0,
    tokensIn: 0,
    tokensOut: 0,
    tokensCacheRead: 0,
    tokensCacheWrite: 0,
    costUsd: 0,
    alertLevel: 0,
    events: [],
    history: [],
  };
}

function metaPatch(meta) {
  const out = {};
  if (!meta) return out;
  ['accountId', 'businessName', 'phone', 'diamondTier'].forEach((k) => {
    if (meta[k]) out[k] = String(meta[k]);
  });
  return out;
}

/**
 * صف بالصيغة القديمة (topupMessages/topupMinutes = شحن "هذا الشهر") → رصيد مدفوع منفصل.
 * إن عُرفت حصة الشهر يُخصم ما استُهلك فعلاً من الشحن فوق الحصة.
 */
function normalizeRow(row, base) {
  if (!row || typeof row !== 'object') return row;
  if (row.paidMessages != null || row.paidMinutes != null) return row;
  const out = Object.assign({}, row);
  const tm = Number(row.topupMessages) || 0;
  const tmin = Number(row.topupMinutes) || 0;
  let usedM = 0;
  let usedMin = 0;
  if (base) {
    usedM = Math.min(tm, Math.max(0, (Number(row.messages) || 0) - (Number(base.messages) || 0)));
    usedMin = round2(Math.min(tmin, Math.max(0, (Number(row.minutes) || 0) - (Number(base.minutes) || 0))));
  }
  out.paidMessages = tm - usedM;
  out.paidMinutes = round2(tmin - usedMin);
  out.paidMessagesUsed = usedM;
  out.paidMinutesUsed = usedMin;
  out.paidMessagesTotal = tm;
  out.paidMinutesTotal = tmin;
  delete out.topupMessages;
  delete out.topupMinutes;
  delete out.topupRequests;
  if (!Array.isArray(out.history)) out.history = [];
  return out;
}

/** نسخة الصف بعد إغلاق الشهر — نفس منطق quotaStore.rollPeriod (الرصيد المدفوع يبقى) */
function rolledRow(row, period) {
  const hist = Array.isArray(row.history) ? row.history : [];
  return Object.assign({}, row, {
    period,
    messages: 0,
    minutes: 0,
    paidMessagesUsed: 0,
    paidMinutesUsed: 0,
    tokensIn: 0,
    tokensOut: 0,
    tokensCacheRead: 0,
    tokensCacheWrite: 0,
    costUsd: 0,
    alertLevel: 0,
    history: [{
      period: row.period,
      messages: row.messages || 0,
      minutes: row.minutes || 0,
      tokens: (row.tokensIn || 0) + (row.tokensOut || 0),
      costUsd: row.costUsd || 0,
      paidMessagesUsed: row.paidMessagesUsed || 0,
      paidMinutesUsed: row.paidMinutesUsed || 0,
      paidMessagesLeft: row.paidMessages || 0,
      paidMinutesLeft: row.paidMinutes || 0,
    }].concat(hist).slice(0, HISTORY_MAX),
  });
}

/** عرض للقراءة فقط: إن كان الصف من شهر سابق يُعرض كأنه أُغلق (بدون كتابة) */
function periodView(row) {
  const period = currentPeriod();
  return String(row.period || '') < period ? rolledRow(row, period) : row;
}

/** حساب السحب من الرصيد المدفوع — نفس منطق quotaStore.incrementUsage */
function applyUsage(row, d, base) {
  const draw = (used, paidUsed, paid, add, limit) => {
    const fromMonthly = Math.min(add, Math.max(0, limit + (row[paidUsed] || 0) - (row[used] || 0)));
    return Math.min(add - fromMonthly, Math.max(row[paid] || 0, 0));
  };
  const dm = draw('messages', 'paidMessagesUsed', 'paidMessages', d.messages, Number(base.messages) || 0);
  const dmin = draw('minutes', 'paidMinutesUsed', 'paidMinutes', d.minutes, Number(base.minutes) || 0);
  row.messages = (row.messages || 0) + d.messages;
  row.minutes = round2((row.minutes || 0) + d.minutes);
  row.paidMessages = (row.paidMessages || 0) - dm;
  row.paidMessagesUsed = (row.paidMessagesUsed || 0) + dm;
  row.paidMinutes = round2((row.paidMinutes || 0) - dmin);
  row.paidMinutesUsed = round2((row.paidMinutesUsed || 0) + dmin);
  row.tokensIn = (row.tokensIn || 0) + d.tokensIn;
  row.tokensOut = (row.tokensOut || 0) + d.tokensOut;
  row.tokensCacheRead = (row.tokensCacheRead || 0) + d.tokensCacheRead;
  row.tokensCacheWrite = (row.tokensCacheWrite || 0) + d.tokensCacheWrite;
  row.costUsd = Math.round(((row.costUsd || 0) + d.costUsd) * 100000) / 100000;
  return row;
}

/** إضافة رصيد مدفوع؛ يسدّد أولاً أي تجاوز سابق لحصة الشهر — نفس منطق quotaStore.resolveTopup */
function applyCredit(row, kind, amount, base) {
  const voice = kind === 'voice';
  const used = voice ? 'minutes' : 'messages';
  const paid = voice ? 'paidMinutes' : 'paidMessages';
  const paidUsed = voice ? 'paidMinutesUsed' : 'paidMessagesUsed';
  const total = voice ? 'paidMinutesTotal' : 'paidMessagesTotal';
  const limit = Number(voice ? base.minutes : base.messages) || 0;
  const debt = Math.max(0, (row[used] || 0) - limit - (row[paidUsed] || 0));
  const settle = Math.min(debt, (row[paid] || 0) + amount);
  row[paid] = round2((row[paid] || 0) + amount - settle);
  row[paidUsed] = round2((row[paidUsed] || 0) + settle);
  row[total] = round2((row[total] || 0) + amount);
  return row;
}

/* ── التخزين ──────────────────────────────────────────────────────── */

function _isMemoryMode() {
  return process.env.RIZQ_QUOTA_STORE === 'memory' || process.env.RIZQ_QUOTA_MEMORY_ONLY === '1';
}

function _emptyStore() {
  return { subscribers: {}, topupRequests: [] };
}

function _readLegacyFile() {
  try {
    const raw = JSON.parse(fs.readFileSync(storePath(), 'utf8'));
    if (raw && typeof raw === 'object') return raw;
  } catch (e) { /* missing file ok */ }
  return null;
}

/**
 * مخزن محلي (ذاكرة أو ملف JSON) — للاختبارات أو عند غياب قاعدة البيانات.
 * كل عملية متزامنة بالكامل (بلا await بين القراءة والكتابة) فهي ذرّية داخل العملية.
 * وضع الملف غير آمن بين عدة عمليات (Node processes).
 */
let _fileCache = null;
function _localStore() {
  let store;
  let persist = () => {};
  if (_isMemoryMode()) {
    if (!global.__rizqQuotaMemory) global.__rizqQuotaMemory = _emptyStore();
    store = global.__rizqQuotaMemory;
  } else {
    const p = storePath();
    if (!_fileCache || _fileCache.path !== p) _fileCache = { path: p, store: _readLegacyFile() || _emptyStore() };
    store = _fileCache.store;
    persist = () => {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, JSON.stringify(store, null, 2), 'utf8');
      } catch (e) {
        console.error('[quota-guard] فشل الحفظ:', e.message);
      }
    };
  }
  if (!store.subscribers || typeof store.subscribers !== 'object') store.subscribers = {};
  if (!Array.isArray(store.topupRequests)) store.topupRequests = [];
  return { store, persist };
}

function _localRow(store, key) {
  const row = store.subscribers[key];
  if (!row) return null;
  const n = normalizeRow(row, null);
  if (n !== row) store.subscribers[key] = n;
  return n;
}

function _copy(o) {
  return o ? JSON.parse(JSON.stringify(o)) : o;
}

const localBackend = {
  async getRow(key) {
    const { store } = _localStore();
    return _copy(_localRow(store, key));
  },
  async findKeyByAccount(accountId) {
    const { store } = _localStore();
    const subs = store.subscribers;
    return Object.keys(subs).sort().find((k) => subs[k] && subs[k].accountId === accountId) || null;
  },
  async ensureRow(key, initRow, patch) {
    const { store, persist } = _localStore();
    const row = _localRow(store, key) || (store.subscribers[key] = initRow);
    Object.assign(row, patch || {});
    persist();
    return _copy(row);
  },
  async rollPeriod(key, period) {
    const { store, persist } = _localStore();
    const row = _localRow(store, key);
    if (!row || !(String(row.period || '') < period)) return null;
    store.subscribers[key] = rolledRow(row, period);
    persist();
    return _copy(store.subscribers[key]);
  },
  async incrementUsage(key, period, d, base) {
    const { store, persist } = _localStore();
    const row = _localRow(store, key);
    if (!row || String(row.period || '') < period) return null;
    applyUsage(row, d, base);
    persist();
    return _copy(row);
  },
  async raiseAlert(key, period, level, event) {
    const { store, persist } = _localStore();
    const row = _localRow(store, key);
    if (!row || row.period !== period || (row.alertLevel || 0) >= level) return null;
    row.alertLevel = level;
    row.events = [event].concat(Array.isArray(row.events) ? row.events : []).slice(0, EVENTS_MAX);
    persist();
    return _copy(row);
  },
  async lowerAlert(key, level) {
    const { store, persist } = _localStore();
    const row = _localRow(store, key);
    if (!row || (row.alertLevel || 0) <= level) return;
    row.alertLevel = level;
    persist();
  },
  async listRows() {
    const { store } = _localStore();
    return Object.keys(store.subscribers).map((k) => _copy(_localRow(store, k))).filter(Boolean);
  },
  async listPendingTopups() {
    const { store } = _localStore();
    return _copy(store.topupRequests.filter((a) => a && a.status === 'pending'));
  },
  async hasPendingTopup(subscriberId, accountId) {
    const { store } = _localStore();
    return store.topupRequests.some((a) => a && a.status === 'pending'
      && (a.subscriberId === subscriberId || (accountId && a.accountId === accountId)));
  },
  async createTopupIfNoPending(req) {
    const { store, persist } = _localStore();
    const hit = store.topupRequests.find((a) => a && a.status === 'pending' && a.type === req.type
      && (a.subscriberId === req.subscriberId || (req.accountId && a.accountId === req.accountId)));
    if (hit) return { created: false, request: _copy(hit) };
    store.topupRequests.unshift(req);
    persist();
    return { created: true, request: _copy(req) };
  },
  async getTopup(id) {
    const { store } = _localStore();
    return _copy(store.topupRequests.find((a) => a && a.id === id) || null);
  },
  async resolveTopup(id, status, key, base) {
    const { store, persist } = _localStore();
    const req = store.topupRequests.find((a) => a && a.id === id);
    if (!req) return { ok: false, error: 'not_found' };
    if (req.status !== 'pending') return { ok: false, error: 'already_resolved', request: _copy(req) };
    const row = key ? _localRow(store, key) : null;
    if (status === 'approved' && key && !row) throw new Error('quota row missing for top-up ' + id);
    req.status = status;
    req.resolvedAt = new Date().toISOString();
    if (status === 'approved' && row) applyCredit(row, req.type, Number(req.amount) || 0, base);
    persist();
    return { ok: true, request: _copy(req), row: _copy(row) };
  },
};

let _pg = null;
let _pgTried = false;
let _migrated = null;

function _pgBackend() {
  if (!_pgTried) {
    _pgTried = true;
    try {
      const repos = require('./rizq-backend/db/repos');
      const store = require('./rizq-backend/db/quotaStore');
      _pg = { repos, store };
    } catch (e) {
      console.warn('[quota-guard] PostgreSQL unavailable — using local file store:', e.message);
      _pg = null;
    }
  }
  return _pg;
}

/** ترحيل لمرة واحدة: ملف JSON القديم → quota_usage/_root → صفوف لكل مشترك */
function _ensureMigrated(pg) {
  if (_migrated) return _migrated;
  _migrated = (async () => {
    const root = await pg.repos.quotaUsage.get('_root');
    if (!root) {
      const legacy = _readLegacyFile();
      await pg.repos.quotaUsage.insertIfAbsent('_root', legacy && legacy.subscribers ? legacy : { schema: 2 });
      if (legacy && legacy.subscribers) console.log('[quota-guard] migrated quota-usage.json → PostgreSQL');
    }
    const n = await pg.store.migrateLegacyRoot(async (row) => {
      let base = null;
      try { base = await baseLimits(row, null); } catch (e) { base = null; }
      return normalizeRow(row, base);
    });
    if (n) await pg.repos.quotaUsage.writeBackup();
  })();
  _migrated.catch(() => { _migrated = null; });
  return _migrated;
}

let _backupTimer = null;
function _scheduleBackup(pg) {
  if (_backupTimer) return;
  _backupTimer = setTimeout(() => {
    _backupTimer = null;
    pg.repos.quotaUsage.writeBackup().catch(() => {});
  }, 60 * 1000);
  if (_backupTimer.unref) _backupTimer.unref();
}

/** يرجع واجهة التخزين: ذاكرة (اختبارات) أو PostgreSQL أو ملف محلي (بدون قاعدة بيانات) */
async function backend() {
  if (_isMemoryMode()) return localBackend;
  const pg = _pgBackend();
  if (!pg) return localBackend;
  await _ensureMigrated(pg);
  return Object.assign({}, pg.store, {
    async incrementUsage(...args) {
      const row = await pg.store.incrementUsage(...args);
      if (row) _scheduleBackup(pg);
      return row;
    },
    async createTopupIfNoPending(req) {
      const out = await pg.store.createTopupIfNoPending(req);
      if (out.created) await pg.repos.quotaUsage.writeBackup();
      return out;
    },
    async resolveTopup(...args) {
      const out = await pg.store.resolveTopup(...args);
      if (out.ok) await pg.repos.quotaUsage.writeBackup();
      return out;
    },
  });
}

/** يجد مفتاح صف المشترك دون إنشائه */
async function findKey(be, subscriberId, accountId) {
  if (subscriberId && await be.getRow(subscriberId)) return subscriberId;
  if (accountId) {
    const hit = await be.findKeyByAccount(accountId);
    if (hit) return hit;
    if (await be.getRow(accountId)) return accountId;
  }
  return null;
}

/** يجد الصف أو ينشئه، ويغلق الشهر السابق إن لزم (كلها عمليات ذرّية في التخزين) */
async function resolveRow(be, subscriberId, meta) {
  const key = (await findKey(be, subscriberId, meta && meta.accountId)) || subscriberId;
  let row = await be.ensureRow(key, emptyRow(key, meta), metaPatch(meta));
  const period = currentPeriod();
  if (String(row.period || '') < period) {
    row = (await be.rollPeriod(key, period)) || (await be.getRow(key)) || row;
  }
  return { key, row };
}

/* ── الحدود والنِّسب ─────────────────────────────────────────────── */

/** حصة الشهر من الباقة (بدون الرصيد المدفوع) */
async function baseLimits(row, opts) {
  if (opts && opts.quotaLimits) {
    return {
      messages: Number(opts.quotaLimits.messages) || 0,
      minutes: Number(opts.quotaLimits.minutes) || 0,
      tier: opts.quotaLimits.tier || row.diamondTier,
      audioAccess: !!opts.quotaLimits.audioAccess,
    };
  }
  const tier = (opts && opts.diamondTier) || row.diamondTier || 'diamond_standard';
  let accountRec = null;
  try {
    const { getAccountRecord } = require('./rizq-backend/rizq_package_lifecycle_agent');
    accountRec = await getAccountRecord(row.accountId);
  } catch (e) { /* optional */ }
  const base = await resolveQuotaLimitsForAccount(Object.assign({}, accountRec || {}, {
    diamondTier: tier,
    accountId: row.accountId,
  }));
  return {
    messages: Number(base.messages) || 0,
    minutes: Number(base.minutes) || 0,
    tier: base.tier,
    audioAccess: base.audioAccess,
  };
}

/** الحد الفعلي للشهر = حصة الشهر + ما سُحب من الرصيد المدفوع + الرصيد المتبقي */
function effectiveLimits(row, base) {
  return {
    messages: base.messages + (row.paidMessagesUsed || 0) + (row.paidMessages || 0),
    minutes: round2(base.minutes + (row.paidMinutesUsed || 0) + (row.paidMinutes || 0)),
    tier: base.tier,
    audioAccess: base.audioAccess,
  };
}

function totalTokens(row) {
  return (row.tokensIn || 0) + (row.tokensOut || 0) + (row.tokensCacheRead || 0) + (row.tokensCacheWrite || 0);
}

function ratiosOf(row, lim) {
  return {
    messages: lim.messages ? (row.messages || 0) / lim.messages : 0,
    minutes: lim.minutes ? (row.minutes || 0) / lim.minutes : (row.minutes > 0 ? Infinity : 0),
  };
}

function pctOf(row, lim) {
  const r = ratiosOf(row, lim);
  return Math.round(Math.max(r.messages, r.minutes) * 1000) / 10;
}

async function overallPct(row, opts) {
  return pctOf(row, effectiveLimits(row, await baseLimits(row, opts)));
}

function blockedStateOf(row, channel, lim) {
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

/**
 * @param {object} row
 * @param {object} base  حصة الشهر (baseLimits)
 * @param {{ pending?: boolean }} [ctx]
 */
async function snapshotOf(row, base, ctx) {
  const lim = effectiveLimits(row, base);
  const r = ratiosOf(row, lim);
  const textBlock = blockedStateOf(row, 'widget', lim);
  const callBlock = blockedStateOf(row, 'call', lim);
  let pending = ctx && ctx.pending;
  if (pending == null) {
    try { pending = await (await backend()).hasPendingTopup(row.subscriberId, row.accountId); } catch (e) { pending = false; }
  }
  return {
    subscriberId: row.subscriberId,
    accountId: row.accountId || '',
    businessName: row.businessName || '',
    phone: row.phone || '',
    diamondTier: lim.tier || row.diamondTier,
    period: row.period,
    messages: row.messages || 0,
    minutes: Math.round((row.minutes || 0) * 10) / 10,
    // شحن مدفوع مطبَّق هذا الشهر (المسحوب + المتبقي) — توافق مع الواجهات السابقة
    topupMessages: (row.paidMessagesUsed || 0) + (row.paidMessages || 0),
    topupMinutes: round2((row.paidMinutesUsed || 0) + (row.paidMinutes || 0)),
    paidMessages: row.paidMessages || 0,
    paidMinutes: round2(row.paidMinutes || 0),
    paidMessagesUsed: row.paidMessagesUsed || 0,
    paidMinutesUsed: round2(row.paidMinutesUsed || 0),
    tokens: totalTokens(row),
    costUsd: Math.round((row.costUsd || 0) * 10000) / 10000,
    limits: { messages: lim.messages, minutes: lim.minutes, audioAccess: lim.audioAccess },
    monthlyLimits: { messages: base.messages, minutes: base.minutes },
    ratios: {
      messages: Math.round(r.messages * 1000) / 10,
      minutes: Math.round(r.minutes * 1000) / 10,
    },
    pct: pctOf(row, lim),
    quotaBlocked: textBlock.blocked || callBlock.blocked,
    textBlocked: textBlock.blocked,
    callBlocked: callBlock.blocked,
    blockReason: textBlock.blocked ? textBlock.reason : (callBlock.blocked ? callBlock.reason : null),
    alertLevel: row.alertLevel || 0,
    topups: await getTopupConfig(),
    pendingTopup: !!pending,
    events: (row.events || []).slice(0, 8),
    history: (row.history || []).slice(0, HISTORY_MAX),
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

async function alertMessage(level, snap) {
  const name = snap.businessName || 'منشأتك';
  const topups = await getTopupConfig();
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

/** تنبيه 80%/100% — رفع المستوى شرطي في التخزين فيُرسل التنبيه مرة واحدة فقط لكل عتبة */
async function maybeAlert(be, key, row, base) {
  const pct = pctOf(row, effectiveLimits(row, base));
  const level = row.alertLevel || 0;
  if (pct < 80) {
    if (level > 0) {
      await be.lowerAlert(key, 0);
      row.alertLevel = 0;
    }
    return row;
  }
  let fired = 0;
  if (pct >= 100 && level < 100) fired = 100;
  else if (pct >= 80 && level < 80) fired = 80;
  if (!fired) return row;
  const snap = await snapshotOf(Object.assign({}, row, { alertLevel: fired }), base, { pending: false });
  const text = await alertMessage(fired, snap);
  const updated = await be.raiseAlert(key, row.period, fired, { at: new Date().toISOString(), level: fired, pct: snap.pct, text });
  if (!updated) return (await be.getRow(key)) || row;
  const wa = await _sendWhatsApp(updated.phone || updated.subscriberId, text);
  if (!wa.ok) {
    console.warn('[quota-guard] تنبيه ' + fired + '% لـ ' + updated.subscriberId + ' (واتساب: ' + wa.error + ')');
  }
  return updated;
}

function quotaError(message, dimension, snap) {
  const err = new Error(message || 'quota_exhausted');
  err.status = 429;
  err.code = 'quota_exhausted';
  err.details = { dimension, snapshot: snap };
  return err;
}

async function _checkQuota(opts) {
  const subscriberId = String(opts.subscriberId || opts.accountId || '').trim();
  if (!subscriberId) return null;
  const be = await backend();
  const { key, row } = await resolveRow(be, subscriberId, opts);
  const base = await baseLimits(row, opts);
  const block = blockedStateOf(row, opts.channel || 'widget', effectiveLimits(row, base));
  if (block.blocked) {
    throw quotaError(block.reason, block.dimension, await snapshotOf(row, base));
  }
  return { be, key, row, base };
}

async function assertQuotaAvailable(opts) {
  opts = opts || {};
  const ctx = await _checkQuota(opts);
  return ctx ? snapshotOf(ctx.row, ctx.base) : null;
}

async function getQuotaBlockReason(subscriberId, accountId, channel) {
  const snap = await getSnapshot(subscriberId, accountId);
  const ch = String(channel || 'widget').toLowerCase();
  if (ch === 'call' && snap.callBlocked) return snap.blockReason;
  if (snap.textBlocked) return snap.blockReason;
  return 'الحصة غير متاحة';
}

async function recordUsage(opts) {
  opts = opts || {};
  const ctx = await _checkQuota(opts);
  if (!ctx) return null;
  const { be, key, base } = ctx;

  const usage = opts.usage || {};
  const isCall = String(opts.channel || '').toLowerCase() === 'call';
  const msgAdd = opts.messages != null ? Number(opts.messages) : 1;
  let minutes = Number(opts.minutes) || 0;
  if (!minutes && isCall) minutes = estimateCallMinutes(opts.replyText || '');
  const delta = {
    messages: Number.isFinite(msgAdd) && msgAdd > 0 && !isCall ? msgAdd : 0,
    minutes: minutes > 0 ? round2(minutes) : 0,
    tokensIn: usage.input_tokens || 0,
    tokensOut: usage.output_tokens || 0,
    tokensCacheRead: usage.cache_read_input_tokens || 0,
    tokensCacheWrite: usage.cache_creation_input_tokens || 0,
    costUsd: estimateUsd(opts.model, usage),
  };

  let row = null;
  for (let attempt = 0; attempt < 3 && !row; attempt++) {
    const period = currentPeriod();
    row = await be.incrementUsage(key, period, delta, base);
    if (!row) await be.rollPeriod(key, period);
  }
  if (!row) throw new Error('quota_increment_failed');

  row = await maybeAlert(be, key, row, base);
  const snap = await snapshotOf(row, base);
  snap.quotaBlocked = blockedStateOf(row, opts.channel, effectiveLimits(row, base)).blocked;
  return snap;
}

/** قراءة فقط — لا كتابة (لا يمكن أن تمحو زيادات متزامنة) */
async function getSnapshot(subscriberId, accountId, opts) {
  const be = await backend();
  const key = await findKey(be, subscriberId, accountId);
  const stored = key ? await be.getRow(key) : null;
  const row = stored
    ? periodView(stored)
    : emptyRow(subscriberId || accountId || 'unknown', { accountId: accountId || '' });
  return snapshotOf(row, await baseLimits(row, opts));
}

/** @deprecated — لا تخفيض Haiku؛ يُعاد false دائماً للتوافق الخلفي */
function shouldForceFast() {
  return false;
}

function selectDiamondModel() {
  const { getAdvancedModel } = require('./rizq-backend/config/anthropic');
  return getAdvancedModel();
}

async function isQuotaBlocked(subscriberId, accountId, channel, opts) {
  const be = await backend();
  const key = await findKey(be, subscriberId, accountId);
  const stored = key ? await be.getRow(key) : null;
  if (!stored) return false;
  const row = periodView(stored);
  return blockedStateOf(row, channel, effectiveLimits(row, await baseLimits(row, opts))).blocked;
}

async function requestTopup({ subscriberId, accountId, businessName, phone, type }) {
  const topups = await getTopupConfig();
  const kind = String(type || 'text').toLowerCase() === 'voice' ? 'voice' : 'text';
  const spec = topups[kind];
  const key = String(subscriberId || accountId || '').trim();
  if (!key) return { ok: false, error: 'missing_id' };
  const be = await backend();
  const { row } = await resolveRow(be, key, { accountId, businessName, phone });
  const req = {
    id: 'TOPUP-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
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
  const out = await be.createTopupIfNoPending(req);
  const snapshot = await snapshotOf(row, await baseLimits(row, null), { pending: true });
  if (!out.created) return { ok: true, already: true, request: out.request, snapshot };
  return { ok: true, request: out.request, topup: spec, snapshot };
}

/** الموافقة/الرفض مرة واحدة فقط — الموافقة تضيف رصيداً مدفوعاً دائماً (لا يُصفَّر شهرياً) */
async function resolveTopup(requestId, status) {
  const be = await backend();
  const finalStatus = status === 'approved' ? 'approved' : 'rejected';
  const req = await be.getTopup(requestId);
  if (!req) return { ok: false, error: 'not_found' };
  if (req.status !== 'pending') return { ok: false, error: 'already_resolved', request: req };

  let key = null;
  let base = { messages: 0, minutes: 0 };
  if (finalStatus === 'approved') {
    const resolved = await resolveRow(be, req.subscriberId || req.accountId, { accountId: req.accountId });
    key = resolved.key;
    base = await baseLimits(resolved.row, null);
  } else {
    key = await findKey(be, req.subscriberId, req.accountId);
  }

  const out = await be.resolveTopup(requestId, finalStatus, finalStatus === 'approved' ? key : null, base);
  if (!out.ok) return out;
  let row = out.row || (key ? await be.getRow(key) : null);
  if (!row) return { ok: true, request: out.request, snapshot: null };
  row = periodView(row);
  if (!out.row) base = await baseLimits(row, null);
  const pctNow = pctOf(row, effectiveLimits(row, base));
  const level = pctNow >= 100 ? 100 : pctNow >= 80 ? 80 : 0;
  if ((row.alertLevel || 0) > level) {
    await be.lowerAlert(key, level);
    row.alertLevel = level;
  }
  return { ok: true, request: out.request, snapshot: await snapshotOf(row, base) };
}

/** قراءة فقط — لوحة الأدمن لا تكتب في التخزين */
async function listAdminUsage(profiles) {
  const be = await backend();
  const stored = await be.listRows();
  const pendingTopups = await be.listPendingTopups();
  const byKey = {};
  stored.forEach((r) => { if (r && r.subscriberId) byKey[r.subscriberId] = r; });
  const pendingFor = (row) => pendingTopups.some((a) => a.subscriberId === row.subscriberId
    || (row.accountId && a.accountId === row.accountId));

  const seen = {};
  const rows = [];
  async function pushRow(row) {
    if (seen[row.subscriberId]) return;
    seen[row.subscriberId] = true;
    const view = periodView(row);
    rows.push(await snapshotOf(view, await baseLimits(view, null), { pending: pendingFor(view) }));
  }
  for (const p of (profiles || [])) {
    const id = p.subscriberId || p.id;
    if (!id) continue;
    const accountId = p.accountId || '';
    let row = byKey[id] || (accountId && stored.find((r) => r.accountId === accountId)) || byKey[accountId];
    if (!row) {
      row = emptyRow(id, {
        accountId,
        businessName: p.businessName || p.name || '',
        phone: p.phone || p.subscriberId || '',
        diamondTier: p.diamondTier,
      });
    }
    await pushRow(row);
  }
  for (const row of stored) await pushRow(row);
  rows.sort((a, b) => b.pct - a.pct);
  const totalCost = rows.reduce((s, r) => s + (r.costUsd || 0), 0);
  return {
    period: currentPeriod(),
    limits: await getQuotaConfig(),
    topups: await getTopupConfig(),
    count: rows.length,
    over80: rows.filter((r) => r.pct >= 80).length,
    blocked: rows.filter((r) => r.quotaBlocked).length,
    totalCostUsd: Math.round(totalCost * 10000) / 10000,
    pendingTopups,
    subscribers: rows,
  };
}

function setupQuotaGuardAPI(app, requireSharedSecret, deps) {
  deps = deps || {};
  const verifyAccountOwner = deps.verifyAccountOwner || (() => null);
  const getAccountRecord = deps.getAccountRecord || (() => null);
  const loadProfiles = deps.loadProfiles || (() => []);

  async function ownerOf(accountId, token) {
    const acc = await verifyAccountOwner(accountId, token);
    if (acc) return acc;
    const rec = await getAccountRecord(accountId);
    if (rec && rec.accessToken && token && token === rec.accessToken) {
      return { id: accountId, name: rec.businessName || rec.name || '', phone: rec.phone || '' };
    }
    return null;
  }

  app.get('/api/quota/admin', requireSharedSecret, async (req, res) => {
    try {
      const profiles = await loadProfiles();
      res.json({ ok: true, ...(await listAdminUsage(profiles)) });
    } catch (err) {
      console.error('[quota/admin]', err.message);
      res.status(500).json({ ok: false, error: 'تعذّر قراءة الاستهلاك' });
    }
  });

  app.post('/api/quota/admin/topups/:id/resolve', requireSharedSecret, async (req, res) => {
    const status = (req.body && req.body.status) || 'approved';
    const out = await resolveTopup(req.params.id, status);
    if (!out.ok) return res.status(404).json(out);
    res.json(out);
  });

  app.post('/api/quota/admin/addons/:id/resolve', requireSharedSecret, async (req, res) => {
    const out = await resolveTopup(req.params.id, (req.body && req.body.status) || 'approved');
    if (!out.ok) return res.status(404).json(out);
    res.json(out);
  });

  app.get('/api/quota/mine/:accountId', async (req, res) => {
    const accountId = req.params.accountId;
    // في الإنتاج: رأس فقط — منع تسريب الرمز عبر Referer/سجلات
    const token = req.header('x-account-token')
      || ((process.env.NODE_ENV !== 'production' && process.env.RIZQ_ENV !== 'production') ? (req.query.token || '') : '');
    const acc = await ownerOf(accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const snap = await getSnapshot(acc.phone || accountId, accountId);
    snap.businessName = snap.businessName || acc.name || '';
    res.json({ ok: true, usage: snap, topups: await getTopupConfig() });
  });

  app.post('/api/subscriber/quota/topup', async (req, res) => {
    const body = req.body || {};
    const accountId = String(body.accountId || '').trim();
    const isProd = process.env.NODE_ENV === 'production' || process.env.RIZQ_ENV === 'production';
    const token = req.header('x-account-token') || (!isProd ? (body.token || '') : '') || '';
    const acc = await ownerOf(accountId, token);
    if (!acc) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const type = String(body.type || 'text').toLowerCase() === 'voice' ? 'voice' : 'text';
    const out = await requestTopup({
      subscriberId: acc.phone || accountId,
      accountId,
      businessName: acc.name || '',
      phone: acc.phone || '',
      type,
    });
    res.json(out);
  });

  app.post('/api/quota/mine/:accountId/addon', async (req, res) => {
    const accountId = req.params.accountId;
    const token = req.header('x-account-token')
      || ((process.env.NODE_ENV !== 'production' && process.env.RIZQ_ENV !== 'production') ? (req.query.token || '') : '');
    const acc = await ownerOf(accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const type = (req.body && req.body.type) || 'text';
    const out = await requestTopup({
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
