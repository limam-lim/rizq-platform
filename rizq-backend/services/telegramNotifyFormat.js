/**
 * telegramNotifyFormat.js — قوالب إشعارات Telegram نظيفة (أرقام 0-9 + توقيت محلي)
 */
'use strict';

const { formatNotifyTimestamp, toWesternDigits, TZ } = require('./localTime');

function cleanField(value, fallback) {
  const s = toWesternDigits(String(value == null ? '' : value).trim());
  return s || (fallback != null ? fallback : '—');
}

function resolveNotifyDate(source) {
  if (!source) return new Date();
  if (source instanceof Date && !isNaN(source.getTime())) return source;
  if (typeof source === 'object' && source.createdAt) {
    const d = new Date(source.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (typeof source === 'string' || typeof source === 'number') {
    const d = new Date(source);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function timestampLine(source, label) {
  const when = formatNotifyTimestamp(resolveNotifyDate(source));
  const prefix = label || '🕐 التوقيت المحلي';
  return prefix + ': ' + when + ' (' + TZ + ')';
}

function formatLeadAlertText(lead) {
  const leadId = cleanField(lead.leadId || lead.ticketId || lead.id);
  const packageName = cleanField(lead.package || lead.packageName);
  const priceLine = cleanField(
    lead.packagePriceLabel
      || (lead.packagePrice != null ? String(lead.packagePrice) + ' MRU' : null)
  );
  const businessName = cleanField(lead.businessName);
  const phone = cleanField(lead.whatsapp || lead.phone);

  return [
    '🚨 طلب اشتراك جديد (النائب الذكي)',
    '',
    '📌 رقم الطلب: ' + leadId,
    '🏷️ الباقة المختارة: ' + packageName,
    '💰 السعر الفعلي: ' + priceLine,
    '🏬 اسم المحل/المنشأة: ' + businessName,
    '📞 رقم الهاتف/واتساب: ' + phone,
    timestampLine(lead),
  ].join('\n');
}

function formatWidgetMediaCaption(payload) {
  const customerLabel = cleanField(payload.customerLabel);
  const message = cleanField(String(payload.message || '').slice(0, 400));

  return [
    '🚨 إشعار جديد مع مرفق (صورة / إيصال دفع)',
    '',
    '👤 اسم الزبون / بيانات المحل: ' + customerLabel,
    '💬 رسالة الزبون: ' + message,
    timestampLine(payload),
    '',
    '📎 الصورة مرفقة أدناه للمراجعة والتحقق.',
  ].join('\n').slice(0, 1024);
}

function formatSubRequestCaption(req, aiResult, formatPlausibility) {
  const pl = typeof formatPlausibility === 'function'
    ? formatPlausibility(aiResult && aiResult.plausibilityLevel)
    : cleanField(aiResult && aiResult.plausibilityLevel);
  const accRow = typeof req._accountPhone === 'string' ? req._accountPhone : '';
  const phone = cleanField(accRow || req._phone);
  const price = cleanField(Number(req.price) || 0) + ' MRU';

  const lines = [
    '🧾 طلب اشتراك جديد',
    '',
    '👤 العميل: ' + cleanField(req.account || req.accountId),
    '📱 الهاتف: ' + phone,
    '📦 الباقة: ' + cleanField(req.pkg),
    '💰 المبلغ: ' + price,
    '🔍 الموثوقية: ' + cleanField(pl),
    '🏷 الفئة: ' + cleanField(req.category || 'package'),
    '🆔 المرجع: ' + cleanField(req.id),
    timestampLine(req),
  ];

  if (aiResult && aiResult.amount) {
    lines.push('💵 مبلغ الوصل: ' + cleanField(aiResult.amount));
  }
  if (aiResult && aiResult.date) {
    lines.push('📅 تاريخ الوصل: ' + cleanField(aiResult.date));
  }
  if (aiResult && aiResult.bankOrOperator) {
    lines.push('🏦 الجهة: ' + cleanField(aiResult.bankOrOperator));
  }
  if (aiResult && Array.isArray(aiResult.notes) && aiResult.notes.length) {
    lines.push('📝 ملاحظات: ' + cleanField(aiResult.notes.slice(0, 2).join(' · ')));
  }

  return lines.join('\n');
}

function formatPendingLeadsList(leads, formatRowTimestamp) {
  if (!leads.length) {
    return '📭 لا توجد طلبات معلّقة (pending) في السجل حالياً.';
  }

  const lines = [
    '📋 طلبات Leads معلّقة (' + cleanField(leads.length) + ')',
    '',
  ];

  leads.slice(0, 15).forEach((l, i) => {
    const ts = typeof formatRowTimestamp === 'function'
      ? formatRowTimestamp(l)
      : timestampLine(l).replace('🕐 التوقيت المحلي: ', '🕐 ');
    lines.push(
      cleanField(i + 1) + '. ' + cleanField(l.businessName),
      '   📱 ' + cleanField(l.whatsapp),
      '   📦 ' + cleanField(l.package),
      '   💰 ' + cleanField(l.packagePriceLabel || (l.packagePrice != null ? l.packagePrice + ' MRU' : null)),
      '   🆔 ' + cleanField(l.id) + ' · 📡 ' + cleanField(l.channel || l.source),
      '   ' + ts,
      ''
    );
  });

  if (leads.length > 15) {
    lines.push('… و' + cleanField(leads.length - 15) + ' طلبات أخرى');
  }

  return lines.join('\n');
}

module.exports = {
  cleanField,
  resolveNotifyDate,
  timestampLine,
  formatLeadAlertText,
  formatWidgetMediaCaption,
  formatSubRequestCaption,
  formatPendingLeadsList,
};
