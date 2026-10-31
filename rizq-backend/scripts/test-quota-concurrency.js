#!/usr/bin/env node
/**
 * test-quota-concurrency.js — حصص الباقة الماسية تحت التزامن + رصيد الشحن المدفوع.
 *  - 20 استدعاء recordUsage متزامن = زيادة +20 بالضبط (صف جديد وصف قائم).
 *  - قراءات متزامنة (getSnapshot/listAdminUsage/isQuotaBlocked) لا تمحو زيادات.
 *  - دقائق المكالمات والتوكنز تُجمع بدقة تحت التزامن.
 *  - تنبيه 80% يُطلق مرة واحدة فقط حتى مع طلبات متزامنة.
 *  - الشحن المدفوع رصيد منفصل: لا يُصفَّر عند بداية شهر جديد، ويُستهلك بعد حصة الشهر.
 *  - الموافقة المزدوجة المتزامنة على طلب شحن واحد تُضيف الرصيد مرة واحدة.
 * يُشغَّل على PostgreSQL (DATABASE_URL) وعلى مخزن الذاكرة (RIZQ_QUOTA_STORE=memory).
 *   npm run test:quota-concurrency
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

const N = 20;
const quota = require('../../rizq_quota_guard_agent');

function useMemory(on) {
  if (on) process.env.RIZQ_QUOTA_STORE = 'memory';
  else if (process.env.RIZQ_QUOTA_STORE === 'memory') delete process.env.RIZQ_QUOTA_STORE;
  delete process.env.RIZQ_QUOTA_MEMORY_ONLY;
}

/** يرجع الصف المخزَّن إلى شهر سابق — يحاكي مرور الشهر دون العبث بساعة النظام */
async function ageRowToPastPeriod(label, sid, period) {
  if (label === 'memory') {
    global.__rizqQuotaMemory.subscribers[sid].period = period;
    return;
  }
  const sql = require('../db/sql');
  await sql.execute(
    "UPDATE documents SET data = jsonb_set(data, '{period}', to_jsonb(?::text)) WHERE collection = 'quota_usage' AND id = ?",
    [period, 'sub:' + sid]
  );
}

async function suite(label) {
  useMemory(label === 'memory');
  console.log('\n══ backend: ' + label + ' ══');
  const stamp = Date.now() + '_' + Math.floor(Math.random() * 1e6);
  const LIMITS = { messages: 1000, minutes: 100, audioAccess: true, tier: 'diamond_pro' };

  console.log('— concurrent recordUsage on a fresh subscriber —');
  const sid = 'QCONC_' + label + '_' + stamp;
  const meta = { subscriberId: sid, accountId: 'ACC_' + sid, channel: 'widget', quotaLimits: LIMITS };
  const usage = { input_tokens: 10, output_tokens: 5 };
  const r1 = await Promise.allSettled(Array.from({ length: N }, () => quota.recordUsage(Object.assign({}, meta, { messages: 1, usage }))));
  const rejected1 = r1.filter((r) => r.status === 'rejected');
  ok(N + ' simultaneous calls all succeed', rejected1.length === 0, rejected1.map((r) => r.reason && r.reason.message));
  let snap = await quota.getSnapshot(sid, meta.accountId, { quotaLimits: LIMITS });
  ok(N + ' simultaneous recordUsage = exact +' + N + ' messages', snap.messages === N, snap.messages);
  ok('tokens summed exactly', snap.tokens === N * 15, snap.tokens);

  console.log('— concurrent writes interleaved with reads on an existing row —');
  const mixed = [];
  for (let i = 0; i < N; i++) {
    mixed.push(quota.recordUsage(Object.assign({}, meta, { messages: 1, usage })));
    mixed.push(quota.getSnapshot(sid, meta.accountId));
    if (i % 5 === 0) mixed.push(quota.listAdminUsage([{ subscriberId: sid, accountId: meta.accountId }]));
    if (i % 4 === 0) mixed.push(quota.isQuotaBlocked(sid, meta.accountId, 'widget', { quotaLimits: LIMITS }));
  }
  const r2 = await Promise.allSettled(mixed);
  ok('mixed reads/writes all succeed', r2.every((r) => r.status === 'fulfilled'),
    r2.filter((r) => r.status === 'rejected').map((r) => r.reason && r.reason.message));
  snap = await quota.getSnapshot(sid, meta.accountId, { quotaLimits: LIMITS });
  ok('reads never clobber writes (exact ' + (2 * N) + ')', snap.messages === 2 * N, snap.messages);

  console.log('— concurrent call minutes —');
  const callMeta = Object.assign({}, meta, { channel: 'call' });
  await Promise.all(Array.from({ length: N }, () => quota.recordUsage(Object.assign({}, callMeta, { minutes: 0.25 }))));
  snap = await quota.getSnapshot(sid, meta.accountId, { quotaLimits: LIMITS });
  ok(N + ' x 0.25 min = exact +5 minutes', snap.minutes === 5, snap.minutes);
  ok('call channel does not count messages', snap.messages === 2 * N, snap.messages);

  console.log('— 80% alert fires exactly once under concurrency —');
  const sidA = 'QALERT_' + label + '_' + stamp;
  const alertLimits = { messages: 25, minutes: 0, audioAccess: false, tier: 'diamond_standard' };
  const metaA = { subscriberId: sidA, accountId: 'ACC_' + sidA, channel: 'widget', quotaLimits: alertLimits };
  await Promise.all(Array.from({ length: N }, () => quota.recordUsage(Object.assign({}, metaA, { messages: 1 }))));
  const snapA = await quota.getSnapshot(sidA, metaA.accountId, { quotaLimits: alertLimits });
  const alerts80 = (snapA.events || []).filter((e) => e.level === 80);
  ok('usage at 80%', snapA.messages === N && snapA.pct === 80, { messages: snapA.messages, pct: snapA.pct });
  ok('one 80% alert (no duplicates)', alerts80.length === 1 && snapA.alertLevel === 80, { n: alerts80.length, level: snapA.alertLevel });

  console.log('— paid top-up balance is separate from the monthly quota —');
  const sidP = 'QPAID_' + label + '_' + stamp;
  const small = { messages: 10, minutes: 0, audioAccess: false, tier: 'diamond_standard' };
  const metaP = { subscriberId: sidP, accountId: 'ACC_' + sidP, channel: 'widget', quotaLimits: small };
  await quota.recordUsage(Object.assign({}, metaP, { messages: 10 }));
  let blocked = await quota.isQuotaBlocked(sidP, metaP.accountId, 'widget', { quotaLimits: small });
  ok('monthly quota exhausted → blocked', blocked === true, blocked);

  const req1 = await quota.requestTopup({ subscriberId: sidP, accountId: metaP.accountId, type: 'text' });
  const amount = req1.request && Number(req1.request.amount);
  ok('top-up request pending', req1.ok && req1.request.status === 'pending' && amount > 0, req1);
  const dupReqs = await Promise.all([1, 2, 3].map(() => quota.requestTopup({ subscriberId: sidP, accountId: metaP.accountId, type: 'text' })));
  ok('repeat requests reuse the pending one', dupReqs.every((d) => d.already && d.request.id === req1.request.id), dupReqs.map((d) => d.request && d.request.id));

  const approvals = await Promise.all([1, 2].map(() => quota.resolveTopup(req1.request.id, 'approved')));
  ok('double approval: exactly one succeeds', approvals.filter((a) => a.ok).length === 1, approvals.map((a) => a.error || 'ok'));
  snap = await quota.getSnapshot(sidP, metaP.accountId, { quotaLimits: small });
  ok('paid balance credited once', snap.paidMessages === amount, snap.paidMessages);
  ok('effective limit = monthly + paid', snap.limits.messages === 10 + amount, snap.limits);
  blocked = await quota.isQuotaBlocked(sidP, metaP.accountId, 'widget', { quotaLimits: small });
  ok('top-up unblocks', blocked === false, blocked);

  await Promise.all(Array.from({ length: 3 }, () => quota.recordUsage(Object.assign({}, metaP, { messages: 1 }))));
  snap = await quota.getSnapshot(sidP, metaP.accountId, { quotaLimits: small });
  ok('usage beyond monthly quota draws from paid balance', snap.paidMessages === amount - 3 && snap.paidMessagesUsed === 3,
    { paid: snap.paidMessages, used: snap.paidMessagesUsed });
  ok('topupMessages (compat) = paid credits this period', snap.topupMessages === amount, snap.topupMessages);

  console.log('— monthly reset keeps the paid balance —');
  await ageRowToPastPeriod(label, sidP, '2000-01');
  snap = await quota.getSnapshot(sidP, metaP.accountId, { quotaLimits: small });
  ok('new period: monthly usage reset to 0', snap.messages === 0 && snap.period === quota.currentPeriod(), { m: snap.messages, p: snap.period });
  ok('new period: paid balance preserved', snap.paidMessages === amount - 3, snap.paidMessages);
  ok('new period: limit = monthly + remaining paid', snap.limits.messages === 10 + (amount - 3), snap.limits);

  await quota.recordUsage(Object.assign({}, metaP, { messages: 1 }));
  snap = await quota.getSnapshot(sidP, metaP.accountId, { quotaLimits: small });
  ok('write path rolls the period and uses monthly quota first', snap.messages === 1 && snap.paidMessages === amount - 3,
    { m: snap.messages, paid: snap.paidMessages });
  ok('history keeps the closed period', Array.isArray(snap.history) && snap.history[0] && snap.history[0].period === '2000-01'
    && snap.history[0].messages === 13, snap.history && snap.history[0]);

  await Promise.all(Array.from({ length: 9 }, () => quota.recordUsage(Object.assign({}, metaP, { messages: 1 }))));
  await Promise.all(Array.from({ length: 2 }, () => quota.recordUsage(Object.assign({}, metaP, { messages: 1 }))));
  snap = await quota.getSnapshot(sidP, metaP.accountId, { quotaLimits: small });
  ok('after new monthly quota is used up, paid balance is consumed again', snap.messages === 12 && snap.paidMessages === amount - 5,
    { m: snap.messages, paid: snap.paidMessages });
}

(async () => {
  const backends = ['memory'];
  if (process.env.DATABASE_URL) backends.push('postgres');
  else console.log('(DATABASE_URL not set — skipping postgres backend)');
  if (backends.includes('postgres')) {
    useMemory(false);
    await require('../db').ready();
  }
  for (const b of backends) await suite(b);
  console.log(`\nquota concurrency: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
