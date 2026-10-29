/**
 * مسارات مدير تسويق رزق — /api/admin/marketing/*
 * أدمن فقط + صلاحية marketing
 */
'use strict';

const rateLimit = require('express-rate-limit');

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountMarketingRoutes(app, deps) {
  const { requireAdminPermission } = deps;
  const marketing = require('../services/marketingAgent');

  const genLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'طلبات توليد كثيرة — حاول لاحقاً' },
  });

  const adminUser = (req) => (req.adminUser && (req.adminUser.user || req.adminUser.name)) || 'admin';

  /** GET /api/admin/marketing/status */
  app.get('/api/admin/marketing/status', requireAdminPermission('marketing'), (req, res) => {
    res.json(Object.assign({ ok: true }, marketing.getPublicStatus(), { stats: marketing.getStats() }));
  });

  /** PATCH /api/admin/marketing/settings — تفعيل/حد المسودات/الموافقة البشرية */
  app.patch('/api/admin/marketing/settings', requireAdminPermission('marketing'), (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (typeof b.enabled === 'boolean') patch.enabled = b.enabled;
    if (typeof b.requireHumanApproval === 'boolean') patch.requireHumanApproval = b.requireHumanApproval;
    if (b.defaultChannel) patch.defaultChannel = String(b.defaultChannel).slice(0, 40);
    if (b.defaultLang) patch.defaultLang = String(b.defaultLang).slice(0, 8);
    if (b.maxDraftsPerDay != null) patch.maxDraftsPerDay = Math.min(200, Math.max(1, Number(b.maxDraftsPerDay) || 30));
    if (b.linkFallback) patch.linkFallback = String(b.linkFallback).slice(0, 500);
    const status = marketing.saveSettings(patch);
    res.json({ ok: true, status });
  });

  /** GET /api/admin/marketing/campaigns */
  app.get('/api/admin/marketing/campaigns', requireAdminPermission('marketing'), (req, res) => {
    const rows = marketing.listCampaigns({
      status: req.query.status || '',
      channel: req.query.channel || '',
      limit: req.query.limit,
    });
    res.json({ ok: true, campaigns: rows, stats: marketing.getStats() });
  });

  /** GET /api/admin/marketing/campaigns/:id */
  app.get('/api/admin/marketing/campaigns/:id', requireAdminPermission('marketing'), (req, res) => {
    const camp = marketing.getCampaign(req.params.id);
    if (!camp) return res.status(404).json({ ok: false, error: 'غير موجود' });
    res.json({ ok: true, campaign: camp });
  });

  /** POST /api/admin/marketing/campaigns/generate — توليد مسودة */
  app.post(
    '/api/admin/marketing/campaigns/generate',
    requireAdminPermission('marketing'),
    genLimiter,
    async (req, res) => {
      try {
        const camp = await marketing.createDraftCampaign(req.body || {}, adminUser(req));
        res.json({ ok: true, campaign: camp });
      } catch (err) {
        const code = err.code || 'error';
        const status =
          code === 'disabled' || code === 'rate_limit' || code === 'bad_type' || code === 'bad_channel'
            ? 400
            : 500;
        res.status(status).json({ ok: false, error: err.message, code });
      }
    }
  );

  /** PATCH /api/admin/marketing/campaigns/:id */
  app.patch('/api/admin/marketing/campaigns/:id', requireAdminPermission('marketing'), (req, res) => {
    try {
      const camp = marketing.updateDraftBody(req.params.id, req.body || {}, adminUser(req));
      if (!camp) return res.status(404).json({ ok: false, error: 'غير موجود' });
      res.json({ ok: true, campaign: camp });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message, code: err.code });
    }
  });

  /** POST /api/admin/marketing/campaigns/:id/approve */
  app.post('/api/admin/marketing/campaigns/:id/approve', requireAdminPermission('marketing'), (req, res) => {
    try {
      const camp = marketing.approveCampaign(req.params.id, adminUser(req), {
        scheduledAt: (req.body && req.body.scheduledAt) || null,
      });
      if (!camp) return res.status(404).json({ ok: false, error: 'غير موجود' });
      res.json({ ok: true, campaign: camp });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message, code: err.code });
    }
  });

  /** POST /api/admin/marketing/campaigns/:id/reject */
  app.post('/api/admin/marketing/campaigns/:id/reject', requireAdminPermission('marketing'), (req, res) => {
    try {
      const camp = marketing.rejectCampaign(
        req.params.id,
        adminUser(req),
        (req.body && req.body.reason) || ''
      );
      if (!camp) return res.status(404).json({ ok: false, error: 'غير موجود' });
      res.json({ ok: true, campaign: camp });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message, code: err.code });
    }
  });

  /** POST /api/admin/marketing/campaigns/:id/cancel */
  app.post('/api/admin/marketing/campaigns/:id/cancel', requireAdminPermission('marketing'), (req, res) => {
    try {
      const camp = marketing.cancelCampaign(req.params.id, adminUser(req));
      if (!camp) return res.status(404).json({ ok: false, error: 'غير موجود' });
      res.json({ ok: true, campaign: camp });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message, code: err.code });
    }
  });

  /** POST /api/admin/marketing/campaigns/:id/publish */
  app.post('/api/admin/marketing/campaigns/:id/publish', requireAdminPermission('marketing'), async (req, res) => {
    try {
      const camp = await marketing.publishCampaign(req.params.id, adminUser(req), {
        approveAndPublish: !!(req.body && req.body.approveAndPublish),
      });
      res.json({ ok: true, campaign: camp });
    } catch (err) {
      const status = err.code === 'fb_not_configured' || err.code === 'needs_approval' || err.code === 'channel_manual'
        ? 400
        : 500;
      res.status(status).json({ ok: false, error: err.message, code: err.code, details: err.details || null });
    }
  });
}

module.exports = { mountMarketingRoutes };
