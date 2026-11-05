#!/usr/bin/env node
/**
 * بوابة البند 3: إعلانات الأزياء التجريبية —
 * صور ملحفة/دراعة فقط من demo-fashion؛ ساعة/حذاء/إكسسوار بلا صور ملحفة.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '../..');
const src = fs.readFileSync(path.join(ROOT, 'rizq_ad_cards.js'), 'utf8');

const sandbox = {
  window: {},
  document: {
    documentElement: {},
    readyState: 'complete',
    addEventListener: function () {},
    querySelectorAll: function () { return []; },
  },
  MutationObserver: function () {
    this.observe = function () {};
  },
  console: console,
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

const api = sandbox.RizqAdCards || sandbox.window.RizqAdCards;
if (!api || typeof api.seedDemoGalleries !== 'function') {
  console.error('RizqAdCards.seedDemoGalleries missing');
  process.exit(2);
}

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra || ''); }
}

const ads = [
  { id: 212, catKey: 'أزياء', cat: '👗 أزياء — إكسسوارات', subcat: 'ملابس رجالية', gender: 'men', title: 'ساعة رجالية كلاسيكية — ستيل', emoji: '⌚' },
  { id: 216, catKey: 'أزياء', cat: '👗 أزياء — ملحفة نسائية', subcat: 'ملحفة نسائية', gender: 'women', title: 'ملحفة حريرية فاخرة — زمرد وذهب', emoji: '🧕' },
  { id: 211, catKey: 'أزياء', cat: '👗 أزياء — دراعة رجالية', subcat: 'دراعة رجالية', gender: 'men', title: 'دراعة رجالية فاخرة', emoji: '🥻' },
  { id: 9991, catKey: 'أزياء', cat: 'أزياء', title: 'حذاء رياضي رجالي', emoji: '👟' },
  { id: 9992, catKey: 'أزياء', cat: 'أزياء', title: 'إكسسوار ساعة نسائية', emoji: '💍' },
];

api.seedDemoGalleries(ads);

const watch = ads.find((a) => a.id === 212);
ok('ساعة رجالية بلا صور ملحفة/دراعة',
  Array.isArray(watch.images) && watch.images.length === 0,
  JSON.stringify(watch.images));

const melhafa = ads.find((a) => a.id === 216);
ok('ملحفة لها صور demo-fashion/melhafa',
  Array.isArray(melhafa.images) && melhafa.images.length > 0
    && melhafa.images.every((u) => /demo-fashion\/demo-melhafa/i.test(String(u))),
  JSON.stringify(melhafa.images));

const daraa = ads.find((a) => a.id === 211);
ok('دراعة لها صور demo-fashion/daraa',
  Array.isArray(daraa.images) && daraa.images.length > 0
    && daraa.images.every((u) => /demo-fashion\/demo-daraa/i.test(String(u))),
  JSON.stringify(daraa.images));

const shoe = ads.find((a) => a.id === 9991);
ok('حذاء بلا صور أزياء نسائية',
  Array.isArray(shoe.images) && shoe.images.length === 0
    && !(shoe.images || []).some((u) => /melhafa|daraa/i.test(String(u))),
  JSON.stringify(shoe.images));

ok('imgBroken exported', typeof api.imgBroken === 'function');

const html = api.mediaHtml(
  { id: 212, title: 'ساعة رجالية كلاسيكية — ستيل', emoji: '⌚', bg: 'linear-gradient(135deg,#162235,#1B3A6B)', images: [] },
  { fr: false }
);
ok('ساعة → شريحة إيموجي بدون <img>',
  /rzq-adx-emoji/.test(html) && !/<img\b/.test(html));

const htmlImg = api.mediaHtml(
  { id: 216, title: 'ملحفة', emoji: '🧕', bg: '#0f1f3d', images: ['rizq-assets/demo-fashion/demo-melhafa-street-dark.jpg'] },
  { fr: false }
);
ok('صورة حقيقية تحمل onerror→imgBroken',
  /onerror=/.test(htmlImg) && /RizqAdCards\.imgBroken/.test(htmlImg));

console.log('\ndemo-fashion-images: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
