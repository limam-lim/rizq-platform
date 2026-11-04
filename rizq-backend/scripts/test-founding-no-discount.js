#!/usr/bin/env node
/**
 * شريك مؤسس = شارة تكريم فقط — يدفع السعر الكامل للباقة (لا خصم تأسيس).
 * على rizq_test فقط.
 */
'use strict';

const fs = require('fs');
const path = require('path');

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.log('  ✗', name, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
}

(async () => {
  if (String(process.env.DB_DRIVER || '').toLowerCase() !== 'postgres' || !process.env.DATABASE_URL) {
    console.error('test-founding-no-discount: requires DB_DRIVER=postgres and DATABASE_URL');
    process.exit(2);
  }
  delete process.env.WHATSAPP_TOKEN;
  delete process.env.EMAIL_USER;
  delete process.env.TWILIO_SID;
  delete process.env.RIZQ_FOUNDING_DISCOUNT_PERCENT;

  const repos = require('../db/repos');
  const launchMode = require('../config/launchMode');
  const { findCatalogPackage } = require('../services/catalogConfig');
  const { spawnHttpTestServer } = require('./_spawnHttpTestServer');

  console.log('\n— static: no founding discount machinery —');
  ok('launchMode has no getFoundingDiscountPercent',
    typeof launchMode.getFoundingDiscountPercent !== 'function');
  const pub = await launchMode.publicLaunchConfig({});
  ok('publicLaunchConfig omits foundingDiscountPercent',
    !Object.prototype.hasOwnProperty.call(pub, 'foundingDiscountPercent'), pub);

  const root = path.join(__dirname, '../..');
  const subSrc = fs.readFileSync(path.join(root, 'rizq_subscription_engine.js'), 'utf8');
  ok('subscription_engine does not multiply by founding discount',
    !/foundingDiscountPercent/.test(subSrc)
    && !/100 - pct/.test(subSrc));
  const cfgSrc = fs.readFileSync(path.join(root, 'rizq_backend_config.js'), 'utf8');
  ok('backend_config defaults omit foundingDiscountPercent',
    !/foundingDiscountPercent/.test(cfgSrc));
  const envEx = fs.readFileSync(path.join(root, 'rizq-backend/.env.example'), 'utf8');
  ok('.env.example omits RIZQ_FOUNDING_DISCOUNT_PERCENT',
    !/RIZQ_FOUNDING_DISCOUNT_PERCENT/.test(envEx));
  const rootEnvEx = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  ok('root .env.example omits RIZQ_FOUNDING_DISCOUNT_PERCENT',
    !/RIZQ_FOUNDING_DISCOUNT_PERCENT/.test(rootEnvEx));

  const stamp = Date.now();
  const accountId = 'acc_founder_' + stamp;
  const token = 'tok_founder_' + stamp;
  /* حساب شريك مؤسس مع حقل خصم قديم متروك — يجب تجاهله */
  await repos.accounts.upsert({
    id: accountId,
    type: 'store',
    status: 'approved',
    suspended: false,
    name: 'محل شريك مؤسس',
    phone: '4' + String(stamp).slice(-7),
    email: 'founder_' + stamp + '@test.local',
    accessToken: token,
    accessTokenExpiresAt: new Date(stamp + 86400000).toISOString(),
    createdAt: new Date(stamp).toISOString(),
    foundingPartner: true,
    foundingDiscountPercent: 40,
  });

  const catalog = await findCatalogPackage({ id: 'st-month', pkgName: 'st-month', name: 'شهرية' });
  const fullPrice = catalog && Number(catalog.price);
  ok('st-month catalog price known', Number.isFinite(fullPrice) && fullPrice > 0, catalog);

  let httpServer = null;
  try {
    httpServer = await spawnHttpTestServer();
    ok('spawned HTTP test server', true, 'port=' + httpServer.port);
  } catch (eSpawn) {
    ok('spawned HTTP test server', false, String(eSpawn && eSpawn.message || eSpawn));
    console.log('\nFAILED ' + fail + ' / ' + (pass + fail));
    process.exit(1);
  }

  try {
    const r = await fetch(httpServer.base + '/api/sub-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-account-token': token },
      body: JSON.stringify({
        accountId,
        account: 'محل شريك مؤسس',
        pkg: 'st-month',
        packageId: 'st-month',
        category: 'package',
      }),
    });
    const body = await r.json().catch(() => null);
    ok('sub-request accepted', r.status === 200 && body && body.ok, { status: r.status, body });
    ok('founding partner pays full listPrice',
      body && Number(body.listPrice) === fullPrice, { listPrice: body && body.listPrice, fullPrice });
    ok('founding partner pays full price (no discount)',
      body && Number(body.price) === fullPrice, { price: body && body.price, fullPrice });
    ok('price equals listPrice (no founding cut)',
      body && Number(body.price) === Number(body.listPrice), body);

    const rec = body && body.id ? await repos.subRequests.get(body.id) : null;
    ok('stored request price is full catalog price',
      rec && Number(rec.price) === fullPrice && Number(rec.listPrice) === fullPrice, rec);

    /* شارة التكريم ما زالت تُحفظ على الحساب */
    const acc = await repos.accounts.getById(accountId);
    ok('foundingPartner badge retained on account', !!(acc && acc.foundingPartner), acc);
  } finally {
    if (httpServer && typeof httpServer.stop === 'function') {
      try { await httpServer.stop(); } catch (eClose) { /* */ }
    }
  }

  console.log(fail ? '\nFAILED ' + fail + ' / ' + (pass + fail) : '\nALL OK / ' + pass);
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
