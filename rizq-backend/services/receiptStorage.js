'use strict';

/**
 * Secure receipt storage for manual payment (transfer + receipt upload).
 * Accepts PNG/JPEG/WebP/PDF only, max 5MB decoded, stores outside public listing.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_BYTES = Math.max(1, Number(process.env.RECEIPT_MAX_BYTES) || 5 * 1024 * 1024);
const RECEIPTS_DIR = path.join(__dirname, '..', 'uploads', 'receipts');

const ALLOWED = {
  'image/jpeg': { ext: '.jpg', magic: [[0xff, 0xd8, 0xff]] },
  'image/png': { ext: '.png', magic: [[0x89, 0x50, 0x4e, 0x47]] },
  'image/webp': { ext: '.webp', magic: [[0x52, 0x49, 0x46, 0x46]] },
  'application/pdf': { ext: '.pdf', magic: [[0x25, 0x50, 0x44, 0x46]] }, // %PDF
};

function ensureReceiptsDir() {
  if (!fs.existsSync(RECEIPTS_DIR)) {
    fs.mkdirSync(RECEIPTS_DIR, { recursive: true, mode: 0o750 });
  }
  // Deny directory listing via static server — receipts are never mounted publicly.
  const deny = path.join(RECEIPTS_DIR, '.htaccess');
  if (!fs.existsSync(deny)) {
    try { fs.writeFileSync(deny, 'Deny from all\n', 'utf8'); } catch (_) { /* optional */ }
  }
  const keep = path.join(RECEIPTS_DIR, '.gitkeep');
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
        // webp: RIFF....WEBP
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
  // bare base64 (legacy clients)
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 64) {
    return { claimedMime: null, base64: raw.replace(/\s+/g, '') };
  }
  return null;
}

/**
 * Validate + persist a receipt data-URL / base64 blob.
 * @returns {{ ok:true, relativePath, mime, bytes } | { ok:false, error, status }}
 */
function storeReceipt(input, meta) {
  ensureReceiptsDir();
  const parsed = parseDataUrl(input);
  if (!parsed) return { ok: false, status: 400, error: 'receipt_invalid' };

  let buf;
  try {
    buf = Buffer.from(parsed.base64, 'base64');
  } catch (_) {
    return { ok: false, status: 400, error: 'receipt_decode_failed' };
  }
  if (!buf.length) return { ok: false, status: 400, error: 'receipt_empty' };
  if (buf.length > MAX_BYTES) {
    return { ok: false, status: 413, error: 'receipt_too_large', maxBytes: MAX_BYTES };
  }

  const sniffed = sniffMime(buf);
  if (!sniffed || !ALLOWED[sniffed]) {
    return { ok: false, status: 415, error: 'receipt_type_not_allowed' };
  }
  if (parsed.claimedMime && parsed.claimedMime !== sniffed) {
    // Allow image/jpg alias for jpeg
    const claimed = parsed.claimedMime === 'image/jpg' ? 'image/jpeg' : parsed.claimedMime;
    if (claimed !== sniffed) {
      return { ok: false, status: 415, error: 'receipt_mime_mismatch' };
    }
  }

  const ext = ALLOWED[sniffed].ext;
  const accountPart = String((meta && meta.accountId) || 'anon').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'anon';
  const reqPart = String((meta && meta.requestId) || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const name = `${accountPart}_${reqPart}_${crypto.randomBytes(8).toString('hex')}${ext}`;
  const abs = path.join(RECEIPTS_DIR, name);
  fs.writeFileSync(abs, buf, { mode: 0o640 });

  return {
    ok: true,
    relativePath: path.join('receipts', name).replace(/\\/g, '/'),
    mime: sniffed,
    bytes: buf.length,
  };
}

function resolveReceiptAbsolute(relativePath) {
  const rel = String(relativePath || '').replace(/\\/g, '/');
  if (!rel || rel.includes('..') || !rel.startsWith('receipts/')) return null;
  const abs = path.join(RECEIPTS_DIR, path.basename(rel));
  if (!abs.startsWith(RECEIPTS_DIR)) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

module.exports = {
  MAX_BYTES,
  RECEIPTS_DIR,
  ensureReceiptsDir,
  storeReceipt,
  resolveReceiptAbsolute,
};
