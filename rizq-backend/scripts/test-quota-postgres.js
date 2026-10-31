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
  const beforeRow = await repos.quotaUsage.get('sub:' + sid);
  const beforeMsgs = (beforeRow && beforeRow.messages) || 0;

  const snap = await quota.recordUsage({
    subscriberId: sid,
    accountId: sid,
    channel: 'widget',
    messages: 1,
    usage: { input_tokens: 11, output_tokens: 7 },
  });
  assert(snap, 'recordUsage must return a snapshot');
  assert(snap.messages >= 1, 'snapshot messages should increment');

  const afterRow = await repos.quotaUsage.get('sub:' + sid);
  assert(afterRow && typeof afterRow === 'object', 'quota_usage/sub:<id> row must exist in Postgres');
  assert.strictEqual(
    afterRow.messages,
    beforeMsgs + 1,
    'messages must persist in Postgres after recordUsage'
  );

  console.log('[test-quota-postgres] ALL PASSED', {
    subscriberId: sid,
    messages: afterRow.messages,
  });
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
