#!/usr/bin/env node
/**
 * registerSubscriber → clear in-memory cache → getSubscriberProfile must
 * reload the profile from Postgres (not just the process Map).
 * Requires: DATABASE_URL, migrations applied.
 *
 *   node scripts/test-subscriber-pg-reload.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const assert = require('assert');
const path = require('path');
const db = require('../db');

async function main() {
  assert(process.env.DATABASE_URL, 'DATABASE_URL required');
  await db.ready();

  // Load agent after db is ready so repos.subscribers binds to live pool.
  const agentPath = path.join(__dirname, '..', '..', 'rizq_subscriber_agent.js');
  delete require.cache[require.resolve(agentPath)];
  const {
    registerSubscriber,
    getSubscriberProfile,
  } = require(agentPath);

  const id = 'sub_pg_reload_' + Date.now();
  const profile = {
    businessName: 'مكتب اختبار Postgres',
    businessType: 'law_office',
    plan: 'diamond',
    tier: 'diamond',
    accountId: 'acc_pg_reload_' + Date.now(),
    activity: 'اختبار إعادة التحميل من PostgreSQL',
  };

  await registerSubscriber(id, profile);

  // Force a cold reload: drop module cache + Map by re-requiring.
  delete require.cache[require.resolve(agentPath)];
  const agent2 = require(agentPath);
  const loaded = await agent2.getSubscriberProfile(id);

  assert.ok(loaded, 'profile missing after Postgres reload');
  assert.strictEqual(loaded.businessName, profile.businessName);
  assert.strictEqual(loaded.businessType, profile.businessType);
  assert.strictEqual(loaded.accountId, profile.accountId);
  assert.strictEqual(loaded.plan, 'diamond');

  // Same-process path: getSubscriberProfile always re-syncs from store.
  const again = await getSubscriberProfile(id);
  assert.ok(again);
  assert.strictEqual(again.businessName, profile.businessName);

  console.log('[test-subscriber-pg-reload] ALL PASSED', { id, businessName: loaded.businessName });
  await db.close();
}

main().catch(async (e) => {
  console.error('[test-subscriber-pg-reload] FAILED', e);
  try { await db.close(); } catch (e2) { /* ignore */ }
  process.exit(1);
});
