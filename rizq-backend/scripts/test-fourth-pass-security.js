/**
 * اختبارات الجولة الرابعة — ثغرات حرجة/عالية
 * node scripts/test-fourth-pass-security.js
 */
'use strict';

const crypto = require('crypto');
const platformStore = require('../db/platformStore');
const Buyer = require('../models/buyer');
const { scorePackageRequest, shouldAutoApprove, TIER } = require('../services/provisionalTier');
const { canPromoteAdminChat, buildAlertChatCandidates, isAuthorizedChat } = require('../services/telegramAdmin');
const { saveTenderDocument, saveInvestmentDocument } = require('../services/tenderDocument');
const adminTeam = require('../services/adminTeam');

const PORT = Number(process.env.PORT || 3000);
const BASE = 'http://127.0.0.1:' + PORT;
const results = [];

function ok(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

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
  console.log('\n=== Fourth-pass security ===\n');

  // 1. Client riskLevel must not yield green auto-approve without vision
  const spoof = scorePackageRequest(
    { receiptImage: 'data:image/png;base64,xxx', riskLevel: 'clear', flags: [] },
    { plausibilityLevel: 'unreviewed', notes: ['offline'] }
  );
  ok('spoofed clear riskLevel → not green', spoof.provisionalTier !== TIER.GREEN,
    'tier=' + spoof.provisionalTier);
  ok('unreviewed never auto-approves', !shouldAutoApprove(spoof.provisionalTier));

  const noAi = scorePackageRequest(
    { receiptImage: 'x', riskLevel: 'clear' },
    null
  );
  ok('null aiResult ignores client riskLevel', noAi.provisionalTier !== TIER.GREEN,
    'tier=' + noAi.provisionalTier);

  // 2. Telegram: random chats not authorized
  const prevAllow = process.env.TELEGRAM_ALLOW_AUTO_ADMIN;
  const prevAdmin = process.env.TELEGRAM_ADMIN_CHAT_ID;
  process.env.TELEGRAM_ALLOW_AUTO_ADMIN = '0';
  process.env.TELEGRAM_ADMIN_CHAT_ID = '999001';
  ok('canPromote random chat → false', canPromoteAdminChat('123456789') === false);
  ok('canPromote configured chat → true', canPromoteAdminChat('999001') === true);
  const cands = buildAlertChatCandidates();
  ok('alert candidates exclude arbitrary seen ids', !cands.includes('111222333'));
  ok('isAuthorizedChat random → false', isAuthorizedChat('111222333') === false);
  if (prevAllow === undefined) delete process.env.TELEGRAM_ALLOW_AUTO_ADMIN;
  else process.env.TELEGRAM_ALLOW_AUTO_ADMIN = prevAllow;
  if (prevAdmin === undefined) delete process.env.TELEGRAM_ADMIN_CHAT_ID;
  else process.env.TELEGRAM_ADMIN_CHAT_ID = prevAdmin;

  // 3. Buyer phone collision takeover
  const victimPhone = '44' + String(Date.now()).slice(-6);
  const victimEmail = 'victim_' + Date.now() + '@rizq.test';
  const attackerEmail = 'attacker_' + Date.now() + '@rizq.test';
  let victimTok = null;
  try {
    const v = Buyer.registerOrLogin({
      name: 'Victim User',
      phone: victimPhone,
      email: victimEmail,
      whatsapp: '+222' + victimPhone,
    });
    victimTok = v.token;
    let blocked = false;
    try {
      Buyer.registerOrLogin({
        name: 'Attacker User',
        phone: victimPhone,
        email: attackerEmail,
        whatsapp: '+222' + victimPhone,
      });
    } catch (e) {
      blocked = e.code === 'PHONE_IN_USE' || e.status === 409;
    }
    ok('buyer phone collision blocked', blocked);
    const still = Buyer.findByEmail(victimEmail);
    ok('victim email unchanged', still && still.email === victimEmail);
    ok('victim token unchanged', still && still.token === victimTok);
  } catch (e) {
    ok('buyer phone collision blocked', false, e.message);
  }

  // 4. Catalog status ACL + GET leak
  const catId = 'acc_fp_cat_' + Date.now();
  const catTok = crypto.randomBytes(20).toString('hex');
  const repos = require('../db/repos');
  platformStore.upsertAccount({
    id: catId, type: 'store', name: 'FP Cat', status: 'approved',
    accessToken: catTok, phone: '44119988',
  });
  repos.setPackage(catId, {
    accountId: catId,
    accountType: 'store',
    status: 'active',
    paymentConfirmed: true,
    activatedBy: 'admin',
    periodStart: new Date().toISOString(),
    periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    pkgName: 'monthly',
    packageId: 'store-month',
    accessToken: catTok,
  });
  let seededCat = null;
  try {
    const created = await req('POST', '/api/catalog', {
      accountId: catId, kind: 'product', name: 'Secret pending item', price: '100',
    }, { 'x-account-token': catTok });
    seededCat = created.body && created.body.item;
    ok('catalog create pending_review', seededCat && seededCat.status === 'pending_review',
      created.status + ' ' + JSON.stringify(created.body && created.body.error));

    if (seededCat) {
      const pubGet = await req('GET', '/api/catalog/' + seededCat.id);
      ok('GET pending catalog as public → 404', pubGet.status === 404);

      const ownerPatch = await req('PATCH', '/api/catalog/' + seededCat.id, {
        status: 'active',
      }, { 'x-account-token': catTok });
      const stillPending = ownerPatch.body && ownerPatch.body.item && ownerPatch.body.item.status;
      ok('owner cannot self-activate catalog', stillPending !== 'active',
        'status=' + stillPending);
    } else {
      ok('GET pending catalog as public → 404', false, 'no item');
      ok('owner cannot self-activate catalog', false, 'no item');
    }
  } finally {
    try { repos.packages.remove(catId); } catch (e) { /* */ }
    try { platformStore.deleteAccount(catId); } catch (e) { /* */ }
  }

  // 5. seller_trust_score ignored
  const adAcc = 'acc_fp_ad_' + Date.now();
  const adTok = crypto.randomBytes(20).toString('hex');
  platformStore.upsertAccount({
    id: adAcc, type: 'store', name: 'FP Ad', status: 'approved',
    accessToken: adTok, phone: '44223344',
  });
  repos.setPackage(adAcc, {
    accountId: adAcc,
    accountType: 'store',
    status: 'active',
    paymentConfirmed: true,
    activatedBy: 'admin',
    periodStart: new Date().toISOString(),
    periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    pkgName: 'monthly',
    packageId: 'store-month',
    accessToken: adTok,
  });
  try {
    const ad = await req('POST', '/api/ads', {
      accountId: adAcc,
      title: 'Trust score probe',
      category: 'electronics',
      seller_trust_score: 99,
      images: [],
    }, { 'x-account-token': adTok });
    const score = ad.body && ad.body.ad && ad.body.ad.seller_trust_score;
    ok('seller_trust_score forced server-side', score === 60,
      'score=' + score + ' status=' + ad.status + ' err=' + (ad.body && ad.body.error));
  } finally {
    try { repos.packages.remove(adAcc); } catch (e) { /* */ }
    try { platformStore.deleteAccount(adAcc); } catch (e) { /* */ }
  }

  // 6. Guest thread requires token
  const sellerId = 'acc_fp_msg_' + Date.now();
  const sellerTok = crypto.randomBytes(20).toString('hex');
  platformStore.upsertAccount({
    id: sellerId, type: 'store', name: 'FP Msg', status: 'approved',
    accessToken: sellerTok, phone: '44334455',
  });
  try {
    const sent = await req('POST', '/api/messages', {
      sellerAccountId: sellerId,
      buyerPhone: '66778899',
      buyerName: 'Guest',
      body: 'hello secret',
    });
    const tk = sent.body && sent.body.threadKey;
    const gTok = sent.body && sent.body.guestThreadToken;
    ok('guest message issues thread token', !!(tk && gTok));

    const leak = await req('GET', '/api/messages/thread/' + encodeURIComponent(tk)
      + '?buyerPhone=66778899', null, { 'x-guest-phone': '66778899' });
    ok('guest thread phone-only → 401', leak.status === 401);

    const okRead = await req('GET', '/api/messages/thread/' + encodeURIComponent(tk)
      + '?buyerPhone=66778899&guestThreadToken=' + encodeURIComponent(gTok),
      null, { 'x-guest-phone': '66778899', 'x-guest-thread-token': gTok });
    ok('guest thread with token → 200', okRead.status === 200
      && okRead.body && Array.isArray(okRead.body.messages));
  } finally {
    try { platformStore.deleteAccount(sellerId); } catch (e) { /* */ }
  }

  // 7. Anonymous review blocked; seller cannot delete
  const revTarget = 'acc_fp_rev_' + Date.now();
  const revTok = crypto.randomBytes(20).toString('hex');
  platformStore.upsertAccount({
    id: revTarget, type: 'store', name: 'FP Rev', status: 'approved',
    accessToken: revTok, phone: '44556677',
  });
  const reviewer = 'acc_fp_revr_' + Date.now();
  const reviewerTok = crypto.randomBytes(20).toString('hex');
  platformStore.upsertAccount({
    id: reviewer, type: 'individual', name: 'Reviewer', status: 'approved',
    accessToken: reviewerTok, phone: '44667788',
  });
  try {
    const anon = await req('POST', '/api/reviews', {
      targetId: revTarget, rating: 5, reviewerName: 'Fake',
    });
    ok('anonymous review → 401', anon.status === 401);

    const posted = await req('POST', '/api/reviews', {
      targetId: revTarget, rating: 2, reviewerAccountId: reviewer, comment: 'meh',
    }, { 'x-account-token': reviewerTok });
    ok('authenticated review → 200', posted.status === 200 && posted.body && posted.body.review);
    const rid = posted.body && posted.body.review && posted.body.review.id;

    const wipe = await req('DELETE', '/api/reviews/' + revTarget + '/' + rid,
      null, { 'x-account-token': revTok });
    ok('seller cannot wipe review → 401', wipe.status === 401);
  } finally {
    try { platformStore.deleteAccount(revTarget); } catch (e) { /* */ }
    try { platformStore.deleteAccount(reviewer); } catch (e) { /* */ }
  }

  // 8. PDF path IDOR
  let pdfBlocked = false;
  try {
    await saveTenderDocument('T-OWN', '/uploads/tenders/T-OTHER/document.pdf');
  } catch (e) {
    pdfBlocked = e.code === 'document_path_forbidden' || /forbidden/.test(String(e.message));
  }
  ok('tender PDF foreign path blocked', pdfBlocked);

  let invBlocked = false;
  try {
    await saveInvestmentDocument('I-OWN', '/uploads/investments/I-OTHER/document.pdf');
  } catch (e) {
    invBlocked = e.code === 'document_path_forbidden' || /forbidden/.test(String(e.message));
  }
  ok('investment PDF foreign path blocked', invBlocked);

  // 9. team.manage cannot grant Super
  let grantBlocked = false;
  try {
    await adminTeam.createMember({
      user: 'fp_mod_' + Date.now(),
      name: 'FP Mod',
      pass: 'password123',
      permissions: ['*'],
    }, 'actor', ['team.manage']);
  } catch (e) {
    grantBlocked = e.code === 'cannot_grant_super';
  }
  ok('team.manage cannot grant Super', grantBlocked);

  // 10. Agent toggle phone mismatch
  const togAcc = 'acc_fp_tog_' + Date.now();
  const togTok = crypto.randomBytes(20).toString('hex');
  platformStore.upsertAccount({
    id: togAcc, type: 'store', name: 'FP Tog', status: 'approved',
    accessToken: togTok, phone: '', // empty phone — previously allowed IDOR
  });
  try {
    const tog = await req('POST', '/api/agent/toggle', {
      accountId: togAcc,
      subscriberPhone: '99887766',
      active: true,
    }, { 'x-account-token': togTok });
    ok('agent toggle empty-phone account → 403',
      tog.status === 403,
      'status=' + tog.status + ' code=' + (tog.body && tog.body.code));
  } finally {
    try { platformStore.deleteAccount(togAcc); } catch (e) { /* */ }
  }

  const failed = results.filter((r) => !r.pass);
  console.log('\nPassed:', results.length - failed.length, '/', results.length);
  if (failed.length) {
    failed.forEach((f) => console.log(' -', f.name, f.detail));
    process.exitCode = 1;
  } else {
    console.log('ALL FOURTH-PASS TESTS PASSED');
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
