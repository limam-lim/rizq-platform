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
const { resolveLivePackageQuote, formatPriceForTelegram, inferCatalogHint } = require('./packageCatalogLive');
const { pickLang } = require('./widgetLang');
const { cleanField } = require('./telegramNotifyFormat');
const { formatPlainChatText } = require('./widgetMarkdown');

const SUPPORT_CONTACT = {
  email: 'direction@rizq.mr',
  phone: '+222 44 88 22 12',
};

const LEAD_INTENT_RE = /(?:اشتراك|تفعيل|أريد.*باق|الباقة|باقة|ماس|سنو|تجرب|خصم|subscribe|forfait|diamond|activation|register|pro\b|trial)/i;
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

function enrichLeadWithLivePricing(lead, lang, meta) {
  const catalogHint = inferCatalogHint(meta || {}, lead.package);
  const quote = resolveLivePackageQuote(lead.package, lang || 'ar', { catalogHint });
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
  const contactHint = cleanField(SUPPORT_CONTACT.phone) + ' · ' + SUPPORT_CONTACT.email;
  let msg;

  if (opts.duplicate) {
    msg = pickLang({
      ar: 'طلبكم مسجّل مسبقاً (مرجع ' + cleanField(leadId) + ').\n\nالباقة: ' + pkgName + '\nالسعر الفعلي: ' + priceLine + '\n\nستتواصل الإدارة معكم قريباً.',
      fr: 'Demande déjà enregistrée (réf. ' + leadId + ').\n\nForfait : ' + pkgName + '\nPrix actuel : ' + priceLine + '\n\nNotre équipe vous contactera bientôt.',
      en: 'Your request is already on file (ref ' + leadId + ').\n\nPlan: ' + pkgName + '\nLive price: ' + priceLine + '\n\nOur team will contact you soon.',
      es: 'Su solicitud ya está registrada (ref. ' + leadId + ').\n\nPlan: ' + pkgName + '\nPrecio actual: ' + priceLine + '\n\nLe contactaremos pronto.',
    }, lang);
  } else {
    msg = pickLang({
      ar: 'تم تسجيل طلبكم (مرجع ' + cleanField(leadId) + ').\n\nالباقة: ' + pkgName + '\nالسعر الفعلي: ' + priceLine + '\n\nستتواصل الإدارة معكم فوراً لتفعيل الحساب. ' + contactHint,
      fr: 'Demande enregistrée (réf. ' + leadId + ').\n\nForfait : ' + pkgName + '\nPrix actuel : ' + priceLine + '\n\nNotre équipe vous contactera pour activation. ' + contactHint,
      en: 'Request registered (ref ' + leadId + ').\n\nPlan: ' + pkgName + '\nLive price: ' + priceLine + '\n\nOur team will contact you to activate. ' + contactHint,
      es: 'Solicitud registrada (ref. ' + leadId + ').\n\nPlan: ' + pkgName + '\nPrecio actual: ' + priceLine + '\n\nLe contactaremos para activar. ' + contactHint,
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
    const payload = Object.assign({}, lead, meta);
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
    return { ok: false, error: 'whatsapp_required' };
  }

  lead = enrichLeadWithLivePricing(lead, meta.lang || 'ar', meta);

  const dup = findRecentDuplicate(lead.whatsapp, 3600000);
  if (dup) {
    console.log('[lead-escalation] duplicate pending lead', dup.id, 'telegramSent:', !!dup.telegramSent);
    const dupQuote = resolveLivePackageQuote(
      dup.package,
      meta.lang || 'ar',
      { catalogHint: inferCatalogHint(meta, dup.package) }
    );
    const dupLead = Object.assign({}, lead, {
      package: dupQuote ? dupQuote.name : dup.package,
      packageId: dup.packageId || (dupQuote && dupQuote.id),
      packagePrice: dup.packagePrice != null ? dup.packagePrice : (dupQuote && dupQuote.price),
      packagePriceLabel: dup.packagePriceLabel || formatPriceForTelegram(dupQuote),
      packageCatalog: dupQuote && dupQuote.catalog,
    });
    if (!dup.telegramSent) {
      console.log('[lead-escalation] retrying Telegram for duplicate lead', dup.id);
      const dupPayload = {
        businessName: dup.businessName,
        whatsapp: dup.whatsapp,
        package: dupLead.package,
        packageId: dupLead.packageId,
        packagePrice: dupLead.packagePrice,
        packagePriceLabel: dupLead.packagePriceLabel,
        notes: dup.notes,
        reason: lead.reason || buildLeadSummary(meta.kind || 'lead', dupLead),
        createdAtLocal: dup.createdAtLocal,
      };
      const dupTelegram = await dispatchTelegramLeadAlert(dupPayload, {
        kind: meta.kind || 'register_interest',
        channel: meta.channel || 'widget',
        leadId: dup.id,
        ticketId: dup.id,
        reason: lead.reason || buildLeadSummary(meta.kind || 'lead', dupLead),
      }, dup.id);
      return buildLeadToolResult(dupLead, dup.id, meta.lang || 'ar', meta, {
        duplicate: true,
        telegram_sent: !!dupTelegram.sent,
        telegram_error: dupTelegram.error || null,
      });
    }
    return buildLeadToolResult(dupLead, dup.id, meta.lang || 'ar', meta, {
      duplicate: true,
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
    businessName: saved.businessName,
    whatsapp: saved.whatsapp,
    package: saved.package,
    packageId: saved.packageId,
    packagePrice: saved.packagePrice,
    packagePriceLabel: saved.packagePriceLabel,
    notes: saved.notes,
    reason: lead.reason || summary,
    createdAtLocal: saved.createdAtLocal,
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
  if (leadToolWasUsed(toolResultsRaw)) return null;

  const chunks = [String(userText || '')];
  (history || []).slice(-6).forEach((h) => {
    if (h && h.text) chunks.push(String(h.text));
  });
  const combined = chunks.join('\n');

  if (!LEAD_INTENT_RE.test(combined)) return null;

  const phoneMatch = combined.match(PHONE_EXTRACT_RE);
  if (!phoneMatch) return null;

  const bizMatch = combined.match(/(?:اسم|شركة|محل|منشأة|تاجر)[:\s]+([^\n،,]+)/i);
  let pkg = 'غير محددة';
  if (/ماس\s*pro|diamond\s*pro|الماسية\s*pro\s*للمحلات|pro\s*للمحلات|pro\s*ماس/i.test(combined)) pkg = 'الماسية Pro للمحلات';
  else if (/ماس\s*pro|diamond\s*pro|الماسية\s*المتقدمة|pro\s*ماس/i.test(combined)) pkg = 'الماسية Pro';
  else if (/ماس.*محلات|diamond.*store|st-diam/i.test(combined)) pkg = 'الماسية الأساسية للمحلات';
  else if (/سنو|annuel|year/i.test(combined)) pkg = 'السنوية';
  else if (/\bpro\b/i.test(combined)) pkg = 'Pro';
  else if (/تجرب|trial|essai/i.test(combined)) pkg = 'التجريبية';
  else if (/أساس|basic|basique/i.test(combined)) pkg = 'الأساسية';

  console.log('[lead-escalation] Auto-fallback — persisting lead from conversation');

  return createLeadAndNotify({
    business_name: bizMatch ? bizMatch[1].trim().slice(0, 120) : 'غير محدد',
    whatsapp: phoneMatch[0].replace(/\s+/g, ' ').trim(),
    package_requested: pkg,
    notes: 'تصعيد تلقائي من محادثة الويدجت',
    interest_type: 'subscription',
  }, { source: 'widget-auto', channel: channel || 'widget', kind: 'register_interest', lang: 'ar' });
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
