/**
 * rizq_mr_payment_catalog.js — كتالوج البنوك والمحافظ الموريتانية
 * مرجع موحّد لاختيار وسيلة الدفع في داشبوردات المشتركين وسوبر أدمن.
 *
 * الاستخدام:
 *   RizqMrPaymentCatalog.enhanceField('#mypay-bank')
 *   RizqMrPaymentCatalog.enhanceField('#bank-name-input')
 *   RizqMrPaymentCatalog.renderReference('#mr-pay-catalog-ref')
 */
(function (global) {
  'use strict';

  /** قائمة مرجعية من تطبيقات التحويل/المحافظ الشائعة في موريتانيا */
  var PROVIDERS = [
    { id: 'amanty_bea', name: 'Amanty BEA', category: 'wallet', typeHint: 'mobile' },
    { id: 'attijari_epay', name: 'Attijari ePAY', category: 'wallet', typeHint: 'mobile' },
    { id: 'bamis_digital', name: 'BAMIS DIGITAL', category: 'wallet', typeHint: 'mobile' },
    { id: 'bankily', name: 'Bankily', category: 'wallet', typeHint: 'bankily' },
    { id: 'barid_cash', name: 'Barid Cash', category: 'wallet', typeHint: 'mobile' },
    { id: 'bci_pay', name: 'BCI PAY', category: 'wallet', typeHint: 'mobile' },
    { id: 'bfi_cash', name: 'BFI CASH', category: 'wallet', typeHint: 'mobile' },
    { id: 'bimbank', name: 'BIMBANK', category: 'wallet', typeHint: 'bimbam' },
    { id: 'cdd', name: 'CDD', category: 'wallet', typeHint: 'mobile' },
    { id: 'chinguitty_mobile', name: 'Chinguitty Mobile', category: 'wallet', typeHint: 'mobile' },
    { id: 'click', name: 'CLICK', category: 'wallet', typeHint: 'mobile' },
    { id: 'ehsabi', name: 'EHSABI', category: 'wallet', typeHint: 'mobile' },
    { id: 'gazapay', name: 'GazaPay', category: 'wallet', typeHint: 'mobile' },
    { id: 'masrivi', name: 'Masrivi', category: 'wallet', typeHint: 'mobile' },
    { id: 'mechili', name: 'Mechili', category: 'wallet', typeHint: 'mobile' },
    { id: 'moov_money', name: 'Moov Money', category: 'wallet', typeHint: 'mobile' },
    { id: 'rassidy', name: 'RASSIDY', category: 'wallet', typeHint: 'mobile' },
    { id: 'sedad', name: 'Sedad', category: 'wallet', typeHint: 'sedad' }
  ];

  var CUSTOM_VALUE = '__custom__';

  function list() {
    return PROVIDERS.slice();
  }

  function findByName(name) {
    var n = String(name || '').trim().toLowerCase();
    if (!n) return null;
    for (var i = 0; i < PROVIDERS.length; i++) {
      if (PROVIDERS[i].name.toLowerCase() === n) return PROVIDERS[i];
    }
    /* تطابق مرن: masrvi / masrivi ، barid cash / BARID CASH */
    for (var j = 0; j < PROVIDERS.length; j++) {
      var p = PROVIDERS[j];
      if (n.replace(/\s+/g, '') === p.name.toLowerCase().replace(/\s+/g, '')) return p;
    }
    return null;
  }

  function optionsHtml(selectedName, fr) {
    var sel = String(selectedName || '').trim();
    var known = !!findByName(sel);
    var html = '<option value="">' + (fr ? '— Choisir banque / portefeuille —' : '— اختر البنك / المحفظة —') + '</option>';
    html += '<optgroup label="' + (fr ? 'Portefeuilles & apps MR' : 'محافظ وتطبيقات موريتانية') + '">';
    PROVIDERS.forEach(function (p) {
      var s = (!known && !sel) ? false : (p.name.toLowerCase() === sel.toLowerCase());
      html += '<option value="' + escAttr(p.name) + '"' + (s ? ' selected' : '') + '>' + escHtml(p.name) + '</option>';
    });
    html += '</optgroup>';
    html += '<optgroup label="' + (fr ? 'Autre' : 'أخرى') + '">';
    html += '<option value="' + CUSTOM_VALUE + '"' + (sel && !known ? ' selected' : '') + '>'
      + (fr ? '✏️ Nom personnalisé…' : '✏️ اسم مخصص…') + '</option>';
    html += '</optgroup>';
    return html;
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    return escHtml(s).replace(/'/g, '&#39;');
  }

  function isFr() {
    try {
      if (global.RizqI18n && typeof RizqI18n.getLang === 'function') {
        return RizqI18n.getLang() === 'fr';
      }
    } catch (e) { /* ignore */ }
    return (document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0;
  }

  /**
   * يحوّل حقل نص اسم البنك إلى قائمة كتالوج + حقل مخصص عند الحاجة.
   * لا يغيّر id الحقل الأصلي — دوال الحفظ تقرأ نفس القيمة.
   */
  function enhanceField(inputOrSelector, opts) {
    opts = opts || {};
    var input = typeof inputOrSelector === 'string'
      ? document.querySelector(inputOrSelector)
      : inputOrSelector;
    if (!input || input.getAttribute('data-rzq-mr-cat') === '1') return input;
    input.setAttribute('data-rzq-mr-cat', '1');

    var wrap = document.createElement('div');
    wrap.className = 'rzq-mr-pay-cat';
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px';

    var select = document.createElement('select');
    select.className = 'rzq-mr-pay-cat-select';
    select.style.cssText = input.style.cssText || 'width:100%;padding:10px 12px;border:1.5px solid #e2e8f5;border-radius:9px;font-size:13px;color:#1B3A6B;background:#f8faff;box-sizing:border-box;font-family:inherit';
    select.innerHTML = optionsHtml(input.value, isFr());

    var parent = input.parentNode;
    parent.insertBefore(wrap, input);
    wrap.appendChild(select);
    wrap.appendChild(input);

    function syncUi() {
      var known = findByName(input.value);
      if (known) {
        select.value = known.name;
        input.style.display = 'none';
        input.removeAttribute('required');
      } else if (String(input.value || '').trim()) {
        select.value = CUSTOM_VALUE;
        input.style.display = '';
        input.placeholder = opts.customPlaceholder
          || (isFr() ? 'Nom de la banque / du service' : 'اسم البنك / الخدمة');
      } else {
        select.value = '';
        input.style.display = 'none';
      }
    }

    select.addEventListener('change', function () {
      var v = select.value;
      if (!v) {
        input.value = '';
        input.style.display = 'none';
        return;
      }
      if (v === CUSTOM_VALUE) {
        input.style.display = '';
        if (findByName(input.value)) input.value = '';
        input.focus();
        return;
      }
      input.value = v;
      input.style.display = 'none';
      /* اقتراح نوع الدفع إن وُجد typeSelect */
      var typeSel = opts.typeSelectId
        ? document.getElementById(opts.typeSelectId)
        : (opts.typeSelect || null);
      var hit = findByName(v);
      if (typeSel && hit && hit.typeHint) {
        var cur = typeSel.value;
        if (cur === 'mobile' || cur === 'bankily' || cur === 'sedad' || cur === 'bimbam' || cur === 'bank' || !cur) {
          if (['bankily', 'sedad', 'bimbam', 'mobile'].indexOf(hit.typeHint) >= 0) {
            typeSel.value = hit.typeHint;
            if (typeof typeSel.onchange === 'function') typeSel.onchange();
            else typeSel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });

    syncUi();
    /* عند تعبئة الحقل برمجياً (تعديل طريقة دفع) */
    var obs = new MutationObserver(function () { /* noop placeholder */ });
    try { obs.disconnect(); } catch (e2) { /* ignore */ }
    var _last = input.value;
    setInterval(function () {
      if (input.value !== _last) {
        _last = input.value;
        syncUi();
      }
    }, 400);

    return input;
  }

  function enhanceAll(selectors, opts) {
    (selectors || []).forEach(function (sel) {
      try { enhanceField(sel, opts); } catch (e) { /* ignore */ }
    });
  }

  function renderReference(hostOrSelector) {
    var host = typeof hostOrSelector === 'string'
      ? document.querySelector(hostOrSelector)
      : hostOrSelector;
    if (!host) return;
    var fr = isFr();
    host.innerHTML =
      '<div style="font-size:12px;font-weight:800;color:#1B3A6B;margin-bottom:8px">'
      + (fr ? '📚 Catalogue MR — banques & portefeuilles' : '📚 كتالوج موريتانيا — بنوك ومحافظ')
      + '</div>'
      + '<p style="font-size:11.5px;color:#6a7a8a;margin:0 0 10px;line-height:1.55">'
      + (fr
        ? 'Référence pour choisir le moyen de paiement (abonnés + admin).'
        : 'مرجع لاختيار وسيلة الدفع (المشتركون + سوبر أدمن).')
      + '</p>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px">'
      + PROVIDERS.map(function (p) {
        return '<span style="display:inline-block;padding:5px 10px;border-radius:999px;background:#f0f4ff;border:1px solid #d8e2f0;font-size:11.5px;font-weight:700;color:#1B3A6B">'
          + escHtml(p.name) + '</span>';
      }).join('')
      + '</div>';
  }

  function boot() {
    enhanceAll(['#mypay-bank'], { typeSelectId: 'mypay-type' });
    enhanceAll(['#bank-name-input'], {});
    renderReference('#mr-pay-catalog-ref');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 0);
  }

  global.RizqMrPaymentCatalog = {
    PROVIDERS: PROVIDERS,
    CUSTOM_VALUE: CUSTOM_VALUE,
    list: list,
    findByName: findByName,
    optionsHtml: optionsHtml,
    enhanceField: enhanceField,
    enhanceAll: enhanceAll,
    renderReference: renderReference,
    boot: boot
  };
})(typeof window !== 'undefined' ? window : globalThis);
