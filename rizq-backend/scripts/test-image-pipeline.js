#!/usr/bin/env node
/** Tests: magic bytes rejection + WebP output + EXIF strip */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const {
  detectImageMagic,
  parseDataUriImage,
  saveAdImages,
} = require('../services/imagePipeline');

const TMP = path.join(__dirname, '..', 'uploads', 'ads', '__pipeline_test__');

function ok(name, pass, detail) {
  console.log((pass ? '✅' : '❌') + ' ' + name + (detail ? ' — ' + detail : ''));
  return pass;
}

async function makePngDataUri() {
  const buf = await sharp({
    create: { width: 40, height: 40, channels: 3, background: { r: 27, g: 58, b: 107 } },
  })
    .png()
    .toBuffer();
  return 'data:image/png;base64,' + buf.toString('base64');
}

async function run() {
  let passed = 0;
  let total = 0;
  function check(name, pass, detail) {
    total++;
    if (ok(name, pass, detail)) passed++;
  }

  // 1. Magic bytes — reject fake JPEG (HTML)
  const fake = Buffer.from('<html>not an image</html>');
  check('reject non-image magic', detectImageMagic(fake) === null);

  // 2. Reject executable disguised as image data-uri
  const exeB64 = 'data:image/jpeg;base64,' + Buffer.from('MZ fake exe').toString('base64');
  const exeParsed = parseDataUriImage(exeB64);
  check('reject exe as jpeg', exeParsed && exeParsed.error === 'invalid_magic');

  // 3. Valid PNG → save as WebP
  try {
    if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
  } catch (e) { /* ignore */ }

  const pngUri = await makePngDataUri();
  const urls = await saveAdImages('__pipeline_test__', [pngUri]);
  check('save returns webp url', urls.length === 1 && urls[0].endsWith('0.webp'), urls[0]);

  const outFile = path.join(TMP, '0.webp');
  check('webp file exists', fs.existsSync(outFile));

  if (fs.existsSync(outFile)) {
    const meta = await sharp(outFile).metadata();
    check('output format is webp', meta.format === 'webp');
    check('no exif block', !meta.exif || meta.exif.length === 0, 'format=' + meta.format);
  }

  // 4. Existing path passthrough
  const existing = ['/uploads/ads/RZQ-2026-12345/0.jpg'];
  const kept = await saveAdImages('RZQ-2026-12345', existing);
  check('existing upload path unchanged', kept[0] === existing[0]);

  // cleanup
  try {
    if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
  } catch (e) { /* ignore */ }

  console.log('\n' + passed + '/' + total + ' checks passed\n');
  process.exit(passed === total ? 0 : 1);
}

run().catch(function (e) {
  console.error('Test failed:', e.message);
  process.exit(1);
});
