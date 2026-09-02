/**
 * rizq_input_bidi.js — اتجاه تلقائي للنصوص (عربي RTL / لاتيني LTR)
 * يُطبَّق على حقول النماذج: الاسم والمدينة والوصف تتبع لغة المحتوى،
 * بينما البريد والهاتف وكلمة المرور والأرقام تبقى LTR دائماً.
 */
(function (global) {
  'use strict';

  var AR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

  function isAlwaysLtr(el) {
    var t = (el.getAttribute('type') || '').toLowerCase();
    if (t === 'email' || t === 'tel' || t === 'password' || t === 'number' || t === 'url') return true;
    if (el.getAttribute('dir') === 'ltr') return true;
    var id = (el.id || '').toLowerCase();
    if (/email|phone|whatsapp|nni|ninea|pw|password|tel/.test(id)) return true;
    return false;
  }

  function applyBidi(el) {
    if (!el || el.nodeName !== 'INPUT' && el.nodeName !== 'TEXTAREA') return;
    if (el.type === 'hidden' || el.type === 'file' || el.type === 'checkbox' || el.type === 'radio') return;
    if (isAlwaysLtr(el)) {
      el.setAttribute('dir', 'ltr');
      el.style.direction = 'ltr';
      el.style.textAlign = 'left';
      el.style.unicodeBidi = 'isolate';
      return;
    }
    el.setAttribute('dir', 'auto');
    el.style.unicodeBidi = 'plaintext';
    el.style.textAlign = 'start';
    syncBidi(el);
  }

  function syncBidi(el) {
    if (isAlwaysLtr(el)) return;
    var v = String(el.value || '').trim();
    if (!v) {
      el.style.textAlign = 'start';
      return;
    }
    el.style.textAlign = AR_RE.test(v.charAt(0)) ? 'right' : 'left';
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.m-input, .rag-input, .form-input, input[type="text"], textarea').forEach(applyBidi);
  }

  function init() {
    scan(document);
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || (t.nodeName !== 'INPUT' && t.nodeName !== 'TEXTAREA')) return;
      if (t.matches('.m-input, .rag-input, .form-input') || t.type === 'text' || t.nodeName === 'TEXTAREA') {
        syncBidi(t);
      }
    }, true);
    try {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) {
            if (n.nodeType === 1) scan(n);
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  global.RizqInputBidi = { apply: applyBidi, scan: scan };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
