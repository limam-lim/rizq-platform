/**
 * مصادقة الأدمن — جلسة x-admin-token (المتصفح) أو سرّ خادمي (سكربتات فقط)
 */
function createAdminAuth(deps) {
  const adminSessions = deps.adminSessions;
  const sharedSecret = () => process.env.BACKEND_SHARED_SECRET || '';

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

  /** للوحة الأدمن + السكربتات الخلفية — لا يُخزَّن السر في المتصفح */
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
    if (secret && got && got === secret) {
      req.adminUser = { user: 'server', name: 'Server', role: 'super' };
      return next();
    }
    return res.status(401).json({ error: 'unauthorized' });
  }

  /** سرّ خادمي فقط — لا يُقبل من المتصفح في الإنتاج */
  function requireSharedSecret(req, res, next) {
    const got = req.header('x-rizq-secret');
    const secret = sharedSecret();
    if (!secret || got !== secret) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    next();
  }

  return { requireAdminSession, requireAdminAuth, requireSharedSecret };
}

module.exports = { createAdminAuth };
