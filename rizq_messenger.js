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
    category:   '',
    lang:       'ar',
    visitorId:  '',
    visitorName:'',
    buyerAccountId: null, // مشترٍ مسجَّل دخوله (rizq_individual_session) — يتيح محادثة ثنائية حقيقية
    buyerToken:     null,
    threadKey:      null,
    msgs:       []
  };

  /** يقرأ جلسة المشتري الفردي المسجَّل دخوله (إن وُجدت) — نفس مفتاح rizq_dashboard.html */
  function _getBuyerSession() {
    try {
      var raw = localStorage.getItem('rizq_individual_session');
      if (!raw) return null;
      var s = JSON.parse(raw);
      return (s && s.id && s.token) ? s : null;
    } catch(e) { return null; }
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
    if (document.getElementById('rzq-messenger-css')) return;
    var css = `
#rzq-messenger-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55);opacity:0;pointer-events:none;transition:opacity .3s;padding:0 0 70px}
#rzq-messenger-modal.rzq-open{opacity:1;pointer-events:all}
.rzq-mbox{width:100%;max-width:480px;background:#f5f8ff;border-radius:20px 20px 0 0;max-height:82vh;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .32s cubic-bezier(.4,0,.2,1);box-shadow:0 -8px 40px rgba(15,35,65,.18)}
#rzq-messenger-modal.rzq-open .rzq-mbox{transform:translateY(0)}
.rzq-mhead{background:linear-gradient(135deg,#1B3A6B,#234d8f);color:#fff;padding:14px 16px;border-radius:20px 20px 0 0;display:flex;align-items:center;gap:12px}
.rzq-mav{width:44px;height:44px;border-radius:50%;background:rgba(201,168,76,.25);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;border:2px solid rgba(201,168,76,.4)}
.rzq-mhead-info{flex:1;min-width:0}
.rzq-mhead-name{font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rzq-mhead-sub{font-size:11px;color:rgba(255,255,255,.65);margin-top:2px}
.rzq-mhead-status{font-size:11px;color:#4ade80;display:flex;align-items:center;gap:4px;margin-top:3px}
.rzq-mhead-status::before{content:'';width:6px;height:6px;background:#4ade80;border-radius:50%;animation:rzq-pulse 2s infinite}
@keyframes rzq-pulse{0%,100%{opacity:1}50%{opacity:.4}}
.rzq-mclose{background:none;border:none;color:rgba(255,255,255,.7);font-size:20px;cursor:pointer;padding:4px 8px;border-radius:8px;transition:.2s;line-height:1}
.rzq-mclose:hover{background:rgba(255,255,255,.12);color:#fff}
.rzq-ad-strip{background:rgba(27,58,107,.06);padding:9px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(0,0,0,.07)}
.rzq-ad-icon{width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#C9A84C,#e8c96a);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0}
.rzq-ad-info{flex:1;min-width:0}
.rzq-ad-name{font-size:12.5px;font-weight:700;color:#1a2535;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rzq-ad-note{font-size:11px;color:#6b7280}
.rzq-msgs{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px;min-height:160px}
.rzq-msgs::-webkit-scrollbar{width:4px}.rzq-msgs::-webkit-scrollbar-track{background:transparent}.rzq-msgs::-webkit-scrollbar-thumb{background:rgba(27,58,107,.15);border-radius:4px}
.rzq-bubble{max-width:80%;padding:9px 13px;border-radius:16px;font-size:13.5px;line-height:1.55;word-break:break-word}
.rzq-bubble.me{background:linear-gradient(135deg,#1B3A6B,#234d8f);color:#fff;align-self:flex-end;border-bottom-left-radius:3px}
.rzq-bubble.them{background:#fff;color:#1a2535;border:1px solid rgba(0,0,0,.08);align-self:flex-start;border-bottom-right-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.rzq-bubble .rzq-ts{font-size:10px;opacity:.5;margin-top:4px;text-align:end}
.rzq-suggest{display:flex;gap:6px;padding:6px 12px 8px;overflow-x:auto;flex-shrink:0}
.rzq-suggest::-webkit-scrollbar{display:none}
.rzq-sq{padding:7px 12px;background:#fff;border:1.5px solid rgba(27,58,107,.15);border-radius:20px;font-size:12.5px;color:#1B3A6B;cursor:pointer;white-space:nowrap;font-family:inherit;transition:.2s;flex-shrink:0}
.rzq-sq:hover{border-color:#C9A84C;color:#C9A84C;background:rgba(201,168,76,.06)}
.rzq-typing{display:flex;align-items:center;gap:6px;padding:10px 14px;background:#fff;border-radius:16px;border-bottom-right-radius:3px;align-self:flex-start;border:1px solid rgba(0,0,0,.08);box-shadow:0 1px 4px rgba(0,0,0,.06);width:60px}
.rzq-typing span{width:7px;height:7px;background:#9ca3af;border-radius:50%;animation:rzq-blink 1.2s infinite}.rzq-typing span:nth-child(2){animation-delay:.2s}.rzq-typing span:nth-child(3){animation-delay:.4s}
@keyframes rzq-blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
.rzq-name-row{padding:10px 14px 4px;display:flex;flex-direction:column;gap:6px;border-top:1px solid rgba(0,0,0,.07)}
.rzq-name-input{padding:9px 12px;border:1.5px solid rgba(27,58,107,.18);border-radius:10px;font-size:13px;font-family:inherit;background:#fff;color:#1a2535;outline:none;transition:.2s;width:100%;box-sizing:border-box}
.rzq-name-input:focus{border-color:#C9A84C}
.rzq-name-input::placeholder{color:#9ca3af}
.rzq-inp-row{padding:8px 10px 10px;display:flex;gap:8px;border-top:1px solid rgba(0,0,0,.07);background:#fff;border-radius:0 0 0 0}
.rzq-inp{flex:1;padding:10px 14px;border:1.5px solid rgba(27,58,107,.15);border-radius:22px;font-size:13.5px;font-family:inherit;resize:none;outline:none;max-height:90px;overflow-y:auto;background:#f9fafb;color:#1a2535;transition:.2s}
.rzq-inp:focus{border-color:#C9A84C;background:#fff}
.rzq-inp::placeholder{color:#9ca3af}
.rzq-send{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#e8c96a);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:.2s;align-self:flex-end}
.rzq-send:hover{transform:scale(1.08);box-shadow:0 4px 14px rgba(201,168,76,.45)}
.rzq-send svg{width:18px;height:18px;fill:#1B3A6B}
.rzq-footer{text-align:center;font-size:10.5px;color:#9ca3af;padding:5px 10px 8px;background:#fff}
.rzq-footer strong{color:#1B3A6B}
.rzq-priv-note{font-size:11px;color:#6b7280;padding:3px 14px 6px;text-align:center}
`;
    var el = document.createElement('style');
    el.id = 'rzq-messenger-css';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function _injectModal() {
    if (document.getElementById(MODAL_ID)) return;
    var div = document.createElement('div');
    div.id = MODAL_ID;
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
      <div class="rzq-ad-name" id="rzq-m-adname">الإعلان</div>
      <div class="rzq-ad-note" id="rzq-m-adnote">استفسار عن هذا الإعلان</div>
    </div>
  </div>

  <div class="rzq-msgs" id="rzq-m-msgs"></div>

  <div class="rzq-suggest" id="rzq-m-suggest">
    <button class="rzq-sq" onclick="RizqMessenger.quickSend(this.textContent)">هل المنتج متوفر؟</button>
    <button class="rzq-sq" onclick="RizqMessenger.quickSend(this.textContent)">ما هو السعر النهائي؟</button>
    <button class="rzq-sq" onclick="RizqMessenger.quickSend(this.textContent)">أريد الاستفسار</button>
    <button class="rzq-sq" onclick="RizqMessenger.quickSend(this.textContent)">هل يمكن التفاوض؟</button>
  </div>

  <div class="rzq-name-row" id="rzq-m-namerow">
    <input class="rzq-name-input" id="rzq-m-nameinp" type="text" placeholder="اسمك (اختياري)" maxlength="40" />
    <input class="rzq-name-input" id="rzq-m-phoneinp" type="tel" placeholder="رقم هاتفك (ليتمكن البائع من الرد عليك)" maxlength="20" />
    <div class="rzq-priv-note" id="rzq-m-privnote">🔒 رقمك يصل للبائع فقط لغرض الرد — لا يُنشر علناً</div>
  </div>

  <div class="rzq-inp-row">
    <textarea class="rzq-inp" id="rzq-m-inp" rows="1" placeholder="اكتب رسالتك هنا..." maxlength="500"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();RizqMessenger.send();}"
      oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,90)+'px'"></textarea>
    <button class="rzq-send" onclick="RizqMessenger.send()" aria-label="إرسال">
      <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
    </button>
  </div>
  <div class="rzq-footer" id="rzq-m-footer">مدعوم بـ <strong>رزق AI</strong> · تواصل مباشر وآمن</div>
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
  function _appendBubble(text, side) {
    var msgs = document.getElementById('rzq-m-msgs');
    if (!msgs) return;
    var d = document.createElement('div');
    d.className = 'rzq-bubble ' + side;
    d.innerHTML = _esc(text).replace(/\n/g,'<br>') + '<div class="rzq-ts">' + _tsDisplay() + '</div>';
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
      _appendBubble(m.text, 'me');
    });
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
    _setTxt('rzq-m-adnote', isFr ? 'Demande concernant cette annonce' : 'استفسار عن هذا الإعلان');
    _setAttr('rzq-m-nameinp', 'placeholder', isFr ? 'Votre nom (facultatif)' : 'اسمك (اختياري)');
    _setAttr('rzq-m-phoneinp', 'placeholder', isFr ? 'Votre téléphone (pour que le vendeur réponde)' : 'رقم هاتفك (ليتمكن البائع من الرد عليك)');
    _setTxt('rzq-m-privnote', isFr ? '🔒 Votre numéro est visible uniquement par le vendeur pour vous répondre' : '🔒 رقمك يصل للبائع فقط لغرض الرد — لا يُنشر علناً');
    _setAttr('rzq-m-inp', 'placeholder', isFr ? 'Écrivez votre message...' : 'اكتب رسالتك هنا...');
    _setTxt('rzq-m-footer', isFr ? 'Propulsé par <strong>Rizq AI</strong> · Contact direct et sécurisé' : 'مدعوم بـ <strong>رزق AI</strong> · تواصل مباشر وآمن');

    // اقتراحات سريعة — سياقية حسب فئة الإعلان (إصلاح 01/08/2026: كانت 4
    // أسئلة عامة ثابتة لكل الإعلانات بلا استثناء، الآن تُختار من
    // SUGGESTIONS_BY_CAT حسب _state.category مع رجوع لِ'default' لأي فئة
    // غير مُدرَجة أو إعلان بلا فئة معروفة).
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
    return fetch(base + '/api/accounts/verify-dash/' + encodeURIComponent(_state.buyerAccountId) + '?token=' + encodeURIComponent(_state.buyerToken))
      .then(function(res){ return res.ok ? res.json() : null; })
      .then(function(data){
        if (!data || !data.ok || !data.account || !data.account.accessToken) return null;
        _state.buyerRealToken = data.account.accessToken;
        try {
          var accs2 = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
          var rec2 = accs2.find(function(a){ return a.id === _state.buyerAccountId; });
          if (rec2) { rec2.backendAccessToken = _state.buyerRealToken; localStorage.setItem('rizq_pending_accounts', JSON.stringify(accs2)); }
        } catch(e) {}
        return _state.buyerRealToken;
      }).catch(function(){ return null; });
  }

  function _sendToBackend(text, name, phone) {
    try {
      var base = _backendBase();
      if (!base || !_state.sellerAccountId) return; // إعلان تجريبي/بلا حساب حقيقي — لا يوجد طرف خادم لإرسال الرسالة إليه
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
        }
        fetch(base + '/api/messages', {
          method: 'POST', headers: headers, body: JSON.stringify(payload)
        }).then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
          if (data && data.message && data.message.threadKey) _state.threadKey = data.message.threadKey;
        }).catch(function(){});
      };
      if (_state.buyerAccountId && _state.buyerToken) {
        _resolveBuyerRealToken().then(doSend);
      } else {
        doSend(null);
      }
    } catch(e) {}
  }

  /** جلب المحادثة الحقيقية من الخادم (لمشترٍ مسجَّل دخوله فقط — يملك threadKey ثابتاً) */
  function _loadThreadFromBackend() {
    try {
      var base = _backendBase();
      if (!base || !_state.threadKey || !_state.buyerToken) return;
      _resolveBuyerRealToken().then(function(realTok){
        fetch(base + '/api/messages/thread/' + encodeURIComponent(_state.threadKey), {
          headers: { 'x-account-token': realTok || _state.buyerToken }
        }).then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
          if (!data || !Array.isArray(data.messages) || !data.messages.length) return;
          var msgsEl = document.getElementById('rzq-m-msgs');
          if (msgsEl) msgsEl.innerHTML = '';
          data.messages.forEach(function(m){
            _appendBubble(m.body, m.fromRole === 'seller' ? 'them' : 'me');
          });
          // رسائل حقيقية موجودة فعلاً: نُخفي رسالة الترحيب/الاقتراحات الافتراضية وحقل الاسم
          var sq = document.getElementById('rzq-m-suggest');
          if (sq) sq.style.display = 'none';
        }).catch(function(){});
      });
    } catch(e) {}
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
      _state.category        = opts.category    || ''; // فئة الإعلان — لاختيار أسئلة سريعة سياقية
      _state.visitorId       = _getVisitorId();
      _state.visitorName     = '';
      _state.threadKey       = null;

      var buyer = _getBuyerSession();
      _state.buyerAccountId = buyer ? buyer.id : null;
      _state.buyerToken     = buyer ? buyer.token : null;

      _injectStyles();
      _injectModal();
      _applyLang();

      // بيانات الإعلان في الرأس
      _setTxt('rzq-m-av',   _state.adEmoji);
      _setTxt('rzq-m-name', _esc(_state.sellerName));
      _setTxt('rzq-m-adicon', _state.adEmoji);
      _setTxt('rzq-m-adname', _esc(_state.adTitle || _state.sellerName));

      // إخفاء/إظهار قسم الإعلان
      var strip = document.getElementById('rzq-m-adstrip');
      if (strip) strip.style.display = _state.adTitle ? 'flex' : 'none';

      // مشترٍ مسجَّل دخوله: لا حاجة لطلب اسم/هاتف يدوياً
      var nr = document.getElementById('rzq-m-namerow');
      if (nr) nr.style.display = _state.buyerAccountId ? 'none' : 'flex';

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

      // رسالة ترحيب إن كانت المحادثة جديدة
      if (!document.querySelector('#rzq-m-msgs .rzq-bubble')) {
        var greet = _t(
          'أهلاً! 😊\nأنت تتواصل مع ' + _state.sellerName + ' عبر رزق.\nرقم هاتفك لن يُكشف علناً — اكتب رسالتك بحرية.',
          'Bonjour ! 😊\nVous contactez ' + _state.sellerName + ' via Rizq.\nVotre numéro reste confidentiel — écrivez librement.'
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

    /** إرسال رسالة */
    send: function() {
      var inp      = document.getElementById('rzq-m-inp');
      var nameInp  = document.getElementById('rzq-m-nameinp');
      var phoneInp = document.getElementById('rzq-m-phoneinp');
      if (!inp) return;

      var text = inp.value.trim();
      if (!text) return;

      // اسم الزائر
      var name = nameInp ? (nameInp.value.trim() || '') : '';
      if (!name) name = _t('زائر', 'Visiteur') + ' ' + _state.visitorId;
      _state.visitorName = name;
      var phone = phoneInp ? phoneInp.value.trim() : '';

      // عرض الرسالة
      _appendBubble(text, 'me');
      inp.value = '';
      inp.style.height = 'auto';

      // إخفاء الاقتراحات بعد أول رسالة
      var sq = document.getElementById('rzq-m-suggest');
      if (sq) sq.style.display = 'none';

      // إخفاء حقل الاسم بعد أول رسالة (زائر ضيف فقط — المشترك المسجَّل مخفي أصلاً)
      var nr = document.getElementById('rzq-m-namerow');
      if (nr) nr.style.display = 'none';

      // حفظ الرسالة محلياً (احتياط/عرض فوري) لداشبورد البائع القديم
      var msgs = _loadMsgs(_state.sellerKey);
      msgs.push({
        name:       name,
        text:       text,
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

      // إرسال حقيقي للخادم — نظام الرسائل بين المشتري والبائع (مهمة #243/#247)
      _sendToBackend(text, name, phone);

      // رد المساعد الآلي (يبقى كتجربة فورية بينما ينتظر رد البائع الحقيقي)
      _autoReply();
    },

    /** إرسال سريع من الاقتراحات */
    quickSend: function(text) {
      var inp = document.getElementById('rzq-m-inp');
      if (inp) inp.value = text;
      this.send();
    },

    /** إغلاق النافذة */
    close: function() {
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
    RizqMessenger.open({
      sellerKey:  _deriveSellerKey(ad),
      sellerAccountId: (ad && ad.accountId) ? String(ad.accountId) : (global._pageAccountId || ''),
      sellerName: (ad && ad.seller) ? ad.seller : (global._pageSellerName || 'البائع'),
      adTitle:    (ad && (ad.title_ar || ad.title)) || global._pageTitle || document.title || '',
      adId:       (ad && ad.id) ? String(ad.id) : 'g',
      adEmoji:    (ad && ad.emoji) ? ad.emoji : (global._pageEmoji || '📦'),
      lang:       typeof _getLang === 'function' ? _getLang() : 'ar'
    });
  };

  /* ══════════════════════════════
     تصدير
  ══════════════════════════════ */
  global.RizqMessenger = RizqMessenger;

})(typeof window !== 'undefined' ? window : this);
