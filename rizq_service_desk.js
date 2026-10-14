/**
 * rizq_service_desk.js — غرفة الطلبات الموحّدة (مكتب / محل / معرض)
 * - نموذج موحّد: اسم كامل، هاتف، واتساب، إيميل، خدمة، رسالة
 * - رفع بيان دفع اختياري على المنصة (صورة أو PDF) — أثر ثابت لحماية الطرفين
 * - واتساب/إيميل يبقى قناة تواصل، لا بديل وحيد للوثيقة
 */
(function (global) {
  'use strict';

  var MAX_DOC_BYTES = 5 * 1024 * 1024;
  var MAX_DOC_COUNT = 3;
  var ALLOWED_DOC_TYPES = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/webp': true,
    'application/pdf': true,
  };

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
    var ch = String(desk.docsChannel || 'platform').toLowerCase();
    return {
      enabled: desk.enabled !== false,
      formTitle: String(desk.formTitle || '').trim().slice(0, 120),
      formHint: String(desk.formHint || '').trim().slice(0, 240),
      docsChannel: (ch === 'email' || ch === 'both' || ch === 'whatsapp' || ch === 'platform') ? ch : 'platform',
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
        'أدخل بياناتك وسنتواصل معك. يمكنك رفع بيان الدفع (صورة أو PDF) مباشرة على المنصة.',
        'Saisissez vos coordonnées. Vous pouvez joindre un justificatif de paiement (image ou PDF) sur la plateforme.'
      );
    var titleEl = root.querySelector('[data-desk="title"]') || root.querySelector('#req-title');
    var hintEl = root.querySelector('[data-desk="hint"]') || root.querySelector('#req-sub');
    if (titleEl) titleEl.textContent = '📩 ' + title;
    if (hintEl) hintEl.textContent = hint;
    refreshDocUploadLabels(root);
  }

  function injectDocUploadCss() {
    if (document.getElementById('rzq-doc-upload-css')) return;
    var s = document.createElement('style');
    s.id = 'rzq-doc-upload-css';
    s.textContent =
      '#rf-doc-upload.rzq-doc-zone{'
      + 'position:relative;overflow:hidden;flex:1 1 210px;margin:0;padding:12px 12px 11px;'
      + 'border-radius:14px;border:1.5px solid rgba(201,168,76,.38);'
      + 'background:linear-gradient(145deg,#fffdf7 0%,#f7f9fc 55%,#eef3fb 100%);'
      + 'box-shadow:0 6px 18px rgba(15,35,71,.06);transition:border-color .2s,box-shadow .2s,transform .15s'
      + '}'
      + '#rf-doc-upload.rzq-doc-zone::before{'
      + 'content:"";position:absolute;inset:0 auto 0 0;width:4px;'
      + 'background:linear-gradient(180deg,#C9A84C,#E8C96A,#1B3A6B)'
      + '}'
      + '#rf-doc-upload.rzq-doc-zone.is-drag{'
      + 'border-color:#C9A84C;box-shadow:0 10px 26px rgba(201,168,76,.22);transform:translateY(-1px)'
      + '}'
      + '#rf-doc-upload .rzq-doc-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:8px}'
      + '#rf-doc-upload .rzq-doc-mark{'
      + 'width:38px;height:38px;border-radius:11px;flex:0 0 38px;'
      + 'display:inline-flex;align-items:center;justify-content:center;'
      + 'background:linear-gradient(145deg,#0F2347,#1B3A6B);color:#E8C96A;'
      + 'font-size:17px;box-shadow:0 4px 12px rgba(15,35,71,.22)'
      + '}'
      + '#rf-doc-upload .rzq-doc-title-row{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:3px}'
      + '#rf-doc-upload [data-desk="doc-title"]{'
      + 'font-size:13px;font-weight:900;color:#0F2347;margin:0;letter-spacing:.2px'
      + '}'
      + '#rf-doc-upload .rzq-doc-badge{'
      + 'display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;'
      + 'font-size:10px;font-weight:800;color:#8a6a1a;'
      + 'background:rgba(201,168,76,.16);border:1px solid rgba(201,168,76,.35)'
      + '}'
      + '#rf-doc-upload [data-desk="doc-hint"]{'
      + 'font-size:11.5px;color:#5c6b7a;line-height:1.55;margin:0'
      + '}'
      + '#rf-doc-upload .rzq-doc-pick{'
      + 'display:inline-flex;align-items:center;justify-content:center;gap:7px;'
      + 'margin-top:2px;padding:9px 14px;border-radius:11px;'
      + 'border:1.5px solid rgba(27,58,107,.28);'
      + 'background:linear-gradient(180deg,#ffffff,#f4f7fc);'
      + 'color:#0F2347;font-size:12.5px;font-weight:800;cursor:pointer;'
      + 'font-family:inherit;transition:border-color .2s,box-shadow .2s,transform .15s,background .2s'
      + '}'
      + '#rf-doc-upload .rzq-doc-pick:hover{'
      + 'border-color:#C9A84C;background:linear-gradient(180deg,#fffef8,#fff8e8);'
      + 'box-shadow:0 6px 16px rgba(201,168,76,.18);transform:translateY(-1px)'
      + '}'
      + '#rf-doc-upload .rzq-doc-pick-ico{font-size:14px;line-height:1}'
      + '#rf-doc-upload .rf-doc-item{'
      + 'display:flex;align-items:center;gap:8px;justify-content:space-between;'
      + 'padding:8px 10px;border-radius:10px;margin-top:7px;'
      + 'background:#fff;border:1px solid rgba(27,58,107,.1);'
      + 'box-shadow:0 2px 8px rgba(15,35,71,.04);font-size:12px'
      + '}'
      + '#rf-doc-upload .rf-doc-item button{'
      + 'border:none;background:rgba(185,28,28,.08);color:#b91c1c;'
      + 'font-weight:800;cursor:pointer;padding:4px 9px;border-radius:8px;font-size:11px'
      + '}'
      + '.store-desk-actions #store-req-submit,'
      + '.office-desk-actions #req-submit-btn,'
      + '.showroom-desk-actions #sr-req-submit,'
      + '#corp-req-submit.rzq-desk-submit{'
      + 'position:relative;overflow:hidden;'
      + 'background:linear-gradient(135deg,#0D1B2A 0%,#1B3A6B 58%,#234d8f 100%)!important;'
      + 'border:1px solid rgba(201,168,76,.45)!important;'
      + 'box-shadow:0 8px 20px rgba(15,35,71,.18);'
      + 'transition:transform .15s,box-shadow .2s,filter .2s'
      + '}'
      + '.store-desk-actions #store-req-submit:hover,'
      + '.office-desk-actions #req-submit-btn:hover,'
      + '.showroom-desk-actions #sr-req-submit:hover,'
      + '#corp-req-submit.rzq-desk-submit:hover{'
      + 'transform:translateY(-1px);filter:brightness(1.04);'
      + 'box-shadow:0 12px 26px rgba(15,35,71,.24)'
      + '}'
      + '@media (max-width:800px){'
      + '#rf-doc-upload.rzq-doc-zone{flex:1 1 100%}'
      + '}';
    document.head.appendChild(s);
  }

  function polishSubmitButtons(root) {
    root = root || document;
    ['#store-req-submit', '#req-submit-btn', '#sr-req-submit', '#corp-req-submit'].forEach(function (sel) {
      var btn = root.querySelector ? root.querySelector(sel) : null;
      if (!btn && typeof document !== 'undefined') btn = document.querySelector(sel);
      if (!btn) return;
      btn.classList.add('rzq-desk-submit');
    });
  }

  function refreshDocUploadLabels(root) {
    root = root || document;
    var zone = (root.querySelector && root.querySelector('#rf-doc-upload')) || document.getElementById('rf-doc-upload');
    if (!zone) return;
    injectDocUploadCss();
    upgradeDocUploadMarkup(zone);
    polishSubmitButtons(root);
    var title = zone.querySelector('[data-desk="doc-title"]');
    var hint = zone.querySelector('[data-desk="doc-hint"]');
    var btn = zone.querySelector('[data-desk="doc-pick"]');
    var badge = zone.querySelector('[data-desk="doc-badge"]');
    if (title) {
      title.textContent = t('رفع بيان الدفع', 'Justificatif de paiement');
    }
    if (badge) {
      badge.textContent = t('اختياري', 'Optionnel');
    }
    if (hint) {
      hint.textContent = t(
        'صورة أو PDF — يُحفظ على المنصة لحماية حقوق الطرفين (حد 5MB، حتى 3 ملفات).',
        'Image ou PDF — conservé sur la plateforme (5 Mo max, jusqu’à 3 fichiers).'
      );
    }
    if (btn) {
      btn.innerHTML = '<span class="rzq-doc-pick-ico" aria-hidden="true">📎</span><span>'
        + esc(t('اختر صورة أو PDF', 'Choisir image ou PDF')) + '</span>';
    }
  }

  function upgradeDocUploadMarkup(zone) {
    if (!zone || zone.getAttribute('data-desk-polished') === '1') return;
    zone.setAttribute('data-desk-polished', '1');
    zone.classList.add('rzq-doc-zone');
    zone.removeAttribute('style');

    var title = zone.querySelector('[data-desk="doc-title"]');
    var hint = zone.querySelector('[data-desk="doc-hint"]');
    var pick = zone.querySelector('[data-desk="doc-pick"]');
    var input = zone.querySelector('#rf-doc-file');
    var list = zone.querySelector('#rf-doc-list');
    var err = zone.querySelector('#rf-doc-error');

    if (!zone.querySelector('.rzq-doc-head')) {
      var head = document.createElement('div');
      head.className = 'rzq-doc-head';
      head.innerHTML = ''
        + '<span class="rzq-doc-mark" aria-hidden="true">🧾</span>'
        + '<div class="rzq-doc-copy">'
        + '<div class="rzq-doc-title-row">'
        + '<div data-desk="doc-title"></div>'
        + '<span class="rzq-doc-badge" data-desk="doc-badge"></span>'
        + '</div>'
        + '<div data-desk="doc-hint"></div>'
        + '</div>';
      zone.insertBefore(head, zone.firstChild);
      if (title && title.parentNode) title.parentNode.removeChild(title);
      if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
    }

    if (pick) {
      pick.classList.add('rzq-doc-pick');
      pick.removeAttribute('style');
    }
    if (err) {
      err.style.cssText = 'display:none;margin-top:7px;font-size:11.5px;color:#b91c1c;line-height:1.45';
    }
    /* keep input/list/err at end */
    if (input) zone.appendChild(input);
    if (pick) zone.appendChild(pick);
    if (list) zone.appendChild(list);
    if (err) zone.appendChild(err);
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error(t('تعذّر قراءة الملف', 'Lecture du fichier impossible'))); };
      reader.readAsDataURL(file);
    });
  }

  function validateDocFile(file) {
    if (!file) return { ok: false, error: t('لم يُختر ملف', 'Aucun fichier') };
    var mime = String(file.type || '').toLowerCase();
    if (!ALLOWED_DOC_TYPES[mime]) {
      var name = String(file.name || '').toLowerCase();
      if (/\.(jpe?g|png|webp|pdf)$/.test(name)) {
        mime = name.endsWith('.pdf') ? 'application/pdf'
          : name.endsWith('.png') ? 'image/png'
          : name.endsWith('.webp') ? 'image/webp'
          : 'image/jpeg';
      } else {
        return {
          ok: false,
          error: t('المسموح: صورة (JPG/PNG/WebP) أو PDF فقط', 'Autorisé : image (JPG/PNG/WebP) ou PDF'),
        };
      }
    }
    if (file.size > MAX_DOC_BYTES) {
      return {
        ok: false,
        error: t('حجم الملف كبير جداً (الحد 5MB)', 'Fichier trop volumineux (max 5 Mo)'),
      };
    }
    return { ok: true, mime: mime };
  }

  function getPendingDocs(form) {
    form = form || document.getElementById('req-form') || document.getElementById('store-req-form');
    if (!form) return [];
    return Array.isArray(form._rizqPendingDocs) ? form._rizqPendingDocs : [];
  }

  function setPendingDocs(form, list) {
    if (!form) return;
    form._rizqPendingDocs = Array.isArray(list) ? list : [];
    renderDocList(form);
  }

  function renderDocList(form) {
    var zone = form && form.querySelector('#rf-doc-upload');
    if (!zone) return;
    var listEl = zone.querySelector('#rf-doc-list');
    if (!listEl) return;
    var docs = getPendingDocs(form);
    if (!docs.length) {
      listEl.innerHTML = '';
      listEl.hidden = true;
      return;
    }
    listEl.hidden = false;
    listEl.innerHTML = docs.map(function (d, i) {
      var label = esc(d.name || ('doc-' + (i + 1)));
      var sizeKb = Math.max(1, Math.round((d.bytes || 0) / 1024));
      var isPdf = String(d.mime || '').indexOf('pdf') >= 0 || /\.pdf$/i.test(d.name || '');
      return '<div class="rf-doc-item">'
        + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
        + (isPdf ? '📄' : '🖼️') + ' ' + label
        + ' <span style="color:#6a7a8a">(' + sizeKb + ' KB)</span></span>'
        + '<button type="button" data-doc-remove="' + i + '">'
        + esc(t('حذف', 'Retirer')) + '</button></div>';
    }).join('');
    listEl.querySelectorAll('[data-doc-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = Number(btn.getAttribute('data-doc-remove'));
        var next = getPendingDocs(form).slice();
        if (idx >= 0 && idx < next.length) next.splice(idx, 1);
        setPendingDocs(form, next);
      });
    });
  }

  function addPendingFiles(form, files, showErr) {
    files = Array.prototype.slice.call(files || [], 0);
    if (!files.length) return;
    var current = getPendingDocs(form).slice();
    var room = MAX_DOC_COUNT - current.length;
    if (room <= 0) {
      showErr(t('الحد الأقصى 3 ملفات', 'Maximum 3 fichiers'));
      return;
    }
    files = files.slice(0, room);
    var chain = Promise.resolve();
    files.forEach(function (file) {
      chain = chain.then(function () {
        var check = validateDocFile(file);
        if (!check.ok) {
          showErr(check.error);
          return;
        }
        return readFileAsDataUrl(file).then(function (dataUrl) {
          current.push({
            name: String(file.name || 'payment-proof').slice(0, 80),
            bytes: file.size || 0,
            mime: check.mime,
            dataUrl: dataUrl,
          });
          setPendingDocs(form, current);
        });
      });
    });
    chain.catch(function (err) {
      showErr((err && err.message) || t('تعذّر رفع الملف', 'Échec du téléversement'));
    });
  }

  function wireDocUploadHandlers(form, zone) {
    if (!form || !zone || zone.getAttribute('data-wired') === '1') return;
    zone.setAttribute('data-wired', '1');
    if (!Array.isArray(form._rizqPendingDocs)) form._rizqPendingDocs = [];
    injectDocUploadCss();
    upgradeDocUploadMarkup(zone);

    var input = zone.querySelector('#rf-doc-file');
    var pick = zone.querySelector('#rf-doc-pick');
    var errEl = zone.querySelector('#rf-doc-error');

    function showErr(msg) {
      if (!errEl) return;
      if (!msg) { errEl.style.display = 'none'; errEl.textContent = ''; return; }
      errEl.style.display = 'block';
      errEl.textContent = msg;
    }

    if (pick && input) {
      pick.addEventListener('click', function () { input.click(); });
      input.addEventListener('change', function () {
        showErr('');
        var files = Array.prototype.slice.call(input.files || [], 0);
        input.value = '';
        addPendingFiles(form, files, showErr);
      });
    }

    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('is-drag');
      });
    });
    zone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('is-drag');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('is-drag');
      showErr('');
      addPendingFiles(form, e.dataTransfer && e.dataTransfer.files, showErr);
    });
  }

  function ensureDocUpload(form) {
    if (!form) return null;
    var existing = form.querySelector('#rf-doc-upload');
    if (existing) {
      refreshDocUploadLabels(form);
      wireDocUploadHandlers(form, existing);
      return existing;
    }

    // استبدال تلميح واتساب/إيميل القديم إن وُجد
    var oldHint = form.querySelector('#rf-docs-hint')
      || form.querySelector('[data-desk="docs-hint"]')
      || form.querySelector('.store-desk-note')
      || form.querySelector('.office-desk-note')
      || form.querySelector('.showroom-desk-note');

    injectDocUploadCss();
    var zone = document.createElement('div');
    zone.id = 'rf-doc-upload';
    zone.className = 'rzq-doc-zone';
    zone.setAttribute('data-desk', 'doc-upload');
    zone.innerHTML = ''
      + '<div class="rzq-doc-head">'
      + '<span class="rzq-doc-mark" aria-hidden="true">🧾</span>'
      + '<div class="rzq-doc-copy">'
      + '<div class="rzq-doc-title-row">'
      + '<div data-desk="doc-title"></div>'
      + '<span class="rzq-doc-badge" data-desk="doc-badge"></span>'
      + '</div>'
      + '<div data-desk="doc-hint"></div>'
      + '</div></div>'
      + '<input type="file" id="rf-doc-file" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" multiple hidden />'
      + '<button type="button" data-desk="doc-pick" id="rf-doc-pick" class="rzq-doc-pick"></button>'
      + '<div id="rf-doc-list" hidden></div>'
      + '<div id="rf-doc-error" style="display:none;margin-top:7px;font-size:11.5px;color:#b91c1c;line-height:1.45"></div>';
    zone.setAttribute('data-desk-polished', '1');

    if (oldHint && oldHint.parentNode) {
      oldHint.parentNode.replaceChild(zone, oldHint);
    } else {
      var actions = form.querySelector('.store-desk-actions')
        || form.querySelector('.office-desk-actions')
        || form.querySelector('.showroom-desk-actions');
      var btn = form.querySelector('#req-submit-btn')
        || form.querySelector('#store-req-submit')
        || form.querySelector('#sr-req-submit');
      if (actions && btn) actions.insertBefore(zone, btn);
      else if (btn) form.insertBefore(zone, btn);
      else form.appendChild(zone);
    }

    refreshDocUploadLabels(form);
    wireDocUploadHandlers(form, zone);
    return zone;
  }

  function ensureExtraFields(form) {
    if (!form) return;
    if (form.getAttribute('data-desk-enhanced') !== '1') {
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
    }
    ensureDocUpload(form);
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
    if (opts.skip || opts.hasAttachments) return;
    var channel = opts.docsChannel || 'platform';
    if (channel === 'platform') return;
    var name = opts.buyerName || '';
    var phone = opts.buyerPhone || '';
    var svc = opts.service || '';
    var reqId = opts.requestId || '';
    var text = t('طلب خدمة عبر رزق', 'Demande via Rizq')
      + (reqId ? ' #' + reqId : '')
      + ' — ' + name
      + (phone ? ' — ' + phone : '')
      + (svc ? ' — ' + svc : '');

    if (channel === 'email' || channel === 'both') {
      var mailBtn = document.getElementById('act-email') || document.querySelector('a[href^="mailto:"]');
      var href = mailBtn && mailBtn.getAttribute('href');
      if (href && href.indexOf('mailto:') === 0 && href.length > 8) {
        var sep = href.indexOf('?') >= 0 ? '&' : '?';
        window.open(href + sep + 'subject=' + encodeURIComponent(t('طلب خدمة — رزق', 'Demande — Rizq'))
          + '&body=' + encodeURIComponent(text), '_blank', 'noopener');
      }
    }
    if (channel === 'whatsapp' || channel === 'both') {
      var wa = document.getElementById('act-wa-top') || document.getElementById('sticky-wa')
        || document.querySelector('a[href*="wa.me"]');
      var waNum = '';
      if (wa && wa.href) {
        try {
          waNum = String(wa.href).split('wa.me/')[1] || '';
          waNum = waNum.split('?')[0].replace(/\D/g, '');
        } catch (e) { waNum = ''; }
      }
      if (waNum) {
        window.open('https://wa.me/' + waNum + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      }
    }
  }

  function submit(opts) {
    opts = opts || {};
    var form = opts.form
      || document.getElementById('req-form')
      || document.getElementById('store-req-form')
      || document.getElementById('sr-req-form')
      || document.getElementById('corp-req-form');
    var data = opts.data || collectForm(form);
    var check = validate(data);
    if (!check.ok) return Promise.reject(new Error(check.error));

    ensureDocUpload(form);
    var pending = getPendingDocs(form);
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
    if (pending.length) {
      payload.attachments = pending.map(function (d) { return d.dataUrl; });
      payload.attachmentNames = pending.map(function (d) { return d.name; });
    }

    var base = backendBase();
    var send = base && accountId
      ? fetch(base + '/api/service-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
      : Promise.resolve({ ok: false, status: 0, body: { error: 'offline' } });

    return send.then(function (res) {
      if (!res.ok && res.body && res.body.error) {
        var code = res.body.code || res.body.error;
        if (code === 'doc_too_large') {
          throw new Error(t('بيان الدفع كبير جداً (الحد 5MB)', 'Justificatif trop volumineux (max 5 Mo)'));
        }
        if (code === 'doc_type_not_allowed' || code === 'doc_mime_mismatch') {
          throw new Error(t('المسموح صورة أو PDF فقط', 'Image ou PDF uniquement'));
        }
        if (res.status >= 400 && res.body.error && res.body.error !== 'offline') {
          throw new Error(String(res.body.error));
        }
      }
      var reqId = res.body && (res.body.id || (res.body.request && res.body.request.id));
      var hasAtt = !!(pending.length || (res.body && res.body.request && res.body.request.hasAttachments));
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
            hasAttachments: !!pending.length,
            attachmentsMeta: pending.map(function (d) {
              return { name: d.name, bytes: d.bytes, mime: d.mime };
            }),
            _local: true,
          }));
          localStorage.setItem(key, JSON.stringify(list.slice(0, 80)));
          reqId = localId;
        } catch (e) { /* ignore */ }
      } else {
        setPendingDocs(form, []);
      }
      openDocsChannel({
        docsChannel: (res.body && res.body.request && res.body.request.docsChannel) || desk.docsChannel,
        buyerName: data.buyerName,
        buyerPhone: data.buyerPhone,
        service: data.service,
        requestId: reqId,
        hasAttachments: hasAtt,
      });
      var msg = hasAtt
        ? t(
          'تم استلام طلبك' + (reqId ? ' (' + reqId + ')' : '') + ' مع بيان الدفع على المنصة.',
          'Demande reçue' + (reqId ? ' (' + reqId + ')' : '') + ' avec justificatif sur la plateforme.'
        )
        : t(
          'تم استلام طلبك' + (reqId ? ' (' + reqId + ')' : '') + ' — يمكنك رفع بيان الدفع لاحقاً أو إرساله عبر واتساب/إيميل.',
          'Demande reçue' + (reqId ? ' (' + reqId + ')' : '') + ' — joignez un justificatif plus tard ou via WhatsApp/e-mail.'
        );
      return {
        ok: true,
        id: reqId,
        serverOk: !!res.ok,
        hasAttachments: hasAtt,
        message: msg,
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

  function openAttachment(requestId, attId, token) {
    var base = backendBase();
    if (!base || !requestId || !attId || !token) {
      return Promise.reject(new Error('missing'));
    }
    return fetch(
      base + '/api/service-requests/' + encodeURIComponent(requestId)
        + '/attachments/' + encodeURIComponent(attId),
      { headers: { 'x-account-token': token } }
    ).then(function (r) {
      if (!r.ok) throw new Error('download_failed');
      return r.blob().then(function (blob) {
        var url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }, 60000);
        return true;
      });
    });
  }

  function attachmentsHtml(request, tokenGetter) {
    var atts = (request && Array.isArray(request.attachments)) ? request.attachments : [];
    if (!atts.length) {
      if (request && request.hasAttachments) {
        return '<span style="font-size:12px;color:#0F766E;font-weight:600">📎 '
          + esc(t('بيان دفع مرفق', 'Justificatif joint')) + '</span>';
      }
      return '';
    }
    return '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">'
      + atts.map(function (a) {
        var label = esc(a.originalName || a.id || t('بيان دفع', 'Justificatif'));
        var rid = esc(request.id || '');
        var aid = esc(a.id || '');
        return '<button type="button" class="rf-open-att" data-req="' + rid + '" data-att="' + aid + '"'
          + ' style="padding:5px 10px;border:1px solid rgba(15,118,110,.35);border-radius:8px;background:rgba(15,118,110,.08);color:#0F766E;font-size:11.5px;font-weight:700;cursor:pointer">'
          + '📎 ' + label + '</button>';
      }).join('')
      + '</div>';
  }

  function bindAttachmentButtons(root, getToken) {
    root = root || document;
    var nodes = root.querySelectorAll ? root.querySelectorAll('.rf-open-att') : [];
    Array.prototype.forEach.call(nodes, function (btn) {
      if (btn.getAttribute('data-bound') === '1') return;
      btn.setAttribute('data-bound', '1');
      btn.addEventListener('click', function () {
        var token = typeof getToken === 'function' ? getToken() : getToken;
        openAttachment(btn.getAttribute('data-req'), btn.getAttribute('data-att'), token)
          .catch(function () {
            alert(t('تعذّر فتح بيان الدفع', 'Impossible d’ouvrir le justificatif'));
          });
      });
    });
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

  function loadBuyerProfile() {
    var session = null;
    var delivery = null;
    try { session = JSON.parse(localStorage.getItem('rizq_buyer_session') || 'null'); } catch (e) { session = null; }
    try { delivery = JSON.parse(localStorage.getItem('rizq_buyer_delivery') || 'null'); } catch (e2) { delivery = null; }
    if ((!session || !session.id) && !delivery) return null;
    var phone = (delivery && delivery.phone) || (session && (session.phone || session.phoneIntl || session.whatsapp)) || '';
    phone = String(phone || '').trim();
    if (/^\d{8}$/.test(phone)) phone = '+222' + phone;
    return {
      name: (delivery && delivery.name) || (session && session.name) || '',
      phone: phone,
      whatsapp: (session && session.whatsapp) || phone,
      email: (session && session.email) || '',
      city: (delivery && delivery.city) || (session && session.city) || '',
      address: (delivery && delivery.address) || (session && session.address) || '',
      fromAccount: !!(session && session.id)
    };
  }

  function formatPhoneForInput(raw) {
    var phone = String(raw || '').trim();
    if (/^\d{8}$/.test(phone)) return '+222' + phone;
    return phone;
  }

  function showBuyerAutofillHint(root, profile) {
    if (!root || !profile) return;
    var hintId = 'rf-buyer-autofill-hint';
    var existing = root.querySelector('#' + hintId) || document.getElementById(hintId);
    if (!profile.fromAccount && !profile.name) {
      if (existing) existing.remove();
      return;
    }
    var text = t(
      'تم تعبئة بياناتك من حسابك على رزق — يمكنك تعديلها قبل الإرسال.',
      'Vos infos Rizq ont été préremplies — vous pouvez les modifier avant l\'envoi.'
    );
    if (!existing) {
      existing = document.createElement('div');
      existing.id = hintId;
      existing.setAttribute('data-desk', 'buyer-autofill');
      existing.style.cssText = 'font-size:11.5px;color:#0F766E;line-height:1.55;margin:0 0 12px;padding:10px 12px;border-radius:10px;background:rgba(15,118,110,.06);border:1px solid rgba(15,118,110,.18)';
      var nameEl = root.querySelector('#rf-name') || document.getElementById('rf-name');
      if (nameEl && nameEl.parentNode) {
        var before = nameEl.previousElementSibling;
        if (before && before.tagName === 'LABEL') {
          before.insertAdjacentElement('beforebegin', existing);
        } else {
          nameEl.insertAdjacentElement('beforebegin', existing);
        }
      } else {
        root.insertBefore(existing, root.firstChild);
      }
    }
    existing.textContent = '✓ ' + text;
  }

  /**
   * يملأ حقول غرفة الطلبات من جلسة المشتري / معلومات التوصيل المؤكّدة.
   * لا يستبدل قيمة أدخلها المستخدم يدوياً إلا إذا force=true.
   */
  function autofillBuyerFields(opts) {
    opts = opts || {};
    var force = !!opts.force;
    var root = opts.root
      || document.getElementById('store-req-form')
      || document.getElementById('req-form')
      || document.getElementById('showroom-service-desk')
      || document;
    var profile = loadBuyerProfile();
    if (!profile) return null;

    var nameEl = root.querySelector ? (root.querySelector('#rf-name') || document.getElementById('rf-name')) : document.getElementById('rf-name');
    var phoneEl = root.querySelector ? (root.querySelector('#rf-phone') || document.getElementById('rf-phone')) : document.getElementById('rf-phone');
    var waEl = root.querySelector ? (root.querySelector('#rf-whatsapp') || document.getElementById('rf-whatsapp')) : document.getElementById('rf-whatsapp');
    var emailEl = root.querySelector ? (root.querySelector('#rf-email') || document.getElementById('rf-email')) : document.getElementById('rf-email');
    var cityEl = root.querySelector ? (root.querySelector('#rf-city') || document.getElementById('rf-city')) : document.getElementById('rf-city');
    var addrEl = root.querySelector ? (root.querySelector('#rf-address') || document.getElementById('rf-address')) : document.getElementById('rf-address');

    var filled = false;
    function apply(el, val) {
      if (!el || !val) return;
      if (force || !String(el.value || '').trim()) {
        el.value = val;
        filled = true;
      }
    }
    apply(nameEl, profile.name);
    apply(phoneEl, formatPhoneForInput(profile.phone));
    apply(waEl, formatPhoneForInput(profile.whatsapp));
    apply(emailEl, profile.email);
    apply(cityEl, profile.city);
    apply(addrEl, profile.address);

    if (filled || profile.fromAccount) {
      var hintRoot = (nameEl && nameEl.closest && (nameEl.closest('#store-req-form') || nameEl.closest('#req-form') || nameEl.closest('.info-card') || nameEl.closest('.req-box'))) || root;
      showBuyerAutofillHint(hintRoot, profile);
    }
    return profile;
  }

  function clearRequestMessageFields(root) {
    root = root || document;
    ['rf-service', 'rf-msg'].forEach(function (id) {
      var el = (root.querySelector && root.querySelector('#' + id)) || document.getElementById(id);
      if (el) el.value = '';
    });
    var form = (root.querySelector && (
      root.querySelector('#store-req-form')
      || root.querySelector('#req-form')
      || root.querySelector('#sr-req-form')
      || root.querySelector('#corp-req-form')
    )) || root;
    if (form && form.id && (form.id === 'store-req-form' || form.id === 'req-form' || form.id === 'sr-req-form' || form.id === 'corp-req-form')) {
      setPendingDocs(form, []);
    } else if (form && form._rizqPendingDocs) {
      setPendingDocs(form, []);
    }
  }

  function enhanceOfficeForm(opts) {
    opts = opts || {};
    var form = document.getElementById('req-form')
      || document.getElementById('store-req-form')
      || document.getElementById('sr-req-form');
    var box = form && (form.closest('.req-box') || form.closest('.info-card') || form.closest('#store-service-desk') || form.closest('#showroom-service-desk'));
    ensureExtraFields(form);
    applyPublicLabels(box || document, opts.desk, opts.accountName);
    var nameEl = document.getElementById('rf-name');
    if (nameEl) nameEl.placeholder = t('الاسم الكامل *', 'Nom complet *');
    autofillBuyerFields({ root: form || document, force: !!opts.forceAutofill });
  }

  function bootAutofill() {
    try {
    var form = document.getElementById('store-req-form')
      || document.getElementById('req-form')
      || document.getElementById('sr-req-form')
      || document.getElementById('corp-req-form');
      if (form) ensureExtraFields(form);
      autofillBuyerFields({ force: false });
    } catch (e) { /* ignore */ }
  }
  try { injectDocUploadCss(); } catch (eCss) { /* ignore */ }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAutofill);
  } else {
    setTimeout(bootAutofill, 0);
  }

  global.RizqServiceDesk = {
    normalizeDesk: normalizeDesk,
    enhanceOfficeForm: enhanceOfficeForm,
    applyPublicLabels: applyPublicLabels,
    ensureDocUpload: ensureDocUpload,
    autofillBuyerFields: autofillBuyerFields,
    loadBuyerProfile: loadBuyerProfile,
    clearRequestMessageFields: clearRequestMessageFields,
    collectForm: collectForm,
    validate: validate,
    submit: submit,
    listMine: listMine,
    setStatus: setStatus,
    saveDeskSettings: saveDeskSettings,
    openDocsChannel: openDocsChannel,
    openAttachment: openAttachment,
    attachmentsHtml: attachmentsHtml,
    bindAttachmentButtons: bindAttachmentButtons,
  };
})(typeof window !== 'undefined' ? window : globalThis);
