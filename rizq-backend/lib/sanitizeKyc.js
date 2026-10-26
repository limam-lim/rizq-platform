'use strict';

/**
 * قبول data:image/(jpeg|jpg|png|webp);base64,... فقط —
 * رفض غير الصور وقطع الحجم. مشترك بين التسجيل وPATCH الحساب.
 */
function sanitizeKycDataUrl(raw, maxChars) {
  const limit = Math.max(1024, Number(maxChars) || 5_000_000);
  const s = String(raw == null ? '' : raw).trim().slice(0, limit);
  if (!s) return '';
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(s)) return '';
  return s.replace(/\s+/g, '');
}

module.exports = { sanitizeKycDataUrl };
