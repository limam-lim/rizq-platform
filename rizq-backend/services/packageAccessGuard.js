/**
 * packageAccessGuard.js — بوابة مركزية: تفعيل مالي + حصص + عزل الميزات
 */
const {
  getEntitlements,
  assertSubscriptionActive,
  assertFeature,
  assertCallsChannel,
  isAiEligible,
  entitlementError,
} = require('./entitlements');
const {
  assertQuotaAvailable,
  getQuotaBlockReason,
} = require('../../rizq_quota_guard_agent');

async function getAccountEntitlements(acc) {
  if (!acc || !acc.id) {
    return await getEntitlements('', acc && acc.type ? acc.type : 'individual');
  }
  return await getEntitlements(acc.id, acc.type || 'individual');
}

async function assertAccountFeature(acc, featureName) {
  const ent = await getAccountEntitlements(acc);
  assertSubscriptionActive(ent);
  assertFeature(ent, featureName);
  return ent;
}

async function accountHasFeatureStrict(acc, featureName) {
  try {
    await assertAccountFeature(acc, featureName);
    return true;
  } catch (e) {
    return false;
  }
}

async function accountHasAiAgentStrict(acc) {
  if (!acc || acc.status !== 'approved' || acc.suspended) return false;
  try {
    const ent = await getAccountEntitlements(acc);
    assertSubscriptionActive(ent);
    if (!isAiEligible(ent)) return false;
    return ent.features.includes('ai_agent_full');
  } catch (e) {
    return false;
  }
}

async function assertAiAgentAccess(acc, opts) {
  const ent = await assertAccountFeature(acc, 'ai_agent_full');
  if (!isAiEligible(ent)) {
    throw entitlementError('ai_payment_required', 'الوكيل الماسي يتطلب اشتراكاً مدفوعاً ومؤكداً — غير متاح في التجربة المجانية');
  }
  const channel = (opts && opts.channel) || 'widget';
  if (channel === 'call') {
    assertCallsChannel(ent);
  }
  try {
    await assertQuotaAvailable({
      subscriberId: acc.phone || acc.whatsapp || acc.id,
      accountId: acc.id,
      channel,
      diamondTier: ent.diamondTier,
      quotaLimits: ent.quotaLimits,
    });
  } catch (qErr) {
    const reason = await getQuotaBlockReason(acc.phone || acc.id, acc.id, channel).catch(() => qErr.message);
    const err = entitlementError('quota_exhausted', qErr.message || reason);
    err.details = qErr.details || {};
    throw err;
  }
  return ent;
}

function resolveAccessDenialMessage(ent) {
  if (!ent) return 'لا يوجد اشتراك نشط';
  switch (ent.subscriptionStatus) {
    case 'pending':
      return 'باقتك قيد انتظار تأكيد الدفع — لا يمكن استخدام هذه الميزة حتى تتم الموافقة على الوصل';
    case 'expired':
      return 'انتهت مدة باقتك — جدّد الاشتراك لاستعادة الميزات';
    case 'suspended':
      return 'تم إيقاف اشتراكك — جدّد الباقة لاستعادة الوصول';
    case 'no_subscription':
      return 'لا توجد باقة نشطة — اشترك أو جدّد للوصول لهذه الميزة';
    default:
      if (ent.isTrial) {
        return 'خدمات الذكاء الاصطناعي غير متاحة في الباقة التجريبية — اشترك في باقة ماسية مدفوعة';
      }
      return 'هذه الميزة غير متاحة في باقتك الحالية';
  }
}

async function assertDiamondWidgetAccess(body, readAccountsFn, channel) {
  const profile = body && body.profile;
  const accountId = String(
    (profile && profile.accountId) || body.accountId || ''
  ).trim();
  if (!accountId || typeof readAccountsFn !== 'function') return null;

  const list = await readAccountsFn();
  const acc = (Array.isArray(list) ? list : []).find((a) => a.id === accountId);
  if (!acc) {
    const err = entitlementError('account_not_found', 'الحساب غير موجود');
    err.status = 404;
    throw err;
  }
  try {
    await assertAiAgentAccess(acc, { channel: channel || 'widget' });
  } catch (e) {
    const ent = await getAccountEntitlements(acc);
    if (e.code === 'quota_exhausted') throw e;
    e.message = resolveAccessDenialMessage(ent);
    throw e;
  }
  return acc;
}

async function assertApiIntegrationAccess(acc) {
  const ent = await assertAccountFeature(acc, 'api_erp_integration');
  if (acc.type !== 'corp') {
    throw entitlementError('corp_only', 'تكامل API متاح لحسابات الشركات (الماسية Pro) فقط');
  }
  return ent;
}

module.exports = {
  getAccountEntitlements,
  assertAccountFeature,
  accountHasFeatureStrict,
  accountHasAiAgentStrict,
  assertAiAgentAccess,
  resolveAccessDenialMessage,
  assertDiamondWidgetAccess,
  assertApiIntegrationAccess,
};
