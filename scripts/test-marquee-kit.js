#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const kitSrc = fs.readFileSync(path.join(root, 'rizq_marquee_kit.js'), 'utf8');
const landing = fs.readFileSync(path.join(root, 'rizq_landing_v8.html'), 'utf8');
const civic = fs.readFileSync(path.join(root, 'rizq_civic_ticker.js'), 'utf8');

assert.ok(landing.includes('rizq_marquee_kit.js'), 'landing loads marquee kit');
assert.ok(landing.includes('RizqMarqueeKit.enhanceRafState'), 'landing enhances raf marquees');
assert.ok(landing.includes('RizqMarqueeKit.enhanceDiscStrip'), 'landing enhances discovery strips');
assert.ok(civic.includes('setEmergency'), 'civic wires emergency strip');

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
      toggle: function (c, on) { if (on == null) on = !this._s.has(c); if (on) this.add(c); else this.remove(c); },
      contains: function (c) { return this._s.has(c); }
    },
    children: [],
    attributes: {},
    textContent: '',
    innerHTML: '',
    id: '',
    setAttribute: function (k, v) { this.attributes[k] = String(v); if (k === 'id') { this.id = String(v); els.set(this.id, this); } },
    getAttribute: function (k) { return this.attributes[k] != null ? this.attributes[k] : null; },
    appendChild: function (c) { this.children.push(c); return c; },
    insertBefore: function (c) { this.children.unshift(c); return c; },
    querySelector: function (sel) {
      if (sel === '.rzq-em-text') return this.children[0] && this.children[0].children && this.children[0].children[1];
      if (sel && sel.indexOf('rzq-mq-ctrls') >= 0) return this.children.find(function (x) { return x.className === 'rzq-mq-ctrls'; }) || null;
      if (sel && sel.indexOf('data-mq=') >= 0) {
        var m = /data-mq="([^"]+)"/.exec(sel);
        if (m) {
          return this.children.find(function (x) {
            return x.getAttribute && x.getAttribute('data-mq') === m[1];
          }) || null;
        }
      }
      return null;
    },
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
  addEventListener: function () {}
};
document.documentElement.classList = el('html').classList;
document.documentElement.style = {};
document.documentElement.getAttribute = function () { return 'ar'; };

const sandbox = {
  window: {},
  document: document,
  console: console,
  localStorage: { getItem: function () { return 'ar'; }, setItem: function () {} },
  setInterval: function () { return 0; },
  clearInterval: function () {},
  setTimeout: function (fn) { return 0; },
  clearTimeout: function () {}
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.runInNewContext(kitSrc, sandbox);

assert.ok(sandbox.RizqMarqueeKit, 'kit export');
sandbox.RizqMarqueeKit.setEmergency([
  { textAr: 'طوارئ تجريبية', textFr: 'Urgence test', link: '', priority: 'urgent' }
]);
const host = document.getElementById('rizq-emergency-strip');
assert.ok(host, 'emergency host created');
assert.ok(host.classList.contains('is-on'), 'emergency visible');
assert.ok(document.documentElement.classList.contains('rizq-has-emergency'), 'html flag on');

sandbox.RizqMarqueeKit.setEmergency([]);
assert.ok(!host.classList.contains('is-on'), 'emergency hidden when empty');
assert.ok(!document.documentElement.classList.contains('rizq-has-emergency'), 'html flag off');

const wrap = el('div');
wrap.className = 'ticker-wrap';
const inner = el('div');
inner.className = 'ticker-inner';
wrap.appendChild(inner);
inner.closest = function () { return wrap; };
wrap.querySelector = function (sel) {
  if (sel && String(sel).indexOf('rzq-mq-ctrls') >= 0) {
    return wrap.children.find(function (x) { return x.className === 'rzq-mq-ctrls'; }) || null;
  }
  return null;
};
wrap.addEventListener = function () {};

const state = {
  el: inner,
  pxPerSec: 56,
  basePx: 56,
  boost: 0,
  half: 200,
  pos: 0,
  paused: false,
  applyPlayState: function () {
    this.paused = !!(this.userPaused || this.hoverPaused);
  },
  apply: function () {}
};
sandbox.RizqMarqueeKit.enhanceRafState(state);
assert.ok(wrap.querySelector('.rzq-mq-ctrls'), 'controls mounted');
const box = wrap.querySelector('.rzq-mq-ctrls');
assert.ok(box.querySelector('[data-mq="rev"]'), 'reverse btn');
assert.ok(box.querySelector('[data-mq="pause"]'), 'pause btn');
assert.ok(box.querySelector('[data-mq="fast"]'), 'fast btn');
box._rzqMqApi.reverse();
assert.strictEqual(state.dir, -1, 'reverse dir');
box._rzqMqApi.speedUp();
assert.ok(state.pxPerSec > 56 || state.boost > 0 || state._kitRawPx > 56, 'speed up');
box._rzqMqApi.togglePause();
assert.ok(state.userPaused, 'user pause');

console.log('test-marquee-kit: OK');
