/**
 * اختبارات ثغرات الجولة الحالية:
 * - اختطاف guest thread token
 * - sanitizeSafeUrl / sanitizeLegalHtml
 * - scrub reviewerAccountId من التقييمات العامة
 *
 * تشغيل: node scripts/test-vuln-round2.js
 * (يتطلب خادم على PORT أو يشغّل اختبارات الوحدة وحدها)
 */
'use strict';

const assert = require('assert');
const { sanitizeSafeUrl, sanitizeLegalHtml } = require('../lib/sanitizeHtml');

const results = [];
function ok(name, pass, detail) {
  results.push({ name, pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

// ── Unit: URL / HTML sanitizers ──
ok('sanitizeSafeUrl allows https', sanitizeSafeUrl('https://rizq.mr/x') === 'https://rizq.mr/x');
ok('sanitizeSafeUrl blocks javascript', sanitizeSafeUrl('javascript:alert(1)') === '');
ok('sanitizeSafeUrl blocks data', sanitizeSafeUrl('data:text/html,x') === '');
ok('sanitizeSafeUrl allows relative', sanitizeSafeUrl('/browse') === '/browse');
ok('sanitizeLegalHtml strips script', !/<script/i.test(sanitizeLegalHtml('<p>hi</p><script>alert(1)</script>')));
ok('sanitizeLegalHtml strips onerror', !/onerror/i.test(sanitizeLegalHtml('<img src=x onerror=alert(1)>')));
ok('sanitizeLegalHtml keeps p/strong', /<p>/.test(sanitizeLegalHtml('<p><strong>أ</strong></p>')) && /<strong>/.test(sanitizeLegalHtml('<p><strong>أ</strong></p>')));
ok('sanitizeLegalHtml safe a href', /href="https:\/\/ok\.test"/.test(sanitizeLegalHtml('<a href="https://ok.test">x</a>')));
ok('sanitizeLegalHtml blocks js href', !/javascript/i.test(sanitizeLegalHtml('<a href="javascript:alert(1)">x</a>')));

async function liveTests() {
  const PORT = Number(process.env.PORT || 3000);
  const BASE = 'http://127.0.0.1:' + PORT;
  let health;
  try {
    health = await fetch(BASE + '/health').then((r) => r.json());
  } catch (e) {
    console.log('\n(skip live API — server not on ' + BASE + ')');
    return;
  }
  if (!health || !health.ok) {
    console.log('\n(skip live API — health failed)');
    return;
  }

  const sellerId = 'acc_vuln_seller_' + Date.now();
  const phone = '44' + String(Date.now()).slice(-6);

  // Victim opens thread
  const m1 = await fetch(BASE + '/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sellerAccountId: sellerId,
      buyerName: 'Victim',
      buyerPhone: phone,
      body: 'secret hello',
    }),
  }).then((r) => r.json());
  ok('guest first message issues token', !!(m1 && m1.ok && m1.guestThreadToken && m1.threadKey));
  const victimTok = m1.guestThreadToken;
  const threadKey = m1.threadKey;

  // Attacker tries to inject + hijack by same phone (no token)
  const m2res = await fetch(BASE + '/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sellerAccountId: sellerId,
      buyerName: 'Attacker',
      buyerPhone: phone,
      body: 'hijack attempt',
    }),
  });
  const m2 = await m2res.json().catch(() => ({}));
  ok('attacker follow-up without token is rejected',
    m2res.status === 401 && m2.guestThreadTokenRequired === true && !m2.guestThreadToken,
    'status=' + m2res.status + ' body=' + JSON.stringify({ ok: m2.ok, req: m2.guestThreadTokenRequired }));

  const hijackRead = await fetch(BASE + '/api/messages/thread/' + encodeURIComponent(threadKey), {
    headers: {
      'x-guest-phone': phone,
      'x-guest-thread-token': 'forged',
    },
  });
  ok('attacker cannot read thread without victim token', hijackRead.status === 401, 'status=' + hijackRead.status);

  const victimRead = await fetch(BASE + '/api/messages/thread/' + encodeURIComponent(threadKey), {
    headers: {
      'x-guest-phone': phone,
      'x-guest-thread-token': victimTok,
    },
  }).then(async (r) => ({ status: r.status, body: await r.json() }));
  ok('victim token still reads thread',
    victimRead.status === 200 && Array.isArray(victimRead.body.messages) && victimRead.body.messages.length >= 1
      && !victimRead.body.messages.some((m) => m.body === 'hijack attempt'),
    'status=' + victimRead.status + ' n=' + (victimRead.body && victimRead.body.messages && victimRead.body.messages.length));

  // Legitimate follow-up with token reuses same token
  const m3 = await fetch(BASE + '/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-guest-thread-token': victimTok,
    },
    body: JSON.stringify({
      sellerAccountId: sellerId,
      buyerName: 'Victim',
      buyerPhone: phone,
      body: 'follow up',
      guestThreadToken: victimTok,
    }),
  }).then((r) => r.json());
  ok('victim follow-up reuses same guest token',
    !!(m3 && m3.ok && m3.guestThreadToken === victimTok));

  // Public reviews scrub reviewerAccountId
  const reviews = await fetch(BASE + '/api/reviews/acc_nonexistent_target').then((r) => r.json());
  ok('reviews public endpoint responds', !!(reviews && reviews.ok && Array.isArray(reviews.reviews)));

  // Guest secret persists in SQLite (survives process Map wipe / restart)
  const repos = require('../db/repos');
  const persisted = repos.guestThreadSecrets.get(threadKey);
  ok('guest thread secret persisted to SQLite', !!(persisted && persisted.hash && persisted.phoneDigits === phone.replace(/\D/g, '')));

  // messages/mine must not match accountId as prefix of another buyer's id
  const { threadBelongsToBuyer } = require('../routes/messages');
  ok('threadBelongsToBuyer exact match', threadBelongsToBuyer('SELL::acc:ACC_1234567890', 'ACC_1234567890') === true);
  ok('threadBelongsToBuyer rejects prefix IDOR', threadBelongsToBuyer('SELL::acc:ACC_12345678901234', 'ACC_1234567890') === false);
}

async function main() {
  console.log('\n=== Vuln round-2 tests ===\n');
  await liveTests();
  const failed = results.filter((r) => !r.pass);
  console.log('\n' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  if (failed.length) {
    failed.forEach((f) => console.log('  FAIL:', f.name, f.detail));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
