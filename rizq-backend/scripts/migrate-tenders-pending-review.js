/**
 * ترحيل المناقصات القديمة المنشورة مباشرة (open بدون approvedAt) → pending_review
 * node scripts/migrate-tenders-pending-review.js [--apply]
 */
const fs = require('fs');
const path = require('path');

const TENDERS_FILE = path.join(__dirname, '..', 'data', 'tenders.json');
const apply = process.argv.includes('--apply');

function readTenders() {
  try { return JSON.parse(fs.readFileSync(TENDERS_FILE, 'utf8')); } catch (e) { return []; }
}

function main() {
  const list = readTenders();
  const candidates = list.filter((t) => {
    if (!t || t.status === 'removed' || t.status === 'rejected') return false;
    if (t.status === 'pending_review') return false;
    if (t.status === 'open' && !t.approvedAt) return true;
    return false;
  });

  console.log('Mode:', apply ? 'APPLY' : 'DRY-RUN');
  console.log('Candidates:', candidates.length);
  candidates.forEach((t) => {
    console.log(' -', t.id, '|', (t.title || '').slice(0, 50), '| status=', t.status);
  });

  if (!apply) {
    console.log('\nRun with --apply to migrate.');
    return;
  }

  let changed = 0;
  list.forEach((t) => {
    if (t && t.status === 'open' && !t.approvedAt) {
      t.status = 'pending_review';
      t.migratedAt = new Date().toISOString();
      changed += 1;
    }
  });
  fs.writeFileSync(TENDERS_FILE, JSON.stringify(list, null, 2), 'utf8');
  console.log('\nMigrated:', changed);
}

main();
