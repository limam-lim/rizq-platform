/**
 * Safe Image Upload Pipeline — magic bytes + sharp WebP + EXIF strip
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const MAX_INPUT_BYTES = 3 * 1024 * 1024;
const DATA_URI_RE = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i;
const WEBP_QUALITY = 85;

/** Detect real image type from buffer header (not declared MIME). */
function detectImageMagic(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/**
 * Parse data-URI image; validate size + magic bytes.
 * Returns { buf, detected } or { error: code }.
 */
function parseDataUriImage(dataUri) {
  if (typeof dataUri !== 'string') return { error: 'invalid_input' };
  const m = DATA_URI_RE.exec(dataUri.trim());
  if (!m) return { error: 'invalid_data_uri' };
  let buf;
  try {
    buf = Buffer.from(m[2], 'base64');
  } catch (e) {
    return { error: 'invalid_base64' };
  }
  if (!buf.length) return { error: 'empty_buffer' };
  if (buf.length > MAX_INPUT_BYTES) return { error: 'too_large' };
  const detected = detectImageMagic(buf);
  if (!detected) return { error: 'invalid_magic' };
  return { buf, detected };
}

/** Re-encode to WebP; auto-rotate strips EXIF orientation then output has no EXIF. */
async function processBufferToWebp(buf, outPath) {
  await sharp(buf, { failOn: 'error', limitInputPixels: 4096 * 4096 })
    .rotate()
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(outPath);
}

/**
 * Save array of data-URI images (or keep existing /uploads/ paths).
 * @param {object} opts
 * @param {string} opts.uploadUrlPrefix e.g. '/uploads/ads/'
 * @param {string} opts.uploadsDir absolute dir
 * @param {string} opts.entityId
 * @param {string[]} opts.images
 * @param {number} opts.maxCount
 */
async function saveProcessedImages({ uploadUrlPrefix, uploadsDir, entityId, images, maxCount }) {
  if (!Array.isArray(images) || !images.length) return [];
  const dir = path.join(uploadsDir, entityId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const urls = [];
  const slice = images.slice(0, maxCount);
  for (let i = 0; i < slice.length; i++) {
    const img = slice[i];
    if (typeof img !== 'string') continue;
    if (img.indexOf(uploadUrlPrefix) === 0) {
      urls.push(img);
      continue;
    }
    const parsed = parseDataUriImage(img);
    if (!parsed || parsed.error) continue;
    const filename = i + '.webp';
    const outPath = path.join(dir, filename);
    await processBufferToWebp(parsed.buf, outPath);
    urls.push(uploadUrlPrefix + entityId + '/' + filename);
  }
  return urls;
}

async function saveAdImages(adId, images) {
  return saveProcessedImages({
    uploadUrlPrefix: '/uploads/ads/',
    uploadsDir: path.join(__dirname, '..', 'uploads', 'ads'),
    entityId: adId,
    images,
    maxCount: 8,
  });
}

async function saveCatalogImages(itemId, images) {
  return saveProcessedImages({
    uploadUrlPrefix: '/uploads/catalog/',
    uploadsDir: path.join(__dirname, '..', 'uploads', 'catalog'),
    entityId: itemId,
    images,
    maxCount: 8,
  });
}

async function saveCatalogImage(itemId, image) {
  const urls = await saveCatalogImages(itemId, image ? [image] : []);
  return urls[0] || null;
}

async function saveTenderImages(tenderId, images) {
  return saveProcessedImages({
    uploadUrlPrefix: '/uploads/tenders/',
    uploadsDir: path.join(__dirname, '..', 'uploads', 'tenders'),
    entityId: tenderId,
    images,
    maxCount: 3,
  });
}

module.exports = {
  detectImageMagic,
  parseDataUriImage,
  processBufferToWebp,
  saveProcessedImages,
  saveAdImages,
  saveCatalogImages,
  saveCatalogImage,
  saveTenderImages,
  MAX_INPUT_BYTES,
};
