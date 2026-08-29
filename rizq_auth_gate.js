/**
 * rizq_auth_gate.js — بوابة تسجيل/دخول سريعة للمشتري (Guest Gate)
 * ────────────────────────────────────────────────────────────────
 * طلب Limam (13/08/2026): تصفح حر كامل للزائر غير المسجَّل (الأقسام،
 * الصور، الأسعار، التفاصيل العامة) — لكن كشف رقم الهاتف/واتساب/إرسال
 * رسالة/إضافة للمفضلة يتطلب تسجيلاً سريعاً (اسم + هاتف + إيميل اختياري)،
 * عبر نافذة منبثقة أنيقة بدل تحويل الزائر لصفحة أخرى.
 *
 * التسجيل = الدخول: رقم الهاتف هو المعرّف الفريد على الخادم
 * (POST /api/auth/register في rizq-backend) — لا كلمة سر
 * ولا OTP حقيقي حالياً (قرار صريح: SMS OTP حقيقي مهمة منفصلة تتطلب بوابة
 * مزوّد SMS مدفوعة). هذا حساب "مشترٍ" بسيط منفصل تماماً عن حسابات
 * التجار/المكاتب/الشركات (accounts) — لا علاقة له بنظام dashToken هناك.
 *
 * يُحقن في أي صفحة عامة بسطر واحد فقط (بعد rizq_backend_config.js):
 *   <script src="rizq_auth_gate.js" defer></script>
 *
 * الاستخدام من أي صفحة:
 *   rizqRequireAuth(function(){ ... الفعل المحمي ... });
 * إن كان الزائر مسجَّلاً بالفعل (جلسة صالحة محلياً) يُنفَّذ الفعل فوراً
 * بلا أي نافذة. غير ذلك تُفتح النافذة، وعند نجاح التسجيل يُنفَّذ الفعل
 * تلقائياً بلا حاجة لنقرة ثانية من الزائر.
 */
(function () {
  'use strict';
  if (window.RizqAuthGate) return; // حُقن مسبقاً في هذه الصفحة

  var SESSION_KEY = 'rizq_buyer_session';
  var WISHLIST_KEY = 'rizq_wishlist';
  var _pendingAction = null;

  function apiBase() {
    return window.RIZQ_BACKEND_BASE ? window.RIZQ_BACKEND_BASE.replace(/\/$/, '') : '';
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
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + s.token,
      'X-Buyer-Id': s.id
    };
  }

  /** دمج محلي ← خادم ثم تحديث localStorage من الاستجابة */
  function syncWishlistToServer(s) {
    if (!s || !s.id || !s.token || !apiBase()) return Promise.resolve();
    return fetch(apiBase() + '/api/wishlist/sync', {
      method: 'POST',
      headers: buyerAuthHeaders(s),
      body: JSON.stringify({ ids: getLocalWishlist() })
    }).then(function (res) {
      return res.json().then(function (j) {
        if (res.ok && j && j.ok && Array.isArray(j.ids)) setLocalWishlist(j.ids);
      });
    }).catch(function () { /* صامت */ });
  }

  /** سحب مفضلة الخادم ودمجها مع المحلي عند التحقق من الجلسة */
  function pullWishlistFromServer(s) {
    if (!s || !s.id || !s.token || !apiBase()) return Promise.resolve();
    return fetch(apiBase() + '/api/wishlist', { headers: buyerAuthHeaders(s) })
      .then(function (res) {
        return res.json().then(function (j) {
          if (!res.ok || !j || !j.ok || !Array.isArray(j.ids)) return;
          var local = getLocalWishlist();
          var merged = [];
          var seen = {};
          j.ids.concat(local).forEach(function (id) {
            id = String(id);
            if (!id || seen[id]) return;
            seen[id] = true;
            merged.push(id);
          });
          setLocalWishlist(merged);
        });
      }).catch(function () { /* صامت */ });
  }

  /* ══════════════ اللغة ══════════════ */
  function lang() {
    try {
      var htmlLang = document.documentElement.getAttribute('lang');
      if (htmlLang === 'fr' || htmlLang === 'ar') return htmlLang;
      if (typeof window._rizqLang === 'function') return window._rizqLang();
      if (window.RizqI18n && typeof window.RizqI18n.getLang === 'function') return window.RizqI18n.getLang();
    } catch (e) {}
    try { return localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar'; } catch (e) { return 'ar'; }
  }

  var DICT = {
    ar: {
      title: 'خطوة أخيرة قبل المتابعة',
      sub: 'التسجيل مجاني وسريع — 10 ثوانٍ فقط، ويبقى محفوظاً في متصفحك',
      nameLabel: 'الاسم الكامل',
      namePh: 'مثال: محمد أحمد',
      phoneLabel: 'رقم الهاتف',
      phonePh: '2X XX XX XX',
      emailLabel: 'البريد الإلكتروني (اختياري)',
      emailPh: 'example@email.com',
      submit: 'متابعة',
      submitting: 'جارٍ التسجيل...',
      privacy: '🔒 بياناتك محمية ولن تُعرض لأي زائر آخر — تُستخدم فقط لتفعيل ميزات التواصل والمفضلة.',
      close: 'إغلاق',
      errName: 'يرجى إدخال الاسم الكامل',
      errPhone: 'يرجى إدخال رقم هاتف موريتاني صالح (8 أرقام، يبدأ بـ2 أو3 أو4)',
      errNetwork: 'تعذّر الاتصال بالخادم — تحقق من اتصالك بالإنترنت وحاول مرة أخرى',
      welcome: 'أهلاً بك',
      successToast: '✅ تم التسجيل بنجاح',
      reasonPhone: 'لعرض رقم الهاتف',
      reasonWhatsapp: 'للتواصل عبر واتساب',
      reasonMsg: 'لإرسال رسالة للبائع',
      reasonFav: 'لإضافة الإعلان للمفضلة',
      reasonGeneric: 'للمتابعة',
    },
    fr: {
      title: 'Dernière étape avant de continuer',
      sub: 'Inscription gratuite et rapide — 10 secondes, et reste enregistrée sur votre navigateur',
      nameLabel: 'Nom complet',
      namePh: 'Ex : Mohamed Ahmed',
      phoneLabel: 'Numéro de téléphone',
      phonePh: '2X XX XX XX',
      emailLabel: 'E-mail (optionnel)',
      emailPh: 'exemple@email.com',
      submit: 'Continuer',
      submitting: 'Inscription en cours...',
      privacy: "🔒 Vos données sont protégées et ne seront jamais visibles par un autre visiteur — utilisées uniquement pour activer le contact et les favoris.",
      close: 'Fermer',
      errName: 'Veuillez saisir votre nom complet',
      errPhone: 'Veuillez saisir un numéro mauritanien valide (8 chiffres, commence par 2, 3 ou 4)',
      errNetwork: 'Connexion au serveur impossible — vérifiez votre connexion internet et réessayez',
      welcome: 'Bienvenue',
      successToast: '✅ Inscription réussie',
      reasonPhone: 'pour afficher le numéro',
      reasonWhatsapp: 'pour contacter via WhatsApp',
      reasonMsg: 'pour envoyer un message au vendeur',
      reasonFav: "pour ajouter l'annonce aux favoris",
      reasonGeneric: 'pour continuer',
    }
  };

  /* ══════════════ جلسة المشتري (localStorage) ══════════════ */
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

  // تحقق خلفي صامت من صلاحية الجلسة عند تحميل الصفحة — لا يحجب أي فعل
  // ولا يُظهر أي شيء للزائر، فقط ينظّف جلسة فاسدة/محذوفة من الخادم بصمت
  // (نادر جداً في هذا التصميم لأن التوكن لا يُبطَل تلقائياً، لكن حماية
  // دفاعية ضد تعديل يدوي لـ localStorage أو حذف السجل من الخادم مستقبلاً).
  function verifySessionSilently() {
    var s = getSession();
    if (!s || !s.id || !s.token || !apiBase()) return;
    fetch(apiBase() + '/api/auth/me?id=' + encodeURIComponent(s.id) + '&token=' + encodeURIComponent(s.token))
      .then(function (res) {
        if (res.status === 401) { clearSession(); return; }
        if (res.ok) return pullWishlistFromServer(s);
      })
      .catch(function () { /* صامت — انقطاع شبكة لا يعني جلسة فاسدة */ });
  }

  /* ══════════════ CSS ══════════════ */
  function injectStyle() {
    if (document.getElementById('rag-css')) return;
    var css = ''
      + '.rag-overlay{position:fixed;inset:0;background:rgba(5,10,22,.78);backdrop-filter:blur(20px);' +
        '-webkit-backdrop-filter:blur(20px);z-index:999990;display:flex;align-items:center;justify-content:center;' +
        'padding:16px;opacity:0;pointer-events:none;transition:opacity .25s ease;box-sizing:border-box}'
      + '.rag-overlay.open{opacity:1;pointer-events:all}'
      + '.rag-modal{background:linear-gradient(165deg,#0a1628 0%,#122040 55%,#0d1a30 100%);' +
        'border:1px solid rgba(201,168,76,.22);border-radius:24px;max-width:400px;width:100%;' +
        'padding:28px 24px 22px;box-shadow:0 8px 32px rgba(0,0,0,.28),0 15px 50px -10px rgba(0,0,0,.45);' +
        'transform:scale(.92) translateY(14px);transition:transform .3s cubic-bezier(.34,1.56,.64,1);' +
        "font-family:'Cairo','Noto Naskh Arabic','Segoe UI',sans-serif;position:relative;max-height:92vh;" +
        'overflow-y:auto;overflow-x:hidden;color:rgba(255,255,255,.94);box-sizing:border-box}'
      + '.rag-overlay.open .rag-modal{transform:scale(1) translateY(0)}'
      + '.rag-close{position:absolute;top:12px;inset-inline-end:12px;background:rgba(255,255,255,.08);' +
        'border:1px solid rgba(201,168,76,.2);color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer;' +
        'font-size:14px;display:flex;align-items:center;justify-content:center;transition:background .2s,border-color .2s;z-index:2}'
      + '.rag-close:hover{background:rgba(255,255,255,.16);border-color:rgba(201,168,76,.45)}'
      + '.rag-brand{display:flex;flex-direction:column;align-items:center;gap:6px;margin:0 0 14px}'
      + '.rag-brand-mark{width:64px;height:64px;border-radius:14px;background:#071020;' +
        'border:2px solid rgba(201,168,76,.75);display:flex;align-items:center;justify-content:center;padding:4px;' +
        'box-shadow:0 0 24px rgba(201,168,76,.22)}'
      + '.rag-brand-mark img{width:52px;height:52px;object-fit:contain;display:block}'
      + ".rag-brand-name{font-family:'Noto Naskh Arabic','Cairo',serif;font-size:20px;font-weight:800;" +
        'color:#C9A84C;letter-spacing:.02em;text-shadow:0 0 20px rgba(201,168,76,.35);line-height:1.2}'
      + '.rag-title{color:#F3DE9C;font-size:17px;font-weight:800;text-align:center;margin:0 0 6px}'
      + '.rag-sub{color:rgba(255,255,255,.68);font-size:12.5px;text-align:center;margin:0 0 18px;line-height:1.55}'
      + '.rag-label{display:block;color:rgba(255,255,255,.88);font-size:12px;font-weight:700;margin:0 0 5px}'
      + '.rag-input{width:100%;box-sizing:border-box;background:rgba(255,255,255,.07);' +
        'border:1.5px solid rgba(201,168,76,.28);border-radius:12px;padding:11px 13px;color:#fff;' +
        'font-size:13.5px;font-family:inherit;margin-bottom:13px;transition:border-color .2s,background .2s,box-shadow .2s}'
      + '.rag-input::placeholder{color:rgba(255,255,255,.38)}'
      + '.rag-input:focus{outline:none;border-color:#C9A84C;background:rgba(255,255,255,.1);' +
        'box-shadow:0 0 0 3px rgba(201,168,76,.15)}'
      + '.rag-input.err{border-color:#ef4444}'
      + '.rag-errmsg{color:#f87171;font-size:11px;margin:-9px 0 10px;display:none}'
      + '.rag-errmsg.show{display:block}'
      + '.rag-btn{width:100%;background:linear-gradient(135deg,#a67c2e 0%,#d4b356 42%,#c9a84c 68%,#e8cc7a 100%);' +
        'color:#0a1628;border:none;border-radius:12px;padding:13px;font-size:14.5px;font-weight:800;cursor:pointer;' +
        'transition:transform .15s,opacity .2s,box-shadow .2s;font-family:inherit;margin-top:4px;' +
        'box-shadow:0 6px 22px rgba(201,168,76,.35),inset 0 1px 0 rgba(255,255,255,.25)}'
      + '.rag-btn:hover{transform:translateY(-1px);box-shadow:0 10px 28px rgba(201,168,76,.45),inset 0 1px 0 rgba(255,255,255,.3)}'
      + '.rag-btn:disabled{opacity:.6;cursor:default;transform:none}'
      + '.rag-privacy{color:rgba(255,255,255,.45);font-size:10.5px;text-align:center;margin-top:14px;line-height:1.65}'
      + '@media(max-width:420px){.rag-modal{padding:22px 18px 18px}}';
    var style = document.createElement('style');
    style.id = 'rag-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ══════════════ HTML ══════════════ */
  function ensureModal() {
    if (document.getElementById('rag-overlay')) return;
    injectStyle();
    var wrap = document.createElement('div');
    wrap.innerHTML = [
      '<div class="rag-overlay" id="rag-overlay">',
      '  <div class="rag-modal" role="dialog" aria-modal="true" aria-labelledby="rag-title">',
      '    <button class="rag-close" id="rag-close-btn" type="button" aria-label="close">✕</button>',
      '    <div class="rag-brand">',
      '      <div class="rag-brand-mark"><img src="rizq-mark-512.png" width="52" height="52" alt="رزق"/></div>',
      '      <div class="rag-brand-name">رزق | Rizq</div>',
      '    </div>',
      '    <div class="rag-title" id="rag-title"></div>',
      '    <div class="rag-sub" id="rag-sub"></div>',
      '    <label class="rag-label" id="rag-name-label" for="rag-name"></label>',
      '    <input class="rag-input" id="rag-name" type="text" autocomplete="name"/>',
      '    <div class="rag-errmsg" id="rag-name-err"></div>',
      '    <label class="rag-label" id="rag-phone-label" for="rag-phone"></label>',
      '    <input class="rag-input" id="rag-phone" type="tel" dir="ltr" style="direction:ltr;text-align:left" autocomplete="tel" maxlength="8"/>',
      '    <div class="rag-errmsg" id="rag-phone-err"></div>',
      '    <label class="rag-label" id="rag-email-label" for="rag-email"></label>',
      '    <input class="rag-input" id="rag-email" type="email" dir="ltr" style="direction:ltr;text-align:left;margin-bottom:6px" autocomplete="email"/>',
      '    <button class="rag-btn" id="rag-submit-btn" type="button"></button>',
      '    <div class="rag-privacy" id="rag-privacy"></div>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(wrap.firstElementChild);

    document.getElementById('rag-close-btn').addEventListener('click', closeModal);
    document.getElementById('rag-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    document.getElementById('rag-submit-btn').addEventListener('click', submitForm);
    ['rag-name', 'rag-phone', 'rag-email'].forEach(function (id) {
      document.getElementById(id).addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submitForm();
      });
    });
  }

  function applyTexts(reasonKey) {
    var d = DICT[lang() === 'fr' ? 'fr' : 'ar'];
    var reason = d[reasonKey] || d.reasonGeneric;
    document.getElementById('rag-title').textContent = d.title;
    document.getElementById('rag-sub').textContent = d.sub + (reason !== d.reasonGeneric ? ' — ' + reason : '');
    document.getElementById('rag-name-label').textContent = d.nameLabel;
    document.getElementById('rag-name').placeholder = d.namePh;
    document.getElementById('rag-phone-label').textContent = d.phoneLabel;
    document.getElementById('rag-phone').placeholder = d.phonePh;
    document.getElementById('rag-email-label').textContent = d.emailLabel;
    document.getElementById('rag-email').placeholder = d.emailPh;
    document.getElementById('rag-submit-btn').textContent = d.submit;
    document.getElementById('rag-privacy').textContent = d.privacy;
    document.getElementById('rag-name-err').textContent = d.errName;
    document.getElementById('rag-phone-err').textContent = d.errPhone;
  }

  var MR_PHONE_RE = /^(2[0-9]|3[0-9]|4[0-9])\d{6}$/;

  function notifyRegisterSuccess() {
    var d = DICT[lang() === 'fr' ? 'fr' : 'ar'];
    var msg = d.successToast || d.welcome;
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 'success');
    }
  }

  function submitForm() {
    var d = DICT[lang() === 'fr' ? 'fr' : 'ar'];
    var nameEl = document.getElementById('rag-name');
    var phoneEl = document.getElementById('rag-phone');
    var emailEl = document.getElementById('rag-email');
    var name = nameEl.value.trim();
    var phone = phoneEl.value.replace(/\D/g, '');
    var email = emailEl.value.trim();

    var ok = true;
    if (!name) {
      nameEl.classList.add('err');
      document.getElementById('rag-name-err').classList.add('show');
      ok = false;
    } else {
      nameEl.classList.remove('err');
      document.getElementById('rag-name-err').classList.remove('show');
    }
    if (!MR_PHONE_RE.test(phone)) {
      phoneEl.classList.add('err');
      document.getElementById('rag-phone-err').classList.add('show');
      ok = false;
    } else {
      phoneEl.classList.remove('err');
      document.getElementById('rag-phone-err').classList.remove('show');
    }
    if (!ok) return;

    var btn = document.getElementById('rag-submit-btn');
    btn.disabled = true;
    btn.textContent = d.submitting;

    if (!window.RIZQ_BACKEND_BASE) {
      // لا خادم مضبوط بعد (بيئة تطوير محلية) — نبقي البوابة تعمل بلا كسر
      // التجربة: جلسة محلية مؤقتة بمعرّف عشوائي، بلا مزامنة حقيقية.
      setSession({ id: 'local_' + Date.now(), name: name, phone: phone, email: email, token: 'local' });
      btn.disabled = false;
      closeModal();
      notifyRegisterSuccess();
      runPendingAction();
      return;
    }

    fetch(apiBase() + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, phone: phone, email: email })
    }).then(function (res) { return res.json().then(function (j) { return { ok: res.ok, body: j }; }); })
      .then(function (r) {
        btn.disabled = false;
        btn.textContent = d.submit;
        if (!r.ok || !r.body || !r.body.ok || !r.body.token) {
          alert((r.body && r.body.error) || d.errNetwork);
          return;
        }
        var session = {
          id: r.body.buyer.id,
          name: r.body.buyer.name,
          phone: r.body.buyer.phone,
          email: r.body.buyer.email,
          token: r.body.token
        };
        setSession(session);
        syncWishlistToServer(session).finally(function () {
          closeModal();
          notifyRegisterSuccess();
          runPendingAction();
        });
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = d.submit;
        alert(d.errNetwork);
      });
  }

  function runPendingAction() {
    var fn = _pendingAction;
    _pendingAction = null;
    if (typeof fn === 'function') {
      try { fn(); } catch (e) { /* لا نكسر الصفحة إن رمى الفعل المحمي خطأ */ }
    }
  }

  function openModal(reasonKey) {
    ensureModal();
    applyTexts(reasonKey);
    var ov = document.getElementById('rag-overlay');
    ov.classList.add('open');
    document.getElementById('rag-name').value = '';
    document.getElementById('rag-phone').value = '';
    document.getElementById('rag-email').value = '';
    setTimeout(function () { document.getElementById('rag-name').focus(); }, 300);
  }

  function closeModal() {
    var ov = document.getElementById('rag-overlay');
    if (ov) ov.classList.remove('open');
    _pendingAction = null; // إغلاق يدوي = إلغاء الفعل المعلَّق، لا تنفيذ صامت لاحقاً
  }

  /* ══════════════ الواجهة العامة ══════════════ */
  // reasonKey اختياري: 'reasonPhone'|'reasonWhatsapp'|'reasonMsg'|'reasonFav'
  // — يُخصِّص جملة الشرح فقط، لا يغيّر أي منطق.
  function requireAuth(actionFn, reasonKey) {
    if (isLoggedIn()) {
      if (typeof actionFn === 'function') actionFn();
      return true;
    }
    _pendingAction = actionFn;
    openModal(reasonKey);
    return false;
  }

  // ── لروابط <a href="tel:.."|"https://wa.me/.."> الجاهزة أصلاً في صفحات
  // مثل rizq_store.html (لا خطوة "كشف" مسبقة فيها، الرابط يعمل مباشرة) —
  // onclick="return rizqGateLink(this,event,'reasonPhone')": إن كان الزائر
  // مسجَّلاً نسمح للمتصفح بمتابعة الرابط طبيعياً (return true)، وإلا نمنع
  // الانتقال فوراً ونفتح البوابة، ثم نتابع لنفس href تلقائياً بعد النجاح.
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
    isLoggedIn: isLoggedIn,
    getSession: getSession,
    logout: function () { clearSession(); }
  };
  window.rizqRequireAuth = requireAuth; // اختصار مباشر للاستخدام من onclick="rizqRequireAuth(...)"
  window.rizqGateLink = gateLink; // اختصار للروابط الجاهزة: onclick="return rizqGateLink(this,event,'reasonX')"

  verifySessionSilently();
})();
