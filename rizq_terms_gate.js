/**
 * rizq_terms_gate.js — نافذة قبول شروط المنصة قبل إرسال طلب التسجيل
 * نص داكن صريح على خلفية بيضاء (يتجاوز .modal-box { color:#fff }).
 */
(function (global) {
  'use strict';

  var _pending = null;
  var _sessionAccepted = false;

  function lang() {
    try {
      if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') {
        return global.RizqI18n.getLang() === 'fr' ? 'fr' : 'ar';
      }
      if (typeof global.isAr !== 'undefined') return global.isAr ? 'ar' : 'fr';
      return localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t(ar, fr) {
    return lang() === 'fr' ? fr : ar;
  }

  function injectCss() {
    var st = document.getElementById('rizq-terms-gate-css');
    if (!st) {
      st = document.createElement('style');
      st.id = 'rizq-terms-gate-css';
      document.head.appendChild(st);
    }
    st.textContent = [
      '#rizq-terms-modal.rizq-terms-overlay{display:none;align-items:center;justify-content:center;padding:18px;background:rgba(15,35,65,.55)!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:1000010!important}',
      '#rizq-terms-modal.rizq-terms-overlay.open{display:flex!important}',
      '#rizq-terms-modal .rizq-terms-box,',
      '#rizq-terms-modal .modal-box.rizq-terms-box{background:#ffffff!important;color:#0f172a!important;border:1px solid #e2e8f0!important;border-radius:18px!important;box-shadow:0 22px 55px rgba(15,35,65,.22)!important;max-width:440px;width:100%;padding:24px 20px 18px!important;box-sizing:border-box;margin:0 auto}',
      '#rizq-terms-modal .rizq-terms-box h3,',
      '#rizq-terms-modal .modal-box.rizq-terms-box h3,',
      '#rizq-terms-modal #rizq-terms-modal-title{color:#0f172a!important;font-size:19px!important;font-weight:800!important;margin:0 0 8px!important;line-height:1.35!important;opacity:1!important}',
      '#rizq-terms-modal .rizq-terms-box p,',
      '#rizq-terms-modal .modal-box.rizq-terms-box p,',
      '#rizq-terms-modal #rizq-terms-modal-lead,',
      '#rizq-terms-modal #rizq-terms-modal-body{color:#0f172a!important;opacity:1!important}',
      '#rizq-terms-modal #rizq-terms-modal-lead{display:block!important;font-size:14px!important;color:#1e293b!important;line-height:1.7!important;margin:0 0 12px!important;font-weight:700!important}',
      '#rizq-terms-modal #rizq-terms-modal-body-label{display:block!important;font-size:13px!important;color:#0f172a!important;font-weight:800!important;margin:0 0 6px!important}',
      '#rizq-terms-modal #rizq-terms-modal-body{display:block!important;font-size:14px!important;color:#0f172a!important;line-height:1.85!important;margin:0 0 16px!important;background:#f1f5f9!important;border:1px solid #94a3b8!important;border-radius:12px!important;padding:14px!important}',
      '#rizq-terms-modal #rizq-terms-modal-body a{color:#92400e!important;font-weight:800!important;text-decoration:underline!important}',
      '#rizq-terms-modal #rizq-terms-modal-body strong{color:#0f172a!important;font-weight:800!important}',
      '#rizq-terms-modal #rizq-terms-modal-cb-label{color:#0f172a!important;font-size:14px!important;font-weight:700!important;line-height:1.65!important;opacity:1!important}',
      '#rizq-terms-modal #rizq-terms-modal-cancel{color:#334155!important;font-weight:700!important;text-decoration:underline!important}',
      '#rizq-terms-modal #rizq-terms-modal-ok{color:#0f2347!important}'
    ].join('');
  }

  function paintDark(el) {
    if (!el) return;
    try {
      el.style.setProperty('color', '#0f172a', 'important');
      el.style.setProperty('opacity', '1', 'important');
    } catch (e) {}
  }

  function applyTexts() {
    var ov = document.getElementById('rizq-terms-modal');
    if (!ov) return;
    ov.setAttribute('dir', lang() === 'fr' ? 'ltr' : 'rtl');
    var el;
    el = document.getElementById('rizq-terms-modal-title');
    if (el) {
      el.textContent = t('قبول شروط المنصة', 'Acceptation des conditions');
      paintDark(el);
    }
    el = document.getElementById('rizq-terms-modal-lead');
    if (el) {
      el.textContent = t(
        'قبل إرسال طلب التسجيل، اقرأ نص الموافقة أدناه ثم وافق على الشروط.',
        'Avant d\'envoyer la demande, lisez le texte d\'accord ci-dessous puis acceptez.'
      );
      try {
        el.style.setProperty('color', '#1e293b', 'important');
        el.style.setProperty('opacity', '1', 'important');
      } catch (e2) {}
    }
    el = document.getElementById('rizq-terms-modal-body-label');
    if (el) {
      el.textContent = t('نص الموافقة', 'Texte d\'accord');
      paintDark(el);
    }
    el = document.getElementById('rizq-terms-modal-body');
    if (el) {
      el.innerHTML = t(
        'بتسجيلك على رزق ونشر أي محتوى (نص، صورة، فيديو)، تُقرّ بامتلاكك الحقوق القانونية اللازمة وأنك تلتزم بـ <a href="rizq_legal.html" target="_blank" rel="noopener">شروط الاستخدام</a> و<a href="rizq_legal.html#s3" target="_blank" rel="noopener">سياسة الخصوصية</a>.',
        'En vous inscrivant sur Rizq et en publiant tout contenu, vous déclarez détenir les droits nécessaires et acceptez les <a href="rizq_legal.html" target="_blank" rel="noopener">conditions d\'utilisation</a> et la <a href="rizq_legal.html#s3" target="_blank" rel="noopener">politique de confidentialité</a>.'
      );
      paintDark(el);
    }
    el = document.getElementById('rizq-terms-modal-cb-label');
    if (el) {
      el.textContent = t(
        'أوافق على شروط منصة رزق وسياسة الخصوصية',
        'J\'accepte les conditions de Rizq et la politique de confidentialité'
      );
      paintDark(el);
    }
    el = document.getElementById('rizq-terms-modal-cancel');
    if (el) {
      el.textContent = t('إلغاء', 'Annuler');
      try { el.style.setProperty('color', '#334155', 'important'); } catch (e3) {}
    }
    el = document.getElementById('rizq-terms-modal-ok');
    if (el) el.textContent = t('موافق — إرسال الطلب', 'Accepter — envoyer');
  }

  function buildInnerHtml() {
    return (
      '<div class="rizq-terms-box" role="dialog" aria-modal="true" aria-labelledby="rizq-terms-modal-title">' +
      '  <h3 id="rizq-terms-modal-title" style="color:#0f172a!important;font-size:19px!important;font-weight:800!important;margin:0 0 8px!important;line-height:1.35!important;opacity:1!important"></h3>' +
      '  <p id="rizq-terms-modal-lead" style="color:#1e293b!important;font-size:14px!important;font-weight:700!important;line-height:1.7!important;margin:0 0 12px!important;opacity:1!important"></p>' +
      '  <div id="rizq-terms-modal-body-label" style="color:#0f172a!important;font-size:13px!important;font-weight:800!important;margin:0 0 6px!important"></div>' +
      '  <div id="rizq-terms-modal-body" style="color:#0f172a!important;font-size:14px!important;line-height:1.85!important;margin:0 0 16px!important;background:#f1f5f9!important;border:1px solid #94a3b8!important;border-radius:12px!important;padding:14px!important;opacity:1!important"></div>' +
      '  <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin-bottom:18px">' +
      '    <input type="checkbox" id="rizq-terms-modal-cb" style="width:18px;height:18px;margin-top:2px;accent-color:#c9a84c;flex-shrink:0"/>' +
      '    <span id="rizq-terms-modal-cb-label" style="color:#0f172a!important;font-size:14px!important;font-weight:700!important;line-height:1.65!important"></span>' +
      '  </label>' +
      '  <div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;flex-wrap:wrap">' +
      '    <button type="button" id="rizq-terms-modal-cancel" style="margin:0;padding:10px 14px;background:none;border:none;color:#334155!important;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:underline"></button>' +
      '    <button type="button" id="rizq-terms-modal-ok" class="m-btn-main" style="width:auto;min-width:150px;padding:12px 18px;margin:0;opacity:.45;color:#0f2347!important" disabled></button>' +
      '  </div>' +
      '</div>'
    );
  }

  function bindModal(ov) {
    ov.addEventListener('click', function (e) {
      if (e.target === ov) close();
    });
    var cancel = document.getElementById('rizq-terms-modal-cancel');
    var cb = document.getElementById('rizq-terms-modal-cb');
    var ok = document.getElementById('rizq-terms-modal-ok');
    if (cancel) cancel.onclick = close;
    if (cb) {
      cb.onchange = function () {
        var btn = document.getElementById('rizq-terms-modal-ok');
        var on = this.checked;
        if (!btn) return;
        btn.disabled = !on;
        btn.style.opacity = on ? '1' : '.45';
      };
    }
    if (ok) ok.onclick = confirm;
  }

  function ensureModal() {
    injectCss();
    var ov = document.getElementById('rizq-terms-modal');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'rizq-terms-modal';
      ov.className = 'modal-overlay rizq-terms-overlay';
      ov.style.cssText = 'z-index:1000010!important;';
      ov.innerHTML = buildInnerHtml();
      document.body.appendChild(ov);
      bindModal(ov);
    } else {
      /* ترقية أي نسخة قديمة كانت تستخدم .modal-box (نص أبيض على أبيض) */
      ov.className = 'modal-overlay rizq-terms-overlay';
      if (!ov.querySelector('.rizq-terms-box') || ov.querySelector('.modal-box') || !document.getElementById('rizq-terms-modal-body-label')) {
        ov.innerHTML = buildInnerHtml();
        bindModal(ov);
      }
    }
    applyTexts();
  }

  function open(next) {
    if (typeof next !== 'function') return;
    if (_sessionAccepted) {
      next();
      return;
    }
    ensureModal();
    applyTexts();
    _pending = next;
    var cb = document.getElementById('rizq-terms-modal-cb');
    var btn = document.getElementById('rizq-terms-modal-ok');
    if (cb) cb.checked = false;
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '.45';
    }
    var ov = document.getElementById('rizq-terms-modal');
    ov.classList.add('open');
    ov.style.display = 'flex';
    ov.style.zIndex = '1000010';
    ov.style.pointerEvents = 'auto';
    try {
      document.body.style.overflow = 'hidden';
    } catch (e) {}
  }

  function close() {
    var ov = document.getElementById('rizq-terms-modal');
    if (ov) {
      ov.classList.remove('open');
      ov.style.display = 'none';
    }
    try {
      var regOpen = document.getElementById('modal') && document.getElementById('modal').classList.contains('open');
      var ragOpen = document.getElementById('rag-overlay') && document.getElementById('rag-overlay').classList.contains('open');
      if (!regOpen && !ragOpen) document.body.style.overflow = '';
    } catch (e) {}
    _pending = null;
  }

  function confirm() {
    var cb = document.getElementById('rizq-terms-modal-cb');
    if (!cb || !cb.checked) return;
    _sessionAccepted = true;
    var fn = _pending;
    close();
    if (typeof fn === 'function') fn();
  }

  function resetSession() {
    _sessionAccepted = false;
  }

  global.RizqTermsGate = {
    require: open,
    close: close,
    resetSession: resetSession
  };
})(window);
