/**
 * يرفض أي تشغيل اختبار إذا كان DATABASE_URL لا يشير إلى قاعدة rizq_test.
 * يُحمَّل عبر: node -r ./scripts/assert-rizq-test-db.js …
 */
'use strict';

function dbNameFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    return String(u.pathname || '').replace(/^\//, '').split('?')[0] || '';
  } catch (e) {
    const m = String(url).match(/\/([^/?]+)(?:\?|$)/);
    return m ? m[1] : '';
  }
}

const url = process.env.DATABASE_URL || '';
const name = dbNameFromUrl(url);

if (!url) {
  console.error(
    'REFUSED: DATABASE_URL is required and must point to rizq_test.\n' +
      'Run tests via: npm run test:<name> (wraps scripts/run-with-test-db.js).'
  );
  process.exit(2);
}

if (name !== 'rizq_test') {
  console.error(
    'REFUSED: tests must use database rizq_test only.\n' +
      'Got DATABASE_URL database="' + name + '".\n' +
      'Preview DB (e.g. rizq_audit) must never receive test writes.\n' +
      'Use: npm run test:<name>  or  node scripts/run-with-test-db.js <script>'
  );
  process.exit(2);
}

module.exports = { dbNameFromUrl, assertRizqTestDb: function assertRizqTestDb() { return name; } };
