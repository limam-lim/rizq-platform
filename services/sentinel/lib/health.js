/**
 * فحوص الصحة — كل 5 دقائق.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const http = require('http');
const { cfg } = require('./config');
const store = require('./store');
const alerts = require('./alerts');

function fetchStatus(url, timeoutMs) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    try {
      const u = new URL(url);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: u.pathname + u.search,
          method: 'GET',
          timeout: timeoutMs || 8000,
          headers: { 'User-Agent': 'rizq-sentinel/1.0', Accept: '*/*' },
          rejectUnauthorized: process.env.SENTINEL_TLS_INSECURE === '1' ? false : true,
        },
        (res) => {
          res.resume();
          done({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, ms: Date.now() - t0, url });
        }
      );
      req.on('timeout', () => {
        req.destroy();
        done({ ok: false, status: 0, ms: Date.now() - t0, url, error: 'timeout' });
      });
      req.on('error', (e) => done({ ok: false, status: 0, ms: Date.now() - t0, url, error: e.message }));
      req.end();
    } catch (e) {
      done({ ok: false, status: 0, ms: Date.now() - t0, url, error: e.message });
    }
  });
}

function diskUsagePct(mountPath) {
  try {
    const { spawnSync } = require('child_process');
    const r = spawnSync('df', ['-P', mountPath || '/'], { encoding: 'utf8' });
    if (r.status !== 0) return null;
    const lines = String(r.stdout || '').trim().split(/\n/);
    if (lines.length < 2) return null;
    const parts = lines[1].trim().split(/\s+/);
    const pct = String(parts[4] || '').replace('%', '');
    const n = Number(pct);
    return Number.isFinite(n) ? n : null;
  } catch (_) {
    return null;
  }
}

function memInfo() {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    totalMb: Math.round(total / 1024 / 1024),
    freeMb: Math.round(free / 1024 / 1024),
    usedPct: total ? Math.round(((total - free) / total) * 100) : null,
  };
}

function cpuLoad() {
  const l = os.loadavg();
  return { load1: l[0], load5: l[1], load15: l[2], cpus: os.cpus().length };
}

function latestBackupAgeHours(backupDir) {
  const roots = [
    backupDir,
    path.join(backupDir, 'daily'),
    path.join(backupDir, 'weekly'),
  ];
  let newest = 0;
  for (const dir of roots) {
    if (!fs.existsSync(dir)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(dir);
    } catch (_) {
      continue;
    }
    for (const name of entries) {
      if (name === 'daily' || name === 'weekly' || name === 'cron.log') continue;
      try {
        const st = fs.statSync(path.join(dir, name));
        if (st.isFile() && st.mtimeMs > newest) newest = st.mtimeMs;
      } catch (_) { /* */ }
    }
  }
  if (!newest) return { hours: null, mtime: null };
  return { hours: (Date.now() - newest) / 3600000, mtime: new Date(newest).toISOString() };
}

function parseCaddy5xxRatio(logPath, windowMs) {
  windowMs = windowMs || 15 * 60 * 1000;
  if (!logPath || !fs.existsSync(logPath)) return { ratio: null, total: 0, s5xx: 0 };
  try {
    const { spawnSync } = require('child_process');
    // آخر ~2000 سطر تقريباً
    const r = spawnSync('tail', ['-n', '2000', logPath], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    const lines = String(r.stdout || '').split(/\n/).filter(Boolean);
    const since = Date.now() - windowMs;
    let total = 0;
    let s5xx = 0;
    for (const line of lines) {
      let status = 0;
      let ts = 0;
      try {
        if (line.trim().startsWith('{')) {
          const j = JSON.parse(line);
          status = Number(j.status || j.status_code || (j.response && j.response.status) || 0);
          const t = j.ts || j.timestamp || j.time;
          ts = t ? (typeof t === 'number' ? (t < 1e12 ? t * 1000 : t) : Date.parse(t)) : Date.now();
        } else {
          const m = line.match(/\s(5\d\d)\s/);
          if (m) status = Number(m[1]);
          else {
            const m2 = line.match(/\s([1-5]\d\d)\s/);
            if (m2) status = Number(m2[1]);
          }
          ts = Date.now();
        }
      } catch (_) {
        continue;
      }
      if (!status) continue;
      if (ts && ts < since) continue;
      total += 1;
      if (status >= 500 && status <= 599) s5xx += 1;
    }
    return { ratio: total ? s5xx / total : 0, total, s5xx };
  } catch (_) {
    return { ratio: null, total: 0, s5xx: 0 };
  }
}

function sslDaysRemaining(hostname) {
  return new Promise((resolve) => {
    try {
      const host = String(hostname || '').replace(/^https?:\/\//, '').split('/')[0];
      if (!host) return resolve(null);
      const socket = tlsConnect(host, (days) => resolve(days));
      if (!socket) resolve(null);
    } catch (_) {
      resolve(null);
    }
  });
}

function tlsConnect(host, cb) {
  try {
    const sock = tls().connect(
      { host, port: 443, servername: host, rejectUnauthorized: false, timeout: 8000 },
      () => {
        try {
          const cert = sock.getPeerCertificate();
          sock.end();
          if (!cert || !cert.valid_to) return cb(null);
          const exp = Date.parse(cert.valid_to);
          if (!exp) return cb(null);
          cb(Math.floor((exp - Date.now()) / 86400000));
        } catch (e) {
          try { sock.destroy(); } catch (_) { /* */ }
          cb(null);
        }
      }
    );
    sock.on('error', () => cb(null));
    sock.on('timeout', () => {
      try { sock.destroy(); } catch (_) { /* */ }
      cb(null);
    });
    return sock;
  } catch (_) {
    return null;
  }
}

function tls() {
  return require('tls');
}

async function runHealthCheck(telegram) {
  const c = cfg();
  const pages = [
    '/health',
    '/',
    '/rizq_landing_v8.html',
    '/rizq_browse.html',
    '/rizq_products.html',
    '/api/ads?limit=1',
    '/api/accounts?limit=1',
  ];
  const checks = [];
  for (const p of pages) {
    const target = p === '/health'
      ? c.backendBase + '/health'
      : (p.startsWith('/api') ? c.backendBase + p : c.publicBase + (p === '/' ? '/' : p));
    checks.push(await fetchStatus(target, 10000));
  }

  const healthOk = checks.find((x) => x.url && x.url.endsWith('/health'));
  const disk = diskUsagePct('/');
  const mem = memInfo();
  const cpu = cpuLoad();
  const backup = latestBackupAgeHours(c.backupDbDir);
  const five = parseCaddy5xxRatio(c.caddyAccessLog);
  let sslDays = null;
  try {
    const host = new URL(c.publicBase).hostname;
    sslDays = await sslDaysRemaining(host);
  } catch (_) { /* */ }

  let domainDays = null;
  if (c.domainExpiry) {
    const exp = Date.parse(c.domainExpiry);
    if (exp) domainDays = Math.floor((exp - Date.now()) / 86400000);
  }

  const snapshot = {
    at: new Date().toISOString(),
    checks,
    diskPct: disk,
    mem,
    cpu,
    backupAgeHours: backup.hours,
    backupMtime: backup.mtime,
    fiveXxRatio: five.ratio,
    fiveXx: five,
    sslDays,
    domainDays,
  };

  await store.insertEvent({
    kind: 'health_snapshot',
    severity: 'info',
    summary: 'فحص صحة'
      + (healthOk && healthOk.ok ? ' — الخادم OK' : ' — خلل في /health')
      + (disk != null ? ' — قرص ' + disk + '%' : ''),
    payload: snapshot,
  });

  // تنبيهات
  if (!healthOk || !healthOk.ok) {
    await alerts.notifyCritical(telegram, 'server_down', 'الخادم أو القاعدة متوقفان (/health فشل)');
  } else {
    await alerts.notifyRecovered(telegram, 'server_down', 'عاد الخادم للعمل (/health)');
  }

  if (five.ratio != null && five.total >= 20 && five.ratio > 0.05) {
    await alerts.notifyCritical(
      telegram,
      'five_xx',
      'نسبة 5xx مرتفعة: ' + Math.round(five.ratio * 100) + '% (' + five.s5xx + '/' + five.total + ')'
    );
  } else if (five.ratio != null && five.ratio <= 0.05) {
    await alerts.notifyRecovered(telegram, 'five_xx', 'عادت نسبة 5xx إلى وضع طبيعي');
  }

  if (backup.hours != null && backup.hours > c.backupMaxAgeHours) {
    await alerts.notifyCritical(
      telegram,
      'backup_stale',
      'نسخة احتياطية متأخرة: عمرها ' + backup.hours.toFixed(1) + ' ساعة (حد ' + c.backupMaxAgeHours + ')'
    );
  } else if (backup.hours != null && backup.hours <= c.backupMaxAgeHours) {
    await alerts.notifyRecovered(telegram, 'backup_stale', 'عادت النسخ الاحتياطية ضمن المهلة');
  }

  if (disk != null && disk >= c.diskAlertPct) {
    await alerts.notifyCritical(telegram, 'disk_full', 'القرص ممتلئ: ' + disk + '% (حد ' + c.diskAlertPct + '%)');
  } else if (disk != null && disk < c.diskAlertPct) {
    await alerts.notifyRecovered(telegram, 'disk_full', 'عادت مساحة القرص إلى وضع مقبول');
  }

  if (sslDays != null && sslDays < c.sslAlertDays) {
    await alerts.notifyCritical(telegram, 'ssl_expiring', 'SSL ينتهي خلال ' + sslDays + ' يوماً');
  } else if (sslDays != null && sslDays >= c.sslAlertDays) {
    await alerts.notifyRecovered(telegram, 'ssl_expiring', 'شهادة SSL ضمن المهلة الآمنة');
  }

  return snapshot;
}

module.exports = {
  runHealthCheck,
  fetchStatus,
  diskUsagePct,
  memInfo,
  cpuLoad,
  latestBackupAgeHours,
  parseCaddy5xxRatio,
  sslDaysRemaining,
};
