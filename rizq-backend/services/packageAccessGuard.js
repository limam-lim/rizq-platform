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

function getAccountEntitlements(acc) {
  if (!acc || !acc.id) {
    return getEntitlements('', acc && acc.type ? acc.type : 'individual');
  }
  return getEntitlements(acc.id, acc.type || 'individual');
}

function assertAccountFeature(acc, featureName) {
  const ent = getAccountEntitlements(acc);
  assertSubscriptionActive(ent);
  assertFeature(ent, featureName);
  return ent;
}

function accountHasFeatureStrict(acc, featureName) {
  try {
    assertAccountFeature(acc, featureName);
    return true;
  } catch (e) {
    return false;
  }
}

function accountHasAiAgentStrict(acc) {
  if (!acc || acc.status !== 'approved' || acc.suspended) return false;
  try {
    const ent = getAccountEntitlements(acc);
    assertSubscriptionActive(ent);
    if (!isAiEligible(ent)) return false;
    return ent.features.includes('ai_agent_full');
  } catch (e) {
    return false;
  }
}

function assertAiAgentAccess(acc, opts) {
  const ent = assertAccountFeature(acc, 'ai_agent_full');
  if (!isAiEligible(ent)) {
    throw entitlementError('ai_payment_required', 'الوكيل الماسي يتطلب اشتراكاً مدفوعاً ومؤكداً — غير متاح في التجربة المجانية');
  }
  const channel = (opts && opts.channel) || 'widget';
  if (channel === 'call') {
    assertCallsChannel(ent);
  }
  try {
    assertQuotaAvailable({
      subscriberId: acc.phone || acc.whatsapp || acc.id,
      accountId: acc.id,
      channel,
      diamondTier: ent.diamondTier,
      quotaLimits: ent.quotaLimits,
    });
  } catch (qErr) {
    const err = entitlementError('quota_exhausted', qErr.message || getQuotaBlockReason(acc.phone || acc.id, acc.id, channel));
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

function assertDiamondWidgetAccess(body, readAccountsFn, channel) {
  const profile = body && body.profile;
  const accountId = String(
    (profile && profile.accountId) || body.accountId || ''
  ).trim();
  if (!accountId || typeof readAccountsFn !== 'function') return null;

  const acc = readAccountsFn().find((a) => a.id === accountId);
  if (!acc) {
    const err = entitlementError('account_not_found', 'الحساب غير موجود');
    err.status = 404;
    throw err;
  }
  try {
    assertAiAgentAccess(acc, { channel: channel || 'widget' });
  } catch (e) {
    const ent = getAccountEntitlements(acc);
    if (e.code === 'quota_exhausted') throw e;
    e.message = resolveAccessDenialMessage(ent);
    throw e;
  }
  return acc;
}

module.exports = {
  getAccountEntitlements,
  assertAccountFeature,
  accountHasFeatureStrict,
  accountHasAiAgentStrict,
  assertAiAgentAccess,
  resolveAccessDenialMessage,
  assertDiamondWidgetAccess,
};
