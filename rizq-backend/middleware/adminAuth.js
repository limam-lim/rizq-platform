/**
 * مصادقة الأدمن — جلسة x-admin-token (المتصفح) أو سرّ خادمي (سكربتات فقط)
 * + فحص صلاحيات الدور (RBAC)
 */
const { timingSafeEqualStr } = require('../lib/secureCompare');
const { isProdEnv } = require('./accountAuth');

function createAdminAuth(deps) {
  const adminSessions = deps.adminSessions;
  const sharedSecret = () => process.env.BACKEND_SHARED_SECRET || '';
  const hasAdminPermission = deps.hasAdminPermission || (() => true);

  function requireAdminSession(req, res, next) {
    const token = req.header('x-admin-token');
    const sess = token && adminSessions.get(token);
    if (!sess || sess.expiresAt < Date.now()) {
      if (token) adminSessions.delete(token);
      return res.status(401).json({ error: 'session_expired' });
    }
    req.adminUser = sess;
    next();
  }

  function isBrowserOrigin(req) {
    const origin = req.header('origin');
    if (origin && origin !== 'null') return true;
    const secFetchSite = String(req.header('sec-fetch-site') || '').toLowerCase();
    return secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'cross-site';
  }

  /** للوحة الأدmin + السكربتات الخلفية — لا يُخزَّن السر في المتصفح */
  function requireAdminAuth(req, res, next) {
    const adminTok = req.header('x-admin-token');
    if (adminTok) {
      const sess = adminSessions.get(adminTok);
      if (sess && sess.expiresAt >= Date.now()) {
        req.adminUser = sess;
        return next();
      }
      adminSessions.delete(adminTok);
    }
    const got = req.header('x-rizq-secret');
    const secret = sharedSecret();
    if (secret && got && timingSafeEqualStr(got, secret)) {
      if (isProdEnv() && isBrowserOrigin(req)) {
        return res.status(403).json({ error: 'server_secret_browser_forbidden' });
      }
      req.adminUser = { user: 'server', name: 'Server', role: 'super', permissions: ['*'] };
      return next();
    }
    return res.status(401).json({ error: 'unauthorized' });
  }

  /** يتطلب صلاحية (أو *) بعد requireAdminAuth */
  function requireAdminPermission(...required) {
    return (req, res, next) => {
      requireAdminAuth(req, res, () => {
        const perms = (req.adminUser && req.adminUser.permissions) || [];
        if (hasAdminPermission(perms, required.length ? required : ['*'])) return next();
        return res.status(403).json({
          error: 'admin_forbidden',
          msg: 'ليس لديك صلاحية لهذا الإجراء',
          msg_fr: 'Permission insuffisante pour cette action',
          required,
        });
      });
    };
  }

  /** سرّ خادمي فقط — لا يُقبل من المتصفح في الإنتاج */
  function requireSharedSecret(req, res, next) {
    const got = req.header('x-rizq-secret');
    const secret = sharedSecret();
    if (!secret || !got || !timingSafeEqualStr(got, secret)) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (isProdEnv() && isBrowserOrigin(req)) {
      return res.status(403).json({ error: 'server_secret_browser_forbidden' });
    }
    next();
  }

  return { requireAdminSession, requireAdminAuth, requireAdminPermission, requireSharedSecret };
}

module.exports = { createAdminAuth };
