/**
 * منطق التصفح/البطاقات: append في loadMoreAds، إخفاء بلا عنوان، سعر فارغ → عند التواصل.
 * لا يكتب في قاعدة المعاينة — فحص ملفات ثابتة + وحدة وسائط.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

function main() {
  const browse = fs.readFileSync(path.join(ROOT, 'rizq_browse.html'), 'utf8');
  const landing = fs.readFileSync(path.join(ROOT, 'rizq_landing_v8.html'), 'utf8');
  const cards = fs.readFileSync(path.join(ROOT, 'rizq_ad_cards.js'), 'utf8');
  const server = fs.readFileSync(path.join(ROOT, 'rizq-backend', 'server.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'rizq-backend', 'package.json'), 'utf8'));

  const loadMoreFn = (browse.match(/function loadMoreAds\(\)\{[\s\S]*?\nfunction _teardownInfiniteObserver/) || [])[0] || '';
  ok('loadMoreAds appends via insertAdjacentHTML (no full re-render)',
    loadMoreFn.includes("insertAdjacentHTML('beforebegin'")
    && loadMoreFn.includes('chunk.map')
    && !/visibleCount=Math\.min\(visibleCount\+PER_PAGE[\s\S]{0,80}renderResultList\(\);/.test(loadMoreFn));

  ok('browse filters ads without public title',
    /function adHasPublicTitle/.test(browse)
    && /filter\(adHasPublicTitle\)/.test(browse)
    && /!adHasPublicTitle\(a\)/.test(browse));

  ok('browse empty price → السعر عند التواصل',
    browse.includes('السعر عند التواصل')
    && /priceOnContact/.test(browse));

  ok('rizq_ad_cards always shows price pill with contact fallback',
    cards.includes('السعر عند التواصل')
    && /rzq-adx-price-pill/.test(cards)
    && !/\(price \? '<div class="rzq-adx-price"/.test(cards));

  ok('landing seeds FEATURED into ADS when empty + demoOk',
    /function _rizqMaybePaintDemoInventory[\s\S]*?!ADS\.length[\s\S]*?FEATURED_ADS\.forEach/.test(landing)
    && /function buildCards[\s\S]*?!ADS\.length && demoOk[\s\S]*?FEATURED_ADS/.test(landing));

  ok('landing filters public title',
    /function _adHasPublicTitle/.test(landing)
    && /_landingAdsPool[\s\S]*?_adHasPublicTitle/.test(landing));

  ok('server.js preserves DATABASE_URL across dotenv override',
    /preserve\.DATABASE_URL/.test(server)
    && /process\.env\.DATABASE_URL = preserve\.DATABASE_URL/.test(server));

  const testScripts = Object.keys(pkg.scripts).filter((k) => k.startsWith('test:'));
  const allWrapped = testScripts.every((k) => String(pkg.scripts[k]).includes('run-with-test-db.js'));
  ok('all rizq-backend npm test:* use run-with-test-db.js', allWrapped,
    'count=' + testScripts.length);

  ok('assert-rizq-test-db.js exists',
    fs.existsSync(path.join(__dirname, 'assert-rizq-test-db.js')));

  // وحدة وسائط: نفّذ mediaHtml في sandbox
  const g = {
    console,
    document: {
      readyState: 'complete',
      hidden: false,
      documentElement: { getAttribute: function () { return null; } },
      addEventListener: function () {},
      querySelectorAll: function () { return []; },
      getElementById: function () { return null; },
      createElement: function () { return { style: {}, setAttribute: function () {}, appendChild: function () {} }; },
      body: { appendChild: function () {} },
    },
    localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
    matchMedia: function () { return { matches: false, addListener: function () {}, addEventListener: function () {} }; },
    MutationObserver: function () { this.observe = function () {}; },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  g.window = g;
  g.globalThis = g;
  g.self = g;
  vm.createContext(g);
  try {
    vm.runInContext(cards + '\nthis.RizqAdCards = this.RizqAdCards || window.RizqAdCards;', g);
  } catch (eVm) {
    ok('mediaHtml vm load', false, String(eVm && eVm.message || eVm));
  }
  const RA = g.RizqAdCards || (g.window && g.window.RizqAdCards);
  if (RA && typeof RA.mediaHtml === 'function') {
    const html = RA.mediaHtml({ id: 't1', title: 'x' }, { fr: false, price: '' });
    ok('mediaHtml empty price renders contact pill',
      html.includes('السعر عند التواصل') && html.includes('rzq-adx-price-pill'));
    const htmlFr = RA.mediaHtml({ id: 't2', title: 'x' }, { fr: true, price: null });
    ok('mediaHtml FR empty price → Prix à la demande',
      htmlFr.includes('Prix à la demande'));
  } else {
    ok('mediaHtml empty price renders contact pill', false, 'RizqAdCards not loaded in vm');
    ok('mediaHtml FR empty price → Prix à la demande', false, 'RizqAdCards not loaded in vm');
  }

  const failed = results.filter((r) => !r.pass);
  console.log('\n' + (failed.length ? 'FAILED ' + failed.length : 'ALL OK') + ' / ' + results.length);
  process.exit(failed.length ? 1 : 0);
}

main();
