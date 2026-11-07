#!/usr/bin/env node
/**
 * ذاكرة مؤقتة لأرقام الإحصاءات: TTL 60–120ث + إبطال عند writeAds.
 */
'use strict';

const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (e) { /* */ }

const {
  resolveTtlMs,
  MIN_TTL_MS,
  MAX_TTL_MS,
  DEFAULT_TTL_MS,
  getAdsCountSnapshot,
  getCachedCategoryStats,
  invalidateAdsStatsCache,
  invalidatePlatformStatsCache,
  _resetPlatformStatsCacheForTests,
  _cacheDebugForTests,
} = require('../lib/platformStatsCache');
const { getCategoryStats } = require('../lib/categoryStats');
const { buildAdsStatPresentation } = require('../lib/adsStat');

let pass = 0;
let fail = 0;
function ok(name, cond, detail) {
  if (cond) {
    pass += 1;
    console.log('  ✓ ' + name);
  } else {
    fail += 1;
    console.log('  ✗ ' + name + (detail ? ' — ' + detail : ''));
  }
}

(async () => {
  _resetPlatformStatsCacheForTests();

  const ttl = resolveTtlMs();
  ok('TTL within 60–120s', ttl >= MIN_TTL_MS && ttl <= MAX_TTL_MS, 'ttl=' + ttl);
  ok('default TTL is 90s', DEFAULT_TTL_MS === 90 * 1000);

  let reads = 0;
  const ads = [
    { id: 'R1', status: 'active', accountId: 'acc_real' },
    { id: 'R2', status: 'active', accountId: 'acc_real' },
    { id: 'D1', status: 'active', accountId: 'acc_demo_x' },
    { id: 'X1', status: 'pending', accountId: 'acc_real' },
  ];
  const readAds = async () => { reads += 1; return ads; };
  const getSiteConfig = async () => ({ site: { adsCount: 0 } });
  const getLaunchSettings = async () => ({ minActiveAdsToShow: 50 });

  const s1 = await getAdsCountSnapshot({ readAds, getSiteConfig, getLaunchSettings });
  ok('first ads snapshot misses cache', s1.cacheHit === false);
  ok('real active excludes demo', s1.real === 2, 'real=' + s1.real);
  ok('withDemo includes demo', s1.withDemo === 3, 'withDemo=' + s1.withDemo);
  ok('readAds called once', reads === 1);

  const s2 = await getAdsCountSnapshot({ readAds, getSiteConfig, getLaunchSettings });
  ok('second ads snapshot hits cache', s2.cacheHit === true);
  ok('readAds not called again', reads === 1, 'reads=' + reads);
  ok('cached real stable', s2.real === 2);

  invalidateAdsStatsCache();
  const s3 = await getAdsCountSnapshot({ readAds, getSiteConfig, getLaunchSettings });
  ok('after invalidate → miss', s3.cacheHit === false);
  ok('readAds called again', reads === 2);

  const c1 = getCachedCategoryStats(getCategoryStats);
  const dbg1 = _cacheDebugForTests();
  const c2 = getCachedCategoryStats(getCategoryStats);
  const dbg2 = _cacheDebugForTests();
  ok('category stats cats > 0', c1 && c1.cats > 0);
  ok('second category read uses cache', dbg2.readsCats === dbg1.readsCats);
  ok('category cacheHit on second', c2.cacheHit === true);

  invalidatePlatformStatsCache();
  const c3 = getCachedCategoryStats(getCategoryStats);
  ok('after full invalidate category recomputed', c3.cacheHit === false);

  _resetPlatformStatsCacheForTests();
  let buildReads = 0;
  const pres1 = await buildAdsStatPresentation({
    readAds: async () => { buildReads += 1; return ads; },
    getSiteConfig,
    getLaunchSettings,
    demoMode: false,
    lang: 'ar',
    useCache: true,
  });
  const pres2 = await buildAdsStatPresentation({
    readAds: async () => { buildReads += 1; return ads; },
    getSiteConfig,
    getLaunchSettings,
    demoMode: false,
    lang: 'ar',
    useCache: true,
  });
  ok('buildAdsStatPresentation caches (1 DB read)', buildReads === 1, 'reads=' + buildReads);
  ok('presentation free below floor', pres1.mode === 'free' && pres2.mode === 'free');

  const serverSrc = require('fs').readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  ok('writeAds invalidates ads stats cache',
    /invalidateAdsStatsCache\(/.test(serverSrc)
    && /async function writeAds[\s\S]*invalidateAdsStatsCache/.test(serverSrc));
  ok('sendRizqHtmlFile uses getCachedCategoryStats',
    /getCachedCategoryStats\(getCategoryStats\)/.test(serverSrc));

  console.log(fail
    ? ('\nplatform-stats-cache: FAILED ' + fail + ' / ' + (pass + fail))
    : ('\nplatform-stats-cache: ALL OK / ' + pass));
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
