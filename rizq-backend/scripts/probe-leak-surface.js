/**
 * مراجعة تسريب بديلة — تفحص نقاط عامة بحثاً عن أسرار / تعداد / حقول حساسة
 * node scripts/probe-leak-surface.js
 */
'use strict';

const BASE = process.env.RIZQ_BASE || 'http://127.0.0.1:3000';

async function get(path) {
  const r = await fetch(BASE + path);
  let body = null;
  try { body = await r.json(); } catch (e) { body = null; }
  return { status: r.status, headers: r.headers, body };
}

function walk(obj, path, hits) {
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach((k) => {
    const p = path ? path + '.' + k : k;
    const lk = k.toLowerCase();
    if (/(password|passhash|accesstoken|dashtoken|apikey|webhookurl|codehash|bottoken|secret)/i.test(k)) {
      hits.push({ path: p, valueType: typeof obj[k] });
    }
    if (obj[k] && typeof obj[k] === 'object') walk(obj[k], p, hits);
  });
}

async function main() {
  const results = [];
  function ok(name, pass, detail) {
    results.push({ name, pass, detail: detail || '' });
    console.log((pass ? 'OK  ' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
  }

  const health = await get('/health');
  ok('health', health.status === 200);

  const cfg = await get('/api/site-config');
  const cfgHits = [];
  walk(cfg.body, '', cfgHits);
  ok('site-config has no secret keys', cfgHits.length === 0, cfgHits.map((h) => h.path).join(',') || 'clean');

  const e1 = 'exists_probe_a_' + Date.now() + '@rizq.test';
  const e2 = 'exists_probe_b_' + Date.now() + '@rizq.test';
  const p1 = await get('/api/auth/preview?email=' + encodeURIComponent(e1));
  const p2 = await get('/api/auth/preview?email=' + encodeURIComponent(e2));
  ok('preview responses identical shape for any email',
    p1.status === 200 && p2.status === 200
    && JSON.stringify(p1.body) === JSON.stringify(p2.body),
    JSON.stringify(p1.body));

  const nni = await get('/api/accounts/nni-available?nni=1234567890');
  ok('nni-available format-only', nni.status === 200 && nni.body && nni.body.available === true);

  const pub = await get('/api/accounts/public');
  const pubHits = [];
  walk(pub.body, '', pubHits);
  ok('accounts/public no secret keys', pubHits.length === 0, pubHits.map((h) => h.path).join(',') || 'clean');
  const hasPaymentWhenLocked = Array.isArray(pub.body && pub.body.accounts)
    && pub.body.accounts.some((a) => a && a.contactsLocked && Array.isArray(a.paymentMethods) && a.paymentMethods.length);
  ok('public accounts hide paymentMethods when locked', !hasPaymentWhenLocked);

  const csp = health.headers.get('content-security-policy') || (await fetch(BASE + '/health')).headers.get('content-security-policy');
  ok('CSP present', !!csp);

  const failed = results.filter((r) => !r.pass);
  console.log('\nPassed:', results.length - failed.length, '/', results.length);
  if (failed.length) {
    failed.forEach((f) => console.log(' -', f.name, f.detail));
    process.exitCode = 1;
  } else {
    console.log('ALL LEAK PROBES PASSED');
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
