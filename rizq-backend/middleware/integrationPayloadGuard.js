/**
 * integrationPayloadGuard.js — Strict JSON validation for external ERP/PMS calls
 * Rejects malformed payloads, unknown fields, and injection attempts.
 */
'use strict';

const { sendError } = require('./errors');

const INJECTION_PATTERN = /(<\s*script|javascript\s*:|on\w+\s*=|\$\{|\{\{|\}\}|__proto__|constructor\s*\[|\beval\s*\(|\bFunction\s*\()/i;
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

const SCHEMAS = {
  inquiry: {
    allowedKeys: new Set(['guestName', 'guestPhone', 'guestEmail', 'subject', 'message', 'externalRef', 'metadata']),
    required: ['guestName', 'guestPhone', 'message'],
    stringLimits: {
      guestName: 120,
      guestPhone: 30,
      guestEmail: 120,
      subject: 200,
      message: 3000,
      externalRef: 80,
    },
    maxMetadataKeys: 8,
    maxMetadataDepth: 2,
  },
  catalogQuery: {
    allowedKeys: new Set(['kind', 'limit', 'offset']),
    required: [],
    stringLimits: { kind: 20 },
    maxLimit: 100,
  },
};

function sanitizeString(value, maxLen) {
  if (value == null) return '';
  let s = String(value).trim();
  if (CONTROL_CHARS.test(s)) return null;
  if (INJECTION_PATTERN.test(s)) return null;
  s = s.replace(/[<>]/g, '');
  return s.slice(0, maxLen || 500);
}

function sanitizeMetadata(obj, depth, maxKeys) {
  if (depth > 2 || obj == null) return null;
  if (typeof obj !== 'object' || Array.isArray(obj)) return null;
  const keys = Object.keys(obj);
  if (keys.length > maxKeys) return null;
  const out = {};
  for (const key of keys) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/.test(key)) return null;
    const val = obj[key];
    if (val == null) continue;
    if (typeof val === 'string') {
      const clean = sanitizeString(val, 200);
      if (clean == null) return null;
      out[key] = clean;
    } else if (typeof val === 'number' && Number.isFinite(val)) {
      out[key] = val;
    } else if (typeof val === 'boolean') {
      out[key] = val;
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      const nested = sanitizeMetadata(val, depth + 1, maxKeys);
      if (nested == null) return null;
      out[key] = nested;
    } else {
      return null;
    }
  }
  return out;
}

function validatePayload(body, schemaName) {
  const schema = SCHEMAS[schemaName];
  if (!schema) return { ok: false, error: 'unknown_schema', code: 'INVALID_SCHEMA' };
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'جسم الطلب يجب أن يكون JSON object', code: 'INVALID_BODY' };
  }

  const keys = Object.keys(body);
  if (keys.length > schema.allowedKeys.size + 2) {
    return { ok: false, error: 'حقول غير مسموحة في الطلب', code: 'UNAPPROVED_FIELDS' };
  }
  for (const key of keys) {
    if (!schema.allowedKeys.has(key)) {
      return { ok: false, error: `حقل غير معتمد: ${key}`, code: 'UNAPPROVED_FIELD' };
    }
  }

  for (const reqKey of schema.required) {
    if (!body[reqKey] || !String(body[reqKey]).trim()) {
      return { ok: false, error: `الحقل "${reqKey}" مطلوب`, code: 'MISSING_FIELD' };
    }
  }

  const clean = {};
  for (const key of schema.allowedKeys) {
    if (!(key in body)) continue;
    if (key === 'metadata') {
      const meta = sanitizeMetadata(body.metadata, 0, schema.maxMetadataKeys || 8);
      if (body.metadata != null && meta == null) {
        return { ok: false, error: 'metadata غير صالحة', code: 'INVALID_METADATA' };
      }
      if (meta) clean.metadata = meta;
      continue;
    }
    if (key === 'limit' || key === 'offset') {
      const n = Number(body[key]);
      if (!Number.isFinite(n) || n < 0) {
        return { ok: false, error: `${key} يجب أن يكون رقماً موجباً`, code: 'INVALID_NUMBER' };
      }
      if (key === 'limit' && n > (schema.maxLimit || 100)) {
        return { ok: false, error: `limit يتجاوز ${schema.maxLimit || 100}`, code: 'LIMIT_EXCEEDED' };
      }
      clean[key] = Math.floor(n);
      continue;
    }
    const max = (schema.stringLimits && schema.stringLimits[key]) || 500;
    const val = sanitizeString(body[key], max);
    if (val == null) {
      return { ok: false, error: `قيمة "${key}" غير صالحة أو تحتوي محتوى محظور`, code: 'INVALID_VALUE' };
    }
    clean[key] = val;
  }

  if (schemaName === 'catalogQuery' && clean.kind && !['product', 'service'].includes(clean.kind)) {
    return { ok: false, error: "kind يجب أن يكون 'product' أو 'service'", code: 'INVALID_KIND' };
  }

  return { ok: true, data: clean };
}

function requireIntegrationPayload(schemaName) {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      req.integrationPayload = validatePayload(req.query || {}, schemaName);
      if (!req.integrationPayload.ok) {
        return sendError(res, 400, req.integrationPayload.error, req.integrationPayload.code);
      }
      req.sanitizedBody = req.integrationPayload.data;
      return next();
    }

    const result = validatePayload(req.body, schemaName);
    if (!result.ok) {
      return sendError(res, 400, result.error, result.code);
    }
    req.sanitizedBody = result.data;
    next();
  };
}

function rejectNonJsonContent(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  const ct = req.header('content-type') || '';
  if (!ct.includes('application/json')) {
    return sendError(res, 415, 'Content-Type: application/json مطلوب', 'UNSUPPORTED_MEDIA');
  }
  next();
}

module.exports = {
  validatePayload,
  requireIntegrationPayload,
  rejectNonJsonContent,
  SCHEMAS,
};
