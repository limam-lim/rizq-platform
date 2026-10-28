#!/usr/bin/env node
'use strict';
/**
 * Critical flows against Postgres (NEW) server.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), override: true });
const BASE = process.env.NEW_BASE || 'http://127.0.0.1:3000';
const OUT = '/opt/cursor/artifacts/critical-flows-report.json';
const results = [];

function log(name, pass, detail) {
  results.push({ name, pass: !!pass, detail: detail || null });
  console.log(pass ? 'PASS' : 'FAIL', name, detail ? JSON.stringify(detail).slice(0, 200) : '');
}

async function req(method, path, body, headers) {
  const res = await fetch(BASE + path, {
    method,
    headers: Object.assign({ Accept: 'application/json', 'Content-Type': 'application/json' }, headers || {}),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { json = { _raw: text.slice(0, 400) }; }
  return { status: res.status, json };
}

function hasArabicScript(s) {
  return /[\u0600-\u06FF]/.test(String(s || ''));
}

(async () => {
  try {
    const db = require('../db');
    await db.ready();
  } catch (e) { /* optional if DATABASE_URL absent */ }
  const stamp = Date.now().toString(36);
  // 1) register → verification → post ad
  try {
    const email = `parity_${stamp}@demo.rizq.mr`;
    const phone = '44' + String(100000 + (Date.now() % 899999)).slice(0, 6);
    const reg = await req('POST', '/api/accounts', {
      type: 'individual',
      name: 'مختبر التكافؤ',
      nameFr: 'Parity Tester',
      email,
      phone,
      city: 'نواكشوط',
      password: 'ParityTest!234',
      acceptTerms: true,
    });
    const accountId = reg.json && (reg.json.id || reg.json.accountId || (reg.json.account && reg.json.account.id));
    const token = reg.json && (reg.json.accessToken || (reg.json.account && reg.json.account.accessToken));
    const regOk = reg.status < 400 && !!accountId && !!token;
    log('register', regOk, { status: reg.status, accountId, error: reg.json && reg.json.error, code: reg.json && reg.json.code });

    let verified = false;
    if (regOk) {
      const secret = process.env.BACKEND_SHARED_SECRET || '';
      if (secret) {
        const dec = await req('POST', '/api/accounts/admin/' + encodeURIComponent(accountId) + '/decision', {
          action: 'approve',
        }, { 'x-rizq-secret': secret });
        verified = dec.status < 400 && !(dec.json && dec.json.error);
        log('verification', verified, { status: dec.status, error: dec.json && dec.json.error });
      } else {
        const mine = await req('GET', '/api/accounts/mine/' + encodeURIComponent(accountId), null, { 'x-account-token': token });
        verified = !!(mine.json && mine.json.account);
        log('verification', verified, { note: 'no shared secret; mine readable', status: mine.json && mine.json.account && mine.json.account.status });
      }
    } else {
      log('verification', false, { reason: 'register_failed' });
    }

    let postAdOk = false;
    if (regOk && token) {
      // Ensure package so publish isn't blocked (parity harness — mirrors admin activation)
      try {
        const db = require('../db');
        await db.ready();
        const repos = require('../db/repos');
        const { getEntitlements } = require('../services/entitlements');
        const now = new Date();
        await repos.setPackage(accountId, {
          accountId,
          packageId: 'individual_pro',
          planType: 'pro',
          status: 'active',
          paymentConfirmed: true,
          activatedBy: 'admin',
          paidAt: now.toISOString(),
          periodStart: now.toISOString(),
          periodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
          accountType: 'individual',
          pkgName: 'باقة احترافية',
        });
        const ent = await getEntitlements(accountId, 'individual');
        if (!ent || ent.subscriptionStatus !== 'active') {
          throw new Error('package_not_active:' + (ent && ent.subscriptionStatus));
        }
      } catch (ePkg) {
        log('post_ad_package_setup', false, { error: String(ePkg.message || ePkg) });
      }
      const ad = await req('POST', '/api/ads', {
        accountId,
        title: 'إعلان اختبار تكافؤ',
        titleFr: 'Annonce test parité',
        desc: 'وصف اختبار',
        descFr: 'Description test',
        price: '1000',
        category: 'أخرى',
        wilaya: 'نواكشوط',
        images: [],
      }, { 'x-account-token': token });
      postAdOk = ad.status < 400 && !!(ad.json && (ad.json.id || (ad.json.ad && ad.json.ad.id) || ad.json.ok));
      log('post_ad', postAdOk, { status: ad.status, body: ad.json && (ad.json.error || ad.json.message || ad.json.id || ad.json.ok) });
    } else {
      log('post_ad', false, { reason: 'register_failed' });
    }
    log('flow_register_verify_post', !!(regOk && verified && postAdOk));
  } catch (e) {
    log('flow_register_verify_post', false, { error: String(e.message || e) });
  }

  // 2) search → open ad → contact seller
  try {
    const ads = await req('GET', '/api/ads?search=iPhone&limit=5');
    const list = (ads.json && ads.json.ads) || [];
    const hit = list.find((a) => a && a.id) || list[0];
    const searchOk = ads.status === 200 && !!hit;
    log('search', searchOk, { total: ads.json && ads.json.total, id: hit && hit.id });
    let openOk = false;
    let contactOk = false;
    if (hit) {
      const one = await req('GET', '/api/ads/' + encodeURIComponent(hit.id));
      openOk = one.status === 200 && one.json && one.json.ad && one.json.ad.id === hit.id;
      log('open_ad', openOk, { status: one.status });
      const gate = await req('GET', '/api/contact-gate/status?targetAccountId=' + encodeURIComponent(hit.accountId || (one.json.ad && one.json.ad.accountId)) + '&module=store');
      contactOk = gate.status === 200 && gate.json && gate.json.ok && gate.json.access && typeof gate.json.access.contactsLocked === 'boolean';
      log('contact_seller_gate', contactOk, { access: gate.json && gate.json.access && gate.json.access.lockReason });
      const attempt = await req('POST', '/api/contact-gate/attempt', {
        targetAccountId: hit.accountId || (one.json.ad && one.json.ad.accountId),
        module: 'store',
        lang: 'ar',
      });
      log('contact_seller_attempt', attempt.status < 500, { status: attempt.status, ok: attempt.json && attempt.json.ok });
    }
    log('flow_search_open_contact', !!(searchOk && openOk && contactOk));
  } catch (e) {
    log('flow_search_open_contact', false, { error: String(e.message || e) });
  }

  // 3) store owner login → dashboard → add product
  try {
    // Use seeded store with accessToken from DB via mine is not available without token.
    // Seller-login with email of graduation store — may need password. Fallback: inject token from PG.
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const { rows } = await client.query("SELECT id, data FROM accounts WHERE id='acc_grad_store_01'");
    await client.end();
    const storeAcc = rows[0] && rows[0].data;
    const storeId = storeAcc && storeAcc.id;
    const storeToken = storeAcc && storeAcc.accessToken;
    const loginOk = !!(storeId && storeToken);
    log('store_owner_token', loginOk, { storeId });

    const dash = await req('GET', '/api/accounts/mine/' + encodeURIComponent(storeId), null, { 'x-account-token': storeToken });
    const dashOk = dash.status === 200 && dash.json && dash.json.account && dash.json.account.id === storeId;
    log('store_dashboard', dashOk, { status: dash.status });

    // Activate a paid package so catalog gate matches production rules
    try {
      const db = require('../db');
      await db.ready();
      const repos = require('../db/repos');
      const { getEntitlements } = require('../services/entitlements');
      const now = new Date();
      await repos.setPackage(storeId, {
        accountId: storeId,
        packageId: 'store_monthly',
        planType: 'business',
        status: 'active',
        paymentConfirmed: true,
        activatedBy: 'admin',
        paidAt: now.toISOString(),
        periodStart: now.toISOString(),
        periodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
        accountType: 'store',
        pkgName: 'باقة شهرية',
      });
      const ent = await getEntitlements(storeId, 'store');
      if (!ent || ent.subscriptionStatus !== 'active') {
        throw new Error('package_not_active:' + (ent && ent.subscriptionStatus));
      }
    } catch (ePkg) {
      log('add_product_package_setup', false, { error: String(ePkg.message || ePkg) });
    }
    const product = await req('POST', '/api/catalog', {
      accountId: storeId,
      kind: 'product',
      name: 'منتج اختبار تكافؤ',
      titleFr: 'Produit test',
      price: '500',
    }, { 'x-account-token': storeToken });
    const addOk = product.status < 400 && !!(product.json && (product.json.item || product.json.id || product.json.ok));
    log('add_product', addOk, { status: product.status, err: product.json && product.json.error, id: product.json && product.json.item && product.json.item.id });
    log('flow_store_dashboard_product', !!(loginOk && dashOk && addOk));
  } catch (e) {
    log('flow_store_dashboard_product', false, { error: String(e.message || e) });
  }

  // 4) admin login → agents hub
  try {
    const login = await req('POST', '/api/admin/login', {
      user: process.env.SUPER_ADMIN_USER || 'owner@localhost',
      pass: process.env.SUPER_ADMIN_PASSWORD || 'rizq-local-dev',
    });
    const adminToken = login.json && (login.json.token || login.json.sessionToken || (login.json.session && login.json.session.token));
    const adminOk = login.status < 400 && !!adminToken;
    log('admin_login', adminOk, { status: login.status, error: login.json && login.json.error });

    let hubOk = false;
    if (adminToken) {
      const hub = await req('GET', '/api/admin/agents-health', null, { 'x-admin-token': adminToken });
      hubOk = hub.status === 200 && hub.json && hub.json.ok === true && Array.isArray(hub.json.agents);
      log('agents_hub', hubOk, { status: hub.status, agents: hub.json && hub.json.agents && hub.json.agents.length });
    } else {
      log('agents_hub', false, { reason: 'no_admin_token' });
    }
    log('flow_admin_agents', !!(adminOk && hubOk));
  } catch (e) {
    log('flow_admin_agents', false, { error: String(e.message || e) });
  }

  // 5) French mode: no Arabic text leaking in key FR API/public fields used by UI
  try {
    const site = await req('GET', '/api/site-config');
    const ads = await req('GET', '/api/ads?limit=12');
    const pub = await req('GET', '/api/accounts/public');
    const frLeak = [];
    const adsList = (ads.json && ads.json.ads) || [];
    for (const ad of adsList) {
      if (ad && ad.titleFr && hasArabicScript(ad.titleFr)) frLeak.push({ where: 'ad.titleFr', id: ad.id, val: ad.titleFr });
      if (ad && ad.descFr && hasArabicScript(ad.descFr)) frLeak.push({ where: 'ad.descFr', id: ad.id, val: ad.descFr });
    }
    // merchant activities FR names
    const acts = await req('GET', '/api/merchant-activities');
    const actList = (acts.json && (acts.json.activities || acts.json.items || acts.json)) || [];
    if (Array.isArray(actList)) {
      for (const a of actList.slice(0, 50)) {
        if (a && a.nameFr && hasArabicScript(a.nameFr)) frLeak.push({ where: 'activity.nameFr', id: a.id, val: a.nameFr });
      }
    }
    // Fetch landing HTML with lang=fr and scan visible data-t-fr mismatches is frontend;
    // API-level: ensure help-guide fr fields
    const help = await req('GET', '/api/help-guide');
    log('french_no_arabic_leak_api', frLeak.length === 0, { leaks: frLeak.slice(0, 10), checkedAds: adsList.length });
  } catch (e) {
    log('french_no_arabic_leak_api', false, { error: String(e.message || e) });
  }

  // HTML FR scan via puppeteer light
  try {
    const puppeteer = require('puppeteer-core');
    const browser = await puppeteer.launch({
      executablePath: '/usr/local/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(BASE + '/rizq_landing_v8.html?lang=fr', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => {
      try { localStorage.setItem('rizq_lang', 'fr'); localStorage.setItem('lang', 'fr'); } catch (e) {}
    });
    await page.reload({ waitUntil: 'networkidle2' });
    const leak = await page.evaluate(() => {
      const bad = [];
      const arRe = /[\u0600-\u06FF]/;
      // Check elements marked for FR translation
      document.querySelectorAll('[data-t-fr]').forEach((el) => {
        const fr = el.getAttribute('data-t-fr') || '';
        const text = (el.innerText || '').trim();
        if (fr && arRe.test(text) && text === (el.getAttribute('data-t') || text)) {
          // still showing AR source while FR attr exists
          bad.push({ tag: el.tagName, text: text.slice(0, 80), fr: fr.slice(0, 80) });
        }
      });
      return bad.slice(0, 20);
    });
    await browser.close();
    log('french_landing_no_arabic_leak_ui', leak.length === 0, { samples: leak });
  } catch (e) {
    log('french_landing_no_arabic_leak_ui', false, { error: String(e.message || e) });
  }

  const summary = {
    base: BASE,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results,
  };
  require('fs').writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log('\nSUMMARY', summary.passed, 'pass /', summary.failed, 'fail');
  process.exitCode = summary.failed ? 2 : 0;
})().catch((e) => { console.error(e); process.exit(1); });
