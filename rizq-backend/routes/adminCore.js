/**
 * مسارات نواة لوحة الإدارة (/api/admin/login|verify|permissions|team|logout|daily-digest).
 * مُستخرجة من server.js للصيانة — نفس العقود والسلوك.
 */
'use strict';

const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountAdminCoreRoutes(app, deps) {
  const {
    requireAdminSession,
    requireAdminAuth,
    requireAdminPermission,
    adminSessions,
    adminTeamService,
    ADMIN_SESSION_TTL_MS,
    PANEL_PERMISSION_MAP,
    readAccounts,
    readAds,
    readSubRequests,
    readAdsRequests,
    readTenders,
    getAllAccountPackageRecords,
    readAuditLog,
    DATA_DIR,
    readLatestBackupMeta,
    backendRootDir,
  } = deps;

  function cleanExpiredAdminSessions() {
    const now = Date.now();
    for (const [tok, sess] of adminSessions) if (sess.expiresAt < now) adminSessions.delete(tok);
  }

  const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'محاولات كثيرة جداً — حاول مرة أخرى بعد قليل' },
  });

  app.post('/api/admin/login', adminLoginLimiter, async (req, res) => {
    cleanExpiredAdminSessions();
    const { user, pass } = req.body || {};
    const u = String(user || '').trim().slice(0, 80);
    const p = String(pass || '').slice(0, 200);
    if (!u || !p) return res.status(400).json({ error: 'يرجى تعبئة الحقلين' });
    if (String(pass || '').length > 200) {
      return res.status(400).json({ error: '❌ بيانات غير صحيحة' });
    }
    let acc = null;
    try {
      acc = await adminTeamService.authenticate(u, p);
    } catch (eAuth) {
      acc = null;
    }
    if (!acc) return res.status(401).json({ error: '❌ بيانات غير صحيحة' });
    adminTeamService.touchLogin(acc.user);
    const token = crypto.randomBytes(32).toString('hex');
    const permissions = adminTeamService.normalizePermissions(acc.permissions);
    adminSessions.set(token, {
      user: acc.user,
      name: acc.name,
      role: acc.legacyRole || 'staff',
      permissions,
      expiresAt: Date.now() + ADMIN_SESSION_TTL_MS,
    });
    res.set('Cache-Control', 'no-store');
    res.json({
      ok: true,
      token,
      name: acc.name,
      role: acc.legacyRole || 'staff',
      permissions,
      user: acc.user,
    });
  });

  app.get('/api/admin/verify', requireAdminSession, (req, res) => {
    res.json({
      ok: true,
      name: req.adminUser.name,
      role: req.adminUser.role,
      permissions: req.adminUser.permissions || [],
      user: req.adminUser.user,
    });
  });

  /** GET /api/admin/permissions — قائمة الصلاحيات + قوالب جاهزة */
  app.get('/api/admin/permissions', requireAdminAuth, (req, res) => {
    res.json({
      ok: true,
      permissions: adminTeamService.PERMISSION_DEFS,
      presets: adminTeamService.PERMISSION_PRESETS,
      panelMap: PANEL_PERMISSION_MAP,
      maxTeamMembers: adminTeamService.MAX_TEAM_MEMBERS,
    });
  });

  /** GET /api/admin/team — فريق الإدارة (يتطلب team.manage أو *) */
  app.get('/api/admin/team', requireAdminPermission('team.manage'), (req, res) => {
    res.json({ ok: true, team: adminTeamService.listTeamPublic(), max: adminTeamService.MAX_TEAM_MEMBERS });
  });

  /** POST /api/admin/team — إضافة عضو */
  app.post('/api/admin/team', requireAdminPermission('team.manage'), async (req, res) => {
    try {
      const b = req.body || {};
      const actorPerms = (req.adminUser && req.adminUser.permissions) || [];
      const member = await adminTeamService.createMember(b, req.adminUser && req.adminUser.user, actorPerms);
      res.json({ ok: true, member });
    } catch (e) {
      if (e.code === 'team_limit_reached') {
        return res.status(400).json({ error: e.code, max: e.max, msg: 'وصلت للحد الأقصى ' + e.max + ' أعضاء' });
      }
      if (e.code === 'user_exists') return res.status(409).json({ error: e.code, msg: 'اسم المستخدم موجود' });
      if (e.code === 'missing_fields') return res.status(400).json({ error: e.code, msg: 'الاسم واسم المستخدم وكلمة المرور مطلوبة' });
      if (e.code === 'cannot_grant_super') return res.status(403).json({ error: e.code, msg: 'منح صلاحية Super يتطلب أن تكون Super Admin' });
      res.status(500).json({ error: 'create_failed' });
    }
  });

  /** PATCH /api/admin/team/:id — تعديل صلاحيات/بيانات */
  app.patch('/api/admin/team/:id', requireAdminPermission('team.manage'), async (req, res) => {
    try {
      const actorPerms = (req.adminUser && req.adminUser.permissions) || [];
      const member = await adminTeamService.updateMember(req.params.id, req.body || {}, actorPerms);
      if (!member) return res.status(404).json({ error: 'member_not_found' });
      res.json({ ok: true, member });
    } catch (e) {
      if (e.code === 'cannot_grant_super') return res.status(403).json({ error: e.code, msg: 'منح صلاحية Super يتطلب أن تكون Super Admin' });
      if (e.code === 'last_super_admin') return res.status(400).json({ error: e.code, msg: 'لا يمكن إزالة آخر Super Admin' });
      res.status(500).json({ error: 'update_failed' });
    }
  });

  /** DELETE /api/admin/team/:id — تعطيل عضو */
  app.delete('/api/admin/team/:id', requireAdminPermission('team.manage'), async (req, res) => {
    const selfId = req.adminUser && req.adminUser.user;
    const target = adminTeamService.getMemberById(req.params.id);
    if (!target) return res.status(404).json({ error: 'member_not_found' });
    if (target.user === selfId) return res.status(400).json({ error: 'cannot_deactivate_self' });
    if ((target.permissions || []).includes('*') && adminTeamService.readTeam().filter((m) => m.active !== false && (m.permissions || []).includes('*')).length <= 1) {
      return res.status(400).json({ error: 'last_super_admin', msg: 'لا يمكن تعطيل آخر Super Admin' });
    }
    const member = await adminTeamService.deactivateMember(req.params.id);
    res.json({ ok: true, member });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = req.header('x-admin-token');
    if (token) adminSessions.delete(token);
    res.json({ ok: true });
  });

  // ── الملخص اليومي (Daily Digest) — يُستدعى من مهمة مجدولة خارجية (وكيل
  // إدارة المنصة) وليس من أي صفحة عامة. مبني الآن كاملاً لكنه بلا فائدة
  // حقيقية حتى تنطلق المنصة فعلياً على استضافة حقيقية وتستقبل مستخدمين —
  // قبل ذلك سيعيد دائماً أصفاراً لأن data/ فارغة. لا يغيّر أي بيانات، قراءة
  // فقط، ومحمي بنفس BACKEND_SHARED_SECRET العام لبقية نقاط لوحة الأدمن.
  app.get('/api/admin/daily-digest', requireAdminAuth, (req, res) => {
    try {
      const pendingAccounts = readAccounts().filter((a) => a.status === 'pending');
      const pendingAds = readAds().filter((a) => a.status === 'pending');
      const pendingSubRequests = readSubRequests().filter((r) => r.status === 'pending');
      const pendingBizContacts = (typeof readAdsRequests === 'function' ? readAdsRequests() : [])
        .filter((r) => r.status === 'pending_contact');
      const pendingTenders = readTenders().filter((t) => t.status === 'pending_review');

      const pkgRecords = getAllAccountPackageRecords();
      const expiringSoon = [];
      const suspended = [];
      Object.keys(pkgRecords).forEach((accountId) => {
        const rec = pkgRecords[accountId];
        if (!rec) return;
        if (rec.status === 'expiring_soon') expiringSoon.push({ accountId, periodEnd: rec.periodEnd || null });
        if (rec.status === 'suspended') suspended.push({ accountId, periodEnd: rec.periodEnd || null });
      });

      const maintenanceAudit = readAuditLog(DATA_DIR);
      const lastMaintenance = maintenanceAudit[0] || null;
      const lastBackup = readLatestBackupMeta(backendRootDir);

      res.json({
        ok: true,
        generatedAt: new Date().toISOString(),
        pendingAccounts: { count: pendingAccounts.length, items: pendingAccounts.slice(0, 20).map((a) => ({ id: a.id, name: a.name, type: a.type, createdAt: a.createdAt })) },
        pendingAds: { count: pendingAds.length, items: pendingAds.slice(0, 20).map((a) => ({ id: a.id, title: a.title, accountId: a.accountId })) },
        pendingSubRequests: { count: pendingSubRequests.length },
        pendingBizContacts: { count: pendingBizContacts.length },
        pendingTenders: { count: pendingTenders.length },
        expiringSoon: { count: expiringSoon.length, items: expiringSoon.slice(0, 20) },
        suspended: { count: suspended.length, items: suspended.slice(0, 20) },
        lastMaintenance,
        lastBackup,
      });
    } catch (err) {
      console.error('[daily-digest] error:', err.message);
      res.status(500).json({ error: 'فشل توليد الملخص اليومي' });
    }
  });
}

module.exports = { mountAdminCoreRoutes };
