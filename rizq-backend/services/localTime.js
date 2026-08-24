/**
 * localTime.js — توقيت موريتانيا (Africa/Nouakchott) للسجلات والإشعارات
 */
'use strict';

const TZ = process.env.RIZQ_TIMEZONE || process.env.MAINTENANCE_CRON_TZ || 'Africa/Nouakchott';

function formatLocalDateTime(date, opts) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  opts = opts || {};
  try {
    return d.toLocaleString(opts.locale || 'ar-MR', Object.assign({
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }, opts.format || {}));
  } catch (e) {
    return d.toISOString();
  }
}

function formatLocalTime(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  try {
    return d.toLocaleTimeString('ar-MR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) {
    return d.toISOString().slice(11, 16);
  }
}

function nowIsoWithLocal() {
  const now = new Date();
  return {
    iso: now.toISOString(),
    local: formatLocalDateTime(now),
    tz: TZ,
  };
}

module.exports = {
  TZ,
  formatLocalDateTime,
  formatLocalTime,
  nowIsoWithLocal,
};
