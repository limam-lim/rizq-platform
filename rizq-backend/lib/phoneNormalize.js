/**
 * تطبيع وتحقق أرقام الهاتف — موريتانيا (+222) أو دولي E.164
 * مصدر واحد للتسجيل / لوحة التحكم / الوكيل الهاتفي.
 */
'use strict';

const MR_PHONE_RE = /^(2[0-9]|3[0-9]|4[0-9])\d{6}$/;

function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '');
}

/** آخر 8 أرقام موريتانية صالحة، أو '' */
function normalizeMrPhone(raw) {
  let d = digitsOnly(raw);
  if (!d) return '';
  // 00222… أو 222…
  if (d.indexOf('00222') === 0) d = d.slice(5);
  else if (d.indexOf('222') === 0 && d.length >= 11) d = d.slice(3);
  d = d.slice(-8);
  return MR_PHONE_RE.test(d) ? d : '';
}

/** E.164 بعلامة + أو '' */
function normalizeIntlPhone(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  let digits = s.replace(/[^\d+]/g, '');
  if (digits.indexOf('00') === 0) digits = '+' + digits.slice(2);
  if (digits.indexOf('+') !== 0) {
    digits = digits.replace(/\D/g, '');
    if (digits.length >= 8) digits = '+' + digits;
    else return '';
  }
  const num = digits.replace(/\D/g, '');
  if (num.length < 8 || num.length > 15) return '';
  return '+' + num;
}

/**
 * يحل حقل هاتف واحد (محل/مكتب/معرض) أو حقول منفصلة (فرد).
 * @returns {{ ok:true, phone:string, phoneIntl:string, whatsapp:string }|{ ok:false, code:string, error:string }}
 */
function resolveAccountPhones(input) {
  const src = input || {};
  const rawPhone = src.phone != null ? src.phone : src.phoneMr;
  const rawIntl = src.phoneIntl != null ? src.phoneIntl : src.phone_intl;
  const rawWa = src.whatsapp;

  let mr = normalizeMrPhone(rawPhone);
  let intl = normalizeIntlPhone(rawIntl);

  // حقل واحد للتاجر: إن لم يكن موريتانياً جرّب دولياً من نفس القيمة
  if (!mr && !intl && rawPhone) {
    intl = normalizeIntlPhone(rawPhone);
  }

  let wa = normalizeIntlPhone(rawWa);
  if (!wa) {
    if (mr) wa = '+222' + mr;
    else if (intl) wa = intl;
  }

  if (!mr && !intl) {
    return {
      ok: false,
      code: 'invalid_phone',
      error: 'أدخل هاتفاً موريتانياً صالحاً (2/3/4·······) أو رقماً دولياً',
    };
  }

  return {
    ok: true,
    phone: mr || '',
    phoneIntl: intl || '',
    whatsapp: wa || '',
  };
}

/** آخر 8 أرقام للمقارنة مع وكيل المكالمات (عزل المشترك) */
function phoneMatchKey(raw) {
  const d = digitsOnly(raw);
  return d ? d.slice(-8) : '';
}

module.exports = {
  MR_PHONE_RE,
  digitsOnly,
  normalizeMrPhone,
  normalizeIntlPhone,
  resolveAccountPhones,
  phoneMatchKey,
};
