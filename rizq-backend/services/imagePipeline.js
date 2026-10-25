/**
 * Safe Image Upload Pipeline — magic bytes + sharp WebP variants + EXIF strip
 * يحفظ عبر objectStorage (محلي الآن / S3 لاحقاً) دون ربط API بمسارات القرص.
 *
 * النسخ الثلاث:
 *   thumbnail — 400px / q80  →  N.thumb.webp
 *   medium    — 900px / q85  →  N.webp        (الرابط الأساسي المخزَّن)
 *   full      — 1920px / q85 (q90 مدفوع) → N.full.webp
 */
const path = require('path');
const sharp = require('sharp');
const objectStorage = require('../lib/objectStorage');

const MAX_INPUT_BYTES = 3 * 1024 * 1024;
const DATA_URI_RE = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i;

const VARIANT_SPECS = {
  thumb: { width: 400, quality: 80, suffix: '.thumb' },
  medium: { width: 900, quality: 85, suffix: '' },
  full: { width: 1920, quality: 85, suffix: '.full' },
};

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

async function encodeWebpVariant(buf, width, quality) {
  return sharp(buf, { failOn: 'error', limitInputPixels: 4096 * 4096 })
    .rotate()
    .resize({
      width,
      height: width * 4,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();
}

/** Re-encode to WebP buffer; auto-rotate strips EXIF. (medium default) */
async function processBufferToWebpBuffer(buf) {
  return encodeWebpVariant(buf, VARIANT_SPECS.medium.width, VARIANT_SPECS.medium.quality);
}

/**
 * Generate thumb / medium / full WebP buffers.
 * @param {Buffer} buf
 * @param {{ paid?: boolean }} [opts]
 */
async function processBufferToVariants(buf, opts) {
  const paid = !!(opts && opts.paid);
  const fullQ = paid ? 90 : VARIANT_SPECS.full.quality;
  const [thumb, medium, full] = await Promise.all([
    encodeWebpVariant(buf, VARIANT_SPECS.thumb.width, VARIANT_SPECS.thumb.quality),
    encodeWebpVariant(buf, VARIANT_SPECS.medium.width, VARIANT_SPECS.medium.quality),
    encodeWebpVariant(buf, VARIANT_SPECS.full.width, fullQ),
  ]);
  return { thumb, medium, full };
}

/**
 * Derive variant URLs from the stored medium URL (…/N.webp).
 * Legacy non-webp URLs fall back to the same URL for all slots.
 */
function variantUrlsFromMedium(mediumUrl) {
  const url = String(mediumUrl || '');
  if (!url) return { thumb: '', medium: '', full: '' };
  if (!/\.webp$/i.test(url) || /\.(thumb|full)\.webp$/i.test(url)) {
    return { thumb: url, medium: url, full: url };
  }
  return {
    thumb: url.replace(/\.webp$/i, '.thumb.webp'),
    medium: url,
    full: url.replace(/\.webp$/i, '.full.webp'),
  };
}

function mediumKeyFromBase(ns, safeId, index) {
  return ns + '/' + safeId + '/' + index + '.webp';
}

function variantKey(mediumKey, kind) {
  const spec = VARIANT_SPECS[kind] || VARIANT_SPECS.medium;
  if (!spec.suffix) return mediumKey;
  return String(mediumKey).replace(/\.webp$/i, spec.suffix + '.webp');
}

/**
 * Write all three variants; returns medium public URL.
 */
async function putImageVariants(ns, safeId, index, buf, opts) {
  const variants = await processBufferToVariants(buf, opts);
  const mediumKey = mediumKeyFromBase(ns, safeId, index);
  await objectStorage.putObject({
    key: variantKey(mediumKey, 'thumb'),
    buffer: variants.thumb,
    contentType: 'image/webp',
  });
  const saved = await objectStorage.putObject({
    key: mediumKey,
    buffer: variants.medium,
    contentType: 'image/webp',
  });
  await objectStorage.putObject({
    key: variantKey(mediumKey, 'full'),
    buffer: variants.full,
    contentType: 'image/webp',
  });
  return saved.url;
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
 * @param {boolean} [opts.paid] full variant quality 90
 */
async function saveProcessedImages({ namespace, uploadUrlPrefix, entityId, images, maxCount, paid }) {
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
      // تجاهل روابط النسخ الفرعية إن وصلت بالخطأ — خزّن medium فقط
      if (/\.(thumb|full)\.webp$/i.test(img)) {
        urls.push(img.replace(/\.(thumb|full)\.webp$/i, '.webp'));
      } else {
        urls.push(img);
      }
      continue;
    }
    // رفض أي /uploads/... لا يخص هذا الكيان
    if (img.indexOf('/uploads/') === 0) continue;
    const parsed = parseDataUriImage(img);
    if (!parsed || parsed.error) continue;
    const savedUrl = await putImageVariants(ns, safeId, i, parsed.buf, { paid: !!paid });
    urls.push(savedUrl);
  }
  return urls;
}

async function saveAdImages(adId, images, opts) {
  return saveProcessedImages({
    namespace: 'ads',
    entityId: adId,
    images,
    maxCount: 8,
    paid: !!(opts && opts.paid),
  });
}

async function saveCatalogImages(itemId, images, opts) {
  return saveProcessedImages({
    namespace: 'catalog',
    entityId: itemId,
    images,
    maxCount: 8,
    paid: !!(opts && opts.paid),
  });
}

async function saveCatalogImage(itemId, image, opts) {
  const urls = await saveCatalogImages(itemId, image ? [image] : [], opts);
  return urls[0] || null;
}

async function saveTenderImages(tenderId, images, opts) {
  return saveProcessedImages({
    namespace: 'tenders',
    entityId: tenderId,
    images,
    maxCount: 3,
    paid: !!(opts && opts.paid),
  });
}

async function saveInvestmentImages(invId, images, opts) {
  return saveProcessedImages({
    namespace: 'investments',
    entityId: invId,
    images,
    maxCount: 3,
    paid: !!(opts && opts.paid),
  });
}

module.exports = {
  detectImageMagic,
  parseDataUriImage,
  processBufferToWebp,
  processBufferToWebpBuffer,
  processBufferToVariants,
  variantUrlsFromMedium,
  putImageVariants,
  saveProcessedImages,
  saveAdImages,
  saveCatalogImages,
  saveCatalogImage,
  saveTenderImages,
  saveInvestmentImages,
  VARIANT_SPECS,
  MAX_INPUT_BYTES,
};
