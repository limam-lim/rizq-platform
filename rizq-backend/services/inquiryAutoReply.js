/**
 * رد تلقائي على استفسارات الداشبورد (/api/messages) عبر Claude
 * يُفعَّل فقط للباقة الماسية + الوكيل غير موقوف (agent-status.json)
 */
const { handleWidgetChat } = require('./widgetChat');
const { isActive } = require('./agentStatus');
const { isAnthropicConfigured } = require('../config/anthropic');
const { getEntitlements } = require('./entitlements');

function accountHasAiAgent(acc) {
  if (!acc || acc.status !== 'approved' || acc.suspended) return false;
  const ent = getEntitlements(acc.id, acc.type);
  return ent.flags && ent.flags.aiAgent;
}

function buildProfileFromAccount(acc) {
  return {
    businessName: acc.name || 'المنشأة',
    tier: 'diamond',
    channels: {
      phone: acc.phone || '',
      whatsapp: acc.whatsapp || acc.phone || '',
      email: acc.email || '',
      location: [acc.city, acc.address].filter(Boolean).join(' — '),
    },
    persona: {
      agentTitle: acc.type === 'corp'
        ? 'سكرتارية ' + (acc.name || '')
        : acc.type === 'office'
          ? 'مساعد المكتب'
          : 'مساعد المحل',
    },
  };
}

function buildChatHistory(messages) {
  return (messages || []).slice(-8).map((m) => ({
    role: m.fromRole === 'buyer' ? 'user' : 'agent',
    text: m.body,
  }));
}

async function maybeAutoReplyToInquiry({ sellerAccount, buyerMessage, threadKey, readMessagesFn, writeMessagesFn }) {
  if (!isAnthropicConfigured()) return null;
  if (!accountHasAiAgent(sellerAccount)) return null;

  const phone = sellerAccount.phone || sellerAccount.whatsapp || '';
  if (phone && !isActive(phone)) return null;

  const all = readMessagesFn();
  const threadMsgs = all
    .filter((m) => m.threadKey === threadKey)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const pageContext = buyerMessage.adId
    ? { page: 'listing', urlAdId: buyerMessage.adId, ad: { id: buyerMessage.adId, title: buyerMessage.adTitle } }
    : { page: 'inquiry' };

  const result = await handleWidgetChat({
    message: buyerMessage.body,
    lang: 'ar',
    uiLang: 'ar',
    profile: buildProfileFromAccount(sellerAccount),
    history: buildChatHistory(threadMsgs.slice(0, -1)),
    pageContext,
  });

  if (!result || !result.reply) return null;

  const rec = {
    id: 'MSG-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
    threadKey,
    sellerAccountId: sellerAccount.id,
    buyerAccountId: buyerMessage.buyerAccountId || null,
    buyerName: '',
    buyerPhone: '',
    adId: buyerMessage.adId || null,
    adTitle: buyerMessage.adTitle || null,
    body: String(result.reply).slice(0, 3000),
    fromRole: 'agent',
    aiGenerated: true,
    read: true,
    createdAt: new Date().toISOString(),
  };

  all.push(rec);
  writeMessagesFn(all);
  console.log('[inquiry-auto-reply]', sellerAccount.id, threadKey, rec.body.slice(0, 80) + '…');
  return rec;
}

module.exports = {
  accountHasAiAgent,
  buildProfileFromAccount,
  buildChatHistory,
  maybeAutoReplyToInquiry,
};
