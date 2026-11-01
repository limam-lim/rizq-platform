/**
 * اختبارات منطق الواجهة — fix-ui-logic-1
 * تشغيل: node scripts/run-with-test-db.js scripts/test-ui-logic-1.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
let failed = 0;
function ok(cond, msg, detail) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg, detail || '');
  } else {
    console.log('OK:', msg, detail || '');
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function main() {
  const cards = read('rizq_ad_cards.js');
  const commerce = read('rizq_store_commerce.js');
  const estate = read('rizq_estate.html');
  const footer = read('rizq_site_footer.js');
  const cart = read('rizq_cart.html');
  const products = read('rizq_products.html');
  const invAgent = read('rizq_investment_agent.js');
  const invPage = read('rizq_investments.html');
  const tenders = read('rizq_tenders.html');
  const perms = read('rizq_subscription_permissions.js');
  const backendCfg = read('rizq_backend_config.js');

  const uiBlob = (footer + cart + products + invPage + tenders)
    .replace(/href\^="mailto:direction@rizq\.mr"/g, ''); /* مُحدّد ترحيل قديم فقط */
  ok(!/mailto:direction@rizq\.mr/.test(uiBlob)
    && !/>\s*direction@rizq\.mr\s*</.test(uiBlob)
    && /contact@rizq\.mr/.test(uiBlob),
    'contact@rizq.mr replaces direction@ in key UI pages');
  ok(/contact@rizq\.mr/.test(footer) && /applyPublicContactEmail|DEFAULT_PUBLIC_EMAIL/.test(footer),
    'footer public email configurable from site-config');

  ok(/data-t="delivery-title"/.test(cart) && !/🚚 Mode de livraison/.test(cart),
    'cart delivery title uses i18n key, no hardcoded FR');

  ok(/has\(#rizq-desk-lang-btn\).*#lang-btn|body > #lang-btn/.test(products.replace(/\s+/g, ' '))
    || /body > #lang-btn/.test(products),
    'products hides orphan lang btn when desk lang exists');
  ok(/filters-sidebar.*#rizq-chat-toggle|#rizq-chat-toggle[\s\S]*filters-sidebar/.test(products)
    || /body:has\(\.filters-sidebar\) #rizq-chat-toggle/.test(products),
    'products offsets assistant bubble away from filters');

  ok(/isRejectedDemoVideoUrl|eRsGyueVLvQ/.test(commerce) && /platformPromoVideoUrl/.test(commerce),
    'promo video rejects TINTEL/youtube demo and falls back to platform');
  ok(!/eRsGyueVLvQ/.test(read('rizq_store.html') + read('rizq_showroom.html')),
    'store/showroom demo seeds no longer embed foreign youtube extra');

  ok(/bindPlatformPackagesDisclosure|packagesAsCta|isViewerAccountOwner/.test(perms),
    'packages CTA for visitors / owner visibility helpers');
  ok(/packagesAsCta:\s*true/.test(read('rizq_store.html')),
    'store wires packagesAsCta');

  ok(/متابعة الإيداع|Continuer le dépôt|sub-title/.test(invAgent),
    'investment agent fills deposit form + continue CTA');
  ok(/inv-submit-login|refreshInvSubmitGate|_invHasSession/.test(invPage),
    'investments login gate for guests');
  ok(/سجّل دخولك|Connectez-vous/.test(tenders) && /submitBtn\.disabled = true/.test(tenders),
    'tenders disables submit until login');

  ok(/demo:\s*true/.test(estate) && /inventoryAllowed/.test(estate) && /__RIZQ_ESTATE_DEMO_REVIEWS/.test(estate),
    'estate demo reviews marked and gated by launchDate/inventoryAllowed');
  ok(/__RIZQ_LAST_SITE_CONFIG/.test(backendCfg),
    'site-config cached for promo email/video');

  // وحدة mediaHtml
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
  vm.runInContext(cards + '\nthis.RizqAdCards = this.RizqAdCards || window.RizqAdCards;', g);
  const RA = g.RizqAdCards;
  ok(!!RA, 'RizqAdCards loaded');
  if (RA) {
    const empty = RA.mediaHtml({ id: 't1', title: 'x' }, { fr: false, price: '' });
    ok(empty.includes('السعر عند التواصل') && empty.includes('rzq-adx-price-pill'),
      'empty ad price → contact pill');
    const priced = RA.mediaHtml({ id: 't2', title: 'x', price: '12,000 MRU' }, { fr: false, price: '12,000 MRU' });
    ok(priced.includes('12,000 MRU') && !priced.includes('السعر عند التواصل'),
      'priced ad keeps normal price pill');
    const hidden = RA.mediaHtml({ id: 't3', title: 'x', price: '9,000 MRU' }, { fr: false, price: '9,000 MRU', hidePrice: true });
    ok(!hidden.includes('rzq-adx-price-pill'),
      'hidePrice omits media pill (product cards)');
    const locked = RA.mediaHtml({ id: 't4', title: 'x', price: '100', contactsLocked: true }, { fr: false, price: '100', contactsLocked: true });
    ok(locked.includes('السعر عند التواصل'),
      'contactsLocked → contact pill');
  }

  // محاكاة inventoryAllowed لآراء العرض
  const demoGate = {
    __RIZQ_SITE_CONFIG_READY: true,
    __RIZQ_LAUNCH_FROM_CACHE: true,
    RIZQ_LAUNCH: { launchDate: null },
    location: { search: '' },
  };
  demoGate.window = demoGate;
  vm.createContext(demoGate);
  vm.runInContext(backendCfg, demoGate);
  ok(demoGate.RizqDemo.inventoryAllowed() === true, 'inventoryAllowed true when launchDate null');
  demoGate.RIZQ_LAUNCH.launchDate = '2026-12-01';
  ok(demoGate.RizqDemo.inventoryAllowed() === false, 'inventoryAllowed false when launchDate set');
  demoGate.location.search = '?demo=1';
  ok(demoGate.RizqDemo.inventoryAllowed() === true, 'inventoryAllowed true with ?demo=1 even after launch');

  if (failed) {
    console.error('\n' + failed + ' assertion(s) failed');
    process.exit(1);
  }
  console.log('\nAll ui-logic-1 tests passed.');
}

main();
