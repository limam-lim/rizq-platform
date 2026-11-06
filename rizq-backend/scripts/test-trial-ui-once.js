#!/usr/bin/env node
/**
 * واجهة التجربة الواحدة: بطاقة التجربة لا تُعرض عند انتهاء الاشتراك أو استهلاك التجربة.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? String(extra).slice(0, 300) : ''); }
}

const enginePath = path.join(__dirname, '..', '..', 'rizq_subscription_engine.js');
const src = fs.readFileSync(enginePath, 'utf8');

function loadEngine(globals) {
  const sandbox = Object.assign({
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Number,
    String,
    Array,
    Object,
    parseInt,
    isFinite,
    localStorage: {
      _d: {},
      getItem(k) { return this._d[k] == null ? null : this._d[k]; },
      setItem(k, v) { this._d[k] = String(v); },
      removeItem(k) { delete this._d[k]; },
    },
    document: { createElement() { return {}; } },
    window: {},
    globalThis: {},
  }, globals || {});
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.global = sandbox;
  vm.runInNewContext(src, sandbox, { filename: 'rizq_subscription_engine.js' });
  return sandbox.RizqSub || sandbox.window.RizqSub;
}

const list = [
  { id: 'st-trial', name: 'تجريبية', price: 0, durationDays: 10, active: true },
  { id: 'st-month', name: 'شهرية', price: 2000, durationDays: 30, active: true },
];

console.log('\n— trial UI hide —');
{
  const RizqSub = loadEngine({ __rizqForceHideTrial: false, __rizqForceTrialUsed: false });
  ok('helpers exported', typeof RizqSub.isTrialPackageRow === 'function' && typeof RizqSub.shouldHideTrialPackageCard === 'function');
  ok('detects trial row', RizqSub.isTrialPackageRow(list[0]) === true);
  ok('month is not trial', RizqSub.isTrialPackageRow(list[1]) === false);

  const shown = RizqSub.renderPackageCardsHTML(list, {}, {}, 'ar', 'package');
  ok('trial visible for eligible account', shown.grid.indexOf('تجريبية') >= 0 && shown.grid.indexOf('st-trial') >= 0, shown.grid.slice(0, 200));
}

{
  const RizqSub = loadEngine({ __rizqForceHideTrial: true });
  const hidden = RizqSub.renderPackageCardsHTML(list, {}, {}, 'ar', 'package');
  ok('trial hidden when force-hide (expired/used)',
    hidden.grid.indexOf('تجريبية') < 0 && hidden.grid.indexOf('data-pkg-id="st-trial"') < 0
    && hidden.grid.indexOf('شهرية') >= 0,
    hidden.grid.slice(0, 240));
  ok('no اشترك الآن on hidden trial card',
    !/openPayModal\('تجريبية'/.test(hidden.grid),
    hidden.grid.match(/openPayModal\([^)]+\)/g));
}

{
  const RizqSub = loadEngine({
    __rizqForceHideTrial: false,
    __rizqForceTrialUsed: true,
    getSubInfo() { return { isExpired: false, trialUsed: true }; },
  });
  /* accountHasConsumedTrial reads __rizqForceTrialUsed */
  ok('consumed trial flag', RizqSub.accountHasConsumedTrial() === true);
  /* shouldHide uses consumed OR expired — force hide via consumed through shouldHide when force flags unset */
}

{
  const RizqSub = loadEngine({
    getSubInfo() { return { isExpired: true, trialUsed: false }; },
  });
  ok('hide when subscription expired', RizqSub.shouldHideTrialPackageCard() === true);
}

console.log('\n══ trial-ui-once: ' + pass + ' pass, ' + fail + ' fail ══');
process.exit(fail ? 1 : 0);
