/**
 * launchDate cache + minActiveAdsToShow + inventoryAllowed gate (logic unit tests).
 * تشغيل: node scripts/test-launch-demo-gate.js
 */
'use strict';

const path = require('path');
const fs = require('fs');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (e) { /* optional */ }

const launchMode = require('../config/launchMode');
const results = [];

function ok(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

function extractInventoryAllowedSource() {
  const p = path.join(__dirname, '..', '..', 'rizq_backend_config.js');
  const src = fs.readFileSync(p, 'utf8');
  ok('backend_config persists launch cache key', src.includes('rizq_launch_cache_v1'));
  ok('inventoryAllowed waits for cache or site-config',
    src.includes('__RIZQ_LAUNCH_FROM_CACHE') && src.includes('__RIZQ_SITE_CONFIG_READY'));
  ok('minActiveAdsToShow helper exported on RizqDemo', src.includes('minActiveAdsToShow'));
  const landingHtml = fs.readFileSync(path.join(__dirname, '..', '..', 'rizq_landing_v8.html'), 'utf8');
  const landingAds = fs.readFileSync(path.join(__dirname, '..', '..', 'landing-ads.js'), 'utf8');
  const landingPrices = fs.readFileSync(path.join(__dirname, '..', '..', 'landing-prices.js'), 'utf8');
  ok('landing gates early buildCards via _rizqMaybePaintDemoInventory',
    landingAds.includes('_rizqMaybePaintDemoInventory')
    || landingHtml.includes('_rizqMaybePaintDemoInventory'));
  ok('landing hides ads stat below minActiveAdsToShow',
    (landingPrices.includes('minActiveAdsToShow') || landingHtml.includes('minActiveAdsToShow'))
    && landingHtml.includes("data-stat=\"ads\""));
  const browse = fs.readFileSync(path.join(__dirname, '..', '..', 'rizq_browse.html'), 'utf8');
  ok('browse syncs DEMO after rizq:launch', browse.includes('syncDemoWithLaunch'));
  const panel = fs.readFileSync(path.join(__dirname, '..', '..', 'rizq_cp_panel.html'), 'utf8');
  ok('admin panel has launch-min-active-ads field', panel.includes('launch-min-active-ads'));
}

async function main() {
  console.log('\n=== launch demo gate / minActiveAds ===\n');
  extractInventoryAllowedSource();

  launchMode.setLaunchSettingsForTests({ launchDate: '2026-01-15', freeDays: 90, minActiveAdsToShow: 3 });
  let pub = await launchMode.publicLaunchConfig({});
  ok('publicLaunchConfig exposes minActiveAdsToShow', pub.minActiveAdsToShow === 3, String(pub.minActiveAdsToShow));
  ok('launchDate set ⇒ not dry-run', pub.maintenanceDryRun === false);

  launchMode.setLaunchSettingsForTests({ launchDate: '', freeDays: 90, minActiveAdsToShow: 0 });
  pub = await launchMode.publicLaunchConfig({});
  ok('explicit minActiveAdsToShow 0 stays 0', pub.minActiveAdsToShow === 0);
  launchMode.setLaunchSettingsForTests({ launchDate: '', freeDays: 90 });
  pub = await launchMode.publicLaunchConfig({});
  ok('unset minActiveAdsToShow ⇒ default 50', pub.minActiveAdsToShow === 50);
  ok('normalize clamps negative to 0', launchMode.normalizeMinActiveAdsToShow(-4) === 0);
  ok('normalize floors float', launchMode.normalizeMinActiveAdsToShow(2.9) === 2);
  ok('normalize null ⇒ default 50', launchMode.normalizeMinActiveAdsToShow(null) === 50);

  launchMode.setLaunchSettingsForTests(null);

  const failed = results.filter((r) => !r.pass);
  console.log('\n' + (failed.length ? 'FAILED ' + failed.length : 'ALL OK') + ' / ' + results.length);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
