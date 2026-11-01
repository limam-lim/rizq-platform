/**
 * إخفاء جزئي للهواتف والبريد في رسائل الحارس.
 * مثال هاتف: 2224****77 — بريد: ab***@example.com
 */
'use strict';

function maskPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 6) return '****';
  const head = digits.slice(0, Math.min(4, digits.length - 4));
  const tail = digits.slice(-2);
  return head + '****' + tail;
}

function maskEmail(raw) {
  const s = String(raw || '').trim();
  const at = s.indexOf('@');
  if (at < 1) return '***@***';
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  const keep = local.slice(0, Math.min(2, local.length));
  return keep + '***@' + domain;
}

function redactText(text) {
  let out = String(text == null ? '' : text);
  // emails
  out = out.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (m) => maskEmail(m));
  // intl phones with optional + and spaces/dashes
  out = out.replace(/(?:\+|00)?(?:222[\s-]?)?(?:2|3|4)\d[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}/g, (m) => {
    const d = m.replace(/\D/g, '');
    if (d.length < 8) return m;
    return maskPhone(d);
  });
  // bare 8-digit local (MR) — avoid prices by requiring word boundary and not after سعر
  out = out.replace(/(?<![A-Za-z0-9])([234]\d{7})(?![A-Za-z0-9])/g, (m, g1, offset) => {
    const before = out.slice(Math.max(0, offset - 12), offset);
    if (/(سعر|ثمن|أوقية|MRU|prix|price)/i.test(before)) return m;
    return maskPhone(g1);
  });
  return out;
}

module.exports = { maskPhone, maskEmail, redactText };
