'use strict';

/**
 * Validate Twilio webhook signatures (X-Twilio-Signature).
 * Use on Voice/SMS/WhatsApp webhook routes that spend AI or drive telephony.
 */
function getTwilioAuthToken() {
  return String(process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN || '').trim();
}

function buildWebhookUrl(req) {
  const configured = String(process.env.TWILIO_WEBHOOK_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured + req.originalUrl;
  // Fallback: reconstruct from request (behind proxies honor X-Forwarded-Proto)
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return proto + '://' + host + req.originalUrl;
}

function validateTwilioSignature(req, res, next) {
  const authToken = getTwilioAuthToken();
  const isProd = process.env.NODE_ENV === 'production' || process.env.RIZQ_ENV === 'production';

  if (!authToken) {
    if (isProd) {
      console.error('[twilio-webhook] TWILIO_AUTH_TOKEN missing — refusing webhook in production');
      return res.status(503).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response/>');
    }
    console.warn('[twilio-webhook] signature check skipped (no TWILIO_AUTH_TOKEN in non-prod)');
    return next();
  }

  let twilio;
  try {
    twilio = require('twilio');
  } catch (e) {
    console.error('[twilio-webhook] twilio package missing:', e.message);
    return res.status(503).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response/>');
  }

  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    return res.status(403).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response/>');
  }

  const url = buildWebhookUrl(req);
  const params = req.body && typeof req.body === 'object' ? req.body : {};
  const valid = twilio.validateRequest(authToken, signature, url, params);
  if (!valid) {
    console.warn('[twilio-webhook] invalid signature for', url);
    return res.status(403).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response/>');
  }
  return next();
}

module.exports = { validateTwilioSignature, getTwilioAuthToken, buildWebhookUrl };
