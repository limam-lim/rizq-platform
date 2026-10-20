#!/usr/bin/env node
'use strict';

/**
 * Static contract: demo/promo shows packages; real merchant pages stay clean;
 * storefront payments stay off; checkout PREFACTUR only after bank/pickup/delivery.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const perms = read('rizq_subscription_permissions.js');
assert(perms.includes('shouldShowPlatformPackages'), 'packages helper required');
assert(perms.includes('shouldShowStorefrontPayments'), 'storefront payments helper required');
assert(perms.includes('shouldShowCheckoutPrefacture'), 'checkout prefacture helper required');
assert(perms.includes('applyPublicMerchantSurface'), 'applyPublicMerchantSurface required');
assert(
  /function shouldShowStorefrontPayments\(\)\s*\{\s*return false;/.test(perms),
  'storefront payments must always be false (checkout-only)'
);
assert(
  /function shouldShowListingPrefacture\(\)\s*\{\s*return false;/.test(perms),
  'listing PREFACTUR must be off'
);

// Logic twin of shouldShowCheckoutPrefacture
function shouldShowCheckoutPrefacture(ctx) {
  ctx = ctx || {};
  const pay = String(ctx.paymentMethod || '');
  const del = String(ctx.deliveryType || '');
  return pay === 'bank' || del === 'pickup' || del === 'delivery';
}
assert.strictEqual(shouldShowCheckoutPrefacture({ paymentMethod: 'cod', deliveryType: '' }), false);
assert.strictEqual(shouldShowCheckoutPrefacture({ paymentMethod: 'bank', deliveryType: '' }), true);
assert.strictEqual(shouldShowCheckoutPrefacture({ paymentMethod: 'cod', deliveryType: 'pickup' }), true);
assert.strictEqual(shouldShowCheckoutPrefacture({ paymentMethod: 'cod', deliveryType: 'delivery' }), true);

const store = read('rizq_store.html');
assert(store.includes("packageIds: ['store-packages']"), 'store must gate packages');
assert(store.includes("paymentIds: ['store-payment-methods']"), 'store must gate storefront pay');
assert(store.includes('id="store-packages" style="display:none'), 'store packages hidden by default');

const office = read('rizq_office.html');
assert(office.includes("packageIds: ['office-packages', 'sec-packages-btn']"), 'office packages gated');
assert(office.includes('selectOfficeFulfill'), 'office fulfill selector required');
assert(office.includes('id="office-packages" style="display:none"'), 'office packages hidden by default');

const corp = read('rizq_corp.html');
assert(corp.includes('rizq_subscription_permissions.js'), 'corp must load permissions');
assert(corp.includes("packageIds: ['corp-packages']"), 'corp packages gated');
assert(!corp.includes("onclick=\"event.stopPropagation();issueCorpPrefacture"), 'no corp card PREFACTUR');

const showroom = read('rizq_showroom.html');
assert(showroom.includes("packageIds: ['pkg-section']"), 'showroom packages gated');
assert(!/onclick=\"event\.stopPropagation\(\);issueShowroomPrefacture/.test(showroom),
  'showroom listing PREFACTUR removed');

const estate = read('rizq_estate.html');
assert(estate.includes('shouldShowStorefrontPayments'), 'estate hides storefront pay');
assert(estate.includes("paymentIds: ['est-payment-methods', 'est-pay-card']"), 'estate pay card gated');

const cart = read('rizq_cart.html');
assert(cart.includes('rizq_subscription_permissions.js'), 'cart loads permissions');
assert(cart.includes('syncCartPrefactureVisibility'), 'cart syncs PREFACTUR visibility');
assert(cart.includes('shouldShowCheckoutPrefacture'), 'cart uses checkout prefacture rule');

console.log('test-merchant-journey-surface: OK');
