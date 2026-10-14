/**
 * مسارات غرفة الاستثمارات (/api/investments* و /api/admin/investments*).
 * مُستخرجة من server.js للصيانة — نفس العقود والسلوك.
 */
'use strict';

const { createLimiter } = require('../lib/rateLimitRedis');
const rateLimit = createLimiter;

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountInvestmentsRoutes(app, deps) {
  const {
    requireAdminAuth,
    requireAdminPermission,
    investmentRoom,
    anthropic,
    verifyAccountOwner,
    extractAccountToken,
    resolveOptionalAccountViewer,
    getInvestmentEntitlements,
    syncAccountPackage,
    getAccountRecord,
    findCatalogPackage,
    isTrialPackage,
  } = deps;

  const INVESTMENT_PACKAGE_NAME = 'باقة الاستثمار';

  function resolveOptionalInvestViewer(req) {
    if (typeof resolveOptionalAccountViewer === 'function') {
      return resolveOptionalAccountViewer(req);
    }
    return null;
  }

  function getInvestAccessForViewer(accountId) {
    if (typeof getInvestmentEntitlements === 'function') {
      return getInvestmentEntitlements(accountId || null);
    }
    return {
      subscribed: false,
      isTrial: false,
      canEnterDetailRoom: false,
      canUnlockContacts: false,
      canPostOpportunities: false,
      planType: 'investment_public',
    };
  }

  const requireInvAdmin = typeof requireAdminPermission === 'function'
    ? requireAdminPermission('moderation')
    : requireAdminAuth;

  const investmentPlanLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'too_many_requests' },
  });
  const investmentSubmitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'too_many_requests' },
  });

  /** POST /api/investments/plan — يتطلب حساباً موثّقاً (منع استنزاف Claude عاماً) */
  app.post('/api/investments/plan', investmentPlanLimiter, (req, res) => {
    const token = (typeof extractAccountToken === 'function' ? extractAccountToken(req) : '') || req.header('x-account-token') || '';
    const accountId = String((req.body && req.body.accountId) || '').slice(0, 60);
    if (!accountId || !verifyAccountOwner || !verifyAccountOwner(accountId, token)) {
      return res.status(401).json({ ok: false, error: 'unauthorized', code: 'auth_required' });
    }
    return (async () => {
      try {
        const result = await investmentRoom.generatePlan(req.body || {}, anthropic);
        res.json({ ok: true, plan: result.plan, source: result.source, lang: result.lang, publicContact: investmentRoom.PUBLIC_CONTACT });
      } catch (err) {
        const status = err.status && err.status >= 400 ? err.status : 500;
        res.status(status).json({ ok: false, error: err.message || 'plan_failed' });
      }
    })();
  });

  /** GET /api/investments — فرص منشورة (بما فيها الموافقة المبدئية) */
  app.get('/api/investments', (req, res) => {
    try {
      const viewerId = resolveOptionalInvestViewer(req);
      const access = getInvestAccessForViewer(viewerId);
      const pub = investmentRoom.listPublic({ unlockContacts: !!access.canUnlockContacts });
      res.json(Object.assign({}, pub, {
        access: {
          contactsUnlocked: !!access.canUnlockContacts,
          canEnterDetailRoom: !!access.canEnterDetailRoom,
          canPost: !!access.canPostOpportunities,
          isTrial: !!access.isTrial,
          subscribed: !!access.subscribed,
          planType: access.planType,
        },
      }));
    } catch (err) {
      res.status(500).json({ ok: false, error: 'list_failed' });
    }
  });

  /**
   * GET /api/investments/public-stats — عام، بلا تواصل حسّاس.
   * نفس خوارزمية اكتشاف الرئيسية: عدد + عيّنات مرتّبة بالأحدث، عتبة 3.
   */
  app.get('/api/investments/public-stats', (req, res) => {
    try {
      const pub = investmentRoom.listPublic({ unlockContacts: false });
      const list = Array.isArray(pub.opportunities) ? pub.opportunities : [];
      const teasers = list.slice(0, 20).map((o) => ({
        id: o.id,
        title: o.title || '',
        sector: o.sector || '',
        wilaya: o.wilaya || '',
        stage: o.stage || '',
        createdAt: o.createdAt || null,
      }));
      const recentSectors = teasers.map((t) => t.sector).filter(Boolean).slice(0, 3);
      res.json({
        ok: true,
        count: list.length,
        recentSectors,
        teasers,
        minReady: 3,
        maxCards: 20,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: 'stats_failed' });
    }
  });

  /** POST /api/investments/submit — إيداع فرصة (حساب موثّق فقط؛ لا نشر عام تلقائي بلا مراجعة) */
  app.post('/api/investments/submit', investmentSubmitLimiter, async (req, res) => {
    try {
      const token = (typeof extractAccountToken === 'function' ? extractAccountToken(req) : '') || req.header('x-account-token') || '';
      const accountId = String((req.body && req.body.accountId) || '').slice(0, 60);
      if (!accountId || !verifyAccountOwner || !verifyAccountOwner(accountId, token)) {
        return res.status(401).json({ ok: false, error: 'unauthorized', code: 'auth_required' });
      }
      const body = Object.assign({}, req.body || {}, { accountId, requireHumanReview: true });
      const out = await investmentRoom.submitOpportunity(body);
      // لا نعرض للعموم قبل موافقة أدمن — أخضر يبقى معلّقاً إن فرضنا المراجعة
      if (out && out.opportunity && out.opportunity.status === 'provisionally_approved') {
        out.opportunity.status = 'pending_review';
        out.heldForReview = true;
      }
      res.json(out);
    } catch (err) {
      const status = err.status && err.status >= 400 ? err.status : 500;
      res.status(status).json({ ok: false, error: err.message || 'submit_failed' });
    }
  });

  /** GET /api/admin/investments — قائمة كاملة للأدمن (بما فيها المعلّقة) */
  app.get('/api/admin/investments', requireInvAdmin, (req, res) => {
    try {
      res.json(investmentRoom.listAdmin({
        status: req.query.status || null,
        tier: req.query.tier || null,
      }));
    } catch (err) {
      res.status(500).json({ ok: false, error: 'list_failed' });
    }
  });

  /** POST /api/admin/investments/:id/decision — نقض/تأكيد الموافقة المبدئية */
  app.post('/api/admin/investments/:id/decision', requireInvAdmin, (req, res) => {
    try {
      const action = (req.body && req.body.action) || '';
      const reviewer = (req.adminUser && (req.adminUser.name || req.adminUser.user)) || 'admin';
      const out = investmentRoom.decideOpportunity(req.params.id, action, reviewer);
      res.json(out);
    } catch (err) {
      const status = err.status && err.status >= 400 ? err.status : 500;
      res.status(status).json({ ok: false, error: err.message || 'decision_failed' });
    }
  });

  /** GET /api/admin/investments/daily-report — ملخص تشغيلي (أدمن فقط) */
  app.get('/api/admin/investments/daily-report', requireInvAdmin, (req, res) => {
    try {
      const digest = investmentRoom.buildDailyDigest();
      res.json({ ok: true, digest, opsConfigured: !!investmentRoom.opsEmail() });
    } catch (err) {
      res.status(500).json({ ok: false, error: 'digest_failed' });
    }
  });

  /** POST /api/admin/investments/send-ops-report — إرسال التقرير للبريد التشغيلي الخاص */
  app.post('/api/admin/investments/send-ops-report', requireInvAdmin, async (req, res) => {
    try {
      const result = await investmentRoom.sendOpsDailyReport();
      res.json({
        ok: !!result.ok,
        skipped: !!result.skipped,
        reason: result.reason || null,
        error: result.error || null,
        summary: result.digest ? {
          plansRequested: result.digest.plansRequested,
          opportunitiesSubmitted: result.digest.opportunitiesSubmitted,
          pendingReview: result.digest.pendingReview,
          autoProvisionallyApproved: result.digest.autoProvisionallyApproved,
          tiers: result.digest.tiers,
        } : null,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: 'send_failed' });
    }
  });

  /**
   * POST /api/investments/package/activate — أدمين — تفعيل باقة الاستثمار
   * بمفتاح معزول accountId::investment (نفس نمط المناقصات).
   */
  app.post('/api/investments/package/activate', requireAdminPermission('payments'), async (req, res) => {
    if (typeof syncAccountPackage !== 'function') {
      return res.status(500).json({ error: 'sync_unavailable' });
    }
    const b = req.body || {};
    if (!b.accountId) return res.status(400).json({ error: 'accountId مطلوب' });
    const findPkg = typeof findCatalogPackage === 'function' ? findCatalogPackage : (() => null);
    const trialFn = typeof isTrialPackage === 'function' ? isTrialPackage : (() => false);
    const pkgName = b.pkgName || INVESTMENT_PACKAGE_NAME;
    const pkgDef = findPkg(b.packageId || pkgName);
    const days = Number(b.days) || (pkgDef && pkgDef.durationDays) || 30;
    const price = Number(b.price) || (pkgDef && pkgDef.price) || 0;
    const isTrial = b.isTrial === true || trialFn((pkgDef && pkgDef.name) || pkgName, price);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + days * 86400000);
    try {
      const result = await syncAccountPackage({
        accountId: b.accountId + '::investment',
        accountName: b.accountName || b.accountId,
        accountPhone: b.accountPhone || '',
        accountEmail: b.accountEmail || '',
        accountType: b.accountType || '',
        pkgName: (pkgDef && pkgDef.name) || pkgName,
        packageId: (pkgDef && pkgDef.id) || b.packageId || null,
        price,
        days,
        periodStart: now.toISOString(),
        periodEnd: periodEnd.toISOString(),
        activatedBy: b.activatedBy || 'admin',
        isTrial,
        paymentConfirmed: !isTrial,
        paidAt: isTrial ? null : now.toISOString(),
      });
      if (!result.ok) return res.status(400).json(result);
      res.json({ ok: true, periodEnd: periodEnd.toISOString() });
    } catch (err) {
      console.error('[investments/package/activate] error:', err.message);
      res.status(500).json({ error: 'فشل تفعيل باقة الاستثمار' });
    }
  });

  /**
   * GET /api/investments/package/status/:id — حالة باقة الاستثمار لصاحب الحساب.
   */
  app.get('/api/investments/package/status/:id', (req, res) => {
    const token = (typeof extractAccountToken === 'function' ? extractAccountToken(req) : '') || '';
    const acc = verifyAccountOwner && verifyAccountOwner(req.params.id, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const ent = getInvestAccessForViewer(req.params.id);
    const rec = typeof getAccountRecord === 'function'
      ? getAccountRecord(req.params.id + '::investment')
      : null;
    const safeRec = rec ? (() => { const { accessToken, ...rest } = rec; return rest; })() : null;
    res.json({
      ok: true,
      subscribed: !!ent.subscribed,
      isTrial: !!ent.isTrial,
      contactsUnlocked: !!ent.canUnlockContacts,
      canEnterDetailRoom: !!ent.canEnterDetailRoom,
      canPost: !!ent.canPostOpportunities,
      planType: ent.planType,
      pkgName: ent.pkgName || null,
      record: safeRec,
    });
  });

  /**
   * GET /api/investments/:id — غرفة تفاصيل فرصة واحدة.
   * الدخول الكامل يتطلب باقة فعّالة؛ كشف التواصل يتطلب باقة مدفوعة.
   * يُسجَّل بعد المسارات الثابتة (package/status، admin، …).
   */
  app.get('/api/investments/:id', (req, res) => {
    try {
      const viewerId = resolveOptionalInvestViewer(req);
      const access = getInvestAccessForViewer(viewerId);
      const enterRoom = !!access.canEnterDetailRoom || !!access.subscribed;
      const unlock = !!access.canUnlockContacts;
      const opportunity = investmentRoom.getPublicById(req.params.id, {
        enterRoom,
        unlockContacts: unlock,
      });
      if (!opportunity) return res.status(404).json({ ok: false, error: 'opportunity_not_found' });
      res.json({
        ok: true,
        opportunity,
        access: {
          contactsUnlocked: unlock,
          canEnterDetailRoom: enterRoom,
          canPost: !!access.canPostOpportunities,
          isTrial: !!access.isTrial,
          subscribed: !!access.subscribed,
          planType: access.planType,
        },
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: 'detail_failed' });
    }
  });
}

module.exports = { mountInvestmentsRoutes };
