/**
 * rizq_moderator_agent.js
 * رزق المراقب — الوكيل الآلي
 * Version: 1.0.0
 *
 * يُستدعى قبل كل عملية نشر إعلان.
 * يعيد قرار JSON: approve | reject | review_human
 *
 * الاستخدام:
 *   <script src="rizq_moderator_config.js"></script>
 *   <script src="rizq_moderator_agent.js"></script>
 *
 *   const result = RizqAgent.inspect(adData);
 *   if (result.decision === 'approve')       { /* انشر * / }
 *   if (result.decision === 'reject')        { RizqAgent.showRejectUI(result); }
 *   if (result.decision === 'review_human')  { RizqAgent.queueForReview(result, adData); }
 */

(function(global){
  'use strict';

  var M = global.RizqModerator; // من rizq_moderator_config.js

  // ══════════════════════════════════════════════════════════════════
  // إصلاح جوهري: كانت لوحة "إعدادات المشرف" في rizq_admin.html (تعطيل قاعدة
  // بعينها، كلمات محظورة إضافية، عتبة درجة الثقة، وضع "مراجعة الكل") تحفظ
  // في rizq_moderator_overrides، لكن هذا الملف — المحرك الفعلي المستدعى قبل
  // كل نشر إعلان — لم يكن يقرأ هذا المفتاح إطلاقاً؛ كانت اللوحة تعمل بصرياً
  // فقط بلا أي أثر حقيقي على القرار. الآن تُستشار هذه الإعدادات فعلياً.
  // ══════════════════════════════════════════════════════════════════
  var DEFAULT_MOD_CFG = { disabledRules: [], customKeywords: '', threshold: 70, reviewMode: false };
  function _getModConfig() {
    try {
      var raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('rizq_moderator_overrides') : null;
      if (!raw) return Object.assign({}, DEFAULT_MOD_CFG);
      var p = JSON.parse(raw);
      return p ? Object.assign({}, DEFAULT_MOD_CFG, p) : Object.assign({}, DEFAULT_MOD_CFG);
    } catch (e) { return Object.assign({}, DEFAULT_MOD_CFG); }
  }
  function _isRuleDisabled(code, cfg) {
    return (cfg.disabledRules || []).indexOf(code) > -1;
  }

  // ── محرك القواعد المشترك لكل قسم (طلب Limam 03/08/2026: "وكيل ذكي لكل
  // قسم" — نُفِّذ كوكيل واحد + قواعد منفصلة بدل ملف/خدمة منفصلة لكل قسم،
  // أسهل صيانة لفريق صغير). تُقرأ من نفس مفتاح localStorage المُزامَن من
  // الخادم (site-config.sectionRules) — انظر _syncModeratorConfigFromServer
  // في الصفحة المستدعية (rizq_post.html) لمصدر هذه المزامنة. ─────────────
  function _getSectionRule(accountType) {
    if (!accountType) return null;
    try {
      var raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('rizq_section_rules') : null;
      if (!raw) return null;
      var all = JSON.parse(raw);
      return (all && all[accountType]) || null;
    } catch (e) { return null; }
  }

  /* ══════════════════════════════════════════
     CORE INSPECT — نقطة الدخول الرئيسية
  ══════════════════════════════════════════ */
  function inspect(adData) {
    /**
     * adData = {
     *   id:       string|number,
     *   title:    string,
     *   desc:     string,
     *   price:    string|number,
     *   category: string,   // vehicle | real_estate | livestock ...
     *   images:   string[], // base64 أو URL
     *   video:    string,
     *   seller_trust_score: number (اختياري)
     *   accountType: string (اختياري) — individual|store|office|corp|tenders|videoAds
     *     يُستخدم لتطبيق قواعد القسم الخاصة (انظر _getSectionRule) فوق
     *     القواعد العامة — محرك واحد + قواعد لكل قسم بدل وكيل منفصل لكل قسم.
     */
    var id      = adData.id || ('AD_' + Date.now());
    var text    = _buildTextCorpus(adData);
    var price   = _parsePrice(adData.price);
    var cat     = (adData.category || '').toLowerCase();
    var trust   = adData.seller_trust_score || 60;
    var cfg     = _getModConfig();
    var secRule = _getSectionRule(adData.accountType);

    // ── 0. قواعد القسم الخاصة (كلمات محظورة إضافية فوق العامة) ──
    if (secRule && Array.isArray(secRule.extraBannedKeywords) && secRule.extraBannedKeywords.length) {
      if (_anyMatch(text, secRule.extraBannedKeywords)) {
        return _applyReviewMode(_buildDecision('reject', ['RS0'], id, 'يحتوي على عبارة محظورة خاصة بهذا القسم'), cfg);
      }
    }

    // ── 1. فحص النص ──
    var textResult = _checkText(text, id, cfg);
    if (textResult) return _applySectionEscalation(_applyReviewMode(textResult, cfg), secRule);

    // ── 2. فحص الفئة + السعر ──
    var catResult = _checkCategoryRules(cat, price, id);
    if (catResult) return _applySectionEscalation(_applyReviewMode(catResult, cfg), secRule);

    // ── 3. فحص درجة الثقة ──
    var trustResult = _checkTrust(trust, id, cfg);
    if (trustResult) return _applySectionEscalation(_applyReviewMode(trustResult, cfg), secRule);

    // ── 4. فحص الصور (heuristic) ──
    var imgResult = _checkImages(adData.images || [], id);
    if (imgResult) return _applySectionEscalation(_applyReviewMode(imgResult, cfg), secRule);

    // ── سليم من ناحية الفحوصات الآلية ──
    var okResult = _applyReviewMode(_buildDecision('approve', [], id, 'اجتاز جميع الفحوصات'), cfg);
    return _applySectionEscalation(okResult, secRule);
  }

  // بعض الأقسام (مكاتب/شركات/مناقصات/فيديو) تتطلب مراجعة بشرية دائماً حتى
  // لو اجتازت كل الفحوصات الآلية — وثائق رسمية لا يمكن التحقق منها آلياً
  // بثقة (راجع RIZQ_SECTION_MANAGEMENT_RULES.md). لا تُخفّف قرار رفض موجود.
  function _applySectionEscalation(result, secRule) {
    if (secRule && secRule.escalateAlways && result && result.decision === 'approve') {
      return _buildDecision('review_human', [], result.ad_id, 'هذا القسم يتطلب مراجعة بشرية دائماً حسب قواعده الخاصة');
    }
    return result;
  }

  // "وضع مراجعة الكل" — بدّلها الأدمن من لوحة إعدادات المشرف: لا يُنشر أي
  // إعلان تلقائياً بلا عين بشرية، حتى لو اجتاز كل الفحوصات الآلية. لا يُخفّف
  // قرار رفض/مراجعة موجود مسبقاً — فقط يرفع "موافقة تلقائية" إلى "مراجعة بشرية".
  function _applyReviewMode(result, cfg) {
    if (cfg.reviewMode && result && result.decision === 'approve') {
      return _buildDecision('review_human', [], result.ad_id, 'وضع "مراجعة الكل" مُفعَّل من لوحة الأدمن');
    }
    return result;
  }

  /* ══════════════════════════════════════════
     TEXT CHECKS
  ══════════════════════════════════════════ */
  function _checkText(text, id, cfg) {
    if (!text) return null;
    cfg = cfg || DEFAULT_MOD_CFG;

    // كلمات محظورة إضافية يضبطها الأدمن من لوحة إعدادات المشرف — لم تكن
    // تُستشار إطلاقاً من قبل. مفصولة بفواصل أو أسطر جديدة.
    if (cfg.customKeywords) {
      var customKw = String(cfg.customKeywords).split(/[,\n]/).map(function(k){ return k.trim(); }).filter(Boolean);
      if (customKw.length && _anyMatch(text, customKw)) {
        return _buildDecision('reject', ['RC0'], id, 'يحتوي على كلمة محظورة أضافها المشرف');
      }
    }

    // R14 — روابط خارجية
    if (!_isRuleDisabled('R14', cfg) && (/https?:\/\//i.test(text) || /www\.[a-z0-9-]+\.[a-z]{2,}/i.test(text))) {
      return _buildDecision('reject', ['R14'], id);
    }

    // R02 — كحول
    var alcoholKw = ['كحول','بيرة','خمر','ويسكي','فودكا','نبيذ','مسكر','alcohol','beer','whisky','wine','vodka','bière'];
    if (!_isRuleDisabled('R02', cfg) && _anyMatch(text, alcoholKw)) return _buildDecision('reject', ['R02'], id);

    // R03 — أسلحة
    var weaponKw = ['بندقية','مسدس','سلاح ناري','ذخيرة','رصاص','متفجر','قنبلة','gun','pistol','rifle','weapon','ammo','explosive'];
    if (!_isRuleDisabled('R03', cfg) && _anyMatch(text, weaponKw)) return _buildDecision('reject', ['R03'], id);

    // R04 — قمار
    var gamblingKw = ['قمار','يانصيب','رهان','كازينو','gaming','casino','gambling','lottery','pari'];
    if (!_isRuleDisabled('R04', cfg) && _anyMatch(text, gamblingKw)) return _buildDecision('reject', ['R04'], id);

    // R07 — كراهية/تحريض
    var hateKw = ['اقتل','أقتل','أطرد','اطرد','تحريض','يموت','إرهاب','terrorist','kill','hate','racist'];
    if (!_isRuleDisabled('R07', cfg) && _anyMatch(text, hateKw)) return _buildDecision('reject', ['R07'], id);

    // R05 — وثائق مزورة
    var fakeDocKw = ['جواز مزور','هوية مزورة','شهادة مزورة','رخصة مزورة','faux passeport','fausse carte'];
    if (!_isRuleDisabled('R05', cfg) && _anyMatch(text, fakeDocKw)) return _buildDecision('reject', ['R05'], id);

    // R12 — أدوية خاضعة للرقابة
    var drugKw = ['كوكايين','هيرويين','أمفيتامين','ترامادول','codéine','tramadol','cocaine','heroin'];
    if (!_isRuleDisabled('R12', cfg) && _anyMatch(text, drugKw)) return _buildDecision('reject', ['R12'], id);

    // R01 — محتوى جنسي أو إيحائي (كانت مذكورة في لوحة الأدمن بدون أي فحص فعلي)
    var sexualKw = [
      'خدمات جنسية','مرافقة مدفوعة','دعارة','مواعدة مدفوعة','خدمة رفقة',
      'escort','massage érotique','service d\'accompagnement rémunéré','contenu adulte','contenu pour adultes'
    ];
    if (!_isRuleDisabled('R01', cfg) && _anyMatch(text, sexualKw)) return _buildDecision('reject', ['R01'], id);

    // R08 — اتجار بالبشر أو أعضاء بشرية
    var traffickingKw = [
      'بيع كلية','بيع كلى','بيع عضو','شراء كلية','التبرع مقابل مال بعضو',
      'عاملة منزلية للبيع','تهريب عمال','vente de rein','vente d\'organe','trafic d\'êtres humains','vente d\'organes'
    ];
    if (!_isRuleDisabled('R08', cfg) && _anyMatch(text, traffickingKw)) return _buildDecision('reject', ['R08'], id);

    // R09 — منتجات مقلّدة بادعاء الأصالة (يحتاج تضافر: اسم ماركة شهيرة + ادّعاء أصالة مشبوه)
    if (!_isRuleDisabled('R09', cfg)) {
      var luxuryBrandKw = ['gucci','rolex','louis vuitton','chanel','nike','adidas original','prada','versace','ديور','روليكس','غوتشي'];
      var fakeClaimKw   = ['نسخة طبق الأصل','نسخة مطابقة','copie identique','réplique haute qualité','aaa quality','1:1 quality','نسخة أولى'];
      if (_anyMatch(text, luxuryBrandKw) && _anyMatch(text, fakeClaimKw)) {
        return _buildDecision('review_human', ['R09'], id, 'يحتمل أن يكون منتجاً مقلّداً يُسوَّق كأصلي — يحتاج تحققاً بشرياً');
      }
    }

    // R13 — صور ملابس داخلية أو مكشوفة (فحص نصي مساعد فقط — الفحص الحقيقي على الصور يحتاج مراجعة بشرية دوماً)
    var underwearKw = ['ملابس داخلية مثيرة','بيكيني مكشوف','صور مكشوفة','lingerie sexy','photos dénudées'];
    if (!_isRuleDisabled('R13', cfg) && _anyMatch(text, underwearKw)) {
      return _buildDecision('review_human', ['R13'], id, 'محتوى يحتمل أنه غير لائق — يحتاج مراجعة بشرية قبل النشر');
    }

    // R11 — حيوانات محمية أو مهددة بالانقراض
    var protectedAnimalsKw = ['أسد','نمر','فهد','فيل','دب','حوت','تمساح','شمبانزي','غوريلا','lion','tigre','éléphant','ours','baleine','crocodile','chimpanzé','gorille'];
    if (!_isRuleDisabled('R11', cfg) && _anyMatch(text, protectedAnimalsKw)) {
      return _buildDecision('review_human', ['R11'], id, 'يُحتمل أنه حيوان محمي أو مهدد بالانقراض — يحتاج تحققاً بشرياً');
    }

    // R10 — بيانات شخصية لطرف ثالث
    var thirdPartyDataKw = ['بيانات شخص آخر','رقم بطاقة شخص','هوية شخص آخر','données personnelles d\'un tiers','carte d\'identité d\'autrui'];
    if (!_isRuleDisabled('R10', cfg) && _anyMatch(text, thirdPartyDataKw)) {
      return _buildDecision('review_human', ['R10'], id, 'قد يحتوي على بيانات شخصية لطرف ثالث دون إذنه — يحتاج مراجعة بشرية');
    }

    // R06 — مؤشرات احتيال (يحتاج تضافر مؤشرين)
    if (!_isRuleDisabled('R06', cfg)) {
      var fraudKw = ['تحويل مسبق','دفع أولاً','ارسل المبلغ','تأمين استلام','western union','moneygram','virement avant','paiement avance'];
      var fraudCount = fraudKw.filter(function(k){ return text.toLowerCase().indexOf(k.toLowerCase()) >= 0; }).length;
      if (fraudCount >= 2) return _buildDecision('reject', ['R06'], id);
    }

    // H08 — توظيف مشبوه (ليس ضمن قائمة R01-R14 القابلة للتعطيل من اللوحة)
    if (/وظيف|emploi|recrutement|travail/i.test(text)) {
      var suspJobKw = ['رسوم تسجيل','دفع للتوظيف','ضمان مالي','frais inscription','dépôt de garantie'];
      if (_anyMatch(text, suspJobKw)) return _buildDecision('review_human', ['H08'], id);
    }

    // H01 — كلمات قانونية غامضة
    var legalGrayKw = ['بدون فاتورة','دون وثيقة','بدون رخصة','sans facture','sans document'];
    if (_anyMatch(text, legalGrayKw)) return _buildDecision('review_human', ['H01'], id);

    return null;
  }

  /* ══════════════════════════════════════════
     CATEGORY + PRICE RULES
  ══════════════════════════════════════════ */
  function _checkCategoryRules(cat, price, id) {

    // H05 — مركبة بسعر مشبوه (أقل من 50,000 MRU)
    if (cat === 'vehicles' || cat === 'vehicle' || /سيارة|مركبة|vehicle/i.test(cat)) {
      if (price > 0 && price < 50000) {
        return _buildDecision('review_human', ['H05'], id, 'سعر المركبة أقل من الحد المتوقع');
      }
    }

    // H02 — عقار بسعر ضخم (أكثر من 50,000,000 MRU)
    if (cat === 'real_estate' || /عقار|شقة|أرض|بيت/i.test(cat)) {
      if (price > 50000000) {
        return _buildDecision('review_human', ['H02'], id, 'قيمة العقار عالية جداً — تحقق من الوثائق');
      }
    }

    // H04 — حيوانات (فحص الحيوانات المحمية R11 يتم فعلياً في _checkText عبر protectedAnimalsKw)
    // لا حاجة لأي فحص إضافي هنا — أُبقي الفرع فقط للتوثيق التاريخي.

    return null;
  }

  /* ══════════════════════════════════════════
     TRUST SCORE CHECK
  ══════════════════════════════════════════ */
  function _checkTrust(trust, id, cfg) {
    cfg = cfg || DEFAULT_MOD_CFG;
    // عتبة الثقة قابلة للضبط من لوحة "إعدادات المشرف" (threshold، افتراضياً 70).
    // أي حساب بدرجة ثقة أقل من العتبة يذهب للمراجعة البشرية.
    var threshold = (typeof cfg.threshold === 'number' && !isNaN(cfg.threshold)) ? cfg.threshold : 70;
    if (trust < threshold) {
      return _buildDecision('review_human', ['H01'], id, 'حساب دون عتبة الثقة المضبوطة (' + threshold + ') — يحتاج مراجعة بشرية');
    }
    return null;
  }

  /* ══════════════════════════════════════════
     IMAGE CHECKS (heuristic — no ML)
  ══════════════════════════════════════════ */
  function _checkImages(images, id) {
    // كشف محدود بدون ML: تحقق من وجود صورة واحدة على الأقل
    // الفحص الكامل يتم على جانب الخادم عند توفره
    if (!images || images.length === 0) return null; // لا صور — مسموح
    // صورة واحدة صغيرة جداً (base64 قصير جداً = صورة تالفة)
    var tooSmall = images.filter(function(img){
      return typeof img === 'string' && img.startsWith('data:') && img.length < 500;
    });
    if (tooSmall.length > 0) {
      return _buildDecision('review_human', ['H07'], id, 'صورة تالفة أو منخفضة الجودة جداً');
    }
    return null;
  }

  /* ══════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════ */
  function _buildTextCorpus(adData) {
    return [adData.title || '', adData.desc || '', String(adData.price || '')].join(' ');
  }

  function _parsePrice(raw) {
    if (!raw) return 0;
    return parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0;
  }

  function _anyMatch(text, keywords) {
    var t = text.toLowerCase();
    return keywords.some(function(k){ return t.indexOf(k.toLowerCase()) >= 0; });
  }

  function _buildDecision(type, codes, adId, reason) {
    if (M && M.buildDecision) return M.buildDecision(type, codes, adId, reason);
    // fallback si config non chargé
    return { schema_version:'1.0', ad_id:adId, timestamp:Date.now(), decision:type, codes:codes, reason:reason||null };
  }

  /* ══════════════════════════════════════════
     UI HELPERS — ردود الفعل في الواجهة
     (كانت هذه الرسائل الثلاث بالعربية فقط دائماً حتى في وضع الصفحة الفرنسي —
     تسرب لغة حقيقي لأن هذا الملف يُستخدم من صفحات تدعم الفرنسية بالكامل)
  ══════════════════════════════════════════ */
  function _modLang() {
    try {
      if (window.RizqI18n && typeof window.RizqI18n.getLang === 'function') return window.RizqI18n.getLang();
    } catch (e) {}
    try { if (document.documentElement.lang === 'fr') return 'fr'; } catch(e){}
    try { return localStorage.getItem('rizq_lang') === 'fr' ? 'fr' : 'ar'; } catch (e) { return 'ar'; }
  }

  function showRejectUI(result, containerEl) {
    var isFr  = _modLang() === 'fr';
    var codes = (result.codes||[]).map(function(c){ return typeof c==='object'?c.code:c; }).join(', ');
    var msg   = (isFr ? result.message_fr : result.message_ar) ||
                (isFr ? 'Votre annonce a été refusée car elle enfreint la politique de la plateforme.' : 'تم رفض إعلانك لمخالفة سياسة المنصة.');
    var title = isFr ? 'Annonce refusée' : 'تم رفض الإعلان';
    var html  =
      '<div style="background:#fef2f2;border:1px solid #fee2e2;border-radius:12px;padding:16px 18px;margin:12px 0">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
          '<span style="font-size:22px">❌</span>' +
          '<strong style="color:#dc2626;font-size:14px">'+escH(title)+'</strong>' +
          (codes ? '<span style="background:#dc2626;color:#fff;border-radius:5px;padding:1px 8px;font-size:11px;font-weight:700">'+escH(codes)+'</span>' : '') +
        '</div>' +
        '<p style="font-size:13px;color:#7f1d1d;line-height:1.7;margin:0">'+escH(msg)+'</p>' +
      '</div>';
    if (containerEl) containerEl.innerHTML = html;
    return html;
  }

  function showReviewUI(result, containerEl) {
    var isFr  = _modLang() === 'fr';
    var codes = (result.codes||[]).map(function(c){ return typeof c==='object'?c.code:c; }).join(', ');
    var msg   = (isFr ? result.message_fr : result.message_ar) ||
                (isFr ? 'Votre annonce est en cours de vérification. Elle sera publiée sous 24 heures.' : 'إعلانك قيد المراجعة. سيُنشر خلال 24 ساعة.');
    var sla   = result.sla_hours ? (isFr ? ('⏱ Sous '+result.sla_hours+' heures') : ('⏱ خلال '+result.sla_hours+' ساعة')) : '';
    var title = isFr ? 'Annonce en cours de vérification' : 'الإعلان قيد المراجعة';
    var html  =
      '<div style="background:#fff8e8;border:1px solid #fde68a;border-radius:12px;padding:16px 18px;margin:12px 0">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
          '<span style="font-size:22px">🔍</span>' +
          '<strong style="color:#a07820;font-size:14px">'+escH(title)+'</strong>' +
          (sla ? '<span style="background:#fde68a;color:#7a5c00;border-radius:5px;padding:1px 8px;font-size:11px;font-weight:700">'+escH(sla)+'</span>' : '') +
        '</div>' +
        '<p style="font-size:13px;color:#7a5c00;line-height:1.7;margin:0">'+escH(msg)+'</p>' +
      '</div>';
    if (containerEl) containerEl.innerHTML = html;
    return html;
  }

  function showApproveUI(containerEl) {
    var isFr = _modLang() === 'fr';
    var html =
      '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px;margin:12px 0">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<span style="font-size:22px">✅</span>' +
          '<strong style="color:#16a34a;font-size:14px">'+(isFr ? 'Votre annonce a été publiée avec succès !' : 'تم نشر إعلانك بنجاح!')+'</strong>' +
        '</div>' +
      '</div>';
    if (containerEl) containerEl.innerHTML = html;
    return html;
  }

  /* ══════════════════════════════════════════
     QUEUE FOR HUMAN REVIEW
  ══════════════════════════════════════════ */
  function queueForReview(result, adData) {
    try {
      var queue = JSON.parse(localStorage.getItem('rizq_flagged_ads') || '[]');
      var code  = (result.codes && result.codes[0])
                    ? (typeof result.codes[0]==='object' ? result.codes[0].code : result.codes[0])
                    : 'H01';
      queue.push({
        id:     adData.id || ('AD_' + Date.now()),
        title:  adData.title  || 'بدون عنوان',
        seller: adData.seller || '',
        cat:    adData.category || '',
        price:  adData.price  || '',
        desc:   (adData.desc  || '').substring(0, 120),
        code:   code,
        reason: result.reason || '',
        date:   new Date().toLocaleDateString('ar-MR-u-nu-latn'),
        queued_at: new Date().toISOString(),
        sla_hours: result.sla_hours || 24,
        priority:  result.priority  || 'normal',
      });
      localStorage.setItem('rizq_flagged_ads', JSON.stringify(queue));
    } catch(e) {}
  }

  /* ══════════════════════════════════════════
     MAIN SUBMIT HANDLER — استدعاء موحّد
  ══════════════════════════════════════════ */
  function handleSubmit(adData, opts) {
    /**
     * opts = {
     *   feedbackEl:  HTMLElement,  // حاوية رسالة النتيجة
     *   onApprove:   function(adData),
     *   onReject:    function(result),
     *   onReview:    function(result, adData),
     * }
     */
    opts = opts || {};
    var result = inspect(adData);

    if (result.decision === 'approve') {
      showApproveUI(opts.feedbackEl);
      if (opts.onApprove) opts.onApprove(adData);
    } else if (result.decision === 'reject') {
      showRejectUI(result, opts.feedbackEl);
      if (opts.onReject) opts.onReject(result);
    } else if (result.decision === 'review_human') {
      queueForReview(result, adData);
      showReviewUI(result, opts.feedbackEl);
      if (opts.onReview) opts.onReview(result, adData);
      // الإعلان يُحفظ بحالة pending بدلاً من active
      adData._status = 'pending_review';
      if (opts.onApprove) opts.onApprove(adData); // يُحفظ لكن بحالة pending
    }

    return result;
  }

  function escH(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ══════════════════════════════════════════
     BACKGROUND SYNC — تحديث rizq_moderator_overrides من الخادم عند تحميل
     الصفحة، حتى يستفيد المحرك من تعديلات الأدمن الحديثة قبل استدعاء inspect()
     في أول نشر إعلان (تحديث صامت في الخلفية، لا يعطل الفحص المحلي أبداً).
  ══════════════════════════════════════════ */
  function _syncModCfgFromBackendBg() {
    try {
      if (typeof global.RIZQ_BACKEND_BASE !== 'string' || !global.RIZQ_BACKEND_BASE) return;
      if (typeof fetch === 'undefined') return;
      fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/site-config')
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (data && data.ok && data.config && data.config.moderatorConfig) {
            localStorage.setItem('rizq_moderator_overrides', JSON.stringify(data.config.moderatorConfig));
          }
          // نفس مبدأ moderatorConfig أعلاه — قواعد كل قسم (انظر _getSectionRule
          // و DEFAULT_SECTION_RULES في server.js) تُزامَن هنا لتتوفر لـ inspect().
          if (data && data.ok && data.config && data.config.sectionRules) {
            localStorage.setItem('rizq_section_rules', JSON.stringify(data.config.sectionRules));
          }
        })
        .catch(function () {});
    } catch (e) {}
  }
  _syncModCfgFromBackendBg();

  /* ══════════════════════════════════════════
     EXPORT
  ══════════════════════════════════════════ */
  var RizqAgent = {
    inspect:        inspect,
    handleSubmit:   handleSubmit,
    showRejectUI:   showRejectUI,
    showReviewUI:   showReviewUI,
    showApproveUI:  showApproveUI,
    queueForReview: queueForReview,
    version:        '1.0.0',
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RizqAgent;
  }
  global.RizqModeratorAgent = RizqAgent;
  global.RizqAgent = RizqAgent;

}(typeof window !== 'undefined' ? window : this));
