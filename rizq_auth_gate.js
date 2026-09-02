/**
 * rizq_auth_gate.js — بوابة المشتري/الزائر (Guest Gate) v18
 * اسم + بريد + واتساب + (هاتف MR أو دولي) + OTP بالبريد
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
      titleChoice: 'كيف تريد استخدام رزق؟',
      subGate: 'سجّل مجاناً للتواصل مع البائعين وحفظ المفضلة — أقل من دقيقة',
      subAccount: 'حسابك على رزق — للتصفح والتواصل والمفضلة',
      subOtp: 'أدخل الرمز المُرسَل إلى بريدك الإلكتروني',
      subReturning: 'مرحباً بعودتك! أكّد بريدك برمز التحقق',
      subChoice: 'اختر ما يناسبك — يمكنك التبديل لاحقاً',
      choiceBuyer: '🛒 أشتري — حساب سريع',
      choiceBuyerSub: 'للتصفح والتواصل والمفضلة',
      choiceSeller: '🏪 أبيع — حساب بائع',
      choiceSellerSub: 'لنشر الإعلانات وإدارة متجرك',
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
      privacy: '🔒 بياناتك محمية — تُستخدم للتواصل والمفضلة ومكافحة الحسابات الوهمية فقط.',
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
      sellerCta: '🏪 أنا بائع — فتح حساب بائع',
      loggedAs: 'مسجّل كمشتري',
      reasonPhone: 'لعرض رقم الهاتف',
      reasonWhatsapp: 'للتواصل عبر واتساب',
      reasonMsg: 'لإرسال رسالة للبائع',
      reasonFav: 'لإضافة الإعلان للمفضلة',
      reasonGeneric: 'للمتابعة',
      otpSent: 'تم إرسال الرمز إلى بريدك',
      otpDevHint: 'بيئة تطوير — الرمز:',
    },
    fr: {
      titleGate: 'Dernière étape avant de continuer',
      titleAccount: 'Mon compte',
      titleOtp: 'Confirmez votre e-mail',
      titleChoice: 'Comment utiliser Rizq ?',
      subGate: 'Inscrivez-vous gratuitement pour contacter les vendeurs et sauvegarder vos favoris',
      subAccount: 'Votre compte Rizq — navigation, contact et favoris',
      subOtp: 'Saisissez le code envoyé à votre e-mail',
      subReturning: 'Bon retour ! Confirmez votre e-mail avec le code',
      subChoice: 'Choisissez — vous pourrez changer plus tard',
      choiceBuyer: '🛒 J\'achète — compte rapide',
      choiceBuyerSub: 'Parcourir, contacter et favoris',
      choiceSeller: '🏪 Je vends — compte vendeur',
      choiceSellerSub: 'Publier des annonces et gérer votre activité',
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
      sellerCta: '🏪 Je suis vendeur — compte vendeur',
      loggedAs: 'Connecté en tant qu\'acheteur',
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
    if (document.getElementById('rag-css')) return;
    var css = ''
      + '.rag-overlay{position:fixed;inset:0;background:rgba(5,10,22,.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);z-index:999990;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;pointer-events:none;transition:opacity .25s}'
      + '.rag-overlay.open{opacity:1;pointer-events:all}'
      + '.rag-modal{background:linear-gradient(165deg,#0a1628,#122040 55%,#0d1a30);border:1px solid rgba(201,168,76,.25);border-radius:24px;max-width:420px;width:100%;padding:26px 22px 20px;box-shadow:0 20px 60px rgba(0,0,0,.45);transform:scale(.94) translateY(12px);transition:transform .3s cubic-bezier(.34,1.4,.64,1);font-family:Cairo,"Noto Naskh Arabic",Segoe UI,sans-serif;position:relative;max-height:92vh;overflow-y:auto;color:#fff;box-sizing:border-box}'
      + '.rag-overlay.open .rag-modal{transform:scale(1) translateY(0)}'
      + '.rag-close{position:absolute;top:12px;inset-inline-end:12px;background:rgba(255,255,255,.08);border:1px solid rgba(201,168,76,.25);color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px;z-index:2}'
      + '.rag-brand{display:flex;flex-direction:column;align-items:center;gap:6px;margin:0 0 12px}'
      + '.rag-brand-mark{width:60px;height:60px;border-radius:14px;background:#071020;border:2px solid rgba(201,168,76,.7);display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(201,168,76,.2)}'
      + '.rag-brand-mark img{width:48px;height:48px}'
      + '.rag-brand-name{font-size:18px;font-weight:800;color:#C9A84C}'
      + '.rag-title{color:#F3DE9C;font-size:17px;font-weight:800;text-align:center;margin:0 0 5px}'
      + '.rag-sub{color:rgba(255,255,255,.65);font-size:12px;text-align:center;margin:0 0 16px;line-height:1.55}'
      + '.rag-returning{background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.35);border-radius:12px;padding:10px 12px;font-size:12px;color:#F3DE9C;text-align:center;margin:-6px 0 14px;display:none}'
      + '.rag-returning.show{display:block}'
      + '.rag-label{display:block;color:rgba(255,255,255,.88);font-size:11.5px;font-weight:700;margin:0 0 4px}'
      + '.rag-hint{font-size:10px;color:rgba(255,255,255,.45);margin:-6px 0 8px;line-height:1.5}'
      + '.rag-input{width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);border:1.5px solid rgba(201,168,76,.28);border-radius:11px;padding:11px 12px;color:#fff;font-size:13.5px;font-family:inherit;margin-bottom:10px}'
      + '.rag-input:focus{outline:none;border-color:#C9A84C;box-shadow:0 0 0 3px rgba(201,168,76,.12)}'
      + '.rag-input.err{border-color:#ef4444}'
      + '.rag-check{display:flex;align-items:center;gap:8px;font-size:11.5px;color:rgba(255,255,255,.7);margin:-4px 0 10px;cursor:pointer}'
      + '.rag-check input{accent-color:#C9A84C}'
      + '.rag-errmsg{color:#f87171;font-size:11px;margin:-6px 0 8px;display:none}'
      + '.rag-errmsg.show{display:block}'
      + '.rag-btn{width:100%;background:linear-gradient(135deg,#a67c2e,#d4b356,#c9a84c);color:#0a1628;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;margin-top:4px;box-shadow:0 6px 20px rgba(201,168,76,.35)}'
      + '.rag-btn:disabled{opacity:.55;cursor:default}'
      + '.rag-btn-ghost{background:transparent;border:1px solid rgba(255,255,255,.18);color:rgba(255,255,255,.75);box-shadow:none;margin-top:8px}'
      + '.rag-choice{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}'
      + '.rag-choice-card{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.05);border:1.5px solid rgba(201,168,76,.22);border-radius:14px;padding:14px;cursor:pointer;text-align:right;transition:border-color .2s,background .2s}'
      + '.rag-choice-card:hover{border-color:rgba(201,168,76,.5);background:rgba(201,168,76,.08)}'
      + '.rag-choice-icon{font-size:26px;flex-shrink:0}'
      + '.rag-choice-title{font-size:14px;font-weight:800;color:#F3DE9C}'
      + '.rag-choice-sub{font-size:11px;color:rgba(255,255,255,.55);margin-top:2px}'
      + '.rag-otp-row{display:flex;gap:8px;justify-content:center;margin:14px 0 10px}'
      + '.rag-otp-box{width:44px;height:50px;background:rgba(255,255,255,.07);border:1.5px solid rgba(201,168,76,.35);border-radius:10px;text-align:center;font-size:20px;font-weight:800;color:#fff;font-family:inherit}'
      + '.rag-otp-box:focus{outline:none;border-color:#C9A84C;box-shadow:0 0 0 3px rgba(201,168,76,.15)}'
      + '.rag-otp-meta{text-align:center;font-size:11.5px;color:rgba(255,255,255,.5);margin-bottom:10px}'
      + '.rag-otp-meta button{background:none;border:none;color:#E8C96A;font-weight:700;cursor:pointer;font-family:inherit;font-size:11.5px;text-decoration:underline}'
      + '.rag-devhint{background:rgba(255,255,255,.06);border:1px dashed rgba(201,168,76,.4);border-radius:10px;padding:8px 10px;font-size:11px;color:#F3DE9C;text-align:center;margin-bottom:10px;display:none}'
      + '.rag-devhint.show{display:block}'
      + '.rag-privacy{color:rgba(255,255,255,.42);font-size:10.5px;text-align:center;margin-top:12px;line-height:1.6}'
      + '.rag-account-card{background:rgba(255,255,255,.05);border:1px solid rgba(201,168,76,.22);border-radius:14px;padding:14px;margin-bottom:12px}'
      + '.rag-account-name{font-size:16px;font-weight:800;color:#F3DE9C;margin-bottom:4px}'
      + '.rag-account-meta{font-size:12px;color:rgba(255,255,255,.6);line-height:1.7}'
      + '.rag-seller-link{display:block;text-align:center;margin-top:10px;color:#E8C96A;font-size:12.5px;font-weight:700;text-decoration:none}'
      + '.rag-step{display:none}'
      + '.rag-step.active{display:block}';
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
      '  <div class="rag-modal" role="dialog" aria-modal="true">',
      '    <button class="rag-close" id="rag-close-btn" type="button">✕</button>',
      '    <div class="rag-brand"><div class="rag-brand-mark"><img src="rizq-mark-512.png" width="48" height="48" alt="رزق"/></div><div class="rag-brand-name">رزق | Rizq</div></div>',
      '    <div class="rag-title" id="rag-title"></div>',
      '    <div class="rag-sub" id="rag-sub"></div>',
      '    <div class="rag-returning" id="rag-returning"></div>',
      '    <div class="rag-step" id="rag-step-choice">',
      '      <div class="rag-choice">',
      '        <div class="rag-choice-card" id="rag-choice-buyer" role="button" tabindex="0">',
      '          <div class="rag-choice-icon">🛒</div>',
      '          <div><div class="rag-choice-title" id="rag-choice-buyer-title"></div><div class="rag-choice-sub" id="rag-choice-buyer-sub"></div></div>',
      '        </div>',
      '        <div class="rag-choice-card" id="rag-choice-seller" role="button" tabindex="0">',
      '          <div class="rag-choice-icon">🏪</div>',
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
      '      <a class="rag-seller-link" id="rag-seller-link" href="rizq_landing_v8.html?openRegister=1"></a>',
      '    </div>',
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

    document.getElementById('rag-close-btn').addEventListener('click', closeModal);
    document.getElementById('rag-overlay').addEventListener('click', function (e) {
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
    document.getElementById('rag-choice-seller').addEventListener('click', function () {
      closeModal();
      if (typeof window.openModal === 'function') window.openModal('register');
      else location.href = 'rizq_landing_v8.html?openRegister=1';
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
    var reason = dict[reasonKey] || dict.reasonGeneric;
    document.getElementById('rag-title').textContent = _modalMode === 'account' ? dict.titleAccount : dict.titleGate;
    document.getElementById('rag-sub').textContent = (_modalMode === 'account' ? dict.subAccount : dict.subGate)
      + (reason !== dict.reasonGeneric && _modalMode !== 'account' ? ' — ' + reason : '');
    document.getElementById('rag-choice-buyer-title').textContent = dict.choiceBuyer;
    document.getElementById('rag-choice-buyer-sub').textContent = dict.choiceBuyerSub;
    document.getElementById('rag-choice-seller-title').textContent = dict.choiceSeller;
    document.getElementById('rag-choice-seller-sub').textContent = dict.choiceSellerSub;
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
    document.getElementById('rag-privacy-form').textContent = dict.privacy;
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
        if (!data || !data.exists) {
          badge.classList.remove('show');
          return;
        }
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
      body: JSON.stringify({
        channel: 'buyer',
        email: data.email,
        name: data.name,
        phoneMr: data.phoneMr,
        phoneIntl: data.phoneIntl,
        whatsapp: data.whatsapp
      })
    }).then(function (res) { return res.json().then(function (j) { return { ok: res.ok, body: j }; }); })
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
      runPendingAction();
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
    document.getElementById('rag-title').textContent = dict.titleAccount;
    document.getElementById('rag-sub').textContent = dict.subAccount;
    document.getElementById('rag-returning').classList.remove('show');
    document.getElementById('rag-acc-name').textContent = s.name || '—';
    var lines = ['<div>' + dict.loggedAs + '</div>'];
    if (s.phone) lines.push('<div>📱 +222 ' + s.phone + '</div>');
    if (s.phoneIntl) lines.push('<div>🌍 ' + s.phoneIntl + '</div>');
    if (s.whatsapp) lines.push('<div>💬 ' + s.whatsapp + '</div>');
    lines.push('<div>✉️ ' + (s.email || '—') + '</div>');
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
    ensureModal();
    _modalMode = 'gate';
    _sellerOtpCallback = null;
    applyTexts(reasonKey || 'reasonGeneric');
    prefillDraft();
    showStep('form');
    document.getElementById('rag-overlay').classList.add('open');
    setTimeout(function () { document.getElementById('rag-name').focus(); }, 250);
  }

  function openAccountChoice() {
    ensureModal();
    var dict = d();
    document.getElementById('rag-title').textContent = dict.titleChoice;
    document.getElementById('rag-sub').textContent = dict.subChoice;
    document.getElementById('rag-choice-buyer-title').textContent = dict.choiceBuyer;
    document.getElementById('rag-choice-buyer-sub').textContent = dict.choiceBuyerSub;
    document.getElementById('rag-choice-seller-title').textContent = dict.choiceSeller;
    document.getElementById('rag-choice-seller-sub').textContent = dict.choiceSellerSub;
    showStep('choice');
    document.getElementById('rag-overlay').classList.add('open');
  }

  function openAccountModal() {
    ensureModal();
    _modalMode = 'account';
    _sellerOtpCallback = null;
    applyTexts('reasonGeneric');
    if (isLoggedIn()) {
      showAccountPanel();
    } else {
      prefillDraft();
      showStep('form');
    }
    document.getElementById('rag-overlay').classList.add('open');
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
    ensureModal();
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
    document.getElementById('rag-sub').textContent = t('أكّد بريدك قبل إتمام التسجيل كبائع', 'Confirmez votre e-mail avant de finaliser l\'inscription vendeur');
    showStep('form');
    document.getElementById('rag-overlay').classList.add('open');
  }

  function closeModal() {
    var ov = document.getElementById('rag-overlay');
    if (ov) ov.classList.remove('open');
    clearInterval(_otpTimer);
    _pendingAction = null;
    _sellerOtpCallback = null;
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
    openModal(reasonKey);
    return false;
  }

  function gateLink(el, ev, reasonKey) {
    if (isLoggedIn()) return true;
    if (ev && ev.preventDefault) ev.preventDefault();
    requireAuth(function () {
      if (el && el.href) {
        if (el.target === '_blank') window.open(el.href, '_blank', 'noopener');
        else window.location.href = el.href;
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
