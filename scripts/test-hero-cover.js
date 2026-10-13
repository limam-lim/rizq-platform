'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'rizq_store_commerce.js'), 'utf8');
const sandbox = {
  window: {},
  URL: URL,
  location: { href: 'https://rizq.mr/rizq_store.html' },
  document: {
    createElement: function (tag) {
      const el = {
        tagName: String(tag).toUpperCase(),
        style: {},
        attributes: {},
        children: [],
        hidden: false,
        classList: {
          _c: new Set(),
          add: function (c) { this._c.add(c); },
          remove: function (c) { this._c.delete(c); },
          contains: function (c) { return this._c.has(c); }
        },
        setAttribute: function (k, v) { this.attributes[k] = v; },
        getAttribute: function (k) { return this.attributes[k] || null; },
        querySelector: function () { return null; },
        appendChild: function (c) { this.children.push(c); this._last = c; return c; },
        insertBefore: function (c) { this.children.unshift(c); this._photo = c; return c; },
        firstChild: null
      };
      Object.defineProperty(el, 'innerHTML', {
        get: function () { return this._html || ''; },
        set: function (v) { this._html = v; }
      });
      return el;
    },
    documentElement: { lang: 'ar' },
    addEventListener: function () {},
    readyState: 'complete',
    getElementById: function () { return null; }
  },
  console
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(src, sandbox);
const C = sandbox.RizqStoreCommerce;
assert(C && typeof C.setHeroPhoto === 'function', 'setHeroPhoto export');
assert(typeof C.wireStorefrontLogo === 'function', 'wireStorefrontLogo export');

const hero = sandbox.document.createElement('div');
hero.querySelector = function (sel) {
  if (sel.indexOf('hero-photo') >= 0 || sel.indexOf('data-hero-photo') >= 0) return this._photo || null;
  return null;
};
hero.classList = {
  _c: new Set(),
  add: function (c) { this._c.add(c); },
  remove: function (c) { this._c.delete(c); },
  contains: function (c) { return this._c.has(c); }
};
hero.insertBefore = function (node) {
  this._photo = node;
  node.querySelector = function (sel) {
    if (sel === 'img') return this._img || null;
    return null;
  };
  node.appendChild = function (img) { this._img = img; this.children = [img]; return img; };
  return node;
};

assert.strictEqual(C.setHeroPhoto(hero, ''), false);
assert(!hero.classList.contains('has-hero-photo'));

assert.strictEqual(C.setHeroPhoto(hero, 'https://images.unsplash.com/photo-test?w=1600'), true);
assert(hero.classList.contains('has-hero-photo'));
assert(hero._photo && hero._photo._img);
assert.strictEqual(hero._photo._img.src, 'https://images.unsplash.com/photo-test?w=1600');

assert.strictEqual(C.setHeroPhoto(hero, 'javascript:alert(1)'), false);
assert(!hero.classList.contains('has-hero-photo'));

const manage = fs.readFileSync(path.join(__dirname, '..', 'rizq-backend/routes/accountsManage.js'), 'utf8');
assert(manage.indexOf("'cover'") >= 0, 'cover in EDITABLE');
const gate = fs.readFileSync(path.join(__dirname, '..', 'rizq-backend/services/contactGate.js'), 'utf8');
assert(gate.indexOf("'cover'") >= 0, 'cover public field');
const dash = fs.readFileSync(path.join(__dirname, '..', 'rizq_dashboard_store.html'), 'utf8');
assert(dash.indexOf('p-cover-zone') >= 0 && dash.indexOf('previewHeroCover') >= 0, 'store dashboard cover UI');
const corp = fs.readFileSync(path.join(__dirname, '..', 'rizq_dashboard_corp.html'), 'utf8');
assert(corp.indexOf('p-cover-zone') >= 0, 'corp dashboard cover UI');

console.log('OK: hero cover field');
