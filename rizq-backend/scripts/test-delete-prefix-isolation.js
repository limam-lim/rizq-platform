#!/usr/bin/env node
/** V1: حذف ads/12/ لا يمس ads/120 أو ads/123 */
'use strict';

const fs = require('fs');
const path = require('path');
const objectStorage = require('../lib/objectStorage');
const { purgeAdMedia } = require('../services/adLifecycle');

const ROOT = objectStorage.LOCAL_ROOT;
const ADS = path.join(ROOT, 'ads');

function ok(name, pass, detail) {
  console.log((pass ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''));
  return pass;
}

function touch(id, name) {
  const dir = path.join(ADS, String(id));
  fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, name || '0.webp');
  fs.writeFileSync(fp, 'media-for-' + id);
  return fp;
}

function existsDir(id) {
  return fs.existsSync(path.join(ADS, String(id)));
}

let passed = 0;
let total = 0;
function check(name, pass, detail) {
  total++;
  if (ok(name, pass, detail)) passed++;
}

// cleanup leftovers
['12', '120', '123', '12x'].forEach((id) => {
  try { fs.rmSync(path.join(ADS, id), { recursive: true, force: true }); } catch (e) { /* ignore */ }
});

touch('12', '0.webp');
touch('120', '0.webp');
touch('123', 'keep.webp');

const bound = objectStorage.boundDirectoryPrefix('ads/12');
check('bound ends with slash', bound.ok && bound.boundedKey === 'ads/12/', bound.boundedKey);

const r = objectStorage.deletePrefixSync('ads/12/');
check('deletePrefix ok', r.ok === true && r.bytesFreed > 0, 'bytes=' + r.bytesFreed);
check('boundedKey reported', r.boundedKey === 'ads/12/');
check('ads/12 removed', !existsDir('12'));
check('ads/120 untouched', existsDir('120') && fs.existsSync(path.join(ADS, '120', '0.webp')));
check('ads/123 untouched', existsDir('123') && fs.existsSync(path.join(ADS, '123', 'keep.webp')));

// without trailing slash still isolates
touch('12', '0.webp');
const r2 = objectStorage.deletePrefixSync('ads/12');
check('ads/12 without slash still isolates', r2.ok && !existsDir('12') && existsDir('120') && existsDir('123'));

// purgeAdMedia uses trailing slash path
touch('12', 'a.webp');
const bytes = purgeAdMedia('12');
check('purgeAdMedia removes only 12', bytes > 0 && !existsDir('12') && existsDir('120') && existsDir('123'));

// cleanup
['12', '120', '123'].forEach((id) => {
  try { fs.rmSync(path.join(ADS, id), { recursive: true, force: true }); } catch (e) { /* ignore */ }
});

console.log('\n' + passed + '/' + total + ' checks passed\n');
process.exit(passed === total ? 0 : 1);
