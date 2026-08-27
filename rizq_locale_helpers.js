/**
 * rizq_locale_helpers.js — fallback ذكي للمحتوى أحادي اللغة (إعلانات + إعدادات الأدمن)
 * يُحمَّل بعد rizq_i18n.js
 */
(function (global) {
  'use strict';

  function normLang(lang) {
    if (lang === 'fr') return 'fr';
    if (lang === 'ar') return 'ar';
    if (global.RizqI18n && typeof global.RizqI18n.getLang === 'function') {
      return global.RizqI18n.getLang() === 'fr' ? 'fr' : 'ar';
    }
    try { return localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar'; } catch (e) { return 'ar'; }
  }

  function trim(s) { return String(s == null ? '' : s).trim(); }

  function isBlank(s) { return !trim(s); }

  function hasArabic(s) { return /[\u0600-\u06FF]/.test(String(s || '')); }

  /**
   * @param {{ ar?: string, fr?: string, lang?: string, allowCrossFallback?: boolean }} opts
   * @returns {{ text: string, isFallback: boolean, sourceLang: ('ar'|'fr'|null) }}
   */
  function pickBilingual(opts) {
    opts = opts || {};
    var lang = normLang(opts.lang);
    var ar = trim(opts.ar);
    var fr = trim(opts.fr);
    var cross = opts.allowCrossFallback !== false;

    if (lang === 'fr') {
      if (fr) return { text: fr, isFallback: false, sourceLang: 'fr' };
      if (cross && ar) return { text: ar, isFallback: true, sourceLang: 'ar' };
      return { text: '', isFallback: false, sourceLang: null };
    }
    if (ar) return { text: ar, isFallback: false, sourceLang: 'ar' };
    if (cross && fr) return { text: fr, isFallback: true, sourceLang: 'fr' };
    return { text: '', isFallback: false, sourceLang: null };
  }

  function pickListBilingual(arList, frList, lang) {
    lang = normLang(lang);
    var ar = Array.isArray(arList) ? arList.filter(Boolean) : [];
    var fr = Array.isArray(frList) ? frList.filter(Boolean) : [];
    if (lang === 'fr') {
      if (fr.length) return { items: fr.slice(), isFallback: false, sourceLang: 'fr' };
      if (ar.length) return { items: ar.slice(), isFallback: true, sourceLang: 'ar' };
      return { items: [], isFallback: false, sourceLang: null };
    }
    if (ar.length) return { items: ar.slice(), isFallback: false, sourceLang: 'ar' };
    if (fr.length) return { items: fr.slice(), isFallback: true, sourceLang: 'fr' };
    return { items: [], isFallback: false, sourceLang: null };
  }

  function fallbackNoteText(sourceLang, viewerLang) {
    if (!sourceLang) return '';
    viewerLang = normLang(viewerLang);
    if (sourceLang === viewerLang) return '';
    if (viewerLang === 'fr' && sourceLang === 'ar') return 'Affiché dans la langue d\'origine (arabe)';
    if (viewerLang === 'ar' && sourceLang === 'fr') return 'عرض باللغة الأصلية (فرنسية)';
    return '';
  }

  function fallbackNoteHtml(sourceLang, viewerLang, asBlock) {
    var note = fallbackNoteText(sourceLang, viewerLang);
    if (!note) return '';
    if (asBlock) {
      return '<span class="rizq-lang-fallback rizq-lang-fallback-block" role="note" style="display:block;margin:6px 0 0;padding:6px 10px;border-radius:8px;background:rgba(100,116,139,.08);border:1px solid rgba(100,116,139,.14);font-size:10.5px;font-weight:600;color:#64748b;line-height:1.45">' + note + '</span>';
    }
    return '<span class="rizq-lang-fallback" role="note" style="display:inline-block;font-size:10.5px;font-weight:600;color:#64748b;opacity:.92;margin-inline-start:6px;vertical-align:middle">' + note + '</span>';
  }

  function adTitlePick(ad, lang) {
    ad = ad || {};
    return pickBilingual({ ar: ad.title, fr: ad.titleFr, lang: lang });
  }

  function adDescPick(ad, lang) {
    ad = ad || {};
    return pickBilingual({ ar: ad.desc, fr: ad.descFr, lang: lang });
  }

  function adTitle(ad, lang) { return adTitlePick(ad, lang).text; }

  function adDesc(ad, lang) { return adDescPick(ad, lang).text; }

  /** عنصر أدمن: category/package/extra — يدعم name/name_fr أو nameAr/nameFr */
  function adminLabelPick(item, lang, arKey, frKey) {
    item = item || {};
    arKey = arKey || 'name';
    frKey = frKey || 'name_fr';
    var ar = item[arKey] != null ? item[arKey] : (item.nameAr != null ? item.nameAr : item.name);
    var fr = item[frKey] != null ? item[frKey] : (item.nameFr != null ? item.nameFr : item.name_fr);
    return pickBilingual({ ar: ar, fr: fr, lang: lang });
  }

  function adminLabel(item, lang, arKey, frKey) {
    return adminLabelPick(item, lang, arKey, frKey).text;
  }

  function adminListPick(item, lang, arKey, frKey) {
    item = item || {};
    arKey = arKey || 'subs';
    frKey = frKey || 'subs_fr';
    return pickListBilingual(item[arKey], item[frKey], lang);
  }

  /** دوال توافق رجعي — تستبدل adTitleLocalized المحلية في الصفحات */
  function legacyAdTitleLocalized(a) { return adTitle(a); }
  function legacyAdDescLocalized(a) { return adDesc(a); }

  global.RizqLocale = {
    normLang: normLang,
    pickBilingual: pickBilingual,
    pickListBilingual: pickListBilingual,
    fallbackNoteText: fallbackNoteText,
    fallbackNoteHtml: fallbackNoteHtml,
    adTitle: adTitle,
    adDesc: adDesc,
    adTitlePick: adTitlePick,
    adDescPick: adDescPick,
    adminLabel: adminLabel,
    adminLabelPick: adminLabelPick,
    adminListPick: adminListPick,
    hasArabic: hasArabic,
    isBlank: isBlank,
    legacyAdTitleLocalized: legacyAdTitleLocalized,
    legacyAdDescLocalized: legacyAdDescLocalized
  };
})(typeof window !== 'undefined' ? window : global);
