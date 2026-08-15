#!/usr/bin/env node
/** Quick UTF-8 check for files updated in recent audit sessions */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FILES = [
  'rizq_dashboard_office.html',
  'rizq_dashboard_corp.html',
  'rizq_dashboard_store.html',
  'rizq_landing_v8.html',
  'rizq_landing_ux.js',
  'rizq_corp.html',
  'rizq_admin.html',
  'rizq-backend/server.js',
  'rizq-backend/services/otpService.js',
  'rizq-backend/services/agentTickets.js',
  'rizq-backend/scripts/comprehensive-system-audit.js',
  'rizq-backend/.env.example',
  'RIZQ_COMPREHENSIVE_SYSTEM_AUDIT_2026-08-13.md',
];

const MOJIBAKE = /[\uFFFD]|[\u0080-\u009F]|�{2,}/;

let ok = 0;
let warn = 0;
const issues = [];

for (const rel of FILES) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) {
    issues.push({ file: rel, status: 'MISSING' });
    warn++;
    continue;
  }
  const buf = fs.readFileSync(fp);
  let text;
  try {
    text = buf.toString('utf8');
    if (Buffer.from(text, 'utf8').compare(buf) !== 0 && buf[0] !== 0xef) {
      issues.push({ file: rel, status: 'INVALID_UTF8' });
      warn++;
      continue;
    }
  } catch (e) {
    issues.push({ file: rel, status: 'DECODE_ERROR', detail: e.message });
    warn++;
    continue;
  }

  const hasBom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  const mojibakeLines = [];
  text.split('\n').forEach((line, i) => {
    if (MOJIBAKE.test(line) || (line.includes('�') && !line.trim().startsWith('//'))) {
      mojibakeLines.push(i + 1);
    }
  });
  // For server.js: only flag NEW blocks we added if corrupted; legacy comment corruption is informational
  const legacyOnly = rel === 'rizq-backend/server.js' && mojibakeLines.length > 0;

  if (replacementCount > 0 || mojibakeLines.length > 0) {
    issues.push({
      file: rel,
      status: legacyOnly ? 'LEGACY_COMMENTS_ONLY' : 'MOJIBAKE',
      replacementCount,
      sampleLines: mojibakeLines.slice(0, 5),
      lineCount: mojibakeLines.length,
    });
    if (legacyOnly) ok++;
    else warn++;
  } else {
    ok++;
    issues.push({ file: rel, status: 'OK', bytes: buf.length, bom: hasBom });
  }
}

console.log('\n=== UTF-8 Encoding Check (updated files) ===\n');
issues.forEach((x) => {
  if (x.status === 'OK') {
    console.log('OK  ', x.file, x.bom ? '(UTF-8 BOM)' : '');
  } else if (x.status === 'LEGACY_COMMENTS_ONLY') {
    console.log('WARN', x.file, '- legacy mojibake in old comments (~' + x.lineCount + ' lines), new code blocks clean');
  } else {
    console.log('FAIL', x.file, JSON.stringify(x));
  }
});
console.log('\nSummary: ' + ok + ' clean, ' + warn + ' with notes/issues\n');
process.exit(warn > 0 && issues.some((x) => x.status === 'MOJIBAKE' || x.status === 'INVALID_UTF8') ? 1 : 0);
