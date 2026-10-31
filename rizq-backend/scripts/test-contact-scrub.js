#!/usr/bin/env node
/**
 * test-contact-scrub.js — AUD-CONTACT-* + AUD-UPLOAD-OVERSIZE
 * - Public account redacts tagline/address when contacts locked
 * - facebook wa.me → null; facebook.com accepted
 * - Profile PATCH with phone in tagline → 422
 * - Catalog image ~2MB over 1.5MB site limit → 413
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');

const BACKEND = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 280) : ''); }
}

/** Build a data-URI whose decoded buffer length is ~targetBytes with valid JPEG magic. */
function jpegDataUriOfSize(targetBytes) {
  const header = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  const tail = Buffer.from([0xff, 0xd9]);
  const midLen = Math.max(0, targetBytes - header.length - tail.length);
  const body = Buffer.concat([header, Buffer.alloc(midLen, 0x00), tail]);
  return 'data:image/jpeg;base64,' + body.toString('base64');
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-contact-scrub: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }

  const repos = require('../db/repos');
  const {
    DEFAULT_CATALOG_MAX_IMAGE_BYTES,
    parseDataUriImage,
  } = require('../services/imagePipeline');
  const {
    stripContactLeak,
    sanitizePublicFacebookUrl,
  } = require('../services/contactLeakGuard');

  console.log('\n— unit helpers —');
  ok('stripContactLeak redacts local phone', /•••|محجوب/.test(stripContactLeak('أفضل متجر اتصل 45112233')));
  ok('sanitizePublicFacebookUrl accepts facebook.com', !!sanitizePublicFacebookUrl('https://www.facebook.com/rizq.mr'));
  ok('sanitizePublicFacebookUrl accepts fb.com', !!sanitizePublicFacebookUrl('https://fb.com/rizq'));
  ok('sanitizePublicFacebookUrl accepts m.facebook.com', !!sanitizePublicFacebookUrl('https://m.facebook.com/rizq'));
  ok('sanitizePublicFacebookUrl rejects wa.me', sanitizePublicFacebookUrl('https://wa.me/22245112233') === null);
  ok('DEFAULT_CATALOG_MAX_IMAGE_BYTES is 1.5MB', DEFAULT_CATALOG_MAX_IMAGE_BYTES === Math.floor(1.5 * 1024 * 1024));

  const over = parseDataUriImage(jpegDataUriOfSize(2 * 1024 * 1024), { maxBytes: DEFAULT_CATALOG_MAX_IMAGE_BYTES });
  ok('parseDataUriImage 2MB vs 1.5MB → too_large', over && over.error === 'too_large', over);

  const now = Date.now();
  const phone = '45' + String(now).slice(-6);
  const email = 'scrub' + now + '@test.mr';
  const pw = 'Scrub!' + now;
  const accId = 'ACC_SCRUB_' + now;
  await repos.accounts.upsert({
    id: accId,
    type: 'store',
    name: 'متجر تنقية',
    email,
    phone,
    city: 'نواكشوط',
    status: 'approved',
    suspended: false,
    passHash: await bcrypt.hash(pw, 10),
    tagline: 'أفضل متجر اتصل ' + phone,
    address: 'عرفات هاتف ' + phone,
    desc: 'للطلب واتساب ' + phone,
    facebook: 'https://wa.me/222' + phone,
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
  });

  const site = (await repos.getSiteConfig()) || {};
  site.uploadLimits = Object.assign({}, site.uploadLimits || {}, {
    store: { maxPhotosPerAd: 8, maxImageBytes: DEFAULT_CATALOG_MAX_IMAGE_BYTES },
  });
  await repos.saveSiteConfig(site);

  await repos.setPackage(accId, {
    accountId: accId,
    packageId: 'store_monthly',
    planType: 'business',
    status: 'active',
    paymentConfirmed: true,
    activatedBy: 'test',
    paidAt: new Date().toISOString(),
    periodStart: new Date().toISOString(),
    periodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
    accountType: 'store',
    pkgName: 'باقة شهرية',
  });

  const port = 4300 + Math.floor(Math.random() * 80);
  const envPath = path.join(BACKEND, '.env');
  let envOriginal = null;
  if (fs.existsSync(envPath)) {
    envOriginal = fs.readFileSync(envPath, 'utf8');
    // Force child PORT (dotenv override:true would otherwise pin 3000)
    let next = envOriginal.replace(/^PORT=.*$/m, 'PORT=' + port);
    if (!/^PORT=/m.test(next)) next += '\nPORT=' + port + '\n';
    fs.writeFileSync(envPath, next);
  }

  const env = Object.assign({}, process.env, {
    PORT: String(port),
    HOST: '127.0.0.1',
    NODE_ENV: 'test',
    OTP_DEV_HINT: 'true',
  });
  delete env.TELEGRAM_BOT_TOKEN;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: BACKEND,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });

  const BASE = 'http://127.0.0.1:' + port;
  const api = async (method, p, body, headers) => {
    const r = await fetch(BASE + p, {
      method,
      headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const json = await r.json().catch(() => null);
    return { status: r.status, json };
  };

  try {
    let up = false;
    for (let i = 0; i < 90; i++) {
      try {
        if ((await fetch(BASE + '/api/otp/config')).ok) { up = true; break; }
      } catch (e) { /* */ }
      await new Promise((s) => setTimeout(s, 300));
    }
    ok('server boots', up, logs.slice(-600));
    if (!up) return;

    console.log('\n— public contact scrub —');
    const pub = await api('GET', '/api/accounts/public/' + accId);
    const a = pub.json && pub.json.account;
    ok('public 200', pub.status === 200 && !!a);
    ok('contactsLocked', a && a.contactsLocked === true);
    ok('phone null', a && a.phone == null);
    ok('tagline redacted (no raw digits)', a && !String(a.tagline || '').includes(phone), a && a.tagline);
    ok('address redacted (no raw digits)', a && !String(a.address || '').includes(phone), a && a.address);
    ok('facebook wa.me → null', a && a.facebook == null, a && a.facebook);
    ok('desc still scrubbed', a && !String(a.desc || '').includes(phone), a && a.desc);

    console.log('\n— profile save validation —');
    const accessToken = crypto.randomBytes(24).toString('hex');
    const row = await repos.accounts.getById(accId);
    row.accessToken = accessToken;
    row.accessTokenExpiresAt = new Date(Date.now() + 864e5).toISOString();
    await repos.accounts.upsert(row);

    const badTag = await api('PATCH', '/api/accounts/mine/' + accId, {
      tagline: 'اتصل ' + phone,
    }, { 'x-account-token': accessToken });
    ok('tagline with phone → 422', badTag.status === 422 && badTag.json && badTag.json.error === 'contact_in_text_forbidden', badTag);

    const badFb = await api('PATCH', '/api/accounts/mine/' + accId, {
      facebook: 'https://wa.me/222' + phone,
    }, { 'x-account-token': accessToken });
    ok('wa.me facebook → 400', badFb.status === 400 && badFb.json && badFb.json.error === 'invalid_facebook_url', badFb);

    const goodFb = await api('PATCH', '/api/accounts/mine/' + accId, {
      facebook: 'https://www.facebook.com/rizq.store',
      tagline: 'متجر موثوق',
      address: 'عرفات',
    }, { 'x-account-token': accessToken });
    ok('facebook.com accepted', goodFb.status === 200, { status: goodFb.status, err: goodFb.json && goodFb.json.error });
    const pub2 = await api('GET', '/api/accounts/public/' + accId);
    const fbOut = pub2.json && pub2.json.account && pub2.json.account.facebook;
    ok('public facebook is facebook.com URL', typeof fbOut === 'string' && /facebook\.com/i.test(fbOut), fbOut);

    console.log('\n— catalog oversize → 413 —');
    const big = jpegDataUriOfSize(2 * 1024 * 1024);
    const overPost = await api('POST', '/api/catalog', {
      accountId: accId,
      kind: 'product',
      name: 'منتج كبير',
      price: '100',
      images: [big],
    }, { 'x-account-token': accessToken });
    ok('POST catalog 2MB → 413 image_too_large', overPost.status === 413 && overPost.json && overPost.json.error === 'image_too_large', overPost);

    const png1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const created = await api('POST', '/api/catalog', {
      accountId: accId,
      kind: 'product',
      name: 'منتج عادي',
      price: '50',
      images: [png1x1],
    }, { 'x-account-token': accessToken });
    ok('small catalog create ok', created.status === 200 && created.json && created.json.item, created.status);
    const itemId = created.json && created.json.item && created.json.item.id;
    if (itemId) {
      const overPatch = await api('PATCH', '/api/catalog/' + itemId, {
        images: [big],
      }, { 'x-account-token': accessToken });
      ok('PATCH catalog 2MB → 413', overPatch.status === 413 && overPatch.json && overPatch.json.error === 'image_too_large', overPatch);
    }
  } finally {
    try { child.kill('SIGTERM'); } catch (e) { /* */ }
    if (envOriginal != null) {
      try { fs.writeFileSync(envPath, envOriginal); } catch (e) { /* */ }
    }
  }

  console.log('\ncontact-scrub: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
