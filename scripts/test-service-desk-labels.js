'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'rizq_service_desk.js'), 'utf8');
const sandbox = { window: {}, document: { documentElement: { lang: 'ar' }, readyState: 'complete', addEventListener: function(){} }, setTimeout: function(fn){ try{fn();}catch(e){} }, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(src, sandbox);
const D = sandbox.RizqServiceDesk;
assert(D, 'RizqServiceDesk');
assert.strictEqual(D.normalizeAccountType('shop'), 'store');
assert.strictEqual(D.normalizeAccountType('showroom'), 'corp');
assert.strictEqual(D.entityLabels('store').nounAr, 'المحل');
assert.strictEqual(D.entityLabels('corp').nounAr, 'المعرض');
assert.strictEqual(D.entityLabels('office').nounAr, 'المكتب');
assert(D.defaultFormHint('store').indexOf('المحل') >= 0);
assert(D.defaultFormHint('store').indexOf('المكتب') < 0);
assert(D.defaultFormHint('office').indexOf('المكتب') >= 0);
assert(D.defaultFormHint('corp').indexOf('المعرض') >= 0);

// DOM apply
function makeRoot(){
  const hint = { textContent: '' };
  const title = { textContent: '' };
  const btn = { textContent: '📤 إرسال الطلب للمحل', getAttribute: () => null };
  const msg = { textContent: '', getAttribute: () => null };
  return {
    querySelector: function(sel){
      if (sel.indexOf('title') >= 0 || sel === '#req-title') return title;
      if (sel.indexOf('hint') >= 0 || sel === '#req-sub') return hint;
      if (sel.indexOf('submit') >= 0 || sel.indexOf('req-submit') >= 0) return btn;
      if (sel.indexOf('msg-label') >= 0 || sel.indexOf('rf-msg') >= 0) return msg;
      return null;
    },
    setAttribute: function(){},
    _title: title, _hint: hint, _btn: btn, _msg: msg
  };
}
const root = makeRoot();
D.applyPublicLabels(root, {}, { accountName: 'أناقة موريتانيا', accountType: 'store' });
assert(root._hint.textContent.indexOf('المحل') >= 0, 'store hint uses محل');
assert(root._hint.textContent.indexOf('المكتب') < 0, 'store hint must not say مكتب');
assert(root._title.textContent.indexOf('أناقة موريتانيا') >= 0);

const rootOff = makeRoot();
D.applyPublicLabels(rootOff, { formHint: 'أدخل بياناتك وسنتواصل معك. الوثائق تُرسل عبر واتساب أو إيميل المحل مباشرة.' }, { accountName: 'مكتب النخبة', accountType: 'office' });
assert(rootOff._hint.textContent.indexOf('المكتب') >= 0, 'coerce wrong store hint on office');
assert(rootOff._hint.textContent.indexOf('المحل') < 0);

const storeHtml = fs.readFileSync(path.join(__dirname, '..', 'rizq_store.html'), 'utf8');
assert(storeHtml.includes("accountType: 'store'"));
const showHtml = fs.readFileSync(path.join(__dirname, '..', 'rizq_showroom.html'), 'utf8');
assert(showHtml.includes("accountType: 'corp'"));
console.log('OK: service desk entity labels');
