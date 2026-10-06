/**
 * rizq_prefacture_engine.js
 * ═══════════════════════════════════════════════════════════════════
 * PREFACTUR — فاتورة قبل
 * مستند تجاري قبل الدفع لإتمام الصفقات عبر منصة رزق
 * (محلات · معارض · مكاتب · مناقصات)
 *
 * دورة الحالة:
 *   draft → sent → awaiting_payment → paid → fulfilled → approved
 *
 * قبل الدفع: الزبون يرى PREFACTUR ويراجع البنود.
 * بعد التسليم/تقديم الخدمة: تنزيل أو موافقة + ختم إنجاز الصفقة.
 * تخزين محلي (localStorage) — جاهز لاحقاً لربط API.
 * ═══════════════════════════════════════════════════════════════════
 */
(function (global) {
  'use strict';

  var KEY = 'rizq_prefactures';
  var KEY_SEQ = 'rizq_prefacture_seq';
  var BRAND = 'PREFACTUR';

  var STATUS = {
    draft: 'draft',
    sent: 'sent',
    awaiting_payment: 'awaiting_payment',
    paid: 'paid',
    fulfilled: 'fulfilled',
    approved: 'approved',
    cancelled: 'cancelled'
  };

  var MODULE_STAMP = {
    store: {
      ar: 'تم البيع عبر منصة رزق الإلكترونية',
      fr: 'Vente conclue via la plateforme électronique Rizq'
    },
    showroom: {
      ar: 'تم البيع عبر منصة رزق الإلكترونية',
      fr: 'Vente conclue via la plateforme électronique Rizq'
    },
    office: {
      ar: 'تم تقديم الخدمة عبر منصة رزق الإلكترونية',
      fr: 'Service rendu via la plateforme électronique Rizq'
    },
    tender: {
      ar: 'تمت المناقصة عبر منصة رزق الإلكترونية',
      fr: 'Appel d’offres clôturé via la plateforme électronique Rizq'
    },
    investment: {
      ar: 'تمت الصفقة الاستثمارية عبر منصة رزق الإلكترونية',
      fr: 'Opération d’investissement conclue via Rizq'
    }
  };

  function _isFr() {
    try {
      return (document.documentElement.lang || '').toLowerCase().indexOf('fr') === 0
        || (document.documentElement.dir || '') === 'ltr';
    } catch (e) { return false; }
  }

  function _t(ar, fr) { return _isFr() ? fr : ar; }

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function _load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function _save(arr) {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {}
  }

  function _nextNumber() {
    var year = new Date().getFullYear();
    var seq = 1;
    try { seq = parseInt(localStorage.getItem(KEY_SEQ) || '0', 10) + 1; } catch (e) {}
    try { localStorage.setItem(KEY_SEQ, String(seq)); } catch (e) {}
    return 'PRF-' + year + '-' + String(seq).padStart(6, '0');
  }

  function _fmtMoney(n) {
    n = Number(n) || 0;
    return n.toLocaleString(_isFr() ? 'fr-FR' : 'ar-EG-u-nu-latn') + ' MRU';
  }

  function _fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(_isFr() ? 'fr-FR' : 'ar-EG-u-nu-latn', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
    } catch (e) { return iso || '—'; }
  }

  function _stamp(mod) {
    return MODULE_STAMP[mod] || MODULE_STAMP.store;
  }

  function _statusLabel(st) {
    var map = {
      draft: [_t('مسودة', 'Brouillon'), '#94a3b8'],
      sent: [_t('مرسلة للزبون', 'Envoyée au client'), '#38bdf8'],
      awaiting_payment: [_t('بانتظار الدفع', 'En attente de paiement'), '#f59e0b'],
      paid: [_t('مدفوعة', 'Payée'), '#22c55e'],
      fulfilled: [_t('تم التسليم / الخدمة', 'Livré / Service rendu'), '#0ea5e9'],
      approved: [_t('موافق عليها', 'Approuvée'), '#C9A84C'],
      cancelled: [_t('ملغاة', 'Annulée'), '#ef4444']
    };
    return map[st] || map.draft;
  }

  function _normalizeLines(lines) {
    return (lines || []).map(function (ln, i) {
      var qty = Number(ln.qty != null ? ln.qty : 1) || 1;
      var unit = Number(ln.unitPrice != null ? ln.unitPrice : ln.price) || 0;
      return {
        id: ln.id || ('L' + (i + 1)),
        name: String(ln.name || ln.title || _t('بند', 'Article')),
        qty: qty,
        unitPrice: unit,
        total: Math.round(qty * unit)
      };
    });
  }

  function _totals(lines) {
    var sub = 0;
    for (var i = 0; i < lines.length; i++) sub += Number(lines[i].total) || 0;
    return { subtotal: sub, total: sub, currency: 'MRU' };
  }

  /**
   * create({
   *   module: 'store'|'showroom'|'office'|'tender',
   *   sellerAccountId, sellerName, sellerPhone,
   *   buyerName, buyerPhone, buyerNote,
   *   lines: [{name, qty, unitPrice}],
   *   status?, meta?
   * })
   */
  function create(opts) {
    opts = opts || {};
    var lines = _normalizeLines(opts.lines);
    if (!lines.length) return null;
    var tot = _totals(lines);
    var mod = opts.module || 'store';
    var doc = {
      id: 'PRF_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      number: _nextNumber(),
      brand: BRAND,
      titleAr: 'فاتورة قبل',
      titleFr: 'Préfacture',
      module: mod,
      sellerAccountId: opts.sellerAccountId || '',
      sellerName: opts.sellerName || '',
      sellerPhone: opts.sellerPhone || '',
      buyerName: opts.buyerName || '',
      buyerPhone: opts.buyerPhone || '',
      buyerNote: opts.buyerNote || '',
      lines: lines,
      subtotal: tot.subtotal,
      total: tot.total,
      currency: 'MRU',
      status: opts.status || STATUS.sent,
      stamp: _stamp(mod),
      meta: opts.meta || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paidAt: null,
      fulfilledAt: null,
      approvedAt: null,
      expiresAt: opts.expiresAt || new Date(Date.now() + 7 * 864e5).toISOString()
    };
    var all = _load();
    all.unshift(doc);
    _save(all);
    return doc;
  }

  function get(id) {
    return _load().find(function (d) { return d.id === id || d.number === id; }) || null;
  }

  function listForSeller(accountId) {
    return _load().filter(function (d) { return d.sellerAccountId === accountId; });
  }

  function listAll() { return _load(); }

  function _patch(id, mutator) {
    var all = _load();
    var idx = -1;
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id || all[i].number === id) { idx = i; break; }
    }
    if (idx < 0) return null;
    mutator(all[idx]);
    all[idx].updatedAt = new Date().toISOString();
    _save(all);
    return all[idx];
  }

  function setStatus(id, status) {
    return _patch(id, function (d) {
      d.status = status;
      if (status === STATUS.paid) d.paidAt = new Date().toISOString();
      if (status === STATUS.fulfilled) d.fulfilledAt = new Date().toISOString();
      if (status === STATUS.approved) d.approvedAt = new Date().toISOString();
    });
  }

  function markAwaitingPayment(id) { return setStatus(id, STATUS.awaiting_payment); }
  function markPaid(id) { return setStatus(id, STATUS.paid); }
  function markFulfilled(id) { return setStatus(id, STATUS.fulfilled); }
  function markApproved(id) { return setStatus(id, STATUS.approved); }

  function createFromCart(opts) {
    opts = opts || {};
    var cart = [];
    try { cart = JSON.parse(localStorage.getItem('rizq_cart') || '[]'); } catch (e) { cart = []; }
    if (!cart.length) return null;
    var lines = cart.map(function (it) {
      return {
        id: it.id,
        name: it.name || it.title || 'Item',
        qty: it.qty || it.quantity || 1,
        unitPrice: it.price || it.unitPrice || 0
      };
    });
    return create({
      module: opts.module || 'store',
      sellerAccountId: opts.sellerAccountId || (cart[0] && (cart[0].storeId || cart[0].accountId)) || '',
      sellerName: opts.sellerName || (cart[0] && cart[0].storeName) || '',
      sellerPhone: opts.sellerPhone || '',
      buyerName: opts.buyerName || '',
      buyerPhone: opts.buyerPhone || '',
      buyerNote: opts.buyerNote || '',
      lines: lines,
      status: STATUS.sent,
      meta: { source: 'cart' }
    });
  }

  function createFromItem(opts) {
    opts = opts || {};
    if (!opts.name && !opts.title) return null;
    return create({
      module: opts.module || 'showroom',
      sellerAccountId: opts.sellerAccountId || '',
      sellerName: opts.sellerName || '',
      sellerPhone: opts.sellerPhone || '',
      buyerName: opts.buyerName || '',
      buyerPhone: opts.buyerPhone || '',
      lines: [{
        id: opts.id,
        name: opts.name || opts.title,
        qty: opts.qty || 1,
        unitPrice: opts.unitPrice != null ? opts.unitPrice : (opts.price || 0)
      }],
      status: STATUS.sent,
      meta: opts.meta || { source: 'item' }
    });
  }

  function createFromService(opts) {
    opts = opts || {};
    return create({
      module: 'office',
      sellerAccountId: opts.sellerAccountId || '',
      sellerName: opts.sellerName || '',
      sellerPhone: opts.sellerPhone || '',
      buyerName: opts.buyerName || '',
      buyerPhone: opts.buyerPhone || '',
      buyerNote: opts.buyerNote || '',
      lines: [{
        id: opts.id,
        name: opts.name || opts.title || _t('خدمة مكتبية', 'Service de bureau'),
        qty: 1,
        unitPrice: opts.unitPrice != null ? opts.unitPrice : (opts.price || 0)
      }],
      status: STATUS.sent,
      meta: Object.assign({ source: 'service' }, opts.meta || {})
    });
  }

  function renderDocumentHTML(doc) {
    if (!doc) return '';
    var st = _statusLabel(doc.status);
    var stampAr = (doc.stamp && doc.stamp.ar) || MODULE_STAMP.store.ar;
    var stampFr = (doc.stamp && doc.stamp.fr) || MODULE_STAMP.store.fr;
    var showStamp = doc.status === STATUS.fulfilled || doc.status === STATUS.approved;
    var rows = (doc.lines || []).map(function (ln) {
      return '<tr>'
        + '<td style="padding:10px;border-top:1px solid #e5e7eb">' + _esc(ln.name) + '</td>'
        + '<td style="padding:10px;border-top:1px solid #e5e7eb;text-align:center">' + _esc(ln.qty) + '</td>'
        + '<td style="padding:10px;border-top:1px solid #e5e7eb">' + _esc(_fmtMoney(ln.unitPrice)) + '</td>'
        + '<td style="padding:10px;border-top:1px solid #e5e7eb;font-weight:700">' + _esc(_fmtMoney(ln.total)) + '</td>'
        + '</tr>';
    }).join('');

    return '<!DOCTYPE html><html lang="' + (_isFr() ? 'fr' : 'ar') + '" dir="' + (_isFr() ? 'ltr' : 'rtl') + '"><head><meta charset="UTF-8">'
      + '<title>' + _esc(BRAND) + ' ' + _esc(doc.number) + '</title>'
      + '<style>@media print{.no-print{display:none!important}}</style></head>'
      + '<body style="margin:0;background:#f4f6fa;font-family:\'Segoe UI\',Tahoma,Arial,sans-serif">'
      + '<div style="max-width:720px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(13,27,42,.12)">'
      + '<div style="background:linear-gradient(135deg,#0F2347,#0D1B2A);color:#fff;padding:22px 24px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start">'
      + '<div><div style="font-size:11px;letter-spacing:2px;color:#E8C96A;font-weight:800">' + BRAND + '</div>'
      + '<div style="font-size:22px;font-weight:900;margin-top:4px">' + _esc(_t('فاتورة قبل', 'Préfacture')) + '</div>'
      + '<div style="font-size:12px;opacity:.75;margin-top:4px">Rizq · ADMINIA SARL</div></div>'
      + '<div style="text-align:' + (_isFr() ? 'right' : 'left') + '">'
      + '<div style="font-size:12px;opacity:.7">' + _esc(_t('الرقم', 'N°')) + '</div>'
      + '<div style="font-weight:800;color:#E8C96A">' + _esc(doc.number) + '</div>'
      + '<div style="font-size:12px;margin-top:6px">' + _esc(_fmtDate(doc.createdAt)) + '</div>'
      + '<div style="margin-top:8px;display:inline-block;padding:4px 10px;border-radius:10px;background:rgba(255,255,255,.1);font-size:11px;font-weight:700;color:' + st[1] + '">' + _esc(st[0]) + '</div>'
      + '</div></div>'
      + '<div style="padding:22px 24px">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">'
      + '<div style="background:#f8faff;border-radius:12px;padding:12px"><div style="font-size:11px;color:#6b7280;margin-bottom:4px">' + _esc(_t('البائع / مقدّم الخدمة', 'Vendeur / Prestataire')) + '</div>'
      + '<div style="font-weight:800;color:#0F2347">' + _esc(doc.sellerName || '—') + '</div>'
      + (doc.sellerPhone ? '<div style="font-size:12px;margin-top:4px;direction:ltr;text-align:inherit">' + _esc(doc.sellerPhone) + '</div>' : '')
      + '</div>'
      + '<div style="background:#f8faff;border-radius:12px;padding:12px"><div style="font-size:11px;color:#6b7280;margin-bottom:4px">' + _esc(_t('الزبون', 'Client')) + '</div>'
      + '<div style="font-weight:800;color:#0F2347">' + _esc(doc.buyerName || _t('زبون رزق', 'Client Rizq')) + '</div>'
      + (doc.buyerPhone ? '<div style="font-size:12px;margin-top:4px;direction:ltr;text-align:inherit">' + _esc(doc.buyerPhone) + '</div>' : '')
      + '</div></div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">'
      + '<thead><tr style="background:#0F2347;color:#E8C96A">'
      + '<th style="padding:10px;text-align:inherit">' + _esc(_t('البيان', 'Désignation')) + '</th>'
      + '<th style="padding:10px;text-align:center">' + _esc(_t('الكمية', 'Qté')) + '</th>'
      + '<th style="padding:10px;text-align:inherit">' + _esc(_t('السعر', 'Prix')) + '</th>'
      + '<th style="padding:10px;text-align:inherit">' + _esc(_t('المجموع', 'Total')) + '</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table>'
      + '<div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">'
      + '<div style="font-size:11px;color:#6b7280;max-width:55%;line-height:1.6">'
      + _esc(_t(
        'هذه فاتورة قبل (PREFACTUR) للاطلاع قبل الدفع. تصبح نهائية بعد التسليم أو تقديم الخدمة وموافقة الزبون.',
        'Cette préfacture (PREFACTUR) est consultable avant paiement. Elle devient définitive après livraison/service et approbation client.'
      ))
      + '</div>'
      + '<div style="font-size:18px;font-weight:900;color:#0F2347">' + _esc(_t('الإجمالي', 'Total')) + ': <span style="color:#C9A84C">' + _esc(_fmtMoney(doc.total)) + '</span></div>'
      + '</div>'
      + (showStamp
        ? '<div style="margin-top:22px;padding:14px;border:2px dashed #C9A84C;border-radius:12px;background:linear-gradient(135deg,rgba(201,168,76,.08),rgba(15,35,71,.04));text-align:center">'
          + '<div style="font-size:10px;letter-spacing:2px;color:#C9A84C;font-weight:800">' + BRAND + ' · RIZQ</div>'
          + '<div style="font-size:15px;font-weight:900;color:#0F2347;margin-top:6px">' + _esc(_isFr() ? stampFr : stampAr) + '</div>'
          + '</div>'
        : '')
      + '<div style="margin-top:18px;font-size:10px;color:#9aa3b2;line-height:1.6">'
      + _esc(_t(
        'مستند تجاري داخلي عبر منصة رزق — لا يُعد فاتورة ضريبية رسمية ما لم يُصدر البائع فاتورة جبائية مستقلة.',
        'Document commercial interne via Rizq — ne constitue pas une facture fiscale officielle sauf émission séparée par le vendeur.'
      ))
      + '</div>'
      + '</div></div></body></html>';
  }

  function openPrint(id) {
    var doc = get(id);
    if (!doc) return false;
    var w = window.open('', '_blank');
    if (!w) return false;
    w.document.write(renderDocumentHTML(doc));
    w.document.close();
    w.focus();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 350);
    return true;
  }

  function shareWhatsApp(id, phone) {
    var doc = get(id);
    if (!doc) return '';
    var link = location.origin + location.pathname.replace(/[^/]*$/, '') + 'rizq_prefacture.html?id=' + encodeURIComponent(doc.id);
    var msg = BRAND + ' · ' + _t('فاتورة قبل', 'Préfacture') + ' ' + doc.number + '\n'
      + _t('الإجمالي', 'Total') + ': ' + _fmtMoney(doc.total) + '\n'
      + link;
    var digits = String(phone || doc.sellerPhone || '').replace(/\D/g, '');
    var href = 'https://wa.me/' + (digits || '') + '?text=' + encodeURIComponent(msg);
    try { window.open(href, '_blank', 'noopener'); } catch (e) {}
    return href;
  }

  /* ── Modal UI ── */
  function _ensureCss() {
    if (document.getElementById('rizq-prefacture-css')) return;
    var link = document.createElement('link');
    link.id = 'rizq-prefacture-css';
    link.rel = 'stylesheet';
    link.href = 'rizq_prefacture.css?v=28.1';
    document.head.appendChild(link);
  }

  function _canPay(doc) {
    return doc.status === STATUS.sent || doc.status === STATUS.awaiting_payment || doc.status === STATUS.draft;
  }
  function _canFulfill(doc) {
    return doc.status === STATUS.paid || doc.status === STATUS.awaiting_payment;
  }
  function _canApprove(doc) {
    return doc.status === STATUS.fulfilled || doc.status === STATUS.paid;
  }
  function _canDownload(doc) {
    return doc.status === STATUS.fulfilled || doc.status === STATUS.approved || doc.status === STATUS.paid;
  }

  function closeModal() {
    var el = document.getElementById('rizq-prf-overlay');
    if (el) el.remove();
  }

  function openModal(id) {
    _ensureCss();
    var doc = typeof id === 'object' ? id : get(id);
    if (!doc) return false;
    closeModal();

    var st = _statusLabel(doc.status);
    var linesHtml = (doc.lines || []).map(function (ln) {
      return '<div class="rizq-prf-line">'
        + '<div class="rizq-prf-line-name">' + _esc(ln.name) + '</div>'
        + '<div class="rizq-prf-line-meta">' + _esc(ln.qty) + ' × ' + _esc(_fmtMoney(ln.unitPrice)) + '</div>'
        + '<div class="rizq-prf-line-total">' + _esc(_fmtMoney(ln.total)) + '</div>'
        + '</div>';
    }).join('');

    var actions = '';
    if (_canPay(doc)) {
      actions += '<button type="button" class="rizq-prf-btn rizq-prf-btn-pay" data-prf-act="pay">'
        + _esc(_t('ادفع · PREFACTUR', 'Payer · PREFACTUR')) + '</button>';
    }
    if (_canFulfill(doc)) {
      actions += '<button type="button" class="rizq-prf-btn rizq-prf-btn-fulfill" data-prf-act="fulfill">'
        + _esc(_t('تأكيد التسليم / الخدمة', 'Confirmer livraison / service')) + '</button>';
    }
    if (_canApprove(doc)) {
      actions += '<button type="button" class="rizq-prf-btn rizq-prf-btn-approve" data-prf-act="approve">'
        + _esc(_t('موافقة الزبون', 'Approbation client')) + '</button>';
    }
    if (_canDownload(doc) || doc.status === STATUS.sent || doc.status === STATUS.awaiting_payment) {
      actions += '<button type="button" class="rizq-prf-btn rizq-prf-btn-dl" data-prf-act="download">'
        + _esc(_t('تنزيل / طباعة', 'Télécharger / Imprimer')) + '</button>';
    }
    actions += '<button type="button" class="rizq-prf-btn rizq-prf-btn-wa" data-prf-act="wa">'
      + _esc(_t('مشاركة واتساب', 'Partager WhatsApp')) + '</button>';

    var stampBlock = '';
    if (doc.status === STATUS.fulfilled || doc.status === STATUS.approved) {
      stampBlock = '<div class="rizq-prf-stamp">'
        + '<span class="rizq-prf-stamp-brand">' + BRAND + '</span>'
        + '<strong>' + _esc(_isFr() ? doc.stamp.fr : doc.stamp.ar) + '</strong>'
        + '</div>';
    }

    var overlay = document.createElement('div');
    overlay.id = 'rizq-prf-overlay';
    overlay.className = 'rizq-prf-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="rizq-prf-sheet">'
      + '<button type="button" class="rizq-prf-close" data-prf-act="close" aria-label="close">×</button>'
      + '<div class="rizq-prf-head">'
      + '<div class="rizq-prf-brand">' + BRAND + '</div>'
      + '<h2>' + _esc(_t('فاتورة قبل', 'Préfacture')) + '</h2>'
      + '<div class="rizq-prf-num">' + _esc(doc.number) + '</div>'
      + '<span class="rizq-prf-status" style="--prf-st:' + st[1] + '">' + _esc(st[0]) + '</span>'
      + '</div>'
      + '<p class="rizq-prf-lead">' + _esc(_t(
        'راجع البنود قبل الدفع. بعد التسليم أو تقديم الخدمة يمكنك التنزيل أو الموافقة النهائية.',
        'Consultez les lignes avant paiement. Après livraison ou service, téléchargez ou approuvez définitivement.'
      )) + '</p>'
      + '<div class="rizq-prf-parties">'
      + '<div><span>' + _esc(_t('البائع', 'Vendeur')) + '</span><strong>' + _esc(doc.sellerName || '—') + '</strong></div>'
      + '<div><span>' + _esc(_t('الزبون', 'Client')) + '</span><strong>' + _esc(doc.buyerName || _t('أنت', 'Vous')) + '</strong></div>'
      + '</div>'
      + '<div class="rizq-prf-lines">' + linesHtml + '</div>'
      + '<div class="rizq-prf-total">' + _esc(_t('الإجمالي', 'Total')) + ' <strong>' + _esc(_fmtMoney(doc.total)) + '</strong></div>'
      + stampBlock
      + '<div class="rizq-prf-actions">' + actions + '</div>'
      + '<p class="rizq-prf-disc">' + _esc(_t(
        'PREFACTUR هو المسار التجاري لإتمام الصفقات على رزق — محلات، معارض، مكاتب.',
        'PREFACTUR est le parcours commercial pour conclure sur Rizq — magasins, showrooms, bureaux.'
      )) + '</p>'
      + '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
      var btn = e.target.closest('[data-prf-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-prf-act');
      if (act === 'close') { closeModal(); return; }
      if (act === 'pay') {
        markAwaitingPayment(doc.id);
        markPaid(doc.id);
        if (typeof global.showToast === 'function') {
          global.showToast(_t('✅ تم تسجيل الدفع على PREFACTUR — بانتظار التسليم/الخدمة', '✅ Paiement PREFACTUR enregistré — en attente de livraison/service'), 'success');
        }
        openModal(doc.id);
        return;
      }
      if (act === 'fulfill') {
        markFulfilled(doc.id);
        if (typeof global.showToast === 'function') {
          global.showToast(_t('✅ تم تأكيد التسليم/الخدمة — يمكن التنزيل أو الموافقة', '✅ Livraison/service confirmés — téléchargement ou approbation'), 'success');
        }
        openModal(doc.id);
        return;
      }
      if (act === 'approve') {
        if (doc.status !== STATUS.fulfilled) markFulfilled(doc.id);
        markApproved(doc.id);
        if (typeof global.showToast === 'function') {
          global.showToast(_t('✅ وافق الزبون على الفاتورة النهائية', '✅ Client a approuvé la facture finale'), 'success');
        }
        openModal(doc.id);
        return;
      }
      if (act === 'download') { openPrint(doc.id); return; }
      if (act === 'wa') { shareWhatsApp(doc.id); }
    });

    return true;
  }

  function issueAndOpen(opts) {
    var doc = create(opts);
    if (!doc) return null;
    openModal(doc.id);
    return doc;
  }

  /* Auto-open from ?prefacture= / ?prf= */
  function bootFromQuery() {
    try {
      var p = new URLSearchParams(location.search);
      var id = p.get('prefacture') || p.get('prf') || p.get('id');
      if (!id) return;
      if (/rizq_prefacture\.html/i.test(location.pathname) || p.get('prefacture') || p.get('prf')) {
        setTimeout(function () { openModal(id); }, 200);
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootFromQuery);
  } else {
    bootFromQuery();
  }

  global.RizqPrefacture = {
    BRAND: BRAND,
    STATUS: STATUS,
    create: create,
    createFromCart: createFromCart,
    createFromItem: createFromItem,
    createFromService: createFromService,
    get: get,
    listAll: listAll,
    listForSeller: listForSeller,
    setStatus: setStatus,
    markAwaitingPayment: markAwaitingPayment,
    markPaid: markPaid,
    markFulfilled: markFulfilled,
    markApproved: markApproved,
    renderDocumentHTML: renderDocumentHTML,
    openPrint: openPrint,
    openModal: openModal,
    closeModal: closeModal,
    issueAndOpen: issueAndOpen,
    shareWhatsApp: shareWhatsApp
  };
})(typeof window !== 'undefined' ? window : this);
