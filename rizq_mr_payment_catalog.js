/**
 * rizq_mr_payment_catalog.js — كتالوج البنوك والمحافظ الموريتانية
 * مرجع موحّد لاختيار وسيلة الدفع في داشبوردات المشتركين وسوبر أدمن.
 * كل اسم مرتبط بشعاره المعروف (أيقونة التطبيق / الموقع) للتعرّف السريع.
 *
 * الاستخدام:
 *   RizqMrPaymentCatalog.enhanceField('#mypay-bank')
 *   RizqMrPaymentCatalog.enhanceField('#bank-name-input')
 *   RizqMrPaymentCatalog.renderReference('#mr-pay-catalog-ref')
 */
(function (global) {
  'use strict';

  var LOGO_BASE = '/rizq-assets/pay-logos/';

  /** قائمة مرجعية من تطبيقات التحويل/المحافظ الشائعة في موريتانيا */
  var PROVIDERS = [
    { id: 'amanty_bea', name: 'Amanty BEA', category: 'wallet', typeHint: 'mobile', logo: 'amanty_bea.png' },
    { id: 'attijari_epay', name: 'Attijari ePAY', category: 'wallet', typeHint: 'mobile', logo: 'attijari_epay.png' },
    { id: 'bamis_digital', name: 'BAMIS DIGITAL', category: 'wallet', typeHint: 'mobile', logo: 'bamis_digital.png' },
    { id: 'bankily', name: 'Bankily', category: 'wallet', typeHint: 'bankily', logo: 'bankily.png' },
    { id: 'barid_cash', name: 'Barid Cash', category: 'wallet', typeHint: 'mobile', logo: 'barid_cash.png' },
    { id: 'bci_pay', name: 'BCI PAY', category: 'wallet', typeHint: 'mobile', logo: 'bci_pay.png' },
    { id: 'bfi_cash', name: 'BFI CASH', category: 'wallet', typeHint: 'mobile', logo: 'bfi_cash.png' },
    { id: 'bimbank', name: 'BIMBANK', category: 'wallet', typeHint: 'bimbam', logo: 'bimbank.png' },
    { id: 'cdd', name: 'CDD', category: 'wallet', typeHint: 'mobile', logo: 'cdd.png' },
    { id: 'chinguitty_mobile', name: 'Chinguitty Mobile', category: 'wallet', typeHint: 'mobile', logo: 'chinguitty_mobile.png' },
    { id: 'click', name: 'CLICK', category: 'wallet', typeHint: 'mobile', logo: 'click.png' },
    { id: 'ehsabi', name: 'EHSABI', category: 'wallet', typeHint: 'mobile', logo: 'ehsabi.png' },
    { id: 'gazapay', name: 'GazaPay', category: 'wallet', typeHint: 'mobile', logo: 'gazapay.png' },
    { id: 'masrivi', name: 'Masrivi', category: 'wallet', typeHint: 'mobile', logo: 'masrivi.png' },
    { id: 'mechili', name: 'Mechili', category: 'wallet', typeHint: 'mobile', logo: 'mechili.png' },
    { id: 'moov_money', name: 'Moov Money', category: 'wallet', typeHint: 'mobile', logo: 'moov_money.png' },
    { id: 'rassidy', name: 'RASSIDY', category: 'wallet', typeHint: 'mobile', logo: 'rassidy.png' },
    { id: 'sedad', name: 'Sedad', category: 'wallet', typeHint: 'sedad', logo: 'sedad.png' }
  ];

  var CUSTOM_VALUE = '__custom__';

  function logoUrl(providerOrLogo) {
    if (!providerOrLogo) return '';
    if (typeof providerOrLogo === 'string') {
      if (/^https?:\/\//i.test(providerOrLogo) || providerOrLogo.charAt(0) === '/') {
        return providerOrLogo;
      }
      return LOGO_BASE + providerOrLogo;
    }
    if (providerOrLogo.logo) return logoUrl(providerOrLogo.logo);
    return LOGO_BASE + providerOrLogo.id + '.png';
  }

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
      html += '<option value="' + escAttr(p.name) + '"'
        + ' data-logo="' + escAttr(logoUrl(p)) + '"'
        + (s ? ' selected' : '') + '>'
        + escHtml(p.name) + '</option>';
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

  function ensureStyles() {
    if (document.getElementById('rzq-mr-pay-cat-css')) return;
    var style = document.createElement('style');
    style.id = 'rzq-mr-pay-cat-css';
    style.textContent =
      '.rzq-mr-pay-cat{display:flex;flex-direction:column;gap:8px}'
      + '.rzq-mr-pay-cat-row{display:flex;align-items:center;gap:10px}'
      + '.rzq-mr-pay-cat-logo{'
      + 'width:40px;height:40px;border-radius:10px;object-fit:contain;'
      + 'background:#fff;border:1px solid #e2e8f5;flex:0 0 40px;'
      + 'box-shadow:0 1px 2px rgba(27,58,107,.06)'
      + '}'
      + '.rzq-mr-pay-cat-logo.is-empty{opacity:.35;visibility:hidden}'
      + '.rzq-mr-pay-cat-select{flex:1;min-width:0}'
      + '.rzq-mr-pay-chip{'
      + 'display:inline-flex;align-items:center;gap:7px;'
      + 'padding:5px 10px 5px 6px;border-radius:999px;'
      + 'background:#f0f4ff;border:1px solid #d8e2f0;'
      + 'font-size:11.5px;font-weight:700;color:#1B3A6B'
      + '}'
      + '.rzq-mr-pay-chip img{'
      + 'width:22px;height:22px;border-radius:6px;object-fit:contain;'
      + 'background:#fff;border:1px solid #e8eef8;flex:0 0 22px'
      + '}';
    document.head.appendChild(style);
  }

  function setLogoPreview(img, provider) {
    if (!img) return;
    if (!provider) {
      img.removeAttribute('src');
      img.alt = '';
      img.classList.add('is-empty');
      return;
    }
    img.src = logoUrl(provider);
    img.alt = provider.name;
    img.classList.remove('is-empty');
  }

  /**
   * يحوّل حقل نص اسم البنك إلى قائمة كتالوج + شعار + حقل مخصص عند الحاجة.
   * لا يغيّر id الحقل الأصلي — دوال الحفظ تقرأ نفس القيمة.
   */
  function enhanceField(inputOrSelector, opts) {
    opts = opts || {};
    var input = typeof inputOrSelector === 'string'
      ? document.querySelector(inputOrSelector)
      : inputOrSelector;
    if (!input || input.getAttribute('data-rzq-mr-cat') === '1') return input;
    input.setAttribute('data-rzq-mr-cat', '1');
    ensureStyles();

    var wrap = document.createElement('div');
    wrap.className = 'rzq-mr-pay-cat';

    var row = document.createElement('div');
    row.className = 'rzq-mr-pay-cat-row';

    var logoImg = document.createElement('img');
    logoImg.className = 'rzq-mr-pay-cat-logo is-empty';
    logoImg.alt = '';
    logoImg.decoding = 'async';
    logoImg.loading = 'lazy';
    logoImg.onerror = function () {
      logoImg.classList.add('is-empty');
    };

    var select = document.createElement('select');
    select.className = 'rzq-mr-pay-cat-select';
    select.style.cssText = input.style.cssText
      || 'width:100%;padding:10px 12px;border:1.5px solid #e2e8f5;border-radius:9px;font-size:13px;color:#1B3A6B;background:#f8faff;box-sizing:border-box;font-family:inherit';
    select.innerHTML = optionsHtml(input.value, isFr());

    var parent = input.parentNode;
    parent.insertBefore(wrap, input);
    row.appendChild(logoImg);
    row.appendChild(select);
    wrap.appendChild(row);
    wrap.appendChild(input);

    function syncUi() {
      var known = findByName(input.value);
      if (known) {
        select.value = known.name;
        input.style.display = 'none';
        input.removeAttribute('required');
        setLogoPreview(logoImg, known);
      } else if (String(input.value || '').trim()) {
        select.value = CUSTOM_VALUE;
        input.style.display = '';
        input.placeholder = opts.customPlaceholder
          || (isFr() ? 'Nom de la banque / du service' : 'اسم البنك / الخدمة');
        setLogoPreview(logoImg, null);
      } else {
        select.value = '';
        input.style.display = 'none';
        setLogoPreview(logoImg, null);
      }
    }

    select.addEventListener('change', function () {
      var v = select.value;
      if (!v) {
        input.value = '';
        input.style.display = 'none';
        setLogoPreview(logoImg, null);
        return;
      }
      if (v === CUSTOM_VALUE) {
        input.style.display = '';
        if (findByName(input.value)) input.value = '';
        setLogoPreview(logoImg, null);
        input.focus();
        return;
      }
      input.value = v;
      input.style.display = 'none';
      setLogoPreview(logoImg, findByName(v));
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
    ensureStyles();
    var fr = isFr();
    host.innerHTML =
      '<div style="font-size:12px;font-weight:800;color:#1B3A6B;margin-bottom:8px">'
      + (fr ? '📚 Catalogue MR — banques & portefeuilles' : '📚 كتالوج موريتانيا — بنوك ومحافظ')
      + '</div>'
      + '<p style="font-size:11.5px;color:#6a7a8a;margin:0 0 10px;line-height:1.55">'
      + (fr
        ? 'Chaque nom est associé à son logo connu pour une reconnaissance rapide.'
        : 'كل اسم مقابل شعاره المعروف للتعرّف السريع.')
      + '</p>'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px">'
      + PROVIDERS.map(function (p) {
        return '<span class="rzq-mr-pay-chip">'
          + '<img src="' + escAttr(logoUrl(p)) + '" alt="' + escAttr(p.name) + '" loading="lazy" decoding="async"'
          + ' onerror="this.style.visibility=\'hidden\'">'
          + '<span>' + escHtml(p.name) + '</span>'
          + '</span>';
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
    LOGO_BASE: LOGO_BASE,
    CUSTOM_VALUE: CUSTOM_VALUE,
    list: list,
    findByName: findByName,
    logoUrl: logoUrl,
    optionsHtml: optionsHtml,
    enhanceField: enhanceField,
    enhanceAll: enhanceAll,
    renderReference: renderReference,
    boot: boot
  };
})(typeof window !== 'undefined' ? window : globalThis);
