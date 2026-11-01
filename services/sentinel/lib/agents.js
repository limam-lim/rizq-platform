/**
 * إشراف الوكلاء المجدولين + اقتراحات جودة الويدجت.
 */
'use strict';

const db = require('./db');
const store = require('./store');
const { wakeAgent } = require('./wake');
const { cfg } = require('./config');
const alerts = require('./alerts');

const SCHEDULED_AGENTS = [
  { id: 'lifecycle', intervalMs: 60 * 60 * 1000, docCollection: 'lifecycle_audit', wakeName: 'lifecycle' },
  { id: 'quota_guard', intervalMs: 60 * 60 * 1000, docCollection: null, wakeName: 'quota_guard' },
  { id: 'marketing', intervalMs: 30 * 60 * 1000, docCollection: 'marketing_runs', wakeName: 'marketing' },
  { id: 'moderator', intervalMs: 60 * 60 * 1000, docCollection: null, wakeName: 'moderator' },
  { id: 'ops_housekeeping', intervalMs: 24 * 60 * 60 * 1000, docCollection: 'ops_audit', wakeName: 'ops_housekeeping' },
];

/** إيقاظ تلقائي مرة واحدة لكل تأخير — يُصفَّر عند نجاح لاحق */
const wokeOnce = new Map();

async function readDocLatest(collection) {
  try {
    return await db.queryOne(
      `SELECT id, data, updated_at AS "updatedAt"
       FROM documents WHERE collection = $1
       ORDER BY updated_at DESC LIMIT 1`,
      [collection]
    );
  } catch (_) {
    return null;
  }
}

async function listPendingSocialDrafts() {
  try {
    const r = await db.query(
      `SELECT id, data FROM documents
       WHERE collection IN ('marketing_drafts','social_drafts')
         AND COALESCE(data->>'status','pending') IN ('pending','pending_approval','draft')
       ORDER BY updated_at DESC LIMIT 30`
    );
    return r.rows || [];
  } catch (_) {
    return [];
  }
}

async function listWeakMisses(limit) {
  try {
    const r = await db.query(
      `SELECT id, data FROM documents WHERE collection = 'agent_misses'
       ORDER BY updated_at DESC LIMIT $1`,
      [Math.max(1, Math.min(50, Number(limit) || 20))]
    );
    return (r.rows || []).map((row) => Object.assign({ id: row.id }, row.data || {}));
  } catch (_) {
    return [];
  }
}

async function superviseAgents(telegram) {
  const results = [];
  for (const ag of SCHEDULED_AGENTS) {
    let lastAt = null;
    let lastOk = null;
    if (ag.docCollection) {
      const doc = await readDocLatest(ag.docCollection);
      if (doc) {
        lastAt = Date.parse(doc.updatedAt || (doc.data && (doc.data.at || doc.data.finishedAt))) || null;
        lastOk = doc.data ? (doc.data.ok !== false) : null;
      }
    }
    // fallback: آخر حدث حارس مرتبط
    if (!lastAt) {
      const ev = await store.latestEventByKind('agent_run_' + ag.id);
      if (ev) lastAt = Date.parse(ev.createdAt) || null;
    }

    const overdue = lastAt != null && (Date.now() - lastAt) > ag.intervalMs * 2;
    const item = {
      id: ag.id,
      lastAt: lastAt ? new Date(lastAt).toISOString() : null,
      lastOk,
      overdue,
      woke: false,
    };

    if (overdue) {
      if (!wokeOnce.get(ag.id)) {
        const w = await wakeAgent(ag.wakeName, { reason: 'overdue_2x' });
        item.woke = !!w.ok;
        wokeOnce.set(ag.id, true);
        if (!w.ok && telegram) {
          await alerts.notifyCritical(
            telegram,
            'agent_wake_' + ag.id,
            'فشل إيقاظ الوكيل المتأخر: ' + ag.id
          );
        }
      }
    } else if (lastAt) {
      wokeOnce.delete(ag.id);
      await alerts.notifyRecovered(telegram, 'agent_wake_' + ag.id, 'عاد الوكيل ' + ag.id + ' للجدول');
    }
    results.push(item);
  }

  const pendingSocial = await listPendingSocialDrafts();
  const misses = await listWeakMisses(15);
  const unanswered = misses.filter((m) => m.type === 'unanswered' || m.type === 'no_answer' || !m.reply);

  await store.insertEvent({
    kind: 'agents_supervision',
    severity: results.some((r) => r.overdue) ? 'warn' : 'info',
    summary: 'إشراف وكلاء — متأخر: ' + results.filter((r) => r.overdue).map((r) => r.id).join(',')
      || 'لا تأخير',
    payload: {
      agents: results,
      pendingSocialCount: pendingSocial.length,
      weakMisses: misses.length,
      unanswered: unanswered.length,
    },
  });

  return {
    agents: results,
    pendingSocial: pendingSocial.slice(0, 10).map((d) => ({
      id: d.id,
      title: d.data && (d.data.title || d.data.campaignType),
      status: d.data && d.data.status,
    })),
    quality: {
      weakCount: misses.length,
      unansweredCount: unanswered.length,
      worst: misses.slice(0, 5).map((m) => ({
        id: m.id,
        text: String(m.text || '').slice(0, 120),
        reason: m.reason || m.type,
        agent: m.agent,
      })),
    },
  };
}

/**
 * اقتراحات تحسين من جودة الويدجت — تُحفظ بانتظار موافقة المالك (لا تطبيق تلقائي).
 */
async function proposeQualitySuggestions(claude) {
  const misses = await listWeakMisses(30);
  if (!misses.length) return [];
  const c = cfg();
  if (!c.anthropicKey || !claude) {
    // اقتراح رقمي بسيط بلا Claude
    const id = await store.insertSuggestion({
      category: 'knowledge',
      title: 'مراجعة أسئلة بلا جواب',
      body: 'وُجدت ' + misses.length + ' فجوات جودة. راجع أسوأ الردود في مركز الوكلاء وأضف معرفة.',
      impactRank: 2,
      source: 'heuristic',
      meta: { missIds: misses.slice(0, 10).map((m) => m.id) },
    });
    return [id];
  }
  return [];
}

module.exports = {
  superviseAgents,
  proposeQualitySuggestions,
  SCHEDULED_AGENTS,
  listWeakMisses,
  listPendingSocialDrafts,
};
