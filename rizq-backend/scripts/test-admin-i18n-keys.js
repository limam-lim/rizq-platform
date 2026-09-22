/**
 * تحقق من مفاتيح i18n لوحة الأدمن (صلاحيات + مناقصات) — عربي/فرنسي بدون تسرب
 * node scripts/test-admin-i18n-keys.js
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'rizq_i18n_data.js'), 'utf8');

function extractAdminKeys(marker) {
  const start = src.indexOf(marker);
  if (start === -1) throw new Error('marker not found: ' + marker);
  const adminStart = src.indexOf('"admin":', start);
  const adminBodyStart = src.indexOf('{', adminStart);
  let depth = 0;
  let i = adminBodyStart;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  const block = src.slice(adminBodyStart, i);
  const obj = {};
  const pairRe = /"([^"]+)":\s*"((?:\\.|[^"\\])*)"/g;
  let pm;
  while ((pm = pairRe.exec(block))) obj[pm[1]] = pm[2];
  return obj;
}

const REQUIRED = [
  'team-sub-dynamic', 'am-preset-label', 'am-perms-label', 'am-pass-hint', 'am-edit-title',
  'am-save-edit-btn', 'am-preset-placeholder', 'adm-role-super', 'adm-perm-word',
  'perm-full-access', 'perm-none', 'perm-denied-section', 'team-loading', 'team-load-fail',
  'team-no-perm', 'team-server-fail', 'tm-h', 'tm-sub', 'tm-refresh-btn', 'tm-empty', 'tm-error',
  'topbar-tenders-mod', 'topbar-promo-video', 'topbar-modules', 'topbar-announcements',
  'topbar-subscriber-agents', 'topbar-quota-guard',
  'set-my-pass-title', 'set-my-pass-sub', 'set-my-pass-btn', 'sb-change-pass',
  'cap-title', 'cap-sub', 'cap-cur-label', 'cap-new-label', 'cap-confirm-label',
  'cap-save-btn', 'cap-cancel-btn',
];

const ar = extractAdminKeys('RIZQ_I18N_AR');
const fr = extractAdminKeys('RIZQ_I18N_FR');
const arRe = /[\u0600-\u06FF]/;
let failed = 0;

REQUIRED.forEach(function (k) {
  const a = ar[k];
  const f = fr[k];
  const ok = a && f && arRe.test(a) && !arRe.test(f);
  if (!ok) failed++;
  console.log((ok ? 'OK  ' : 'FAIL') + ' ' + k);
});

console.log('\n' + (failed ? 'FAILED' : 'ALL PASSED') + ': ' + (REQUIRED.length - failed) + '/' + REQUIRED.length);
process.exit(failed ? 1 : 0);
