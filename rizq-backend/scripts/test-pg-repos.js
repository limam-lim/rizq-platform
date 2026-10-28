#!/usr/bin/env node
/**
 * Exercise async repos / platformStore / models against live Postgres.
 * Requires: DATABASE_URL, migrations applied.
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const assert = require('assert');
const db = require('../db');
const repos = require('../db/repos');
const buyer = require('../models/buyer');
const wishlist = require('../models/wishlist');
const corp = require('../models/corpApiIntegration');
const { createAdminSessionStore } = require('../services/adminSessionStore');
const redis = require('../lib/redis');
const cache = require('../services/cacheService');

async function main() {
  assert(process.env.DATABASE_URL, 'DATABASE_URL required');
  console.log('[test-pg-repos] connecting…');
  await db.ready();

  const redisSt = await redis.ready();
  console.log('[test-pg-repos] redis backend=', redisSt.backend || redis.backend());

  // Site config via async repos
  const cfg = { brand: 'Rizq PG Test', updatedAt: new Date().toISOString() };
  await repos.saveSiteConfig(cfg);
  const got = await repos.getSiteConfig();
  assert.strictEqual(got.brand, 'Rizq PG Test');
  console.log('✓ siteConfig');

  // Accounts / ads
  const accId = 'acc_pg_test_' + Date.now();
  const adId = 'ad_pg_test_' + Date.now();
  await repos.accounts.upsert({
    id: accId,
    type: 'store',
    email: 'pgtest@example.com',
    status: 'active',
    nni: '9988776655',
    suspended: false,
    updatedAt: new Date().toISOString(),
  });
  const acc = await repos.accounts.getById(accId);
  assert.ok(acc && acc.id === accId);
  assert.ok(await repos.accounts.getByEmail('pgtest@example.com'));

  await repos.ads.upsert({
    id: adId,
    accountId: accId,
    status: 'live',
    category: 'test',
    title: 'PG Test Ad',
    updatedAt: new Date().toISOString(),
  });
  const ad = await repos.ads.getById(adId);
  assert.ok(ad && ad.id === adId);
  console.log('✓ accounts + ads');

  // Documents collection
  await repos.messages.upsert('msg_pg_test', { id: 'msg_pg_test', body: 'hello' });
  const msg = await repos.messages.get('msg_pg_test');
  assert.strictEqual(msg.body, 'hello');
  assert.ok((await repos.messages.count()) >= 1);
  await repos.messages.remove('msg_pg_test');
  console.log('✓ documents collection');

  // Buyer + wishlist — unique MR phone each run (2xxxxxx pattern)
  const phoneSuffix = String(Date.now()).slice(-6);
  const mrPhone = '22' + phoneSuffix; // 8 digits starting with 22
  const reg = await buyer.registerOrLogin({
    name: 'Test Buyer PG',
    email: 'buyer.pg.' + Date.now() + '@example.com',
    phone: mrPhone,
    phoneIntl: '+222' + mrPhone,
    whatsapp: '+222' + mrPhone,
    password: 'testpass99',
  });
  assert.ok(reg.buyer && reg.token);
  const ids = await wishlist.replaceAll(reg.buyer.id, [adId, 'ad_other']);
  assert.deepStrictEqual(ids.sort(), [adId, 'ad_other'].sort());
  await wishlist.removeItem(reg.buyer.id, 'ad_other');
  console.log('✓ buyer + wishlist');

  // Corp API
  await corp.upsert({
    companyId: accId,
    apiKeyHash: 'testhash',
    apiKeyPrefix: 'pgxx',
    apiStatus: 'active',
  });
  const c = await corp.findByCompanyId(accId);
  assert.strictEqual(c.apiKeyPrefix, 'pgxx');
  console.log('✓ corpApiIntegration');

  // Admin sessions
  const sessions = createAdminSessionStore();
  const tok = 'adm_pg_test_' + Date.now();
  await sessions.set(tok, { user: 'owner', expiresAt: Date.now() + 60_000 });
  const sess = await sessions.get(tok);
  assert.ok(sess && sess.user === 'owner');
  await sessions.delete(tok);
  assert.strictEqual(await sessions.get(tok), undefined);
  console.log('✓ adminSessionStore');

  // Cache (redis or memory)
  await cache.set('pg_test_key', { ok: 1 }, 30);
  const cached = await cache.get('pg_test_key');
  assert.deepStrictEqual(cached, { ok: 1 });
  await cache.del('pg_test_key');
  console.log('✓ cacheService');

  // Cleanup typed rows
  await repos.ads.remove(adId);
  await repos.accounts.replaceAll(
    (await repos.accounts.list()).filter((a) => a.id !== accId)
  );

  console.log('\n[test-pg-repos] ALL PASSED');
  await redis.close();
  await db.close();
}

main().catch(async (e) => {
  console.error('[test-pg-repos] FAILED', e);
  try { await db.close(); } catch (e2) { /* ignore */ }
  process.exit(1);
});
