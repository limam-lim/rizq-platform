#!/usr/bin/env node
/**
 * test-async-regressions.js — اختبارات انحدار لأخطاء async/await بعد هجرة Postgres.
 *
 * كل حالة هنا كانت معطوبة فعلاً (Promise بدل قيمة):
 *   - سعر الخادم في طلب الاشتراك (findCatalogPackage)        → كان يقع على سعر العميل
 *   - isDiamondActive لباقة ماسية مدفوعة                       → كان false دائماً
 *   - مفتاح إيقاف الوكيل (isActive)                            → كان يُتجاوز
 *   - كتابة التقييمات/الساعات/التمييز (replaceAll)            → كانت تمسح المجموعة كاملة
 *   - حظر الحصة عند بلوغ الحد                                 → snapshot كان Promise
 *   - تحقق OTP عبر /api/otp/verify                            → كان 400 دائماً
 *   - نشر مناقصة بلا باقة                                      → كان يمر (fail-open)
 *   - مرفقات المناقصة بلا صلاحية                               → كانت تُخدَم (fail-open)
 *   - تقييم بهوية مشترٍ مزيّفة                                 → كان يُقبل (تجاوز مصادقة)
 *   - قائمة الاستثمارات                                         → كانت {} فارغة
 *
 * يتطلب DB_DRIVER=postgres + DATABASE_URL لقاعدة اختبار (تُكتب فيها بيانات اختبار).
 * الاستخدام: npm run test:async-regressions
 */
'use strict';

const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const BACKEND = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); }
}
function notPromise(v) { return !(v && typeof v.then === 'function'); }

function request(port, method, urlPath, body, headers) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: '127.0.0.1', port, method, path: urlPath,
      headers: Object.assign({ 'content-type': 'application/json' }, data ? { 'content-length': Buffer.byteLength(data) } : {}, headers || {}),
    }, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(buf); } catch (e) { /* not json */ }
        resolve({ status: res.statusCode, json, text: buf });
      });
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, error: 'timeout (handler never responded)' }); });
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

async function unitTests() {
  console.log('\n— unit (in-process) —');
  const repos = require('../db/repos');
  const { findCatalogPackage, resolveDiamondTier, isDiamondPackageRef } = require('../services/catalogConfig');
  const { syncAccountPackage, isDiamondActive, isPackageAccessActive } = require('../rizq_package_lifecycle_agent');
  const { setActive, isActive } = require('../services/agentStatus');

  // 1) catalog lookup returns a real package object with a server price
  const pkg = await findCatalogPackage('ind-monthly');
  ok('findCatalogPackage resolves to object (server price)', pkg && notPromise(pkg) && Number.isFinite(Number(pkg.price)), pkg);
  ok('resolveDiamondTier("diamond_pro") === "diamond_pro"', (await resolveDiamondTier('diamond_pro')) === 'diamond_pro');
  ok('isDiamondPackageRef returns boolean', typeof (await isDiamondPackageRef({ pkgName: 'باقة الماسية' })) === 'boolean');

  // 2) paid diamond package → isDiamondActive true; trial → false
  const paidId = 'ACC_ASYNC_DIAM_' + Date.now();
  await syncAccountPackage({
    accountId: paidId, accountName: 'Async Diamond', accountPhone: '22334455', accountEmail: 'diam@test.mr',
    accountType: 'store', pkgName: 'الماسية Pro للمحلات', packageId: 'st-diam-pro', price: 6000, days: 30,
    activatedBy: 'admin', paymentConfirmed: true,
  });
  const diam = await isDiamondActive(paidId);
  ok('isDiamondActive(paid diamond) === true', diam === true, diam);
  ok('isPackageAccessActive(paid diamond) === true', (await isPackageAccessActive(paidId)) === true);
  ok('isDiamondActive(unknown) === false', (await isDiamondActive('ACC_NOPE_' + Date.now())) === false);

  // 3) kill switch
  const phone = '4' + String(Date.now()).slice(-7);
  await setActive(phone, false);
  const act = await isActive(phone);
  ok('agent kill switch: isActive false after setActive(false)', act === false, act);
  await setActive(phone, true);
  ok('agent kill switch: isActive true after setActive(true)', (await isActive(phone)) === true);

  // 4) keyed collections: write must keep entries (was wiping the collection)
  const key1 = 'T_ASYNC_' + Date.now();
  await repos.reviews.replaceAll([{ id: key1, data: [{ id: 'r1', rating: 5 }] }, { id: key1 + '_b', data: [] }]);
  const map = await repos.reviews.asMap();
  ok('reviews replaceAll keeps entries', map[key1] && map[key1].length === 1 && (key1 + '_b') in map, Object.keys(map));

  // 5) quota blocks at its limit
  const quota = require('../../rizq_quota_guard_agent');
  const subId = 'Q_ASYNC_' + Date.now();
  const meta = { subscriberId: subId, accountId: subId, diamondTier: 'diamond_standard', channel: 'widget' };
  const snap0 = await quota.getSnapshot(subId, subId);
  ok('quota snapshot is an object (not Promise)', snap0 && notPromise(snap0) && typeof snap0.pct === 'number', snap0);
  const limit = (await quota.getQuotaConfig()).diamond_standard.messages;
  await quota.recordUsage(Object.assign({}, meta, { messages: limit }));
  const blocked = await quota.isQuotaBlocked(subId, subId, 'widget');
  ok('quota: isQuotaBlocked === true at limit', blocked === true, blocked);
  let threw = null;
  try { await quota.assertQuotaAvailable(meta); } catch (e) { threw = e; }
  ok('quota: assertQuotaAvailable throws at limit', !!threw && /quota/i.test(String(threw.code || threw.message)), threw && threw.code);

  // 6) widget tools: precedence bugs (await fn()[key])
  const { executeWidgetTool } = require('../services/widgetAgentTools');
  const rep = await executeWidgetTool('get_seller_reputation', { account_id: key1 });
  ok('widget reputation reads stored reviews', rep && rep.reviews && rep.reviews.count === 1, rep);

  return { paidId };
}

async function httpTests() {
  console.log('\n— HTTP (spawned server) —');
  const repos = require('../db/repos');
  const port = 3900 + Math.floor(Math.random() * 90);
  const now = Date.now();
  const acc = {
    id: 'ACC_ASYNC_HTTP_' + now, type: 'store', name: 'Async HTTP', email: 'asynchttp' + now + '@test.mr',
    phone: '33445566', status: 'approved', suspended: false,
    accessToken: 'tok_async_' + now, accessTokenExpiresAt: new Date(now + 86400000).toISOString(),
    createdAt: new Date(now).toISOString(),
  };
  await repos.accounts.upsert(acc);

  const env = Object.assign({}, process.env, { PORT: String(port), HOST: '127.0.0.1', OTP_DEV_HINT: 'true', NODE_ENV: 'test' });
  delete env.TWILIO_SID; delete env.EMAIL_USER; delete env.EMAIL_PASS; delete env.TELEGRAM_BOT_TOKEN;
  const child = spawn(process.execPath, ['server.js'], { cwd: BACKEND, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stdout.on('data', (d) => { logs += d; });
  child.stderr.on('data', (d) => { logs += d; });
  try {
    const up = await waitForServer(port, 45000);
    ok('server boots', up, logs.slice(-800));
    if (!up) return;

    // OTP send + verify (verify was always 400)
    const phone = '2' + String(now).slice(-7);
    const sent = await request(port, 'POST', '/api/otp/send', { phone });
    ok('otp send returns devHint (test mode)', sent.status === 200 && sent.json && sent.json.devHint, sent.json);
    if (sent.json && sent.json.devHint) {
      const bad = await request(port, 'POST', '/api/otp/verify', { phone, code: '000000' === sent.json.devHint ? '111111' : '000000' });
      ok('otp verify rejects wrong code', bad.status === 400);
      const good = await request(port, 'POST', '/api/otp/verify', { phone, code: sent.json.devHint });
      ok('otp verify accepts right code', good.status === 200 && good.json && good.json.ok === true, good.json);
    }

    // tender without package → 403 (was fail-open)
    const tender = await request(port, 'POST', '/api/tenders', {
      accountId: acc.id, title: 'مناقصة اختبار', desc: 'وصف', category: 'construction', city: 'نواكشوط',
      deadline: new Date(now + 7 * 86400000).toISOString(),
    }, { 'x-account-token': acc.accessToken });
    ok('POST /api/tenders without package → 403', tender.status === 403 && tender.json && tender.json.error === 'tender_package_required', tender);

    // tender document without access → not served
    const doc = await request(port, 'GET', '/api/tenders/TND_NOPE/document');
    ok('tender document without access is not served', doc.status === 404 || doc.status === 403, doc.status);

    // review with forged buyer credentials → rejected (was accepted)
    const forged = await request(port, 'POST', '/api/reviews', {
      targetId: acc.id, rating: 5, comment: 'forged',
    }, { 'x-buyer-id': 'BUYER_FAKE', 'x-buyer-token': 'forged-token' });
    ok('review with forged buyer token → 401', forged.status === 401, forged);

    // investments list is a real list (was {})
    const inv = await request(port, 'GET', '/api/investments');
    ok('GET /api/investments returns opportunities array', inv.status === 200 && inv.json && Array.isArray(inv.json.opportunities), inv.json);

    // sub-request is stored at the server catalog price, never the client's (was price_unset)
    const { findCatalogPackage } = require('../services/catalogConfig');
    const catalogPkg = await findCatalogPackage('ind-monthly');
    const sub = await request(port, 'POST', '/api/sub-requests', {
      accountId: acc.id, pkg: 'ind-monthly', category: 'individual', price: 1, account: acc.name,
    }, { 'x-account-token': acc.accessToken });
    ok('sub-request accepted for a catalog package', sub.status === 200 && sub.json && sub.json.ok === true, sub.json);
    const stored = sub.json && sub.json.id ? (await repos.subRequests.list()).find((r) => r.id === sub.json.id) : null;
    ok('sub-request stored at server price (client sent 1)', stored && catalogPkg && Number(stored.price) === Number(catalogPkg.price) && Number(stored.price) !== 1,
      stored && { stored: stored.price, catalog: catalogPkg && catalogPkg.price });

    // business hours save must not wipe other accounts' rows (writeAllHours precedence bug)
    const otherKey = 'ACC_OTHER_HOURS_' + now;
    await repos.businessHours.upsert(otherKey, { hours: { sat: '9-17' }, updatedAt: new Date().toISOString() });
    const saveH = await request(port, 'POST', '/api/business-hours', { accountId: acc.id, hours: { sat: '8-20' } }, { 'x-account-token': acc.accessToken });
    ok('POST /api/business-hours ok', saveH.status === 200 && saveH.json && saveH.json.ok === true, saveH);
    const mine = await request(port, 'GET', '/api/business-hours/' + acc.id);
    ok('own business hours persisted', mine.json && mine.json.hours && mine.json.hours.sat === '8-20', mine.json);
    const other = await request(port, 'GET', '/api/business-hours/' + otherKey);
    ok("other account's business hours NOT wiped", other.json && other.json.hours && other.json.hours.sat === '9-17', other.json);
  } finally {
    child.kill('SIGTERM');
    await new Promise((s) => setTimeout(s, 500));
    if (fail) console.log('\n--- server log tail ---\n' + logs.slice(-1500));
  }
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-async-regressions: requires DB_DRIVER=postgres and DATABASE_URL (test database)');
    process.exit(2);
  }
  try {
    await unitTests();
    await httpTests();
  } catch (e) {
    fail += 1;
    console.error('  ✗ unexpected error:', e && e.stack ? e.stack : e);
  }
  console.log(`\nasync regressions: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
