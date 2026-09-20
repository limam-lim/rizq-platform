/**
 * tenderDocument.js — رفع ملف مناقصة PDF (محمي — لا يُخدم مباشرة عبر static)
 */
const fs = require('fs');
const path = require('path');

let pdfParse = null;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  pdfParse = null;
}

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const PDF_DATA_URI_RE = /^data:application\/pdf;base64,(.+)$/i;
const PDF_UPLOAD_PREFIX = '/uploads/tenders/';
const INV_PDF_UPLOAD_PREFIX = '/uploads/investments/';

function parseDataUriPdf(dataUri) {
  if (typeof dataUri !== 'string') return { error: 'invalid_input' };
  const trimmed = dataUri.trim();
  let b64 = null;
  const m = PDF_DATA_URI_RE.exec(trimmed);
  if (m) b64 = m[1];
  else if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 100) b64 = trimmed.replace(/\s/g, '');
  else return { error: 'invalid_data_uri' };

  let buf;
  try {
    buf = Buffer.from(b64, 'base64');
  } catch (e) {
    return { error: 'invalid_base64' };
  }
  if (!buf.length) return { error: 'empty_buffer' };
  if (buf.length > MAX_PDF_BYTES) return { error: 'too_large' };
  if (buf.toString('ascii', 0, 5) !== '%PDF-') return { error: 'invalid_magic' };
  return { buf };
}

/**
 * @returns {Promise<string|null>} internal path e.g. /uploads/tenders/TND_x/document.pdf
 */
async function saveTenderDocument(tenderId, document) {
  if (!document || typeof document !== 'string') return null;
  if (document.indexOf(PDF_UPLOAD_PREFIX) === 0) return document;

  const parsed = parseDataUriPdf(document);
  if (!parsed || parsed.error) {
    const err = new Error(parsed && parsed.error ? parsed.error : 'invalid_pdf');
    err.code = 'invalid_pdf';
    throw err;
  }

  const dir = path.join(__dirname, '..', 'uploads', 'tenders', tenderId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, 'document.pdf');
  fs.writeFileSync(outPath, parsed.buf);
  return PDF_UPLOAD_PREFIX + tenderId + '/document.pdf';
}

/**
 * @returns {Promise<string|null>} /uploads/investments/<id>/document.pdf
 */
async function saveInvestmentDocument(invId, document) {
  if (!document || typeof document !== 'string') return null;
  if (document.indexOf(INV_PDF_UPLOAD_PREFIX) === 0) return document;

  const parsed = parseDataUriPdf(document);
  if (!parsed || parsed.error) {
    const err = new Error(parsed && parsed.error ? parsed.error : 'invalid_pdf');
    err.code = 'invalid_pdf';
    throw err;
  }

  const dir = path.join(__dirname, '..', 'uploads', 'investments', invId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, 'document.pdf');
  fs.writeFileSync(outPath, parsed.buf);
  return INV_PDF_UPLOAD_PREFIX + invId + '/document.pdf';
}

function resolveTenderUploadAbsPath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return null;
  const rel = relativePath.replace(/^\/uploads\//, '');
  if (!rel.startsWith('tenders/')) return null;
  const abs = path.resolve(path.join(__dirname, '..', 'uploads', rel));
  const base = path.resolve(path.join(__dirname, '..', 'uploads', 'tenders'));
  if (!abs.startsWith(base + path.sep) && abs !== base) return null;
  return abs;
}

const resolveTenderDocumentAbsPath = resolveTenderUploadAbsPath;

async function extractPdfText(buf) {
  if (!buf || !buf.length) return '';
  if (!pdfParse) return '';
  try {
    const data = await pdfParse(buf);
    return String(data && data.text ? data.text : '').slice(0, 50000);
  } catch (e) {
    return '';
  }
}

async function extractPdfTextFromDataUri(document) {
  const parsed = parseDataUriPdf(document);
  if (!parsed || parsed.error || !parsed.buf) return { text: '', error: parsed && parsed.error };
  const text = await extractPdfText(parsed.buf);
  return { text, buf: parsed.buf };
}

module.exports = {
  saveTenderDocument,
  saveInvestmentDocument,
  resolveTenderDocumentAbsPath,
  resolveTenderUploadAbsPath,
  parseDataUriPdf,
  extractPdfText,
  extractPdfTextFromDataUri,
  MAX_PDF_BYTES,
};
