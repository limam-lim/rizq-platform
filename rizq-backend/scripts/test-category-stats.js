#!/usr/bin/env node
/**
 * يقفل أن أرقام الأقسام/الفروع في بطاقة الإحصاءات =
 * العدد الفعلي في rizq_categories_config.js (مصدر القائمة)،
 * وأن الولايات ثابتة 15، وأن الخادم يحقنها في HTML.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  getCategoryStats,
  injectCategoryStats,
  WILAYAS_FIXED,
  countFromBuiltin,
  loadRizqCategories,
} = require('../lib/categoryStats');

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

const RC = loadRizqCategories();
const manual = countFromBuiltin(RC.BUILTIN);
const stats = getCategoryStats();

ok('BUILTIN has categories', manual.cats > 0, 'cats=' + manual.cats);
ok('BUILTIN has subcategories', manual.subs > 0, 'subs=' + manual.subs);
ok('getCategoryStats.cats === BUILTIN length',
  stats.cats === RC.BUILTIN.length && stats.cats === manual.cats,
  JSON.stringify({ statsCats: stats.cats, builtin: RC.BUILTIN.length }));
ok('getCategoryStats.subs === sum of flat subcats',
  stats.subs === manual.subs,
  JSON.stringify({ statsSubs: stats.subs, manual: manual.subs }));
ok('wilayas fixed at 15',
  stats.wilayas === 15 && stats.wilayas === WILAYAS_FIXED);

const landingPath = path.join(__dirname, '..', '..', 'rizq_landing_v8.html');
const landing = fs.readFileSync(landingPath, 'utf8');
ok('landing marks cats/subs/wilayas/ads for server inject',
  /data-rizq-stat="cats"/.test(landing)
  && /data-rizq-stat="subs"/.test(landing)
  && /data-rizq-stat="wilayas"/.test(landing)
  && /data-rizq-stat="ads"/.test(landing));
ok('landing no longer hardcodes 22/268 as sole source',
  !/<span class="h-stat-num" data-target="22">22<\/span>/.test(landing)
  && !/<span class="h-stat-num" data-target="268" data-suffix="\+">268\+<\/span>/.test(landing));

const injected = injectCategoryStats(landing, stats);
function readInjected(html, key) {
  const re = new RegExp(
    'data-rizq-stat="' + key + '"[^>]*>([^<]+)</span>',
    'i'
  );
  const m = html.match(re);
  return m ? String(m[1]).trim() : null;
}
ok('inject writes cats == settings count',
  readInjected(injected, 'cats') === String(stats.cats),
  'got=' + readInjected(injected, 'cats'));
ok('inject writes subs == settings count with +',
  readInjected(injected, 'subs') === String(stats.subs) + '+',
  'got=' + readInjected(injected, 'subs'));
ok('inject keeps wilayas = 15',
  readInjected(injected, 'wilayas') === '15');

const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
ok('sendRizqHtmlFile calls injectCategoryStats',
  /injectCategoryStats\(/.test(serverSrc)
  && (/getCachedCategoryStats\(getCategoryStats\)/.test(serverSrc) || /getCategoryStats\(/.test(serverSrc)));
ok('platform-stats JSON exposes cats/subs/wilayas',
  /cats:\s*catStats\.cats/.test(serverSrc)
  && /subs:\s*catStats\.subs/.test(serverSrc)
  && /wilayas:\s*catStats\.wilayas/.test(serverSrc));

console.log(fail
  ? ('\ncategory-stats: FAILED ' + fail + ' / ' + (pass + fail))
  : ('\ncategory-stats: ALL OK / ' + pass));
process.exit(fail ? 1 : 0);
