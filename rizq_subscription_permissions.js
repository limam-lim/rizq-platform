/**
 * rizq_subscription_permissions.js
 * صلاحيات الاشتراك والتجربة — واجهة موحّدة للواجهة العامة والداشبورد.
 *
 * قاعدة المنصة:
 *   - صفحات النماذج / الديمو: كل شيء مفتوح (اتصال، واتساب، محادثة، أزرار).
 *   - حساب حقيقي: isContactVisible = isPaid || isTrialActive
 *   - داشبورد حقيقي بعد انتهاء التجربة: قراءة فقط حتى الاشتراك.
 */
(function (global) {
  'use strict';

  function _statusOf(accId) {
    if (global.RizqSub && typeof global.RizqSub.checkSubscription === 'function' && accId) {
      try { return global.RizqSub.checkSubscription(accId) || {}; } catch (e) { return {}; }
    }
    return {};
  }

  function isDemoAccountId(id) {
    id = String(id || '');
    if (!id) return false;
    if (/^demo/i.test(id)) return true;           /* demo_store, demo_law, demo-corp-001, demo_estate_* */
    if (/^acc_promo_/i.test(id)) return true;
    return false;
  }

  function isDemoPage(opts) {
    opts = opts || {};
    if (opts.forceDemo || opts.isDemo) return true;
    try {
      var search = (global.location && global.location.search) || (typeof location !== 'undefined' && location.search) || '';
      var path = (global.location && global.location.pathname) || (typeof location !== 'undefined' && location.pathname) || '';
      if (/[?&]demo=1(?:&|$)/.test(String(search))) return true;
      if (/\/demo(?:\/|$)/i.test(String(path))) return true;
    } catch (e) {}
    if (global._rizqStoreIsDemo || global._rizqOfficeIsDemo || global._rizqEstateIsDemo || global._rizqCorpIsDemo || global._rizqShowroomIsDemo) return true;
    var id = String(opts.accountId || global._rizqStoreAccountId || global._rizqOfficeAccountId || global._rizqEstateAccountId || global._pageAccountId || '');
    return isDemoAccountId(id);
  }

  function useSubscriptionPermissions(accId, opts) {
    opts = opts || {};
    /* النماذج: دائماً مفتوحة — لا قفل اتصال ولا وضع قراءة فقط */
    var demo = isDemoPage({ accountId: accId, forceDemo: opts.isDemo || opts.forceDemo });
    if (demo) {
      return {
        accountId: accId || '',
        status: 'demo',
        isDemoPage: true,
        isPaid: false,
        isTrialActive: false,
        isExpired: false,
        isContactVisible: true,
        contactsLocked: false,
        isDashboardWritable: true,
        upgradeMessageAr: 'انتهت الفترة المجانية. يرجى الاشتراك في إحدى الباقات لتتمكن من إضافة إعلانات جديدة وتفعيل زر الاتصال للزبائن',
        upgradeMessageFr: 'La période d’essai est terminée. Veuillez souscrire à une offre pour publier de nouvelles annonces et activer le bouton d’appel pour vos clients.',
        lockedContactLabelAr: 'رقم التواصل غير متاح حالياً',
        lockedContactLabelFr: 'Numéro de contact indisponible pour le moment',
        sub: { status: 'demo', isDemo: true }
      };
    }
    var sub = _statusOf(accId);
    var status = String(sub.status || 'no_subscription');
    var isTrialActive = status === 'trial' || status === 'trial_expiring' || (!!sub.isTrial && !sub.isExpired && status !== 'expired');
    var isPaid = status === 'active' || status === 'expiring_soon';
    var isExpired = status === 'expired' || status === 'no_subscription' || status === 'pending' || status === 'suspended';
    var isContactVisible = !!(isPaid || isTrialActive);
    var isDashboardWritable = !!(isPaid || isTrialActive);
    return {
      accountId: accId || '',
      status: status,
      isDemoPage: false,
      isPaid: isPaid,
      isTrialActive: isTrialActive,
      isExpired: isExpired,
      isContactVisible: isContactVisible,
      contactsLocked: !isContactVisible,
      isDashboardWritable: isDashboardWritable,
      upgradeMessageAr: 'انتهت الفترة المجانية. يرجى الاشتراك في إحدى الباقات لتتمكن من إضافة إعلانات جديدة وتفعيل زر الاتصال للزبائن',
      upgradeMessageFr: 'La période d’essai est terminée. Veuillez souscrire à une offre pour publier de nouvelles annonces et activer le bouton d’appel pour vos clients.',
      lockedContactLabelAr: 'رقم التواصل غير متاح حالياً',
      lockedContactLabelFr: 'Numéro de contact indisponible pour le moment',
      sub: sub
    };
  }

  function disableFormsAndShowUpgradeBanner(root, perms) {
    root = typeof root === 'string' ? document.querySelector(root) : root;
    if (!root || !perms || perms.isDashboardWritable) return;
    var fr = false;
    try { fr = (localStorage.getItem('rizq_lang') || 'ar') === 'fr'; } catch (e) {}
    var msg = fr ? perms.upgradeMessageFr : perms.upgradeMessageAr;
    if (!root.querySelector('.rizq-readonly-banner')) {
      var ban = document.createElement('div');
      ban.className = 'rizq-readonly-banner';
      ban.setAttribute('role', 'alert');
      ban.style.cssText = 'margin:0 0 14px;padding:14px 16px;border-radius:14px;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;font:700 13.5px Cairo,sans-serif;line-height:1.65';
      ban.textContent = msg;
      root.insertBefore(ban, root.firstChild);
    }
    root.querySelectorAll('button, input, select, textarea, a.btn, [data-rizq-write]').forEach(function (el) {
      if (el.closest('.rizq-readonly-banner')) return;
      if (el.getAttribute('data-rizq-allow') === '1') return;
      if (el.tagName === 'A' && /renew|باقة|اشتراك|package/i.test(el.href || el.textContent || '')) return;
      if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        el.disabled = true;
        el.setAttribute('aria-disabled', 'true');
      }
      el.style.pointerEvents = 'none';
      el.style.opacity = el.style.opacity || '0.55';
    });
  }

  global.RizqSubscriptionPermissions = {
    useSubscriptionPermissions: useSubscriptionPermissions,
    isDemoPage: isDemoPage,
    disableFormsAndShowUpgradeBanner: disableFormsAndShowUpgradeBanner
  };
  global.useSubscriptionPermissions = useSubscriptionPermissions;
})(typeof window !== 'undefined' ? window : this);
