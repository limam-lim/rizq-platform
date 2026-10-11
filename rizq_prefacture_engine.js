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

  function _totals(lines, deliveryFee) {
    var sub = 0;
    for (var i = 0; i < lines.length; i++) sub += Number(lines[i].total) || 0;
    var fee = Math.max(0, Number(deliveryFee) || 0);
    return { subtotal: sub, deliveryFee: fee, total: sub + fee, currency: 'MRU' };
  }

  function _normalizePaymentMethods(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 10).map(function (m) {
      return {
        type: String((m && m.type) || 'bank').slice(0, 40),
        bank: String((m && m.bank) || '').slice(0, 120),
        code: String((m && m.code) || '').slice(0, 120),
        phone: String((m && m.phone) || '').slice(0, 40),
        account: String((m && (m.account || m.iban || m.accountNumber)) || '').slice(0, 80),
        note: String((m && m.note) || '').slice(0, 300),
        channelKey: String((m && m.channelKey) || '').slice(0, 20),
        channelValue: String((m && m.channelValue) || '').slice(0, 120),
        channelLabelAr: String((m && m.channelLabelAr) || '').slice(0, 80),
        channelLabelFr: String((m && m.channelLabelFr) || '').slice(0, 80),
        channelIcon: String((m && m.channelIcon) || '').slice(0, 8)
      };
    }).filter(function (m) {
      return m.bank || m.code || m.phone || m.account || m.channelValue
        || m.type === 'cash' || m.type === 'instore';
    });
  }

  function _normalizeSelectedPayment(sel, methods) {
    if (sel && typeof sel === 'object') {
      var key = String(sel.channelKey || '').slice(0, 20);
      var val = String(sel.channelValue || '').slice(0, 120);
      if (!val && key === 'code') val = String(sel.code || '').slice(0, 120);
      if (!val && key === 'phone') val = String(sel.phone || '').slice(0, 40);
      if (!val && key === 'account') val = String(sel.account || sel.iban || '').slice(0, 80);
      var out = {
        type: String(sel.type || (sel.method && sel.method.type) || 'bank').slice(0, 40),
        bank: String(sel.bank || (sel.method && sel.method.bank) || '').slice(0, 120),
        note: String(sel.note || (sel.method && sel.method.note) || '').slice(0, 300),
        channelKey: key,
        channelValue: val,
        channelLabelAr: String(sel.channelLabelAr || '').slice(0, 80),
        channelLabelFr: String(sel.channelLabelFr || '').slice(0, 80),
        channelIcon: String(sel.channelIcon || '').slice(0, 8)
      };
      if (out.type === 'cash' || out.type === 'instore' || out.channelValue || out.bank) return out;
    }
    /* توافق: أول وسيلة مع قناة واحدة إن وُجدت */
    var list = _normalizePaymentMethods(methods);
    if (list.length === 1) {
      var m = list[0];
      if (m.channelKey && m.channelValue) return m;
      if (m.type === 'cash' || m.type === 'instore') {
        return {
          type: m.type, bank: m.bank, note: m.note,
          channelKey: m.type, channelValue: '',
          channelLabelAr: m.type === 'instore' ? 'الدفع عند الاستلام من المحل' : 'الدفع نقداً عند التوصيل',
          channelLabelFr: m.type === 'instore' ? 'Paiement au retrait en magasin' : 'Paiement en espèces à la livraison',
          channelIcon: m.type === 'instore' ? '🏪' : '💵'
        };
      }
      if (m.code) return Object.assign({}, m, { channelKey: 'code', channelValue: m.code, channelLabelAr: 'عن طريق الرمز', channelLabelFr: 'Par code', channelIcon: '🔢' });
      if (m.phone) return Object.assign({}, m, { channelKey: 'phone', channelValue: m.phone, channelLabelAr: 'عن طريق رقم الهاتف', channelLabelFr: 'Par téléphone', channelIcon: '📞' });
      if (m.account) return Object.assign({}, m, { channelKey: 'account', channelValue: m.account, channelLabelAr: 'عن طريق التحويل البنكي', channelLabelFr: 'Par virement bancaire', channelIcon: '🏦' });
    }
    return null;
  }

  function _payTypeLabel(type) {
    var map = {
      bank: _t('تحويل بنكي', 'Virement bancaire'),
      bankily: 'Bankily',
      sedad: 'Sedad',
      bimbam: 'Bimbam',
      mobile: _t('محفظة رقمية', 'Portefeuille mobile'),
      cash: _t('نقداً عند التوصيل', 'Espèces à la livraison'),
      instore: _t('الدفع في المحل', 'Paiement en magasin'),
      custom: _t('طريقة أخرى', 'Autre moyen')
    };
    return map[type] || _t('دفع', 'Paiement');
  }

  function _channelLabel(pay) {
    if (!pay) return '';
    if (_isFr()) {
      if (pay.channelLabelFr) return pay.channelLabelFr;
    } else if (pay.channelLabelAr) {
      return pay.channelLabelAr;
    }
    var map = {
      code: _t('عن طريق الرمز', 'Par code'),
      phone: _t('عن طريق رقم الهاتف', 'Par téléphone'),
      account: _t('عن طريق التحويل البنكي', 'Par virement bancaire'),
      cash: _t('نقداً عند التوصيل', 'Espèces à la livraison'),
      instore: _t('الدفع عند الاستلام من المحل', 'Paiement au retrait en magasin')
    };
    return map[pay.channelKey] || _payTypeLabel(pay.type);
  }

  function _deliveryMeta(doc) {
    var type = String((doc && doc.deliveryType) || '').toLowerCase();
    if (type !== 'delivery' && type !== 'pickup') {
      if (doc && doc.selectedPayment && doc.selectedPayment.type === 'instore') type = 'pickup';
      else if (doc && doc.selectedPayment && doc.selectedPayment.type === 'cash') type = 'delivery';
      else type = '';
    }
    if (!type) return null;
    var fee = Math.max(0, Number(doc.deliveryFee) || 0);
    if (type === 'pickup') {
      return {
        type: 'pickup',
        icon: '🏪',
        label: _t('استلام من المحل', 'Retrait en magasin'),
        detail: _t('الزبون يستلم الطلب من المحل', 'Le client retire la commande en magasin'),
        feeLabel: _t('بدون رسوم توصيل', 'Sans frais de livraison'),
        fee: 0
      };
    }
    return {
      type: 'delivery',
      icon: '🚚',
      label: _t('توصيل', 'Livraison'),
      detail: _t('التوصيل إلى عنوان الزبون', 'Livraison à l’adresse du client'),
      feeLabel: fee > 0 ? _fmtMoney(fee) : _t('مجاناً', 'Gratuit'),
      fee: fee
    };
  }

  function _renderFulfillmentBlock(doc) {
    var d = _deliveryMeta(doc);
    if (!d) return '';
    return '<div class="rizq-prf-fulfill" data-fulfill="' + _esc(d.type) + '">'
      + '<div class="rizq-prf-fulfill-icon">' + d.icon + '</div>'
      + '<div class="rizq-prf-fulfill-body">'
      + '<div class="rizq-prf-fulfill-label">' + _esc(d.label) + '</div>'
      + '<div class="rizq-prf-fulfill-detail">' + _esc(d.detail) + '</div>'
      + '</div>'
      + '<div class="rizq-prf-fulfill-fee">' + _esc(d.feeLabel) + '</div>'
      + '</div>';
  }

  function _renderPaymentBlock(doc, forPrint) {
    var terms = String(doc.paymentTerms || '').trim();
    var pay = doc.selectedPayment || _normalizeSelectedPayment(null, doc.paymentMethods);
    var methods = _normalizePaymentMethods(doc.paymentMethods);
    if (!pay && !methods.length && !terms) return '';

    var pad = forPrint ? '16px' : '14px';
    var body = '';

    if (pay) {
      var chLbl = _channelLabel(pay);
      var icon = pay.channelIcon || (pay.channelKey === 'phone' ? '📞' : pay.channelKey === 'account' ? '🏦' : pay.channelKey === 'code' ? '🔢' : '💳');
      var isCashLike = pay.type === 'cash' || pay.type === 'instore' || pay.channelKey === 'cash' || pay.channelKey === 'instore';
      var bankName = pay.bank || _payTypeLabel(pay.type);
      var typeLbl = _payTypeLabel(pay.type);
      var showBadge = !!(bankName && typeLbl && String(bankName).toLowerCase() !== String(typeLbl).toLowerCase());
      var sCard = forPrint ? ' style="padding:14px;border-radius:14px;border:2px solid #C9A84C;background:linear-gradient(160deg,#fffef8,#f8fafc)"' : '';
      var sTop = forPrint ? ' style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px"' : '';
      var sKick = forPrint ? ' style="font-size:10px;font-weight:900;letter-spacing:1.2px;color:#C9A84C;margin-bottom:3px"' : '';
      var sBank = forPrint ? ' style="font-size:16px;font-weight:900;color:#0F2347"' : '';
      var sBadge = forPrint ? ' style="font-size:11px;font-weight:800;padding:5px 10px;border-radius:999px;background:#0F2347;color:#E8C96A"' : '';
      var sCh = forPrint ? ' style="font-size:13px;font-weight:700;color:#475569;margin-bottom:8px"' : '';
      var sVal = forPrint ? ' style="display:block;font-family:ui-monospace,Menlo,monospace;font-size:20px;font-weight:900;color:#0F2347;background:#fff;border:1.5px solid #d5deea;border-radius:11px;padding:13px 14px;letter-spacing:.8px;text-align:center"' : '';
      var sCash = forPrint ? ' style="font-size:14px;font-weight:800;color:#0F2347;padding:12px;border-radius:11px;background:rgba(15,35,71,.05);text-align:center"' : '';
      var sNote = forPrint ? ' style="font-size:12px;color:#64748b;margin-top:8px;line-height:1.5;text-align:center"' : '';
      body = '<div class="rizq-prf-pay-card"' + sCard + '>'
        + '<div class="rizq-prf-pay-card-top"' + sTop + '>'
        + '<div>'
        + '<div class="rizq-prf-pay-kicker"' + sKick + '>' + _esc(_t('ادفع عبر', 'Payez via')) + '</div>'
        + '<div class="rizq-prf-pay-bank"' + sBank + '>' + _esc(bankName) + '</div>'
        + '</div>'
        + (showBadge ? '<span class="rizq-prf-pay-badge"' + sBadge + '>' + _esc(typeLbl) + '</span>' : '')
        + '</div>'
        + '<div class="rizq-prf-pay-channel"' + sCh + '>' + icon + ' ' + _esc(chLbl) + '</div>'
        + (!isCashLike && pay.channelValue
          ? '<code class="rizq-prf-pay-value" dir="ltr"' + sVal + '>' + _esc(pay.channelValue) + '</code>'
          : '<div class="rizq-prf-pay-cash"' + sCash + '>' + _esc(chLbl) + '</div>')
        + (pay.note ? '<div class="rizq-prf-pay-note"' + sNote + '>📝 ' + _esc(pay.note) + '</div>' : '')
        + '</div>';
    } else {
      /* توافق قديم: قائمة وسائل دون قناة محددة */
      body = methods.map(function (m) {
        return '<div style="padding:10px 12px;border:1px solid rgba(201,168,76,.28);border-radius:10px;background:linear-gradient(135deg,rgba(15,35,71,.03),rgba(201,168,76,.06));margin-bottom:8px">'
          + '<div style="font-size:11px;font-weight:800;color:#C9A84C;margin-bottom:3px">' + _esc(_payTypeLabel(m.type)) + '</div>'
          + (m.bank ? '<div style="font-size:13px;font-weight:800;color:#0F2347">' + _esc(m.bank) + '</div>' : '')
          + (m.code ? '<div style="font-family:ui-monospace,monospace;font-size:14px;font-weight:800;color:#0F2347;margin-top:4px;direction:ltr">' + _esc(m.code) + '</div>' : '')
          + (m.phone ? '<div style="font-family:ui-monospace,monospace;font-size:14px;font-weight:800;color:#0F2347;margin-top:4px;direction:ltr">' + _esc(m.phone) + '</div>' : '')
          + (m.account ? '<div style="font-family:ui-monospace,monospace;font-size:14px;font-weight:800;color:#0F2347;margin-top:4px;direction:ltr">' + _esc(m.account) + '</div>' : '')
          + (m.note ? '<div style="font-size:11px;color:#6b7280;margin-top:4px">' + _esc(m.note) + '</div>' : '')
          + '</div>';
      }).join('');
    }

    return '<div class="rizq-prf-payblock"' + (forPrint ? ' style="margin-top:16px;padding:' + pad + ';border-radius:14px;border:1px solid rgba(15,35,71,.08);background:#fff"' : '') + '>'
      + '<div class="rizq-prf-pay-title"' + (forPrint ? ' style="font-size:12px;font-weight:900;color:#0F2347;margin-bottom:10px"' : '') + '>'
      + _esc(_t('الدفع للمحل', 'Paiement au magasin'))
      + '</div>'
      + body
      + (terms ? '<p class="rizq-prf-pay-hint"' + (forPrint ? ' style="font-size:11px;color:#94a3b8;margin:8px 0 0;line-height:1.45"' : '') + '>' + _esc(terms) + '</p>' : '')
      + '</div>';
  }

  /**
   * create({
   *   module: 'store'|'showroom'|'office'|'tender',
   *   sellerAccountId, sellerName, sellerPhone,
   *   buyerName, buyerPhone, buyerNote,
   *   lines: [{name, qty, unitPrice}],
   *   selectedPayment?, paymentMethods?, paymentTerms?,
   *   deliveryType?, deliveryFee?,
   *   status?, meta?
   * })
   */
  function create(opts) {
    opts = opts || {};
    var lines = _normalizeLines(opts.lines);
    if (!lines.length) return null;
    var deliveryType = String(opts.deliveryType || '').toLowerCase();
    if (deliveryType !== 'delivery' && deliveryType !== 'pickup') deliveryType = '';
    var deliveryFee = deliveryType === 'delivery' ? Math.max(0, Number(opts.deliveryFee) || 0) : 0;
    var tot = _totals(lines, deliveryFee);
    var mod = opts.module || 'store';
    var methods = _normalizePaymentMethods(opts.paymentMethods);
    var selected = _normalizeSelectedPayment(opts.selectedPayment, methods);
    /* على الفاتورة: قناة واحدة فقط إن وُجدت */
    if (selected) methods = [selected];
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
      selectedPayment: selected,
      paymentMethods: methods,
      paymentTerms: String(opts.paymentTerms || '').slice(0, 500),
      deliveryType: deliveryType,
      deliveryFee: deliveryFee,
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
      selectedPayment: opts.selectedPayment,
      paymentMethods: opts.paymentMethods,
      paymentTerms: opts.paymentTerms,
      deliveryType: opts.deliveryType,
      deliveryFee: opts.deliveryFee,
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
      paymentMethods: opts.paymentMethods,
      paymentTerms: opts.paymentTerms,
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
      paymentMethods: opts.paymentMethods,
      paymentTerms: opts.paymentTerms,
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
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">'
      + '<div style="background:#f8faff;border-radius:12px;padding:12px"><div style="font-size:11px;color:#6b7280;margin-bottom:4px">' + _esc(_t('البائع / مقدّم الخدمة', 'Vendeur / Prestataire')) + '</div>'
      + '<div style="font-weight:800;color:#0F2347">' + _esc(doc.sellerName || '—') + '</div>'
      + (doc.sellerPhone ? '<div style="font-size:12px;margin-top:4px;direction:ltr;text-align:inherit">' + _esc(doc.sellerPhone) + '</div>' : '')
      + '</div>'
      + '<div style="background:#f8faff;border-radius:12px;padding:12px"><div style="font-size:11px;color:#6b7280;margin-bottom:4px">' + _esc(_t('الزبون', 'Client')) + '</div>'
      + '<div style="font-weight:800;color:#0F2347">' + _esc(doc.buyerName || _t('زبون رزق', 'Client Rizq')) + '</div>'
      + (doc.buyerPhone ? '<div style="font-size:12px;margin-top:4px;direction:ltr;text-align:inherit">' + _esc(doc.buyerPhone) + '</div>' : '')
      + '</div></div>'
      + (function () {
        var d = _deliveryMeta(doc);
        if (!d) return '';
        return '<div style="margin-bottom:14px;padding:12px 14px;border-radius:12px;border:1.5px solid ' + (d.type === 'delivery' ? 'rgba(14,165,233,.3)' : 'rgba(201,168,76,.35)') + ';background:' + (d.type === 'delivery' ? '#f0f9ff' : '#fffdf6') + ';display:flex;align-items:center;gap:12px">'
          + '<div style="font-size:22px">' + d.icon + '</div>'
          + '<div style="flex:1"><div style="font-weight:900;color:#0F2347;font-size:14px">' + _esc(d.label) + '</div>'
          + '<div style="font-size:12px;color:#64748b;margin-top:2px">' + _esc(d.detail) + '</div></div>'
          + '<div style="font-weight:900;color:#0F2347">' + _esc(d.feeLabel) + '</div></div>';
      })()
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
        'هذه فاتورة قبل (PREFACTUR) للاطلاع قبل الدفع. تظهر عليها قناة دفع واحدة وطريقة الاستلام.',
        'Cette préfacture (PREFACTUR) affiche un seul canal de paiement et le mode de remise.'
      ))
      + '</div>'
      + '<div style="font-size:18px;font-weight:900;color:#0F2347">' + _esc(_t('الإجمالي', 'Total')) + ': <span style="color:#C9A84C">' + _esc(_fmtMoney(doc.total)) + '</span></div>'
      + '</div>'
      + _renderPaymentBlock(doc, true)
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
    link.href = 'rizq_prefacture.css?v=28.4';
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
      actions += '<button type="button" class="rizq-prf-btn rizq-prf-btn-pay rizq-prf-btn-primary" data-prf-act="pay">'
        + _esc(_t('تأكيد الدفع', 'Confirmer le paiement')) + '</button>';
    }
    if (_canFulfill(doc)) {
      actions += '<button type="button" class="rizq-prf-btn rizq-prf-btn-fulfill" data-prf-act="fulfill">'
        + _esc(_t('تم التسليم', 'Livré')) + '</button>';
    }
    if (_canApprove(doc)) {
      actions += '<button type="button" class="rizq-prf-btn rizq-prf-btn-approve" data-prf-act="approve">'
        + _esc(_t('موافقة', 'Approuver')) + '</button>';
    }
    if (_canDownload(doc) || doc.status === STATUS.sent || doc.status === STATUS.awaiting_payment) {
      actions += '<button type="button" class="rizq-prf-btn rizq-prf-btn-dl" data-prf-act="download">'
        + _esc(_t('طباعة', 'Imprimer')) + '</button>';
    }
    actions += '<button type="button" class="rizq-prf-btn rizq-prf-btn-wa" data-prf-act="wa">'
      + _esc(_t('واتساب', 'WhatsApp')) + '</button>';

    var stampBlock = '';
    if (doc.status === STATUS.fulfilled || doc.status === STATUS.approved) {
      stampBlock = '<div class="rizq-prf-stamp">'
        + '<span class="rizq-prf-stamp-brand">' + BRAND + '</span>'
        + '<strong>' + _esc(_isFr() ? doc.stamp.fr : doc.stamp.ar) + '</strong>'
        + '</div>';
    }

    var fee = Math.max(0, Number(doc.deliveryFee) || 0);
    var sub = Number(doc.subtotal != null ? doc.subtotal : doc.total) || 0;
    var totalsMid = '';
    if (doc.deliveryType || fee > 0) {
      totalsMid = '<div class="rizq-prf-totals">'
        + '<div class="rizq-prf-totals-row"><span>' + _esc(_t('المجموع الفرعي', 'Sous-total')) + '</span><strong>' + _esc(_fmtMoney(sub)) + '</strong></div>'
        + '<div class="rizq-prf-totals-row"><span>' + _esc(_t('التوصيل', 'Livraison')) + '</span><strong>'
        + _esc(fee > 0 ? _fmtMoney(fee) : (doc.deliveryType === 'pickup' ? _t('استلام', 'Retrait') : _t('مجاناً', 'Gratuit')))
        + '</strong></div></div>';
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
      + '<div class="rizq-prf-scroll">'
      + '<p class="rizq-prf-lead">' + _esc(_t(
        'راجع البنود ثم ادفع عبر القناة المختارة أدناه.',
        'Vérifiez les lignes puis payez via le canal choisi ci-dessous.'
      )) + '</p>'
      + '<div class="rizq-prf-parties">'
      + '<div><span>' + _esc(_t('البائع', 'Vendeur')) + '</span><strong>' + _esc(doc.sellerName || '—') + '</strong></div>'
      + '<div><span>' + _esc(_t('الزبون', 'Client')) + '</span><strong>' + _esc(doc.buyerName || _t('أنت', 'Vous')) + '</strong></div>'
      + '</div>'
      + _renderFulfillmentBlock(doc)
      + '<div class="rizq-prf-lines">' + linesHtml + '</div>'
      + totalsMid
      + '<div class="rizq-prf-total"><span>' + _esc(_t('الإجمالي', 'Total')) + '</span> <strong>' + _esc(_fmtMoney(doc.total)) + '</strong></div>'
      + _renderPaymentBlock(doc, false)
      + stampBlock
      + '</div>'
      + '<div class="rizq-prf-footer">'
      + '<div class="rizq-prf-actions">' + actions + '</div>'
      + '<p class="rizq-prf-disc">' + _esc(_t(
        'ادفع للمحل مباشرة — رزق وسيط نشر فقط.',
        'Payez directement le magasin — Rizq est uniquement un intermédiaire.'
      )) + '</p>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
      var sc = overlay.querySelector('.rizq-prf-scroll');
      if (sc) sc.scrollTop = 0;
    });

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
