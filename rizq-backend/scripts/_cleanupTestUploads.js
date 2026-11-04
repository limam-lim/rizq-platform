'use strict';

const fs = require('fs');
const path = require('path');

/**
 * يحذف مجلدات الكتالوج المؤقتة التي تُنشئها الاختبارات (CAT-<timestamp>-*).
 * يُبقي CAT_PROMO_* والملفات المتتبَّعة للعرض الترويجي.
 */
function cleanupTestUploads(opts) {
  opts = opts || {};
  const root = opts.root || path.join(__dirname, '..', 'uploads', 'catalog');
  if (!fs.existsSync(root)) return { removed: [], kept: 0 };
  const removed = [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    /* CAT-1793… timestamp uploads from tests — not CAT_PROMO_* fixtures */
    if (/^CAT-\d{10,}-/.test(ent.name)) {
      const full = path.join(root, ent.name);
      try {
        fs.rmSync(full, { recursive: true, force: true });
        removed.push(ent.name);
      } catch (e) {
        if (opts.verbose) console.warn('[cleanup-uploads]', ent.name, e.message);
      }
    }
  }
  return { removed, kept: entries.length - removed.length };
}

module.exports = { cleanupTestUploads };

if (require.main === module) {
  const r = cleanupTestUploads({ verbose: true });
  console.log('removed', r.removed.length, r.removed);
  process.exit(0);
}
