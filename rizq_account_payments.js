/**
 * rizq_account_payments.js — طرق دفع المشترك (محل/مكتب/شركة)
 * مزامنة مع الحساب + عرض عام + نافذة اختيار الزبون (بنوك/محافظ ثم تفاصيل الدفع).
 */
(function (global) {
  'use strict';

  var ALLOWED_TYPES = ['bank', 'bankily', 'sedad', 'bimbam', 'mobile', 'cash', 'instore', 'custom'];

  function localKey(accountId) {
    return 'rizq_my_payments_' + (accountId || 'demo');
  }

  function normalizeMethods(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 10).map(function (m) {
      var type = ALLOWED_TYPES.indexOf(m && m.type) >= 0 ? m.type : 'bank';
      return {
        type: type,
        bank: String((m && m.bank) || '').slice(0, 120),
        code: String((m && m.code) || '').slice(0, 120),
        phone: String((m && m.phone) || '').slice(0, 40),
        account: String((m && (m.account || m.iban || m.accountNumber)) || '').slice(0, 80),
        note: String((m && m.note) || '').slice(0, 300),
        addedAt: String((m && m.addedAt) || new Date().toISOString()).slice(0, 30),
      };
    }).filter(function (m) {
      return m.bank || m.type === 'cash' || m.type === 'instore';
    });
  }

  function getLocal(accountId, isDemo, demoArr) {
    if (isDemo) return demoArr || [];
    try {
      return JSON.parse(localStorage.getItem(localKey(accountId)) || '[]');
    } catch (e) {
      return [];
    }
  }

  function setLocal(accountId, methods) {
    localStorage.setItem(localKey(accountId), JSON.stringify(methods));
  }

  function syncFromBackend(accountId, accessToken) {
    if (!accountId || !accessToken || !global.RIZQ_BACKEND_BASE) {
      return Promise.resolve(null);
    }
    return fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/accounts/mine/' + encodeURIComponent(accountId), {
      headers: { 'x-account-token': accessToken },
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.ok || !data.account) return null;
        var methods = normalizeMethods(data.account.paymentMethods || []);
        setLocal(accountId, methods);
        return methods;
      })
      .catch(function () { return null; });
  }

  function persist(accountId, methods, accessToken, isDemo) {
    var normalized = normalizeMethods(methods);
    if (isDemo) return Promise.resolve(normalized);
    setLocal(accountId, normalized);
    if (!accountId || !accessToken || !global.RIZQ_BACKEND_BASE) {
      return Promise.resolve(normalized);
    }
    return fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/accounts/mine/' + encodeURIComponent(accountId), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-account-token': accessToken,
      },
      body: JSON.stringify({ paymentMethods: normalized }),
    })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && data.ok && data.account && Array.isArray(data.account.paymentMethods)) {
          var synced = normalizeMethods(data.account.paymentMethods);
          setLocal(accountId, synced);
          return synced;
        }
        return normalized;
      })
      .catch(function () { return normalized; });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function typeLabel(type, fr) {
    var map = {
      bank: fr ? '🏦 Bank transfer' : '🏦 تحويل بنكي',
      bankily: fr ? '📱 Bankily' : '📱 بنكيلي',
      sedad: fr ? '📱 Sedad' : '📱 سداد',
      bimbam: fr ? '📱 Bimbam' : '📱 بيماه',
      mobile: fr ? '📱 Mobile wallet' : '📱 محفظة رقمية',
      cash: fr ? '💵 Cash on delivery' : '💵 الدفع عند الاستلام',
      instore: fr ? '🏪 Pay in store' : '🏪 الدفع في المحل',
      custom: fr ? '✏️ Other' : '✏️ مخصص',
    };
    return map[type] || (fr ? '💳 Payment' : '💳 دفع');
  }

  function typeIcon(type) {
    var map = { bank: '🏦', bankily: '📱', sedad: '📱', bimbam: '📲', mobile: '💳', cash: '💵', instore: '🏪', custom: '✏️' };
    return map[type] || '💳';
  }

  function channelsOf(m) {
    var list = [];
    if (m && m.code) list.push({ key: 'code', icon: '🔢', ar: 'عن طريق الرمز', fr: 'Par code', value: m.code });
    if (m && m.phone) list.push({ key: 'phone', icon: '📞', ar: 'عن طريق رقم الهاتف', fr: 'Par téléphone', value: m.phone });
    if (m && m.account) list.push({ key: 'account', icon: '🏦', ar: 'عن طريق التحويل البنكي', fr: 'Par virement bancaire', value: m.account });
    /* توافق خلفي: إن وُجد code فقط لنوع bank اعتبره حساباً أيضاً في العرض */
    if (!list.length && m && m.code && m.type === 'bank') {
      list.push({ key: 'account', icon: '🏦', ar: 'عن طريق التحويل البنكي', fr: 'Par virement bancaire', value: m.code });
    }
    return list;
  }

  function transferableMethods(methods) {
    return normalizeMethods(methods || []).filter(function (m) {
      return m.type !== 'cash' && m.type !== 'instore';
    });
  }

  function detailRowsHtml(m, fr) {
    var ch = channelsOf(m);
    if (!ch.length) {
      return '<div style="font-size:12.5px;color:#6a7a8a;line-height:1.6">'
        + (fr ? 'Aucune coordonnée de paiement renseignée pour ce moyen.' : 'لم يُدخل المشترك بيانات دفع لهذا الوسيلة بعد.')
        + '</div>';
    }
    return ch.map(function (c) {
      return '<div class="rzq-paych">'
        + '<div class="rzq-paych-label">' + c.icon + ' ' + esc(fr ? c.fr : c.ar) + '</div>'
        + '<div class="rzq-paych-row">'
        + '<code class="rzq-paych-val" dir="ltr">' + esc(c.value) + '</code>'
        + '<button type="button" class="rzq-paych-copy" data-copy="' + esc(c.value) + '">' + (fr ? '📋 Copier' : '📋 نسخ') + '</button>'
        + '</div></div>';
    }).join('');
  }

  function injectPickerCss() {
    if (document.getElementById('rzq-pay-picker-css')) return;
    var s = document.createElement('style');
    s.id = 'rzq-pay-picker-css';
    s.textContent =
      '.rzq-pay-root{position:fixed;inset:0;z-index:9600;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(6,17,28,.72);backdrop-filter:blur(8px)}'
      + '.rzq-pay-root.open{display:flex}'
      + '.rzq-pay-sheet{width:min(460px,100%);max-height:92vh;overflow:auto;border-radius:18px;background:linear-gradient(180deg,#fff,#f7f9fc);border:1px solid rgba(201,168,76,.4);box-shadow:0 24px 60px rgba(0,0,0,.35);animation:rzqPayIn .3s cubic-bezier(.16,1,.3,1)}'
      + '@keyframes rzqPayIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}'
      + '.rzq-pay-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;background:linear-gradient(135deg,#0D1B2A,#1B3A6B);color:#fff}'
      + '.rzq-pay-head h3{margin:0;font-size:16px;font-weight:900}'
      + '.rzq-pay-head p{margin:4px 0 0;font-size:11.5px;color:rgba(255,255,255,.65);line-height:1.45}'
      + '.rzq-pay-x{border:1px solid rgba(201,168,76,.4);background:rgba(255,255,255,.06);color:#E8C96A;border-radius:10px;width:34px;height:34px;cursor:pointer;font-size:16px;font-weight:800}'
      + '.rzq-pay-body{padding:16px 18px 20px}'
      + '.rzq-pay-step{font-size:11.5px;font-weight:800;color:#C9A84C;letter-spacing:.3px;margin-bottom:10px}'
      + '.rzq-pay-opt{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:1.5px solid #e0e8f0;background:#fff;cursor:pointer;margin-bottom:8px;transition:border-color .2s,box-shadow .2s,transform .15s;width:100%;text-align:inherit;font:inherit}'
      + '.rzq-pay-opt:hover,.rzq-pay-opt.selected{border-color:#C9A84C;box-shadow:0 6px 18px rgba(201,168,76,.15);transform:translateY(-1px)}'
      + '.rzq-pay-opt-ico{width:42px;height:42px;border-radius:12px;background:linear-gradient(145deg,#e8eef8,#f5f8ff);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}'
      + '.rzq-pay-opt-name{font-size:14px;font-weight:800;color:#1B3A6B}'
      + '.rzq-pay-opt-sub{font-size:11.5px;color:#6a7a8a;margin-top:2px}'
      + '.rzq-pay-radio{width:18px;height:18px;border-radius:50%;border:2px solid #C9A84C;margin-inline-start:auto;flex-shrink:0;position:relative}'
      + '.rzq-pay-opt.selected .rzq-pay-radio::after{content:"";position:absolute;inset:3px;border-radius:50%;background:#1B3A6B}'
      + '.rzq-paych{padding:12px 13px;border-radius:12px;background:#f8faff;border:1px solid rgba(27,58,107,.1);margin-bottom:8px}'
      + '.rzq-paych-label{font-size:12px;font-weight:800;color:#1B3A6B;margin-bottom:8px}'
      + '.rzq-paych-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}'
      + '.rzq-paych-val{flex:1;min-width:140px;font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:800;color:#0f2347;background:#fff;border:1px solid #d8e2f0;border-radius:9px;padding:9px 12px;letter-spacing:.4px}'
      + '.rzq-paych-copy{border:none;border-radius:9px;padding:9px 12px;background:linear-gradient(135deg,#1B3A6B,#234d8f);color:#fff;font-weight:800;font-size:12px;cursor:pointer;font-family:inherit}'
      + '.rzq-pay-back{border:1px solid rgba(27,58,107,.2);background:#fff;color:#1B3A6B;border-radius:10px;padding:9px 12px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;margin-bottom:12px}'
      + '.rzq-pay-confirm{width:100%;margin-top:12px;border:none;border-radius:12px;padding:13px;background:linear-gradient(135deg,#C9A84C,#E8C96A);color:#0D1B2A;font-weight:900;font-size:14px;cursor:pointer;font-family:inherit}'
      + '.rzq-pay-empty{text-align:center;padding:28px 12px;color:#6a7a8a;font-size:13.5px;line-height:1.7}'
      + '.rzq-pay-note{font-size:12px;color:#4a5568;line-height:1.6;margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25)}'
      + '.rzq-pay-trust{font-size:11px;color:#6b7280;margin-top:12px;line-height:1.55;text-align:center}';
    document.head.appendChild(s);
  }

  var _pickerState = { methods: [], selected: null, opts: null, step: 1 };

  function ensurePicker() {
    var root = document.getElementById('rzq-pay-root');
    if (root) return root;
    injectPickerCss();
    root = document.createElement('div');
    root.id = 'rzq-pay-root';
    root.className = 'rzq-pay-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.innerHTML = '<div class="rzq-pay-sheet" id="rzq-pay-sheet"></div>';
    root.addEventListener('click', function (e) {
      if (e.target === root) closeBuyerPicker();
    });
    document.body.appendChild(root);
    return root;
  }

  function copyText(val, btn) {
    function done() {
      if (!btn) return;
      var old = btn.textContent;
      btn.textContent = '✅';
      setTimeout(function () { btn.textContent = old; }, 1200);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(val).then(done).catch(function () {
        window.prompt('Copy:', val);
      });
    } else {
      window.prompt('Copy:', val);
      done();
    }
  }

  function bindPickerClicks(sheet) {
    sheet.querySelectorAll('[data-pick-idx]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(btn.getAttribute('data-pick-idx'), 10);
        _pickerState.selected = _pickerState.methods[i] || null;
        _pickerState.step = 2;
        paintPicker();
      });
    });
    sheet.querySelectorAll('.rzq-paych-copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyText(btn.getAttribute('data-copy') || '', btn);
      });
    });
    var back = sheet.querySelector('[data-pay-back]');
    if (back) back.addEventListener('click', function () {
      _pickerState.step = 1;
      _pickerState.selected = null;
      paintPicker();
    });
    var conf = sheet.querySelector('[data-pay-confirm]');
    if (conf) conf.addEventListener('click', function () {
      var opts = _pickerState.opts || {};
      if (typeof opts.onSelect === 'function') opts.onSelect(_pickerState.selected);
      closeBuyerPicker();
    });
    var x = sheet.querySelector('[data-pay-close]');
    if (x) x.addEventListener('click', closeBuyerPicker);
  }

  function paintPicker() {
    var root = ensurePicker();
    var sheet = document.getElementById('rzq-pay-sheet');
    if (!sheet) return;
    var fr = !!( _pickerState.opts && _pickerState.opts.fr);
    var seller = (_pickerState.opts && _pickerState.opts.sellerName) || (fr ? 'le magasin' : 'المحل');
    var methods = _pickerState.methods || [];

    if (_pickerState.step === 1) {
      var listHtml = methods.length
        ? methods.map(function (m, i) {
          return '<button type="button" class="rzq-pay-opt" data-pick-idx="' + i + '">'
            + '<span class="rzq-pay-opt-ico">' + typeIcon(m.type) + '</span>'
            + '<span style="flex:1;min-width:0"><div class="rzq-pay-opt-name">' + esc(m.bank || typeLabel(m.type, fr)) + '</div>'
            + '<div class="rzq-pay-opt-sub">' + esc(typeLabel(m.type, fr)) + '</div></span>'
            + '<span class="rzq-pay-radio" aria-hidden="true"></span></button>';
        }).join('')
        : '<div class="rzq-pay-empty">' + (fr
          ? 'Le magasin n’a pas encore publié de banques / portefeuilles.'
          : 'لم ينشر المحل بعد أسماء بنوك أو محافظ للدفع.') + '</div>';

      sheet.innerHTML =
        '<div class="rzq-pay-head"><div><h3>' + (fr ? 'Choisir un moyen de paiement' : 'اختر وسيلة الدفع') + '</h3>'
        + '<p>' + (fr ? ('Banques et portefeuilles de « ' + esc(seller) + ' »') : ('بنوك ومحافظ « ' + esc(seller) + ' » من داشبورده')) + '</p></div>'
        + '<button type="button" class="rzq-pay-x" data-pay-close aria-label="close">✕</button></div>'
        + '<div class="rzq-pay-body"><div class="rzq-pay-step">' + (fr ? 'Étape 1 — Choisissez la banque / le portefeuille' : 'الخطوة 1 — اختر البنك أو المحفظة') + '</div>'
        + listHtml
        + '<div class="rzq-pay-trust">⚖️ ' + (fr
          ? 'Le paiement va directement au magasin — Rizq n’encaisse pas vos achats.'
          : 'الدفع يصل للمحل مباشرة — رزق وسيط نشر فقط ولا يستلم ثمن مشترياتك.') + '</div></div>';
    } else {
      var m = _pickerState.selected || {};
      sheet.innerHTML =
        '<div class="rzq-pay-head"><div><h3>' + esc(m.bank || typeLabel(m.type, fr)) + '</h3>'
        + '<p>' + esc(typeLabel(m.type, fr)) + '</p></div>'
        + '<button type="button" class="rzq-pay-x" data-pay-close aria-label="close">✕</button></div>'
        + '<div class="rzq-pay-body">'
        + '<button type="button" class="rzq-pay-back" data-pay-back>← ' + (fr ? 'Changer de moyen' : 'تغيير الوسيلة') + '</button>'
        + '<div class="rzq-pay-step">' + (fr ? 'Étape 2 — Coordonnées de paiement' : 'الخطوة 2 — طرق الدفع لهذه الوسيلة') + '</div>'
        + detailRowsHtml(m, fr)
        + (m.note ? '<div class="rzq-pay-note">📝 ' + esc(m.note) + '</div>' : '')
        + '<button type="button" class="rzq-pay-confirm" data-pay-confirm="1">✅ ' + (fr ? 'Utiliser ce moyen' : 'اعتماد هذه الطريقة') + '</button>'
        + '<div class="rzq-pay-trust">⚖️ ' + (fr
          ? 'Vérifiez le montant avant d’envoyer — Rizq n’est pas partie à la transaction.'
          : 'تحقق من المبلغ قبل الإرسال — رزق ليس طرفاً في المعاملة.') + '</div></div>';
    }
    bindPickerClicks(sheet);
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function openBuyerPicker(methods, opts) {
    opts = opts || {};
    _pickerState.methods = transferableMethods(methods);
    _pickerState.opts = opts;
    _pickerState.selected = null;
    _pickerState.step = 1;
    paintPicker();
    return true;
  }

  function closeBuyerPicker() {
    var root = document.getElementById('rzq-pay-root');
    if (root) root.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderPublic(container, methods, opts) {
    if (!container) return;
    opts = opts || {};
    var fr = !!opts.fr;
    var list = normalizeMethods(methods || []);
    if (!list.length) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    container.style.display = '';
    var title = fr ? '💳 Payment options' : '💳 طرق الدفع المتاحة';
    var hint = fr
      ? 'Payez directement le vendeur via l’un des moyens ci-dessous.'
      : 'ادفع مباشرة للبائع عبر إحدى الوسائل أدناه.';
    var cards = list.map(function (m) {
      var ch = channelsOf(m);
      var chHtml = ch.map(function (c) {
        return '<div style="margin-top:6px"><span style="font-size:11px;color:#6a7a8a">' + esc(fr ? c.fr : c.ar) + '</span>'
          + ' <code style="font-family:monospace;font-size:12.5px;font-weight:800;color:#0f2347;background:#e8f0fe;padding:3px 8px;border-radius:6px;direction:ltr">' + esc(c.value) + '</code></div>';
      }).join('');
      return '<div style="background:#fff;border:1.5px solid rgba(27,58,107,.12);border-radius:10px;padding:12px 14px;margin-bottom:8px">'
        + '<div style="font-size:13px;font-weight:800;color:#1B3A6B">' + esc(m.bank || typeLabel(m.type, fr)) + '</div>'
        + '<div style="font-size:11px;color:#6a7a8a;margin-top:2px">' + esc(typeLabel(m.type, fr)) + '</div>'
        + chHtml
        + (m.note ? '<div style="font-size:11px;color:#4a5568;margin-top:6px;line-height:1.5">' + esc(m.note) + '</div>' : '')
        + '</div>';
    }).join('');
    container.innerHTML = '<div style="font-size:13px;font-weight:800;color:#1B3A6B;margin-bottom:8px">' + title + '</div>'
      + '<div style="font-size:12px;color:#6a7a8a;margin-bottom:10px;line-height:1.55">' + hint + '</div>'
      + cards;
  }

  function afterPlatformBankCodesSynced() {
    try {
      if (typeof renderRizqPayment === 'function') {
        ['bank-payment-widget', 'rzq-pay-section', 'rzq-pay-sub'].forEach(function (id) {
          if (document.getElementById(id)) renderRizqPayment(id);
        });
      }
    } catch (e) { /* ignore */ }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var root = document.getElementById('rzq-pay-root');
      if (root && root.classList.contains('open')) closeBuyerPicker();
    }
  });

  global.RizqAccountPayments = {
    localKey: localKey,
    normalize: normalizeMethods,
    getLocal: getLocal,
    setLocal: setLocal,
    syncFromBackend: syncFromBackend,
    persist: persist,
    renderPublic: renderPublic,
    openBuyerPicker: openBuyerPicker,
    closeBuyerPicker: closeBuyerPicker,
    channelsOf: channelsOf,
    transferableMethods: transferableMethods,
    typeLabel: typeLabel,
    afterPlatformBankCodesSynced: afterPlatformBankCodesSynced,
  };
})(typeof window !== 'undefined' ? window : globalThis);
