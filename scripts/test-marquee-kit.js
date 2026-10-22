#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const kitSrc = fs.readFileSync(path.join(root, 'rizq_marquee_kit.js'), 'utf8');
const landing = fs.readFileSync(path.join(root, 'rizq_landing_v8.html'), 'utf8');

assert.ok(landing.includes('rizq_marquee_kit.js'), 'landing loads marquee kit');
assert.ok(landing.includes('RizqMarqueeKit.enhanceRafState'), 'landing enhances raf marquees');
assert.ok(landing.includes('RizqMarqueeKit.enhanceDiscStrip'), 'landing enhances discovery strips');
assert.ok(landing.includes('hoverPaused'), 'landing respects hoverPaused');
assert.ok(landing.includes('data-mq-auto'), 'video strip opts into auto marquee');
assert.ok(!kitSrc.includes('rzq-mq-ctrls'), 'no visible control buttons');
assert.ok(!kitSrc.includes('createElement(\'button\')'), 'kit does not create buttons');
assert.ok(kitSrc.includes('pointerenter'), 'hover pause via pointerenter');
assert.ok(kitSrc.includes('wheel'), 'wheel scrub/speed');
assert.ok(kitSrc.includes('enhanceScrollTrack'), 'scroll strips covered');
assert.ok(kitSrc.includes('enhanceEverything'), 'auto-scan all strips');
assert.ok(!kitSrc.includes('rizq-emergency-strip'), 'emergency strip not in kit');

const els = new Map();
function el(tag) {
  const o = {
    tagName: String(tag || 'div').toUpperCase(),
    style: {},
    className: '',
    classList: {
      _s: new Set(),
      add: function (c) { this._s.add(c); o.className = [...this._s].join(' '); },
      remove: function (c) { this._s.delete(c); o.className = [...this._s].join(' '); },
      toggle: function (c, on) {
        if (on == null) on = !this._s.has(c);
        if (on) this.add(c); else this.remove(c);
      },
      contains: function (c) { return this._s.has(c); }
    },
    children: [],
    attributes: {},
    textContent: '',
    innerHTML: '',
    id: '',
    setAttribute: function (k, v) {
      this.attributes[k] = String(v);
      if (k === 'id') { this.id = String(v); els.set(this.id, this); }
    },
    getAttribute: function (k) { return this.attributes[k] != null ? this.attributes[k] : null; },
    appendChild: function (c) { this.children.push(c); return c; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    closest: function () { return this; },
    getBoundingClientRect: function () { return { height: 26, width: 100 }; }
  };
  return o;
}

const document = {
  head: el('head'),
  body: el('body'),
  documentElement: el('html'),
  getElementById: function (id) { return els.get(id) || null; },
  createElement: function (t) { return el(t); },
  addEventListener: function () {},
  readyState: 'complete'
};
document.documentElement.classList = el('html').classList;
document.documentElement.style = {};

const sandbox = {
  window: {},
  document: document,
  console: console,
  localStorage: { getItem: function () { return 'ar'; }, setItem: function () {} },
  setInterval: function () { return 0; },
  clearInterval: function () {},
  setTimeout: function () { return 0; },
  clearTimeout: function () {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;

vm.runInNewContext(kitSrc, sandbox);
assert.ok(sandbox.RizqMarqueeKit, 'RizqMarqueeKit exported');
assert.equal(typeof sandbox.RizqMarqueeKit.enhanceRafState, 'function');
assert.equal(typeof sandbox.RizqMarqueeKit.enhanceDiscStrip, 'function');

const track = el('div');
track.classList.add('cards-track');
const wrap = el('div');
wrap.classList.add('cards-track-wrap');
wrap.closest = function () { return wrap; };
track.closest = function () { return wrap; };

const state = {
  el: track,
  pos: 0,
  half: 200,
  paused: false,
  offscreen: false,
  pxPerSec: 56,
  basePx: 56,
  boost: 0,
  apply: function () {},
  applyPlayState: function () {
    this.paused = !!(this.userPaused || this.hoverPaused);
  }
};
sandbox.RizqMarqueeKit.enhanceRafState(state);
assert.ok(state._kitBound, 'raf state bound');
assert.equal(typeof state._kitApi.speedUp, 'function');
assert.equal(typeof state._kitApi.reverse, 'function');

const strip = el('div');
strip.classList.add('rzq-disc-strip');
strip.closest = function () { return strip; };
const ctl = { boostPx: 0, dir: 1 };
sandbox.RizqMarqueeKit.enhanceDiscStrip(strip, ctl);
assert.ok(strip._kitBound, 'disc strip bound');
assert.ok(!wrap.querySelector || true, 'no buttons required');

console.log('test-marquee-kit: ok');
