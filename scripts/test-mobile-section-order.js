#!/usr/bin/env node
'use strict';

/**
 * Contract: public merchant pages keep the mobile journey order
 * products → about → location → hours → inquiry → payment → reviews
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function assertOrder(html, ids, label) {
  let last = -1;
  for (const id of ids) {
    const re = new RegExp('id=["\']' + id + '["\']');
    const m = re.exec(html);
    assert(m, label + ': missing #' + id);
    assert(m.index > last, label + ': #' + id + ' must follow previous section');
    last = m.index;
  }
}

const estate = read('rizq_estate.html');
assert(estate.includes('display:contents'), 'estate mobile uses display:contents');
assert(estate.includes('#est-listings{order:1}'), 'estate products first');
assert(estate.includes('#est-about-card{order:10}'), 'estate about after products');
assert(estate.includes('#est-location-card{order:11}'), 'estate location');
assert(estate.includes('#est-hours-card{order:12}'), 'estate hours');
assert(estate.includes('#est-desk{order:13}'), 'estate inquiry');
assert(estate.includes('#est-pay-card{order:14}'), 'estate payment');
assert(estate.includes('#est-reviews{order:15}'), 'estate reviews last');

const showroom = read('rizq_showroom.html');
assertOrder(
  showroom,
  [
    'catalog-section',
    'about-section',
    'showroom-location-card',
    'showroom-hours-card',
    'showroom-service-desk',
    'showroom-payment-methods',
    'reviews-section'
  ],
  'showroom DOM'
);

const office = read('rizq_office.html');
assert(office.includes('#svc-section{order:1}'), 'office services first');
assert(office.includes('#about-section{order:2}'), 'office about');
assert(office.includes('#location-card{order:4}'), 'office location');
assert(office.includes('#office-service-desk{order:5}'), 'office inquiry');
assert(office.includes('#office-pay-card{order:6}'), 'office payment');
assert(office.includes('#reviews-section{order:7}'), 'office reviews');
assert(office.includes('display:contents'), 'office mobile uses display:contents');

const store = read('rizq_store.html');
assert(store.includes('.content-grid > .store-main-col > main{'), 'store main products block');
assert(store.includes('#about-section{order:2}'), 'store about');
assert(store.includes('#store-location-card{order:3}'), 'store location');
assert(store.includes('#hours-card-el{order:4}'), 'store hours');
assert(store.includes('#store-service-desk{order:5}'), 'store inquiry');
assert(store.includes('#store-delivery-card{order:6}'), 'store payment/delivery');
assert(store.includes('#reviews-section{order:7}'), 'store reviews');

console.log('test-mobile-section-order: OK');
