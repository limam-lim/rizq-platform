/**
 * مسارات كتالوج المنتجات/الخدمات (/api/catalog*) —
 * مُستخرجة من server.js للصيانة — نفس العقود والسلوك.
 */
'use strict';

function genCatalogId() {
  return 'CAT-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountCatalogRoutes(app, deps) {
  const {
    verifyAccountOwner,
    getEntitlements,
    assertCanAddCatalogItem,
    assertPhotoCount,
    readCatalog,
    writeCatalog,
    saveCatalogImages,
    saveCatalogImage,
    extractAccountToken,
    isAdminRequest,
    adminHasPermission,
  } = deps;

  const { scanContactLeakFields } = require('../services/contactLeakGuard');
  const { DEFAULT_CATALOG_MAX_IMAGE_BYTES } = require('../services/imagePipeline');
  function catalogLeak(b) {
    const scan = scanContactLeakFields(['name', 'title', 'nameFr', 'desc', 'descFr']
      .filter((k) => typeof b[k] === 'string').map((k) => ({ key: k, val: b[k] })));
    if (!scan || !scan.hasLeak) return null;
    return {
      ok: false,
      error: 'contact_in_text_forbidden',
      field: scan.fields && scan.fields[0] && scan.fields[0].field,
      hits: scan.hits || [],
      msg: scan.messageAr,
      msg_fr: scan.messageFr,
    };
  }
  function resolveCatalogMaxImageBytes(ent) {
    const fromEnt = ent && ent.limits && Number(ent.limits.maxImageBytes);
    return fromEnt > 0 ? fromEnt : DEFAULT_CATALOG_MAX_IMAGE_BYTES;
  }
  function isImageTooLargeErr(err) {
    return !!(err && (err.code === 'image_too_large' || err.message === 'image_too_large' || err.status === 413));
  }

  const isCatalogAdmin = async (req) => (typeof adminHasPermission === 'function'
    ? adminHasPermission(req, 'moderation', 'ads')
    : isAdminRequest(req));

  /**
   * POST /api/catalog — إضافة منتج/خدمة (صاحب الحساب فقط عبر x-account-token)
   */
  app.post('/api/catalog', async (req, res) => {
    try {
    const b = req.body || {};
    const token = req.header('x-account-token') || '';
    const acc = await verifyAccountOwner(b.accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    if (!(b.name || b.title) || !String(b.name || b.title).trim()) return res.status(400).json({ error: 'الاسم مطلوب' });
    if (!['product', 'service'].includes(b.kind)) return res.status(400).json({ error: "kind يجب أن يكون 'product' أو 'service'" });
    // Normalize title → name for estate / legacy clients
    if (!b.name && b.title) b.name = b.title;
    const leak = catalogLeak(b);
    if (leak) return res.status(422).json(leak);
    const ent = await getEntitlements(b.accountId, acc.type);
    // الحد يشمل العناصر بانتظار المراجعة أيضاً (وإلا تُضاف عناصر بلا حد ثم تُعتمد كلها)
    const activeCount = (await readCatalog()).filter((it) => it.accountId === b.accountId && (it.status === 'active' || it.status === 'pending_review')).length;
    const imageCount = Array.isArray(b.images) ? b.images.length : (b.image ? 1 : 0);
    try {
      assertCanAddCatalogItem(ent, activeCount);
      if (imageCount) assertPhotoCount(ent, imageCount);
    } catch (gateErr) {
      return res.status(gateErr.status || 403).json({ ok: false, error: gateErr.message, code: gateErr.code, details: gateErr.details });
    }
    // Contextual binding: force server-side account identity (never trust client type alone)
    const accountType = String(acc.type || b.accountType || '').slice(0, 24);
    const activityId = String(acc.activityId || b.activityId || '').slice(0, 64);
    let categoryId = String(b.categoryId || b.category || b.categoryKey || '').trim().slice(0, 80);
    let subcat = String(b.subCategoryId || b.subcat || b.sub_category_id || '').trim().slice(0, 120);
    // If merchant has a registered activity, derive/validate marketplace category from it
    try {
      const { loadCatalog: loadMerchantCatalog } = require('../services/merchantActivities');
      const MA = loadMerchantCatalog();
      if (activityId && typeof MA.marketplaceSpecForActivity === 'function') {
        const spec = MA.marketplaceSpecForActivity(activityId);
        if (spec && spec.categoryId) {
          if (!categoryId) categoryId = String(spec.categoryId).slice(0, 80);
          else if (categoryId !== spec.categoryId) {
            // Soft-enforce: replace mismatched client category with activity-bound one
            categoryId = String(spec.categoryId).slice(0, 80);
          }
          if (!subcat && spec.preferredSubcat) subcat = String(spec.preferredSubcat).slice(0, 120);
          if (subcat && Array.isArray(spec.allowedSubcats) && spec.allowedSubcats.length
            && spec.allowedSubcats.indexOf(subcat) === -1) {
            // Keep preferred if client sent an out-of-scope subcat
            subcat = String(spec.preferredSubcat || '').slice(0, 120);
          }
        }
      }
    } catch (eMap) { /* merchant activities optional */ }

    const list = await readCatalog();
    const id = genCatalogId();
    // images: مصفوفة (حتى 6) — الحقل الجديد للمعرض. image: الصورة الأولى
    // منها، يبقى محدَّثاً لتوافق أي كود قديم يقرأ item.image فقط. يدعم
    // كلا المسارين: عميل جديد يرسل images[]، أو عميل قديم يرسل image واحدة.
    const maxPhotos = (ent.limits && ent.limits.maxPhotosPerItem) || 8;
    const maxImageBytes = resolveCatalogMaxImageBytes(ent);
    let catImages;
    try {
      if (Array.isArray(b.images) && b.images.length) {
        catImages = await saveCatalogImages(id, b.images, {
          maxCount: maxPhotos,
          maxImageBytes,
        });
      } else {
        const single = await saveCatalogImage(id, b.image, { maxImageBytes });
        catImages = single ? [single] : [];
      }
    } catch (imgErr) {
      if (isImageTooLargeErr(imgErr)) {
        return res.status(413).json({
          ok: false,
          error: 'image_too_large',
          maxBytes: imgErr.maxBytes || maxImageBytes,
        });
      }
      throw imgErr;
    }
    const attrs = (b.attrs && typeof b.attrs === 'object' && !Array.isArray(b.attrs))
      ? Object.keys(b.attrs).slice(0, 40).reduce(function (out, k) {
        const key = String(k || '').trim().slice(0, 48);
        if (!key) return out;
        out[key] = String(b.attrs[k]).slice(0, 200);
        return out;
      }, {})
      : {};
    // meta: قيم بسيطة فقط (لا كائنات متداخلة ولا مفاتيح خاصة)، بحجم محدود
    const metaRaw = (b.meta && typeof b.meta === 'object' && !Array.isArray(b.meta)) ? b.meta : {};
    const metaIn = Object.keys(metaRaw).slice(0, 30).reduce(function (out, k) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') return out;
      const v = metaRaw[k];
      if (v == null || ['string', 'number', 'boolean'].includes(typeof v)) out[String(k).slice(0, 48)] = typeof v === 'string' ? v.slice(0, 200) : v;
      return out;
    }, {});
    const rec = {
      id,
      accountId: b.accountId,
      storeId: String(b.storeId || b.accountId).slice(0, 60),
      accountType,
      activityId,
      kind: b.kind,
      // Accept title alias (estate dashboards) → name
      name: String(b.name || b.title || '').slice(0, 200),
      nameFr: String(b.nameFr || '').slice(0, 200),
      price: String(b.price || '').slice(0, 40),
      cat: String(b.cat || subcat || categoryId || '').slice(0, 80),
      categoryId,
      category: categoryId,
      categoryKey: categoryId,
      subCategoryId: subcat,
      subcat,
      topicId: String(b.topicId || '').slice(0, 48),
      brandId: String(b.brandId || '').slice(0, 48),
      brandName: String(b.brandName || '').slice(0, 80),
      brandNameFr: String(b.brandNameFr || '').slice(0, 80),
      modelId: String(b.modelId || '').slice(0, 48),
      modelName: String(b.modelName || '').slice(0, 80),
      modelNameFr: String(b.modelNameFr || '').slice(0, 80),
      desc: String(b.desc || '').slice(0, 3000),
      descFr: String(b.descFr || '').slice(0, 3000),
      duration: String(b.duration || '').slice(0, 80),
      cover: String(b.cover || '').slice(0, 500000),
      thumb: String(b.thumb || '').slice(0, 500000),
      attrs,
      meta: Object.assign({}, metaIn, {
        listingSource: 'dashboard_catalog',
        estate: !!(metaIn.estate || accountType === 'estate'),
      }),
      sellerContext: {
        storeId: String(b.storeId || b.accountId).slice(0, 60),
        // الاسم والشارات من سجل الحساب فقط — لا يقرّرها العميل (شارات مدفوعة)
        storeName: String(acc.name || '').slice(0, 120),
        accountType,
        badges: {
          verified: !!(acc.verified || acc.nniVerified),
          verifiedPlus: !!acc.verifiedPlus,
          trusted: !!acc.trusted,
        },
      },
      listingSource: 'dashboard_catalog',
      stock: String(b.stock || '').slice(0, 20),
      variants: String(b.variants || '').slice(0, 300),
      sizeStock: (function () {
        if (!b.sizeStock || typeof b.sizeStock !== 'object' || Array.isArray(b.sizeStock)) return null;
        var out = {};
        var keys = Object.keys(b.sizeStock).slice(0, 40);
        keys.forEach(function (k) {
          var key = String(k || '').trim().slice(0, 40);
          if (!key) return;
          var n = Number(b.sizeStock[k]);
          out[key] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
        });
        return Object.keys(out).length ? out : null;
      })(),
      sku: String(b.sku || '').slice(0, 64),
      unit: String(b.unit || '').slice(0, 40),
      images: catImages,
      image: catImages[0] || null,
      emoji: String(b.emoji || '').slice(0, 8),
      status: 'pending_review',
      // sold يُدار من الخادم/الأدمن فقط — لا يقبل تضخيماً من العميل عند الإنشاء
      sold: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(rec);
    await writeCatalog(list);
    res.json({ ok: true, item: rec });
    } catch (err) {
      if (isImageTooLargeErr(err)) {
        return res.status(413).json({
          ok: false,
          error: 'image_too_large',
          maxBytes: err.maxBytes || DEFAULT_CATALOG_MAX_IMAGE_BYTES,
        });
      }
      console.error('[catalog/post] image pipeline:', err.message);
      res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
    }
  });

  /** GET /api/catalog?accountId=...&kind=...&categoryId=...&subcat=... — عرض عام (active فقط) */
  app.get('/api/catalog', async (req, res) => {
    const q = req.query || {};
    let list = (await readCatalog()).filter((it) => it.status === 'active');
    if (q.accountId) list = list.filter((it) => it.accountId === q.accountId);
    if (q.kind) list = list.filter((it) => it.kind === q.kind);
    if (q.categoryId || q.category) {
      const cid = String(q.categoryId || q.category);
      list = list.filter((it) => (it.categoryId || it.category || it.categoryKey || '') === cid);
    }
    if (q.subcat || q.subCategoryId) {
      const sc = String(q.subcat || q.subCategoryId);
      list = list.filter((it) => (it.subcat || it.subCategoryId || '') === sc);
    }
    list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ ok: true, items: list });
  });

  /** GET /api/catalog/mine?accountId=... — كل عناصر صاحب الحساب (كل الحالات)، للوحة التحكم */
  app.get('/api/catalog/mine', async (req, res) => {
    const accountId = req.query.accountId;
    const token = extractAccountToken(req) || '';
    const acc = await verifyAccountOwner(accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const list = (await readCatalog()).filter((it) => it.accountId === accountId && it.status !== 'removed');
    res.json({ ok: true, items: list });
  });

  /** GET /api/catalog/admin/pending — عناصر الكتالوج بانتظار مراجعة الأدمن (لوحة الإشراف) */
  app.get('/api/catalog/admin/pending', async (req, res) => {
    if (!(await isCatalogAdmin(req))) return res.status(401).json({ error: 'unauthorized' });
    const items = (await readCatalog())
      .filter((it) => it.status === 'pending_review')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 200)
      .map((it) => ({
        id: it.id, accountId: it.accountId, kind: it.kind, name: it.name || it.title || '',
        price: it.price, image: it.image || null, createdAt: it.createdAt,
      }));
    res.json({ ok: true, items });
  });

  /** GET /api/catalog/:id — عام فقط للعناصر النشطة؛ المالك/الأدمن يريان الباقي */
  app.get('/api/catalog/:id', async (req, res) => {
    const item = (await readCatalog()).find((it) => it.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'item_not_found' });
    const isAdmin = await isCatalogAdmin(req);
    const token = extractAccountToken(req) || '';
    const isOwner = !!(item.accountId && await verifyAccountOwner(item.accountId, token));
    if (item.status !== 'active' && !isAdmin && !isOwner) {
      return res.status(404).json({ error: 'item_not_found' });
    }
    res.json({ ok: true, item });
  });

  /** PATCH /api/catalog/:id — تعديل من صاحب الحساب أو الأدمن */
  app.patch('/api/catalog/:id', async (req, res) => {
    try {
    const list = await readCatalog();
    const idx = list.findIndex((it) => it.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'item_not_found' });
    const item = list[idx];
    const isAdmin = await isCatalogAdmin(req);
    const token = req.header('x-account-token') || '';
    const isOwner = !!(item.accountId && await verifyAccountOwner(item.accountId, token));
    if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
    const b = req.body || {};
    if (!isAdmin) {
      const leak = catalogLeak(b);
      if (leak) return res.status(422).json(leak);
      if (Array.isArray(b.images) && b.images.length) {
        try {
          const ownerAcc = await require('../db/repos').accounts.getById(item.accountId);
          const entP = await getEntitlements(item.accountId, ownerAcc ? ownerAcc.type : 'store');
          assertPhotoCount(entP, b.images.length);
        } catch (gateErr) {
          return res.status(gateErr.status || 403).json({ ok: false, error: gateErr.message, code: gateErr.code, details: gateErr.details });
        }
      }
    }
    const contentChanged = ['name', 'nameFr', 'desc', 'descFr', 'title'].some((k) => typeof b[k] === 'string' && b[k] !== (item[k] || ''))
      || Array.isArray(b.images) || typeof b.image === 'string' || typeof b.cover === 'string';
    const editable = ['name', 'nameFr', 'price', 'cat', 'topicId', 'desc', 'descFr', 'stock', 'variants', 'sku', 'unit', 'emoji', 'brandId', 'brandName', 'brandNameFr', 'modelId', 'modelName', 'modelNameFr', 'duration', 'cover', 'thumb', 'categoryId', 'category', 'categoryKey', 'subCategoryId', 'subcat', 'activityId'];
    editable.forEach((k) => {
      if (typeof b[k] !== 'string') return;
      const max = (k === 'desc' || k === 'descFr') ? 3000
        : (k === 'cover' || k === 'thumb') ? 500000
        : (k === 'variants' ? 300 : (k === 'sku' ? 64 : (k === 'unit' ? 40 : (k === 'topicId' ? 48 : (k === 'cat' || k === 'categoryId' || k === 'category' || k === 'categoryKey' ? 80 : (k === 'subcat' || k === 'subCategoryId' ? 120 : 200))))));
      item[k] = b[k].slice(0, max);
    });
    if (typeof b.title === 'string' && b.title.trim() && !b.name) {
      item.name = String(b.title).slice(0, 200);
    }
    // Keep category aliases in sync
    if (b.categoryId || b.category || b.categoryKey) {
      const cid = String(b.categoryId || b.category || b.categoryKey).slice(0, 80);
      item.categoryId = cid;
      item.category = cid;
      item.categoryKey = cid;
    }
    if (b.subCategoryId || b.subcat) {
      const sc = String(b.subCategoryId || b.subcat).slice(0, 120);
      item.subCategoryId = sc;
      item.subcat = sc;
    }
    if (b.attrs && typeof b.attrs === 'object' && !Array.isArray(b.attrs)) {
      item.attrs = Object.keys(b.attrs).slice(0, 40).reduce(function (out, k) {
        const key = String(k || '').trim().slice(0, 48);
        if (!key) return out;
        out[key] = String(b.attrs[k]).slice(0, 200);
        return out;
      }, {});
    }
    if (b.meta && typeof b.meta === 'object' && !Array.isArray(b.meta)) {
      const metaPatch = Object.keys(b.meta).slice(0, 30).reduce(function (out, k) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') return out;
        const v = b.meta[k];
        if (v == null || ['string', 'number', 'boolean'].includes(typeof v)) out[String(k).slice(0, 48)] = typeof v === 'string' ? v.slice(0, 200) : v;
        return out;
      }, {});
      item.meta = Object.assign({}, item.meta || {}, metaPatch, { listingSource: 'dashboard_catalog' });
    }
    item.listingSource = 'dashboard_catalog';
    item.storeId = item.storeId || item.accountId;
    if (!item.accountType && isOwner) {
      const ownerAcc = await verifyAccountOwner(item.accountId, token);
      if (ownerAcc && ownerAcc.type) item.accountType = String(ownerAcc.type).slice(0, 24);
    }
    if (b.sizeStock === null) {
      item.sizeStock = null;
    } else if (b.sizeStock && typeof b.sizeStock === 'object' && !Array.isArray(b.sizeStock)) {
      var outSs = {};
      Object.keys(b.sizeStock).slice(0, 40).forEach(function (k) {
        var key = String(k || '').trim().slice(0, 40);
        if (!key) return;
        var n = Number(b.sizeStock[k]);
        outSs[key] = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      });
      item.sizeStock = Object.keys(outSs).length ? outSs : null;
    }
    // لا نسمح للمالك بتضخيم sold — للأدمن فقط
    if (isAdmin && typeof b.sold !== 'undefined' && Number.isFinite(Number(b.sold))) item.sold = Number(b.sold);
    if (Array.isArray(b.images) || typeof b.image === 'string') {
      const ownerAcc = await require('../db/repos').accounts.getById(item.accountId);
      const entImg = await getEntitlements(item.accountId, ownerAcc ? ownerAcc.type : 'store');
      const maxPhotos = (entImg.limits && entImg.limits.maxPhotosPerItem) || 8;
      const maxImageBytes = resolveCatalogMaxImageBytes(entImg);
      try {
        if (Array.isArray(b.images)) {
          if (!isAdmin) assertPhotoCount(entImg, b.images.length);
          item.images = await saveCatalogImages(item.id, b.images, { maxCount: maxPhotos, maxImageBytes });
          item.image = item.images[0] || null;
        } else if (typeof b.image === 'string') {
          item.image = await saveCatalogImage(item.id, b.image, { maxImageBytes });
          item.images = item.image ? [item.image] : [];
        }
      } catch (imgErr) {
        if (isImageTooLargeErr(imgErr)) {
          return res.status(413).json({
            ok: false,
            error: 'image_too_large',
            maxBytes: imgErr.maxBytes || maxImageBytes,
          });
        }
        throw imgErr;
      }
    }
    // مثل الإعلانات: المالك يدير inactive/removed فقط؛ active/pending_review للأدمن
    if (typeof b.status === 'string') {
      const ownerAllowed = ['inactive', 'removed'];
      const adminAllowed = ['active', 'inactive', 'pending_review', 'removed'];
      const allowed = isAdmin ? adminAllowed : ownerAllowed;
      if (allowed.includes(b.status)) item.status = b.status;
    }
    // تعديل محتوى عنصر منشور من صاحبه = مراجعة جديدة
    if (!isAdmin && contentChanged && item.status === 'active') item.status = 'pending_review';
    item.updatedAt = new Date().toISOString();
    list[idx] = item;
    await writeCatalog(list);
    res.json({ ok: true, item });
    } catch (err) {
      if (isImageTooLargeErr(err)) {
        return res.status(413).json({
          ok: false,
          error: 'image_too_large',
          maxBytes: err.maxBytes || DEFAULT_CATALOG_MAX_IMAGE_BYTES,
        });
      }
      console.error('[catalog/patch] image pipeline:', err.message);
      res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
    }
  });

  /** DELETE /api/catalog/:id — حذف ناعم (status='removed') */
  app.delete('/api/catalog/:id', async (req, res) => {
    const list = await readCatalog();
    const idx = list.findIndex((it) => it.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'item_not_found' });
    const item = list[idx];
    const isAdmin = await isCatalogAdmin(req);
    const token = req.header('x-account-token') || '';
    const isOwner = !!(item.accountId && await verifyAccountOwner(item.accountId, token));
    if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
    list[idx].status = 'removed';
    list[idx].updatedAt = new Date().toISOString();
    await writeCatalog(list);
    res.json({ ok: true });
  });
}

module.exports = { mountCatalogRoutes };
