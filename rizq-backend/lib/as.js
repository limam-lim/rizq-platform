/**
 * Normalize sync|async store results — await as(value) works for both drivers.
 */
'use strict';

function as(value) {
  return Promise.resolve(value);
}

module.exports = { as };
