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
  } = deps;

  /**
   * POST /api/catalog — إضافة منتج/خدمة (صاحب الحساب فقط عبر x-account-token)
   */
  app.post('/api/catalog', async (req, res) => {
    try {
    const b = req.body || {};
    const token = req.header('x-account-token') || '';
    const acc = verifyAccountOwner(b.accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'الاسم مطلوب' });
    if (!['product', 'service'].includes(b.kind)) return res.status(400).json({ error: "kind يجب أن يكون 'product' أو 'service'" });
    const ent = getEntitlements(b.accountId, acc.type);
    const activeCount = readCatalog().filter((it) => it.accountId === b.accountId && it.status === 'active').length;
    const imageCount = Array.isArray(b.images) ? b.images.length : (b.image ? 1 : 0);
    try {
      assertCanAddCatalogItem(ent, activeCount);
      if (imageCount) assertPhotoCount(ent, imageCount);
    } catch (gateErr) {
      return res.status(gateErr.status || 403).json({ ok: false, error: gateErr.message, code: gateErr.code, details: gateErr.details });
    }
    const list = readCatalog();
    const id = genCatalogId();
    // images: مصفوفة (حتى 6) — الحقل الجديد للمعرض. image: الصورة الأولى
    // منها، يبقى محدَّثاً لتوافق أي كود قديم يقرأ item.image فقط. يدعم
    // كلا المسارين: عميل جديد يرسل images[]، أو عميل قديم يرسل image واحدة.
    let catImages;
    if (Array.isArray(b.images) && b.images.length) {
      catImages = await saveCatalogImages(id, b.images);
    } else {
      const single = await saveCatalogImage(id, b.image);
      catImages = single ? [single] : [];
    }
    const rec = {
      id,
      accountId: b.accountId,
      kind: b.kind,
      name: String(b.name).slice(0, 200),
      nameFr: String(b.nameFr || '').slice(0, 200),
      price: String(b.price || '').slice(0, 40),
      cat: String(b.cat || '').slice(0, 80),
      desc: String(b.desc || '').slice(0, 3000),
      descFr: String(b.descFr || '').slice(0, 3000),
      stock: String(b.stock || '').slice(0, 20),
      variants: String(b.variants || '').slice(0, 300),
      images: catImages,
      image: catImages[0] || null,
      emoji: String(b.emoji || '').slice(0, 8),
      status: 'pending_review',
      sold: Number.isFinite(Number(b.sold)) ? Number(b.sold) : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(rec);
    writeCatalog(list);
    res.json({ ok: true, item: rec });
    } catch (err) {
      console.error('[catalog/post] image pipeline:', err.message);
      res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
    }
  });

  /** GET /api/catalog?accountId=...&kind=... — عرض عام (فقط status active) لصفحات المتجر/المكتب/الشركة */
  app.get('/api/catalog', (req, res) => {
    const q = req.query || {};
    let list = readCatalog().filter((it) => it.status === 'active');
    if (q.accountId) list = list.filter((it) => it.accountId === q.accountId);
    if (q.kind) list = list.filter((it) => it.kind === q.kind);
    list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ ok: true, items: list });
  });

  /** GET /api/catalog/mine?accountId=... — كل عناصر صاحب الحساب (كل الحالات)، للوحة التحكم */
  app.get('/api/catalog/mine', (req, res) => {
    const accountId = req.query.accountId;
    const token = extractAccountToken(req) || '';
    const acc = verifyAccountOwner(accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const list = readCatalog().filter((it) => it.accountId === accountId && it.status !== 'removed');
    res.json({ ok: true, items: list });
  });

  /** GET /api/catalog/:id — عام فقط للعناصر النشطة؛ المالك/الأدمن يريان الباقي */
  app.get('/api/catalog/:id', (req, res) => {
    const item = readCatalog().find((it) => it.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'item_not_found' });
    const isAdmin = isAdminRequest(req);
    const token = extractAccountToken(req) || '';
    const isOwner = !!(item.accountId && verifyAccountOwner(item.accountId, token));
    if (item.status !== 'active' && !isAdmin && !isOwner) {
      return res.status(404).json({ error: 'item_not_found' });
    }
    res.json({ ok: true, item });
  });

  /** PATCH /api/catalog/:id — تعديل من صاحب الحساب أو الأدمن */
  app.patch('/api/catalog/:id', async (req, res) => {
    try {
    const list = readCatalog();
    const idx = list.findIndex((it) => it.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'item_not_found' });
    const item = list[idx];
    const isAdmin = isAdminRequest(req);
    const token = req.header('x-account-token') || '';
    const isOwner = !!(item.accountId && verifyAccountOwner(item.accountId, token));
    if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
    const b = req.body || {};
    const editable = ['name', 'nameFr', 'price', 'cat', 'desc', 'descFr', 'stock', 'variants', 'emoji'];
    editable.forEach((k) => { if (typeof b[k] === 'string') item[k] = b[k].slice(0, (k === 'desc' || k === 'descFr') ? 3000 : 200); });
    // لا نسمح للمالك بتضخيم sold — للأدمن فقط
    if (isAdmin && typeof b.sold !== 'undefined' && Number.isFinite(Number(b.sold))) item.sold = Number(b.sold);
    if (Array.isArray(b.images)) {
      item.images = await saveCatalogImages(item.id, b.images);
      item.image = item.images[0] || null;
    } else if (typeof b.image === 'string') {
      item.image = await saveCatalogImage(item.id, b.image);
      item.images = item.image ? [item.image] : [];
    }
    // مثل الإعلانات: المالك يدير inactive/removed فقط؛ active/pending_review للأدمن
    if (typeof b.status === 'string') {
      const ownerAllowed = ['inactive', 'removed'];
      const adminAllowed = ['active', 'inactive', 'pending_review', 'removed'];
      const allowed = isAdmin ? adminAllowed : ownerAllowed;
      if (allowed.includes(b.status)) item.status = b.status;
    }
    item.updatedAt = new Date().toISOString();
    list[idx] = item;
    writeCatalog(list);
    res.json({ ok: true, item });
    } catch (err) {
      console.error('[catalog/patch] image pipeline:', err.message);
      res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة الصور — تأكد من أن الملفات صور صالحة' });
    }
  });

  /** DELETE /api/catalog/:id — حذف ناعم (status='removed') */
  app.delete('/api/catalog/:id', (req, res) => {
    const list = readCatalog();
    const idx = list.findIndex((it) => it.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'item_not_found' });
    const item = list[idx];
    const isAdmin = isAdminRequest(req);
    const token = req.header('x-account-token') || '';
    const isOwner = !!(item.accountId && verifyAccountOwner(item.accountId, token));
    if (!isAdmin && !isOwner) return res.status(401).json({ error: 'unauthorized' });
    list[idx].status = 'removed';
    list[idx].updatedAt = new Date().toISOString();
    writeCatalog(list);
    res.json({ ok: true });
  });
}

module.exports = { mountCatalogRoutes };
