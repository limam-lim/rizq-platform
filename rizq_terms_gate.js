/**
 * rizq_terms_gate.js — نافذة قبول شروط المنصة قبل إرسال طلب التسجيل
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

  function applyTexts() {
    var ov = document.getElementById('rizq-terms-modal');
    if (!ov) return;
    ov.setAttribute('dir', lang() === 'fr' ? 'ltr' : 'rtl');
    var el;
    el = document.getElementById('rizq-terms-modal-title');
    if (el) el.textContent = t('قبول شروط المنصة', 'Acceptation des conditions');
    el = document.getElementById('rizq-terms-modal-lead');
    if (el) el.textContent = t(
      'قبل إرسال طلب التسجيل، يجب قراءة الشروط والموافقة عليها.',
      'Avant d\'envoyer votre demande d\'inscription, veuillez lire et accepter les conditions.'
    );
    el = document.getElementById('rizq-terms-modal-body');
    if (el) el.innerHTML = t(
      'بتسجيلك على رزق ونشر أي محتوى (نص، صورة، فيديو)، تُقرّ بامتلاكك الحقوق القانونية اللازمة وأنك تلتزم بـ <a href="rizq_legal.html" target="_blank" rel="noopener" style="color:var(--gold)">شروط الاستخدام</a> و<a href="rizq_legal.html#s3" target="_blank" rel="noopener" style="color:var(--gold)">سياسة الخصوصية</a>.',
      'En vous inscrivant sur Rizq et en publiant tout contenu, vous déclarez détenir les droits nécessaires et acceptez les <a href="rizq_legal.html" target="_blank" rel="noopener" style="color:var(--gold)">conditions d\'utilisation</a> et la <a href="rizq_legal.html#s3" target="_blank" rel="noopener" style="color:var(--gold)">politique de confidentialité</a>.'
    );
    el = document.getElementById('rizq-terms-modal-cb-label');
    if (el) el.innerHTML = t(
      'أوافق على شروط منصة رزق وسياسة الخصوصية',
      'J\'accepte les conditions de Rizq et la politique de confidentialité'
    );
    el = document.getElementById('rizq-terms-modal-cancel');
    if (el) el.textContent = t('إلغاء', 'Annuler');
    el = document.getElementById('rizq-terms-modal-ok');
    if (el) el.textContent = t('موافق — إرسال الطلب', 'Accepter — envoyer');
  }

  function ensureModal() {
    if (document.getElementById('rizq-terms-modal')) return;
    var ov = document.createElement('div');
    ov.id = 'rizq-terms-modal';
    ov.className = 'modal-overlay';
    ov.innerHTML =
      '<div class="modal-box" style="max-width:420px;padding:22px 20px 18px" role="dialog" aria-modal="true" aria-labelledby="rizq-terms-modal-title">' +
      '  <h3 id="rizq-terms-modal-title" style="font-family:\'Noto Naskh Arabic\',serif;font-size:18px;font-weight:800;margin:0 0 8px;color:#fff"></h3>' +
      '  <p id="rizq-terms-modal-lead" style="font-size:12.5px;color:rgba(255,255,255,.75);line-height:1.65;margin:0 0 12px"></p>' +
      '  <p id="rizq-terms-modal-body" style="font-size:12px;color:rgba(255,255,255,.82);line-height:1.75;margin:0 0 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px"></p>' +
      '  <label style="display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin-bottom:16px">' +
      '    <input type="checkbox" id="rizq-terms-modal-cb" style="width:17px;height:17px;margin-top:2px;accent-color:var(--gold);flex-shrink:0"/>' +
      '    <span id="rizq-terms-modal-cb-label" style="font-size:12.5px;color:rgba(255,255,255,.9);font-weight:600;line-height:1.6"></span>' +
      '  </label>' +
      '  <div style="display:flex;gap:10px;justify-content:flex-end">' +
      '    <button type="button" id="rizq-terms-modal-cancel" class="m-link-btn" style="margin:0;padding:10px 14px"></button>' +
      '    <button type="button" id="rizq-terms-modal-ok" class="m-btn-main" style="width:auto;min-width:140px;padding:11px 16px;margin:0;opacity:.45" disabled></button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(ov);

    ov.addEventListener('click', function (e) {
      if (e.target === ov) close();
    });
    document.getElementById('rizq-terms-modal-cancel').addEventListener('click', close);
    document.getElementById('rizq-terms-modal-cb').addEventListener('change', function () {
      var btn = document.getElementById('rizq-terms-modal-ok');
      var on = this.checked;
      btn.disabled = !on;
      btn.style.opacity = on ? '1' : '.45';
    });
    document.getElementById('rizq-terms-modal-ok').addEventListener('click', confirm);
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
    document.getElementById('rizq-terms-modal').classList.add('open');
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  }

  function close() {
    var ov = document.getElementById('rizq-terms-modal');
    if (ov) ov.classList.remove('open');
    try { document.body.style.overflow = ''; } catch (e) {}
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
