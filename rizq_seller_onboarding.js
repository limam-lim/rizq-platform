/**
 * rizq_seller_onboarding.js — معالج إعداد البائع (3 خطوات)
 * © Rizq ADMINIA SARL
 */
(function (global) {
  'use strict';
  if (global.RizqSellerOnboarding) return;

  var STORAGE_PREFIX = 'rizq_onboarding_done_';

  function lang() {
    try {
      if (typeof global._rizqLang === 'function') return global._rizqLang();
      return localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar';
    } catch (e) {
      return 'ar';
    }
  }

  function t(ar, fr) {
    return lang() === 'fr' ? fr : ar;
  }

  function isDone(accountId) {
    if (!accountId) return true;
    try {
      return localStorage.getItem(STORAGE_PREFIX + accountId) === '1';
    } catch (e) {
      return false;
    }
  }

  function markDone(accountId) {
    if (!accountId) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + accountId, '1');
    } catch (e) {}
  }

  function stepConfig(accountType) {
    var type = accountType || 'individual';
    if (type === 'store') {
      return {
        profile: { icon: '🏪', title: t('أكمل معلومات المحل', 'Complétez les infos boutique'), desc: t('الاسم، الواتساب، والوصف', 'Nom, WhatsApp et description'), action: t('فتح الملف', 'Ouvrir le profil'), panel: 'profile' },
        content: { icon: '📦', title: t('أضف أول منتج', 'Ajoutez votre premier produit'), desc: t('اعرض منتجاتك للزوار', 'Présentez vos produits aux visiteurs'), action: t('إضافة منتج', 'Ajouter un produit'), panel: 'products' },
        share: { icon: '📤', title: t('شارك صفحة محلك', 'Partagez votre boutique'), desc: t('QR + واتساب للوصول السريع', 'QR + WhatsApp pour un accès rapide'), action: t('مشاركة الآن', 'Partager maintenant'), panel: null }
      };
    }
    if (type === 'office') {
      return {
        profile: { icon: '🏢', title: t('أكمل معلومات المكتب', 'Complétez les infos bureau'), desc: t('النشاط، المدينة، وبيانات التواصل', 'Activité, ville et contacts'), action: t('فتح الملف', 'Ouvrir le profil'), panel: 'profile' },
        content: { icon: '🛠️', title: t('أضف أول خدمة', 'Ajoutez votre premier service'), desc: t('اعرض خدماتك للعملاء', 'Présentez vos services aux clients'), action: t('إضافة خدمة', 'Ajouter un service'), panel: 'services' },
        share: { icon: '📤', title: t('شارك صفحة مكتبك', 'Partagez votre bureau'), desc: t('QR + واتساب للوصول السريع', 'QR + WhatsApp pour un accès rapide'), action: t('مشاركة الآن', 'Partager maintenant'), panel: null }
      };
    }
    if (type === 'corp') {
      return {
        profile: { icon: '🏭', title: t('أكمل معلومات المعرض', 'Complétez les infos showroom'), desc: t('الاسم، النشاط، وبيانات التواصل', 'Nom, activité et contacts'), action: t('فتح الملف', 'Ouvrir le profil'), panel: 'profile' },
        content: { icon: '📦', title: t('أضف أول منتج للمعرض', 'Ajoutez votre premier produit'), desc: t('اعرض منتجات المعرض', 'Présentez les produits du showroom'), action: t('إضافة منتج', 'Ajouter un produit'), panel: 'products' },
        share: { icon: '📤', title: t('شارك صفحة المعرض', 'Partagez votre showroom'), desc: t('QR + واتساب للوصول السريع', 'QR + WhatsApp pour un accès rapide'), action: t('مشاركة الآن', 'Partager maintenant'), panel: null }
      };
    }
    return {
      profile: { icon: '👤', title: t('أكمل ملفك الشخصي', 'Complétez votre profil'), desc: t('الاسم، الهاتف، والمدينة', 'Nom, téléphone et ville'), action: t('فتح الملف', 'Ouvrir le profil'), panel: 'profile' },
      content: { icon: '📋', title: t('انشر إعلانك الأول', 'Publiez votre première annonce'), desc: t('ابدأ باستقبال العملاء', 'Commencez à recevoir des clients'), action: t('إعلان جديد', 'Nouvelle annonce'), panel: null, href: 'rizq_post.html' },
      share: { icon: '📤', title: t('شارك ملفك العام', 'Partagez votre profil public'), desc: t('QR + واتساب للوصول السريع', 'QR + WhatsApp pour un accès rapide'), action: t('مشاركة الآن', 'Partager maintenant'), panel: null }
    };
  }

  function profileComplete(acc, accountType) {
    if (!acc) return false;
    if (accountType === 'store' || accountType === 'office' || accountType === 'corp') {
      return !!(acc.name && (acc.phone || acc.whatsapp));
    }
    return !!(acc.name && (acc.phone || acc.whatsapp || acc.email));
  }

  function injectStyles() {
    if (document.getElementById('rizq-onboard-styles')) return;
    var css = document.createElement('style');
    css.id = 'rizq-onboard-styles';
    css.textContent = [
      '#rizq-onboard-overlay{position:fixed;inset:0;background:rgba(8,15,30,.72);z-index:12000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)}',
      '#rizq-onboard-box{background:#fff;border-radius:18px;max-width:440px;width:100%;padding:24px 22px;box-shadow:0 24px 60px rgba(8,15,30,.35);direction:rtl;font-family:inherit}',
      '#rizq-onboard-box[dir=ltr]{direction:ltr}',
      '.rizq-onboard-steps{display:flex;gap:8px;margin-bottom:18px}',
      '.rizq-onboard-dot{flex:1;height:5px;border-radius:99px;background:rgba(27,58,107,.12)}',
      '.rizq-onboard-dot.on{background:linear-gradient(90deg,#C9A84C,#e8c96a)}',
      '.rizq-onboard-icon{font-size:42px;margin-bottom:8px}',
      '.rizq-onboard-title{font-size:18px;font-weight:800;color:#1B3A6B;margin-bottom:6px}',
      '.rizq-onboard-desc{font-size:13px;color:#64748b;line-height:1.65;margin-bottom:18px}',
      '.rizq-onboard-actions{display:flex;gap:10px;flex-wrap:wrap}',
      '.rizq-onboard-btn{flex:1;min-width:120px;padding:11px 16px;border-radius:11px;font-weight:800;font-size:13px;cursor:pointer;border:none;font-family:inherit}',
      '.rizq-onboard-primary{background:linear-gradient(135deg,#1B3A6B,#234d8f);color:#fff}',
      '.rizq-onboard-secondary{background:#f1f5f9;color:#475569}',
      '.rizq-onboard-skip{background:none;border:none;color:#94a3b8;font-size:12px;cursor:pointer;margin-top:12px;width:100%;font-family:inherit}'
    ].join('');
    document.head.appendChild(css);
  }

  function closeOverlay() {
    var ov = document.getElementById('rizq-onboard-overlay');
    if (ov) ov.remove();
    document.body.style.overflow = '';
  }

  function goPanel(panel) {
    if (!panel) return;
    if (typeof global.showPanel === 'function') {
      global.showPanel(panel, null);
      return;
    }
    var el = document.querySelector('.sb-item[onclick*="' + panel + '"],.nav-item[onclick*="' + panel + '"]');
    if (el && typeof global.showPanel === 'function') global.showPanel(panel, el);
  }

  function renderStep(stepIdx, cfg, state, opts) {
    var keys = ['profile', 'content', 'share'];
    var key = keys[stepIdx];
    var step = cfg[key];
    var done = state[key];
    var fr = lang() === 'fr';
    var box = document.getElementById('rizq-onboard-box');
    if (!box) return;
    box.setAttribute('dir', fr ? 'ltr' : 'rtl');
    var dots = keys.map(function (_, i) {
      return '<div class="rizq-onboard-dot' + (i <= stepIdx ? ' on' : '') + '"></div>';
    }).join('');
    box.innerHTML =
      '<div class="rizq-onboard-steps">' + dots + '</div>' +
      '<div class="rizq-onboard-icon">' + (done ? '✅' : step.icon) + '</div>' +
      '<div class="rizq-onboard-title">' + (done ? t('تمت هذه الخطوة!', 'Étape terminée !') : step.title) + '</div>' +
      '<div class="rizq-onboard-desc">' + (done ? t('يمكنك الانتقال للخطوة التالية.', 'Vous pouvez passer à l\'étape suivante.') : step.desc) + '</div>' +
      '<div class="rizq-onboard-actions">' +
      (stepIdx > 0 ? '<button type="button" class="rizq-onboard-btn rizq-onboard-secondary" data-act="back">' + t('← السابق', '← Précédent') + '</button>' : '') +
      '<button type="button" class="rizq-onboard-btn rizq-onboard-primary" data-act="next">' +
      (stepIdx === 2 ? t('إنهاء', 'Terminer') : (done ? t('التالي →', 'Suivant →') : step.action)) +
      '</button></div>' +
      '<button type="button" class="rizq-onboard-skip" data-act="skip">' + t('تخطّي الآن', 'Passer pour l\'instant') + '</button>';

    box.querySelector('[data-act="skip"]').onclick = function () {
      markDone(opts.accountId);
      closeOverlay();
    };
    box.querySelector('[data-act="back"]').onclick = function () {
      renderStep(stepIdx - 1, cfg, state, opts);
    };
    box.querySelector('[data-act="next"]').onclick = function () {
      if (!done) {
        if (key === 'share') {
          if (typeof opts.onShare === 'function') opts.onShare();
          else if (typeof global.openShareModal === 'function') global.openShareModal();
        } else if (step.href) {
          location.href = step.href;
        } else if (step.panel) {
          goPanel(step.panel);
        }
        state[key] = true;
      }
      if (stepIdx >= 2) {
        markDone(opts.accountId);
        closeOverlay();
        return;
      }
      renderStep(stepIdx + 1, cfg, state, opts);
    };
  }

  function maybeShow(opts) {
    opts = opts || {};
    var acc = opts.account || {};
    var accountId = acc.id || opts.accountId || '';
    var accountType = acc.type || opts.accountType || 'individual';
    if (opts.isDemo || !accountId || isDone(accountId)) return;

    var cfg = stepConfig(accountType);
    var contentCount = typeof opts.contentCount === 'number' ? opts.contentCount : 0;
    var state = {
      profile: profileComplete(acc, accountType),
      content: contentCount > 0,
      share: false
    };
    if (state.profile && state.content) return;

    injectStyles();
    closeOverlay();
    var ov = document.createElement('div');
    ov.id = 'rizq-onboard-overlay';
    ov.innerHTML = '<div id="rizq-onboard-box"></div>';
    ov.addEventListener('click', function (e) {
      if (e.target === ov) {
        markDone(accountId);
        closeOverlay();
      }
    });
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    renderStep(0, cfg, state, {
      accountId: accountId,
      onShare: opts.onShare
    });
  }

  global.RizqSellerOnboarding = {
    maybeShow: maybeShow,
    markDone: markDone,
    isDone: isDone
  };
})(typeof window !== 'undefined' ? window : globalThis);
