/**
 * حدود الرفع حسب نوع الحساب — قابلة للتعديل من site-config.uploadLimits
 */
'use strict';

const DEFAULTS = {
  individual: { maxPhotosPerAd: 5, maxImageBytes: 3 * 1024 * 1024 },
  store: { maxPhotosPerAd: 8, maxImageBytes: 3 * 1024 * 1024 },
  office: { maxPhotosPerAd: 8, maxImageBytes: 3 * 1024 * 1024 },
  corp: { maxPhotosPerAd: 10, maxImageBytes: 4 * 1024 * 1024 },
  estate: { maxPhotosPerAd: 10, maxImageBytes: 4 * 1024 * 1024 },
  default: { maxPhotosPerAd: 5, maxImageBytes: 3 * 1024 * 1024 },
};

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function sanitizeTypeLimits(raw, fallback) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    maxPhotosPerAd: clampInt(src.maxPhotosPerAd, 1, 30, fallback.maxPhotosPerAd),
    maxImageBytes: clampInt(src.maxImageBytes, 100 * 1024, 12 * 1024 * 1024, fallback.maxImageBytes),
  };
}

function getUploadLimitsConfig(siteConfig) {
  const cfg = siteConfig || {};
  const stored = (cfg.uploadLimits && typeof cfg.uploadLimits === 'object') ? cfg.uploadLimits : {};
  const out = {};
  Object.keys(DEFAULTS).forEach((k) => {
    out[k] = sanitizeTypeLimits(stored[k], DEFAULTS[k]);
  });
  return out;
}

function getLimitsForAccountType(accountType, siteConfig) {
  const all = getUploadLimitsConfig(siteConfig);
  const key = String(accountType || 'individual').toLowerCase();
  return all[key] || all.default;
}

module.exports = {
  DEFAULTS,
  getUploadLimitsConfig,
  getLimitsForAccountType,
  sanitizeTypeLimits,
};
