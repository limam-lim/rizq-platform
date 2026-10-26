#!/usr/bin/env node
/**
 * إعادة توليد نسخ الصور الثلاث (thumb / medium / full) للملفات الموجودة.
 * الاستخدام:
 *   node scripts/regen-image-variants.js [--dry-run] [--paid] [namespace...]
 * الافتراضي: ads catalog tenders investments
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  processBufferToVariants,
  VARIANT_SPECS,
} = require('../services/imagePipeline');
const objectStorage = require('../lib/objectStorage');

const ROOT = objectStorage.LOCAL_ROOT;
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forcePaid = args.includes('--paid');
const namespaces = args.filter((a) => !a.startsWith('--'));
const NS = namespaces.length ? namespaces : ['ads', 'catalog', 'tenders', 'investments'];

function isMediumWebp(name) {
  return /^\d+\.webp$/i.test(name) && !/\.(thumb|full)\.webp$/i.test(name);
}

async function regenFile(absMedium, paid) {
  const buf = fs.readFileSync(absMedium);
  const variants = await processBufferToVariants(buf, { paid });
  const rel = path.relative(ROOT, absMedium).replace(/\\/g, '/');
  const thumbKey = rel.replace(/\.webp$/i, VARIANT_SPECS.thumb.suffix + '.webp');
  const fullKey = rel.replace(/\.webp$/i, VARIANT_SPECS.full.suffix + '.webp');
  if (dryRun) {
    return { rel, thumbKey, fullKey, dry: true };
  }
  // أعد كتابة medium أيضاً بمعيار 900/85 لضمان التوحيد
  await objectStorage.putObject({ key: rel, buffer: variants.medium, contentType: 'image/webp' });
  await objectStorage.putObject({ key: thumbKey, buffer: variants.thumb, contentType: 'image/webp' });
  await objectStorage.putObject({ key: fullKey, buffer: variants.full, contentType: 'image/webp' });
  return { rel, thumbKey, fullKey };
}

async function walkNs(ns) {
  const base = path.join(ROOT, ns);
  if (!fs.existsSync(base)) return { ns, done: 0, skipped: 0 };
  let done = 0;
  let skipped = 0;
  const entities = fs.readdirSync(base);
  for (const ent of entities) {
    const dir = path.join(base, ent);
    let st;
    try { st = fs.statSync(dir); } catch (e) { continue; }
    if (!st.isDirectory()) continue;
    const files = fs.readdirSync(dir);
    for (const name of files) {
      if (!isMediumWebp(name)) {
        skipped++;
        continue;
      }
      const abs = path.join(dir, name);
      try {
        const r = await regenFile(abs, forcePaid);
        done++;
        console.log((dryRun ? '[dry] ' : '') + '✓ ' + r.rel);
      } catch (e) {
        console.error('✗ ' + path.relative(ROOT, abs) + ' — ' + e.message);
      }
    }
  }
  return { ns, done, skipped };
}

async function main() {
  console.log('regen-image-variants — namespaces:', NS.join(', '), dryRun ? '(dry-run)' : '');
  let total = 0;
  for (const ns of NS) {
    const r = await walkNs(ns);
    total += r.done;
    console.log('  ' + ns + ': regenerated=' + r.done);
  }
  console.log('Done. total=' + total);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
