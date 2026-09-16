'use strict';
/**
 * Smoke test: header layout + navigation (headless Chrome, clean profile).
 * node scripts/e2e-platform-smoke.js
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = process.env.RIZQ_TEST_BASE || 'http://127.0.0.1:3000';
const OUT = '/opt/cursor/artifacts/screenshots';
const CHROME = '/usr/bin/google-chrome-stable';
const PROFILE = '/tmp/rizq-chrome-clean-' + Date.now();

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PROFILE, { recursive: true });

const PAGES = [
  { name: 'landing', url: '/rizq_landing_v8.html' },
  { name: 'browse', url: '/rizq_browse.html' },
  { name: 'store', url: '/rizq_store.html' },
  { name: 'legal', url: '/rizq_legal.html' },
  { name: 'help', url: '/rizq_help.html' },
  { name: 'post', url: '/rizq_post.html' },
  { name: 'office', url: '/rizq_office.html' },
];

function chromeEval(js, url, w, h) {
  const script = `
    (async () => {
      ${js}
    })().then(r => console.log('__RESULT__' + JSON.stringify(r))).catch(e => console.log('__ERROR__' + e.message));
  `;
  const tmp = path.join('/tmp', 'rizq-eval-' + Date.now() + '.js');
  fs.writeFileSync(tmp, script);
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--user-data-dir=' + PROFILE,
    '--window-size=' + (w || 1366) + ',' + (h || 900),
    '--virtual-time-budget=8000',
    '--run-all-compositor-stages-before-draw',
    url
  ];
  // Use dump-dom + separate approach - evaluate via remote debugging is heavy.
  // Instead run chrome with --dump-dom and grep, or use puppeteer if available.
  fs.unlinkSync(tmp);
  return null;
}

function screenshot(name, url, w, h) {
  const out = path.join(OUT, name + '.png');
  const r = spawnSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--user-data-dir=' + PROFILE,
    '--window-size=' + (w || 1366) + ',' + (h || 900),
    '--run-all-compositor-stages-before-draw',
    '--screenshot=' + out,
    BASE + url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now(),
  ], { encoding: 'utf8', timeout: 30000 });
  return { ok: r.status === 0 && fs.existsSync(out), path: out, stderr: (r.stderr || '').slice(0, 200) };
}

function dumpDom(url) {
  const r = spawnSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    '--user-data-dir=' + PROFILE,
    '--virtual-time-budget=6000',
    '--dump-dom',
    BASE + url + '?_t=' + Date.now(),
  ], { encoding: 'utf8', timeout: 45000, maxBuffer: 20 * 1024 * 1024 });
  return r.stdout || '';
}

function checkBrowseHeader(dom) {
  const hasDesk = dom.includes('id="rizq-desk-nav"');
  const hasClass = dom.includes('has-rizq-desk-nav');
  const stripClass = dom.includes('rizq-search-strip-nav');
  const chromeHidden = dom.includes('data-rizq-chrome-hidden');
  // Native nav actions should be hidden via attribute or class
  const navMatch = dom.match(/<nav id="nav-browse-search"[^>]*>([\s\S]*?)<\/nav>/);
  let actionsVisible = false;
  if (navMatch) {
    const chunk = navMatch[1];
    const actions = chunk.match(/class="nav-actions"/);
    const hidden = chunk.includes('data-rizq-chrome-hidden') || chunk.includes('display:none');
    actionsVisible = !!(actions && !hidden && !stripClass);
  }
  return { hasDesk, hasClass, stripClass, chromeHidden, actionsVisible, ok: hasDesk && (hasClass || stripClass || chromeHidden) && !actionsVisible };
}

function httpOk(url) {
  try {
    const out = execSync('curl -s -o /dev/null -w "%{http_code}" "' + BASE + url + '"', { encoding: 'utf8', timeout: 10000 });
    return out.trim() === '200';
  } catch (e) {
    return false;
  }
}

console.log('=== Rizq Platform Smoke Test ===');
console.log('Base:', BASE);
console.log('Clean Chrome profile:', PROFILE);
console.log('');

const results = [];
let failed = 0;

for (const p of PAGES) {
  const http = httpOk(p.url);
  const shot = screenshot('smoke-' + p.name, p.url);
  results.push({ page: p.name, http, screenshot: shot.ok });
  if (!http) { failed++; console.log('FAIL HTTP', p.name); continue; }
  console.log('OK HTTP', p.name, shot.ok ? '(screenshot)' : '(no shot)');
}

console.log('');
const browseDom = dumpDom('/rizq_browse.html');
const hdr = checkBrowseHeader(browseDom);
console.log('Browse header:', JSON.stringify(hdr));
if (!hdr.ok) {
  failed++;
  console.log('FAIL browse header duplication check');
} else {
  console.log('OK browse header (desk nav + search strip mode)');
}

screenshot('smoke-browse-mobile', '/rizq_browse.html', 390, 844);

// Footer link spot-check in browse dom
const footerChecks = [
  ['rzq-ft-h1', 'rizq_help.html'],
  ['rzq-ft-h3', 'rizq_legal.html#s2'],
  ['rzq-ft-c1', 'rizq_browse.html?cat='],
];
footerChecks.forEach(function ([id, hrefPart]) {
  const re = new RegExp('id="' + id + '"[^>]*href="[^"]*' + hrefPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const ok = re.test(browseDom) || browseDom.includes('href="' + hrefPart);
  console.log(ok ? 'OK footer' : 'FAIL footer', id, '→', hrefPart);
  if (!ok) failed++;
});

console.log('');
console.log(failed ? 'SMOKE FAILED: ' + failed + ' issue(s)' : 'SMOKE PASSED');
process.exit(failed ? 1 : 0);
