/**
 * تحقق جاهزية إطلاق solo: علم estate + قواعد القسم + مفاتيح الإطلاق
 * node rizq-backend/scripts/test-solo-launch-modules.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const launchMode = require('../config/launchMode');

let failed = 0;
function ok(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg);
  } else {
    console.log('OK:', msg);
  }
}

ok(launchMode.ALL_MODULE_KEYS.includes('estate'), 'ALL_MODULE_KEYS has estate');
ok(launchMode.ALL_MODULE_KEYS.includes('individual'), 'ALL_MODULE_KEYS has individual');
ok(launchMode.ALL_MODULE_KEYS.includes('store'), 'ALL_MODULE_KEYS has store');

const open = launchMode.parseOpenSections('individual,store,estate');
ok(open && open.individual && open.store && open.estate, 'parseOpenSections opens trio');
ok(open && !open.office && !open.corp && !open.tenders, 'parseOpenSections closes others');

const panel = fs.readFileSync(path.join(__dirname, '../../rizq_cp_panel.html'), 'utf8');
ok(/key:'estate'/.test(panel), 'cp_panel MODULE_DEFS includes estate');
ok(/SOLO_LAUNCH_OPEN_KEYS/.test(panel), 'cp_panel has solo launch preset');
ok(/applySoloLaunchModulesPreset/.test(panel), 'cp_panel has preset handler');
ok(/DEFAULT_MODULE_FLAGS_ADMIN/.test(panel), 'cp_panel default flags keep modules open');

const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
ok(/estate:\s*\{\s*extraBannedKeywords/.test(server), 'server DEFAULT_SECTION_RULES has estate');

const flagsJs = fs.readFileSync(path.join(__dirname, '../../rizq_module_flags.js'), 'utf8');
ok(/'rizq_estate\.html':\s*'estate'/.test(flagsJs), 'module_flags maps estate pages');

const navJs = fs.readFileSync(path.join(__dirname, '../../rizq_dynamic_nav.js'), 'utf8');
ok(/estate:\s*'virtual-estate'/.test(navJs), 'dynamic_nav SECTION_MAP includes estate');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('\nSolo launch modules checks passed.');
