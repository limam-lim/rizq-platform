#!/usr/bin/env node
/**
 * مشغّل اختبارات شامل لآلة نظيفة:
 * 1) يضبط كلمة سر بوابة الأدمن للاختبار إن نقصت
 * 2) يثبّت Playwright + Chromium عند الحاجة
 * 3) يشغّل خادماً ستاتيكياً لاختبارات الواجهة
 * 4) يشغّل كل سكربتات npm test:* في rizq-backend
 * 5) ينظّف uploads/catalog/CAT-<timestamp>-* بعد الانتهاء
 *
 * تشغيل: npm run test:all
 * وثائق: qa/TESTING.md
 */
'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const BACKEND = path.join(__dirname, '..');
const ROOT = path.join(BACKEND, '..');
const ENV_PATH = path.join(BACKEND, '.env');

function loadDotenvFile() {
  if (!fs.existsSync(ENV_PATH)) return;
  fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const i = t.indexOf('=');
    if (i < 1) return;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!Object.prototype.hasOwnProperty.call(process.env, k)) process.env[k] = v;
  });
}

function ensureGatePassword() {
  loadDotenvFile();
  if (!process.env.ADMIN_PANEL_GATE_KEY || !String(process.env.ADMIN_PANEL_GATE_KEY).trim()) {
    process.env.ADMIN_PANEL_GATE_KEY = 'test-gate-key-rizq-local-only';
    console.log('[test:all] ADMIN_PANEL_GATE_KEY → test default (not for production)');
  } else {
    console.log('[test:all] ADMIN_PANEL_GATE_KEY present');
  }
  if (!process.env.BACKEND_SHARED_SECRET || !String(process.env.BACKEND_SHARED_SECRET).trim()) {
    process.env.BACKEND_SHARED_SECRET = process.env.ADMIN_PANEL_GATE_KEY;
  }
  if (!process.env.ADMIN_PANEL_PATH || !String(process.env.ADMIN_PANEL_PATH).trim()) {
    process.env.ADMIN_PANEL_PATH = 'cp-test-local';
  }
  /* Sentinel DB role — نفس أسلوب بوابة الأدمن على آلة نظيفة */
  if (!process.env.SENTINEL_DB_PASSWORD || !String(process.env.SENTINEL_DB_PASSWORD).trim()) {
    process.env.SENTINEL_DB_PASSWORD = 'sentinel_test_pass_9d2d';
    console.log('[test:all] SENTINEL_DB_PASSWORD → test default (not for production)');
  } else {
    console.log('[test:all] SENTINEL_DB_PASSWORD present');
  }
  if (!process.env.RIZQ_SENTINEL_PASSWORD || !String(process.env.RIZQ_SENTINEL_PASSWORD).trim()) {
    process.env.RIZQ_SENTINEL_PASSWORD = process.env.SENTINEL_DB_PASSWORD;
  }
}

function playwrightRoots() {
  return [
    path.join(ROOT, 'qa', 'ui-logic-1'),
    path.join(ROOT, 'qa', 'journeys'),
    path.join(ROOT, 'qa', 'cls-1'),
  ];
}

function findPlaywright() {
  const candidates = [
    path.join(ROOT, 'qa/ui-logic-1/node_modules/playwright'),
    path.join(ROOT, 'qa/journeys/node_modules/playwright'),
    path.join(ROOT, 'qa/cls-1/node_modules/playwright'),
    'playwright',
  ];
  for (const c of candidates) {
    try {
      require.resolve(c === 'playwright' ? 'playwright' : path.join(c, 'package.json'));
      return c;
    } catch (e) { /* */ }
  }
  return null;
}

function ensurePlaywright() {
  if (findPlaywright()) {
    console.log('[test:all] Playwright already available');
    return true;
  }
  const target = path.join(ROOT, 'qa', 'ui-logic-1');
  if (!fs.existsSync(path.join(target, 'package.json'))) {
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'package.json'), JSON.stringify({
      name: 'ui-logic-1',
      private: true,
      dependencies: { playwright: '^1.49.1' },
    }, null, 2) + '\n');
  }
  console.log('[test:all] installing Playwright in qa/ui-logic-1 …');
  let r = spawnSync('npm', ['install', '--no-fund', '--no-audit'], {
    cwd: target, stdio: 'inherit', env: process.env,
  });
  if (r.status !== 0) {
    console.error('[test:all] npm install playwright failed');
    return false;
  }
  r = spawnSync('npx', ['playwright', 'install', 'chromium'], {
    cwd: target, stdio: 'inherit', env: process.env,
  });
  if (r.status !== 0) {
    console.error('[test:all] playwright install chromium failed');
    return false;
  }
  return !!findPlaywright();
}

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url === '/') url = '/rizq_landing_v8.html';
      const file = path.join(ROOT, url.replace(/^\//, ''));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('no'); return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = {
        '.html': 'text/html;charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.woff2': 'font/woff2',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
      };
      res.writeHead(200, {
        'content-type': types[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
      });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log('[test:all] static server on http://127.0.0.1:' + port);
      resolve({
        server,
        port,
        base: 'http://127.0.0.1:' + port,
        stop: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

function listNpmTestScripts() {
  const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND, 'package.json'), 'utf8'));
  return Object.keys(pkg.scripts || {})
    .filter((k) => k.startsWith('test:') && k !== 'test:all')
    .sort();
}

function runNpm(script, envExtra) {
  return new Promise((resolve) => {
    console.log('\n════════ npm run ' + script + ' ════════');
    const child = spawn('npm', ['run', script], {
      cwd: BACKEND,
      env: Object.assign({}, process.env, envExtra || {}),
      stdio: 'inherit',
    });
    child.on('exit', (code, signal) => {
      resolve({ script, code: code == null ? (signal ? 1 : 0) : code });
    });
  });
}

function runNode(relFromRoot, envExtra) {
  return new Promise((resolve) => {
    const abs = path.join(ROOT, relFromRoot);
    console.log('\n════════ node ' + relFromRoot + ' ════════');
    const child = spawn(process.execPath, [abs], {
      cwd: ROOT,
      env: Object.assign({}, process.env, envExtra || {}),
      stdio: 'inherit',
    });
    child.on('exit', (code, signal) => {
      resolve({ script: relFromRoot, code: code == null ? (signal ? 1 : 0) : code });
    });
  });
}

async function main() {
  console.log('[test:all] bootstrap starting…');
  ensureGatePassword();
  if (!ensurePlaywright()) {
    process.exit(2);
  }

  const staticSrv = await startStaticServer();
  process.env.BASE_URL = staticSrv.base;
  process.env.STATIC_BASE_URL = staticSrv.base;

  const results = [];
  const scripts = listNpmTestScripts();
  console.log('[test:all] npm test scripts:', scripts.length);

  const childEnv = {
    BASE_URL: staticSrv.base,
    STATIC_BASE_URL: staticSrv.base,
    JOURNEY_BASE: staticSrv.base,
    RIZQ_BASE: staticSrv.base,
    ADMIN_PANEL_GATE_KEY: process.env.ADMIN_PANEL_GATE_KEY,
    SENTINEL_DB_PASSWORD: process.env.SENTINEL_DB_PASSWORD,
    RIZQ_SENTINEL_PASSWORD: process.env.RIZQ_SENTINEL_PASSWORD,
  };
  for (const script of scripts) {
    results.push(await runNpm(script, childEnv));
  }

  /* واجهة / CLS تعتمد على Playwright + خادم ستاتيكي */
  const uiTests = [
    'qa/cls-1/test-sw-cache-bump.js',
    'qa/cls-1/test-store-links.js',
  ];
  for (const rel of uiTests) {
    if (!fs.existsSync(path.join(ROOT, rel))) continue;
    results.push(await runNode(rel, childEnv));
  }

  await staticSrv.stop();

  try {
    const { cleanupTestUploads } = require('./_cleanupTestUploads');
    const cleaned = cleanupTestUploads({ verbose: true });
    console.log('[test:all] cleaned test uploads:', cleaned.removed.length);
  } catch (eClean) {
    console.warn('[test:all] upload cleanup:', eClean.message);
  }

  const failed = results.filter((r) => r.code !== 0);
  console.log('\n════════ test:all summary ════════');
  results.forEach((r) => {
    console.log((r.code === 0 ? '  ✓ ' : '  ✗ ') + r.script + (r.code ? ' (exit ' + r.code + ')' : ''));
  });
  console.log(failed.length
    ? '\nFAILED ' + failed.length + ' / ' + results.length
    : '\nALL OK / ' + results.length);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
