'use strict';
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (e) { /* */ }
const {
  parseDemoModeEnv,
  isDemoModeEnabled,
  injectDemoMode,
} = require('../lib/demoMode');

let pass = 0, fail = 0;
function ok(n, c, d) {
  if (c) { pass++; console.log('  ✓ ' + n); }
  else { fail++; console.log('  ✗ ' + n + (d ? ' — ' + d : '')); }
}

ok('empty env → true (demo phase default)', parseDemoModeEnv('') === true);
ok('true/1/on → true', parseDemoModeEnv('true') && parseDemoModeEnv('1') && parseDemoModeEnv('on'));
ok('false/0/off → false', parseDemoModeEnv('false') === false && parseDemoModeEnv('0') === false);
ok('inject inserts non-writable boot flag',
  /__RIZQ_DEMO_MODE/.test(injectDemoMode('<html><head></head></html>', false))
  && /value:false/.test(injectDemoMode('<html><head></head></html>', false)));
ok('inject true', /value:true/.test(injectDemoMode('<html><head></head></html>', true)));
ok('isDemoModeEnabled reads process.env', typeof isDemoModeEnabled() === 'boolean');

console.log(fail ? '\nFAILED ' + fail + ' / ' + (pass + fail) : '\nALL OK / ' + pass);
process.exit(fail ? 1 : 0);
