/**
 * rizq_phone_utils.js — تطبيع هاتف موريتاني / دولي (محل · مكتب · معرض/شركة)
 * يجب أن يطابق rizq-backend/lib/phoneNormalize.js
 */
(function (global) {
  'use strict';

  var MR_PHONE_RE = /^(2[0-9]|3[0-9]|4[0-9])\d{6}$/;

  function digitsOnly(raw) {
    return String(raw || '').replace(/\D/g, '');
  }

  function normalizeMrPhone(raw) {
    var d = digitsOnly(raw);
    if (!d) return '';
    if (d.indexOf('00222') === 0) d = d.slice(5);
    else if (d.indexOf('222') === 0 && d.length >= 11) d = d.slice(3);
    d = d.slice(-8);
    return MR_PHONE_RE.test(d) ? d : '';
  }

  function normalizeIntlPhone(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    var digits = s.replace(/[^\d+]/g, '');
    if (digits.indexOf('00') === 0) digits = '+' + digits.slice(2);
    if (digits.indexOf('+') !== 0) {
      digits = digits.replace(/\D/g, '');
      if (digits.length >= 8) digits = '+' + digits;
      else return '';
    }
    var num = digits.replace(/\D/g, '');
    if (num.length < 8 || num.length > 15) return '';
    return '+' + num;
  }

  /**
   * حقل هاتف واحد للتاجر (محل/مكتب/معرض) → { phone, phoneIntl, whatsapp } أو null
   */
  function resolveMerchantPhone(raw) {
    var mr = normalizeMrPhone(raw);
    if (mr) {
      return { phone: mr, phoneIntl: '', whatsapp: '+222' + mr };
    }
    var intl = normalizeIntlPhone(raw);
    if (intl) {
      return { phone: '', phoneIntl: intl, whatsapp: intl };
    }
    return null;
  }

  function phoneErrorMessage(isAr) {
    return isAr
      ? 'أدخل هاتفاً موريتانياً صالحاً (يبدأ بـ 2 أو 3 أو 4 — 8 أرقام) أو رقماً دولياً مثل +33…'
      : 'Saisissez un numéro mauritanien valide (commence par 2/3/4 — 8 chiffres) ou un numéro international (+33…)';
  }

  global.RizqPhone = {
    MR_PHONE_RE: MR_PHONE_RE,
    digitsOnly: digitsOnly,
    normalizeMrPhone: normalizeMrPhone,
    normalizeIntlPhone: normalizeIntlPhone,
    resolveMerchantPhone: resolveMerchantPhone,
    phoneErrorMessage: phoneErrorMessage,
  };
})(typeof window !== 'undefined' ? window : globalThis);
