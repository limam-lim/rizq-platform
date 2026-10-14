/**
 * غرفة الطلبات الاحترافية — /api/service-requests*
 * طلبات منظمة من واجهة المكتب/المحل/المعرض → داشبورد المشترك.
 * مرفقات اختيارية (صورة/PDF) تُحفظ على المنصة — أثر ثابت لحماية الطرفين.
 */
'use strict';

const crypto = require('crypto');
const path = require('path');
const rateLimit = require('express-rate-limit');
const {
  storeServiceDoc,
  resolveServiceDocAbsolute,
  publicAttachmentMeta,
  MAX_PER_REQUEST,
  MAX_BYTES,
} = require('../services/serviceRequestDocs');

const STATUSES = ['new', 'in_progress', 'done', 'rejected'];
const ACCOUNT_TYPES = ['office', 'store', 'corp', 'individual'];
const SOURCES = ['office', 'store', 'showroom', 'corp', 'cart', 'public'];
const DOCS_CHANNELS = ['whatsapp', 'email', 'both', 'platform'];

function genId() {
  return 'SRQ-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex');
}

function clip(v, n) {
  return String(v == null ? '' : v).trim().slice(0, n);
}

function normalizePhone(v) {
  return clip(v, 40).replace(/[^\d+]/g, '').slice(0, 40);
}

function isLikelyPhone(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d.length >= 8 && d.length <= 15;
}

function isLikelyEmail(v) {
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).slice(0, 120));
}

function collectAttachmentInputs(body) {
  const out = [];
  const names = [];
  if (Array.isArray(body.attachments)) {
    body.attachments.forEach((item, i) => {
      if (typeof item === 'string') {
        out.push(item);
        names.push((body.attachmentNames && body.attachmentNames[i]) || '');
      } else if (item && typeof item === 'object' && (item.data || item.dataUrl || item.base64)) {
        out.push(item.data || item.dataUrl || item.base64);
        names.push(item.name || item.originalName || '');
      }
    });
  }
  if (typeof body.attachment === 'string' && body.attachment) {
    out.push(body.attachment);
    names.push(body.attachmentName || '');
  }
  return { dataUrls: out.slice(0, MAX_PER_REQUEST), names: names.slice(0, MAX_PER_REQUEST) };
}

function sanitizeRequestForOwner(row) {
  if (!row) return row;
  const copy = { ...row };
  const atts = Array.isArray(row.attachments) ? row.attachments : [];
  copy.attachments = atts.map(publicAttachmentMeta).filter(Boolean);
  copy.hasAttachments = copy.attachments.length > 0;
  // لا نُرجع المسار النسبي للعميل — التحميل عبر endpoint محمي فقط
  delete copy._attachmentPaths;
  return copy;
}

/**
 * @param {import('express').Application} app
 * @param {object} deps
 */
function mountServiceRequestRoutes(app, deps) {
  const {
    verifyAccountOwner,
    extractAccountToken,
    readAccounts,
    serviceRequests,
  } = deps;

  if (!serviceRequests) {
    console.warn('[service-requests] repo missing — routes not mounted');
    return;
  }

  const createLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'طلبات كثيرة — حاول لاحقاً', code: 'RATE_LIMIT' },
  });

  function listForAccount(accountId) {
    return serviceRequests
      .list()
      .filter((r) => r && r.accountId === accountId)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  }

  /**
   * POST /api/service-requests — زائر يرسل طلباً (بلا توكن)
   * body: accountId, buyerName, buyerPhone, buyerWhatsapp?, buyerEmail?,
   *       service?, message?, source?, templateName?, paymentPreference?,
   *       attachment? | attachments? (data-URL صورة/PDF)
   */
  app.post('/api/service-requests', createLimiter, (req, res) => {
    const b = req.body || {};
    const accountId = clip(b.accountId, 60);
    if (!accountId) {
      return res.status(400).json({ ok: false, error: 'accountId_required', code: 'accountId_required' });
    }
    const accounts = typeof readAccounts === 'function' ? readAccounts() : [];
    const acc = accounts.find((a) => a && a.id === accountId);
    if (!acc || (acc.status && acc.status !== 'approved' && acc.status !== 'active')) {
      return res.status(404).json({ ok: false, error: 'account_not_found', code: 'account_not_found' });
    }
    const buyerName = clip(b.buyerName || b.name, 120);
    const buyerPhone = normalizePhone(b.buyerPhone || b.phone);
    const buyerWhatsapp = normalizePhone(b.buyerWhatsapp || b.whatsapp || buyerPhone);
    const buyerEmail = clip(b.buyerEmail || b.email, 120).toLowerCase();
    if (!buyerName || buyerName.length < 2) {
      return res.status(400).json({ ok: false, error: 'name_required', code: 'name_required' });
    }
    if (!isLikelyPhone(buyerPhone)) {
      return res.status(400).json({ ok: false, error: 'invalid_phone', code: 'invalid_phone' });
    }
    if (!isLikelyEmail(buyerEmail)) {
      return res.status(400).json({ ok: false, error: 'invalid_email', code: 'invalid_email' });
    }

    const desk = (acc.serviceDesk && typeof acc.serviceDesk === 'object') ? acc.serviceDesk : {};
    const requestId = genId();
    const { dataUrls, names } = collectAttachmentInputs(b);
    const attachments = [];

    for (let i = 0; i < dataUrls.length; i++) {
      const stored = storeServiceDoc(dataUrls[i], {
        accountId,
        requestId,
        originalName: names[i] || ('doc-' + (i + 1)),
      });
      if (!stored.ok) {
        return res.status(stored.status || 400).json({
          ok: false,
          error: stored.error || 'doc_store_failed',
          code: stored.error || 'doc_store_failed',
          maxBytes: stored.maxBytes || MAX_BYTES,
        });
      }
      attachments.push({
        id: stored.id,
        relativePath: stored.relativePath,
        mime: stored.mime,
        bytes: stored.bytes,
        originalName: stored.originalName,
        createdAt: new Date().toISOString(),
      });
    }

    const row = {
      id: requestId,
      accountId,
      accountType: ACCOUNT_TYPES.includes(acc.type) ? acc.type : 'office',
      accountName: clip(acc.name, 160),
      buyerName,
      buyerPhone,
      buyerWhatsapp: buyerWhatsapp || buyerPhone,
      buyerEmail: buyerEmail || '',
      service: clip(b.service, 160),
      message: clip(b.message || b.msg || b.buyerNote, 2000),
      templateName: clip(b.templateName || desk.formTitle, 120),
      source: SOURCES.includes(String(b.source || '')) ? String(b.source) : 'public',
      paymentPreference: clip(b.paymentPreference, 40),
      attachments,
      hasAttachments: attachments.length > 0,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    serviceRequests.upsert(row.id, row);

    let docsChannel = DOCS_CHANNELS.includes(desk.docsChannel) ? desk.docsChannel : 'whatsapp';
    if (attachments.length > 0) docsChannel = 'platform';

    res.status(201).json({
      ok: true,
      id: row.id,
      request: {
        id: row.id,
        status: row.status,
        createdAt: row.createdAt,
        docsChannel,
        hasAttachments: attachments.length > 0,
        attachmentCount: attachments.length,
      },
    });
  });

  /** GET /api/service-requests/mine?accountId= — لصاحب الحساب فقط */
  app.get('/api/service-requests/mine', (req, res) => {
    const accountId = clip(req.query.accountId, 60);
    const token = extractAccountToken(req) || '';
    if (!accountId || !verifyAccountOwner(accountId, token)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const status = clip(req.query.status, 32);
    let rows = listForAccount(accountId);
    if (status && STATUSES.includes(status)) {
      rows = rows.filter((r) => r.status === status);
    }
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    res.json({
      ok: true,
      requests: rows.slice(0, limit).map(sanitizeRequestForOwner),
      unread: rows.filter((r) => r.status === 'new').length,
    });
  });

  /** GET /api/service-requests/:id/attachments/:attId — تحميل محمي للمالك */
  app.get('/api/service-requests/:id/attachments/:attId', (req, res) => {
    const id = clip(req.params.id, 80);
    const attId = clip(req.params.attId, 80);
    const row = serviceRequests.get(id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    const token = extractAccountToken(req) || '';
    if (!verifyAccountOwner(row.accountId, token)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const atts = Array.isArray(row.attachments) ? row.attachments : [];
    const att = atts.find((a) => a && a.id === attId);
    if (!att || !att.relativePath) {
      return res.status(404).json({ ok: false, error: 'attachment_not_found' });
    }
    const abs = resolveServiceDocAbsolute(att.relativePath);
    if (!abs) return res.status(404).json({ ok: false, error: 'attachment_missing' });
    const filename = String(att.originalName || path.basename(abs)).replace(/[\r\n"]/g, '');
    res.setHeader('Content-Type', att.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.sendFile(abs);
  });

  /** PATCH /api/service-requests/:id — تحديث الحالة من المالك */
  app.patch('/api/service-requests/:id', (req, res) => {
    const id = clip(req.params.id, 80);
    const row = serviceRequests.get(id);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    const token = extractAccountToken(req) || '';
    if (!verifyAccountOwner(row.accountId, token)) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }
    const b = req.body || {};
    if (typeof b.status === 'string' && STATUSES.includes(b.status)) {
      row.status = b.status;
    }
    if (typeof b.ownerNote === 'string') {
      row.ownerNote = clip(b.ownerNote, 500);
    }
    row.updatedAt = new Date().toISOString();
    serviceRequests.upsert(row.id, row);
    res.json({ ok: true, request: sanitizeRequestForOwner(row) });
  });
}

module.exports = { mountServiceRequestRoutes, STATUSES, DOCS_CHANNELS };
