#!/usr/bin/env node
/**
 * STEP 0: quota usage must persist in PostgreSQL (not ephemeral JSON).
 *   node scripts/test-quota-postgres.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const assert = require('assert');
const db = require('../db');
const repos = require('../db/repos');
const quota = require('../../rizq_quota_guard_agent');

async function main() {
  // Force Postgres path (not memory isolation mode).
  delete process.env.RIZQ_QUOTA_MEMORY_ONLY;
  if (process.env.RIZQ_QUOTA_STORE === 'memory') delete process.env.RIZQ_QUOTA_STORE;

  await db.ready();

  const sid = 'quota_step0_' + Date.now();
  const beforeDoc = await repos.quotaUsage.get('_root');
  const beforeMsgs = (beforeDoc && beforeDoc.subscribers && beforeDoc.subscribers[sid]
    && beforeDoc.subscribers[sid].messages) || 0;

  const snap = await quota.recordUsage({
    subscriberId: sid,
    accountId: sid,
    channel: 'widget',
    messages: 1,
    usage: { input_tokens: 11, output_tokens: 7 },
  });
  assert(snap, 'recordUsage must return a snapshot');
  assert(snap.messages >= 1, 'snapshot messages should increment');

  const afterDoc = await repos.quotaUsage.get('_root');
  assert(afterDoc && typeof afterDoc === 'object', 'quota_usage/_root must exist in Postgres');
  assert(afterDoc.subscribers && afterDoc.subscribers[sid], 'subscriber row must be in PG doc');
  assert.strictEqual(
    afterDoc.subscribers[sid].messages,
    beforeMsgs + 1,
    'messages must persist in Postgres after recordUsage'
  );

  console.log('[test-quota-postgres] ALL PASSED', {
    subscriberId: sid,
    messages: afterDoc.subscribers[sid].messages,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
