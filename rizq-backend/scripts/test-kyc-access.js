#!/usr/bin/env node
/**
 * test-kyc-access.js — وثائق الهوية: لا تسريب في القوائم، عرض عند الطلب بصلاحية kyc.view،
 * سجل تدقيق لكل محاولة، وحذف فعلي لصورة الهوية بعد التوثيق.
 * يتطلب DB_DRIVER=postgres + DATABASE_URL (قاعدة اختبار).
 */
'use strict';

const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

const BACKEND = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); }
}

function request(port, method, urlPath, body, headers) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port, method, path: urlPath,
      headers: Object.assign({ 'content-type': 'application/json' }, data ? { 'content-length': Buffer.byteLength(data) } : {}, headers || {}),
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let json = null;
        try { json = JSON.parse(buf.toString('utf8')); } catch (e) { /* binary */ }
        resolve({ status: res.statusCode, headers: res.headers, json, buf });
      });
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

async function waitForServer(port, ms) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const r = await request(port, 'GET', '/api/otp/config');
    if (r.status === 200) return true;
    await new Promise((s) => setTimeout(s, 300));
  }
  return false;
}

async function tinyWebpDataUri() {
  const sharp = require('sharp');
  const png = await sharp({ create: { width: 64, height: 40, channels: 3, background: { r: 30, g: 60, b: 120 } } }).png().toBuffer();
  return 'data:image/png;base64,' + png.toString('base64');
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-kyc-access: requires DB_DRIVER=postgres and DATABASE_URL (test database)');
    process.exit(2);
  }
  const repos = require('../db/repos');
  const objectStorage = require('../lib/objectStorage');
  const { saveKycImages } = require('../services/imagePipeline');
  const { createAdminSessionStore } = require('../services/adminSessionStore');
  const perms = require('../services/adminPermissions');

  console.log('\n— permissions —');
  ok('kyc.view is defined', perms.PERMISSION_DEFS.some((p) => p.key === 'kyc.view'));
  ok('legacy "admin" role does NOT get kyc.view', perms.permissionsForLegacyRole('admin').indexOf('kyc.view') === -1);
  ok('deputy_admin preset does NOT get kyc.view', perms.PERMISSION_PRESETS.deputy_admin.permissions.indexOf('kyc.view') === -1);
  ok('no preset grants kyc.view', Object.values(perms.PERMISSION_PRESETS).every((p) => p.permissions.indexOf('kyc.view') === -1));
  ok('super (*) has kyc.view', perms.hasAdminPermission(['*'], 'kyc.view') === true);

  // seed an account with real KYC files on disk
  const now = Date.now();
  const accId = 'ACC_KYC_' + now;
  const img = await tinyWebpDataUri();
  const saved = await saveKycImages(accId, { idImage: img, licenseImage: img });
  ok('KYC images stored under uploads/kyc/<account>/', saved.idImage && saved.idImage.indexOf('/uploads/kyc/' + accId + '/') === 0, saved);
  const acc = {
    id: accId, type: 'store', name: 'KYC Test', email: 'kyc' + now + '@test.mr', phone: '36' + String(now).slice(-6),
    status: 'pending', suspended: false, nni: String(now).slice(-10),
    idImage: saved.idImage, licenseImage: saved.licenseImage,
    accessToken: 'tok_kyc_' + now, accessTokenExpiresAt: new Date(now + 86400000).toISOString(),
    createdAt: new Date(now).toISOString(),
  };
  await repos.accounts.upsert(acc);

  // admin sessions directly in the shared store
  const sessions = createAdminSessionStore();
  const superTok = crypto.randomBytes(24).toString('hex');
  const opsTok = crypto.randomBytes(24).toString('hex');
  await sessions.set(superTok, { user: 'owner', name: 'Owner', role: 'super', permissions: ['*'], expiresAt: now + 3600000 });
  await sessions.set(opsTok, { user: 'ops1', name: 'Ops', role: 'staff', permissions: ['overview', 'accounts', 'users'], expiresAt: now + 3600000 });

  const port = 4000 + Math.floor(Math.random() * 90);
  const env = Object.assign({}, process.env, { PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test' });
  delete env.TELEGRAM_BOT_TOKEN;
  const child = spawn(process.execPath, ['server.js'], { cwd: BACKEND, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  try {
    const up = await waitForServer(port, 45000);
    ok('server boots', up, logs.slice(-600));
    if (!up) return;

    console.log('\n— no KYC data in admin lists —');
    const list = await request(port, 'GET', '/api/accounts/admin', null, { 'x-admin-token': opsTok });
    const row = list.json && Array.isArray(list.json.accounts) ? list.json.accounts.find((a) => a.id === accId) : null;
    ok('admin list returns the account', list.status === 200 && !!row, list.status);
    ok('admin list has NO idImage / licenseImage', row && !('idImage' in row) && !('licenseImage' in row) && !('id_image' in row), row && Object.keys(row));
    ok('admin list has presence flags only', row && row.hasIdImage === true && row.hasLicenseImage === true);
    ok('admin list body contains no base64 image', list.buf && list.buf.toString('utf8').indexOf('data:image') === -1);

    console.log('\n— on-demand view —');
    const url = '/api/admin/kyc/' + accId + '/id';
    const anon = await request(port, 'GET', url);
    ok('no auth → 401', anon.status === 401, anon.status);
    const ops = await request(port, 'GET', url, null, { 'x-admin-token': opsTok });
    ok('admin without kyc.view → 403', ops.status === 403, ops.status);
    const secret = process.env.BACKEND_SHARED_SECRET;
    if (secret) {
      const srv = await request(port, 'GET', url, null, { 'x-rizq-secret': secret });
      ok('shared server secret → 403 (human session required)', srv.status === 403 && srv.json && srv.json.error === 'human_admin_session_required', srv.status);
    }
    const bad = await request(port, 'GET', '/api/admin/kyc/' + accId + '/passport', null, { 'x-admin-token': superTok });
    ok('unknown doc type → 400', bad.status === 400, bad.status);
    const view = await request(port, 'GET', url + '?reason=review', null, { 'x-admin-token': superTok });
    ok('super session → 200 image', view.status === 200 && /image\/webp/.test(view.headers['content-type'] || ''), view.status);
    ok('response is no-store', /no-store/.test(view.headers['cache-control'] || ''));
    ok('response bytes are a real WebP', view.buf && view.buf.slice(0, 4).toString() === 'RIFF' && view.buf.slice(8, 12).toString() === 'WEBP');

    // tampered path pointing outside the account folder is refused
    const other = Object.assign({}, acc, { id: accId + '_x', idImage: saved.idImage, email: 'x' + acc.email, nni: '' });
    await repos.accounts.upsert(other);
    const cross = await request(port, 'GET', '/api/admin/kyc/' + other.id + '/id', null, { 'x-admin-token': superTok });
    ok("another account's file path is refused → 404", cross.status === 404, cross.status);

    console.log('\n— audit trail —');
    const audit = await request(port, 'GET', '/api/admin/kyc-audit?accountId=' + accId, null, { 'x-admin-token': superTok });
    const entries = (audit.json && audit.json.entries) || [];
    ok('audit lists entries', audit.status === 200 && entries.length >= 2, audit.status);
    const viewed = entries.find((e) => e.outcome === 'viewed');
    ok('successful view logged with admin + doc + reason', viewed && viewed.admin === 'owner' && viewed.doc === 'id' && viewed.reason === 'review', viewed);
    const deniedPerm = entries.find((e) => e.outcome === 'denied_no_permission');
    ok('admin without kyc.view: refusal is logged (who tried)', deniedPerm && deniedPerm.admin === 'ops1', deniedPerm);
    const auditOps = await request(port, 'GET', '/api/admin/kyc-audit', null, { 'x-admin-token': opsTok });
    ok('audit log itself requires kyc.view', auditOps.status === 403, auditOps.status);

    console.log('\n— approval purges the ID file from disk —');
    const idFile = saved.idImage;
    ok('ID file exists before approval', objectStorage.exists(idFile));
    const dec = await request(port, 'POST', '/api/accounts/admin/' + accId + '/decision', { action: 'approve' }, { 'x-admin-token': superTok });
    ok('approve → 200', dec.status === 200, dec.json);
    await new Promise((s) => setTimeout(s, 500));
    ok('ID file (all variants) deleted from disk after approval',
      !objectStorage.exists(idFile) && !objectStorage.exists(idFile.replace(/\.webp$/, '.full.webp')) && !objectStorage.exists(idFile.replace(/\.webp$/, '.thumb.webp')));
    ok('license document kept (proof of activity)', objectStorage.exists(saved.licenseImage));
    const stored = (await repos.accounts.list()).find((a) => a.id === accId);
    ok('record: no idImage, id_verified=true, NNI kept', stored && !stored.idImage && stored.id_verified === true && !!stored.nni, stored && { idImage: stored.idImage, v: stored.id_verified });
  } finally {
    child.kill('SIGTERM');
    await new Promise((s) => setTimeout(s, 400));
    try { objectStorage.deletePrefixSync('kyc/' + accId + '/'); } catch (e) { /* */ }
    if (fail) console.log('\n--- server log tail ---\n' + logs.slice(-1500));
  }
  console.log(`\nkyc access: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
