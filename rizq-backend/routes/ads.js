/**
 * مسارات إعلانات رزق (/api/ads*) — نشر، تصفح، إشراف، طلبات فيديو إعلاني.
 * مُستخرجة من server.js للصيانة — نفس العقود والسلوك.
 */
'use strict';

const rateLimit = require('express-rate-limit');

function genAdId() {
  return 'RZQ-' + new Date().getFullYear() + '-' + String(Math.floor(10000 + Math.random() * 90000));
}

/** حدود تقريبية لموريتانيا — رفض إحداثيات عشوائية خارج البلد */
const MR_LAT_MIN = 14.0;
const MR_LAT_MAX = 28.0;
const MR_LON_MIN = -18.0;
const MR_LON_MAX = -4.0;

/**
 * parseOptionalCoords(body, { allowClear })
 * - إن لم تُرسل lat/lon: { ok:true, unset:true }
 * - إن أُرسل null لكليهما (عند التعديل): { ok:true, clear:true }
 * - زوج صالح: { ok:true, lat, lon }
 * - غير صالح: { ok:false, error }
 */
function parseOptionalCoords(b, opts) {
  const allowClear = !!(opts && opts.allowClear);
  if (!b || typeof b !== 'object') return { ok: true, unset: true };
  const hasLat = Object.prototype.hasOwnProperty.call(b, 'lat');
  const hasLon = Object.prototype.hasOwnProperty.call(b, 'lon');
  if (!hasLat && !hasLon) return { ok: true, unset: true };
  if (allowClear && b.lat === null && b.lon === null) return { ok: true, clear: true };
  if ((b.lat === '' || b.lat === null || b.lat === undefined)
    && (b.lon === '' || b.lon === null || b.lon === undefined)) {
    return allowClear ? { ok: true, clear: true } : { ok: true, unset: true };
  }
  const lat = Number(b.lat);
  const lon = Number(b.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, error: 'invalid_coords', message: 'إحداثيات الموقع غير صالحة' };
  }
  if (lat < MR_LAT_MIN || lat > MR_LAT_MAX || lon < MR_LON_MIN || lon > MR_LON_MAX) {
    return { ok: false, error: 'coords_out_of_range', message: 'الموقع خارج حدود موريتانيا' };
  }
  return {
    ok: true,
    lat: Math.round(lat * 1e6) / 1e6,
    lon: Math.round(lon * 1e6) / 1e6,
  };
}

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
async function mountAdsRoutes(app, deps) {
  const {
    requireAdminAuth,
    requireAdminPermission,
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
    adminHasPermission,
    readAccounts,
    readAdsRequests,
    writeAdsRequests,
    readAds,
    writeAds,
    readAdBoosts,
  } = deps;

  const requireAdsAdmin = typeof requireAdminPermission === 'function'
    ? requireAdminPermission('ads')
    : requireAdminAuth;
  const isAdsAdmin = async (req) => (typeof adminHasPermission === 'function'
    ? adminHasPermission(req, 'ads', 'moderation')
    : isAdminRequest(req));

  /**
   * withBoostFlag(ad) — يضيف علم boosted:true/false للإعلان حسب ad_boosts.json
   * (نفس المصدر الذي يقرأه GET /api/discovery/ending-soon).
   */
  async function withBoostFlag(ad) {
    try {
      const boosts = await readAdBoosts();
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
   * رفع ملف الفيديو من المستخدم معطّل مؤقتاً (أ4 — قريباً / مسار HLS لاحقاً).
   */
  app.post('/api/ads/submit', adsSubmitLimiter, async (req, res) => {
    const b = req.body || {};
    if (b.hasVideoFile || b.videoFileName || b.videoData || b.videoBase64) {
      return res.status(403).json({
        ok: false,
        error: 'VIDEO_UPLOAD_DISABLED',
        code: 'VIDEO_UPLOAD_DISABLED',
        message: 'رفع الفيديو قريباً',
        message_fr: 'Téléversement vidéo bientôt disponible',
      });
    }
    if (!b.title || !b.phone) return res.status(400).json({ error: 'العنوان ورقم التواصل مطلوبان' });
    const requests = typeof readAdsRequests === 'function' ? await readAdsRequests() : [];
    const id = 'ADREQ-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    requests.push({
      id,
      title: String(b.title).slice(0, 120),
      category: String(b.category || '').slice(0, 80),
      phone: String(b.phone).slice(0, 20),
      pkg: String(b.pkg || 'basic').slice(0, 20),
      hasVideoFile: false,
      videoFileName: '',
      status: 'pending_contact',
      createdAt: new Date().toISOString(),
    });
    if (typeof writeAdsRequests === 'function') await writeAdsRequests(requests);
    res.json({ ok: true, id });
  });

  /**
   * GET /api/ads/requests
   * أدمين فقط (سرّ مشترك) — لائحة طلبات نشر فيديو الإعلانات الواردة فعلياً،
   * حتى يكون وعد "سيتواصل معك رزق" قابلاً للتنفيذ حقاً.
   */
  app.get('/api/ads/requests', requireAdsAdmin, async (req, res) => {
    const list = typeof readAdsRequests === 'function' ? await readAdsRequests() : [];
    res.json({ ok: true, requests: list.slice().reverse() });
  });

  /**
   * POST /api/ads — نشر إعلان (يتطلب حساباً مصادقاً — لا نشر مجهول)
   */
  app.post('/api/ads', adsPublishLimiter, moderatorAdMiddleware, async (req, res) => {
    try {
    const pFlags = await getPlatformFlags();
    if (pFlags.platformOpen === false) return res.status(503).json({ error: 'المنصة مغلقة للصيانة حالياً' });
    if (pFlags.adsOpen === false) return res.status(403).json({ error: 'نشر الإعلانات مغلق حالياً' });
    const b = req.body || {};
    if (!b.title || !String(b.title).trim()) return res.status(400).json({ error: 'العنوان مطلوب' });
    if (!b.category) return res.status(400).json({ error: 'الفئة مطلوبة' });
    if (!b.accountId) {
      return res.status(401).json({ ok: false, error: 'unauthorized', code: 'account_required', message: 'نشر الإعلان يتطلب حساباً مسجّلاً' });
    }
    const token = extractAccountToken(req) || '';
    const ownerAcc = await verifyAccountOwner(String(b.accountId).slice(0, 60), token);
    if (!ownerAcc) return res.status(401).json({ ok: false, error: 'unauthorized' });
    const acc = ownerAcc;
    const ent = await getEntitlements(b.accountId, acc ? acc.type : 'individual');
    const activeCount = (await readAds()).filter((a) => a.accountId === b.accountId && a.status !== 'removed').length;
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
    const coords = parseOptionalCoords(b);
    if (!coords.ok) {
      return res.status(400).json({ ok: false, error: coords.error, message: coords.message });
    }
    const list = await readAds();
    let id = (typeof b.id === 'string' && /^RZQ-\d{4}-\d{4,6}$/.test(b.id)) ? b.id : genAdId();
    while (list.some((a) => a.id === id)) id = genAdId(); // تفادي تصادم نادر في المعرّف
    const paidAcc = !!(acc && ['store', 'office', 'corp', 'estate'].includes(acc.type));
    const images = await saveAdImages(id, b.images, {
      paid: paidAcc,
      maxCount: (ent.limits && ent.limits.maxPhotosPerItem) || 8,
      maxImageBytes: ent.limits && ent.limits.maxImageBytes,
    });
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
      brandId: String(b.brandId || '').slice(0, 48),
      brandName: String(b.brandName || '').slice(0, 80),
      brandNameFr: String(b.brandNameFr || '').slice(0, 80),
      modelId: String(b.modelId || '').slice(0, 48),
      modelName: String(b.modelName || '').slice(0, 80),
      modelNameFr: String(b.modelNameFr || '').slice(0, 80),
      emoji: String(b.emoji || '').slice(0, 8),
      wilaya: String(b.wilaya || '').slice(0, 60),
      // موقع GPS اختياري — إن وُجد يُفضَّل على مركز الولاية في خريطة التفاصيل
      lat: coords.unset ? null : coords.lat,
      lon: coords.unset ? null : coords.lon,
      condition: String(b.condition || '').slice(0, 40),
      hidePhone: !!b.hidePhone,
      negotiable: b.negotiable !== undefined ? !!b.negotiable : true,
      urgent: !!b.urgent,
      images,
      // درجة الثقة من حساب البائع فقط — لا نقبل قيمة العميل ولا نثبّت 60 وهمية
      seller_trust_score: null,
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
    await writeAds(list);
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
  app.get('/api/ads', async (req, res) => {
    const q = req.query || {};
    const viewerId = await resolveOptionalAccountViewer(req);
    let list = (await readAds()).filter((a) => a.status === 'active' && !String(a.accountId || '').startsWith('acc_demo') && !/^RZQ-2026-1000\d$/i.test(String(a.id || '')));
    if (q.category) list = list.filter((a) => a.category === q.category);
    if (q.subcat) list = list.filter((a) => a.subcat === q.subcat);
    if (q.brandId) list = list.filter((a) => String(a.brandId || '') === String(q.brandId));
    if (q.modelId) list = list.filter((a) => String(a.modelId || '') === String(q.modelId));
    if (q.wilaya) list = list.filter((a) => a.wilaya === q.wilaya);
    if (q.accountId) list = list.filter((a) => a.accountId === q.accountId);
    if (q.search) {
      const s = String(q.search).toLowerCase();
      list = list.filter((a) => {
        const blob = [
          a.title, a.desc, a.titleFr, a.descFr,
          a.brandId, a.brandName, a.brandNameFr,
          a.modelId, a.modelName, a.modelNameFr
        ].join(' ').toLowerCase();
        return blob.indexOf(s) !== -1;
      });
    }
    list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const limit = Math.max(1, Math.min(200, Number(q.limit) || 60));
    const offset = Math.max(0, Number(q.offset) || 0);
    const accounts = await readAccounts();
    const slice = list.slice(offset, offset + limit);
    const page = [];
    for (const ad of slice) {
      const seller = accounts.find((a) => a.id === ad.accountId);
      const gate = await resolveContactGate(viewerId, ad.accountId, seller && seller.type);
      page.push(toPublicAdGated(await withBoostFlag(ad), gate, seller));
    }
    res.json({ ok: true, total: list.length, ads: page });
  });

  /**
   * GET /api/ads/batch?ids=RZQ-...,RZQ-... — جلب عدة إعلانات دفعة واحدة
   * (يستخدمه شريط "تابع التصفح" على الصفحة الرئيسية بدل استدعاء /api/ads/:id
   * مرة لكل إعلان شاهده الزائر). عام، لا يُرجع إلا status==='active'.
   */
  app.get('/api/ads/batch', async (req, res) => {
    const idsParam = String(req.query.ids || '');
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30);
    if (!ids.length) return res.json({ ok: true, ads: [] });
    const viewerId = await resolveOptionalAccountViewer(req);
    const all = await readAds();
    const accounts = await readAccounts();
    const found = [];
    for (const id of ids) {
      const ad = all.find((a) => a.id === id && a.status === 'active');
      if (!ad) continue;
      const seller = accounts.find((a) => a.id === ad.accountId);
      const gate = await resolveContactGate(viewerId, ad.accountId, seller && seller.type);
      found.push(toPublicAdGated(await withBoostFlag(ad), gate, seller));
    }
    res.json({ ok: true, ads: found });
  });

  /** GET /api/ads/mine — كل إعلانات حساب معيّن (كل الحالات)، لصاحبه فقط */
  app.get('/api/ads/mine', async (req, res) => {
    const accountId = req.query.accountId;
    const token = extractAccountToken(req) || '';
    const acc = await verifyAccountOwner(accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const list = (await readAds()).filter((a) => a.accountId === accountId);
    res.json({ ok: true, ads: list });
  });

  /** GET /api/ads/admin — لوحة إشراف الأدمن (كل الحالات، كل الإعلانات) */
  app.get('/api/ads/admin', requireAdsAdmin, async (req, res) => {
    res.json({ ok: true, ads: await readAds() });
  });

  /** GET /api/ads/:id — تفاصيل إعلان واحد (صفحة التصفح rizq_browse.html?id=) */
  app.get('/api/ads/:id', async (req, res) => {
    const ad = (await readAds()).find((a) => a.id === req.params.id);
    if (!ad) return res.status(404).json({ error: 'ad_not_found' });
    const isAdmin = await isAdsAdmin(req);
    const token = extractAccountToken(req) || '';
    const isOwner = !!(ad.accountId && await verifyAccountOwner(ad.accountId, token));
    if (ad.status !== 'active' && !isAdmin && !isOwner) {
      return res.status(404).json({ error: 'ad_not_found' });
    }
    const viewerId = await resolveOptionalAccountViewer(req);
    const seller = (await readAccounts()).find((a) => a.id === ad.accountId);
    const gate = await resolveContactGate(viewerId, ad.accountId, seller && seller.type);
    res.json({ ok: true, ad: toPublicAdGated(await withBoostFlag(ad), gate, seller), access: gate });
  });

  /**
   * PATCH /api/ads/:id — تعديل من صاحب الإعلان (x-account-token) أو الأدمن
   * (x-rizq-secret). يدعم تعديل الحقول الأساسية + تغيير الحالة (نشِط/مباع/
   * متوقف) + استبدال الصور.
   */
  app.patch('/api/ads/:id', async (req, res) => {
    try {
    const list = await readAds();
    const idx = list.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ad_not_found' });
    const ad = list[idx];
    const isAdmin = await isAdsAdmin(req);
    const token = req.header('x-account-token') || '';
    const isOwner = !!(ad.accountId && await verifyAccountOwner(ad.accountId, token));
    if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
    const b = req.body || {};
    const editable = ['title', 'desc', 'titleFr', 'descFr', 'price', 'originalPrice', 'subcat', 'wilaya', 'condition', 'brandId', 'brandName', 'brandNameFr', 'modelId', 'modelName', 'modelNameFr'];
    editable.forEach((k) => { if (typeof b[k] === 'string') ad[k] = b[k].slice(0, (k === 'desc' || k === 'descFr') ? 5000 : 200); });
    if (Object.prototype.hasOwnProperty.call(b, 'stockQty')) {
      ad.stockQty = (b.stockQty !== null && b.stockQty !== '' && Number.isFinite(Number(b.stockQty)) && Number(b.stockQty) >= 0)
        ? Math.floor(Number(b.stockQty)) : null;
    }
    const coords = parseOptionalCoords(b, { allowClear: true });
    if (!coords.ok) {
      return res.status(400).json({ ok: false, error: coords.error, message: coords.message });
    }
    if (coords.clear) {
      ad.lat = null;
      ad.lon = null;
    } else if (!coords.unset) {
      ad.lat = coords.lat;
      ad.lon = coords.lon;
    }
    if (Object.prototype.hasOwnProperty.call(b, 'hidePhone')) ad.hidePhone = !!b.hidePhone;
    if (Object.prototype.hasOwnProperty.call(b, 'negotiable')) ad.negotiable = !!b.negotiable;
    if (Object.prototype.hasOwnProperty.call(b, 'urgent')) ad.urgent = !!b.urgent;
    if (Array.isArray(b.images)) {
      const ownerAcc = ad.accountId
        ? ((await readAccounts()).find((a) => a.id === ad.accountId) || null)
        : null;
      const paidAcc = !!(ownerAcc && ['store', 'office', 'corp', 'estate'].includes(ownerAcc.type));
      const entUp = ad.accountId
        ? await getEntitlements(ad.accountId, ownerAcc ? ownerAcc.type : 'individual')
        : null;
      if (entUp && b.images.length) {
        try { assertPhotoCount(entUp, b.images.length); }
        catch (gateErr) {
          return res.status(gateErr.status || 403).json({
            ok: false, error: gateErr.message, code: gateErr.code, details: gateErr.details,
          });
        }
      }
      ad.images = await saveAdImages(ad.id, b.images, {
        paid: paidAcc,
        maxCount: (entUp && entUp.limits && entUp.limits.maxPhotosPerItem) || 8,
        maxImageBytes: entUp && entUp.limits && entUp.limits.maxImageBytes,
      });
    }
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
    await writeAds(list);
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
  app.delete('/api/ads/:id', async (req, res) => {
    const list = await readAds();
    const idx = list.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ad_not_found' });
    const ad = list[idx];
    const isAdmin = await isAdsAdmin(req);
    const token = req.header('x-account-token') || '';
    const isOwner = !!(ad.accountId && await verifyAccountOwner(ad.accountId, token));
    if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
    list[idx].status = 'removed';
    list[idx].updatedAt = new Date().toISOString();
    await writeAds(list);
    res.json({ ok: true });
  });

  /**
   * POST /api/ads/admin/:id/decision — قرار إشراف الأدمن (موافقة/رفض) —
   * يحلّ محل syncRealAdReviewStatus المحلي بالكامل في rizq_admin.html.
   */
  app.post('/api/ads/admin/:id/decision', requireAdsAdmin, async (req, res) => {
    const action = (req.body || {}).action;
    if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: "action يجب أن يكون 'approve' أو 'reject'" });
    const list = await readAds();
    const idx = list.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ad_not_found' });
    list[idx].status = action === 'approve' ? 'active' : 'rejected';
    list[idx].updatedAt = new Date().toISOString();
    await writeAds(list);
    res.json({ ok: true, ad: list[idx] });
  });
}

module.exports = { mountAdsRoutes, parseOptionalCoords };
