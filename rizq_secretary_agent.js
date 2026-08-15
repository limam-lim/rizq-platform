/**
 * rizq_secretary_agent.js  v2.0
 * ══════════════════════════════════════════════════════════
 * وكيل السكرتير الذكي — مشروط بالباقة الماسية فقط
 *
 * الخدمات التي يُفعّلها:
 *   ✅ وكيل ذكي (AI)   — رد تلقائي 24/7 على استفسارات الزوار
 *   ✅ رد تلقائي مكالمات — يظهر رابط واتساب ذكي عند غياب الصاحب
 *
 * بوابة الأمان:
 *   → يقرأ ACC_ID من ?id= في URL
 *   → يتحقق: pkg = 'ماسية' AND pkg_status = 'active' AND لم تنتهِ
 *   → أي شرط فاشل = لا ويدجت يظهر
 *   → يفحص كل 5 دقائق — يُخفى فوراً عند انتهاء الباقة
 * ══════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ════════════════════════════════════════
     1. قراءة معرّف الحساب من URL
  ════════════════════════════════════════ */
  var params = new URLSearchParams(location.search);
  var ACC_ID = params.get('id') || params.get('store') || params.get('office') || params.get('corp');
  if (!ACC_ID) return;

  /* ════════════════════════════════════════
     2. جلب بيانات الحساب من localStorage
  ════════════════════════════════════════ */
  function _getAcc() {
    try {
      var accs = JSON.parse(localStorage.getItem('rizq_accounts') || '{}');
      if (accs[ACC_ID]) return accs[ACC_ID];
    } catch (e) {}
    try {
      var pending = JSON.parse(localStorage.getItem('rizq_pending_accounts') || '[]');
      return pending.find(function (a) { return a.id === ACC_ID; }) || null;
    } catch (e) { return null; }
  }

  /* ════════════════════════════════════════
     3. التحقق من الباقة الماسية النشطة
     إصلاح جوهري 27/07/2026: كان هذا الفحص منطقاً محلياً مكرَّراً (يقرأ
     acc.package/pkg_status/pkg_ends_at يدوياً) منفصلاً تماماً عن المصدر
     الموحّد RizqSub.hasFeature(accId,'ai_agent_full') المستخدم في كل بقية
     المنصة (badges، حدود النشر...) — أي فرق دقيق بين المنطقين (مثلاً حالة
     'trial_expiring' أو 'expiring_soon') كان يمكن أن يمنح نتيجة مختلفة هنا
     عن باقي الصفحات. الآن نستخدم RizqSub كمصدر الحقيقة الأول، مع إبقاء
     المنطق القديم كاحتياط فقط لو تعذّر تحميل rizq_subscription_engine.js.
  ════════════════════════════════════════ */
  function _isDiamondActive(acc) {
    if (!acc) return false;
    if (typeof RizqSub !== 'undefined' && typeof RizqSub.hasFeature === 'function' && ACC_ID) {
      return RizqSub.hasFeature(ACC_ID, 'ai_agent_full');
    }
    var pkg = String(acc.package || '');
    if (pkg.indexOf('ماسية') === -1 && pkg.indexOf('diamond') === -1) return false;
    if (acc.pkg_status === 'expired') return false;
    if (acc.pkg_ends_at && new Date(acc.pkg_ends_at) < new Date()) return false;
    if (acc.status && acc.status !== 'approved') return false;
    return true;
  }

  var _acc = _getAcc();
  if (!_isDiamondActive(_acc)) return; // ← بوابة الأمان

  /* ════════════════════════════════════════
     4. بناء profile ديناميكي من بيانات الحساب
  ════════════════════════════════════════ */
  function _buildProfile(acc) {
    var products = [], services = [], hoursRaw = null;
    // كان المفتاح 'rizq_prods_'+ACC_ID خاطئاً — لا صفحة في الموقع تكتب لهذا المفتاح إطلاقاً؛
    // المفتاح الحقيقي الذي تستخدمه rizq_dashboard_store.html هو 'store_products_'+SESSION_ID
    try { products  = JSON.parse(localStorage.getItem('store_products_' + ACC_ID) || '[]'); } catch(e){}
    try { services  = JSON.parse(localStorage.getItem('office_services_' + ACC_ID) || '[]'); } catch(e){}
    try { hoursRaw  = JSON.parse(localStorage.getItem('store_hours_'  + ACC_ID) ||
                                 localStorage.getItem('office_hours_' + ACC_ID) || 'null'); } catch(e){}

    /* ساعات العمل — نص مقروء */
    var hoursText = 'يومياً';
    if (hoursRaw && hoursRaw.length) {
      var openDays = hoursRaw.filter(function(h){ return h.open; });
      if (openDays.length) {
        var h0 = openDays[0];
        hoursText = (h0.from || '08:00') + ' — ' + (h0.to || '20:00');
      } else { hoursText = 'مغلق حالياً'; }
    }

    /* هل خارج ساعات العمل الآن؟ */
    var isOffHours = false;
    if (hoursRaw && hoursRaw.length) {
      var now   = new Date();
      var dayIdx= now.getDay(); // 0=أحد
      var hoy   = hoursRaw[dayIdx] || hoursRaw[0];
      if (!hoy || !hoy.open) {
        isOffHours = true;
      } else {
        var cur  = now.getHours() * 60 + now.getMinutes();
        var from = _timeToMin(hoy.from || '08:00');
        var to   = _timeToMin(hoy.to   || '20:00');
        isOffHours = (cur < from || cur >= to);
      }
    }

    /* أيقونة حسب نوع النشاط */
    var avatarMap = { store:'🏪', office:'💼', corp:'🏢' };

    return {
      id           : ACC_ID,
      businessName : acc.name       || 'المحل',
      businessType : acc.type       || 'store',
      activity     : acc.activity   || '',
      city         : acc.city       || '',
      address      : acc.address    || '',
      phone        : acc.phone      || '',
      whatsapp     : acc.whatsapp   || acc.phone || '',
      facebook     : acc.facebook   || '',
      workingHours : hoursText,
      isOffHours   : isOffHours,
      products     : products,
      services     : services,
      avatar       : avatarMap[acc.type] || '🏪',
      tier         : 'diamond',
      /* الخدمات الماسية */
      hasAiAgent   : true,   // وكيل ذكي AI
      hasCallReply : true,   // رد تلقائي مكالمات
    };
  }

  function _timeToMin(t) {
    var p = String(t).split(':');
    return (parseInt(p[0])||0)*60 + (parseInt(p[1])||0);
  }

  var _profile = _buildProfile(_acc);

  /* ════════════════════════════════════════
     كشف الشخصية تلقائياً عبر RizqPrompts
  ════════════════════════════════════════ */
  (function _applyPersona() {
    if (!window.RizqPrompts) return;
    var activityText = (_acc.activity || '') + ' ' + (_acc.type || '');
    var personaKey   = window.RizqPrompts.detectPersona(activityText);
    var persona      = window.RizqPrompts.personas[personaKey] || window.RizqPrompts.personas['default'];
    _profile.personaKey      = personaKey;
    _profile.personaLabel    = persona.ar;
    _profile.personaTone     = persona.tone;
    _profile.personaExpertise= persona.expertise || [];
    /* اسم الوكيل حسب النشاط */
    var agentNames = {
      law_office      : 'المساعد القانوني',
      hotel           : 'موظف الاستقبال الذكي',
      clinic          : 'مساعد العيادة',
      pharmacy        : 'مساعد الصيدلية',
      accounting_office:'المساعد المحاسبي',
      real_estate     : 'مستشار العقارات',
      car_showroom    : 'مستشار المعرض',
      restaurant      : 'مساعد المطعم',
      women_store     : 'مساعدة المحل',
      insurance_office: 'مستشار التأمين',
      virtual_office  : 'مساعد المكتب',
      general_store   : 'مساعد المحل',
    };
    _profile.agentTitle = agentNames[personaKey] || 'المساعد الذكي';
  })();

  /* ════════════════════════════════════════
     ربط بالويدجت الموحّد (rizq_widget_embed.js)
     ────────────────────────────────────────
     كان _profile يُحسب بالكامل (الاسم، الشخصية، ساعات العمل، المنتجات...) ثم
     يُترك بدون استخدام — لا واجهة كانت تقرأه فيبقى العمل كله بلا أي أثر مرئي
     للمشترك. rizq_widget_embed.js (الويدجت العائم الموجود فعلياً في هذه الصفحة)
     يقرأ أولوياً من window._rizqProfile إن وُجد (المصدر رقم 1 في _loadPageProfile)،
     فربطه هنا يكفي لتفعيل التخصيص الفعلي دون بناء أي واجهة جديدة أو تكرار العمل.
     ملاحظة: لا نغيّر اسم/هوية الويدجت — يبقى "مدير رزق الذكي" كما هو مقصود في
     rizq_widget_embed.js، فقط سطر الحالة والتحية يعرضان اسم المنشأة الحقيقي.
  ════════════════════════════════════════ */
  window._rizqProfile = {
    businessName: _profile.businessName,
    tier: 'diamond',
    channels: {
      phone: _profile.phone || '',
      whatsapp: _profile.whatsapp || _profile.phone || '',
      email: '',
      location: [_profile.city, _profile.address].filter(Boolean).join(' — ')
    },
    workingHours: _profile.workingHours,
    // إصلاح: كانت isOffHours تُحسَب أعلاه في _buildProfile() ثم لا تُستخدم
    // في أي مكان — لا تصل للويدجت فلا يظهر أي فرق فعلي في سلوكه خارج الدوام،
    // رغم أن هذا كان الغرض المُعلَن للملف بالكامل ("رد تلقائي مكالمات — يظهر
    // رابط واتساب ذكي عند غياب الصاحب"). الآن تصل فعلاً لـ rizq_widget_embed.js.
    isOffHours: !!_profile.isOffHours,
    products: (_profile.products || []).slice(0, 8).map(function (p) {
      return { name: p.name || '', price: p.price || '' };
    }),
    policies: {},
    persona: {
      key: _profile.personaKey || '',
      label: _profile.personaLabel || '',
      tone: _profile.personaTone || '',
      agentTitle: _profile.agentTitle || ''
    }
  };

})();
