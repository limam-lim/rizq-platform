/**
 * Safe Image Upload Pipeline — magic bytes + sharp WebP + EXIF strip
 * يحفظ عبر objectStorage (محلي الآن / S3 لاحقاً) دون ربط API بمسارات القرص.
 */
const path = require('path');
const sharp = require('sharp');
const objectStorage = require('../lib/objectStorage');

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

/** Re-encode to WebP buffer; auto-rotate strips EXIF. */
async function processBufferToWebpBuffer(buf) {
  return sharp(buf, { failOn: 'error', limitInputPixels: 4096 * 4096 })
    .rotate()
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

/** @deprecated تفضيل processBufferToWebpBuffer + objectStorage.putObject */
async function processBufferToWebp(buf, outPath) {
  const webp = await processBufferToWebpBuffer(buf);
  const key = path.relative(objectStorage.LOCAL_ROOT, outPath).replace(/\\/g, '/');
  await objectStorage.putObject({ key, buffer: webp, contentType: 'image/webp' });
}

/**
 * Save array of data-URI images (or keep existing /uploads/ paths).
 * @param {object} opts
 * @param {string} opts.namespace e.g. 'ads' | 'catalog' | 'tenders' | 'investments'
 * @param {string} [opts.uploadUrlPrefix] legacy — يُشتق من namespace إن غاب
 * @param {string} [opts.uploadsDir] ignored (تجريد التخزين)
 * @param {string} opts.entityId
 * @param {string[]} opts.images
 * @param {number} opts.maxCount
 */
async function saveProcessedImages({ namespace, uploadUrlPrefix, entityId, images, maxCount }) {
  if (!Array.isArray(images) || !images.length) return [];
  const ns = String(namespace || '').replace(/^\/+|\/+$/g, '')
    || String(uploadUrlPrefix || '').replace(/^\/?uploads\/?/, '').replace(/\/+$/, '')
    || 'misc';
  const safeId = String(entityId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return [];
  const prefix = '/uploads/' + ns + '/';
  const urls = [];
  const slice = images.slice(0, maxCount);
  // إعادة استخدام URL موجود فقط إن كان تحت مجلد هذا الكيان (منع اختطاف وسائط الغير)
  const ownedPrefix = prefix + safeId + '/';
  for (let i = 0; i < slice.length; i++) {
    const img = slice[i];
    if (typeof img !== 'string') continue;
    if (img.indexOf(ownedPrefix) === 0) {
      urls.push(img);
      continue;
    }
    // رفض أي /uploads/... لا يخص هذا الكيان
    if (img.indexOf('/uploads/') === 0) continue;
    const parsed = parseDataUriImage(img);
    if (!parsed || parsed.error) continue;
    const filename = i + '.webp';
    const key = ns + '/' + safeId + '/' + filename;
    const webp = await processBufferToWebpBuffer(parsed.buf);
    const saved = await objectStorage.putObject({
      key,
      buffer: webp,
      contentType: 'image/webp',
    });
    urls.push(saved.url);
  }
  return urls;
}

async function saveAdImages(adId, images) {
  return saveProcessedImages({
    namespace: 'ads',
    entityId: adId,
    images,
    maxCount: 8,
  });
}

async function saveCatalogImages(itemId, images) {
  return saveProcessedImages({
    namespace: 'catalog',
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
    namespace: 'tenders',
    entityId: tenderId,
    images,
    maxCount: 3,
  });
}

async function saveInvestmentImages(invId, images) {
  return saveProcessedImages({
    namespace: 'investments',
    entityId: invId,
    images,
    maxCount: 3,
  });
}

module.exports = {
  detectImageMagic,
  parseDataUriImage,
  processBufferToWebp,
  processBufferToWebpBuffer,
  saveProcessedImages,
  saveAdImages,
  saveCatalogImages,
  saveCatalogImage,
  saveTenderImages,
  saveInvestmentImages,
  MAX_INPUT_BYTES,
};
