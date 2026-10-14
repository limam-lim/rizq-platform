'use strict';

/**
 * Secure document storage for service-desk requests (buyer → seller).
 * PNG/JPEG/WebP/PDF only, max 5MB decoded, not publicly listed.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_BYTES = Math.max(1, Number(process.env.SERVICE_DOC_MAX_BYTES) || Number(process.env.RECEIPT_MAX_BYTES) || 5 * 1024 * 1024);
const MAX_PER_REQUEST = Math.min(5, Math.max(1, Number(process.env.SERVICE_DOC_MAX_COUNT) || 3));
const DOCS_DIR = path.join(__dirname, '..', 'uploads', 'service-docs');

const ALLOWED = {
  'image/jpeg': { ext: '.jpg', magic: [[0xff, 0xd8, 0xff]] },
  'image/png': { ext: '.png', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  'image/webp': { ext: '.webp', magic: [[0x52, 0x49, 0x46, 0x46]] },
  'application/pdf': { ext: '.pdf', magic: [[0x25, 0x50, 0x44, 0x46]] },
};

function ensureDocsDir() {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true, mode: 0o750 });
  }
  const deny = path.join(DOCS_DIR, '.htaccess');
  if (!fs.existsSync(deny)) {
    try { fs.writeFileSync(deny, 'Deny from all\n', 'utf8'); } catch (_) { /* optional */ }
  }
  const keep = path.join(DOCS_DIR, '.gitkeep');
  if (!fs.existsSync(keep)) {
    try { fs.writeFileSync(keep, '', 'utf8'); } catch (_) { /* optional */ }
  }
}

function sniffMime(buf) {
  if (!buf || buf.length < 4) return null;
  for (const [mime, meta] of Object.entries(ALLOWED)) {
    for (const sig of meta.magic) {
      let ok = true;
      for (let i = 0; i < sig.length; i++) {
        if (buf[i] !== sig[i]) { ok = false; break; }
      }
      if (ok) {
        if (mime === 'image/webp' && buf.length >= 12) {
          if (buf.slice(8, 12).toString('ascii') !== 'WEBP') continue;
        }
        return mime;
      }
    }
  }
  return null;
}

function parseDataUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const m = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/s.exec(raw);
  if (m) {
    return { claimedMime: m[1].toLowerCase(), base64: m[2] };
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 64) {
    return { claimedMime: null, base64: raw.replace(/\s+/g, '') };
  }
  return null;
}

function safeOriginalName(name) {
  return String(name || 'document')
    .replace(/[^\w.\u0600-\u06FF\u0750-\u077F\s()-]/g, '')
    .trim()
    .slice(0, 80) || 'document';
}

/**
 * @returns {{ ok:true, id, relativePath, mime, bytes, originalName } | { ok:false, error, status, maxBytes? }}
 */
function storeServiceDoc(input, meta) {
  ensureDocsDir();
  const parsed = parseDataUrl(input);
  if (!parsed) return { ok: false, status: 400, error: 'doc_invalid' };

  let buf;
  try {
    buf = Buffer.from(parsed.base64, 'base64');
  } catch (_) {
    return { ok: false, status: 400, error: 'doc_decode_failed' };
  }
  if (!buf.length) return { ok: false, status: 400, error: 'doc_empty' };
  if (buf.length > MAX_BYTES) {
    return { ok: false, status: 413, error: 'doc_too_large', maxBytes: MAX_BYTES };
  }

  const sniffed = sniffMime(buf);
  if (!sniffed || !ALLOWED[sniffed]) {
    return { ok: false, status: 415, error: 'doc_type_not_allowed' };
  }
  if (parsed.claimedMime && parsed.claimedMime !== sniffed) {
    const claimed = parsed.claimedMime === 'image/jpg' ? 'image/jpeg' : parsed.claimedMime;
    if (claimed !== sniffed) {
      return { ok: false, status: 415, error: 'doc_mime_mismatch' };
    }
  }

  const ext = ALLOWED[sniffed].ext;
  const accountPart = String((meta && meta.accountId) || 'anon').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'anon';
  const reqPart = String((meta && meta.requestId) || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const id = 'DOC-' + crypto.randomBytes(6).toString('hex');
  const name = `${accountPart}_${reqPart}_${id}${ext}`;
  const abs = path.join(DOCS_DIR, name);
  fs.writeFileSync(abs, buf, { mode: 0o640 });

  return {
    ok: true,
    id,
    relativePath: path.join('service-docs', name).replace(/\\/g, '/'),
    mime: sniffed,
    bytes: buf.length,
    originalName: safeOriginalName(meta && meta.originalName) + ext,
  };
}

function resolveServiceDocAbsolute(relativePath) {
  const rel = String(relativePath || '').replace(/\\/g, '/');
  if (!rel || rel.includes('..') || !rel.startsWith('service-docs/')) return null;
  const abs = path.join(DOCS_DIR, path.basename(rel));
  if (!abs.startsWith(DOCS_DIR)) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

function publicAttachmentMeta(att) {
  if (!att || !att.id) return null;
  return {
    id: String(att.id),
    mime: String(att.mime || ''),
    bytes: Number(att.bytes) || 0,
    originalName: String(att.originalName || 'document').slice(0, 100),
    createdAt: att.createdAt || null,
  };
}

module.exports = {
  MAX_BYTES,
  MAX_PER_REQUEST,
  DOCS_DIR,
  ensureDocsDir,
  storeServiceDoc,
  resolveServiceDocAbsolute,
  publicAttachmentMeta,
};
