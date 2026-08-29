/**
 * leadEscalation.js — حفظ Lead + تنبيه Telegram فوري (Backend Lead Event Flow)
 */
'use strict';

const { saveTicket } = require('./agentTickets');
const {
  saveLead,
  patchLead,
  findRecentDuplicate,
  getPendingLeads,
  formatPendingLeadsForAdmin,
} = require('./leadsStore');
const {
  resolveLivePackageQuote,
  formatPriceForTelegram,
  inferCatalogHint,
  inferCatalogFromMessageText,
  inferPackageRefFromConversation,
  catalogFromPackageId,
  buildUserContextFromMeta,
} = require('./packageCatalogLive');
const { pickLang } = require('./widgetLang');
const { cleanField } = require('./telegramNotifyFormat');
const { formatPlainChatText } = require('./widgetMarkdown');

const SUPPORT_CONTACT = {
  email: 'direction@rizq.mr',
  phone: '+222 44 88 22 12',
};

const LEAD_INTENT_RE = /(?:اشتراك|تفعيل|أريد.*باق|الباقة|باقة|ماس|سنو|تجرب|خصم|subscribe|forfait|diamond|activation|register|pro\b|trial|مشارك)/i;
const LEAD_CORRECTION_RE = /(?:لا|ليس|غير|مو|ليسة|بل\s|قصدي|أريد|اريد|ودي|بغيت).*?(?:pro|برو|ماس|أساس|standard|basic|مكتب|مكاتب|محل|محلات|معارض|معرض|showroom|شركات|شركة)/i;
const LEAD_CATALOG_CORRECTION_RE = /(?:لا|ليس|غير|مو|ليسة|بل|قصدي).*?(?:محلات|محل|متجر|مكاتب|مكتب|معارض|معرض|showroom|شركات)/i;
const PHONE_EXTRACT_RE = /(?:\+222|00222)[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}|\+222[\d\s\-]{8,18}|\b222[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2}\b|\+[\d\s\-()]{8,20}|\b(?:2|3|4)\d{7}\b/;

function normalizeLeadInput(toolInput) {
  const i = toolInput || {};
  return {
    businessName: String(i.business_name || i.businessName || i.name || '').trim(),
    whatsapp: String(i.whatsapp || i.contact || i.phone || '').trim(),
    package: String(i.package_requested || i.package || i.pkg || '').trim(),
    reason: String(i.reason || i.notes || i.summary || '').trim(),
    urgency: String(i.urgency || 'normal').trim(),
    interestType: String(i.interest_type || i.type || '').trim(),
  };
}

function extractWhatsappFromMeta(meta, lead) {
  if (lead && lead.whatsapp) return lead.whatsapp;
  const chunks = [];
  if (meta && meta.userText) chunks.push(String(meta.userText));
  if (meta && meta.notes) chunks.push(String(meta.notes));
  if (lead && lead.reason) chunks.push(String(lead.reason));
  if (meta && Array.isArray(meta.history)) {
    meta.history.forEach(function (h) {
      if (!h || !h.text) return;
      const role = String(h.role || h.sender || '').toLowerCase();
      if (role === 'agent' || role === 'assistant' || role === 'bot') return;
      chunks.push(String(h.text));
    });
  }
  const m = chunks.join('\n').match(PHONE_EXTRACT_RE);
  return m ? m[0].replace(/\s+/g, ' ').trim() : '';
}

function cleanBusinessName(raw) {
  return String(raw || '')
    .replace(/\s*(?:الهاتف|هاتف|واتساب|whatsapp|رقم(?:\s*ال)?(?:هاتف|واتساب)?|tel|phone).*$/i, '')
    .replace(/\s*\+?222[\d\s\-]{6,}.*$/, '')
    .replace(/\s*\b(?:2|3|4)\d{7}\b.*$/, '')
    .replace(/^[\s:،,\-]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 120);
}

function extractBusinessNameFromMeta(meta, lead) {
  meta = meta || {};
  lead = lead || {};
  const chunks = [];
  if (meta.userText) chunks.push(String(meta.userText));
  if (Array.isArray(meta.history)) {
    meta.history.forEach(function (h) {
      if (!h || !h.text) return;
      const role = String(h.role || h.sender || '').toLowerCase();
      if (role === 'agent' || role === 'assistant' || role === 'bot') return;
      chunks.push(String(h.text));
    });
  }
  const blob = chunks.join('\n');
  const patterns = [
    /(?:اسم\s*(?:المعرض|المحل|المنشأة|الشركة|المكتب|التاجر))\s+(.+?)(?:\s+(?:الهاتف|هاتف|واتساب|رقم|phone|whatsapp)|$)/i,
    /(?:اسم|شركة|محل|منشأة|تاجر|مكتب|معرض)[:\s]+(.+?)(?:\s+(?:الهاتف|هاتف|واتساب|رقم|phone|whatsapp)|$)/i,
  ];
  for (let i = 0; i < patterns.length; i += 1) {
    const m = blob.match(patterns[i]);
    if (m && m[1]) {
      const cleaned = cleanBusinessName(m[1]);
      if (cleaned && cleaned.length >= 2) return cleaned;
    }
  }
  const direct = cleanBusinessName(lead.businessName);
  if (direct && direct !== 'غير محدد') return direct;
  return String(lead.businessName || '').trim() || 'غير محدد';
}

function buildLeadMetaContext(meta, lead) {
  meta = meta || {};
  let contextBlob = [lead && lead.packageId, lead && lead.package, lead && lead.reason, meta.userText, meta.notes]
    .filter(Boolean).join(' ');
  if (Array.isArray(meta.history)) {
    meta.history.slice(-8).forEach(function (h) {
      if (h && h.text) contextBlob += ' ' + String(h.text);
    });
  }
  return contextBlob;
}

function resolveLeadPackageQuote(lead, meta, lang) {
  const contextBlob = buildLeadMetaContext(meta, lead);
  const userContext = buildUserContextFromMeta(meta);
  const inferredRef = inferPackageRefFromConversation(meta, null);
  const catalogHint = catalogFromPackageId(inferredRef)
    || inferCatalogFromMessageText(meta && meta.userText, null)
    || inferCatalogHint(meta, contextBlob);
  const packageRef = inferredRef || (lead && lead.packageId) || (lead && lead.package);
  if (!packageRef) return { quote: null, catalogHint, inferredRef };
  const quote = resolveLivePackageQuote(packageRef, lang || 'ar', {
    catalogHint,
    catalog: catalogHint,
    userContext,
    userText: meta && meta.userText,
  });
  return { quote, catalogHint, inferredRef, packageRef };
}

function enrichLeadWithLivePricing(lead, lang, meta) {
  meta = meta || {};
  const resolved = resolveLeadPackageQuote(lead, meta, lang || 'ar');
  const quote = resolved.quote;
  if (!quote) return lead;
  return Object.assign({}, lead, {
    packageId: quote.id,
    packagePrice: quote.price,
    packagePriceLabel: quote.priceLabel,
    packageCatalog: quote.catalog,
    package: quote.name || lead.package,
  });
}

function buildLeadConfirmationMessage(lead, leadId, lang, opts) {
  lang = lang || 'ar';
  opts = opts || {};
  const priceLine = cleanField(lead.packagePriceLabel || formatPriceForTelegram({ price: lead.packagePrice }));
  const pkgName = cleanField(lead.package);
  const contactBlock = pickLang({
    ar: '\n\nإن تأخر تفعيل الباقة، تواصلوا مع الإدارة:\n📱 ' + cleanField(SUPPORT_CONTACT.phone) + '\n📧 ' + SUPPORT_CONTACT.email,
    fr: '\n\nSi l\'activation tarde, contactez l\'administration :\n📱 ' + cleanField(SUPPORT_CONTACT.phone) + '\n📧 ' + SUPPORT_CONTACT.email,
    en: '\n\nIf activation is delayed, contact admin:\n📱 ' + cleanField(SUPPORT_CONTACT.phone) + '\n📧 ' + SUPPORT_CONTACT.email,
    es: '\n\nSi la activación se retrasa, contacte administración:\n📱 ' + cleanField(SUPPORT_CONTACT.phone) + '\n📧 ' + SUPPORT_CONTACT.email,
  }, lang);
  let msg;

  if (opts.duplicate && opts.updated) {
    msg = pickLang({
      ar: 'تم تحديث طلبكم (مرجع ' + cleanField(leadId) + ').\n\nالباقة المطلوبة: ' + pkgName + '\nالسعر الفعلي: ' + priceLine + '\n\nستتواصل الإدارة معكم قريباً لتفعيل الباقة.' + contactBlock,
      fr: 'Demande mise à jour (réf. ' + leadId + ').\n\nForfait demandé : ' + pkgName + '\nPrix actuel : ' + priceLine + '\n\nNotre équipe vous contactera bientôt pour activation.' + contactBlock,
      en: 'Your request was updated (ref ' + leadId + ').\n\nRequested plan: ' + pkgName + '\nLive price: ' + priceLine + '\n\nOur team will contact you soon to activate.' + contactBlock,
      es: 'Solicitud actualizada (ref. ' + leadId + ').\n\nPlan solicitado: ' + pkgName + '\nPrecio actual: ' + priceLine + '\n\nLe contactaremos pronto para activar.' + contactBlock,
    }, lang);
  } else if (opts.duplicate) {
    msg = pickLang({
      ar: 'طلبكم مسجّل مسبقاً (مرجع ' + cleanField(leadId) + ').\n\nالباقة المطلوبة: ' + pkgName + '\nالسعر الفعلي: ' + priceLine + '\n\nستتواصل الإدارة معكم قريباً لتفعيل الباقة.' + contactBlock,
      fr: 'Demande déjà enregistrée (réf. ' + leadId + ').\n\nForfait demandé : ' + pkgName + '\nPrix actuel : ' + priceLine + '\n\nNotre équipe vous contactera bientôt pour activation.' + contactBlock,
      en: 'Your request is already on file (ref ' + leadId + ').\n\nRequested plan: ' + pkgName + '\nLive price: ' + priceLine + '\n\nOur team will contact you soon to activate.' + contactBlock,
      es: 'Su solicitud ya está registrada (ref. ' + leadId + ').\n\nPlan solicitado: ' + pkgName + '\nPrecio actual: ' + priceLine + '\n\nLe contactaremos pronto para activar.' + contactBlock,
    }, lang);
  } else {
    msg = pickLang({
      ar: 'تم تسجيل طلبكم (مرجع ' + cleanField(leadId) + ').\n\nالباقة المطلوبة: ' + pkgName + '\nالسعر الفعلي: ' + priceLine + '\n\nستتواصل الإدارة معكم فوراً لتفعيل الحساب.' + contactBlock,
      fr: 'Demande enregistrée (réf. ' + leadId + ').\n\nForfait demandé : ' + pkgName + '\nPrix actuel : ' + priceLine + '\n\nNotre équipe vous contactera pour activation.' + contactBlock,
      en: 'Request registered (ref ' + leadId + ').\n\nRequested plan: ' + pkgName + '\nLive price: ' + priceLine + '\n\nOur team will contact you to activate.' + contactBlock,
      es: 'Solicitud registrada (ref. ' + leadId + ').\n\nPlan solicitado: ' + pkgName + '\nPrecio actual: ' + priceLine + '\n\nLe contactaremos para activar.' + contactBlock,
    }, lang);
  }
  return formatPlainChatText(msg);
}

function buildLeadToolResult(lead, leadId, lang, meta, extra) {
  extra = extra || {};
  const confirmation = buildLeadConfirmationMessage(lead, leadId, lang, extra);
  return Object.assign({
    ok: true,
    lead_id: leadId,
    ref: leadId,
    package: lead.package,
    package_id: lead.packageId || null,
    package_price: lead.packagePrice,
    package_price_label: lead.packagePriceLabel || formatPriceForTelegram({ price: lead.packagePrice }),
    package_catalog: lead.packageCatalog || null,
    confirmation_message: confirmation,
    official_price_only: true,
    message: confirmation,
  }, extra);
}

function buildLeadSummary(kind, lead) {
  const parts = [kind];
  if (lead.businessName) parts.push('منشأة: ' + lead.businessName);
  if (lead.whatsapp) parts.push('واتساب: ' + lead.whatsapp);
  if (lead.package) parts.push('باقة: ' + lead.package);
  if (lead.packagePriceLabel) parts.push('سعر: ' + lead.packagePriceLabel);
  if (lead.reason) parts.push('سبب: ' + lead.reason);
  return parts.join(' | ').slice(0, 500);
}

async function sendTelegramLeadAlert(lead, meta) {
  const {
    sendLeadEscalationAlert,
    sendTelegramAdminNotification,
    isConfigured,
    getTelegramDiagnostics,
  } = require('./telegramAdmin');
  const notify = sendTelegramAdminNotification || sendLeadEscalationAlert;

  if (!isConfigured()) {
    const diag = typeof getTelegramDiagnostics === 'function' ? getTelegramDiagnostics() : {};
    const err = 'TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID/TELEGRAM_CHAT_ID missing in .env';
    console.error('[lead-escalation] Telegram NOT configured — alert skipped:', err, Object.assign({
      ticketId: meta && meta.ticketId,
      leadId: meta && meta.leadId,
    }, diag));
    return { sent: false, error: err, diagnostics: diag };
  }

  try {
    const payload = Object.assign({}, lead, meta, {
      leadId: meta && meta.leadId,
      updated: !!(lead.updated || lead.isUpdate || (meta && meta.updated)),
      isUpdate: !!(lead.updated || lead.isUpdate || (meta && meta.updated)),
    });
    console.log('[lead-escalation] Telegram dispatch start', {
      leadId: meta && meta.leadId,
      package: payload.package,
      packagePriceLabel: payload.packagePriceLabel,
      chatConfigured: true,
    });
    const result = await notify(payload);
    console.log('[lead-escalation] Telegram alert SENT', {
      leadId: meta && meta.leadId,
      messageId: result && result.message_id,
    });
    return { sent: true, messageId: result && result.message_id };
  } catch (e) {
    console.error('[lead-escalation] Telegram send FAILED:', e && e.message);
    console.error('[lead-escalation] Telegram API full response:', JSON.stringify({
      leadId: meta && meta.leadId,
      message: e && e.message,
      httpStatus: e && e.httpStatus,
      telegram: e && e.telegram,
      code: e && e.code,
    }, null, 2));
    return { sent: false, error: (e && e.message) || 'telegram_send_failed', telegram: e && e.telegram };
  }
}

async function dispatchTelegramLeadAlert(leadPayload, meta, leadId) {
  let telegram = { sent: false, error: null, messageId: null };
  try {
    telegram = await sendTelegramLeadAlert(leadPayload, meta);
    if (telegram.sent) {
      console.log('[lead-escalation] ✅ Telegram notification delivered', {
        leadId,
        messageId: telegram.messageId,
      });
    } else {
      console.error('[lead-escalation] ❌ Telegram notification NOT delivered', {
        leadId,
        error: telegram.error,
        diagnostics: telegram.diagnostics,
      });
    }
  } catch (e) {
    console.error('[lead-escalation] ❌ Telegram EXCEPTION', {
      leadId,
      message: e && e.message,
      telegram: e && e.telegram,
      stack: e && e.stack,
    });
    telegram = {
      sent: false,
      error: (e && e.message) || 'telegram_exception',
      telegram: e && e.telegram,
    };
  }
  if (leadId) {
    patchLead(leadId, {
      telegramSent: telegram.sent,
      telegramMessageId: telegram.messageId || null,
      telegramError: telegram.error || null,
    });
  }
  return telegram;
}

/**
 * حفظ Lead في DB + تذكرة + إشعار Telegram — المسار الموحّد
 */
async function createLeadAndNotify(input, meta) {
  meta = meta || {};
  let lead = normalizeLeadInput(input);
  if (!lead.whatsapp) {
    lead.whatsapp = extractWhatsappFromMeta(meta, lead);
  }
  if (!lead.whatsapp) {
    return { ok: false, error: 'whatsapp_required' };
  }

  const enrichMeta = Object.assign({}, meta, {
    userText: meta.userText || lead.reason || null,
    history: meta.history || input.history || null,
    notes: meta.notes || lead.reason || null,
  });
  lead.businessName = extractBusinessNameFromMeta(enrichMeta, lead);
  lead = enrichLeadWithLivePricing(lead, meta.lang || 'ar', enrichMeta);

  const dup = findRecentDuplicate(lead.whatsapp, 3600000);
  if (dup) {
    console.log('[lead-escalation] duplicate pending lead', dup.id, 'telegramSent:', !!dup.telegramSent);
    const resolved = resolveLeadPackageQuote(lead, enrichMeta, meta.lang || 'ar');
    const dupQuote = resolved.quote;
    const dupLead = Object.assign({}, lead, {
      businessName: extractBusinessNameFromMeta(enrichMeta, lead) || dup.businessName,
      package: dupQuote ? dupQuote.name : (lead.package || dup.package),
      packageId: dupQuote ? dupQuote.id : (lead.packageId || dup.packageId),
      packagePrice: dupQuote ? dupQuote.price : (lead.packagePrice != null ? lead.packagePrice : dup.packagePrice),
      packagePriceLabel: dupQuote
        ? (dupQuote.priceLabel || formatPriceForTelegram(dupQuote))
        : (lead.packagePriceLabel || dup.packagePriceLabel || formatPriceForTelegram({ price: lead.packagePrice || dup.packagePrice })),
      packageCatalog: dupQuote ? dupQuote.catalog : (lead.packageCatalog || dup.packageCatalog),
    });
    const updated = dupQuote && (
      String(dup.packageId || '') !== String(dupLead.packageId || '')
      || Number(dup.packagePrice) !== Number(dupLead.packagePrice)
      || String(dup.package || '') !== String(dupLead.package || '')
    );
    if (dupQuote && dup.id) {
      patchLead(dup.id, {
        package: dupLead.package,
        packageId: dupLead.packageId,
        packagePrice: dupLead.packagePrice,
        packagePriceLabel: dupLead.packagePriceLabel,
        businessName: dupLead.businessName,
      });
    }
    const shouldNotifyTelegram = !dup.telegramSent || updated;
    if (shouldNotifyTelegram) {
      console.log('[lead-escalation] Telegram for duplicate lead', dup.id, updated ? 'update' : 'retry');
      const dupPayload = {
        businessName: dupLead.businessName,
        whatsapp: dup.whatsapp,
        package: dupLead.package,
        packageId: dupLead.packageId,
        packagePrice: dupLead.packagePrice,
        packagePriceLabel: dupLead.packagePriceLabel,
        notes: dup.notes,
        reason: lead.reason || buildLeadSummary(meta.kind || 'lead', dupLead),
        createdAtLocal: dup.createdAtLocal,
        updated: updated,
        isUpdate: updated,
      };
      const dupTelegram = await dispatchTelegramLeadAlert(dupPayload, {
        kind: meta.kind || 'register_interest',
        channel: meta.channel || 'widget',
        leadId: dup.id,
        ticketId: dup.id,
        reason: lead.reason || buildLeadSummary(meta.kind || 'lead', dupLead),
        updated: updated,
      }, dup.id);
      return buildLeadToolResult(dupLead, dup.id, meta.lang || 'ar', meta, {
        duplicate: true,
        updated: updated,
        telegram_sent: !!dupTelegram.sent,
        telegram_error: dupTelegram.error || null,
      });
    }
    return buildLeadToolResult(dupLead, dup.id, meta.lang || 'ar', meta, {
      duplicate: true,
      updated: updated,
      telegram_sent: !!dup.telegramSent,
    });
  }

  const saved = saveLead({
    businessName: lead.businessName || 'غير محدد',
    whatsapp: lead.whatsapp,
    package: lead.package || 'غير محددة',
    packageId: lead.packageId || null,
    packagePrice: lead.packagePrice != null ? lead.packagePrice : null,
    packagePriceLabel: lead.packagePriceLabel || null,
    notes: lead.reason || '',
    source: meta.source || 'api',
    channel: meta.channel || 'widget',
    kind: meta.kind || lead.interestType || 'subscription',
    status: 'pending',
  });

  console.log('[lead-escalation] Lead saved — dispatching Telegram alert', {
    leadId: saved.id,
    whatsapp: lead.whatsapp,
    package: saved.package,
    packagePrice: saved.packagePriceLabel,
    localTime: saved.createdAtLocal,
  });

  const summary = buildLeadSummary(meta.kind || 'lead', lead);
  saveTicket({
    source: meta.source || meta.channel || 'lead-api',
    type: meta.kind || 'subscription',
    summary,
    contact: lead.whatsapp,
    meta: {
      leadId: saved.id,
      businessName: saved.businessName,
      package: saved.package,
      packagePrice: saved.packagePriceLabel,
    },
  });

  const telegramPayload = {
    businessName: lead.businessName,
    whatsapp: saved.whatsapp,
    package: saved.package,
    packageId: saved.packageId,
    packagePrice: saved.packagePrice,
    packagePriceLabel: saved.packagePriceLabel,
    notes: saved.notes,
    reason: lead.reason || summary,
    createdAtLocal: saved.createdAtLocal,
    leadId: saved.id,
  };

  const telegram = await dispatchTelegramLeadAlert(telegramPayload, {
    kind: meta.kind || 'register_interest',
    channel: meta.channel || 'widget',
    leadId: saved.id,
    ticketId: saved.id,
    reason: lead.reason || summary,
    createdAtLocal: saved.createdAtLocal,
  }, saved.id);

  return buildLeadToolResult(lead, saved.id, meta.lang || 'ar', meta, {
    status: 'pending',
    telegram_sent: !!telegram.sent,
    telegram_error: telegram.error || null,
  });
}

async function handleLeadEscalation(kind, toolInput, meta) {
  meta = Object.assign({ kind: kind === 'register_interest' ? 'register_interest' : 'escalation' }, meta || {});
  return createLeadAndNotify(toolInput, meta);
}

function leadToolWasUsed(toolResultsRaw) {
  return (toolResultsRaw || []).some((r) => r && (
    r.lead_id || r.ref || r.escalated
    || r.telegram_sent === true || r.telegram_sent === 'dispatched'
  ));
}

async function maybeAutoNotifyLead({ userText, history, toolResultsRaw, channel }) {
  const isCorrection = LEAD_CORRECTION_RE.test(String(userText || ''))
    || LEAD_CATALOG_CORRECTION_RE.test(String(userText || ''));
  if (leadToolWasUsed(toolResultsRaw)) {
    if (!isCorrection) return null;
    const leadResult = (toolResultsRaw || []).find((r) => r && r.lead_id);
    if (leadResult && leadResult.updated) return null;
  }

  const chunks = [String(userText || '')];
  (history || []).slice(-6).forEach((h) => {
    if (!h || !h.text) return;
    const role = String(h.role || h.sender || '').toLowerCase();
    if (role === 'agent' || role === 'assistant' || role === 'bot') return;
    chunks.push(String(h.text));
  });
  const combined = chunks.join('\n');

  if (!LEAD_INTENT_RE.test(combined) && !isCorrection) return null;

  const phoneMatch = combined.match(PHONE_EXTRACT_RE);
  if (!phoneMatch) return null;

  const bizMatch = combined.match(/(?:اسم\s*(?:المعرض|المحل|المنشأة|الشركة|المكتب)|اسم|شركة|محل|منشأة|تاجر|مكتب|معرض)[:\s]+(.+?)(?:\s+(?:الهاتف|هاتف|واتساب|رقم|\d{8,})|$)/i);
  const catalogHint = inferCatalogFromMessageText(String(userText || ''), inferCatalogHint({ userText: combined, history }, combined));
  const inferredRef = inferPackageRefFromConversation({ userText: String(userText || ''), history, catalogHint }, null);
  const pkg = inferredRef || 'غير محددة';
  const autoMeta = {
    source: 'widget-auto',
    channel: channel || 'widget',
    kind: 'register_interest',
    lang: 'ar',
    catalogHint,
    userText: String(userText || ''),
    history,
  };

  console.log('[lead-escalation] Auto-fallback — persisting lead from conversation', { pkg: inferredRef, catalogHint });

  return createLeadAndNotify({
    business_name: bizMatch ? cleanBusinessName(bizMatch[1]) : extractBusinessNameFromMeta(autoMeta, { businessName: 'غير محدد' }),
    whatsapp: phoneMatch[0].replace(/\s+/g, ' ').trim(),
    package_requested: pkg,
    notes: isCorrection ? 'تصحيح باقة من محادثة الويدجت' : 'تصعيد تلقائي من محادثة الويدجت',
    interest_type: 'subscription',
  }, autoMeta);
}

module.exports = {
  handleLeadEscalation,
  createLeadAndNotify,
  maybeAutoNotifyLead,
  normalizeLeadInput,
  enrichLeadWithLivePricing,
  buildLeadConfirmationMessage,
  buildLeadToolResult,
  sendTelegramLeadAlert,
  getPendingLeads,
  formatPendingLeadsForAdmin,
  SUPPORT_CONTACT,
};
