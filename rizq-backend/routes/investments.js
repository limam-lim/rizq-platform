/**
 * مسارات غرفة الاستثمارات (/api/investments* و /api/admin/investments*).
 * مُستخرجة من server.js للصيانة — نفس العقود والسلوك.
 */
'use strict';

const rateLimit = require('express-rate-limit');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountInvestmentsRoutes(app, deps) {
  const {
    requireAdminAuth,
    investmentRoom,
    anthropic,
  } = deps;

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

  /** POST /api/investments/plan — وكيل المراجعة الأوّلية (JSON plan) */
  app.post('/api/investments/plan', investmentPlanLimiter, async (req, res) => {
    try {
      const result = await investmentRoom.generatePlan(req.body || {}, anthropic);
      res.json({ ok: true, plan: result.plan, source: result.source, lang: result.lang, publicContact: investmentRoom.PUBLIC_CONTACT });
    } catch (err) {
      const status = err.status && err.status >= 400 ? err.status : 500;
      res.status(status).json({ ok: false, error: err.message || 'plan_failed' });
    }
  });

  /** GET /api/investments — فرص منشورة (بما فيها الموافقة المبدئية) */
  app.get('/api/investments', (req, res) => {
    try {
      res.json(investmentRoom.listPublic({ unlockContacts: false }));
    } catch (err) {
      res.status(500).json({ ok: false, error: 'list_failed' });
    }
  });

  /** POST /api/investments/submit — إيداع فرصة + موافقة مبدئية عند الأخضر */
  app.post('/api/investments/submit', investmentSubmitLimiter, async (req, res) => {
    try {
      const out = await investmentRoom.submitOpportunity(req.body || {});
      res.json(out);
    } catch (err) {
      const status = err.status && err.status >= 400 ? err.status : 500;
      res.status(status).json({ ok: false, error: err.message || 'submit_failed' });
    }
  });

  /** GET /api/admin/investments — قائمة كاملة للأدمن (بما فيها المعلّقة) */
  app.get('/api/admin/investments', requireAdminAuth, (req, res) => {
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
  app.post('/api/admin/investments/:id/decision', requireAdminAuth, (req, res) => {
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
  app.get('/api/admin/investments/daily-report', requireAdminAuth, (req, res) => {
    try {
      const digest = investmentRoom.buildDailyDigest();
      res.json({ ok: true, digest, opsConfigured: !!investmentRoom.opsEmail() });
    } catch (err) {
      res.status(500).json({ ok: false, error: 'digest_failed' });
    }
  });

  /** POST /api/admin/investments/send-ops-report — إرسال التقرير للبريد التشغيلي الخاص */
  app.post('/api/admin/investments/send-ops-report', requireAdminAuth, async (req, res) => {
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
}

module.exports = { mountInvestmentsRoutes };
