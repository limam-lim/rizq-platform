#!/usr/bin/env node
/** Unit tests: optional GPS lat/lon on ads (parseOptionalCoords) */
'use strict';

const { parseOptionalCoords } = require('../routes/ads');

let passed = 0;
let total = 0;

function check(name, cond, detail) {
  total++;
  if (cond) {
    passed++;
    console.log('✅ ' + name + (detail ? ' — ' + detail : ''));
  } else {
    console.log('❌ ' + name + (detail ? ' — ' + detail : ''));
  }
}

check('unset when empty body', parseOptionalCoords({}).unset === true);
check('unset when no lat/lon keys', parseOptionalCoords({ title: 'x' }).unset === true);

const ok = parseOptionalCoords({ lat: 18.0855, lon: -15.962 });
check('accepts Nouakchott shop coords', ok.ok && ok.lat === 18.0855 && ok.lon === -15.962);

const rounded = parseOptionalCoords({ lat: 18.0855123456, lon: -15.9620123456 });
check('rounds to 6 decimals', rounded.ok && rounded.lat === 18.085512 && rounded.lon === -15.962012);

check('rejects Paris', !parseOptionalCoords({ lat: 48.8566, lon: 2.3522 }).ok);
check('rejects non-numeric', !parseOptionalCoords({ lat: 'abc', lon: -15 }).ok);
check('rejects lat-only', !parseOptionalCoords({ lat: 18.08, lon: '' }).ok);

const clear = parseOptionalCoords({ lat: null, lon: null }, { allowClear: true });
check('clear on null pair when allowClear', clear.ok && clear.clear === true);

const noClear = parseOptionalCoords({ lat: null, lon: null }, { allowClear: false });
check('null pair without allowClear is unset', noClear.ok && noClear.unset === true);

console.log('\n' + passed + '/' + total + ' passed');
process.exit(passed === total ? 0 : 1);
