#!/usr/bin/env node
/**
 * يفرض قيمة ?v= واحدة لـ rizq_header.js مطابقة لـ ASSET_V في rizq_pwa.js.
 * يفشل إن وُجد أكثر من إصدار لنفس الملف في HTML/SW.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'uploads'
      || ent.name === 'data' || ent.name === 'backups' || ent.name === '_archive'
      || ent.name === '_backup' || ent.name.startsWith('_backup')) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(html|js)$/i.test(ent.name)) out.push(full);
  }
  return out;
}

const pwaSrc = fs.readFileSync(path.join(ROOT, 'rizq_pwa.js'), 'utf8');
const assetM = pwaSrc.match(/ASSET_V\s*=\s*'([^']+)'/);
const assetV = assetM && assetM[1];
ok('ASSET_V present in rizq_pwa.js', !!assetV, assetV);

const files = walk(ROOT, []);
const re = /rizq_header\.js\?v=([0-9.]+)/g;
const byVersion = new Map();
const hits = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  /* الاختبار نفسه وملفات الوثائق قد تذكر أمثلة — نتجاهل qa/ وscripts/ */
  if (rel.startsWith('qa' + path.sep) || rel.startsWith('rizq-backend' + path.sep + 'scripts')) continue;
  const src = fs.readFileSync(file, 'utf8');
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(src))) {
    const v = m[1];
    hits.push({ file: rel, v });
    if (!byVersion.has(v)) byVersion.set(v, []);
    byVersion.get(v).push(rel);
  }
}

ok('at least one rizq_header.js?v= reference', hits.length > 0, hits.length);
const versions = Array.from(byVersion.keys()).sort();
ok('single rizq_header.js version across repo', versions.length === 1, versions);
ok('rizq_header.js ?v= equals ASSET_V', versions.length === 1 && versions[0] === assetV, {
  assetV,
  versions,
  sample: hits.slice(0, 5),
});

/* sw.js precache يجب أن يطابق أيضاً */
const swHit = hits.find((h) => h.file === 'sw.js');
ok('sw.js precaches rizq_header.js at ASSET_V', !!swHit && swHit.v === assetV, swHit);

console.log(fail ? '\nFAILED ' + fail + ' / ' + (pass + fail) : '\nALL OK / ' + pass);
process.exit(fail ? 1 : 0);
