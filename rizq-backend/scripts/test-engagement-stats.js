#!/usr/bin/env node
/**
 * إحصاءات الظهور/النقر والتواصل — منع التضخيم 30د + أسبوع/شهر.
 * على rizq_test فقط.
 */
'use strict';

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-engagement-stats: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }

  const repos = require('../db/repos');
  const visit = require('../rizq_visit_tracker');
  const contact = require('../rizq_contact_tracker');

  const accId = 'eng-test-' + Date.now().toString(36);
  await repos.setVisitStats(accId, { total: 0, byDay: {}, bySource: {} }).catch(() => {});
  await repos.setContactStats(accId, { total: 0, byDay: {}, byType: {}, byAd: {} }).catch(() => {});

  console.log('\n— impressions / clicks + 30min dedupe —');
  {
    const v1 = await visit.trackVisit(accId, {
      kind: 'impression', surface: 'home', viewerKey: 'viewer-a',
    });
    ok('first impression counted', v1.ok && v1.counted === true, v1);

    const v2 = await visit.trackVisit(accId, {
      kind: 'impression', surface: 'home', viewerKey: 'viewer-a',
    });
    ok('same viewer impression deduped', v2.ok && v2.counted === false && v2.deduped === true, v2);

    const v3 = await visit.trackVisit(accId, {
      kind: 'impression', surface: 'guide', viewerKey: 'viewer-b',
    });
    ok('other viewer impression counted', v3.ok && v3.counted === true, v3);

    const c1 = await visit.trackVisit(accId, {
      kind: 'click', surface: 'home', viewerKey: 'viewer-a',
    });
    ok('first click counted', c1.ok && c1.counted === true, c1);
    const c2 = await visit.trackVisit(accId, {
      kind: 'click', surface: 'home', viewerKey: 'viewer-a',
    });
    ok('same viewer click deduped', c2.ok && c2.counted === false && c2.deduped === true, c2);

    const storeVisit = await visit.trackVisit(accId, {
      kind: 'visit', surface: 'store', referrer: 'https://wa.me/x', viewerKey: 'viewer-a',
    });
    ok('store visit counted separately', storeVisit.ok && storeVisit.counted === true, storeVisit);

    const stats = await visit.getVisitStats(accId);
    ok('impressions total = 2', stats.impressions.total === 2, stats.impressions);
    ok('clicks total = 1', stats.clicks.total === 1, stats.clicks);
    ok('visits total = 1', stats.total === 1, stats);
    ok('impression week/month > 0', stats.impressions.weekTotal >= 2 && stats.impressions.monthTotal >= 2, stats.impressions);
    ok('no PII fields in stats', !('ip' in stats) && !('viewerKey' in stats) && !('ua' in stats), Object.keys(stats));
  }

  console.log('\n— contact clicks store-level 30min dedupe —');
  {
    const t1 = await contact.trackContactClick(accId, {
      type: 'whatsapp', adId: 'ad-1', viewerKey: 'viewer-c',
    });
    ok('first contact counted', t1.ok && t1.counted === true, t1);
    const t2 = await contact.trackContactClick(accId, {
      type: 'call', adId: 'ad-2', viewerKey: 'viewer-c',
    });
    ok('same viewer contact deduped across types', t2.ok && t2.counted === false && t2.deduped === true, t2);
    const t3 = await contact.trackContactClick(accId, {
      type: 'email', adId: 'ad-3', viewerKey: 'viewer-d',
    });
    ok('other viewer contact counted', t3.ok && t3.counted === true, t3);

    const cs = await contact.getContactStats(accId);
    ok('contact week/month = 2', cs.weekTotal === 2 && cs.monthTotal === 2, cs);
  }

  console.log('\n— fingerprint has no raw IP dump —');
  {
    const fp = visit.viewerFingerprint(
      { ip: '203.0.113.9', headers: { 'user-agent': 'TestAgent/1.0' } },
      null
    );
    ok('fingerprint is hashed', typeof fp === 'string' && fp.startsWith('a:') && !fp.includes('203.0.113'), fp);
    ok('DEDUPE_TTL is 30min', visit.DEDUPE_TTL_MS === 30 * 60 * 1000, visit.DEDUPE_TTL_MS);
  }

  try {
    await repos.setVisitStats(accId, { total: 0, byDay: {}, bySource: {} });
    await repos.setContactStats(accId, { total: 0, byDay: {}, byType: {}, byAd: {} });
  } catch (eClean) { /* */ }

  console.log('\n══ engagement-stats: ' + pass + ' pass, ' + fail + ' fail ══');
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(2);
});
