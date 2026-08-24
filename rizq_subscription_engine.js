/**
 * rizq_subscription_engine.js
 * ═══════════════════════════════════════════════════════════════════
 * محرك دورة حياة الباقات — رزق
 * يُعالج: التفعيل، الفحص التلقائي، تذكير التجديد، الإيقاف عند الانتهاء
 * ═══════════════════════════════════════════════════════════════════
 */

(function(global){

  // ── مدة كل باقة بالأيام ──────────────────────────────────────────
  var PKG_DURATIONS = {
    'تجريبية مجانية' : 3,
    'تجريبية'        : 3,
    'مجانية'         : 3,
    'شهرية'          : 30,
    'ربعية'          : 90,
    'سنوية'          : 365,
    'ماسية'          : 30,
    '💎 ماسية'       : 30,
    'الماسية 💎 (النائب الذكي الشامل)' : 30,
    // باقة المناقصة — عمداً بلا أي بديل باسم "تجريبي/مجاني": الميزة الوحيدة
    // في المنصة بلا فترة تجربة (تصحيح Limam 23/07/2026). القيمة هنا مجرد
    // شبكة أمان احتياطية؛ المصدر الفعلي هو حقل durationDays في كتالوج
    // rizq_tender_packages القابل للتعديل من لوحة الأدمين (_findPackageDef).
    'باقة المناقصة'  : 30,
  };

  // ── المزايا المجانية الدائمة (لا تتأثر بالباقة أبداً) ──────────
  var FREE_FEATURES = [
    'basic_profile',       // الملف الشخصي الأساسي
    'view_listings',       // تصفح الإعلانات بحرية — بلا حد
    'post_3_ads_monthly',  // نشر 3 إعلانات/شهر بعد انتهاء الباقة
    'basic_contact',       // زر التواصل الأساسي
    'dashboard_access',    // الدخول للوحة التحكم
    'keep_old_ads',        // الإعلانات القديمة تبقى ظاهرة
    'verified_badge',      // شارة موثق ✅ دائمة — مرتبطة بالهوية لا بالدفع
  ];

  // حد الإعلانات الشهري في الخطة المجانية (بعد انتهاء الباقة المدفوعة)
  var FREE_MONTHLY_ADS_LIMIT = 3;

  // ── مصفوفة الباقات التسويقية (صفحة الهبوط: مجاني / Pro / Business) ──
  var PLAN_MATRIX = {
    free: {
      planType: 'free',
      maxActiveAds: 5,
      maxPhotosPerItem: 5,
      videoMaxSec: 30,
      videoMaxMb: 20,
      videoWatermark: true,
      privateStore: false,
      priorityListing: false,
    },
    pro: {
      planType: 'pro',
      maxActiveAds: Infinity,
      maxPhotosPerItem: 10,
      videoMaxSec: 60,
      videoMaxMb: 40,
      videoWatermark: false,
      priorityListing: true,
      weeklyBoost: true,
    },
    business: {
      planType: 'business',
      maxActiveAds: Infinity,
      maxPhotosPerItem: 10,
      videoMaxSec: 60,
      videoMaxMb: 40,
      videoWatermark: false,
      privateStore: true,
      priorityListing: true,
      weeklyBoost: true,
      advancedAnalytics: true,
      accountManager: true,
    },
  };

  function resolvePlanType(pkgName, accountType) {
    var name = String(pkgName || '').replace(/💎\s*/g, '').trim().toLowerCase();
    var type = String(accountType || 'individual').toLowerCase();
    var tier = resolveDiamondTierClient(pkgName);
    if (tier === 'diamond_pro') return 'diamond_pro';
    if (tier === 'diamond_standard') return 'diamond_standard';
    if (isDiamondName(pkgName)) {
      if (type === 'corp' && /pro|متقدم/.test(name)) return 'diamond_pro';
      return 'diamond_standard';
    }
    if (/business|🏢|أعمال/.test(name)) return 'business';
    if (/^pro$|pro\b|باقة\s*pro/.test(name)) return 'pro';
    if (type === 'individual') {
      if (/مجان|free/.test(name)) return 'free';
      if (/شهر|month|pro/.test(name)) return 'pro';
      return 'free';
    }
    return null;
  }

  function getPlanLimits(accId) {
    var sub = checkSubscription(accId);
    var acc = sub.acc || getAccounts()[accId] || {};
    var planType = acc.planType || resolvePlanType(sub.pkg, acc.type) || 'free';
    if (sub.status === 'expired' || sub.status === 'no_subscription') planType = 'free';
    var matrix = PLAN_MATRIX[planType] || PLAN_MATRIX.free;
    return { planType: planType, subscriptionStatus: sub.status, limits: matrix };
  }

  function getPhotoLimit(accId) {
    return getPlanLimits(accId).limits.maxPhotosPerItem || 5;
  }

  function getVideoPolicy(accId) {
    var lim = getPlanLimits(accId).limits;
    return {
      maxSec: lim.videoMaxSec || 30,
      maxMb: lim.videoMaxMb || 20,
      watermark: !!lim.videoWatermark,
    };
  }

  /** مزامنة صلاحيات الخادم → localStorage (يُستدعى عند فتح الداشبورد) */
  function syncEntitlementsFromServer(accId) {
    try {
      var cfg = (typeof getAgentConfig === 'function') ? getAgentConfig() : {};
      var accounts = getAccounts();
      var token = accounts[accId] && accounts[accId].server_token;
      if (!cfg.backendUrl || !token) return Promise.resolve(null);
      return fetch(cfg.backendUrl.replace(/\/$/, '') + '/api/entitlements/' + encodeURIComponent(accId), {
        headers: { 'x-account-token': token },
      }).then(function(res){ return res.ok ? res.json() : null; }).then(function(data){
        if (!data || !data.entitlements) return null;
        var ent = data.entitlements;
        var accs = getAccounts();
        if (!accs[accId]) return ent;
        accs[accId].planType = ent.planType;
        accs[accId].subscriptionStatus = ent.subscriptionStatus;
        if (ent.endDate) accs[accId].pkg_ends_at = ent.endDate;
        if (ent.subscriptionStatus === 'expired' || ent.subscriptionStatus === 'suspended') {
          accs[accId].pkg_status = ent.subscriptionStatus === 'suspended' ? 'suspended' : 'expired';
        } else if (ent.subscriptionStatus === 'pending') {
          accs[accId].pkg_status = 'pending';
        } else if (ent.subscriptionStatus === 'active' || ent.subscriptionStatus === 'expiring_soon') {
          accs[accId].pkg_status = ent.subscriptionStatus === 'expiring_soon' ? 'active' : 'active';
        }
        saveAccounts(accs);
        return ent;
      }).catch(function(){ return null; });
    } catch(e) { return Promise.resolve(null); }
  }

  // ── المزايا المدفوعة (تُقفل عند انتهاء الباقة) ──────────────────
  var PAID_FEATURES = {
    unlimited_products: ['شهرية','ربعية','سنوية','ماسية','💎 ماسية'],
    intro_video       : ['شهرية','ربعية','سنوية','ماسية','💎 ماسية'],
    analytics         : ['شهرية','ربعية','سنوية','ماسية','💎 ماسية'],
    priority_listing  : ['ربعية','سنوية','ماسية','💎 ماسية'],
    extra_photos      : ['شهرية','ربعية','سنوية','ماسية','💎 ماسية'],
    vip_badge         : ['ربعية','سنوية','ماسية','💎 ماسية'], // ⭐ شارة مميز — مدفوعة
    auto_reply_calls  : ['ماسية','💎 ماسية'],
    // auto_reply_email أُزيلت من هنا 27/07/2026 — انظر التعليق المفصَّل عند
    // TIER_FEATURES أدناه (هذا الجدول محفوظ للتوافق الخلفي فقط، غير مستخدم داخلياً).
    vip_manager       : ['ماسية','💎 ماسية'],
    ai_agent_full     : ['ماسية','💎 ماسية'],
  };

  // ── localStorage helpers ──────────────────────────────────────────
  function getAccounts()  { try{return JSON.parse(localStorage.getItem('rizq_accounts')||'{}');}catch(e){return{};} }
  function saveAccounts(o){ localStorage.setItem('rizq_accounts',JSON.stringify(o)); }
  function getPending()   { try{return JSON.parse(localStorage.getItem('rizq_pending_accounts')||'[]');}catch(e){return[];} }
  function savePending(a) { localStorage.setItem('rizq_pending_accounts',JSON.stringify(a)); }

  // ── مفتاح الشهر الحالي (YYYY-MM) ────────────────────────────────
  function currentMonthKey() {
    var d = new Date();
    return d.getFullYear()+'-'+(d.getMonth()<9?'0':'')+(d.getMonth()+1);
  }

  // ── عدد الإعلانات المنشورة هذا الشهر (للحساب المنتهي) ───────────
  function getMonthlyAdCount(accId) {
    var key = 'rizq_free_ads_'+accId+'_'+currentMonthKey();
    return parseInt(localStorage.getItem(key)||'0', 10);
  }

  // ── تسجيل نشر إعلان جديد ─────────────────────────────────────────
  function recordAdPost(accId) {
    var key = 'rizq_free_ads_'+accId+'_'+currentMonthKey();
    var count = getMonthlyAdCount(accId) + 1;
    localStorage.setItem(key, String(count));
    return count;
  }

  // ── هل يمكن نشر إعلان جديد؟ ─────────────────────────────────────
  // يُستدعى قبل نشر أي إعلان في الداشبورد
  function canPostNewAd(accId) {
    var sub = checkSubscription(accId);
    // باقة نشطة → لا حد
    if(sub.status === 'active' || sub.status === 'trial' ||
       sub.status === 'expiring_soon' || sub.status === 'trial_expiring') {
      return { allowed: true, reason: 'active', remaining: Infinity };
    }
    // منتهية → حد شهري
    var used = getMonthlyAdCount(accId);
    var remaining = FREE_MONTHLY_ADS_LIMIT - used;
    if(remaining > 0) {
      return { allowed: true, reason: 'free_monthly', remaining: remaining, used: used };
    }
    return {
      allowed  : false,
      reason   : 'monthly_limit_reached',
      remaining: 0,
      used     : used,
      msg      : 'وصلت للحد الشهري ('+FREE_MONTHLY_ADS_LIMIT+' إعلانات). جدّد اشتراكك لنشر المزيد.'
    };
  }

  // ── الحدود العددية الدقيقة لكل باقة — تصحيح 25/07/2026 ──────────
  // المشكلة التي عولجت هنا: canPostNewAd() وحدها كانت تمنح "غير محدود"
  // لأي حساب لديه باقة نشطة من أي مستوى، متجاهلةً الأرقام الدقيقة التي
  // تَعِد بها كل باقة فعلياً في PKG_DEFAULTS (rizq_admin.html) — مثال:
  // "شهرية" للمحل تَعِد بـ50 منتجاً فقط، لا عدداً غير محدود. هذا الجدول
  // هو المصدر الوحيد للحقيقة للأرقام الدقيقة، ويجب إبقاؤه مطابقاً تماماً
  // لأسماء وأرقام PKG_DEFAULTS عند أي تعديل مستقبلي على الباقات.
  // ملاحظة "مميزة" (فرد): سعرها لكل إعلان لا لكل حساب — عمداً غير مذكورة
  // هنا؛ تُعامَل عبر POST_LIMIT_FALLBACK.individual=1 (نفس حد المجانية)
  // كي لا تمنح طاقة نشر حساب كاملة مقابل شراء تثبيت إعلان واحد فقط.
  var POST_LIMITS = {
    individual : {
      'مجانية': 5, 'مجاني': 5, 'free': 5, 'Free': 5,
      'Pro': Infinity, 'pro': Infinity, 'PRO': Infinity, 'باقة شهرية': Infinity,
      'Business': Infinity, 'business': Infinity, '🏢 Business': Infinity,
    },
    store      : { 'تجريبية':Infinity, 'شهرية':50, 'ربعية':200, 'سنوية':Infinity, 'ماسية':Infinity, 'الماسية 💎 (النائب الذكي الشامل)':Infinity },
    corp       : { 'تجريبية':Infinity, 'شهرية':30, 'ربعية':Infinity, 'سنوية':Infinity, 'ماسية':Infinity, 'الماسية 💎 (النائب الذكي الشامل)':Infinity },
    office     : { 'تجريبية':Infinity, 'شهرية':Infinity, 'ربعية':Infinity, 'سنوية':Infinity, 'ماسية':Infinity, 'الماسية 💎 (النائب الذكي الشامل)':Infinity },
  };
  // فئة غير معروفة بالجدول أو اسم باقة غير مطابق تماماً → القيمة الافتراضية.
  // للفرد فقط نفترض الأدنى (1) تحوطاً؛ لبقية الفئات نفترض "غير محدود" تفادياً
  // لحجب مشترك دافع فعلياً بسبب اختلاف بسيط في اسم الباقة (أكثر أماناً تجارياً
  // من حجب زبون دفع فعلاً بالخطأ).
  var POST_LIMIT_FALLBACK = { individual: 5 };

  var AI_FEATURES = [
    'auto_reply_calls', 'vip_manager', 'ai_agent_full', 'widget_channel',
    'whatsapp_channel', 'calls_channel', 'quota_dashboard',
  ];
  var AI_PRO_ONLY = ['auto_reply_calls', 'calls_channel'];

  function isDiamondName(name) {
    return /ماس|diamond|diamant/i.test(String(name || ''));
  }

  function resolveDiamondTierClient(pkgName, pkgId) {
    var id = String(pkgId || '').toLowerCase();
    var name = String(pkgName || '');
    if (/diamond_pro|diam-pro|_pro\b/.test(id) || (/pro|متقدم/i.test(name) && isDiamondName(name))) return 'diamond_pro';
    if (isDiamondName(name) || /diamond_standard|diam-std|st-diam|of-diam|cp-diam/.test(id)) return 'diamond_standard';
    return null;
  }

  function getPostLimit(accId, category) {
    var sub = checkSubscription(accId);
    var table = POST_LIMITS[category];
    if(!table) return Infinity;
    var name = String(sub.pkg||'').replace('💎 ','').trim();
    if (isDiamondName(name)) return Infinity;
    if(Object.prototype.hasOwnProperty.call(table, name)) return table[name];
    return Object.prototype.hasOwnProperty.call(POST_LIMIT_FALLBACK, category) ? POST_LIMIT_FALLBACK[category] : Infinity;
  }

  // ── الفحص الموحّد قبل نشر أي منتج/إعلان/عرض — يجمع بين حد الخطة
  // المجانية الشهرية (canPostNewAd) والحد العددي الدقيق لكل باقة نشطة ──
  // category: 'individual' | 'store' | 'office' | 'corp'
  // currentActiveCount: عدد العناصر النشطة الحالية لهذا الحساب (يحسبه المستدعي
  // من مصفوفته الحقيقية في localStorage — هذه الدالة لا تفترض شكل التخزين)
  function checkPostLimit(accId, category, currentActiveCount) {
    var base = canPostNewAd(accId);
    if(!base.allowed) return base;               // منتهية وتجاوز الحد الشهري المجاني
    if(base.reason === 'free_monthly') return base; // لا باقة نشطة — يُطبَّق الحد الشهري العام فقط
    var limit = getPostLimit(accId, category);
    currentActiveCount = Number(currentActiveCount) || 0;
    if(limit !== Infinity && currentActiveCount >= limit) {
      return {
        allowed : false,
        reason  : 'tier_limit_reached',
        limit   : limit,
        used    : currentActiveCount,
        msg     : 'وصلت لحد '+limit+' عنصر/عناصر نشطة المسموح به في باقتك الحالية. أوقِف عنصراً قديماً أو رقِّ لباقة أعلى للنشر أكثر.'
      };
    }
    return { allowed:true, reason:'active', limit:limit, used:currentActiveCount, remaining: (limit===Infinity?Infinity:limit-currentActiveCount) };
  }

  // ── قوائم الباقات الست — مصدر الحقيقة الوحيد (تُدار من لوحة التحكم) ──
  // أي إضافة فئة جديدة مستقبلاً تكفي بإضافتها هنا فقط (نقطة واحدة، بلا تكرار)
  var PKG_LISTS = ['rizq_packages','rizq_video_packages','rizq_individual_packages','rizq_office_packages','rizq_store_packages','rizq_corp_packages','rizq_tender_packages'];

  // ── البحث عن تعريف الباقة الكامل عبر كل الفئات (بالاسم) ─────────
  // يُرجع: { price, durationDays, active, list, siblings } أو null إن لم توجد
  function _findPackageDef(pkgName) {
    var name = String(pkgName||'').replace('💎 ','').trim();
    for (var i=0;i<PKG_LISTS.length;i++){
      try{
        var raw = localStorage.getItem(PKG_LISTS[i]);
        if(!raw) continue;
        var arr = JSON.parse(raw);
        if(!Array.isArray(arr)) continue;
        var found = arr.find(function(p){ return p && String(p.name||'').replace('💎 ','').trim()===name; });
        if(found) return { price:Number(found.price)||0, durationDays:found.durationDays, active:found.active!==false, list:PKG_LISTS[i], siblings:arr };
      }catch(e){}
    }
    return null;
  }

  // ── حساب مدة الباقة (تعمل مع كل الفئات الست) ─────────────────────
  function getDurationDays(pkgName) {
    var name = String(pkgName||'');
    // 0) طابق أولاً مع الباقات المُدارة من لوحة التحكم (حقل durationDays القابل للتعديل)
    var def = _findPackageDef(name);
    if(def && def.durationDays) return def.durationDays;
    // طابق بدقة في القاموس الداخلي
    if(PKG_DURATIONS[name] !== undefined) return PKG_DURATIONS[name];
    // طابق جزئياً
    if(name.indexOf('ماسي')!==-1) return 30;
    if(name.indexOf('سنوي')!==-1) return 365;
    if(name.indexOf('ربع')!==-1)  return 90;
    if(name.indexOf('شهر')!==-1)  return 30;
    if(name.indexOf('تجريب')!==-1||name.indexOf('مجان')!==-1) return 3;
    return 30; // افتراضي
  }

  // ── تصنيف الباقة لمستوى مزايا (0=مجاني، 1=أساسي، 2=متوسط، 3=الأعلى) ──
  // يعتمد على ترتيب السعر *داخل فئتها* بدل اسمها — لذا يعمل تلقائياً مع
  // أي فئة (عام/أفراد/مكاتب/محلات/شركات/فيديو) وأي اسم تضعه الإدارة للباقة،
  // دون الحاجة لتحديث هذا الملف كل مرة تُضاف باقة جديدة بفئة موجودة.
  function getPackageTier(pkgName) {
    var name = String(pkgName||'');
    if(name.indexOf('تجريب')!==-1 || name.indexOf('مجان')!==-1) return 0;
    // إصلاح: "الماسية" ليست باقة مدة (شهر/ربع/سنة) بل إضافة مزايا مستقلة —
    // يجب أن تبقى دائماً المستوى الأعلى (3: وكيل ذكي/رد مكالمات/مدير VIP)
    // بصرف النظر عن ترتيب سعرها بين باقات المدة. سابقاً كانت تُحسب عبر ترتيب
    // السعر ضمن القائمة الكاملة (تشمل باقات المدة)، فإذا كان سعر الماسية أقل
    // من "سنوية" مثلاً، تُصنَّف خطأً في المستوى 2 ولا تمنح مزايا الذكاء
    // الاصطناعي رغم أنها الباقة المُعلَنة والمُسوَّقة لهذه المزايا تحديداً —
    // هذا بالضبط اللبس الذي كان يظهر في واجهة "الخدمات المتاحة" بالداشبورد.
    if(isDiamondName(name)) return 3;
    var def = _findPackageDef(name);
    if(!def) {
      // اسم غير موجود في أي قائمة (بيانات قديمة) → رجوع لمطابقة الكلمات القديمة
      if(name.indexOf('سنوي')!==-1||name.indexOf('ربع')!==-1) return 2;
      if(name.indexOf('شهر')!==-1) return 1;
      return 1;
    }
    if(!def.price || def.price<=0) return 0;
    var paid = (def.siblings||[]).filter(function(p){
      return p && p.active!==false && Number(p.price)>0;
    }).sort(function(a,b){ return Number(a.price)-Number(b.price); });
    var n = paid.length;
    if(n<=1) return 3; // الباقة المدفوعة الوحيدة بالفئة → كاملة المزايا
    var rank = paid.findIndex(function(p){ return String(p.name||'').replace('💎 ','').trim()===name.replace('💎 ','').trim(); });
    if(rank<0) rank = 0;
    return 1 + Math.round(rank*2/(n-1)); // يوزّع 1..3 بالتساوي على عدد الباقات المدفوعة
  }

  // ── مزايا كل مستوى — نقطة واحدة موحّدة لكل الفئات ────────────────
  // ⚠️ إصلاح جوهري 27/07/2026 (متابعة المهمتين #219/#224): أُزيلت
  // 'auto_reply_email' عمداً من مستوى 3. لم تكن هذه ميزة "غير مفعَّلة" فقط —
  // هي غير مبنية أصلاً: rizq_email_handler.js يرد فقط على بريد الدعم العام
  // لرزق (direction@rizq.mr)، ولا يوجد أي مفهوم "بريد كل مشترك الخاص" في
  // الكود، ولا أي واجهة لجمع/تخزين بيانات اعتماد بريد المشتركين (IMAP/SMTP/
  // OAuth) في كامل المنصة. كتالوج الباقات الحقيقي المعروض للزبائن (PKG_DEFAULTS
  // في rizq_admin.html، باقات "ماسية") لا يَعِد بهذه الميزة أصلاً — فقط "رد
  // تلقائي على المكالمات" — فلا يوجد وعد تسويقي مكسور للزبون حالياً. إبقاء
  // العلم هنا كان سيجعل hasFeature(accId,'auto_reply_email') يعيد true زوراً
  // لأي كود مستقبلي يعتمد عليه دون علم أنه غير حقيقي. إن قرر Limam بناء هذه
  // الميزة فعلياً مستقبلاً، يجب أولاً بناء نظام ربط بريد المشترك (تسجيل +
  // تحقق + تخزين آمن مشفَّر لبيانات الاعتماد) — مشروع مستقل قبل إعادة هذا العلم.
  var TIER_FEATURES = {
    1: ['unlimited_products','intro_video','analytics','extra_photos'],
    2: ['unlimited_products','intro_video','analytics','extra_photos','priority_listing','vip_badge'],
    3: ['unlimited_products','intro_video','analytics','extra_photos','priority_listing','vip_badge','vip_manager','ai_agent_full','widget_channel','whatsapp_channel','quota_dashboard'],
  };
  var TIER_FEATURES_PRO_ONLY = ['auto_reply_calls','calls_channel'];

  // ── تفعيل الباقة (يُستدعى من الأدمن أو مدير رزق الذكي) ─────────
  function activatePackage(accId, pkgName, activatedBy, priceOverride) {
    if(!accId || !pkgName) return false;
    var accounts = getAccounts();
    var days = getDurationDays(pkgName);
    var now  = new Date();
    var ends = new Date(now.getTime() + days * 86400000);
    var isTrial = pkgName.indexOf('تجريب')!==-1 || pkgName.indexOf('مجان')!==-1;

    // إذا كان هناك حساب موجود وباقته لم تنتهِ بعد → مد المدة من نهايتها
    if(accounts[accId] && accounts[accId].pkg_ends_at) {
      var existing = new Date(accounts[accId].pkg_ends_at);
      if(existing > now) {
        ends = new Date(existing.getTime() + days * 86400000);
      }
    }

    // سجل تاريخي لكل تفعيل/تجديد — هذا ما يجعل الوكيل "يعرف عدد الباقات" التي مرّ بها المشترك
    var history = (accounts[accId] && Array.isArray(accounts[accId].pkg_history)) ? accounts[accId].pkg_history : [];
    history.push({ pkg: pkgName, activatedAt: now.toISOString(), endsAt: ends.toISOString(), days: days, by: activatedBy || 'admin' });

    var accExisting = accounts[accId] || {};
    var diamondOn = isDiamondName(pkgName) && !isTrial;
    var diamondTier = diamondOn ? resolveDiamondTierClient(pkgName) : null;
    accounts[accId] = Object.assign(accExisting, {
      id          : accId,
      package     : pkgName,
      pkg_status  : isTrial ? 'trial' : 'active',
      trial       : isTrial,
      pkg_days    : days,
      pkg_activated_at : now.toISOString(),
      pkg_ends_at : ends.toISOString(),
      planType    : resolvePlanType(pkgName, accExisting.type) || (diamondOn ? (diamondTier === 'diamond_pro' ? 'diamond_pro' : 'diamond_standard') : 'free'),
      subscriptionStatus: isTrial ? 'active' : 'active',
      paymentConfirmed: !isTrial && (activatedBy === 'admin' || (priceOverride != null && priceOverride !== '')),
      activated_by: activatedBy || 'admin',
      reminder_sent: false,
      pkg_history : history,
      pkg_count   : history.length,
      plan        : diamondOn ? 'diamond' : (accExisting.plan || pkgName),
      planName    : pkgName,
      tier        : diamondOn ? 'diamond' : (accExisting.tier || ''),
      diamond     : diamondOn,
      diamondTier : diamondTier,
      widget_enabled : diamondOn ? true : !!accExisting.widget_enabled,
      whatsapp_enabled : diamondOn ? true : !!accExisting.whatsapp_enabled,
      calls_enabled : (diamondTier === 'diamond_pro') ? true : !!accExisting.calls_enabled,
      audioAccess : diamondTier === 'diamond_pro',
      quota_guard : diamondOn ? true : !!accExisting.quota_guard,
      ai_model    : diamondOn ? 'advanced' : (accExisting.ai_model || ''),
      channels    : diamondOn ? { widget: true, whatsapp: true, calls: true } : (accExisting.channels || {})
    });
    saveAccounts(accounts);

    // تحديث rizq_pending_accounts أيضاً
    var pending = getPending();
    var acc = pending.find(function(a){return a.id===accId;});
    if(acc){
      acc.status      = 'approved';
      acc.plan        = pkgName;
      acc.pkg_status  = isTrial ? 'trial' : 'active';
      acc.trial_ends  = ends.toISOString();
      acc.approvedAt  = now.toISOString();
      savePending(pending);
    }

    console.log('[RIZQ-SUB] Activated "'+pkgName+'" for '+accId+' → ends '+ends.toLocaleDateString('ar-SA-u-nu-latn'));

    // ── توليد إيصال تأكيد دفع تلقائي (يتجاوز الباقات التجريبية المجانية) ──
    if(!isTrial && global.RizqInvoice && typeof global.RizqInvoice.generateInvoice === 'function'){
      try{
        var pdef = _findPackageDef(pkgName);
        var finalPrice = (priceOverride!=null && priceOverride!=='') ? Number(priceOverride) : (pdef ? pdef.price : 0);
        var accInfo = accounts[accId] || {};
        global.RizqInvoice.generateInvoice({
          accountId   : accId,
          accountName : accInfo.name || accId,
          accountPhone: accInfo.phone || '',
          accountEmail: accInfo.email || '',
          accountType : accInfo.type || '',
          pkgName     : pkgName,
          price       : finalPrice,
          days        : days,
          periodStart : now.toISOString(),
          periodEnd   : ends.toISOString(),
          activatedBy : activatedBy || 'admin'
        });
      }catch(e){}
    }

    // ── إصلاح: كان الإيصال أعلاه يبقى فقط في localStorage لمتصفح من فعّل
    // (غالباً الأدمن) ولا يصل للمشترك إطلاقاً — لا داشبورد حقيقي، لا واتساب،
    // لا بريد. هذا يُزامن نفس بيانات التفعيل مع rizq_package_lifecycle_agent.js
    // (خادم rizq-backend) الذي يولّد فاتورة مستقلة على الخادم ويُسلّمها فوراً
    // عبر واتساب/بريد، ويُفعّل أيضاً متابعة دورة حياة الباقة (تذكير قبل
    // الانتهاء + إيقاف فوري عند periodEnd) — بأفضل جهد، لا يُفشل التفعيل
    // نفسه إن تعذّر الاتصال بالخادم (نفس مبدأ التدهور السلس المتبع في كل
    // اتصالات الخادم الأخرى بهذا المشروع).
    try{
      var _cfg = (typeof getAgentConfig === 'function') ? getAgentConfig() : null;
      if(_cfg && _cfg.enabled !== false && _cfg.backendUrl){
        var _accInfo2 = accounts[accId] || {};
        fetch(_cfg.backendUrl.replace(/\/$/,'') + '/api/account-package/sync', {
          method: 'POST',
          headers: Object.assign({'Content-Type':'application/json'}, _cfg.backendSecret ? {'x-rizq-secret': _cfg.backendSecret} : {}),
          body: JSON.stringify({
            accountId   : accId,
            accountName : _accInfo2.name || accId,
            accountPhone: _accInfo2.phone || '',
            accountEmail: _accInfo2.email || '',
            accountType : _accInfo2.type || '',
            pkgName     : pkgName,
            price       : (priceOverride!=null && priceOverride!=='') ? Number(priceOverride) : ((_findPackageDef(pkgName)||{}).price || 0),
            days        : days,
            periodStart : now.toISOString(),
            periodEnd   : ends.toISOString(),
            activatedBy : activatedBy || 'admin',
            paymentConfirmed: true,
            paidAt: now.toISOString(),
            isTrial: isTrial,
          })
        }).then(function(res){ return res.ok ? res.json() : null; }).then(function(data){
          // نحفظ accessToken الذي يُصدره الخادم لهذا الحساب تحديداً — يلزم
          // لاحقاً لداشبورد المشترك ليقرأ فواتيره الحقيقية عبر
          // GET /api/account-package/:id دون استخدام سرّ الأدمن العام.
          if(data && data.ok && data.accessToken){
            try{
              var freshAccounts = getAccounts();
              if(freshAccounts[accId]){
                freshAccounts[accId].server_token = data.accessToken;
                saveAccounts(freshAccounts);
              }
            }catch(e){}
          }
          if (diamondOn && _accInfo2.phone) {
            fetch(_cfg.backendUrl.replace(/\/$/,'') + '/api/subscriber/register', {
              method: 'POST',
              headers: Object.assign({'Content-Type':'application/json'}, _cfg.backendSecret ? {'x-rizq-secret': _cfg.backendSecret} : {}),
              body: JSON.stringify({
                subscriberId: String(_accInfo2.phone).replace(/[^0-9+]/g,'').slice(0, 40),
                businessName: _accInfo2.name || accId,
                accountId: accId,
                plan: 'diamond',
                tier: 'diamond',
                package: pkgName,
                pkgName: pkgName,
                widget_enabled: true,
                whatsapp_enabled: true,
                calls_enabled: true,
                channels: { widget: true, whatsapp: true, calls: true }
              })
            }).catch(function(){});
          }
        }).catch(function(){ /* صامت — لا يوجد خادم أو انقطاع شبكة، التفعيل المحلي يبقى سارياً */ });
      }
    }catch(e){}

    return { ok:true, ends:ends.toISOString(), days:days };
  }

  // ── فحص حالة الاشتراك ──────────────────────────────────────────
  // Returns: { status, daysLeft, pkg, endsAt, features }
  // status: 'active' | 'expiring_soon' | 'expired' | 'trial' | 'trial_expiring' | 'no_subscription'
  function checkSubscription(accId) {
    var accounts = getAccounts();
    var acc = accounts[accId];
    if(!acc || !acc.package) return { status:'no_subscription', daysLeft:0, pkg:null, features:FREE_FEATURES, acc: acc };

    if (acc.pkg_status === 'pending' || acc.subscriptionStatus === 'pending') {
      return { status: 'pending', daysLeft: 0, pkg: acc.package, features: FREE_FEATURES.slice(), acc: acc };
    }

    var now = new Date();
    var endsAt = acc.pkg_ends_at ? new Date(acc.pkg_ends_at) : null;
    var daysLeft = endsAt ? Math.ceil((endsAt - now) / 86400000) : 0;
    var isTrial = acc.trial || acc.pkg_status==='trial';

    var status;
    if(!endsAt || daysLeft < 0) {
      status = 'expired';
    } else if(daysLeft === 0) {
      status = 'expired'; // ينتهي اليوم = منتهٍ
    } else if(daysLeft <= 1) {
      status = isTrial ? 'trial_expiring' : 'expiring_soon';
    } else if(isTrial) {
      status = 'trial';
    } else {
      status = 'active';
    }

    // تحديد المزايا المتاحة
    // FREE_FEATURES دائماً مشمولة (بما فيها verified_badge و keep_old_ads)
    var features = FREE_FEATURES.slice();

    if(status !== 'expired' && status !== 'pending') {
      // باقة نشطة — لا AI في التجربة المجانية أبداً
      if(status === 'trial' || status === 'trial_expiring') {
        var trialTier = getPackageTier(acc.package);
        if(trialTier > 2) trialTier = 2;
        (TIER_FEATURES[trialTier]||[]).forEach(function(feat){
          if(AI_FEATURES.indexOf(feat)===-1 && features.indexOf(feat)===-1) features.push(feat);
        });
      } else {
        var tier = getPackageTier(acc.package);
        var tierFeats = (TIER_FEATURES[tier]||[]).slice();
        var isPro = resolveDiamondTierClient(acc.package) === 'diamond_pro';
        if(tier >= 3 && !isPro) {
          tierFeats = tierFeats.filter(function(f){ return TIER_FEATURES_PRO_ONLY.indexOf(f)===-1; });
        }
        if(tier >= 3 && isPro) {
          TIER_FEATURES_PRO_ONLY.forEach(function(f){
            if(tierFeats.indexOf(f)===-1) tierFeats.push(f);
          });
        }
        tierFeats.forEach(function(feat){
          if(features.indexOf(feat)===-1) features.push(feat);
        });
      }
    }
    // عند الانتهاء: فقط FREE_FEATURES — verified_badge مشمولة فيها دائماً

    // إضافة بيانات الإعلانات الشهرية للحالة المنتهية
    var monthlyAdsUsed = 0;
    var monthlyAdsRemaining = Infinity;
    if(status === 'expired') {
      monthlyAdsUsed = getMonthlyAdCount(accId);
      monthlyAdsRemaining = Math.max(0, FREE_MONTHLY_ADS_LIMIT - monthlyAdsUsed);
    }

    return {
      status              : status,
      daysLeft            : Math.max(0, daysLeft),
      pkg                 : acc.package,
      endsAt              : endsAt ? endsAt.toISOString() : null,
      features            : features,
      isTrial             : isTrial,
      acc                 : acc,
      monthlyAdsUsed      : monthlyAdsUsed,
      monthlyAdsRemaining : monthlyAdsRemaining,
      freeAdsLimit        : FREE_MONTHLY_ADS_LIMIT,
    };
  }

  // ── إيقاف الباقة (عند الانتهاء) ──────────────────────────────────
  function expirePackage(accId) {
    var accounts = getAccounts();
    if(!accounts[accId]) return;
    accounts[accId].pkg_status  = 'expired';
    accounts[accId].planType    = 'free';
    accounts[accId].subscriptionStatus = 'expired';
    accounts[accId].expired_at  = new Date().toISOString();
    accounts[accId].expired_pkg = accounts[accId].package;
    // لا نحذف package لكي يعرف الأدمن ماذا كانت باقته
    saveAccounts(accounts);

    // تحديث pending أيضاً
    var pending = getPending();
    var acc = pending.find(function(a){return a.id===accId;});
    if(acc){ acc.pkg_status='expired'; savePending(pending); }

    console.log('[RIZQ-SUB] Package expired for '+accId);
  }

  // ── إرسال تذكير التجديد (يُسجَّل في localStorage فقط) ───────────
  function markReminderSent(accId) {
    var accounts = getAccounts();
    if(accounts[accId]) {
      accounts[accId].reminder_sent = true;
      accounts[accId].reminder_sent_at = new Date().toISOString();
      saveAccounts(accounts);
    }
  }

  // ── الفحص الكامل عند فتح الداشبورد ──────────────────────────────
  function runLifecycleCheck(accId, callbacks) {
    if(!accId) return;
    var sub = checkSubscription(accId);
    // إذا أوقف الأدمين الوكيل: لا تذكيرات ولا إيقاف تلقائي — كل القرارات تصبح يدوية بالكامل
    if(!isAgentEnabled()) return sub;
    var accounts = getAccounts();
    var acc = accounts[accId] || {};
    callbacks = callbacks || {};

    switch(sub.status) {
      case 'active':
        if(callbacks.onActive) callbacks.onActive(sub);
        break;
      case 'trial':
        if(callbacks.onTrial) callbacks.onTrial(sub);
        break;
      case 'expiring_soon':
      case 'trial_expiring':
        if(!acc.reminder_sent) {
          markReminderSent(accId);
          if(callbacks.onExpiringReminder) callbacks.onExpiringReminder(sub);
        } else {
          if(callbacks.onActive) callbacks.onActive(sub);
        }
        break;
      case 'expired':
        if(acc.pkg_status !== 'expired') expirePackage(accId);
        if(callbacks.onExpired) callbacks.onExpired(sub);
        break;
      case 'no_subscription':
        if(callbacks.onNoSubscription) callbacks.onNoSubscription(sub);
        break;
    }
    return sub;
  }

  // ── hasFeature ────────────────────────────────────────────────────
  function hasFeature(accId, featureName) {
    var sub = checkSubscription(accId);
    return sub.features.indexOf(featureName) !== -1;
  }

  // ── الشارتان الحقيقيتان — تصحيح 25/07/2026 (توضيح صريح من Limam) ──
  // رزق تملك نوعين مختلفين تماماً من "التوثيق"، ويجب عدم الخلط بينهما:
  //   1) verified — توثيق الهوية: بطاقة هوية للأفراد، سجل تجاري (أو ما
  //      يثبت الكيان) للمحلات/المكاتب/الشركات. مجاني دائماً لكل حساب
  //      وافق عليه الأدمن (acc.status==='approved') — لا علاقة له بالدفع
  //      إطلاقاً، ويبقى قائماً حتى لو انتهت باقة الحساب أو لم يشترك أصلاً.
  //   2) premium — شارة "مميّز برزق" الحصرية: ميزة مدفوعة صرفة يمنحها
  //      رزق فقط لمشتركي باقة تتضمن vip_badge ضمن TIER_FEATURES (المستوى
  //      2 فما فوق في كل الفئات) — تختفي تلقائياً عند انتهاء الباقة.
  // أي عرض للشارتين في الواجهة (browse/listing/products/showroom) يجب أن
  // يستدعي هذه الدالة تحديداً بدل قراءة حقل ثابت مخزَّن على الإعلان/المنتج،
  // كي تبقى الحالة حيّة دائماً (تختفي فوراً عند الانتهاء، تظهر فوراً عند الترقية).
  // ── إضافة 28/07/2026: شارة ثالثة "موثّق⁺" (Verified+) — تحقق هوية مُعزَّز
  // مدفوع، منفصل تماماً عن verified (مجاني، حالة acc.status) وعن premium
  // (vip_badge، مرتبط بمستوى الباقة). تُفعَّل فقط عبر موافقة الأدمن على طلب
  // شراء (rizq_admin.html، activateVerifiedPlusForRequest) أو منحاً يدوياً —
  // تنتهي تلقائياً عند تجاوز verifiedPlusExpiresAt (تُحسَب حيّة، لا تُخزَّن
  // كحالة نهائية) تماماً كمنطق حساب حالة الباقة العامة أعلاه.
  function getBadges(accId) {
    var accounts = getAccounts();
    var acc = accounts[accId];
    var verifiedPlusActive = !!(acc && acc.verifiedPlus && acc.verifiedPlusExpiresAt && new Date(acc.verifiedPlusExpiresAt) > new Date());
    return {
      verified: !!(acc && acc.status === 'approved'),
      premium : hasFeature(accId, 'vip_badge'),
      verifiedPlus: verifiedPlusActive,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // "مميزة" — تثبيت إعلان واحد محدَّد لمدة 3 أيام (500 MRU) — إعادة تصميم
  // جوهرية 27/07/2026 (طلب صريح من Limam، مهمة #219):
  // كانت "مميزة" تُعامَل تماماً كأي باقة حساب أخرى عبر activatePackage() —
  // أي شراءها كان (أ) يكتب فوق accounts[accId].package بالكامل، فلو كان
  // الحساب مشتركاً فعلاً في "باقة شهرية" نشطة، شراء تثبيت إعلان بـ500 أوقية
  // كان يُلغي باقته الحقيقية ويستبدلها بـ"مميزة" لمدة 3 أيام فقط! (ب) حتى
  // لو لم يكن هناك تعارض، حساب المستوى (getPackageTier) كان يُصنّف "مميزة"
  // ضمن باقات فردية أخرى بسعر 500/2000 فيحصل على tier=1 فقط، وTIER_FEATURES
  // للمستوى 1 لا يتضمن vip_badge (يبدأ من المستوى 2) — أي أن شراء "مميزة"
  // لم يكن حتى يمنح شارة "مميز" أو تثبيتاً فعلياً! كلا الوعدين المُعلَنين
  // ("تثبيت أعلى النتائج" + "شارة إعلان مميز") لم يكونا يتحققان فعلياً.
  // الحل: تخزين مستقل تماماً بمفتاح adId (لا accountId) — لا علاقة له بباقة
  // الحساب العامة إطلاقاً، فيمكن أن يملك الحساب باقته الحقيقية + تثبيت إعلان
  // واحد معاً بلا أي تعارض، تماماً كعزل "باقة المناقصة" (accountId+'::tender').
  // ═══════════════════════════════════════════════════════════════════
  var AD_BOOSTS_KEY = 'rizq_ad_boosts';
  function getAdBoosts() { try{ return JSON.parse(localStorage.getItem(AD_BOOSTS_KEY)||'{}'); }catch(e){ return {}; } }
  function saveAdBoosts(o) { localStorage.setItem(AD_BOOSTS_KEY, JSON.stringify(o)); }

  // يُستدعى فقط بعد موافقة الأدمن على طلب تثبيت إعلان محدَّد (rizq_admin.html)
  function activateAdBoost(accountId, adId, days, price) {
    if(!accountId || !adId) return null;
    var boosts = getAdBoosts();
    var now = new Date();
    var ends = new Date(now.getTime() + (Number(days)||3) * 86400000);
    boosts[adId] = {
      adId: adId,
      accountId: accountId,
      activatedAt: now.toISOString(),
      endsAt: ends.toISOString(),
      price: Number(price)||0,
    };
    saveAdBoosts(boosts);
    return boosts[adId];
  }

  // هل هذا الإعلان بالذات مثبَّت الآن؟ (لا علاقة له بباقة صاحبه) — تُستخدم
  // في كل صفحات العرض العامة (browse/search/listing) كشرط OR إضافي مع شارة
  // "مميّز برزق" الحسابية (vip_badge) عند تحديد ترتيب/شارة "pin" لكل إعلان.
  function isAdBoosted(adId) {
    if(!adId) return false;
    var b = getAdBoosts()[adId];
    if(!b || !b.endsAt) return false;
    return new Date(b.endsAt) > new Date();
  }

  function getAdBoost(adId) { return getAdBoosts()[adId] || null; }

  // ── أرخص باقة حقيقية (من قوائم الأدمن) تمنح ميزة معينة ─────────────
  // نقطة موحّدة تستخدمها كل لوحات التحكم لعرض اسم الباقة الدقيقة المطلوبة
  // أمام كل خدمة مقفلة، بدل تحويل غامض لصفحة تعرض كل الباقات مجتمعة —
  // هذا هو المصدر الوحيد للحقيقة حول "أي باقة تفتح أي خدمة" (يتبع TIER_FEATURES
  // ونفس getPackageTier المستخدمة في hasFeature/checkSubscription، فيبقى
  // العرض في الداشبورد مطابقاً دائماً لما يُفعَّل فعلياً عند الدفع).
  function getMinPackageForFeature(accType, featureName) {
    var list = getAvailablePackages(accType).filter(function(p){
      return p && p.active !== false && Number(p.price) > 0;
    });
    var withTier = list.map(function(p){
      return { name: p.name, price: Number(p.price)||0, tier: getPackageTier(p.name) };
    }).filter(function(p){
      return (TIER_FEATURES[p.tier]||[]).indexOf(featureName) !== -1;
    }).sort(function(a,b){ return a.price - b.price; });
    return withTier.length ? withTier[0].name : null;
  }

  // ── باقات للتجديد (تعمل مع جميع الفئات الست) ─────────────────────
  function _packageCatalogMaps() {
    var cfg = global.RizqPackagesConfig;
    if (cfg && typeof cfg.getTypeToCatalog === 'function' && typeof cfg.getAccTypeToLsKey === 'function') {
      return {
        TYPE_TO_CATALOG: cfg.getTypeToCatalog(),
        TYPE_TO_LS: cfg.getAccTypeToLsKey()
      };
    }
    return {
      TYPE_TO_CATALOG: {
        general: 'general',
        individual: 'individual',
        office: 'office',
        store: 'store',
        corp: 'corp',
        video: 'video',
        tender: 'tender',
        verified_plus: 'verified_plus'
      },
      TYPE_TO_LS: {
        general: 'rizq_packages',
        individual: 'rizq_individual_packages',
        office: 'rizq_office_packages',
        store: 'rizq_store_packages',
        corp: 'rizq_corp_packages',
        video: 'rizq_video_packages',
        tender: 'rizq_tender_packages',
        verified_plus: 'rizq_verified_plus_packages'
      }
    };
  }

  function getAvailablePackages(accType) {
    var maps = _packageCatalogMaps();
    var TYPE_TO_CATALOG = maps.TYPE_TO_CATALOG;
    var TYPE_TO_LS = maps.TYPE_TO_LS;
    if (typeof global.RizqPackagesConfig !== 'undefined' && typeof global.RizqPackagesConfig.getCatalog === 'function') {
      try {
        var fromCfg = global.RizqPackagesConfig.getCatalog(TYPE_TO_CATALOG[accType] || 'general');
        if (fromCfg && fromCfg.length) return fromCfg;
      } catch (e) { /* fall through */ }
    }
    var lsKey = TYPE_TO_LS[accType] || 'rizq_packages';
    try {
      var fromLs = JSON.parse(localStorage.getItem(lsKey) || 'null');
      if (fromLs && fromLs.length) return fromLs;
    } catch (eLs) { /* fall through */ }
    if (typeof global.RizqPackagesConfig !== 'undefined' && global.RizqPackagesConfig.CATALOGS) {
      var catKey = TYPE_TO_CATALOG[accType] || 'general';
      var defaults = global.RizqPackagesConfig.CATALOGS[catKey];
      if (defaults && defaults.length) return JSON.parse(JSON.stringify(defaults));
    }
    return [];
  }

  // ── بناء بطاقات الباقات (HTML مشترك — يستخدمه store/corp/office) ──
  // كل لوحة تحكم تحتفظ بقاموسها الخاص FEATS/ICONS (نصوص تسويقية تختلف حسب نوع النشاط)
  // وبقائمة باقاتها الفعلية (من localStorage أو DEF الافتراضي الخاص بها) — هذه الدالة فقط
  // توحّد منطق توليد الـ HTML/CSS المتكرر حرفياً في الثلاث لوحات لتفادي تكراره 3 مرات.
  function renderPackageCardsHTML(list, FEATS, ICONS, lang, category) {
    category = category || 'package'; // 'package' (عادي) أو 'video' (Rizq ADS)
    FEATS = FEATS || {}; ICONS = ICONS || {};
    // إصلاح: هذه الدالة مشتركة بين لوحات المحل/المكتب/الشركة، ولكل منها متغير
    // لغتها الخاص (_storeLang/_officeLang/_corpLang) — لذلك تستقبل lang كوسيط
    // رابع من المستدعي بدل الاعتماد على متغير عام غير موجود هنا.
    var _t2 = function(ar, fr){ return (lang === 'fr') ? fr : ar; };
    // ترجمة أسماء/مدد الباقات الافتراضية المعروفة (الباقات المخصّصة التي يضيفها
    // الأدمين بأسماء حرة تبقى بلغتها الأصلية، كبقية المحتوى الذي يُدخله المستخدم
    // عبر المنصة — نفس المنطق المعتمد في باقي الصفحات).
    var NAME_FR = {'تجريبية':'Essai','شهرية':'Mensuel','ربعية':'Trimestriel','سنوية':'Annuel','ماسية':'Diamant','💎 ماسية':'💎 Diamant','الماسية 💎 (النائب الذكي الشامل)':'Diamant 💎 (Adjoint intelligent complet)','مجانية':'Gratuite','مميزة':'Boost','باقة شهرية':'Mensuel'};
    var DUR_FR = {'3 أيام':'3 jours','شهر':'mois','شهرياً':'Mensuel','3 أشهر':'3 mois','12 شهر':'12 mois','7 أيام':'7 jours','لكل إعلان':'par annonce'};
    function trName(n){ if(lang!=='fr') return n; var k=(n||'').trim(); return NAME_FR[k]!==undefined?NAME_FR[k]:n; }
    function trDur(d){ if(lang!=='fr') return d; var k=(d||'').trim(); return DUR_FR[k]!==undefined?DUR_FR[k]:d; }
    function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
    var CSS='<style>'
      +'.rpkg-card{position:relative;border-radius:20px;padding:24px 18px 20px;text-align:center;transition:transform .22s,box-shadow .22s}'
      +'.rpkg-card:hover{transform:translateY(-7px);box-shadow:0 20px 48px rgba(27,58,107,.2)!important}'
      +'.rpkg-feat{display:flex;align-items:flex-start;gap:7px;font-size:11.5px;text-align:right;padding:3px 0;line-height:1.4}'
      +'</style>';
    var html=(list||[]).map(function(p){
      if (typeof global.RizqPackagesConfig !== 'undefined' && typeof global.RizqPackagesConfig.enrichForDisplay === 'function') {
        p = global.RizqPackagesConfig.enrichForDisplay(p, lang);
      }
      var isFree=p.price===0||p.price==='0';
      var isYear=p.name==='سنوية';
      var isTrial=p.name==='تجريبية';
      var isDiamondPkg=!!(p.diamond||p.isDiamond||String(p.name||'').indexOf('ماسي')!==-1);
      var bg=isDiamondPkg?'linear-gradient(145deg,#3b0764 0%,#6b21a8 100%)':isYear?'linear-gradient(145deg,#1B3A6B 0%,#0f2347 100%)':isTrial?'linear-gradient(145deg,#f0fdf4,#dcfce7)':p.highlight?'linear-gradient(145deg,#fffbeb,#fef3c7)':'linear-gradient(145deg,#f8faff,#eff3ff)';
      var border=isDiamondPkg?'2px solid rgba(192,132,252,.7)':isYear?'2px solid rgba(201,168,76,.6)':p.highlight?'2px solid #C9A84C':isTrial?'1.5px solid #86efac':'1.5px solid #bfcfef';
      var shadow=isDiamondPkg?'0 8px 28px rgba(107,33,168,.5)':isYear?'0 8px 28px rgba(15,35,71,.35)':p.highlight?'0 8px 28px rgba(201,168,76,.2)':'0 4px 16px rgba(27,58,107,.08)';
      var nameCol=isDiamondPkg?'#e9d5ff':isYear?'#fde68a':isTrial?'#15803d':p.highlight?'#92400e':'#1B3A6B';
      var priceCol=isDiamondPkg?'#c084fc':isYear?'#fbbf24':isTrial?'#16a34a':p.highlight?'#C9A84C':'#1d4ed8';
      var mutedCol=isDiamondPkg?'rgba(233,213,255,.55)':isYear?'rgba(255,255,255,.45)':isTrial?'#4ade80':'#9ca3af';
      var featCol=isDiamondPkg?'rgba(233,213,255,.9)':isYear?'rgba(255,255,255,.8)':isTrial?'#166534':'#4b5563';
      var checkCol=isDiamondPkg?'#c084fc':isYear?'#fde68a':isTrial?'#22c55e':'#10b981';
      var btnBg=isDiamondPkg?'linear-gradient(135deg,#a855f7,#7c3aed)':isYear?'linear-gradient(135deg,#e8c96a,#C9A84C)':isTrial?'linear-gradient(135deg,#22c55e,#16a34a)':p.highlight?'linear-gradient(135deg,#C9A84C,#e8c96a)':'linear-gradient(135deg,#3b82f6,#1d4ed8)';
      var btnCol=isDiamondPkg?'#fff':isYear?'#0f2347':isTrial?'#fff':'#0f2347';
      var feats=(p.features&&p.features.length)?p.features:(FEATS[p.name]||FEATS['ماسية']||[]);
      var badge = isDiamondPkg
        ? (p.featuredBadge || _t2('الأكثر اختياراً للشركات','Le plus choisi par les entreprises'))
        : '';
      return '<div class="rpkg-card" style="background:'+bg+';border:'+border+';box-shadow:'+shadow+'">'
        +(p.highlight&&!isDiamondPkg?'<div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#C9A84C,#f0d060);color:#0f2347;font-size:10px;font-weight:900;padding:4px 16px;border-radius:20px;white-space:nowrap;box-shadow:0 3px 10px rgba(201,168,76,.45);letter-spacing:.5px">⭐ '+_t2('الأكثر طلباً','Le plus demandé')+'</div>':'')
        +(isDiamondPkg?'<div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#a855f7,#c084fc);color:#fff;font-size:10px;font-weight:900;padding:4px 14px;border-radius:20px;white-space:nowrap;box-shadow:0 3px 10px rgba(168,85,247,.5)">💎 '+esc(badge)+'</div>':'')
        +(isYear?'<div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-size:10px;font-weight:900;padding:4px 16px;border-radius:20px;white-space:nowrap;box-shadow:0 3px 10px rgba(124,58,237,.4)">💎 '+_t2('الأفضل قيمة','Meilleur rapport qualité-prix')+'</div>':'')
        +'<div style="font-size:38px;margin-bottom:10px;margin-top:'+(p.highlight||isYear||isDiamondPkg?'14':'2')+'px">'+(ICONS[p.name]||(isDiamondPkg?'💎':'📦'))+'</div>'
        +'<div style="font-size:18px;font-weight:900;color:'+nameCol+';margin-bottom:2px;letter-spacing:.3px">'+esc(trName(p.name))+'</div>'
        +(p.description?'<div style="font-size:11.5px;color:'+featCol+';line-height:1.55;margin:8px 0 12px;text-align:'+(lang==='fr'?'left':'right')+'">'+esc(p.description)+'</div>':'')
        +'<div style="font-size:11px;color:'+mutedCol+';margin-bottom:14px;font-weight:600;letter-spacing:.5px;text-transform:uppercase">'+esc(trDur(p.duration||''))+'</div>'
        +'<div style="height:1px;background:'+(isYear?'rgba(255,255,255,.12)':'rgba(27,58,107,.08)')+';margin-bottom:14px"></div>'
        +'<div style="margin-bottom:16px"><span style="font-size:30px;font-weight:900;color:'+priceCol+';line-height:1">'+(isFree?_t2('مجاناً','Gratuit'):Number(p.price).toLocaleString())+'</span>'
        +(!isFree?'<div style="font-size:10px;color:'+mutedCol+';margin-top:1px;font-weight:600">MRU / '+esc(trDur(p.duration||''))+'</div>':'')+'</div>'
        +(isDiamondPkg && p.roi ? '<div style="margin:0 0 14px;padding:10px 12px;border-radius:12px;background:rgba(251,191,36,.14);border:1px solid rgba(251,191,36,.4);font-size:11.5px;line-height:1.55;color:#fde68a;text-align:'+(lang==='fr'?'left':'right')+'">💼 '+esc(p.roi)+'</div>' : '')
        +'<div style="margin-bottom:18px;padding:0 4px;text-align:right">'+feats.map(function(f){return '<div class="rpkg-feat"><span style="color:'+checkCol+';font-size:14px;flex-shrink:0;margin-top:1px">✓</span><span style="color:'+featCol+'">'+f+'</span></div>';}).join('')+'</div>'
        +(isFree
          ?'<div style="background:rgba(16,185,129,.1);border:1.5px solid rgba(16,185,129,.3);border-radius:11px;padding:10px;font-size:12px;font-weight:800;color:#065f46">✓ '+_t2('الباقة الحالية','Forfait actuel')+'</div>'
          // إصلاح جوهري 27/07/2026 (#219): "مميزة" ليست باقة حساب — هي تثبيت
          // إعلان واحد محدَّد. زر خاص يفتح أولاً منتقي الإعلان (openAdBoostPicker،
          // مُعرَّفة في rizq_dashboard.html فقط) بدل فتح نموذج الدفع العام مباشرة
          // (الذي كان يربط الشراء بالحساب كله عبر activatePackage — الخطأ الأصلي).
          : (p.name==='مميزة'
              ? '<button onclick="if(typeof openAdBoostPicker===\'function\'){openAdBoostPicker(\''+esc(p.name)+'\','+p.price+')}else{openPayModal(\''+esc(p.name)+'\','+p.price+',\''+category+'\')}" style="width:100%;padding:11px;border-radius:11px;border:none;background:'+btnBg+';color:'+btnCol+';font-weight:900;font-size:13px;cursor:pointer;font-family:inherit;letter-spacing:.3px;box-shadow:0 3px 12px rgba(0,0,0,.18);transition:opacity .15s" onmouseover="this.style.opacity=\'.86\'" onmouseout="this.style.opacity=\'1\'">'+_t2('اختر إعلاناً لتثبيته ←','Choisir une annonce à épingler →')+'</button>'
              : '<button onclick="openPayModal(\''+esc(p.name)+'\','+p.price+',\''+category+'\')" style="width:100%;padding:11px;border-radius:11px;border:none;background:'+btnBg+';color:'+btnCol+';font-weight:900;font-size:13px;cursor:pointer;font-family:inherit;letter-spacing:.3px;box-shadow:0 3px 12px rgba(0,0,0,.18);transition:opacity .15s" onmouseover="this.style.opacity=\'.86\'" onmouseout="this.style.opacity=\'1\'">'+_t2('اشترك الآن ←','S\'abonner →')+'</button>'
            )
        )
        +'</div>';
    }).join('');
    var grid = CSS+'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:18px;padding-top:10px">'+html+'</div>';
    var renewal = '<p style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:8px">'+_t2('اختر الباقة:','Choisissez le forfait :')+'</p><div style="display:flex;flex-wrap:wrap;gap:8px">'+(list||[]).filter(function(p){return p.price>0;}).map(function(p){
      return '<label style="cursor:pointer;font-size:12.5px;padding:6px 10px;border:1px solid rgba(27,58,107,.15);border-radius:8px"><input type="radio" name="renewal-pkg" value="'+esc(p.name)+'" style="margin-left:5px"/>'+esc(trName(p.name))+' — '+Number(p.price).toLocaleString()+' MRU</label>';
    }).join('')+'</div>';
    return { grid: grid, renewal: renewal };
  }

  // ── عدد الباقات التي مرّ بها المشترك (من السجل التاريخي) ──────────
  function getPackageCount(accId) {
    var accounts = getAccounts();
    var acc = accounts[accId];
    if(!acc) return 0;
    return Array.isArray(acc.pkg_history) ? acc.pkg_history.length : (acc.package ? 1 : 0);
  }

  // ═══════════════════════════════════════════════════════════════════
  // تحكّم الأدمين الكامل بوكيل الباقات — تشغيل/إيقاف + تغذية بمعرفة جديدة
  // مصدر وحيد: rizq_subagent_config { enabled, notes, officialAccounts, backendUrl }
  // ═══════════════════════════════════════════════════════════════════
  var AGENT_CFG_KEY = 'rizq_subagent_config';
  var DEFAULT_AGENT_CFG = { enabled: true, notes: '', officialAccounts: [], backendUrl: '', backendSecret: '' };

  function getAgentConfig() {
    try {
      var raw = JSON.parse(localStorage.getItem(AGENT_CFG_KEY) || 'null');
      return raw ? Object.assign({}, DEFAULT_AGENT_CFG, raw) : Object.assign({}, DEFAULT_AGENT_CFG);
    } catch(e) { return Object.assign({}, DEFAULT_AGENT_CFG); }
  }
  function setAgentConfig(partial) {
    var cfg = Object.assign(getAgentConfig(), partial || {});
    localStorage.setItem(AGENT_CFG_KEY, JSON.stringify(cfg));
    return cfg;
  }
  function isAgentEnabled() { return getAgentConfig().enabled !== false; }

  // ── فواتير المشترك الحقيقية من الخادم (rizq_package_lifecycle_agent.js) ──
  // تُستخدَم من قسم "فواتيري" في داشبورد المحل/المكتب/المؤسسة. تعود بـ
  // Promise دائماً — تحاول الخادم أولاً (بتوكن الحساب الخاص، لا سرّ الأدمن)،
  // وإن تعذّر (لا خادم مضبوط بعد/لا توكن بعد/انقطاع شبكة) ترجع فوراً لفواتير
  // RizqInvoice المحلية إن وُجدت، بلا أي عطل ظاهر للمستخدم في كل الأحوال.
  function fetchInvoices(accId) {
    var localFallback = function(){
      try{
        return (global.RizqInvoice && typeof global.RizqInvoice.getInvoicesForAccount === 'function')
          ? global.RizqInvoice.getInvoicesForAccount(accId) : [];
      }catch(e){ return []; }
    };
    try{
      var cfg = getAgentConfig();
      var accounts = getAccounts();
      var token = accounts[accId] && accounts[accId].server_token;
      if(!cfg.backendUrl || !token) return Promise.resolve(localFallback());
      return fetch(cfg.backendUrl.replace(/\/$/,'') + '/api/account-package/' + encodeURIComponent(accId), {
        headers: { 'x-account-token': token }
      }).then(function(res){ return res.ok ? res.json() : null; }).then(function(data){
        return (data && data.ok && data.account && Array.isArray(data.account.invoices))
          ? data.account.invoices : localFallback();
      }).catch(function(){ return localFallback(); });
    }catch(e){ return Promise.resolve(localFallback()); }
  }

  // ── إحصائيات زيارات حقيقية للحساب (rizq_visit_tracker.js على الخادم) ──
  // تستبدل الأرقام المزيَّفة التي كانت بداشبوردات المحل/المكتب/الشركة —
  // بعضها ثابت بالكود (مثل "1,240" دائماً) وبعضها عشوائي (Math.random()
  // يتغيّر كل مرة يُفتح فيها الداشبورد) — بلا أي علاقة بزيارة حقيقية واحدة.
  // تعود بـ Promise دائماً: null إن تعذّر الوصول (لا خادم مضبوط بعد/لا
  // توكن/انقطاع شبكة) بدل رقم مزيَّف، ليعرض الداشبورد رسالة صادقة "غير
  // متاح بعد" بدل التظاهر ببيانات لا وجود لها.
  function fetchVisitStats(accId) {
    try{
      var cfg = getAgentConfig();
      var accounts = getAccounts();
      var token = accounts[accId] && accounts[accId].server_token;
      if(!cfg.backendUrl || !token) return Promise.resolve(null);
      return fetch(cfg.backendUrl.replace(/\/$/,'') + '/api/visit-stats/' + encodeURIComponent(accId), {
        headers: { 'x-account-token': token }
      }).then(function(res){ return res.ok ? res.json() : null; }).then(function(data){
        return (data && data.ok && data.stats) ? data.stats : null;
      }).catch(function(){ return null; });
    }catch(e){ return Promise.resolve(null); }
  }

  // ═══════════════════════════════════════════════════════════════════
  // فحوص احتيال إحصائية على وصل الدفع — بدون أي خادم أو مفتاح API
  // لا تثبت "تزويراً" بشكل قاطع؛ فقط ترفع علامات للمراجعة البشرية النهائية
  // ═══════════════════════════════════════════════════════════════════
  function _simpleHash(str) {
    // djb2 — سريع وكافٍ لاكتشاف تكرار نفس ملف الوصل، ليس للأمان التشفيري
    var h = 5381, s = String(str||'');
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h = h & h; }
    return 'h' + h;
  }

  function analyzeReceipt(reqData, allRequests) {
    var flags = [];
    var imgHash = reqData.receiptImage ? _simpleHash(reqData.receiptImage) : null;

    // 1) تكرار نفس صورة الوصل في طلب سابق (إعادة استخدام وصل قديم)
    if (imgHash) {
      var dup = (allRequests || []).find(function(r) {
        return r.id !== reqData.id && r.receiptImageHash === imgHash;
      });
      if (dup) flags.push({ level: 'high', msg: 'نفس صورة الوصل استُخدمت من قبل في طلب آخر (#' + dup.id + ')' });
    }

    // 2) المبلغ المُدخل لا يطابق سعر الباقة المختارة
    if (reqData.price != null && reqData.expectedPrice != null && Number(reqData.price) !== Number(reqData.expectedPrice)) {
      flags.push({ level: 'medium', msg: 'المبلغ (' + reqData.price + ') لا يطابق سعر الباقة الرسمي (' + reqData.expectedPrice + ')' });
    }

    // 3) لا يوجد وصل أصلاً لباقة مدفوعة
    if (Number(reqData.price) > 0 && !reqData.receiptImage) {
      flags.push({ level: 'high', msg: 'باقة مدفوعة بلا صورة وصل' });
    }

    // 4) حجم صورة صغير جداً بشكل مشبوه (قد تكون صورة فارغة/مقصوصة)
    if (reqData.receiptImage && reqData.receiptImage.length < 2000) {
      flags.push({ level: 'low', msg: 'حجم صورة الوصل صغير جداً — تحقق من وضوحها' });
    }

    var level = flags.some(function(f){return f.level==='high';}) ? 'high'
              : flags.some(function(f){return f.level==='medium';}) ? 'medium'
              : flags.length ? 'low' : 'clear';
    return { riskLevel: level, flags: flags, imgHash: imgHash };
  }

  // ── قراءة ملف كـ base64 (Promise) ──────────────────────────────────
  function _readFileAsDataURL(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // نقطة موحّدة لإرسال طلب تجديد/اشتراك جديد — تستخدمها كل لوحات التحكم
  // (كانت مكررة 3 مرات في store/office/corp وكانت تخزّن اسم الملف فقط
  //  بدون الصورة نفسها، فلا يمكن لأي أحد — بشري أو ذكي — مراجعتها فعلياً)
  // ═══════════════════════════════════════════════════════════════════
  var MAX_RECEIPT_BYTES = 1.5 * 1024 * 1024; // 1.5MB — حماية localStorage من الامتلاء

  function submitSubscriptionRequest(opts) {
    // opts: { file, pkgName, price, accountName, accountId, category, videoUrl }
    // category: 'package' (افتراضي — باقة عادية) أو 'video' (باقة Rizq ADS —
    // فيديو إعلاني يُفعَّل في الموضع المميز بالرئيسية بعد موافقة الأدمن)
    var base = {
      id: 'sub_' + Date.now(),
      pkg: opts.pkgName,
      price: opts.price,
      expectedPrice: opts.price,
      submittedAt: new Date().toISOString(),
      status: 'pending',
      account: opts.accountName || 'مشترك',
      accountId: opts.accountId || '',
      pkgCountBefore: getPackageCount(opts.accountId),
      category: opts.category || 'package',
      videoUrl: opts.videoUrl || null,
      // حقول خاصة بـ category:'ad_boost' (تثبيت إعلان واحد محدَّد — انظر
      // activateAdBoost أعلاه) — تُترك null/فارغة لأي طلب باقة عادي.
      adId: opts.adId || null,
      adTitle: opts.adTitle || '',
    };

    function finalize(receiptDataUrl) {
      var requests = [];
      try { requests = JSON.parse(localStorage.getItem('rizq_sub_requests') || '[]'); } catch(e) {}
      base.file = opts.file ? opts.file.name : null;
      base.receiptImage = receiptDataUrl || null;
      base.receiptImageHash = receiptDataUrl ? _simpleHash(receiptDataUrl) : null;
      var analysis = isAgentEnabled() ? analyzeReceipt(base, requests) : { riskLevel: 'unreviewed', flags: [], imgHash: base.receiptImageHash };
      base.riskLevel = analysis.riskLevel;
      base.flags = analysis.flags;
      requests.push(base);
      localStorage.setItem('rizq_sub_requests', JSON.stringify(requests));
      if (opts.accountId && (opts.category || 'package') === 'package') {
        try {
          var accsPending = getAccounts();
          if (accsPending[opts.accountId]) {
            accsPending[opts.accountId].pkg_status = 'pending';
            accsPending[opts.accountId].subscriptionStatus = 'pending';
            accsPending[opts.accountId].package = opts.pkgName;
            saveAccounts(accsPending);
          }
        } catch (pe) {}
      }
      _syncSubRequestToBackend(base);
      return base;
    }

    if (!opts.file) return Promise.resolve(finalize(null));

    if (opts.file.size > MAX_RECEIPT_BYTES) {
      // نضغط بالرفض اللطيف بدل تخزين ملف ضخم قد يكسر localStorage لكل المنصة
      return Promise.reject({ code: 'file_too_large', msg: 'حجم صورة الوصل كبير جداً (الحد 1.5MB) — رجاءً صغّرها وأعد المحاولة' });
    }

    return _readFileAsDataURL(opts.file).then(finalize);
  }

  // ── إصلاح جوهري: كان طلب الاشتراك/شراء الباقة محلياً 100% (rizq_sub_requests
  // في localStorage) — لا يراه الأدمن أبداً إلا إن فتح تحديداً نفس متصفح
  // المشترك الذي أرسل الطلب، وهو ما لن يحدث في نشر حقيقي متعدد الأجهزة.
  // نستخدم window.RIZQ_BACKEND_BASE (الثابت العام لصفحات الزوار/المشتركين
  // في rizq_backend_config.js) وليس RizqSub.getAgentConfig() — الأخير يقرأ
  // rizq_subagent_config الخاص بجهاز الأدمن فقط، وهو غير موجود إطلاقاً على
  // جهاز المشترك. فشل الشبكة أو عدم نشر الخادم بعد لا يكسر التقديم المحلي.
  function _syncSubRequestToBackend(req) {
    try {
      if (!global.RIZQ_BACKEND_BASE) return;
      fetch(global.RIZQ_BACKEND_BASE.replace(/\/$/, '') + '/api/sub-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      }).catch(function(){ /* صامت — لا خادم منشور بعد أو انقطاع شبكة */ });
    } catch (e) {}
  }

  // ═══════════════════════════════════════════════════════════════════
  // تحقق اختياري بالذكاء الاصطناعي عبر الخادم الخلفي (rizq-backend)
  // لا يعمل إطلاقاً إن لم يُضبط backendUrl — تدهور سلس (graceful) بلا أعطال
  // لا مفتاح Claude API هنا أبداً؛ فقط نتصل بخادمنا الذي يحمله بأمان
  // ═══════════════════════════════════════════════════════════════════
  function verifyReceiptWithAI(reqId) {
    var cfg = getAgentConfig();
    if (!cfg.backendUrl) return Promise.reject({ code: 'no_backend', msg: 'لم يُضبط رابط خادم الذكاء الاصطناعي بعد' });

    var requests = [];
    try { requests = JSON.parse(localStorage.getItem('rizq_sub_requests') || '[]'); } catch(e) {}
    var reqObj = requests.find(function(r){ return r.id === reqId; });
    if (!reqObj || !reqObj.receiptImage) return Promise.reject({ code: 'no_image', msg: 'لا توجد صورة وصل لهذا الطلب' });

    var url = cfg.backendUrl.replace(/\/$/, '') + '/api/verify-receipt';
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-rizq-secret': cfg.backendSecret || '' },
      body: JSON.stringify({ imageBase64: reqObj.receiptImage, expectedPrice: reqObj.price, pkgName: reqObj.pkg })
    }).then(function(res){
      if (!res.ok) throw new Error('backend_error_' + res.status);
      return res.json();
    }).then(function(data){
      reqObj.aiAnalysis = data.result || data;
      var idx = requests.findIndex(function(r){ return r.id === reqId; });
      requests[idx] = reqObj;
      localStorage.setItem('rizq_sub_requests', JSON.stringify(requests));
      return reqObj.aiAnalysis;
    });
  }

  // ── تصدير API ─────────────────────────────────────────────────────
  global.RizqSub = {
    activatePackage      : activatePackage,
    checkSubscription    : checkSubscription,
    canPostNewAd         : canPostNewAd,
    recordAdPost         : recordAdPost,
    getPostLimit         : getPostLimit,
    checkPostLimit       : checkPostLimit,
    getMonthlyAdCount    : getMonthlyAdCount,
    FREE_MONTHLY_ADS_LIMIT: FREE_MONTHLY_ADS_LIMIT,
    expirePackage        : expirePackage,
    runLifecycleCheck    : runLifecycleCheck,
    hasFeature           : hasFeature,
    getBadges            : getBadges,
    // ── تثبيت إعلان واحد محدَّد ("مميزة" — مهمة #219، منفصل تماماً عن باقة الحساب) ──
    activateAdBoost      : activateAdBoost,
    isAdBoosted          : isAdBoosted,
    getAdBoost           : getAdBoost,
    getAdBoosts          : getAdBoosts,
    getMinPackageForFeature: getMinPackageForFeature,
    getAvailablePackages : getAvailablePackages,
    renderPackageCardsHTML: renderPackageCardsHTML,
    getDurationDays      : getDurationDays,
    getPackageTier       : getPackageTier,
    isDiamondName        : isDiamondName,
    FREE_FEATURES        : FREE_FEATURES,
    TIER_FEATURES        : TIER_FEATURES,
    PAID_FEATURES        : PAID_FEATURES, // محفوظة للتوافق الخلفي — غير مستخدمة داخلياً بعد الآن
    PKG_DURATIONS        : PKG_DURATIONS,
    // ── تحكّم الأدمين الكامل بالوكيل ──
    getAgentConfig       : getAgentConfig,
    setAgentConfig       : setAgentConfig,
    isAgentEnabled       : isAgentEnabled,
    getPackageCount      : getPackageCount,
    fetchInvoices        : fetchInvoices,
    fetchVisitStats      : fetchVisitStats,
    // ── الوصل: فحص احتيال إحصائي + إرسال موحّد ──
    analyzeReceipt       : analyzeReceipt,
    submitSubscriptionRequest: submitSubscriptionRequest,
    verifyReceiptWithAI  : verifyReceiptWithAI,
    PLAN_MATRIX          : PLAN_MATRIX,
    resolvePlanType      : resolvePlanType,
    getPlanLimits        : getPlanLimits,
    getPhotoLimit        : getPhotoLimit,
    getVideoPolicy       : getVideoPolicy,
    syncEntitlementsFromServer: syncEntitlementsFromServer,
  };

  console.log('[RIZQ-SUB] Subscription Engine v1.0 loaded ✅');

})(typeof window !== 'undefined' ? window : global);
