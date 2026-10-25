/**
 * تجريد تخزين الملفات/الصور — محلي اليوم، جاهز لـ S3/Hetzner Object Storage غداً.
 * مسارات الـ API تتعامل فقط مع مفاتيح منطقية وURLs عامة، لا مسارات قرص مطلقة.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DRIVER = String(process.env.RIZQ_STORAGE_DRIVER || 'local').toLowerCase();
const LOCAL_ROOT = path.join(__dirname, '..', 'uploads');
const PUBLIC_PREFIX = '/uploads/';

function normalizeKey(key) {
  return String(key || '')
    .replace(/^\/+/, '')
    .replace(/^uploads\//, '')
    .replace(/\.\./g, '');
}

function publicUrlForKey(key) {
  const k = normalizeKey(key);
  return PUBLIC_PREFIX + k;
}

function localAbsPath(key) {
  const k = normalizeKey(key);
  const abs = path.join(LOCAL_ROOT, k);
  const root = path.resolve(LOCAL_ROOT) + path.sep;
  if (!abs.startsWith(root) && abs !== path.resolve(LOCAL_ROOT)) {
    throw new Error('storage_path_escape');
  }
  return abs;
}

async function putLocal(key, buffer, _contentType) {
  const abs = localAbsPath(key);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = abs + '.tmp';
  fs.writeFileSync(tmp, buffer);
  fs.renameSync(tmp, abs);
  return { key: normalizeKey(key), url: publicUrlForKey(key), driver: 'local' };
}

async function putS3(key, buffer, contentType) {
  // سائق سحابي اختياري — يُفعَّل عبر RIZQ_STORAGE_DRIVER=s3 ومتغيرات AWS المتوافقة
  const bucket = process.env.RIZQ_S3_BUCKET || process.env.BACKUP_S3_BUCKET;
  if (!bucket) throw new Error('RIZQ_S3_BUCKET required for s3 driver');
  let S3Client;
  let PutObjectCommand;
  try {
    ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
  } catch (e) {
    throw new Error('install @aws-sdk/client-s3 for s3 storage driver');
  }
  const clientOpts = {
    region: process.env.RIZQ_S3_REGION || process.env.BACKUP_S3_REGION || 'us-east-1',
  };
  if (process.env.RIZQ_S3_ACCESS_KEY_ID || process.env.BACKUP_S3_ACCESS_KEY_ID) {
    clientOpts.credentials = {
      accessKeyId: process.env.RIZQ_S3_ACCESS_KEY_ID || process.env.BACKUP_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.RIZQ_S3_SECRET_ACCESS_KEY || process.env.BACKUP_S3_SECRET_ACCESS_KEY,
    };
  }
  const endpoint = process.env.RIZQ_S3_ENDPOINT || process.env.BACKUP_S3_ENDPOINT;
  if (endpoint) {
    clientOpts.endpoint = endpoint;
    clientOpts.forcePathStyle = process.env.RIZQ_S3_FORCE_PATH_STYLE !== 'false';
  }
  const client = new S3Client(clientOpts);
  const k = normalizeKey(key);
  const prefix = (process.env.RIZQ_S3_PREFIX || 'rizq-uploads/').replace(/^\/*/, '').replace(/\/*$/, '') + '/';
  const fullKey = prefix + k;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: fullKey,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  }));
  const base = process.env.RIZQ_S3_PUBLIC_BASE || (PUBLIC_PREFIX);
  const url = String(base).replace(/\/*$/, '/') + k;
  return { key: k, url, driver: 's3', objectKey: fullKey };
}

/**
 * @param {{ key: string, buffer: Buffer, contentType?: string }} opts
 * @returns {Promise<{ key: string, url: string, driver: string }>}
 */
async function putObject(opts) {
  const key = normalizeKey(opts && opts.key);
  const buffer = opts && opts.buffer;
  if (!key || !Buffer.isBuffer(buffer)) throw new Error('putObject requires key + buffer');
  if (DRIVER === 's3') return putS3(key, buffer, opts.contentType);
  return putLocal(key, buffer, opts.contentType);
}

function resolveLocalPath(keyOrUrl) {
  let key = String(keyOrUrl || '');
  if (key.indexOf(PUBLIC_PREFIX) === 0) key = key.slice(PUBLIC_PREFIX.length);
  return localAbsPath(key);
}

function exists(keyOrUrl) {
  try {
    return fs.existsSync(resolveLocalPath(keyOrUrl));
  } catch (e) {
    return false;
  }
}

async function deleteObject(keyOrUrl) {
  if (DRIVER === 's3') {
    // حذف سحابي اختياري — تجاهل بصمت إن لم يُضبط SDK
    return { ok: true, skipped: true, reason: 's3_delete_not_wired' };
  }
  try {
    const abs = resolveLocalPath(keyOrUrl);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function dirSizeBytes(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  const stack = [dirPath];
  while (stack.length) {
    const dir = stack.pop();
    let names;
    try { names = fs.readdirSync(dir); } catch (e) { continue; }
    for (let i = 0; i < names.length; i++) {
      const fp = path.join(dir, names[i]);
      try {
        const st = fs.statSync(fp);
        if (st.isDirectory()) stack.push(fp);
        else if (st.isFile()) total += st.size;
      } catch (e) { /* ignore */ }
    }
  }
  return total;
}

/**
 * حدود بادئة المجلد — يمنع ads/12 من مطابقة ads/120 أو ads/123.
 * يُرجع مفتاح المجلد بلا شرطة نهائية + الشكل المحدود بشرطة.
 */
function boundDirectoryPrefix(prefixKey) {
  const key = normalizeKey(prefixKey).replace(/\/+$/, '');
  if (!key) return { ok: false, error: 'empty_prefix' };
  return { ok: true, dirKey: key, boundedKey: key + '/' };
}

/**
 * حذف مجلد/بادئة كاملة (وسائط إعلان وغيره) — المسار الوحيد المسموح لحذف المجلدات.
 * المسار يُعامل كدليل مغلق بشرطة: ads/12/ لا يمس ads/120.
 * @param {string} prefixKey مثلاً ads/12 أو ads/12/
 * @returns {{ ok: boolean, bytesFreed: number, skipped?: boolean, reason?: string, error?: string, boundedKey?: string }}
 */
function deletePrefixSync(prefixKey) {
  const bound = boundDirectoryPrefix(prefixKey);
  if (!bound.ok) return { ok: false, bytesFreed: 0, error: bound.error };
  const { dirKey, boundedKey } = bound;
  if (DRIVER === 's3') {
    return { ok: true, bytesFreed: 0, skipped: true, reason: 's3_delete_prefix_not_wired', boundedKey };
  }
  try {
    const abs = localAbsPath(dirKey);
    const root = path.resolve(LOCAL_ROOT) + path.sep;
    const absDir = path.resolve(abs);
    // يجب أن يكون المسار دليلاً تحت uploads وليس بادئة نصية لجارٍ
    if (!absDir.startsWith(root) && absDir !== path.resolve(LOCAL_ROOT)) {
      return { ok: false, bytesFreed: 0, error: 'storage_path_escape', boundedKey };
    }
    if (!fs.existsSync(absDir)) return { ok: true, bytesFreed: 0, boundedKey };
    const st = fs.statSync(absDir);
    if (!st.isDirectory()) {
      // لا نحذف ملفاً مفرداً عبر deletePrefix — الأمان للمجلدات فقط
      return { ok: false, bytesFreed: 0, error: 'not_a_directory', boundedKey };
    }
    // تأكيد أن اسم المجلد يطابق المفتاح بالضبط (عزل 12 عن 120)
    const baseName = path.basename(absDir);
    const expectedBase = path.basename(dirKey);
    if (baseName !== expectedBase) {
      return { ok: false, bytesFreed: 0, error: 'prefix_mismatch', boundedKey };
    }
    const bytesFreed = dirSizeBytes(absDir);
    fs.rmSync(absDir, { recursive: true, force: true });
    return { ok: true, bytesFreed, boundedKey };
  } catch (e) {
    return { ok: false, bytesFreed: 0, error: e.message, boundedKey };
  }
}

async function deletePrefix(prefixKey) {
  return deletePrefixSync(prefixKey);
}

function ensureLocalDir(relativeDir) {
  const abs = path.join(LOCAL_ROOT, normalizeKey(relativeDir));
  if (!fs.existsSync(abs)) fs.mkdirSync(abs, { recursive: true });
  return abs;
}

module.exports = {
  putObject,
  deleteObject,
  deletePrefix,
  deletePrefixSync,
  boundDirectoryPrefix,
  resolveLocalPath,
  publicUrlForKey,
  normalizeKey,
  exists,
  ensureLocalDir,
  LOCAL_ROOT,
  PUBLIC_PREFIX,
  DRIVER,
};
