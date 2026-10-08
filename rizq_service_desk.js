/**
 * rizq_service_desk.js — غرفة الطلبات الموحّدة (مكتب / محل / معرض)
 * - نموذج موحّد: اسم كامل، هاتف، واتساب، إيميل، خدمة، رسالة
 * - القالب/العنوان اختياري يسمّيه المشترك
 * - الوثائق عبر واتساب / إيميل واجهة المشترك (بدون رفع ملفات في النموذج)
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function backendBase() {
    return (global.RIZQ_BACKEND_BASE || '').replace(/\/$/, '');
  }

  function isFr() {
    try {
      if (global.RizqI18n && typeof RizqI18n.getLang === 'function') {
        return RizqI18n.getLang() === 'fr';
      }
    } catch (e) { /* ignore */ }
    return (document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0;
  }

  function t(ar, fr) {
    return isFr() ? fr : ar;
  }

  function normalizeDesk(desk) {
    desk = desk || {};
    var ch = String(desk.docsChannel || 'whatsapp').toLowerCase();
    return {
      enabled: desk.enabled !== false,
      formTitle: String(desk.formTitle || '').trim().slice(0, 120),
      formHint: String(desk.formHint || '').trim().slice(0, 240),
      docsChannel: (ch === 'email' || ch === 'both' || ch === 'whatsapp') ? ch : 'whatsapp',
    };
  }

  function applyPublicLabels(root, desk, accountName) {
    if (!root) return;
    desk = normalizeDesk(desk);
    var title = desk.formTitle
      || t('طلب خدمة', 'Demande de service');
    if (accountName && !desk.formTitle) {
      title = t('طلب خدمة — ', 'Demande — ') + accountName;
    }
    var hint = desk.formHint
      || t(
        'أدخل بياناتك وسنتواصل معك. الوثائق تُرسل عبر واتساب أو إيميل المكتب مباشرة.',
        'Saisissez vos coordonnées. Les documents partent via WhatsApp ou e-mail du professionnel.'
      );
    var titleEl = root.querySelector('[data-desk="title"]') || root.querySelector('#req-title');
    var hintEl = root.querySelector('[data-desk="hint"]') || root.querySelector('#req-sub');
    if (titleEl) titleEl.textContent = '📩 ' + title;
    if (hintEl) hintEl.textContent = hint;
  }

  function ensureExtraFields(form) {
    if (!form || form.getAttribute('data-desk-enhanced') === '1') return;
    form.setAttribute('data-desk-enhanced', '1');

    var phone = form.querySelector('#rf-phone');
    if (phone && !form.querySelector('#rf-whatsapp')) {
      var wa = document.createElement('input');
      wa.id = 'rf-whatsapp';
      wa.className = phone.className || 'req-input';
      wa.setAttribute('dir', 'ltr');
      wa.placeholder = t('واتساب (إن اختلف عن الهاتف)', 'WhatsApp (si différent)');
      wa.setAttribute('data-ph', 'rf-whatsapp');
      phone.insertAdjacentElement('afterend', wa);
    }
    if (!form.querySelector('#rf-email')) {
      var email = document.createElement('input');
      email.id = 'rf-email';
      email.type = 'email';
      email.className = (phone && phone.className) || 'req-input';
      email.setAttribute('dir', 'ltr');
      email.placeholder = t('البريد الإلكتروني (اختياري)', 'E-mail (optionnel)');
      email.setAttribute('data-ph', 'rf-email');
      var after = form.querySelector('#rf-whatsapp') || phone;
      if (after) after.insertAdjacentElement('afterend', email);
      else form.appendChild(email);
    }

    if (!form.querySelector('#rf-docs-hint')) {
      var note = document.createElement('div');
      note.id = 'rf-docs-hint';
      note.setAttribute('data-desk', 'docs-hint');
      note.style.cssText = 'font-size:11.5px;color:#6a7a8a;line-height:1.55;margin:4px 0 10px;padding:10px 12px;border-radius:10px;background:rgba(27,58,107,.04);border:1px solid rgba(27,58,107,.08)';
      note.textContent = t(
        '📎 يمكنك إرسال الوثائق عبر واتساب أو الإيميل بعد إرسال الطلب.',
        '📎 Vous pouvez envoyer les documents via WhatsApp ou e-mail après l\'envoi.'
      );
      var btn = form.querySelector('#req-submit-btn');
      if (btn) form.insertBefore(note, btn);
      else form.appendChild(note);
    }
  }

  function collectForm(form) {
    form = form || document.getElementById('req-form');
    if (!form) return null;
    var g = function (id) {
      var el = form.querySelector('#' + id) || document.getElementById(id);
      return el ? String(el.value || '').trim() : '';
    };
    return {
      buyerName: g('rf-name'),
      buyerPhone: g('rf-phone'),
      buyerWhatsapp: g('rf-whatsapp') || g('rf-phone'),
      buyerEmail: g('rf-email'),
      service: g('rf-service'),
      message: g('rf-msg'),
    };
  }

  function validate(data) {
    if (!data || !data.buyerName || data.buyerName.length < 2) {
      return { ok: false, error: t('يرجى إدخال الاسم الكامل', 'Veuillez saisir le nom complet') };
    }
    var digits = String(data.buyerPhone || '').replace(/\D/g, '');
    if (digits.length < 8) {
      return { ok: false, error: t('يرجى إدخال رقم هاتف صالح', 'Veuillez saisir un téléphone valide') };
    }
    if (data.buyerEmail && data.buyerEmail.indexOf('@') < 1) {
      return { ok: false, error: t('البريد الإلكتروني غير صالح', 'E-mail invalide') };
    }
    return { ok: true };
  }

  function openDocsChannel(opts) {
    opts = opts || {};
    var channel = opts.docsChannel || 'whatsapp';
    var name = opts.buyerName || '';
    var phone = opts.buyerPhone || '';
    var svc = opts.service || '';
    var reqId = opts.requestId || '';
    var text = t('طلب خدمة عبر رزق', 'Demande via Rizq')
      + (reqId ? ' #' + reqId : '')
      + ' — ' + name
      + (phone ? ' — ' + phone : '')
      + (svc ? ' — ' + svc : '')
      + t('\n(أرفق الوثائق هنا إن لزم)', '\n(Joindre les documents si besoin)');

    if (channel === 'email' || channel === 'both') {
      var mailBtn = document.getElementById('act-email') || document.querySelector('a[href^="mailto:"]');
      var href = mailBtn && mailBtn.getAttribute('href');
      if (href && href.indexOf('mailto:') === 0 && href.length > 8) {
        var sep = href.indexOf('?') >= 0 ? '&' : '?';
        window.open(href + sep + 'subject=' + encodeURIComponent(t('طلب خدمة — رزق', 'Demande — Rizq'))
          + '&body=' + encodeURIComponent(text), '_blank', 'noopener');
      }
    }
    if (channel === 'whatsapp' || channel === 'both' || channel === 'email') {
      var wa = document.getElementById('act-wa-top') || document.getElementById('sticky-wa')
        || document.querySelector('a[href*="wa.me"]');
      var waNum = '';
      if (wa && wa.href) {
        try {
          waNum = String(wa.href).split('wa.me/')[1] || '';
          waNum = waNum.split('?')[0].replace(/\D/g, '');
        } catch (e) { waNum = ''; }
      }
      if (waNum && (channel === 'whatsapp' || channel === 'both' || !opts.emailOpened)) {
        window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      }
    }
  }

  function submit(opts) {
    opts = opts || {};
    var data = opts.data || collectForm(opts.form);
    var check = validate(data);
    if (!check.ok) return Promise.reject(new Error(check.error));

    var accountId = opts.accountId || '';
    var desk = normalizeDesk(opts.desk);
    var payload = {
      accountId: accountId,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      buyerWhatsapp: data.buyerWhatsapp || data.buyerPhone,
      buyerEmail: data.buyerEmail || '',
      service: data.service || '',
      message: data.message || '',
      templateName: desk.formTitle || opts.templateName || '',
      source: opts.source || 'office',
      paymentPreference: opts.paymentPreference || '',
    };

    var base = backendBase();
    var send = base && accountId
      ? fetch(base + '/api/service-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
      : Promise.resolve({ ok: false, status: 0, body: { error: 'offline' } });

    return send.then(function (res) {
      var reqId = res.body && (res.body.id || (res.body.request && res.body.request.id));
      // احتياطي محلي إن تعذّر الخادم
      if (!res.ok) {
        try {
          var key = 'rizq_service_requests_local';
          var list = JSON.parse(localStorage.getItem(key) || '[]');
          var localId = 'LOCAL-' + Date.now().toString(36);
          list.unshift(Object.assign({}, payload, {
            id: localId,
            createdAt: new Date().toISOString(),
            status: 'new',
            _local: true,
          }));
          localStorage.setItem(key, JSON.stringify(list.slice(0, 80)));
          reqId = localId;
        } catch (e) { /* ignore */ }
      }
      openDocsChannel({
        docsChannel: (res.body && res.body.request && res.body.request.docsChannel) || desk.docsChannel,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone,
        service: data.service,
        requestId: reqId,
      });
      return {
        ok: true,
        id: reqId,
        serverOk: !!res.ok,
        message: t(
          'تم استلام طلبك' + (reqId ? ' (' + reqId + ')' : '') + ' — يمكنك إرسال الوثائق عبر واتساب أو الإيميل.',
          'Demande reçue' + (reqId ? ' (' + reqId + ')' : '') + ' — envoyez les documents via WhatsApp ou e-mail.'
        ),
      };
    });
  }

  function listMine(accountId, token) {
    var base = backendBase();
    if (!base || !accountId || !token) return Promise.resolve([]);
    return fetch(base + '/api/service-requests/mine?accountId=' + encodeURIComponent(accountId), {
      headers: { 'x-account-token': token },
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        return (data && Array.isArray(data.requests)) ? data.requests : [];
      })
      .catch(function () { return []; });
  }

  function setStatus(id, status, token) {
    var base = backendBase();
    if (!base || !id || !token) return Promise.reject(new Error('missing'));
    return fetch(base + '/api/service-requests/' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-account-token': token,
      },
      body: JSON.stringify({ status: status }),
    }).then(function (r) { return r.json(); });
  }

  function saveDeskSettings(accountId, token, desk) {
    var base = backendBase();
    var normalized = normalizeDesk(desk);
    if (!base || !accountId || !token) {
      try { localStorage.setItem('rizq_service_desk_' + accountId, JSON.stringify(normalized)); } catch (e) { /* ignore */ }
      return Promise.resolve(normalized);
    }
    return fetch(base + '/api/accounts/mine/' + encodeURIComponent(accountId), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-account-token': token,
      },
      body: JSON.stringify({ serviceDesk: normalized }),
    })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        var out = (data && data.account && data.account.serviceDesk)
          ? normalizeDesk(data.account.serviceDesk)
          : normalized;
        try { localStorage.setItem('rizq_service_desk_' + accountId, JSON.stringify(out)); } catch (e) { /* ignore */ }
        return out;
      });
  }

  function enhanceOfficeForm(opts) {
    opts = opts || {};
    var form = document.getElementById('req-form');
    var box = form && form.closest('.req-box');
    ensureExtraFields(form);
    applyPublicLabels(box || document, opts.desk, opts.accountName);
    var nameEl = document.getElementById('rf-name');
    if (nameEl) nameEl.placeholder = t('الاسم الكامل *', 'Nom complet *');
  }

  global.RizqServiceDesk = {
    normalizeDesk: normalizeDesk,
    enhanceOfficeForm: enhanceOfficeForm,
    applyPublicLabels: applyPublicLabels,
    collectForm: collectForm,
    validate: validate,
    submit: submit,
    listMine: listMine,
    setStatus: setStatus,
    saveDeskSettings: saveDeskSettings,
    openDocsChannel: openDocsChannel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
