/**
 * rizq_messenger.js
 * ═══════════════════════════════════════════════════════════════
 * نظام المراسلة المباشرة بين الزائر والبائع — منصة رزق
 * Version: 1.0.0 | RIZQ-BUILD:202507092200
 *
 * ميزات:
 *  ✅ محادثة مباشرة بدون كشف رقم هاتف
 *  ✅ يعمل بدون backend (localStorage)
 *  ✅ يحفظ الرسائل لداشبورد البائع
 *  ✅ يدعم صفحات: listing, store, office, corp
 *  ✅ ثنائي اللغة (AR/FR)
 *  ✅ مساعد ذكي يرد تلقائياً إذا لم يكن البائع متصلاً
 *
 * الاستخدام:
 *   RizqMessenger.open({ sellerKey, sellerName, adTitle, adId, adEmoji });
 *   // أو ببساطة:
 *   openChat();  // يكتشف السياق تلقائياً من window._currentAd
 * ═══════════════════════════════════════════════════════════════
 */

(function (global) {
  'use strict';

  /* ══════════════════════════════
     الثوابت والإعدادات
  ══════════════════════════════ */
  var STORAGE_PREFIX = 'store_messages_';
  var VISITOR_KEY    = 'rizq_visitor_id';
  var AGENT_DELAY_MS = 1200; // تأخير رد المساعد

  /* ══════════════════════════════
     اقتراحات أسئلة سريعة حسب فئة الإعلان (إلهام "Rufus" في تطبيق أمازون —
     أسئلة سياقية بحسب نوع المنتج بدل 4 أسئلة عامة ثابتة لكل الإعلانات).
     المفتاح = نفس قيمة a.cat/a.category المستخدمة في rizq_post.html
     (SUBCATS_AR keys)، مع 'default' كاحتياط لأي فئة غير مُدرَجة هنا.
  ══════════════════════════════ */
  var SUGGESTIONS_BY_CAT = {
    'عقارات': { ar:['هل يمكن المعاينة؟','هل السعر شامل الكهرباء والماء؟','هل يقبل التقسيط؟','ما مدة العقد؟'],
                fr:['Visite possible ?','Le prix inclut-il eau/électricité ?','Paiement échelonné ?','Durée du contrat ?'] },
    'سيارات': { ar:['هل السيارة مفحوصة ميكانيكياً؟','كم عدد الكيلومترات؟','هل تقبل التقسيط؟','هل يوجد حادث سابق؟'],
                fr:['Inspection mécanique faite ?','Combien de kilomètres ?','Paiement échelonné ?','Accident antérieur ?'] },
    'شاحنات': { ar:['ما حالة المحرك؟','هل يمكن المعاينة قبل الشراء؟','هل يوجد ضمان؟','كم عدد ساعات التشغيل؟'],
                fr:['État du moteur ?','Inspection avant achat possible ?','Garantie disponible ?','Heures de fonctionnement ?'] },
    'إلكترونيات': { ar:['هل يوجد ضمان؟','هل الجهاز مستعمل أم جديد؟','هل البطارية أصلية؟','هل يوجد فاتورة شراء؟'],
                fr:['Garantie disponible ?','Neuf ou occasion ?','Batterie d\'origine ?','Facture d\'achat disponible ?'] },
    'أزياء': { ar:['هل يمكن غسله بالغسالة؟','ما المقاسات المتوفرة؟','هل القماش أصلي؟','هل يوجد توصيل؟'],
                fr:['Lavable en machine ?','Quelles tailles disponibles ?','Tissu d\'origine ?','Livraison possible ?'] },
    'ذهب': { ar:['هل يوجد شهادة عيار رسمية؟','هل الوزن مضمون بالميزان؟','هل يمكن المعاينة قبل الدفع؟','هل يوجد تخفيض عند الدفع نقداً؟'],
                fr:['Certificat de pureté disponible ?','Poids garanti ?','Vérification avant paiement possible ?','Réduction en espèces ?'] },
    'صحة': { ar:['هل المنتج أصلي؟','ما تاريخ الصلاحية؟','هل يوجد توصيل؟'],
                fr:['Produit original ?','Date de péremption ?','Livraison possible ?'] },
    'وظائف': { ar:['ما هي ساعات العمل؟','هل الراتب شهري ثابت؟','هل يوجد تأمين صحي؟','متى تاريخ بداية العمل؟'],
                fr:['Quelles sont les heures de travail ?','Salaire mensuel fixe ?','Assurance santé incluse ?','Date de début ?'] },
    'خدمات': { ar:['هل تقدمون الخدمة في منزلي؟','كم تكلفة المعاينة؟','متى أقرب موعد متاح؟','هل يوجد ضمان على العمل؟'],
                fr:['Service à domicile possible ?','Coût du devis ?','Prochain rendez-vous disponible ?','Garantie sur le travail ?'] },
    'أثاث': { ar:['هل يمكن التوصيل؟','ما هي المقاسات بالضبط؟','هل يوجد ضمان؟','هل الخشب أصلي؟'],
                fr:['Livraison possible ?','Dimensions exactes ?','Garantie disponible ?','Bois d\'origine ?'] },
    'بناء': { ar:['هل يوجد توصيل للموقع؟','ما الكمية المتوفرة؟','هل السعر شامل النقل؟'],
                fr:['Livraison sur site possible ?','Quelle quantité disponible ?','Le prix inclut-il le transport ?'] },
    'ماشية': { ar:['هل يمكن المعاينة قبل الشراء؟','كم العمر؟','هل التوصيل متاح؟','هل التطعيمات محدَّثة؟'],
                fr:['Inspection avant achat possible ?','Quel âge ?','Livraison possible ?','Vaccins à jour ?'] },
    'رياضة': { ar:['هل المقاس متوفر؟','هل الحالة جيدة؟','هل يوجد توصيل؟'],
                fr:['Taille disponible ?','Bon état ?','Livraison possible ?'] },
    'أغذية': { ar:['هل التوصيل متاح؟','ما تاريخ الإنتاج؟','هل الكمية قابلة للتعديل؟'],
                fr:['Livraison possible ?','Date de production ?','Quantité modifiable ?'] },
    'تعليم': { ar:['هل الدروس عن بعد أم حضورياً؟','ما السعر لكل حصة؟','هل يوجد حصة تجريبية؟'],
                fr:['Cours en ligne ou en présentiel ?','Prix par séance ?','Séance d\'essai disponible ?'] },
    'فنون': { ar:['هل يمكن التخصيص حسب الطلب؟','ما مدة التنفيذ؟','هل يوجد توصيل؟'],
                fr:['Personnalisation possible ?','Délai de réalisation ?','Livraison possible ?'] },
    'default': { ar:['هل المنتج متوفر؟','ما هو السعر النهائي؟','أريد الاستفسار','هل يمكن التفاوض؟'],
                fr:['Produit disponible ?','Prix final ?','Je voudrais m\'informer','Négociation possible ?'] }
  };

  // كتالوجات المتاجر/المكاتب/الشركات (rizq_dashboard_store.html وأخواتها) تستخدم
  // حقل فئة نصياً حراً يكتبه صاحب المحل بنفسه (مثال: "ملابس"، "الكترونيات"،
  // "اثاث منزلي") وليس نفس مفاتيح SUBCATS_AR الثابتة في rizq_post.html. مطابقة
  // نصية دقيقة ستفشل غالباً، فنستخدم كلمات مفتاحية شائعة للتعرّف على الفئة
  // الأقرب بدل الرجوع لِ'default' في كل مرة.
  var CATEGORY_KEYWORDS = {
    'عقارات': ['عقار','شقة','منزل','فيلا','أرض','بيت'],
    'سيارات': ['سيارة','سيارات','مركبة','سيار'],
    'شاحنات': ['شاحنة','شاحنات','معدات ثقيلة'],
    'إلكترونيات': ['إلكترون','الكترون','هاتف','جوال','كمبيوتر','لابتوب','حاسوب'],
    'أزياء': ['ملابس','أزياء','لباس','ثوب','حذاء','أحذية','بوبو','ملحفة'],
    'ذهب': ['ذهب','مجوهرات','فضة','مجوهر'],
    'صحة': ['صحة','دواء','طبي','صيدل'],
    'وظائف': ['وظيفة','وظائف','توظيف'],
    'خدمات': ['خدمة','خدمات'],
    'أثاث': ['أثاث','اثاث','مفروشات','ديكور'],
    'بناء': ['بناء','مواد بناء','حديد','خرسانة'],
    'ماشية': ['ماشية','غنم','إبل','بقر','دواجن','أغنام'],
    'رياضة': ['رياضة','رياضي'],
    'أغذية': ['غذاء','أغذية','غذائية','مطعم','حلويات'],
    'تعليم': ['تعليم','دروس','كورس','تدريب'],
    'فنون': ['فنون','حرف','خياطة','تطريز']
  };
  function _resolveCategoryKey(raw) {
    if (!raw) return 'default';
    if (SUGGESTIONS_BY_CAT[raw]) return raw; // مطابقة دقيقة (إعلانات rizq_post.html)
    for (var key in CATEGORY_KEYWORDS) {
      var kws = CATEGORY_KEYWORDS[key];
      for (var i = 0; i < kws.length; i++) {
        if (raw.indexOf(kws[i]) !== -1) return key;
      }
    }
    return 'default';
  }

  /* ══════════════════════════════
     حالة الحوار الداخلية
  ══════════════════════════════ */
  var _state = {
    open:       false,
    sellerKey:  '',
    sellerAccountId: '', // مُعرِّف الحساب الحقيقي للبائع في الخادم (rizq-backend) — إن وُجد
    sellerName: 'البائع',
    adTitle:    '',
    adId:       '',
    adEmoji:    '📦',
    adImage:    '', // صورة المنتج/العقار/العرض المشار إليه من الصفحة
    category:   '',
    lang:       'ar',
    visitorId:  '',
    visitorName:'',
    buyerAccountId: null, // مشترٍ مسجَّل دخوله (rizq_individual_session) — يتيح محادثة ثنائية حقيقية
    buyerToken:     null,
    buyerPhone:     '',
    threadKey:      null,
    msgs:       [],
    seenServerIds: {},
    pollTimer: null,
    pollAttempts: 0,
    pendingImage: '', // dataURL يرفعها الزبون للاستفسار
    pendingImageName: '',
    catalogItems: null
  };

  var MAX_CHAT_IMAGE_BYTES = 380000; /* ~ بعد الضغط base64 */

  function _stopPoll() {
    if (_state.pollTimer) {
      clearInterval(_state.pollTimer);
      _state.pollTimer = null;
    }
    _state.pollAttempts = 0;
  }

  /** جلسة مشترٍ AuthGate (rizq_buyer_session) — OTP سريع للتصفح والتواصل */
  function _getAuthGateBuyer() {
    try {
      if (window.RizqAuthGate && typeof window.RizqAuthGate.getSession === 'function') {
        var gate = window.RizqAuthGate.getSession();
        if (gate && gate.id) return gate;
      }
    } catch (e0) {}
    try {
      var raw = localStorage.getItem('rizq_buyer_session');
      if (!raw) return null;
      var s = JSON.parse(raw);
      return (s && s.id) ? s : null;
    } catch (e) { return null; }
  }

  /** يقرأ جلسة المشتري/البائع الفردي (rizq_individual_session) — لمحادثات مرتبطة بحساب بائع */
  function _getBuyerSession() {
    try {
      var raw = localStorage.getItem('rizq_individual_session');
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.id) return null;
      if (!s.token) {
        try {
          if (window.RizqAccount && typeof window.RizqAccount.readDashToken === 'function') {
            s.token = window.RizqAccount.readDashToken(s.id);
          } else {
            s.token = sessionStorage.getItem('rizq_dash_token_' + s.id) || '';
          }
        } catch (eTok) {}
      }
      return s.token ? s : null;
    } catch(e) { return null; }
  }

  /** اسم الزائر من تسجيل المنصة (بدون خانات في نافذة المحادثة) */
  function _resolveVisitorProfile() {
    var name = '';
    var phone = '';
    try {
      if (window.RizqAuthGate && typeof window.RizqAuthGate.getSession === 'function') {
        var ag = window.RizqAuthGate.getSession();
        if (ag) {
          name = ag.name || ag.fullName || ag.displayName || '';
          phone = ag.whatsapp || ag.phone || ag.phoneIntl || '';
        }
      }
    } catch (e0) {}
    var buyer = _getAuthGateBuyer();
    if (buyer) {
      if (!name) name = buyer.name || buyer.fullName || '';
      if (!phone) phone = buyer.whatsapp || buyer.phone || buyer.phoneIntl || '';
    }
    var ind = _getBuyerSession();
    if (ind) {
      if (!name) name = ind.name || ind.fullName || ind.owner || '';
      if (!phone) phone = ind.whatsapp || ind.phone || ind.phoneIntl || '';
    }
    try {
      var sess = JSON.parse(localStorage.getItem('rizq_session') || 'null');
      if (sess) {
        if (!name) name = sess.name || sess.fullName || sess.owner || '';
        if (!phone) phone = sess.whatsapp || sess.phone || '';
      }
    } catch (e1) {}
    return { name: String(name || '').trim(), phone: String(phone || '').trim() };
  }

  /* ══════════════════════════════
     دوال مساعدة
  ══════════════════════════════ */
  function _getLang() {
    try { return localStorage.getItem('rizq_lang') || 'ar'; } catch(e) { return 'ar'; }
  }

  function _t(ar, fr) {
    return _state.lang === 'fr' ? fr : ar;
  }

  function _ts() {
    var d = new Date();
    return d.getFullYear() + '-' +
           String(d.getMonth()+1).padStart(2,'0') + '-' +
           String(d.getDate()).padStart(2,'0') + ' ' +
           String(d.getHours()).padStart(2,'0') + ':' +
           String(d.getMinutes()).padStart(2,'0');
  }

  function _tsDisplay() {
    var d = new Date();
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  function _esc(s) {
    return String(s||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function _getVisitorId() {
    try {
      var id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = 'V' + Math.random().toString(36).substr(2,6).toUpperCase();
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch(e) { return 'V' + Math.floor(Math.random()*99999); }
  }

  /** مشتق مفتاح البائع من بيانات الإعلان */
  function _deriveSellerKey(ad) {
    if (!ad) return 'demo';
    if (ad.storeId)  return String(ad.storeId);
    if (ad.phone)    return ad.phone.replace(/\D/g,'').slice(-8);
    if (ad.seller)   return ad.seller.trim().replace(/\s+/g,'_').toLowerCase().replace(/[^a-z0-9_ء-ي]/g,'');
    return 'demo';
  }

  /** قراءة رسائل البائع من localStorage */
  function _loadMsgs(key) {
    try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + key) || '[]'); }
    catch(e) { return []; }
  }

  /** حفظ رسائل البائع */
  function _saveMsgs(key, msgs) {
    try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(msgs)); }
    catch(e) {}
  }

  /* ══════════════════════════════
     HTML الـ Modal (يُحقن مرة واحدة)
  ══════════════════════════════ */
  var MODAL_ID = 'rzq-messenger-modal';

  function _injectStyles() {
    /* استبدال أي نسخة قديمة حتى يظهر التصغير فوراً */
    var oldCss = document.getElementById('rzq-messenger-css');
    if (oldCss) oldCss.parentNode.removeChild(oldCss);
    var css = `
#rzq-messenger-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .3s;padding:0 0 max(10px,env(safe-area-inset-bottom,0px));overflow:hidden;box-sizing:border-box}
#rzq-messenger-modal.rzq-open{opacity:1;pointer-events:all}
.rzq-mbox{width:calc(100% - 20px);max-width:440px;background:#f5f8ff;border-radius:18px;height:auto;max-height:min(78dvh,78vh);display:flex;flex-direction:column;transform:translateY(110%);transition:transform .32s cubic-bezier(.4,0,.2,1);box-shadow:0 -8px 40px rgba(15,35,65,.22);overflow:hidden;margin:0 10px max(8px,env(safe-area-inset-bottom,0px));box-sizing:border-box}
#rzq-messenger-modal.rzq-open .rzq-mbox{transform:translateY(0)}
.rzq-mhead{background:linear-gradient(135deg,#1B3A6B,#234d8f);color:#fff;padding:12px 14px;border-radius:18px 18px 0 0;display:flex;align-items:center;gap:10px;flex-shrink:0}
.rzq-mav{width:40px;height:40px;border-radius:50%;background:rgba(201,168,76,.25);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;border:2px solid rgba(201,168,76,.4)}
.rzq-mhead-info{flex:1;min-width:0}
.rzq-mhead-name{font-weight:700;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rzq-mhead-sub{font-size:10.5px;color:rgba(255,255,255,.65);margin-top:1px}
.rzq-mhead-status{font-size:10.5px;color:#4ade80;display:flex;align-items:center;gap:4px;margin-top:2px}
.rzq-mhead-status::before{content:'';width:6px;height:6px;background:#4ade80;border-radius:50%;animation:rzq-pulse 2s infinite}
@keyframes rzq-pulse{0%,100%{opacity:1}50%{opacity:.4}}
.rzq-mclose{background:none;border:none;color:rgba(255,255,255,.7);font-size:20px;cursor:pointer;padding:4px 8px;border-radius:8px;transition:.2s;line-height:1}
.rzq-mclose:hover{background:rgba(255,255,255,.12);color:#fff}
.rzq-ad-strip{background:#eef3fb;padding:8px 12px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(27,58,107,.12);flex-shrink:0}
.rzq-ad-icon{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#C9A84C,#e8c96a);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.rzq-ad-info{flex:1;min-width:0}
.rzq-ad-kicker{font-size:10px;font-weight:800;letter-spacing:.02em;color:#1B3A6B;margin-bottom:2px;text-transform:none}
.rzq-ad-name{font-size:13px;font-weight:800;color:#0f172a;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rzq-ad-note{font-size:11px;color:#475569;margin-top:2px;line-height:1.35}
.rzq-msgs{flex:1 1 auto;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px;min-height:48px;max-height:none;-webkit-overflow-scrolling:touch}
.rzq-msgs::-webkit-scrollbar{width:4px}.rzq-msgs::-webkit-scrollbar-track{background:transparent}.rzq-msgs::-webkit-scrollbar-thumb{background:rgba(27,58,107,.15);border-radius:4px}
.rzq-bubble{max-width:82%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.55;word-break:break-word;color:#0f172a}
.rzq-bubble.me{background:linear-gradient(135deg,#1B3A6B,#234d8f);color:#fff;align-self:flex-end;border-bottom-left-radius:3px}
.rzq-bubble.them{background:#fff;color:#0f172a;border:1px solid rgba(15,23,42,.1);align-self:flex-start;border-bottom-right-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
.rzq-bubble .rzq-ts{font-size:10px;opacity:.55;margin-top:4px;text-align:end}
.rzq-suggest{display:none;gap:6px;padding:4px 10px 6px;overflow-x:auto;flex-shrink:0}
.rzq-suggest.on{display:flex}
.rzq-suggest::-webkit-scrollbar{display:none}
.rzq-sq{padding:6px 10px;background:#fff;border:1.5px solid rgba(27,58,107,.15);border-radius:10px;font-size:12px;color:#1B3A6B;cursor:pointer;white-space:nowrap;font-family:inherit;transition:.2s;flex-shrink:0}
.rzq-sq:hover{border-color:#C9A84C;color:#C9A84C;background:rgba(201,168,76,.06)}
.rzq-typing{display:flex;align-items:center;gap:6px;padding:10px 14px;background:#fff;border-radius:16px;border-bottom-right-radius:3px;align-self:flex-start;border:1px solid rgba(0,0,0,.08);box-shadow:0 1px 4px rgba(0,0,0,.06);width:60px}
.rzq-typing span{width:7px;height:7px;background:#9ca3af;border-radius:50%;animation:rzq-blink 1.2s infinite}.rzq-typing span:nth-child(2){animation-delay:.2s}.rzq-typing span:nth-child(3){animation-delay:.4s}
@keyframes rzq-blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
.rzq-composer{flex-shrink:0;background:#fff;border-top:1px solid rgba(27,58,107,.12);box-shadow:0 -4px 16px rgba(15,35,65,.06);position:relative;z-index:3}
.rzq-inp-row{padding:8px 10px 6px;display:flex;gap:6px;align-items:flex-end}
.rzq-inp{flex:1;padding:10px 12px;border:1.5px solid rgba(27,58,107,.2);border-radius:16px;font-size:13.5px;font-family:inherit;resize:none;outline:none;max-height:72px;overflow-y:auto;background:#f8fafc;color:#0f172a;transition:.2s;box-sizing:border-box}
.rzq-inp:focus{border-color:#C9A84C;background:#fff}
.rzq-inp::placeholder{color:#64748b}
.rzq-tool{min-width:44px;height:40px;border-radius:12px;border:1.5px solid rgba(27,58,107,.18);background:#f1f5f9;color:#1B3A6B;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;gap:0;padding:2px 6px;font-family:inherit;transition:.2s;line-height:1.05}
.rzq-tool:hover{border-color:#C9A84C;background:rgba(201,168,76,.12)}
.rzq-tool .ico{font-size:14px}
.rzq-tool .lbl{font-size:9px;font-weight:800;color:#1B3A6B}
.rzq-send{min-width:48px;height:40px;border-radius:12px;background:linear-gradient(135deg,#C9A84C,#e8c96a);border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;transition:.2s;padding:2px 8px;gap:0;font-family:inherit}
.rzq-send:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(201,168,76,.45)}
.rzq-send svg{width:16px;height:16px;fill:#1B3A6B}
.rzq-send .lbl{font-size:9px;font-weight:800;color:#1B3A6B}
.rzq-footer{text-align:center;font-size:10px;color:#64748b;padding:2px 10px 8px;background:#fff;flex-shrink:0}
.rzq-footer strong{color:#1B3A6B}
.rzq-img-prev{display:none;padding:7px 10px;background:#fffbeb;border-top:1px solid #fde68a;flex-shrink:0;align-items:center;gap:8px}
.rzq-img-prev.on{display:flex}
.rzq-img-prev img{width:48px;height:48px;object-fit:cover;border-radius:10px;border:1px solid #f59e0b}
.rzq-img-prev-meta{flex:1;min-width:0;font-size:12px;font-weight:700;color:#92400e;line-height:1.35}
.rzq-img-prev-meta small{display:block;font-weight:600;color:#b45309;font-size:10.5px;margin-top:1px}
.rzq-img-prev-x{border:0;background:#fee2e2;color:#b91c1c;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:14px;flex-shrink:0}
.rzq-ad-strip.has-thumb .rzq-ad-icon{padding:0;overflow:hidden;background:#fff;border:1px solid rgba(27,58,107,.12)}
.rzq-ad-strip.has-thumb .rzq-ad-icon img{width:100%;height:100%;object-fit:cover;display:block}
.rzq-bubble img.rzq-bimg{display:block;max-width:min(220px,70vw);max-height:160px;border-radius:12px;margin:0 0 6px;object-fit:cover;border:1px solid rgba(0,0,0,.08)}
.rzq-cat-sheet{display:none;position:absolute;inset:auto 0 0 0;max-height:55%;background:#fff;border-radius:16px 16px 0 0;box-shadow:0 -8px 28px rgba(15,35,65,.2);z-index:5;flex-direction:column;overflow:hidden}
.rzq-cat-sheet.on{display:flex}
.rzq-cat-head{padding:10px 14px;font-weight:800;font-size:13px;color:#1B3A6B;border-bottom:1px solid rgba(0,0,0,.07);display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.rzq-cat-list{overflow-y:auto;padding:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;-webkit-overflow-scrolling:touch}
.rzq-cat-item{border:1px solid rgba(27,58,107,.12);border-radius:12px;padding:8px;background:#f8fafc;cursor:pointer;text-align:start;font-family:inherit}
.rzq-cat-item:hover{border-color:#C9A84C;background:rgba(201,168,76,.08)}
.rzq-cat-item img{width:100%;height:72px;object-fit:cover;border-radius:8px;background:#e2e8f0;display:block;margin-bottom:6px}
.rzq-cat-item .t{font-size:12px;font-weight:700;color:#1a2535;line-height:1.35}
.rzq-mbox{position:relative;max-height:min(82dvh,82vh)}
@media(max-width:560px){
  #rzq-messenger-modal{padding-bottom:max(12px,env(safe-area-inset-bottom,0px))}
  .rzq-mbox{width:calc(100% - 16px);max-width:100%;max-height:min(78dvh,78vh);margin:0 8px max(10px,env(safe-area-inset-bottom,0px));border-radius:16px}
  .rzq-mhead{padding:10px 12px;border-radius:16px 16px 0 0}
  .rzq-msgs{padding:8px 10px;min-height:40px}
  .rzq-inp-row{padding:7px 8px 5px}
  .rzq-footer{padding:1px 8px 7px}
  .rzq-mhead-sub{display:none}
}
@media(max-height:720px){
  .rzq-mbox{max-height:min(74dvh,74vh)}
  .rzq-suggest{display:none!important}
  .rzq-ad-note{display:none}
}
@supports not (height:1dvh){
  .rzq-mbox{max-height:82vh}
  @media(max-width:560px){.rzq-mbox{max-height:78vh}}
  @media(max-height:720px){.rzq-mbox{max-height:74vh}}
}
`;
    var el = document.createElement('style');
    el.id = 'rzq-messenger-css';
    el.setAttribute('data-v', '28.7');
    el.textContent = css;
    document.head.appendChild(el);
  }

  function _injectModal() {
    var existing = document.getElementById(MODAL_ID);
    /* إعادة بناء النافذة عند تحديث وضوح المعلومات */
    if (existing) {
      if (existing.getAttribute('data-v') === '28.7' && document.getElementById('rzq-m-adkicker') && !document.getElementById('rzq-m-namerow')) return;
      try { existing.parentNode.removeChild(existing); } catch (eRm) {}
    }
    var div = document.createElement('div');
    div.id = MODAL_ID;
    div.setAttribute('data-v', '28.7');
    div.innerHTML = `
<div class="rzq-mbox" role="dialog" aria-modal="true" aria-label="مراسلة البائع">
  <div class="rzq-mhead">
    <div class="rzq-mav" id="rzq-m-av">📦</div>
    <div class="rzq-mhead-info">
      <div class="rzq-mhead-name" id="rzq-m-name">البائع</div>
      <div class="rzq-mhead-status" id="rzq-m-status">متاح · يرد خلال دقائق</div>
      <div class="rzq-mhead-sub" id="rzq-m-sub">رزق — مراسلة آمنة</div>
    </div>
    <button class="rzq-mclose" onclick="RizqMessenger.close()" aria-label="إغلاق">✕</button>
  </div>

  <div class="rzq-ad-strip" id="rzq-m-adstrip">
    <div class="rzq-ad-icon" id="rzq-m-adicon">📦</div>
    <div class="rzq-ad-info">
      <div class="rzq-ad-kicker" id="rzq-m-adkicker">بخصوص</div>
      <div class="rzq-ad-name" id="rzq-m-adname">الإعلان</div>
      <div class="rzq-ad-note" id="rzq-m-adnote">اكتب سؤالك أدناه</div>
    </div>
  </div>

  <div class="rzq-msgs" id="rzq-m-msgs"></div>

  <div class="rzq-suggest" id="rzq-m-suggest">
    <button class="rzq-sq" onclick="RizqMessenger.quickSend(this.textContent)">هل المنتج متوفر؟</button>
    <button class="rzq-sq" onclick="RizqMessenger.quickSend(this.textContent)">ما هو السعر النهائي؟</button>
    <button class="rzq-sq" onclick="RizqMessenger.quickSend(this.textContent)">أريد الاستفسار</button>
    <button class="rzq-sq" onclick="RizqMessenger.quickSend(this.textContent)">هل يمكن التفاوض؟</button>
  </div>

  <!-- الاسم يُؤخذ من تسجيل المنصة؛ الهاتف يُطلب لاحقاً أو عبر نموذج الاستفسار — لا خانات هنا -->

  <div class="rzq-composer">
  <div class="rzq-img-prev" id="rzq-m-imgprev">
    <img id="rzq-m-imgprev-el" alt=""/>
    <div class="rzq-img-prev-meta" id="rzq-m-imgprev-meta"></div>
    <button type="button" class="rzq-img-prev-x" onclick="RizqMessenger.clearPendingImage()" aria-label="إزالة">✕</button>
  </div>

  <div class="rzq-inp-row">
    <button type="button" class="rzq-tool" id="rzq-m-catbtn" onclick="RizqMessenger.openCatalog()" aria-label="إشارة">
      <span class="ico">🏷️</span><span class="lbl" id="rzq-m-catlbl">إشارة</span>
    </button>
    <button type="button" class="rzq-tool" id="rzq-m-attach" onclick="RizqMessenger.pickImage()" aria-label="صورة">
      <span class="ico">📷</span><span class="lbl" id="rzq-m-attlbl">صورة</span>
    </button>
    <input type="file" id="rzq-m-file" accept="image/*" capture="environment" style="display:none" onchange="RizqMessenger.onFilePicked(this)"/>
    <textarea class="rzq-inp" id="rzq-m-inp" rows="1" placeholder="اكتب رسالتك هنا..." maxlength="500"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();RizqMessenger.send();}"
      oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,90)+'px'"></textarea>
    <button class="rzq-send" onclick="RizqMessenger.send()" aria-label="إرسال">
      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      <span class="lbl" id="rzq-m-sendlbl">إرسال</span>
    </button>
  </div>
  <div class="rzq-footer" id="rzq-m-footer">مدعوم بـ <strong>رزق AI</strong> · تواصل مباشر وآمن</div>
  </div>

  <div class="rzq-cat-sheet" id="rzq-m-catsheet" role="dialog" aria-label="اختيار من الكتالوج">
    <div class="rzq-cat-head">
      <span id="rzq-m-cathead">اختر عنصراً للإشارة</span>
      <button type="button" class="rzq-mclose" style="color:#64748b" onclick="RizqMessenger.closeCatalog()" aria-label="إغلاق">✕</button>
    </div>
    <div class="rzq-cat-list" id="rzq-m-catlist"></div>
  </div>
</div>`;
    div.addEventListener('click', function(e){ if(e.target === div) RizqMessenger.close(); });
    document.body.appendChild(div);
  }

  /* ══════════════════════════════
     المساعد الآلي — يرد إن لم يكن البائع متصلاً
  ══════════════════════════════ */
  var AUTO_REPLIES = {
    ar: [
      'شكراً على رسالتك! 🙏\nسيتواصل معك البائع قريباً. في المتوسط يردون خلال ساعة.',
      'تم استلام رسالتك بنجاح ✅\nسيطّلع عليها البائع ويرد في أقرب وقت.',
      'مرحباً! 😊\nرسالتك وصلت للبائع. سيردّ عليك قريباً إن شاء الله.',
    ],
    fr: [
      'Merci pour votre message ! 🙏\nLe vendeur vous contactera bientôt.',
      'Message reçu ✅\nLe vendeur le verra et répondra sous peu.',
    ]
  };

  function _autoReply() {
    _showTyping();
    setTimeout(function() {
      _hideTyping();
      var pool = AUTO_REPLIES[_state.lang] || AUTO_REPLIES.ar;
      var txt  = pool[Math.floor(Math.random() * pool.length)];
      _appendBubble(txt, 'them');
    }, AGENT_DELAY_MS);
  }

  /** عرض رسالة خادم جديدة (بائع أو وكيل ذكي) دون تكرار */
  function _ingestServerMessages(list) {
    if (!Array.isArray(list) || !list.length) return 0;
    var added = 0;
    list.forEach(function(m) {
      if (!m || !m.id) return;
      if (_state.seenServerIds[m.id]) return;
      _state.seenServerIds[m.id] = true;
      if (m.fromRole === 'buyer') return; // المشتري يرى رسائله محلياً فور الإرسال
      _appendBubble(m.body, 'them');
      added++;
    });
    return added;
  }

  function _showTyping() {
    var msgs = document.getElementById('rzq-m-msgs');
    if (!msgs) return;
    var d = document.createElement('div');
    d.className = 'rzq-typing';
    d.id = 'rzq-typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(d);
    _scrollBottom();
  }

  function _hideTyping() {
    var el = document.getElementById('rzq-typing');
    if (el) el.parentNode.removeChild(el);
  }

  /* ══════════════════════════════
     عرض الرسائل
  ══════════════════════════════ */
  function _appendBubble(text, side, imageUrl) {
    var msgs = document.getElementById('rzq-m-msgs');
    if (!msgs) return;
    var d = document.createElement('div');
    d.className = 'rzq-bubble ' + side;
    var html = '';
    if (imageUrl) {
      html += '<img class="rzq-bimg" src="' + _esc(imageUrl) + '" alt=""/>';
    }
    if (text) html += _esc(text).replace(/\n/g,'<br>');
    html += '<div class="rzq-ts">' + _tsDisplay() + '</div>';
    d.innerHTML = html;
    msgs.appendChild(d);
    _scrollBottom();
  }

  function _scrollBottom() {
    var el = document.getElementById('rzq-m-msgs');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function _renderPrevMsgs() {
    var msgs = _loadMsgs(_state.sellerKey);
    var mine = msgs.filter(function(m){ return m.visitorId === _state.visitorId && m.adId === _state.adId; });
    mine.forEach(function(m){
      _appendBubble(m.text, 'me', m.image || '');
    });
  }

  function _setPendingImage(dataUrl, label) {
    _state.pendingImage = dataUrl || '';
    _state.pendingImageName = label || '';
    var row = document.getElementById('rzq-m-imgprev');
    var img = document.getElementById('rzq-m-imgprev-el');
    var meta = document.getElementById('rzq-m-imgprev-meta');
    if (!row || !img) return;
    if (!_state.pendingImage) {
      row.classList.remove('on');
      img.removeAttribute('src');
      if (meta) meta.textContent = '';
      return;
    }
    img.src = _state.pendingImage;
    if (meta) {
      meta.innerHTML = '<span>' + _esc(_t('صورة ستُرسل مع الرسالة', 'Photo qui sera envoyée')) + '</span>'
        + (_state.pendingImageName ? ('<small>' + _esc(_state.pendingImageName) + '</small>') : '');
    }
    row.classList.add('on');
  }

  function _paintAdStripImage() {
    var strip = document.getElementById('rzq-m-adstrip');
    var icon = document.getElementById('rzq-m-adicon');
    if (!strip || !icon) return;
    if (_state.adImage) {
      strip.classList.add('has-thumb');
      icon.innerHTML = '<img src="' + _esc(_state.adImage) + '" alt=""/>';
    } else {
      strip.classList.remove('has-thumb');
      icon.textContent = _state.adEmoji || '📦';
    }
  }

  /** ضغط صورة قبل الإرفاق (حد حجم معقول للمحادثة) */
  function _compressImageFile(file, cb) {
    if (!file || !/^image\//i.test(file.type || '')) {
      cb(null, _t('اختر صورة صالحة', 'Choisissez une image valide'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      cb(null, _t('الصورة كبيرة جداً (الحد 8MB)', 'Image trop lourde (max 8 Mo)'));
      return;
    }
    var reader = new FileReader();
    reader.onerror = function(){ cb(null, _t('تعذّر قراءة الصورة', 'Lecture de l\'image impossible')); };
    reader.onload = function(){
      var src = String(reader.result || '');
      var im = new Image();
      im.onload = function(){
        try {
          var maxW = 960;
          var w = im.width || maxW;
          var h = im.height || maxW;
          var scale = w > maxW ? (maxW / w) : 1;
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement('canvas');
          canvas.width = cw; canvas.height = ch;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(im, 0, 0, cw, ch);
          var quality = 0.72;
          var out = canvas.toDataURL('image/jpeg', quality);
          while (out.length > MAX_CHAT_IMAGE_BYTES && quality > 0.4) {
            quality -= 0.1;
            out = canvas.toDataURL('image/jpeg', quality);
          }
          if (out.length > MAX_CHAT_IMAGE_BYTES * 1.35) {
            cb(null, _t('تعذّر ضغط الصورة بما يكفي', 'Impossible de compresser assez l\'image'));
            return;
          }
          cb(out, null);
        } catch (eC) {
          cb(src.length < MAX_CHAT_IMAGE_BYTES * 1.5 ? src : null,
            src.length < MAX_CHAT_IMAGE_BYTES * 1.5 ? null : _t('الصورة كبيرة جداً', 'Image trop lourde'));
        }
      };
      im.onerror = function(){ cb(null, _t('تعذّر تحميل الصورة', 'Chargement de l\'image impossible')); };
      im.src = src;
    };
    reader.readAsDataURL(file);
  }

  function _catalogLabel() {
    var ctx = _state.context || 'ad';
    if (ctx === 'store' || ctx === 'shop') return _t('اختر منتجاً من المحل', 'Choisir un produit');
    if (ctx === 'showroom' || ctx === 'corp') return _t('اختر عرضاً من المعرض', 'Choisir un article');
    if (ctx === 'estate' || ctx === 'agency') return _t('اختر عقاراً للإشارة', 'Choisir un bien');
    if (ctx === 'office') return _t('اختر خدمة للإشارة', 'Choisir un service');
    return _t('اختر عنصراً للإشارة', 'Choisir un élément');
  }

  /** جمع عناصر الكتالوج حسب نوع الصفحة (محل/معرض/عقارات/مكتب) */
  function _collectCatalogItems() {
    if (Array.isArray(_state.catalogItems) && _state.catalogItems.length) return _state.catalogItems.slice(0, 40);
    var out = [];
    var ctx = _state.context || '';
    function pushItem(it) {
      if (!it) return;
      var title = it.title || it.name || it.nameAr || it.nameF || '';
      if (!title) return;
      var img = it.image || it.img || it.imgData || (it.imgDataArr && it.imgDataArr[0])
        || (it.images && it.images[0]) || (it.media && it.media.cover) || '';
      out.push({
        id: String(it.id || title),
        title: String(title),
        image: img ? String(img) : '',
        emoji: it.emoji || _state.adEmoji || '📦',
        price: it.price || ''
      });
    }
    try {
      if (ctx === 'store' || ctx === 'shop' || !ctx) {
        var feat = window.STORE_FEATURED_PRODUCTS;
        if (feat && typeof feat === 'object') {
          Object.keys(feat).forEach(function(k){ pushItem(feat[k]); });
        }
        var sid = _state.sellerAccountId || _state.sellerKey || '';
        if (sid) {
          var prods = JSON.parse(localStorage.getItem('store_products_' + sid) || '[]');
          if (Array.isArray(prods)) prods.forEach(pushItem);
        }
      }
      if (ctx === 'showroom' || ctx === 'corp') {
        if (Array.isArray(window._allItems)) window._allItems.forEach(pushItem);
      }
      if (ctx === 'estate' || ctx === 'agency') {
        var drafts = JSON.parse(localStorage.getItem('rizq_estate_drafts') || '[]');
        if (Array.isArray(drafts)) drafts.forEach(function(d){
          pushItem({
            id: d.id, title: d.title, price: d.price, emoji: '🏠',
            image: (d.media && d.media.cover) || d.cover || ''
          });
        });
        if (window.RizqEstateData && Array.isArray(RizqEstateData.LISTINGS)) {
          RizqEstateData.LISTINGS.slice(0, 20).forEach(function(d){
            pushItem({
              id: d.id, title: d.title, price: d.price, emoji: '🏠',
              image: (d.media && d.media.cover) || d.cover || d.img || ''
            });
          });
        }
      }
      if (ctx === 'office') {
        var services = window._rizqOfficeServices || window.OFFICE_SERVICES || [];
        if (Array.isArray(services)) services.forEach(function(s){
          pushItem({ id: s.id, title: s.name || s.title, emoji: s.emoji || '📂', image: s.image || '' });
        });
      }
    } catch (eCat) {}
    /* إزالة التكرار */
    var seen = {};
    return out.filter(function(x){
      var k = x.id + '|' + x.title;
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    }).slice(0, 36);
  }

  /* ══════════════════════════════
     ضبط اللغة داخل الـ Modal
  ══════════════════════════════ */
  function _applyLang() {
    var isFr = _state.lang === 'fr';
    var el = document.getElementById(MODAL_ID);
    if (!el) return;
    el.dir = isFr ? 'ltr' : 'rtl';

    _setTxt('rzq-m-status', isFr ? 'Disponible · répond en quelques minutes' : 'متاح · يرد خلال دقائق');
    _setTxt('rzq-m-sub', isFr ? 'Rizq — Messagerie sécurisée' : 'رزق — مراسلة آمنة');
    var ctx = (_state.context || 'ad');
    var noteAr = 'استفسار عن هذا الإعلان';
    var noteFr = 'Demande concernant cette annonce';
    var kickerAr = 'بخصوص';
    var kickerFr = 'Concernant';
    if (ctx === 'store' || ctx === 'shop') {
      noteAr = 'اكتب سؤالك أو أرفق صورة للمنتج';
      noteFr = 'Écrivez votre question ou joignez une photo';
      kickerAr = 'بخصوص المنتج';
      kickerFr = 'Produit';
    } else if (ctx === 'showroom' || ctx === 'corp') {
      noteAr = 'اكتب سؤالك أو أرفق صورة للعرض';
      noteFr = 'Écrivez votre question ou joignez une photo';
      kickerAr = 'بخصوص العرض';
      kickerFr = 'Article';
    } else if (ctx === 'office') {
      noteAr = 'اكتب طلبك أو أرفق صورة للمستند';
      noteFr = 'Décrivez votre demande ou joignez une photo';
      kickerAr = 'بخصوص الخدمة';
      kickerFr = 'Service';
    } else if (ctx === 'estate' || ctx === 'agency') {
      noteAr = 'اكتب سؤالك عن هذا العقار';
      noteFr = 'Posez votre question sur ce bien';
      kickerAr = 'بخصوص العقار';
      kickerFr = 'Bien immobilier';
    } else {
      noteAr = 'اكتب سؤالك أدناه';
      noteFr = 'Écrivez votre question ci-dessous';
    }
    _setTxt('rzq-m-adkicker', isFr ? kickerFr : kickerAr);
    _setTxt('rzq-m-adnote', isFr ? noteFr : noteAr);
    var catHead = document.getElementById('rzq-m-cathead');
    if (catHead) catHead.textContent = _catalogLabel();
    var catLbl = document.getElementById('rzq-m-catlbl');
    if (catLbl) catLbl.textContent = isFr ? 'Réf.' : 'إشارة';
    var attLbl = document.getElementById('rzq-m-attlbl');
    if (attLbl) attLbl.textContent = isFr ? 'Photo' : 'صورة';
    var sendLbl = document.getElementById('rzq-m-sendlbl');
    if (sendLbl) sendLbl.textContent = isFr ? 'Envoyer' : 'إرسال';
    var catBtn = document.getElementById('rzq-m-catbtn');
    if (catBtn) {
      var hasCat = _collectCatalogItems().length > 0;
      catBtn.style.display = hasCat ? '' : 'none';
      catBtn.title = _catalogLabel();
    }
    /* الاقتراحات السريعة اختيارية — تُظهر فقط إن اتسع المكان */
    var sug = document.getElementById('rzq-m-suggest');
    if (sug) {
      var tallEnough = (typeof window !== 'undefined' && window.innerHeight > 740);
      sug.classList.toggle('on', !!tallEnough);
    }
    _setAttr('rzq-m-inp', 'placeholder', isFr ? 'Écrivez votre message…' : 'اكتب رسالتك هنا…');
    _setTxt('rzq-m-footer', isFr ? 'Propulsé par <strong>Rizq AI</strong> · Contact direct et sécurisé' : 'مدعوم بـ <strong>رزق AI</strong> · تواصل مباشر وآمن');

    var sq = document.querySelectorAll('.rzq-sq');
    var pack = SUGGESTIONS_BY_CAT[_resolveCategoryKey(_state.category)];
    var suggestions = isFr ? pack.fr : pack.ar;
    sq.forEach(function(b, i){ if(suggestions[i]) b.textContent = suggestions[i]; });
  }

  function _setTxt(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
  function _setAttr(id, attr, val) {
    var el = document.getElementById(id);
    if (el) el.setAttribute(attr, val);
  }

  /* ══════════════════════════════
     الاتصال الحقيقي بالخادم (rizq-backend) — مهمة #243/#247
     صامت الفشل دائماً: أي خطأ شبكة لا يوقف تجربة المستخدم المحلية.
  ══════════════════════════════ */
  function _backendBase() {
    return (typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE)
      ? window.RIZQ_BACKEND_BASE.replace(/\/$/, '') : null;
  }

  /* إصلاح جوهري: _state.buyerToken يأتي من rizq_individual_session، وهو
     dashToken محلي (نفس TK_... المستخدم فقط في verify-dash) — وليس
     accessToken الحقيقي الذي يتحقق منه verifyAccountOwner() في كل من
     POST /api/messages (buyerAccountId) وGET /api/messages/thread/:key.
     كان هذا يُفشِل بصمت (401) كل محادثة حقيقية لمشترٍ مسجَّل دخوله — رسالته
     لا تصل للبائع إطلاقاً، ومحادثته السابقة لا تُحمَّل عند إعادة الفتح.
     نفس نمط الحل المطبَّق في كل لوحات التحكم: تبديل dashToken بـ
     accessToken الحقيقي عبر verify-dash، مع تخزين مؤقت في _state لتفادي
     طلب شبكة إضافي بكل رسالة. */
  function _resolveBuyerRealToken() {
    if (_state.buyerRealToken) return Promise.resolve(_state.buyerRealToken);
    var base = _backendBase();
    if (!base || !_state.buyerAccountId || !_state.buyerToken) return Promise.resolve(null);
    try {
      var accs = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      var rec = accs.find(function(a){ return a.id === _state.buyerAccountId; });
      if (rec && (rec.backendAccessToken || rec.accessToken)) {
        _state.buyerRealToken = rec.backendAccessToken || rec.accessToken;
        return Promise.resolve(_state.buyerRealToken);
      }
    } catch(e) {}
    return fetch(base + '/api/accounts/exchange-dash-token/' + encodeURIComponent(_state.buyerAccountId), { method:'POST', headers:{'Content-Type':'application/json','x-dash-token':_state.buyerToken}, body:JSON.stringify({dashToken:_state.buyerToken}) })
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(data){
        if (!data || !data.ok || !data.accessToken) return null;
        _state.buyerRealToken = data.accessToken;
        if (data.dashToken) _state.buyerToken = data.dashToken;
        try {
          var accs2 = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
          var rec2 = accs2.find(function(a){ return a.id === _state.buyerAccountId; });
          if (rec2) {
            rec2.backendAccessToken = _state.buyerRealToken;
            if (data.dashToken) { rec2.token = data.dashToken; rec2.dashToken = data.dashToken; }
            localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs2));
          }
        } catch(e) {}
        return _state.buyerRealToken;
      }).catch(function(){ return null; });
  }

  function _sendToBackend(text, name, phone) {
    try {
      var base = _backendBase();
      if (!base || !_state.sellerAccountId) return Promise.resolve(null);
      _state.buyerPhone = phone || _state.buyerPhone || '';
      var doSend = function(realTok){
        var payload = {
          sellerAccountId: _state.sellerAccountId,
          body: text,
          adId: _state.adId !== 'g' ? _state.adId : undefined,
          adTitle: _state.adTitle || undefined
        };
        var headers = { 'Content-Type': 'application/json' };
        if (_state.buyerAccountId && _state.buyerToken) {
          payload.buyerAccountId = _state.buyerAccountId;
          payload.buyerName = name;
          headers['x-account-token'] = realTok || _state.buyerToken;
        } else {
          payload.buyerPhone = phone || '';
          payload.buyerName = name;
          var gTokSend = _state.guestThreadToken || '';
          if (!gTokSend) {
            var tokKeys = [];
            if (_state.threadKey) tokKeys.push(_state.threadKey);
            var phDigits = String(phone || _state.buyerPhone || '').replace(/\D/g, '');
            if (_state.sellerAccountId && phDigits) {
              tokKeys.push(_state.sellerAccountId + '::guest:' + phDigits);
            }
            for (var ti = 0; ti < tokKeys.length && !gTokSend; ti++) {
              try { gTokSend = sessionStorage.getItem('rzq_guest_tok_' + tokKeys[ti]) || ''; } catch (eTokR) {}
            }
          }
          if (gTokSend) {
            payload.guestThreadToken = gTokSend;
            headers['x-guest-thread-token'] = gTokSend;
          }
        }
        return fetch(base + '/api/messages', {
          method: 'POST', headers: headers, body: JSON.stringify(payload)
        }).then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
          if (data && data.message && data.message.threadKey) _state.threadKey = data.message.threadKey;
          else if (data && data.threadKey) _state.threadKey = data.threadKey;
          if (data && data.message && data.message.id) _state.seenServerIds[data.message.id] = true;
          if (data && data.guestThreadToken) {
            _state.guestThreadToken = data.guestThreadToken;
            try { sessionStorage.setItem('rzq_guest_tok_' + _state.threadKey, data.guestThreadToken); } catch (eTok) {}
          }
          return data;
        });
      };
      if (_state.buyerAccountId && _state.buyerToken) {
        return _resolveBuyerRealToken().then(doSend).catch(function(){ return null; });
      }
      return doSend(null).catch(function(){ return null; });
    } catch(e) { return Promise.resolve(null); }
  }

  /** جلب المحادثة الحقيقية من الخادم (مشترٍ مسجّل أو ضيف برقم هاتف) */
  function _fetchThreadOnce() {
    var base = _backendBase();
    if (!base || !_state.threadKey) return Promise.resolve(null);
    var url = base + '/api/messages/thread/' + encodeURIComponent(_state.threadKey);
    var headers = {};
    if (_state.buyerAccountId && _state.buyerToken) {
      return _resolveBuyerRealToken().then(function(realTok){
        headers['x-account-token'] = realTok || _state.buyerToken;
        return fetch(url, { headers: headers, cache: 'no-store' })
          .then(function(r){ return r.ok ? r.json() : null; });
      }).catch(function(){ return null; });
    }
    var phone = String(_state.buyerPhone || '').replace(/\D/g, '');
    var gTok = _state.guestThreadToken || '';
    if (!gTok) {
      try { gTok = sessionStorage.getItem('rzq_guest_tok_' + _state.threadKey) || ''; } catch (eG) {}
      if (gTok) _state.guestThreadToken = gTok;
    }
    if (phone) {
      url += (url.indexOf('?') >= 0 ? '&' : '?') + 'buyerPhone=' + encodeURIComponent(phone);
      headers['x-guest-phone'] = phone;
    }
    if (gTok) {
      url += (url.indexOf('?') >= 0 ? '&' : '?') + 'guestThreadToken=' + encodeURIComponent(gTok);
      headers['x-guest-thread-token'] = gTok;
    }
    return fetch(url, { headers: headers, cache: 'no-store' })
      .then(function(r){ return r.ok ? r.json() : null; })
      .catch(function(){ return null; });
  }

  function _loadThreadFromBackend() {
    try {
      _fetchThreadOnce().then(function(data){
        if (!data || !Array.isArray(data.messages) || !data.messages.length) return;
        var msgsEl = document.getElementById('rzq-m-msgs');
        if (msgsEl) msgsEl.innerHTML = '';
        _state.seenServerIds = {};
        data.messages.forEach(function(m){
          if (!m || !m.id) return;
          _state.seenServerIds[m.id] = true;
          _appendBubble(m.body, m.fromRole === 'buyer' ? 'me' : 'them');
        });
        var sq = document.getElementById('rzq-m-suggest');
        if (sq) sq.style.display = 'none';
      });
    } catch(e) {}
  }

  /** بعد الإرسال: انتظر رد الوكيل/البائع بسرعة بدل الرسالة الوهمية */
  function _startReplyPoll() {
    _stopPoll();
    if (!_backendBase() || !_state.sellerAccountId || !_state.threadKey) return;
    _showTyping();
    _state.pollAttempts = 0;
    _state.pollTimer = setInterval(function() {
      if (!_state.open) { _stopPoll(); _hideTyping(); return; }
      _state.pollAttempts += 1;
      if (_state.pollAttempts > 20) {
        _stopPoll();
        _hideTyping();
        // لم يصل رد خلال ~30ث — رسالة قصيرة صادقة بدل canned عشوائي مزيف
        _appendBubble(_t(
          'رسالتك وصلت للبائع ✅ — سيرد عليك قريباً.',
          'Message reçu ✅ — le vendeur répondra bientôt.'
        ), 'them');
        return;
      }
      _fetchThreadOnce().then(function(data){
        if (!data || !Array.isArray(data.messages)) return;
        var added = _ingestServerMessages(data.messages);
        if (added > 0) {
          _stopPoll();
          _hideTyping();
        }
      });
    }, 1500);
  }

  /* ══════════════════════════════
     الواجهة العامة — RizqMessenger
  ══════════════════════════════ */
  var RizqMessenger = {

    /**
     * open(opts) — يفتح نافذة المراسلة
     * opts: { sellerKey?, sellerName?, adTitle?, adId?, adEmoji?, lang? }
     */
    open: function(opts) {
      opts = opts || {};
      _state.lang            = opts.lang || _getLang();
      _state.sellerKey       = opts.sellerKey   || 'demo';
      _state.sellerAccountId = opts.sellerAccountId || '';
      _state.sellerName      = opts.sellerName  || _t('البائع', 'Le vendeur');
      _state.adTitle         = opts.adTitle     || '';
      _state.adId            = String(opts.adId || 'g');
      _state.adEmoji         = opts.adEmoji     || '📦';
      _state.adImage         = opts.adImage || opts.productImage || opts.image || '';
      _state.category        = opts.category    || ''; // فئة الإعلان — لاختيار أسئلة سريعة سياقية
      /* store|showroom|office|estate|ad — يحدد نص الشريط (منتج vs إعلان) */
      _state.context         = String(opts.context || opts.module || 'ad').toLowerCase();
      _state.catalogItems    = Array.isArray(opts.catalogItems) ? opts.catalogItems : null;
      _state.pendingImage    = '';
      _state.pendingImageName = '';
      _state.visitorId       = _getVisitorId();
      _state.visitorName     = '';
      _state.threadKey       = null;
      _state.buyerPhone      = '';
      _state.seenServerIds   = {};
      _stopPoll();

      var buyer = _getBuyerSession();
      _state.buyerAccountId = buyer ? buyer.id : null;
      _state.buyerToken     = buyer ? buyer.token : null;
      _state.authGateBuyer  = _getAuthGateBuyer();
      if (_state.authGateBuyer && !_state.buyerAccountId) {
        _state.visitorName = _state.authGateBuyer.name || '';
      }

      _injectStyles();
      _injectModal();
      _applyLang();

      // بيانات الإعلان في الرأس
      _setTxt('rzq-m-av',   _state.adEmoji);
      _setTxt('rzq-m-name', _esc(_state.sellerName));
      _setTxt('rzq-m-adname', _esc(_state.adTitle || _state.sellerName));
      _paintAdStripImage();
      _setPendingImage('', '');
      RizqMessenger.closeCatalog();

      // إخفاء/إظهار قسم الإعلان
      var strip = document.getElementById('rzq-m-adstrip');
      if (strip) strip.style.display = (_state.adTitle || _state.adImage) ? 'flex' : 'none';

      /* لا خانات اسم/هاتف في النافذة — الهوية من تسجيل المنصة */
      var profile = _resolveVisitorProfile();
      if (profile.name) _state.visitorName = profile.name;
      if (profile.phone) _state.buyerPhone = profile.phone;

      // مسح الرسائل السابقة وإعادة تحميلها
      var msgsEl = document.getElementById('rzq-m-msgs');
      if (msgsEl) msgsEl.innerHTML = '';

      var _hasRealBackend = typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE && _state.sellerAccountId;

      if (_hasRealBackend) {
        // نحدّد مفتاح المحادثة الحقيقي فوراً إن كان المشتري مسجَّلاً (لجلب الرد السابق من البائع)
        if (_state.buyerAccountId) {
          _state.threadKey = _state.sellerAccountId + '::acc:' + _state.buyerAccountId;
          _loadThreadFromBackend();
        } else {
          _renderPrevMsgs(); // زائر ضيف: نعرض ما حُفظ محلياً فقط (لا يوجد threadKey ثابت قبل أول رسالة)
        }
      } else {
        _renderPrevMsgs();
      }

      // رسالة ترحيب قصيرة — تظهر باسم الزبون إن وُجد من التسجيل
      if (!document.querySelector('#rzq-m-msgs .rzq-bubble')) {
        var about = _state.adTitle
          ? (_t('بخصوص: ', 'Concernant : ') + _state.adTitle + '\n')
          : '';
        var who = _state.visitorName
          ? (_t('مرحباً ', 'Bonjour ') + _state.visitorName + ' — ')
          : _t('مرحباً — ', 'Bonjour — ');
        var greet = _t(
          about + who + 'اكتب سؤالك لـ«' + _state.sellerName + '».',
          about + who + 'écrivez votre question à «' + _state.sellerName + '».'
        );
        _appendBubble(greet, 'them');
      }

      // فتح الـ Modal
      var modal = document.getElementById(MODAL_ID);
      modal.style.display = 'flex';
      setTimeout(function(){ modal.classList.add('rzq-open'); }, 10);
      _state.open = true;

      // تركيز على حقل الإدخال
      setTimeout(function(){
        var inp = document.getElementById('rzq-m-inp');
        if (inp) inp.focus();
      }, 400);
    },

    pickImage: function() {
      var f = document.getElementById('rzq-m-file');
      if (f) { f.value = ''; f.click(); }
    },
    onFilePicked: function(input) {
      var file = input && input.files && input.files[0];
      if (!file) return;
      _compressImageFile(file, function(dataUrl, err){
        if (!dataUrl) {
          _appendBubble(err || _t('تعذّر إرفاق الصورة', 'Impossible de joindre l\'image'), 'them');
          return;
        }
        _setPendingImage(dataUrl, file.name || _t('صورة مرفوعة', 'Photo jointe'));
      });
    },
    clearPendingImage: function() {
      _setPendingImage('', '');
      var f = document.getElementById('rzq-m-file');
      if (f) f.value = '';
    },
    openCatalog: function() {
      var items = _collectCatalogItems();
      var sheet = document.getElementById('rzq-m-catsheet');
      var list = document.getElementById('rzq-m-catlist');
      var head = document.getElementById('rzq-m-cathead');
      if (!sheet || !list) return;
      if (head) head.textContent = _catalogLabel();
      if (!items.length) {
        _appendBubble(_t('لا عناصر متاحة للإشارة حالياً — يمكنك رفع صورة.', 'Aucun élément à indiquer — joignez une photo.'), 'them');
        return;
      }
      list.innerHTML = items.map(function(it, idx){
        var img = it.image
          ? '<img src="' + _esc(it.image) + '" alt=""/>'
          : '<div style="height:72px;border-radius:8px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:6px">' + _esc(it.emoji || '📦') + '</div>';
        var price = it.price ? (' · ' + _esc(String(it.price))) : '';
        return '<button type="button" class="rzq-cat-item" data-idx="' + idx + '">' + img + '<div class="t">' + _esc(it.title) + price + '</div></button>';
      }).join('');
      list.querySelectorAll('.rzq-cat-item').forEach(function(btn){
        btn.addEventListener('click', function(){
          var it = items[Number(btn.getAttribute('data-idx'))];
          if (!it) return;
          _state.adTitle = it.title;
          _state.adId = String(it.id || _state.adId);
          _state.adEmoji = it.emoji || _state.adEmoji;
          /* الإشارة تظهر في شريط «بخصوص» فقط — بدون تكرار في معاينة الصورة */
          _state.adImage = it.image || '';
          RizqMessenger.clearPendingImage();
          _setTxt('rzq-m-adname', _esc(it.title));
          _paintAdStripImage();
          var strip = document.getElementById('rzq-m-adstrip');
          if (strip) strip.style.display = 'flex';
          var note = document.getElementById('rzq-m-adnote');
          if (note) note.textContent = _t('تم اختيار هذا العنصر — اكتب سؤالك', 'Élément sélectionné — écrivez votre question');
          RizqMessenger.closeCatalog();
        });
      });
      sheet.classList.add('on');
    },
    closeCatalog: function() {
      var sheet = document.getElementById('rzq-m-catsheet');
      if (sheet) sheet.classList.remove('on');
    },

    /** إرسال رسالة */
    send: function() {
      var inp = document.getElementById('rzq-m-inp');
      if (!inp) return;

      var text = inp.value.trim();
      var imageUrl = _state.pendingImage || '';
      if (!text && !imageUrl) return;
      if (!text && imageUrl) {
        text = _state.pendingImageName
          ? (_t('استفسار بخصوص: ', 'Demande concernant : ') + _state.pendingImageName)
          : _t('استفسار مع صورة مرفقة', 'Demande avec photo jointe');
      }

      /* الهوية من تسجيل المنصة — بلا خانات في النافذة */
      var profile = _resolveVisitorProfile();
      var name = profile.name || _state.visitorName || '';
      if (!name) name = _t('زائر', 'Visiteur') + ' ' + _state.visitorId;
      _state.visitorName = name;
      var phone = profile.phone || _state.buyerPhone || '';

      // عرض الرسالة (مع الصورة إن وُجدت)
      _appendBubble(text, 'me', imageUrl);
      inp.value = '';
      inp.style.height = 'auto';
      var sentImage = imageUrl;
      RizqMessenger.clearPendingImage();

      // إخفاء الاقتراحات بعد أول رسالة
      var sq = document.getElementById('rzq-m-suggest');
      if (sq) sq.style.display = 'none';

      // نص يُرسل للخادم: إشارة للصورة إن لم يكن الرابط عاماً (dataURL محلي)
      var backendText = text;
      if (sentImage) {
        if (/^https?:\/\//i.test(sentImage)) {
          backendText = text + '\n' + _t('[صورة]: ', '[Image]: ') + sentImage;
        } else {
          backendText = text + '\n' + _t('[مرفق صورة للاستفسار — تظهر عند البائع في المحادثة]', '[Photo jointe — visible chez le vendeur]');
        }
        if (_state.adTitle) {
          backendText = _t('بخصوص: ', 'Concernant : ') + _state.adTitle + '\n' + backendText;
        }
      }

      // حفظ الرسالة محلياً (احتياط/عرض فوري) لداشبورد البائع القديم
      var msgs = _loadMsgs(_state.sellerKey);
      msgs.push({
        name:       name,
        text:       text,
        image:      sentImage || '',
        phone:      phone,
        time:       _ts(),
        read:       false,
        adTitle:    _state.adTitle,
        adId:       _state.adId,
        visitorId:  _state.visitorId
      });
      _saveMsgs(_state.sellerKey, msgs);

      // تحديث badge الداشبورد
      _updateBadge(_state.sellerKey, msgs);

      // توست نجاح قصير بعد إرسال الرسالة
      try {
        var toastMsg = _t('✅ تم إرسال رسالتك', '✅ Message envoyé');
        if (typeof global.showToast === 'function') {
          global.showToast(toastMsg, 'success');
        } else {
          var tEl = document.getElementById('rizq-toast');
          if (!tEl) {
            tEl = document.createElement('div');
            tEl.id = 'rizq-toast';
            tEl.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(20px);background:linear-gradient(135deg,#1a2f52,#0d1f3c);border:1px solid rgba(16,185,129,.55);color:#fff;padding:13px 22px;border-radius:12px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 12px 32px rgba(0,0,0,.4);opacity:0;transition:opacity .3s,transform .3s;pointer-events:none;max-width:90vw;text-align:center';
            document.body.appendChild(tEl);
          }
          tEl.textContent = toastMsg;
          tEl.style.opacity = '1';
          tEl.style.transform = 'translateX(-50%) translateY(0)';
          clearTimeout(tEl._hideTimer);
          tEl._hideTimer = setTimeout(function(){
            tEl.style.opacity = '0';
            tEl.style.transform = 'translateX(-50%) translateY(20px)';
          }, 2600);
        }
      } catch (eToast) {}

      // إرسال حقيقي للخادم — نظام الرسائل بين المشتري والبائع (مهمة #243/#247)
      var hasBackend = !!(typeof window.RIZQ_BACKEND_BASE === 'string' && window.RIZQ_BACKEND_BASE && _state.sellerAccountId);
      if (hasBackend) {
        // لا نعرض رداً وهمياً — ننتظر رد الوكيل/البائع الحي من الخادم
        _sendToBackend(backendText, name, phone).then(function(data){
          if (data && (_state.threadKey || (data.message && data.message.threadKey))) {
            _startReplyPoll();
          } else {
            _autoReply();
          }
        });
      } else {
        _autoReply();
      }
    },

    /** إرسال سريع من الاقتراحات */
    quickSend: function(text) {
      var inp = document.getElementById('rzq-m-inp');
      if (inp) inp.value = text;
      this.send();
    },

    /** إغلاق النافذة */
    close: function() {
      _stopPoll();
      _hideTyping();
      var modal = document.getElementById(MODAL_ID);
      if (!modal) return;
      modal.classList.remove('rzq-open');
      setTimeout(function(){ modal.style.display = 'none'; }, 320);
      _state.open = false;
    },

    /** isOpen */
    isOpen: function() { return _state.open; }
  };

  /** تحديث badge الإشعار في الداشبورد (إن كانت الصفحة هي الداشبورد) */
  function _updateBadge(key, msgs) {
    var unread = msgs.filter(function(m){ return !m.read; }).length;
    var badge = document.getElementById('msg-badge');
    var notif = document.getElementById('notif-count');
    if (badge) { badge.textContent = unread; badge.style.display = unread ? 'flex' : 'none'; }
    if (notif) { notif.textContent = unread; }
  }

  /* ══════════════════════════════
     openChat() العالمية
     (تعمل تلقائياً مع rizq_listing.html)
  ══════════════════════════════ */
  global.openChat = function(adOverride) {
    var ad = adOverride || global._currentAd || null;
    var img = '';
    if (ad) {
      img = ad.adImage || ad.image || ad.img || ad.cover
        || (ad.images && ad.images[0]) || (ad.imgDataArr && ad.imgDataArr[0]) || ad.imgData || '';
    }
    RizqMessenger.open({
      sellerKey:  _deriveSellerKey(ad),
      sellerAccountId: (ad && ad.accountId) ? String(ad.accountId) : (global._pageAccountId || ''),
      sellerName: (ad && ad.seller) ? ad.seller : (global._pageSellerName || 'البائع'),
      adTitle:    (ad && (ad.title_ar || ad.title)) || global._pageTitle || document.title || '',
      adId:       (ad && ad.id) ? String(ad.id) : 'g',
      adEmoji:    (ad && ad.emoji) ? ad.emoji : (global._pageEmoji || '📦'),
      adImage:    img,
      category:   (ad && (ad.cat || ad.category)) ? String(ad.cat || ad.category) : (global._pageCategory || ''),
      context:    (ad && (ad.context || ad.module)) || global._pageModule || global._pageCategory || 'ad',
      module:     (ad && (ad.module || ad.context)) || global._pageModule || global._pageCategory || 'ad',
      lang:       typeof _getLang === 'function' ? _getLang() : 'ar'
    });
  };

  /* ══════════════════════════════
     تصدير
  ══════════════════════════════ */
  global.RizqMessenger = RizqMessenger;

})(typeof window !== 'undefined' ? window : this);
