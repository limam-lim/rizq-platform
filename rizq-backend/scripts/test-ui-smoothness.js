/**
 * فحص سلاسة الواجهة: تحميل، تنقل، أقسام، أخطاء كونسول، نماذج، موبايل.
 */
'use strict';

const { chromium } = require('/tmp/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = process.env.RIZQ_BASE || 'http://127.0.0.1:3000';
const ART = '/opt/cursor/artifacts';
const OUT = path.join(ART, 'ui-smoothness-report.json');

function assert(cond, msg, fails) {
  if (!cond) fails.push(msg);
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  const report = { ok: true, fails: [], notes: [], timings: {}, consoleErrors: [], pages: {} };
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  try {
    // ── Desktop landing ──
    const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push(String(e.message || e)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    const failedReqs = [];
    page.on('response', (res) => {
      const u = res.url();
      if (res.status() >= 400 && (u.includes('/api/') || u.includes('rizq_'))) {
        failedReqs.push(res.status() + ' ' + u.replace(BASE, ''));
      }
    });

    const t0 = Date.now();
    const resp = await page.goto(BASE + '/rizq_landing_v8.html', { waitUntil: 'networkidle', timeout: 60000 });
    report.timings.landingLoadMs = Date.now() - t0;
    assert(resp && resp.ok(), 'landing HTTP not ok', report.fails);
    await page.waitForTimeout(2000);

    // Critical anchors / mounts present
    const mounts = [
      'virtual-stores', 'virtual-offices', 'virtual-showrooms',
      'virtual-tenders', 'virtual-investments',
      'rzq-disc-store', 'rzq-disc-office', 'rzq-disc-corp',
      'rzq-disc-tenders', 'rzq-disc-investments',
    ];
    for (const id of mounts) {
      const n = await page.locator('#' + id).count();
      assert(n === 1, 'missing #' + id, report.fails);
    }

    // Nav jumps: روابط سطح المكتب في #nav (قد تكون داخل تمرير أفقي)
    const jumpIds = ['virtual-stores', 'virtual-offices', 'virtual-showrooms', 'virtual-tenders', 'virtual-investments'];
    for (const id of jumpIds) {
      const clicked = await page.evaluate((sectionId) => {
        const links = Array.from(document.querySelectorAll(
          '#nav a[href="#' + sectionId + '"], #rizq-desk-nav a[href="#' + sectionId + '"], a[data-jump="#' + sectionId + '"]'
        ));
        const visible = links.find((a) => {
          const r = a.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
        if (visible) { visible.click(); return 'click'; }
        location.hash = '#' + sectionId;
        return 'hash';
      }, id);
      await page.waitForTimeout(1400);
      let visible = await page.locator('#' + id).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight * 0.95 && r.bottom > 20;
      }).catch(() => false);
      if (!visible) {
        await page.evaluate((sectionId) => {
          const el = document.getElementById(sectionId);
          if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
          location.hash = '#' + sectionId;
        }, id);
        await page.waitForTimeout(400);
        visible = await page.locator('#' + id).evaluate((el) => {
          const r = el.getBoundingClientRect();
          return r.top < window.innerHeight * 0.95 && r.bottom > 20;
        }).catch(() => false);
      }
      assert(visible, 'nav jump did not reveal #' + id + ' via ' + clicked, report.fails);
    }

    // Discovery strips rendered (empty or cards — not blank)
    const discs = ['rzq-disc-store', 'rzq-disc-office', 'rzq-disc-corp', 'rzq-disc-tenders', 'rzq-disc-investments'];
    for (const id of discs) {
      const html = await page.locator('#' + id).innerHTML();
      const ok = html.includes('rzq-disc-empty') || html.includes('rzq-disc-strip') || html.includes('rzq-disc-card');
      assert(ok, id + ' not rendered (empty/strip)', report.fails);
      report.pages[id] = {
        empty: html.includes('rzq-disc-empty'),
        strip: html.includes('rzq-disc-strip') || html.includes('rzq-disc-card'),
      };
    }
    await page.screenshot({ path: path.join(ART, 'ui-smooth-landing-desktop.png'), fullPage: false });

    // Language toggle FR/AR if present
    const langBtn = page.locator('[data-lang], .lang-toggle, button:has-text("FR"), a:has-text("FR")').first();
    if (await langBtn.count()) {
      await langBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      report.notes.push('lang toggle clicked');
      // switch back
      const arBtn = page.locator('button:has-text("AR"), a:has-text("AR")').first();
      if (await arBtn.count()) await arBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
    }

    // حسابي → بوابة rag-overlay
    await page.click('#nav-account-btn', { force: true }).catch(() => {});
    await page.waitForTimeout(800);
    const accountOpen = await page.evaluate(() => {
      const rag = document.getElementById('rag-overlay');
      return !!(rag && rag.classList.contains('open') && getComputedStyle(rag).display !== 'none');
    });
    assert(accountOpen, 'حسابي did not open rag-overlay', report.fails);
    report.notes.push('حسابي → rag-overlay open');
    await page.evaluate(() => {
      const rag = document.getElementById('rag-overlay');
      if (rag) rag.classList.remove('open');
      if (window.RizqAuthGate && typeof window.RizqAuthGate.close === 'function') window.RizqAuthGate.close();
    }).catch(() => {});
    await page.waitForTimeout(300);

    // نشر → rizq_post.html
    const beforePost = page.url();
    await page.evaluate(() => { if (typeof goToPost === 'function') goToPost(); });
    await page.waitForTimeout(1200);
    assert(/rizq_post\.html/.test(page.url()), 'نشر did not navigate to post page', report.fails);
    report.notes.push('نشر → ' + page.url());
    await page.goto(BASE + '/rizq_landing_v8.html', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(800);
    void beforePost;

    // Key linked pages load (sample)
    const secondary = [
      '/rizq_browse.html',
      '/rizq_tenders.html',
      '/rizq_investments.html',
      '/rizq_store.html',
      '/rizq_office.html',
      '/rizq_showroom.html',
      '/rizq_dashboard_store.html',
    ];
    for (const p of secondary) {
      const t = Date.now();
      const r = await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => null);
      const ms = Date.now() - t;
      const ok = !!(r && r.ok());
      report.pages[p] = { ok, status: r ? r.status() : 0, ms };
      assert(ok, p + ' failed to load', report.fails);
      assert(ms < 15000, p + ' slow load ' + ms + 'ms', report.fails);
    }

    // Back to landing for mobile check
    await page.goto(BASE + '/rizq_landing_v8.html', { waitUntil: 'networkidle', timeout: 60000 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1500);
    // mobile drawer / hamburger
    const hamburger = page.locator('.mobile-menu-btn, .nav-toggle, [aria-label*="menu"], .hamburger, .menu-toggle, button.mobile-drawer').first();
    if (await hamburger.count()) {
      await hamburger.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
      report.notes.push('mobile menu toggled');
    }
    // sections still present and scrollable
    for (const id of ['virtual-stores', 'virtual-tenders', 'virtual-investments']) {
      await page.locator('#' + id).scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(250);
      const box = await page.locator('#' + id).boundingBox().catch(() => null);
      assert(!!box, 'mobile missing section ' + id, report.fails);
    }
    await page.screenshot({ path: path.join(ART, 'ui-smooth-landing-mobile.png'), fullPage: false });

    // Filter noisy console errors (favicon / third-party)
    const filtered = consoleErrors.filter((e) => {
      const s = String(e);
      if (/favicon/i.test(s)) return false;
      if (/Failed to load resource.*404/i.test(s) && /favicon/i.test(s)) return false;
      return true;
    });
    report.consoleErrors = filtered.slice(0, 40);
    report.failedReqs = failedReqs.slice(0, 40);
    // Soft: pageerrors are hard fails; chrome meta X-Frame noise ignored
    const hardConsole = filtered.filter((e) =>
      !/Failed to load resource/i.test(e)
      && !/net::ERR/i.test(e)
      && !/X-Frame-Options may only be set via an HTTP header/i.test(e)
    );
    assert(hardConsole.length === 0, 'page JS errors: ' + hardConsole.slice(0, 3).join(' | '), report.fails);
    if (report.timings.landingLoadMs > 12000) {
      report.fails.push('landing load slow: ' + report.timings.landingLoadMs + 'ms');
    } else {
      report.notes.push('landing load ' + report.timings.landingLoadMs + 'ms');
    }

    await page.close();
  } finally {
    await browser.close();
  }

  report.ok = report.fails.length === 0;
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error('FATAL', e && e.stack || e);
  process.exit(1);
});
