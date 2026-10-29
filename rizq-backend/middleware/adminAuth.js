/**
 * مصادقة الأدمن — جلسة x-admin-token (المتصفح) أو سرّ خادمي (سكربتات فقط)
 * + فحص صلاحيات الدور (RBAC)
 * adminSessions API is async (PostgreSQL).
 */
const { timingSafeEqualStr } = require('../lib/secureCompare');
const { isProdEnv } = require('./accountAuth');

function createAdminAuth(deps) {
  const adminSessions = deps.adminSessions;
  const sharedSecret = () => process.env.BACKEND_SHARED_SECRET || '';
  const hasAdminPermission = deps.hasAdminPermission || (() => true);

  async function requireAdminSession(req, res, next) {
    try {
      const token = req.header('x-admin-token');
      const sess = token ? await adminSessions.get(token) : undefined;
      if (!sess || sess.expiresAt < Date.now()) {
        if (token) await adminSessions.delete(token);
        return res.status(401).json({ error: 'session_expired' });
      }
      req.adminUser = sess;
      next();
    } catch (err) {
      next(err);
    }
  }

  function isBrowserOrigin(req) {
    const origin = req.header('origin');
    if (origin && origin !== 'null') return true;
    const secFetchSite = String(req.header('sec-fetch-site') || '').toLowerCase();
    return secFetchSite === 'same-origin' || secFetchSite === 'same-site' || secFetchSite === 'cross-site';
  }

  /** للوحة الأدmin + السكربتات الخلفية — لا يُخزَّن السر في المتصفح */
  async function requireAdminAuth(req, res, next) {
    try {
      const adminTok = req.header('x-admin-token');
      if (adminTok) {
        const sess = await adminSessions.get(adminTok);
        if (sess && sess.expiresAt >= Date.now()) {
          req.adminUser = sess;
          return next();
        }
        await adminSessions.delete(adminTok);
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
    } catch (err) {
      next(err);
    }
  }

  /** يتطلب صلاحية (أو *) بعد requireAdminAuth */
  function requireAdminPermission(...required) {
    return async (req, res, next) => {
      try {
        await new Promise((resolve, reject) => {
          requireAdminAuth(req, res, (err) => (err ? reject(err) : resolve())); // await-ok: callback-style, errors go to next(err)
        });
        if (res.headersSent) return;
        const perms = (req.adminUser && req.adminUser.permissions) || [];
        if (hasAdminPermission(perms, required.length ? required : ['*'])) return next();
        return res.status(403).json({
          error: 'admin_forbidden',
          msg: 'ليس لديك صلاحية لهذا الإجراء',
          msg_fr: 'Permission insuffisante pour cette action',
          required,
        });
      } catch (err) {
        next(err);
      }
    };
  }

  /** سوبر أدمن فقط — خزنة المفاتيح وغيرها */
  async function requireSuperAdmin(req, res, next) {
    try {
      await new Promise((resolve, reject) => {
        requireAdminAuth(req, res, (err) => (err ? reject(err) : resolve())); // await-ok: callback-style, errors go to next(err)
      });
      if (res.headersSent) return;
      const perms = (req.adminUser && req.adminUser.permissions) || [];
      const role = req.adminUser && req.adminUser.role;
      if (perms.includes('*') || role === 'super') return next();
      return res.status(403).json({
        error: 'super_only',
        msg: 'هذا القسم للسوبر أدمن فقط',
        msg_fr: 'Réservé au Super Admin',
      });
    } catch (err) {
      next(err);
    }
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

  return { requireAdminSession, requireAdminAuth, requireAdminPermission, requireSuperAdmin, requireSharedSecret };
}

module.exports = { createAdminAuth };
