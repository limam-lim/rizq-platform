/**
 * rizq_auth_gate.js — بوابة العضو / حساب الأعمال (Guest Gate) v19.3
 * اسم + بريد + واتساب + (هاتف MR أو دولي) + OTP بالبريد
 * v19.3: تسميات أوسع من بائع/مشتري — حساب شخصي · حساب أعمال · دخول رزق
 */
(function () {
  'use strict';
  if (window.RizqAuthGate) return;

  var SESSION_KEY = 'rizq_buyer_session';
  var WISHLIST_KEY = 'rizq_wishlist';
  var DRAFT_KEY = 'rizq_buyer_draft';
  var VERIFIED_EMAILS_KEY = 'rizq_verified_emails';
  var _pendingAction = null;
  var _modalMode = 'gate';
  var _sellerOtpCallback = null;
  var _otpTimer = null;
  var _otpConfig = { devHintEnabled: false, production: false };
  var _ragOpenedAt = 0;
  var _lastReasonKey = 'reasonGeneric';

  var MR_PHONE_RE = /^(2[0-9]|3[0-9]|4[0-9])\d{6}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function apiBase() {
    return window.RIZQ_BACKEND_BASE ? window.RIZQ_BACKEND_BASE.replace(/\/$/, '') : '';
  }

  function isLocalDevHost() {
    try {
      var h = window.location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h === '';
    } catch (e) { return false; }
  }

  function lang() {
    try {
      var htmlLang = document.documentElement.getAttribute('lang');
      if (htmlLang === 'fr' || htmlLang === 'ar') return htmlLang;
      if (typeof window._rizqLang === 'function') return window._rizqLang();
    } catch (e) {}
    try { return localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar'; } catch (e2) { return 'ar'; }
  }

  function t(ar, fr) { return lang() === 'fr' ? fr : ar; }

  var DICT = {
    ar: {
      titleGate: 'خطوة أخيرة قبل المتابعة',
      titleAccount: 'حسابي',
      titleOtp: 'تأكيد بريدك الإلكتروني',
      titleChoice: 'حسابي على رزق',
      subGate: 'سجّل مجاناً للتواصل وحفظ المفضلة واستخدام غرف المنصة — أقل من دقيقة',
      subAccount: 'حسابك على رزق — للتصفح والتواصل والمفضلة',
      subOtp: 'أدخل الرمز المُرسَل إلى بريدك الإلكتروني',
      subReturning: 'مرحباً بعودتك! أكّد بريدك برمز التحقق',
      subChoice: 'اختر بوضوح: حساب شخصي، أو حساب أعمال جديد، أو دخول لحساب موجود',
      choiceBuyer: '👤 أتصفّح وأتواصل',
      choiceBuyerSub: 'حساب شخصي للتواصل والمفضلة والمناقصات — أقل من دقيقة',
      choiceSeller: '🏢 أنشر وأدير — حساب أعمال جديد',
      choiceSellerSub: 'إعلانات · محل · مكتب · معرض · مناقصات · استثمارات',
      choiceSellerLogin: '🔑 لدي حساب على رزق — دخول',
      choiceSellerLoginSub: 'البريد وكلمة المرور للوحة التحكم',
      nameLabel: 'الاسم الكامل *',
      namePh: 'مثال: محمد أحمد ولد سيدي',
      phoneMrLabel: 'هاتف موريتاني (اختياري)',
      phoneMrPh: '2X XX XX XX',
      phoneIntlLabel: 'هاتف دولي (اختياري)',
      phoneIntlPh: '+33 6 12 34 56 78',
      phoneHint: 'أدخل هاتفاً موريتانياً أو رقماً دولياً — واحد على الأقل',
      whatsappLabel: 'واتساب *',
      whatsappPh: '+222 2X XX XX XX',
      waSame: 'نفس الرقم أعلاه',
      emailLabel: 'البريد الإلكتروني *',
      emailPh: 'example@email.com',
      sendOtp: 'إرسال رمز التحقق',
      sendingOtp: 'جارٍ الإرسال...',
      verifyBtn: 'تأكيد وتفعيل الحساب',
      verifying: 'جارٍ التحقق...',
      backEdit: '← تعديل البيانات',
      resend: 'إعادة إرسال الرمز',
      resendIn: 'إعادة الإرسال خلال',
      privacy: '🔒 بياناتك محمية — للتواصل والمفضلة ومكافحة الحسابات الوهمية فقط.',
      backBtn: '← رجوع',
      linkPrivacy: 'الخصوصية',
      linkTerms: 'الشروط',
      linkHelp: 'المساعدة',
      reasonBadgePrefix: 'مطلوب',
      formIntro: 'املأ البيانات التالية ثم أكّد بريدك برمز قصير',
      errName: 'يرجى إدخال الاسم الكامل (الاسم واللقب)',
      errPhone: 'أدخل هاتفاً موريتانياً (8 أرقام) أو رقماً دولياً صالحاً',
      errWhatsapp: 'رقم واتساب صالح مطلوب',
      errEmail: 'البريد الإلكتروني مطلوب وصالح',
      errOtp: 'أدخل رمز التحقق كاملاً (6 أرقام)',
      errNetwork: 'تعذّر الاتصال بالخادم — تحقق من الإنترنت وحاول مرة أخرى',
      errBackendDown: 'الخادم الخلفي غير منشور بعد — يجب نشر rizq-backend على Render (راجع render.yaml في المستودع). أول طلب قد يستغرق دقيقة.',
      successToast: '✅ تم تفعيل حسابك بنجاح',
      welcomeBack: '👋 أهلاً بعودتك',
      logout: 'تسجيل الخروج',
      sellerCta: '🏢 أفتح حساب أعمال على رزق',
      loggedAs: 'مسجّل كعضو',
      reasonPhone: 'لعرض رقم الهاتف',
      reasonWhatsapp: 'للتواصل عبر واتساب',
      reasonMsg: 'لإرسال رسالة',
      reasonFav: 'لإضافة الإعلان للمفضلة',
      reasonGeneric: 'للمتابعة',
      otpSent: 'تم إرسال الرمز إلى بريدك',
      otpDevHint: 'بيئة تطوير — الرمز:',
    },
    fr: {
      titleGate: 'Dernière étape avant de continuer',
      titleAccount: 'Mon compte',
      titleOtp: 'Confirmez votre e-mail',
      titleChoice: 'Mon compte Rizq',
      subGate: 'Inscrivez-vous gratuitement pour contacter, sauvegarder vos favoris et utiliser les salles Rizq',
      subAccount: 'Votre compte Rizq — navigation, contact et favoris',
      subOtp: 'Saisissez le code envoyé à votre e-mail',
      subReturning: 'Bon retour ! Confirmez votre e-mail avec le code',
      subChoice: 'Choisissez clairement : compte personnel, nouveau compte pro, ou connexion',
      choiceBuyer: '👤 Je parcours et je contacte',
      choiceBuyerSub: 'Compte personnel — contact, favoris et salles Rizq',
      choiceSeller: '🏢 Je publie et gère — nouveau compte pro',
      choiceSellerSub: 'Annonces · boutique · bureau · showroom · appels d\'offres · investissements',
      choiceSellerLogin: '🔑 J\'ai un compte Rizq — Connexion',
      choiceSellerLoginSub: 'E-mail et mot de passe du tableau de bord',
      nameLabel: 'Nom complet *',
      namePh: 'Ex : Mohamed Ahmed Ould Sidi',
      phoneMrLabel: 'Tél. mauritanien (optionnel)',
      phoneMrPh: '2X XX XX XX',
      phoneIntlLabel: 'Tél. international (optionnel)',
      phoneIntlPh: '+33 6 12 34 56 78',
      phoneHint: 'Au moins un numéro mauritanien ou international',
      whatsappLabel: 'WhatsApp *',
      whatsappPh: '+222 2X XX XX XX',
      waSame: 'Même numéro que ci-dessus',
      emailLabel: 'E-mail *',
      emailPh: 'exemple@email.com',
      sendOtp: 'Envoyer le code',
      sendingOtp: 'Envoi en cours...',
      verifyBtn: 'Confirmer et activer',
      verifying: 'Vérification...',
      backEdit: '← Modifier les données',
      resend: 'Renvoyer le code',
      resendIn: 'Renvoi dans',
      privacy: '🔒 Vos données sont protégées — contact, favoris et lutte anti-fraude uniquement.',
      backBtn: '← Retour',
      linkPrivacy: 'Confidentialité',
      linkTerms: 'Conditions',
      linkHelp: 'Aide',
      reasonBadgePrefix: 'Requis',
      formIntro: 'Renseignez vos infos puis confirmez votre e-mail avec un code court',
      errName: 'Veuillez saisir votre nom complet',
      errPhone: 'Numéro mauritanien (8 chiffres) ou international valide requis',
      errWhatsapp: 'Numéro WhatsApp valide requis',
      errEmail: 'E-mail requis et valide',
      errOtp: 'Saisissez le code complet (6 chiffres)',
      errNetwork: 'Connexion impossible — vérifiez internet et réessayez',
      errBackendDown: 'Le serveur backend n\'est pas encore déployé — publiez rizq-backend sur Render (voir render.yaml). La première requête peut prendre une minute.',
      successToast: '✅ Compte activé avec succès',
      welcomeBack: '👋 Bon retour',
      logout: 'Déconnexion',
      sellerCta: '🏢 Ouvrir un compte pro sur Rizq',
      loggedAs: 'Connecté en tant que membre',
      reasonPhone: 'pour afficher le numéro',
      reasonWhatsapp: 'pour WhatsApp',
      reasonMsg: 'pour envoyer un message',
      reasonFav: 'pour ajouter aux favoris',
      reasonGeneric: 'pour continuer',
      otpSent: 'Code envoyé à votre e-mail',
      otpDevHint: 'dev — code :',
    }
  };

  function d() { return DICT[lang() === 'fr' ? 'fr' : 'ar']; }

  function networkErrorMsg(dict) {
    return isLocalDevHost() ? dict.errNetwork : (dict.errBackendDown || dict.errNetwork);
  }

  function normalizeIntl(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    var digits = s.replace(/[^\d+]/g, '');
    if (digits.indexOf('00') === 0) digits = '+' + digits.slice(2);
    if (digits.indexOf('+') !== 0) {
      digits = digits.replace(/\D/g, '');
      if (digits.length >= 8) digits = '+' + digits;
      else return '';
    }
    var num = digits.replace(/\D/g, '');
    return (num.length >= 8 && num.length <= 15) ? ('+' + num) : '';
  }

  function getVerifiedEmails() {
    try { return JSON.parse(sessionStorage.getItem(VERIFIED_EMAILS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function markEmailVerified(email) {
    try {
      var map = getVerifiedEmails();
      map[String(email || '').toLowerCase()] = Date.now();
      sessionStorage.setItem(VERIFIED_EMAILS_KEY, JSON.stringify(map));
    } catch (e) {}
  }
  function isEmailVerified(email) {
    var em = String(email || '').toLowerCase();
    var map = getVerifiedEmails();
    var ts = map[em];
    return !!(ts && (Date.now() - ts) < 15 * 60 * 1000);
  }

  function getLocalWishlist() {
    try {
      var raw = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(String) : [];
    } catch (e) { return []; }
  }
  function setLocalWishlist(ids) {
    try { localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids || [])); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('rizq_wishlist', { detail: { ids: ids || [] } })); } catch (e2) {}
  }
  function buyerAuthHeaders(s) {
    return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.token, 'X-Buyer-Id': s.id };
  }
  function syncWishlistToServer(s) {
    if (!s || !s.id || !s.token || !apiBase()) return Promise.resolve();
    return fetch(apiBase() + '/api/wishlist/sync', {
      method: 'POST', headers: buyerAuthHeaders(s), body: JSON.stringify({ ids: getLocalWishlist() })
    }).then(function (res) {
      return res.json().then(function (j) {
        if (res.ok && j && j.ok && Array.isArray(j.ids)) setLocalWishlist(j.ids);
      });
    }).catch(function () {});
  }
  function pullWishlistFromServer(s) {
    if (!s || !s.id || !s.token || !apiBase()) return Promise.resolve();
    return fetch(apiBase() + '/api/wishlist', { headers: buyerAuthHeaders(s) })
      .then(function (res) {
        return res.json().then(function (j) {
          if (!res.ok || !j || !j.ok || !Array.isArray(j.ids)) return;
          var merged = [], seen = {};
          j.ids.concat(getLocalWishlist()).forEach(function (id) {
            id = String(id);
            if (!id || seen[id]) return;
            seen[id] = true;
            merged.push(id);
          });
          setLocalWishlist(merged);
        });
      }).catch(function () {});
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }
  function setSession(s) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }
  function isLoggedIn() {
    var s = getSession();
    return !!(s && s.id && s.token);
  }
  function saveDraft(data) {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function loadDraft() {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; }
  }

  function verifySessionSilently() {
    var s = getSession();
    if (!s || !s.id || !s.token || !apiBase()) return;
    fetch(apiBase() + '/api/auth/me?id=' + encodeURIComponent(s.id) + '&token=' + encodeURIComponent(s.token))
      .then(function (res) {
        if (res.status === 401) { clearSession(); return; }
        if (res.ok) return pullWishlistFromServer(s);
      }).catch(function () {});
  }

  function loadOtpConfig(cb) {
    if (!apiBase()) { if (cb) cb(); return; }
    fetch(apiBase() + '/api/otp/config')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.otp) _otpConfig = data.otp;
        if (cb) cb();
      }).catch(function () { if (cb) cb(); });
  }

  function injectStyle() {
    var old = document.getElementById('rag-css');
    if (old) old.parentNode.removeChild(old);
    var css = [
      /* شاشة تسجيل المشتري بنفس أسلوب نشر الإعلان / معالج البائع الفاتح */
      '#rag-overlay.rag-overlay{position:fixed;inset:0;background:#f8faff!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;z-index:1000001!important;display:none;align-items:stretch;justify-content:flex-start;padding:0;opacity:1;pointer-events:none;overflow-y:auto;-webkit-overflow-scrolling:touch}',
      '#rag-overlay.rag-overlay.open{display:flex!important;pointer-events:auto}',
      '#rag-overlay .rag-modal{background:#fff!important;border:none!important;border-radius:0!important;max-width:820px;width:100%;margin:0 auto;padding:0 0 40px!important;box-shadow:none!important;transform:none!important;font-family:Cairo,\"Segoe UI\",sans-serif;position:relative;min-height:100%;min-height:100dvh;overflow:visible;color:#1a2535!important;box-sizing:border-box}',
      '@media (min-width:769px){#rag-overlay.rag-overlay{padding:24px 16px 40px;align-items:flex-start}#rag-overlay .rag-modal{min-height:auto;border-radius:18px!important;border:1px solid #e2e8f0!important;box-shadow:0 10px 30px -10px rgba(0,0,0,.08)!important}}',
      '#rag-overlay .rag-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid #e2e8f5;background:#fff;position:sticky;top:0;z-index:6}',
      '#rag-overlay .rag-back{display:inline-flex!important;align-items:center;gap:6px;background:#0f2347!important;border:2px solid #c9a84c!important;color:#e8c96a!important;min-height:44px;padding:10px 16px;border-radius:12px;cursor:pointer;font-size:14px;font-weight:800;font-family:inherit;box-shadow:0 4px 12px rgba(15,35,65,.18)}',
      '#rag-overlay .rag-back:hover{background:#1b3a6b!important;border-color:#e8c96a!important;color:#fff!important}',
      '#rag-overlay .rag-close{background:#fff!important;border:2px solid #94a3b8!important;color:#0f2347!important;width:44px;height:44px;border-radius:12px;cursor:pointer;font-size:22px;font-weight:900;flex-shrink:0;line-height:1;box-shadow:0 2px 8px rgba(15,35,65,.12)!important}',
      '#rag-overlay .rag-close:hover{background:#fef2f2!important;border-color:#ef4444!important;color:#b91c1c!important}',
      '#rag-overlay .rag-brand{display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 20px 10px;border-bottom:1px solid #e2e8f5}',
      '#rag-overlay .rag-brand-mark{width:56px;height:56px;border-radius:14px;background:#0f2347;border:1px solid rgba(201,168,76,.35);display:flex;align-items:center;justify-content:center}',
      '#rag-overlay .rag-brand-mark img{width:44px;height:44px}',
      '#rag-overlay .rag-brand-name{font-size:16px;font-weight:800;color:#1b3a6b}',
      '#rag-overlay .rag-progress{display:none;background:#fff;border-bottom:1px solid #e2e8f5;padding:14px 16px 16px}',
      '#rag-overlay.open .rag-progress{display:block}',
      '#rag-overlay .rag-progress-steps{display:flex;align-items:center;max-width:640px;margin:0 auto}',
      '#rag-overlay .rag-pstep{display:flex;flex-direction:column;align-items:center;gap:5px;flex:1;position:relative}',
      '#rag-overlay .rag-pstep:not(:last-child)::after{content:\"\";position:absolute;top:17px;height:2px;background:rgba(13,27,42,.08);width:100%;z-index:0}',
      'html[dir=rtl] #rag-overlay .rag-pstep:not(:last-child)::after{left:-50%;right:auto}',
      'html[dir=ltr] #rag-overlay .rag-pstep:not(:last-child)::after{left:50%;right:auto}',
      '#rag-overlay .rag-pstep.done:not(:last-child)::after{background:#c9a84c}',
      '#rag-overlay .rag-pstep-circle{width:34px;height:34px;border-radius:50%;background:#f8faff;border:2px solid rgba(13,27,42,.1);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#64748b;position:relative;z-index:1}',
      '#rag-overlay .rag-pstep.active .rag-pstep-circle{background:rgba(201,168,76,.15);border-color:#c9a84c;color:#a07820}',
      '#rag-overlay .rag-pstep.done .rag-pstep-circle{background:linear-gradient(135deg,#c9a84c,#e8c96a);border-color:#c9a84c;color:#0f2347}',
      '#rag-overlay .rag-pstep-label{font-size:11px;color:#64748b;font-weight:700;text-align:center}',
      '#rag-overlay .rag-pstep.active .rag-pstep-label{color:#a07820}',
      '#rag-overlay .rag-body{padding:20px 20px 12px;max-width:520px;margin:0 auto;width:100%;box-sizing:border-box}',
      '#rag-overlay .rag-title{color:#0f2347!important;font-size:1.4rem;font-weight:900;text-align:center;margin:0 0 8px;line-height:1.35}',
      '#rag-overlay .rag-sub{color:#475569!important;font-size:13.5px;text-align:center;margin:0 0 12px;line-height:1.65}',
      '#rag-overlay .rag-reason{display:none;align-items:center;justify-content:center;gap:8px;margin:0 auto 16px;padding:10px 14px;max-width:100%;box-sizing:border-box;border-radius:12px;background:linear-gradient(135deg,#fff8e8,#fff);border:1px solid rgba(201,168,76,.4);color:#8a6a18;font-size:13px;font-weight:800;text-align:center;line-height:1.45}',
      '#rag-overlay .rag-reason.show{display:flex}',
      '#rag-overlay .rag-intro{display:none;text-align:center;font-size:12.5px;color:#64748b;margin:-4px 0 16px;line-height:1.55}',
      '#rag-overlay .rag-intro.show{display:block}',
      '#rag-overlay .rag-returning{background:#fff8e8;border:1px solid rgba(201,168,76,.35);border-radius:12px;padding:10px 12px;font-size:12px;color:#92400e;text-align:center;margin:0 0 14px;display:none}',
      '#rag-overlay .rag-returning.show{display:block}',
      '#rag-overlay .rag-label{display:block!important;color:#0f2347!important;font-size:13px!important;font-weight:800!important;margin:0 0 7px!important;opacity:1!important;visibility:visible!important}',
      '#rag-overlay .rag-hint{font-size:11.5px!important;color:#64748b!important;margin:-2px 0 12px!important;line-height:1.5}',
      '#rag-overlay .rag-input{width:100%;box-sizing:border-box;background:#f8faff!important;border:1.5px solid rgba(13,27,42,.14)!important;border-radius:12px;padding:13px 14px;color:#1a2535!important;font-size:14.5px;font-family:inherit;margin-bottom:12px}',
      '#rag-overlay .rag-input:focus{outline:none;border-color:rgba(201,168,76,.55)!important;background:#fff!important;box-shadow:0 0 0 3px rgba(201,168,76,.14)}',
      '#rag-overlay .rag-input.err{border-color:#ef4444!important}',
      '#rag-overlay .rag-input::placeholder{color:#94a3b8!important;opacity:1}',
      '#rag-overlay .rag-check{display:flex!important;align-items:center;gap:8px;font-size:12.5px!important;color:#334155!important;margin:-2px 0 12px;cursor:pointer;font-weight:600}',
      '#rag-overlay .rag-check input{accent-color:#c9a84c}',
      '#rag-overlay .rag-errmsg{color:#dc2626!important;font-size:11.5px;margin:-6px 0 10px;display:none;font-weight:600}',
      '#rag-overlay .rag-errmsg.show{display:block!important}',
      '#rag-overlay .rag-btn{width:100%;background:linear-gradient(135deg,#c9a84c,#e8c96a)!important;color:#0f2347!important;border:none;border-radius:12px;padding:15px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;margin-top:8px;box-shadow:0 6px 18px rgba(201,168,76,.28)}',
      '#rag-overlay .rag-btn:disabled{opacity:.55;cursor:default}',
      '#rag-overlay .rag-btn-ghost{background:transparent!important;border:1px solid #e2e8f0!important;color:#475569!important;box-shadow:none;margin-top:8px}',
      '#rag-overlay .rag-choice{display:flex;flex-direction:column;gap:12px;margin-bottom:12px}',
      '#rag-overlay .rag-choice-card{display:flex;align-items:center;gap:12px;background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px 14px;cursor:pointer;text-align:inherit;box-shadow:0 10px 30px -10px rgba(0,0,0,.06);transition:border-color .2s,background .2s,transform .15s}',
      '#rag-overlay .rag-choice-card:active{transform:scale(.98)}',
      '#rag-overlay .rag-choice-card:hover{border-color:rgba(201,168,76,.45);background:#fffdf6}',
      '#rag-overlay .rag-choice-card-accent{border-color:rgba(201,168,76,.55)!important;background:linear-gradient(180deg,#fffef8,#fff)!important;box-shadow:0 8px 24px rgba(201,168,76,.12)}',
      '#rag-overlay .rag-choice-icon{width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#0f2347,#1b3a6b);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}',
      '#rag-overlay .rag-choice-icon-gold{background:linear-gradient(135deg,#c9a84c,#e8c96a)!important}',
      '#rag-overlay .rag-choice-title{font-size:15px;font-weight:800;color:#1b3a6b}',
      '#rag-overlay .rag-choice-sub{font-size:12px;color:#64748b;margin-top:2px;line-height:1.45}',
      '@media (max-width:768px){#rag-overlay .rag-title{font-size:1.35rem!important}#rag-overlay .rag-sub,#rag-overlay .rag-intro{font-size:12.5px!important}#rag-overlay .rag-choice{gap:8px!important}#rag-overlay .rag-choice-card{padding:11px 10px;min-height:58px;border-width:1.5px;box-shadow:0 6px 16px rgba(15,35,65,.06)}#rag-overlay .rag-choice-title{font-size:14.5px}#rag-overlay .rag-choice-sub{font-size:11.5px;color:#475569}#rag-overlay .rag-choice-icon{width:40px;height:40px;font-size:18px}#rag-overlay .rag-legal{padding:10px 10px calc(10px + env(safe-area-inset-bottom,0px))!important;border-radius:0}#rag-overlay .rag-legal-links{flex-direction:row;flex-wrap:wrap;justify-content:center}#rag-overlay .rag-legal-links a{width:auto;min-height:30px;font-size:11px!important;padding:5px 8px!important}#rag-overlay .rag-topbar{padding:10px 12px;gap:8px}#rag-overlay .rag-back{min-height:40px;font-size:13.5px;padding:8px 14px}#rag-overlay .rag-close{width:40px;height:40px;font-size:18px}}',
      '#rag-overlay .rag-otp-row{display:flex;gap:8px;justify-content:center;margin:14px 0 10px}',
      '#rag-overlay .rag-otp-box{width:44px;height:50px;background:#f8faff;border:1.5px solid rgba(13,27,42,.12);border-radius:10px;text-align:center;font-size:20px;font-weight:800;color:#1a2535;font-family:inherit}',
      '#rag-overlay .rag-otp-box:focus{outline:none;border-color:#c9a84c;box-shadow:0 0 0 3px rgba(201,168,76,.15)}',
      '#rag-overlay .rag-otp-meta{text-align:center;font-size:12px;color:#64748b;margin-bottom:10px}',
      '#rag-overlay .rag-otp-meta button{background:none;border:none;color:#1b3a6b;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;text-decoration:underline}',
      '#rag-overlay .rag-devhint{background:#fff8e8;border:1px dashed rgba(201,168,76,.45);border-radius:10px;padding:8px 10px;font-size:11px;color:#92400e;text-align:center;margin-bottom:10px;display:none}',
      '#rag-overlay .rag-devhint.show{display:block}',
      '#rag-overlay .rag-privacy{color:#64748b!important;font-size:11.5px;text-align:center;margin-top:14px;line-height:1.65}',
      '#rag-overlay .rag-card{display:flex!important;flex-direction:column!important;max-height:min(94vh,960px)!important;overflow:hidden!important}',
      '#rag-overlay .rag-body{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;min-height:0;display:flex;flex-direction:column}',
      '#rag-overlay .rag-legal{display:block!important;margin-top:0!important;padding:10px 10px calc(10px + env(safe-area-inset-bottom,0px))!important;border-top:1px solid rgba(201,168,76,.22);background:#0f172a!important;border-radius:0;min-height:auto!important;height:auto!important;position:relative!important;z-index:5!important;box-shadow:0 -6px 18px rgba(0,0,0,.16)!important;color:rgba(255,255,255,.85);flex:0 0 auto}',
      '#rag-overlay .rag-legal-title{font-size:10.5px;font-weight:800;color:#c9a84c;letter-spacing:.4px;margin:0 0 6px;text-transform:uppercase}',
      '#rag-overlay .rag-legal-links{display:flex!important;flex-wrap:wrap;align-items:center;justify-content:center;gap:5px;margin:0 0 6px}',
      '#rag-overlay .rag-legal a{color:#e8c96a!important;font-size:11px!important;font-weight:800!important;text-decoration:none!important;padding:5px 8px!important;border-radius:8px!important;background:rgba(255,255,255,.06)!important;border:1px solid rgba(201,168,76,.28)!important;display:inline-flex!important;align-items:center;line-height:1.15}',
      '#rag-overlay .rag-legal a:hover{background:rgba(201,168,76,.16)!important;border-color:rgba(201,168,76,.55)!important;color:#fff!important}',
      '#rag-overlay .rag-legal-phones{display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:11px;line-height:1.3;text-align:start}',
      '#rag-overlay .rag-legal-phones > div:last-child{grid-column:1/-1;text-align:center}',
      '#rag-overlay .rag-legal-phones a{color:rgba(255,255,255,.85)!important;background:transparent!important;border:none!important;padding:0!important;font-weight:700!important;font-size:11px!important}',
      '#rag-overlay .rag-legal-phones strong{color:#c9a84c}',
      '#rag-overlay .rag-account-card{background:#f8faff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin-bottom:12px}',
      '#rag-overlay .rag-account-name{font-size:16px;font-weight:800;color:#1b3a6b;margin-bottom:4px}',
      '#rag-overlay .rag-account-meta{font-size:12px;color:#64748b;line-height:1.7}',
      '#rag-overlay .rag-seller-link{display:block;text-align:center;margin-top:10px;color:#1b3a6b;font-size:13px;font-weight:700;text-decoration:none}',
      '#rag-overlay .rag-step{display:none}',
      '#rag-overlay .rag-step.active{display:block}',
      'body.rizq-reg-open #rizq-chat-toggle,body.rizq-reg-open .mobile-bottom-nav,body.rizq-reg-open #nav,body.rizq-reg-open .fixed-rizq-logo,body.rizq-reg-open #rizq-rlogo-edge{visibility:hidden!important;pointer-events:none!important}',
      '#rizq-terms-modal.rizq-terms-overlay{z-index:1000010!important;background:rgba(15,35,65,.45)!important}'
    ].join('');
    var style = document.createElement('style');
    style.id = 'rag-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (document.getElementById('rag-overlay')) return;
    injectStyle();
    var html = [
      '<div class="rag-overlay" id="rag-overlay">',
      '  <div class="rag-modal" role="dialog" aria-modal="true" aria-labelledby="rag-title">',
      '    <div class="rag-topbar">',
      '      <button class="rag-back" id="rag-nav-back-btn" type="button"></button>',
      '      <button class="rag-close" id="rag-close-btn" type="button" aria-label="إغلاق">✕</button>',
      '    </div>',
      '    <div class="rag-brand"><div class="rag-brand-mark"><img src="rizq-mark-512.png" width="48" height="48" alt="رزق"/></div><div class="rag-brand-name">رزق | Rizq</div></div>',
      '    <div class="rag-progress" id="rag-progress" aria-hidden="false">',
      '      <div class="rag-progress-steps">',
      '        <div class="rag-pstep active" id="rag-pstep-1"><div class="rag-pstep-circle">1</div><div class="rag-pstep-label" id="rag-pstep-1-label">البيانات</div></div>',
      '        <div class="rag-pstep" id="rag-pstep-2"><div class="rag-pstep-circle">2</div><div class="rag-pstep-label" id="rag-pstep-2-label">التحقق</div></div>',
      '        <div class="rag-pstep" id="rag-pstep-3"><div class="rag-pstep-circle">3</div><div class="rag-pstep-label" id="rag-pstep-3-label">تم</div></div>',
      '      </div>',
      '    </div>',
      '    <div class="rag-body">',
      '    <div class="rag-title" id="rag-title"></div>',
      '    <div class="rag-sub" id="rag-sub"></div>',
      '    <div class="rag-reason" id="rag-reason" role="status"></div>',
      '    <div class="rag-intro" id="rag-intro"></div>',
      '    <div class="rag-returning" id="rag-returning"></div>',
      '    <div class="rag-step" id="rag-step-choice">',
      '      <div class="rag-choice">',
      '        <div class="rag-choice-card" id="rag-choice-buyer" role="button" tabindex="0">',
      '          <div class="rag-choice-icon">👤</div>',
      '          <div><div class="rag-choice-title" id="rag-choice-buyer-title"></div><div class="rag-choice-sub" id="rag-choice-buyer-sub"></div></div>',
      '        </div>',
      '        <div class="rag-choice-card rag-choice-card-accent" id="rag-choice-seller-login" role="button" tabindex="0">',
      '          <div class="rag-choice-icon rag-choice-icon-gold">🔑</div>',
      '          <div><div class="rag-choice-title" id="rag-choice-seller-login-title"></div><div class="rag-choice-sub" id="rag-choice-seller-login-sub"></div></div>',
      '        </div>',
      '        <div class="rag-choice-card" id="rag-choice-seller" role="button" tabindex="0">',
      '          <div class="rag-choice-icon">🏢</div>',
      '          <div><div class="rag-choice-title" id="rag-choice-seller-title"></div><div class="rag-choice-sub" id="rag-choice-seller-sub"></div></div>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="rag-step" id="rag-step-form">',
      '      <label class="rag-label" id="rag-name-label" for="rag-name"></label>',
      '      <input class="rag-input" id="rag-name" type="text" dir="auto" autocomplete="name"/>',
      '      <div class="rag-errmsg" id="rag-name-err"></div>',
      '      <label class="rag-label" id="rag-email-label" for="rag-email"></label>',
      '      <input class="rag-input" id="rag-email" type="email" dir="ltr" autocomplete="email"/>',
      '      <div class="rag-errmsg" id="rag-email-err"></div>',
      '      <label class="rag-label" id="rag-phone-mr-label" for="rag-phone-mr"></label>',
      '      <input class="rag-input" id="rag-phone-mr" type="tel" dir="ltr" maxlength="8" autocomplete="tel"/>',
      '      <label class="rag-label" id="rag-phone-intl-label" for="rag-phone-intl"></label>',
      '      <input class="rag-input" id="rag-phone-intl" type="tel" dir="ltr" autocomplete="tel"/>',
      '      <p class="rag-hint" id="rag-phone-hint"></p>',
      '      <div class="rag-errmsg" id="rag-phone-err"></div>',
      '      <label class="rag-check" id="rag-wa-same-wrap"><input type="checkbox" id="rag-wa-same" checked/> <span id="rag-wa-same-label"></span></label>',
      '      <label class="rag-label" id="rag-whatsapp-label" for="rag-whatsapp"></label>',
      '      <input class="rag-input" id="rag-whatsapp" type="tel" dir="ltr"/>',
      '      <div class="rag-errmsg" id="rag-whatsapp-err"></div>',
      '      <button class="rag-btn" id="rag-send-otp-btn" type="button"></button>',
      '      <div class="rag-privacy" id="rag-privacy-form"></div>',
      '    </div>',
      '    <div class="rag-step" id="rag-step-otp">',
      '      <div class="rag-devhint" id="rag-devhint"></div>',
      '      <div class="rag-otp-row" id="rag-otp-row"></div>',
      '      <div class="rag-errmsg" id="rag-otp-err"></div>',
      '      <div class="rag-otp-meta" id="rag-otp-meta"></div>',
      '      <button class="rag-btn" id="rag-verify-btn" type="button"></button>',
      '      <button class="rag-btn rag-btn-ghost" id="rag-back-btn" type="button"></button>',
      '    </div>',
      '    <div class="rag-step" id="rag-step-account">',
      '      <div class="rag-account-card">',
      '        <div class="rag-account-name" id="rag-acc-name"></div>',
      '        <div class="rag-account-meta" id="rag-acc-meta"></div>',
      '      </div>',
      '      <button class="rag-btn rag-btn-ghost" id="rag-logout-btn" type="button"></button>',
      '      <a class="rag-seller-link" id="rag-seller-link" href="?openRegister=1"></a>',
      '    </div>',
      '    </div>',
      '    <nav class="rag-legal" id="rag-legal" aria-label="روابط سريعة وتواصل">',
      '      <div class="rag-legal-title" id="rag-legal-title">روابط سريعة</div>',
      '      <div class="rag-legal-links">',
      '        <a id="rag-link-home" href="rizq_landing_v8.html">الرئيسية</a>',
      '        <a id="rag-link-browse" href="rizq_browse.html">تصفّح</a>',
      '        <a id="rag-link-help" href="rizq_help.html"></a>',
      '        <a id="rag-link-terms" href="rizq_legal.html#s2" target="_blank" rel="noopener"></a>',
      '        <a id="rag-link-privacy" href="rizq_legal.html#s3" target="_blank" rel="noopener"></a>',
      '      </div>',
      '      <div class="rag-legal-title" id="rag-contact-title">تواصل معنا</div>',
      '      <div class="rag-legal-phones">',
      '        <div><strong>Mauritel:</strong> <a href="tel:+22244882212" dir="ltr">+222 44 88 22 12</a></div>',
      '        <div><strong>Mattel:</strong> <a href="tel:+22236485784" dir="ltr">+222 36 48 57 84</a></div>',
      '        <div><strong>Chinguitel:</strong> <a href="tel:+22222708338" dir="ltr">+222 22 70 83 38</a></div>',
      '        <div><a href="mailto:direction@rizq.mr">direction@rizq.mr</a></div>',
      '      </div>',
      '    </nav>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.insertAdjacentHTML('beforeend', html);

    var row = document.getElementById('rag-otp-row');
    for (var i = 0; i < 6; i++) {
      var inp = document.createElement('input');
      inp.className = 'rag-otp-box';
      inp.type = 'text';
      inp.inputMode = 'numeric';
      inp.maxLength = 1;
      inp.setAttribute('data-otp-idx', String(i));
      row.appendChild(inp);
    }

    document.getElementById('rag-close-btn').addEventListener('click', function (e) {
      if (Date.now() - (_ragOpenedAt || 0) < 800) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      closeModal();
    });
    document.getElementById('rag-nav-back-btn').addEventListener('click', function (e) {
      if (Date.now() - (_ragOpenedAt || 0) < 800) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      var otpStep = document.getElementById('rag-step-otp');
      if (otpStep && otpStep.classList.contains('active')) {
        showStep('form');
        applyTexts(_lastReasonKey || 'reasonGeneric');
        return;
      }
      closeModal();
    });
    document.getElementById('rag-overlay').addEventListener('click', function (e) {
      if (Date.now() - (_ragOpenedAt || 0) < 800) return;
      if (e.target === this) closeModal();
    });
    document.getElementById('rag-send-otp-btn').addEventListener('click', sendOtpStep);
    document.getElementById('rag-verify-btn').addEventListener('click', verifyOtpStep);
    document.getElementById('rag-back-btn').addEventListener('click', function () { showStep('form'); });
    document.getElementById('rag-logout-btn').addEventListener('click', function () {
      clearSession();
      closeModal();
      if (typeof window.showToast === 'function') window.showToast(t('تم تسجيل الخروج', 'Déconnecté'), 'info');
    });
    document.getElementById('rag-email').addEventListener('blur', lookupReturningVisitor);
    document.getElementById('rag-wa-same').addEventListener('change', syncWhatsappFromPhones);
    document.getElementById('rag-phone-mr').addEventListener('input', function () {
      if (document.getElementById('rag-wa-same').checked) syncWhatsappFromPhones();
    });
    document.getElementById('rag-phone-intl').addEventListener('input', function () {
      if (document.getElementById('rag-wa-same').checked) syncWhatsappFromPhones();
    });

    document.getElementById('rag-choice-buyer').addEventListener('click', function () {
      _modalMode = 'account';
      applyTexts('reasonGeneric');
      prefillDraft();
      showStep('form');
    });
    document.getElementById('rag-choice-seller-login').addEventListener('click', function () {
      closeModal();
      setTimeout(function () {
        if (typeof window.openModal === 'function') window.openModal('login');
        else location.href = '?openLogin=1';
      }, 60);
    });
    document.getElementById('rag-choice-seller').addEventListener('click', function () {
      closeModal();
      setTimeout(function () {
        if (typeof window.rizqOpenRegister === 'function') window.rizqOpenRegister();
        else if (typeof window.openModal === 'function') window.openModal('register');
        else location.href = '?openRegister=1';
      }, 60);
    });
    document.getElementById('rag-seller-link').addEventListener('click', function (e) {
      e.preventDefault();
      closeModal();
      setTimeout(function () {
        if (typeof window.rizqOpenRegister === 'function') window.rizqOpenRegister();
        else if (typeof window.openModal === 'function') window.openModal('register');
        else location.href = '?openRegister=1';
      }, 60);
    });

    row.querySelectorAll('.rag-otp-box').forEach(function (box, idx, boxes) {
      box.addEventListener('input', function () {
        box.value = box.value.replace(/\D/g, '').slice(0, 1);
        if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
      });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
      });
      box.addEventListener('paste', function (e) {
        var paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        if (!paste) return;
        e.preventDefault();
        paste.split('').forEach(function (ch, i) { if (boxes[i]) boxes[i].value = ch; });
        if (boxes[Math.min(paste.length, 5)]) boxes[Math.min(paste.length, 5)].focus();
      });
    });
  }

  function showStep(step) {
    ['choice', 'form', 'otp', 'account'].forEach(function (s) {
      var el = document.getElementById('rag-step-' + s);
      if (el) el.classList.toggle('active', s === step);
    });
    var activeIdx = step === 'choice' || step === 'form' ? 1 : (step === 'otp' ? 2 : 3);
    for (var i = 1; i <= 3; i++) {
      var ps = document.getElementById('rag-pstep-' + i);
      if (!ps) continue;
      ps.className = 'rag-pstep' + (i < activeIdx ? ' done' : (i === activeIdx ? ' active' : ''));
    }
  }

  function openRagShell() {
    ensureModal();
    injectStyle();
    _ragOpenedAt = Date.now();
    var ov = document.getElementById('rag-overlay');
    ov.classList.add('open');
    ov.style.display = 'flex';
    ov.style.zIndex = '1000001';
    ov.style.pointerEvents = 'none';
    document.body.classList.add('rizq-reg-open');
    document.body.style.overflow = '';
    try {
      if (typeof window.RizqEnsureSiteFooter === 'function') window.RizqEnsureSiteFooter();
      if (window.RizqFooterToggle && typeof window.RizqFooterToggle.setOpen === 'function') {
        window.RizqFooterToggle.setOpen(true);
      }
      var siteFooter = document.querySelector('footer.rizq-footer') || document.querySelector('body > footer');
      if (siteFooter) {
        siteFooter.style.display = 'block';
        siteFooter.style.visibility = 'visible';
        siteFooter.style.pointerEvents = 'auto';
        siteFooter.style.order = '2';
        siteFooter.style.zIndex = '4';
      }
    } catch (eFt) {}
    setTimeout(function () {
      if (ov.classList.contains('open')) ov.style.pointerEvents = 'auto';
    }, 500);
  }

  function syncWhatsappFromPhones() {
    if (!document.getElementById('rag-wa-same').checked) return;
    var mr = document.getElementById('rag-phone-mr').value.replace(/\D/g, '');
    var intl = normalizeIntl(document.getElementById('rag-phone-intl').value);
    var waEl = document.getElementById('rag-whatsapp');
    if (MR_PHONE_RE.test(mr)) waEl.value = '+222' + mr;
    else if (intl) waEl.value = intl;
    waEl.disabled = true;
  }

  function applyTexts(reasonKey) {
    var dict = d();
    _lastReasonKey = reasonKey || 'reasonGeneric';
    var reason = dict[_lastReasonKey] || dict.reasonGeneric;
    var hasSpecificReason = !!(reasonKey && reasonKey !== 'reasonGeneric' && dict[reasonKey]);
    document.getElementById('rag-title').textContent = _modalMode === 'account' ? dict.titleAccount : dict.titleGate;
    document.getElementById('rag-sub').textContent = (_modalMode === 'account' ? dict.subAccount : dict.subGate);
    var reasonEl = document.getElementById('rag-reason');
    if (reasonEl) {
      if (hasSpecificReason) {
        reasonEl.textContent = dict.reasonBadgePrefix + ' — ' + reason;
        reasonEl.classList.add('show');
      } else {
        reasonEl.textContent = '';
        reasonEl.classList.remove('show');
      }
    }
    var introEl = document.getElementById('rag-intro');
    if (introEl) {
      introEl.textContent = dict.formIntro || '';
      introEl.classList.add('show');
    }
    var l1 = document.getElementById('rag-pstep-1-label');
    var l2 = document.getElementById('rag-pstep-2-label');
    var l3 = document.getElementById('rag-pstep-3-label');
    if (l1) l1.textContent = t('البيانات', 'Infos');
    if (l2) l2.textContent = t('التحقق', 'OTP');
    if (l3) l3.textContent = t('تم', 'OK');
    document.getElementById('rag-choice-buyer-title').textContent = dict.choiceBuyer;
    document.getElementById('rag-choice-buyer-sub').textContent = dict.choiceBuyerSub;
    document.getElementById('rag-choice-seller-title').textContent = dict.choiceSeller;
    document.getElementById('rag-choice-seller-sub').textContent = dict.choiceSellerSub;
    var loginTitle = document.getElementById('rag-choice-seller-login-title');
    var loginSub = document.getElementById('rag-choice-seller-login-sub');
    if (loginTitle) loginTitle.textContent = dict.choiceSellerLogin;
    if (loginSub) loginSub.textContent = dict.choiceSellerLoginSub;
    document.getElementById('rag-name-label').textContent = dict.nameLabel;
    document.getElementById('rag-name').placeholder = dict.namePh;
    document.getElementById('rag-phone-mr-label').textContent = dict.phoneMrLabel;
    document.getElementById('rag-phone-mr').placeholder = dict.phoneMrPh;
    document.getElementById('rag-phone-intl-label').textContent = dict.phoneIntlLabel;
    document.getElementById('rag-phone-intl').placeholder = dict.phoneIntlPh;
    document.getElementById('rag-phone-hint').textContent = dict.phoneHint;
    document.getElementById('rag-whatsapp-label').textContent = dict.whatsappLabel;
    document.getElementById('rag-whatsapp').placeholder = dict.whatsappPh;
    document.getElementById('rag-wa-same-label').textContent = dict.waSame;
    document.getElementById('rag-email-label').textContent = dict.emailLabel;
    document.getElementById('rag-email').placeholder = dict.emailPh;
    document.getElementById('rag-send-otp-btn').textContent = dict.sendOtp;
    document.getElementById('rag-verify-btn').textContent = dict.verifyBtn;
    document.getElementById('rag-back-btn').textContent = dict.backEdit;
    var navBack = document.getElementById('rag-nav-back-btn');
    if (navBack) navBack.textContent = dict.backBtn;
    document.getElementById('rag-privacy-form').textContent = dict.privacy;
    var lp = document.getElementById('rag-link-privacy');
    var lt = document.getElementById('rag-link-terms');
    var lh = document.getElementById('rag-link-help');
    var lhome = document.getElementById('rag-link-home');
    var lbrowse = document.getElementById('rag-link-browse');
    if (lp) lp.textContent = dict.linkPrivacy;
    if (lt) lt.textContent = dict.linkTerms;
    if (lh) lh.textContent = dict.linkHelp;
    if (lhome) lhome.textContent = t('الرئيسية', 'Accueil');
    if (lbrowse) lbrowse.textContent = t('تصفّح', 'Parcourir');
    var legalTitle = document.getElementById('rag-legal-title');
    var contactTitle = document.getElementById('rag-contact-title');
    if (legalTitle) legalTitle.textContent = t('روابط سريعة', 'Liens rapides');
    if (contactTitle) contactTitle.textContent = t('تواصل معنا', 'Contact');
    document.getElementById('rag-name-err').textContent = dict.errName;
    document.getElementById('rag-phone-err').textContent = dict.errPhone;
    document.getElementById('rag-whatsapp-err').textContent = dict.errWhatsapp;
    document.getElementById('rag-email-err').textContent = dict.errEmail;
    document.getElementById('rag-otp-err').textContent = dict.errOtp;
    document.getElementById('rag-logout-btn').textContent = dict.logout;
    document.getElementById('rag-seller-link').textContent = dict.sellerCta;
    syncWhatsappFromPhones();
  }

  function readFormData() {
    var waSame = document.getElementById('rag-wa-same').checked;
    var phoneMr = document.getElementById('rag-phone-mr').value.replace(/\D/g, '');
    var phoneIntl = normalizeIntl(document.getElementById('rag-phone-intl').value);
    var whatsapp = waSame
      ? (MR_PHONE_RE.test(phoneMr) ? '+222' + phoneMr : phoneIntl)
      : normalizeIntl(document.getElementById('rag-whatsapp').value);
    return {
      name: document.getElementById('rag-name').value.trim(),
      email: document.getElementById('rag-email').value.trim().toLowerCase(),
      phoneMr: phoneMr,
      phoneIntl: phoneIntl,
      phone: MR_PHONE_RE.test(phoneMr) ? phoneMr : '',
      whatsapp: whatsapp
    };
  }

  function validateForm() {
    var dict = d();
    var data = readFormData();
    var ok = true;

    if (!/\S+\s+\S+/.test(data.name)) {
      document.getElementById('rag-name').classList.add('err');
      document.getElementById('rag-name-err').classList.add('show');
      ok = false;
    } else {
      document.getElementById('rag-name').classList.remove('err');
      document.getElementById('rag-name-err').classList.remove('show');
    }
    if (!EMAIL_RE.test(data.email)) {
      document.getElementById('rag-email').classList.add('err');
      document.getElementById('rag-email-err').classList.add('show');
      ok = false;
    } else {
      document.getElementById('rag-email').classList.remove('err');
      document.getElementById('rag-email-err').classList.remove('show');
    }
    if (!MR_PHONE_RE.test(data.phoneMr) && !data.phoneIntl) {
      document.getElementById('rag-phone-mr').classList.add('err');
      document.getElementById('rag-phone-intl').classList.add('err');
      document.getElementById('rag-phone-err').classList.add('show');
      ok = false;
    } else {
      document.getElementById('rag-phone-mr').classList.remove('err');
      document.getElementById('rag-phone-intl').classList.remove('err');
      document.getElementById('rag-phone-err').classList.remove('show');
    }
    if (!data.whatsapp) {
      document.getElementById('rag-whatsapp').classList.add('err');
      document.getElementById('rag-whatsapp-err').classList.add('show');
      ok = false;
    } else {
      document.getElementById('rag-whatsapp').classList.remove('err');
      document.getElementById('rag-whatsapp-err').classList.remove('show');
    }
    if (!ok) return null;
    return data;
  }

  function lookupReturningVisitor() {
    var email = document.getElementById('rag-email').value.trim().toLowerCase();
    var badge = document.getElementById('rag-returning');
    if (!EMAIL_RE.test(email) || !apiBase()) {
      badge.classList.remove('show');
      return;
    }
    fetch(apiBase() + '/api/auth/preview?email=' + encodeURIComponent(email))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        // الخادم لم يعد يكشف exists (منع تعداد البريد) — اعتمد الجلسة المحلية فقط
        badge.classList.remove('show');
        if (!data || data.exists !== true) return;
        badge.textContent = d().welcomeBack;
        badge.classList.add('show');
      }).catch(function () { badge.classList.remove('show'); });
  }

  function getOtpCode() {
    return Array.prototype.map.call(document.querySelectorAll('.rag-otp-box'), function (b) { return b.value; }).join('');
  }
  function clearOtpBoxes() {
    document.querySelectorAll('.rag-otp-box').forEach(function (b) { b.value = ''; });
  }

  function startResendTimer() {
    clearInterval(_otpTimer);
    var left = 60;
    var meta = document.getElementById('rag-otp-meta');
    var dict = d();
    function tick() {
      meta.innerHTML = dict.resendIn + ' <strong>' + left + 's</strong>';
      left -= 1;
      if (left < 0) {
        clearInterval(_otpTimer);
        meta.innerHTML = '<button type="button" id="rag-resend-btn">' + dict.resend + '</button>';
        document.getElementById('rag-resend-btn').addEventListener('click', sendOtpStep);
      }
    }
    tick();
    _otpTimer = setInterval(tick, 1000);
  }

  function sendOtpStep() {
    var data = validateForm();
    if (!data) return;
    saveDraft(data);
    if (window.RizqTermsGate && typeof window.RizqTermsGate.require === 'function') {
      window.RizqTermsGate.require(_sendOtpAfterTerms);
      return;
    }
    _sendOtpAfterTerms();
  }

  function _sendOtpAfterTerms() {
    var data = validateForm() || loadDraft();
    if (!data) return;
    var dict = d();
    var btn = document.getElementById('rag-send-otp-btn');
    btn.disabled = true;
    btn.textContent = dict.sendingOtp;

    if (!apiBase()) {
      if (!isLocalDevHost()) {
        btn.disabled = false;
        btn.textContent = dict.sendOtp;
        alert(networkErrorMsg(dict));
        return;
      }
      btn.disabled = false;
      btn.textContent = dict.sendOtp;
      document.getElementById('rag-devhint').textContent = dict.otpDevHint + ' (localhost فقط)';
      document.getElementById('rag-devhint').classList.add('show');
      document.getElementById('rag-title').textContent = dict.titleOtp;
      document.getElementById('rag-sub').textContent = dict.subOtp;
      showStep('otp');
      startResendTimer();
      return;
    }

    fetch(apiBase() + '/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: (typeof AbortController !== 'undefined' ? (function () {
        var c = new AbortController();
        setTimeout(function () { try { c.abort(); } catch (eA) {} }, 15000);
        return c.signal;
      })() : undefined),
      body: JSON.stringify({
        channel: 'buyer',
        email: data.email,
        name: data.name,
        phoneMr: data.phoneMr,
        phoneIntl: data.phoneIntl,
        whatsapp: data.whatsapp
      })
    }).then(function (res) {
      return res.json().then(function (j) { return { ok: res.ok, body: j }; }).catch(function () {
        return { ok: false, body: { message: networkErrorMsg(dict) } };
      });
    })
      .then(function (r) {
        btn.disabled = false;
        btn.textContent = dict.sendOtp;
        if (!r.ok || !r.body || !r.body.ok) {
          alert((r.body && r.body.message) || networkErrorMsg(dict));
          return;
        }
        document.getElementById('rag-title').textContent = dict.titleOtp;
        document.getElementById('rag-sub').textContent = dict.subOtp;
        var hint = document.getElementById('rag-devhint');
        if (r.body.devHint) {
          hint.textContent = dict.otpDevHint + ' ' + r.body.devHint;
          hint.classList.add('show');
        } else {
          hint.classList.remove('show');
        }
        clearOtpBoxes();
        showStep('otp');
        startResendTimer();
        if (typeof window.showToast === 'function') window.showToast('📧 ' + dict.otpSent, 'success');
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = dict.sendOtp;
        alert(networkErrorMsg(dict));
      });
  }

  function rememberAfterAuthHref() {
    try {
      if (sessionStorage.getItem('rizq_after_auth_href')) return;
      var href = location.pathname + location.search + (location.hash || '');
      if (window.RizqAccount && typeof window.RizqAccount.setAfterAuthHref === 'function') {
        window.RizqAccount.setAfterAuthHref(href);
      } else {
        sessionStorage.setItem('rizq_after_auth_href', href);
      }
    } catch (e) {}
  }

  function consumeAfterAuthHrefSafe() {
    if (window.RizqAccount && typeof window.RizqAccount.consumeAfterAuthHref === 'function') {
      return window.RizqAccount.consumeAfterAuthHref();
    }
    try {
      var href = sessionStorage.getItem('rizq_after_auth_href') || '';
      if (href) sessionStorage.removeItem('rizq_after_auth_href');
      return href;
    } catch (e2) {
      return '';
    }
  }

  function finishRegister(session) {
    setSession(session);
    markEmailVerified(session.email);
    syncWishlistToServer(session).finally(function () {
      if (_sellerOtpCallback) {
        var cb = _sellerOtpCallback;
        _sellerOtpCallback = null;
        closeModal();
        try { cb(); } catch (e) {}
        return;
      }
      closeModal();
      if (typeof window.showToast === 'function') window.showToast(d().successToast, 'success');
      var hadPending = !!_pendingAction;
      runPendingAction();
      if (hadPending) {
        consumeAfterAuthHrefSafe();
      } else {
        var afterHref = consumeAfterAuthHrefSafe();
        if (afterHref) location.href = afterHref;
      }
    });
  }

  function verifyOtpStep() {
    var data = validateForm() || loadDraft();
    if (!data) return;
    var code = getOtpCode();
    var dict = d();
    if (code.length < 6) {
      document.getElementById('rag-otp-err').classList.add('show');
      return;
    }
    document.getElementById('rag-otp-err').classList.remove('show');
    var btn = document.getElementById('rag-verify-btn');
    btn.disabled = true;
    btn.textContent = dict.verifying;

    if (!apiBase()) {
      if (!isLocalDevHost()) {
        btn.disabled = false;
        btn.textContent = dict.verifyBtn;
        alert(networkErrorMsg(dict));
        return;
      }
      btn.disabled = false;
      btn.textContent = dict.verifyBtn;
      finishRegister({
        id: 'local_' + Date.now(),
        name: data.name,
        phone: data.phoneMr || data.phone,
        phoneIntl: data.phoneIntl,
        whatsapp: data.whatsapp,
        email: data.email,
        token: 'local'
      });
      return;
    }

    fetch(apiBase() + '/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'buyer', email: data.email, code: code })
    }).then(function (res) { return res.json().then(function (j) { return { ok: res.ok, body: j }; }); })
      .then(function (r) {
        if (!r.ok || !r.body || !r.body.ok) {
          btn.disabled = false;
          btn.textContent = dict.verifyBtn;
          alert((r.body && r.body.message) || dict.errOtp);
          return null;
        }
        if (_sellerOtpCallback) {
          markEmailVerified(data.email);
          var sellerCb = _sellerOtpCallback;
          _sellerOtpCallback = null;
          btn.disabled = false;
          btn.textContent = dict.verifyBtn;
          closeModal();
          try { sellerCb(); } catch (e) {}
          return null;
        }
        return fetch(apiBase() + '/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            phone: data.phoneMr,
            phoneIntl: data.phoneIntl,
            whatsapp: data.whatsapp,
            email: data.email
          })
        }).then(function (res2) { return res2.json().then(function (j2) { return { ok: res2.ok, body: j2 }; }); });
      }).then(function (reg) {
        btn.disabled = false;
        btn.textContent = dict.verifyBtn;
        if (!reg) return;
        if (!reg.ok || !reg.body || !reg.body.ok || !reg.body.token) {
          alert((reg.body && (reg.body.error || reg.body.message)) || networkErrorMsg(dict));
          return;
        }
        finishRegister({
          id: reg.body.buyer.id,
          name: reg.body.buyer.name,
          phone: reg.body.buyer.phone,
          phoneIntl: reg.body.buyer.phoneIntl,
          whatsapp: reg.body.buyer.whatsapp,
          email: reg.body.buyer.email,
          token: reg.body.token
        });
      }).catch(function () {
        btn.disabled = false;
        btn.textContent = dict.verifyBtn;
        alert(networkErrorMsg(dict));
      });
  }

  function showAccountPanel() {
    var s = getSession();
    var dict = d();
    function esc(v) {
      return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
      });
    }
    document.getElementById('rag-title').textContent = dict.titleAccount;
    document.getElementById('rag-sub').textContent = dict.subAccount;
    document.getElementById('rag-returning').classList.remove('show');
    document.getElementById('rag-acc-name').textContent = s.name || '—';
    var lines = ['<div>' + dict.loggedAs + '</div>'];
    if (s.phone) lines.push('<div>📱 +222 ' + esc(s.phone) + '</div>');
    if (s.phoneIntl) lines.push('<div>🌍 ' + esc(s.phoneIntl) + '</div>');
    if (s.whatsapp) lines.push('<div>💬 ' + esc(s.whatsapp) + '</div>');
    lines.push('<div>✉️ ' + esc(s.email || '—') + '</div>');
    document.getElementById('rag-acc-meta').innerHTML = lines.join('');
    showStep('account');
  }

  function prefillDraft() {
    var draft = loadDraft();
    var sess = getSession();
    var src = (sess && sess.name) ? sess : draft;
    document.getElementById('rag-name').value = (src && src.name) || '';
    document.getElementById('rag-email').value = (src && src.email) || '';
    document.getElementById('rag-phone-mr').value = (src && (src.phoneMr || src.phone)) || '';
    document.getElementById('rag-phone-intl').value = (src && src.phoneIntl) || '';
    document.getElementById('rag-whatsapp').value = (src && src.whatsapp) || '';
    document.getElementById('rag-wa-same').checked = true;
    syncWhatsappFromPhones();
    clearOtpBoxes();
    document.getElementById('rag-devhint').classList.remove('show');
    document.getElementById('rag-returning').classList.remove('show');
  }

  function openModal(reasonKey) {
    openRagShell();
    _modalMode = 'gate';
    _sellerOtpCallback = null;
    applyTexts(reasonKey || 'reasonGeneric');
    prefillDraft();
    showStep('form');
    setTimeout(function () { document.getElementById('rag-name').focus(); }, 250);
  }

  function openAccountChoice() {
    /* إن كان المشتري مسجّلاً بالفعل → لوحة الحساب مباشرة */
    if (isLoggedIn()) {
      openAccountModal();
      return;
    }
    rememberAfterAuthHref();
    openRagShell();
    _modalMode = 'gate';
    applyTexts('reasonGeneric');
    var dict = d();
    document.getElementById('rag-title').textContent = dict.titleChoice;
    document.getElementById('rag-sub').textContent = dict.subChoice;
    document.getElementById('rag-choice-buyer-title').textContent = dict.choiceBuyer;
    document.getElementById('rag-choice-buyer-sub').textContent = dict.choiceBuyerSub;
    document.getElementById('rag-choice-seller-title').textContent = dict.choiceSeller;
    document.getElementById('rag-choice-seller-sub').textContent = dict.choiceSellerSub;
    var loginTitle = document.getElementById('rag-choice-seller-login-title');
    var loginSub = document.getElementById('rag-choice-seller-login-sub');
    if (loginTitle) loginTitle.textContent = dict.choiceSellerLogin;
    if (loginSub) loginSub.textContent = dict.choiceSellerLoginSub;
    var closeBtn = document.getElementById('rag-close-btn');
    if (closeBtn) {
      closeBtn.setAttribute('aria-label', t('إغلاق', 'Fermer'));
      closeBtn.setAttribute('title', t('إغلاق', 'Fermer'));
    }
    var l1 = document.getElementById('rag-pstep-1-label');
    var l2 = document.getElementById('rag-pstep-2-label');
    var l3 = document.getElementById('rag-pstep-3-label');
    if (l1) l1.textContent = t('النوع', 'Type');
    if (l2) l2.textContent = t('البيانات', 'Infos');
    if (l3) l3.textContent = t('تم', 'OK');
    showStep('choice');
  }

  function openAccountModal() {
    rememberAfterAuthHref();
    openRagShell();
    _modalMode = 'account';
    _sellerOtpCallback = null;
    applyTexts('reasonGeneric');
    if (isLoggedIn()) {
      showAccountPanel();
    } else {
      prefillDraft();
      showStep('form');
    }
  }

  function ensureEmailOtpVerified(data, onSuccess) {
    if (!data || !data.email) {
      if (typeof onSuccess === 'function') onSuccess();
      return;
    }
    if (isEmailVerified(data.email)) {
      if (typeof onSuccess === 'function') onSuccess();
      return;
    }
    openRagShell();
    _modalMode = 'gate';
    _sellerOtpCallback = onSuccess;
    applyTexts('reasonGeneric');
    document.getElementById('rag-name').value = data.name || '';
    document.getElementById('rag-email').value = data.email || '';
    document.getElementById('rag-phone-mr').value = data.phoneMr || data.phone || '';
    document.getElementById('rag-phone-intl').value = data.phoneIntl || '';
    document.getElementById('rag-whatsapp').value = data.whatsapp || '';
    document.getElementById('rag-wa-same').checked = false;
    document.getElementById('rag-whatsapp').disabled = false;
    document.getElementById('rag-title').textContent = d().titleOtp;
    document.getElementById('rag-sub').textContent = t('أكّد بريدك قبل إتمام تسجيل حساب الأعمال', 'Confirmez votre e-mail avant de finaliser le compte pro');
    showStep('form');
  }

  function closeModal() {
    if (Date.now() - (_ragOpenedAt || 0) < 800) return;
    var ov = document.getElementById('rag-overlay');
    if (ov) {
      ov.classList.remove('open');
      ov.style.display = 'none';
    }
    document.body.classList.remove('rizq-reg-open');
    var sellerOpen = document.getElementById('modal') && document.getElementById('modal').classList.contains('open');
    if (!sellerOpen) document.body.style.overflow = '';
    clearInterval(_otpTimer);
    _pendingAction = null;
    _sellerOtpCallback = null;
    if (window.RizqTermsGate && typeof window.RizqTermsGate.resetSession === 'function') {
      window.RizqTermsGate.resetSession();
    }
    var waEl = document.getElementById('rag-whatsapp');
    if (waEl) waEl.disabled = false;
  }

  function runPendingAction() {
    var fn = _pendingAction;
    _pendingAction = null;
    if (typeof fn === 'function') try { fn(); } catch (e) {}
  }

  function requireAuth(actionFn, reasonKey) {
    if (isLoggedIn()) {
      if (typeof actionFn === 'function') actionFn();
      return true;
    }
    _pendingAction = actionFn;
    rememberAfterAuthHref();
    openModal(reasonKey);
    return false;
  }

  function gateLink(el, ev, reasonKey) {
    if (isLoggedIn()) return true;
    if (ev && ev.preventDefault) ev.preventDefault();
    var targetHref = el && el.href ? el.href : '';
    if (targetHref) {
      try {
        if (window.RizqAccount && typeof window.RizqAccount.setAfterAuthHref === 'function') {
          window.RizqAccount.setAfterAuthHref(targetHref);
        } else {
          sessionStorage.setItem('rizq_after_auth_href', targetHref);
        }
      } catch (e) {}
    } else {
      rememberAfterAuthHref();
    }
    requireAuth(function () {
      if (targetHref) {
        if (el && el.target === '_blank') window.open(targetHref, '_blank', 'noopener');
        else window.location.href = targetHref;
      }
    }, reasonKey);
    return false;
  }

  window.RizqAuthGate = {
    requireAuth: requireAuth,
    openAccount: openAccountModal,
    openAccountChoice: openAccountChoice,
    ensureEmailOtpVerified: ensureEmailOtpVerified,
    isLoggedIn: isLoggedIn,
    getSession: getSession,
    logout: function () { clearSession(); }
  };
  window.rizqRequireAuth = requireAuth;
  window.rizqGateLink = gateLink;

  loadOtpConfig();
  verifySessionSilently();
})();
