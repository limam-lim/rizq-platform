/**
 * B14 defaults + RECEIPT sha256 dedupe + B16 catalog cap & message leak guard.
 * تشغيل: node scripts/test-packages-b14-receipt-b16.js
 */
'use strict';

const path = require('path');
const fs = require('fs');
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (e) { /* optional */ }

const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

const BASE = 'http://127.0.0.1:' + (process.env.PORT || 3000);

async function req(method, urlPath, body, headers) {
  const r = await fetch(BASE + urlPath, {
    method,
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers || {}),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  return { status: r.status, body: j };
}

async function main() {
  console.log('\n=== B14 / RECEIPT / B16 ===\n');

  const {
    findCatalogPackage,
    getAllCatalogPackages,
    DEFAULT_STORE_PACKAGES,
  } = require('../services/catalogConfig');
  const all = await getAllCatalogPackages();
  ok('catalog has st-month default', all.some((p) => p.id === 'st-month' && Number(p.price) === 2000));
  ok('catalog has of-month default', all.some((p) => p.id === 'of-month' && Number(p.price) === 3500));
  ok('catalog has cp-month default', all.some((p) => p.id === 'cp-month' && Number(p.price) === 3500));
  ok('catalog has tnd-month default', all.some((p) => p.id === 'tnd-month' && Number(p.price) === 5000));
  ok('catalog has inv-year default', all.some((p) => p.id === 'inv-year' && Number(p.price) === 45000));
  ok('catalog has vid-basic default', all.some((p) => p.id === 'vid-basic' && Number(p.price) === 5000));
  const st = await findCatalogPackage('st-quart');
  ok('findCatalogPackage(st-quart) price 5500', st && Number(st.price) === 5500);
  ok('DEFAULT_STORE_PACKAGES exported', Array.isArray(DEFAULT_STORE_PACKAGES) && DEFAULT_STORE_PACKAGES.length >= 4);

  const { storeReceipt, findReceiptShaInRequests } = require('../services/receiptStorage');
  // PNG فريد لكل تشغيل (بايتات مختلفة → بصمة مختلفة عن اختبارات سابقة)
  const crypto = require('crypto');
  const uniqueTag = crypto.randomBytes(16);
  // minimal valid PNG IHDR + unique tEXt chunk via raw buffer then data-url
  const basePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const uniquePngBuf = Buffer.concat([basePng, uniqueTag]);
  // sniffMime needs real PNG magic — append tag AFTER valid PNG so magic still matches
  const tinyPng = 'data:image/png;base64,' + uniquePngBuf.toString('base64');
  const a = storeReceipt(tinyPng, { accountId: 'ACC_r1', requestId: 'sub_a' });
  ok('storeReceipt returns sha256', a.ok && typeof a.sha256 === 'string' && a.sha256.length === 64);
  const b = storeReceipt(tinyPng, { accountId: 'ACC_r2', requestId: 'sub_b' });
  ok('same bytes → same sha256', a.sha256 === b.sha256);
  const prior = findReceiptShaInRequests([
    { id: 'sub_old', receiptSha256: a.sha256 },
  ], b.sha256);
  ok('findReceiptShaInRequests hits prior', !!(prior && prior.id === 'sub_old'));
  try {
    const absA = require('../services/receiptStorage').resolveReceiptAbsolute(a.relativePath);
    const absB = require('../services/receiptStorage').resolveReceiptAbsolute(b.relativePath);
    if (absA) fs.unlinkSync(absA);
    if (absB) fs.unlinkSync(absB);
  } catch (eCl) { /* */ }

  // HTTP: duplicate receipt on live server
  const now = Date.now();
  const id1 = 'ACC_RCP_' + now;
  const email1 = 'rcp1_' + now + '@test.mr';
  const reg1 = await req('POST', '/api/accounts', {
    id: id1, type: 'store', name: 'Rcp1', email: email1, password: 'Pkg!RcpAa11',
    phone: '44110011', phoneIntl: '+22244110011', city: 'نواكشوط',
    nni: String(3400000000 + Math.floor(Math.random() * 89999999)),
    activityId: 'st_grocery', activity: 'بقالة',
  });
  ok('register account for receipt test', reg1.status === 200 && reg1.body && reg1.body.ok, 's=' + reg1.status);
  // approve via repo
  const repos = require('../db/repos');
  const acc = await repos.accounts.getById((reg1.body && reg1.body.id) || id1);
  if (acc) {
    acc.status = 'approved';
    acc.suspended = false;
    await repos.accounts.upsert(acc);
  }
  const tok = reg1.body && reg1.body.accessToken;
  const sub1 = await req('POST', '/api/sub-requests', {
    accountId: (reg1.body && reg1.body.id) || id1,
    account: 'Rcp1',
    pkg: 'st-month',
    category: 'package',
    receiptImage: tinyPng,
  }, { 'x-account-token': tok });
  ok('first receipt sub-request accepted', sub1.status === 200 && sub1.body && sub1.body.ok, 's=' + sub1.status + ' e=' + (sub1.body && sub1.body.error));

  const id2 = 'ACC_RCP2_' + now;
  const reg2 = await req('POST', '/api/accounts', {
    id: id2, type: 'store', name: 'Rcp2', email: 'rcp2_' + now + '@test.mr', password: 'Pkg!RcpAa22',
    phone: '44110022', phoneIntl: '+22244110022', city: 'نواكشوط',
    nni: String(3400000000 + Math.floor(Math.random() * 89999999)),
    activityId: 'st_grocery', activity: 'بقالة',
  });
  const acc2 = await repos.accounts.getById((reg2.body && reg2.body.id) || id2);
  if (acc2) { acc2.status = 'approved'; acc2.suspended = false; await repos.accounts.upsert(acc2); }
  const tok2 = reg2.body && reg2.body.accessToken;
  const sub2 = await req('POST', '/api/sub-requests', {
    accountId: (reg2.body && reg2.body.id) || id2,
    account: 'Rcp2',
    pkg: 'st-month',
    category: 'package',
    receiptImage: tinyPng,
  }, { 'x-account-token': tok2 });
  ok('duplicate receipt → 409 receipt_already_used',
    sub2.status === 409 && sub2.body && sub2.body.error === 'receipt_already_used',
    's=' + sub2.status + ' e=' + (sub2.body && sub2.body.error));

  // B16 contact leak on merchant reply — unit via guard path presence + live if possible
  const msgSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'messages.js'), 'utf8');
  ok('messages/reply uses contactLeakGuard', msgSrc.includes('scanContactLeak') && msgSrc.includes('contact_in_text_forbidden'));
  const catSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'catalog.js'), 'utf8');
  ok('catalog public applies free-tier cap', catSrc.includes('applyPublicCatalogCaps') && catSrc.includes('freeTierPublicCatalogCap'));

  const failed = results.filter((r) => !r.pass);
  console.log('\n' + (failed.length ? 'FAILED ' + failed.length : 'ALL OK') + ' / ' + results.length);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
