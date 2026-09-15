/**
 * Tests for tender PDF document pipeline + access control
 * node scripts/test-tender-document.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  saveTenderDocument,
  resolveTenderDocumentAbsPath,
  parseDataUriPdf,
} = require('../services/tenderDocument');

const PORT = Number(process.env.PORT || 3000);
const BASE = 'http://127.0.0.1:' + PORT;
const DATA_DIR = path.join(__dirname, '..', 'data');
const TENDERS_FILE = path.join(DATA_DIR, 'tenders.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

let passed = 0;
let failed = 0;

function ok(name, cond, detail) {
  if (cond) { passed++; console.log('OK  ', name, detail || ''); }
  else { failed++; console.log('FAIL', name, detail || ''); }
}

async function req(method, urlPath, body, headers) {
  const r = await fetch(BASE + urlPath, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, body: j, headers: r.headers };
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

// Minimal valid PDF header
const MIN_PDF_B64 = Buffer.from('%PDF-1.4\n%%EOF\n').toString('base64');
const MIN_PDF_URI = 'data:application/pdf;base64,' + MIN_PDF_B64;

async function main() {
  console.log('\n=== Tender Document Tests ===\n');

  ok('parseDataUriPdf valid', !!parseDataUriPdf(MIN_PDF_URI).buf);
  ok('parseDataUriPdf rejects bad magic', parseDataUriPdf('data:application/pdf;base64,' + Buffer.from('NOTPDF').toString('base64')).error === 'invalid_magic');

  const tenderId = 'TND_test_doc_' + Date.now();
  const saved = await saveTenderDocument(tenderId, MIN_PDF_URI);
  ok('saveTenderDocument returns path', saved === '/uploads/tenders/' + tenderId + '/document.pdf');
  const abs = resolveTenderDocumentAbsPath(saved);
  ok('resolveTenderDocumentAbsPath exists', abs && fs.existsSync(abs));

  const staticBlocked = await req('GET', '/uploads/tenders/' + tenderId + '/document.pdf');
  ok('static PDF blocked', staticBlocked.status === 403);

  const anonDoc = await req('GET', '/api/tenders/' + tenderId + '/document');
  ok('anonymous document download blocked', anonDoc.status === 403 || anonDoc.status === 404);

  // Seed tender + account for owner access
  const accessToken = crypto.randomBytes(20).toString('hex');
  const accountId = 'acc_tdoc_' + Date.now();
  const accounts = readJson(ACCOUNTS_FILE, []);
  accounts.push({
    id: accountId,
    type: 'store',
    name: 'Doc Test Owner',
    phone: '22119988',
    status: 'approved',
    accessToken,
  });
  writeJson(ACCOUNTS_FILE, accounts);

  const tenders = readJson(TENDERS_FILE, []);
  tenders.unshift({
    id: tenderId,
    ownerId: accountId,
    ownerName: 'Doc Test Owner',
    title: 'Test PDF tender',
    desc: 'desc',
    category: 'معدات',
    city: 'نواكشوط',
    budgetMin: 0,
    budgetMax: 0,
    deadline: new Date(Date.now() + 86400000 * 30).toISOString(),
    images: [],
    document: saved,
    documentName: 'specs.pdf',
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    bids: [],
  });
  writeJson(TENDERS_FILE, tenders);

  const ownerDoc = await fetch(BASE + '/api/tenders/' + tenderId + '/document', {
    headers: { 'x-account-id': accountId, 'x-account-token': accessToken },
  });
  ok('owner can download pending_review PDF', ownerDoc.status === 200 && (ownerDoc.headers.get('content-type') || '').includes('pdf'));

  // Public list should not expose document URL for non-subscriber
  const list = await req('GET', '/api/tenders');
  const pub = (list.body && list.body.tenders || []).find((t) => t.id === tenderId);
  ok('pending tender not in public list', !pub);

  // Cleanup test tender + account
  writeJson(TENDERS_FILE, readJson(TENDERS_FILE, []).filter((t) => t.id !== tenderId));
  writeJson(ACCOUNTS_FILE, readJson(ACCOUNTS_FILE, []).filter((a) => a.id !== accountId));
  if (abs && fs.existsSync(abs)) {
    try { fs.unlinkSync(abs); fs.rmdirSync(path.dirname(abs)); } catch (e) { /* ignore */ }
  }

  console.log('\n=== Summary ===');
  console.log('Passed:', passed, '/', passed + failed);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
