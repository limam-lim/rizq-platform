/**
 * مصادقة مشتركة لمعالجات الأقمار الصناعية (مكالمات / واتساب / بريد)
 * — تغلق السجلات والإرسال العام خلف سرّ خادمي.
 */
'use strict';

const crypto = require('crypto');

function timingSafeEqualStr(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  if (x.length !== y.length) return false;
  try {
    return crypto.timingSafeEqual(x, y);
  } catch (e) {
    return false;
  }
}

function expectedSecret() {
  return String(process.env.RIZQ_API_SECRET || process.env.BACKEND_SHARED_SECRET || '').trim();
}

function requireSatelliteSecret(req, res, next) {
  const expected = expectedSecret();
  if (!expected) {
    return res.status(503).json({ ok: false, error: 'satellite_secret_not_configured' });
  }
  const got = req.header('x-rizq-secret')
    || req.header('x-api-secret')
    || (req.body && req.body.secret)
    || (req.query && req.query.secret)
    || '';
  if (!got || !timingSafeEqualStr(got, expected)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  return next();
}

module.exports = { requireSatelliteSecret, expectedSecret, timingSafeEqualStr };
