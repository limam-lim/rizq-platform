/**
 * rizq_input_bidi.js — اتجاه تلقائي للنصوص (عربي RTL / لاتيني LTR)
 * الاسم/المدينة/الوصف تتبع لغة الواجهة والمحتوى.
 * البريد والهاتف والأرقام تبقى LTR.
 * كلمة المرور: القيمة LTR، لكن محاذاة الواجهة العربية من اليمين عند الفراغ.
 */
(function (global) {
  'use strict';

  var AR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

  function pageIsRtl() {
    var d = document.documentElement;
    return (d.getAttribute('dir') || d.dir || '').toLowerCase() === 'rtl'
      || (d.lang || '').toLowerCase().indexOf('ar') === 0;
  }

  function isAlwaysLtr(el) {
    var t = (el.getAttribute('type') || '').toLowerCase();
    if (t === 'email' || t === 'tel' || t === 'number' || t === 'url') return true;
    if (el.getAttribute('dir') === 'ltr' && t !== 'password' && t !== 'text') return true;
    var id = (el.id || '').toLowerCase();
    if (/^(.*[-_])?(email|phone|whatsapp|nni|ninea|tel)([-_].*)?$/.test(id)) return true;
    if (/email|phone|whatsapp|tel/.test(id) && t !== 'password') return true;
    return false;
  }

  function isPassword(el) {
    return ((el.getAttribute('type') || '').toLowerCase() === 'password')
      || /(?:^|[-_])(pw|password|passwd|pass)(?:$|[-_])/.test((el.id || '').toLowerCase());
  }

  function applyBidi(el) {
    if (!el || el.nodeName !== 'INPUT' && el.nodeName !== 'TEXTAREA') return;
    if (el.type === 'hidden' || el.type === 'file' || el.type === 'checkbox' || el.type === 'radio') return;
    if (isAlwaysLtr(el)) {
      el.setAttribute('dir', 'ltr');
      el.style.direction = 'ltr';
      el.style.unicodeBidi = 'isolate';
      // أرقام/هاتف تُكتب LTR، لكن placeholder العربي في واجهة RTL يُحاذى من اليمين
      if (pageIsRtl() && !String(el.value || '').trim() && AR_RE.test(String(el.placeholder || ''))) {
        el.style.textAlign = 'right';
      } else {
        el.style.textAlign = 'left';
      }
      return;
    }
    if (isPassword(el)) {
      // القيمة لاتينية، لكن placeholder العربي يُحاذى حسب لغة الصفحة
      el.setAttribute('dir', 'ltr');
      el.style.direction = 'ltr';
      el.style.unicodeBidi = 'isolate';
      el.style.textAlign = pageIsRtl() ? 'right' : 'left';
      return;
    }
    if (pageIsRtl()) {
      el.setAttribute('dir', 'rtl');
      el.style.direction = 'rtl';
      el.style.unicodeBidi = 'isolate';
      el.style.textAlign = 'right';
    } else {
      el.setAttribute('dir', 'ltr');
      el.style.direction = 'ltr';
      el.style.unicodeBidi = 'isolate';
      el.style.textAlign = 'left';
    }
    syncBidi(el);
  }

  function syncBidi(el) {
    if (isAlwaysLtr(el)) {
      if (pageIsRtl() && !String(el.value || '').trim() && AR_RE.test(String(el.placeholder || ''))) {
        el.style.textAlign = 'right';
      } else {
        el.style.textAlign = 'left';
      }
      return;
    }
    if (isPassword(el)) {
      el.style.textAlign = pageIsRtl() ? 'right' : 'left';
      return;
    }
    var v = String(el.value || '').trim();
    if (!v) {
      el.style.textAlign = pageIsRtl() ? 'right' : 'left';
      el.style.direction = pageIsRtl() ? 'rtl' : 'ltr';
      return;
    }
    if (AR_RE.test(v.charAt(0))) {
      el.style.direction = 'rtl';
      el.style.textAlign = 'right';
    } else {
      el.style.direction = 'ltr';
      el.style.textAlign = 'left';
    }
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.m-input, .rag-input, .form-input, input[type="text"], input[type="password"], textarea').forEach(applyBidi);
  }

  function init() {
    scan(document);
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || (t.nodeName !== 'INPUT' && t.nodeName !== 'TEXTAREA')) return;
      if (t.matches('.m-input, .rag-input, .form-input') || t.type === 'text' || t.type === 'password' || t.nodeName === 'TEXTAREA') {
        syncBidi(t);
      }
    }, true);
    document.addEventListener('rizq:langchange', function () { scan(document); });
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
