/**
 * مسارات المناقصات (/api/tenders*) — نشر، تصفّح، عروض، مرفقات، إشراف، باقات.
 * مُستخرجة من server.js للصيانة — نفس العقود والسلوك.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

function genTenderId() {
  return 'TND_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}

function genBidId() {
  return 'BID_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountTendersRoutes(app, deps) {
  const {
    requireAdminAuth,
    requireAdminPermission,
    extractAccountToken,
    verifyAccountOwner,
    resolveOptionalAccountViewer,
    getTenderEntitlements,
    scanContactLeakFields,
    redactContactPatterns,
    saveTenderImages,
    saveTenderDocument,
    extractPdfTextFromDataUri,
    resolveTenderDocumentAbsPath,
    resolveTenderUploadAbsPath,
    buildSignedTenderAssetUrl,
    verifyTenderAssetSig,
    readAccounts,
    readTenders,
    writeTenders,
    syncAccountPackage,
    getAccountRecord,
  } = deps;

  const TENDER_PACKAGE_NAME = 'باقة المناقصة';
  const TENDER_ACTIVE_STATUSES = ['active', 'expiring_soon'];
  const TENDER_REQUIRES_PACKAGE = true;

  function resolveOptionalTenderViewer(req) {
    return resolveOptionalAccountViewer(req);
  }

  function getTenderAccessForViewer(accountId) {
    return getTenderEntitlements(accountId || null);
  }

  function hasTenderPaidAccess(accountId) {
    const ent = getTenderEntitlements(accountId);
    return !!(ent && ent.canSubmitProposals && ent.subscribed);
  }

  /** توافق مع الاستدعاءات القديمة — يعني اشتراك مدفوع فعّال (ليس تجريبي) */
  function hasTenderAccess(accountId) {
    return hasTenderPaidAccess(accountId);
  }

  // redactContactPatterns imported via deps from contactGate.js

  function resolveTenderOwnerContacts(t) {
    const owner = readAccounts().find((a) => a.id === t.ownerId) || {};
    const phone = String(t.ownerPhone || owner.phone || '').trim();
    const email = String(t.ownerEmail || owner.email || '').trim();
    const whatsapp = String(t.ownerWhatsApp || owner.whatsapp || phone || '').trim();
    return { phone, email, whatsapp };
  }

  function isTenderPubliclyOpen(t) {
    if (!t) return false;
    if (t.status !== 'open' && t.status !== 'provisionally_approved') return false;
    const deadlineMs = new Date(t.deadline).getTime();
    return !Number.isNaN(deadlineMs) && deadlineMs > Date.now();
  }

  function filterPublicOpenTenders(list) {
    return (list || []).filter(isTenderPubliclyOpen);
  }

  function TENDER_PUBLIC_ACCESS_FALLBACK() {
    return getTenderEntitlements(null);
  }

  function toPublicTender(t, access, viewerId) {
    const now = Date.now();
    const deadlineMs = new Date(t.deadline).getTime();
    const ent = access || TENDER_PUBLIC_ACCESS_FALLBACK();
    const contactsUnlocked = !!ent.canUnlockContacts;
    const contacts = resolveTenderOwnerContacts(t);
    const rawImages = Array.isArray(t.images) ? t.images : [];
    const imageCount = rawImages.length;
    const hasDocument = !!t.document;
    const publicImages = (contactsUnlocked && viewerId)
      ? rawImages.map((_, i) => buildSignedTenderAssetUrl(
        '/api/tenders/' + t.id + '/images/' + i,
        viewerId,
        t.id,
        'img:' + i
      ))
      : [];
    const documentUrl = (contactsUnlocked && hasDocument)
      ? (viewerId
        ? buildSignedTenderAssetUrl('/api/tenders/' + t.id + '/document', viewerId, t.id, 'doc:0')
        : '/api/tenders/' + t.id + '/document')
      : null;
    return {
      id: t.id,
      title: contactsUnlocked ? t.title : redactContactPatterns(t.title),
      desc: contactsUnlocked ? t.desc : redactContactPatterns(t.desc),
      category: t.category,
      city: t.city,
      budgetMin: t.budgetMin,
      budgetMax: t.budgetMax,
      deadline: t.deadline,
      images: publicImages,
      imagesLocked: !contactsUnlocked && imageCount > 0,
      imageCount: imageCount,
      hasDocument,
      documentLocked: !contactsUnlocked && hasDocument,
      documentUrl,
      documentName: hasDocument ? (t.documentName || 'tender-document.pdf') : null,
      ownerName: t.ownerName,
      ownerId: t.ownerId || null,
      createdAt: t.createdAt,
      status: t.status || 'open',
      provisionalTier: t.provisionalTier || null,
      provisionalLabelAr: t.provisionalLabelAr || null,
      provisionalAutoApproved: !!t.provisionalAutoApproved,
      bidsCount: Array.isArray(t.bids) ? t.bids.length : 0,
      isOpen: !Number.isNaN(deadlineMs) && deadlineMs > now && (t.status === 'open' || t.status === 'provisionally_approved'),
      contactsLocked: !contactsUnlocked,
      ownerPhone: contactsUnlocked ? (contacts.phone || null) : null,
      ownerEmail: contactsUnlocked ? (contacts.email || null) : null,
      ownerWhatsApp: contactsUnlocked ? (contacts.whatsapp || null) : null,
      canSubmitBid: !!ent.canSubmitProposals,
    };
  }

  function rejectTenderContactLeak(res, scan, field) {
    return res.status(422).json({
      error: 'contact_in_text_forbidden',
      field: field || (scan.fields && scan.fields[0] && scan.fields[0].field) || 'text',
      hits: scan.hits || [],
      fields: scan.fields || [],
      msg: scan.messageAr,
      msg_fr: scan.messageFr,
    });
  }

  function streamTenderDocumentFile(t, res) {
    const absPath = resolveTenderDocumentAbsPath(t.document);
    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'document_not_found' });
    }
    const name = (t.documentName || 'tender-document.pdf').replace(/[^\w.\-()\u0600-\u06FF ]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + name + '"');
    fs.createReadStream(absPath).pipe(res);
  }

  function canAccessTenderAsset(req, t, viewerId, access, assetKey) {
    if (!t) return false;
    const token = extractAccountToken(req) || '';
    if (viewerId && verifyAccountOwner(viewerId, token)) {
      if (t.ownerId === viewerId) return true;
      if (access && access.canUnlockContacts && isTenderPubliclyOpen(t)) return true;
    }
    const qViewer = String(req.query.viewer || '');
    const qExp = Number(req.query.exp);
    const qSig = String(req.query.sig || '');
    if (qViewer && assetKey && verifyTenderAssetSig(qViewer, t.id, assetKey, qExp, qSig)) {
      if (t.ownerId === qViewer) return true;
      const qAccess = getTenderAccessForViewer(qViewer);
      if (qAccess.canUnlockContacts && isTenderPubliclyOpen(t)) return true;
    }
    return false;
  }

  function streamTenderImageFile(t, index, res) {
    const rawImages = Array.isArray(t.images) ? t.images : [];
    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= rawImages.length) {
      return res.status(404).json({ error: 'image_not_found' });
    }
    const absPath = resolveTenderUploadAbsPath(rawImages[idx]);
    if (!absPath || !fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'image_not_found' });
    }
    const ext = path.extname(absPath).toLowerCase();
    const type = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/webp';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fs.createReadStream(absPath).pipe(res);
  }

  const tenderPostLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'عدد كبير جداً من المناقصات المنشورة — حاول مرة أخرى بعد قليل' },
  });
  const tenderBidLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'عدد كبير جداً من العروض المقدَّمة — حاول مرة أخرى بعد قليل' },
  });
  const tenderAssetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'عدد كبير من طلبات تحميل مرفقات المناقصة — حاول لاحقاً' },
  });

  /**
   * POST /api/tenders — نشر مناقصة جديدة. يتطلب x-account-token + accountId
   * صالحين، وباقة "غرفة المناقصات" فعّالة على الحساب (وإلا 403 برسالة واضحة).
   */
  app.post('/api/tenders', tenderPostLimiter, async (req, res) => {
    try {
    const b = req.body || {};
    const token = req.header('x-account-token') || '';
    const acc = verifyAccountOwner(b.accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    if (!hasTenderPaidAccess(b.accountId)) {
      return res.status(403).json({ error: 'tender_package_required', msg: 'تحتاج باقة مدفوعة فعّالة لنشر مناقصة — الباقة التجريبية للتصفّح فقط' });
    }
    if (!b.title || !b.deadline) return res.status(400).json({ error: 'title و deadline مطلوبان' });
    const title = String(b.title).slice(0, 150);
    const desc = String(b.desc || '').slice(0, 1500);
    const leakScan = scanContactLeakFields([
      { key: 'title', val: title },
      { key: 'desc', val: desc },
    ]);
    if (leakScan.hasLeak) return rejectTenderContactLeak(res, leakScan);
    if (b.document) {
      const pdfExtract = await extractPdfTextFromDataUri(b.document);
      if (pdfExtract.error) {
        return res.status(400).json({ error: 'invalid_pdf', message: 'ملف PDF غير صالح أو أكبر من 5MB' });
      }
      const pdfScan = scanContactLeakFields([{ key: 'document', val: pdfExtract.text }]);
      if (pdfScan.hasLeak) return rejectTenderContactLeak(res, pdfScan, 'document');
    }
    const deadlineMs = new Date(b.deadline).getTime();
    if (Number.isNaN(deadlineMs) || deadlineMs <= Date.now()) {
      return res.status(400).json({ error: 'الموعد النهائي يجب أن يكون تاريخاً صالحاً في المستقبل' });
    }
    const tenderId = genTenderId();
    const tenderDraft = {
      id: tenderId,
      ownerId: acc.id,
      ownerName: acc.name || '',
      ownerPhone: String(acc.phone || '').slice(0, 40),
      ownerEmail: String(acc.email || '').slice(0, 120),
      ownerWhatsApp: String(acc.whatsapp || acc.phone || '').slice(0, 40),
      title,
      desc,
      category: String(b.category || '').slice(0, 40),
      city: String(b.city || '').slice(0, 60),
      budgetMin: Number(b.budgetMin) || 0,
      budgetMax: Number(b.budgetMax) || 0,
      deadline: new Date(deadlineMs).toISOString(),
      // صور مرجعية اختيارية — تُراجع مع المناقصة قبل النشر العام
      images: await saveTenderImages(tenderId, b.images),
      document: await saveTenderDocument(tenderId, b.document),
      documentName: b.document ? String(b.documentName || 'tender-document.pdf').slice(0, 120) : null,
      createdAt: new Date().toISOString(),
      bids: [],
    };
    const { scoreTender, shouldAutoApprove } = require('../services/provisionalTier');
    const score = scoreTender(tenderDraft);
    const auto = shouldAutoApprove(score.provisionalTier);
    const tender = Object.assign({}, tenderDraft, {
      status: auto ? 'provisionally_approved' : 'pending_review',
      provisionalTier: score.provisionalTier,
      provisionalLabelAr: score.provisionalLabelAr,
      provisionalLabelFr: score.provisionalLabelFr,
      provisionalReasons: score.provisionalReasons,
      provisionalAt: score.provisionalAt,
      provisionalBy: score.provisionalBy,
      provisionalAutoApproved: auto,
      approvedAt: auto ? new Date().toISOString() : null,
      approvedBy: auto ? 'tenders_agent' : null,
    });
    const list = readTenders();
    list.unshift(tender);
    writeTenders(list);
    setImmediate(() => {
      try {
        const { sendTelegramAdminNotification } = require('../services/telegramAdmin');
        const tierEmoji = score.provisionalTier === 'green' ? '🟢' : (score.provisionalTier === 'yellow' ? '🟡' : '🔴');
        const reason = auto
          ? (tierEmoji + ' مناقصة «' + tender.title + '» — موافقة مبدئية تلقائية من وكيل المناقصات (قابلة للنقض)')
          : (tierEmoji + ' مناقصة «' + tender.title + '» — معلّقة بانتظارك (' + (score.provisionalLabelAr || score.provisionalTier) + ')');
        sendTelegramAdminNotification({
          leadId: tender.id,
          businessName: tender.ownerName,
          whatsapp: acc.phone || acc.whatsapp || '',
          package: tender.category || 'غرفة المناقصات',
          reason,
          channel: 'tender_review',
        }).catch((err) => console.warn('[tenders/post] telegram:', err && err.message));
      } catch (e) { /* telegram optional */ }
    });
    res.json({
      ok: true,
      pendingReview: !auto,
      provisionalTier: score.provisionalTier,
      provisionalLabel: score.provisionalLabelAr,
      autoApproved: auto,
      tender: toPublicTender(tender, getTenderAccessForViewer(b.accountId), b.accountId),
      msg: auto
        ? 'موافقة مبدئية من وكيل المناقصات — نُشرت بصفة مبدئية (قابلة للمراجعة).'
        : 'تم استلام مناقصتك — معلّقة بانتظار مراجعة Limam (لبس أو شبهة).',
    });
    } catch (err) {
      console.error('[tenders/post] upload pipeline:', err.message);
      if (err.code === 'invalid_pdf') {
        return res.status(400).json({ error: 'invalid_pdf', message: 'ملف PDF غير صالح أو أكبر من 5MB' });
      }
      res.status(400).json({ error: 'image_processing_failed', message: 'تعذّر معالجة المرفقات — تأكد من صحة الصور وملف PDF' });
    }
  });

  /**
   * GET /api/tenders/public-stats — عام بالكامل، بلا مصادقة.
   * يعرض عدد المناقصات المفتوحة + فئات آخر 3 مناقصات فقط (بلا حقول حسّاسة).
   */
  app.get('/api/tenders/public-stats', (req, res) => {
    const openList = filterPublicOpenTenders(readTenders());
    const recentCategories = openList.slice(0, 3).map((t) => t.category).filter(Boolean);
    res.json({ ok: true, count: openList.length, recentCategories });
  });

  /**
   * GET /api/tenders — تصفّح عام للمناقصات المفتوحة مع حماية بيانات التواصل.
   * الزائر/التجريبي يرى العنوان والوصف والمتطلبات؛ أرقام التواصل مخفية/مُشفّرة.
   * المشترك المدفوع يكشف التواصل ويمكنه تقديم العروض. يدعم ?cat=&city=
   */
  app.get('/api/tenders', (req, res) => {
    const viewerId = resolveOptionalTenderViewer(req);
    const access = getTenderAccessForViewer(viewerId);
    const { cat, city } = req.query || {};
    let list = filterPublicOpenTenders(readTenders());
    if (cat) list = list.filter((t) => t.category === cat);
    if (city) list = list.filter((t) => t.city === city);
    res.json({
      ok: true,
      tenders: list.map((t) => toPublicTender(t, access, viewerId)),
      access: {
        contactsUnlocked: !!access.canUnlockContacts,
        canSubmitBid: !!access.canSubmitProposals,
        canPost: !!access.canPostTenders,
        isTrial: !!access.isTrial,
        subscribed: !!access.subscribed,
        planType: access.planType,
      },
    });
  });

  /**
   * POST /api/tenders/:id/bids — تقديم عرض على مناقصة. يتطلب x-account-token +
   * accountId صالحين، وباقة "غرفة المناقصات" فعّالة. لا يمكن لصاحب المناقصة
   * تقديم عرض على مناقصته هو نفسها. العرض لا يظهر لأي أحد إلا صاحب المناقصة.
   */
  app.post('/api/tenders/:id/bids', tenderBidLimiter, (req, res) => {
    const b = req.body || {};
    const token = req.header('x-account-token') || '';
    const acc = verifyAccountOwner(b.accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    if (!hasTenderPaidAccess(b.accountId)) {
      return res.status(403).json({ error: 'tender_package_required', msg: 'تحتاج باقة مدفوعة فعّالة لتقديم عرض — الباقة التجريبية للتصفّح فقط' });
    }
    const bidderAccess = getTenderAccessForViewer(b.accountId);
    const list = readTenders();
    const idx = list.findIndex((t) => t.id === req.params.id && t.status !== 'removed');
    if (idx === -1) return res.status(404).json({ error: 'tender_not_found' });
    const t = list[idx];
    if (t.status !== 'open') {
      return res.status(400).json({ error: 'tender_not_open', msg: 'هذه المناقصة غير متاحة لتقديم العروض حالياً' });
    }
    if (t.ownerId === acc.id) return res.status(400).json({ error: 'cannot_bid_own_tender' });
    const deadlineMs = new Date(t.deadline).getTime();
    if (Number.isNaN(deadlineMs) || deadlineMs <= Date.now()) {
      return res.status(400).json({ error: 'tender_closed', msg: 'انتهت مهلة تقديم العروض على هذه المناقصة' });
    }
    if (!b.price) return res.status(400).json({ error: 'price مطلوب' });
    const notes = String(b.notes || '').slice(0, 500);
    const bidderName = String(acc.name || '').slice(0, 80);
    const bidLeakScan = scanContactLeakFields([
      { key: 'notes', val: notes },
      { key: 'bidderName', val: bidderName },
    ]);
    if (bidLeakScan.hasLeak) return rejectTenderContactLeak(res, bidLeakScan, bidLeakScan.fields[0] && bidLeakScan.fields[0].field);
    const bid = {
      id: genBidId(),
      bidderId: acc.id,
      bidderName,
      price: Number(b.price) || 0,
      deliveryDays: Number(b.deliveryDays) || 0,
      notes,
      priority: !!bidderAccess.priorityPlacement,
      createdAt: new Date().toISOString(),
    };
    if (!Array.isArray(t.bids)) t.bids = [];
    t.bids.push(bid);
    if (bid.priority && t.bids.length > 1) {
      t.bids.sort((a, b2) => {
        if (!!a.priority !== !!b2.priority) return a.priority ? -1 : 1;
        return new Date(a.createdAt).getTime() - new Date(b2.createdAt).getTime();
      });
    }
    list[idx] = t;
    writeTenders(list);
    res.json({ ok: true });
  });

  /**
   * GET /api/tenders/mine — مناقصاتي (اللي نشرتها أنا) + كل العروض المقدَّمة
   * عليها كاملة. يتطلب x-account-token + accountId مطابقين.
   */
  app.get('/api/tenders/mine', (req, res) => {
    const accountId = req.query.accountId || '';
    const token = extractAccountToken(req) || '';
    const acc = verifyAccountOwner(accountId, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const mine = readTenders().filter((t) => t.ownerId === accountId && t.status !== 'removed');
    res.json({ ok: true, tenders: mine });
  });

  /**
   * GET /api/tenders/admin — أدمين فقط (سرّ مشترك) — كل المناقصات بكل حقولها
   * (بما فيها العروض) لأغراض المراجعة/إزالة السبام.
   */
  app.get('/api/tenders/admin', requireAdminPermission('tenders'), (req, res) => {
    res.json({ ok: true, tenders: readTenders() });
  });

  /**
   * GET /api/tenders/:id/document — تحميل ملف PDF للمناقصة (مشتركون مدفوعون أو صاحب المناقصة)
   */
  app.get('/api/tenders/:id/document', tenderAssetLimiter, (req, res) => {
    const viewerId = resolveOptionalTenderViewer(req);
    const access = getTenderAccessForViewer(viewerId);
    const t = readTenders().find((x) => x.id === req.params.id && x.status !== 'removed');
    if (!t || !t.document) return res.status(404).json({ error: 'document_not_found' });
    if (!canAccessTenderAsset(req, t, viewerId, access, 'doc:0')) {
      return res.status(403).json({
        error: 'document_locked',
        msg: 'ملف المناقصة متاح للمشتركين فقط — اشترك لتحميله',
        msg_fr: 'Document réservé aux abonnés — abonnez-vous pour le télécharger',
      });
    }
    return streamTenderDocumentFile(t, res);
  });

  /**
   * GET /api/tenders/:id/images/:index — صورة مرجعية (مشتركون أو صاحب المناقصة)
   */
  app.get('/api/tenders/:id/images/:index', tenderAssetLimiter, (req, res) => {
    const viewerId = resolveOptionalTenderViewer(req);
    const access = getTenderAccessForViewer(viewerId);
    const t = readTenders().find((x) => x.id === req.params.id && x.status !== 'removed');
    if (!t) return res.status(404).json({ error: 'tender_not_found' });
    const assetKey = 'img:' + req.params.index;
    if (!canAccessTenderAsset(req, t, viewerId, access, assetKey)) {
      return res.status(403).json({
        error: 'images_locked',
        msg: 'الصور المرجعية متاحة للمشتركين فقط',
        msg_fr: 'Photos réservées aux abonnés',
      });
    }
    return streamTenderImageFile(t, req.params.index, res);
  });

  /**
   * GET /api/tenders/admin/:id/document — أدمين — مراجعة ملف PDF
   */
  app.get('/api/tenders/admin/:id/document', requireAdminPermission('tenders'), (req, res) => {
    const t = readTenders().find((x) => x.id === req.params.id && x.status !== 'removed');
    if (!t || !t.document) return res.status(404).json({ error: 'document_not_found' });
    return streamTenderDocumentFile(t, res);
  });

  /**
   * GET /api/tenders/admin/:id/images/:index — أدمين — مراجعة صورة
   */
  app.get('/api/tenders/admin/:id/images/:index', requireAdminPermission('tenders'), (req, res) => {
    const t = readTenders().find((x) => x.id === req.params.id && x.status !== 'removed');
    if (!t) return res.status(404).json({ error: 'tender_not_found' });
    return streamTenderImageFile(t, req.params.index, res);
  });

  /**
   * GET /api/tenders/:id — محجوب أيضاً خلف نفس باقة "غرفة المناقصات" (تفاصيل
   * مناقصة واحدة، بلا عروض).
   * ⚠️ إصلاح جوهري 03/08/2026 (اكتُشف أثناء اختبار تجريبي شامل): كان هذا
   * المسار مُسجَّلاً في Express *قبل* /api/tenders/mine و/api/tenders/admin.
   * express يطابق المسارات بترتيب التسجيل لا بالتحديد — أي طلب لـ /api/tenders/
   * mine أو /api/tenders/admin كان يقع فعلياً هنا (يُعامَل "mine"/"admin" كقيمة
   * :id) ويُطبَّق عليه بوابة "غرفة المناقصات" الخاطئة بدل بوابته الحقيقية. أي
   * أن لوحة إشراف المناقصات في rizq_admin.html ولوحة "مناقصاتي" لدى التاجر لم
   * تعملا فعلياً من قبل. الإصلاح: نقل هذا المسار العام (:id) ليُسجَّل بعد كل
   * المسارات الثابتة الأكثر تحديداً (mine/admin) — قاعدة عامة في Express: أي
   * مسار به معامل (:id) يجب أن يُسجَّل دائماً بعد كل المسارات الثابتة المشابهة.
   */
  app.get('/api/tenders/:id', (req, res) => {
    const viewerId = resolveOptionalTenderViewer(req);
    const access = getTenderAccessForViewer(viewerId);
    const t = readTenders().find((x) => x.id === req.params.id && x.status !== 'removed');
    if (!t || !isTenderPubliclyOpen(t)) return res.status(404).json({ error: 'tender_not_found' });
    res.json({
      ok: true,
      tender: toPublicTender(t, access, viewerId),
      access: {
        contactsUnlocked: !!access.canUnlockContacts,
        canSubmitBid: !!access.canSubmitProposals,
        canPost: !!access.canPostTenders,
        isTrial: !!access.isTrial,
        subscribed: !!access.subscribed,
        planType: access.planType,
      },
    });
  });

  /**
   * POST /api/tenders/admin/:id/reject — أدمين — رفض مناقصة مع سبب (لا تُعرض علناً)
   */
  app.post('/api/tenders/admin/:id/reject', requireAdminPermission('tenders'), (req, res) => {
    const b = req.body || {};
    const reason = String(b.reason || b.msg || '').trim().slice(0, 500);
    if (!reason) return res.status(400).json({ error: 'reason_required', msg: 'سبب الرفض مطلوب' });
    const list = readTenders();
    const idx = list.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'tender_not_found' });
    if (list[idx].status === 'removed') return res.status(400).json({ error: 'tender_removed' });
    list[idx].status = 'rejected';
    list[idx].rejectReason = reason;
    list[idx].rejectedAt = new Date().toISOString();
    list[idx].rejectedBy = (req.adminUser && req.adminUser.name) || (req.adminUser && req.adminUser.user) || 'admin';
    writeTenders(list);
    res.json({ ok: true, tender: list[idx] });
  });

  /**
   * POST /api/tenders/admin/:id/remove — أدمين فقط — يخفي مناقصة نهائياً من كل
   * الواجهات العامة (سبام/محتوى مخالف) دون حذف السجل فعلياً (نفس مبدأ عدم
   * الحذف النهائي المتَّبع في بقية المنصة).
   */
  app.post('/api/tenders/admin/:id/remove', requireAdminPermission('tenders'), (req, res) => {
    const list = readTenders();
    const idx = list.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'tender_not_found' });
    list[idx].status = 'removed';
    writeTenders(list);
    res.json({ ok: true });
  });

  /**
   * POST /api/tenders/admin/:id/approve — أدمين فقط — يُفعّل مناقصة pending_review
   */
  app.post('/api/tenders/admin/:id/approve', requireAdminPermission('tenders'), (req, res) => {
    const list = readTenders();
    const idx = list.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'tender_not_found' });
    if (list[idx].status === 'removed') return res.status(400).json({ error: 'tender_removed' });
    list[idx].status = 'open';
    list[idx].approvedAt = new Date().toISOString();
    list[idx].approvedBy = (req.adminUser && req.adminUser.name) || (req.adminUser && req.adminUser.user) || 'admin';
    list[idx].humanOverride = true;
    list[idx].provisionalAutoApproved = false;
    writeTenders(list);
    res.json({ ok: true, tender: list[idx] });
  });

  /**
   * POST /api/tenders/package/activate — أدمين فقط (سرّ مشترك) — يُفعّل/يجدّد
   * اشتراك "باقة المناقصة" لحساب معيّن بعد موافقة الأدمن على طلب اشتراك حقيقي
   * (rizq_sub_requests بفئة category:'tender'). يُستخدَم مفتاح معزول
   * (accountId + '::tender') داخل مخزن account-packages.json حتى لا يتصادم
   * إطلاقاً مع سجل الباقة العامة لنفس الحساب (راجع تعليق hasTenderAccess أعلاه
   * لتفصيل سبب هذا العزل). يدعم التجريبية (10 أيام) والباقات المدفوعة.
   */
  app.post('/api/tenders/package/activate', requireAdminPermission('payments'), async (req, res) => {
    const b = req.body || {};
    if (!b.accountId) return res.status(400).json({ error: 'accountId مطلوب' });
    const { findCatalogPackage, isTrialPackage } = require('../services/catalogConfig');
    const pkgName = b.pkgName || TENDER_PACKAGE_NAME;
    const pkgDef = findCatalogPackage(b.packageId || pkgName);
    const days = Number(b.days) || (pkgDef && pkgDef.durationDays) || 30;
    const price = Number(b.price) || (pkgDef && pkgDef.price) || 0;
    const isTrial = b.isTrial === true || isTrialPackage((pkgDef && pkgDef.name) || pkgName, price);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + days * 86400000);
    try {
      const result = await syncAccountPackage({
        accountId: b.accountId + '::tender',
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
      console.error('[tenders/package/activate] error:', err.message);
      res.status(500).json({ error: 'فشل تفعيل باقة المناقصة' });
    }
  });

  /**
   * GET /api/tenders/package/status/:id — حالة اشتراك "باقة المناقصة" لحساب
   * معيّن، من طرف صاحب الحساب نفسه فقط (x-account-token يطابق accessToken
   * الحقيقي في accounts.json — نفس نمط /api/accounts/mine/:id). لا يستخدم
   * سرّ الأدمن العام لأن هذه النقطة تُستدعى من داشبورد المشترك مباشرة.
   */
  app.get('/api/tenders/package/status/:id', (req, res) => {
    const token = extractAccountToken(req) || '';
    const acc = verifyAccountOwner(req.params.id, token);
    if (!acc) return res.status(401).json({ error: 'unauthorized' });
    const ent = getTenderEntitlements(req.params.id);
    const rec = getAccountRecord(req.params.id + '::tender');
    const safeRec = rec ? (() => { const { accessToken, ...rest } = rec; return rest; })() : null;
    res.json({
      ok: true,
      subscribed: !!ent.subscribed,
      isTrial: !!ent.isTrial,
      contactsUnlocked: !!ent.canUnlockContacts,
      canSubmitBid: !!ent.canSubmitProposals,
      canPost: !!ent.canPostTenders,
      planType: ent.planType,
      pkgName: ent.pkgName || null,
      record: safeRec,
    });
  });
}

module.exports = { mountTendersRoutes };
