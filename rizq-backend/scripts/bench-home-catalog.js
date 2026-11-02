#!/usr/bin/env node
/**
 * معيار GET /api/catalog/home — قبل (readCatalog كامل) وبعد (SQL JOIN).
 * يزرع ~5000 منتجاً على rizq_test ثم يقيس الزمن.
 */
'use strict';

const { performance } = require('perf_hooks');

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('bench-home-catalog: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }
  delete process.env.WHATSAPP_TOKEN;
  delete process.env.EMAIL_USER;
  delete process.env.TWILIO_SID;

  const platformStore = require('../db/platformStore');
  const { buildHomeCatalog, clearHomeCatalogCache } = require('../services/homeCatalog');
  const sql = require('../db/sql');

  const N = 5000;
  const accountId = 'acc_bench_home_' + Date.now();
  const itemIds = [];

  console.log('— seed', N, 'products on', accountId, '—');
  await platformStore.upsertAccount({
    id: accountId,
    name: 'Bench Fashion Store',
    type: 'store',
    status: 'approved',
    suspended: 0,
    activityId: 'st_clothing',
    activity: 'أزياء وملابس',
    city: 'نواكشوط',
  });

  const now = Date.now();
  for (let i = 0; i < N; i++) {
    const id = 'cat_bench_' + now + '_' + i;
    itemIds.push(id);
    await platformStore.upsertCatalogItem({
      id,
      accountId,
      kind: 'product',
      status: 'active',
      name: 'منتج معياري ' + i,
      category: 'أزياء',
      categoryId: 'fashion',
      price: 1000 + (i % 500),
      createdAt: new Date(now - i * 1000).toISOString(),
    });
    if ((i + 1) % 1000 === 0) console.log('  seeded', i + 1);
  }

  async function applyPublicCatalogCaps(list) { return list; }
  async function resolveContactGate() { return { contactsUnlocked: false, contactsLocked: true }; }
  async function isDiamondActive() { return false; }

  const depsJoin = {
    queryHomeCatalogJoin: platformStore.queryHomeCatalogJoin,
    applyPublicCatalogCaps,
    resolveContactGate,
    isDiamondActive,
  };
  const depsLegacy = {
    readCatalog: platformStore.readCatalog,
    queryPublicAccounts: platformStore.queryPublicAccounts,
    applyPublicCatalogCaps,
    resolveContactGate,
    isDiamondActive,
  };

  async function timeOnce(deps) {
    clearHomeCatalogCache();
    const t0 = performance.now();
    const r = await buildHomeCatalog({ section: 'styles', limit: 12 }, deps);
    const ms = performance.now() - t0;
    return { ms, n: (r && r.items && r.items.length) || 0, cached: !!(r && r.cached) };
  }

  async function runSeries(label, deps, rounds) {
    const samples = [];
    for (let i = 0; i < rounds; i++) {
      const r = await timeOnce(deps);
      samples.push(r.ms);
      console.log('  ', label, 'round', i + 1, Math.round(r.ms) + 'ms', 'items=' + r.n);
    }
    return { label, samples, avg: avg(samples), min: Math.min(...samples), max: Math.max(...samples) };
  }

  try {
    console.log('\n— BEFORE (legacy readCatalog + accounts) —');
    const before = await runSeries('legacy', depsLegacy, 3);
    console.log('\n— AFTER (SQL JOIN) —');
    const after = await runSeries('join', depsJoin, 3);

    const report = {
      ok: true,
      products: N,
      before: { avgMs: Number(before.avg.toFixed(1)), minMs: Number(before.min.toFixed(1)), maxMs: Number(before.max.toFixed(1)), samples: before.samples.map((x) => Number(x.toFixed(1))) },
      after: { avgMs: Number(after.avg.toFixed(1)), minMs: Number(after.min.toFixed(1)), maxMs: Number(after.max.toFixed(1)), samples: after.samples.map((x) => Number(x.toFixed(1))) },
      speedup: before.avg > 0 ? Number((before.avg / after.avg).toFixed(2)) : null,
      at: new Date().toISOString(),
    };
    console.log('\n' + JSON.stringify(report, null, 2));
    try {
      const fs = require('fs');
      fs.writeFileSync('/opt/cursor/artifacts/bench-home-catalog.json', JSON.stringify(report, null, 2));
    } catch (eW) { /* */ }
  } finally {
    console.log('\n— cleanup —');
    for (const id of itemIds) {
      try { await platformStore.deleteCatalogItem(id); } catch (e) { /* */ }
    }
    try { await platformStore.deleteAccount(accountId); } catch (e2) { /* */ }
    try {
      await sql.query("DELETE FROM catalog_items WHERE id LIKE 'cat_bench_%'");
      await sql.query("DELETE FROM accounts WHERE id LIKE 'acc_bench_home_%'");
    } catch (e3) { /* */ }
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
