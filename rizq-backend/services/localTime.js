/**
 * localTime.js — توقيت موريتانيا (Africa/Nouakchott) للسجلات والإشعارات
 */
'use strict';

const TZ = process.env.RIZQ_TIMEZONE || process.env.MAINTENANCE_CRON_TZ || 'Africa/Nouakchott';

function toWesternDigits(value) {
  return String(value ?? '')
    .replace(/[\u0660-\u0669]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48))
    .replace(/[\u06F0-\u06F9]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 48));
}

function formatNotifyTimestamp(date) {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date(date || Date.now());
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (type) => {
      const hit = parts.find((p) => p.type === type);
      return hit ? hit.value : '';
    };
    return toWesternDigits(get('day') + '/' + get('month') + '/' + get('year') + ' ' + get('hour') + ':' + get('minute'));
  } catch (e) {
    return toWesternDigits(d.toISOString().slice(0, 16).replace('T', ' '));
  }
}

function formatLocalDateTime(date, opts) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  opts = opts || {};
  if (opts.westernDigits === false) {
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
  return formatNotifyTimestamp(d);
}

function formatLocalTime(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (type) => {
      const hit = parts.find((p) => p.type === type);
      return hit ? hit.value : '';
    };
    return toWesternDigits(get('hour') + ':' + get('minute'));
  } catch (e) {
    return toWesternDigits(d.toISOString().slice(11, 16));
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
  toWesternDigits,
  formatNotifyTimestamp,
  formatLocalDateTime,
  formatLocalTime,
  nowIsoWithLocal,
};
