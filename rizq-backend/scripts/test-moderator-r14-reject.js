#!/usr/bin/env node
/**
 * STEP 0: R14 external link must 422 and never be stored.
 *   node scripts/test-moderator-r14-reject.js
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const assert = require('assert');
const crypto = require('crypto');
const db = require('../db');
const repos = require('../db/repos');
const { inspectAdForPublish, moderatorAdMiddleware } = require('../services/moderatorServer');

function mockRes() {
  const out = { statusCode: 200, body: null };
  return {
    status(code) { out.statusCode = code; return this; },
    json(payload) { out.body = payload; return this; },
    _out: out,
  };
}

async function main() {
  await db.ready();
  const draftId = 'RZQ-2099-' + String(Date.now()).slice(-6);

  const decision = await inspectAdForPublish({
    id: draftId,
    title: 'منتج تجريبي',
    desc: 'زوروا موقعنا https://evil.example.com للشراء',
    price: '1000',
    category: 'other',
    accountType: 'individual',
  });
  assert.strictEqual(decision.decision, 'reject', 'inspect must reject');
  assert.ok((decision.codes || decision.rules || []).includes?.('R14')
    || JSON.stringify(decision).includes('R14')
    || /رابط|خارج|URL|http/i.test(JSON.stringify(decision)),
  'decision should cite R14 or external link');

  const req = {
    body: {
      id: draftId,
      title: 'منتج تجريبي',
      desc: 'تفاصيل مع رابط https://spam.test/buy',
      price: '1000',
      category: 'other',
      accountType: 'individual',
      accountId: 'acc_r14_should_not_matter',
    },
  };
  const res = mockRes();
  let nextCalled = false;
  await new Promise((resolve) => {
    moderatorAdMiddleware(req, res, () => { nextCalled = true; resolve(); });
    // if middleware responds without next
    setTimeout(resolve, 50);
  });
  assert.strictEqual(nextCalled, false, 'middleware must not call next on reject');
  assert.strictEqual(res._out.statusCode, 422, 'must respond 422');
  assert.ok(res._out.body && res._out.body.ok === false);

  const stored = await repos.ads.getById(draftId);
  assert.ok(!stored, 'ad must not be stored');

  // also ensure no accidental upsert via list
  const hits = (await repos.ads.list()).filter((a) => a && a.id === draftId);
  assert.strictEqual(hits.length, 0, 'ad absent from ads list');

  console.log('[test-moderator-r14-reject] ALL PASSED');
  await db.close();
}

main().catch(async (e) => {
  console.error('[test-moderator-r14-reject] FAILED', e);
  try { await db.close(); } catch (_) { /* */ }
  process.exit(1);
});
