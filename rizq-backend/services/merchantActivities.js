'use strict';

const path = require('path');

let catalog = null;

function loadCatalog() {
  if (catalog) return catalog;
  try {
    catalog = require(path.join(__dirname, '..', '..', 'rizq_merchant_activities.js'));
  } catch (e) {
    catalog = {
      listForPackage: function () { return []; },
      isAllowed: function () { return false; },
      findById: function () { return null; },
      legacyCategoryFromActivity: function () { return 'أخرى'; },
      displayName: function (id) { return String(id || ''); },
    };
  }
  return catalog;
}

function validateMerchantActivity(opts) {
  opts = opts || {};
  const cat = loadCatalog();
  const accountType = String(opts.accountType || '').toLowerCase();
  const activityId = String(opts.activityId || opts.activity || '').trim();
  const packageId = opts.packageId || opts.package || null;

  if (!activityId) {
    return { ok: false, code: 'ACTIVITY_REQUIRED', error: 'نشاط تجاري مطلوب' };
  }

  if (!cat.isAllowed(activityId, accountType, packageId)) {
    return {
      ok: false,
      code: 'ACTIVITY_NOT_ALLOWED',
      error: 'النشاط المختار غير متاح لهذا النوع من الحساب أو الباقة',
    };
  }

  const row = cat.findById(activityId);
  return {
    ok: true,
    activityId,
    activity: row ? (row.nameAr || activityId) : activityId,
    category: cat.legacyCategoryFromActivity(activityId),
  };
}

function normalizeAccountActivityFields(body, accountType) {
  const cat = loadCatalog();
  const activityId = String(body.activityId || body.activity || '').trim();
  const packageId = body.packageId || body.package || null;
  const validation = validateMerchantActivity({ accountType, activityId, packageId });
  if (!validation.ok) return validation;

  return {
    ok: true,
    activityId: validation.activityId,
    activity: cat.displayName(validation.activityId, 'ar') || validation.activity,
    category: validation.category,
  };
}

module.exports = {
  loadCatalog,
  validateMerchantActivity,
  normalizeAccountActivityFields,
};
