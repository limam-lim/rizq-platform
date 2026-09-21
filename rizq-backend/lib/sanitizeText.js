/**
 * sanitizeText.js — تنظيف نص العرض من محارف التحكم ثنائية الاتجاه
 * ومن التطبيع Unicode للحقول الحساسة (بريد، أسماء).
 */
'use strict';

/** إزالة U+202A–U+202E و U+2066–U+2069 (تجاوز اتجاه النص) */
function stripBidiControls(s) {
  return String(s == null ? '' : s).replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
}

function normalizeDisplayName(s, maxLen) {
  const lim = Math.max(1, Number(maxLen) || 120);
  return stripBidiControls(String(s || '')).normalize('NFC').trim().slice(0, lim);
}

function normalizeEmailSafe(s) {
  return stripBidiControls(String(s || '')).normalize('NFC').trim().toLowerCase().slice(0, 120);
}

module.exports = { stripBidiControls, normalizeDisplayName, normalizeEmailSafe };
