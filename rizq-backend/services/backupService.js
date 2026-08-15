/**
 * Offsite Backup — encrypted tar.gz of data/ + uploads/, 30-day retention,
 * optional S3 / SFTP export via environment variables.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const tar = require('tar');

const MAGIC = Buffer.from('RIQZBK01');
const IV_LEN = 12;
const TAG_LEN = 16;
const DEFAULT_RETENTION_DAYS = 30;
const BACKUP_PREFIX = 'rizq-backup-';

const SKIP_DIR_NAMES = new Set(['__lifecycle_test__', '__pipeline_test__', '__backup_test__', '_rizq_backup']);

function backendRootFromModule() {
  return path.join(__dirname, '..');
}

function resolveBackupDir(root) {
  const custom = process.env.BACKUP_DIR;
  if (custom) return path.isAbsolute(custom) ? custom : path.join(root, custom);
  return path.join(root, 'backups');
}

function getRetentionDays() {
  const n = Number(process.env.BACKUP_RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_RETENTION_DAYS;
}

function getEncryptionKey() {
  const raw = process.env.BACKUP_ENCRYPTION_KEY;
  if (!raw || !String(raw).trim()) {
    throw new Error('BACKUP_ENCRYPTION_KEY is required (64-char hex or passphrase)');
  }
  const trimmed = String(raw).trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, 'hex');
  return crypto.scryptSync(trimmed, 'rizq-backup-salt-v1', 32);
}

function shouldSkipEntry(relPath) {
  const parts = relPath.split(/[/\\]/);
  return parts.some((p) => SKIP_DIR_NAMES.has(p) || (p.startsWith('__') && p.endsWith('__')));
}

async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

async function collectTreeEntries(rootDir, prefix) {
  const entries = [];
  if (!fs.existsSync(rootDir)) return entries;

  async function walk(absDir, relBase) {
    const names = fs.readdirSync(absDir);
    for (const name of names) {
      const abs = path.join(absDir, name);
      const rel = relBase ? relBase + '/' + name : name;
      if (shouldSkipEntry(rel)) continue;
      const st = fs.statSync(abs);
      if (st.isDirectory()) await walk(abs, rel);
      else if (st.isFile()) {
        entries.push({
          path: prefix + '/' + rel.replace(/\\/g, '/'),
          sha256: await sha256File(abs),
          size: st.size,
        });
      }
    }
  }

  await walk(rootDir, '');
  return entries;
}

async function buildManifest(backendRoot) {
  const dataEntries = await collectTreeEntries(path.join(backendRoot, 'data'), 'data');
  const uploadEntries = await collectTreeEntries(path.join(backendRoot, 'uploads'), 'uploads');
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    algorithm: 'aes-256-gcm',
    entryCount: dataEntries.length + uploadEntries.length,
    entries: dataEntries.concat(uploadEntries),
  };
}

async function createTarGz(backendRoot, manifest, tarGzPath) {
  const metaRoot = path.join(backendRoot, '_rizq_backup');
  fs.mkdirSync(metaRoot, { recursive: true });
  fs.writeFileSync(path.join(metaRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  const include = ['_rizq_backup'];
  if (fs.existsSync(path.join(backendRoot, 'data'))) include.push('data');
  if (fs.existsSync(path.join(backendRoot, 'uploads'))) include.push('uploads');

  try {
    await tar.c({ gzip: true, file: tarGzPath, cwd: backendRoot }, include);
  } finally {
    fs.rmSync(metaRoot, { recursive: true, force: true });
  }
}

async function encryptFile(inputPath, outputPath, key) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain = fs.readFileSync(inputPath);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  fs.writeFileSync(outputPath, Buffer.concat([MAGIC, iv, enc, authTag]));
}

async function decryptFile(inputPath, outputPath, key) {
  const fd = fs.openSync(inputPath, 'r');
  try {
    const magic = Buffer.alloc(MAGIC.length);
    fs.readSync(fd, magic, 0, MAGIC.length, 0);
    if (!magic.equals(MAGIC)) throw new Error('invalid_backup_format');

    const iv = Buffer.alloc(IV_LEN);
    fs.readSync(fd, iv, 0, IV_LEN, MAGIC.length);

    const stat = fs.fstatSync(fd);
    const cipherLen = stat.size - MAGIC.length - IV_LEN - TAG_LEN;
    if (cipherLen <= 0) throw new Error('invalid_backup_size');

    const ciphertext = Buffer.alloc(cipherLen);
    fs.readSync(fd, ciphertext, 0, cipherLen, MAGIC.length + IV_LEN);

    const authTag = Buffer.alloc(TAG_LEN);
    fs.readSync(fd, authTag, 0, TAG_LEN, MAGIC.length + IV_LEN + cipherLen);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    fs.writeFileSync(outputPath, plain);
  } finally {
    fs.closeSync(fd);
  }
}

async function extractTarGz(tarGzPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  await tar.x({ file: tarGzPath, cwd: destDir });
}

function backupStamp(date) {
  const d = date || new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function applyRetentionPolicy(backupDir, retentionDays) {
  if (!fs.existsSync(backupDir)) return { removed: [], kept: 0 };
  const files = fs.readdirSync(backupDir)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith('.rizqenc'))
    .map((f) => {
      const fp = path.join(backupDir, f);
      return { name: f, mtime: fs.statSync(fp).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  const removed = [];
  files.slice(retentionDays).forEach((f) => {
    fs.unlinkSync(path.join(backupDir, f.name));
    const metaName = f.name.replace('.rizqenc', '.meta.json');
    const metaPath = path.join(backupDir, metaName);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
    removed.push(f.name);
  });
  return { removed, kept: Math.min(files.length, retentionDays) };
}

async function uploadToS3(localPath, remoteName) {
  if (!process.env.BACKUP_S3_BUCKET) return { skipped: true, reason: 'BACKUP_S3_BUCKET not set' };
  let S3Client;
  let PutObjectCommand;
  try {
    ({ S3Client, PutObjectCommand } = require('@aws-sdk/client-s3'));
  } catch (e) {
    return { ok: false, error: 'install @aws-sdk/client-s3 for S3 export' };
  }

  const clientOpts = {
    region: process.env.BACKUP_S3_REGION || 'us-east-1',
  };
  if (process.env.BACKUP_S3_ACCESS_KEY_ID && process.env.BACKUP_S3_SECRET_ACCESS_KEY) {
    clientOpts.credentials = {
      accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
    };
  }
  if (process.env.BACKUP_S3_ENDPOINT) {
    clientOpts.endpoint = process.env.BACKUP_S3_ENDPOINT;
    clientOpts.forcePathStyle = process.env.BACKUP_S3_FORCE_PATH_STYLE === 'true';
  }

  const client = new S3Client(clientOpts);
  const prefix = (process.env.BACKUP_S3_PREFIX || 'rizq-backups/').replace(/^\/*/, '').replace(/\/*$/, '') + '/';
  const key = prefix + remoteName;
  const body = fs.createReadStream(localPath);

  await client.send(new PutObjectCommand({
    Bucket: process.env.BACKUP_S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: 'application/octet-stream',
  }));

  return { ok: true, bucket: process.env.BACKUP_S3_BUCKET, key };
}

async function uploadToSftp(localPath, remoteName) {
  if (!process.env.BACKUP_SFTP_HOST) return { skipped: true, reason: 'BACKUP_SFTP_HOST not set' };
  let Client;
  try {
    Client = require('ssh2-sftp-client');
  } catch (e) {
    return { ok: false, error: 'install ssh2-sftp-client for SFTP export' };
  }

  const sftp = new Client();
  const remoteDir = (process.env.BACKUP_SFTP_REMOTE_DIR || '/backups/rizq').replace(/\/+$/, '');
  const connectOpts = {
    host: process.env.BACKUP_SFTP_HOST,
    port: Number(process.env.BACKUP_SFTP_PORT) || 22,
    username: process.env.BACKUP_SFTP_USER || '',
  };
  if (process.env.BACKUP_SFTP_PRIVATE_KEY_PATH) {
    connectOpts.privateKey = fs.readFileSync(process.env.BACKUP_SFTP_PRIVATE_KEY_PATH, 'utf8');
  } else if (process.env.BACKUP_SFTP_PASSWORD) {
    connectOpts.password = process.env.BACKUP_SFTP_PASSWORD;
  }

  try {
    await sftp.connect(connectOpts);
    try {
      await sftp.mkdir(remoteDir, true);
    } catch (e) { /* may exist */ }
    const remotePath = remoteDir + '/' + remoteName;
    await sftp.put(localPath, remotePath);
    return { ok: true, remotePath };
  } finally {
    await sftp.end();
  }
}

/**
 * Create encrypted daily backup.
 * @param {object} [opts]
 * @param {string} [opts.backendRoot]
 * @param {string} [opts.trigger]
 */
async function runDailyBackup(opts) {
  opts = opts || {};
  const backendRoot = opts.backendRoot || backendRootFromModule();
  const backupDir = resolveBackupDir(backendRoot);
  const retentionDays = getRetentionDays();
  const trigger = opts.trigger || 'manual';
  const stamp = backupStamp();
  const encName = BACKUP_PREFIX + stamp + '.rizqenc';
  const encPath = path.join(backupDir, encName);
  const stagingTar = path.join(backupDir, '.staging-' + stamp + '.tar.gz');

  fs.mkdirSync(backupDir, { recursive: true });

  const summary = {
    ok: false,
    runAt: new Date().toISOString(),
    trigger,
    backupFile: encName,
    backupPath: encPath,
    entryCount: 0,
    plainBytes: 0,
    encryptedBytes: 0,
    retentionDays,
    retentionRemoved: [],
    exports: { s3: null, sftp: null },
    errors: [],
  };

  try {
    const key = getEncryptionKey();
    const manifest = await buildManifest(backendRoot);
    summary.entryCount = manifest.entryCount;

    await createTarGz(backendRoot, manifest, stagingTar);
    summary.plainBytes = fs.statSync(stagingTar).size;

    await encryptFile(stagingTar, encPath, key);
    summary.encryptedBytes = fs.statSync(encPath).size;

    const meta = {
      createdAt: summary.runAt,
      trigger,
      backupFile: encName,
      entryCount: manifest.entryCount,
      plainBytes: summary.plainBytes,
      encryptedBytes: summary.encryptedBytes,
      encryptedSha256: await sha256File(encPath),
      retentionDays,
    };
    fs.writeFileSync(
      path.join(backupDir, encName.replace('.rizqenc', '.meta.json')),
      JSON.stringify(meta, null, 2),
      'utf8'
    );

    summary.exports.s3 = await uploadToS3(encPath, encName);
    summary.exports.sftp = await uploadToSftp(encPath, encName);

    const retention = applyRetentionPolicy(backupDir, retentionDays);
    summary.retentionRemoved = retention.removed;
    summary.retentionKept = retention.kept;
    summary.ok = true;
    return summary;
  } catch (e) {
    summary.errors.push(e.message);
    throw e;
  } finally {
    if (fs.existsSync(stagingTar)) {
      try { fs.unlinkSync(stagingTar); } catch (err) { /* ignore */ }
    }
  }
}

/**
 * Decrypt backup, extract, verify manifest hashes (restore verification).
 * @param {string} backupPath — path to .rizqenc file
 * @param {object} [opts]
 * @param {string} [opts.extractDir] — if set, leaves extracted tree in place
 */
async function verifyBackupRestore(backupPath, opts) {
  opts = opts || {};
  if (!fs.existsSync(backupPath)) throw new Error('backup_not_found');

  const key = getEncryptionKey();
  const workRoot = opts.workRoot || path.join(path.dirname(backupPath), '.restore-verify-' + Date.now());
  const tarGz = path.join(workRoot, 'bundle.tar.gz');
  const extractDir = opts.extractDir || path.join(workRoot, 'extracted');

  fs.mkdirSync(workRoot, { recursive: true });

  const result = {
    ok: false,
    backupPath,
    verifiedFiles: 0,
    missingFiles: [],
    hashMismatches: [],
    errors: [],
  };

  try {
    await decryptFile(backupPath, tarGz, key);
    await extractTarGz(tarGz, extractDir);

    const manifestPath = path.join(extractDir, '_rizq_backup', 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error('manifest_missing');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    for (const entry of manifest.entries || []) {
      const fp = path.join(extractDir, entry.path.replace(/\//g, path.sep));
      if (!fs.existsSync(fp)) {
        result.missingFiles.push(entry.path);
        continue;
      }
      const hash = await sha256File(fp);
      if (hash !== entry.sha256) {
        result.hashMismatches.push({ path: entry.path, expected: entry.sha256, actual: hash });
      } else {
        result.verifiedFiles++;
      }
    }

    result.entryCount = (manifest.entries || []).length;
    result.ok = result.missingFiles.length === 0 && result.hashMismatches.length === 0;
    return result;
  } finally {
    if (!opts.keepWorkDir) {
      try { fs.rmSync(workRoot, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    }
  }
}

function readLatestBackupMeta(backendRoot) {
  const backupDir = resolveBackupDir(backendRoot || backendRootFromModule());
  if (!fs.existsSync(backupDir)) return null;
  const metas = fs.readdirSync(backupDir)
    .filter((f) => f.endsWith('.meta.json'))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (!metas.length) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(backupDir, metas[0].name), 'utf8'));
  } catch (e) {
    return null;
  }
}

module.exports = {
  DEFAULT_RETENTION_DAYS,
  runDailyBackup,
  verifyBackupRestore,
  applyRetentionPolicy,
  buildManifest,
  decryptFile,
  encryptFile,
  resolveBackupDir,
  getEncryptionKey,
  readLatestBackupMeta,
};
