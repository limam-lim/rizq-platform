/**
 * إزالة الأسرار من نُسخ JSON الاحتياطية على القرص.
 * SQLite يبقى مصدر الحقيقة الكامل؛ الملفات الاحتياطية للترحيل/التشخيص فقط.
 */
'use strict';

const SECRET_KEYS = new Set([
  'accessToken',
  'dashToken',
  'passHash',
  'password',
  'passwordHash',
  'apiKey',
  'apiKeyHash',
  'apiSecret',
  'plainKey',
  'token',
  'secret',
  'webhookUrl',
  'webhookSecret',
  'botToken',
  'code',
  'codeHash',
  'otp',
  'otpHash',
  'idImage',
  'id_image',
  'licenseImage',
  'license_image',
  'activityImage2',
  'activity_image2',
  'receiptImage',
]);

function scrubValue(value, depth) {
  if (depth > 12) return null;
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }
  if (typeof value !== 'object') return value;
  const out = {};
  Object.keys(value).forEach((key) => {
    if (SECRET_KEYS.has(key)) return;
    // قنوات داخلية قد تحوي webhookUrl داخل كائن متداخل
    if (key === 'channels' || key === 'channelsInternal' || key === 'telegram') {
      out[key] = scrubValue(value[key], depth + 1);
      return;
    }
    out[key] = scrubValue(value[key], depth + 1);
  });
  return out;
}

function scrubSecretsForBackup(data) {
  return scrubValue(data, 0);
}

module.exports = { scrubSecretsForBackup, SECRET_KEYS };
