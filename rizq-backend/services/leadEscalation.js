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

function buildLeadSummary(kind, lead) {
  const parts = [kind];
  if (lead.businessName) parts.push('منشأة: ' + lead.businessName);
  if (lead.whatsapp) parts.push('واتساب: ' + lead.whatsapp);
  if (lead.package) parts.push('باقة: ' + lead.package);
  if (lead.reason) parts.push('سبب: ' + lead.reason);
  return parts.join(' | ').slice(0, 500);
}

async function sendTelegramLeadAlert(lead, meta) {
  const {
    sendLeadEscalationAlert,
    sendTelegramAdminNotification,
    isConfigured,
  } = require('./telegramAdmin');
  const notify = sendTelegramAdminNotification || sendLeadEscalationAlert;

  if (!isConfigured()) {
    const err = 'TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID missing in .env';
    console.error('[lead-escalation] Telegram NOT configured — alert skipped:', err, {
      ticketId: meta && meta.ticketId,
      leadId: meta && meta.leadId,
    });
    return { sent: false, error: err };
  }

  try {
    const payload = Object.assign({}, lead, meta);
    const result = await notify(payload);
    console.log('[lead-escalation] Telegram alert SENT', {
      leadId: meta && meta.leadId,
      messageId: result && result.message_id,
    });
    return { sent: true, messageId: result && result.message_id };
  } catch (e) {
    console.error('[lead-escalation] Telegram send FAILED:', e && e.message, {
      leadId: meta && meta.leadId,
      telegram: e && e.telegram,
    });
    return { sent: false, error: (e && e.message) || 'telegram_send_failed' };
  }
}

/**
 * حفظ Lead في DB + تذكرة + إشعار Telegram — المسار الموحّد
 */
async function createLeadAndNotify(input, meta) {
  meta = meta || {};
  const lead = normalizeLeadInput(input);
  if (!lead.whatsapp) {
    return { ok: false, error: 'whatsapp_required' };
  }

  const dup = findRecentDuplicate(lead.whatsapp, 3600000);
  if (dup) {
    console.log('[lead-escalation] duplicate pending lead', dup.id, 'telegramSent:', !!dup.telegramSent);
    if (!dup.telegramSent) {
      console.log('[lead-escalation] retrying Telegram for duplicate lead', dup.id);
      let retry = { sent: false, error: null };
      try {
        retry = await sendTelegramLeadAlert(lead, {
          kind: meta.kind || 'register_interest',
          channel: meta.channel || 'widget',
          leadId: dup.id,
          ticketId: dup.id,
          reason: lead.reason || buildLeadSummary(meta.kind || 'lead', lead),
        });
        patchLead(dup.id, {
          telegramSent: retry.sent,
          telegramMessageId: retry.messageId || null,
          telegramError: retry.error || null,
        });
      } catch (e) {
        console.error('[lead-escalation] ❌ Telegram retry EXCEPTION', {
          leadId: dup.id,
          message: e && e.message,
          telegram: e && e.telegram,
        });
      }
      return {
        ok: true,
        duplicate: true,
        lead_id: dup.id,
        telegram_sent: retry.sent,
        telegram_error: retry.error || null,
        message: retry.sent
          ? ('✅ طلبكم مسجّل (مرجع ' + dup.id + ') — تم إرسال التنبيه للإدارة.')
          : ('طلبكم مسجّل مسبقاً (مرجع ' + dup.id + '). ستتواصل الإدارة معكم قريباً.'),
      };
    }
    return {
      ok: true,
      duplicate: true,
      lead_id: dup.id,
      telegram_sent: !!dup.telegramSent,
      message: 'طلبكم مسجّل مسبقاً (مرجع ' + dup.id + '). ستتواصل الإدارة معكم قريباً.',
    };
  }

  const saved = saveLead({
    businessName: lead.businessName || 'غير محدد',
    whatsapp: lead.whatsapp,
    package: lead.package || 'غير محددة',
    notes: lead.reason || '',
    source: meta.source || 'api',
    channel: meta.channel || 'widget',
    kind: meta.kind || lead.interestType || 'subscription',
    status: 'pending',
  });

  // ── إشعار Telegram فوري مباشرة بعد إسناد LEAD-XXXX (بدون انتظار) ──
  console.log('[lead-escalation] Lead saved — immediate Telegram push', {
    leadId: saved.id,
    whatsapp: lead.whatsapp,
    package: lead.package,
    localTime: saved.createdAtLocal,
  });

  const summary = buildLeadSummary(meta.kind || 'lead', lead);
  saveTicket({
    source: meta.source || meta.channel || 'lead-api',
    type: meta.kind || 'subscription',
    summary,
    contact: lead.whatsapp,
    meta: { leadId: saved.id, businessName: saved.businessName, package: saved.package },
  });

  console.log('[lead-escalation] Lead saved — triggering Telegram', {
    leadId: saved.id,
    whatsapp: lead.whatsapp,
    package: lead.package,
    localTime: saved.createdAtLocal,
  });

  let telegram = { sent: false, error: null };
  try {
    telegram = await sendTelegramLeadAlert({
      businessName: saved.businessName,
      whatsapp: saved.whatsapp,
      package: saved.package,
      notes: saved.notes,
      reason: lead.reason || summary,
      createdAtLocal: saved.createdAtLocal,
    }, {
      kind: meta.kind || 'register_interest',
      channel: meta.channel || 'widget',
      leadId: saved.id,
      ticketId: saved.id,
      reason: lead.reason || summary,
      createdAtLocal: saved.createdAtLocal,
    });
    if (telegram.sent) {
      console.log('[lead-escalation] ✅ Telegram notification delivered', {
        leadId: saved.id,
        messageId: telegram.messageId,
      });
    } else {
      console.error('[lead-escalation] ❌ Telegram notification NOT delivered', {
        leadId: saved.id,
        error: telegram.error,
        hint: 'Check TELEGRAM_ADMIN_CHAT_ID in .env — send /start to @RizqOficial_bot',
      });
    }
  } catch (e) {
    console.error('[lead-escalation] ❌ Telegram EXCEPTION', {
      leadId: saved.id,
      message: e && e.message,
      stack: e && e.stack,
      telegram: e && e.telegram,
    });
    telegram = { sent: false, error: (e && e.message) || 'telegram_exception' };
  }

  patchLead(saved.id, {
    telegramSent: telegram.sent,
    telegramMessageId: telegram.messageId || null,
    telegramError: telegram.error || null,
  });

  const contactHint = 'ستتواصل الإدارة معكم فوراً لتفعيل الحساب. ' +
    SUPPORT_CONTACT.phone + ' · ' + SUPPORT_CONTACT.email;

  return {
    ok: true,
    lead_id: saved.id,
    ref: saved.id,
    status: 'pending',
    telegram_sent: telegram.sent,
    telegram_error: telegram.error || null,
    message: telegram.sent
      ? ('✅ تم تسجيل طلبكم (مرجع ' + saved.id + '). ' + contactHint)
      : ('تم حفظ طلبكم (مرجع ' + saved.id + ') لكن تعذّر Telegram — ' + SUPPORT_CONTACT.phone),
  };
}

async function handleLeadEscalation(kind, toolInput, meta) {
  meta = Object.assign({ kind: kind === 'register_interest' ? 'register_interest' : 'escalation' }, meta || {});
  return createLeadAndNotify(toolInput, meta);
}

function leadToolWasUsed(toolResultsRaw) {
  return (toolResultsRaw || []).some((r) => r && (r.lead_id || r.telegram_sent === true || r.ref || r.escalated));
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
  if (/ماس\s*pro|diamond\s*pro|الماسية\s*المتقدمة|pro\s*ماس/i.test(combined)) pkg = 'الماسية Pro';
  else if (/ماس|diamond/i.test(combined)) pkg = 'الماسية الأساسية';
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
  }, { source: 'widget-auto', channel: channel || 'widget', kind: 'register_interest' });
}

module.exports = {
  handleLeadEscalation,
  createLeadAndNotify,
  maybeAutoNotifyLead,
  normalizeLeadInput,
  sendTelegramLeadAlert,
  getPendingLeads,
  formatPendingLeadsForAdmin,
  SUPPORT_CONTACT,
};
