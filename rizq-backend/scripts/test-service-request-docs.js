'use strict';

/**
 * اختبار تخزين بيان الدفع لغرفة الطلبات (صورة/PDF) + حماية المسار.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  storeServiceDoc,
  resolveServiceDocAbsolute,
  publicAttachmentMeta,
  ensureDocsDir,
  DOCS_DIR,
  MAX_BYTES,
} = require('../services/serviceRequestDocs');

function ok(label, cond) {
  if (!cond) throw new Error('FAIL: ' + label);
  console.log('  ✓ ' + label);
}

function tinyPngDataUrl() {
  // 1x1 PNG
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  return 'data:image/png;base64,' + b64;
}

function tinyPdfDataUrl() {
  const pdf = '%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n';
  return 'data:application/pdf;base64,' + Buffer.from(pdf, 'utf8').toString('base64');
}

console.log('[test-service-request-docs]');
ensureDocsDir();
ok('docs dir exists', fs.existsSync(DOCS_DIR));

const png = storeServiceDoc(tinyPngDataUrl(), {
  accountId: 'ACC-TEST',
  requestId: 'SRQ-TEST',
  originalName: 'بيان-دفع',
});
ok('png stored', png.ok === true && png.mime === 'image/png');
ok('png path prefix', String(png.relativePath).startsWith('service-docs/'));
ok('png abs resolve', !!resolveServiceDocAbsolute(png.relativePath));

const pdf = storeServiceDoc(tinyPdfDataUrl(), {
  accountId: 'ACC-TEST',
  requestId: 'SRQ-TEST',
  originalName: 'payment-proof',
});
ok('pdf stored', pdf.ok === true && pdf.mime === 'application/pdf');

const bad = storeServiceDoc('data:text/plain;base64,aGVsbG8=', {
  accountId: 'ACC-TEST',
  requestId: 'SRQ-TEST',
});
ok('rejects plain text', bad.ok === false && bad.status === 415);

ok('path traversal blocked', resolveServiceDocAbsolute('../server.js') === null);
ok('wrong prefix blocked', resolveServiceDocAbsolute('receipts/x.png') === null);

const meta = publicAttachmentMeta({
  id: png.id,
  relativePath: png.relativePath,
  mime: png.mime,
  bytes: png.bytes,
  originalName: png.originalName,
  createdAt: new Date().toISOString(),
});
ok('public meta hides path', meta && meta.id && !meta.relativePath);
ok('max bytes positive', MAX_BYTES > 0);

// cleanup test files
try {
  const absPng = resolveServiceDocAbsolute(png.relativePath);
  const absPdf = resolveServiceDocAbsolute(pdf.relativePath);
  if (absPng) fs.unlinkSync(absPng);
  if (absPdf) fs.unlinkSync(absPdf);
} catch (_) { /* ignore */ }

console.log('[test-service-request-docs] ALL PASSED');
