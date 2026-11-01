/**
 * رحلات مستخدم آلية (Playwright headless) — قراءة فقط.
 * تتخطّى بهدوء إن لم تتوفر playwright.
 */
'use strict';

const { cfg } = require('./config');
const store = require('./store');
const alerts = require('./alerts');

function tryRequirePlaywright() {
  try {
    return require('playwright');
  } catch (_) {
    return null;
  }
}

async function runOneViewport(browser, viewport, telegram) {
  const c = cfg();
  const context = await browser.newContext({
    viewport,
    userAgent: viewport.width < 500
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    locale: 'ar',
  });
  const page = await context.newPage();
  const jsErrors = [];
  const slow = [];
  let cls = 0;
  let deadClicks = 0;

  page.on('pageerror', (err) => { jsErrors.push(String(err && err.message || err).slice(0, 300)); });
  page.on('console', (msg) => {
    if (msg.type() === 'error') jsErrors.push(String(msg.text()).slice(0, 300));
  });

  await page.addInitScript(() => {
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__rizqCls = (window.__rizqCls || 0) + (e.value || 0);
        }
      });
      po.observe({ type: 'layout-shift', buffered: true });
    } catch (_) { /* */ }
  });

  async function goto(path) {
    const url = c.publicBase + path;
    const t0 = Date.now();
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => ({ ok: () => false, status: () => 0, _err: e.message }));
    const ms = Date.now() - t0;
    const status = res && typeof res.status === 'function' ? res.status() : 0;
    if (ms > c.slowPageMs) slow.push({ path, ms, status });
    return { path, ms, status, error: res && res._err };
  }

  const steps = [];
  steps.push(await goto('/'));
  steps.push(await goto('/rizq_browse.html'));
  // محاولة فتح إعلان من browse إن وُجد رابط
  try {
    const adHref = await page.evaluate(() => {
      const a = document.querySelector('a[href*="ad"], a[href*="rizq_ad"], a[href*="browse"]');
      return a ? a.getAttribute('href') : null;
    });
    if (adHref && !adHref.startsWith('http')) {
      steps.push(await goto(adHref.startsWith('/') ? adHref : '/' + adHref));
    }
  } catch (_) { /* */ }

  steps.push(await goto('/rizq_store.html'));
  steps.push(await goto('/rizq_products.html'));
  // سلة — بلا طلب
  try {
    const cartBtn = await page.$('[data-cart], .cart, #cart, a[href*="cart"]');
    if (cartBtn) {
      const before = page.url();
      await cartBtn.click({ timeout: 2000 }).catch(() => { deadClicks += 1; });
      await page.waitForTimeout(500);
      if (page.url() === before) {
        // قد تكون سلة منبثقة — لا تُحسب فشلاً
      }
    }
  } catch (_) { /* */ }

  // دخول حساب الحارس إن توفّرت بيانات
  const email = c.sentinelEmail;
  const pass = String(process.env.SENTINEL_ACCOUNT_PASSWORD || '').trim();
  if (email && pass) {
    try {
      await goto('/rizq_login.html');
      const emailSel = await page.$('input[type="email"], input[name="email"], #email');
      const passSel = await page.$('input[type="password"], input[name="password"], #password');
      if (emailSel && passSel) {
        await emailSel.fill(email);
        await passSel.fill(pass);
        const submit = await page.$('button[type="submit"], button.login, .btn-login');
        if (submit) await submit.click().catch(() => { deadClicks += 1; });
        await page.waitForTimeout(1500);
        // لوحة الحساب
        await goto('/rizq_dashboard.html').catch(() => null);
      }
    } catch (_) { /* */ }
  }

  cls = await page.evaluate(() => Number(window.__rizqCls || 0));
  await context.close();

  const failedCore = steps.some((s) => !s.status || s.status >= 500 || s.error);
  const report = {
    viewport,
    steps,
    jsErrors: jsErrors.slice(0, 20),
    slow,
    deadClicks,
    cls: Math.round(cls * 1000) / 1000,
    failedCore,
  };

  if (failedCore) {
    await alerts.notifyCritical(
      telegram,
      'journey_fail_' + viewport.width,
      'فشل رحلة أساسية على عرض ' + viewport.width + 'px'
    );
  } else {
    await alerts.notifyRecovered(
      telegram,
      'journey_fail_' + viewport.width,
      'عادت الرحلة الأساسية على عرض ' + viewport.width + 'px'
    );
  }

  return report;
}

async function runJourneys(telegram) {
  const pw = tryRequirePlaywright();
  if (!pw) {
    await store.insertEvent({
      kind: 'journey_skipped',
      severity: 'info',
      summary: 'رحلات Playwright غير متاحة (الحزمة غير مثبتة)',
      payload: {},
    });
    return { skipped: true, reason: 'playwright_missing' };
  }

  const browser = await pw.chromium.launch({ headless: true });
  try {
    const desk = await runOneViewport(browser, { width: 1280, height: 800 }, telegram);
    const phone = await runOneViewport(browser, { width: 390, height: 844 }, telegram);
    const summary = {
      desk,
      phone,
      jsErrors: (desk.jsErrors.length + phone.jsErrors.length),
      slowPages: desk.slow.length + phone.slow.length,
      clsMax: Math.max(desk.cls, phone.cls),
    };
    await store.insertEvent({
      kind: 'journey_report',
      severity: (desk.failedCore || phone.failedCore) ? 'critical' : 'info',
      summary: 'رحلات: JS=' + summary.jsErrors
        + ' بطيء=' + summary.slowPages
        + ' CLS=' + summary.clsMax,
      payload: summary,
    });
    return summary;
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { runJourneys };
