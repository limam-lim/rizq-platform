/**
 * tenderDocument.js — رفع ملف مناقصة PDF عبر objectStorage
 */
const path = require('path');
const objectStorage = require('../lib/objectStorage');

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

async function saveTenderDocument(tenderId, document) {
  if (!document || typeof document !== 'string') return null;
  if (document.indexOf(PDF_UPLOAD_PREFIX) === 0) return document;

  const parsed = parseDataUriPdf(document);
  if (!parsed || parsed.error) {
    const err = new Error(parsed && parsed.error ? parsed.error : 'invalid_pdf');
    err.code = 'invalid_pdf';
    throw err;
  }

  const key = 'tenders/' + tenderId + '/document.pdf';
  const saved = await objectStorage.putObject({
    key,
    buffer: parsed.buf,
    contentType: 'application/pdf',
  });
  return saved.url;
}

async function saveInvestmentDocument(invId, document) {
  if (!document || typeof document !== 'string') return null;
  if (document.indexOf(INV_PDF_UPLOAD_PREFIX) === 0) return document;

  const parsed = parseDataUriPdf(document);
  if (!parsed || parsed.error) {
    const err = new Error(parsed && parsed.error ? parsed.error : 'invalid_pdf');
    err.code = 'invalid_pdf';
    throw err;
  }

  const key = 'investments/' + invId + '/document.pdf';
  const saved = await objectStorage.putObject({
    key,
    buffer: parsed.buf,
    contentType: 'application/pdf',
  });
  return saved.url;
}

function resolveTenderUploadAbsPath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return null;
  try {
    const abs = objectStorage.resolveLocalPath(relativePath);
    const baseT = path.resolve(objectStorage.LOCAL_ROOT, 'tenders');
    const baseI = path.resolve(objectStorage.LOCAL_ROOT, 'investments');
    if (abs.startsWith(baseT + path.sep) || abs === baseT) return abs;
    if (abs.startsWith(baseI + path.sep) || abs === baseI) return abs;
    // توافق قديم: tenders فقط
    if (!String(relativePath).includes('tenders/')) return null;
    return abs.startsWith(baseT + path.sep) ? abs : null;
  } catch (e) {
    return null;
  }
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
