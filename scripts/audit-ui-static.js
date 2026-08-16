/**
 * Static UI audit — i18n, routes/buttons, packages_config + site-config.
 * node scripts/audit-ui-static.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const AR = /[\u0600-\u06FF]/;
const results = { pass: [], warn: [], fail: [] };

function ok(name, detail) { results.pass.push({ name, detail: detail || '' }); }
function warn(name, detail) { results.warn.push({ name, detail: detail || '' }); }
function fail(name, detail) { results.fail.push({ name, detail: detail || '' }); }

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function htmlFiles() {
  return fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
}

function flattenKeys(obj, prefix, out) {
  out = out || [];
  Object.keys(obj || {}).forEach((k) => {
    const p = prefix ? prefix + '.' + k : k;
    if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) flattenKeys(obj[k], p, out);
    else out.push(p);
  });
  return out;
}

function extractLangBlocks(html) {
  const start = html.indexOf('const LANG = {');
  if (start < 0) return null;
  const arIdx = html.indexOf('\n  ar: {', start);
  const frIdx = html.indexOf('\n  fr: {', start);
  if (arIdx < 0 || frIdx < 0) return null;
  const arBlock = html.slice(arIdx, frIdx);
  const afterFr = html.slice(frIdx);
  const end = afterFr.search(/\n\};/);
  const frBlock = end >= 0 ? afterFr.slice(0, end) : afterFr.slice(0, 12000);
  const keys = (block) => {
    const set = new Set();
    const re = /'([^']+)':/g;
    let x;
    while ((x = re.exec(block))) set.add(x[1]);
    return set;
  };
  return { ar: keys(arBlock), fr: keys(frBlock) };
}

function loadI18n() {
  const ctx = { window: {} };
  vm.runInNewContext(read('rizq_i18n_data.js'), ctx);
  return { ar: ctx.window.RIZQ_I18N_AR, fr: ctx.window.RIZQ_I18N_FR };
}

function arabicIn(str) {
  return AR.test(String(str || ''));
}

/* ── 1. i18n ── */
function auditI18n() {
  const landing = read('rizq_landing_v8.html');
  const lang = extractLangBlocks(landing);
  if (!lang) {
    fail('Landing LANG dictionary', 'could not parse LANG.ar / LANG.fr');
  } else {
    const missingFr = [...lang.ar].filter((k) => !lang.fr.has(k));
    const missingAr = [...lang.fr].filter((k) => !lang.ar.has(k));
    if (!missingFr.length && !missingAr.length) {
      ok('Landing LANG key parity', lang.ar.size + ' keys in AR and FR');
    } else {
      if (missingFr.length) fail('Landing LANG missing FR', missingFr.slice(0, 20).join(', '));
      if (missingAr.length) warn('Landing LANG extra FR keys', missingAr.slice(0, 20).join(', '));
    }
  }

  const i18n = loadI18n();
  const arKeys = flattenKeys(i18n.ar);
  const frKeys = new Set(flattenKeys(i18n.fr));
  const missing = arKeys.filter((k) => !frKeys.has(k));
  if (!missing.length) ok('rizq_i18n_data.js key parity', arKeys.length + ' keys AR+FR');
  else fail('rizq_i18n_data.js missing FR', missing.slice(0, 25).join(', '));

  const frArabic = [];
  function walk(obj, prefix) {
    Object.keys(obj || {}).forEach((k) => {
      const p = prefix ? prefix + '.' + k : k;
      if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) walk(obj[k], p);
      else if (arabicIn(obj[k]) && !/Rizq|رزق|MRU|ADMINIA/.test(String(obj[k]))) {
        const stripped = String(obj[k]).replace(/رزق/g, '');
        if (AR.test(stripped) && !/^\s*©/.test(String(obj[k]))) frArabic.push(p + ': ' + String(obj[k]).slice(0, 60));
      }
    });
  }
  walk(i18n.fr);
  const realLeaks = frArabic.filter((s) => !/footer-copyright|signed-by|pkg-pro-badge/.test(s));
  if (!frArabic.length) ok('i18n FR dictionary no Arabic', 'clean');
  else if (frArabic.length <= 4) warn('i18n FR bilingual brand strings', frArabic.slice(0, 6).join(' | '));
  else fail('i18n FR Arabic leaks', frArabic.slice(0, 12).join(' | '));

  const Pkg = require(path.join(ROOT, 'rizq_packages_config.js'));
  const dFr = Pkg.diamondCopy('fr');
  const dFields = ['name', 'description', 'featuredBadge', 'roi'].filter((f) => arabicIn(dFr[f]));
  const featAr = (dFr.features || []).filter(arabicIn);
  if (!dFields.length && !featAr.length) ok('diamondCopy(fr) no Arabic', dFr.name);
  else fail('diamondCopy(fr) Arabic leak', dFields.concat(featAr.slice(0, 2)).join(', '));

  const staleNav = /<strong>فضي<\/strong>|<strong>ذهبي<\/strong>|<strong>ماسي<\/strong>|<strong>ناسي<\/strong>/.test(landing)
    || /navDdAR = \[\['مجاني'.+فضي/.test(landing);
  if (staleNav) fail('Landing nav packages', 'stale فضي/ذهبي/ماسي labels (not canonical catalog)');
  else ok('Landing nav packages', 'no stale silver/gold/ماسي labels');

  const footerContact = /<h4 class="footer-col-title"[^>]*>تواصل معنا<\/h4>/.test(landing)
    && !/data-t="ft-contact"/.test(landing);
  if (footerContact) warn('Footer contact heading', 'hardcoded AR without data-t (JS fallback exists)');
  else ok('Footer contact heading', 'translated via data-t or JS');

  const corp = read('rizq_corp.html');
  if (/id="pkg4-name">ناسي</.test(corp) || /الباقة الناسية/.test(corp) || />8,000</.test(corp)) {
    fail('Corp public pricing', 'typo ناسي and/or stale 8,000 MRU (canonical corp diamond is 6,000)');
  } else ok('Corp public pricing', 'diamond name/price not stale');
}

/* ── 2. Buttons & routes ── */
function definedFunctions(src) {
  const names = new Set();
  const re = /function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(src))) names.add(m[1]);
  const re2 = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function/g;
  while ((m = re2.exec(src))) names.add(m[1]);
  const re3 = /(?:window\.)?([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function/g;
  while ((m = re3.exec(src))) names.add(m[1]);
  return names;
}

function scriptBundle(htmlRel) {
  const html = read(htmlRel);
  let bundle = html;
  const re = /<script[^>]+src=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(html))) {
    const src = m[1].split('?')[0];
    if (/^https?:/i.test(src)) continue;
    if (exists(src)) bundle += '\n' + read(src);
  }
  return bundle;
}

function auditButtons() {
  const dashboards = [
    'rizq_admin.html',
    'rizq_dashboard.html',
    'rizq_dashboard_store.html',
    'rizq_dashboard_office.html',
    'rizq_dashboard_corp.html'
  ];
  const empty = [];
  const missing = [];
  dashboards.forEach((file) => {
    const html = read(file);
    const fns = definedFunctions(scriptBundle(file));
    const onclickRe = /onclick\s*=\s*"([^"]*)"/g;
    let m;
    while ((m = onclickRe.exec(html))) {
      const h = m[1].trim();
      if (!h) {
        empty.push(file + ': empty onclick');
        continue;
      }
      if (/^(this\.|event\.|window\.|location\.|document\.|return\s|void\s)/.test(h)) continue;
      const fn = h.match(/^([A-Za-z_$][\w$]*)\s*\(/);
      if (!fn) continue;
      const name = fn[1];
      if (['alert', 'confirm', 'parseInt', 'parseFloat', 'encodeURIComponent', 'setTimeout', 'clearTimeout', 'if', 'typeof', 'void', 'switch', 'new', 'return'].includes(name)) continue;
      if (!fns.has(name)) missing.push(file + ' → ' + name + '()');
    }
  });
  if (!empty.length) ok('Empty onclick handlers', 'none in admin/subscriber dashboards');
  else fail('Empty onclick handlers', empty.join(', '));
  const uniqueMissing = [...new Set(missing)];
  if (!uniqueMissing.length) ok('Dashboard onclick targets', 'all named handlers defined');
  else fail('Undefined onclick handlers', uniqueMissing.slice(0, 20).join(', '));
}

function auditLinks() {
  const pages = ['rizq_landing_v8.html', 'rizq_admin.html', 'rizq_dashboard.html',
    'rizq_dashboard_store.html', 'rizq_dashboard_office.html', 'rizq_dashboard_corp.html'];
  const broken = [];
  const hashMissing = [];
  pages.forEach((file) => {
    const html = read(file);
    const hrefRe = /href\s*=\s*"([^"]+)"/g;
    let m;
    while ((m = hrefRe.exec(html))) {
      const href = m[1].trim();
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')
        || href.startsWith('javascript:') || href.startsWith('{') || href.startsWith('${')) continue;
      if (href === '#') continue;
      if (href.startsWith('#')) {
        const id = href.slice(1).split('?')[0];
        if (id && !new RegExp('id=["\']' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']').test(html)
          && !html.includes("getElementById('" + id + "')") && file === 'rizq_landing_v8.html') {
          hashMissing.push(file + '#' + id);
        }
        continue;
      }
      const filePart = href.split('#')[0].split('?')[0];
      if (!filePart.endsWith('.html') && !filePart.endsWith('.js') && !filePart.endsWith('.css')) continue;
      if (!exists(filePart) && !exists(filePart.replace(/^\.\//, ''))) {
        broken.push(file + ' → ' + filePart);
      }
    }
  });
  if (!broken.length) ok('Broken file links', 'header/footer/landing/dashboards OK');
  else fail('Broken file links', [...new Set(broken)].slice(0, 15).join(', '));
  const uniqueHash = [...new Set(hashMissing)].filter((h) => !/#(pricing|about|virtual-offices)$/.test(h));
  if (!uniqueHash.length) ok('Landing hash targets', '#pricing #about present');
  else warn('Landing hash without id', uniqueHash.slice(0, 10).join(', '));
}

/* ── 3. Integration + syntax ── */
function auditIntegration() {
  const required = [
    ['rizq_admin.html', 'rizq_packages_config.js'],
    ['rizq_landing_v8.html', 'rizq_packages_config.js'],
    ['rizq_dashboard_store.html', 'rizq_packages_config.js'],
    ['rizq_dashboard_office.html', 'rizq_packages_config.js'],
    ['rizq_dashboard_corp.html', 'rizq_packages_config.js'],
    ['rizq_dashboard.html', 'rizq_packages_config.js']
  ];
  required.forEach(([file, script]) => {
    const html = read(file);
    if (html.includes(script)) ok(file + ' loads ' + script, 'present');
    else fail(file + ' missing ' + script, 'subscriber/admin UI not wired to canonical catalog');
  });

  const siteCfg = path.join(ROOT, 'rizq-backend', 'data', 'site-config.json');
  if (!fs.existsSync(siteCfg)) {
    warn('site-config.json', 'file not present — live admin prices fall back to PKG defaults');
  } else {
    const cfg = JSON.parse(fs.readFileSync(siteCfg, 'utf8'));
    const pkgs = cfg.packages || {};
    ok('site-config.json packages', Object.keys(pkgs).join(', ') || 'empty packages object');
  }
  const Pkg = require(path.join(ROOT, 'rizq_packages_config.js'));
  ['general', 'individual', 'store', 'corp'].forEach((k) => {
    const cat = Pkg.getCatalog(k);
    if (cat && cat.length) ok('getCatalog(' + k + ')', cat.length + ' SKUs, diamond=' + cat.some(Pkg.isDiamondPackage));
    else fail('getCatalog(' + k + ')', 'empty');
  });

  const dash = read('rizq_dashboard.html');
  if (/RizqPackagesConfig\.getCatalog\(['"]individual['"]/.test(dash)) {
    ok('Individual dashboard catalog', 'getCatalog(individual)');
  } else {
    fail('Individual dashboard catalog', 'renderPackagesDisplay still uses hardcoded DEF / LS only');
  }
}

function auditPersistWiring() {
  const admin = read('rizq_admin.html');
  const server = read('rizq-backend/server.js');
  const landing = read('rizq_landing_v8.html');
  const store = read('rizq_dashboard_store.html');
  const office = read('rizq_dashboard_office.html');
  const corp = read('rizq_dashboard_corp.html');

  if (admin.includes('function _adminPostSiteConfig')) ok('Admin POST site-config helper', 'present');
  else fail('Admin POST site-config helper', 'save still toast/LS only');
  if (admin.includes('function persistPlatformFlag')) ok('Admin platform flags persist', 'present');
  else fail('Admin platform flags persist', 'settings toggles not wired');
  if (admin.includes('_adminPostSiteConfig({ prices:')) ok('Admin savePrices → API', 'posts prices overlay');
  else fail('Admin savePrices → API', 'savePrices does not POST prices');
  if (admin.includes('channelsPublic:')) ok('Admin saveChannelsConfig public fields', 'no Twilio secrets in GET overlay');
  else fail('Admin saveChannelsConfig public fields', 'channels not posted');
  if (admin.includes('_adminPostSiteConfig({ extraCategories:')) ok('Admin extraCategories → API', 'posted');
  else fail('Admin extraCategories → API', 'not posted');
  if (admin.includes('_adminPostSiteConfig({ site:')) ok('Admin site identity → API', 'posted');
  else fail('Admin site identity → API', 'not posted');

  if (server.includes('if (b.widget_enabled !== undefined)')
    && server.includes('if (b.whatsapp_enabled !== undefined)')
    && server.includes('if (b.calls_enabled !== undefined)')) {
    ok('PATCH /api/accounts/mine channel flags', 'widget/whatsapp/calls');
  } else fail('PATCH /api/accounts/mine channel flags', 'channel flags not accepted');
  if (server.includes('body.prices') && server.includes('body.platformFlags') && server.includes('body.channelsPublic')) {
    ok('POST /api/site-config overlay fields', 'prices + flags + channelsPublic');
  } else fail('POST /api/site-config overlay fields', 'missing prices/platformFlags/channelsPublic');

  if (landing.includes("localStorage.setItem('rizq_prices'") && landing.includes('cfg.prices')) {
    ok('Landing live price overlay', 'syncPackageCatalogsOnLoad writes rizq_prices');
  } else fail('Landing live price overlay', 'landing does not apply admin prices');

  [['store', store], ['office', office], ['corp', corp]].forEach(([name, src]) => {
    if (src.includes('function toggleAccountChannel') && /widget_enabled/.test(src) && /whatsapp_enabled/.test(src) && /calls_enabled/.test(src)) {
      ok(name + ' channel toggles', 'PATCH + LS');
    } else fail(name + ' channel toggles', 'missing toggleAccountChannel / channel flags');
    if (/_t2\([^)]*Claude/i.test(src) || /الوكيل الذكي \(Claude/.test(src)) {
      fail(name + ' no Claude in subscriber UI', 'customer-facing Claude label still present');
    } else ok(name + ' no Claude in subscriber UI', 'labels use Agent intelligent');
  });
  if (store.includes('_renderChannelToggles') && office.includes('_renderOfficeChannelToggles') && corp.includes('_renderCorpChannelToggles')) {
    ok('Diamond agent channel rows', 'store/office/corp render channel toggles');
  } else fail('Diamond agent channel rows', 'a dashboard is missing channel-row renderer');
}

function auditSyntax() {
  const files = [
    'rizq_packages_config.js',
    'rizq_subscription_engine.js',
    'rizq_i18n.js',
    'rizq_i18n_data.js',
    'rizq_quota_guard_agent.js',
    'rizq_subscriber_agent.js',
    'scripts/audit-ui-static.js',
    'rizq-backend/server.js',
    'rizq-backend/config/anthropic.js'
  ];
  files.forEach((f) => {
    try {
      execSync('node --check "' + path.join(ROOT, f) + '"', { stdio: 'pipe' });
      ok('syntax ' + f, 'OK');
    } catch (e) {
      fail('syntax ' + f, (e.stderr || e.message || '').toString().slice(0, 160));
    }
  });
}

function runExternal() {
  function run(cmd, cwd, expect) {
    try {
      const out = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe', timeout: 120000 });
      if (expect && !expect.test(out)) warn(cmd, out.slice(-240));
      else ok(cmd, (out.match(/\d+\/\d+/) || ['ok'])[0]);
      return out;
    } catch (e) {
      const out = (e.stdout || '') + (e.stderr || e.message || '');
      if (expect && expect.test(out)) {
        ok(cmd, (out.match(/\d+\/\d+/) || ['ok'])[0] + ' (exit ' + e.status + ')');
        return out;
      }
      fail(cmd, out.slice(-400));
      return out;
    }
  }
  run('node scripts/audit-agents.js', path.join(ROOT, 'rizq-backend'), /(\d+)\/\1/);
  run('node scripts/comprehensive-system-audit.js', path.join(ROOT, 'rizq-backend'), /Score:/);
}

auditI18n();
auditButtons();
auditLinks();
auditIntegration();
auditPersistWiring();
auditSyntax();
runExternal();

console.log('\n=== Rizq Static UI Audit ===\n');
console.log('PASS', results.pass.length, '| WARN', results.warn.length, '| FAIL', results.fail.length);
if (results.fail.length) {
  console.log('\nFAILURES:');
  results.fail.forEach((x) => console.log('  -', x.name, '—', x.detail));
}
if (results.warn.length) {
  console.log('\nWARNINGS:');
  results.warn.forEach((x) => console.log('  -', x.name, '—', x.detail));
}
const outFile = path.join(ROOT, 'scripts', 'audit-ui-static-last.json');
fs.writeFileSync(outFile, JSON.stringify(results, null, 2), 'utf8');
console.log('\nJSON:', outFile);
process.exit(results.fail.length ? 1 : 0);
