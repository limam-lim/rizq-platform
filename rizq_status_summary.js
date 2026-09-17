/**
 * rizq_status_summary.js — شريط ملخص حالة الإعلانات/الكتalog العام
 * © Rizq ADMINIA SARL
 */
(function (global) {
  'use strict';
  if (global.RizqStatusSummary) return;

  function lang() {
    try {
      if (typeof global._rizqLang === 'function') return global._rizqLang();
      return localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t(ar, fr) {
    return lang() === 'fr' ? fr : ar;
  }

  function normalizeStatus(raw) {
    var s = String(raw || '').toLowerCase();
    if (s === 'pending_review' || s === 'reviewing' || s === 'pending') return 'pending';
    if (s === 'published' || s === 'active') return 'active';
    if (s === 'rejected' || s === 'expired' || s === 'inactive') return 'rejected';
    return s || 'unknown';
  }

  function countItems(items) {
    var counts = { active: 0, pending: 0, rejected: 0, total: 0 };
    (items || []).forEach(function (item) {
      counts.total++;
      var bucket = normalizeStatus(item && item.status);
      if (bucket === 'active') counts.active++;
      else if (bucket === 'pending') counts.pending++;
      else if (bucket === 'rejected') counts.rejected++;
    });
    return counts;
  }

  function chip(label, value, tone) {
    var colors = {
      active: { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' },
      pending: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
      rejected: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
      total: { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
    };
    var c = colors[tone] || colors.total;
    return '<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:' + c.bg + ';border:1px solid ' + c.border + ';color:' + c.text + ';font-size:12px;font-weight:700">' +
      '<span>' + label + '</span><strong>' + value + '</strong></span>';
  }

  function render(opts) {
    opts = opts || {};
    var mountId = opts.mountId || 'rizq-status-summary-mount';
    var mount = document.getElementById(mountId);
    if (!mount) return;

    var items = Array.isArray(opts.items) ? opts.items : [];
    var counts = countItems(items);
    if (!counts.total) {
      mount.innerHTML = '';
      return;
    }

    var labelAds = opts.itemType === 'catalog'
      ? t('المنتجات', 'Produits')
      : t('الإعلانات', 'Annonces');

    var hint = '';
    if (counts.pending > 0) {
      hint = t(
        '⏳ ' + counts.pending + ' ' + (opts.itemType === 'catalog' ? 'منتج' : 'إعلان') + ' قيد المراجعة — ستُنشر بعد موافقة فريق رزق.',
        '⏳ ' + counts.pending + ' en cours de révision — publication après validation par Rizq.'
      );
    } else if (counts.rejected > 0) {
      hint = t(
        '❌ ' + counts.rejected + ' مرفوض — راجع المحتوى وعدّله ثم أعد الإرسال.',
        '❌ ' + counts.rejected + ' rejeté(s) — corrigez le contenu et renvoyez.'
      );
    } else if (counts.active > 0) {
      hint = t(
        '✅ ' + counts.active + ' نشط ومرئي للزوار.',
        '✅ ' + counts.active + ' actif(s) et visible(s) pour les visiteurs.'
      );
    }

    mount.innerHTML =
      '<div style="background:#fff;border:1.5px solid rgba(27,58,107,.1);border-radius:14px;padding:14px 16px;margin-bottom:14px;box-shadow:0 2px 10px rgba(15,35,65,.04)">' +
      '<div style="font-size:13.5px;font-weight:800;color:#1B3A6B;margin-bottom:10px">📊 ' + t('ملخص حالة ', 'Résumé ') + labelAds + '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:' + (hint ? '10px' : '0') + '">' +
      chip(t('نشط', 'Actif'), counts.active, 'active') +
      chip(t('قيد المراجعة', 'En révision'), counts.pending, 'pending') +
      chip(t('مرفوض/متوقف', 'Rejeté/Inactif'), counts.rejected, 'rejected') +
      chip(t('الإجمالي', 'Total'), counts.total, 'total') +
      '</div>' +
      (hint ? '<div style="font-size:12.5px;color:#475569;line-height:1.6">' + hint + '</div>' : '') +
      '</div>';
  }

  global.RizqStatusSummary = {
    render: render,
    countItems: countItems,
    normalizeStatus: normalizeStatus
  };
})(typeof window !== 'undefined' ? window : globalThis);
