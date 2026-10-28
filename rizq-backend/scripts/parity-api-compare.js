#!/usr/bin/env node
'use strict';
/**
 * Fair API parity: OLD (SQLite) vs NEW (Postgres) with same fixture.
 * Ignores ids that are ephemeral and timestamp-like fields.
 */
const OLD = process.env.OLD_BASE || 'http://127.0.0.1:3001';
const NEW = process.env.NEW_BASE || 'http://127.0.0.1:3000';
const OUT = process.env.PARITY_OUT || '/opt/cursor/artifacts/api-parity-report.json';

const IGNORE_KEY_RE = /^(createdAt|updatedAt|approvedAt|expiresAt|expires_at|lastLoginAt|last_login_at|timestamp|ts|updated_at|created_at|accessToken|dashToken|token|sessionId|nonce|requestId|serverTime|now|generatedAt|refreshedAt|currenciesUpdatedAt)$/i;
const IGNORE_PATH_RE = /(At|Date|Time|Timestamp|updated_at|created_at|expires)$/i;

async function fetchJson(base, path) {
  const url = base + path;
  const t0 = Date.now();
  let status = 0;
  let body = null;
  let err = null;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    status = res.status;
    const text = await res.text();
    try { body = JSON.parse(text); } catch (e) { body = { _raw: text.slice(0, 500) }; }
  } catch (e) {
    err = String(e.message || e);
  }
  return { url, status, body, err, ms: Date.now() - t0 };
}

function sortKeysDeep(v) {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v && typeof v === 'object') {
    const out = {};
    Object.keys(v).sort().forEach((k) => { out[k] = sortKeysDeep(v[k]); });
    return out;
  }
  return v;
}

function stripIgnored(v, path) {
  if (Array.isArray(v)) {
    // Sort arrays of objects by id/title/name when present for stable compare
    const mapped = v.map((x, i) => stripIgnored(x, path + '[' + i + ']'));
    if (mapped.length && mapped.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
      return mapped.slice().sort((a, b) => {
        const ka = String(a.id || a.name || a.title || a.code || JSON.stringify(a));
        const kb = String(b.id || b.name || b.title || b.code || JSON.stringify(b));
        return ka.localeCompare(kb);
      });
    }
    return mapped;
  }
  if (v && typeof v === 'object') {
    const out = {};
    Object.keys(v).forEach((k) => {
      if (IGNORE_KEY_RE.test(k)) return;
      if (IGNORE_PATH_RE.test(k) && (typeof v[k] === 'string' || typeof v[k] === 'number')) return;
      // prices.updatedAt nested
      if (k === 'prices' && v[k] && typeof v[k] === 'object') {
        const p = Object.assign({}, v[k]);
        delete p.updatedAt;
        delete p.currenciesUpdatedAt;
        if (Array.isArray(p.currencies)) {
          p.currencies = p.currencies.map((c) => {
            if (!c || typeof c !== 'object') return c;
            const cc = Object.assign({}, c);
            delete cc.updatedAt;
            return cc;
          });
        }
        out[k] = stripIgnored(p, path + '.' + k);
        return;
      }
      out[k] = stripIgnored(v[k], path + '.' + k);
    });
    return out;
  }
  return v;
}

function diffValues(a, b, path, diffs, depth) {
  if (diffs.length > 200) return;
  if (a === b) return;
  if (typeof a !== typeof b) {
    diffs.push({ path, kind: 'type', old: typeof a, neu: typeof b, oldVal: a, newVal: b });
    return;
  }
  if (a == null || b == null || typeof a !== 'object') {
    diffs.push({ path, kind: 'value', old: a, neu: b });
    return;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    diffs.push({ path, kind: 'arrayness', old: Array.isArray(a), neu: Array.isArray(b) });
    return;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) {
      diffs.push({ path, kind: 'array_len', old: a.length, neu: b.length });
    }
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) diffValues(a[i], b[i], path + '[' + i + ']', diffs, depth + 1);
    return;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!(k in a)) diffs.push({ path: path + '.' + k, kind: 'missing_old', neu: b[k] });
    else if (!(k in b)) diffs.push({ path: path + '.' + k, kind: 'missing_new', old: a[k] });
    else diffValues(a[k], b[k], path + '.' + k, diffs, depth + 1);
  }
}

async function main() {
  // Discover ids from NEW (should match OLD after seed)
  const pubNew = await fetchJson(NEW, '/api/accounts/public');
  const adsNew = await fetchJson(NEW, '/api/ads?limit=5');
  const accountId = (((pubNew.body || {}).accounts) || [])[0] && pubNew.body.accounts[0].id;
  const adId = (((adsNew.body || {}).ads) || [])[0] && adsNew.body.ads[0].id;

  const routes = [
    '/health',
    '/api/site-config',
    '/api/ai/status',
    '/api/otp/config',
    '/api/merchant-activities',
    '/api/pay-methods',
    '/api/contact-gate/status',
    '/api/accounts/public',
    '/api/ads',
    '/api/ads?limit=20',
    '/api/ads?category=' + encodeURIComponent('إلكترونيات'),
    '/api/discovery/ending-soon',
    '/api/discovery/platform-stats',
    '/api/discovery/top-sellers',
    '/api/help-guide',
  ];
  if (accountId) {
    routes.push('/api/accounts/public/' + encodeURIComponent(accountId));
    routes.push('/api/entitlements/' + encodeURIComponent(accountId));
    routes.push('/api/business-hours/' + encodeURIComponent(accountId));
    routes.push('/api/video-ads/stats/' + encodeURIComponent(accountId));
    routes.push('/api/account/' + encodeURIComponent(accountId) + '/notifications');
    routes.push('/api/ads?accountId=' + encodeURIComponent(accountId));
  }
  if (adId) {
    routes.push('/api/ads/' + encodeURIComponent(adId));
    routes.push('/api/ads/batch?ids=' + encodeURIComponent(adId));
  }

  const results = [];
  for (const path of routes) {
    const [oldR, newR] = await Promise.all([fetchJson(OLD, path), fetchJson(NEW, path)]);
    const entry = {
      path,
      oldStatus: oldR.status,
      newStatus: newR.status,
      statusMatch: oldR.status === newR.status,
      diffs: [],
    };
    if (oldR.err || newR.err) {
      entry.fetchError = { old: oldR.err, neu: newR.err };
    } else {
      const a = sortKeysDeep(stripIgnored(oldR.body, ''));
      const b = sortKeysDeep(stripIgnored(newR.body, ''));
      const diffs = [];
      diffValues(a, b, '$', diffs, 0);
      entry.diffs = diffs.slice(0, 50);
      entry.diffCount = diffs.length;
      entry.match = entry.statusMatch && diffs.length === 0;
    }
    results.push(entry);
    const mark = entry.match ? 'OK' : 'DIFF';
    console.log(mark, path, 'status', oldR.status, '→', newR.status, 'diffs', entry.diffCount || 0);
  }

  const report = {
    old: OLD,
    neu: NEW,
    accountId,
    adId,
    total: results.length,
    matched: results.filter((r) => r.match).length,
    mismatched: results.filter((r) => !r.match),
    results,
  };
  require('fs').writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log('\nSUMMARY matched', report.matched, '/', report.total);
  console.log('Wrote', OUT);
  if (report.mismatched.length) process.exitCode = 2;
}

main().catch((e) => { console.error(e); process.exit(1); });
