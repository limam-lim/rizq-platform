/**
 * rizq_verification_policy.js — سياسة التوثيق (مصدر واحد للواجهة)
 *
 * المستوى 1 — هوية فقط (فرد + محل):
 *   • رفع صورة الهوية عند التسجيل
 *   • بعد التوثيق: تُحذف الصورة نهائياً — يُحتفظ برقم NNI فقط (مكافحة تعدد الحسابات)
 *
 * المستوى 2 — نشاط + هوية (مكتب، شركة، معرض، مناقصات):
 *   • وثائق النشاط (رخصة، سجل، NINEA…) + بطاقة هوية المسؤول
 *   • بعد التوثيق: تُحذف صورة الهوية فقط — وثائق النشاط تُحفظ — يبقى NNI
 */
(function () {
  'use strict';

  var ID_ONLY = ['individual', 'store'];
  var ACTIVITY_PLUS_ID = ['office', 'corp', 'showroom', 'exhibition'];
  var MODULE_ACTIVITY_PLUS_ID = ['tenders'];

  function includes(list, type) {
    return list.indexOf(String(type || '').toLowerCase()) >= 0;
  }

  function allActivityTypes() {
    return ACTIVITY_PLUS_ID.concat(MODULE_ACTIVITY_PLUS_ID);
  }

  window.RizqVerificationPolicy = {
    ID_ONLY_TYPES: ID_ONLY,
    ACTIVITY_PLUS_ID_TYPES: ACTIVITY_PLUS_ID,
    MODULE_ACTIVITY_PLUS_ID: MODULE_ACTIVITY_PLUS_ID,

    /** فرد + محل: تفعيل فوري بعد OTP (مع أرشفة الهوية لاحقاً) */
    canAutoApprove: function (type) {
      return includes(ID_ONLY, type);
    },

    /** هوية فقط — تُحذف الصورة بعد التوثيق، يبقى NNI */
    isIdOnlyTier: function (type) {
      return includes(ID_ONLY, type);
    },

    /** نشاط + هوية — مراجعة يدوية/وكيل */
    requiresActivityAndId: function (type) {
      return includes(ACTIVITY_PLUS_ID, type);
    },

    moduleRequiresActivityAndId: function (moduleId) {
      return includes(MODULE_ACTIVITY_PLUS_ID, moduleId);
    },

    purgeIdImageAfterVerify: function (type) {
      return includes(ID_ONLY, type) || includes(ACTIVITY_PLUS_ID, type);
    },

    keepNniAfterPurge: true,
    retainActivityDocuments: true,

    /** حقول وثائق النشاط — لا تُحذف أبداً بعد التوثيق */
    activityDocumentFields: ['license_image', 'licenseImage', 'activity_image2', 'activityImage2'],

    /** حقول صورة الهوية — تُحذف بعد التوثيق */
    idImageFields: ['id_image', 'idImage'],

    pendingStatusFor: function (type) {
      if (this.requiresActivityAndId(type)) return 'pending_activity_review';
      if (this.isIdOnlyTier(type)) return 'pending_id_auto';
      return 'suspended_pending_id';
    },

    labelAr: function (type) {
      if (this.isIdOnlyTier(type)) {
        return 'صورة الهوية للتحقق فقط — تُحذف بعد التوثيق ويبقى الرقم الوطني (NNI)';
      }
      if (this.requiresActivityAndId(type)) {
        return 'وثائق النشاط تُحفظ — صورة الهوية تُحذف بعد التوثيق — يبقى NNI';
      }
      return 'قيد المراجعة';
    },

    idOnlyHintAr: '🔒 صورة الهوية تُحذف نهائياً بعد التوثيق. يُحتفظ برقم NNI فقط لمنع الحسابات المزدوجة.',
    activityHintAr: '📋 وثائق النشاط (رخصة/سجل/NINEA) تُحفظ في ملفك. صورة الهوية تُحذف بعد التوثيق — يبقى رقم NNI فقط.'
  };
})();
