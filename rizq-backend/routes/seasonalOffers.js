/**
 * مسارات العروض الموسمية — إدارة + قراءة عامة للوحات المشتركين.
 */
'use strict';

function mountSeasonalOfferRoutes(app, deps) {
  const {
    requireAdminPermission,
    seasonalOffers,
  } = deps;
  const so = seasonalOffers || require('../services/seasonalOffers');

  /** عام — بطاقة العرض في لوحة المشترك (عناوين نصّية مُنظَّفة) */
  app.get('/api/seasonal-offers/active', async (req, res) => {
    try {
      const offer = await so.getPublicActiveOffer();
      return res.json({ ok: true, offer });
    } catch (err) {
      return res.json({ ok: true, offer: null });
    }
  });

  /** معاينة سعر باقة مع عرض نشط (يتجاهل أي سعر من الاستعلام) */
  app.get('/api/seasonal-offers/price', async (req, res) => {
    try {
      const packageId = String((req.query && (req.query.packageId || req.query.pkgId)) || '').slice(0, 60);
      const pkgName = String((req.query && (req.query.pkg || req.query.pkgName)) || '').slice(0, 60);
      const accountId = String((req.query && req.query.accountId) || '').slice(0, 60);
      const listPrice = Number((req.query && req.query.listPrice) || 0);
      /* listPrice من الاستعلام إرشادي فقط — يُفضَّل الكتالوج من المستدعي؛ هنا نقبل إن أُرسل */
      if (!(listPrice > 0)) {
        return res.status(400).json({ ok: false, error: 'listPrice_required' });
      }
      const resolved = await so.resolveOfferPrice({
        listPrice,
        packageId,
        pkgName,
        accountId: accountId || null,
        paymentAt: new Date().toISOString(),
      });
      return res.json({ ok: true, ...resolved });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'price_failed' });
    }
  });

  app.get('/api/admin/seasonal-offers', requireAdminPermission('packages'), async (req, res) => {
    try {
      const history = await so.offerHistory();
      return res.json({ ok: true, offers: history });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'list_failed' });
    }
  });

  app.post('/api/admin/seasonal-offers', requireAdminPermission('packages'), async (req, res) => {
    try {
      const result = await so.upsertOffer(req.body || {});
      if (!result.ok) return res.status(400).json(result);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'save_failed', message: err && err.message });
    }
  });

  app.put('/api/admin/seasonal-offers/:id', requireAdminPermission('packages'), async (req, res) => {
    try {
      const result = await so.upsertOffer(req.body || {}, { id: req.params.id });
      if (!result.ok) return res.status(400).json(result);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'save_failed' });
    }
  });

  app.post('/api/admin/seasonal-offers/:id/archive', requireAdminPermission('packages'), async (req, res) => {
    try {
      const result = await so.archiveOffer(req.params.id);
      if (!result.ok) return res.status(404).json(result);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'archive_failed' });
    }
  });

  /** معاينة قبل النشر — لا يحفظ */
  app.post('/api/admin/seasonal-offers/preview', requireAdminPermission('packages'), async (req, res) => {
    try {
      const norm = so.normalizeOfferInput(req.body || {}, 'preview');
      if (!norm.ok) return res.status(400).json(norm);
      const offer = Object.assign({}, norm.offer, { previewOnly: true, published: false });
      const sampleList = Math.max(0, Number((req.body && req.body.sampleListPrice) || 3000));
      const price = Math.round(sampleList * (1 - offer.percent / 100) * 100) / 100;
      return res.json({
        ok: true,
        preview: {
          titleAr: so._escTitle(offer.titleAr),
          titleFr: so._escTitle(offer.titleFr),
          percent: offer.percent,
          startAt: offer.startAt,
          endAt: offer.endAt,
          packageIds: offer.packageIds,
          sample: { listPrice: sampleList, price },
        },
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'preview_failed' });
    }
  });
}

module.exports = { mountSeasonalOfferRoutes };
