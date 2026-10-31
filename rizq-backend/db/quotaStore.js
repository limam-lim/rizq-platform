/**
 * quotaStore — حصص الباقة الماسية في PostgreSQL (documents/quota_usage).
 *
 * صف لكل مشترك (id = "sub:<key>") وطلب شحن لكل مستند (id = "topup:<id>").
 * كل تعديل عبارة UPDATE واحدة على الصف نفسه (data || jsonb_build_object(...))
 * فيقفل Postgres الصف ويعيد حساب القيم على أحدث نسخة — لا قراءة/تعديل/حفظ في JS،
 * فلا تضيع زيادات الطلبات المتزامنة.
 *
 * نموذج الرصيد:
 *   messages / minutes                 — استهلاك الشهر الحالي (يُصفَّر شهرياً)
 *   paidMessages / paidMinutes         — رصيد الشحن المدفوع المتبقي (لا يُصفَّر أبداً)
 *   paidMessagesUsed / paidMinutesUsed — ما سُحب من الرصيد المدفوع هذا الشهر (يُصفَّر شهرياً)
 *   الحد الفعلي = حصة الشهر + paid*Used + paid*  (محظور عندما messages >= الحد)
 */
'use strict';

const sql = require('./sql');

const COLLECTION = 'quota_usage';
const SUB = 'sub:';
const TOPUP = 'topup:';
const HISTORY_MAX = 12;
const EVENTS_MAX = 20;

function parse(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function nowIso() {
  return new Date().toISOString();
}

/** قيمة رقمية من حقل JSONB في الصف الهدف (تُقيَّم على أحدث نسخة مقفلة) */
function num(field) {
  return `COALESCE((data->>'${field}')::numeric, 0)`;
}

/** جزء الاستهلاك الذي يتجاوز حصة الشهر ويُسحب من الرصيد المدفوع */
function drawExpr(used, paidUsed, paid, add, limit) {
  const fromMonthly = `LEAST(${add}, GREATEST(0, ${limit} + ${num(paidUsed)} - ${num(used)}))`;
  return `LEAST(${add} - ${fromMonthly}, GREATEST(${num(paid)}, 0))`;
}

async function getRow(key) {
  const r = await sql.queryOne(
    'SELECT data FROM documents WHERE collection = ? AND id = ?',
    [COLLECTION, SUB + key]
  );
  return r ? parse(r.data) : null;
}

async function findKeyByAccount(accountId) {
  if (!accountId) return null;
  const r = await sql.queryOne(
    `SELECT data->>'subscriberId' AS k FROM documents
      WHERE collection = ? AND id LIKE 'sub:%' AND data->>'accountId' = ?
      ORDER BY id LIMIT 1`,
    [COLLECTION, String(accountId)]
  );
  return r && r.k ? r.k : null;
}

/** إنشاء الصف إن لم يوجد (بدون مسّ صف قائم) + دمج البيانات الوصفية غير الفارغة */
async function ensureRow(key, initRow, metaPatch) {
  await sql.execute(
    `INSERT INTO documents (collection, id, data, updated_at)
     VALUES (?, ?, ?::jsonb, ?)
     ON CONFLICT (collection, id) DO NOTHING`,
    [COLLECTION, SUB + key, JSON.stringify(initRow), nowIso()]
  );
  if (metaPatch && Object.keys(metaPatch).length) {
    const patch = JSON.stringify(metaPatch);
    const r = await sql.queryOne(
      `UPDATE documents SET data = data || $3::jsonb, updated_at = $4, updated_at_ts = NOW()
        WHERE collection = $1 AND id = $2 AND NOT (data @> $3::jsonb)
        RETURNING data`,
      [COLLECTION, SUB + key, patch, nowIso()]
    );
    if (r) return parse(r.data);
  }
  return getRow(key);
}

/**
 * إغلاق الشهر: يصفّر عدادات الشهر ويحفظها في history — ولا يمسّ paidMessages/paidMinutes.
 * لا يحدث إلا إن كان الشهر المخزَّن أقدم (آمن عند تكراره من طلبات متزامنة).
 */
async function rollPeriod(key, period) {
  const r = await sql.queryOne(
    `UPDATE documents SET data = data || jsonb_build_object(
        'period', $3::text,
        'messages', 0, 'minutes', 0,
        'paidMessagesUsed', 0, 'paidMinutesUsed', 0,
        'tokensIn', 0, 'tokensOut', 0, 'tokensCacheRead', 0, 'tokensCacheWrite', 0,
        'costUsd', 0, 'alertLevel', 0,
        'history', jsonb_path_query_array(
          jsonb_build_array(jsonb_build_object(
            'period', data->'period',
            'messages', ${num('messages')},
            'minutes', ${num('minutes')},
            'tokens', ${num('tokensIn')} + ${num('tokensOut')},
            'costUsd', ${num('costUsd')},
            'paidMessagesUsed', ${num('paidMessagesUsed')},
            'paidMinutesUsed', ${num('paidMinutesUsed')},
            'paidMessagesLeft', ${num('paidMessages')},
            'paidMinutesLeft', ${num('paidMinutes')}
          )) || CASE WHEN jsonb_typeof(data->'history') = 'array' THEN data->'history' ELSE '[]'::jsonb END,
          '$[0 to ${HISTORY_MAX - 1}]'
        )
      ), updated_at = $4, updated_at_ts = NOW()
      WHERE collection = $1 AND id = $2 AND COALESCE(data->>'period', '') COLLATE "C" < $3::text COLLATE "C"
      RETURNING data`,
    [COLLECTION, SUB + key, period, nowIso()]
  );
  return r ? parse(r.data) : null;
}

/**
 * زيادة ذرّية للاستهلاك. يرجع null إذا كان الشهر المخزَّن أقدم من period
 * (على المستدعي استدعاء rollPeriod ثم الإعادة).
 * @param {{messages:number,minutes:number,tokensIn:number,tokensOut:number,tokensCacheRead:number,tokensCacheWrite:number,costUsd:number}} d
 * @param {{messages:number,minutes:number}} base  حصة الشهر (بدون الشحن)
 */
async function incrementUsage(key, period, d, base) {
  const msgDraw = drawExpr('messages', 'paidMessagesUsed', 'paidMessages', '$4::numeric', '$6::numeric');
  const minDraw = drawExpr('minutes', 'paidMinutesUsed', 'paidMinutes', '$5::numeric', '$7::numeric');
  const r = await sql.queryOne(
    `UPDATE documents SET data = data || jsonb_build_object(
        'messages', ${num('messages')} + $4::numeric,
        'minutes', ROUND(${num('minutes')} + $5::numeric, 2),
        'paidMessages', ${num('paidMessages')} - ${msgDraw},
        'paidMessagesUsed', ${num('paidMessagesUsed')} + ${msgDraw},
        'paidMinutes', ROUND(${num('paidMinutes')} - ${minDraw}, 2),
        'paidMinutesUsed', ROUND(${num('paidMinutesUsed')} + ${minDraw}, 2),
        'tokensIn', ${num('tokensIn')} + $8::numeric,
        'tokensOut', ${num('tokensOut')} + $9::numeric,
        'tokensCacheRead', ${num('tokensCacheRead')} + $10::numeric,
        'tokensCacheWrite', ${num('tokensCacheWrite')} + $11::numeric,
        'costUsd', ROUND(${num('costUsd')} + $12::numeric, 5)
      ), updated_at = $13, updated_at_ts = NOW()
      WHERE collection = $1 AND id = $2 AND COALESCE(data->>'period', '') COLLATE "C" >= $3::text COLLATE "C"
      RETURNING data`,
    [
      COLLECTION, SUB + key, period,
      d.messages || 0, d.minutes || 0,
      Number(base.messages) || 0, Number(base.minutes) || 0,
      d.tokensIn || 0, d.tokensOut || 0, d.tokensCacheRead || 0, d.tokensCacheWrite || 0,
      d.costUsd || 0,
      nowIso(),
    ]
  );
  return r ? parse(r.data) : null;
}

/** رفع مستوى التنبيه — ينجح لطلب واحد فقط لكل عتبة (يمنع رسائل واتساب مكررة) */
async function raiseAlert(key, period, level, event) {
  const r = await sql.queryOne(
    `UPDATE documents SET data = data || jsonb_build_object(
        'alertLevel', $4::numeric,
        'events', jsonb_path_query_array(
          jsonb_build_array($5::jsonb)
            || CASE WHEN jsonb_typeof(data->'events') = 'array' THEN data->'events' ELSE '[]'::jsonb END,
          '$[0 to ${EVENTS_MAX - 1}]'
        )
      ), updated_at = $6, updated_at_ts = NOW()
      WHERE collection = $1 AND id = $2 AND data->>'period' = $3::text
        AND ${num('alertLevel')} < $4::numeric
      RETURNING data`,
    [COLLECTION, SUB + key, period, level, JSON.stringify(event), nowIso()]
  );
  return r ? parse(r.data) : null;
}

async function lowerAlert(key, level) {
  await sql.execute(
    `UPDATE documents SET data = data || jsonb_build_object('alertLevel', $3::numeric),
        updated_at = $4, updated_at_ts = NOW()
      WHERE collection = $1 AND id = $2 AND ${num('alertLevel')} > $3::numeric`,
    [COLLECTION, SUB + key, level, nowIso()]
  );
}

async function listRows() {
  const rows = await sql.query(
    "SELECT data FROM documents WHERE collection = ? AND id LIKE 'sub:%'",
    [COLLECTION]
  );
  return rows.map((r) => parse(r.data)).filter(Boolean);
}

async function listPendingTopups() {
  const rows = await sql.query(
    `SELECT data FROM documents
      WHERE collection = ? AND id LIKE 'topup:%' AND data->>'status' = 'pending'
      ORDER BY data->>'createdAt' DESC`,
    [COLLECTION]
  );
  return rows.map((r) => parse(r.data)).filter(Boolean);
}

async function hasPendingTopup(subscriberId, accountId) {
  const r = await sql.queryOne(
    `SELECT 1 AS x FROM documents
      WHERE collection = $1 AND id LIKE 'topup:%' AND data->>'status' = 'pending'
        AND (data->>'subscriberId' = $2 OR ($3 <> '' AND data->>'accountId' = $3))
      LIMIT 1`,
    [COLLECTION, String(subscriberId || ''), String(accountId || '')]
  );
  return !!r;
}

/** طلب شحن جديد ما لم يوجد طلب معلّق من النوع نفسه (قفل استشاري يمنع التكرار المتزامن) */
async function createTopupIfNoPending(req) {
  return sql.withTransaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['quota-topup:' + req.subscriberId + ':' + req.type]);
    const hit = await tx.queryOne(
      `SELECT data FROM documents
        WHERE collection = $1 AND id LIKE 'topup:%' AND data->>'status' = 'pending' AND data->>'type' = $2
          AND (data->>'subscriberId' = $3 OR ($4 <> '' AND data->>'accountId' = $4))
        ORDER BY data->>'createdAt' DESC LIMIT 1`,
      [COLLECTION, req.type, String(req.subscriberId || ''), String(req.accountId || '')]
    );
    if (hit) return { created: false, request: parse(hit.data) };
    await tx.execute(
      `INSERT INTO documents (collection, id, data, updated_at) VALUES ($1, $2, $3::jsonb, $4)`,
      [COLLECTION, TOPUP + req.id, JSON.stringify(req), nowIso()]
    );
    return { created: true, request: req };
  });
}

async function getTopup(id) {
  const r = await sql.queryOne(
    'SELECT data FROM documents WHERE collection = ? AND id = ?',
    [COLLECTION, TOPUP + id]
  );
  return r ? parse(r.data) : null;
}

/**
 * حسم طلب شحن مرة واحدة فقط (pending → approved/rejected) وإضافة الرصيد المدفوع
 * في نفس المعاملة. الرصيد يسدّد أولاً أي تجاوز سابق لحصة الشهر.
 * @returns {Promise<{ok:boolean,error?:string,request?:object,row?:object}>}
 */
async function resolveTopup(id, status, key, base) {
  return sql.withTransaction(async (tx) => {
    const resolvedAt = nowIso();
    const upd = await tx.queryOne(
      `UPDATE documents SET data = data || jsonb_build_object('status', $3::text, 'resolvedAt', $4::text),
          updated_at = $4, updated_at_ts = NOW()
        WHERE collection = $1 AND id = $2 AND data->>'status' = 'pending'
        RETURNING data`,
      [COLLECTION, TOPUP + id, status, resolvedAt]
    );
    if (!upd) {
      const cur = await tx.queryOne('SELECT data FROM documents WHERE collection = $1 AND id = $2', [COLLECTION, TOPUP + id]);
      return cur ? { ok: false, error: 'already_resolved', request: parse(cur.data) } : { ok: false, error: 'not_found' };
    }
    const request = parse(upd.data);
    if (status !== 'approved' || !key) return { ok: true, request, row: null };
    const voice = request.type === 'voice';
    const used = voice ? 'minutes' : 'messages';
    const paid = voice ? 'paidMinutes' : 'paidMessages';
    const paidUsed = voice ? 'paidMinutesUsed' : 'paidMessagesUsed';
    const total = voice ? 'paidMinutesTotal' : 'paidMessagesTotal';
    const debt = `GREATEST(0, ${num(used)} - $4::numeric - ${num(paidUsed)})`;
    const settle = `LEAST(${debt}, ${num(paid)} + $3::numeric)`;
    const row = await tx.queryOne(
      `UPDATE documents SET data = data || jsonb_build_object(
          '${paid}', ROUND(${num(paid)} + $3::numeric - ${settle}, 2),
          '${paidUsed}', ROUND(${num(paidUsed)} + ${settle}, 2),
          '${total}', ROUND(${num(total)} + $3::numeric, 2)
        ), updated_at = $5, updated_at_ts = NOW()
        WHERE collection = $1 AND id = $2
        RETURNING data`,
      [COLLECTION, SUB + key, Number(request.amount) || 0, Number(voice ? base.minutes : base.messages) || 0, resolvedAt]
    );
    if (!row) throw new Error('quota row missing for top-up ' + id);
    return { ok: true, request, row: parse(row.data) };
  });
}

function hasLegacyData(root) {
  if (!root || typeof root !== 'object') return false;
  const subs = root.subscribers && typeof root.subscribers === 'object' ? Object.keys(root.subscribers).length : 0;
  const tops = Array.isArray(root.topupRequests) ? root.topupRequests.length : 0;
  return subs > 0 || tops > 0;
}

/**
 * ترحيل من المستند القديم quota_usage/_root ({subscribers, topupRequests}) — أو من نسخة
 * احتياطية مستعادة بنفس الشكل — إلى صفوف منفصلة، ثم يُفرَّغ _root.
 * idempotent: الإدراج ON CONFLICT DO NOTHING لا يمسّ صفاً قائماً.
 * @param {(row:object) => Promise<object>} convertRow
 */
async function migrateLegacyRoot(convertRow) {
  const r = await sql.queryOne(
    "SELECT data FROM documents WHERE collection = ? AND id = '_root'",
    [COLLECTION]
  );
  const root = r ? parse(r.data) : null;
  if (!hasLegacyData(root)) return 0;
  const subs = root.subscribers && typeof root.subscribers === 'object' ? root.subscribers : {};
  const converted = [];
  for (const k of Object.keys(subs)) {
    if (!subs[k] || typeof subs[k] !== 'object') continue;
    converted.push(await convertRow(Object.assign({}, subs[k], { subscriberId: subs[k].subscriberId || k })));
  }
  const topups = (Array.isArray(root.topupRequests) ? root.topupRequests : []).filter((t) => t && t.id);
  await sql.withTransaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['quota-migrate-root']);
    const again = await tx.queryOne("SELECT data FROM documents WHERE collection = $1 AND id = '_root'", [COLLECTION]);
    const cur = again ? parse(again.data) : null;
    if (!hasLegacyData(cur)) return;
    const now = nowIso();
    for (const row of converted) {
      await tx.execute(
        `INSERT INTO documents (collection, id, data, updated_at) VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (collection, id) DO NOTHING`,
        [COLLECTION, SUB + row.subscriberId, JSON.stringify(row), now]
      );
    }
    for (const t of topups) {
      await tx.execute(
        `INSERT INTO documents (collection, id, data, updated_at) VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (collection, id) DO NOTHING`,
        [COLLECTION, TOPUP + t.id, JSON.stringify(t), now]
      );
    }
    await tx.execute(
      `UPDATE documents SET data = $2::jsonb, updated_at = $3, updated_at_ts = NOW()
        WHERE collection = $1 AND id = '_root'`,
      [COLLECTION, JSON.stringify({ schema: 2, migratedAt: now, migratedRows: converted.length }), now]
    );
  });
  console.log('[quota-store] migrated ' + converted.length + ' quota row(s) from _root → per-subscriber rows');
  return converted.length;
}

module.exports = {
  COLLECTION,
  getRow,
  findKeyByAccount,
  ensureRow,
  rollPeriod,
  incrementUsage,
  raiseAlert,
  lowerAlert,
  listRows,
  listPendingTopups,
  hasPendingTopup,
  createTopupIfNoPending,
  getTopup,
  resolveTopup,
  migrateLegacyRoot,
};
