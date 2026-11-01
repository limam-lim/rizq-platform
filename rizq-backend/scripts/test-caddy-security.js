/**
 * التحقق من Caddyfile: validate + تشغيل محلي + curl
 * لا يحتاج قاعدة بيانات. يشغَّل من test-ops-1 أو مباشرة:
 *   node rizq-backend/scripts/test-caddy-security.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const CADDYFILE_PROD = path.join(ROOT, 'deploy', 'hetzner', 'Caddyfile');
const WORK = path.join('/tmp', 'rizq-caddy-sec-' + process.pid);
const CADDY_BIN_DIR = path.join(WORK, 'bin');
const LOCAL_CADDYFILE = path.join(WORK, 'Caddyfile.local');
let CADDY_PORT = 0;
let NODE_PORT = 0;

let failed = 0;
function ok(cond, msg, detail) {
  if (!cond) {
    failed += 1;
    console.error('FAIL:', msg, detail || '');
  } else {
    console.log('OK:', msg, detail || '');
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function findCaddy() {
  const which = spawnSync('bash', ['-lc', 'command -v caddy || true'], { encoding: 'utf8' });
  const p = String(which.stdout || '').trim();
  if (p && fs.existsSync(p)) return p;
  const local = path.join(CADDY_BIN_DIR, 'caddy');
  if (fs.existsSync(local)) return local;
  return null;
}

function installCaddy() {
  ensureDir(CADDY_BIN_DIR);
  const url = 'https://github.com/caddyserver/caddy/releases/download/v2.8.4/caddy_2.8.4_linux_amd64.tar.gz';
  const tar = path.join(WORK, 'caddy.tgz');
  const dl = spawnSync('curl', ['-fsSL', '-o', tar, url], { encoding: 'utf8' });
  if (dl.status !== 0) {
    throw new Error('caddy download failed: ' + (dl.stderr || dl.stdout || ''));
  }
  const ex = spawnSync('tar', ['-xzf', tar, '-C', CADDY_BIN_DIR, 'caddy'], { encoding: 'utf8' });
  if (ex.status !== 0) {
    throw new Error('caddy extract failed: ' + (ex.stderr || ''));
  }
  fs.chmodSync(path.join(CADDY_BIN_DIR, 'caddy'), 0o755);
  return path.join(CADDY_BIN_DIR, 'caddy');
}

function writeLocalCaddyfile() {
  /* نفس منطق الإنتاج على HTTP محلي — جذر المستودع */
  const body = `
{
	auto_https off
	admin off
}

(security_headers) {
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "camera=(), microphone=(), geolocation=(self), payment=(), usb=()"
		Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; frame-src 'self' https://www.openstreetmap.org https://openstreetmap.org; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; connect-src 'self' https: wss:;"
		Cross-Origin-Opener-Policy "same-origin"
		Cross-Origin-Resource-Policy "same-site"
		X-DNS-Prefetch-Control "off"
		-Server
	}
}

:${CADDY_PORT} {
	import security_headers
	encode gzip zstd
	root * ${ROOT}

	route {
		@blocked {
			path /.env /.env.* /.git* /.cursor* /.github*
			path /node_modules /node_modules/*
			path /rizq-backend /rizq-backend/*
			path /backups /backups/* /deploy /deploy/* /scripts /scripts/*
			path /qa /qa/* /docs /docs/* /migrations /migrations/*
			path /data /data/* /rizq-backend/data /rizq-backend/data/*
			path /package.json /package-lock.json
			path /docker-compose.yml /docker-compose.dev.yml /render.yaml
			path *.pem *.key *.sql *.sql.gz *.enc *.sh *.bat *.ps1
			path *.md *.yml *.yaml *.log *.sqlite *.db
		}
		handle @blocked {
			respond 404
		}

		handle /api/* {
			reverse_proxy 127.0.0.1:${NODE_PORT}
		}
		handle /uploads/* {
			reverse_proxy 127.0.0.1:${NODE_PORT}
		}
		handle /health {
			reverse_proxy 127.0.0.1:${NODE_PORT}
		}

		@publicFiles {
			path /
			path /*.html
			path /rizq_*.js
			path /rizq_*.css
			path /rizq-theme.css
			path /sw.js
			path /favicon.ico /favicon.svg /favicon-*.png /apple-touch-icon.png
			path /manifest.json /robots.txt /sitemap.xml
			path /rizq-assets /rizq-assets/*
			path /help-images /help-images/*
			path /vendor /vendor/*
		}
		handle @publicFiles {
			file_server
		}

		handle {
			rewrite * /rizq_landing_v8.html
			file_server
		}
	}
}
`;
  fs.writeFileSync(LOCAL_CADDYFILE, body.trim() + '\n', 'utf8');
}

function listenFree(server, host) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => {
      const addr = server.address();
      resolve(addr && addr.port ? addr.port : 0);
    });
  });
}

function startMockNode() {
  /* عملية منفصلة — spawnSync(curl) يجمّد حلقة الأحداث إن كان الوهم في نفس العملية */
  const script = path.join(WORK, 'mock-node.js');
  fs.writeFileSync(script, `
const http = require('http');
const server = http.createServer((req, res) => {
  const url = req.url || '/';
  if (url.startsWith('/api/')) {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, via: 'node', path: url }));
    return;
  }
  if (url.startsWith('/uploads/')) {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('upload-via-node:' + url);
    return;
  }
  if (url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end('no');
});
server.listen(0, '127.0.0.1', () => {
  process.stdout.write('PORT=' + server.address().port + '\\n');
});
`, 'utf8');
  const child = spawn(process.execPath, [script], { stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    let out = '';
    const timer = setTimeout(() => reject(new Error('mock node start timeout')), 5000);
    child.stdout.on('data', (d) => {
      out += d.toString();
      const m = out.match(/PORT=(\d+)/);
      if (m) {
        clearTimeout(timer);
        NODE_PORT = Number(m[1]);
        resolve(child);
      }
    });
    child.stderr.on('data', (d) => { out += d.toString(); });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('exit', (code) => {
      if (!NODE_PORT) {
        clearTimeout(timer);
        reject(new Error('mock node exited early code=' + code + ' out=' + out));
      }
    });
  });
}

function curl(pathname) {
  const url = 'http://127.0.0.1:' + CADDY_PORT + pathname;
  const hdrFile = path.join(WORK, 'hdr.txt');
  const bodyFile = path.join(WORK, 'body.bin');
  try { fs.unlinkSync(hdrFile); } catch (e) { /* */ }
  try { fs.unlinkSync(bodyFile); } catch (e) { /* */ }
  const r = spawnSync(
    'curl',
    ['-sS', '-D', hdrFile, '-o', bodyFile, '-w', '%{http_code}', '--max-time', '5', url],
    { encoding: 'utf8' }
  );
  const status = Number(String(r.stdout || '').trim()) || 0;
  const raw = fs.existsSync(hdrFile) ? fs.readFileSync(hdrFile, 'utf8') : '';
  const headers = {};
  raw.split(/\r?\n/).forEach((line) => {
    const i = line.indexOf(':');
    if (i > 0) {
      headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    }
  });
  let body = '';
  try {
    body = fs.readFileSync(bodyFile, 'utf8');
  } catch (e) {
    body = '';
  }
  return { status, headers, body, raw, exit: r.status, stderr: String(r.stderr || '') };
}

function waitPort(port, ms) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const r = spawnSync('bash', ['-lc', 'exec 3<>/dev/tcp/127.0.0.1/' + port], { encoding: 'utf8' });
    if (r.status === 0) return true;
    spawnSync('sleep', ['0.1']);
  }
  return false;
}

async function main() {
  ensureDir(WORK);
  ok(fs.existsSync(CADDYFILE_PROD), 'production Caddyfile exists');

  const prodSrc = fs.readFileSync(CADDYFILE_PROD, 'utf8');
  ok(/route\s*\{/.test(prodSrc), 'Caddyfile uses route for ordered handlers');
  ok(/handle @blocked\s*\{[\s\S]*?respond 404/.test(prodSrc), 'blocked paths use handle+respond inside route');
  ok(/path \/rizq-backend/.test(prodSrc), 'blocks /rizq-backend');
  ok(/Content-Security-Policy/.test(prodSrc), 'CSP header present');
  ok(/Permissions-Policy "camera=\(\), microphone=\(\), geolocation=\(self\), payment=\(\), usb=\(\)"/.test(prodSrc),
    'Permissions-Policy matches server.js');
  ok(/frame-ancestors 'none'/.test(prodSrc), 'CSP frame-ancestors none (prod)');
  ok(!/path \*\.js/.test(prodSrc) || /@publicFiles[\s\S]*rizq_\*\.js/.test(prodSrc),
    'no blanket *.js public matcher (whitelist rizq_*.js)');

  let caddy = findCaddy();
  if (!caddy) {
    console.log('Installing caddy binary to', CADDY_BIN_DIR);
    caddy = installCaddy();
  }
  ok(!!caddy && fs.existsSync(caddy), 'caddy binary available', caddy);

  const validate = spawnSync(caddy, ['validate', '--config', CADDYFILE_PROD, '--adapter', 'caddyfile'], {
    encoding: 'utf8',
    env: Object.assign({}, process.env, { CADDY_ACME_EMAIL: 'ops@rizq.mr' }),
  });
  ok(validate.status === 0, 'caddy validate production Caddyfile',
    (validate.stderr || validate.stdout || '').slice(-400));

  const mock = await startMockNode();
  ok(NODE_PORT > 0, 'mock Node listening', 'port=' + NODE_PORT);

  /* منفذ Caddy حر عبر خادم مؤقت */
  const probe = http.createServer();
  CADDY_PORT = await listenFree(probe, '127.0.0.1');
  await new Promise((resolve) => probe.close(resolve));
  ok(CADDY_PORT > 0, 'caddy port reserved', 'port=' + CADDY_PORT);

  writeLocalCaddyfile();
  const validateLocal = spawnSync(caddy, ['validate', '--config', LOCAL_CADDYFILE, '--adapter', 'caddyfile'], {
    encoding: 'utf8',
  });
  ok(validateLocal.status === 0, 'caddy validate local test Caddyfile',
    (validateLocal.stderr || validateLocal.stdout || '').slice(-400));

  const caddyProc = spawn(caddy, ['run', '--config', LOCAL_CADDYFILE, '--adapter', 'caddyfile'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let caddyLog = '';
  caddyProc.stdout.on('data', (d) => { caddyLog += d.toString(); });
  caddyProc.stderr.on('data', (d) => { caddyLog += d.toString(); });

  try {
    ok(waitPort(CADDY_PORT, 8000), 'caddy listening on ' + CADDY_PORT, caddyLog.slice(-300));

    const must404 = [
      '/rizq-backend/server.js',
      '/rizq-backend/routes/ads.js',
      '/.env',
      '/scripts/backup-db.sh',
      '/qa/FIXES-OPS-1.md',
      '/deploy/hetzner/Caddyfile',
    ];
    must404.forEach((p) => {
      const r = curl(p);
      ok(r.status === 404, p + ' → 404', 'status=' + r.status);
    });

    const landing = curl('/rizq_landing_v8.html');
    ok(landing.status === 200, '/rizq_landing_v8.html → 200', 'status=' + landing.status);
    ok(!!landing.headers['content-security-policy'], '/rizq_landing_v8.html has CSP',
      landing.headers['content-security-policy'] ? 'present' : 'missing');
    ok(
      /frame-ancestors 'none'/.test(landing.headers['content-security-policy'] || ''),
      'landing CSP includes frame-ancestors none'
    );

    const cards = curl('/rizq_ad_cards.js');
    ok(cards.status === 200, '/rizq_ad_cards.js → 200', 'status=' + cards.status);
    ok(!!cards.headers['content-security-policy'], '/rizq_ad_cards.js has CSP');
    ok(
      /geolocation=\(self\)/.test(cards.headers['permissions-policy'] || ''),
      '/rizq_ad_cards.js Permissions-Policy matches server.js'
    );

    const direct = spawnSync('curl', ['-sS', '--max-time', '3', 'http://127.0.0.1:' + NODE_PORT + '/api/ads'], {
      encoding: 'utf8',
    });
    ok(direct.status === 0 && /"via":"node"/.test(direct.stdout || ''),
      'mock Node /api/ads direct', (direct.stdout || direct.stderr || '').slice(0, 120));

    const api = curl('/api/ads');
    ok(api.status === 200 && /"via":"node"/.test(api.body), '/api/ads proxied to Node',
      'status=' + api.status + ' exit=' + api.exit + ' stderr=' + (api.stderr || '').slice(0, 80)
      + ' body=' + api.body.slice(0, 120));

    const up = curl('/uploads/test-probe.txt');
    ok(up.status === 200 && /upload-via-node:/.test(up.body), '/uploads/... proxied to Node',
      'status=' + up.status + ' body=' + up.body.slice(0, 120));
  } finally {
    try { caddyProc.kill('SIGTERM'); } catch (e) { /* */ }
    try { mock.kill('SIGTERM'); } catch (e) { /* */ }
    await new Promise((r) => setTimeout(r, 200));
  }

  if (failed) {
    console.error('\n' + failed + ' assertion(s) failed');
    process.exit(1);
  }
  console.log('\nAll caddy security tests passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
