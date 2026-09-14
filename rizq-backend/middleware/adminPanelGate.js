/**
 * بوابة إخفاء لوحة الأدمن — مسار سري + مفتاح بوابة + قائمة IP اختيارية
 *
 * المتغيرات (.env):
 *   ADMIN_PANEL_PATH       — مسار سري (مثال: cp-k8m2x9q4r7) — مطلوب في الإنتاج
 *   ADMIN_PANEL_GATE_KEY   — مفتاح ?k=... لأول زيارة (يُوصى به في الإنتاج)
 *   ADMIN_PANEL_IP_ALLOWLIST — IPs مسموحة (اختياري، مفصول بفاصلة)
 *   ADMIN_PANEL_BLOCK_LEGACY — 1 لحظر /rizq_admin.html (افتراضي في الإنتاج)
 */
const crypto = require('crypto');
const path = require('path');

const COOKIE_NAME = 'rizq_admin_gate';
const GATE_TTL_MS = 24 * 60 * 60 * 1000;
const LEGACY_PATHS = new Set([
  '/rizq_admin.html',
  '/rizq_admin',
  '/admin.html',
  '/admin',
  '/wp-admin',
  '/wp-login.php',
]);

function isProdEnv() {
  return process.env.NODE_ENV === 'production' || process.env.RIZQ_ENV === 'production';
}

function normalizePanelPath(raw) {
  return String(raw || '').trim().replace(/^\/+|\/+$/g, '');
}

function getAdminPanelPath() {
  const configured = normalizePanelPath(process.env.ADMIN_PANEL_PATH);
  if (configured) return configured;
  if (!isProdEnv()) return 'dev-cp-local';
  return '';
}

function getGateKey() {
  return String(process.env.ADMIN_PANEL_GATE_KEY || '').trim();
}

function shouldBlockLegacy() {
  if (process.env.ADMIN_PANEL_BLOCK_LEGACY === '0') return false;
  if (process.env.ADMIN_PANEL_BLOCK_LEGACY === '1') return true;
  return isProdEnv();
}

function parseCookies(req) {
  const out = {};
  const h = req.header('cookie') || '';
  h.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
  });
  return out;
}

function clientIp(req) {
  const fwd = req.header('x-forwarded-for');
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}

function ipAllowed(req) {
  const raw = String(process.env.ADMIN_PANEL_IP_ALLOWLIST || '').trim();
  if (!raw) return true;
  const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const ip = clientIp(req);
  return allowed.some((a) => ip === a || ip.endsWith(a));
}

function gateSecret() {
  return process.env.ADMIN_PANEL_GATE_KEY
    || process.env.BACKEND_SHARED_SECRET
    || 'rizq-admin-gate-dev-only';
}

function signGateCookie() {
  const exp = Date.now() + GATE_TTL_MS;
  const sig = crypto.createHmac('sha256', gateSecret()).update(String(exp)).digest('hex');
  return exp + '.' + sig;
}

function verifyGateCookie(value) {
  const gateKey = getGateKey();
  if (!gateKey) return true;
  const parts = String(value || '').split('.');
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = crypto.createHmac('sha256', gateSecret()).update(String(exp)).digest('hex');
  return parts[1] === expected;
}

function setGateCookie(res) {
  const val = signGateCookie();
  // Lax: يسمح بفتح اللوحة من رابط محفوظ/مدير كلمات سر ويُبقي الحماية من CSRF عبر POST
  // Strict كان يكسر الدخول عند التنقل بين localhost و 127.0.0.1 أو من رابط خارجي
  const bits = [
    COOKIE_NAME + '=' + encodeURIComponent(val),
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=' + Math.floor(GATE_TTL_MS / 1000),
  ];
  if (isProdEnv()) bits.push('Secure');
  res.setHeader('Set-Cookie', bits.join('; '));
}

function sendGateUnlockPage(res, panelPath) {
  const safePath = String(panelPath || '').replace(/[<>&"']/g, '');
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>رزق — فتح لوحة الإدارة</title>
<style>
  :root{--bg:#0f1419;--card:#1a222d;--gold:#c9a84c;--muted:#9aa7b5;--text:#f2f5f8}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:"Segoe UI",Tahoma,Arial,sans-serif;background:radial-gradient(1200px 600px at 70% -10%,#243044 0%,var(--bg) 55%);
    color:var(--text);padding:24px}
  .box{max-width:440px;width:100%;background:var(--card);border:1px solid rgba(201,168,76,.28);
    border-radius:16px;padding:28px 24px;box-shadow:0 18px 50px rgba(0,0,0,.35)}
  h1{margin:0 0 10px;font-size:1.25rem;color:var(--gold)}
  p{margin:0 0 12px;line-height:1.75;color:var(--muted);font-size:.95rem}
  code{display:inline-block;direction:ltr;background:rgba(0,0,0,.35);padding:2px 8px;border-radius:6px;
    color:#e8c96a;font-size:.85rem}
  .tip{margin-top:16px;padding:12px 14px;border-radius:10px;background:rgba(201,168,76,.08);
    border:1px solid rgba(201,168,76,.22);color:#e8d9a8;font-size:.88rem;line-height:1.7}
</style>
</head>
<body>
  <div class="box">
    <h1>يلزم رابط الفتح الكامل</h1>
    <p>لوحة الإدارة محمية بمسار سري. فتح <code>/${safePath}</code> مباشرة بدون مفتاح البوابة لا يعمل — وهذا ليس خطأ في اسم المستخدم أو كلمة المرور.</p>
    <p>استخدم الرابط الكامل المحفوظ لديك والذي ينتهي بـ <code>?k=...</code> (من مدير كلمات السر أو رسالة الإعداد الأولى).</p>
    <div class="tip">بعد فتح الرابط مرة واحدة تبقى الجلسة مفعّلة ليوم واحد على نفس المضيف (<code>127.0.0.1</code> أو <code>localhost</code> — اختر أحدهما وثبّت عليه).</div>
  </div>
</body>
</html>`;
  res.status(401).type('html').send(html);
}

function installAdminPanelGate(app, frontendRoot) {
  const panelPath = getAdminPanelPath();
  const panelFile = path.join(frontendRoot, 'rizq_cp_panel.html');
  const decoyFile = path.join(frontendRoot, 'rizq_admin.html');
  const gateKey = getGateKey();
  const blockLegacy = shouldBlockLegacy();

  app.use((req, res, next) => {
    const p = (req.path || '').toLowerCase();
    // الملف الحقيقي — لا يُخدم أبداً مباشرة (فقط عبر المسار السري)
    if (p === '/rizq_cp_panel.html' || p === '/rizq_cp_panel') {
      return res.status(404).send('Not Found');
    }
    if (blockLegacy && LEGACY_PATHS.has(p)) {
      if (fsExists(decoyFile)) return res.status(404).sendFile(decoyFile);
      return res.status(404).send('Not Found');
    }
    next();
  });

  if (!panelPath) {
    if (isProdEnv()) {
      console.warn('[admin-panel] ADMIN_PANEL_PATH غير مضبوط — لوحة الأدمن غير متاحة عبر HTTP');
    }
    return { panelPath: null, url: null };
  }

  const servePanel = (req, res) => {
    if (!ipAllowed(req)) return res.status(404).send('Not Found');

    if (gateKey) {
      const qk = req.query && req.query.k;
      if (qk && qk === gateKey) {
        setGateCookie(res);
        // لا نعيد التوجيه بعد فتح المفتاح: أول زيارة تفتح اللوحة مباشرة
        // حتى لو رفض المتصفح حفظ الكوكي (localhost≠127.0.0.1 / سياسات صارمة)
        return res.sendFile(panelFile);
      }
      const cookies = parseCookies(req);
      if (!verifyGateCookie(cookies[COOKIE_NAME])) {
        return sendGateUnlockPage(res, panelPath);
      }
    }

    return res.sendFile(panelFile);
  };

  app.get('/' + panelPath, servePanel);
  app.get('/' + panelPath + '/', servePanel);

  const base = process.env.PUBLIC_BASE_URL || ('http://localhost:' + (process.env.PORT || 3000));
  const url = base.replace(/\/$/, '') + '/' + panelPath + (gateKey ? '?k=' + gateKey : '');

  console.log('[admin-panel] مسار لوحة الأدمن السري: /' + panelPath);
  if (gateKey) {
    console.log('[admin-panel] رابط الدخول الكامل (احفظه في مدير كلمات السر — لا تشاركه):');
    console.log('[admin-panel] ' + url);
  } else if (isProdEnv()) {
    console.warn('[admin-panel] يُنصح بضبط ADMIN_PANEL_GATE_KEY في الإنتاج');
  }

  return { panelPath, url };
}

function fsExists(f) {
  try { return require('fs').existsSync(f); } catch (e) { return false; }
}

module.exports = {
  installAdminPanelGate,
  getAdminPanelPath,
  getGateKey,
  isProdEnv,
  LEGACY_PATHS,
};
