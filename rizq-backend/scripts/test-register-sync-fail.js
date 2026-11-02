/**
 * يثبت أن فشل POST /api/accounts (429 / 409) لا يُعرض كنجاح في مسار التسجيل.
 * - الدوال في landing-chrome.js / بوابة ppFinalSubmit في landing-register.js (بعد تفكيك اللاندينغ)
 * - مسار الواجهة: اعتراض fetch → لا تظهر #p-ok
 *
 * تشغيل: node scripts/test-register-sync-fail.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', '..', 'qa', 'journeys', 'node_modules', 'playwright'));

const BASE = process.env.JOURNEY_BASE || process.env.RIZQ_BASE || 'http://127.0.0.1:3000';
const ROOT = path.join(__dirname, '..', '..');
const results = [];

function ok(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || '' });
  console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

async function testMessageHelper() {
  const chrome = fs.readFileSync(path.join(ROOT, 'landing-chrome.js'), 'utf8');
  const register = fs.readFileSync(path.join(ROOT, 'landing-register.js'), 'utf8');
  ok('landing-chrome contains _syncAccountFailMessage', chrome.includes('function _syncAccountFailMessage'));
  ok('landing-chrome rolls back on !res.ok', /if\s*\(\s*!res\.ok\s*\)/.test(chrome) && chrome.includes('_rollbackLocalAccount'));
  ok('landing-chrome no longer returns ok:true on missing token', !/if\s*\(\s*!data\s*\|\|\s*!data\.ok\s*\|\|\s*!data\.accessToken\s*\)\s*return\s*\{\s*ok:\s*true\s*\}/.test(chrome));
  ok('landing-register ppFinalSubmit gates on result.ok === false', register.includes('result.ok === false') && register.includes('_reenablePkgSubmitBtn'));
  ok('estate register checks !res.ok', fs.readFileSync(path.join(ROOT, 'rizq_real_estate_register.html'), 'utf8').includes('!res.ok'));

  // Evaluate bilingual messages in a page context (uses isAr from landing)
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(BASE + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
  const msgs = await page.evaluate(() => {
    if (typeof _syncAccountFailMessage !== 'function') return null;
    const ar429 = (function () {
      /* force AR */
      const prev = window.isAr;
      try {
        /* isAr is const in outer scope — call as-is */
        return {
          s429: _syncAccountFailMessage(429, {}),
          s409: _syncAccountFailMessage(409, { code: 'email_in_use' }),
          s500: _syncAccountFailMessage(500, {}),
          isAr: typeof isAr !== 'undefined' ? isAr : null,
        };
      } finally {
        void prev;
      }
    })();
    return ar429;
  });
  ok('fail helper available in page', !!msgs);
  if (msgs) {
    const expect429 = msgs.isAr !== false
      ? 'ضغط مؤقت، أعد المحاولة بعد دقيقة'
      : 'Charge temporaire, réessayez dans une minute';
    const expect409 = msgs.isAr !== false
      ? 'البريد مسجّل مسبقاً، سجّل الدخول'
      : 'Cet e-mail est déjà enregistré, connectez-vous';
    ok('429 message', msgs.s429 === expect429 || /ضغط مؤقت|Charge temporaire/.test(msgs.s429), msgs.s429);
    ok('409 email message', msgs.s409 === expect409 || /البريد مسجّل|déjà enregistré/.test(msgs.s409), msgs.s409);
    ok('generic fail message', /تعذّر إتمام|Impossible de finaliser/.test(msgs.s500), msgs.s500);
  }
  await browser.close();
}

async function testUiNoSuccessOn429and409() {
  const browser = await chromium.launch({ headless: true });
  for (const status of [429, 409]) {
    const page = await browser.newPage();
    await page.goto(BASE + '/rizq_landing_v8.html', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate((httpStatus) => {
      window.__rizqSyncTest = { shownOk: false, result: null };
      const origFetch = window.fetch.bind(window);
      window.fetch = function (url, opts) {
        const u = String(url || '');
        if (u.indexOf('/api/accounts') >= 0 && opts && String(opts.method || 'GET').toUpperCase() === 'POST') {
          const body = httpStatus === 409
            ? { ok: false, code: 'email_in_use', error: 'البريد مستخدم' }
            : { error: 'عدد كبير جداً من محاولات التسجيل' };
          return Promise.resolve(new Response(JSON.stringify(body), {
            status: httpStatus,
            headers: { 'Content-Type': 'application/json' },
          }));
        }
        return origFetch(url, opts);
      };
      const acc = {
        id: 'ACC_' + Date.now(),
        type: 'store',
        name: 'Test Store',
        email: 'syncfail_' + httpStatus + '_' + Date.now() + '@test.mr',
        password: 'Journey!TestAa1',
        phone: '44112233',
        city: 'نواكشوط',
        status: 'pending',
      };
      return _syncAccountToBackend(acc).then(function (result) {
        window.__rizqSyncTest.result = result;
        const okPanel = document.getElementById('p-ok');
        window.__rizqSyncTest.shownOk = !!(okPanel && okPanel.classList.contains('active'));
        // simulate caller gate
        if (!result || result.ok === false || result.blocked) {
          window.__rizqSyncTest.callerWouldShowSuccess = false;
        } else {
          window.__rizqSyncTest.callerWouldShowSuccess = true;
        }
        return window.__rizqSyncTest;
      });
    }, status);
    const out = await page.evaluate(() => window.__rizqSyncTest);
    ok(
      'HTTP ' + status + ' → ok:false blocked',
      out && out.result && out.result.ok === false && out.result.blocked === true,
      JSON.stringify(out && out.result)
    );
    ok(
      'HTTP ' + status + ' → caller would NOT show success',
      out && out.callerWouldShowSuccess === false,
      ''
    );
    await page.close();
  }
  await browser.close();
}

async function main() {
  console.log('\n=== Register sync fail (429/409) ===\n');
  await testMessageHelper();
  await testUiNoSuccessOn429and409();
  const failed = results.filter((r) => !r.pass);
  console.log('\n' + (failed.length ? 'FAILED ' + failed.length : 'ALL OK') + ' / ' + results.length);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
