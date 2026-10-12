/**
 * rizq_input_bidi.js — اتجاه النصوص + أرقام لاتينية + هاتف LTR
 * - الاسم/المدينة/الوصف تتبع لغة الواجهة
 * - البريد/الهاتف/الأرقام: LTR دائماً، وعلامة + من اليسار
 * - تحويل الأرقام العربية-الهندية (٠-٩ / ۰-۹) إلى لاتينية (0-9)
 */
(function (global) {
  'use strict';

  var AR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  var EASTERN_DIGITS_RE = /[\u0660-\u0669\u06F0-\u06F9]/;
  var PHONEISH_RE = /^\s*[\u0660-\u0669\u06F0-\u06F9+0-9][\u0660-\u0669\u06F0-\u06F9+\d\s().\-]{5,}\s*$/;
  var STYLE_ID = 'rizq-numbers-ltr-css';

  function pageIsRtl() {
    var d = document.documentElement;
    return (d.getAttribute('dir') || d.dir || '').toLowerCase() === 'rtl'
      || (d.lang || '').toLowerCase().indexOf('ar') === 0;
  }

  function toWesternDigits(value) {
    return String(value == null ? '' : value)
      .replace(/[\u0660-\u0669]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48); })
      .replace(/[\u06F0-\u06F9]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 48); });
  }

  /** عرض هاتف/رقم بأرقام لاتينية و+ على اليسار (بدون عكس RTL) */
  function formatPhoneDisplay(raw) {
    var s = toWesternDigits(raw).replace(/[\u200E\u200F\u2066-\u2069\u202A-\u202E\u061C]/g, '').trim();
    if (!s) return '';
    // إن وُجد + في النهاية بسبب عكس سابق، انقله للبداية
    if (s.charAt(s.length - 1) === '+' && s.indexOf('+') === s.length - 1) {
      s = '+' + s.slice(0, -1).replace(/^\+/, '');
    }
    return s;
  }

  function applyLtrAttrs(el) {
    if (!el || el.nodeType !== 1) return;
    el.setAttribute('dir', 'ltr');
    el.style.setProperty('direction', 'ltr', 'important');
    el.style.setProperty('unicode-bidi', 'isolate', 'important');
    el.style.setProperty('text-align', 'left', 'important');
    el.classList.add('rizq-phone-ltr');
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
      if (pageIsRtl() && !String(el.value || '').trim() && AR_RE.test(String(el.placeholder || ''))) {
        el.style.textAlign = 'right';
      } else {
        el.style.textAlign = 'left';
      }
      return;
    }
    if (isPassword(el)) {
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
      var v = String(el.value || '');
      if (EASTERN_DIGITS_RE.test(v)) {
        var caret = el.selectionStart;
        var west = toWesternDigits(v);
        if (west !== v) {
          el.value = west;
          try {
            if (typeof caret === 'number') el.setSelectionRange(caret, caret);
          } catch (e) {}
        }
      }
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
    var val = String(el.value || '').trim();
    if (!val) {
      el.style.textAlign = pageIsRtl() ? 'right' : 'left';
      el.style.direction = pageIsRtl() ? 'rtl' : 'ltr';
      return;
    }
    if (AR_RE.test(val.charAt(0))) {
      el.style.direction = 'rtl';
      el.style.textAlign = 'right';
    } else {
      el.style.direction = 'ltr';
      el.style.textAlign = 'left';
    }
  }

  function fixPhoneElement(el) {
    if (!el || el.nodeType !== 1) return;
    applyLtrAttrs(el);
    // لا تلمس عناصر الإدخال هنا — syncBidi يتولى القيمة
    if (el.nodeName === 'INPUT' || el.nodeName === 'TEXTAREA') return;
    var raw = el.textContent;
    if (raw == null) return;
    var next = formatPhoneDisplay(raw);
    if (next && next !== raw) el.textContent = next;
    else if (EASTERN_DIGITS_RE.test(String(raw))) el.textContent = toWesternDigits(raw);
  }

  function scanPhones(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var sels = [
      'a[href^="tel:"]',
      'a[href^="TEL:"]',
      '.phone-num',
      '.phone-display',
      '.contact-phone',
      '.rizq-phone-ltr',
      '.rzq-paych-val',
      '[data-phone]',
      '[data-copy]',
      'code[dir="ltr"]',
      'span[dir="ltr"]',
      '#info-value-phone-el',
      '#contact-info-phone',
      '#dc-phone-num',
      'input[type="tel"]'
    ].join(',');
    try {
      scope.querySelectorAll(sels).forEach(function (el) {
        if (el.matches && el.matches('[data-copy]')) {
          var copy = el.getAttribute('data-copy');
          if (copy) {
            var fixed = formatPhoneDisplay(copy);
            if (fixed) el.setAttribute('data-copy', fixed);
          }
          return;
        }
        fixPhoneElement(el);
      });
    } catch (e) {}

    // عناصر نصية تبدو كأرقام هاتف داخل بطاقات الدفع/التواصل
    try {
      scope.querySelectorAll('code, .info-value, .rzq-contact-masked').forEach(function (el) {
        if (el.childElementCount > 0) return;
        var t = String(el.textContent || '').trim();
        if (!PHONEISH_RE.test(t) && t.indexOf('+') < 0) return;
        if (/[A-Za-z\u0600-\u06FF]{3,}/.test(t) && t.indexOf('+') < 0) return;
        fixPhoneElement(el);
      });
    } catch (e2) {}
  }

  function injectCss() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      'a[href^="tel:"],a[href^="TEL:"],',
      '.phone-num,.phone-display,.contact-phone,.rizq-phone-ltr,',
      '.rzq-paych-val,[data-phone],',
      'input[type="tel"],input[type="number"],',
      'code[dir="ltr"],span[dir="ltr"].rizq-phone-ltr{',
      '  direction:ltr!important;',
      '  unicode-bidi:isolate!important;',
      '  text-align:left!important;',
      '}',
      /* منع الأرقام العربية عبر الخطوط إن أمكن — العرض اللاتيني عبر JS */
      'input[type="tel"],input[type="number"],.rizq-phone-ltr,.rzq-paych-val{',
      '  font-variant-numeric:lining-nums tabular-nums;',
      '}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.m-input, .rag-input, .form-input, .req-input, input[type="text"], input[type="password"], input[type="tel"], input[type="email"], input[type="number"], textarea').forEach(applyBidi);
    scanPhones(scope);
  }

  function init() {
    injectCss();
    scan(document);
    document.addEventListener('input', function (e) {
      var t = e.target;
      if (!t || (t.nodeName !== 'INPUT' && t.nodeName !== 'TEXTAREA')) return;
      if (t.matches('.m-input, .rag-input, .form-input, .req-input') || t.type === 'text' || t.type === 'password' || t.type === 'tel' || t.type === 'email' || t.type === 'number' || t.nodeName === 'TEXTAREA') {
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
          if (m.type === 'characterData' && m.target && m.target.parentElement) {
            fixPhoneElement(m.target.parentElement);
          }
        });
      }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
  }

  global.RizqInputBidi = {
    apply: applyBidi,
    scan: scan,
    scanPhones: scanPhones,
    toWesternDigits: toWesternDigits,
    formatPhoneDisplay: formatPhoneDisplay,
    applyLtrAttrs: applyLtrAttrs
  };
  // اسم مختصر للاستخدام من صفحات الدفع/التواصل
  global.RizqNumbers = {
    toWestern: toWesternDigits,
    formatPhone: formatPhoneDisplay,
    ltr: applyLtrAttrs
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
