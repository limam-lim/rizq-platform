/**
 * مسارات إعلانات رزق (/api/ads*) — نشر، تصفح، إشراف، طلبات فيديو إعلاني.
 * مُستخرجة من server.js للصيانة — نفس العقود والسلوك.
 */
'use strict';

const rateLimit = require('express-rate-limit');

function genAdId() {
  return 'RZQ-' + new Date().getFullYear() + '-' + String(Math.floor(10000 + Math.random() * 90000));
}

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountAdsRoutes(app, deps) {
  const {
    requireAdminAuth,
    moderatorAdMiddleware,
    getPlatformFlags,
    extractAccountToken,
    verifyAccountOwner,
    getEntitlements,
    assertCanPostAd,
    assertPhotoCount,
    scanContactLeakFields,
    saveAdImages,
    resolveOptionalAccountViewer,
    resolveContactGate,
    toPublicAdGated,
    isAdminRequest,
    readAccounts,
    readAdsRequests,
    writeAdsRequests,
    readAds,
    writeAds,
    readAdBoosts,
  } = deps;

  /**
   * withBoostFlag(ad) — يضيف علم boosted:true/false للإعلان حسب ad_boosts.json
   * (نفس المصدر الذي يقرأه GET /api/discovery/ending-soon).
   */
  function withBoostFlag(ad) {
    try {
      const boosts = readAdBoosts();
      const b = boosts[ad.id];
      const boosted = !!(b && b.endsAt && new Date(b.endsAt).getTime() > Date.now());
      return Object.assign({}, ad, { boosted });
    } catch (e) {
      return Object.assign({}, ad, { boosted: false });
    }
  }

  // ── Rate limit مخصص أشد على /api/ads/submit ─────────────────────────
  // هذا الـ endpoint عام بلا أي مصادقة (requireAdminAuth) لأنه مخصص
  // لزوار حقيقيين يطلبون نشر إعلان — الحد العام (60/15 دقيقة) لا
  // يكفي وحده لمنع إغراق ملف ads-requests.json بطلبات مزيفة من IP واحد.
  const adsSubmitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'عدد كبير جداً من الطلبات — حاول مرة أخرى بعد قليل' },
  });

  const adsPublishLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'عدد كبير جداً من الإعلانات المنشورة — حاول لاحقاً' },
  });

  /**
   * POST /api/ads/submit
   * عام — صاحب معرض/محل يرسل طلب نشر فيديو إعلاني عبر Rizq ADS.
   * ⚠️ لا يُرفع ملف الفيديو نفسه هنا (لا توجد بنية تخزين فيديو حقيقية بعد —
   * تحتاج CDN/S3 حسب خطة rizq_backend_plan.html) — فقط بيانات الطلب +
   * معلومات تواصل، ليتواصل فريق رزق فعلياً ويستلم الفيديو وينشره يدوياً.
   * لا وعد بنشر تلقائي فوري لأنه غير موجود فعلاً.
   */
  app.post('/api/ads/submit', adsSubmitLimiter, (req, res) => {
    const b = req.body || {};
    if (!b.title || !b.phone) return res.status(400).json({ error: 'العنوان ورقم التواصل مطلوبان' });
    const requests = typeof readAdsRequests === 'function' ? readAdsRequests() : [];
    const id = 'ADREQ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    requests.push({
      id,
      title: String(b.title).slice(0, 120),
      category: String(b.category || '').slice(0, 80),
      phone: String(b.phone).slice(0, 20),
      pkg: String(b.pkg || 'basic').slice(0, 20),
      hasVideoFile: !!b.hasVideoFile,
      videoFileName: String(b.videoFileName || '').slice(0, 200),
      status: 'pending_contact',
      createdAt: new Date().toISOString(),
    });
    if (typeof writeAdsRequests === 'function') writeAdsRequests(requests);
    res.json({ ok: true, id });
  });

  /**
   * GET /api/ads/requests
   * أدمين فقط (سرّ مشترك) — لائحة طلبات نشر فيديو الإعلانات الواردة فعلياً،
   * حتى يكون وعد "سيتواصل معك رزق" قابلاً للتنفيذ حقاً.
   */
  app.get('/api/ads/requests', requireAdminAuth, (req, res) => {
    const list = typeof readAdsRequests === 'function' ? readAdsRequests() : [];
    res.json({ ok: true, requests: list.slice().reverse() });
  });

  /**
   * POST /api/ads — نشر إعلان (يتطلب حساباً مصادقاً — لا نشر مجهول)
   */
  app.post('/api/ads', adsPublishLimiter, moderatorAdMiddleware, async (req, res) => {
    try {
    const pFlags = getPlatformFlags();
    if (pFlags.platformOpen === false) return res.status(503).json({ error: 'المنصة مغلقة للصيانة حالياً' });
    if (pFlags.adsOpen === false) return res.status(403).json({ error: 'نشر الإعلانات مغلق حالياً' });
    const b = req.body || {};
    if (!b.title || !String(b.title).trim()) return res.status(400).json({ error: 'العنوان مطلوب' });
    if (!b.category) return res.status(400).json({ error: 'الفئة مطلوبة' });
    if (!b.accountId) {
      return res.status(401).json({ ok: false, error: 'unauthorized', code: 'account_required', message: 'نشر الإعلان يتطلب حساباً مسجّلاً' });
    }
    const token = extractAccountToken(req) || '';
    const ownerAcc = verifyAccountOwner(String(b.accountId).slice(0, 60), token);
    if (!ownerAcc) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const acc = ownerAcc;
    const ent = getEntitlements(b.accountId, acc ? acc.type : 'individual');
    const activeCount = readAds().filter((a) => a.accountId === b.accountId && a.status !== 'removed').length;
    try {
      assertCanPostAd(ent, activeCount);
      if (Array.isArray(b.images) && b.images.length) assertPhotoCount(ent, b.images.length);
    } catch (gateErr) {
      return res.status(gateErr.status || 403).json({ ok: false, error: gateErr.message, code: gateErr.code, details: gateErr.details });
    }
    const leakScan = scanContactLeakFields([
      { key: 'title', val: b.title },
      { key: 'desc', val: b.desc },
    ]);
    if (leakScan && leakScan.hasLeak) {
      return res.status(422).json({
        ok: false,
        error: 'contact_in_text_forbidden',
        field: leakScan.fields && leakScan.fields[0] && leakScan.fields[0].field,
        hits: leakScan.hits || [],
        msg: leakScan.messageAr,
        msg_fr: leakScan.messageFr,
      });
    }
    const list = readAds();
    let id = (typeof b.id === 'string' && /^RZQ-\d{4}-\d{4,6}$/.test(b.id)) ? b.id : genAdId();
    while (list.some((a) => a.id === id)) id = genAdId(); // تفادي تصادم نادر في المعرّف
    const images = await saveAdImages(id, b.images);
    const rec = {
      id,
      title: String(b.title).slice(0, 200),
      desc: String(b.desc || '').slice(0, 5000),
      titleFr: String(b.titleFr || '').slice(0, 200),
      descFr: String(b.descFr || '').slice(0, 5000),
      price: String(b.price || '').slice(0, 40),
      originalPrice: String(b.originalPrice || '').slice(0, 40), // سعر أصلي اختياري لعرض شارة الخصم (إلهام أمازون)
      stockQty: (b.stockQty !== undefined && b.stockQty !== '' && Number.isFinite(Number(b.stockQty)) && Number(b.stockQty) >= 0)
        ? Math.floor(Number(b.stockQty)) : null, // كمية متبقية اختيارية — شارة "متبقي X فقط" (إلهام أمازون/Temu)، null = غير محدود
      category: String(b.category).slice(0, 60),
      categoryLabel: String(b.categoryLabel || '').slice(0, 60),
      subcat: String(b.subcat || '').slice(0, 80),
      emoji: String(b.emoji || '').slice(0, 8),
      wilaya: String(b.wilaya || '').slice(0, 60),
      condition: String(b.condition || '').slice(0, 40),
      hidePhone: !!b.hidePhone,
      negotiable: b.negotiable !== undefined ? !!b.negotiable : true,
      urgent: !!b.urgent,
      images,
      seller_trust_score: Number.isFinite(Number(b.seller_trust_score)) ? Number(b.seller_trust_score) : 60,
      accountId: String(b.accountId).slice(0, 60),
      // إصلاح ثغرة أمنية (2026-08-04): كان الحقل status قابلاً للتحكم من العميل
      // (b.status)، وبقيمة افتراضية 'active' إن لم يُرسَل شيء — أي أن أي طلب
      // مباشر لهذا الـ API (متجاوزاً rizq_moderator_agent.js الذي يعمل في
      // المتصفح فقط) كان يُنشر الإعلان مباشرة بلا أي مراجعة من السيرفر.
      // الآن: كل إعلان جديد يبدأ 'pending' إلزامياً بغضّ النظر عمّا يرسله
      // العميل — التفعيل الفعلي فقط عبر POST /api/ads/admin/:id/decision.
      status: 'pending',
      date: b.date ? String(b.date).slice(0, 40) : new Date().toLocaleDateString('ar'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(rec);
    writeAds(list);
    const out = { ok: true, id: rec.id, ad: rec };
    if (req.moderatorDecision) out.moderator = req.moderatorDecision;
    res.json(out);
    } catch (err) {
      console.error('[ads/post] image pipeline:', err.message);
      res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
    }
  });

  /**
   * GET /api/ads — تصفح عام (rizq_browse.html / rizq_search.html) — لا
   * يُرجع إلا status==='active' افتراضياً، مع فلاتر بسيطة + ترقيم صفحات.
   */
  app.get('/api/ads', (req, res) => {
    const q = req.query || {};
    const viewerId = resolveOptionalAccountViewer(req);
    let list = readAds().filter((a) => a.status === 'active' && !String(a.accountId || '').startsWith('acc_demo') && !/^RZQ-2026-1000\d$/i.test(String(a.id || '')));
    if (q.category) list = list.filter((a) => a.category === q.category);
    if (q.subcat) list = list.filter((a) => a.subcat === q.subcat);
    if (q.wilaya) list = list.filter((a) => a.wilaya === q.wilaya);
    if (q.accountId) list = list.filter((a) => a.accountId === q.accountId);
    if (q.search) {
      const s = String(q.search).toLowerCase();
      list = list.filter((a) => (a.title + ' ' + a.desc).toLowerCase().indexOf(s) !== -1);
    }
    list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limit = Math.max(1, Math.min(200, Number(q.limit) || 60));
    const offset = Math.max(0, Number(q.offset) || 0);
    const accounts = readAccounts();
    const page = list.slice(offset, offset + limit).map((ad) => {
      const seller = accounts.find((a) => a.id === ad.accountId);
      const gate = resolveContactGate(viewerId, ad.accountId, seller && seller.type);
      return toPublicAdGated(withBoostFlag(ad), gate, seller);
    });
    res.json({ ok: true, total: list.length, ads: page });
  });

  /**
   * GET /api/ads/batch?ids=RZQ-...,RZQ-... — جلب عدة إعلانات دفعة واحدة
   * (يستخدمه شريط "تابع التصفح" على الصفحة الرئيسية بدل استدعاء /api/ads/:id
   * مرة لكل إعلان شاهده الزائر). عام، لا يُرجع إلا status==='active'.
   */
  app.get('/api/ads/batch', (req, res) => {
    const idsParam = String(req.query.ids || '');
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30);
    if (!ids.length) return res.json({ ok: true, ads: [] });
    const viewerId = resolveOptionalAccountViewer(req);
    const all = readAds();
    const accounts = readAccounts();
    const found = ids
      .map((id) => all.find((a) => a.id === id && a.status === 'active'))
      .filter(Boolean)
      .map((ad) => {
        const seller = accounts.find((a) => a.id === ad.accountId);
        const gate = resolveContactGate(viewerId, ad.accountId, seller && seller.type);
        return toPublicAdGated(withBoostFlag(ad), gate, seller);
      });
    res.json({ ok: true, ads: found });
  });

  /** GET /api/ads/mine — كل إعلانات حساب معيّن (كل الحالات)، لصاحبه فقط */
  app.get('/api/ads/mine', (req, res) => {
    const accountId = req.query.accountId;
    const token = extractAccountToken(req) || '';
    const acc = verifyAccountOwner(accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const list = readAds().filter((a) => a.accountId === accountId);
    res.json({ ok: true, ads: list });
  });

  /** GET /api/ads/admin — لوحة إشراف الأدمن (كل الحالات، كل الإعلانات) */
  app.get('/api/ads/admin', requireAdminAuth, (req, res) => {
    res.json({ ok: true, ads: readAds() });
  });

  /** GET /api/ads/:id — تفاصيل إعلان واحد (صفحة rizq_listing.html) */
  app.get('/api/ads/:id', (req, res) => {
    const ad = readAds().find((a) => a.id === req.params.id);
    if (!ad) return res.status(404).json({ error: 'ad_not_found' });
    const isAdmin = isAdminRequest(req);
    const token = extractAccountToken(req) || '';
    const isOwner = !!(ad.accountId && verifyAccountOwner(ad.accountId, token));
    if (ad.status !== 'active' && !isAdmin && !isOwner) {
      return res.status(404).json({ error: 'ad_not_found' });
    }
    const viewerId = resolveOptionalAccountViewer(req);
    const seller = readAccounts().find((a) => a.id === ad.accountId);
    const gate = resolveContactGate(viewerId, ad.accountId, seller && seller.type);
    res.json({ ok: true, ad: toPublicAdGated(withBoostFlag(ad), gate, seller), access: gate });
  });

  /**
   * PATCH /api/ads/:id — تعديل من صاحب الإعلان (x-account-token) أو الأدمن
   * (x-rizq-secret). يدعم تعديل الحقول الأساسية + تغيير الحالة (نشِط/مباع/
   * متوقف) + استبدال الصور.
   */
  app.patch('/api/ads/:id', async (req, res) => {
    try {
    const list = readAds();
    const idx = list.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ad_not_found' });
    const ad = list[idx];
    const isAdmin = isAdminRequest(req);
    const token = req.header('x-account-token') || '';
    const isOwner = !!(ad.accountId && verifyAccountOwner(ad.accountId, token));
    if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
    const b = req.body || {};
    const editable = ['title', 'desc', 'titleFr', 'descFr', 'price', 'originalPrice', 'subcat', 'wilaya', 'condition'];
    editable.forEach((k) => { if (typeof b[k] === 'string') ad[k] = b[k].slice(0, (k === 'desc' || k === 'descFr') ? 5000 : 200); });
    if (Object.prototype.hasOwnProperty.call(b, 'stockQty')) {
      ad.stockQty = (b.stockQty !== null && b.stockQty !== '' && Number.isFinite(Number(b.stockQty)) && Number(b.stockQty) >= 0)
        ? Math.floor(Number(b.stockQty)) : null;
    }
    if (Object.prototype.hasOwnProperty.call(b, 'hidePhone')) ad.hidePhone = !!b.hidePhone;
    if (Object.prototype.hasOwnProperty.call(b, 'negotiable')) ad.negotiable = !!b.negotiable;
    if (Object.prototype.hasOwnProperty.call(b, 'urgent')) ad.urgent = !!b.urgent;
    if (Array.isArray(b.images)) ad.images = await saveAdImages(ad.id, b.images);
    // إصلاح ثغرة أمنية (2026-08-04): كان صاحب الإعلان (isOwner) قادراً على
    // تعيين status إلى 'active' مباشرة (نشر بلا مراجعة) أو حتى إعادته إلى
    // 'active' بعد رفضه من الأدمن — نفس قرار المراجعة (POST
    // /api/ads/admin/:id/decision) كان بلا قيمة فعلية. الآن: المالك يستطيع
    // فقط تعديل حالات إدارة ذاتية لا تحتاج مراجعة (sold/inactive/removed)،
    // أما active/pending/rejected فللأدمن حصراً (x-rizq-secret).
    if (typeof b.status === 'string') {
      const ownerAllowedStatus = ['sold', 'inactive', 'removed'];
      const adminAllowedStatus = ['active', 'pending', 'rejected', 'sold', 'inactive', 'removed'];
      const allowedStatus = isAdmin ? adminAllowedStatus : ownerAllowedStatus;
      if (allowedStatus.includes(b.status)) ad.status = b.status;
    }
    ad.updatedAt = new Date().toISOString();
    list[idx] = ad;
    writeAds(list);
    res.json({ ok: true, ad });
    } catch (err) {
      console.error('[ads/patch] image pipeline:', err.message);
      res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
    }
  });

  /**
   * DELETE /api/ads/:id — حذف ناعم (status='removed') وليس حذفاً نهائياً،
   * بنفس مبدأ عدم الحذف النهائي المتَّبع في بقية المنصة (المناقصات مثلاً).
   */
  app.delete('/api/ads/:id', (req, res) => {
    const list = readAds();
    const idx = list.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ad_not_found' });
    const ad = list[idx];
    const isAdmin = isAdminRequest(req);
    const token = req.header('x-account-token') || '';
    const isOwner = !!(ad.accountId && verifyAccountOwner(ad.accountId, token));
    if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
    list[idx].status = 'removed';
    list[idx].updatedAt = new Date().toISOString();
    writeAds(list);
    res.json({ ok: true });
  });

  /**
   * POST /api/ads/admin/:id/decision — قرار إشراف الأدمن (موافقة/رفض) —
   * يحلّ محل syncRealAdReviewStatus المحلي بالكامل في rizq_admin.html.
   */
  app.post('/api/ads/admin/:id/decision', requireAdminAuth, (req, res) => {
    const action = (req.body || {}).action;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: "action يجب أن يكون 'approve' أو 'reject'" });
    const list = readAds();
    const idx = list.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ad_not_found' });
    list[idx].status = action === 'approve' ? 'active' : 'rejected';
    list[idx].updatedAt = new Date().toISOString();
    writeAds(list);
    res.json({ ok: true, ad: list[idx] });
  });
}

module.exports = { mountAdsRoutes };
