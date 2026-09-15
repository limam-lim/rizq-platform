/**
 * Unit tests for contactLeakGuard.js
 * node scripts/test-contact-leak-guard.js
 */
const { scanContactLeak, scanContactLeakFields, redactContactPatterns } = require('../services/contactLeakGuard');

let passed = 0;
let failed = 0;

function ok(name, cond) {
  if (cond) { passed++; console.log('OK  ', name); }
  else { failed++; console.log('FAIL', name); }
}

ok('detects email', scanContactLeak('تواصل seller@test.com').hasLeak);
ok('detects MR phone', scanContactLeak('اتصل 22 12 34 56').hasLeak);
ok('detects arabic digits phone', scanContactLeak('رقم ٢٢١٢٣٤٥٦').hasLeak);
ok('detects whatsapp keyword', scanContactLeak('راسلني على واتساب').hasLeak);
ok('detects t.me link', scanContactLeak('https://t.me/myuser').hasLeak);
ok('detects instagram', scanContactLeak('instagram.com/vendor').hasLeak);
ok('detects literal digit words consecutive', scanContactLeak('صفر واحد اثنان ثلاثة').hasLeak);
ok('detects contact keyword tel', scanContactLeak('call me on mobile').hasLeak);
ok('clean business text', !scanContactLeak('توريد 50 كيس أسمنت لنواكشوط').hasLeak);

const fields = scanContactLeakFields([
  { key: 'title', val: 'مناقصة سليمة' },
  { key: 'desc', val: 'وصف بدون تواصل' },
]);
ok('fields scan clean', !fields.hasLeak);

const bad = scanContactLeakFields([{ key: 'notes', val: 'واتساب 22112233' }]);
ok('fields scan bad notes', bad.hasLeak && bad.fields[0].field === 'notes');

const red = redactContactPatterns('email x@y.z phone 22112233');
ok('redact masks email', red.indexOf('@') === -1 || red.indexOf('•••') !== -1);

console.log('\n=== Summary ===');
console.log('Passed:', passed, '/', passed + failed);
process.exit(failed ? 1 : 0);
